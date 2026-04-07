import { getConfig } from './index';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LoggingConfig {
  level: LogLevel;
  dir: string;
  fileMaxSize: string;
  filesMax: number;
  sentryDsn?: string;
}

export function getLoggingConfig(): LoggingConfig {
  const config = getConfig();

  return {
    level: config.LOG_LEVEL,
    dir: config.LOG_DIR,
    fileMaxSize: config.LOG_FILE_MAX_SIZE,
    filesMax: config.LOG_FILES_MAX,
    sentryDsn: config.SENTRY_DSN
  };
}
