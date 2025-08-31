import path from 'path';
import DailyRotateFile from 'winston-daily-rotate-file';
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf } = format;

const myFormat = printf(
  ({
    level,
    message,
    label,
    timestamp,
  }: {
    level: string;
    message: string;
    label: string;
    timestamp: Date;
  }) => {
    const date = new Date(timestamp);
    const hour = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();

    return `${date.toDateString()} ${hour}:${minutes}:${seconds} [${label}] ${level}: ${message}`;
  }
);

// Base logger configuration
const baseConfig = {
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
  format: combine(label({ label: 'Inter-bene-backend' }), timestamp(), myFormat),
};

// Production-optimized transports
const productionTransports = [
  new transports.Console({
    level: 'error' // Only log errors to console in production
  }),
  new DailyRotateFile({
    filename: path.join(
      process.cwd(),
      'winston',
      'success',
      '%DATE%-success.log'
    ),
    datePattern: 'DD-MM-YYYY',
    zippedArchive: true,
    maxSize: '5m', // Reduced from 10m
    maxFiles: '3d', // Reduced from 7d
    level: 'info'
  }),
];

// Development transports
const developmentTransports = [
  new transports.Console(),
  new DailyRotateFile({
    filename: path.join(
      process.cwd(),
      'winston',
      'success',
      '%DATE%-success.log'
    ),
    datePattern: 'DD-MM-YYYY',
    zippedArchive: true,
    maxSize: '2m', // Smaller for development
    maxFiles: '1d', // Only keep 1 day in development
  }),
];

const logger = createLogger({
  ...baseConfig,
  transports: process.env.NODE_ENV === 'production' 
    ? productionTransports 
    : developmentTransports,
});

const errorLogger = createLogger({
  level: 'error',
  format: combine(label({ label: 'Inter-bene-backend' }), timestamp(), myFormat),
  transports: [
    new transports.Console(),
    new DailyRotateFile({
      filename: path.join(
        process.cwd(),
        'winston',
        'error',
        '%DATE%-error.log'
      ),
      datePattern: 'DD-MM-YYYY',
      zippedArchive: true,
      maxSize: '5m',
      maxFiles: '7d', // Keep errors longer for debugging
    }),
  ],
});

export { errorLogger, logger };