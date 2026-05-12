/**
 * 2016년 사우디아라비아 비전 2030(Vision 2030) 발표 시드
 *
 * 기존 데이터 보존 모드 — Event/Section/Relation/Person 이미 있으면 갱신하지 않고 스킵한다.
 *
 * 2016년 4월 25일 사우디아라비아 부왕세자(당시) 무함마드 빈 살만(MBS)이
 * 사우디 각료회의 승인 아래 정식 발표한 국가 장기 발전 전략. 약 1980년대 이래
 * 약 30년간 유지된 "석유 의존 + 보수 이슬람 + 종교경찰 통치"의 사우디 국가 모델을
 * 약 14년에 걸쳐 "석유 비의존 + 온건 이슬람 + 관광·엔터테인먼트 개방"으로 전환하는
 * 사실상의 국가 재정의 선언이었다.
 *
 * 발표 직후부터 NEOM·홍해 프로젝트·키디야·디리야 게이트 등 약 1조 달러 규모의
 * 메가프로젝트들이 잇달아 발진했으며, 동시에 2017 여성 운전 허용·2018 영화관 재개관·
 * 2019 남성 보호자 동의 없는 여행 허용 등 사회 개방 조치가 단계적으로 진행되었다.
 * 다만 2018 카쇼기 사건·2024~2025 NEOM 축소 발표 등 그늘진 측면도 누적되었다.
 *
 * 등록 항목:
 *  - Event 1
 *  - EventSection x6 (배경 / 발표 / 핵심 3대 축 / 메가프로젝트 / 약 10년 진행 / TMI)
 *  - EventCountryRelation x1 (사우디아라비아)
 *  - 신규 Person x3: 살만 국왕·무함마드 빈 살만(MBS)·야시르 알 루마이얀
 *  - PersonEvent x3
 */
import { EventCountryRole } from '@prisma/client'

import { PrismaService } from '../prisma.service'

const ACCOUNT_ID = '6af53fe7-d02b-4c42-b86c-f32800897b32'
const EVENT_CATEGORY_NAME = '경제'

// ── 신규 인물 ────────────────────────────────────────────────────────────
type PersonInput = {
  name: string
  surname?: string
  originalName: string
  biography: string
  birthYear: number
  birthMonth: number
  birthDay: number
  deathYear?: number
  deathMonth?: number
  deathDay?: number
  deathCause?: string
  isAlive: boolean
  gender: 'MALE' | 'FEMALE'
  influence: number
}

const NEW_PERSONS: PersonInput[] = [
  {
    name: '살만',
    surname: '빈 압둘아지즈 알 사우드',
    originalName: 'Salman bin Abdulaziz Al Saud',
    biography:
      '사우디아라비아 제7대 국왕(2015-01-23 ~). 1935년 12월 31일 리야드 출생. ' +
      '사우디 건국 국왕 압둘아지즈 이븐 사우드의 25번째 아들이자 ' +
      '제3대 국왕 파이살의 이복 동생. 1963년부터 약 48년간 리야드 주지사를 역임하며 ' +
      '리야드를 사우디 행정·경제 수도로 발전시킨 핵심 인물. ' +
      '\n\n' +
      '2011년 국방장관, 2012년 왕세자에 임명된 후 2015-01-23 압둘라 국왕 사망으로 ' +
      '79세에 국왕 즉위. 즉위 직후 약 3개월 만에 친아들 무함마드 빈 살만(MBS)을 ' +
      '부왕세자 겸 국방장관·경제개발위원회 위원장으로 임명, 사실상 실권을 위임. ' +
      '2017-06 무함마드 빈 나예프를 왕세자에서 폐위하고 친아들 MBS를 왕세자로 승격시키면서 ' +
      '약 1세대 만의 왕위 계승 노선 변경을 단행했다. ' +
      '\n\n' +
      '본 비전 2030 발표 시 81세의 고령으로 본 사업의 공식 승인자였으나 ' +
      '실질 입안·추진은 친아들 MBS가 주도. 발표 후 약 10년 동안 ' +
      '아랍 보수 군주의 상징적 권위로 비전 2030의 정치 정당성을 확보하는 역할. ' +
      '90세를 넘긴 현재까지도 국왕 직위 유지.',
    birthYear: 1935, birthMonth: 12, birthDay: 31,
    isAlive: true,
    gender: 'MALE',
    influence: 80,
  },
  {
    name: '무함마드',
    surname: '빈 살만',
    originalName: 'Mohammed bin Salman',
    biography:
      '사우디아라비아 왕세자(2017-06-21 ~)·총리(2022-09-27 ~). 약칭 MBS. ' +
      '1985년 8월 31일 리야드 출생, 살만 국왕과 세 번째 부인 파흐다 빈트 팔라 알 히틀라인의 장남. ' +
      '킹사우드대학교 법학 졸업, 잠시 부친의 보좌관으로 활동 후 ' +
      '2015-01 부친의 즉위와 동시에 약 29세에 국방장관·경제개발위원회 위원장 임명. ' +
      '\n\n' +
      '2016-04-25 본 비전 2030 발표를 직접 주도하면서 사우디 국가 전략의 사실상 단독 입안자로 부상. ' +
      '2017-06-21 사촌 무함마드 빈 나예프를 왕세자에서 폐위하고 본인이 왕세자 승격, ' +
      '같은 해 11-04 리츠칼튼 호텔 "반부패 조사" 명목으로 약 200명 왕족·기업인 구금으로 ' +
      '권력을 사실상 단일화. 2022-09-27 총리 직위 추가 부여로 ' +
      '왕세자 + 총리 + 국방장관 + PIF 위원장의 4중 직위로 사우디 정치·경제의 단일 결정권자가 되었다. ' +
      '\n\n' +
      '주요 정책: ' +
      '(1)비전 2030 종합 입안·추진 ' +
      '(2)NEOM·홍해 프로젝트 등 메가프로젝트 직접 지휘 ' +
      '(3)2017 여성 운전 허용·2018 영화관 재개관 등 사회 개방 ' +
      '(4)2017 카타르 단교 위기·2019 아람코 IPO·2023 중국 중재 이란 수교 등 외교 ' +
      '(5)2018-10 카쇼기 살해 의혹·2017 리츠칼튼 구금 등 인권 논란 ' +
      '약 10년에 걸친 강권적 개혁 통치로 사우디를 결정적으로 변모시킨 인물.',
    birthYear: 1985, birthMonth: 8, birthDay: 31,
    isAlive: true,
    gender: 'MALE',
    influence: 92,
  },
  {
    name: '야시르',
    surname: '알 루마이얀',
    originalName: 'Yasir Al-Rumayyan',
    biography:
      '사우디 공공투자기금(PIF, Public Investment Fund) 총재(2015-09 ~)· ' +
      '아람코(Saudi Aramco) 회장(2019-09 ~). MBS의 가장 가까운 경제 측근으로 평가되는 인물. ' +
      '\n\n' +
      '1970년경 사우디 동부주 출생, 킹파이살대학교 회계학 졸업 후 ' +
      '미국 하버드대학교 경영자 과정 수료. 약 20년간 사우디 금융권에서 경력 쌓은 후 ' +
      '2015-09 MBS의 임명으로 PIF 총재 취임. ' +
      '\n\n' +
      '본 비전 2030 발표 직후 PIF가 사우디 경제 다각화의 사실상 단독 투자 주체로 부상. ' +
      'PIF 자산을 2016 약 1,500억 달러에서 2024 약 9,250억 달러로 약 6배 확대, ' +
      '2030 목표 약 2조 달러. 주요 투자처로 ' +
      '(1)테슬라(2018 약 50억 달러 투자, 2020 매각) ' +
      '(2)소프트뱅크 비전펀드(약 450억 달러 출자) ' +
      '(3)뉴캐슬 유나이티드 FC(2021 약 4.1억 파운드 인수) ' +
      '(4)LIV 골프 투어(2022 출범, 약 20억 달러 투자) ' +
      '(5)NEOM·홍해 프로젝트 등 국내 메가프로젝트 등이 있다.',
    birthYear: 1970, birthMonth: 1, birthDay: 1,
    isAlive: true,
    gender: 'MALE',
    influence: 70,
  },
]

// ── 사건 본문 ─────────────────────────────────────────────────────────────
const EVENT_BODY = {
  description:
    '2016년 4월 25일 사우디아라비아 부왕세자(당시) 무함마드 빈 살만(이하 MBS)이 ' +
    '리야드 알 야마마 궁전 각료회의에서 정식 발표한 국가 장기 발전 전략 "사우디 비전 2030"(Vision 2030, ' +
    'رؤية المملكة العربية السعودية 2030). 약 1980년대 이래 약 30년간 유지된 ' +
    '"석유 의존 + 보수 이슬람 + 종교경찰 통치"의 사우디 국가 모델을 ' +
    '약 14년에 걸쳐 "석유 비의존 + 온건 이슬람 + 관광·엔터테인먼트 개방"으로 전환하는 ' +
    '사실상의 국가 재정의 선언이었다. ' +
    '\n\n' +
    '핵심 3대 축은 (1)활기찬 사회(A Vibrant Society) ' +
    '(2)번영하는 경제(A Thriving Economy) (3)의욕적인 국가(An Ambitious Nation). ' +
    '주요 정량 목표로 (1)석유 외 수입 비중 16%→50% 확대 ' +
    '(2)민간 부문 GDP 기여도 40%→65% ' +
    '(3)여성 경제활동 참가율 22%→30%(2024년 이미 36% 달성) ' +
    '(4)국부펀드 PIF 자산 약 1,500억→2조 달러 ' +
    '(5)관광객 연간 100만→1억 명 ' +
    '(6)재생에너지 9.5GW 신규 설치 등이 명시되었다. ' +
    '\n\n' +
    '발표 직후 NEOM(약 5,000억 달러 예산의 신도시)·홍해 프로젝트·키디야 엔터테인먼트 시티· ' +
    '디리야 게이트·알울라 등 약 1조 달러 규모의 메가프로젝트들이 잇달아 발진했으며, ' +
    '동시에 2017-06 여성 운전 허용·2018-04 영화관 재개관·2019-08 남성 보호자 동의 없는 여행 허용 등 ' +
    '사회 개방 조치가 단계적으로 진행되었다. ' +
    '\n\n' +
    '본 발표는 단순한 경제 계획서가 아니라 ' +
    '"사우디라는 국가의 정체성을 약 30년 만에 재정의하는 정치적 선언"이라는 평가가 일반적이다. ' +
    'MBS 본인이 2017 왕세자 승격·2022 총리 직 추가 부여로 권력을 단일화하면서 ' +
    '본 비전이 MBS의 개인 권위와 결정적으로 결합되었으며, ' +
    '약 10년 후 2026년 시점 일부 목표(여성 참여·관광·NEOM 구상)는 달성·진전을 이룬 반면 ' +
    '일부(NEOM "더 라인" 축소·메가프로젝트 비용 초과·인권 논란)는 지속적 비판의 대상이 되었다.',
  location:
    '사우디아라비아 수도 리야드 — 알 야마마 궁전(Al-Yamamah Palace) 각료회의장. ' +
    '발표 당일 동 궁전에서 살만 국왕 주재 각료회의 개최, MBS가 직접 약 1시간 프레젠테이션.',
  background:
    '사우디 경제의 석유 의존 구조 — 1938년 다란 유전 발견 이래 약 80년간 사우디 경제는 ' +
    '석유 수입에 약 75~90% 의존하는 단일 자원 경제로 유지되어 왔다. ' +
    '1973 오일쇼크 후 약 1조 달러의 누적 석유 수입으로 ' +
    '"석유 복지 국가(petro-welfare state)" 모델 — 무세금·무료 의료·무료 교육·정부 일자리 보장 — ' +
    '이 정착되었다. 그러나 2014-2016 유가 폭락(배럴당 약 110달러→약 30달러)으로 ' +
    '약 2년간 약 3,000억 달러의 외환보유고 감소가 발생, ' +
    '석유 의존 모델의 결정적 한계가 노출되었다. ' +
    '\n\n' +
    '인구 구조의 압박 — 2016년 시점 사우디 인구 약 3,200만 명 중 약 60%가 30세 미만의 청년층. ' +
    '연 약 30만 명의 청년이 노동시장에 진입하나 정부 일자리가 한계에 도달, ' +
    '청년 실업률이 약 30%로 급등. 사회 안정의 결정적 위협 요인. ' +
    '\n\n' +
    'MBS의 부상과 정치 권력 통합 — 2015-01-23 살만 국왕 즉위 후 약 3개월 만에 ' +
    '친아들 MBS가 부왕세자·국방장관·경제개발위원회 위원장으로 임명. ' +
    '약 29세의 MBS가 국가 결정권을 사실상 위임받으면서 ' +
    '본 비전 2030이 MBS의 개인 권위와 직결된 사업으로 추진되었다. ' +
    '\n\n' +
    '맥킨지 컨설팅의 결정적 기여 — 본 비전의 입안 과정에서 ' +
    '맥킨지(McKinsey & Company)가 약 18개월간 사우디 정부에 상주 컨설팅을 제공. ' +
    '비전 문서의 약 80%가 맥킨지 컨설턴트들의 작업으로 알려져 있으며, ' +
    '이로 인해 "맥킨지 정부(McKinsey government)"라는 별칭도 부상했다. ' +
    '\n\n' +
    '동시기 GCC 국가들의 유사 비전 — 2008 두바이 비전 2030·2010 카타르 국가비전 2030· ' +
    '2010 아부다비 경제비전 2030 등 동시기 GCC 산유국들이 모두 ' +
    '유사한 "2030 비전" 형태의 장기 국가 전략을 발표. ' +
    '본 사우디 비전 2030이 이 흐름의 마지막이자 가장 큰 규모.',
  aftermath:
    '2016-2019 초기 추진 — 발표 후 약 3년간 (1)2016-06 비전 2030 시행 책임 기구 ' +
    '"전략 기획 부처(Strategy and Management Office)" 신설 ' +
    '(2)2017-10 NEOM 신도시 공식 발표 (3)2018-04 영화관 재개관 ' +
    '(4)2018-06 여성 운전 허용 효력 발효 (5)2019-08 남성 보호자 없는 여행 허용 ' +
    '(6)2019-12 사우디 아람코 IPO(약 256억 달러 조달, 당시 사상 최대) 등 ' +
    '주요 정책이 차례로 실행. ' +
    '\n\n' +
    '2017-11 리츠칼튼 구금과 권력 단일화 — 2017-11-04 ~ 2018-01 약 3개월에 걸쳐 ' +
    'MBS 주도 "반부패 조사" 명목으로 리야드 리츠칼튼 호텔에 약 200명의 ' +
    '왕족·기업인(왈리드 빈 탈랄 왕자 포함)을 구금. 약 1,070억 달러 규모의 ' +
    '자산이 정부에 환수되었다고 발표. 사우디 정치 권력의 결정적 단일화 사건. ' +
    '\n\n' +
    '2018-10-02 카쇼기 살해 — 워싱턴 포스트 칼럼니스트·사우디 반체제 언론인 ' +
    '자말 카쇼기가 이스탄불 사우디 영사관에서 살해. ' +
    '국제 사회의 강력 비난과 함께 MBS와의 직접 연관이 의심됨. ' +
    '본 사건이 비전 2030의 국제 평판에 상당한 손상을 가했으나, ' +
    'MBS의 정치적 입지에는 결정적 영향을 미치지 못함. ' +
    '\n\n' +
    '2020-2022 코로나19 충격과 회복 — 2020-2021 코로나19로 일부 사업 일시 정체, ' +
    '특히 관광 부문 약 80% 감소. 그러나 2022 유가 회복(배럴당 약 100달러)으로 ' +
    '재정 흑자 전환, 2022 사우디 GDP 약 8.7% 성장으로 G20 최고 성장률 기록. ' +
    '\n\n' +
    '2023-09 중국 중재 이란 수교 — 2023-09-15 중국 중재 아래 사우디-이란 외교 정상화. ' +
    '약 7년 단교를 종결시킨 외교 성과로 비전 2030의 "외교적 자립" 측면을 강화. ' +
    '\n\n' +
    '2024 NEOM 축소 — 2024-04 NEOM "더 라인"의 원래 170km 구상에서 ' +
    '2030년까지는 약 2.4km만 완공하는 것으로 축소 발표. ' +
    '메가프로젝트의 현실적 한계가 노출되면서 비전 2030의 ' +
    '"실현 가능성" 측면에 대한 비판이 부상. ' +
    '\n\n' +
    '2024-2026 진행 상황 (2026-05 현재) — 비전 2030 약 10년 시점에서 ' +
    '(1)여성 경제활동 참가율 22%→36% 달성(2030 목표 30% 초과 달성) ' +
    '(2)관광객 연간 1억 명 목표 중 약 1억 명 달성(2024 통계) ' +
    '(3)PIF 자산 약 1,500억→약 9,250억 달러 증가 ' +
    '(4)NEOM "더 라인" 축소·메가프로젝트 비용 초과 등 그늘 ' +
    '(5)아람코 IPO 성공으로 약 256억 달러 조달 등 혼재된 성과. ' +
    '\n\n' +
    '국제 비교 — 동시기 GCC 국가들의 "2030 비전" 중 ' +
    '사우디 비전 2030이 (1)규모(GDP 약 1조 달러·인구 약 3,200만) ' +
    '(2)야망(석유 비의존 국가 전환) (3)정치적 강도(MBS 개인 권위와 결합)에서 ' +
    '단연 가장 야심적인 사례. 다만 동시에 (4)실현 가능성·인권·내부 통합성 측면에서도 ' +
    '가장 논란이 많은 사례.',
  keywords: [
    '사우디 비전 2030',
    'Saudi Vision 2030',
    'رؤية 2030',
    '2016-04-25',
    '무함마드 빈 살만',
    'MBS',
    '살만 국왕',
    'NEOM',
    '네옴',
    '더 라인',
    'The Line',
    '키디야',
    '홍해 프로젝트',
    'PIF',
    '공공투자기금',
    '야시르 알 루마이얀',
    '아람코 IPO',
    '맥킨지 정부',
    '여성 운전 허용',
    '카쇼기',
    '리츠칼튼 구금',
    '석유 비의존',
  ] as any,
} as const

// ── EventSection ──────────────────────────────────────────────────────────
const SECTIONS: Array<{
  title: string
  content: string
  order: number
  sectionType?: string
}> = [
  {
    order: 1,
    title: '배경 — 석유 의존 구조의 한계와 MBS의 부상',
    sectionType: 'background',
    content: `<p>본 사업은 (1)사우디 경제의 약 80년 석유 의존 구조의 한계 (2)2014-2016 유가 폭락으로 인한 외환위기 (3)청년 인구의 노동시장 압박 (4)MBS의 정치 권력 부상 (5)맥킨지 컨설팅의 입안 지원이 결합한 결과였다.</p>

<h3>1. 사우디 경제의 약 80년 석유 의존 구조</h3>
<ul>
  <li><strong>1938 다란 유전 발견</strong>: 미국 회사 SOCAL(현 셰브론)이 다란에서 첫 원유 발견. 1948 본격 생산 개시.</li>
  <li><strong>1973 오일쇼크와 가격 폭등</strong>: 4차 중동전쟁 이후 OPEC 주도 유가 4배 폭등. 사우디에 약 1조 달러 누적 석유 수입 유입.</li>
  <li><strong>"석유 복지 국가" 모델</strong>: 무세금·무료 의료·무료 교육·정부 일자리 보장이 정착. 사회 안정의 핵심 메커니즘.</li>
  <li><strong>약 75~90% 석유 의존</strong>: 정부 재정 수입의 약 75~90%가 석유. 수출의 약 90%가 석유. 단일 자원 의존 경제의 표준 사례.</li>
</ul>

<h3>2. 2014-2016 유가 폭락 충격</h3>
<ul>
  <li><strong>2014-06 → 2016-01 약 75% 폭락</strong>: 배럴당 약 110달러에서 약 28달러로 약 1년 6개월 만에 75% 폭락. 미국 셰일 가스 혁명·OPEC 내부 갈등이 원인.</li>
  <li><strong>약 3,000억 달러 외환보유고 감소</strong>: 2014-12 약 7,460억 달러였던 사우디 외환보유고가 2016-04 약 5,170억 달러로 약 30% 감소.</li>
  <li><strong>2015-12 첫 재정 적자</strong>: 사우디 정부가 약 990억 달러의 재정 적자 기록. 약 30년 만의 큰 적자.</li>
  <li><strong>"포스트 석유 시대" 인식</strong>: 본 충격으로 사우디 정부 내에서 "석유에 의존할 수 있는 시간이 더 이상 무한하지 않다"는 인식이 정착.</li>
</ul>

<h3>3. 인구 구조의 압박</h3>
<ul>
  <li><strong>2016 사우디 인구 약 3,200만</strong>: 약 30세 미만 청년층이 약 60%. 매년 약 30만 명이 노동시장에 신규 진입.</li>
  <li><strong>청년 실업률 약 30%</strong>: 정부 일자리(약 70% 차지)가 한계 도달. 민간 부문 일자리 창출 없이는 사회 불안의 위협.</li>
  <li><strong>여성 경제활동 참가율 약 22%</strong>: 동시기 GCC 평균(약 30%)·세계 평균(약 50%) 대비 매우 낮음. 약 절반의 노동력이 활용되지 않는 비효율.</li>
</ul>

<h3>4. MBS의 부상과 정치 권력 통합</h3>
<ul>
  <li><strong>2015-01-23 살만 국왕 즉위</strong>: 압둘라 국왕(재위 2005-2015) 사망 후 살만이 79세에 즉위.</li>
  <li><strong>2015-04 MBS 부왕세자 임명</strong>: 약 3개월 만에 친아들 MBS가 부왕세자·국방장관·경제개발위원회 위원장으로 임명. 약 29세의 MBS가 국가 결정권 사실상 위임받음.</li>
  <li><strong>MBS의 권위 부상</strong>: 본 비전 2030이 MBS의 개인 권위와 직결된 사업으로 추진. 비전 성공 = MBS 성공, 실패 = MBS 실패의 정치 등식.</li>
</ul>

<h3>5. 맥킨지 컨설팅의 입안 기여</h3>
<ul>
  <li><strong>약 18개월 상주 컨설팅</strong>: 맥킨지(McKinsey & Company)가 약 18개월간 사우디 정부에 상주 컨설팅 제공.</li>
  <li><strong>비전 문서의 약 80%</strong>: 비전 문서 약 84페이지 중 약 80%가 맥킨지 컨설턴트들의 작업으로 알려짐.</li>
  <li><strong>"맥킨지 정부" 별칭</strong>: 이로 인해 사우디 정치권에서 "맥킨지 정부(McKinsey government)"라는 별칭이 부상. 외국 컨설팅 의존도에 대한 내부 비판이 발생.</li>
</ul>

<h3>6. 동시기 GCC 국가들의 유사 비전</h3>
<ul>
  <li><strong>2008 두바이 비전 2030</strong>: UAE 두바이의 첫 장기 비전. 관광·금융·항공 허브 전환 목표.</li>
  <li><strong>2010 카타르 국가비전 2030</strong>: 카타르의 4대 축(인간 개발·사회·경제·환경) 전략.</li>
  <li><strong>2010 아부다비 경제비전 2030</strong>: 석유 비의존 9대 산업 다각화 전략.</li>
  <li><strong>본 사우디 비전 2030의 위상</strong>: 동시기 GCC "2030 비전" 흐름의 마지막이자 가장 큰 규모. GDP 약 1조 달러·인구 약 3,200만으로 GCC 최대.</li>
</ul>`,
  },
  {
    order: 2,
    title: '2016-04-25 발표 — MBS의 1시간 프레젠테이션',
    sectionType: 'process',
    content: `<p>2016년 4월 25일 오전 리야드 알 야마마 궁전 각료회의에서 살만 국왕 주재 각료회의가 개최, MBS가 약 1시간에 걸쳐 비전 2030의 핵심 내용을 직접 프레젠테이션. 같은 날 오후 사우디 알 아라비야 TV에서 MBS의 약 75분 인터뷰가 방송되면서 본 비전이 정식 발표되었다.</p>

<h3>1. 발표 당일의 흐름</h3>
<ul>
  <li><strong>09:00 각료회의 개시</strong>: 살만 국왕 주재 각료회의가 알 야마마 궁전에서 개최. 약 30명의 각료 참석.</li>
  <li><strong>10:00 ~ 11:00 MBS 프레젠테이션</strong>: MBS가 직접 약 1시간 비전 2030 프레젠테이션. PIF 자산 규모·NEOM 구상·여성 경제활동 목표 등 핵심 수치 제시.</li>
  <li><strong>11:30 각료회의 승인</strong>: 각료회의가 비전 2030을 만장일치로 공식 승인.</li>
  <li><strong>14:00 알 아라비야 TV 인터뷰</strong>: MBS의 약 75분 단독 인터뷰가 사우디 국영 알 아라비야 TV에서 방송. 전국에 사실상 첫 정식 공개.</li>
</ul>

<h3>2. 비전 문서의 형식</h3>
<ul>
  <li><strong>약 84페이지 (영문판)</strong>: 영문판 약 84페이지·아랍어판 약 83페이지의 정식 문서. 같은 날 사우디 정부 웹사이트에 공개.</li>
  <li><strong>3대 핵심 축</strong>: (1)활기찬 사회(A Vibrant Society) (2)번영하는 경제(A Thriving Economy) (3)의욕적인 국가(An Ambitious Nation).</li>
  <li><strong>약 96개 정량 목표</strong>: 약 96개의 정량적 KPI가 명시. 2020·2025·2030 단계별 목표 설정.</li>
  <li><strong>약 9개 부속 프로그램</strong>: 본 비전의 실행 프로그램으로 (1)NTP(국가전환프로그램) (2)PIF 프로그램 (3)인적 자본 개발 등 약 9개 부속 프로그램이 후속 발표 예정.</li>
</ul>

<h3>3. MBS의 발표 핵심 포인트</h3>
<ul>
  <li><strong>"석유에 의존하지 않는 사우디"</strong>: 발표 핵심 메시지. "우리는 2020년까지 석유 없이도 살 수 있는 국가가 될 것"이라는 강력한 표현.</li>
  <li><strong>PIF 약 2조 달러 목표</strong>: 공공투자기금(PIF) 자산을 2016 약 1,500억 달러에서 2030 약 2조 달러로 약 13배 확대 목표. 세계 최대 국부펀드 등극 야망.</li>
  <li><strong>"5% 아람코 IPO" 시사</strong>: 사우디 국영 석유회사 아람코의 약 5% 지분 IPO 시사. 약 1,000~2,000억 달러 조달 기대.</li>
  <li><strong>"여성 경제활동 22→30%"</strong>: 여성 경제활동 참가율을 22%에서 30%로 확대 목표. 동시기 사우디 사회 관점에서 매우 진보적 약속.</li>
</ul>

<h3>4. 발표 직후의 반응</h3>
<ul>
  <li><strong>국제 시장의 긍정적 반응</strong>: 발표 직후 사우디 타다울 증시 약 2.5% 상승. 외국인 투자자들의 긍정적 평가가 우세.</li>
  <li><strong>국내 보수파의 우려</strong>: 사우디 종교계·보수 왕족 일부가 "사우디 정체성의 결정적 변화"라며 우려. 그러나 MBS의 정치 권위 강화로 본격 반대 의견은 곧 침묵.</li>
  <li><strong>외국 분석가들의 평가</strong>: "과거 30년 사우디 정책의 가장 큰 단일 변화" "MBS의 정치적 도박"이라는 평가가 일반적.</li>
</ul>`,
  },
  {
    order: 3,
    title: '핵심 3대 축과 주요 정량 목표',
    sectionType: 'process',
    content: `<p>비전 2030의 핵심 구조는 (1)활기찬 사회 (2)번영하는 경제 (3)의욕적인 국가의 3대 축으로 구성. 각 축 아래 약 30개씩의 세부 목표와 약 96개의 정량 KPI가 설정되었다.</p>

<h3>1. 제1축 — 활기찬 사회(A Vibrant Society)</h3>
<ul>
  <li><strong>이슬람 가치의 보존과 현대화 결합</strong>: "온건 이슬람(Moderate Islam)" 개념의 도입. 사우디 정체성의 보존 + 현대화의 결합 시도.</li>
  <li><strong>문화·엔터테인먼트 부문 신설</strong>: 영화·음악·콘서트·스포츠 관람 등 종교경찰에 의해 약 30년간 금지되었던 분야의 정식 허용. 2018-04 영화관 재개관·2019- 콘서트 본격화로 이어진다.</li>
  <li><strong>관광객 연간 1억 명 목표</strong>: 2016 약 1,500만 명에서 2030 약 1억 명으로 약 7배 확대. 종교 순례(메카·메디나) 외의 일반 관광 본격 육성.</li>
  <li><strong>여성 사회 진출 — 22→30% 참가</strong>: 여성 경제활동 참가율 22%에서 30%로 확대(2024 시점 36% 달성). 여성 운전 허용·남성 보호자 없는 여행 허용 등.</li>
  <li><strong>건강·생활 수준 향상</strong>: 평균 수명 75→80세·비만율 33→26%·체력 향상.</li>
</ul>

<h3>2. 제2축 — 번영하는 경제(A Thriving Economy)</h3>
<ul>
  <li><strong>석유 외 수입 비중 16→50%</strong>: 정부 수입에서 비석유 부문이 차지하는 비중을 16%에서 50%로 확대. 비전의 핵심 정량 목표.</li>
  <li><strong>민간 부문 GDP 기여도 40→65%</strong>: 민간 기업의 GDP 기여도를 40%에서 65%로 확대. 국영 기업 의존 모델의 결정적 전환.</li>
  <li><strong>PIF 자산 약 1,500억→2조 달러</strong>: 국부펀드 PIF 자산을 약 13배 확대. 세계 최대 국부펀드 등극 목표.</li>
  <li><strong>실업률 11.6%→7%</strong>: 청년 실업률을 약 30%에서 결정적으로 낮춤. 민간 일자리 약 450만 개 창출 목표.</li>
  <li><strong>외국인 직접투자(FDI) GDP 비중 3.8%→5.7%</strong>: 외국 자본 유치 확대.</li>
  <li><strong>중소기업 GDP 기여 20→35%</strong>: 사우디 중소기업 부문 확대.</li>
</ul>

<h3>3. 제3축 — 의욕적인 국가(An Ambitious Nation)</h3>
<ul>
  <li><strong>전자 정부 — 세계 7위 목표</strong>: UN 전자 정부 지수에서 사우디를 세계 7위로 끌어올림.</li>
  <li><strong>비정부 부문(NGO·자선) GDP 기여 1%</strong>: 사우디 시민사회 부문의 결정적 확대.</li>
  <li><strong>국가 재정 효율화</strong>: 보조금 합리화·세제 도입(2018 VAT 5% 도입)·정부 일자리 축소.</li>
  <li><strong>국가 정체성 — 사우디 자긍심</strong>: 사우디 청년의 국가 정체성 강화. 종교 정체성에서 국가 정체성으로의 점진적 전환.</li>
</ul>

<h3>4. 주요 KPI 약 96개 — 핵심 정량 목표</h3>
<table>
  <thead><tr><th>지표</th><th>2016 시점</th><th>2030 목표</th><th>2024 진행</th></tr></thead>
  <tbody>
    <tr><td>여성 경제활동 참가율</td><td>22%</td><td>30%</td><td>약 36% (달성)</td></tr>
    <tr><td>비석유 정부 수입 비중</td><td>16%</td><td>50%</td><td>약 30% (진행)</td></tr>
    <tr><td>관광객 연간(명)</td><td>1,500만</td><td>1억</td><td>약 1억 (달성)</td></tr>
    <tr><td>PIF 자산(달러)</td><td>1,500억</td><td>2조</td><td>약 9,250억 (진행)</td></tr>
    <tr><td>실업률</td><td>11.6%</td><td>7%</td><td>약 8.5% (진행)</td></tr>
    <tr><td>FDI/GDP</td><td>3.8%</td><td>5.7%</td><td>약 4.5% (진행)</td></tr>
    <tr><td>재생에너지 설치 용량</td><td>약 0.1GW</td><td>9.5GW</td><td>약 5.5GW (진행)</td></tr>
  </tbody>
</table>`,
  },
  {
    order: 4,
    title: '메가프로젝트 — 약 1조 달러 규모의 도시·인프라 사업',
    sectionType: 'process',
    content: `<p>비전 2030 발표 이후 잇달아 발진된 메가프로젝트들이 본 비전의 가시적 상징. NEOM·홍해 프로젝트·키디야·디리야 게이트·알울라 등 총 약 1조 달러 규모의 사업이 동시 진행되고 있으며, PIF가 사실상 단독 자금원으로 기능한다.</p>

<h3>1. NEOM — 약 5,000억 달러 메가시티</h3>
<ul>
  <li><strong>2017-10-24 공식 발표</strong>: MBS가 미래투자이니셔티브(FII) 컨퍼런스에서 NEOM 공식 발표. 사우디 북서부 타북주의 약 26,500km² 부지(벨기에 면적과 비슷).</li>
  <li><strong>"The Line" — 170km 선형 도시</strong>: 두 거대 거울 빌딩 사이의 170km 길이·200m 폭·500m 높이의 선형 도시 구상. 약 900만 명 거주 목표. 자동차 없는 도시·100% 재생 에너지.</li>
  <li><strong>"Oxagon" — 부유 산업 도시</strong>: NEOM 남쪽 해상에 부유하는 8각형 산업·물류 단지.</li>
  <li><strong>"Trojena" — 산악 리조트</strong>: 2029 아시아 동계 게임 개최 예정의 산악 리조트.</li>
  <li><strong>"Sindalah" — 럭셔리 섬</strong>: 홍해 NEOM 일대의 럭셔리 관광 섬. 2024 부분 개장.</li>
  <li><strong>2024-04 축소 발표</strong>: "The Line"의 원래 170km 구상에서 2030년까지는 약 2.4km만 완공하는 것으로 대폭 축소. 메가프로젝트의 현실적 한계 노출.</li>
</ul>

<h3>2. 홍해 프로젝트(Red Sea Project) — 럭셔리 관광</h3>
<ul>
  <li><strong>2017-08 발표</strong>: 홍해 연안 약 28,000km² 부지의 럭셔리 관광 개발 사업.</li>
  <li><strong>50개 럭셔리 호텔·8,000개 객실</strong>: 16개 핵심 섬을 중심으로 50개 럭셔리 호텔·8,000개 객실 구축.</li>
  <li><strong>2024 첫 호텔 개장</strong>: 2024년 첫 호텔(Six Senses Southern Dunes·St. Regis Red Sea 등) 개장.</li>
</ul>

<h3>3. 키디야(Qiddiya) — 엔터테인먼트 시티</h3>
<ul>
  <li><strong>2017-04 발표</strong>: 리야드 남서쪽 약 367km² 부지의 엔터테인먼트·스포츠 시티.</li>
  <li><strong>식스 플래그·F1 서킷</strong>: 미국 식스 플래그 테마파크·F1 모터스포츠 서킷·아쿠아 파크 등 약 300개 어트랙션.</li>
  <li><strong>2026~2027 첫 개장 예정</strong>: 2026 식스 플래그·2027 F1 서킷 등 단계 개장.</li>
</ul>

<h3>4. 디리야 게이트(Diriyah Gate) — 유산 복원</h3>
<ul>
  <li><strong>2017-07 발표</strong>: 사우디 건국 발상지인 리야드 외곽 디리야의 유산 복원·문화 단지 개발.</li>
  <li><strong>약 500억 달러 예산</strong>: 유네스코 세계유산 등재 지역의 복원과 박물관·호텔·문화 시설 종합 개발.</li>
  <li><strong>2024 부분 개장</strong>: 디리야 광장·핵심 박물관 단지가 2024 부분 개장.</li>
</ul>

<h3>5. 알울라(AlUla) — 고고학 관광</h3>
<ul>
  <li><strong>2017-07 발표</strong>: 사우디 북서부 마다인 살레(헤그라) 일대의 고고학 관광 개발.</li>
  <li><strong>나바테아 유적·암각 비문</strong>: 약 2,000년 전 나바테아 문명의 유적이 잘 보존된 지역. 페트라(요르단)와 동일 문명권.</li>
  <li><strong>2020-11 첫 일반 개방</strong>: 약 50년간 사실상 폐쇄되었던 지역이 2020-11 일반 관광객에 첫 개방.</li>
</ul>

<h3>6. 기타 주요 사업</h3>
<ul>
  <li><strong>리야드 메트로</strong>: 약 230억 달러 예산의 6개 노선 지하철. 2024-12 부분 개통, 2025 전 노선 개통.</li>
  <li><strong>킹 살만 국제공항</strong>: 리야드 새 국제공항. 약 350억 달러 예산. 2030 완공 목표 연 1.2억 명 처리 능력.</li>
  <li><strong>모드 — 자선 도시</strong>: 메카 근처 약 1,500억 달러 예산의 종교·자선 도시.</li>
  <li><strong>2034 FIFA 월드컵 단독 개최</strong>: 2024-12-11 FIFA가 사우디 단독 개최 결정. 비전 2030의 외교적 정점 사건.</li>
</ul>`,
  },
  {
    order: 5,
    title: '약 10년의 진행 — 성과와 그늘 (2016~2026)',
    sectionType: 'aftermath',
    content: `<p>비전 2030 발표 약 10년 후인 2026년 5월 시점에서, 일부 목표는 달성·진전을 이룬 반면 일부는 축소·지연되거나 인권 논란으로 비판받는 등 혼재된 성과를 보이고 있다.</p>

<h3>1. 사회 개방 — 약 10년의 결정적 변화</h3>
<ul>
  <li><strong>2017-09-26 여성 운전 허용 결정 → 2018-06-24 효력 발효</strong>: 약 50년간 유지된 여성 운전 금지 폐지. 사우디 사회사의 결정적 분기점.</li>
  <li><strong>2018-04-18 영화관 재개관</strong>: 약 35년간 폐쇄되었던 영화관 재개. 첫 상영작 「블랙 팬서」.</li>
  <li><strong>2019-08 남성 보호자 동의 없는 여행 허용</strong>: 21세 이상 여성이 남성 후견인(마흐람) 동의 없이 여권 발급·해외 여행 가능.</li>
  <li><strong>2019-09 관광 비자 발급</strong>: 약 50개국 시민에게 관광 비자 직접 발급. 종교 순례가 아닌 일반 관광 본격 허용.</li>
  <li><strong>2020-07 공공장소 남녀 혼재 완화</strong>: 식당·카페 등 공공장소에서 남녀 분리 의무 폐지.</li>
  <li><strong>여성 경제활동 참가율 — 22→36%</strong>: 비전 2030 목표 30%를 초과 달성. 약 8년 만의 결정적 변화.</li>
</ul>

<h3>2. 경제 개혁 — 부분 성과</h3>
<ul>
  <li><strong>2018-01 VAT 5% 도입</strong>: 사우디 첫 부가가치세 도입. 2020-07 15%로 상향.</li>
  <li><strong>2019-12-11 아람코 IPO</strong>: 사우디 아람코 약 1.5% 지분 IPO로 약 256억 달러 조달. 당시 사상 최대 IPO.</li>
  <li><strong>PIF 자산 약 6배 확대</strong>: 2016 약 1,500억 달러 → 2024 약 9,250억 달러. 세계 6위 국부펀드로 부상.</li>
  <li><strong>비석유 GDP 비중 약 50%로 확대</strong>: 2016 약 40% → 2024 약 50%. 그러나 정부 수입 측면에서는 여전히 석유 의존.</li>
  <li><strong>관광객 약 1억 명 달성</strong>: 2024년 시점 연 약 1억 명 관광객 유치(2030 목표 달성). 단 종교 순례 포함 통계 기준 논란.</li>
</ul>

<h3>3. 외교 — 야심적 행보와 논란</h3>
<ul>
  <li><strong>2017-06 카타르 단교</strong>: 사우디 주도 4개국이 카타르 단교 선언. 약 3년 6개월 후 2021-01 화해.</li>
  <li><strong>2018-10-02 카쇼기 살해</strong>: 자말 카쇼기가 이스탄불 사우디 영사관에서 살해. MBS와의 직접 연관 의심.</li>
  <li><strong>2022-07 바이든 방문과 주먹 인사</strong>: 미국 바이든 대통령이 사우디 방문. MBS와의 주먹 인사(fist bump)가 화제. 카쇼기 사건 약 4년 만의 외교 회복.</li>
  <li><strong>2023-09-15 중국 중재 이란 수교</strong>: 약 7년 단교 종결. 비전 2030의 외교적 자립 정점.</li>
  <li><strong>2024-12-11 2034 FIFA 월드컵 사우디 단독 개최 결정</strong>: 비전 2030 외교 성과의 최대 가시화 사례.</li>
</ul>

<h3>4. 인권 논란 — 누적된 그늘</h3>
<ul>
  <li><strong>2017-11 리츠칼튼 구금</strong>: 약 3개월간 약 200명 왕족·기업인 구금. 약 1,070억 달러 자산 환수. 사법 절차 결여 비판.</li>
  <li><strong>2018-10 카쇼기 살해</strong>: 미국 CIA가 MBS 직접 명령으로 평가. 미국·EU의 외교 압박 지속.</li>
  <li><strong>2018~2019 여성 인권 활동가 구금</strong>: 여성 운전 허용을 요구해 온 활동가들이 운전 허용 발표 직전 구금. 모순적 사례로 국제 비판.</li>
  <li><strong>NEOM 주민 강제 이주</strong>: NEOM 부지의 호와이트 부족 원주민 약 2만 명 강제 이주. 2020-04 항의 부족장 압둘 라힘 알 호와이트 사살.</li>
  <li><strong>예멘 전쟁 개입</strong>: 2015~현재 약 10년의 예멘 후티 전쟁 개입. 약 40만 명 사망 추정의 인도적 위기. MBS의 직접 책임 평가.</li>
</ul>

<h3>5. 메가프로젝트의 현실 — 축소와 지연</h3>
<ul>
  <li><strong>2024-04 NEOM "더 라인" 대폭 축소</strong>: 원래 170km 구상에서 2030년까지는 약 2.4km만 완공으로 축소. 약 90만 명에서 약 30만 명으로 거주 목표 축소.</li>
  <li><strong>비용 초과 누적</strong>: NEOM·홍해 프로젝트 등 주요 사업의 비용이 원래 추정보다 약 2~3배 증가.</li>
  <li><strong>유가 의존의 함정</strong>: 메가프로젝트 자금 조달이 사실상 PIF + 정부 예산에 의존. 유가 변동에 따른 자금 흐름 변동성 위험.</li>
  <li><strong>2025-02 PIF 재정 부담</strong>: PIF의 자체 현금 흐름이 메가프로젝트 수요를 따라가지 못해 약 200억 달러 채권 발행 등 외부 자금 의존.</li>
</ul>

<h3>6. 약 10년 평가 — 혼재된 성과</h3>
<ul>
  <li><strong>긍정 측면</strong>: 사회 개방의 결정적 진전·여성 경제활동 36% 달성·관광 1억 명 달성·외교 자립 강화·아람코 IPO 성공.</li>
  <li><strong>부정 측면</strong>: 카쇼기 사건·인권 논란·NEOM 축소·메가프로젝트 비용 초과·정부 수입의 석유 의존 지속.</li>
  <li><strong>학계 평가</strong>: 본 비전 2030이 "약 30년 사우디 정책의 가장 큰 단일 변화"라는 평가는 일치. 다만 "성공한 변혁인지·실패한 야심인지"의 평가는 약 5~10년 더 시간이 필요하다는 의견이 우세.</li>
</ul>`,
  },
  {
    order: 6,
    title: 'TMI — 잘 알려지지 않은 일화 모음',
    sectionType: 'aftermath',
    content: `<p>본 비전 2030과 MBS의 통치에 얽힌 잘 알려지지 않은 일화들을 모은다. 21세기 사우디 정치사·중동 외교사의 미시적 텍스처를 보여주는 자료들이다.</p>

<h3>1. MBS의 31세 생일 1일 전 발표</h3>
<ul>
  <li><strong>발표일 — 2016-04-25</strong>: MBS의 생일(1985-08-31)에서 약 4개월 전이지만, 약 31세 직전의 발표였다.</li>
  <li><strong>"젊은 지도자" 이미지</strong>: 발표 당시 MBS가 약 30세 — 사우디 정치사상 가장 젊은 부왕세자급 인사가 국가 비전을 발표한 사례.</li>
  <li><strong>젊음의 정치적 무기화</strong>: MBS 진영이 "사우디 인구 60%가 30세 미만 — 이들에게 같은 세대 지도자가 필요하다"는 논리로 MBS의 젊음을 정치적 자산화.</li>
</ul>

<h3>2. 맥킨지 "맥킨지 정부" 별칭의 정치적 무게</h3>
<ul>
  <li><strong>맥킨지의 약 18개월 상주</strong>: 약 18개월간 맥킨지 컨설턴트 약 50명이 리야드에 상주. 약 84페이지 비전 문서의 약 80%가 맥킨지 작업으로 알려짐.</li>
  <li><strong>맥킨지 본사의 비밀 컨설팅</strong>: 발표 직후 맥킨지가 사우디 정부에 약 5억 달러 컨설팅 청구. 본 컨설팅 비용이 사우디 내부에서 비판의 대상.</li>
  <li><strong>2018 맥킨지 "거짓 정보" 사건</strong>: 2018 미국 The Intercept 보도에서 맥킨지가 사우디 반체제 인사 약 3명의 SNS 활동을 분석해 사우디 정부에 제출했다는 의혹. 맥킨지가 사실을 인정하면서 사과.</li>
  <li><strong>"맥킨지 정부" 별칭의 정착</strong>: 사우디 정치 내부에서 비전 2030 진영을 "맥킨지 정부"라 부르는 표현이 정착. MBS 측은 본 표현을 거부했으나 사실상 인정.</li>
</ul>

<h3>3. PIF의 글로벌 투자 — 테슬라·소프트뱅크·뉴캐슬·LIV 골프</h3>
<ul>
  <li><strong>2018 테슬라 약 50억 달러 투자</strong>: PIF가 2018-08 테슬라 지분 약 5% 비밀 매입. 일론 머스크의 "사우디 PIF 차입으로 테슬라 비공개 전환" 트윗 사건의 출발점.</li>
  <li><strong>2020 테슬라 매각</strong>: PIF가 2020 테슬라 지분 매각. 매각 시점 약 100억 달러 평가, 약 50억 달러 수익.</li>
  <li><strong>2017 소프트뱅크 비전펀드 약 450억 달러</strong>: PIF가 2017 소프트뱅크 비전펀드에 약 450억 달러 출자. 본 펀드의 약 70% 출자자.</li>
  <li><strong>2021 뉴캐슬 유나이티드 FC 인수</strong>: PIF가 2021-10 잉글랜드 프리미어 리그 뉴캐슬 유나이티드 FC를 약 4.1억 파운드에 인수. 사우디 외교의 "스포츠 워싱" 전략의 핵심 사례.</li>
  <li><strong>2022 LIV 골프 출범</strong>: PIF가 2022-06 LIV 골프 투어 출범, 약 20억 달러 투자. PGA 투어와의 경쟁 후 2023-06 사실상 합병 합의.</li>
</ul>

<h3>4. NEOM "The Line"의 가시적 환상</h3>
<ul>
  <li><strong>2022-07 발표 영상 — 170km × 500m × 200m</strong>: 2022-07 MBS가 직접 발표한 "The Line" 영상에서 170km 길이·500m 높이·200m 폭의 거대한 거울 빌딩 두 개. 발표 당시 세계적 화제.</li>
  <li><strong>약 900만 명 거주 목표</strong>: 2030년까지 약 900만 명이 거주하는 선형 도시 구상. 차량 없는 도시·100% 재생 에너지·5분 거리 내 모든 시설.</li>
  <li><strong>2024-04 대폭 축소</strong>: 약 2년 만에 "The Line"의 2030 완공 구간이 170km에서 약 2.4km로 축소 발표. 거주 목표도 약 90만에서 약 30만으로 약 3분의 1 축소.</li>
  <li><strong>"환상의 메가프로젝트"</strong>: 일부 외국 학자들이 본 사업을 "21세기 환상의 메가프로젝트(fantasy megaproject)"라 평가. 2024 축소 발표가 이 평가를 사실상 확정.</li>
</ul>

<h3>5. 2017-11 리츠칼튼 구금의 내부 일화</h3>
<ul>
  <li><strong>2017-11-04 늦은 밤 체포</strong>: 약 200명의 왕족·기업인이 늦은 밤 사적 자택에서 동시 체포. 리야드 리츠칼튼 호텔에 강제 수용.</li>
  <li><strong>왈리드 빈 탈랄 왕자</strong>: 사우디 재벌 왕자 알 왈리드 빈 탈랄(약 200억 달러 자산 추정)이 약 2개월 구금. 2018-01 미공개 합의 후 석방.</li>
  <li><strong>"호텔 감옥"의 환경</strong>: 리츠칼튼이 약 3개월간 호텔 영업 중단. 구금자들이 호화 객실에 수용되었으나 출입은 엄격히 통제.</li>
  <li><strong>약 1,070억 달러 자산 환수</strong>: 사우디 정부 발표에 따르면 약 1,070억 달러 규모의 자산이 정부에 환수. 그러나 합의 과정의 사법 절차 결여로 국제 비판.</li>
</ul>

<h3>6. 카쇼기 사건의 우주적 충격</h3>
<ul>
  <li><strong>2018-10-02 영사관 살해</strong>: 자말 카쇼기가 이스탄불 사우디 영사관에서 살해. 약 15명의 사우디 공작원이 사용된 정밀 작전.</li>
  <li><strong>"살해 후 시신 처리"의 충격</strong>: 시신이 약 8분에 걸쳐 분해·처리된 음향 녹음이 후일 공개되면서 국제 사회 충격.</li>
  <li><strong>2021 CIA 평가서 공개</strong>: 바이든 행정부가 2021-02 공개한 CIA 평가서에서 "MBS가 직접 카쇼기 살해를 승인"이라 명시.</li>
  <li><strong>MBS의 "주권 면제" 주장</strong>: MBS가 2022-09 사우디 총리에 임명되면서 "총리는 외국 사법 절차에서 주권 면제"라 주장. 미국 법원이 이를 수용해 카쇼기 미망인의 소송 기각.</li>
</ul>

<h3>7. 살만 국왕의 "황금 침대"</h3>
<ul>
  <li><strong>2017 일본 방문 — 약 1,000명 수행단</strong>: 살만 국왕이 2017-03 일본 방문 시 약 1,000명 수행단·약 800톤 화물 동원. 도쿄 호텔 6개를 통째로 임대.</li>
  <li><strong>황금 도금 에스컬레이터</strong>: 살만 국왕 전용 황금 도금 에스컬레이터가 비행기 측면에 부착되어 운반. 일본 언론의 "황금 침대(고가의 침대) 일본 방문"이라는 표현이 화제.</li>
  <li><strong>인도네시아 방문 — 459톤</strong>: 같은 해 인도네시아 방문 시 약 459톤 화물 동원. "역사상 가장 호화로운 국빈 방문"으로 기록.</li>
  <li><strong>대조 — MBS의 검소함</strong>: MBS는 본인이 거주하는 리야드 궁전을 비교적 검소하게 운영. 단 약 5억 달러 요트(세린 호) 구입은 화제.</li>
</ul>

<h3>8. 사우디 게임 산업의 부상</h3>
<ul>
  <li><strong>2023-09 게임·e스포츠 전략</strong>: 사우디 정부가 2023-09 게임·e스포츠 전략 발표. 비전 2030의 엔터테인먼트 부문 핵심 사업 중 하나.</li>
  <li><strong>약 380억 달러 투자</strong>: PIF가 게임 산업에 약 380억 달러 투자 약정. 닌텐도(약 8%)·EA(약 9.5%)·테이크투(약 5%) 등 주요 게임사 지분 매입.</li>
  <li><strong>2024 e스포츠 월드컵</strong>: 2024-07 ~ 08 리야드에서 최초의 "e스포츠 월드컵" 개최. 총 상금 약 6,000만 달러로 e스포츠 사상 최대.</li>
  <li><strong>"게임 워싱" 비판</strong>: 카쇼기 사건·예멘 전쟁 등 인권 논란을 게임 산업 투자로 희석하려는 "게임 워싱(game washing)" 비판도 부상.</li>
</ul>

<h3>9. 2034 FIFA 월드컵 단독 개최</h3>
<ul>
  <li><strong>2024-12-11 결정</strong>: FIFA가 2034 월드컵 사우디 단독 개최 결정. 22개 회원국 만장일치.</li>
  <li><strong>경쟁국 부재</strong>: 사우디 외에 입찰한 국가 없음. FIFA의 "사실상 사우디 지명" 절차로 진행.</li>
  <li><strong>"오일 머니의 정점"</strong>: 본 결정이 사우디 비전 2030 외교 성과의 정점으로 평가. 동시에 인권·노동 환경에 대한 우려도 함께 부각.</li>
  <li><strong>본격 인프라 부설</strong>: 월드컵 11개 경기장 + 메트로 + 호텔 + 공항 인프라가 2026~2034 약 8년에 걸쳐 부설 예정. 사실상 비전 2030의 가시적 결정체.</li>
</ul>

<h3>10. MBS의 정치 권력 단일화 — 1세대 만의 변혁</h3>
<ul>
  <li><strong>1953~2015 형제 계승 약 62년</strong>: 사우디 건국 국왕 압둘아지즈의 1953년 사망 후 약 62년간 그의 아들 6명이 차례로 왕위 계승(사우드·파이살·할리드·파흐드·압둘라·살만).</li>
  <li><strong>2017-06 손자 세대로 전환</strong>: 2017-06 MBS의 왕세자 승격으로 약 62년 만에 손자 세대로 왕위 계승 노선 전환. 한 세대 만의 결정적 권력 이동.</li>
  <li><strong>2022-09 총리 직위 추가</strong>: 살만 국왕이 2022-09-27 MBS를 총리로 임명. 왕세자 + 총리 + 국방장관 + PIF 위원장의 4중 직위로 권력 단일화 완성.</li>
  <li><strong>약 60년 정치 노선의 변혁</strong>: 약 60년의 "협의 통치(council consensus)" 모델이 약 7년 만에 "단일 통치(MBS rule)" 모델로 전환. 본 비전 2030이 이 변혁의 정치적 정당성 근거.</li>
</ul>`,
  },
]

// ── 메인 시드 함수 ────────────────────────────────────────────────────────
export async function seedSaudiVision2030(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n📜 사우디 비전 2030 발표 시딩 시작 (기존 데이터 보존 모드)...')

  const admin = await prisma.account.findUnique({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  ⚠️  admin 계정 미존재 — 시딩 중단')
    return
  }

  const category = await prisma.eventCategory.findFirst({
    where: { name: EVENT_CATEGORY_NAME },
    select: { id: true },
  })
  if (!category) {
    console.warn(`  ⚠️  카테고리 '${EVENT_CATEGORY_NAME}' 미존재 — 시딩 중단`)
    return
  }

  const saudiCountry = await prisma.country.findFirst({
    where: { name: '사우디아라비아' },
    select: { id: true },
  })
  if (!saudiCountry) {
    console.warn('  ⚠️  사우디아라비아 country 미존재 — country.seed 실행 필요')
    return
  }

  // ── 1) 신규 인물 등록 ────────────────────────────────────────────────────
  console.log('\n  👥 신규 인물 등록...')
  const personIdByOriginalName = new Map<string, string>()
  for (const p of NEW_PERSONS) {
    const existing = await prisma.person.findFirst({
      where: { originalName: p.originalName },
    })
    let personId: string
    if (existing) {
      personId = existing.id
      console.log(`    ⏭️  ${p.originalName} (이미 존재)`)
    } else {
      const created = await prisma.person.create({
        data: {
          name: p.name,
          surname: p.surname,
          originalName: p.originalName,
          biography: p.biography,
          birthEra: 'AD' as any,
          birthDate: new Date(p.birthYear, p.birthMonth - 1, p.birthDay),
          deathEra: p.deathYear ? ('AD' as any) : undefined,
          deathDate: p.deathYear
            ? new Date(p.deathYear, (p.deathMonth ?? 1) - 1, p.deathDay ?? 1)
            : undefined,
          deathCause: p.deathCause,
          isAlive: p.isAlive,
          gender: p.gender,
          nameDisplayOrder: 'western',
          influence: p.influence,
          accountId: ACCOUNT_ID,
        },
      })
      personId = created.id
      console.log(`    ✅ ${p.originalName} (영향력 ${p.influence})`)
    }
    personIdByOriginalName.set(p.originalName, personId)

    const affExists = await prisma.personCountryAffiliation.findFirst({
      where: {
        personId,
        countryId: saudiCountry.id,
        affiliationType: 'CITIZENSHIP' as any,
      },
    })
    if (!affExists) {
      await prisma.personCountryAffiliation.create({
        data: {
          personId,
          countryId: saudiCountry.id,
          affiliationType: 'CITIZENSHIP' as any,
          priority: 0,
        },
      })
    }
  }

  // ── 2) 사건 등록 ────────────────────────────────────────────────────────
  const TITLE = '사우디아라비아 비전 2030(Vision 2030) 발표 (2016-04-25)'
  const START_DATE = '2016-04-25'
  const END_DATE = '2016-04-25'

  const existing = await prisma.event.findFirst({
    where: {
      title: TITLE,
      startDate: new Date(START_DATE),
      deletedAt: null,
    },
  })

  let eventId: string
  if (existing) {
    eventId = existing.id
    console.log(`\n  ⏭️  사건 이미 존재 — 스킵 (id=${eventId})`)
  } else {
    const created = await prisma.event.create({
      data: {
        title: TITLE,
        ...EVENT_BODY,
        startDate: new Date(START_DATE),
        startDatePrecision: 'day',
        endDate: new Date(END_DATE),
        endDatePrecision: 'day',
        categoryId: category.id,
        createdById: admin.id,
      },
    })
    eventId = created.id
    console.log(`\n  ✅ 사건 생성: ${TITLE} (id=${eventId})`)
  }

  // ── 3) EventSection ────────────────────────────────────────────────────
  console.log('\n  📜 본문 섹션 등록...')
  for (const section of SECTIONS) {
    const exists = await prisma.eventSection.findFirst({
      where: { eventId, title: section.title },
    })
    if (exists) {
      console.log(`    ⏭️  섹션 스킵: ${section.title}`)
      continue
    }
    await prisma.eventSection.create({
      data: {
        eventId,
        title: section.title,
        content: section.content,
        order: section.order,
        sectionType: section.sectionType ?? null,
      },
    })
    console.log(`    ✅ 섹션 생성: ${section.title}`)
  }

  // ── 4) EventCountryRelation ────────────────────────────────────────────
  console.log('\n  🌍 국가 관계 등록...')
  const relExists = await prisma.eventCountryRelation.findFirst({
    where: {
      eventId,
      countryId: saudiCountry.id,
      role: EventCountryRole.INITIATOR,
    },
  })
  if (relExists) {
    console.log(`    ⏭️  국가관계 스킵: 사우디아라비아`)
  } else {
    await prisma.eventCountryRelation.create({
      data: {
        eventId,
        countryId: saudiCountry.id,
        role: EventCountryRole.INITIATOR,
        roleDescription:
          '본 사업의 주체국. 살만 국왕의 공식 승인과 MBS의 입안·추진으로 ' +
          '약 30년 사우디 국가 모델의 결정적 재정의 사업을 발진. ' +
          '약 1조 달러 메가프로젝트와 사회 개방 조치를 약 10년에 걸쳐 단계적으로 추진. ' +
          '2024-12 2034 FIFA 월드컵 단독 개최 결정 등 외교 성과 누적. ' +
          '단 카쇼기 사건·NEOM 축소·인권 논란 등 그늘도 함께 누적되었다.',
      },
    })
    console.log(`    ✅ 국가관계: 사우디아라비아 (INITIATOR)`)
  }

  // ── 5) PersonEvent ─────────────────────────────────────────────────────
  console.log('\n  👤 인물-사건 관계 등록...')
  const PERSON_ROLES: Array<{ originalName: string; role: string; note: string }> = [
    {
      originalName: 'Mohammed bin Salman',
      role: '부왕세자(당시) — 비전 입안·발표 직접 주도',
      note:
        '본 비전 2030의 사실상 단독 입안자·발표자. 약 30세에 약 84페이지 비전 문서의 정치 책임자. ' +
        '2016-04-25 알 야마마 궁전 각료회의에서 직접 약 1시간 프레젠테이션. ' +
        '발표 직후 NEOM·홍해 프로젝트·키디야 등 메가프로젝트를 직접 지휘. ' +
        '2017-06 왕세자 승격·2022-09 총리 임명으로 권력 단일화 후 ' +
        '비전 2030 추진을 약 10년에 걸쳐 단독 책임.',
    },
    {
      originalName: 'Salman bin Abdulaziz Al Saud',
      role: '국왕 — 비전 공식 승인자',
      note:
        '본 비전 2030의 공식 승인자. 81세의 고령으로 발표 당일 각료회의 주재. ' +
        '실질 입안·추진은 친아들 MBS에 위임. 약 10년 동안 ' +
        '아랍 보수 군주의 상징적 권위로 비전 2030의 정치 정당성 확보.',
    },
    {
      originalName: 'Yasir Al-Rumayyan',
      role: 'PIF 총재 — 비전 자금 조달 책임자',
      note:
        '2015-09 PIF 총재 취임 직후 본 비전 2030의 사실상 단독 자금 조달 책임자가 됨. ' +
        'PIF 자산을 2016 약 1,500억 → 2024 약 9,250억 달러로 약 6배 확대. ' +
        '테슬라·소프트뱅크·뉴캐슬·LIV 골프 등 글로벌 투자도 직접 지휘. ' +
        '2019-09 아람코 회장 겸임으로 사우디 경제 정책의 최고 실무자가 되었다.',
    },
  ]
  for (const pr of PERSON_ROLES) {
    const personId = personIdByOriginalName.get(pr.originalName)
    if (!personId) continue
    const exists = await prisma.personEvent.findFirst({
      where: { personId, eventId },
    })
    if (exists) {
      console.log(`    ⏭️  인물관계 스킵: ${pr.originalName}`)
      continue
    }
    await prisma.personEvent.create({
      data: { personId, eventId, role: pr.role, note: pr.note },
    })
    console.log(`    ✅ 인물관계: ${pr.originalName}`)
  }

  console.log(`\n✅ 사우디 비전 2030 시딩 완료\n`)
}
