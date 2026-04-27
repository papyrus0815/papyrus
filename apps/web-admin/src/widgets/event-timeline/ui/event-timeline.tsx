/**
 * Event Timeline Widget — 가로 타임라인 메인 뷰
 * FSD: widgets/event-timeline/ui
 *
 * 디자인 원칙
 *  - 역사는 (시간 × 카테고리)의 2차원 객체. 카드 리스트가 못 보여주는
 *    "동시대성·기간·밀도"를 막대 길이/색/굵기로 시각화한다.
 *  - 줌은 일단 fit-to-width 고정 (MVP). 사건이 많고 화면이 좁으면 가로 스크롤.
 *  - 단일 사건 클릭 → 우측 상세 패널이 떠 있는 페이지 컨텍스트와 공유.
 *
 * 좌표계
 *  - X: 연도 (year). pixelsPerYear로 환산.
 *  - Y: 카테고리 레인. dbCategories 순서를 따른다. 카테고리 미매핑 사건은 '기타' 레인.
 *
 * 막대 시각 인코딩
 *  - 색       = 카테고리 (CATEGORY_BADGE_COLORS — military/political/economic/...)
 *  - 길이     = startDate~endDate 기간. 단발성 사건도 minWidth=4px로 보이게.
 *  - 높이     = importance (critical: 22, major: 16, normal: 12)
 *  - 외곽선   = active(선택) 시 흰/검 테두리 강조
 *  - 투명도   = bookmarksOnly 등 외부 필터로 dim 처리(선택 사항)
 */
import React, { useMemo, useRef, useState, useEffect } from 'react'

import styled from 'styled-components'

import { getCategoryName } from '@/features/event-list/lib'
import type { EventCategoryDto } from '@/shared/api/event-categories'

import { CATEGORY_BADGE_COLORS } from '../../../pages/events/styles/theme'
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
  /** flattenedHierarchy from useEventHierarchy — depth 0만 사용 */
  flattenedHierarchy: FlatItem[]
  /** id → root event 빠른 조회용 */
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
// constants — 시각 인코딩
// ─────────────────────────────────────────────────────────────────────────────

const LANE_HEIGHT = 48
const LANE_LABEL_WIDTH = 130
const TOP_AXIS_HEIGHT = 36
const MINIMAP_HEIGHT = 64
const PIXELS_PER_YEAR_DEFAULT = 22
const MIN_BAR_WIDTH = 6
const TIMELINE_BOTTOM_PAD = 20

const IMPORTANCE_BAR_HEIGHT: Record<BarData['importance'], number> = {
  critical: 30,
  major: 22,
  notable: 16,
  normal: 16,
}

const KNOWN_CATEGORIES = [
  'military',
  'political',
  'diplomatic',
  'conference',
  'economic',
  'social',
  'technological',
  'cultural',
  'religious',
  'other',
] as const

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
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    bar: BarData
  } | null>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  // 컨테이너 크기 측정 — fit-to-width / fit-to-height 계산용
  useEffect(() => {
    if (!scrollRef.current) return
    const obs = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect
      if (r) setContainerSize({ width: r.width, height: r.height })
    })
    obs.observe(scrollRef.current)
    return () => obs.disconnect()
  }, [])

  // ── 막대 데이터 추출 (depth 0만, 날짜 있는 것만) ────────────────────────
  const bars = useMemo<BarData[]>(() => {
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
      const startYear = start.getFullYear() + (start.getMonth() + start.getDate() / 31) / 12
      const endYear = end.getFullYear() + (end.getMonth() + end.getDate() / 31) / 12
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
    // 연도 시작/끝으로 padding
    return {
      minYear: Math.floor(min - 1),
      maxYear: Math.ceil(max + 1),
    }
  }, [bars])

  const yearSpan = Math.max(1, maxYear - minYear)

  // ── 픽셀/연 환산 — fit-to-width with min ────────────────────────────────
  const pixelsPerYear = useMemo(() => {
    const innerWidth = Math.max(0, containerSize.width - LANE_LABEL_WIDTH - 16)
    const fit = innerWidth / yearSpan
    // fit이 너무 작으면 기본값으로 강제 → 가로 스크롤
    return Math.max(fit, PIXELS_PER_YEAR_DEFAULT * 0.5)
  }, [containerSize.width, yearSpan])

  const timelineWidth = Math.ceil(yearSpan * pixelsPerYear)

  // ── 레인 (카테고리) ─────────────────────────────────────────────────────
  /** 표준 카테고리 10개를 항상 표시 — 데이터가 없는 레인도 보여 시각적 위계가 살아남.
   *  데이터에만 등장하는 미분류 카테고리(UUID 등)는 끝에 추가. */
  const lanes = useMemo<{ key: string; label: string }[]>(() => {
    const KNOWN_LABEL: Record<string, string> = {
      military: '전쟁/군사',
      political: '정치',
      diplomatic: '외교',
      conference: '회담/조약',
      economic: '경제',
      social: '사회',
      technological: '과학기술',
      cultural: '문화',
      religious: '종교',
      other: '기타',
    }

    const present = new Set(bars.map((b) => b.category))
    const ordered: { key: string; label: string }[] = []
    const seen = new Set<string>()

    // 1) 표준 10개 카테고리는 항상 표시
    for (const k of KNOWN_CATEGORIES) {
      ordered.push({ key: k, label: KNOWN_LABEL[k] ?? k })
      seen.add(k)
    }

    // 2) 데이터에 등장한 추가 카테고리 (dbCategories의 UUID 등) — 끝에 추가
    for (const c of present) {
      if (seen.has(c)) continue
      ordered.push({
        key: c,
        label: dbCategories.find((d) => d.id === c)?.name ?? '기타',
      })
      seen.add(c)
    }
    return ordered
  }, [bars, dbCategories])

  const laneIndex = useMemo(() => {
    const m = new Map<string, number>()
    lanes.forEach((l, i) => m.set(l.key, i))
    return m
  }, [lanes])

  const intrinsicHeight =
    TOP_AXIS_HEIGHT + lanes.length * LANE_HEIGHT + TIMELINE_BOTTOM_PAD
  /** SVG 높이는 데이터에 따른 intrinsic height와 컨테이너 높이 중 큰 값 — 빈 공간을 그리드로 채워 시각적 위계 유지 */
  const totalHeight = Math.max(intrinsicHeight, containerSize.height)

  // ── 연도 눈금 ───────────────────────────────────────────────────────────
  const ticks = useMemo(() => {
    // pixelsPerYear에 따라 연 단위, 5년, 10년 단위로 자동
    let step = 1
    const pxPerYear = pixelsPerYear
    if (pxPerYear < 4) step = 50
    else if (pxPerYear < 8) step = 20
    else if (pxPerYear < 16) step = 10
    else if (pxPerYear < 30) step = 5
    else step = 1

    const out: number[] = []
    const start = Math.ceil(minYear / step) * step
    for (let y = start; y <= maxYear; y += step) out.push(y)
    return out
  }, [minYear, maxYear, pixelsPerYear])

  // ── 10년 단위 밀도 sparkline ────────────────────────────────────────────
  const decadeBuckets = useMemo(() => {
    const map = new Map<number, { count: number; weight: number }>()
    for (const b of bars) {
      const decade = Math.floor(b.startYear / 10) * 10
      const cur = map.get(decade) ?? { count: 0, weight: 0 }
      cur.count += 1
      cur.weight +=
        b.importance === 'critical'
          ? 3
          : b.importance === 'major'
            ? 2
            : 1
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

  // ── 호버 툴팁 좌표 ──────────────────────────────────────────────────────
  const handleMouseEnter = (e: React.MouseEvent<SVGRectElement>, bar: BarData) => {
    const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement)?.getBoundingClientRect()
    const targetRect = e.currentTarget.getBoundingClientRect()
    if (!rect) return
    setTooltip({
      x: targetRect.left + targetRect.width / 2 - rect.left,
      y: targetRect.top - rect.top - 8,
      bar,
    })
  }
  const handleMouseLeave = () => setTooltip(null)

  // ── 미니맵 클릭 → 해당 시대로 스크롤 ────────────────────────────────────
  const handleMinimapClick = (decade: number) => {
    if (!scrollRef.current) return
    const x = (decade - minYear) * pixelsPerYear + LANE_LABEL_WIDTH
    scrollRef.current.scrollTo({ left: Math.max(0, x - 80), behavior: 'smooth' })
  }

  return (
    <Wrapper>
      {/* 10년 밀도 sparkline */}
      <Minimap aria-label="10년 단위 사건 밀도">
        {decadeBuckets.map(({ decade, count, weight }) => {
          const ratio = weight / maxBucketWeight
          const h = Math.max(2, ratio * (MINIMAP_HEIGHT - 16))
          return (
            <MinimapBar
              key={decade}
              type="button"
              onClick={() => handleMinimapClick(decade)}
              title={`${decade}~${decade + 9} · ${count}건`}
            >
              <MinimapBarFill
                style={{ height: `${h}px`, opacity: 0.4 + 0.6 * ratio }}
              />
              <MinimapBarLabel>{decade}</MinimapBarLabel>
            </MinimapBar>
          )
        })}
      </Minimap>

      {/* 가로 타임라인 본체 */}
      <ScrollHost ref={scrollRef}>
        <SvgRoot
          width={LANE_LABEL_WIDTH + timelineWidth}
          height={totalHeight}
        >
          {/* 상단 연도 눈금 — 10·100년 단위는 굵게 (메이저), 그 외 점선 */}
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

          {/* 레인 라벨 + 가이드 라인 */}
          {lanes.map((lane, i) => {
            const yTop = TOP_AXIS_HEIGHT + i * LANE_HEIGHT
            return (
              <g key={lane.key}>
                <LaneBg
                  x={0}
                  y={yTop}
                  width={LANE_LABEL_WIDTH + timelineWidth}
                  height={LANE_HEIGHT}
                  $alt={i % 2 === 1}
                />
                <LaneSeparator
                  x1={LANE_LABEL_WIDTH}
                  x2={LANE_LABEL_WIDTH + timelineWidth}
                  y1={yTop + LANE_HEIGHT}
                  y2={yTop + LANE_HEIGHT}
                />
                <LaneLabel
                  x={LANE_LABEL_WIDTH - 10}
                  y={yTop + LANE_HEIGHT / 2 + 4}
                >
                  {lane.label}
                </LaneLabel>
                <LaneDot
                  cx={LANE_LABEL_WIDTH - LANE_LABEL_WIDTH + 12}
                  cy={yTop + LANE_HEIGHT / 2}
                  r={3}
                  fill={CATEGORY_BADGE_COLORS[lane.key as keyof typeof CATEGORY_BADGE_COLORS] ?? '#6b7280'}
                />
              </g>
            )
          })}

          {/* 선택된 사건의 vertical guide — 좌우 다른 카테고리와 시각적으로 연결 */}
          {(() => {
            if (!selectedEventId) return null
            const sel = bars.find((b) => b.id === selectedEventId)
            if (!sel) return null
            const xStart = LANE_LABEL_WIDTH + (sel.startYear - minYear) * pixelsPerYear
            const xEnd = LANE_LABEL_WIDTH + (sel.endYear - minYear) * pixelsPerYear
            return (
              <g pointerEvents="none">
                <SelectedRangeBg
                  x={xStart}
                  y={TOP_AXIS_HEIGHT}
                  width={Math.max(MIN_BAR_WIDTH, xEnd - xStart)}
                  height={totalHeight - TOP_AXIS_HEIGHT - TIMELINE_BOTTOM_PAD}
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

          {/* 막대 */}
          <g transform={`translate(${LANE_LABEL_WIDTH}, 0)`}>
            {bars.map((b) => {
              const lane = laneIndex.get(b.category) ?? lanes.length - 1
              const yCenter = TOP_AXIS_HEIGHT + lane * LANE_HEIGHT + LANE_HEIGHT / 2
              const h = IMPORTANCE_BAR_HEIGHT[b.importance] ?? 12
              const y = yCenter - h / 2
              const x = (b.startYear - minYear) * pixelsPerYear
              const w = Math.max(
                MIN_BAR_WIDTH,
                (b.endYear - b.startYear) * pixelsPerYear,
              )
              const color =
                CATEGORY_BADGE_COLORS[b.category as keyof typeof CATEGORY_BADGE_COLORS] ??
                '#6b7280'
              const isActive = selectedEventId === b.id
              return (
                <g key={b.id}>
                  <Bar
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    rx={3}
                    fill={color}
                    $active={isActive}
                    $importance={b.importance}
                    onClick={() => onSelectEvent(b.id)}
                    onMouseEnter={(e) => handleMouseEnter(e, b)}
                    onMouseLeave={handleMouseLeave}
                  />
                  {/* 막대가 충분히 길면 제목을 안에 표시 */}
                  {w > 60 && (
                    <BarLabel
                      x={x + 6}
                      y={y + h / 2 + 3.5}
                      pointerEvents="none"
                    >
                      {b.title.length > Math.floor(w / 7)
                        ? `${b.title.slice(0, Math.floor(w / 7) - 1)}…`
                        : b.title}
                    </BarLabel>
                  )}
                </g>
              )
            })}
          </g>
        </SvgRoot>

        {tooltip && (
          <Tooltip
            style={{
              left: `${tooltip.x}px`,
              top: `${tooltip.y}px`,
            }}
          >
            <TooltipTitle>{tooltip.bar.title}</TooltipTitle>
            <TooltipMeta>
              {tooltip.bar.startDate}
              {tooltip.bar.endDate && tooltip.bar.endDate !== tooltip.bar.startDate
                ? ` ~ ${tooltip.bar.endDate}`
                : ''}
            </TooltipMeta>
            <TooltipMeta>
              {getCategoryName(tooltip.bar.category, dbCategories)}
              {tooltip.bar.importance !== 'normal' &&
                ` · ${
                  tooltip.bar.importance === 'critical'
                    ? '핵심'
                    : tooltip.bar.importance === 'major'
                      ? '주요'
                      : '주목'
                }`}
            </TooltipMeta>
          </Tooltip>
        )}
      </ScrollHost>

      {bars.length === 0 && (
        <EmptyHint>
          <span>표시할 사건이 없습니다.</span>
        </EmptyHint>
      )}
    </Wrapper>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// styled (theme-aware)
// ─────────────────────────────────────────────────────────────────────────────

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  border-radius: 14px;
  border: 1.5px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(20,19,34,0.08)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#ffffff'};
`

const Minimap = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: ${MINIMAP_HEIGHT}px;
  padding: 8px 12px 6px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9'};
  overflow-x: auto;

  &::-webkit-scrollbar {
    height: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(99, 102, 241, 0.2);
    border-radius: 2px;
  }
`

const MinimapBar = styled.button`
  position: relative;
  flex: 1 0 18px;
  min-width: 18px;
  max-width: 36px;
  height: 100%;
  padding: 0;
  border: none;
  background: transparent;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: stretch;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99,102,241,0.10)'
        : 'rgba(99,102,241,0.06)'};
  }
`

const MinimapBarFill = styled.div`
  width: 100%;
  border-radius: 3px 3px 0 0;
  background: linear-gradient(
    180deg,
    rgba(99, 102, 241, 0.85),
    rgba(139, 92, 246, 0.65)
  );
`

const MinimapBarLabel = styled.span`
  position: absolute;
  bottom: -14px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 9.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
  pointer-events: none;
`

const ScrollHost = styled.div`
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: auto;

  &::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(99, 102, 241, 0.25);
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: rgba(99, 102, 241, 0.4);
  }
`

const SvgRoot = styled.svg`
  display: block;
  font-family: inherit;
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

const LaneBg = styled.rect<{ $alt: boolean }>`
  fill: ${({ theme, $alt }) =>
    $alt
      ? theme.mode === 'dark'
        ? 'rgba(255,255,255,0.025)'
        : 'rgba(99,102,241,0.025)'
      : 'transparent'};
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

const Bar = styled.rect<{
  $active: boolean
  $importance: BarData['importance']
}>`
  cursor: pointer;
  transition: filter 0.12s, transform 0.12s, opacity 0.12s;
  /* critical/major는 더 큰 명도/채도 + drop shadow로 위계 시각화 */
  filter: ${({ $active, $importance }) =>
    $active
      ? 'brightness(1.12) saturate(1.18) drop-shadow(0 2px 4px rgba(0,0,0,0.25))'
      : $importance === 'critical'
        ? 'drop-shadow(0 1.5px 2.5px rgba(0,0,0,0.18))'
        : $importance === 'major'
          ? 'drop-shadow(0 1px 1.5px rgba(0,0,0,0.12))'
          : 'none'};
  stroke: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '#ffffff'
        : '#0f172a'
      : 'transparent'};
  stroke-width: ${({ $active }) => ($active ? 2 : 0)};

  &:hover {
    filter: brightness(1.16) saturate(1.25)
      drop-shadow(0 2px 4px rgba(0, 0, 0, 0.22));
  }
`

const SelectedRangeBg = styled.rect`
  fill: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99, 102, 241, 0.07)'
      : 'rgba(99, 102, 241, 0.05)'};
`

const SelectedGuide = styled.line`
  stroke: rgba(99, 102, 241, 0.55);
  stroke-width: 1.5;
  stroke-dasharray: 3 3;
`

const BarLabel = styled.text`
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: -0.005em;
  fill: #ffffff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
`

const Tooltip = styled.div`
  position: absolute;
  transform: translate(-50%, -100%);
  pointer-events: none;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 10;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? `
    background: rgba(28, 28, 32, 0.97);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  `
      : `
    background: rgba(15, 23, 42, 0.95);
    border: 1px solid rgba(15, 23, 42, 0.9);
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18);
  `}
  color: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-width: 360px;
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
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
