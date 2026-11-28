import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  PlaceCoordinatePrecision,
  PlaceKind,
  PlaceNameKind,
  Prisma,
} from '@prisma/client'

import { PrismaService } from '@prisma/prisma.service'

import { inferPlaceKindAndScale } from '../domain/place-text-decomposer'

export interface PlaceSummaryDto {
  id: string
  kind: PlaceKind
  name: string
  localName: string | null
  modernAddress: string | null
  description: string | null
  latitude: number | null
  longitude: number | null
  coordinatePrecision: PlaceCoordinatePrecision | null
  googlePlaceId: string | null
  externalKey: string | null
  defaultZoom: number | null
  population: number | null
  areaSqKm: number | null
  parentPlaceId: string | null
  countryId: string | null
  historicalCountryId: string | null
  administrativeDivisionId: string | null
  countryName?: string | null
}

export interface PlaceSuggestionDto {
  /** 이미 DB Place 정본에 등록된 경우 존재 */
  placeId: string | null
  isRegistered: boolean
  source: 'db' | 'google' | 'nominatim'
  kind: PlaceKind
  name: string
  localName: string | null
  modernAddress: string | null
  latitude: number | null
  longitude: number | null
  coordinatePrecision: PlaceCoordinatePrecision | null
  googlePlaceId: string | null
  externalKey: string | null
  defaultZoom: number
  countryCode: string | null
  countryId: string | null
  countryName: string | null
  matchedAlias: string | null
}

export interface ResolvePlaceInput {
  id?: string | null
  kind?: PlaceKind | null
  name: string
  localName?: string | null
  modernAddress?: string | null
  description?: string | null
  latitude?: number | null
  longitude?: number | null
  coordinatePrecision?: PlaceCoordinatePrecision | null
  googlePlaceId?: string | null
  externalKey?: string | null
  defaultZoom?: number | null
  countryId?: string | null
  countryCode?: string | null
  historicalCountryId?: string | null
  administrativeDivisionId?: string | null
  parentPlaceId?: string | null
  aliases?: Array<{
    name: string
    kind?: PlaceNameKind
    languageCode?: string | null
    historicalCountryId?: string | null
  }>
}

function toFiniteCoord(
  val: unknown,
  min: number,
  max: number,
): number | null {
  if (val === null || val === undefined || val === '') return null
  const num = Number(val)
  if (!Number.isFinite(num) || num < min || num > max) return null
  return Number(num.toFixed(7))
}

export function serializePlaceSummary(row: any): PlaceSummaryDto | null {
  if (!row) return null
  return {
    id: row.id,
    kind: row.kind ?? PlaceKind.SETTLEMENT,
    name: row.name,
    localName: row.localName ?? null,
    modernAddress: row.modernAddress ?? null,
    description: row.description ?? null,
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
    coordinatePrecision: row.coordinatePrecision ?? null,
    googlePlaceId: row.googlePlaceId ?? null,
    externalKey: row.externalKey ?? null,
    defaultZoom: row.defaultZoom ?? null,
    population: row.population != null ? Number(row.population) : null,
    areaSqKm: row.areaSqKm != null ? Number(row.areaSqKm) : null,
    parentPlaceId: row.parentPlaceId ?? null,
    countryId: row.countryId ?? null,
    historicalCountryId: row.historicalCountryId ?? null,
    administrativeDivisionId: row.administrativeDivisionId ?? null,
    countryName: row.country?.name ?? null,
  }
}

export const PLACE_SUMMARY_SELECT = {
  id: true,
  kind: true,
  name: true,
  localName: true,
  modernAddress: true,
  description: true,
  latitude: true,
  longitude: true,
  coordinatePrecision: true,
  googlePlaceId: true,
  externalKey: true,
  defaultZoom: true,
  population: true,
  areaSqKm: true,
  parentPlaceId: true,
  countryId: true,
  historicalCountryId: true,
  administrativeDivisionId: true,
  country: { select: { id: true, name: true, isoCode: true } },
} satisfies Prisma.PlaceSelect

@Injectable()
export class PlaceService {
  constructor(private readonly prisma: PrismaService) {}

  getServerGoogleApiKey(): string | null {
    const key =
      process.env.GOOGLE_MAPS_API_KEY?.trim() ||
      process.env.GOOGLE_PLACES_API_KEY?.trim() ||
      process.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ||
      ''
    return key.length > 0 ? key : null
  }

  getClientMapConfig() {
    const webKey =
      process.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ||
      process.env.GOOGLE_MAPS_WEB_API_KEY?.trim() ||
      null
    return {
      googleMapsWebApiKey: webKey && webKey.length > 0 ? webKey : null,
      hasServerGooglePlacesKey: this.getServerGoogleApiKey() !== null,
    }
  }

  async list(params?: {
    q?: string
    kind?: PlaceKind
    countryId?: string
    limit?: number
  }): Promise<PlaceSummaryDto[]> {
    const take = Math.min(Math.max(params?.limit ?? 30, 1), 100)
    const q = params?.q?.trim()
    const where: Prisma.PlaceWhereInput = {}
    if (params?.kind) where.kind = params.kind
    if (params?.countryId) where.countryId = params.countryId
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { localName: { contains: q } },
        { modernAddress: { contains: q } },
        { names: { some: { name: { contains: q } } } },
      ]
    }

    const rows = await this.prisma.place.findMany({
      where,
      select: PLACE_SUMMARY_SELECT,
      orderBy: [{ name: 'asc' }],
      take,
    })
    return rows
      .map((r) => serializePlaceSummary(r))
      .filter((r): r is PlaceSummaryDto => r !== null)
  }

  async getById(id: string) {
    const row = await this.prisma.place.findUnique({
      where: { id },
      include: {
        country: { select: { id: true, name: true, isoCode: true, flagEmoji: true } },
        historicalCountry: { select: { id: true, name: true } },
        administrativeDivision: { select: { id: true, name: true } },
        parentPlace: { select: PLACE_SUMMARY_SELECT },
        childPlaces: { select: PLACE_SUMMARY_SELECT, take: 30 },
        names: {
          include: {
            historicalCountry: { select: { id: true, name: true } },
          },
          orderBy: [{ kind: 'asc' }, { name: 'asc' }],
        },
        personPlaces: {
          include: {
            person: {
              select: {
                id: true,
                name: true,
                surname: true,
                profileImageUrl: true,
                birthDate: true,
                birthEra: true,
                deathDate: true,
                deathEra: true,
              },
            },
          },
          take: 50,
        },
        garrisonedMilitaryUnits: {
          select: {
            id: true,
            name: true,
            abbreviation: true,
            unitType: true,
            branch: true,
            combatArm: true,
            isActive: true,
            establishedEra: true,
            establishedYear: true,
            disbandedEra: true,
            disbandedYear: true,
            country: { select: { id: true, name: true, flagEmoji: true } },
            historicalCountry: { select: { id: true, name: true } },
          },
          take: 50,
        },
      },
    })
    if (!row) {
      throw new NotFoundException(`장소(Place)를 찾을 수 없습니다: ${id}`)
    }
    const base = serializePlaceSummary(row)!
    return {
      ...base,
      country: row.country,
      historicalCountry: row.historicalCountry,
      administrativeDivision: row.administrativeDivision,
      parentPlace: serializePlaceSummary(row.parentPlace),
      childPlaces: row.childPlaces
        .map((c) => serializePlaceSummary(c))
        .filter(Boolean),
      names: row.names,
      personPlaces: row.personPlaces,
      garrisonedMilitaryUnits: row.garrisonedMilitaryUnits,
    }
  }

  /**
   * 통합 자동완성:
   * 1순위 — 이미 등록된 DB Place (이름·원어·현대주소·시대별 별칭 PlaceName 매칭)
   * 2순위 — Google Places API (New) (키 설정 시) 또는 OpenStreetMap Nominatim (무키 폴백)
   */
  async searchSuggestions(
    rawQuery?: string,
    countryCode?: string,
    limit = 10,
  ): Promise<PlaceSuggestionDto[]> {
    const query = rawQuery?.trim() ?? ''
    if (query.length < 2) return []

    const maxItems = Math.min(Math.max(limit, 1), 20)
    const dbRows = await this.prisma.place.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { localName: { contains: query } },
          { modernAddress: { contains: query } },
          { names: { some: { name: { contains: query } } } },
        ],
      },
      include: {
        country: { select: { id: true, name: true, isoCode: true } },
        names: {
          where: { name: { contains: query } },
          select: { name: true },
          take: 1,
        },
      },
      take: Math.min(maxItems, 8),
    })

    const suggestions: PlaceSuggestionDto[] = dbRows.map((row) => ({
      placeId: row.id,
      isRegistered: true,
      source: 'db',
      kind: row.kind,
      name: row.name,
      localName: row.localName ?? null,
      modernAddress: row.modernAddress ?? null,
      latitude: row.latitude != null ? Number(row.latitude) : null,
      longitude: row.longitude != null ? Number(row.longitude) : null,
      coordinatePrecision: row.coordinatePrecision ?? null,
      googlePlaceId: row.googlePlaceId ?? null,
      externalKey: row.externalKey ?? null,
      defaultZoom: row.defaultZoom ?? 12,
      countryCode: row.country?.isoCode ?? null,
      countryId: row.countryId ?? null,
      countryName: row.country?.name ?? null,
      matchedAlias: row.names?.[0]?.name ?? null,
    }))

    const seenGoogleIds = new Set(
      suggestions.map((s) => s.googlePlaceId).filter(Boolean) as string[],
    )
    const seenExtKeys = new Set(
      suggestions.map((s) => s.externalKey).filter(Boolean) as string[],
    )

    const remaining = maxItems - suggestions.length
    if (remaining <= 0) return suggestions

    const googleKey = this.getServerGoogleApiKey()
    let externalHits: PlaceSuggestionDto[] = []
    if (googleKey) {
      externalHits = await this.fetchGooglePlacesTextSearch(
        query,
        googleKey,
        countryCode,
        remaining,
      )
    }
    if (externalHits.length === 0) {
      externalHits = await this.fetchNominatimPlaces(
        query,
        countryCode,
        remaining,
      )
    }

    for (const hit of externalHits) {
      if (hit.googlePlaceId && seenGoogleIds.has(hit.googlePlaceId)) continue
      if (hit.externalKey && seenExtKeys.has(hit.externalKey)) continue
      suggestions.push(hit)
      if (suggestions.length >= maxItems) break
    }

    return suggestions
  }

  private mapGoogleTypesToKind(types: string[] = [], name = ''): {
    kind: PlaceKind
    precision: PlaceCoordinatePrecision
    defaultZoom: number
  } {
    if (types.some((t) => ['cemetery', 'funeral_home'].includes(t))) {
      return {
        kind: PlaceKind.TOMB,
        precision: PlaceCoordinatePrecision.EXACT,
        defaultZoom: 16,
      }
    }
    if (
      types.some((t) =>
        [
          'premise',
          'point_of_interest',
          'establishment',
          'museum',
          'church',
          'place_of_worship',
          'tourist_attraction',
          'historical_landmark',
          'university',
          'hospital',
        ].includes(t),
      )
    ) {
      return {
        kind: PlaceKind.SITE,
        precision: PlaceCoordinatePrecision.EXACT,
        defaultZoom: 16,
      }
    }
    if (types.some((t) => ['sublocality', 'neighborhood', 'route'].includes(t))) {
      return {
        kind: PlaceKind.DISTRICT,
        precision: PlaceCoordinatePrecision.STREET,
        defaultZoom: 14,
      }
    }
    if (types.some((t) => ['natural_feature', 'archipelago'].includes(t))) {
      return {
        kind: PlaceKind.ISLAND,
        precision: PlaceCoordinatePrecision.SETTLEMENT,
        defaultZoom: 11,
      }
    }
    if (types.some((t) => ['administrative_area_level_1', 'country'].includes(t))) {
      return {
        kind: PlaceKind.REGION,
        precision: PlaceCoordinatePrecision.REGION,
        defaultZoom: 8,
      }
    }
    return inferPlaceKindAndScale(name)
  }

  private async fetchGooglePlacesTextSearch(
    query: string,
    apiKey: string,
    countryCode?: string,
    limit = 6,
  ): Promise<PlaceSuggestionDto[]> {
    try {
      const body: Record<string, unknown> = {
        textQuery: query,
        languageCode: 'ko',
        maxResultCount: Math.min(Math.max(limit, 1), 10),
      }
      if (countryCode && /^[A-Za-z]{2}$/.test(countryCode)) {
        body.regionCode = countryCode.toUpperCase()
      }
      const res = await fetch(
        'https://places.googleapis.com/v1/places:searchText',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask':
              'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.addressComponents',
          },
          body: JSON.stringify(body),
        },
      )
      if (!res.ok) return []
      const json = (await res.json()) as { places?: any[] }
      const places = Array.isArray(json.places) ? json.places : []

      return places
        .map((item): PlaceSuggestionDto | null => {
          const lat = toFiniteCoord(item.location?.latitude, -90, 90)
          const lng = toFiniteCoord(item.location?.longitude, -180, 180)
          if (lat === null || lng === null) return null
          const name =
            item.displayName?.text?.trim() ||
            item.formattedAddress?.split(',')[0]?.trim() ||
            query
          const countryComp = Array.isArray(item.addressComponents)
            ? item.addressComponents.find((c: any) =>
                Array.isArray(c.types) && c.types.includes('country'),
              )
            : null
          const scale = this.mapGoogleTypesToKind(item.types ?? [], name)
          return {
            placeId: null,
            isRegistered: false,
            source: 'google',
            kind: scale.kind,
            name,
            localName: null,
            modernAddress: item.formattedAddress ?? null,
            latitude: lat,
            longitude: lng,
            coordinatePrecision: scale.precision,
            googlePlaceId: item.id ? String(item.id) : null,
            externalKey: item.id ? `google:${item.id}` : null,
            defaultZoom: scale.defaultZoom,
            countryCode: countryComp?.shortText?.toUpperCase() ?? null,
            countryId: null,
            countryName: countryComp?.longText ?? null,
            matchedAlias: null,
          }
        })
        .filter((x): x is PlaceSuggestionDto => x !== null)
    } catch {
      return []
    }
  }

  private async fetchNominatimPlaces(
    query: string,
    countryCode?: string,
    limit = 6,
  ): Promise<PlaceSuggestionDto[]> {
    const buildUrl = () => {
      const p = new URLSearchParams({
        q: query,
        format: 'json',
        addressdetails: '1',
        namedetails: '1',
        limit: String(Math.min(Math.max(limit, 1), 10)),
        dedupe: '1',
      })
      if (countryCode && /^[A-Za-z]{2}$/.test(countryCode)) {
        p.set('countrycodes', countryCode.toLowerCase())
      }
      return `https://nominatim.openstreetmap.org/search?${p.toString()}`
    }

    const requestOnce = async (lang: string): Promise<any[]> => {
      try {
        const res = await fetch(buildUrl(), {
          headers: {
            'User-Agent': 'Papyrus-HistoryGazetteer/2.0 (admin@papyrus.local)',
            'Accept-Language': lang,
          },
        })
        if (!res.ok) return []
        const data = await res.json()
        return Array.isArray(data) ? data : []
      } catch {
        return []
      }
    }

    let items = await requestOnce('ko,en')
    if (items.length === 0) {
      items = await requestOnce('en')
    }

    return items
      .map((item): PlaceSuggestionDto | null => {
        const lat = toFiniteCoord(item.lat, -90, 90)
        const lng = toFiniteCoord(item.lon, -180, 180)
        if (lat === null || lng === null) return null
        const namedetails = item.namedetails ?? {}
        const addr = item.address ?? {}
        const koName = namedetails['name:ko']?.trim()
        const rawName = item.name?.trim()
        const name =
          koName ||
          rawName ||
          String(item.display_name ?? '')
            .split(',')[0]
            .trim() ||
          query
        const localName =
          rawName && rawName !== name
            ? rawName
            : (namedetails['name:en']?.trim() ?? null)
        const osmKey =
          item.osm_type && item.osm_id
            ? `osm:${item.osm_type}:${item.osm_id}`
            : item.place_id
              ? `nominatim:${item.place_id}`
              : null
        const scale = inferPlaceKindAndScale(name)

        return {
          placeId: null,
          isRegistered: false,
          source: 'nominatim',
          kind: scale.kind,
          name,
          localName,
          modernAddress: item.display_name ?? null,
          latitude: lat,
          longitude: lng,
          coordinatePrecision: scale.precision,
          googlePlaceId: null,
          externalKey: osmKey,
          defaultZoom: scale.defaultZoom,
          countryCode: addr.country_code
            ? String(addr.country_code).toUpperCase()
            : null,
          countryId: null,
          countryName: addr.country ?? null,
          matchedAlias: null,
        }
      })
      .filter((x): x is PlaceSuggestionDto => x !== null)
  }

  private async resolveCountryIdByCode(
    countryId?: string | null,
    countryCode?: string | null,
  ): Promise<string | null> {
    if (countryId) {
      const found = await this.prisma.country.findUnique({
        where: { id: countryId },
        select: { id: true },
      })
      if (found) return found.id
    }
    if (countryCode && /^[A-Za-z]{2,3}$/.test(countryCode.trim())) {
      const iso = countryCode.trim().toUpperCase()
      const found = await this.prisma.country.findFirst({
        where: { isoCode: iso },
        select: { id: true },
      })
      if (found) return found.id
    }
    return null
  }

  /**
   * 장소(Place) 즉석 정본화 (Inline Upsert):
   * - id / googlePlaceId / externalKey / 근접 동일명 기준으로 중복 생성을 원천 방지한다.
   */
  async resolveOrUpsertPlace(
    input: ResolvePlaceInput,
  ): Promise<PlaceSummaryDto> {
    const cleanName = input.name?.trim() ?? ''
    if (!cleanName && !input.id) {
      throw new BadRequestException('장소 이름(name) 또는 id가 필요합니다.')
    }

    const lat = toFiniteCoord(input.latitude, -90, 90)
    const lng = toFiniteCoord(input.longitude, -180, 180)
    if ((lat === null) !== (lng === null)) {
      throw new BadRequestException(
        '위도(latitude)와 경도(longitude)는 함께 입력해야 합니다.',
      )
    }

    // 1. 명시된 Place ID
    if (input.id) {
      const existing = await this.prisma.place.findUnique({
        where: { id: input.id },
        select: PLACE_SUMMARY_SELECT,
      })
      if (existing) {
        if (
          lat !== null &&
          lng !== null &&
          (existing.latitude == null || existing.longitude == null)
        ) {
          const updated = await this.prisma.place.update({
            where: { id: existing.id },
            data: {
              latitude: lat,
              longitude: lng,
              ...(input.modernAddress
                ? { modernAddress: input.modernAddress.trim() }
                : {}),
              ...(input.googlePlaceId
                ? { googlePlaceId: input.googlePlaceId.trim() }
                : {}),
            },
            select: PLACE_SUMMARY_SELECT,
          })
          await this.ensureAliases(updated.id, input.aliases)
          return serializePlaceSummary(updated)!
        }
        await this.ensureAliases(existing.id, input.aliases)
        return serializePlaceSummary(existing)!
      }
    }

    const googlePlaceId = input.googlePlaceId?.trim() || null
    const externalKey = input.externalKey?.trim() || null
    const resolvedCountryId = await this.resolveCountryIdByCode(
      input.countryId,
      input.countryCode,
    )
    const scale = inferPlaceKindAndScale(cleanName)
    const kind = input.kind ?? scale.kind
    const precision = input.coordinatePrecision ?? scale.precision
    const defaultZoom = input.defaultZoom ?? scale.defaultZoom

    // 2. googlePlaceId 기준 재사용/갱신
    if (googlePlaceId) {
      const byGoogle = await this.prisma.place.findUnique({
        where: { googlePlaceId },
        select: PLACE_SUMMARY_SELECT,
      })
      if (byGoogle) {
        await this.ensureAliases(byGoogle.id, input.aliases)
        return serializePlaceSummary(byGoogle)!
      }
    }

    // 3. externalKey(OSM 등) 기준 재사용
    if (externalKey) {
      const byExt = await this.prisma.place.findUnique({
        where: { externalKey },
        select: PLACE_SUMMARY_SELECT,
      })
      if (byExt) {
        await this.ensureAliases(byExt.id, input.aliases)
        return serializePlaceSummary(byExt)!
      }
    }

    // 4. 동일 이름 + 좌표 근접(~1.5km) 또는 동일 국가 정본 재사용
    if (lat !== null && lng !== null) {
      const nearCandidates = await this.prisma.place.findMany({
        where: {
          name: cleanName,
          latitude: { gte: lat - 0.015, lte: lat + 0.015 },
          longitude: { gte: lng - 0.015, lte: lng + 0.015 },
        },
        select: PLACE_SUMMARY_SELECT,
        take: 1,
      })
      if (nearCandidates[0]) {
        await this.ensureAliases(nearCandidates[0].id, input.aliases)
        return serializePlaceSummary(nearCandidates[0])!
      }
    } else {
      const sameName = await this.prisma.place.findFirst({
        where: {
          name: cleanName,
          ...(resolvedCountryId ? { countryId: resolvedCountryId } : {}),
        },
        select: PLACE_SUMMARY_SELECT,
      })
      if (sameName) {
        await this.ensureAliases(sameName.id, input.aliases)
        return serializePlaceSummary(sameName)!
      }
    }

    // 5. 신규 Place 정본 생성
    const created = await this.prisma.place.create({
      data: {
        kind,
        name: cleanName.slice(0, 200),
        localName: input.localName?.trim()?.slice(0, 200) || null,
        modernAddress: input.modernAddress?.trim()?.slice(0, 500) || null,
        description: input.description?.trim() || null,
        latitude: lat,
        longitude: lng,
        coordinatePrecision: lat !== null ? precision : null,
        googlePlaceId,
        externalKey,
        defaultZoom,
        countryId: resolvedCountryId,
        historicalCountryId: input.historicalCountryId || null,
        administrativeDivisionId: input.administrativeDivisionId || null,
        parentPlaceId: input.parentPlaceId || null,
      },
      select: PLACE_SUMMARY_SELECT,
    })

    await this.ensureAliases(created.id, input.aliases)
    return serializePlaceSummary(created)!
  }

  async updatePlace(
    id: string,
    patch: Partial<ResolvePlaceInput>,
  ): Promise<PlaceSummaryDto> {
    const existing = await this.prisma.place.findUnique({ where: { id } })
    if (!existing) {
      throw new NotFoundException(`장소(Place)를 찾을 수 없습니다: ${id}`)
    }
    const lat =
      patch.latitude !== undefined
        ? toFiniteCoord(patch.latitude, -90, 90)
        : undefined
    const lng =
      patch.longitude !== undefined
        ? toFiniteCoord(patch.longitude, -180, 180)
        : undefined
    if (
      lat !== undefined &&
      lng !== undefined &&
      (lat === null) !== (lng === null)
    ) {
      throw new BadRequestException(
        '위도와 경도는 함께 설정하거나 함께 해제해야 합니다.',
      )
    }

    const updated = await this.prisma.place.update({
      where: { id },
      data: {
        ...(patch.kind ? { kind: patch.kind } : {}),
        ...(patch.name?.trim() ? { name: patch.name.trim().slice(0, 200) } : {}),
        ...(patch.localName !== undefined
          ? { localName: patch.localName?.trim()?.slice(0, 200) || null }
          : {}),
        ...(patch.modernAddress !== undefined
          ? { modernAddress: patch.modernAddress?.trim()?.slice(0, 500) || null }
          : {}),
        ...(patch.description !== undefined
          ? { description: patch.description?.trim() || null }
          : {}),
        ...(lat !== undefined ? { latitude: lat } : {}),
        ...(lng !== undefined ? { longitude: lng } : {}),
        ...(patch.coordinatePrecision !== undefined
          ? { coordinatePrecision: patch.coordinatePrecision }
          : {}),
        ...(patch.defaultZoom !== undefined
          ? { defaultZoom: patch.defaultZoom }
          : {}),
      },
      select: PLACE_SUMMARY_SELECT,
    })
    await this.ensureAliases(updated.id, patch.aliases)
    return serializePlaceSummary(updated)!
  }

  /**
   * 후보 검색어 배열을 순서대로 지오코딩하여 첫 매칭을 DB Place 정본으로 확정한다.
   */
  async geocodeAndResolveBest(
    queries: string[],
    options?: {
      countryCode?: string
      preferredKind?: PlaceKind
      historicalAlias?: string | null
      localAlias?: string | null
      historicalCountryId?: string | null
    },
  ): Promise<PlaceSummaryDto | null> {
    const aliases: ResolvePlaceInput['aliases'] = []
    if (options?.historicalAlias?.trim()) {
      aliases.push({
        name: options.historicalAlias.trim().slice(0, 250),
        kind: PlaceNameKind.HISTORICAL,
        historicalCountryId: options.historicalCountryId ?? null,
      })
    }
    if (options?.localAlias?.trim()) {
      aliases.push({
        name: options.localAlias.trim().slice(0, 250),
        kind: PlaceNameKind.LOCAL,
      })
    }

    for (const q of queries) {
      const cleanQ = q.trim()
      if (!cleanQ) continue

      // 1) 이미 좌표가 있는 DB Place 정본 매칭 확인
      const existing = await this.prisma.place.findFirst({
        where: {
          latitude: { not: null },
          longitude: { not: null },
          OR: [
            { name: cleanQ },
            { localName: cleanQ },
            { names: { some: { name: cleanQ } } },
          ],
        },
        select: PLACE_SUMMARY_SELECT,
      })
      if (existing) {
        await this.ensureAliases(existing.id, aliases)
        return serializePlaceSummary(existing)!
      }

      // 2) 외부 지오코딩 (Google Places -> Nominatim)
      const googleKey = this.getServerGoogleApiKey()
      let hits: PlaceSuggestionDto[] = []
      if (googleKey) {
        hits = await this.fetchGooglePlacesTextSearch(
          cleanQ,
          googleKey,
          options?.countryCode,
          1,
        )
      }
      if (hits.length === 0) {
        hits = await this.fetchNominatimPlaces(cleanQ, options?.countryCode, 1)
      }
      const best = hits[0]
      if (best && best.latitude !== null && best.longitude !== null) {
        return this.resolveOrUpsertPlace({
          kind: options?.preferredKind ?? best.kind,
          name: best.name,
          localName: best.localName,
          modernAddress: best.modernAddress,
          latitude: best.latitude,
          longitude: best.longitude,
          coordinatePrecision: best.coordinatePrecision,
          googlePlaceId: best.googlePlaceId,
          externalKey: best.externalKey,
          defaultZoom: best.defaultZoom,
          countryCode: best.countryCode,
          aliases,
        })
      }
    }

    return null
  }

  private async ensureAliases(
    placeId: string,
    aliases?: ResolvePlaceInput['aliases'],
  ) {
    if (!aliases || aliases.length === 0) return
    const existing = await this.prisma.placeName.findMany({
      where: { placeId },
      select: { name: true },
    })
    const seen = new Set(existing.map((e) => e.name.toLowerCase()))
    for (const alias of aliases) {
      const trimmed = alias.name?.trim()
      if (!trimmed || seen.has(trimmed.toLowerCase())) continue
      seen.add(trimmed.toLowerCase())
      await this.prisma.placeName.create({
        data: {
          placeId,
          name: trimmed.slice(0, 250),
          kind: alias.kind ?? PlaceNameKind.HISTORICAL,
          languageCode: alias.languageCode ?? null,
          historicalCountryId: alias.historicalCountryId ?? null,
        },
      })
    }
  }
}
