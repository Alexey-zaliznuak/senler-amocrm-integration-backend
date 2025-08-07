import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiBody, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import {
  CreateIntegrationStepTemplateRequestDto,
  CreateIntegrationStepTemplateResponseDto,
} from './dto/create-integration-step-template.dto';
import { GetIntegrationStepTemplateResponseDto } from './dto/get-integration-step-template.dto';
import {
  UpdateIntegrationStepTemplateRequestDto,
  UpdateIntegrationStepTemplateResponseDto,
} from './dto/update-integration-step-template.dto';
import { IntegrationStepTemplatesService } from './integration-step-template.service';

@Controller('integrationStepTemplates')
export class IntegrationStepTemplatesController {
  constructor(private readonly integrationStepTemplatesService: IntegrationStepTemplatesService) {}

  @Get(':identifier/')
  @ApiQuery({ name: 'id' })
  @ApiParam({ name: 'identifier' })
  @ApiResponse({ type: GetIntegrationStepTemplateResponseDto })
  async getById(@Param('id') id: string): Promise<GetIntegrationStepTemplateResponseDto> {
    return await this.integrationStepTemplatesService.getById(id);
  }

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
  async create(@Body() data: CreateIntegrationStepTemplateRequestDto): Promise<CreateIntegrationStepTemplateRequestDto> {
    return await this.integrationStepTemplatesService.create(data);
  }

  @Patch(':identifier')
  @HttpCode(HttpStatus.CREATED)
  @ApiBody({ type: UpdateIntegrationStepTemplateRequestDto })
  @ApiParam({ name: 'identifier' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid provided credentials.',
    type: UpdateIntegrationStepTemplateResponseDto,
  })
  async update(
    @Body() data: CreateIntegrationStepTemplateRequestDto,
    @Param('identifier') id: string
  ): Promise<UpdateIntegrationStepTemplateResponseDto> {
    return await this.integrationStepTemplatesService.update(data, id);
  }

  @Delete(':identifier')
  @ApiParam({ name: 'identifier' })
  async deleteById(@Param('identifier') id: string): Promise<void> {
    return await this.integrationStepTemplatesService.deleteById(id);
  }
}
