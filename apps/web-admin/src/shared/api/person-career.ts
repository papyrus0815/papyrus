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
 * 정치인/공무원 경력 생성 DTO
 */
export interface CreateGovernmentCareerDto {
  personId: string
  timelineTitle?: string
  showPositionInfo?: boolean
  positionId: string // 직급 ID (대통령, 장관, 서기장 등)
  jobCategoryId?: string
  organizationId?: string // 소속 기관 ID
  countryId: string // 국가 ID
  department?: string // 부처/부서
  role?: string // 역할
  termNumber?: number // 대수 (제34대 대통령)
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
   * 정치인/공무원 경력 추가
   */
  addGovernmentCareer: async (dto: CreateGovernmentCareerDto) => {
    const response = await apiClient.post('/persons/careers/government', dto)
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
