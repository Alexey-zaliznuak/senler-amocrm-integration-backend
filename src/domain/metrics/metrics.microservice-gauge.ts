import { Gauge, GaugeConfiguration } from 'prom-client';
import { AppConfig } from 'src/infrastructure/config/config.app-config';

export class MicroserviceGauge<T extends string = string> extends Gauge {
  /**
   * @param configuration Configuration when creating a Gauge metric. Name and Help is mandatory
   */
  constructor(configuration: GaugeConfiguration<T>) {
    configuration.name = AppConfig.MICROSERVICE_NAME + '_' + configuration.name;
    super(configuration);
  }
}
