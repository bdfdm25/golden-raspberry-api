import { pino, type Logger } from 'pino';

export interface CapturedLogs {
  logger: Logger;
  entries: Record<string, unknown>[];
}

export function createCapturingLogger(): CapturedLogs {
  const entries: Record<string, unknown>[] = [];
  const logger = pino(
    { level: 'info' },
    {
      write: (chunk: string) => {
        entries.push(JSON.parse(chunk) as Record<string, unknown>);
      },
    },
  );

  return { logger, entries };
}
