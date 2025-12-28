import { tags } from 'typia'

// MilitaryUnitType enum
export type MilitaryUnitType =
  | 'FIELD_ARMY'
  | 'CORPS'
  | 'DIVISION'
  | 'BRIGADE'
  | 'REGIMENT'
  | 'BATTALION'
  | 'COMPANY'
  | 'PLATOON'
  | 'SQUAD'
  | 'FLEET'
  | 'SQUADRON'
  | 'WING'
  | 'SPECIAL_FORCES'
  | 'DETACHMENT'
  | 'OTHER'

// Response DTO
export interface MilitaryUnitDto {
  id: string
  name: string
  unitType?: MilitaryUnitType | null
  countryId?: string | null
  isActive?: boolean | null
  establishedDate?: string | null
  disbandedDate?: string | null
  parentUnitId?: string | null
  description?: string | null
  createdAt: string
  updatedAt: string
  // Relations
  country?: {
    id: string
    name: string
    flagEmoji?: string | null
  } | null
  parentUnit?: {
    id: string
    name: string
    unitType?: MilitaryUnitType | null
  } | null
  subUnits?: Array<{
    id: string
    name: string
    unitType?: MilitaryUnitType | null
    isActive?: boolean | null
  }>
  commanders?: Array<{
    id: string
    personId: string
    rank?: string | null
    role?: string | null
    isCurrent?: boolean | null
    person?: {
      id: string
      name: string
      surname?: string | null
    }
  }>
}

// Create DTO
export interface CreateMilitaryUnitDto {
  name: string & tags.MinLength<1> & tags.MaxLength<100>
  unitType?: MilitaryUnitType | null
  countryId?: (string & tags.Format<'uuid'>) | null
  isActive?: boolean | null
  establishedDate?: (string & tags.Format<'date-time'>) | null
  disbandedDate?: (string & tags.Format<'date-time'>) | null
  parentUnitId?: (string & tags.Format<'uuid'>) | null
  description?: string | null
}

// Update DTO
export interface UpdateMilitaryUnitDto {
  name?: string & tags.MinLength<1> & tags.MaxLength<100>
  unitType?: MilitaryUnitType | null
  countryId?: (string & tags.Format<'uuid'>) | null
  isActive?: boolean | null
  establishedDate?: (string & tags.Format<'date-time'>) | null
  disbandedDate?: (string & tags.Format<'date-time'>) | null
  parentUnitId?: (string & tags.Format<'uuid'>) | null
  description?: string | null
}

