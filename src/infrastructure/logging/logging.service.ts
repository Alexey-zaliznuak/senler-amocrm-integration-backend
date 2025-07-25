import winston, { createLogger } from 'winston';
import { AppConfigType } from './../config/config.app-config';

import { Inject, Injectable } from '@nestjs/common';
import { CONFIG } from '../config/config.module';
import { baseLogFormat, baseTransports, LOGGER } from './logging.config';

@Injectable()
export class LoggingService {
  private readonly BASE_CONFIG: winston.LoggerOptions;

  constructor(@Inject(CONFIG) private readonly config: AppConfigType) {
    this.BASE_CONFIG = this.buildConfig();
  }

  public createLogger(options?: winston.LoggerOptions) {
    options = Object.assign(this.BASE_CONFIG, options);

    return createLogger(options);
  }

  private buildConfig(): winston.LoggerOptions {
    return {
      level: 'info',
      format: baseLogFormat,
      transports: baseTransports(this.config),
    };
  }

  public static buildInjectableNameByContext = (context: string) => LOGGER + '__' + context;
}
