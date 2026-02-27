import { TransitionEventType } from '@prisma/client'
import { IsDateString, IsEnum, IsUUID } from 'class-validator'

/**
 * 계승/변천 관계 생성 DTO
 */
export class CreateHistoricalCountryTransitionDto {
  @IsUUID()
  predecessorId!: string

  @IsUUID()
  successorId!: string

  @IsEnum(TransitionEventType)
  eventType!: TransitionEventType

  @IsDateString()
  eventDate!: string
}
