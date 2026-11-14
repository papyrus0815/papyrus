import { Type } from 'class-transformer'
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator'

import { DateInfoDto } from '../../../person/presentation/dto/create-person.dto'

/**
 * 국가 기관(AdministrationDepartment) DTO — 2026-11-08 재설계.
 *
 * 날짜는 구조화(establishedInfo/abolishedInfo: era + 크기값 연/월/일)가 정본이다.
 * 레거시 ISO(establishedDate/abolishedDate)도 받지만 구조화가 있으면 그쪽이 이긴다.
 */

export const ADMINISTRATION_DEPARTMENT_KINDS = [
  'MINISTRY',
  'AGENCY',
  'COLONIAL_GOVERNMENT',
  'ROYAL_HOUSEHOLD',
  'OTHER',
] as const
export type AdministrationDepartmentKindValue = (typeof ADMINISTRATION_DEPARTMENT_KINDS)[number]

export const DEPARTMENT_TRANSITION_KINDS = ['RENAME', 'MERGE', 'SPLIT', 'REORGANIZE', 'ABSORBED'] as const
export type DepartmentTransitionKindValue = (typeof DEPARTMENT_TRANSITION_KINDS)[number]

// ─── 응답 ─────────────────────────────────────────────────────────────────

export type AdministrationDepartmentCategoryDto = {
  id: string
  name: string
  nameEn: string | null
}

/** 구조화 날짜 한쪽 — 웹은 era/연/월/일을 그대로 쓴다(BC·TZ 안전) */
export type DepartmentDatePartsDto = {
  era: 'BC' | 'AD'
  year: number
  month: number | null
  day: number | null
  precision: string | null
}

/** 기관 요약(계보·상위·하위·사건 연결 칩) */
export type DepartmentRefDto = {
  id: string
  name: string
  abbreviation: string | null
  kind: AdministrationDepartmentKindValue
}

/** 계보 한 줄 — 상대 기관 + 이어진 방식 */
export type DepartmentLineageDto = {
  transitionId: string
  kind: DepartmentTransitionKindValue
  era: 'BC' | 'AD' | null
  year: number | null
  month: number | null
  note: string | null
  department: DepartmentRefDto
}

/** 이 기관에 `administrationDepartmentId`로 연결된 군사 부대 요약 */
export type AdministrationDepartmentMilitaryUnitDto = {
  id: string
  name: string
  abbreviation?: string | null
  unitType: string | null
}

/** 이 행정기관에서 군사 사령부·부대로 개편된 후신 계보(예: 전쟁부 → OKW) */
export type DepartmentMilitaryUnitLineageDto = {
  transitionId: string
  kind: DepartmentTransitionKindValue
  era: 'BC' | 'AD' | null
  year: number | null
  month: number | null
  note: string | null
  militaryUnit: {
    id: string
    name: string
    abbreviation: string | null
    unitType: string | null
  }
}

export type AdministrationDepartmentResponseDto = {
  id: string
  name: string
  nameLocal: string | null
  nameEn: string | null
  abbreviation: string | null
  kind: AdministrationDepartmentKindValue
  thumbnailUrl: string | null
  countryId: string | null
  country: { id: string; name: string } | null
  /** 역사적 국가 — 정체성 축(표시는 역사 우선) */
  historicalCountryId: string | null
  historicalCountry: { id: string; name: string } | null
  parentId: string | null
  parent: DepartmentRefDto | null
  children: DepartmentRefDto[]
  categoryId: string | null
  category: AdministrationDepartmentCategoryDto | null
  description: string | null
  /** 주요 임무 · 관할권 */
  primaryMission: string | null
  /** 본부 · 청사 소재지 */
  headquarters: string | null
  /** 산하 편제 · 내부 조직 구조 */
  orgStructure: string | null
  /** 예산 · 정원 · 규모 참고 */
  budgetNote: string | null
  /** 구조화 설립일(정본) */
  established: DepartmentDatePartsDto | null
  /** 구조화 폐지일(정본). null이면 현존 */
  abolished: DepartmentDatePartsDto | null
  /** 부호 날짜 문자열('1938-02-04', 기원전은 '-0221-01-01') — 모르는 월·일은 01 */
  establishedDate: string | null
  abolishedDate: string | null
  /** 전신 — 이 기관으로 이어진 앞 기관들 */
  predecessors: DepartmentLineageDto[]
  /** 후신 — 이 기관이 이어진 뒤 기관들 */
  successors: DepartmentLineageDto[]
  /** 군사 사령부·부대로 이어진 후신 계보(예: 전쟁부 → OKW) */
  militaryUnitSuccessors?: DepartmentMilitaryUnitLineageDto[]
  /** 군부대(MilitaryUnit) FK 역방향 */
  militaryUnits: AdministrationDepartmentMilitaryUnitDto[]
  createdAt: string
  updatedAt: string
}

/** 기관이 관여한 사건 한 줄(기관 상세 '관련 사건') */
export type DepartmentEventLinkDto = {
  relationId: string
  role: string
  roleDescription: string | null
  event: {
    id: string
    title: string
    startEra: string | null
    startYear: number | null
    startMonth: number | null
    startDay: number | null
  }
}

// ─── 입력 ─────────────────────────────────────────────────────────────────

export class CreateAdministrationDepartmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameLocal?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameEn?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(40)
  abbreviation?: string | null

  @IsOptional()
  @IsIn(ADMINISTRATION_DEPARTMENT_KINDS as unknown as string[])
  kind?: AdministrationDepartmentKindValue

  /** 현대 국가 — historicalCountryId와 함께 채울 수 있음(표시/그룹핑용) */
  @IsOptional()
  @IsUUID()
  countryId?: string | null

  /** 역사적 국가 — 정체성 축 */
  @IsOptional()
  @IsUUID()
  historicalCountryId?: string | null

  @IsOptional()
  @IsUUID()
  parentId?: string | null

  @IsOptional()
  @IsUUID()
  categoryId?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(255)
  thumbnailUrl?: string | null

  @IsOptional()
  @IsString()
  description?: string | null

  @IsOptional()
  @IsString()
  primaryMission?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(500)
  headquarters?: string | null

  @IsOptional()
  @IsString()
  orgStructure?: string | null

  @IsOptional()
  @IsString()
  budgetNote?: string | null

  /** 구조화 설립일 — BC·고대·연 단위 */
  @IsOptional()
  @ValidateNested()
  @Type(() => DateInfoDto)
  establishedInfo?: DateInfoDto | null

  /** 구조화 폐지일 */
  @IsOptional()
  @ValidateNested()
  @Type(() => DateInfoDto)
  abolishedInfo?: DateInfoDto | null

  /** 레거시 ISO 설립일(서기만). establishedInfo가 있으면 무시 */
  @IsOptional()
  @IsString()
  establishedDate?: string | null

  /** 레거시 ISO 폐지일 */
  @IsOptional()
  @IsString()
  abolishedDate?: string | null
}

/** 부분 수정 — 생략한 칸은 그대로, null은 비움 */
export class UpdateAdministrationDepartmentDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameLocal?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameEn?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(40)
  abbreviation?: string | null

  @IsOptional()
  @IsIn(ADMINISTRATION_DEPARTMENT_KINDS as unknown as string[])
  kind?: AdministrationDepartmentKindValue

  @IsOptional()
  @IsUUID()
  countryId?: string | null

  @IsOptional()
  @IsUUID()
  historicalCountryId?: string | null

  @IsOptional()
  @IsUUID()
  parentId?: string | null

  @IsOptional()
  @IsUUID()
  categoryId?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(255)
  thumbnailUrl?: string | null

  @IsOptional()
  @IsString()
  description?: string | null

  @IsOptional()
  @IsString()
  primaryMission?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(500)
  headquarters?: string | null

  @IsOptional()
  @IsString()
  orgStructure?: string | null

  @IsOptional()
  @IsString()
  budgetNote?: string | null

  @IsOptional()
  @ValidateNested()
  @Type(() => DateInfoDto)
  establishedInfo?: DateInfoDto | null

  @IsOptional()
  @ValidateNested()
  @Type(() => DateInfoDto)
  abolishedInfo?: DateInfoDto | null

  @IsOptional()
  @IsString()
  establishedDate?: string | null

  @IsOptional()
  @IsString()
  abolishedDate?: string | null
}

/** 계보 추가 — :id(앞 기관) → successorId(뒤 기관) */
export class CreateDepartmentTransitionDto {
  @IsUUID()
  successorId!: string

  @IsIn(DEPARTMENT_TRANSITION_KINDS as unknown as string[])
  kind!: DepartmentTransitionKindValue

  @IsOptional()
  @IsIn(['BC', 'AD'])
  era?: 'BC' | 'AD' | null

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9999)
  year?: number | null

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number | null

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string | null
}

export class UpdateDepartmentTransitionDto {
  @IsOptional()
  @IsIn(DEPARTMENT_TRANSITION_KINDS as unknown as string[])
  kind?: DepartmentTransitionKindValue

  @IsOptional()
  @IsIn(['BC', 'AD'])
  era?: 'BC' | 'AD' | null

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9999)
  year?: number | null

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number | null

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string | null
}

export class CreateAdministrationDepartmentCategoryBody {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
  nameEn?: string | null
}

export class UpdateAdministrationDepartmentCategoryBody {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
  nameEn?: string | null
}
