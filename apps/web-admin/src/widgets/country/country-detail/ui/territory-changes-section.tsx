import { useMemo } from 'react'

import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import { metaText } from '@/pages/events/styles/theme'
import { formatYearLabel, parseIsoDateParts } from '@/shared/lib/iso-date'
import { pathKeys } from '@/shared/router'
import {
  type TerritoryChange,
  getCountryTerritoryChanges,
  getHistoricalCountryTerritoryChanges,
  territoryMethodLabel,
  territoryTransferKeys,
} from '@/shared/api/territory-transfers'

import * as DashboardStyles from './country-detail-dashboard.styles'
import { IconArea } from './country-detail-dashboard.icons'

/**
 * 영토 변천 — 이 나라가 사건으로 얻고 잃은 땅(사건의 '영토 이전' 줄을 나라 쪽에서 모은 것).
 * 이 앱에 처음 생기는 '국경이 움직인 이력'이다 — 폴란드-리투아니아 연방: 1772 −21만 → 1793 −30만 → 1795 소멸.
 * 쓰는 곳은 사건 상세(영토 이전), 여기는 읽기만.
 */
interface TerritoryChangesSectionProps {
  historicalCountryId?: string
  countryId?: string
}

/** 시간순 키 — 발효 시점이 있으면 그것, 없으면 사건 시작(BC는 음수) */
function signedYearOf(change: TerritoryChange): number | null {
  if (change.effectiveYear != null) return change.effectiveEra === 'BC' ? -change.effectiveYear : change.effectiveYear
  if (change.event.startYear != null) return change.event.startEra === 'BC' ? -change.event.startYear : change.event.startYear
  return parseIsoDateParts(change.event.startDate)?.year ?? null
}

const formatArea = (km2: number) =>
  km2 >= 10_000 ? `${Math.round((km2 / 10_000) * 10) / 10}만 km²` : `${km2.toLocaleString('ko-KR')} km²`

export function TerritoryChangesSection({ historicalCountryId, countryId }: TerritoryChangesSectionProps) {
  const kind = historicalCountryId ? 'historical' : 'country'
  const id = historicalCountryId ?? countryId ?? ''
  const { data: changes = [], isLoading } = useQuery({
    queryKey: territoryTransferKeys.party(kind, id),
    queryFn: () => (historicalCountryId ? getHistoricalCountryTerritoryChanges(id) : getCountryTerritoryChanges(id)),
    enabled: Boolean(id),
    staleTime: 60_000,
  })
  const sorted = useMemo(
    () =>
      changes
        .map((change) => ({ change, year: signedYearOf(change) }))
        .sort((left, right) => (left.year ?? Infinity) - (right.year ?? Infinity)),
    [changes],
  )
  const gained = changes.filter((change) => change.direction === 'gained')
  const lost = changes.filter((change) => change.direction === 'lost')
  const sum = (rows: TerritoryChange[]) => rows.reduce((total, row) => total + (row.areaKm2 ?? 0), 0)

  return (
    <DashboardStyles.Section id="section-territory" aria-labelledby="territory-changes-heading">
      <DashboardStyles.SectionTitleRow>
        <DashboardStyles.SectionTitleIcon>
          <IconArea />
        </DashboardStyles.SectionTitleIcon>
        <DashboardStyles.SectionTitleText id="territory-changes-heading">영토 변천</DashboardStyles.SectionTitleText>
        {changes.length > 0 && (
          <DashboardStyles.SectionCountChip>
            {[
              gained.length > 0 ? `얻음 ${gained.length}${sum(gained) > 0 ? ` · ${formatArea(sum(gained))}` : ''}` : null,
              lost.length > 0 ? `잃음 ${lost.length}${sum(lost) > 0 ? ` · ${formatArea(sum(lost))}` : ''}` : null,
            ]
              .filter(Boolean)
              .join(' / ')}
          </DashboardStyles.SectionCountChip>
        )}
      </DashboardStyles.SectionTitleRow>

      {isLoading ? (
        <Empty>영토 변천을 불러오는 중…</Empty>
      ) : changes.length === 0 ? (
        <Empty>
          이 나라가 사건으로 얻거나 잃은 땅이 아직 없습니다. 분할·할양·병합 사건의 ‘영토 이전’ 줄에 이 나라를 적으면 여기
          시간순으로 모입니다.
        </Empty>
      ) : (
        <Timeline>
          {sorted.map(({ change, year }) => {
            const other = change.direction === 'gained' ? change.from : change.to
            return (
              <Item key={`${change.id}:${change.direction}`} data-direction={change.direction}>
                <Year>{year != null ? formatYearLabel(year) : '연도 미상'}</Year>
                <Body>
                  <Headline>
                    <Sign aria-label={change.direction === 'gained' ? '얻음' : '잃음'}>
                      {change.direction === 'gained' ? '+' : '−'}
                      {change.areaKm2 != null ? formatArea(change.areaKm2) : ''}
                    </Sign>
                    <strong>{change.regionName}</strong>
                    <Method>{territoryMethodLabel(change.method)}</Method>
                  </Headline>
                  <Meta>
                    {change.direction === 'gained' ? '← ' : '→ '}
                    {other.name ?? '미상'} ·{' '}
                    <Link to={pathKeys.events.detail(change.event.id)}>{change.event.title}</Link>
                  </Meta>
                </Body>
              </Item>
            )
          })}
        </Timeline>
      )}
    </DashboardStyles.Section>
  )
}

const Empty = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: ${metaText};
`

const Timeline = styled.ol`
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
`

const Item = styled.li`
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};

  &:last-child {
    border-bottom: none;
  }
`

const Year = styled.span`
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const Headline = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px 8px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};
`

/** 얻음 초록 · 잃음 빨강 — 부호(+/−)와 aria 라벨이 함께라 색만으로 말하지 않는다 */
const Sign = styled.span`
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#86efac' : '#15803d')};

  ${Item}[data-direction='lost'] & {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#fca5a5' : '#b91c1c')};
  }
`

const Method = styled.span`
  padding: 0 6px;
  border-radius: 4px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  font-size: 11px;
  font-weight: 600;
  line-height: 16px;
  color: ${metaText};
`

const Meta = styled.span`
  font-size: 12.5px;
  color: ${metaText};

  a {
    color: ${({ theme }) => theme.colors.text.secondary};
    text-decoration: none;
  }
  a:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`
