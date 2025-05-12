import { Inject, Module, OnModuleInit } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import * as amqp from 'amqplib';

import { convertExceptionToString } from 'src/utils';
import { Logger } from 'winston';
import { AppConfig, AppConfigType } from '../config/config.app-config';
import { CONFIG } from '../config/config.module';
import { LoggingModule } from '../logging/logging.module';
import { LOGGER_INJECTABLE_NAME, RABBITMQ } from './rabbitmq.config';
import { RabbitMqService } from './rabbitmq.service';

@Module({
  imports: [LoggingModule.forFeature(LOGGER_INJECTABLE_NAME)],
  providers: [
    RabbitMqService,
    {
      provide: RABBITMQ,
      useFactory: () => {
        return ClientProxyFactory.create({
          transport: Transport.RMQ,
          options: {
            urls: [AppConfig.RABBITMQ_URL],
            queue: AppConfig.RABBITMQ_TRANSFER_QUEUE,
            queueOptions: {
              durable: true,
            },
          },
        });
      },
    },
  ],
  exports: [RABBITMQ, RabbitMqService],
})
export class RabbitmqModule implements OnModuleInit {
  constructor(
    @Inject(LOGGER_INJECTABLE_NAME) private readonly logger: Logger,
    @Inject(CONFIG) private readonly appConfig: AppConfigType
  ) {}

  public async onModuleInit() {
    try {
      const connection = await amqp.connect(this.appConfig.RABBITMQ_URL);
      const channel = await connection.createChannel();

      const transferExchange = this.appConfig.RABBITMQ_TRANSFER_EXCHANGE;
      const transferQueue = this.appConfig.RABBITMQ_TRANSFER_QUEUE;
      const transferRoutingKey = this.appConfig.RABBITMQ_TRANSFER_ROUTING_KEY;

      const dlxExchange = 'dlx_exchange';
      const delayQueue = 'delay_queue';

      // Создание основного exchange
      await channel.assertExchange(transferExchange, 'direct', { durable: true });

      // Создание DLX exchange
      await channel.assertExchange(dlxExchange, 'direct', { durable: true });

      // Создание основной очереди с DLX
      await channel.assertQueue(transferQueue, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': dlxExchange,
        },
      });
      await channel.bindQueue(transferQueue, transferExchange, transferRoutingKey);

      // Создание очереди для задержки с DLX на основной exchange
      await channel.assertQueue(delayQueue, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': transferExchange,
        },
      });
      await channel.bindQueue(delayQueue, dlxExchange, transferRoutingKey);

      await channel.close();
      await connection.close();
    } catch (exception) {
      this.logger.error('RabbitMQ init failed: ' + convertExceptionToString(exception));
    }
  }
}