import {
  IsString,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsNumber,
  IsArray,
  ValidateNested,
  IsIn,
} from 'class-validator'
import { Type } from 'class-transformer'

/**
 * Career 이미지 DTO
 */
export class CareerImageDto {
  @IsString()
  url!: string

  @IsOptional()
  @IsString()
  description?: string
}

/**
 * 군인 경력 생성 DTO
 */
export class CreateMilitaryCareerDto {
  @IsString()
  personId!: string

  @IsOptional()
  @IsString()
  timelineTitle?: string

  @IsOptional()
  @IsBoolean()
  showPositionInfo?: boolean

  @IsString()
  rankId!: string // 계급 ID (대장, 중장 등)

  @IsOptional()
  @IsString()
  jobCategoryId?: string

  @IsString()
  organizationId!: string // 소속 조직 ID

  @IsOptional()
  @IsString()
  branch?: string // 군종 (육군, 해군, 공군)

  @IsOptional()
  @IsString()
  position?: string // 역할/보직 (사령관, 참모장 등)

  @IsOptional()
  @IsNumber()
  termNumber?: number // 대수

  @IsOptional()
  @IsDateString()
  startDate?: string

  @IsOptional()
  @IsDateString()
  endDate?: string

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CareerImageDto)
  images?: CareerImageDto[]
}

/**
 * 정치인/공무원 경력 생성 DTO
 */
export class CreateGovernmentCareerDto {
  @IsString()
  personId!: string

  @IsOptional()
  @IsString()
  timelineTitle?: string

  @IsOptional()
  @IsBoolean()
  showPositionInfo?: boolean

  @IsString()
  positionId!: string // 직급 ID (대통령, 장관, 서기장 등)

  @IsOptional()
  @IsString()
  jobCategoryId?: string

  @IsOptional()
  @IsString()
  organizationId?: string // 소속 기관 ID

  @IsString()
  countryId!: string // 국가 ID

  @IsOptional()
  @IsString()
  department?: string // 부처/부서

  @IsOptional()
  @IsString()
  role?: string // 역할

  @IsOptional()
  @IsNumber()
  termNumber?: number // 대수 (제34대 대통령)

  @IsOptional()
  @IsDateString()
  startDate?: string

  @IsOptional()
  @IsDateString()
  endDate?: string

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CareerImageDto)
  images?: CareerImageDto[]
}

/**
 * 기업인 경력 생성 DTO
 */
export class CreateBusinessCareerDto {
  @IsString()
  personId!: string

  @IsOptional()
  @IsString()
  timelineTitle?: string

  @IsOptional()
  @IsBoolean()
  showPositionInfo?: boolean

  @IsString()
  positionId!: string // 직급 ID (CEO, CFO 등)

  @IsOptional()
  @IsString()
  jobCategoryId?: string

  @IsString()
  organizationId!: string // 회사 ID

  @IsOptional()
  @IsString()
  title?: string // 직함

  @IsOptional()
  @IsString()
  level?: string // 직급 레벨

  @IsOptional()
  @IsDateString()
  startDate?: string

  @IsOptional()
  @IsDateString()
  endDate?: string

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CareerImageDto)
  images?: CareerImageDto[]
}

/**
 * 학자 경력 생성 DTO
 */
export class CreateAcademicCareerDto {
  @IsString()
  personId!: string

  @IsOptional()
  @IsString()
  timelineTitle?: string

  @IsOptional()
  @IsBoolean()
  showPositionInfo?: boolean

  @IsString()
  positionId!: string // 직급 ID (교수, 연구원 등)

  @IsOptional()
  @IsString()
  jobCategoryId?: string

  @IsString()
  organizationId!: string // 대학/연구소 ID

  @IsOptional()
  @IsString()
  department?: string // 학과

  @IsOptional()
  @IsString()
  researchField?: string // 연구 분야

  @IsOptional()
  @IsDateString()
  startDate?: string

  @IsOptional()
  @IsDateString()
  endDate?: string

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CareerImageDto)
  images?: CareerImageDto[]
}

/**
 * 운동선수 경력 생성 DTO
 */
export class CreateAthleteCareerDto {
  @IsString()
  personId!: string

  @IsOptional()
  @IsString()
  timelineTitle?: string

  @IsOptional()
  @IsBoolean()
  showPositionInfo?: boolean

  @IsString()
  positionId!: string // 직급 ID (축구선수, 야구선수 등)

  @IsOptional()
  @IsString()
  jobCategoryId?: string

  @IsOptional()
  @IsString()
  organizationId?: string // 팀 ID

  @IsOptional()
  @IsString()
  sport?: string // 종목 (축구, 야구 등)

  @IsOptional()
  @IsString()
  position?: string // 포지션 (공격수, 투수 등)

  @IsOptional()
  @IsNumber()
  jerseyNumber?: number // 등번호

  @IsOptional()
  @IsDateString()
  startDate?: string

  @IsOptional()
  @IsDateString()
  endDate?: string

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CareerImageDto)
  images?: CareerImageDto[]
}

/**
 * 종교인 경력 생성 DTO
 */
export class CreateReligiousCareerDto {
  @IsString()
  personId!: string

  @IsOptional()
  @IsString()
  timelineTitle?: string

  @IsOptional()
  @IsBoolean()
  showPositionInfo?: boolean

  @IsString()
  positionId!: string // 직급 ID (성직자, 수도자 등)

  @IsOptional()
  @IsString()
  jobCategoryId?: string

  @IsOptional()
  @IsString()
  organizationId?: string // 종교 조직 ID

  @IsOptional()
  @IsString()
  religion?: string // 종교

  @IsOptional()
  @IsString()
  denomination?: string // 종파

  @IsOptional()
  @IsString()
  rank?: string // 직급/지위

  @IsOptional()
  @IsDateString()
  startDate?: string

  @IsOptional()
  @IsDateString()
  endDate?: string

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CareerImageDto)
  images?: CareerImageDto[]
}

/**
 * 예술가 경력 생성 DTO
 */
export class CreateArtistCareerDto {
  @IsString()
  personId!: string

  @IsOptional()
  @IsString()
  timelineTitle?: string

  @IsOptional()
  @IsBoolean()
  showPositionInfo?: boolean

  @IsString()
  positionId!: string // 직급 ID (화가, 조각가 등)

  @IsOptional()
  @IsString()
  jobCategoryId?: string

  @IsOptional()
  @IsString()
  organizationId?: string

  @IsOptional()
  @IsString()
  artForm?: string // 예술 분야 (회화, 조각 등)

  @IsOptional()
  @IsString()
  style?: string // 스타일/장르

  @IsOptional()
  @IsDateString()
  startDate?: string

  @IsOptional()
  @IsDateString()
  endDate?: string

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CareerImageDto)
  images?: CareerImageDto[]
}

/**
 * 언론인 경력 생성 DTO
 */
export class CreateMediaCareerDto {
  @IsString()
  personId!: string

  @IsOptional()
  @IsString()
  timelineTitle?: string

  @IsOptional()
  @IsBoolean()
  showPositionInfo?: boolean

  @IsString()
  positionId!: string // 직급 ID (기자, 앵커 등)

  @IsOptional()
  @IsString()
  jobCategoryId?: string

  @IsOptional()
  @IsString()
  organizationId?: string // 언론사 ID

  @IsOptional()
  @IsString()
  mediaType?: string // 매체 유형 (신문, 방송 등)

  @IsOptional()
  @IsString()
  role?: string // 역할

  @IsOptional()
  @IsDateString()
  startDate?: string

  @IsOptional()
  @IsDateString()
  endDate?: string

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CareerImageDto)
  images?: CareerImageDto[]
}

/**
 * 법조인 경력 생성 DTO
 */
export class CreateLegalCareerDto {
  @IsString()
  personId!: string

  @IsOptional()
  @IsString()
  timelineTitle?: string

  @IsOptional()
  @IsBoolean()
  showPositionInfo?: boolean

  @IsString()
  positionId!: string // 직급 ID (판사, 검사, 변호사)

  @IsOptional()
  @IsString()
  jobCategoryId?: string

  @IsOptional()
  @IsString()
  organizationId?: string // 법원/검찰청/로펌 ID

  @IsOptional()
  @IsString()
  specialization?: string // 전문 분야

  @IsOptional()
  @IsString()
  courtLevel?: string // 법원 등급 (대법원, 고등법원 등)

  @IsOptional()
  @IsDateString()
  startDate?: string

  @IsOptional()
  @IsDateString()
  endDate?: string

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CareerImageDto)
  images?: CareerImageDto[]
}

/**
 * 의료인 경력 생성 DTO
 */
export class CreateMedicalCareerDto {
  @IsString()
  personId!: string

  @IsOptional()
  @IsString()
  timelineTitle?: string

  @IsOptional()
  @IsBoolean()
  showPositionInfo?: boolean

  @IsString()
  positionId!: string // 직급 ID (의사, 간호사 등)

  @IsOptional()
  @IsString()
  jobCategoryId?: string

  @IsOptional()
  @IsString()
  organizationId?: string // 병원 ID

  @IsOptional()
  @IsString()
  specialization?: string // 전문 분야

  @IsOptional()
  @IsString()
  department?: string // 진료과

  @IsOptional()
  @IsDateString()
  startDate?: string

  @IsOptional()
  @IsDateString()
  endDate?: string

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CareerImageDto)
  images?: CareerImageDto[]
}

/**
 * 학력 생성 DTO
 */
export class CreateEducationDto {
  @IsString()
  personId!: string

  @IsOptional()
  @IsString()
  timelineTitle?: string

  @IsString()
  organizationId!: string // 학교 ID

  @IsOptional()
  @IsString()
  educationType?: string // 학력 유형

  @IsOptional()
  @IsNumber()
  classNumber?: number // 기수 (육사 50기)

  @IsOptional()
  @IsString()
  degree?: string // 학위

  @IsOptional()
  @IsString()
  major?: string // 전공

  @IsOptional()
  @IsString()
  department?: string // 학과

  @IsOptional()
  @IsString()
  status?: string // 상태 (졸업, 수료, 중퇴)

  @IsOptional()
  @IsString()
  studentNumber?: string // 학번

  @IsOptional()
  @IsDateString()
  startDate?: string

  @IsOptional()
  @IsDateString()
  endDate?: string

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CareerImageDto)
  images?: CareerImageDto[]
}

/**
 * 수상/훈장 생성 DTO
 */
export class CreatePersonAwardDto {
  @IsString()
  personId!: string

  @IsString()
  awardName!: string // 수상명 (노벨 물리학상, 올림픽 금메달)

  @IsOptional()
  @IsString()
  category?: string // 분야 (물리학상, 100m 달리기)

  @IsOptional()
  @IsString()
  awardingBody?: string // 수여 기관

  @IsOptional()
  @IsDateString()
  awardDate?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CareerImageDto)
  images?: CareerImageDto[]
}

/**
 * 국가원수/왕위 재임 기록 생성 DTO
 */
export class CreateGovernmentPositionTenureDto {
  @IsString()
  personId!: string

  @IsString()
  positionType!: 'HEAD_OF_STATE' | 'HEAD_OF_GOVERNMENT' | 'HEIR_APPARENT' | 'REGENT' | 'CABINET_MINISTER' | 'VICE_MINISTER' | 'LEGISLATOR' | 'JUDICIARY' | 'LOCAL_GOVERNMENT' | 'SPECIAL_POSITION' | 'MILITARY_COMMANDER' | 'ROYAL_NOBLE_TITLE' | 'OTHER' // 직위 타입

  /** 직위명 — positionDefinitionId가 있으면 생략(정의에서 표시), 기타 직접 입력 시 필수 */
  @IsOptional()
  @IsString()
  title?: string | null

  @IsOptional()
  @IsString()
  titleEn?: string | null // 영문 직위명 (기타 시에만)

  @IsOptional()
  @IsBoolean()
  showPositionInfo?: boolean // 사건 타임라인에 직책 정보 표시 여부

  @IsOptional()
  @IsString()
  countryId?: string // 현대 국가 ID

  @IsOptional()
  @IsString()
  historicalCountryId?: string // 역사적 국가 ID

  @IsOptional()
  @IsString()
  positionDefinitionId?: string // 직위 정의 ID (선택사항)

  @IsOptional()
  @IsNumber()
  termNumber?: number // 대수 (제20대)

  @IsOptional()
  @IsNumber()
  subTermNumber?: number // 기수 (1기, 2기 — 같은 대수 내 복수 임기 구분)

  @IsOptional()
  @IsNumber()
  regnalNumber?: number // 재위번호 (루이 14세의 "14")

  @IsDateString()
  startDate!: string // 취임일 (필수)

  @IsOptional()
  @IsDateString()
  endDate?: string // 퇴임일

  @IsOptional()
  @IsString()
  appointmentMethod?: 'DIRECT_ELECTION' | 'INDIRECT_ELECTION' | 'APPOINTMENT' | 'HEREDITARY' | 'COUP' | 'PARLIAMENTARY_ELECTION' | 'OTHER'

  @IsOptional()
  @IsString()
  endReason?: 'TERM_COMPLETED' | 'RESIGNATION' | 'ABDICATION' | 'SUCCESSION_TRANSFER' | 'REMOVAL' | 'IMPEACHMENT' | 'DEATH_IN_OFFICE' | 'OVERTHROWN' | 'WAR_DEFEAT' | 'STATE_DISSOLVED' | 'OTHER'

  @IsOptional()
  @IsString()
  endReasonDetail?: string

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @IsNumber()
  priority?: number

  /** 소속 행정부(Cabinet) ID — 이 각료/총독 재임이 속한 행정부 */
  @IsOptional()
  @IsString()
  cabinetId?: string | null

  /** 소속 중앙부처 ID — 이 재임이 실제 속한 국가별 부처 인스턴스 (예: 미국 국무부, 한국 외교부) */
  @IsOptional()
  @IsString()
  administrationDepartmentId?: string | null

  /** 당선된 선거 후보(ElectionCandidacy)와 연결 — 이 임기가 해당 선거로 시작된 경우 */
  @IsOptional()
  @IsString()
  electionCandidacyId?: string | null

  /** 재임 권한 근원. 생략 시 electionCandidacyId가 있으면 ELECTION, 없으면 UNKNOWN */
  @IsOptional()
  @IsIn(['UNKNOWN', 'ELECTION', 'APPOINTMENT', 'SUCCESSION', 'HEREDITARY', 'OTHER'])
  mandateSource?: 'UNKNOWN' | 'ELECTION' | 'APPOINTMENT' | 'SUCCESSION' | 'HEREDITARY' | 'OTHER'
}

/**
 * 군주·재위 전용 기록 (SovereignReign 테이블) — 행정부(Cabinet)와 별도
 */
export class CreateSovereignReignDto {
  @IsString()
  personId!: string

  @IsOptional()
  @IsString()
  countryId?: string

  @IsOptional()
  @IsString()
  historicalCountryId?: string

  @IsOptional()
  @IsString()
  positionDefinitionId?: string

  @IsOptional()
  @IsNumber()
  termNumber?: number

  @IsOptional()
  @IsNumber()
  subTermNumber?: number

  @IsOptional()
  @IsNumber()
  regnalNumber?: number

  @IsDateString()
  startDate!: string

  @IsOptional()
  @IsDateString()
  endDate?: string

  @IsOptional()
  @IsString()
  appointmentMethod?: 'DIRECT_ELECTION' | 'INDIRECT_ELECTION' | 'APPOINTMENT' | 'HEREDITARY' | 'COUP' | 'PARLIAMENTARY_ELECTION' | 'OTHER'

  @IsOptional()
  @IsString()
  endReason?: 'TERM_COMPLETED' | 'RESIGNATION' | 'ABDICATION' | 'SUCCESSION_TRANSFER' | 'REMOVAL' | 'IMPEACHMENT' | 'DEATH_IN_OFFICE' | 'OVERTHROWN' | 'WAR_DEFEAT' | 'STATE_DISSOLVED' | 'OTHER'

  @IsOptional()
  @IsString()
  endReasonDetail?: string

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @IsBoolean()
  showPositionInfo?: boolean
}
