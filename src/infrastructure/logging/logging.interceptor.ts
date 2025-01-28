import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpException } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { CustomRequest } from '../requests';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const req = httpContext.getRequest<CustomRequest>();
    const res = httpContext.getResponse();

    this.logRequest(req);

    const startTime = Date.now();

    return next.handle().pipe(
      map(data => {
        this.logResponse(req, res, startTime, data);
        return data;
      }),
      catchError(error => {
        this.logResponse(req, res, startTime, error);
        return throwError(() => error);
      })
    );
  }

  private logRequest(req: CustomRequest) {
    req.logger.info('Request received', this.extractLoggableData(req));
  }

  private logResponse(req: CustomRequest, res: any, startTime: number, payload: any) {
    const statusCode = payload instanceof HttpException ? payload.getStatus() : res.statusCode;

    const headers = res.getHeaders();
    const contentLength = headers['content-length'] || 'unknown';
    const processTime = headers['x-process-time'] || `${Date.now() - startTime} ms`;

    req.logger.info('Response sent', {
      statusCode,
      contentLength,
      headers,
      payload,
      req: this.extractLoggableData(req),
      processTime,
    });
  }

  private extractLoggableData(req: CustomRequest): object {
    const { method, body, path, url, query, params } = req;
    return {
      method,
      body,
      path,
      url,
      query,
      params,
    };
  }
}
