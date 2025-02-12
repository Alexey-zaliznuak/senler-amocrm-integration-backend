import { Module } from '@nestjs/common';
import { LoggingModule } from 'src/infrastructure/logging/logging.module';
import { LOGGER_INJECTABLE_NAME } from './amo-crm.config';
import { AmoCrmService } from './amo-crm.service';

@Module({
  imports: [LoggingModule.forFeature(LOGGER_INJECTABLE_NAME)],
  providers: [AmoCrmService],
  exports: [AmoCrmService],
})
export class AmoCrmModule {}
