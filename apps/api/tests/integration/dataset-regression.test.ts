import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { parseMovieCsv } from '../../src/csv/movie-csv-parser.js';
import { createInMemoryDatabase } from '../../src/database/connection.js';
import { MovieRepository } from '../../src/database/movie-repository.js';
import { DATASET_CSV_PATH } from '../helpers/test-app.js';

/**
 * Pins the award-winning producers the provided dataset yields. Any change to the
 * producer splitting rules or to the identity key surfaces here first, instead of
 * silently moving the answer of /producers/intervals.
 */
describe('provided dataset', () => {
  it('yields exactly four producers awarded more than once', async () => {
    const repository = new MovieRepository(createInMemoryDatabase());
    repository.insertMany(parseMovieCsv(await readFile(DATASET_CSV_PATH, 'utf8')).movies);

    expect(repository.findRepeatWinnerYears()).toEqual([
      { producer: 'Bo Derek', year: 1984 },
      { producer: 'Bo Derek', year: 1990 },
      { producer: 'Buzz Feitshans', year: 1985 },
      { producer: 'Buzz Feitshans', year: 1994 },
      { producer: 'Joel Silver', year: 1990 },
      { producer: 'Joel Silver', year: 1991 },
      { producer: 'Matthew Vaughn', year: 2002 },
      { producer: 'Matthew Vaughn', year: 2015 },
    ]);
  });

  it('loads every row of the dataset', async () => {
    const repository = new MovieRepository(createInMemoryDatabase());
    repository.insertMany(parseMovieCsv(await readFile(DATASET_CSV_PATH, 'utf8')).movies);

    expect(repository.count()).toBe(206);
  });
});
