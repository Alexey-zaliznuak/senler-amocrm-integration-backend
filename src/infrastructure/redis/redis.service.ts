import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { Logger } from 'winston';
import { AppConfigType } from '../config/config.app-config';
import { CONFIG } from '../config/config.module';
import { LOGGER_INJECTABLE_NAME } from './redis.config';
import { CREATE_SET_LUA_SCRIPT } from './scripts/create-set';
import { GET_SLIDING_WINDOW_RATE_LUA_SCRIPT } from './scripts/get-window-rate';
import { INCREMENT_SLIDING_WINDOW_RATE_LUA_SCRIPT } from './scripts/increment_sliding_window';

@Injectable()
export class RedisService implements OnModuleInit {
  private client: RedisClientType;

  incrementSlidingWindowScriptHash: string | null = null;
  getSlidingWindowRateScriptHash: string | null = null;
  createSetScriptHash: string | null = null;

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

  public async getSetInfo(key: string): Promise<{ exists: boolean; length: number }> {
    await this.connectIfNeed();

    const [existsNum, length] = (await this.client
      .multi()
      .exists(key) // 1 если есть, 0 если нет
      .sCard(key) // размер множества (0 если ключа нет или тип не set)
      .exec()) as [number, number];

    const exists = existsNum === 1;

    // Если ключ существует, но это не множество — S CARD вернёт ошибку, но в node-redis при multi мы её увидим как исключение.
    // Если сюда дошли — значит тип корректный или ключа нет.
    return { exists, length: exists ? length : 0 };
  }

  /**
   * Получить все элементы множества.
   * @param key ключ множества
   * @returns массив элементов (пустой если ключа нет или множество пустое)
   */
  public async getSetMembers(key: string): Promise<string[]> {
    await this.connectIfNeed();
    try {
      const members = await this.client.sMembers(key);
      return members;
    } catch (error: any) {
      this.logger.error(`Не удалось получить элементы множества "${key}": ${error.message}`);
      throw error;
    }
  }

  /**
   * Создать множество (с TTL), если его ещё нет. Атомарно через EVALSHA.
   */
  public async createSetIfNotExists(key: string, members: string[], ttlSeconds?: number): Promise<boolean> {
    await this.connectIfNeed();

    if (!members || members.length === 0) {
      throw new Error('Для создания множества нужен хотя бы один элемент (members).');
    }

    // гарантируем загрузку
    await this.ensureCreateSetScript();

    const ttlArg = (ttlSeconds ?? 0).toString();
    const args = [ttlArg, ...members];

    // пробуем вызвать по SHA; если Redis перезагрузился и забыл скрипт — перезагрузим и повторим один раз
    try {
      const result = await this.client.evalSha(this.createSetScriptHash, {
        keys: [key],
        arguments: args,
      });
      if (result === 1) {
        this.logger.info(`Создано множество "${key}" (элементов: ${members.length}, ttl=${ttlSeconds ?? 0})`);
        return true;
      }
      return false;
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (msg.includes('NOSCRIPT')) {
        // Redis потерял скрипт — загрузим снова и повторим
        this.logger.warn('NOSCRIPT: перезагружаю Lua-скрипт и повторяю вызов EVALSHA');
        this.createSetScriptHash = await this.client.scriptLoad(CREATE_SET_LUA_SCRIPT);
        const result = await this.client.evalSha(this.createSetScriptHash, {
          keys: [key],
          arguments: args,
        });
        if (result === 1) {
          this.logger.info(`Создано множество "${key}" (элементов: ${members.length}, ttl=${ttlSeconds ?? 0})`);
          return true;
        }
        return false;
      }
      this.logger.error(`EVALSHA error: ${msg}`);
      throw err;
    }
  }

  /**
   * Добавить элемент в множество.
   * @returns true если элемент был добавлен (его не было), false если уже существовал.
   */
  public async addToSet(key: string, member: string): Promise<boolean> {
    await this.connectIfNeed();
    const added = await this.client.sAdd(key, member); // 1 если добавлен, 0 если уже был
    return added === 1;
  }

  /**
   * Удалить множество.
   * По умолчанию аккуратно проверяем тип, чтобы случайно не удалить другой тип ключа.
   * @returns true если множество было удалено; false если его не было.
   */
  public async deleteSet(key: string, ensureType: boolean = true): Promise<boolean> {
    await this.connectIfNeed();

    if (ensureType) {
      const type = await this.client.type(key);
      if (type === 'none') return false;
      if (type !== 'set') {
        throw new Error(`Ключ "${key}" существует, но имеет тип "${type}", а не "set". Удаление прервано.`);
      }
    }

    const deleted = await this.client.del(key); // 1 если удалён, 0 если не существовал
    if (deleted === 1) {
      this.logger.info(`Множество "${key}" удалено`);
      return true;
    }
    return false;
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

    await this.ensureIncrementSlicingWindowScript();

    try {
      const res = await this.client.evalSha(this.incrementSlidingWindowScriptHash!, {
        keys: [zsetKey, seqKey],
        arguments: [String(windowMs), String(maxRate), String(inc)],
      });

      const allowed = res[0] === 1;
      const rate = Number(res[1]);

      return { rate, allowed };
    } catch (e: any) {
      if (e?.message?.includes('NOSCRIPT')) {
        this.incrementSlidingWindowScriptHash = await this.client.scriptLoad(INCREMENT_SLIDING_WINDOW_RATE_LUA_SCRIPT);

        const res = await this.client.evalSha(this.incrementSlidingWindowScriptHash!, {
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

  public async getSlidingWindowRateAtomic(
    keyBase: string, // напр. `rl:{user:123}`
    windowSeconds: number
  ): Promise<number> {
    const zsetKey = `${keyBase}`;
    const windowMs = Math.max(1, Math.floor(windowSeconds * 1000));

    await this.ensureGetSlicingWindowScript();

    try {
      const res = await this.client.evalSha(this.getSlidingWindowRateScriptHash!, {
        keys: [zsetKey],
        arguments: [String(windowMs)],
      });
      return Number(res[0]); // count
    } catch (e: any) {
      if (e?.message?.includes('NOSCRIPT')) {
        this.getSlidingWindowRateScriptHash = await this.client.scriptLoad(GET_SLIDING_WINDOW_RATE_LUA_SCRIPT);
        const res = await this.client.evalSha(this.getSlidingWindowRateScriptHash!, {
          keys: [zsetKey],
          arguments: [String(windowMs)],
        });
        return Number(res[0]);
      }
      throw e;
    }
  }

  public async ensureIncrementSlicingWindowScript() {
    if (!this.incrementSlidingWindowScriptHash) {
      this.incrementSlidingWindowScriptHash = await this.client.scriptLoad(INCREMENT_SLIDING_WINDOW_RATE_LUA_SCRIPT);
    }
  }
  public async ensureGetSlicingWindowScript() {
    if (!this.getSlidingWindowRateScriptHash)
      this.getSlidingWindowRateScriptHash = await this.client.scriptLoad(GET_SLIDING_WINDOW_RATE_LUA_SCRIPT);
  }

  public async ensureCreateSetScript() {
    if (!this.createSetScriptHash) this.createSetScriptHash = await this.client.scriptLoad(CREATE_SET_LUA_SCRIPT);
  }

  private setupEventHandlers() {
    this.client.on('error', err => this.logger.error(`Redis error: ${err}`));
    this.client.on('connect', () => this.logger.info('Redis connected'));
    this.client.on('reconnecting', () => this.logger.error('Redis reconnecting'));
  }
}
