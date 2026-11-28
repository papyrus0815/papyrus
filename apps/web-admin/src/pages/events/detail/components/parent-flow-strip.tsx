/**
 * 상위 흐름 띠 — 하위 사건 상세의 제목 바로 아래에서:
 *  1) 이 사건이 상위 사건 하위 몇 건 중 시간순 몇 번째인지 · 상위 시작 대비 시점('상위 시작 5일 전', '시작 26일째' 등)
 *  2) 바로 앞·뒤 하위 사건으로 건너가는 무보더 두 열 탐색 줄을 조용한 장부 조판으로 보여 준다.
 *
 * 지면 전체 규약(styles.ts · detail-network.styles.ts)에 맞춰 알약(pill)·박스 테두리·가로 캐러셀을 쓰지 않고,
 * 단일 상단 헤어라인과 순수 타이포그래피·고정폭 숫자(DIGIT_DISPLAY)만으로 위계를 세운다.
 * 아래에 바로 TabBar(하단 보더)가 이어지므로 하단 보더는 두지 않는다(보더 이중 겹침 방지).
 */
import { useMemo } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiArrowUpRight, FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import {
  DIGIT_DISPLAY,
  RADIUS,
  ledgerAccent,
  ledgerHairline,
} from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'
import { eventKeys } from '@/shared/api/event-query-keys'
import { getEventsByParentId } from '@/shared/api/events'
import { pathKeys } from '@/shared/router'

import { type EventDetail, usePrefetchEventDetail } from '../use-event-detail'
import type { EventPhase } from './event-phase.lib'
import { buildParentFlowLayout } from './parent-flow-strip.lib'

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
    return buildParentFlowLayout(
      {
        id: parent.id,
        title: parent.title,
        startDate: parent.startDate,
        startDatePrecision: parent.startDatePrecision,
        endDate: parent.endDate,
        endDatePrecision: parent.endDatePrecision,
        phases: (parent.phases ?? []) as EventPhase[],
      },
      siblings,
      {
        id: event.id,
        title: event.title,
        startDate: event.startDate,
        startDatePrecision: event.startDatePrecision,
        endDate: event.endDate,
        endDatePrecision: event.endDatePrecision,
        phaseId: (event as { phaseId?: string | null }).phaseId ?? null,
      },
    )
  }, [parent, siblings, event])

  if (!parent || !layout) return null

  const parentTooltip = layout.parentSpanLabel
    ? `${parent.title} (${layout.parentSpanLabel})`
    : parent.title

  const parentFlowHref =
    parent.kind === 'SINGLE'
      ? `${pathKeys.events.detail(parent.id)}#narrative`
      : `${pathKeys.events.detail(parent.id)}?tab=survey`

  const prevStep = layout.position > 1 ? layout.steps[layout.position - 2] : null
  const nextStep = layout.position < layout.count ? layout.steps[layout.position] : null

  return (
    <Strip aria-label={`상위 사건 ${parent.title}의 하위 사건 흐름`}>
      <Head>
        <Where>
          <ParentLink
            to={pathKeys.events.detail(parent.id)}
            viewTransition
            onMouseEnter={() => prefetchEvent(parent.id)}
            onFocus={() => prefetchEvent(parent.id)}
            title={parentTooltip}
          >
            {parent.title}
          </ParentLink>
          <Dot aria-hidden>·</Dot>
          <MetaText>
            하위 <Num>{layout.count}</Num>건 중 시간순{' '}
            <CurrentPos>{layout.position}번째</CurrentPos>
          </MetaText>
          {layout.relativeTiming && (
            <>
              <Dot aria-hidden>·</Dot>
              <SubtleMeta>{layout.relativeTiming}</SubtleMeta>
            </>
          )}
          {layout.phase && (
            <>
              <Dot aria-hidden>·</Dot>
              <SubtleMeta>{layout.phase}</SubtleMeta>
            </>
          )}
        </Where>

        <OverviewJumpLink
          to={parentFlowHref}
          viewTransition
          onMouseEnter={() => prefetchEvent(parent.id)}
          onFocus={() => prefetchEvent(parent.id)}
          title={`${parent.title}의 하위 사건 전체 흐름 보기`}
        >
          전체 흐름
          <FiArrowUpRight size={12} aria-hidden />
        </OverviewJumpLink>
      </Head>

      {(prevStep || nextStep) && (
        <NeighborRow>
          {prevStep ? (
            <NeighborLink
              to={pathKeys.events.detail(prevStep.id)}
              viewTransition
              onMouseEnter={() => prefetchEvent(prevStep.id)}
              onFocus={() => prefetchEvent(prevStep.id)}
              title={
                prevStep.dateLabel
                  ? `${prevStep.order}/${layout.count} · ${prevStep.title} (${prevStep.dateLabel})`
                  : `${prevStep.order}/${layout.count} · ${prevStep.title}`
              }
              aria-label={`이전 하위 사건: ${prevStep.title}`}
            >
              <FiChevronLeft aria-hidden />
              <OrderNum>{prevStep.order}</OrderNum>
              <NeighborTitle>{prevStep.title}</NeighborTitle>
            </NeighborLink>
          ) : (
            <span aria-hidden />
          )}

          {nextStep && (
            <NeighborLink
              to={pathKeys.events.detail(nextStep.id)}
              viewTransition
              $alignEnd
              onMouseEnter={() => prefetchEvent(nextStep.id)}
              onFocus={() => prefetchEvent(nextStep.id)}
              title={
                nextStep.dateLabel
                  ? `${nextStep.order}/${layout.count} · ${nextStep.title} (${nextStep.dateLabel})`
                  : `${nextStep.order}/${layout.count} · ${nextStep.title}`
              }
              aria-label={`다음 하위 사건: ${nextStep.title}`}
            >
              <OrderNum>{nextStep.order}</OrderNum>
              <NeighborTitle>{nextStep.title}</NeighborTitle>
              <FiChevronRight aria-hidden />
            </NeighborLink>
          )}
        </NeighborRow>
      )}
    </Strip>
  )
}

/* ── styled — 무보더 타이포그래피 · 단일 상단 헤어라인 ── */

const Strip = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 4px 0 0;
  padding: 12px 0 2px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: transparent;

  @container eventdetail (max-width: 639px) {
    gap: 5px;
    padding: 10px 0 0;
  }
`

const Head = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px 16px;
  font-size: 13px;
  line-height: 1.5;
`

const Where = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 6px;
  min-width: 0;
`

const ParentLink = styled(Link)`
  font-weight: 650;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;

  &:hover,
  &:focus-visible {
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 3px;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
    border-radius: ${RADIUS.FOCUS};
  }
`

const Dot = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  opacity: 0.55;
  font-size: 12px;
`

const MetaText = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Num = styled.span`
  ${DIGIT_DISPLAY}
  font-size: 12.5px;
`

const CurrentPos = styled.strong`
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`

const SubtleMeta = styled.span`
  color: ${metaText};
  font-variant-numeric: tabular-nums;
`

const OverviewJumpLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  font-weight: 500;
  color: ${metaText};
  text-decoration: none;
  white-space: nowrap;

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
    border-radius: ${RADIUS.FOCUS};
  }
`

const NeighborRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
  width: 100%;

  @container eventdetail (max-width: 520px) {
    gap: 10px;
  }
`

const NeighborLink = styled(Link)<{ $alignEnd?: boolean }>`
  grid-column: ${({ $alignEnd }) => ($alignEnd ? '2' : '1')};
  display: inline-flex;
  align-items: center;
  justify-content: ${({ $alignEnd }) => ($alignEnd ? 'flex-end' : 'flex-start')};
  gap: 5px;
  min-width: 0;
  padding: 2px 0;
  font-size: 12.5px;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.text.secondary};
  text-decoration: none;

  svg {
    flex-shrink: 0;
    width: 13px;
    height: 13px;
    color: ${metaText};
    transition: transform 0.14s ease, color 0.14s ease;
  }

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};

    svg {
      color: ${({ theme }) => theme.colors.text.primary};
      transform: translateX(${({ $alignEnd }) => ($alignEnd ? '2px' : '-2px')});
    }
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
    border-radius: ${RADIUS.FOCUS};
  }
`

const OrderNum = styled.span`
  ${DIGIT_DISPLAY}
  flex-shrink: 0;
  font-size: 11.5px;
  font-weight: 600;
  color: ${metaText};
`

const NeighborTitle = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`
