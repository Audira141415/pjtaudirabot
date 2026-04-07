import { getConfig } from './index';

export interface ServerConfig {
  host: string;
  port: number;
  url?: string;
  env: 'development' | 'production' | 'test';
  appName: string;
  appVersion: string;
}

export interface PortConfig {
  api: number;
  telegram: number;
  whatsapp: number;
  dashboard: number;
  rangeStart: number;
  rangeEnd: number;
}

export function getServerConfig(): ServerConfig {
  const config = getConfig();

  return {
    host: config.SERVER_HOST,
    port: config.SERVER_PORT,
    url: config.SERVER_URL,
    env: config.NODE_ENV,
    appName: config.APP_NAME,
    appVersion: config.APP_VERSION
  };
}

export function getPortConfig(): PortConfig {
  const config = getConfig();

  return {
    api: config.API_PORT,
    telegram: config.TELEGRAM_PORT,
    whatsapp: config.WHATSAPP_PORT,
    dashboard: config.DASHBOARD_PORT,
    rangeStart: config.BOT_PORT_RANGE_START,
    rangeEnd: config.BOT_PORT_RANGE_END,
  };
}
