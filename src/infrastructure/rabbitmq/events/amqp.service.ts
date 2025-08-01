import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';
import { AppConfigType } from 'src/infrastructure/config/config.app-config';
import { CONFIG } from 'src/infrastructure/config/config.module';
import { convertExceptionToString } from 'src/utils';
import { Logger } from 'winston';
import { LOGGER_INJECTABLE_NAME } from '../rabbitmq.config';

/**
 * Use in event handler: handleMessage(msg: AmqpSerializedMessage, channel: amqp.Channel)
 */
export interface AmqpSerializedMessage<C = any> extends Omit<amqp.ConsumeMessage, 'content'> {
  content: C;
}

@Injectable()
export class AmqpService implements OnModuleInit, OnModuleDestroy {
  private connection: amqp.ChannelModel;
  private channel: amqp.Channel;
  private handlers = new Map<string, (msg: amqp.ConsumeMessage, channel: amqp.Channel) => Promise<void>>();
  private isConnected = false;

  constructor(
    @Inject(LOGGER_INJECTABLE_NAME) private readonly logger: Logger,
    @Inject(CONFIG) private readonly config: AppConfigType
  ) {}

  async addHandler(queue: string, handler: (msg: amqp.ConsumeMessage, channel: amqp.Channel) => Promise<void>) {
    this.handlers.set(queue, handler);

    if (this.isConnected) {
      await this.setupQueueConsumer(queue);
    }
  }

  private async setupQueueConsumer(queue: string) {
    try {
      await this.channel.assertQueue(queue, { durable: true });
      await this.channel.prefetch(this.config.RABBITMQ_PREFETCH_COUNT);

      this.logger.info(`Setting up consumer for queue: ${queue}`);

      await this.channel.consume(
        queue,
        async msg => {
          if (!msg) return;

          let parsedContent;
          try {
            parsedContent = JSON.parse(msg.content.toString());
          } catch (parseError) {
            this.logger.error(`Failed to parse message content from queue ${queue}:`, parseError);
            // Отклоняем сообщение без повторной отправки
            this.channel.nack(msg, false, false);
            return;
          }

          // Создаем объект сообщения с разобранным контентом
          const serializedMsg = {
            ...msg,
            content: parsedContent,
          } as AmqpSerializedMessage;

          try {
            const handler = this.handlers.get(queue);

            if (!handler) {
              this.logger.error(`No handler registered for queue: ${queue}`);
              this.channel.nack(msg, false, false);
              return;
            }

            await this.connect();
            await handler(serializedMsg, this.channel);
          } catch (error) {
            this.logger.error(`Error processing message from queue ${queue}:`, error);
            await this.connect();
            this.channel.nack(msg, false, false);
          }
        },
        { noAck: false }
      );
    } catch (error) {
      this.logger.error(`Error setting up consumer for queue ${queue}:`, error);
      throw error;
    }
  }

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.close();
  }

  private async connect() {
    if (this.isConnected) return;

    try {
      this.logger.info('Connecting to RabbitMQ...');
      this.connection = await amqp.connect(this.config.RABBITMQ_URL);

      this.connection.on('close', () => {
        this.logger.info('Соединение с RabbitMQ закрыто');
        this.isConnected = false;
        setTimeout(() => this.connect(), 100);
      });

      this.connection.on('error', err => {
        this.logger.error('RabbitMQ connection error:', convertExceptionToString(err));
        this.isConnected = false;
        setTimeout(() => this.connect(), 100);
      });

      this.channel = await this.connection.createChannel();
      this.isConnected = true;
      this.logger.info('Successfully connected to RabbitMQ');

      for (const queue of this.handlers.keys()) {
        await this.setupQueueConsumer(queue);
      }
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ:', error);
      this.isConnected = false;
      setTimeout(() => this.connect(), 1000);
    }
  }

  private async close() {
    try {
      if (this.channel) {
        this.logger.info('Closing RabbitMQ channel');
        await this.channel.close();
      }

      if (this.connection) {
        this.logger.info('Closing RabbitMQ connection');
        await this.connection.close();
      }

      this.isConnected = false;
    } catch (error) {
      this.logger.error('Error while closing RabbitMQ connections:', error);
    }
  }
}
