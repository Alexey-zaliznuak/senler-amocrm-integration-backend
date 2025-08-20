import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { Logger } from 'winston';
import { AppConfigType } from '../config/config.app-config';
import { CONFIG } from '../config/config.module';
import { LOGGER_INJECTABLE_NAME } from './redis.config';
import { GET_SLIDING_WINDOW_RATE_LUA_SCRIPT } from './scripts/get-window-rate';
import { INCREMENT_SLIDING_WINDOW_RATE_LUA_SCRIPT } from './scripts/increment_sliding_window';

let incrementSlidingWindowScriptHash: string | null = null;
let getSlidingWindowRateScriptHash: string | null = null;

async function ensureIncrementSlicingWindowScript(client: any) {
  if (!incrementSlidingWindowScriptHash) {
    incrementSlidingWindowScriptHash = await client.scriptLoad(INCREMENT_SLIDING_WINDOW_RATE_LUA_SCRIPT);
  }
}
async function ensureGetSlicingWindowScript(client: any) {
  if (!getSlidingWindowRateScriptHash) getSlidingWindowRateScriptHash = await client.scriptLoad(GET_SLIDING_WINDOW_RATE_LUA_SCRIPT);
}

@Injectable()
export class RedisService implements OnModuleInit {
  private client: RedisClientType;

  constructor(
    @Inject(CONFIG) private config: AppConfigType,
    @Inject(LOGGER_INJECTABLE_NAME) private logger: Logger
  ) {
    this.client = createClient({
      url: this.config.CACHE_DATABASE_URL,
      socket: {
        reconnectStrategy: attempts => {
          this.logger.warn(`Cache database reconnection attempt ${attempts}`);
          return 1000;
        },
      },
    });
    this.setupEventHandlers();
  }

  async onModuleInit() {
    await this.connectIfNeed();
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

  public async incrementSlidingWindowRate(
    keyBase: string, // напр. `cache:{userid1234}`
    maxRate: number,
    windowSeconds = 1,
    increment = 1
  ): Promise<{ rate: number; allowed: boolean }> {
    const zsetKey = `${keyBase}`;
    const seqKey = `${keyBase}:seq`;

    const windowMs = Math.max(1, Math.floor(windowSeconds * 1000));
    const inc = Math.max(1, Math.floor(increment));

    await ensureIncrementSlicingWindowScript(this.client);

    try {
      const res = await this.client.evalSha(incrementSlidingWindowScriptHash!, {
        keys: [zsetKey, seqKey],
        arguments: [String(windowMs), String(maxRate), String(inc)],
      });

      const allowed = res[0] === 1;
      const rate = Number(res[1]);

      return { rate, allowed };
    } catch (e: any) {
      if (e?.message?.includes('NOSCRIPT')) {
        incrementSlidingWindowScriptHash = await this.client.scriptLoad(INCREMENT_SLIDING_WINDOW_RATE_LUA_SCRIPT);

        const res = await this.client.evalSha(incrementSlidingWindowScriptHash!, {
          keys: [zsetKey, seqKey],
          arguments: [String(windowMs), String(maxRate), String(inc)],
        });

        const allowed = res[0] === 1;
        const rate = Number(res[1]);

        return { rate, allowed };
      }
      throw e;
    }
  }

  // public async incrementSlidingWindowRateOld(
  //   key: string,
  //   maxRate: number,
  //   windowSeconds: number,
  //   increment: number = 1
  // ): Promise<{ rate: number; allowed: boolean }> {
  //   await this.connectIfNeed();

  //   const now = Date.now();

  //   const currentRate = await this.getSlidingWindowRate(key, windowSeconds);

  //   if (currentRate + increment <= maxRate) {
  //     await this.client.zAdd(key, { score: now, value: now.toString() });
  //     await this.client.expire(key, windowSeconds + 1);
  //     return { rate: currentRate + increment, allowed: true };
  //   }

  //   return { rate: currentRate, allowed: false };
  // }

  // public async getSlidingWindowRate(key: string, windowSeconds: number) {
  //   await this.connectIfNeed();
  //   const multi = this.client.multi();
  //   const windowStart = Date.now() - windowSeconds * 1000;

  //   multi.zRemRangeByScore(key, '-inf', windowStart);
  //   multi.zCard(key);

  //   const [_, currentRate] = (await multi.exec()) as [unknown, number];
  //   return currentRate;
  // }

  public async getSlidingWindowRateAtomic(
    keyBase: string, // напр. `rl:{user:123}`
    windowSeconds: number
  ): Promise<number> {
    const zsetKey = `${keyBase}`;
    const windowMs = Math.max(1, Math.floor(windowSeconds * 1000));

    await ensureGetSlicingWindowScript(this.client);

    try {
      const res = await this.client.evalSha(getSlidingWindowRateScriptHash!, { keys: [zsetKey], arguments: [String(windowMs)] });
      return Number(res[0]); // count
    } catch (e: any) {
      if (e?.message?.includes('NOSCRIPT')) {
        getSlidingWindowRateScriptHash = await this.client.scriptLoad(GET_SLIDING_WINDOW_RATE_LUA_SCRIPT);
        const res = await this.client.evalSha(getSlidingWindowRateScriptHash!, { keys: [zsetKey], arguments: [String(windowMs)] });
        return Number(res[0]);
      }
      throw e;
    }
  }

  private setupEventHandlers() {
    this.client.on('error', err => this.logger.error(`Redis error: ${err}`));
    this.client.on('connect', () => this.logger.info('Redis connected'));
    this.client.on('reconnecting', () => this.logger.error('Redis reconnecting'));
  }
}
