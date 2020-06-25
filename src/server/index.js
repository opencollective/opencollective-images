import './env';

import path from 'path';
import express from 'express';

import { loggerMiddleware, logger } from './logger';

import { loadRoutes } from './routes';

import * as hyperwatch from './lib/hyperwatch';

const port = process.env.PORT;

const app = express();

app.use('/static', express.static(path.join(__dirname, '..', 'static')));

hyperwatch.load(app);

loadRoutes(app);

app.use(loggerMiddleware.errorLogger);

app.listen(port, () => {
  logger.info(`Ready on http://localhost:${port}`);
});
