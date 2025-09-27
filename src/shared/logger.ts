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

// Simple console-only logger
const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
  format: combine(label({ label: 'Inter-bene-backend' }), timestamp(), myFormat),
  transports: [
    new transports.Console(),
  ],
});

// Simple error logger (console only)
const errorLogger = createLogger({
  level: 'error',
  format: combine(label({ label: 'Inter-bene-backend' }), timestamp(), myFormat),
  transports: [
    new transports.Console(),
  ],
});

export { errorLogger, logger };