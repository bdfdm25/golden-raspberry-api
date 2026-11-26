import { describe, expect, it } from 'vitest';
import { createInMemoryDatabase } from '../../src/database/connection.js';
import { MovieRepository } from '../../src/database/movie-repository.js';
import { ingestMoviesFromCsv } from '../../src/ingestion/movie-ingestion.js';
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

    await expect(ingestMoviesFromCsv(repository, csvPath)).resolves.toBe(2);
    expect(repository.count()).toBe(2);
  });

  it('reuses a producer shared by several movies', async () => {
    const repository = createRepository();
    const csvPath = await writeTemporaryCsv(
      buildCsv(['1980;A;Studio;Shared Producer;yes', '1981;B;Studio;Shared Producer;yes']),
    );

    await ingestMoviesFromCsv(repository, csvPath);

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

    await expect(ingestMoviesFromCsv(repository, csvPath)).rejects.toThrow('Invalid winner');
    expect(repository.count()).toBe(0);
  });

  it('fails with a clear message when the file does not exist, keeping the cause', async () => {
    const error = await ingestMoviesFromCsv(createRepository(), '/missing/file.csv').then(
      () => undefined,
      (caught: unknown) => caught as Error,
    );

    expect(error).toBeInstanceOf(Error);

    expect(error?.message).toBe('Unable to read the movies CSV file at "/missing/file.csv"');
    expect(error?.cause).toMatchObject({ code: 'ENOENT' });
  });
});
