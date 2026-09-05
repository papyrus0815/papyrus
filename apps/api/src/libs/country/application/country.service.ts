import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common'
import { AggregateType, EventMethod } from '@prisma/client'
import {
  CountryRepository,
  HistoricalCountrySimple,
} from '../domain/country.repository'
import { Country } from '../domain/country.entity'
import { PrismaClient } from '@prisma/client'
import { NotificationService } from '../../notification/application/notification.service'
import { PointService } from '../../gamification/application/point.service'
import { completenessBonus } from '../../gamification/domain/point.policy'
import { UploadService } from '../../shared/upload/upload.service'
import {
  UpsertEconomicIndicatorDto,
  UpsertDemographicIndicatorDto,
  UpsertDevelopmentIndicatorDto,
  CreateCountryRecordDto,
  UpdateCountryRecordDto,
  UpsertExportImportDto,
} from '../presentation/dto'

/** 국가 완성도 신호: 썸네일 / 수도 / 현지어명 (각 1신호) */
function countryCompletenessBonus(c: {
  thumbnailUrl?: string | null
  capital?: string | null
  localName?: string | null
}): number {
  const signals = (c.thumbnailUrl ? 1 : 0) + (c.capital ? 1 : 0) + (c.localName ? 1 : 0)
  return completenessBonus(signals)
}

@Injectable()
export class CountryService {
  constructor(
    @Inject('CountryRepository')
    private readonly countries: CountryRepository,
    private readonly prisma: PrismaClient,
    private readonly notificationService: NotificationService,
    private readonly uploadService: UploadService,
    private readonly pointService: PointService,
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
    await this.pointService.awardForCreate(
      accountId,
      AggregateType.COUNTRY,
      country.id,
      countryCompletenessBonus(country),
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
    await this.pointService.awardCompletenessBonus(
      accountId,
      AggregateType.COUNTRY,
      country.id,
      countryCompletenessBonus(country),
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
      id,
      country.localName ?? undefined,
    )
    await this.pointService.revokeForRecord(AggregateType.COUNTRY, id)
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
      // 연령대별 성별 인구 — BigInt는 JSON.stringify가 못 다룬다. 위 `...indicator`
      // 스프레드가 원시 BigInt를 그대로 실어 보내므로 반드시 여기서 덮어써야 한다.
      // (전까지는 이 컬럼들이 전부 NULL이라 터지지 않고 잠복해 있었다.)
      maleAge0To9: indicator.maleAge0To9?.toString() ?? null,
      femaleAge0To9: indicator.femaleAge0To9?.toString() ?? null,
      maleAge10To19: indicator.maleAge10To19?.toString() ?? null,
      femaleAge10To19: indicator.femaleAge10To19?.toString() ?? null,
      maleAge20To29: indicator.maleAge20To29?.toString() ?? null,
      femaleAge20To29: indicator.femaleAge20To29?.toString() ?? null,
      maleAge30To39: indicator.maleAge30To39?.toString() ?? null,
      femaleAge30To39: indicator.femaleAge30To39?.toString() ?? null,
      maleAge40To49: indicator.maleAge40To49?.toString() ?? null,
      femaleAge40To49: indicator.femaleAge40To49?.toString() ?? null,
      maleAge50To59: indicator.maleAge50To59?.toString() ?? null,
      femaleAge50To59: indicator.femaleAge50To59?.toString() ?? null,
      maleAge60To69: indicator.maleAge60To69?.toString() ?? null,
      femaleAge60To69: indicator.femaleAge60To69?.toString() ?? null,
      maleAge70To79: indicator.maleAge70To79?.toString() ?? null,
      femaleAge70To79: indicator.femaleAge70To79?.toString() ?? null,
      maleAge80Plus: indicator.maleAge80Plus?.toString() ?? null,
      femaleAge80Plus: indicator.femaleAge80Plus?.toString() ?? null,
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

  // ── 지표 쓰기 (upsert / delete) ──────────────────────────────

  /** 소유권 확인 (accountId 있을 때만). */
  private async assertCountryAccess(countryId: string, accountId?: string) {
    if (accountId != null) {
      await this.getCountryById(countryId, accountId)
    }
  }

  /** 경제 지표 생성/갱신 (countryId+year 기준). */
  async upsertEconomicIndicator(
    countryId: string,
    dto: UpsertEconomicIndicatorDto,
    accountId?: string,
  ) {
    await this.assertCountryAccess(countryId, accountId)
    const { year, ...writable } = dto
    await this.prisma.countryEconomicIndicator.upsert({
      where: {
        uniq_economic_indicator_country_year: { countryId, year },
      },
      create: { countryId, year, ...writable },
      update: writable,
    })
    return (await this.getEconomicIndicators(countryId, year, year))[0]
  }

  /** 경제 지표 삭제 (해당 연도). */
  async deleteEconomicIndicator(
    countryId: string,
    year: number,
    accountId?: string,
  ): Promise<void> {
    await this.assertCountryAccess(countryId, accountId)
    await this.prisma.countryEconomicIndicator.deleteMany({
      where: { countryId, year },
    })
  }

  /** 인구 지표 생성/갱신 (countryId+year 기준). */
  async upsertDemographicIndicator(
    countryId: string,
    dto: UpsertDemographicIndicatorDto,
    accountId?: string,
  ) {
    await this.assertCountryAccess(countryId, accountId)
    const { year, population, urbanPopulation, ...rest } = dto
    const writable = {
      ...rest,
      population: toBigIntField(population),
      urbanPopulation: toBigIntField(urbanPopulation),
      // 연령대별 성별 인구도 BigInt 컬럼 — string으로 받아 여기서 변환한다.
      // undefined는 toBigIntField가 undefined로 돌려주므로 그 칸은 기존 값이 보존된다
      // (부분 갱신). 빈 문자열·null만 NULL로 지운다.
      maleAge0To9: toBigIntField(rest.maleAge0To9),
      femaleAge0To9: toBigIntField(rest.femaleAge0To9),
      maleAge10To19: toBigIntField(rest.maleAge10To19),
      femaleAge10To19: toBigIntField(rest.femaleAge10To19),
      maleAge20To29: toBigIntField(rest.maleAge20To29),
      femaleAge20To29: toBigIntField(rest.femaleAge20To29),
      maleAge30To39: toBigIntField(rest.maleAge30To39),
      femaleAge30To39: toBigIntField(rest.femaleAge30To39),
      maleAge40To49: toBigIntField(rest.maleAge40To49),
      femaleAge40To49: toBigIntField(rest.femaleAge40To49),
      maleAge50To59: toBigIntField(rest.maleAge50To59),
      femaleAge50To59: toBigIntField(rest.femaleAge50To59),
      maleAge60To69: toBigIntField(rest.maleAge60To69),
      femaleAge60To69: toBigIntField(rest.femaleAge60To69),
      maleAge70To79: toBigIntField(rest.maleAge70To79),
      femaleAge70To79: toBigIntField(rest.femaleAge70To79),
      maleAge80Plus: toBigIntField(rest.maleAge80Plus),
      femaleAge80Plus: toBigIntField(rest.femaleAge80Plus),
    }
    await this.prisma.countryDemographicIndicator.upsert({
      where: {
        uniq_demographic_indicator_country_year: { countryId, year },
      },
      create: { countryId, year, ...writable },
      update: writable,
    })
    return (await this.getDemographicIndicators(countryId, year, year))[0]
  }

  /** 인구 지표 삭제 (해당 연도). */
  async deleteDemographicIndicator(
    countryId: string,
    year: number,
    accountId?: string,
  ): Promise<void> {
    await this.assertCountryAccess(countryId, accountId)
    await this.prisma.countryDemographicIndicator.deleteMany({
      where: { countryId, year },
    })
  }

  /** 발전 지표 생성/갱신 (countryId+year 기준). */
  async upsertDevelopmentIndicator(
    countryId: string,
    dto: UpsertDevelopmentIndicatorDto,
    accountId?: string,
  ) {
    await this.assertCountryAccess(countryId, accountId)
    const { year, ...writable } = dto
    await this.prisma.countryDevelopmentIndicator.upsert({
      where: {
        uniq_development_indicator_country_year: { countryId, year },
      },
      create: { countryId, year, ...writable },
      update: writable,
    })
    return (await this.getDevelopmentIndicators(countryId, year, year))[0]
  }

  /** 발전 지표 삭제 (해당 연도). */
  async deleteDevelopmentIndicator(
    countryId: string,
    year: number,
    accountId?: string,
  ): Promise<void> {
    await this.assertCountryAccess(countryId, accountId)
    await this.prisma.countryDevelopmentIndicator.deleteMany({
      where: { countryId, year },
    })
  }

  // ── 국가 기록 (CountryRecord) CRUD ───────────────────────────

  async getCountryRecords(countryId: string, accountId?: string) {
    await this.assertCountryAccess(countryId, accountId)
    const records = await this.prisma.countryRecord.findMany({
      where: { countryId },
      orderBy: { recordedAt: 'desc' },
    })
    return records.map(serializeCountryRecord)
  }

  async createCountryRecord(
    countryId: string,
    dto: CreateCountryRecordDto,
    accountId?: string,
  ) {
    await this.assertCountryAccess(countryId, accountId)
    const record = await this.prisma.countryRecord.create({
      data: {
        countryId,
        description: dto.description,
        recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : undefined,
      },
    })
    return serializeCountryRecord(record)
  }

  async updateCountryRecord(
    countryId: string,
    recordId: string,
    dto: UpdateCountryRecordDto,
    accountId?: string,
  ) {
    await this.assertCountryAccess(countryId, accountId)
    const existing = await this.prisma.countryRecord.findFirst({
      where: { id: recordId, countryId },
    })
    if (!existing) {
      throw new NotFoundException(`Record ${recordId} not found`)
    }
    const record = await this.prisma.countryRecord.update({
      where: { id: recordId },
      data: {
        description: dto.description,
        recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : undefined,
      },
    })
    return serializeCountryRecord(record)
  }

  async deleteCountryRecord(
    countryId: string,
    recordId: string,
    accountId?: string,
  ): Promise<void> {
    await this.assertCountryAccess(countryId, accountId)
    await this.prisma.countryRecord.deleteMany({
      where: { id: recordId, countryId },
    })
  }

  // ── 교역 (ExportImport) CRUD ─────────────────────────────────

  async getExportImports(countryId: string, accountId?: string) {
    await this.assertCountryAccess(countryId, accountId)
    const rows = await this.prisma.exportImport.findMany({
      where: { countryId },
      orderBy: { year: 'asc' },
      include: { items: EXPORT_IMPORT_ITEM_INCLUDE },
    })
    return rows.map(serializeExportImport)
  }

  async upsertExportImport(
    countryId: string,
    dto: UpsertExportImportDto,
    accountId?: string,
  ) {
    await this.assertCountryAccess(countryId, accountId)
    const { year, exportValue, importValue, items } = dto
    const writable = { exportValue, importValue }

    /*
     * 총액과 품목은 한 트랜잭션이다 — 품목 교체가 실패했는데 총액만 바뀌어 있으면
     * "수출 6.8조인데 품목은 작년 것"인 상태가 남는다.
     *
     * items가 undefined면 품목을 건드리지 않는다. 총액만 고치는 호출(기존 화면)이
     * 품목을 조용히 날리면 안 된다. 빈 배열은 명시적인 '전부 지우기'다.
     */
    const row = await this.prisma.$transaction(async (tx) => {
      const parent = await tx.exportImport.upsert({
        where: { uniq_exportImport_country_year: { countryId, year } },
        create: { countryId, year, ...writable },
        update: writable,
      })

      if (items !== undefined) {
        await tx.exportImportItem.deleteMany({
          where: { exportImportId: parent.id },
        })
        if (items.length > 0) {
          await tx.exportImportItem.createMany({
            data: items.map((item, index) => ({
              exportImportId: parent.id,
              direction: item.direction,
              name: item.name,
              hsCode: item.hsCode ?? null,
              value: item.value ?? null,
              sharePct: item.sharePct ?? null,
              partnerCountryId: item.partnerCountryId || null,
              sortOrder: item.sortOrder ?? index,
            })),
          })
        }
      }

      return tx.exportImport.findUniqueOrThrow({
        where: { id: parent.id },
        include: { items: EXPORT_IMPORT_ITEM_INCLUDE },
      })
    })

    return serializeExportImport(row)
  }

  async deleteExportImport(
    countryId: string,
    year: number,
    accountId?: string,
  ): Promise<void> {
    await this.assertCountryAccess(countryId, accountId)
    await this.prisma.exportImport.deleteMany({
      where: { countryId, year },
    })
  }
}

/** string|null|undefined → BigInt 컬럼 입력값 변환 (undefined는 변경 스킵). */
function toBigIntField(v?: string | null): bigint | null | undefined {
  if (v === undefined) return undefined
  if (v === null || v === '') return null
  return BigInt(v)
}

function serializeCountryRecord(record: {
  id: string
  countryId: string
  description: string
  recordedAt: Date
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: record.id,
    countryId: record.countryId,
    description: record.description,
    recordedAt: record.recordedAt.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

/** 품목은 방향 → 순서 → 이름으로 세운다. 상대국 이름은 함께 내려 프론트 왕복을 줄인다. */
const EXPORT_IMPORT_ITEM_INCLUDE = {
  include: { partnerCountry: { select: { name: true } } },
  /* `as const`를 걸면 orderBy 배열이 readonly가 돼 Prisma 인자 타입과 어긋난다 */
  orderBy: [
    { direction: 'asc' as const },
    { sortOrder: 'asc' as const },
    { name: 'asc' as const },
  ],
}

function serializeExportImportItem(item: {
  id: string
  direction: string
  name: string
  hsCode: string | null
  value: unknown
  sharePct: unknown
  partnerCountryId: string | null
  partnerCountry?: { name: string } | null
  sortOrder: number
}) {
  return {
    id: item.id,
    direction: item.direction as 'EXPORT' | 'IMPORT',
    name: item.name,
    hsCode: item.hsCode,
    value: item.value != null ? Number(item.value) : null,
    sharePct: item.sharePct != null ? Number(item.sharePct) : null,
    partnerCountryId: item.partnerCountryId,
    partnerCountryName: item.partnerCountry?.name ?? null,
    sortOrder: item.sortOrder,
  }
}

function serializeExportImport(row: {
  id: string
  countryId: string
  year: number
  exportValue: unknown
  importValue: unknown
  items?: Parameters<typeof serializeExportImportItem>[0][]
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: row.id,
    countryId: row.countryId,
    year: row.year,
    exportValue: row.exportValue != null ? Number(row.exportValue) : null,
    importValue: row.importValue != null ? Number(row.importValue) : null,
    items: (row.items ?? []).map(serializeExportImportItem),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}
