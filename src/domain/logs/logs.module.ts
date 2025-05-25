import { Module } from '@nestjs/common';
import { AxiosModule } from 'src/infrastructure/axios/axios.module';
import { LoggingModule } from 'src/infrastructure/logging/logging.module';
import { AXIOS_INJECTABLE_NAME, LOGGER_INJECTABLE_NAME } from './logs.config';
import { LogsController } from './logs.controller';
import { LogsService } from './logs.service';

@Module({
  imports: [LoggingModule.forFeature(LOGGER_INJECTABLE_NAME), AxiosModule.forFeature(AXIOS_INJECTABLE_NAME)],
  controllers: [LogsController],
  providers: [LogsService],
})
export class LogsModule {}
