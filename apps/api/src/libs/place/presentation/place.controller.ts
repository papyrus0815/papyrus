import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { PlaceKind } from '@prisma/client'

import { Public } from '../../shared/auth'
import {
  PlaceService,
  PlaceSuggestionDto,
  PlaceSummaryDto,
  ResolvePlaceInput,
} from '../application/place.service'
import {
  DecomposedPlaceClaim,
  decomposeHistoricalPlaceText,
} from '../domain/place-text-decomposer'

export interface PlaceMapConfigDto {
  googleMapsWebApiKey: string | null
  hasServerGooglePlacesKey: boolean
}

const PLACE_KINDS = new Set<string>(Object.values(PlaceKind))

@ApiTags('places')
@Controller('places')
export class PlaceController {
  constructor(private readonly placeService: PlaceService) {}

  /** 클라이언트 Google Maps 설정 조회 */
  @Public()
  @Get('config')
  getConfig(): PlaceMapConfigDto {
    return this.placeService.getClientMapConfig()
  }

  /** 등록된 Place 정본 목록 검색 */
  @Public()
  @Get()
  async list(
    @Query('q') q?: string,
    @Query('kind') kind?: string,
    @Query('countryId') countryId?: string,
    @Query('limit') limit?: string,
  ): Promise<PlaceSummaryDto[]> {
    const parsedKind =
      kind && PLACE_KINDS.has(kind) ? (kind as PlaceKind) : undefined
    const parsedLimit = limit ? Number(limit) : undefined
    return this.placeService.list({
      q,
      kind: parsedKind,
      countryId,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    })
  }

  /**
   * 통합 장소 제안 (DB Place + Google Places API [키 설정 시] + Nominatim 폴백)
   * GET /places/suggest?q=와카야마성&countryCode=JP&limit=10
   */
  @Public()
  @Get('suggest')
  async suggest(
    @Query('q') q?: string,
    @Query('countryCode') countryCode?: string,
    @Query('limit') limit?: string,
  ): Promise<PlaceSuggestionDto[]> {
    const parsedLimit = limit ? Number(limit) : 10
    return this.placeService.searchSuggestions(
      q,
      countryCode,
      Number.isFinite(parsedLimit) ? parsedLimit : 10,
    )
  }

  /** 역사 지명 텍스트 분해 미리보기 (당대 표기 · 현대 지명 · 일설 분리) */
  @Public()
  @Get('decompose')
  decompose(
    @Query('text') text?: string,
    @Query('countryName') countryName?: string,
  ): DecomposedPlaceClaim[] {
    return decomposeHistoricalPlaceText(text, {
      fallbackCountryName: countryName,
    })
  }

  /** Place 상세 허브 (해당 장소 출생·사망·묘소 인물 포함) */
  @Public()
  @Get(':id')
  async getById(@Param('id') id: string): Promise<any> {
    return this.placeService.getById(id)
  }

  /** 장소 선택/핀 지정 시 정본 Place 즉석 생성 또는 재사용 (Inline Upsert) */
  @Post('resolve')
  async resolve(@Body() body: ResolvePlaceInput): Promise<PlaceSummaryDto> {
    return this.placeService.resolveOrUpsertPlace(body)
  }

  /** Place 정본 좌표·주소·별칭 보정 */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: Partial<ResolvePlaceInput>,
  ): Promise<PlaceSummaryDto> {
    return this.placeService.updatePlace(id, body)
  }
}
