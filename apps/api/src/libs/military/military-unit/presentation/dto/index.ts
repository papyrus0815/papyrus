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

/** 군종 (Prisma `MilitaryBranch`와 동일) */
export type MilitaryBranch =
  | 'ARMY'
  | 'NAVY'
  | 'AIR_FORCE'
  | 'MARINE_CORPS'
  | 'COAST_GUARD'
  | 'SPACE_FORCE'
  | 'JOINT'
  | 'OTHER'

/** 군부대 생성/수정 시 함께 저장하는 지휘관 행 */
export interface MilitaryUnitCommanderInput {
  personId: string & tags.Format<'uuid'>
  rank?: string | null
  role?: string | null
  isCurrent?: boolean | null
  /** ISO-8601 또는 YYYY-MM-DD */
  startDate?: string | null
  endDate?: string | null
  /** 제N대 등 */
  termNumber?: number | null
}

// Response DTO
export interface MilitaryUnitDto {
  id: string
  name: string
  unitType?: MilitaryUnitType | null
  branch?: MilitaryBranch | null
  /** 현대 소속 국가 — 표시/그룹핑 축 */
  countryId?: string | null
  /** 역사 소속 국가(독일 제국 등) — 소속 축. 현대와 듀얼, 표시는 역사 우선 */
  historicalCountryId?: string | null
  isActive?: boolean | null
  establishedDate?: string | null
  disbandedDate?: string | null
  parentUnitId?: string | null
  /** 연결된 행정 부처(국방부 본부 등) — 중앙부처 트리와 매핑 */
  administrationDepartmentId?: string | null
  nickname?: string | null
  motto?: string | null
  garrison?: string | null
  strength?: string | null
  insigniaUrl?: string | null
  primaryMission?: string | null
  jurisdiction?: string | null
  notableBattles?: string | null
  honors?: string | null
  description?: string | null
  /** 배속 함선(해군 ORBAT) — 조회 전용 */
  assignedNavalVessels?: Array<{
    id: string
    name: string
    vesselType?: string | null
  }>
  createdAt: string
  updatedAt: string
  // Relations
  country?: {
    id: string
    name: string
    flagEmoji?: string | null
  } | null
  /** 역사 소속 국가 — 존속 연도까지 함께 내려 시대착오 표시를 막는다 */
  historicalCountry?: {
    id: string
    name: string
    enName?: string | null
    startEra?: string | null
    startYear?: number | null
    endEra?: string | null
    endYear?: number | null
  } | null
  parentUnit?: {
    id: string
    name: string
    unitType?: MilitaryUnitType | null
  } | null
  administrationDepartment?: {
    id: string
    name: string
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
    startDate?: string | null
    endDate?: string | null
    termNumber?: number | null
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
  branch?: MilitaryBranch | null
  countryId?: (string & tags.Format<'uuid'>) | null
  /** 역사 소속 국가(독일 제국 등). countryId와 동시 설정 가능 — 표시는 역사 우선 */
  historicalCountryId?: (string & tags.Format<'uuid'>) | null
  isActive?: boolean | null
  establishedDate?: (string & tags.Format<'date-time'>) | null
  disbandedDate?: (string & tags.Format<'date-time'>) | null
  parentUnitId?: (string & tags.Format<'uuid'>) | null
  administrationDepartmentId?: (string & tags.Format<'uuid'>) | null
  nickname?: (string & tags.MaxLength<200>) | null
  motto?: (string & tags.MaxLength<500>) | null
  garrison?: (string & tags.MaxLength<500>) | null
  strength?: (string & tags.MaxLength<200>) | null
  insigniaUrl?: (string & tags.MaxLength<500>) | null
  primaryMission?: string | null
  jurisdiction?: string | null
  notableBattles?: string | null
  honors?: string | null
  description?: string | null
  /** 함께 등록할 지휘관(인물 연결) */
  commanders?: MilitaryUnitCommanderInput[] | null
}

// Update DTO
export interface UpdateMilitaryUnitDto {
  name?: string & tags.MinLength<1> & tags.MaxLength<100>
  unitType?: MilitaryUnitType | null
  branch?: MilitaryBranch | null
  countryId?: (string & tags.Format<'uuid'>) | null
  /** 역사 소속 국가(독일 제국 등). countryId와 동시 설정 가능 — 표시는 역사 우선 */
  historicalCountryId?: (string & tags.Format<'uuid'>) | null
  isActive?: boolean | null
  establishedDate?: (string & tags.Format<'date-time'>) | null
  disbandedDate?: (string & tags.Format<'date-time'>) | null
  parentUnitId?: (string & tags.Format<'uuid'>) | null
  administrationDepartmentId?: (string & tags.Format<'uuid'>) | null
  nickname?: (string & tags.MaxLength<200>) | null
  motto?: (string & tags.MaxLength<500>) | null
  garrison?: (string & tags.MaxLength<500>) | null
  strength?: (string & tags.MaxLength<200>) | null
  insigniaUrl?: (string & tags.MaxLength<500>) | null
  primaryMission?: string | null
  jurisdiction?: string | null
  notableBattles?: string | null
  honors?: string | null
  description?: string | null
  /** 전달 시 해당 부대의 지휘관 목록을 이 배열로 교체(빈 배열이면 전부 삭제) */
  commanders?: MilitaryUnitCommanderInput[] | null
}

