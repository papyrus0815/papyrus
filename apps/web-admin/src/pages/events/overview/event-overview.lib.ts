/**
 * 최상위 사건 조망 — 순수 집계. 화면(event-overview.page)은 이 결과를 그리기만 한다.
 *
 * 축은 전개 타임라인과 같은 천문 연도 실수(`toAxisSpan`) — BC↔AD를 건너도 한 축이고,
 * 연·월 정밀도는 '모름'의 폭으로 그린다(1월 1일 점으로 그리면 아는 것보다 정확한 척한다).
 */
import {
  type AxisSpan,
  formatSpanLabel,
  toAxisSpan,
} from '@/pages/events/detail/components/development-timeline.lib'
import { eventCountryRoleLabel } from '@/entities/event/model/country-participant'
import { effectiveRangePrecision } from '@/shared/lib/iso-date'
import type {
  EventOverviewCountry,
  EventOverviewNode,
  EventOverviewPerson,
} from '@/shared/api/event-overview'

// ─── 시간축 ────────────────────────────────────────────────────────────────

export interface GanttRow extends AxisSpan {
  node: EventOverviewNode
  /** 화면의 번호(1부터) — 매트릭스·점검표 열/행과 같은 번호 */
  number: number
  leftPct: number
  widthPct: number
  dateLabel: string
  /** 손자 이하일 때 바로 위 사건 제목 */
  parentTitle: string | null
  /**
   * 상위 사건 기간 밖에서 시작·끝나는가 — 실측 30건 중 12건에서 발생(1차대전 7월 위기 9건은
   * 개전일 전). 데이터 오류(상위 기간이 좁다)인지 전사(前史)인지 화면이 말하지 않았다.
   */
  outside: 'before' | 'after' | null
}

export interface GanttLayout {
  rows: GanttRow[]
  /** 날짜가 없어 축에 못 놓은 사건 — 숨기지 않고 따로 센다 */
  undated: EventOverviewNode[]
  /** 상위 사건 자신의 기간 띠 */
  parentBand: { leftPct: number; widthPct: number } | null
  ticks: Array<{ pct: number; label: string }>
  domain: [number, number]
}

const DAY = 1 / 365.25

/**
 * 축·라벨에 쓰는 날짜 — 정밀도 NULL 자리 표시(1월 1일·12월 31일)를 연 정밀도로 읽는다.
 * 안 그러면 연도만 아는 10세기 사건이 '974.1.1 ~ 974.12.31'로 표기됐다.
 */
function withEffectivePrecision(node: EventOverviewNode): EventOverviewNode {
  const precision = effectiveRangePrecision(
    node.startDate,
    node.endDate,
    node.startDatePrecision,
    node.endDatePrecision,
  )
  return {
    ...node,
    startDatePrecision: precision.startPrecision,
    endDatePrecision: precision.endPrecision,
  }
}
/**
 * 눈금 간격 — 주 단위(7·14일)까지. 7월 위기처럼 하위가 두세 달에 몰리면 월 눈금만으로는
 * 축에 눈금이 두 개뿐이었다.
 */
const WEEK = 7 * DAY
const TICK_STEPS = [WEEK, 2 * WEEK, 1 / 12, 0.25, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000]

/** 천문 연도 실수 → 눈금 라벨. 1년 미만은 월, 주 간격은 월.일 */
function tickLabel(value: number, step: number): string {
  const yearFloor = Math.floor(value + 1e-9)
  const signed = yearFloor <= 0 ? yearFloor - 1 : yearFloor
  const year = signed < 0 ? `기원전 ${-signed}` : String(signed)
  if (step >= 1) return year
  const fraction = value - yearFloor
  if (step < 1 / 12) {
    // 해 안의 날짜 — 윤년 오차(하루 안팎)는 눈금 라벨에서 무시한다
    const dayOfYear = Math.floor(fraction * 365.25)
    const date = new Date(Date.UTC(2001, 0, 1 + dayOfYear))
    return `${date.getUTCMonth() + 1}.${date.getUTCDate()}`
  }
  const month = Math.round(fraction * 12) + 1
  return month === 1 ? year : `${month}월`
}

/** 눈금 — 화면에 8개 안팎 */
export function axisTicks(low: number, high: number): Array<{ value: number; label: string }> {
  const range = high - low
  const step = TICK_STEPS.find((candidate) => range / candidate <= 8) ?? 1000
  const ticks: Array<{ value: number; label: string }> = []
  for (let value = Math.ceil(low / step) * step; value <= high + 1e-9; value += step) {
    ticks.push({ value, label: tickLabel(value, step) })
  }
  return ticks
}

/**
 * 간트 — 하위 사건 하나에 한 줄. 레인을 접지 않는다: 조망은 '전부 체크'가 목적이라 사건마다
 * 제목이 한 줄씩 보여야 한다.
 *
 * 줄 순서는 **트리 순**이다 — 직계 자식은 시작 시점 순, 각 자식 바로 아래에 그 하위(역시 시점 순).
 * 시점만으로 세우면 월 정밀도 손자('1914년 9월' = 9월 1일 시작)가 9월 5일에 시작한 부모보다
 * 위로 올라가 계보가 끊겨 읽힌다.
 */
/**
 * 축 범위:
 * - `children`(기본) 하위 사건이 펼쳐진 범위 — 1차세계대전 하위 18건은 전부 1914년 6~8월(7월 위기)
 *   이라, 상위 기간(1914~1918)에 맞추면 막대가 왼쪽 5% 안에 뭉쳐 읽히지 않았다.
 * - `parent` 상위 기간까지 포함 — 하위가 상위 기간의 어디쯤에 몰렸는지를 볼 때.
 */
export type GanttFit = 'children' | 'parent'

export function buildGantt(
  root: EventOverviewNode,
  descendants: EventOverviewNode[],
  fit: GanttFit = 'children',
): GanttLayout {
  const titleById = new Map([root, ...descendants].map((node) => [node.id, node.title]))
  const placed: Array<{ node: EventOverviewNode; span: AxisSpan }> = []
  const undated: EventOverviewNode[] = []
  for (const node of descendants) {
    const span = toAxisSpan(withEffectivePrecision(node))
    if (span) placed.push({ node, span })
    else undated.push(node)
  }
  const spanById = new Map(placed.map((entry) => [entry.node.id, entry.span]))
  const startOf = (item: EventOverviewNode) => spanById.get(item.id)?.from ?? Infinity
  const childrenOf = new Map<string, EventOverviewNode[]>()
  for (const item of descendants) {
    const key = item.parentEventId ?? root.id
    childrenOf.set(key, [...(childrenOf.get(key) ?? []), item])
  }
  const treeOrder: EventOverviewNode[] = []
  const visit = (parentId: string) => {
    const children = [...(childrenOf.get(parentId) ?? [])].sort(
      (left, right) => startOf(left) - startOf(right),
    )
    for (const child of children) {
      treeOrder.push(child)
      visit(child.id)
    }
  }
  visit(root.id)
  // 계보가 루트에 닿지 않는 고아(이론상 없음)도 잃지 않는다
  for (const item of descendants) if (!treeOrder.includes(item)) treeOrder.push(item)
  const orderIndex = new Map(treeOrder.map((item, index) => [item.id, index]))
  placed.sort(
    (left, right) => (orderIndex.get(left.node.id) ?? 0) - (orderIndex.get(right.node.id) ?? 0),
  )

  const rootSpan = toAxisSpan(withEffectivePrecision(root))
  // 하루 오차는 기간 안으로 본다 — 같은 날을 시각 반올림으로 밖이라 하지 않게
  const outsideOf = (span: AxisSpan): GanttRow['outside'] =>
    !rootSpan
      ? null
      : span.from < rootSpan.from - DAY
        ? 'before'
        : span.to > rootSpan.to + DAY
          ? 'after'
          : null
  const froms = placed.map((entry) => entry.span.from)
  const tos = placed.map((entry) => entry.span.to)
  if (rootSpan && (fit === 'parent' || placed.length === 0)) {
    froms.push(rootSpan.from)
    tos.push(rootSpan.to)
  }
  let low = froms.length > 0 ? Math.min(...froms) : 0
  let high = tos.length > 0 ? Math.max(...tos) : 1
  if (high - low < DAY * 7) high = low + DAY * 7
  const padding = (high - low) * 0.02
  low -= padding
  high += padding
  const toPct = (value: number) => ((value - low) / (high - low)) * 100

  const rows: GanttRow[] = placed.map(({ node, span }, index) => ({
    ...span,
    node,
    number: index + 1,
    leftPct: toPct(span.from),
    widthPct: Math.max(toPct(span.to) - toPct(span.from), 0),
    dateLabel: formatSpanLabel(withEffectivePrecision(node)),
    parentTitle:
      node.depth >= 2 && node.parentEventId ? (titleById.get(node.parentEventId) ?? null) : null,
    outside: outsideOf(span),
  }))
  // 날짜 없는 사건도 번호는 이어 매긴다 — 매트릭스·점검표가 같은 번호를 쓴다
  return {
    rows,
    undated,
    // 하위에 맞춘 축에서는 상위 띠가 축 밖으로 나간다 — 보이는 만큼만 자른다
    parentBand: rootSpan
      ? (() => {
          const left = Math.max(0, toPct(rootSpan.from))
          const right = Math.min(100, toPct(rootSpan.to))
          return right > left ? { leftPct: left, widthPct: right - left } : null
        })()
      : null,
    ticks: axisTicks(low, high).map((tick) => ({ pct: toPct(tick.value), label: tick.label })),
    domain: [low, high],
  }
}

export interface CoverageGap {
  from: number
  to: number
  /** '1914.8 ~ 1918.11' */
  label: string
  /** 상위 기간 대비 비율 0~1 */
  share: number
}

/** 천문 연도 실수 → '1914.8' (기원전은 '기원전 44.3') */
function monthLabel(value: number): string {
  const yearFloor = Math.floor(value + 1e-9)
  const signed = yearFloor <= 0 ? yearFloor - 1 : yearFloor
  const year = signed < 0 ? `기원전 ${-signed}` : String(signed)
  const month = Math.min(12, Math.floor((value - yearFloor) * 12 + 1e-6) + 1)
  return `${year}.${month}`
}

/**
 * 상위 기간 중 하위 사건이 **하나도 덮지 않는** 구간 — 점검 지면의 가장 큰 결론.
 * 1차대전은 하위 18건이 개전 첫 두 달에 몰려 1914.8 ~ 1918.11이 비어 있었다(상위 기간의 99%).
 * 축을 하위 범위에 맞추면 이 공백은 화면 밖이라, 줄로 짚어 준다.
 *
 * 문턱: 상위 기간의 20% 이상이면서 한 달 이상 — 짧은 숨 고르기까지 경고하지 않는다.
 */
export function coverageGaps(
  root: EventOverviewNode,
  descendants: EventOverviewNode[],
): CoverageGap[] {
  const rootSpan = toAxisSpan(withEffectivePrecision(root))
  if (!rootSpan || rootSpan.to - rootSpan.from <= 1 / 12) return []
  const length = rootSpan.to - rootSpan.from
  const spans = descendants
    .map((node) => toAxisSpan(withEffectivePrecision(node)))
    .filter((span): span is AxisSpan => span !== null)
    .map((span) => ({ from: Math.max(span.from, rootSpan.from), to: Math.min(span.to, rootSpan.to) }))
    .filter((span) => span.to > span.from)
    .sort((left, right) => left.from - right.from)

  const gaps: CoverageGap[] = []
  let cursor = rootSpan.from
  const pushGap = (from: number, to: number) => {
    if (to - from >= Math.max(length * 0.2, 1 / 12)) {
      gaps.push({ from, to, label: `${monthLabel(from)} ~ ${monthLabel(to)}`, share: (to - from) / length })
    }
  }
  for (const span of spans) {
    if (span.from > cursor) pushGap(cursor, span.from)
    cursor = Math.max(cursor, span.to)
  }
  if (rootSpan.to > cursor) pushGap(cursor, rootSpan.to)
  return gaps
}

/** 화면 전체가 쓰는 하위 사건 순서 — 간트 순(날짜 있는 것) 뒤에 날짜 없는 것 */
export function orderedDescendants(gantt: GanttLayout): EventOverviewNode[] {
  return [...gantt.rows.map((row) => row.node), ...gantt.undated]
}

// ─── 참여국 ────────────────────────────────────────────────────────────────

/**
 * 배역의 시각 분류 — 12종을 색 12개로 그리면 읽히지 않는다. 넷으로 접는다.
 * lead=주도, target=대상·피해·적대, statehood=건국·멸망, neutral=그 밖의 관여.
 */
export type RoleTone = 'lead' | 'target' | 'statehood' | 'neutral'

export function roleTone(role: string | null | undefined): RoleTone {
  if (role === 'INITIATOR') return 'lead'
  if (role === 'TARGET' || role === 'VICTIM' || role === 'ADVERSARY') return 'target'
  if (role === 'FOUNDED' || role === 'DISSOLVED') return 'statehood'
  return 'neutral'
}

export interface MatrixCountry {
  key: string
  name: string
  flagEmoji: string | null
  kind: EventOverviewCountry['kind']
  /** 하위 사건 몇 건에 나오나 */
  eventCount: number
  /** 상위 사건 자신에도 참여국으로 걸려 있나 */
  inRoot: boolean
  /** 상위 사건 자신에서의 배역 */
  rootRole: string | null
  /** 하위 사건 id → 배역 */
  roleByEvent: Map<string, string | null>
}

/** 국가 × 하위 사건 — 많이 나오는 나라부터 */
export function buildCountryMatrix(
  root: EventOverviewNode,
  descendants: EventOverviewNode[],
): MatrixCountry[] {
  const byKey = new Map<string, MatrixCountry>()
  const ensure = (country: EventOverviewCountry) => {
    let entry = byKey.get(country.key)
    if (!entry) {
      entry = {
        key: country.key,
        name: country.name,
        flagEmoji: country.flagEmoji ?? null,
        kind: country.kind,
        eventCount: 0,
        inRoot: false,
        rootRole: null,
        roleByEvent: new Map(),
      }
      byKey.set(country.key, entry)
    }
    return entry
  }
  for (const country of root.countries) {
    const entry = ensure(country)
    entry.inRoot = true
    entry.rootRole = country.role ?? null
  }
  for (const node of descendants) {
    for (const country of node.countries) {
      const entry = ensure(country)
      if (!entry.roleByEvent.has(node.id)) entry.eventCount += 1
      entry.roleByEvent.set(node.id, country.role ?? null)
    }
  }
  return [...byKey.values()].sort(
    (left, right) =>
      right.eventCount - left.eventCount ||
      Number(right.inRoot) - Number(left.inRoot) ||
      left.name.localeCompare(right.name),
  )
}

export const roleLabel = (role: string | null | undefined) =>
  eventCountryRoleLabel(role) ?? '관여'

// ─── 분포 ──────────────────────────────────────────────────────────────────

export interface CountBar {
  label: string
  count: number
}

export function categoryBreakdown(descendants: EventOverviewNode[]): CountBar[] {
  const counts = new Map<string, number>()
  for (const node of descendants) {
    const name = node.category?.name ?? '미분류'
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return [...counts]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
}

/**
 * 시기별 밀도 — 하위 사건이 **시작한** 시점을 칸에 센다. 칸 단위는 펼쳐진 기간에 맞춘다
 * (2년 이하 월, 40년 이하 연, 400년 이하 10년, 그 위 100년).
 */
export function timeHistogram(gantt: GanttLayout): CountBar[] {
  if (gantt.rows.length === 0) return []
  const from = Math.min(...gantt.rows.map((row) => row.from))
  const to = Math.max(...gantt.rows.map((row) => row.from))
  const span = to - from
  const unit = span <= 2 ? 1 / 12 : span <= 40 ? 1 : span <= 400 ? 10 : 100
  const start = Math.floor(from / unit + 1e-9) * unit
  const binCount = Math.max(1, Math.floor((to - start) / unit + 1e-9) + 1)
  const bins = Array.from({ length: binCount }, (_, index) => ({
    label: binLabel(start + index * unit, unit),
    count: 0,
  }))
  for (const row of gantt.rows) {
    const index = Math.min(binCount - 1, Math.floor((row.from - start) / unit + 1e-9))
    bins[index].count += 1
  }
  return bins
}

function binLabel(value: number, unit: number): string {
  const yearFloor = Math.floor(value + 1e-9)
  const signed = yearFloor <= 0 ? yearFloor - 1 : yearFloor
  const year = signed < 0 ? `기원전 ${-signed}` : String(signed)
  if (unit < 1) return `${year}.${Math.round((value - yearFloor) * 12) + 1}`
  if (unit === 1) return year
  return `${year}~`
}

// ─── 인물·진영·수치 ────────────────────────────────────────────────────────

export interface PersonAggregate {
  person: EventOverviewPerson
  events: Array<{ id: string; title: string; role: string | null }>
}

/** 하위(와 상위) 사건에 걸친 인물 — 많이 나오는 사람부터 */
export function aggregatePersons(nodes: EventOverviewNode[]): PersonAggregate[] {
  const byId = new Map<string, PersonAggregate>()
  for (const node of nodes) {
    for (const person of node.persons) {
      const entry = byId.get(person.personId) ?? { person, events: [] }
      if (!entry.events.some((event) => event.id === node.id)) {
        entry.events.push({ id: node.id, title: node.title, role: person.role ?? null })
      }
      byId.set(person.personId, entry)
    }
  }
  return [...byId.values()].sort((left, right) => right.events.length - left.events.length)
}

export interface MetricRow {
  eventId: string
  eventTitle: string
  metricName: string
  unit: string | null
  /** 값 또는 범위 문자열 */
  display: string
}

const numberFormat = new Intl.NumberFormat('ko-KR')

export function metricRows(nodes: EventOverviewNode[]): MetricRow[] {
  const rows: MetricRow[] = []
  for (const node of nodes) {
    for (const metric of node.metrics) {
      const range =
        metric.low != null && metric.high != null
          ? `${numberFormat.format(metric.low)}~${numberFormat.format(metric.high)}`
          : null
      const value = metric.value != null ? numberFormat.format(metric.value) : null
      rows.push({
        eventId: node.id,
        eventTitle: node.title,
        metricName: metric.metricName,
        unit: metric.unit ?? null,
        display: `${metric.approx ? '약 ' : ''}${value ?? range ?? '—'}`,
      })
    }
  }
  return rows
}

// ─── 기록 점검 ─────────────────────────────────────────────────────────────

export type CheckKey =
  | 'date'
  | 'description'
  | 'countries'
  | 'persons'
  | 'sections'
  | 'background'
  | 'aftermath'
  | 'images'
  | 'metrics'

export const CHECK_COLUMNS: ReadonlyArray<{ key: CheckKey; label: string; hint: string }> = [
  { key: 'date', label: '날짜', hint: '시작일 — 일 단위까지 알면 채움, 연·월만이면 부분' },
  { key: 'description', label: '개요', hint: '한 줄 설명' },
  { key: 'countries', label: '참여국', hint: '참여국 1개 이상' },
  { key: 'persons', label: '인물', hint: '참여 인물 1명 이상' },
  { key: 'sections', label: '본문', hint: '배경·전개·여파 번호 단락 1개 이상' },
  { key: 'background', label: '배경', hint: '배경 요약' },
  { key: 'aftermath', label: '여파', hint: '여파 요약' },
  { key: 'images', label: '이미지', hint: '이미지 1장 이상' },
  { key: 'metrics', label: '수치', hint: '사상자·병력 등 측정값 1개 이상' },
]

/** full=채움, partial=일부(연·월 정밀도 날짜), empty=비어 있음, na=이 갈래엔 해당 없음 */
export type CheckState = 'full' | 'partial' | 'empty' | 'na'

export function checkNode(node: EventOverviewNode): Record<CheckKey, CheckState> {
  const has = (value: boolean): CheckState => (value ? 'full' : 'empty')
  const { startPrecision } = effectiveRangePrecision(
    node.startDate,
    node.endDate,
    node.startDatePrecision,
    node.endDatePrecision,
  )
  const dateState: CheckState = !node.startDate
    ? 'empty'
    : startPrecision === 'year' || startPrecision === 'month'
      ? 'partial'
      : 'full'
  return {
    date: dateState,
    description: has(Boolean(node.description?.trim())),
    countries: has(node.countries.length > 0),
    persons: has(node.persons.length > 0),
    sections: has(node.sectionCount > 0),
    background: has(node.hasBackground),
    aftermath: has(node.hasAftermath),
    images: has(node.imageCount > 0),
    metrics: has(node.metrics.length > 0),
  }
}

/** 한 사건의 점수 — 해당 없음은 분모에서 뺀다. 부분은 반 칸 */
export function checkScore(checks: Record<CheckKey, CheckState>): {
  filled: number
  applicable: number
  pct: number
} {
  let filled = 0
  let applicable = 0
  for (const column of CHECK_COLUMNS) {
    const state = checks[column.key]
    if (state === 'na') continue
    applicable += 1
    filled += state === 'full' ? 1 : state === 'partial' ? 0.5 : 0
  }
  return { filled, applicable, pct: applicable === 0 ? 100 : Math.round((filled / applicable) * 100) }
}

/** 칸 단위 충실도(0~1) — 부분은 반으로, 해당 없음은 분모에서 뺀다 */
export function coverageRatio(nodes: EventOverviewNode[]): number {
  let filled = 0
  let applicable = 0
  for (const node of nodes) {
    const score = checkScore(checkNode(node))
    filled += score.filled
    applicable += score.applicable
  }
  return applicable === 0 ? 0 : filled / applicable
}

/** 열별로 그 칸이 해당하는 사건 수 — 빈 칸 비율의 분모 */
export function applicableCountByColumn(nodes: EventOverviewNode[]): Record<CheckKey, number> {
  const counts = Object.fromEntries(CHECK_COLUMNS.map((column) => [column.key, 0])) as Record<
    CheckKey,
    number
  >
  for (const node of nodes) {
    const checks = checkNode(node)
    for (const column of CHECK_COLUMNS) if (checks[column.key] !== 'na') counts[column.key] += 1
  }
  return counts
}

/** 열별로 비어 있는 하위 사건 수 — 점검표 머리글의 '빈 칸 N' */
export function emptyCountByColumn(nodes: EventOverviewNode[]): Record<CheckKey, number> {
  const counts = Object.fromEntries(CHECK_COLUMNS.map((column) => [column.key, 0])) as Record<
    CheckKey,
    number
  >
  for (const node of nodes) {
    const checks = checkNode(node)
    for (const column of CHECK_COLUMNS) if (checks[column.key] === 'empty') counts[column.key] += 1
  }
  return counts
}
