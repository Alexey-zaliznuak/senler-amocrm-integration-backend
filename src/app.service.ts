import { HttpStatus, INestApplication, Injectable, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NodeEnv } from './infrastructure/config/config.validation-schema';


@Injectable()
export class AppService {
  public static setupSwaggerDocument(app: INestApplication, port: number) {
    let config = new DocumentBuilder()
    .setTitle('Title')
    .setDescription('Description')
    .setVersion('1.0')
    .addTag('Tag');

    if (process.env.NODE_ENV === NodeEnv.development) {
      config.addServer(`http://localhost:${port}`, "local")
      config.addServer(process.env.DEV_SERVER_URL, "dev server")
    }

    const documentFactory = () => SwaggerModule.createDocument(app, config.build());

    SwaggerModule.setup('api/docs', app, documentFactory);
    }

  public static setupValidation(app: INestApplication) {
    app.useGlobalPipes(new ValidationPipe({errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY}));
  }

  public static removePoweredByHeader(app: INestApplication) {
    app.getHttpAdapter().getInstance().disable('x-powered-by');
  }
}
