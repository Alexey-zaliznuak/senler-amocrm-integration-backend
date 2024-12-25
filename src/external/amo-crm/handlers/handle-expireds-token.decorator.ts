// handle-token-refresh.decorator.ts
import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { env } from 'process';
import { prisma } from 'src/infrastructure/database';

/**
 * Функция для обновления accessToken с использованием refreshToken.
 * @param refreshToken Текущий refreshToken
 * @returns Новый accessToken
 */
async function refreshAccessToken({
  refreshToken,
  amoCrmDomain,
  accessToken,
  clientId,
  clientSecret,
}: {
  refreshToken: string;
  amoCrmDomain: string;
  clientId: string;
  clientSecret: string;
  accessToken: string;
}): Promise<string> {
  try {
    const response: AxiosResponse = await axios.post(
      `https://${amoCrmDomain}/oauth2/access_token`,
      {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        redirect_uri: env.AMO_CRM_REDIRECT_URI,
      },
    );

    if (response.status !== 200) {
      throw new ServiceUnavailableException('Не удалось обновить токен');
    }

    prisma.senlerGroup.update({
      where: {
        amoCrmAccessToken: accessToken,
      },
      data: {
        amoCrmAccessToken: response.data.access_token,
        amoCrmRefreshToken: response.data.refresh_token,
      },
    });
    return response.data.access_token;
  } catch {
    throw new UnauthorizedException('Не удалось обновить токен');
  }
}

export function HandleTokenRefresh() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error: any) {
        if (error.response && error.response.status === 401) {
          const originalMethodProperty = args[0];

          const refreshToken: string = originalMethodProperty.refreshToken;
          const amoCrmDomain: string = originalMethodProperty.amoCrmDomain;
          const clientId: string = originalMethodProperty.clientId;
          const clientSecret: string = originalMethodProperty.clientSecret;
          const accessToken: string = originalMethodProperty.clientSecret;

          try {
            const newAccessToken: string = await refreshAccessToken({
              refreshToken,
              amoCrmDomain,
              clientId,
              clientSecret,
              accessToken,
            });

            originalMethodProperty.accessToken = newAccessToken;

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
