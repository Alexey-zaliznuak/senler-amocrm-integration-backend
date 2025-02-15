import { LoggingService } from 'src/infrastructure/logging/logging.service';

export const INTEGRATION = 'IntegrationDomain';
export const LOGGER_INJECTABLE_NAME = LoggingService.buildInjectableNameByContext(INTEGRATION);
