/**
 * 왕조 통계 — 가문 연대표.
 *
 *   합스부르크 가문   스페인 · 1262–1740  ├───●──●●─●──●───┤          20명
 *   로마노프 왕조     러시아 · 1596–1918              ├─●●●─●●─┤   19명
 *                                      1300   1500   1700   1900
 *
 * 순위 목록만으로는 '어느 가문이 언제 겹쳐 있었나'가 안 보인다. 가문마다 구성원 생몰 범위를
 * 한 막대로, 구성원 활동 연도를 점으로 찍어 공존·계승의 시간축을 한 장에 싣는다.
 * 행을 누르면 아래 왕조 뷰의 그 가문으로 스크롤한다.
 */
import { useMemo, useState } from 'react'

import styled from 'styled-components'

import { bornForPlot, diedForPlot } from '../model/adapt'
import { formatYear } from '../model/century'
import { pickTickStep } from '../model/tick-step'
import type { AdaptedPerson } from '../model/types'

import { BRAND, hairline, metaText, MOTION_FAST, surface } from './_shared/catalog.styles'

const TOP_DEFAULT = 10
const TOP_EXPANDED = 24

interface DynastySpan {
  faction: string
  count: number
  monarchs: number
  from: number
  to: number
  country: string
  /** 구성원 활동 연도 — 막대 위 점 */
  years: number[]
}

function mostCommon(values: string[]): string {
  const counts = new Map<string, number>()
  let best = ''
  let bestCount = 0
  for (const value of values) {
    if (!value || value === '미상') continue
    const next = (counts.get(value) ?? 0) + 1
    counts.set(value, next)
    if (next > bestCount) {
      best = value
      bestCount = next
    }
  }
  return best
}

interface DynastySpanChartProps {
  people: AdaptedPerson[]
  /** 가문 행 클릭 — 왕조 뷰의 그 가문으로 이동 */
  onJump: (faction: string) => void
}

export function DynastySpanChart({ people, onJump }: DynastySpanChartProps) {
  const [expanded, setExpanded] = useState(false)

  const { spans, unaffiliated } = useMemo(() => {
    const byFaction = new Map<string, AdaptedPerson[]>()
    let without = 0
    for (const person of people) {
      if (!person.faction) {
        without++
        continue
      }
      const list = byFaction.get(person.faction)
      if (list) list.push(person)
      else byFaction.set(person.faction, [person])
    }
    const result: DynastySpan[] = []
    for (const [faction, members] of byFaction) {
      let from = Infinity
      let to = -Infinity
      for (const member of members) {
        from = Math.min(from, bornForPlot(member))
        to = Math.max(to, diedForPlot(member))
      }
      result.push({
        faction,
        count: members.length,
        monarchs: members.filter((member) => member.isMonarch).length,
        from,
        to,
        country: mostCommon(members.map((member) => member.country)),
        years: members.map((member) => member.activityYear),
      })
    }
    result.sort(
      (left, right) =>
        right.count - left.count || left.from - right.from || left.faction.localeCompare(right.faction, 'ko'),
    )
    return { spans: result, unaffiliated: without }
  }, [people])

  const shown = spans.slice(0, expanded ? TOP_EXPANDED : TOP_DEFAULT)

  // 축은 보이는 가문들의 범위에 맞춘다 — 전체 인물 범위로 잡으면 막대가 한쪽에 몰린다
  const axis = useMemo(() => {
    if (shown.length === 0) return null
    const minYear = Math.min(...shown.map((span) => span.from))
    const maxYear = Math.max(...shown.map((span) => span.to))
    const step = pickTickStep(Math.max(50, maxYear - minYear) / 6)
    const start = Math.floor(minYear / step) * step
    const end = Math.ceil(maxYear / step) * step
    const ticks: number[] = []
    for (let year = start; year <= end; year += step) ticks.push(year)
    const range = Math.max(1, end - start)
    return { ticks, pct: (year: number) => ((year - start) / range) * 100 }
  }, [shown])

  if (!axis) return null

  return (
    <Section>
      <Head>
        <Title>가문 연대</Title>
        <Hint>막대 = 구성원 생몰 범위 · 점 = 구성원 활동 연도 · 누르면 그 가문으로</Hint>
        <Meta>
          가문 {spans.length.toLocaleString()}개 · 소속 없음 {unaffiliated.toLocaleString()}명
        </Meta>
      </Head>

      <Rows>
        {shown.map((span) => (
          <Row
            key={span.faction}
            type="button"
            onClick={() => onJump(span.faction)}
            aria-label={`${span.faction}, ${span.count}명${span.monarchs ? `, 군주 ${span.monarchs}명` : ''}, ${formatYear(span.from)}–${formatYear(span.to)}, 가문으로 이동`}
          >
            <Label>
              <Name title={span.faction}>{span.faction}</Name>
              <Sub>
                {span.country ? `${span.country} · ` : ''}
                {formatYear(span.from)}–{formatYear(span.to)}
              </Sub>
            </Label>
            <Track aria-hidden>
              {axis.ticks.map((year) => (
                <TickLine key={year} style={{ left: `${axis.pct(year)}%` }} />
              ))}
              <Span
                style={{
                  left: `${axis.pct(span.from)}%`,
                  width: `${Math.max(0.6, axis.pct(span.to) - axis.pct(span.from))}%`,
                }}
              />
              {span.years.map((year, index) => (
                <Dot key={index} style={{ left: `${axis.pct(year)}%` }} />
              ))}
            </Track>
            <Count>
              {span.count.toLocaleString()}
              <CountUnit>명</CountUnit>
              {span.monarchs > 0 && <Monarchs>군주 {span.monarchs}</Monarchs>}
            </Count>
          </Row>
        ))}
      </Rows>

      <AxisRow aria-hidden>
        <span />
        <AxisTrack>
          {axis.ticks.map((year) => (
            <AxisTick key={year} style={{ left: `${axis.pct(year)}%` }}>
              {year === 0 ? '0' : formatYear(year)}
            </AxisTick>
          ))}
        </AxisTrack>
        <span />
      </AxisRow>

      {spans.length > TOP_DEFAULT && (
        <MoreToggle type="button" onClick={() => setExpanded((prev) => !prev)}>
          {expanded
            ? '접기'
            : `+ ${Math.min(spans.length, TOP_EXPANDED) - TOP_DEFAULT}개 가문 더 보기`}
        </MoreToggle>
      )}
    </Section>
  )
}

/** 이름 · 트랙 · 인원 — 행과 축이 같은 격자를 써야 눈금이 막대와 맞는다 */
const GRID = 'minmax(120px, 200px) minmax(0, 1fr) 96px'

const Section = styled.div`
  padding: 16px 20px 18px;
  border-bottom: 1px solid ${hairline};
`

const Head = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px 10px;
  margin-bottom: 10px;
`

const Title = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Hint = styled.span`
  font-size: 12px;
  color: ${metaText};
`

const Meta = styled.span`
  margin-left: auto;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Rows = styled.div`
  display: flex;
  flex-direction: column;
`

const Row = styled.button`
  display: grid;
  grid-template-columns: ${GRID};
  align-items: center;
  gap: 12px;
  min-height: 40px;
  padding: 4px 8px;
  margin: 0 -8px;
  width: calc(100% + 16px);
  border: none;
  border-radius: 8px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background ${MOTION_FAST};

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.035)'};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }
  & + & {
    border-top: 1px solid ${hairline};
    border-radius: 0;
  }

  @media (max-width: 640px) {
    grid-template-columns: minmax(96px, 120px) minmax(0, 1fr) 56px;
    gap: 8px;
  }
`

const Label = styled.span`
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
`

const Name = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const Sub = styled.span`
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: ${metaText};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const Track = styled.span`
  position: relative;
  height: 22px;
`

const TickLine = styled.span`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: ${hairline};
`

/** 생몰 범위 — 옅은 단색 띠, 점이 그 위에서 읽히게 */
const Span = styled.span`
  position: absolute;
  top: 50%;
  height: 12px;
  transform: translateY(-50%);
  border-radius: 6px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(96, 140, 235, 0.32)' : 'rgba(37, 99, 235, 0.16)'};
  box-shadow: inset 0 0 0 1px
    ${({ theme }) => (theme.mode === 'dark' ? 'rgba(96,140,235,0.45)' : 'rgba(37,99,235,0.28)')};
`

/** 구성원 — 지면색 고리로 겹쳐도 한 알씩 읽힌다 */
const Dot = styled.span`
  position: absolute;
  top: 50%;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: ${BRAND.primary};
  box-shadow: 0 0 0 1.5px ${surface};
`

const Count = styled.span`
  display: inline-flex;
  align-items: baseline;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 0 2px;
  font-size: 14px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`

const CountUnit = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Monarchs = styled.span`
  flex-basis: 100%;
  text-align: right;
  font-size: 10.5px;
  font-weight: 600;
  color: ${metaText};
`

const AxisRow = styled.div`
  display: grid;
  grid-template-columns: ${GRID};
  gap: 12px;
  height: 20px;

  @media (max-width: 640px) {
    grid-template-columns: minmax(96px, 120px) minmax(0, 1fr) 56px;
    gap: 8px;
  }
`

const AxisTrack = styled.span`
  position: relative;
`

const AxisTick = styled.span`
  position: absolute;
  top: 4px;
  transform: translateX(-50%);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
`

const MoreToggle = styled.button`
  margin-top: 8px;
  padding: 5px 12px;
  border: 1px solid ${hairline};
  border-radius: 999px;
  background: transparent;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition: color ${MOTION_FAST}, border-color ${MOTION_FAST};

  &:hover {
    color: ${BRAND.primary};
    border-color: ${BRAND.primaryBorder};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }
`
