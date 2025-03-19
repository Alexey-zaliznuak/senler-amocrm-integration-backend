import { Inject, Injectable, Optional } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { Logger } from 'winston';
import { AppConfigType } from '../config/config.app-config';
import { CONFIG } from '../config/config.module';
import { LOGGER_INJECTABLE_NAME } from '../database/database.config';
import { CACHE } from './cache.config';

@Injectable()
export class CustomCacheClient {
  public readonly client: RedisClientType;
  public readonly context: string;

  private cacheErrors = 0;
  private cacheMisses = 0;
  private cacheHits = 0;
  private cacheReconnections = -1; // -1 for first connect

  constructor(
    @Inject(CONFIG) private readonly appConfig: AppConfigType,
    @Inject(LOGGER_INJECTABLE_NAME) private readonly logger: Logger,
    @Optional() context: string
  ) {
    this.context = context;
    this.client = this.createRedisClient();
    this.setupEventHandlers();
  }

  async get(key: string) {
    key = this.buildKeyForContext(key);
    return await this.client.get(key);
  }

  async set(key: string, value: any, config: { ttl?: number }) {
    key = this.buildKeyForContext(key);
    return await this.client.set(key, value, { EX: config.ttl });
  }

  public buildKeyForContext(key: string): string {
    return [CACHE, this.context, key].join(':');
  }

  /**
   * Return decorator for cache methods values.
  */
  public cacheable(ttl: number): MethodDecorator {
    const cacheClientInstance = this;

    return function (
      target: any,
      methodName: string | symbol,
      descriptor: PropertyDescriptor
    ) {
      const originalMethod = descriptor.value;
      const className = target.constructor.name;

      descriptor.value = async function (...args: any[]) {
        const cacheKey = [
          className,
          methodName.toString(),
          JSON.stringify(args)
        ].join(':');

        try {
          await cacheClientInstance.connectClientIfNeed();

          const cachedValue = await cacheClientInstance.get(cacheKey);
          if (cachedValue !== null) {
            return JSON.parse(cachedValue);
          }
        } catch (error) {
          cacheClientInstance.logger.error('Cache read error:', error);
        }

        const result = await originalMethod.apply(this, args);

        try {
          await cacheClientInstance.set(
            cacheKey,
            JSON.stringify(result),
            { ttl }
          );
        } catch (error) {
          cacheClientInstance.logger.error('Cache write error:', error);
        }

        return result;
      };

      return descriptor;
    };
  }

  private createRedisClient(): RedisClientType {
    return createClient({
      url: this.appConfig.CACHE_DATABASE_URL,
      socket: {
        reconnectStrategy: attempts => {
          this.logger.warn(`Cache database reconnection attempt ${attempts}`);
          return Math.min(attempts * 100, 1000);
        },
      },
    });
  }

  private setupEventHandlers() {
    this.client
      .on('connect', () => this.logger.debug('Cache[] connected'))
      .on('ready', () => this.logger.debug('Cache[] database ready'))
      .on('error', error => this.logger.debug('Cache[] error: ', { error }))
      .on('reconnecting', () => this.logger.debug('Reconnect to cache[]'))
      .on('end', () => this.logger.debug('Cache[] database connection close.'));
  }

  public async connectClientIfNeed() {
    try {
      if (!this.client.isOpen) {
        this.cacheReconnections += 1;
        await this.client.connect();
      }
    } catch (error) {
      this.logger.error(`Cache connection error: ${error.message}`);
      throw error;
    }
  }

  async onModuleInit() {
    await this.connectClientIfNeed();
  }
}
