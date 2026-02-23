import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common'
import { EventMethod } from '@prisma/client'
import {
  CountryRepository,
  HistoricalCountrySimple,
} from '../domain/country.repository'
import { Country } from '../domain/country.entity'
import { PrismaClient } from '@prisma/client'
import { NotificationService } from '../../notification/application/notification.service'
import { UploadService } from '../../shared/upload/upload.service'

@Injectable()
export class CountryService {
  constructor(
    @Inject('CountryRepository')
    private readonly countries: CountryRepository,
    private readonly prisma: PrismaClient,
    private readonly notificationService: NotificationService,
    private readonly uploadService: UploadService,
  ) {}

  /**
   * 모든 국가 조회
   * @returns 모든 국가 목록
   */
  async getAllCountries(): Promise<Country[]> {
    return this.countries.findAll()
  }

  /**
   * ID로 국가 조회
   * @param id 국가 ID
   * @returns 국가 정보
   * @throws NotFoundException 국가를 찾을 수 없는 경우
   */
  async getCountryById(id: string): Promise<Country> {
    const country = await this.countries.findById(id)
    if (!country) {
      throw new NotFoundException(`Country with id ${id} not found`)
    }

    return country
  }

  /**
   * 현대 국가와 연결된 역사적 국가 목록 조회
   * @param countryId 현대 국가 ID
   * @returns 역사적 국가 목록
   * @throws NotFoundException 국가를 찾을 수 없는 경우
   */
  async getHistoricalCountriesByModernCountryId(
    countryId: string,
  ): Promise<HistoricalCountrySimple[]> {
    // 현대 국가가 존재하는지 확인
    await this.getCountryById(countryId)

    return this.countries.findHistoricalCountriesByModernCountryId(countryId)
  }

  /**
   * 국가 생성
   * @param data 국가 생성 데이터
   * @returns 생성된 국가
   * @throws ConflictException 동일한 이름의 국가가 이미 존재하는 경우
   */
  async createCountry(data: Omit<Country, 'id'>): Promise<Country> {
    // 중복 체크
    const existing = await this.countries.findByName(data.name)
    if (existing) {
      throw new ConflictException(
        `Country with name ${data.name} already exists`,
      )
    }

    const country = await this.countries.create(data)
    await this.notificationService.notifyCountry(
      country.name,
      EventMethod.CREATE,
      country.id,
      country.localName ?? undefined,
    )
    return country
  }

  /**
   * 국가 정보 수정
   * @param id 국가 ID
   * @param data 수정할 데이터
   * @returns 수정된 국가
   * @throws NotFoundException 국가를 찾을 수 없는 경우
   * @throws ConflictException 변경하려는 이름이 이미 존재하는 경우
   */
  async updateCountry(
    id: string,
    data: Partial<Omit<Country, 'id'>>,
  ): Promise<Country> {
    const current = await this.getCountryById(id)

    // 이름 변경 시 중복 체크
    if (data.name) {
      const existing = await this.countries.findByName(data.name)
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Country with name ${data.name} already exists`,
        )
      }
    }

    // 썸네일 제거/교체 시 기존 업로드 파일 삭제 (/uploads/images/... 만)
    const newThumbnail = data.thumbnailUrl ?? null
    const isClearingOrReplacing =
      newThumbnail !== (current.thumbnailUrl ?? null)
    if (isClearingOrReplacing && current.thumbnailUrl) {
      await this.uploadService.deleteFileByUrl(current.thumbnailUrl)
    }

    const country = await this.countries.update(id, data)
    await this.notificationService.notifyCountry(
      country.name,
      EventMethod.UPDATE,
      country.id,
      country.localName ?? undefined,
    )
    return country
  }

  /**
   * 국가 삭제
   * @param id 국가 ID
   * @throws NotFoundException 국가를 찾을 수 없는 경우
   */
  async deleteCountry(id: string): Promise<void> {
    const country = await this.getCountryById(id)
    await this.countries.delete(id)
    await this.notificationService.notifyCountry(
      country.name,
      EventMethod.DELETE,
    )
  }

  /**
   * 국가별 년도별 경제 지표 조회
   * @param countryId 국가 ID
   * @param startYear 시작 연도 (선택)
   * @param endYear 종료 연도 (선택)
   * @returns 경제 지표 목록
   */
  async getEconomicIndicators(
    countryId: string,
    startYear?: number,
    endYear?: number,
  ) {
    const where: {
      countryId: string
      year?: { gte?: number; lte?: number }
    } = { countryId }

    if (startYear || endYear) {
      where.year = {}
      if (startYear) where.year.gte = startYear
      if (endYear) where.year.lte = endYear
    }

    const indicators = await this.prisma.countryEconomicIndicator.findMany({
      where,
      orderBy: { year: 'asc' },
    })

    // Decimal을 number로 변환
    return indicators.map((indicator) => ({
      ...indicator,
      gdp: indicator.gdp ? Number(indicator.gdp) : null,
      gdpPerCapita: indicator.gdpPerCapita
        ? Number(indicator.gdpPerCapita)
        : null,
      gdpGrowthRate: indicator.gdpGrowthRate
        ? Number(indicator.gdpGrowthRate)
        : null,
      realGdp: indicator.realGdp ? Number(indicator.realGdp) : null,
      inflationRate: indicator.inflationRate
        ? Number(indicator.inflationRate)
        : null,
      cpi: indicator.cpi ? Number(indicator.cpi) : null,
      unemploymentRate: indicator.unemploymentRate
        ? Number(indicator.unemploymentRate)
        : null,
      laborForceParticipationRate: indicator.laborForceParticipationRate
        ? Number(indicator.laborForceParticipationRate)
        : null,
      tradeBalance: indicator.tradeBalance
        ? Number(indicator.tradeBalance)
        : null,
      currentAccountBalance: indicator.currentAccountBalance
        ? Number(indicator.currentAccountBalance)
        : null,
      governmentDebt: indicator.governmentDebt
        ? Number(indicator.governmentDebt)
        : null,
      debtToGdpRatio: indicator.debtToGdpRatio
        ? Number(indicator.debtToGdpRatio)
        : null,
      fiscalBalance: indicator.fiscalBalance
        ? Number(indicator.fiscalBalance)
        : null,
      fdi: indicator.fdi ? Number(indicator.fdi) : null,
      foreignReserves: indicator.foreignReserves
        ? Number(indicator.foreignReserves)
        : null,
    }))
  }

  /**
   * 국가별 년도별 인구 지표 조회
   * @param countryId 국가 ID
   * @param startYear 시작 연도 (선택)
   * @param endYear 종료 연도 (선택)
   * @returns 인구 지표 목록
   */
  async getDemographicIndicators(
    countryId: string,
    startYear?: number,
    endYear?: number,
  ) {
    const where: {
      countryId: string
      year?: { gte?: number; lte?: number }
    } = { countryId }

    if (startYear || endYear) {
      where.year = {}
      if (startYear) where.year.gte = startYear
      if (endYear) where.year.lte = endYear
    }

    const indicators = await this.prisma.countryDemographicIndicator.findMany({
      where,
      orderBy: { year: 'asc' },
    })

    // BigInt를 string으로, Decimal을 number로 변환
    return indicators.map((indicator) => ({
      ...indicator,
      population: indicator.population?.toString() ?? null,
      urbanPopulation: indicator.urbanPopulation?.toString() ?? null,
      populationGrowthRate: indicator.populationGrowthRate
        ? Number(indicator.populationGrowthRate)
        : null,
      populationDensity: indicator.populationDensity
        ? Number(indicator.populationDensity)
        : null,
      birthRate: indicator.birthRate ? Number(indicator.birthRate) : null,
      deathRate: indicator.deathRate ? Number(indicator.deathRate) : null,
      fertilityRate: indicator.fertilityRate
        ? Number(indicator.fertilityRate)
        : null,
      medianAge: indicator.medianAge ? Number(indicator.medianAge) : null,
      populationAge0To14: indicator.populationAge0To14
        ? Number(indicator.populationAge0To14)
        : null,
      populationAge15To64: indicator.populationAge15To64
        ? Number(indicator.populationAge15To64)
        : null,
      populationAge65Plus: indicator.populationAge65Plus
        ? Number(indicator.populationAge65Plus)
        : null,
      urbanizationRate: indicator.urbanizationRate
        ? Number(indicator.urbanizationRate)
        : null,
      lifeExpectancy: indicator.lifeExpectancy
        ? Number(indicator.lifeExpectancy)
        : null,
      lifeExpectancyMale: indicator.lifeExpectancyMale
        ? Number(indicator.lifeExpectancyMale)
        : null,
      lifeExpectancyFemale: indicator.lifeExpectancyFemale
        ? Number(indicator.lifeExpectancyFemale)
        : null,
      sexRatio: indicator.sexRatio ? Number(indicator.sexRatio) : null,
    }))
  }

  /**
   * 국가별 년도별 발전 지표 조회
   * @param countryId 국가 ID
   * @param startYear 시작 연도 (선택)
   * @param endYear 종료 연도 (선택)
   * @returns 발전 지표 목록
   */
  async getDevelopmentIndicators(
    countryId: string,
    startYear?: number,
    endYear?: number,
  ) {
    const where: {
      countryId: string
      year?: { gte?: number; lte?: number }
    } = { countryId }

    if (startYear || endYear) {
      where.year = {}
      if (startYear) where.year.gte = startYear
      if (endYear) where.year.lte = endYear
    }

    const indicators = await this.prisma.countryDevelopmentIndicator.findMany({
      where,
      orderBy: { year: 'asc' },
    })

    // Decimal을 number로 변환
    return indicators.map((indicator) => ({
      ...indicator,
      literacyRate: indicator.literacyRate
        ? Number(indicator.literacyRate)
        : null,
      educationIndex: indicator.educationIndex
        ? Number(indicator.educationIndex)
        : null,
      meanYearsOfSchooling: indicator.meanYearsOfSchooling
        ? Number(indicator.meanYearsOfSchooling)
        : null,
      expectedYearsOfSchooling: indicator.expectedYearsOfSchooling
        ? Number(indicator.expectedYearsOfSchooling)
        : null,
      healthIndex: indicator.healthIndex ? Number(indicator.healthIndex) : null,
      infantMortalityRate: indicator.infantMortalityRate
        ? Number(indicator.infantMortalityRate)
        : null,
      under5MortalityRate: indicator.under5MortalityRate
        ? Number(indicator.under5MortalityRate)
        : null,
      maternalMortalityRatio: indicator.maternalMortalityRatio
        ? Number(indicator.maternalMortalityRatio)
        : null,
      hdi: indicator.hdi ? Number(indicator.hdi) : null,
      inequalityAdjustedHdi: indicator.inequalityAdjustedHdi
        ? Number(indicator.inequalityAdjustedHdi)
        : null,
      gni: indicator.gni ? Number(indicator.gni) : null,
      gniPerCapita: indicator.gniPerCapita
        ? Number(indicator.gniPerCapita)
        : null,
      giniCoefficient: indicator.giniCoefficient
        ? Number(indicator.giniCoefficient)
        : null,
      povertyRate: indicator.povertyRate ? Number(indicator.povertyRate) : null,
      energyConsumption: indicator.energyConsumption
        ? Number(indicator.energyConsumption)
        : null,
      co2Emissions: indicator.co2Emissions
        ? Number(indicator.co2Emissions)
        : null,
      co2EmissionsPerCapita: indicator.co2EmissionsPerCapita
        ? Number(indicator.co2EmissionsPerCapita)
        : null,
      renewableEnergyShare: indicator.renewableEnergyShare
        ? Number(indicator.renewableEnergyShare)
        : null,
      internetPenetration: indicator.internetPenetration
        ? Number(indicator.internetPenetration)
        : null,
      mobilePenetration: indicator.mobilePenetration
        ? Number(indicator.mobilePenetration)
        : null,
    }))
  }
}
