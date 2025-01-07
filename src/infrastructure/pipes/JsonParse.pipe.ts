import {
  ArgumentMetadata,
  BadRequestException,
  GoneException,
  Inject,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { Logger } from 'winston';
import { LOGGER } from '../logging/logging.module';

@Injectable()
export class ParseJsonPipe implements PipeTransform {
  constructor(@Inject(LOGGER) private readonly logger: Logger) {}
  transform<T = Omit<any, string>>(
    value: string | T,
    _metadata: ArgumentMetadata,
  ): object | T {
    try {
      if (typeof value === 'string') {
        return JSON.parse(value);
      }
      return value;
    } catch {
      throw new BadRequestException('Invalid JSON string');
    }
  }
}
