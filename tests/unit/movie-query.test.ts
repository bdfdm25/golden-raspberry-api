import { describe, expect, it } from 'vitest';
import { parseMovieQuery } from '../../src/movies/movie-query.js';
import { HttpError } from '../../src/shared/http-error.js';

describe('HttpError', () => {
  it('names itself so it can be identified in logs', () => {
    expect(HttpError.notFound('missing').name).toBe('HttpError');
  });
});

describe('parseMovieQuery', () => {
  it('applies defaults for an empty query', () => {
    expect(parseMovieQuery({})).toEqual({ page: 1, limit: 20 });
  });

  it('coerces the supported parameters', () => {
    expect(parseMovieQuery({ page: '3', limit: '50', year: '1984', winner: 'false' })).toEqual({
      page: 3,
      limit: 50,
      year: 1984,
      winner: false,
    });
  });

  it.each([
    { page: '0' },
    { page: '1.5' },
    { limit: '0' },
    { limit: '101' },
    { year: 'abc' },
    { year: '0' },
    { winner: 'maybe' },
  ])('rejects %o', (query) => {
    expect(() => parseMovieQuery(query)).toThrow(HttpError);
  });

  it('describes every invalid field', () => {
    try {
      parseMovieQuery({ page: '0', winner: 'maybe' });
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      const httpError = error as HttpError;
      expect(httpError.status).toBe(400);
      expect(httpError.details).toEqual([
        { field: 'page', message: expect.any(String) },
        { field: 'winner', message: expect.any(String) },
      ]);
    }
  });
});
