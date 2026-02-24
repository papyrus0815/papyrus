import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  ForbiddenException,
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
   * 국가 목록 조회 (accountId 있으면 해당 계정 소유만)
   */
  async getAllCountries(accountId?: string): Promise<Country[]> {
    return this.countries.findAll(accountId)
  }

  /**
   * ID로 국가 조회 (accountId 있으면 해당 계정 소유만)
   */
  async getCountryById(id: string, accountId?: string): Promise<Country> {
    const country = await this.countries.findById(id, accountId)
    if (!country) {
      throw accountId
        ? new ForbiddenException('본인이 등록한 국가만 조회할 수 있습니다.')
        : new NotFoundException(`Country with id ${id} not found`)
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
    accountId?: string,
  ): Promise<HistoricalCountrySimple[]> {
    await this.getCountryById(countryId, accountId)
    return this.countries.findHistoricalCountriesByModernCountryId(countryId)
  }

  /**
   * 국가 생성 (accountId 있으면 소유자로 저장)
   */
  async createCountry(
    data: Omit<Country, 'id'>,
    accountId?: string,
  ): Promise<Country> {
    const createData = accountId != null ? { ...data, accountId } : data
    const existing = await this.countries.findByName(
      createData.name,
      accountId ?? undefined,
    )
    if (existing) {
      throw new ConflictException(
        `Country with name ${createData.name} already exists`,
      )
    }

    const country = await this.countries.create(createData)
    await this.notificationService.notifyCountry(
      country.name,
      EventMethod.CREATE,
      country.id,
      country.localName ?? undefined,
    )
    return country
  }

  /**
   * 국가 수정 (accountId 있으면 소유자만 가능)
   */
  async updateCountry(
    id: string,
    data: Partial<Omit<Country, 'id'>>,
    accountId?: string,
  ): Promise<Country> {
    const current = await this.countries.findById(id, accountId)
    if (!current) {
      throw accountId
        ? new ForbiddenException('본인이 등록한 국가만 수정할 수 있습니다.')
        : new NotFoundException(`Country with id ${id} not found`)
    }

    if (data.name) {
      const existing = await this.countries.findByName(
        data.name,
        accountId ?? undefined,
      )
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
   * 국가 삭제 (accountId 있으면 소유자만 가능)
   */
  async deleteCountry(id: string, accountId?: string): Promise<void> {
    const country = await this.countries.findById(id, accountId)
    if (!country) {
      throw accountId
        ? new ForbiddenException('본인이 등록한 국가만 삭제할 수 있습니다.')
        : new NotFoundException(`Country with id ${id} not found`)
    }
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
    accountId?: string,
  ) {
    if (accountId != null) {
      await this.getCountryById(countryId, accountId)
    }
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
    accountId?: string,
  ) {
    if (accountId != null) {
      await this.getCountryById(countryId, accountId)
    }
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
    accountId?: string,
  ) {
    if (accountId != null) {
      await this.getCountryById(countryId, accountId)
    }
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
