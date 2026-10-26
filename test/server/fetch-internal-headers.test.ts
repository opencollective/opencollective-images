import fetch from '../../src/server/lib/fetch';

jest.mock('node-fetch', () => jest.fn(async () => ({ headers: { get: () => null } })));

const nodeFetch = jest.requireMock('node-fetch');

describe('graphql fetch headers', () => {
  beforeEach(() => {
    nodeFetch.mockClear();
    process.env.API_URL = 'https://api.opencollective.com';
    process.env.OC_SECRET = 'top-secret';
    process.env.OC_ENV = 'production';
    process.env.OC_APPLICATION = 'images';
  });

  test('sends internal service headers only to the API origin', async () => {
    await fetch('https://api.opencollective.com/graphql/v1');
    await fetch('https://cdn.example/image.png');
    await fetch('https://api.opencollective.com.evil.example/graphql');

    const apiHeaders = nodeFetch.mock.calls[0][1].headers;
    expect(apiHeaders['oc-secret']).toBe('top-secret');
    expect(apiHeaders['oc-env']).toBe('production');
    expect(apiHeaders['oc-application']).toBe('images');

    for (const call of nodeFetch.mock.calls.slice(1)) {
      expect(call[1].headers['oc-secret']).toBeUndefined();
      expect(call[1].headers['oc-env']).toBeUndefined();
      expect(call[1].headers['oc-application']).toBeUndefined();
      expect(call[1].headers['user-agent']).toBe('opencollective-images/1.0');
    }
  });
});
