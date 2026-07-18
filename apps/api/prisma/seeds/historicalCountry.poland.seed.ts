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
  // ── 피아스트 시대 ─────────────────────────────────────────────────
  {
    name: '폴란드 공국',
    enName: 'Duchy of Poland',
    description:
      '10세기 중엽 피아스트 가문의 미에슈코 1세가 폴란인 부족들을 통합해 세운 폴란드 최초의 국가. ' +
      '966년 미에슈코 1세가 기독교를 받아들이며(폴란드의 세례) 서방 기독교 세계에 편입되었고, ' +
      '그니에즈노를 중심으로 대폴란드·소폴란드·실롱스크·마조프셰 일대로 세력을 넓혔다.',
    startEra: 'AD', startYear: 960,
    endEra: 'AD', endYear: 1025,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 52.53, longitude: 17.6,
    linkToIsoCodes: ['PL'],
  },
  {
    name: '폴란드 왕국',
    enName: 'Kingdom of Poland',
    description:
      '1025년 볼레스와프 1세(용맹왕)의 대관으로 성립한 왕국. 1138년 유언 분할로 약 두 세기 동안 제후령으로 분열되었다가 ' +
      '1320년 브와디스와프 1세(단신왕)가 재통일했고, 카지미에시 3세(대왕) 치세에 법전 편찬과 크라쿠프 대학 설립 등 전성기를 맞았다. ' +
      '1370년 앙주 가문, 1386년 야기에우워 왕조로 이어지며 리투아니아와의 동군연합 아래 중·동유럽의 강국으로 성장했고, ' +
      '1569년 루블린 연합으로 폴란드-리투아니아 연방에 통합되었다.',
    startEra: 'AD', startYear: 1025,
    endEra: 'AD', endYear: 1569,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 50.06, longitude: 19.94,
    linkToIsoCodes: ['PL'],
  },
  {
    name: '리투아니아 대공국',
    enName: 'Grand Duchy of Lithuania',
    description:
      '1236년경 민다우가스가 발트 부족들을 통합해 세운 대공국. 유럽 최후의 이교 국가였으나 ' +
      '1386년 대공 요가일라가 폴란드 왕(브와디스와프 2세)으로 즉위하며 기독교화와 폴란드와의 동군연합이 시작되었다. ' +
      '15세기에 발트해에서 흑해에 이르는 유럽 최대급 판도를 이루었고, 1569년 루블린 연합으로 연방의 한 축이 되어 1795년까지 존속했다.',
    startEra: 'AD', startYear: 1236,
    endEra: 'AD', endYear: 1795,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 54.69, longitude: 25.28,
    linkToIsoCodes: ['LT', 'BY'],
  },

  // ── 연방 시대 ─────────────────────────────────────────────────────
  {
    name: '폴란드-리투아니아 연방',
    enName: 'Polish–Lithuanian Commonwealth',
    description:
      '1569년 루블린 연합으로 폴란드 왕국과 리투아니아 대공국이 결합해 성립한 연합 국가(양국민 공화국). ' +
      '선거왕정과 귀족 민주주의(황금의 자유)를 특징으로 하며 한때 유럽 최대급 영토와 종교 관용을 자랑했으나, ' +
      '자유거부권(리베룸 베토)으로 인한 정치 마비와 열강의 개입 끝에 1772·1793·1795년 세 차례 분할로 지도에서 사라졌다.',
    startEra: 'AD', startYear: 1569,
    endEra: 'AD', endYear: 1795,
    stateType: HistoricalStateType.FEDERATION,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 52.23, longitude: 21.01,
    linkToIsoCodes: ['PL', 'LT'],
  },

  // ── 분할 시대 ─────────────────────────────────────────────────────
  {
    name: '바르샤바 공국',
    enName: 'Duchy of Warsaw',
    description:
      '1807년 틸지트 조약으로 나폴레옹이 프로이센의 분할 점령지에 세운 위성 공국. ' +
      '작센 왕 프리드리히 아우구스트 1세가 공작을 겸했으며, 나폴레옹 몰락 후 1815년 빈 회의로 해체되어 ' +
      '대부분 러시아 지배하의 폴란드 입헌왕국으로 재편되었다.',
    startEra: 'AD', startYear: 1807,
    endEra: 'AD', endYear: 1815,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 52.23, longitude: 21.01,
    linkToIsoCodes: ['PL'],
  },
  {
    name: '폴란드 입헌왕국',
    enName: 'Congress Kingdom of Poland',
    description:
      '1815년 빈 회의로 성립해 러시아 차르가 폴란드 왕을 겸한 입헌왕국(회의왕국). ' +
      '11월 봉기(1830)와 1월 봉기(1863)가 진압되며 자치가 단계적으로 박탈되어 1867년 러시아 직할(비스와 지방)로 편입되었고, ' +
      '1차 대전 중 1915년 독일·오스트리아군의 점령으로 러시아 지배가 종식되었다.',
    startEra: 'AD', startYear: 1815,
    endEra: 'AD', endYear: 1915,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 52.23, longitude: 21.01,
    linkToIsoCodes: ['PL'],
  },
  {
    name: '크라쿠프 자유시',
    enName: 'Free City of Kraków',
    description:
      '1815년 빈 회의가 크라쿠프와 주변 지역에 세운 중립 자유시(크라쿠프 공화국). ' +
      '러시아·오스트리아·프로이센 3국의 공동 보호 아래 분할 시대 폴란드 땅에 남은 유일한 자치 영역이었으나, ' +
      '1846년 크라쿠프 봉기를 계기로 오스트리아 제국에 병합되었다.',
    startEra: 'AD', startYear: 1815,
    endEra: 'AD', endYear: 1846,
    stateType: HistoricalStateType.CITY_STATE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 50.06, longitude: 19.94,
    linkToIsoCodes: ['PL'],
  },

  // ── 20세기 ────────────────────────────────────────────────────────
  {
    name: '폴란드 제2공화국',
    enName: 'Second Polish Republic',
    description:
      '1918년 1차 대전 종전과 함께 123년의 분할 지배를 끝내고 독립을 회복한 공화국. ' +
      '유제프 피우수트스키가 국가원수로 재건을 이끌었고 1920년 소비에트-폴란드 전쟁에서 국경을 확정했으나, ' +
      '1939년 9월 나치 독일과 소련의 침공으로 분할 점령되며 소멸했다.',
    startEra: 'AD', startYear: 1918,
    endEra: 'AD', endYear: 1939,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 52.23, longitude: 21.01,
    linkToIsoCodes: ['PL'],
  },
  {
    name: '폴란드 인민공화국',
    enName: 'Polish People\'s Republic',
    description:
      '2차 대전 후 소련의 지원 아래 수립된 사회주의 국가. 1944년 루블린 위원회에서 출발해 1952년 인민공화국 헌법을 채택했으며, ' +
      '1980년 자유노조(솔리다르노시치) 운동을 거쳐 1989년 원탁회의와 부분 자유선거로 체제 전환이 이루어졌다.',
    startEra: 'AD', startYear: 1944,
    endEra: 'AD', endYear: 1989,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 52.23, longitude: 21.01,
    linkToIsoCodes: ['PL'],
  },
]

export async function seedPolandHistoricalCountries(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🦅 폴란드 관련 역사 국가 시딩 시작...')

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

  console.log(`✅ 폴란드 역사 국가 시딩 완료 (${ENTRIES.length}건)\n`)
}
