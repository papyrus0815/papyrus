/**
 * 인구 지표 upsert 입력 (countryId+year 기준 생성/갱신).
 * year만 필수. population·urbanPopulation은 BigInt 컬럼이라 string으로 받는다.
 */
export interface UpsertDemographicIndicatorDto {
  year: number
  population?: string | null
  populationGrowthRate?: number | null
  populationDensity?: number | null
  birthRate?: number | null
  deathRate?: number | null
  fertilityRate?: number | null
  medianAge?: number | null
  populationAge0To14?: number | null
  populationAge15To64?: number | null
  populationAge65Plus?: number | null
  urbanPopulation?: string | null
  urbanizationRate?: number | null
  lifeExpectancy?: number | null
  lifeExpectancyMale?: number | null
  lifeExpectancyFemale?: number | null
  sexRatio?: number | null
  netMigration?: number | null
}
