import { PersonGroupType } from '@prisma/client'
import { Type } from 'class-transformer'
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator'

import { PersonResponseDto } from './person.response'

/**
 * 인물 묶음(세대·계파·동기 등) 생성 DTO.
 * 마오·저우언라이 같은 "같은 세대·같은 묶음"을 표현하는 N항 그룹.
 */
export class CreatePersonGroupDto {
  @IsString()
  @MaxLength(150)
  name!: string

  @IsEnum(PersonGroupType)
  type!: PersonGroupType

  @IsOptional()
  @IsString()
  description?: string | null

  /** 세대 순번 (1세대=1). GENERATION에서만 의미 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  generationOrder?: number | null

  @IsOptional()
  @IsUUID()
  countryId?: string | null

  /** 연관 역사 국가 ID (예: 프랑스 제1공화국, 조선) */
  @IsOptional()
  @IsUUID()
  historicalCountryId?: string | null

  /** 전임(이전) 묶음 ID — 세대 계승 (예: 2세대→1세대) */
  @IsOptional()
  @IsUUID()
  predecessorGroupId?: string | null

  /** 중심 인물 ID (구심점) — CIRCLE/사단·제자단 등 */
  @IsOptional()
  @IsUUID()
  centerPersonId?: string | null

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number | null

  /** 생성과 동시에 넣을 멤버 인물 ID들 (선택) */
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  memberPersonIds?: string[]
}

export class UpdatePersonGroupDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string

  @IsOptional()
  @IsEnum(PersonGroupType)
  type?: PersonGroupType

  @IsOptional()
  @IsString()
  description?: string | null

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  generationOrder?: number | null

  @IsOptional()
  @IsUUID()
  countryId?: string | null

  /** 연관 역사 국가 ID (예: 프랑스 제1공화국, 조선) */
  @IsOptional()
  @IsUUID()
  historicalCountryId?: string | null

  /** 전임(이전) 묶음 ID. null 전달 시 연결 해제 */
  @IsOptional()
  @IsUUID()
  predecessorGroupId?: string | null

  /** 중심 인물 ID. null 전달 시 해제 */
  @IsOptional()
  @IsUUID()
  centerPersonId?: string | null

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number | null
}

/** 묶음에 인물 한 명 추가 */
export class AddPersonGroupMemberDto {
  @IsUUID()
  personId!: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  roleLabel?: string | null

  @IsOptional()
  @IsString()
  note?: string | null

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number | null
}

export class UpdatePersonGroupMemberDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  roleLabel?: string | null

  @IsOptional()
  @IsString()
  note?: string | null

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number | null
}

// ── 응답 타입 ────────────────────────────────────────────────

export interface PersonGroupMemberDto {
  /** 멤버십 행 ID (그룹-인물 조인) */
  membershipId: string
  roleLabel: string | null
  note: string | null
  sortOrder: number | null
  /** 멤버 인물 (인물 카드용 전체 응답) */
  person: PersonResponseDto
}

/** 계승 네비게이션용 간략 묶음 참조 */
export interface PersonGroupRefDto {
  id: string
  name: string
  type: PersonGroupType
  generationOrder: number | null
}

/** 이 묶음이 사건의 진영(편)으로 참여한 기록 */
export interface PersonGroupEventSideDto {
  sideId: string
  sideName: string
  sideColor: string | null
  outcome: string | null
  outcomeNote: string | null
  eventId: string
  eventTitle: string
  eventDomain: string
  eventType: string | null
  startDate: string | null
  startEra: string | null
  startYear: number | null
  opposingSides: Array<{
    id: string
    name: string
    color: string | null
    outcome: string | null
    personGroupId: string | null
    personGroupName: string | null
  }>
}

/** 이 묶음의 소속 인물이 참여한 사건 기록 (person_event 기반) */
export interface PersonGroupMemberEventDto {
  eventId: string
  eventTitle: string
  eventDomain: string
  eventType: string | null
  startDate: string | null
  startEra: string | null
  startYear: number | null
  participants: Array<{
    personId: string
    personName: string
    role: string | null
  }>
}

export interface PersonGroupResponseDto {
  id: string
  name: string
  type: PersonGroupType
  description: string | null
  generationOrder: number | null
  countryId: string | null
  countryName: string | null
  historicalCountryId: string | null
  historicalCountryName: string | null
  sortOrder: number | null
  memberCount: number
  /** 이 묶음이 진영으로 참여한 사건 수 */
  eventSideCount?: number
  /** 전임(이전) 묶음 — 세대 계승 */
  predecessor: PersonGroupRefDto | null
  /** 후임(다음) 묶음들 — 보통 0~1개 */
  successors: PersonGroupRefDto[]
  /** 중심 인물 (구심점) — 인물 카드 */
  center: PersonResponseDto | null
  /** 요청 계정이 이 묶음을 편집할 수 있는지 (생성자이거나, 생성자 미지정 공유 묶음) */
  canEdit: boolean
  /** 멤버 인물 목록 */
  members: PersonGroupMemberDto[]
  /** 상세 조회 시 이 묶음이 진영으로 참여한 사건 목록 */
  eventSides?: PersonGroupEventSideDto[]
  /** 상세 조회 시 소속 인물이 참여한 사건 목록 (person_event 기반) */
  memberEvents?: PersonGroupMemberEventDto[]
  createdAt: string
  updatedAt: string
}
