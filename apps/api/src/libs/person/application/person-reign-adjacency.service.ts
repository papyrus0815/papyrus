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

/**
 * 승계 축 — 국가원수(군주 포함)와 정부수반은 **병렬 공존**하므로 한 시간축이 아니다.
 * 입헌군주정에서 총리와 군주는 동시에 재직하며 서로를 계승하지 않는다.
 *
 * HEAD_OF_STATE/HEAD_OF_GOVERNMENT는 나라에 보통 그 자리가 하나뿐이라 positionType만으로
 * "같은 자리"가 특정된다. 반면 MILITARY_COMMANDER/CABINET_MINISTER는 한 나라에 동시에
 * 여러 자리(참모총장·군단장·외무장관·재무장관…)가 있어 positionType 하나로는 서로 다른
 * 자리가 뒤섞인다(참모총장의 '후임'으로 엉뚱한 여단장이 잡히는 식) — title까지 일치해야
 * 같은 자리다(TITLED). SovereignReign은 군주 전용이라 TITLED 축을 갖지 않는다.
 */
type SuccessionAxis =
  | { kind: 'HEAD_OF_STATE' }
  | { kind: 'HEAD_OF_GOVERNMENT' }
  | { kind: 'TITLED'; positionType: (typeof TITLED_POSITION_TYPES)[number]; title: string }

/**
 * 「같은 국가 전/후 재위」 화면에서만 앵커 후보를 넓히는 확장 — 「동시대 수장」 등 다른
 * 화면과 공유하는 HEAD_POSITION_TYPES(head-record.shared.ts)는 건드리지 않는다(그 화면들은
 * "수장급" 개념 자체가 국가원수·정부수반으로 한정돼 있어, 여기 넓히면 그쪽까지 오염된다).
 */
const TITLED_POSITION_TYPES = ['MILITARY_COMMANDER', 'CABINET_MINISTER'] as const

/**
 * 축 판정은 **직위 정의(positionDefinition.positionType)** 가 진실이다 — record가
 * 어느 테이블에 있느냐(TENURE/SOVEREIGN_REIGN)는 축이 아니다. 실측: sovereign_reign에
 * 정의가 HEAD_OF_GOVERNMENT인 행이 17건(도쿠가와 쇼군 15·프랑스 제3공화국 총리 2)이고,
 * 프랑스 제3공화국 총리직은 재임 3행 + 재위 2행으로 **두 테이블에 쪼개져** 있다.
 * 테이블로 축을 가르면 클레망소(재임)→푸앵카레(재위)→푸앵카레(재임) 총리 사슬이 끊긴다.
 *
 * 규칙은 화이트리스트 1종 — **HEAD_OF_GOVERNMENT로 명시된 것만 정부수반**, 나머지
 * (HEAD_OF_STATE·ROYAL_NOBLE_TITLE·정의 없음)는 전부 국가원수 축. 정의 미기입 군주
 * (샤를 5세 등 8행)가 자기 왕국 승계선에서 탈락하지 않도록 폴백을 국가원수로 둔다.
 */
const HEAD_OF_GOVERNMENT_TYPE = 'HEAD_OF_GOVERNMENT'

/** 대상 앵커 조회 공통 select — 스코프·경계·정밀도 판정에 필요한 최소셋 */
const ANCHOR_BASE_SELECT = {
  id: true,
  startDate: true,
  endDate: true,
  startDatePrecision: true,
  countryId: true,
  historicalCountryId: true,
} as const

/**
 * 재임 앵커의 축은 자기 positionType(재임은 정의 없이도 타입이 필수 컬럼) — TITLED 축은
 * 거기에 title까지 더해 "같은 자리"를 특정하므로 title도 함께 읽는다.
 */
const ANCHOR_TENURE_SELECT = {
  ...ANCHOR_BASE_SELECT,
  positionType: true,
  title: true,
} as const

/** 재위 앵커의 축은 연결된 직위 정의에서 읽는다 (정의 없으면 국가원수 폴백) */
const ANCHOR_REIGN_SELECT = {
  ...ANCHOR_BASE_SELECT,
  positionDefinition: { select: { positionType: true } },
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
  // positionType은 재위 이웃의 축 판정·응답 정직성(toRecordDto)에 쓰인다
  positionDefinition: { select: { id: true, title: true, positionType: true } },
} as const

export interface GetReignAdjacencyParams {
  personId: string
  /** 대상 인물 소유자 게이트(findById 관례) — 결과 이웃 목록은 글로벌 읽기 */
  accountId?: string
  /** 'instance'(정확 국가만) | 'succession'(전이 그래프 확장 — B4). MVP는 instance 동작. */
  scope: 'instance' | 'succession'
}

interface AxisSource {
  positionType?: string | null
  title?: string | null
  positionDefinition?: { positionType?: string | null } | null
}

/**
 * 앵커가 놓인 승계 축 — 재임은 자기 positionType, 재위는 연결된 직위 정의에서 읽는다.
 * 재임이 TITLED 후보(참모총장·장관 등)면 title까지 축에 실어 "같은 자리"만 매칭되게 한다
 * (title이 비어 있으면 매칭 상대가 있을 수 없으므로 국가원수 축으로 안전 폴백 — 빈 이웃).
 * 그 외(재임의 다른 positionType, 재위 전체)는 HEAD_OF_GOVERNMENT가 아니면 국가원수(폴백)라,
 * 값이 비어도 `positionType: undefined`(= 필터 소실) 같은 구멍이 이웃 쿼리로 새지 않는다.
 */
function axisOfAnchor(
  kind: 'TENURE' | 'SOVEREIGN_REIGN',
  row: AxisSource,
): SuccessionAxis {
  if (kind === 'TENURE' && (TITLED_POSITION_TYPES as readonly string[]).includes(row.positionType ?? '')) {
    if (row.title) {
      return {
        kind: 'TITLED',
        positionType: row.positionType as (typeof TITLED_POSITION_TYPES)[number],
        title: row.title,
      }
    }
    return { kind: 'HEAD_OF_STATE' }
  }
  const declared =
    kind === 'SOVEREIGN_REIGN'
      ? (row.positionDefinition?.positionType ?? null)
      : (row.positionType ?? null)
  return declared === HEAD_OF_GOVERNMENT_TYPE ? { kind: 'HEAD_OF_GOVERNMENT' } : { kind: 'HEAD_OF_STATE' }
}

/**
 * 이웃 재위(SovereignReign)의 축 게이트 절. TITLED 축은 호출되지 않는다 — SovereignReign은
 * 군주 전용이라 참모총장·장관 같은 TITLED 자리를 가질 수 없다(fetchNeighbors가 가드).
 *
 * ⚠️ Prisma의 선택적 to-one 중첩 조건(`positionDefinition: { is: ... }`)은 **관계가
 * NULL인 행을 배제**한다. 국가원수 축에 그대로 쓰면 정의 미기입 군주가 조용히 사라진다 —
 * 실측으로 샤를 5세(프랑스 왕국 1364)가 필리프 6세 재위와 루이 12세 재임 사이에 실재해,
 * 떨어뜨리면 선대/후대가 134년 점프한다. 그래서 `positionDefinitionId: null`을 명시 OR로 살린다.
 */
function reignAxisWhere(axis: { kind: 'HEAD_OF_STATE' } | { kind: 'HEAD_OF_GOVERNMENT' }): object {
  if (axis.kind === 'HEAD_OF_GOVERNMENT') {
    return { positionDefinition: { is: { positionType: HEAD_OF_GOVERNMENT_TYPE } } }
  }
  return {
    OR: [
      { positionDefinitionId: null },
      { positionDefinition: { is: { positionType: { not: HEAD_OF_GOVERNMENT_TYPE } } } },
    ],
  }
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
    // 재위는 자기 positionType 컬럼이 없어 직위 정의에서 파생한다. 전량 HEAD_OF_STATE로
    // 굳히면 총리 정의로 등록된 재위(푸앵카레)가 응답에서 국가원수로 둔갑한다.
    // 정의 없는 군주는 국가원수 폴백 — axisOfAnchor와 같은 규칙.
    positionType:
      recordKind === 'SOVEREIGN_REIGN'
        ? (row.positionDefinition?.positionType ?? 'HEAD_OF_STATE')
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
 * historicalCountryId)로 좁히고, 다시 **앵커의 승계 축**(국가원수 = HEAD_OF_STATE 재임 ∪
 * SovereignReign / 정부수반 = HEAD_OF_GOVERNMENT 재임)으로 좁혀 startDate 인접
 * (직전=선대, 직후=후대)을 뽑는다. `buildSameCountryWhere`(m:n 브리지)는 창이 없어
 * 병렬 정체가 가짜 이웃을 만들므로 **재사용하지 않는다**(검토서 §2.2).
 * 크로스-정체 승계(왕국→공화국)는 HistoricalCountryTransition 그래프로 B4에서 가산.
 *
 * 공간(국가)과 축(직위 계열)은 **직교한 두 게이트**다. 국가만 좁히면 입헌군주정에서
 * 병렬 재직인 군주와 총리가 한 시간축에 섞여, 자기 축에 선대가 없는 앵커의 빈자리를
 * 다른 축이 메운다(러시아 제국 초대 총리 비테의 '선대'로 니콜라이 2세가 잡히던 결함).
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

    // 대상 앵커 — head tenure ∪ TITLED tenure(참모총장·장관 등, title 필수) ∪ reign 전량.
    // 앵커는 dedup하지 않는다: 카드가 record별로 렌더되므로 각 카드가 자기 승계 박스를
    // 가져야 함(복위·다국가). TITLED는 title이 없으면 매칭 상대를 특정할 수 없어 제외한다
    // (axisOfAnchor의 null-title 폴백은 이 게이트 덕에 실질 도달 불가 — 방어용).
    const [anchorTenures, anchorReigns] = await Promise.all([
      this.prisma.governmentPositionTenure.findMany({
        where: {
          personId,
          OR: [
            { positionType: { in: [...HEAD_POSITION_TYPES] } },
            {
              positionType: { in: [...TITLED_POSITION_TYPES] },
              title: { not: null },
            },
          ],
        },
        select: ANCHOR_TENURE_SELECT,
      }),
      this.prisma.sovereignReign.findMany({
        where: { personId },
        select: ANCHOR_REIGN_SELECT,
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

      // 축(국가원수/정부수반)은 앵커가 정한다 — 총리 카드에 군주가, 군주 카드에 총리가
      // 선/후대로 섞여 들어오는 것을 막는다(둘은 병렬 재직이지 승계 관계가 아님).
      const axis = axisOfAnchor(anchor.kind, anchor.row as AxisSource)

      const [predRows, succRows] = await Promise.all([
        this.fetchNeighbors(scopeWhere, anchorStartDate, 'PREDECESSOR', axis),
        this.fetchNeighbors(scopeWhere, anchorStartDate, 'SUCCESSOR', axis),
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
   * 스코프 **및 앵커의 승계 축** 안에서 방향(직전/직후) 이웃 후보를 over-fetch.
   * 경계는 앵커의 **실제 저장 startDate**와 비교(합성 연도-경계가 아니라) — MySQL
   * <AD1000 DATETIME 불안정 구간에서도 저장값끼리의 비교라 안전. 진실은 JS 후처리.
   *
   * 축 게이트: 재임은 자기 positionType(+ TITLED면 title까지), 재위는 직위 정의로
   * **앵커와 같은 축**만 남긴다. 축을 합치면 자기 축에 선대가 없는 앵커(입헌군주국
   * 초대 총리 등)의 빈자리를 다른 축의 재직자가 조용히 메워 가짜 승계가 된다
   * (비테 총리 ← 니콜라이 2세). 반대로 테이블로 축을 가르면 한 직위가 두 테이블에 쪼개진
   * 국가에서 사슬이 끊긴다(프랑스 제3공화국 총리) — 그래서 게이트는 정의 기준이다.
   * 왕→초대 대통령 크로스는 대통령이 HEAD_OF_STATE라 국가원수 축 안에서 그대로 성립한다.
   * TITLED 축은 SovereignReign을 아예 조회하지 않는다 — 군주 전용 테이블이라 참모총장·
   * 장관 자리를 가질 수 없다(reignAxisWhere를 TITLED로 부르면 타입 자체가 막는다).
   */
  private async fetchNeighbors(
    scopeWhere: object,
    anchorStartDate: Date,
    relation: AdjacencyRelation,
    axis: SuccessionAxis,
  ): Promise<NeighborCandidate[]> {
    const dateFilter =
      relation === 'PREDECESSOR'
        ? { startDate: { lt: anchorStartDate } }
        : { startDate: { gt: anchorStartDate } }
    const orderBy = {
      startDate: relation === 'PREDECESSOR' ? ('desc' as const) : ('asc' as const),
    }
    // 이웃 tenure는 **앵커와 같은 축**만 — 장관·의원은 물론 다른 축 수장도 배제.
    // TITLED는 positionType과 title이 둘 다 같아야 "같은 자리"다.
    const tenureAxisWhere =
      axis.kind === 'TITLED'
        ? { positionType: axis.positionType, title: axis.title }
        : { positionType: axis.kind }
    const [tenureRows, reignRows] = await Promise.all([
      this.prisma.governmentPositionTenure.findMany({
        where: { AND: [scopeWhere, tenureAxisWhere, dateFilter] },
        select: { ...NEIGHBOR_SELECT, positionType: true, title: true },
        orderBy,
        take: NEIGHBOR_OVERFETCH,
      }),
      axis.kind === 'TITLED'
        ? Promise.resolve([])
        : this.prisma.sovereignReign.findMany({
            // 재위도 정의로 거른다 — 총리 정의로 등록된 재위(푸앵카레)는 정부수반 축에,
            // 쇼군·군주 재위는 국가원수 축에 남는다
            where: { AND: [scopeWhere, reignAxisWhere(axis), dateFilter] },
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
