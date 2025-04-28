import { AxiosService } from 'src/infrastructure/axios/axios.service';
import { LoggingService } from 'src/infrastructure/logging/logging.service';

export const LOGS = "LogsResource"

export const LOGGING_INJECTABLE_NAME = LoggingService.buildInjectableNameByContext(LOGS)
export const AXIOS_INJECTABLE_NAME = AxiosService.buildInjectableNameByContext(LOGS)
