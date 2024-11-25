import { AppConfig, AppConfigType, NodeEnv } from './../config/config.app-config';
import winston, { createLogger } from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';

import { Inject, Injectable } from '@nestjs/common';
import { baseLogFormat, baseTransports } from './logging.config';
import { LOGGER } from './logging.module';
import { CONFIG } from '../config/config.module';
import * as Transport from 'winston-transport';


@Injectable()
export class LoggingService {
  private readonly BASE_CONFIG: winston.LoggerOptions;

  constructor(
    @Inject(CONFIG) private readonly appConfig: AppConfigType,
  ) {
    this.BASE_CONFIG = this.buildConfig()
  }

  public createLogger(options?: winston.LoggerOptions) {
    options = options ?? this.BASE_CONFIG

    return createLogger(options)
  }

  private buildConfig(): winston.LoggerOptions {
    let transports = baseTransports;

    transports.concat(this.appendNotLocalTransportsIfNeed())

    return {
      level: 'info',
      format: baseLogFormat,
      transports: baseTransports,
    };
  }

  private appendNotLocalTransportsIfNeed(): Transport[] {
    if (this.appConfig.NODE_ENV != NodeEnv.local) {
      return []
    }

    return [
      new ElasticsearchTransport({
        clientOpts: {
          node: AppConfig.ELASTICSEARCH_HOST,
          auth: {
            username: AppConfig.ELASTIC_USERNAME,
            password: AppConfig.ELASTIC_PASSWORD,
          }
        },
        indexPrefix: 'backend-logs',
      })
    ]
  }

  public static buildInjectableNameByContext = (context: string) => LOGGER + "__" + context;
}
