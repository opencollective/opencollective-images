import fetch from 'node-fetch';

import badge from '../../src/server/controllers/badge';
import { fetchMembersStatsWithCache } from '../../src/server/lib/graphql';

jest.mock('node-fetch', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../src/server/lib/graphql', () => ({
  fetchMembersStatsWithCache: jest.fn(),
}));

const getResponse = () => ({
  send: jest.fn(),
  sendStatus: jest.fn(),
  setHeader: jest.fn(),
  status: jest.fn().mockReturnThis(),
});

const getRequestedUrl = () => new URL(fetch.mock.calls[0][0]);

describe('badge controller', () => {
  const originalShieldsIo = process.env.SHIELDS_IO;

  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockResolvedValue({ text: () => Promise.resolve('<svg></svg>') });
    process.env.SHIELDS_IO = 'true';
  });

  afterAll(() => {
    process.env.SHIELDS_IO = originalShieldsIo;
  });

  describe('img.shields.io/opencollective badges', () => {
    test('encodes the label so that it cannot override other parameters', async () => {
      const req = {
        params: { collectiveSlug: 'apex', backerType: 'backers' },
        query: { label: 'test&color=red' },
      };
      const res = getResponse();

      await badge(req, res);

      expect(fetch).toHaveBeenCalledTimes(1);
      const url = getRequestedUrl();
      expect(url.hostname).toEqual('img.shields.io');
      expect(url.pathname).toEqual('/opencollective/backers/apex.svg');
      expect(url.searchParams.getAll('label')).toEqual(['test&color=red']);
      expect(url.searchParams.getAll('color')).toEqual(['brightgreen']);
      expect(url.searchParams.getAll('style')).toEqual(['flat']);
      expect(res.setHeader).toHaveBeenCalledWith('content-type', 'image/svg+xml;charset=utf-8');
      expect(res.send).toHaveBeenCalledWith('<svg></svg>');
    });

    test('keeps a path-traversal style collective slug within the badge path segment', async () => {
      const req = {
        params: { collectiveSlug: '../../x', backerType: 'sponsors' },
        query: {},
      };
      const res = getResponse();

      await badge(req, res);

      const url = getRequestedUrl();
      expect(url.hostname).toEqual('img.shields.io');
      // The slug is encoded within a single path segment: it cannot escape
      // /opencollective/<backerType>/ by injecting '/' or '..' separators.
      expect(url.pathname).toEqual('/opencollective/sponsors/..%2F..%2Fx.svg');
      expect(url.pathname.split('/')).toEqual(['', 'opencollective', 'sponsors', '..%2F..%2Fx.svg']);
      expect(decodeURIComponent(url.pathname)).toEqual('/opencollective/sponsors/../../x.svg');
    });

    test('encodes color and style values as single parameters', async () => {
      const req = {
        params: { collectiveSlug: 'apex', backerType: 'backers' },
        query: { color: 'red&label=pwned', style: 'for-the-badge#x' },
      };
      const res = getResponse();

      await badge(req, res);

      const url = getRequestedUrl();
      expect(Array.from(url.searchParams.keys())).toEqual(['color', 'style', 'label']);
      expect(url.searchParams.get('color')).toEqual('red&label=pwned');
      expect(url.searchParams.get('style')).toEqual('for-the-badge#x');
    });
  });

  describe('img.shields.io/badge fallback', () => {
    beforeEach(() => {
      delete process.env.SHIELDS_IO;
    });

    test('encodes the collective name and style in the badge URL', async () => {
      fetchMembersStatsWithCache.mockResolvedValue({ name: 'Apex Collective & Friends', count: 42 });
      const req = {
        params: { collectiveSlug: 'apex' },
        query: {},
      };
      const res = getResponse();

      await badge(req, res);

      expect(fetchMembersStatsWithCache).toHaveBeenCalledWith(req.params);
      const url = getRequestedUrl();
      expect(url.hostname).toEqual('img.shields.io');
      expect(url.pathname).toEqual('/badge/Apex%20Collective%20%26%20Friends-42-brightgreen.svg');
      expect(url.searchParams.getAll('style')).toEqual(['flat']);
      expect(res.send).toHaveBeenCalledWith('<svg></svg>');
    });

    test('encodes a caller-provided label in the badge filename', async () => {
      fetchMembersStatsWithCache.mockResolvedValue({ name: 'Apex', count: 42 });
      const req = {
        params: { collectiveSlug: 'apex' },
        query: { label: 'backers?style=flat-square' },
      };
      const res = getResponse();

      await badge(req, res);

      const url = getRequestedUrl();
      expect(url.pathname).toEqual('/badge/backers%3Fstyle%3Dflat-square-42-brightgreen.svg');
      expect(url.searchParams.getAll('style')).toEqual(['flat']);
    });
  });
});
