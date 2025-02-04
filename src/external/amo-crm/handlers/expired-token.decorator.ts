// handle-tokens-refresh.decorator.ts
import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { AppConfig } from 'src/infrastructure/config/config.app-config';
import { prisma } from 'src/infrastructure/database';
import { AmoCrmTokens } from '../amo-crm.service';
import { LoggingService } from 'src/infrastructure/logging/logging.service';

const logger = new LoggingService(AppConfig).createLogger();

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
  try {
    const response: AxiosResponse = await axios.post(`https://${amoCrmDomain}/oauth2/access_token`, {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: tokens.amoCrmRefreshToken,
      redirect_uri: process.env.AMO_CRM_REDIRECT_URI,
    });

    if (response.status !== 200) {
      const body = response.data;
      throw new ServiceUnavailableException(`Не удалось обновить токен ${response.status} ${body}`);
    }

    prisma.senlerGroup.update({
      where: {
        amoCrmAccessToken: tokens.amoCrmAccessToken,
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
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const body = JSON.stringify(error.response?.data);
      const body2 = JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: tokens.amoCrmRefreshToken,
        redirect_uri: process.env.AMO_CRM_REDIRECT_URI,
      });
      logger.debug('body', body, 'body2', body2);
      // throw new Error(`Unauthorized ${body} : ${body2}`);
    }
    const body2 = JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: tokens.amoCrmRefreshToken,
      redirect_uri: process.env.AMO_CRM_REDIRECT_URI,
    });
    logger.debug('body2', body2);

    throw error;
  }
}

export function HandleAccessTokenExpiration() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error: any) {
        if (error.status === 401) {
          const originalMethodProperty = args[0];

          const tokens: AmoCrmTokens = originalMethodProperty.tokens;

          const amoCrmDomain: string = originalMethodProperty.amoCrmDomain;
          const clientId: string = AppConfig.AMO_CRM_CLIENT_ID;
          const clientSecret: string = AppConfig.AMO_CRM_CLIENT_ID;

          const newAccessToken: AmoCrmTokens = await refreshAccessToken({
            tokens,
            amoCrmDomain,
            clientId,
            clientSecret,
          });

          args[0].tokens = newAccessToken;

          return await originalMethod.apply(this, args);
          // } catch (e) {
          //   throw new UnauthorizedException('Could not update the tokens', { description: e });
          // }
        } else {
          throw error;
        }
      }
    };

    return descriptor;
  };
}
