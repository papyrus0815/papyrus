import { IsString, IsOptional, IsDateString, IsBoolean, IsNumber, IsArray, ValidateNested } from 'class-validator'
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
