/**
 * 인물 「같은 국가 전/후 재위(승계)」 API (GET /persons/:id/reign-adjacency) 래퍼.
 *
 * "인물 X의 이 재위 **바로 앞뒤(같은 국가)** 에 누가 통치했는가"의 발견(discovery) 계약 —
 * 「동시대 수장」(/persons/:id/contemporaries, 시간 겹침)과 직교한다(이쪽은 시간축 인접).
 * 대상의 수장급 재임·재위 record별로 선대/후대를 한 번에 반환한다(인물당 쿼리 1회).
 *
 * 캐시 무효화는 `personReignAdjacencyKeys.all`(['person-reign-adjacency']) prefix로 —
 * invalidateTenureQueries에 등록돼 재임/재위/업적 mutation 후 자동 신선화된다.
 */
import axios from 'axios'

import type { ContemporaryRulerPerson } from './person-contemporaries'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
  /** JWT 쿠키(access_token) 전달 — 클래스 가드 통과에 필요 */
  withCredentials: true,
})

export type AdjacencyRelation = 'PREDECESSOR' | 'SUCCESSOR'
export type AdjacencyRecordKind = 'TENURE' | 'SOVEREIGN_REIGN'

/** contemporaries record 형태 + adjacency 전용 정밀도 필드 */
export interface AdjacencyRecord {
  recordId: string
  recordKind: AdjacencyRecordKind
  /** SOVEREIGN_REIGN은 전량 HEAD_OF_STATE (서버 관례) */
  positionType: string
  title: string | null
  appointmentMethod: string | null
  regnalName: string | null
  regnalNumber: number | null
  termNumber: number | null
  /** 부호 연도 */
  startYear: number
  /** null = 종료일 미기록 (재위 중/미입력은 person.isAlive로 판단) */
  endYear: number | null
  startDate: string
  endDate: string | null
  /** 'year'면 월·일 01-01 관행 채움 — 같은 해 순서 모호 인지 */
  startDatePrecision: string | null
  country: { id: string; name: string; flagEmoji: string | null } | null
  historicalCountry: { id: string; name: string } | null
}

export interface AdjacencyNeighbor {
  relation: AdjacencyRelation
  /** isOwned 포함 — false면 상세(:id)가 소유자 게이트라 열 수 없음(칩 비활성) */
  person: ContemporaryRulerPerson
  record: AdjacencyRecord
  /** 이웃 재위가 앵커와 기간 겹침(공동·중첩·대립왕) — 순수 승계 아님 */
  overlapsAnchor: boolean
  /** 같은 경계(연 단위 모호 포함)를 공유하는 공동 이웃이 함께 있음 */
  coBoundary: boolean
  /** 대상 본인의 다른 재위 단계(복위·공동→단독) — 프론트는 딥링크 비활성 */
  isSelf: boolean
}

export interface ReignAdjacencyEntry {
  /** 대상 인물의 이 재위 record — 카드가 이 id로 조인 */
  subjectRecordId: string
  subjectRecordKind: AdjacencyRecordKind
  scope: {
    countryId: string | null
    historicalCountryId: string | null
    degradedToStrict: boolean
  }
  /** 선대 — 가까운 것 먼저(startDate 내림차순). 동률(공동군주)은 배열 */
  predecessors: AdjacencyNeighbor[]
  /** 후대 — 가까운 것 먼저(startDate 오름차순) */
  successors: AdjacencyNeighbor[]
  /** 0이 아니면 무성 절단 방지 캡션 필수 */
  omittedCoBoundaryCount: number
}

export interface PersonReignAdjacencyResponse {
  meta: {
    scope: 'instance' | 'succession'
    totalSubjectRecords: number
    /** BC(연도<1)라 계산 생략한 앵커 수 */
    bcSkippedCount: number
    /** 국가 정보 없어(교황 등) 스코프 못 잡은 앵커 수 */
    noCountryCount: number
  }
  entries: ReignAdjacencyEntry[]
}

export interface GetPersonReignAdjacencyParams {
  /** 'instance'(정확 국가만, 기본) | 'succession'(전이 그래프 확장 — B4) */
  scope?: 'instance' | 'succession'
}

export async function getPersonReignAdjacency(
  personId: string,
  params: GetPersonReignAdjacencyParams = {},
): Promise<PersonReignAdjacencyResponse> {
  const query = new URLSearchParams()
  if (params.scope) query.set('scope', params.scope)
  const queryString = query.toString()
  const response = await apiClient.get(
    `/persons/${encodeURIComponent(personId)}/reign-adjacency${
      queryString ? `?${queryString}` : ''
    }`,
  )
  return response.data as PersonReignAdjacencyResponse
}

/** react-query 키 — 무효화는 `all` prefix 하나로 (invalidateTenureQueries 등록됨) */
export const personReignAdjacencyKeys = {
  all: ['person-reign-adjacency'] as const,
  byPerson: (personId: string, params: GetPersonReignAdjacencyParams = {}) =>
    ['person-reign-adjacency', personId, params.scope ?? 'instance'] as const,
}
