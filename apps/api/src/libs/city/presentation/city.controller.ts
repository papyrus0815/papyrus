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

export type AdministrativeDivisionResponseDto = {
  id: string
  name: string
  localName?: string | null
  nameMeaning?: string | null
  countryId: string
  adminDivisionId: string
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
  countryId: string
  divisionLevel: number
  divisionLabel: string
  description: string | null
}

export class CreateAdminDivisionConfigBody {
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  countryId!: string

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
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  countryId!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  adminDivisionId!: string

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

export class UpdateAdministrativeDivisionBody {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  adminDivisionId?: string

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
}

/** 평탄 검색 결과 — 트리에서 부모 경로까지 포함 */
export type AdministrativeDivisionSearchResult = {
  id: string
  name: string
  localName: string | null
  countryId: string
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
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  countryId!: string

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
   * GET /cities/administrative-divisions?countryId=xxx
   */
  @Get('administrative-divisions')
  getAdministrativeDivisions(
    @Query('countryId') countryId?: string,
  ): Promise<AdministrativeDivisionResponseDto[]> {
    return this.cityService.getAdministrativeDivisions(countryId)
  }

  /**
   * 국가별 행정구역 단위(레벨) 설정 조회
   * GET /cities/admin-division-configs?countryId=xxx
   */
  @Get('admin-division-configs')
  getAdminDivisionConfigs(
    @Query('countryId') countryId?: string,
  ): Promise<AdminDivisionConfigResponseDto[]> {
    return this.cityService.getAdminDivisionConfigs(countryId)
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
  ): Promise<AdministrativeDivisionSearchResult[]> {
    return this.cityService.searchAdministrativeDivisions(q, countryId, limitStr)
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
