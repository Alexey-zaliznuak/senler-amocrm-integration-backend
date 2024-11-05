import { Module } from '@nestjs/common';
import { AmoCrmService } from './amo-crm.service';

@Module({
  providers: [AmoCrmService],
  exports: [AmoCrmService]
})
export class AmoCrmModule {}
