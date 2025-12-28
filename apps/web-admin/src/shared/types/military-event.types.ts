// ========================
// Enums
// ========================

export enum SideLevel {
  COALITION = 'COALITION',
  COUNTRY = 'COUNTRY',
  FORCE = 'FORCE',
}

export enum MilitaryRelationType {
  ALLIED = 'ALLIED',
  COOPERATION = 'COOPERATION',
  NON_AGGRESSION = 'NON_AGGRESSION',
  NEUTRAL = 'NEUTRAL',
  ENEMY = 'ENEMY',
  PUPPET = 'PUPPET',
  OCCUPIED = 'OCCUPIED',
}

export enum ParticipationType {
  MAIN = 'MAIN',
  SUPPORT = 'SUPPORT',
  LIMITED = 'LIMITED',
  OCCUPIED = 'OCCUPIED',
}

export enum ConflictType {
  BATTLE = 'BATTLE',
  WAR = 'WAR',
  SIEGE = 'SIEGE',
  CAMPAIGN = 'CAMPAIGN',
  SKIRMISH = 'SKIRMISH',
}

export enum CombatType {
  LAND = 'LAND',
  NAVAL = 'NAVAL',
  AIR = 'AIR',
  AMPHIBIOUS = 'AMPHIBIOUS',
  COMBINED = 'COMBINED',
}

// ========================
// Country In Side
// ========================

export interface CountryInSide {
  countryId?: string
  historicalCountryId?: string
  commander?: string
  commanderPersonId?: string
  forces?: string
  participationType?: ParticipationType
  joinDate?: string // ISO 8601
  withdrawDate?: string // ISO 8601
  description?: string
}

// ========================
// Belligerent Side
// ========================

export interface BelligerentSide {
  name: string
  level?: SideLevel
  commander?: string
  commanderPersonId?: string
  forces?: string
  description?: string
  color?: string
  countries?: CountryInSide[]
}

// ========================
// Country Relation
// ========================

export interface EventCountryRelation {
  fromCountryId?: string
  fromHistoricalCountryId?: string
  toCountryId?: string
  toHistoricalCountryId?: string
  relationType: MilitaryRelationType
  startDate?: string // ISO 8601
  endDate?: string // ISO 8601
  strength?: number // 1-10
  description?: string
}

// ========================
// Military Details
// ========================

export interface MilitaryDetails {
  conflictType?: ConflictType
  combatTypes?: CombatType[]
  objective?: string
  tactics?: string
  strategy?: string
  outcome?: string
  territoryChanges?: string
  treaty?: string
  strategicImpact?: string
}

// ========================
// Casualties
// ========================

export interface CountryCasualties {
  countryId?: string
  historicalCountryId?: string
  killed?: string
  wounded?: string
  missing?: string
  captured?: string
  civilianDeaths?: string
  total?: string
}

export interface CasualtiesData {
  sideName?: string
  totalKilled?: string
  totalWounded?: string
  countryCasualties?: CountryCasualties[]
}

// ========================
// Complete Military Event
// ========================

export interface MilitaryEvent {
  belligerentSides?: BelligerentSide[]
  relations?: EventCountryRelation[]
  militaryDetails?: MilitaryDetails
  casualties?: CasualtiesData[]
  warCost?: string
}
