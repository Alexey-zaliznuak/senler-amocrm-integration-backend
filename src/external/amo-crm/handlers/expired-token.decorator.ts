import { HttpStatus } from '@nestjs/common';
import { RefreshTokensService } from './handle-tokens-expiration.service';
import { AmoCrmTokens } from '../amo-crm.dto';

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
        const amoCrmDomain: string = originalMethodProperty.amoCrmDomainName;

        const newTokens = await refreshTokensService.refresh({
          tokens,
          amoCrmDomain,
        });

        args[0].tokens = newTokens;

        return await originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
}
