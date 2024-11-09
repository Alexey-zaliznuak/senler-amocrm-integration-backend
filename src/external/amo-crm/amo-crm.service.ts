import { Inject, Injectable } from '@nestjs/common';
import { AxiosInstance } from 'axios';
import { AXIOS_INSTANCE } from 'src/infrastructure/axios/instance/axios.instance.config';
import { LOGGER } from 'src/infrastructure/logging/logging.module';
import { Logger } from 'winston';


@Injectable()
export class AmoCrmService {
  constructor(
    @Inject(AXIOS_INSTANCE) private readonly axios: AxiosInstance,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {
  }
  async getAccessAndRefreshTokens(authToken: string) {
    return await this.axios.post("https://zaliznuak50.amocrm.ru/oauth2/access_token", {
      client_id: "b2eea8d6-599e-487f-b216-aaa8c7652210",
      client_secret: "Gt6HaXqJdoE1Jo2Nf1gt4JfhkvsMPbokZHqk1JJDphhe3yxAVmdGPnE9qRC5KgE0",
      grant_type: "authorization_code",
      code: "def50200ba7637cbd2bead22a6c258f1e59b4b396c197613ef951eb8b9f70ed4e1d5111902f61317605a08d68daf71fb39071fa712dcb0eb8640ff677f6e9fe532fbb34d789a117ad0c7b65b19afaf83a7191b5326f283af5f1390d6ed3331770f0622f97deb62d0a969c20188d5115b3a52afb9e7b7db61f8032745bd7d22f1376abfced259c7ebd11e6c45dd85838879da5ee95efd827d9f202c75258f264a3a71c50792dd55b8032b9dd08ea8b80883fe2f8925cd865bf3405cf2f932ac45568fc1014c40102186ae6ca757ef1a0ab983a9b699fd3f17057e4490bb0619aa4fb501e25da5b68f126cacffe6572ec6c9206d05b13d86af1e2f82f40e6c14a3400cc425e97d26758de7c7bfbd31b7ec51d8e8e243818a1ce92226d0f024e23cb1710d69676ffb8c09624ebc34c4613c33851eb3910f5a61c4d078b44a70b406875b15b78ac27ab91270d3c8dc6156086a8263e51132070aeb4b18679e2c2971b46402ab5c4ac8ea4b425b954e5566e60010addb70e5060d823fef0da01c74df69f21cfd8c4da290c520744a6c462024911f35bf66c24019f94178642b4d63aaa60a8f2e521c80",
      redirect_uri:"https://google.com",
    })
  }
}
