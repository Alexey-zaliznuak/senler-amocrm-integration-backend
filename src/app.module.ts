import { HttpException, MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { HttpExceptionFilter } from './infrastructure/filters/http-exception.filter';
import { LoggingModule } from './infrastructure/logging/logging.module';
import { AuthGuard } from './infrastructure/auth/auth.guard';
import { RequestIdMiddleware } from './infrastructure/middlewares';
import { RequestLoggerMiddleware } from './infrastructure/logging/request-logger.middleware';
import { ProcessTimeInterceptor } from './infrastructure/interceptors';
import { LoggingInterceptor } from './infrastructure/logging/logging.interceptor';
import { UsersModule } from './domain/users/users.module';
import { AmoCrmModule } from './external/amo-crm/amo-crm.module';
import { AxiosModule } from './infrastructure/axios/axios.module';
import { IntegrationModule } from './domain/integration/integration.module';
import { ConfigModule } from '@nestjs/config';
import { SenlerService } from './external/senler/senler.service';
import { WebhooksModule } from './domain/integration/webhooks/webhooks.module';
import { AppConfig, appConfigValidationSchema } from './infrastructure/config/config.app-config';
import { CustomConfigModule } from './infrastructure/config/config.module';


@Module({
  imports: [
    CustomConfigModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [() => AppConfig],
      validationSchema: appConfigValidationSchema,
    }),

    // Resources
    UsersModule,
    IntegrationModule,
    WebhooksModule,

    // External services
    AmoCrmModule,

    // Infrastructure modules
    LoggingModule.forRoot(),
    AxiosModule.forRoot(),

  ],

  controllers: [
    AppController
  ],

  providers: [
    AppService,

    SenlerService,

    { provide: APP_GUARD, useClass: AuthGuard, },

    { provide: APP_FILTER, useClass: HttpExceptionFilter, },

    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor, },
    { provide: APP_INTERCEPTOR, useClass: ProcessTimeInterceptor, },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        RequestIdMiddleware,
        RequestLoggerMiddleware,
      )
      .forRoutes("*");
  }
}
