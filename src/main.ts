import { AppConfigType } from './../logs/config/config.app-config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppService } from './app.service';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get<AppConfigType>("CONFIG");
  const port = configService.PORT

  AppService.setupSwaggerDocument(app, port);
  AppService.removePoweredByHeader(app);
  AppService.setupValidation(app);

  await app.listen(port);
}
bootstrap();
