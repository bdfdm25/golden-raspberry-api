import { loadConfig } from './config/env.js';
import { startServer } from './server.js';
import { createLogger } from './shared/logger.js';

const config = loadConfig();
const logger = createLogger(config.LOG_LEVEL, config.NODE_ENV === 'development');

try {
  const running = await startServer(config, logger);

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      logger.info({ signal }, 'shutting down');
      void running.close().then(() => process.exit(0));
    });
  }
} catch (error) {
  logger.fatal({ err: error }, 'failed to start the application');
  process.exitCode = 1;
}
