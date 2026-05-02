/**
 * Event Discovery Hub — 사건이 선택되지 않은 첫 진입 상태에서
 * 우측 패널 빈 공간을 의미 있는 콘텐츠로 채운다.
 *
 * 구성:
 *   1) 최근 본 사건 — localStorage 기반(useRecentEvents)
 *   2) 북마크 — localStorage 기반(useBookmarks)
 *   3) 현재 필터 결과 요약 — 카테고리·시기별 분포 미니 차트
 *
 * 처음 사용자(둘 다 비어 있음)는 환영 라인 + 필터 요약만 보임.
 */
import React, { useMemo } from 'react'

import { FiBookmark, FiClock, FiCompass, FiPieChart } from 'react-icons/fi'
import styled from 'styled-components'

import {
  ledgerHairlineStrong,
  resolveCategory,
} from '@/pages/events/ledger/styles/ledger-tokens'
import type { HistoricalEvent } from '@/pages/events/create/events.types'
import type { EventCategoryDto } from '@/shared/api/event-categories'

interface EventDiscoveryHubProps {
  events: HistoricalEvent[]
  /** 최근 본 사건 id (localStorage 기반, 최신이 앞) */
  recentEventIds: string[]
  /** 북마크된 사건 id Set */
  bookmarkIds: Set<string>
  /** 현재 필터·검색이 적용된 사건들 — 요약 통계용 */
  filteredEvents: HistoricalEvent[]
  dbCategories: EventCategoryDto[]
  onSelectEvent: (eventId: string) => void
}

const MAX_PER_SECTION = 5

export const EventDiscoveryHub: React.FC<EventDiscoveryHubProps> = ({
  events,
  recentEventIds,
  bookmarkIds,
  filteredEvents,
  dbCategories,
  onSelectEvent,
}) => {
  const eventById = useMemo(() => {
    const m = new Map<string, HistoricalEvent>()
    for (const e of events) m.set(e.id, e)
    return m
  }, [events])

  /* 최근 본 — id → event 매핑 후 사라진 사건 필터링 */
  const recentItems = useMemo(() => {
    return recentEventIds
      .map((id) => eventById.get(id))
      .filter((e): e is HistoricalEvent => Boolean(e))
      .slice(0, MAX_PER_SECTION)
  }, [recentEventIds, eventById])

  /* 북마크 — Set은 순서 보존(ES2015+). 최신 추가가 뒤라 reverse 후 5개. */
  const bookmarkItems = useMemo(() => {
    const ids = Array.from(bookmarkIds).reverse()
    return ids
      .map((id) => eventById.get(id))
      .filter((e): e is HistoricalEvent => Boolean(e))
      .slice(0, MAX_PER_SECTION)
  }, [bookmarkIds, eventById])

  /* 카테고리별 분포 — 상위 5건. 이름은 dbCategories 우선, 없으면 raw category. */
  const categoryStats = useMemo(() => {
    const counts = new Map<string, number>()
    for (const e of filteredEvents) {
      const k = e.category || '기타'
      counts.set(k, (counts.get(k) ?? 0) + 1)
    }
    const total = filteredEvents.length || 1
    return Array.from(counts.entries())
      .map(([name, count]) => ({
        name,
        count,
        ratio: count / total,
        label:
          dbCategories.find((d) => d.name === name)?.name ?? name,
        color: resolveCategory(name).color,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  }, [filteredEvents, dbCategories])

  /* 세기별 분포 — startDate 기준 */
  const centuryStats = useMemo(() => {
    const counts = new Map<number, number>()
    for (const e of filteredEvents) {
      if (!e.startDate) continue
      const year = new Date(e.startDate).getFullYear()
      const century = Math.floor(year / 100) + 1
      counts.set(century, (counts.get(century) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .sort((a, b) => a[0] - b[0])
      .slice(-6)
      .map(([century, count]) => ({ century, count }))
  }, [filteredEvents])

  const hasAny =
    recentItems.length > 0 ||
    bookmarkItems.length > 0 ||
    filteredEvents.length > 0

  return (
    <Host>
      <Header>
        <HeaderIcon aria-hidden="true">
          <FiCompass size={18} />
        </HeaderIcon>
        <HeaderText>
          <HeaderTitle>둘러보기</HeaderTitle>
          <HeaderSub>
            {hasAny
              ? '관심 있는 사건을 클릭하거나 좌측에서 검색하세요'
              : '아직 등록된 사건이 없습니다 — 좌측 상단 "+ 새 사건"으로 추가하세요'}
          </HeaderSub>
        </HeaderText>
      </Header>

      {recentItems.length > 0 && (
        <Section>
          <SectionLabel>
            <FiClock size={12} aria-hidden="true" />
            최근 본 사건
          </SectionLabel>
          <ItemList>
            {recentItems.map((e) => (
              <Item
                key={e.id}
                type="button"
                onClick={() => onSelectEvent(e.id)}
              >
                <ItemDot style={{ background: resolveCategory(e.category).color }} />
                <ItemText>
                  <ItemTitle>{e.title}</ItemTitle>
                  <ItemMeta>
                    {formatDate(e.startDate)}
                    {e.category ? ` · ${e.category}` : null}
                  </ItemMeta>
                </ItemText>
              </Item>
            ))}
          </ItemList>
        </Section>
      )}

      {bookmarkItems.length > 0 && (
        <Section>
          <SectionLabel>
            <FiBookmark size={12} aria-hidden="true" />
            북마크
          </SectionLabel>
          <ItemList>
            {bookmarkItems.map((e) => (
              <Item
                key={e.id}
                type="button"
                onClick={() => onSelectEvent(e.id)}
              >
                <ItemDot style={{ background: resolveCategory(e.category).color }} />
                <ItemText>
                  <ItemTitle>{e.title}</ItemTitle>
                  <ItemMeta>
                    {formatDate(e.startDate)}
                    {e.category ? ` · ${e.category}` : null}
                  </ItemMeta>
                </ItemText>
              </Item>
            ))}
          </ItemList>
        </Section>
      )}

      {filteredEvents.length > 0 && (
        <Section>
          <SectionLabel>
            <FiPieChart size={12} aria-hidden="true" />
            현재 필터 결과 · {filteredEvents.length.toLocaleString()}건
          </SectionLabel>
          {categoryStats.length > 0 && (
            <DistList>
              {categoryStats.map((c) => (
                <DistRow key={c.name}>
                  <DistDot style={{ background: c.color }} />
                  <DistName>{c.label}</DistName>
                  <DistBarTrack>
                    <DistBarFill
                      style={{
                        width: `${Math.max(4, c.ratio * 100)}%`,
                        background: c.color,
                      }}
                    />
                  </DistBarTrack>
                  <DistCount>{c.count.toLocaleString()}</DistCount>
                </DistRow>
              ))}
            </DistList>
          )}
          {centuryStats.length > 0 && (
            <CenturyRow>
              {centuryStats.map((c) => (
                <CenturyCell key={c.century}>
                  <CenturyCount>{c.count}</CenturyCount>
                  <CenturyLabel>{c.century}c</CenturyLabel>
                </CenturyCell>
              ))}
            </CenturyRow>
          )}
        </Section>
      )}
    </Host>
  )
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

/* ───────────────────────── styles ───────────────────────── */

const Host = styled.div`
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding: 28px 24px 40px;

  @media (max-width: 768px) {
    padding: 22px 18px 32px;
    gap: 22px;
  }
`

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
`

const HeaderIcon = styled.div`
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99,102,241,0.16)' : 'rgba(99,102,241,0.08)'};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5'};
`

const HeaderText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
`

const HeaderTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const HeaderSub = styled.div`
  font-size: 12.5px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const SectionLabel = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};

  svg {
    opacity: 0.7;
  }
`

const ItemList = styled.div`
  display: flex;
  flex-direction: column;
`

const Item = styled.button`
  display: grid;
  grid-template-columns: 8px 1fr;
  gap: 10px;
  align-items: start;
  width: 100%;
  text-align: left;
  padding: 10px 8px;
  margin: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  transition: background 0.14s;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.03)'};
  }

  & + & {
    border-top: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
    border-radius: 0;
  }
  &:first-child + & {
    border-radius: 0 0 6px 6px;
  }
`

const ItemDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 7px;
`

const ItemText = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const ItemTitle = styled.span`
  font-size: 13.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const ItemMeta = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
`

const DistList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const DistRow = styled.div`
  display: grid;
  grid-template-columns: 8px minmax(54px, max-content) 1fr 36px;
  align-items: center;
  gap: 10px;
  font-size: 12px;
`

const DistDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
`

const DistName = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const DistBarTrack = styled.span`
  height: 6px;
  border-radius: 3px;
  background: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  overflow: hidden;
`

const DistBarFill = styled.span`
  display: block;
  height: 100%;
  border-radius: 3px;
`

const DistCount = styled.span`
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const CenturyRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(48px, 1fr));
  gap: 6px;
  margin-top: 4px;
`

const CenturyCell = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  border-radius: 6px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.03)'};
`

const CenturyCount = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  font-variant-numeric: tabular-nums;
`

const CenturyLabel = styled.span`
  font-size: 10.5px;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
