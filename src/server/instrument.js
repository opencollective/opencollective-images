import './env';

import * as Sentry from '@sentry/node';

const REDACTED = '[Filtered]';
const SENSITIVE_HEADERS = new Set([
  'authorization',
  'api-key',
  'cookie',
  'oc-secret',
  'proxy-authorization',
  'set-cookie',
  'x-api-key',
  'x-opencollective-api-key',
  'x-opencollective-secret',
  'x-oc-secret',
]);
const reportedFatalErrors = new WeakSet();

let enabled = false;
let fatalErrorInProgress = false;

const parseSampleRate = (name) => {
  if (process.env[name] === undefined || process.env[name] === '') {
    return undefined;
  }

  const rate = Number(process.env[name]);
  return Number.isFinite(rate) && rate >= 0 && rate <= 1 ? rate : undefined;
};

const redactHeaders = (headers) => {
  if (!headers) {
    return headers;
  }

  return Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [
      name,
      SENSITIVE_HEADERS.has(name.toLowerCase()) ? REDACTED : value,
    ]),
  );
};

export const redactEvent = (event) => {
  if (event.request) {
    event.request.headers = redactHeaders(event.request.headers);
  }
  return event;
};

export const isExpectedClientError = (error) =>
  Boolean(
    error?.isOperational &&
      Number(error.status || error.statusCode) >= 400 &&
      Number(error.status || error.statusCode) < 500,
  );

export const shouldCaptureExpressError = (error) => !isExpectedClientError(error);

export const flushAndExit = async (
  error,
  { timeout = Number(process.env.SENTRY_FLUSH_TIMEOUT) || 2000, capture = true } = {},
) => {
  if (fatalErrorInProgress) {
    return;
  }
  fatalErrorInProgress = true;

  // Avoid recursive Winston exception handlers here: stderr is the safest fatal path.
  console.error('Fatal process error', error);
  if (capture && enabled && error && typeof error === 'object' && !reportedFatalErrors.has(error)) {
    reportedFatalErrors.add(error);
    Sentry.captureException(error);
  }

  try {
    if (enabled) {
      await Promise.race([
        Sentry.flush(timeout),
        new Promise((resolve) => {
          const timer = setTimeout(resolve, timeout);
          timer.unref?.();
        }),
      ]);
    }
  } finally {
    // A process that raised an uncaught exception may be corrupted and must not continue.
    // eslint-disable-next-line n/no-process-exit
    process.exit(1);
  }
};

export const reportUnhandledRejection = (reason) => {
  const error = reason instanceof Error ? reason : new Error(`Unhandled promise rejection: ${String(reason)}`);
  console.error('Unhandled promise rejection', error);
  if (enabled) {
    Sentry.captureException(error, { mechanism: { handled: false, type: 'unhandledrejection' } });
  }
};

export const initializeSentry = () => {
  if (!process.env.SENTRY_DSN) {
    return false;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.OC_ENV || process.env.NODE_ENV,
    release: process.env.SENTRY_RELEASE,
    sendDefaultPii: false,
    tracesSampleRate: parseSampleRate('SENTRY_TRACES_SAMPLE_RATE'),
    profilesSampleRate: parseSampleRate('SENTRY_PROFILES_SAMPLE_RATE'),
    beforeSend: redactEvent,
    // These are owned below so fatal logging, bounded flushing, and exit semantics
    // are explicit, and no second process handler can report the same exception.
    integrations: (defaultIntegrations) => [
      ...defaultIntegrations.filter(
        (integration) => !['OnUncaughtException', 'OnUnhandledRejection'].includes(integration.name),
      ),
      Sentry.onUncaughtExceptionIntegration({
        exitEvenIfOtherHandlersAreRegistered: true,
        onFatalError: (firstError) => flushAndExit(firstError, { capture: false }),
      }),
      Sentry.onUnhandledRejectionIntegration({ mode: 'warn' }),
    ],
  });
  enabled = true;
  return true;
};

export const captureStartupError = (error) => flushAndExit(error);

export const isSentryEnabled = () => enabled;

initializeSentry();

export { Sentry };
