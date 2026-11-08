/**
 * 상위 흐름 띠 — 하위 사건 상세의 제목 바로 아래, '이 사건이 상위 사건 흐름의 어디쯤인가'를 한 줄로.
 *
 * 예전엔 스당 전투 상세에 상위가 회색 빵부스러기 글자 '보불전쟁'으로만 있었고, 같은 상위의 앞뒤 사건은
 * 연관 탭 소속 줄 안에만 있었다. 9개월 전쟁의 7번째·개전 44일째라는 사실은 어디에도 그려지지 않았다
 * (2026-11-08 인포그래픽 검토 E).
 *
 * - 머리 줄: '보불전쟁 13건 중 7번째 · 시작 44일째 · 2국면 ○○' + ← 이전 · 다음 →
 * - 띠: 상위 기간을 가로축으로, 형제 사건을 점(하루)·막대(기간)로, 이 사건을 강조색으로
 * 형제 목록은 연관 탭 소속 줄과 같은 쿼리(eventKeys.siblings)라 캐시를 나눠 쓴다.
 */
import { useMemo } from 'react'

import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import { eventKeys } from '@/shared/api/event-query-keys'
import { getEventsByParentId } from '@/shared/api/events'
import { pathKeys } from '@/shared/router'

import { type EventDetail, usePrefetchEventDetail } from '../use-event-detail'
import { compareEventStart } from './detail-network.lib'
import { type AxisSpan, formatSpanLabel, toAxisSpan } from './development-timeline.lib'
import { type EventPhase, phaseReach } from './event-phase.lib'

const DAYS_PER_YEAR = 365.25
/** 겹친 형제를 쌓는 줄 높이(px) — 표지의 세로 가운데 */
const LANE_HEIGHT = 9
const laneTop = (lane: number) => `${3 + lane * LANE_HEIGHT + LANE_HEIGHT / 2}px`

/** 상위 시작에서 얼마나 지났나 — 하루 정밀도끼리만 일, 아니면 달·해로 거칠게 */
function elapsedLabel(parent: AxisSpan, current: AxisSpan, dayPrecise: boolean): string | null {
  const years = current.from - parent.from
  if (years < 0) return null
  if (dayPrecise) {
    const days = Math.round(years * DAYS_PER_YEAR) + 1
    if (days <= 92) return `시작 ${days}일째`
  }
  const months = Math.floor(years * 12)
  if (months < 1) return '시작한 달'
  if (months < 24) return `시작 ${months}개월째`
  return `시작 ${Math.floor(years)}년째`
}

export function ParentFlowStrip({ event }: { event: EventDetail }) {
  const parent = event.parentEvent
  const prefetchEvent = usePrefetchEventDetail()
  const { data: siblings = [] } = useQuery({
    queryKey: eventKeys.siblings(event.parentEventId),
    queryFn: () => getEventsByParentId(event.parentEventId as string),
    enabled: Boolean(event.parentEventId),
    staleTime: 60_000,
  })

  const layout = useMemo(() => {
    if (!parent) return null
    const ordered = siblings
      .slice()
      .sort((first, second) => compareEventStart(first.startDate, second.startDate))
    const index = ordered.findIndex((sibling) => sibling.id === event.id)
    if (index < 0 || ordered.length < 2) return null
    const spans = ordered.map((sibling) => ({ sibling, span: toAxisSpan(sibling as Parameters<typeof toAxisSpan>[0]) }))
    const parentSpan = toAxisSpan(parent as Parameters<typeof toAxisSpan>[0])
    const known = spans.flatMap(({ span }) => (span ? [span] : []))
    if (known.length === 0) return null
    /* 축 = 상위 기간 ∪ 형제 — 상위 기간 밖의 전사(前史)·여파도 띠 안에 선다 */
    const from = Math.min(parentSpan?.from ?? Infinity, ...known.map((span) => span.from))
    const to = Math.max(parentSpan?.to ?? -Infinity, ...known.map((span) => span.to))
    const width = Math.max(to - from, 1 / 365.25)
    const pct = (value: number) => ((value - from) / width) * 100
    const current = spans[index].span
    const dayPrecise =
      !event.startDatePrecision || event.startDatePrecision === 'day'
        ? !parent.startDatePrecision || parent.startDatePrecision === 'day'
        : false
    const phases = [...((parent.phases ?? []) as EventPhase[])].sort((left, right) => left.order - right.order)
    const reach = phases.length
      ? phaseReach(phases, {
          id: event.id,
          phaseId: (event as { phaseId?: string | null }).phaseId ?? null,
          startDate: event.startDate ?? null,
          startDatePrecision: event.startDatePrecision ?? null,
          endDate: event.endDate ?? null,
          endDatePrecision: event.endDatePrecision ?? null,
        })
      : null
    const phase = reach?.from != null ? phases[reach.from - 1] : null
    /* 겹치는 형제는 줄을 나눠 쌓는다(최대 3줄) — 한 줄에 겹치면 파리 포위·루아르 반격이 굵은 회색 한 덩어리였다 */
    const LANES = 3
    const laneEnds: number[] = []
    const laneOf = new Map<string, number>()
    for (const { sibling, span } of spans) {
      if (!span) continue
      const left = pct(span.from)
      const right = Math.max(pct(span.to), left + 1)
      let lane = laneEnds.findIndex((end) => end <= left)
      if (lane < 0) lane = laneEnds.length < LANES ? laneEnds.length : laneEnds.indexOf(Math.min(...laneEnds))
      laneEnds[lane] = Math.max(laneEnds[lane] ?? -Infinity, right)
      laneOf.set(sibling.id, lane)
    }
    return {
      lanes: Math.max(1, laneEnds.length),
      count: ordered.length,
      position: index + 1,
      prev: index > 0 ? ordered[index - 1] : null,
      next: index < ordered.length - 1 ? ordered[index + 1] : null,
      marks: spans.flatMap(({ sibling, span }) =>
        span
          ? [
              {
                id: sibling.id,
                title: sibling.title,
                lane: laneOf.get(sibling.id) ?? 0,
                current: sibling.id === event.id,
                point: span.isPoint || pct(span.to) - pct(span.from) < 0.8,
                left: pct(span.from),
                width: pct(span.to) - pct(span.from),
                label: formatSpanLabel(sibling as Parameters<typeof formatSpanLabel>[0]),
              },
            ]
          : [],
      ),
      band: parentSpan ? { left: pct(parentSpan.from), width: pct(parentSpan.to) - pct(parentSpan.from) } : null,
      startLabel: formatSpanLabel({ id: parent.id, title: parent.title, startDate: parent.startDate, startDatePrecision: parent.startDatePrecision }),
      endLabel: parent.endDate
        ? formatSpanLabel({ id: parent.id, title: parent.title, startDate: parent.endDate, startDatePrecision: parent.endDatePrecision })
        : null,
      elapsed: parentSpan && current ? elapsedLabel(parentSpan, current, dayPrecise) : null,
      phase: phase && reach?.from != null ? `${reach.from}국면 ${phase.title}` : null,
    }
  }, [parent, siblings, event])

  if (!parent || !layout) return null

  return (
    <Strip aria-label={`${parent.title} 안에서 이 사건의 자리`}>
      <Head>
        <Where>
          <ParentLink to={pathKeys.events.detail(parent.id)} onMouseEnter={() => prefetchEvent(parent.id)}>
            {parent.title}
          </ParentLink>{' '}
          {layout.count}건 중 <b>{layout.position}번째</b>
          {layout.elapsed && <span className="meta"> · {layout.elapsed}</span>}
          {layout.phase && <span className="meta"> · {layout.phase}</span>}
        </Where>
        <Steps>
          {layout.prev && (
            <StepLink
              to={pathKeys.events.detail(layout.prev.id)}
              onMouseEnter={() => prefetchEvent(layout.prev!.id)}
              title={layout.prev.title}
              aria-label={`이전 사건: ${layout.prev.title}`}
            >
              ← <span>{layout.prev.title}</span>
            </StepLink>
          )}
          {layout.next && (
            <StepLink
              to={pathKeys.events.detail(layout.next.id)}
              onMouseEnter={() => prefetchEvent(layout.next!.id)}
              title={layout.next.title}
              aria-label={`다음 사건: ${layout.next.title}`}
            >
              <span>{layout.next.title}</span> →
            </StepLink>
          )}
        </Steps>
      </Head>
      <Track aria-hidden="true" style={{ height: `${layout.lanes * LANE_HEIGHT + 6}px` }}>
        {layout.band && <Band style={{ left: `${layout.band.left}%`, width: `${layout.band.width}%` }} />}
        {layout.marks
          .filter((mark) => !mark.current)
          .map((mark) =>
            mark.point ? (
              <Dot key={mark.id} to={pathKeys.events.detail(mark.id)} tabIndex={-1} title={`${mark.title} · ${mark.label}`} style={{ left: `${mark.left}%`, top: laneTop(mark.lane) }} />
            ) : (
              <Bar key={mark.id} to={pathKeys.events.detail(mark.id)} tabIndex={-1} title={`${mark.title} · ${mark.label}`} style={{ left: `${mark.left}%`, width: `${mark.width}%`, top: laneTop(mark.lane) }} />
            ),
          )}
        {layout.marks
          .filter((mark) => mark.current)
          .map((mark) =>
            mark.point ? (
              <CurrentDot key={mark.id} style={{ left: `${mark.left}%`, top: laneTop(mark.lane) }} />
            ) : (
              <CurrentBar key={mark.id} style={{ left: `${mark.left}%`, width: `${mark.width}%`, top: laneTop(mark.lane) }} />
            ),
          )}
      </Track>
      {/* 상위 기간의 양 끝 — 띠는 전사·여파까지 넓어질 수 있어 축 끝이 아니라 상위 기간 끝에 단다 */}
      <Ends aria-hidden="true">
        <span style={{ left: `${layout.band?.left ?? 0}%` }}>{layout.startLabel}</span>
        {layout.endLabel && (
          <span
            data-end
            style={{ right: `${100 - (layout.band ? layout.band.left + layout.band.width : 100)}%` }}
          >
            {layout.endLabel}
          </span>
        )}
      </Ends>
    </Strip>
  )
}

/* ── styled — 띠는 조용하게, 이 사건만 강조색 ── */

const Strip = styled.nav`
  margin: 14px 0 4px;
  padding: 10px 12px 8px;
  border-radius: 10px;
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.035)' : 'rgba(20,19,34,0.03)')};
`

const Head = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px 16px;
  font-size: 13px;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.text.secondary};

  b {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  .meta {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const Where = styled.div`
  min-width: 0;
`

const ParentLink = styled(Link)`
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

const Steps = styled.div`
  display: flex;
  gap: 12px;
  min-width: 0;
`

const StepLink = styled(Link)`
  display: inline-flex;
  gap: 4px;
  max-width: 22ch;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
  text-decoration: none;
  white-space: nowrap;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const Track = styled.div`
  position: relative;
  height: 18px;
  margin-top: 8px;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 7.5px;
    height: 1px;
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(20,19,34,0.14)')};
  }
`

/** 상위 기간 — 띠에서 전사·여파와 갈리는 옅은 면 */
const Band = styled.span`
  position: absolute;
  top: 2px;
  bottom: 2px;
  border-radius: 3px;
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(129,140,248,0.10)' : 'rgba(79,70,229,0.06)')};
`

const siblingInk = ({ theme }: { theme: { mode: string } }) => (theme.mode === 'dark' ? '#71717a' : '#a1a1aa')

const Dot = styled(Link)`
  position: absolute;
  top: 50%;
  width: 6px;
  height: 6px;
  margin-left: -3px;
  border-radius: 50%;
  transform: translateY(-50%);
  background: ${siblingInk};

  &:hover {
    background: ${({ theme }) => theme.colors.text.primary};
  }
`

const Bar = styled(Link)`
  position: absolute;
  top: 50%;
  height: 4px;
  min-width: 4px;
  border-radius: 2px;
  transform: translateY(-50%);
  background: ${siblingInk};

  &:hover {
    background: ${({ theme }) => theme.colors.text.primary};
  }
`

const currentInk = ({ theme }: { theme: { mode: string } }) => (theme.mode === 'dark' ? '#818cf8' : '#4f46e5')

const CurrentDot = styled.span`
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  margin-left: -6px;
  border-radius: 50%;
  transform: translateY(-50%);
  background: ${currentInk};
  box-shadow: 0 0 0 3px ${({ theme }) => (theme.mode === 'dark' ? '#18181b' : '#ffffff')};
`

const CurrentBar = styled.span`
  position: absolute;
  top: 50%;
  height: 8px;
  min-width: 8px;
  border-radius: 4px;
  transform: translateY(-50%);
  background: ${currentInk};
`

const Ends = styled.div`
  position: relative;
  height: 14px;
  margin-top: 2px;
  font-size: 11px;
  line-height: 14px;
  white-space: nowrap;

  span {
    position: absolute;
    top: 0;
  }
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
`
