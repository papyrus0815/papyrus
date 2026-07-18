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
  // ── 서슬라브 초기 국가 ────────────────────────────────────────────
  {
    name: '대모라비아 왕국',
    enName: 'Great Moravia',
    description:
      '833년경 모이미르 1세가 모라바강 유역에 세운 서슬라브족 최초의 본격적 국가. ' +
      '863년 키릴로스·메토디오스 형제를 초빙해 슬라브 문자와 전례의 발상지가 되었으며, ' +
      '스바토플루크 1세 치세에 보헤미아·판노니아까지 아우르는 최대 판도를 이루었으나 907년경 마자르족의 침공으로 붕괴했다.',
    startEra: 'AD', startYear: 833,
    endEra: 'AD', endYear: 907,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 48.81, longitude: 17.09,
    linkToIsoCodes: ['CZ', 'SK'],
  },

  // ── 프르셰미슬 → 보헤미아 왕관령 ──────────────────────────────────
  {
    name: '보헤미아 공국',
    enName: 'Duchy of Bohemia',
    description:
      '9세기 후반 프르셰미슬 가문의 보르지보이 1세가 프라하를 중심으로 세운 공국. ' +
      '대모라비아 붕괴 후 보헤미아 분지의 패권을 잡았고, 수호성인이 된 성 바츨라프 시대를 거쳐 ' +
      '11세기 초부터 신성로마제국의 제후국이 되었다. 1198년 오타카르 1세가 세습 왕위를 인정받으며 왕국으로 승격되었다.',
    startEra: 'AD', startYear: 870,
    endEra: 'AD', endYear: 1198,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 50.09, longitude: 14.42,
    linkToIsoCodes: ['CZ'],
  },
  {
    // 인물 시드(person.hungary-bohemia-habsburgs 등)가 먼저 생성했을 수 있음 —
    // 존재 시 스킵되고, 신규 DB에서만 이 메타데이터로 생성된다(계승 체인의 앵커).
    name: '보헤미아 왕국',
    enName: 'Kingdom of Bohemia',
    description:
      '1198년 오타카르 1세가 세습 왕위를 인정받아 성립한 왕국. 프르셰미슬·룩셈부르크 왕조를 거치며 ' +
      '카렐 4세 치세에는 프라하가 신성로마제국의 수도가 되었고, 보헤미아 왕은 제국 선제후를 겸했다. ' +
      '후스 전쟁과 야기에우워 왕조를 지나 1526년부터 합스부르크 가문이 왕위를 이었으며, 1918년 체코슬로바키아 성립으로 소멸했다.',
    startEra: 'AD', startYear: 1198,
    endEra: 'AD', endYear: 1918,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 50.09, longitude: 14.42,
    linkToIsoCodes: ['CZ'],
  },
  {
    name: '모라비아 변경백령',
    enName: 'Margraviate of Moravia',
    description:
      '1182년 신성로마황제 프리드리히 1세가 모라비아를 변경백령으로 승격시키며 성립. ' +
      '대부분의 시기 보헤미아 왕이 변경백을 겸하거나 그 방계가 다스렸고, 1348년 카렐 4세의 칙서로 ' +
      '보헤미아 왕관령의 핵심 구성 영토로 편입되어 1918년 체코슬로바키아 성립까지 존속했다.',
    startEra: 'AD', startYear: 1182,
    endEra: 'AD', endYear: 1918,
    stateType: HistoricalStateType.MARGRAVIATE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 49.2, longitude: 16.61,
    linkToIsoCodes: ['CZ'],
  },

  // ── 20세기 ────────────────────────────────────────────────────────
  {
    name: '체코슬로바키아',
    enName: 'Czechoslovakia',
    description:
      '1918년 오스트리아-헝가리 해체와 함께 체코와 슬로바키아가 결합해 성립한 공화국. ' +
      '1938년 뮌헨 협정으로 해체되었다가 1945년 재건되었고, 1948년 공산 정변과 1968년 프라하의 봄을 거쳐 ' +
      '1989년 벨벳 혁명으로 민주화한 뒤 1993년 체코와 슬로바키아로 평화 분리(벨벳 이혼)되었다.',
    startEra: 'AD', startYear: 1918,
    endEra: 'AD', endYear: 1992,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 50.09, longitude: 14.42,
    linkToIsoCodes: ['CZ', 'SK'],
  },
  {
    name: '보헤미아-모라바 보호령',
    enName: 'Protectorate of Bohemia and Moravia',
    description:
      '1939년 3월 나치 독일이 뮌헨 협정 이후 남은 체코 영토를 점령해 세운 보호령. ' +
      '명목상 자치정부(대통령 에밀 하하)를 두었으나 실권은 제국 보호자에게 있었고, ' +
      '라인하르트 하이드리히 암살(1942)과 리디체 학살로 상징되는 압제를 겪다 1945년 해방과 함께 소멸했다.',
    startEra: 'AD', startYear: 1939,
    endEra: 'AD', endYear: 1945,
    stateType: HistoricalStateType.OTHER,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 50.09, longitude: 14.42,
    linkToIsoCodes: ['CZ'],
  },
]

export async function seedBohemiaHistoricalCountries(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🦁 보헤미아 관련 역사 국가 시딩 시작...')

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

  console.log(`✅ 보헤미아 역사 국가 시딩 완료 (${ENTRIES.length}건)\n`)
}
