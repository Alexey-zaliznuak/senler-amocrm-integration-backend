import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { Logger } from 'winston';
import { LOGGER_INJECTABLE_NAME } from '../rabbitmq.config';
import { AmqpService } from './amqp.service';
import { AMQP_EVENT_PATTERN } from './decorator';

@Injectable()
export class AmqpHandlerService implements OnModuleInit {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
    private readonly amqpService: AmqpService,
    @Inject(LOGGER_INJECTABLE_NAME) private readonly logger: Logger
  ) {}

  async onModuleInit() {
    await this.registerEventHandlers();
  }

  private async registerEventHandlers() {
    const providers = this.discoveryService.getProviders();
    const controllers = this.discoveryService.getControllers();

    // Обрабатываем провайдеры
    const staticProviders = providers.filter(wrapper => wrapper.isDependencyTreeStatic());

    for (const wrapper of staticProviders) {
      await this.processProvider(wrapper);
    }

    // Обрабатываем контроллеры
    const staticControllers = controllers.filter(wrapper => wrapper.isDependencyTreeStatic());

    for (const wrapper of staticControllers) {
      await this.processProvider(wrapper);
    }
  }

  private async processProvider(wrapper: InstanceWrapper) {
    const { instance } = wrapper;

    // Пропускаем, если инстанс не существует
    if (!instance || typeof instance !== 'object') return;

    // Получаем прототип объекта для сканирования методов
    const prototype = Object.getPrototypeOf(instance);

    // Сканируем все методы
    this.metadataScanner.scanFromPrototype(instance, prototype, async methodName => {
      await this.processMethod(instance, methodName);
    });
  }

  private async processMethod(instance: any, methodName: string) {
    // Получаем оригинальный метод
    const methodRef = instance[methodName];

    if (!methodRef || typeof methodRef !== 'function') return;

    // Проверяем наличие декоратора через разные способы
    let queue = this.reflector.get(AMQP_EVENT_PATTERN, methodRef);

    // Дополнительно пробуем получить метаданные через прототип класса
    // Это может помочь, если декоратор привязан не так, как ожидается
    if (!queue) {
      const prototype = Object.getPrototypeOf(instance);
      const descriptor = Object.getOwnPropertyDescriptor(prototype, methodName);
      if (descriptor && descriptor.value) {
        queue = this.reflector.get(AMQP_EVENT_PATTERN, descriptor.value);
      }
    }

    // Если всё же нашли декоратор
    if (queue) {
      this.logger.info(`Registering AMQP handler for queue [${queue}] on ${instance.constructor.name}.${methodName}`);

      // Создаем обработчик, привязывая метод к экземпляру класса
      const handler = async (content: any, msg: any) => {
        try {
          return await methodRef.call(instance, content, msg);
        } catch (error) {
          this.logger.error(`Error in handler for queue [${queue}]:`, error);
          throw error;
        }
      };

      // Регистрируем обработчик
      await this.amqpService.addHandler(queue, handler);
    }
  }
}
