import { Injectable } from '@nestjs/common';
import { PrismaCacheExtensionService } from 'src/infrastructure/database/extensions';
import * as si from 'systeminformation';


@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaCacheExtensionService) {}
  async getAllMetrics() {
    const [cpu, ram, database] = await Promise.all([this.getCpuMetrics(), this.getRamMetrics(), this.getDatabaseMetrics()]);
    return { cpu, ram, database };
  }

  private async getCpuMetrics() {
    const [cpuCurrent, cpuTime] = await Promise.all([si.currentLoad(), si.time()]);

    return {
      cpuLoad: {
        user: cpuCurrent.cpus[0].loadUser.toFixed(2),
        system: cpuCurrent.cpus[0].loadSystem.toFixed(2),
        idle: cpuCurrent.cpus[0].loadIdle.toFixed(2),
        total: cpuCurrent.currentLoad.toFixed(2),
      },
      uptime: {
        days: Math.floor(cpuTime.uptime / 86400),
        hours: Math.floor((cpuTime.uptime % 86400) / 3600),
        minutes: Math.floor((cpuTime.uptime % 3600) / 60),
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

  private getDatabaseMetrics() {
    return {
      postgres: {
        cache: this.prisma.cacheStatistics,
      },
    };
  }
}
