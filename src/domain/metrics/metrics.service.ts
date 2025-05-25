import { Injectable } from '@nestjs/common';
import { Registry } from 'prom-client';
import { PrismaCacheExtensionService } from 'src/infrastructure/database/extensions';
import * as si from 'systeminformation';
import { MicroserviceCounter as Counter, MicroserviceGauge as Gauge } from './metrics.microservice-gauge';

@Injectable()
export class MetricsService {
  private registry: Registry;

  // CPU Metrics
  private cpuUser: Gauge<string>;
  private cpuSystem: Gauge<string>;
  private cpuIdle: Gauge<string>;
  private cpuTotal: Gauge<string>;

  // RAM Metrics
  private ramTotal: Gauge<string>;
  private ramUsed: Gauge<string>;
  private ramFree: Gauge<string>;
  private ramActive: Gauge<string>;

  // Database Metrics
  private dbCacheHits: Counter<string>;
  private dbCacheMisses: Counter<string>;
  private dbCacheErrors: Counter<string>;
  private dbCacheReconnections: Counter<string>;
  private dbCacheHitRatio: Gauge<string>;

  constructor(private readonly prisma: PrismaCacheExtensionService) {
    this.registry = new Registry();

    this.cpuUser = new Gauge({
      name: 'cpu_user_usage_percent',
      help: 'Percentage of CPU time spent on user processes',
      registers: [this.registry],
    });

    this.cpuSystem = new Gauge({
      name: 'cpu_system_usage_percent',
      help: 'Percentage of CPU time spent on system processes',
      registers: [this.registry],
    });

    this.cpuIdle = new Gauge({
      name: 'cpu_idle_percent',
      help: 'Percentage of CPU time spent idle',
      registers: [this.registry],
    });

    this.cpuTotal = new Gauge({
      name: 'cpu_total_usage_percent',
      help: 'Total CPU usage percentage',
      registers: [this.registry],
    });

    this.ramTotal = new Gauge({
      name: 'ram_total_mb',
      help: 'Total RAM in megabytes',
      registers: [this.registry],
    });

    this.ramUsed = new Gauge({
      name: 'ram_used_mb',
      help: 'Used RAM in megabytes',
      registers: [this.registry],
    });

    this.ramFree = new Gauge({
      name: 'ram_free_mb',
      help: 'Free RAM in megabytes',
      registers: [this.registry],
    });

    this.ramActive = new Gauge({
      name: 'ram_active_mb',
      help: 'Active RAM in megabytes',
      registers: [this.registry],
    });

    this.dbCacheHits = new Counter({
      name: 'db_cache_hits_total',
      help: 'Total number of database cache hits',
      registers: [this.registry],
    });

    this.dbCacheMisses = new Counter({
      name: 'db_cache_misses_total',
      help: 'Total number of database cache misses',
      registers: [this.registry],
    });

    this.dbCacheErrors = new Counter({
      name: 'db_cache_errors_total',
      help: 'Total number of database cache errors',
      registers: [this.registry],
    });

    this.dbCacheReconnections = new Counter({
      name: 'db_cache_reconnections_total',
      help: 'Total number of database cache reconnections',
      registers: [this.registry],
    });

    this.dbCacheHitRatio = new Gauge({
      name: 'db_cache_hit_ratio_percent',
      help: 'Percentage of successful cache hits',
      registers: [this.registry],
    });
  }

  async updateMetrics() {
    const [cpuMetrics, ramMetrics, dbMetrics] = await Promise.all([
      this.getCpuMetrics(),
      this.getRamMetrics(),
      this.getDatabaseMetrics(),
    ]);

    // CPU metrics
    this.cpuUser.set(parseFloat(cpuMetrics.cpuLoad.user));
    this.cpuSystem.set(parseFloat(cpuMetrics.cpuLoad.system));
    this.cpuIdle.set(parseFloat(cpuMetrics.cpuLoad.idle));
    this.cpuTotal.set(parseFloat(cpuMetrics.cpuLoad.total));

    // RAM metrics
    this.ramTotal.set(ramMetrics.totalMB);
    this.ramUsed.set(ramMetrics.usedMB);
    this.ramFree.set(ramMetrics.freeMB);
    this.ramActive.set(ramMetrics.activeMB);

    // Database metrics
    this.dbCacheHits.inc(dbMetrics.hits);
    this.dbCacheMisses.inc(dbMetrics.misses);
    this.dbCacheErrors.inc(dbMetrics.errors);
    this.dbCacheReconnections.inc(dbMetrics.reconnections);
    this.dbCacheHitRatio.set(parseFloat(dbMetrics.hitsRatio));
  }

  async getMetrics() {
    await this.updateMetrics();
    return this.registry.metrics();
  }

  private async getCpuMetrics() {
    const [cpuCurrent] = await Promise.all([si.currentLoad()]);

    return {
      cpuLoad: {
        user: cpuCurrent.cpus[0].loadUser.toFixed(2),
        system: cpuCurrent.cpus[0].loadSystem.toFixed(2),
        idle: cpuCurrent.cpus[0].loadIdle.toFixed(2),
        total: cpuCurrent.currentLoad.toFixed(2),
      },
    };
  }

  private async getRamMetrics() {
    const mem = await si.mem();

    return {
      totalMB: Math.round(mem.total / 1024 / 1024),
      usedMB: Math.round(mem.used / 1024 / 1024),
      freeMB: Math.round(mem.free / 1024 / 1024),
      activeMB: Math.round(mem.active / 1024 / 1024),
    };
  }

  private async getDatabaseMetrics() {
    return this.prisma.cacheStatistics;
  }
}
