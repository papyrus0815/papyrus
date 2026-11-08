import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator'

/**
 * 사건 ↔ 국가 기관(EventDepartmentRelation) — "OKW가 총통 지령 제21호를 기안·하달했다".
 * 2026-11-08 신설. 라벨은 프론트 래퍼(shared/api/event-departments)가 소유한다.
 */
export const EVENT_DEPARTMENT_ROLES = ['ISSUER', 'RECIPIENT', 'PRINCIPAL', 'PARTICIPANT', 'OTHER'] as const
export type EventDepartmentRoleValue = (typeof EVENT_DEPARTMENT_ROLES)[number]

export const EVENT_DEPARTMENT_ROLE_DESCRIPTION_MAX = 2000

export type EventDepartmentDto = {
  id: string
  role: EventDepartmentRoleValue
  roleDescription: string | null
  sortOrder: number
  department: {
    id: string
    name: string
    abbreviation: string | null
    kind: string
    country: { id: string; name: string } | null
    historicalCountry: { id: string; name: string } | null
  }
}

export class CreateEventDepartmentDto {
  @IsUUID()
  departmentId!: string

  @IsIn(EVENT_DEPARTMENT_ROLES as unknown as string[])
  role!: EventDepartmentRoleValue

  @IsOptional()
  @IsString()
  @MaxLength(EVENT_DEPARTMENT_ROLE_DESCRIPTION_MAX)
  roleDescription?: string | null
}

export class UpdateEventDepartmentDto {
  @IsOptional()
  @IsIn(EVENT_DEPARTMENT_ROLES as unknown as string[])
  role?: EventDepartmentRoleValue

  @IsOptional()
  @IsString()
  @MaxLength(EVENT_DEPARTMENT_ROLE_DESCRIPTION_MAX)
  roleDescription?: string | null
}
