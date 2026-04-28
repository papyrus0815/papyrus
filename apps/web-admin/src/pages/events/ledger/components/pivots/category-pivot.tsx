/**
 * Category Pivot — 카테고리별 보드 (kanban-like).
 *
 * 각 카테고리가 한 컬럼. 컬럼 안의 사건은 시간순.
 */
import React, { useMemo } from 'react'

import styled from 'styled-components'

import {
  DIGIT_DISPLAY,
  IMPORTANCE_OPACITY,
  type LedgerImportance,
  importanceFromHierarchy,
  ledgerHairline,
  ledgerSurface,
  resolveCategory,
  withAlpha,
} from '../../styles/ledger-tokens'
import type { HistoricalEvent } from '@/entities/event/model'
import {
  byEventCountDesc,
  sortByStartYearAsc,
  startYearOf,
} from '../../lib/group-utils'
import { EmptyState } from '../empty-state'

interface Props {
  events: HistoricalEvent[]
  onSelectEvent: (id: string) => void
  /** id로 좁혀보기 — 칩 매칭은 id 기반, label은 name */
  onAddCategoryLens: (categoryId: string, categoryName: string) => void
}

interface Column {
  /** 컬럼 식별자 = categoryId (없으면 name fallback) */
  key: string
  categoryId?: string
  categoryName: string
  color: string
  events: HistoricalEvent[]
}

export const CategoryPivot: React.FC<Props> = ({
  events,
  onSelectEvent,
  onAddCategoryLens,
}) => {
  const columns = useMemo<Column[]>(() => {
    const map = new Map<string, { name: string; id?: string; events: HistoricalEvent[] }>()
    for (const evt of events) {
      const name = evt.category || '기타'
      const key = evt.categoryId ?? name
      const bucket = map.get(key)
      if (bucket) bucket.events.push(evt)
      else map.set(key, { name, id: evt.categoryId, events: [evt] })
    }
    return Array.from(map.entries())
      .map(([key, bucket]) => ({
        key,
        categoryId: bucket.id,
        categoryName: bucket.name,
        color: resolveCategory(bucket.name).color,
        events: sortByStartYearAsc(bucket.events),
      }))
      .sort(byEventCountDesc)
  }, [events])

  if (columns.length === 0) {
    return (
      <EmptyState
        title="표시할 사건이 없습니다"
        hint="현재 렌즈 조건에 맞는 사건이 없어요."
      />
    )
  }

  return (
    <Board>
      {columns.map((col) => (
        <Column key={col.key}>
          <ColHead $color={col.color}>
            <ColAccent $color={col.color} />
            <ColName>{col.categoryName}</ColName>
            <ColCount>{col.events.length.toLocaleString()}</ColCount>
            {col.categoryId && (
              <FocusBtn
                type="button"
                onClick={() =>
                  onAddCategoryLens(col.categoryId!, col.categoryName)
                }
                title="이 카테고리로 좁혀보기"
              >
                →
              </FocusBtn>
            )}
          </ColHead>
          <ColBody>
            {col.events.map((evt) => {
              const importance: LedgerImportance = importanceFromHierarchy(
                evt.hierarchy?.importance,
                evt.hierarchy?.children?.length ?? 0,
              )
              return (
                <Card
                  key={evt.id}
                  type="button"
                  $color={col.color}
                  $opacity={IMPORTANCE_OPACITY[importance]}
                  onClick={() => onSelectEvent(evt.id)}
                >
                  <CardYear>{startYearOf(evt) ?? '?'}</CardYear>
                  <CardTitle>{evt.title}</CardTitle>
                </Card>
              )
            })}
          </ColBody>
        </Column>
      ))}
    </Board>
  )
}

const Board = styled.div`
  display: flex;
  gap: 12px;
  padding: 18px 20px 80px;
  overflow-x: auto;
  height: 100%;
  align-items: flex-start;
`

const Column = styled.div`
  flex: 0 0 260px;
  display: flex;
  flex-direction: column;
  gap: 6px;

  @media (max-width: 480px) {
    flex: 0 0 calc(100vw - 56px);
    max-width: 320px;
  }
`

const ColHead = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px 6px 0 0;
  background: ${({ $color }) => $color}10;
  border-bottom: 2px solid ${({ $color }) => $color}55;
`

const ColAccent = styled.span<{ $color: string }>`
  width: 6px;
  height: 14px;
  border-radius: 1px;
  background: ${({ $color }) => $color};
`

const ColName = styled.div`
  flex: 1;
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ColCount = styled.span`
  ${DIGIT_DISPLAY}
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const FocusBtn = styled.button`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 13px;
  cursor: pointer;
  &:hover { color: #4f46e5; }
`

const ColBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const Card = styled.button<{ $color: string; $opacity: number }>`
  display: grid;
  grid-template-columns: 50px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-radius: 6px;
  background: ${({ theme }) => ledgerSurface(theme.mode)};
  border-left: 3px solid ${({ $color, $opacity }) => withAlpha($color, $opacity)};
  cursor: pointer;
  text-align: left;
  transition: transform 0.1s, border-color 0.12s;

  &:hover {
    transform: translateX(1px);
    border-color: ${({ $color }) => $color}55;
  }
`

const CardYear = styled.span`
  ${DIGIT_DISPLAY}
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CardTitle = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

