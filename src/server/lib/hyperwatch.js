import hyperwatch from '@hyperwatch/hyperwatch';
import expressWs from 'express-ws';
import expressBasicAuth from 'express-basic-auth';

import { parseToBooleanDefaultFalse } from './utils';

const { input, modules, pipeline } = hyperwatch;

const expressInput = input.express.create();

const {
  HYPERWATCH_ENABLED: enabled,
  HYPERWATCH_PATH: path,
  HYPERWATCH_USERNAME: username,
  HYPERWATCH_SECRET: secret,
} = process.env;

export const setupMiddleware = (app) => {
  // Mount Hyperwatch API and Websocket
  if (parseToBooleanDefaultFalse(enabled) && secret) {
    // We need to setup express-ws here to make Hyperwatch's websocket works
    expressWs(app);
    const hyperwatchBasicAuth = expressBasicAuth({
      users: { [username || 'opencollective']: secret },
      challenge: true,
    });
    app.use(path || '/_hyperwatch', hyperwatchBasicAuth, hyperwatch.app.api);
    app.use(path || '/_hyperwatch', hyperwatchBasicAuth, hyperwatch.app.websocket);
  }

  // Mount middleware
  app.use(expressInput.middleware.bind(expressInput));
};

pipeline.registerInput(expressInput);

modules.load();

pipeline.start();

export default hyperwatch;
