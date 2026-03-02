import { HistoricalCountry } from './historical-country.entity'
import { HistoricalStateType, Era, TransitionEventType } from '@prisma/client'

/**
 * 역사적 국가 생성 데이터
 */
export interface CreateHistoricalCountryData {
  name: string
  enName?: string
  nameOrigin?: string
  description?: string
  thumbnailUrl?: string
  startEra?: Era
  startYear?: number
  startMonth?: number
  startDay?: number
  endEra?: Era
  endYear?: number
  endMonth?: number
  endDay?: number
  stateType: HistoricalStateType
  parentModernCountryIds?: string[] // 현대 국가 ID 배열
  /** 상위 역사적 국가 = 후임 (이 국가가 이어간 국가). 예: 고려 → 조선 시 고려가 조선을 상위로 설정 */
  parentHistoricalCountryIds?: string[]
  /** 상위(후임) 설정 시 변천 유형 (날짜는 후임 국가의 존속 시작 시점 참조) */
  transitionEventType?: TransitionEventType
  accountId?: string // 등록 계정 (개인 정보 플랫폼)
}

/**
 * 역사적 국가 수정 데이터
 */
export interface UpdateHistoricalCountryData {
  name?: string
  enName?: string
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
  stateType?: HistoricalStateType
  parentModernCountryIds?: string[] // 현대 국가 ID 배열
  parentHistoricalCountryIds?: string[] // 상위(후임) ID 배열
  transitionEventType?: TransitionEventType
}

/**
 * 역사적 국가 Repository 인터페이스
 */
export interface IHistoricalCountryRepository {
  /**
   * 역사적 국가 목록 조회 (accountId 있으면 해당 계정 소유만)
   */
  findAll(accountId?: string): Promise<HistoricalCountry[]>

  /**
   * ID로 역사적 국가 조회 (accountId 있으면 해당 계정 소유만)
   */
  findById(id: string, accountId?: string): Promise<HistoricalCountry | null>

  /**
   * 역사적 국가에 연결된 현대 국가 ID 목록 조회
   */
  findModernCountryIdsByHistoricalCountryId(id: string): Promise<string[]>

  /**
   * 역사적 국가가 멤버로 소속된 상위 역사적 국가 ID 목록 조회
   */
  findParentHistoricalCountryIdsByMemberId(memberCountryId: string): Promise<string[]>

  /**
   * 이 국가(전임)의 변천 이벤트 유형 조회 (후임 transition 1건 기준)
   */
  findTransitionEventTypeByPredecessorId(predecessorId: string): Promise<TransitionEventType | null>

  /**
   * 역사적 국가 생성 (data.accountId 또는 별도 accountId 사용)
   */
  create(data: CreateHistoricalCountryData): Promise<HistoricalCountry>

  /**
   * 역사적 국가 수정
   */
  update(
    id: string,
    data: UpdateHistoricalCountryData,
  ): Promise<HistoricalCountry>

  /**
   * 역사적 국가 삭제
   */
  delete(id: string): Promise<void>
}
