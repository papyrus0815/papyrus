import { HistoricalMembershipRole } from '@prisma/client'

export interface HistoricalCountryMembershipRecord {
  id: string
  historicalCountryId: string
  memberCountryId: string
  role: HistoricalMembershipRole
  membershipStartDate: Date | null
  membershipEndDate: Date | null
  parentName?: string
  memberName?: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateMembershipData {
  historicalCountryId: string
  memberCountryId: string
  role: HistoricalMembershipRole
  membershipStartDate?: Date | null
  membershipEndDate?: Date | null
}

export interface UpdateMembershipData {
  role?: HistoricalMembershipRole
  membershipStartDate?: Date | null
  membershipEndDate?: Date | null
}

export interface IHistoricalCountryMembershipRepository {
  findManyByHistoricalCountryId(historicalCountryId: string): Promise<HistoricalCountryMembershipRecord[]>
  findManyByMemberCountryId(memberCountryId: string): Promise<HistoricalCountryMembershipRecord[]>
  findById(id: string): Promise<HistoricalCountryMembershipRecord | null>
  create(data: CreateMembershipData): Promise<HistoricalCountryMembershipRecord>
  update(id: string, data: UpdateMembershipData): Promise<HistoricalCountryMembershipRecord>
  delete(id: string): Promise<void>
}
