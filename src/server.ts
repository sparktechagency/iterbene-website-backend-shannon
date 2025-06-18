import colors from 'colors';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import app from './app';
import { errorLogger, logger } from './shared/logger';
import { socketHelper } from './helpers/socket';
import { config } from './config';

// Uncaught exception
process.on('uncaughtException', error => {
  errorLogger.error('UnhandleException Detected', error);
  process.exit(1);
});

let server: any;
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
        origin: [
          'http://localhost:3000',
          'http://localhost:5173',
          'https://rakib3000.sobhoy.com',
          'http://10.0.80.220:3000',
          'http://10.0.80.220:7002',
          'http://10.0.80.220:4173',
          'http://localhost:7003',
          'https://rakib7002.sobhoy.com',
        ],
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });
    socketHelper.socket(io);
    // @ts-ignore
    global.io = io;
  } catch (error) {
    errorLogger.error(colors.red('🤢 Failed to connect Database'));
  }

  // Handle unhandled rejection
  process.on('unhandledRejection', error => {
    if (server) {
      server.close(() => {
        errorLogger.error('UnhandledRejection Detected', error);
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
