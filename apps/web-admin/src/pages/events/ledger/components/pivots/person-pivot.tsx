/**
 * Person Pivot — 사건 시점의 통치자별 그룹.
 *
 * 1차 구현: 사건의 *주(主) 역사 국가*에 해당 시기 통치자가 있으면 그 인물 카드 아래에 묶음.
 * 매칭이 부정확하니 명확히 *시범* 표시 (정교한 head-of-state 매칭은 추후 reuse).
 */
import React, { useMemo } from 'react'

import styled from 'styled-components'

import {
  DIGIT_DISPLAY,
  fontTier,
  ledgerHairline,
  ledgerHoverFill,
  ledgerInkLine,
  ledgerSurface,
  resolveCategory,
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
}

interface Bucket {
  countryName: string
  events: HistoricalEvent[]
}

export const PersonPivot: React.FC<Props> = ({ events, onSelectEvent }) => {
  // 시범: relatedHistoricalCountries[0]을 통치자 placeholder로 사용
  const buckets = useMemo<Bucket[]>(() => {
    const map = new Map<string, HistoricalEvent[]>()
    for (const evt of events) {
      const primary =
        evt.relatedHistoricalCountries?.[0]?.name ??
        evt.relatedCountries?.[0]?.name ??
        '미지정'
      const list = map.get(primary) ?? []
      list.push(evt)
      map.set(primary, list)
    }
    return Array.from(map.entries())
      .map(([countryName, evts]) => ({
        countryName,
        events: sortByStartYearAsc(evts),
      }))
      .sort(byEventCountDesc)
  }, [events])

  if (buckets.length === 0) {
    return (
      <EmptyState
        title="표시할 사건이 없습니다"
        hint="현재 렌즈 조건에 맞는 사건이 없어요."
      />
    )
  }

  return (
    <Wrap>
      <Notice>
        ⚠ 인물 피벗은 시범 단계 — 사건의 주(主) 국가를 통치자 placeholder로 사용 중.
        본격적인 head-of-state 매칭은 후속.
      </Notice>
      <List>
        {buckets.map((bucket) => (
          <Group key={bucket.countryName}>
            <GroupHead>
              <GroupName>{bucket.countryName}</GroupName>
              <GroupCount>{bucket.events.length.toLocaleString()}</GroupCount>
            </GroupHead>
            <GroupBody>
              {bucket.events.map((evt) => {
                const color = resolveCategory(evt.category).color
                return (
                  <Row
                    key={evt.id}
                    type="button"
                    onClick={() => onSelectEvent(evt.id)}
                  >
                    <Dot $color={color} />
                    <Year>{startYearOf(evt) ?? '?'}</Year>
                    <Title>{evt.title}</Title>
                  </Row>
                )
              })}
            </GroupBody>
          </Group>
        ))}
      </List>
    </Wrap>
  )
}

const Wrap = styled.div`
  padding: 18px 20px 80px;
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
`

const Notice = styled.div`
  padding: 8px 12px;
  border: 1px dashed rgba(217, 119, 6, 0.5);
  border-radius: 6px;
  background: rgba(217, 119, 6, 0.06);
  color: #92400e;
  ${fontTier('LABEL')}
`

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

/* 그룹 카드 — country-pivot Card와 같은 8px radius로 시각 통일 */
const Group = styled.section`
  border: 1px solid ${({ theme }) => ledgerInkLine(theme.mode)};
  border-radius: 8px;
  background: ${({ theme }) => ledgerSurface(theme.mode)};
  overflow: hidden;
`

const GroupHead = styled.header`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const GroupName = styled.div`
  flex: 1;
  ${fontTier('TITLE')}
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const GroupCount = styled.span`
  ${DIGIT_DISPLAY}
  ${fontTier('LABEL')}
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const GroupBody = styled.div`
  display: flex;
  flex-direction: column;
`

const Row = styled.button`
  display: grid;
  grid-template-columns: 6px 60px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  padding: 6px 14px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const Dot = styled.span<{ $color: string }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
`

const Year = styled.span`
  ${DIGIT_DISPLAY}
  ${fontTier('LABEL')}
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Title = styled.span`
  ${fontTier('BODY')}
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`
