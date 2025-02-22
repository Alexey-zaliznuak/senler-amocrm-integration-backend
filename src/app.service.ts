import { HttpStatus, INestApplication, Injectable, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

@Injectable()
export class AppService {
  public static setupSwaggerDocument(app: INestApplication) {
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
