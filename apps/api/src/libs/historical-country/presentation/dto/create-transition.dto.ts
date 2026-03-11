import { TransitionEventType, TransitionScope } from '@prisma/client'
import { IsEnum, IsOptional, IsUUID } from 'class-validator'

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

  /** 전환 성격: 국가 교체(STATE_SUCCESSION) vs 정권 교체(REGIME_CHANGE). 선택 */
  @IsOptional()
  @IsEnum(TransitionScope)
  transitionScope?: TransitionScope | null
}
