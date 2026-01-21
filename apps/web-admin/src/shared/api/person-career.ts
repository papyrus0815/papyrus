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
 * 운동선수 경력 생성 DTO
 */
export interface CreateAthleteCareerDto {
  personId: string
  timelineTitle?: string
  showPositionInfo?: boolean
  positionId: string // 직급 ID (축구선수, 야구선수 등)
  jobCategoryId?: string
  organizationId?: string // 팀 ID
  sport?: string // 종목 (축구, 야구 등)
  position?: string // 포지션 (공격수, 투수 등)
  jerseyNumber?: number // 등번호
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
