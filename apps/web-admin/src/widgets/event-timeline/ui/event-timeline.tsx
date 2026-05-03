/**
 * Event Timeline Widget — 가로 타임라인 메인 뷰 (v3)
 * FSD: widgets/event-timeline/ui
 *
 * 디자인 원칙
 *  - 역사는 (시간 × 카테고리)의 2차원 객체. 카드 리스트가 못 보여주는
 *    "동시대성·기간·밀도"를 막대 길이/색/굵기로 시각화한다.
 *
 * 인코딩
 *  - 색         = 카테고리
 *  - 길이       = 기간 (단발성 minWidth=6px)
 *  - 높이       = importance (44/36/28/28)
 *  - 좌측 wedge = critical/major (색맹 보조 — WCAG 1.4.1)
 *  - dashed border = notable (normal과 시각 차등)
 *  - active outline = 선택 시 별도 rect (stroke center-align 회피)
 *  - focus outline = 키보드 포커스만 했을 때도 시각 단서 (rule #7)
 *
 * 인터랙션
 *  - Ctrl/⌘+휠 → 줌 (포인터 위치 중심), +/- 버튼, 100% 클릭 → 1× 복귀
 *  - Space+드래그 또는 미들 클릭 드래그 → panning
 *    (Bar focus 중에는 Space는 선택용으로 동작 — 충돌 회피)
 *  - 키보드: Tab → 막대 포커스, Enter/Space → 선택, ←/→ → 같은 lane 시간순 이동
 *  - Minimap: 클릭/드래그 → 그 시기로 이동 (pointer 통합)
 *  - Legend 클릭 → 해당 카테고리 hide/show 토글 (사용자 정의 필터)
 *  - "오늘" 마커, viewport 연도 readout, export(JSON/SVG) 메뉴
 *
 * 성능
 *  - viewport culling — 화면 밖 막대 skip (1000건+ 안전)
 *  - 첫 페인트 culling — viewport null이어도 첫 화면 추정 범위로 culling
 *  - scroll throttle — requestAnimationFrame 1회
 *  - ticks max 200개 cap — 먼 시간 범위 freeze 방지
 *  - SVG 첫 measure 전 렌더 보류 — CLS 0
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import styled, { css, keyframes } from 'styled-components'

import { getCategoryName } from '@/features/event-list/lib'
import type { EventCategoryDto } from '@/shared/api/event-categories'

import { LEDGER_CATEGORY, resolveCategory } from '../../../pages/events/ledger/styles/ledger-tokens'
import { BRAND, MOTION } from '../../../pages/events/styles/theme'
import type {
  EventHierarchyNode,
  HistoricalEvent,
} from '../../../pages/events/create/events.types'

// ─────────────────────────────────────────────────────────────────────────────
// types
// ─────────────────────────────────────────────────────────────────────────────

interface FlatItem {
  node: EventHierarchyNode
  depth: number
  parentEvent: HistoricalEvent | null
}

interface EventTimelineProps {
  flattenedHierarchy: FlatItem[]
  events: HistoricalEvent[]
  selectedEventId: string | null
  dbCategories: EventCategoryDto[]
  onSelectEvent: (id: string) => void
}

interface BarData {
  id: string
  title: string
  category: string
  importance: 'critical' | 'major' | 'notable' | 'normal'
  startYear: number
  endYear: number
  startDate: string
  endDate: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// constants
// ─────────────────────────────────────────────────────────────────────────────

const LANE_HEIGHT = 72
const LANE_LABEL_WIDTH = 115
const TOP_AXIS_HEIGHT = 40
const PIXELS_PER_YEAR_DEFAULT = 24
const MIN_BAR_WIDTH = 6
const TIMELINE_BOTTOM_PAD = 20

const ZOOM_MIN = 0.5
/**
 * 최대 줌 — 짧은 사건(예: 1~2개월짜리)도 본문 라벨이 잘리지 않고 들어갈 만큼
 * 충분한 폭이 필요. 400%로는 부족했음.
 */
const ZOOM_MAX = 16
const ZOOM_STEP = 1.4

/**
 * 짧은 사건 인코딩 임계값.
 *   - 의미적 폭 < SHORT_BAR_PX → milestone(다이아몬드)로 표시
 *   - milestone 간 거리 < CLUSTER_GAP_PX 이고 같은 lane이면 클러스터 chip
 *   - 외부 라벨은 다음 milestone/막대까지 거리 ≥ EXT_LABEL_MIN_GAP 일 때만 표시
 */
const SHORT_BAR_PX = 8
const CLUSTER_GAP_PX = 5
const CLUSTER_MIN_COUNT = 5
const EXT_LABEL_MIN_GAP = 60
/**
 * 외부 라벨 최대 폭 — 이전 140은 한국어 12자 안팎까지밖에 못 담아 긴 타이틀
 * (예: "1872년 긴자 대화재 (메이지 대화재)") 다수가 잘렸다. 220으로 상향 →
 * 약 18~20자(CJK)까지 노출. fit-to-width 계산도 이 값에 맞춰 우측 padding
 * 자동 보정.
 */
const EXT_LABEL_MAX_WIDTH = 220

const IMPORTANCE_BAR_HEIGHT: Record<BarData['importance'], number> = {
  critical: 44,
  major: 36,
  notable: 28,
  normal: 28,
}

/**
 * Bar row stacking — 같은 lane에서 시간 겹친 bar들을 row 단위로 분리해 모두 보이게.
 *  - MAX_BAR_ROWS: lane 안 최대 row 수. 4번째+는 "+N" overflow 배지로 노출.
 *  - ROW_DELTA: row 간 y 간격(px). LANE_HEIGHT(72) 안에서 3 row가 여유롭게 들어가도록.
 *  - COMPACT_BAR_HEIGHT: stacking 활성 lane의 bar 높이(작게). 단일 row일 땐 원래 높이 유지.
 */
const MAX_BAR_ROWS = 3
const ROW_DELTA = 18
const COMPACT_BAR_HEIGHT: Record<BarData['importance'], number> = {
  critical: 14,
  major: 12,
  notable: 10,
  normal: 10,
}

/** Milestone 다이아몬드 반지름 — importance에 따라 차등 (critical 7 / major 6 / 그 외 5) */
const MILESTONE_RADIUS: Record<BarData['importance'], number> = {
  critical: 7,
  major: 6,
  notable: 5,
  normal: 5,
}
/** Cluster 다이아몬드 — importance와 무관, 묶음 표시용으로 약간 큼 */
const CLUSTER_RADIUS = 8
/**
 * 외부 라벨 최소 폭 — 이 값 미만이면 표시 자체를 보류.
 * CJK 한 글자 = 12px라 *의미 있는 표시 단위*는 3글자+ellipsis(≈ 40px) 이상.
 * 이전 24px은 한 글자만 잘리고 "…"가 붙는 무의미 라벨이 나와 시선 노이즈였음.
 */
const EXT_LABEL_MIN_WIDTH = 40

/**
 * Bar 안 라벨 표시 최소 폭. 이전 70 → 80으로 상향:
 *  - 라벨 내부 패딩(12~18px)을 빼면 실제 글자 영역이 ~58px → CJK 4자 한계,
 *    truncation이 거의 항상 발동되어 "이름…"으로 잘림.
 *  - 80px 이면 글자 영역 ≥ 62px → 5자 + ellipsis까지 안전.
 *  - 임계값 근처에서 zoom 시 inside↔outside 라벨 깜빡임도 자연 감소.
 */
const BAR_INSIDE_LABEL_MIN_PX = 80

// ─────────────────────────────────────────────────────────────────────────────
// RenderItem 타입 — 컴포넌트 외부 hoist (가독성)
// ─────────────────────────────────────────────────────────────────────────────

type RenderBar = {
  kind: 'bar'
  id: string
  bar: BarData
  x: number
  y: number
  w: number
  h: number
  showExternalLabel: boolean
  externalLabelWidth: number
}
type RenderMilestone = {
  kind: 'milestone'
  id: string
  bar: BarData
  cx: number
  cy: number
  r: number
  showExternalLabel: boolean
  externalLabelWidth: number
}
type RenderCluster = {
  kind: 'cluster'
  id: string
  bars: BarData[]
  cx: number
  cy: number
  r: number
  /** cluster 시기 범위 — fit-to-cluster 줌에 사용 */
  startYear: number
  endYear: number
  centerYear: number
  category: string
}
type RenderItem = RenderBar | RenderMilestone | RenderCluster

const IMPORTANCE_LABEL: Record<BarData['importance'], string> = {
  critical: '핵심',
  major: '주요',
  notable: '주목',
  normal: '일반',
}

/**
 * 카테고리 lane 순서 — DB의 EventCategory와 동기화된 LEDGER_CATEGORY(한글 키)
 * 기준. 이전엔 'military'/'political' 같은 영문 슬러그였는데, 실제 데이터의
 * `event.category`는 한글 이름('정치'/'전쟁/군사' 등)이라 매칭이 전혀 되지
 * 않아 모든 사건이 "기타"로 떨어지던 버그가 있었음.
 */
const KNOWN_CATEGORIES = Object.keys(LEDGER_CATEGORY) as Array<
  keyof typeof LEDGER_CATEGORY
>

/** 한글 카테고리 이름 → 색상(배지·바·milestone 공통). */
const categoryColor = (name: string): string => resolveCategory(name).color

/**
 * 글자 폭 가중치 — 라벨 font-size 10.5px·weight 600 기준 측정.
 * 이전엔 CJK 12px로 *과대* 잡아 truncation이 실제보다 1~2자 더 잘랐다.
 * 10.5로 낮춰 같은 막대 폭에 평균 1자 더 표시 → 의미 있는 글자 수 확보.
 */
const CJK_CHAR_PX = 10.5
const ASCII_CHAR_PX = 6
const CJK_RE = /[ㄱ-힣一-鿿]/

// ─────────────────────────────────────────────────────────────────────────────
// component
// ─────────────────────────────────────────────────────────────────────────────

export const EventTimeline: React.FC<EventTimelineProps> = ({
  flattenedHierarchy,
  events,
  selectedEventId,
  dbCategories,
  onSelectEvent,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const tooltipIdRef = useRef(`tl-tooltip-${Math.random().toString(36).slice(2, 9)}`)
  /**
   * ScrollHost는 bars.length>0 일 때만 렌더되므로 단순 useRef + useEffect로
   * ResizeObserver를 한 번만 붙이면 첫 마운트 때 ref가 null이라 영원히 미동작.
   * (events 비동기 로딩 → 처음엔 EmptyHint 렌더 → 후에 ScrollHost로 교체되지만
   *  useEffect는 [] deps라 다시 실행 X). callback ref로 ScrollHost가 DOM에 들어
   * 올 때마다 (재)attach 하도록 만든다. tab 전환 후 데이터가 보이던 증상의 원인.
   */
  const observerRef = useRef<ResizeObserver | null>(null)
  const attachScrollHost = useCallback((el: HTMLDivElement | null) => {
    observerRef.current?.disconnect()
    observerRef.current = null
    scrollRef.current = el
    if (!el) {
      setContainerSize({ width: 0, height: 0 })
      return
    }
    const obs = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect
      if (r) setContainerSize({ width: r.width, height: r.height })
    })
    obs.observe(el)
    observerRef.current = obs
  }, [])

  const [tooltip, setTooltip] = useState<{ x: number; y: number; bar: BarData } | null>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [zoom, setZoom] = useState(1)
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set())
  const [exportOpen, setExportOpen] = useState(false)
  const [focusedBarId, setFocusedBarId] = useState<string | null>(null)
  /** Bar에 포커스 있을 때 Space는 선택. 그 외엔 panning 토글로 사용. */
  const [spaceHeld, setSpaceHeld] = useState(false)
  /** prefers-reduced-motion 감지 — smooth scroll 분기 */
  const [reducedMotion, setReducedMotion] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])

  /* ── 컨테이너 크기 측정 ────────────────────────────────────────────────
   * ScrollHost가 DOM에 들어올 때 callback ref(`attachScrollHost`)에서 ResizeObserver
   * 를 (재)attach 하므로 별도 useEffect 불필요.
   * (이전 useEffect는 첫 마운트 시 ScrollHost가 EmptyHint로 가려져 ref=null이었던
   *  경우 다시 실행되지 않아 containerSize가 영원히 0인 버그가 있었음.)
   */

  // ── 막대 데이터 추출 ───────────────────────────────────────────────────
  const allBars = useMemo<BarData[]>(() => {
    const out: BarData[] = []
    const eventById = new Map(events.map((e) => [e.id, e]))

    for (const item of flattenedHierarchy) {
      if (item.depth !== 0) continue
      const node = item.node
      const root = eventById.get(node.id) ?? item.parentEvent
      if (!root) continue
      const startStr = node.period.start
      const endStr = node.period.end
      if (!startStr) continue
      const start = new Date(startStr)
      const end = endStr ? new Date(endStr) : start
      const startYear =
        start.getFullYear() + (start.getMonth() + start.getDate() / 31) / 12
      const endYear =
        end.getFullYear() + (end.getMonth() + end.getDate() / 31) / 12
      const importance = (node.importance as BarData['importance']) ?? 'normal'
      out.push({
        id: node.id,
        title: node.title,
        category: root.category || 'other',
        importance,
        startYear,
        endYear: Math.max(endYear, startYear),
        startDate: startStr,
        endDate: endStr ?? null,
      })
    }
    return out
  }, [flattenedHierarchy, events])

  /** 사용자가 legend로 hide한 카테고리는 막대/lane에서 제외 */
  const bars = useMemo(
    () => allBars.filter((b) => !hiddenCategories.has(b.category)),
    [allBars, hiddenCategories],
  )

  // ── 시간 범위 ───────────────────────────────────────────────────────────
  const { minYear, maxYear } = useMemo(() => {
    if (bars.length === 0) {
      const now = new Date().getFullYear()
      return { minYear: now - 10, maxYear: now }
    }
    let min = Infinity
    let max = -Infinity
    for (const b of bars) {
      if (b.startYear < min) min = b.startYear
      if (b.endYear > max) max = b.endYear
    }
    return { minYear: Math.floor(min - 1), maxYear: Math.ceil(max + 1) }
  }, [bars])

  const yearSpan = Math.max(1, maxYear - minYear)

  /** 데이터/범위 변경 시 zoom 자동 reset — 50년 → 1000년 등 큰 변화 후 압축 방지 */
  const prevSpanRef = useRef<number>(yearSpan)
  useEffect(() => {
    const prev = prevSpanRef.current
    // 2배 이상 변하면 reset
    if (prev > 0 && (yearSpan / prev > 2 || prev / yearSpan > 2)) {
      setZoom(1)
    }
    prevSpanRef.current = yearSpan
  }, [yearSpan])

  // ── 픽셀/연 환산 — fit-to-width × zoom (helper로 공유) ─────────────────
  const renderReady = containerSize.width > 0
  const computePxPerYear = useCallback(
    (forZoom: number, forSpan: number = yearSpan): number => {
      /**
       * fit-to-width 시 SVG 우측에 ExternalLabel(최대 EXT_LABEL_MAX_WIDTH+16)이
       * 위치할 공간을 추가로 비워둬야 마지막 데이터의 라벨이 잘리지 않으면서도
       * zoom=1 상태에서 가로 스크롤이 생기지 않는다.
       */
      const innerWidth = Math.max(
        0,
        containerSize.width - LANE_LABEL_WIDTH - 16 - (EXT_LABEL_MAX_WIDTH + 16),
      )
      const fit = innerWidth > 0 ? innerWidth / forSpan : PIXELS_PER_YEAR_DEFAULT
      const base = Math.max(fit, PIXELS_PER_YEAR_DEFAULT * 0.5)
      return base * forZoom
    },
    [containerSize.width, yearSpan],
  )
  const pixelsPerYear = useMemo(
    () => (renderReady ? computePxPerYear(zoom) : PIXELS_PER_YEAR_DEFAULT),
    [computePxPerYear, zoom, renderReady],
  )
  const timelineWidth = Math.ceil(yearSpan * pixelsPerYear)

  // ── 레인 ────────────────────────────────────────────────────────────────
  /**
   * lane key/label 모두 한글 카테고리 이름. 알려진(LEDGER_CATEGORY) 카테고리를
   * 정해진 순서로 먼저 깔고, 데이터에만 있는 미등록 카테고리는 뒤에 append.
   * dbCategories는 DB에서 받은 사용자 정의 카테고리 fallback 라벨용.
   */
  const lanes = useMemo<{ key: string; label: string }[]>(() => {
    const present = new Set(allBars.map((b) => b.category))
    const ordered: { key: string; label: string }[] = []
    const seen = new Set<string>()
    for (const name of KNOWN_CATEGORIES) {
      ordered.push({ key: name, label: name })
      seen.add(name)
    }
    for (const c of present) {
      if (seen.has(c)) continue
      ordered.push({
        key: c,
        label: dbCategories.find((d) => d.name === c)?.name ?? c,
      })
      seen.add(c)
    }
    return ordered
  }, [allBars, dbCategories])

  /** legend로 숨기지 않은 lane만 그리기 */
  const visibleLanes = useMemo(
    () => lanes.filter((l) => !hiddenCategories.has(l.key)),
    [lanes, hiddenCategories],
  )

  const laneIndex = useMemo(() => {
    const m = new Map<string, number>()
    visibleLanes.forEach((l, i) => m.set(l.key, i))
    return m
  }, [visibleLanes])

  const intrinsicHeight =
    TOP_AXIS_HEIGHT + visibleLanes.length * LANE_HEIGHT + TIMELINE_BOTTOM_PAD
  const totalHeight = Math.max(intrinsicHeight, containerSize.height)

  /**
   * SVG 우측 padding — 마지막 bar/milestone에 붙는 외부 라벨(ExternalLabel)이
   * 최대 EXT_LABEL_MAX_WIDTH(140) + 8(gap)만큼 bar 오른쪽으로 뻗어나가는데,
   * SVG width를 timelineWidth로만 잡으면 그 라벨이 우측에서 잘린다. 약간의
   * 여유를 두어 마지막 데이터의 라벨까지 모두 보이도록 한다.
   */
  const RIGHT_LABEL_PAD = EXT_LABEL_MAX_WIDTH + 16
  const svgWidth = LANE_LABEL_WIDTH + timelineWidth + RIGHT_LABEL_PAD

  // ── 연도 눈금 ───────────────────────────────────────────────────────────
  const ticks = useMemo(() => {
    let step = 1
    const px = pixelsPerYear
    if (px < 4) step = 50
    else if (px < 8) step = 20
    else if (px < 16) step = 10
    else if (px < 30) step = 5
    else step = 1

    const out: number[] = []
    const start = Math.ceil(minYear / step) * step
    const MAX_TICKS = 200
    let count = 0
    for (let y = start; y <= maxYear && count < MAX_TICKS; y += step) {
      out.push(y)
      count++
    }
    return out
  }, [minYear, maxYear, pixelsPerYear])

  // ── 10년 sparkline ──────────────────────────────────────────────────────
  const decadeBuckets = useMemo(() => {
    const map = new Map<number, { count: number; weight: number }>()
    for (const b of bars) {
      const decade = Math.floor(b.startYear / 10) * 10
      const cur = map.get(decade) ?? { count: 0, weight: 0 }
      cur.count += 1
      cur.weight +=
        b.importance === 'critical' ? 3 : b.importance === 'major' ? 2 : 1
      map.set(decade, cur)
    }
    const startDecade = Math.floor(minYear / 10) * 10
    const endDecade = Math.ceil(maxYear / 10) * 10
    const out: { decade: number; count: number; weight: number }[] = []
    for (let d = startDecade; d <= endDecade; d += 10) {
      const cur = map.get(d) ?? { count: 0, weight: 0 }
      out.push({ decade: d, ...cur })
    }
    return out
  }, [bars, minYear, maxYear])

  const maxBucketWeight = useMemo(
    () => Math.max(1, ...decadeBuckets.map((b) => b.weight)),
    [decadeBuckets],
  )

  const labelStep = useMemo<1 | 2 | 5>(() => {
    if (decadeBuckets.length <= 6) return 1
    if (decadeBuckets.length <= 14) return 2
    return 5
  }, [decadeBuckets.length])

  // ── viewport years 추적 (raf throttle) ─────────────────────────────────
  const [viewportYears, setViewportYears] = useState<{ start: number; end: number } | null>(null)
  const rafIdRef = useRef<number | null>(null)
  const updateViewport = useCallback(() => {
    if (rafIdRef.current != null) return
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null
      const el = scrollRef.current
      if (!el) return
      const visibleLeft = Math.max(0, el.scrollLeft - LANE_LABEL_WIDTH)
      const visibleRight = el.scrollLeft + el.clientWidth - LANE_LABEL_WIDTH
      const start = visibleLeft / pixelsPerYear + minYear
      const end = visibleRight / pixelsPerYear + minYear
      setViewportYears({
        start: Math.max(minYear, start),
        end: Math.min(maxYear, end),
      })
    })
  }, [pixelsPerYear, minYear, maxYear])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateViewport()
    el.addEventListener('scroll', updateViewport, { passive: true })
    return () => {
      el.removeEventListener('scroll', updateViewport)
      if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current)
    }
  }, [updateViewport, containerSize.width])

  // ── 휠 — Ctrl/⌘+휠은 줌, 그 외엔 deltaY를 가로 스크롤로 변환 ───────────────
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      const el = scrollRef.current
      if (!el) return

      // Ctrl/Meta + 휠 → 줌
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const rect = el.getBoundingClientRect()
        const pointerX = e.clientX - rect.left
        const pointerInTimeline = Math.max(0, pointerX - LANE_LABEL_WIDTH)
        const yearAtPointer =
          (el.scrollLeft + pointerInTimeline) / pixelsPerYear + minYear

        const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP
        const nextZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom * factor))
        if (nextZoom === zoom) return

        setZoom(nextZoom)
        requestAnimationFrame(() => {
          const el2 = scrollRef.current
          if (!el2) return
          const newPx = computePxPerYear(nextZoom)
          const newScrollLeft =
            (yearAtPointer - minYear) * newPx - pointerInTimeline
          el2.scrollLeft = Math.max(0, newScrollLeft)
        })
        return
      }

      /**
       * 일반 휠 → 가로 스크롤. 타임라인은 수평 흐름이 주축이라 마우스 휠을
       * 가로로 흐르게 한다. 단:
       *  - Shift+휠 / 트랙패드 가로 swipe(deltaX 우세) → 브라우저 네이티브에 맡김
       *  - 가로 overflow가 없으면(전체가 viewport에 fit) 가로 변환 의미 없음 — 패스
       *  - 세로 overflow가 있으면 세로 우선 — 휠은 그대로 vertical scroll
       */
      if (e.shiftKey) return
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      if (e.deltaY === 0) return

      const hasHScroll = el.scrollWidth > el.clientWidth + 1
      const hasVScroll = el.scrollHeight > el.clientHeight + 1
      if (!hasHScroll) return
      if (hasVScroll) return

      e.preventDefault()
      el.scrollLeft += e.deltaY
    },
    [zoom, pixelsPerYear, minYear, computePxPerYear],
  )

  const zoomBy = (factor: number) => {
    setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z * factor)))
  }
  const resetZoom = () => setZoom(1)

  // ── 드래그 패닝 (Space+드래그 또는 미들 버튼) ──────────────────────────
  const dragStateRef = useRef<{ startX: number; startScrollLeft: number } | null>(null)
  /** Bar에 포커스 있으면 Space는 panning 토글이 아닌 *선택*용으로 동작.
   *  여기서 일찍 return하면 spaceHeld가 켜지지 않아 충돌 회피. */
  const isBarFocused = focusedBarId != null

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Space: panning 모드 진입(Bar focus 시 *선택*용으로 양보).
      if (e.key === ' ') {
        if (isInEditableElement(e.target)) return
        if (isBarFocused) return
        e.preventDefault()
        setSpaceHeld(true)
        return
      }
      // 줌 단축키 — `=`/`+` 줌 인, `-`/`_` 줌 아웃, `0` 리셋. 입력창에서는 비활성.
      if (isInEditableElement(e.target)) return
      // 마우스/터치 없는 사용자도 줌 가능하도록 timeline 영역 hover/focus 여부 무관 적용.
      // Cmd/Ctrl 조합은 OS 단축키와 충돌하므로 plain key만 받음.
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === '=' || e.key === '+') {
        e.preventDefault()
        zoomBy(ZOOM_STEP)
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault()
        zoomBy(1 / ZOOM_STEP)
      } else if (e.key === '0') {
        e.preventDefault()
        resetZoom()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') setSpaceHeld(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [isBarFocused])

  /** 창 blur / visibility 변경 → drag 종료 + cursor 복원 (잃어버린 mouseup 방어) */
  useEffect(() => {
    const cleanup = () => {
      if (dragStateRef.current) {
        dragStateRef.current = null
        document.body.style.cursor = ''
      }
      setSpaceHeld(false)
    }
    window.addEventListener('blur', cleanup)
    document.addEventListener('visibilitychange', cleanup)
    return () => {
      window.removeEventListener('blur', cleanup)
      document.removeEventListener('visibilitychange', cleanup)
    }
  }, [])

  const handlePanMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const isMiddle = e.button === 1
    const isSpaceLeft = e.button === 0 && spaceHeld
    if (!isMiddle && !isSpaceLeft) return
    e.preventDefault()
    const el = scrollRef.current
    if (!el) return
    dragStateRef.current = { startX: e.clientX, startScrollLeft: el.scrollLeft }
    document.body.style.cursor = 'grabbing'
  }

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const drag = dragStateRef.current
      if (!drag) return
      const el = scrollRef.current
      if (!el) return
      el.scrollLeft = drag.startScrollLeft - (e.clientX - drag.startX)
    }
    const onMouseUp = () => {
      if (dragStateRef.current) {
        dragStateRef.current = null
        document.body.style.cursor = ''
      }
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  // ── 호버/포커스 툴팁 + 4면 clamp ─────────────────────────────────────────
  const TOOLTIP_W = 280
  const TOOLTIP_H = 70
  const showTooltip = useCallback((target: SVGGraphicsElement, bar: BarData) => {
    const host = scrollRef.current
    if (!host) return
    const hostRect = host.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    const rawX = targetRect.left + targetRect.width / 2 - hostRect.left
    const rawY = targetRect.top - hostRect.top - 8
    // X: 좌·우 양 끝에서 8px 안전 여백
    const x = Math.max(
      TOOLTIP_W / 2 + 8,
      Math.min(hostRect.width - TOOLTIP_W / 2 - 8, rawX),
    )
    // Y: 위(TOOLTIP_H + 8 이상) + 아래(host 하단 8px 안쪽)도 클램프 — 이전엔 위만
    //    클램프되어 마지막 lane 사건에서 툴팁이 viewport 밖으로 나갔다.
    const y = Math.min(
      Math.max(TOOLTIP_H + 8, rawY),
      Math.max(TOOLTIP_H + 8, hostRect.height - 8),
    )
    setTooltip({ x, y, bar })
  }, [])
  const hideTooltip = useCallback(() => setTooltip(null), [])

  /**
   * Tooltip 글로벌 dismiss — Escape 키 또는 ScrollHost 바깥 클릭 시 즉시 닫음.
   * 모바일 터치 후 잔존 / 키보드 사용자가 빠져나갈 길이 없던 케이스 보강.
   */
  useEffect(() => {
    if (!tooltip) return undefined
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hideTooltip()
    }
    const onPointerDown = (e: PointerEvent) => {
      const host = scrollRef.current
      if (!host) return
      if (e.target instanceof Node && host.contains(e.target)) return
      hideTooltip()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [tooltip, hideTooltip])

  // ── 미니맵 클릭/드래그 brush ────────────────────────────────────────────
  const minimapRef = useRef<HTMLDivElement | null>(null)
  const minimapDragRef = useRef<boolean>(false)

  const yearAtMinimapX = (clientX: number): number | null => {
    const el = minimapRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const ratio = (clientX - rect.left) / rect.width
    const startDecade = Math.floor(minYear / 10) * 10
    const endDecade = Math.ceil(maxYear / 10) * 10
    return startDecade + ratio * (endDecade - startDecade)
  }

  const scrollToYear = useCallback(
    (year: number) => {
      const el = scrollRef.current
      if (!el) return
      const x = (year - minYear) * pixelsPerYear + LANE_LABEL_WIDTH
      el.scrollTo({
        left: Math.max(0, x - el.clientWidth / 2),
        behavior: reducedMotion ? 'auto' : 'smooth',
      })
    },
    [minYear, pixelsPerYear, reducedMotion],
  )

  /**
   * Cluster 활성화 — fit-to-cluster:
   *   1) cluster span을 viewport 폭의 약 60%에 맞도록 zoom 계산
   *   2) ZOOM_MAX 이하로 클램프 (이미 MAX면 그대로)
   *   3) 줌 적용 후 raf 두 번 (state→render→layout) 후 scroll + focus 첫 사건
   */
  /**
   * activatedClusterId — 활성화 직후 ~700ms 동안 클러스터에 펄스 링을 띄워
   * "눌렸다"는 시각 피드백을 준다(특히 이미 zoom이 충분해서 setZoom 무동작인
   * 경우에도 사용자가 인지 가능하도록).
   */
  const [activatedClusterId, setActivatedClusterId] = useState<string | null>(
    null,
  )
  const activatedTimerRef = useRef<number | null>(null)

  const activateCluster = useCallback(
    (cluster: RenderCluster) => {
      // 1) 펄스 피드백 — zoom 변화와 무관하게 항상 발화
      if (activatedTimerRef.current != null) {
        window.clearTimeout(activatedTimerRef.current)
      }
      setActivatedClusterId(cluster.id)
      activatedTimerRef.current = window.setTimeout(() => {
        setActivatedClusterId((prev) => (prev === cluster.id ? null : prev))
        activatedTimerRef.current = null
      }, 700)

      // 2) zoom 계산 — fit-to-cluster (60% viewport 차지)
      const innerWidth = Math.max(0, containerSize.width - LANE_LABEL_WIDTH - 16)
      const span = Math.max(1, cluster.endYear - cluster.startYear)
      const desiredPxPerYear = (innerWidth * 0.6) / span
      const basePxPerYear = computePxPerYear(1)
      const fitZoom =
        basePxPerYear > 0 ? desiredPxPerYear / basePxPerYear : ZOOM_MAX
      const targetZoom = Math.min(ZOOM_MAX, Math.max(zoom, fitZoom))

      if (targetZoom !== zoom) setZoom(targetZoom)

      // 3) 두 번 raf — state 적용 + 다음 프레임 layout 보장 후 scroll/focus
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToYear(cluster.centerYear)
          const firstId = cluster.bars[0].id
          const el = svgRef.current?.querySelector<SVGElement>(
            `[data-bar-id="${firstId}"]`,
          )
          if (el && 'focus' in el) (el as unknown as HTMLElement).focus()
        })
      })
    },
    [containerSize.width, computePxPerYear, zoom, scrollToYear],
  )

  const handleMinimapPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const year = yearAtMinimapX(e.clientX)
    if (year == null) return
    minimapDragRef.current = true
    scrollToYear(year)
  }
  const handleMinimapPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!minimapDragRef.current) return
    const year = yearAtMinimapX(e.clientX)
    if (year == null) return
    scrollToYear(year)
  }
  const endMinimapDrag = () => {
    minimapDragRef.current = false
  }

  /**
   * viewport culling 메모는 더 이상 사용하지 않음 — clustering / external label
   * placement는 *전역 정렬*이라 viewport로 잘라낸 부분 집합으로 계산하면 같은
   * milestone들이 viewport 경계에서 클러스터/싱글로 토글되는 시각 jitter가 생겼다.
   * 또한 viewportYears가 가로 스크롤마다 변해 renderItems 전체가 재계산되며 비용이
   * 컸다. 클러스터링은 한 번만(`bars`/`pixelsPerYear` 변경 시) 수행하고, viewport
   * 가시성은 브라우저 SVG paint 단계에 위임한다(전역 RenderItem은 즉시 위치 계산
   * 결과라 paint 영역 밖이면 자연히 비용 낮음).
   */

  // ── 렌더 파이프라인 — bar / milestone / cluster ─────────────────────────
  /**
   * visibleBars를 *시각 표현 단위*로 변환.
   *
   *   - 의미적 폭 ≥ SHORT_BAR_PX → bar (기존 막대)
   *   - 그 외 → milestone (다이아몬드 점)
   *   - milestone들이 같은 lane × CLUSTER_GAP_PX 이내 CLUSTER_MIN_COUNT개 이상 → cluster
   *
   * 외부 라벨 표시 여부는 *같은 lane 내 다음 아이템과의 거리*로 결정 (그리디 placement).
   */
  /**
   * lane(category) → 시간 정렬된 bar 배열. zoom·viewport 변화에 무관하므로 별도
   * memoize → renderResult에서 매번 sort 안 하도록 분리. (zoom 이벤트 직후
   * renderResult 재계산은 불가피하지만 sort 비용은 회피.)
   */
  const barsSortedByLane = useMemo(() => {
    const byLane = new Map<string, BarData[]>()
    for (const b of bars) {
      const arr = byLane.get(b.category) ?? []
      arr.push(b)
      byLane.set(b.category, arr)
    }
    for (const [, arr] of byLane) {
      arr.sort((a, b) => a.startYear - b.startYear)
    }
    return byLane
  }, [bars])

  const renderResult = useMemo<{
    items: RenderItem[]
    /** 카테고리(=lane key) → 숨겨진(overflow) bar 개수. 라벨 옆 "+N" 표시용 */
    overflow: Map<string, number>
    /** 카테고리 → 사용된 bar row 수 (1~MAX_BAR_ROWS). compact 높이 분기에 사용 */
    laneRows: Map<string, number>
  }>(() => {
    if (!renderReady) {
      return { items: [], overflow: new Map(), laneRows: new Map() }
    }

    const out: RenderItem[] = []
    const overflowByLane = new Map<string, number>()
    const rowsByLane = new Map<string, number>()

    for (const [category, arr] of barsSortedByLane) {
      const lane = laneIndex.get(category)
      if (lane == null) continue
      const laneCenter = TOP_AXIS_HEIGHT + lane * LANE_HEIGHT + LANE_HEIGHT / 2

      // 1단계: bar / milestone 분리 + 위치 계산
      type Pre = {
        bar: BarData
        x: number
        w: number
        cx: number
        kind: 'bar' | 'milestone'
        /** y offset — 같은 lane 안 milestone 충돌 row 보정 */
        yOffset: number
      }
      const pre: Pre[] = arr.map((b) => {
        const x = (b.startYear - minYear) * pixelsPerYear
        const w = Math.max(MIN_BAR_WIDTH, (b.endYear - b.startYear) * pixelsPerYear)
        const semanticW = (b.endYear - b.startYear) * pixelsPerYear
        const kind: 'bar' | 'milestone' = semanticW < SHORT_BAR_PX ? 'milestone' : 'bar'
        const cx = kind === 'milestone' ? x + Math.max(2, semanticW / 2) : x
        return { bar: b, x, w, cx, kind, yOffset: 0 }
      })

      /**
       * milestone 충돌 회피 — 같은 lane 안에서 cx 기준으로 너무 가까운(< 18px) 다이아몬드들에
       * row offset 부여. 클러스터로 묶이지 않은 4개 이하 케이스에서 시각 분리.
       *   row 0 → offset 0, row 1 → -12, row 2 → +12, row 3 → -22, ...
       */
      const milestoneRowEnds: number[] = []
      for (const p of pre) {
        if (p.kind !== 'milestone') continue
        let row = -1
        for (let i = 0; i < milestoneRowEnds.length; i++) {
          if (p.cx - milestoneRowEnds[i] >= 18) {
            row = i
            break
          }
        }
        if (row === -1) {
          row = milestoneRowEnds.length
          milestoneRowEnds.push(p.cx)
        } else {
          milestoneRowEnds[row] = p.cx
        }
        if (row > 0) {
          const sign = row % 2 === 0 ? 1 : -1
          const magnitude = Math.ceil(row / 2) * 12
          p.yOffset = sign * magnitude
        }
      }

      /**
       * Bar row 할당 — 같은 lane 안에서 시간 겹친 bar들을 row 단위로 분리.
       *  - 그리디 interval scheduling: 시작 시각 순으로 가장 빠르게 비는 row에 배치.
       *  - row 인덱스가 MAX_BAR_ROWS-1(=2)을 초과하면 *숨김* + overflow 카운트.
       *  - milestone은 별도 yOffset 처리(이미 위에서) — bar row 할당과 무관.
       */
      const barRowOf = new Map<string, number>()
      const hiddenBarIds = new Set<string>()
      const barEndsByRow: number[] = []
      let laneOverflow = 0
      for (const p of pre) {
        if (p.kind !== 'bar') continue
        let assignedRow = -1
        for (let r = 0; r < barEndsByRow.length; r++) {
          if (barEndsByRow[r] <= p.x) {
            assignedRow = r
            barEndsByRow[r] = p.x + p.w
            break
          }
        }
        if (assignedRow === -1) {
          if (barEndsByRow.length < MAX_BAR_ROWS) {
            assignedRow = barEndsByRow.length
            barEndsByRow.push(p.x + p.w)
          } else {
            // 모든 row가 차 있어 들어갈 자리 없음 → 숨김
            hiddenBarIds.add(p.bar.id)
            laneOverflow++
            continue
          }
        }
        barRowOf.set(p.bar.id, assignedRow)
      }
      const usedBarRows = Math.min(MAX_BAR_ROWS, barEndsByRow.length)
      if (usedBarRows > 0) rowsByLane.set(category, usedBarRows)
      if (laneOverflow > 0) overflowByLane.set(category, laneOverflow)

      // 2단계: milestone 클러스터링 — 연속된 milestone들이 CLUSTER_GAP_PX 이내 CLUSTER_MIN_COUNT개+ 면 묶음
      type Bucket = { items: Pre[]; isCluster: boolean }
      const buckets: Bucket[] = []
      let cur: Pre[] = []
      const flushCluster = () => {
        if (cur.length === 0) return
        if (cur.length >= CLUSTER_MIN_COUNT) {
          buckets.push({ items: cur, isCluster: true })
        } else {
          for (const it of cur) buckets.push({ items: [it], isCluster: false })
        }
        cur = []
      }

      for (const p of pre) {
        if (p.kind !== 'milestone') {
          flushCluster()
          buckets.push({ items: [p], isCluster: false })
          continue
        }
        const last = cur[cur.length - 1]
        if (!last || p.cx - last.cx <= CLUSTER_GAP_PX) {
          cur.push(p)
        } else {
          flushCluster()
          cur.push(p)
        }
      }
      flushCluster()

      // 3단계: 그리디 외부 라벨 placement — 다음 bucket까지 거리 ≥ EXT_LABEL_MIN_GAP 이면 표시
      const items: RenderItem[] = []
      for (let i = 0; i < buckets.length; i++) {
        const b = buckets[i]
        const next = buckets[i + 1]
        const myEnd =
          b.isCluster || b.items[0].kind === 'milestone'
            ? b.items[b.items.length - 1].cx +
              MILESTONE_RADIUS[b.items[0].bar.importance]
            : b.items[0].x + b.items[0].w
        const nextStart = next
          ? next.items[0].kind === 'milestone'
            ? next.items[0].cx -
              MILESTONE_RADIUS[next.items[0].bar.importance]
            : next.items[0].x
          : Infinity
        const gap = nextStart - myEnd
        /**
         * 라벨 폭 가드 — `gap >= MIN_GAP(60)` 그리고 *실제 사용 가능한 폭*이
         * MIN_WIDTH(40) 이상일 때만 표시. 실 폭은 gap - 8(여백) 안에서 MAX_WIDTH(140)
         * 이하. 이 조건을 모두 만족할 때만 showExt=true → 의미 없는 1~2글자 라벨이
         * 시선을 분산하는 케이스 방지.
         */
        const candidateWidth = Math.min(EXT_LABEL_MAX_WIDTH, gap - 8)
        const showExt =
          gap >= EXT_LABEL_MIN_GAP && candidateWidth >= EXT_LABEL_MIN_WIDTH
        const labelWidth = Math.max(EXT_LABEL_MIN_WIDTH, candidateWidth)

        if (b.isCluster) {
          const first = b.items[0]
          const last = b.items[b.items.length - 1]
          const centerCx = (first.cx + last.cx) / 2
          // startYear 평균 — milestone들의 시점 중심 (endYear는 거의 startYear와 동일)
          const centerYear =
            b.items.reduce((acc, it) => acc + it.bar.startYear, 0) / b.items.length
          items.push({
            kind: 'cluster',
            id: `cluster-${category}-${first.bar.id}`,
            bars: b.items.map((it) => it.bar),
            cx: centerCx,
            cy: laneCenter,
            r: CLUSTER_RADIUS,
            startYear: first.bar.startYear,
            endYear: last.bar.endYear,
            centerYear,
            category,
          })
        } else {
          const it = b.items[0]
          if (it.kind === 'milestone') {
            items.push({
              kind: 'milestone',
              id: it.bar.id,
              bar: it.bar,
              cx: it.cx,
              cy: laneCenter + it.yOffset,
              r: MILESTONE_RADIUS[it.bar.importance],
              showExternalLabel: showExt,
              externalLabelWidth: labelWidth,
            })
          } else {
            // 숨김 처리된 bar는 렌더 X (overflow 배지로 라벨 영역에서 표시).
            if (hiddenBarIds.has(it.bar.id)) continue
            const row = barRowOf.get(it.bar.id) ?? 0
            const isStacking = usedBarRows > 1
            const h = isStacking
              ? COMPACT_BAR_HEIGHT[it.bar.importance]
              : IMPORTANCE_BAR_HEIGHT[it.bar.importance]
            // row stacking — used row 수 기준으로 lane 안 균등 분포.
            //   1 row → laneCenter, 2 rows → ±ROW_DELTA/2, 3 rows → -ROW_DELTA, 0, +ROW_DELTA
            const rowsBlockHalf = ((usedBarRows - 1) * ROW_DELTA) / 2
            const myRowCenter = laneCenter - rowsBlockHalf + row * ROW_DELTA
            items.push({
              kind: 'bar',
              id: it.bar.id,
              bar: it.bar,
              x: it.x,
              y: myRowCenter - h / 2,
              w: it.w,
              h,
              // 막대 안에 라벨 표시되는 경우(w > BAR_INSIDE_LABEL_MIN_PX)는 외부 라벨 안 그림
              showExternalLabel: showExt && it.w <= BAR_INSIDE_LABEL_MIN_PX,
              externalLabelWidth: labelWidth,
            })
          }
        }
      }
      out.push(...items)
    }

    return { items: out, overflow: overflowByLane, laneRows: rowsByLane }
  }, [barsSortedByLane, laneIndex, renderReady, minYear, pixelsPerYear])

  const renderItems = renderResult.items
  const laneBarOverflow = renderResult.overflow

  // ── 키보드 ←/→ 같은 lane 시간순 이동 + Home/End ────────────────────────
  const focusBar = useCallback((id: string) => {
    const el = svgRef.current?.querySelector<SVGRectElement>(
      `[data-bar-id="${id}"]`,
    )
    if (el) el.focus()
  }, [])

  /**
   * 같은 lane 안에서 ←/→/Home/End로 인접 항목 포커스 이동 — cluster·bar 핸들러
   * 공통 로직. collection은 같은 카테고리로 미리 필터된 항목. 시간 정렬 후 현재
   * 인덱스 기준 이동, 위치한 연도로 스크롤.
   * 반환값: 화살표/Home/End 키로 처리되었으면 true (Enter/Space는 false → 호출자가
   * activate 분기).
   */
  const navigateInLane = <T extends { id: string }>(
    e: React.KeyboardEvent<SVGElement>,
    current: T,
    collection: T[],
    getYear: (item: T) => number,
  ): boolean => {
    if (
      e.key !== 'ArrowRight' &&
      e.key !== 'ArrowLeft' &&
      e.key !== 'Home' &&
      e.key !== 'End'
    ) {
      return false
    }
    e.preventDefault()
    const sorted = collection.slice().sort((a, b) => getYear(a) - getYear(b))
    const idx = sorted.findIndex((x) => x.id === current.id)
    if (idx === -1) return true
    let next: T | undefined
    if (e.key === 'Home') next = sorted[0]
    else if (e.key === 'End') next = sorted[sorted.length - 1]
    else if (e.key === 'ArrowRight')
      next = sorted[Math.min(idx + 1, sorted.length - 1)]
    else next = sorted[Math.max(idx - 1, 0)]
    if (next && next.id !== current.id) {
      focusBar(next.id)
      scrollToYear(getYear(next))
    }
    return true
  }

  /**
   * Cluster 키보드 — Enter/Space로 활성화, ←/→/Home/End로 같은 lane 안 인접
   * RenderItem(bar/milestone/cluster) 이동.
   */
  const handleClusterKeyDown = (
    e: React.KeyboardEvent<SVGElement>,
    cluster: RenderCluster,
    activate: () => void,
  ) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      activate()
      return
    }
    const sameLane = renderItems.filter((r) =>
      r.kind === 'cluster'
        ? r.category === cluster.category
        : r.bar.category === cluster.category,
    )
    navigateInLane(e, cluster, sameLane, (it) =>
      it.kind === 'cluster' ? it.centerYear : it.bar.startYear,
    )
  }

  const handleBarKeyDown = (e: React.KeyboardEvent<SVGElement>, b: BarData) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelectEvent(b.id)
      return
    }
    const sameCategory = bars.filter((x) => x.category === b.category)
    navigateInLane(e, b, sameCategory, (it) => it.startYear)
  }

  // ── 오늘 마커 ───────────────────────────────────────────────────────────
  const currentYear = new Date().getFullYear()
  const showToday = currentYear >= minYear && currentYear <= maxYear
  const todayX = (currentYear - minYear) * pixelsPerYear

  // ── legend toggle ───────────────────────────────────────────────────────
  const toggleCategory = (key: string) => {
    setHiddenCategories((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }
  const showAllCategories = () => setHiddenCategories(new Set())

  // ── viewport readout 텍스트 ─────────────────────────────────────────────
  const viewportReadout = viewportYears
    ? `${Math.round(viewportYears.start)}–${Math.round(viewportYears.end)}`
    : `${minYear}–${maxYear}`

  // ── export ──────────────────────────────────────────────────────────────
  const downloadBlob = (content: string, mime: string, ext: string) => {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `timeline-${new Date().toISOString().slice(0, 10)}.${ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const exportSvg = () => {
    const svg = svgRef.current
    if (!svg) return
    const xml = new XMLSerializer().serializeToString(svg)
    downloadBlob(
      `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`,
      'image/svg+xml;charset=utf-8',
      'svg',
    )
    setExportOpen(false)
  }

  const exportJson = () => {
    const payload = bars.map((b) => ({
      id: b.id,
      title: b.title,
      category: b.category,
      importance: b.importance,
      startDate: b.startDate,
      endDate: b.endDate,
    }))
    downloadBlob(
      JSON.stringify(payload, null, 2),
      'application/json;charset=utf-8',
      'json',
    )
    setExportOpen(false)
  }

  /* export menu 외부 클릭 시 닫기 */
  useEffect(() => {
    if (!exportOpen) return
    const onDocDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (t && !(t as Element).closest?.('[data-export-menu]')) {
        setExportOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [exportOpen])

  // ── render ──────────────────────────────────────────────────────────────
  /**
   * legend는 모든 lane을 노출. 이전엔 10개 슬라이스로 잘랐는데, lane 11개+
   * 환경에서는 11번째부터 hide/show 토글이 불가능했다(노출만 안 될 뿐 lane은
   * 살아 있어 데이터 무결성 침해). 카테고리는 동적이므로 모두 표시한다.
   */
  const legendItems = lanes
  const anyHidden = hiddenCategories.size > 0

  return (
    <>
      {/* ═══ 카드 1: 사건 분포 ═══ */}
      <MinimapCard>
        <CardHeader>
          <CardTitleGroup>
            <CardTitle>사건 분포</CardTitle>
            <CardHint>10년 단위 · 클릭/드래그 → 그 시기로 이동</CardHint>
          </CardTitleGroup>
        </CardHeader>
        <Minimap
          ref={minimapRef}
          aria-label="10년 단위 사건 밀도 — 드래그로 범위 이동"
          onPointerDown={handleMinimapPointerDown}
          onPointerMove={handleMinimapPointerMove}
          onPointerUp={endMinimapDrag}
          onPointerCancel={endMinimapDrag}
          onPointerLeave={endMinimapDrag}
        >
          {decadeBuckets.map(({ decade, count, weight }) => {
            const ratio = weight / maxBucketWeight
            const h = Math.max(2, ratio * 78)
            const showLabel =
              labelStep === 1
                ? true
                : labelStep === 2
                  ? decade % 20 === 0
                  : decade % 50 === 0
            const inViewport =
              viewportYears !== null &&
              !(decade + 10 < viewportYears.start || decade > viewportYears.end)
            return (
              <MinimapBar
                key={decade}
                type="button"
                onClick={() => scrollToYear(decade + 5)}
                title={`${decade}~${decade + 9} · ${count}건`}
                data-count={`${count}건`}
                aria-label={`${decade}년대 ${count}건 — Enter 또는 클릭으로 이동`}
              >
                <MinimapBarFill
                  $inViewport={inViewport}
                  $thin={h < 6}
                  style={{ height: `${h}px` }}
                />
                {showLabel ? (
                  <MinimapBarLabel>{decade}</MinimapBarLabel>
                ) : (
                  <MinimapBarLabelSpacer aria-hidden="true" />
                )}
              </MinimapBar>
            )
          })}
        </Minimap>
      </MinimapCard>

      {/* ═══ 카드 2: 사건 타임라인 ═══ */}
      <TimelineCard>
        <CardHeader>
          <CardTitleGroup>
            <CardTitle>사건 타임라인</CardTitle>
            <CardHint>
              막대 클릭 · ←/→ 이동 · Ctrl+휠 줌 · Space+드래그 패닝
            </CardHint>
          </CardTitleGroup>
          <HeaderActions>
            <ViewportReadout
              aria-live="polite"
              aria-atomic="true"
              title="현재 보이는 연도 범위"
            >
              {viewportReadout}
            </ViewportReadout>
            <ZoomControls aria-label="확대/축소">
              <ZoomButton
                type="button"
                aria-label="축소"
                onClick={() => zoomBy(1 / ZOOM_STEP)}
                disabled={zoom <= ZOOM_MIN + 0.01}
              >
                −
              </ZoomButton>
              <ZoomReadout
                onClick={resetZoom}
                title="원래 크기로 (1×)"
                aria-label={`현재 확대율 ${Math.round(zoom * 100)}% — 클릭하여 1× 복귀`}
                aria-live="polite"
              >
                {Math.round(zoom * 100)}%
              </ZoomReadout>
              <ZoomButton
                type="button"
                aria-label="확대"
                onClick={() => zoomBy(ZOOM_STEP)}
                disabled={zoom >= ZOOM_MAX - 0.01}
              >
                +
              </ZoomButton>
            </ZoomControls>
            <ExportWrap data-export-menu>
              <ExportButton
                type="button"
                onClick={() => setExportOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={exportOpen}
                title="내보내기"
              >
                ⤓
              </ExportButton>
              {exportOpen && (
                <ExportMenu role="menu">
                  <ExportMenuItem role="menuitem" onClick={exportSvg}>
                    SVG로 내보내기
                  </ExportMenuItem>
                  <ExportMenuItem role="menuitem" onClick={exportJson}>
                    JSON으로 내보내기
                  </ExportMenuItem>
                </ExportMenu>
              )}
            </ExportWrap>
            <Legend aria-label="카테고리 색 범례 — 클릭으로 표시/숨김 토글">
              {legendItems.map((lane) => {
                const hidden = hiddenCategories.has(lane.key)
                return (
                  <LegendItem
                    key={lane.key}
                    type="button"
                    aria-pressed={!hidden}
                    aria-label={`${lane.label} ${hidden ? '표시' : '숨기기'}`}
                    $dim={hoveredCategory != null && hoveredCategory !== lane.key}
                    $hidden={hidden}
                    onClick={() => toggleCategory(lane.key)}
                    onMouseEnter={() => setHoveredCategory(lane.key)}
                    onMouseLeave={() => setHoveredCategory(null)}
                  >
                    <LegendDot style={{ background: categoryColor(lane.key) }} />
                    <span>{lane.label}</span>
                  </LegendItem>
                )
              })}
              {anyHidden && (
                <LegendShowAll
                  type="button"
                  onClick={showAllCategories}
                  aria-label="숨긴 카테고리 모두 보이기"
                >
                  모두 보이기
                </LegendShowAll>
              )}
            </Legend>
          </HeaderActions>
        </CardHeader>

        {bars.length === 0 ? (
          <EmptyHint>
            <EmptyIconBubble aria-hidden="true">∅</EmptyIconBubble>
            {/**
             * 빈 상태는 두 케이스를 분기:
             *  - allBars > 0 이면 사용자가 legend로 모든 카테고리를 hide한 상태
             *    → "전부 숨겨져 있다 · 모두 보이기" 안내. (이전엔 데이터 없음과
             *       구분 안 돼 사용자가 새로고침하는 등 혼동했음)
             *  - allBars === 0 이면 진짜로 표시할 사건이 없음.
             */}
            {allBars.length > 0 ? (
              <>
                <span>
                  카테고리 {hiddenCategories.size}개를 숨겨 표시할 사건이
                  없습니다.
                </span>
                <EmptySubAction onClick={showAllCategories}>
                  숨긴 카테고리 모두 보이기
                </EmptySubAction>
              </>
            ) : (
              <span>표시할 사건이 없습니다.</span>
            )}
          </EmptyHint>
        ) : (
          <ScrollHost
            ref={attachScrollHost}
            onWheel={handleWheel}
            onMouseDown={handlePanMouseDown}
            $panning={spaceHeld}
            tabIndex={-1}
          >
            {renderReady && (
              <SvgRoot
                ref={svgRef}
                width={svgWidth}
                height={totalHeight}
                role="img"
                aria-label={`사건 타임라인 — ${bars.length}건, ${minYear}년부터 ${maxYear}년까지`}
              >
                {/* 상단 연도 눈금 */}
                <g transform={`translate(${LANE_LABEL_WIDTH}, 0)`}>
                  {ticks.map((y) => {
                    const x = (y - minYear) * pixelsPerYear
                    const major = y % 10 === 0
                    return (
                      <g key={y} transform={`translate(${x}, 0)`}>
                        <TickLine
                          x1={0}
                          x2={0}
                          y1={TOP_AXIS_HEIGHT - 8}
                          y2={totalHeight - TIMELINE_BOTTOM_PAD}
                          $major={major}
                        />
                        <TickLabel x={2} y={TOP_AXIS_HEIGHT - 12}>
                          {y}
                        </TickLabel>
                      </g>
                    )
                  })}
                </g>

                {/* 레인 */}
                {visibleLanes.map((lane, i) => {
                  const yTop = TOP_AXIS_HEIGHT + i * LANE_HEIGHT
                  return (
                    <g
                      key={lane.key}
                      onMouseEnter={() => setHoveredCategory(lane.key)}
                      onMouseLeave={() => setHoveredCategory(null)}
                    >
                      <LaneBg
                        x={0}
                        y={yTop}
                        width={svgWidth}
                        height={LANE_HEIGHT}
                        $alt={i % 2 === 1}
                        $highlighted={hoveredCategory === lane.key}
                      />
                      <LaneSeparator
                        x1={LANE_LABEL_WIDTH}
                        x2={svgWidth}
                        y1={yTop + LANE_HEIGHT}
                        y2={yTop + LANE_HEIGHT}
                      />
                      <LaneLabel
                        x={LANE_LABEL_WIDTH - 10}
                        y={yTop + LANE_HEIGHT / 2 + 4}
                      >
                        {truncateLabel(lane.label, 10)}
                      </LaneLabel>
                      {/* 시간 겹침으로 숨겨진 bar 수 — row stacking이 cap에 도달했을 때만 노출 */}
                      {(() => {
                        const overflowCount = laneBarOverflow.get(lane.key) ?? 0
                        if (overflowCount === 0) return null
                        return (
                          <LaneOverflowBadge
                            transform={`translate(${LANE_LABEL_WIDTH - 24}, ${yTop + LANE_HEIGHT - 14})`}
                          >
                            <title>
                              시간 겹침으로 {overflowCount}건이 더 있습니다 (lane 한계 도달)
                            </title>
                            <rect
                              x={-18}
                              y={-9}
                              width={32}
                              height={14}
                              rx={7}
                            />
                            <text x={-2} y={1} textAnchor="middle">
                              +{overflowCount}
                            </text>
                          </LaneOverflowBadge>
                        )
                      })()}
                      <LaneDot
                        cx={12}
                        cy={yTop + LANE_HEIGHT / 2}
                        r={3}
                        fill={categoryColor(lane.key)}
                      />
                    </g>
                  )
                })}

                {/* 오늘 마커 — TickLine과 동일한 dasharray 패턴(2 4) 사용해 시각 통일 */}
                {showToday && (
                  <g transform={`translate(${LANE_LABEL_WIDTH}, 0)`} pointerEvents="none">
                    <TodayLine
                      x1={todayX}
                      x2={todayX}
                      y1={TOP_AXIS_HEIGHT - 4}
                      y2={totalHeight - TIMELINE_BOTTOM_PAD}
                    />
                    <TodayLabelBg
                      x={todayX - 18}
                      y={TOP_AXIS_HEIGHT - 28}
                      width={36}
                      height={18}
                      rx={4}
                    />
                    <TodayLabelText x={todayX} y={TOP_AXIS_HEIGHT - 15}>
                      오늘
                    </TodayLabelText>
                  </g>
                )}

                {/* 선택 vertical guide */}
                {(() => {
                  if (!selectedEventId) return null
                  const sel = bars.find((b) => b.id === selectedEventId)
                  if (!sel) return null
                  const xStart =
                    LANE_LABEL_WIDTH + (sel.startYear - minYear) * pixelsPerYear
                  const xEnd =
                    LANE_LABEL_WIDTH + (sel.endYear - minYear) * pixelsPerYear
                  // SelectedRangeBg와 LaneBg highlighted 누적 방지: highlight 중인 lane 제외
                  return (
                    <g pointerEvents="none">
                      <SelectedRangeBg
                        x={xStart}
                        y={TOP_AXIS_HEIGHT}
                        width={Math.max(MIN_BAR_WIDTH, xEnd - xStart)}
                        height={
                          totalHeight - TOP_AXIS_HEIGHT - TIMELINE_BOTTOM_PAD
                        }
                        $dimmed={hoveredCategory === sel.category}
                      />
                      <SelectedGuide
                        x1={xStart}
                        x2={xStart}
                        y1={TOP_AXIS_HEIGHT - 4}
                        y2={totalHeight - TIMELINE_BOTTOM_PAD}
                      />
                    </g>
                  )
                })()}

                {/* 막대 / milestone / cluster */}
                <g transform={`translate(${LANE_LABEL_WIDTH}, 0)`} role="list">
                  {renderItems.map((it) => {
                    if (it.kind === 'cluster') {
                      const color = categoryColor(it.category)
                      // 시기 정보 포함 — SR이 위치 인지 가능
                      const sy = Math.round(it.startYear)
                      const ey = Math.round(it.endYear)
                      const yearRange = sy === ey ? `${sy}년` : `${sy}–${ey}년`
                      const ariaLabel = `${it.bars.length}개 사건 모음, ${yearRange}, ${getCategoryName(
                        it.category,
                        dbCategories,
                      )} — Enter로 확대`
                      // cluster 안에 selectedEventId가 포함되면 active 표시
                      const containsSelected =
                        selectedEventId != null &&
                        it.bars.some((b) => b.id === selectedEventId)
                      // badge width cap — N이 100+이어도 36px 제한
                      const badgeText = `+${it.bars.length}`
                      const badgeWidth = Math.min(
                        36,
                        Math.max(20, badgeText.length * 7 + 8),
                      )
                      const onActivate = () => activateCluster(it)
                      return (
                        <g key={it.id} role="listitem">
                          <ClusterDiamond
                            data-bar-id={it.id}
                            data-cluster
                            transform={`translate(${it.cx}, ${it.cy})`}
                            tabIndex={0}
                            role="button"
                            aria-label={ariaLabel}
                            aria-describedby={tooltipIdRef.current}
                            onClick={onActivate}
                            onKeyDown={(e) =>
                              handleClusterKeyDown(e, it, onActivate)
                            }
                          >
                            <polygon
                              points={`0,${-CLUSTER_RADIUS} ${CLUSTER_RADIUS},0 0,${CLUSTER_RADIUS} ${-CLUSTER_RADIUS},0`}
                              fill={`${color}E6`}
                              stroke={color}
                              strokeWidth={1.5}
                            />
                            {/* 활성화 직후 ~700ms 펄스 — 사용자에게 "눌렸다" 시각 피드백 */}
                            {activatedClusterId === it.id && !reducedMotion && (
                              <ClusterPulseRing
                                points={`0,${-CLUSTER_RADIUS} ${CLUSTER_RADIUS},0 0,${CLUSTER_RADIUS} ${-CLUSTER_RADIUS},0`}
                                stroke={color}
                                pointerEvents="none"
                              />
                            )}
                            {/* cluster 안에 선택된 사건 있으면 outline */}
                            {containsSelected && (
                              <polygon
                                points={`0,${-CLUSTER_RADIUS - 3} ${CLUSTER_RADIUS + 3},0 0,${CLUSTER_RADIUS + 3} ${-CLUSTER_RADIUS - 3},0`}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={1.5}
                                style={{ color: '#0f172a' }}
                                pointerEvents="none"
                              />
                            )}
                            <ClusterBadge
                              x={CLUSTER_RADIUS + 2}
                              y={-9}
                              width={badgeWidth}
                              height={14}
                              rx={7}
                            />
                            <ClusterBadgeText
                              x={CLUSTER_RADIUS + 2 + badgeWidth / 2}
                              y={1}
                            >
                              {badgeText}
                            </ClusterBadgeText>
                          </ClusterDiamond>
                        </g>
                      )
                    }

                    const b = it.bar
                    const color = categoryColor(b.category)
                    const isActive = selectedEventId === b.id
                    const isFocused = focusedBarId === b.id
                    const dim =
                      hoveredCategory != null && hoveredCategory !== b.category
                    const importanceLabel = IMPORTANCE_LABEL[b.importance]
                    const ariaLabel = [
                      b.title,
                      `${b.startDate}${b.endDate && b.endDate !== b.startDate ? ` ~ ${b.endDate}` : ''}`,
                      getCategoryName(b.category, dbCategories),
                      b.importance !== 'normal' ? importanceLabel : null,
                    ]
                      .filter(Boolean)
                      .join(', ')

                    const commonHandlers = {
                      tabIndex: 0,
                      role: 'button' as const,
                      'aria-label': ariaLabel,
                      'aria-pressed': isActive,
                      'aria-describedby': tooltipIdRef.current,
                      'data-bar-id': b.id,
                      onClick: () => onSelectEvent(b.id),
                      onKeyDown: (e: React.KeyboardEvent<SVGElement>) =>
                        handleBarKeyDown(e, b),
                      onMouseEnter: (e: React.MouseEvent<SVGElement>) =>
                        showTooltip(e.currentTarget as SVGGraphicsElement, b),
                      onMouseLeave: hideTooltip,
                      onFocus: (e: React.FocusEvent<SVGElement>) => {
                        setFocusedBarId(b.id)
                        showTooltip(e.currentTarget as SVGGraphicsElement, b)
                      },
                      onBlur: () => {
                        setFocusedBarId((curr) => (curr === b.id ? null : curr))
                        hideTooltip()
                      },
                    }

                    if (it.kind === 'milestone') {
                      const r = it.r
                      // 다이아몬드 polygon: top → right → bottom → left
                      const points = `${it.cx},${it.cy - r} ${it.cx + r},${it.cy} ${it.cx},${it.cy + r} ${it.cx - r},${it.cy}`
                      const importantStroke =
                        b.importance === 'critical' || b.importance === 'major'
                      // 모든 milestone에 stroke — notable/normal은 약한 alpha, important는 진함
                      const strokeColor = importantStroke
                        ? color
                        : `${color}80` // 50% alpha
                      // 색맹 대응 — importance를 색만이 아닌 패턴/내부 마커로 보강:
                      //   critical: 다이아 안쪽 흰 dot
                      //   major:    다이아 안쪽 빈 ring
                      //   notable:  dashed stroke
                      //   normal:   solid stroke (구분 단서 없음 — 가장 약한 등급)
                      const dashed = b.importance === 'notable'
                      return (
                        <g key={b.id} role="listitem">
                          <MilestoneShape
                            points={points}
                            fill={`${color}E6`}
                            stroke={strokeColor}
                            strokeWidth={importantStroke ? 1.5 : 1}
                            strokeDasharray={dashed ? '2 1.5' : undefined}
                            $active={isActive}
                            $dim={dim}
                            $importance={b.importance}
                            {...commonHandlers}
                          />
                          {b.importance === 'critical' && (
                            <circle
                              cx={it.cx}
                              cy={it.cy}
                              r={1.6}
                              fill="#ffffff"
                              pointerEvents="none"
                            />
                          )}
                          {b.importance === 'major' && (
                            <circle
                              cx={it.cx}
                              cy={it.cy}
                              r={1.8}
                              fill="none"
                              stroke="#ffffff"
                              strokeWidth={1}
                              pointerEvents="none"
                            />
                          )}
                          {/* focus / active outline — 다이아몬드용 */}
                          {(isFocused || isActive) && (
                            <MilestoneOutline
                              points={`${it.cx},${it.cy - r - 3} ${it.cx + r + 3},${it.cy} ${it.cx},${it.cy + r + 3} ${it.cx - r - 3},${it.cy}`}
                              $active={isActive}
                              pointerEvents="none"
                            />
                          )}
                          {it.showExternalLabel && (
                            <ExternalLabel
                              x={it.cx + r + 6}
                              y={it.cy + 3.5}
                              aria-hidden="true"
                              onClick={() => onSelectEvent(b.id)}
                            >
                              {truncateBarText(b.title, it.externalLabelWidth)}
                            </ExternalLabel>
                          )}
                        </g>
                      )
                    }

                    // it.kind === 'bar'
                    const rx = b.importance === 'critical' ? 7 : 6
                    const showWedge =
                      b.importance === 'critical' || b.importance === 'major'
                    const dashedBorder = b.importance === 'notable'
                    const inLabel = it.w > BAR_INSIDE_LABEL_MIN_PX
                    return (
                      <g key={b.id} role="listitem">
                        <Bar
                          x={it.x}
                          y={it.y}
                          width={it.w}
                          height={it.h}
                          rx={rx}
                          fill={`${color}E6`}
                          $active={isActive}
                          $dim={dim}
                          $importance={b.importance}
                          {...commonHandlers}
                        />
                        {dashedBorder && (
                          <NotableDashed
                            x={it.x + 0.75}
                            y={it.y + 0.75}
                            width={Math.max(0, it.w - 1.5)}
                            height={Math.max(0, it.h - 1.5)}
                            rx={Math.max(0, rx - 1)}
                            pointerEvents="none"
                          />
                        )}
                        {showWedge && (
                          <WedgePolygon
                            points={`${it.x},${it.y + rx} ${it.x + 7},${it.y + it.h / 2} ${it.x},${it.y + it.h - rx}`}
                            $importance={b.importance}
                            pointerEvents="none"
                          />
                        )}
                        {isFocused && !isActive && (
                          <FocusOutline
                            x={it.x - 1.5}
                            y={it.y - 1.5}
                            width={it.w + 3}
                            height={it.h + 3}
                            rx={rx + 1}
                            pointerEvents="none"
                          />
                        )}
                        {isActive && (
                          <ActiveOutline
                            x={it.x - 1.5}
                            y={it.y - 1.5}
                            width={it.w + 3}
                            height={it.h + 3}
                            rx={rx + 1}
                            pointerEvents="none"
                          />
                        )}
                        {inLabel && (
                          <BarLabel
                            x={it.x + (showWedge ? 12 : 6)}
                            y={it.y + it.h / 2 + 3.5}
                            pointerEvents="none"
                          >
                            {truncateBarText(b.title, it.w - (showWedge ? 18 : 12))}
                          </BarLabel>
                        )}
                        {/* 막대 안에 라벨 안 들어가면 외부 라벨 시도 */}
                        {!inLabel && it.showExternalLabel && (
                          <ExternalLabel
                            x={it.x + it.w + 6}
                            y={it.y + it.h / 2 + 3.5}
                            aria-hidden="true"
                            onClick={() => onSelectEvent(b.id)}
                          >
                            {truncateBarText(b.title, it.externalLabelWidth)}
                          </ExternalLabel>
                        )}
                      </g>
                    )
                  })}
                </g>
              </SvgRoot>
            )}

            {tooltip && (
              <Tooltip
                id={tooltipIdRef.current}
                role="tooltip"
                style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
              >
                <TooltipTitle>{tooltip.bar.title}</TooltipTitle>
                <TooltipMeta>
                  {tooltip.bar.startDate}
                  {tooltip.bar.endDate &&
                  tooltip.bar.endDate !== tooltip.bar.startDate
                    ? ` ~ ${tooltip.bar.endDate}`
                    : ''}
                </TooltipMeta>
                <TooltipMeta>
                  {getCategoryName(tooltip.bar.category, dbCategories)}
                  {tooltip.bar.importance !== 'normal' &&
                    ` · ${IMPORTANCE_LABEL[tooltip.bar.importance]}`}
                </TooltipMeta>
              </Tooltip>
            )}
          </ScrollHost>
        )}
      </TimelineCard>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────────

function isInEditableElement(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    (el?.isContentEditable ?? false)
  )
}

function truncateLabel(label: string, maxChars: number): string {
  return label.length > maxChars ? `${label.slice(0, maxChars - 1)}…` : label
}

/**
 * 막대 안 텍스트 — CJK/ASCII 가중치로 truncation 정확도 ↑.
 * 끝에 ellipsis(약 7px) 자리가 남으면 마지막 글자까지 살리고 "…" 추가;
 * 자리 없으면 한 글자 제거해 "…"가 들어가게. 이전엔 무조건 한 글자 빼서
 * 평균 1자 더 잘려 보였다.
 */
const ELLIPSIS_PX = 7
function truncateBarText(title: string, widthPx: number): string {
  let acc = 0
  let cut = title.length
  for (let i = 0; i < title.length; i++) {
    const w = CJK_RE.test(title[i]) ? CJK_CHAR_PX : ASCII_CHAR_PX
    if (acc + w > widthPx) {
      cut = i
      break
    }
    acc += w
  }
  if (cut >= title.length) return title
  if (cut <= 0) return ''
  // 마지막 글자(cut-1)까지 표시한 acc로 ellipsis가 들어갈 자리 있는지 확인
  if (acc + ELLIPSIS_PX <= widthPx) {
    return `${title.slice(0, cut)}…`
  }
  // 자리 없으면 마지막 글자 제거 후 ellipsis
  return cut === 1 ? title.slice(0, 1) : `${title.slice(0, cut - 1)}…`
}

// ─────────────────────────────────────────────────────────────────────────────
// styled
// ─────────────────────────────────────────────────────────────────────────────

const cardBase = css`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(20,19,34,0.08)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#ffffff'};
`

const MinimapCard = styled.section`
  ${cardBase}
  flex: 0 0 152px;

  @media (max-width: 768px) {
    flex: 0 0 110px;
  }
`

const TimelineCard = styled.section`
  ${cardBase}
  flex: 1;
  min-height: 0;
`

const CardHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
  flex-wrap: wrap;
`

const CardTitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
`

const CardTitle = styled.h3`
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const CardHint = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const HeaderActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;

  @media (max-width: 1024px) {
    & > [aria-label^='카테고리 색 범례'] {
      display: none;
    }
  }
`

/* viewport readout — 현재 보이는 연도 범위 */
const ViewportReadout = styled.span`
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 10px;
  border-radius: 8px;
  font-size: 11.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.005em;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f1f5f9'};
  color: ${({ theme }) => theme.colors.text.secondary};
  flex-shrink: 0;
`

const ZoomControls = styled.div`
  display: inline-flex;
  align-items: stretch;
  height: 26px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.12)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f8fafc'};
`

const ZoomButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: background ${MOTION.fast};

  &:hover:not(:disabled) {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(15,23,42,0.04)'};
    color: ${BRAND.primary};
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
    background: ${BRAND.primarySoft};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const ZoomReadout = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  padding: 0 4px;
  border: none;
  background: transparent;
  border-left: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'};
  border-right: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'};
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.005em;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  font-family: inherit;
  transition: background ${MOTION.fast}, color ${MOTION.fast};

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(15,23,42,0.04)'};
    color: ${BRAND.primary};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/* Export 버튼/메뉴 */
const ExportWrap = styled.div`
  position: relative;
  flex-shrink: 0;
`

const ExportButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.12)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f8fafc'};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: background ${MOTION.fast}, border-color ${MOTION.fast},
    color ${MOTION.fast};

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(15,23,42,0.04)'};
    color: ${BRAND.primary};
    border-color: ${BRAND.primaryBorder};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const ExportMenu = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 20;
  min-width: 180px;
  padding: 4px;
  border-radius: 10px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? '#1c1c20' : '#ffffff'};
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.15);
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const ExportMenuItem = styled.button`
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 12.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  font-family: inherit;
  transition: background ${MOTION.fast};

  &:hover {
    background: ${BRAND.primarySoft};
    color: ${BRAND.primary};
  }

  &:focus-visible {
    outline: none;
    background: ${BRAND.primarySoft};
    box-shadow: ${BRAND.focusRing};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const Legend = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px 8px;
  flex-wrap: wrap;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  flex: 0 1 auto;
  max-width: 60%;
  justify-content: flex-end;
`

const LegendItem = styled.button<{ $dim?: boolean; $hidden?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  padding: 2px 4px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  font-family: inherit;
  font-size: 11px;
  font-weight: ${({ $hidden }) => ($hidden ? 400 : 500)};
  color: inherit;
  /* hidden 카테고리 — strikethrough + opacity */
  text-decoration: ${({ $hidden }) => ($hidden ? 'line-through' : 'none')};
  opacity: ${({ $dim, $hidden }) => ($hidden ? 0.45 : $dim ? 0.5 : 1)};
  transition: opacity ${MOTION.fast}, background ${MOTION.fast};

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.04)'
        : 'rgba(15,23,42,0.04)'};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const LegendShowAll = styled.button`
  margin-left: 4px;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
  border: 1px solid ${BRAND.primaryBorder};
  background: ${BRAND.primarySoft};
  color: ${BRAND.primary};
  cursor: pointer;
  font-family: inherit;
  transition: background ${MOTION.fast};

  &:hover {
    background: ${BRAND.primarySoftHover};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const LegendDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
`

const Minimap = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 100%;
  padding: 8px 14px 8px;
  overflow-x: auto;
  overflow-y: hidden;
  flex: 1;
  min-height: 0;
  cursor: grab;
  touch-action: pan-x;

  &:active {
    cursor: grabbing;
  }

  &::-webkit-scrollbar {
    height: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${BRAND.primarySoftHover};
    border-radius: 2px;
  }
`

const MinimapBar = styled.button`
  position: relative;
  flex: 1 0 20px;
  min-width: 20px;
  max-width: 56px;
  height: 100%;
  padding: 0 1px;
  border: none;
  background: transparent;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: stretch;
  gap: 4px;
  cursor: pointer;
  border-radius: 4px;
  transition: background ${MOTION.fast};

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? BRAND.primarySoftDark : BRAND.primarySoft};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }

  &:hover::after {
    content: attr(data-count);
    position: absolute;
    bottom: calc(100% + 2px);
    left: 50%;
    transform: translateX(-50%);
    padding: 3px 7px;
    border-radius: 4px;
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(28, 28, 32, 0.96)'
        : 'rgba(15, 23, 42, 0.94)'};
    color: #ffffff;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: -0.005em;
    white-space: nowrap;
    pointer-events: none;
    z-index: 5;
    font-variant-numeric: tabular-nums;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const MinimapBarFill = styled.div<{ $inViewport: boolean; $thin: boolean }>`
  width: 100%;
  border-radius: ${({ $thin }) => ($thin ? '0' : '3px 3px 0 0')};
  background: ${({ $inViewport, theme }) =>
    $inViewport
      ? BRAND.primary
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.18)'
        : 'rgba(15, 23, 42, 0.18)'};
  flex-shrink: 0;
  transition: background ${MOTION.base};

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const MinimapBarLabel = styled.span`
  font-size: 9.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
  pointer-events: none;
  text-align: center;
  flex-shrink: 0;
  line-height: 1;
  font-variant-numeric: tabular-nums;
`

const MinimapBarLabelSpacer = styled.span`
  height: 11px;
  flex-shrink: 0;
`

const ScrollHost = styled.div<{ $panning?: boolean }>`
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: auto;
  cursor: ${({ $panning }) => ($panning ? 'grab' : 'auto')};

  &::-webkit-scrollbar {
    width: 6px;
    height: 8px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${BRAND.primarySoftHover};
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: ${BRAND.primaryFill};
  }
`

const SvgRoot = styled.svg`
  display: block;
  font-family: inherit;

  &:focus {
    outline: none;
  }
`

const TickLine = styled.line<{ $major?: boolean }>`
  stroke: ${({ theme, $major }) =>
    $major
      ? theme.mode === 'dark'
        ? 'rgba(255,255,255,0.18)'
        : 'rgba(15,23,42,0.16)'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.08)'
        : 'rgba(15,23,42,0.08)'};
  stroke-width: ${({ $major }) => ($major ? 1.25 : 1)};
  stroke-dasharray: ${({ $major }) => ($major ? 'none' : '2 4')};
`

const TickLabel = styled.text`
  font-size: 11.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  fill: ${({ theme }) => theme.colors.text.secondary};
`

const LaneBg = styled.rect<{ $alt: boolean; $highlighted?: boolean }>`
  fill: ${({ theme, $alt, $highlighted }) =>
    $highlighted
      ? theme.mode === 'dark'
        ? 'rgba(37, 99, 235, 0.07)'
        : 'rgba(37, 99, 235, 0.05)'
      : $alt
        ? theme.mode === 'dark'
          ? 'rgba(255,255,255,0.04)'
          : 'rgba(37, 99, 235,0.045)'
        : 'transparent'};
  transition: fill ${MOTION.fast};

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const LaneSeparator = styled.line`
  stroke: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.07)'
      : 'rgba(15,23,42,0.07)'};
  stroke-width: 1;
`

const LaneLabel = styled.text`
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  text-anchor: end;
  fill: ${({ theme }) => theme.colors.text.secondary};
`

const LaneDot = styled.circle``

/**
 * 겹침으로 숨겨진 bar 수 표시 — 라벨 영역 우하단 작은 pill.
 * tertiary 톤이라 시선 분산 최소화.
 */
const LaneOverflowBadge = styled.g`
  pointer-events: auto;
  cursor: help;

  rect {
    fill: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)'};
    stroke: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.16)' : 'rgba(15,23,42,0.12)'};
    stroke-width: 1;
  }

  text {
    font-size: 10px;
    font-weight: 700;
    fill: ${({ theme }) => theme.colors.text.tertiary};
    letter-spacing: 0.02em;
    font-variant-numeric: tabular-nums;
    dominant-baseline: middle;
  }
`

/**
 * Bar opacity:
 *   - dim (다른 카테고리 hover 중): 0.4 (이전 0.25에서 완화 — 정보 유지)
 *   - notable/normal: 0.7
 *   - critical/major: 1.0
 *   - hover/focus: 1.0 (dim 무시)
 */
const Bar = styled.rect<{
  $active: boolean
  $dim: boolean
  $importance: BarData['importance']
}>`
  cursor: pointer;
  transition: opacity ${MOTION.fast};
  opacity: ${({ $importance, $dim }) => {
    if ($dim) return 0.4
    return $importance === 'normal' || $importance === 'notable' ? 0.7 : 1
  }};

  &:hover,
  &:focus {
    opacity: 1;
  }

  &:focus {
    outline: none;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/**
 * Milestone (다이아몬드) — 짧은 사건의 시점 인코딩.
 * Bar와 동일한 opacity/dim/active 의미. 인터랙션 시그너처(focus/hover) 동일.
 */
const MilestoneShape = styled.polygon<{
  $active: boolean
  $dim: boolean
  $importance: BarData['importance']
}>`
  cursor: pointer;
  transition: opacity ${MOTION.fast}, stroke-width ${MOTION.fast};
  opacity: ${({ $importance, $dim }) => {
    if ($dim) return 0.4
    return $importance === 'normal' || $importance === 'notable' ? 0.7 : 1
  }};

  &:hover,
  &:focus {
    opacity: 1;
    /* 작은 점 hover 인식 강화 — stroke 두꺼워짐 */
    stroke-width: 2.5;
  }

  &:focus {
    outline: none;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/**
 * 다이아몬드 active/focus outline — Bar의 ActiveOutline/FocusOutline에 대응.
 * focus(미선택)는 dashed BRAND.primary 2px, active(선택)는 단색 darker 1.5px.
 */
const MilestoneOutline = styled.polygon<{ $active: boolean }>`
  fill: none;
  stroke: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '#ffffff'
        : '#0f172a'
      : BRAND.primary};
  stroke-width: ${({ $active }) => ($active ? 1.5 : 2)};
  stroke-dasharray: ${({ $active }) => ($active ? 'none' : '3 2')};
  paint-order: stroke;
`

/**
 * Cluster — 같은 lane × 5px 이내 milestone 5개+ 묶음.
 * 다이아몬드 1개 + "+N" badge. 클릭 시 줌 + 점프.
 */
const ClusterDiamond = styled.g`
  cursor: pointer;
  transition: opacity ${MOTION.fast};

  & polygon {
    transition: opacity ${MOTION.fast};
  }

  &:hover polygon,
  &:focus polygon {
    opacity: 1;
  }

  &:focus {
    outline: none;
  }

  &:focus polygon {
    stroke-width: 2.5;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    & polygon {
      transition: none;
    }
  }
`

/**
 * 클러스터 활성화 직후 700ms 동안 외곽으로 퍼지면서 사라지는 링.
 * fill 없이 stroke만, scale + opacity 동시 변화.
 */
const clusterPulseAnim = keyframes`
  0% {
    transform: scale(1);
    opacity: 0.85;
    stroke-width: 2;
  }
  100% {
    transform: scale(2.4);
    opacity: 0;
    stroke-width: 1;
  }
`

const ClusterPulseRing = styled.polygon`
  fill: none;
  transform-origin: center;
  transform-box: fill-box;
  animation: ${clusterPulseAnim} 0.7s ease-out forwards;
`

const ClusterBadge = styled.rect`
  fill: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(15, 23, 42, 0.9)' : 'rgba(15, 23, 42, 0.85)'};
`

const ClusterBadgeText = styled.text`
  font-size: 10px;
  font-weight: 700;
  fill: #ffffff;
  text-anchor: start;
  dominant-baseline: middle;
  font-variant-numeric: tabular-nums;
  pointer-events: none;
`

/**
 * 외부 라벨 — 막대/milestone이 좁아 안에 라벨 못 넣을 때 우측 옆에 표시.
 * `paint-order: stroke` + 배경색 stroke로 outline 효과 — LaneBg highlighted 위에서도 가독.
 * 클릭 가능 (hit-area).
 */
const ExternalLabel = styled.text`
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: -0.005em;
  fill: ${({ theme }) => theme.colors.text.primary};
  paint-order: stroke;
  stroke: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(15, 15, 15, 0.95)' : 'rgba(255, 255, 255, 0.92)'};
  stroke-width: 3;
  stroke-linejoin: round;
  cursor: pointer;
`

/* notable importance dashed inner border — normal과 패턴 차등 (색맹 보조) */
const NotableDashed = styled.rect`
  fill: none;
  stroke: rgba(255, 255, 255, 0.5);
  stroke-width: 1;
  stroke-dasharray: 3 2;
`

/* Active outline — 선택 시 */
const ActiveOutline = styled.rect`
  fill: none;
  stroke: ${({ theme }) => (theme.mode === 'dark' ? '#ffffff' : '#0f172a')};
  stroke-width: 1.5;
`

/**
 * Focus outline — 키보드 포커스만(선택 안 됨). 1.5px이라 잘 안 보였던 케이스를
 * 보강: stroke 2px + paint-order로 fill 위에 그려 글자/wedge에 가려지지 않게.
 */
const FocusOutline = styled.rect`
  fill: none;
  stroke: ${BRAND.primary};
  stroke-width: 2;
  stroke-dasharray: 3 2;
  paint-order: stroke;
`

/**
 * Wedge polygon — 색맹 보조.
 * 라이트 모드: 짙은 검정 alpha
 * 다크 모드: 흰색 alpha (contrast 확보)
 */
const WedgePolygon = styled.polygon<{ $importance: BarData['importance'] }>`
  fill: ${({ $importance, theme }) => {
    const base =
      theme.mode === 'dark' ? 'rgba(255,255,255,' : 'rgba(15, 23, 42,'
    const alpha = $importance === 'critical' ? '0.6)' : '0.35)'
    return base + alpha
  }};
`

/* SelectedRangeBg — alpha 강화 + lane highlight 누적 회피 */
const SelectedRangeBg = styled.rect<{ $dimmed?: boolean }>`
  fill: ${({ theme, $dimmed }) => {
    const a = $dimmed ? 0.07 : theme.mode === 'dark' ? 0.16 : 0.12
    return `rgba(37, 99, 235, ${a})`
  }};
`

const SelectedGuide = styled.line`
  stroke: ${BRAND.primaryBorderHover};
  stroke-width: 2;
`

/* TodayLine — TickLine과 같은 dasharray 패턴(2 4) — 점선 패턴 통일 */
const TodayLine = styled.line`
  stroke: #dc2626;
  stroke-width: 1.5;
  stroke-dasharray: 2 4;
`

const TodayLabelBg = styled.rect`
  fill: #dc2626;
`

const TodayLabelText = styled.text`
  font-size: 10.5px;
  font-weight: 700;
  fill: #ffffff;
  text-anchor: middle;
  letter-spacing: -0.005em;
`

const BarLabel = styled.text`
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: -0.005em;
  fill: #ffffff;
`

const Tooltip = styled.div`
  position: absolute;
  transform: translate(-50%, -100%);
  pointer-events: none;
  padding: 7px 10px;
  border-radius: 8px;
  font-size: 12px;
  z-index: 10;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? `
    background: rgba(28, 28, 32, 0.96);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
  `
      : `
    background: rgba(15, 23, 42, 0.94);
    border: 1px solid rgba(15, 23, 42, 0.9);
    box-shadow: 0 6px 16px rgba(15, 23, 42, 0.14);
  `}
  color: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-width: 280px;
  white-space: normal;
`

const TooltipTitle = styled.div`
  font-weight: 700;
  letter-spacing: -0.01em;
`

const TooltipMeta = styled.div`
  font-size: 11px;
  color: rgba(255, 255, 255, 0.75);
  font-variant-numeric: tabular-nums;
`

const EmptyHint = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  text-align: center;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const EmptyIconBubble = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? BRAND.primarySoftDark : BRAND.primarySoft};
  color: ${BRAND.primary};
`

const EmptySubAction = styled.button`
  margin-top: 4px;
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid ${BRAND.primaryBorder};
  background: ${BRAND.primarySoft};
  color: ${BRAND.primary};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background ${MOTION.fast};

  &:hover {
    background: ${BRAND.primarySoftHover};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`
