import { Module } from '@nestjs/common';
import { IntegrationService } from './integration.service';
import { IntegrationController } from './integration.controller';
import { AmoCrmModule } from 'src/external/amo-crm';
import { SenlerModule } from 'src/external/senler/senler.module';

@Module({
  controllers: [IntegrationController],
  providers: [IntegrationService],
  imports: [AmoCrmModule, SenlerModule]
})
export class IntegrationModule {}
