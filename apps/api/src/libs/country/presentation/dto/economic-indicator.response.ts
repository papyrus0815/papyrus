export interface EconomicIndicatorResponse {
  id: string
  countryId: string
  year: number
  gdp: number | null
  gdpPerCapita: number | null
  gdpGrowthRate: number | null
  realGdp: number | null
  inflationRate: number | null
  cpi: number | null
  unemploymentRate: number | null
  laborForceParticipationRate: number | null
  tradeBalance: number | null
  currentAccountBalance: number | null
  governmentDebt: number | null
  debtToGdpRatio: number | null
  fiscalBalance: number | null
  fdi: number | null
  foreignReserves: number | null
  createdAt: Date
  updatedAt: Date
}
