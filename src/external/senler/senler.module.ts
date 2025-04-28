import { Module } from '@nestjs/common';
import { SenlerService } from './senler.service';

@Module({
  exports: [SenlerService],
  providers: [SenlerService]
})
export class SenlerModule {}
