import { ApiProperty } from '@nestjs/swagger'
import { IsIn, IsOptional, IsString, ValidateIf } from 'class-validator'

/** Prisma `EventCountryRole`과 동일 — 사건에서 국가가 맡은 배역 */
export const EVENT_COUNTRY_ROLE_VALUES = [
  'INITIATOR',
  'TARGET',
  'PARTICIPANT',
  'ALLY',
  'ADVERSARY',
  'MEDIATOR',
  'OBSERVER',
  'VICTIM',
  'BENEFICIARY',
  'OTHER',
] as const

export type EventCountryRoleValue = (typeof EVENT_COUNTRY_ROLE_VALUES)[number]

/**
 * 사건 참여국 한 줄.
 *
 * 현대 국가와 역사적 국가를 **한 배열에 섞어** 담는다(줄마다 둘 중 하나만).
 * 배열 순서가 곧 표시 순서이고, 주도국은 `role: 'INITIATOR'`로 표현한다 —
 * 예전에 따로 있던 `primaryCountryId`(별표)·`relatedCountryIds`(id 배열)는
 * 이 한 형태로 흡수됐다.
 *
 * 줄 단위 필드는 레포 공통 3상 규약을 따른다:
 * 생략=기존 값 유지 · `null`=비움 · 값=설정.
 */
export class EventCountryParticipantDto {
  @ApiProperty({
    description: '현대 국가 ID (historicalCountryId와 동시 지정 불가)',
    required: false,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined && value !== '')
  @IsString()
  countryId?: string | null

  @ApiProperty({ description: '역사적 국가 ID', required: false })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined && value !== '')
  @IsString()
  historicalCountryId?: string | null

  @ApiProperty({
    description:
      '사건에서의 역할. 생략하면 신규 줄은 PARTICIPANT, 기존 줄은 현재 역할을 유지한다.',
    required: false,
    enum: EVENT_COUNTRY_ROLE_VALUES,
  })
  @IsOptional()
  @IsIn(EVENT_COUNTRY_ROLE_VALUES as unknown as string[])
  role?: EventCountryRoleValue

  @ApiProperty({
    description:
      '역할 상세 — "이 나라가 이 사건에서 무엇을 했나". 조약이면 국가별 사실이 여기 들어간다.',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  roleDescription?: string | null

  @ApiProperty({ description: '비고', required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  note?: string | null
}
