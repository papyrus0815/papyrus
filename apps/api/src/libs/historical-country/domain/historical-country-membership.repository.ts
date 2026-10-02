import { HistoricalMembershipRole } from '@prisma/client'

import type { StructuredPoint } from '../../shared/structured-point'

export interface HistoricalCountryMembershipRecord {
  id: string
  historicalCountryId: string
  memberCountryId: string
  role: HistoricalMembershipRole
  isLeadingMember: boolean | null
  /** 소속 시작·종료 — 구조화 칸이 진실(BC·서기 1~999·연 정밀도 안전) */
  start: StructuredPoint | null
  end: StructuredPoint | null
  /** 하위 호환 사본 — AD 1000+ 완전 날짜일 때만 값이 있다 */
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
  isLeadingMember?: boolean | null
  start?: StructuredPoint | null
  end?: StructuredPoint | null
}

/** 3상 — undefined=유지, null=비움 */
export interface UpdateMembershipData {
  role?: HistoricalMembershipRole
  isLeadingMember?: boolean | null
  start?: StructuredPoint | null
  end?: StructuredPoint | null
}

export interface IHistoricalCountryMembershipRepository {
  findManyByHistoricalCountryId(historicalCountryId: string): Promise<HistoricalCountryMembershipRecord[]>
  findManyByHistoricalCountryIds(historicalCountryIds: string[]): Promise<HistoricalCountryMembershipRecord[]>
  findManyByMemberCountryId(memberCountryId: string): Promise<HistoricalCountryMembershipRecord[]>
  findById(id: string): Promise<HistoricalCountryMembershipRecord | null>
  create(data: CreateMembershipData): Promise<HistoricalCountryMembershipRecord>
  update(id: string, data: UpdateMembershipData): Promise<HistoricalCountryMembershipRecord>
  delete(id: string): Promise<void>
}
