import debug from 'debug';
import type { RedisClientType } from 'redis';
import { createClient } from 'redis';

import { logger } from '../../logger';

import type { CacheGetOptions, CacheProvider, CacheSetOptions } from './provider';

let redisClient: RedisClientType | null = null;

async function createRedisClient(): Promise<RedisClientType | null> {
  if (!redisClient) {
    const url = process.env.REDIS_URL;
    if (!url) {
      return null;
    }

    const redisOptions: { url: string; socket?: { tls: true; rejectUnauthorized: boolean } } = { url };
    if (redisOptions.url.includes('rediss://')) {
      redisOptions['socket'] = { tls: true, rejectUnauthorized: false };
    }

    redisClient = createClient(redisOptions);
    try {
      redisClient.on('error', (err) => logger.error(`Redis error`, err));
      redisClient.on('reconnecting', () => logger.info(`Redis reconnecting`));
      redisClient.on('connect', () => logger.info(`Redis connected`));
      redisClient.on('ready', () => logger.info(`Redis ready`));
      redisClient.on('end', () => logger.info(`Redis connection closed`));

      await redisClient.connect();
    } catch (err) {
      logger.error(`Redis connection error`, err);
      redisClient = null;
    }
  }

  return redisClient;
}

const makeRedisProvider = async (): Promise<CacheProvider> => {
  const debugCache = debug('cache');

  const redisClient = await createRedisClient();
  if (!redisClient) {
    logger.warn(`redis client not available, redisProvider in compatibility mode`);
  }

  return {
    clear: async () => redisClient?.flushAll(),
    delete: async (key: string) => redisClient?.del(key),
    get: async (key: string, { unserialize = JSON.parse }: CacheGetOptions = {}) => {
      // Redis RESP3 replies are typed as `{}` without a type mapping: the client always returns the string we set
      const value = (await redisClient?.get(key)) as string | null;
      if (value) {
        try {
          return unserialize(value);
        } catch (err) {
          debugCache(`Invalid JSON (${value}): ${err}`);
        }
      } else {
        return undefined;
      }
    },
    has: async (key: string) => {
      const value = await redisClient?.get(key);
      return value !== null;
    },
    set: async (
      key: string,
      value: unknown,
      expirationInSeconds: number,
      { serialize = JSON.stringify }: CacheSetOptions = {},
    ) => {
      if (value !== undefined) {
        if (expirationInSeconds) {
          return redisClient?.set(key, serialize(value), { EX: expirationInSeconds });
        } else {
          return redisClient?.set(key, serialize(value));
        }
      }
    },
  };
};

export default makeRedisProvider;
