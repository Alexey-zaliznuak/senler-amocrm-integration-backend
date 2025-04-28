import { Module } from '@nestjs/common';
import { LogsService } from './logs.service';
import { LogsController } from './logs.controller';
import { LoggingModule } from 'src/infrastructure/logging/logging.module';
import { AxiosModule } from 'src/infrastructure/axios/axios.module';
import { LOGS } from './logs.config';

@Module({
  imports: [LoggingModule.forFeature(LOGS), AxiosModule.forFeature(LOGS)],
  controllers: [LogsController],
  providers: [LogsService],
})
export class LogsModule {}
