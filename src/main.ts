import { AppConfigType } from './../logs/config/config.app-config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { AppService } from './app.service';
import { AppConfig } from 'logs/config/config.app-config';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get<AppConfigType>("CONFIG");
  const port = configService.PORT

  console.warn(port)

  app.getHttpAdapter().getInstance().disable('x-powered-by');

  app.useGlobalPipes(new ValidationPipe({errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY}));

  AppService.setupSwaggerDocument(app, port);

  await app.listen(port);
}
bootstrap();
