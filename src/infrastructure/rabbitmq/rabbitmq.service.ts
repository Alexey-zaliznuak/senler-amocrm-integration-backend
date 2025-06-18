import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';
import { convertExceptionToString } from 'src/utils';
import { Logger } from 'winston';
import { AppConfigType } from '../config/config.app-config';
import { CONFIG } from '../config/config.module';
import { LOGGER_INJECTABLE_NAME } from './rabbitmq.config';

@Injectable()
export class RabbitMqService implements OnModuleInit, OnModuleDestroy {
  private channel: amqp.Channel;

  constructor(
    @Inject(CONFIG) private readonly config: AppConfigType,
    @Inject(LOGGER_INJECTABLE_NAME) private readonly logger: Logger
  ) {}

  async onModuleInit() {
    await this.connect();
    this.logger.info('RabbitMq connection and channel created');
  }

  async publishMessage(exchange: string, routingKey: string, payload: any, delay: number = 0) {
    const message = Buffer.from(JSON.stringify(payload));
    const headers = delay ? { 'x-delay': delay } : undefined;
    this.channel.publish(exchange, routingKey, message, { headers });
    this.logger.debug(`Message published to ${exchange} with routingKey ${routingKey}`, { headers });
  }

  async onModuleDestroy() {
    await this.channel.close();
    this.logger.info('RabbitMq connection closed');
  }

  private async connect() {
    try {
      const channelModel = await amqp.connect(this.config.RABBITMQ_URL);
      this.channel = await channelModel.createChannel();
      this.logger.info('RabbitMq service connected');
    } catch (error) {
      this.logger.error('RabbitMq failed to connect: ' + convertExceptionToString(error));
      setTimeout(() => this.connect(), 1000);
    }
  }
}
