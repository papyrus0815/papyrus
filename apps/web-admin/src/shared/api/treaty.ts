import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

// ──────────────────────────────────────────────
// 타입 정의
// ──────────────────────────────────────────────

export type TreatyType =
  | 'NON_AGGRESSION'
  | 'ALLIANCE'
  | 'TRADE'
  | 'TERRITORIAL'
  | 'PEACE'
  | 'FRIENDSHIP'
  | 'DISARMAMENT'
  | 'BORDER'
  | 'SECRET'
  | 'MULTILATERAL'
  | 'OTHER'

export const TREATY_TYPE_LABELS: Record<TreatyType, string> = {
  NON_AGGRESSION: '불가침 조약',
  ALLIANCE: '동맹 조약',
  TRADE: '무역 협정',
  TERRITORIAL: '영토 협정',
  PEACE: '평화 조약',
  FRIENDSHIP: '우호 협력 조약',
  DISARMAMENT: '군축 조약',
  BORDER: '국경 조약',
  SECRET: '비밀 조약',
  MULTILATERAL: '다자 조약',
  OTHER: '기타',
}

export type TreatyParticipationType =
  | 'SIGNATORY'
  | 'GUARANTOR'
  | 'MEDIATOR'
  | 'RATIFIER'
  | 'OBSERVER'

export const TREATY_PARTICIPATION_LABELS: Record<TreatyParticipationType, string> = {
  SIGNATORY: '서명국',
  GUARANTOR: '보증국',
  MEDIATOR: '조정국',
  RATIFIER: '비준국',
  OBSERVER: '관찰국',
}

export interface TreatyImageDto {
  id: string
  treatyId: string
  imageUrl: string
  caption: string | null
  source: string | null
  order: number
  isPrimary: boolean
  createdAt: string
  updatedAt: string
}

export interface TreatyTermDto {
  id: string
  treatyId: string
  order: number
  title: string | null
  content: string
  isSecret: boolean
  createdAt: string
  updatedAt: string
}

export interface TreatySignatoryDto {
  id: string
  treatyId: string
  countryId: string | null
  country: { id: string; name: string; flagEmoji: string | null; thumbnailUrl: string | null } | null
  historicalCountryId: string | null
  historicalCountry: { id: string; name: string; thumbnailUrl: string | null } | null
  personId: string | null
  person: { id: string; name: string | null; surname: string | null; profileImageUrl: string | null } | null
  cabinetId: string | null
  cabinet: {
    id: string
    name: string | null
    headTenure: {
      termNumber: number | null
      subTermNumber: number | null
      regnalNumber?: number | null
      person: { id: string; name: string | null; surname: string | null } | null
    } | null
  } | null
  role: string | null
  positionDefinitionId?: string | null
  positionDefinition?: {
    id: string
    title: string
    positionType: string
    titleEn?: string | null
  } | null
  participationType: TreatyParticipationType
  signedAt: string | null
  note: string | null
  createdAt: string
  updatedAt: string
}

export interface TreatyDto {
  id: string
  name: string
  alias: string | null
  type: TreatyType
  signDate: string
  effectiveDate: string | null
  expiryDate: string | null
  violationDate: string | null
  violationReason: string | null
  location: string | null
  signingAdministrativeDivisionId: string | null
  signingAdministrativeDivision: {
    id: string
    name: string
    localName: string | null
  } | null
  summary: string | null
  background: string | null
  aftermath: string | null
  accountId: string | null
  signatories: TreatySignatoryDto[]
  terms: TreatyTermDto[]
  images: TreatyImageDto[]
  createdAt: string
  updatedAt: string
}

/** GET /treaties 응답 (페이지네이션) */
export interface TreatyListResponse {
  items: TreatyDto[]
  total: number
}

export type CreateTreatySignatoryDto = {
  treatyId: string
  countryId?: string | null
  historicalCountryId?: string | null
  personId?: string | null
  cabinetId?: string | null
  role?: string | null
  positionDefinitionId?: string | null
  participationType?: TreatyParticipationType
  signedAt?: string | null
  note?: string | null
}

/** 서명국 입력 (조약 생성 시 treatyId 없음) */
export type CreateTreatySignatoryNested = Omit<CreateTreatySignatoryDto, 'treatyId'>

export interface CreateTreatyDto {
  name: string
  alias?: string | null
  type: TreatyType
  signDate: string
  effectiveDate?: string | null
  expiryDate?: string | null
  violationDate?: string | null
  violationReason?: string | null
  location?: string | null
  signingAdministrativeDivisionId?: string | null
  summary?: string | null
  background?: string | null
  aftermath?: string | null
  /** 있으면 서버에서 조약 + 서명국을 한 트랜잭션으로 생성 */
  signatories?: CreateTreatySignatoryNested[]
  /** 동일 조약명+서명일(일 단위) 중복 검사를 건너뜀 */
  allowDuplicateSignDate?: boolean
}

export interface CreateTreatyTermDto {
  treatyId: string
  order?: number
  title?: string | null
  content: string
  isSecret?: boolean
}

export interface AddTreatyImageDto {
  treatyId: string
  imageUrl: string
  caption?: string | null
  source?: string | null
  order?: number
  isPrimary?: boolean
}

function normalizeTreatyListResponse(data: unknown): TreatyListResponse {
  if (Array.isArray(data)) {
    return { items: data as TreatyDto[], total: data.length }
  }
  if (data && typeof data === 'object' && 'items' in data) {
    const o = data as { items?: TreatyDto[]; total?: number }
    return {
      items: o.items ?? [],
      total: o.total ?? o.items?.length ?? 0,
    }
  }
  return { items: [], total: 0 }
}

// ──────────────────────────────────────────────
// API 클라이언트
// ──────────────────────────────────────────────

export const treatyApi = {
  /** 조약 목록 조회 (items + total) */
  getAll: async (params?: {
    countryId?: string
    historicalCountryId?: string
    cabinetId?: string
    type?: TreatyType
    search?: string
    skip?: number
    take?: number
  }): Promise<TreatyListResponse> => {
    const q = new URLSearchParams()
    if (params?.countryId) q.set('countryId', params.countryId)
    if (params?.historicalCountryId) q.set('historicalCountryId', params.historicalCountryId)
    if (params?.cabinetId) q.set('cabinetId', params.cabinetId)
    if (params?.type) q.set('type', params.type)
    if (params?.search?.trim()) q.set('search', params.search.trim())
    if (params?.skip !== undefined) q.set('skip', String(params.skip))
    if (params?.take !== undefined) q.set('take', String(params.take))
    const res = await apiClient.get(`/treaties?${q.toString()}`)
    return normalizeTreatyListResponse(res.data)
  },

  /** 조약 단건 조회 */
  getById: async (id: string): Promise<TreatyDto> => {
    const res = await apiClient.get(`/treaties/${id}`)
    return res.data
  },

  /** 조약 생성 (선택: signatories 로 일괄) */
  create: async (dto: CreateTreatyDto): Promise<TreatyDto> => {
    const res = await apiClient.post('/treaties', dto)
    return res.data
  },

  /** 조약 수정 */
  update: async (id: string, dto: Partial<CreateTreatyDto>): Promise<TreatyDto> => {
    const res = await apiClient.put(`/treaties/${id}`, dto)
    return res.data
  },

  /** 조약 삭제 */
  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/treaties/${id}`)
  },

  // ─── 서명국 ───

  /** 서명국 추가 */
  addSignatory: async (dto: CreateTreatySignatoryDto): Promise<TreatySignatoryDto> => {
    const res = await apiClient.post('/treaties/signatories', dto)
    return res.data
  },

  /** 서명국 수정 */
  updateSignatory: async (
    id: string,
    dto: Partial<Omit<CreateTreatySignatoryDto, 'treatyId'>>,
  ): Promise<TreatySignatoryDto> => {
    const res = await apiClient.put(`/treaties/signatories/${id}`, dto)
    return res.data
  },

  /** 서명국 삭제 */
  removeSignatory: async (id: string): Promise<void> => {
    await apiClient.delete(`/treaties/signatories/${id}`)
  },

  // ─── 조항 ───

  /** 조항 추가 */
  addTerm: async (dto: CreateTreatyTermDto): Promise<TreatyTermDto> => {
    const res = await apiClient.post('/treaties/terms', dto)
    return res.data
  },

  /** 조항 수정 */
  updateTerm: async (
    id: string,
    dto: Partial<Omit<CreateTreatyTermDto, 'treatyId'>>,
  ): Promise<TreatyTermDto> => {
    const res = await apiClient.put(`/treaties/terms/${id}`, dto)
    return res.data
  },

  /** 조항 삭제 */
  removeTerm: async (id: string): Promise<void> => {
    await apiClient.delete(`/treaties/terms/${id}`)
  },

  // ─── 이미지 ───

  /** 이미지 추가 */
  addImage: async (dto: AddTreatyImageDto): Promise<TreatyImageDto> => {
    const res = await apiClient.post('/treaties/images', dto)
    return res.data
  },

  /** 이미지 삭제 */
  removeImage: async (id: string): Promise<void> => {
    await apiClient.delete(`/treaties/images/${id}`)
  },
}
