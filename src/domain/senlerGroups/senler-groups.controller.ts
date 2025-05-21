import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { CreateSenlerGroupRequestDto, CreateSenlerGroupResponseDto } from './dto/create-senler-group.dto';
import {
  GetSenlerGroupResponseDto,
  SenlerGroupFieldForGetByUniqueField,
  SenlerGroupFieldForGetByUniqueFieldEnum,
} from './dto/get-senler-group.dto';
import { UpdateSenlerGroupAmoCrmCredentialsRequestDto } from './dto/update-senler-group.dto';
import { SenlerGroupsService } from './senler-groups.service';

@Controller('senlerGroups')
export class SenlerGroupsController {
  constructor(private readonly senlerGroupsService: SenlerGroupsService) {}

  @Post('')
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: CreateSenlerGroupResponseDto,
    description: 'Success created new senler group.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Conflict when creating new senler group.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid amoCRM domain name.',
  })
  async create(@Body() data: CreateSenlerGroupRequestDto): Promise<CreateSenlerGroupResponseDto> {
    return await this.senlerGroupsService.create(data);
  }

  @Put(':identifier/amoCrmToken')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid amoCRM domain name.',
  })
  async updateAmoCrmCredentials(@Body() data: UpdateSenlerGroupAmoCrmCredentialsRequestDto): Promise<any> {
    return 'STAGED';
  }

  @Get(':identifier/')
  @ApiQuery({ name: 'field', enum: SenlerGroupFieldForGetByUniqueFieldEnum })
  @ApiParam({ name: 'identifier' })
  @ApiResponse({ type: GetSenlerGroupResponseDto })
  async getByUniqueField(
    @Param('identifier') identifier: string | number,
    @Query('field') field: SenlerGroupFieldForGetByUniqueField
  ): Promise<GetSenlerGroupResponseDto> {
    if (!identifier || !field) {
      throw new BadRequestException('No identifier or field provided');
    }
    return await this.senlerGroupsService.getByUniqueField(identifier, field);
  }

  @Delete(':identifier/')
  @ApiQuery({ name: 'field', enum: SenlerGroupFieldForGetByUniqueFieldEnum })
  @ApiParam({ name: 'identifier' })
  @ApiResponse({ type: GetSenlerGroupResponseDto })
  async deleteByUniqueField(
    @Param('identifier') identifier: string | number,
    @Query('field') field: SenlerGroupFieldForGetByUniqueField
  ): Promise<GetSenlerGroupResponseDto> {
    if (!identifier || !field) {
      throw new BadRequestException('No identifier or field provided');
    }
    return await this.senlerGroupsService.deleteByUniqueField(identifier, field);
  }
}
