import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response } from 'express';
import { CustomRequest } from '../requests';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  use(req: CustomRequest, res: Response, next: () => void) {
    this.logRequest(req);

    next();

    this.logResponse(req, res);
  }

  public logRequest(req: CustomRequest) {
    const { method, baseUrl, body, query, params } = req;

    req.logger.info(
      'Request received',
      {
        method,
        baseUrl,
        body,
        query,
        params,
      }
    )
  }

  public logResponse(req: CustomRequest, res: Response) {
    const statusCode = res.statusCode;
    const headers = res.getHeaders();
    const contentLength = headers['content-length'] || 'unknown';
    const responseTime = (Date.now() - req.startTime).toString() + " ms.";

    const { method, baseUrl, body, query, params } = req;

    req.logger.info(
      'Response sent',
      {
        statusCode,
        contentLength,
        headers,
        req: { method, baseUrl, body, query, params },
        responseTime,
      }
    );
  }
}
