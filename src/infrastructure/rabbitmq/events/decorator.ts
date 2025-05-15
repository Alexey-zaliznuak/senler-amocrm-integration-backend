// src/amqp/amqp-event-pattern.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const AMQP_EVENT_PATTERN = 'AMQP_EVENT_PATTERN';

/**
 * Декоратор для подписки на сообщения из очереди AMQP.
 *
 * @param queue Имя очереди, на которую нужно подписаться
 */
export const AmqpEventPattern = (queue: string) => {
  return SetMetadata(AMQP_EVENT_PATTERN, queue);
};
