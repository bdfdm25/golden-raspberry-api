import { setTimeout } from 'node:timers/promises';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config/env.js';
import { startServer } from '../../src/server.js';
import { createSilentLogger } from '../../src/shared/logger.js';
import { createCapturingLogger } from '../helpers/capturing-logger.js';
import { DATASET_CSV_PATH } from '../helpers/test-app.js';

describe('startServer', () => {
  it('loads the CSV and serves the API on an ephemeral port', async () => {
    const config = loadConfig({ NODE_ENV: 'test', PORT: '0', CSV_PATH: DATASET_CSV_PATH });
    const running = await startServer(config, createSilentLogger());

    try {
      const response = await fetch(`http://127.0.0.1:${String(running.port)}/health`);

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ status: 'ok', movies: 206 });
    } finally {
      await running.close();
    }
  });

  it('fails fast when the CSV file cannot be read', async () => {
    const config = loadConfig({ PORT: '0', CSV_PATH: '/does/not/exist.csv' });

    await expect(startServer(config, createSilentLogger())).rejects.toThrow(
      /Unable to read the movies CSV file/,
    );
  });

  it('never stays silent when the port is already taken', async () => {
    const config = loadConfig({ NODE_ENV: 'test', PORT: '0', CSV_PATH: DATASET_CSV_PATH });
    const running = await startServer(config, createSilentLogger());
    const { logger, entries } = createCapturingLogger();
    const previousExitCode = process.exitCode;

    const taken = loadConfig({
      NODE_ENV: 'test',
      PORT: String(running.port),
      CSV_PATH: DATASET_CSV_PATH,
    });

    // A dual-stack bind may report 'listening' for the IPv6 socket and only then fail for
    // the IPv4 one, so the conflict surfaces either as a rejection or as a late error.
    // Both are acceptable; staying quiet is not.
    const outcome = await startServer(taken, logger).then(
      (server) => server,
      () => undefined,
    );

    try {
      if (outcome !== undefined) {
        await setTimeout(50);
      }

      expect(outcome === undefined || entries.some((entry) => entry['level'] === 60)).toBe(true);
    } finally {
      process.exitCode = previousExitCode;
      await outcome?.close().catch(() => undefined);
      await running.close();
    }
  });

  it('reports a server error that arrives after the port is open', async () => {
    const config = loadConfig({ NODE_ENV: 'test', PORT: '0', CSV_PATH: DATASET_CSV_PATH });
    const { logger, entries } = createCapturingLogger();
    const previousExitCode = process.exitCode;
    const running = await startServer(config, logger);

    try {
      // A bind error can reach the server after 'listening'; swallowing it would let the
      // process exit with code 0 while the API is already dead.
      running.server.emit('error', new Error('listen EADDRINUSE: address already in use'));

      expect(entries).toContainEqual(
        expect.objectContaining({ level: 60, msg: 'the http server stopped serving' }),
      );
      expect(process.exitCode).toBe(1);
    } finally {
      process.exitCode = previousExitCode;
      await running.close();
    }
  });
});
