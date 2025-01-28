import { LoggingService } from 'src/infrastructure/logging/logging.service';

export const AMO_CRM = 'AmoCrm';
export const AMO_CRM_LOGGER = LoggingService.buildInjectableNameByContext(AMO_CRM);
