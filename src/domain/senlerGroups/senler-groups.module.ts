import { Module } from '@nestjs/common';
import { AmoCrmModule } from 'src/external/amo-crm';
import { SenlerGroupsController } from './senler-groups.controller';
import { SenlerGroupsService } from './senler-groups.service';

@Module({
  controllers: [SenlerGroupsController],
  providers: [SenlerGroupsService],
  exports: [SenlerGroupsService],
  imports: [AmoCrmModule],
})
export class SenlerGroupsModule {}
