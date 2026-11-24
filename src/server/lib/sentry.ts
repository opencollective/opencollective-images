/**
 * Sentry helpers. The SDK itself is initialized in `src/server/instrument.ts`, which must be the
 * first import of the server (see https://docs.sentry.io/platforms/javascript/guides/express/).
 */
import crypto from 'crypto';

import * as Sentry from '@sentry/node';

export const checkIfSentryConfigured = (): boolean => Boolean(process.env.SENTRY_DSN);

export const isSentryEnabled = (): boolean => checkIfSentryConfigured() && process.env.NODE_ENV !== 'test';

const getSampleRate = (value: string | undefined): number => {
  const parsed = parseFloat(value ?? '');
  return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : 0;
};

export const getTracesSampleRate = (): number => getSampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE);

/**
 * Validates the shared secret protecting the `/debug-sentry` endpoint. Returns false when no key
 * is configured, so the endpoint is disabled by default. Uses a constant-time comparison.
 */
export const isValidDebugSentryKey = (provided: unknown): boolean => {
  const expected = process.env.DEBUG_SENTRY_KEY;
  if (!expected || typeof provided !== 'string' || !provided) {
    return false;
  }
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(providedBuffer, expectedBuffer);
};

type ReportOptions = {
  severity?: Sentry.SeverityLevel;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
};

/**
 * Manually reports an error to Sentry. Errors passed to Express (thrown in a handler, rejected
 * promises or `next(err)`) are already captured by `Sentry.setupExpressErrorHandler`; use this for
 * errors that a controller handles itself (e.g. by answering with a 500). Request data is attached
 * automatically by the SDK's HTTP integration.
 */
export const reportErrorToSentry = (err: unknown, { severity = 'error', tags, extra }: ReportOptions = {}): void => {
  if (!err || !isSentryEnabled()) {
    return;
  }

  Sentry.withScope((scope) => {
    scope.setLevel(severity);
    if (tags) {
      scope.setTags(tags);
    }
    if (extra) {
      scope.setExtras(extra);
    }
    Sentry.captureException(err);
  });
};

export { Sentry };
