import { Inject, Injectable } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { Logger } from 'winston';
import { AppConfigType } from '../config/config.app-config';
import { CONFIG } from '../config/config.module';
import { LOGGER_INJECTABLE_NAME } from './redis.config';

@Injectable()
export class RedisService {
  private client: RedisClientType;

  constructor(
    @Inject(CONFIG) private appConfig: AppConfigType,
    @Inject(LOGGER_INJECTABLE_NAME) private logger: Logger
  ) {
    this.client = createClient({
      url: this.appConfig.CACHE_DATABASE_URL,
      socket: {
        reconnectStrategy: attempts => {
          this.logger.warn(`Cache database reconnection attempt ${attempts}`);
          return 1000;
        },
      },
    });
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.client.on('error', err => this.logger.error(`Redis error: ${err}`));
    this.client.on('connect', () => this.logger.info('Redis connected'));
    this.client.on('reconnecting', () => this.logger.error('Redis reconnecting'));
  }

  public async connectIfNeed(): Promise<void> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
        this.logger.info('Redis client connected successfully');
      }
    } catch (error) {
      this.logger.error(`Cache connection error: ${error.message}`);
      throw error;
    }
  }

  public async get(key: string): Promise<string | null> {
    await this.connectIfNeed();
    return this.client.get(key);
  }

  public async exists(key: string): Promise<boolean> {
    await this.connectIfNeed();
    const result = await this.client.exists(key);
    return result === 1;
  }

  public async set(key: string, value: string, ttl?: number): Promise<void> {
    await this.connectIfNeed();
    if (ttl) {
      await this.client.setEx(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  public async delete(key: string): Promise<void> {
    await this.connectIfNeed();
    await this.client.del(key);
  }

  public async flushDb(): Promise<void> {
    await this.connectIfNeed();
    try {
      await this.client.flushDb();
      this.logger.info('Redis database cleared successfully');
    } catch (error) {
      this.logger.error(`Failed to clear Redis database: ${error.message}`);
      throw error;
    }
  }
}
