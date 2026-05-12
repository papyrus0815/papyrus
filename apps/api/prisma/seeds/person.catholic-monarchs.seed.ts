/**
 * 후아나 1세의 부모 — 가톨릭 양왕(Reyes Católicos) 시드
 *
 *  - 어머니: 이사벨 1세 (Isabella I of Castile, 1451~1504) — 카스티야 12대 여왕
 *  - 아버지: 페르난도 2세 (Ferdinand II of Aragon, 1452~1516) — 아라곤 20대 + 카스티야 공동 군주(페르난도 5세)
 *
 * 두 사람의 1469-10-19 결혼이 카스티야-아라곤 동군연합의 출발 → 근대 스페인의 사실상 시조.
 * 1492 그라나다 함락(레콩키스타 완료)·콜럼버스 신대륙 발견 후원·종교재판소·알람브라 칙령 등
 * 16세기 합스부르크 스페인 절대왕정의 직접 토대를 마련.
 *
 * ⚠️ 기존 데이터 보존 모드 — Person/Reign이 이미 있으면 갱신하지 않고 스킵.
 *
 * 등록 항목:
 *  - Person x2 (이사벨 1세·페르난도 2세 — 트라스타마라 가문)
 *  - PersonStats x2
 *  - PersonSpouse x2 (양방향 결혼, 1469-10-19 ~ 1504-11-26 사별)
 *  - PersonCountryAffiliation x2 (이사벨 → 카스티야, 페르난도 → 아라곤)
 *  - 부자/모자 관계 (이사벨·페르난도 → 후아나 1세)
 *  - SovereignReign x3:
 *      (1) 이사벨 1세 — 카스티야 왕국 12대 (1474-12-13 ~ 1504-11-26, DEATH_IN_OFFICE)
 *      (2) 페르난도 2세 — 아라곤 왕국 20대 (1479-01-20 ~ 1516-01-23, DEATH_IN_OFFICE)
 *      (3) 페르난도 2세 — 카스티야 왕국 공동 군주 페르난도 5세 (1474-12-13 ~ 1504-11-26, regnalNumber=NULL,
 *                       jure uxoris — 배우자 권리)
 *
 * ⚠️ 의존: 카를 5세 부모 시드(person.charles-v-parents.seed)가 먼저 실행되어
 *    트라스타마라 가문 + 카스티야 왕국 + 아라곤 왕국 HC + 후아나 1세 Person이 존재해야 한다.
 */
import {
  AppointmentMethod,
  DeathType,
  TenureEndReason,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

// ── 결혼 명세 ──────────────────────────────────────────────────────────────
const MARRIAGE = {
  startYear: 1469,
  startMonth: 10,
  startDay: 19,
  endYear: 1504,
  endMonth: 11,
  endDay: 26, // 이사벨 1세 사망
  note:
    '1469-10-19 카스티야 바야돌리드의 후안 데 비베로(Juan de Vivero) 저택에서 비밀 결혼 — ' +
    '이사벨 18세·페르난도 17세. 이복 형 카스티야 엔리케 4세의 반대를 우회하기 위한 비밀 결혼이었으며 ' +
    '교황 비오 2세의 "혈족 결혼 면제(dispensation)"가 위조본이었다는 의혹은 후일까지 논란. ' +
    '두 왕가의 결합으로 카스티야-아라곤 동군연합이 사실상 출발 → 1469~1715 약 246년의 ' +
    '동군연합 시대 → 1715 누에바 플란타 칙령으로 정식 통합 "에스파냐 왕국" 성립의 출발점. ' +
    '\n\n' +
    '5명의 자녀. (1)이사벨(1470~1498, 포르투갈 왕비) (2)후안(1478~1497, 후계자였으나 19세 요절) ' +
    '(3)후아나(1479~1555, 우리의 후아나 1세 — 합스부르크 결혼으로 왕가 이전) (4)마리아(1482~1517, 포르투갈 왕비 — 마누엘 1세와 결혼, 펠리페 2세 외할머니) ' +
    '(5)카탈리나(1485~1536, 잉글랜드 왕비 — 헨리 8세 첫 부인, 영국 종교개혁의 도화선). ' +
    '\n\n' +
    '성격적 결혼. 정략 결혼이었으나 동시기 기록은 양측의 깊은 신뢰와 협력 — 모든 공식 문서에 ' +
    '"Tanto monta, monta tanto, Isabel como Fernando(똑같이 무게가 같다, 이사벨이나 페르난도나)"라는 ' +
    '동등 통치 슬로건 사용. 양왕은 35년간(1469~1504) 한 번도 별거하지 않은 모범적 부부였다. ' +
    '1504-11-26 이사벨 사망 후 페르난도는 1505 프랑스 제르멘 드 푸아(Germaine de Foix)와 재혼했으나 ' +
    '아들 후안(1509 사산)·정신적 친밀감은 형성하지 못함.',
} as const

// ── 이사벨 1세 본문 ────────────────────────────────────────────────────────
const ISABEL_I = {
  name: '이사벨',
  surname: '트라스타마라',
  originalName: 'Isabella I of Castile',
  regnalName: '1세',
  birthYear: 1451,
  birthMonth: 4,
  birthDay: 22,
  deathYear: 1504,
  deathMonth: 11,
  deathDay: 26,
  birthPlaceText: '카스티야 왕국 마드리갈 데 라스 알타스 토레스(Madrigal de las Altas Torres)',
  deathPlaceText: '카스티야 왕국 메디나 델 캄포(Medina del Campo) — 왕실 궁전',
  deathType: DeathType.ILLNESS,
  deathCause: '자궁암 + 부종(dropsy) 합병증 (한국식 표기 — 동시기 진단명 "hidropesía")',
  deathNote:
    '1504-11-26 메디나 델 캄포에서 53세 사망. 약 1년간의 건강 악화 — (1)배뇨 곤란 (2)복부 종양 ' +
    '(3)다리 부종 (4)발열 반복으로 동시기 의사들이 "수종(hidropesía)"으로 진단. 21세기 의학사는 ' +
    '(1)자궁암(uterine cancer) (2)울혈성 심부전 (3)신부전을 복합 사인으로 평가. ' +
    '\n\n' +
    '임종과 매장. 임종 시 옆에는 남편 페르난도 2세·둘째 딸 후아나(=후아나 1세)·궁정 사람들. ' +
    '이사벨은 마지막 약 6개월간 자신의 매장지를 그라나다(레콩키스타 완료의 상징)로 결정 — ' +
    '시신은 우선 메디나 델 캄포 임시 안치, 1521 그라나다 왕립 예배당(Capilla Real de Granada) ' +
    '완공 후 이장. 21세기 현재까지 부모(가톨릭 양왕)·딸 후아나 1세·사위 미남공 필리프와 함께 안치. ' +
    '\n\n' +
    '계승 문제. 사망으로 카스티야 왕위 → 둘째 딸 후아나 1세에게 즉위(첫째 이사벨·외아들 후안 모두 ' +
    '먼저 사망). 페르난도 2세는 카스티야에서 jure uxoris 권리를 잃고 아라곤만 보유 — 단 후아나의 ' +
    '정신 이상으로 1507 카스티야 섭정으로 복귀.',
  biography:
    '트라스타마라 가문(카스티야 분지)의 카스티야 왕국 12대 여왕(재위 1474~1504). ' +
    '카스티야 후안 2세(Juan II de Castilla, 1405~1454)와 두 번째 부인 포르투갈 이사벨(Isabel de Portugal, ' +
    '1428~1496 — 아비스 가문)의 딸. 이복 형 엔리케 4세(Enrique IV, 무력왕)의 후계자 자리 다툼 끝에 ' +
    '1474-12-13 즉위, 약 30년 재위. ' +
    '\n\n' +
    '1474~1479 카스티야 왕위 계승 전쟁. ' +
    '1474-12-11 이복 형 엔리케 4세 사망. 엔리케의 딸 후아나(Juana la Beltraneja — "벨트라네하" 별명: ' +
    '왕비의 정부 벨트란 데 라 쿠에바의 친자라는 소문)와 이사벨 사이에 카스티야 왕위 다툼 발발. ' +
    '(1)후아나 측 — 포르투갈 알폰소 5세 + 프랑스 (2)이사벨 측 — 남편 페르난도(아라곤) + 카스티야 귀족 다수. ' +
    '1476-03-01 토로 전투(Battle of Toro)에서 결정적 승리, 1479-09-04 알카소바스 조약(Treaty of Alcáçovas)으로 ' +
    '이사벨의 카스티야 왕위 인정 + 후아나는 포르투갈 수녀원 입소. ' +
    '\n\n' +
    '가톨릭 양왕(Reyes Católicos). ' +
    '1469-10-19 페르난도 2세와 결혼으로 카스티야-아라곤 동군연합 출발. 모든 공식 문서에 ' +
    '"Tanto monta, monta tanto"라는 동등 통치 슬로건 사용. 1494 교황 알렉산데르 6세가 ' +
    '"가톨릭 양왕(Los Reyes Católicos / The Catholic Monarchs)" 칭호를 정식 부여. ' +
    '\n\n' +
    '1492 — 결정적 한 해. ' +
    '(1)1492-01-02 그라나다 함락(Granada War 종결) — 약 781년의 레콩키스타 완료, ' +
    '이베리아 반도 마지막 무어인 왕국 나스르 왕조 멸망 (2)1492-03-31 알람브라 칙령(Alhambra Decree) — ' +
    '약 20만 명 유대인 추방·강제 개종(콘베르소 — Converso) (3)1492-08-03 콜럼버스 신대륙 항해 후원 ' +
    '— 1492-10-12 카리브해 도착, 약 320년 스페인 신대륙 식민지의 출발 (4)1492 카스티야어 첫 문법서 ' +
    '"Gramática castellana"(안토니오 데 네브리하) 출판 — "언어는 제국의 동반자"라는 명제. ' +
    '\n\n' +
    '1478 스페인 종교재판소(Inquisición Española). ' +
    '1478-11-01 교황 식스토 4세 칙서로 스페인 종교재판소 설치 인가. 표면적 목적은 ' +
    '"콘베르소(개종한 유대인)의 진정성 검증"이었으나 실제로는 (1)가톨릭 정통 강화 (2)왕권 강화의 ' +
    '도구로 활용. 약 350년(1478~1834) 운영, 약 3,000~5,000명 처형 추정 — "Black Legend(검은 전설)"의 ' +
    '직접 출발점이 되었으나 21세기 학설은 동시기 다른 종교 재판(잉글랜드 헨리 8세·프랑스 위그노 박해 등) ' +
    '대비 처형 규모는 상대적으로 작았다는 견해도 다수. ' +
    '\n\n' +
    '행정·사법 개혁. (1)1480 톨레도 코르테스(의회) — 카스티야 왕권 강화 (2)왕실 평의회(Consejo Real) 정비 ' +
    '(3)산타 헤르만다드(Santa Hermandad — 왕실 경찰) 설치 (4)귀족의 사적 군대·요새 약화 (5)사법 통합 ' +
    '— 후일 합스부르크 절대왕정 행정 시스템의 직접 모델. ' +
    '\n\n' +
    '카스티야어와 문화. ' +
    '(1)1492 안토니오 데 네브리하 "Gramática castellana" — 라틴어 외 첫 유럽어 문법서, 카스티야어 = 스페인어의 ' +
    '결정적 표준화 (2)부르고스·세비야 등 인쇄소 발달 (3)티치아노 이전 시기지만 디에고 데 라 크루스 등 ' +
    '르네상스 화풍 도입. ' +
    '\n\n' +
    '장기 유산. (1)1469 카스티야-아라곤 동군연합 → 1715 통합 "에스파냐 왕국"의 사실상 시조 ' +
    '(2)1492 그라나다·콜럼버스로 16세기 스페인 식민제국·황금시대의 직접 출발 (3)행정·사법 개혁 → 합스부르크 절대왕정 모델 ' +
    '(4)1503 둘째 딸 후아나의 합스부르크 결혼으로 1516 합스부르크 스페인의 출발 (5)다섯째 딸 카탈리나 데 아라곤이 ' +
    '잉글랜드 헨리 8세의 첫 부인 → 1533 이혼 → 영국 종교개혁의 도화선 — 16세기 유럽 정치사 거의 모든 ' +
    '결정적 사건에 직간접 영향.',
  influence: 90,
  stats: {
    politics: 92,
    military: 78,
    diplomacy: 85,
    intellect: 80,
    charisma: 80,
    administration: 92,
    notes:
      '약 30년 재위 동안 카스티야 절대왕정의 사실상 시조 — (1)1474~1479 왕위 계승 전쟁 직접 지휘 ' +
      '(2)1480 톨레도 코르테스로 왕권 강화 (3)1492 그라나다·콜럼버스·종교재판소·알람브라 칙령 동시 추진 ' +
      '(4)1494 교황 "가톨릭 양왕" 칭호 획득. 행정·정치는 동시기 유럽 군주 중 최상위, ' +
      '군사는 직접 갑옷 차림으로 토로 전투(1476)·그라나다 포위전(1492) 등에 참여. ' +
      '카리스마는 페르난도와의 35년 동등 통치·5명 자녀 양육으로 가족적 모범 + 종교적 권위 결합. ' +
      '학식은 라틴어·정치 신학에 정통, "Gramática castellana(1492)" 후원으로 카스티야어 표준화. ' +
      '단 알람브라 칙령(유대인 추방)·종교재판소 설치는 21세기 평가에서 결정적 인권 침해로 지속 비판.',
  },
} as const

// ── 페르난도 2세 본문 ──────────────────────────────────────────────────────
const FERNANDO_II = {
  name: '페르난도',
  surname: '트라스타마라',
  originalName: 'Ferdinand II of Aragon',
  regnalName: '2세',
  birthYear: 1452,
  birthMonth: 3,
  birthDay: 10,
  deathYear: 1516,
  deathMonth: 1,
  deathDay: 23,
  birthPlaceText: '아라곤 왕국 소스 델 레이 카톨리코(Sos del Rey Católico) — 후아나 엔리케스 가문 저택',
  deathPlaceText: '카스티야 왕국 마드리갈레호(Madrigalejo, Cáceres)',
  deathType: DeathType.ILLNESS,
  deathCause: '울혈성 심부전 + 부종 + 후일 매독 가설 (한국식 표기)',
  deathNote:
    '1516-01-23 카스티야 마드리갈레호의 작은 농촌 저택에서 63세 사망. 약 2년간 (1)배뇨 곤란 ' +
    '(2)복부 부종 (3)거동 곤란이 누적, 1515 가을부터 결정적 악화. 사인 학술 평가는 ' +
    '(1)울혈성 심부전 (2)통풍 (3)말년 매독(syphilis) 가설(1505 재혼한 제르멘 드 푸아의 영향)이 복합. ' +
    '\n\n' +
    '임종과 매장. 임종 시 옆에는 추기경 시스네로스(후일 카스티야 섭정)·궁정 사람들. ' +
    '시신은 1521 그라나다 왕립 예배당(Capilla Real de Granada)으로 이장 — 부인 이사벨 1세·딸 후아나 1세· ' +
    '사위 미남공 필리프와 함께 안치. 21세기 현재까지 보존. ' +
    '\n\n' +
    '계승. 사망으로 (1)아라곤·시칠리아·나폴리·사르데냐·발렌시아·마요르카 → 딸 후아나 1세 → ' +
    '실제로는 외손자 카를 5세(=카를로스 1세)가 카스페 협약 이래 약 100년 트라스타마라 직계 계승자로 즉위 ' +
    '(2)카스티야 섭정직 → 추기경 시스네로스 1517-09까지 → 카를 5세 첫 스페인 방문으로 정권 이양. ' +
    '\n\n' +
    '후일의 명성. 마키아벨리가 "군주론(Il Principe, 1513)"에서 페르난도 2세를 ' +
    '"동시기의 새로운 군주(modern Prince)의 모범"으로 칭송 — 종교적 명분(가톨릭 양왕)·외교 전략·' +
    '신대륙 후원 등을 종합한 "이상적 르네상스 군주"의 사례로 평가.',
  biography:
    '트라스타마라 가문(아라곤 분지)의 아라곤 왕국 20대 국왕(재위 1479~1516) + 카스티야 왕국 공동 군주 ' +
    '페르난도 5세(재위 1474~1504, jure uxoris). 아라곤 왕 후안 2세(Juan II de Aragón, 1398~1479)와 두 번째 ' +
    '부인 후아나 엔리케스(Juana Enríquez de Córdoba, 1425~1468)의 아들. ' +
    '\n\n' +
    '1452 출생과 양육. 1452-03-10 아라곤 왕국 소스 델 레이 카톨리코(현 사라고사 주) 출생. ' +
    '아버지 후안 2세는 이미 50대 + 첫 부인 블랑카 데 나바라와의 첫째 아들 비아나 공 카를로스(Carlos de Viana)와 ' +
    '계승 다툼 진행 중 — 페르난도가 차남으로 출생했으나 1461 비아나 공 카를로스 사망으로 단독 계승자 부상. ' +
    '\n\n' +
    '1469 이사벨 1세와 결혼. 1469-10-19 카스티야 바야돌리드에서 이사벨(=이사벨 1세)과 비밀 결혼. ' +
    '페르난도 17세·이사벨 18세. 카스티야 엔리케 4세의 반대를 우회하기 위한 비밀 결혼이었으며 ' +
    '두 왕가의 결합으로 카스티야-아라곤 동군연합 사실상 출발. 5자녀 — 이사벨·후안·후아나·마리아·카탈리나. ' +
    '\n\n' +
    '1474 카스티야 공동 군주. 1474-12-13 이사벨이 카스티야 12대 여왕 즉위, 페르난도는 ' +
    '"jure uxoris(배우자 권리)"로 공동 군주 페르난도 5세(Fernando V de Castilla) 즉위. ' +
    '약 30년간(1474~1504) 카스티야·아라곤을 사실상 동등 군주로 통치. ' +
    '\n\n' +
    '1479 아라곤 왕 즉위. 1479-01-19 아버지 후안 2세 사망으로 아라곤·시칠리아·사르데냐·발렌시아·마요르카 ' +
    '왕(아라곤 20대 페르난도 2세) 즉위. 1481 후일 점진적으로 나폴리(1503 정복)·나바라(1512 정복)도 추가. ' +
    '\n\n' +
    '1492 — 가톨릭 양왕의 정점. (1)1492-01-02 그라나다 함락(Granada War — 페르난도 직접 지휘) ' +
    '(2)1492-03-31 알람브라 칙령(유대인 추방) (3)1492-08-03 콜럼버스 신대륙 항해 후원 (4)1494 교황 ' +
    '"가톨릭 양왕" 칭호 부여. 부인 이사벨 1세와의 동등 통치 정점. ' +
    '\n\n' +
    '외교의 천재 — 마키아벨리의 모범. ' +
    '(1)1494-06-07 토르데시야스 조약(Treaty of Tordesillas) — 포르투갈과 신대륙 분할(서경 46도) ' +
    '(2)1494~1559 약 65년 이탈리아 전쟁의 출발 — 1494 프랑스 샤를 8세의 이탈리아 침공에 대응 ' +
    '(3)1503 나폴리 정복(곤살로 페르난데스 데 코르도바 — "위대한 사령관(El Gran Capitán)") ' +
    '(4)1512 나바라 정복으로 이베리아 반도 통합 거의 완료 (5)1495·1508 신성동맹(Holy League) 결성 ' +
    '— 프랑스 봉쇄. 마키아벨리 "군주론(1513)" 21장이 페르난도를 "동시기의 새로운 군주의 모범"으로 칭송. ' +
    '\n\n' +
    '1503 신대륙 식민지 시스템. (1)Casa de Contratación(상무성, 1503-01-20 세비야 설치) — 신대륙 무역 독점 ' +
    '(2)엔코미엔다(encomienda) 시스템 — 식민지 노동력 강제 동원 (후일 인권 문제 직접 출발) ' +
    '(3)1493 교황 알렉산데르 6세의 "Inter caetera" 칙서로 신대륙 스페인 측 분할 인정. ' +
    '\n\n' +
    '1504 이사벨 1세 사망과 카스티야 섭정 다툼. ' +
    '1504-11-26 이사벨 사망으로 페르난도는 jure uxoris 카스티야 권리 상실, 둘째 딸 후아나 1세가 즉위. ' +
    '1505 페르난도가 프랑스 제르멘 드 푸아(Germaine de Foix, 1488~1538)와 재혼 — 사위 미남공 필리프 ' +
    '(=펠리페 1세)와의 카스티야 섭정 다툼 시작. 1506-09-25 미남공 필리프 28세 급사로 1507 페르난도가 ' +
    '카스티야 섭정 복귀, 1509 후아나 토르데시야스 유폐 결정. 1516 사망 시까지 카스티야 사실상 단독 통치. ' +
    '\n\n' +
    '장기 유산. (1)1469 카스티야-아라곤 동군연합 → 1715 "에스파냐 왕국"의 시조 ' +
    '(2)1492 그라나다·콜럼버스로 스페인 식민제국 출발 (3)1503 나폴리·1512 나바라로 이베리아 반도 통합 ' +
    '(4)마키아벨리 "군주론"의 르네상스 군주 모범 (5)외손자 카를 5세를 통한 합스부르크 스페인 시작 ' +
    '(6)다섯째 딸 카탈리나의 잉글랜드 결혼 → 후일 영국 종교개혁의 도화선.',
  influence: 88,
  stats: {
    politics: 90,
    military: 85,
    diplomacy: 95,
    intellect: 75,
    charisma: 75,
    administration: 85,
    notes:
      '마키아벨리 "군주론"이 직접 칭송한 르네상스 군주의 모범 — 외교(1494 토르데시야스·1503 나폴리·1512 나바라· ' +
      '신성동맹)에서 정점. 1492 그라나다 정복 직접 지휘 + 1503 "위대한 사령관" 코르도바의 ' +
      '나폴리 정복 후원으로 군사도 우수. 정치는 약 47년 재위(아라곤 1479~1516, 카스티야 공동 1474~1504, ' +
      '카스티야 섭정 1507~1516)로 동시기 최장기 군주 중 1인. ' +
      '행정은 부인 이사벨 1세에 비해 카리스마·인기는 약했으나 (1)Casa de Contratación 신대륙 무역 독점 시스템 ' +
      '(2)엔코미엔다 식민지 노동 시스템 (3)아라곤 코르테스 정비. ' +
      '카리스마는 이사벨에 비해 평이하지만 외교 술수·차분한 인내로 동시기 평가는 "교활한 여우(zorro)"·' +
      '"신중한 군주(prudente)" 양면.',
  },
} as const

export async function seedCatholicMonarchs(prisma: PrismaService): Promise<void> {
  console.log('\n👑 가톨릭 양왕(이사벨 1세 + 페르난도 2세) 시딩 시작 (기존 데이터 보존 모드)...')

  // ── 사전 의존성 ────────────────────────────────────────────────────────
  const admin = await prisma.account.findUnique({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  ⚠️  admin 계정이 없어 시딩을 건너뜀')
    return
  }

  const trastamaraDynasty = await prisma.dynasty.findFirst({
    where: { name: '트라스타마라 가문' },
    select: { id: true },
  })
  if (!trastamaraDynasty) {
    console.warn('  ⚠️  트라스타마라 가문 미존재 — 먼저 person.charles-v-parents.seed 실행 필요')
    return
  }

  const castileHC = await prisma.historicalCountry.findFirst({
    where: { name: '카스티야 왕국' },
    select: { id: true },
  })
  const aragonHC = await prisma.historicalCountry.findFirst({
    where: { name: '아라곤 왕국' },
    select: { id: true },
  })
  if (!castileHC || !aragonHC) {
    console.warn('  ⚠️  카스티야 왕국 또는 아라곤 왕국 HC 미존재 — 시딩 중단')
    return
  }

  const joanna = await prisma.person.findFirst({
    where: { originalName: 'Joanna of Castile' },
    select: { id: true, fatherId: true, motherId: true },
  })
  if (!joanna) {
    console.warn('  ⚠️  후아나 1세 미존재 — 먼저 person.charles-v-parents.seed 실행 필요')
    return
  }

  const kingPos = await prisma.governmentPositionDefinition.findFirst({
    where: { title: '국왕' },
    select: { id: true },
  })
  if (!kingPos) {
    console.warn('  ⚠️  관직 정의 \'국왕\' 미존재 — 시딩 중단')
    return
  }

  // ── Helper: Person 등록 (기존 보존 모드) ────────────────────────────────
  const createOrFindPerson = async (
    spec: typeof ISABEL_I | typeof FERNANDO_II,
    gender: 'MALE' | 'FEMALE',
  ): Promise<string> => {
    const existing = await prisma.person.findFirst({
      where: { originalName: spec.originalName },
    })
    if (existing) {
      console.log(`  ⏭️  인물 이미 존재 — 스킵: ${spec.originalName} (id=${existing.id})`)
      const patch: any = {}
      if (!existing.dynastyId) patch.dynastyId = trastamaraDynasty.id
      if (!existing.deathType) patch.deathType = spec.deathType
      if (!existing.deathCause) patch.deathCause = spec.deathCause
      if (!existing.deathNote) patch.deathNote = spec.deathNote
      if (!existing.biography) patch.biography = spec.biography
      if (!existing.birthPlaceText) patch.birthPlaceText = spec.birthPlaceText
      if (!existing.deathPlaceText) patch.deathPlaceText = spec.deathPlaceText
      if (existing.influence == null) patch.influence = spec.influence
      if (Object.keys(patch).length > 0) {
        await prisma.person.update({ where: { id: existing.id }, data: patch })
        console.log(`    🔧 필드 보강: ${Object.keys(patch).join(', ')}`)
      }
      return existing.id
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
        gender,
        nameDisplayOrder: 'western' as any,
        dynastyId: trastamaraDynasty.id,
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
    return created.id
  }

  // ── 1) 이사벨 1세 + 페르난도 2세 등록 ─────────────────────────────────
  const isabelId = await createOrFindPerson(ISABEL_I, 'FEMALE')
  const fernandoId = await createOrFindPerson(FERNANDO_II, 'MALE')

  // ── 2) PersonStats x2 ──────────────────────────────────────────────────
  for (const [pid, spec, label] of [
    [isabelId, ISABEL_I, '이사벨 1세'],
    [fernandoId, FERNANDO_II, '페르난도 2세'],
  ] as const) {
    const exists = await prisma.personStats.findFirst({
      where: { personId: pid, accountId: admin.id },
    })
    if (exists) {
      console.log(`    ⏭️  ${label} 능력치 스킵 (이미 존재)`)
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
      `    ✅ ${label} 능력치: 정치 ${spec.stats.politics}·군사 ${spec.stats.military}·` +
        `외교 ${spec.stats.diplomacy}·학식 ${spec.stats.intellect}·카리스마 ${spec.stats.charisma}·` +
        `행정 ${spec.stats.administration}`,
    )
  }

  // ── 3) PersonCountryAffiliation ──────────────────────────────────────
  for (const [pid, hcId, label, hcLabel] of [
    [isabelId, castileHC.id, '이사벨 1세', '카스티야 왕국'],
    [fernandoId, aragonHC.id, '페르난도 2세', '아라곤 왕국'],
  ] as const) {
    const exists = await prisma.personCountryAffiliation.findFirst({
      where: {
        personId: pid,
        historicalCountryId: hcId,
        affiliationType: 'CITIZENSHIP' as any,
      },
    })
    if (exists) {
      console.log(`  ⏭️  소속국가 스킵: ${label} → ${hcLabel}`)
      continue
    }
    await prisma.personCountryAffiliation.create({
      data: {
        personId: pid,
        historicalCountryId: hcId,
        affiliationType: 'CITIZENSHIP' as any,
        priority: 0,
      },
    })
    console.log(`  ✅ 소속국가: ${label} → ${hcLabel} (CITIZENSHIP)`)
  }

  // ── 4) 결혼 관계 (양방향) ─────────────────────────────────────────────
  const startDate = new Date(MARRIAGE.startYear, MARRIAGE.startMonth - 1, MARRIAGE.startDay)
  const endDate = new Date(MARRIAGE.endYear, MARRIAGE.endMonth - 1, MARRIAGE.endDay)
  for (const [aId, bId, label] of [
    [fernandoId, isabelId, '페르난도 → 이사벨'],
    [isabelId, fernandoId, '이사벨 → 페르난도'],
  ] as const) {
    const exists = await prisma.personSpouse.findFirst({
      where: { personId: aId, spouseId: bId },
    })
    if (exists) {
      console.log(`  ⏭️  결혼 스킵: ${label}`)
      continue
    }
    await prisma.personSpouse.create({
      data: {
        personId: aId,
        spouseId: bId,
        marriageStartDate: startDate,
        marriageEndDate: endDate,
        note: MARRIAGE.note,
      },
    })
    console.log(`  ✅ 결혼: ${label} (1469-10-19 ~ 1504-11-26 사별)`)
  }

  // ── 5) 부자/모자 관계 (후아나 1세에 부모 연결) ──────────────────────────
  if (joanna.fatherId) {
    console.log(`  ⏭️  부자 스킵 (이미 연결): 후아나 1세 fatherId=${joanna.fatherId}`)
  } else {
    await prisma.person.update({
      where: { id: joanna.id },
      data: { fatherId: fernandoId },
    })
    console.log(`  ✅ 부자: 페르난도 2세 → 후아나 1세`)
  }
  if (joanna.motherId) {
    console.log(`  ⏭️  모자 스킵 (이미 연결): 후아나 1세 motherId=${joanna.motherId}`)
  } else {
    await prisma.person.update({
      where: { id: joanna.id },
      data: { motherId: isabelId },
    })
    console.log(`  ✅ 모자: 이사벨 1세 → 후아나 1세`)
  }

  // ── 6) SovereignReign x3 ──────────────────────────────────────────────
  type ReignSpec = {
    personId: string
    historicalCountryId: string
    historicalCountryName: string
    regnalNumber: number | null
    regnalName: string
    startDate: Date
    endDate: Date
    appointmentMethod: AppointmentMethod
    endReason: TenureEndReason
    endReasonDetail?: string
    notes?: string
  }

  // (1) 이사벨 1세 — 카스티야 12대
  // (HC start=1230 페르난도 3세부터: ... 11.엔리케 4세 → 12.이사벨 1세 → 13.후아나 1세)
  // (2) 페르난도 2세 — 아라곤 20대
  // (HC start=1035 라미로 1세부터: ... 19.후안 2세 → 20.페르난도 2세 → 21.후아나 1세)
  // (3) 페르난도 2세 — 카스티야 공동 군주 페르난도 5세 (regnalNumber=NULL, jure uxoris)
  const REIGNS: ReignSpec[] = [
    {
      personId: isabelId,
      historicalCountryId: castileHC.id,
      historicalCountryName: '카스티야 왕국',
      regnalNumber: 12,
      regnalName: '이사벨 1세',
      startDate: new Date(1474, 11, 13), // 1474-12-13 즉위 (이복 형 엔리케 4세 사망 12-11)
      endDate: new Date(1504, 10, 26), // 1504-11-26 사망
      appointmentMethod: AppointmentMethod.HEREDITARY,
      endReason: TenureEndReason.DEATH_IN_OFFICE,
      endReasonDetail: '1504-11-26 메디나 델 캄포에서 53세 사망 (자궁암·울혈성 심부전 추정).',
      notes:
        '1474-12-13 이복 형 엔리케 4세 사망(12-11) 후 즉위, 1474~1479 카스티야 왕위 계승 전쟁(' +
        '후아나 라 벨트라네하·포르투갈 알폰소 5세 측 격파 — 1476 토로 전투·1479 알카소바스 조약)을 거쳐 ' +
        '단독 카스티야 여왕 확립. 약 30년 재위 중 1492 그라나다 함락·콜럼버스 후원·알람브라 칙령· ' +
        '"Gramática castellana", 1494 교황 "가톨릭 양왕" 칭호, 1478 종교재판소 설치 등 ' +
        '근대 스페인 절대왕정의 사실상 시조.',
    },
    {
      personId: fernandoId,
      historicalCountryId: aragonHC.id,
      historicalCountryName: '아라곤 왕국',
      regnalNumber: 20,
      regnalName: '페르난도 2세',
      startDate: new Date(1479, 0, 20), // 1479-01-20 부친 후안 2세 사망(1479-01-19) 다음 날 즉위
      endDate: new Date(1516, 0, 23), // 1516-01-23 본인 사망
      appointmentMethod: AppointmentMethod.HEREDITARY,
      endReason: TenureEndReason.DEATH_IN_OFFICE,
      endReasonDetail: '1516-01-23 카스티야 마드리갈레호에서 63세 사망 (울혈성 심부전·통풍 추정).',
      notes:
        '1479-01-19 부친 후안 2세 사망으로 아라곤·시칠리아·사르데냐·발렌시아·마요르카 ' +
        '왕위 즉위. 약 37년 재위. 1503 곤살로 페르난데스 데 코르도바 "위대한 사령관"의 나폴리 정복 + ' +
        '1512 나바라 정복으로 영토 확장. 1494 토르데시야스 조약·1495·1508 신성동맹 등 외교의 천재 — ' +
        '마키아벨리 "군주론(1513)"이 "동시기의 새로운 군주의 모범"으로 칭송. ' +
        '동시에 카스티야 공동 군주(페르난도 5세, jure uxoris, 1474~1504) + 카스티야 섭정(1507~1516)으로 ' +
        '사실상 카스티야·아라곤 양국 군주 지위 유지.',
    },
    {
      personId: fernandoId,
      historicalCountryId: castileHC.id,
      historicalCountryName: '카스티야 왕국',
      regnalNumber: null, // 공동 군주 — 12대 슬롯은 이사벨 1세 점유, NULL로 명시
      regnalName: '페르난도 5세 (이사벨 1세 공동 군주, jure uxoris)',
      startDate: new Date(1474, 11, 13), // 이사벨 1세 즉위와 동시
      endDate: new Date(1504, 10, 26), // 이사벨 1세 사망 — jure uxoris 권리 종결
      appointmentMethod: AppointmentMethod.OTHER, // jure uxoris (배우자 권리)
      endReason: TenureEndReason.OTHER,
      endReasonDetail:
        '1504-11-26 부인 이사벨 1세 사망으로 jure uxoris(배우자 권리) 카스티야 왕권 상실. ' +
        '카스티야 왕위는 둘째 딸 후아나 1세(13대)에게 즉위. 단 후아나의 정신 이상으로 ' +
        '1507~1516 약 9년간 카스티야 섭정으로 사실상 단독 통치 복귀.',
      notes:
        '1469-10-19 이사벨과 결혼·1474-12-13 이사벨의 카스티야 즉위 동시에 "jure uxoris(배우자 권리)"로 ' +
        '카스티야 공동 군주 페르난도 5세(Fernando V de Castilla) 즉위. "Tanto monta, monta tanto, ' +
        'Isabel como Fernando(똑같이 무게가 같다)"라는 동등 통치 슬로건 — 두 군주가 모든 공식 문서에 ' +
        '공동 서명. 약 30년간(1474~1504) 카스티야·아라곤을 사실상 동등 군주로 통치. ' +
        '단 카스티야 12대 정통 여왕은 이사벨 1세이며, 페르난도는 정식 ordinal slot을 점유하지 않은 ' +
        '공동 군주(co-monarch)로 기록 — regnalNumber=NULL, regnalName="페르난도 5세 (이사벨 1세 공동 군주, jure uxoris)".',
    },
  ]

  for (const r of REIGNS) {
    // 멱등성: personId + historicalCountryId 기준 우선 조회
    const existingByPerson = await prisma.sovereignReign.findFirst({
      where: { personId: r.personId, historicalCountryId: r.historicalCountryId },
    })
    if (existingByPerson) {
      const needsUpdate =
        existingByPerson.regnalNumber !== r.regnalNumber ||
        existingByPerson.regnalName !== r.regnalName
      if (needsUpdate) {
        await prisma.sovereignReign.update({
          where: { id: existingByPerson.id },
          data: { regnalNumber: r.regnalNumber, regnalName: r.regnalName },
        })
        console.log(
          `  🔧 재임 정정: ${r.historicalCountryName} ${r.regnalName} ${r.regnalNumber ?? '공동'}`,
        )
      } else {
        console.log(
          `  ⏭️  재임 스킵 (이미 정확): ${r.historicalCountryName} ${r.regnalName} ${r.regnalNumber ?? '공동'}`,
        )
      }
      continue
    }
    // 신규 — regnalNumber 슬롯 충돌 검사 (NULL은 NULL-distinct로 항상 통과)
    if (r.regnalNumber !== null) {
      const slotConflict = await prisma.sovereignReign.findFirst({
        where: {
          historicalCountryId: r.historicalCountryId,
          regnalNumber: r.regnalNumber,
        },
      })
      if (slotConflict) {
        console.warn(
          `  ⚠️  재임 충돌: ${r.historicalCountryName} ${r.regnalNumber}대 — 다른 인물 점유 (skip)`,
        )
        continue
      }
    }
    await prisma.sovereignReign.create({
      data: {
        personId: r.personId,
        historicalCountryId: r.historicalCountryId,
        positionDefinitionId: kingPos.id,
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
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    console.log(
      `  ✅ 재임: ${r.historicalCountryName} ${r.regnalName} ${r.regnalNumber ?? '공동'} ` +
        `(${fmt(r.startDate)} ~ ${fmt(r.endDate)})`,
    )
  }

  console.log(`✅ 가톨릭 양왕 시딩 완료\n`)
}
