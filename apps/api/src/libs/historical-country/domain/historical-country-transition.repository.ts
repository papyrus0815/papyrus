import { TransitionEventType } from '@prisma/client'

export interface HistoricalCountryTransitionRecord {
  id: string
  predecessorId: string
  successorId: string
  eventType: TransitionEventType
  eventDate: Date
  predecessorName?: string
  successorName?: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateTransitionData {
  predecessorId: string
  successorId: string
  eventType: TransitionEventType
  eventDate: Date
}

export interface UpdateTransitionData {
  eventType?: TransitionEventType
  eventDate?: Date
}

export interface IHistoricalCountryTransitionRepository {
  findManyByHistoricalCountryId(historicalCountryId: string): Promise<HistoricalCountryTransitionRecord[]>
  findById(id: string): Promise<HistoricalCountryTransitionRecord | null>
  create(data: CreateTransitionData): Promise<HistoricalCountryTransitionRecord>
  update(id: string, data: UpdateTransitionData): Promise<HistoricalCountryTransitionRecord>
  delete(id: string): Promise<void>
}
