import { apiConnection } from '../client'

export type PoliticalPosition =
  | 'FAR_LEFT'
  | 'LEFT'
  | 'CENTER_LEFT'
  | 'CENTER'
  | 'CENTER_RIGHT'
  | 'RIGHT'
  | 'FAR_RIGHT'

export type PoliticalParty = {
  id: string
  name: string
  shortName?: string | null
  localName?: string | null
  ideology?: string | null
  position?: PoliticalPosition | null
  color?: string | null
  description?: string | null
  foundedDate?: string | null
  dissolvedDate?: string | null
  websiteUrl?: string | null
  logoUrl?: string | null
  countryId?: string | null
  createdAt: string
  updatedAt: string
}

export type CreatePoliticalPartyInput = {
  name: string
  shortName?: string | null
  localName?: string | null
  ideology?: string | null
  position?: PoliticalPosition | null
  color?: string | null
  description?: string | null
  foundedDate?: string | null
  dissolvedDate?: string | null
  websiteUrl?: string | null
  logoUrl?: string | null
  countryId?: string | null
}

export type UpdatePoliticalPartyInput = Partial<CreatePoliticalPartyInput>

// API 엔드포인트가 없으므로 임시로 빈 배열 반환
export const politicalPartyApi = {
  getAll: async () => {
    return []
  },

  getByCountryId: async (countryId: string) => {
    return []
  },

  getById: async (id: string) => {
    return null
  },

  create: async (_data: CreatePoliticalPartyInput) => {
    return null
  },

  update: async (_id: string, _data: UpdatePoliticalPartyInput) => {
    return null
  },

  delete: async (_id: string) => {},
}
