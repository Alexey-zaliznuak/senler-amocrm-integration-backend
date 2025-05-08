import { Inject, Module, OnModuleInit } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import * as amqp from 'amqplib';

import { convertExceptionToString } from 'src/utils';
import { Logger } from 'winston';
import { AppConfig, AppConfigType } from '../config/config.app-config';
import { CONFIG } from '../config/config.module';
import { LoggingModule } from '../logging/logging.module';
import { LOGGER_INJECTABLE_NAME, RABBITMQ } from './rabbitMq.config';
import { RabbitMqService } from './rabbitMq.service';

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

      await channel.assertExchange(this.appConfig.RABBITMQ_TRANSFER_EXCHANGE, 'direct', { durable: true });
      await channel.assertQueue(this.appConfig.RABBITMQ_TRANSFER_QUEUE, { durable: true });
      await channel.bindQueue(
        this.appConfig.RABBITMQ_TRANSFER_QUEUE,
        this.appConfig.RABBITMQ_TRANSFER_EXCHANGE,
        this.appConfig.RABBITMQ_TRANSFER_ROUTING_KEY
      );

      await channel.close();
      await connection.close();
    } catch (exception) {
      this.logger.error('RabbitMq init failed: ' + convertExceptionToString(exception));
    }
  }
}
