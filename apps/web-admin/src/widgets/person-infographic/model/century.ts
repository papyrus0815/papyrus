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
