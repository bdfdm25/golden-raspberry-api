import { Router } from 'express';
import type { MovieRepository } from '../database/movie-repository.js';
import { parseMovieQuery } from './movie-query.js';

export function createMoviesRouter(repository: MovieRepository): Router {
  const router = Router();

  router.get('/', (request, response) => {
    const { page, limit, ...filters } = parseMovieQuery(request.query);
    const { items, total } = repository.findPage(filters, {
      limit,
      offset: (page - 1) * limit,
    });

    response.status(200).json({
      data: items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  });

  return router;
}
