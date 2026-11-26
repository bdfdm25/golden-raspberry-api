import express, { type Express } from 'express';
import type { MovieRepository } from './database/movie-repository.js';
import { createHealthRouter } from './health/health-router.js';
import { createMoviesRouter } from './movies/movies-router.js';
import { createProducersRouter } from './producers/producers-router.js';
import { createErrorHandler, notFoundHandler } from './shared/error-handler.js';
import type { Logger } from './shared/logger.js';
import { createRequestLogger } from './shared/request-logger.js';

export interface AppDependencies {
  repository: MovieRepository;
  logger: Logger;
}

export function createApp({ repository, logger }: AppDependencies): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(createRequestLogger(logger));

  app.use('/health', createHealthRouter(repository));
  app.use('/movies', createMoviesRouter(repository));
  app.use('/producers', createProducersRouter(repository));

  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));

  return app;
}
