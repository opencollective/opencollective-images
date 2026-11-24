import type * as SentryLib from '../../src/server/lib/sentry';

const mockScope = {
  setLevel: jest.fn(),
  setTags: jest.fn(),
  setExtras: jest.fn(),
};

jest.mock('@sentry/node', () => ({
  init: jest.fn(),
  withScope: jest.fn((callback) => callback(mockScope)),
  captureException: jest.fn(),
}));

const ENV_KEYS = [
  'DEBUG_SENTRY_KEY',
  'SENTRY_DSN',
  'SENTRY_ENVIRONMENT',
  'SENTRY_TRACES_SAMPLE_RATE',
  'OC_ENV',
  'NODE_ENV',
];
const DSN = 'https://public@example.ingest.sentry.io/1';

const loadSentryLib = (): typeof SentryLib => {
  jest.resetModules();
  return jest.requireActual('../../src/server/lib/sentry');
};

const loadInstrument = () => {
  jest.resetModules();
  const Sentry = jest.requireMock('@sentry/node');
  jest.requireActual('../../src/server/instrument');
  return Sentry.init.mock.calls[0][0];
};

describe('sentry', () => {
  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
    for (const key of ENV_KEYS) {
      delete process.env[key];
    }
    process.env.NODE_ENV = 'production';
    jest.clearAllMocks();
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (savedEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = savedEnv[key];
      }
    }
  });

  describe('instrument', () => {
    test('initializes Sentry from the environment', () => {
      process.env.SENTRY_DSN = DSN;
      process.env.OC_ENV = 'staging';
      process.env.SENTRY_TRACES_SAMPLE_RATE = '0.1';

      const config = loadInstrument();

      expect(config).toMatchObject({
        dsn: DSN,
        enabled: true,
        environment: 'staging',
        tracesSampleRate: 0.1,
        dataCollection: { userInfo: false, cookies: false },
      });
    });

    test('prefers SENTRY_ENVIRONMENT over OC_ENV', () => {
      process.env.SENTRY_DSN = DSN;
      process.env.OC_ENV = 'staging';
      process.env.SENTRY_ENVIRONMENT = 'custom';

      expect(loadInstrument().environment).toBe('custom');
    });

    test.each([
      [undefined, 0],
      ['not-a-number', 0],
      ['0.5', 0.5],
      ['2', 1],
    ])('parses SENTRY_TRACES_SAMPLE_RATE=%s to %s', (value, expected) => {
      process.env.SENTRY_DSN = DSN;
      if (value !== undefined) {
        process.env.SENTRY_TRACES_SAMPLE_RATE = value;
      }

      expect(loadInstrument().tracesSampleRate).toBe(expected);
    });

    test('is disabled without a DSN', () => {
      expect(loadInstrument().enabled).toBe(false);
    });

    test('is disabled in test env, even with a DSN', () => {
      process.env.NODE_ENV = 'test';
      process.env.SENTRY_DSN = DSN;

      expect(loadInstrument().enabled).toBe(false);
    });
  });

  describe('isValidDebugSentryKey', () => {
    test.each([
      ['shared-secret', true],
      ['wrong-secret', false],
      ['shared-secret-but-longer', false],
      ['', false],
      [['shared-secret'], false],
      [undefined, false],
    ])('validates %j -> %s', (provided, expected) => {
      process.env.DEBUG_SENTRY_KEY = 'shared-secret';
      expect(loadSentryLib().isValidDebugSentryKey(provided)).toBe(expected);
    });

    test('is disabled when no key is configured', () => {
      expect(loadSentryLib().isValidDebugSentryKey('')).toBe(false);
      expect(loadSentryLib().isValidDebugSentryKey('anything')).toBe(false);
    });
  });

  describe('reportErrorToSentry', () => {
    test('captures the error with severity, tags and extras', () => {
      process.env.SENTRY_DSN = DSN;
      const { reportErrorToSentry, Sentry } = loadSentryLib();
      const err = new Error('sharp failed');

      reportErrorToSentry(err, { severity: 'fatal', tags: { controller: 'logo' }, extra: { imageUrl: 'x' } });

      expect(mockScope.setLevel).toHaveBeenCalledWith('fatal');
      expect(mockScope.setTags).toHaveBeenCalledWith({ controller: 'logo' });
      expect(mockScope.setExtras).toHaveBeenCalledWith({ imageUrl: 'x' });
      expect(Sentry.captureException).toHaveBeenCalledWith(err);
    });

    test('does nothing without an error', () => {
      process.env.SENTRY_DSN = DSN;
      const { reportErrorToSentry, Sentry } = loadSentryLib();
      reportErrorToSentry(undefined);
      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    test.each([
      ['Sentry is not configured', 'production', undefined],
      ['running tests', 'test', DSN],
    ])('does nothing when %s', (_, nodeEnv, dsn) => {
      process.env.NODE_ENV = nodeEnv;
      if (dsn) {
        process.env.SENTRY_DSN = dsn;
      }
      const { reportErrorToSentry, Sentry } = loadSentryLib();
      reportErrorToSentry(new Error('boom'));
      expect(Sentry.captureException).not.toHaveBeenCalled();
    });
  });
});
