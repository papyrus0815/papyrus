import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator'

/**
 * 영토 이전(EventTerritoryTransfer) — "이 사건으로 [지역]이 [내준 나라]에서 [받은 나라]로 [방식]".
 * docs/event-territory-transfer-review.md
 */

/** Prisma TerritoryTransferMethod와 같은 값 — 라벨은 프론트 래퍼(shared/api/territory-transfers)가 소유 */
export const TERRITORY_TRANSFER_METHODS = [
  'PARTITION',
  'CESSION',
  'ANNEXATION',
  'EXCHANGE',
  'PURCHASE',
  'OCCUPATION',
  'RETROCESSION',
  'LEASE',
  'OTHER',
] as const
export type TerritoryTransferMethodValue = (typeof TERRITORY_TRANSFER_METHODS)[number]

export const TERRITORY_REGION_MAX = 200
export const TERRITORY_PARTY_NAME_MAX = 100
export const TERRITORY_NOTE_MAX = 2000

/** 한 줄 입력 — id가 있으면 그 줄을 고치고, 없으면 새 줄. 배열 순서가 표시 순서 */
export class TerritoryTransferInputDto {
  @ApiProperty({ required: false, description: '기존 줄 id' })
  @IsOptional()
  @IsString()
  id?: string

  @ApiProperty({ required: false, nullable: true, description: '내준 나라 — 현대 국가 id' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  fromCountryId?: string | null

  @ApiProperty({ required: false, nullable: true, description: '내준 나라 — 역사 국가 id' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  fromHistoricalCountryId?: string | null

  @ApiProperty({ required: false, nullable: true, description: '내준 나라 — 등록되지 않은 이름' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(TERRITORY_PARTY_NAME_MAX)
  fromName?: string | null

  @ApiProperty({ required: false, nullable: true, description: '받은 나라 — 현대 국가 id' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  toCountryId?: string | null

  @ApiProperty({ required: false, nullable: true, description: '받은 나라 — 역사 국가 id' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  toHistoricalCountryId?: string | null

  @ApiProperty({ required: false, nullable: true, description: '받은 나라 — 등록되지 않은 이름(자유시·위임통치령)' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(TERRITORY_PARTY_NAME_MAX)
  toName?: string | null

  @ApiProperty({ description: '지역 이름 — 왕령 프로이센, 갈리치아' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(TERRITORY_REGION_MAX)
  regionName!: string

  @ApiProperty({ enum: TERRITORY_TRANSFER_METHODS })
  @IsIn(TERRITORY_TRANSFER_METHODS)
  method!: TerritoryTransferMethodValue

  @ApiProperty({ required: false, nullable: true, description: '면적(km²)' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(0)
  areaKm2?: number | null

  @ApiProperty({ required: false, nullable: true, description: '인구' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(0)
  population?: number | null

  @ApiProperty({ required: false, nullable: true, description: '근거 조약 id' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  treatyId?: string | null

  @ApiProperty({ required: false, nullable: true, enum: ['BC', 'AD'], description: '발효 시점 — 기원' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsIn(['BC', 'AD'])
  effectiveEra?: 'BC' | 'AD' | null

  @ApiProperty({ required: false, nullable: true, description: '발효 시점 — 연(양수)' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  effectiveYear?: number | null

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  effectiveMonth?: number | null

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  effectiveDay?: number | null

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(TERRITORY_NOTE_MAX)
  note?: string | null
}

export class SyncTerritoryTransfersDto {
  @ApiProperty({ type: [TerritoryTransferInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TerritoryTransferInputDto)
  transfers!: TerritoryTransferInputDto[]

  @ApiProperty({
    required: false,
    description: '참여국에 없는 나라를 채운다(내준 나라 = 피해국, 받은 나라 = 수혜국, 둘 다면 참여국). 기본 true',
  })
  @IsOptional()
  @IsBoolean()
  fillParticipants?: boolean
}

/** 한쪽 나라 — 이름은 등록된 나라면 그 이름, 아니면 자유 이름 */
export interface TerritoryPartyDto {
  countryId: string | null
  historicalCountryId: string | null
  name: string | null
}

export interface TerritoryTransferDto {
  id: string
  eventId: string
  from: TerritoryPartyDto
  to: TerritoryPartyDto
  regionName: string
  method: TerritoryTransferMethodValue
  areaKm2: number | null
  population: number | null
  treaty: { id: string; name: string; signDate: string | null } | null
  effectiveEra: 'BC' | 'AD' | null
  effectiveYear: number | null
  effectiveMonth: number | null
  effectiveDay: number | null
  effectivePrecision: string | null
  note: string | null
  sortOrder: number
}

/** 나라 쪽 '영토 변천' 한 줄 — 어느 사건에서, 얻었나 잃었나 */
export interface CountryTerritoryChangeDto extends TerritoryTransferDto {
  /** 이 나라 기준 — gained(받음) | lost(내줌) */
  direction: 'gained' | 'lost'
  event: {
    id: string
    title: string
    startEra: 'BC' | 'AD' | null
    startYear: number | null
    startMonth: number | null
    startDay: number | null
    startDate: string | null
  }
}
