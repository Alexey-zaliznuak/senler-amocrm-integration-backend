import { Counter, CounterConfiguration, Gauge, GaugeConfiguration } from 'prom-client';
import { AppConfig } from 'src/infrastructure/config/config.app-config';

/**
 * Modify gauge name with prefix as microservice name.
 */
export class MicroserviceGauge<T extends string = string> extends Gauge {
  /**
   * @param configuration Configuration when creating a metric. Name and Help is mandatory
   */
  constructor(configuration: GaugeConfiguration<T>) {
    configuration.name = AppConfig.MICROSERVICE_NAME + '_' + configuration.name;
    super(configuration);
  }
}

/**
 * Modify counter name with prefix as microservice name.
 */
export class MicroserviceCounter<T extends string = string> extends Counter {
  /**
   * @param configuration Configuration when creating a metric. Name and Help is mandatory
   */
  constructor(configuration: CounterConfiguration<T>) {
    configuration.name = AppConfig.MICROSERVICE_NAME + '_' + configuration.name;
    super(configuration);
  }
}
