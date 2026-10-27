import debug from 'debug';

import { logger } from '../../logger';

import makeMemoryProvider from './memory';
import type { CacheGetOptions, CacheProvider, CacheSetOptions } from './provider';
import makeRedisProvider from './redis';

export const PROVIDER_TYPES = {
  MEMCACHE: 'MEMCACHE',
  MEMORY: 'MEMORY',
  REDIS: 'REDIS',
} as const;

const debugCache = debug('cache');

export const getProvider = (providerType: string): CacheProvider | Promise<CacheProvider> => {
  switch (providerType) {
    case PROVIDER_TYPES.REDIS:
      return makeRedisProvider();
    case PROVIDER_TYPES.MEMORY:
      return makeMemoryProvider({ max: 1000 });
    default:
      throw new Error(`Unsupported cache provider: ${providerType}`);
  }
};

const getDefaultProviderType = (): string => {
  if (process.env.REDIS_URL && !process.env.REDIS_DISABLED) {
    return PROVIDER_TYPES.REDIS;
  } else {
    return PROVIDER_TYPES.MEMORY;
  }
};

let defaultProvider: CacheProvider | Promise<CacheProvider> | undefined;

const getDefaultProvider = (): CacheProvider | Promise<CacheProvider> => {
  const defaultProviderType = getDefaultProviderType();
  if (!defaultProvider) {
    defaultProvider = getProvider(defaultProviderType);
  }
  return defaultProvider;
};

const cache = {
  clear: async (): Promise<unknown> => {
    try {
      debugCache('clear');
      const provider = await getDefaultProvider();
      return provider.clear();
    } catch (err) {
      logger.warn(`Error while clearing cache: ${err.message}`);
    }
  },
  delete: async (key: string): Promise<unknown> => {
    try {
      debugCache(`delete ${key}`);
      const provider = await getDefaultProvider();
      return provider.delete(key);
    } catch (err) {
      logger.warn(`Error while deleting from cache: ${err.message}`);
    }
  },
  get: async <T = unknown>(key: string, options?: CacheGetOptions): Promise<T | undefined> => {
    try {
      debugCache(`get ${key}`);
      const provider = await getDefaultProvider();
      return (await provider.get(key, options)) as T | undefined;
    } catch (err) {
      logger.warn(`Error while fetching from cache: ${err.message}`);
    }
  },
  has: async (key: string): Promise<boolean | null | undefined> => {
    try {
      debugCache(`has ${key}`);
      const provider = await getDefaultProvider();
      return provider.has(key);
    } catch (err) {
      logger.warn(`Error while checking from cache: ${err.message}`);
    }
  },
  set: async (
    key: string,
    value: unknown,
    expirationInSeconds: number,
    options?: CacheSetOptions,
  ): Promise<unknown> => {
    try {
      debugCache(`set ${key}`);
      const provider = await getDefaultProvider();
      return provider.set(key, value, expirationInSeconds, options);
    } catch (err) {
      logger.warn(`Error while writing to cache: ${err.message}`);
    }
  },
};

export default cache;
