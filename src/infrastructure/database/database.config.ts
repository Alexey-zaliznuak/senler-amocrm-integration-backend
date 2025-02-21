import { LoggingService } from '../logging/logging.service';

export const PRISMA = 'Prisma';
export const LOGGER_INJECTABLE_NAME = LoggingService.buildInjectableNameByContext(PRISMA);
