/**
 * 경제 지표 upsert 입력 (countryId+year 기준 생성/갱신).
 * year만 필수, 나머지는 선택. 모든 값은 number(또는 null).
 */
export interface UpsertEconomicIndicatorDto {
  year: number
  gdp?: number | null
  gdpPerCapita?: number | null
  gdpGrowthRate?: number | null
  realGdp?: number | null
  inflationRate?: number | null
  cpi?: number | null
  unemploymentRate?: number | null
  laborForceParticipationRate?: number | null
  tradeBalance?: number | null
  currentAccountBalance?: number | null
  governmentDebt?: number | null
  debtToGdpRatio?: number | null
  fiscalBalance?: number | null
  fdi?: number | null
  foreignReserves?: number | null
}
