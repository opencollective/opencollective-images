import { LRUCache } from 'lru-cache';

import type { CacheProvider } from './provider';

const makeMemoryProvider = (opts: { max: number }): CacheProvider => {
  const cache = new LRUCache(opts);
  return {
    clear: async () => cache.clear(),
    delete: async (key: string) => cache.delete(key),
    get: async (key: string) => cache.get(key),
    has: async (key: string) => cache.has(key),
    set: async (key: string, value: unknown, expirationInSeconds: number) =>
      cache.set(key, value, { ttl: expirationInSeconds * 1000 }),
  };
};

export default makeMemoryProvider;
