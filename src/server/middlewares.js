import { reportErrorToSentry } from './lib/sentry';

export const maxAge = (maxAge = 60) => {
  return (req, res, next) => {
    res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
    next();
  };
};

// Express 4 does not catch rejected promises from async handlers.
// Wrap every async controller so rejections reach the global error handler (and Sentry).
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

const getErrorStatus = (err) => {
  const status = err?.status || err?.statusCode;
  return Number.isInteger(status) ? status : 500;
};

// Final error handler. Must be registered after routes and after Sentry's error handler.
export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const status = getErrorStatus(err);

  // Client errors (400, 404, ...) are expected traffic, do not report to Sentry
  if (status < 500) {
    return res.status(status).send(err.message || 'An error occurred');
  }

  reportErrorToSentry(err, { tags: { handler: 'express' }, req });

  return res.status(500).send('Internal Server Error');
};
