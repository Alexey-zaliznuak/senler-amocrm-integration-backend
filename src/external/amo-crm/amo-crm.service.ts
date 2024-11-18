import { Inject, Injectable } from '@nestjs/common';
import { AxiosService } from 'src/infrastructure/axios/instance/axios.instance';
import { AXIOS_INSTANCE } from 'src/infrastructure/axios/instance/axios.instance.config';
import { Logger } from 'winston';
import { AMO_CRM_LOGGER } from './amo-crm.config';
import { AmoCrmOAuthTokenResponse } from './amo-crm.dto';
import { CONFIG } from 'src/infrastructure/config/config.module';
import { AppConfigType } from 'src/infrastructure/config/config.app-config';


@Injectable()
export class AmoCrmService {
  constructor(
    @Inject(AXIOS_INSTANCE) private readonly axios: AxiosService,
    @Inject(AMO_CRM_LOGGER) private readonly logger: Logger,
    @Inject(CONFIG) private readonly config: AppConfigType,
  ) {}

  async getAccessAndRefreshTokens(amoCrmDomain: string, code: string): Promise<AmoCrmOAuthTokenResponse> {
    const response = await this.axios.post<AmoCrmOAuthTokenResponse>(
      `https://${amoCrmDomain}/oauth2/access_token`,
      {
        client_id: this.config.AMO_CRM_CLIENT_ID,
        client_secret: this.config.AMO_CRM_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: this.config.AMO_CRM_REDIRECT_URI,
      }
    )

    this.logger.info("Success got amo crm tokens", { amoCrmDomain, code, data: response.data })

    return response.data
  }
}
