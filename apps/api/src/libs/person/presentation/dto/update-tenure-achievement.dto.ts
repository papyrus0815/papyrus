import { ApiProperty } from '@nestjs/swagger'
import {
  IsString,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsUUID,
  ValidateIf,
} from 'class-validator'

/**
 * 재임 업적·한일 수정 DTO (일부 필드만 보낼 수 있음)
 */
export class UpdateTenureAchievementDto {
  @ApiProperty({ description: '제목', required: false })
  @IsOptional()
  @IsString()
  title?: string

  @ApiProperty({ description: '설명 (null이면 비움)', required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  description?: string | null

  @ApiProperty({ description: '시작일 (ISO, null이면 비움)', required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsDateString()
  startDate?: string | null

  @ApiProperty({ description: '종료일 (ISO, null이면 비움)', required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsDateString()
  endDate?: string | null

  @ApiProperty({ description: '표시 순서', required: false })
  @IsOptional()
  orderNum?: number

  @ApiProperty({ description: '사건 페이지(연대표)에 표시 여부', required: false })
  @IsOptional()
  @IsBoolean()
  showOnEventsPage?: boolean

  @ApiProperty({
    description: '연결된 사건(Event) ID — null로 연결 해제',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsUUID()
  eventId?: string | null
}
