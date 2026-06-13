import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiTags } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator'

import { CityService } from '../application/city.service'

export type CityResponseDto = {
  id: string
  name: string
  countryId: string
  administrativeDivisionId?: string | null
  administrativeDivisionName?: string | null
  population?: number | null
  areaSqKm?: number | string | null
}

/** 행정구역 체계 (시기별 편제 — 예: 팔도제 1413–1895) */
export type AdminDivisionSchemeResponseDto = {
  id: string
  countryId: string | null
  historicalCountryId: string | null
  name: string
  description: string | null
  /** 시행 시작일 (ISO) — NULL이면 미상 */
  startDate: string | null
  /** 시행 종료일 (ISO) — NULL이면 현행 */
  endDate: string | null
  /** 이 체계에 직접 소속된 구역 수 */
  divisionCount: number
  /** 전체 목록(all) 조회 시 소속 국가 표시명 */
  ownerName?: string | null
}

export class CreateAdminDivisionSchemeBody {
  /** 현대 국가 ID — historicalCountryId와 둘 중 하나만 설정 */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  countryId?: string | null

  /** 역사적 국가 ID — countryId와 둘 중 하나만 설정 */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  historicalCountryId?: string | null

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string

  @IsOptional()
  @IsString()
  description?: string | null

  @IsOptional()
  @IsString()
  startDate?: string | null

  @IsOptional()
  @IsString()
  endDate?: string | null
}

export class UpdateAdminDivisionSchemeBody {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string

  @IsOptional()
  @IsString()
  description?: string | null

  @IsOptional()
  @IsString()
  startDate?: string | null

  @IsOptional()
  @IsString()
  endDate?: string | null
}

/** 행정구역 서술 섹션 (제목 있는 다중 본문) */
export type AdminDivisionSectionResponseDto = {
  id: string
  title: string
  content: string
  order: number
}

export type AdministrativeDivisionResponseDto = {
  id: string
  name: string
  localName?: string | null
  nameMeaning?: string | null
  /** 현대 국가 소속이면 설정 (역사적 국가 소속이면 null) */
  countryId: string | null
  /** 역사적 국가 소속이면 설정 (조선 팔도 등) */
  historicalCountryId?: string | null
  adminDivisionId: string
  /** 소속 체계 ID (시기별 편제). NULL이면 체계 미지정 */
  schemeId?: string | null
  parentId?: string | null
  centerLat?: number | null
  centerLng?: number | null
  establishedDate?: string | null
  abolishedDate?: string | null
  predecessorId?: string | null
  cityCount?: number
  successorCount?: number
  children?: AdministrativeDivisionResponseDto[]
}

export type AdminDivisionConfigResponseDto = {
  id: string
  countryId: string | null
  historicalCountryId?: string | null
  /** 소속 체계 ID. NULL이면 체계 공용 */
  schemeId?: string | null
  divisionLevel: number
  divisionLabel: string
  description: string | null
}

export class CreateAdminDivisionConfigBody {
  /** 현대 국가 ID — historicalCountryId와 둘 중 하나만 설정 */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  countryId?: string | null

  /** 역사적 국가 ID — countryId와 둘 중 하나만 설정 */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  historicalCountryId?: string | null

  /** 소속 체계 ID — 체계별 단위(예: 23부제의 '부') 등록 시 지정 */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  schemeId?: string | null

  @IsInt()
  @Min(1)
  @Max(20)
  divisionLevel!: number

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  divisionLabel!: string

  @IsOptional()
  @IsString()
  description?: string | null
}

export class UpdateAdminDivisionConfigBody {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  divisionLevel?: number

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  divisionLabel?: string

  @IsOptional()
  @IsString()
  description?: string | null
}

export class CreateAdministrativeDivisionBody {
  /** 현대 국가 ID — historicalCountryId와 둘 중 하나만 설정 */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  countryId?: string | null

  /** 역사적 국가 ID — countryId와 둘 중 하나만 설정 */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  historicalCountryId?: string | null

  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  adminDivisionId!: string

  /** 소속 체계 ID (시기별 편제) */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  schemeId?: string | null

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  localName?: string | null

  @IsOptional()
  @IsString()
  nameMeaning?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(36)
  parentId?: string | null

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  centerLat?: number | null

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  centerLng?: number | null

  @IsOptional()
  @IsString()
  establishedDate?: string | null

  @IsOptional()
  @IsString()
  abolishedDate?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(36)
  predecessorId?: string | null
}

/** 서술 섹션 수정 항목 — 전체 배열 교체(delete-and-recreate)용 */
export class AdminDivisionSectionItem {
  /** 섹션 제목 — 비워둘 수 있음(무제 섹션) */
  @IsString()
  @MaxLength(500)
  title!: string

  /** 섹션 내용 (리치 텍스트 HTML) */
  @IsString()
  content!: string

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number
}

export class UpdateAdministrativeDivisionBody {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  adminDivisionId?: string

  /** 소속 체계 변경 — null이면 체계 해제 */
  @IsOptional()
  @IsString()
  @MaxLength(36)
  schemeId?: string | null

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  localName?: string | null

  @IsOptional()
  @IsString()
  nameMeaning?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(36)
  parentId?: string | null

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  centerLat?: number | null

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  centerLng?: number | null

  @IsOptional()
  @IsString()
  establishedDate?: string | null

  @IsOptional()
  @IsString()
  abolishedDate?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(36)
  predecessorId?: string | null

  /**
   * 서술 섹션 전체 교체 — undefined면 유지, 배열이면 기존 섹션을 모두 지우고
   * 이 배열로 재생성 (EventSection과 동일한 시맨틱).
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminDivisionSectionItem)
  sections?: AdminDivisionSectionItem[]
}

/** 평탄 검색 결과 — 트리에서 부모 경로까지 포함 */
export type AdministrativeDivisionSearchResult = {
  id: string
  name: string
  localName: string | null
  countryId: string | null
  historicalCountryId?: string | null
  schemeId?: string | null
  divisionLevel: number
  divisionLabel: string
  /** 루트 → 본인 직전 부모까지의 이름 체인 (본인 제외) */
  parentPath: string[]
  abolished: boolean
  centerLat: number | null
  centerLng: number | null
}

export class BulkCreateAdministrativeDivisionItem {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  localName?: string | null

  @IsOptional()
  @IsString()
  nameMeaning?: string | null

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  centerLat?: number | null

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  centerLng?: number | null
}

export class BulkCreateAdministrativeDivisionsBody {
  /** 현대 국가 ID — historicalCountryId와 둘 중 하나만 설정 */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  countryId?: string | null

  /** 역사적 국가 ID — countryId와 둘 중 하나만 설정 */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  historicalCountryId?: string | null

  /** 소속 체계 ID — 모든 항목이 이 체계로 등록됨 */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  schemeId?: string | null

  /** 단위 이름 (없으면 생성). configId가 있으면 우선. */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  divisionLabel?: string

  /** 기존 단위 ID (있으면 그대로 사용). */
  @IsOptional()
  @IsString()
  @MaxLength(36)
  adminDivisionId?: string

  /** 모든 항목이 같은 레벨에 들어감 (1=최상위, 2=하위 등). */
  @IsInt()
  @Min(1)
  @Max(20)
  divisionLevel!: number

  /** 모든 항목이 동일 부모 아래에 들어가는 경우 (level > 1) */
  @IsOptional()
  @IsString()
  @MaxLength(36)
  parentId?: string | null

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkCreateAdministrativeDivisionItem)
  items!: BulkCreateAdministrativeDivisionItem[]
}

export type BulkCreateResult = {
  created: number
  /** 생성된 항목들 — name → id (자식 등록 시 부모 매핑용) */
  createdItems: Array<{ id: string; name: string }>
  skipped: Array<{ name: string; reason: string }>
}

export type PlaceSearchResult = {
  /** DB City.id (DB 검색 결과일 때만 존재) */
  cityId?: string
  placeId: string
  displayName: string
  shortName: string
  lat: number
  lng: number
  countryCode?: string
  country?: string
  region?: string
  city?: string
  /** DB에 등록된 도시 여부 */
  isRegistered?: boolean
}

/**
 * City / AdministrativeDivision HTTP 엔드포인트.
 *
 * 검증·트랜잭션·쿼리 등 비즈니스 로직은 모두 CityService에 위임하고,
 * 여기서는 라우팅·인증·입력 바인딩만 담당한다.
 */
@ApiTags('cities')
@Controller('cities')
@UseGuards(AuthGuard('jwt'))
export class CityController {
  constructor(private readonly cityService: CityService) {}

  /**
   * 행정구역 트리 조회 (N-depth, 모든 자손 포함)
   * GET /cities/administrative-divisions?countryId=xxx 또는 ?historicalCountryId=xxx
   */
  @Get('administrative-divisions')
  getAdministrativeDivisions(
    @Query('countryId') countryId?: string,
    @Query('historicalCountryId') historicalCountryId?: string,
    @Query('schemeId') schemeId?: string,
  ): Promise<AdministrativeDivisionResponseDto[]> {
    return this.cityService.getAdministrativeDivisions(
      countryId,
      historicalCountryId,
      schemeId,
    )
  }

  /**
   * 국가별 행정구역 단위(레벨) 설정 조회
   * GET /cities/admin-division-configs?countryId=xxx 또는 ?historicalCountryId=xxx
   */
  @Get('admin-division-configs')
  getAdminDivisionConfigs(
    @Query('countryId') countryId?: string,
    @Query('historicalCountryId') historicalCountryId?: string,
    @Query('schemeId') schemeId?: string,
  ): Promise<AdminDivisionConfigResponseDto[]> {
    return this.cityService.getAdminDivisionConfigs(
      countryId,
      historicalCountryId,
      schemeId,
    )
  }

  /**
   * 행정구역 체계 목록
   * GET /cities/admin-division-schemes?countryId=|historicalCountryId=|all=true
   * all=true면 모든 국가의 체계 + 소속 국가 표시명(ownerName) — 비교 모드용
   */
  @Get('admin-division-schemes')
  getAdminDivisionSchemes(
    @Query('countryId') countryId?: string,
    @Query('historicalCountryId') historicalCountryId?: string,
    @Query('all') all?: string,
  ): Promise<AdminDivisionSchemeResponseDto[]> {
    return this.cityService.getAdminDivisionSchemes(
      countryId,
      historicalCountryId,
      all === 'true',
    )
  }

  /**
   * 행정구역 체계 생성
   * POST /cities/admin-division-schemes
   */
  @Post('admin-division-schemes')
  createAdminDivisionScheme(
    @Body() body: CreateAdminDivisionSchemeBody,
  ): Promise<AdminDivisionSchemeResponseDto> {
    return this.cityService.createAdminDivisionScheme(body)
  }

  /**
   * 행정구역 체계 수정
   * PATCH /cities/admin-division-schemes/:id
   */
  @Patch('admin-division-schemes/:id')
  updateAdminDivisionScheme(
    @Param('id') id: string,
    @Body() body: UpdateAdminDivisionSchemeBody,
  ): Promise<AdminDivisionSchemeResponseDto> {
    return this.cityService.updateAdminDivisionScheme(id, body)
  }

  /**
   * 행정구역 체계 삭제 (소속 구역·단위가 있으면 거부)
   * DELETE /cities/admin-division-schemes/:id
   */
  @Delete('admin-division-schemes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAdminDivisionScheme(@Param('id') id: string): Promise<void> {
    return this.cityService.deleteAdminDivisionScheme(id)
  }

  /**
   * 행정구역 단위 생성 (예: "도", "주")
   * POST /cities/admin-division-configs
   */
  @Post('admin-division-configs')
  createAdminDivisionConfig(
    @Body() body: CreateAdminDivisionConfigBody,
  ): Promise<AdminDivisionConfigResponseDto> {
    return this.cityService.createAdminDivisionConfig(body)
  }

  /**
   * 행정구역 단위 수정
   * PATCH /cities/admin-division-configs/:id
   */
  @Patch('admin-division-configs/:id')
  updateAdminDivisionConfig(
    @Param('id') id: string,
    @Body() body: UpdateAdminDivisionConfigBody,
  ): Promise<AdminDivisionConfigResponseDto> {
    return this.cityService.updateAdminDivisionConfig(id, body)
  }

  /**
   * 행정구역 단위 삭제 (연결된 행정구역이 있으면 거부)
   * DELETE /cities/admin-division-configs/:id
   */
  @Delete('admin-division-configs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAdminDivisionConfig(@Param('id') id: string): Promise<void> {
    return this.cityService.deleteAdminDivisionConfig(id)
  }

  /**
   * 행정구역 생성
   * POST /cities/administrative-divisions
   */
  @Post('administrative-divisions')
  createAdministrativeDivision(
    @Body() body: CreateAdministrativeDivisionBody,
  ): Promise<AdministrativeDivisionResponseDto> {
    return this.cityService.createAdministrativeDivision(body)
  }

  /**
   * 행정구역 평탄 검색 (모든 깊이 — 부모 경로 포함)
   * GET /cities/administrative-divisions/search?q=&countryId=
   */
  @Get('administrative-divisions/search')
  searchAdministrativeDivisions(
    @Query('q') q?: string,
    @Query('countryId') countryId?: string,
    @Query('limit') limitStr?: string,
    @Query('historicalCountryId') historicalCountryId?: string,
    @Query('schemeId') schemeId?: string,
  ): Promise<AdministrativeDivisionSearchResult[]> {
    return this.cityService.searchAdministrativeDivisions(
      q,
      countryId,
      limitStr,
      historicalCountryId,
      schemeId,
    )
  }

  /**
   * 행정구역 서술 섹션 조회 (order 순)
   * GET /cities/administrative-divisions/:id/sections
   */
  @Get('administrative-divisions/:id/sections')
  getAdministrativeDivisionSections(
    @Param('id') id: string,
  ): Promise<AdminDivisionSectionResponseDto[]> {
    return this.cityService.getAdministrativeDivisionSections(id)
  }

  /**
   * 행정구역 일괄 등록
   * POST /cities/administrative-divisions/bulk
   */
  @Post('administrative-divisions/bulk')
  bulkCreateAdministrativeDivisions(
    @Body() body: BulkCreateAdministrativeDivisionsBody,
  ): Promise<BulkCreateResult> {
    return this.cityService.bulkCreateAdministrativeDivisions(body)
  }

  /**
   * 행정구역 수정
   * PATCH /cities/administrative-divisions/:id
   */
  @Patch('administrative-divisions/:id')
  updateAdministrativeDivision(
    @Param('id') id: string,
    @Body() body: UpdateAdministrativeDivisionBody,
  ): Promise<AdministrativeDivisionResponseDto> {
    return this.cityService.updateAdministrativeDivision(id, body)
  }

  /**
   * 행정구역 삭제 (자식은 cascade로 함께 삭제됨)
   * DELETE /cities/administrative-divisions/:id
   */
  @Delete('administrative-divisions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAdministrativeDivision(@Param('id') id: string): Promise<void> {
    return this.cityService.deleteAdministrativeDivision(id)
  }

  /**
   * DB 도시 검색 (이름 부분 일치)
   * GET /cities/search?q=서울&countryId=xxx
   */
  @Get('search')
  searchCities(
    @Query('q') q?: string,
    @Query('countryId') countryId?: string,
  ): Promise<CityResponseDto[]> {
    return this.cityService.searchCities(q, countryId)
  }

  /**
   * 도시 목록 조회 (선택: countryId로 필터)
   * GET /cities
   */
  @Get()
  getCities(
    @Query('countryId') countryId?: string,
    @Query('administrativeDivisionId') administrativeDivisionId?: string,
  ): Promise<CityResponseDto[]> {
    return this.cityService.getCities(countryId, administrativeDivisionId)
  }

  /**
   * Nominatim (OpenStreetMap) 장소 검색 프록시
   * GET /cities/place-search?q=서울&countryCode=kr&limit=8
   */
  @Get('place-search')
  searchPlaces(
    @Query('q') q?: string,
    @Query('countryCode') countryCode?: string,
    @Query('limit') limit?: string,
  ): Promise<PlaceSearchResult[]> {
    return this.cityService.searchPlaces(q, countryCode, limit)
  }
}
