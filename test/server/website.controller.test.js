import website from '../../src/server/controllers/website';
import { fetchMembersWithCache } from '../../src/server/lib/graphql';

jest.mock('../../src/server/lib/graphql', () => ({
  fetchMembersWithCache: jest.fn(),
}));

const getRequest = (params = {}) => ({
  params: {
    collectiveSlug: 'test-collective',
    backerType: 'backers',
    position: '0',
    ...params,
  },
  query: {},
});

const getResponse = () => ({
  redirect: jest.fn(),
  send: jest.fn(),
  sendStatus: jest.fn(),
  status: jest.fn().mockReturnThis(),
});

describe('website controller', () => {
  const originalWebsiteUrl = process.env.WEBSITE_URL;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.WEBSITE_URL = 'https://opencollective.com';
  });

  afterAll(() => {
    process.env.WEBSITE_URL = originalWebsiteUrl;
  });

  test('redirects to a valid member website with tracking parameters', async () => {
    fetchMembersWithCache.mockResolvedValue([{ website: 'https://example.com/about?ref=profile' }]);
    const res = getResponse();

    await website(getRequest(), res);

    expect(res.redirect).toHaveBeenCalledWith(
      301,
      'https://example.com/about?ref=profile&utm_source=opencollective&utm_medium=github&utm_campaign=test-collective',
    );
  });

  test.each([
    '[https://www.tripinsurance.com](https://www.tripinsurance.com) / www.travelinsuranceplace.com',
    'not a URL',
    'javascript:alert(document.domain)',
  ])('returns 404 for an unsafe member website: %s', async (memberWebsite) => {
    fetchMembersWithCache.mockResolvedValue([{ website: memberWebsite }]);
    const res = getResponse();

    await website(getRequest(), res);

    expect(res.sendStatus).toHaveBeenCalledWith(404);
    expect(res.redirect).not.toHaveBeenCalled();
  });

  test('returns 404 when the support URL configuration is invalid', async () => {
    process.env.WEBSITE_URL = 'not a URL';
    fetchMembersWithCache.mockResolvedValue([]);
    const res = getResponse();

    await website(getRequest(), res);

    expect(res.sendStatus).toHaveBeenCalledWith(404);
    expect(res.redirect).not.toHaveBeenCalled();
  });
});
