import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { IntegrationModule } from './domain/integration/integration.module';
import { IntegrationStepTemplatesModule } from './domain/integrationStepTemplates/integration-step-template.module';
import { LogsModule } from './domain/logs/logs.module';
import { MetricsModule } from './domain/metrics/metrics.module';
import { SenlerGroupsModule } from './domain/senlerGroups/senler-groups.module';
import { AmoCrmModule } from './external/amo-crm/amo-crm.module';
import { SenlerModule } from './external/senler/senler.module';
import { AxiosModule } from './infrastructure/axios/axios.module';
import { AppConfig } from './infrastructure/config/config.app-config';
import { CustomConfigModule } from './infrastructure/config/config.module';
import { appConfigValidationSchema } from './infrastructure/config/config.validation-schema';
import { DatabaseModule } from './infrastructure/database/database.module';
import { HttpExceptionFilter } from './infrastructure/exceptionFilters';
import { PrismaNotFoundExceptionFilter } from './infrastructure/exceptionFilters/prisma-not-found-exception.filter';
import { ProcessTimeInterceptor } from './infrastructure/interceptors';
import { LoggingInterceptor } from './infrastructure/logging/logging.interceptor';
import { LoggingModule } from './infrastructure/logging/logging.module';
import { RequestLoggerMiddleware } from './infrastructure/logging/request-logger.middleware';
import { RequestIdMiddleware } from './infrastructure/middlewares';
import { RabbitmqModule } from './infrastructure/rabbitmq/rabbitmq.module';
import { RedisModule } from './infrastructure/redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [() => AppConfig],
      validationSchema: appConfigValidationSchema,
    }),
    CustomConfigModule.forRoot(),

    // Resources
    SenlerGroupsModule,
    IntegrationModule,
    IntegrationStepTemplatesModule,
    MetricsModule,
    LogsModule,

    // Infrastructure
    LoggingModule.forRoot(),
    AxiosModule.forRoot(),
    DatabaseModule.forRoot(),
    RedisModule,
    RabbitmqModule,

    // External
    AmoCrmModule,
    SenlerModule,
  ],

  controllers: [AppController],

  providers: [
    AppService,

    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_FILTER, useClass: PrismaNotFoundExceptionFilter },

    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ProcessTimeInterceptor },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware, RequestLoggerMiddleware).forRoutes('*');
  }
}
