import { TransitionEventType } from '@prisma/client'
import { IsDateString, IsEnum, IsOptional } from 'class-validator'

/**
 * 계승/변천 관계 수정 DTO
 */
export class UpdateHistoricalCountryTransitionDto {
  @IsOptional()
  @IsEnum(TransitionEventType)
  eventType?: TransitionEventType

  @IsOptional()
  @IsDateString()
  eventDate?: string
}
