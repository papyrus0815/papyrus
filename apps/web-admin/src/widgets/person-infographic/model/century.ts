/**
 * 출생연도/활동연도 → 세기 분류.
 * 학술 컨벤션: 1701-1800 = 18세기, BC 100-1 = 기원전 1세기.
 */

export interface CenturyMeta {
  key: string
  label: string
  from: number
  to: number
  /** 정렬용 — BC는 음수, AD는 양수. */
  sortKey: number
}

export function centuryOf(year: number): CenturyMeta {
  const isBC = year < 0
  const abs = Math.abs(year)
  const c = Math.floor((abs - 1) / 100) + 1
  const from = isBC ? -(c * 100) : (c - 1) * 100 + 1
  const to = isBC ? -((c - 1) * 100 + 1) : c * 100
  return {
    key: isBC ? `bc-${c}` : `ad-${c}`,
    label: isBC ? `기원전 ${c}세기` : `${c}세기`,
    from,
    to,
    sortKey: isBC ? -c : c,
  }
}

/** "−500" / "1750" → "500BC" / "1750" */
export function formatYear(y: number): string {
  return y < 0 ? `${-y}BC` : `${y}`
}

/**
 * 세기 그룹 나열 순서 비교기.
 * order='desc'(기본)는 최신 세기 먼저, 'asc'는 오래된 세기 먼저.
 * '연도 미상'(key==='unknown', sortKey=+∞)은 방향과 무관하게 항상 맨 끝.
 */
export function compareCenturyMeta(
  centuryA: CenturyMeta,
  centuryB: CenturyMeta,
  order: 'asc' | 'desc',
): number {
  const aUnknown = centuryA.key === 'unknown'
  const bUnknown = centuryB.key === 'unknown'
  if (aUnknown !== bUnknown) return aUnknown ? 1 : -1
  const dir = order === 'desc' ? -1 : 1
  return (centuryA.sortKey - centuryB.sortKey) * dir
}
