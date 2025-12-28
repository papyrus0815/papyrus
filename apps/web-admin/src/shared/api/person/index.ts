import * as personsApi from '@api/functional/persons'
import { apiConnection } from '../client'

export type Era = 'BC' | 'AD'

export type Person = {
  id: string
  name: string
  surname?: string | null
  birthEra?: Era | null
  birthDate?: string | null
  deathEra?: Era | null
  deathDate?: string | null
  gender?: string | null
  biography?: string | null
  profileImageUrl?: string | null
  countryId?: string | null
  createdAt: string
  updatedAt: string
  country?: {
    id: string
    name: string
    flagEmoji?: string | null
  } | null
}

export type CreatePersonInput = {
  name: string
  surname?: string | null
  birthEra?: Era | null
  birthDate?: string | null
  deathEra?: Era | null
  deathDate?: string | null
  gender?: string | null
  biography?: string | null
  profileImageUrl?: string | null
  countryId?: string | null
}

export type UpdatePersonInput = Partial<CreatePersonInput>

export const personApi = {
  getAll: async () => {
    const result = await personsApi.getAll(apiConnection)
    if (result && typeof result === 'object' && 'data' in result) {
      return Array.isArray((result as any).data) ? (result as any).data : []
    }
    return Array.isArray(result) ? result : []
  },

  getByCountryId: async (countryId: string) => {
    const allPersons = await personApi.getAll()
    return allPersons.filter((p: Person) => p.countryId === countryId)
  },

  getById: async (id: string) => {
    return await personsApi.getById(apiConnection, id)
  },

  create: async (data: CreatePersonInput) => {
    return await personsApi.create(apiConnection, data)
  },

  update: async (id: string, data: UpdatePersonInput) => {
    return await personsApi.update(apiConnection, id, data)
  },

  delete: async (id: string) => {
    await personsApi.$delete(apiConnection, id)
  },
}
