/**
 * 발전 지표 upsert 입력 (countryId+year 기준 생성/갱신).
 * year만 필수, 나머지는 선택.
 */
export interface UpsertDevelopmentIndicatorDto {
  year: number
  literacyRate?: number | null
  educationIndex?: number | null
  meanYearsOfSchooling?: number | null
  expectedYearsOfSchooling?: number | null
  healthIndex?: number | null
  infantMortalityRate?: number | null
  under5MortalityRate?: number | null
  maternalMortalityRatio?: number | null
  hdi?: number | null
  inequalityAdjustedHdi?: number | null
  gni?: number | null
  gniPerCapita?: number | null
  giniCoefficient?: number | null
  povertyRate?: number | null
  energyConsumption?: number | null
  co2Emissions?: number | null
  co2EmissionsPerCapita?: number | null
  renewableEnergyShare?: number | null
  internetPenetration?: number | null
  mobilePenetration?: number | null
}
