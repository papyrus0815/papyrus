/**
 * 정기 사건·회의 시리즈(EventSeries) — 개최 주기 라벨 및 차기 개최 시기(Next Occurrence) 추산 엔진.
 *
 * 단순 `마지막 연도 + N년` 덧셈만으로는 실제 외교·역사 데이터를 다룰 수 없다:
 *  1) 연 2회(반기 6개월 — 아세안 정상회의 상·하반기)와 격년(24개월 — ASEM·WTO 각료회의), 다년(48개월 — 올림픽, 60개월 — 당대회)을 모두 수용해야 한다.
 *  2) '제44·45차'처럼 합동 개최된 회차는 다음 예상 회차가 45차가 아니라 46차여야 하며, '특별 정상회의'(seriesEdition=null)는 정규 회차 번호와 주기 기준점을 흔들지 않아야 한다.
 *  3) 이미 등록된 미래 예정 사건(Event)이 있으면 그것이 최우선 정본이고, 그다음이 공식 확정 오버라이드(CONFIRMED), 연기(POSTPONED), 주기 추산(ESTIMATED / OVERDUE) 순이다.
 *  4) 예상 시점이 기준일(오늘)을 지났는데도 새 회차가 없으면 '미래 예정'이 아니라 '기록 누락 또는 미개최(OVERDUE)'로 안내해 입력 점검까지 돕는다.
 */

export type ForecastCadenceKind = 'PERIODIC' | 'IRREGULAR'
export type ForecastSeriesStatus = 'ACTIVE' | 'SUSPENDED' | 'ENDED'
export type ForecastNextState = 'AUTO' | 'CONFIRMED' | 'POSTPONED' | 'TBD'

export type EventSeriesForecastKind =
  | 'ENDED'
  | 'SUSPENDED'
  | 'POSTPONED'
  | 'SCHEDULED_EVENT'
  | 'CONFIRMED'
  | 'ESTIMATED'
  | 'OVERDUE'
  | 'TBD'

export interface ForecastHostCountry {
  id: string
  name: string
  flagEmoji?: string | null
}

export interface ForecastSeriesInput {
  title: string
  status: ForecastSeriesStatus
  cadenceKind: ForecastCadenceKind
  intervalMonths?: number | null
  typicalMonth?: number | null
  typicalMonthSecondary?: number | null
  endedYear?: number | null
  nextScheduleState?: ForecastNextState | null
  nextEditionNumber?: number | null
  nextYear?: number | null
  nextMonth?: number | null
  nextDay?: number | null
  nextHostCountry?: ForecastHostCountry | null
  nextLocation?: string | null
  nextNote?: string | null
  /** 순번 기반 차기 의장국·개최국 자동 추론 활성화 여부 */
  hostRotationEnabled?: boolean
  /** 순환 개최 후보국 큐 (명시 순번 또는 주관 조직의 현역 정회원국 목록) */
  rotationCandidates?: ReadonlyArray<ForecastHostCountry>
  /** 주관 조직이 이미 해산된 경우 차기 개최 안내를 종료로 본다 */
  organizationDissolved?: boolean
}

export interface ForecastEditionInput {
  id: string
  title: string
  seriesEdition?: number | null
  seriesEditionLabel?: string | null
  startEra?: 'BC' | 'AD' | string | null
  startYear?: number | null
  startMonth?: number | null
  startDay?: number | null
  startDatePrecision?: string | null
  location?: string | null
  hostCountry?: {
    id: string
    name: string
    flagEmoji?: string | null
  } | null
}

export interface ReferenceCalendarDate {
  year: number
  month: number
  day: number
}

export interface EventSeriesForecast {
  kind: EventSeriesForecastKind
  /** 주기 요약 라벨 (예: '2년마다', '매년 (통상 11월)', '연 2회 (5·11월경)', '부정기') */
  cadenceLabel: string
  /** 한 줄 핵심 안내 문구 */
  headline: string
  expectedYear: number | null
  expectedMonth: number | null
  expectedDay: number | null
  expectedEdition: number | null
  /** 이미 미래 예정 사건이 등록된 경우 연결 사건 ID·제목 */
  scheduledEventId: string | null
  scheduledEventTitle: string | null
  hostCountry: ForecastHostCountry | null
  /** 순환 큐로부터 자동 추론된 예상 의장국·개최국인지 여부 (수동 확정 시 false) */
  hostCountryIsEstimated?: boolean
  location: string | null
  note: string | null
  /** 기준월 대비 남은 개월 수 (음수면 예정 시점 경과 개월 수) */
  monthsUntil: number | null
  /** 원클릭 차기 회차 사건 생성 프리필 */
  prefill: {
    suggestedTitle: string
    suggestedEdition: number | null
    suggestedYear: number | null
    suggestedMonth: number | null
    suggestedLocation: string | null
    suggestedHostCountryId: string | null
  }
}

export function signedYearOfEdition(edition: {
  startEra?: string | null
  startYear?: number | null
}): number | null {
  if (edition.startYear == null) return null
  return edition.startEra === 'BC'
    ? -Math.abs(edition.startYear)
    : edition.startYear
}

/**
 * 회차 번호 또는 합동 회차 라벨('제44·45차', '40·41차')에서 가장 큰 정규 회차 번호를 읽는다.
 * 특별회의('특별 정상회의')처럼 숫자도 seriesEdition도 없으면 null.
 */
export function maxEditionNumberOf(edition: {
  seriesEdition?: number | null
  seriesEditionLabel?: string | null
}): number | null {
  let max = edition.seriesEdition != null && edition.seriesEdition > 0 ? edition.seriesEdition : null
  if (edition.seriesEditionLabel) {
    const matches = edition.seriesEditionLabel.match(/\d+/g)
    if (matches) {
      for (const raw of matches) {
        const parsed = Number.parseInt(raw, 10)
        // 연도(1900~2100)가 라벨에 적힌 경우('2021 특별정상회의') 회차 번호로 오인하지 않도록 상한을 둔다
        if (Number.isFinite(parsed) && parsed > 0 && parsed < 1000) {
          max = max == null ? parsed : Math.max(max, parsed)
        }
      }
    }
  }
  return max
}

/** 회차 하나가 포괄하는 정규 회차 번호 목록 ('제44·45차' → [44, 45]) */
export function coveredEditionNumbersOf(edition: {
  seriesEdition?: number | null
  seriesEditionLabel?: string | null
}): number[] {
  const nums = new Set<number>()
  if (
    edition.seriesEdition != null &&
    edition.seriesEdition > 0 &&
    edition.seriesEdition < 1000
  ) {
    nums.add(edition.seriesEdition)
  }
  const label = edition.seriesEditionLabel?.trim()
  if (label) {
    const rangeRegex = /(\d+)\s*[~-]\s*(\d+)/g
    let rangeMatch: RegExpExecArray | null
    while ((rangeMatch = rangeRegex.exec(label)) !== null) {
      const a = Number.parseInt(rangeMatch[1], 10)
      const b = Number.parseInt(rangeMatch[2], 10)
      if (a > 0 && b >= a && b < 1000 && b - a <= 30) {
        for (let n = a; n <= b; n += 1) nums.add(n)
      }
    }
    const matches = label.match(/\d+/g)
    if (matches) {
      for (const raw of matches) {
        const parsed = Number.parseInt(raw, 10)
        if (Number.isFinite(parsed) && parsed > 0 && parsed < 1000) {
          nums.add(parsed)
        }
      }
    }
  }
  return [...nums].sort((a, b) => a - b)
}

export interface MissingSeriesEditionRange {
  fromEdition: number
  toEdition: number
  count: number
  /** 제1차부터 시작하는 초기 미등록 구간인지 여부 (false면 등록된 회차 사이의 중간 결번) */
  isLeadingGap: boolean
}

/**
 * 등록된 회차들 사이의 결번(미등록 회차 구간)을 탐지한다.
 * 예: 제1차, 제41차, 제43차 등록 시 → [{1..1 아님 -> 2..40, isLeadingGap: false}, {42..42, isLeadingGap: false}]
 * 예: 제43차만 등록 시 → [{fromEdition: 1, toEdition: 42, count: 42, isLeadingGap: true}]
 */
export function detectMissingSeriesEditions(
  rawEditions: ReadonlyArray<{
    seriesEdition?: number | null
    seriesEditionLabel?: string | null
  }>,
): MissingSeriesEditionRange[] {
  const covered = new Set<number>()
  for (const ed of rawEditions) {
    for (const n of coveredEditionNumbersOf(ed)) {
      covered.add(n)
    }
  }
  if (covered.size === 0) return []
  const maxEdition = Math.max(...covered)
  if (maxEdition <= 1) return []

  const ranges: MissingSeriesEditionRange[] = []
  let gapStart: number | null = null

  for (let n = 1; n <= maxEdition; n += 1) {
    if (!covered.has(n)) {
      if (gapStart == null) gapStart = n
    } else if (gapStart != null) {
      const gapEnd = n - 1
      ranges.push({
        fromEdition: gapStart,
        toEdition: gapEnd,
        count: gapEnd - gapStart + 1,
        isLeadingGap: gapStart === 1,
      })
      gapStart = null
    }
  }
  return ranges
}

/** 사건 하나에 표시할 회차 배지 텍스트 ('제43차', '제44·45차', '특별 정상회의') */
export function formatSeriesEditionBadge(edition: {
  seriesEdition?: number | null
  seriesEditionLabel?: string | null
}): string | null {
  const custom = edition.seriesEditionLabel?.trim()
  if (custom) return custom
  if (edition.seriesEdition != null && edition.seriesEdition > 0) {
    return `제${edition.seriesEdition}차`
  }
  return null
}

/** 개최 주기 규칙을 사람이 읽기 쉬운 한국어 라벨로 변환 */
export function formatSeriesCadenceLabel(series: {
  cadenceKind: ForecastCadenceKind
  intervalMonths?: number | null
  typicalMonth?: number | null
  typicalMonthSecondary?: number | null
}): string {
  if (series.cadenceKind === 'IRREGULAR' || !series.intervalMonths || series.intervalMonths <= 0) {
    return '부정기'
  }
  const months = series.intervalMonths
  const m1 = series.typicalMonth && series.typicalMonth >= 1 && series.typicalMonth <= 12 ? series.typicalMonth : null
  const m2 =
    series.typicalMonthSecondary &&
    series.typicalMonthSecondary >= 1 &&
    series.typicalMonthSecondary <= 12
      ? series.typicalMonthSecondary
      : null

  if (months === 6) {
    if (m1 && m2) {
      const [first, second] = m1 <= m2 ? [m1, m2] : [m2, m1]
      return `연 2회 (${first}·${second}월경)`
    }
    return '연 2회 (반기마다)'
  }
  if (months === 12) {
    return m1 ? `매년 (통상 ${m1}월)` : '매년'
  }
  if (months % 12 === 0) {
    const years = months / 12
    return m1 ? `${years}년마다 (통상 ${m1}월)` : `${years}년마다`
  }
  return `${months}개월마다`
}

function editionSortKey(edition: ForecastEditionInput): number {
  const sy = signedYearOfEdition(edition)
  if (sy == null) return Number.NEGATIVE_INFINITY
  const m =
    edition.startDatePrecision === 'year'
      ? 1
      : (edition.startMonth ?? 1)
  const d =
    edition.startDatePrecision === 'year' || edition.startDatePrecision === 'month'
      ? 1
      : (edition.startDay ?? 1)
  return sy * 10000 + m * 100 + d
}

export function isFutureEdition(
  edition: ForecastEditionInput,
  ref: ReferenceCalendarDate,
): boolean {
  const sy = signedYearOfEdition(edition)
  if (sy == null) return false
  if (edition.startDatePrecision === 'year' || edition.startMonth == null) {
    return sy > ref.year
  }
  if (edition.startDatePrecision === 'month' || edition.startDay == null) {
    return sy > ref.year || (sy === ref.year && edition.startMonth > ref.month)
  }
  const editionKey = sy * 10000 + edition.startMonth * 100 + edition.startDay
  const refKey = ref.year * 10000 + ref.month * 100 + ref.day
  return editionKey > refKey
}

function formatExpectedPoint(
  year: number | null,
  month: number | null,
  day: number | null,
  approx = false,
): string {
  if (year == null) return '일정 미정'
  const yLabel = year < 0 ? `BC ${Math.abs(year)}년` : `${year}년`
  if (month == null) return approx ? `${yLabel}경` : yLabel
  if (day == null) return approx ? `${yLabel} ${month}월경` : `${yLabel} ${month}월`
  return `${yLabel} ${month}월 ${day}일`
}

function buildSuggestedTitle(
  seriesTitle: string,
  expectedEdition: number | null,
  expectedYear: number | null,
  usesNumberedEditions: boolean,
): string {
  if (usesNumberedEditions && expectedEdition != null) {
    return `제${expectedEdition}차 ${seriesTitle}`
  }
  if (expectedYear != null && expectedYear > 0) {
    return `${expectedYear}년 ${seriesTitle}`
  }
  return seriesTitle
}

export function defaultReferenceDate(now = new Date()): ReferenceCalendarDate {
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  }
}

function inferRotationHostCountry(
  series: ForecastSeriesInput,
  regularAnchors: ReadonlyArray<ForecastEditionInput>,
  sameChairYear = false,
): ForecastHostCountry | null {
  if (series.nextHostCountry) return null
  if (!series.hostRotationEnabled) return null
  const queue = series.rotationCandidates ?? []
  if (queue.length === 0) return null

  if (regularAnchors.length === 0) {
    return queue[0]
  }

  for (let i = regularAnchors.length - 1; i >= 0; i -= 1) {
    const hostId = regularAnchors[i].hostCountry?.id
    if (!hostId) continue
    const idx = queue.findIndex((c) => c.id === hostId)
    if (idx >= 0) {
      return sameChairYear ? queue[idx] : queue[(idx + 1) % queue.length]
    }
  }
  return null
}

export function computeEventSeriesForecast(
  series: ForecastSeriesInput,
  rawEditions: ReadonlyArray<ForecastEditionInput>,
  ref: ReferenceCalendarDate = defaultReferenceDate(),
): EventSeriesForecast {
  const cadenceLabel = formatSeriesCadenceLabel(series)
  const ordered = [...rawEditions].sort((a, b) => {
    const keyDiff = editionSortKey(a) - editionSortKey(b)
    if (keyDiff !== 0) return keyDiff
    return (a.seriesEdition ?? 0) - (b.seriesEdition ?? 0)
  })

  const numberedEditions = ordered
    .map(maxEditionNumberOf)
    .filter((n): n is number => n != null)
  const usesNumberedEditions =
    series.nextEditionNumber != null || numberedEditions.length > 0
  const highestEdition =
    numberedEditions.length > 0 ? Math.max(...numberedEditions) : null
  const inferredNextEdition =
    series.nextEditionNumber ?? (highestEdition != null ? highestEdition + 1 : null)

  const basePrefill = (
    year: number | null,
    month: number | null,
    edition: number | null,
    location: string | null = series.nextLocation ?? null,
    hostCountryId: string | null = series.nextHostCountry?.id ?? null,
  ) => ({
    suggestedTitle: buildSuggestedTitle(
      series.title,
      edition,
      year,
      usesNumberedEditions,
    ),
    suggestedEdition: edition,
    suggestedYear: year,
    suggestedMonth: month,
    suggestedLocation: location,
    suggestedHostCountryId: hostCountryId,
  })

  // 1) 종료·해산 상태
  if (series.status === 'ENDED' || series.organizationDissolved) {
    const endLabel = series.endedYear ? `${series.endedYear}년 종료` : '종료된 시리즈'
    return {
      kind: 'ENDED',
      cadenceLabel,
      headline: endLabel,
      expectedYear: null,
      expectedMonth: null,
      expectedDay: null,
      expectedEdition: null,
      scheduledEventId: null,
      scheduledEventTitle: null,
      hostCountry: null,
      location: null,
      note: series.nextNote ?? null,
      monthsUntil: null,
      prefill: basePrefill(null, null, inferredNextEdition, null, null),
    }
  }

  // 2) 잠정 중단 상태
  if (series.status === 'SUSPENDED') {
    return {
      kind: 'SUSPENDED',
      cadenceLabel,
      headline: series.nextNote
        ? `개최 잠정 중단 (${series.nextNote})`
        : '개최 잠정 중단',
      expectedYear: null,
      expectedMonth: null,
      expectedDay: null,
      expectedEdition: inferredNextEdition,
      scheduledEventId: null,
      scheduledEventTitle: null,
      hostCountry: series.nextHostCountry ?? null,
      location: series.nextLocation ?? null,
      note: series.nextNote ?? null,
      monthsUntil: null,
      prefill: basePrefill(null, null, inferredNextEdition),
    }
  }

  // 3) 미래 예정 사건(Event)이 이미 등록되어 있는 경우 — 가장 확실한 정본
  const futureEditions = ordered.filter((ed) => isFutureEdition(ed, ref))
  if (futureEditions.length > 0) {
    const nextEv = futureEditions[0]
    const sy = signedYearOfEdition(nextEv)
    const sm =
      nextEv.startDatePrecision === 'year' ? null : (nextEv.startMonth ?? null)
    const sd =
      nextEv.startDatePrecision === 'year' ||
      nextEv.startDatePrecision === 'month'
        ? null
        : (nextEv.startDay ?? null)
    const monthsUntil =
      sy != null
        ? (sy - ref.year) * 12 + ((sm ?? series.typicalMonth ?? 6) - ref.month)
        : null
    const edBadge = formatSeriesEditionBadge(nextEv)
    const placeText = [
      nextEv.hostCountry?.name ?? series.nextHostCountry?.name,
      nextEv.location ?? series.nextLocation,
    ]
      .filter(Boolean)
      .join(' · ')
    const whenText = formatExpectedPoint(sy, sm, sd, false)
    return {
      kind: 'SCHEDULED_EVENT',
      cadenceLabel,
      headline: `다음${edBadge ? ` ${edBadge}` : ''}: ${whenText} 예정${placeText ? ` · ${placeText}` : ''}`,
      expectedYear: sy,
      expectedMonth: sm,
      expectedDay: sd,
      expectedEdition: nextEv.seriesEdition ?? inferredNextEdition,
      scheduledEventId: nextEv.id,
      scheduledEventTitle: nextEv.title,
      hostCountry: nextEv.hostCountry ?? series.nextHostCountry ?? null,
      location: nextEv.location ?? series.nextLocation ?? null,
      note: series.nextNote ?? null,
      monthsUntil,
      prefill: basePrefill(sy, sm, inferredNextEdition),
    }
  }

  const nextState = series.nextScheduleState ?? 'AUTO'

  // 4) 연기 명시(POSTPONED)
  if (nextState === 'POSTPONED') {
    const origWhen = series.nextYear
      ? ` (당초 ${formatExpectedPoint(series.nextYear, series.nextMonth ?? null, series.nextDay ?? null, false)})`
      : ''
    return {
      kind: 'POSTPONED',
      cadenceLabel,
      headline: `차기 회의 연기됨${origWhen}`,
      expectedYear: series.nextYear ?? null,
      expectedMonth: series.nextMonth ?? null,
      expectedDay: series.nextDay ?? null,
      expectedEdition: inferredNextEdition,
      scheduledEventId: null,
      scheduledEventTitle: null,
      hostCountry: series.nextHostCountry ?? null,
      location: series.nextLocation ?? null,
      note: series.nextNote ?? null,
      monthsUntil: null,
      prefill: basePrefill(
        series.nextYear ?? null,
        series.nextMonth ?? null,
        inferredNextEdition,
      ),
    }
  }

  // 5) 공식 확정 오버라이드(CONFIRMED) 또는 미래 nextYear 명시
  if (
    nextState === 'CONFIRMED' ||
    (nextState === 'AUTO' && series.nextYear != null && series.nextYear >= ref.year)
  ) {
    const y = series.nextYear ?? null
    const m = series.nextMonth ?? series.typicalMonth ?? null
    const d = series.nextDay ?? null
    const monthsUntil =
      y != null ? (y - ref.year) * 12 + ((m ?? 6) - ref.month) : null
    const edText = inferredNextEdition ? ` 제${inferredNextEdition}차` : ''
    const placeText = [series.nextHostCountry?.name, series.nextLocation]
      .filter(Boolean)
      .join(' · ')
    return {
      kind: 'CONFIRMED',
      cadenceLabel,
      headline: `다음${edText}: ${formatExpectedPoint(y, m, d, false)} 예정${placeText ? ` · ${placeText}` : ''}`,
      expectedYear: y,
      expectedMonth: m,
      expectedDay: d,
      expectedEdition: inferredNextEdition,
      scheduledEventId: null,
      scheduledEventTitle: null,
      hostCountry: series.nextHostCountry ?? null,
      location: series.nextLocation ?? null,
      note: series.nextNote ?? null,
      monthsUntil,
      prefill: basePrefill(y, m, inferredNextEdition),
    }
  }

  // 6) 미정 명시(TBD) 또는 부정기(IRREGULAR)
  if (
    nextState === 'TBD' ||
    series.cadenceKind === 'IRREGULAR' ||
    !series.intervalMonths ||
    series.intervalMonths <= 0
  ) {
    return {
      kind: 'TBD',
      cadenceLabel,
      headline:
        series.cadenceKind === 'IRREGULAR'
          ? '부정기 개최 (차기 일정 미정)'
          : '차기 개최 일정 미정',
      expectedYear: null,
      expectedMonth: null,
      expectedDay: null,
      expectedEdition: inferredNextEdition,
      scheduledEventId: null,
      scheduledEventTitle: null,
      hostCountry: series.nextHostCountry ?? null,
      location: series.nextLocation ?? null,
      note: series.nextNote ?? null,
      monthsUntil: null,
      prefill: basePrefill(null, series.typicalMonth ?? null, inferredNextEdition),
    }
  }

  // 7) 주기 기반 자동 추산 — 특별회의(seriesEdition=null & 라벨만 있는 비정규 회의)를 제외한 가장 최근 정규 회차 우선
  const pastOrCurrent = ordered.filter(
    (ed) => signedYearOfEdition(ed) != null && !isFutureEdition(ed, ref),
  )
  const regularAnchors = pastOrCurrent.filter(
    (ed) =>
      ed.seriesEdition != null ||
      !ed.seriesEditionLabel ||
      /\d/.test(ed.seriesEditionLabel),
  )
  const lastAnchor =
    regularAnchors[regularAnchors.length - 1] ??
    pastOrCurrent[pastOrCurrent.length - 1] ??
    null

  if (!lastAnchor) {
    const firstRotatedHost = inferRotationHostCountry(series, [], false)
    const effectiveHost = series.nextHostCountry ?? firstRotatedHost ?? null
    const hostCountryIsEstimated = Boolean(!series.nextHostCountry && firstRotatedHost)
    return {
      kind: 'TBD',
      cadenceLabel,
      headline: `등록된 회차 없음 (${cadenceLabel} 기준 첫 회차 등록 후 차기 자동 계산)${
        hostCountryIsEstimated && effectiveHost
          ? ` · 순번 의장국 ${effectiveHost.name} 예상`
          : ''
      }`,
      expectedYear: null,
      expectedMonth: series.typicalMonth ?? null,
      expectedDay: null,
      expectedEdition: inferredNextEdition ?? 1,
      scheduledEventId: null,
      scheduledEventTitle: null,
      hostCountry: effectiveHost,
      hostCountryIsEstimated,
      location: series.nextLocation ?? null,
      note: series.nextNote ?? null,
      monthsUntil: null,
      prefill: basePrefill(
        ref.year,
        series.typicalMonth ?? null,
        inferredNextEdition ?? 1,
        series.nextLocation ?? null,
        effectiveHost?.id ?? null,
      ),
    }
  }

  const lastYear = signedYearOfEdition(lastAnchor)!
  const lastMonthKnown =
    lastAnchor.startDatePrecision !== 'year' && lastAnchor.startMonth != null
      ? lastAnchor.startMonth
      : null
  const interval = series.intervalMonths
  let expectedYear: number
  let expectedMonth: number | null

  if (
    interval === 6 &&
    series.typicalMonth != null &&
    series.typicalMonthSecondary != null
  ) {
    const [m1, m2] =
      series.typicalMonth <= series.typicalMonthSecondary
        ? [series.typicalMonth, series.typicalMonthSecondary]
        : [series.typicalMonthSecondary, series.typicalMonth]
    const midpoint = (m1 + m2) / 2
    if (lastMonthKnown != null && lastMonthKnown < midpoint) {
      expectedYear = lastYear
      expectedMonth = m2
    } else {
      expectedYear = lastYear + 1
      expectedMonth = m1
    }
  } else if (interval % 12 === 0) {
    expectedYear = lastYear + interval / 12
    expectedMonth = series.typicalMonth ?? lastMonthKnown ?? null
  } else {
    const anchorMonth = lastMonthKnown ?? series.typicalMonth ?? 6
    const totalMonths = lastYear * 12 + (anchorMonth - 1) + interval
    expectedYear = Math.floor(totalMonths / 12)
    expectedMonth = (totalMonths % 12) + 1
    if (expectedMonth <= 0) {
      expectedMonth += 12
      expectedYear -= 1
    }
  }

  const sameChairYear = interval === 6 && expectedYear === lastYear
  const rotatedHost = inferRotationHostCountry(
    series,
    regularAnchors,
    sameChairYear,
  )
  const effectiveHost = series.nextHostCountry ?? rotatedHost ?? null
  const hostCountryIsEstimated = Boolean(!series.nextHostCountry && rotatedHost)

  const isOverdue =
    expectedMonth != null
      ? expectedYear < ref.year ||
        (expectedYear === ref.year && expectedMonth < ref.month)
      : expectedYear < ref.year

  const monthsUntil =
    expectedMonth != null
      ? (expectedYear - ref.year) * 12 + (expectedMonth - ref.month)
      : (expectedYear - ref.year) * 12

  const edText = inferredNextEdition ? ` 제${inferredNextEdition}차` : ''
  const hostLabel = effectiveHost
    ? hostCountryIsEstimated
      ? `순번 의장국 ${effectiveHost.name}`
      : effectiveHost.name
    : null
  const placeText = [hostLabel, series.nextLocation]
    .filter(Boolean)
    .join(' · ')

  if (isOverdue) {
    const lastWhen = formatExpectedPoint(lastYear, lastMonthKnown, null, false)
    const dueWhen = formatExpectedPoint(expectedYear, expectedMonth, null, true)
    return {
      kind: 'OVERDUE',
      cadenceLabel,
      headline: `${dueWhen}${edText} 회차 미등록 (${cadenceLabel} · 마지막 기록 ${lastWhen})${placeText ? ` · ${placeText}` : ''}`,
      expectedYear,
      expectedMonth,
      expectedDay: null,
      expectedEdition: inferredNextEdition,
      scheduledEventId: null,
      scheduledEventTitle: null,
      hostCountry: effectiveHost,
      hostCountryIsEstimated,
      location: series.nextLocation ?? null,
      note: series.nextNote ?? null,
      monthsUntil,
      prefill: basePrefill(
        expectedYear,
        expectedMonth,
        inferredNextEdition,
        series.nextLocation ?? null,
        effectiveHost?.id ?? null,
      ),
    }
  }

  const expectedWhen = formatExpectedPoint(expectedYear, expectedMonth, null, true)
  return {
    kind: 'ESTIMATED',
    cadenceLabel,
    headline: `다음${edText}: ${expectedWhen} 예상 (${cadenceLabel})${placeText ? ` · ${placeText}` : ''}`,
    expectedYear,
    expectedMonth,
    expectedDay: null,
    expectedEdition: inferredNextEdition,
    scheduledEventId: null,
    scheduledEventTitle: null,
    hostCountry: effectiveHost,
    hostCountryIsEstimated,
    location: series.nextLocation ?? null,
    note: series.nextNote ?? null,
    monthsUntil,
    prefill: basePrefill(
      expectedYear,
      expectedMonth,
      inferredNextEdition,
      series.nextLocation ?? null,
      effectiveHost?.id ?? null,
    ),
  }
}
