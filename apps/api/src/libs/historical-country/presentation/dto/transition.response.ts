import { TransitionEventType } from '@prisma/client'

/**
 * 계승/변천 관계 응답 DTO
 */
export interface HistoricalCountryTransitionResponseDto {
  id: string
  predecessorId: string
  successorId: string
  eventType: TransitionEventType
  eventDate: string

  /** 전임 국가 이름 (선택 표시용) */
  predecessorName?: string
  /** 후임 국가 이름 (선택 표시용) */
  successorName?: string

  createdAt: string
  updatedAt: string
}
