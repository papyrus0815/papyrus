import { HistoricalStateType, Era } from '@prisma/client'

/**
 * 역사적 국가 응답 DTO
 */
export interface HistoricalCountryResponseDto {
  id: string
  name: string
  enName: string | null
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
  /** 연결된 현대 국가 ID 목록 (상위 현대 국가) */
  parentModernCountryIds?: string[]
  createdAt: string
  updatedAt: string
}
