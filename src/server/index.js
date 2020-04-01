import './env';

import path from 'path';
import http from 'http';
import express from 'express';

import { loggerMiddleware, logger } from './logger';

import { loadRoutes } from './routes';

const port = process.env.PORT;

const app = express();

app.use('/static', express.static(path.join(__dirname, '..', 'static')));

app.use(loggerMiddleware.logger);

loadRoutes(app);

app.use(loggerMiddleware.errorLogger);

const httpServer = http.createServer(app);

httpServer.on('error', (err) => {
  logger.error(`Can't start server on http://localhost:${port}. %s`, err);
});

httpServer.listen(port, () => {
  logger.info(`Ready on http://localhost:${port}`);
});
