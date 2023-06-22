import debug from 'debug';
import { createClient } from 'redis';

import { logger } from '../../logger';

let redisClient;

async function createRedisClient() {
  if (!redisClient) {
    const url = process.env.REDIS_URL;
    if (!url) {
      return;
    }

    const redisOptions = { url };
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

const makeRedisProvider = async () => {
  const debugCache = debug('cache');

  const redisClient = await createRedisClient();
  if (!redisClient) {
    logger.warn(`redis client not available, redisProvider in compatibility mode`);
  }

  return {
    clear: async () => redisClient?.flushAll(),
    delete: async (key) => redisClient?.del(key),
    get: async (key, { unserialize = JSON.parse } = {}) => {
      const value = await redisClient?.get(key);
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
    has: async (key) => {
      const value = await redisClient?.get(key);
      return value !== null;
    },
    set: async (key, value, expirationInSeconds, { serialize = JSON.stringify } = {}) => {
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
