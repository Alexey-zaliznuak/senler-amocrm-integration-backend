import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { HttpExceptionFilter } from './infrastructure/exceptionFilters/http-exception.filter';
import { LoggingModule } from './infrastructure/logging/logging.module';
import { RequestIdMiddleware } from './infrastructure/middlewares';
import { RequestLoggerMiddleware } from './infrastructure/logging/request-logger.middleware';
import { ProcessTimeInterceptor } from './infrastructure/interceptors';
import { LoggingInterceptor } from './infrastructure/logging/logging.interceptor';
import { SenlerGroupsModule } from './domain/senlerGroups/senler-groups.module';
import { AmoCrmModule } from './external/amo-crm/amo-crm.module';
import { AxiosModule } from './infrastructure/axios/axios.module';
import { IntegrationModule } from './domain/integration/integration.module';
import { ConfigModule } from '@nestjs/config';
import { SenlerService } from './external/senler/senler.service';
import { CustomConfigModule } from './infrastructure/config/config.module';
import { AppConfig } from './infrastructure/config/config.app-config';
import { appConfigValidationSchema } from './infrastructure/config/config.validation-schema';
import { SenlerModule } from './external/senler/senler.module';
import { DatabaseModule } from './infrastructure/database/database.module';

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

    // Infrastructure
    LoggingModule.forRoot(),
    AxiosModule.forRoot(),

    // External
    AmoCrmModule,
    SenlerModule,
    DatabaseModule,
  ],

  controllers: [AppController],

  providers: [
    AppService,

    SenlerService,

    { provide: APP_FILTER, useClass: HttpExceptionFilter },

    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ProcessTimeInterceptor },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware, RequestLoggerMiddleware).forRoutes('*');
  }
}
