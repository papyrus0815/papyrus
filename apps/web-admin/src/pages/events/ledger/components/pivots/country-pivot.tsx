/**
 * Country Pivot — 국가별 카드. 한 사건이 N개 국가에 동시 등장 가능 (관계 사실).
 *
 * 카드 헤더: [국기·이름] [건수]
 * 본문: 짧은 사건 행 (연도 + 제목)
 */
import React, { useMemo } from 'react'

import styled from 'styled-components'

import {
  DIGIT_DISPLAY,
  ledgerHairline,
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
  onAddCountryLens: (
    kind: 'country' | 'hcountry',
    value: string,
    label: string,
  ) => void
}

interface Bucket {
  kind: 'country' | 'hcountry'
  id: string
  name: string
  flagEmoji?: string
  events: HistoricalEvent[]
}

export const CountryPivot: React.FC<Props> = ({
  events,
  onSelectEvent,
  onAddCountryLens,
}) => {
  const buckets = useMemo<Bucket[]>(() => {
    const map = new Map<string, Bucket>()
    const push = (
      kind: 'country' | 'hcountry',
      id: string,
      name: string,
      flagEmoji: string | undefined,
      evt: HistoricalEvent,
    ) => {
      const key = `${kind}:${id}`
      const bucket = map.get(key)
      if (bucket) {
        bucket.events.push(evt)
      } else {
        map.set(key, { kind, id, name, flagEmoji, events: [evt] })
      }
    }
    for (const evt of events) {
      for (const item of evt.relatedHistoricalCountries ?? []) {
        push('hcountry', item.id, item.name, undefined, evt)
      }
      for (const item of evt.relatedCountries ?? []) {
        push('country', item.id, item.name, item.flagEmoji, evt)
      }
    }
    return Array.from(map.values())
      .map((bucket) => ({
        ...bucket,
        events: sortByStartYearAsc(bucket.events),
      }))
      .sort(byEventCountDesc)
  }, [events])

  if (buckets.length === 0) {
    return (
      <EmptyState
        title="국가 정보가 있는 사건이 없습니다"
        hint="현재 렌즈 조건에 맞으면서 국가가 지정된 사건이 없어요."
      />
    )
  }

  return (
    <Grid>
      {buckets.map((bucket) => (
        <Card key={`${bucket.kind}:${bucket.id}`}>
          <CardHead>
            <CardTitle>
              {bucket.flagEmoji && <span aria-hidden="true">{bucket.flagEmoji}</span>}
              <span>{bucket.name}</span>
              {bucket.kind === 'hcountry' && <Tag>역사</Tag>}
            </CardTitle>
            <FocusBtn
              type="button"
              onClick={() => onAddCountryLens(bucket.kind, bucket.id, bucket.name)}
              title="이 국가로 좁혀보기"
            >
              {bucket.events.length.toLocaleString()}건 →
            </FocusBtn>
          </CardHead>
          <CardBody>
            {bucket.events.slice(0, 8).map((evt) => {
              const color = resolveCategory(evt.category).color
              return (
                <Row
                  key={evt.id}
                  type="button"
                  onClick={() => onSelectEvent(evt.id)}
                >
                  <RowDot $color={color} />
                  <RowYear>{startYearOf(evt) ?? '?'}</RowYear>
                  <RowTitle>{evt.title}</RowTitle>
                </Row>
              )
            })}
            {bucket.events.length > 8 && (
              <More>+{bucket.events.length - 8}건 더</More>
            )}
          </CardBody>
        </Card>
      ))}
    </Grid>
  )
}

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
  padding: 18px 20px 80px;
`

const Card = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }) => ledgerInkLine(theme.mode)};
  border-radius: 8px;
  background: ${({ theme }) => ledgerSurface(theme.mode)};
  overflow: hidden;
`

const CardHead = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const CardTitle = styled.div`
  flex: 1;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Tag = styled.span`
  display: inline-flex;
  align-items: center;
  height: 16px;
  padding: 0 5px;
  border-radius: 3px;
  background: rgba(99, 102, 241, 0.12);
  color: #4f46e5;
  font-size: 9.5px;
  font-weight: 700;
`

const FocusBtn = styled.button`
  ${DIGIT_DISPLAY}
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    color: #4f46e5;
  }
`

const CardBody = styled.div`
  display: flex;
  flex-direction: column;
  padding: 4px 0;
`

const Row = styled.button`
  display: grid;
  grid-template-columns: 6px 50px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  padding: 5px 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;

  &:hover {
    background: rgba(99, 102, 241, 0.05);
  }
`

const RowDot = styled.span<{ $color: string }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
`

const RowYear = styled.span`
  ${DIGIT_DISPLAY}
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const RowTitle = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const More = styled.div`
  ${DIGIT_DISPLAY}
  padding: 4px 12px 6px;
  font-size: 10.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

