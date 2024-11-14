import winston, { createLogger } from 'winston';
import { Injectable } from '@nestjs/common';
import { DEFAULT_LOGGING_OPTIONS } from './logging.config';
import { LOGGER } from './logging.module';

@Injectable()
export class LoggingService {
  public static createLogger(options?: winston.LoggerOptions) {
    options = options ?? DEFAULT_LOGGING_OPTIONS

    return createLogger(options)
  }

  public static buildInjectableNameByContext = (context: string) => LOGGER + "__" + context;
}
