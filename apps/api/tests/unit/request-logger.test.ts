import { EventEmitter } from 'node:events';
import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { createRequestLogger } from '../../src/shared/request-logger.js';
import { createCapturingLogger } from '../helpers/capturing-logger.js';

interface ResponseDouble extends EventEmitter {
  statusCode: number;
  setHeader: ReturnType<typeof vi.fn>;
}

function createResponseDouble(statusCode: number): ResponseDouble {
  const response = new EventEmitter() as ResponseDouble;
  response.statusCode = statusCode;
  response.setHeader = vi.fn();
  return response;
}

const request = {
  method: 'GET',
  originalUrl: '/movies',
  header: () => undefined,
} as unknown as Request;

describe('createRequestLogger', () => {
  it('logs a request the client gave up on, which never emits finish', () => {
    const { logger, entries } = createCapturingLogger();
    const response = createResponseDouble(200);

    createRequestLogger(logger)(request, response as unknown as Response, vi.fn());
    response.emit('close');

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ msg: 'request aborted', aborted: true, path: '/movies' });
  });

  it('logs a completed request once, even though close also fires', () => {
    const { logger, entries } = createCapturingLogger();
    const response = createResponseDouble(200);

    createRequestLogger(logger)(request, response as unknown as Response, vi.fn());
    response.emit('finish');
    response.emit('close');

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ msg: 'request completed', aborted: false, status: 200 });
  });
});
