import background from '../../src/server/controllers/background';
import { fetchCollectiveWithCache } from '../../src/server/lib/graphql';
import { asyncRequest } from '../../src/server/lib/request';
import { reportErrorToSentry } from '../../src/server/lib/sentry';

jest.mock('../../src/server/lib/graphql', () => ({
  fetchCollectiveWithCache: jest.fn(),
}));

jest.mock('../../src/server/lib/request', () => ({
  asyncRequest: jest.fn(),
}));

jest.mock('../../src/server/lib/sentry', () => ({
  reportErrorToSentry: jest.fn(),
}));

jest.mock('sharp', () =>
  jest.fn(() => ({
    resize: jest.fn().mockReturnThis(),
    toFormat: jest.fn(() => ({
      toBuffer: jest.fn().mockRejectedValue(new Error('sharp failed')),
    })),
  })),
);

describe('background controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 502 when fetching the background image fails', async () => {
    fetchCollectiveWithCache.mockResolvedValue({ backgroundImage: 'undefined/1500x500' });
    asyncRequest.mockRejectedValue(new TypeError('Image URL must be an absolute HTTP(S) URL'));

    const req = { params: { collectiveSlug: 'example' }, query: {} };
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    await background(req, res, jest.fn());

    expect(asyncRequest).toHaveBeenCalledWith({ url: 'undefined/1500x500', encoding: null });
    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.send).toHaveBeenCalledWith('Unable to fetch background image');
    expect(reportErrorToSentry).toHaveBeenCalledWith(expect.any(TypeError), {
      tags: { handler: 'background' },
      extra: { imageUrl: 'undefined/1500x500' },
      req,
    });
  });

  test('returns 500 and reports to Sentry when image processing fails', async () => {
    fetchCollectiveWithCache.mockResolvedValue({ backgroundImage: 'https://example.com/bg.png' });
    asyncRequest.mockResolvedValue([null, Buffer.from('img')]);

    const req = { params: { collectiveSlug: 'example', format: 'png' }, query: {} };
    const res = {
      set: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    await background(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith('Internal Server Error');
    expect(reportErrorToSentry).toHaveBeenCalledWith(expect.any(Error), {
      tags: { handler: 'background' },
      extra: { imageUrl: 'https://example.com/bg.png' },
      req,
    });
  });
});
