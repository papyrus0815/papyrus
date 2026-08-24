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

  //--- 연령대별 성별 인구 (인구 피라미드). BigInt 컬럼이라 string으로 받는다.
  /** 0-9세 남성 */
  maleAge0To9?: string | null
  /** 0-9세 여성 */
  femaleAge0To9?: string | null
  /** 10-19세 남성 */
  maleAge10To19?: string | null
  /** 10-19세 여성 */
  femaleAge10To19?: string | null
  /** 20-29세 남성 */
  maleAge20To29?: string | null
  /** 20-29세 여성 */
  femaleAge20To29?: string | null
  /** 30-39세 남성 */
  maleAge30To39?: string | null
  /** 30-39세 여성 */
  femaleAge30To39?: string | null
  /** 40-49세 남성 */
  maleAge40To49?: string | null
  /** 40-49세 여성 */
  femaleAge40To49?: string | null
  /** 50-59세 남성 */
  maleAge50To59?: string | null
  /** 50-59세 여성 */
  femaleAge50To59?: string | null
  /** 60-69세 남성 */
  maleAge60To69?: string | null
  /** 60-69세 여성 */
  femaleAge60To69?: string | null
  /** 70-79세 남성 */
  maleAge70To79?: string | null
  /** 70-79세 여성 */
  femaleAge70To79?: string | null
  /** 80세 이상 남성 */
  maleAge80Plus?: string | null
  /** 80세 이상 여성 */
  femaleAge80Plus?: string | null
}
