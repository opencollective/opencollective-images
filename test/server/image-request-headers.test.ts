import { asyncRequest, imageRequest } from '../../src/server/lib/request';

jest.mock('node-fetch', () =>
  jest.fn(async () => ({
    status: 200,
    statusText: 'OK',
    headers: new Map([['content-type', 'image/png']]),
    arrayBuffer: async () => Uint8Array.from(Buffer.from('img')).buffer,
    text: async () => 'img',
  })),
);

const nodeFetch = jest.requireMock('node-fetch');

describe('image request headers', () => {
  beforeEach(() => {
    nodeFetch.mockClear();
    delete process.env.ENABLE_CACHED_REQUEST;
    process.env.API_URL = 'http://localhost:3060';
    process.env.OC_SECRET = 'top-secret';
    process.env.OC_ENV = 'production';
    process.env.OC_APPLICATION = 'images';
  });

  test('avatar and banner image fetches do not send internal service headers', async () => {
    const response = await imageRequest('https://res.cloudinary.com/opencollective/image/fetch/a.png');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(Buffer.from('img'));
    expect(nodeFetch).toHaveBeenCalledTimes(1);
    const [url, options] = nodeFetch.mock.calls[0];
    expect(url).toBe('https://res.cloudinary.com/opencollective/image/fetch/a.png');
    expect(options.headers).toEqual({ 'user-agent': 'opencollective-images/1.0' });
    expect(options.headers['oc-secret']).toBeUndefined();
    expect(options.headers['oc-env']).toBeUndefined();
    expect(options.headers['oc-application']).toBeUndefined();
  });

  test('image URLs on the API origin do not send internal service headers either', async () => {
    await imageRequest('http://localhost:3060/some/image.png');

    expect(nodeFetch).toHaveBeenCalledTimes(1);
    const [, options] = nodeFetch.mock.calls[0];
    expect(options.headers).toEqual({ 'user-agent': 'opencollective-images/1.0' });
  });

  test('rejects invalid image URLs before fetching or touching the cache', async () => {
    process.env.ENABLE_CACHED_REQUEST = 'true';

    await expect(asyncRequest({ url: 'undefined/1500x500', encoding: null })).rejects.toThrow(
      'Image URL must be an absolute HTTP(S) URL',
    );

    expect(nodeFetch).not.toHaveBeenCalled();
  });
});
