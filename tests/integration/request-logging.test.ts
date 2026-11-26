import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createRequestLogger } from '../../src/shared/request-logger.js';
import { createCapturingLogger } from '../helpers/capturing-logger.js';

function createLoggedApp() {
  const { logger, entries } = createCapturingLogger();
  const app = express();
  app.use(createRequestLogger(logger));
  app.get('/movies', (_request, response) => {
    response.status(200).json({ data: [] });
  });

  return { app, entries };
}

describe('request logging', () => {
  it('logs one entry per completed request', async () => {
    const { app, entries } = createLoggedApp();

    await request(app).get('/movies?limit=1').set('x-request-id', 'given-id').expect(200);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      requestId: 'given-id',
      method: 'GET',
      path: '/movies?limit=1',
      status: 200,
      msg: 'request completed',
    });
    const durationMs = entries[0]?.durationMs as number;
    expect(durationMs).toBeGreaterThan(0);
    expect(durationMs).toBeLessThan(5000);
  });

  it('generates a request id when the caller does not provide one', async () => {
    const { app, entries } = createLoggedApp();

    const response = await request(app).get('/movies').expect(200);

    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(entries[0]?.requestId).toBe(response.headers['x-request-id']);
  });

  it('logs the status of failed requests', async () => {
    const { app, entries } = createLoggedApp();

    await request(app).get('/unknown').expect(404);

    expect(entries[0]).toMatchObject({ status: 404, path: '/unknown' });
  });
});
