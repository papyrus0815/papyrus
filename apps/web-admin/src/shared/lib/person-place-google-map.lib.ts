/**
 * 인물 장소 정본(Place · PersonPlace) 공용 타입 및 순수 Google 지도 URL · 거리 계산 유틸리티
 * (Jest 환경 호환을 위해 import.meta 의존 없이 순수 함수로만 구성)
 */

export type PlaceKind =
  | 'SETTLEMENT'
  | 'DISTRICT'
  | 'SITE'
  | 'TOMB'
  | 'BATTLEFIELD'
  | 'ISLAND'
  | 'REGION'
  | 'OTHER'

export type PlaceCoordinatePrecision =
  | 'EXACT'
  | 'STREET'
  | 'SETTLEMENT'
  | 'REGION'
  | 'APPROXIMATE'

export type PersonPlaceRole =
  | 'BIRTH'
  | 'DEATH'
  | 'BURIAL'
  | 'RESIDENCE'
  | 'EXILE'
  | 'ANCESTRAL_HOME'

export type PersonPlaceEstimateRole = 'PREFERRED' | 'ALTERNATIVE' | 'DISPUTED'

export type PersonPlaceCertainty = 'CERTAIN' | 'PROBABLE' | 'UNKNOWN'

export interface PlaceSummary {
  id: string
  kind: PlaceKind
  name: string
  localName?: string | null
  modernAddress?: string | null
  description?: string | null
  latitude: number | null
  longitude: number | null
  coordinatePrecision?: PlaceCoordinatePrecision | null
  googlePlaceId?: string | null
  externalKey?: string | null
  defaultZoom?: number | null
  countryId?: string | null
  countryName?: string | null
  countryIsoCode?: string | null
}

export interface PlaceSuggestion {
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

export interface PersonPlaceRecord {
  id?: string
  role: PersonPlaceRole
  placeId?: string | null
  historicalLabel?: string | null
  countryId?: string | null
  historicalCountryId?: string | null
  estimateRole: PersonPlaceEstimateRole
  certainty: PersonPlaceCertainty
  note?: string | null
  sortOrder?: number
  place?: PlaceSummary | null
  country?: { id: string; name: string } | null
  historicalCountry?: { id: string; name: string } | null
}

export interface PersonPlaceInput {
  role: PersonPlaceRole
  placeId?: string | null
  historicalLabel?: string | null
  countryId?: string | null
  historicalCountryId?: string | null
  estimateRole?: PersonPlaceEstimateRole
  certainty?: PersonPlaceCertainty
  note?: string | null
  sortOrder?: number
}

export type GoogleMapLayerMode = 'roadmap' | 'hybrid'

export interface PersonPlaceGoogleMapUrls {
  embedUrl: string
  externalUrl: string
  streetViewUrl: string | null
  mode: 'pinned' | 'query'
  latitude: number | null
  longitude: number | null
  effectiveZoom: number
}

/**
 * 역사 지명 텍스트에서 Google 지도 검색 정확도를 떨어뜨리는 부연·일설·메타 괄호를 정제한다.
 */
export function buildCleanGoogleSearchQuery(
  rawLabel: string | null | undefined,
  countryName?: string | null,
): string {
  const raw = rawLabel?.replace(/^[:：\s]+/, '').trim() ?? ''
  if (!raw) return ''

  const parenHyun = raw.match(/\(\s*(?:현재|현|現)\s+([^)]+)\)/)
  if (parenHyun?.[1]) return parenHyun[1].trim()

  const dashHyun = raw.match(/\s[—–]\s*(?:현재|현|現)\s+([^/;]+)/)
  if (dashHyun?.[1]) return dashHyun[1].trim()

  let cleaned = raw
    .split(/\s*(?:\/|;)\s*(?:일설|이설)/)[0]
    .replace(/\(\s*(?:지명\s*미상|정확한\s*장소\s*미상|추정|불명)\s*\)/g, '')
    .split(
      /\s[—–]\s*(?:출생\s*당시|사망\s*당시|가문\s*영지|사족\s*가문|왕실\s*거처|실제\s*출생지)/,
    )[0]
    .trim()

  if (!cleaned) cleaned = raw
  const country = countryName?.trim()
  if (country && !cleaned.includes(country)) {
    return `${country} ${cleaned}`
  }
  return cleaned
}

export function buildPersonPlaceGoogleMapsUrls(params: {
  place?: PlaceSummary | null
  fallbackLat?: number | null
  fallbackLng?: number | null
  historicalLabel?: string | null
  countryName?: string | null
  zoom?: number
  layer?: GoogleMapLayerMode
  googleWebApiKey?: string | null
}): PersonPlaceGoogleMapUrls | null {
  const rawLat = params.place?.latitude ?? params.fallbackLat ?? null
  const rawLng = params.place?.longitude ?? params.fallbackLng ?? null
  const hasValidCoords =
    rawLat != null &&
    rawLng != null &&
    Number.isFinite(Number(rawLat)) &&
    Number.isFinite(Number(rawLng)) &&
    Math.abs(Number(rawLat)) <= 90 &&
    Math.abs(Number(rawLng)) <= 180

  const defaultZoom =
    params.zoom ?? params.place?.defaultZoom ?? (hasValidCoords ? 13 : 11)
  const layer = params.layer ?? 'roadmap'

  if (hasValidCoords) {
    const lat = Number(Number(rawLat).toFixed(6))
    const lng = Number(Number(rawLng).toFixed(6))
    const coordStr = `${lat},${lng}`

    let embedUrl: string
    if (params.googleWebApiKey) {
      const v1Params = new URLSearchParams({
        key: params.googleWebApiKey,
        q: params.place?.googlePlaceId
          ? `place_id:${params.place.googlePlaceId}`
          : coordStr,
        center: coordStr,
        zoom: String(defaultZoom),
        maptype: layer === 'hybrid' ? 'satellite' : 'roadmap',
        language: 'ko',
      })
      embedUrl = `https://www.google.com/maps/embed/v1/place?${v1Params.toString()}`
    } else {
      const sp = new URLSearchParams({
        q: coordStr,
        ll: coordStr,
        z: String(defaultZoom),
        hl: 'ko',
        output: 'embed',
      })
      if (layer === 'hybrid') sp.set('t', 'h')
      embedUrl = `https://maps.google.com/maps?${sp.toString()}`
    }

    const extParams = new URLSearchParams({
      api: '1',
      query: coordStr,
    })
    if (params.place?.googlePlaceId) {
      extParams.set('query_place_id', params.place.googlePlaceId)
    }

    return {
      embedUrl,
      externalUrl: `https://www.google.com/maps/search/?${extParams.toString()}`,
      streetViewUrl: `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${coordStr}`,
      mode: 'pinned',
      latitude: lat,
      longitude: lng,
      effectiveZoom: defaultZoom,
    }
  }

  const queryTarget =
    params.place?.modernAddress?.trim() ||
    params.place?.name?.trim() ||
    buildCleanGoogleSearchQuery(params.historicalLabel, params.countryName)

  if (!queryTarget) return null

  const sp = new URLSearchParams({
    q: queryTarget,
    z: String(Math.min(defaultZoom, 14)),
    hl: 'ko',
    output: 'embed',
  })
  if (layer === 'hybrid') sp.set('t', 'h')

  return {
    embedUrl: `https://maps.google.com/maps?${sp.toString()}`,
    externalUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryTarget)}`,
    streetViewUrl: null,
    mode: 'query',
    latitude: null,
    longitude: null,
    effectiveZoom: Math.min(defaultZoom, 14),
  }
}

export function computeHaversineDistanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const earthRadiusKm = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng
  return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(h)))
}

let googleMapsScriptPromise: Promise<any> | null = null

export function loadGoogleMapsJsSdk(apiKey: string): Promise<any> {
  const w = window as unknown as { google?: { maps?: any } }
  if (w.google?.maps?.Map) {
    return Promise.resolve(w.google.maps)
  }
  if (googleMapsScriptPromise) return googleMapsScriptPromise

  googleMapsScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places,geometry&language=ko`
    script.async = true
    script.defer = true
    script.onload = () => {
      if (w.google?.maps) resolve(w.google.maps)
      else reject(new Error('Google Maps JS SDK 로드 실패'))
    }
    script.onerror = () => {
      googleMapsScriptPromise = null
      reject(new Error('Google Maps JS SDK 스크립트 로드 오류'))
    }
    document.head.appendChild(script)
  })
  return googleMapsScriptPromise
}
