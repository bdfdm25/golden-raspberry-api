import { readFile } from 'node:fs/promises';
import { parseMovieCsv } from '../csv/movie-csv-parser.js';
import type { MovieRepository } from '../database/movie-repository.js';

/**
 * Loads the CSV file into the database. Any malformed input aborts the ingestion
 * so the API never serves results derived from partially loaded data.
 */
export async function ingestMoviesFromCsv(
  repository: MovieRepository,
  csvPath: string,
): Promise<number> {
  const content = await readCsv(csvPath);
  const movies = parseMovieCsv(content);
  repository.insertMany(movies);
  return movies.length;
}

async function readCsv(csvPath: string): Promise<string> {
  try {
    return await readFile(csvPath, 'utf8');
  } catch (cause) {
    throw new Error(`Unable to read the movies CSV file at "${csvPath}"`, { cause });
  }
}
