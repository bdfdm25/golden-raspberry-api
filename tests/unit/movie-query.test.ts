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

  it('rejects parameters that are not part of the contract', () => {
    try {
      parseMovieQuery({ yearr: '1986' });
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).details).toEqual([
        { field: 'yearr', message: 'yearr is not a supported query parameter' },
      ]);
    }
  });

  it.each([
    [{ page: '0' }, 'page', 'page must be an integer greater than or equal to 1'],
    [{ limit: '101' }, 'limit', 'limit must be an integer between 1 and 100'],
    [{ year: '0' }, 'year', 'year must be an integer between 1 and 9999'],
    [{ winner: 'maybe' }, 'winner', 'winner must be either true or false'],
  ])('explains the rule of %o instead of the parser wording', (query, field, message) => {
    try {
      parseMovieQuery(query);
      expect.unreachable('should have thrown');
    } catch (error) {
      expect((error as HttpError).details).toEqual([{ field, message }]);
    }
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
