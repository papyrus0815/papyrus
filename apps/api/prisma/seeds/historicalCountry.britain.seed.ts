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
  linkToBritain: boolean
}

const ENTRIES: HistoricalCountryEntry[] = [
  // ── 앵글로색슨 왕국 ───────────────────────────────────────────────
  {
    name: '켄트 왕국',
    enName: 'Kingdom of Kent',
    description: '앵글로색슨 7왕국 중 가장 먼저 수립된 왕국. 597년 아우구스티누스의 선교로 잉글랜드 최초로 기독교를 수용하였으며, 871년 웨식스에 흡수되었다.',
    startEra: 'AD', startYear: 455,
    endEra: 'AD', endYear: 871,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 51.3, longitude: 0.5,
    linkToBritain: true,
  },
  {
    name: '노섬브리아 왕국',
    enName: 'Kingdom of Northumbria',
    description: '브리튼 북부를 지배한 앵글로색슨 왕국. 베다 베네라빌리스의 《영국 교회사》가 저술된 학문의 중심지였으나 바이킹의 침공으로 약화되어 954년 웨식스에 병합되었다.',
    startEra: 'AD', startYear: 654,
    endEra: 'AD', endYear: 954,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 54.9, longitude: -1.6,
    linkToBritain: true,
  },
  {
    name: '이스트앵글리아 왕국',
    enName: 'Kingdom of East Anglia',
    description: '앵글족이 세운 동부 잉글랜드의 왕국. 서턴 후 유적으로 유명한 왕국이며, 869년 바이킹에 정복되어 멸망하였다.',
    startEra: 'AD', startYear: 520,
    endEra: 'AD', endYear: 918,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 52.4, longitude: 1.0,
    linkToBritain: true,
  },
  {
    name: '머시아 왕국',
    enName: 'Kingdom of Mercia',
    description: '중부 잉글랜드를 지배한 앵글로색슨 왕국. 오파 왕 치세에 오파 제방을 축조하고 잉글랜드 최강국으로 군림했으나, 바이킹 침공으로 세력이 약화되어 918년 웨식스에 통합되었다.',
    startEra: 'AD', startYear: 527,
    endEra: 'AD', endYear: 918,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 52.5, longitude: -1.9,
    linkToBritain: true,
  },
  {
    name: '웨식스 왕국',
    enName: 'Kingdom of Wessex',
    description: '앵글로색슨 왕국 중 최후의 승자. 알프레드 대왕이 바이킹을 격퇴하고 잉글랜드 통일의 기반을 마련하였으며, 927년 에드거 왕 치세에 잉글랜드 왕국으로 발전했다.',
    startEra: 'AD', startYear: 519,
    endEra: 'AD', endYear: 927,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 51.1, longitude: -1.3,
    linkToBritain: true,
  },

  // ── 중세 왕국 ─────────────────────────────────────────────────────
  {
    name: '잉글랜드 왕국',
    enName: 'Kingdom of England',
    description: '927년 애설스탄이 잉글랜드를 통일하여 수립한 왕국. 노르만 정복(1066), 마그나카르타(1215), 장미전쟁, 튜더·스튜어트 왕조를 거쳐 1707년 스코틀랜드와 합방하여 그레이트브리튼 왕국이 되었다.',
    startEra: 'AD', startYear: 927,
    endEra: 'AD', endYear: 1707,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 51.5, longitude: -0.1,
    linkToBritain: true,
  },
  {
    name: '스코틀랜드 왕국',
    enName: 'Kingdom of Scotland',
    description: '843년 케네스 맥알핀이 픽트족과 스코트족을 통합하여 세운 왕국. 독립을 위해 잉글랜드와 수백 년간 투쟁하였으며(브루스 왕의 반란 등), 1707년 잉글랜드와 합방하여 그레이트브리튼 왕국을 형성했다.',
    startEra: 'AD', startYear: 843,
    endEra: 'AD', endYear: 1707,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 56.5, longitude: -4.0,
    linkToBritain: true,
  },
  {
    name: '웨일스 공국',
    enName: 'Principality of Wales',
    description: '1216년 르웰린 대왕이 수립한 웨일스의 통합 공국. 1282년 잉글랜드 에드워드 1세의 정복으로 독립을 잃고, 1301년 이후 잉글랜드 왕세자의 칭호로만 남았다.',
    startEra: 'AD', startYear: 1216,
    endEra: 'AD', endYear: 1542,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 52.1, longitude: -3.8,
    linkToBritain: true,
  },
  {
    name: '아일랜드 영주권',
    enName: 'Lordship of Ireland',
    description: '1171년 잉글랜드 헨리 2세의 정복 이후 수립된 잉글랜드의 아일랜드 지배 체제. 잉글랜드 왕이 아일랜드 영주 칭호를 보유하며 간접 통치하였다.',
    startEra: 'AD', startYear: 1171,
    endEra: 'AD', endYear: 1542,
    stateType: HistoricalStateType.OTHER,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 53.3, longitude: -6.3,
    linkToBritain: true,
  },
  {
    name: '아일랜드 왕국',
    enName: 'Kingdom of Ireland',
    description: '1542년 헨리 8세가 아일랜드 영주권을 왕국으로 격상하여 수립. 1800년 대브리튼-아일랜드 합방법으로 잉글랜드·스코틀랜드와 통합되어 연합왕국이 되었다.',
    startEra: 'AD', startYear: 1542,
    endEra: 'AD', endYear: 1800,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 53.3, longitude: -6.3,
    linkToBritain: true,
  },

  // ── 합방 이후 ─────────────────────────────────────────────────────
  {
    name: '그레이트브리튼 왕국',
    enName: 'Kingdom of Great Britain',
    description: '1707년 잉글랜드와 스코틀랜드의 합방으로 수립된 왕국. 산업혁명의 태동기이자 대영제국 팽창의 출발점이며, 1801년 아일랜드와 통합하여 연합왕국이 되었다.',
    startEra: 'AD', startYear: 1707,
    endEra: 'AD', endYear: 1801,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 54.0, longitude: -2.0,
    linkToBritain: true,
  },
  {
    name: '그레이트브리튼 및 아일랜드 연합왕국',
    enName: 'United Kingdom of Great Britain and Ireland',
    description: '1801년 그레이트브리튼 왕국과 아일랜드 왕국의 합방으로 수립. 빅토리아 여왕 시대 대영제국의 전성기를 이끌었으며, 1922년 아일랜드 자유국 독립 후 현재의 영국으로 개편되었다.',
    startEra: 'AD', startYear: 1801,
    endEra: 'AD', endYear: 1922,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 54.0, longitude: -2.0,
    linkToBritain: true,
  },
]

export async function seedBritainHistoricalCountries(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🏴󠁧󠁢󠁥󠁮󠁧󠁿 영국 관련 역사 국가 시딩 시작...')

  // 현대 영국 국가 ID 조회
  const modernBritain = await prisma.country.findFirst({
    where: { isoCode: 'GB' },
    select: { id: true },
  })
  if (!modernBritain) {
    console.warn('  ⚠️  현대 영국(GB) 국가를 찾을 수 없습니다.')
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

    // 현대 영국과 연결
    if (entry.linkToBritain && modernBritain) {
      const linkExists = await prisma.historicalCountryModernCountry.findFirst({
        where: { historicalCountryId: id, modernCountryId: modernBritain.id },
      })
      if (!linkExists) {
        await prisma.historicalCountryModernCountry.create({
          data: { historicalCountryId: id, modernCountryId: modernBritain.id },
        })
      }
    }
  }

  console.log(`✅ 영국 역사 국가 시딩 완료 (${ENTRIES.length}건)\n`)
}
