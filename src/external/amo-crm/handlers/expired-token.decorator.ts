import { HttpStatus } from '@nestjs/common';
import { AppConfig } from 'src/infrastructure/config/config.app-config';
import { LoggingService } from 'src/infrastructure/logging/logging.service';
import { convertExceptionToString } from 'src/utils';
import { AmoCrmTokens } from '../amo-crm.dto';
import { RefreshTokensService } from './handle-tokens-expiration.service';

export function HandleAccessTokenExpiration() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error: any) {
        if (error.status !== HttpStatus.UNAUTHORIZED) {
          throw error;
        }

        const refreshTokensService: RefreshTokensService = this.refreshTokensService;

        const originalMethodProperty = args[0];
        const tokens: AmoCrmTokens = originalMethodProperty.tokens;
        const amoCrmDomainName: string = originalMethodProperty.amoCrmDomainName;

        const logger = new LoggingService(AppConfig).createLogger();

        try {
          const newTokens = await refreshTokensService.refresh({
            tokens,
            amoCrmDomainName,
          });
          logger.info(tokens.accessToken === newTokens.accessToken ? 'ТОКЕНЫ НЕ ОБНОВИЛИСЬ' : 'ТОКЕНЫ ОБНОВИЛИСЬ');

          args[0].tokens = newTokens;
        } catch (error) {
          logger.error('ОШИБКА ОБНОВЛЕНИЯ ТОКЕНОВ', { error: convertExceptionToString(error) });
        }

        return await originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
}
