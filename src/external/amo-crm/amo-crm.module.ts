import { Module } from '@nestjs/common';
import { AmoCrmService } from './amo-crm.service';
import { LoggingModule } from 'src/infrastructure/logging/logging.module';
import { AMO_CRM } from './amo-crm.config';

@Module({
  imports: [LoggingModule.forFeature(AMO_CRM)],
  providers: [AmoCrmService],
  exports: [AmoCrmService]
})
export class AmoCrmModule {}
