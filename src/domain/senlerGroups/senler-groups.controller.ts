import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { CreateSenlerGroupRequestDto, CreateSenlerGroupResponseDto } from './dto/create-senler-group.dto';
import {
  GetSenlerGroupResponseDto,
  SenlerGroupFieldForGetByUniqueField,
  SenlerGroupFieldForGetByUniqueFieldEnum,
} from './dto/get-senler-group.dto';
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

  @Get(':identifier/')
  @ApiQuery({ name: 'field', enum: SenlerGroupFieldForGetByUniqueFieldEnum })
  @ApiParam({ name: 'identifier' })
  @ApiResponse({type: GetSenlerGroupResponseDto})
  async getByUniqueField(
    @Param('identifier') identifier: string | number,
    @Query('field') field: SenlerGroupFieldForGetByUniqueField
  ): Promise<GetSenlerGroupResponseDto> {
    return await this.senlerGroupsService.getByUniqueField(identifier, field);
  }
}
