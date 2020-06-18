import debug from 'debug';

import makeMemoryProvider from './memory';
import makeRedisProvider from './redis';

import { logger } from '../../logger';

export const PROVIDER_TYPES = {
  MEMCACHE: 'MEMCACHE',
  MEMORY: 'MEMORY',
  REDIS: 'REDIS',
};

const debugCache = debug('cache');

export const getProvider = (providerType) => {
  switch (providerType) {
    case PROVIDER_TYPES.REDIS:
      return makeRedisProvider({ serverUrl: process.env.REDIS_URL });
    case PROVIDER_TYPES.MEMORY:
      return makeMemoryProvider({ max: 1000 });
    default:
      throw new Error(`Unsupported cache provider: ${providerType}`);
  }
};

const getDefaultProviderType = () => {
  if (process.env.REDIS_URL && !process.env.REDIS_DISABLED) {
    return PROVIDER_TYPES.REDIS;
  } else {
    return PROVIDER_TYPES.MEMORY;
  }
};

let defaultProvider;

const getDefaultProvider = () => {
  const defaultProviderType = getDefaultProviderType();
  if (!defaultProvider) {
    defaultProvider = getProvider(defaultProviderType);
  }
  return defaultProvider;
};

const cache = {
  clear: async () => {
    try {
      debugCache('clear');
      return getDefaultProvider().clear();
    } catch (err) {
      logger.warn(`Error while clearing cache: ${err.message}`);
    }
  },
  del: async (key) => {
    try {
      debugCache(`del ${key}`);
      return getDefaultProvider().del(key);
    } catch (err) {
      logger.warn(`Error while deleting from cache: ${err.message}`);
    }
  },
  get: async (key, options) => {
    try {
      debugCache(`get ${key}`);
      return getDefaultProvider().get(key, options);
    } catch (err) {
      logger.warn(`Error while fetching from cache: ${err.message}`);
    }
  },
  has: async (key) => {
    try {
      debugCache(`has ${key}`);
      return getDefaultProvider().has(key);
    } catch (err) {
      logger.warn(`Error while checking from cache: ${err.message}`);
    }
  },
  set: async (key, value, expirationInSeconds, options) => {
    try {
      debugCache(`set ${key}`);
      return getDefaultProvider().set(key, value, expirationInSeconds, options);
    } catch (err) {
      logger.warn(`Error while writing to cache: ${err.message}`);
    }
  },
};

export default cache;
