import { HttpStatus, INestApplication, Injectable, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppConfigType } from './infrastructure/config/config.app-config';

@Injectable()
export class AppService {
  public static setupSwaggerDocument(app: INestApplication, appConfig: AppConfigType) {
    const config = new DocumentBuilder()
      .setTitle('Title')
      .setDescription('Description')
      .setVersion('1.0')
      .addTag('Tag')
      .addSecurity('header-integration-secret', {
        type: 'apiKey',
        in: 'header',
        name: 'x-integration-secret',
      })
      .addSecurityRequirements('header-integration-secret');

    appConfig.OPENAPI_SERVER_URLS.forEach(url => {
      config.addServer(url);
    });

    const documentFactory = () => SwaggerModule.createDocument(app, config.build());

    SwaggerModule.setup('api/docs', app, documentFactory);
  }

  public static setupValidation(app: INestApplication) {
    app.useGlobalPipes(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
        whitelist: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      })
    );
  }

  public static removePoweredByHeader(app: INestApplication) {
    app.getHttpAdapter().getInstance().disable('x-powered-by');
  }
}
