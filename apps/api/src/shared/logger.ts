import { pino, type Logger, type LoggerOptions } from 'pino';

export type { Logger };

export function createLoggerOptions(level: string, pretty: boolean): LoggerOptions {
  return {
    level,
    ...(pretty ? { transport: { target: 'pino-pretty', options: { singleLine: true } } } : {}),
  };
}

export function createLogger(level: string, pretty: boolean): Logger {
  return pino(createLoggerOptions(level, pretty));
}

export function createSilentLogger(): Logger {
  return pino({ level: 'silent' });
}
