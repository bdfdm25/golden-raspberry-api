import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { Logger } from './logger.js';

const REQUEST_ID_HEADER = 'x-request-id';

export function createRequestLogger(logger: Logger) {
  return (request: Request, response: Response, next: NextFunction): void => {
    const requestId = request.header(REQUEST_ID_HEADER) ?? randomUUID();
    const startedAt = process.hrtime.bigint();

    response.setHeader(REQUEST_ID_HEADER, requestId);
    response.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      logger.info(
        {
          requestId,
          method: request.method,
          path: request.originalUrl,
          status: response.statusCode,
          durationMs: Number(durationMs.toFixed(2)),
        },
        'request completed',
      );
    });

    next();
  };
}
