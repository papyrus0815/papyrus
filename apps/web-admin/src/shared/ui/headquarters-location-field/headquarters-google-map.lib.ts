/**
 * 청사 · 본부 소재지 구글 지도 연동 유틸리티
 *
 * - 유료 API 키 없이 동작하는 공식 Google Maps Embed (`https://maps.google.com/maps?...&output=embed`) 및
 *   외부 열기 URL (`https://www.google.com/maps/search/?api=1&query=...`)을 생성한다.
 * - 브라우저 주소창의 Google 지도 URL(`/maps/place/이름/@위도,경도`, `!3d위도!4d경도`),
 *   `<iframe src="https://www.google.com/maps/embed?pb=...">` 코드(`!2d경도!3d위도`),
 *   위키백과 도·분·초(DMS), 소수점 위·경도 문자열에서 좌표(WGS84)와 장소 이름을 추출한다.
 */

export interface HeadquartersPoint {
  lat: number
  lng: number
}

export interface ParsedHeadquartersMapInput {
  point: HeadquartersPoint | null
  extractedLabel: string | null
  isMapUrlOrCoord: boolean
}

export type HeadquartersGoogleMapLayer = 'roadmap' | 'hybrid'

export interface HeadquartersZoomPreset {
  key: 'building' | 'district' | 'city'
  label: string
  zoom: number
}

export const HEADQUARTERS_ZOOM_PRESETS: readonly HeadquartersZoomPreset[] = [
  { key: 'building', label: '건물', zoom: 17 },
  { key: 'district', label: '주변', zoom: 15 },
  { key: 'city', label: '권역', zoom: 12 },
] as const

export interface HeadquartersGoogleMapsSpec {
  embedUrl: string
  externalUrl: string
  mode: 'pinned' | 'query'
  queryLabel: string
}

export function clampValidWgs84(
  rawLat: number | null | undefined,
  rawLng: number | null | undefined,
): HeadquartersPoint | null {
  if (rawLat == null || rawLng == null) return null
  const numLat = Number(rawLat)
  const numLng = Number(rawLng)
  if (!Number.isFinite(numLat) || !Number.isFinite(numLng)) return null
  if (numLat < -90 || numLat > 90 || numLng < -180 || numLng > 180) return null
  return {
    lat: Number(numLat.toFixed(6)),
    lng: Number(numLng.toFixed(6)),
  }
}

export function formatHeadquartersCoordinate(point: HeadquartersPoint): string {
  const latLabel = `${point.lat >= 0 ? '북위' : '남위'} ${Math.abs(point.lat).toFixed(4)}°`
  const lngLabel = `${point.lng >= 0 ? '동경' : '서경'} ${Math.abs(point.lng).toFixed(4)}°`
  return `${latLabel}, ${lngLabel}`
}

function extractIframeSrc(rawText: string): string | null {
  const matched = rawText.match(/<iframe[^>]*\ssrc\s*=\s*["']([^"']+)["']/i)
  return matched ? matched[1].replace(/&amp;/g, '&') : null
}

function safeDecodePlaceSegment(segment: string): string | null {
  try {
    const decoded = decodeURIComponent(segment.replace(/\+/g, ' ')).trim()
    if (!decoded) return null
    if (/^[+-]?\d+(?:\.\d+)?\s*,\s*[+-]?\d+(?:\.\d+)?$/.test(decoded)) {
      return null
    }
    return decoded
  } catch {
    return null
  }
}

/**
 * 입력된 문자열(Google 지도 URL, iframe 퍼가기 코드, OpenStreetMap URL, DMS, 소수점 위·경도)을
 * 파싱하여 좌표와 추출 가능한 장소명을 반환한다.
 */
export function parseHeadquartersMapInput(
  rawInput: string,
): ParsedHeadquartersMapInput {
  const trimmed = rawInput.trim()
  if (!trimmed) {
    return { point: null, extractedLabel: null, isMapUrlOrCoord: false }
  }

  const candidateUrl = extractIframeSrc(trimmed) ?? trimmed
  const looksLikeUrl =
    /^https?:\/\//i.test(candidateUrl) ||
    candidateUrl.includes('google.com/maps') ||
    candidateUrl.includes('maps.google.') ||
    candidateUrl.includes('openstreetmap.org')

  if (looksLikeUrl) {
    let extractedLabel: string | null = null
    const placeMatch = candidateUrl.match(/\/maps\/(?:place|search)\/([^/?#]+)/i)
    if (placeMatch?.[1]) {
      extractedLabel = safeDecodePlaceSegment(placeMatch[1])
    }

    try {
      const parsedUrl = new URL(
        /^https?:\/\//i.test(candidateUrl)
          ? candidateUrl
          : `https://${candidateUrl}`,
      )
      if (!extractedLabel) {
        const queryParamText =
          parsedUrl.searchParams.get('q') ??
          parsedUrl.searchParams.get('query')
        if (queryParamText) {
          extractedLabel = safeDecodePlaceSegment(queryParamText)
        }
      }
      const pbParam = parsedUrl.searchParams.get('pb')
      if (pbParam && !extractedLabel) {
        const pbNameMatch = pbParam.match(/!2s([^!]+)/)
        if (pbNameMatch?.[1]) {
          extractedLabel = safeDecodePlaceSegment(pbNameMatch[1])
        }
      }
    } catch {
      // URL 객체 변환 실패 시 정규식 파싱만 진행
    }

    // 1) Google 지도 데이터 핀 (!3d위도!4d경도) — 화면 중심(@)보다 실제 건물 핀 좌표가 정확함
    const pin3d4d = candidateUrl.match(
      /!3d([+-]?\d+(?:\.\d+)?)!4d([+-]?\d+(?:\.\d+)?)/,
    )
    if (pin3d4d) {
      const point = clampValidWgs84(Number(pin3d4d[1]), Number(pin3d4d[2]))
      return { point, extractedLabel, isMapUrlOrCoord: point !== null }
    }

    // 2) Google 지도 iframe embed pb 파라미터 (!2d경도!3d위도)
    const embedPb2d3d = candidateUrl.match(
      /!2d([+-]?\d+(?:\.\d+)?)!3d([+-]?\d+(?:\.\d+)?)/,
    )
    if (embedPb2d3d) {
      const point = clampValidWgs84(
        Number(embedPb2d3d[2]),
        Number(embedPb2d3d[1]),
      )
      return { point, extractedLabel, isMapUrlOrCoord: point !== null }
    }

    // 3) OpenStreetMap 해시 (#map=15/37.5749/126.9752)
    const osmHash = candidateUrl.match(
      /#map=\d+\/([+-]?\d+(?:\.\d+)?)\/([+-]?\d+(?:\.\d+)?)/,
    )
    if (osmHash) {
      const point = clampValidWgs84(Number(osmHash[1]), Number(osmHash[2]))
      return { point, extractedLabel, isMapUrlOrCoord: point !== null }
    }

    // 4) 쿼리 파라미터 (?q=위도,경도 / ?ll=위도,경도 / ?query=위도,경도)
    const queryCoord = candidateUrl.match(
      /[?&](?:q|query|ll)=([+-]?\d+(?:\.\d+)?)\s*(?:,|%2C)\s*([+-]?\d+(?:\.\d+)?)/i,
    )
    if (queryCoord) {
      const point = clampValidWgs84(
        Number(queryCoord[1]),
        Number(queryCoord[2]),
      )
      return { point, extractedLabel, isMapUrlOrCoord: point !== null }
    }

    // 5) @위도,경도 뷰포트 좌표
    const atCoord = candidateUrl.match(
      /@([+-]?\d+(?:\.\d+)?),([+-]?\d+(?:\.\d+)?)/,
    )
    if (atCoord) {
      const point = clampValidWgs84(Number(atCoord[1]), Number(atCoord[2]))
      return { point, extractedLabel, isMapUrlOrCoord: point !== null }
    }

    if (extractedLabel) {
      return { point: null, extractedLabel, isMapUrlOrCoord: true }
    }
  }

  // 도·분·초(DMS) 표기 (예: 37°34′29.6″N 126°58′30.7″E, 북위 37° 34′ 29″ 동경 126° 58′ 30″)
  const dmsPattern =
    /^(?:(북위|남위)\s*)?(\d{1,2})\s*(?:°|도)\s*(?:(\d{1,2})\s*(?:['′ʹ]|분)\s*)?(?:(\d{1,2}(?:\.\d+)?)\s*(?:["″ʺ]|''|초)\s*)?([NSns])?\s*[,/\s]\s*(?:(동경|서경)\s*)?(\d{1,3})\s*(?:°|도)\s*(?:(\d{1,2})\s*(?:['′ʹ]|분)\s*)?(?:(\d{1,2}(?:\.\d+)?)\s*(?:["″ʺ]|''|초)\s*)?([EWew])?$/
  const dmsMatch = trimmed.match(dmsPattern)
  if (dmsMatch) {
    const [
      ,
      korLatDir,
      latDegStr,
      latMinStr,
      latSecStr,
      engLatDir,
      korLngDir,
      lngDegStr,
      lngMinStr,
      lngSecStr,
      engLngDir,
    ] = dmsMatch
    if (
      latMinStr ||
      latSecStr ||
      lngMinStr ||
      lngSecStr ||
      korLatDir ||
      engLatDir ||
      korLngDir ||
      engLngDir
    ) {
      const latDeg = Number(latDegStr)
      const latMin = latMinStr ? Number(latMinStr) : 0
      const latSec = latSecStr ? Number(latSecStr) : 0
      const lngDeg = Number(lngDegStr)
      const lngMin = lngMinStr ? Number(lngMinStr) : 0
      const lngSec = lngSecStr ? Number(lngSecStr) : 0
      if (latMin < 60 && latSec < 60 && lngMin < 60 && lngSec < 60) {
        let computedLat = latDeg + latMin / 60 + latSec / 3600
        let computedLng = lngDeg + lngMin / 60 + lngSec / 3600
        if (korLatDir === '남위' || engLatDir?.toUpperCase() === 'S') {
          computedLat = -computedLat
        }
        if (korLngDir === '서경' || engLngDir?.toUpperCase() === 'W') {
          computedLng = -computedLng
        }
        const point = clampValidWgs84(computedLat, computedLng)
        return {
          point,
          extractedLabel: null,
          isMapUrlOrCoord: point !== null,
        }
      }
    }
  }

  // 소수점 위·경도(DD) 표기 (예: 37.574889, 126.975201)
  const ddPattern =
    /^(?:(북위|남위)\s*)?([+-]?\d+(?:\.\d+)?)\s*°?\s*([NSns])?\s*[,/\s]\s*(?:(동경|서경)\s*)?([+-]?\d+(?:\.\d+)?)\s*°?\s*([EWew])?$/
  const ddMatch = trimmed.match(ddPattern)
  if (ddMatch) {
    const [
      ,
      korLatDir,
      latNumStr,
      engLatDir,
      korLngDir,
      lngNumStr,
      engLngDir,
    ] = ddMatch
    let computedLat = Number(latNumStr)
    let computedLng = Number(lngNumStr)
    if (Number.isFinite(computedLat) && Number.isFinite(computedLng)) {
      if (korLatDir === '남위' || engLatDir?.toUpperCase() === 'S') {
        computedLat = -Math.abs(computedLat)
      } else if (korLatDir === '북위' || engLatDir?.toUpperCase() === 'N') {
        computedLat = Math.abs(computedLat)
      }
      if (korLngDir === '서경' || engLngDir?.toUpperCase() === 'W') {
        computedLng = -Math.abs(computedLng)
      } else if (korLngDir === '동경' || engLngDir?.toUpperCase() === 'E') {
        computedLng = Math.abs(computedLng)
      }
      const point = clampValidWgs84(computedLat, computedLng)
      return {
        point,
        extractedLabel: null,
        isMapUrlOrCoord: point !== null,
      }
    }
  }

  return { point: null, extractedLabel: null, isMapUrlOrCoord: false }
}

/**
 * 소재지 명칭이나 핀 좌표로 키 없는 Google 지도 임베드 URL과 외부 열기 URL을 생성한다.
 * - 좌표가 있으면 `q=위도,경도&ll=위도,경도`로 고정하여 역사 지명("한성부 육조거리")이어도 실제 현대 위치를 정확히 가리킨다.
 * - 좌표가 없고 소재지 문자열만 있으면 국가명을 보조 컨텍스트로 붙여 동명 지명 오탐을 줄인다.
 */
export function buildHeadquartersGoogleMapsSpec(params: {
  headquarters?: string | null
  latitude?: number | null
  longitude?: number | null
  countryName?: string | null
  zoom?: number
  mapLayer?: HeadquartersGoogleMapLayer
}): HeadquartersGoogleMapsSpec | null {
  const validPoint = clampValidWgs84(params.latitude, params.longitude)
  const cleanHeadquarters = params.headquarters?.trim() ?? ''
  const cleanCountry = params.countryName?.trim() ?? ''

  if (validPoint) {
    const coordStr = `${validPoint.lat.toFixed(6)},${validPoint.lng.toFixed(6)}`
    const searchParams = new URLSearchParams()
    searchParams.set('q', coordStr)
    searchParams.set('ll', coordStr)
    searchParams.set('z', String(params.zoom ?? 15))
    if (params.mapLayer === 'hybrid') {
      searchParams.set('t', 'h')
    }
    searchParams.set('hl', 'ko')
    searchParams.set('output', 'embed')

    return {
      embedUrl: `https://maps.google.com/maps?${searchParams.toString()}`,
      externalUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coordStr)}`,
      mode: 'pinned',
      queryLabel: cleanHeadquarters || formatHeadquartersCoordinate(validPoint),
    }
  }

  if (!cleanHeadquarters) return null

  // 괄호 안 부연 설명을 정리하되 원문 의미를 해치지 않는 검색어 구성
  const strippedHeadquarters = cleanHeadquarters
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const baseQuery = strippedHeadquarters || cleanHeadquarters
  const combinedQuery =
    cleanCountry && !baseQuery.includes(cleanCountry)
      ? `${cleanCountry} ${baseQuery}`
      : baseQuery

  const searchParams = new URLSearchParams()
  searchParams.set('q', combinedQuery)
  searchParams.set('z', String(params.zoom ?? 14))
  if (params.mapLayer === 'hybrid') {
    searchParams.set('t', 'h')
  }
  searchParams.set('hl', 'ko')
  searchParams.set('output', 'embed')

  return {
    embedUrl: `https://maps.google.com/maps?${searchParams.toString()}`,
    externalUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(combinedQuery)}`,
    mode: 'query',
    queryLabel: cleanHeadquarters,
  }
}

/**
 * 입력된 소재지 문자열·국가명·기관명에서 빠른 장소 검색 후보 칩을 추출한다.
 */
export function buildHeadquartersSearchHints(params: {
  headquarters?: string | null
  departmentName?: string | null
  countryName?: string | null
}): string[] {
  const candidates: string[] = []
  const seen = new Set<string>()
  const pushUnique = (rawCandidate: string | null | undefined) => {
    const cleaned = rawCandidate?.trim()
    if (!cleaned || cleaned.length < 2 || seen.has(cleaned)) return
    seen.add(cleaned)
    candidates.push(cleaned)
  }

  const hqText = params.headquarters?.trim() ?? ''
  if (hqText) {
    const segments = hqText
      .split(/[·,/—–|-]/)
      .map((part) => part.replace(/\([^)]*\)/g, '').trim())
      .filter(Boolean)
    for (const seg of segments) {
      pushUnique(seg)
    }
    const parenMatches = hqText.match(/\(([^)]+)\)/g) ?? []
    for (const parenItem of parenMatches) {
      const inner = parenItem
        .slice(1, -1)
        .replace(/^현\s+/, '')
        .trim()
      pushUnique(inner)
    }
  }

  const countryText = params.countryName?.trim() ?? ''
  const deptText = params.departmentName?.trim() ?? ''
  if (countryText && deptText) {
    pushUnique(`${countryText} ${deptText}`)
  } else if (deptText) {
    pushUnique(deptText)
  }
  if (countryText) {
    pushUnique(countryText)
  }

  return candidates.slice(0, 5)
}
