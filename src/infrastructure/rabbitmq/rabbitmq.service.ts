import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';
import { convertExceptionToString } from 'src/utils';
import { Logger } from 'winston';
import { AppConfigType } from '../config/config.app-config';
import { CONFIG } from '../config/config.module';
import { LOGGER_INJECTABLE_NAME } from './rabbitmq.config';

const RECONNECT_DELAY_MS = 1000;

@Injectable()
export class RabbitMqService implements OnModuleInit, OnModuleDestroy {
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private connecting: Promise<void> | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isShuttingDown = false;

  constructor(
    @Inject(CONFIG) private readonly config: AppConfigType,
    @Inject(LOGGER_INJECTABLE_NAME) private readonly logger: Logger
  ) {}

  async onModuleInit() {
    await this.connect();
  }

  async publishMessage(exchange: string, routingKey: string, payload: any, delay: number = 0) {
    const message = Buffer.from(JSON.stringify(payload));
    const headers = delay ? { 'x-delay': delay } : undefined;

    try {
      await this.publishToChannel(exchange, routingKey, message, headers);
    } catch (error) {
      this.logger.warn('RabbitMq publish failed, reconnecting: ' + convertExceptionToString(error));

      this.dropConnection();
      await this.connect();
      await this.publishToChannel(exchange, routingKey, message, headers);
    }

    this.logger.debug(`Message published to ${exchange} with routingKey ${routingKey}`, { headers });
  }

  async onModuleDestroy() {
    this.isShuttingDown = true;
    this.clearReconnectTimer();

    try {
      await this.channel?.close();
      await this.connection?.close();
      this.logger.info('RabbitMq connection closed');
    } catch (error) {
      this.logger.warn('RabbitMq failed to close connection: ' + convertExceptionToString(error));
    } finally {
      this.channel = null;
      this.connection = null;
    }
  }

  private async publishToChannel(exchange: string, routingKey: string, message: Buffer, headers?: Record<string, unknown>) {
    if (!this.channel) {
      await this.connect();
    }

    if (!this.channel) {
      throw new Error('RabbitMq channel is not available');
    }

    const accepted = this.channel.publish(exchange, routingKey, message, { headers });

    if (!accepted) {
      this.logger.warn(`RabbitMq write buffer is full, message to ${exchange} is queued in memory`);
    }
  }

  private async connect(): Promise<void> {
    if (this.isShuttingDown || this.channel) return;
    if (this.connecting) return this.connecting;

    this.connecting = this.createChannel().finally(() => {
      this.connecting = null;
    });

    return this.connecting;
  }

  private async createChannel(): Promise<void> {
    try {
      const connection = await amqp.connect(this.config.RABBITMQ_URL);
      const channel = await connection.createChannel();

      // Без слушателей 'error' amqplib выбрасывает необработанное исключение и роняет процесс
      connection.on('error', error => this.handleFailure('connection error', error));
      connection.on('close', () => this.handleFailure('connection closed'));
      channel.on('error', error => this.handleFailure('channel error', error));
      channel.on('close', () => this.handleFailure('channel closed'));

      this.connection = connection;
      this.channel = channel;

      this.logger.info('RabbitMq connection and channel created');
    } catch (error) {
      this.logger.error('RabbitMq failed to connect: ' + convertExceptionToString(error));
      this.scheduleReconnect();
    }
  }

  private handleFailure(reason: string, error?: unknown) {
    if (this.isShuttingDown) return;

    this.logger.error(`RabbitMq ${reason}` + (error ? ': ' + convertExceptionToString(error) : ''));
    this.dropConnection();
    this.scheduleReconnect();
  }

  private dropConnection() {
    const { channel, connection } = this;

    channel?.removeAllListeners();
    connection?.removeAllListeners();
    this.channel = null;
    this.connection = null;

    // Канал мог умереть при живом соединении - закрываем его, чтобы не оставлять висящий сокет
    connection?.close().catch(() => undefined);
  }

  private scheduleReconnect() {
    if (this.isShuttingDown || this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, RECONNECT_DELAY_MS);
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
