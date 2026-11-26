import { Router } from 'express';
import type { MovieRepository } from '../database/movie-repository.js';
import { calculateAwardIntervals } from './award-interval-calculator.js';

export function createProducersRouter(repository: MovieRepository): Router {
  const router = Router();

  router.get('/intervals', (_request, response) => {
    response.status(200).json(calculateAwardIntervals(repository.findRepeatWinnerYears()));
  });

  return router;
}
