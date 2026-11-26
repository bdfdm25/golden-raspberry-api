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

  const movies = await ingestMoviesFromCsv(repository, config.CSV_PATH, logger);
  logger.info({ csvPath: config.CSV_PATH, movies }, 'movies loaded into memory');

  const app = createApp({ repository, logger });
  const server = await listen(app, config.PORT, logger);
  const port = resolvePort(server.address(), config.PORT);

  // A late bind error can close the server before this line, and announcing a port that
  // is not serving is exactly the misleading log this guard exists to avoid.
  if (server.listening) {
    logger.info({ port }, 'api listening');
  }

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

/**
 * The error can also arrive after 'listening' — a dual-stack bind reports success for
 * the IPv6 socket and fails for the IPv4 one when the port is already taken. The
 * handler therefore stays attached: dropping it leaves the server dead while the
 * process exits with code 0, as if the API were up.
 */
function listen(app: ReturnType<typeof createApp>, port: number, logger: Logger): Promise<Server> {
  return new Promise((resolve, reject) => {
    let listening = false;

    const server = app.listen(port, () => {
      listening = true;
      resolve(server);
    });

    server.on('error', (error: Error) => {
      if (listening) {
        logger.fatal({ err: error }, 'the http server stopped serving');
        process.exitCode = 1;
      }

      // Already settled once the server is listening, so this only rejects a startup failure.
      reject(error);
    });
  });
}
