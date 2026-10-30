import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator'

/** 진영 한 줄 — id가 있으면 기존 진영(이름·순서 변경), 없으면 새 진영 */
export class EventSideInputDto {
  @ApiProperty({ required: false, description: '기존 진영 id' })
  @IsOptional()
  @IsString()
  id?: string

  @ApiProperty({ description: '진영명 — 로마 측, 연합군, 협상 대표단 등' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string

  @ApiProperty({ required: false, nullable: true, enum: ['COALITION', 'COUNTRY', 'FORCE'] })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsIn(['COALITION', 'COUNTRY', 'FORCE'])
  level?: 'COALITION' | 'COUNTRY' | 'FORCE' | null

  @ApiProperty({ required: false, nullable: true, description: '#rrggbb' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Matches(/^#[0-9a-fA-F]{6}$/)
  color?: string | null

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  description?: string | null

  @ApiProperty({ required: false, nullable: true, description: '상위 진영 id (상위 사건의 진영)' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  parentSideId?: string | null

  @ApiProperty({
    required: false,
    nullable: true,
    enum: ['VICTORY', 'DEFEAT', 'DRAW', 'WITHDRAWAL', 'INCONCLUSIVE'],
    description: '이 진영에게의 결과',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsIn(['VICTORY', 'DEFEAT', 'DRAW', 'WITHDRAWAL', 'INCONCLUSIVE'])
  outcome?: 'VICTORY' | 'DEFEAT' | 'DRAW' | 'WITHDRAWAL' | 'INCONCLUSIVE' | null

  @ApiProperty({ required: false, nullable: true, description: "결과 단서 — '전략적 승리, 전술적 패배'" })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(1000)
  outcomeNote?: string | null
}

/** 진영 목록 동기화 — 배열 순서가 표시 순서. 빠진 진영은 지워지고 소속만 풀린다 */
export class SyncEventSidesDto {
  @ApiProperty({ type: [EventSideInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventSideInputDto)
  sides!: EventSideInputDto[]
}
