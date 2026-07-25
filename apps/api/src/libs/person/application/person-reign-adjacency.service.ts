import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@prisma/prisma.service'
import type { ContemporaryRulerPersonDto } from '../presentation/dto/person-contemporaries.response'
import {
  AdjacencyNeighborDto,
  AdjacencyRecordDto,
  AdjacencyRelation,
  PersonReignAdjacencyResponseDto,
  ReignAdjacencyEntryDto,
} from '../presentation/dto/person-reign-adjacency.response'
import {
  HEAD_POSITION_TYPES,
  RULER_PERSON_SELECT,
  deathInfoOf,
  effectiveEndYear,
  signedYearFromEraDate,
  yearOf,
} from './head-record.shared'

/** 이웃 후보 over-fetch 상한 — 동률 클러스터·dedup 붕괴 대비 (depth=1 고정 MVP) */
const NEIGHBOR_OVERFETCH = 16

/** 대상 앵커 조회 select — 스코프·경계·정밀도 판정에 필요한 최소셋 */
const ANCHOR_SELECT = {
  id: true,
  startDate: true,
  endDate: true,
  startDatePrecision: true,
  countryId: true,
  historicalCountryId: true,
} as const

/** 이웃 record 조회 select — 표시(칩)에 필요한 전 필드 (contemporaries recordSelect + startDatePrecision) */
const NEIGHBOR_SELECT = {
  id: true,
  appointmentMethod: true,
  termNumber: true,
  regnalNumber: true,
  startDate: true,
  endDate: true,
  startDatePrecision: true,
  person: { select: RULER_PERSON_SELECT },
  country: { select: { id: true, name: true, flagEmoji: true } },
  historicalCountry: { select: { id: true, name: true } },
  positionDefinition: { select: { id: true, title: true } },
} as const

export interface GetReignAdjacencyParams {
  personId: string
  /** 대상 인물 소유자 게이트(findById 관례) — 결과 이웃 목록은 글로벌 읽기 */
  accountId?: string
  /** 'instance'(정확 국가만) | 'succession'(전이 그래프 확장 — B4). MVP는 instance 동작. */
  scope: 'instance' | 'succession'
}

/** 'YYYY-MM-DD' (dedup·경계 키 — contemporaries와 동일 UTC 날짜 단위) */
function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** UTC 월·일 정수(MMDD) — 같은 해 안 정렬용 */
function monthDay(date: Date): number {
  return (date.getUTCMonth() + 1) * 100 + date.getUTCDate()
}

function toPersonDto(person: any, accountId?: string): ContemporaryRulerPersonDto {
  return {
    id: person.id,
    name: person.name ?? null,
    surname: person.surname ?? null,
    middleName: person.middleName ?? null,
    nameDisplayOrder: person.nameDisplayOrder ?? null,
    country: person.country
      ? { defaultNameDisplayOrder: person.country.defaultNameDisplayOrder ?? null }
      : null,
    profileImageUrl: person.profileImageUrl ?? null,
    templeName: person.templeName ?? null,
    regnalName: person.regnalName ?? null,
    isAlive: person.isAlive === true,
    deathYear: signedYearFromEraDate(person.deathEra, person.deathDate),
    // 타계정 인물은 상세(:id)가 소유자 게이트라 열 수 없음 — 칩 비활성 판단용
    isOwned: accountId != null && person.accountId === accountId,
  }
}

function toRecordDto(
  row: any,
  recordKind: 'TENURE' | 'SOVEREIGN_REIGN',
): AdjacencyRecordDto {
  return {
    recordId: row.id,
    recordKind,
    // SOVEREIGN_REIGN은 전량 HEAD_OF_STATE로 간주 (categorize 관례와 동일)
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
    startYear: yearOf(row.startDate) as number,
    endYear: yearOf(row.endDate),
    startDate: row.startDate.toISOString(),
    endDate: row.endDate ? row.endDate.toISOString() : null,
    startDatePrecision: row.startDatePrecision ?? null,
    country: row.country ?? null,
    historicalCountry: row.historicalCountry ?? null,
  }
}

interface NeighborCandidate {
  recordKind: 'TENURE' | 'SOVEREIGN_REIGN'
  row: any
  personId: string
  startDate: Date
  startYear: number
  /** startDatePrecision === 'year' — 같은 해 순서 모호 판정 */
  precisionYear: boolean
}

interface EntryContext {
  subjectId: string
  anchorStartYear: number
  anchorEndYear: number
  nowYear: number
  accountId?: string
}

/**
 * 같은 국가 전/후 재위(reign-adjacency) 읽기모델 — 「동시대 수장」의 시간축 인접 자매.
 *
 * 스키마 변경 0: 앵커 record별로 **정확한 국가 인스턴스**(countryId 또는
 * historicalCountryId)로 좁혀 head union(HEAD tenure ∪ SovereignReign)에서
 * startDate 인접(직전=선대, 직후=후대)을 뽑는다. `buildSameCountryWhere`(m:n 브리지)는
 * 창이 없어 병렬 정체가 가짜 이웃을 만들므로 **재사용하지 않는다**(검토서 §2.2).
 * 크로스-정체 승계(왕국→공화국)는 HistoricalCountryTransition 그래프로 B4에서 가산.
 */
@Injectable()
export class PersonReignAdjacencyService {
  constructor(private readonly prisma: PrismaService) {}

  async getReignAdjacency(
    params: GetReignAdjacencyParams,
  ): Promise<PersonReignAdjacencyResponseDto> {
    const { personId, accountId, scope } = params
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
    const subjectDeath = deathInfoOf(subject)

    // 대상 수장급 앵커 — head tenure ∪ reign 전량. 앵커는 dedup하지 않는다:
    // 카드가 record별로 렌더되므로 각 카드가 자기 승계 박스를 가져야 함(복위·다국가).
    const [anchorTenures, anchorReigns] = await Promise.all([
      this.prisma.governmentPositionTenure.findMany({
        where: { personId, positionType: { in: [...HEAD_POSITION_TYPES] } },
        select: ANCHOR_SELECT,
      }),
      this.prisma.sovereignReign.findMany({
        where: { personId },
        select: ANCHOR_SELECT,
      }),
    ])
    const anchors = [
      ...anchorTenures.map((row) => ({ kind: 'TENURE' as const, row })),
      ...anchorReigns.map((row) => ({ kind: 'SOVEREIGN_REIGN' as const, row })),
    ]

    let bcSkippedCount = 0
    let noCountryCount = 0
    const entries: ReignAdjacencyEntryDto[] = []

    for (const anchor of anchors) {
      const anchorStartDate = anchor.row.startDate
      const anchorStartYear = yearOf(anchorStartDate)
      // 현 스키마 tenure/reign DATETIME은 AD 전용 — 연도<1은 BC 취급, 계산 생략.
      // (startDate는 필수 컬럼이라 null 분기는 실질 미발생 — TS 내로잉용)
      if (anchorStartDate == null || anchorStartYear == null || anchorStartYear < 1) {
        bcSkippedCount++
        continue
      }
      const resolved = await this.resolveScope(anchor.row, scope)
      if (!resolved) {
        // 국가 정보 없음(교황 등) — 같은 국가 정의 불가. record 단위로 이 앵커만 제외.
        noCountryCount++
        continue
      }
      const scopeWhere = resolved.where

      const anchorEndYear = effectiveEndYear({
        startYear: anchorStartYear,
        endYear: yearOf(anchor.row.endDate),
        death: subjectDeath,
        nowYear,
      })
      const context: EntryContext = {
        subjectId: subject.id,
        anchorStartYear,
        anchorEndYear,
        nowYear,
        accountId,
      }

      const [predRows, succRows] = await Promise.all([
        this.fetchNeighbors(scopeWhere, anchorStartDate, 'PREDECESSOR'),
        this.fetchNeighbors(scopeWhere, anchorStartDate, 'SUCCESSOR'),
      ])
      const predecessors = this.nearestGroup(predRows, 'PREDECESSOR', context)
      const successors = this.nearestGroup(succRows, 'SUCCESSOR', context)

      entries.push({
        subjectRecordId: anchor.row.id,
        subjectRecordKind: anchor.kind,
        scope: {
          countryId: anchor.row.countryId ?? null,
          historicalCountryId: anchor.row.historicalCountryId ?? null,
          degradedToStrict: resolved.degradedToStrict,
        },
        predecessors: predecessors.neighbors,
        successors: successors.neighbors,
        omittedCoBoundaryCount: predecessors.omitted + successors.omitted,
      })
    }

    return {
      meta: {
        scope,
        totalSubjectRecords: entries.length,
        bcSkippedCount,
        noCountryCount,
      },
      entries,
    }
  }

  /**
   * 앵커 record의 「같은 국가」 스코프.
   *
   * - `instance`(기본): 앵커의 **정확한 국가 인스턴스** 하나(역사국가 우선). 확장 0.
   * - `succession`(B4): 역사 정체 앵커면 `HistoricalCountryTransition`(방향성
   *   predecessor/successor) **1-hop** 그래프로 직전/직후 정체를 가산 —
   *   STATE_SUCCESSION(주권 계승)·REGIME_CHANGE(정권 교체, 예 차르국→제국) 모두 승계 축.
   *   병렬 공존 정체는 전이 엣지가 없어 유입되지 않는다. 확장된 역사 정체 집합에 한해
   *   historical→modern(linkedModern)만 허용해 왕국→공화국(초대 대통령) 크로스를 잇는다
   *   (현대→역사 역방향은 금지 — 현대 깃발 하나에 매달린 모든 역사 정체를 끌어와 오염).
   *   전이 미시드 국가는 instance-only로 강등(degradedToStrict, 체인 단절 감수 > 가짜 이웃).
   *
   * ⚠️ 어느 모드든 buildSameCountryWhere(m:n 브리지) 재사용 금지 — 창이 없는 adjacency에선
   * 병렬 정체가 날짜순으로 섞여 가짜 선/후대를 만든다(검토서 §2.2).
   */
  private async resolveScope(
    anchorRow: { countryId: string | null; historicalCountryId: string | null },
    scope: 'instance' | 'succession',
  ): Promise<{ where: object; degradedToStrict: boolean } | null> {
    const primaryHistorical = anchorRow.historicalCountryId
    const primaryModern = anchorRow.countryId
    if (!primaryHistorical && !primaryModern) return null

    // instance, 또는 모던-only 앵커(현대 수반) — 정확한 인스턴스 하나. 확장 없음.
    // (모던-only는 succession이어도 역방향 전이 확장 대상 아님 — 오염 회피, 검토 §5-4)
    if (scope === 'instance' || !primaryHistorical) {
      const where = primaryHistorical
        ? { historicalCountryId: primaryHistorical }
        : { countryId: primaryModern as string }
      return { where, degradedToStrict: false }
    }

    // succession + 역사 정체: 전이 그래프 1-hop 확장
    const edges = await this.prisma.historicalCountryTransition.findMany({
      where: {
        OR: [
          { predecessorId: primaryHistorical },
          { successorId: primaryHistorical },
        ],
      },
      select: { predecessorId: true, successorId: true },
    })
    if (edges.length === 0) {
      // 전이 미시드 → instance-only 폴백(가짜로 채우지 않음)
      return { where: { historicalCountryId: primaryHistorical }, degradedToStrict: true }
    }

    const historicalIds = new Set<string>([primaryHistorical])
    for (const edge of edges) {
      historicalIds.add(edge.predecessorId)
      historicalIds.add(edge.successorId)
    }
    const modernIds = new Set<string>()
    if (primaryModern) modernIds.add(primaryModern)
    // historical→modern: 확장된 역사 정체 체인이 현대-filed 수반(초대 대통령 등)에 닿게 한다
    const links = await this.prisma.historicalCountryModernCountry.findMany({
      where: { historicalCountryId: { in: [...historicalIds] } },
      select: { modernCountryId: true },
    })
    for (const link of links) modernIds.add(link.modernCountryId)

    const clauses: object[] = []
    if (modernIds.size > 0) clauses.push({ countryId: { in: [...modernIds] } })
    clauses.push({ historicalCountryId: { in: [...historicalIds] } })
    return { where: { OR: clauses }, degradedToStrict: false }
  }

  /**
   * 스코프 안에서 방향(직전/직후) 이웃 후보를 over-fetch.
   * 경계는 앵커의 **실제 저장 startDate**와 비교(합성 연도-경계가 아니라) — MySQL
   * <AD1000 DATETIME 불안정 구간에서도 저장값끼리의 비교라 안전. 진실은 JS 후처리.
   */
  private async fetchNeighbors(
    scopeWhere: object,
    anchorStartDate: Date,
    relation: AdjacencyRelation,
  ): Promise<NeighborCandidate[]> {
    const dateFilter =
      relation === 'PREDECESSOR'
        ? { startDate: { lt: anchorStartDate } }
        : { startDate: { gt: anchorStartDate } }
    const orderBy = {
      startDate: relation === 'PREDECESSOR' ? ('desc' as const) : ('asc' as const),
    }
    const [tenureRows, reignRows] = await Promise.all([
      this.prisma.governmentPositionTenure.findMany({
        where: {
          AND: [
            scopeWhere,
            // 이웃 tenure도 수장급만 — 같은 국가 장관·의원이 선/후대로 유입되지 않게
            { positionType: { in: [...HEAD_POSITION_TYPES] } },
            dateFilter,
          ],
        },
        select: { ...NEIGHBOR_SELECT, positionType: true, title: true },
        orderBy,
        take: NEIGHBOR_OVERFETCH,
      }),
      this.prisma.sovereignReign.findMany({
        where: { AND: [scopeWhere, dateFilter] },
        select: { ...NEIGHBOR_SELECT, regnalName: true },
        orderBy,
        take: NEIGHBOR_OVERFETCH,
      }),
    ])
    const candidates: NeighborCandidate[] = []
    for (const row of tenureRows) {
      const candidate = this.toCandidate(row, 'TENURE')
      if (candidate) candidates.push(candidate)
    }
    for (const row of reignRows) {
      const candidate = this.toCandidate(row, 'SOVEREIGN_REIGN')
      if (candidate) candidates.push(candidate)
    }
    return candidates
  }

  private toCandidate(
    row: any,
    recordKind: 'TENURE' | 'SOVEREIGN_REIGN',
  ): NeighborCandidate | null {
    const startYear = yearOf(row.startDate)
    if (startYear == null) return null
    return {
      recordKind,
      row,
      personId: row.person.id,
      startDate: row.startDate,
      startYear,
      precisionYear: row.startDatePrecision === 'year',
    }
  }

  /**
   * dedup → 정밀도 인지 경계 그룹핑 → 최근접 경계 그룹(동률 전부) 선택.
   * depth=1: 각 방향으로 최근접 경계 하나만(그 경계의 공동군주는 배열로 전부).
   */
  private nearestGroup(
    candidates: NeighborCandidate[],
    relation: AdjacencyRelation,
    context: EntryContext,
  ): { neighbors: AdjacencyNeighborDto[]; omitted: number } {
    if (candidates.length === 0) return { neighbors: [], omitted: 0 }

    // dedup: 같은 인물·같은 UTC 날짜의 tenure/reign 이중계상 → REIGN 우선
    // (contemporaries 규칙과 동일 — 안 하면 대상 tenure가 자기 reign의 이웃으로 등장)
    const byDedup = new Map<string, NeighborCandidate>()
    for (const candidate of candidates) {
      const key = `${candidate.personId}:${isoDay(candidate.startDate)}`
      const existing = byDedup.get(key)
      if (!existing || candidate.recordKind === 'SOVEREIGN_REIGN') {
        byDedup.set(key, candidate)
      }
    }
    const deduped = [...byDedup.values()]

    // 정밀도 인지 경계: 한 연도에 year-precision 후보가 하나라도 있으면 그 연도 전체를
    // '순서 미상' 동률로 묶는다(01-01 관행 채움이 만든 가짜 순서 방지, 검토서 #5).
    const ambiguousYear = new Set<number>()
    for (const candidate of deduped) {
      if (candidate.precisionYear) ambiguousYear.add(candidate.startYear)
    }
    const boundaryKey = (candidate: NeighborCandidate) =>
      ambiguousYear.has(candidate.startYear)
        ? `Y:${candidate.startYear}`
        : `D:${isoDay(candidate.startDate)}`
    const rank = (candidate: NeighborCandidate) =>
      candidate.startYear * 10000 +
      (ambiguousYear.has(candidate.startYear) ? 0 : monthDay(candidate.startDate))

    // 가까운 순: 선대=내림차순, 후대=오름차순. 동률 안정정렬은 record.id.
    deduped.sort((left, right) => {
      const diff =
        relation === 'PREDECESSOR'
          ? rank(right) - rank(left)
          : rank(left) - rank(right)
      return diff !== 0 ? diff : left.row.id.localeCompare(right.row.id)
    })

    const nearestKey = boundaryKey(deduped[0]!)
    const group = deduped.filter((candidate) => boundaryKey(candidate) === nearestKey)

    // 병리적 동률(같은 경계에 over-fetch 상한 이상 record)만 무성 절단 신호 — 현실엔 거의 없음
    const omitted = group.length >= NEIGHBOR_OVERFETCH ? group.length : 0

    const coBoundary = group.length > 1
    const neighbors = group.map((candidate) =>
      this.toNeighbor(candidate, relation, context, coBoundary),
    )
    return { neighbors, omitted }
  }

  private toNeighbor(
    candidate: NeighborCandidate,
    relation: AdjacencyRelation,
    context: EntryContext,
    coBoundary: boolean,
  ): AdjacencyNeighborDto {
    const neighborEndYear = effectiveEndYear({
      startYear: candidate.startYear,
      endYear: yearOf(candidate.row.endDate),
      death: deathInfoOf(candidate.row.person),
      nowYear: context.nowYear,
    })
    // 공동/중첩/대립왕 표시 — 경계에서 '엄격'하게 본다. 정상 승계(선대 종료 연도 ==
    // 앵커 시작 연도, 또는 앵커 종료 == 후대 시작)는 겹침이 아니다(연 단위 handover).
    // 선대: 앵커 시작 이후까지 재위했는가(종료 > 앵커 시작). 후대: 앵커 종료 전에
    // 시작했는가(시작 < 앵커 종료). >=/<= 로 보면 모든 정상 승계가 겹침으로 오탐된다.
    const overlapsAnchor =
      relation === 'PREDECESSOR'
        ? neighborEndYear > context.anchorStartYear
        : candidate.startYear < context.anchorEndYear
    return {
      relation,
      person: toPersonDto(candidate.row.person, context.accountId),
      record: toRecordDto(candidate.row, candidate.recordKind),
      overlapsAnchor,
      coBoundary,
      // 대상 본인의 다른 재위 단계(복위·공동→단독) — 프론트는 딥링크 비활성
      isSelf: candidate.personId === context.subjectId,
    }
  }
}
