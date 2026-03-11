import { TransitionEventType, TransitionScope } from '@prisma/client'

export interface HistoricalCountryTransitionRecord {
  id: string
  predecessorId: string
  successorId: string
  eventType: TransitionEventType
  /** 전환 성격: 국가 교체 vs 정권 교체. null이면 미구분 */
  transitionScope: TransitionScope | null
  /** 후임 국가의 존속 시작 시점 (표시용, 후임 startEra/Year/Month/Day 기반) */
  successorStartDate: string | null
  predecessorName?: string
  successorName?: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateTransitionData {
  predecessorId: string
  successorId: string
  eventType: TransitionEventType
  transitionScope?: TransitionScope | null
}

export interface UpdateTransitionData {
  eventType?: TransitionEventType
  transitionScope?: TransitionScope | null
}

export interface IHistoricalCountryTransitionRepository {
  findManyByHistoricalCountryId(historicalCountryId: string): Promise<HistoricalCountryTransitionRecord[]>
  findManyByHistoricalCountryIds(historicalCountryIds: string[]): Promise<HistoricalCountryTransitionRecord[]>
  findById(id: string): Promise<HistoricalCountryTransitionRecord | null>
  create(data: CreateTransitionData): Promise<HistoricalCountryTransitionRecord>
  update(id: string, data: UpdateTransitionData): Promise<HistoricalCountryTransitionRecord>
  delete(id: string): Promise<void>
}
