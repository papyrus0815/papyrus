import * as personsApi from '@api/functional/persons'

import { getApiConnection } from '../client'
import { getPersonsByTenureCountry } from '../persons'

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
  // 관계
  countryId?: string | null
  dynastyId?: string | null
  religionId?: string | null
  jobId?: string | null
  fatherId?: string | null
  motherId?: string | null
  /** 출생지 도시 ID (등록된 도시/행정구역에서 선택) */
  birthCityId?: string | null
  /** 사망지 도시 ID */
  deathCityId?: string | null
  /** 이름 원어 (Original Name) */
  originalName?: string | null
  /** 성의 뜻 */
  surnameMeaning?: string | null
  /** 이름의 뜻 */
  nameMeaning?: string | null
  /** 중간이름의 뜻 */
  middleNameMeaning?: string | null
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

  getByCountryId: async (countryId: string) => {
    const [byBirthCountry, byTenure] = await Promise.all([
      (async () => {
        const allPersons = await personApi.getAll()
        return allPersons.filter(
          (p: Person & { country_id?: string }) =>
            (p.countryId ?? p.country_id) === countryId,
        )
      })(),
      getPersonsByTenureCountry({ countryId }).catch(() => []),
    ])
    const byId = new Map<string, Person>()
    for (const p of byBirthCountry) byId.set(p.id, p)
    for (const p of byTenure) if (!byId.has(p.id)) byId.set(p.id, p as Person)
    return Array.from(byId.values())
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
