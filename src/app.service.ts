import { HttpStatus, INestApplication, Injectable, ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppConfigType } from './infrastructure/config/config.app-config';

@Injectable()
export class AppService {
  public static connectToRabbitMq(app: INestApplication, config: AppConfigType) {
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: {
        urls: [config.RABBITMQ_URL],
        queue: config.RABBITMQ_TRANSFER_QUEUE,
        queueOptions: {
          durable: true,
        },
        prefetchCount: 10,
        noAck: false,
      },
    });
  }
  public static setupSwaggerDocument(app: INestApplication) {
    const config = new DocumentBuilder()
      .setTitle('Senler-amoCRM integration')
      .setVersion('1.0')
      .addSecurity('header-integration-secret', {
        type: 'apiKey',
        in: 'header',
        name: 'x-integration-secret',
      })
      .addSecurityRequirements('header-integration-secret');

    const documentFactory = () => SwaggerModule.createDocument(app, config.build());

    SwaggerModule.setup('/api/docs', app, documentFactory);
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
