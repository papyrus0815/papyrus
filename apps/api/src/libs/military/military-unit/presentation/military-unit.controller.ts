import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common'
import { MilitaryUnitService } from '../application/military-unit.service'
import type {
  CreateMilitaryUnitDto,
  CreateMilitaryUnitTransitionDto,
  UpdateMilitaryUnitDto,
  UpdateMilitaryUnitTransitionDto,
} from './dto'

@Controller('military-units')
export class MilitaryUnitController {
  constructor(private readonly militaryUnitService: MilitaryUnitService) {}

  @Patch('transitions/:transitionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateTransition(
    @Param('transitionId') transitionId: string,
    @Body() body: UpdateMilitaryUnitTransitionDto,
  ): Promise<void> {
    await this.militaryUnitService.updateTransition(transitionId, body)
  }

  @Delete('transitions/:transitionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTransition(
    @Param('transitionId') transitionId: string,
  ): Promise<void> {
    await this.militaryUnitService.deleteTransition(transitionId)
  }

  @Get()
  async getAll(
    @Query('countryId') countryId?: string,
    @Query('historicalCountryId') historicalCountryId?: string,
    @Query('search') search?: string,
    @Query('unitType') unitType?: string,
    @Query('branch') branch?: string,
  ): Promise<any> {
    return this.militaryUnitService.findAll({
      countryId,
      historicalCountryId,
      search,
      unitType,
      branch,
    })
  }

  @Get('country/:countryId')
  async getByCountryId(@Param('countryId') countryId: string): Promise<any> {
    return this.militaryUnitService.findAll({ countryId })
  }

  @Get(':id/tenures')
  async getUnitTenures(@Param('id') id: string): Promise<any[]> {
    return this.militaryUnitService.listTenures(id)
  }

  @Get(':id/events')
  async getUnitEvents(@Param('id') id: string): Promise<any[]> {
    return this.militaryUnitService.listEvents(id)
  }

  @Post(':id/transitions')
  async addTransition(
    @Param('id') id: string,
    @Body() body: CreateMilitaryUnitTransitionDto,
  ): Promise<any> {
    return this.militaryUnitService.addTransition(id, body)
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<any> {
    return this.militaryUnitService.findById(id)
  }

  @Post()
  async create(@Body() data: CreateMilitaryUnitDto): Promise<any> {
    return this.militaryUnitService.create(data)
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() data: UpdateMilitaryUnitDto,
  ): Promise<any> {
    return this.militaryUnitService.update(id, data)
  }

  @Patch(':id')
  async patchUpdate(
    @Param('id') id: string,
    @Body() data: UpdateMilitaryUnitDto,
  ): Promise<any> {
    return this.militaryUnitService.update(id, data)
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    return this.militaryUnitService.delete(id)
  }
}
