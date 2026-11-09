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
import { metaText } from '@/pages/events/styles/theme'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import { getOfficeHoldingTimeline, officeHoldingTimelineKey } from '@/shared/api/sovereign-reigns'
import { type Observation } from '@/shared/api/evidence'
import { useMediaQuery } from '@/shared/hooks/use-media-query.hook'
import { pathKeys } from '@/shared/router'
import { shouldInterceptEntityClick } from '@/widgets/country/country-inline-modal'

import { type EventDetail, eventObservationsQueryOptions } from '../use-event-detail'
import { formatPointShort, PARTICIPATION_LABEL } from './actors/actors.lib'
import {
  type BridgeCountry,
  type CountryHeads,
  type OfficeHoldingRow,
  describeHeads,
  eventWindow,
  formatHeadPoint,
  headsForCountry,
} from './contemporary-heads.lib'
import { groupBySide, HERO_CARDS_FLAT, HERO_CARDS_PER_SIDE } from './hero-countries.lib'
import { withSideColors } from './side-colors'
import { LOSS_METRIC_PRIORITY, PERSONNEL_METRIC, representativeOf } from './side-metrics.lib'
import { SIDE_OUTCOME_LABEL } from './side-outcome'

/** 진영 열마다 보이는 카드 수 — 넘치면 '+N개국' */
const CARDS_PER_SIDE = HERO_CARDS_PER_SIDE
/** 진영 없는 격자의 카드 수 */
const CARDS_FLAT = HERO_CARDS_FLAT

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
  /**
   * 휴대폰 폭 — 진영마다 카드가 한 줄씩 쌓여 1차대전은 진영 카드만 한 화면이었고 탭이 1,058px까지 밀렸다.
   * 진영을 나란히 두 열로 세우고 진영당 2장(나머지는 '+N개국')으로 줄인다.
   */
  const narrow = useMediaQuery('(max-width: 639px)')
  /* 진영당 장 수는 폭과 무관하게 같다 — 데스크톱 3·휴대폰 2이던 때는 같은 동맹국이 '+1'·'+2'로 달라 보였다 */
  const perSide = CARDS_PER_SIDE
  const flatCount = narrow ? 4 : CARDS_FLAT

  /**
   * 참여 탭 '순서 변경'의 순서(sortOrder) 그대로. 예전엔 현대 국가를 먼저 이어 붙여, 주 교전국이 역사 국가인
   * 사건(보불전쟁의 프로이센·프랑스 제2제국)에서 덜 중요한 현대 국가 카드가 맨 앞에 섰다.
   */
  const countries = useMemo<CardCountry[]>(
    () =>
      [
        ...(event.relatedCountries ?? []).map((country) => ({ ...country, key: `m-${country.id}`, historical: false })),
        ...(event.relatedHistoricalCountries ?? []).map((country) => ({
          ...country,
          key: `h-${country.id}`,
          historical: true,
        })),
      ]
        .map((country, index) => ({ country, index }))
        .sort(
          (left, right) =>
            (left.country.sortOrder ?? Number.MAX_SAFE_INTEGER) - (right.country.sortOrder ?? Number.MAX_SAFE_INTEGER) ||
            left.index - right.index,
        )
        .map(({ country }) => country),
    [event.relatedCountries, event.relatedHistoricalCountries],
  )
  const sides = useMemo(() => withSideColors(event.sides ?? []), [event.sides])

  /*
   * 당시 국가원수 — 사건 목록의 즉위 표지와 같은 피드·같은 캐시. 현대 국가 카드(영국·프랑스…)는 그 해의
   * 역사 국가로 이어 찾으므로 역사 국가 목록(목록 화면과 같은 캐시)이 필요하다 — 현대 국가 카드가 있을 때만.
   */
  const { data: officeHoldings } = useQuery({
    queryKey: officeHoldingTimelineKey,
    queryFn: getOfficeHoldingTimeline,
    staleTime: 5 * 60 * 1000,
  })
  /* 역사 국가 목록 — 현대 국가 카드의 당시 원수 찾기, 그리고 같은 나라의 정체들을 한 나라로 세기에 쓴다 */
  const { data: historicalCountryList } = useQuery({
    queryKey: ['historical-countries'],
    queryFn: getAllHistoricalCountries,
    staleTime: 5 * 60 * 1000,
    enabled: countries.length > 1,
  })
  /**
   * 진영의 나라 수 — 정체가 바뀐 한 나라를 한 나라로 센다. 보불전쟁 '프랑스 측'의 프랑스 · 프랑스 제2제국 ·
   * 프랑스 제3공화국은 '3개국'이 아니다. 같은 현대 국가에 이어진 역사 국가들 중 **존속 기간이 겹치지 않는 것끼리**만
   * 이어진 정체로 본다 — 프로이센·바이에른·바덴처럼 같은 때 함께 있던 나라는 모두 독일에 이어져 있어도 각자 한 나라다.
   * 한 현대 국가 묶음의 나라 수 = 동시에 존속한 역사 국가의 최대 수(구간 그래프 채색수), 역사 국가가 없으면 1.
   */
  const nationCountOf = useMemo(() => {
    const byId = new Map(
      ((historicalCountryList ?? []) as unknown as BridgeCountry[]).map((country) => [country.id, country]),
    )
    const signed = (era: string | null | undefined, year: number | null | undefined) =>
      year == null ? null : era === 'BC' ? -year : year
    return (items: ReadonlyArray<CardCountry>) => {
      const buckets = new Map<string, { modern: boolean; spans: Array<[number, number]> }>()
      let unbridged = 0
      for (const country of items) {
        if (!country.historical) {
          const bucket = buckets.get(country.id) ?? { modern: false, spans: [] }
          bucket.modern = true
          buckets.set(country.id, bucket)
          continue
        }
        const bridge = byId.get(country.id)
        const parent = bridge?.parentModernCountryIds?.length === 1 ? bridge.parentModernCountryIds[0] : null
        const from = signed(bridge?.startEra, bridge?.startYear)
        if (!parent || from == null) {
          unbridged += 1
          continue
        }
        const to = signed(bridge?.endEra, bridge?.endYear) ?? Number.MAX_SAFE_INTEGER
        const bucket = buckets.get(parent) ?? { modern: false, spans: [] }
        bucket.spans.push([from, to])
        buckets.set(parent, bucket)
      }
      let total = unbridged
      for (const bucket of buckets.values()) {
        /* 끝과 시작이 같은 해(1870 제2제국 → 제3공화국)는 이어진 것 — 겹침이 아니다 */
        const edges = bucket.spans.flatMap(([from, to]) => [
          [from, 1],
          [to, -1],
        ])
        edges.sort((left, right) => left[0] - right[0] || left[1] - right[1])
        let live = 0
        let peak = 0
        for (const [, delta] of edges) {
          live += delta
          peak = Math.max(peak, live)
        }
        total += Math.max(peak, bucket.modern ? 1 : 0)
      }
      return total
    }
  }, [historicalCountryList])
  const headsByKey = useMemo(() => {
    const result = new Map<string, CountryHeads>()
    const window = eventWindow(event)
    if (!window || !officeHoldings) return result
    const rows = officeHoldings as OfficeHoldingRow[]
    const bridge = (historicalCountryList ?? []) as unknown as BridgeCountry[]
    /* 따로 카드가 있는 역사 국가는 현대 국가 카드가 다시 싣지 않는다(보불의 프랑스·프랑스 제2제국) */
    const ownHistorical = new Set((event.relatedHistoricalCountries ?? []).map((country) => country.id))
    for (const country of countries) {
      const target = { kind: country.historical ? ('H' as const) : ('C' as const), id: country.id }
      result.set(country.key, headsForCountry(target, rows, window, bridge, ownHistorical))
    }
    return result
  }, [event, officeHoldings, historicalCountryList, countries])
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

  /**
   * 당시 국가원수 한 줄 — 시작 시점의 사람, 기간 중 바뀌었으면 '→ 마지막 사람 · 시점(외 N명)'.
   * 카드 전체가 국가 링크라 이름은 누르는 자리가 아니다(링크 안 링크 금지). 전체 목록은 툴팁에.
   * 기록이 없는 나라는 아무것도 그리지 않는다 — 카드가 지금 그대로라 빈칸이 생기지 않는다.
   */
  const renderHeads = (heads: CountryHeads | undefined) => {
    if (!heads || (!heads.atStart && heads.changes.length === 0)) return null
    const last = heads.changes[heads.changes.length - 1]
    const first = heads.changes[0]
    const hidden = heads.changes.length - 1
    return (
      <HeadsLine title={describeHeads(heads)}>
        <VisuallyHidden>당시 국가원수 </VisuallyHidden>
        {heads.atStart ? (
          <>
            <b>{heads.atStart.name}</b>
            {!last && heads.atStart.title && !narrow && <span className="meta">{heads.atStart.title}</span>}
            {last && (
              <>
                <span className="arrow" aria-label="이후">→</span>
                <b>{last.name}</b>
                <span className="meta">
                  {formatHeadPoint(last)}
                  {hidden > 0 && ` 외 ${hidden}명`}
                </span>
              </>
            )}
          </>
        ) : (
          <>
            <span className="meta">{formatHeadPoint(first)}~</span>
            <b>{first.name}</b>
            {hidden > 0 && <span className="meta">외 {hidden}명</span>}
          </>
        )}
      </HeadsLine>
    )
  }

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
        {renderHeads(headsByKey.get(country.key))}
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
    const shown = countries.slice(0, flatCount)
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
          const shown = group.items.slice(0, perSide)
          return (
            <Column key={group.sideId ?? 'rest'} $rest={!side}>
              <ColumnHead $color={side?.color ?? null}>
                {side && <Dot style={{ background: side.color }} aria-hidden />}
                <span className="name">{group.label}</span>
                {(() => {
                  const nations = nationCountOf(group.items)
                  return (
                    <span
                      className="count"
                      title={
                        nations < group.items.length
                          ? `카드 ${group.items.length}장 — 같은 나라의 다른 정체(왕국·제국·공화국)를 한 나라로 셌습니다`
                          : undefined
                      }
                    >
                      {nations}개국
                      {nations < group.items.length && ` · 카드 ${group.items.length}`}
                    </span>
                  )
                })()}
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

  /* 휴대폰 폭 — 진영을 나란히(한 열씩 쌓으면 진영 카드만 한 화면) */
  @media (max-width: 639px) {
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 8px;
  }
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

  @media (max-width: 639px) {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  }
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

/** 당시 국가원수 — 나라 이름 아래 한 줄. 이름만 진하게, 직함·시점은 한 단 흐리게 */
const HeadsLine = styled.span`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px 5px;
  min-width: 0;
  font-size: 12.5px;
  line-height: 1.4;
  color: ${({ theme }) => theme.colors.text.secondary};

  b {
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .meta {
    font-size: 11.5px;
    font-variant-numeric: tabular-nums;
    color: ${metaText};
  }
  .arrow {
    color: ${metaText};
  }
`

const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
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
