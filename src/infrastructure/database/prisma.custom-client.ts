import { Inject, Injectable, Optional } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Logger } from 'winston';
import { LOGGER_INJECTABLE_NAME } from './database.config';

@Injectable()
export class CustomPrismaClient extends PrismaClient {
  private retryInterval: number;

  constructor(
    @Inject(LOGGER_INJECTABLE_NAME) private readonly logger: Logger,
    @Optional() retryInterval: number = 100
  ) {
    super();
    this.retryInterval = retryInterval;
  }

  async connectWithRetry(): Promise<void> {
    while (true) {
      try {
        await this.$connect();
        this.logger.info('Success connected to database');
        break;
      } catch (error) {
        this.logger.info('Failed to connect to the database:', { error });
        this.logger.info(`Retrying connection in ${this.retryInterval / 1000} seconds`);

        await new Promise(resolve => setTimeout(resolve, this.retryInterval));
      }
    }
  }
}
