import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppService } from './app.service';
import { AppConfigType } from './infrastructure/config/config.app-config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({
      json: true,
    }),
  });

  const config = app.get<AppConfigType>('CONFIG');

  app.setGlobalPrefix('/api');

  AppService.setupSwaggerDocument(app);
  AppService.removePoweredByHeader(app);
  AppService.setupValidation(app);

  await app.startAllMicroservices();

  await app.listen(config.PORT);
}

bootstrap();
