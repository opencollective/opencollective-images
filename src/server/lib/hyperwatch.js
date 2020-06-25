import hyperwatch from '@hyperwatch/hyperwatch';
import expressWs from 'express-ws';
import expressBasicAuth from 'express-basic-auth';

import { parseToBooleanDefaultFalse } from './utils';

const { input, modules, pipeline } = hyperwatch;

const {
  HYPERWATCH_ENABLED: enabled,
  HYPERWATCH_PATH: path,
  HYPERWATCH_USERNAME: username,
  HYPERWATCH_SECRET: secret,
} = process.env;

export function load(app) {
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

    const expressInput = input.express.create();

    app.use(expressInput.middleware());

    pipeline.registerInput(expressInput);

    modules.load();

    pipeline.start();
  }
}
