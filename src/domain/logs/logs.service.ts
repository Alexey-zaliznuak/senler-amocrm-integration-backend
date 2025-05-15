import { BadRequestException, Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { CustomAxiosInstance } from 'src/infrastructure/axios/instance';
import { AppConfigType } from 'src/infrastructure/config/config.app-config';
import { CONFIG } from 'src/infrastructure/config/config.module';
import { Logger } from 'winston';
import { AXIOS_INJECTABLE_NAME, LOGGER_INJECTABLE_NAME } from './logs.config';

@Injectable()
export class LogsService {
  private readonly auth: { username: string; password: string };

  constructor(
    @Inject(CONFIG) private readonly appConfig: AppConfigType,
    @Inject(AXIOS_INJECTABLE_NAME) private readonly axios: CustomAxiosInstance,
    @Inject(LOGGER_INJECTABLE_NAME) private readonly logger: Logger
  ) {
    this.auth = {
      username: "this.appConfig.LOKI_USERNAME",
      password: "this.appConfig.LOKI_AUTH_TOKEN",
    };
  }

  async getLogsByLabels(labels: Record<string, string>, limit: number = 5000, start?: Date, end?: Date) {
    if (Object.keys(labels).length === 0) {
      throw new BadRequestException('At least one label must be specified');
    }

    // Устанавливаем дефолтные значения времени
    const effectiveEnd = end ? new Date(end) : new Date();
    const effectiveStart = start ? new Date(start) : new Date(effectiveEnd.getTime() - 3600 * 1000);

    // Конвертируем в наносекунды
    const startNs = this.convertDateToNanoseconds(effectiveStart);
    const endNs = this.convertDateToNanoseconds(effectiveEnd);

    // Формируем LogQL запрос
    const labelString = Object.entries(labels)
      .map(([key, value]) => `${key}="${value}"`)
      .join(',');
    const query = `{${labelString}}`;

    try {
      const response = await this.axios.get(`host/loki/api/v1/query_range`, {
        params: {
          query,
          limit: Math.min(limit),
          start: startNs,
          end: endNs,
        },
        auth: this.auth,
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch logs from Loki', {
        error: error.message,
        settings: { labels, limit, start, end },
      });
      throw new ServiceUnavailableException('Could not retrieve logs from storage');
    }
  }

  public formatBotStepWebhookLogs(response: any): TransformedResponse {
    const streams = response?.data?.result || [];
    const transformedStreams: TransformedLogWithSortKey[] = [];

    for (const stream of streams) {
      const parsedLogs = stream.values
        .map(([ns, log]) => {
          try {
            const parsedLog = JSON.parse(log);
            return {
              ...parsedLog,
              timestamp: new Date(parseInt(ns.slice(0, -6))).toISOString(),
              originalTimestamp: ns,
            };
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean)
        .sort((a, b) => b.originalTimestamp.localeCompare(a.originalTimestamp));

      if (parsedLogs.length === 0) continue;

      // Собираем профиль (от старых к новым, последние значения имеют приоритет)
      const profile = { body: {}, leadId: '', groupId: '', status: '', requestTitle: '' };

      // Идем в обратном порядке для аккумуляции последних значений
      [...parsedLogs].reverse().forEach(log => {
        profile.leadId = this.hasMeaningfulValue(log.labels?.leadId) ? log.labels.leadId : profile.leadId;
        profile.groupId = this.hasMeaningfulValue(log.labels?.groupId) ? log.labels.groupId : profile.groupId;
        profile.status = this.hasMeaningfulValue(log.status) ? log.status : profile.status;
        profile.requestTitle = log.requestTitle ? log.requestTitle : profile.requestTitle;
        if (log.body) profile.body = { ...profile.body, ...log.body };
      });

      const firstLogTimestamp = parsedLogs[parsedLogs.length - 1].originalTimestamp;

      transformedStreams.push({
        profile,
        data: parsedLogs.map(log => ({
          timestamp: log.timestamp,
          message: log.message,
          level: log.level,
          context: log.context,
          ...log,
        })),
        _sortKey: firstLogTimestamp,
      });
    }

    // Сортируем стримы по времени первого лога (от новых к старым)
    const sortedStreams = transformedStreams
      .sort((a, b) => b._sortKey.localeCompare(a._sortKey))
      .map(({ _sortKey, ...rest }) => rest);

    return {
      count: sortedStreams.length,
      logs: sortedStreams,
    };
  }

  private hasMeaningfulValue(value: any): boolean {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') return value.trim() !== '';
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
  }

  private convertDateToNanoseconds(date: Date): string {
    return (date.getTime() * 1e6).toString();
  }
}
