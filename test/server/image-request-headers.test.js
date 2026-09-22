import { imageRequest } from '../../src/server/lib/request';

jest.mock('request', () => {
  const request = jest.fn((options, callback) => {
    callback(null, { statusCode: 200, headers: {}, statusMessage: 'OK' }, Buffer.from('img'));
  });
  return request;
});

const request = jest.requireMock('request');

describe('image request headers', () => {
  beforeEach(() => {
    request.mockClear();
    delete process.env.ENABLE_CACHED_REQUEST;
    process.env.OC_SECRET = 'top-secret';
    process.env.OC_ENV = 'production';
    process.env.OC_APPLICATION = 'images';
  });

  test('avatar and banner image fetches do not send internal service headers', async () => {
    const response = await imageRequest('https://res.cloudinary.com/opencollective/image/fetch/a.png');

    expect(response.statusCode).toBe(200);
    expect(request).toHaveBeenCalledTimes(1);
    const options = request.mock.calls[0][0];
    expect(options.url).toBe('https://res.cloudinary.com/opencollective/image/fetch/a.png');
    expect(options.headers).toEqual({ 'user-agent': 'opencollective-images/1.0' });
    expect(options.headers['oc-secret']).toBeUndefined();
    expect(options.headers['oc-env']).toBeUndefined();
    expect(options.headers['oc-application']).toBeUndefined();
  });
});
