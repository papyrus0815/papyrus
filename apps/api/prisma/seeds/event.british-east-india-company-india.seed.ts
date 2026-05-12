/**
 * 영국 동인도회사의 인도 진출 (1600 ~ 1757) 시드
 *
 * 부모 사건: 영국 동인도회사의 인도 진출 (1600-12-31 ~ 1757-06-23)
 * 자식 사건:
 *   - 영국 동인도회사 헌장 발급 (1600-12-31) — 엘리자베스 1세 칙허
 *   - 수라트 상관 설립 (1613-01-11) — 인도 첫 항구 거점
 *   - 캘커타(콜카타) 설립 (1690-08-24) — 벵골 진출의 발판
 *   - 카르나틱 전쟁 (1746-09-04 ~ 1763-02-10) — 영불 인도 패권 다툼
 *   - 플라시 전투 (1757-06-23) — 벵골 정복·인도 식민화의 결정적 분기
 *
 * 등록 항목:
 *  - 무굴 제국 HistoricalCountry (시드에 없으면 인라인 생성)
 *  - Event x6 (부모 + 자식 5)
 *  - EventSection x3 (배경/진출 과정/영향)
 *  - EventCountryRelation
 *  - 플라시 전투 자식: BelligerentSide x2 + CountryInSide + MilitaryDetailsNorm + Casualties
 */
import {
  EventCountryRole,
  SideLevel,
  ConflictType,
  CombatType,
  ParticipationType,
  HistoricalEntityKind,
  HistoricalStateType,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

const EVENT_CATEGORY_NAME = '정치'
const PLASSEY_CATEGORY_NAME = '전쟁/군사'

interface BelligerentInput {
  code: 'britain' | 'bengal'
  name: string
  level: SideLevel
  commander: string
  forces: string
  description: string
  color: string
  countries: Array<{
    historicalCountryName?: string
    countryName?: string
    role?: string
    forces?: string
    commander?: string
    description?: string
    participation?: ParticipationType
  }>
  casualties: {
    militaryKilled?: string
    militaryWounded?: string
    militaryMissing?: string
    militaryCaptured?: string
    total?: string
  }
}

// ── 부모 사건 본문 ──────────────────────────────────────────────────────────
const PARENT_EVENT_BODY = {
  description:
    '1600년 12월 31일 엘리자베스 1세의 칙허로 설립된 영국 동인도회사(English East India Company, EIC)가 ' +
    '약 157년에 걸쳐 인도 아대륙에 거점을 확장한 끝에 ' +
    '1757년 플라시 전투(Battle of Plassey, 1757-06-23) 승리로 벵골 정복에 성공하고 ' +
    '인도 식민 통치의 토대를 구축한 일련의 과정. ' +
    '(1)상관(factory) 설치 단계(1613 수라트 → 1640 마드라스 → 1668 봄베이 → 1690 캘커타) ' +
    '(2)영불 패권 다툼(1746~1763 카르나틱 전쟁) ' +
    '(3)벵골 정복(1757 플라시) 3단계로 진행되었으며, ' +
    '플라시 전투 후 1765년 무굴 황제로부터 벵골·비하르·오리사의 디와니(diwani, 징세권)를 부여받아 ' +
    '사실상 인도 동부 통치자가 되었다. 이후 약 100년에 걸친 EIC 통치는 ' +
    '1857년 세포이 항쟁을 거쳐 1858년 인도 통치법(Government of India Act)으로 영국 왕실 직할 ' +
    '"인도 제국(British Raj)"으로 전환, 1947년 인도 독립까지 영국령 인도의 골격이 되었다. ' +
    '동시에 EIC가 청에 밀수출한 인도산 아편이 1차 아편전쟁(1839~1842)의 직접 도화선이 되어 ' +
    '동아시아 근대 불평등 조약 체제의 원형을 만든, 19세기 영제국 글로벌 네트워크의 핵심 결절점이었다.',
  location:
    '인도 아대륙 — 수라트(구자라트) · 마드라스(타밀나두) · 봄베이(마하라슈트라) · 캘커타(서벵골) · 플라시(서벵골)',
  background:
    '향신료 무역과 포르투갈·네덜란드의 선점. 16세기 유럽 향신료 무역은 1498년 바스코 다 가마의 캘리컷 도착 이후 ' +
    '약 100년간 포르투갈이 독점, 1500년대 후반 네덜란드(VOC, 1602)가 동남아·인도양 무역망을 잠식하며 양강 구도가 형성되었다. ' +
    '잉글랜드는 후발주자로 지중해 레반트 회사(Levant Company, 1581)를 통한 우회 수입에 의존했으나, ' +
    '1588년 스페인 무적함대 격파 후 대서양·인도양 항해의 군사적 자신감을 얻었다. ' +
    '\n\n' +
    '1600년 칙허와 회사 설립. 1599년 9월 24일 런던 상인 218인이 회동해 동방 무역 합자회사 설립을 결의, ' +
    '엘리자베스 1세에게 청원해 1600년 12월 31일 "동인도와 무역하는 런던 상인 회사(Governor and Company of Merchants of London Trading into the East Indies)"라는 ' +
    '정식 명칭으로 15년 독점 칙허(royal charter)를 부여받았다. 초기 자본금 6만 8,373파운드, ' +
    '주요 출자자는 토머스 스마이드(초대 총재) 등 런던 시민·귀족 218명. 칙허는 희망봉 이동(以東)·마젤란 해협 이서(以西)의 ' +
    '모든 해역 무역 독점, 자체 군대·요새 보유, 외교 협상권을 포함했다. ' +
    '\n\n' +
    '초기 항해(1601~1612)와 인도네시아 우회. 1601년 제임스 랭커스터의 1차 항해(4척, 자카르타·반텐 도착), ' +
    '1604년 헨리 미들턴의 2차 항해를 거쳐 회사는 처음에는 향신료의 주산지인 인도네시아 향신료 제도(말루쿠)를 목표로 했다. ' +
    '그러나 네덜란드 VOC와의 무력 충돌(1623년 암보이나 학살로 영국 상관원 10명 처형)로 인도네시아에서 사실상 추방, ' +
    '인도 본토(면직물·인디고·초석·아편)로 진출 방향을 전환한 것이 결과적으로 18세기 인도 식민화의 시발점이 되었다. ' +
    '\n\n' +
    '무굴 제국과의 첫 외교. 1608년 윌리엄 호킨스가 무굴 황제 자한기르(재위 1605~1627) 궁정에 도착, ' +
    '4년간 체류하며 외교 교섭. 1612년 8월 토머스 베스트가 수라트 인근 스왈리(Swally) 해전에서 ' +
    '포르투갈 함대를 격파한 사건이 결정적 인상을 주어 1613년 1월 11일 자한기르가 EIC에 ' +
    '수라트 상관(factory) 설립과 무역 면허를 정식 승인. 이후 1615년 토머스 로 경(Sir Thomas Roe)이 ' +
    '제임스 1세의 정식 사절로 자한기르 궁정에 부임해 더 광범위한 통상 특권을 확보했다.',
  aftermath:
    '벵골 디와니(1765)와 사실상의 통치자화. 플라시 전투 후 1764년 부크사르 전투(Battle of Buxar)에서 ' +
    'EIC가 무굴 황제 샤 알람 2세·아와드 나와브·벵골 나와브 연합군을 격파, ' +
    '1765년 8월 12일 알라하바드 조약(Treaty of Allahabad)으로 무굴 황제로부터 ' +
    '벵골·비하르·오리사의 디와니(diwani, 토지세 징수권)를 정식 부여받았다. ' +
    '이로써 EIC는 사실상 인도 동부 약 2,000만 인구의 통치·과세·재정 권한을 보유한 ' +
    '"상인 국가(merchant state)"로 변신, 영국 왕실의 명목적 위임 하에 사적 식민 정부를 운영하게 되었다. ' +
    '\n\n' +
    '규제법(1773)과 피트의 인도법(1784). EIC의 무절제한 수탈로 1769~1770년 벵골 대기근(약 1,000만 사망)이 발생, ' +
    '회사 재정도 파탄에 이르자 영국 의회가 개입했다. 1773년 노스 경 "규제법(Regulating Act)"으로 ' +
    '워런 헤이스팅스(Warren Hastings)를 초대 벵골 총독에 임명하고 의회 감독 체제를 도입, ' +
    '1784년 "피트의 인도법(Pitt\'s India Act)"으로 인도 정책을 영국 정부 통제관 위원회(Board of Control)에 종속시켰다. ' +
    '이후 EIC는 영국 왕실·의회의 위탁 통치 기구로 점차 변질되었다. ' +
    '\n\n' +
    '19세기 팽창 — 마이소르·마라타·시크 정복. (1)4차 마이소르 전쟁(1799) 티푸 술탄 전사로 마이소르 합병, ' +
    '(2)3차 마라타 전쟁(1817~1818) 페시와 정권 해체 → 인도 중부·서부 합병, ' +
    '(3)2차 시크 전쟁(1849) 펀잡 합병으로 1850년대까지 인도 아대륙 거의 전체가 EIC 통치 또는 ' +
    '간접 종주(princely state) 체제 하에 편입되었다. ' +
    '\n\n' +
    '세포이 항쟁(1857)과 영국 왕실 직할 전환. 1857년 5월 미라트에서 시작된 세포이(인도인 용병) 항쟁이 ' +
    '북인도 전역으로 확산, 무굴 황제 바하두르 샤 2세가 명목상 지도자로 추대되며 ' +
    '약 14개월에 걸친 대규모 반란으로 발전했다. 영국군의 진압 후 ' +
    '1858년 "인도 통치법(Government of India Act 1858)"으로 EIC가 해체되고 ' +
    '인도 통치권이 영국 왕실에 직접 귀속, 빅토리아 여왕이 1877년 "인도 황제(Empress of India)" 칭호를 정식 사용. ' +
    '"인도 제국(British Raj)" 체제는 1947년 8월 15일 인도·파키스탄 독립까지 약 89년간 지속되었다. ' +
    '\n\n' +
    '아편·차 무역과 동아시아 충격. EIC는 1773년부터 벵골·비하르 양귀비 재배를 독점 관리, ' +
    '가공된 아편을 캘커타 경매로 사상인(country traders)에 판매해 청 연안에 우회 밀수출했다. ' +
    '연간 청 유입량은 1820년 약 4,000상자 → 1838년 약 4만 상자(약 2,400톤)로 폭증, ' +
    '이는 1839년 임칙서의 후먼 폐기 → 1840년 1차 아편전쟁 → 1842년 난징 조약으로 이어져 ' +
    '동아시아 근대 불평등 조약 체제의 원형을 만들었다. ' +
    '인도 진출 → 인도 식민 통치 → 인도산 아편 → 청 시장 강제 개방으로 이어진 ' +
    '"19세기 영제국 글로벌 네트워크"의 핵심 결절점이 바로 EIC의 인도 사업이었다.',
  keywords: [
    '영국 동인도회사',
    'East India Company',
    'EIC',
    '플라시 전투',
    'Battle of Plassey',
    '벵골 정복',
    '디와니',
    '수라트',
    '마드라스',
    '봄베이',
    '캘커타',
    '카르나틱 전쟁',
    '무굴 제국',
    '엘리자베스 1세',
    '자한기르',
    '토머스 로',
    '로버트 클라이브',
    '시라지 웃 다울라',
    '미르 자파르',
    '워런 헤이스팅스',
    '규제법',
    '피트의 인도법',
    '벵골 대기근',
    '세포이 항쟁',
    '인도 제국',
    'British Raj',
    '아편 무역',
    '인디고',
    '면직물',
  ] as any,
  warCost:
    '초기 자본금. 1600년 칙허 시 6만 8,373파운드(현재 가치 약 1,500만 파운드 상당). ' +
    '플라시 전투 직접 비용. EIC 측 동원 약 3,000명·전비 추정 약 25만 파운드. ' +
    '시라지 웃 다울라의 다카 보고에 따른 벵골 측 손실은 측정 불가. ' +
    '카르나틱 전쟁(1746~1763) 누적 비용. 영불 양국 동인도회사·본국 정부 합산 약 1,000만 파운드 이상 추정. ' +
    '장기 수익. 1757~1858년 인도 통치 약 100년간 EIC가 영국 본국으로 송금한 ' +
    '추정 누계 약 5,000만~1억 파운드(인도사학자 우트사 파트나익은 18~20세기 영국의 對인도 ' +
    '"부 유출(drain of wealth)" 누계를 약 45조 달러로 추산). 인도산 면직물·인디고·초석·아편 무역으로 ' +
    '영국 산업혁명의 핵심 자본 축적원이 되었음.',
} as const

// ── 자식 사건 본문 ───────────────────────────────────────────────────────────
const CHILD1_BODY = {
  description:
    '1600년 12월 31일 엘리자베스 1세가 런던 상인 218인이 출자한 합자회사에 ' +
    '"동인도와 무역하는 런던 상인 회사(Governor and Company of Merchants of London Trading into the East Indies)"라는 ' +
    '정식 명칭으로 15년 독점 칙허(royal charter)를 부여한 사건. ' +
    '초기 자본금 6만 8,373파운드, 초대 총재 토머스 스마이드(Sir Thomas Smythe). ' +
    '칙허는 희망봉 이동(以東)·마젤란 해협 이서(以西)의 모든 해역 무역 독점, 자체 군대·요새 보유, ' +
    '외교 협상·체결권을 포함했다. 영국 동인도회사의 출발점이자 약 257년에 걸친 EIC 역사의 시작.',
  location: '런던 — 화이트홀(엘리자베스 1세 궁정) / 머천트 테일러스 홀(상인 회동)',
  background:
    '1599년 9월 24일 런던 상인 218인이 머천트 테일러스 홀에 회동해 동방 무역 합자회사 설립을 결의. ' +
    '주요 동기는 (1)1588년 스페인 무적함대 격파 후 대서양·인도양 항해의 군사적 자신감, ' +
    '(2)네덜란드의 인도양 진출(1599년 후추 가격 8배 인상)에 대한 위기감, ' +
    '(3)지중해 레반트 회사(1581)를 통한 우회 수입의 한계였다. ' +
    '청원서가 1599년 10월 추밀원에 접수되어 약 14개월의 검토를 거쳐 1600년 12월 31일 칙허 발급에 이르렀다.',
  aftermath:
    '1601년 1차 항해. 제임스 랭커스터(James Lancaster) 지휘 하에 4척(레드 드래건·헥터·어센션·수전)이 1601년 2월 출항, ' +
    '1602년 6월 수마트라 아체·자카르타·반텐 도착. 후추 200만 파운드 적재로 귀항, 약 95% 수익률 기록. ' +
    '\n\n' +
    '후속 칙허 갱신. 1609년 제임스 1세, 1661년 찰스 2세(봄베이 양도 동반), ' +
    '1693년 윌리엄 3세, 1813·1833년 의회 갱신을 거쳐 1858년 인도 통치법으로 해체될 때까지 ' +
    '약 257년간 존속.',
  keywords: [
    '영국 동인도회사 설립',
    'East India Company',
    '엘리자베스 1세 칙허',
    '토머스 스마이드',
    '1600년 칙허',
    '런던 상인',
  ] as any,
} as const

const CHILD2_BODY = {
  description:
    '1613년 1월 11일 무굴 황제 자한기르(Jahangir, 재위 1605~1627)가 EIC에 ' +
    '구자라트의 항구 수라트(Surat)에 상관(factory) 설립과 무역 면허를 정식 승인한 사건. ' +
    '인도 아대륙에서 EIC의 첫 번째 상설 거점이며, 이후 약 50년간 EIC 인도 사업의 본부 역할을 했다(1687년 봄베이로 본부 이전). ' +
    '1612년 8월 29일 토머스 베스트(Thomas Best)가 수라트 인근 스왈리(Swally) 해전에서 포르투갈 함대를 격파한 사건이 ' +
    '결정적 인상을 주어 무굴 측의 호의를 끌어낸 것이 직접 계기였다.',
  location: '구자라트 수라트(Surat) — 타프티 강 하구 항구도시',
  background:
    '1608년 윌리엄 호킨스(William Hawkins)가 자한기르 궁정 아그라에 도착해 4년간 체류하며 외교 교섭을 시도했으나, ' +
    '포르투갈의 강력한 견제로 무역 면허 확보에 실패하고 1611년 빈손으로 귀환. ' +
    '\n\n' +
    '1612년 8월 29일~30일 토머스 베스트의 4척(레드 드래건 등) 함대가 수라트 인근 스왈리에서 ' +
    '포르투갈 4척과 교전해 포르투갈 측에 큰 손실을 입히고 격퇴. 무굴 측이 이를 목격하면서 ' +
    '"포르투갈의 인도양 독점이 깨질 수 있다"는 인식이 확산되어 협상이 급진전되었다.',
  aftermath:
    '1615년 토머스 로 사절단. 제임스 1세의 정식 사절로 토머스 로 경(Sir Thomas Roe)이 자한기르 궁정에 부임, ' +
    '1615~1619년 4년에 걸쳐 광범위한 통상 특권(영사관 설치·관세 면제·치외법권 일부)을 확보. ' +
    '\n\n' +
    '거점 확장. 수라트 본부를 기점으로 1632년 마술리파탐(코로만델 해안), 1639년 마드라스(포트 세인트 조지), ' +
    '1668년 봄베이 양도, 1690년 캘커타(포트 윌리엄)로 거점이 차례로 확장.',
  keywords: [
    '수라트 상관',
    '자한기르',
    '토머스 베스트',
    '스왈리 해전',
    '윌리엄 호킨스',
    '토머스 로',
    '무굴 제국',
  ] as any,
} as const

const CHILD3_BODY = {
  description:
    '1690년 8월 24일 잡 차녹(Job Charnock)이 벵골 후글리 강 하구 칼리카타(Kalikata) 인근 ' +
    '수타누티(Sutanuti) 마을에 EIC 상관을 설립하면서 시작된 도시. ' +
    '1696년 포트 윌리엄(Fort William) 축성, 1727년 시 행정권 부여, 1772년 EIC 인도 본부가 ' +
    '봄베이에서 캘커타로 이전하며 (1)영국령 인도의 정치 수도 (2)인도 동부 무역의 중심지 (3) ' +
    '"동방의 런던"이라 불린 식민지 도시로 성장. 1911년 델리로 수도 이전 시까지 약 140년간 인도 제국의 수도였다.',
  location: '벵골 — 후글리 강 하구 칼리카타(현 인도 서벵골주 콜카타)',
  background:
    '벵골 진출의 좌절. EIC는 1633년 벵골 무역을 시작했으나, 1685~1690년 ' +
    '제1차 영국·무굴 전쟁(Anglo-Mughal War)에서 무굴 측에 패배해 후글리에서 추방. ' +
    '잡 차녹이 1690년 후글리 하구의 황무지 칼리카타 일대에 재진입해 새 거점을 건설했다.',
  aftermath:
    '포트 윌리엄 축성(1696). 무굴의 양해 하에 요새화. 1700년 캘커타 포함 ' +
    '벵골 24-Parganas 지역의 자민다리(zamindari, 지주권)를 무굴로부터 매입. ' +
    '\n\n' +
    '블랙 홀 사건(1756-06-20). 벵골 나와브 시라지 웃 다울라(Siraj-ud-Daulah)가 ' +
    'EIC의 무단 요새 강화에 격분해 캘커타 공격, 포트 윌리엄 함락 시 ' +
    '영국인 포로 146명 중 123명이 좁은 감방에서 질식사했다는 기록(영국 측 주장 — 후일 과장 논란). ' +
    '이는 1757년 6월 23일 플라시 전투의 직접 도화선이 되었다. ' +
    '\n\n' +
    '인도 본부 이전(1772). 워런 헤이스팅스가 봄베이에서 캘커타로 EIC 인도 본부를 이전, ' +
    '1773년 규제법 이후 캘커타가 영국령 인도의 사실상 수도가 되었다.',
  keywords: [
    '캘커타 설립',
    '콜카타',
    '잡 차녹',
    '포트 윌리엄',
    '벵골',
    '블랙 홀 사건',
    '시라지 웃 다울라',
  ] as any,
} as const

const CHILD4_BODY = {
  description:
    '1746년 9월 4일 마드라스 함락 ~ 1763년 2월 10일 파리 조약까지 ' +
    '인도 동남부 카르나틱(Carnatic) 지방에서 영국 EIC와 프랑스 동인도회사(CIO, Compagnie des Indes Orientales)가 ' +
    '벌인 3차에 걸친 패권 다툼. 표면적으로는 인도 토후국들의 왕위계승 분쟁에 양 동인도회사가 ' +
    '용병·자금을 제공하는 형태였으나, 실질은 유럽의 오스트리아 계승전쟁(1740~1748)·7년 전쟁(1756~1763)의 ' +
    '인도 전구(戰區)로서 영불 글로벌 패권 다툼의 일부. ' +
    '결과는 영국의 결정적 승리로, 1761년 퐁디셰리(Pondichéry) 함락 후 1763년 파리 조약으로 ' +
    '프랑스의 인도 진출이 사실상 종결되고 영국이 인도 패권을 확립했다.',
  location: '인도 동남부 — 마드라스(체나이) · 퐁디셰리 · 트리치노폴리 · 카르나틱 일대',
  background:
    '1740년 유럽에서 오스트리아 계승전쟁 발발, 1744년 영불 본국 간 선전포고가 인도로 확산. ' +
    '프랑스 측 조제프 프랑수아 뒤플렉스(Joseph François Dupleix, 퐁디셰리 총독)가 ' +
    '인도 토후 정치에 적극 개입하는 새 전략(돈·용병 제공으로 친불 토후 즉위)을 도입.',
  aftermath:
    '1차 카르나틱(1746~1748). 1746-09-04 프랑스가 마드라스 함락. 1748년 엑스라샤펠 조약으로 ' +
    '마드라스 영국 반환, 본국 협상으로 종전. 인도 패권 결판 안 남. ' +
    '\n\n' +
    '2차 카르나틱(1749~1754). 카르나틱 나와브·하이데라바드 니잠의 왕위계승 분쟁에 양국 개입. ' +
    '1751년 로버트 클라이브의 아르콧(Arcot) 방어전 — 단 500명으로 50일 농성에 성공한 사건이 ' +
    '클라이브를 영국의 영웅으로 만들고 영국 측 결정적 승리. 1754년 퐁디셰리 조약으로 종전. ' +
    '\n\n' +
    '3차 카르나틱(1756~1763). 7년 전쟁의 인도 전구. 1758~1759 와데가오 전투, ' +
    '1760-01-22 완디와시 전투에서 영국 측 결정적 승리. 1761-01-15 퐁디셰리 함락. ' +
    '1763-02-10 파리 조약 — 프랑스는 퐁디셰리·찬다나가르 등 5개 거점을 통상 거점으로만 회복하되 ' +
    '요새화·군대 보유 금지. 인도에서 프랑스의 정치적·군사적 영향력은 영구 종결.',
  keywords: [
    '카르나틱 전쟁',
    'Carnatic Wars',
    '뒤플렉스',
    '로버트 클라이브',
    '아르콧 방어전',
    '완디와시 전투',
    '퐁디셰리',
    '파리 조약 1763',
    '7년 전쟁',
  ] as any,
} as const

const CHILD5_BODY = {
  description:
    '1757년 6월 23일 벵골 후글리 강변 플라시(Plassey, 현 팔라시 — 무르시다바드 남쪽 약 50km) 망고 숲에서 ' +
    '로버트 클라이브(Robert Clive) 휘하 EIC군 약 3,000명(영국 정규군 800·세포이 2,200·대포 10문)이 ' +
    '벵골 나와브 시라지 웃 다울라(Siraj-ud-Daulah, 재위 1756~1757) 휘하 ' +
    '약 5만(보병 3.5만·기병 1.5만·대포 53문, 프랑스 포병 50명 포함) 군대를 격파한 전투. ' +
    '교전은 약 8시간(오전 8시~오후 5시)에 걸쳐 진행되었으나, 사실상 사전에 매수된 ' +
    '벵골군 사령관 미르 자파르(Mir Jafar)의 주력 부대가 전투 중 움직이지 않으면서 결정. ' +
    '클라이브 측 사상자 약 65명(전사 22·전상 50)·벵골 측 사상자 약 500명. ' +
    '전투 결과 시라지 웃 다울라가 폐위·살해되고 미르 자파르가 EIC 괴뢰 나와브로 즉위, ' +
    'EIC가 사실상 벵골을 통치하게 된 인도 식민화의 결정적 분기점.',
  location: '벵골 — 후글리 강변 플라시 망고 숲 (현 인도 서벵골주 나디아 지구 팔라시)',
  background:
    '블랙 홀 사건(1756-06-20). 1756년 4월 벵골 나와브에 즉위한 23세의 시라지 웃 다울라가 ' +
    'EIC의 무단 캘커타 요새 강화에 격분해 6월 20일 캘커타를 공격해 함락, ' +
    '포로 146명 중 123명이 좁은 감방에서 질식사했다는 영국 측 기록(블랙 홀 사건). ' +
    '\n\n' +
    '클라이브의 캘커타 탈환(1757-01). 1757년 1월 2일 마드라스에서 출발한 클라이브 부대가 ' +
    '캘커타를 탈환하고 2월 9일 알리나가르 조약(Treaty of Alinagar)으로 EIC 권리 회복. ' +
    '\n\n' +
    '친 EIC 음모. 시라지의 폭정에 불만을 품은 벵골 귀족들(자가트 세트 가문, 미르 자파르, 라이 두를라브 등)이 ' +
    '클라이브와 비밀리에 접촉, "전투에서 미르 자파르 부대가 움직이지 않을 것이며, ' +
    '전투 후 미르 자파르를 새 나와브로 즉위시키되 EIC에 막대한 보상을 지불한다"는 합의 체결. ' +
    '시라지가 1757년 5월 프랑스의 찬다나가르 상관 보호를 시도해 EIC와의 갈등이 격화된 것이 직접 도화선.',
  aftermath:
    '전술적 결과. 6월 23일 새벽 벵골군이 망고 숲을 포위하고 포격 시작. ' +
    '오전 11시경 갑작스러운 호우로 벵골군 화약이 젖었으나(클라이브 측은 방수 처리), ' +
    '벵골 사령관 미르 마단(친 시라지)이 포격 중 전사하면서 진형이 와해. ' +
    '오후 시라지가 미르 자파르에게 추격을 명령했으나 자파르가 거부, ' +
    '시라지는 단독으로 무르시다바드로 도주. 영국군 사상자 약 65명, 벵골 측 약 500명. ' +
    '\n\n' +
    '시라지의 처형과 미르 자파르 즉위. 6월 29일 시라지가 무르시다바드 인근에서 체포, ' +
    '7월 2일 미르 자파르의 아들 미란이 처형. 7월 27일 미르 자파르가 EIC 괴뢰 벵골 나와브로 즉위. ' +
    '미르 자파르는 EIC에 약 230만 파운드(현재 가치 약 30억 파운드 상당)의 보상금 지불, ' +
    '클라이브 개인에게 약 23만 파운드를 사례. ' +
    '\n\n' +
    '부크사르 전투(1764)와 디와니 부여(1765). 1764년 10월 22일 부크사르 전투에서 EIC가 ' +
    '무굴 황제 샤 알람 2세·아와드 나와브·벵골 나와브 미르 카심 연합군을 격파, ' +
    '1765년 8월 12일 알라하바드 조약으로 무굴 황제로부터 벵골·비하르·오리사의 디와니(징세권)를 부여받음. ' +
    'EIC가 사실상 인도 동부의 통치자가 되어 약 100년간의 EIC 통치(1858년 영국 왕실 직할 전환까지)가 시작되었다. ' +
    '\n\n' +
    '역사적 평가. 플라시 전투는 군사사적으로는 소규모 교전(영국 측 사상자 65명)에 불과했으나, ' +
    '결과적으로 인도 식민화의 결정적 분기점으로 평가된다. 인도 사학자들은 "정복이 아닌 매수에 의한 승리"로 평가하며, ' +
    '플라시 전투에서 시작된 EIC의 벵골 수탈이 1769~1770년 벵골 대기근(약 1,000만 사망)의 ' +
    '직접 원인이라는 견해가 지배적이다. 영국 사학에서는 "운과 외교의 절묘한 결합으로 ' +
    '대영제국 인도 지배의 토대를 마련한 사건"으로 기록.',
  keywords: [
    '플라시 전투',
    'Battle of Plassey',
    '로버트 클라이브',
    '시라지 웃 다울라',
    '미르 자파르',
    '블랙 홀 사건',
    '벵골 정복',
    '디와니',
    '부크사르 전투',
  ] as any,
} as const

// ── EventSection 본문 ───────────────────────────────────────────────────────
const SECTIONS: Array<{
  title: string
  content: string
  order: number
  sectionType?: string
}> = [
  {
    order: 1,
    title: '진출 배경',
    sectionType: 'background',
    content: `<p>영국 동인도회사의 인도 진출은 (1)16세기 유럽 향신료 무역 구도의 변동 (2)1588년 스페인 무적함대 격파 후 영국의 대양 진출 자신감 (3)1599~1600년 런던 상인층의 합자회사 결성과 엘리자베스 1세 칙허라는 세 갈래의 구조적 조건이 결합된 결과였다.</p>

<h3>1. 향신료 무역과 포르투갈·네덜란드의 선점</h3>
<ul>
  <li><strong>포르투갈 1세기 독점</strong>: 1498년 바스코 다 가마의 캘리컷 도착 이후 약 100년간 포르투갈이 인도양 향신료 무역을 독점. 고아(1510)·말라카(1511)·호르무즈(1515)에 거점 구축.</li>
  <li><strong>네덜란드의 부상</strong>: 1602년 네덜란드 동인도회사(VOC) 설립, 1605~1620년대 인도네시아 향신료 제도 장악으로 포르투갈을 잠식. 1599년 후추 가격을 8배 인상해 영국 상인을 압박.</li>
  <li><strong>영국의 후발 진입</strong>: 1581년 레반트 회사(Levant Company) 설립으로 지중해 우회 수입에 의존. 1592년 마드레 데 데우스(Madre de Deus, 포르투갈 카라크선) 나포로 동방 무역의 막대한 수익성을 직접 확인.</li>
</ul>

<h3>2. 1588년 무적함대 격파와 군사적 자신감</h3>
<ul>
  <li><strong>스페인 무적함대 격파(1588-08)</strong>: 영국 해군이 칼레 해협에서 스페인 무적함대(아르마다)를 격파, 대서양·인도양 항해의 군사적 자신감을 획득.</li>
  <li><strong>대양 항해 기술의 축적</strong>: 1577~1580 프랜시스 드레이크의 세계 일주, 1591~1594 제임스 랭커스터의 인도양 항해 등 실전 경험 축적.</li>
</ul>

<h3>3. 1599년 회동과 1600년 칙허</h3>
<ul>
  <li><strong>1599-09-24 머천트 테일러스 홀 회동</strong>: 런던 상인 218인이 회동해 동방 무역 합자회사 설립을 결의. 청원서 작성 후 추밀원에 제출.</li>
  <li><strong>1600-12-31 엘리자베스 1세 칙허</strong>: "동인도와 무역하는 런던 상인 회사(Governor and Company of Merchants of London Trading into the East Indies)"라는 정식 명칭으로 15년 독점 칙허 발급. 초기 자본금 6만 8,373파운드, 초대 총재 토머스 스마이드. 칙허 내용은 (1)희망봉~마젤란 해협 사이 모든 해역 무역 독점 (2)자체 군대·요새 보유 (3)외교 협상·체결권 (4)왕실 직할 면허로 의회 통제 외부에 존재.</li>
</ul>

<h3>4. 인도네시아 우회와 인도 본토로의 전환</h3>
<ul>
  <li><strong>1601~1612 초기 항해</strong>: 1601-02 제임스 랭커스터의 1차 항해(4척)로 수마트라·자카르타·반텐 도착. 1604 헨리 미들턴의 2차 항해. 초기 목표는 향신료 주산지인 인도네시아 향신료 제도(말루쿠).</li>
  <li><strong>1623 암보이나 학살</strong>: 네덜란드 VOC가 암본 섬에서 영국 상관원 10명·일본인 용병 9명 등을 처형, 영국이 인도네시아에서 사실상 추방. 결과적으로 EIC가 인도 본토(면직물·인디고·초석·아편)로 진출 방향을 전환한 것이 18세기 인도 식민화의 시발점.</li>
</ul>

<h3>5. 무굴 제국과의 첫 외교 — 자한기르 궁정</h3>
<ul>
  <li><strong>1608 윌리엄 호킨스</strong>: 무굴 황제 자한기르(재위 1605~1627) 궁정 아그라에 도착해 4년간 체류, 외교 교섭. 포르투갈의 견제로 무역 면허 확보 실패.</li>
  <li><strong>1612-08 스왈리 해전</strong>: 토머스 베스트의 4척 함대가 수라트 인근 스왈리에서 포르투갈 4척과 교전해 격퇴. 무굴 측이 목격하면서 협상 급진전.</li>
  <li><strong>1613-01-11 수라트 상관 승인</strong>: 자한기르가 수라트 상관 설립과 무역 면허를 정식 승인. 인도 아대륙에서 EIC의 첫 상설 거점.</li>
  <li><strong>1615~1619 토머스 로 사절단</strong>: 제임스 1세의 정식 사절로 토머스 로 경(Sir Thomas Roe)이 자한기르 궁정에 부임, 광범위한 통상 특권(영사관 설치·관세 면제·치외법권 일부) 확보.</li>
</ul>`,
  },
  {
    order: 2,
    title: '진출 과정 — 상관 설치에서 벵골 정복까지',
    sectionType: 'process',
    content: `<p>EIC의 인도 진출은 약 157년에 걸쳐 (1)상관 설치 단계(1613~1690) (2)영불 패권 다툼(1746~1763) (3)벵골 정복(1757)의 3단계로 진행되었다. 17세기에는 무굴 황제의 면허 하에 평화적 통상 거점을 확장했으나, 18세기 들어 무굴 제국의 약화와 토후국들의 대두로 군사·외교 개입이 본격화되었다.</p>

<h3>1단계 — 상관 설치 (1613 ~ 1690)</h3>
<ol>
  <li><strong>1613-01-11 수라트 상관</strong>: 무굴 황제 자한기르의 승인으로 구자라트 수라트에 첫 상관 설치. 면직물·인디고 무역 거점.</li>
  <li><strong>1632 마술리파탐 상관</strong>: 코로만델 해안(인도 동남부) 진출. 면직물·다이아몬드 무역.</li>
  <li><strong>1639/40 마드라스(Madras, 현 체나이)</strong>: 비자야나가라 후손 토후로부터 토지 매입, 1640-08 포트 세인트 조지(Fort St. George) 축성. EIC의 첫 자체 요새화 도시.</li>
  <li><strong>1668 봄베이(Bombay) 양도</strong>: 1661년 찰스 2세의 결혼(포르투갈 캐서린 공주) 지참금으로 영국 왕실에 양도된 봄베이 7개 섬을 1668-03-27 EIC에 임대(연 10파운드). 1687년 EIC 인도 본부가 수라트에서 봄베이로 이전.</li>
  <li><strong>1690-08-24 캘커타(Calcutta) 설립</strong>: 잡 차녹이 후글리 강 하구 칼리카타에 상관 설치. 1696년 포트 윌리엄(Fort William) 축성. 벵골 진출의 발판.</li>
</ol>

<h3>2단계 — 영불 패권 다툼 (1746 ~ 1763)</h3>
<ol start="6">
  <li><strong>1746~1748 1차 카르나틱 전쟁</strong>: 오스트리아 계승전쟁의 인도 전구. 1746-09-04 프랑스가 마드라스 함락, 1748년 엑스라샤펠 조약으로 마드라스 영국 반환.</li>
  <li><strong>1749~1754 2차 카르나틱 전쟁</strong>: 카르나틱 나와브·하이데라바드 니잠 왕위계승 분쟁에 영불 개입. 1751년 로버트 클라이브의 아르콧 방어전(500명으로 50일 농성)으로 영국 측 결정적 승리.</li>
  <li><strong>1756~1763 3차 카르나틱 전쟁</strong>: 7년 전쟁의 인도 전구. 1760-01-22 완디와시 전투에서 에어 쿠트(Eyre Coote)가 프랑스군 격파. 1761-01-15 퐁디셰리 함락. 1763-02-10 파리 조약으로 프랑스의 인도 정치적·군사적 영향력 영구 종결.</li>
</ol>

<h3>3단계 — 벵골 정복 (1756 ~ 1765)</h3>
<ol start="9">
  <li><strong>1756-06-20 블랙 홀 사건</strong>: 23세의 신임 벵골 나와브 시라지 웃 다울라가 EIC의 무단 요새 강화에 격분해 캘커타 함락. 포로 146명 중 123명 질식사(영국 측 주장).</li>
  <li><strong>1757-01-02 캘커타 탈환</strong>: 마드라스에서 출발한 클라이브 부대가 캘커타 탈환. 1757-02-09 알리나가르 조약으로 EIC 권리 회복.</li>
  <li><strong>1757-03-23 찬다나가르 함락</strong>: 클라이브가 프랑스 상관 찬다나가르 점령. 시라지와의 갈등 격화.</li>
  <li><strong>1757-06-23 플라시 전투</strong>: 클라이브 약 3,000명 vs 시라지 약 5만. 사전 매수된 미르 자파르의 주력 부대 미동으로 영국 측 결정적 승리. 시라지 폐위·살해, 미르 자파르가 EIC 괴뢰 나와브 즉위. EIC에 약 230만 파운드 보상금 지불.</li>
  <li><strong>1764-10-22 부크사르 전투</strong>: EIC가 무굴 황제 샤 알람 2세·아와드 나와브·벵골 나와브 미르 카심 연합군 격파. 인도 동부 패권 확정.</li>
  <li><strong>1765-08-12 알라하바드 조약</strong>: 무굴 황제로부터 벵골·비하르·오리사의 디와니(diwani, 토지세 징수권) 부여. EIC가 사실상 인도 동부 약 2,000만 인구의 통치·과세·재정 권한을 보유한 "상인 국가(merchant state)"로 변신.</li>
</ol>

<h3>EIC 인도 진출의 군사·외교적 양상</h3>
<ul>
  <li><strong>세포이(sepoy) 활용</strong>: 인도인 용병을 영국식 훈련·장비로 무장시킨 세포이 부대 운용. 플라시 전투 시 EIC 측 3,000명 중 2,200명이 세포이. 18세기 말까지 EIC군 약 20만 중 약 18만이 세포이.</li>
  <li><strong>토후국 분열 활용</strong>: 무굴 제국 약화(1707년 아우랑제브 사후) 후 인도 토후국들의 왕위계승 분쟁·내부 갈등에 개입해 친 EIC 토후를 즉위시키는 보조 동맹(subsidiary alliance) 시스템 구축.</li>
  <li><strong>이중 정부(dual government, 1765~1772)</strong>: 디와니 부여 후 EIC가 징세권을 보유하되 형식적 행정은 무굴 임명 나와브가 담당하는 이중 정부 체제. 1772년 워런 헤이스팅스가 직할 통치로 전환.</li>
</ul>`,
  },
  {
    order: 3,
    title: '인도 진출의 영향',
    sectionType: 'aftermath',
    content: `<p>EIC의 인도 진출은 (1)영국 본국 — 산업혁명의 자본 축적원 (2)인도 — 19세기 식민지·탈산업화·기근의 시작 (3)동아시아 — 인도산 아편을 통한 청 시장 강제 개방의 도화선이라는 세 갈래의 글로벌 영향을 만들었다.</p>

<h3>1. 인도 — EIC 통치(1757~1858)와 식민지화</h3>
<ul>
  <li><strong>벵골 디와니(1765)와 사실상의 통치자화</strong>: 무굴 황제로부터 벵골·비하르·오리사의 디와니 부여. EIC가 인도 동부 약 2,000만 인구의 통치·과세 주체로 변신.</li>
  <li><strong>벵골 대기근(1769~1770)</strong>: EIC의 무절제한 수탈로 약 1,000만 사망(벵골 인구의 약 1/3). 인도 사학에서는 "EIC 통치 최대 비극"으로 기록.</li>
  <li><strong>탈산업화(deindustrialization)</strong>: 18세기 인도는 세계 최대 면직물 수출국이었으나, 19세기 영국 산업혁명 후 영국 면직물의 인도 역수출로 인도 면직 산업이 붕괴. 1750년 세계 GDP 점유율 약 25%였던 인도가 1900년 약 1.7%로 추락.</li>
  <li><strong>19세기 영토 팽창</strong>: (1)4차 마이소르 전쟁(1799) 티푸 술탄 전사 → 마이소르 합병, (2)3차 마라타 전쟁(1817~1818) → 인도 중부·서부 합병, (3)2차 시크 전쟁(1849) → 펀잡 합병. 1850년대까지 인도 아대륙 거의 전체가 EIC 통치 또는 간접 종주(princely state) 체제 하 편입.</li>
  <li><strong>세포이 항쟁(1857)과 영국 왕실 직할 전환(1858)</strong>: 1857-05 미라트에서 시작된 세포이 항쟁이 북인도로 확산, 무굴 황제 바하두르 샤 2세가 명목 지도자로 추대된 약 14개월의 대규모 반란. 진압 후 1858년 "인도 통치법"으로 EIC 해체, 인도 통치권이 영국 왕실에 직접 귀속. 1877년 빅토리아 여왕이 "인도 황제" 칭호 정식 사용.</li>
  <li><strong>인도 제국(British Raj, 1858~1947)</strong>: 약 89년간 영국 왕실 직할 통치. 1947-08-15 인도·파키스탄 독립으로 종결.</li>
</ul>

<h3>2. 영국 — 산업혁명의 자본 축적과 글로벌 패권</h3>
<ul>
  <li><strong>부 유출(drain of wealth)</strong>: 인도사학자 우트사 파트나익(Utsa Patnaik)은 1765~1938년 영국의 對인도 부 유출 누계를 약 45조 달러(2018년 가치)로 추산. 인도산 면직물·인디고·초석·아편·차 무역 차익이 영국 산업혁명의 핵심 자본 축적원.</li>
  <li><strong>"네이밥(Nabob)" 현상</strong>: 18세기 후반 인도에서 큰 부를 축적해 귀국한 EIC 직원들이 영국 의회·사교계에 진출, 토지 매입·작위 매수로 신흥 귀족층 형성. 워런 헤이스팅스 탄핵재판(1788~1795) 등 정치 쟁점화.</li>
  <li><strong>의회 개입과 EIC 통제</strong>: 1773 "규제법(Regulating Act)"으로 워런 헤이스팅스가 초대 벵골 총독 임명, 1784 "피트의 인도법"으로 정부 통제관 위원회(Board of Control) 설치. EIC가 영국 정부의 위탁 통치 기구로 점차 변질.</li>
</ul>

<h3>3. 동아시아 — 인도산 아편과 1차 아편전쟁(1839~1842)</h3>
<ul>
  <li><strong>아편 무역의 시작(1773)</strong>: EIC가 1773년부터 벵골·비하르 양귀비 재배를 독점 관리, 가공된 아편을 캘커타 경매로 사상인(country traders)에 판매해 청 연안에 우회 밀수출.</li>
  <li><strong>아편 수출 폭증</strong>: 1820년 약 4,000상자 → 1830년 약 1.8만 상자 → 1838년 약 4만 상자(약 2,400톤). 1820년대 對청 아편 수출액이 차 수입액을 상회.</li>
  <li><strong>1차 아편전쟁(1839~1842)</strong>: 1839-06 임칙서의 후먼 폐기 → 1840-04 영국 의회 출병안 가결(271:262) → 1842-08-29 난징 조약. 동아시아 근대 불평등 조약 체제의 원형 형성.</li>
  <li><strong>"19세기 영제국 글로벌 네트워크"</strong>: 인도 진출 → 인도 식민 통치 → 인도산 아편 → 청 시장 강제 개방의 연쇄. EIC의 인도 사업이 19세기 영제국 글로벌 패권의 핵심 결절점이었음을 입증.</li>
</ul>

<h3>4. 사학사적 평가</h3>
<ul>
  <li><strong>인도 사학(민족주의 학파)</strong>: EIC의 인도 진출을 "정복이 아닌 매수에 의한 식민화"로 평가. 플라시 전투 자체는 군사사적으로 소규모(영국 측 사상자 65명)였으나, 결과적으로 인도 식민화의 결정적 분기점이 됨. 1769~1770 벵골 대기근, 19세기 탈산업화, 부 유출 등이 인도의 후진성의 직접 원인.</li>
  <li><strong>영국 사학(휘그 학파)</strong>: "운과 외교의 절묘한 결합으로 대영제국 인도 지배의 토대를 마련한 사건". 19세기 인도 통치는 철도·법제·교육 등 근대화 효과도 있었음을 강조.</li>
  <li><strong>케임브리지 학파(C. A. Bayly 등)</strong>: EIC의 성공이 단순히 군사력이 아니라 무굴 약화 후 "지역 정보 네트워크(intelligence network)"와 인도 토착 상인·은행가(자가트 세트 가문)와의 협력 덕분이었다고 분석.</li>
  <li><strong>탈식민 학파(에드워드 사이드·라나지트 구하)</strong>: EIC의 인도 진출이 만든 "동양"의 표상이 19~20세기 서구 오리엔탈리즘의 토대. 식민지 사료의 비판적 재독해 필요.</li>
</ul>`,
  },
]

// ── 플라시 전투 진영 ─────────────────────────────────────────────────────────
const BRITAIN_SIDE: BelligerentInput = {
  code: 'britain',
  name: '영국 동인도회사 측',
  level: SideLevel.COALITION,
  commander:
    '로버트 클라이브(EIC 군 사령관·중령) / 에어 쿠트(부지휘관) / 미르 자파르(벵골 측 내응자, 명목 지휘관) / 본국 정치 결정: 윌리엄 피트(원로원 수석대신)',
  forces:
    '약 3,000명 — 영국 정규군 800명(39연대 등) + 인도 세포이 2,200명, 야포 10문(6파운드 8문 + 호위포 2문)',
  description:
    'EIC의 캘커타 주재 부대를 핵심으로 한 소규모 원정군. 마드라스에서 1757-01-02 출발한 클라이브 부대가 ' +
    '캘커타 탈환(1757-01) → 알리나가르 조약(2-09) → 찬다나가르 함락(3-23)을 거쳐 ' +
    '6월 22일 플라시 인근 망고 숲에 도착. 군사적 우위는 (1)상비 정규군의 훈련도·기율 ' +
    '(2)영국제 머스킷 소총·야포의 화력·정확도 (3)방수 처리된 화약(우천 시에도 사격 가능) ' +
    '(4)사전 매수된 벵골 측 사령관 미르 자파르의 미동(내응)이었다. ' +
    '실제 군사적 충돌은 약 8시간(오전 8시~오후 5시)에 그쳤고, 영국 측 사상자는 65명에 불과했다.',
  color: '#1d4ed8',
  countries: [
    {
      historicalCountryName: '그레이트브리튼 왕국',
      role: '주도국 / 본국 정치 결정 주체',
      forces: '영국 정규군 약 800명 + EIC 함대·해상 보급',
      commander: '윌리엄 피트(본국) / 로버트 클라이브(현지)',
      description:
        '1707년 잉글랜드·스코틀랜드 합방으로 출범한 그레이트브리튼 왕국 시기. ' +
        '7년 전쟁(1756~1763)이 진행 중이던 시점, 인도 전구의 대 프랑스 견제와 EIC의 벵골 권익 보호가 ' +
        '본국의 명시적 정책이었다. 윌리엄 피트가 인도·북미 전구를 동시에 강조하는 ' +
        '글로벌 전략을 추진, EIC에 대한 본국 지원이 강화된 시기.',
      participation: ParticipationType.LIMITED,
    },
  ],
  casualties: {
    militaryKilled: '전사 약 22명',
    militaryWounded: '전상 약 50명',
    total: '전사·전상 약 72명 (영국 측 정규군·세포이 합산)',
  },
}

const BENGAL_SIDE: BelligerentInput = {
  code: 'bengal',
  name: '벵골 나와브 측',
  level: SideLevel.COUNTRY,
  commander:
    '시라지 웃 다울라(벵골 나와브, 명목 총사령관) / 미르 마단(친 시라지 사령관, 전사) / 모한 랄(친 시라지) / 미르 자파르·라이 두를라브·야르 라티프(EIC에 매수된 사령관들) / 생프레(Sinfray, 프랑스 포병 50명 지휘)',
  forces:
    '약 5만 — 보병 35,000명 + 기병 15,000명 + 대포 53문(인도 토속 + 프랑스 포병 50명 운용 분 포함)',
  description:
    '23세의 신임 벵골 나와브 시라지 웃 다울라가 1757년 6월 동원한 벵골군. 명목 병력은 약 5만으로 ' +
    'EIC군의 약 17배에 달했으나, 실질 전투 가능 부대는 미르 마단·모한 랄 휘하 약 1.2만에 불과했다. ' +
    '나머지 주력(미르 자파르·라이 두를라브·야르 라티프 휘하 약 3.8만)은 사전에 EIC와 ' +
    '비밀 협약을 체결한 상태로, 전투 중 일체 움직이지 않는다는 합의를 이행했다. ' +
    '시라지의 폭정(즉위 직후 일족 숙청·자가트 세트 등 대상인 모욕)에 대한 벵골 귀족·상인층의 ' +
    '깊은 반감, 무굴 제국 중앙의 약화로 외부 견제 부재, 시라지 본인의 군사적 무경험 ' +
    '(즉위 14개월의 청년 군주)이 결합된 구조적 취약성이 결정적 패인.',
  color: '#b91c1c',
  countries: [
    {
      historicalCountryName: '무굴 제국',
      role: '주(主) 적국 / 영토 침해 피해국 (명목상 종주국)',
      forces: '벵골 나와브 직속군 약 5만 + 프랑스 포병 50명 (생프레 지휘)',
      commander: '시라지 웃 다울라 (벵골 나와브, 무굴 제국 명목 신하)',
      description:
        '1707년 아우랑제브 사후 무굴 제국 중앙 권력은 사실상 약화되어 ' +
        '벵골 나와브가 자치권을 행사하는 상태였다. 시라지 웃 다울라는 1756-04 즉위 직후 ' +
        'EIC의 무단 캘커타 요새 강화에 격분해 6-20 캘커타 공격 → 블랙 홀 사건. ' +
        '플라시 전투 패배 후 시라지 폐위·살해, 미르 자파르가 EIC 괴뢰 나와브로 즉위. ' +
        '1764 부크사르 전투에서 무굴 황제 샤 알람 2세까지 패배 → 1765 알라하바드 조약으로 ' +
        '벵골·비하르·오리사 디와니가 EIC에 부여되며 무굴의 인도 동부 종주권이 사실상 종결.',
      participation: ParticipationType.FULL,
    },
  ],
  casualties: {
    militaryKilled: '전사 약 500명 (포격·사격에 의한 직접 사상자 + 미르 마단 전사)',
    militaryWounded: '미상 (사료 미비)',
    total: '전사·전상 약 500명 (영국 측 보고). 패주 후 추격 사상자 별도 추정',
  },
}

export async function seedBritishEastIndiaCompanyIndia(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🏛️  영국 동인도회사의 인도 진출(1600-1757) 시딩 시작...')

  // ── 사전 의존성 조회 ───────────────────────────────────────────────────
  const admin = await prisma.account.findUnique({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  ⚠️  admin 계정이 없어 시딩을 건너뜀 (먼저 admin.seed 실행 필요)')
    return
  }

  const politicsCategory = await prisma.eventCategory.findFirst({
    where: { name: EVENT_CATEGORY_NAME },
    select: { id: true },
  })
  if (!politicsCategory) {
    console.warn(`  ⚠️  사건 카테고리 '${EVENT_CATEGORY_NAME}' 미존재 — 시딩 중단`)
    return
  }

  const warCategory = await prisma.eventCategory.findFirst({
    where: { name: PLASSEY_CATEGORY_NAME },
    select: { id: true },
  })
  if (!warCategory) {
    console.warn(`  ⚠️  사건 카테고리 '${PLASSEY_CATEGORY_NAME}' 미존재 — 시딩 중단`)
    return
  }

  const englandHC = await prisma.historicalCountry.findFirst({
    where: { name: '잉글랜드 왕국' },
    select: { id: true },
  })
  const britainHC = await prisma.historicalCountry.findFirst({
    where: { name: '그레이트브리튼 왕국' },
    select: { id: true },
  })
  if (!englandHC || !britainHC) {
    console.warn('  ⚠️  영국 역사 국가 미존재 — 시딩 중단 (먼저 historicalCountry.britain.seed 실행)')
    return
  }

  // ── 0) 무굴 제국 HistoricalCountry 인라인 생성 ────────────────────────
  let mughalHC = await prisma.historicalCountry.findFirst({
    where: { name: '무굴 제국' },
    select: { id: true },
  })
  if (!mughalHC) {
    const created = await prisma.historicalCountry.create({
      data: {
        name: '무굴 제국',
        enName: 'Mughal Empire',
        description:
          '1526년 바부르(Babur)가 1차 파니파트 전투에서 델리 술탄국을 격파하고 수립한 인도 아대륙의 이슬람 제국. ' +
          '악바르(재위 1556~1605)·자한기르·샤 자한·아우랑제브 시기에 인도 아대륙 대부분을 통일하며 전성기를 누렸다. ' +
          '1707년 아우랑제브 사후 중앙 권력 약화로 토후국 분립이 가속, ' +
          '1764년 부크사르 전투 패배 → 1765년 EIC에 디와니 부여로 사실상 인도 동부 종주권을 상실. ' +
          '1857년 세포이 항쟁 후 마지막 황제 바하두르 샤 2세가 폐위·유배되며 1858년 정식 멸망.',
        startEra: 'AD' as any,
        startYear: 1526,
        endEra: 'AD' as any,
        endYear: 1858,
        stateType: HistoricalStateType.EMPIRE,
        entityKind: HistoricalEntityKind.STATE,
        latitude: 28.6139, longitude: 77.209, // 델리
        accountId: admin.id,
      },
    })
    mughalHC = { id: created.id }
    console.log(`  ✅ 역사 국가 생성: 무굴 제국 (id=${created.id})`)

    // 현대 인도와 연결
    const modernIndia = await prisma.country.findFirst({
      where: { isoCode: 'IN' },
      select: { id: true },
    })
    if (modernIndia) {
      const linkExists = await prisma.historicalCountryModernCountry.findFirst({
        where: { historicalCountryId: mughalHC.id, modernCountryId: modernIndia.id },
      })
      if (!linkExists) {
        await prisma.historicalCountryModernCountry.create({
          data: { historicalCountryId: mughalHC.id, modernCountryId: modernIndia.id },
        })
        console.log(`    🔗 현대 인도(IN) 연결`)
      }
    }
  } else {
    console.log(`  ⏭️  역사 국가 이미 존재: 무굴 제국`)
  }

  // ── 1) 부모 사건 등록 ──────────────────────────────────────────────────
  const TITLE = '영국 동인도회사의 인도 진출'

  let parentEvent = await prisma.event.findFirst({
    where: {
      title: TITLE,
      startDate: new Date('1600-12-31'),
      deletedAt: null,
    },
  })

  if (parentEvent) {
    await prisma.event.update({
      where: { id: parentEvent.id },
      data: PARENT_EVENT_BODY,
    })
    console.log(`  🔄 갱신: ${TITLE} (id=${parentEvent.id})`)
  } else {
    parentEvent = await prisma.event.create({
      data: {
        title: TITLE,
        ...PARENT_EVENT_BODY,
        startDate: new Date('1600-12-31'),
        startDatePrecision: 'day',
        endDate: new Date('1757-06-23'),
        endDatePrecision: 'day',
        categoryId: politicsCategory.id,
        historicalCountryId: mughalHC.id,
        createdById: admin.id,
      },
    })
    console.log(`  ✅ 생성: ${TITLE} (id=${parentEvent.id})`)
  }

  // ── 2) 자식 사건들 ─────────────────────────────────────────────────────
  type ChildSpec = {
    title: string
    body: {
      description: string
      location: string
      background: string
      aftermath: string
      keywords: any
    }
    startDate: string
    endDate: string
    categoryId: string
    historicalCountryId: string
  }
  const children: ChildSpec[] = [
    {
      title: '영국 동인도회사 헌장 발급',
      body: CHILD1_BODY,
      startDate: '1600-12-31',
      endDate: '1600-12-31',
      categoryId: politicsCategory.id,
      historicalCountryId: englandHC.id,
    },
    {
      title: '수라트 상관 설립',
      body: CHILD2_BODY,
      startDate: '1613-01-11',
      endDate: '1613-01-11',
      categoryId: politicsCategory.id,
      historicalCountryId: mughalHC.id,
    },
    {
      title: '캘커타 설립',
      body: CHILD3_BODY,
      startDate: '1690-08-24',
      endDate: '1690-08-24',
      categoryId: politicsCategory.id,
      historicalCountryId: mughalHC.id,
    },
    {
      title: '카르나틱 전쟁',
      body: CHILD4_BODY,
      startDate: '1746-09-04',
      endDate: '1763-02-10',
      categoryId: warCategory.id,
      historicalCountryId: mughalHC.id,
    },
    {
      title: '플라시 전투',
      body: CHILD5_BODY,
      startDate: '1757-06-23',
      endDate: '1757-06-23',
      categoryId: warCategory.id,
      historicalCountryId: mughalHC.id,
    },
  ]

  const childEventMap = new Map<string, { id: string }>()
  for (const c of children) {
    let evt = await prisma.event.findFirst({
      where: {
        title: c.title,
        startDate: new Date(c.startDate),
        parentEventId: parentEvent.id,
        deletedAt: null,
      },
    })
    if (evt) {
      await prisma.event.update({ where: { id: evt.id }, data: c.body })
      console.log(`  🔄 갱신: ${c.title} (id=${evt.id})`)
    } else {
      evt = await prisma.event.create({
        data: {
          title: c.title,
          ...c.body,
          startDate: new Date(c.startDate),
          startDatePrecision: 'day',
          endDate: new Date(c.endDate),
          endDatePrecision: 'day',
          categoryId: c.categoryId,
          historicalCountryId: c.historicalCountryId,
          parentEventId: parentEvent.id,
          createdById: admin.id,
        },
      })
      console.log(`  ✅ 생성: ${c.title} (id=${evt.id})`)
    }
    childEventMap.set(c.title, { id: evt.id })
  }

  // ── 3) EventSection (부모 사건) ────────────────────────────────────────
  for (const section of SECTIONS) {
    const exists = await prisma.eventSection.findFirst({
      where: { eventId: parentEvent.id, title: section.title },
    })
    if (exists) {
      await prisma.eventSection.update({
        where: { id: exists.id },
        data: {
          content: section.content,
          order: section.order,
          sectionType: section.sectionType ?? null,
        },
      })
      console.log(`    🔄 섹션 갱신: ${section.title}`)
      continue
    }
    await prisma.eventSection.create({
      data: {
        eventId: parentEvent.id,
        title: section.title,
        content: section.content,
        order: section.order,
        sectionType: section.sectionType ?? null,
      },
    })
    console.log(`    ✅ 섹션 생성: ${section.title}`)
  }

  // ── 4) EventCountryRelation (부모 사건) ────────────────────────────────
  type RelInput = {
    historicalCountryName?: string
    countryName?: string
    role: EventCountryRole
    roleDescription?: string
  }
  const RELATIONS: RelInput[] = [
    {
      historicalCountryName: '잉글랜드 왕국',
      role: EventCountryRole.INITIATOR,
      roleDescription:
        '주도국 (1600~1707 시기). 1600년 12월 31일 엘리자베스 1세가 EIC에 ' +
        '15년 독점 칙허를 부여하면서 인도 진출이 공식 시작되었다. ' +
        '17세기 동안 수라트(1613)·마드라스(1640)·봄베이(1668)·캘커타(1690) 등 ' +
        '주요 거점이 차례로 설치되었으며, 모두 잉글랜드 왕국 시기의 사업이다. ' +
        '1707년 잉글랜드·스코틀랜드 합방으로 그레이트브리튼 왕국에 정치적 권리·의무 승계.',
    },
    {
      historicalCountryName: '그레이트브리튼 왕국',
      role: EventCountryRole.INITIATOR,
      roleDescription:
        '주도국 (1707~1757 시기). 1707년 합방 후 EIC의 인도 사업을 잉글랜드 왕국으로부터 승계. ' +
        '18세기 카르나틱 전쟁(1746~1763)을 통해 프랑스를 인도에서 축출하고, ' +
        '1757년 플라시 전투 승리로 벵골 정복에 성공. 7년 전쟁(1756~1763) 인도 전구의 핵심 동원 주체.',
    },
    {
      historicalCountryName: '무굴 제국',
      role: EventCountryRole.TARGET,
      roleDescription:
        '대상국 / 영토 침해 피해국. 1613년 자한기르가 EIC에 수라트 상관을 승인하며 시작된 무굴-EIC 관계는 ' +
        '17세기에는 황제의 면허 하 평화적 통상 거점 확장으로 전개되었으나, ' +
        '1707년 아우랑제브 사후 중앙 권력 약화로 18세기 들어 토후국 분립이 가속, ' +
        '1764년 부크사르 전투에서 무굴 황제 샤 알람 2세 패배 → 1765년 디와니 부여로 ' +
        '벵골·비하르·오리사 종주권을 사실상 상실. 1857년 세포이 항쟁 후 1858년 정식 멸망.',
    },
  ]

  for (const rel of RELATIONS) {
    let countryId: string | null = null
    let historicalCountryId: string | null = null

    if (rel.historicalCountryName) {
      const hc = await prisma.historicalCountry.findFirst({
        where: { name: rel.historicalCountryName },
        select: { id: true },
      })
      if (!hc) {
        console.warn(`    ⚠️  역사 국가 미존재: ${rel.historicalCountryName}`)
        continue
      }
      historicalCountryId = hc.id
    } else if (rel.countryName) {
      const c = await prisma.country.findFirst({
        where: { name: rel.countryName },
        select: { id: true },
      })
      if (!c) {
        console.warn(`    ⚠️  현대 국가 미존재: ${rel.countryName}`)
        continue
      }
      countryId = c.id
    }

    const exists = await prisma.eventCountryRelation.findFirst({
      where: {
        eventId: parentEvent.id,
        countryId: countryId ?? undefined,
        historicalCountryId: historicalCountryId ?? undefined,
        role: rel.role,
      },
    })
    if (exists) {
      await prisma.eventCountryRelation.update({
        where: { id: exists.id },
        data: { roleDescription: rel.roleDescription ?? null },
      })
      console.log(`    🔄 국가관계 갱신: ${rel.historicalCountryName ?? rel.countryName}`)
      continue
    }
    await prisma.eventCountryRelation.create({
      data: {
        eventId: parentEvent.id,
        countryId,
        historicalCountryId,
        role: rel.role,
        roleDescription: rel.roleDescription ?? null,
      },
    })
    console.log(`    ✅ 국가관계: ${rel.historicalCountryName ?? rel.countryName} (${rel.role})`)
  }

  // ── 5) 플라시 전투 자식 — BelligerentSide + CountryInSide + 사상자 ────
  const plasseyEvent = childEventMap.get('플라시 전투')
  if (plasseyEvent) {
    for (const side of [BRITAIN_SIDE, BENGAL_SIDE]) {
      let belligerent = await prisma.belligerentSide.findFirst({
        where: { eventId: plasseyEvent.id, name: side.name },
      })

      if (belligerent) {
        belligerent = await prisma.belligerentSide.update({
          where: { id: belligerent.id },
          data: {
            level: side.level,
            commander: side.commander,
            forces: side.forces,
            description: side.description,
            color: side.color,
          },
        })
        console.log(`    🔄 진영 갱신: ${side.name}`)
      } else {
        belligerent = await prisma.belligerentSide.create({
          data: {
            eventId: plasseyEvent.id,
            name: side.name,
            level: side.level,
            commander: side.commander,
            forces: side.forces,
            description: side.description,
            color: side.color,
          },
        })
        console.log(`    ✅ 진영 생성: ${side.name}`)
      }

      for (const c of side.countries) {
        let countryId: string | null = null
        let historicalCountryId: string | null = null

        if (c.historicalCountryName) {
          const hc = await prisma.historicalCountry.findFirst({
            where: { name: c.historicalCountryName },
            select: { id: true },
          })
          if (!hc) {
            console.warn(`      ⚠️  역사 국가 미존재: ${c.historicalCountryName}`)
            continue
          }
          historicalCountryId = hc.id
        } else if (c.countryName) {
          const country = await prisma.country.findFirst({
            where: { name: c.countryName },
            select: { id: true },
          })
          if (!country) {
            console.warn(`      ⚠️  현대 국가 미존재: ${c.countryName}`)
            continue
          }
          countryId = country.id
        }

        const exists = await prisma.countryInSide.findFirst({
          where: {
            sideId: belligerent.id,
            countryId: countryId ?? undefined,
            historicalCountryId: historicalCountryId ?? undefined,
          },
        })
        if (exists) {
          await prisma.countryInSide.update({
            where: { id: exists.id },
            data: {
              commander: c.commander ?? null,
              forces: c.forces ?? null,
              role: c.role ?? null,
              description: c.description ?? null,
              participation: c.participation ?? ParticipationType.FULL,
            },
          })
          console.log(`      🔄 진영국가 갱신: ${c.historicalCountryName ?? c.countryName}`)
          continue
        }
        await prisma.countryInSide.create({
          data: {
            sideId: belligerent.id,
            countryId,
            historicalCountryId,
            commander: c.commander ?? null,
            forces: c.forces ?? null,
            role: c.role ?? null,
            description: c.description ?? null,
            participation: c.participation ?? ParticipationType.FULL,
            joinDate: new Date('1757-06-23'),
          },
        })
        console.log(`      ✅ 진영국가: ${c.historicalCountryName ?? c.countryName}`)
      }

      // 사상자
      const casualtiesExists = await prisma.casualtiesData.findFirst({
        where: { eventId: plasseyEvent.id, sideId: belligerent.id },
      })
      if (casualtiesExists) {
        await prisma.casualtiesData.update({
          where: { id: casualtiesExists.id },
          data: {
            sideName: side.name,
            militaryKilled: side.casualties.militaryKilled ?? null,
            militaryWounded: side.casualties.militaryWounded ?? null,
            militaryMissing: side.casualties.militaryMissing ?? null,
            militaryCaptured: side.casualties.militaryCaptured ?? null,
            total: side.casualties.total ?? null,
          },
        })
        console.log(`    🔄 사상자 갱신: ${side.name}`)
      } else {
        await prisma.casualtiesData.create({
          data: {
            eventId: plasseyEvent.id,
            sideId: belligerent.id,
            sideName: side.name,
            militaryKilled: side.casualties.militaryKilled ?? null,
            militaryWounded: side.casualties.militaryWounded ?? null,
            militaryMissing: side.casualties.militaryMissing ?? null,
            militaryCaptured: side.casualties.militaryCaptured ?? null,
            total: side.casualties.total ?? null,
          },
        })
        console.log(`    ✅ 사상자: ${side.name}`)
      }
    }

    // ── 6) 플라시 전투 — MilitaryDetailsNorm ─────────────────────────────
    const plasseyMilitaryBody = {
      conflictType: ConflictType.BATTLE,
      objective:
        'EIC 측. (1)벵골 나와브 시라지 웃 다울라 폐위와 친 EIC 미르 자파르 즉위 ' +
        '(2)블랙 홀 사건 보복과 캘커타 권익 회복 ' +
        '(3)벵골 무역 독점권 확보와 프랑스 영향력 제거(7년 전쟁 인도 전구 차원) ' +
        '(4)무굴 제국 약화기 인도 동부 패권 장악. ' +
        '벵골 측. (1)EIC의 무단 캘커타 요새 강화 응징 (2)벵골 자치권 보전 ' +
        '(3)EIC 통제 하의 무역 질서 회복. 시라지의 군사적 무경험과 귀족·상인층 반감으로 ' +
        '실질적 군사 전략은 부재했다.',
      tactics:
        'EIC 전술. (1)망고 숲(약 800m × 300m)을 천연 엄폐물로 활용한 방어 진형. ' +
        '(2)영국제 머스킷 소총·6파운드 야포의 화력 우위(평균 사거리·정확도에서 인도 토속 화기를 압도). ' +
        '(3)방수 처리된 화약 — 정오 호우 시 벵골 측 화약이 젖었으나 영국 측은 사격 가능. ' +
        '(4)사전 매수된 미르 자파르 부대(약 3.8만)의 미동을 작전 전제로 전투 계획 수립. ' +
        '(5)정오 이후 미르 마단 전사로 진형이 와해되자 즉시 백병 돌격 전환. ' +
        '\n\n' +
        '벵골 전술. (1)명목 5만의 수적 우세를 활용한 포위·포격. ' +
        '(2)미르 마단·모한 랄 휘하 약 1.2만의 친 시라지 부대만 실제 전투 참여. ' +
        '(3)프랑스 포병 50명(생프레 지휘) 운용으로 화력 일부 보강. ' +
        '(4)호우로 화약이 젖은 후 포격 중단, 무질서한 백병전으로 와해.',
      strategy:
        'EIC 전략. (1)사전 외교적 무력화 — 미르 자파르·라이 두를라브·야르 라티프·자가트 세트 가문 등 ' +
        '벵골 귀족·상인층과 비밀 협약 체결로 적군 주력의 70%를 사실상 무력화. ' +
        '(2)3월 찬다나가르 함락으로 프랑스 측 보급·지원 차단. ' +
        '(3)망고 숲 정면 회전 회피하지 않고 결전 — 클라이브가 6-21 군사회의에서 ' +
        '회의 다수의견(철수)을 거부하고 전진 결정. 사후 "신의 가호"로 평가받은 결정적 도박. ' +
        '\n\n' +
        '벵골 전략의 부재. 시라지가 즉위 14개월의 청년 군주로 군사 경험 전무, ' +
        '귀족·상인층의 반감을 자초한 폭정으로 내응자 발생을 사전 차단하지 못함. ' +
        '플라시 직전 시라지가 미르 자파르를 다시 등용한 것이 결정적 실수 — ' +
        '이미 EIC와 합의된 미르 자파르가 주력 부대를 거느리고 전장에 도착해 미동.',
      outcome:
        'EIC의 결정적 승리. ' +
        '8시간 전투 끝에 시라지 진형 와해, 시라지가 단독으로 무르시다바드로 도주. ' +
        'EIC 사상자 약 65~72명(전사 22·전상 50), 벵골 측 약 500명. ' +
        '6-29 시라지 체포, 7-2 미르 자파르의 아들 미란이 처형. ' +
        '7-27 미르 자파르가 EIC 괴뢰 벵골 나와브 즉위. ' +
        'EIC에 약 230만 파운드 보상금, 클라이브 개인에게 약 23만 파운드 사례. ' +
        '7년 후 부크사르 전투(1764)·1765 알라하바드 조약으로 벵골·비하르·오리사 디와니 부여, ' +
        'EIC가 사실상 인도 동부 통치자로 변신. 인도 식민화의 결정적 분기점.',
      territoryChanges:
        '즉시 변경. 벵골 나와브가 EIC 괴뢰 미르 자파르로 교체. ' +
        '캘커타 인근 24-Parganas의 자민다리(zamindari, 지주권)를 EIC에 양도. ' +
        '\n\n' +
        '파생 변경. 1764 부크사르 전투 → 1765 알라하바드 조약으로 ' +
        '벵골·비하르·오리사(약 60만 km², 인구 약 2,000만)의 디와니(징세권)가 EIC에 부여. ' +
        '\n\n' +
        '장기 변경. 1858년 인도 통치법으로 EIC 해체 후 ' +
        '인도 통치권이 영국 왕실에 직접 귀속, 인도 제국(British Raj) 체제 성립. ' +
        '1947년 인도·파키스탄 독립까지 약 190년에 걸친 영국령 인도의 골격이 플라시 전투에서 시작.',
      treaty:
        '체결 조약. (1)알리나가르 조약(1757-02-09) — 플라시 전투 직전, 캘커타 권익 회복 협정. ' +
        '(2)플라시 전투 전후 EIC-미르 자파르 비밀 협약 — 약 230만 파운드 보상금 + 클라이브 개인 23만 파운드 사례. ' +
        '(3)알라하바드 조약(1765-08-12) — 부크사르 전투 후 무굴 황제 샤 알람 2세가 EIC에 ' +
        '벵골·비하르·오리사 디와니(diwani, 징세권)를 부여. 인도 동부 통치권이 사실상 EIC로 이전.',
      strategicImpact:
        '인도 차원. (1)벵골 정복 → 1769~1770 벵골 대기근(약 1,000만 사망) → 19세기 탈산업화. ' +
        '(2)인도 토착 정치 질서의 결정적 약화 — 이후 마이소르(1799)·마라타(1818)·시크(1849) 정복으로 인도 아대륙 거의 전체가 EIC 통치 또는 간접 종주 체제 편입. ' +
        '(3)1857 세포이 항쟁 → 1858 영국 왕실 직할 전환 → 1947 독립까지의 약 190년 식민 통치 골격 형성. ' +
        '\n\n' +
        '영국 차원. (1)벵골 부 유출 → 산업혁명 자본 축적의 핵심 원천. ' +
        '(2)"네이밥(Nabob)" 현상 — EIC 출신 신흥 귀족층의 영국 정치 진출. ' +
        '(3)1773 규제법·1784 피트의 인도법으로 EIC가 본국 정부의 위탁 통치 기구로 전환. ' +
        '\n\n' +
        '동아시아 차원. (1)EIC가 1773 벵골·비하르 양귀비 재배 독점 → 인도산 아편의 청 밀수출. ' +
        '(2)1820년 4,000상자 → 1838년 4만 상자(2,400톤)로 폭증. ' +
        '(3)1839 임칙서의 후먼 폐기 → 1840 1차 아편전쟁 → 1842 난징 조약. ' +
        '동아시아 근대 불평등 조약 체제의 원형이 플라시 전투에서 이어진 EIC의 인도 통치에서 비롯됨.',
    } as const

    const milExists = await prisma.militaryDetailsNorm.findUnique({
      where: { eventId: plasseyEvent.id },
    })
    if (milExists) {
      await prisma.militaryDetailsNorm.update({
        where: { eventId: plasseyEvent.id },
        data: plasseyMilitaryBody,
      })
      console.log(`    🔄 군사 상세 갱신: 플라시 전투`)
    } else {
      const md = await prisma.militaryDetailsNorm.create({
        data: { eventId: plasseyEvent.id, ...plasseyMilitaryBody },
      })
      await prisma.militaryDetailsCombatType.create({
        data: { militaryDetailsId: md.id, combatType: CombatType.LAND },
      })
      console.log(`    ✅ 군사 상세: 플라시 전투`)
    }
  }

  console.log(`✅ 영국 동인도회사의 인도 진출 시딩 완료\n`)
}
