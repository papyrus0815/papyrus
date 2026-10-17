/**
 * 기준 연도에서 본 재임 연차 — "즉위 N년차"와 재위 진행률.
 *
 * 연 단위 정수로 센다: 즉위한 해가 1년차(원년). 소수 연도(startJulian 1740.8)를 그대로 빼면
 * 즉위 이듬해가 0.2 → '1년차'가 되어 원년과 겹치므로 floor한 정수 연도끼리 비교한다.
 */
import type { TenureBar } from './normalize-tenures'

type TenureSpan = Pick<TenureBar, 'startJulian' | 'endJulian'>

/** 기준 연도가 재임 기간 밖이면 null */
export function tenureYearAt(bar: TenureSpan, year: number): number | null {
  const startYear = Math.floor(bar.startJulian)
  if (year < startYear) return null
  if (bar.endJulian != null && year > Math.floor(bar.endJulian)) return null
  return year - startYear + 1
}

/** 재임 총 연수(햇수 기준) — 재임 중이면 null */
export function tenureTotalYears(bar: TenureSpan): number | null {
  if (bar.endJulian == null) return null
  return Math.floor(bar.endJulian) - Math.floor(bar.startJulian) + 1
}

/** 0~1 진행률 — 재임 중(끝 미정)이거나 기간 밖이면 null */
export function tenureProgressAt(bar: TenureSpan, year: number): number | null {
  const current = tenureYearAt(bar, year)
  const total = tenureTotalYears(bar)
  if (current == null || total == null || total <= 0) return null
  return Math.min(1, current / total)
}
