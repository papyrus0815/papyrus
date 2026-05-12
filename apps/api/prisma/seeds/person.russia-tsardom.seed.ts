/**
 * 러시아 차르국(Tsardom of Russia, 1547~1721) 군주 라인업 시드.
 *
 *  1547-01-16 이반 4세 "뇌제" 차르 즉위 ~ 1721-11-02 표트르 1세의 러시아 제국 선포까지
 *  약 174년간의 차르국 시대 11대 군주를 등록·연결.
 *
 *  ⚠️ 기존 데이터 보존 모드. 이미 등록된 인물(Ivan V·Peter I)은 보강만 한다.
 *  ⚠️ 의존: historicalCountry.russia.seed (러시아 차르국 HC), dynasty.romanov.seed (로마노프 왕조)
 *
 * 등록 항목:
 *  - Dynasty x3 신규 (류리크 가문·고두노프 가문·슈이스키 가문)
 *  - Person x9 신규 (이반 4세·표도르 1세·보리스 고두노프·표도르 2세·가짜 드미트리 1세·
 *                    바실리 4세·미하일 1세·알렉세이·표도르 3세)
 *  - Person 보강 x1 (Ivan V dynasty/regnalName 정정)
 *  - PersonStats x9 신규
 *  - PersonCountryAffiliation x11 (Tsardom 시민권)
 *  - SovereignReign x11 (Tsardom 1~11대)
 *      · 이반 5세(10대)와 표트르 1세(11대)는 1682~1696 공동 통치
 *      · 표트르 1세는 러시아 제국 1대 재임이 이미 등록되어 있으므로, Tsardom 재임을 별도로 추가
 *  - 부자 관계 일부 (Mikhail → Aleksei → Feodor III, Aleksei → 이반 5세·표트르 1세)
 *
 * 차르국 라인업:
 *   1.이반 4세(류리크) → 2.표도르 1세(류리크, 마지막) → 3.보리스 고두노프(고두노프) →
 *   4.표도르 2세(고두노프) → 5.가짜 드미트리 1세 → 6.바실리 4세(슈이스키) →
 *   "혼란기 1610~1613 보야르 7인 정권" →
 *   7.미하일 1세(로마노프 시조) → 8.알렉세이 → 9.표도르 3세 →
 *   10.이반 5세 + 11.표트르 1세(1682~1696 공동) → 11.표트르 1세 단독(1696~1721) → 러시아 제국 선포
 */
import {
  AppointmentMethod,
  DeathType,
  TenureEndReason,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

// ── 가문 명세 ──────────────────────────────────────────────────────────────
const DYNASTIES = [
  {
    name: '류리크 가문',
    description:
      '862년 노브고로드의 바이킹 출신 류리크(Rurik, ?~879)가 슬라브 부족 연합에 초청되어 통치를 시작한 ' +
      '것에서 기원한 동슬라브계 왕가. 키예프 루스(882~1240)·블라디미르-수즈달 공국·모스크바 대공국 ' +
      '(1263~1547)·러시아 차르국(1547~1598)까지 약 736년간 동슬라브 세계의 지배 가문으로 군림했다. ' +
      '1547년 이반 4세가 "전(全)러시아의 차르"를 자칭하며 차르국으로 격상, 1598년 표도르 1세 ' +
      '사망으로 류리크 직계가 단절되면서 "동란시대(Time of Troubles)"가 시작되었다. ' +
      '슈이스키 공작 가문은 류리크 가문의 분지로, 1606~1610 바실리 4세는 사실상 류리크 가문의 ' +
      '마지막 차르였다.',
    startYear: 862,
    endYear: 1610,
  },
  {
    name: '고두노프 가문',
    description:
      '13세기 타타르 출신 무르자(귀족) Chet-Murza의 후손이라 자칭한 모스크바 보야르 가문. ' +
      '본격적으로 등장한 것은 16세기 후반 보리스 고두노프(1551~1605)가 이반 4세의 처남이자 ' +
      '표도르 1세의 섭정으로 권력을 장악하면서다. 1598년 류리크 직계 단절 후 보리스 고두노프가 ' +
      '"전(全)러시아 차르"로 선출되었으나, 1605년 그의 사망 직후 아들 표도르 2세가 즉위 45일 ' +
      '만에 "가짜 드미트리 1세" 측 쿠데타로 살해되며 가문은 약 7년 만에 차르 자리에서 ' +
      '축출되었다. 동란시대의 격동을 상징하는 가문.',
    startYear: 1598,
    endYear: 1605,
  },
  {
    name: '슈이스키 가문',
    description:
      '류리크 가문의 모스크바 분지 중 하나로, 13세기 블라디미르 대공 알렉산드르 넵스키의 동생 ' +
      'Andrey Yaroslavich의 후손이라 자칭한 보야르 공작 가문. 16세기 후반부터 모스크바 정치에서 ' +
      '결정적 역할을 했으며, 1606년 바실리 4세가 "가짜 드미트리 1세" 살해 쿠데타로 차르 즉위. ' +
      '4년 1개월 후 1610년 폴란드 침공에 패하면서 보야르들에게 폐위되어 폴란드로 인도되었고, ' +
      '1612년 모스크바 망명 중 사망. 가문은 동란시대 막바지의 한 정치 세력으로 단명했다.',
    startYear: 1606,
    endYear: 1610,
  },
] as const

// ── 인물 명세 ──────────────────────────────────────────────────────────────
type Stats = {
  politics: number
  military: number
  diplomacy: number
  intellect: number
  charisma: number
  administration: number
  notes: string
}

interface TsarSpec {
  name: string
  surname: string
  originalName: string
  regnalName: string
  gender: 'MALE' | 'FEMALE'
  dynastyName: string | null
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
    appointmentMethod: AppointmentMethod
    endReason: TenureEndReason
    endReasonDetail: string
    notes: string
  }
}

const IVAN_IV: TsarSpec = {
  name: '이반',
  surname: '류리크',
  originalName: 'Ivan IV of Russia',
  regnalName: '4세 (뇌제)',
  gender: 'MALE',
  dynastyName: '류리크 가문',
  birthYear: 1530,
  birthMonth: 8,
  birthDay: 25,
  deathYear: 1584,
  deathMonth: 3,
  deathDay: 28,
  birthPlaceText: '모스크바 대공국 모스크바 인근 콜로멘스코예(Kolomenskoye)',
  deathPlaceText: '러시아 차르국 모스크바 크렘린(Moscow Kremlin)',
  deathType: DeathType.ILLNESS,
  deathCause: '뇌졸중 추정(또는 수은 중독 가설)',
  deathNote:
    '1584-03-28 모스크바 크렘린에서 향년 53세에 사망. 사망 당일 측근 보리스 고두노프와 체스를 두던 중 ' +
    '갑자기 쓰러져 의식을 잃고 사망했다. 동시기 기록은 뇌졸중을 추정했으나, 1963년 묘소 발굴 후 ' +
    '소비에트 학술 조사에서 시신·뼈에서 정상치의 약 32배 수은이 검출되어 수은 중독설(점진적 또는 ' +
    '독살) 가설이 유력해졌다. 임종 시 옆에는 차남(=후일 표도르 1세, 27세)·고두노프 등 측근. ' +
    '시신은 모스크바 크렘린 대천사 성당(Cathedral of the Archangel)에 안치, 21세기 현재까지 보존.',
  biography:
    '류리크 가문 모스크바 분지의 모스크바 대공(재위 1533~1547, 3세 즉위) + 러시아 차르국 초대 차르 ' +
    '(재위 1547-01-16 ~ 1584-03-28, 약 37년 2개월). 부친 바실리 3세(1479~1533) 사망으로 3세에 즉위, ' +
    '모친 옐레나 글린스카야(1510~1538)의 섭정·보야르 권력 다툼 속에 자랐다.\n\n' +
    '1547 차르 즉위. 1547-01-16 16세에 모스크바 대주교 마카리오스에게 "전(全)러시아의 차르 ' +
    '(Tsar of all Russias)"로 대관 — 동슬라브 세계 최초의 "차르" 칭호 정식 사용. 차르(Tsar)는 ' +
    '라틴어 카이사르(Caesar)에서 온 칭호로, 동방정교회 비잔틴 제국 황제 계승자임을 천명한 것이다.\n\n' +
    '초기 개혁 (1547~1560 — "선택된 라다" 시대). 16~30세 초반의 청년 차르 시기, 측근 "선택된 ' +
    '라다(Chosen Council)"와 함께 (1)1550 새 법전(Sudebnik) (2)1551 교회 100장 회의(Stoglav) ' +
    '(3)상비군 "스트렐치(Streltsy)" 창설 (4)Zemsky Sobor(국민의회) 정기화 (5)1552 카잔 칸국 정복 ' +
    '(6)1556 아스트라한 칸국 정복으로 볼가 유역 전체 합병. 동시기 유럽에서 가장 진보적 개혁 군주 ' +
    '중 1인으로 평가받았다.\n\n' +
    '1565~1572 오프리치니나(Oprichnina) — 광기의 공포정치. 1565년 갑작스러운 정치 노선 변경 — ' +
    '국토를 "오프리치니나(차르 직속 영지)"와 "젬시나(전통 보야르 영지)"로 분할하고, 검은 옷·검은 말 ' +
    '엘리트 친위대(오프리치니키)를 동원해 약 7년간 보야르·교회·도시를 무차별 학살. 추정 사망자 ' +
    '4,500~수만 명. 1570년 노브고로드 학살(약 1,500~12,000명 살해)이 정점. 1572년 크림 칸국의 ' +
    '모스크바 약탈로 오프리치니나가 군사적으로 실패함이 드러나면서 폐지.\n\n' +
    '1581 아들 살해 사건. 1581-11-19 격분 중에 후계자 장남 이반(=이반 이바노비치, 27세)의 ' +
    '머리를 지팡이로 가격해 사망케 함. 일리야 레핀의 1885년 그림 "이반 뇌제와 그의 아들 이반"으로 ' +
    '유명. 장남 사망으로 후계자는 차남 표도르(병약하고 정치적 무능)로 좁혀졌고, 이는 1598년 ' +
    '류리크 직계 단절·동란시대의 직접적 원인이 되었다.\n\n' +
    '1558~1583 리보니아 전쟁. 25년 전쟁으로 발트해 진출을 시도했으나 폴란드-리투아니아·스웨덴· ' +
    '덴마크 연합에 패배. 노르웨이·핀란드 일부 점령 후 1583 야무자폴스키 강화로 거의 모든 점령지 ' +
    '상실. 차르국 재정 파탄·인구 1/3 감소의 직접 원인.\n\n' +
    '장기 유산. (1)"차르" 칭호와 "모스크바=제3의 로마" 이데올로기 정착 (2)카잔·아스트라한 정복으로 ' +
    '러시아 동방 진출의 토대 (3)오프리치니나 트라우마로 약 1세기 보야르 권력 위축 (4)장남 살해와 ' +
    '리보니아 전쟁 실패가 동란시대의 직접 원인 (5)일리야 레핀·세르게이 에이젠시테인(1944년 영화) ' +
    '등의 예술적 재현으로 "공포 정치의 원형" 이미지 확립.',
  influence: 92,
  stats: {
    politics: 80,
    military: 75,
    diplomacy: 50,
    intellect: 85,
    charisma: 70,
    administration: 70,
    notes:
      '초기 "선택된 라다" 시대의 개혁(1547~1560)은 동시기 유럽 최고 수준. 카잔·아스트라한 정복으로 ' +
      '러시아 동방 진출의 토대 마련. 학식은 신학·역사·서한 작성에서 동시기 동슬라브 군주 최고급. ' +
      '그러나 1565~1572 오프리치니나 공포정치·1581 장남 살해·1558~1583 리보니아 전쟁 25년 실패로 ' +
      '말년 평가는 "광기의 폭군". 외교는 잉글랜드 엘리자베스 1세와의 서신 교환·통상에서 적극적이었으나 ' +
      '발트해·서유럽 정세 판단은 결정적으로 실패. 카리스마는 보야르·민중 모두에게 공포의 대상으로 ' +
      '동시기 유럽 군주 중 가장 강렬한 인상.',
  },
  reign: {
    regnalNumber: 1,
    regnalName: '이반 4세 (뇌제)',
    startYear: 1547,
    startMonth: 1,
    startDay: 16,
    endYear: 1584,
    endMonth: 3,
    endDay: 28,
    appointmentMethod: AppointmentMethod.HEREDITARY,
    endReason: TenureEndReason.DEATH_IN_OFFICE,
    endReasonDetail: '1584-03-28 모스크바 크렘린에서 향년 53세에 뇌졸중(또는 수은 중독)으로 사망.',
    notes:
      '1547-01-16 모스크바 대주교 마카리오스에게 "전(全)러시아의 차르" 대관 — 차르국 1대. 약 37년 ' +
      '2개월 재위. 1547~1560 개혁기·1565~1572 오프리치니나 공포정치·1558~1583 리보니아 전쟁의 ' +
      '세 시기로 구분된다. 1581 장남 살해로 차남 표도르 1세가 후계자가 되었다.',
  },
}

const FEODOR_I: TsarSpec = {
  name: '표도르',
  surname: '류리크',
  originalName: 'Feodor I of Russia',
  regnalName: '1세',
  gender: 'MALE',
  dynastyName: '류리크 가문',
  birthYear: 1557,
  birthMonth: 5,
  birthDay: 31,
  deathYear: 1598,
  deathMonth: 1,
  deathDay: 17,
  birthPlaceText: '모스크바 대공국 모스크바',
  deathPlaceText: '러시아 차르국 모스크바 크렘린',
  deathType: DeathType.ILLNESS,
  deathCause: '병약체질 + 자연사 (향년 40세)',
  deathNote:
    '1598-01-17 모스크바 크렘린에서 향년 40세에 자연사. 정확한 사인은 동시기 기록상 "오랜 ' +
    '병약체질의 자연사". 어린 시절부터 발달 지연·언어 장애·잦은 발작이 있었던 것으로 알려져 있다. ' +
    '임종 시 후계자가 없어 "모스크바의 거룩한 차르가 누구를 후계자로 정할 것인가" 질문에 ' +
    '"하느님께 맡긴다"고 답해 사실상 류리크 가문 차르 계승선이 단절됐다. 처남 보리스 고두노프가 ' +
    '약 8개월 후 1598-09-11 차르 선출. 시신은 모스크바 크렘린 대천사 성당에 안치.',
  biography:
    '류리크 가문 모스크바 분지의 마지막 차르(재위 1584-03-28 ~ 1598-01-17, 약 13년 9개월). ' +
    '이반 4세 뇌제와 두 번째 부인 아나스타시아 로마노브나(Anastasia Romanovna, 1530?~1560 — ' +
    '후일 로마노프 가문의 친정 명조)의 둘째 아들. 형 이반 이바노비치(1554~1581)가 1581년 부친에 ' +
    '의해 살해되면서 후계자가 되었다.\n\n' +
    '1584 즉위 — "축복받은 차르". 1584-03-28 부친 사망으로 27세에 즉위. 동시기 평가에서 ' +
    '"경건하고 자비로운 차르"로 알려졌으며, 통치 실권은 처남 보리스 고두노프(부인 이리나의 형)가 ' +
    '14년간 사실상 섭정으로 행사했다. 별칭은 "축복받은 자(Feodor the Bellringer)" — 종을 울리며 ' +
    '기도하기를 좋아했다는 일화에서 유래.\n\n' +
    '1589 모스크바 총대주교청 설립. 가장 결정적 통치 업적 — 1589-01-26 콘스탄티노폴리스 총대주교 ' +
    'Jeremiah II로부터 모스크바 총대주교청 독립을 승인받음. 모스크바 메트로폴리탄 욥(Job)이 초대 ' +
    '총대주교 즉위. 동방정교회 제5 총대주교청 설립으로 "모스크바=제3의 로마" 이데올로기가 ' +
    '교회 측에서 공식 인준받은 결정적 사건이다.\n\n' +
    '1591 우글리치 사건 — 동란시대의 씨앗. 1591-05-15 표도르의 이복 동생 드미트리 ' +
    '(Dmitry Ivanovich, 1582~1591, 이반 4세의 세 번째/일곱 번째 부인 소생, 9세)가 우글리치에서 ' +
    '목을 찔린 채 발견. 공식 조사 위원(보리스 고두노프 측 바실리 슈이스키)은 "간질 발작 중 칼에 ' +
    '찔린 사고사"로 결론. 그러나 동시기 민간 소문은 "고두노프가 후계 다툼을 미리 제거하려 ' +
    '암살했다"는 설이 우세. 이 사건은 후일 1605~1612 동란시대 "가짜 드미트리 1세·2세·3세" ' +
    '봉기의 직접 명분이 된다.\n\n' +
    '1598 사망 — 류리크 직계 단절. 1598-01-17 자녀 없이 사망. 부인 이리나 고두노바와의 사이에 ' +
    '딸 페오도시야(1592~1594, 영아 사망)가 있었으나 일찍 사망. 표도르의 사망으로 류리크 가문 ' +
    '모스크바 분지가 단절(=약 736년의 동슬라브 류리크 왕가 종결)되면서 약 8개월의 공위기 후 ' +
    '1598-09-11 보리스 고두노프가 Zemsky Sobor 선출로 차르 즉위. 동란시대(1598~1613)의 출발점이다.',
  influence: 50,
  stats: {
    politics: 30,
    military: 25,
    diplomacy: 30,
    intellect: 35,
    charisma: 55,
    administration: 30,
    notes:
      '발달 지연·언어 장애로 통치 실권은 처남 보리스 고두노프가 사실상 행사. 본인의 직접 정치 ' +
      '활동은 거의 없으나 1589 모스크바 총대주교청 설립이 결정적 업적. 동시기 평가는 ' +
      '"경건하고 자비로운 차르"로 우호적. 카리스마는 종교적 신앙심·평화로운 성품으로 민중에게 ' +
      '"축복받은 차르"로 사랑받았으나 정치·군사적 실권 없음. 1598 자녀 없이 사망으로 류리크 ' +
      '직계 단절 — 동란시대의 직접 원인.',
  },
  reign: {
    regnalNumber: 2,
    regnalName: '표도르 1세',
    startYear: 1584,
    startMonth: 3,
    startDay: 28,
    endYear: 1598,
    endMonth: 1,
    endDay: 17,
    appointmentMethod: AppointmentMethod.HEREDITARY,
    endReason: TenureEndReason.DEATH_IN_OFFICE,
    endReasonDetail: '1598-01-17 자녀 없이 자연사 — 류리크 직계 단절.',
    notes:
      '약 13년 9개월 재위. 통치 실권은 처남 보리스 고두노프가 사실상 섭정. 1589 모스크바 ' +
      '총대주교청 설립이 결정적 업적. 1591 우글리치 사건(이복 동생 드미트리 의문사)이 후일 ' +
      '동란시대의 명분. 1598-01-17 자녀 없이 사망으로 류리크 가문 모스크바 분지 단절.',
  },
}

const BORIS_GODUNOV: TsarSpec = {
  name: '보리스',
  surname: '고두노프',
  originalName: 'Boris Godunov',
  regnalName: '',
  gender: 'MALE',
  dynastyName: '고두노프 가문',
  birthYear: 1551,
  birthMonth: 1,
  birthDay: 1,
  deathYear: 1605,
  deathMonth: 4,
  deathDay: 23,
  birthPlaceText: '모스크바 대공국 비예지치(Vyazma) 인근 — 고두노프 가문 영지',
  deathPlaceText: '러시아 차르국 모스크바 크렘린',
  deathType: DeathType.ILLNESS,
  deathCause: '뇌졸중 추정 (또는 독살설)',
  deathNote:
    '1605-04-23 모스크바 크렘린에서 향년 약 54세에 갑작스럽게 사망. 동시기 기록은 식사 직후 ' +
    '코·귀에서 출혈하며 쓰러져 약 2시간 만에 사망한 것으로 전한다. 사인은 동시기 추정 ' +
    '뇌졸중 또는 심부전, 일부 학술 평가는 가짜 드미트리 1세 측의 독살설을 제기한다. 임종 직전 ' +
    '아들 표도르(=후일 표도르 2세, 16세)에게 차르 자리 계승을 부탁. 시신은 처음 모스크바 ' +
    '크렘린 대천사 성당에 안치되었으나 약 1년 후 1606년 가짜 드미트리 1세의 명령으로 시신이 ' +
    '파헤쳐져 모스크바 외곽의 평민 묘지로 이장되는 모욕을 당했다. 후일 1622년 표트르 대제의 ' +
    '시조 미하일 1세 시대에 트로이체-세르기예바 라브라(Trinity Lavra of St. Sergius)에 ' +
    '재안치되었다.',
  biography:
    '고두노프 가문 출신의 러시아 차르국 3대 차르(재위 1598-09-11 ~ 1605-04-23, 약 6년 7개월). ' +
    '오프리치니키(이반 4세 친위대) 출신의 보야르 가문에서 입신해, 1571년 이반 4세의 둘째 아들 ' +
    '표도르(=후일 표도르 1세)에게 누이 이리나를 시집보내며 차르가의 인척이 되었다. 1584년 표도르 ' +
    '1세 즉위 후 약 14년간 사실상 섭정으로 통치 실권 행사.\n\n' +
    '1591 우글리치 사건. 1591-05-15 어린 드미트리 이바노비치(9세, 이반 4세의 막내 아들, ' +
    '잠재 후계자) 의문사. 공식 조사는 사고사로 결론냈으나, 보리스 고두노프가 후계 다툼을 미리 ' +
    '제거하기 위해 암살했다는 동시기 소문이 우세했다. 후일 가짜 드미트리 1세 봉기의 직접 명분.\n\n' +
    '1598 차르 선출. 1598-01-17 표도르 1세 자녀 없이 사망 → 1598-09-11 Zemsky Sobor가 처남 ' +
    '보리스 고두노프를 새 차르로 선출. 류리크 가문이 아닌 가문에서 차르가 나온 사상 첫 사례. ' +
    '대관은 모스크바 크렘린 우스펜스키 성당에서 거행.\n\n' +
    '1601~1603 대기근 — 동란시대 직접 발화점. 1601년 시작된 "Little Ice Age(소빙기)"의 ' +
    '결정적 한파로 모스크바 인근 작물 전멸. 1601~1603 약 2년간 차르국 인구의 약 1/3 ' +
    '(추정 약 200만 명)이 굶주려 사망. 정부 곡물 분배 시도에도 정실 분배·매점매석으로 사실상 ' +
    '실패. 보리스 고두노프의 통치 정당성이 결정적으로 약화 — 동시기 민중은 "고두노프 차르의 ' +
    '죄" 때문에 하느님이 기근을 내렸다고 해석.\n\n' +
    '1604 가짜 드미트리 1세 봉기. 1604년 폴란드 측 지원을 받은 "가짜 드미트리 1세"(=Grigory ' +
    'Otrepyev, 도망 수도승)가 1591년 우글리치에서 죽은 어린 드미트리를 자칭하며 봉기. ' +
    '폴란드 사령관 사령군 + 카자크 + 모스크바 측 불만 세력이 결집. 약 1년 동안 모스크바 측 군대가 ' +
    '계속 패전하며 봉기군이 모스크바로 진군. 1605-04-23 보리스 고두노프가 갑작스럽게 사망하면서 ' +
    '봉기군이 사실상 무혈로 모스크바 입성.\n\n' +
    '사후 명예 훼손. 보리스 사망 직후 아들 표도르 2세가 즉위 45일 만에 가짜 드미트리 1세 ' +
    '측에 살해되면서 가문 단절. 1606년 가짜 드미트리 1세가 보리스의 시신을 파헤쳐 모스크바 ' +
    '외곽의 평민 묘지로 이장하는 모욕을 가했다. 푸시킨의 1825년 시극 "보리스 고두노프"· ' +
    '무소르그스키의 1869년 오페라 "보리스 고두노프"가 그의 비극적 통치를 예술적으로 재현.',
  influence: 70,
  stats: {
    politics: 80,
    military: 65,
    diplomacy: 75,
    intellect: 75,
    charisma: 65,
    administration: 80,
    notes:
      '약 14년 섭정 + 6년 7개월 차르 재위. 행정 능력 우수 — 1597 농노법(농민 이동 금지)·1589 ' +
      '총대주교청 설립의 실무 기획·1591 시베리아 진출 확대. 정치적 수완은 류리크 가문 단절기에 ' +
      '비귀족 출신으로 차르 자리를 차지한 결정적 사례. 그러나 1601~1603 대기근의 통치 정당성 ' +
      '추락·1604 가짜 드미트리 1세 봉기 대응 실패로 말년 평가는 비극적. 군사는 본인 직접 지휘는 ' +
      '없으나 가짜 드미트리 1세 봉기 군 대응에서 결정적 실패. 외교는 잉글랜드·신성로마와의 통상 ' +
      '확대에서 성과.',
  },
  reign: {
    regnalNumber: 3,
    regnalName: '보리스 고두노프',
    startYear: 1598,
    startMonth: 9,
    startDay: 11,
    endYear: 1605,
    endMonth: 4,
    endDay: 23,
    appointmentMethod: AppointmentMethod.INDIRECT_ELECTION,
    endReason: TenureEndReason.DEATH_IN_OFFICE,
    endReasonDetail: '1605-04-23 모스크바 크렘린에서 갑작스럽게 사망 (뇌졸중 또는 독살).',
    notes:
      '1598-09-11 Zemsky Sobor가 선출 — 류리크 가문이 아닌 가문에서 차르가 나온 사상 첫 사례. ' +
      '약 6년 7개월 재위. 1601~1603 대기근으로 인구 1/3 사망·통치 정당성 추락 → 1604 가짜 드미트리 ' +
      '1세 봉기 — 1605-04-23 갑작스러운 사망 직후 봉기군이 무혈 입성. 동란시대 격동의 핵심 시기.',
  },
}

const FEODOR_II: TsarSpec = {
  name: '표도르',
  surname: '고두노프',
  originalName: 'Feodor II of Russia',
  regnalName: '2세',
  gender: 'MALE',
  dynastyName: '고두노프 가문',
  birthYear: 1589,
  birthMonth: 4,
  birthDay: 14,
  deathYear: 1605,
  deathMonth: 6,
  deathDay: 20,
  birthPlaceText: '러시아 차르국 모스크바 — 보리스 고두노프 저택',
  deathPlaceText: '러시아 차르국 모스크바 크렘린',
  deathType: DeathType.ASSASSINATION,
  deathCause: '교살(목 졸림) — 가짜 드미트리 1세 측 쿠데타',
  deathNote:
    '1605-06-20 모스크바 크렘린에서 향년 16세에 가짜 드미트리 1세 측 쿠데타군에 의해 모친 ' +
    '마리아 고두노바와 함께 교살. 공식 발표는 "슬픔에 의한 자살"이었으나 동시기 기록과 후일 ' +
    '학술 평가는 모두 살해로 인정한다. 누이 크세니야(Xenia)는 살아남아 가짜 드미트리 1세의 ' +
    '강제 후궁이 되었다가 후일 수녀원에 유배되었다. 시신은 1606년 가짜 드미트리 1세의 명령으로 ' +
    '모스크바 외곽의 평민 묘지로 이장되었다가 후일 1622년 미하일 1세 시대에 트로이체-세르기예바 ' +
    '라브라에 재안치되었다.',
  biography:
    '고두노프 가문의 차르국 4대 차르(재위 1605-04-23 ~ 1605-06-20, 약 45일). 보리스 고두노프와 ' +
    '마리아 그리고리예브나 스쿠라토바-벨스카야(Maria Grigorievna Skuratova-Belskaya, ?~1605 — ' +
    '오프리치니키 수장 말류타 스쿠라토프의 딸)의 외동 아들.\n\n' +
    '1605 차르 즉위. 1605-04-23 부친 보리스 고두노프가 모스크바 크렘린에서 갑작스럽게 사망. ' +
    '16세였던 표도르 2세가 즉위. 동시기 평가에서 "조숙하고 학식 있는 청년 차르"로 알려져 있었으며, ' +
    '서양 지리학·수학 교육을 받았고 본인이 그린 러시아 지도가 현재까지 보존되어 있다. 통치 실권은 ' +
    '모친 마리아와 보야르 측근들이 행사.\n\n' +
    '1605-06-01 가짜 드미트리 1세 군 모스크바 입성. 보리스 사망 직후 가짜 드미트리 1세 봉기군이 ' +
    '모스크바로 진군. 1605-06-01 모스크바 측 군대가 사실상 항복하면서 가짜 드미트리 1세가 무혈 ' +
    '모스크바 입성. 표도르 2세와 모친은 크렘린에서 가택 연금.\n\n' +
    '1605-06-20 살해. 가짜 드미트리 1세의 모스크바 입성을 거리에서 환영하는 보야르 측은 사전 ' +
    '제거가 필요했다. 1605-06-20 가짜 드미트리 1세 측 보야르(바실리 골리친·바실리 모살스키 등)가 ' +
    '크렘린에 침입해 표도르 2세 모자를 교살. 동시 누이 크세니야는 살려두고 강제 후궁으로 삼았다. ' +
    '공식 발표는 "슬픔에 의한 자살"이었으나 모스크바 보야르·시민 누구도 믿지 않았다.\n\n' +
    '장기 유산. (1)고두노프 가문의 차르 직계 단절 — 약 7년의 짧은 통치 가문 (2)동란시대(1598~1613)의 ' +
    '한복판에서 청소년 차르의 비극적 살해 (3)가짜 드미트리 1세의 통치 정당성에 결정적 흠집 — ' +
    '약 11개월 후 1606-05-17 가짜 드미트리 1세 자신도 같은 방식으로 살해된다.',
  influence: 25,
  stats: {
    politics: 30,
    military: 20,
    diplomacy: 25,
    intellect: 65,
    charisma: 50,
    administration: 25,
    notes:
      '16세에 즉위해 45일 만에 살해당한 청소년 차르. 통치 실권은 모친·보야르가 행사. 동시기 평가는 ' +
      '"조숙하고 학식 있는 청년"으로 매우 우호적. 본인이 그린 러시아 지도가 현재까지 보존되어 있어 ' +
      '학식·지리학 교육 수준은 동시기 동슬라브 군주 최고급. 정치·군사 활동은 너무 짧은 재위로 ' +
      '평가 불가.',
  },
  reign: {
    regnalNumber: 4,
    regnalName: '표도르 2세 (고두노프)',
    startYear: 1605,
    startMonth: 4,
    startDay: 23,
    endYear: 1605,
    endMonth: 6,
    endDay: 20,
    appointmentMethod: AppointmentMethod.HEREDITARY,
    endReason: TenureEndReason.OVERTHROWN,
    endReasonDetail: '1605-06-20 가짜 드미트리 1세 측 쿠데타로 모친과 함께 모스크바 크렘린에서 교살.',
    notes:
      '약 45일 재위. 보리스 고두노프 사망(1605-04-23) 직후 즉위 → 가짜 드미트리 1세 봉기군 모스크바 ' +
      '입성(1605-06-01) → 1605-06-20 교살. 고두노프 가문의 차르 직계 단절. 동란시대의 가장 비극적 ' +
      '청소년 군주.',
  },
}

const FALSE_DMITRI_I: TsarSpec = {
  name: '드미트리',
  surname: '',
  originalName: 'False Dmitry I',
  regnalName: '1세 (가짜)',
  gender: 'MALE',
  dynastyName: null,
  birthYear: 1581,
  birthMonth: 10,
  birthDay: 1, // 정확한 출생 미상
  deathYear: 1606,
  deathMonth: 5,
  deathDay: 17,
  birthPlaceText: '러시아 차르국 갈리치 지역(Galich) — 정체 불명 (Grigory Otrepyev 가설)',
  deathPlaceText: '러시아 차르국 모스크바 크렘린',
  deathType: DeathType.ASSASSINATION,
  deathCause: '총격 + 칼 + 화형 (3중 살해)',
  deathNote:
    '1606-05-17 모스크바 크렘린에서 향년 약 24세에 바실리 슈이스키(=후일 바실리 4세) 측 보야르 ' +
    '쿠데타로 살해. 새벽 침실 침입 → 총격 → 칼로 마무리 → 시신을 모스크바 광장에 사흘간 모욕적 ' +
    '전시 → 화장 후 재를 대포에 장전해 폴란드 방향(=가짜 드미트리가 왔다고 주장한 방향)으로 ' +
    '발사했다. 부인 마리나 므니셰크(Marina Mniszech, 폴란드 측 부인)는 살아남아 후일 가짜 ' +
    '드미트리 2세의 부인이 되었다가 1614년 처형. 동란시대의 가장 충격적 살해 사건 중 하나.',
  biography:
    '동란시대의 첫 번째 가짜 드미트리(False Dmitry I) — 러시아 차르국 5대 차르(재위 1605-07-30 ~ ' +
    '1606-05-17, 약 9개월 17일). 본명 추정 Grigory Bogdanovich Otrepyev(=추도프 수도원 도망 ' +
    '수도승), 1591년 우글리치에서 죽은 어린 드미트리 이바노비치(이반 4세의 막내 아들)를 자칭했다.\n\n' +
    '1602 폴란드 망명·자칭 시작. 추도프 수도원에서 탈주한 도망 수도승 Grigory가 1602년 폴란드- ' +
    '리투아니아 연합 영지로 망명. "나는 1591년 우글리치에서 죽지 않고 살아남은 진짜 드미트리 이바노비치다"라고 ' +
    '주장하기 시작. 폴란드 사령관 예지 므니셰크의 딸 마리나 므니셰크와 약혼 + 가톨릭으로 개종해 ' +
    '폴란드 측·교황청 측 지원 확보. 1604-10 폴란드 군대 + 카자크 + 모스크바 측 망명 보야르 약 ' +
    '4,000명 군대로 모스크바 진군 시작.\n\n' +
    '1605-06 모스크바 입성. 1605-04-23 보리스 고두노프 사망 직후 모스크바 측 군대가 사실상 ' +
    '항복. 1605-06-01 가짜 드미트리 1세가 모스크바 무혈 입성. 모스크바 군중·보야르 일부가 ' +
    '환영(=고두노프 통치에 불만이 누적). 1605-06-20 표도르 2세 살해. 1605-07-30 모스크바 크렘린 ' +
    '우스펜스키 성당에서 차르 대관.\n\n' +
    '1605~1606 통치 — 친폴란드 정책. 약 9개월 짧은 통치. 폴란드 측 관습·복장 도입·가톨릭 사제 ' +
    '모스크바 동반·1606-05-08 폴란드 부인 마리나 므니셰크와 모스크바 크렘린에서 결혼식. 모스크바 ' +
    '보야르·정교회 측의 불만이 결정적으로 누적. 동시기 평가는 "러시아 정교회·전통을 무시하는 ' +
    '서양·폴란드 앞잡이".\n\n' +
    '1606-05-17 살해. 결혼식 9일 후 1606-05-17 새벽 바실리 슈이스키(=후일 바실리 4세) 측 ' +
    '보야르 쿠데타 — 크렘린 침입 → 침실에서 총격 + 칼로 살해 → 시신 모욕적 전시 → 화형 후 재를 ' +
    '대포로 폴란드 방향 발사. 약 9개월 17일 재위 종결.\n\n' +
    '정체 논쟁 — 학술 평가. 동시기·후일 학술 평가의 다수설은 Grigory Otrepyev 가설 — 추도프 ' +
    '수도원 도망 수도승이 진짜 드미트리를 자칭한 것이라고 본다. 그러나 일부 학자(특히 폴란드 측· ' +
    '20세기 일부 학자)는 정체 불명·진짜 드미트리 생존 가설을 부분 지지. 21세기까지도 결정적 ' +
    '학술 결론은 없다.\n\n' +
    '장기 유산. (1)러시아 사상 "가짜 차르" 봉기의 원형 — 후일 가짜 드미트리 2세(1607~1610)· ' +
    '가짜 드미트리 3세(1611) 봉기 연쇄 (2)모스크바 측 반폴란드 정서의 결정적 강화 — 1610~1612 ' +
    '폴란드 침공 격퇴의 정신적 토대 (3)푸시킨 "보리스 고두노프"(1825)·무소르그스키 오페라(1869) 등 ' +
    '예술적 재현의 핵심 인물.',
  influence: 40,
  stats: {
    politics: 45,
    military: 50,
    diplomacy: 55,
    intellect: 60,
    charisma: 75,
    administration: 30,
    notes:
      '약 9개월 17일의 짧은 통치. 폴란드 측 지원·자기 정체 위조·모스크바 측 보야르 일부 회유의 ' +
      '복합 능력은 동시기 평가에서 우수. 카리스마는 "진짜 드미트리" 자칭 + 폴란드 측 부인 + ' +
      '서양 의례로 모스크바 측 군중의 단기적 호감을 얻은 것은 사실. 그러나 친폴란드·가톨릭 ' +
      '정책으로 정교회·보야르의 결정적 반감을 초래해 9개월 만에 살해. 학식은 추도프 수도원의 ' +
      '신학·문학 교육으로 동시기 평이한 수준.',
  },
  reign: {
    regnalNumber: 5,
    regnalName: '가짜 드미트리 1세',
    startYear: 1605,
    startMonth: 7,
    startDay: 30,
    endYear: 1606,
    endMonth: 5,
    endDay: 17,
    appointmentMethod: AppointmentMethod.OTHER,
    endReason: TenureEndReason.OVERTHROWN,
    endReasonDetail: '1606-05-17 바실리 슈이스키 측 보야르 쿠데타로 모스크바 크렘린에서 살해.',
    notes:
      '약 9개월 17일 재위. 1605-06-01 모스크바 무혈 입성 → 1605-07-30 차르 대관 → 1606-05-08 ' +
      '폴란드 부인 마리나 므니셰크와 결혼 → 1606-05-17 살해. 동란시대의 첫 번째 가짜 차르이자 ' +
      '러시아 사상 가장 충격적 살해 사건 중 하나.',
  },
}

const VASILI_IV: TsarSpec = {
  name: '바실리',
  surname: '슈이스키',
  originalName: 'Vasili IV of Russia',
  regnalName: '4세',
  gender: 'MALE',
  dynastyName: '슈이스키 가문',
  birthYear: 1552,
  birthMonth: 9,
  birthDay: 22,
  deathYear: 1612,
  deathMonth: 9,
  deathDay: 12,
  birthPlaceText: '모스크바 대공국 — 슈이스키 가문 영지',
  deathPlaceText: '폴란드-리투아니아 연방 곤스토니노바 성(Gostynin) — 폴란드 망명 중',
  deathType: DeathType.ILLNESS,
  deathCause: '폴란드 망명 중 자연사 (또는 폴란드 측 독살 가설)',
  deathNote:
    '1612-09-12 폴란드 곤스토니노바 성에서 향년 60세에 사망. 1610년 7월 보야르 쿠데타로 폐위된 ' +
    '직후 두 동생과 함께 폴란드로 인도되어 폴란드 측에 항복하는 굴욕을 당했다. 약 2년의 ' +
    '망명 끝에 사망. 사인은 동시기 기록상 자연사·노환이나, 일부 동시기 모스크바 측 기록은 ' +
    '폴란드 측 독살 가설을 제기한다. 시신은 처음 폴란드에 매장되었다가 1635년 폴란드-러시아 ' +
    '강화 협상 일환으로 모스크바로 반환되어 모스크바 크렘린 대천사 성당에 안치되었다.',
  biography:
    '슈이스키 가문(류리크 가문 모스크바 분지)의 차르국 6대 차르(재위 1606-05-19 ~ 1610-07-19, ' +
    '약 4년 2개월). 모스크바 보야르 공작 가문 출신의 베테랑 정치가로, 1591년 우글리치 사건 공식 ' +
    '조사 위원·1605년 가짜 드미트리 1세 측 보야르·1606년 가짜 드미트리 1세 살해 쿠데타 주도자로 ' +
    '입지를 굳혔다.\n\n' +
    '1606-05-19 차르 즉위. 가짜 드미트리 1세 살해 직후 1606-05-19 모스크바 크렘린 우스펜스키 ' +
    '성당에서 차르 대관. 53세였다. 정식 Zemsky Sobor가 아닌 모스크바 보야르·시민 일부의 즉석 ' +
    '환호로 즉위한 "보야르 차르"라는 별칭이 붙었다 — 통치 정당성의 결정적 약점.\n\n' +
    '1607~1610 가짜 드미트리 2세 봉기. 즉위 직후부터 "진짜 드미트리는 살아 있다"는 소문과 함께 ' +
    '두 번째 가짜 드미트리(False Dmitry II, 정체 불명)가 폴란드 측 지원으로 봉기. 1608년 가짜 ' +
    '드미트리 2세 군이 모스크바 외곽 투시노(Tushino)에 "투시노 정부"를 세우면서 사실상 차르국 ' +
    '이중정부 상태. 동시기 평가는 "투시노의 도둑 차르 vs 모스크바의 보야르 차르". 차르국 영토 ' +
    '거의 절반이 가짜 드미트리 2세 측 지지 → 바실리 4세는 모스크바 인근만 통제.\n\n' +
    '1609 스웨덴 동맹. 1609년 스웨덴 칼 9세와 비보르크 조약 — 스웨덴 군 5,000명 지원 대가로 ' +
    '코렐라(Korela)·핀란드 일부 양도. 결과는 결정적 외교 실수 — 폴란드 지그문트 3세가 "러시아가 ' +
    '스웨덴과 동맹했다"는 명분으로 1609-09 모스크바 직접 침공 개시. "폴란드-러시아 전쟁 ' +
    '(1609~1618)"의 출발.\n\n' +
    '1610-06 클루시노 전투 패배. 1610-06-24 모스크바 인근 클루시노에서 폴란드 군에 결정적 ' +
    '패전. 약 35,000명 모스크바 측 군대 vs 7,000명 폴란드 후사르. 폴란드 측 사령관 ' +
    'Stanisław Żółkiewski의 후사르 기병 돌격으로 모스크바 군 궤멸. 1610-07-19 모스크바 ' +
    '보야르들이 바실리 4세를 폐위하고 강제 수도원 입소시킴.\n\n' +
    '1610~1612 폴란드 망명. 1611년 두 동생과 함께 폴란드로 인도. 1611-10-29 폴란드 수도 ' +
    '바르샤바 시민 앞에 모욕적 항복식(=폴란드 왕 지그문트 3세 앞에 바실리 4세 무릎 꿇음). ' +
    '1612-09-12 곤스토니노바 성에서 사망. 시신은 1635년 모스크바로 반환.\n\n' +
    '1610~1613 보야르 7인 정권(Seven Boyars) — 차르국 사실상 공위. 바실리 4세 폐위 후 ' +
    '모스크바 보야르 7명이 임시 정부 운영. 1610-08 "폴란드 지그문트 3세의 아들 블라디스와프 4세를 ' +
    '차르로 추대"하는 결정 → 모스크바 정교회·미닌·포자르스키 의용군이 거부 → 1612-11 의용군이 ' +
    '모스크바 크렘린에서 폴란드 군 축출 → 1613-02 Zemsky Sobor가 미하일 1세 로마노프 선출.\n\n' +
    '장기 유산. (1)류리크 가문 모스크바 분지의 마지막 차르(슈이스키 분지) (2)클루시노 전투 패전 + ' +
    '폴란드 망명·모욕은 후일 1612 폴란드 격퇴·1613 로마노프 가문 출범의 정신적 토대 (3)푸시킨· ' +
    '무소르그스키 등 19세기 러시아 예술에서 "동란시대의 무력한 차르"의 전형으로 재현.',
  influence: 45,
  stats: {
    politics: 50,
    military: 35,
    diplomacy: 30,
    intellect: 60,
    charisma: 40,
    administration: 50,
    notes:
      '약 4년 2개월 재위. 가짜 드미트리 1세 살해 쿠데타 주도자로 권력 장악은 능숙했으나 통치 ' +
      '정당성은 결정적으로 약했다("보야르 차르" 비난). 군사·외교는 결정적 실패 — 1609 스웨덴 ' +
      '동맹이 폴란드 침공의 명분 제공, 1610 클루시노 전투 패전. 폴란드 망명과 바르샤바 항복식은 ' +
      '러시아 역사상 군주 최대 모욕 중 하나. 학식은 정치 베테랑답게 동시기 평이한 수준. ' +
      '카리스마는 "교활한 보야르" 이미지로 동시기 평가 부정적.',
  },
  reign: {
    regnalNumber: 6,
    regnalName: '바실리 4세 (슈이스키)',
    startYear: 1606,
    startMonth: 5,
    startDay: 19,
    endYear: 1610,
    endMonth: 7,
    endDay: 19,
    appointmentMethod: AppointmentMethod.OTHER,
    endReason: TenureEndReason.OVERTHROWN,
    endReasonDetail:
      '1610-07-19 클루시노 전투 패전 직후 모스크바 보야르 쿠데타로 폐위 — 강제 수도원 입소 후 ' +
      '1611년 폴란드로 인도되어 망명 중 1612-09-12 사망.',
    notes:
      '약 4년 2개월 재위. 가짜 드미트리 1세 살해 쿠데타로 즉위(1606-05-19) → 1607~1610 가짜 ' +
      '드미트리 2세 봉기·투시노 이중정부 → 1609 스웨덴 동맹·폴란드 침공 명분 제공 → 1610-06-24 ' +
      '클루시노 전투 패전 → 1610-07-19 보야르 쿠데타 폐위. 류리크 가문 모스크바 분지(슈이스키)의 ' +
      '마지막 차르.',
  },
}

const MIKHAIL_I: TsarSpec = {
  name: '미하일',
  surname: '로마노프',
  originalName: 'Michael I of Russia',
  regnalName: '1세',
  gender: 'MALE',
  dynastyName: '로마노프 왕조',
  birthYear: 1596,
  birthMonth: 7,
  birthDay: 22,
  deathYear: 1645,
  deathMonth: 7,
  deathDay: 23,
  birthPlaceText: '러시아 차르국 모스크바 — 로마노프 가문 영지',
  deathPlaceText: '러시아 차르국 모스크바 크렘린',
  deathType: DeathType.ILLNESS,
  deathCause: '수종(부종) + 노환 (향년 49세)',
  deathNote:
    '1645-07-23 모스크바 크렘린에서 향년 49세에 사망. 사망 전 약 2년간 다리·복부 수종이 점진적으로 ' +
    '악화. 동시기 의사 진단은 "멜랑콜리 + 수종"으로, 현대 학술 평가는 심부전 + 신부전 가설이 ' +
    '유력. 임종 시 옆에는 아들 알렉세이(=후일 알렉세이 1세, 16세)·궁정 사람들. 시신은 모스크바 ' +
    '크렘린 대천사 성당에 안치, 21세기 현재까지 보존. 결혼 21년 차였으며 부인 예브도키야 ' +
    '스트레슈네바(Eudoxia Streshneva, 1608~1645)는 미하일 사망 1개월 후 1645-08-28 함께 ' +
    '사망했다(사인은 슬픔에 의한 자연사로 추정).',
  biography:
    '로마노프 왕조(House of Romanov)의 시조이자 러시아 차르국 7대 차르(재위 1613-07-21 ~ ' +
    '1645-07-23, 약 32년). 로마노프 가문(원래는 코슈킨-로마노프Y이바)은 류리크 가문 모스크바 ' +
    '분지의 인척 가문 — 미하일의 고조모(=이반 4세 뇌제의 두 번째 부인 아나스타시아 로마노브나)가 ' +
    '로마노프 가문 출신이라는 점에서 류리크 가문의 인척으로 연결되었다.\n\n' +
    '1613-02-21 Zemsky Sobor 선출. 1612-11 미닌·포자르스키 의용군이 모스크바 크렘린에서 폴란드 ' +
    '군 축출 후 1613-02-21 Zemsky Sobor(국민의회)가 16세의 미하일 로마노프를 새 차르로 선출. ' +
    '선출 이유는 (1)로마노프 가문이 류리크 가문 인척 (2)미하일이 어려서 보야르 측 통제 가능 (3)정치적 ' +
    '중립 가문으로 동란시대 군벌 다툼에서 비교적 자유. 1613-07-21 모스크바 크렘린 우스펜스키 ' +
    '성당에서 대관 — 약 304년간 지속될 로마노프 왕조(1613~1917)의 출발.\n\n' +
    '1613~1619 동란시대 수습. 즉위 후 폴란드·스웨덴과 강화 협상. 1617 스톨보보 조약(스웨덴 — ' +
    '발트해 진출 차단·핀란드 일부 양도) + 1618 데울리노 휴전(폴란드 — 스몰렌스크·세베르스크 양도). ' +
    '큰 영토 손실이었으나 동란시대 종결.\n\n' +
    '1619 부친 필라레트 총대주교 귀환. 1619년 부친 필라레트(Filaret Romanov, 1553~1633 — ' +
    '폴란드 인질 9년 후 귀환)가 모스크바 총대주교로 즉위하면서 약 14년간 사실상 공동 통치. ' +
    '미하일은 "Великий Государь(위대한 군주)", 필라레트는 "Великий Государь Святейший Патриарх ' +
    '(위대한 군주이자 거룩한 총대주교)" — 사실상 동등 칭호. 1633 필라레트 사망 후 미하일이 ' +
    '단독 통치.\n\n' +
    '1632~1634 스몰렌스크 전쟁. 1618 데울리노 휴전으로 양도한 스몰렌스크 회복 시도. 1632-08 ' +
    '모스크바 군 약 35,000명이 스몰렌스크 포위. 폴란드 측 사령관 브와디스와프 4세가 1633-09 ' +
    '구원군 도착 → 1634-02 모스크바 군 항복(=러시아 사령관 미하일 셰인 처형). 1634-06 폴랴노프카 ' +
    '조약 — 스몰렌스크 회복 실패. 외교적으로는 폴란드의 모스크바 차르 칭호 인정(1610~1619 ' +
    '브와디스와프 4세의 차르 칭호 주장 포기) 성과.\n\n' +
    '1645 사망. 1645-07-23 49세에 수종으로 사망. 결혼 21년의 부인 예브도키야가 1개월 후 함께 ' +
    '사망. 외아들 알렉세이(16세)가 즉위.\n\n' +
    '장기 유산. (1)로마노프 왕조 304년(1613~1917)의 시조 (2)동란시대 종결의 결정적 군주 ' +
    '(3)Zemsky Sobor·보야르 두마와의 협력 통치 모범 — 후일 표트르 대제의 절대 권력과 대조 ' +
    '(4)부친 필라레트와의 약 14년 공동 통치는 러시아사 유일 사례 (5)로마노프 가문이 약 300년 ' +
    '러시아 황실로 군림하는 토대.',
  influence: 65,
  stats: {
    politics: 60,
    military: 50,
    diplomacy: 65,
    intellect: 55,
    charisma: 65,
    administration: 70,
    notes:
      '약 32년 재위. 16세 즉위 후 부친 필라레트 총대주교(1619~1633 공동 통치)의 보좌를 받아 동란 ' +
      '시대 수습. 폴란드·스웨덴 강화로 영토 손실은 컸으나 차르국 안정 회복. 1632~1634 스몰렌스크 ' +
      '전쟁 실패에도 폴란드의 차르 칭호 인정을 받아내는 외교 성과. 카리스마는 "경건하고 자비로운 ' +
      '청년 차르"의 동시기 평가 우호적. 행정은 보야르 두마·Zemsky Sobor와의 협력 통치로 ' +
      '동란시대 분열을 봉합. 정치 단독 결단력은 제한적이었으나 시기적 요구에 부합.',
  },
  reign: {
    regnalNumber: 7,
    regnalName: '미하일 1세 (로마노프)',
    startYear: 1613,
    startMonth: 7,
    startDay: 21,
    endYear: 1645,
    endMonth: 7,
    endDay: 23,
    appointmentMethod: AppointmentMethod.INDIRECT_ELECTION,
    endReason: TenureEndReason.DEATH_IN_OFFICE,
    endReasonDetail: '1645-07-23 모스크바 크렘린에서 향년 49세에 수종으로 사망.',
    notes:
      '1613-02-21 Zemsky Sobor가 16세의 미하일 로마노프를 차르로 선출 — 1613-07-21 대관. 로마노프 ' +
      '왕조 304년(1613~1917)의 출발. 약 32년 재위. 동란시대 종결 + 1617 스톨보보 조약(스웨덴) + ' +
      '1618 데울리노 휴전(폴란드) + 1619~1633 부친 필라레트 총대주교와의 공동 통치 + 1632~1634 ' +
      '스몰렌스크 전쟁 실패. 외아들 알렉세이(=후일 알렉세이 1세)에게 계승.',
  },
}

const ALEKSEI: TsarSpec = {
  name: '알렉세이',
  surname: '로마노프',
  originalName: 'Alexis of Russia',
  regnalName: '',
  gender: 'MALE',
  dynastyName: '로마노프 왕조',
  birthYear: 1629,
  birthMonth: 3,
  birthDay: 29,
  deathYear: 1676,
  deathMonth: 2,
  deathDay: 8,
  birthPlaceText: '러시아 차르국 모스크바 크렘린',
  deathPlaceText: '러시아 차르국 모스크바 크렘린',
  deathType: DeathType.ILLNESS,
  deathCause: '심부전 추정 + 노환 (향년 46세)',
  deathNote:
    '1676-02-08 모스크바 크렘린에서 향년 46세에 사망. 사망 전 약 1년간 잦은 발작·복부 통증이 ' +
    '있었으며, 동시기 의사는 "멜랑콜리 + 심장 약화"로 진단했다. 현대 학술 평가는 심부전 또는 ' +
    '관상동맥 질환 가설이 유력. 임종 시 옆에는 두 번째 부인 나탈리야 나리시키나(Natalia ' +
    'Naryshkina, 1651~1694)와 어린 표트르(=후일 표트르 1세, 3세), 그리고 첫 부인 마리야 ' +
    '밀로슬랍스카야 소생 자녀들. 시신은 모스크바 크렘린 대천사 성당에 안치.',
  biography:
    '로마노프 왕조의 차르국 8대 차르(재위 1645-07-23 ~ 1676-02-08, 약 30년 6개월). 미하일 1세와 ' +
    '예브도키야 스트레슈네바의 외아들. 16세에 즉위해 30년 6개월 재위하면서 차르국을 동란시대 ' +
    '회복기에서 대제국으로 도약시킨 결정적 군주. 별칭은 "Тишайший(가장 평온한 자)" — 평소 성품의 ' +
    '온화함에서 유래.\n\n' +
    '1645 즉위와 모로조프 섭정. 1645-07-23 부친 사망 직후 16세 즉위. 통치 초기 5년은 가정교사 ' +
    'Boris Morozov(1590~1661)가 사실상 섭정으로 통치. 1648-06 모스크바 "소금 봉기(Salt Riot)" — ' +
    '소금세 인상에 항의하는 시민 봉기로 모로조프 측 측근 몇 명이 살해되면서 정치 위기. 결과는 ' +
    '(1)Sobornoye Ulozhenie(법전) 편찬 위원회 소집 (2)모로조프 일시 추방.\n\n' +
    '1649 Sobornoye Ulozhenie(법전) 공포. 약 1년의 작업 끝에 1649-01-29 25장·967조로 구성된 ' +
    '신법전 공포 — 러시아 사상 처음으로 농노제(serfdom)를 공식 법제화. 농민의 영주 이탈 무한 ' +
    '소급 금지. 이 법전은 약 200년간(1832 다음 법전까지) 러시아의 기본 법으로 작동했다.\n\n' +
    '1654 페레야슬라프 협정 — 우크라이나 합병. 1648 우크라이나 카자크 봉기(Bohdan Khmelnytsky ' +
    '주도, 폴란드 측 학정에 항거) → 1654-01-18 페레야슬라프 협정으로 흐멜니츠키가 모스크바 차르 ' +
    '신복을 선언, 좌안 우크라이나가 차르국에 합병. 1654~1667 폴란드-러시아 전쟁 13년 — ' +
    '1667 안드루소보 휴전으로 좌안 우크라이나 + 키예프 합병 확정. 차르국 영토의 결정적 확장.\n\n' +
    '1666 대분열(Raskol) — 정교회 분열. 1652년 부친·총대주교 니콘(Nikon)의 정교회 의례 개혁 ' +
    '(그리스 정교 표준 채택) → 보수파 "고의례파(Old Believers)" 분열. 1666년 모스크바 공의회가 ' +
    '고의례파를 파문 → 약 300년간 지속될 러시아 정교회 분열. 알렉세이는 니콘 측을 지지하다가 ' +
    '1666년 니콘 자신과도 결별. "조용한 알렉세이"의 통치 중 가장 결정적 종교 사건.\n\n' +
    '1670~1671 스텐카 라진(Stepan Razin) 봉기. 돈 카자크 봉기로 볼가 유역 농민이 결집, 약 ' +
    '200,000명의 봉기군이 차르스카야로 진군. 1671-04 라진 체포·6월 모스크바 광장 사형. 농노제 ' +
    '강화·1649 법전에 대한 농민 반발의 첫 대규모 폭발.\n\n' +
    '1671 재혼 + 표트르 출생. 1669 첫 부인 마리야 밀로슬랍스카야(1624~1669) 사망 → 1671 ' +
    '나탈리야 나리시키나와 재혼 → 1672-06-09 둘째 아들 표트르(=후일 표트르 1세 대제) 출생. ' +
    '재혼은 후일 1682 표트르-이반 5세 공동 차르 시기의 "밀로슬랍스카야 vs 나리시키나 파벌 ' +
    '다툼"의 직접 원인이 된다.\n\n' +
    '1676 사망과 계승. 1676-02-08 46세 사망. 첫 부인 소생 표도르(=후일 표도르 3세, 14세)가 즉위.\n\n' +
    '장기 유산. (1)1649 법전·농노제 법제화 (2)1654 우크라이나 합병으로 차르국 영토 결정적 확장 ' +
    '(3)1666 대분열·고의례파 사건 (4)재혼으로 표트르 1세 출생 — 후일 러시아 제국 출범의 직접 원인.',
  influence: 80,
  stats: {
    politics: 75,
    military: 70,
    diplomacy: 75,
    intellect: 70,
    charisma: 75,
    administration: 80,
    notes:
      '약 30년 6개월 재위. "조용한 자"라는 별칭과 달리 통치 업적은 결정적 — 1649 법전·1654 ' +
      '우크라이나 합병·1666 대분열의 세 큰 사건. 행정·법제 능력은 동시기 동슬라브 군주 최고급. ' +
      '외교는 폴란드·우크라이나·오스만 측면에서 적극적이었으며 13년 전쟁 후 안드루소보 휴전으로 ' +
      '결정적 영토 확장. 군사는 본인 직접 지휘는 드물었으나 군 현대화(외국인 장교 영입·새 군대 ' +
      '체제) 추진. 카리스마는 동시기 평이한 수준이었으나 종교적 신앙심·자비로운 성품으로 ' +
      '"Tishayshy(가장 평온한 자)"라는 별칭 획득. 학식은 신학·법학·서한 작성에 적극적.',
  },
  reign: {
    regnalNumber: 8,
    regnalName: '알렉세이',
    startYear: 1645,
    startMonth: 7,
    startDay: 23,
    endYear: 1676,
    endMonth: 2,
    endDay: 8,
    appointmentMethod: AppointmentMethod.HEREDITARY,
    endReason: TenureEndReason.DEATH_IN_OFFICE,
    endReasonDetail: '1676-02-08 모스크바 크렘린에서 향년 46세에 자연사 (심부전 추정).',
    notes:
      '약 30년 6개월 재위. 1649 Sobornoye Ulozhenie 법전 + 농노제 법제화 / 1654 페레야슬라프 협정 + ' +
      '우크라이나 합병 / 1666 대분열 + 고의례파 분열 / 1670~1671 스텐카 라진 봉기 / 1671 재혼 후 ' +
      '표트르 1세 출생. 차르국을 동란시대 회복기에서 대제국으로 도약시킨 결정적 군주. 표도르 3세가 ' +
      '계승.',
  },
}

const FEODOR_III: TsarSpec = {
  name: '표도르',
  surname: '로마노프',
  originalName: 'Feodor III of Russia',
  regnalName: '3세',
  gender: 'MALE',
  dynastyName: '로마노프 왕조',
  birthYear: 1661,
  birthMonth: 6,
  birthDay: 9,
  deathYear: 1682,
  deathMonth: 5,
  deathDay: 7,
  birthPlaceText: '러시아 차르국 모스크바 크렘린',
  deathPlaceText: '러시아 차르국 모스크바 크렘린',
  deathType: DeathType.ILLNESS,
  deathCause: '괴혈병 + 만성 병약체질 (향년 20세)',
  deathNote:
    '1682-05-07 모스크바 크렘린에서 향년 20세에 사망. 어린 시절부터 괴혈병·다리 마비·시력 약화 ' +
    '등 만성 병약체질로 거동이 자유롭지 않았다. 1682년 봄부터 결정적 악화. 임종 시 옆에는 두 번째 ' +
    '부인 마르파 아프락시나(Marfa Apraksina, 1664~1716, 결혼 약 2개월)·이복 동생 표트르(=후일 ' +
    '표트르 1세, 9세)·친동생 이반(=후일 이반 5세, 15세). 자녀 없이 사망으로 후계 다툼 발화 — ' +
    '1682-05-15 "모스크바 봉기(Moscow Uprising of 1682)"가 이반 5세·표트르 1세 공동 차르 ' +
    '즉위의 직접 원인이 된다.',
  biography:
    '로마노프 왕조의 차르국 9대 차르(재위 1676-02-08 ~ 1682-05-07, 약 6년 3개월). 알렉세이 1세와 ' +
    '첫 부인 마리야 밀로슬랍스카야의 둘째 아들. 형 알렉세이 알렉세예비치(1654~1670)가 16세에 ' +
    '먼저 사망하면서 후계자가 되었다.\n\n' +
    '1676 즉위. 1676-02-08 부친 사망으로 14세에 즉위. 어린 시절부터 괴혈병·다리 마비로 거동이 ' +
    '자유롭지 않아 가마(litter)에 실려 다녔다. 학식은 깊었으며, 가정교사 시메온 폴로츠키(Simeon ' +
    'Polotsky)의 영향으로 폴란드어·라틴어·신학·문학에 능통.\n\n' +
    '1678 인구조사·세제 개혁. 1678 모스크바 인구조사 + 직접세 통합 — 세금 단위를 가구(double) ' +
    '단위로 통일해 행정 효율 개선. 1681 군 개혁 — 외국인 장교 영입 확대·새 연대 체제(novo-сistemnye ' +
    'polki) 정비.\n\n' +
    '1681 메스니체스트보 폐지 — 결정적 개혁. 1681-01-12 "메스니체스트보(Mestnichestvo)" 폐지 ' +
    '칙령 — 보야르 가문 서열에 따른 관직 배분 제도(약 250년 지속, 차르국 행정 비효율의 주요 원인)를 ' +
    '폐지. 이로써 능력 기반 관직 배분의 토대가 마련됐다. 동시기 보야르 가문 계보 기록(\bRazryadnye ' +
    'knigi)을 모스크바 광장에서 소각하는 상징적 의례 거행. 후일 표트르 대제 관직 등급표(Table of ' +
    'Ranks, 1722)의 직접 토대.\n\n' +
    '1681 바흐치사라이 강화. 1676~1681 러시아-오스만 전쟁(체히린 캠페인 등) 종결 — 1681 ' +
    '바흐치사라이 강화 조약으로 오스만이 좌안 우크라이나·키예프 측 모스크바 종주권 인정.\n\n' +
    '1682 사망과 후계 위기. 1682-05-07 자녀 없이 20세 사망. 후계는 (1)친동생 이반(15세, 정신적 ' +
    '발달 지연 + 시력 약화) (2)이복 동생 표트르(9세, 두 번째 부인 나리시키나 소생)의 둘 사이에서 ' +
    '갈렸다. 1682-05-15 "모스크바 봉기(Streltsy Uprising)" — 밀로슬랍스카야 측이 스트렐치를 ' +
    '동원해 나리시키나 측 보야르 학살. 결과는 "공동 차르 즉위 — 이반 5세(시니어) + 표트르 1세 ' +
    '(주니어)"라는 사상 유일 사례. 누이 소피야 알렉세예브나(Sophia, 1657~1704)가 실권 섭정.',
  influence: 55,
  stats: {
    politics: 65,
    military: 50,
    diplomacy: 60,
    intellect: 80,
    charisma: 50,
    administration: 70,
    notes:
      '약 6년 3개월 재위. 어린 시절부터 만성 병약체질로 거동이 자유롭지 않았으나, 1681 메스니체스트보 ' +
      '폐지로 약 250년 지속된 보야르 가문 서열제 폐지의 결정적 개혁 단행. 1678 인구조사·세제 통합도 ' +
      '동시기 동슬라브 군주 중 가장 행정 효율적 시도. 학식은 폴란드어·라틴어·신학·문학에 능통한 ' +
      '동시기 동슬라브 군주 최고급. 군사는 본인 직접 지휘 없이 외국인 장교 영입으로 군 현대화 토대. ' +
      '카리스마는 병약체질로 동시기 평가 "존경할 만하지만 거리감 있는 차르". 결혼 2회·자녀 없음.',
  },
  reign: {
    regnalNumber: 9,
    regnalName: '표도르 3세',
    startYear: 1676,
    startMonth: 2,
    startDay: 8,
    endYear: 1682,
    endMonth: 5,
    endDay: 7,
    appointmentMethod: AppointmentMethod.HEREDITARY,
    endReason: TenureEndReason.DEATH_IN_OFFICE,
    endReasonDetail: '1682-05-07 모스크바 크렘린에서 향년 20세에 괴혈병 + 만성 병약체질로 사망.',
    notes:
      '약 6년 3개월 재위. 1681 메스니체스트보 폐지(약 250년 지속된 보야르 가문 서열제 폐지)가 결정적 ' +
      '행정 개혁. 1681 바흐치사라이 강화(오스만)·1678 인구조사·1681 군 현대화 등 단명에도 ' +
      '집약적 통치 업적. 자녀 없이 사망으로 1682-05-15 모스크바 봉기 → 이반 5세 + 표트르 1세 공동 ' +
      '즉위.',
  },
}

const ALL_NEW_TSARS = [
  IVAN_IV,
  FEODOR_I,
  BORIS_GODUNOV,
  FEODOR_II,
  FALSE_DMITRI_I,
  VASILI_IV,
  MIKHAIL_I,
  ALEKSEI,
  FEODOR_III,
] as const

// ── 이반 5세·표트르 1세 (기존 인물 보강) ────────────────────────────────────
const IVAN_V_REIGN = {
  regnalNumber: 10,
  regnalName: '이반 5세',
  startYear: 1682,
  startMonth: 5,
  startDay: 7,
  endYear: 1696,
  endMonth: 2,
  endDay: 8,
  notes:
    '1682-05-15 모스크바 봉기 직후 1682-05-26 이복 동생 표트르 1세와 공동 차르 즉위. 시니어 차르 ' +
    '(=의례·법적 상위)로 명목 권한 보유. 발달 지연·시력 약화로 실권은 누이 소피야 알렉세예브나의 ' +
    '섭정(1682~1689)·표트르 측 보야르(1689~)가 행사. 1696-02-08 향년 29세 사망으로 표트르 단독 ' +
    '통치. 부인 프라스코비야 살티코바(Praskovia Saltykova) 사이에 다섯 딸 — 그중 안나(=후일 ' +
    '러시아 제국 4대 안나 1세, 1730~1740)·예카테리나(=후일 안나의 후계 다툼)가 18세기 러시아 ' +
    '제국 황실 계보의 한 줄기를 형성.',
}

const PETER_I_TSARDOM_REIGN = {
  regnalNumber: 11,
  regnalName: '표트르 1세 (대제)',
  startYear: 1682,
  startMonth: 5,
  startDay: 7,
  endYear: 1721,
  endMonth: 11,
  endDay: 2, // 1721-11-02 러시아 제국 선포로 차르국 시기 종결
  notes:
    '1682-05-26 이반 5세와 공동 차르 즉위(주니어 차르). 1689 누이 소피야 섭정 폐지 → 1689~1696 ' +
    '이반 5세와 공동 통치(실권은 표트르) → 1696-02-08 이반 5세 사망 후 단독 차르 → 1721-11-02 ' +
    '"전(全)러시아의 황제(Vsya Rossiya Imperator)" 칭호 채택으로 러시아 제국 출범. 차르국 시기 ' +
    '재위는 약 39년 5개월(공동 통치 포함), 그중 단독 통치는 약 25년 9개월. 1700~1721 북방전쟁 ' +
    '승리·1703 상트페테르부르크 건설·1717 정부 부처 개편·1722 관직 등급표 등 결정적 근대화 개혁. ' +
    '러시아 제국 시기 재임은 별도 SovereignReign으로 등록되어 있음.',
}

// ────────────────────────────────────────────────────────────────────────────
export async function seedRussiaTsardom(prisma: PrismaService): Promise<void> {
  console.log('\n👑 러시아 차르국 라인업 시딩 시작 (기존 데이터 보존 모드)...')

  const admin = await prisma.account.findUnique({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  ⚠️  admin 계정 미존재')
    return
  }

  const tsardomHC = await prisma.historicalCountry.findFirst({
    where: { name: '러시아 차르국' },
    select: { id: true },
  })
  if (!tsardomHC) {
    console.warn('  ⚠️  러시아 차르국 HC 미존재')
    return
  }

  const tsarPos = await prisma.governmentPositionDefinition.findFirst({
    where: { title: '차르' },
    select: { id: true },
  })
  const kingPos = await prisma.governmentPositionDefinition.findFirst({
    where: { title: '국왕' },
    select: { id: true },
  })
  const positionId = tsarPos?.id ?? kingPos?.id
  if (!positionId) {
    console.warn('  ⚠️  관직 정의 \'차르\' 또는 \'국왕\' 미존재 — 시딩 중단')
    return
  }
  console.log(`  관직 ID: ${tsarPos ? '차르' : '국왕(폴백)'} = ${positionId}`)

  // ── 0) 가문 등록 ───────────────────────────────────────────────────────
  const dynastyIdByName: Record<string, string> = {}
  for (const d of DYNASTIES) {
    const exists = await prisma.dynasty.findFirst({ where: { name: d.name } })
    if (exists) {
      console.log(`  ⏭️  가문 스킵: ${d.name} (id=${exists.id})`)
      dynastyIdByName[d.name] = exists.id
      continue
    }
    const created = await prisma.dynasty.create({
      data: {
        name: d.name,
        description: d.description,
        startDate: new Date(d.startYear, 0, 1),
        endDate: new Date(d.endYear, 11, 31),
      },
    })
    console.log(`  ✅ 가문 생성: ${d.name} (id=${created.id})`)
    dynastyIdByName[d.name] = created.id
  }
  // 기존 가문도 매핑
  const romanov = await prisma.dynasty.findFirst({ where: { name: '로마노프 왕조' } })
  if (romanov) dynastyIdByName['로마노프 왕조'] = romanov.id

  // ── 1) Person 등록 (9명 신규) ──────────────────────────────────────────
  const personIdByOriginalName: Record<string, string> = {}
  for (const spec of ALL_NEW_TSARS) {
    const existing = await prisma.person.findFirst({
      where: { originalName: spec.originalName },
    })
    if (existing) {
      console.log(`  ⏭️  인물 스킵: ${spec.originalName} (id=${existing.id})`)
      personIdByOriginalName[spec.originalName] = existing.id
      continue
    }
    const created = await prisma.person.create({
      data: {
        name: spec.name,
        surname: spec.surname || undefined,
        originalName: spec.originalName,
        regnalName: spec.regnalName || undefined,
        biography: spec.biography,
        birthDate: new Date(spec.birthYear, spec.birthMonth - 1, spec.birthDay),
        birthEra: 'AD' as any,
        deathDate: new Date(spec.deathYear, spec.deathMonth - 1, spec.deathDay),
        deathEra: 'AD' as any,
        gender: spec.gender,
        nameDisplayOrder: 'western' as any,
        dynastyId: spec.dynastyName ? dynastyIdByName[spec.dynastyName] : undefined,
        birthPlaceText: spec.birthPlaceText,
        deathPlaceText: spec.deathPlaceText,
        deathType: spec.deathType,
        deathCause: spec.deathCause,
        deathNote: spec.deathNote,
        influence: spec.influence,
        accountId: admin.id,
      },
    })
    console.log(`  ✅ 인물 생성: ${spec.originalName} (id=${created.id})`)
    personIdByOriginalName[spec.originalName] = created.id
  }

  // ── 2) Ivan V 보강 ────────────────────────────────────────────────────
  const ivanV = await prisma.person.findFirst({
    where: { originalName: 'Ivan V of Russia' },
    select: { id: true, dynastyId: true, regnalName: true },
  })
  if (ivanV) {
    const patch: any = {}
    if (!ivanV.dynastyId && dynastyIdByName['로마노프 왕조']) patch.dynastyId = dynastyIdByName['로마노프 왕조']
    if (!ivanV.regnalName || ivanV.regnalName === 'Ivan') patch.regnalName = '5세'
    if (Object.keys(patch).length > 0) {
      await prisma.person.update({ where: { id: ivanV.id }, data: patch })
      console.log(`  🔧 Ivan V 보강: ${Object.keys(patch).join(', ')}`)
    }
    personIdByOriginalName['Ivan V of Russia'] = ivanV.id
  }

  // Peter I lookup (재임만 추가)
  const peterI = await prisma.person.findFirst({
    where: { originalName: 'Peter I of Russia' },
    select: { id: true },
  })
  if (peterI) personIdByOriginalName['Peter I of Russia'] = peterI.id

  // ── 3) PersonStats (신규 9명) ──────────────────────────────────────────
  for (const spec of ALL_NEW_TSARS) {
    const pid = personIdByOriginalName[spec.originalName]
    if (!pid) continue
    const exists = await prisma.personStats.findFirst({
      where: { personId: pid, accountId: admin.id },
    })
    if (exists) {
      console.log(`    ⏭️  ${spec.originalName} 능력치 스킵`)
      continue
    }
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
    console.log(
      `    ✅ ${spec.originalName} 능력치: ` +
        `정${spec.stats.politics}·군${spec.stats.military}·외${spec.stats.diplomacy}·` +
        `학${spec.stats.intellect}·카${spec.stats.charisma}·행${spec.stats.administration}`,
    )
  }

  // ── 4) PersonCountryAffiliation (11명 모두 → 차르국 CITIZENSHIP) ─────
  const allPersonIds = [
    ...ALL_NEW_TSARS.map((s) => personIdByOriginalName[s.originalName]),
    personIdByOriginalName['Ivan V of Russia'],
    personIdByOriginalName['Peter I of Russia'],
  ].filter(Boolean) as string[]

  for (const pid of allPersonIds) {
    const exists = await prisma.personCountryAffiliation.findFirst({
      where: {
        personId: pid,
        historicalCountryId: tsardomHC.id,
        affiliationType: 'CITIZENSHIP' as any,
      },
    })
    if (exists) continue
    await prisma.personCountryAffiliation.create({
      data: {
        personId: pid,
        historicalCountryId: tsardomHC.id,
        affiliationType: 'CITIZENSHIP' as any,
        priority: 0,
      },
    })
  }
  console.log(`  ✅ 소속국가 처리: ${allPersonIds.length}명 → 러시아 차르국`)

  // ── 5) SovereignReign 등록 ────────────────────────────────────────────
  type ReignBundle = {
    personId: string
    label: string
    regnalNumber: number
    regnalName: string
    startDate: Date
    endDate: Date
    appointmentMethod: AppointmentMethod
    endReason: TenureEndReason
    endReasonDetail: string
    notes: string
  }
  const allReigns: ReignBundle[] = []
  for (const spec of ALL_NEW_TSARS) {
    const pid = personIdByOriginalName[spec.originalName]
    if (!pid) continue
    allReigns.push({
      personId: pid,
      label: spec.regnalName ? `${spec.name} ${spec.regnalName}` : spec.name,
      regnalNumber: spec.reign.regnalNumber,
      regnalName: spec.reign.regnalName,
      startDate: new Date(spec.reign.startYear, spec.reign.startMonth - 1, spec.reign.startDay),
      endDate: new Date(spec.reign.endYear, spec.reign.endMonth - 1, spec.reign.endDay),
      appointmentMethod: spec.reign.appointmentMethod,
      endReason: spec.reign.endReason,
      endReasonDetail: spec.reign.endReasonDetail,
      notes: spec.reign.notes,
    })
  }
  if (personIdByOriginalName['Ivan V of Russia']) {
    allReigns.push({
      personId: personIdByOriginalName['Ivan V of Russia'],
      label: '이반 5세',
      regnalNumber: IVAN_V_REIGN.regnalNumber,
      regnalName: IVAN_V_REIGN.regnalName,
      startDate: new Date(IVAN_V_REIGN.startYear, IVAN_V_REIGN.startMonth - 1, IVAN_V_REIGN.startDay),
      endDate: new Date(IVAN_V_REIGN.endYear, IVAN_V_REIGN.endMonth - 1, IVAN_V_REIGN.endDay),
      appointmentMethod: AppointmentMethod.HEREDITARY,
      endReason: TenureEndReason.DEATH_IN_OFFICE,
      endReasonDetail: '1696-02-08 향년 29세 자연사 — 표트르 단독 통치 출발.',
      notes: IVAN_V_REIGN.notes,
    })
  }
  if (personIdByOriginalName['Peter I of Russia']) {
    allReigns.push({
      personId: personIdByOriginalName['Peter I of Russia'],
      label: '표트르 1세 (차르국)',
      regnalNumber: PETER_I_TSARDOM_REIGN.regnalNumber,
      regnalName: PETER_I_TSARDOM_REIGN.regnalName,
      startDate: new Date(
        PETER_I_TSARDOM_REIGN.startYear,
        PETER_I_TSARDOM_REIGN.startMonth - 1,
        PETER_I_TSARDOM_REIGN.startDay,
      ),
      endDate: new Date(
        PETER_I_TSARDOM_REIGN.endYear,
        PETER_I_TSARDOM_REIGN.endMonth - 1,
        PETER_I_TSARDOM_REIGN.endDay,
      ),
      appointmentMethod: AppointmentMethod.HEREDITARY,
      endReason: TenureEndReason.OTHER,
      endReasonDetail: '1721-11-02 "전(全)러시아의 황제" 칭호 채택으로 러시아 제국 선포 — 차르국 시기 종결.',
      notes: PETER_I_TSARDOM_REIGN.notes,
    })
  }

  for (const r of allReigns) {
    // 같은 (person, HC) 기등록 확인 (Tsardom)
    const existing = await prisma.sovereignReign.findFirst({
      where: { personId: r.personId, historicalCountryId: tsardomHC.id },
    })
    if (existing) {
      const needs =
        existing.regnalNumber !== r.regnalNumber ||
        existing.regnalName !== r.regnalName ||
        existing.startDate.getTime() !== r.startDate.getTime() ||
        (existing.endDate?.getTime() ?? null) !== r.endDate.getTime()
      if (needs) {
        await prisma.sovereignReign.update({
          where: { id: existing.id },
          data: {
            regnalNumber: r.regnalNumber,
            regnalName: r.regnalName,
            startDate: r.startDate,
            endDate: r.endDate,
            appointmentMethod: r.appointmentMethod,
            endReason: r.endReason,
            endReasonDetail: r.endReasonDetail,
            notes: r.notes,
            positionDefinitionId: positionId,
          },
        })
        console.log(`  🔧 재임 정정: 차르국 ${r.regnalName} ${r.regnalNumber}대 (${r.label})`)
      } else {
        console.log(`  ⏭️  재임 스킵 (정확): 차르국 ${r.regnalName} ${r.regnalNumber}대`)
      }
      continue
    }
    // 슬롯 충돌
    const slotConflict = await prisma.sovereignReign.findFirst({
      where: { historicalCountryId: tsardomHC.id, regnalNumber: r.regnalNumber },
    })
    if (slotConflict) {
      console.warn(
        `  ⚠️  재임 충돌: 차르국 ${r.regnalNumber}대 — 다른 인물 점유 (skip ${r.label})`,
      )
      continue
    }
    await prisma.sovereignReign.create({
      data: {
        personId: r.personId,
        historicalCountryId: tsardomHC.id,
        positionDefinitionId: positionId,
        regnalNumber: r.regnalNumber,
        regnalName: r.regnalName,
        startDate: r.startDate,
        endDate: r.endDate,
        appointmentMethod: r.appointmentMethod,
        endReason: r.endReason,
        endReasonDetail: r.endReasonDetail,
        notes: r.notes,
        accountId: admin.id,
      },
    })
    console.log(
      `  ✅ 재임: 차르국 ${r.regnalName} ${r.regnalNumber}대 (${r.startDate.getUTCFullYear()}~${r.endDate.getUTCFullYear()})`,
    )
  }

  // ── 6) 부자 관계 (Romanov 라인) ───────────────────────────────────────
  // Mikhail → Aleksei → Feodor III / Ivan V / Peter I
  const mikhailId = personIdByOriginalName['Michael I of Russia']
  const alekseiId = personIdByOriginalName['Alexis of Russia']
  const feodorIIIid = personIdByOriginalName['Feodor III of Russia']
  const ivanVId = personIdByOriginalName['Ivan V of Russia']
  const peterIId = personIdByOriginalName['Peter I of Russia']

  const fatherLinks: [string | undefined, string | undefined, string][] = [
    [mikhailId, alekseiId, '미하일 1세 → 알렉세이'],
    [alekseiId, feodorIIIid, '알렉세이 → 표도르 3세'],
    [alekseiId, ivanVId, '알렉세이 → 이반 5세'],
    [alekseiId, peterIId, '알렉세이 → 표트르 1세'],
  ]
  for (const [fid, cid, label] of fatherLinks) {
    if (!fid || !cid) continue
    const child = await prisma.person.findUnique({ where: { id: cid }, select: { fatherId: true } })
    if (child?.fatherId) {
      console.log(`  ⏭️  부자 스킵 (이미 연결): ${label}`)
      continue
    }
    await prisma.person.update({ where: { id: cid }, data: { fatherId: fid } })
    console.log(`  ✅ 부자: ${label}`)
  }

  // 추가 부자: 보리스 고두노프 → 표도르 2세
  const borisId = personIdByOriginalName['Boris Godunov']
  const feodorIIid = personIdByOriginalName['Feodor II of Russia']
  if (borisId && feodorIIid) {
    const c = await prisma.person.findUnique({ where: { id: feodorIIid }, select: { fatherId: true } })
    if (!c?.fatherId) {
      await prisma.person.update({ where: { id: feodorIIid }, data: { fatherId: borisId } })
      console.log(`  ✅ 부자: 보리스 고두노프 → 표도르 2세`)
    }
  }

  // 부자: 이반 4세 → 표도르 1세
  const ivanIVId = personIdByOriginalName['Ivan IV of Russia']
  const feodorIId = personIdByOriginalName['Feodor I of Russia']
  if (ivanIVId && feodorIId) {
    const c = await prisma.person.findUnique({ where: { id: feodorIId }, select: { fatherId: true } })
    if (!c?.fatherId) {
      await prisma.person.update({ where: { id: feodorIId }, data: { fatherId: ivanIVId } })
      console.log(`  ✅ 부자: 이반 4세 → 표도르 1세`)
    }
  }

  console.log(`✅ 러시아 차르국 라인업 시딩 완료\n`)
}
