/**
 * 2026-04-27 메르츠 독일 총리의 미국 굴욕 발언 시드
 *
 * 기존 데이터 보존 모드. Event, Section, Person 등이 이미 있으면 갱신하지 않고 스킵한다.
 *
 * 2026-04-27 독일 노르트라인베스트팔렌주 마르스베르크의 Carolus-Magnus-Gymnasium에서
 * 프리드리히 메르츠(Friedrich Merz) 독일 총리가 학생 청중을 대상으로 한 강연 중,
 * 당시 진행 중이던 미국-이란 전쟁(2026년 2월 발발, 발언 시점 약 59일째)과 관련해
 * "한 국가 전체가 이란 지도부, 특히 혁명수비대에 의해 굴욕당하고 있다"고 발언한 사건.
 *
 * 독일이 G7 핵심 동맹국으로서 미국의 이란 전쟁 수행을 공개적으로 비판한 최초의 사례로,
 * 트럼프 미국 대통령이 강하게 반발해 4월 30일 독일 주둔 미군 약 5,000명 감축을 발표,
 * 5월 초까지 미독 관계가 사상 최악 수준으로 악화된 출발점이 된 사건이다.
 *
 * 등록 항목:
 *  - Event 1
 *  - EventSection 5 (배경, 발언 본문, 핵심 인용, 트럼프 반응, 후속 영향)
 *  - EventCountryRelation 3 (독일, 미국, 이란)
 *  - Person 5 (메르츠, 트럼프, 위트코프, 쿠슈너, 하메네이)
 *  - PersonEvent 5
 */
import { EventCountryRole } from '@prisma/client'

import { PrismaService } from '../prisma.service'

const ACCOUNT_ID = '6af53fe7-d02b-4c42-b86c-f32800897b32'
const EVENT_CATEGORY_NAME = '외교'

type PersonInput = {
  name: string
  surname?: string
  originalName?: string
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
  nameDisplayOrder: 'korean' | 'western'
  influence: number
  countryName: string
  eventRole: string
  eventNote: string
  matchByOriginalName?: boolean
}

const PERSONS: PersonInput[] = [
  {
    name: '프리드리히',
    surname: '메르츠',
    originalName: 'Friedrich Merz',
    biography:
      '독일 연방공화국 제10대 연방총리(2025-05-06 취임). 본명 Friedrich Joachim Merz. ' +
      '기독교민주연합(CDU) 출신 보수파 정치인으로, 2002년부터 2009년까지 연방의회 원내대표를 맡았으나 ' +
      '메르켈 총리와의 노선 갈등 이후 정계를 떠나 BlackRock 독일 법인 회장 등 민간 영역에서 활동했다. ' +
      '2018년 정계 복귀를 선언한 뒤 세 차례의 도전 끝에 2022년 CDU 대표로 선출되었고, ' +
      '2025년 2월 23일 조기 총선에서 CDU 주도 연정을 이끌어 같은 해 5월 6일 ' +
      '올라프 숄츠(SPD)에 이어 총리에 취임했다. 취임 직후부터 대(對)미국 자율성 강화와 ' +
      '독자적 안보 정책을 강조해 왔으며, 본 발언은 그 노선이 처음으로 공개적 비판으로 표출된 사례이다.',
    birthYear: 1955, birthMonth: 11, birthDay: 11,
    isAlive: true,
    gender: 'MALE',
    nameDisplayOrder: 'western',
    influence: 75,
    countryName: '독일',
    eventRole: '독일 연방총리, 발언 주체',
    eventNote:
      '2026-04-27 월요일 오전 마르스베르크 Carolus-Magnus-Gymnasium 학생 강연에서 ' +
      '미국의 이란 전쟁 수행을 공개적으로 비판. 한 국가 전체가 이란 지도부에 굴욕당하고 있다는 표현과 ' +
      '아프가니스탄 20년, 이라크 전쟁의 출구 부재 사례를 거론해 미국 동맹국 정상 가운데 ' +
      '가장 강한 수위로 미국 전략 부재를 공개 비판한 인물.',
  },
  {
    name: '도널드',
    surname: '트럼프',
    originalName: 'Donald John Trump',
    biography: '',
    birthYear: 1946, birthMonth: 6, birthDay: 14,
    isAlive: true,
    gender: 'MALE',
    nameDisplayOrder: 'western',
    influence: 95,
    countryName: '미국',
    eventRole: '미국 대통령, 메르츠 발언 대상',
    eventNote:
      '메르츠 발언 직후 Truth Social과 기자단 발언으로 "메르츠는 자기가 무엇을 말하는지 모른다", ' +
      '"무능한(ineffectual) 지도자"라며 강하게 반박. 4월 30일 독일 주둔 미군 약 5,000명 감축을 발표하고 ' +
      '추가 감축 가능성도 시사. 이로써 양국 정상 간 공개 설전이 사상 최악 수준으로 격화되었다.',
    matchByOriginalName: true,
  },
  {
    name: '스티브',
    surname: '위트코프',
    originalName: 'Steve Witkoff',
    biography:
      '미국 부동산 개발업자 출신 트럼프 2기 행정부 중동 특사. 본명 Steven Charles Witkoff. ' +
      '뉴욕 부동산 업계에서 트럼프와 약 40년의 친분을 쌓은 인물로, 2024년 대선 캠페인 이후 ' +
      '트럼프의 사실상 사적 외교 채널 역할을 수행해 왔다. 2025년 1월 트럼프 2기 출범과 함께 ' +
      '공식 중동 특사로 임명되어 2025년 4월부터 오만 중재의 미국-이란 핵 협상을 주도. ' +
      '2025년 6월 12일 전쟁 발발 후 약 1년간 비공식 중재 채널을 유지하다가 ' +
      '2026년 2월 미국-이란 전쟁 발발 이후 다시 협상 재개를 시도, 이슬라마바드를 수차례 방문했으나 ' +
      '이란 측의 거부로 빈손 귀국하는 일이 반복되면서 메르츠 발언의 직접 배경이 되었다.',
    birthYear: 1957, birthMonth: 3, birthDay: 15,
    isAlive: true,
    gender: 'MALE',
    nameDisplayOrder: 'western',
    influence: 60,
    countryName: '미국',
    eventRole: '미국 중동 특사, 이슬라마바드 협상 좌초의 당사자',
    eventNote:
      '2026년 2월 이후 약 2개월 동안 이슬라마바드를 약 4차례 방문해 이란 측과 협상을 시도했으나 ' +
      '매번 이란 측이 협상 테이블에 나오지 않거나 사전 합의문을 받자마자 일방적으로 거부, ' +
      '빈손으로 귀국하는 상황이 반복되었다. 메르츠가 강연에서 "미국인들을 이슬라마바드로 보냈다가 ' +
      '아무 성과 없이 돌려보낸다"고 직접 거론한 외교적 좌초 사례의 중심 인물.',
  },
  {
    name: '재러드',
    surname: '쿠슈너',
    originalName: 'Jared Kushner',
    biography:
      '미국 부동산 개발업자, 트럼프 대통령의 사위(이방카 트럼프의 남편). ' +
      '트럼프 1기 행정부에서 백악관 선임고문으로 중동 정책을 담당했으며 ' +
      '2020년 아브라함 협정(Abraham Accords) 체결의 실무 협상을 주도한 인물. ' +
      '2기 행정부에서는 공식 직책 없이 자문 역할을 수행하다가 2026년 2월 미국-이란 전쟁 발발 후 ' +
      '위트코프 특사와 함께 사실상의 사적 외교 채널로 활용되어 이슬라마바드 협상에 동행. ' +
      '아브라함 협정 당시의 사우디아라비아·UAE 네트워크를 활용해 ' +
      '대(對)이란 압박 외교 라인을 구성하려 했으나 본 시점까지 성과 없음.',
    birthYear: 1981, birthMonth: 1, birthDay: 10,
    isAlive: true,
    gender: 'MALE',
    nameDisplayOrder: 'western',
    influence: 55,
    countryName: '미국',
    eventRole: '미국 비공식 특사, 위트코프와 동행한 협상 대표',
    eventNote:
      '위트코프와 함께 2026년 봄 이슬라마바드 협상을 수차례 동행. ' +
      '아브라함 협정 시절 인맥(사우디아라비아 무함마드 빈 살만, UAE 무함마드 빈 자이드)을 활용해 ' +
      '대이란 압박 라인을 구축하려 했으나, 이란이 미국 특사단 자체와의 접촉을 거부함으로써 ' +
      '협상이 사실상 형식적 절차로 전락한 상황의 공동 책임자.',
  },
  {
    name: '알리',
    surname: '하메네이',
    originalName: 'Ali Hosseini Khamenei',
    biography: '',
    birthYear: 1939, birthMonth: 4, birthDay: 19,
    isAlive: true,
    gender: 'MALE',
    nameDisplayOrder: 'western',
    influence: 88,
    countryName: '이란',
    eventRole: '이란 최고지도자, 메르츠가 지목한 이란 지도부의 정점',
    eventNote:
      '메르츠가 강연에서 직접 지명하지는 않았으나 "이란 지도부, 특히 혁명수비대(IRGC)"라는 표현은 ' +
      '하메네이 체제와 혁명수비대 양대 권력 기둥을 가리킨다. ' +
      '2025년 12일 전쟁에서 살아남은 후 2026년 2월 발발한 미국-이란 전쟁에서도 ' +
      '비밀 벙커에서 지휘를 이어가며 협상 자체를 거부하는 강경 노선을 유지, ' +
      '이슬라마바드 채널의 사실상 동결을 직접 결정한 인물로 평가된다.',
    matchByOriginalName: true,
  },
]

const EVENT_BODY = {
  description:
    '2026년 4월 27일 월요일, 독일 노르트라인베스트팔렌주 마르스베르크에 위치한 Carolus-Magnus-Gymnasium에서 ' +
    '프리드리히 메르츠 독일 연방총리가 학생 청중을 대상으로 한 정책 강연 중에 ' +
    '당시 진행 중이던 미국-이란 전쟁(2026년 2월 발발, 발언 시점 약 59일째)에 관해 ' +
    '"한 국가 전체가 이란 지도부, 특히 혁명수비대(IRGC)에 의해 굴욕당하고 있다"고 발언한 사건이다. ' +
    '\n\n' +
    '메르츠 총리는 같은 강연에서 이란 측이 "협상을 매우 능숙하게 한다기보다는 협상을 매우 능숙하게 하지 않는다", ' +
    '"미국인들을 이슬라마바드로 보냈다가 아무 성과 없이 돌려보낸다"고 미국의 외교 좌초를 구체적으로 지적했으며, ' +
    '아프가니스탄 20년 전쟁과 이라크 전쟁의 출구 부재 사례를 거론해 ' +
    '미국이 이란 전쟁에서도 명확한 출구 전략을 갖지 못했다고 비판했다. ' +
    '\n\n' +
    '본 발언은 독일이 G7 핵심 동맹국으로서 미국의 이란 전쟁 수행을 공개 무대에서 정면 비판한 ' +
    '최초의 사례로 평가된다. 트럼프 대통령이 강하게 반발해 4월 28일 Truth Social 게시글에서 ' +
    '메르츠를 "자기가 무엇을 말하는지 모른다", "무능한(ineffectual) 지도자"라고 칭한 뒤 ' +
    '4월 30일 독일 주둔 미군 약 5,000명의 감축을 공식 발표함으로써, ' +
    '본 발언이 사상 최악 수준의 미독 정상 간 공개 설전의 출발점이 되었다.',
  location:
    '독일 노르트라인베스트팔렌주(NRW) 마르스베르크(Marsberg) 시 Carolus-Magnus-Gymnasium ' +
    '(마르스베르크 시내 인문계 김나지움). 강연 청중은 11학년 이상 고학년 학생 약 200명 규모.',
  background:
    '본 발언이 나온 직접적 배경은 2026년 2월에 발발한 미국-이란 전쟁의 장기화와 ' +
    '미국 외교 협상의 거듭된 좌초였다. ' +
    '\n\n' +
    '1. 2025년 6월 12일간 전쟁의 미완 종결 ' +
    '2025년 6월 13일부터 24일까지 이어진 이스라엘-이란 12일 전쟁과 미국의 미드나잇 해머 작전 직후 ' +
    '카타르 중재로 휴전이 성립되었으나, 이란이 휴전 직후 IAEA 협력을 중단하고 ' +
    '약 60% 농축 우라늄 408kg의 행방이 불명한 상태로 남으면서 핵 문제 자체는 미해결로 남았다. ' +
    '2025년 하반기부터 2026년 초까지 미국과 이란 사이에 약 8개월간 비공식 채널 협상이 이어졌으나 ' +
    '"우라늄 농축 권리"에 관한 양측 입장 차이로 결렬되었다. ' +
    '\n\n' +
    '2. 2026년 2월 미국-이란 전쟁 발발 ' +
    '2026년 1월 말 IAEA가 이란이 비밀 시설에서 90% 무기급 농축을 재개한 정황을 포착, ' +
    '미국이 2월 초 다시 한번 포르도, 나탄즈, 이스파한 핵 시설에 대한 추가 공습을 단행했다. ' +
    '이란은 이번에는 호르무즈 해협에 약 200기의 기뢰를 부설하고 ' +
    '미군 카타르 알우데이드 기지와 사우디아라비아 동부 다란 항만에 미사일 공격을 가하면서 ' +
    '본격적 미국-이란 전쟁(공식 명칭 "Operation Eagle Claw II")으로 비화했다. ' +
    '\n\n' +
    '3. 호르무즈 해협 부분 봉쇄와 유럽 경제 충격 ' +
    '호르무즈 해협 기뢰 부설로 세계 원유 해상 운송의 약 20%가 차단되면서 ' +
    '국제 유가가 2월 말 배럴당 약 130달러까지 급등, 독일을 비롯한 유럽 경제가 직격탄을 맞았다. ' +
    '독일은 2022년 우크라이나 전쟁에 따른 러시아 가스 차단 이후 약 4년 만에 다시 에너지 위기에 진입, ' +
    '2026년 1분기 GDP 성장률이 마이너스로 돌아섰다. ' +
    '\n\n' +
    '4. 이슬라마바드 협상의 거듭된 좌초 ' +
    '미국이 2026년 3월부터 파키스탄 정부를 중재자로 한 비공식 협상을 시도해 ' +
    '위트코프 특사와 쿠슈너가 약 4차례 이슬라마바드를 방문했으나 ' +
    '이란 측은 매번 협상 테이블에 나오지 않거나 사전 합의문을 받자마자 거부, ' +
    '미국 대표단이 빈손으로 귀국하는 상황이 반복되었다. ' +
    '\n\n' +
    '5. 독일 메르츠 정부의 노선 ' +
    '2025년 5월 6일 취임한 메르츠 총리는 취임 초기부터 대미 자율성 강화와 ' +
    '독일 군비 증강(2027년까지 GDP 대비 3.5% 도달 목표)을 강조해 왔으며, ' +
    '2026년 2월 미국-이란 전쟁 발발 이후 독일 경제 직격탄에 대한 국내 정치 압박이 누적되면서 ' +
    '대미 비판 노선이 점차 가시화되었다. 본 발언은 그 노선이 공개적으로 표출된 첫 사례이다.',
  aftermath:
    '본 발언 직후 약 2주 동안 미독 양국 관계는 사상 최악 수준으로 급격히 악화되었다. ' +
    '\n\n' +
    '1. 트럼프의 즉각 반박과 인신 공격적 표현 ' +
    '메르츠 발언이 보도된 직후 2026-04-28 새벽(미 동부시간), ' +
    '트럼프 대통령이 Truth Social에 "메르츠는 자기가 무엇을 말하는지 모른다", ' +
    '"무능한(ineffectual) 지도자"라고 게시. 같은 날 백악관 출입 기자단에도 ' +
    '"독일이 우리 군을 자기 영토에 두는 대가로 무엇을 지불하고 있는지 다시 검토할 것"이라 발언. ' +
    '\n\n' +
    '2. 4월 30일 독일 주둔 미군 5,000명 감축 발표 ' +
    '4월 30일 펜타곤이 독일 주둔 미군 약 5,000명을 향후 12개월에 걸쳐 본토 및 ' +
    '폴란드, 루마니아 기지로 재배치한다고 발표. 트럼프가 같은 날 기자단에 ' +
    '"훨씬 더 큰 규모의 감축이 따를 것"이라 언급해 추가 감축 가능성도 시사. ' +
    '2020년 트럼프 1기 당시의 9,500명 감축 발표(이후 바이든 행정부가 철회)와 유사한 패턴이다. ' +
    '\n\n' +
    '3. 메르츠의 추가 발언 ' +
    '메르츠 총리는 4월 29일 베를린에서 본 발언이 미군 감축의 원인이 아니라고 부인하면서도 ' +
    '"독일은 동맹국으로서 솔직히 의견을 표명할 권리가 있다"고 거듭 강조. ' +
    '또한 호르무즈 해협 안정화를 위해 독일 해군 기뢰 제거함 2척의 파견을 검토하고 있으나 ' +
    '"적대 행위가 완전히 중단된 후"라는 조건을 명시. ' +
    '\n\n' +
    '4. 유럽 동맹국의 분열 ' +
    '메르츠 발언 직후 프랑스 마크롱 대통령이 4월 29일 "독일 총리의 우려에 공감한다"는 입장을 표명, ' +
    '이탈리아 멜로니 총리는 반대로 "동맹국 간 공개 비판은 부적절하다"며 미국 측에 동조. ' +
    '영국 스타머 정부는 중립적 입장을 유지하면서도 미국과의 정보 공유 협력은 유지. ' +
    '본 사건이 유럽 내부의 대미 정책 분열을 가시화한 계기가 되었다. ' +
    '\n\n' +
    '5. 이란 측의 활용 ' +
    '이란 국영 방송 IRIB와 영어 채널 Press TV가 메르츠 발언을 대대적으로 보도하면서 ' +
    "이는 서방 동맹국조차 인정한 이란의 외교적 승리라고 선전. " +
    '하메네이 최고지도자가 4월 29일 트윗에서 "유럽이 진실을 보기 시작했다"고 메르츠 발언을 인용. ' +
    '본 발언이 결과적으로 이란의 협상 거부 노선에 정당성을 부여하는 부수적 효과를 발생시켰다는 ' +
    '서방 외교가의 자기비판이 부상했다. ' +
    '\n\n' +
    '6. 미국 공화당 내부의 균열 ' +
    '트럼프의 독일 주둔 미군 감축 결정에 대해 공화당 상원의원 다수가 공개 반대 의사를 표명. ' +
    '특히 대외정책 강경파인 린지 그레이엄, 톰 코튼 등이 "러시아, 중국에 잘못된 신호"라며 ' +
    '의회 차원의 견제를 시사. 본 사건이 트럼프 행정부의 대(對)유럽 정책에 대한 ' +
    '공화당 내부 첫 본격 균열을 가져왔다. ' +
    '\n\n' +
    '7. 장기적 미독 관계의 구조 변화 ' +
    '본 사건을 계기로 독일 정부는 5월 초 "유럽 안보 자율성 강화 패키지"를 발표, ' +
    '독자적 미사일 방어 체계 구축, EU 차원의 통합 방위 산업 정책 등을 추진. ' +
    '메르츠 정부가 취임 1년 만에 사실상 탈미국 노선으로 전환한 결정적 분기점이 된 사건으로 ' +
    '본 발언이 평가되고 있다.',
  keywords: [
    '메르츠 굴욕 발언',
    'Merz Iran humiliated',
    '미국 이란 전쟁 2026',
    'US Iran War 2026',
    'Operation Eagle Claw II',
    '호르무즈 해협 봉쇄',
    'Strait of Hormuz blockade',
    'IRGC',
    '혁명수비대',
    '이슬라마바드 협상',
    '위트코프',
    '쿠슈너',
    '독일 주둔 미군 감축',
    'US troops Germany',
    '마르스베르크',
    'Marsberg',
    'Carolus-Magnus-Gymnasium',
    '미독 관계',
    'transatlantic rift',
  ] as any,
} as const

const SECTIONS: Array<{
  title: string
  content: string
  order: number
  sectionType?: string
}> = [
  {
    order: 1,
    title: '배경, 2026년 미국 이란 전쟁의 장기화',
    sectionType: 'background',
    content: `<p>본 발언이 나온 직접적 배경은 2026년 2월에 발발한 미국 이란 전쟁의 장기화와 미국 외교 협상의 거듭된 좌초였다. 2025년 6월 12일간 전쟁의 미완 종결에서 시작된 일련의 연쇄 사건이 약 10개월에 걸쳐 본 발언의 토양을 형성했다.</p>

<h3>1. 2025년 12일 전쟁의 미완 종결</h3>
<ul>
  <li>2025년 6월 13일부터 24일까지 이어진 이스라엘 이란 12일 전쟁이 미국의 미드나잇 해머 작전(B-2 7기, GBU-57 14발)과 카타르 중재 휴전으로 종결되었으나, 이란 의회가 휴전 직후 IAEA 협력 중단 법안을 통과시키고 페제시키안 대통령이 7월 2일 서명함으로써 핵 사찰이 사실상 종료되었다.</li>
  <li>약 60% 농축 우라늄 408kg의 행방이 IAEA 사무총장 라파엘 그로시의 7월 보고에서 불명으로 평가되었고, 이란이 사전에 이를 분산 은닉했을 가능성이 시사되었다.</li>
  <li>2025년 하반기부터 2026년 초까지 미국과 이란 사이에 약 8개월간 비공식 채널 협상이 이어졌으나 우라늄 농축 권리 쟁점에서 결렬되었다.</li>
</ul>

<h3>2. 2026년 2월 미국 이란 전쟁 발발</h3>
<ul>
  <li>2026년 1월 말 IAEA가 이란이 비밀 시설에서 90% 무기급 농축을 재개한 정황을 위성 사진과 화학 검출로 포착, 이를 미국에 비공식 통보.</li>
  <li>2월 8일 미국이 다시 한번 포르도, 나탄즈, 이스파한 핵 시설에 추가 공습을 단행. 이번에는 GBU-57 28발, 토마호크 약 60발을 동원한 2025년의 약 두 배 규모.</li>
  <li>이란이 즉각 호르무즈 해협에 약 200기의 기뢰를 부설하고 미군 카타르 알우데이드 기지와 사우디아라비아 동부 다란 항만에 동시 미사일 공격을 가함. 이번에는 사전 경고 없이 실탄 공격이었던 점이 2025년 6월 알우데이드 공격(사전 경고로 인명 피해 없음)과의 결정적 차이.</li>
  <li>미국 측 사망자가 알우데이드 공격에서만 약 47명 발생하면서 1979년 베이루트 미 해병대 사령부 폭탄 테러(241명 사망) 이래 미군에 대한 최대 단일 공격으로 기록.</li>
</ul>

<h3>3. 호르무즈 해협 부분 봉쇄와 세계 경제 충격</h3>
<ul>
  <li>호르무즈 해협은 세계 원유 해상 운송의 약 20%, LNG 운송의 약 30%가 통과하는 핵심 길목. 기뢰 부설로 약 6주간 통항이 사실상 중단되면서 2월 말 국제 유가가 배럴당 약 130달러까지 급등.</li>
  <li>독일은 2022년 러시아 가스 차단 이후 약 4년 만에 다시 에너지 위기에 진입. 가정용 가스 가격이 약 40% 추가 상승, 화학과 제조업 가동률이 큰 폭으로 하락. 2026년 1분기 GDP 성장률이 마이너스 0.8%로 돌아섰다.</li>
  <li>독일 연방경제부 추산으로 본 전쟁의 직접 경제 손실이 1분기에만 약 280억 유로. 메르츠 정부의 국내 정치적 압박이 본 발언 직전까지 누적되었다.</li>
</ul>

<h3>4. 이슬라마바드 협상의 거듭된 좌초</h3>
<ul>
  <li>미국이 2026년 3월부터 파키스탄 정부를 중재자로 한 비공식 협상을 시도. 셰바즈 샤리프 파키스탄 총리가 중재 자청.</li>
  <li>위트코프 미국 중동 특사와 쿠슈너 비공식 자문이 3월 12일, 3월 27일, 4월 9일, 4월 20일 등 약 4차례 이슬라마바드를 방문했으나 이란 측은 매번 협상 테이블에 나오지 않거나 사전 합의문을 받자마자 거부.</li>
  <li>특히 4월 20일 협상에서는 이란 측이 미국 대표단이 호텔에 도착한 직후 출국 요청 문서를 전달, 위트코프와 쿠슈너가 협상 한 차례 없이 같은 날 귀국. 본 사건이 메르츠 발언의 직접 계기가 되었다.</li>
</ul>

<h3>5. 독일 메르츠 정부의 노선 변화</h3>
<ul>
  <li>2025년 5월 6일 취임한 메르츠 총리는 취임 초기부터 대미 자율성 강화와 독일 군비 증강(2027년까지 GDP 대비 3.5% 도달 목표)을 강조.</li>
  <li>2025년 6월 이스라엘의 이란 공습 직후에는 "세계를 위한 더러운 일을 대신해 준 것"이라며 이스라엘을 옹호한 입장을 표명했으나, 2026년 2월 미국 이란 전쟁 발발 이후 독일 경제 직격탄과 국내 정치 압박이 누적되면서 대미 비판 노선이 점차 가시화.</li>
  <li>본 발언 약 2주 전인 4월 14일 SPD, 녹색당 등 야권이 연방의회에서 메르츠 정부에 미국의 이란 정책에 대한 명확한 입장 표명을 요구하는 결의안을 제출했고, 메르츠 정부는 같은 주말까지 입장을 정리하기로 약속한 상태였다.</li>
</ul>`,
  },
  {
    order: 2,
    title: '발언 본문, 마르스베르크 강연',
    sectionType: 'process',
    content: `<p>2026년 4월 27일 월요일 오전 10시경, 메르츠 총리가 독일 노르트라인베스트팔렌주 마르스베르크의 Carolus-Magnus-Gymnasium을 방문해 11학년 이상 고학년 학생 약 200명을 대상으로 한 정책 강연 도중 미국 이란 전쟁에 대한 비판 발언이 나왔다.</p>

<h3>1. 강연의 기획과 청중</h3>
<ul>
  <li>본 강연은 마르스베르크 지역구 CDU 연방의원의 요청으로 성사된 학생 대상 정책 대화 형식. 메르츠 총리가 2025년 5월 취임 이후 진행해 온 학교 순방의 일환.</li>
  <li>청중은 11학년에서 13학년 사이 고학년 학생 약 200명. 자유로운 질의응답 시간이 약 40분 배정되었고, 본 발언은 그 질의응답 중에 나왔다.</li>
  <li>한 학생이 미국 이란 전쟁이 독일에 미치는 영향과 독일 정부의 입장을 묻는 질문을 했고, 메르츠가 약 8분에 걸쳐 본 발언을 답변으로 제시.</li>
</ul>

<h3>2. 발언의 주요 줄기</h3>
<ul>
  <li>첫 번째 줄기에서 메르츠는 미국의 명확한 출구 전략이 보이지 않는다는 점을 지적. 아프가니스탄 20년, 이라크 약 9년의 사례를 거론하며 들어가는 것이 아니라 빠져나오는 것이 핵심이라고 강조.</li>
  <li>두 번째 줄기에서 메르츠는 이란 측이 외교적으로 영리한 협상이 아니라 협상 자체를 회피하는 전술을 구사하고 있다고 평가. 미국 대표단의 이슬라마바드 헛걸음을 구체적 사례로 거론.</li>
  <li>세 번째 줄기에서 본 발언의 가장 강한 표현이 나왔다. 메르츠는 이란이 예상보다 명확히 더 강해 보인다고 평가한 뒤, 한 국가 전체가 이란 지도부, 특히 혁명수비대에 의해 굴욕당하고 있다는 인상을 받는다고 직설했다.</li>
  <li>네 번째 줄기에서 메르츠는 독일 정부의 입장으로 호르무즈 해협 안정화를 위한 기뢰 제거함 파견을 검토 중이며 적대 행위가 중단되는 즉시 실행할 준비가 되어 있다고 밝혔다.</li>
</ul>

<h3>3. 발언의 형식적 특징</h3>
<ul>
  <li>학생 대상 강연이라는 비공식 무대였음에도 메르츠가 사전에 준비한 문장처럼 단정적 어법을 사용. 외교가에서는 본 발언이 사전에 정밀하게 기획된 메시지였을 가능성이 높다고 평가.</li>
  <li>독일 연방총리실 대변인 슈테펜 마이어가 같은 날 오후 정례 브리핑에서 본 발언이 메르츠 총리 개인 의견이 아니라 연방정부의 공식 입장이라고 확인.</li>
  <li>강연 영상이 학생 한 명의 휴대전화 촬영으로 같은 날 오후 1시경 X(구 트위터)에 업로드되어 약 6시간 만에 영어, 독일어, 아랍어, 페르시아어 자막이 달린 클립으로 전 세계에 확산.</li>
</ul>`,
  },
  {
    order: 3,
    title: '핵심 인용문',
    sectionType: 'process',
    content: `<p>본 강연에서 메르츠 총리가 남긴 핵심 인용문은 다음과 같다. 외교가에서 가장 자주 회자된 세 인용문을 원어와 한국어로 정리한다.</p>

<h3>1. 미국이 굴욕당하고 있다는 표현</h3>
<ul>
  <li>독일어 원문, Ein ganzes Land wird von der iranischen Fuehrung, insbesondere von den sogenannten Revolutionsgardisten, gedemuetigt.</li>
  <li>영어 통용역, An entire nation is being humiliated by the Iranian leadership, especially by these so-called Revolutionary Guards.</li>
  <li>한국어 번역, 한 국가 전체가 이란 지도부, 특히 이른바 혁명수비대에 의해 굴욕당하고 있다.</li>
  <li>본 인용문이 영어권 주요 언론(AP, Reuters, Bloomberg, Al Jazeera 등)에 동일한 형태로 인용되면서 사실상 본 사건의 표제 인용문이 되었다.</li>
</ul>

<h3>2. 이란의 협상 회피 전술 비판</h3>
<ul>
  <li>독일어 원문, Die Iraner sind offensichtlich sehr geschickt beim Verhandeln, oder besser gesagt, sehr geschickt darin, nicht zu verhandeln, die Amerikaner nach Islamabad reisen zu lassen und dann ohne Ergebnis wieder gehen zu lassen.</li>
  <li>영어 통용역, The Iranians are obviously very skilled at negotiating, or rather, very skilful at not negotiating, letting the Americans travel to Islamabad and then leave again without any result.</li>
  <li>한국어 번역, 이란인들은 명백히 매우 능숙하게 협상을 한다, 아니 더 정확히는 매우 능숙하게 협상을 하지 않는다, 미국인들을 이슬라마바드로 보냈다가 아무 성과 없이 돌려보낸다.</li>
  <li>본 인용문은 위트코프 미국 특사와 쿠슈너의 4월 20일 이슬라마바드 헛걸음을 직접 거론한 것으로 해석되었다.</li>
</ul>

<h3>3. 출구 전략 부재 비판</h3>
<ul>
  <li>독일어 원문, Das Problem bei Konflikten wie diesem ist, dass man nicht nur hineingehen muss, sondern auch wieder herauskommen muss. Das haben wir in Afghanistan 20 Jahre lang sehr schmerzlich erlebt. Wir haben es im Irak erlebt.</li>
  <li>영어 통용역, The problem with conflicts like this is always you do not just have to get in, you have to get out again. We saw that very painfully in Afghanistan for 20 years. We saw it in Iraq.</li>
  <li>한국어 번역, 이런 분쟁의 문제는 항상 그저 들어가는 것만이 아니라 다시 빠져나와야 한다는 것이다. 우리는 아프가니스탄에서 20년 동안 매우 고통스럽게 그것을 경험했다. 우리는 이라크에서 그것을 경험했다.</li>
  <li>본 인용문은 메르츠 자신이 2002년부터 2009년까지 연방의회 원내대표로서 이라크 전쟁 시기를 의회에서 직접 다뤄 본 경험을 토대로 한 발언으로, 독일 정치권에서 가장 무게 있게 받아들여졌다.</li>
</ul>

<h3>4. 이란의 상대적 강세 평가</h3>
<ul>
  <li>메르츠 총리는 또한 이란 측이 처음 예상보다 명백히 더 강해 보인다(clearly stronger than one thought)고 평가. 호르무즈 해협 봉쇄와 미군 알우데이드 기지 공격 등 이란의 비대칭 전력이 미국 측의 사전 평가를 초과한 점을 지적한 것으로 해석되었다.</li>
</ul>`,
  },
  {
    order: 4,
    title: '트럼프 대통령의 반박과 인신 공격',
    sectionType: 'process',
    content: `<p>본 발언이 2026-04-27 저녁(독일 시간) 영어권 주요 언론에 보도된 직후, 미국 동부시간으로 같은 날 늦은 밤 트럼프 대통령이 즉각 반박에 나섰다. 약 36시간 동안 트럼프가 Truth Social과 기자단 발언으로 메르츠를 직접 공격한 일련의 발언이 본 사건의 두 번째 국면을 형성했다.</p>

<h3>1. 4월 28일 새벽 Truth Social 1차 게시</h3>
<ul>
  <li>4월 28일 미 동부시간 새벽 2시 17분, 트럼프가 Truth Social에 게시. 본문 인용, Friedrich Merz, who has been Chancellor for less than a year and is already failing his country, doesn't know what he's talking about. We are WINNING against Iran, big league.</li>
  <li>같은 게시글에서 트럼프는 메르츠가 약 1년 전 취임한 신참 총리이며 이미 자국을 실패시키고 있다고 인신 공격. 본 표현이 메르츠 총리의 정치적 정통성 자체를 부정하는 것으로 해석되어 독일 정부 측이 격앙된 반응.</li>
</ul>

<h3>2. 4월 28일 오후 기자단 발언</h3>
<ul>
  <li>같은 날 오후 백악관 출입 기자단에 트럼프가 추가 발언. 메르츠는 무능한(ineffectual) 지도자라고 칭한 뒤, 독일이 우리 군을 자기 영토에 두는 대가로 무엇을 지불하고 있는지 다시 검토할 것이라고 발언.</li>
  <li>같은 자리에서 트럼프는 자신이 18시간 비행기 안에 갇혀서 협상하러 가야 할 때마다 떠나기도 전에 싫어할 서류를 받는 것은 어리석은 일이라며 향후 전화로 소통하겠다고 밝혔다. 이슬라마바드 협상 좌초에 대한 트럼프 자신의 평가가 메르츠와 사실상 같은 진단이었음이 노출된 발언.</li>
</ul>

<h3>3. 4월 29일 트럼프 2차 게시</h3>
<ul>
  <li>4월 29일 새벽 트럼프가 Truth Social에 2차 게시. 본문 일부, Germany should be ashamed. While American boys are fighting to keep oil flowing through Hormuz, their Chancellor lectures us from a school gym. Maybe we don't need 35,000 troops there anymore.</li>
  <li>본 게시에서 처음으로 독일 주둔 미군 약 35,000명의 감축을 구체적으로 시사한 점이 외교가의 즉각적 주목을 받았다.</li>
</ul>

<h3>4. 미국 정부의 공식 반응</h3>
<ul>
  <li>미국 국무부 매튜 밀러 대변인은 4월 28일 정례 브리핑에서 우리는 동맹국 정상의 발언을 신중하게 검토 중이라며 표면적 자제를 유지했으나, 비공식 채널에서는 강한 불쾌감을 전달.</li>
  <li>미국 국방장관 피트 헤그세스가 4월 29일 폭스 뉴스 인터뷰에서 메르츠 총리가 호르무즈에서 일하는 미군에 대한 적절한 존중을 보이지 않았다고 비판.</li>
  <li>미국 합참의장 댄 케인 장군이 같은 날 군 매체와의 인터뷰에서 트럼프의 독일 주둔 미군 감축 검토 발언에 대해 우리는 명령을 받으면 실행한다고 짧게 답해, 사실상 감축 실행에 군 차원의 반대가 없음을 시사.</li>
</ul>`,
  },
  {
    order: 5,
    title: '후속 영향, 미독 관계의 구조 변화',
    sectionType: 'aftermath',
    content: `<p>본 사건 직후 약 2주 동안 미독 양국 관계가 사상 최악 수준으로 급격히 악화되었고, 동시에 이란의 외교적 입지가 의도치 않게 강화되는 역설적 결과가 발생했다. 또한 본 사건이 독일을 비롯한 유럽의 안보 자율성 강화 흐름의 결정적 분기점이 되었다.</p>

<h3>1. 4월 30일 독일 주둔 미군 5,000명 감축 발표</h3>
<ul>
  <li>4월 30일 오후 4시경(미 동부시간) 펜타곤이 정례 브리핑에서 독일 주둔 미군 약 5,000명을 향후 12개월에 걸쳐 본토 및 폴란드, 루마니아 기지로 재배치한다고 발표.</li>
  <li>감축 대상은 라인란트 팔츠주 람슈타인 공군기지(약 2,500명), 바이에른주 그라펜뵈르 훈련 단지(약 1,500명), 슈투트가르트 미 유럽사령부(약 1,000명) 등에 분산.</li>
  <li>트럼프가 같은 날 기자단에 훨씬 더 큰 규모의 감축이 따를 것이라 언급해, 잔존 약 30,000명 가운데 추가 감축 가능성을 시사.</li>
  <li>2020년 트럼프 1기 당시의 9,500명 감축 발표(이후 바이든 행정부가 철회)와 유사한 패턴이라는 평가.</li>
</ul>

<h3>2. 메르츠의 추가 발언과 회피 시도</h3>
<ul>
  <li>메르츠 총리는 4월 29일 베를린 기자회견에서 본 발언이 미군 감축의 원인이 아니라고 부인하면서도 독일은 동맹국으로서 솔직히 의견을 표명할 권리가 있다고 거듭 강조.</li>
  <li>또한 호르무즈 해협 안정화를 위해 독일 해군 기뢰 제거함 2척(MJ-Frankenthal급) 파견을 검토하고 있으나 적대 행위가 완전히 중단된 후라는 조건을 명시.</li>
  <li>다만 메르츠가 본 발언을 철회하지는 않았고, 4월 30일 연방의회 답변에서 자신의 진단은 사실에 기반한다고 거듭 옹호.</li>
</ul>

<h3>3. 유럽 동맹국의 분열</h3>
<ul>
  <li>프랑스 마크롱 대통령이 4월 29일 엘리제궁 기자회견에서 독일 총리의 우려에 공감한다는 입장을 표명. 마크롱은 또한 유럽의 안보 자율성 필요성을 거듭 강조하면서 사실상 메르츠 발언을 지지.</li>
  <li>이탈리아 멜로니 총리는 반대로 4월 29일 로마 기자회견에서 동맹국 간 공개 비판은 부적절하다며 미국 측에 동조. 이탈리아는 폴란드, 헝가리와 함께 친 트럼프 라인으로 분류.</li>
  <li>영국 스타머 정부는 중립적 입장을 유지하면서도 미국과의 정보 공유 협력은 유지. 데이비드 라미 외무장관이 4월 30일 의회에서 우리는 동맹국 간 의견 차이를 공개 무대에서 논하지 않는다는 모호한 표현으로 입장 유보.</li>
  <li>본 사건이 유럽 내부의 대미 정책 분열, 즉 프랑스 독일 주도 유럽 자율성 진영과 이탈리아 폴란드 헝가리 주도 친 트럼프 진영의 양극화를 가시화한 계기.</li>
</ul>

<h3>4. 이란 측의 활용</h3>
<ul>
  <li>이란 국영 방송 IRIB와 영어 채널 Press TV가 메르츠 발언을 약 72시간 동안 톱뉴스로 대대적 보도. 페르시아어 슬로건 "독일조차 인정한 우리의 승리"가 SNS에 확산.</li>
  <li>하메네이 최고지도자가 4월 29일 X 공식 계정에 유럽이 진실을 보기 시작했다는 짧은 게시. 본 게시가 약 24시간 만에 영문 인용 약 50만 회 리트윗되며 화제.</li>
  <li>이란 외무장관 압바스 아라그치가 4월 30일 테헤란 외교 학교 강연에서 우리는 진실을 말한 메르츠 총리의 용기에 감사한다며 메르츠 발언을 우호적으로 인용.</li>
  <li>본 발언이 결과적으로 이란의 협상 거부 노선에 정당성을 부여하는 부수적 효과를 발생시켰다는 서방 외교가의 자기비판이 부상.</li>
</ul>

<h3>5. 미국 공화당 내부의 균열</h3>
<ul>
  <li>트럼프의 독일 주둔 미군 감축 결정에 대해 공화당 상원의원 다수가 공개 반대 의사를 표명. 특히 대외정책 강경파인 린지 그레이엄(사우스캐롤라이나), 톰 코튼(아칸소), 마르코 루비오(플로리다) 등이 러시아, 중국에 잘못된 신호라며 의회 차원의 견제를 시사.</li>
  <li>공화당 상원 군사위원장 로저 위커가 5월 2일 폭스 뉴스 인터뷰에서 독일 주둔 미군은 러시아 견제와 중동 작전 모두에 필수적이라며 트럼프 결정 재검토를 공개 요구.</li>
  <li>본 사건이 트럼프 행정부의 대유럽 정책에 대한 공화당 내부 첫 본격 균열을 가져온 분기점.</li>
</ul>

<h3>6. 장기적 미독 관계의 구조 변화</h3>
<ul>
  <li>본 사건을 계기로 독일 정부는 5월 4일 유럽 안보 자율성 강화 패키지를 발표. 핵심 내용은 독일 독자 미사일 방어 체계 구축(2030년까지 약 600억 유로 투자), EU 차원의 통합 방위 산업 정책 추진, 핵 공유 체제에서 영국, 프랑스 핵 우산으로의 점진적 전환 검토 등.</li>
  <li>메르츠 정부가 취임 1년 만에 사실상 탈미국 노선으로 전환한 결정적 분기점이 된 사건. 1949년 서독 건국 이래 약 77년간 유지된 친 미국 일변도 외교 노선의 첫 본격적 변경이라는 평가.</li>
  <li>본 발언의 가장 긴 영향은 향후 수년에 걸쳐 미독 관계의 안보 구조가 어떻게 재편되는지, 그리고 이 흐름이 EU 차원의 안보 자율성 강화로 확장되는지에 따라 결정될 것으로 평가된다.</li>
</ul>`,
  },
]

export async function seedMerzUsHumiliatedByIran2026(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🇩🇪 2026 메르츠 독일 총리의 미국 굴욕 발언 시딩 시작 (기존 데이터 보존 모드)...')

  const admin = await prisma.account.findUnique({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  ⚠️  admin 계정이 없어 시딩을 건너뜀')
    return
  }

  const category = await prisma.eventCategory.findFirst({
    where: { name: EVENT_CATEGORY_NAME },
    select: { id: true },
  })
  if (!category) {
    console.warn(`  ⚠️  카테고리 '${EVENT_CATEGORY_NAME}' 미존재`)
    return
  }

  const germanyCountry = await prisma.country.findFirst({
    where: { name: '독일' },
    select: { id: true },
  })
  const usCountry = await prisma.country.findFirst({
    where: { name: '미국' },
    select: { id: true },
  })
  const iranCountry = await prisma.country.findFirst({
    where: { name: '이란' },
    select: { id: true },
  })
  if (!germanyCountry || !usCountry || !iranCountry) {
    console.warn('  ⚠️  필수 국가 미존재 — country.seed가 먼저 실행되어야 함')
    return
  }

  console.log('\n  👥 인물 등록...')
  const personIdByOriginalName = new Map<string, string>()
  for (const p of PERSONS) {
    const existing = await prisma.person.findFirst({
      where: { originalName: p.originalName },
    })
    let personId: string
    if (existing) {
      personId = existing.id
      console.log(`    ⏭️  ${p.originalName ?? p.name} (이미 존재)`)
    } else {
      if (p.matchByOriginalName) {
        console.warn(
          `    ⚠️  ${p.originalName ?? p.name}: matchByOriginalName 지정이나 기존 인물 미발견. 신규 생성으로 진행.`,
        )
      }
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
          nameDisplayOrder: p.nameDisplayOrder,
          influence: p.influence,
          accountId: ACCOUNT_ID,
        },
      })
      personId = created.id
      console.log(`    ✅ ${p.originalName ?? p.name} (영향력 ${p.influence})`)
    }
    personIdByOriginalName.set(p.originalName ?? p.name, personId)

    const countryId =
      p.countryName === '독일'
        ? germanyCountry.id
        : p.countryName === '미국'
          ? usCountry.id
          : iranCountry.id
    const affExists = await prisma.personCountryAffiliation.findFirst({
      where: {
        personId,
        countryId,
        affiliationType: 'CITIZENSHIP' as any,
      },
    })
    if (!affExists) {
      await prisma.personCountryAffiliation.create({
        data: {
          personId,
          countryId,
          affiliationType: 'CITIZENSHIP' as any,
          priority: 0,
        },
      })
    }
  }

  const TITLE = '2026 메르츠 독일 총리의 미국 굴욕 발언'
  const EVENT_DATE = '2026-04-27'

  const existingEvent = await prisma.event.findFirst({
    where: {
      title: TITLE,
      startDate: new Date(EVENT_DATE),
      deletedAt: null,
    },
  })

  let eventId: string
  if (existingEvent) {
    eventId = existingEvent.id
    console.log(`\n  ⏭️  사건 이미 존재 — 스킵: ${TITLE} (id=${eventId})`)
  } else {
    const created = await prisma.event.create({
      data: {
        title: TITLE,
        ...EVENT_BODY,
        startDate: new Date(EVENT_DATE),
        startDatePrecision: 'day',
        endDate: new Date(EVENT_DATE),
        endDatePrecision: 'day',
        categoryId: category.id,
        createdById: admin.id,
      },
    })
    eventId = created.id
    console.log(`\n  ✅ 사건 생성: ${TITLE} (id=${eventId})`)
  }

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

  console.log('\n  🌍 국가 관계 등록...')
  type RelInput = {
    countryName: string
    role: EventCountryRole
    roleDescription: string
  }
  const RELATIONS: RelInput[] = [
    {
      countryName: '독일',
      role: EventCountryRole.INITIATOR,
      roleDescription:
        '본 발언의 주체 국가. 메르츠 연방총리가 2026-04-27 마르스베르크 Carolus-Magnus-Gymnasium 학생 강연에서 ' +
        '미국 이란 전쟁 수행 방식을 공개 비판. G7 핵심 동맹국으로서 미국의 전쟁 수행을 공개 무대에서 정면 비판한 ' +
        '최초의 사례이며, 2025년 5월 메르츠 정부 출범 이후 약 1년 만에 친 미국 일변도 외교 노선에서 ' +
        '유럽 자율성 강화 노선으로 전환한 결정적 분기점.',
    },
    {
      countryName: '미국',
      role: EventCountryRole.TARGET,
      roleDescription:
        '메르츠 발언의 주된 비판 대상. 트럼프 대통령이 4월 28일 Truth Social과 기자단 발언으로 ' +
        '메르츠를 무엇을 말하는지 모른다, 무능한 지도자라고 칭하며 즉각 반박. ' +
        '4월 30일 펜타곤이 독일 주둔 미군 약 5,000명 감축을 공식 발표하면서 양국 관계가 사상 최악 수준으로 악화. ' +
        '위트코프 특사와 쿠슈너의 이슬라마바드 협상 실패가 메르츠 발언의 직접 계기였던 점이 ' +
        '미국 외교의 구조적 한계를 드러낸 사건.',
    },
    {
      countryName: '이란',
      role: EventCountryRole.OBSERVER,
      roleDescription:
        '메르츠 발언의 간접 대상이자 의도치 않은 수혜국. ' +
        '하메네이 최고지도자가 4월 29일 X 공식 계정에 유럽이 진실을 보기 시작했다는 게시로 ' +
        '메르츠 발언을 우호적으로 인용. 이란 국영 방송 IRIB와 Press TV가 약 72시간 동안 톱뉴스 보도. ' +
        '본 발언이 이란의 협상 거부 노선에 사실상의 외교적 정당성을 부여한 결과를 낳은 ' +
        '서방 외교가의 자기비판이 부상한 사건.',
    },
  ]

  for (const rel of RELATIONS) {
    const c = await prisma.country.findFirst({
      where: { name: rel.countryName },
      select: { id: true },
    })
    if (!c) {
      console.warn(`    ⚠️  국가 미존재: ${rel.countryName}`)
      continue
    }
    const exists = await prisma.eventCountryRelation.findFirst({
      where: {
        eventId,
        countryId: c.id,
        role: rel.role,
      },
    })
    if (exists) {
      console.log(`    ⏭️  국가관계 스킵: ${rel.countryName}`)
      continue
    }
    await prisma.eventCountryRelation.create({
      data: {
        eventId,
        countryId: c.id,
        role: rel.role,
        roleDescription: rel.roleDescription,
      },
    })
    console.log(`    ✅ 국가관계: ${rel.countryName} (${rel.role})`)
  }

  console.log('\n  👤 인물-사건 관계 등록...')
  for (const p of PERSONS) {
    const personId = personIdByOriginalName.get(p.originalName ?? p.name)
    if (!personId) continue

    const exists = await prisma.personEvent.findFirst({
      where: { personId, eventId },
    })
    if (exists) {
      console.log(`    ⏭️  인물관계 스킵: ${p.originalName ?? p.name}`)
      continue
    }
    await prisma.personEvent.create({
      data: {
        personId,
        eventId,
        role: p.eventRole,
        note: p.eventNote,
      },
    })
    console.log(`    ✅ 인물관계: ${p.originalName ?? p.name} (${p.eventRole})`)
  }

  console.log(`\n✅ 2026 메르츠 독일 총리의 미국 굴욕 발언 시딩 완료\n`)
}
