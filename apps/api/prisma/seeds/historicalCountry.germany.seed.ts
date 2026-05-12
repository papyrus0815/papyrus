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
  linkToGermany: boolean
}

const ENTRIES: HistoricalCountryEntry[] = [
  // ── 게르만 고대 ───────────────────────────────────────────────────
  {
    name: '게르마니아',
    enName: 'Germania',
    description: '로마 문헌에서 기록된 라인강 동쪽 게르만족 거주 지역의 총칭. 단일 국가가 아닌 부족 연합체로 존재했다.',
    startEra: 'BC', startYear: 100,
    endEra: 'AD', endYear: 500,
    stateType: HistoricalStateType.TRIBAL_STATE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 51.0, longitude: 10.0,
    linkToGermany: true,
  },
  {
    name: '프랑크 왕국',
    enName: 'Kingdom of the Franks',
    description: '클로비스 1세가 세운 게르만 왕국. 메로빙거·카롤링거 두 왕조를 거치며 서유럽 대부분을 지배, 훗날 프랑스·독일·이탈리아로 분열된다.',
    startEra: 'AD', startYear: 481,
    endEra: 'AD', endYear: 843,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 49.0, longitude: 7.0,
    linkToGermany: true,
  },
  {
    name: '동프랑크 왕국',
    enName: 'East Francia',
    description: '843년 베르됭 조약으로 프랑크 왕국에서 분리된 동부 영역. 독일의 직접적 전신이며 루트비히 2세(독일왕)가 초대 왕이다.',
    startEra: 'AD', startYear: 843,
    endEra: 'AD', endYear: 962,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 50.5, longitude: 10.5,
    linkToGermany: true,
  },

  // ── 신성로마제국 계열 ─────────────────────────────────────────────
  {
    name: '신성로마제국',
    enName: 'Holy Roman Empire',
    description: '962년 오토 1세 대관식으로 시작된 중세 유럽의 복합 제국. 독일 국민의 신성 로마 제국이라고도 불리며, 1806년 나폴레옹의 압박으로 해체되었다.',
    startEra: 'AD', startYear: 962,
    endEra: 'AD', endYear: 1806,
    stateType: HistoricalStateType.EMPIRE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 50.0, longitude: 10.0,
    linkToGermany: true,
  },
  {
    name: '독일 왕국',
    enName: 'Kingdom of Germany',
    description: '신성로마제국 내 독일 지역의 왕국. 동프랑크 왕국의 후신으로 황제는 동시에 독일왕을 겸임했다.',
    startEra: 'AD', startYear: 962,
    endEra: 'AD', endYear: 1806,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 51.0, longitude: 10.0,
    linkToGermany: true,
  },
  {
    name: '브란덴부르크 선제후국',
    enName: 'Margraviate of Brandenburg',
    description: '신성로마제국의 선제후국 중 하나. 호엔촐레른 가문이 지배하며 훗날 프로이센 왕국으로 발전하는 핵심 영토.',
    startEra: 'AD', startYear: 1157,
    endEra: 'AD', endYear: 1806,
    stateType: HistoricalStateType.ELECTORATE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 52.5, longitude: 13.4,
    linkToGermany: true,
  },
  {
    name: '작센 선제후국',
    enName: 'Electorate of Saxony',
    description: '신성로마제국의 선제후국. 마르틴 루터의 종교개혁을 지원한 프리드리히 3세(현명공)가 통치했으며, 독일 문화·음악의 중심지.',
    startEra: 'AD', startYear: 1356,
    endEra: 'AD', endYear: 1806,
    stateType: HistoricalStateType.ELECTORATE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 51.0, longitude: 13.7,
    linkToGermany: true,
  },
  {
    name: '팔츠 선제후국',
    enName: 'Electorate of the Palatinate',
    description: '라인 팔츠 지역의 신성로마제국 선제후국. 30년 전쟁의 발단이 된 프리드리히 5세가 통치했다.',
    startEra: 'AD', startYear: 1356,
    endEra: 'AD', endYear: 1803,
    stateType: HistoricalStateType.ELECTORATE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 49.5, longitude: 8.4,
    linkToGermany: true,
  },
  {
    name: '바이에른 선제후국',
    enName: 'Electorate of Bavaria',
    description: '비텔스바흐 가문이 지배한 신성로마제국의 선제후국. 30년 전쟁에서 가톨릭 동맹의 주축이었다.',
    startEra: 'AD', startYear: 1623,
    endEra: 'AD', endYear: 1806,
    stateType: HistoricalStateType.ELECTORATE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 48.1, longitude: 11.6,
    linkToGermany: true,
  },
  {
    name: '하노버 선제후국',
    enName: 'Electorate of Hanover',
    description: '벨펜 가문이 지배한 신성로마제국 선제후국. 1714년 게오르크 1세가 영국 왕을 겸하며 영국 하노버 왕조의 기원이 되었다.',
    startEra: 'AD', startYear: 1692,
    endEra: 'AD', endYear: 1806,
    stateType: HistoricalStateType.ELECTORATE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 52.4, longitude: 9.7,
    linkToGermany: true,
  },
  {
    name: '헤센-카셀 방백령',
    enName: 'Landgraviate of Hesse-Kassel',
    description: '헤센 지역에 위치한 신성로마제국의 방백령. 용병 수출로 유명했으며, 미국 독립전쟁 당시 영국에 헤센 용병을 파견했다.',
    startEra: 'AD', startYear: 1567,
    endEra: 'AD', endYear: 1806,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 51.3, longitude: 9.5,
    linkToGermany: true,
  },
  {
    name: '헤센-다름슈타트 방백령',
    enName: 'Landgraviate of Hesse-Darmstadt',
    description: '헤센 지역 남부의 방백령. 나폴레옹 전쟁 후 대공국으로 승격되어 헤센 대공국이 된다.',
    startEra: 'AD', startYear: 1567,
    endEra: 'AD', endYear: 1806,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 49.9, longitude: 8.7,
    linkToGermany: true,
  },
  {
    name: '뷔르템베르크 공국',
    enName: 'Duchy of Württemberg',
    description: '슈바벤 지역의 공국. 종교개혁의 영향을 받아 루터교를 채택했으며 나중에 왕국으로 승격된다.',
    startEra: 'AD', startYear: 1495,
    endEra: 'AD', endYear: 1806,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 48.7, longitude: 9.2,
    linkToGermany: true,
  },
  {
    name: '바덴 변경백령',
    enName: 'Margraviate of Baden',
    description: '라인강 동쪽 바덴 지역의 변경백령. 여러 차례 분할·통합을 거쳐 나폴레옹 시기 대공국으로 승격된다.',
    startEra: 'AD', startYear: 1112,
    endEra: 'AD', endYear: 1806,
    stateType: HistoricalStateType.MARGRAVIATE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 48.5, longitude: 8.0,
    linkToGermany: true,
  },
  {
    name: '뮌스터 주교령',
    enName: 'Prince-Bishopric of Münster',
    description: '베스트팔렌 지역의 교회 영주국. 1648년 베스트팔렌 조약이 이 도시에서 체결되었다.',
    startEra: 'AD', startYear: 1180,
    endEra: 'AD', endYear: 1803,
    stateType: HistoricalStateType.THEOCRACY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 51.9, longitude: 7.6,
    linkToGermany: true,
  },

  // ── 프로이센 계열 ─────────────────────────────────────────────────
  {
    name: '프로이센 공국',
    enName: 'Duchy of Prussia',
    description: '튜턴 기사단의 세속화로 탄생한 공국. 호엔촐레른 가문이 브란덴부르크와 동군연합을 이루며 성장했다.',
    startEra: 'AD', startYear: 1525,
    endEra: 'AD', endYear: 1618,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 54.7, longitude: 20.5,
    linkToGermany: true,
  },
  {
    name: '브란덴부르크-프로이센',
    enName: 'Brandenburg-Prussia',
    description: '브란덴부르크 선제후국과 프로이센 공국의 동군연합. 17세기 급속히 팽창하여 프로이센 왕국의 전신이 된다.',
    startEra: 'AD', startYear: 1618,
    endEra: 'AD', endYear: 1701,
    stateType: HistoricalStateType.PERSONAL_UNION,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 52.5, longitude: 13.4,
    linkToGermany: true,
  },
  {
    name: '프로이센 왕국',
    enName: 'Kingdom of Prussia',
    description: '1701년 프리드리히 1세가 선포한 왕국. 프리드리히 대왕 시기 오스트리아와 패권을 다투며 강국으로 부상했고, 1871년 독일 통일을 주도했다.',
    startEra: 'AD', startYear: 1701,
    endEra: 'AD', endYear: 1918,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 52.5, longitude: 13.4,
    linkToGermany: true,
  },

  // ── 나폴레옹 시기 ─────────────────────────────────────────────────
  {
    name: '라인 연방',
    enName: 'Confederation of the Rhine',
    description: '나폴레옹이 신성로마제국 해체 후 1806년 창설한 독일 서부 제후국 연합. 나폴레옹의 보호국으로 프랑스 제국의 위성 국가들로 구성되었다.',
    startEra: 'AD', startYear: 1806,
    endEra: 'AD', endYear: 1813,
    stateType: HistoricalStateType.CONFEDERATION,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 50.0, longitude: 8.0,
    linkToGermany: true,
  },
  {
    name: '베스트팔렌 왕국',
    enName: 'Kingdom of Westphalia',
    description: '나폴레옹이 동생 제롬 보나파르트를 위해 세운 위성 왕국. 1807~1813년 존속했다.',
    startEra: 'AD', startYear: 1807,
    endEra: 'AD', endYear: 1813,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 51.5, longitude: 9.5,
    linkToGermany: true,
  },
  {
    name: '바이에른 왕국',
    enName: 'Kingdom of Bavaria',
    description: '나폴레옹의 지원으로 1806년 왕국으로 승격된 바이에른. 1871년 독일 제국에 합류했으나 왕국 지위를 유지하다가 1918년 혁명으로 폐지되었다.',
    startEra: 'AD', startYear: 1806,
    endEra: 'AD', endYear: 1918,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 48.1, longitude: 11.6,
    linkToGermany: true,
  },
  {
    name: '뷔르템베르크 왕국',
    enName: 'Kingdom of Württemberg',
    description: '나폴레옹의 지원으로 1806년 왕국으로 승격. 1871년 독일 제국 합류, 1918년 혁명으로 소멸.',
    startEra: 'AD', startYear: 1806,
    endEra: 'AD', endYear: 1918,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 48.7, longitude: 9.2,
    linkToGermany: true,
  },
  {
    name: '작센 왕국',
    enName: 'Kingdom of Saxony',
    description: '1806년 왕국으로 승격된 작센. 1813년 라이프치히 전투 후 프로이센에 영토를 잃었으나 왕국을 유지하다 1918년 소멸.',
    startEra: 'AD', startYear: 1806,
    endEra: 'AD', endYear: 1918,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 51.0, longitude: 13.7,
    linkToGermany: true,
  },
  {
    name: '하노버 왕국',
    enName: 'Kingdom of Hanover',
    description: '1814년 하노버 선제후국에서 왕국으로 승격. 1866년 프로이센-오스트리아 전쟁 후 프로이센에 병합되었다.',
    startEra: 'AD', startYear: 1814,
    endEra: 'AD', endYear: 1866,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 52.4, longitude: 9.7,
    linkToGermany: true,
  },
  {
    name: '헤센 선제후국',
    enName: 'Electorate of Hesse',
    description: '헤센-카셀이 1803년 선제후국으로 승격된 국가. 1866년 프로이센에 병합되었다.',
    startEra: 'AD', startYear: 1803,
    endEra: 'AD', endYear: 1866,
    stateType: HistoricalStateType.ELECTORATE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 51.3, longitude: 9.5,
    linkToGermany: true,
  },
  {
    name: '헤센 대공국',
    enName: 'Grand Duchy of Hesse',
    description: '헤센-다름슈타트가 1806년 대공국으로 승격된 국가. 1918년 혁명으로 소멸.',
    startEra: 'AD', startYear: 1806,
    endEra: 'AD', endYear: 1918,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 49.9, longitude: 8.7,
    linkToGermany: true,
  },
  {
    name: '바덴 대공국',
    enName: 'Grand Duchy of Baden',
    description: '1806년 바덴 변경백령에서 대공국으로 승격. 독일 제국의 구성국으로 1918년까지 존속.',
    startEra: 'AD', startYear: 1806,
    endEra: 'AD', endYear: 1918,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 48.5, longitude: 8.0,
    linkToGermany: true,
  },

  // ── 작센 소공국 ─────────────────────────────────────────────────────
  {
    name: '작센코부르크잘펠트 공국',
    enName: 'Duchy of Saxe-Coburg-Saalfeld',
    description: '에른스트 왕조의 작센 소공국. 1699년 분립하여 작센코부르크와 잘펠트 지역을 통치했다. 1826년 영토 재편을 통해 작센코부르크고타 공국으로 전환되었다. 빅토리아 여왕의 어머니 빅토리아 공녀의 친정이다.',
    startEra: 'AD', startYear: 1699,
    endEra: 'AD', endYear: 1826,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 50.26, longitude: 10.96,
    linkToGermany: true,
  },
  {
    name: '작센코부르크고타 공국',
    enName: 'Duchy of Saxe-Coburg and Gotha',
    description: '1826년 작센코부르크잘펠트 공국의 재편으로 성립된 소공국. 에른스트 1세가 초대 공작이다. 앨버트 공의 출신지로, 빅토리아 여왕과의 결혼으로 영국 왕실에 작센코부르크고타 왕가 이름을 남겼다. 1918년까지 존속했다.',
    startEra: 'AD', startYear: 1826,
    endEra: 'AD', endYear: 1918,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 50.26, longitude: 10.96,
    linkToGermany: true,
  },

  // ── 독일 연방 ─────────────────────────────────────────────────────
  {
    name: '독일 연방',
    enName: 'German Confederation',
    description: '1815년 빈 회의 결과 설립된 39개 독일어권 국가의 느슨한 연합체. 오스트리아와 프로이센의 패권 다툼 속에 1866년 해체되었다.',
    startEra: 'AD', startYear: 1815,
    endEra: 'AD', endYear: 1866,
    stateType: HistoricalStateType.CONFEDERATION,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 51.0, longitude: 10.0,
    linkToGermany: true,
  },
  {
    name: '북독일 연방',
    enName: 'North German Confederation',
    description: '1866년 프로이센이 오스트리아를 누르고 주도한 북독일 국가 연합. 독일 제국의 직접적 전신이다.',
    startEra: 'AD', startYear: 1867,
    endEra: 'AD', endYear: 1871,
    stateType: HistoricalStateType.FEDERATION,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 52.0, longitude: 11.0,
    linkToGermany: true,
  },

  // ── 독일 제국 및 이후 ──────────────────────────────────────────────
  {
    name: '독일 제국',
    enName: 'German Empire',
    description: '1871년 프로이센의 주도로 통일된 독일 국민국가. 빌헬름 1세가 베르사유 궁전에서 황제로 선포되었으며, 1차 세계대전 패전 후 1918년 붕괴했다.',
    startEra: 'AD', startYear: 1871,
    endEra: 'AD', endYear: 1918,
    stateType: HistoricalStateType.EMPIRE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 52.5, longitude: 13.4,
    linkToGermany: true,
  },
  {
    name: '바이마르 공화국',
    enName: 'Weimar Republic',
    description: '1918년 독일 혁명 후 수립된 민주 공화국. 초인플레이션, 대공황, 정치적 불안정을 거쳐 1933년 나치에 의해 사실상 종식되었다.',
    startEra: 'AD', startYear: 1919,
    endEra: 'AD', endYear: 1933,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 52.5, longitude: 13.4,
    linkToGermany: true,
  },
  {
    name: '나치 독일 (제3제국)',
    enName: 'Nazi Germany (Third Reich)',
    description: '아돌프 히틀러의 국가사회주의 독일 노동자당이 지배한 전체주의 국가. 2차 세계대전을 일으켰으며 1945년 패전으로 붕괴했다.',
    startEra: 'AD', startYear: 1933,
    endEra: 'AD', endYear: 1945,
    stateType: HistoricalStateType.OTHER,
    entityKind: HistoricalEntityKind.REGIME,
    latitude: 52.5, longitude: 13.4,
    linkToGermany: true,
  },
  {
    name: '연합군 점령하 독일',
    enName: 'Allied-Occupied Germany',
    description: '1945년 2차 세계대전 종전 후 미국·영국·프랑스·소련 4개국이 독일을 분할 점령한 시기.',
    startEra: 'AD', startYear: 1945,
    endEra: 'AD', endYear: 1949,
    stateType: HistoricalStateType.OTHER,
    entityKind: HistoricalEntityKind.PERIOD,
    latitude: 52.5, longitude: 13.4,
    linkToGermany: true,
  },
  {
    name: '독일 민주 공화국 (동독)',
    enName: 'German Democratic Republic',
    description: '소련 점령 지역에 수립된 사회주의 국가. 베를린 장벽 건설로 상징되는 냉전의 최전선으로, 1990년 독일 재통일로 서독에 편입되었다.',
    startEra: 'AD', startYear: 1949,
    endEra: 'AD', endYear: 1990,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 52.5, longitude: 13.4,
    linkToGermany: true,
  },
  {
    name: '독일 연방 공화국 (서독)',
    enName: 'Federal Republic of Germany (West Germany)',
    description: '미국·영국·프랑스 점령 지역에 수립된 자유민주주의 국가. 라인강의 기적으로 경제 부흥을 이루었으며, 1990년 동독을 흡수하여 현재의 독일로 재통일되었다.',
    startEra: 'AD', startYear: 1949,
    endEra: 'AD', endYear: 1990,
    stateType: HistoricalStateType.FEDERATION,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 50.5, longitude: 8.0,
    linkToGermany: true,
  },
]

export async function seedGermanyHistoricalCountries(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🏰 독일 관련 역사 국가 시딩 시작...')

  const modernGermany = await prisma.country.findFirst({
    where: { isoCode: 'DE' },
    select: { id: true },
  })
  if (!modernGermany) {
    console.warn('  ⚠️  현대 독일(DE) 국가를 찾을 수 없습니다.')
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

    // 독일 현대 국가와 연결
    if (entry.linkToGermany && modernGermany) {
      const linkExists = await prisma.historicalCountryModernCountry.findFirst({
        where: { historicalCountryId: id, modernCountryId: modernGermany.id },
      })
      if (!linkExists) {
        await prisma.historicalCountryModernCountry.create({
          data: { historicalCountryId: id, modernCountryId: modernGermany.id },
        })
      }
    }
  }

  console.log(`✅ 독일 역사 국가 시딩 완료 (${ENTRIES.length}건)\n`)
}
