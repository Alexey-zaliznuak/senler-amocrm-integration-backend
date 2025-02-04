import { ServiceUnavailableException } from '@nestjs/common';
import { AxiosResponse } from 'axios';
import { AxiosService } from 'src/infrastructure/axios/instance';
import { AppConfig } from 'src/infrastructure/config/config.app-config';
import { prisma } from 'src/infrastructure/database';
import { LoggingService } from 'src/infrastructure/logging/logging.service';
import { AmoCrmTokens } from '../amo-crm.service';

const axiosService = new AxiosService(
  new LoggingService(AppConfig).createLogger({ defaultMeta: { context: 'Axios/AmoCrmTokenUpdate' } })
);

async function refreshAccessToken({
  amoCrmDomain,
  clientId,
  clientSecret,
  tokens,
}: {
  tokens: AmoCrmTokens;
  amoCrmDomain: string;
  clientId: string;
  clientSecret: string;
}): Promise<AmoCrmTokens> {
  const response: AxiosResponse = await axiosService.post(`https://${amoCrmDomain}/oauth2/access_token`, {
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: tokens.amoCrmRefreshToken,
    redirect_uri: process.env.AMO_CRM_REDIRECT_URI,
  });

  if (response.status !== 200) {
    throw new ServiceUnavailableException(`Не удалось обновить токен ${response.status} ${response.data}`);
  }

  prisma.senlerGroup.update({
    where: {
      amoCrmAccessToken: tokens.amoCrmAccessToken,
      amoCrmRefreshToken: tokens.amoCrmRefreshToken,
    },
    data: {
      amoCrmAccessToken: response.data.access_token,
      amoCrmRefreshToken: response.data.refresh_token,
    },
  });

  return {
    amoCrmAccessToken: response.data.access_token,
    amoCrmRefreshToken: response.data.refresh_token,
  };
}

export function HandleAccessTokenExpiration() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error: any) {
        if (error.status !== 401) {
          throw error;
        }

        const originalMethodProperty = args[0];

        const tokens: AmoCrmTokens = originalMethodProperty.tokens;

        const amoCrmDomain: string = originalMethodProperty.amoCrmDomainName;
        const clientId: string = AppConfig.AMO_CRM_CLIENT_ID;
        const clientSecret: string = AppConfig.AMO_CRM_CLIENT_SECRET;

        const newTokens: AmoCrmTokens = await refreshAccessToken({
          tokens,
          amoCrmDomain,
          clientId,
          clientSecret,
        });

        args[0].tokens = newTokens;

        return await originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
}
