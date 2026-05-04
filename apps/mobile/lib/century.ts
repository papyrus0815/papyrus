import { signedYear } from './age-utils'

type EraStr = 'AD' | 'BC' | 'BCE' | 'CE' | string | null | undefined

/**
 * 출생 연도로부터 세기 도출.
 * 1872 → 19, BC 220 → -3 (BC 3세기), null → null.
 * 관례: AD 1년 = 1세기, AD 100년 = 1세기, AD 101년 = 2세기.
 */
export function centuryFromYear(year: number | null | undefined, era?: EraStr): number | null {
  if (year == null) return null
  const y = signedYear(era, year)
  if (y === 0) return null
  return y >= 0 ? Math.floor((y - 1) / 100) + 1 : -(Math.floor((-y - 1) / 100) + 1)
}

/** 인물에서 세기 추출 (출생 연도 기준) */
export function centuryOf(p: {
  birthYear?: number | null
  birthEra?: EraStr
}): number | null {
  return centuryFromYear(p.birthYear, p.birthEra)
}

/** "19세기" / "BC 3세기" / "시점 미상" */
export function centuryLongLabel(c: number | null): string {
  if (c == null) return '시점 미상'
  return c < 0 ? `BC ${-c}세기` : `${c}세기`
}

/** "19C" / "BC 3C" / "미상" — 짧은 칩용 */
export function centuryShortLabel(c: number | null): string {
  if (c == null) return '미상'
  return c < 0 ? `BC ${-c}C` : `${c}C`
}
