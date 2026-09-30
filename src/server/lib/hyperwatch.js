import hyperwatch from '@hyperwatch/hyperwatch';
import expressBasicAuth from 'express-basic-auth';

import { logger } from '../logger';

import { parseToBooleanDefaultFalse } from './utils';

const {
  HYPERWATCH_ENABLED: enabled,
  HYPERWATCH_PATH: path,
  HYPERWATCH_USERNAME: username,
  HYPERWATCH_SECRET: secret,
} = process.env;

export function load(app, { server }) {
  const { input, lib, modules, pipeline } = hyperwatch;

  hyperwatch.init({
    modules: {
      // Expose the status page
      status: { active: true },
      // Expose logs (HTTP and Websocket)
      logs: { active: true },
    },
  });

  // Mount Hyperwatch API and Websocket
  if (parseToBooleanDefaultFalse(enabled)) {
    // Mount Hyperwatch API and Websocket: basic auth applies to both HTTP and WebSocket upgrades
    if (secret) {
      hyperwatch.app.mount(app, {
        server,
        path: path || '/_hyperwatch',
        middleware: expressBasicAuth({
          users: { [username || 'opencollective']: secret },
          challenge: true,
        }),
      });
    }

    // Configure input

    const expressInput = input.express.create();

    app.use(expressInput.middleware());

    pipeline.registerInput(expressInput);

    // Configure access Logs in dev and production

    const consoleLogOutput = process.env.NODE_ENV === 'development' ? 'console' : 'text';
    pipeline.map((log) => logger.info(lib.logger.defaultFormatter.format(log, consoleLogOutput)));

    // Start

    modules.start();

    pipeline.start();
  }
}
