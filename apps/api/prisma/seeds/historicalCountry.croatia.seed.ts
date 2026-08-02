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
  // ── 중세 크로아티아 ───────────────────────────────────────────────
  {
    name: '크로아티아 공국',
    enName: 'Duchy of Croatia',
    description:
      '9세기 초 달마티아 해안과 내륙에 성립한 크로아티아인의 공국. 보르나(재위 810년경~821)가 기록에 남은 첫 통치자이며, ' +
      '트르피미르 1세(재위 845~864)가 트르피미로비치 왕조를 열었다. 879년 브라니미르가 교황 요한 8세로부터 ' +
      '독립 통치자로 인정받으며 프랑크·비잔티움의 종주권에서 벗어났고, 925년 토미슬라브가 왕을 칭하며 왕국으로 승격되었다.',
    startEra: 'AD', startYear: 810,
    endEra: 'AD', endYear: 925,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 44.24, longitude: 15.18,
    linkToIsoCodes: ['HR'],
  },
  {
    name: '크로아티아 왕국',
    enName: 'Kingdom of Croatia',
    description:
      '925년경 토미슬라브가 초대 국왕으로 즉위하며 성립한 중세 크로아티아 왕국. 페타르 크레시미르 4세(재위 1058~1074)와 ' +
      '드미타르 즈보니미르(재위 1075~1089) 치세에 달마티아 해안까지 아우르는 전성기를 누렸다. ' +
      '즈보니미르 사후 왕위 계승 분쟁 끝에 1102년 헝가리 왕 콜로만이 비오그라드에서 크로아티아 국왕으로 대관하며 ' +
      '헝가리와의 동군연합에 들어갔다.',
    startEra: 'AD', startYear: 925,
    endEra: 'AD', endYear: 1102,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 44.04, longitude: 16.2,
    linkToIsoCodes: ['HR'],
  },
  {
    name: '크로아티아 왕국 (헝가리 동군연합)',
    enName: 'Kingdom of Croatia in union with Hungary',
    description:
      '1102년 헝가리 왕 콜로만의 크로아티아 국왕 대관으로 성립한 동군연합 왕국. 전승에 따르면 파크타 콘벤타 협약으로 ' +
      '크로아티아 귀족은 사보르(의회)와 반(총독) 등 자치 제도를 유지했다. 헝가리 왕이 크로아티아 왕관을 겸했으나 ' +
      '별개의 왕국으로 취급되었으며, 1526년 모하치 전투에서 러요시 2세가 전사하자 1527년 체틴 의회에서 ' +
      '합스부르크 가문의 페르디난트 1세를 국왕으로 선출했다.',
    startEra: 'AD', startYear: 1102,
    endEra: 'AD', endYear: 1527,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 45.81, longitude: 15.98,
    linkToIsoCodes: ['HR'],
  },

  // ── 합스부르크 시대 ───────────────────────────────────────────────
  {
    name: '크로아티아 왕국 (합스부르크)',
    enName: 'Kingdom of Croatia (Habsburg)',
    description:
      '1527년 1월 체틴 의회에서 크로아티아 귀족이 합스부르크 가문의 페르디난트 1세를 국왕으로 선출하며 성립. ' +
      '오스만 제국의 팽창으로 영토가 크게 줄어 "잔여의 잔여(reliquiae reliquiarum)"로 불렸으며, ' +
      '오스만 방어를 위해 군정국경지대(Militärgrenze)가 설치되었다. 헝가리 왕관령의 일부로 남되 사보르와 반의 ' +
      '자치를 유지했고, 1868년 크로아티아-헝가리 대타협(나고드바)으로 크로아티아-슬라보니아 왕국으로 재편되었다.',
    startEra: 'AD', startYear: 1527, startMonth: 1,
    endEra: 'AD', endYear: 1868,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 45.81, longitude: 15.98,
    linkToIsoCodes: ['HR'],
  },
  {
    name: '크로아티아-슬라보니아 왕국',
    enName: 'Kingdom of Croatia-Slavonia',
    description:
      '1868년 크로아티아-헝가리 대타협(나고드바)으로 크로아티아 왕국과 슬라보니아 왕국이 통합되어 성립한 자치 왕국. ' +
      '오스트리아-헝가리 이중 제국의 헝가리 측(성 이슈트반 왕관령)에 속하되 내정·사법·교육·종교에서 자치를 누렸고 ' +
      '사보르와 반 제도를 유지했다. 1918년 10월 사보르가 헝가리와의 관계 단절을 선언하고 ' +
      '슬로벤·크로아트·세르브인국을 거쳐 세르비아-크로아티아-슬로베니아 왕국에 합류하며 소멸했다.',
    startEra: 'AD', startYear: 1868,
    endEra: 'AD', endYear: 1918, endMonth: 10,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 45.81, longitude: 15.98,
    linkToIsoCodes: ['HR'],
  },

  // ── 아드리아 해안 ─────────────────────────────────────────────────
  {
    name: '두브로브니크 공화국',
    enName: 'Republic of Ragusa',
    description:
      '1358년 자다르 조약으로 베네치아의 지배에서 벗어나며 성립한 아드리아해의 해상 무역 공화국(라구사 공화국). ' +
      '명목상 헝가리, 이후 오스만 제국에 조공을 바치며 실질적 독립을 유지했고, "리베르타스(자유)"를 국시로 ' +
      '지중해 무역으로 번영했다. 유럽 최초 수준의 검역 제도와 노예무역 폐지(1416)로도 유명하다. ' +
      '1808년 1월 나폴레옹 군의 점령으로 폐지되었다.',
    startEra: 'AD', startYear: 1358,
    endEra: 'AD', endYear: 1808, endMonth: 1,
    stateType: HistoricalStateType.CITY_STATE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 42.65, longitude: 18.09,
    linkToIsoCodes: ['HR'],
  },
  {
    name: '달마티아 왕국',
    enName: 'Kingdom of Dalmatia',
    description:
      '1797년 캄포포르미오 조약으로 베네치아령 달마티아가 오스트리아에 귀속된 뒤, 나폴레옹 시기 프랑스 지배를 거쳐 ' +
      '1815년 빈 회의로 확정된 합스부르크 왕관령. 자다르를 수도로 오스트리아 제국(1867년 이후 시스라이타니아)에 ' +
      '직속되어 크로아티아-슬라보니아와는 분리 통치되었다. 1918년 제국 해체와 함께 세르비아-크로아티아-슬로베니아 ' +
      '왕국에 합류했다.',
    startEra: 'AD', startYear: 1815,
    endEra: 'AD', endYear: 1918,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 44.12, longitude: 15.23,
    linkToIsoCodes: ['HR'],
  },

  // ── 20세기 ────────────────────────────────────────────────────────
  {
    name: '크로아티아 독립국',
    enName: 'Independent State of Croatia (NDH)',
    description:
      '1941년 4월 추축국의 유고슬라비아 침공 직후 우스타샤가 선포한 괴뢰 국가. 안테 파벨리치가 통치했으며 ' +
      '보스니아-헤르체고비나까지 영토로 삼았다. 독일·이탈리아의 보호 아래 세르비아인·유대인·로마인에 대한 ' +
      '조직적 학살(야세노바츠 수용소)을 자행했다. 1945년 5월 유고슬라비아 파르티잔의 승리로 붕괴했다.',
    startEra: 'AD', startYear: 1941, startMonth: 4,
    endEra: 'AD', endYear: 1945, endMonth: 5,
    stateType: HistoricalStateType.OTHER,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 45.81, longitude: 15.98,
    linkToIsoCodes: ['HR'],
  },
  {
    name: '크로아티아 사회주의 공화국',
    enName: 'Socialist Republic of Croatia',
    description:
      '1943년 크로아티아 반파시스트 인민해방회의(ZAVNOH)를 기반으로 성립해 1945년 유고슬라비아 연방의 ' +
      '구성 공화국이 된 사회주의 공화국. 1971년 크로아티아의 봄 등 자치 확대 운동을 거쳐, 1990년 첫 다당제 선거에서 ' +
      '투지만의 크로아티아 민주연합이 집권했고 1991년 6월 독립을 선언하며 현대 크로아티아 공화국으로 이어졌다.',
    startEra: 'AD', startYear: 1943,
    endEra: 'AD', endYear: 1991, endMonth: 6,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 45.81, longitude: 15.98,
    linkToIsoCodes: ['HR'],
  },
  {
    name: '크로아티아 공화국',
    enName: 'Republic of Croatia',
    description:
      '1991년 6월 25일 슬로베니아와 같은 날 유고슬라비아 연방에서 독립을 선언하며 성립한 크로아티아인의 국민국가' +
      '(브리오니 협정의 유예를 거쳐 10월 8일 발효). 세르비아계 반군·유고 인민군과의 크로아티아 독립전쟁(1991~1995)을 ' +
      '치렀으며, 1992년 5월 유엔에 가입하고 1995년 폭풍 작전과 에르두트 협정으로 전 영토를 회복했다. ' +
      '2009년 나토(NATO), 2013년 7월 유럽연합(EU)에 가입했으며 2023년 유로화 도입과 솅겐 편입을 마쳤다.',
    startEra: 'AD', startYear: 1991, startMonth: 6,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 45.81, longitude: 15.98,
    linkToIsoCodes: ['HR'],
  },
]

/**
 * 다른 시드(세르비아)가 소유한 유고슬라비아 계열 HC에 현대 크로아티아 연결만 보강.
 * 유고슬라비아 연방 공화국(1992~2003)은 세르비아·몬테네그로만 포함하므로 제외.
 */
const EXTRA_MODERN_LINKS: { hcName: string; isoCode: string }[] = [
  { hcName: '세르비아-크로아티아-슬로베니아 왕국', isoCode: 'HR' },
  { hcName: '유고슬라비아 왕국', isoCode: 'HR' },
  { hcName: '유고슬라비아 사회주의 연방 공화국', isoCode: 'HR' },
]

export async function seedCroatiaHistoricalCountries(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🇭🇷 크로아티아 관련 역사 국가 시딩 시작...')

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

  // 유고슬라비아 계열 HC → 현대 크로아티아 연결 보강
  for (const extra of EXTRA_MODERN_LINKS) {
    const hc = await prisma.historicalCountry.findFirst({
      where: { name: extra.hcName },
    })
    const modernCountryId = isoToModernId.get(extra.isoCode)
    if (!hc || !modernCountryId) {
      if (!hc) console.warn(`  ⚠️  찾을 수 없음: ${extra.hcName}`)
      continue
    }
    const linkExists = await prisma.historicalCountryModernCountry.findFirst({
      where: { historicalCountryId: hc.id, modernCountryId },
    })
    if (!linkExists) {
      await prisma.historicalCountryModernCountry.create({
        data: { historicalCountryId: hc.id, modernCountryId },
      })
      console.log(`  🔗 ${extra.hcName} ← 현대 ${extra.isoCode} 연결`)
    }
  }

  console.log(`✅ 크로아티아 역사 국가 시딩 완료 (${ENTRIES.length}건)\n`)
}
