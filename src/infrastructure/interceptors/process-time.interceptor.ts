import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable()
export class ProcessTimeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    request.startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - request.startTime;
        const response = context.switchToHttp().getResponse();
        response.setHeader('X-Process-Time', `${duration}ms`);
      }),

      catchError(error => {
        const duration = Date.now() - request.startTime;
        const response = context.switchToHttp().getResponse();
        response.setHeader('X-Process-Time', `${duration}ms`);

        return throwError(() => error);
      })
    );
  }
}
