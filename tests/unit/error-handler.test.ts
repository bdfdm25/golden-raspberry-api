import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { createErrorHandler, notFoundHandler } from '../../src/shared/error-handler.js';
import { HttpError } from '../../src/shared/http-error.js';
import { createSilentLogger } from '../../src/shared/logger.js';
import { createCapturingLogger } from '../helpers/capturing-logger.js';

function createResponseDouble() {
  const response = {
    status: vi.fn(() => response),
    json: vi.fn(() => response),
  };
  return response as unknown as Response & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };
}

describe('notFoundHandler', () => {
  it('forwards a 404 HttpError describing the route', () => {
    const next = vi.fn();

    notFoundHandler({ method: 'GET', path: '/nope' } as Request, createResponseDouble(), next);

    const error = next.mock.calls[0]?.[0] as HttpError;
    expect(error.status).toBe(404);
    expect(error.message).toBe('Route GET /nope not found');
  });
});

describe('createErrorHandler', () => {
  const handler = createErrorHandler(createSilentLogger());

  it('serialises an HttpError with its details', () => {
    const response = createResponseDouble();

    handler(HttpError.badRequest('bad', [{ field: 'page' }]), {} as Request, response, vi.fn());

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      error: { message: 'bad', details: [{ field: 'page' }] },
    });
  });

  it('omits the details key when the error carries none', () => {
    const response = createResponseDouble();

    handler(HttpError.notFound('missing'), {} as Request, response, vi.fn());

    expect(response.json).toHaveBeenCalledWith({ error: { message: 'missing' } });
  });

  it('logs the unexpected error before hiding it', () => {
    const { logger, entries } = createCapturingLogger();
    const response = createResponseDouble();

    createErrorHandler(logger)(new Error('boom'), {} as Request, response, vi.fn());

    expect(entries[0]).toMatchObject({ msg: 'unhandled error' });
    expect(entries[0]?.err).toMatchObject({ message: 'boom' });
  });

  it('hides unexpected errors behind a 500', () => {
    const response = createResponseDouble();

    handler(new Error('boom'), {} as Request, response, vi.fn());

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({ error: { message: 'Internal server error' } });
  });
});
