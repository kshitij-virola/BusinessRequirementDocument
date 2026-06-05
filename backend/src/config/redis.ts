import IORedis from 'ioredis'
import { env } from './env'
import { logger } from '../utils/logger'

let redis: IORedis | null = null

export const getRedisClient = (): IORedis => {
  if (!redis) {
    redis = new IORedis(env.redisUrl, { lazyConnect: true })
    redis.on('connect', () => logger.info('Redis connected'))
    redis.on('error', (err) => logger.error('Redis error:', err))
  }
  return redis
}

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const val = await getRedisClient().get(key)
      return val ? (JSON.parse(val) as T) : null
    } catch {
      return null
    }
  },

  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    try {
      await getRedisClient().set(key, JSON.stringify(value), 'EX', ttlSeconds)
    } catch {
      // cache miss is non-fatal
    }
  },

  async del(key: string): Promise<void> {
    try {
      await getRedisClient().del(key)
    } catch {
      // ignore
    }
  },
}
