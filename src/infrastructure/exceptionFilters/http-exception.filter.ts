import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { Request, Response } from 'express';
import { Logger } from 'winston';
import { LOGGER } from '../logging/logging.config';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(@Inject(LOGGER) private readonly logger: Logger) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const status = exception.getStatus();

    const exceptionMessage = this.getExceptionMessage(exception);
    const details = this.getExceptionDetails(exception);

    if (status != HttpStatus.NOT_FOUND) {
      this.logger.error(`Handled exception: HTTP ${status} ${exception.name}:`, {
        exceptionMessage,
        details,
        stack: exception.stack,
      });
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: exceptionMessage,
      ...(details !== undefined && { details }),
    });
  }

  private getExceptionMessage(exception: HttpException): string | Array<string> {
    const exceptionResponse = exception.getResponse();

    if (typeof exceptionResponse === 'object' && exceptionResponse['message'] && Array.isArray(exceptionResponse['message'])) {
      return exceptionResponse['message'];
    }

    return exception.message;
  }

  private getExceptionDetails(exception: HttpException): unknown {
    const exceptionResponse = exception.getResponse();

    if (typeof exceptionResponse === 'object' && exceptionResponse['details'] !== undefined) {
      return exceptionResponse['details'];
    }

    return undefined;
  }
}
