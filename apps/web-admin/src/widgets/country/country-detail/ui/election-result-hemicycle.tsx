/**
 * 선거 상세 머리 — 결과 그림.
 *
 * 예전엔 정당 의석·득표를 한 줄 가로 막대(파워 바)로 그렸다. 비중은 읽히지만 '의회'·'선거'로 읽히지 않았고,
 * 1.5% 최소 폭 때문에 작은 정당 여럿이 같은 굵기로 늘어서 실제 크기가 흐려졌다.
 *
 *  · 의석이 있는 선거(정당 집계 seatsWon 합 > 0) → 의회 반원 좌석도. 점 하나 = 의석 하나(600석 넘으면 비례 축소),
 *    왼쪽부터 정당 순서대로 채우고 가운데 점선이 과반선.
 *  · 의석이 없는 선거(대통령·국민투표·득표만 있는 집계) → 반원 도넛. 가운데에 1위와 득표율.
 */
import React, { useMemo } from 'react'

import styled, { useTheme } from 'styled-components'

import { DIGIT_DISPLAY } from '@/entities/event/ui/ledger-tokens'

export interface ElectionResultSegment {
  key: string
  label: string
  subLabel: string
  fill: string
  /** 0–1 실제 비중(그림 각도) */
  share: number
  /** 정당 집계의 의석 — 있으면 좌석도 */
  seats: number | null
  /** 이념 위치 순위(좌 0 → 우 6) — 좌석도는 이 순서로 왼쪽부터 채운다. 없으면 가운데 뒤 */
  positionRank?: number | null
  partyId: string | null
  personId: string | null
}

const POSITION_RANK: Record<string, number> = {
  FAR_LEFT: 0,
  LEFT: 1,
  CENTER_LEFT: 2,
  CENTER: 3,
  BIG_TENT: 3,
  CENTER_RIGHT: 4,
  RIGHT: 5,
  FAR_RIGHT: 6,
}

/** 정당 이념 위치 → 좌석도 배열 순위(좌 0 … 우 6). 모르면 null */
export function politicalPositionRank(position: string | null | undefined): number | null {
  if (!position) return null
  return POSITION_RANK[position] ?? null
}

/** 실제 의회 좌석도처럼 왼쪽=좌파, 오른쪽=우파. 위치를 모르는 정당·기타는 오른쪽 끝(7)에 — 가운데 두면
 *  회색 띠가 과반선 위를 가렸다. 같은 자리면 의석 큰 순 */
export function sortBySeatingOrder<Item extends { positionRank?: number | null; seats: number | null }>(
  items: Item[],
): Item[] {
  return [...items].sort((left, right) => {
    const rankDelta = (left.positionRank ?? 7) - (right.positionRank ?? 7)
    if (rankDelta !== 0) return rankDelta
    return (right.seats ?? 0) - (left.seats ?? 0)
  })
}

const MAX_DOTS = 600
const VIEW_W = 220
const VIEW_H = 118
const CENTER_X = VIEW_W / 2
const CENTER_Y = 112
const OUTER_R = 104
const INNER_R = 44

export interface SeatDot {
  x: number
  y: number
  radius: number
  fill: string
  label: string
}

/** 의석 수 → 줄 수·줄별 좌석(반지름에 비례) → 왼쪽부터 각도순 좌표 */
function layoutSeats(totalDots: number): Array<{ x: number; y: number; angle: number }> {
  const rowCount = Math.max(2, Math.min(14, Math.round(Math.sqrt(totalDots) / 2.1)))
  const radii = Array.from({ length: rowCount }, (_, idx) =>
    rowCount === 1 ? OUTER_R : INNER_R + ((OUTER_R - INNER_R) * idx) / (rowCount - 1),
  )
  const radiusSum = radii.reduce((sum, value) => sum + value, 0)
  const perRow = radii.map((radius) => Math.max(1, Math.floor((totalDots * radius) / radiusSum)))
  let remaining = totalDots - perRow.reduce((sum, value) => sum + value, 0)
  for (let idx = rowCount - 1; remaining > 0; idx = idx === 0 ? rowCount - 1 : idx - 1) {
    perRow[idx] += 1
    remaining -= 1
  }
  const points: Array<{ x: number; y: number; angle: number }> = []
  radii.forEach((radius, rowIdx) => {
    const count = perRow[rowIdx]
    for (let seatIdx = 0; seatIdx < count; seatIdx += 1) {
      const angle = count === 1 ? Math.PI / 2 : Math.PI - (seatIdx / (count - 1)) * Math.PI
      points.push({
        x: CENTER_X + Math.cos(angle) * radius,
        y: CENTER_Y - Math.sin(angle) * radius,
        angle,
      })
    }
  })
  /* 왼쪽(π)부터 오른쪽(0)으로 — 같은 각이면 안쪽 줄 먼저 */
  points.sort((left, right) => right.angle - left.angle)
  return points
}

/**
 * 의석 → 반원 좌석 점. 점 하나 = 의석 하나(MAX_DOTS 넘으면 비례 축소), 왼쪽부터 정당 순서대로 채우고
 * 기록 안 된 의석(총 의석 − 합)은 unknownFill. 같은 viewBox(VIEW_W×VIEW_H) 좌표다.
 */
export function computeSeatDots(
  parties: Array<{ fill: string; seats: number; label: string }>,
  chamberSeats: number,
  unknownFill: string,
): SeatDot[] {
  const seatSum = parties.reduce((sum, party) => sum + Math.max(0, party.seats), 0)
  const chamber = Math.max(seatSum, chamberSeats)
  if (chamber <= 0) return []
  const scale = chamber > MAX_DOTS ? MAX_DOTS / chamber : 1
  const totalDots = Math.max(1, Math.round(chamber * scale))
  const points = layoutSeats(totalDots)
  /* 정당별 점 수(큰 나머지 방식) */
  const exact = parties.map((party) => Math.max(0, party.seats) * scale)
  const assigned = exact.map((value) => Math.floor(value))
  let leftover = Math.round(seatSum * scale) - assigned.reduce((sum, value) => sum + value, 0)
  exact
    .map((value, idx) => ({ idx, frac: value - Math.floor(value) }))
    .sort((left, right) => right.frac - left.frac)
    .forEach(({ idx }) => {
      if (leftover > 0) {
        assigned[idx] += 1
        leftover -= 1
      }
    })
  const sequence: Array<{ fill: string; label: string }> = []
  parties.forEach((party, idx) => {
    for (let count = 0; count < assigned[idx]; count += 1) {
      sequence.push({ fill: party.fill, label: party.label })
    }
  })
  const rowCount = Math.max(2, Math.min(14, Math.round(Math.sqrt(totalDots) / 2.1)))
  const rowGap = (OUTER_R - INNER_R) / Math.max(1, rowCount - 1)
  const outerSpacing = (Math.PI * OUTER_R) / Math.max(1, totalDots / rowCount)
  const dotR = Math.max(1.1, Math.min(rowGap * 0.42, outerSpacing * 0.42, 4.2))
  return points.map((point, idx) => ({
    x: point.x,
    y: point.y,
    radius: dotR,
    fill: sequence[idx]?.fill ?? unknownFill,
    label: sequence[idx]?.label ?? '기록 없는 의석',
  }))
}

export const HEMICYCLE_VIEWBOX = `0 0 ${VIEW_W} ${VIEW_H}`

/** 반원 도넛 조각 경로(π → 0 방향) */
function arcPath(startShare: number, endShare: number): string {
  const startAngle = Math.PI - startShare * Math.PI
  const endAngle = Math.PI - endShare * Math.PI
  const outerR = OUTER_R
  const innerR = OUTER_R - 34
  const largeArc = endShare - startShare > 1 ? 1 : 0
  const point = (angle: number, radius: number) =>
    `${(CENTER_X + Math.cos(angle) * radius).toFixed(2)} ${(CENTER_Y - Math.sin(angle) * radius).toFixed(2)}`
  return [
    `M ${point(startAngle, outerR)}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${point(endAngle, outerR)}`,
    `L ${point(endAngle, innerR)}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${point(startAngle, innerR)}`,
    'Z',
  ].join(' ')
}

export function ElectionResultHemicycle({
  segments,
  totalSeats,
  kicker,
  onSelectSegment,
}: {
  segments: ElectionResultSegment[]
  totalSeats: number | null
  kicker: string
  onSelectSegment: (segment: ElectionResultSegment) => void
}) {
  const theme = useTheme()
  const seatSum = segments.reduce((sum, seg) => sum + (seg.seats ?? 0), 0)
  const useSeats = seatSum > 0
  const chamberSeats = useSeats ? Math.max(seatSum, totalSeats ?? 0) : 0

  const seatDots = useMemo<SeatDot[]>(
    () =>
      useSeats
        ? computeSeatDots(
            sortBySeatingOrder(segments).map((seg) => ({
              fill: seg.fill,
              seats: seg.seats ?? 0,
              label: `${seg.label} · ${seg.subLabel}`,
            })),
            chamberSeats,
            theme.mode === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(15,23,42,0.12)',
          )
        : [],
    [useSeats, chamberSeats, segments, theme.mode],
  )

  const arcs = useMemo(() => {
    if (useSeats) return []
    const shareSum = segments.reduce((sum, seg) => sum + Math.max(0, seg.share), 0)
    if (shareSum <= 0) return []
    /* 합이 100%에 못 미치면(기타 미기록) 나머지는 빈 칸으로 남긴다 — 1을 넘을 때만 정규화 */
    const divisor = shareSum > 1 ? shareSum : 1
    let cursor = 0
    return segments.map((seg) => {
      const start = cursor
      cursor += Math.max(0, seg.share) / divisor
      return { seg, path: arcPath(start, Math.min(1, cursor)) }
    })
  }, [useSeats, segments])

  const leader = segments[0] ?? null
  const majority = chamberSeats > 0 ? Math.floor(chamberSeats / 2) + 1 : null
  const scaledNote = useSeats && chamberSeats > MAX_DOTS ? `점 1개 ≈ ${(chamberSeats / MAX_DOTS).toFixed(1)}석` : null

  return (
    <ResultGrid>
      <Figure>
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} role="img" aria-label={kicker}>
          <path
            d={arcPath(0, 1)}
            fill={useSeats ? 'none' : theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)'}
          />
          {useSeats
            ? seatDots.map((dot, idx) => (
                <circle key={idx} cx={dot.x.toFixed(2)} cy={dot.y.toFixed(2)} r={dot.radius.toFixed(2)} fill={dot.fill}>
                  <title>{dot.label}</title>
                </circle>
              ))
            : arcs.map(({ seg, path }) => (
                <path
                  key={seg.key}
                  d={path}
                  fill={seg.fill}
                  stroke={theme.colors.background.primary}
                  strokeWidth="1"
                  style={{ cursor: seg.partyId || seg.personId ? 'pointer' : 'default' }}
                  onClick={() => onSelectSegment(seg)}
                >
                  <title>{`${seg.label} · ${seg.subLabel}`}</title>
                </path>
              ))}
          {useSeats ? (
            <line
              x1={CENTER_X}
              x2={CENTER_X}
              y1={CENTER_Y - OUTER_R - 5}
              y2={CENTER_Y - INNER_R + 8}
              stroke={theme.mode === 'dark' ? 'rgba(255,255,255,0.45)' : 'rgba(15,23,42,0.4)'}
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          ) : null}
        </svg>
        <CenterLabel>
          {useSeats ? (
            <>
              <strong>{chamberSeats.toLocaleString('ko-KR')}석</strong>
              {majority != null ? <span>과반 {majority.toLocaleString('ko-KR')}</span> : null}
            </>
          ) : leader ? (
            <>
              <strong>{leader.subLabel.split(' · ')[0]}</strong>
              <span className="name">{leader.label}</span>
            </>
          ) : null}
        </CenterLabel>
        {scaledNote ? <ScaleNote>{scaledNote}</ScaleNote> : null}
      </Figure>

      <Legend aria-label={`${kicker} 범례`}>
        <LegendKicker>{kicker}</LegendKicker>
        {segments.slice(0, 8).map((seg) => {
          const clickable = Boolean(seg.partyId || seg.personId)
          return (
            <LegendRow
              key={seg.key}
              type="button"
              disabled={!clickable}
              onClick={() => onSelectSegment(seg)}
            >
              <span className="sw" style={{ background: seg.fill }} aria-hidden />
              <span className="name">{seg.label}</span>
              <span className="stat">{seg.subLabel}</span>
              <span className="bar" aria-hidden>
                <span style={{ width: `${Math.max(1, Math.min(100, seg.share * 100))}%`, background: seg.fill }} />
              </span>
            </LegendRow>
          )
        })}
        {segments.length > 8 ? <LegendMore>외 {segments.length - 8}</LegendMore> : null}
      </Legend>
    </ResultGrid>
  )
}

const ResultGrid = styled.div`
  container-type: inline-size;
  display: grid;
  grid-template-columns: minmax(220px, 300px) minmax(0, 1fr);
  align-items: center;
  gap: 12px 28px;

  @container (max-width: 560px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const Figure = styled.div`
  position: relative;
  width: 100%;
  max-width: 300px;

  svg {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
  }
`

const CenterLabel = styled.div`
  position: absolute;
  left: 50%;
  bottom: 2px;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 38%;
  text-align: center;
  ${DIGIT_DISPLAY}

  strong {
    font-size: 17px;
    font-weight: 800;
    line-height: 1.15;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  span {
    margin-top: 1px;
    font-size: 11px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  .name {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const ScaleNote = styled.div`
  margin-top: 4px;
  font-size: 10.5px;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Legend = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`

const LegendKicker = styled.div`
  margin-bottom: 4px;
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const LegendRow = styled.button`
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) auto 88px;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 26px;
  padding: 2px 6px;
  margin: 0 -6px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font: inherit;
  text-align: left;
  color: inherit;
  cursor: pointer;

  &:disabled {
    cursor: default;
  }
  &:not(:disabled):hover {
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.04)')};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
  }

  .sw {
    width: 10px;
    height: 10px;
    border-radius: 3px;
  }
  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .stat {
    font-size: 12px;
    white-space: nowrap;
    color: ${({ theme }) => theme.colors.text.secondary};
    ${DIGIT_DISPLAY}
  }
  .bar {
    height: 4px;
    border-radius: 999px;
    overflow: hidden;
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.06)')};
  }
  .bar > span {
    display: block;
    height: 100%;
    border-radius: 999px;
  }
`

const LegendMore = styled.div`
  margin-top: 2px;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
