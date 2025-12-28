import {
  Controller,
  HttpCode,
  HttpStatus,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { ContinentService } from '../application/continent.service'
import { CreateContinentDto } from './dto/create-continent.dto'
import { UpdateContinentDto } from './dto/update-continent.dto'
import { ContinentResponseDto } from './dto/continent.response'
import { Continent } from '../domain/continent.entity'

@ApiTags('continents')
@Controller('continents')
export class ContinentController {
  constructor(private readonly continentService: ContinentService) {}

  /**
   * 모든 대륙 조회
   *
   * @returns 대륙 목록
   * @tag continents
   */
  @Get()
  async getAllContinents(): Promise<ContinentResponseDto[]> {
    const continents = await this.continentService.getAllContinents()
    return continents.map((continent) => this.toResponseDto(continent))
  }

  /**
   * 대륙 상세 조회
   *
   * @param id 대륙 ID
   * @returns 대륙 정보
   * @tag continents
   */
  @Get(':id')
  async getContinentById(
    @Param('id') id: string,
  ): Promise<ContinentResponseDto> {
    const continent = await this.continentService.getContinentById(id)
    return this.toResponseDto(continent)
  }

  /**
   * 대륙 생성
   *
   * @param dto 대륙 생성 정보
   * @returns 생성된 대륙
   * @tag continents
   */
  @Post()
  async createContinent(
    @Body() dto: CreateContinentDto,
  ): Promise<ContinentResponseDto> {
    const continent = await this.continentService.createContinent({
      name: dto.name,
      enName: dto.enName,
      isoCode: dto.isoCode,
      areaSqKm: dto.areaSqKm,
      population: dto.population ? BigInt(dto.population) : undefined,
      countryCount: dto.countryCount,
      timeZones: dto.timeZones,
      parentId: dto.parentId,
    })
    return this.toResponseDto(continent)
  }

  /**
   * 대륙 수정
   *
   * @param id 대륙 ID
   * @param dto 대륙 수정 정보
   * @returns 수정된 대륙
   * @tag continents
   */
  @Put(':id')
  async updateContinent(
    @Param('id') id: string,
    @Body() dto: UpdateContinentDto,
  ): Promise<ContinentResponseDto> {
    const continent = await this.continentService.updateContinent(id, {
      name: dto.name,
      enName: dto.enName,
      isoCode: dto.isoCode,
      areaSqKm: dto.areaSqKm,
      population: dto.population ? BigInt(dto.population) : undefined,
      countryCount: dto.countryCount,
      timeZones: dto.timeZones,
      parentId: dto.parentId,
    })
    return this.toResponseDto(continent)
  }

  /**
   * 대륙 삭제
   *
   * @param id 대륙 ID
   * @tag continents
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteContinent(@Param('id') id: string): Promise<void> {
    await this.continentService.deleteContinent(id)
  }

  private toResponseDto(continent: Continent): ContinentResponseDto {
    return {
      id: continent.id,
      name: continent.name,
      enName: continent.enName,
      isoCode: continent.isoCode,
      areaSqKm: continent.areaSqKm,
      population: continent.population?.toString() ?? null,
      countryCount: continent.countryCount,
      timeZones: continent.timeZones,
      parentId: continent.parentId,
    }
  }
}
