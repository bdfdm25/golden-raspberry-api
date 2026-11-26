import { Router } from 'express';
import type { MovieRepository } from '../database/movie-repository.js';

export function createHealthRouter(repository: MovieRepository): Router {
  const router = Router();

  router.get('/', (_request, response) => {
    response.status(200).json({ status: 'ok', movies: repository.count() });
  });

  return router;
}
