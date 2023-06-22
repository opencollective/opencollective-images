import './env';

import path from 'path';

import express from 'express';

import * as hyperwatch from './lib/hyperwatch';
import { logger, loggerMiddleware } from './logger';
import { loadRoutes } from './routes';

const port = process.env.PORT;

const app = express();

app.use('/static', express.static(path.join(__dirname, '..', 'static')));

hyperwatch.load(app);

loadRoutes(app);

app.use(loggerMiddleware.errorLogger);

app.listen(port, () => {
  logger.info(`Ready on http://localhost:${port}`);
});
