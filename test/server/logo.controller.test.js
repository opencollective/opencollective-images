import logo from '../../src/server/controllers/logo';
import { fetchCollectiveWithCache } from '../../src/server/lib/graphql';
import { reportErrorToSentry } from '../../src/server/lib/sentry';

jest.mock('../../src/server/lib/graphql', () => ({
  fetchCollectiveWithCache: jest.fn(),
}));

jest.mock('../../src/server/lib/sentry', () => ({
  reportErrorToSentry: jest.fn(),
}));

jest.mock('node-fetch', () => jest.fn());

jest.mock('sharp', () =>
  jest.fn(() => ({
    resize: jest.fn().mockReturnThis(),
    toFormat: jest.fn(() => ({
      toBuffer: jest.fn().mockRejectedValue(new Error('sharp failed')),
    })),
  })),
);

const nodeFetch = jest.requireMock('node-fetch');

describe('logo controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 500 and reports to Sentry when image processing fails', async () => {
    fetchCollectiveWithCache.mockResolvedValue({
      id: 1,
      type: 'COLLECTIVE',
      image: 'https://example.com/logo.png',
    });
    nodeFetch.mockResolvedValue({ ok: true, buffer: async () => Buffer.from('img') });

    const req = { params: { collectiveSlug: 'example', format: 'png' }, query: {} };
    const res = {
      set: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    await logo(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith('Internal Server Error');
    expect(reportErrorToSentry).toHaveBeenCalledWith(expect.any(Error), {
      tags: { handler: 'logo' },
      extra: { imageUrl: 'https://example.com/logo.png' },
      req,
    });
  });
});
