export interface DemographicIndicatorResponse {
  id: string
  countryId: string
  year: number
  population: string | null
  populationGrowthRate: number | null
  populationDensity: number | null
  birthRate: number | null
  deathRate: number | null
  fertilityRate: number | null
  medianAge: number | null
  populationAge0To14: number | null
  populationAge15To64: number | null
  populationAge65Plus: number | null
  urbanPopulation: string | null
  urbanizationRate: number | null
  lifeExpectancy: number | null
  lifeExpectancyMale: number | null
  lifeExpectancyFemale: number | null
  sexRatio: number | null
  netMigration: number | null

  //--- 연령대별 성별 인구 (인구 피라미드). BigInt 컬럼이라 string으로 내보낸다.
  maleAge0To9: string | null
  femaleAge0To9: string | null
  maleAge10To19: string | null
  femaleAge10To19: string | null
  maleAge20To29: string | null
  femaleAge20To29: string | null
  maleAge30To39: string | null
  femaleAge30To39: string | null
  maleAge40To49: string | null
  femaleAge40To49: string | null
  maleAge50To59: string | null
  femaleAge50To59: string | null
  maleAge60To69: string | null
  femaleAge60To69: string | null
  maleAge70To79: string | null
  femaleAge70To79: string | null
  maleAge80Plus: string | null
  femaleAge80Plus: string | null
  createdAt: Date
  updatedAt: Date
}

