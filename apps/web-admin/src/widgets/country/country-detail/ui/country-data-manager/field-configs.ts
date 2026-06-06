/**
 * 지표 에디터 필드 구성 (큐레이션된 핵심 필드만 노출).
 * upsert는 부분 갱신이므로 여기 없는 필드는 기존 값이 보존된다.
 */
export type IndicatorType = 'economic' | 'demographic' | 'development'

export interface IndicatorFieldDef {
  key: string
  label: string
  /** 'text'면 문자열(BigInt 컬럼 등), 아니면 number */
  kind?: 'number' | 'text'
  unit?: string
}

export const INDICATOR_META: Record<
  IndicatorType,
  { label: string; fields: IndicatorFieldDef[] }
> = {
  economic: {
    label: '경제',
    fields: [
      { key: 'gdp', label: 'GDP', unit: '$' },
      { key: 'gdpPerCapita', label: '1인당 GDP', unit: '$' },
      { key: 'gdpGrowthRate', label: 'GDP 성장률', unit: '%' },
      { key: 'inflationRate', label: '물가상승률', unit: '%' },
      { key: 'unemploymentRate', label: '실업률', unit: '%' },
      { key: 'tradeBalance', label: '무역수지', unit: '$' },
      { key: 'governmentDebt', label: '정부부채', unit: '$' },
      { key: 'debtToGdpRatio', label: '부채/GDP', unit: '%' },
    ],
  },
  demographic: {
    label: '인구',
    fields: [
      { key: 'population', label: '인구', kind: 'text', unit: '명' },
      { key: 'populationGrowthRate', label: '인구증가율', unit: '%' },
      { key: 'birthRate', label: '출생률', unit: '‰' },
      { key: 'deathRate', label: '사망률', unit: '‰' },
      { key: 'fertilityRate', label: '합계출산율' },
      { key: 'lifeExpectancy', label: '기대수명', unit: '세' },
      { key: 'medianAge', label: '중위연령', unit: '세' },
      { key: 'urbanizationRate', label: '도시화율', unit: '%' },
    ],
  },
  development: {
    label: '발전',
    fields: [
      { key: 'hdi', label: 'HDI' },
      { key: 'literacyRate', label: '문해율', unit: '%' },
      { key: 'giniCoefficient', label: '지니계수' },
      { key: 'gniPerCapita', label: '1인당 GNI', unit: '$' },
      { key: 'co2EmissionsPerCapita', label: '1인당 CO₂', unit: 't' },
      { key: 'internetPenetration', label: '인터넷 보급률', unit: '%' },
      { key: 'povertyRate', label: '빈곤율', unit: '%' },
    ],
  },
}
