// handle-token-refresh.decorator.ts
import { HttpException, HttpStatus } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';

/**
 * Функция для обновления accessToken с использованием refreshToken.
 * @param refreshToken Текущий refreshToken
 * @returns Новый accessToken
 */
async function refreshAccessToken(refreshToken: string): Promise<string> {
  try {
    const response: AxiosResponse = await axios.post(
      'https://your-auth-domain.com/refresh-token',
      {
        refresh_token: refreshToken,
      },
    );

    if (response.status !== 200) {
      throw new Error('Не удалось обновить токен');
    }

    if (!response.data.access_token) {
      throw new Error('access_token отсутствует в ответе');
    }

    return response.data.access_token;
  } catch {
    throw new HttpException(
      'Не удалось обновить токен',
      HttpStatus.UNAUTHORIZED,
    );
  }
}

/**
 * Декоратор для обработки обновления токена при возникновении ошибок с кодом 401.
 * Предполагается, что метод принимает объект в качестве первого аргумента,
 * содержащий accessToken и refreshToken.
 */
export function HandleTokenRefresh() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        // Попытка выполнить исходный метод
        return await originalMethod.apply(this, args);
      } catch (error: any) {
        // Проверка на ошибку 401 Unauthorized
        if (error.response && error.response.status === 401) {
          const methodArgs = args[0]; // Предполагается, что первый аргумент - объект с данными

          if (!methodArgs || !methodArgs.refreshToken) {
            throw new HttpException(
              'refreshToken отсутствует',
              HttpStatus.BAD_REQUEST,
            );
          }

          const refreshToken: string = methodArgs.refreshToken;

          try {
            // Вызов функции для обновления accessToken
            const newAccessToken: string =
              await refreshAccessToken(refreshToken);

            // Обновление accessToken в аргументах метода
            methodArgs.accessToken = newAccessToken;

            // Повторный вызов исходного метода с обновлённым accessToken
            return await originalMethod.apply(this, args);
          } catch {
            // Если обновление токена не удалось, выбрасываем исключение
            throw new HttpException(
              'Не удалось обновить токен',
              HttpStatus.UNAUTHORIZED,
            );
          }
        } else {
          // Если ошибка другая, пробрасываем её дальше
          throw error;
        }
      }
    };

    return descriptor;
  };
}
