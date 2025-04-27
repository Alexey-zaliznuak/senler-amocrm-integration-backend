import { Module } from '@nestjs/common';
import { NatsService } from './nats.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AppConfig } from '../config/config.app-config';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'NATS_CLIENT',
        transport: Transport.NATS,
        options: {
          servers: [AppConfig.NATS_URL],

        },
      },
    ]),
  ],
  exports: [ClientsModule, NatsService],
  providers: [NatsService]
})
export class NatsModule {}
