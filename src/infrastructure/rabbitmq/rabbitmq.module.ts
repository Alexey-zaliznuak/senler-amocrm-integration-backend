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
      const delayedExchange = 'senler-amo-crm.integration.delayed';

      // Создание основного exchange
      await channel.assertExchange(transferExchange, 'direct', { durable: true });
      this.logger.info(`Exchange ${transferExchange} asserted`);

      // Создание delayed exchange
      // await channel.assertExchange(delayedExchange, 'x-delayed-message', {
      //   durable: true,
      //   arguments: { 'x-delayed-type': 'direct' }, // Тип маршрутизации для отложенных сообщений
      // });

      await channel.assertQueue(transferQueue, { durable: true });

      // Привязка очереди к основному и отложенному exchange
      await channel.bindQueue(transferQueue, transferExchange, transferRoutingKey);
      // await channel.bindQueue(transferQueue, delayedExchange, transferRoutingKey);

      this.logger.info(`Queue ${transferQueue} bound to exchanges`);

      await channel.close();
      await connection.close();
    } catch (exception) {
      this.logger.error('RabbitMQ init failed: ' + convertExceptionToString(exception));
    }
  }
}
