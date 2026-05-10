import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import styled from 'styled-components'

import type { PinnedRow, PinnedSegment, YearRange } from '../model/types'
import type { RowTenuresResult } from '../api/use-all-rows-tenures'
import type { TenureBar } from '../lib/normalize-tenures'
import { formatYear } from '../lib/format-year'
import { EmptyPresets } from './empty-presets'
import { TimelineRow } from './timeline-row'
import { EventOverlay } from './event-overlay'
import type { OverlayEvent } from '../model/use-event-overlay'

interface Props {
  rows: PinnedRow[]
  range: YearRange
  onRangeChange: (next: YearRange) => void
  highlightYear: number | null
  onHighlightYearChange: (year: number | null) => void
  /** 빈 상태 프리셋이 호출 — 여러 segment를 일괄 추가 */
  onPickMany: (segments: Omit<PinnedSegment, 'segmentId'>[]) => void
  rowsTenures: RowTenuresResult[]
  onRemoveRow: (rowId: string) => void
  /** 컨텐츠 폭 측정용 ref도 함께 — 부모에서 동시대 패널 폭과 동기화 가능 */
  labelWidth?: number
  /** 사건 오버레이 (있으면 timeline 위쪽에 띠로 표시) */
  events?: OverlayEvent[]
  /** 막대 클릭 → (bar, row) 페이지 모달 열기 */
  onSelectBar?: (bar: TenureBar, row: PinnedRow) => void
  /** 사건 클릭 시 페이지 단위로 처리 */
  onSelectEvent?: (eventId: string) => void
  onJumpToCountry?: (kind: 'COUNTRY' | 'HISTORICAL', countryId: string) => void
  /** 사건 클릭 시 startYear-endYear 범위 highlight (period 모드) */
  onHighlightPeriod?: (period: { startYear: number; endYear: number } | null) => void
  highlightPeriod?: { startYear: number; endYear: number } | null
  /** URL pins 적용 중 (옵션 fetch 대기) — EmptyHero 대신 skeleton */
  isApplyingUrlPins?: boolean
  /** 우클릭으로 사건 단건 제거 */
  onRemoveEvent?: (eventId: string) => void
  /** 카테고리 필터 */
  categoryFilter?: (c: TenureBar['positionCategory']) => boolean
}

const DEFAULT_LABEL_WIDTH = 220
const MIN_TRACK_WIDTH = 800
const MIN_SPAN = 30
const MAX_SPAN = 6000

export function TimelineCanvas({
  rows,
  range,
  onRangeChange,
  highlightYear,
  onHighlightYearChange,
  onPickMany,
  rowsTenures,
  onRemoveRow,
  labelWidth = DEFAULT_LABEL_WIDTH,
  events,
  onSelectBar,
  onSelectEvent,
  onJumpToCountry,
  onHighlightPeriod,
  highlightPeriod,
  isApplyingUrlPins,
  onRemoveEvent,
  categoryFilter,
}: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [trackWidth, setTrackWidth] = useState<number>(MIN_TRACK_WIDTH)
  const [hoverYear, setHoverYear] = useState<number | null>(null)

  // 컨테이너 폭에 맞춰 트랙 폭 계산
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const calc = () => {
      const rect = el.getBoundingClientRect()
      setTrackWidth(Math.max(MIN_TRACK_WIDTH, Math.floor(rect.width - labelWidth)))
    }
    calc()
    const ro = new ResizeObserver(calc)
    ro.observe(el)
    return () => ro.disconnect()
  }, [labelWidth])

  // ESC로 가이드라인 해제 — 표준 단축키
  useEffect(() => {
    if (highlightYear == null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onHighlightYearChange(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [highlightYear, onHighlightYearChange])

  // 빨간 세로 가이드라인 위치 — 라벨 영역(labelWidth)을 건너뛴 트랙 위 좌표
  const highlightX = useMemo(() => {
    if (highlightYear == null) return null
    const span = range.endYear - range.startYear
    if (span <= 0) return null
    if (highlightYear < range.startYear || highlightYear > range.endYear)
      return null
    return labelWidth + ((highlightYear - range.startYear) / span) * trackWidth
  }, [highlightYear, range, trackWidth, labelWidth])

  const hoverX = useMemo(() => {
    if (hoverYear == null) return null
    const span = range.endYear - range.startYear
    if (span <= 0) return null
    if (hoverYear < range.startYear || hoverYear > range.endYear) return null
    return labelWidth + ((hoverYear - range.startYear) / span) * trackWidth
  }, [hoverYear, range, trackWidth, labelWidth])

  const yearFromClientX = useCallback(
    (clientX: number, opts: { allowHeader?: boolean } = {}): number | null => {
      const el = scrollRef.current
      if (!el) return null
      const wrapRect = el.getBoundingClientRect()
      const xInTrack = clientX - wrapRect.left + el.scrollLeft - labelWidth
      if (xInTrack < 0 || xInTrack > trackWidth) {
        if (opts.allowHeader) return null
        return null
      }
      const span = range.endYear - range.startYear
      if (span <= 0) return null
      return Math.round(range.startYear + (xInTrack / trackWidth) * span)
    },
    [labelWidth, trackWidth, range],
  )

  /** Pan 드래그 — 라벨 영역 밖에서만 시작 */
  const panRef = useRef<{
    startClientX: number
    startRange: YearRange
  } | null>(null)
  const [isPanning, setIsPanning] = useState(false)

  const onPanMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    // 막대·인터랙티브 자식 클릭이면 무시
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('[data-no-pan]')) return
    panRef.current = {
      startClientX: e.clientX,
      startRange: range,
    }
    setIsPanning(false)
  }

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const p = panRef.current
      if (!p) return
      const dx = e.clientX - p.startClientX
      // Mac trackpad 미세 진동 노이즈 흡수 — 7px 이하 무시
      if (!isPanning && Math.abs(dx) < 7) return
      if (!isPanning) setIsPanning(true)
      const span = p.startRange.endYear - p.startRange.startYear
      const yearsPerPx = span / trackWidth
      const delta = -dx * yearsPerPx
      onRangeChange({
        startYear: Math.round(p.startRange.startYear + delta),
        endYear: Math.round(p.startRange.endYear + delta),
      })
    }
    const onUp = () => {
      panRef.current = null
      // 약간의 지연 후 클릭 허용
      setTimeout(() => setIsPanning(false), 0)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [isPanning, onRangeChange, trackWidth])

  /** Wheel — 휠은 가로 pan, Ctrl/Cmd+휠은 줌 (anchor: 마우스 좌표) */
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      const wrapRect = el.getBoundingClientRect()
      const xInTrack = e.clientX - wrapRect.left + el.scrollLeft - labelWidth
      const inTrack = xInTrack >= 0 && xInTrack <= trackWidth
      if (!inTrack) return

      // Ctrl/Cmd + wheel = 줌
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const span = range.endYear - range.startYear
        const anchorYear = range.startYear + (xInTrack / trackWidth) * span
        const factor = e.deltaY > 0 ? 1.15 : 1 / 1.15
        const nextSpan = Math.max(MIN_SPAN, Math.min(MAX_SPAN, span * factor))
        const t = (anchorYear - range.startYear) / span
        const nextStart = anchorYear - t * nextSpan
        const nextEnd = nextStart + nextSpan
        onRangeChange({
          startYear: Math.round(nextStart),
          endYear: Math.round(nextEnd),
        })
        return
      }

      // 사용자가 명시적으로 가로 휠 또는 shift+휠을 사용한 경우만 timeline pan으로 해석.
      // Mac trackpad에서 무심한 vertical 스크롤도 미세한 deltaX를 동반할 수 있어,
      // shift가 아닌 일반 휠은 |deltaX| > |deltaY| 일 때만 가로 pan으로 잡고
      // 그 외엔 페이지 vertical scroll을 그대로 흘려보낸다.
      let horizontalDelta = 0
      if (e.shiftKey) {
        horizontalDelta = e.deltaY
      } else if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        horizontalDelta = e.deltaX
      }
      if (Math.abs(horizontalDelta) < 1) return
      e.preventDefault()
      // 디바이스별 정규화 — DOM_DELTA_LINE(라인 단위), DOM_DELTA_PAGE(페이지)는 px로 환산
      // (Firefox·일부 마우스에서 발생) — 1라인 ≈ 16px, 1페이지 ≈ 800px
      const normalized =
        e.deltaMode === 1
          ? horizontalDelta * 16
          : e.deltaMode === 2
          ? horizontalDelta * 800
          : horizontalDelta
      const span = range.endYear - range.startYear
      const yearsPerPx = span / trackWidth
      const delta = normalized * yearsPerPx * 0.5
      onRangeChange({
        startYear: Math.round(range.startYear + delta),
        endYear: Math.round(range.endYear + delta),
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [range, trackWidth, labelWidth, onRangeChange])

  const handleTrackClick = (e: React.MouseEvent) => {
    if (isPanning) return
    const year = yearFromClientX(e.clientX)
    if (year == null) {
      onHighlightYearChange(null)
      return
    }
    onHighlightYearChange(year)
  }

  const handleHeaderClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isPanning) return
    const year = yearFromClientX(e.clientX)
    if (year != null) onHighlightYearChange(year)
  }

  const handleTrackMouseMove = (e: React.MouseEvent) => {
    const year = yearFromClientX(e.clientX)
    setHoverYear(year)
  }

  if (rows.length === 0 && isApplyingUrlPins) {
    return (
      <Wrapper>
        <UrlLoadingHero>
          <UrlSpinner />
          <UrlText>공유된 비교 상태를 불러오는 중…</UrlText>
        </UrlLoadingHero>
      </Wrapper>
    )
  }

  if (rows.length === 0) {
    return (
      <Wrapper>
        <EmptyHero>
          <SchematicPreview aria-hidden>
            <SchematicLane>
              <SchematicLabel>🇰🇷 대한민국</SchematicLabel>
              <SchematicTrack>
                <SchematicBar style={{ left: '10%', width: '24%', background: '#dbeafe', borderColor: '#3b82f6', color: '#1e3a8a' }}>★ 24대</SchematicBar>
                <SchematicBar style={{ left: '36%', width: '20%', background: '#dbeafe', borderColor: '#3b82f6', color: '#1e3a8a' }}>★ 25대</SchematicBar>
                <SchematicBar style={{ left: '58%', width: '38%', background: '#dbeafe', borderColor: '#3b82f6', color: '#1e3a8a' }}>★ 26대</SchematicBar>
              </SchematicTrack>
            </SchematicLane>
            <SchematicLane>
              <SchematicLabel>🇺🇸 미국</SchematicLabel>
              <SchematicTrack>
                <SchematicBar style={{ left: '4%', width: '32%', background: '#dbeafe', borderColor: '#3b82f6', color: '#1e3a8a' }}>★ 44대</SchematicBar>
                <SchematicBar style={{ left: '38%', width: '32%', background: '#dbeafe', borderColor: '#3b82f6', color: '#1e3a8a' }}>★ 45대</SchematicBar>
                <SchematicBar style={{ left: '72%', width: '24%', background: '#dbeafe', borderColor: '#3b82f6', color: '#1e3a8a' }}>★ 46대</SchematicBar>
              </SchematicTrack>
            </SchematicLane>
            <SchematicLane>
              <SchematicLabel>🇬🇧 영국</SchematicLabel>
              <SchematicTrack>
                <SchematicBar style={{ left: '4%', width: '54%', background: '#fef3c7', borderColor: '#f59e0b', color: '#78350f' }}>♛ 엘리자베스 2세</SchematicBar>
                <SchematicBar style={{ left: '60%', width: '36%', background: '#fef3c7', borderColor: '#f59e0b', color: '#78350f' }}>♛ 찰스 3세</SchematicBar>
              </SchematicTrack>
            </SchematicLane>
            <SchematicGuide />
            <SchematicGuideChip>2014년</SchematicGuideChip>
          </SchematicPreview>
          <EmptyTitle>비교할 국가를 선택해 주세요</EmptyTitle>
          <EmptyDesc>
            왼쪽 사이드바에서 국가를 추가하거나 아래 추천 조합으로 바로
            시작할 수 있습니다. 시간축의 연도를 클릭하면 그 시점에 활동한
            인물들이 한눈에 보입니다.
          </EmptyDesc>
          <EmptyPresets onPickMany={onPickMany} />
        </EmptyHero>
      </Wrapper>
    )
  }

  return (
    <Wrapper
      ref={scrollRef}
      style={{ cursor: isPanning ? 'grabbing' : 'crosshair' }}
    >
      <ContentWrap
        onMouseMove={handleTrackMouseMove}
        onMouseLeave={() => setHoverYear(null)}
        onMouseDown={onPanMouseDown}
      >
        <TickHeader
          range={range}
          labelWidth={labelWidth}
          trackWidth={trackWidth}
          highlightYear={highlightYear}
          onHighlightYearChange={onHighlightYearChange}
          onHeaderClick={handleHeaderClick}
        />
        {events && events.length > 0 && (
          <EventOverlay
            events={events}
            range={range}
            labelWidth={labelWidth}
            trackWidth={trackWidth}
            onJumpToYear={onHighlightYearChange}
            onSelectEvent={onSelectEvent}
            onHighlightPeriod={onHighlightPeriod}
            highlightPeriod={highlightPeriod ?? null}
            onRemove={onRemoveEvent}
          />
        )}
        <RowsScroll onClick={handleTrackClick}>
          {rows.map((row) => {
            const tenuresForRow =
              rowsTenures.find((rt) => rt.rowId === row.rowId)?.segmentResults ?? []
            return (
              <TimelineRow
                key={row.rowId}
                row={row}
                range={range}
                width={trackWidth}
                highlightYear={highlightYear}
                segmentResults={tenuresForRow}
                onJumpToRange={onRangeChange}
                onRemoveRow={onRemoveRow}
                onSelectBar={onSelectBar}
                onJumpToCountry={onJumpToCountry}
                categoryFilter={categoryFilter}
              />
            )
          })}
        </RowsScroll>
        {highlightPeriod && (() => {
          const span = range.endYear - range.startYear
          if (span <= 0) return null
          const s = Math.max(highlightPeriod.startYear, range.startYear)
          const e = Math.min(highlightPeriod.endYear, range.endYear)
          if (e < range.startYear || s > range.endYear) return null
          const left = labelWidth + ((s - range.startYear) / span) * trackWidth
          const width = ((e - s) / span) * trackWidth
          return (
            <PeriodBand
              style={{ left, width }}
              aria-label={`${highlightPeriod.startYear}-${highlightPeriod.endYear} 기간 강조`}
            />
          )
        })()}
        {hoverX != null && hoverX !== highlightX && (
          <HoverLine style={{ left: hoverX }} aria-hidden>
            <HoverYearChip>{formatHoverYear(hoverYear ?? 0)}</HoverYearChip>
          </HoverLine>
        )}
        {highlightX != null && (
          <HighlightLine style={{ left: highlightX }} aria-hidden>
            <HighlightYearChip>{formatHoverYear(highlightYear ?? 0)}</HighlightYearChip>
          </HighlightLine>
        )}
      </ContentWrap>
    </Wrapper>
  )
}

function formatHoverYear(y: number): string {
  return formatYear(y)
}

interface TickHeaderProps {
  range: YearRange
  labelWidth: number
  trackWidth: number
  highlightYear: number | null
  onHighlightYearChange: (year: number | null) => void
  onHeaderClick: (e: React.MouseEvent) => void
}

function TickHeader({
  range,
  labelWidth,
  trackWidth,
  highlightYear,
  onHighlightYearChange,
  onHeaderClick,
}: TickHeaderProps) {
  const ticks = useMemo(() => buildTicks(range), [range])

  return (
    <HeaderWrap>
      <HeaderLabelSlot style={{ width: labelWidth }} data-no-pan>
        <HeaderHint>
          {highlightYear != null ? (
            <HighlightChip>
              <strong>{formatHoverYear(highlightYear)}</strong>년 동시대
              <ChipReset
                type="button"
                aria-label="가이드라인 해제 (ESC)"
                onClick={(e) => {
                  e.stopPropagation()
                  onHighlightYearChange(null)
                }}
              >
                ✕
              </ChipReset>
            </HighlightChip>
          ) : (
            <span>연도 클릭 · ESC로 해제 · 드래그로 이동</span>
          )}
        </HeaderHint>
      </HeaderLabelSlot>
      <HeaderTrack
        style={{ width: trackWidth }}
        role="img"
        aria-label="시간축 — 클릭으로 가이드라인"
        onClick={onHeaderClick}
      >
        {ticks.map((t) => (
          <Tick
            key={t.year}
            style={{
              left:
                ((t.year - range.startYear) / (range.endYear - range.startYear)) *
                trackWidth,
            }}
          >
            <TickLine />
            <TickLabel data-tick-label>{t.label}</TickLabel>
          </Tick>
        ))}
      </HeaderTrack>
    </HeaderWrap>
  )
}

function buildTicks(range: YearRange) {
  const span = range.endYear - range.startYear
  if (span <= 0) return []
  let step = 100
  if (span <= 50) step = 5
  else if (span <= 200) step = 20
  else if (span <= 600) step = 50
  else step = 100
  const start = Math.ceil(range.startYear / step) * step
  const ticks: { year: number; label: string }[] = []
  for (let y = start; y <= range.endYear; y += step) {
    ticks.push({ year: y, label: formatTickLabel(y) })
  }
  return ticks
}

function formatTickLabel(year: number): string {
  return formatYear(year, { showZeroAsBoundary: true })
}

const Wrapper = styled.div`
  flex: 1;
  min-width: 0;
  overflow: auto;
  background: ${({ theme }) => theme.colors.background.primary};
  user-select: none;
`

const UrlLoadingHero = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 14px;
`

const UrlSpinner = styled.div`
  width: 36px;
  height: 36px;
  border: 3px solid ${({ theme }) => theme.colors.border.light};
  border-top-color: ${({ theme }) => theme.colors.primary};
  border-radius: 50%;
  animation: hosSpin 0.9s linear infinite;
  @keyframes hosSpin {
    to {
      transform: rotate(360deg);
    }
  }
`

const UrlText = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const EmptyHero = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 48px 32px;
  text-align: center;
`

const EmptyTitle = styled.h2`
  margin: 4px 0 0;
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const EmptyDesc = styled.p`
  margin: 0;
  max-width: 460px;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SchematicPreview = styled.div`
  width: min(560px, 100%);
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.background.secondary};
  margin-bottom: 8px;
  position: relative;
  opacity: 0.95;
`

const SchematicLane = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

const SchematicLabel = styled.div`
  width: 110px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  text-align: left;
`

const SchematicTrack = styled.div`
  flex: 1;
  position: relative;
  height: 22px;
  background: ${({ theme }) => theme.colors.background.primary};
  border-radius: 4px;
`

const SchematicBar = styled.div`
  position: absolute;
  top: 1px;
  height: 20px;
  border: 1px solid;
  border-radius: 4px;
  display: flex;
  align-items: center;
  padding: 0 6px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4);
`

const SchematicGuide = styled.div`
  position: absolute;
  top: 12px;
  bottom: 12px;
  left: calc(110px + 16px + (100% - 110px - 32px) * 0.62);
  width: 2px;
  background: rgba(239, 68, 68, 0.85);
  border-radius: 1px;
  pointer-events: none;
`

const SchematicGuideChip = styled.div`
  position: absolute;
  top: 4px;
  left: calc(110px + 16px + (100% - 110px - 32px) * 0.62 - 18px);
  padding: 1px 6px;
  background: #ef4444;
  color: #fff;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: -0.01em;
`

const HeaderWrap = styled.div`
  display: flex;
  align-items: stretch;
  position: sticky;
  top: 0;
  z-index: 4;
  background: ${({ theme }) => theme.colors.background.primary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.medium};
  height: 44px;
`

const HeaderLabelSlot = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-right: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.secondary};
  position: sticky;
  left: 0;
  z-index: 1;
`

const HeaderHint = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  display: flex;
  align-items: center;
`

const HighlightChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 4px 4px 10px;
  border-radius: 999px;
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  strong {
    font-weight: 800;
  }
`

const ChipReset = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  font-size: 11px;
  font-weight: 700;
  border: none;
  background: rgba(239, 68, 68, 0.18);
  color: #b91c1c;
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.15s, transform 0.15s;
  &:hover {
    background: rgba(239, 68, 68, 0.28);
    transform: scale(1.06);
  }
  &:focus-visible {
    outline: 2px solid #ef4444;
    outline-offset: 1px;
  }
`

const HeaderTrack = styled.div`
  position: relative;
  cursor: crosshair;
  &:hover span[data-tick-label] {
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const Tick = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
`

const TickLine = styled.div`
  flex: 1;
  width: 1px;
  background: ${({ theme }) => theme.colors.border.light};
`

const TickLabel = styled.span`
  position: absolute;
  bottom: 4px;
  font-size: 10px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) => theme.colors.background.primary};
  padding: 0 4px;
  white-space: nowrap;
  transition: color 0.15s;
`

const RowsScroll = styled.div`
  display: flex;
  flex-direction: column;
`

const ContentWrap = styled.div`
  position: relative;
`

/** 사건 클릭 시 그 기간을 회색 띠로 강조 — 가이드라인 외 추가 시각 단서 */
const PeriodBand = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  background: rgba(99, 102, 241, 0.10);
  border-left: 1px dashed rgba(99, 102, 241, 0.55);
  border-right: 1px dashed rgba(99, 102, 241, 0.55);
  pointer-events: none;
  z-index: 3;
`

/** 빨간 세로 가이드라인 — 헤더 + 행 영역을 모두 가로지르는 라인 */
const HighlightLine = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  margin-left: -1px;
  background: linear-gradient(
    to bottom,
    rgba(239, 68, 68, 0.95) 0%,
    rgba(239, 68, 68, 0.6) 100%
  );
  pointer-events: none;
  z-index: 5;
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.5);
`

const HighlightYearChip = styled.span`
  position: absolute;
  top: 6px;
  left: 6px;
  padding: 2px 6px;
  border-radius: 4px;
  background: #ef4444;
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: -0.01em;
  box-shadow: 0 2px 6px rgba(239, 68, 68, 0.45);
  white-space: nowrap;
`

/** 호버 미리보기 가이드라인 — 클릭 전 정확한 연도 안내 */
const HoverLine = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  margin-left: 0;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.5)'
      : 'rgba(17, 24, 39, 0.5)'};
  pointer-events: none;
  z-index: 4;
`

const HoverYearChip = styled.span`
  position: absolute;
  top: 6px;
  left: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.92)'
      : 'rgba(17, 24, 39, 0.92)'};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#0f172a' : '#ffffff'};
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
  white-space: nowrap;
`
