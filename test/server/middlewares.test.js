import { reportErrorToSentry } from '../../src/server/lib/sentry';
import { asyncHandler, errorHandler } from '../../src/server/middlewares';

jest.mock('../../src/server/lib/sentry', () => ({
  reportErrorToSentry: jest.fn(),
}));

const buildRes = () => ({
  headersSent: false,
  status: jest.fn().mockReturnThis(),
  send: jest.fn(),
});

describe('middlewares', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('asyncHandler', () => {
    test('does not call next when the handler resolves', async () => {
      const next = jest.fn();
      const handler = asyncHandler(async () => 'ok');

      await handler({}, {}, next);

      expect(next).not.toHaveBeenCalled();
    });

    test('forwards async rejections to next', async () => {
      const next = jest.fn();
      const err = new Error('async boom');
      const handler = asyncHandler(async () => {
        throw err;
      });

      await handler({}, {}, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('errorHandler', () => {
    test('delegates to next when headers are already sent', () => {
      const next = jest.fn();
      const err = new Error('too late');
      const res = { ...buildRes(), headersSent: true };

      errorHandler(err, {}, res, next);

      expect(next).toHaveBeenCalledWith(err);
      expect(res.status).not.toHaveBeenCalled();
      expect(reportErrorToSentry).not.toHaveBeenCalled();
    });

    test('passes client errors through without reporting to Sentry', () => {
      const next = jest.fn();
      const err = new Error('Not found');
      err.status = 404;
      const res = buildRes();

      errorHandler(err, {}, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith('Not found');
      expect(reportErrorToSentry).not.toHaveBeenCalled();
    });

    test('reports server errors and hides details behind a generic message', () => {
      const next = jest.fn();
      const err = new Error('sharp failed');
      const req = { ip: '127.0.0.1' };
      const res = buildRes();

      errorHandler(err, req, res, next);

      expect(reportErrorToSentry).toHaveBeenCalledWith(err, { tags: { handler: 'express' }, req });
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith('Internal Server Error');
    });

    test('treats errors without a status as 500s', () => {
      const res = buildRes();

      errorHandler(new Error('boom'), {}, res, jest.fn());

      expect(reportErrorToSentry).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
