import { Controller, Get, Query } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { PrismaService } from '@prisma/prisma.service'

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
  countryId: string
  parentId?: string | null
  children?: AdministrativeDivisionResponseDto[]
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

@ApiTags('cities')
@Controller('cities')
export class CityController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 행정구역 목록 조회
   * GET /cities/administrative-divisions?countryId=xxx
   */
  @Get('administrative-divisions')
  async getAdministrativeDivisions(
    @Query('countryId') countryId?: string,
  ): Promise<AdministrativeDivisionResponseDto[]> {
    const list = await this.prisma.administrativeDivision.findMany({
      where: {
        ...(countryId ? { countryId } : {}),
        parentId: null, // 최상위만 (children은 nested로)
      },
      orderBy: { name: 'asc' },
      include: {
        children: {
          orderBy: { name: 'asc' },
        },
      },
    })
    const mapDiv = (d: any): AdministrativeDivisionResponseDto => ({
      id: d.id,
      name: d.name,
      localName: d.localName ?? null,
      countryId: d.countryId,
      parentId: d.parentId ?? null,
      children: d.children?.map(mapDiv) ?? [],
    })
    return list.map(mapDiv)
  }

  /**
   * DB 도시 검색 (이름 부분 일치)
   * GET /cities/search?q=서울&countryId=xxx
   */
  @Get('search')
  async searchCities(
    @Query('q') q?: string,
    @Query('countryId') countryId?: string,
  ): Promise<CityResponseDto[]> {
    if (!q || q.trim().length < 1) return []
    const list = await this.prisma.city.findMany({
      where: {
        name: { contains: q.trim() },
        ...(countryId ? { countryId } : {}),
      },
      orderBy: { name: 'asc' },
      take: 10,
      include: {
        administrativeDivision: { select: { id: true, name: true } },
      },
    })
    return list.map((c: any) => ({
      id: c.id,
      name: c.name,
      countryId: c.countryId,
      countryName: null,
      administrativeDivisionId: c.administrativeDivisionId ?? null,
      administrativeDivisionName: c.administrativeDivision?.name ?? null,
      population: c.population != null ? Number(c.population) : null,
      areaSqKm: c.areaSqKm != null ? String(c.areaSqKm) : null,
    }))
  }

  /**
   * 도시 목록 조회 (선택: countryId로 필터)
   */
  @Get()
  async getCities(
    @Query('countryId') countryId?: string,
    @Query('administrativeDivisionId') administrativeDivisionId?: string,
  ): Promise<CityResponseDto[]> {
    const list = await this.prisma.city.findMany({
      where: {
        ...(countryId ? { countryId } : {}),
        ...(administrativeDivisionId ? { administrativeDivisionId } : {}),
      },
      orderBy: [{ countryId: 'asc' }, { name: 'asc' }],
      include: {
        administrativeDivision: { select: { id: true, name: true } },
      },
    })
    return list.map((c: any) => ({
      id: c.id,
      name: c.name,
      countryId: c.countryId,
      administrativeDivisionId: c.administrativeDivisionId ?? null,
      administrativeDivisionName: c.administrativeDivision?.name ?? null,
      population: c.population != null ? Number(c.population) : null,
      areaSqKm: c.areaSqKm != null ? String(c.areaSqKm) : null,
    }))
  }

  /**
   * Nominatim (OpenStreetMap) 장소 검색 프록시
   * 브라우저 CORS/User-Agent 제한 우회용
   * GET /cities/place-search?q=서울&countryCode=kr&limit=8
   */
  @Get('place-search')
  async searchPlaces(
    @Query('q') q?: string,
    @Query('countryCode') countryCode?: string,
    @Query('limit') limit?: string,
  ): Promise<PlaceSearchResult[]> {
    if (!q || q.trim().length < 2) return []

    const query = q.trim()
    const maxResults = limit ?? '8'

    const buildParams = (overrideQ?: string) => {
      const p = new URLSearchParams({
        q: overrideQ ?? query,
        format: 'json',
        addressdetails: '1',
        namedetails: '1',
        limit: maxResults,
        dedupe: '1',
        featuretype: 'city',
      })
      if (countryCode) p.set('countrycodes', countryCode.toLowerCase())
      return p
    }

    const nominatimFetch = async (params: URLSearchParams, lang: string): Promise<any[]> => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?${params}`,
          {
            headers: {
              'User-Agent': 'Papyrus-HistoryApp/1.0 (admin@papyrus.com)',
              'Accept-Language': lang,
            },
          },
        )
        if (!res.ok) return []
        return res.json()
      } catch {
        return []
      }
    }

    const mapItem = (item: any): PlaceSearchResult => {
      const addr = item.address ?? {}
      const namedetails = item.namedetails ?? {}
      const region = addr.state ?? addr.province ?? addr.county ?? ''
      // 한국어 이름 우선, 없으면 name 필드, 없으면 display_name 첫 토큰
      const shortName =
        namedetails['name:ko']?.trim() ||
        item.name?.trim() ||
        item.display_name.split(',')[0].trim()

      return {
        placeId: String(item.place_id),
        displayName: item.display_name,
        shortName,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        countryCode: addr.country_code?.toUpperCase(),
        country: addr.country,
        region,
        city: addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? '',
      }
    }

    try {
      // 1차: 한국어 Accept-Language로 검색
      let data = await nominatimFetch(buildParams(), 'ko,en')

      // 2차: 결과 없으면 featuretype 제한 풀고 재시도
      if (!data.length) {
        const p = buildParams()
        p.delete('featuretype')
        data = await nominatimFetch(p, 'ko,en')
      }

      // 3차: 그래도 없으면 영어로만
      if (!data.length) {
        data = await nominatimFetch(buildParams(), 'en')
      }

      return data.map(mapItem)
    } catch {
      return []
    }
  }
}
