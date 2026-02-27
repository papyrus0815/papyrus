import { HistoricalRelationType } from '@prisma/client'

export interface HistoricalCountryRelationRecord {
  id: string
  subjectCountryId: string
  objectCountryId: string
  relationType: HistoricalRelationType
  startDate: Date | null
  endDate: Date | null
  subjectCountryName?: string
  objectCountryName?: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateRelationData {
  subjectCountryId: string
  objectCountryId: string
  relationType: HistoricalRelationType
  startDate?: Date | null
  endDate?: Date | null
}

export interface UpdateRelationData {
  relationType?: HistoricalRelationType
  startDate?: Date | null
  endDate?: Date | null
}

export interface IHistoricalCountryRelationRepository {
  findManyByHistoricalCountryId(historicalCountryId: string): Promise<HistoricalCountryRelationRecord[]>
  findById(id: string): Promise<HistoricalCountryRelationRecord | null>
  create(data: CreateRelationData): Promise<HistoricalCountryRelationRecord>
  update(id: string, data: UpdateRelationData): Promise<HistoricalCountryRelationRecord>
  delete(id: string): Promise<void>
}
