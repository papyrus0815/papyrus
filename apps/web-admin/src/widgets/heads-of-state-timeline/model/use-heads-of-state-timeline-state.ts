import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { notify } from '@/shared/ui/toast'

import { usePinnedRows } from './use-pinned-rows'
import { useCountryOptions } from './use-country-options'
import {
  mergeUrlPinRows,
  parsePinsParam,
  parseRangeParam,
  parseYearParam,
} from './url-pins'
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

/** URL `?year=` 진입 — 사건·인물 상세에서 자동 가이드라인 (파서는 url-pins.ts 순수 모듈) */
function readYearFromUrl(): number | null {
  if (typeof window === 'undefined') return null
  try {
    return parseYearParam(new URLSearchParams(window.location.search).get('year'))
  } catch {
    return null
  }
}

/** URL `?range=` (예: `?range=1500-2030`) 진입 */
function readRangeFromUrl(): YearRange | null {
  if (typeof window === 'undefined') return null
  try {
    return parseRangeParam(new URLSearchParams(window.location.search).get('range'))
  } catch {
    return null
  }
}

/** URL `?pins=` (예: `?pins=C:abc+H:def,C:ghi`) — 콤마=행, 플러스=행 안의 segment */
function readPinsFromUrl(): string[][] | null {
  if (typeof window === 'undefined') return null
  try {
    return parsePinsParam(new URLSearchParams(window.location.search).get('pins'))
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
  const { options, isComplete: optionsComplete } = useCountryOptions(true)

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

  /**
   * URL(?year/?range)이 시간축을 결정한 세션인지 — true인 동안은 (a) 범위를
   * localStorage에 영속하지 않고(호기심 딥링크 방문이 저장 범위를 덮지 않도록),
   * (b) 첫 핀 자동 fit을 보류한다(딥링크가 잡아둔 시대를 유지).
   * 사용자가 범위를 직접 조작하거나 보드를 비우면 해제 — 이후는 평소처럼 동작.
   */
  const urlRangeActiveRef = useRef(
    initialUrlYear != null || initialUrlRange != null,
  )

  /** 사용자 주도 범위 변경 — URL 세션 모드를 해제하고 영속화를 재개한다 */
  const setRangeByUser = useCallback(
    (next: YearRange | ((prev: YearRange) => YearRange)) => {
      urlRangeActiveRef.current = false
      setRange(next)
    },
    [],
  )

  // range 영속화 — 줌 슬라이더 드래그 같은 빈번 변경엔 throttle 적용.
  // URL이 잡아둔 범위는 영속하지 않는다 (딥링크 방문이 저장 범위를 덮지 않도록).
  useEffect(() => {
    if (urlRangeActiveRef.current) return
    const handle = window.setTimeout(() => writeRangeStorage(range), 300)
    return () => window.clearTimeout(handle)
  }, [range])

  // URL pins로 진입한 경우 한 번 핀 적용 (옵션 fetch 후) —
  // 보드가 비어있으면 교체, 이미 핀이 있으면 dedup 병합-추가
  const urlPinsAppliedRef = useRef(false)
  // 적용 완료를 렌더에도 반영 (ref는 재렌더를 못 일으킴 — 스피너 해제용)
  const [urlPinsSettled, setUrlPinsSettled] = useState(false)
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
    // isLoading이 아니라 isComplete 게이트 — 한쪽 소스(예: 역사국가)가 에러로 끝나면
    // isLoading=false지만 옵션이 불완전해, 멀쩡한 핀을 "미존재"로 오판해 드랍한다.
    if (!optionsComplete) return
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
          // 세션 한정 — localStorage 미저장 (딥링크 방문이 저장 보드를 영구 변경하지 않도록)
          transient: true,
        })
      }
    }

    // 링크가 가리킨 국가를 찾지 못했으면(삭제·환경 불일치) 조용히 사라지지 않게 알림
    const requestedCount = initialUrlPins.reduce(
      (acc, group) => acc + group.length,
      0,
    )
    const resolvedCount = nextRows.reduce(
      (acc, row) => acc + row.segments.length,
      0,
    )
    if (resolvedCount < requestedCount) {
      notify.warning(
        `링크의 국가 ${requestedCount - resolvedCount}곳을 찾을 수 없어 제외했습니다`,
      )
    }

    const mergedRows = mergeUrlPinRows(pinned.rows, nextRows)
    if (mergedRows) pinned.replaceAll(mergedRows)
    urlPinsAppliedRef.current = true
    // ref만 세우면 재렌더가 없어 — 핀을 하나도 못 얹은 경우 스피너가 5초 타임아웃까지
    // 남는다. state로도 완료를 알려 즉시 EmptyHero/보드로 전환.
    setUrlPinsSettled(true)
  }, [initialUrlPins, options, optionsComplete, pinned])

  // 옵션 fetch 후 unknown countryId / 이름·국기 변경분 reconcile
  const reconciledRef = useRef(false)
  useEffect(() => {
    if (reconciledRef.current) return
    // isComplete 게이트 필수 — 역사국가 fetch가 일시 실패한 상태에서 reconcile이 돌면
    // 저장된 역사 핀 전부를 "미존재 국가"로 오판해 영구 삭제한다.
    if (!optionsComplete) return
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
  }, [options, optionsComplete, pinned])

  /** 처음 비어있다가 첫 행이 들어올 때만 자동 fit — 이후엔 사용자 조작을 존중.
   *  URL이 시대를 잡아둔 동안(urlRangeActiveRef)은 보류 — 딥링크 컨텍스트 유지. */
  const addRow = useCallback(
    (segment: Omit<PinnedSegment, 'segmentId'>) => {
      const wasEmpty = pinned.rows.length === 0
      pinned.addRow(segment)
      if (wasEmpty && !urlRangeActiveRef.current) {
        setRange(rangeForFirstSegment(segment))
      }
    },
    [pinned],
  )

  /** 다중 추가 — N개의 union lifespan으로 자동 fit */
  const addManyRows = useCallback(
    (segments: Omit<PinnedSegment, 'segmentId'>[]) => {
      const wasEmpty = pinned.rows.length === 0
      segments.forEach(pinned.addRow)
      if (wasEmpty && segments.length > 0 && !urlRangeActiveRef.current) {
        const fit = rangeForManySegments(segments)
        if (fit) setRange(fit)
      }
    },
    [pinned],
  )

  /** 보드 비우기 — URL 세션 모드도 함께 해제해, 이후 첫 핀부터는 평소처럼
   *  자동 fit·범위 영속화가 동작한다 (딥링크로 온 시대에 갇히지 않도록). */
  const clearAll = useCallback(() => {
    urlRangeActiveRef.current = false
    pinned.clearAll()
  }, [pinned])

  /** URL `?pins=`로 진입한 직후, 옵션 fetch가 완료되기 전엔 EmptyHero 대신 skeleton을 보여줄 수 있도록 알림.
   *  5초 timeout 후엔 폴백 — fetch 가 영원히 안 끝나도 EmptyHero 노출. */
  const isApplyingUrlPins =
    !urlPinsSettled &&
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
    clearAll,
    range,
    setRange: setRangeByUser,
    highlightYear,
    setHighlightYear,
    isApplyingUrlPins,
  }
}

export { rowsToPinsParam }
