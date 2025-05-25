/**
 * Извлекает имя домена в амо, для него проверяет лимит(берется из бд)
 *
 * Если не превышен - увеличивает его
 *
 * Если превышен - выбрасывает исключение
 *
 * Для работы необходимо:
 * 1. в первом аргумента передавать объект вида { amoCrmDomainName: string, ... }
 * 2. в классе иметь this.rateLimitsService: RateLimitsService
 * 3. в классе иметь this.prisma: PrismaExtendedClientType
 */
export function UpdateRateLimitAndThrowIfNeed(increment: number = 1) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      await this.rateLimitsService.updateRateLimitAndThrowIfNeed(args[0].amoCrmDomainName, increment);
      return await originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
