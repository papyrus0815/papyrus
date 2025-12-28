import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator'

// ========================
// Enums
// ========================

export enum SideLevelDto {
  COALITION = 'COALITION',
  COUNTRY = 'COUNTRY',
  FORCE = 'FORCE',
}

export enum MilitaryRelationTypeDto {
  ALLIED = 'ALLIED',
  COOPERATION = 'COOPERATION',
  NON_AGGRESSION = 'NON_AGGRESSION',
  NEUTRAL = 'NEUTRAL',
  ENEMY = 'ENEMY',
  PUPPET = 'PUPPET',
  OCCUPIED = 'OCCUPIED',
}

export enum ParticipationTypeDto {
  MAIN = 'MAIN',
  SUPPORT = 'SUPPORT',
  LIMITED = 'LIMITED',
  OCCUPIED = 'OCCUPIED',
}

export enum ConflictTypeDto {
  BATTLE = 'BATTLE',
  WAR = 'WAR',
  SIEGE = 'SIEGE',
  CAMPAIGN = 'CAMPAIGN',
  SKIRMISH = 'SKIRMISH',
}

export enum CombatTypeDto {
  LAND = 'LAND',
  NAVAL = 'NAVAL',
  AIR = 'AIR',
  AMPHIBIOUS = 'AMPHIBIOUS',
  COMBINED = 'COMBINED',
}

// ========================
// Country In Side DTO
// ========================

export class CountryInSideDto {
  @ApiProperty({ description: '국가 ID (현대)', required: false })
  @IsString()
  @IsOptional()
  countryId?: string

  @ApiProperty({ description: '역사적 국가 ID', required: false })
  @IsString()
  @IsOptional()
  historicalCountryId?: string

  @ApiProperty({ description: '지휘관', required: false })
  @IsString()
  @IsOptional()
  commander?: string

  @ApiProperty({ description: '지휘관 인물 ID', required: false })
  @IsString()
  @IsOptional()
  commanderPersonId?: string

  @ApiProperty({ description: '병력 규모', required: false })
  @IsString()
  @IsOptional()
  forces?: string

  @ApiProperty({
    description: '참전 유형',
    enum: ParticipationTypeDto,
    required: false,
  })
  @IsEnum(ParticipationTypeDto)
  @IsOptional()
  participationType?: ParticipationTypeDto

  @ApiProperty({ description: '참전일', required: false })
  @IsDateString()
  @IsOptional()
  joinDate?: string

  @ApiProperty({ description: '철수일', required: false })
  @IsDateString()
  @IsOptional()
  withdrawDate?: string

  @ApiProperty({ description: '설명', required: false })
  @IsString()
  @IsOptional()
  description?: string
}

// ========================
// Belligerent Side DTO
// ========================

export class BelligerentSideDto {
  @ApiProperty({ description: '세력 이름 (예: 연합군, 추축국)' })
  @IsString()
  name!: string

  @ApiProperty({
    description: '세력 레벨',
    enum: SideLevelDto,
    required: false,
    default: 'COALITION',
  })
  @IsEnum(SideLevelDto)
  @IsOptional()
  level?: SideLevelDto

  @ApiProperty({ description: '총 지휘관', required: false })
  @IsString()
  @IsOptional()
  commander?: string

  @ApiProperty({ description: '총 지휘관 인물 ID', required: false })
  @IsString()
  @IsOptional()
  commanderPersonId?: string

  @ApiProperty({ description: '총 병력', required: false })
  @IsString()
  @IsOptional()
  forces?: string

  @ApiProperty({ description: '설명', required: false })
  @IsString()
  @IsOptional()
  description?: string

  @ApiProperty({ description: '색상 (HEX)', required: false })
  @IsString()
  @IsOptional()
  color?: string

  @ApiProperty({
    description: '이 세력에 포함된 국가 목록',
    type: [CountryInSideDto],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CountryInSideDto)
  @IsOptional()
  countries?: CountryInSideDto[]
}

// ========================
// Country Relation DTO
// ========================

export class EventCountryRelationDto {
  @ApiProperty({ description: '출발 국가 ID (현대)', required: false })
  @IsString()
  @IsOptional()
  fromCountryId?: string

  @ApiProperty({ description: '출발 역사적 국가 ID', required: false })
  @IsString()
  @IsOptional()
  fromHistoricalCountryId?: string

  @ApiProperty({ description: '목적 국가 ID (현대)', required: false })
  @IsString()
  @IsOptional()
  toCountryId?: string

  @ApiProperty({ description: '목적 역사적 국가 ID', required: false })
  @IsString()
  @IsOptional()
  toHistoricalCountryId?: string

  @ApiProperty({
    description: '관계 유형',
    enum: MilitaryRelationTypeDto,
  })
  @IsEnum(MilitaryRelationTypeDto)
  relationType!: MilitaryRelationTypeDto

  @ApiProperty({ description: '시작일', required: false })
  @IsDateString()
  @IsOptional()
  startDate?: string

  @ApiProperty({ description: '종료일', required: false })
  @IsDateString()
  @IsOptional()
  endDate?: string

  @ApiProperty({
    description: '관계 강도 (1-10)',
    required: false,
    minimum: 1,
    maximum: 10,
  })
  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  strength?: number

  @ApiProperty({ description: '설명', required: false })
  @IsString()
  @IsOptional()
  description?: string
}

// ========================
// Military Details DTO
// ========================

export class MilitaryDetailsDto {
  @ApiProperty({
    description: '분쟁 유형',
    enum: ConflictTypeDto,
    required: false,
  })
  @IsEnum(ConflictTypeDto)
  @IsOptional()
  conflictType?: ConflictTypeDto

  @ApiProperty({
    description: '전투 유형 목록',
    enum: CombatTypeDto,
    isArray: true,
    required: false,
  })
  @IsArray()
  @IsEnum(CombatTypeDto, { each: true })
  @IsOptional()
  combatTypes?: CombatTypeDto[]

  @ApiProperty({ description: '목적', required: false })
  @IsString()
  @IsOptional()
  objective?: string

  @ApiProperty({ description: '전술', required: false })
  @IsString()
  @IsOptional()
  tactics?: string

  @ApiProperty({ description: '전략', required: false })
  @IsString()
  @IsOptional()
  strategy?: string

  @ApiProperty({ description: '결과', required: false })
  @IsString()
  @IsOptional()
  outcome?: string

  @ApiProperty({ description: '영토 변화', required: false })
  @IsString()
  @IsOptional()
  territoryChanges?: string

  @ApiProperty({ description: '조약', required: false })
  @IsString()
  @IsOptional()
  treaty?: string

  @ApiProperty({ description: '전략적 영향', required: false })
  @IsString()
  @IsOptional()
  strategicImpact?: string
}

// ========================
// Casualties DTO
// ========================

export class CountryCasualtiesDto {
  @ApiProperty({ description: '국가 ID (현대)', required: false })
  @IsString()
  @IsOptional()
  countryId?: string

  @ApiProperty({ description: '역사적 국가 ID', required: false })
  @IsString()
  @IsOptional()
  historicalCountryId?: string

  @ApiProperty({ description: '전사자 수', required: false })
  @IsString()
  @IsOptional()
  killed?: string

  @ApiProperty({ description: '부상자 수', required: false })
  @IsString()
  @IsOptional()
  wounded?: string

  @ApiProperty({ description: '실종자 수', required: false })
  @IsString()
  @IsOptional()
  missing?: string

  @ApiProperty({ description: '포로 수', required: false })
  @IsString()
  @IsOptional()
  captured?: string

  @ApiProperty({ description: '민간인 사망자 수', required: false })
  @IsString()
  @IsOptional()
  civilianDeaths?: string

  @ApiProperty({ description: '총 사상자 수', required: false })
  @IsString()
  @IsOptional()
  total?: string
}

export class CasualtiesDataDto {
  @ApiProperty({ description: '교전 세력 이름', required: false })
  @IsString()
  @IsOptional()
  sideName?: string

  @ApiProperty({ description: '총 전사자 수', required: false })
  @IsString()
  @IsOptional()
  totalKilled?: string

  @ApiProperty({ description: '총 부상자 수', required: false })
  @IsString()
  @IsOptional()
  totalWounded?: string

  @ApiProperty({
    description: '국가별 피해 목록',
    type: [CountryCasualtiesDto],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CountryCasualtiesDto)
  @IsOptional()
  countryCasualties?: CountryCasualtiesDto[]
}

// ========================
// Complete Military Event DTO
// ========================

export class MilitaryEventDto {
  @ApiProperty({
    description: '교전 세력 목록',
    type: [BelligerentSideDto],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BelligerentSideDto)
  @IsOptional()
  belligerentSides?: BelligerentSideDto[]

  @ApiProperty({
    description: '국가 간 관계 목록',
    type: [EventCountryRelationDto],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventCountryRelationDto)
  @IsOptional()
  relations?: EventCountryRelationDto[]

  @ApiProperty({
    description: '군사 상세 정보',
    type: MilitaryDetailsDto,
    required: false,
  })
  @ValidateNested()
  @Type(() => MilitaryDetailsDto)
  @IsOptional()
  militaryDetails?: MilitaryDetailsDto

  @ApiProperty({
    description: '피해 규모 정보',
    type: [CasualtiesDataDto],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CasualtiesDataDto)
  @IsOptional()
  casualties?: CasualtiesDataDto[]

  @ApiProperty({ description: '전쟁 비용', required: false })
  @IsString()
  @IsOptional()
  warCost?: string
}

