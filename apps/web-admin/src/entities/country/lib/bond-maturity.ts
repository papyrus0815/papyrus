/**
 * 국채 만기 — 표시 이름과 **순서**의 단일 출처.
 *
 * 만기는 알파벳순으로 세우면 안 된다(Y1, Y10, Y15, Y2…). 수익률 곡선의 가로축이
 * 곧 이 순서라 서버·차트·편집표가 같은 배열을 봐야 한다.
 */
import type { BondMaturity } from '@/entities/country/api.indicators'

export interface BondMaturityMeta {
  key: BondMaturity
  /** 표에 적는 이름 */
  label: string
  /**
   * 연 단위 길이 — 수익률 곡선의 가로 위치를 정한다.
   * 영구채는 끝점이라 축의 마지막 자리를 쓴다(아래 CURVE_PERPETUAL_SLOT).
   */
  years: number
}

/** 짧은 만기부터. Prisma `BondMaturity` enum 선언 순서와 같다. */
export const BOND_MATURITIES: BondMaturityMeta[] = [
  { key: 'M1', label: '1개월', years: 1 / 12 },
  { key: 'M3', label: '3개월', years: 0.25 },
  { key: 'M6', label: '6개월', years: 0.5 },
  { key: 'Y1', label: '1년', years: 1 },
  { key: 'Y2', label: '2년', years: 2 },
  { key: 'Y3', label: '3년', years: 3 },
  { key: 'Y5', label: '5년', years: 5 },
  { key: 'Y7', label: '7년', years: 7 },
  { key: 'Y10', label: '10년', years: 10 },
  { key: 'Y15', label: '15년', years: 15 },
  { key: 'Y20', label: '20년', years: 20 },
  { key: 'Y30', label: '30년', years: 30 },
  { key: 'Y50', label: '50년', years: 50 },
  { key: 'PERPETUAL', label: '영구채', years: 100 },
]

const META_BY_KEY = new Map(BOND_MATURITIES.map((row) => [row.key, row]))

export function bondMaturityLabel(maturity: BondMaturity): string {
  return META_BY_KEY.get(maturity)?.label ?? String(maturity)
}

export function bondMaturityYears(maturity: BondMaturity): number {
  return META_BY_KEY.get(maturity)?.years ?? 0
}

/** 짧은 만기가 앞. 정렬이 필요한 모든 곳이 이 비교자를 쓴다. */
export function compareBondMaturity(
  left: BondMaturity,
  right: BondMaturity,
): number {
  return bondMaturityYears(left) - bondMaturityYears(right)
}

/**
 * 대표 만기 — "이 나라 국채 금리"라고 할 때 사람들이 뜻하는 값.
 * 10년물이 국제 표준이고, 없으면 그 해에 있는 것 중 10년에 가장 가까운 만기를 쓴다.
 */
export const BENCHMARK_MATURITY: BondMaturity = 'Y10'

export function pickBenchmarkMaturity(
  available: BondMaturity[],
): BondMaturity | null {
  if (available.length === 0) return null
  if (available.includes(BENCHMARK_MATURITY)) return BENCHMARK_MATURITY
  const target = bondMaturityYears(BENCHMARK_MATURITY)
  return [...available].sort(
    (left, right) =>
      Math.abs(bondMaturityYears(left) - target) -
        Math.abs(bondMaturityYears(right) - target) ||
      compareBondMaturity(left, right),
  )[0]
}

/** 3.475 → '3.48%' (소수 둘째 자리 — 시장 관행) */
export function formatYield(value: number): string {
  return `${value.toFixed(2)}%`
}

/**
 * 금리 차이는 %가 아니라 bp(0.01%p)로 읽는다 — "0.35%p 올랐다"보다 "35bp"가 관행이고
 * 수익률(%)과 변화폭(%p)이 같은 단위로 적혀 섞이는 것도 막는다.
 */
export function formatBasisPoints(deltaPercentagePoints: number): string {
  const basisPoints = Math.round(deltaPercentagePoints * 100)
  const sign = basisPoints > 0 ? '+' : ''
  return `${sign}${basisPoints}bp`
}
