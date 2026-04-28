/**
 * Command Palette — ⌘K 단일 검색·점프 인터페이스.
 *
 * 1차 범위:
 *  - 사건 검색 (제목·키워드 매칭) → 선택 시 인라인 확장
 *  - 시대 점프 (예: "1860" → 1860년대 lens 추가)
 *  - 카테고리 lens 추가 (예: "전쟁" 입력 시 카테고리 후보 노출)
 *
 * 닫힐 때 호출자 포커스로 복원하고, Tab은 박스 내부에서만 순환한다.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { createPortal } from 'react-dom'
import { FiCalendar, FiLayers, FiSearch } from 'react-icons/fi'
import styled from 'styled-components'

import type { EventCategoryDto } from '@/shared/api/event-categories'

import {
  DIGIT_DISPLAY,
  decadeOf,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerOverlay,
  ledgerScrim,
} from '../styles/ledger-tokens'
import type { LensChip } from '../types/lens'
import type { HistoricalEvent } from '@/entities/event/model'

interface Props {
  open: boolean
  onClose: () => void
  events: HistoricalEvent[]
  dbCategories: EventCategoryDto[]
  onSelectEvent: (id: string) => void
  onAddLens: (chip: LensChip) => void
}

interface Item {
  id: string
  type: 'event' | 'decade' | 'category'
  title: string
  hint: string
  payload: {
    eventId?: string
    decade?: number
    /** category 매칭은 id 기반 — 표시 이름은 title 사용 */
    categoryId?: string
  }
}

const MAX_EVENT_RESULTS = 12
const MAX_RECENT_EVENTS = 8
const MAX_CATEGORY_RESULTS = 3

const eventStartYear = (evt: HistoricalEvent): number | null => {
  if (!evt.startDate) return null
  const date = new Date(evt.startDate)
  return Number.isNaN(date.getTime()) ? null : date.getFullYear()
}

export const CommandPalette: React.FC<Props> = ({
  open,
  onClose,
  events,
  dbCategories,
  onSelectEvent,
  onAddLens,
}) => {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const boxRef = useRef<HTMLDivElement | null>(null)
  const lastFocusedRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (open) {
      lastFocusedRef.current = (document.activeElement as HTMLElement) ?? null
      setQuery('')
      setActive(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    } else {
      // 호출자 포커스 복원
      const last = lastFocusedRef.current
      if (last && document.contains(last)) {
        requestAnimationFrame(() => last.focus())
      }
    }
  }, [open])

  const items = useMemo<Item[]>(() => {
    const term = query.trim().toLowerCase()
    const out: Item[] = []

    // 시대 매칭 — 숫자로 입력하면
    const yearMatch = term.match(/^(\d{3,4})$/)?.[1]
    if (yearMatch) {
      const year = Number(yearMatch)
      const date = decadeOf(year)
      out.push({
        id: `decade-${date}`,
        type: 'decade',
        title: `${date}년대`,
        hint: '시대 lens 추가',
        payload: { decade: date },
      })
    }

    // 카테고리 매칭 — 이름 부분 일치, 매칭은 id로
    if (term) {
      const catMatches = dbCategories.filter((item) =>
        item.name.toLowerCase().includes(term),
      )
      for (const item of catMatches.slice(0, MAX_CATEGORY_RESULTS)) {
        out.push({
          id: `cat-${item.id}`,
          type: 'category',
          title: item.name,
          hint: '카테고리 lens 추가',
          payload: { categoryId: item.id },
        })
      }
    }

    // 사건 매칭
    if (term) {
      const matches = events
        .filter(
          (evt) =>
            evt.title.toLowerCase().includes(term) ||
            evt.keywords?.some((keyword) => keyword.toLowerCase().includes(term)),
        )
        .slice(0, MAX_EVENT_RESULTS)
      for (const evt of matches) {
        const year = eventStartYear(evt)
        out.push({
          id: `event-${evt.id}`,
          type: 'event',
          title: evt.title,
          hint: year ? `${year}년` : '연도 미정',
          payload: { eventId: evt.id },
        })
      }
    } else {
      // 빈 쿼리 — 최근 사건 (시간 역순)
      const recent = [...events]
        .filter((evt) => evt.startDate)
        .sort(
          (first, bucket) =>
            new Date(bucket.startDate).getTime() - new Date(first.startDate).getTime(),
        )
        .slice(0, MAX_RECENT_EVENTS)
      for (const evt of recent) {
        const year = eventStartYear(evt) ?? 0
        out.push({
          id: `event-${evt.id}`,
          type: 'event',
          title: evt.title,
          hint: `${year}년`,
          payload: { eventId: evt.id },
        })
      }
    }

    return out
  }, [query, events, dbCategories])

  const runItem = useCallback(
    (item: Item) => {
      if (item.type === 'event' && item.payload.eventId) {
        onSelectEvent(item.payload.eventId)
      } else if (item.type === 'decade' && typeof item.payload.decade === 'number') {
        onAddLens({
          kind: 'decade',
          value: String(item.payload.decade),
        })
      } else if (item.type === 'category' && item.payload.categoryId) {
        onAddLens({
          kind: 'category',
          value: item.payload.categoryId,
          label: item.title,
        })
      }
      onClose()
    },
    [onSelectEvent, onAddLens, onClose],
  )

  // 키보드 — Arrow/Enter/Tab(트랩)
  useEffect(() => {
    if (!open) return
    const handler = (evt: KeyboardEvent) => {
      if (evt.key === 'ArrowDown') {
        evt.preventDefault()
        setActive((val) => Math.min(items.length - 1, val + 1))
      } else if (evt.key === 'ArrowUp') {
        evt.preventDefault()
        setActive((val) => Math.max(0, val - 1))
      } else if (evt.key === 'Enter') {
        evt.preventDefault()
        const item = items[active]
        if (!item) return
        runItem(item)
      } else if (evt.key === 'Tab') {
        // 박스 안의 포커스 가능한 요소 사이에서만 순환
        const box = boxRef.current
        if (!box) return
        const focusables = box.querySelectorAll<HTMLElement>(
          'input, button, [tabindex]:not([tabindex="-1"])',
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        const current = document.activeElement as HTMLElement | null
        if (evt.shiftKey) {
          if (current === first || !box.contains(current)) {
            evt.preventDefault()
            last.focus()
          }
        } else {
          if (current === last) {
            evt.preventDefault()
            first.focus()
          }
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, items, active, runItem])

  if (!open) return null

  return createPortal(
    <Backdrop role="dialog" aria-modal="true" aria-label="명령 팔레트" onClick={onClose}>
      <Box ref={boxRef} onClick={(evt) => evt.stopPropagation()}>
        <SearchRow>
          <FiSearch size={15} />
          <Input
            ref={inputRef}
            value={query}
            onChange={(evt) => {
              setQuery(evt.target.value)
              setActive(0)
            }}
            placeholder="사건·시대·카테고리 — 입력하세요"
          />
          <Hint>↑↓ 탐색 · ↵ 선택 · Esc 닫기</Hint>
        </SearchRow>
        <List>
          {items.length === 0 ? (
            <Empty>일치하는 결과가 없습니다.</Empty>
          ) : (
            items.map((it, idx) => (
              <ItemRow
                key={it.id}
                $active={idx === active}
                onMouseEnter={() => setActive(idx)}
                onClick={() => runItem(it)}
              >
                <Icon $type={it.type}>
                  {it.type === 'decade' ? (
                    <FiCalendar size={12} />
                  ) : it.type === 'category' ? (
                    <FiLayers size={12} />
                  ) : (
                    <FiSearch size={12} />
                  )}
                </Icon>
                <Title>{it.title}</Title>
                <ItemHint>{it.hint}</ItemHint>
              </ItemRow>
            ))
          )}
        </List>
      </Box>
    </Backdrop>,
    document.body,
  )
}

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: ${({ theme }) => ledgerScrim(theme.mode)};
  backdrop-filter: blur(6px);
  z-index: 9999;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 14vh 16px 24px;
`

const Box = styled.div`
  width: 100%;
  max-width: 560px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerOverlay(theme.mode)};
  box-shadow:
    0 24px 64px rgba(15, 23, 42, 0.24),
    0 4px 12px rgba(15, 23, 42, 0.08);
  overflow: hidden;
`

const SearchRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Input = styled.input`
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const Hint = styled.span`
  ${DIGIT_DISPLAY}
  font-size: 10.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;

  @media (max-width: 540px) {
    display: none;
  }
`

const List = styled.div`
  max-height: 380px;
  overflow-y: auto;
  padding: 6px;
`

const ItemRow = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  border: none;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99,102,241,0.14)'
        : 'rgba(99,102,241,0.08)'
      : 'transparent'};
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Icon = styled.span<{ $type: Item['type'] }>`
  display: inline-flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  background: ${({ $type }) =>
    $type === 'decade'
      ? 'rgba(15, 118, 110, 0.16)'
      : $type === 'category'
        ? 'rgba(124, 58, 237, 0.16)'
        : 'rgba(99, 102, 241, 0.14)'};
  color: ${({ $type }) =>
    $type === 'decade' ? '#0f766e' : $type === 'category' ? '#7c3aed' : '#4f46e5'};
  flex-shrink: 0;
`

const Title = styled.span`
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const ItemHint = styled.span`
  ${DIGIT_DISPLAY}
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Empty = styled.div`
  padding: 22px 14px;
  text-align: center;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
