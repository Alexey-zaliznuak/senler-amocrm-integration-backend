import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiQuery, ApiResponse } from '@nestjs/swagger';
import { CreateIntegrationStepTemplateRequest, CreateIntegrationStepTemplateResponseDto } from './dto/create-senler-group.dto';
import {
  GetIntegrationStepTemplateResponseDto
} from './dto/get-senler-group.dto';
import { IntegrationStepTemplatesService } from './senler-groups.service';

@Controller('integrationStepTemplates')
export class IntegrationStepTemplateController {
  constructor(private readonly integrationStepTemplatesService: IntegrationStepTemplatesService) {}

  @Post('')
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: CreateIntegrationStepTemplateResponseDto,
    description: 'Success created new integration step template.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Conflict when creating new integration step template.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid provided credentials.',
  })
  async create(@Body() data: CreateIntegrationStepTemplateRequest): Promise<CreateIntegrationStepTemplateRequest> {
    return await this.integrationStepTemplatesService.create(data);
  }

  @Get(':identifier/')
  @ApiQuery({ name: 'id' })
  @ApiResponse({ type: GetIntegrationStepTemplateResponseDto })
  async getByUniqueField(
    @Param('id') id: string,
  ): Promise<GetIntegrationStepTemplateResponseDto> {
    return await this.integrationStepTemplatesService.getById(id);
  }
}
