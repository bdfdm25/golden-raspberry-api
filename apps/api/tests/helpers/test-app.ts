import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Express } from 'express';
import { createApp } from '../../src/app.js';
import { createInMemoryDatabase } from '../../src/database/connection.js';
import { MovieRepository } from '../../src/database/movie-repository.js';
import { ingestMoviesFromCsv } from '../../src/ingestion/movie-ingestion.js';
import { createSilentLogger } from '../../src/shared/logger.js';

export const DATASET_CSV_PATH = join(process.cwd(), 'data', 'Movielist.csv');

export interface TestApp {
  app: Express;
  repository: MovieRepository;
  close: () => void;
}

export async function createTestApp(csvPath: string = DATASET_CSV_PATH): Promise<TestApp> {
  const database = createInMemoryDatabase();
  const repository = new MovieRepository(database);

  await ingestMoviesFromCsv(repository, csvPath, createSilentLogger());

  return {
    app: createApp({ repository, logger: createSilentLogger() }),
    repository,
    close: () => {
      database.close();
    },
  };
}

export async function writeTemporaryCsv(content: string): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'golden-raspberry-'));
  const path = join(directory, 'movies.csv');
  await writeFile(path, content, 'utf8');
  return path;
}

export function buildCsv(rows: string[]): string {
  return ['year;title;studios;producers;winner', ...rows].join('\n');
}
