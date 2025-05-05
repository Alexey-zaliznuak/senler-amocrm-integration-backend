import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

export const RABBITMQ = "RABBITMQ"

@Module({
  imports: [
    ClientsModule.register([
      {
        name: RABBITMQ,
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://administrator5657654335678675645356:administrator5657654335678675645356@localhost:5672'],
          queue: 'senler-amo-crm-transferring',
          exchange: 'senler-amo-crm-transferring-exchange',
          queueOptions: {
            durable: true,
            exclusive: false,
            autoDelete: false,
            arguments: {
              'x-dead-letter-exchange': 'senler-amo-crm-transferring-delayed-exchange', // DLX для фейлов
              'x-dead-letter-routing-key': 'senler.amo-crm.transferring.delayed'
            },
            channel: {
              assertExchange: true,
              exchangeType: 'direct',
              exchangeOptions: {
                durable: true,
                internal: false,
              },
              bindings: [
                {
                  routingKey: 'senler.amo-crm.transferring',
                  queue: 'senler-amo-crm-transferring',
                },
                // Для отложенной очереди
                {
                  exchange: 'senler-amo-crm-transferring-delayed-exchange',
                  routingKey: 'senler.amo-crm.transferring.delayed',
                  queue: 'senler-amo-crm-transferring-delayed',
                  args: {
                    'x-dead-letter-exchange': 'senler-amo-crm-transferring-exchange', // Циклическая обработка
                    'x-message-ttl': 30000 // 30 секунд задержки
                  }
                }
              ]
            }
          },
          prefetchCount: 10,
          noAck: false,
        },
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class RabbitmqModule {}
