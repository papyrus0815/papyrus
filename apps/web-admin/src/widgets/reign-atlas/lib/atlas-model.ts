/**
 * 수장 지도 아틀라스의 순수 계산 — "그해 누가 어디를 다스렸고, 누가 누구와 싸우고 손잡았나".
 *
 * 입력은 서버 응답의 여기서 쓰는 필드만 추린 구조 타입이다(위젯 밖 타입에 묶이지 않게).
 *
 * 연도는 전부 **부호 있는 정수 연도**(BC 음수)다. 재위·역사국가는 구조화 축(era+year)을 먼저
 * 보고, 없을 때만 ISO 문자열의 연도를 읽는다 — 네이티브 Date는 BC·서기 100년 미만에서
 * 부호를 잃거나 20xx로 둔갑하므로 쓰지 않는다.
 *
 * 관계선(전쟁·동맹)은 새 데이터 없이 기존 기록에서 **파생**한다:
 * 1. 사건 진영(sideId) — 진영이 2개 이상이면 진영 간 = 교전, 같은 진영 = 동맹. 가장 정확하다.
 * 2. 사건 역할 — 진영이 없고 유형이 무력 충돌(전쟁·전투·봉기)일 때만. 주도국·동맹국 ↔ 대상국·적대국·피해국.
 *    (분류 게이트가 없으면 조약 체결 사건의 '주도국↔대상국'이 전선으로 그려진다.)
 * 3. 동맹 조약 — 서명~만료(파기) 사이 서명국끼리 동맹.
 */
import { isArmedConflictType } from '@/entities/event/model/event-type-registry'
import { parseIsoDateParts } from '@/shared/lib/iso-date'

import { type TitleRank, titleRankOf } from './title-rank'

type EraValue = string | null | undefined

// ── 입력 구조 타입 ─────────────────────────────────────────────

export interface AtlasCountryInput {
  id: string
  name: string
  enName?: string | null
  latitude?: number | null
  longitude?: number | null
  startEra?: EraValue
  startYear?: number | null
  endEra?: EraValue
  endYear?: number | null
  /** 국가 유형(EMPIRE·KINGDOM…) — 칭호 등급의 근거 */
  stateType?: string | null
  parentModernCountryIds?: string[] | null
}

export interface AtlasRulerInput {
  id: string
  personId: string
  countryId?: string | null
  historicalCountryId?: string | null
  regnalName?: string | null
  /** 재임(대통령·총리)의 직함 */
  title?: string | null
  positionType?: string | null
  positionDefinition?: {
    title?: string | null
    positionType?: string | null
  } | null
  notes?: string | null
  startDate?: string | null
  startEra?: EraValue
  startYear?: number | null
  endDate?: string | null
  endEra?: EraValue
  endYear?: number | null
  person?: {
    name?: string | null
    surname?: string | null
    profileImageUrl?: string | null
  } | null
}

interface StructuredPointLike {
  era?: EraValue
  year?: number | null
}

export interface AtlasEventParticipantInput {
  id: string
  name?: string | null
  role?: string | null
  sideId?: string | null
  join?: StructuredPointLike | null
  withdraw?: StructuredPointLike | null
}

export interface AtlasEventInput {
  id: string
  title: string
  description?: string | null
  /** 주 상위 사건 — 있으면 하위 사건(시대 헤드라인 후보에서 제외) */
  parentEventId?: string | null
  startDate?: string | null
  endDate?: string | null
  category?: { name?: string | null } | null
  /** 세부 분야 — 무력 충돌(전쟁·전투·봉기) 판정의 정본(event-type-registry). 분야(category)로 판정하지 않는다 */
  type?: string | null
  relatedCountries?: AtlasEventParticipantInput[] | null
  relatedHistoricalCountries?: AtlasEventParticipantInput[] | null
}

export interface AtlasTreatyInput {
  id: string
  name: string
  type: string
  signDate: string
  expiryDate?: string | null
  violationDate?: string | null
  signatories: Array<{
    countryId?: string | null
    historicalCountryId?: string | null
  }>
}

// ── 출력 ─────────────────────────────────────────────────────

export interface AtlasCountry {
  id: string
  name: string
  enName: string | null
  lat: number
  lng: number
  startYear: number | null
  endYear: number | null
  /** 칭호 등급 (국가 유형 파생) */
  rank: TitleRank
  parentModernCountryIds: string[]
}

export type RulerKind = 'MONARCH' | 'HEAD_OF_STATE' | 'HEAD_OF_GOVERNMENT'

export interface AtlasRuler {
  id: string
  personId: string
  kind: RulerKind
  name: string
  title: string | null
  startYear: number
  /** null = 재임 중(끝 미정) */
  endYear: number | null
  notes: string | null
  imageUrl: string | null
}

export interface AtlasNode {
  country: AtlasCountry
  /** 그해 재임 중인 수장 — 군주 → 국가원수 → 정부수반 순 */
  rulers: AtlasRuler[]
}

export type EdgeKind = 'war' | 'ally'
export type EdgeSource = 'side' | 'role' | 'treaty'

export interface AtlasEdge {
  key: string
  kind: EdgeKind
  /** 정렬된 쌍 (aId < bId) — 같은 쌍이 여러 사건에서 나와도 한 선 */
  aId: string
  bId: string
  label: string
  source: EdgeSource
  /** 근거 사건 / 조약 */
  eventId: string | null
  treatyId: string | null
  /** 같은 쌍·같은 종류의 추가 근거 수 */
  extraCount: number
}

// ── 연도 ─────────────────────────────────────────────────────

export function signedYear(
  era: EraValue,
  year: number | null | undefined,
): number | null {
  if (year == null) return null
  return era === 'BC' ? -Math.abs(year) : year
}

function yearFromIso(value: string | null | undefined): number | null {
  return parseIsoDateParts(value)?.year ?? null
}

/** 구조화 축 우선, 없으면 ISO 연도 */
function pickYear(
  era: EraValue,
  year: number | null | undefined,
  iso: string | null | undefined,
): number | null {
  return signedYear(era, year) ?? yearFromIso(iso)
}

export function isActiveAt(
  span: { startYear: number | null; endYear: number | null },
  year: number,
): boolean {
  if (span.startYear == null) return false
  return (
    span.startYear <= year && (span.endYear == null || year <= span.endYear)
  )
}

// ── 정규화 ───────────────────────────────────────────────────

export function normalizeCountries(
  inputs: AtlasCountryInput[],
): AtlasCountry[] {
  const countries: AtlasCountry[] = []
  for (const input of inputs) {
    const lat = input.latitude == null ? NaN : Number(input.latitude)
    const lng = input.longitude == null ? NaN : Number(input.longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    countries.push({
      id: input.id,
      name: input.name,
      enName: input.enName ?? null,
      lat,
      lng,
      startYear: signedYear(input.startEra, input.startYear),
      endYear: signedYear(input.endEra, input.endYear),
      rank: titleRankOf(input.stateType),
      parentModernCountryIds: input.parentModernCountryIds ?? [],
    })
  }
  return countries
}

function rulerKind(input: AtlasRulerInput, isReign: boolean): RulerKind {
  if (isReign) return 'MONARCH'
  const positionType =
    input.positionType ?? input.positionDefinition?.positionType
  return positionType === 'HEAD_OF_GOVERNMENT'
    ? 'HEAD_OF_GOVERNMENT'
    : 'HEAD_OF_STATE'
}

function personLabel(input: AtlasRulerInput): string {
  const person = input.person
  if (!person?.name) return '미상'
  return person.surname ? `${person.name} ${person.surname}` : person.name
}

export interface RulerWithPlace {
  ruler: AtlasRuler
  countryId: string | null
  historicalCountryId: string | null
}

export function normalizeRulers(
  inputs: AtlasRulerInput[],
  isReign: boolean,
): RulerWithPlace[] {
  const rulers: RulerWithPlace[] = []
  for (const input of inputs) {
    const startYear = pickYear(input.startEra, input.startYear, input.startDate)
    if (startYear == null) continue
    const hasEnd = input.endYear != null || !!input.endDate
    const endYear = hasEnd
      ? pickYear(input.endEra, input.endYear, input.endDate)
      : null
    rulers.push({
      ruler: {
        id: input.id,
        personId: input.personId,
        kind: rulerKind(input, isReign),
        // 재위는 왕명(루이 14세)이 정체성 — 인물 본명은 보조
        name: (isReign && input.regnalName) || personLabel(input),
        title: isReign
          ? null
          : (input.title ?? input.positionDefinition?.title ?? null),
        startYear,
        endYear,
        notes: input.notes ?? null,
        imageUrl: input.person?.profileImageUrl ?? null,
      },
      countryId: input.countryId ?? null,
      historicalCountryId: input.historicalCountryId ?? null,
    })
  }
  return rulers
}

// ── 현대국가 → 그해의 역사국가 ─────────────────────────────────

/**
 * 현대국가(Country)에는 좌표가 없다(0/72). 현대국가 FK로만 걸린 기록은 그해 존속하던
 * '이 현대국가에 연결된 역사국가'의 핀에 얹는다. 후보가 여럿이면 `preferIds`(그해 수장이
 * 있는 나라) → 존속 시작이 늦은(더 구체적인) 쪽 순.
 */
export function resolveModernToHistorical(
  modernCountryId: string,
  year: number,
  countries: AtlasCountry[],
  preferIds?: ReadonlySet<string>,
): string | null {
  const candidates = countries.filter(
    (country) =>
      country.parentModernCountryIds.includes(modernCountryId) &&
      isActiveAt(country, year),
  )
  if (candidates.length === 0) return null
  candidates.sort((left, right) => {
    const preferredLeft = preferIds?.has(left.id) ? 1 : 0
    const preferredRight = preferIds?.has(right.id) ? 1 : 0
    if (preferredLeft !== preferredRight) return preferredRight - preferredLeft
    return (right.startYear ?? -Infinity) - (left.startYear ?? -Infinity)
  })
  return candidates[0]!.id
}

const KIND_ORDER: Record<RulerKind, number> = {
  MONARCH: 0,
  HEAD_OF_STATE: 1,
  HEAD_OF_GOVERNMENT: 2,
}

/**
 * 그해 핀 — 존속 중 + 좌표 있는 역사국가 중 수장 기록이 있거나 관계선에 걸린 나라.
 * (수장도 관계도 없는 나라까지 찍으면 1756년에만 수십 개의 빈 핀이 깔린다.)
 */
export function buildNodes(
  countries: AtlasCountry[],
  rulers: RulerWithPlace[],
  year: number,
  extraCountryIds: ReadonlySet<string> = new Set(),
): AtlasNode[] {
  const alive = countries.filter((country) => isActiveAt(country, year))
  const aliveById = new Map(alive.map((country) => [country.id, country]))
  const rulersByCountry = new Map<string, AtlasRuler[]>()

  const directHolders = new Set<string>()
  for (const entry of rulers) {
    if (entry.historicalCountryId && aliveById.has(entry.historicalCountryId)) {
      if (isActiveAt(entry.ruler, year))
        directHolders.add(entry.historicalCountryId)
    }
  }

  for (const entry of rulers) {
    if (!isActiveAt(entry.ruler, year)) continue
    let placeId: string | null = null
    if (entry.historicalCountryId) {
      placeId = aliveById.has(entry.historicalCountryId)
        ? entry.historicalCountryId
        : null
    } else if (entry.countryId) {
      placeId = resolveModernToHistorical(
        entry.countryId,
        year,
        alive,
        directHolders,
      )
    }
    if (!placeId) continue
    const list = rulersByCountry.get(placeId) ?? []
    // 같은 인물이 재위·재임 양쪽에 있으면 한 번만 (재위 우선 — 먼저 들어온 쪽)
    if (!list.some((existing) => existing.personId === entry.ruler.personId)) {
      list.push(entry.ruler)
    }
    rulersByCountry.set(placeId, list)
  }

  const nodes: AtlasNode[] = []
  for (const country of alive) {
    const countryRulers = rulersByCountry.get(country.id) ?? []
    if (countryRulers.length === 0 && !extraCountryIds.has(country.id)) continue
    countryRulers.sort(
      (left, right) =>
        KIND_ORDER[left.kind] - KIND_ORDER[right.kind] ||
        left.startYear - right.startYear,
    )
    nodes.push({ country, rulers: countryRulers })
  }
  return nodes
}

// ── 관계선 ───────────────────────────────────────────────────

/**
 * 무력 충돌 판정 — 사건 **세부 분야**(전쟁·전투·봉기)로. 예전엔 분류 이름 정규식(/전쟁|군사|전투/)이라
 * '군사' 분야의 함대법·참모총장 취임·기동훈련까지 걸렸고, 점검은 그 소음을 제목 정규식으로 다시 걸렀다.
 */
const isWarEvent = (event: AtlasEventInput): boolean => isArmedConflictType(event.type)
const ATTACKER_ROLES = new Set(['INITIATOR', 'ALLY'])
const DEFENDER_ROLES = new Set(['TARGET', 'ADVERSARY', 'VICTIM'])

function eventSpan(event: AtlasEventInput): {
  startYear: number | null
  endYear: number | null
} {
  const startYear = yearFromIso(event.startDate)
  const endYear = yearFromIso(event.endDate) ?? startYear
  return { startYear, endYear }
}

function participatesAt(
  participant: AtlasEventParticipantInput,
  year: number,
): boolean {
  const joinYear = participant.join
    ? signedYear(participant.join.era, participant.join.year)
    : null
  const withdrawYear = participant.withdraw
    ? signedYear(participant.withdraw.era, participant.withdraw.year)
    : null
  if (joinYear != null && year < joinYear) return false
  if (withdrawYear != null && year > withdrawYear) return false
  return true
}

interface ResolvedParticipant {
  placeId: string
  role: string | null
  sideId: string | null
}

class EdgeCollector {
  private readonly edges = new Map<string, AtlasEdge>()

  add(
    kind: EdgeKind,
    firstId: string,
    secondId: string,
    label: string,
    source: EdgeSource,
    ref: { eventId?: string; treatyId?: string },
  ) {
    if (firstId === secondId) return
    const [aId, bId] =
      firstId < secondId ? [firstId, secondId] : [secondId, firstId]
    const key = `${kind}:${aId}:${bId}`
    const existing = this.edges.get(key)
    if (existing) {
      existing.extraCount += 1
      return
    }
    this.edges.set(key, {
      key,
      kind,
      aId,
      bId,
      label,
      source,
      eventId: ref.eventId ?? null,
      treatyId: ref.treatyId ?? null,
      extraCount: 0,
    })
  }

  result(): AtlasEdge[] {
    const all = Array.from(this.edges.values())
    // 같은 쌍이 교전이면서 동맹이면(진영 갈이·전쟁 중 조약 만료) 교전만 남긴다
    const warPairs = new Set(
      all
        .filter((edge) => edge.kind === 'war')
        .map((edge) => `${edge.aId}:${edge.bId}`),
    )
    return all.filter(
      (edge) => edge.kind === 'war' || !warPairs.has(`${edge.aId}:${edge.bId}`),
    )
  }
}

function pairsAcross<T>(
  left: T[],
  right: T[],
  visit: (first: T, second: T) => void,
) {
  for (const first of left) for (const second of right) visit(first, second)
}

function pairsWithin<T>(items: T[], visit: (first: T, second: T) => void) {
  for (let i = 0; i < items.length; i += 1)
    for (let j = i + 1; j < items.length; j += 1) visit(items[i]!, items[j]!)
}

/**
 * @param preferIds 현대국가 FK를 역사국가로 옮길 때 먼저 고를 나라 — 그해 수장이 있는 나라.
 *   (현대 영국은 '대영제국'·'그레이트브리튼 및 아일랜드 연합왕국' 둘에 연결돼 있어, 안 주면
 *   동맹선이 수장 없는 빈 핀에 꽂힌다.)
 */
export function buildEdges(
  events: AtlasEventInput[],
  treaties: AtlasTreatyInput[],
  countries: AtlasCountry[],
  year: number,
  preferIds?: ReadonlySet<string>,
): AtlasEdge[] {
  const alive = countries.filter((country) => isActiveAt(country, year))
  const aliveIds = new Set(alive.map((country) => country.id))
  const collector = new EdgeCollector()

  const resolvePlace = (
    historicalId: string | null | undefined,
    modernId: string | null | undefined,
  ): string | null => {
    if (historicalId) return aliveIds.has(historicalId) ? historicalId : null
    if (modernId)
      return resolveModernToHistorical(modernId, year, alive, preferIds)
    return null
  }

  for (const event of events) {
    if (!isActiveAt(eventSpan(event), year)) continue
    const participants: ResolvedParticipant[] = []
    const seen = new Set<string>()
    const push = (
      participant: AtlasEventParticipantInput,
      isHistorical: boolean,
    ) => {
      if (!participatesAt(participant, year)) return
      const placeId = isHistorical
        ? resolvePlace(participant.id, null)
        : resolvePlace(null, participant.id)
      if (!placeId || seen.has(placeId)) return
      seen.add(placeId)
      participants.push({
        placeId,
        role: participant.role ?? null,
        sideId: participant.sideId ?? null,
      })
    }
    for (const participant of event.relatedHistoricalCountries ?? [])
      push(participant, true)
    for (const participant of event.relatedCountries ?? [])
      push(participant, false)
    if (participants.length < 2) continue

    const ref = { eventId: event.id }
    const sideIds = new Set(
      participants
        .map((participant) => participant.sideId)
        .filter((id): id is string => !!id),
    )
    if (sideIds.size >= 2) {
      const bySide = new Map<string, ResolvedParticipant[]>()
      for (const participant of participants) {
        if (!participant.sideId) continue
        const group = bySide.get(participant.sideId) ?? []
        group.push(participant)
        bySide.set(participant.sideId, group)
      }
      const groups = Array.from(bySide.values())
      pairsWithin(groups, (first, second) =>
        pairsAcross(first, second, (left, right) =>
          collector.add(
            'war',
            left.placeId,
            right.placeId,
            event.title,
            'side',
            ref,
          ),
        ),
      )
      for (const group of groups)
        pairsWithin(group, (left, right) =>
          collector.add(
            'ally',
            left.placeId,
            right.placeId,
            event.title,
            'side',
            ref,
          ),
        )
      continue
    }

    if (!isWarEvent(event)) continue
    const attackers = participants.filter(
      (participant) => participant.role && ATTACKER_ROLES.has(participant.role),
    )
    const defenders = participants.filter(
      (participant) => participant.role && DEFENDER_ROLES.has(participant.role),
    )
    if (attackers.length === 0 || defenders.length === 0) continue
    pairsAcross(attackers, defenders, (attacker, defender) =>
      collector.add(
        'war',
        attacker.placeId,
        defender.placeId,
        event.title,
        'role',
        ref,
      ),
    )
    pairsWithin(attackers, (left, right) =>
      collector.add(
        'ally',
        left.placeId,
        right.placeId,
        event.title,
        'role',
        ref,
      ),
    )
  }

  for (const treaty of treaties) {
    if (treaty.type !== 'ALLIANCE') continue
    const startYear = yearFromIso(treaty.signDate)
    const endYear =
      yearFromIso(treaty.violationDate) ?? yearFromIso(treaty.expiryDate)
    if (!isActiveAt({ startYear, endYear }, year)) continue
    const placeIds = Array.from(
      new Set(
        treaty.signatories
          .map((signatory) =>
            resolvePlace(signatory.historicalCountryId, signatory.countryId),
          )
          .filter((id): id is string => !!id),
      ),
    )
    pairsWithin(placeIds, (left, right) =>
      collector.add('ally', left, right, treaty.name, 'treaty', {
        treatyId: treaty.id,
      }),
    )
  }

  return collector.result()
}

/**
 * 지도에 전선을 그릴 수 있는 사건인가 — 스크러버 분수령 칩의 후보.
 * buildEdges와 같은 기준(진영 2개 이상, 또는 무력 충돌 세부 + 공격측·방어측 역할 모두)이라
 * 칩을 눌렀는데 지도에 선이 하나도 없는 일이 없다. (참여국 수만 보면 진영·역할이 비어
 * 선을 못 긋는 최근 사건들이 칩을 채웠다.)
 */
export function isFrontLineEvent(event: AtlasEventInput): boolean {
  const participants = [
    ...(event.relatedHistoricalCountries ?? []),
    ...(event.relatedCountries ?? []),
  ]
  if (participants.length < 2) return false
  const sideIds = new Set(
    participants.map((participant) => participant.sideId).filter(Boolean),
  )
  if (sideIds.size >= 2) return true
  if (!isWarEvent(event)) return false
  const hasAttacker = participants.some(
    (participant) => participant.role && ATTACKER_ROLES.has(participant.role),
  )
  const hasDefender = participants.some(
    (participant) => participant.role && DEFENDER_ROLES.has(participant.role),
  )
  return hasAttacker && hasDefender
}

// ── 시대 헤드라인 ────────────────────────────────────────────

export interface EraHeadlineItem {
  event: AtlasEventInput
  startYear: number
  endYear: number
}

export interface EraHeadline {
  /** 그해를 대표하는 사건 — 없으면 null */
  primary: EraHeadlineItem | null
  /** 같은 해에 걸친 다른 큰 사건 (최대 3) */
  others: EraHeadlineItem[]
}

/**
 * 그해를 덮는 최상위 사건 중 '시대의 제목'이 될 만한 것을 고른다.
 *
 * 점수: 지도에 전선을 긋는 사건 > 전쟁 분류 > 여러 해에 걸침(길수록) > 참여국 수 > 그해 시작.
 * 하위 사건은 뺀다 — '7년 전쟁' 아래 '로스바흐 전투'가 시대 제목이 되면 안 된다.
 */
export function pickEraHeadline(
  events: AtlasEventInput[],
  year: number,
): EraHeadline {
  const scored: Array<EraHeadlineItem & { score: number }> = []
  for (const event of events) {
    if (event.parentEventId) continue
    const span = eventSpan(event)
    if (span.startYear == null || !isActiveAt(span, year)) continue
    const endYear = span.endYear ?? span.startYear
    const participantCount =
      (event.relatedHistoricalCountries?.length ?? 0) +
      (event.relatedCountries?.length ?? 0)
    const years = endYear - span.startYear
    let score = 0
    if (isFrontLineEvent(event)) score += 40
    if (isWarEvent(event)) score += 20
    if (years > 0) score += 10 + Math.min(years, 30) / 3
    score += Math.min(participantCount, 10)
    if (span.startYear === year) score += 5
    scored.push({ event, startYear: span.startYear, endYear, score })
  }
  scored.sort(
    (left, right) =>
      right.score - left.score ||
      left.event.title.localeCompare(right.event.title, 'ko'),
  )
  const strip = ({
    event,
    startYear,
    endYear,
  }: EraHeadlineItem): EraHeadlineItem => ({
    event,
    startYear,
    endYear,
  })
  return {
    primary: scored[0] ? strip(scored[0]) : null,
    others: scored.slice(1, 4).map(strip),
  }
}

/** 기본 진입 연도 — 동시에 재임 중인 수장이 가장 많은 해 (데이터가 두꺼운 곳부터 보여준다) */
export function busiestYear(
  rulers: RulerWithPlace[],
  min: number,
  max: number,
): number | null {
  if (rulers.length === 0 || max < min) return null
  const span = max - min + 1
  const diff = new Array<number>(span + 1).fill(0)
  for (const { ruler } of rulers) {
    const from = Math.max(min, ruler.startYear)
    const to = Math.min(max, ruler.endYear ?? max)
    if (to < from) continue
    diff[from - min]! += 1
    diff[to - min + 1]! -= 1
  }
  let best = min
  let bestCount = -1
  let running = 0
  for (let offset = 0; offset < span; offset += 1) {
    running += diff[offset]!
    if (running > bestCount) {
      bestCount = running
      best = min + offset
    }
  }
  return best
}
