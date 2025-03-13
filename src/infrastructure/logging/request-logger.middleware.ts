import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { Response } from 'express';
import { Logger } from 'winston';
import { CustomRequest } from '../requests';
import { LOGGER } from './logging.config';

/** Add req.logger - logger instance child instance with requestId */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(@Inject(LOGGER) private readonly logger: Logger) {}

  use(req: CustomRequest, res: Response, next: () => void) {
    req.logger = this.logger.child({ requestId: req.id });

    next();
  }
}
