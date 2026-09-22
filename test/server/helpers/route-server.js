import express from 'express';
import fetch from 'node-fetch';

import { loadRoutes } from '../../../src/server/routes';

export const startRouteTestServer = () =>
  new Promise((resolve) => {
    const app = express();
    loadRoutes(app);
    const server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      const baseUrl = `http://127.0.0.1:${port}`;

      resolve({
        server,
        baseUrl,
        get: (path) => fetch(`${baseUrl}${path}`),
        close: () =>
          new Promise((done) => {
            server.close(done);
          }),
      });
    });
  });
