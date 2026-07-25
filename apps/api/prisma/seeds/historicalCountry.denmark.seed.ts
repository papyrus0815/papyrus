import { HistoricalEntityKind, HistoricalStateType } from '@prisma/client'

import { PrismaService } from '../prisma.service'

const ACCOUNT_ID = '6af53fe7-d02b-4c42-b86c-f32800897b32'

interface HistoricalCountryEntry {
  name: string
  enName?: string
  nameOrigin?: string
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
  // ── 왕국의 성립 ───────────────────────────────────────────────────
  {
    name: '덴마크 왕국',
    enName: 'Kingdom of Denmark',
    nameOrigin:
      '"덴인(Danes)의 변경/삼림(mark)"이라는 뜻으로, 유틀란트 반도에 살던 게르만계 데인족의 이름에서 유래했다. ' +
      '"단마르크(Danmark)"라는 표기는 965년경 하랄 블로탄이 세운 옐링 룬석에 처음 등장한다.',
    description:
      '10세기 중엽 고름 노왕이 유틀란트를 중심으로 데인족을 규합하고, 그 아들 하랄 블로탄(청치왕)이 ' +
      '덴마크 전역을 통일하고 기독교를 받아들이며(옐링 룬석, 965년경) 성립한 북유럽에서 가장 오래된 군주국. ' +
      '11세기 초 크누트 대왕 때는 잉글랜드·노르웨이를 아우르는 북해 제국을 이루었다. ' +
      '1397년 칼마르 동맹, 1537년 덴마크-노르웨이 이중 왕국으로 이어지며 북유럽의 중심 세력이 되었고, ' +
      '1814년 노르웨이를 잃은 뒤에도 왕조가 끊이지 않고 오늘날까지 존속하는 입헌군주국이다.',
    startEra: 'AD', startYear: 936,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 55.68, longitude: 12.57,
    linkToIsoCodes: ['DK'],
  },
  {
    name: '노르웨이 왕국',
    enName: 'Kingdom of Norway',
    nameOrigin:
      '고대 노르드어 "노레그(Norvegr)" 곧 "북쪽으로 가는 길"에서 유래했으며, 대서양 연안을 따라 남북으로 이어진 항로를 가리켰다.',
    description:
      '872년경 하랄 미발왕이 하프르스피오르 해전 승리로 여러 소왕국을 통합해 세운 노르드 왕국. ' +
      '중세에는 니다로스(트론헤임)를 중심으로 아이슬란드·그린란드·오크니 제도까지 세력을 뻗쳤다. ' +
      '1380년 이후 덴마크 왕과 군주를 공유했고 1397년 칼마르 동맹, 1537년 덴마크-노르웨이의 한 축이 되었다. ' +
      '1814년 킬 조약으로 덴마크가 노르웨이를 스웨덴에 할양하면서 독립 왕국으로서의 이 시대는 막을 내렸다.',
    startEra: 'AD', startYear: 872,
    endEra: 'AD', endYear: 1814, endMonth: 1,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 63.43, longitude: 10.4,
    linkToIsoCodes: ['NO'],
  },

  // ── 북유럽 연합의 시대 ────────────────────────────────────────────
  {
    name: '칼마르 동맹',
    enName: 'Kalmar Union',
    nameOrigin:
      '동맹 결성을 위한 대관식과 조약이 이뤄진 스웨덴 남동부의 항구 도시 칼마르(Kalmar)에서 딴 이름이다.',
    description:
      '1397년 덴마크의 마르그레테 1세가 주도해 덴마크·노르웨이·스웨덴 세 왕국을 한 명의 군주 아래 묶은 동군연합. ' +
      '칼마르에서 조카 포메라니아의 에리크가 세 왕국의 공동 국왕으로 대관하며 성립했다. ' +
      '덴마크가 사실상 주도권을 쥐었으나 스웨덴 귀족의 반발로 여러 차례 이탈이 반복되었고, ' +
      '1523년 구스타브 바사가 스웨덴 왕으로 즉위해 완전히 이탈하면서 동맹은 해체되었다. ' +
      '이후 덴마크와 노르웨이만 남아 덴마크-노르웨이로 이어졌다.',
    startEra: 'AD', startYear: 1397, startMonth: 6,
    endEra: 'AD', endYear: 1523,
    stateType: HistoricalStateType.PERSONAL_UNION,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 56.66, longitude: 16.36,
    linkToIsoCodes: ['DK', 'NO', 'SE'],
  },
  {
    name: '덴마크-노르웨이',
    enName: 'Denmark–Norway',
    description:
      '1523년 스웨덴이 칼마르 동맹에서 이탈한 뒤, 1537년 종교개혁을 계기로 덴마크와 노르웨이가 하나의 군주 아래 결합한 이중 왕국. ' +
      '덴마크 국왕이 두 왕국을 함께 다스렸고 슐레스비히·홀슈타인 공국, 아이슬란드·페로 제도·그린란드까지 아우르는 광역 국가였다. ' +
      '17세기 스웨덴과의 잇단 전쟁으로 스카니아 등을 잃었으며, 나폴레옹 전쟁에서 프랑스 편에 섰다가 ' +
      '1814년 킬 조약으로 노르웨이를 스웨덴에 할양하며 해체되었다. 노르웨이의 옛 대서양 속령은 덴마크가 계속 보유했다.',
    startEra: 'AD', startYear: 1537,
    endEra: 'AD', endYear: 1814, endMonth: 1,
    stateType: HistoricalStateType.PERSONAL_UNION,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 55.68, longitude: 12.57,
    linkToIsoCodes: ['DK', 'NO'],
  },

  // ── 남부 공국(슐레스비히·홀슈타인) ────────────────────────────────
  {
    name: '슐레스비히 공국',
    enName: 'Duchy of Schleswig',
    nameOrigin:
      '슐라이만(Schlei) 협만 어귀의 교역 도시 슐레스비히에서 딴 이름이다. 덴마크어로는 "남유틀란트(Sønderjylland)"라 부른다.',
    description:
      '1058년 유틀란트 반도 남부에 세워진 덴마크 왕국의 봉토 공국. 남쪽의 홀슈타인 공국과 국경을 접했다. ' +
      '1460년 리베 조약에서 슐레스비히·홀슈타인 두 공국을 "영원히 나뉘지 않는다(up ewig ungedeelt)"고 선언해 ' +
      '덴마크 국왕이 두 공국을 함께 다스리게 되었다. 주민 구성이 덴마크계와 독일계로 나뉘어 19세기 슐레스비히-홀슈타인 문제의 핵이 되었고, ' +
      '1864년 제2차 슐레스비히 전쟁 패배로 덴마크가 상실한 뒤 1866년 프로이센에 병합되었다.',
    startEra: 'AD', startYear: 1058,
    endEra: 'AD', endYear: 1866,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 54.52, longitude: 9.57,
    linkToIsoCodes: ['DK', 'DE'],
  },
  {
    name: '홀슈타인 공국',
    enName: 'Duchy of Holstein',
    nameOrigin:
      '엘베강 하류에 살던 색슨계 부족 "홀슈타인(Holsten, 숲에 사는 사람들)"의 이름에서 유래했다.',
    description:
      '1474년 신성로마황제 프리드리히 3세가 덴마크 국왕 크리스티안 1세를 홀슈타인 백작에서 공작으로 승격시키며 성립한 제국 봉토. ' +
      '홀슈타인은 신성로마제국(1474~1806)에 속했으나 덴마크 국왕이 공작을 겸해 사실상 덴마크-노르웨이와 하나로 통치되었다. ' +
      '1460년 리베 조약으로 슐레스비히와 영구 결합이 선언된 이래 두 공국은 운명을 함께했다. ' +
      '1815년 빈 회의 이후 독일 연방에 가입했고, 1866년 프로이센-오스트리아 전쟁 뒤 슐레스비히와 함께 프로이센에 병합되었다.',
    startEra: 'AD', startYear: 1474,
    endEra: 'AD', endYear: 1866,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 54.32, longitude: 10.13,
    linkToIsoCodes: ['DE'],
  },
]

export async function seedDenmarkHistoricalCountries(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🇩🇰 덴마크 관련 역사 국가 시딩 시작...')

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
          nameOrigin: entry.nameOrigin,
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

  console.log(`✅ 덴마크 역사 국가 시딩 완료 (${ENTRIES.length}건)\n`)
}
