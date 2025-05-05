import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { AppService } from './app.service';
import { AppConfigType } from './infrastructure/config/config.app-config';
import { AckPolicy } from 'nats';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get<AppConfigType>('CONFIG');

  app.setGlobalPrefix('api');

  AppService.setupSwaggerDocument(app);
  AppService.removePoweredByHeader(app);
  AppService.setupValidation(app);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.NATS,
    options: {
      servers: [process.env.NATS_URL],
      queue: 'workers',
      // ackPolicy: AckPolicy.All,
      // maxDeliver: 3,
      // durable: 'INTEGRATION_SYNC_VARS_CONSUMER',
    },
  });
  // app.connectMicroservice<MicroserviceOptions>({
  //   transport: Transport.RMQ,
  //   options: {
  //     urls: ['amqp://localhost:5672'],
  //     queue: 'senler-amo-crm-integration-transferring-queue',
  //     queueOptions: { durable: true },
  //     exchange: 'senler-amo-crm-integration-transferring',
  //     prefetchCount: 1,
  //     noAck: false,
  //   },
  // });

  await app.startAllMicroservices();

  await app.listen(config.PORT);
}

bootstrap();
