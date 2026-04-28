/**
 * Time Pivot — 기본. 십년대 챕터로 그룹핑.
 *
 * 챕터 헤더: [1860년대 ════════] [N건]
 * 본문: 사건 행들 (시간순) + 인라인 확장
 *
 * @tanstack/react-virtual 기반 가상 스크롤. 챕터 구분/이벤트 행/확장 영역을
 * 평탄 row 시퀀스로 펼친 뒤 가상화한다. 외부 스크롤 컨테이너(LedgerScroller)는
 * 부모가 ref로 제공한다.
 */
import React, { useMemo } from 'react'

import { useVirtualizer } from '@tanstack/react-virtual'
import styled from 'styled-components'

import {
  DIGIT_DISPLAY,
  centuryLabel,
  centuryOf,
  decadeLabel,
  decadeOf,
  ledgerHairline,
} from '../../styles/ledger-tokens'
import type { HistoricalEvent } from '@/entities/event/model'
import {
  groupBy,
  sortByStartYearAsc,
  startYearOf,
} from '../../lib/group-utils'
import { EmptyState } from '../empty-state'
import { EventRow } from '../event-row'
import { EventRowExpansion } from '../event-row-expansion'

interface Props {
  events: HistoricalEvent[]
  expandedEventId: string | null
  onToggleExpand: (id: string) => void
  onSelectChild: (id: string) => void
  scrollerRef: React.RefObject<HTMLDivElement | null>
}

interface DecadeChapter {
  decade: number
  century: number
  events: HistoricalEvent[]
}

type Row =
  | { kind: 'century'; key: string; century: number }
  | { kind: 'header'; key: string; decade: number; count: number }
  | { kind: 'event'; key: string; event: HistoricalEvent; expanded: boolean }
  | { kind: 'expansion'; key: string; event: HistoricalEvent }
  | { kind: 'pad'; key: string }

const ESTIMATED = {
  century: 38,
  header: 50,
  event: 44,
  expansion: 220,
  pad: 80,
}

export const TimePivot: React.FC<Props> = ({
  events,
  expandedEventId,
  onToggleExpand,
  onSelectChild,
  scrollerRef,
}) => {
  const chapters = useMemo<DecadeChapter[]>(() => {
    const byDecade = groupBy(events, (evt) => {
      const year = startYearOf(evt)
      return year === null ? null : decadeOf(year)
    })
    byDecade.delete(null)
    return Array.from(byDecade.entries())
      .map(([decade, evts]) => ({
        decade: decade as number,
        century: centuryOf(decade as number),
        events: sortByStartYearAsc(evts),
      }))
      .sort((first, second) => first.decade - second.decade)
  }, [events])

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = []
    let prevCentury: number | null = null
    for (const item of chapters) {
      if (item.century !== prevCentury) {
        out.push({ kind: 'century', key: `c-${item.century}`, century: item.century })
        prevCentury = item.century
      }
      out.push({
        kind: 'header',
        key: `h-${item.decade}`,
        decade: item.decade,
        count: item.events.length,
      })
      for (const evt of item.events) {
        const expanded = evt.id === expandedEventId
        out.push({ kind: 'event', key: `e-${evt.id}`, event: evt, expanded })
        if (expanded) {
          out.push({ kind: 'expansion', key: `x-${evt.id}`, event: evt })
        }
      }
    }
    if (out.length > 0) out.push({ kind: 'pad', key: 'pad' })
    return out
  }, [chapters, expandedEventId])

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollerRef.current ?? null,
    estimateSize: (idx) => {
      const row = rows[idx]
      if (!row) return ESTIMATED.event
      switch (row.kind) {
        case 'century':
          return ESTIMATED.century
        case 'header':
          return ESTIMATED.header
        case 'event':
          return ESTIMATED.event
        case 'expansion':
          return ESTIMATED.expansion
        case 'pad':
          return ESTIMATED.pad
      }
    },
    getItemKey: (idx) => rows[idx]?.key ?? idx,
    overscan: 8,
  })

  if (chapters.length === 0) {
    return (
      <EmptyState
        title="표시할 사건이 없습니다"
        hint="위 렌즈 칩을 풀거나 다른 축으로 봐 보세요."
      />
    )
  }

  const items = virtualizer.getVirtualItems()
  const totalSize = virtualizer.getTotalSize()

  return (
    <Outer style={{ height: `${totalSize}px` }}>
      {items.map((vi) => {
        const row = rows[vi.index]
        if (!row) return null
        return (
          <RowSlot
            key={vi.key}
            data-index={vi.index}
            ref={virtualizer.measureElement}
            style={{ transform: `translateY(${vi.start}px)` }}
          >
            <RowInner>
              {row.kind === 'century' && (
                <CenturyDivider>
                  <CenturyText>{centuryLabel(row.century)}</CenturyText>
                  <CenturyLine />
                </CenturyDivider>
              )}
              {row.kind === 'header' && (
                <ChapterHeader>
                  <ChapterLabel>{decadeLabel(row.decade)}</ChapterLabel>
                  <ChapterRule />
                  <ChapterCount>{row.count.toLocaleString()}</ChapterCount>
                </ChapterHeader>
              )}
              {row.kind === 'event' && (
                <EventRow
                  event={row.event}
                  expanded={row.expanded}
                  onToggleExpand={onToggleExpand}
                />
              )}
              {row.kind === 'expansion' && (
                <EventRowExpansion event={row.event} onSelectChild={onSelectChild} />
              )}
              {row.kind === 'pad' && <BottomPad />}
            </RowInner>
          </RowSlot>
        )
      })}
    </Outer>
  )
}

const Outer = styled.div`
  position: relative;
  width: 100%;
`

const RowSlot = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
`

const RowInner = styled.div`
  max-width: 1100px;
  margin: 0 auto;
`

const CenturyDivider = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px 4px;
`

const CenturyText = styled.h2`
  ${DIGIT_DISPLAY}
  margin: 0;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CenturyLine = styled.div`
  flex: 1;
  height: 1px;
  background: linear-gradient(
    90deg,
    rgba(99, 102, 241, 0.32),
    transparent
  );
`

const ChapterHeader = styled.header`
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 4px 20px 4px 16px;
`

const ChapterLabel = styled.h3`
  ${DIGIT_DISPLAY}
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.025em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ChapterRule = styled.div`
  flex: 1;
  height: 1px;
  background: ${({ theme }) => ledgerHairline(theme.mode)};
`

const ChapterCount = styled.span`
  ${DIGIT_DISPLAY}
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const BottomPad = styled.div`
  height: 80px;
`
