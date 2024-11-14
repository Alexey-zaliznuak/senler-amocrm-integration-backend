export type AmoExchangeOAuthCodeRequestPayload = {
  amoCrmDomain: string,
  code: string,
}

export type AmoCrmOAuthTokenResponse = {
  token_type: string,
  expires_in: number,
  access_token: string,
  refresh_token: string,
}
