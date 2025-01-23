// handle-token-refresh.decorator.ts
import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { env } from 'process';
import { AppConfig } from 'src/infrastructure/config/config.app-config';
import { prisma } from 'src/infrastructure/database';
import { AmoCrmToken } from '../amo-crm.service';

/**
 * Функция для обновления accessToken с использованием refreshToken.
 * @param refreshToken Текущий refreshToken
 * @returns Новый Token - связка accessToken и refreshToken
 */
async function refreshAccessToken({
  amoCrmDomain,
  clientId,
  clientSecret,
  token,
}: {
  token: AmoCrmToken;
  amoCrmDomain: string;
  clientId: string;
  clientSecret: string;
}): Promise<AmoCrmToken> {
  try {
    const response: AxiosResponse = await axios.post(`https://${amoCrmDomain}/oauth2/access_token`, {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: token.amoCrmRefreshToken,
      redirect_uri: env.AMO_CRM_REDIRECT_URI,
    });

    if (response.status !== 200) {
      const body = response.data;
      throw new ServiceUnavailableException(`Не удалось обновить токен ${response.status} ${body}`);
    }

    prisma.senlerGroup.update({
      where: {
        amoCrmAccessToken: token.amoCrmAccessToken,
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
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const body = JSON.stringify(error.response?.data);
      throw new Error(`Unauthorized ${body}`);
    }
    throw new ServiceUnavailableException('Не удалось обновить токен');
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

          const token: AmoCrmToken = originalMethodProperty.token;

          const amoCrmDomain: string = originalMethodProperty.amoCrmDomain;
          const clientId: string = AppConfig.AMO_CRM_CLIENT_ID;
          const clientSecret: string = AppConfig.AMO_CRM_CLIENT_ID;

          // try {
          const newAccessToken: AmoCrmToken = await refreshAccessToken({
            token,
            amoCrmDomain,
            clientId,
            clientSecret,
          });

          args[0].token = newAccessToken;

          return await originalMethod.apply(this, args);
          // } catch (e) {
          //   throw new UnauthorizedException('Could not update the token', { description: e });
          // }
        } else {
          throw error;
        }
      }
    };

    return descriptor;
  };
}
