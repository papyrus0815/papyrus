import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator'

/**
 * 국면 — 묶음 사건 안의 구획(목차). 사건이 아니라서 목록·검색에 서지 않는다.
 * 기간은 사건 날짜와 같은 구조화 축(BC·고대 포함). 월·일은 모르면 비운다.
 */
export class EventPhaseDto {
  @ApiProperty() id!: string
  @ApiProperty() title!: string
  @ApiProperty() order!: number
  @ApiProperty({ nullable: true, enum: ['BC', 'AD'] }) startEra!: 'BC' | 'AD' | null
  @ApiProperty({ nullable: true }) startYear!: number | null
  @ApiProperty({ nullable: true }) startMonth!: number | null
  @ApiProperty({ nullable: true }) startDay!: number | null
  @ApiProperty({ nullable: true, enum: ['BC', 'AD'] }) endEra!: 'BC' | 'AD' | null
  @ApiProperty({ nullable: true }) endYear!: number | null
  @ApiProperty({ nullable: true }) endMonth!: number | null
  @ApiProperty({ nullable: true }) endDay!: number | null
  @ApiProperty({ nullable: true }) description!: string | null
}

export class EventPhaseInputDto {
  @ApiProperty({ required: false, description: '기존 국면 id — 없으면 새로 만든다' })
  @IsOptional()
  @IsString()
  id?: string

  @ApiProperty({ description: '국면 이름 — 예: 의회 개원과 거부권 정국 마비' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string

  @ApiProperty({ required: false, nullable: true, enum: ['BC', 'AD'] })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsIn(['BC', 'AD'])
  startEra?: 'BC' | 'AD' | null

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  startYear?: number | null

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  @Max(12)
  startMonth?: number | null

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  @Max(31)
  startDay?: number | null

  @ApiProperty({ required: false, nullable: true, enum: ['BC', 'AD'] })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsIn(['BC', 'AD'])
  endEra?: 'BC' | 'AD' | null

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  endYear?: number | null

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  @Max(12)
  endMonth?: number | null

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  @Max(31)
  endDay?: number | null

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(5000)
  description?: string | null
}

export class SyncEventPhasesDto {
  @ApiProperty({ type: [EventPhaseInputDto], description: '국면 전체 목록 — 배열 순서가 표시 순서. 빠진 국면은 지운다' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventPhaseInputDto)
  phases!: EventPhaseInputDto[]
}
