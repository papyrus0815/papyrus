import { HistoricalEntityKind, HistoricalStateType } from '@prisma/client'

import { PrismaService } from '../prisma.service'

const ACCOUNT_ID = '6af53fe7-d02b-4c42-b86c-f32800897b32'

interface HistoricalCountryEntry {
  name: string
  enName?: string
  description?: string
  startEra?: 'BC' | 'AD'
  startYear?: number
  startMonth?: number
  endEra?: 'BC' | 'AD'
  endYear?: number
  endMonth?: number
  stateType: HistoricalStateType
  entityKind?: HistoricalEntityKind
  latitude?: number
  longitude?: number
  linkToIsoCodes: string[]
}

const ENTRIES: HistoricalCountryEntry[] = [
  // ── 중세·근세 사보이 ─────────────────────────────────────────────────
  {
    name: '사보이 백국',
    enName: 'County of Savoy',
    description:
      '1003년경 움베르토 1세(백수공)가 신성로마 황제 루돌프 3세로부터 사보이 지역을 봉토로 받아 ' +
      '수립한 백국. 알프스 서부의 전략적 요충지를 장악하면서 프랑스·이탈리아 사이의 중간 지대를 통제했다. ' +
      '1416년 황제 지기스문트가 아메데오 8세를 공작으로 책봉하면서 사보이 공국으로 승격되었다.',
    startEra: 'AD', startYear: 1003,
    endEra: 'AD', endYear: 1416,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 45.6, longitude: 6.9,
    linkToIsoCodes: ['IT', 'FR'],
  },
  {
    name: '사보이 공국',
    enName: 'Duchy of Savoy',
    description:
      '1416년 신성로마 황제 지기스문트가 아메데오 8세에게 공작 칭호를 수여하여 성립한 공국. ' +
      '사보이·피에몬테·니스를 중심으로 알프스 서부의 군사·외교적 핵심을 차지했으며, ' +
      '16세기 이탈리아 전쟁에서 프랑스의 점령(1536~1559)으로 사실상 영토를 상실했으나 ' +
      '1559년 카토-캄브레지 조약으로 에마누엘레 필리베르토 공작이 본토를 회복했다. ' +
      '17세기 비토리오 아메데오 2세 치하에서 군사·외교적 부상을 시작, ' +
      '1713년 위트레흐트 조약으로 시칠리아 왕국을 획득하며 왕국으로 승격되었고, ' +
      '1720년 사르데냐 왕국으로 개편되어 후일 이탈리아 통일의 주체가 된다.',
    startEra: 'AD', startYear: 1416,
    endEra: 'AD', endYear: 1713,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 45.1, longitude: 7.7,
    linkToIsoCodes: ['IT', 'FR'],
  },
]

export async function seedSavoyHistoricalCountries(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🏔️ 사보이 관련 역사 국가 시딩 시작...')

  const isoToModernId = new Map<string, string>()
  const allIsoCodes = new Set(ENTRIES.flatMap((e) => e.linkToIsoCodes))
  for (const isoCode of allIsoCodes) {
    const country = await prisma.country.findFirst({
      where: { isoCode },
      select: { id: true },
    })
    if (country) {
      isoToModernId.set(isoCode, country.id)
    } else {
      console.warn(`  ⚠️  현대 국가를 찾을 수 없음: ${isoCode}`)
    }
  }

  for (const entry of ENTRIES) {
    const existing = await prisma.historicalCountry.findFirst({
      where: { name: entry.name },
    })

    let id: string

    if (existing) {
      id = existing.id
      console.log(`  ⏭️  ${entry.name}`)
    } else {
      const created = await prisma.historicalCountry.create({
        data: {
          name: entry.name,
          enName: entry.enName,
          description: entry.description,
          startEra: entry.startEra as any,
          startYear: entry.startYear,
          startMonth: entry.startMonth,
          endEra: entry.endEra as any,
          endYear: entry.endYear,
          endMonth: entry.endMonth,
          stateType: entry.stateType,
          entityKind: entry.entityKind,
          latitude: entry.latitude,
          longitude: entry.longitude,
          accountId: ACCOUNT_ID,
        },
      })
      id = created.id
      console.log(`  ✅ ${entry.name}`)
    }

    for (const isoCode of entry.linkToIsoCodes) {
      const modernCountryId = isoToModernId.get(isoCode)
      if (!modernCountryId) continue

      const linkExists = await prisma.historicalCountryModernCountry.findFirst({
        where: { historicalCountryId: id, modernCountryId },
      })
      if (!linkExists) {
        await prisma.historicalCountryModernCountry.create({
          data: { historicalCountryId: id, modernCountryId },
        })
      }
    }
  }

  console.log(`✅ 사보이 역사 국가 시딩 완료 (${ENTRIES.length}건)\n`)
}
