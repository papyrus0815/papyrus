/**
 * 자연지리·인프라 국가별 시드의 공통 헬퍼.
 *
 * 사용 예 (각 국가 시드):
 *   await seedGeographyForCountry(prisma, {
 *     isoCode: 'JP',
 *     countryNameKo: '일본',
 *     naturalFeatures: [...],
 *     infrastructures: [...],
 *   })
 */
import { PrismaService } from '../prisma.service'

export interface NaturalFeatureSeed {
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

export interface InfrastructureSeed {
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

export interface GeographySeedInput {
  /** Country.isoCode (예: 'KR', 'JP') */
  isoCode: string
  /** 로그용 국가명 */
  countryNameKo: string
  naturalFeatures: NaturalFeatureSeed[]
  infrastructures: InfrastructureSeed[]
}

/**
 * 한 국가의 NaturalFeature·Infrastructure를 idempotent하게 시딩.
 * (type, name) 키 기준으로 중복 skip — 재실행 안전.
 */
export async function seedGeographyForCountry(
  prisma: PrismaService,
  input: GeographySeedInput,
): Promise<void> {
  console.log(`\n🌍 ${input.countryNameKo} 자연지리·인프라 시딩 시작...`)

  const country = await prisma.country.findFirst({
    where: { isoCode: input.isoCode },
    select: { id: true },
  })
  if (!country) {
    console.warn(
      `  ⚠️  ${input.countryNameKo}(${input.isoCode}) Country 레코드 없음 — 시딩 건너뜀`,
    )
    return
  }

  const existingFeatures = await prisma.naturalFeature.findMany({
    where: { countryId: country.id },
    select: { type: true, name: true },
  })
  const existingFeatureKeys = new Set(
    existingFeatures.map((f) => `${f.type}::${f.name}`),
  )

  let createdFeatures = 0
  for (const f of input.naturalFeatures) {
    if (existingFeatureKeys.has(`${f.type}::${f.name}`)) continue
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
  for (const i of input.infrastructures) {
    if (existingInfraKeys.has(`${i.type}::${i.name}`)) continue
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
