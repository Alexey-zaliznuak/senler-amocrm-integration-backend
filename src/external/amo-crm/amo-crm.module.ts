import { Module } from '@nestjs/common';
import { AxiosModule } from 'src/infrastructure/axios/axios.module';
import { LoggingModule } from 'src/infrastructure/logging/logging.module';
import { AMO_CRM } from './amo-crm.config';
import { AmoCrmService } from './amo-crm.service';
import { RefreshTokensService } from './handlers/handle-tokens-expiration.service';

@Module({
  imports: [LoggingModule.forFeature(AMO_CRM), AxiosModule.forFeature(AMO_CRM)],
  providers: [AmoCrmService, RefreshTokensService],
  exports: [AmoCrmService],
})
export class AmoCrmModule {}
