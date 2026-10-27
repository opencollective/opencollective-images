import background from '../../src/server/controllers/background';
import { fetchCollectiveWithCache } from '../../src/server/lib/graphql';
import { asyncRequest } from '../../src/server/lib/request';

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
  });
});
