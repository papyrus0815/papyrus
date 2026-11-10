import { ApiProperty } from '@nestjs/swagger'
import { EventContextRole } from '@prisma/client'
import { Type } from 'class-transformer'
import {
  IsArray,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator'

export const EVENT_CONTEXT_DOMAINS = [
  'LAW',
  'SOCIAL_PHENOMENON',
  'NATURAL_FEATURE',
  'INFRASTRUCTURE',
  'CLIMATE',
  'RESOURCE',
  'COMPANY_FACILITY',
] as const

export type EventContextDomain = (typeof EVENT_CONTEXT_DOMAINS)[number]

export class EventContextLinkInputDto {
  @ApiProperty({ enum: EVENT_CONTEXT_DOMAINS, description: '연결할 타 도메인 종류' })
  @IsIn(EVENT_CONTEXT_DOMAINS)
  domain!: EventContextDomain

  @ApiProperty({ description: '연결할 대상 엔티티 id' })
  @IsString()
  entityId!: string

  @ApiProperty({ enum: EventContextRole, required: false, description: '맥락 역할 (배경·원인·목표·장애물·수단·결과)' })
  @IsOptional()
  @IsEnum(EventContextRole)
  role?: EventContextRole

  @ApiProperty({ required: false, nullable: true, description: '귀속 진영(EventSide) id (선택)' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  sideId?: string | null

  @ApiProperty({ required: false, nullable: true, description: '맥락 설명·메모' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(1000)
  note?: string | null
}

export class SyncEventContextLinksDto {
  @ApiProperty({ type: [EventContextLinkInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventContextLinkInputDto)
  links!: EventContextLinkInputDto[]
}
