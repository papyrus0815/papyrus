import * as personsApi from '@api/functional/persons'

import { apiConnection, getApiConnection } from '../client'

export type Era = 'BC' | 'AD'

export type Person = {
  id: string
  name: string
  surname?: string | null
  middleName?: string | null
  /** 이름 표시 순서: korean(성+이름), western(이름+성). null이면 성+이름 */
  nameDisplayOrder?: string | null
  /** 이름 원어 (Original Name) */
  originalName?: string | null
  /** 성의 뜻 */
  surnameMeaning?: string | null
  /** 이름의 뜻 */
  nameMeaning?: string | null
  /** 중간이름의 뜻 */
  middleNameMeaning?: string | null
  birthEra?: Era | null
  birthDate?: string | null
  deathEra?: Era | null
  deathDate?: string | null
  gender?: string | null
  biography?: string | null
  profileImageUrl?: string | null
  countryId?: string | null
  birthCityId?: string | null
  deathCityId?: string | null
  /** 출생지 행정구역 ID */
  birthAdminDivisionId?: string | null
  /** 사망지 행정구역 ID */
  deathAdminDivisionId?: string | null
  /** 출생지 직접 입력 텍스트 */
  birthPlaceText?: string | null
  /** 사망지 직접 입력 텍스트 */
  deathPlaceText?: string | null
  createdAt: string
  updatedAt: string
  country?: {
    id: string
    name: string
    flagEmoji?: string | null
  } | null
  /** 가문 (목록/재임 응답에서 포함될 수 있음) */
  dynasty?: { id: string; name: string } | null
  birthCity?: { id: string; name: string; countryId: string } | null
  deathCity?: { id: string; name: string; countryId: string } | null
  birthAdminDivision?: { id: string; name: string } | null
  deathAdminDivision?: { id: string; name: string } | null
}

export type DateInfo = {
  era: Era
  year: number
  month?: number
  day?: number
}

export type CreatePersonInput = {
  name: string
  surname?: string | null
  middleName?: string | null
  /** 이름 표시 순서: korean(성+이름), western(이름+성) */
  nameDisplayOrder?: 'korean' | 'western' | null
  birthEra?: Era | null
  birthDate?: string | null
  deathEra?: Era | null
  deathDate?: string | null
  gender?: string | null
  biography?: string | null
  profileImageUrl?: string | null
  // 왕/군주 관련 필드
  regnalName?: string | null
  templeName?: string | null
  posthumousName?: string | null
  /** 즉위 전 작호/봉호 (예: 수양대군, 충녕대군) */
  preEnthronementTitle?: string | null
  // 관계
  countryId?: string | null
  dynastyId?: string | null
  religionId?: string | null
  jobId?: string | null
  fatherId?: string | null
  motherId?: string | null
  /** 출생지 도시 ID (등록된 도시) */
  birthCityId?: string | null
  /** 사망지 도시 ID */
  deathCityId?: string | null
  /** 출생지 행정구역 ID */
  birthAdminDivisionId?: string | null
  /** 사망지 행정구역 ID */
  deathAdminDivisionId?: string | null
  /** 출생지 직접 입력 텍스트 */
  birthPlaceText?: string | null
  /** 사망지 직접 입력 텍스트 */
  deathPlaceText?: string | null
  /** 이름 원어 (Original Name) */
  originalName?: string | null
  /** 성의 뜻 */
  surnameMeaning?: string | null
  /** 이름의 뜻 */
  nameMeaning?: string | null
  /** 중간이름의 뜻 */
  middleNameMeaning?: string | null
  /** 배우자 관계 목록 (선택) */
  spouseRelations?: Array<{
    spouseId: string
    marriageStartDate?: string
    marriageEndDate?: string
    note?: string
  }>
  // 날짜 객체 형식
  birth?: DateInfo
  death?: DateInfo
}

export type UpdatePersonInput = Partial<CreatePersonInput>

export const personApi = {
  getAll: async () => {
    const result = await personsApi.getAll(getApiConnection())
    if (result && typeof result === 'object' && 'data' in result) {
      return Array.isArray((result as any).data) ? (result as any).data : []
    }
    return Array.isArray(result) ? result : []
  },

  /** 국가별 인물 전체 (countryId 소속 + 해당 국가 재임 인물). GET /persons/by-country/:countryId */
  getByCountryId: async (countryId: string) => {
    const conn = getApiConnection()
    const url = `${apiConnection.host}/persons/by-country/${encodeURIComponent(countryId)}`
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(conn.headers?.Authorization && { Authorization: conn.headers.Authorization }),
      },
      credentials: 'include',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return (Array.isArray(data) ? data : data?.data ?? []) as Person[]
  },

  getById: async (id: string) => {
    const result = await personsApi.getById(getApiConnection(), id)
    // 인터셉터 등으로 { data } 래핑된 경우 실제 인물 객체 반환
    return (result as any)?.data ?? result
  },

  create: async (data: CreatePersonInput) => {
    return await personsApi.create(getApiConnection(), data)
  },

  update: async (id: string, data: UpdatePersonInput) => {
    return await personsApi.update(getApiConnection(), id, data)
  },

  delete: async (id: string) => {
    await personsApi._delete(getApiConnection(), id)
  },
}
