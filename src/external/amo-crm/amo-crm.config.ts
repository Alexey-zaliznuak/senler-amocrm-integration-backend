import { AxiosService } from 'src/infrastructure/axios/axios.service';
import { LoggingService } from 'src/infrastructure/logging/logging.service';

export const AMO_CRM = 'AmoCrm';
export const AXIOS_INJECTABLE_NAME = AxiosService.buildInjectableNameByContext(AMO_CRM);
export const LOGGER_INJECTABLE_NAME = LoggingService.buildInjectableNameByContext(AMO_CRM);
