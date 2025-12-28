import { Controller, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { CountryService } from '../application/country.service'
import { CreateCountryDto } from './dto/create-country.dto'
import { UpdateCountryDto } from './dto/update-country.dto'
import { CountryResponseDto } from './dto/country.response'
import { HistoricalCountrySimpleResponseDto } from './dto/historical-country-simple.response'
import {
  DemographicIndicatorResponse,
  EconomicIndicatorResponse,
  DevelopmentIndicatorResponse,
} from './dto'
import { Country } from '../domain/country.entity'
import { TypedBody, TypedParam, TypedQuery, TypedRoute } from '@nestia/core'

@ApiTags('countries')
@Controller('countries')
export class CountryController {
  constructor(private readonly countryService: CountryService) {}

  /**
   * Country 엔티티를 CountryResponseDto로 변환
   * @param country Country 엔티티
   * @returns CountryResponseDto
   */
  private toResponseDto(country: Country): CountryResponseDto {
    return {
      id: country.id,
      name: country.name,
      localName: country.localName,
      flagEmoji: country.flagEmoji,
      isoCode: country.isoCode,
      population: country.population?.toString() ?? null,
      areaSqKm: country.areaSqKm,
      thumbnailUrl: country.thumbnailUrl,
      capital: country.capital,
      latitude: country.latitude,
      longitude: country.longitude,
      currencyId: country.currencyId,
      languageId: country.languageId,
      continentId: country.continentId,
      historicalCountries: country.historicalCountries?.map((hc) => ({
        id: hc.id,
        name: hc.name,
        enName: hc.enName,
        thumbnailUrl: hc.thumbnailUrl,
        stateType: hc.stateType,
        startEra: hc.startEra,
        startYear: hc.startYear,
        startMonth: hc.startMonth,
        startDay: hc.startDay,
        endEra: hc.endEra,
        endYear: hc.endYear,
        endMonth: hc.endMonth,
        endDay: hc.endDay,
        latitude: hc.latitude,
        longitude: hc.longitude,
      })),
    }
  }
  /**
   * 모든 국가 조회
   *
   * @returns 국가 목록
   * @tag countries
   */
  @TypedRoute.Get()
  async getAllCountries(): Promise<CountryResponseDto[]> {
    const countries = await this.countryService.getAllCountries()
    return countries.map((country) => this.toResponseDto(country))
  }

  /**
   * 현대 국가와 연결된 역사적 국가 목록 조회
   *
   * @param id 현대 국가 ID
   * @returns 역사적 국가 목록
   * @tag countries
   */
  @TypedRoute.Get(':id/historical-countries')
  async getHistoricalCountriesByModernCountryId(
    @TypedParam('id') id: string,
  ): Promise<HistoricalCountrySimpleResponseDto[]> {
    const historicalCountries =
      await this.countryService.getHistoricalCountriesByModernCountryId(id)

    return historicalCountries.map((hc) => ({
      id: hc.id,
      name: hc.name,
      enName: hc.enName,
      thumbnailUrl: hc.thumbnailUrl,
      stateType: hc.stateType,
      startEra: hc.startEra,
      startYear: hc.startYear,
      startMonth: hc.startMonth,
      startDay: hc.startDay,
      endEra: hc.endEra,
      endYear: hc.endYear,
      endMonth: hc.endMonth,
      endDay: hc.endDay,
      latitude: hc.latitude,
      longitude: hc.longitude,
    }))
  }

  /**
   * 국가 상세 조회
   *
   * @param id 국가 ID
   * @returns 국가 정보
   * @tag countries
   */
  @TypedRoute.Get(':id')
  async getCountryById(
    @TypedParam('id') id: string,
  ): Promise<CountryResponseDto> {
    const country = await this.countryService.getCountryById(id)
    return this.toResponseDto(country)
  }

  /**
   * 국가 생성
   *
   * @param dto 국가 생성 정보
   * @returns 생성된 국가
   * @tag countries
   */
  @TypedRoute.Post()
  async createCountry(
    @TypedBody() dto: CreateCountryDto,
  ): Promise<CountryResponseDto> {
    const country = await this.countryService.createCountry({
      name: dto.name,
      localName: dto.localName,
      flagEmoji: dto.flagEmoji,
      isoCode: dto.isoCode,
      population: dto.population ? BigInt(dto.population) : undefined,
      areaSqKm: dto.areaSqKm,
      thumbnailUrl: dto.thumbnailUrl,
      capital: dto.capital,
      currencyId: dto.currencyId,
      languageId: dto.languageId,
      continentId: dto.continentId,
    })
    return this.toResponseDto(country)
  }

  /**
   * 국가 수정
   *
   * @param id 국가 ID
   * @param dto 국가 수정 정보
   * @returns 수정된 국가
   * @tag countries
   */
  @TypedRoute.Put(':id')
  async updateCountry(
    @TypedParam('id') id: string,
    @TypedBody() dto: UpdateCountryDto,
  ): Promise<CountryResponseDto> {
    const country = await this.countryService.updateCountry(id, {
      name: dto.name,
      localName: dto.localName,
      flagEmoji: dto.flagEmoji,
      isoCode: dto.isoCode,
      population: dto.population ? BigInt(dto.population) : undefined,
      areaSqKm: dto.areaSqKm,
      thumbnailUrl: dto.thumbnailUrl,
      capital: dto.capital,
      currencyId: dto.currencyId,
      languageId: dto.languageId,
      continentId: dto.continentId,
    })
    return this.toResponseDto(country)
  }

  /**
   * 국가 삭제
   *
   * @param id 국가 ID
   * @tag countries
   */
  @TypedRoute.Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCountry(@TypedParam('id') id: string): Promise<void> {
    await this.countryService.deleteCountry(id)
  }

  /**
   * 국가별 경제 지표 조회
   *
   * @param id 국가 ID
   * @param query 쿼리 파라미터
   * @returns 경제 지표 목록
   * @tag countries
   */
  @TypedRoute.Get(':id/economic-indicators')
  async getEconomicIndicators(
    @TypedParam('id') id: string,
    @TypedQuery()
    query: {
      startYear?: string
      endYear?: string
    },
  ): Promise<EconomicIndicatorResponse[]> {
    return this.countryService.getEconomicIndicators(
      id,
      query.startYear ? parseInt(query.startYear) : undefined,
      query.endYear ? parseInt(query.endYear) : undefined,
    )
  }

  /**
   * 국가별 인구 지표 조회
   *
   * @param id 국가 ID
   * @param query 쿼리 파라미터
   * @returns 인구 지표 목록
   * @tag countries
   */
  @TypedRoute.Get(':id/demographic-indicators')
  async getDemographicIndicators(
    @TypedParam('id') id: string,
    @TypedQuery()
    query: {
      startYear?: string
      endYear?: string
    },
  ): Promise<DemographicIndicatorResponse[]> {
    return this.countryService.getDemographicIndicators(
      id,
      query.startYear ? parseInt(query.startYear) : undefined,
      query.endYear ? parseInt(query.endYear) : undefined,
    )
  }

  /**
   * 국가별 발전 지표 조회
   *
   * @param id 국가 ID
   * @param query 쿼리 파라미터
   * @returns 발전 지표 목록
   * @tag countries
   */
  @TypedRoute.Get(':id/development-indicators')
  async getDevelopmentIndicators(
    @TypedParam('id') id: string,
    @TypedQuery()
    query: {
      startYear?: string
      endYear?: string
    },
  ): Promise<DevelopmentIndicatorResponse[]> {
    return this.countryService.getDevelopmentIndicators(
      id,
      query.startYear ? parseInt(query.startYear) : undefined,
      query.endYear ? parseInt(query.endYear) : undefined,
    )
  }
}
