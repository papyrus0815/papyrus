import { TransitionEventType } from '@prisma/client'
import { IsEnum, IsUUID } from 'class-validator'

/**
 * 계승/변천 관계 생성 DTO (날짜는 후임 국가의 존속 시작 시점 참조)
 */
export class CreateHistoricalCountryTransitionDto {
  @IsUUID()
  predecessorId!: string

  @IsUUID()
  successorId!: string

  @IsEnum(TransitionEventType)
  eventType!: TransitionEventType
}
