import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LogsService } from './logs.service';

@ApiTags('Logs')
@Controller('logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  @ApiQuery({ name: 'requestId', required: false })
  @ApiQuery({ name: 'leadId', required: false })
  @ApiQuery({ name: 'groupId', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'start', required: false, type: Date })
  @ApiQuery({ name: 'end', required: false, type: Date })
  @ApiResponse({ status: 200, description: 'Logs retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid parameters' })
  @ApiResponse({ status: 503, description: 'Log service unavailable' })
  async getLogs(
    @Query('requestId') requestId?: string,
    @Query('leadId') leadId?: string,
    @Query('groupId') groupId?: string,
    @Query('limit') limit?: number,
    @Query('start') start?: string,
    @Query('end') end?: string
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
      startDate = start ? new Date(start) : undefined;
      endDate = end ? new Date(end) : undefined;

      if (start && isNaN(startDate.getTime())) throw new Error('Invalid start date');
      if (end && isNaN(endDate.getTime())) throw new Error('Invalid end date');
    } catch (e) {
      throw new BadRequestException('Invalid date format. Use ISO 8601 format');
    }

    return this.logsService.formatBotStepWebhookLogs(await this.logsService.getLogsByLabels(labels, limit, startDate, endDate))
  }
}
