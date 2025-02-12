import { Module } from '@nestjs/common';
import { LoggingModule } from 'src/infrastructure/logging/logging.module';
import { AXIOS_INJECTABLE_NAME, LOGGER_INJECTABLE_NAME } from './amo-crm.config';
import { AmoCrmService } from './amo-crm.service';
import { AxiosModule } from 'src/infrastructure/axios/axios.module';

@Module({
  imports: [LoggingModule.forFeature(LOGGER_INJECTABLE_NAME), AxiosModule.forFeature(AXIOS_INJECTABLE_NAME)],
  providers: [AmoCrmService],
  exports: [AmoCrmService],
})
export class AmoCrmModule {}
