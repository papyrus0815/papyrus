import * as personsApi from '@api/functional/persons'

import { apiConnection, getApiConnection } from '../client'
import type { PersonResponseDto } from '@/shared/api/persons'

export type Era = 'BC' | 'AD'

export type DeathType =
  | 'NATURAL'
  | 'ILLNESS'
  | 'ASSASSINATION'
  | 'EXECUTION'
  | 'BATTLE'
  | 'ACCIDENT'
  | 'SUICIDE'
  | 'UNKNOWN'
  | 'OTHER'

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
  birthYear?: number | null
  deathEra?: Era | null
  deathDate?: string | null
  deathYear?: number | null
  gender?: string | null
  biography?: string | null
  profileImageUrl?: string | null
  isAlive?: boolean | null
  /** 역사적 영향력 (0–100) */
  influence?: number | null
  /** 사망 유형 */
  deathType?: DeathType | null
  /** 사망 원인 상세 */
  deathCause?: string | null
  /** 사망 관련 메모 */
  deathNote?: string | null
  regnalName?: string | null
  countryId?: string | null
  /** 주 국적이 역사(과거) 국가일 때의 first-class FK (HistoricalCountry PK). 현대면 null. */
  historicalCountryId?: string | null
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
    isoCode?: string | null
    /** 인물 이름 표시 순서 기본값 (국가 설정) */
    defaultNameDisplayOrder?: string | null
    /** 이 국가가 역사(과거) 국가인지 — 상세 배지 라벨·라우팅 분기용 */
    isHistorical?: boolean
    /** 배지 라우팅 대상 현대국가 id (역사국가면 연결 현대국가, 현대면 자기 자신). 연결 없으면 null. */
    modernCountryId?: string | null
    /** 대표 이미지(역사국가) URL */
    thumbnailUrl?: string | null
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
  /** 역사적 영향력 (0–100) */
  influence?: number | null
  profileImageUrl?: string | null
  // 왕/군주 관련 필드
  regnalName?: string | null
  templeName?: string | null
  posthumousName?: string | null
  /** 즉위 전 작호/봉호 (예: 수양대군, 충녕대군) */
  preEnthronementTitle?: string | null
  // 관계
  countryId?: string | null
  /** 주 국적이 역사(과거) 국가일 때의 first-class FK (HistoricalCountry PK). countryId와 상호배타. */
  historicalCountryId?: string | null
  dynastyId?: string | null
  religionId?: string | null
  jobId?: string | null
  fatherId?: string | null
  motherId?: string | null
  /** 사생아·서출 여부 — 가계도 카드 별표(*) 마커 */
  illegitimate?: boolean
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
  /** 사망 유형 */
  deathType?: DeathType | null
  /** 사망 원인 상세 */
  deathCause?: string | null
  /** 사망 관련 메모 */
  deathNote?: string | null
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

  /** 국가 페이지 리스트용: person.countryId 소속 + 해당 국가(·연결 역사국) 재임 + affiliation. GET /persons/by-country/:countryId */
  getByCountryId: async (countryId: string) => {
    const conn = getApiConnection()
    const url = `${apiConnection.host}/persons/by-country/${encodeURIComponent(countryId)}`
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(typeof conn.headers?.Authorization === 'string' && { Authorization: conn.headers.Authorization }),
      },
      credentials: 'include',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return (Array.isArray(data) ? data : data?.data ?? []) as Person[]
  },

  /**
   * 국가 상세 "인물" 탭 — 현대 국가 인물 + 연결된 **과거 국가별** 인물.
   * GET /persons/by-country/:countryId/grouped
   *
   * 평면 목록(getByCountryId)과 인물 집합은 같고, 출처만 나뉜다. 한 인물이 두 축에 걸리면
   * 서버가 역사 그룹에만 남긴다(역사 우선) — '현대' 묶음이 실제 현대 국가 소속만 담게.
   */
  getByCountryIdGrouped: async (countryId: string) => {
    const conn = getApiConnection()
    const url = `${apiConnection.host}/persons/by-country/${encodeURIComponent(countryId)}/grouped`
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(typeof conn.headers?.Authorization === 'string' && {
          Authorization: conn.headers.Authorization,
        }),
      },
      credentials: 'include',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    // 서버가 주는 것은 PersonResponseDto — 이 모듈의 경량 Person으로 좁히면 카드 위젯이
    // 요구하는 필드(생몰 정밀도·직위 등)가 타입에서 사라진다.
    const payload = (data?.data ?? data) as {
      modern?: PersonResponseDto[]
      historical?: Array<{
        historicalCountryId: string
        historicalCountryName: string
        persons: PersonResponseDto[]
      }>
    }
    return {
      modern: payload?.modern ?? [],
      historical: payload?.historical ?? [],
    }
  },

  /** 가문 소속 인물 (dynastyId). GET /persons/by-dynasty/:dynastyId */
  getByDynastyId: async (dynastyId: string) => {
    const conn = getApiConnection()
    const url = `${apiConnection.host}/persons/by-dynasty/${encodeURIComponent(dynastyId)}`
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(typeof conn.headers?.Authorization === 'string' && { Authorization: conn.headers.Authorization }),
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

  // 로컬 Input 타입은 null 허용(클리어 의도) — 서버 DTO와의 차이는 단언으로 통과 (SDK 재생성 시 재검토)
  create: async (data: CreatePersonInput) => {
    return await personsApi.create(
      getApiConnection(),
      data as Parameters<typeof personsApi.create>[1],
    )
  },

  update: async (id: string, data: UpdatePersonInput) => {
    return await personsApi.update(
      getApiConnection(),
      id,
      data as Parameters<typeof personsApi.update>[2],
    )
  },

  delete: async (id: string) => {
    await personsApi._delete(getApiConnection(), id)
  },
}
