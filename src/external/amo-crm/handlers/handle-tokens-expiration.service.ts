import { HttpStatus, Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AxiosService } from 'src/infrastructure/axios/instance';
import { AmoCrmTokens } from '../amo-crm.service';
import { AppConfigType } from 'src/infrastructure/config/config.app-config';
import { AxiosResponse } from 'axios';
import { AXIOS_INJECTABLE_NAME } from '../amo-crm.config';
import { CONFIG } from 'src/infrastructure/config/config.module';
import { PRISMA } from 'src/infrastructure/database/database.config';
import { ExtendedPrismaClientType } from 'src/infrastructure/database/database.service';

@Injectable()
export class RefreshTokensService {
  constructor(
    @Inject(AXIOS_INJECTABLE_NAME) private readonly axiosService: AxiosService,
    @Inject(CONFIG) private readonly config: AppConfigType,
    @Inject(PRISMA) private readonly prisma: ExtendedPrismaClientType,
  ) {}

  async refresh({
    amoCrmDomain,
    tokens,
  }: {
    tokens: AmoCrmTokens;
    amoCrmDomain: string;
  }): Promise<AmoCrmTokens> {
    const response: AxiosResponse = await this.axiosService.post(
      `https://${amoCrmDomain}/oauth2/access_token`,
      {
        client_id: this.config.AMO_CRM_CLIENT_ID,
        client_secret: this.config.AMO_CRM_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: tokens.amoCrmRefreshToken,
        redirect_uri: this.config.AMO_CRM_REDIRECT_URI,
      }
    );

    if (response.status !== HttpStatus.OK) {
      throw new ServiceUnavailableException(
        `Can not refresh token ${response.status} ${response.data}`
      );
    }

    await this.prisma.senlerGroup.updateWithCacheInvalidate({
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
}