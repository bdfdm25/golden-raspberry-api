import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { Logger } from './logger.js';

export const REQUEST_ID_HEADER = 'x-request-id';

export function createRequestLogger(logger: Logger) {
  return (request: Request, response: Response, next: NextFunction): void => {
    const requestId = request.header(REQUEST_ID_HEADER) ?? randomUUID();
    const startedAt = process.hrtime.bigint();

    response.setHeader(REQUEST_ID_HEADER, requestId);

    let logged = false;
    const logOnce = (aborted: boolean): void => {
      if (logged) {
        return;
      }
      logged = true;

      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      logger.info(
        {
          requestId,
          method: request.method,
          path: request.originalUrl,
          status: response.statusCode,
          durationMs: Number(durationMs.toFixed(2)),
          aborted,
        },
        aborted ? 'request aborted' : 'request completed',
      );
    };

    response.on('finish', () => {
      logOnce(false);
    });
    // 'close' also fires after 'finish'; the guard keeps a completed request from logging twice.
    response.on('close', () => {
      logOnce(true);
    });

    next();
  };
}
