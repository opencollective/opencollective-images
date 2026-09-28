const mockInit = jest.fn();
const mockCaptureException = jest.fn();
const mockFlush = jest.fn();
const mockSetupExpressErrorHandler = jest.fn();
const mockOnUncaughtExceptionIntegration = jest.fn((options) => ({ name: 'configured-uncaught', options }));
const mockOnUnhandledRejectionIntegration = jest.fn((options) => ({ name: 'configured-rejection', options }));

jest.mock(
  '@sentry/node',
  () => ({
    init: mockInit,
    captureException: mockCaptureException,
    flush: mockFlush,
    setupExpressErrorHandler: mockSetupExpressErrorHandler,
    onUncaughtExceptionIntegration: mockOnUncaughtExceptionIntegration,
    onUnhandledRejectionIntegration: mockOnUnhandledRejectionIntegration,
  }),
  { virtual: true },
);

const originalEnv = process.env;
const originalUncaughtListeners = process.listeners('uncaughtException');
const originalRejectionListeners = process.listeners('unhandledRejection');

const restoreProcessListeners = () => {
  process.removeAllListeners('uncaughtException');
  process.removeAllListeners('unhandledRejection');
  originalUncaughtListeners.forEach((listener) => process.on('uncaughtException', listener));
  originalRejectionListeners.forEach((listener) => process.on('unhandledRejection', listener));
};

describe('Sentry instrumentation', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    restoreProcessListeners();
    process.env = { ...originalEnv };
    delete process.env.SENTRY_DSN;
    delete process.env.SENTRY_RELEASE;
    delete process.env.SENTRY_TRACES_SAMPLE_RATE;
    delete process.env.SENTRY_PROFILES_SAMPLE_RATE;
  });

  afterAll(() => {
    process.env = originalEnv;
    restoreProcessListeners();
  });

  test('does not initialize or register global handlers without a DSN', () => {
    require('../../src/server/instrument');

    expect(mockInit).not.toHaveBeenCalled();
    expect(mockOnUncaughtExceptionIntegration).not.toHaveBeenCalled();
    expect(mockOnUnhandledRejectionIntegration).not.toHaveBeenCalled();
  });

  test('initializes with deploy metadata, configurable sampling, privacy, and one set of handlers', () => {
    process.env.SENTRY_DSN = 'https://public@example.invalid/1';
    process.env.SENTRY_RELEASE = 'git-sha';
    process.env.OC_ENV = 'staging';
    process.env.SENTRY_TRACES_SAMPLE_RATE = '0.25';
    process.env.SENTRY_PROFILES_SAMPLE_RATE = '0.1';

    require('../../src/server/instrument');

    expect(mockInit).toHaveBeenCalledTimes(1);
    const options = mockInit.mock.calls[0][0];
    expect(options).toMatchObject({
      dsn: process.env.SENTRY_DSN,
      environment: 'staging',
      release: 'git-sha',
      sendDefaultPii: false,
      tracesSampleRate: 0.25,
      profilesSampleRate: 0.1,
    });
    expect(
      options.beforeSend({
        request: { headers: { Authorization: 'Bearer secret', Cookie: 'session=secret', Accept: 'image/png' } },
      }),
    ).toEqual({
      request: { headers: { Authorization: '[Filtered]', Cookie: '[Filtered]', Accept: 'image/png' } },
    });
    expect(options.integrations([{ name: 'OnUncaughtException' }, { name: 'Http' }])).toEqual([
      { name: 'Http' },
      expect.objectContaining({ name: 'configured-uncaught' }),
      expect.objectContaining({ name: 'configured-rejection' }),
    ]);
    expect(mockOnUncaughtExceptionIntegration).toHaveBeenCalledWith(
      expect.objectContaining({ exitEvenIfOtherHandlersAreRegistered: true, onFatalError: expect.any(Function) }),
    );
    expect(mockOnUnhandledRejectionIntegration).toHaveBeenCalledWith({ mode: 'warn' });
  });

  test('captures unhandled rejections once without terminating the process', () => {
    process.env.SENTRY_DSN = 'https://public@example.invalid/1';
    const { reportUnhandledRejection } = require('../../src/server/instrument');
    const error = new Error('rejected');

    reportUnhandledRejection(error);

    expect(mockCaptureException).toHaveBeenCalledTimes(1);
    expect(mockCaptureException).toHaveBeenCalledWith(error, {
      mechanism: { handled: false, type: 'unhandledrejection' },
    });
  });

  test('captures a fatal exception once, bounds the flush, and exits non-zero', async () => {
    process.env.SENTRY_DSN = 'https://public@example.invalid/1';
    mockFlush.mockResolvedValue(true);
    const exit = jest.spyOn(process, 'exit').mockImplementation(() => undefined);
    const { flushAndExit } = require('../../src/server/instrument');
    const error = new Error('fatal');

    await flushAndExit(error, { timeout: 25 });
    await flushAndExit(error, { timeout: 25 });

    expect(mockCaptureException).toHaveBeenCalledTimes(1);
    expect(mockFlush).toHaveBeenCalledWith(25);
    expect(exit).toHaveBeenCalledWith(1);
    exit.mockRestore();
  });
});
