import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';
import { Logger } from 'winston';
import { AppConfigType } from '../config/config.app-config';
import { CONFIG } from '../config/config.module';
import { LOGGER_INJECTABLE_NAME } from './rabbitmq.config';
import { convertExceptionToString } from 'src/utils';

@Injectable()
export class RabbitMqService implements OnModuleInit, OnModuleDestroy {
  private channel: amqp.Channel;

  constructor(
    @Inject(CONFIG) private readonly appConfig: AppConfigType,
    @Inject(LOGGER_INJECTABLE_NAME) private readonly logger: Logger
  ) {}

  async onModuleInit() {
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
      const channelModel = await amqp.connect(this.appConfig.RABBITMQ_URL);
      this.channel = await channelModel.createChannel();
      this.logger.info("RabbitMq service connected");
    }
    catch (exception) {
      this.logger.error("RabbitMq failed to connect: " + convertExceptionToString(exception));
      setTimeout(() => this.connect(), 1000);
    }
  }
}
