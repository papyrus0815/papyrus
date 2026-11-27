/**
 * 인물 출생지·사망지(birthPlaceText / deathPlaceText 584건) 및 기존 City 테이블을
 * 범용 장소 정본(Place + PlaceName) 및 인물 공간 기록(PersonPlace)으로 구조화 이관하는 스크립트.
 *
 * 실행:
 *   node -r ./prisma-seed-loader.js ./node_modules/.bin/tsx apps/api/prisma/scripts/migrate-person-places.ts
 */
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import {
  PersonPlaceCertainty,
  PersonPlaceRole,
  PlaceCoordinatePrecision,
  PlaceKind,
  PlaceNameKind,
  PrismaClient,
} from '@prisma/client'

import { decomposeHistoricalPlaceText } from '../../src/libs/place/domain/place-text-decomposer'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL 환경변수가 설정되지 않았습니다.')
}

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(databaseUrl),
})

interface GazetteerSeed {
  key: string
  kind: PlaceKind
  name: string
  localName: string
  modernAddress: string
  latitude: number
  longitude: number
  precision: PlaceCoordinatePrecision
  defaultZoom: number
  countryIso: string
  aliases: string[]
}

/**
 * 사료상 현재 소실되었거나(리베이라 궁, 마드리드 알카사르, 튈르리 궁, 이파티예프 하우스 등)
 * 한국어 지오코딩 오탐이 잦은 주요 왕궁·성곽·역사 수도의 검증된 WGS84 정본 시드
 */
const CURATED_GAZETTEER_SEEDS: GazetteerSeed[] = [
  {
    key: 'curated:edo-castle',
    kind: PlaceKind.SITE,
    name: '에도성 (고쿄)',
    localName: '江戸城',
    modernAddress: '일본 도쿄도 지요다구 지요다 1-1',
    latitude: 35.685175,
    longitude: 139.752799,
    precision: PlaceCoordinatePrecision.EXACT,
    defaultZoom: 15,
    countryIso: 'JP',
    aliases: ['도쿄도 지요다구 에도성', '무사시국 에도성', '에도성', '도쿄도 지요다구'],
  },
  {
    key: 'curated:moscow-kremlin',
    kind: PlaceKind.SITE,
    name: '모스크바 크렘린',
    localName: 'Московский Кремль',
    modernAddress: '러시아 모스크바 크렘린',
    latitude: 55.752023,
    longitude: 37.617499,
    precision: PlaceCoordinatePrecision.EXACT,
    defaultZoom: 15,
    countryIso: 'RU',
    aliases: ['모스크바 크렘린', '크렘린'],
  },
  {
    key: 'curated:hofburg-palace',
    kind: PlaceKind.SITE,
    name: '호프부르크 왕궁',
    localName: 'Hofburg',
    modernAddress: '오스트리아 빈 미하엘 광장 1 (Michaelerplatz 1, Wien)',
    latitude: 48.206506,
    longitude: 16.365612,
    precision: PlaceCoordinatePrecision.EXACT,
    defaultZoom: 16,
    countryIso: 'AT',
    aliases: ['오스트리아 빈 호프부르크 궁', '빈 호프부르크 궁', '호프부르크 궁', '호프부르크 왕궁'],
  },
  {
    key: 'curated:winter-palace',
    kind: PlaceKind.SITE,
    name: '겨울궁전',
    localName: 'Зимний дворец',
    modernAddress: '러시아 상트페테르부르크 궁전 광장 2',
    latitude: 59.939832,
    longitude: 30.31456,
    precision: PlaceCoordinatePrecision.EXACT,
    defaultZoom: 16,
    countryIso: 'RU',
    aliases: ['상트페테르부르크 겨울궁전', '겨울궁전', '겨울 궁전'],
  },
  {
    key: 'curated:ribeira-palace',
    kind: PlaceKind.SITE,
    name: '리베이라 궁터 (코메르시우 광장)',
    localName: 'Paço da Ribeira',
    modernAddress: '포르투갈 리스본 코메르시우 광장 (Praça do Comércio, Lisboa)',
    latitude: 38.7075,
    longitude: -9.1364,
    precision: PlaceCoordinatePrecision.EXACT,
    defaultZoom: 16,
    countryIso: 'PT',
    aliases: ['리스본 리베이라 궁', '리베이라 궁', 'Paço da Ribeira'],
  },
  {
    key: 'curated:royal-palace-turin',
    kind: PlaceKind.SITE,
    name: '토리노 왕궁',
    localName: 'Palazzo Reale di Torino',
    modernAddress: '이탈리아 피에몬테주 토리노 카스텔로 광장 (Piazzetta Reale 1, Torino)',
    latitude: 45.0729,
    longitude: 7.6863,
    precision: PlaceCoordinatePrecision.EXACT,
    defaultZoom: 16,
    countryIso: 'IT',
    aliases: ['토리노 왕궁', 'Palazzo Reale di Torino'],
  },
  {
    key: 'curated:madrid-alcazar',
    kind: PlaceKind.SITE,
    name: '마드리드 알카사르터 (마드리드 왕궁)',
    localName: 'Real Alcázar de Madrid',
    modernAddress: '스페인 마드리드 바이렌 거리 (Calle de Bailén, Madrid)',
    latitude: 40.417955,
    longitude: -3.714312,
    precision: PlaceCoordinatePrecision.EXACT,
    defaultZoom: 16,
    countryIso: 'ES',
    aliases: ['마드리드 알카사르', 'Real Alcázar de Madrid'],
  },
  {
    key: 'curated:tuileries-palace',
    kind: PlaceKind.SITE,
    name: '튈르리 궁전터',
    localName: 'Palais des Tuileries',
    modernAddress: '프랑스 파리 1구 튈르리 정원 (Jardin des Tuileries, Paris)',
    latitude: 48.8625,
    longitude: 2.3314,
    precision: PlaceCoordinatePrecision.EXACT,
    defaultZoom: 16,
    countryIso: 'FR',
    aliases: ['파리 튈르리 궁', '튈르리 궁', '튈르리 궁전'],
  },
  {
    key: 'curated:versailles-palace',
    kind: PlaceKind.SITE,
    name: '베르사유 궁전',
    localName: 'Château de Versailles',
    modernAddress: '프랑스 일드프랑스 이블린주 베르사유',
    latitude: 48.804865,
    longitude: 2.120355,
    precision: PlaceCoordinatePrecision.EXACT,
    defaultZoom: 15,
    countryIso: 'FR',
    aliases: ['베르사유 궁전', '베르사유 궁', '베르사유'],
  },
  {
    key: 'curated:fontainebleau',
    kind: PlaceKind.SITE,
    name: '퐁텐블로 성',
    localName: 'Château de Fontainebleau',
    modernAddress: '프랑스 일드프랑스 센에마른주 퐁텐블로',
    latitude: 48.4022,
    longitude: 2.7016,
    precision: PlaceCoordinatePrecision.EXACT,
    defaultZoom: 15,
    countryIso: 'FR',
    aliases: ['퐁텐블로', '퐁텐블로 성', '퐁텐블로 궁'],
  },
  {
    key: 'curated:ipatiev-house',
    kind: PlaceKind.SITE,
    name: '이파티예프 하우스터 (피의 사원)',
    localName: 'Дом Ипатьева',
    modernAddress: '러시아 스베르들롭스크주 예카테린부르크',
    latitude: 56.8444,
    longitude: 60.6089,
    precision: PlaceCoordinatePrecision.EXACT,
    defaultZoom: 16,
    countryIso: 'RU',
    aliases: ['우랄 예카테린부르크 이파티예프 가', '예카테린부르크 이파티예프 가', '이파티예프 가'],
  },
  {
    key: 'curated:wakayama-castle',
    kind: PlaceKind.SITE,
    name: '와카야마성',
    localName: '和歌山城',
    modernAddress: '일본 와카야마현 와카야마시 이치반초 3',
    latitude: 34.225556,
    longitude: 135.1715,
    precision: PlaceCoordinatePrecision.EXACT,
    defaultZoom: 15,
    countryIso: 'JP',
    aliases: ['와카야마현 와카야마시 와카야마성', '기이국 와카야마성', '와카야마성', '와카야마현 와카야마시'],
  },
  {
    key: 'curated:osaka-castle',
    kind: PlaceKind.SITE,
    name: '오사카성',
    localName: '大坂城',
    modernAddress: '일본 오사카부 오사카시 주오구 오사카조 1-1',
    latitude: 34.687315,
    longitude: 135.526201,
    precision: PlaceCoordinatePrecision.EXACT,
    defaultZoom: 15,
    countryIso: 'JP',
    aliases: ['오사카부 오사카시 오사카성', '셋쓰국 오사카성', '오사카성', '오사카부 오사카시'],
  },
  {
    key: 'curated:aoyama-palace',
    kind: PlaceKind.SITE,
    name: '아오야마 어소 (아카사카 어용지)',
    localName: '青山御所',
    modernAddress: '일본 도쿄도 미나토구 모토아카사카 2-1',
    latitude: 35.6764,
    longitude: 139.7267,
    precision: PlaceCoordinatePrecision.EXACT,
    defaultZoom: 15,
    countryIso: 'JP',
    aliases: ['도쿄도 미나토구 아오야마 어소', '아오야마 어소'],
  },
  {
    key: 'curated:windsor-castle',
    kind: PlaceKind.SITE,
    name: '윈저성',
    localName: 'Windsor Castle',
    modernAddress: '영국 버크셔주 윈저 (Windsor SL4 1NJ, UK)',
    latitude: 51.483889,
    longitude: -0.604444,
    precision: PlaceCoordinatePrecision.EXACT,
    defaultZoom: 16,
    countryIso: 'GB',
    aliases: ['영국 윈저성', '윈저성', 'Windsor Castle'],
  },
  {
    key: 'curated:castelo-sao-jorge',
    kind: PlaceKind.SITE,
    name: '상조르즈 성',
    localName: 'Castelo de São Jorge',
    modernAddress: '포르투갈 리스본 산타크루스드카스텔루',
    latitude: 38.7139,
    longitude: -9.1335,
    precision: PlaceCoordinatePrecision.EXACT,
    defaultZoom: 16,
    countryIso: 'PT',
    aliases: ['Castelo de São Jorge', '상조르즈 성'],
  },
  {
    key: 'curated:el-escorial',
    kind: PlaceKind.SITE,
    name: '엘 에스코리알 왕립 수도원',
    localName: 'Real Sitio de San Lorenzo de El Escorial',
    modernAddress: '스페인 마드리드 지방 산로렌소데엘에스코리알',
    latitude: 40.5891,
    longitude: -4.1477,
    precision: PlaceCoordinatePrecision.EXACT,
    defaultZoom: 15,
    countryIso: 'ES',
    aliases: ['El Escorial', '엘 에스코리알', '산 로렌소 데 엘 에스코리알'],
  },
  {
    key: 'curated:friedrichshof',
    kind: PlaceKind.SITE,
    name: '프리드리히스호프 성',
    localName: 'Schloss Friedrichshof',
    modernAddress: '독일 헤센주 크론베르크임타우누스',
    latitude: 50.1906,
    longitude: 8.5106,
    precision: PlaceCoordinatePrecision.EXACT,
    defaultZoom: 16,
    countryIso: 'DE',
    aliases: ['프리드리히스호프 궁', '프리드리히스호프 성'],
  },
  {
    key: 'curated:hohenzieritz',
    kind: PlaceKind.SITE,
    name: '호엔치라이츠 성',
    localName: 'Schloss Hohenzieritz',
    modernAddress: '독일 메클렌부르크포어포메른주 호엔치라이츠',
    latitude: 53.4439,
    longitude: 13.1408,
    precision: PlaceCoordinatePrecision.EXACT,
    defaultZoom: 16,
    countryIso: 'DE',
    aliases: ['호엔치라이츠 성'],
  },
  {
    key: 'curated:collegio-romano',
    kind: PlaceKind.SITE,
    name: '콜레지오 로마노',
    localName: 'Collegio Romano',
    modernAddress: '이탈리아 로마 콜레지오 로마노 광장 (Piazza del Collegio Romano, Roma)',
    latitude: 41.8986,
    longitude: 12.4803,
    precision: PlaceCoordinatePrecision.EXACT,
    defaultZoom: 17,
    countryIso: 'IT',
    aliases: ['로마 콜레지오 로마노', '콜레지오 로마노'],
  },
  {
    key: 'curated:walter-reed',
    kind: PlaceKind.SITE,
    name: '월터 리드 육군 의료원',
    localName: 'Walter Reed National Military Medical Center',
    modernAddress: '미국 메릴랜드주 베데스다 / 워싱턴 D.C.',
    latitude: 38.9752,
    longitude: -77.0303,
    precision: PlaceCoordinatePrecision.EXACT,
    defaultZoom: 15,
    countryIso: 'US',
    aliases: ['미국 워싱턴 D.C. 월터리드 병원', '월터리드 병원'],
  },
  {
    key: 'curated:hanseong-seoul',
    kind: PlaceKind.SETTLEMENT,
    name: '서울',
    localName: 'Seoul',
    modernAddress: '대한민국 서울특별시',
    latitude: 37.566535,
    longitude: 126.977969,
    precision: PlaceCoordinatePrecision.SETTLEMENT,
    defaultZoom: 12,
    countryIso: 'KR',
    aliases: ['한성부', '한성', '한양', '경성', '경성부', '서울특별시', '대한민국 서울'],
  },
  {
    key: 'curated:geoncheondong',
    kind: PlaceKind.SITE,
    name: '한성부 건천동 (충무공 생가터)',
    localName: '乾川洞',
    modernAddress: '대한민국 서울특별시 중구 인현동1가 31-2 일대',
    latitude: 37.56411,
    longitude: 126.99372,
    precision: PlaceCoordinatePrecision.EXACT,
    defaultZoom: 16,
    countryIso: 'KR',
    aliases: ['한성부 건천동', '건천동'],
  },
  {
    key: 'curated:tokyo',
    kind: PlaceKind.SETTLEMENT,
    name: '도쿄',
    localName: '東京',
    modernAddress: '일본 도쿄도',
    latitude: 35.676192,
    longitude: 139.650311,
    precision: PlaceCoordinatePrecision.SETTLEMENT,
    defaultZoom: 11,
    countryIso: 'JP',
    aliases: ['일본 도쿄', '도쿄도', '에도'],
  },
  {
    key: 'curated:kyoto',
    kind: PlaceKind.SETTLEMENT,
    name: '교토',
    localName: '京都',
    modernAddress: '일본 교토부 교토시',
    latitude: 35.011636,
    longitude: 135.768029,
    precision: PlaceCoordinatePrecision.SETTLEMENT,
    defaultZoom: 12,
    countryIso: 'JP',
    aliases: ['일본 교토', '교토부 교토시', '헤이안쿄'],
  },
  {
    key: 'curated:paris',
    kind: PlaceKind.SETTLEMENT,
    name: '파리',
    localName: 'Paris',
    modernAddress: '프랑스 일드프랑스 파리',
    latitude: 48.856614,
    longitude: 2.352222,
    precision: PlaceCoordinatePrecision.SETTLEMENT,
    defaultZoom: 12,
    countryIso: 'FR',
    aliases: ['프랑스 파리', 'Paris'],
  },
  {
    key: 'curated:london',
    kind: PlaceKind.SETTLEMENT,
    name: '런던',
    localName: 'London',
    modernAddress: '영국 잉글랜드 런던',
    latitude: 51.507351,
    longitude: -0.127758,
    precision: PlaceCoordinatePrecision.SETTLEMENT,
    defaultZoom: 11,
    countryIso: 'GB',
    aliases: ['영국 런던', '잉글랜드 런던', 'London'],
  },
  {
    key: 'curated:berlin',
    kind: PlaceKind.SETTLEMENT,
    name: '베를린',
    localName: 'Berlin',
    modernAddress: '독일 베를린',
    latitude: 52.520007,
    longitude: 13.404954,
    precision: PlaceCoordinatePrecision.SETTLEMENT,
    defaultZoom: 11,
    countryIso: 'DE',
    aliases: ['독일 베를린', 'Berlin'],
  },
  {
    key: 'curated:vienna',
    kind: PlaceKind.SETTLEMENT,
    name: '빈',
    localName: 'Wien',
    modernAddress: '오스트리아 빈',
    latitude: 48.208174,
    longitude: 16.373819,
    precision: PlaceCoordinatePrecision.SETTLEMENT,
    defaultZoom: 12,
    countryIso: 'AT',
    aliases: ['오스트리아 빈', '비엔나', 'Wien'],
  },
  {
    key: 'curated:rome',
    kind: PlaceKind.SETTLEMENT,
    name: '로마',
    localName: 'Roma',
    modernAddress: '이탈리아 라치오주 로마',
    latitude: 41.902783,
    longitude: 12.496366,
    precision: PlaceCoordinatePrecision.SETTLEMENT,
    defaultZoom: 12,
    countryIso: 'IT',
    aliases: ['이탈리아 로마', 'Roma'],
  },
  {
    key: 'curated:naples',
    kind: PlaceKind.SETTLEMENT,
    name: '나폴리',
    localName: 'Napoli',
    modernAddress: '이탈리아 캄파니아주 나폴리',
    latitude: 40.851775,
    longitude: 14.268124,
    precision: PlaceCoordinatePrecision.SETTLEMENT,
    defaultZoom: 12,
    countryIso: 'IT',
    aliases: ['이탈리아 나폴리', 'Napoli'],
  },
  {
    key: 'curated:turin',
    kind: PlaceKind.SETTLEMENT,
    name: '토리노',
    localName: 'Torino',
    modernAddress: '이탈리아 피에몬테주 토리노',
    latitude: 45.070312,
    longitude: 7.686856,
    precision: PlaceCoordinatePrecision.SETTLEMENT,
    defaultZoom: 12,
    countryIso: 'IT',
    aliases: ['이탈리아 토리노', '피에몬테 토리노', 'Torino'],
  },
  {
    key: 'curated:st-petersburg',
    kind: PlaceKind.SETTLEMENT,
    name: '상트페테르부르크',
    localName: 'Санкт-Петербург',
    modernAddress: '러시아 상트페테르부르크',
    latitude: 59.93428,
    longitude: 30.335099,
    precision: PlaceCoordinatePrecision.SETTLEMENT,
    defaultZoom: 11,
    countryIso: 'RU',
    aliases: ['러시아 상트페테르부르크', '페트로그라드', '레닌그라드'],
  },
  {
    key: 'curated:moscow',
    kind: PlaceKind.SETTLEMENT,
    name: '모스크바',
    localName: 'Москва',
    modernAddress: '러시아 모스크바',
    latitude: 55.755826,
    longitude: 37.6173,
    precision: PlaceCoordinatePrecision.SETTLEMENT,
    defaultZoom: 11,
    countryIso: 'RU',
    aliases: ['러시아 모스크바', 'Москва'],
  },
  {
    key: 'curated:beijing',
    kind: PlaceKind.SETTLEMENT,
    name: '베이징',
    localName: '北京',
    modernAddress: '중국 베이징시',
    latitude: 39.9042,
    longitude: 116.407396,
    precision: PlaceCoordinatePrecision.SETTLEMENT,
    defaultZoom: 11,
    countryIso: 'CN',
    aliases: ['중화인민공화국 베이징', '중국 베이징', '베이징시', '북경', '순천부'],
  },
  {
    key: 'curated:washington-dc',
    kind: PlaceKind.SETTLEMENT,
    name: '워싱턴 D.C.',
    localName: 'Washington, D.C.',
    modernAddress: '미국 워싱턴 D.C.',
    latitude: 38.907192,
    longitude: -77.036871,
    precision: PlaceCoordinatePrecision.SETTLEMENT,
    defaultZoom: 12,
    countryIso: 'US',
    aliases: ['미국 워싱턴 D.C.', '워싱턴 DC', 'Washington, D.C.'],
  },
  {
    key: 'curated:tbilisi',
    kind: PlaceKind.SETTLEMENT,
    name: '트빌리시',
    localName: 'თბილისი',
    modernAddress: '조지아 트빌리시',
    latitude: 41.715138,
    longitude: 44.827096,
    precision: PlaceCoordinatePrecision.SETTLEMENT,
    defaultZoom: 12,
    countryIso: 'GE',
    aliases: ['조지아 트빌리시', '티플리스', 'Tbilisi'],
  },
  {
    key: 'curated:aachen',
    kind: PlaceKind.SETTLEMENT,
    name: '아헨',
    localName: 'Aachen',
    modernAddress: '독일 노르트라인베스트팔렌주 아헨',
    latitude: 50.775346,
    longitude: 6.083887,
    precision: PlaceCoordinatePrecision.SETTLEMENT,
    defaultZoom: 12,
    countryIso: 'DE',
    aliases: ['독일 노르트라인 베스트팔렌 주 아헨', '엑스라샤펠', 'Aix-la-Chapelle', 'Aachen'],
  },
  {
    key: 'curated:darmstadt',
    kind: PlaceKind.SETTLEMENT,
    name: '다름슈타트',
    localName: 'Darmstadt',
    modernAddress: '독일 헤센주 다름슈타트',
    latitude: 49.8728,
    longitude: 8.6512,
    precision: PlaceCoordinatePrecision.SETTLEMENT,
    defaultZoom: 12,
    countryIso: 'DE',
    aliases: ['다름슈타트', '헤센 다름슈타트'],
  },
]

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function geocodeExternal(query: string): Promise<{
  name: string
  localName: string | null
  modernAddress: string | null
  latitude: number
  longitude: number
  googlePlaceId: string | null
  externalKey: string | null
  countryIso: string | null
} | null> {
  const googleKey =
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.GOOGLE_PLACES_API_KEY?.trim()

  if (googleKey) {
    try {
      const res = await fetch(
        'https://places.googleapis.com/v1/places:searchText',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': googleKey,
            'X-Goog-FieldMask':
              'places.id,places.displayName,places.formattedAddress,places.location,places.addressComponents',
          },
          body: JSON.stringify({ textQuery: query, languageCode: 'ko', maxResultCount: 1 }),
        },
      )
      if (res.ok) {
        const json = (await res.json()) as { places?: any[] }
        const first = json.places?.[0]
        if (first?.location?.latitude != null && first?.location?.longitude != null) {
          const countryComp = (first.addressComponents ?? []).find((c: any) =>
            Array.isArray(c.types) && c.types.includes('country'),
          )
          return {
            name: first.displayName?.text?.trim() || query,
            localName: null,
            modernAddress: first.formattedAddress ?? null,
            latitude: Number(Number(first.location.latitude).toFixed(7)),
            longitude: Number(Number(first.location.longitude).toFixed(7)),
            googlePlaceId: String(first.id),
            externalKey: `google:${first.id}`,
            countryIso: countryComp?.shortText?.toUpperCase() ?? null,
          }
        }
      }
    } catch {
      // fall through to Nominatim
    }
  }

  for (const lang of ['ko,en', 'en']) {
    try {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        addressdetails: '1',
        namedetails: '1',
        limit: '1',
      })
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        {
          headers: {
            'User-Agent': 'Papyrus-GazetteerBackfill/2.0 (admin@papyrus.local)',
            'Accept-Language': lang,
          },
        },
      )
      await sleep(260)
      if (!res.ok) continue
      const arr = (await res.json()) as any[]
      const item = arr?.[0]
      if (!item?.lat || !item?.lon) continue
      const lat = Number(parseFloat(item.lat).toFixed(7))
      const lng = Number(parseFloat(item.lon).toFixed(7))
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
      const namedetails = item.namedetails ?? {}
      const koName = namedetails['name:ko']?.trim()
      const rawName = item.name?.trim()
      const name =
        koName ||
        rawName ||
        String(item.display_name ?? '')
          .split(',')[0]
          .trim() ||
        query
      const osmKey =
        item.osm_type && item.osm_id
          ? `osm:${item.osm_type}:${item.osm_id}`
          : item.place_id
            ? `nominatim:${item.place_id}`
            : null
      return {
        name,
        localName: rawName && rawName !== name ? rawName : null,
        modernAddress: item.display_name ?? null,
        latitude: lat,
        longitude: lng,
        googlePlaceId: null,
        externalKey: osmKey,
        countryIso: item.address?.country_code
          ? String(item.address.country_code).toUpperCase()
          : null,
      }
    } catch {
      // retry next lang
    }
  }

  return null
}

async function main() {
  console.log('🌍 [1/4] 국가 코드 인덱스 및 정본 Gazetteer 시드 준비...')
  const countries = await prisma.country.findMany({
    select: { id: true, name: true, isoCode: true },
  })
  const countryIdByIso = new Map<string, string>()
  for (const c of countries) {
    if (c.isoCode) countryIdByIso.set(c.isoCode.toUpperCase(), c.id)
  }

  const aliasToPlaceId = new Map<string, string>()
  const registerLookup = (label: string | null | undefined, placeId: string) => {
    if (!label) return
    aliasToPlaceId.set(label.trim().toLowerCase(), placeId)
  }

  // 1) 정본 시드 Upsert
  for (const seed of CURATED_GAZETTEER_SEEDS) {
    const countryId = countryIdByIso.get(seed.countryIso) ?? null
    const place = await prisma.place.upsert({
      where: { externalKey: seed.key },
      update: {
        kind: seed.kind,
        name: seed.name,
        localName: seed.localName,
        modernAddress: seed.modernAddress,
        latitude: seed.latitude,
        longitude: seed.longitude,
        coordinatePrecision: seed.precision,
        defaultZoom: seed.defaultZoom,
        ...(countryId ? { countryId } : {}),
      },
      create: {
        externalKey: seed.key,
        kind: seed.kind,
        name: seed.name,
        localName: seed.localName,
        modernAddress: seed.modernAddress,
        latitude: seed.latitude,
        longitude: seed.longitude,
        coordinatePrecision: seed.precision,
        defaultZoom: seed.defaultZoom,
        countryId,
      },
    })
    registerLookup(seed.name, place.id)
    registerLookup(seed.localName, place.id)
    for (const alias of seed.aliases) {
      registerLookup(alias, place.id)
      const exists = await prisma.placeName.findFirst({
        where: { placeId: place.id, name: alias },
        select: { id: true },
      })
      if (!exists) {
        await prisma.placeName.create({
          data: {
            placeId: place.id,
            name: alias,
            kind: PlaceNameKind.HISTORICAL,
          },
        })
      }
    }
  }

  // 2) 기존 City 테이블 전량 흡수 (legacyCityId 브리지)
  console.log('🏙️  [2/4] 기존 City 테이블 -> Place(SETTLEMENT) 흡수...')
  const cities = await prisma.city.findMany()
  for (const city of cities) {
    const place = await prisma.place.upsert({
      where: { legacyCityId: city.id },
      update: {
        name: city.name,
        localName: city.localName,
        latitude: city.latitude,
        longitude: city.longitude,
        population: city.population,
        areaSqKm: city.areaSqKm,
        countryId: city.countryId,
        historicalCountryId: city.historicalCountryId,
        administrativeDivisionId: city.administrativeDivisionId,
      },
      create: {
        legacyCityId: city.id,
        kind: PlaceKind.SETTLEMENT,
        name: city.name,
        localName: city.localName,
        latitude: city.latitude,
        longitude: city.longitude,
        coordinatePrecision:
          city.latitude != null ? PlaceCoordinatePrecision.SETTLEMENT : null,
        defaultZoom: 12,
        population: city.population,
        areaSqKm: city.areaSqKm,
        countryId: city.countryId,
        historicalCountryId: city.historicalCountryId,
        administrativeDivisionId: city.administrativeDivisionId,
      },
    })
    registerLookup(city.name, place.id)
    registerLookup(city.localName, place.id)
  }
  console.log(`   ✓ City ${cities.length}건 Place 동기화 완료`)

  // 기존 DB Place 전체도 lookup에 적재
  const existingPlaces = await prisma.place.findMany({
    include: { names: { select: { name: true } } },
  })
  for (const p of existingPlaces) {
    registerLookup(p.name, p.id)
    registerLookup(p.localName, p.id)
    for (const n of p.names) registerLookup(n.name, p.id)
  }

  // 3) 인물 출생지·사망지 전량 분해 및 지오코딩
  console.log('🧭 [3/4] 인물 출생지·사망지 텍스트 구조 분해 및 Place 정본화...')
  const persons = await prisma.person.findMany({
    where: {
      OR: [
        { birthPlaceText: { not: null } },
        { deathPlaceText: { not: null } },
        { birthCityId: { not: null } },
        { deathCityId: { not: null } },
      ],
    },
    include: {
      country: { select: { id: true, name: true } },
      historicalCountry: { select: { id: true, name: true } },
      countryAffiliations: {
        include: {
          country: { select: { id: true, name: true } },
          historicalCountry: { select: { id: true, name: true } },
        },
      },
    },
  })

  const queryMissSet = new Set<string>()
  let geocodedCount = 0
  let reusedCount = 0
  let unpinnedPlaceCount = 0
  let migratedClaimsCount = 0

  const resolveClaimPlaceId = async (
    claim: ReturnType<typeof decomposeHistoricalPlaceText>[number],
    affHistCountryId: string | null,
    affCountryId: string | null,
  ): Promise<string | null> => {
    if (claim.certainty === PersonPlaceCertainty.UNKNOWN) {
      return null
    }

    // 1) 메모리 별칭/정본 매칭
    const directCandidates = [
      ...claim.geocodeQueries,
      claim.modernEquivalent,
      claim.localNameHint,
      claim.historicalLabel,
    ].filter(Boolean) as string[]

    for (const cand of directCandidates) {
      const hitId = aliasToPlaceId.get(cand.trim().toLowerCase())
      if (hitId) {
        reusedCount++
        return hitId
      }
    }

    // 2) 외부 지오코딩 시도
    for (const q of claim.geocodeQueries) {
      const key = q.trim().toLowerCase()
      if (aliasToPlaceId.has(key)) {
        reusedCount++
        return aliasToPlaceId.get(key)!
      }
      if (queryMissSet.has(key)) continue

      const geo = await geocodeExternal(q)
      if (!geo) {
        queryMissSet.add(key)
        continue
      }

      geocodedCount++
      const countryId =
        (geo.countryIso ? countryIdByIso.get(geo.countryIso) : null) ??
        affCountryId ??
        null

      let place = geo.googlePlaceId
        ? await prisma.place.findUnique({ where: { googlePlaceId: geo.googlePlaceId } })
        : geo.externalKey
          ? await prisma.place.findUnique({ where: { externalKey: geo.externalKey } })
          : null

      if (!place) {
        place = await prisma.place.create({
          data: {
            kind: claim.inferredKind,
            name: (claim.modernEquivalent ?? geo.name).slice(0, 200),
            localName: (claim.localNameHint ?? geo.localName)?.slice(0, 200) ?? null,
            modernAddress: geo.modernAddress?.slice(0, 500) ?? null,
            latitude: geo.latitude,
            longitude: geo.longitude,
            coordinatePrecision: claim.inferredPrecision,
            googlePlaceId: geo.googlePlaceId,
            externalKey: geo.externalKey,
            defaultZoom: claim.defaultZoom,
            countryId,
            historicalCountryId: affHistCountryId,
          },
        })
      }

      registerLookup(place.name, place.id)
      registerLookup(q, place.id)
      registerLookup(claim.historicalLabel, place.id)
      if (claim.modernEquivalent) registerLookup(claim.modernEquivalent, place.id)
      if (claim.localNameHint) registerLookup(claim.localNameHint, place.id)

      if (claim.historicalLabel && claim.historicalLabel !== place.name) {
        const aliasExists = await prisma.placeName.findFirst({
          where: { placeId: place.id, name: claim.historicalLabel.slice(0, 250) },
          select: { id: true },
        })
        if (!aliasExists) {
          await prisma.placeName.create({
            data: {
              placeId: place.id,
              name: claim.historicalLabel.slice(0, 250),
              kind: PlaceNameKind.HISTORICAL,
              historicalCountryId: affHistCountryId,
            },
          })
        }
      }

      return place.id
    }

    // 3) 외부 지오코딩 미매칭 고대/중세 소지명도 정본 Place 행(좌표 미확정)으로 생성해 구조 일관성 유지
    const fallbackName = (claim.modernEquivalent ?? claim.historicalLabel).slice(0, 200)
    const fallbackKey = fallbackName.toLowerCase()
    if (aliasToPlaceId.has(fallbackKey)) {
      return aliasToPlaceId.get(fallbackKey)!
    }
    const unpinned = await prisma.place.create({
      data: {
        kind: claim.inferredKind,
        name: fallbackName,
        localName: claim.localNameHint?.slice(0, 200) ?? null,
        defaultZoom: claim.defaultZoom,
        countryId: affCountryId,
        historicalCountryId: affHistCountryId,
      },
    })
    unpinnedPlaceCount++
    registerLookup(fallbackName, unpinned.id)
    registerLookup(claim.historicalLabel, unpinned.id)
    return unpinned.id
  }

  let processedPersons = 0
  for (const person of persons) {
    processedPersons++
    if (processedPersons % 50 === 0) {
      console.log(
        `   ... 진행 ${processedPersons}/${persons.length}명 (신규 지오코딩 ${geocodedCount}, 정본 재사용 ${reusedCount})`,
      )
    }

    const birthAff = person.countryAffiliations.find(
      (a) => a.affiliationType === 'BIRTH_PLACE',
    )
    const deathAff = person.countryAffiliations.find(
      (a) => a.affiliationType === 'DEATH_PLACE',
    )
    const fallbackCountryName = person.country?.name ?? null

    await prisma.personPlace.deleteMany({
      where: {
        personId: person.id,
        role: { in: [PersonPlaceRole.BIRTH, PersonPlaceRole.DEATH] },
      },
    })

    let prefBirthPlaceId: string | null = null
    let prefBirthHistLabel: string | null = null
    let prefDeathPlaceId: string | null = null
    let prefDeathHistLabel: string | null = null

    if (person.birthPlaceText?.trim()) {
      const birthClaims = decomposeHistoricalPlaceText(person.birthPlaceText, {
        fallbackCountryName:
          birthAff?.country?.name ?? fallbackCountryName,
      })
      for (let i = 0; i < birthClaims.length; i++) {
        const c = birthClaims[i]
        const placeId = await resolveClaimPlaceId(
          c,
          birthAff?.historicalCountryId ?? person.historicalCountryId ?? null,
          birthAff?.countryId ?? person.countryId ?? null,
        )
        await prisma.personPlace.create({
          data: {
            personId: person.id,
            role: PersonPlaceRole.BIRTH,
            placeId,
            historicalLabel: c.historicalLabel.slice(0, 255),
            countryId: birthAff?.countryId ?? null,
            historicalCountryId: birthAff?.historicalCountryId ?? null,
            estimateRole: c.estimateRole,
            certainty: c.certainty,
            note: c.note,
            sortOrder: i,
          },
        })
        migratedClaimsCount++
        if (i === 0) {
          prefBirthPlaceId = placeId
          prefBirthHistLabel = c.historicalLabel.slice(0, 255)
        }
      }
    }

    if (person.deathPlaceText?.trim()) {
      const deathClaims = decomposeHistoricalPlaceText(person.deathPlaceText, {
        fallbackCountryName:
          deathAff?.country?.name ?? fallbackCountryName,
      })
      for (let i = 0; i < deathClaims.length; i++) {
        const c = deathClaims[i]
        const placeId = await resolveClaimPlaceId(
          c,
          deathAff?.historicalCountryId ?? null,
          deathAff?.countryId ?? null,
        )
        await prisma.personPlace.create({
          data: {
            personId: person.id,
            role: PersonPlaceRole.DEATH,
            placeId,
            historicalLabel: c.historicalLabel.slice(0, 255),
            countryId: deathAff?.countryId ?? null,
            historicalCountryId: deathAff?.historicalCountryId ?? null,
            estimateRole: c.estimateRole,
            certainty: c.certainty,
            note: c.note,
            sortOrder: i,
          },
        })
        migratedClaimsCount++
        if (i === 0) {
          prefDeathPlaceId = placeId
          prefDeathHistLabel = c.historicalLabel.slice(0, 255)
        }
      }
    }

    await prisma.person.update({
      where: { id: person.id },
      data: {
        birthPlaceId: prefBirthPlaceId,
        birthPlaceHistoricalLabel: prefBirthHistLabel,
        deathPlaceId: prefDeathPlaceId,
        deathPlaceHistoricalLabel: prefDeathHistLabel,
      },
    })
  }

  const totalPlaces = await prisma.place.count()
  const pinnedPlaces = await prisma.place.count({
    where: { latitude: { not: null }, longitude: { not: null } },
  })
  const totalPersonPlaces = await prisma.personPlace.count()

  console.log('\n✅ [4/4] 인물 장소 정본화 및 구조화 이관 완료!')
  console.log({
    processedPersons,
    migratedClaimsCount,
    totalPersonPlaces,
    totalPlaces,
    pinnedPlaces,
    unpinnedPlaceCount,
    geocodedCount,
    reusedCount,
  })

  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error('❌ 이관 실패:', err)
  await prisma.$disconnect()
  process.exit(1)
})
