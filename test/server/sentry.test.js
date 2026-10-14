const INSTRUMENT_MODULE = '../../src/server/instrument';
const SENTRY_LIB_MODULE = '../../src/server/lib/sentry';

const mockScope = {
  setLevel: jest.fn(),
  setTag: jest.fn(),
  setExtra: jest.fn(),
  setUser: jest.fn(),
  setSDKProcessingMetadata: jest.fn(),
  addBreadcrumb: jest.fn(),
};

jest.mock('@sentry/node', () => ({
  init: jest.fn(),
  withScope: jest.fn((callback) => callback(mockScope)),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setupExpressErrorHandler: jest.fn(),
}));

jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

jest.mock('../../src/server/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), debug: jest.fn() },
  loggerMiddleware: { errorLogger: jest.fn() },
}));

const ENV_KEYS = [
  'DEBUG_SENTRY_KEY',
  'SENTRY_DSN',
  'SENTRY_ENVIRONMENT',
  'SENTRY_TRACES_SAMPLE_RATE',
  'HEROKU_SLUG_COMMIT',
  'OC_ENV',
  'NODE_ENV',
  'npm_package_version',
];

describe('sentry lib', () => {
  let savedEnv;
  let processOnSpy;

  const loadModule = (path) => {
    jest.resetModules();
    return {
      Sentry: jest.requireMock('@sentry/node'),
      mod: require(path),
      logger: jest.requireMock('../../src/server/logger').logger,
    };
  };

  const getInitConfig = (Sentry) => Sentry.init.mock.calls[0][0];

  const getProcessHandlers = () => {
    const handlers = {};
    for (const [event, handler] of processOnSpy.mock.calls) {
      if (event === 'unhandledRejection' || event === 'uncaughtException') {
        handlers[event] = handler;
      }
    }
    return handlers;
  };

  beforeEach(() => {
    savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
    for (const key of ENV_KEYS) {
      delete process.env[key];
    }
    jest.clearAllMocks();
    processOnSpy = jest.spyOn(process, 'on');
  });

  afterEach(() => {
    processOnSpy.mockRestore();
    for (const key of ENV_KEYS) {
      if (savedEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = savedEnv[key];
      }
    }
  });

  describe('instrument', () => {
    test('initializes Sentry with DSN, environment, release and no PII', () => {
      process.env.NODE_ENV = 'production';
      process.env.SENTRY_DSN = 'https://example@sentry.io/1';
      process.env.SENTRY_ENVIRONMENT = 'production';
      process.env.HEROKU_SLUG_COMMIT = 'abc123';
      process.env.SENTRY_TRACES_SAMPLE_RATE = '0.1';

      const { Sentry } = loadModule(INSTRUMENT_MODULE);
      const config = getInitConfig(Sentry);

      expect(config.dsn).toBe('https://example@sentry.io/1');
      expect(config.environment).toBe('production');
      expect(config.release).toBe('abc123');
      expect(config.tracesSampleRate).toBe(0.1);
      expect(config.sendDefaultPii).toBe(false);
      expect(config.enabled).toBe(true);
    });

    test('prefers SENTRY_ENVIRONMENT over OC_ENV and NODE_ENV', () => {
      process.env.NODE_ENV = 'production';
      process.env.OC_ENV = 'staging';
      process.env.SENTRY_DSN = 'https://example@sentry.io/1';
      process.env.SENTRY_ENVIRONMENT = 'custom';

      const { Sentry } = loadModule(INSTRUMENT_MODULE);

      expect(getInitConfig(Sentry).environment).toBe('custom');
    });

    test('falls back to OC_ENV then NODE_ENV for environment', () => {
      process.env.NODE_ENV = 'production';
      process.env.OC_ENV = 'staging';
      process.env.SENTRY_DSN = 'https://example@sentry.io/1';

      const { Sentry } = loadModule(INSTRUMENT_MODULE);

      expect(getInitConfig(Sentry).environment).toBe('staging');
    });

    test('falls back to oc-images release when no Heroku commit is set', () => {
      process.env.NODE_ENV = 'production';
      process.env.SENTRY_DSN = 'https://example@sentry.io/1';

      const { Sentry } = loadModule(INSTRUMENT_MODULE);

      expect(getInitConfig(Sentry).release).toBe('oc-images@dev');
    });

    test.each([
      ['unset', undefined, 0],
      ['zero', '0', 0],
      ['invalid', 'not-a-number', 0],
      ['half', '0.5', 0.5],
    ])('traces sample rate %s parses to %s', (_, value, expected) => {
      process.env.NODE_ENV = 'production';
      process.env.SENTRY_DSN = 'https://example@sentry.io/1';
      if (value !== undefined) {
        process.env.SENTRY_TRACES_SAMPLE_RATE = value;
      }

      const { Sentry } = loadModule(INSTRUMENT_MODULE);

      expect(getInitConfig(Sentry).tracesSampleRate).toBe(expected);
    });

    test('is disabled without a DSN', () => {
      process.env.NODE_ENV = 'production';

      const { Sentry } = loadModule(INSTRUMENT_MODULE);

      expect(getInitConfig(Sentry).enabled).toBe(false);
    });

    test('is disabled in test env even with a DSN', () => {
      process.env.NODE_ENV = 'test';
      process.env.SENTRY_DSN = 'https://example@sentry.io/1';

      const { Sentry } = loadModule(INSTRUMENT_MODULE);

      expect(getInitConfig(Sentry).enabled).toBe(false);
    });
  });

  describe('beforeSend redaction', () => {
    test('filters sensitive headers and cookies but keeps the rest', () => {
      process.env.NODE_ENV = 'production';
      process.env.SENTRY_DSN = 'https://example@sentry.io/1';

      const { Sentry } = loadModule(INSTRUMENT_MODULE);
      const { beforeSend } = getInitConfig(Sentry);
      const event = beforeSend({
        request: {
          headers: {
            cookie: 'session=abc',
            authorization: 'Bearer token',
            'x-api-key': 'secret',
            'oc-secret': 'secret',
            'content-type': 'image/png',
          },
          cookies: { session: 'abc' },
          query_string: 'key=secret&safe=value',
        },
      });

      expect(event.request.headers).toEqual({
        cookie: '[Filtered]',
        authorization: '[Filtered]',
        'x-api-key': '[Filtered]',
        'oc-secret': '[Filtered]',
        'content-type': 'image/png',
      });
      expect(event.request.cookies).toBe('[Filtered]');
      expect(event.request.query_string).toBe('key=[Filtered]&safe=value');
    });

    test('returns events without a request untouched', () => {
      process.env.NODE_ENV = 'production';
      process.env.SENTRY_DSN = 'https://example@sentry.io/1';

      const { Sentry } = loadModule(INSTRUMENT_MODULE);
      const { beforeSend } = getInitConfig(Sentry);
      const event = { message: 'no request here' };

      expect(beforeSend(event)).toBe(event);
      expect(beforeSend(undefined)).toBe(undefined);
    });
  });

  describe('checkIfSentryConfigured', () => {
    test.each([
      ['with a DSN', 'https://example@sentry.io/1', true],
      ['without a DSN', undefined, false],
    ])('returns %s -> %s', (_, dsn, expected) => {
      process.env.NODE_ENV = 'production';
      if (dsn !== undefined) {
        process.env.SENTRY_DSN = dsn;
      }

      const { mod } = loadModule(SENTRY_LIB_MODULE);

      expect(mod.checkIfSentryConfigured()).toBe(expected);
    });

    describe('isValidDebugSentryKey', () => {
      test.each([
        ['matching key', 'shared-secret', true],
        ['wrong key', 'wrong-secret', false],
        ['array value', ['shared-secret'], false],
      ])('validates %s', (_, provided, expected) => {
        process.env.NODE_ENV = 'production';
        process.env.DEBUG_SENTRY_KEY = 'shared-secret';

        const { mod } = loadModule(SENTRY_LIB_MODULE);

        expect(mod.isValidDebugSentryKey(provided)).toBe(expected);
      });

      test('is disabled when no key is configured', () => {
        process.env.NODE_ENV = 'production';

        const { mod } = loadModule(SENTRY_LIB_MODULE);

        expect(mod.isValidDebugSentryKey('shared-secret')).toBe(false);
      });
    });
  });

  describe('reportErrorToSentry', () => {
    test.each([
      ['404 status', Object.assign(new Error('missing'), { status: 404 })],
      ['400 statusCode', Object.assign(new Error('bad'), { statusCode: 400 })],
      ['No collective found', new Error('No collective found with slug foo')],
      ['not found message', new Error('Collective not found')],
    ])('ignores %s', (_, err) => {
      process.env.NODE_ENV = 'production';
      process.env.SENTRY_DSN = 'https://example@sentry.io/1';

      const { Sentry, mod } = loadModule(SENTRY_LIB_MODULE);
      mod.reportErrorToSentry(err);

      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    test('captures real errors with severity, tags, extras and request metadata', () => {
      process.env.NODE_ENV = 'production';
      process.env.SENTRY_DSN = 'https://example@sentry.io/1';

      const { Sentry, mod } = loadModule(SENTRY_LIB_MODULE);
      const err = new Error('sharp failed');
      const req = { ip: '127.0.0.1' };
      mod.reportErrorToSentry(err, {
        severity: 'fatal',
        tags: { handler: 'logo' },
        extra: { imageUrl: 'https://example.com/logo.png', count: 3 },
        req,
      });

      expect(mockScope.setLevel).toHaveBeenCalledWith('fatal');
      expect(mockScope.setTag).toHaveBeenCalledWith('handler', 'logo');
      expect(mockScope.setExtra).toHaveBeenCalledWith('imageUrl', 'https://example.com/logo.png');
      expect(mockScope.setExtra).toHaveBeenCalledWith('count', '3');
      expect(mockScope.setSDKProcessingMetadata).toHaveBeenCalledWith({ request: req });
      expect(Sentry.captureException).toHaveBeenCalledWith(err);
    });

    test('is a no-op without an error', () => {
      process.env.NODE_ENV = 'production';
      process.env.SENTRY_DSN = 'https://example@sentry.io/1';

      const { Sentry, mod } = loadModule(SENTRY_LIB_MODULE);
      mod.reportErrorToSentry(undefined);

      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    test('does not capture in test env', () => {
      process.env.NODE_ENV = 'test';
      process.env.SENTRY_DSN = 'https://example@sentry.io/1';

      const { Sentry, mod } = loadModule(SENTRY_LIB_MODULE);
      mod.reportErrorToSentry(new Error('boom'));

      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    test('falls back to the logger when Sentry is not configured', () => {
      process.env.NODE_ENV = 'production';

      const { Sentry, mod, logger } = loadModule(SENTRY_LIB_MODULE);
      const err = new Error('boom');
      mod.reportErrorToSentry(err);

      expect(Sentry.captureException).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(err.stack);
    });
  });

  describe('reportMessageToSentry', () => {
    test('captures messages with severity and tags', () => {
      process.env.NODE_ENV = 'production';
      process.env.SENTRY_DSN = 'https://example@sentry.io/1';

      const { Sentry, mod } = loadModule(SENTRY_LIB_MODULE);
      mod.reportMessageToSentry('something odd', { severity: 'warning', tags: { handler: 'proxy' } });

      expect(mockScope.setLevel).toHaveBeenCalledWith('warning');
      expect(mockScope.setTag).toHaveBeenCalledWith('handler', 'proxy');
      expect(Sentry.captureMessage).toHaveBeenCalledWith('something odd');
    });

    test('falls back to the logger when Sentry is not configured', () => {
      process.env.NODE_ENV = 'production';

      const { Sentry, mod, logger } = loadModule(SENTRY_LIB_MODULE);
      mod.reportMessageToSentry('something odd');

      expect(Sentry.captureMessage).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith('[Sentry fallback] something odd');
    });
  });

  describe('process-level errors', () => {
    test('registers no custom handlers, relying on the SDK default integrations', () => {
      process.env.NODE_ENV = 'production';
      process.env.SENTRY_DSN = 'https://example@sentry.io/1';

      loadModule(SENTRY_LIB_MODULE);
      loadModule(INSTRUMENT_MODULE);

      expect(getProcessHandlers()).toEqual({});
    });
  });
});
