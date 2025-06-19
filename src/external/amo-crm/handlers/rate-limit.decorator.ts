import { AppConfig } from 'src/infrastructure/config/config.app-config';
import { LoggingService } from 'src/infrastructure/logging/logging.service';

/*
 * Для работы необходимо:
 * 1. в первом аргумента передавать объект вида { amoCrmDomainName: string, ... }
 * 2. в классе иметь this.rateLimitsService: RateLimitsService
 * 3. в классе иметь this.prisma: PrismaExtendedClientType
 */
export function UpdateRateLimitAndThrowIfNeed(increment: number = 1) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const contextName = this?.constructor?.name || 'unknown';
      const logger = new LoggingService(AppConfig).createLogger();
      logger.info(`DEBUG [UpdateRateLimit] Called in context: ${contextName}`);
      logger.info(`DEBUG [UpdateRateLimit] Available keys on 'this':`, Object.keys(this));
      logger.info(`DEBUG [UpdateRateLimit] typeof this.rateLimitsService: ${typeof this.rateLimitsService}`);
      logger.info('DEBUG [UpdateRateLimit] Object.keys(rateLimitsService):', Object.keys(this.rateLimitsService));
      logger.info('DEBUG [UpdateRateLimit] Object.getOwnPropertyNames(rateLimitsService):', Object.getOwnPropertyNames(this.rateLimitsService));
      logger.info('DEBUG [UpdateRateLimit] Object.getPrototypeOf(rateLimitsService):', Object.getPrototypeOf(this.rateLimitsService));
      logger.info('DEBUG [UpdateRateLimit] Object.getOwnPropertyNames(proto):', Object.getOwnPropertyNames(Object.getPrototypeOf(this.rateLimitsService)));
      await this.rateLimitsService.updateRateLimitAndThrowIfNeed(args[0].amoCrmDomainName, increment);
      return await originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
