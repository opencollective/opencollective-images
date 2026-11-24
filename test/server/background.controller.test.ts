import background from '../../src/server/controllers/background';
import { fetchCollectiveWithCache } from '../../src/server/lib/graphql';
import { asyncRequest } from '../../src/server/lib/request';
import { reportErrorToSentry } from '../../src/server/lib/sentry';

type BackgroundRequest = Parameters<typeof background>[0];
type BackgroundResponse = Parameters<typeof background>[1];

const fetchCollectiveWithCacheMock = fetchCollectiveWithCache as jest.Mock;
const asyncRequestMock = asyncRequest as jest.Mock;

// Tests only implement the response methods the controller uses
const asResponse = (res: Partial<BackgroundResponse>): BackgroundResponse => res as BackgroundResponse;

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
    fetchCollectiveWithCacheMock.mockResolvedValue({ backgroundImage: 'undefined/1500x500' });
    asyncRequestMock.mockRejectedValue(new TypeError('Image URL must be an absolute HTTP(S) URL'));

    const req = { params: { collectiveSlug: 'example' }, query: {} } as BackgroundRequest;
    const res = asResponse({
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    });

    await background(req, res, jest.fn());

    expect(asyncRequest).toHaveBeenCalledWith({ url: 'undefined/1500x500', encoding: null });
    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.send).toHaveBeenCalledWith('Unable to fetch background image');
    // Unreachable user-provided images are not our errors
    expect(reportErrorToSentry).not.toHaveBeenCalled();
  });

  test('returns 500 and reports to Sentry when image processing fails', async () => {
    fetchCollectiveWithCacheMock.mockResolvedValue({ backgroundImage: 'https://example.com/bg.png' });
    asyncRequestMock.mockResolvedValue([null, Buffer.from('img')]);

    const req = { params: { collectiveSlug: 'example', format: 'png' }, query: {} } as BackgroundRequest;
    const res = asResponse({
      set: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    });

    await background(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith('Internal Server Error');
    expect(reportErrorToSentry).toHaveBeenCalledWith(expect.objectContaining({ message: 'sharp failed' }), {
      tags: { controller: 'background' },
      extra: { imageUrl: 'https://example.com/bg.png' },
    });
  });
});
