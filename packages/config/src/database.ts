import { getConfig } from './index';

export interface DatabaseConfig {
  url: string;
  poolMin: number;
  poolMax: number;
  ssl: boolean;
}

export function getDatabaseConfig(): DatabaseConfig {
  const config = getConfig();

  return {
    url: config.DATABASE_URL,
    poolMin: config.DATABASE_POOL_MIN,
    poolMax: config.DATABASE_POOL_MAX,
    ssl: config.DATABASE_SSL === 'true'
  };
}
