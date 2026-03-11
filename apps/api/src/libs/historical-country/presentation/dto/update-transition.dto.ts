import { TransitionEventType, TransitionScope } from '@prisma/client'
import { IsEnum, IsOptional } from 'class-validator'

/**
 * 계승/변천 관계 수정 DTO (날짜는 후임 국가의 존속 시작 시점 참조)
 */
export class UpdateHistoricalCountryTransitionDto {
  @IsOptional()
  @IsEnum(TransitionEventType)
  eventType?: TransitionEventType

  @IsOptional()
  @IsEnum(TransitionScope)
  transitionScope?: TransitionScope | null
}
