import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosService } from 'src/infrastructure/axios/instance/axios.instance';
import { AXIOS_INSTANCE } from 'src/infrastructure/axios/instance/axios.instance.config';
import { Logger } from 'winston';
import { AMO_CRM_LOGGER } from './amo-crm.config';
import { AmoCrmOAuthTokenResponse } from './amo-crm.dto';


@Injectable()
export class AmoCrmService {
  constructor(
    @Inject(AXIOS_INSTANCE) private readonly axios: AxiosService,
    @Inject(AMO_CRM_LOGGER) private readonly logger: Logger,
    private readonly configService: ConfigService<any, true>,
  ) {}

  async getAccessAndRefreshTokens(amoCrmDomain: string, code: string): Promise<AmoCrmOAuthTokenResponse> {
    const response = await this.axios.post<AmoCrmOAuthTokenResponse>(
      `https://${amoCrmDomain}/oauth2/access_token`,
      {
        client_id: "b2eea8d6-599e-487f-b216-aaa8c7652210",
        client_secret: "Gt6HaXqJdoE1Jo2Nf1gt4JfhkvsMPbokZHqk1JJDphhe3yxAVmdGPnE9qRC5KgE0",
        grant_type: "authorization_code",
        code,
        redirect_uri:"https://google.com",
      }
    )

    this.logger.info("Success got amo crm tokens tokens", { amoCrmDomain, code })

    return response.data
  }
}
