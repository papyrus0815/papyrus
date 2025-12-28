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
  createdAt: Date
  updatedAt: Date
}

