import { useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import { metaText } from '@/pages/events/styles/theme'
import { type EventResponseDto, getAllEvents } from '@/shared/api/events'
import { formatDateRange, parseIsoDateParts } from '@/shared/lib/iso-date'
import { pathKeys } from '@/shared/router'

import { IconMilitary } from './country-detail-dashboard.icons'
import * as DashboardStyles from './country-detail-dashboard.styles'

/**
 * 선전포고 · 참전 이력 — 이 나라(또는 연결된 전신 역사국가)가 관여한 선전포고(WAR_DECLARATION) 사건을
 * 시간순으로 모아, 누가 누구에게 선전포고했는지(선포 ──▶ 대상국 / 피선포 ◀── 선포국)와
 * 어느 전쟁의 일부였는지를 한눈에 보여준다.
 */
interface WarDeclarationsSectionProps {
  historicalCountryId?: string
  countryId?: string
  linkedHistoricalCountryIds?: string[]
}

type DeclarationDirection = 'declared' | 'targeted' | 'other'

interface CounterpartParty {
  id: string
  name: string
  isHistorical: boolean
}

interface WarDeclarationRow {
  event: EventResponseDto
  direction: DeclarationDirection
  counterparts: CounterpartParty[]
  selfRoleDescription: string | null
  viaHistoricalName: string | null
  dateLabel: string
  sortKey: number
}

function eventSortKey(event: EventResponseDto): number {
  const parts = parseIsoDateParts(event.startDate)
  if (!parts) return Infinity
  return parts.year * 10_000 + parts.month * 100 + parts.day
}

function collectParties(
  event: EventResponseDto,
  roleFilter: (role: string | null | undefined) => boolean,
  excludeKey?: string,
): CounterpartParty[] {
  const result: CounterpartParty[] = []
  for (const modern of event.relatedCountries ?? []) {
    const key = `m:${modern.id}`
    if (key === excludeKey) continue
    if (roleFilter(modern.role)) {
      result.push({ id: modern.id, name: modern.name, isHistorical: false })
    }
  }
  for (const historical of event.relatedHistoricalCountries ?? []) {
    const key = `h:${historical.id}`
    if (key === excludeKey) continue
    if (roleFilter(historical.role)) {
      result.push({ id: historical.id, name: historical.name, isHistorical: true })
    }
  }
  return result
}

export function buildWarDeclarationRows(
  events: ReadonlyArray<EventResponseDto>,
  options: {
    historicalCountryId?: string
    countryId?: string
    linkedHistoricalCountryIds?: ReadonlyArray<string>
  },
): WarDeclarationRow[] {
  const linkedHistSet = new Set(options.linkedHistoricalCountryIds ?? [])
  const rows: WarDeclarationRow[] = []

  for (const event of events) {
    if (event.type !== 'WAR_DECLARATION') continue

    let matchedKey: string | undefined
    let matchedRole: string | null = null
    let matchedRoleDescription: string | null = null
    let viaHistoricalName: string | null = null

    if (options.historicalCountryId) {
      const foundHist = (event.relatedHistoricalCountries ?? []).find(
        (item) => item.id === options.historicalCountryId,
      )
      if (foundHist) {
        matchedKey = `h:${foundHist.id}`
        matchedRole = foundHist.role ?? null
        matchedRoleDescription = foundHist.roleDescription ?? null
      }
    } else if (options.countryId) {
      const foundModern = (event.relatedCountries ?? []).find(
        (item) => item.id === options.countryId,
      )
      if (foundModern) {
        matchedKey = `m:${foundModern.id}`
        matchedRole = foundModern.role ?? null
        matchedRoleDescription = foundModern.roleDescription ?? null
      } else {
        const foundLinkedHist = (event.relatedHistoricalCountries ?? []).find((item) =>
          linkedHistSet.has(item.id),
        )
        if (foundLinkedHist) {
          matchedKey = `h:${foundLinkedHist.id}`
          matchedRole = foundLinkedHist.role ?? null
          matchedRoleDescription = foundLinkedHist.roleDescription ?? null
          viaHistoricalName = foundLinkedHist.name
        }
      }
    }

    const direction: DeclarationDirection =
      matchedRole === 'INITIATOR'
        ? 'declared'
        : matchedRole === 'TARGET'
          ? 'targeted'
          : 'other'

    const counterparts =
      direction === 'declared'
        ? collectParties(event, (role) => role === 'TARGET', matchedKey)
        : direction === 'targeted'
          ? collectParties(event, (role) => role === 'INITIATOR', matchedKey)
          : collectParties(event, () => true, matchedKey)

    const dateLabel = event.startDate
      ? formatDateRange(
          event.startDate,
          undefined,
          event.startDatePrecision,
          undefined,
        ) || '연도 미상'
      : '연도 미상'

    rows.push({
      event,
      direction,
      counterparts,
      selfRoleDescription: matchedRoleDescription?.trim() || null,
      viaHistoricalName,
      dateLabel,
      sortKey: eventSortKey(event),
    })
  }

  return rows.sort(
    (left, right) =>
      left.sortKey - right.sortKey || left.event.title.localeCompare(right.event.title),
  )
}

export function WarDeclarationsSection({
  historicalCountryId,
  countryId,
  linkedHistoricalCountryIds = [],
}: WarDeclarationsSectionProps) {
  const targetId = historicalCountryId ?? countryId ?? ''
  const [filterDirection, setFilterDirection] = useState<'ALL' | DeclarationDirection>('ALL')

  const { data: rawEvents = [], isLoading } = useQuery({
    queryKey: [
      'country-war-declarations',
      historicalCountryId ? `h:${historicalCountryId}` : `c:${countryId ?? ''}`,
    ],
    queryFn: () =>
      getAllEvents(
        historicalCountryId
          ? {
              historicalCountryIds: [historicalCountryId],
              types: 'WAR_DECLARATION',
              includeSubEvents: true,
              limit: 'all',
            }
          : {
              countryId,
              types: 'WAR_DECLARATION',
              includeSubEvents: true,
              limit: 'all',
            },
      ),
    enabled: Boolean(targetId),
    staleTime: 60_000,
  })

  const rows = useMemo(
    () =>
      buildWarDeclarationRows(rawEvents, {
        historicalCountryId,
        countryId,
        linkedHistoricalCountryIds,
      }),
    [rawEvents, historicalCountryId, countryId, linkedHistoricalCountryIds],
  )

  const declaredRows = rows.filter((row) => row.direction === 'declared')
  const targetedRows = rows.filter((row) => row.direction === 'targeted')
  const otherRows = rows.filter((row) => row.direction === 'other')

  const visibleRows =
    filterDirection === 'ALL'
      ? rows
      : rows.filter((row) => row.direction === filterDirection)

  return (
    <DashboardStyles.Section
      id="section-war-declarations"
      aria-labelledby="war-declarations-heading"
    >
      <DashboardStyles.SectionTitleRow>
        <DashboardStyles.SectionTitleIcon>
          <IconMilitary />
        </DashboardStyles.SectionTitleIcon>
        <DashboardStyles.SectionTitleText id="war-declarations-heading">
          선전포고 · 참전 이력
        </DashboardStyles.SectionTitleText>
        {rows.length > 0 && (
          <DashboardStyles.SectionCountChip>
            {[
              declaredRows.length > 0 ? `선포 ${declaredRows.length}` : null,
              targetedRows.length > 0 ? `피선포 ${targetedRows.length}` : null,
              otherRows.length > 0 ? `참전 ${otherRows.length}` : null,
            ]
              .filter(Boolean)
              .join(' / ')}
          </DashboardStyles.SectionCountChip>
        )}
        {declaredRows.length > 0 && targetedRows.length > 0 && (
          <FilterGroup role="group" aria-label="선전포고 방향 필터">
            <FilterPill
              type="button"
              $active={filterDirection === 'ALL'}
              onClick={() => setFilterDirection('ALL')}
            >
              전체 {rows.length}
            </FilterPill>
            <FilterPill
              type="button"
              $active={filterDirection === 'declared'}
              onClick={() => setFilterDirection('declared')}
            >
              선포 {declaredRows.length}
            </FilterPill>
            <FilterPill
              type="button"
              $active={filterDirection === 'targeted'}
              onClick={() => setFilterDirection('targeted')}
            >
              피선포 {targetedRows.length}
            </FilterPill>
          </FilterGroup>
        )}
      </DashboardStyles.SectionTitleRow>

      {isLoading ? (
        <Empty>선전포고 이력을 불러오는 중…</Empty>
      ) : rows.length === 0 ? (
        <Empty>
          이 나라가 선포하거나 받은 선전포고 사건이 아직 없습니다. 전쟁·외교 사건을 ‘선전포고’
          세부로 등록하고 선포국·대상국을 지정하면 여기 시간순으로 모입니다.
        </Empty>
      ) : (
        <Timeline>
          {visibleRows.map((row) => (
            <Item key={row.event.id} data-direction={row.direction}>
              <DateCell>{row.dateLabel}</DateCell>
              <Body>
                <Headline>
                  <DirectionBadge data-direction={row.direction}>
                    {row.direction === 'declared'
                      ? '선포 ──▶'
                      : row.direction === 'targeted'
                        ? '피선포 ◀──'
                        : '참전 ·'}
                  </DirectionBadge>
                  {row.counterparts.length > 0 ? (
                    row.counterparts.map((party, index) => (
                      <CounterpartName key={`${party.isHistorical ? 'h' : 'm'}:${party.id}`}>
                        {index > 0 && ' · '}
                        <Link
                          to={pathKeys.countryDetail(party.id)}
                          style={{
                            fontStyle: party.isHistorical ? 'italic' : undefined,
                          }}
                        >
                          {party.name}
                        </Link>
                      </CounterpartName>
                    ))
                  ) : (
                    <CounterpartFallback>상대국 미지정</CounterpartFallback>
                  )}
                  {row.viaHistoricalName && (
                    <ViaHistoricalTag>{row.viaHistoricalName}</ViaHistoricalTag>
                  )}
                </Headline>
                <Meta>
                  <Link to={pathKeys.events.detail(row.event.id)}>{row.event.title}</Link>
                  {row.selfRoleDescription && ` · ${row.selfRoleDescription}`}
                  {row.event.parentEvent && (
                    <>
                      {' · 상위 전쟁: '}
                      <Link to={pathKeys.events.detail(row.event.parentEvent.id)}>
                        {row.event.parentEvent.title}
                      </Link>
                    </>
                  )}
                </Meta>
              </Body>
            </Item>
          ))}
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

const FilterGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
`

const FilterPill = styled.button<{ $active: boolean }>`
  height: 24px;
  padding: 0 9px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.colors.text.primary : theme.colors.border.default};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.text.primary : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.background.primary : theme.colors.text.secondary};
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
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
  grid-template-columns: 108px minmax(0, 1fr);
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};

  &:last-child {
    border-bottom: none;
  }
`

const DateCell = styled.span`
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

const DirectionBadge = styled.span`
  font-size: 12.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5')};

  &[data-direction='targeted'] {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#fca5a5' : '#b91c1c')};
  }

  &[data-direction='other'] {
    color: ${metaText};
  }
`

const CounterpartName = styled.strong`
  font-weight: 700;

  a {
    color: ${({ theme }) => theme.colors.text.primary};
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }
`

const CounterpartFallback = styled.span`
  font-size: 13px;
  color: ${metaText};
`

const ViaHistoricalTag = styled.span`
  padding: 0 6px;
  border-radius: 4px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  font-size: 11px;
  font-weight: 600;
  font-style: italic;
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
    text-decoration: underline;
  }
`
