import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from './app.js';
import type { AppConfig } from './config/env.js';
import { createInMemoryDatabase } from './database/connection.js';
import { MovieRepository } from './database/movie-repository.js';
import { ingestMoviesFromCsv } from './ingestion/movie-ingestion.js';
import type { Logger } from './shared/logger.js';

export interface RunningServer {
  server: Server;
  port: number;
  close: () => Promise<void>;
}

export async function startServer(config: AppConfig, logger: Logger): Promise<RunningServer> {
  const database = createInMemoryDatabase();
  const repository = new MovieRepository(database);

  const movies = await ingestMoviesFromCsv(repository, config.CSV_PATH);
  logger.info({ csvPath: config.CSV_PATH, movies }, 'movies loaded into memory');

  const app = createApp({ repository, logger });
  const server = await listen(app, config.PORT);
  const port = resolvePort(server.address(), config.PORT);

  logger.info({ port }, 'api listening');

  return {
    server,
    port,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
      database.close();
    },
  };
}

export function resolvePort(address: AddressInfo | string | null, fallback: number): number {
  return typeof address === 'object' && address !== null ? address.port : fallback;
}

function listen(app: ReturnType<typeof createApp>, port: number): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      resolve(server);
    });
    server.once('error', reject);
  });
}
