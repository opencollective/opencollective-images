/* eslint-disable simple-import-sort/imports -- instrumentation must be the first import */
// This must remain the first import: Sentry needs to initialize before Express
// and every module it instruments is loaded.
import { captureStartupError, isSentryEnabled, Sentry, shouldCaptureExpressError } from './instrument';

import path from 'path';

import express from 'express';

import * as hyperwatch from './lib/hyperwatch';
import { logger, loggerMiddleware } from './logger';
import { loadRoutes } from './routes';

export const finalErrorResponder = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const production = process.env.NODE_ENV === 'production';
  return res.status(500).json({
    error: production ? 'Internal Server Error' : error.message || 'Internal Server Error',
  });
};

export const createApp = () => {
  const app = express();

  app.use('/static', express.static(path.join(__dirname, '..', 'static')));
  hyperwatch.load(app);
  loadRoutes(app);

  if (isSentryEnabled()) {
    Sentry.setupExpressErrorHandler(app, { shouldHandleError: shouldCaptureExpressError });
  }
  app.use(loggerMiddleware.errorLogger);
  app.use(finalErrorResponder);
  return app;
};

export const startServer = () => {
  const server = createApp().listen(process.env.PORT, () => {
    logger.info(`Ready on http://localhost:${process.env.PORT}`);
  });
  server.once('error', captureStartupError);
  return server;
};

if (require.main === module) {
  startServer();
}
