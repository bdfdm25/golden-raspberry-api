import type { NextFunction, Request, Response } from 'express';
import { HttpError } from './http-error.js';
import type { Logger } from './logger.js';
import { REQUEST_ID_HEADER } from './request-logger.js';

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

    // The request logger already put the id on the response, which makes the 500 line
    // correlatable with the 'request completed' line of the same request.
    logger.error(
      { err: error, requestId: response.getHeader(REQUEST_ID_HEADER) },
      'unhandled error',
    );
    response.status(500).json({ error: { message: 'Internal server error' } });
  };
}
