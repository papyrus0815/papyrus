import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { usePinnedRows } from './use-pinned-rows'
import { useCountryOptions } from './use-country-options'
import type { PinnedRow, PinnedSegment, YearRange } from './types'

const DEFAULT_RANGE: YearRange = { startYear: 1500, endYear: 2030 }
const MODERN_FALLBACK_RANGE: YearRange = { startYear: 1900, endYear: 2030 }
const NOW_YEAR = new Date().getFullYear()
const RANGE_PADDING_RATIO = 0.12
const MIN_SPAN = 30

const RANGE_KEY = 'heads-of-state-timeline:range:v1'

function readRangeStorage(): YearRange | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(RANGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (
      parsed &&
      typeof parsed.startYear === 'number' &&
      typeof parsed.endYear === 'number' &&
      parsed.endYear > parsed.startYear
    ) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

function writeRangeStorage(range: YearRange) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(RANGE_KEY, JSON.stringify(range))
  } catch {
    // ignore quota/private mode
  }
}

/** URL `?year=` 진입 — 사건 상세에서 자동 가이드라인 */
function readYearFromUrl(): number | null {
  if (typeof window === 'undefined') return null
  try {
    const params = new URLSearchParams(window.location.search)
    const raw = params.get('year')
    if (!raw) return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

/** URL `?range=` (예: `?range=1500-2030`) 진입 */
function readRangeFromUrl(): YearRange | null {
  if (typeof window === 'undefined') return null
  try {
    const params = new URLSearchParams(window.location.search)
    const raw = params.get('range')
    if (!raw) return null
    const m = raw.match(/^(-?\d{1,5})\s*[-_~]\s*(-?\d{1,5})$/)
    if (!m) return null
    const a = parseInt(m[1]!, 10)
    const b = parseInt(m[2]!, 10)
    if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return null
    return { startYear: a, endYear: b }
  } catch {
    return null
  }
}

/** URL `?pins=` (예: `?pins=C:abc+H:def,C:ghi`) — 콤마=행, 플러스=행 안의 segment */
function readPinsFromUrl(): string[][] | null {
  if (typeof window === 'undefined') return null
  try {
    const params = new URLSearchParams(window.location.search)
    const raw = params.get('pins')
    if (!raw) return null
    const groups = raw.split(',').map((g) => g.split('+').filter(Boolean))
    return groups.filter((g) => g.length > 0)
  } catch {
    return null
  }
}

function rowsToPinsParam(rows: PinnedRow[]): string {
  return rows
    .map((r) =>
      r.segments
        .map((s) => `${s.kind === 'COUNTRY' ? 'C' : 'H'}:${s.countryId}`)
        .join('+'),
    )
    .join(',')
}

/** 첫 핀에 맞춰 시간축 자동 fit — 역사 국가는 lifespan, 현대 국가는 1900-현재+5 */
function rangeForFirstSegment(
  segment: Omit<PinnedSegment, 'segmentId'>,
): YearRange {
  if (segment.kind === 'COUNTRY') return MODERN_FALLBACK_RANGE
  const start = segment.lifespanStartYear
  const end = segment.lifespanEndYear ?? NOW_YEAR
  if (start == null) return DEFAULT_RANGE
  const span = Math.max(50, end - start)
  const pad = Math.round(span * RANGE_PADDING_RATIO)
  return {
    startYear: start - pad,
    endYear: end + pad,
  }
}

/** N개 segment의 union lifespan을 fit — 미상 endYear는 NOW_YEAR로 대체 */
function rangeForManySegments(
  segments: Omit<PinnedSegment, 'segmentId'>[],
): YearRange | null {
  let lo: number | null = null
  let hi: number | null = null
  let hasModern = false
  for (const s of segments) {
    if (s.kind === 'COUNTRY') {
      hasModern = true
      continue
    }
    if (s.lifespanStartYear != null) {
      lo = lo == null ? s.lifespanStartYear : Math.min(lo, s.lifespanStartYear)
    }
    const end = s.lifespanEndYear ?? NOW_YEAR
    hi = hi == null ? end : Math.max(hi, end)
  }
  if (lo == null && !hasModern) return null
  if (lo == null) {
    return MODERN_FALLBACK_RANGE
  }
  const top = hasModern ? Math.max(hi ?? NOW_YEAR, NOW_YEAR) : (hi ?? NOW_YEAR)
  const span = Math.max(MIN_SPAN, top - lo)
  const pad = Math.round(span * RANGE_PADDING_RATIO)
  return { startYear: lo - pad, endYear: top + pad }
}

/**
 * 페이지 전체 상태 — 핀 행, 시간축 범위, 가이드라인 강조 연도.
 *
 * 우선순위 (높을수록 강함):
 *  - URL `?range=` / `?pins=` / `?year=`
 *  - localStorage (range, pins)
 *  - 기본값
 *
 * 처음 핀이 0개인 상태에서 첫 핀(또는 다중 핀)이 추가되면 그 lifespan에 맞춰 시간축을 자동 줌한다 —
 * 그 후엔 사용자 조작을 존중해 자동 줌이 다시 트리거되지 않는다.
 */
export function useHeadsOfStateTimelineState() {
  const pinned = usePinnedRows()
  const { options, isLoading: optionsLoading } = useCountryOptions(true)

  const initialUrlYear = useMemo(() => readYearFromUrl(), [])
  const initialUrlRange = useMemo(() => readRangeFromUrl(), [])
  const initialUrlPins = useMemo(() => readPinsFromUrl(), [])

  const [range, setRange] = useState<YearRange>(() => {
    if (initialUrlRange) return initialUrlRange
    if (initialUrlYear != null) {
      return { startYear: initialUrlYear - 80, endYear: initialUrlYear + 30 }
    }
    return readRangeStorage() ?? DEFAULT_RANGE
  })
  const [highlightYear, setHighlightYear] = useState<number | null>(initialUrlYear)

  // range 영속화 — 줌 슬라이더 드래그 같은 빈번 변경엔 throttle 적용
  useEffect(() => {
    const handle = window.setTimeout(() => writeRangeStorage(range), 300)
    return () => window.clearTimeout(handle)
  }, [range])

  // URL pins로 진입한 경우 한 번 핀 적용 (옵션 fetch 후)
  const urlPinsAppliedRef = useRef(false)
  // 옵션 fetch가 무한히 안 끝나는 (오프라인·서버 다운) 케이스 대비 — 5초 후엔 EmptyHero로 폴백
  const [urlPinsTimedOut, setUrlPinsTimedOut] = useState(false)
  useEffect(() => {
    if (!initialUrlPins || initialUrlPins.length === 0) return
    const handle = window.setTimeout(() => setUrlPinsTimedOut(true), 5000)
    return () => window.clearTimeout(handle)
  }, [initialUrlPins])
  useEffect(() => {
    if (urlPinsAppliedRef.current) return
    if (!initialUrlPins || initialUrlPins.length === 0) {
      urlPinsAppliedRef.current = true
      return
    }
    if (optionsLoading) return
    if (options.length === 0) return

    const findOpt = (token: string) => {
      const m = token.match(/^([CH]):(.+)$/)
      if (!m) return null
      const kind = m[1] === 'C' ? 'COUNTRY' : 'HISTORICAL'
      const id = m[2]!
      return options.find((o) => o.kind === kind && o.countryId === id) ?? null
    }

    const nextRows: PinnedRow[] = []
    for (const group of initialUrlPins) {
      const segs = group
        .map(findOpt)
        .filter((o): o is NonNullable<ReturnType<typeof findOpt>> => o != null)
        .map((opt) => ({
          segmentId: `s${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`,
          kind: opt.kind,
          countryId: opt.countryId,
          name: opt.name,
          flagEmoji: opt.flagEmoji,
          lifespanStartYear: opt.lifespanStartYear,
          lifespanEndYear: opt.lifespanEndYear,
        }))
      if (segs.length > 0) {
        nextRows.push({
          rowId: `r${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`,
          segments: segs,
        })
      }
    }

    if (nextRows.length > 0 && pinned.rows.length === 0) {
      pinned.replaceAll(nextRows)
    }
    urlPinsAppliedRef.current = true
  }, [initialUrlPins, options, optionsLoading, pinned])

  // 옵션 fetch 후 unknown countryId / 이름·국기 변경분 reconcile
  const reconciledRef = useRef(false)
  useEffect(() => {
    if (reconciledRef.current) return
    if (optionsLoading) return
    if (options.length === 0) return
    const optMap = new Map(
      options.map((o) => [`${o.kind}:${o.countryId}`, o] as const),
    )
    pinned.reconcile(
      (kind, countryId) => optMap.has(`${kind}:${countryId}`),
      (s) => {
        const o = optMap.get(`${s.kind}:${s.countryId}`)
        if (!o) return {}
        return {
          name: o.name,
          flagEmoji: o.flagEmoji,
          lifespanStartYear: o.lifespanStartYear,
          lifespanEndYear: o.lifespanEndYear,
        }
      },
    )
    reconciledRef.current = true
  }, [options, optionsLoading, pinned])

  /** 처음 비어있다가 첫 행이 들어올 때만 자동 fit — 이후엔 사용자 조작을 존중 */
  const addRow = useCallback(
    (segment: Omit<PinnedSegment, 'segmentId'>) => {
      const wasEmpty = pinned.rows.length === 0
      pinned.addRow(segment)
      if (wasEmpty && initialUrlYear == null && initialUrlRange == null) {
        setRange(rangeForFirstSegment(segment))
      }
    },
    [pinned, initialUrlYear, initialUrlRange],
  )

  /** 다중 추가 — N개의 union lifespan으로 자동 fit */
  const addManyRows = useCallback(
    (segments: Omit<PinnedSegment, 'segmentId'>[]) => {
      const wasEmpty = pinned.rows.length === 0
      segments.forEach(pinned.addRow)
      if (
        wasEmpty &&
        segments.length > 0 &&
        initialUrlYear == null &&
        initialUrlRange == null
      ) {
        const fit = rangeForManySegments(segments)
        if (fit) setRange(fit)
      }
    },
    [pinned, initialUrlYear, initialUrlRange],
  )

  /** URL `?pins=`로 진입한 직후, 옵션 fetch가 완료되기 전엔 EmptyHero 대신 skeleton을 보여줄 수 있도록 알림.
   *  5초 timeout 후엔 폴백 — fetch 가 영원히 안 끝나도 EmptyHero 노출. */
  const isApplyingUrlPins =
    !urlPinsAppliedRef.current &&
    !urlPinsTimedOut &&
    initialUrlPins != null &&
    initialUrlPins.length > 0

  return {
    rows: pinned.rows,
    addRow,
    addManyRows,
    removeRow: pinned.removeRow,
    moveRow: pinned.moveRow,
    reorderRow: pinned.reorderRow,
    restoreRowAt: pinned.restoreRowAt,
    addSegmentToRow: pinned.addSegmentToRow,
    removeSegmentFromRow: pinned.removeSegmentFromRow,
    clearAll: pinned.clearAll,
    range,
    setRange,
    highlightYear,
    setHighlightYear,
    isApplyingUrlPins,
  }
}

export { rowsToPinsParam }
