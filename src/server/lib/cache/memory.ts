import { LRUCache } from 'lru-cache';

import type { CacheProvider } from './provider';

// lru-cache only types values as non-nullish. At runtime `undefined` removes the entry and `null` is stored
// as is, so the unknown values handed over by the cache provider interface are passed through unchanged.
type CachedValue = NonNullable<unknown>;

const makeMemoryProvider = (opts: { max: number }): CacheProvider => {
  const cache = new LRUCache<string, CachedValue>(opts);
  return {
    clear: async () => cache.clear(),
    delete: async (key: string) => cache.delete(key),
    get: async (key: string) => cache.get(key),
    has: async (key: string) => cache.has(key),
    set: async (key: string, value: unknown, expirationInSeconds: number) =>
      cache.set(key, value as CachedValue, { ttl: expirationInSeconds * 1000 }),
  };
};

export default makeMemoryProvider;
