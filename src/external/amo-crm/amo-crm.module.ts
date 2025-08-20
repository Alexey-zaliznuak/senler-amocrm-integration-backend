import { Module } from '@nestjs/common';
import { AxiosModule } from 'src/infrastructure/axios/axios.module';
import { LoggingModule } from 'src/infrastructure/logging/logging.module';
import { AXIOS_INJECTABLE_NAME, LOGGER_INJECTABLE_NAME } from './amo-crm.config';
import { AmoCrmService } from './amo-crm.service';
import { RefreshTokensService } from './handlers/handle-tokens-expiration.service';
import { RateLimitsService } from './rate-limit.service';

@Module({
  imports: [
    LoggingModule.forFeature(LOGGER_INJECTABLE_NAME),
    AxiosModule.forFeature(AXIOS_INJECTABLE_NAME, { retryConfig: { retries: 0 } }),
  ],
  providers: [AmoCrmService, RefreshTokensService, RateLimitsService],
  exports: [AmoCrmService, RateLimitsService],
})
export class AmoCrmModule {}
