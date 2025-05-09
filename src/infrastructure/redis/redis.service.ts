import { Inject, Injectable } from '@nestjs/common';
import { RedisClientType, createClient } from 'redis';
import { Logger } from 'winston';
import { AppConfigType } from '../config/config.app-config';
import { CONFIG } from '../config/config.module';
import { LOGGER_INJECTABLE_NAME } from './redis.config';

@Injectable()
export class RedisService {

  constructor(
    @Inject(CONFIG) private readonly appConfig: AppConfigType,
    @Inject(LOGGER_INJECTABLE_NAME) private readonly logger: Logger
  ) {
  }

  setupEventHandlers(client: RedisClientType) {
    client
      .on('connect', () => this.logger.debug('Cache database connected.'))
      .on('ready', () => this.logger.debug('Cache database ready.'))
      .on('error', error => this.logger.debug('Cache error: ', { error }))
      .on('reconnecting', () => this.logger.debug('Reconnect to cache database.'))
      .on('end', () => this.logger.debug('Cache database connection closed.'));
  }

  async connectClientIfNeed(client: RedisClientType) {
    try {
      if (!client.isOpen) {
        await client.connect();
      }
    } catch (error) {
      this.logger.error(`Cache connection error: ${error.message}`);
      throw error;
    }
  }
}
