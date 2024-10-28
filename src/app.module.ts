import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './domain/auth/auth.module';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { HttpExceptionFilter } from './infrastructure/filters/http-exception.filter';
import { winstonOptions } from './infrastructure/logging/logging.config';
import { LoggingMiddleware } from './infrastructure/logging/logging.middleware';
import { LoggingModule } from './infrastructure/logging/logging.module';
import { AuthGuard } from './infrastructure/auth/auth.guard';
import { ProcessTimeMiddleware, RequestIdMiddleware } from './infrastructure/middlewares';
import { RequestLoggerMiddleware } from './infrastructure/logging/request-logger.middleware';
import { AuthController } from './domain/auth/auth.controller';
import { ResponseTimeInterceptor } from './infrastructure/interceptors';


@Module({
  imports: [
    LoggingModule.forRoot(winstonOptions),
  ],

  controllers: [AppController, AuthController],

  providers: [
    AppService,
    { provide: APP_GUARD, useClass: AuthGuard, },
    { provide: APP_FILTER, useClass: HttpExceptionFilter, },
    { provide: APP_INTERCEPTOR, useClass: ResponseTimeInterceptor, },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        RequestIdMiddleware,
        RequestLoggerMiddleware,
        LoggingMiddleware,
      )
      .forRoutes("*");
  }
}
