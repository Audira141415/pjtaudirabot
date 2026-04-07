import { getConfig } from './index';

export interface RedisConfig {
  url: string;
  password?: string;
  db: number;
  cacheTtl: number;
}

export function getRedisConfig(): RedisConfig {
  const config = getConfig();

  return {
    url: config.REDIS_URL,
    password: config.REDIS_PASSWORD,
    db: config.REDIS_DB,
    cacheTtl: config.REDIS_CACHE_TTL
  };
}
