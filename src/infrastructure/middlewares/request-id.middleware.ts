import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { CustomRequest } from '../requests';
import { UUID } from 'crypto';
import { generateRequestId } from 'src/utils';

/**
 * Add X-Request-id in response headers.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: CustomRequest, res: Response, next: NextFunction) {
    const requestId = generateRequestId();

    res.set('X-Request-Id', requestId);
    req.id = requestId as UUID;

    next();
  }
}
