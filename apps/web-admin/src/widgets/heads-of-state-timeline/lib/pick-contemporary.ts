/**
 * 가이드 연도에 재임 중인 막대를 행별로 묶는다 — 동시대 패널·동시 재위 비교표 공용.
 * 막대가 0개인 행도 그대로 돌려준다(호출부가 걸러 '몇 행 중 몇 곳' 모수를 지킨다).
 */
import type { RowTenuresResult } from '../api/use-all-rows-tenures'
import type { PinnedRow } from '../model/types'
import type { TenureBar } from './normalize-tenures'
import { sortSegmentsChronologically } from './sort-segments'

export interface MatchEntry {
  rowId: string
  rowLabel: string
  flagEmoji: string | null
  bars: TenureBar[]
}

/** highlightYear 시점에 active한 막대만 골라 행별로 묶는다. 막대가 0개인 행은 노출 X */
export function pickContemporary(
  rows: PinnedRow[],
  rowsTenures: RowTenuresResult[],
  year: number,
): MatchEntry[] {
  const tenureMap = new Map(rowsTenures.map((t) => [t.rowId, t]))
  return rows.map((row) => {
    const ordered = sortSegmentsChronologically(row.segments)
    const flag = ordered.find((segment) => segment.flagEmoji)?.flagEmoji ?? null
    const label = ordered.map((segment) => segment.name).join(' → ')
    const tenures = tenureMap.get(row.rowId)
    const bars: TenureBar[] = []
    if (tenures) {
      for (const seg of tenures.segmentResults) {
        for (const bar of seg.bars) {
          const start = bar.startJulian
          const end = bar.endJulian ?? Infinity
          if (start <= year && end >= year) bars.push(bar)
        }
      }
    }
    return { rowId: row.rowId, rowLabel: label, flagEmoji: flag, bars }
  })
}
