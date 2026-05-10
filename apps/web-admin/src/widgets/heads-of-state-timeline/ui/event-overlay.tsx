/**
 * timeline 행 위쪽(헤더 바로 아래)에 사용자가 추가한 사건들을 색 띠로 표시.
 * 호버 시 제목 노출, 클릭 시 사건 기간(startYear-endYear) 전체 highlight.
 */
import { useMemo } from 'react'
import styled, { useTheme } from 'styled-components'

import { eventToneFor, type EventColorTone } from '../lib/event-color'
import { toJulianYear, yearToX } from '../lib/time-scale'
import type { YearRange } from '../model/types'
import type { OverlayEvent } from '../model/use-event-overlay'
import { useHeadsTooltip } from './tooltip'

interface Props {
  events: OverlayEvent[]
  range: YearRange
  labelWidth: number
  trackWidth: number
  /** 사건 클릭 시 (Cmd/Ctrl) 가이드라인 점프 */
  onJumpToYear: (year: number) => void
  /** 사건 클릭 시 인물 상세는 아니지만 사건 상세 페이지 진입 옵션 */
  onSelectEvent?: (eventId: string) => void
  /** 클릭 시 startYear-endYear 기간 highlight 토글 */
  onHighlightPeriod?: (period: { startYear: number; endYear: number } | null) => void
  highlightPeriod: { startYear: number; endYear: number } | null
  /** 우클릭/✕ 으로 단일 사건 제거 */
  onRemove?: (eventId: string) => void
}

const ROW_HEIGHT = 22
const ROW_GAP = 2
const PAD_TOP = 6
const PAD_BOTTOM = 6
const MIN_W = 4

interface Item {
  id: string
  title: string
  start: number
  end: number
  hasEnd: boolean
  left: number
  width: number
  lane: number
  tone: EventColorTone
}

function packLanes(items: Omit<Item, 'lane'>[]): Item[] {
  const sorted = [...items].sort((a, b) => a.start - b.start)
  const laneEnds: number[] = []
  return sorted.map((it) => {
    let lane = -1
    for (let i = 0; i < laneEnds.length; i++) {
      const end = laneEnds[i]
      if (end != null && end <= it.start) {
        lane = i
        break
      }
    }
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(it.end)
    } else {
      laneEnds[lane] = it.end
    }
    return { ...it, lane }
  })
}

export function EventOverlay({
  events,
  range,
  labelWidth,
  trackWidth,
  onJumpToYear,
  onSelectEvent,
  onHighlightPeriod,
  highlightPeriod,
  onRemove,
}: Props) {
  const tooltip = useHeadsTooltip()
  const theme = useTheme()
  const isDark = theme?.mode === 'dark'

  const items = useMemo<Item[]>(() => {
    const base = events
      .map((ev) => {
        const start = toJulianYear(ev.startDate)
        const hasEnd = !!ev.endDate
        const end = ev.endDate ? toJulianYear(ev.endDate) : start + 0.25
        if (end < range.startYear || start > range.endYear) return null
        const x1 = yearToX(Math.max(start, range.startYear), range, trackWidth)
        const x2 = yearToX(Math.min(end, range.endYear), range, trackWidth)
        const left = Math.min(x1, x2)
        const width = Math.max(MIN_W, Math.abs(x2 - x1))
        return {
          id: ev.id,
          title: ev.title,
          start,
          end,
          hasEnd,
          left,
          width,
          tone: eventToneFor(ev.categoryName, isDark),
        }
      })
      .filter((x): x is NonNullable<typeof x> => x != null)
    return packLanes(base)
  }, [events, range, trackWidth, isDark])

  const laneCount = useMemo(
    () => items.reduce((acc, it) => Math.max(acc, it.lane + 1), 1),
    [items],
  )
  const height = PAD_TOP + PAD_BOTTOM + laneCount * ROW_HEIGHT + (laneCount - 1) * ROW_GAP

  if (events.length === 0) return null

  return (
    <Wrap style={{ height }} data-no-pan>
      <LabelSlot style={{ width: labelWidth }}>
        <LabelText>사건 ({events.length})</LabelText>
      </LabelSlot>
      <Track style={{ width: trackWidth }}>
        {items.map((it) => {
          const isActive =
            highlightPeriod != null &&
            Math.round(highlightPeriod.startYear) === Math.round(it.start) &&
            Math.round(highlightPeriod.endYear) === Math.round(it.end)
          return (
            <Pill
              key={it.id}
              type="button"
              data-tooltip-trigger="1"
              $active={isActive}
              style={{
                left: it.left,
                width: it.width,
                top: PAD_TOP + it.lane * (ROW_HEIGHT + ROW_GAP),
                height: ROW_HEIGHT,
                background: it.tone.background,
                borderColor: it.tone.border,
                color: it.tone.color,
              }}
              onContextMenu={(e) => {
                if (!onRemove) return
                e.preventDefault()
                e.stopPropagation()
                onRemove(it.id)
              }}
              onMouseEnter={(e) =>
                tooltip.show(
                  e.clientX,
                  e.clientY,
                  <TooltipBody>
                    <strong>{it.title}</strong>
                    <span>
                      {fmt(it.start)}
                      {it.hasEnd ? ` ~ ${fmt(it.end)}` : ''}
                    </span>
                    <Hint>
                      {[
                        onHighlightPeriod ? '클릭: 기간 강조' : '클릭: 가이드라인',
                        onHighlightPeriod ? 'Shift+클릭: 가이드라인' : null,
                        onSelectEvent ? 'Alt+클릭: 사건 상세' : null,
                        onRemove ? '우클릭: 제거' : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Hint>
                  </TooltipBody>,
                )
              }
              onMouseMove={(e) => tooltip.move(e.clientX, e.clientY)}
              onMouseLeave={() => tooltip.hide()}
              onClick={(e) => {
                e.stopPropagation()
                if (e.shiftKey) {
                  onJumpToYear(Math.round(it.start))
                  return
                }
                if (e.altKey && onSelectEvent) {
                  onSelectEvent(it.id)
                  return
                }
                if (onHighlightPeriod) {
                  if (isActive) {
                    onHighlightPeriod(null)
                  } else {
                    onHighlightPeriod({
                      startYear: Math.round(it.start),
                      endYear: Math.round(it.end),
                    })
                  }
                } else {
                  onJumpToYear(Math.round(it.start))
                }
              }}
              aria-label={`${it.title} — ${Math.round(it.start)}년${
                it.hasEnd ? ` ~ ${Math.round(it.end)}년` : ''
              }`}
              aria-pressed={isActive}
            >
              <PillLabel>{it.title}</PillLabel>
            </Pill>
          )
        })}
      </Track>
    </Wrap>
  )
}

function fmt(y: number): string {
  if (!Number.isFinite(y)) return '진행 중'
  if (y < 0) return `BC ${Math.abs(Math.round(y))}`
  return String(Math.round(y))
}

const Wrap = styled.div`
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.03)'
      : 'rgba(0, 0, 0, 0.02)'};
`

const LabelSlot = styled.div`
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

const LabelText = styled.span`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-transform: uppercase;
  font-variant-numeric: tabular-nums;
`

const Track = styled.div`
  position: relative;
`

const Pill = styled.button<{ $active: boolean }>`
  position: absolute;
  border: 1px solid;
  border-radius: 6px;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: -0.01em;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  overflow: hidden;
  white-space: nowrap;
  transition: filter 0.15s, transform 0.15s, box-shadow 0.15s;
  box-shadow: ${({ $active }) =>
    $active ? '0 0 0 2px rgba(99, 102, 241, 0.55)' : 'inset 0 1px 0 rgba(255, 255, 255, 0.25)'};
  &:hover {
    filter: brightness(1.05);
    transform: translateY(-1px);
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 1px;
  }
`

const PillLabel = styled.span`
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
`

const TooltipBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  strong {
    font-size: 12px;
    font-weight: 700;
    color: inherit;
  }
  span {
    font-size: 11px;
    opacity: 0.75;
    font-variant-numeric: tabular-nums;
  }
`

const Hint = styled.div`
  font-size: 10px;
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid rgba(127, 127, 127, 0.25);
  opacity: 0.6;
`
