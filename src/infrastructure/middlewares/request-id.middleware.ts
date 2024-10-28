import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { CustomRequest } from '../requests';
import { UUID } from 'crypto';

/**
 * Add X-Request-id in response headers.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: CustomRequest, res: Response, next: NextFunction) {
    const requestId = uuidv4();

    res.set('X-Request-Id', requestId);
    req.id = requestId as UUID

    next();
  }
}
