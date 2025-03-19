import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { createClient, RedisClientType } from 'redis';
import { Logger } from 'winston';
import { AppConfigType } from '../../config/config.app-config';
import { CONFIG } from '../../config/config.module';
import { LOGGER_INJECTABLE_NAME } from '../database.config';

const PRISMA_OBJECTS_CACHE_PREFIX = 'PRISMA_CACHE:OBJECT_BY_PARAMS:';
const PRISMA_OBJECTS_PARAMS_VARIANTS_BY_ID_PREFIX = 'PRISMA_CACHE:OBJECT_PARAMS_BY_ID:'; // For remove cache for object from any args
const NO_CACHE_VALUE = 'EMPTY';

const PrismaNotFoundException = new PrismaClientKnownRequestError('Not found', { code: 'P2025', clientVersion: '6.3.1' });

export type CacheConfig = {
  ttl?: number;
  nullResultTtl?: number;
};

@Injectable()
export class PrismaCacheExtensionService implements OnModuleInit {
  public readonly client: RedisClientType;

  private cacheErrors = 0;
  private cacheMisses = 0;
  private cacheHits = 0;
  private cacheReconnections = -1; // -1 for first connect

  constructor(
    @Inject(CONFIG) private readonly appConfig: AppConfigType,
    @Inject(LOGGER_INJECTABLE_NAME) private readonly logger: Logger
  ) {
    this.client = this.createRedisClient();
    this.setupEventHandlers();
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
      .on('connect', () => this.logger.debug('Cache database connected.'))
      .on('ready', () => this.logger.debug('Cache database ready.'))
      .on('error', error => this.logger.debug('Cache error: ', { error }))
      .on('reconnecting', () => this.logger.debug('Reconnect to cache database.'))
      .on('end', () => this.logger.debug('Cache database connection closed.'));
  }

  async onModuleInit() {
    await this.connectClientIfNeed();
  }

  public applyExtension(prisma: PrismaClient) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const serviceThis = this;

    const extension = Prisma.defineExtension({
      name: 'cacheExtension',
      model: {
        $allModels: {
          findFirstWithCache: async function <
            T,
            Args extends Prisma.Args<T, 'findFirst'>,
            Result = Prisma.Result<T, Args, 'findFirst'>,
          >(this: T, args: Args, cacheConfig?: CacheConfig): Promise<Result> {
            const context = Prisma.getExtensionContext(this) as any;
            const model = context.$name;

            const cacheKey = serviceThis.buildObjectCacheKey(model, { args, cacheConfig });
            const cachedResult = await serviceThis.getCachedData<Result>(cacheKey);

            if (cachedResult == NO_CACHE_VALUE) return null;
            if (cachedResult) return cachedResult;

            const result = await context.findFirst(args);

            await serviceThis.saveResultInCache(model, cacheKey, result, cacheConfig);

            return result;
          },

          findFirstOrThrowWithCache: async function <
            T,
            Args extends Prisma.Args<T, 'findFirstOrThrow'>,
            Result = Prisma.Result<T, Args, 'findFirstOrThrow'>,
          >(this: T, args: Args, cacheConfig?: CacheConfig): Promise<Result> {
            const context = Prisma.getExtensionContext(this) as any;
            const model = context.$name;

            const cacheKey = serviceThis.buildObjectCacheKey(model, { args, cacheConfig });
            const cachedResult = await serviceThis.getCachedData<Result>(cacheKey);

            if (cachedResult == NO_CACHE_VALUE) throw PrismaNotFoundException;
            if (cachedResult) return cachedResult;

            try {
              const result = await context.findFirstOrThrow(args);

              await serviceThis.saveResultInCache(model, cacheKey, result);

              return result;
            } catch (error) {
              if (error instanceof PrismaClientKnownRequestError && error.code == 'P2025') {
                await serviceThis.saveResultInCache(model, cacheKey, null);
              }
              throw error;
            }
          },

          findUniqueWithCache: async function <
            T,
            Args extends Prisma.Args<T, 'findUnique'>,
            Result = Prisma.Result<T, Args, 'findUnique'>,
          >(this: T, args: Args, cacheConfig?: CacheConfig): Promise<Result> {
            const context = Prisma.getExtensionContext(this) as any;
            const model = context.$name;

            const cacheKey = serviceThis.buildObjectCacheKey(model, { args, cacheConfig });
            const cachedResult = await serviceThis.getCachedData<Result>(cacheKey);

            if (cachedResult == NO_CACHE_VALUE) return null;
            if (cachedResult) return cachedResult;

            const result = await context.findUnique(args);

            await serviceThis.saveResultInCache(model, cacheKey, result);

            return result;
          },

          findUniqueOrThrowWithCache: async function <
            T,
            Args extends Prisma.Args<T, 'findUniqueOrThrow'>,
            Result = Prisma.Result<T, Args, 'findUniqueOrThrow'>,
          >(this: T, args: Args, cacheConfig?: CacheConfig): Promise<Result> {
            const context = Prisma.getExtensionContext(this) as any;
            const model = context.$name;

            const cacheKey = serviceThis.buildObjectCacheKey(model, { args, cacheConfig });
            const cachedResult = await serviceThis.getCachedData<Result>(cacheKey);

            if (cachedResult == NO_CACHE_VALUE) throw PrismaNotFoundException;
            if (cachedResult) return cachedResult;

            try {
              const result = await context.findUniqueOrThrow(args);

              await serviceThis.saveResultInCache(model, cacheKey, result);

              return result;
            } catch (error) {
              if (error instanceof PrismaClientKnownRequestError && error.code == 'P2025') {
                await serviceThis.saveResultInCache(model, cacheKey, null);
              }
              throw error;
            }
          },

          updateWithCacheInvalidate: async function <
            T,
            Args extends Prisma.Args<T, 'update'>,
            Result = Prisma.Result<T, Args, 'update'>,
          >(this: T, args: Args, cacheConfig?: CacheConfig): Promise<Result> {
            const context = Prisma.getExtensionContext(this) as any;
            const model = context.$name;

            const result = await context.update(args);

            if (result?.id) {
              await serviceThis.invalidateCache(model, result.id);
            }

            return result;
          },

          upsertWithCacheInvalidate: async function <
            T,
            Args extends Prisma.Args<T, 'upsert'>,
            Result = Prisma.Result<T, Args, 'upsert'>,
          >(this: T, args: Args, cacheConfig?: CacheConfig): Promise<Result> {
            const context = Prisma.getExtensionContext(this) as any;
            const model = context.$name;

            const result = await context.upsert(args);

            if (result?.id) {
              await serviceThis.invalidateCache(model, result.id);
            }
            return result;
          },

          deleteWithCacheInvalidate: async function <
            T,
            Args extends Prisma.Args<T, 'delete'>,
            Result = Prisma.Result<T, Args, 'delete'>,
          >(this: T, args: Args, cacheConfig?: CacheConfig): Promise<Result> {
            const context = Prisma.getExtensionContext(this) as any;
            const model = context.$name;

            const result = await context.delete(args);

            if (result?.id) {
              await serviceThis.invalidateCache(model, result.id);
            }
            return result;
          },

          existsWithCache: async function <T, Args extends Prisma.Args<T, 'findFirst'>['where']>(
            this: T,
            args: Args,
            cacheConfig?: CacheConfig
          ): Promise<boolean> {
            const context = Prisma.getExtensionContext(this) as any;
            const model = context.$name;

            const cacheKey = serviceThis.buildObjectCacheKey(model, { args, cacheConfig });
            const cachedResult = await serviceThis.getCachedData(cacheKey);

            if (cachedResult) return true;

            const result = await context.findFirstWithCache({where: args});

            return !!result;
          },

          invalidateCache: async function <T>(this: T, objectIds: string | string[]): Promise<void> {
            const context = Prisma.getExtensionContext(this) as any;
            const model = context.$name;

            await serviceThis.invalidateCache(model, objectIds);
          },
        },
      },
    });

    return prisma.$extends(extension);
  }

  async invalidateCache(model: string, objectIds: string | string[]) {
    try {
      objectIds = Array.isArray(objectIds) ? objectIds : [objectIds];
      const keysToRemove: string[] = [];

      const promisesForEveryObject = objectIds.map(async id => {
        const indexKey = this.buildIndexCacheKey(model, id);
        const cacheKeys = await this.client.sMembers(indexKey);

        return [...cacheKeys, indexKey];
      });

      const results = await Promise.all(promisesForEveryObject);

      for (const keys of results) {
        keysToRemove.push(...keys);
      }

      if (keysToRemove.length > 0) {
        await this.client.del(keysToRemove);
      }
    } catch (error) {
      this.logger.error('Cache invalidation error:', error);
    }
  }

  private async getCachedData<T = any>(cacheKey: string): Promise<T | null> {
    await this.connectClientIfNeed();

    try {
      const cachedData = await this.client.get(cacheKey);
      if (cachedData) {
        this.cacheHits += 1;

        return JSON.parse(cachedData);
      }

      this.cacheMisses += 1;

      return null;
    } catch (error) {
      this.cacheErrors += 1;
      this.logger.error('Cache read error:', error);
      return null;
    }
  }

  private async saveResultInCache(model: string, cacheKey: string, result: any, cacheConfig?: CacheConfig) {
    await this.connectClientIfNeed();

    try {
      const ttl = cacheConfig?.ttl || this.appConfig.CACHE_SPECIFIC_TTL[model] || this.appConfig.CACHE_DEFAULT_TTL;

      if (result === null) {
        await this.client.setEx(
          cacheKey,
          cacheConfig?.nullResultTtl || this.appConfig.CACHE_NULL_RESULT_TTL,
          JSON.stringify(NO_CACHE_VALUE)
        );
        return;
      }

      const indexKey = this.buildIndexCacheKey(model, result.id);

      const multi = this.client
        .multi()
        .setEx(cacheKey, ttl, JSON.stringify(result))
        .sAdd(indexKey, cacheKey)
        .expire(indexKey, ttl);

      await multi.exec();
    } catch (error) {
      this.logger.error('Save cache error:', { error });
      throw error;
    }
  }

  private async connectClientIfNeed() {
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

  buildObjectCacheKey(model: string, params: any): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => ({ ...acc, [key]: params[key] }), {});

    return `${PRISMA_OBJECTS_CACHE_PREFIX}${model}:${JSON.stringify(sortedParams)}`;
  }

  buildIndexCacheKey(model: string, recordId: string): string {
    return `${PRISMA_OBJECTS_PARAMS_VARIANTS_BY_ID_PREFIX}${model}:${recordId}`;
  }

  get cacheStatistics() {
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      errors: this.cacheErrors,
      reconnections: this.cacheReconnections,
      hitsRatio: (((this.cacheHits / (this.cacheHits + this.cacheMisses + this.cacheErrors)) * 100) || 0).toFixed(1),
    };
  }
}
