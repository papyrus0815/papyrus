/**
 * 그레이트브리튼 왕국(Kingdom of Great Britain, 1707-05-01 ~ 1801-01-01) 군주 라인업.
 *
 *   1707-05-01 잉글랜드·스코틀랜드 통합법(Acts of Union)으로 출범 → 1801-01-01 아일랜드 통합법으로
 *   "그레이트브리튼 및 아일랜드 연합왕국"으로 승계되기까지 약 94년간 4명의 군주가 통치.
 *
 *   1.앤 (Stuart, 1707-05-01 ~ 1714-08-01)
 *   2.조지 1세 (Hanover, 1714-08-01 ~ 1727-06-11)
 *   3.조지 2세 (Hanover, 1727-06-11 ~ 1760-10-25)
 *   4.조지 3세 (Hanover, 1760-10-25 ~ 1801-01-01 — 이후 연합왕국 1대로 계속)
 *
 *   ⚠️ 기존 데이터 보존 모드.
 *   ⚠️ 의존: historicalCountry.britain.seed (그레이트브리튼 왕국 HC), person.britain-monarchs.seed (하노버 왕가)
 *
 * 등록 항목:
 *   - Dynasty x1 신규 (스튜어트 왕가)
 *   - Person x4 신규 (앤·조지 1세·조지 2세·조지 3세) — 조지 3세는 연합왕국 부분은 별도
 *   - PersonStats x4
 *   - PersonCountryAffiliation x4 (그레이트브리튼 왕국 CITIZENSHIP)
 *   - SovereignReign x4 (그레이트브리튼 왕국 1~4대)
 *   - 부자: 조지 1세 → 조지 2세, 조지 2세의 손자 → 조지 3세 (조지 2세의 장남 프레더릭 사망)
 */
import { AppointmentMethod, DeathType, TenureEndReason } from '@prisma/client'

import { PrismaService } from '../prisma.service'

const STUART_DYNASTY = {
  name: '스튜어트 왕가',
  description:
    '14세기 스코틀랜드 왕가에서 출발한 가문(원래는 "Steward of Scotland" 즉 왕실 집사). ' +
    '1371년 로버트 2세 즉위로 스코틀랜드 왕가가 되었고, 1603년 잉글랜드 엘리자베스 1세 사망 후 ' +
    '제임스 6세(=잉글랜드 제임스 1세)가 잉글랜드-스코틀랜드 동군연합 군주가 되면서 잉글랜드 왕가로 ' +
    '확대. 약 110년간 잉글랜드(1603~1714)·스코틀랜드(1371~1714)·1707년부터는 그레이트브리튼을 ' +
    '통치했다. 1714년 마지막 스튜어트 군주 앤의 사망 + 1701 왕위계승법(Act of Settlement)에 따라 ' +
    '하노버 왕가로 왕위 이전. 망명 자코바이트(Jacobite) 가지(제임스 2세 측 후손)는 1745년까지 ' +
    '복위 시도를 이어갔으나 1746 컬로든 전투 패배로 정치 세력 종결.',
  startYear: 1371,
  endYear: 1714,
} as const

type Stats = {
  politics: number
  military: number
  diplomacy: number
  intellect: number
  charisma: number
  administration: number
  notes: string
}

interface MonarchSpec {
  name: string
  surname: string
  originalName: string
  regnalName: string
  gender: 'MALE' | 'FEMALE'
  dynastyName: string
  birthYear: number
  birthMonth: number
  birthDay: number
  deathYear: number
  deathMonth: number
  deathDay: number
  birthPlaceText: string
  deathPlaceText: string
  deathType: DeathType
  deathCause: string
  deathNote: string
  biography: string
  influence: number
  stats: Stats
  reign: {
    regnalNumber: number
    regnalName: string
    startYear: number
    startMonth: number
    startDay: number
    endYear: number
    endMonth: number
    endDay: number
    endReason: TenureEndReason
    endReasonDetail: string
    notes: string
  }
}

const ANNE: MonarchSpec = {
  name: '앤',
  surname: '스튜어트',
  originalName: 'Anne, Queen of Great Britain',
  regnalName: '여왕',
  gender: 'FEMALE',
  dynastyName: '스튜어트 왕가',
  birthYear: 1665,
  birthMonth: 2,
  birthDay: 6,
  deathYear: 1714,
  deathMonth: 8,
  deathDay: 1,
  birthPlaceText: '잉글랜드 왕국 런던 세인트제임스 궁(St. James\'s Palace)',
  deathPlaceText: '그레이트브리튼 왕국 런던 켄싱턴 궁(Kensington Palace)',
  deathType: DeathType.ILLNESS,
  deathCause: '뇌졸중 + 단독(丹毒, erysipelas) + 통풍 합병증 (향년 49세)',
  deathNote:
    '1714-08-01 런던 켄싱턴 궁에서 향년 49세에 사망. 약 10년간 통풍·비만·복합 자가면역질환 ' +
    '(현대 진단 추정 — 전신성 홍반성 루푸스 또는 베헤트병)이 누적되었고, 사망 직전 사흘간 ' +
    '단독(피부 박테리아 감염)과 잇따른 뇌졸중으로 의식 잃은 채 사망. 17번의 임신을 했으나 5명만 ' +
    '산 채로 태어났고, 그중 4명이 영아 사망, 마지막 남은 글로스터 공작 윌리엄(1689~1700)도 ' +
    '11세에 사망 — 직계 후계자 부재가 1701 왕위계승법·1714 하노버 왕가 즉위의 직접 원인. ' +
    '시신은 1714-08-24 웨스트민스터 사원 헨리 7세 예배당에 매장 — 남편 조지 오브 덴마크(1708 ' +
    '먼저 사망)와 5자녀 옆에 안치.',
  biography:
    '스튜어트 왕가의 마지막 군주. 잉글랜드·스코틀랜드 여왕(1702-03-08 ~ 1707-05-01) + ' +
    '그레이트브리튼 여왕(1707-05-01 ~ 1714-08-01). 아버지는 잉글랜드 제임스 2세(=스코틀랜드 ' +
    '제임스 7세, 1633~1701), 어머니는 첫 부인 앤 하이드(Anne Hyde, 1637~1671). 1665-02-06 ' +
    '런던 세인트제임스 궁에서 출생. 부친의 가톨릭 개종에도 모친 앤 하이드의 영향으로 영국 ' +
    '국교회(앵글리칸) 신앙으로 양육되었다.\n\n' +
    '1683 결혼. 18세에 덴마크 왕자 조지(George of Denmark, 1653~1708)와 결혼. 두 사람은 ' +
    '평생 사이가 좋았으며 약 25년간 17번 임신했으나 5명만 산 채로 태어났고, 그중 4명이 영아 사망, ' +
    '마지막 남은 글로스터 공작 윌리엄(1689~1700)도 11세에 사망. 직계 후계자 부재가 후일 1701 ' +
    '왕위계승법의 직접 원인이다.\n\n' +
    '1688 명예혁명. 1688-11-05 부친 제임스 2세의 가톨릭 우대 정책에 항거한 의회·휘그 측이 ' +
    '네덜란드 통치자 빌럼 3세(=앤의 자형, 언니 메리 2세의 남편)를 잉글랜드로 초청. 앤은 부친 ' +
    '제임스 2세 측이 아닌 메리·빌럼 측을 지지하는 결정적 선택. 1689-02-13 메리 2세·윌리엄 3세 ' +
    '공동 즉위.\n\n' +
    '1702 여왕 즉위. 1694 언니 메리 2세 사망 → 1702-03-08 자형 윌리엄 3세 사망 → 37세의 ' +
    '앤이 잉글랜드·스코틀랜드·아일랜드 여왕 즉위. 즉위 직후 1702-05-04 스페인 왕위계승전쟁 ' +
    '(War of the Spanish Succession, 1701~1714) 정식 참전 — 부르봉 측 펠리페 5세의 스페인 왕위 ' +
    '계승을 저지하기 위해 잉글랜드 + 네덜란드 + 신성로마(레오폴트 1세) 측 "대동맹" 결성. ' +
    '말버러 공작 존 처칠(John Churchill, 1650~1722 — 후일 윈스턴 처칠의 7대조)이 영국군 ' +
    '총사령관으로 활약, 1704 블레넘 전투·1706 라미예 전투·1708 우데나르데 전투·1709 말플라케 ' +
    '전투에서 프랑스 군에 연속 승리.\n\n' +
    '1707 잉글랜드-스코틀랜드 통합법(Acts of Union). 통치 최대 업적 — 1707-05-01 잉글랜드와 ' +
    '스코틀랜드를 "그레이트브리튼 왕국(Kingdom of Great Britain)"으로 통합. 약 100년의 동군연합 ' +
    '(1603~1707) 끝에 정식 단일 왕국으로 통합. 앤은 "그레이트브리튼의 초대 여왕"으로 격상. ' +
    '통합법의 결정적 추진력은 (1)스코틀랜드 다리엔 식민 시도(1698~1700) 실패로 인한 경제 위기 ' +
    '(2)잉글랜드 측 자코바이트 위협 차단 의도였다.\n\n' +
    '정당정치 — 토리 vs 휘그. 통치 12년간 잉글랜드 정당정치(Tory vs Whig)의 결정적 형성기. ' +
    '앤 본인은 토리 측에 기울었으며, 1710~1714 후반기에는 토리 정권(로버트 할리·헨리 세인트존 ' +
    '주도)이 휘그 측을 견제했다. 1713-04-11 위트레흐트 조약(Treaty of Utrecht)으로 스페인 왕위 ' +
    '계승전쟁 종결 — 영국이 (1)지브롤터·미노르카 확보 (2)뉴펀들랜드·아카디아·허드슨베이 영토 확장 ' +
    '(3)Asiento(스페인 식민지 노예 무역 독점권) 획득으로 18세기 식민 제국의 토대를 마련했다.\n\n' +
    '1714 사망 — 스튜어트 왕가 단절. 1714-08-01 49세에 사망. 직계 후계자 부재 + 1701 ' +
    '왕위계승법에 따라 신성로마 측 하노버 선제후 게오르크 루트비히(=조지 1세)가 즉위해 ' +
    '하노버 왕가 출발.\n\n' +
    '장기 유산. (1)1707 그레이트브리튼 출범의 결정적 군주 (2)스페인 왕위계승전쟁 승리·1713 ' +
    '위트레흐트 조약으로 18세기 영국 식민 패권의 토대 (3)말버러 공작 처칠 가문 부상(=윈스턴 처칠 ' +
    '가계의 시조) (4)정당정치 형성기 (5)스튜어트 왕가의 마지막 군주.',
  influence: 78,
  stats: {
    politics: 75,
    military: 60,
    diplomacy: 80,
    intellect: 60,
    charisma: 65,
    administration: 70,
    notes:
      '약 12년 4개월 재위 — 1702 잉글랜드 여왕 즉위 ~ 1714 사망. 1707 잉글랜드-스코틀랜드 통합 + ' +
      '1702~1714 스페인 왕위계승전쟁 승전 + 1713 위트레흐트 조약의 세 큰 업적. 외교는 말버러 공작· ' +
      'Robert Harley 등 측근 활용으로 동시기 최고급. 정치는 토리·휘그 정당정치 형성기를 무난히 ' +
      '이끌었으나 본인의 정치 단독 결단력은 제한적. 카리스마는 통치 후반기 통풍·비만으로 거동이 ' +
      '어려워졌으나 "좋은 여왕 앤(Good Queen Anne)"이라는 평민층 호감 별칭 획득. 군사는 본인 ' +
      '직접 지휘는 없으나 말버러 공작 후원이 결정적. 학식은 평이.',
  },
  reign: {
    regnalNumber: 1,
    regnalName: '앤',
    startYear: 1707,
    startMonth: 5,
    startDay: 1,
    endYear: 1714,
    endMonth: 8,
    endDay: 1,
    endReason: TenureEndReason.DEATH_IN_OFFICE,
    endReasonDetail: '1714-08-01 런던 켄싱턴 궁에서 향년 49세에 뇌졸중 + 단독 + 통풍 합병증으로 사망.',
    notes:
      '그레이트브리튼 왕국 초대 여왕. 약 7년 3개월 재위(그레이트브리튼 시기) + 잉글랜드·스코틀랜드 ' +
      '여왕 1702~1707 별도. 1707-05-01 잉글랜드-스코틀랜드 통합법 발효로 그레이트브리튼 여왕 즉위. ' +
      '1713 위트레흐트 조약·스페인 왕위계승전쟁 승전 + 18세기 영국 식민 패권 토대 마련. 1714-08-01 ' +
      '직계 후계자 부재로 사망 — 1701 왕위계승법에 따라 하노버 왕가 조지 1세 즉위.',
  },
}

const GEORGE_I: MonarchSpec = {
  name: '조지',
  surname: '하노버',
  originalName: 'George I of Great Britain',
  regnalName: '1세',
  gender: 'MALE',
  dynastyName: '하노버 왕가',
  birthYear: 1660,
  birthMonth: 5,
  birthDay: 28,
  deathYear: 1727,
  deathMonth: 6,
  deathDay: 11,
  birthPlaceText: '신성로마제국 하노버 선제후국 — 하노버(Hanover)',
  deathPlaceText: '신성로마제국 하노버 선제후국 오스나브뤼크(Osnabrück) — 도중 사망',
  deathType: DeathType.ILLNESS,
  deathCause: '뇌졸중 (향년 67세)',
  deathNote:
    '1727-06-11 하노버 방문 여행 중 오스나브뤼크에서 향년 67세에 뇌졸중으로 사망. 6월 9일 ' +
    '네덜란드 델프트(Delft)에서 오렌지 멜론을 다량 섭취한 직후 복통 + 의식 혼탁을 호소, 마차에 ' +
    '실려 가는 도중 오스나브뤼크의 동생 에른스트 아우구스트의 궁에서 뇌졸중으로 사망. 시신은 ' +
    '하노버의 라이네슐로스(Leineschloss)에 매장 — 그러나 1957년 2차 대전 폭격으로 묘소가 ' +
    '파손되어 헤렌하우젠 묘소(Herrenhausen Gardens)로 이장. 영국 본토에는 매장되지 않았다 — ' +
    '"영국 왕보다 하노버 영주를 더 좋아한 왕"의 별명을 그대로 반영하는 일화.',
  biography:
    '하노버 왕가(House of Hanover)의 시조이자 그레이트브리튼 2대 국왕(재위 1714-08-01 ~ ' +
    '1727-06-11, 약 12년 10개월). 신성로마 하노버 선제후 에른스트 아우구스트(Ernest Augustus, ' +
    '1629~1698)와 소피아 데 팔츠(Sophia of the Palatinate, 1630~1714 — 잉글랜드 제임스 1세의 ' +
    '외손녀)의 장남. 1660-05-28 하노버 출생.\n\n' +
    '1682 결혼·이혼. 1682년 사촌 첼레의 조피아 도로테아(Sophia Dorothea of Celle, 1666~1726)와 ' +
    '결혼 — 결혼 12년 차 1694년 부인의 외도(스웨덴 백작 필리프 폰 쾨니히스마르크) 발각 → 1694 ' +
    '쾨니히스마르크 의문 살해 + 부인을 알덴(Ahlden) 성에 32년간 종신 유폐. 부인이 1726-11-13 ' +
    '유폐 중 사망하자 조지 1세는 11개월 후 1727-06-11 사망 — 동시기 평민은 "부인의 저주"를 ' +
    '얘기했다.\n\n' +
    '1698 하노버 선제후 즉위. 1698-01-23 부친 에른스트 아우구스트 사망으로 하노버 선제후 ' +
    '(=신성로마 선제후 9번 슬롯) 즉위. 약 16년간 하노버를 통치하면서 1701년 모친 소피아가 영국 ' +
    '왕위계승법으로 잉글랜드 후계자로 지정되는 정치 변화를 관찰.\n\n' +
    '1701 영국 왕위계승법(Act of Settlement). 1701-06-12 잉글랜드 의회가 통과시킨 결정적 ' +
    '계승법 — 잉글랜드 왕위를 가톨릭이 아닌 신교도에게만 한정. 결과는 (1)앤 여왕 사망 후 직계 ' +
    '후계자 부재 시 (2)조지의 모친 소피아 데 팔츠(가장 가까운 신교도 친척, 잉글랜드 제임스 1세의 ' +
    '외손녀)가 후계자로 지정 (3)소피아 사망 시 그녀의 장남 게오르크(=조지 1세)에게 이전. 1714 ' +
    '소피아가 앤 여왕 사망 2개월 전에 먼저 사망 → 조지가 직접 잉글랜드 왕위 후계자로 부상.\n\n' +
    '1714 영국왕 즉위. 1714-08-01 앤 여왕 사망 직후 조지 1세 즉위. 54세에 영어를 거의 못하는 ' +
    '독일어 사용자 왕이었으며, 1714-09-18 그리니치 도착해 1714-10-20 웨스트민스터 사원에서 ' +
    '대관식. 즉위 시 영국 측 자코바이트(=망명 스튜어트 측 지지자)의 반발이 격렬, 1715-09 자코바이트 ' +
    '봉기(="올드 프리텐더" 제임스 프랜시스 에드워드 측)가 일어났으나 1716년 패전으로 진압.\n\n' +
    '1714~1727 통치 — 의원내각제 형성기. 영어 미숙 + 영국 정치 무관심으로 점차 영국 정치를 ' +
    '의회·내각에 위임하는 패턴 형성. 1721년 휘그 측 로버트 월폴(Robert Walpole, 1676~1745)을 ' +
    '제1재무위원(First Lord of the Treasury, 사실상 첫 "수상")으로 임명하면서 영국 의원내각제의 ' +
    '결정적 출발점. 월폴의 약 21년 재상(1721~1742)으로 의회 중심 통치 관행 정착.\n\n' +
    '1720 남해 거품(South Sea Bubble) 사건. 1720-01~1720-09 남해 회사(South Sea Company) ' +
    '주식 투기 거품·붕괴로 영국 경제 위기. 조지 1세 본인은 남해 회사 회장이었으나 정치적 책임은 ' +
    '월폴이 일부 측근을 처분하는 방식으로 회피. 월폴 정권의 결정적 안정화 계기.\n\n' +
    '1727 사망. 1727-06-11 하노버 방문 도중 오스나브뤼크에서 뇌졸중 사망. 장남 조지 2세(43세) ' +
    '즉위.\n\n' +
    '장기 유산. (1)하노버 왕가(1714~1901, 19세기 빅토리아 여왕까지)의 시조 (2)월폴 수상 ' +
    '임명으로 영국 의원내각제의 결정적 출발 (3)"영국 왕보다 하노버 영주를 더 좋아한 왕"으로 동시기 ' +
    '풍자 (4)1715 자코바이트 봉기 진압으로 신교도 왕정 안정화.',
  influence: 70,
  stats: {
    politics: 65,
    military: 70,
    diplomacy: 70,
    intellect: 60,
    charisma: 45,
    administration: 65,
    notes:
      '약 12년 10개월 재위. 영어 미숙·영국 정치 무관심이 오히려 의회·내각 자율을 키우는 결과로 ' +
      '이어져, 1721 월폴 수상 임명으로 영국 의원내각제의 결정적 출발점을 마련. 외교는 하노버 ' +
      '영지·신성로마 측 측면에서 적극적이었으며, 군사는 1715 자코바이트 봉기 진압에 성공. ' +
      '카리스마는 영어 미숙·부인 유폐 사건으로 동시기 영국 평민 평가는 결정적으로 부정적. 행정은 ' +
      '월폴 측에 위임. 학식·문화 후원도 미미.',
  },
  reign: {
    regnalNumber: 2,
    regnalName: '조지 1세',
    startYear: 1714,
    startMonth: 8,
    startDay: 1,
    endYear: 1727,
    endMonth: 6,
    endDay: 11,
    endReason: TenureEndReason.DEATH_IN_OFFICE,
    endReasonDetail: '1727-06-11 하노버 방문 도중 오스나브뤼크에서 뇌졸중으로 사망.',
    notes:
      '약 12년 10개월 재위. 하노버 왕가 시조. 1715 자코바이트 봉기 진압 → 1720 남해 거품 사건 → ' +
      '1721 월폴 수상 임명(영국 의원내각제 출발점). "영국 왕보다 하노버 영주를 더 좋아한 왕"의 ' +
      '별명. 장남 조지 2세에게 계승.',
  },
}

const GEORGE_II: MonarchSpec = {
  name: '조지',
  surname: '하노버',
  originalName: 'George II of Great Britain',
  regnalName: '2세',
  gender: 'MALE',
  dynastyName: '하노버 왕가',
  birthYear: 1683,
  birthMonth: 10,
  birthDay: 30,
  deathYear: 1760,
  deathMonth: 10,
  deathDay: 25,
  birthPlaceText: '신성로마제국 하노버 선제후국 헤렌하우젠 궁(Herrenhausen)',
  deathPlaceText: '그레이트브리튼 왕국 런던 켄싱턴 궁',
  deathType: DeathType.ILLNESS,
  deathCause: '대동맥류 파열 (향년 76세)',
  deathNote:
    '1760-10-25 런던 켄싱턴 궁의 화장실에서 향년 76세에 갑작스럽게 사망. 아침 화장실에서 ' +
    '큰 신음 소리 후 시종이 발견했을 때는 이미 사망 상태. 부검 결과는 "대동맥류 파열(aortic ' +
    'aneurysm rupture)" — 영국 군주 사상 화장실에서 사망한 마지막 군주. 부인 캐롤라인(1737 ' +
    '사망)과 약 23년 전 사별, 손자 조지(=후일 조지 3세, 22세)가 즉위. 시신은 웨스트민스터 ' +
    '사원의 헨리 7세 예배당에 매장 — 부인 캐롤라인의 관 옆에 매장되었는데, 두 관 사이의 면을 ' +
    '제거해 "사후에도 같은 공간에 안치"되도록 한 조지 2세의 유언이 실현됐다.',
  biography:
    '하노버 왕가의 그레이트브리튼 3대 국왕(재위 1727-06-11 ~ 1760-10-25, 약 33년 4개월). ' +
    '조지 1세와 첼레의 조피아 도로테아의 외아들. 1683-10-30 하노버 헤렌하우젠 궁에서 출생. ' +
    '11세였던 1694년 모친 조피아 도로테아가 외도 발각으로 알덴 성에 종신 유폐되었고, 평생 ' +
    '모친을 보지 못한 채 자랐다(부친 조지 1세와의 평생 갈등 원인).\n\n' +
    '1705 결혼. 22세에 안스바흐의 캐롤라인(Caroline of Ansbach, 1683~1737)과 결혼. 약 32년 ' +
    '결혼 생활 동안 8자녀를 두었으며, 캐롤라인은 동시기 평가에서 "영국 사상 가장 영향력 있는 ' +
    '왕비 중 1인"으로 평가받았다. 그녀는 월폴 수상과 긴밀히 협력해 조지 2세의 정치를 사실상 ' +
    '조율했다.\n\n' +
    '1714 영국 이주·왕세자. 부친 조지 1세 즉위로 31세에 영국으로 이주. 영어를 잘 구사한 첫 ' +
    '하노버 왕가 후계자였다(부친은 영어 미숙). 부친과의 갈등이 심해, 1717-12 왕세자 부부가 ' +
    '세인트제임스 궁에서 추방되어 별궁 거주.\n\n' +
    '1727 즉위. 1727-06-11 부친 사망 직후 43세 즉위. 즉위 직후 부친의 정치 측근들을 정리할 ' +
    '의도였으나, 부인 캐롤라인이 "월폴은 유능하다"고 설득해 월폴 수상직 유지. 결과는 월폴의 ' +
    '약 15년 추가 재상(1721~1742, 총 21년)으로 영국 의원내각제 완전 정착.\n\n' +
    '1739~1748 오스트리아 왕위계승전쟁. (1)1739~1748 "Jenkins\'s Ear 전쟁(스페인 측)" + ' +
    '(2)1740~1748 오스트리아 왕위계승전쟁(프로이센 측). 1743-06-27 데팅엔 전투(Battle of ' +
    'Dettingen)에서 조지 2세 본인이 직접 군 지휘 — 영국 군주 사상 마지막으로 전장에 나간 ' +
    '군주가 되었다. 1748 엑스라샤펠 조약(Aachen)으로 종결.\n\n' +
    '1745 자코바이트 봉기(\bThe \'45). 자코바이트 "영 프리텐더" 찰스 에드워드 스튜어트 ' +
    '(Bonnie Prince Charlie, 1720~1788)가 스코틀랜드 봉기 → 1745-09 더비(Derby)까지 진군해 ' +
    '런던 약 200km 거리까지 접근. 1746-04-16 컬로든(Culloden) 전투에서 조지 2세의 둘째 아들 ' +
    '컴벌랜드 공작 윌리엄(Duke of Cumberland, 1721~1765 — 별명 "백정 컴벌랜드(Butcher ' +
    'Cumberland)")이 결정적 승리. 스튜어트 왕가 복위 시도의 마지막 사례 — 자코바이트 정치 ' +
    '세력 완전 종결.\n\n' +
    '1756~1763 7년 전쟁. 1756-08 시작 → 조지 2세 사망 1760까지 전쟁 4년. 윌리엄 피트 1세 ' +
    '(William Pitt the Elder, 1708~1778) 수상 중심의 영국 측이 (1)1759 "Annus Mirabilis(기적의 ' +
    '해)" — 캐나다 퀘벡·인도 플라시·서인도제도·필리핀 등에서 프랑스 측에 결정적 승리 (2)1763 ' +
    '파리 조약(조지 3세 시기 종결)으로 캐나다·인도 식민지 확보. "제1차 영국 식민 제국" ' +
    '(1707~1783) 정점의 시작.\n\n' +
    '1737 캐롤라인 사망. 부인 캐롤라인이 1737-11-20 결혼 32년 차에 사망. 조지 2세는 평생 ' +
    '재혼하지 않았다. 1751 장남 프레더릭(Frederick, Prince of Wales, 1707~1751) 사망으로 ' +
    '후계자는 손자 조지(=후일 조지 3세).\n\n' +
    '1760 사망과 계승. 1760-10-25 켄싱턴 궁 화장실에서 대동맥류 파열로 사망. 손자 조지 3세 ' +
    '(22세)가 즉위.',
  influence: 75,
  stats: {
    politics: 70,
    military: 80,
    diplomacy: 70,
    intellect: 60,
    charisma: 60,
    administration: 70,
    notes:
      '약 33년 4개월 재위 — 18세기 영국 군주 중 최장기. 1743 데팅엔 전투에서 본인 직접 군 지휘로 ' +
      '영국 군주 사상 마지막으로 전장에 나간 군주. 1745 자코바이트 봉기 진압·1756~1763 7년 전쟁 ' +
      '초기 승전으로 군사적 입지 강했다. 정치는 월폴(1727~1742)·헨리 펠럼(Henry Pelham)·뉴캐슬 ' +
      '공작·윌리엄 피트 1세 등 강력한 수상들을 활용 — 영국 의원내각제 완전 정착기의 군주. 외교는 ' +
      '하노버 영지 보호 + 영국 식민 확장의 이중 목표. 카리스마는 부인 캐롤라인의 강력한 정치 ' +
      '조언으로 보강. 학식은 평이.',
  },
  reign: {
    regnalNumber: 3,
    regnalName: '조지 2세',
    startYear: 1727,
    startMonth: 6,
    startDay: 11,
    endYear: 1760,
    endMonth: 10,
    endDay: 25,
    endReason: TenureEndReason.DEATH_IN_OFFICE,
    endReasonDetail: '1760-10-25 켄싱턴 궁 화장실에서 향년 76세에 대동맥류 파열로 갑작스럽게 사망.',
    notes:
      '약 33년 4개월 재위. 1743 데팅엔 전투 본인 직접 지휘(영국 군주 사상 마지막 전장 출전 군주). ' +
      '1745 자코바이트 봉기 진압·1756~1763 7년 전쟁 초기 승전(1759 기적의 해). 부인 캐롤라인의 ' +
      '강력한 정치 조언. 장남 프레더릭(1751 사망)을 거치지 않고 손자 조지 3세 즉위.',
  },
}

const GEORGE_III: MonarchSpec = {
  name: '조지',
  surname: '하노버',
  originalName: 'George III of Great Britain',
  regnalName: '3세',
  gender: 'MALE',
  dynastyName: '하노버 왕가',
  birthYear: 1738,
  birthMonth: 6,
  birthDay: 4,
  deathYear: 1820,
  deathMonth: 1,
  deathDay: 29,
  birthPlaceText: '그레이트브리튼 왕국 런던 노포크 하우스(Norfolk House)',
  deathPlaceText: '그레이트브리튼 및 아일랜드 연합왕국 윈저 성(Windsor Castle)',
  deathType: DeathType.ILLNESS,
  deathCause: '정신 질환 + 시력·청력 상실 + 노환 (향년 81세)',
  deathNote:
    '1820-01-29 윈저 성에서 향년 81세에 사망. 1811년부터 마지막 9년간 "광기 발작(현대 학술 ' +
    '평가는 "포르피린증(porphyria)" 가설 + "양극성 장애" 가설이 병존)"이 결정적으로 악화 ' +
    '— 1811-02-05 정식으로 황태자 조지(=후일 조지 4세)에게 "섭정(Prince Regent)" 권한 이양. ' +
    '말년에는 시력·청력 거의 상실, 거동도 어려워 윈저 성의 별실에서 격리 거주. 시신은 ' +
    '1820-02-16 윈저 성 세인트조지 예배당에 매장. 영국 군주 중 가장 오래 산 군주 중 1인이자, ' +
    '하노버 왕가 출신 영국 왕 중 가장 영어를 모국어로 한 첫 왕(부친 조지 1세·할아버지 조지 2세는 ' +
    '독일어 사용자였음).',
  biography:
    '하노버 왕가의 그레이트브리튼 4대 + 그레이트브리튼 및 아일랜드 연합왕국 1대 국왕(재위 ' +
    '1760-10-25 ~ 1820-01-29, 약 59년 3개월 — 영국 군주 사상 3번째 최장 재위). 조지 2세의 ' +
    '장남 프레더릭과 작센고타의 아우구스타(Augusta of Saxe-Gotha, 1719~1772)의 장남. 1738-06-04 ' +
    '런던 노포크 하우스에서 출생. 12세였던 1751년 부친 프레더릭이 사망하면서 후계자(왕세자) ' +
    '신분으로 격상.\n\n' +
    '1760 즉위. 1760-10-25 할아버지 조지 2세 사망 직후 22세 즉위. 영어를 모국어로 한 첫 하노버 ' +
    '왕가 영국 왕 — "I glory in the name of Briton(나는 브리튼이라는 이름을 자랑스러워한다)"라는 ' +
    '즉위 연설로 영국 평민·정치계의 호감을 얻었다.\n\n' +
    '1761 결혼. 1761-09-08 메클렌부르크슈트렐리츠의 샤를로테(Charlotte of Mecklenburg- ' +
    'Strelitz, 1744~1818)와 결혼. 약 57년 결혼 생활 동안 15자녀(9남 6녀)를 두었으며, 그중 ' +
    '13명이 성인까지 생존 — 영국 왕가 사상 최대 자녀 수. 동시기 평가에서 모범적 가정 군주로 ' +
    '"Farmer George(농부 조지)" 별명 획득.\n\n' +
    '1763 7년 전쟁 종결. 즉위 후 3년 만에 1763-02-10 파리 조약으로 7년 전쟁 종결. 결과는 ' +
    '(1)캐나다·플로리다·인도 벵골 등 광대한 식민지 확보 (2)프랑스 식민 제국 사실상 와해 (3)"제1차 ' +
    '영국 식민 제국" 정점. 그러나 전쟁 비용 부담이 미국 식민지 측에 "인지세법(1765)·차세법 ' +
    '(1773)" 등 식민지 과세 강행의 직접 원인 — 미국 독립전쟁의 화근이 된다.\n\n' +
    '1775~1783 미국 독립전쟁. 통치 최대 실패. 1773-12-16 보스턴 차사건 → 1775-04-19 ' +
    '렉싱턴·콩코드 전투 → 1776-07-04 미국 독립 선언 → 1781-10-19 요크타운 전투 결정적 패배 → ' +
    '1783-09-03 파리 조약으로 13개 식민지 독립 정식 인정. 조지 3세의 강경 식민지 정책(원래는 ' +
    '재상 노스 경의 정책이지만 조지 3세 본인이 결정적으로 지지)이 미국 독립의 직접 명분. 영국 ' +
    '식민 제국 약 8년 만에 13개 식민지 상실.\n\n' +
    '1783~1801 소(小)피트 시대. 1783-12 24세의 윌리엄 피트(William Pitt the Younger, 1759~1806)가 ' +
    '역대 최연소 수상 임명. 약 17년(1783~1801) + 약 3년(1804~1806) 재상으로 영국 정치 안정화 + ' +
    '재정 회복 + 프랑스 혁명 전쟁 대응 주도.\n\n' +
    '1789~1815 프랑스 혁명 전쟁·나폴레옹 전쟁. 1789-07-14 프랑스 혁명 발발 → 1793-02 영국이 ' +
    '제1차 대프랑스 동맹 참전 → 약 22년 전쟁. 1797 케이프 세인트 빈센트 해전·1798 나일 해전· ' +
    '1805 트라팔가르 해전(넬슨)·1815 워털루 전투(웰링턴) 등 영국 측 결정적 승리. 조지 3세의 ' +
    '"광기 발작(1788~1789, 1801, 1804, 1810~)"은 이 전쟁 시기 통치 능력의 결정적 변수.\n\n' +
    '1801-01-01 아일랜드 통합법(Acts of Union 1800). 1801-01-01부터 그레이트브리튼 왕국과 ' +
    '아일랜드 왕국이 "그레이트브리튼 및 아일랜드 연합왕국(United Kingdom of Great Britain and ' +
    'Ireland)"으로 통합. 조지 3세는 "그레이트브리튼의 마지막 왕"이자 "연합왕국의 초대 왕"이 ' +
    '되었다. 통합의 결정적 추진력은 1798 아일랜드 봉기(Society of United Irishmen, 프랑스 측 ' +
    '지원)에 대한 영국의 대응.\n\n' +
    '1810~1820 섭정 시대(Regency Era). 1810-11 셋째 딸 아멜리아(27세)의 사망 충격으로 광기가 ' +
    '결정적으로 악화 → 1811-02-05 황태자 조지(=후일 조지 4세)에게 정식 섭정 권한 이양. 조지 3세는 ' +
    '말년 9년을 윈저 성 별실에서 격리, 시력·청력 거의 상실. 1820-01-29 사망.\n\n' +
    '장기 유산. (1)영국 군주 사상 3번째 최장 재위(59년 3개월) (2)"제1차 영국 식민 제국" ' +
    '정점·붕괴를 모두 겪은 군주 (3)1801 아일랜드 통합 — 그레이트브리튼 → 연합왕국 전환 ' +
    '(4)나폴레옹 전쟁 승전 (5)광기 발작·섭정 시대로 영국 입헌군주제 정착의 결정적 계기 (6)영국 ' +
    '군주 사상 가장 모범적 가정 군주 이미지 "Farmer George".',
  influence: 88,
  stats: {
    politics: 80,
    military: 70,
    diplomacy: 75,
    intellect: 70,
    charisma: 75,
    administration: 75,
    notes:
      '약 59년 3개월 재위(영국 군주 3번째 최장). 그레이트브리튼 시기 41년 + 연합왕국 시기 19년. ' +
      '1775~1783 미국 독립전쟁 실패가 통치 최대 약점 — 그러나 1793~1815 프랑스 혁명·나폴레옹 ' +
      '전쟁 22년 승전이 결정적 보강. 1801 아일랜드 통합·소피트 수상 시대의 정치 안정 + 프랑스 ' +
      '혁명·산업혁명·인구 폭증의 격동기를 무난히 이끈 군주. 광기 발작은 1788 첫 발작 이후 ' +
      '주기적 — 마지막 1810년 발작 후 9년 섭정 시대. 카리스마는 "Farmer George"·15자녀 가정 ' +
      '군주 이미지로 동시기 평민 호감 최상급. 행정·학식은 정원·농업·천문학에 깊은 관심.',
  },
  reign: {
    regnalNumber: 4,
    regnalName: '조지 3세',
    startYear: 1760,
    startMonth: 10,
    startDay: 25,
    endYear: 1801,
    endMonth: 1,
    endDay: 1, // 1801-01-01 아일랜드 통합법 — 그레이트브리튼 왕국 시기 종결
    endReason: TenureEndReason.STATE_DISSOLVED,
    endReasonDetail:
      '1801-01-01 아일랜드 통합법 발효로 그레이트브리튼 왕국이 "그레이트브리튼 및 아일랜드 ' +
      '연합왕국"으로 승계 — 조지 3세 본인은 연합왕국 1대로 계속 재위(1801-01-01 ~ 1820-01-29).',
    notes:
      '그레이트브리튼 왕국 시기 재위 약 40년 2개월. 1763 파리 조약·7년 전쟁 종결 → 1775~1783 ' +
      '미국 독립전쟁 패배 → 1783~1801 소피트 수상 시대 → 1789~ 프랑스 혁명·1793~ 프랑스 혁명 ' +
      '전쟁 → 1788 첫 광기 발작 → 1801-01-01 아일랜드 통합 후 연합왕국으로 계속. 영국 식민 ' +
      '제국 정점·붕괴·재건의 모든 단계를 겪은 군주.',
  },
}

const ALL_BRITISH_MONARCHS = [ANNE, GEORGE_I, GEORGE_II, GEORGE_III] as const

export async function seedGreatBritainMonarchs(prisma: PrismaService): Promise<void> {
  console.log('\n👑 그레이트브리튼 왕국 라인업 시딩 시작 (기존 데이터 보존 모드)...')

  const admin = await prisma.account.findUnique({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  ⚠️  admin 계정 미존재')
    return
  }

  const gbkHC = await prisma.historicalCountry.findFirst({
    where: { name: '그레이트브리튼 왕국' },
    select: { id: true },
  })
  if (!gbkHC) {
    console.warn('  ⚠️  그레이트브리튼 왕국 HC 미존재')
    return
  }

  const kingPos = await prisma.governmentPositionDefinition.findFirst({
    where: { title: '국왕' },
    select: { id: true },
  })
  if (!kingPos) {
    console.warn('  ⚠️  관직 정의 \'국왕\' 미존재')
    return
  }

  // ── 0) 스튜어트 왕가 등록 ───────────────────────────────────────────────
  const dynastyIdByName: Record<string, string> = {}
  const stuartExists = await prisma.dynasty.findFirst({ where: { name: STUART_DYNASTY.name } })
  if (stuartExists) {
    console.log(`  ⏭️  가문 스킵: ${STUART_DYNASTY.name}`)
    dynastyIdByName[STUART_DYNASTY.name] = stuartExists.id
  } else {
    const created = await prisma.dynasty.create({
      data: {
        name: STUART_DYNASTY.name,
        description: STUART_DYNASTY.description,
        startDate: new Date(STUART_DYNASTY.startYear, 0, 1),
        endDate: new Date(STUART_DYNASTY.endYear, 11, 31),
      },
    })
    console.log(`  ✅ 가문 생성: ${STUART_DYNASTY.name}`)
    dynastyIdByName[STUART_DYNASTY.name] = created.id
  }
  const hanover = await prisma.dynasty.findFirst({ where: { name: '하노버 왕가' } })
  if (hanover) dynastyIdByName['하노버 왕가'] = hanover.id

  // ── 1) Person 등록 ──────────────────────────────────────────────────────
  const personIdByOriginalName: Record<string, string> = {}
  for (const spec of ALL_BRITISH_MONARCHS) {
    const existing = await prisma.person.findFirst({
      where: { originalName: spec.originalName },
    })
    if (existing) {
      console.log(`  ⏭️  인물 스킵: ${spec.originalName}`)
      personIdByOriginalName[spec.originalName] = existing.id
      continue
    }
    const created = await prisma.person.create({
      data: {
        name: spec.name,
        surname: spec.surname,
        originalName: spec.originalName,
        regnalName: spec.regnalName,
        biography: spec.biography,
        birthDate: new Date(spec.birthYear, spec.birthMonth - 1, spec.birthDay),
        birthEra: 'AD' as any,
        deathDate: new Date(spec.deathYear, spec.deathMonth - 1, spec.deathDay),
        deathEra: 'AD' as any,
        gender: spec.gender,
        nameDisplayOrder: 'western' as any,
        dynastyId: dynastyIdByName[spec.dynastyName],
        birthPlaceText: spec.birthPlaceText,
        deathPlaceText: spec.deathPlaceText,
        deathType: spec.deathType,
        deathCause: spec.deathCause,
        deathNote: spec.deathNote,
        influence: spec.influence,
        accountId: admin.id,
      },
    })
    console.log(`  ✅ 인물 생성: ${spec.originalName}`)
    personIdByOriginalName[spec.originalName] = created.id
  }

  // ── 2) PersonStats ─────────────────────────────────────────────────────
  for (const spec of ALL_BRITISH_MONARCHS) {
    const pid = personIdByOriginalName[spec.originalName]
    if (!pid) continue
    const exists = await prisma.personStats.findFirst({
      where: { personId: pid, accountId: admin.id },
    })
    if (exists) continue
    await prisma.personStats.create({
      data: {
        personId: pid,
        accountId: admin.id,
        politics: spec.stats.politics,
        military: spec.stats.military,
        diplomacy: spec.stats.diplomacy,
        intellect: spec.stats.intellect,
        charisma: spec.stats.charisma,
        administration: spec.stats.administration,
        notes: spec.stats.notes,
      },
    })
    console.log(`    ✅ ${spec.regnalName} 능력치 등록`)
  }

  // ── 3) PersonCountryAffiliation (그레이트브리튼 왕국) ──────────────────
  for (const spec of ALL_BRITISH_MONARCHS) {
    const pid = personIdByOriginalName[spec.originalName]
    if (!pid) continue
    const exists = await prisma.personCountryAffiliation.findFirst({
      where: {
        personId: pid,
        historicalCountryId: gbkHC.id,
        affiliationType: 'CITIZENSHIP' as any,
      },
    })
    if (exists) continue
    await prisma.personCountryAffiliation.create({
      data: {
        personId: pid,
        historicalCountryId: gbkHC.id,
        affiliationType: 'CITIZENSHIP' as any,
        priority: 0,
      },
    })
  }
  console.log(`  ✅ 소속국가 처리 완료`)

  // ── 4) SovereignReign ──────────────────────────────────────────────────
  for (const spec of ALL_BRITISH_MONARCHS) {
    const pid = personIdByOriginalName[spec.originalName]
    if (!pid) continue
    const existing = await prisma.sovereignReign.findFirst({
      where: { personId: pid, historicalCountryId: gbkHC.id },
    })
    if (existing) {
      console.log(`  ⏭️  재임 스킵: ${spec.reign.regnalName}`)
      continue
    }
    const slot = await prisma.sovereignReign.findFirst({
      where: { historicalCountryId: gbkHC.id, regnalNumber: spec.reign.regnalNumber },
    })
    if (slot) {
      console.warn(`  ⚠️  재임 충돌: 그레이트브리튼 ${spec.reign.regnalNumber}대 (skip)`)
      continue
    }
    await prisma.sovereignReign.create({
      data: {
        personId: pid,
        historicalCountryId: gbkHC.id,
        positionDefinitionId: kingPos.id,
        regnalNumber: spec.reign.regnalNumber,
        regnalName: spec.reign.regnalName,
        startDate: new Date(spec.reign.startYear, spec.reign.startMonth - 1, spec.reign.startDay),
        endDate: new Date(spec.reign.endYear, spec.reign.endMonth - 1, spec.reign.endDay),
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: spec.reign.endReason,
        endReasonDetail: spec.reign.endReasonDetail,
        notes: spec.reign.notes,
        accountId: admin.id,
      },
    })
    console.log(
      `  ✅ 재임: 그레이트브리튼 ${spec.reign.regnalName} ${spec.reign.regnalNumber}대 (${spec.reign.startYear}~${spec.reign.endYear})`,
    )
  }

  // ── 5) 부자 관계 ─────────────────────────────────────────────────────
  const g1 = personIdByOriginalName['George I of Great Britain']
  const g2 = personIdByOriginalName['George II of Great Britain']
  const g3 = personIdByOriginalName['George III of Great Britain']
  // 조지 1세 → 조지 2세 직계
  if (g1 && g2) {
    const c = await prisma.person.findUnique({ where: { id: g2 }, select: { fatherId: true } })
    if (!c?.fatherId) {
      await prisma.person.update({ where: { id: g2 }, data: { fatherId: g1 } })
      console.log(`  ✅ 부자: 조지 1세 → 조지 2세`)
    }
  }
  // 조지 3세의 부친은 프레더릭(미등록) — 직접 연결 생략 (할아버지 조지 2세도 부친 아님)
  // 향후 프레더릭(Frederick, Prince of Wales) 등록 시 보강

  console.log(`✅ 그레이트브리튼 왕국 라인업 시딩 완료\n`)
}
