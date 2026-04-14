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
  /** 연결할 현대 국가 ISO 코드 목록 */
  linkToIsoCodes: string[]
}

const ENTRIES: HistoricalCountryEntry[] = [
  // ── 고대 루스 ─────────────────────────────────────────────────────
  {
    name: '키예프 루스',
    enName: 'Kievan Rus',
    description: '9세기 말 류리크 왕조가 키예프를 중심으로 세운 동슬라브족 최초의 국가. 988년 블라디미르 1세가 동방 정교회를 국교로 채택하였으며, 13세기 몽골 침공으로 분열·붕괴되었다. 러시아·우크라이나·벨라루스 모두 이 국가를 자국의 직접적 전신으로 간주한다.',
    startEra: 'AD', startYear: 882,
    endEra: 'AD', endYear: 1240,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 50.4, longitude: 30.5,
    linkToIsoCodes: ['RU', 'UA', 'BY'],
  },

  // ── 중세 공국들 ───────────────────────────────────────────────────
  {
    name: '노브고로드 공화국',
    enName: 'Novgorod Republic',
    description: '1136년 귀족들이 키예프 루스로부터 독립을 선언하여 세운 공화제 도시국가. 한자동맹의 핵심 무역 거점으로 번영하였으나 1478년 이반 3세에게 정복되어 모스크바 대공국에 병합되었다.',
    startEra: 'AD', startYear: 1136,
    endEra: 'AD', endYear: 1478,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 58.5, longitude: 31.3,
    linkToIsoCodes: ['RU'],
  },
  {
    name: '블라디미르-수즈달 공국',
    enName: 'Vladimir-Suzdal Principality',
    description: '12세기 키예프 루스 분열 이후 북동 루스의 패권을 장악한 공국. 몽골 침공 이후에도 존속하다가 14세기 모스크바 대공국에 흡수되었으며, 러시아 중세 문화의 요람으로 평가받는다.',
    startEra: 'AD', startYear: 1157,
    endEra: 'AD', endYear: 1389,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 56.1, longitude: 40.4,
    linkToIsoCodes: ['RU'],
  },
  {
    name: '트베리 대공국',
    enName: 'Grand Duchy of Tver',
    description: '13세기 중반 수립된 공국으로 모스크바의 최대 경쟁자였다. 14세기 한때 루스의 패권을 놓고 모스크바와 다퉜으나, 1485년 이반 3세에 의해 병합되었다.',
    startEra: 'AD', startYear: 1246,
    endEra: 'AD', endYear: 1485,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 56.9, longitude: 35.9,
    linkToIsoCodes: ['RU'],
  },
  {
    name: '랴잔 공국',
    enName: 'Principality of Ryazan',
    description: '12세기 블라디미르-수즈달 공국에서 분리된 공국. 1237년 몽골의 바투 칸 침공 때 루스 최초로 함락되는 비극을 겪었으며, 1521년 모스크바 대공국에 최종 병합되었다.',
    startEra: 'AD', startYear: 1129,
    endEra: 'AD', endYear: 1521,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 54.6, longitude: 39.7,
    linkToIsoCodes: ['RU'],
  },
  {
    name: '모스크바 대공국',
    enName: 'Grand Duchy of Moscow',
    description: '1263년 알렉산드르 넵스키의 막내아들 다닐로이 공이 세운 소공국에서 출발하여 이반 3세·이반 4세 시대에 루스 전역을 통일한 국가. 1547년 이반 4세가 최초로 차르 칭호를 채택하여 러시아 차르국이 되었다.',
    startEra: 'AD', startYear: 1263,
    endEra: 'AD', endYear: 1547,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 55.7, longitude: 37.6,
    linkToIsoCodes: ['RU'],
  },

  // ── 차르국 ────────────────────────────────────────────────────────
  {
    name: '러시아 차르국',
    enName: 'Tsardom of Russia',
    description: '1547년 이반 4세(이반 뇌제)가 차르 칭호를 공식 채택하여 수립한 국가. 동방 정교 전통에 입각한 전제 왕정으로, 시베리아 정복을 통해 영토를 대폭 확장하였으며 1721년 표트르 대제의 개혁으로 러시아 제국이 되었다.',
    startEra: 'AD', startYear: 1547,
    endEra: 'AD', endYear: 1721,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 55.7, longitude: 37.6,
    linkToIsoCodes: ['RU'],
  },

  // ── 제국 ──────────────────────────────────────────────────────────
  {
    name: '러시아 제국',
    enName: 'Russian Empire',
    description: '1721년 표트르 대제가 북방전쟁 승리 후 선포한 제국. 예카테리나 대제 시대에 최전성기를 맞아 유럽 최대 영토 국가로 성장하였으며, 1917년 2월 혁명으로 니콜라이 2세가 퇴위하면서 붕괴되었다.',
    startEra: 'AD', startYear: 1721,
    endEra: 'AD', endYear: 1917,
    stateType: HistoricalStateType.EMPIRE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 59.9, longitude: 30.3,
    linkToIsoCodes: ['RU'],
  },

  // ── 혁명기 ───────────────────────────────────────────────────────
  {
    name: '러시아 공화국',
    enName: 'Russian Republic',
    description: '1917년 2월 혁명으로 제정이 붕괴된 후 임시정부가 수립한 공화국. 케렌스키 정부가 전쟁 지속과 토지 개혁 지연으로 민심을 잃어 같은 해 10월 볼셰비키 혁명으로 불과 8개월 만에 막을 내렸다.',
    startEra: 'AD', startYear: 1917, startMonth: 3,
    endEra: 'AD', endYear: 1917, endMonth: 11,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.REGIME,
    latitude: 59.9, longitude: 30.3,
    linkToIsoCodes: ['RU'],
  },
  {
    name: '러시아 소비에트 연방 사회주의 공화국',
    enName: 'Russian Soviet Federative Socialist Republic',
    description: '1917년 10월 혁명 이후 볼셰비키가 수립한 소비에트 공화국. 1922년 소비에트 연방 창설의 핵심 구성 공화국이 되었으며, 1991년 소련 해체 후 러시아 연방으로 독립하였다.',
    startEra: 'AD', startYear: 1917,
    endEra: 'AD', endYear: 1991,
    stateType: HistoricalStateType.FEDERATION,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 55.7, longitude: 37.6,
    linkToIsoCodes: ['RU'],
  },

  // ── 소비에트 연방 ─────────────────────────────────────────────────
  {
    name: '소비에트 사회주의 공화국 연방',
    enName: 'Union of Soviet Socialist Republics',
    description: '1922년 러시아·우크라이나·벨로루시·자카프카스 소비에트 공화국이 연합하여 수립된 연방 국가. 스탈린의 산업화와 냉전기 초강대국 지위를 거쳐 1991년 고르바초프의 개혁 이후 15개 공화국으로 해체되었다.',
    startEra: 'AD', startYear: 1922,
    endEra: 'AD', endYear: 1991,
    stateType: HistoricalStateType.FEDERATION,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 55.7, longitude: 37.6,
    // 소련 해체 후 15개 후임 국가 모두 연결
    linkToIsoCodes: ['RU', 'UA', 'BY', 'GE', 'AM', 'AZ', 'KZ', 'UZ', 'TM', 'TJ', 'KG', 'EE', 'LV', 'LT', 'MD'],
  },

  // ── 소비에트 구성 공화국 ──────────────────────────────────────────
  {
    name: '우크라이나 소비에트 사회주의 공화국',
    enName: 'Ukrainian Soviet Socialist Republic',
    description: '1919년 수립된 소비에트 구성 공화국. 농업과 중공업의 핵심 기지였으나 1932~1933년 홀로도모르(대기근)로 수백만 명이 희생되었다. 1991년 독립을 선언하며 현재의 우크라이나가 되었다.',
    startEra: 'AD', startYear: 1919,
    endEra: 'AD', endYear: 1991,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 50.4, longitude: 30.5,
    linkToIsoCodes: ['UA'],
  },
  {
    name: '벨로루시 소비에트 사회주의 공화국',
    enName: 'Byelorussian Soviet Socialist Republic',
    description: '1919년 수립된 소비에트 구성 공화국. 2차 세계대전 당시 나치 독일의 점령으로 막대한 피해를 입었으며, 1991년 독립하여 벨라루스 공화국이 되었다.',
    startEra: 'AD', startYear: 1919,
    endEra: 'AD', endYear: 1991,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 53.9, longitude: 27.6,
    linkToIsoCodes: ['BY'],
  },
  {
    name: '조지아 소비에트 사회주의 공화국',
    enName: 'Georgian Soviet Socialist Republic',
    description: '1921년 소비에트 적군의 침공으로 수립된 구성 공화국. 스탈린의 출생지인 고리가 위치하며, 1991년 독립하여 현재의 조지아가 되었다.',
    startEra: 'AD', startYear: 1921,
    endEra: 'AD', endYear: 1991,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 41.7, longitude: 44.8,
    linkToIsoCodes: ['GE'],
  },
  {
    name: '아르메니아 소비에트 사회주의 공화국',
    enName: 'Armenian Soviet Socialist Republic',
    description: '1920년 볼셰비키가 수립한 구성 공화국. 오스만 제국의 아르메니아인 학살에서 살아남은 민족이 소비에트 체제 하에 재건한 국가로, 1991년 독립하여 현재의 아르메니아가 되었다.',
    startEra: 'AD', startYear: 1920,
    endEra: 'AD', endYear: 1991,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 40.2, longitude: 44.5,
    linkToIsoCodes: ['AM'],
  },
  {
    name: '아제르바이잔 소비에트 사회주의 공화국',
    enName: 'Azerbaijan Soviet Socialist Republic',
    description: '1920년 수립된 구성 공화국. 카스피해 유전 지대를 보유한 소련의 주요 에너지 공급원이었으며, 1991년 독립하여 현재의 아제르바이잔이 되었다.',
    startEra: 'AD', startYear: 1920,
    endEra: 'AD', endYear: 1991,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 40.4, longitude: 49.9,
    linkToIsoCodes: ['AZ'],
  },
  {
    name: '카자흐 소비에트 사회주의 공화국',
    enName: 'Kazakh Soviet Socialist Republic',
    description: '1936년 중앙아시아 스텝 지대를 기반으로 정식 구성 공화국으로 승격되었다. 핵실험장(세미팔라틴스크)이 위치하였으며, 1991년 독립하여 현재의 카자흐스탄이 되었다.',
    startEra: 'AD', startYear: 1936,
    endEra: 'AD', endYear: 1991,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 51.2, longitude: 71.4,
    linkToIsoCodes: ['KZ'],
  },
  {
    name: '우즈베크 소비에트 사회주의 공화국',
    enName: 'Uzbek Soviet Socialist Republic',
    description: '1924년 중앙아시아 재편 때 수립된 구성 공화국. 사마르칸트와 타슈켄트 등 실크로드 도시들이 위치하며, 1991년 독립하여 현재의 우즈베키스탄이 되었다.',
    startEra: 'AD', startYear: 1924,
    endEra: 'AD', endYear: 1991,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 41.3, longitude: 69.2,
    linkToIsoCodes: ['UZ'],
  },
  {
    name: '투르크멘 소비에트 사회주의 공화국',
    enName: 'Turkmen Soviet Socialist Republic',
    description: '1925년 수립된 구성 공화국. 카라쿰 사막과 카스피해 연안의 천연가스 매장 지역을 포괄하며, 1991년 독립하여 현재의 투르크메니스탄이 되었다.',
    startEra: 'AD', startYear: 1925,
    endEra: 'AD', endYear: 1991,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 37.9, longitude: 58.4,
    linkToIsoCodes: ['TM'],
  },
  {
    name: '타지크 소비에트 사회주의 공화국',
    enName: 'Tajik Soviet Socialist Republic',
    description: '1929년 우즈베크 공화국으로부터 분리되어 수립된 구성 공화국. 이란계 타지크족의 터전으로, 1991년 독립하여 현재의 타지키스탄이 되었다.',
    startEra: 'AD', startYear: 1929,
    endEra: 'AD', endYear: 1991,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 38.6, longitude: 68.8,
    linkToIsoCodes: ['TJ'],
  },
  {
    name: '키르기스 소비에트 사회주의 공화국',
    enName: 'Kirghiz Soviet Socialist Republic',
    description: '1936년 정식 구성 공화국으로 승격된 중앙아시아 국가. 톈산 산맥의 유목 민족 키르기스족의 터전으로, 1991년 독립하여 현재의 키르기스스탄이 되었다.',
    startEra: 'AD', startYear: 1936,
    endEra: 'AD', endYear: 1991,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 42.9, longitude: 74.6,
    linkToIsoCodes: ['KG'],
  },
  {
    name: '에스토니아 소비에트 사회주의 공화국',
    enName: 'Estonian Soviet Socialist Republic',
    description: '1940년 소련-독일 불가침조약 비밀의정서에 따라 소련에 강제 병합된 발트 3국 중 하나. 서방은 합병을 공식 인정하지 않았으며, 1991년 독립하여 현재의 에스토니아가 되었다.',
    startEra: 'AD', startYear: 1940,
    endEra: 'AD', endYear: 1991,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 59.4, longitude: 24.7,
    linkToIsoCodes: ['EE'],
  },
  {
    name: '라트비아 소비에트 사회주의 공화국',
    enName: 'Latvian Soviet Socialist Republic',
    description: '1940년 소련에 강제 병합된 발트 3국 중 하나. 리가는 소련 내 주요 산업·항구 도시였으며, 1991년 독립하여 현재의 라트비아가 되었다.',
    startEra: 'AD', startYear: 1940,
    endEra: 'AD', endYear: 1991,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 56.9, longitude: 24.1,
    linkToIsoCodes: ['LV'],
  },
  {
    name: '리투아니아 소비에트 사회주의 공화국',
    enName: 'Lithuanian Soviet Socialist Republic',
    description: '1940년 소련에 강제 병합된 발트 3국 중 하나. 1990년 소련 구성 공화국 최초로 독립을 선언하여 소련 해체의 도화선을 당겼으며, 현재의 리투아니아가 되었다.',
    startEra: 'AD', startYear: 1940,
    endEra: 'AD', endYear: 1991,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 54.7, longitude: 25.3,
    linkToIsoCodes: ['LT'],
  },
  {
    name: '몰다비아 소비에트 사회주의 공화국',
    enName: 'Moldavian Soviet Socialist Republic',
    description: '1940년 루마니아로부터 할양받은 베사라비아를 기반으로 수립된 구성 공화국. 루마니아어 사용 인구가 다수를 이루며, 1991년 독립하여 현재의 몰도바가 되었다.',
    startEra: 'AD', startYear: 1940,
    endEra: 'AD', endYear: 1991,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 47.0, longitude: 28.9,
    linkToIsoCodes: ['MD'],
  },
]

export async function seedRussiaHistoricalCountries(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🇷🇺 러시아 관련 역사 국가 시딩 시작...')

  // ISO 코드 → 현대 국가 ID 캐시
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

    // 현대 국가 연결
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

  console.log(`✅ 러시아 역사 국가 시딩 완료 (${ENTRIES.length}건)\n`)
}
