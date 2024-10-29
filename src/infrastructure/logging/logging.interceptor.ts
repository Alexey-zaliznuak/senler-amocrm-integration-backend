import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CustomRequest } from '../requests';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<CustomRequest>();
    const res = context.switchToHttp().getResponse<Response>();

    this.logRequest(req);

    const startTime = Date.now(); // Время начала обработки запроса

    return next.handle().pipe(
      map((data) => {
        this.logResponse(req, res, startTime, data);
        return data;
      }),
    );
  }

  private logRequest(req: CustomRequest) {
    req.logger.info('Request received', this._extractLoggableData(req));
  }

  private logResponse(
    req: CustomRequest,
    res: Response,
    startTime: number,
    data: any,
  ) {
    const statusCode = res.statusCode;
    const headers = res.getHeaders();
    const contentLength = headers['content-length'] || 'unknown';
    const responseTime = headers['x-response-time'] || `${Date.now() - startTime} ms`;

    req.logger.info('Response sent', {
      statusCode,
      contentLength,
      headers,
      data,
      req: this._extractLoggableData(req),
      responseTime,
    });
  }

  private _extractLoggableData(req: Request): object {
    const { method, baseUrl, body, query, params } = req;
    return {
      method,
      baseUrl,
      body,
      query,
      params,
    }
  }
}
