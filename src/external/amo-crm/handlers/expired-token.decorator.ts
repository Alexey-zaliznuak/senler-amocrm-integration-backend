// handle-token-refresh.decorator.ts
import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { env } from 'process';
import { AppConfig } from 'src/infrastructure/config/config.app-config';
import { prisma } from 'src/infrastructure/database';
import { Token } from '../amo-crm.service';

/**
 * Функция для обновления accessToken с использованием refreshToken.
 * @param refreshToken Текущий refreshToken
 * @returns Новый Token - связка accessToken и refreshToken
 */
async function refreshAccessToken({ amoCrmDomain, clientId, clientSecret, token }: { token: Token; amoCrmDomain: string; clientId: string; clientSecret: string }): Promise<Token> {
  try {
    const response: AxiosResponse = await axios.post(`https://${amoCrmDomain}/oauth2/access_token`, {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: token.refreshToken,
      redirect_uri: env.AMO_CRM_REDIRECT_URI,
    });

    if (response.status !== 200) {
      throw new ServiceUnavailableException('Не удалось обновить токен');
    }

    prisma.senlerGroup.update({
      where: {
        amoCrmAccessToken: token.accessToken,
      },
      data: {
        amoCrmAccessToken: response.data.access_token,
        amoCrmRefreshToken: response.data.refresh_token,
      },
    });

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
    };
  } catch {
    throw new UnauthorizedException('Не удалось обновить токен');
  }
}

export function HandleAccessTokenExpiration() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error: any) {
        if (error.response && error.response.status === 401) {
          const originalMethodProperty = args[0];

          const token: Token = originalMethodProperty.token;

          const amoCrmDomain: string = originalMethodProperty.amoCrmDomain;
          const clientId: string = AppConfig.AMO_CRM_CLIENT_ID;
          const clientSecret: string = AppConfig.AMO_CRM_CLIENT_ID;

          try {
            const newAccessToken: Token = await refreshAccessToken({
              token,
              amoCrmDomain,
              clientId,
              clientSecret,
            });

            originalMethodProperty.token = newAccessToken;

            args[0].token = originalMethodProperty;

            return await originalMethod.apply(this, args);
          } catch {
            throw new UnauthorizedException('Не удалось обновить токен');
          }
        } else {
          throw error;
        }
      }
    };

    return descriptor;
  };
}
