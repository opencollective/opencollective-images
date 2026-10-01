const SENTRY_MODULE = '../../src/server/lib/sentry';

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

jest.mock('../../src/server/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), debug: jest.fn() },
  loggerMiddleware: { errorLogger: jest.fn() },
}));

const ENV_KEYS = [
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

  const loadSentry = () => {
    jest.resetModules();
    return {
      Sentry: jest.requireMock('@sentry/node'),
      sentryLib: require(SENTRY_MODULE),
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

  describe('Sentry.init', () => {
    test('passes DSN, environment, release and disables PII', () => {
      process.env.NODE_ENV = 'production';
      process.env.SENTRY_DSN = 'https://example@sentry.io/1';
      process.env.SENTRY_ENVIRONMENT = 'production';
      process.env.HEROKU_SLUG_COMMIT = 'abc123';
      process.env.SENTRY_TRACES_SAMPLE_RATE = '0.1';

      const { Sentry } = loadSentry();
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

      const { Sentry } = loadSentry();

      expect(getInitConfig(Sentry).environment).toBe('custom');
    });

    test('falls back to OC_ENV then NODE_ENV for environment', () => {
      process.env.NODE_ENV = 'production';
      process.env.OC_ENV = 'staging';
      process.env.SENTRY_DSN = 'https://example@sentry.io/1';

      const { Sentry } = loadSentry();

      expect(getInitConfig(Sentry).environment).toBe('staging');
    });

    test('falls back to oc-images release when no Heroku commit is set', () => {
      process.env.NODE_ENV = 'production';
      process.env.SENTRY_DSN = 'https://example@sentry.io/1';

      const { Sentry } = loadSentry();

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

      const { Sentry } = loadSentry();

      expect(getInitConfig(Sentry).tracesSampleRate).toBe(expected);
    });

    test('is disabled without a DSN', () => {
      process.env.NODE_ENV = 'production';

      const { Sentry } = loadSentry();

      expect(getInitConfig(Sentry).enabled).toBe(false);
    });

    test('is disabled in test env even with a DSN', () => {
      process.env.NODE_ENV = 'test';
      process.env.SENTRY_DSN = 'https://example@sentry.io/1';

      const { Sentry } = loadSentry();

      expect(getInitConfig(Sentry).enabled).toBe(false);
    });
  });

  describe('beforeSend redaction', () => {
    test('filters sensitive headers and cookies but keeps the rest', () => {
      process.env.NODE_ENV = 'production';
      process.env.SENTRY_DSN = 'https://example@sentry.io/1';

      const { Sentry } = loadSentry();
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
    });

    test('returns events without a request untouched', () => {
      process.env.NODE_ENV = 'production';
      process.env.SENTRY_DSN = 'https://example@sentry.io/1';

      const { Sentry } = loadSentry();
      const { beforeSend } = getInitConfig(Sentry);
      const event = { message: 'no request here' };

      expect(beforeSend(event)).toBe(event);
      expect(beforeSend(undefined)).toBe(undefined);
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

      const { Sentry, sentryLib } = loadSentry();
      sentryLib.reportErrorToSentry(err);

      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    test('captures real errors with severity, tags, extras and request metadata', () => {
      process.env.NODE_ENV = 'production';
      process.env.SENTRY_DSN = 'https://example@sentry.io/1';

      const { Sentry, sentryLib } = loadSentry();
      const err = new Error('sharp failed');
      const req = { ip: '127.0.0.1' };
      sentryLib.reportErrorToSentry(err, {
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

      const { Sentry, sentryLib } = loadSentry();
      sentryLib.reportErrorToSentry(undefined);

      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    test('does not capture in test env', () => {
      process.env.NODE_ENV = 'test';
      process.env.SENTRY_DSN = 'https://example@sentry.io/1';

      const { Sentry, sentryLib } = loadSentry();
      sentryLib.reportErrorToSentry(new Error('boom'));

      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    test('falls back to the logger when Sentry is not configured', () => {
      process.env.NODE_ENV = 'production';

      const { Sentry, sentryLib, logger } = loadSentry();
      const err = new Error('boom');
      sentryLib.reportErrorToSentry(err);

      expect(Sentry.captureException).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(err.stack);
    });
  });

  describe('reportMessageToSentry', () => {
    test('captures messages with severity and tags', () => {
      process.env.NODE_ENV = 'production';
      process.env.SENTRY_DSN = 'https://example@sentry.io/1';

      const { Sentry, sentryLib } = loadSentry();
      sentryLib.reportMessageToSentry('something odd', { severity: 'warning', tags: { handler: 'proxy' } });

      expect(mockScope.setLevel).toHaveBeenCalledWith('warning');
      expect(mockScope.setTag).toHaveBeenCalledWith('handler', 'proxy');
      expect(Sentry.captureMessage).toHaveBeenCalledWith('something odd');
    });

    test('falls back to the logger when Sentry is not configured', () => {
      process.env.NODE_ENV = 'production';

      const { Sentry, sentryLib, logger } = loadSentry();
      sentryLib.reportMessageToSentry('something odd');

      expect(Sentry.captureMessage).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith('[Sentry fallback] something odd');
    });
  });

  describe('process fallbacks', () => {
    test('reports unhandled rejections as fatal', () => {
      process.env.NODE_ENV = 'production';
      process.env.SENTRY_DSN = 'https://example@sentry.io/1';

      const { Sentry } = loadSentry();
      const { unhandledRejection } = getProcessHandlers();
      unhandledRejection(new Error('async boom'));

      expect(mockScope.setLevel).toHaveBeenCalledWith('fatal');
      expect(mockScope.setTag).toHaveBeenCalledWith('handler', 'fallback');
      expect(Sentry.captureException).toHaveBeenCalledWith(expect.objectContaining({ message: 'async boom' }));
    });

    test('wraps non-error rejection reasons', () => {
      process.env.NODE_ENV = 'production';
      process.env.SENTRY_DSN = 'https://example@sentry.io/1';

      const { Sentry } = loadSentry();
      const { unhandledRejection } = getProcessHandlers();
      unhandledRejection('string reason');

      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Unhandled Rejection: string reason' }),
      );
    });

    test('reports uncaught exceptions as fatal', () => {
      process.env.NODE_ENV = 'production';
      process.env.SENTRY_DSN = 'https://example@sentry.io/1';

      const { Sentry } = loadSentry();
      const { uncaughtException } = getProcessHandlers();
      const err = new Error('sync boom');
      uncaughtException(err);

      expect(Sentry.captureException).toHaveBeenCalledWith(err);
      expect(mockScope.setLevel).toHaveBeenCalledWith('fatal');
    });
  });
});
