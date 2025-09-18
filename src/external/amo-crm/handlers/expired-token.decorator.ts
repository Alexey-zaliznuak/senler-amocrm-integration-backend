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
        if (error?.status !== HttpStatus.UNAUTHORIZED) {
          throw error;
        }

        const refreshTokensService: RefreshTokensService = this.refreshTokensService;
        const originalOptions = args[0];
        const tokens: AmoCrmTokens = originalOptions.tokens;
        const amoCrmDomainName: string = originalOptions.amoCrmDomainName;

        const logger = new LoggingService(AppConfig).createLogger();

        let refreshed = false;
        try {
          const newTokens = await refreshTokensService.refresh({ tokens, amoCrmDomainName });

          // Если реально новые – подменяем в аргументах:
          if (newTokens?.accessToken && newTokens?.refreshToken) {
            refreshed = newTokens.accessToken !== tokens.accessToken || newTokens.refreshToken !== tokens.refreshToken;

            originalOptions.tokens = newTokens;
            logger.info(refreshed ? 'ТОКЕНЫ ОБНОВИЛИСЬ' : 'ТОКЕНЫ УЖЕ АКТУАЛЬНЫ (обновлять не потребовалось)');
          }
        } catch (e) {
          logger.error('ОШИБКА ОБНОВЛЕНИЯ ТОКЕНОВ', { error: convertExceptionToString(e) });
        }

        // Повторяем запрос ТОЛЬКО если токены обновились/актуализировались.
        if (refreshed) {
          try {
            return await originalMethod.apply(this, args);
          } catch (e2) {
            // Вторая попытка не удалась — отдадим наружу, не зацикливаемся.
            throw e2;
          }
        }

        // Не удалось обновить — отдаём исходную 401, чтобы не уходить в бесконечный цикл
        throw error;
      }
    };

    return descriptor;
  };
}
