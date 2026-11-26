import { loadConfig } from './config/env.js';
import { startServer, type RunningServer } from './server.js';
import { createLogger } from './shared/logger.js';

/** How long a shutdown may take before the process is killed anyway. */
const SHUTDOWN_DEADLINE_MS = 10_000;

const config = loadConfig();
const logger = createLogger(config.LOG_LEVEL, config.NODE_ENV === 'development');

function exitOnFatal(reason: unknown, message: string): never {
  logger.fatal({ err: reason }, message);
  process.exit(1);
}

// Without these the final failure leaves the structured log and lands on stderr as a raw stack.
process.on('uncaughtException', (error) => {
  exitOnFatal(error, 'uncaught exception');
});
process.on('unhandledRejection', (reason) => {
  exitOnFatal(reason, 'unhandled rejection');
});

async function shutdown(signal: NodeJS.Signals, running: RunningServer): Promise<void> {
  logger.info({ signal }, 'shutting down');

  const deadline = setTimeout(() => {
    exitOnFatal(
      new Error(`shutdown did not finish in ${String(SHUTDOWN_DEADLINE_MS)}ms`),
      'forcing exit',
    );
  }, SHUTDOWN_DEADLINE_MS);
  deadline.unref();

  try {
    await running.close();
  } catch (error) {
    exitOnFatal(error, 'shutdown failed');
  }

  process.exit(0);
}

try {
  const running = await startServer(config, logger);

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      void shutdown(signal, running);
    });
  }
} catch (error) {
  logger.fatal({ err: error }, 'failed to start the application');
  process.exitCode = 1;
}
