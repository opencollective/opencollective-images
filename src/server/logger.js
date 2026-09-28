import expressWinston from 'express-winston';
import winston from 'winston';

function getLogLevel() {
  if (process.env.LOG_LEVEL) {
    return process.env.LOG_LEVEL;
  } else if (
    process.env.NODE_ENV === 'production' ||
    process.env.NODE_ENV === 'test' ||
    process.env.NODE_ENV === 'ci'
  ) {
    return 'warn';
  } else {
    return 'info';
  }
}

const logger = winston.createLogger();

const winstonConsole = new winston.transports.Console({
  level: getLogLevel(),
  format: winston.format.combine(winston.format.colorize(), winston.format.splat(), winston.format.simple()),
});

logger.add(winstonConsole);
// Fatal process errors are owned by instrument.js so they can be reported once,
// flushed, and followed by a non-zero exit. Do not add a competing Winston
// exception handler here.

const loggerMiddleware = {
  errorLogger: expressWinston.errorLogger({
    winstonInstance: logger,
  }),
};

export { logger, loggerMiddleware };
