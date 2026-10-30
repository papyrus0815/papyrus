/**
 * 히어로 참여국 카드 — 제목 아래 '누가 어느 편이었고, 무엇을 했고, 얼마를 냈나'를 한눈에.
 *
 * 예전엔 '프로이센 측 프로이센 왕국 · 이탈리아 왕국 / 오스트리아 측 오스트리아 · 바이에른 왕국 … 외 3'처럼
 * 이름만 이어 붙인 줄 위에 가는 선을 그었다. 나라가 무슨 역할이었는지(주도국·제한 참전), 얼마나 냈는지
 * (동원 병력)는 참여 탭까지 내려가야 보였다. 이제 진영 열마다 국가 카드를 세워 그 사실을 같이 보인다.
 *
 * - 진영이 둘 이상이면 진영별 열(진영 색 머리 + 결과 칩), 아니면 카드 격자 한 벌
 * - 카드 = 국기·이름 · 역할/참여 형태 칩 · 가담~이탈 · 대표 수치(병력 → 손실 순 하나)
 * - 열마다 카드 수를 묶고 넘치면 '+N개국' 카드 — 참여 탭으로 간다
 */
import { type MouseEvent, useMemo } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiChevronRight } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import {
  formatObservationExact,
  formatObservationValue,
  observationExtent,
} from '@/entities/evidence/lib/format-observation'
import { eventCountryRoleLabel } from '@/entities/event/model/country-participant'
import { type Observation } from '@/shared/api/evidence'
import { pathKeys } from '@/shared/router'
import { shouldInterceptEntityClick } from '@/widgets/country/country-inline-modal'

import { type EventDetail, eventObservationsQueryOptions } from '../use-event-detail'
import { formatPointShort, PARTICIPATION_LABEL } from './actors/actors.lib'
import { groupBySide } from './hero-countries.lib'
import { withSideColors } from './side-colors'
import { LOSS_METRIC_PRIORITY, PERSONNEL_METRIC, representativeOf } from './side-metrics.lib'
import { SIDE_OUTCOME_LABEL } from './side-outcome'

/** 진영 열마다 보이는 카드 수 — 넘치면 '+N개국' */
const CARDS_PER_SIDE = 3
/** 진영 없는 격자의 카드 수 */
const CARDS_FLAT = 6

/** 역할 칩을 달지 않는 역할 — '참여국'은 기본, 동맹/적대는 진영 열이 이미 말하고, '기타'는 정보가 없다 */
const QUIET_ROLES = new Set(['PARTICIPANT', 'ALLY', 'ADVERSARY', 'OTHER'])

interface CardCountry {
  key: string
  id: string
  name: string
  historical: boolean
  flagEmoji?: string
  role?: string | null
  participantId?: string | null
  sideId?: string | null
  participation?: string | null
  join?: { era: 'BC' | 'AD'; year: number; month?: number | null } | null
  withdraw?: { era: 'BC' | 'AD'; year: number; month?: number | null } | null
}

/** 나라의 대표 수치 하나 — 동원 병력이 있으면 그것, 없으면 손실(정의가 다른 수는 섞지 않는다) */
function headlineFigure(list: ReadonlyArray<Observation>): Observation | null {
  for (const key of [PERSONNEL_METRIC, ...LOSS_METRIC_PRIORITY]) {
    const candidates = list.filter((entry) => entry.metric.key === key)
    const picked = representativeOf(candidates) ?? candidates[0]
    if (picked) return picked
  }
  return null
}

export function HeroCountryCards({
  event,
  onCountryClick,
  onShowActors,
}: {
  event: EventDetail
  onCountryClick: (countryId: string) => void
  onShowActors?: () => void
}) {
  const { data: observations = [] } = useQuery(eventObservationsQueryOptions(event.id))

  const countries = useMemo<CardCountry[]>(
    () => [
      ...(event.relatedCountries ?? []).map((country) => ({ ...country, key: `m-${country.id}`, historical: false })),
      ...(event.relatedHistoricalCountries ?? []).map((country) => ({
        ...country,
        key: `h-${country.id}`,
        historical: true,
      })),
    ],
    [event.relatedCountries, event.relatedHistoricalCountries],
  )
  const sides = useMemo(() => withSideColors(event.sides ?? []), [event.sides])
  const figureByParticipant = useMemo(() => {
    const grouped = new Map<string, Observation[]>()
    for (const entry of observations) {
      if (entry.subjectType !== 'EVENT_PARTICIPANT') continue
      grouped.set(entry.subjectId, [...(grouped.get(entry.subjectId) ?? []), entry])
    }
    return new Map([...grouped.entries()].map(([id, list]) => [id, headlineFigure(list)]))
  }, [observations])
  /** 진영 합계 — 진영에 직접 달린 값(병력 → 손실 순 하나) */
  const figureBySide = useMemo(() => {
    const grouped = new Map<string, Observation[]>()
    for (const entry of observations) {
      if (entry.subjectType !== 'EVENT_SIDE') continue
      grouped.set(entry.subjectId, [...(grouped.get(entry.subjectId) ?? []), entry])
    }
    return new Map([...grouped.entries()].map(([id, list]) => [id, headlineFigure(list)]))
  }, [observations])
  /**
   * 카드 수치의 기준 지표 — 가장 많은 카드가 쓰는 지표 하나. 이 지표는 위에 한 번만 이름을 적고
   * 카드에선 값만 보인다(9장 모두 '동원 병력'을 반복하지 않게). 다른 지표인 카드만 이름을 단다.
   * 막대 길이도 이 지표끼리만 견준다.
   */
  const { leadMetric, leadMax } = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>()
    for (const figure of figureByParticipant.values()) {
      if (!figure) continue
      const entry = counts.get(figure.metric.key) ?? { name: figure.metric.name, count: 0 }
      entry.count += 1
      counts.set(figure.metric.key, entry)
    }
    const top = [...counts.entries()].sort((left, right) => right[1].count - left[1].count)[0]
    if (!top) return { leadMetric: null, leadMax: 0 }
    const max = Math.max(
      0,
      ...[...figureByParticipant.values()]
        .filter((figure): figure is Observation => figure?.metric.key === top[0])
        .map((figure) => observationExtent(figure)?.center ?? 0),
    )
    return { leadMetric: { key: top[0], name: top[1].name }, leadMax: max }
  }, [figureByParticipant])

  if (countries.length === 0) return null

  const groups = groupBySide(countries, sides)
  const moreProps = onShowActors
    ? {
        href: '?tab=actors',
        onClick: (clickEvent: MouseEvent<HTMLAnchorElement>) => {
          if (!shouldInterceptEntityClick(clickEvent)) return
          clickEvent.preventDefault()
          onShowActors()
        },
      }
    : { href: '#actors' }

  const renderCard = (country: CardCountry, color: string | null) => {
    const figure = country.participantId ? figureByParticipant.get(country.participantId) : null
    const isLead = Boolean(figure && leadMetric && figure.metric.key === leadMetric.key)
    const share =
      figure && isLead && leadMax > 0 ? Math.max(3, ((observationExtent(figure)?.center ?? 0) / leadMax) * 100) : null
    const role = country.role && !QUIET_ROLES.has(country.role) ? eventCountryRoleLabel(country.role) : null
    const participation =
      country.participation && country.participation !== 'FULL' ? PARTICIPATION_LABEL[country.participation] : null
    const join = formatPointShort(country.join)
    const withdraw = formatPointShort(country.withdraw)
    const period = join || withdraw ? `${join ?? ''}~${withdraw ?? ''}` : null
    return (
      <Card
        key={country.key}
        to={pathKeys.countryDetail(country.id)}
        aria-haspopup="dialog"
        onClick={(clickEvent) => {
          if (!shouldInterceptEntityClick(clickEvent)) return
          clickEvent.preventDefault()
          onCountryClick(country.id)
        }}
      >
        <CardHead>
          <Emblem $historical={country.historical} aria-hidden>
            {country.flagEmoji || country.name.charAt(0)}
          </Emblem>
          <CardName title={country.name}>{country.name}</CardName>
          {figure && (
            <FigureValue title={`${figure.metric.name} ${formatObservationExact(figure)}`}>
              {!isLead && <span className="label">{figure.metric.name}</span>}
              {formatObservationValue(figure)}
            </FigureValue>
          )}
        </CardHead>
        {(role || participation || period) && (
          <CardTags>
            {role && <Tag $strong>{role}</Tag>}
            {participation && <Tag>{participation}</Tag>}
            {period && <Period>{period}</Period>}
          </CardTags>
        )}
        {share !== null && (
          <Share aria-hidden>
            <span style={{ width: `${share}%`, background: color ?? 'var(--hero-neutral)' }} />
          </Share>
        )}
      </Card>
    )
  }

  const moreCard = (count: number) => (
    <MoreCard {...moreProps}>
      +{count}개국
      <FiChevronRight aria-hidden />
    </MoreCard>
  )

  if (!groups) {
    const shown = countries.slice(0, CARDS_FLAT)
    return (
      <Wrap aria-label="참여국">
        {leadMetric && <Legend>카드 수치 · {leadMetric.name}</Legend>}
        <FlatGrid>
          {shown.map((country) => renderCard(country, null))}
          {countries.length > shown.length && moreCard(countries.length - shown.length)}
        </FlatGrid>
      </Wrap>
    )
  }

  const sideById = new Map(sides.map((side) => [side.id, side]))
  return (
    <Wrap aria-label="진영별 참여국">
      {leadMetric && <Legend>머리 = 진영 합계 · 카드 = 나라별 {leadMetric.name}</Legend>}
      <Columns>
        {groups.map((group) => {
          const side = group.sideId ? sideById.get(group.sideId) : null
          const shown = group.items.slice(0, CARDS_PER_SIDE)
          return (
            <Column key={group.sideId ?? 'rest'} $rest={!side}>
              <ColumnHead $color={side?.color ?? null}>
                {side && <Dot style={{ background: side.color }} aria-hidden />}
                <span className="name">{group.label}</span>
                <span className="count">{group.items.length}개국</span>
                {side?.outcome && (
                  <Outcome title={side.outcomeNote ?? undefined}>{SIDE_OUTCOME_LABEL[side.outcome]}</Outcome>
                )}
                {side && figureBySide.get(side.id) && (
                  <SideTotal title={`${figureBySide.get(side.id)!.metric.name} ${formatObservationExact(figureBySide.get(side.id)!)}`}>
                    {formatObservationValue(figureBySide.get(side.id)!)}
                  </SideTotal>
                )}
              </ColumnHead>
              <ColumnCards $rest={!side}>
                {shown.map((country) => renderCard(country, side?.color ?? null))}
                {group.items.length > shown.length && moreCard(group.items.length - shown.length)}
              </ColumnCards>
            </Column>
          )
        })}
      </Columns>
    </Wrap>
  )
}

/* ── styled — 선 없이 면으로 ── */

const fill = (mode: string, light: number, dark: number) =>
  mode === 'dark' ? `rgba(255,255,255,${dark})` : `rgba(15,23,42,${light})`

const Wrap = styled.div`
  --hero-neutral: #94a3b8;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
`

/** 수치 읽는 법 한 줄 — 카드마다 지표 이름을 반복하지 않는 대신 */
const Legend = styled.span`
  align-self: flex-end;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/** 진영 합계 — 머리 오른쪽 끝, 크게 */
const SideTotal = styled.span`
  margin-left: auto;
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`

/** 진영 열 — 넓으면 나란히(대립 구도), 좁으면 위아래. '그 밖'은 한 줄을 다 쓴다 */
const Columns = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
  gap: 12px;
`

const Column = styled.div<{ $rest: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  grid-column: ${({ $rest }) => ($rest ? '1 / -1' : 'auto')};
`

const ColumnHead = styled.div<{ $color: string | null }>`
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 10px;
  border-radius: 10px;
  background: ${({ $color, theme }) =>
    $color
      ? `color-mix(in srgb, ${$color} ${theme.mode === 'dark' ? 18 : 10}%, transparent)`
      : fill(theme.mode, 0.035, 0.045)};

  .name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    font-weight: 750;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .count {
    flex-shrink: 0;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const Dot = styled.span`
  flex-shrink: 0;
  width: 9px;
  height: 9px;
  border-radius: 3px;
`

const Outcome = styled.span`
  flex-shrink: 0;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)')};
  cursor: ${({ title }) => (title ? 'help' : 'default')};
`

const ColumnCards = styled.div<{ $rest: boolean }>`
  display: grid;
  align-items: start;
  grid-template-columns: ${({ $rest }) => ($rest ? 'repeat(auto-fill, minmax(min(100%, 200px), 1fr))' : 'minmax(0, 1fr)')};
  gap: 6px;
`

const FlatGrid = styled.div`
  display: grid;
  align-items: start;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr));
  gap: 8px;
`

/** 국가 카드 — 누르면 국가 정보 모달(새 탭 열기는 링크 그대로) */
const Card = styled(Link)`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  padding: 10px 12px;
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
  background: ${({ theme }) => fill(theme.mode, 0.03, 0.04)};
  transition: background 0.12s;

  &:hover {
    background: ${({ theme }) => fill(theme.mode, 0.06, 0.07)};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 1px;
  }
`

const CardHead = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`

/** 국기 — 없으면 이름 첫 글자(역사국가는 기울여 구분) */
const Emblem = styled.span<{ $historical: boolean }>`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 700;
  font-style: ${({ $historical }) => ($historical ? 'italic' : 'normal')};
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => fill(theme.mode, 0.06, 0.08)};
`

const CardName = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 650;
  color: ${({ theme }) => theme.colors.text.primary};
`

const CardTags = styled.span`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 6px;
`

const Tag = styled.span<{ $strong?: boolean }>`
  padding: 0 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 650;
  line-height: 18px;
  color: ${({ theme, $strong }) => ($strong ? theme.colors.text.primary : theme.colors.text.secondary)};
  background: ${({ theme, $strong }) => ($strong ? fill(theme.mode, 0.09, 0.12) : fill(theme.mode, 0.05, 0.07))};
`

const Period = styled.span`
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/** 대표 수치 — 이름 오른쪽. 기준 지표가 아니면 지표 이름을 작게 앞에 */
const FigureValue = styled.span`
  margin-left: auto;
  flex-shrink: 0;
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  font-size: 13.5px;
  font-weight: 750;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};

  .label {
    font-size: 11px;
    font-weight: 500;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

/** 규모 막대 — 같은 지표끼리 최댓값 대비, 진영 색 */
const Share = styled.span`
  display: block;
  height: 4px;
  border-radius: 2px;
  background: ${({ theme }) => fill(theme.mode, 0.06, 0.08)};
  overflow: hidden;

  > span {
    display: block;
    height: 100%;
    border-radius: 2px;
    opacity: 0.75;
  }
`

const MoreCard = styled.a`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 40px;
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 12.5px;
  font-weight: 650;
  text-decoration: none;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => fill(theme.mode, 0.03, 0.04)};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => fill(theme.mode, 0.06, 0.07)};
  }
  svg {
    width: 14px;
    height: 14px;
  }
`
