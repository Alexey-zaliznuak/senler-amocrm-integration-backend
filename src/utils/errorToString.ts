import { AxiosError } from 'axios';
import { AppConfig } from 'src/infrastructure/config/config.app-config';
import { LoggingService } from 'src/infrastructure/logging/logging.service';

export function convertExceptionToString(exception: unknown): string {
  if (exception instanceof AxiosError) {
    new LoggingService(AppConfig).createLogger().info('DEBUG', { response: exception.response, message: exception.message });

    return JSON.stringify(exception.response?.data, Object.getOwnPropertyNames(exception.response?.data));
  }

  if (typeof exception === 'string') {
    return exception;
  }
  if (typeof exception === 'object' && exception !== null) {
    try {
      return JSON.stringify(exception, Object.getOwnPropertyNames(exception));
    } catch {
      return `Not serializable exception: ${Object.prototype.toString.call(exception)}`;
    }
  }
  if (exception instanceof Error) {
    return exception.message;
  }
  if (typeof exception === 'string') {
    return exception;
  }
  return String(exception);
}
