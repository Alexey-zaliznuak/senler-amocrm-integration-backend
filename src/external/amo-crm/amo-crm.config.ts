import { LoggingService } from 'src/infrastructure/logging/logging.service';

export const LOGGER_NAME = 'AmoCrm';
export const LOGGER_INJECTABLE_NAME = LoggingService.buildInjectableNameByContext(LOGGER_NAME);
