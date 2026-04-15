import { HistoricalStateType, Era, TransitionEventType, HistoricalEntityKind } from '@prisma/client'

/**
 * 역사적 국가 응답 DTO
 */
export interface HistoricalCountryResponseDto {
  id: string
  name: string
  enName: string | null
  nameOrigin: string | null
  description: string | null
  history: string | null
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
  /** 정치체 성격: 주권 국가 / 정권 / 시대. null이면 과거 주권 국가로 간주 */
  entityKind: HistoricalEntityKind | null
  /** 연결된 현대 국가 ID 목록 (상위 현대 국가) */
  parentModernCountryIds?: string[]
  parentHistoricalCountryIds?: string[]
  /** 후임 국가 연결 시 변천 유형 (상세 조회 시 채움) */
  transitionEventType?: TransitionEventType
  createdAt: string
  updatedAt: string
}
