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
  // ── 고대 로마 ─────────────────────────────────────────────────────
  {
    name: '로마 왕국',
    enName: 'Kingdom of Rome',
    description: '전설에 따르면 기원전 753년 로물루스가 건국한 로마의 초기 군주정 국가. 7명의 왕이 차례로 통치하였으며 라틴·에트루리아·사비니 등 여러 민족의 영향 아래 로마 문명의 기초를 놓았다. 기원전 509년 에트루리아 계열의 왕 타르퀴니우스 수페르부스가 귀족 세력에 의해 추방되면서 공화정이 수립되었다.',
    startEra: 'BC', startYear: 753,
    endEra: 'BC', endYear: 509,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 41.9, longitude: 12.5,
    linkToIsoCodes: ['IT'],
  },
  {
    name: '로마 공화국',
    enName: 'Roman Republic',
    description: '기원전 509년 왕정을 타도한 귀족들이 수립한 공화정 국가. 두 명의 집정관이 공동으로 최고 권력을 행사하였으며 원로원이 국정의 중심 기관으로 기능했다. 포에니 전쟁으로 카르타고를 멸망시키고 지중해 전역으로 세력을 확장했다. 기원전 1세기 율리우스 카이사르의 독재와 그 후 옥타비아누스의 집권으로 공화정 체제가 사실상 붕괴되었다.',
    startEra: 'BC', startYear: 509,
    endEra: 'BC', endYear: 27,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 41.9, longitude: 12.5,
    linkToIsoCodes: ['IT', 'FR', 'DE', 'TR', 'EG'],
  },
  {
    name: '로마 제국',
    enName: 'Roman Empire',
    description: '기원전 27년 옥타비아누스(아우구스투스)가 초대 황제가 되면서 수립된 제국. 오현제 시대(96~180)에 최전성기를 누리며 유럽·북아프리카·서아시아에 걸쳐 약 500만㎢의 영토를 지배했다. 로마법·라틴어·그리스도교 등 서구 문명의 근간을 형성하였으며, 395년 테오도시우스 1세 사후 동서로 분열되었다.',
    startEra: 'BC', startYear: 27,
    endEra: 'AD', endYear: 395,
    stateType: HistoricalStateType.EMPIRE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 41.9, longitude: 12.5,
    linkToIsoCodes: ['IT', 'FR', 'DE', 'GB', 'TR', 'RO', 'BG', 'HU', 'AT', 'EG'],
  },
  {
    name: '서로마 제국',
    enName: 'Western Roman Empire',
    description: '395년 테오도시우스 1세 사후 로마 제국이 동서로 분열되면서 성립한 서쪽 절반의 제국. 게르만 민족의 대이동으로 끊임없는 침략을 받았으며 서서히 약화되었다. 476년 게르만 용병대장 오도아케르가 마지막 황제 로물루스 아우구스툴루스를 폐위시키면서 서로마 제국이 멸망하고 서유럽의 고대가 막을 내렸다.',
    startEra: 'AD', startYear: 395,
    endEra: 'AD', endYear: 476,
    stateType: HistoricalStateType.EMPIRE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 41.9, longitude: 12.5,
    linkToIsoCodes: ['IT', 'FR', 'DE', 'GB', 'RO'],
  },

  // ── 민족 이동기 ───────────────────────────────────────────────────
  {
    name: '동고트 왕국',
    enName: 'Ostrogothic Kingdom',
    description: '493년 동고트족 왕 테오도리쿠스 대왕이 오도아케르를 물리치고 이탈리아 반도 전역을 장악하여 세운 왕국. 로마의 행정 체계를 유지하며 로마·고트 문명의 공존을 꾀했으나, 유스티니아누스 1세가 파견한 동로마 장군 벨리사리우스의 원정(535~554)으로 멸망하였다.',
    startEra: 'AD', startYear: 493,
    endEra: 'AD', endYear: 553,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 45.0, longitude: 12.0,
    linkToIsoCodes: ['IT'],
  },
  {
    name: '랑고바르드 왕국',
    enName: 'Lombard Kingdom',
    description: '568년 게르만계 랑고바르드족이 이탈리아 북부를 침략하여 세운 왕국. 북이탈리아의 롬바르디아 평원(지명 유래)을 중심으로 번영하였으며, 교황령 및 비잔티움 제국과 대립했다. 774년 카롤루스 대제(샤를마뉴)가 침공하여 랑고바르드 왕국을 병합하고 이탈리아의 왕위를 겸하였다.',
    startEra: 'AD', startYear: 568,
    endEra: 'AD', endYear: 774,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 45.5, longitude: 9.2,
    linkToIsoCodes: ['IT'],
  },

  // ── 중세 ──────────────────────────────────────────────────────────
  {
    name: '교황령',
    enName: 'Papal States',
    description: '756년 프랑크 왕 피핀이 이탈리아 중부 땅을 교황 스테파노 2세에게 헌납하면서 시작된 교황의 세속 통치령. 이탈리아 반도의 상당 부분을 영토로 가졌으며 중세 유럽 정치에 막대한 영향력을 행사했다. 1861년 이탈리아 통일 과정에서 영토를 잃다가 1870년 로마가 이탈리아 왕국에 병합되면서 완전히 소멸했다.',
    startEra: 'AD', startYear: 756,
    endEra: 'AD', endYear: 1870,
    stateType: HistoricalStateType.THEOCRACY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 41.9, longitude: 12.5,
    linkToIsoCodes: ['IT'],
  },
  {
    name: '베네치아 공화국',
    enName: 'Republic of Venice',
    description: '697년 초대 도제(Doge)가 선출되면서 시작된 도시 공화국. "바다의 지배자(Serenissima)"로 불리며 1,100년 이상 지중해 무역을 지배한 불세출의 해양 강국이다. 제4차 십자군(1204) 원정의 최대 수혜자로 동방 무역로를 장악했으나, 오스만 제국의 팽창과 신항로 개척으로 점차 쇠락하여 1797년 나폴레옹에 의해 해체되었다.',
    startEra: 'AD', startYear: 697,
    endEra: 'AD', endYear: 1797,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 45.4, longitude: 12.3,
    linkToIsoCodes: ['IT'],
  },
  {
    name: '제노바 공화국',
    enName: 'Republic of Genoa',
    description: '1005년경 주교·귀족 중심의 자치 도시로 출발하여 성립한 도시 공화국. 지중해 서부 무역의 거점으로 성장하여 흑해 연안까지 식민지를 확장했다. 베네치아와 경쟁하며 해상 패권을 다퉜으나 1797년 나폴레옹에 의해 폐지되었다가 이후 리구리아 공화국을 거쳐 사르데냐 왕국에 병합되었다.',
    startEra: 'AD', startYear: 1005,
    endEra: 'AD', endYear: 1797,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 44.4, longitude: 8.9,
    linkToIsoCodes: ['IT'],
  },
  {
    name: '시칠리아 왕국',
    enName: 'Kingdom of Sicily',
    description: '1130년 노르만 계열의 루지에로 2세가 시칠리아·남이탈리아를 통합하여 창건한 왕국. 아랍·비잔티움·노르만 문화가 혼합된 독특한 문명을 꽃피웠다. 13세기 신성로마 황제 프리드리히 2세의 지배 아래 지중해의 강국이 되었으나, 1282년 시칠리아의 만종 사건으로 본토(나폴리 왕국)와 분리되었다. 1816년 나폴리 왕국과 합쳐져 양시칠리아 왕국이 되었다.',
    startEra: 'AD', startYear: 1130,
    endEra: 'AD', endYear: 1816,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 37.5, longitude: 14.0,
    linkToIsoCodes: ['IT'],
  },
  {
    name: '나폴리 왕국',
    enName: 'Kingdom of Naples',
    description: '1282년 시칠리아의 만종 봉기로 시칠리아 왕국의 본토 영역이 분리되어 성립한 왕국. 앙주 가문·아라곤 가문 등 여러 왕조가 지배했으며 르네상스 시대 문화의 주요 중심지 중 하나였다. 1816년 나폴레옹 전쟁 이후 시칠리아 왕국과 통합하여 양시칠리아 왕국이 되었다.',
    startEra: 'AD', startYear: 1282,
    endEra: 'AD', endYear: 1816,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 40.8, longitude: 14.3,
    linkToIsoCodes: ['IT'],
  },
  {
    name: '피렌체 공화국',
    enName: 'Republic of Florence',
    description: '1115년 피렌체 백작령이 폐지된 후 자치 도시로 성장한 도시 공화국. 메디치 가문의 후원 아래 레오나르도 다 빈치·미켈란젤로·단테 등 르네상스 문화가 꽃을 피웠다. 1494년 메디치 가문이 추방되었다가 1512년 복귀, 1532년 메디치 가문이 공식 통치자가 되어 피렌체 공국으로 전환되었다.',
    startEra: 'AD', startYear: 1115,
    endEra: 'AD', endYear: 1532,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 43.8, longitude: 11.3,
    linkToIsoCodes: ['IT'],
  },
  {
    name: '밀라노 공국',
    enName: 'Duchy of Milan',
    description: '1395년 잔 갈레아초 비스콘티가 황제로부터 공작 칭호를 받아 수립한 공국. 롬바르디아 평원의 풍부한 농업·수공업을 기반으로 이탈리아 북부의 주요 세력이 되었다. 스포르차 가문이 비스콘티 가문을 계승하였으나 1535년 스페인 합스부르크에 넘어갔다가 1797년 나폴레옹의 치살피나 공화국 수립으로 소멸했다.',
    startEra: 'AD', startYear: 1395,
    endEra: 'AD', endYear: 1797,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 45.5, longitude: 9.2,
    linkToIsoCodes: ['IT'],
  },

  // ── 근세 ──────────────────────────────────────────────────────────
  {
    name: '토스카나 대공국',
    enName: 'Grand Duchy of Tuscany',
    description: '1569년 교황 비오 5세가 코시모 1세 데 메디치에게 대공 칭호를 수여하며 성립한 대공국. 이전 피렌체 공국과 시에나 공화국을 통합하였다. 레오폴도 2세의 개혁 정치로 유럽에서 가장 앞선 자유주의 국가 중 하나로 꼽혔다. 1860년 이탈리아 통일 운동의 물결 속에 주민 투표로 이탈리아 왕국에 합류하였다.',
    startEra: 'AD', startYear: 1569,
    endEra: 'AD', endYear: 1860,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 43.8, longitude: 11.3,
    linkToIsoCodes: ['IT'],
  },

  // ── 근대 ──────────────────────────────────────────────────────────
  {
    name: '양시칠리아 왕국',
    enName: 'Kingdom of the Two Sicilies',
    description: '1816년 나폴리 왕국과 시칠리아 왕국이 합쳐져 수립된 왕국. 부르봉 가문이 지배하였으며 이탈리아 반도 남부 전역과 시칠리아 섬을 영토로 하는 이탈리아 최대의 단일 국가였다. 1860년 가리발디가 이끈 "천인대(I Mille)"의 원정으로 사르데냐 왕국에 합병되어 이탈리아 통일의 중요한 계기가 되었다.',
    startEra: 'AD', startYear: 1816,
    endEra: 'AD', endYear: 1861,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 40.8, longitude: 15.0,
    linkToIsoCodes: ['IT'],
  },
  {
    name: '사르데냐 왕국',
    enName: 'Kingdom of Sardinia',
    description: '1720년 사보이 가문이 사르데냐 섬을 얻으면서 수립한 왕국(피에몬테-사르데냐 왕국이라고도 함). 카보우르 수상의 외교와 가리발디의 군사 원정을 바탕으로 이탈리아 반도 통일의 핵심 주체가 되었다. 1861년 비토리오 에마누엘레 2세가 이탈리아 왕국의 초대 국왕으로 즉위하면서 사르데냐 왕국은 이탈리아 왕국으로 계승되었다.',
    startEra: 'AD', startYear: 1720,
    endEra: 'AD', endYear: 1861,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 45.1, longitude: 7.7,
    linkToIsoCodes: ['IT'],
  },
  {
    name: '이탈리아 왕국',
    enName: 'Kingdom of Italy',
    description: '1861년 사르데냐 왕국의 비토리오 에마누엘레 2세가 이탈리아 통일을 선포하며 수립한 왕국. 카보우르·가리발디·마치니 등 리소르지멘토 운동의 결실로 탄생하였다. 1870년 교황령을 병합하고 로마를 수도로 정함으로써 통일을 완성했다. 1922년 무솔리니가 집권하여 파시스트 독재 체제로 전환되었으며 1946년 국민투표로 공화국으로 전환되었다.',
    startEra: 'AD', startYear: 1861,
    endEra: 'AD', endYear: 1946,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 42.5, longitude: 12.5,
    linkToIsoCodes: ['IT'],
  },
  {
    name: '파시스트 이탈리아',
    enName: 'Fascist Italy',
    description: '1922년 베니토 무솔리니가 로마 진군을 통해 정권을 장악한 후 수립한 파시스트 독재 체제. 공식적으로는 이탈리아 왕국의 테두리 안에서 국가파시스트당이 일당 독재를 실시했다. 에티오피아 침공(1935), 스페인 내전 개입, 독일·일본과의 추축국 동맹을 맺었다. 1943년 연합군의 시칠리아 상륙 후 무솔리니가 축출되고 정전을 선언하면서 붕괴되었다.',
    startEra: 'AD', startYear: 1922,
    endEra: 'AD', endYear: 1943,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.REGIME,
    latitude: 41.9, longitude: 12.5,
    linkToIsoCodes: ['IT'],
  },
  {
    name: '이탈리아 사회 공화국',
    enName: 'Italian Social Republic',
    description: '1943년 9월 연합군에 의해 실각한 무솔리니가 나치 독일의 지원으로 북이탈리아 살로에 세운 괴뢰 공화국(살로 공화국). 나치 점령 하에서 명목상의 국가로 존속하였으며 이탈리아 레지스탕스와 치열한 내전을 벌였다. 1945년 4월 무솔리니가 파르티잔에게 처형되고 독일군이 항복하면서 소멸했다.',
    startEra: 'AD', startYear: 1943,
    endEra: 'AD', endYear: 1945,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 45.6, longitude: 10.5,
    linkToIsoCodes: ['IT'],
  },
]

export async function seedItalyHistoricalCountries(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🇮🇹 이탈리아 관련 역사 국가 시딩 시작...')

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

  console.log(`✅ 이탈리아 역사 국가 시딩 완료 (${ENTRIES.length}건)\n`)
}
