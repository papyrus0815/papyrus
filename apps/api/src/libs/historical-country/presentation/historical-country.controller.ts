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
import { HistoricalCountryService } from '../application/historical-country.service'
import { CreateHistoricalCountryDto } from './dto/create-historical-country.dto'
import { UpdateHistoricalCountryDto } from './dto/update-historical-country.dto'
import { HistoricalCountryResponseDto } from './dto/historical-country.response'
import { HistoricalCountry } from '../domain/historical-country.entity'

@ApiTags('historical-countries')
@Controller('historical-countries')
export class HistoricalCountryController {
  constructor(
    private readonly historicalCountryService: HistoricalCountryService,
  ) {}

  /**
   * 모든 역사적 국가 조회
   *
   * @returns 역사적 국가 목록
   * @tag historical-countries
   */
  @Get()
  async getAllHistoricalCountries(): Promise<HistoricalCountryResponseDto[]> {
    const countries =
      await this.historicalCountryService.getAllHistoricalCountries()
    return countries.map((country) => this.toResponseDto(country))
  }

  /**
   * 역사적 국가 상세 조회
   *
   * @param id 역사적 국가 ID
   * @returns 역사적 국가 정보
   * @tag historical-countries
   */
  @Get(':id')
  async getHistoricalCountryById(
    @Param('id') id: string,
  ): Promise<HistoricalCountryResponseDto> {
    const country =
      await this.historicalCountryService.getHistoricalCountryById(id)
    return this.toResponseDto(country)
  }

  /**
   * 역사적 국가 생성
   *
   * @param dto 역사적 국가 생성 정보
   * @returns 생성된 역사적 국가
   * @tag historical-countries
   */
  @Post()
  async createHistoricalCountry(
    @Body() dto: CreateHistoricalCountryDto,
  ): Promise<HistoricalCountryResponseDto> {
    const country = await this.historicalCountryService.createHistoricalCountry(
      {
        name: dto.name,
        enName: dto.enName,
        description: dto.description,
        thumbnailUrl: dto.thumbnailUrl,
        startEra: dto.startEra,
        startYear: dto.startYear,
        startMonth: dto.startMonth,
        startDay: dto.startDay,
        endEra: dto.endEra,
        endYear: dto.endYear,
        endMonth: dto.endMonth,
        endDay: dto.endDay,
        stateType: dto.stateType,
        parentModernCountryIds: dto.parentModernCountryIds, // 현대 국가 ID 배열
      },
    )
    return this.toResponseDto(country)
  }

  /**
   * 역사적 국가 수정
   *
   * @param id 역사적 국가 ID
   * @param dto 역사적 국가 수정 정보
   * @returns 수정된 역사적 국가
   * @tag historical-countries
   */
  @Put(':id')
  async updateHistoricalCountry(
    @Param('id') id: string,
    @Body() dto: UpdateHistoricalCountryDto,
  ): Promise<HistoricalCountryResponseDto> {
    const country = await this.historicalCountryService.updateHistoricalCountry(
      id,
      {
        name: dto.name,
        enName: dto.enName,
        description: dto.description,
        thumbnailUrl: dto.thumbnailUrl,
        startEra: dto.startEra,
        startYear: dto.startYear,
        startMonth: dto.startMonth,
        startDay: dto.startDay,
        endEra: dto.endEra,
        endYear: dto.endYear,
        endMonth: dto.endMonth,
        endDay: dto.endDay,
        stateType: dto.stateType,
        parentModernCountryIds: dto.parentModernCountryIds, // 현대 국가 ID 배열
      },
    )
    return this.toResponseDto(country)
  }

  /**
   * 역사적 국가 삭제
   *
   * @param id 역사적 국가 ID
   * @tag historical-countries
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteHistoricalCountry(@Param('id') id: string): Promise<void> {
    await this.historicalCountryService.deleteHistoricalCountry(id)
  }

  private toResponseDto(
    country: HistoricalCountry,
  ): HistoricalCountryResponseDto {
    return {
      id: country.id,
      name: country.name,
      enName: country.enName,
      description: country.description,
      thumbnailUrl: country.thumbnailUrl,

      // 존속 시작 정보
      startEra: country.startEra,
      startYear: country.startYear,
      startMonth: country.startMonth,
      startDay: country.startDay,

      // 존속 종료 정보
      endEra: country.endEra,
      endYear: country.endYear,
      endMonth: country.endMonth,
      endDay: country.endDay,

      stateType: country.stateType,
      createdAt: country.createdAt.toISOString(),
      updatedAt: country.updatedAt.toISOString(),
    }
  }
}
