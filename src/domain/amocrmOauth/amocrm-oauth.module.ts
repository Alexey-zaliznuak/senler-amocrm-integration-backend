import { Module } from '@nestjs/common';
import { LoggingModule } from 'src/infrastructure/logging/logging.module';
import { RedisModule } from 'src/infrastructure/redis/redis.module';
import { IntegrationModule } from '../integration/integration.module';
import { SenlerGroupsModule } from '../senlerGroups/senler-groups.module';
import { AmocrmOauthSessionService } from './amocrm-oauth-session.service';
import { LOGGER_INJECTABLE_NAME } from './amocrm-oauth.config';
import { AmocrmOauthController } from './amocrm-oauth.controller';
import { AmocrmOauthService } from './amocrm-oauth.service';
import { SenlerOauthController } from './senler-oauth.controller';

@Module({
  imports: [LoggingModule.forFeature(LOGGER_INJECTABLE_NAME), RedisModule, SenlerGroupsModule, IntegrationModule],
  controllers: [AmocrmOauthController, SenlerOauthController],
  providers: [AmocrmOauthService, AmocrmOauthSessionService],
})
export class AmocrmOauthModule {}
