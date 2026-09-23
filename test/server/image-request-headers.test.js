import { asyncRequest, imageRequest } from '../../src/server/lib/request';

jest.mock('cached-request', () =>
  jest.fn(() => {
    const cachedRequest = jest.fn();
    cachedRequest.setCacheDirectory = jest.fn();
    return cachedRequest;
  }),
);

jest.mock('request', () => {
  const request = jest.fn((options, callback) => {
    callback(null, { statusCode: 200, headers: {}, statusMessage: 'OK' }, Buffer.from('img'));
  });
  return request;
});

const request = jest.requireMock('request');
const cachedRequest = jest.requireMock('cached-request').mock.results[0].value;

describe('image request headers', () => {
  beforeEach(() => {
    request.mockClear();
    cachedRequest.mockClear();
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

  test('rejects invalid image URLs before using the cached request stream', async () => {
    process.env.ENABLE_CACHED_REQUEST = 'true';

    await expect(asyncRequest({ url: 'undefined/1500x500', encoding: null })).rejects.toThrow(
      'Image URL must be an absolute HTTP(S) URL',
    );

    expect(cachedRequest).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });
});
