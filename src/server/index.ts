import './env';

import http from 'http';
import path from 'path';

import type { Application } from 'express';
import express from 'express';

import * as hyperwatch from './lib/hyperwatch';
import { logger, loggerMiddleware } from './logger';
import { securityHeaders } from './middlewares';
import { loadRoutes } from './routes';

const port = process.env.PORT;

const app: Application = express();
const server = http.createServer(app);

app.use('/static', securityHeaders, express.static(path.join(__dirname, '..', 'static')));

hyperwatch.load(app, { server });

// Registered after Hyperwatch, whose status page relies on inline scripts
app.use(securityHeaders);

loadRoutes(app);

app.use(loggerMiddleware.errorLogger);

server.listen(port, () => {
  logger.info(`Ready on http://localhost:${port}`);
});
