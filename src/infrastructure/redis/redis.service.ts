import { Inject, Injectable, Logger } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { CONFIG } from '../config/config.module';
import { LOGGER_INJECTABLE_NAME } from './redis.config';
import { AppConfigType } from '../config/config.app-config';

@Injectable()
export class RedisService {
  private client: RedisClientType;

  constructor(
    @Inject(CONFIG) private appConfig: AppConfigType,
    @Inject(LOGGER_INJECTABLE_NAME) private logger: Logger,
  ) {
    this.client = createClient({
      url: this.appConfig.CACHE_DATABASE_URL,
      socket: {
        reconnectStrategy: attempts => {
          this.logger.warn(`Prisma cache database reconnection attempt ${attempts}`);
          return Math.min(100);
        },
      },
    });
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.client.on('error', (err) => this.logger.error(`Redis error: ${err}`));
    this.client.on('connect', () => this.logger.log('Redis connected'));
    this.client.on('reconnecting', () => this.logger.log('Redis reconnecting'));
  }

  public async connectIfNeed(): Promise<void> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
        this.logger.log('Redis client connected successfully');
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
}