import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LogsService } from './logs.service';
import { IntegrationSecretGuard } from 'src/infrastructure/auth/integration-secret.guard';

@ApiTags('Logs')
@Controller('logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  @ApiQuery({ name: 'requestId', required: false })
  @ApiQuery({ name: 'leadId', required: false })
  @ApiQuery({ name: 'groupId', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'start',
    required: false,
    type: Number,
    description: 'Timestamp in milliseconds',
  })
  @ApiQuery({
    name: 'end',
    required: false,
    type: Number,
    description: 'Timestamp in milliseconds',
  })
  @ApiResponse({ status: 200, description: 'Logs retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid parameters' })
  @ApiResponse({ status: 503, description: 'Log service unavailable' })
  @UseGuards(IntegrationSecretGuard)
  async getLogs(
    @Query('requestId') requestId?: string,
    @Query('leadId') leadId?: string,
    @Query('groupId') groupId?: string,
    @Query('limit') limit?: number,
    @Query('start') start?: number,
    @Query('end') end?: number
  ) {
    const labels: Record<string, string> = {};

    if (requestId) labels.requestId = requestId;
    if (leadId) labels.leadId = leadId;
    if (groupId) labels.groupId = groupId;

    if (Object.keys(labels).length === 0) {
      throw new BadRequestException('At least one label must be provided');
    }

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    try {
      // Конвертация timestamp в Date
      startDate = start ? new Date(start) : undefined;
      endDate = end ? new Date(end) : undefined;

      // Валидация полученных дат
      if (start && isNaN(startDate.getTime())) throw new BadRequestException('Invalid start timestamp');
      if (end && isNaN(endDate.getTime())) throw new BadRequestException('Invalid end timestamp');

      // Проверка что end не раньше start
      if (startDate && endDate && startDate > endDate) {
        throw new BadRequestException('Start date cannot be after end date');
      }
    } catch (e) {
      throw new BadRequestException(e.message || 'Invalid timestamp format');
    }

    return await this.logsService.getLogsByLabels(labels, limit, startDate, endDate);
    return this.logsService.formatBotStepWebhookLogs(await this.logsService.getLogsByLabels(labels, limit, startDate, endDate));
  }
}
