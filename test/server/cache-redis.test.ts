// Runs the Redis cache provider against a real Redis server: set TEST_REDIS_URL (CI uses the job's Redis service).
// The suite empties the database selected in the URL (FLUSHDB) before each test: point it at a disposable one.
// It never runs FLUSHALL, which would also wipe the other databases on the server.
const TEST_REDIS_URL = process.env.TEST_REDIS_URL;

// Keep track of the clients the provider creates, so they can be inspected and closed.
// With mockFakeClient set, the provider gets a stub that never opens a connection.
const mockClients = [];
let mockFakeClient = false;
jest.mock('redis', () => {
  const actual = jest.requireActual('redis');
  return {
    ...actual,
    createClient: (options) => {
      const client = mockFakeClient
        ? { on: () => {}, connect: async () => {}, isOpen: false }
        : actual.createClient(options);
      mockClients.push({ client, options });
      return client;
    },
  };
});

jest.mock('../../src/server/logger');

const loadProvider = async (url) => {
  process.env.REDIS_URL = url;
  let makeRedisProvider;
  jest.isolateModules(() => {
    makeRedisProvider = require('../../src/server/lib/cache/redis').default;
  });
  return makeRedisProvider();
};

afterEach(async () => {
  for (const { client } of mockClients.splice(0)) {
    if (client.isOpen) {
      await client.quit();
    }
  }
  delete process.env.REDIS_URL;
});

const describeWithRedis = TEST_REDIS_URL ? describe : describe.skip;

describeWithRedis('cache/redis provider', () => {
  let cache, inspector;

  beforeEach(async () => {
    cache = await loadProvider(TEST_REDIS_URL);
    inspector = mockClients[0].client;
    await inspector.flushDb();
  });

  test('connects to the server', () => {
    expect(inspector.isReady).toBe(true);
  });

  test('round-trips JSON values', async () => {
    const value = { slug: 'opencollective', members: [1, 2], nested: { image: null } };
    await cache.set('collective', value);
    expect(await cache.get('collective')).toEqual(value);
    expect(await inspector.get('collective')).toBe(JSON.stringify(value));
  });

  test('returns undefined for a missing key', async () => {
    expect(await cache.get('missing')).toBeUndefined();
  });

  test('does not store undefined values', async () => {
    await cache.set('undefined', undefined);
    expect(await inspector.exists('undefined')).toBe(0);
  });

  test('sets an expiration in seconds', async () => {
    await cache.set('expiring', 'value', 120);
    const ttl = await inspector.ttl('expiring');
    expect(ttl).toBeGreaterThan(110);
    expect(ttl).toBeLessThanOrEqual(120);
  });

  test('stores without expiration when none is given', async () => {
    await cache.set('persistent', 'value');
    expect(await inspector.ttl('persistent')).toBe(-1);
  });

  test('has() reflects whether the key exists', async () => {
    expect(await cache.has('key')).toBe(false);
    await cache.set('key', 'value');
    expect(await cache.has('key')).toBe(true);
  });

  test('delete() removes a key', async () => {
    await cache.set('key', 'value');
    await cache.delete('key');
    expect(await cache.get('key')).toBeUndefined();
  });

  test('clear() flushes the server', async () => {
    // FLUSHALL is stubbed: it would empty every database on the server, not only the test one
    const flushAll = jest.spyOn(inspector, 'flushAll').mockResolvedValue('OK');
    await cache.clear();
    expect(flushAll).toHaveBeenCalledTimes(1);
  });

  test('supports custom serialize and unserialize', async () => {
    const buffer = Buffer.from('binary image data');
    await cache.set('image', buffer, 60, { serialize: (b) => b.toString('base64') });
    const result = await cache.get('image', { unserialize: (s) => Buffer.from(s, 'base64') });
    expect(result.equals(buffer)).toBe(true);
  });

  test('returns undefined for a value that is not valid JSON', async () => {
    await inspector.set('invalid', '{not json');
    expect(await cache.get('invalid')).toBeUndefined();
  });

  test('reuses a single client across providers', async () => {
    // A module instance keeps one client: a second provider must not open another connection
    const makeRedisProvider = require('../../src/server/lib/cache/redis').default;
    const before = mockClients.length;
    const first = await makeRedisProvider();
    await makeRedisProvider();
    expect(mockClients.length).toBe(before + 1);
    await first.set('shared', 'value');
    expect(await cache.get('shared')).toBe('value');
  });
});

describe('cache/redis client options', () => {
  afterEach(() => {
    mockFakeClient = false;
  });

  test('enables TLS for rediss:// URLs', async () => {
    mockFakeClient = true;
    await loadProvider('rediss://user:pass@example.com:6380');
    expect(mockClients[0].options).toEqual({
      url: 'rediss://user:pass@example.com:6380',
      socket: { tls: true, rejectUnauthorized: false },
    });
  });

  test('uses plain TCP for redis:// URLs', async () => {
    mockFakeClient = true;
    await loadProvider('redis://example.com:6379');
    expect(mockClients[0].options).toEqual({ url: 'redis://example.com:6379' });
  });
});
