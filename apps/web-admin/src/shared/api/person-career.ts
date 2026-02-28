// apps/web-admin/src/shared/api/person-career.ts
import axios from 'axios'

// API 클라이언트 생성
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Career 이미지 DTO
 */
export interface CareerImageDto {
  url: string
  description?: string
}

/**
 * 군인 경력 생성 DTO
 */
export interface CreateMilitaryCareerDto {
  personId: string
  timelineTitle?: string
  showPositionInfo?: boolean
  rankId: string // 계급 ID (대장, 중장 등)
  jobCategoryId?: string
  organizationId: string // 소속 조직 ID
  branch?: string // 군종 (육군, 해군, 공군)
  position?: string // 역할/보직 (사령관, 참모장 등)
  termNumber?: number // 대수
  startDate?: string
  endDate?: string
  notes?: string
  images?: CareerImageDto[]
}

/**
 * 기업인 경력 생성 DTO
 */
export interface CreateBusinessCareerDto {
  personId: string
  timelineTitle?: string
  showPositionInfo?: boolean
  positionId: string // 직급 ID (CEO, CFO 등)
  jobCategoryId?: string
  organizationId: string // 회사 ID
  title?: string // 직함
  level?: string // 직급 레벨
  startDate?: string
  endDate?: string
  notes?: string
  images?: CareerImageDto[]
}

/**
 * 학자 경력 생성 DTO
 */
export interface CreateAcademicCareerDto {
  personId: string
  timelineTitle?: string
  showPositionInfo?: boolean
  positionId: string // 직급 ID (교수, 연구원 등)
  jobCategoryId?: string
  organizationId: string // 대학/연구소 ID
  department?: string // 학과
  researchField?: string // 연구 분야
  startDate?: string
  endDate?: string
  notes?: string
  images?: CareerImageDto[]
}

/**
 * 종교인 경력 생성 DTO
 */
export interface CreateReligiousCareerDto {
  personId: string
  timelineTitle?: string
  showPositionInfo?: boolean
  positionId: string // 직급 ID (성직자, 수도자 등)
  jobCategoryId?: string
  organizationId?: string // 종교 조직 ID
  religion?: string // 종교
  denomination?: string // 종파
  rank?: string // 직급/지위
  startDate?: string
  endDate?: string
  notes?: string
  images?: CareerImageDto[]
}

/**
 * 예술가 경력 생성 DTO
 */
export interface CreateArtistCareerDto {
  personId: string
  timelineTitle?: string
  showPositionInfo?: boolean
  positionId: string // 직급 ID (화가, 조각가 등)
  jobCategoryId?: string
  organizationId?: string
  artForm?: string // 예술 분야 (회화, 조각 등)
  style?: string // 스타일/장르
  startDate?: string
  endDate?: string
  notes?: string
  images?: CareerImageDto[]
}

/**
 * 운동선수 경력 생성 DTO
 */
export interface CreateAthleteCareerDto {
  personId: string
  timelineTitle?: string
  showPositionInfo?: boolean
  positionId: string // 직급 ID (선수, 코치 등)
  jobCategoryId?: string
  organizationId?: string // 팀 ID
  sport?: string // 종목
  position?: string // 포지션
  jerseyNumber?: number // 등번호
  startDate?: string
  endDate?: string
  notes?: string
  images?: CareerImageDto[]
}

/**
 * 언론인 경력 생성 DTO
 */
export interface CreateMediaCareerDto {
  personId: string
  timelineTitle?: string
  showPositionInfo?: boolean
  positionId: string // 직급 ID (기자, 앵커 등)
  jobCategoryId?: string
  organizationId?: string // 언론사 ID
  mediaType?: string // 매체 유형 (신문, 방송 등)
  role?: string // 역할
  startDate?: string
  endDate?: string
  notes?: string
  images?: CareerImageDto[]
}

/**
 * 법조인 경력 생성 DTO
 */
export interface CreateLegalCareerDto {
  personId: string
  timelineTitle?: string
  showPositionInfo?: boolean
  positionId: string // 직급 ID (판사, 검사, 변호사)
  jobCategoryId?: string
  organizationId?: string // 법원/검찰청/로펌 ID
  specialization?: string // 전문 분야
  courtLevel?: string // 법원 등급 (대법원, 고등법원 등)
  startDate?: string
  endDate?: string
  notes?: string
  images?: CareerImageDto[]
}

/**
 * 의료인 경력 생성 DTO
 */
export interface CreateMedicalCareerDto {
  personId: string
  timelineTitle?: string
  showPositionInfo?: boolean
  positionId: string // 직급 ID (의사, 간호사 등)
  jobCategoryId?: string
  organizationId?: string // 병원 ID
  specialization?: string // 전문 분야
  department?: string // 진료과
  startDate?: string
  endDate?: string
  notes?: string
  images?: CareerImageDto[]
}

/**
 * 국가원수/왕위 재임 기록 생성 DTO
 */
export interface CreateGovernmentPositionTenureDto {
  personId: string
  positionType:
    | 'HEAD_OF_STATE'
    | 'HEAD_OF_GOVERNMENT'
    | 'HEIR_APPARENT'
    | 'REGENT'
    | 'CABINET_MINISTER'
    | 'VICE_MINISTER'
    | 'LEGISLATOR'
    | 'JUDICIARY'
    | 'LOCAL_GOVERNMENT'
    | 'SPECIAL_POSITION'
    | 'MILITARY_COMMANDER'
    | 'ROYAL_NOBLE_TITLE'
    | 'OTHER' // 직위 타입 (필수)
  title: string // 직위명 (필수) - 예: "대통령", "국왕", "황제"
  titleEn?: string // 영문 직위명
  showPositionInfo?: boolean // 사건 타임라인에 직책 정보 표시 여부 (기본값: true)
  countryId?: string // 현대 국가 ID
  historicalCountryId?: string // 역사적 국가 ID
  positionDefinitionId?: string // 직위 정의 ID (선택사항)
  termNumber?: number // 대수
  regnalNumber?: number // 재위번호 (서양 군주)
  startDate: string // 취임일 (필수)
  endDate?: string // 퇴임일
  appointmentMethod?:
    | 'DIRECT_ELECTION'
    | 'INDIRECT_ELECTION'
    | 'APPOINTMENT'
    | 'HEREDITARY'
    | 'COUP'
    | 'PARLIAMENTARY_ELECTION'
    | 'OTHER'
  endReason?:
    | 'TERM_COMPLETED'
    | 'RESIGNATION'
    | 'ABDICATION'
    | 'SUCCESSION_TRANSFER'
    | 'REMOVAL'
    | 'IMPEACHMENT'
    | 'DEATH_IN_OFFICE'
    | 'OVERTHROWN'
    | 'WAR_DEFEAT'
    | 'STATE_DISSOLVED'
    | 'OTHER'
  endReasonDetail?: string
  notes?: string
  priority?: number
}

/**
 * 관직 정의 생성 DTO
 */
export interface CreateGovernmentPositionDefinitionDto {
  title: string
  titleEn?: string | null
  titleLocal?: string | null
  positionType: string
  description?: string | null
  rank?: number | null
  departmentName?: string | null
  organizationId?: string | null
  establishedDate?: string | null
  abolishedDate?: string | null
}

/**
 * 관직 정의 수정 DTO
 */
export interface UpdateGovernmentPositionDefinitionDto {
  title?: string
  titleEn?: string | null
  titleLocal?: string | null
  positionType?: string
  description?: string | null
  rank?: number | null
  departmentName?: string | null
  organizationId?: string | null
  establishedDate?: string | null
  abolishedDate?: string | null
}

/**
 * 학력 생성 DTO
 */
export interface CreateEducationDto {
  personId: string
  timelineTitle?: string
  organizationId: string // 학교 ID
  educationType?: string // 학력 유형
  classNumber?: number // 기수 (육사 50기)
  degree?: string // 학위
  major?: string // 전공
  department?: string // 학과
  status?: string // 상태 (졸업, 수료, 중퇴)
  studentNumber?: string // 학번
  startDate?: string
  endDate?: string
  notes?: string
  images?: CareerImageDto[]
}

/**
 * 수상/훈장 생성 DTO
 */
export interface CreatePersonAwardDto {
  personId: string
  awardName: string // 수상명 (노벨 물리학상, 올림픽 금메달)
  category?: string // 분야 (물리학상, 100m 달리기)
  awardingBody?: string // 수여 기관
  awardDate?: string
  description?: string
  images?: CareerImageDto[]
}

/**
 * Person Career API
 */
export const personCareerApi = {
  /**
   * 군인 경력 추가
   */
  addMilitaryCareer: async (dto: CreateMilitaryCareerDto) => {
    const response = await apiClient.post('/persons/careers/military', dto)
    return response.data
  },

  /**
   * 기업인 경력 추가
   */
  addBusinessCareer: async (dto: CreateBusinessCareerDto) => {
    const response = await apiClient.post('/persons/careers/business', dto)
    return response.data
  },

  /**
   * 학자 경력 추가
   */
  addAcademicCareer: async (dto: CreateAcademicCareerDto) => {
    const response = await apiClient.post('/persons/careers/academic', dto)
    return response.data
  },

  /**
   * 운동선수 경력 추가
   */
  addAthleteCareer: async (dto: CreateAthleteCareerDto) => {
    const response = await apiClient.post('/persons/careers/athlete', dto)
    return response.data
  },

  /**
   * 종교인 경력 추가
   */
  addReligiousCareer: async (dto: CreateReligiousCareerDto) => {
    const response = await apiClient.post('/persons/careers/religious', dto)
    return response.data
  },

  /**
   * 예술가 경력 추가
   */
  addArtistCareer: async (dto: CreateArtistCareerDto) => {
    const response = await apiClient.post('/persons/careers/artist', dto)
    return response.data
  },

  /**
   * 언론인 경력 추가
   */
  addMediaCareer: async (dto: CreateMediaCareerDto) => {
    const response = await apiClient.post('/persons/careers/media', dto)
    return response.data
  },

  /**
   * 법조인 경력 추가
   */
  addLegalCareer: async (dto: CreateLegalCareerDto) => {
    const response = await apiClient.post('/persons/careers/legal', dto)
    return response.data
  },

  /**
   * 의료인 경력 추가
   */
  addMedicalCareer: async (dto: CreateMedicalCareerDto) => {
    const response = await apiClient.post('/persons/careers/medical', dto)
    return response.data
  },

  /**
   * 국가원수/왕위 재임 기록 추가
   */
  addGovernmentPositionTenure: async (
    dto: CreateGovernmentPositionTenureDto,
  ) => {
    const response = await apiClient.post('/government-positions/tenures', dto)
    return response.data
  },

  /**
   * 국가원수/왕위 재임 기록 수정
   */
  updateGovernmentPositionTenure: async (
    id: string,
    dto: Partial<CreateGovernmentPositionTenureDto>,
  ) => {
    const response = await apiClient.put(
      `/government-positions/tenures/${id}`,
      dto,
    )
    return response.data
  },

  /**
   * 국가원수/왕위 재임 기록 삭제
   */
  deleteGovernmentPositionTenure: async (id: string) => {
    await apiClient.delete(`/government-positions/tenures/${id}`)
  },

  /**
   * 재임 업적·한일 추가 (사건과 별도)
   * POST /government-positions/tenures/:tenureId/achievements
   */
  createTenureAchievement: async (
    tenureId: string,
    dto: {
      title: string
      description?: string
      startDate?: string
      endDate?: string
      orderNum?: number
      showOnEventsPage?: boolean
    },
  ) => {
    const response = await apiClient.post(
      `/government-positions/tenures/${encodeURIComponent(tenureId)}/achievements`,
      dto,
    )
    return response.data
  },

  /**
   * 재임 업적 수정
   * PATCH /government-positions/tenures/:tenureId/achievements/:achievementId
   */
  updateTenureAchievement: async (
    tenureId: string,
    achievementId: string,
    dto: {
      title?: string
      description?: string
      startDate?: string
      endDate?: string
      orderNum?: number
      showOnEventsPage?: boolean
    },
  ) => {
    const response = await apiClient.patch(
      `/government-positions/tenures/${encodeURIComponent(tenureId)}/achievements/${encodeURIComponent(achievementId)}`,
      dto,
    )
    return response.data
  },

  /**
   * 사건 페이지에 표시할 업적 목록 (showOnEventsPage=true)
   * GET /government-positions/achievements/for-events-page
   */
  getAchievementsForEventsPage: async () => {
    const response = await apiClient.get('/government-positions/achievements/for-events-page')
    return response.data ?? []
  },

  /**
   * 재임 업적 삭제
   * DELETE /government-positions/tenures/:tenureId/achievements/:achievementId
   */
  deleteTenureAchievement: async (
    tenureId: string,
    achievementId: string,
  ) => {
    await apiClient.delete(
      `/government-positions/tenures/${encodeURIComponent(tenureId)}/achievements/${encodeURIComponent(achievementId)}`,
    )
  },

  /**
   * 인물의 재임 기록만 조회 (수정 페이지 경력 로딩용)
   * GET /persons/:id/tenures
   */
  getTenuresByPersonId: async (personId: string) => {
    const response = await apiClient.get(`/persons/${personId}/tenures`)
    return response.data ?? []
  },

  /**
   * 국가 또는 역사적 국가별 재임 기록 목록 조회 (REST)
   * GET /government-positions/countries/:countryId/tenures
   * GET /government-positions/historical-countries/:historicalCountryId/tenures
   */
  getTenuresByCountry: async (params: {
    countryId?: string
    historicalCountryId?: string
  }) => {
    let raw: unknown
    if (params.countryId) {
      const response = await apiClient.get(
        `/government-positions/countries/${encodeURIComponent(params.countryId)}/tenures`,
      )
      raw = response.data
    } else if (params.historicalCountryId) {
      const response = await apiClient.get(
        `/government-positions/historical-countries/${encodeURIComponent(params.historicalCountryId)}/tenures`,
      )
      raw = response.data
    } else {
      return []
    }
    if (Array.isArray(raw)) return raw
    if (raw && typeof raw === 'object' && 'data' in raw && Array.isArray((raw as any).data)) {
      return (raw as any).data
    }
    return []
  },

  /**
   * 관직 정의 목록 조회 (전역 단일 레벨)
   */
  getPositionDefinitions: async (params: {
    countryId?: string
    historicalCountryId?: string
  } = {}) => {
    const q = new URLSearchParams()
    if (params.countryId) q.set('countryId', params.countryId)
    if (params.historicalCountryId) q.set('historicalCountryId', params.historicalCountryId)
    const response = await apiClient.get(
      `/government-positions/definitions?${q.toString()}`,
    )
    return response.data ?? []
  },

  /**
   * 관직 정의 단건 조회
   */
  getPositionDefinitionById: async (id: string) => {
    const response = await apiClient.get(`/government-positions/definitions/${id}`)
    return response.data
  },

  /**
   * 관직 정의 생성
   */
  createPositionDefinition: async (dto: CreateGovernmentPositionDefinitionDto) => {
    const response = await apiClient.post('/government-positions/definitions', dto)
    return response.data
  },

  /**
   * 관직 정의 수정
   */
  updatePositionDefinition: async (
    id: string,
    dto: UpdateGovernmentPositionDefinitionDto,
  ) => {
    const response = await apiClient.put(
      `/government-positions/definitions/${id}`,
      dto,
    )
    return response.data
  },

  /**
   * 관직 정의 삭제
   */
  deletePositionDefinition: async (id: string) => {
    await apiClient.delete(`/government-positions/definitions/${id}`)
  },

  /**
   * 학력 추가
   */
  addEducation: async (dto: CreateEducationDto) => {
    const response = await apiClient.post('/persons/educations', dto)
    return response.data
  },

  /**
   * 수상/훈장 추가
   */
  addAward: async (dto: CreatePersonAwardDto) => {
    const response = await apiClient.post('/persons/awards', dto)
    return response.data
  },

  /**
   * 인물의 모든 경력 조회
   */
  getAllCareers: async (personId: string) => {
    const response = await apiClient.get(`/persons/${personId}/careers`)
    return response.data
  },
}
