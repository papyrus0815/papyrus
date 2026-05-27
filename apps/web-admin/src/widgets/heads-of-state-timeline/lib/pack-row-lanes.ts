/**
 * 한 행(여러 계승국 segment)을 카테고리 밴드 단위로 레인 패킹한다.
 *
 * 기존엔 막대를 시간 겹침만으로 greedy 패킹해 세로 위치가 역할과 무관했다 — 총리가 왕 위에
 * 오거나, 겹치지 않는 왕·장관이 같은 레인(높이)에 놓이는 문제. 이를 막기 위해 카테고리를
 * 세 밴드로 나눠 항상 같은 순서로 쌓는다:
 *   - HEAD  : 수장(군주·대통령·교황)  — 맨 위
 *   - GOV   : 행정수반(총리)          — 가운데
 *   - OTHER : 그 외(장관 등)          — 맨 아래
 *
 * 밴드 안에서는 종전처럼 시간 겹침 greedy 패킹. 밴드별 레인 수는 행 전체(모든 segment)에서
 * 최댓값을 취해 오프셋을 통일하므로, 계승국이 바뀌어도 "수장 띠 / 총리 띠"의 높이가 일정하다.
 */
import { packIntoLanes } from './lane-pack'
import type { PositionTypeCategory, TenureBar } from './normalize-tenures'

const BAND_ORDER = ['HEAD', 'GOV', 'OTHER'] as const
type Band = (typeof BAND_ORDER)[number]

function bandOf(c: PositionTypeCategory): Band {
  if (c === 'MONARCH' || c === 'PRESIDENT' || c === 'POPE') return 'HEAD'
  if (c === 'PM') return 'GOV'
  return 'OTHER'
}

const intervalOf = (bar: TenureBar) => ({
  start: bar.startJulian,
  end: bar.endJulian ?? Infinity,
})

export interface PackedRowSegment {
  segmentId: string
  bars: { bar: TenureBar; lane: number }[]
}

export interface PackedRow {
  packed: PackedRowSegment[]
  /** 행에 필요한 총 레인 수 (rowHeight 계산용) */
  laneCount: number
}

export function packRowByBands(
  segments: { segmentId: string; bars: TenureBar[] }[],
): PackedRow {
  // 1차 — segment별·밴드별 로컬 레인 배정 + 밴드별 레인 수
  const perSegment = segments.map((seg) => {
    const byBand: Record<Band, TenureBar[]> = { HEAD: [], GOV: [], OTHER: [] }
    for (const bar of seg.bars) byBand[bandOf(bar.positionCategory)].push(bar)

    const packedByBand = {} as Record<Band, { item: TenureBar; lane: number }[]>
    const bandLaneCount = {} as Record<Band, number>
    for (const band of BAND_ORDER) {
      const lr = packIntoLanes(byBand[band], intervalOf)
      packedByBand[band] = lr.assignments
      bandLaneCount[band] = lr.laneCount
    }
    return { segmentId: seg.segmentId, packedByBand, bandLaneCount }
  })

  // 밴드별 글로벌 레인 수(모든 segment 최댓값) → 오프셋 통일
  const bandOffset = {} as Record<Band, number>
  let acc = 0
  for (const band of BAND_ORDER) {
    bandOffset[band] = acc
    const lanes = perSegment.reduce((m, s) => Math.max(m, s.bandLaneCount[band]), 0)
    acc += lanes
  }
  const laneCount = Math.max(1, acc)

  const packed: PackedRowSegment[] = perSegment.map((s) => {
    const bars: { bar: TenureBar; lane: number }[] = []
    for (const band of BAND_ORDER) {
      for (const a of s.packedByBand[band]) {
        bars.push({ bar: a.item, lane: bandOffset[band] + a.lane })
      }
    }
    return { segmentId: s.segmentId, bars }
  })

  return { packed, laneCount }
}
