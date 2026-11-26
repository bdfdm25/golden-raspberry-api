import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config/env.js';

describe('loadConfig', () => {
  it('applies defaults when nothing is set', () => {
    const config = loadConfig({});

    expect(config).toMatchObject({ NODE_ENV: 'development', PORT: 3000, LOG_LEVEL: 'info' });
    expect(config.CSV_PATH).toMatch(/data\/Movielist\.csv$/);
    expect(existsSync(config.CSV_PATH)).toBe(true);
  });

  it('reads the provided values', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      PORT: '8080',
      LOG_LEVEL: 'debug',
      CSV_PATH: '/tmp/other.csv',
    });

    expect(config).toEqual({
      NODE_ENV: 'production',
      PORT: 8080,
      LOG_LEVEL: 'debug',
      CSV_PATH: '/tmp/other.csv',
    });
  });

  it.each(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])(
    'accepts the log level %s',
    (level) => {
      expect(loadConfig({ LOG_LEVEL: level }).LOG_LEVEL).toBe(level);
    },
  );

  it.each(['development', 'test', 'production'])('accepts the environment %s', (environment) => {
    expect(loadConfig({ NODE_ENV: environment }).NODE_ENV).toBe(environment);
  });

  it('names every invalid variable in the error message', () => {
    expect(() => loadConfig({ PORT: 'abc', LOG_LEVEL: 'verbose' })).toThrow(
      /Invalid environment configuration: PORT: .+; LOG_LEVEL: .+/,
    );
  });

  it('accepts port 0 to request an ephemeral port', () => {
    expect(loadConfig({ PORT: '0' }).PORT).toBe(0);
  });

  it.each([
    { PORT: 'abc' },
    { PORT: '-1' },
    { PORT: '70000' },
    { LOG_LEVEL: 'verbose' },
    { NODE_ENV: 'staging' },
    { CSV_PATH: '' },
  ])('rejects %o', (overrides) => {
    expect(() => loadConfig(overrides)).toThrow(/Invalid environment configuration/);
  });
});
