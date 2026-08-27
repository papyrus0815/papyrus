/**
 * Event Era View — 사건을 「시대」로 묶어 본다. 빅토리아 시대, 건륭제 시대.
 *
 * 시대는 재위(SovereignReign) 파생이다(서버 `GET /events/eras`). 사건은 **자기가 걸린
 * 나라의 재위**에만 들어간다 — 연도만 보면 1900년 사건이 수십 개 재위에 동시에 걸린다.
 *
 * 한 사건이 여러 시대에 드는 경우는 그대로 둔다. 1차대전 사건은 독일·러시아 양쪽에
 * 걸리므로 빌헬름 시대이자 니콜라이 2세 시대다. 버그가 아니라 사실이라 양쪽에 넣고,
 * 카드에 "다른 시대에도" 표시를 단다.
 */
import React, { useMemo, useState } from 'react'

import { FiChevronDown, FiChevronRight, FiFlag } from 'react-icons/fi'
import styled from 'styled-components'

import { useEventEras } from '@/entities/event-era/api'
import { CatalogViewEmpty } from '@/features/event-list/ui/catalog-view-empty'
import { parseIsoDateParts } from '@/shared/lib/iso-date'
import { CategoryDot } from '@/shared/ui/category-dot/category-dot'

import type {
  HistoricalEvent,
} from '../../../pages/events/create/events.types'

type FlatItem = import('@/features/event-hierarchy/model').FlattenedHierarchyItem

interface Props {
  /** ⚠️ 필터를 만족한 행만 담긴 배열이어야 한다 — 문맥 부모는 카드가 아니다. */
  flattenedHierarchy: FlatItem[]
  events: HistoricalEvent[]
  selectedEventId: string | null
  onSelectEvent: (id: string) => void
  isLoading?: boolean
  hasMoreData?: boolean
  hasActiveFilters?: boolean
  onResetFilters?: () => void
}

/** 시대 미상 묶음의 고정 키 — 실제 시대 id와 겹치지 않게 */
const UNKNOWN_ERA = '__unknown__'

export const EventEraView: React.FC<Props> = ({
  flattenedHierarchy,
  events,
  selectedEventId,
  onSelectEvent,
  isLoading = false,
  hasMoreData = false,
  hasActiveFilters = false,
  onResetFilters,
}) => {
  const erasQuery = useEventEras()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const eventById = useMemo(() => {
    const map = new Map<string, HistoricalEvent>()
    for (const event of events) map.set(event.id, event)
    return map
  }, [events])

  /** 지금 화면에 살아 있는 사건 id — 필터를 통과한 것만 시대에 넣는다 */
  const visibleIds = useMemo(
    () => new Set(flattenedHierarchy.map((item) => item.node.id)),
    [flattenedHierarchy],
  )

  const sections = useMemo(() => {
    const eras = erasQuery.data ?? []
    /** 사건 하나가 몇 개 시대에 걸렸는지 — 카드의 '다른 시대에도' 표시용 */
    const eraCountByEvent = new Map<string, number>()
    for (const era of eras) {
      for (const eventId of era.eventIds) {
        if (!visibleIds.has(eventId)) continue
        eraCountByEvent.set(eventId, (eraCountByEvent.get(eventId) ?? 0) + 1)
      }
    }

    const assigned = new Set<string>()
    const rows = eras
      .map((era) => {
        const items = era.eventIds
          .filter((eventId) => visibleIds.has(eventId))
          .map((eventId) => eventById.get(eventId))
          .filter((event): event is HistoricalEvent => !!event)
          // 시대 안은 오래된 순. eventIds는 국가별로 모은 순서라 연도가 뒤섞여 온다.
          .sort((left, right) => {
            const leftYear = eventSignedYear(left)
            const rightYear = eventSignedYear(right)
            if (leftYear == null && rightYear == null) return 0
            if (leftYear == null) return 1
            if (rightYear == null) return -1
            return leftYear - rightYear
          })
        for (const event of items) assigned.add(event.id)
        return { era, items }
      })
      .filter((row) => row.items.length > 0)

    // 어느 시대에도 못 든 사건 — 국가가 안 걸렸거나 그 나라 재위가 없는 사건들.
    // 숨기면 목록에서 사라진 것처럼 보이므로 맨 끝에 반드시 남긴다.
    // 계층 노드는 사건 본문을 안 들고 있어 id로 되짚는다
    const orphans = flattenedHierarchy
      .map((item) => eventById.get(item.node.id))
      .filter(
        (event): event is HistoricalEvent => !!event && !assigned.has(event.id),
      )

    return { rows, orphans, eraCountByEvent }
  }, [erasQuery.data, visibleIds, eventById, flattenedHierarchy])

  const toggle = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  if (isLoading || erasQuery.isLoading) {
    return <Hint>불러오는 중…</Hint>
  }

  if (sections.rows.length === 0 && sections.orphans.length === 0) {
    return (
      <CatalogViewEmpty
        icon={<FiFlag size={24} />}
        title="시대로 묶을 사건이 없습니다"
        description="사건에 관련 국가를 걸고 그 나라의 군주 재위를 등록하면 여기에 시대가 생깁니다."
        isLoading={isLoading}
        hasMoreData={hasMoreData}
        hasActiveFilters={hasActiveFilters}
        onResetFilters={onResetFilters}
      />
    )
  }

  const renderEvent = (event: HistoricalEvent) => {
    const otherEras = (sections.eraCountByEvent.get(event.id) ?? 0) - 1
    return (
      <EventRow
        key={event.id}
        type="button"
        $selected={event.id === selectedEventId}
        onClick={() => onSelectEvent(event.id)}
      >
        <RowYear>{formatEventYear(event)}</RowYear>
        <RowTitle>
          <CategoryDot category={event.category ?? undefined} />
          <span>{event.title || '제목 없음'}</span>
        </RowTitle>
        {otherEras > 0 && (
          <OverlapChip title="이 사건은 다른 나라의 시대에도 함께 듭니다">
            다른 시대 +{otherEras}
          </OverlapChip>
        )}
      </EventRow>
    )
  }

  return (
    <Root>
      {sections.rows.map(({ era, items }) => {
        const isCollapsed = collapsed.has(era.id)
        return (
          <Section key={era.id}>
            <SectionHead
              type="button"
              onClick={() => toggle(era.id)}
              aria-expanded={!isCollapsed}
            >
              <Caret>
                {isCollapsed ? (
                  <FiChevronRight size={15} />
                ) : (
                  <FiChevronDown size={15} />
                )}
              </Caret>
              <EraLabel>{era.label}</EraLabel>
              <EraPeriod>
                {era.startYear}–{era.endYear ?? ''}
              </EraPeriod>
              {era.countryName && <EraCountry>{era.countryName}</EraCountry>}
              <EraCount>{items.length}건</EraCount>
            </SectionHead>
            {!isCollapsed && <EventList>{items.map(renderEvent)}</EventList>}
          </Section>
        )
      })}

      {sections.orphans.length > 0 && (
        <Section>
          <SectionHead
            type="button"
            onClick={() => toggle(UNKNOWN_ERA)}
            aria-expanded={!collapsed.has(UNKNOWN_ERA)}
          >
            <Caret>
              {collapsed.has(UNKNOWN_ERA) ? (
                <FiChevronRight size={15} />
              ) : (
                <FiChevronDown size={15} />
              )}
            </Caret>
            <EraLabel $muted>시대 미상</EraLabel>
            <EraNote>관련 국가가 없거나, 그 나라의 재위 기록이 아직 없습니다</EraNote>
            <EraCount>{sections.orphans.length}건</EraCount>
          </SectionHead>
          {!collapsed.has(UNKNOWN_ERA) && (
            <EventList>{sections.orphans.map(renderEvent)}</EventList>
          )}
        </Section>
      )}
    </Root>
  )
}

/**
 * BC 안전 부호 연도. `HistoricalEvent`에는 startYear/startEra가 없고 ISO 문자열만 있어
 * 공용 파서를 거친다 — 파서가 선행 '-'를 음수 연도로 돌려준다.
 */
function eventSignedYear(event: HistoricalEvent): number | null {
  return parseIsoDateParts(event.startDate)?.year ?? null
}

function formatEventYear(event: HistoricalEvent): string {
  const year = eventSignedYear(event)
  if (year == null) return '—'
  return year < 0 ? `BC ${-year}` : String(year)
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 0 40px;
`

const Section = styled.section`
  min-width: 0;
`

const SectionHead = styled.button`
  display: flex;
  align-items: baseline;
  gap: 10px;
  width: 100%;
  padding: 10px 8px;
  border: none;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.primary};
  text-align: left;
  cursor: pointer;
  position: sticky;
  top: 0;
  z-index: 1;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`

const Caret = styled.span`
  display: inline-flex;
  align-self: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
  flex-shrink: 0;
`

const EraLabel = styled.span<{ $muted?: boolean }>`
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: ${({ $muted, theme }) =>
    $muted ? theme.colors.text.tertiary : theme.colors.text.primary};
  flex-shrink: 0;
`

const EraPeriod = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
  flex-shrink: 0;
`

const EraCountry = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
`

const EraNote = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const EraCount = styled.span`
  margin-left: auto;
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
  flex-shrink: 0;
`

const EventList = styled.div`
  display: flex;
  flex-direction: column;
  padding: 2px 0 10px;
`

const EventRow = styled.button<{ $selected: boolean }>`
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  width: 100%;
  padding: 7px 8px 7px 26px;
  border: none;
  border-radius: 8px;
  background: ${({ $selected, theme }) =>
    $selected ? theme.colors.activeLight : 'transparent'};
  text-align: left;
  cursor: pointer;

  &:hover {
    background: ${({ $selected, theme }) =>
      $selected ? theme.colors.activeLight : theme.colors.hover};
  }
`

const RowYear = styled.span`
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  text-align: right;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const RowTitle = styled.span`
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  font-size: 13.5px;
  color: ${({ theme }) => theme.colors.text.primary};

  > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

/*
 * 겹침 표시는 조용해야 한다. 실측 155건 중 114건이 두 시대 이상에 걸린다 —
 * 예외가 아니라 기본값이다. 앰버 배지로 칠하면 화면 전체가 경고처럼 보인다.
 */
const OverlapChip = styled.span`
  font-size: 10.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
  flex-shrink: 0;
  opacity: 0.75;
`

const Hint = styled.p`
  padding: 48px 0;
  text-align: center;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
