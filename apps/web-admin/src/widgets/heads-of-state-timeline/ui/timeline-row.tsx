import { memo, useMemo } from 'react'

import styled, { css } from 'styled-components'

import type { PinnedRow, YearRange } from '../model/types'
import { yearToX } from '../lib/time-scale'
import type { SegmentTenuresResult } from '../api/use-segment-tenures'
import type { TenureBar } from '../lib/normalize-tenures'
import { sortSegmentsChronologically } from '../lib/sort-segments'
import { packRowByBands } from '../lib/pack-row-lanes'
import { ribbonColorFor } from '../lib/ribbon-color'
import { CATEGORY_TOKENS } from '../lib/category-tokens'
import { formatYearRange } from '../lib/format-year'
import { useHeadsTooltip } from './tooltip'

interface RowProps {
  row: PinnedRow
  range: YearRange
  /** 컨텐츠 영역 픽셀 폭 (사이드바 제외 + 시간축 좌우 패딩 제거된 값) */
  width: number
  highlightYear: number | null
  segmentResults: SegmentTenuresResult[]
  /** 사용자가 "범위 밖에 데이터 있음 → 그 시대로 점프" 누르면 호출 */
  onJumpToRange: (range: YearRange) => void
  /** 빈 행 inline "이 행 제거" */
  onRemoveRow: (rowId: string) => void
  /** 막대 클릭 → 페이지에 (bar, row) 전달 — 페이지가 인물 모달 띄움 */
  onSelectBar?: (bar: TenureBar, row: PinnedRow) => void
  /** 빈 행 inline "이 국가에 인물 추가" 진입 — 국가 상세 페이지로 */
  onJumpToCountry?: (kind: 'COUNTRY' | 'HISTORICAL', countryId: string) => void
  /** 카테고리 필터 — 활성 카테고리만 막대 노출 */
  categoryFilter?: (c: TenureBar['positionCategory']) => boolean
}

const BAR_HEIGHT = 26
const LANE_GAP = 4
const ROW_VPAD_TOP = 18
const ROW_VPAD_BOTTOM = 10
const MIN_ROW_HEIGHT = 60

function rowHeightFor(laneCount: number): number {
  const need =
    ROW_VPAD_TOP + ROW_VPAD_BOTTOM + laneCount * BAR_HEIGHT + (laneCount - 1) * LANE_GAP
  return Math.max(MIN_ROW_HEIGHT, need)
}

interface PackedSegment {
  segmentId: string
  bars: { bar: TenureBar; lane: number }[]
}

function TimelineRowImpl({
  row,
  range,
  width,
  highlightYear,
  segmentResults,
  onJumpToRange,
  onRemoveRow,
  onSelectBar,
  onJumpToCountry,
  categoryFilter,
}: RowProps) {
  // segments 배열은 추가순 — 라벨 표시는 시간순(lifespanStartYear)으로 다시 정렬한다.
  const orderedSegments = useMemo(
    () => sortSegmentsChronologically(row.segments),
    [row.segments],
  )

  const { packed, laneCount } = useMemo(() => {
    const filteredSegs = segmentResults.map((res) => ({
      segmentId: res.segmentId,
      bars: categoryFilter
        ? res.bars.filter((b) => categoryFilter(b.positionCategory))
        : res.bars,
    }))
    return packRowByBands(filteredSegs)
  }, [segmentResults, categoryFilter])

  const rowHeight = rowHeightFor(laneCount)

  const isLoading = segmentResults.some((r) => r.isLoading)
  const totalBars = segmentResults.reduce((acc, r) => acc + r.bars.length, 0)
  const visibleBars = segmentResults.reduce(
    (acc, r) => acc + countBarsInRange(r.bars, range),
    0,
  )

  const rowEraText = useMemo(() => formatRowEra(orderedSegments), [orderedSegments])

  /** out-of-range — 모든 막대를 둘러싸는 union range로 점프 */
  const jumpRange = useMemo<YearRange | null>(() => {
    if (totalBars === 0) return null
    let lo = Infinity
    let hi = -Infinity
    for (const r of segmentResults) {
      for (const bar of r.bars) {
        const s = bar.startJulian
        const e = bar.endJulian ?? new Date().getFullYear()
        if (s < lo) lo = s
        if (e > hi) hi = e
      }
    }
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null
    const span = Math.max(30, hi - lo)
    const pad = Math.round(span * 0.12)
    return { startYear: Math.round(lo - pad), endYear: Math.round(hi + pad) }
  }, [segmentResults, totalBars])

  return (
    <RowWrapper style={{ height: rowHeight }}>
      <RowLabel>
        <RowLabelMain>
          {orderedSegments.map((seg, idx) => (
            <span key={seg.segmentId}>
              {idx > 0 && <LabelSeparator>→</LabelSeparator>}
              {seg.flagEmoji && <span>{seg.flagEmoji}</span>}
              <span>{seg.name}</span>
            </span>
          ))}
        </RowLabelMain>
        {rowEraText && <RowLabelEra>{rowEraText}</RowLabelEra>}
      </RowLabel>
      <RowTrack style={{ width, height: rowHeight }}>
        {orderedSegments.length > 1 && (
          <SegmentRibbons
            segments={orderedSegments}
            range={range}
            width={width}
          />
        )}
        {packed.map((seg) => (
          <SegmentBars
            key={seg.segmentId}
            packed={seg}
            range={range}
            width={width}
            highlightYear={highlightYear}
            onSelectBar={(bar) => onSelectBar?.(bar, row)}
          />
        ))}
        {!isLoading && totalBars === 0 && (
          <EmptyTrackHint>
            <span>등록된 재임 기록이 없습니다</span>
            {onJumpToCountry && orderedSegments[0] && (
              <InlineGhostButton
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  const seg = orderedSegments[0]!
                  onJumpToCountry(seg.kind, seg.countryId)
                }}
              >
                인물 등록하러 가기
              </InlineGhostButton>
            )}
            <InlineGhostButton
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onRemoveRow(row.rowId)
              }}
            >
              이 행 제거
            </InlineGhostButton>
          </EmptyTrackHint>
        )}
        {!isLoading && totalBars > 0 && visibleBars === 0 && (
          <OutOfRangeHint>
            <span>
              현재 범위 밖에 <strong>{totalBars}건</strong> 있음
            </span>
            {jumpRange && (
              <InlinePrimaryButton
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onJumpToRange(jumpRange)
                }}
              >
                해당 시대로 이동
              </InlinePrimaryButton>
            )}
          </OutOfRangeHint>
        )}
        {isLoading && <LoadingSkeleton aria-label="불러오는 중" />}
      </RowTrack>
    </RowWrapper>
  )
}

/**
 * 행 단위 props가 그대로면 리렌더를 건너뛴다. 팬·줌으로 `range`만 바뀌는 흔한 경우엔
 * 어차피 막대를 다시 배치해야 하므로 리렌더되지만, 다른 행의 hover·핀 조작 등으로 인한
 * 부모 리렌더에는 영향받지 않는다 (segmentResults 참조가 안정적이라 가능).
 */
export const TimelineRow = memo(TimelineRowImpl)

function countBarsInRange(bars: TenureBar[], range: YearRange): number {
  return bars.reduce((n, bar) => {
    const start = bar.startJulian
    const end = bar.endJulian ?? range.endYear
    return end >= range.startYear && start <= range.endYear ? n + 1 : n
  }, 0)
}

interface SegmentBarsProps {
  packed: PackedSegment
  range: YearRange
  width: number
  highlightYear: number | null
  onSelectBar?: (bar: TenureBar) => void
}

/**
 * 행 위쪽에 segment별 가는 색 띠 + 작은 이름 라벨을 그려 한 행이 어떻게 시간으로 분할되는지 보이게 한다.
 * 분할 경계는 lifespanStartYear/EndYear 기준 — 둘 중 하나라도 없으면 표시 안 함.
 *
 * "현재까지" 살아있는 국가는 dashed 우측 보더 + ▶ 마커로 표현해, 범위에 따라 길이가 변한다는 점을 명확히 한다.
 */
function SegmentRibbons({
  segments,
  range,
  width,
}: {
  segments: import('../model/types').PinnedSegment[]
  range: YearRange
  width: number
}) {
  const NOW_YEAR = new Date().getFullYear()
  const items = useMemo(() => {
    return segments.map((seg) => {
      const start = seg.lifespanStartYear ?? range.startYear
      const ongoing =
        seg.kind === 'COUNTRY' ||
        (seg.kind === 'HISTORICAL' && seg.lifespanEndYear == null)
      const end = ongoing ? Math.max(NOW_YEAR, range.endYear) : seg.lifespanEndYear!
      if (end < range.startYear || start > range.endYear) return null
      const x1 = yearToX(Math.max(start, range.startYear), range, width)
      const x2 = yearToX(Math.min(end, range.endYear), range, width)
      const left = Math.min(x1, x2)
      const w = Math.max(8, Math.abs(x2 - x1))
      return {
        seg,
        left,
        w,
        color: ribbonColorFor(seg.kind, seg.countryId),
        ongoing: ongoing && end >= range.endYear,
      }
    })
  }, [segments, range, width, NOW_YEAR])

  return (
    <>
      {items.map((it) => {
        if (!it) return null
        return (
          <Ribbon
            key={it.seg.segmentId}
            $ongoing={it.ongoing}
            style={{
              left: it.left,
              width: it.w,
              background: it.color,
              color: it.color,
            }}
          >
            {it.w >= 56 && <RibbonLabel>{it.seg.name}</RibbonLabel>}
            {it.ongoing && <RibbonOngoingMarker aria-hidden>▶</RibbonOngoingMarker>}
          </Ribbon>
        )
      })}
    </>
  )
}

function SegmentBars({ packed, range, width, highlightYear, onSelectBar }: SegmentBarsProps) {
  const tooltip = useHeadsTooltip()

  /** ←/→ 키로 인접 막대로 포커스 이동 — DOM 순서 기반. 다른 위젯 막대로 새지 않게 캔버스로 스코프 한정 */
  const handleArrowNav = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    const scope: ParentNode =
      e.currentTarget.closest('[data-hos-canvas]') ?? document
    const all = Array.from(
      scope.querySelectorAll<HTMLDivElement>('[data-tenure-bar="1"]'),
    )
    const idx = all.indexOf(e.currentTarget)
    if (idx < 0) return
    const target = e.key === 'ArrowLeft' ? all[idx - 1] : all[idx + 1]
    if (target) {
      e.preventDefault()
      target.focus()
    }
  }

  return (
    <>
      {packed.bars.map(({ bar, lane }) => {
        const startYear = bar.startJulian
        const endYear = bar.endJulian ?? range.endYear
        const x1 = yearToX(startYear, range, width)
        const x2 = yearToX(endYear, range, width)
        const left = Math.min(x1, x2)
        const w = Math.max(2, Math.abs(x2 - x1))
        const isInRange = endYear >= range.startYear && startYear <= range.endYear
        if (!isInRange) return null
        const isHighlightedByYear =
          highlightYear != null &&
          startYear <= highlightYear &&
          (bar.endJulian == null || bar.endJulian >= highlightYear)
        const dimmed = highlightYear != null && !isHighlightedByYear
        const ongoing = bar.endDate == null
        const top = ROW_VPAD_TOP + lane * (BAR_HEIGHT + LANE_GAP)
        const labelText = formatBarLabel(bar)

        const clickable = onSelectBar != null
        return (
          <BarShell
            key={bar.id}
            data-tenure-bar="1"
            style={{ left, width: w, top, height: BAR_HEIGHT }}
            $category={bar.positionCategory}
            $dimmed={dimmed}
            $highlighted={isHighlightedByYear}
            $ongoing={ongoing}
            $clickable={clickable}
            tabIndex={0}
            role={clickable ? 'button' : 'listitem'}
            aria-label={ariaLabelFor(bar)}
            onClick={(e) => {
              if (!clickable) return
              e.stopPropagation()
              onSelectBar!(bar)
            }}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && clickable) {
                e.preventDefault()
                onSelectBar!(bar)
                return
              }
              handleArrowNav(e)
            }}
            onMouseEnter={(e) =>
              tooltip.show(e.clientX, e.clientY, <BarTooltipContent bar={bar} clickable={clickable} />)
            }
            onMouseMove={(e) => tooltip.move(e.clientX, e.clientY)}
            onMouseLeave={() => tooltip.hide()}
            onFocus={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              tooltip.show(
                rect.left + rect.width / 2,
                rect.top,
                <BarTooltipContent bar={bar} clickable={clickable} />,
              )
            }}
            onBlur={() => tooltip.hide()}
          >
            <CategoryGlyph aria-hidden>{categoryGlyph(bar.positionCategory)}</CategoryGlyph>
            <BarLabel>{labelText}</BarLabel>
          </BarShell>
        )
      })}
    </>
  )
}

function categoryGlyph(c: TenureBar['positionCategory']): string {
  return CATEGORY_TOKENS[c].glyph
}

function BarTooltipContent({ bar, clickable }: { bar: TenureBar; clickable?: boolean }) {
  const display = bar.regnalName ?? bar.personName ?? '미상'
  const titleLine = (() => {
    if (bar.positionTitle && bar.ordinal != null)
      return `${bar.ordinal}대 ${bar.positionTitle}`
    if (bar.positionTitle) return bar.positionTitle
    if (bar.ordinal != null) return `${bar.ordinal}대`
    return null
  })()
  const sd = bar.startDate?.slice(0, 10)
  const ed = bar.endDate?.slice(0, 10)
  const periodLine = sd && ed ? `${sd} ~ ${ed}` : sd ? `${sd} ~ 재임 중` : null

  return (
    <TooltipBody>
      <TooltipName>
        {display}
        {bar.regnalName && bar.personName && bar.regnalName !== bar.personName && (
          <TooltipNameSub> ({bar.personName})</TooltipNameSub>
        )}
      </TooltipName>
      {titleLine && <TooltipMeta>{titleLine}</TooltipMeta>}
      {periodLine && <TooltipPeriod>{periodLine}</TooltipPeriod>}
      {clickable && <TooltipHint>클릭 — 인물 정보</TooltipHint>}
    </TooltipBody>
  )
}

function ariaLabelFor(bar: TenureBar): string {
  const parts: string[] = []
  parts.push(bar.regnalName ?? bar.personName ?? '미상')
  if (bar.positionTitle && bar.ordinal != null)
    parts.push(`${bar.ordinal}대 ${bar.positionTitle}`)
  else if (bar.positionTitle) parts.push(bar.positionTitle)
  else if (bar.ordinal != null) parts.push(`${bar.ordinal}대`)
  if (bar.startDate)
    parts.push(
      bar.endDate
        ? `${bar.startDate.slice(0, 10)} ~ ${bar.endDate.slice(0, 10)}`
        : `${bar.startDate.slice(0, 10)} ~ 재임 중`,
    )
  return parts.join(', ')
}

function formatBarLabel(bar: TenureBar): string {
  const display = bar.regnalName ?? bar.personName ?? '미상'
  if (bar.ordinal != null) return `${bar.ordinal}대 ${display}`
  return display
}

/**
 * 행 라벨 아래 작은 회색 시대 텍스트 — segment lifespan을 합쳐 "1392 ~ 현재" 형태로 표기.
 * 정보가 부족하면 빈 문자열 반환.
 */
function formatRowEra(
  segments: import('../model/types').PinnedSegment[],
): string {
  const starts = segments
    .map((s) => s.lifespanStartYear)
    .filter((y): y is number => y != null)
  const hasModern = segments.some((s) => s.kind === 'COUNTRY')
  const ends = segments
    .map((s) => s.lifespanEndYear)
    .filter((y): y is number => y != null)
  if (starts.length === 0 && !hasModern) return ''
  const start = starts.length > 0 ? Math.min(...starts) : null
  const end = hasModern ? null : ends.length > 0 ? Math.max(...ends) : null
  return formatYearRange({ startYear: start, endYear: end, ongoing: hasModern })
}

const RowWrapper = styled.div`
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  transition: height 0.18s ease;
`

const RowLabel = styled.div`
  flex-shrink: 0;
  width: 220px;
  padding: 8px 16px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  border-right: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.primary};
  position: sticky;
  left: 0;
  z-index: 1;
`

const RowLabelMain = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
`

const RowLabelEra = styled.span`
  font-size: 10px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const LabelSeparator = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 500;
  margin: 0 2px;
`

const RowTrack = styled.div`
  position: relative;
  transition: height 0.18s ease;
`

const Ribbon = styled.div<{ $ongoing: boolean }>`
  position: absolute;
  top: 4px;
  height: 3px;
  border-radius: 2px;
  ${({ $ongoing }) =>
    $ongoing &&
    css`
      border-radius: 2px 0 0 2px;
      &::after {
        content: '';
        position: absolute;
        right: -8px;
        top: -2px;
        width: 8px;
        height: 7px;
        border-right: 2px dashed currentColor;
        opacity: 0.6;
      }
    `}
`

const RibbonLabel = styled.span`
  position: absolute;
  top: 5px;
  left: 4px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  pointer-events: none;
`

const RibbonOngoingMarker = styled.span`
  position: absolute;
  right: -10px;
  top: -6px;
  font-size: 11px;
  color: inherit;
  opacity: 0.55;
  pointer-events: none;
`

const EmptyTrackHint = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding-left: 12px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 500;
`

const LoadingTrackHint = styled(EmptyTrackHint)``

/**
 * 행 로딩 시 가짜 막대 3개를 흐릿한 회색으로 그려 layout shift를 줄인다.
 */
const LoadingSkeleton = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  &::before,
  &::after {
    content: '';
    position: absolute;
    border-radius: 6px;
    background: linear-gradient(
      90deg,
      ${({ theme }) =>
          theme.mode === 'dark'
            ? 'rgba(148, 163, 184, 0.10)'
            : 'rgba(148, 163, 184, 0.18)'}
        0%,
      ${({ theme }) =>
          theme.mode === 'dark'
            ? 'rgba(148, 163, 184, 0.18)'
            : 'rgba(148, 163, 184, 0.32)'}
        50%,
      ${({ theme }) =>
          theme.mode === 'dark'
            ? 'rgba(148, 163, 184, 0.10)'
            : 'rgba(148, 163, 184, 0.18)'}
        100%
    );
    background-size: 200% 100%;
    animation: shimmer 1.6s ease-in-out infinite;
  }
  &::before {
    top: 18px;
    height: 26px;
    left: 8%;
    width: 28%;
  }
  &::after {
    top: 18px;
    height: 26px;
    left: 42%;
    width: 24%;
    animation-delay: 0.4s;
  }
  @keyframes shimmer {
    0% {
      background-position: 100% 50%;
    }
    100% {
      background-position: 0% 50%;
    }
  }
`

const OutOfRangeHint = styled(EmptyTrackHint)`
  font-style: italic;
  color: ${({ theme }) => theme.colors.text.secondary};
  strong {
    color: ${({ theme }) => theme.colors.primary};
    font-weight: 700;
  }
`

const InlineGhostButton = styled.button`
  border: 1px solid ${({ theme }) => theme.colors.border.medium};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11px;
  font-weight: 600;
  border-radius: 6px;
  padding: 3px 8px;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    border-color: ${({ theme }) => theme.colors.border.medium};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const InlinePrimaryButton = styled.button`
  border: none;
  background: ${({ theme }) => theme.colors.activeLight};
  color: ${({ theme }) => theme.colors.primary};
  font-size: 11px;
  font-weight: 700;
  border-radius: 6px;
  padding: 3px 10px;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.colors.primary};
    color: #ffffff;
  }
`

const BarShell = styled.div<{
  $category: TenureBar['positionCategory']
  $dimmed: boolean
  $highlighted: boolean
  $ongoing: boolean
  $clickable: boolean
}>`
  position: absolute;
  display: flex;
  align-items: center;
  gap: 4px;
  border-radius: 6px;
  padding: 0 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  transition: opacity 0.15s, box-shadow 0.15s, transform 0.15s;
  border: 1px solid transparent;
  outline: none;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);

  ${({ $category, theme }) => {
    const t = CATEGORY_TOKENS[$category].bar[theme.mode === 'dark' ? 'dark' : 'light']
    return css`
      background: ${t.background};
      border-color: ${t.border};
      color: ${t.color};
    `
  }}

  ${({ $dimmed }) =>
    $dimmed &&
    css`
      opacity: 0.22;
    `}

  ${({ $highlighted }) =>
    $highlighted &&
    css`
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.35),
        0 0 0 2px #ef4444,
        0 4px 14px rgba(239, 68, 68, 0.28);
      transform: translateY(-1px);
      z-index: 2;
    `}

  ${({ $ongoing }) =>
    $ongoing &&
    css`
      border-right: 2px dashed currentColor;
      border-radius: 6px 2px 2px 6px;
      padding-right: 14px;
      &::after {
        content: '→';
        position: absolute;
        right: 4px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 10px;
        font-weight: 800;
        opacity: 0.7;
      }
    `}

  &:hover, &:focus-visible {
    z-index: 3;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.35),
      0 4px 12px rgba(0, 0, 0, 0.18);
  }
  &:focus-visible {
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.primary};
  }
`

const CategoryGlyph = styled.span`
  display: inline-block;
  font-size: 10px;
  line-height: 1;
  opacity: 0.85;
  flex-shrink: 0;
`

// 카테고리 시각 토큰은 lib/category-tokens.ts 에서 단일화 — 막대 스타일은 styled 변수로 인라인.

const BarLabel = styled.span`
  display: inline-block;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
`

const TooltipBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
`

const TooltipName = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: inherit;
`

const TooltipNameSub = styled.span`
  font-size: 12px;
  font-weight: 500;
  opacity: 0.7;
`

const TooltipMeta = styled.div`
  font-size: 11px;
  font-weight: 600;
  opacity: 0.85;
`

const TooltipPeriod = styled.div`
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  opacity: 0.7;
`

const TooltipHint = styled.div`
  font-size: 10px;
  font-weight: 600;
  margin-top: 2px;
  padding-top: 4px;
  border-top: 1px solid rgba(127, 127, 127, 0.25);
  opacity: 0.6;
`
