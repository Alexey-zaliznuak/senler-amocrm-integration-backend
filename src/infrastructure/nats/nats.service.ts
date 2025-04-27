import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { LOGGER } from '../logging/logging.config';
import { Logger } from 'winston';

@Injectable()
export class NatsService implements OnModuleInit {
  constructor(
    @Inject('NATS_CLIENT') private readonly client: ClientProxy,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {}

  async publishMessage(subject: string, payload: any) {
    this.client.emit(subject, payload);
  }

  async onModuleInit() {
    await this.client.connect()
    this.logger.info("Nats cluster connected")
  }
}
