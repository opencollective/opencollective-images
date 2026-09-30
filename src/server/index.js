import './env';
import './lib/sentry';

import http from 'http';
import path from 'path';

import * as Sentry from '@sentry/node';
import express from 'express';

import * as hyperwatch from './lib/hyperwatch';
import { logger, loggerMiddleware } from './logger';
import { errorHandler } from './middlewares';
import { loadRoutes } from './routes';

const port = process.env.PORT;

const app = express();
const server = http.createServer(app);

app.use('/static', express.static(path.join(__dirname, '..', 'static')));

hyperwatch.load(app, { server });

loadRoutes(app);

Sentry.setupExpressErrorHandler(app);

app.use(loggerMiddleware.errorLogger);

app.use(errorHandler);

server.listen(port, () => {
  logger.info(`Ready on http://localhost:${port}`);
});
