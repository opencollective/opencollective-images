import hyperwatch from '@hyperwatch/hyperwatch';
import expressWs from 'express-ws';
import expressBasicAuth from 'express-basic-auth';

import { logger } from '../logger';

import { parseToBooleanDefaultFalse } from './utils';

const {
  HYPERWATCH_ENABLED: enabled,
  HYPERWATCH_PATH: path,
  HYPERWATCH_USERNAME: username,
  HYPERWATCH_SECRET: secret,
} = process.env;

export function load(app) {
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
    // We need to setup express-ws here to make Hyperwatch's websocket works
    if (secret) {
      expressWs(app);
      const hyperwatchBasicAuth = expressBasicAuth({
        users: { [username || 'opencollective']: secret },
        challenge: true,
      });
      app.use(path || '/_hyperwatch', hyperwatchBasicAuth, hyperwatch.app.api);
      app.use(path || '/_hyperwatch', hyperwatchBasicAuth, hyperwatch.app.websocket);
    }

    // Configure input

    const expressInput = input.express.create();

    app.use(expressInput.middleware());

    pipeline.registerInput(expressInput);

    // Configure access Logs in dev and production

    const consoleLogOutput = process.env.NODE_ENV === 'development' ? 'console' : 'text';
    pipeline.map((log) => logger.info(lib.logger.defaultFormatter.format(log, consoleLogOutput)));

    // Start

    modules.beforeStart();

    pipeline.start();
  }
}
