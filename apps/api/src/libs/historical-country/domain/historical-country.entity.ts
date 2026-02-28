import { HistoricalStateType, Era } from '@prisma/client'

/**
 * 역사적 국가 엔티티
 * 과거에 존재했던 국가들의 정보를 표현합니다.
 */
export class HistoricalCountry {
  id: string
  name: string
  enName: string
  nameOrigin: string | null
  description: string | null
  thumbnailUrl: string | null

  // 존속 시작 정보
  startEra: Era | null
  startYear: number | null
  startMonth: number | null
  startDay: number | null

  // 존속 종료 정보
  endEra: Era | null
  endYear: number | null
  endMonth: number | null
  endDay: number | null

  stateType: HistoricalStateType
  createdAt: Date
  updatedAt: Date

  constructor(data: {
    id: string
    name: string
    enName: string
    nameOrigin?: string | null
    description?: string | null
    thumbnailUrl?: string | null
    startEra?: Era | null
    startYear?: number | null
    startMonth?: number | null
    startDay?: number | null
    endEra?: Era | null
    endYear?: number | null
    endMonth?: number | null
    endDay?: number | null
    stateType: HistoricalStateType
    createdAt: Date
    updatedAt: Date
  }) {
    this.id = data.id
    this.name = data.name
    this.enName = data.enName
    this.nameOrigin = data.nameOrigin ?? null
    this.description = data.description ?? null
    this.thumbnailUrl = data.thumbnailUrl ?? null
    this.startEra = data.startEra ?? null
    this.startYear = data.startYear ?? null
    this.startMonth = data.startMonth ?? null
    this.startDay = data.startDay ?? null
    this.endEra = data.endEra ?? null
    this.endYear = data.endYear ?? null
    this.endMonth = data.endMonth ?? null
    this.endDay = data.endDay ?? null
    this.stateType = data.stateType
    this.createdAt = data.createdAt
    this.updatedAt = data.updatedAt
  }
}
