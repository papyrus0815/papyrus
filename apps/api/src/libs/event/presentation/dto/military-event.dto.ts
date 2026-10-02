import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsArray, IsEnum, IsOptional, IsString, ValidateIf, ValidateNested } from 'class-validator'

/**
 * 사건 군사 정보 — **작전 정보(MilitaryDetailsNorm)만** 남았다.
 *
 * 진영·참전국·사상자는 이 DTO에서 빠졌다(D1·D3, docs/event-detail-data-foundation.md):
 * - 진영 = EventSide (PUT /events/:id/sides), 소속 = 참여국 줄의 sideId (relatedCountries)
 * - 병력·사상자 = 측정값 Observation (POST /observations)
 * 예전 저장은 이 묶음 전체를 지우고 다시 만들어, 저장할 때마다 진영 id가 바뀌었다 —
 * 진영에 붙은 측정값이 매번 고아가 되는 구조라 정본으로 쓸 수 없었다.
 */

// ========================
// Enums
// ========================

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
// Military Event DTO
// ========================

export class MilitaryEventDto {
  @ApiProperty({
    description: '작전 정보. null이면 삭제',
    type: MilitaryDetailsDto,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @ValidateNested()
  @Type(() => MilitaryDetailsDto)
  militaryDetails?: MilitaryDetailsDto | null
}
