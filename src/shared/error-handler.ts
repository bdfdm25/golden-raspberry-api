import type { NextFunction, Request, Response } from 'express';
import { HttpError } from './http-error.js';
import type { Logger } from './logger.js';

export function notFoundHandler(request: Request, _response: Response, next: NextFunction): void {
  next(HttpError.notFound(`Route ${request.method} ${request.path} not found`));
}

export function createErrorHandler(logger: Logger) {
  return (error: unknown, _request: Request, response: Response, _next: NextFunction): void => {
    if (error instanceof HttpError) {
      response.status(error.status).json({
        error: { message: error.message, ...(error.details ? { details: error.details } : {}) },
      });
      return;
    }

    logger.error({ err: error }, 'unhandled error');
    response.status(500).json({ error: { message: 'Internal server error' } });
  };
}
