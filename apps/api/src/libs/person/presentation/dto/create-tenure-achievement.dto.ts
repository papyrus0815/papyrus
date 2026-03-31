import { ApiProperty } from '@nestjs/swagger'
import {
  IsString,
  IsOptional,
  IsDateString,
  IsNotEmpty,
  IsBoolean,
  IsUUID,
} from 'class-validator'

/**
 * 재임 업적·한일 생성 DTO (사건과 별도 개념)
 */
export class CreateTenureAchievementDto {
  @ApiProperty({ description: '제목', example: '한글 창제' })
  @IsString()
  @IsNotEmpty()
  title!: string

  @ApiProperty({ description: '설명', required: false })
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty({ description: '시작일 (ISO)', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string

  @ApiProperty({ description: '종료일 (ISO)', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string

  @ApiProperty({ description: '표시 순서', required: false })
  @IsOptional()
  orderNum?: number

  @ApiProperty({ description: '사건 페이지(연대표)에 표시 여부', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  showOnEventsPage?: boolean

  @ApiProperty({
    description: '연결된 사건(Event) ID — 정본 서술·다국가 공유 시 사용',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  eventId?: string
}
