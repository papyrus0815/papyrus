/**
 * 묶음 사건 전개의 **구획** — 하위 사건을 상위 기간에 비춰 '시작 이전 · 기간 중 · 끝난 뒤 · 날짜 미상'으로 가른다.
 *
 * 실데이터에서 하위 사건의 31건이 상위 기간 밖이었다(1차대전 하위 18건 중 16건이 개전 전 7월 위기,
 * 러불 동맹은 정식 발효 전 협정들). 시간순 한 줄로는 '전쟁 전 일'과 '전쟁 중 일'이 섞여 읽혔다.
 *
 * ⚠️ 비교는 **둘 중 거친 정밀도**에서 한다. '1700년'(연도만)인 대북방전쟁 제1기를 1700-02-22 시작과
 * 일 단위로 비교하면 1700-01-01로 읽혀 '시작 이전'이 되는 가짜 경보가 났다.
 */

export type DatePrecision = 'year' | 'month' | 'day'
export type DevelopmentPhase = 'before' | 'during' | 'after' | 'undated'

export interface DatedLike {
  startDate?: string | null
  startDatePrecision?: string | null
  endDate?: string | null
  endDatePrecision?: string | null
}

interface Tokens {
  year: number
  month: number
  day: number
}

const PRECISION_RANK: Record<DatePrecision, number> = { year: 0, month: 1, day: 2 }

const toPrecision = (value?: string | null): DatePrecision =>
  value === 'year' || value === 'month' ? value : 'day'

/** ISO(BC는 음수 연도) → 연·월·일. JS Date는 BC를 NaN으로 떨궈 직접 읽는다 */
export function parseDateTokens(input?: string | null): Tokens | null {
  if (!input) return null
  const matched = input.match(/^(-?\d{1,6})(?:-(\d{1,2}))?(?:-(\d{1,2}))?/)
  if (!matched) return null
  return {
    year: parseInt(matched[1], 10),
    month: matched[2] ? parseInt(matched[2], 10) : 1,
    day: matched[3] ? parseInt(matched[3], 10) : 1,
  }
}

/** 두 날짜를 거친 쪽 정밀도에서 비교 — 음수면 left가 앞 */
export function compareAtCoarser(
  left: Tokens,
  leftPrecision: DatePrecision,
  right: Tokens,
  rightPrecision: DatePrecision,
): number {
  const precision =
    PRECISION_RANK[leftPrecision] <= PRECISION_RANK[rightPrecision] ? leftPrecision : rightPrecision
  if (left.year !== right.year) return left.year - right.year
  if (precision === 'year') return 0
  if (left.month !== right.month) return left.month - right.month
  if (precision === 'month') return 0
  return left.day - right.day
}

export function phaseOf(child: DatedLike, parent: DatedLike): DevelopmentPhase {
  const childStart = parseDateTokens(child.startDate)
  if (!childStart) return 'undated'
  const childPrecision = toPrecision(child.startDatePrecision)
  const parentStart = parseDateTokens(parent.startDate)
  const parentStartPrecision = toPrecision(parent.startDatePrecision)
  if (parentStart && compareAtCoarser(childStart, childPrecision, parentStart, parentStartPrecision) < 0) {
    /* 상위 시작 전에 시작했어도 시작일까지 이어졌으면 '시작 이전'이 아니다 — 기간에 걸쳐 있다 */
    const childEnd = parseDateTokens(child.endDate)
    const endsBefore =
      !childEnd ||
      compareAtCoarser(childEnd, toPrecision(child.endDatePrecision), parentStart, parentStartPrecision) < 0
    if (endsBefore) return 'before'
  }
  const parentEnd = parseDateTokens(parent.endDate)
  if (
    parentEnd &&
    compareAtCoarser(childStart, childPrecision, parentEnd, toPrecision(parent.endDatePrecision)) > 0
  ) {
    return 'after'
  }
  return 'during'
}

export const PHASE_ORDER: DevelopmentPhase[] = ['before', 'during', 'after', 'undated']

export const PHASE_LABEL: Record<DevelopmentPhase, string> = {
  before: '시작 이전',
  during: '기간 중',
  after: '끝난 뒤',
  undated: '날짜 미상',
}

/**
 * 구획별로 묶는다 — 각 구획 안은 들어온 순서(호출부가 시간순으로 넘긴다) 그대로.
 * 빈 구획은 빠진다. 구획이 하나뿐이면 호출부는 구획 머리를 그리지 않는다(전부 '기간 중'이 보통).
 */
export function groupByPhase<T extends DatedLike>(
  children: T[],
  parent: DatedLike,
): Array<{ phase: DevelopmentPhase; items: T[] }> {
  const buckets = new Map<DevelopmentPhase, T[]>()
  for (const child of children) {
    const phase = phaseOf(child, parent)
    buckets.set(phase, [...(buckets.get(phase) ?? []), child])
  }
  return PHASE_ORDER.filter((phase) => buckets.has(phase)).map((phase) => ({
    phase,
    items: buckets.get(phase)!,
  }))
}

/**
 * 골라서 묶을 때 새 묶음의 기간 — 고른 하위들의 **가장 이른 시작 ~ 가장 늦은 끝**(끝이 없으면 시작).
 * 정밀도는 그 값을 낸 하위의 것을 그대로 가져간다('1914년 7월'이 '1914년 7월 1일'로 둔갑하지 않게).
 * 날짜 있는 하위가 하나도 없으면 null — 기간 없이 만든다.
 */
export function spanOfChildren(items: ReadonlyArray<DatedLike>): {
  startDate: string
  startDatePrecision: DatePrecision
  endDate: string
  endDatePrecision: DatePrecision
} | null {
  let start: { raw: string; tokens: Tokens; precision: DatePrecision } | null = null
  let end: { raw: string; tokens: Tokens; precision: DatePrecision } | null = null
  for (const item of items) {
    const startTokens = parseDateTokens(item.startDate)
    if (!startTokens || !item.startDate) continue
    const startPrecision = toPrecision(item.startDatePrecision)
    if (!start || compareAtCoarser(startTokens, 'day', start.tokens, 'day') < 0) {
      start = { raw: item.startDate, tokens: startTokens, precision: startPrecision }
    }
    const endRaw = item.endDate ?? item.startDate
    const endTokens = parseDateTokens(endRaw)
    const endPrecision = toPrecision(item.endDate ? item.endDatePrecision : item.startDatePrecision)
    if (endTokens && (!end || compareAtCoarser(endTokens, 'day', end.tokens, 'day') > 0)) {
      end = { raw: endRaw, tokens: endTokens, precision: endPrecision }
    }
  }
  if (!start || !end) return null
  return {
    startDate: start.raw,
    startDatePrecision: start.precision,
    endDate: end.raw,
    endDatePrecision: end.precision,
  }
}

/**
 * 타임라인 척추의 해(또는 해·달) 바뀜 표지 — 같은 구획 안에서 해가 바뀔 때마다 '1789년'·'1791년'을,
 * 모든 사건이 같은 해 안에서 여러 달에 걸쳐 있으면 달이 바뀔 때마다 '1914년 6월'·'1914년 7월'을 돌려준다.
 * 날짜 있는 사건이 2건 미만이거나 해·달 변화가 없으면 전부 null.
 */
export function stepTimeMarkers(siblings: ReadonlyArray<DatedLike>): Array<string | null> {
  const tokensList = siblings.map((item) => {
    const tokens = parseDateTokens(item.startDate)
    if (!tokens) return null
    const precision = toPrecision(item.startDatePrecision)
    return { ...tokens, precision }
  })
  const dated = tokensList.filter((item): item is NonNullable<typeof item> => item !== null)
  if (dated.length < 2) return siblings.map(() => null)

  const distinctYears = new Set(dated.map((item) => item.year))
  const formatYear = (year: number) => (year < 0 ? `기원전 ${-year}년` : `${year}년`)

  if (distinctYears.size >= 2) {
    let lastYear: number | null = null
    return tokensList.map((item) => {
      if (!item) return null
      if (item.year === lastYear) return null
      lastYear = item.year
      return formatYear(item.year)
    })
  }

  /* 전부 같은 해 — 월·일 정밀도 사건이 여러 달에 걸치면 월 단위로 마디를 세운다 */
  const monthPrecise = dated.filter((item) => item.precision !== 'year')
  const distinctMonths = new Set(monthPrecise.map((item) => item.month))
  if (distinctMonths.size < 2) return siblings.map(() => null)

  let lastMonth: number | null = null
  return tokensList.map((item) => {
    if (!item || item.precision === 'year') return null
    if (item.month === lastMonth) return null
    lastMonth = item.month
    return `${formatYear(item.year)} ${item.month}월`
  })
}

/** 하위 사건의 요약문에서 HTML 태그·강조 기호를 걷어 한 줄 미리보기 문자열로 만든다 */
export function plainStepSummary(raw?: string | null): string | null {
  if (!raw) return null
  const text = raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > 0 ? text : null
}
