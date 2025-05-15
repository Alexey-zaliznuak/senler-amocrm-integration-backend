import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';
import { Logger } from 'winston';
import { AppConfigType } from '../config/config.app-config';
import { CONFIG } from '../config/config.module';
import { LOGGER_INJECTABLE_NAME } from './rabbitmq.config';

@Injectable()
export class RabbitMqService implements OnModuleInit, OnModuleDestroy {
  private channel: amqp.Channel;

  constructor(
    @Inject(CONFIG) private readonly appConfig: AppConfigType,
    @Inject(LOGGER_INJECTABLE_NAME) private readonly logger: Logger
  ) {}

  async onModuleInit() {
    try {
      const channelModel = await amqp.connect(this.appConfig.RABBITMQ_URL);
      this.channel = await channelModel.createChannel();
      this.logger.info('RabbitMq connection and channel created');
    } catch (exception) {
      this.logger.error('Could not connect to rabbitmq, retry...');
      await this.onModuleInit();
    }
  }

  async publishMessage(exchange: string, routingKey: string, payload: any, delay: number = 0) {
    const message = Buffer.from(JSON.stringify(payload));
    const headers: any = {
      'x-match': 'all', // Указывает, что должны совпадать все условия паттерна
      exchange: exchange, // Передаем exchange как заголовок
      routingKey: routingKey, // Передаем routingKey как заголовок
    };
    if (delay) {
      headers['x-delay'] = delay; // Добавляем заголовок для задержки, если он есть
    }
    this.channel.publish(exchange, routingKey, message, { headers });
    this.logger.debug(`Message published to ${exchange} with routingKey ${routingKey}, delay: ${delay}`);
  }

  async onModuleDestroy() {
    await this.channel.close();
    this.logger.info('RabbitMq connection closed');
  }
}
