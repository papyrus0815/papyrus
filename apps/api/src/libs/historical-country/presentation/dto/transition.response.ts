import { TransitionEventType, TransitionScope } from '@prisma/client'

/**
 * 계승/변천 관계 응답 DTO
 */
export interface HistoricalCountryTransitionResponseDto {
  id: string
  predecessorId: string
  successorId: string
  eventType: TransitionEventType
  /** 전환 성격: 국가 교체 vs 정권 교체. null이면 미구분 */
  transitionScope: TransitionScope | null
  /** 후임 국가의 존속 시작 시점 (표시용) */
  successorStartDate: string | null

  /** 전임 국가 이름 (선택 표시용) */
  predecessorName?: string
  /** 후임 국가 이름 (선택 표시용) */
  successorName?: string

  createdAt: string
  updatedAt: string
}
