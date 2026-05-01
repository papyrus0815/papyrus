/**
 * 대한민국 자연지리(NaturalFeature) + 인프라(Infrastructure) 시드.
 *
 * 시연·테스트용 대표 항목 — 명승·대형 인프라 위주.
 * Country '대한민국'을 isoCode 'KR'로 조회한 뒤 그 ID를 모든 항목에 연결.
 */
import { PrismaService } from '../prisma.service'

interface NaturalFeatureSeed {
  type: 'mountain' | 'river' | 'lake' | 'coast'
  name: string
  localName?: string
  region?: string
  latitude?: number
  longitude?: number
  heightM?: number
  lengthKm?: number
  areaSqKm?: number
  isProtected?: boolean
}

interface InfrastructureSeed {
  type: 'highway' | 'railway' | 'airport' | 'port'
  name: string
  localName?: string
  code?: string
  region?: string
  latitude?: number
  longitude?: number
  lengthKm?: number
  capacity?: string
  operatorName?: string
  openedYear?: number
}

const NATURAL_FEATURES: NaturalFeatureSeed[] = [
  // 산
  {
    type: 'mountain',
    name: '한라산',
    localName: 'Hallasan',
    region: '제주특별자치도',
    latitude: 33.3617,
    longitude: 126.5292,
    heightM: 1947,
    isProtected: true,
  },
  {
    type: 'mountain',
    name: '지리산',
    localName: 'Jirisan',
    region: '전북·전남·경남',
    latitude: 35.3373,
    longitude: 127.7305,
    heightM: 1915,
    isProtected: true,
  },
  {
    type: 'mountain',
    name: '설악산',
    localName: 'Seoraksan',
    region: '강원특별자치도 속초·인제·양양',
    latitude: 38.1196,
    longitude: 128.4655,
    heightM: 1708,
    isProtected: true,
  },
  {
    type: 'mountain',
    name: '북한산',
    localName: 'Bukhansan',
    region: '서울·경기',
    latitude: 37.6588,
    longitude: 126.9783,
    heightM: 836,
    isProtected: true,
  },
  // 강
  {
    type: 'river',
    name: '한강',
    localName: 'Hangang',
    region: '강원·충북·경기·서울',
    latitude: 37.5326,
    longitude: 126.9905,
    lengthKm: 494,
  },
  {
    type: 'river',
    name: '낙동강',
    localName: 'Nakdong-gang',
    region: '강원·경북·대구·경남·부산',
    latitude: 35.1014,
    longitude: 128.95,
    lengthKm: 510,
  },
  {
    type: 'river',
    name: '금강',
    localName: 'Geumgang',
    region: '전북·충북·충남',
    latitude: 36.0,
    longitude: 127.1,
    lengthKm: 401,
  },
  // 호수
  {
    type: 'lake',
    name: '소양호',
    localName: 'Soyangho',
    region: '강원특별자치도 춘천·인제·양구',
    latitude: 37.9571,
    longitude: 127.8146,
    areaSqKm: 70.0,
  },
  {
    type: 'lake',
    name: '충주호',
    localName: 'Chungjuho',
    region: '충청북도 충주·제천·단양',
    latitude: 36.9836,
    longitude: 127.9931,
    areaSqKm: 67.5,
  },
  // 해안
  {
    type: 'coast',
    name: '동해안',
    localName: 'East Coast',
    region: '강원·경북·울산',
    latitude: 37.7,
    longitude: 129.0,
    lengthKm: 405,
  },
  {
    type: 'coast',
    name: '서해안 (남양만 ~ 가로림만)',
    localName: 'Yellow Sea Coast',
    region: '경기·충남',
    latitude: 36.7,
    longitude: 126.5,
    lengthKm: 250,
  },
  {
    type: 'coast',
    name: '남해안 다도해',
    localName: 'Dadohae',
    region: '전남·경남',
    latitude: 34.55,
    longitude: 127.5,
    isProtected: true,
  },
]

const INFRASTRUCTURES: InfrastructureSeed[] = [
  // 고속도로
  {
    type: 'highway',
    name: '경부고속도로',
    localName: 'Gyeongbu Expressway',
    code: '1번',
    region: '서울 ↔ 부산',
    latitude: 37.0,
    longitude: 127.5,
    lengthKm: 416.0,
    operatorName: '한국도로공사',
    openedYear: 1970,
  },
  {
    type: 'highway',
    name: '서해안고속도로',
    localName: 'West Coast Expressway',
    code: '15번',
    region: '서울 ↔ 목포',
    latitude: 36.5,
    longitude: 126.8,
    lengthKm: 340.8,
    operatorName: '한국도로공사',
    openedYear: 2001,
  },
  // 철도
  {
    type: 'railway',
    name: 'KTX 경부선',
    localName: 'KTX Gyeongbu Line',
    code: 'KTX',
    region: '서울 ↔ 부산',
    lengthKm: 417.5,
    capacity: '연 9천만명',
    operatorName: '한국철도공사 (코레일)',
    openedYear: 2004,
  },
  {
    type: 'railway',
    name: 'GTX-A',
    localName: 'GTX-A',
    code: 'GTX-A',
    region: '운정 ↔ 동탄',
    lengthKm: 82.1,
    operatorName: '에스지레일',
    openedYear: 2024,
  },
  // 공항
  {
    type: 'airport',
    name: '인천국제공항',
    localName: 'Incheon International Airport',
    code: 'ICN',
    region: '인천광역시 중구',
    latitude: 37.4602,
    longitude: 126.4407,
    capacity: '연 7,700만명',
    operatorName: '인천국제공항공사',
    openedYear: 2001,
  },
  {
    type: 'airport',
    name: '김포국제공항',
    localName: 'Gimpo International Airport',
    code: 'GMP',
    region: '서울특별시 강서구',
    latitude: 37.5583,
    longitude: 126.7906,
    capacity: '연 2,500만명',
    operatorName: '한국공항공사',
    openedYear: 1958,
  },
  {
    type: 'airport',
    name: '제주국제공항',
    localName: 'Jeju International Airport',
    code: 'CJU',
    region: '제주특별자치도 제주시',
    latitude: 33.5113,
    longitude: 126.4929,
    capacity: '연 3,150만명',
    operatorName: '한국공항공사',
    openedYear: 1968,
  },
  // 항구
  {
    type: 'port',
    name: '부산항',
    localName: 'Port of Busan',
    code: 'KRPUS',
    region: '부산광역시',
    latitude: 35.1,
    longitude: 129.04,
    capacity: '연 22M TEU',
    operatorName: '부산항만공사',
    openedYear: 1876,
  },
  {
    type: 'port',
    name: '인천항',
    localName: 'Port of Incheon',
    code: 'KRINC',
    region: '인천광역시 중구',
    latitude: 37.4525,
    longitude: 126.6087,
    capacity: '연 3.5M TEU',
    operatorName: '인천항만공사',
    openedYear: 1883,
  },
]

export async function seedKoreaGeography(prisma: PrismaService): Promise<void> {
  console.log('\n🇰🇷 대한민국 자연지리·인프라 시딩 시작...')

  const country = await prisma.country.findFirst({
    where: { isoCode: 'KR' },
    select: { id: true, name: true },
  })
  if (!country) {
    console.warn('  ⚠️  대한민국 Country 레코드 없음 — 시딩 건너뜀')
    return
  }

  // Idempotency: 같은 국가에 이미 동일 (type, name)이 있으면 skip
  const existingFeatures = await prisma.naturalFeature.findMany({
    where: { countryId: country.id },
    select: { type: true, name: true },
  })
  const existingFeatureKeys = new Set(
    existingFeatures.map((f) => `${f.type}::${f.name}`),
  )

  let createdFeatures = 0
  for (const f of NATURAL_FEATURES) {
    const key = `${f.type}::${f.name}`
    if (existingFeatureKeys.has(key)) continue
    await prisma.naturalFeature.create({
      data: {
        countryId: country.id,
        type: f.type,
        name: f.name,
        localName: f.localName ?? null,
        region: f.region ?? null,
        latitude: f.latitude ?? null,
        longitude: f.longitude ?? null,
        heightM: f.heightM ?? null,
        lengthKm: f.lengthKm ?? null,
        areaSqKm: f.areaSqKm ?? null,
        isProtected: f.isProtected ?? false,
      },
    })
    createdFeatures++
  }
  console.log(
    `  ✅ NaturalFeature: 신규 ${createdFeatures}건 / 기존 ${existingFeatures.length}건`,
  )

  const existingInfra = await prisma.infrastructure.findMany({
    where: { countryId: country.id },
    select: { type: true, name: true },
  })
  const existingInfraKeys = new Set(
    existingInfra.map((i) => `${i.type}::${i.name}`),
  )

  let createdInfra = 0
  for (const i of INFRASTRUCTURES) {
    const key = `${i.type}::${i.name}`
    if (existingInfraKeys.has(key)) continue
    await prisma.infrastructure.create({
      data: {
        countryId: country.id,
        type: i.type,
        name: i.name,
        localName: i.localName ?? null,
        code: i.code ?? null,
        region: i.region ?? null,
        latitude: i.latitude ?? null,
        longitude: i.longitude ?? null,
        lengthKm: i.lengthKm ?? null,
        capacity: i.capacity ?? null,
        operatorName: i.operatorName ?? null,
        openedYear: i.openedYear ?? null,
      },
    })
    createdInfra++
  }
  console.log(
    `  ✅ Infrastructure: 신규 ${createdInfra}건 / 기존 ${existingInfra.length}건`,
  )
}
