/**
 * 최근 본 사건 드롭다운 — toolbar 우측 액션 그룹에 위치.
 *
 * - useRecentEvents 훅의 localStorage 데이터를 root event로 매핑
 * - 클릭 시 그 사건 선택 (drawer 열림)
 * - 항목 0건이면 trigger 자체를 hidden (toolbar 깔끔)
 *
 * 키보드:
 *  - Esc → 닫기
 *  - 외부 클릭 → 닫기
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { FiClock } from 'react-icons/fi'
import styled from 'styled-components'

import { useOverlayEscape } from '@/shared/hooks/use-overlay-escape.hook'
import { CategoryDot } from '@/shared/ui/category-dot/category-dot'

import { parseIsoDateParts } from '@/shared/lib/iso-date'

import type { HistoricalEvent } from '../../create/events.types'
import * as ToolbarStyles from '../../styles/list-toolbar.styles'
import { ICON_SIZE } from '../../styles/theme'

interface Props {
  recentEventIds: string[]
  events: HistoricalEvent[]
  onSelectEvent: (id: string) => void
}

const MAX_ITEMS = 5

export const RecentEventsDropdown: React.FC<Props> = ({
  recentEventIds,
  events,
  onSelectEvent,
}) => {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  const items = useMemo(() => {
    const byId = new Map<string, HistoricalEvent>()
    for (const e of events) byId.set(e.id, e)
    return recentEventIds
      .map((id) => byId.get(id))
      .filter((e): e is HistoricalEvent => Boolean(e))
      .slice(0, MAX_ITEMS)
  }, [recentEventIds, events])

  const closeDropdown = useCallback(() => setOpen(false), [])

  // 외부 클릭 닫기(Escape는 useOverlayEscape)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => {
      document.removeEventListener('mousedown', onDoc)
    }
  }, [open])
  // Escape는 공용 훅이 처리(전파 차단) — 검토 INT-1
  useOverlayEscape(open, closeDropdown)

  if (items.length === 0) return null

  return (
    <Wrap ref={wrapRef}>
      <ToolbarStyles.ToolbarBtn
        type="button"
        title="최근 본 사건"
        aria-label="최근 본 사건 열기"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <FiClock size={ICON_SIZE.base} />
        <span>최근</span>
      </ToolbarStyles.ToolbarBtn>
      {open && (
        <Menu role="menu" aria-label="최근 본 사건">
          <MenuLabel>최근 본 사건</MenuLabel>
          {items.map((evt) => {
            const year = parseIsoDateParts(evt.startDate)?.year
            return (
              <MenuItem
                key={evt.id}
                role="menuitem"
                type="button"
                onClick={() => {
                  onSelectEvent(evt.id)
                  setOpen(false)
                }}
              >
                <CategoryDot category={evt.category} size={6} />
                <ItemText>
                  <ItemTitle>{evt.title}</ItemTitle>
                  <ItemMeta>
                    {year != null ? `${year}년` : ''}
                    {evt.category ? ` · ${evt.category}` : ''}
                  </ItemMeta>
                </ItemText>
              </MenuItem>
            )
          })}
        </Menu>
      )}
    </Wrap>
  )
}

const Wrap = styled.div`
  position: relative;
  display: inline-flex;
`

const Menu = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 100;
  min-width: 280px;
  max-width: 360px;
  padding: 6px;
  border-radius: 10px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? `
        background: #18181b;
        border: 1px solid rgba(255,255,255,0.08);
        box-shadow: 0 12px 32px rgba(0,0,0,0.45);
      `
      : `
        background: #ffffff;
        border: 1px solid rgba(15,23,42,0.08);
        box-shadow: 0 12px 32px rgba(15,23,42,0.12);
      `}
  display: flex;
  flex-direction: column;
  gap: 1px;
`

const MenuLabel = styled.div`
  padding: 6px 10px 4px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const MenuItem = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.primary};
  transition: background 0.12s;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.04)'
        : 'rgba(15,23,42,0.04)'};
  }

  &:focus-visible {
    outline: none;
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(37,99,235,0.18)'
        : 'rgba(37,99,235,0.08)'};
  }
`

const ItemText = styled.span`
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  flex: 1;
`

const ItemTitle = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: -0.005em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const ItemMeta = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`
