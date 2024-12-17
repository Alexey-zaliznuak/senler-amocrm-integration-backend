export interface BotStepWebhook {
  globalVars: any,
  personalVars: any,
  publicIntegrationInfo: any,
  event: any,
  integrationSecret: any,
}

// "integrationSecret": "85f346fa12cf86efa4ebc48ba6e9f2f79ab78665bb86d91d6bbef25431828a5c",
// backend-1  |             "publicIntegrationInfo": "{\"publicText\":\"qwe\",\"token\":\"type\",\"type\":\"qw\"}",
// backend-1  |             "user": {
// backend-1  |                 "leadId": "66db1078287a7ca40c579097",
// backend-1  |                 "name": "Алексей",
// backend-1  |                 "personalVars": {
// backend-1  |                     "lolol": 1234,
// backend-1  |                     "xtime": 138
// backend-1  |                 },
// backend-1  |                 "surname": "Зализняк"
// backend-1  |             }
