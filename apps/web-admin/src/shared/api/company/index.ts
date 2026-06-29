import { getApiConnection } from '../client'

export type CompanyStatus =
  | 'ACTIVE'
  | 'DISSOLVED'
  | 'MERGED'
  | 'SUSPENDED'
  | 'OTHER'

export type CompanyRelationSummary = {
  id: string
  name: string
}

export type FacilityType =
  | 'HEADQUARTERS'
  | 'FACTORY'
  | 'RND'
  | 'OFFICE'
  | 'OTHER'

export type CompanyFacilitySummary = {
  id: string
  facilityType: FacilityType | null
  name: string | null
  address: string | null
  constructionStartDate: string | null
  constructionEndDate: string | null
  constructionBackground: string | null
  openedAt: string | null
  closedAt: string | null
  note: string | null
  city: CompanyRelationSummary | null
  administrativeDivision: CompanyRelationSummary | null
}

export type CompanyHistoryType =
  | 'GENERAL'
  | 'PRODUCT_LAUNCH'
  | 'FINANCIAL'
  | 'MERGER_ACQUISITION'
  | 'LEADERSHIP'
  | 'LEGAL'
  | 'MILESTONE'
  | 'OTHER'

export type CompanyHistoryItem = {
  id: string
  type: CompanyHistoryType | null
  title: string
  occurredAt: string | null
  content: string | null
  note: string | null
  stockPrice: number | null
  marketCap: number | null
  currency: string | null
  order: number | null
}

export type CompanyCategoryLink = {
  id: string
  categoryId: string
  categoryName: string
  fromDate: string | null
  toDate: string | null
  note: string | null
}

export type Company = {
  id: string
  name: string
  shortName: string | null
  localName: string | null
  description: string | null
  status: CompanyStatus | null
  foundedAt: string | null
  dissolvedAt: string | null
  websiteUrl: string | null
  logoUrl: string | null
  extra: unknown | null
  founderId: string | null
  countryId: string | null
  historicalCountryId: string | null
  headquartersCityId: string | null
  organizationId: string | null
  founder: CompanyRelationSummary | null
  country: CompanyRelationSummary | null
  historicalCountry: CompanyRelationSummary | null
  headquartersCity: CompanyRelationSummary | null
  organization: CompanyRelationSummary | null
  createdAt: string
  updatedAt: string
}

export type CompanyProductItem = {
  id: string
  name: string
  category: string | null
  productLine: string | null
  description: string | null
  announcedAt: string | null
  releasedAt: string | null
  discontinuedAt: string | null
  imageUrl: string | null
  order: number | null
}

export type CompanyStockPointItem = {
  id: string
  date: string
  price: number | null
  marketCap: number | null
  revenue: number | null
  currency: string | null
  source: string | null
  note: string | null
}

/** 투자의견(한국식 5단계) */
export type AnalystRating =
  | 'STRONG_BUY'
  | 'BUY'
  | 'HOLD'
  | 'SELL'
  | 'STRONG_SELL'

export type CompanyAnalystRatingItem = {
  id: string
  firm: string
  analyst: string | null
  targetPrice: number | null
  priorTargetPrice: number | null
  currency: string | null
  rating: AnalystRating | null
  publishedAt: string | null
  reportTitle: string | null
  sourceUrl: string | null
  note: string | null
  order: number | null
}

/** 전망 방향 */
export type OutlookStance = 'BULLISH' | 'NEUTRAL' | 'BEARISH'
/** 전망 확신도 */
export type OutlookConfidence = 'HIGH' | 'MEDIUM' | 'LOW'
/** 전망 검증 결과 */
export type OutlookOutcome = 'HIT' | 'MISS' | 'PARTIAL'
/** 시나리오 종류 */
export type ScenarioKind = 'BULL' | 'BASE' | 'BEAR'
/** 촉매 예정일 신뢰도 */
export type CatalystDateConfidence = 'CONFIRMED' | 'ESTIMATED' | 'TBD'
/** 밸류에이션 방법 */
export type ValuationMethod =
  | 'PER'
  | 'PBR'
  | 'EV_EBITDA'
  | 'DCF'
  | 'SOTP'
  | 'OTHER'
/** 핵심 변수 역할 */
export type DriverRole = 'THESIS' | 'RISK'
/** 핵심 변수 영향 */
export type DriverImpact = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
/** 핵심 변수 중요도 */
export type DriverImportance = 'HIGH' | 'MEDIUM' | 'LOW'

export type CompanyOutlookDriverItem = {
  id: string
  name: string
  role: DriverRole | null
  impact: DriverImpact | null
  importance: DriverImportance | null
  eventDate: string | null
  note: string | null
  order: number | null
}

export type CompanyOutlookScenarioItem = {
  id: string
  kind: ScenarioKind
  targetPrice: number | null
  probability: number | null
  summary: string | null
  order: number | null
}

export type CompanyOutlookCatalystItem = {
  id: string
  title: string
  expectedDate: string | null
  dateConfidence: CatalystDateConfidence | null
  impact: DriverImpact | null
  note: string | null
  order: number | null
}

export type CompanyOutlookItem = {
  id: string
  horizon: string | null
  asOf: string | null
  targetDate: string | null
  stance: OutlookStance | null
  confidence: OutlookConfidence | null
  targetPrice: number | null
  priorTargetPrice: number | null
  expectedLow: number | null
  expectedHigh: number | null
  currency: string | null
  rationale: string | null
  source: string | null
  valuationMethod: ValuationMethod | null
  targetMultiple: number | null
  perShareBasis: number | null
  basisLabel: string | null
  actualPrice: number | null
  outcome: OutlookOutcome | null
  resolvedAt: string | null
  order: number | null
  drivers: CompanyOutlookDriverItem[]
  scenarios: CompanyOutlookScenarioItem[]
  catalysts: CompanyOutlookCatalystItem[]
}

/** 상세 조회 응답 — 요약 관계 + 시설·연혁·카테고리·제품·주가·목표주가·전망 */
export type CompanyDetail = Company & {
  financialCommentary: string | null
  facilities: CompanyFacilitySummary[]
  histories: CompanyHistoryItem[]
  categories: CompanyCategoryLink[]
  products: CompanyProductItem[]
  stockPoints: CompanyStockPointItem[]
  analystRatings: CompanyAnalystRatingItem[]
  outlooks: CompanyOutlookItem[]
}

export type CreateCompanyInput = {
  name: string
  shortName?: string | null
  localName?: string | null
  description?: string | null
  status?: CompanyStatus
  foundedAt?: string | null
  dissolvedAt?: string | null
  websiteUrl?: string | null
  logoUrl?: string | null
  founderId?: string | null
  countryId?: string | null
  historicalCountryId?: string | null
  headquartersCityId?: string | null
  organizationId?: string | null
}

/** 자식 입력(id 없음 — 서버가 전체배열 delete-and-recreate) */
export type CompanyFacilityInput = {
  facilityType?: FacilityType | null
  name?: string | null
  address?: string | null
  note?: string | null
  constructionBackground?: string | null
  constructionStartDate?: string | null
  constructionEndDate?: string | null
  openedAt?: string | null
  closedAt?: string | null
  cityId?: string | null
  administrativeDivisionId?: string | null
}

export type CompanyHistoryInput = {
  type?: CompanyHistoryType | null
  title: string
  occurredAt?: string | null
  content?: string | null
  note?: string | null
  stockPrice?: number | null
  marketCap?: number | null
  currency?: string | null
  order?: number | null
}

export type CompanyCategoryInput = {
  categoryId: string
  fromDate?: string | null
  toDate?: string | null
  note?: string | null
}

export type CompanyProductInput = {
  name: string
  category?: string | null
  productLine?: string | null
  description?: string | null
  announcedAt?: string | null
  releasedAt?: string | null
  discontinuedAt?: string | null
  imageUrl?: string | null
  order?: number | null
}

export type CompanyStockPointInput = {
  date: string
  price?: number | null
  marketCap?: number | null
  revenue?: number | null
  currency?: string | null
  source?: string | null
  note?: string | null
}

export type CompanyAnalystRatingInput = {
  firm: string
  analyst?: string | null
  targetPrice?: number | null
  priorTargetPrice?: number | null
  currency?: string | null
  rating?: AnalystRating | null
  publishedAt?: string | null
  reportTitle?: string | null
  sourceUrl?: string | null
  note?: string | null
  order?: number | null
}

export type CompanyOutlookDriverInput = {
  name: string
  role?: DriverRole | null
  impact?: DriverImpact | null
  importance?: DriverImportance | null
  eventDate?: string | null
  note?: string | null
  order?: number | null
}

export type CompanyOutlookScenarioInput = {
  kind: ScenarioKind
  targetPrice?: number | null
  probability?: number | null
  summary?: string | null
  order?: number | null
}

export type CompanyOutlookCatalystInput = {
  title: string
  expectedDate?: string | null
  dateConfidence?: CatalystDateConfidence | null
  impact?: DriverImpact | null
  note?: string | null
  order?: number | null
}

export type CompanyOutlookInput = {
  horizon?: string | null
  asOf?: string | null
  targetDate?: string | null
  stance?: OutlookStance | null
  confidence?: OutlookConfidence | null
  targetPrice?: number | null
  priorTargetPrice?: number | null
  expectedLow?: number | null
  expectedHigh?: number | null
  currency?: string | null
  rationale?: string | null
  source?: string | null
  valuationMethod?: ValuationMethod | null
  targetMultiple?: number | null
  perShareBasis?: number | null
  basisLabel?: string | null
  actualPrice?: number | null
  outcome?: OutlookOutcome | null
  resolvedAt?: string | null
  order?: number | null
  drivers?: CompanyOutlookDriverInput[]
  scenarios?: CompanyOutlookScenarioInput[]
  catalysts?: CompanyOutlookCatalystInput[]
}

export type UpdateCompanyInput = Partial<CreateCompanyInput> & {
  status?: CompanyStatus | null
  financialCommentary?: string | null
  facilities?: CompanyFacilityInput[]
  histories?: CompanyHistoryInput[]
  categories?: CompanyCategoryInput[]
  products?: CompanyProductInput[]
  stockPoints?: CompanyStockPointInput[]
  analystRatings?: CompanyAnalystRatingInput[]
  outlooks?: CompanyOutlookInput[]
}

async function request<T>(
  path: string,
  options?: { method?: string; body?: unknown; headers?: Record<string, string> },
): Promise<T> {
  const conn = getApiConnection()
  const url = `${conn.host}${path}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(conn.headers as Record<string, string>),
  }
  const res = await fetch(url, {
    method: options?.method ?? 'GET',
    headers: { ...headers, ...options?.headers },
    body:
      options?.body != null
        ? typeof options.body === 'string'
          ? options.body
          : JSON.stringify(options.body)
        : undefined,
  })
  if (res.status === 204) return undefined as T
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  if (res.headers.get('content-type')?.includes('application/json')) {
    return res.json() as Promise<T>
  }
  return undefined as T
}

export const companyApi = {
  getAll: async (): Promise<Company[]> => {
    const list = await request<Company[]>('/companies')
    return Array.isArray(list) ? list : []
  },

  getById: async (id: string): Promise<CompanyDetail | null> => {
    const item = await request<CompanyDetail | null>(
      `/companies/${encodeURIComponent(id)}`,
    )
    return item ?? null
  },

  create: async (data: CreateCompanyInput): Promise<Company> => {
    return request<Company>('/companies', { method: 'POST', body: data })
  },

  update: async (id: string, data: UpdateCompanyInput): Promise<Company> => {
    return request<Company>(`/companies/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: data,
    })
  },

  delete: async (id: string): Promise<void> => {
    await request<void>(`/companies/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  },
}
