import { Module, DynamicModule } from '@nestjs/common';
import { RedisService } from './redis.service';
import { LoggingModule } from '../logging/logging.module';
import { LOGGER_INJECTABLE_NAME } from './redis.config';

@Module({
  imports: [LoggingModule.forFeature(LOGGER_INJECTABLE_NAME)],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {
  public static forRoot(): DynamicModule {
    return {
      module: RedisModule,
      imports: [LoggingModule.forFeature(LOGGER_INJECTABLE_NAME)],
      providers: [RedisService],
      exports: [RedisService],
    };
  }
}
