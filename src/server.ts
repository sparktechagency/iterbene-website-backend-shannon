import colors from 'colors';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import app from './app';
import { errorLogger, logger } from './shared/logger';
import { socketHelper } from './helpers/socket';
import { config } from './config';

export let io: Server;

// Uncaught exception
process.on('uncaughtException', error => {
  errorLogger.error('UnhandleException Detected', error);
  process.exit(1);
});

let server: HttpServer;
async function main() {
  try {
    await mongoose.connect(config.database.mongoUrl as string);
    logger.info(colors.green('🚀 Database connected successfully'));

    const port =
      typeof config.port === 'number' ? config.port : Number(config.port);
    server = app.listen(port, config.backend.ip as string, () => {
      logger.info(
        colors.yellow(
          `♻️  Application listening on port ${config.backend.baseUrl}/test`
        )
      );
    });

    // Socket setup
    const io = new Server(server, {
      pingTimeout: 60000,
      cors: {
        origin: config.socketCorsAllowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });
    socketHelper.socket(io);
    
  } catch (error) {
    errorLogger.error(colors.red('🤢 Failed to connect Database'));
  }

  // Handle unhandled rejection
  process.on('unhandledRejection', error => {
    errorLogger.error('UnhandledRejection Detected', error);
    if (server) {
      server.close(() => {
        process.exit(1);
      });
    } else {
      process.exit(1);
    }
  });
}

main();

// SIGTERM
process.on('SIGTERM', () => {
  logger.info('SIGTERM IS RECEIVE');
  if (server) {
    server.close();
  }
});
