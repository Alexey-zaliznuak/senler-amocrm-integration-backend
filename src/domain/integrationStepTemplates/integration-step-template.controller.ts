import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBody, ApiQuery, ApiResponse } from '@nestjs/swagger';
import {
  CreateIntegrationStepTemplateRequest,
  CreateIntegrationStepTemplateRequestDto,
  CreateIntegrationStepTemplateResponseDto,
} from './dto/create-integration-step-template.dto';
import { GetIntegrationStepTemplateResponseDto } from './dto/get-integration-step-template.dto';
import { IntegrationStepTemplatesService } from './integration-step-template.service';

@Controller('integrationStepTemplates')
export class IntegrationStepTemplatesController {
  constructor(private readonly integrationStepTemplatesService: IntegrationStepTemplatesService) {}

  @Post('')
  @HttpCode(HttpStatus.CREATED)
  @ApiBody({ type: CreateIntegrationStepTemplateRequestDto })
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
  async create(@Body() data: CreateIntegrationStepTemplateRequestDto): Promise<CreateIntegrationStepTemplateRequest> {
    return await this.integrationStepTemplatesService.create(data);
  }

  @Get(':identifier/')
  @ApiQuery({ name: 'id' })
  @ApiResponse({ type: GetIntegrationStepTemplateResponseDto })
  async getByUniqueField(@Param('id') id: string): Promise<GetIntegrationStepTemplateResponseDto> {
    return await this.integrationStepTemplatesService.getById(id);
  }
}
