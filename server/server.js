import { createServer } from 'http';
import { initSocketServer } from './src/infrastructure/sockets/socketServer.js';
import { config } from './src/config/env.js';
import { connectDatabase, disconnectDatabase } from './src/infrastructure/database/connection.js';
import logger from './src/utils/logger.js';
import app from './app.js';
import { startScheduler, stopScheduler } from './src/infrastructure/jobs/scheduler.js';


// ---------------------------------------------------------------------------
// Server entry point.
//
// Responsibilities:
//   1. Connect to MongoDB
//   2. Create HTTP server
//   3. Attach Socket.IO (infrastructure stub — handlers mounted in Phase 5)
//   4. Start listening
//   5. Handle graceful shutdown (SIGTERM / SIGINT)
// ---------------------------------------------------------------------------

async function bootstrap() {
  // --- 1. Database connection -----------------------------------------------
  logger.info('Connecting to MongoDB...');
  await connectDatabase();

  // --- 2. HTTP server -------------------------------------------------------
  const httpServer = createServer(app);

  // --- 3. Socket.IO ---------------------------------------------------------
  const io = initSocketServer(httpServer);
  app.set('io', io);

  // --- 4. Start listening ---------------------------------------------------
  httpServer.listen(config.port, () => {
    logger.info(`OneWinq server started`, {
      port: config.port,
      env: config.env,
      nodeVersion: process.version,
    });
    startScheduler();
  });

  // --- 5. Graceful shutdown -------------------------------------------------
  async function shutdown(signal) {
    logger.info(`${signal} received — starting graceful shutdown`);
    stopScheduler();

    // Stop accepting new connections
    httpServer.close(async () => {
      logger.info('HTTP server closed');

      try {
        // Close Socket.IO connections
        await new Promise((resolve) => io.close(resolve));
        logger.info('Socket.IO closed');

        // Close database connection
        await disconnectDatabase();

        logger.info('Graceful shutdown complete');
        process.exit(0);
      } catch (err) {
        logger.error('Error during shutdown', { message: err.message });
        process.exit(1);
      }
    });

    // Force exit if graceful shutdown takes too long
    setTimeout(() => {
      logger.error('Graceful shutdown timed out — forcing exit');
      process.exit(1);
    }, 10_000);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Catch unhandled promise rejections — log and exit cleanly
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', {
      message: reason instanceof Error ? reason.message : String(reason),
    });
    // Exit so the process manager (systemd/PM2/Docker) can restart
    process.exit(1);
  });

  // Catch uncaught exceptions — cannot recover, must exit
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { message: err.message });
    process.exit(1);
  });
}

bootstrap();
