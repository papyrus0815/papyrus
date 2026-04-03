// apps/web-admin/src/shared/api/person-career.ts
import axios from 'axios'

// API 클라이언트 생성
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
  /** JWT 쿠키(access_token) 전달 — 묶기 검색 등 로그인 사용자 식별에 필요 */
  withCredentials: true,
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
export type TenureMandateSourceValue =
  | 'UNKNOWN'
  | 'ELECTION'
  | 'APPOINTMENT'
  | 'SUCCESSION'
  | 'HEREDITARY'
  | 'OTHER'

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
  /** 직위 정의가 있으면 생략 가능 */
  title?: string // 예: "대통령", "국왕", "황제"
  titleEn?: string // 영문 직위명
  showPositionInfo?: boolean // 사건 타임라인에 직책 정보 표시 여부 (기본값: true)
  countryId?: string // 현대 국가 ID
  historicalCountryId?: string // 역사적 국가 ID
  positionDefinitionId?: string // 직위 정의 ID (선택사항)
  termNumber?: number // 대수
  subTermNumber?: number // 기수 (1기, 2기 — 같은 대수 내 복수 임기 구분)
  regnalNumber?: number // 재위번호 (서양 군주)
  startDate: string // 취임일 (필수)
  endDate?: string // 퇴임일
  /** 소속 행정부(Cabinet) ID — 이 각료/총독 재임이 속한 행정부 */
  cabinetId?: string | null
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
  /** 소속 중앙부처 ID — 이 재임이 실제 속한 국가별 부처 인스턴스 */
  administrationDepartmentId?: string | null
  /** 재임 권한 근원 */
  mandateSource?: TenureMandateSourceValue
  /** 당선된 선거 후보와 1:1 연결 */
  electionCandidacyId?: string | null
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
  /** 중앙부처 카테고리 연결 (관리자 등록 직위) */
  categoryId?: string | null
  /** 행정기구 연결 (사용자 등록 직위) */
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
  /** 중앙부처 카테고리 연결 (관리자 등록 직위) */
  categoryId?: string | null
  /** 행정기구 연결 (사용자 등록 직위) */
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

/** API가 포함하는 사건(Event) 요약 — 재임 업적 정본 연결 시 */
export type TenureLinkedEventSummary = {
  id: string
  title: string
  description?: string | null
  startDate?: string | null
  endDate?: string | null
  deletedAt?: string | null
}

/** 재임 한일·업적 (행정부 각료 상세 등) */
export type GovernmentTenureAchievementItem = {
  id: string
  /** 소속 재임 FK — 다국 행정부 묶음으로 병합 표시된 항목은 상대 수반 재임일 수 있음 */
  tenureId?: string | null
  title?: string | null
  description?: string | null
  startDate?: string | null
  endDate?: string | null
  orderNum?: number | null
  showOnEventsPage?: boolean | null
  /** 연결된 사건(Event) — FK는 재임 업적 쪽; 지정은 행정부·재임 UI에서만 */
  eventId?: string | null
  event?: TenureLinkedEventSummary | null
}

/**
 * GET /government-positions/achievements/by-event/:eventId
 * 동일 사건에 연결된 재임 업적(다국 행정부 공유 조회)
 */
export type TenureAchievementByEventLinkRow = {
  id: string
  title: string
  eventId?: string | null
  tenure: {
    id: string
    person?: {
      id: string
      name?: string | null
      surname?: string | null
      middleName?: string | null
      nameDisplayOrder?: string | null
    } | null
    country?: { id: string; name: string } | null
    historicalCountry?: { id: string; name: string } | null
    cabinet?: { id: string; name?: string | null } | null
  }
}

/**
 * 행정부 소속 재임 1건
 * GET /government-positions/cabinets/:cabinetId/tenures
 */
export type GovernmentCabinetTenureItem = {
  id: string
  title?: string | null
  startDate?: string | null
  endDate?: string | null
  person?: {
    id: string
    name?: string | null
    surname?: string | null
    middleName?: string | null
    nameDisplayOrder?: string | null
    profileImageUrl?: string | null
    birthDate?: string | null
    birthYear?: number | null
    birthEra?: string | null
    deathEra?: string | null
    deathDate?: string | null
    deathYear?: number | null
    /** 출생 도시 — 목록·상세 출신 표기 */
    birthCity?: { name?: string | null } | null
    birthAdminDivision?: { name?: string | null } | null
    birthPlaceText?: string | null
  } | null
  positionDefinition?: {
    id: string
    title: string
    administrationDepartmentId?: string | null
    positionType?: string | null
  } | null
  achievements?: GovernmentTenureAchievementItem[]
}

/** 수반 재임의 연호·시대명 (동아시아 연호, 유럽식 재위 시대명 등) */
export type RegnalEraDto = {
  id: string
  tenureId: string
  eraName: string
  eraNameEn?: string | null
  startYear: number
  startMonth?: number | null
  startDay?: number | null
  endYear?: number | null
  endMonth?: number | null
  endDay?: number | null
  changeReason?: string | null
}

export type CreateRegnalEraDto = {
  eraName: string
  eraNameEn?: string | null
  startYear: number
  startMonth?: number | null
  startDay?: number | null
  endYear?: number | null
  endMonth?: number | null
  endDay?: number | null
  changeReason?: string | null
}

/** 행정부 목록 API의 수반 재임(소속 국가·이름 포함) */
export type GovernmentHeadTenureInCabinetList = {
  id: string
  historicalCountryId?: string | null
  countryId?: string | null
  /** 재임 행 자체의 직위 유형 — 직위 정의와 동일 값 */
  positionType?: string | null
  title?: string | null
  startDate: string
  endDate?: string | null
  termNumber?: number | null
  regnalNumber?: number | null
  subTermNumber?: number | null
  /** 연호·시대 — GET /government-positions/cabinets 등에서 포함 */
  regnalEras?: RegnalEraDto[]
  /** 비고 — 역대 수반 등록 시 `왕명: …` 형태로 저장되는 경우 있음 */
  notes?: string | null
  person?: GovernmentCabinetTenureItem['person']
  positionDefinition?: GovernmentCabinetTenureItem['positionDefinition']
  country?: {
    id: string
    name: string
    flagEmoji?: string | null
    thumbnailUrl?: string | null
  } | null
  historicalCountry?: {
    id: string
    name: string
    thumbnailUrl?: string | null
  } | null
}

/** GET /government-positions/cabinets 응답 1건 */
export type CabinetListItemDto = {
  id: string
  name?: string | null
  headTenureId?: string
  /** 다국 행정부 묶음 (CabinetLinkageGroup) — `eventId`로 같은 국제 사건 축 */
  linkageGroup?: {
    id: string
    label?: string | null
    eventId?: string | null
    event?: { id: string; title: string } | null
  } | null
  headTenure: GovernmentHeadTenureInCabinetList
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
      eventId?: string
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
      /** null이면 사건 연결 해제 */
      eventId?: string | null
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
    const response = await apiClient.get(
      '/government-positions/achievements/for-events-page',
    )
    return response.data ?? []
  },

  /**
   * 동일 사건(eventId)에 연결된 재임 업적 전부 — 다국 행정부 연결
   * GET /government-positions/achievements/by-event/:eventId
   */
  getTenureAchievementsByEventId: async (
    eventId: string,
  ): Promise<TenureAchievementByEventLinkRow[]> => {
    const response = await apiClient.get(
      `/government-positions/achievements/by-event/${encodeURIComponent(eventId)}`,
    )
    const raw = response.data
    return Array.isArray(raw) ? raw : []
  },

  /**
   * 재임 업적 삭제
   * DELETE /government-positions/tenures/:tenureId/achievements/:achievementId
   */
  deleteTenureAchievement: async (tenureId: string, achievementId: string) => {
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
   * 전역 수반(교황 등) 재임 기록 목록 조회
   * GET /government-positions/global/tenures
   */
  getGlobalTenures: async () => {
    const response = await apiClient.get('/government-positions/global/tenures')
    const raw = response.data ?? []
    return Array.isArray(raw)
      ? raw
      : raw &&
          typeof raw === 'object' &&
          'data' in raw &&
          Array.isArray((raw as any).data)
        ? (raw as any).data
        : []
  },

  /**
   * 특정 수반 재임 하의 각료 목록 (행정부 한눈에 보기) — headTenureId로 Cabinet 조회 후 멤버 반환
   * GET /government-positions/tenures/by-parent/:parentTenureId
   */
  getSubordinateTenures: async (headTenureId: string) => {
    const response = await apiClient.get(
      `/government-positions/tenures/by-parent/${encodeURIComponent(headTenureId)}`,
    )
    return Array.isArray(response.data) ? response.data : []
  },

  /**
   * 행정부(Cabinet) 목록 — 국가/역사적 국가별
   * GET /government-positions/cabinets?countryId=&historicalCountryId=
   */
  getCabinets: async (params: {
    countryId?: string
    historicalCountryId?: string
  }): Promise<CabinetListItemDto[]> => {
    const search = new URLSearchParams()
    if (params.countryId) search.set('countryId', params.countryId)
    if (params.historicalCountryId)
      search.set('historicalCountryId', params.historicalCountryId)
    const response = await apiClient.get(
      `/government-positions/cabinets?${search.toString()}`,
    )
    return Array.isArray(response.data) ? response.data : []
  },

  /**
   * 수반 재임 ID로 행정부 1건 조회
   * GET /government-positions/cabinets/by-head-tenure/:headTenureId
   */
  getCabinetByHeadTenureId: async (headTenureId: string) => {
    const response = await apiClient.get(
      `/government-positions/cabinets/by-head-tenure/${encodeURIComponent(headTenureId)}`,
    )
    return response.data ?? null
  },

  /**
   * 행정부 등록
   * POST /government-positions/cabinets
   */
  createCabinet: async (dto: {
    headTenureId: string
    name?: string | null
  }) => {
    const response = await apiClient.post('/government-positions/cabinets', dto)
    return response.data
  },

  /**
   * 행정부 수정 (이름 등)
   * PATCH /government-positions/cabinets/:cabinetId
   */
  updateCabinet: async (cabinetId: string, dto: { name?: string | null }) => {
    const response = await apiClient.patch(
      `/government-positions/cabinets/${encodeURIComponent(cabinetId)}`,
      dto,
    )
    return response.data
  },

  /**
   * 행정부 삭제 (소속 각료·수반 재임 포함 관련 데이터 모두)
   * DELETE /government-positions/cabinets/:cabinetId
   */
  deleteCabinet: async (cabinetId: string) => {
    await apiClient.delete(
      `/government-positions/cabinets/${encodeURIComponent(cabinetId)}`,
    )
  },

  /**
   * 행정부 ID로 소속 각료(재임) 목록
   * GET /government-positions/cabinets/:cabinetId/tenures
   */
  getTenuresByCabinetId: async (
    cabinetId: string,
  ): Promise<GovernmentCabinetTenureItem[]> => {
    const response = await apiClient.get(
      `/government-positions/cabinets/${encodeURIComponent(cabinetId)}/tenures`,
    )
    return Array.isArray(response.data) ? response.data : []
  },

  /**
   * 다른 나라 행정부 묶기 — 검색 (로그인 필요)
   * GET /government-positions/cabinets/search-for-linkage?excludeCabinetId=&q=&limit=
   */
  searchCabinetsForLinkage: async (params: {
    excludeCabinetId: string
    q?: string
    limit?: number
    /** 지정 시 해당 현대 국가(연결된 역사국가 포함) 소속 수반 재임 행정부만 */
    countryId?: string
    /** 지정 시 해당 역사적 국가 소속 수반 재임 행정부만 */
    historicalCountryId?: string
  }): Promise<CabinetListItemDto[]> => {
    const response = await apiClient.get(
      '/government-positions/cabinets/search-for-linkage',
      {
        params: {
          excludeCabinetId: params.excludeCabinetId,
          ...(params.q?.trim() ? { q: params.q.trim() } : {}),
          ...(params.limit != null ? { limit: String(params.limit) } : {}),
          ...(params.countryId?.trim()
            ? { countryId: params.countryId.trim() }
            : {}),
          ...(params.historicalCountryId?.trim()
            ? { historicalCountryId: params.historicalCountryId.trim() }
            : {}),
        },
      },
    )
    return Array.isArray(response.data) ? response.data : []
  },

  /**
   * 같은 묶음에 속한 다른 행정부 목록
   * GET /government-positions/cabinets/:cabinetId/linked-cabinets
   */
  getLinkedCabinets: async (
    cabinetId: string,
  ): Promise<CabinetListItemDto[]> => {
    const response = await apiClient.get(
      `/government-positions/cabinets/${encodeURIComponent(cabinetId)}/linked-cabinets`,
    )
    return Array.isArray(response.data) ? response.data : []
  },

  /**
   * 다른 행정부와 같은 묶음으로 연결 (같은 사건 eventId 필수)
   * POST /government-positions/cabinets/:cabinetId/link-with
   */
  linkCabinetWithOther: async (
    cabinetId: string,
    otherCabinetId: string,
    eventId: string,
  ): Promise<CabinetListItemDto> => {
    const response = await apiClient.post(
      `/government-positions/cabinets/${encodeURIComponent(cabinetId)}/link-with`,
      { otherCabinetId, eventId },
    )
    return response.data
  },

  /**
   * 사건을 축으로 묶인 행정부 목록
   * GET /government-positions/cabinets/by-linkage-event/:eventId
   */
  getCabinetsByLinkageEventId: async (
    eventId: string,
  ): Promise<CabinetListItemDto[]> => {
    const response = await apiClient.get(
      `/government-positions/cabinets/by-linkage-event/${encodeURIComponent(eventId)}`,
    )
    return Array.isArray(response.data) ? response.data : []
  },

  /**
   * 이 행정부만 묶음에서 제거
   * DELETE /government-positions/cabinets/:cabinetId/linkage
   */
  leaveCabinetLinkage: async (cabinetId: string): Promise<void> => {
    await apiClient.delete(
      `/government-positions/cabinets/${encodeURIComponent(cabinetId)}/linkage`,
    )
  },

  /**
   * 수반 재임에 연호·시대명 추가
   * POST /government-positions/tenures/:tenureId/regnal-eras
   */
  createRegnalEra: async (
    tenureId: string,
    dto: CreateRegnalEraDto,
  ): Promise<RegnalEraDto> => {
    const response = await apiClient.post(
      `/government-positions/tenures/${encodeURIComponent(tenureId)}/regnal-eras`,
      dto,
    )
    return response.data
  },

  /**
   * 연호·시대명 수정
   * PATCH /government-positions/regnal-eras/:id
   */
  updateRegnalEra: async (
    id: string,
    dto: Partial<CreateRegnalEraDto>,
  ): Promise<RegnalEraDto> => {
    const response = await apiClient.patch(
      `/government-positions/regnal-eras/${encodeURIComponent(id)}`,
      dto,
    )
    return response.data
  },

  /**
   * 연호·시대명 삭제
   * DELETE /government-positions/regnal-eras/:id
   */
  deleteRegnalEra: async (id: string): Promise<void> => {
    await apiClient.delete(
      `/government-positions/regnal-eras/${encodeURIComponent(id)}`,
    )
  },

  /**
   * 조직(만철, 관동군, 대만총독부 등) 역대 수장
   * GET /government-positions/organizations/:organizationId/heads
   */
  getOrganizationHeads: async (organizationId: string) => {
    const response = await apiClient.get(
      `/government-positions/organizations/${encodeURIComponent(organizationId)}/heads`,
    )
    return Array.isArray(response.data) ? response.data : []
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
    if (
      raw &&
      typeof raw === 'object' &&
      'data' in raw &&
      Array.isArray((raw as any).data)
    ) {
      return (raw as any).data
    }
    return []
  },

  /**
   * 관직 정의 목록 조회 (전역 단일 레벨)
   */
  getPositionDefinitions: async (
    params: {
      countryId?: string
      historicalCountryId?: string
    } = {},
  ) => {
    const q = new URLSearchParams()
    if (params.countryId) q.set('countryId', params.countryId)
    if (params.historicalCountryId)
      q.set('historicalCountryId', params.historicalCountryId)
    const response = await apiClient.get(
      `/government-positions/definitions?${q.toString()}`,
    )
    return response.data ?? []
  },

  /**
   * 관직 정의 단건 조회
   */
  getPositionDefinitionById: async (id: string) => {
    const response = await apiClient.get(
      `/government-positions/definitions/${id}`,
    )
    return response.data
  },

  /**
   * 관직 정의 생성
   */
  createPositionDefinition: async (
    dto: CreateGovernmentPositionDefinitionDto,
  ) => {
    const response = await apiClient.post(
      '/government-positions/definitions',
      dto,
    )
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
