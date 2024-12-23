import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { CreateSenlerGroupRequestDto, CreateSenlerGroupResponseDto } from './dto/create-senler-group.dto';
import { SenlerGroupsService } from './senler-groups.service';


@Controller('senlerGroups')
export class SenlerGroupsController {
  constructor(
    private readonly senlerGroupsService: SenlerGroupsService,
  ) {}

  @Post("")
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Conflict when creating new senler group.' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Success created new senler group.' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid AmoCrm domain name.' })
  async create(@Body() data: CreateSenlerGroupRequestDto): Promise<CreateSenlerGroupResponseDto> {
    return await this.senlerGroupsService.create(data)
  }
}
