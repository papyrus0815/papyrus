export interface DevelopmentIndicatorResponse {
  id: string
  countryId: string
  year: number
  literacyRate: number | null
  educationIndex: number | null
  meanYearsOfSchooling: number | null
  expectedYearsOfSchooling: number | null
  healthIndex: number | null
  infantMortalityRate: number | null
  under5MortalityRate: number | null
  maternalMortalityRatio: number | null
  hdi: number | null
  inequalityAdjustedHdi: number | null
  gni: number | null
  gniPerCapita: number | null
  giniCoefficient: number | null
  povertyRate: number | null
  energyConsumption: number | null
  co2Emissions: number | null
  co2EmissionsPerCapita: number | null
  renewableEnergyShare: number | null
  internetPenetration: number | null
  mobilePenetration: number | null
  createdAt: Date
  updatedAt: Date
}

