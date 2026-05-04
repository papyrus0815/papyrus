import { api } from './api'
import type { PersonDetail, PersonListItem } from './dto'

export type EraInput = 'AD' | 'BC'

export type PersonFormData = {
  name: string
  surname?: string | null
  middleName?: string | null
  regnalName?: string | null
  templeName?: string | null
  posthumousName?: string | null
  gender?: 'MALE' | 'FEMALE' | null
  influence?: number | null
  biography?: string | null
  isAlive?: boolean
  isDeathDateUnknown?: boolean
  birth?: { era: EraInput; year: number; month?: number; day?: number } | null
  death?: { era: EraInput; year: number; month?: number; day?: number } | null
  deathType?: string | null
  deathCause?: string | null
  deathNote?: string | null
  countryId?: string | null
  dynastyId?: string | null
}

export async function createPerson(data: PersonFormData): Promise<PersonDetail> {
  const res = await api.post<PersonDetail>('/persons', sanitize(data))
  return res.data
}

export async function updatePerson(id: string, data: PersonFormData): Promise<PersonDetail> {
  const res = await api.put<PersonDetail>(`/persons/${id}`, sanitize(data))
  return res.data
}

export async function deletePerson(id: string): Promise<void> {
  await api.delete(`/persons/${id}`)
}

function sanitize(data: PersonFormData) {
  // null/undefined와 빈 문자열은 보내지 않음 (서버가 미설정으로 처리)
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue
    if (v === '' || (typeof v === 'string' && !v.trim())) continue
    out[k] = v
  }
  return out
}

export async function fetchCountries(): Promise<Array<{ id: string; name: string; flagEmoji?: string | null }>> {
  const res = await api.get<Array<{ id: string; name: string; flagEmoji?: string | null }>>('/countries')
  return Array.isArray(res.data) ? res.data : []
}

export async function fetchDynasties(): Promise<Array<{ id: string; name: string }>> {
  const res = await api.get<Array<{ id: string; name: string }>>('/dynasties')
  return Array.isArray(res.data) ? res.data : []
}

export function personToFormData(p: PersonDetail | PersonListItem): PersonFormData {
  const detail = p as PersonDetail
  return {
    name: p.name,
    surname: p.surname ?? null,
    middleName: detail.middleName ?? null,
    regnalName: detail.regnalName ?? null,
    templeName: detail.templeName ?? null,
    posthumousName: detail.posthumousName ?? null,
    gender: (p.gender ?? null) as 'MALE' | 'FEMALE' | null,
    influence: p.influence ?? null,
    biography: detail.biography ?? null,
    isAlive: p.isAlive ?? false,
    isDeathDateUnknown: p.isDeathDateUnknown ?? false,
    birth: p.birthYear != null
      ? {
          era: (p.birthEra === 'BC' || p.birthEra === 'BCE') ? 'BC' : 'AD',
          year: Math.abs(p.birthYear),
          month: p.birthMonth ?? undefined,
          day: p.birthDay ?? undefined,
        }
      : null,
    death: p.deathYear != null
      ? {
          era: (p.deathEra === 'BC' || p.deathEra === 'BCE') ? 'BC' : 'AD',
          year: Math.abs(p.deathYear),
          month: p.deathMonth ?? undefined,
          day: p.deathDay ?? undefined,
        }
      : null,
    deathType: detail.deathType ?? null,
    deathCause: detail.deathCause ?? null,
    deathNote: detail.deathNote ?? null,
    countryId: p.country?.id ?? null,
    dynastyId: p.dynasty?.id ?? null,
  }
}
