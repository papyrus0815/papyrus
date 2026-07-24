import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@prisma/prisma.service'
import {
  ContemporaryRecordDto,
  ContemporaryRulerDto,
  PersonContemporariesResponseDto,
} from '../presentation/dto/person-contemporaries.response'
import {
  HEAD_POSITION_TYPES,
  RULER_PERSON_SELECT,
  type SubjectDeathInfo,
  deathInfoOf,
  effectiveEndYear,
  signedYearFromEraDate,
  signedYearFromStructuredOrDate,
  utcYearStart,
  yearOf,
} from './head-record.shared'

/** 응답 인물 수 cap — 초과분은 meta.omittedCount로 노출 (무성 절단 금지) */
export const PERSON_CONTEMPORARIES_DEFAULT_LIMIT = 100
export const PERSON_CONTEMPORARIES_MAX_LIMIT = 300

export interface GetContemporariesParams {
  personId: string
  /** 대상 인물 소유자 게이트 (findById 관례) — 결과 수장 목록은 글로벌 읽기 */
  accountId?: string
  /** 부호 연도, 포함. toYear와 함께 지정하거나 함께 생략(생략 시 대상 재위 구간에서 유도) */
  fromYear?: number | null
  /** 부호 연도, 배타 */
  toYear?: number | null
  scope: 'all' | 'sameCountry'
  limit: number
}

/**
 * 동시대 수장 발견(discovery) 읽기모델 — person-records와 같은 수직 슬라이스.
 *
 * 스키마 변경 0: GovernmentPositionTenure ∪ SovereignReign을 날짜창 overlap으로
 * 조회한다(코드베이스 최초의 tenure 날짜창 where — startDate 인덱스 활용, endDate는
 * 무인덱스 잔여 필터). 권한 체제: 대상 인물은 소유자 스코프, 결과는 국가별 tenure
 * GET과 같은 글로벌 읽기 — 혼합은 의도된 결정 (검토서 §5).
 */
@Injectable()
export class PersonContemporariesService {
  constructor(private readonly prisma: PrismaService) {}

  async getContemporaries(
    params: GetContemporariesParams,
  ): Promise<PersonContemporariesResponseDto> {
    const { personId, accountId, scope, limit } = params
    const nowYear = new Date().getUTCFullYear()

    const subject = await this.prisma.person.findFirst({
      where: accountId != null ? { id: personId, accountId } : { id: personId },
      select: {
        id: true,
        deathEra: true,
        deathDate: true,
        isAlive: true,
        isDeathDateUnknown: true,
      },
    })
    if (!subject) throw new NotFoundException('인물을 찾을 수 없습니다')

    // 대상의 수장급 기록 — 창 유도 + sameCountry 스코프의 원천.
    // findTenuresByPersonId는 전 positionType을 반환해 장관·의원 경력이 창을 부풀리므로
    // head-level로 직접 좁혀 조회한다 (검토 확정 결함 #2의 방어).
    const [subjectTenures, subjectReigns] = await Promise.all([
      this.prisma.governmentPositionTenure.findMany({
        where: { personId, positionType: { in: [...HEAD_POSITION_TYPES] } },
        select: {
          startDate: true,
          endDate: true,
          countryId: true,
          historicalCountryId: true,
        },
      }),
      this.prisma.sovereignReign.findMany({
        where: { personId },
        select: {
          startDate: true,
          endDate: true,
          startEra: true,
          startYear: true,
          endEra: true,
          endYear: true,
          countryId: true,
          historicalCountryId: true,
        },
      }),
    ])
    // 창 유도·sameCountry 스코프의 원천 — 재위는 구조화 축(startEra/startYear)이 진실이므로
    // (AD<1000·BC는 startDate=NULL) 부호 연도를 구조화 우선으로 파생한다. tenure는 구조화
    // 컬럼이 없어 DATETIME 폴백만 탄다.
    const subjectHeadRecords = [
      ...subjectTenures.map((record) => ({
        startSignedYear: yearOf(record.startDate),
        endSignedYear: yearOf(record.endDate),
        countryId: record.countryId,
        historicalCountryId: record.historicalCountryId,
      })),
      ...subjectReigns.map((record) => ({
        startSignedYear: signedYearFromStructuredOrDate(
          record.startEra,
          record.startYear,
          record.startDate,
        ),
        endSignedYear: signedYearFromStructuredOrDate(
          record.endEra,
          record.endYear,
          record.endDate,
        ),
        countryId: record.countryId,
        historicalCountryId: record.historicalCountryId,
      })),
    ]

    const window = this.resolveWindow(params, subjectHeadRecords, deathInfoOf(subject), nowYear)
    const { fromYear, toYear, derivedFromSubject } = window

    const emptyResponse = (): PersonContemporariesResponseDto => ({
      meta: {
        window: { fromYear, toYear },
        derivedFromSubject,
        scope,
        totalPersons: 0,
        omittedCount: 0,
      },
      rulers: [],
    })

    // 현 스키마의 tenure/reign DATETIME은 AD 전용 — 창이 AD와 겹치지 않으면 빈 결과
    if (toYear <= 1) return emptyResponse()

    let scopeWhere: any | null = null
    if (scope === 'sameCountry') {
      scopeWhere = await this.buildSameCountryWhere(subjectHeadRecords)
      if (!scopeWhere) return emptyResponse() // 대상에 국가 정보가 없으면(교황 등) 같은 나라가 정의 불가
    }

    // overlap: startDate < toDateExclusive AND (endDate IS NULL OR endDate >= fromDate).
    // MySQL DATETIME은 AD1000 미만이 불안정하므로 SQL 파라미터는 1년으로 클램프
    // (연도 필터의 정본은 아래 후처리 — SQL은 인덱스 프루닝용).
    const fromDate = utcYearStart(Math.max(fromYear, 1))
    const toDateExclusive = utcYearStart(Math.max(toYear, 1))
    // 하한 분기: startDate >= fromDate 분기가 있어야 종료<시작 오염 데이터도 후처리 정본
    // (시작 클램프)이 판정할 수 있는 진짜 superset이 된다 — endDate만 보면 그런 행을 선탈락시킴.
    const lowerBoundOr = {
      OR: [
        { endDate: null },
        { endDate: { gte: fromDate } },
        { startDate: { gte: fromDate } },
      ],
    }
    const sharedAnd: any[] = [
      lowerBoundOr,
      { personId: { not: subject.id } },
      ...(scopeWhere ? [scopeWhere] : []),
    ]
    // GovernmentPositionTenure.startDate는 필수 DATETIME(AD1000+)이라 상한 프루닝이 정확.
    const tenureOverlapAnd: any[] = [{ startDate: { lt: toDateExclusive } }, ...sharedAnd]
    // SovereignReign은 BC·AD<1000을 startDate=NULL(startEra/startYear가 진실)로 두므로,
    // NULL startDate 행도 통과시켜 후처리(구조화 부호연도)가 판정하게 한다 — SQL은 프루닝용 superset.
    // (이 분기 없이는 카롤루스 등 AD<1000 재위가 상한 프루닝에서 조용히 탈락한다.)
    const reignOverlapAnd: any[] = [
      { OR: [{ startDate: { lt: toDateExclusive } }, { startDate: null }] },
      ...sharedAnd,
    ]

    const recordSelect = {
      id: true,
      appointmentMethod: true,
      termNumber: true,
      regnalNumber: true,
      startDate: true,
      endDate: true,
      person: { select: RULER_PERSON_SELECT },
      country: { select: { id: true, name: true, flagEmoji: true } },
      historicalCountry: { select: { id: true, name: true } },
      positionDefinition: { select: { id: true, title: true } },
    } as const

    const [tenureRows, reignRows] = await Promise.all([
      this.prisma.governmentPositionTenure.findMany({
        where: {
          AND: [
            { positionType: { in: [...HEAD_POSITION_TYPES] } },
            ...tenureOverlapAnd,
          ],
        },
        select: { ...recordSelect, positionType: true, title: true },
      }),
      this.prisma.sovereignReign.findMany({
        where: { AND: reignOverlapAnd },
        select: {
          ...recordSelect,
          regnalName: true,
          startEra: true,
          startYear: true,
          endEra: true,
          endYear: true,
        },
      }),
    ])

    type CandidateRow = {
      record: ContemporaryRecordDto
      person: (typeof tenureRows)[number]['person']
      effectiveEnd: number
    }

    const toCandidate = (
      row: any,
      recordKind: ContemporaryRecordDto['recordKind'],
    ): CandidateRow | null => {
      // 재위는 구조화 축(startEra/startYear)이 진실 — tenure는 구조화 컬럼이 없어 DATETIME 폴백.
      const startYear = signedYearFromStructuredOrDate(
        row.startEra,
        row.startYear,
        row.startDate,
      )
      if (startYear == null) return null
      const endYear = signedYearFromStructuredOrDate(row.endEra, row.endYear, row.endDate)
      const effectiveEnd = effectiveEndYear({
        startYear,
        endYear,
        death: deathInfoOf(row.person),
        nowYear,
      })
      // 연도 필터 정본 — 종료일 미입력 기록은 그 수장의 사망 연도로 캡되므로,
      // endDate 없는 조선 왕이 현대 창의 '동시대'로 등장하지 않는다.
      if (effectiveEnd < fromYear || startYear >= toYear) return null
      return {
        person: row.person,
        effectiveEnd,
        record: {
          recordId: row.id,
          recordKind,
          positionType:
            recordKind === 'SOVEREIGN_REIGN'
              ? 'HEAD_OF_STATE'
              : (row.positionType as string),
          title:
            recordKind === 'SOVEREIGN_REIGN'
              ? (row.positionDefinition?.title ?? null)
              : (row.title ?? row.positionDefinition?.title ?? null),
          appointmentMethod: row.appointmentMethod ?? null,
          regnalName: recordKind === 'SOVEREIGN_REIGN' ? (row.regnalName ?? null) : null,
          regnalNumber: row.regnalNumber ?? null,
          termNumber: row.termNumber ?? null,
          startYear,
          endYear,
          // 구조화 재위(startDate=NULL)는 부호 연도 1월 1일로 합성 — dedup 키·정렬 안정성 유지
          startDate: row.startDate
            ? row.startDate.toISOString()
            : utcYearStart(startYear).toISOString(),
          endDate: row.endDate
            ? row.endDate.toISOString()
            : endYear != null
              ? utcYearStart(endYear).toISOString()
              : null,
          country: row.country ?? null,
          historicalCountry: row.historicalCountry ?? null,
        },
      }
    }

    // dedup은 **크로스종류만** 적용한다: 같은 취임을 TENURE·SOVEREIGN_REIGN 양쪽에 이중
    // 입력한 경우 REIGN을 우선(수장비교 normalize-tenures 규칙과 동일 — 두 화면이 다르게 세면 안 됨).
    // 같은 종류끼리는 흡수하지 않는다 — 같은 시작일의 서로 다른 두 재위(동군연합: 폴란드 국왕 +
    // 리투아니아 대공 등)나 같은 날 시작한 두 재임이 하나로 붕괴하지 않게. (country를 키에 넣으면
    // dual-fill 이중입력에서 tenure=현대국가·reign=역사국가로 갈려 크로스종류 dedup이 깨진다.)
    // 날짜 키는 UTC 날짜 단위(시간 무시) — 저장 경로별 time-of-day 드리프트(00:00 vs 09:00)로
    // 유령 중복이 생기지 않게(normalize-tenures의 24h 관용과 동일).
    const personDayKeyOf = (candidate: CandidateRow) =>
      `${candidate.person.id}:${candidate.record.startDate.slice(0, 10)}`

    const reignCandidates: CandidateRow[] = []
    for (const row of reignRows) {
      const candidate = toCandidate(row, 'SOVEREIGN_REIGN')
      if (candidate) reignCandidates.push(candidate)
    }
    const reignPersonDays = new Set(reignCandidates.map(personDayKeyOf))

    const tenureCandidates: CandidateRow[] = []
    for (const row of tenureRows) {
      const candidate = toCandidate(row, 'TENURE')
      if (!candidate) continue
      // 같은 인물·같은 날짜에 재위가 있으면 그 재위가 같은 취임의 정본 — tenure 흡수(REIGN 우선)
      if (reignPersonDays.has(personDayKeyOf(candidate))) continue
      tenureCandidates.push(candidate)
    }

    // 인물별 그룹 + 겹침 길이 계산
    const byPerson = new Map<
      string,
      { person: CandidateRow['person']; records: ContemporaryRecordDto[]; overlapYears: number }
    >()
    for (const candidate of [...reignCandidates, ...tenureCandidates]) {
      const overlap =
        Math.min(candidate.effectiveEnd, toYear - 1) -
        Math.max(candidate.record.startYear, fromYear) +
        1
      const entry = byPerson.get(candidate.person.id)
      if (entry) {
        entry.records.push(candidate.record)
        entry.overlapYears = Math.max(entry.overlapYears, overlap)
      } else {
        byPerson.set(candidate.person.id, {
          person: candidate.person,
          records: [candidate.record],
          overlapYears: overlap,
        })
      }
    }

    const rulers: ContemporaryRulerDto[] = [...byPerson.values()]
      .map((entry) => ({
        person: {
          id: entry.person.id,
          name: entry.person.name ?? null,
          surname: entry.person.surname ?? null,
          middleName: entry.person.middleName ?? null,
          nameDisplayOrder: entry.person.nameDisplayOrder ?? null,
          country: entry.person.country
            ? {
                defaultNameDisplayOrder:
                  entry.person.country.defaultNameDisplayOrder ?? null,
              }
            : null,
          profileImageUrl: entry.person.profileImageUrl ?? null,
          templeName: entry.person.templeName ?? null,
          regnalName: entry.person.regnalName ?? null,
          isAlive: entry.person.isAlive === true,
          deathYear: signedYearFromEraDate(entry.person.deathEra, entry.person.deathDate),
          // 타계정 인물은 상세(:id)가 소유자 게이트라 열 수 없음 — 칩 비활성 판단용
          isOwned: accountId != null && entry.person.accountId === accountId,
        },
        records: entry.records.sort((left, right) => left.startYear - right.startYear),
        overlapYears: entry.overlapYears,
      }))
      .sort(
        (left, right) =>
          right.overlapYears - left.overlapYears ||
          (left.records[0]?.startYear ?? 0) - (right.records[0]?.startYear ?? 0) ||
          left.person.id.localeCompare(right.person.id),
      )

    const capped = rulers.slice(0, limit)
    return {
      meta: {
        window: { fromYear, toYear },
        derivedFromSubject,
        scope,
        totalPersons: rulers.length,
        omittedCount: rulers.length - capped.length,
      },
      rulers: capped,
    }
  }

  /**
   * 창 결정 — 명시(fromYear+toYear 둘 다) 또는 대상의 수장급 병합 구간에서 유도.
   * 유도 규칙은 프론트 contemporary-heads-target.ts와 동일(사망 캡·미상 클램프).
   */
  private resolveWindow(
    params: GetContemporariesParams,
    subjectHeadRecords: Array<{ startSignedYear: number | null; endSignedYear: number | null }>,
    subjectDeath: SubjectDeathInfo,
    nowYear: number,
  ): { fromYear: number; toYear: number; derivedFromSubject: boolean } {
    const { fromYear, toYear } = params
    if (fromYear != null && toYear != null) {
      return { fromYear, toYear, derivedFromSubject: false }
    }
    if (fromYear != null || toYear != null) {
      throw new BadRequestException('fromYear·toYear는 함께 지정하거나 함께 생략해야 합니다')
    }

    let minStart: number | null = null
    let maxEnd: number | null = null
    for (const record of subjectHeadRecords) {
      const startYear = record.startSignedYear
      if (startYear == null) continue
      const end = effectiveEndYear({
        startYear,
        endYear: record.endSignedYear,
        death: subjectDeath,
        nowYear,
      })
      minStart = minStart == null ? startYear : Math.min(minStart, startYear)
      maxEnd = maxEnd == null ? end : Math.max(maxEnd, end)
    }
    if (minStart == null || maxEnd == null) {
      throw new BadRequestException(
        '대상 인물의 수장급 재임·재위가 없어 기간을 유도할 수 없습니다 — fromYear·toYear를 지정하세요',
      )
    }
    // toYear 배타 계약 (CenturySelection·person-records/compare와 동일)
    return { fromYear: minStart, toYear: maxEnd + 1, derivedFromSubject: true }
  }

  /**
   * scope=sameCountry — 대상의 수장급 기록이 걸린 국가들(+역사↔현대 브리지 확장)로 제한.
   * buildCountryScopeWhere(person.prisma.repository)와 동일한 브리지 해석의 다국가 버전.
   */
  private async buildSameCountryWhere(
    subjectHeadRecords: Array<{ countryId: string | null; historicalCountryId: string | null }>,
  ): Promise<any | null> {
    const modernIds = new Set<string>()
    const historicalIds = new Set<string>()
    for (const record of subjectHeadRecords) {
      if (record.countryId) modernIds.add(record.countryId)
      if (record.historicalCountryId) historicalIds.add(record.historicalCountryId)
    }
    if (modernIds.size === 0 && historicalIds.size === 0) return null

    const [linkedModern, linkedHistorical] = await Promise.all([
      historicalIds.size > 0
        ? this.prisma.historicalCountryModernCountry.findMany({
            where: { historicalCountryId: { in: [...historicalIds] } },
            select: { modernCountryId: true },
          })
        : Promise.resolve([]),
      modernIds.size > 0
        ? this.prisma.historicalCountryModernCountry.findMany({
            where: { modernCountryId: { in: [...modernIds] } },
            select: { historicalCountryId: true },
          })
        : Promise.resolve([]),
    ])
    for (const link of linkedModern) modernIds.add(link.modernCountryId)
    for (const link of linkedHistorical) historicalIds.add(link.historicalCountryId)

    const clauses: any[] = []
    if (modernIds.size > 0) clauses.push({ countryId: { in: [...modernIds] } })
    if (historicalIds.size > 0) {
      clauses.push({ historicalCountryId: { in: [...historicalIds] } })
    }
    return { OR: clauses }
  }
}
