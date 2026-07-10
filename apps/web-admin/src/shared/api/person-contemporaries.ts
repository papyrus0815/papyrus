/**
 * 인물 동시대 수장 API (GET /persons/:id/contemporaries) 래퍼.
 *
 * "인물 X의 재위·재임 기간에 누가 통치했는가"의 발견(discovery) 계약 —
 * /person-records/compare(personIds 필수, enrichment 전용)와 직교한다.
 * 연도는 전부 부호 연도(signed year, BC 음수), fromYear 포함·toYear 배타.
 * 창을 생략하면 서버가 대상의 수장급 재위 구간에서 유도한다(meta.derivedFromSubject).
 *
 * 캐시 무효화는 `personContemporariesKeys.all`(['person-contemporaries']) prefix로 —
 * invalidateTenureQueries에 등록돼 재임/재위/업적 mutation 후 자동 신선화된다.
 */
import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
  /** JWT 쿠키(access_token) 전달 — 클래스 가드 통과에 필요 */
  withCredentials: true,
})

export type ContemporaryRecordKind = 'TENURE' | 'SOVEREIGN_REIGN'

export interface ContemporaryRecord {
  recordId: string
  recordKind: ContemporaryRecordKind
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
  country: { id: string; name: string; flagEmoji: string | null } | null
  historicalCountry: { id: string; name: string } | null
}

export interface ContemporaryRulerPerson {
  id: string
  name: string | null
  surname: string | null
  middleName: string | null
  nameDisplayOrder: string | null
  /** 주 국적의 이름 순서 기본값 — 개인 오버라이드 없을 때 서양식(이름·성) 폴백 */
  country: { defaultNameDisplayOrder: string | null } | null
  profileImageUrl: string | null
  templeName: string | null
  regnalName: string | null
  isAlive: boolean
  deathYear: number | null
  /** 요청 계정 소유 인물인지 — false면 상세(:id)가 소유자 게이트라 열 수 없음(칩 비활성) */
  isOwned: boolean
}

export interface ContemporaryRuler {
  person: ContemporaryRulerPerson
  /** startYear 오름차순 */
  records: ContemporaryRecord[]
  overlapYears: number
}

export interface PersonContemporariesResponse {
  meta: {
    window: { fromYear: number; toYear: number }
    derivedFromSubject: boolean
    scope: 'all' | 'sameCountry'
    totalPersons: number
    /** 0이 아니면 무성 절단 방지 캡션 필수 */
    omittedCount: number
  }
  rulers: ContemporaryRuler[]
}

export interface GetPersonContemporariesParams {
  /** 부호 연도, 포함 — toYear와 함께 지정하거나 함께 생략(서버 유도) */
  fromYear?: number | null
  /** 부호 연도, 배타 */
  toYear?: number | null
  scope?: 'all' | 'sameCountry'
  limit?: number
}

export async function getPersonContemporaries(
  personId: string,
  params: GetPersonContemporariesParams = {},
): Promise<PersonContemporariesResponse> {
  const query = new URLSearchParams()
  if (params.fromYear != null) query.set('fromYear', String(params.fromYear))
  if (params.toYear != null) query.set('toYear', String(params.toYear))
  if (params.scope) query.set('scope', params.scope)
  if (params.limit != null) query.set('limit', String(params.limit))
  const queryString = query.toString()
  const response = await apiClient.get(
    `/persons/${encodeURIComponent(personId)}/contemporaries${
      queryString ? `?${queryString}` : ''
    }`,
  )
  return response.data as PersonContemporariesResponse
}

/** react-query 키 — 무효화는 `all` prefix 하나로 (invalidateTenureQueries 등록됨) */
export const personContemporariesKeys = {
  all: ['person-contemporaries'] as const,
  byPerson: (personId: string, params: GetPersonContemporariesParams = {}) =>
    [
      'person-contemporaries',
      personId,
      params.fromYear ?? null,
      params.toYear ?? null,
      params.scope ?? 'all',
      params.limit ?? null,
    ] as const,
}
