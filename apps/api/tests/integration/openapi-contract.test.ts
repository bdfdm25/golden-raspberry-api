import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createResponseValidator,
  loadOpenApiDocument,
  type OpenApiDocument,
  type ResponseValidator,
} from '../helpers/openapi.js';
import { createTestApp, type TestApp } from '../helpers/test-app.js';

describe('openapi.yaml contract', () => {
  let testApp: TestApp;
  let document: OpenApiDocument;
  let matchesSpec: ResponseValidator;

  beforeAll(async () => {
    testApp = await createTestApp();
    document = await loadOpenApiDocument();
    matchesSpec = createResponseValidator(document);
  });

  afterAll(() => {
    testApp.close();
  });

  it('documents every implemented route and no route that does not exist', async () => {
    const documentedPaths = Object.keys(document.paths);

    expect(documentedPaths).toEqual(['/producers/intervals', '/movies', '/health']);

    for (const path of documentedPaths) {
      const response = await request(testApp.app).get(path);
      expect(response.status, `GET ${path} is documented but not implemented`).not.toBe(404);
    }
  });

  it.each(['/producers/intervals', '/movies', '/health'])(
    'serves GET %s exactly as documented',
    async (path) => {
      const response = await request(testApp.app).get(path).expect(200);

      expect(() => {
        matchesSpec(path, 200, response.body);
      }).not.toThrow();
    },
  );

  it('serves the documented error payload for an invalid query', async () => {
    const response = await request(testApp.app).get('/movies?limit=0').expect(400);

    expect(() => {
      matchesSpec('/movies', 400, response.body);
    }).not.toThrow();
  });

  it('fails when the response drifts from the specification', () => {
    expect(() => {
      matchesSpec('/health', 200, { status: 'ok', movies: 206, unexpected: true });
    }).toThrow(/does not match openapi.yaml/);
  });
});
