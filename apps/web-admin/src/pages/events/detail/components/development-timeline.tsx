import { useMemo } from 'react'

import { useNavigate } from 'react-router-dom'
import styled, { css } from 'styled-components'

import { pathKeys } from '@/shared/router'

import * as S from '../styles'
import { type EventDetail } from '../use-event-detail'
import { layoutTimeline, type TimelineItem } from './development-timeline.lib'
import { scrollToAnchor } from './scroll-to-anchor'

const LANE_HEIGHT = 34

/**
 * 전개 타임라인(D2) — 하위 사건을 상위 사건의 시간축에 놓는다.
 *
 * 단계의 정본은 하위 사건이다(단락 제목의 날짜를 읽지 않는다). 단락이 하위 사건을 가리키면
 * 막대를 눌러 그 단락으로 가고, 가리키는 단락이 없으면 하위 사건 상세로 간다.
 * 하위 사건에 날짜가 하나도 없으면 그리지 않는다.
 */
export function DevelopmentTimeline({ event }: { event: EventDetail }) {
  const navigate = useNavigate()

  const layout = useMemo(
    () =>
      layoutTimeline(event, [
        ...(event.childEvents ?? []).map((child) => ({
          id: child.id,
          title: child.title,
          startDate: child.startDate,
          startDatePrecision: child.startDatePrecision,
          endDate: child.endDate,
          endDatePrecision: child.endDatePrecision,
        })),
        ...(event.extraChildren ?? []),
      ]),
    [event],
  )

  /** 하위 사건 id → 그 사건을 서술하는 전개 단락의 앵커 */
  const anchorBySubject = useMemo(() => {
    const narrative = [...(event.eventSections ?? [])]
      .sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
      /* 전개 단락 = 배경·여파가 아닌 단락(narrative-sections의 분류와 같은 규칙) */
      .filter((section) => section.sectionType !== 'background' && section.sectionType !== 'aftermath')
    const anchors = new Map<string, string>()
    narrative.forEach((section, index) => {
      if (section.subjectEventId && !anchors.has(section.subjectEventId)) {
        anchors.set(section.subjectEventId, `narrative-${index + 1}`)
      }
    })
    return anchors
  }, [event.eventSections])

  if (!layout) return null

  const open = (item: TimelineItem) => {
    const anchor = anchorBySubject.get(item.id)
    if (anchor) scrollToAnchor(anchor)
    else navigate(pathKeys.events.detail(item.id))
  }

  return (
    <Host aria-labelledby="development-timeline-title">
      <Head>
        <Title id="development-timeline-title">전개</Title>
        <Count>하위 사건 {layout.items.length}개</Count>
      </Head>
      <Plot style={{ height: layout.laneCount * LANE_HEIGHT + 28 }}>
        {layout.parent && (
          <ParentBand
            style={{ left: `${layout.parent.leftPct}%`, width: `${layout.parent.widthPct}%` }}
            aria-hidden="true"
          />
        )}
        {layout.ticks.map((tick) => (
          <Tick key={`${tick.pct}-${tick.label}`} style={{ left: `${tick.pct}%` }} aria-hidden="true">
            <TickLabel>{tick.label}</TickLabel>
          </Tick>
        ))}
        <ItemList>
          {layout.items.map((item) => {
            const linked = anchorBySubject.has(item.id)
            /* 오른쪽 끝의 점은 라벨을 왼쪽으로 — 플롯 밖으로 넘치지 않게 */
            const flip = item.isPoint && item.leftPct > 65
            return (
              <Item
                key={item.id}
                style={{
                  top: item.lane * LANE_HEIGHT,
                  left: `${item.leftPct}%`,
                  transform: flip ? 'translateX(-100%)' : undefined,
                }}
              >
                <ItemButton
                  $flip={flip}
                  type="button"
                  onClick={() => open(item)}
                  title={`${item.title} · ${item.dateLabel}${linked ? ' — 서술 단락으로' : ' — 하위 사건 상세로'}`}
                >
                  {item.isPoint ? (
                    <Dot aria-hidden="true" />
                  ) : (
                    <Bar
                      aria-hidden="true"
                      $uncertain={item.uncertain}
                      style={{ width: `max(6px, calc(${item.widthPct} * var(--plot-width) / 100))` }}
                    />
                  )}
                  <ItemText>
                    <ItemLabel data-item-label $linked={linked}>
                      {item.title}
                    </ItemLabel>
                    <ItemDate>{item.dateLabel}</ItemDate>
                  </ItemText>
                </ItemButton>
              </Item>
            )
          })}
        </ItemList>
      </Plot>
    </Host>
  )
}

const Host = styled.section`
  ${S.breakout}
  margin-block: 8px 28px;
  padding: 14px 16px 10px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.10)')};
`

const Head = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 10px;
`

const Title = styled.h2`
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Count = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

/* 막대 폭은 %로 계산하되 라벨은 막대 길이와 무관하게 붙는다 — 플롯 폭을 변수로 내려 쓴다 */
const Plot = styled.div`
  --plot-width: 100cqi;
  position: relative;
  container-type: inline-size;
  margin-bottom: 22px;
`

const ParentBand = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: 4px;
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.035)' : 'rgba(15,23,42,0.035)')};
`

const Tick = styled.div`
  position: absolute;
  top: 0;
  bottom: -4px;
  width: 1px;
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)')};
`

const TickLabel = styled.span`
  position: absolute;
  top: 100%;
  left: 0;
  transform: translateX(-50%);
  padding-top: 4px;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const ItemList = styled.div`
  position: absolute;
  inset: 0;
`

const Item = styled.div`
  position: absolute;
  height: ${LANE_HEIGHT}px;
  display: flex;
  align-items: center;
`

/*
 * 표지(점·막대)가 위, 제목·날짜가 아래 — 막대가 길어도 제목이 밀려 사라지지 않는다
 * (예전엔 한 줄에 놓아 파리 포위처럼 긴 막대의 제목이 0폭으로 눌렸다).
 * 점은 자기 중심이 날짜에 오도록 반 칸 당긴다 — 라벨이 뒤집히면 반대쪽으로.
 */
const ItemButton = styled.button<{ $flip: boolean }>`
  display: inline-flex;
  flex-direction: column;
  align-items: ${({ $flip }) => ($flip ? 'flex-end' : 'flex-start')};

  & > i:first-child {
    ${({ $flip }) => ($flip ? 'margin-right: -5px;' : 'margin-left: -5px;')}
  }

  gap: 3px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;

  &:hover [data-item-label],
  &:focus-visible [data-item-label] {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`

const Dot = styled.i`
  flex-shrink: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary};
`

const Bar = styled.i<{ $uncertain: boolean }>`
  flex-shrink: 0;
  height: 8px;
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.primary};
  ${({ $uncertain, theme }) =>
    $uncertain &&
    css`
      background: transparent;
      border: 1.5px dashed ${theme.colors.primary};
    `}
`

const ItemText = styled.span`
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  max-width: 260px;
  min-width: 0;
`

const ItemLabel = styled.span<{ $linked: boolean }>`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12.5px;
  font-weight: ${({ $linked }) => ($linked ? 700 : 500)};
  color: ${({ theme }) => theme.colors.text.primary};
`

const ItemDate = styled.span`
  flex-shrink: 0;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
`
