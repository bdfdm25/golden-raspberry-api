import { describe, expect, it } from 'vitest';
import { createLogger, createLoggerOptions, createSilentLogger } from '../../src/shared/logger.js';

describe('createLoggerOptions', () => {
  it('keeps the JSON transport when pretty printing is off', () => {
    expect(createLoggerOptions('info', false)).toEqual({ level: 'info' });
  });

  it('enables pino-pretty when pretty printing is on', () => {
    expect(createLoggerOptions('debug', true)).toEqual({
      level: 'debug',
      transport: { target: 'pino-pretty', options: { singleLine: true } },
    });
  });
});

describe('createLogger', () => {
  it('honours the configured level', () => {
    expect(createLogger('warn', false).level).toBe('warn');
  });

  it('builds a silent logger for tests', () => {
    expect(createSilentLogger().level).toBe('silent');
  });
});
