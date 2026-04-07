import pino from 'pino';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface ILogger {
  debug(message: string, metadata?: Record<string, any>): void;
  info(message: string, metadata?: Record<string, any>): void;
  warn(message: string, metadata?: Record<string, any>): void;
  error(message: string, error?: Error, metadata?: Record<string, any>): void;
  child(bindings: Record<string, any>): ILogger;
}

export class Logger implements ILogger {
  private logger: pino.Logger;

  constructor(name: string = 'app', level: LogLevel = 'info') {
    this.logger = pino(
      {
        name,
        level,
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname'
          }
        }
      }
    );
  }

  debug(message: string, metadata?: Record<string, any>): void {
    this.logger.debug(metadata, message);
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.logger.info(metadata, message);
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.logger.warn(metadata, message);
  }

  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    const errorData = error ? { error: error.message, stack: error.stack } : {};
    this.logger.error({ ...errorData, ...metadata }, message);
  }

  child(bindings: Record<string, any>): ILogger {
    return new PinoLoggerChild(this.logger.child(bindings));
  }
}

class PinoLoggerChild implements ILogger {
  constructor(private logger: pino.Logger) {}

  debug(message: string, metadata?: Record<string, any>): void {
    this.logger.debug(metadata, message);
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.logger.info(metadata, message);
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.logger.warn(metadata, message);
  }

  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    const errorData = error ? { error: error.message, stack: error.stack } : {};
    this.logger.error({ ...errorData, ...metadata }, message);
  }

  child(bindings: Record<string, any>): ILogger {
    return new PinoLoggerChild(this.logger.child(bindings));
  }
}

export const createLogger = (name: string, level: LogLevel = 'info'): ILogger => {
  return new Logger(name, level);
};
