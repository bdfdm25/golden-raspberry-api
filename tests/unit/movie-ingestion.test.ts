import { describe, expect, it } from 'vitest';
import { createInMemoryDatabase } from '../../src/database/connection.js';
import { MovieRepository } from '../../src/database/movie-repository.js';
import { ingestMoviesFromCsv } from '../../src/ingestion/movie-ingestion.js';
import { createSilentLogger } from '../../src/shared/logger.js';
import { createCapturingLogger } from '../helpers/capturing-logger.js';
import { buildCsv, writeTemporaryCsv } from '../helpers/test-app.js';

function createRepository(): MovieRepository {
  return new MovieRepository(createInMemoryDatabase());
}

describe('ingestMoviesFromCsv', () => {
  it('returns the number of ingested movies', async () => {
    const repository = createRepository();
    const csvPath = await writeTemporaryCsv(
      buildCsv(['1980;A;Studio;Producer One;yes', '1981;B;Studio;Producer Two;']),
    );

    await expect(ingestMoviesFromCsv(repository, csvPath, createSilentLogger())).resolves.toBe(2);
    expect(repository.count()).toBe(2);
  });

  it('reuses a producer shared by several movies', async () => {
    const repository = createRepository();
    const csvPath = await writeTemporaryCsv(
      buildCsv(['1980;A;Studio;Shared Producer;yes', '1981;B;Studio;Shared Producer;yes']),
    );

    await ingestMoviesFromCsv(repository, csvPath, createSilentLogger());

    expect(repository.findRepeatWinnerYears()).toEqual([
      { producer: 'Shared Producer', year: 1980 },
      { producer: 'Shared Producer', year: 1981 },
    ]);
  });

  it('inserts nothing when a row is malformed', async () => {
    const repository = createRepository();
    const csvPath = await writeTemporaryCsv(
      buildCsv(['1980;A;Studio;Producer;yes', '1981;B;Studio;Producer;maybe']),
    );

    await expect(ingestMoviesFromCsv(repository, csvPath, createSilentLogger())).rejects.toThrow(
      'Invalid winner',
    );
    expect(repository.count()).toBe(0);
  });

  it('logs the inconsistencies that do not block the ingestion', async () => {
    const repository = createRepository();
    const { logger, entries } = createCapturingLogger();
    const csvPath = await writeTemporaryCsv(
      'year;title;studios;producers;winner;country\n1980;;Studio;Producer;yes;BR\n',
    );

    await expect(ingestMoviesFromCsv(repository, csvPath, logger)).resolves.toBe(1);

    expect(entries).toContainEqual(
      expect.objectContaining({
        level: 40,
        csvPath,
        line: 1,
        occurrences: 1,
        msg: 'Ignoring column(s) unknown to the API: country',
      }),
    );
    expect(entries).toContainEqual(
      expect.objectContaining({
        level: 40,
        csvPath,
        line: 2,
        occurrences: 1,
        msg: 'Column "title" is empty and no business rule depends on it',
      }),
    );
  });

  it('fails with a clear message when the file does not exist, keeping the cause', async () => {
    const error = await ingestMoviesFromCsv(
      createRepository(),
      '/missing/file.csv',
      createSilentLogger(),
    ).then(
      () => undefined,
      (caught: unknown) => caught as Error,
    );

    expect(error).toBeInstanceOf(Error);

    expect(error?.message).toBe('Unable to read the movies CSV file at "/missing/file.csv"');
    expect(error?.cause).toMatchObject({ code: 'ENOENT' });
  });
});
