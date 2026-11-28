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
  Query,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

import { Public } from '../../shared/auth'
import {
  CreateMilitaryRankDto,
  CreatePersonPromotionDto,
  type MilitaryRankResponseDto,
  type PersonPromotionResponseDto,
  UpdateMilitaryRankDto,
} from './military-rank.dto'
import { MilitaryRankService } from './military-rank.service'

@ApiTags('military-ranks')
@Controller('military-ranks')
export class MilitaryRankController {
  constructor(private readonly militaryRankService: MilitaryRankService) {}

  @Public()
  @Get()
  async list(
    @Query('q') q?: string,
    @Query('countryId') countryId?: string,
    @Query('historicalCountryId') historicalCountryId?: string,
    @Query('branch') branch?: string,
    @Query('category') category?: string,
    @Query('includeUniversal') includeUniversal?: string,
  ): Promise<MilitaryRankResponseDto[]> {
    return this.militaryRankService.list({
      q,
      countryId,
      historicalCountryId,
      branch,
      category,
      includeUniversal: includeUniversal !== 'false' && includeUniversal !== '0',
    })
  }

  @Post()
  async create(
    @Body() body: CreateMilitaryRankDto,
  ): Promise<MilitaryRankResponseDto> {
    return this.militaryRankService.createOrResolve(body)
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateMilitaryRankDto,
  ): Promise<MilitaryRankResponseDto> {
    return this.militaryRankService.update(id, body)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.militaryRankService.delete(id)
  }

  @Public()
  @Get('promotions/person/:personId')
  async listPromotionsByPerson(
    @Param('personId') personId: string,
  ): Promise<PersonPromotionResponseDto[]> {
    return this.militaryRankService.listPromotionsByPerson(personId)
  }

  @Post('promotions')
  async addPromotion(
    @Body() body: CreatePersonPromotionDto,
  ): Promise<PersonPromotionResponseDto> {
    return this.militaryRankService.addPromotion(body)
  }

  @Delete('promotions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removePromotion(@Param('id') id: string): Promise<void> {
    await this.militaryRankService.deletePromotion(id)
  }
}
