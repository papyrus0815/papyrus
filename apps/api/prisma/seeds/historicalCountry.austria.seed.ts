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
  // ── 바벤베르크 시대 ───────────────────────────────────────────────
  {
    name: '오스트리아 변경백령',
    enName: 'Margraviate of Austria',
    description:
      '976년 신성로마황제 오토 2세가 바벤베르크 가문의 레오폴트 1세를 바이에른 동부 변경백으로 봉하며 성립한 변경 영지. ' +
      '996년 문서에 "오스타리키(Ostarrîchi)"라는 이름이 처음 등장하며 이것이 오스트리아 국명의 기원이 되었다. ' +
      '1156년 공국으로 승격될 때까지 바벤베르크 가문이 다스렸다.',
    startEra: 'AD', startYear: 976,
    endEra: 'AD', endYear: 1156,
    stateType: HistoricalStateType.MARGRAVIATE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 48.21, longitude: 16.37,
    linkToIsoCodes: ['AT'],
  },
  {
    name: '오스트리아 공국',
    enName: 'Duchy of Austria',
    description:
      '1156년 신성로마황제 프리드리히 1세(바르바로사)가 특권 소칙서(Privilegium Minus)로 오스트리아를 바이에른에서 분리해 ' +
      '공국으로 승격시키며 성립. 하인리히 2세 야조미르고트가 초대 공작이며 빈을 수도로 삼았다. ' +
      '1246년 바벤베르크 가문 단절 후 보헤미아 왕 오타카르 2세의 지배를 거쳐, 1278년 마르히펠트 전투에서 승리한 ' +
      '합스부르크 가문이 1282년부터 통치하며 가문 세력의 본거지가 되었다. 1453년 대공국으로 승격되었다.',
    startEra: 'AD', startYear: 1156,
    endEra: 'AD', endYear: 1453,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 48.21, longitude: 16.37,
    linkToIsoCodes: ['AT'],
  },
  {
    name: '오스트리아 대공국',
    enName: 'Archduchy of Austria',
    description:
      '1453년 신성로마황제 프리드리히 3세가 특권 대칙서(Privilegium Maius)를 공식 인준하여 성립한 합스부르크 가문의 본령. ' +
      '대공(Archidux) 칭호는 선제후에 준하는 지위를 의미했다. 1438년 이후 신성로마제국 제위를 사실상 세습한 ' +
      '합스부르크 군주국의 중심으로, 1804년 오스트리아 제국 선포까지 존속했다.',
    startEra: 'AD', startYear: 1453,
    endEra: 'AD', endYear: 1804,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 48.21, longitude: 16.37,
    linkToIsoCodes: ['AT'],
  },

  {
    name: '슈타이어마르크 공국',
    enName: 'Duchy of Styria',
    description:
      '1180년 신성로마황제 프리드리히 1세(바르바로사)가 오타카르 가문의 변경백 오타카르 4세를 공작으로 승격시키며 성립한 공국. ' +
      '1186년 게오르겐베르크 협약으로 후사 없는 오타카르 4세가 오스트리아 바벤베르크 가문에 상속을 약정해 ' +
      '1192년부터 오스트리아와 동군연합을 이루었다. 1282년부터 합스부르크 가문의 세습령이 되었으며, ' +
      '카린티아·카르니올라와 함께 이너 오스트리아를 구성해 그라츠를 중심으로 통치되었다. ' +
      '1918년 제국 해체와 함께 북부는 오스트리아, 남부(하부 슈타이어마르크)는 유고슬라비아에 귀속되었다.',
    startEra: 'AD', startYear: 1180,
    endEra: 'AD', endYear: 1918,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 47.07, longitude: 15.44,
    linkToIsoCodes: ['AT'],
  },

  // ── 이너 오스트리아 계열 ──────────────────────────────────────────
  {
    name: '케른텐 공국',
    enName: 'Duchy of Carinthia',
    nameOrigin:
      '슬라브계 공국 카란타니아(Carantania)에서 유래한 이름으로, 켈트어 karant-(친구·동맹) 또는 암석을 뜻하는 어근에서 온 것으로 본다. ' +
      '한국어로는 독일어 Kärnten을 따라 "케른텐", 라틴어·영어 Carinthia를 따라 "카린티아"로도 표기한다.',
    description:
      '976년 신성로마황제 오토 2세가 바이에른 공국에서 카란타니아 지역을 떼어내 승격시킨 제국 최초의 신설 공국. ' +
      '창설 당시 베로나 변경백령이 함께 딸려 케른텐 공작이 겸했으나 1077년 분리되었다. ' +
      '에펜슈타인 가문(1077~1122)과 슈판하임 가문(1122~1269)을 거쳐 보헤미아 왕 오타카르 2세, 괴르츠-티롤 가문이 차례로 차지했고, ' +
      '1335년 하인리히 사후 합스부르크 가문에 귀속되어 슈타이어마르크·카르니올라와 함께 이너 오스트리아를 구성했다. ' +
      '수도는 1518년까지 장크트 파이트 안 데어 글란, 이후 클라겐푸르트였다. ' +
      '1918년 제국 해체와 함께 소멸했으며, 1920년 주민투표로 남부 대부분이 오스트리아에 잔류하고 메자 계곡 등 일부는 유고슬라비아에 귀속되었다.',
    startEra: 'AD', startYear: 976,
    endEra: 'AD', endYear: 1918,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 46.62, longitude: 14.31,
    linkToIsoCodes: ['AT'],
  },
  // 베로나 변경백령은 지리적으로는 이탈리아지만 952~1077년 바이에른·케른텐 공작이 관할한
  // 제국 변경령이므로 케른텐과 함께 이 파일에서 관리한다.
  {
    name: '베로나 변경백령',
    enName: 'March of Verona',
    nameOrigin:
      '중심 도시 베로나에서 딴 이름으로, 아퀼레이아를 함께 포괄해 "베로나·아퀼레이아 변경백령(Marca Veronensis et Aquileiensis)"으로도 불렸다.',
    description:
      '952년 신성로마황제 오토 1세가 이탈리아 왕 베렝가리오 2세에게서 베로나·프리울리·이스트리아·트렌토 일대를 넘겨받아 ' +
      '이탈리아 왕국에서 분리하고 바이에른 공국에 붙인 변경 영지. 알프스 남쪽 통로를 제국이 직접 장악하려는 조치였다. ' +
      '976년 케른텐 공국이 신설되면서 함께 이관되어 약 100년간 케른텐 공작이 겸했다. ' +
      '1077년 하인리히 4세가 프리울리·이스트리아를 아퀼레이아 총대주교에게 넘기며 분할되었고, ' +
      '이후 베로나 등 도시들이 자치 코무네로 성장해 1167년 롬바르디아 동맹 가담을 계기로 변경백령은 실체를 잃었다.',
    startEra: 'AD', startYear: 952,
    endEra: 'AD', endYear: 1167,
    stateType: HistoricalStateType.MARGRAVIATE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 45.44, longitude: 10.99,
    linkToIsoCodes: ['IT'],
  },

  // ── 제국 시대 ─────────────────────────────────────────────────────
  {
    name: '오스트리아 제국',
    enName: 'Austrian Empire',
    description:
      '1804년 프란츠 2세가 나폴레옹의 프랑스 제국 선포에 대응해 합스부르크 세습령 전체를 묶어 선포한 제국. ' +
      '1806년 신성로마제국 해체 후 합스부르크 가문의 제위를 이어갔으며, 빈 회의(1814~1815) 이후 메테르니히 체제로 ' +
      '유럽 협조 체제를 주도했다. 1866년 프로이센-오스트리아 전쟁 패배 후 1867년 대타협으로 오스트리아-헝가리 제국으로 재편되었다.',
    startEra: 'AD', startYear: 1804, startMonth: 8,
    endEra: 'AD', endYear: 1867,
    stateType: HistoricalStateType.EMPIRE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 48.21, longitude: 16.37,
    linkToIsoCodes: ['AT', 'HU', 'CZ'],
  },
  {
    name: '오스트리아-헝가리 제국',
    enName: 'Austria-Hungary',
    description:
      '1867년 대타협(Ausgleich)으로 오스트리아 제국이 재편된 이중 제국. 오스트리아 황제가 헝가리 국왕을 겸하되 ' +
      '헝가리는 별도의 정부·의회를 가졌다. 다민족 제국으로 발칸 문제에 깊이 개입했으며, 1914년 사라예보 사건을 계기로 ' +
      '1차 세계대전을 일으켰고 1918년 패전과 함께 해체되었다.',
    startEra: 'AD', startYear: 1867,
    endEra: 'AD', endYear: 1918, endMonth: 11,
    stateType: HistoricalStateType.EMPIRE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 48.21, longitude: 16.37,
    linkToIsoCodes: ['AT', 'HU', 'CZ'],
  },

  // ── 공화국·전간기 ─────────────────────────────────────────────────
  {
    name: '오스트리아 제1공화국',
    enName: 'First Austrian Republic',
    description:
      '1918년 11월 오스트리아-헝가리 제국 해체 후 선포된 공화국(초기 국호는 독일계 오스트리아). ' +
      '1919년 생제르맹 조약으로 국경과 국호가 확정되었으며 독일과의 합병이 금지되었다. ' +
      '경제 위기와 좌우 대립 속에 1934년 돌푸스의 권위주의 헌법으로 종식되었다.',
    startEra: 'AD', startYear: 1918, startMonth: 11,
    endEra: 'AD', endYear: 1934, endMonth: 5,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 48.21, longitude: 16.37,
    linkToIsoCodes: ['AT'],
  },
  {
    name: '오스트리아 연방국',
    enName: 'Federal State of Austria',
    description:
      '1934년 돌푸스 총리가 5월 헌법으로 수립한 권위주의적 조합국가(오스트로파시즘). ' +
      '나치 쿠데타로 돌푸스가 암살된 뒤 슈슈니크가 이어받았으나, 1938년 3월 나치 독일에 병합(안슐루스)되며 소멸했다.',
    startEra: 'AD', startYear: 1934, startMonth: 5,
    endEra: 'AD', endYear: 1938, endMonth: 3,
    stateType: HistoricalStateType.FEDERATION,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 48.21, longitude: 16.37,
    linkToIsoCodes: ['AT'],
  },
  {
    name: '연합군 점령하 오스트리아',
    enName: 'Allied-occupied Austria',
    description:
      '1945년 2차 세계대전 종전 후 미국·영국·프랑스·소련 4개국이 오스트리아를 분할 점령한 시기. ' +
      '1945년 4월 카를 레너의 임시정부가 수립되어 제2공화국이 출범했으며, ' +
      '1955년 오스트리아 국가조약으로 주권을 회복하고 영세중립을 선언했다.',
    startEra: 'AD', startYear: 1945, startMonth: 4,
    endEra: 'AD', endYear: 1955, endMonth: 7,
    stateType: HistoricalStateType.OTHER,
    entityKind: HistoricalEntityKind.PERIOD,
    latitude: 48.21, longitude: 16.37,
    linkToIsoCodes: ['AT'],
  },
]

export async function seedAustriaHistoricalCountries(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🇦🇹 오스트리아 관련 역사 국가 시딩 시작...')

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

  console.log(`✅ 오스트리아 역사 국가 시딩 완료 (${ENTRIES.length}건)\n`)
}
