import { NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { CustomRequest } from '../requests';

/**
 * Add X-Process-Time in response headers and req.startTime.
 */
export class ProcessTimeMiddleware implements NestMiddleware {
  use(req: CustomRequest, res: Response, next: NextFunction) {
    const startTime = Date.now();

    req.startTime = startTime;
    // res.on('finish', () => console.log('Событие finish'));
    res.on('close', () => console.log('Событие close'));

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      res.setHeader('X-Response-Time', `${duration}ms`); // добавляем заголовок с временем обработки
    });

    next();
  }
}
