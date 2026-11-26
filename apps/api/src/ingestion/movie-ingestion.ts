import { readFile } from 'node:fs/promises';
import { parseMovieCsv } from '../csv/movie-csv-parser.js';
import type { MovieRepository } from '../database/movie-repository.js';
import type { Logger } from '../shared/logger.js';

/**
 * Loads the CSV file into the database. Malformed input that the business rules depend on
 * aborts the ingestion, so the API never serves results derived from partially loaded data.
 * Everything else is logged as a warning and the dataset is still used.
 */
export async function ingestMoviesFromCsv(
  repository: MovieRepository,
  csvPath: string,
  logger: Logger,
): Promise<number> {
  const content = await readCsv(csvPath);
  const { movies, warnings } = parseMovieCsv(content);

  for (const warning of warnings) {
    logger.warn({ csvPath, line: warning.line, occurrences: warning.occurrences }, warning.message);
  }

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
