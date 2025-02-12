import { AxiosService } from 'src/infrastructure/axios/instance';
import { LoggingService } from 'src/infrastructure/logging/logging.service';

export const AmoCrm = 'AmoCrm';
export const AXIOS_INJECTABLE_NAME = AxiosService.buildInjectableNameByContext(AmoCrm);
export const LOGGER_INJECTABLE_NAME = LoggingService.buildInjectableNameByContext(AmoCrm);
