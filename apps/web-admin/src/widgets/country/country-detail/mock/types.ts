// ============================================
// 공통 타입 정의
// ============================================

// 행정구역 관련 타입
export interface AdministrativeLevel1 {
  id: string
  name: string
  count: number
  type: string
}

export interface AdministrativeLevel2 {
  id: string
  name: string
  population: string
  area: string
}

export interface CityDetails {
  mayor: string
  party: string
  population?: string
  area?: string
  gdp?: string
  industry?: string
  districts?: Array<{ name: string; population: string; area: string }>
  universities?: Array<{ name: string; type: string; students: string }>
  companies?: Array<{ name: string; sector: string; employees: string }>
  attractions?: Array<{ name: string; type: string; visitors: string }>
}

export interface AdministrativeSystemLevel {
  level: number
  name: string
  nameEn: string
  count: number
  examples: string[]
}

export interface AdministrativeSystem {
  countryName: string
  countryNameKo: string
  levels: AdministrativeSystemLevel[]
}

// 자연 지리 관련 타입
export interface Mountain {
  id: string
  name: string
  height: string
  location: string
  region: string
  latitude: number
  longitude: number
  rank?: number
  nationalPark?: boolean
}

export interface River {
  id: string
  name: string
  length: string
  source: string
  mouth: string
  region: string
  latitude: number
  longitude: number
}

export interface Lake {
  id: string
  name: string
  area: string
  depth: string
  type: string
  region: string
  latitude: number
  longitude: number
}

export interface Coast {
  id: string
  name: string
  length: string
  region: string
  type: string
  latitude: number
  longitude: number
}

export interface NatureData {
  mountains: Mountain[]
  rivers: River[]
  lakes: Lake[]
  coasts: Coast[]
}

// 인프라 관련 타입
export interface Highway {
  id: string
  name: string
  number: string
  length: string
  lanes: string
  sections: string
  opening: string
}

export interface Railway {
  id: string
  name: string
  type: string
  length: string
  stations?: string
  opening: string
  operator: string
}

export interface Airport {
  id: string
  name: string
  code: string
  type: string
  passengers: string
  location: string
  latitude: number
  longitude: number
}

export interface Port {
  id: string
  name: string
  type: string
  capacity: string
  location: string
  latitude: number
  longitude: number
}

export interface InfrastructureData {
  highways: Highway[]
  railways: Railway[]
  airports: Airport[]
  ports: Port[]
}

// 행정조직 관련 타입
export interface HistoricalEvent {
  year: string
  title: string
  description: string
  type: 'establishment' | 'reform' | 'achievement' | 'crisis' | 'merger'
}

export interface TimelineItem {
  year: string
  event: string
  impact?: string
}

export interface StatisticsData {
  year: string
  budget?: number
  employees?: number
  projects?: number
  [key: string]: string | number | undefined
}

export interface Ministry {
  id: string
  name: string
  nameEn: string
  minister: string
  established: string
  employees: string
  budget: string
  responsibilities: string[]
  departments: string[]
  agencies: string[]
  images?: string[]
  history?: string
  location?: string
  website?: string
  mainProjects?: string[]
  events?: HistoricalEvent[]
  timeline?: TimelineItem[]
  statistics?: StatisticsData[]
}

export interface ConstitutionalBody {
  id: string
  name: string
  nameEn: string
  head: string
  established: string
  members: string
  role: string
  committees?: string[]
  departments?: string[]
  images?: string[]
  history?: string
  location?: string
  website?: string
  keyDecisions?: string[]
  events?: HistoricalEvent[]
  timeline?: TimelineItem[]
  statistics?: StatisticsData[]
}

export interface Agency {
  id: string
  name: string
  nameEn: string
  parent: string
  head: string
  employees: string
  role: string
  budget: string
  images?: string[]
  history?: string
  location?: string
  website?: string
  services?: string[]
  events?: HistoricalEvent[]
  timeline?: TimelineItem[]
  statistics?: StatisticsData[]
}

export interface LocalGovernment {
  id: string
  name: string
  type: string
  head: string
  party: string
  employees: string
  budget: string
  population: string
  districts: number
  images?: string[]
  history?: string
  location?: string
  website?: string
  famousFor?: string[]
  events?: HistoricalEvent[]
  timeline?: TimelineItem[]
  statistics?: StatisticsData[]
}

export interface GovernmentOrganization {
  ministries: Ministry[]
  constitutionalBodies: ConstitutionalBody[]
  agencies: Agency[]
  localGovernments: LocalGovernment[]
}
