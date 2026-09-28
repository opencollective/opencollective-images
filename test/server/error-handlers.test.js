jest.mock('../../src/server/instrument', () => ({
  captureStartupError: jest.fn(),
  isSentryEnabled: jest.fn(() => true),
  Sentry: { setupExpressErrorHandler: jest.fn() },
  shouldCaptureExpressError: jest.fn(() => true),
}));
jest.mock('../../src/server/lib/hyperwatch', () => ({ load: jest.fn() }));
jest.mock('../../src/server/routes', () => ({ loadRoutes: jest.fn() }));

describe('Express error handling', () => {
  let finalErrorResponder;

  beforeAll(() => {
    ({ finalErrorResponder } = require('../../src/server/index'));
  });

  test('installs Sentry after routes', () => {
    const { createApp } = require('../../src/server/index');
    const { Sentry } = require('../../src/server/instrument');
    const { loadRoutes } = require('../../src/server/routes');

    createApp();

    expect(loadRoutes).toHaveBeenCalled();
    expect(Sentry.setupExpressErrorHandler).toHaveBeenCalled();
    expect(loadRoutes.mock.invocationCallOrder[0]).toBeLessThan(
      Sentry.setupExpressErrorHandler.mock.invocationCallOrder[0],
    );
  });

  test('returns a controlled production 500 without exception details', () => {
    const oldNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const response = { headersSent: false, status: jest.fn(), json: jest.fn() };
    response.status.mockReturnValue(response);

    finalErrorResponder(new Error('database password leaked'), {}, response, jest.fn());

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({ error: 'Internal Server Error' });
    process.env.NODE_ENV = oldNodeEnv;
  });

  test('delegates when response headers have already been sent', () => {
    const error = new Error('stream failed');
    const next = jest.fn();

    finalErrorResponder(error, {}, { headersSent: true }, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
