import {
  EstimateRole,
  PersonPlaceCertainty,
  PlaceCoordinatePrecision,
  PlaceKind,
} from '@prisma/client'

export interface DecomposedPlaceClaim {
  /** 채택(PREFERRED) 또는 일설(ALTERNATIVE) */
  estimateRole: EstimateRole
  /** 확실성 층위 */
  certainty: PersonPlaceCertainty
  /** 인물의 당대 지명 표기 (예: "기이국 와카야마성(和歌山城)", "한성부 건천동") */
  historicalLabel: string
  /** 현대 대응 지명(명시된 경우, 예: "와카야마현 와카야마시", "조지아 트빌리시") */
  modernEquivalent: string | null
  /** 괄호 안에 병기된 원어/로마자 지명 (예: "Mouilleron-en-Pareds", "Wakayama Castle") */
  localNameHint: string | null
  /** 지오코딩 후보 검색어 목록 (우선순위 순, 지명 미상이면 빈 배열) */
  geocodeQueries: string[]
  /** 장소에서 분리된 맥락/서술 메모 (예: "체틴스카 거리의 흙벽돌 소가옥", "출생 당시 7월 왕정기 프랑스") */
  note: string | null
  /** 추정되는 장소 스케일 */
  inferredKind: PlaceKind
  /** 추정 좌표 정밀도 */
  inferredPrecision: PlaceCoordinatePrecision
  /** 권장 기본 지도 배율 */
  defaultZoom: number
}

/** 역사 정치체·왕조 접두/접미 표현 — 지오코딩 쿼리에서 노이즈를 걷어낼 때만 제거(당대 라벨에는 보존) */
const HISTORICAL_POLITY_PREFIXES = [
  /^신성\s*로마\s*제국\s+/,
  /^신성로마\s+/,
  /^성로마제국\s+/,
  /^나폴리\s*왕국\s+/,
  /^그레이트브리튼\s*왕국\s+/,
  /^헤센\s*(?:대공국|방백령)\s+/,
  /^러시아\s*소비에트(?:\s*연방(?:\s*사회주의\s*공화국)?)?\s+/,
  /^프랑크\s*왕국\s+/,
  /^서프랑크\s*왕국\s+/,
  /^동프랑크\s*왕국\s+/,
  /^프랑스\s*왕국\s+/,
  /^프랑스\s*제[1-5]공화국\s+/,
  /^프랑스\s*제[1-2]제국\s+/,
  /^7월\s*왕정(?:기)?\s*프랑스\s+/,
  /^포르투갈\s*왕국\s+/,
  /^카스티야\s*왕국\s+/,
  /^아라곤\s*왕국\s+/,
  /^에스파냐\s*왕국\s+/,
  /^스페인\s*제국\s+/,
  /^이탈리아\s*왕국\s+/,
  /^사르데냐\s*왕국\s+/,
  /^양시칠리아\s*왕국\s+/,
  /^교황령\s+/,
  /^독일\s*제국\s+/,
  /^프로이센\s*왕국\s+/,
  /^바이에른\s*왕국\s+/,
  /^작센\s*왕국\s+/,
  /^하노버\s*왕국\s+/,
  /^오스트리아[-\s]*헝가리(?:\s*제국)?\s+/,
  /^오스트리아\s*제국\s+/,
  /^합스부르크\s*군주국\s+/,
  /^러시아\s*제국\s+/,
  /^러시아\s*차르국\s+/,
  /^모스크바\s*대공국\s+/,
  /^소비에트\s*연방\s+/,
  /^소련\s+/,
  /^오스만\s*제국\s+/,
  /^비잔티움\s*제국\s+/,
  /^동로마\s*제국\s+/,
  /^로마\s*제국\s+/,
  /^로마\s*공화정\s+/,
  /^그레이트브리튼\s*(?:아일랜드\s*)?연합왕국\s+/,
  /^영국령\s*인도\s+/,
  /^미국령\s*필리핀(?:\s*자치령)?\s+/,
  /^세르비아\s*공국\s+/,
  /^크라쿠프\s*공국\s+/,
  /^실롱스크\s*공국\s+/,
  /^헤센[-\s]*다름슈타트\s*(?:방백령|대공국)\s+/,
  /^에도\s*막부\s+/,
  /^일본\s*제국\s+/,
  /^대한제국\s+/,
  /^조선(?:\s*왕조)?\s+/,
  /^고려\s+/,
  /^청(?:나라)?\s+/,
  /^명(?:나라)?\s+/,
  /^중화민국\s+/,
]

const HISTORICAL_POLITY_SUFFIXES = [
  /,\s*프랑스\s*제[1-5]공화국$/,
  /,\s*프랑스\s*제[1-2]제국$/,
  /,\s*프랑스\s*왕국$/,
  /,\s*신성\s*로마\s*제국$/,
  /,\s*러시아\s*제국$/,
  /,\s*독일\s*제국$/,
  /,\s*오스트리아[-\s]*헝가리(?:\s*제국)?$/,
  /,\s*대영\s*제국$/,
]

/** 괄호 안 현대 국가 시작 패턴 (예: "(벨기에 리에주 주 에르스탈)", "(독일 노르트라인 베스트팔렌 주 아헨)") */
const MODERN_COUNTRY_IN_PARENS =
  /^(대한민국|한국|일본|중국|미국|영국|프랑스|독일|이탈리아|스페인|포르투갈|러시아|우크라이나|폴란드|벨기에|네덜란드|오스트리아|스위스|체코|헝가리|루마니아|세르비아|크로아티아|그리스|튀르키예|터키|조지아|필리핀|인도|베트남)\s+.+/

/** 대시(—) 뒤가 지명이 아니라 시대·가문·거처 설명문인 패턴 */
const NARRATIVE_TAIL_PATTERN =
  /(?:출생\s*당시|사망\s*당시|가문\s*영지|사족\s*가문|왕실\s*거처|일가|저택\s*내|실제\s*출생지|정체\s*불명|가설|소속|인근\s*전장|전사|암살|처형|병사)/

export function inferPlaceKindAndScale(text: string): {
  kind: PlaceKind
  precision: PlaceCoordinatePrecision
  defaultZoom: number
} {
  const normalized = text.trim()
  const cleanForKind = normalized.replace(/\([^)]*\)/g, ' ').trim()
  if (/(?:왕릉|능묘|묘소|현충원|현충사|앵발리드|판테온|국립묘지|무덤|안장지)/.test(cleanForKind)) {
    return { kind: PlaceKind.TOMB, precision: PlaceCoordinatePrecision.EXACT, defaultZoom: 16 }
  }
  const isChineseProvince =
    /(?:장쑤|저장|광둥|산둥|허난|허베이|후베이|후난|쓰촨|산시|섬서|간쑤|윈난|구이저우|푸젠|안후이|장시|랴오닝|지린|헤이룽장|칭하이|하이난)성(?=$|\s)/.test(
      cleanForKind,
    ) && !/(?:궁|저택|어소|사원|성당)/.test(cleanForKind)
  if (
    !isChineseProvince &&
    /(?:궁전|궁궐|[가-힣A-Za-z]{1,12}궁(?=$|\s)|[가-힣A-Za-z]{2,12}성(?=$|\s)|성채|저택|어소|사원|성당|수도원|대학|콜레지오|병원|호텔|요새|생가)/.test(
      cleanForKind,
    )
  ) {
    return { kind: PlaceKind.SITE, precision: PlaceCoordinatePrecision.EXACT, defaultZoom: 15 }
  }
  if (/(?:해협|전장|전투지|고지|평원)/.test(normalized)) {
    return {
      kind: PlaceKind.BATTLEFIELD,
      precision: PlaceCoordinatePrecision.APPROXIMATE,
      defaultZoom: 11,
    }
  }
  if (/(?:세인트헬레나|엘바섬|코르시카|\S+섬|\S+제도)$/.test(normalized)) {
    return { kind: PlaceKind.ISLAND, precision: PlaceCoordinatePrecision.SETTLEMENT, defaultZoom: 10 }
  }
  if (/(?:\d+구|\S+동|\S+가|\S+정|\S+촌|\S+무라)$/.test(normalized)) {
    return { kind: PlaceKind.DISTRICT, precision: PlaceCoordinatePrecision.STREET, defaultZoom: 14 }
  }
  if (/(?:지역|지방|공국|왕국|방백령|대공국)$/.test(normalized)) {
    return { kind: PlaceKind.REGION, precision: PlaceCoordinatePrecision.REGION, defaultZoom: 8 }
  }
  return {
    kind: PlaceKind.SETTLEMENT,
    precision: PlaceCoordinatePrecision.SETTLEMENT,
    defaultZoom: 12,
  }
}

function stripHistoricalPolities(raw: string): string {
  let out = raw.trim()
  for (const prefix of HISTORICAL_POLITY_PREFIXES) {
    out = out.replace(prefix, '')
  }
  for (const suffix of HISTORICAL_POLITY_SUFFIXES) {
    out = out.replace(suffix, '')
  }
  return out.trim()
}

function pushUniqueQuery(target: string[], candidate: string | null | undefined) {
  if (!candidate) return
  const cleaned = candidate
    .replace(/^[:\-–—·,\s]+|[:\-–—·,\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned || cleaned.length < 2) return
  if (/^(?:미상|불명|지명\s*미상|알\s*수\s*없음|추정)$/.test(cleaned)) return
  if (!target.includes(cleaned)) {
    target.push(cleaned)
  }
}

function decomposeSingleSegment(
  rawSegment: string,
  estimateRole: EstimateRole,
  fallbackCountryName?: string | null,
): DecomposedPlaceClaim | null {
  let text = rawSegment
    .replace(/^[:：\-–—·\s]+/, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return null

  let certainty: PersonPlaceCertainty = PersonPlaceCertainty.CERTAIN
  const notes: string[] = []
  let modernEquivalent = null as string | null
  let localNameHint = null as string | null

  // 1. 미상/추정 판별 및 메타 괄호 제거
  if (/(?:지명\s*미상|정확한\s*장소\s*미상|장소\s*불명|정체\s*불명|^미상$|^불명$)/.test(text)) {
    certainty = PersonPlaceCertainty.UNKNOWN
  } else if (/(?:\(\s*추정\s*\)|\s+추정$|일설)/.test(text)) {
    certainty = PersonPlaceCertainty.PROBABLE
  }

  text = text
    .replace(/\(\s*(?:지명\s*미상|정확한\s*장소\s*미상|장소\s*미상|추정|불명)\s*\)/g, '')
    .replace(/\s+추정$/, '')
    .trim()

  // 2. 괄호 속 "(현 ...)" / "(현재 ...)" / "(現 ...)" 또는 "(벨기에 ...)" 추출
  text = text.replace(/\(\s*(?:현재|현|現)\s+([^)]+)\)/g, (_m, inner: string) => {
    if (!modernEquivalent) modernEquivalent = inner.trim()
    return ''
  })

  text = text.replace(/\(([^)]+)\)/g, (fullMatch, innerRaw: string) => {
    const inner = innerRaw.trim()
    if (MODERN_COUNTRY_IN_PARENS.test(inner) && !modernEquivalent) {
      modernEquivalent = inner
      return ''
    }
    if (/^실제\s*출생지는\s*(.+)$/.test(inner)) {
      const m = inner.match(/^실제\s*출생지는\s*(.+)$/)
      if (m?.[1] && !modernEquivalent) modernEquivalent = m[1].trim()
      notes.push(inner)
      return ''
    }
    if (/가설|불명|일설/.test(inner)) {
      notes.push(inner)
      return ''
    }
    // 라틴/한자/가나 원어 지명 힌트 추출
    if (/[A-Za-zÀ-ÿ\u4E00-\u9FFF\u3040-\u30FF]/.test(inner) && !localNameHint) {
      localNameHint = inner
    }
    return fullMatch
  })

  // 3. 대시(— / – / -) 분리: "당대 지명 — 현재 현대지명" vs "도시 — 세부 건물/설명"
  const dashParts = text
    .split(/\s+[—–]\s+/)
    .map((p) => p.trim())
    .filter(Boolean)

  let primaryPart = dashParts[0] ?? text
  for (let i = 1; i < dashParts.length; i++) {
    const tail = dashParts[i]
    const hyunMatch = tail.match(/^(?:현재|현|現)\s+(.+)$/)
    if (hyunMatch?.[1]) {
      if (!modernEquivalent) modernEquivalent = hyunMatch[1].trim()
      continue
    }
    if (NARRATIVE_TAIL_PATTERN.test(tail) || tail.length > 22) {
      notes.push(tail)
    } else {
      // 예: "포르투갈 왕국 리스본 — 리베이라 궁", "프랑스 제2제국 파리 — 튈르리 궁"
      primaryPart = `${primaryPart} ${tail}`
    }
  }

  const historicalLabel = primaryPart.replace(/\s+/g, ' ').trim()
  const scaleTarget = modernEquivalent ?? historicalLabel
  const { kind, precision, defaultZoom } = inferPlaceKindAndScale(historicalLabel || scaleTarget)

  // 4. 지오코딩 검색어 후보 생성 (가장 정밀한 현대/원어 지명 -> 정제된 당대 지명 순)
  const geocodeQueries: string[] = []
  if (certainty !== PersonPlaceCertainty.UNKNOWN) {
    const strippedPrimary = stripHistoricalPolities(
      primaryPart.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' '),
    )

    // (a) 현대 대응 지명이 있으면: 세부 건물명(성·궁 등) 결합 쿼리 -> 현대 지명 단독
    if (modernEquivalent) {
      const cleanModern = modernEquivalent.replace(/\s*\([^)]*\)\s*/g, ' ').trim()
      const siteTokenMatch = strippedPrimary.match(
        /([가-힣A-Za-z0-9]+(?:성|궁전|궁|어소|사원|성당|수도원|대학|콜레지오|왕릉|묘소))(?=$|\s)/,
      )
      if (siteTokenMatch?.[1] && !cleanModern.includes(siteTokenMatch[1])) {
        pushUniqueQuery(geocodeQueries, `${cleanModern} ${siteTokenMatch[1]}`)
      }
      pushUniqueQuery(geocodeQueries, cleanModern)
    }

    // (b) 괄호 속 라틴/한자 원어 지명 (유럽 소도시·일본 옛 지명에서 정확도 최상)
    if (localNameHint) {
      const cleanCountry = fallbackCountryName?.trim()
      if (cleanCountry && !localNameHint.includes(cleanCountry)) {
        pushUniqueQuery(geocodeQueries, `${localNameHint}, ${cleanCountry}`)
      }
      pushUniqueQuery(geocodeQueries, localNameHint)
    }

    // (c) 역사 정치체 접두사를 걷어낸 핵심 지명
    if (strippedPrimary) {
      const cleanCountry = fallbackCountryName?.trim()
      if (cleanCountry && !strippedPrimary.includes(cleanCountry)) {
        pushUniqueQuery(geocodeQueries, `${cleanCountry} ${strippedPrimary}`)
      }
      pushUniqueQuery(geocodeQueries, strippedPrimary)
    }

    // (d) 대시 앞 첫 지명(도시 단위 폴백 — 예: "리스본 리베이라 궁" 실패 시 "포르투갈 리스본")
    if (dashParts.length > 1) {
      const cityFallback = stripHistoricalPolities(
        dashParts[0].replace(/\s*\([^)]*\)\s*/g, ' '),
      )
      pushUniqueQuery(geocodeQueries, cityFallback)
    }
  } else {
    // UNKNOWN이라도 국가/광역명이 남아있으면 광역 폴백 1개만 제공 가능하나, 허위 핀 방지를 위해 비워둔다
  }

  return {
    estimateRole,
    certainty,
    historicalLabel: historicalLabel || rawSegment.trim(),
    modernEquivalent,
    localNameHint,
    geocodeQueries,
    note: notes.length > 0 ? notes.join(' · ') : null,
    inferredKind: kind,
    inferredPrecision:
      certainty === PersonPlaceCertainty.UNKNOWN
        ? PlaceCoordinatePrecision.REGION
        : precision,
    defaultZoom: certainty === PersonPlaceCertainty.UNKNOWN ? 6 : defaultZoom,
  }
}

/**
 * 자유 서술형 출생지·사망지 문자열을 1개 이상의 구조화된 PersonPlace 주장(통설 + 일설)으로 분해한다.
 */
export function decomposeHistoricalPlaceText(
  rawText: string | null | undefined,
  options?: { fallbackCountryName?: string | null },
): DecomposedPlaceClaim[] {
  const trimmed = rawText?.trim() ?? ''
  if (!trimmed) return []

  // "/ 일설 ..." 또는 "; 일설 ..." 분리
  const rawParts = trimmed
    .split(/\s*(?:\/|;|\|)\s*(?=일설|이설|또는|혹은)/)
    .map((part) => part.trim())
    .filter(Boolean)

  const results: DecomposedPlaceClaim[] = []
  rawParts.forEach((segment, idx) => {
    const isAlt = idx > 0 || /^(?:일설|이설)\s+/.test(segment)
    const cleanedSegment = segment.replace(/^(?:일설|이설|또는|혹은)\s*:?\s*/, '')
    const parsed = decomposeSingleSegment(
      cleanedSegment,
      isAlt ? EstimateRole.ALTERNATIVE : EstimateRole.PREFERRED,
      options?.fallbackCountryName,
    )
    if (parsed) {
      results.push(parsed)
    }
  })

  return results
}
