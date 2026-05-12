/**
 * 1차 아편전쟁 (First Opium War, 1839 ~ 1842) 시드
 *
 * 부모 사건: 1차 아편전쟁 (1839-09-04 ~ 1842-08-29)
 * 자식 사건:
 *   - 천비 해전 (Battle of Chuenpi, 1839-11-03) — 첫 본격 해전
 *   - 진강 전투 (Battle of Zhenjiang, 1842-07-21) — 결정적 청군 패배
 *
 * 등록 항목:
 *  - 청나라 HistoricalCountry (시드에 없으면 인라인 생성)
 *  - Event x3 (부모/자식 2)
 *  - EventSection x3 (배경/경과/결과)
 *  - EventCountryRelation
 *  - BelligerentSide x2 (영국 측 / 청 측) + CountryInSide
 *  - MilitaryDetailsNorm
 *  - CasualtiesData
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

const EVENT_CATEGORY_NAME = '전쟁/군사'

interface BelligerentInput {
  code: 'britain' | 'qing'
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

// ── 부모 사건 본문 (재시드 시 매번 최신 서술로 갱신) ─────────────────────────
const PARENT_EVENT_BODY = {
  description:
    '1839년 9월 4일 ~ 1842년 8월 29일, 영국이 對청 아편 무역 단속을 명분으로 청에 출병한 전쟁. ' +
    '18세기 후반 누적된 영국의 對청 무역 적자를 인도산 아편 밀수로 상쇄하던 구도가 ' +
    '청의 단속(임칙서, 1839)으로 깨지자, 영국은 자유무역과 자국 상인 보호를 명분으로 ' +
    '1840년 4월 의회 표결(271:262)을 거쳐 동방원정군을 파견했다. ' +
    '압도적 함포 화력과 증기선(네메시스호 등) 기동력 앞에 청 정규군은 광저우·딩하이·샤먼·닝보·우송·진강에서 ' +
    '차례로 붕괴했고, 진강 함락(1842-07-21)으로 양쯔강·대운하 결절점이 끊기자 도광제는 강화 협상을 명령했다. ' +
    '1842년 8월 29일 영국 군함 콘월리스호 함상에서 체결된 난징 조약은 ' +
    '(1)홍콩 영구 할양 (2)광저우·샤먼·푸저우·닝보·상하이 5개 항구 개항 (3)배상금 2,100만 은량 ' +
    '(4)협정관세(관세 자주권 상실) (5)공행(公行) 독점 폐지를 청에 강요했고, ' +
    '이후 1843년 후먼 추가조약과 1844년 망하조약(미국)·황포조약(프랑스)으로 영사재판권·최혜국 대우가 일괄 확산되며 ' +
    '청은 본격적인 반(半)식민지 체제로 진입했다. ' +
    '이는 동아시아 근대 불평등 조약 체제의 원형이자, 일본 메이지 유신·조선 위정척사·청 태평천국의 난(1851) 등 ' +
    '동아시아 근대사의 분기점을 만든 결정적 사건이다.',
  location:
    '광둥성·푸젠성·저장성·장쑤성 일대 (광저우·후먼·천비·샤먼·딩하이·전해·닝보·우송·상하이·진강·난징)',
  background:
    '무역 구조의 비대칭. 18세기 중반 이후 유럽 귀족·중산층 사이에 청 차(茶) 소비가 폭발적으로 증가하면서 ' +
    '영국은 차·도자기·비단을 대량 수입해야 했다. 청은 자급자족적 농경 제국으로 영국산 모직물·금속제품 수요가 미미했고, ' +
    '결제는 거의 전적으로 은(銀)으로 이루어져 1700년대 말 이미 영국발 은 유출이 누적 4억 은량을 넘었다. ' +
    '\n\n' +
    '아편 밀수의 폭발. 영국 동인도회사는 적자 해소를 위해 인도 벵골·비하르 일대에서 재배한 아편을 청 연안에 밀수출하기 시작, ' +
    '1820년대에는 對청 아편 수출액이 차 수입액을 상회하기 시작해 무역 수지가 역전되었다. ' +
    '연간 청 유입량은 1820년 약 4,000상자 → 1830년 약 1.8만 상자 → 1838년 약 4만 상자(약 2,400톤)로 폭증, ' +
    '청 사회에서는 관리·병사·일반 백성을 가리지 않는 광범위한 중독자 발생과 은 유출(연간 약 2,000만 은량) 문제가 동시에 심화되었다. ' +
    '\n\n' +
    '청 조정 내 논쟁과 강경책. 도광제 즉위(1820) 이후 아편 단속론(엄금론)과 합법화론(이금론)이 대립했으나, ' +
    '1838년 11월 도광제는 임칙서(林則徐)의 "주의(籌議)" 상소를 채택해 엄금론을 확정. ' +
    '1839년 1월 임칙서를 흠차대신·양광총독에 임명해 광저우에 파견했다. 임칙서는 1839년 3월 광저우 도착 후 ' +
    '"신변보증서(具結)" 제출을 요구하며 영국 상인의 마약 보유분 인도를 강제, ' +
    '약 1,400톤(공식 기록 2만 283상자, 약 1,200톤)을 압수해 ' +
    '1839년 6월 3일~25일 후먼(虎門) 해변에서 23일에 걸쳐 석회·물·소금으로 분해·폐기했다. ' +
    '\n\n' +
    '영국의 출병 결의. 영국 외상 파머스턴은 임칙서의 압수를 "영국 자산 침탈"로 규정, ' +
    '인도총독 오클랜드와 협의하여 1839년 11월부터 동방원정군 편성을 시작했다. ' +
    '의회는 1840년 4월 7~9일 토론을 거쳐 271 대 262라는 박빙 표차로 출병안을 가결, ' +
    '같은 해 6월 원정군이 마카오 부근에 도착하면서 사실상 전쟁이 시작되었다. ' +
    '명분은 자유무역과 자국 상인 보호였으나 실질적 목적은 청 시장의 강제 개방과 불평등 조약 체제 구축이었다.',
  aftermath:
    '난징 조약(1842-08-29). 영국 함대 기함 콘월리스(HMS Cornwallis)호 갑판에서 청 측 기영(耆英)·이리포(伊里布), ' +
    '영국 측 헨리 포팅거가 13개조 본조약에 서명. 핵심 조항은 ' +
    '(1)홍콩섬 영국 영구 할양 ' +
    '(2)광저우·샤먼·푸저우·닝보·상하이 5개항 개항 및 영국 영사 주재 허용 ' +
    '(3)배상금 2,100만 은량(아편 보상 600만 + 상관 채무 300만 + 전비 1,200만, 4년 분할 지불) ' +
    '(4)협정관세 — 5% 종가세를 양국 합의로 정해 청의 관세 자주권을 사실상 박탈 ' +
    '(5)공행(公行) 독점 폐지 — 13행이 독점하던 對외무역 체제를 해체, 영국 상인 자유 거래 보장 ' +
    '(6)양국 관리 대등 외교(평등 의례 적용)였다. ' +
    '\n\n' +
    '후속 조약과 불평등 체제 확산. 1843년 7월 후먼(虎門) 추가조약(中英五口通商章程·虎門條約附粘)으로 ' +
    '영사재판권(치외법권)과 최혜국 대우가 영국에 부여되었다. ' +
    '뒤이어 1844년 7월 망하(望廈) 조약(미국)과 10월 황포(黃埔) 조약(프랑스)을 통해 영국이 획득한 권리가 미국·프랑스로 자동 확산, ' +
    '영사재판권·최혜국대우·5개항 통상·관세 협정이 對서구 외교 전반에 일괄 적용되었다. ' +
    '청은 이로써 본격적인 반(半)식민지 체제로 진입했고, 이후 100여 년에 걸친 "굴욕의 세기"가 시작되었다. ' +
    '\n\n' +
    '청 내부의 후폭풍. 배상금 분할 지불을 위한 가렴주구(苛斂誅求)와 은가 폭등(은 유출 후폭풍)으로 ' +
    '농민 부담이 급증했고, 1851년 광시(廣西)에서 발발한 태평천국의 난(1851~1864)이라는 ' +
    '14년에 걸친 대규모 농민·종교 반란의 사회·경제적 토양이 되었다. ' +
    '동시에 청 지식인층 일부에서는 "해국도지(海國圖志)"(위원, 1843)를 비롯한 "사이장기이제이(師夷長技以制夷)" — ' +
    '서구의 장기를 배워 서구를 제압한다는 양무(洋務) 사상이 대두했으나, 본격적 양무운동은 ' +
    '2차 아편전쟁(1856~1860) 패배 후에야 시작되었다. ' +
    '\n\n' +
    '동아시아 충격과 분기. 일본 막부는 위원의 "해국도지"를 비롯한 한역서를 통해 청의 패전 양상을 신속히 파악, ' +
    '1842년 천보의 신수급여령(薪水給与令) 발령으로 이국선 타격령(1825)을 사실상 폐기하고 외국선에 대한 ' +
    '온건 대응으로 전환했으며, 이는 1853년 페리 흑선(黒船) 도래 후 개국·메이지 유신(1868)으로 가는 길을 열었다. ' +
    '조선은 반대로 위정척사론을 강화하며 쇄국을 고수, 결과적으로 1876년 강화도 조약까지 개국이 지연되었다. ' +
    '\n\n' +
    '2차 아편전쟁으로의 연결. 영국·프랑스는 5개항 개항만으로는 對청 무역 확대가 부족하다고 판단, ' +
    '추가 개항·공사 베이징 주재·아편 무역 합법화를 요구했다. 청 조정이 이를 거부하자 ' +
    '1856년 애로호(Arrow) 사건을 빌미로 2차 아편전쟁(1856~1860)이 발발, 1860년 영불 연합군이 베이징을 점령하고 ' +
    '원명원을 약탈·방화하기에 이르렀다. 1차 아편전쟁이 만든 불평등 조약 체제는 1949년 중화인민공화국 수립과 ' +
    '1997년 홍콩 반환에 이르기까지 동아시아 국제질서의 주축으로 작동했다.',
  keywords: [
    '1차 아편전쟁',
    'First Opium War',
    '난징 조약',
    'Treaty of Nanking',
    '홍콩 할양',
    '5개항 개항',
    '임칙서',
    '도광제',
    '찰스 엘리엇',
    '헨리 포팅거',
    '휴 고프',
    '윌리엄 파커',
    '관텐페이',
    '기영',
    '기선',
    '동인도회사',
    '아편 무역',
    '후먼 폐기',
    '천비 해전',
    '진강 전투',
    '네메시스호',
    '협정관세',
    '영사재판권',
    '최혜국 대우',
    '공행',
    '불평등 조약',
    '반식민지',
    '동아시아 근대',
  ] as any,
  warCost:
    '영국 직접 전비. 약 800만~900만 파운드 (1840~1842년 의회 추정, 인도군·해군 운용비 포함). ' +
    '청 측 부담. 난징 조약 배상금 2,100만 은량(약 당시 환산 1,470만 미국 달러 / 영국 약 700만 파운드 상당) — ' +
    '내역: 아편 보상 600만 은량 + 영국 상관(商館) 채무 300만 은량 + 영국 전비 1,200만 은량. 4년 분할 지불. ' +
    '부수 비용. 청 측은 별도로 광저우 시 배상(贖城費) 600만 은량 등 지방 지불금 다수, ' +
    '폐기된 아편 1,400톤(시장가 약 1,000만 은량 추산) + 전 기간 군비·해상 봉쇄 손실로 ' +
    '실질 경제 손실은 배상금의 2~3배로 추정됨. 은 유출 가속으로 1840년대 청 은가가 약 50% 폭등.',
} as const

// ── 자식 사건 본문 ───────────────────────────────────────────────────────────
const CHILD1_BODY = {
  description:
    '1839년 11월 3일 광저우만 입구 천비(穿鼻, Chuenpi) 인근에서 영국 해군 호위함 ' +
    'HMS 볼레이지(Volage, 28문)호와 HMS 하이어신스(Hyacinth, 18문)호 단 2척이 ' +
    '광동수사제독 관텐페이(關天培) 휘하 청 수군 정크선 29척과 충돌한 1차 아편전쟁의 첫 본격 해전. ' +
    '교전은 약 45분 만에 종료되었고, 영국 함정의 함포 사격으로 청 수군 정크 4척이 격침되고 다수가 대파, ' +
    '청 측 사상자는 약 15명 전사·전상자 다수에 달한 반면 영국군 손실은 1명 부상에 불과했다. ' +
    '양국 해군력의 결정적 격차를 단번에 드러내며 영국의 본격 출병을 가속화한 사건이다.',
  location: '광저우만 천비 — 호문(虎門) 입구 (현 광동성 둥관시 후먼진 인근)',
  background:
    '아편 압수 사건의 여파. 1839년 6월 임칙서가 광저우에서 약 1,400톤의 아편을 압수·폐기한 후, ' +
    '영국 무역감독관 찰스 엘리엇(Charles Elliot)은 영국 상인을 마카오로 철수시켰다. ' +
    '8월에는 마카오 인근 침사추이에서 영국 선원이 청인 임유희(林維喜)를 살해한 사건이 발생, ' +
    '엘리엇이 청 측 인도 요구를 거부하고 자체 재판 후 추방하면서 외교 갈등이 격화되었다. ' +
    '\n\n' +
    '청 측의 봉쇄와 신변보증서 요구. 임칙서는 영국 상인의 광저우 복귀 조건으로 ' +
    '"아편 휴대 시 사형, 화물 몰수에 동의"하는 신변보증서(具結) 제출을 재차 요구. ' +
    '엘리엇은 영국 무역선의 광저우 입항을 거부하고 11월 초 호위함 2척과 함께 광저우만에 머물며 무장 시위를 벌였다. ' +
    '\n\n' +
    '관텐페이의 출동. 11월 3일 토머스 쿠츠(Thomas Coutts)호 등 신변보증서를 받은 영국 상선 ' +
    '5척이 광저우 입항을 시도하자 엘리엇이 이를 저지, 해상 대치가 발생했다. ' +
    '광동수사제독 관텐페이가 정크 16척과 화선(火船) 13척으로 봉쇄에 나서면서 양측이 정면 충돌하게 되었다.',
  aftermath:
    '전술적 결과. 영국 함정 2척의 현측 일제 사격으로 청 수군 정크 4척이 격침되고 다수가 대파, ' +
    '관텐페이의 기함도 큰 피해를 입어 후퇴했다. 영국 측 손실은 볼레이지호 수병 1명 부상에 그쳤다. ' +
    '교전 직후 엘리엇은 도리어 청 측에 "영국 무역선 안전 보장"을 요구하는 서한을 발송했다. ' +
    '\n\n' +
    '전략적 영향. 이 해전은 청 수군의 정크선·화승총·구식 청동포 체계가 영국의 현측 함포 일제 사격에 ' +
    '전혀 대응하지 못함을 입증, 영국 본국 정부에 "전면 출병 시 결정적 승리 가능"이라는 확신을 주었다. ' +
    '엘리엇은 11월 13일자 보고서에서 "여왕 폐하의 함정 2척이 청 함대 전체를 압도했다"고 적었다. ' +
    '이 보고가 1840년 3월 런던에 도착하면서 의회 출병안 표결의 결정적 동력이 되었다. ' +
    '\n\n' +
    '청 조정의 인식 부재. 반면 임칙서는 11월 18일 도광제에게 보낸 보고에서 ' +
    '"영국 함정이 큰 손해를 입고 도주했다"는 사실과 정반대의 보고를 올렸다. ' +
    '이러한 정보 왜곡은 청 조정이 영국 군사력을 끝까지 과소평가하게 만든 핵심 요인이었으며, ' +
    '1840년 7월 정해(딩하이) 함락이라는 충격을 자초했다.',
  keywords: [
    '천비 해전',
    'Battle of Chuenpi',
    '천비',
    '관텐페이',
    '찰스 엘리엇',
    'HMS Volage',
    'HMS Hyacinth',
    '광동수사',
    '호문',
  ] as any,
} as const

const CHILD2_BODY = {
  description:
    '1842년 7월 21일 양쯔강과 대운하의 교차점인 진강(鎮江)에서 휴 고프 휘하 영국 원정군 약 6,900명이 ' +
    '만주 부도통 해령(海齡)이 지휘하는 만주 팔기 약 1,500명·녹영 약 2,000명의 청 수비대를 공격해 점령한 ' +
    '1차 아편전쟁의 결정적 전투. 영국군은 4개 여단으로 나뉘어 성벽을 동·서·남쪽에서 동시에 공격, ' +
    '약 4시간 만에 시가지를 장악했다. 만주 팔기 부대가 가족과 함께 집단 자결로 결사항전한 처절한 전투였으며, ' +
    '진강 함락으로 양쯔강·대운하의 핵심 결절점이 끊겨 베이징으로 가는 조운(漕運) 보급선이 차단되자 ' +
    '청 조정은 즉각 강화 협상을 결단했다. 한 달 뒤 난징 조약(1842-08-29) 체결로 이어진 사실상 ' +
    '전쟁 종결의 결정타였다.',
  location: '장쑤성 진강 — 양쯔강 남안·대운하 교차점 (현 장쑤성 전장시)',
  background:
    '1842년 영국군의 양쯔강 작전. 헨리 포팅거(전권대사)와 휴 고프(육군사령관)·윌리엄 파커(해군사령관)는 ' +
    '1841년 가을 닝보·딩하이·차포 등 저장성 연안을 차례로 점거한 뒤, 1842년 봄부터 ' +
    '베이징을 직접 위협하지 않고 양쯔강을 거슬러 청의 경제 동맥을 차단하는 전략으로 전환했다. ' +
    '\n\n' +
    '우송 전투(1842-06-16)와 상하이 무혈 점령. 6월 16일 우송 전투에서 양쯔강 어귀를 지키던 ' +
    '청 함대를 격멸, 6월 19일 상하이를 무혈 입성으로 장악했다. ' +
    '이로써 영국 함대는 양쯔강 본류로 진입할 교두보를 확보, 7월 초부터 ' +
    '증기선 네메시스호 등의 견인으로 전열함·수송선 70여 척이 양쯔강을 거슬러 올랐다. ' +
    '\n\n' +
    '진강의 전략적 가치. 진강은 양쯔강이 대운하와 교차하는 결절점으로, ' +
    '강남의 곡창 지대(소주·항주)에서 베이징으로 가는 조운(漕運·세미 운송)이 모두 통과하는 핵심 거점이었다. ' +
    '함락 시 베이징의 식량·세수 보급이 즉시 차단되어 정치적 압박이 극대화되는 위치였다. ' +
    '도광제는 강녕장군 덕주포(德珠布)와 만주 부도통 해령에게 사수를 명령, ' +
    '만주 팔기를 중심으로 약 3,500명의 수비대를 편성했다. ' +
    '\n\n' +
    '해령의 강경 방어 태세. 만주 부도통 해령은 진강 시내 잠재 첩자 색출을 명목으로 ' +
    '한족 주민 다수를 처형·구금하고, 만주 팔기 가족을 집결시켜 "성 함락 시 자결"을 결의하는 등 ' +
    '결사항전 분위기를 조성했다.',
  aftermath:
    '전술적 결과. 7월 21일 새벽 4시 영국군이 4개 여단(콜린 캠벨·바틀리·세흘러·로 빌리어) 약 6,900명으로 ' +
    '진강성을 동·서·남 3면에서 동시 공격. 사다리 등반·성문 폭파를 거쳐 4시간 만에 시가지를 장악했다. ' +
    '만주 부도통 해령은 자택에서 가족과 함께 자결, 만주 팔기 다수가 가족을 살해한 뒤 자결하거나 항전 중 전사. ' +
    '청군 전사 약 1,000명, 자결 가족 포함 사상자 추정 1,500~2,500명. ' +
    '영국군 사상자 약 185명(전사 36명, 전상 149명)으로 1차 아편전쟁 중 영국군이 가장 많은 사상자를 낸 전투였다. ' +
    '\n\n' +
    '전략적 결과. 진강 함락으로 대운하 조운이 즉각 차단되고 양쯔강 본류가 영국 함대에 완전 장악되었다. ' +
    '베이징으로 가는 식량·세수 공급이 끊긴다는 보고를 받은 도광제는 7월 말 기영(耆英)·이리포(伊里布)에게 ' +
    '강화 전권을 부여, 8월 9일 영국 함대 70여 척이 난징에 도착하면서 본격 협상이 시작되었다. ' +
    '8월 29일 콘월리스호 함상에서 난징 조약이 체결, 1차 아편전쟁이 사실상 종결되었다. ' +
    '\n\n' +
    '역사적 평가. 진강 전투는 만주 팔기의 군사적 정점이자 비극적 종언으로 평가된다. ' +
    '엥겔스는 후일 "영국군의 對청 신원정"(1857)에서 진강 수비대의 결사항전을 ' +
    '"이 전쟁에서 청 측이 보여준 유일한 영웅적 저항"으로 평가하며, ' +
    '"수비대가 한 명도 남지 않을 때까지 싸웠다면 영국군은 난징에 도달하지 못했을 것"이라 분석했다. ' +
    '한편 해령의 한족 주민 학살은 청 내부에서도 비판받아, 후일 진강 시민들 사이에 만주 정권에 대한 ' +
    '반감이 누적되어 1853년 태평천국군이 진강을 점령할 때 비교적 쉽게 함락된 배경이 되었다는 견해도 있다.',
  keywords: [
    '진강 전투',
    'Battle of Zhenjiang',
    '진강',
    '휴 고프',
    '해령',
    '만주 팔기 자결',
    '양쯔강',
    '대운하',
    '조운 차단',
    '난징 조약 직전',
  ] as any,
} as const

// ── EventSection 본문 (HTML, 재시드 시 매번 최신 서술로 갱신) ────────────────
const SECTIONS: Array<{
  title: string
  content: string
  order: number
  sectionType?: string
}> = [
  {
    order: 1,
    title: '개전 배경',
    sectionType: 'background',
    content: `<p>1차 아편전쟁의 발화점은 18세기 후반부터 누적된 영국의 對청 무역 적자, 이를 상쇄하기 위한 인도산 아편의 청 연안 밀수, 그리고 1839년 청 조정의 강경 단속이라는 세 갈래의 구조적 모순이었다.</p>

<h3>1. 對청 무역의 비대칭과 은 유출</h3>
<ul>
  <li><strong>차(茶) 수요 폭발</strong>: 18세기 중반 이후 유럽 귀족·중산층 사이에 청 차 소비가 급증, 영국 동인도회사는 매년 수천만 파운드 가치의 차·도자기·비단을 수입했다.</li>
  <li><strong>청 측 수입 부재</strong>: 청은 자급자족적 농경 제국으로 영국산 모직물·금속제품 수요가 미미. 결제는 거의 전적으로 은(銀)으로 이루어졌다.</li>
  <li><strong>은 유출 누적</strong>: 1700년대 말 이미 영국발 對청 은 유출이 누적 4억 은량을 초과, 영국 재무부는 인도 식민지로부터의 환수 없이는 對청 무역 유지가 불가능하다고 판단했다.</li>
</ul>

<h3>2. 인도산 아편의 밀수 폭발</h3>
<ul>
  <li><strong>벵골 아편의 등장</strong>: 동인도회사는 1773년부터 벵골·비하르의 양귀비 재배를 독점 관리, 가공된 아편을 캘커타 경매로 사상인(私商人, country traders)에 판매. 영국 본토 회사는 직접 청 연안에 운송하지 않고 사상인을 통해 우회 밀수 구조를 구축했다.</li>
  <li><strong>수입량의 기하급수적 증가</strong>: 1800년 약 4,500상자 → 1820년 약 4,000상자(일시 정체) → 1830년 약 1.8만 상자 → 1838년 약 4만 상자(약 2,400톤). 1820년대에는 對청 아편 수출액이 차 수입액을 상회하며 무역 수지가 역전.</li>
  <li><strong>사회적 후폭풍</strong>: 청 사회에 광범위한 중독자(추정 2~10백만명) 발생, 관리·병사·일반 백성을 가리지 않음. 연간 약 2,000만 은량의 은 유출이 발생해 은가가 폭등하고 농민 세금 부담이 가중되었다.</li>
</ul>

<h3>3. 청 조정 내부의 정책 논쟁과 임칙서의 강경 노선</h3>
<ul>
  <li><strong>이금론 vs 엄금론</strong>: 1830년대 청 조정은 아편을 합법화·과세하자는 이금론(허내제 등)과 전면 금지하자는 엄금론(임칙서 등)으로 분열되었다. 도광제는 1838년 11월 임칙서의 "주의(籌議)" 상소를 채택, 엄금론을 확정.</li>
  <li><strong>임칙서의 광저우 파견(1839-01)</strong>: 흠차대신·양광총독 직함으로 광저우에 파견. 도광제는 임칙서에게 "황상은 그대만을 믿는다(朕惟汝所信)"는 친필을 내릴 정도로 절대 지지를 표명.</li>
  <li><strong>아편 압수와 후먼 폐기(1839-06)</strong>: 임칙서는 1839년 3월 광저우 도착 후 "신변보증서(具結) 제출 + 아편 인도"를 강제, 영국 상인 보유분 약 1,400톤(2만 283상자, 약 1,200톤)을 압수. 1839년 6월 3일~25일 후먼(虎門) 해변 3개 거대 호상(濠床)에서 석회·물·소금으로 23일에 걸쳐 분해·폐기했다. 이는 19세기 최대 규모의 마약 단속 기록이다.</li>
</ul>

<h3>4. 외교적 마찰의 격화</h3>
<ul>
  <li><strong>찰스 엘리엇의 거부</strong>: 영국 무역감독관 찰스 엘리엇(Charles Elliot)은 신변보증서 제출이 영국법(법치국가 원칙)에 위배된다며 거부, 영국 상인을 마카오로 철수시켰다. 임칙서는 마카오 식수·식량 공급을 차단해 추가 압박.</li>
  <li><strong>임유희(林維喜) 사건(1839-08)</strong>: 침사추이에서 영국 선원이 청인 임유희를 살해. 엘리엇은 청 측 인도 요구를 거부하고 자체 군법회의로 추방 처리, 청 측은 이를 "치외법권 관행 강요"로 받아들여 격분.</li>
  <li><strong>천비 해전(1839-11-03)</strong>: 영국 호위함 2척과 청 수군 정크 29척의 충돌. 영국 측 1명 부상, 청 측 정크 4척 격침으로 양국 해군력 격차가 결정적으로 드러남.</li>
</ul>

<h3>5. 영국 의회의 출병 결의</h3>
<ul>
  <li><strong>파머스턴 외상의 강경론</strong>: 1839년 11월부터 외상 파머스턴(Lord Palmerston)이 인도총독 오클랜드와 협의해 동방원정군 편성을 주도. 명분은 (1)영국 자산(아편) 침탈 보상 (2)자유무역 원칙 관철 (3)자국 상인 신변·재산 보호.</li>
  <li><strong>의회 표결(1840-04-07~09)</strong>: 토리당 글래드스턴(William Gladstone)이 "이보다 더 부정한 전쟁을 본 적 없다"며 격렬히 반대했으나, 자유당 멜번 정부 신임이 결부되면서 271 대 262라는 박빙 표차로 출병안 가결.</li>
  <li><strong>원정군 출항</strong>: 1840년 6월 인도·영국 본토에서 출발한 원정군이 마카오 부근에 집결. 함정 약 25척, 병력 약 1만명으로 사실상 전쟁이 시작되었다.</li>
</ul>`,
  },
  {
    order: 2,
    title: '전쟁 경과',
    sectionType: 'process',
    content: `<p>전쟁은 약 3년에 걸쳐 1단계(광저우 봉쇄·북상, 1840~1841 초) → 2단계(협상 결렬·연안 거점 점거, 1841 중반~말) → 3단계(양쯔강 진격·진강 함락, 1842)로 전개되었다. 영국군은 압도적 함포 화력과 증기선 기동력으로 청 연안을 차례로 제압했고, 청 정규군은 화승총·구식 청동포로는 도저히 대응하지 못했다.</p>

<h3>1단계 — 광저우 봉쇄와 북상 위협 (1840-06 ~ 1841-05)</h3>
<ol>
  <li><strong>1839-11-03 천비 해전</strong>: 영국 호위함 볼레이지·하이어신스 2척이 청 수군 정크 29척을 격파. 영국 측 1명 부상, 청 측 정크 4척 격침.</li>
  <li><strong>1840-06</strong>: 인도·영국에서 출발한 원정군 약 1만명·함정 25척이 마카오 부근에 집결. 광저우만 봉쇄.</li>
  <li><strong>1840-07-05 딩하이(定海) 점령</strong>: 저장성 저우산 군도의 핵심 항구 딩하이를 약 4시간 만에 함락. 양쯔강 어귀 위협 + 베이징 직공 가능성 시사.</li>
  <li><strong>1840-08 다구(大沽) 북상</strong>: 영국 함대가 톈진 부근 다구까지 북상, 베이징 직공을 위협. 도광제는 충격에 임칙서를 해임(9월), 기선(琦善)을 흠차대신으로 임명해 광저우에서 협상에 응하게 함.</li>
  <li><strong>1841-01-07 호문(虎門)·천비 2차 전투</strong>: 협상 교착 중 영국이 호문 입구 보그(Bogue) 요새를 공격해 점령.</li>
  <li><strong>1841-01-25 홍콩섬 점거</strong>: 엘리엇이 일방적으로 홍콩섬에 상륙·국기 게양. 같은 날 엘리엇·기선이 "천비 가조약(穿鼻草約)"을 체결(홍콩 할양·배상금 600만 은량)했으나, 영국은 "양보 부족"으로 엘리엇을 경질(헨리 포팅거 후임 임명), 청 조정도 "할양 동의"를 이유로 기선을 처형 직전까지 몰아 신강 유배. 양측 모두 협상자 교체.</li>
  <li><strong>1841-02-26 호문 함락 / 관텐페이 전사</strong>: 영국 함대가 호문 요새 본진을 공격, 광동수사제독 관텐페이가 부하 600여명과 함께 결사항전 끝에 전사.</li>
  <li><strong>1841-05-21~27 광저우 시 위협</strong>: 영국군이 광저우 시를 포위, 청 측 600만 은량 "광저우 속성비(贖城費)" 지불로 일시 휴전.</li>
</ol>

<h3>2단계 — 연안 거점 점거 (1841-08 ~ 1842-04)</h3>
<ol start="9">
  <li><strong>1841-08-26 샤먼(廈門) 점령</strong>: 헨리 포팅거 부임 직후 푸젠성 샤먼을 점령. 양쯔강 진격을 위한 보급 거점 확보.</li>
  <li><strong>1841-10-01 딩하이 재점령</strong>: 1841년 봄 일시 반환했던 딩하이를 재점거. 정해 총병 갈운비(葛雲飛)·왕석붕(王錫朋)·정국홍(鄭國鴻) 3명의 총병이 모두 전사.</li>
  <li><strong>1841-10-13 닝보(寧波) 점령</strong>: 저장성 진해 함락 후 양강총독 유겸(裕謙)이 자살, 같은 날 닝보까지 무혈 점령.</li>
  <li><strong>1842-03-10~13 닝보 반격(浙東反攻)</strong>: 도광제가 양위장군 혁경(奕經)에게 약 1만의 반격군을 편성·파견했으나 자취·정해·진해 3로 동시 반격이 모두 실패, 청군 약 1,000명 전사.</li>
  <li><strong>1842-05-18 차포(乍浦) 점령</strong>: 항주만 입구 거점 차포 함락. 만주 팔기 약 700명 자결·전사.</li>
</ol>

<h3>3단계 — 양쯔강 진격과 진강 함락 (1842-06 ~ 1842-08)</h3>
<ol start="14">
  <li><strong>1842-06-16 우송(吳淞) 전투</strong>: 양쯔강 어귀 우송에서 청 함대 격멸. 강남제독 진화성(陳化成) 전사. 6월 19일 상하이를 무혈 입성으로 장악.</li>
  <li><strong>1842-07-21 진강(鎮江) 전투</strong>: 양쯔강·대운하 결절점 진강을 약 4시간 만에 함락. 만주 부도통 해령(海齡) 자결, 만주 팔기 약 1,500명이 가족과 함께 자결·전사. 영국군 사상자 약 185명(전사 36명·전상 149명)으로 영국군이 가장 큰 손실을 본 전투.</li>
  <li><strong>1842-07~08 베이징 보급 차단</strong>: 진강 함락으로 양쯔강·대운하 조운(漕運)이 즉각 차단, 베이징의 식량·세수 공급이 끊김. 도광제는 즉각 기영(耆英)·이리포(伊里布)에게 강화 전권 부여.</li>
  <li><strong>1842-08-09 영국 함대 난징 도착</strong>: 함대 70여 척, 병력 약 7,000명이 양쯔강을 따라 난징에 도착. 협상 개시.</li>
  <li><strong>1842-08-29 난징 조약 체결</strong>: 영국 군함 콘월리스(HMS Cornwallis)호 갑판에서 청 측 기영·이리포·우감(牛鑑), 영국 측 헨리 포팅거가 13개조 본조약에 서명. 1차 아편전쟁이 사실상 종결.</li>
</ol>

<h3>전쟁의 군사적 양상</h3>
<ul>
  <li><strong>영국의 전술적 우위</strong>: 68파운더 활강포·신형 작약 폭탄·머스킷 소총·검·총검 보급으로 청 측 화승총·구식 화포·창·궁시(弓矢)에 절대 우위. 평균 교전 거리 1,000야드 이상에서 영국이 일방적 사격 가능.</li>
  <li><strong>증기선의 결정적 역할</strong>: 동인도회사 소속 철제 외륜선 네메시스(Nemesis)·플레게톤(Phlegethon) 등 4척이 천수 양쯔강·연안에서 정크선 견인·예인·사격 지원으로 결정타. 풍향에 무관한 기동력은 정크선 함대를 무력화시켰다.</li>
  <li><strong>청 측의 구조적 한계</strong>: 정보 부재(베이징·광저우 정보 왕복 약 40일), 강경파·화의파의 정책 진동, 만주 팔기와 한족 녹영의 지휘 분리, 지방 총독의 자율 동원 한계로 각 전선이 사실상 고립 분전.</li>
</ul>`,
  },
  {
    order: 3,
    title: '전후 처리와 영향',
    sectionType: 'aftermath',
    content: `<p>1842년 8월 29일 콘월리스호 함상에서 체결된 난징 조약은 동아시아 근대 불평등 조약 체제의 원형이 되었으며, 청 내부에는 14년에 걸친 태평천국의 난, 일본·조선·베트남 등 동아시아 주변국에는 근대 대응 전략의 분기점을 만들어냈다.</p>

<h3>1. 난징 조약(1842-08-29)의 핵심 조항</h3>
<ul>
  <li><strong>홍콩 영구 할양</strong>: 홍콩섬을 영국에 영구 할양. 이후 1860년 베이징 조약으로 카오룽(九龍) 반도, 1898년 신계(新界) 99년 조차로 현재 홍콩의 윤곽이 완성되었으며, 1997년 7월 1일 중국에 반환되었다.</li>
  <li><strong>5개항 개항</strong>: 광저우·샤먼·푸저우·닝보·상하이 5개 항구를 통상항으로 개방. 영국 영사 주재 허용, 영국 상인의 자유 거래·가족 동반 거주 보장.</li>
  <li><strong>배상금 2,100만 은량</strong>: 아편 보상 600만 + 상관(商館) 채무 300만 + 전비 1,200만. 4년 분할 지불(연 5% 이자 적용). 당시 환산 약 1,470만 미국 달러 또는 약 700만 영국 파운드 상당.</li>
  <li><strong>협정관세</strong>: 5% 종가세를 양국 합의로 정해 청의 관세 자주권을 사실상 박탈. 이는 1929년 국민정부의 관세 자주권 회복까지 약 87년간 지속되었다.</li>
  <li><strong>공행(公行) 독점 폐지</strong>: 13개 공행이 독점하던 對외무역 체제를 해체, 영국 상인의 자유 거래를 보장. 청 측 외무 관리 대등 외교 의무화(평등 의례 적용).</li>
</ul>

<h3>2. 후속 조약과 불평등 체제의 확산</h3>
<ul>
  <li><strong>후먼(虎門) 추가조약(1843-07-22)</strong>: 정식 명칭 "中英五口通商章程·虎門條約附粘". 영사재판권(치외법권) — 영국인이 청 내에서 형사·민사 피의자가 되어도 영국 영사가 영국법으로 재판. 최혜국 대우 — 청이 다른 국가에 부여한 권리는 자동으로 영국에도 적용.</li>
  <li><strong>망하(望廈) 조약(1844-07-03)</strong>: 미국과 체결. 영국과 동일한 5개항 통상·영사재판권·최혜국 대우. 추가로 12년 후 조약 개정권 부여(1856년 2차 아편전쟁의 원인).</li>
  <li><strong>황포(黃埔) 조약(1844-10-24)</strong>: 프랑스와 체결. 미국과 동일 조항 + 천주교 포교 자유 보장(1844-12 도광제 천주교 해금령).</li>
</ul>

<h3>3. 청 내부의 후폭풍</h3>
<ul>
  <li><strong>은가 폭등과 농민 부담 가중</strong>: 배상금 분할 지불을 위한 가렴주구(苛斂誅求), 아편 밀수 지속으로 인한 은 유출 가속으로 1840년대 청 은가가 약 50% 폭등. 동전·은량 환율 격차로 농민 실질 세부담이 2배 이상으로 증가.</li>
  <li><strong>태평천국의 난(1851~1864)</strong>: 1851년 광시(廣西)에서 발발한 홍수전(洪秀全)의 배상제회(拜上帝會) 농민·종교 반란. 14년에 걸친 대규모 내전으로 청 인구 약 2,000만~7,000만명이 사망(전 세계 19세기 최대 규모 내전). 난징 조약 후폭풍이 사회·경제적 토양을 제공한 대표적 사례.</li>
  <li><strong>양무(洋務) 사상의 맹아</strong>: 청 지식인 위원(魏源)이 1843년 "해국도지(海國圖志)"를 출간, "사이장기이제이(師夷長技以制夷) — 서구의 장기를 배워 서구를 제압한다"는 양무론을 주창. 다만 청 조정은 본격 양무운동(1861~1895)을 2차 아편전쟁 패배 후에야 시작했다.</li>
  <li><strong>아편 무역의 합법화 압력</strong>: 난징 조약은 아편 무역을 명시적으로 합법화하지 않았으나 단속 메커니즘이 사라져 사실상 묵인됨. 1858년 톈진 조약에서 정식 합법화.</li>
</ul>

<h3>4. 동아시아의 분기 — 일본·조선·베트남</h3>
<ul>
  <li><strong>일본 — 위기 인식과 점진적 개국</strong>: 도쿠가와 막부는 위원의 "해국도지"와 한역(漢譯) 보고를 통해 청의 패전 양상을 신속 파악. 1842년 "천보의 신수급여령(天保薪水給与令)"으로 1825년 "이국선 타격령(異國船打拂令)"을 사실상 폐기, 외국선 온건 대응으로 전환. 이는 1853년 페리 흑선 도래 후 1854년 미일 화친조약·1858년 미일 수호통상조약·1868년 메이지 유신으로 가는 길을 열었다.</li>
  <li><strong>조선 — 위정척사와 쇄국 강화</strong>: 조선은 청 패전을 "오랑캐의 일시적 승리"로 평가하며 위정척사론을 강화, 척사위정 정책으로 쇄국을 고수. 결과적으로 1876년 강화도 조약까지 약 34년간 개국이 지연되었으며, 이는 메이지 일본과 결정적 격차를 만든 원인이 되었다.</li>
  <li><strong>베트남 — 응우옌 왕조의 쇄국</strong>: 베트남 응우옌 왕조도 청과 유사하게 쇄국·천주교 박해를 강화했으나, 결국 1858년 다낭 침공 → 1862년 사이공 조약 → 1885년 톈진 조약으로 프랑스 보호국이 되었다.</li>
</ul>

<h3>5. 2차 아편전쟁(1856~1860)으로의 연결</h3>
<ul>
  <li><strong>추가 개항 요구의 좌절</strong>: 영국·프랑스는 5개항 개항만으로는 對청 무역 확대가 부족하다고 판단, 1854년 망하조약 12년 개정 시한을 활용해 (1)추가 개항 (2)공사 베이징 주재 (3)아편 무역 합법화를 요구했으나 청 조정이 거부.</li>
  <li><strong>애로호(Arrow) 사건(1856-10-08)</strong>: 광저우에서 영국 국기를 게양한 중국 선박 애로호의 청 측 검문을 빌미로 영국이 출병. 프랑스도 신부 처형 사건을 명분으로 합세, 영불 연합군이 1858년 톈진 조약·1860년 베이징 조약을 강요.</li>
  <li><strong>원명원 약탈·방화(1860-10-18)</strong>: 영불 연합군이 베이징 점령 후 원명원(圓明園)을 약탈·방화. 청의 국제적 위신이 결정적으로 추락하고 함풍제는 열하(熱河)로 피난 중 사망.</li>
  <li><strong>홍콩 영토 확장</strong>: 1860년 베이징 조약으로 카오룽(九龍) 반도 영구 할양, 1898년 신계 99년 조차. 1997년 반환까지 1차 아편전쟁이 만든 홍콩 식민지 구도가 약 155년간 지속.</li>
</ul>

<h3>6. 사학사적 평가</h3>
<ul>
  <li><strong>중국 사학</strong>: 1차 아편전쟁을 "근대사의 시작점"으로 규정. 굴욕의 세기(百年國恥) 개시, 반(半)식민지·반(半)봉건 사회 진입의 분기점.</li>
  <li><strong>서구 사학</strong>: 자유무역 제국주의(Free Trade Imperialism)의 첫 본격 사례, "비공식 제국(informal empire)"이 군사적 강제로 전환된 결정적 분기점.</li>
  <li><strong>비교 사학</strong>: 일본 메이지 유신과 청 양무운동의 결정적 격차를 설명하는 핵심 변수. 청은 패전 후에도 약 20년간 본격 개혁을 미뤘으나, 일본은 청의 패전을 거울 삼아 약 25년 만에 산업화·헌정 정비를 마쳤다.</li>
</ul>`,
  },
]

const BRITAIN_SIDE: BelligerentInput = {
  code: 'britain',
  name: '영국 측',
  level: SideLevel.COALITION,
  // VarChar(200) — 자세한 인사·맥락은 description에 둠
  commander:
    '외상 파머스턴(정치 결정) / 찰스 엘리엇 → 헨리 포팅거(외교 전권) / 휴 고프(육군) / 조지 엘리엇 → 윌리엄 파커(해군) / 동인도회사: 인도총독 오클랜드 → 엘렌버러',
  // VarChar(100)
  forces: '약 2만명 — 영국 정규 보병 4개 연대 + 영령 인도 사포이, 함정 25~30척, 해병·무장선원 약 5,000명',
  description:
    '영국 본토 정규군·왕립해군과 영령 인도(동인도회사군)가 합동 편성한 동방원정군(Expeditionary Force). ' +
    '의회는 1840년 4월 7~9일 표결에서 271 대 262라는 박빙 표차로 출병안을 가결했고, 출병 명분은 ' +
    '(1)자국 상인 신변·재산 보호 (2)자유무역 원칙 관철 (3)청의 "야만적 단속"에 대한 응징이었다. ' +
    '실제 작전은 압도적 함포 화력(68파운더 함포, 명중률·발사속도 모두 청의 구식 화포를 압도)과 ' +
    '증기선의 천수(淺水) 기동력에 의존하여, 청 연안의 지방군을 점령·차단·우회하는 방식으로 전개되었다. ' +
    '베이징을 직접 공격하지 않고 양쯔강·대운하 결절점인 진강(鎮江)을 함락해 수운을 끊는 ' +
    '"간접 압박" 전략을 채택, 최소 비용으로 최대 정치 효과를 얻었다.',
  color: '#1d4ed8',
  countries: [
    {
      historicalCountryName: '그레이트브리튼 및 아일랜드 연합왕국',
      role: '주도국 / 정치적 결정 주체',
      forces: '본토 정규군 약 4,000명 + 왕립해군 25척 이상 + 해병·무장선원 약 5,000명 (사포이 합산 1만 이상)',
      commander: '찰스 엘리엇 → 헨리 포팅거 (외교) / 휴 고프 (육군) / 조지 엘리엇 → 윌리엄 파커 (해군)',
      description:
        '외상 파머스턴이 실질적 주전론자로, 1839년 임칙서의 아편 압수를 "영국 자산 침탈"로 규정해 출병을 추진. ' +
        '의회 출병안은 271:262로 가까스로 통과했으나(자유당 멜번 정부 신임 결부), 이후 ' +
        '4년 가까이 인도와 본토를 잇는 보급선을 운영하며 청 연안 13개 거점을 차례로 점거. ' +
        '난징 조약(1842) 체결로 홍콩 영구 할양·5개항 개항·배상금 2,100만 은량을 확보하면서 ' +
        '아시아 자유무역 체제의 첫 교두보를 마련했다.',
      participation: ParticipationType.FULL,
    },
  ],
  casualties: {
    militaryKilled: '전사 약 69명 (전투 사상)',
    militaryWounded: '전상 약 451명',
    militaryMissing: '극소수',
    // VarChar(100)
    total: '전사·전상 약 520명 (전투 직접). 풍토병·항해 중 사망 포함 시 추정 1,000~2,000명',
  },
}

const QING_SIDE: BelligerentInput = {
  code: 'qing',
  name: '청 측',
  level: SideLevel.COUNTRY,
  // VarChar(200) — 자세한 인사 약전·전사 일자는 description에 둠
  commander:
    '도광제(친정) / 임칙서 → 기선(광저우 흠차대신) / 기영·이리포(강화 전권) / 관텐페이·유겸·해령(전사·자결한 야전 지휘관)',
  // VarChar(100)
  forces: '명목 정규군 85만(팔기 25만+녹영 60만), 분쟁지 동원 약 22만. 화승총·구식 청동포 위주의 열세',
  description:
    '내륙 농경 제국의 청 정규군은 만주 정복기(17세기) 이래 200년간 본격적 외세 전쟁을 겪지 않아 ' +
    '전술·무기·지휘체계가 전반적으로 정체된 상태였다. ' +
    '도광제는 "검약과 친정"으로 알려졌으나 외부 정보 부재로 영국군의 실력을 끝까지 과소평가했고, ' +
    '강경파(임칙서·왕정·이리포 초기)와 화의파(기선·기영·이리포 후기) 사이의 정책 진동(振動)이 ' +
    '단속 → 협상 → 결사항전 → 강화로 이어지며 일관된 전략 수립을 방해했다. ' +
    '또한 만주 팔기와 한족 녹영의 지휘 분리, 지방 총독·순무의 자율 동원 한계, ' +
    '베이징과 광저우 간 정보 전달 지연(왕복 약 40일) 등으로 각 전선이 사실상 고립 분전했다. ' +
    '진강 등에서 만주 팔기 부대가 결사항전(가족 동반 자결) 양상을 보였으나 전체 전국(戰局)에는 영향이 미미했다.',
  color: '#b91c1c',
  countries: [
    {
      historicalCountryName: '청나라',
      role: '주(主) 적국 / 영토·주권 침해 피해국',
      forces: '실제 분쟁 지역 동원 약 22만명 (지역별 분산 배치, 통합 야전군 미편성)',
      commander: '도광제(친정) / 임칙서 → 기선 → 기영·이리포',
      description:
        '아편 단속에서 시작된 외교 충돌이 군사 충돌로 확대. ' +
        '광저우·딩하이·샤먼·닝보·우송·진강에서 차례로 패배하며, ' +
        '1842년 7월 진강 함락으로 양쯔강·대운하 보급선이 끊기자 8월 강화에 응함. ' +
        '난징 조약(1842) 체결로 홍콩 할양·5개항 개항·배상금 2,100만 은량·협정관세·공행 폐지를 수락, ' +
        '동아시아 조공·해금 체제의 종언과 반(半)식민지화의 시발점을 맞이했다.',
      participation: ParticipationType.FULL,
    },
  ],
  casualties: {
    militaryKilled: '전사 약 18,000~20,000명 (전투 직접 + 만주 팔기 자결 포함)',
    militaryWounded: '미상 (사료 미비, 추정 수만 명)',
    militaryCaptured: '소수 (대부분 처형되거나 도주)',
    // VarChar(100)
    total: '추정 22,000~30,000명 (전투 + 학살·자결·도주). 진강 만주 팔기 1,500명 자결 등 편차 큼',
  },
}

export async function seedFirstOpiumWar(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n⚔️  1차 아편전쟁(1839-1842) 시딩 시작...')

  // ── 사전 의존성 조회 ───────────────────────────────────────────────────
  const admin = await prisma.account.findUnique({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  ⚠️  admin 계정이 없어 시딩을 건너뜀 (먼저 admin.seed 실행 필요)')
    return
  }

  const category = await prisma.eventCategory.findFirst({
    where: { name: EVENT_CATEGORY_NAME },
    select: { id: true },
  })
  if (!category) {
    console.warn(`  ⚠️  사건 카테고리 '${EVENT_CATEGORY_NAME}' 미존재 — 시딩 중단`)
    return
  }

  const britainHC = await prisma.historicalCountry.findFirst({
    where: { name: '그레이트브리튼 및 아일랜드 연합왕국' },
    select: { id: true },
  })
  if (!britainHC) {
    console.warn('  ⚠️  역사 국가 \'그레이트브리튼 및 아일랜드 연합왕국\' 미존재 — 시딩 중단')
    return
  }

  // ── 0) 청나라 HistoricalCountry 인라인 생성 ───────────────────────────
  let qingHC = await prisma.historicalCountry.findFirst({
    where: { name: '청나라' },
    select: { id: true },
  })
  if (!qingHC) {
    const created = await prisma.historicalCountry.create({
      data: {
        name: '청나라',
        enName: 'Qing Dynasty',
        description:
          '1644년 만주 애신각라(愛新覺羅) 가문이 명을 무너뜨리고 세운 중원 정복 왕조. 강희·옹정·건륭의 전성기를 거쳐 19세기 들어 서구·일본의 진출과 내부 반란으로 쇠퇴, 1912년 신해혁명으로 멸망하였다. 현대 중국·대만 양안 정권의 직전 왕조.',
        startEra: 'AD' as any,
        startYear: 1636,
        endEra: 'AD' as any,
        endYear: 1912,
        stateType: HistoricalStateType.EMPIRE,
        entityKind: HistoricalEntityKind.STATE,
        latitude: 39.9042, longitude: 116.4074,
        accountId: admin.id,
      },
    })
    qingHC = { id: created.id }
    console.log(`  ✅ 역사 국가 생성: 청나라 (id=${created.id})`)

    // 현대 중국과 연결
    const modernChina = await prisma.country.findFirst({
      where: { isoCode: 'CN' },
      select: { id: true },
    })
    if (modernChina) {
      const linkExists = await prisma.historicalCountryModernCountry.findFirst({
        where: { historicalCountryId: qingHC.id, modernCountryId: modernChina.id },
      })
      if (!linkExists) {
        await prisma.historicalCountryModernCountry.create({
          data: { historicalCountryId: qingHC.id, modernCountryId: modernChina.id },
        })
        console.log(`    🔗 현대 중국(CN) 연결`)
      }
    }
  } else {
    console.log(`  ⏭️  역사 국가 이미 존재: 청나라`)
  }

  // ── 1) 부모 사건 등록(또는 조회) ───────────────────────────────────────
  const TITLE = '1차 아편전쟁'

  let parentEvent = await prisma.event.findFirst({
    where: {
      title: TITLE,
      startDate: new Date('1839-09-04'),
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
        startDate: new Date('1839-09-04'),
        startDatePrecision: 'day',
        endDate: new Date('1842-08-29'),
        endDatePrecision: 'day',
        categoryId: category.id,
        historicalCountryId: qingHC.id,
        createdById: admin.id,
      },
    })
    console.log(`  ✅ 생성: ${TITLE} (id=${parentEvent.id})`)
  }

  // ── 2) 자식 사건 — 천비 해전 ───────────────────────────────────────────
  const CHILD1_TITLE = '천비 해전'
  let child1 = await prisma.event.findFirst({
    where: {
      title: CHILD1_TITLE,
      startDate: new Date('1839-11-03'),
      parentEventId: parentEvent.id,
      deletedAt: null,
    },
  })
  if (child1) {
    await prisma.event.update({ where: { id: child1.id }, data: CHILD1_BODY })
    console.log(`  🔄 갱신: ${CHILD1_TITLE} (id=${child1.id})`)
  } else {
    child1 = await prisma.event.create({
      data: {
        title: CHILD1_TITLE,
        ...CHILD1_BODY,
        startDate: new Date('1839-11-03'),
        startDatePrecision: 'day',
        endDate: new Date('1839-11-03'),
        endDatePrecision: 'day',
        categoryId: category.id,
        historicalCountryId: qingHC.id,
        parentEventId: parentEvent.id,
        createdById: admin.id,
      },
    })
    console.log(`  ✅ 생성: ${CHILD1_TITLE} (id=${child1.id})`)
  }

  // ── 3) 자식 사건 — 진강 전투 ───────────────────────────────────────────
  const CHILD2_TITLE = '진강 전투'
  let child2 = await prisma.event.findFirst({
    where: {
      title: CHILD2_TITLE,
      startDate: new Date('1842-07-21'),
      parentEventId: parentEvent.id,
      deletedAt: null,
    },
  })
  if (child2) {
    await prisma.event.update({ where: { id: child2.id }, data: CHILD2_BODY })
    console.log(`  🔄 갱신: ${CHILD2_TITLE} (id=${child2.id})`)
  } else {
    child2 = await prisma.event.create({
      data: {
        title: CHILD2_TITLE,
        ...CHILD2_BODY,
        startDate: new Date('1842-07-21'),
        startDatePrecision: 'day',
        endDate: new Date('1842-07-21'),
        endDatePrecision: 'day',
        categoryId: category.id,
        historicalCountryId: qingHC.id,
        parentEventId: parentEvent.id,
        createdById: admin.id,
      },
    })
    console.log(`  ✅ 생성: ${CHILD2_TITLE} (id=${child2.id})`)
  }

  // ── 4) EventSection (부모 사건) ────────────────────────────────────────
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

  // ── 5) EventCountryRelation ────────────────────────────────────────────
  type RelInput = {
    historicalCountryName?: string
    countryName?: string
    role: EventCountryRole
    roleDescription?: string
  }
  const RELATIONS: RelInput[] = [
    {
      historicalCountryName: '그레이트브리튼 및 아일랜드 연합왕국',
      role: EventCountryRole.INITIATOR,
      roleDescription:
        '주도국·전쟁 도발자. 외상 파머스턴(Palmerston)이 1839년 임칙서의 아편 압수를 ' +
        '"영국 자산 침탈"로 규정해 출병을 추진, 1840년 4월 의회 표결(271:262)에서 출병안을 가결시켰다. ' +
        '명분은 자유무역과 자국 상인 보호였으나 실질 목적은 청 시장 강제 개방과 불평등 조약 체제 구축. ' +
        '약 3년에 걸친 동방원정으로 청 연안 13개 거점을 차례로 점거, ' +
        '난징 조약(1842) 체결로 홍콩 영구 할양·5개항 개항·배상금 2,100만 은량을 확보했다. ' +
        '동아시아 자유무역 제국주의의 첫 본격 사례.',
    },
    {
      historicalCountryName: '청나라',
      role: EventCountryRole.ADVERSARY,
      roleDescription:
        '주(主) 적국·영토·주권 침해 피해국. ' +
        '도광제 친정 하 임칙서의 아편 단속(1839)에서 시작된 외교 충돌이 군사 충돌로 확대, ' +
        '광저우·딩하이·샤먼·닝보·우송·진강에서 차례로 패배. ' +
        '진강 함락(1842-07-21)으로 양쯔강·대운하 조운이 차단되자 강화에 응함. ' +
        '난징 조약 수락으로 홍콩 할양·5개항 개항·배상금·협정관세·공행 폐지를 받아들이며 ' +
        '동아시아 조공·해금 체제의 종언과 반(半)식민지화의 시발점을 맞이했다. ' +
        '내부적으로는 배상금 부담이 1851년 태평천국의 난을 촉발하는 사회·경제적 토양이 됨.',
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

  // ── 6) BelligerentSide + CountryInSide + 사상자 ────────────────────────
  for (const side of [BRITAIN_SIDE, QING_SIDE]) {
    let belligerent = await prisma.belligerentSide.findFirst({
      where: { eventId: parentEvent.id, name: side.name },
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
          eventId: parentEvent.id,
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
          joinDate: new Date('1839-09-04'),
        },
      })
      console.log(`      ✅ 진영국가: ${c.historicalCountryName ?? c.countryName}`)
    }

    // 사상자
    const casualtiesExists = await prisma.casualtiesData.findFirst({
      where: { eventId: parentEvent.id, sideId: belligerent.id },
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
          eventId: parentEvent.id,
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

  // ── 7) MilitaryDetailsNorm ─────────────────────────────────────────────
  const militaryDetailsBody = {
    conflictType: ConflictType.WAR,
    objective:
      '영국 측. (1)자유무역 원칙 관철과 아편 무역 보호 ' +
      '(2)청 시장의 강제 개방(공행 독점 체제 해체) ' +
      '(3)영국 상인의 신변·재산·치외법권 보장 ' +
      '(4)최혜국 대우·관세 협정 등 불평등 조약 체제 구축. ' +
      '명분은 자유무역·자국민 보호였으나 본질은 동아시아 첫 자유무역 제국주의 사례. ' +
      '청 측. (1)아편 단속과 사회·재정 안정 (2)전통적 조공·해금(海禁) 체제 유지 ' +
      '(3)광저우 일구통상(一口通商) 체제 보존 (4)서구의 평등 외교 의례 거부와 종주권 의식 유지. ' +
      '도광제 친정의 정책 노선은 강경파(임칙서)·화의파(기선·기영) 사이를 진동했고, ' +
      '실질적 군사 대응 전략은 부재했다.',
    tactics:
      '영국 전술. (1)현측 함포 일제 사격 — 68파운더 활강포·신형 작약 폭탄으로 ' +
      '평균 1,000야드 이상에서 청 정크선·요새를 일방적으로 타격. ' +
      '(2)증기선 견인·예인·정찰 — 네메시스(Nemesis)·플레게톤(Phlegethon) 등 ' +
      '동인도회사 소속 철제 외륜선 4척이 천수(淺水) 양쯔강·연안에서 풍향 무관 기동. ' +
      '(3)상륙 작전 — 머스킷 소총·총검·검·왕립공병의 폭파술로 요새·도시 성벽 동시 공격. ' +
      '(4)사포이 활용 — 영령 인도군(마드라스·벵골 사포이)을 보병 주력으로 운용해 본토군 손실 최소화. ' +
      '\n\n' +
      '청 전술. (1)해안 요새 정적 방어 — 호문·딩하이·진해 요새의 청동 화포로 ' +
      '협수로 봉쇄. 그러나 사거리·정확도 모두 영국 함포에 절대 열세. ' +
      '(2)화공·매복 — 화선(火船)으로 영국 함정을 야간 공격하는 전통 전술이 다수 시도되었으나 모두 실패. ' +
      '(3)정크선 함대 — 풍향 의존 + 측현 1~2문 대포로 영국 호위함 상대 가능 최대 사거리 1/3 수준. ' +
      '(4)만주 팔기 결사항전 — 진강·차포에서 가족 자결을 동반한 결사항전이 시도되었으나 ' +
      '병력·화력 격차로 전국(戰局) 전환에는 무력. ' +
      '(5)분산 배치의 한계 — 정규군 85만이 명목상 보유였으나 광활한 영토로 분산되어 ' +
      '실제 동원·집결은 분쟁 지역마다 수천명 단위였다.',
    strategy:
      '영국 전략 — 점진적 북상과 수운 차단. ' +
      '단계 1(1840): 광저우만 봉쇄 → 딩하이 점령(저장성 진입) → 다구·톈진 북상 위협. ' +
      '단계 2(1841): 호문·천비 2차 → 홍콩섬 점거 → 광저우 시 위협 → 샤먼·딩하이·닝보 점령. ' +
      '단계 3(1842): 차포·우송 → 상하이 무혈 입성 → 양쯔강 진입 → 진강 함락 → 난징 협상. ' +
      '핵심 발상은 "베이징 직공이 아닌 양쯔강·대운하 결절점 차단을 통한 정치적 압박"이었다. ' +
      '베이징 점령은 막대한 병력·보급을 요구하지만, ' +
      '진강 함락만으로 베이징의 식량·세수 공급이 차단되어 도광제가 즉각 강화에 응하게 만들었다. ' +
      '\n\n' +
      '청 전략의 부재. 도광제는 정보 부재로 영국군의 실력을 끝까지 과소평가, ' +
      '강경파(임칙서·왕정·이리포 초기)와 화의파(기선·기영·이리포 후기) 사이의 정책 진동(振動)이 ' +
      '단속 → 협상 → 결사항전 → 강화로 이어지며 일관된 전략 수립을 방해했다. ' +
      '특히 (i) 베이징·광저우 정보 왕복 약 40일의 통신 지연, ' +
      '(ii) 만주 팔기와 한족 녹영의 지휘 분리, ' +
      '(iii) 지방 총독·순무의 자율 동원 한계로 각 전선이 사실상 고립 분전. ' +
      '통일된 야전군 편성·전선 협조·전국(戰局) 차원의 작전 계획은 끝내 수립되지 못했다.',
    outcome:
      '영국의 결정적 승리. ' +
      '진강 함락(1842-07-21) 후 양쯔강·대운하 조운(漕運) 차단으로 ' +
      '베이징 식량·세수 공급이 끊긴다는 보고를 받은 도광제가 즉각 강화 전권을 부여, ' +
      '8월 9일 영국 함대 70여 척이 난징에 도착해 협상이 시작되었고 8월 29일 콘월리스호 함상에서 ' +
      '난징 조약이 체결되었다. 영국 측 사상자 약 520명(전사 69·전상 451), ' +
      '청 측 사상자 약 22,000명 이상. 청은 홍콩 영구 할양·5개항 개항·배상금 2,100만 은량·' +
      '협정관세·공행 폐지를 수락, 동아시아 조공·해금 체제의 종언과 ' +
      '반(半)식민지화의 시발점을 맞이했다.',
    territoryChanges:
      '즉시 변경. 홍콩섬을 영국에 영구 할양(1842-08-29). ' +
      '광저우·샤먼·푸저우·닝보·상하이 5개 항구가 통상항으로 개방, 영국 영사 주재 허용. ' +
      '\n\n' +
      '파생 변경. 1860년 베이징 조약으로 카오룽(九龍) 반도 영구 할양. ' +
      '1898년 "신계(新界) 99년 조차 협정"으로 홍콩 전체 윤곽 완성. ' +
      '1997년 7월 1일 중국 반환까지 약 155년간 영국 식민지로 존속. ' +
      '\n\n' +
      '간접 변경. 5개항 개항을 통해 영국·미국·프랑스 조계(租界)가 ' +
      '상하이·광저우·샤먼 등에 차례로 형성, 1949년 신중국 수립 전까지 동아시아 무역·금융의 중심지로 기능. ' +
      '특히 상하이 영국 조계는 후일 공동조계(International Settlement)로 확대되어 ' +
      '"동방의 진주" 또는 "근대 중국 자본주의의 요람"으로 불리게 됨.',
    treaty:
      '본조약. 난징 조약(1842-08-29) — 13개조, 콘월리스호 함상에서 체결. ' +
      '청 측 기영·이리포·우감, 영국 측 헨리 포팅거 서명. ' +
      '\n\n' +
      '추가조약. ' +
      '(1)후먼(虎門) 추가조약(1843-07-22, 中英五口通商章程·虎門條約附粘) — 영사재판권·최혜국 대우 부여. ' +
      '(2)망하(望廈) 조약(1844-07-03) — 미국과 체결, 동일 조항 + 12년 후 조약 개정권. ' +
      '(3)황포(黃埔) 조약(1844-10-24) — 프랑스와 체결, 동일 조항 + 천주교 포교 자유.',
    strategicImpact:
      '동아시아 차원. (1)근대 불평등 조약 체제의 원형 — 영사재판권·최혜국 대우·협정관세·자유 통상이 ' +
      '향후 100여 년간 동아시아 외교의 표준틀로 작동. ' +
      '(2)조공·해금 체제의 종언 — 명대 이래 약 500년간 지속된 동아시아 국제질서가 ' +
      '서구 주권국가 체제로 전환되는 분기점. ' +
      '(3)일본·조선·베트남의 분기 — 일본은 위기 인식 → 메이지 유신(1868)으로, ' +
      '조선은 위정척사 → 쇄국 강화 → 1876년 강화도 조약까지 개국 지연으로, ' +
      '베트남은 쇄국 → 1858년 다낭 침공 → 1885년 프랑스 보호국화로 각각 분기. ' +
      '\n\n' +
      '청 내부 차원. (1)배상금 부담 → 가렴주구 → 농민 반란 → 태평천국의 난(1851~1864, 사망 약 2,000만~7,000만). ' +
      '(2)양무 사상의 맹아 — 위원의 "해국도지"(1843), "사이장기이제이" 양무론 등장. ' +
      '(3)한족 신사층의 부상 — 태평천국 진압 과정에서 증국번·이홍장 등 한족 군사 지도자가 부상, ' +
      '만주 정권의 한족 의존이 본격화. ' +
      '\n\n' +
      '장기 영향. (1)홍콩 식민지 형성과 1997년 반환까지 155년 지속. ' +
      '(2)"굴욕의 세기(百年國恥)" 시작 — 1949년 신중국 수립까지 100여 년에 걸친 외세 침탈 시발점. ' +
      '(3)오늘날 중국 외교 담론의 핵심 정체성 — 시진핑 시대 "중화민족 위대한 부흥(中華民族偉大復興)" ' +
      '담론의 역사적 출발점으로 인용되는 사건.',
  } as const

  const milExists = await prisma.militaryDetailsNorm.findUnique({
    where: { eventId: parentEvent.id },
  })
  if (milExists) {
    await prisma.militaryDetailsNorm.update({
      where: { eventId: parentEvent.id },
      data: militaryDetailsBody,
    })
    console.log(`    🔄 군사 상세 갱신: ${TITLE}`)
  } else {
    const md = await prisma.militaryDetailsNorm.create({
      data: { eventId: parentEvent.id, ...militaryDetailsBody },
    })
    // 교전 형태: 해상(양쯔강·연안) + 육상(요새·도시 점령)
    for (const ct of [CombatType.NAVAL, CombatType.LAND]) {
      await prisma.militaryDetailsCombatType.create({
        data: { militaryDetailsId: md.id, combatType: ct },
      })
    }
    console.log(`    ✅ 군사 상세: ${TITLE}`)
  }

  console.log(`✅ 1차 아편전쟁 시딩 완료\n`)
}
