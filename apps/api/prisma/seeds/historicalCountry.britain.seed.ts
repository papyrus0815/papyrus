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
  {
    name: '그레이트브리튼 및 북아일랜드 연합왕국',
    // en_name 컬럼은 VarChar(50) — 정식 명칭(52자)이 초과하여 N. 축약(전체 명칭은 name·description에 보존)
    enName: 'United Kingdom of Great Britain and N. Ireland',
    nameOrigin:
      `"그레이트브리튼(Great Britain)"은 잉글랜드·스코틀랜드·웨일스가 자리한 브리튼 제도 최대의 섬을 가리키며, ` +
      `유럽 대륙의 브르타뉴(소[小]브리튼)와 구별하기 위해 "큰"을 덧붙인 이름이다. "북아일랜드(Northern Ireland)"는 ` +
      `1921년 아일랜드 분할로 연합왕국에 잔류한 얼스터 지방 6개 주를 가리키며, 아일랜드 섬 전체를 포괄하던 ` +
      `옛 국호의 "및 아일랜드(and Ireland)"를 대신하게 되었다.`,
    description:
      `제1차 세계대전 이후 아일랜드 독립 전쟁과 1921년 영국-아일랜드 조약의 귀결로, 1922년 12월 아일랜드 섬 남부 26개 주가 ` +
      `아일랜드 자유국으로 분리되고 북부 얼스터 6개 주가 연합왕국에 잔류하면서 전임 "그레이트브리튼 및 아일랜드 연합왕국"을 이어 성립했다. ` +
      `1927년 왕국·의회 명칭법(Royal and Parliamentary Titles Act)으로 국호가 "그레이트브리튼 및 북아일랜드 연합왕국"으로 정식 변경되었다. ` +
      `제2차 세계대전의 주요 승전국이자 유엔 안전보장이사회 상임이사국으로서 전후 국제질서를 이끌었으나, ` +
      `20세기 중반 이후 인도를 비롯한 방대한 제국이 차례로 독립하며 세계 제국의 시대는 막을 내렸다. ` +
      `1973년 유럽경제공동체(EEC)에 가입했다가 2016년 국민투표를 거쳐 2020년 유럽연합을 탈퇴(브렉시트)했다. ` +
      `오늘날 런던을 수도로 하는 입헌군주국이자 의회민주주의 국가로 존속하고 있다.`,
    startEra: 'AD', startYear: 1922, startMonth: 12,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 51.5074, longitude: -0.1278,
    linkToBritain: true,
  },

  // ── 공위기(공화정) ────────────────────────────────────────────────
  {
    name: '잉글랜드 연방',
    enName: 'Commonwealth of England',
    nameOrigin:
      `'커먼웰스(Commonwealth)'는 '공동의 복리(common weal)', 곧 공동체 전체의 이익을 위한 정치체를 뜻하는 말로, ` +
      `라틴어 '레스 푸블리카(res publica, 공화국)'를 영어로 옮긴 표현이다. 군주 개인이 아니라 공동체를 위한 통치를 ` +
      `표방한다는 의미에서, 1649년 군주정을 폐지한 뒤 새로 세워진 공화정의 국호로 채택되었다.`,
    description:
      `1642년부터 이어진 잉글랜드 내전에서 의회파가 승리한 뒤, 1649년 1월 찰스 1세를 처형하고 군주정과 상원을 폐지하면서 ` +
      `5월 잔부의회(Rump Parliament)가 잉글랜드를 '자유국가·공화국(Commonwealth and Free State)'으로 선포하며 성립한, ` +
      `잉글랜드 역사상 유일한 공화정 체제다. 초기에는 의회가 최고 권력을 쥐었으나, 올리버 크롬웰이 이끄는 신형군(New Model Army)이 ` +
      `스코틀랜드와 아일랜드를 무력으로 정복하여 세 나라를 하나의 통치 아래 통합했다. 1653년 크롬웰이 잔부의회를 해산하고 ` +
      `《통치장전(Instrument of Government)》에 따라 호국경(Lord Protector)에 취임하면서, 사실상 군사적 성격을 띤 호국경 체제로 전환되었다. ` +
      `1658년 크롬웰이 사망하고 아들 리처드 크롬웰이 뒤를 이었으나 군부의 지지를 잃고 이듬해 물러났으며, 정치적 혼란 속에 ` +
      `조지 몽크 장군이 주도하여 1660년 찰스 2세를 맞아들이는 왕정복고가 이루어져 공화정은 막을 내렸다. ` +
      `이로써 잉글랜드는 다시 잉글랜드 왕국의 군주정으로 복귀했다.`,
    startEra: 'AD', startYear: 1649, startMonth: 5,
    endEra: 'AD', endYear: 1660, endMonth: 5,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.REGIME,
    latitude: 51.5074, longitude: -0.1278,
    linkToBritain: true,
  },

  // ── 앵글로색슨 7왕국(누락분 보완: 서식스·에식스) ──────────────────
  {
    name: '서식스 왕국',
    enName: 'Kingdom of Sussex',
    nameOrigin:
      `'남색슨족(South Saxons)의 땅'이라는 뜻으로, 고대 영어 '수드세악세(Sūþsēaxe)'에서 유래했다. ` +
      `5세기 브리튼 섬 남부 해안에 정착한 색슨계 이주민을 동색슨(에식스)·서색슨(웨식스)과 구분해 '남(南)색슨'이라 부른 데서 비롯했으며, ` +
      `이 명칭이 오늘날의 지명 서식스(Sussex)로 이어졌다.`,
    description:
      `『앵글로색슨 연대기』에 따르면 477년 엘레(Ælle)가 세 아들과 함께 키메노어에 상륙해 원주민 브리튼인을 몰아내며 세웠다고 전하는 ` +
      `남색슨족의 왕국으로, 앵글로색슨 7왕국(헵타키) 가운데 하나다. 시조 엘레는 8세기 비드가 남부 잉글랜드 여러 왕국에 대한 ` +
      `패권을 쥔 첫 왕(브레트왈다)으로 꼽은 인물이나, 이후 서식스는 좁은 해안 지대에 갇혀 강성한 이웃에 눌렸다. ` +
      `681년경 성 윌프리드의 선교로 기독교화되었고(정식 셀지 주교좌는 8세기 초에 확립됨), 686년 웨식스의 케드왈라에게 정복당하는 등 ` +
      `점차 독립을 잃었으며 8세기에는 머시아 왕 애설볼드·오파의 종주권 아래 사실상 속국이 되었다. 825년경 엘런던 전투로 ` +
      `웨식스의 에그버트가 머시아를 꺾자 서식스도 웨식스에 복속해 827년경 그 일부로 흡수되었다. 이후 웨식스를 중심으로 ` +
      `통일된 잉글랜드 왕국의 한 지방(주)으로 편입되어, 오늘날에는 잉글랜드 남부의 지명으로만 남아 있다.`,
    startEra: 'AD', startYear: 477,
    endEra: 'AD', endYear: 827,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 50.8365, longitude: -0.7792,
    linkToBritain: true,
  },
  {
    name: '에식스 왕국',
    enName: 'Kingdom of Essex',
    nameOrigin:
      `에식스(Essex)는 고대 영어 "이스트 세아세(Ēast Seaxe)", 곧 "동쪽 색슨족(East Saxons)"에서 유래한 이름으로, ` +
      `5~6세기 브리튼 섬 동남부에 정착한 게르만계 색슨족의 동쪽 갈래를 가리킨다. 이는 남쪽의 서식스(Sussex, 남색슨)·서쪽의 ` +
      `웨식스(Wessex, 서색슨)와 짝을 이루는 방위 기반 부족명이다. 라틴 문헌에는 "레그눔 오리엔탈리움 삭소눔(Regnum Orientalium Saxonum, ` +
      `동색슨족의 왕국)"으로 기록되었다.`,
    description:
      `5세기 말~6세기 초 브리튼 섬 동남부에 정착한 색슨족이 세운 앵글로색슨 7왕국(헵타키) 중 하나로, 전승상 527년경 ` +
      `애스크와인(Æscwine)이 건국했다고 전한다. 에식스·미들섹스와 하트퍼드셔 일부를 관할했으며, 로마의 옛 도시 런던(론디니움)을 ` +
      `초기 영역에 두어 604년 사이버트(Sæberht) 왕 때 멜리투스가 런던 주교로 서임되며 기독교를 받아들였으나, 왕의 사후 이교로 회귀하기도 했다. ` +
      `8세기에는 머시아의 패권 아래 런던을 상실하고 그에 종속되었고, 825년 엘런던(엘렌던) 전투로 머시아가 웨식스에 패한 뒤 ` +
      `에식스도 웨식스에 흡수되었다. 이후 데인로(Danelaw)의 일부가 되었다가 재정복되어, 통일 잉글랜드 왕국의 한 지방(에식스 주)으로 이어졌다.`,
    startEra: 'AD', startYear: 527,
    endEra: 'AD', endYear: 825,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 51.735, longitude: 0.469,
    linkToBritain: true,
  },

  // ── 식민 제국 ─────────────────────────────────────────────────────
  {
    name: '대영제국',
    enName: 'British Empire',
    nameOrigin:
      `'British'는 로마인이 브리튼 섬을 부른 '브리타니아(Britannia)'에서 왔고, 그 궁극적 뿌리는 섬의 켈트계 원주민 브리튼인(Britons)이다. ` +
      `'대영제국(British Empire)'이라는 표현은 엘리자베스 1세의 자문가 존 디(John Dee)가 1570~1580년대에 잉글랜드의 해외 팽창을 ` +
      `정당화하며 처음 사용한 것으로 전해진다. 1707년 잉글랜드와 스코틀랜드가 그레이트브리튼으로 합방한 뒤 '브리티시(British)'는 ` +
      `두 왕국을 아우르는 정식 국호가 되었다.`,
    description:
      `16세기 후반 엘리자베스 1세 치세에 잉글랜드가 대서양 무역과 사략선, 1583년 험프리 길버트의 뉴펀들랜드 영유·1607년 제임스타운 건설 등을 ` +
      `통해 해외로 진출하면서 그 씨앗이 뿌려졌다. 1707년 잉글랜드-스코틀랜드 합방으로 '대영제국'이라는 이름을 얻은 뒤 ` +
      `7년 전쟁(1756~1763)과 인도 지배, 오세아니아·아프리카 진출로 팽창했고, 1783년 아메리카 식민지(미국) 상실이라는 큰 좌절도 겪었다. ` +
      `빅토리아 여왕 치세(1837~1901)에 절정에 달해 '해가 지지 않는 제국'으로 불리며 전 지구 육지의 약 4분의 1과 인구 4억 이상을 ` +
      `아우르는 사상 최대 규모의 제국이 되었다. 그러나 두 차례 세계대전으로 국력이 소진되었고, 1931년 웨스트민스터 헌장으로 ` +
      `자치령이 사실상 독립했으며 1947년 인도·파키스탄 분리 독립을 시작으로 20세기 탈식민화가 가속되었다. ` +
      `1997년 7월 홍콩을 중국에 반환하며 제국 시대는 상징적으로 막을 내렸고, 옛 식민지들은 오늘날 영연방(Commonwealth of Nations)으로 ` +
      `느슨하게 결속해 있다.`,
    startEra: 'AD', startYear: 1583,
    endEra: 'AD', endYear: 1997, endMonth: 7,
    stateType: HistoricalStateType.EMPIRE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 51.507, longitude: -0.128,
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
