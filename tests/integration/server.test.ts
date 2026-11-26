import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config/env.js';
import { startServer } from '../../src/server.js';
import { createSilentLogger } from '../../src/shared/logger.js';
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
});
