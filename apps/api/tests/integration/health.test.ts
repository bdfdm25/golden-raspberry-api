import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from '../helpers/test-app.js';

describe('GET /health', () => {
  let testApp: TestApp;

  afterEach(() => {
    testApp.close();
  });

  it('reports the number of movies loaded at startup', async () => {
    testApp = await createTestApp();

    const { body } = await request(testApp.app).get('/health').expect(200);

    expect(body).toEqual({ status: 'ok', movies: 206 });
  });
});
