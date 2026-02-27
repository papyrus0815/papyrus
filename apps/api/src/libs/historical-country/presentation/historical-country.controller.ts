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
  UseGuards,
  Request,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { HistoricalCountryService } from '../application/historical-country.service'
import { CreateHistoricalCountryDto } from './dto/create-historical-country.dto'
import { UpdateHistoricalCountryDto } from './dto/update-historical-country.dto'
import { HistoricalCountryResponseDto } from './dto/historical-country.response'
import { HistoricalCountry } from '../domain/historical-country.entity'

/**
 * 역사적 국가 API (개인 정보 플랫폼: 로그인한 계정 소유 데이터만)
 */
@ApiTags('historical-countries')
@Controller('historical-countries')
@UseGuards(AuthGuard('jwt'))
export class HistoricalCountryController {
  constructor(
    private readonly historicalCountryService: HistoricalCountryService,
  ) {}

  /**
   * 역사적 국가 목록 조회 (본인 등록분만)
   *
   * @returns 역사적 국가 목록
   * @tag historical-countries
   */
  @Get()
  async getAllHistoricalCountries(
    @Request() req: any,
  ): Promise<HistoricalCountryResponseDto[]> {
    const accountId = req.user?.id ?? req.user?.sub
    const countries =
      await this.historicalCountryService.getAllHistoricalCountries(accountId)
    return countries.map((country) => this.toResponseDto(country))
  }

  /**
   * 역사적 국가 상세 조회 (본인 등록분만)
   *
   * @param id 역사적 국가 ID
   * @returns 역사적 국가 정보
   * @tag historical-countries
   */
  @Get(':id')
  async getHistoricalCountryById(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<HistoricalCountryResponseDto> {
    const accountId = req.user?.id ?? req.user?.sub
    const country =
      await this.historicalCountryService.getHistoricalCountryById(id, accountId)
    const [parentModernCountryIds, parentHistoricalCountryIds] = await Promise.all([
      this.historicalCountryService.getModernCountryIdsByHistoricalCountryId(id),
      this.historicalCountryService.getParentHistoricalCountryIdsByMemberId(id),
    ])
    return this.toResponseDto(country, parentModernCountryIds, parentHistoricalCountryIds)
  }

  /**
   * 역사적 국가 생성 (현재 계정 소유로 등록)
   *
   * @param dto 역사적 국가 생성 정보
   * @returns 생성된 역사적 국가
   * @tag historical-countries
   */
  @Post()
  async createHistoricalCountry(
    @Body() dto: CreateHistoricalCountryDto,
    @Request() req: any,
  ): Promise<HistoricalCountryResponseDto> {
    const accountId = req.user?.id ?? req.user?.sub
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
        parentModernCountryIds: dto.parentModernCountryIds,
        parentHistoricalCountryIds: dto.parentHistoricalCountryIds,
      },
      accountId,
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
    @Request() req: any,
  ): Promise<HistoricalCountryResponseDto> {
    const accountId = req.user?.id ?? req.user?.sub
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
        parentModernCountryIds: dto.parentModernCountryIds,
        parentHistoricalCountryIds: dto.parentHistoricalCountryIds,
      },
      accountId,
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
  async deleteHistoricalCountry(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<void> {
    const accountId = req.user?.id ?? req.user?.sub
    await this.historicalCountryService.deleteHistoricalCountry(id, accountId)
  }

  private toResponseDto(
    country: HistoricalCountry,
    parentModernCountryIds?: string[],
    parentHistoricalCountryIds?: string[],
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
      parentModernCountryIds,
      parentHistoricalCountryIds,
      createdAt: country.createdAt.toISOString(),
      updatedAt: country.updatedAt.toISOString(),
    }
  }
}
