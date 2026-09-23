import background from '../../src/server/controllers/background';
import { fetchCollectiveWithCache } from '../../src/server/lib/graphql';
import { asyncRequest } from '../../src/server/lib/request';

jest.mock('../../src/server/lib/graphql', () => ({
  fetchCollectiveWithCache: jest.fn(),
}));

jest.mock('../../src/server/lib/request', () => ({
  asyncRequest: jest.fn(),
}));

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
  });
});
