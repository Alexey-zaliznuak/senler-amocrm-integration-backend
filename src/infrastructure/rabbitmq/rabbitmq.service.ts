import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { Logger } from 'winston';
import { LOGGER_INJECTABLE_NAME, RABBITMQ } from './rabbitmq.config';

@Injectable()
export class RabbitMqService {
  constructor(
    @Inject(RABBITMQ) private readonly client: ClientProxy,
    @Inject(LOGGER_INJECTABLE_NAME) private readonly logger: Logger
  ) {}

  async publishMessage(exchange: string, routingKey: string, payload: any) {
    await lastValueFrom(this.client.emit({ cmd: exchange, routingKey }, payload));
  }

  async onModuleInit() {
    await this.client.connect();
    this.logger.info('RabbitMq cluster connected');
  }
}
