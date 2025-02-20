import { LoggingService } from "../logging/logging.service"

export const DATABASE = 'Database'
export const LOGGER_INJECTABLE_NAME = LoggingService.buildInjectableNameByContext(DATABASE)
