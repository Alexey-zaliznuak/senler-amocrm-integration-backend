import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse } from '@nestjs/swagger';
import { CreateSenlerGroupRequestDto, CreateSenlerGroupResponseDto } from './dto/create-senler-group.dto';
import { SenlerGroupsService } from './senler-groups.service';
import { GetSenlerGroupResponse, SenlerGroupFieldForGetByUniqueField, SenlerGroupFieldForGetByUniqueFieldEnum } from './dto/get-senler-group.dto';


@Controller('senlerGroups')
export class SenlerGroupsController {
  constructor(private readonly senlerGroupsService: SenlerGroupsService) {}

  @Post('')
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Success created new senler group.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Conflict when creating new senler group.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid AmoCrm domain name.',
  })
  async create(@Body() data: CreateSenlerGroupRequestDto): Promise<CreateSenlerGroupResponseDto> {
    return await this.senlerGroupsService.create(data);
  }

  @Get(':identifier/')
  @ApiQuery({ name: 'field', enum: SenlerGroupFieldForGetByUniqueFieldEnum })
  async getByUniqueField(
    @Param('identifier') identifier: string,
    @Query('field') field: SenlerGroupFieldForGetByUniqueField,
  ): Promise<GetSenlerGroupResponse> {
    return await this.senlerGroupsService.getByUniqueField(identifier, field);
  }
}
