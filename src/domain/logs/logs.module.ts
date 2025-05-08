import { Module } from '@nestjs/common';
import { LogsService } from './logs.service';
import { LogsController } from './logs.controller';
import { LoggingModule } from 'src/infrastructure/logging/logging.module';
import { AxiosModule } from 'src/infrastructure/axios/axios.module';
import { AXIOS_INJECTABLE_NAME, LOGGER_INJECTABLE_NAME, LOGS } from './logs.config';

@Module({
  imports: [LoggingModule.forFeature(LOGGER_INJECTABLE_NAME), AxiosModule.forFeature(AXIOS_INJECTABLE_NAME)],
  controllers: [LogsController],
  providers: [LogsService],
})
export class LogsModule {}
