import { Module } from '@nestjs/common';
import { SenlerService } from './senler.service';

@Module({
  providers: [SenlerService]
})
export class SenlerModule {}
