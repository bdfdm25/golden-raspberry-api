import { beforeEach, describe, expect, it } from 'vitest';
import { createInMemoryDatabase } from '../../src/database/connection.js';
import { MovieRepository } from '../../src/database/movie-repository.js';

const PAGE = { limit: 10, offset: 0 };

describe('MovieRepository', () => {
  let repository: MovieRepository;

  beforeEach(() => {
    repository = new MovieRepository(createInMemoryDatabase());
    repository.insertMany([
      {
        year: 1980,
        title: 'With producers',
        studios: 'S',
        producers: ['Ana', 'Zoe'],
        winner: true,
      },
      { year: 1981, title: 'Without producers', studios: 'S', producers: [], winner: false },
    ]);
  });

  it('counts every inserted movie', () => {
    expect(repository.count()).toBe(2);
  });

  it('returns an empty producer list for a movie with no producers', () => {
    const { items, total } = repository.findPage({ year: 1981 }, PAGE);

    expect(total).toBe(1);
    expect(items[0]).toMatchObject({ title: 'Without producers', producers: [] });
  });

  it('returns producers sorted by name', () => {
    const { items } = repository.findPage({ winner: true }, PAGE);

    expect(items[0]?.producers).toEqual(['Ana', 'Zoe']);
  });

  it('filters out winners when winner is false', () => {
    const { items } = repository.findPage({ winner: false }, PAGE);

    expect(items.map((movie) => movie.title)).toEqual(['Without producers']);
    expect(items[0]?.winner).toBe(false);
  });

  it('returns an empty page without querying producers', () => {
    expect(repository.findPage({ year: 1800 }, PAGE)).toEqual({ items: [], total: 0 });
  });

  it('is idempotent for a producer already linked to the same movie', () => {
    repository.insertMany([
      { year: 1990, title: 'Duplicated', studios: 'S', producers: ['Ana', 'Ana'], winner: true },
    ]);

    const { items } = repository.findPage({ year: 1990 }, PAGE);
    expect(items[0]?.producers).toEqual(['Ana']);
  });
});
