/**
 * 사건 타임라인 v4 — 순수 모델 (시대 드릴다운)
 * FSD: widgets/event-timeline/model
 *
 * 설계: docs/event-timeline-redesign.md
 *
 * 핵심 규약
 *  - 시간 창은 이산 3단: 전체(세기) → 세기(10년 구간) → 10년(연도). 연속 줌 없음.
 *  - 세기 경계는 필터 축과 같은 단일 출처(`getCentury`/`centuryYearRange`,
 *    16세기 = 1501~1600)를 쓴다. 한 세기는 10년 구간 10개로 **정확히** 나뉜다.
 *  - 카운트·리스트 소속은 **시작 시점 기준**(사건은 어느 단계에서든 정확히 한 버킷) —
 *    내비게이터 숫자와 리스트 행 수가 구조적으로 일치한다. 기간 밴드만 겹침 기준.
 *  - BC는 부호 연도. 네이티브 Date 파싱 금지(`parseIsoDateParts`).
 *  - 시작일을 해석할 수 없는 사건은 버리지 않고 '연도 미상' 창으로 보낸다.
 */
import {
  centuryYearRange,
  formatCenturyLabel,
  formatYearLabel,
  getCentury,
  parseIsoDateParts,
} from '@/shared/lib/iso-date'

// ─────────────────────────────────────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────────────────────────────────────

export type TimelineImportance = 'critical' | 'major' | 'notable' | 'normal'

export interface TimelinePoint {
  id: string
  title: string
  /** 카테고리 **이름**(한글) — 색·범례·숨김 필터의 공통 키 */
  category: string
  importance: TimelineImportance
  /** 시작 정수 연도(부호). 시작일 미상이면 null */
  startYearInt: number | null
  /** 연 내 위치를 소수로 담은 시작 연도 — 밴드 x 좌표용. 미상이면 null */
  startYear: number | null
  /** 종료(≥ 시작). 종료 미상이면 시작과 동일. 미상 사건은 null */
  endYear: number | null
  endYearInt: number | null
  startDate: string | null
  endDate: string | null
  /** 계층 깊이 — 0=최상위. 리스트 행의 ↳ 표시에만 사용 */
  depth: number
  /** 날짜 정밀도('year'|'month'|'day') — 리스트가 없는 월·일을 지어내지 않게 한다 */
  startPrecision: string | null
  /** 부모 사건 id — 트리 문맥 복원(W2). 최상위·부모 미상이면 null */
  parentId: string | null
  /**
   * 부모 사건 제목 — 리스트 행의 '↳ {부모}' 프리픽스용.
   * 해석 실패(부모가 필터로 빠졌고 폴백도 불신) 시 null = '부모 제목 미상'.
   */
  parentTitle: string | null
}

/** 시간 창 — null은 '전체'. */
export type TimelineWindow =
  | { level: 'century'; century: number }
  | { level: 'span10'; startYear: number }
  | { level: 'unknown' }

export interface CategoryStack {
  count: number
  /** 카테고리 이름 → 시작 건수. 내비게이터 스택 색 렌더용 */
  byCategory: Map<string, number>
}

export interface CenturyBucket extends CategoryStack {
  century: number
}

export interface Span10Bucket extends CategoryStack {
  /** 구간 시작 연도(포함). 구간은 [startYear, startYear+10) */
  startYear: number
}

export interface YearBucket extends CategoryStack {
  year: number
}

export interface ListGroup {
  key: string
  label: string
  points: TimelinePoint[]
}

export interface PackedSpan {
  point: TimelinePoint
  /** 막대 좌표(px, 창 폭 기준) */
  x: number
  width: number
  /** 창 경계에서 잘렸는가 — 잘린 쪽 모서리를 직각으로 렌더 */
  clippedStart: boolean
  clippedEnd: boolean
  /** 라벨 배치 — 항상 막대 밖(오른쪽 우선), 창 끝에서만 왼쪽/내부 폴백 */
  labelSide: 'right' | 'left' | 'inside'
  labelX: number
  labelWidth: number
  labelText: string
  row: number
}

// ─────────────────────────────────────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────────────────────────────────────

/** 이 폭 미만이면 기간 사건이라도 밴드에 그리지 않는다(리스트가 담당) — 익명 픽셀 방지 */
const MIN_SPAN_PX = 14
/** 막대·라벨 간, 이웃 점유 구간 간 여유 */
const SPAN_LABEL_GAP = 6
const SPAN_PACK_GAP = 10
/** 라벨 폭 추정 — 11px·600 기준 실측 근사(기존 위젯의 CJK 10.5/ASCII 6 규약 승계) */
const LABEL_CJK_PX = 11
const LABEL_ASCII_PX = 6.5
const LABEL_MAX_PX = 280
const CJK_RE = /[ㄱ-힣一-鿿]/

const UNKNOWN_CATEGORY = '기타'

// ─────────────────────────────────────────────────────────────────────────────
// 포인트 변환
// ─────────────────────────────────────────────────────────────────────────────

/** 위젯이 소비하는 최소 입력 표면 — 테스트를 위해 구조적 타입으로 좁힌다. */
export interface TimelineSourceItem {
  node: {
    id: string
    title: string
    period: {
      start?: string | null
      end?: string | null
      startPrecision?: string | null
    }
    importance?: string | null
  }
  depth: number
  /** 평탄화가 보존한 부모 노드 id — 없으면 트리 문맥 없음(평면 모드 등) */
  parentNodeId?: string | null
  /**
   * 평탄화가 실어 보낸 부모 사건 — 필터로 부모 행이 배열에서 빠졌을 때의 폴백.
   * ⚠️ `useEventHierarchy`가 조부모 사건으로 폴백하는 경우가 있어
   * `parentEvent.id === parentNodeId`일 때만 신뢰한다(depth 2+ 오표기 방지).
   */
  parentEvent?: { id: string; title: string } | null
}

export interface TimelineSourceEvent {
  id: string
  category?: string | null
}

/**
 * 연 내 위치 소수 좌표 — day는 1부터 시작하므로 `(day-1)/31`로 [0,1)을 보장한다.
 * `day/31`이면 12월 31일이 정확히 다음 해 좌표(1880-12-31 → 1881.0)가 되어
 * 자기 창 밴드에서 빠지고 다음 창에서 잘림 표기도 누락됐다(검토 R18).
 */
const fractionalYear = (parts: {
  year: number
  month: number
  day: number
}): number => parts.year + (parts.month - 1 + (parts.day - 1) / 31) / 12

/**
 * 천문학적 연도 0(= BC 1) 정규화 — 검토 R4.
 *
 * `parseIsoDateParts`는 `0000-…`을 year 0으로 통과시키는데, `getCentury(0)`은 -1이라
 * 전체 단계에서는 기원전 1세기로 집계되면서 구간·리스트의 범위 검사([-100, 0))에서는
 * 빠져 **모수 일치 불변식이 3중으로 깨졌다**(세기 버킷 1건 → 하위 합 0). 부호 연도
 * 체계에 0년은 존재하지 않으므로(`iso-date` 규약: 연도 0은 천문학적으로 1 BC) 입구에서
 * -1로 정규화해 이후 모든 산술이 한 목소리를 내게 한다.
 */
const normalizeYearZero = <Parts extends { year: number }>(
  parts: Parts | null,
): Parts | null =>
  parts && parts.year === 0 ? { ...parts, year: -1 } : parts

/**
 * 부모 제목 해석 — 트리 문맥 복원(W2). 우선순위:
 *  ① items 전체의 node.id → title 맵(부모 행이 배열에 있으면 정확)
 *  ② `parentEvent.id === parentNodeId`인 parentEvent(부모가 필터로 빠진 경우 폴백 —
 *     id 불일치면 조부모 폴백 가능성이 있어 신뢰하지 않는다)
 *  ③ null(부모 제목 미상 — 소비처가 '상위 사건'으로 표기)
 */
const resolveParentContext = (
  item: TimelineSourceItem,
  titleById: ReadonlyMap<string, string>,
): { parentId: string | null; parentTitle: string | null } => {
  const parentId = item.parentNodeId ?? null
  if (parentId === null) return { parentId: null, parentTitle: null }
  const titleFromItems = titleById.get(parentId)
  if (titleFromItems !== undefined) {
    return { parentId, parentTitle: titleFromItems }
  }
  if (item.parentEvent && item.parentEvent.id === parentId) {
    return { parentId, parentTitle: item.parentEvent.title }
  }
  return { parentId, parentTitle: null }
}

/**
 * 계층 평탄화 결과 → 타임라인 포인트.
 * 카테고리는 사건 응답(`events`)에서 찾고, 못 찾으면 '기타'로 — 조용히 버리지 않는다.
 */
export function buildTimelinePoints(
  items: readonly TimelineSourceItem[],
  events: readonly TimelineSourceEvent[],
): TimelinePoint[] {
  const categoryById = new Map<string, string>()
  for (const event of events) {
    if (event.category) categoryById.set(event.id, event.category)
  }
  const titleById = new Map<string, string>()
  for (const item of items) {
    titleById.set(item.node.id, item.node.title)
  }

  const points: TimelinePoint[] = []
  for (const item of items) {
    const { node } = item
    const { parentId, parentTitle } = resolveParentContext(item, titleById)
    const startParts = normalizeYearZero(parseIsoDateParts(node.period.start))
    const endParts = node.period.end
      ? normalizeYearZero(parseIsoDateParts(node.period.end))
      : null
    const importance: TimelineImportance =
      node.importance === 'critical' ||
      node.importance === 'major' ||
      node.importance === 'notable'
        ? node.importance
        : 'normal'

    if (!startParts) {
      points.push({
        id: node.id,
        title: node.title,
        category: categoryById.get(node.id) ?? UNKNOWN_CATEGORY,
        importance,
        startYearInt: null,
        startYear: null,
        endYear: null,
        endYearInt: null,
        startDate: null,
        endDate: null,
        depth: item.depth,
        startPrecision: null,
        parentId,
        parentTitle,
      })
      continue
    }

    const startYear = fractionalYear(startParts)
    const endYearRaw = endParts ? fractionalYear(endParts) : startYear
    points.push({
      id: node.id,
      title: node.title,
      category: categoryById.get(node.id) ?? UNKNOWN_CATEGORY,
      importance,
      startYearInt: startParts.year,
      startYear,
      endYear: Math.max(startYear, endYearRaw),
      endYearInt: endParts ? Math.max(startParts.year, endParts.year) : startParts.year,
      startDate: node.period.start ?? null,
      endDate: node.period.end ?? null,
      depth: item.depth,
      startPrecision: node.period.startPrecision ?? null,
      parentId,
      parentTitle,
    })
  }
  return points
}

/** 범례 숨김 적용 */
export function visibleTimelinePoints(
  points: readonly TimelinePoint[],
  hiddenCategories: ReadonlySet<string>,
): TimelinePoint[] {
  if (hiddenCategories.size === 0) return points.slice()
  return points.filter((point) => !hiddenCategories.has(point.category))
}

// ─────────────────────────────────────────────────────────────────────────────
// 버킷
// ─────────────────────────────────────────────────────────────────────────────

const addToStack = (stack: CategoryStack, category: string) => {
  stack.count += 1
  stack.byCategory.set(category, (stack.byCategory.get(category) ?? 0) + 1)
}

/**
 * 전체 단계 — 시작 사건이 있는 세기만, 연대 오름차순.
 * (부호 세기는 숫자 순서가 곧 연대 순서: -5 < -1 < 1)
 */
export function centuryOverview(points: readonly TimelinePoint[]): {
  buckets: CenturyBucket[]
  unknownCount: number
} {
  const byCentury = new Map<number, CenturyBucket>()
  let unknownCount = 0
  for (const point of points) {
    if (point.startYearInt === null) {
      unknownCount += 1
      continue
    }
    const century = getCentury(point.startYearInt)
    let bucket = byCentury.get(century)
    if (!bucket) {
      bucket = { century, count: 0, byCategory: new Map() }
      byCentury.set(century, bucket)
    }
    addToStack(bucket, point.category)
  }
  const buckets = Array.from(byCentury.values()).sort(
    (left, right) => left.century - right.century,
  )
  return { buckets, unknownCount }
}

/**
 * 이 세기가 시작되기 전에 시작해 세기 안까지 이어지는 기간 사건 수 — 검토 R9.
 * 소속·카운트 모수는 시작 시점 기준 그대로 두고(불변식 유지), 전체 단계의 세기
 * 그룹 헤더가 '이전 세기부터 계속 N건' 라인으로 여러 세기 걸침 대형 사건의
 * 존재감을 되살린다(시작 세기 리스트 1행뿐이던 결함).
 */
export function continuingIntoCenturyCount(
  points: readonly TimelinePoint[],
  century: number,
): number {
  const { fromYear } = centuryYearRange(century)
  let count = 0
  for (const point of points) {
    if (point.startYearInt === null || point.endYearInt === null) continue
    if (point.startYearInt < fromYear && point.endYearInt >= fromYear) {
      count += 1
    }
  }
  return count
}

/** 이웃한 두 세기 사이의 빈 세기 수 — 0세기는 존재하지 않으므로 건너뛴다. */
export function centuryGapCount(
  earlierCentury: number,
  laterCentury: number,
): number {
  const raw = laterCentury - earlierCentury - 1
  const crossesZero = earlierCentury < 0 && laterCentury > 0
  return Math.max(0, crossesZero ? raw - 1 : raw)
}

/** 세기 단계 — 10년 구간 10개 고정(0건 포함). */
export function span10BucketsOf(
  points: readonly TimelinePoint[],
  century: number,
): Span10Bucket[] {
  const { fromYear } = centuryYearRange(century)
  const buckets: Span10Bucket[] = Array.from({ length: 10 }, (_, index) => ({
    startYear: fromYear + index * 10,
    count: 0,
    byCategory: new Map(),
  }))
  for (const point of points) {
    if (point.startYearInt === null) continue
    const offset = point.startYearInt - fromYear
    if (offset < 0 || offset >= 100) continue
    addToStack(buckets[Math.floor(offset / 10)], point.category)
  }
  return buckets
}

/** 10년 단계 — 연도 10개 고정(0건 포함). */
export function yearBucketsOf(
  points: readonly TimelinePoint[],
  span10Start: number,
): YearBucket[] {
  const buckets: YearBucket[] = Array.from({ length: 10 }, (_, index) => ({
    year: span10Start + index,
    count: 0,
    byCategory: new Map(),
  }))
  for (const point of points) {
    if (point.startYearInt === null) continue
    const offset = point.startYearInt - span10Start
    if (offset < 0 || offset >= 10) continue
    addToStack(buckets[offset], point.category)
  }
  return buckets
}

// ─────────────────────────────────────────────────────────────────────────────
// 창
// ─────────────────────────────────────────────────────────────────────────────

/** 창의 연도 범위 [fromYear, toYear). 전체·미상은 null. */
export function windowYearRange(
  window: TimelineWindow | null,
): { fromYear: number; toYear: number } | null {
  if (!window) return null
  if (window.level === 'century') {
    const { fromYear, toYear } = centuryYearRange(window.century)
    return { fromYear, toYear }
  }
  if (window.level === 'span10') {
    return { fromYear: window.startYear, toYear: window.startYear + 10 }
  }
  return null
}

/** 시작 시점이 창 안인 포인트(소속 정본). 전체=일자 있는 전부, 미상=일자 없는 전부. */
export function pointsStartingInWindow(
  points: readonly TimelinePoint[],
  window: TimelineWindow | null,
): TimelinePoint[] {
  if (window?.level === 'unknown') {
    return points.filter((point) => point.startYearInt === null)
  }
  const range = windowYearRange(window)
  if (!range) return points.filter((point) => point.startYearInt !== null)
  return points.filter(
    (point) =>
      point.startYearInt !== null &&
      point.startYearInt >= range.fromYear &&
      point.startYearInt < range.toYear,
  )
}

/** 이 포인트를 리스트에 담는 가장 구체적인 창(10년 구간). 미상이면 미상 창. */
export function windowContainingPoint(
  point: TimelinePoint,
): TimelineWindow {
  if (point.startYearInt === null) return { level: 'unknown' }
  return { level: 'span10', startYear: span10StartOf(point.startYearInt) }
}

/** 연도 → 그 연도가 속한 10년 구간의 시작 연도(세기 규약에 정렬). */
export function span10StartOf(year: number): number {
  const { fromYear } = centuryYearRange(getCentury(year))
  return fromYear + Math.floor((year - fromYear) / 10) * 10
}

/**
 * 이웃 10년 구간으로 이동. 연도 0은 존재하지 않으므로 BC↔AD 경계에서
 * `-10`(기원전 10–1년) ↔ `1`(1–10년)로 직접 잇는다.
 */
export function stepSpan10Start(startYear: number, delta: 1 | -1): number {
  const candidate = startYear + delta * 10
  if (candidate === 0) return delta === 1 ? 1 : -10
  return span10StartOf(candidate)
}

/** 창이 이 포인트를 (시작 기준으로) 담는가. */
export function windowContainsPoint(
  window: TimelineWindow | null,
  point: TimelinePoint,
): boolean {
  if (window?.level === 'unknown') return point.startYearInt === null
  // 미상 사건은 '전체'를 포함한 어떤 시간 창에도 속하지 않는다(미상 창 전용).
  if (point.startYearInt === null) return false
  const range = windowYearRange(window)
  if (!range) return true
  return (
    point.startYearInt >= range.fromYear && point.startYearInt < range.toYear
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 라벨
// ─────────────────────────────────────────────────────────────────────────────

/** 10년 구간 라벨 — AD `1871–1880년`, BC `기원전 100–91년`(연대순 왼→오른쪽). */
export function formatSpan10Label(startYear: number): string {
  const endYear = startYear + 9
  if (startYear > 0) return `${startYear}–${endYear}년`
  return `기원전 ${-startYear}–${-endYear}년`
}

/**
 * 내비게이터 버킷의 짧은 라벨(폭이 좁다).
 * 전체 단계는 세기(`19세기`/`BC 5`), 그 아래는 연도(`1871`/`BC 100`) —
 * 음수를 그대로 노출하면 오독이라 BC 접두를 쓴다.
 */
export function shortBucketLabel(
  currentWindow: TimelineWindow | null,
  value: number,
): string {
  if (currentWindow === null) {
    return value > 0 ? `${value}세기` : `BC ${-value}`
  }
  return value > 0 ? `${value}` : `BC ${-value}`
}

/** 창 라벨(브레드크럼·배너) */
export function describeWindow(window: TimelineWindow | null): string {
  if (!window) return '전체'
  if (window.level === 'century') return formatCenturyLabel(window.century)
  if (window.level === 'span10') return formatSpan10Label(window.startYear)
  return '연도 미상'
}

// ─────────────────────────────────────────────────────────────────────────────
// 리스트 그룹핑
// ─────────────────────────────────────────────────────────────────────────────

const IMPORTANCE_ORDER: Record<TimelineImportance, number> = {
  critical: 3,
  major: 2,
  notable: 1,
  normal: 0,
}

const compareForList = (left: TimelinePoint, right: TimelinePoint): number => {
  const leftYear = left.startYear ?? Number.POSITIVE_INFINITY
  const rightYear = right.startYear ?? Number.POSITIVE_INFINITY
  if (leftYear !== rightYear) return leftYear - rightYear
  const importanceDelta =
    IMPORTANCE_ORDER[right.importance] - IMPORTANCE_ORDER[left.importance]
  if (importanceDelta !== 0) return importanceDelta
  return left.title.localeCompare(right.title, 'ko')
}

/**
 * 같은 그룹 안 부모-자식 인접 복원 — 트리 문맥 복원(W2).
 *
 * `compareForList`(연도→중요도→제목)가 절단한 부모-자식 인접성을, **부모가 같은
 * 그룹에 있는 자식만** 부모 바로 뒤로 재배치해 되살린다(다층 체인 재귀).
 * 형제 간·루트 간에는 정렬 순서를 그대로 유지(안정적). 그룹 소속·카운트는 불변 —
 * 모든 포인트가 정확히 한 번 방출된다(순환은 서버가 차단하므로 visited는 방어용).
 */
const restoreParentAdjacency = (sorted: TimelinePoint[]): TimelinePoint[] => {
  const idsInGroup = new Set(sorted.map((point) => point.id))
  const hasLocalParent = (point: TimelinePoint): boolean =>
    point.parentId !== null &&
    point.parentId !== point.id &&
    idsInGroup.has(point.parentId)
  if (!sorted.some(hasLocalParent)) return sorted

  const childrenByParent = new Map<string, TimelinePoint[]>()
  for (const point of sorted) {
    if (!hasLocalParent(point)) continue
    const parentId = point.parentId as string
    const siblings = childrenByParent.get(parentId)
    if (siblings) siblings.push(point)
    else childrenByParent.set(parentId, [point])
  }

  const result: TimelinePoint[] = []
  const visited = new Set<string>()
  const emitWithDescendants = (point: TimelinePoint): void => {
    if (visited.has(point.id)) return
    visited.add(point.id)
    result.push(point)
    const children = childrenByParent.get(point.id)
    if (!children) return
    for (const child of children) emitWithDescendants(child)
  }
  for (const point of sorted) {
    // 그룹 내 부모가 있는 포인트는 그 부모 뒤에서 방출된다.
    if (hasLocalParent(point)) continue
    emitWithDescendants(point)
  }
  // 방어: (이론상) 순환 등으로 어느 루트에서도 못 닿은 포인트를 그대로 뒤에 붙인다
  // — 어떤 경우에도 포인트를 잃지 않는다(그룹 카운트 불변식).
  for (const point of sorted) emitWithDescendants(point)
  return result
}

/**
 * 창 안 포인트 → 하위 버킷 그룹(비어 있지 않은 것만, 연대 오름차순).
 * 전체→세기 / 세기→10년 구간 / 10년→연도 / 미상→단일 그룹.
 * 그룹 안 순서는 `compareForList` 뒤에 부모-자식 인접 복원을 얹는다(W2).
 */
export function groupPointsForList(
  points: readonly TimelinePoint[],
  window: TimelineWindow | null,
): ListGroup[] {
  if (window?.level === 'unknown') {
    if (points.length === 0) return []
    return [
      {
        key: 'unknown',
        label: '연도 미상',
        points: restoreParentAdjacency(points.slice().sort(compareForList)),
      },
    ]
  }

  const keyOf = (point: TimelinePoint): number => {
    const year = point.startYearInt as number
    if (!window) return getCentury(year)
    if (window.level === 'century') return span10StartOf(year)
    return year
  }
  const labelOf = (key: number): string => {
    if (!window) return formatCenturyLabel(key)
    if (window.level === 'century') return formatSpan10Label(key)
    return formatYearLabel(key)
  }
  const keyPrefix = !window ? 'c' : window.level === 'century' ? 'd' : 'y'

  const groups = new Map<number, TimelinePoint[]>()
  for (const point of points) {
    if (point.startYearInt === null) continue
    const key = keyOf(point)
    const bucket = groups.get(key)
    if (bucket) bucket.push(point)
    else groups.set(key, [point])
  }
  return Array.from(groups.entries())
    .sort((left, right) => left[0] - right[0])
    .map(([key, groupPoints]) => ({
      key: `${keyPrefix}${key}`,
      label: labelOf(key),
      points: restoreParentAdjacency(groupPoints.sort(compareForList)),
    }))
}

// ─────────────────────────────────────────────────────────────────────────────
// 기간 밴드 패킹
// ─────────────────────────────────────────────────────────────────────────────

function estimateLabelWidth(text: string): number {
  let width = 0
  for (const char of text) {
    width += CJK_RE.test(char) ? LABEL_CJK_PX : LABEL_ASCII_PX
  }
  return Math.min(LABEL_MAX_PX, Math.ceil(width))
}

export interface PackedSpanResult {
  spans: PackedSpan[]
  /**
   * 행 상한(maxRows)에 밀려 밴드에서 접힌 사건들 — 검토 R6.
   * 이름은 연표 리스트가 담당하고, 밴드는 «외 N건» 집계 라인으로 접힘을 밝힌다
   * (P1 익명 마크 금지 — 조용한 탈락이 아니라 명시적 집계).
   */
  overflow: TimelinePoint[]
}

/**
 * 창과 겹치는 기간 사건 → 행 패킹.
 *
 * - 겹침 기준(시작이 이전 창이어도 현존하면 그린다) + 경계 클램프.
 * - 라벨 폭까지 점유 구간에 넣어 first-fit — 라벨은 **항상** 노출된다(스틸·핀 없음).
 * - 잘린 막대의 라벨에는 실제 연도 범위를 병기해 출처를 밝힌다.
 * - `maxRows`를 넘는 스팬은 `overflow`로 반환(기본 무제한) — 밀집 세기에서 밴드가
 *   화면을 도배하지 않도록 소비처가 상한을 건다(검토 R6).
 */
export function packSpanRows(
  points: readonly TimelinePoint[],
  window: TimelineWindow | null,
  widthPx: number,
  maxRows: number = Number.POSITIVE_INFINITY,
): PackedSpanResult {
  const range = windowYearRange(window)
  if (!range || widthPx <= 0) return { spans: [], overflow: [] }
  const { fromYear, toYear } = range
  const yearSpan = toYear - fromYear
  const xOf = (year: number): number =>
    ((year - fromYear) / yearSpan) * widthPx

  type Candidate = Omit<PackedSpan, 'row'>
  const candidates: Candidate[] = []
  for (const point of points) {
    if (point.startYear === null || point.endYear === null) continue
    if (point.endYear <= fromYear || point.startYear >= toYear) continue
    const rawStartX = xOf(point.startYear)
    const rawEndX = xOf(point.endYear)
    const x = Math.max(0, rawStartX)
    const width = Math.min(widthPx, rawEndX) - x
    if (width < MIN_SPAN_PX) continue

    const clippedStart = rawStartX < 0
    const clippedEnd = rawEndX > widthPx
    // 잘린 막대는 실제 연도 범위를 병기해 출처를 밝힌다 — 짧은 부호 표기(BC 100 등)
    const shortYearOf = (year: number): string =>
      year > 0 ? `${year}` : `BC ${-year}`
    const rangeSuffix =
      clippedStart || clippedEnd
        ? ` (${shortYearOf(point.startYearInt as number)}~${
            point.endYearInt !== null && point.endYearInt !== point.startYearInt
              ? shortYearOf(point.endYearInt)
              : ''
          })`
        : ''
    const labelText = `${point.title}${rangeSuffix}`
    const labelWidth = estimateLabelWidth(labelText)

    let labelSide: PackedSpan['labelSide'] = 'right'
    let labelX = x + width + SPAN_LABEL_GAP
    if (labelX + labelWidth > widthPx) {
      if (x - SPAN_LABEL_GAP - labelWidth >= 0) {
        labelSide = 'left'
        labelX = x - SPAN_LABEL_GAP - labelWidth
      } else {
        labelSide = 'inside'
        labelX = x + SPAN_LABEL_GAP
      }
    }
    candidates.push({
      point,
      x,
      width,
      clippedStart,
      clippedEnd,
      labelSide,
      labelX,
      labelWidth,
      labelText,
    })
  }

  candidates.sort((left, right) => {
    if (left.x !== right.x) return left.x - right.x
    return right.width - left.width
  })

  const rowEnds: number[] = []
  const packed: PackedSpan[] = []
  const overflow: TimelinePoint[] = []
  for (const candidate of candidates) {
    const occupiedStart = Math.min(candidate.x, candidate.labelX)
    const occupiedEnd = Math.max(
      candidate.x + candidate.width,
      candidate.labelX + candidate.labelWidth,
    )
    let row = rowEnds.findIndex((end) => end + SPAN_PACK_GAP <= occupiedStart)
    if (row === -1) {
      if (rowEnds.length >= maxRows) {
        overflow.push(candidate.point)
        continue
      }
      row = rowEnds.length
      rowEnds.push(occupiedEnd)
    } else {
      rowEnds[row] = occupiedEnd
    }
    packed.push({ ...candidate, row })
  }
  return { spans: packed, overflow }
}

// ─────────────────────────────────────────────────────────────────────────────
// URL 직렬화 — `tlw` 파라미터
// ─────────────────────────────────────────────────────────────────────────────

/** 창 → URL 토큰. 전체(null)는 null(키 삭제). */
export function serializeTimelineWindow(
  window: TimelineWindow | null,
): string | null {
  if (!window) return null
  if (window.level === 'century') return `c${window.century}`
  if (window.level === 'span10') return `d${window.startYear}`
  return 'u'
}

/**
 * 창 세기 크기 상한 — 검토 R5. 페이지 세기 필터 파서(`parseCenturyParam`)의
 * `MAX_CENTURY_MAGNITUDE`(21)와 같은 값. 클램프 없이 `c999`를 *수용*하면 serialize가
 * 같은 토큰을 되쓰기해, 다른 축과 달리 "무효값은 첫 write에서 URL 정리" 규약이
 * 영원히 걸리지 않는 유일한 축이 된다.
 */
const MAX_WINDOW_CENTURY = 21

/**
 * URL 토큰 → 창. 무효값은 null(전체)로 낙하 — 파서 규약은
 * `parse-catalog-search-params`의 다른 축과 동일(조용히 기본값, 다음 write에서 URL 정리).
 */
export function parseTimelineWindow(raw: string | null): TimelineWindow | null {
  if (!raw) return null
  const value = raw.trim()
  if (value === 'u') return { level: 'unknown' }
  const centuryMatch = value.match(/^c(-?\d{1,3})$/)
  if (centuryMatch) {
    const century = Number(centuryMatch[1])
    if (century === 0 || Math.abs(century) > MAX_WINDOW_CENTURY) return null
    return { level: 'century', century }
  }
  const spanMatch = value.match(/^d(-?\d{1,6})$/)
  if (spanMatch) {
    const startYear = Number(spanMatch[1])
    // 유효한 구간 시작(세기 규약 10등분에 정렬 + 세기 크기 상한 안)만 인정
    if (
      startYear !== 0 &&
      span10StartOf(startYear) === startYear &&
      Math.abs(getCentury(startYear)) <= MAX_WINDOW_CENTURY
    ) {
      return { level: 'span10', startYear }
    }
    return null
  }
  return null
}

/** 한 단계 위 창 — 브레드크럼·Backspace 용. */
export function parentWindow(
  window: TimelineWindow | null,
): TimelineWindow | null {
  if (!window || window.level === 'unknown' || window.level === 'century') {
    return null
  }
  return { level: 'century', century: getCentury(window.startYear) }
}
