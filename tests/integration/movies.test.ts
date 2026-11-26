import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from '../helpers/test-app.js';

describe('GET /movies', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
  });
  afterAll(() => {
    testApp.close();
  });

  it('paginates the full list with default parameters', async () => {
    const { body } = await request(testApp.app).get('/movies').expect(200);

    expect(body.pagination).toEqual({ page: 1, limit: 20, total: 206, totalPages: 11 });
    expect(body.data).toHaveLength(20);
    expect(body.data[0]).toEqual({
      id: expect.any(Number),
      year: 1980,
      title: "Can't Stop the Music",
      studios: 'Associated Film Distribution',
      producers: ['Allan Carr'],
      winner: true,
    });
  });

  it('returns a different slice for the requested page', async () => {
    const firstPage = await request(testApp.app).get('/movies?page=1&limit=5').expect(200);
    const secondPage = await request(testApp.app).get('/movies?page=2&limit=5').expect(200);

    expect(firstPage.body.data).toHaveLength(5);
    expect(secondPage.body.pagination.page).toBe(2);
    expect(secondPage.body.data[0].id).not.toBe(firstPage.body.data[0].id);
  });

  it('filters by year', async () => {
    const { body } = await request(testApp.app).get('/movies?year=1980&limit=100').expect(200);

    expect(body.pagination.total).toBe(10);
    expect(body.data.every((movie: { year: number }) => movie.year === 1980)).toBe(true);
  });

  it('filters by winner', async () => {
    const { body } = await request(testApp.app)
      .get('/movies?winner=true&year=1986&limit=100')
      .expect(200);

    expect(body.data.map((movie: { title: string }) => movie.title)).toEqual([
      'Howard the Duck',
      'Under the Cherry Moon',
    ]);
  });

  it('returns an empty page when no movie matches the filters', async () => {
    const { body } = await request(testApp.app).get('/movies?year=1900').expect(200);

    expect(body).toEqual({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
  });

  it.each([
    ['page=0', 'page'],
    ['limit=0', 'limit'],
    ['limit=101', 'limit'],
    ['year=abc', 'year'],
    ['winner=maybe', 'winner'],
  ])('rejects invalid query parameter %s', async (query, field) => {
    const { body } = await request(testApp.app).get(`/movies?${query}`).expect(400);

    expect(body.error.message).toBe('Invalid query parameters');
    expect(body.error.details).toContainEqual(
      expect.objectContaining({ field, message: expect.any(String) }),
    );
  });

  it('returns 404 for unknown routes', async () => {
    const { body } = await request(testApp.app).get('/unknown').expect(404);

    expect(body.error.message).toBe('Route GET /unknown not found');
  });

  it('returns 404 for a verb the resource does not support', async () => {
    await request(testApp.app).post('/movies').send({ title: 'New' }).expect(404);
  });

  it('does not advertise the server technology', async () => {
    const response = await request(testApp.app).get('/movies?limit=1').expect(200);

    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('echoes back the provided request id', async () => {
    const response = await request(testApp.app)
      .get('/movies?limit=1')
      .set('x-request-id', 'fixed-id')
      .expect(200);

    expect(response.headers['x-request-id']).toBe('fixed-id');
  });
});
