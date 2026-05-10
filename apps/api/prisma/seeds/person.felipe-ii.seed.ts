/**
 * 펠리페 2세 (Felipe II / Philip II of Spain, 1527~1598) 인물 시드
 *
 * ⚠️ 기존 데이터 보존 모드 — Person/Dynasty/HistoricalCountry/Reign이 이미 있으면
 *    갱신하지 않고 스킵한다. (사용자 편집 보호)
 *
 * 카를 5세의 적장자. "신중왕(el Prudente)". 16세기 후반 합스부르크 스페인의 정점.
 * 1580 이베리아 연합으로 카스티야·아라곤·포르투갈 + 신대륙·필리핀·이탈리아·네덜란드까지
 * 명실상부한 "해가 지지 않는 제국"을 완성한 군주.
 *
 * 인라인 생성:
 *  - 아비스 가문 (Dynasty — 어머니 이사벨 데 포르투갈의 가문)
 *  - 포르투갈 왕국 (HistoricalCountry, 1139~1910)
 *
 * 등록 항목:
 *  - 아비스 가문 (Dynasty)
 *  - 포르투갈 왕국 (HistoricalCountry)
 *  - DynastyRule x3:
 *      합스부르크 → 카스티야 왕국 (1516~1700, 스페인 합스부르크)
 *      아비스 → 포르투갈 왕국 (1385~1580)
 *      합스부르크 → 포르투갈 왕국 (1580~1640, 이베리아 연합)
 *  - 어머니 이사벨 데 포르투갈 (Person, 아비스 가문 + 사망·전기)
 *  - 펠리페 2세 (Person, 합스부르크 가문 + 사망·전기)
 *  - 카를 5세 ↔ 펠리페 2세 부자 관계 (fatherId)
 *  - 이사벨 ↔ 펠리페 2세 모자 관계 (motherId)
 *  - SovereignReign x3:
 *      ① 카스티야 왕국 국왕 16대 펠리페 2세 (1556-01-16 ~ 1598-09-13, DEATH_IN_OFFICE)
 *      ② 합스부르크령 네덜란드 군주 3대 펠리페 2세 (1555-10-25 ~ 1581-07-26, REMOVAL — 단념 선언)
 *      ③ 포르투갈 왕국 국왕 18대 펠리페 1세 (1580-09-12 ~ 1598-09-13, DEATH_IN_OFFICE)
 *  - PersonCountryAffiliation x1 (펠리페 2세 → 카스티야 왕국 CITIZENSHIP)
 *  - PersonStats x2 (펠리페 2세·이사벨 — 6축 능력치, admin 평가)
 *
 * ⚠️ 의존: 카를 5세 시드(person.charles-v.seed) + 부모 시드(person.charles-v-parents.seed)가
 *    먼저 실행되어 카를 5세 Person + 합스부르크 가문 + 카스티야 왕국 HC + 합스부르크령 네덜란드 HC가 존재해야 한다.
 */
import {
  AppointmentMethod,
  DeathType,
  HistoricalEntityKind,
  HistoricalStateType,
  TenureEndReason,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

// ── 펠리페 2세 인물 본문 ───────────────────────────────────────────────────
const FELIPE_II = {
  name: '펠리페',
  surname: '합스부르크',
  originalName: 'Philip II of Spain',
  regnalName: '2세',
  birthYear: 1527,
  birthMonth: 5,
  birthDay: 21,
  deathYear: 1598,
  deathMonth: 9,
  deathDay: 13,
  birthPlaceText: '카스티야 왕국 바야돌리드(Valladolid) — 베르나르도 데 피멘텔 궁(Palacio de Pimentel)',
  deathPlaceText: '카스티야 왕국 산 로렌소 데 엘 에스코리알(El Escorial) — 본인 건립 왕립 수도원',
  deathType: DeathType.ILLNESS,
  deathCause: '말년 약 53일간의 욕창성 종양 + 만성 통풍 + 발열 합병증 (전립선암 추정설 포함)',
  deathNote:
    '1598-07-22 엘 에스코리알 도착 후 약 53일간 침대에 누워서 임종 진행 — ' +
    '동시기 유럽 군주 임종 중 가장 길고 상세히 기록된 사례 중 하나(주치의 후안 데 비브리아·궁정 사관 기록). ' +
    '\n\n' +
    '【병변 진행】 ①1597 말부터 무릎 통증·고열 반복 ②1598-06 마드리드에서 엘 에스코리알로 ' +
    '50km 이동(약 1주일 소요, 들것 사용) ③1598-07-22 도착 후 침대에 고정, 다리·복부에 ' +
    '거대한 종양성 욕창 다수 발생, 종양에서 화농·구더기 발생(동시기 기록) ④의사들이 자세 변경을 ' +
    '시도했으나 통증·악취 때문에 약 50일 한 자세 유지 ⑤1598-09-13 새벽 5시경 사망(향년 71세). ' +
    '임종 시 십자가에 입맞춤 + 부친 카를 5세가 사용했던 양초 보유. ' +
    '\n\n' +
    '【부검·매장】 부검 시행 — 다리·복부의 종양 + 신장 결석 다수 확인. ' +
    '시신은 본인 건립 〈엘 에스코리알 왕립 수도원〉 〈왕들의 판테온(Panteón de los Reyes)〉에 안치 — ' +
    '아버지 카를 5세 옆. 21세기 현재까지 보존. 펠리페 2세는 자신의 임종을 ' +
    '엘 에스코리알에서 맞이하기 위해 1561 마드리드 천도부터 약 37년간 준비. ' +
    '\n\n' +
    '【사인 학술 평가】 21세기 의학사(Petrie, 1963; Parker, 1998 등) — ' +
    '①만성 통풍(podagra — 합스부르크 가문 유전) ②전립선암 가능성(말년 배뇨 곤란·신장 결석 동반) ' +
    '③장기 누워있음에 의한 욕창성 농양 ④패혈증으로 추정. 단일 사인보다 다중 합병증으로 평가.',
  biography:
    '합스부르크 가문 — 스페인 합스부르크의 2대 군주. 카를 5세(Carlos I)와 이사벨 데 포르투갈의 ' +
    '적장자. 신중왕(el Prudente)·욕망의 지배자(el Rey Burócrata) 별칭. ' +
    '재위 ①카스티야·아라곤·이탈리아·신대륙(1556~1598) ②합스부르크령 네덜란드(1555~1581) ' +
    '③포르투갈(1580~1598, 펠리페 1세 — 이베리아 연합) ④잉글랜드 왕배(1554~1558, 메리 1세 결혼 기간) ' +
    '⑤밀라노 공국(1540~1598, 부친 양위) ⑥나폴리·시칠리아·사르데냐 왕(1554/1556~1598). ' +
    '\n\n' +
    '【출생과 양육】 1527-05-21 카스티야 바야돌리드 출생. 부친은 신성로마황제 카를 5세, ' +
    '모친은 이사벨 데 포르투갈(포르투갈 마누엘 1세의 딸). 부친이 신성로마·네덜란드 통치를 위해 ' +
    '주로 부재 중이었으므로 모친의 섭정 하에 카스티야 궁정에서 양육. ' +
    '12세인 1539-05 모친 이사벨이 7번째 출산 후 산욕열로 사망 — 펠리페에게 평생 트라우마. ' +
    '1540~1543 부친의 부재 동안 후안 데 수니가·카르데날 후안 마르티네스 실리세오 등의 인문 교육 + ' +
    '라틴어·이탈리아어·프랑스어·포르투갈어 학습(영어·독일어는 어색). ' +
    '\n\n' +
    '【1543 첫 결혼·섭정】 16세인 1543-11-12 사촌 마리아 마누엘라 데 포르투갈(Maria Manuela of Portugal, ' +
    '1527~1545)과 결혼. 부친 카를 5세가 신성로마 통치로 부재 시 펠리페가 카스티야 섭정 (1543~1548). ' +
    '1545-07-08 마리아 마누엘라가 아들 돈 카를로스(Don Carlos, 1545~1568) 출산 후 4일 만에 산욕열로 사망(18세). ' +
    '\n\n' +
    '【1554 메리 1세와 결혼·잉글랜드 왕배】 1554-07-25 윈체스터 대성당에서 메리 1세(Mary I of England, 1516~1558)와 결혼. ' +
    '신성로마-스페인 vs 프랑스 양면 봉쇄 + 영국 가톨릭 복귀를 동시 노린 정략 결혼. ' +
    '잉글랜드 왕배(King consort)로 약 4년 — 자녀 없음(메리 1세의 두 차례 가짜 임신). ' +
    '1558-11-17 메리 1세 사망으로 잉글랜드 왕배 종결, 후임 엘리자베스 1세는 펠리페 2세의 청혼 거절. ' +
    '\n\n' +
    '【1555~1556 부친의 분할 양위로 즉위】 ①1555-10-25 브뤼셀에서 합스부르크령 네덜란드 양위 — 3대 펠리페 2세 즉위 ' +
    '②1556-01-16 카스티야·아라곤·나폴리·시칠리아·사르데냐·이탈리아·신대륙 양위 — 카스티야 16대 펠리페 2세 즉위 ' +
    '③1556-02-25 신성로마제국은 동생 페르디난트 1세에게 양위 — 합스부르크 가문이 스페인 합스부르크(펠리페 계열) + ' +
    '오스트리아 합스부르크(페르디난트 계열)로 분할. ' +
    '\n\n' +
    '【1557~1559 프랑스 격파·이탈리아 평화】 ①1557-08-10 산 칸틴 전투(Battle of St. Quentin) — ' +
    '프랑스군 격파, 펠리페 2세는 이를 기념해 산 로렌소 성인의 축일에 〈엘 에스코리알 수도원〉 건립 시작(1563~1584) ' +
    '②1559-04-03 카토-캄브레지 조약(Treaty of Cateau-Cambrésis) — 약 65년에 걸친 이탈리아 전쟁(1494~) 종결, ' +
    '스페인의 이탈리아 패권 확립(나폴리·시칠리아·밀라노). ' +
    '\n\n' +
    '【1559 엘리자베스 드 발루아와 결혼】 1559-06-22 카토-캄브레지 조약 결과 프랑스 앙리 2세의 딸 ' +
    '엘리자베스 드 발루아(Elisabeth of Valois, 1545~1568)와 결혼. 두 딸 — ①이사벨라 클라라 에우헤니아 ' +
    '(Isabella Clara Eugenia, 1566~1633, 후일 합스부르크령 네덜란드 공동 군주) ②카탈리나 미카엘라 ' +
    '(Catalina Micaela, 1567~1597, 사보이 공작비). 1568-10-03 엘리자베스가 출산 합병증으로 사망(23세). ' +
    '\n\n' +
    '【1561 마드리드 천도】 1561-05 카스티야 톨레도에서 마드리드(Madrid)로 수도 천도 — ' +
    '약 30,000명의 작은 마을이 21세기 약 700만 메트로 도시로 발전하는 출발점. ' +
    '결정적 이유는 ①이베리아 반도 정중앙의 지리적 위치 ②톨레도의 가톨릭 보수파 영향력 약화 ' +
    '③새 수도에서 본인의 절대왕정 행정 시스템 직접 구축. 마드리드 알카사르(현 왕궁 위치)에 ' +
    '〈서류함의 왕(rey de papel)〉이라는 별칭의 책상 행정 — 매일 평균 50통 이상의 문서를 직접 결재. ' +
    '\n\n' +
    '【1568 돈 카를로스 비극】 1568-07-24 장남 돈 카를로스(23세, 마리아 마누엘라 소생)가 ' +
    '마드리드 알카사르의 감금실에서 사망 — 1568-01-18 펠리페 2세가 직접 아들을 감금한 후 약 6개월 만. ' +
    '동시기 공식 발표는 자연사였으나 ①정신 이상 ②네덜란드 반란군과 내통 시도 ③부친에 대한 살해 음모 ' +
    '등이 감금 사유로 거론됨. 21세기 학설은 정신 이상 + 거식증 + 자해를 복합 사인으로 평가. ' +
    '쉴러의 희곡 〈돈 카를로스(1787)〉·베르디의 오페라 〈돈 카를로스(1867)〉의 직접 소재. ' +
    '\n\n' +
    '【1568~ 80년 전쟁(네덜란드 독립 전쟁)】 1566 합스부르크령 네덜란드의 칼뱅파 성상 파괴 운동(Beeldenstorm)에 ' +
    '대응해 ①1567 알바 공작(Duke of Alba) 파견·〈피의 의회(Council of Troubles)〉로 약 1,000명 처형 ' +
    '②1568-05 빌렘 1세(William of Orange)의 봉기로 80년 전쟁 발발 ③1572 해상 거지(Watergeuzen)의 브릴(Brielle) 점령 ' +
    '④1576 안트베르펀 약탈(Spanish Fury) — 미지급 용병 약 7,000명의 시민 학살 ⑤1579 위트레흐트 동맹(Union of Utrecht — ' +
    '북부 7개 주) ⑥1581-07-26 단념 선언(Act of Abjuration) — 북부 7개 주가 펠리페 2세를 군주로 인정 거부. ' +
    '약 80년 전쟁(1568~1648)의 시작. 펠리페 2세 사후 약 50년이 더 지난 1648 베스트팔렌 조약으로 ' +
    '네덜란드 공화국 독립 정식 인정. ' +
    '\n\n' +
    '【1570 안나 폰 외스터라이히와 결혼】 1570-05-04 사촌이자 조카(친누이의 딸) 안나 폰 외스터라이히 ' +
    '(Anna of Austria, 1549~1580 — 친동생 막시밀리안 2세 황제의 딸)와 결혼 — 합스부르크 근친혼의 전형 사례. ' +
    '5명의 자녀 중 후계자 펠리페 3세(1578~1621)만 생존. 1580-10-26 안나가 출산 합병증·인플루엔자로 사망(31세). ' +
    '\n\n' +
    '【1571 레판토 해전】 1571-10-07 신성동맹(Holy League — 스페인·교황·베네치아) 함대가 ' +
    '오스만 제국 함대를 그리스 레판토 해상에서 격파 — 약 200척의 갤리선 vs 약 250척, 사상자 약 5만 명. ' +
    '지휘는 펠리페 2세의 이복동생 돈 후안 데 아우스트리아(Don Juan de Austria, 1547~1578 — ' +
    '카를 5세의 사생아). 약 600년에 걸친 오스만 제국의 지중해 패권에 결정적 일격, ' +
    '근대 유럽 가톨릭 세력의 자신감 회복의 상징. ' +
    '\n\n' +
    '【1580 이베리아 연합】 1580-08-25 알칸타라 전투(Battle of Alcântara)에서 알바 공작이 ' +
    '포르투갈 왕위 계승자 안토니우(António, prior do Crato)를 격파, 펠리페 2세가 ' +
    '포르투갈·아조레스·브라질·앙골라·인도 고아·말라카·마카오 등 포르투갈 식민제국 전체를 합병 — ' +
    '〈이베리아 연합(União Ibérica, 1580~1640)〉. 펠리페 2세는 포르투갈 펠리페 1세(Filipe I)로 즉위, ' +
    '동군연합 형태로 포르투갈 의회·법·통화는 별도 유지. 약 60년간 지속, 1640 포르투갈 왕정복고 전쟁으로 분리. ' +
    '\n\n' +
    '【1584 엘 에스코리알 완공】 1563-04-23 산 로렌소 데 엘 에스코리알(El Escorial) 수도원 건축 시작, ' +
    '1584-09-13 완공 — 21년 공사. 펠리페 2세 본인 + 부친 카를 5세를 위한 능묘 + 왕립 도서관 + 가톨릭 수도원 ' +
    '복합 시설. 16세기 르네상스 건축의 정점, 약 4,000개의 방·14만 권의 도서관·합스부르크 왕가 능묘 〈왕들의 판테온〉 보유. ' +
    '21세기 현재 유네스코 세계문화유산. ' +
    '\n\n' +
    '【1588 무적함대 패배】 1588-08-08 그라블린 해전(Battle of Gravelines)에서 ' +
    '〈무적함대(Spanish Armada)〉 약 130척이 잉글랜드 해군에 패배. 잉글랜드 침공 + 가톨릭 복귀 + ' +
    '메리 스튜어트(처형 1587) 복수가 목적이었으나 결정적 패전 — 약 60척 침몰·약 15,000명 사망. ' +
    '잉글랜드 해상 패권의 출발 + 스페인 해상 우위의 점진적 종말. 단 즉시 스페인이 몰락한 것은 아니며 ' +
    '약 40년 더 유럽 최강국 지위 유지. ' +
    '\n\n' +
    '【4번의 국가 부도(1557·1560·1575·1596)】 신대륙 은 유입에도 불구하고 ' +
    '①80년 전쟁 ②지중해 함대 유지 ③잉글랜드 침공 ④이탈리아 패권 유지 등의 군사 비용으로 ' +
    '재위 중 4번 국가 채무 불이행 선언. 푸거(Fugger)·벨저(Welser)·제노바 은행가 가문에 ' +
    '약 1억 두카토 누적 부채 — 부친 카를 5세부터 이어진 합스부르크 만성 재정난의 정점. ' +
    '\n\n' +
    '【장기 유산】 ①스페인 합스부르크 약 144년(1556~1700) 기반 구축 ②네덜란드 독립 전쟁(1568~1648)의 ' +
    '직접 도화선 ③이베리아 연합(1580~1640)으로 일시적이지만 사상 최대 식민제국 형성 ' +
    '④마드리드 천도(1561) — 현대 스페인 수도의 출발 ⑤엘 에스코리알(1584) — 스페인 가톨릭 절대왕정의 건축적 상징 ' +
    '⑥레판토 해전(1571) + 무적함대(1588) — 가톨릭/개신교 세력 균형 변화의 결정적 두 사건의 주역.',
  influence: 92,
} as const

// ── 어머니 이사벨 데 포르투갈 본문 ─────────────────────────────────────────
const ISABEL_OF_PORTUGAL = {
  name: '이사벨',
  surname: '아비스',
  originalName: 'Isabella of Portugal (Empress)',
  regnalName: undefined,
  birthYear: 1503,
  birthMonth: 10,
  birthDay: 24,
  deathYear: 1539,
  deathMonth: 5,
  deathDay: 1,
  birthPlaceText: '포르투갈 왕국 리스본 — 알카사바 궁(Castelo de São Jorge)',
  deathPlaceText: '카스티야 왕국 톨레도(Toledo) — 알카사르 왕궁',
  deathType: DeathType.ILLNESS,
  deathCause: '7번째 임신 합병증(사산) + 산욕열 + 출혈 (한국식 표기 — childbed fever)',
  deathNote:
    '1539-04 7번째 임신(약 7개월) 도중 사산이 시작되어 약 2주간 출혈·발열로 시달림. ' +
    '1539-05-01 톨레도 알카사르에서 35세에 사망. 카를 5세는 마드리드에서 부재 중이었으며 ' +
    '소식을 듣고 약 2주간 식음 전폐 후 라 시살라(La Sisla) 산 헤로니모 수도원에 약 7주간 칩거. ' +
    '12세의 펠리페(후일 펠리페 2세)는 어머니 시신을 그라나다 왕립 예배당까지 운구하는 ' +
    '약 23일 600km 행렬에 동행 — 평생의 트라우마이자 펠리페 2세의 우울한 성격 형성에 영향. ' +
    '\n\n' +
    '【매장】 그라나다 왕립 예배당(Capilla Real de Granada)에 시조부모 가톨릭 양왕 ' +
    '(이사벨 1세·페르난도 2세) 옆에 안치. 1574 카를 5세 + 이사벨이 함께 엘 에스코리알 ' +
    '〈왕들의 판테온〉으로 이장(아들 펠리페 2세의 결정). 21세기 현재까지 보존. ' +
    '\n\n' +
    '【사후 영향】 ①티치아노(Titian)가 이사벨 사후 1545년경 〈이사벨 황후의 초상화〉를 회화 ' +
    '— 21세기 현재 마드리드 프라도 미술관 소장. 이 그림은 펠리페 2세가 평생 침실에 두었던 ' +
    '어머니의 유일한 모습 ②카를 5세는 1556 양위·은퇴 후에도 재혼하지 않고 미망인으로 사망(이사벨에 대한 추모) ' +
    '③펠리페 2세의 4번 결혼 중 첫 번째 부인 마리아 마누엘라가 어머니 이사벨의 조카로 — ' +
    '아비스 왕가와의 인연을 펠리페 2세 본인이 강하게 유지.',
  biography:
    '아비스 가문 — 포르투갈 왕국 마누엘 1세(Manuel I, 1469~1521)와 두 번째 부인 ' +
    '마리아 데 카스티야(Maria of Aragon, 1482~1517 — 가톨릭 양왕 이사벨 1세·페르난도 2세의 셋째 딸)의 장녀. ' +
    '가톨릭 양왕의 외손녀이자 카를 5세의 사촌 누이. ' +
    '\n\n' +
    '【1526 카를 5세와 결혼】 1526-03-10 세비야 알카사르에서 신성로마황제 카를 5세와 결혼. ' +
    '카를 5세 26세·이사벨 22세. 정략 결혼이었으나 동시기 기록에 의하면 양측이 서로에게 깊이 ' +
    '빠진 행복한 결혼 — 카를 5세가 평생 단일 결혼으로 끝낸 직접적 이유. ' +
    '결혼 지참금은 약 90만 두카토 — 카를 5세의 황제 선거 자금(푸거 가문 차입)을 일부 상환. ' +
    '\n\n' +
    '【카스티야 섭정(1528~1539)】 카를 5세가 신성로마·이탈리아·네덜란드 통치로 자주 부재한 ' +
    '약 11년간 카스티야 섭정으로 사실상 단독 통치. 코르테스(의회) 운영·세금·법령 발포 등을 ' +
    '직접 결정 — 동시기 평가에서 〈여자 군주가 아닌 황후〉의 모범으로 칭송. ' +
    '아들 펠리페 2세에게 절대왕정 행정 시스템의 직접적 모범 제공. ' +
    '\n\n' +
    '【6명의 자녀】 ①페르난도(1529, 사산) ②펠리페(후일 펠리페 2세, 1527-05-21~1598) ' +
    '③마리아(Maria, 1528~1603 — 후일 신성로마황후) ④후아나(Joanna, 1535~1573 — 포르투갈 왕배) ' +
    '⑤사산아(1534) ⑥사산아(1539-04 — 본인 사망 직전). 6명 중 성인까지 생존한 자녀는 3명. ' +
    '\n\n' +
    '【1539 사망】 1539-04 7번째 임신 도중 사산이 시작, 약 2주간 출혈·발열로 35세에 사망. ' +
    '카를 5세는 평생 재혼하지 않고 미망인으로 1558 사망. ' +
    '\n\n' +
    '【장기 유산】 ①펠리페 2세의 어머니로서 후일 합스부르크 스페인 절대왕정의 행정 모델 직접 영향 ' +
    '②티치아노 작 〈이사벨 황후의 초상화(1545년경)〉 — 16세기 여성 초상화의 걸작 ' +
    '③1526 결혼이 카를 5세-아비스 왕가 동맹의 시작 → 1580 펠리페 2세의 포르투갈 왕위 계승의 ' +
    '혈통적 근거(이사벨이 마누엘 1세의 장녀이므로 펠리페 2세는 모계로 포르투갈 왕위 계승권 보유).',
  influence: 60,
  stats: {
    politics: 70,
    military: 30,
    diplomacy: 65,
    intellect: 70,
    charisma: 70,
    administration: 75,
    notes:
      '카를 5세 부재 시 약 11년간 카스티야 섭정으로 사실상 단독 통치 — 행정 능력은 동시기 ' +
      '여성 군주 중 최상위. 코르테스 운영·세금·법령 발포 등 직접 결정. ' +
      '아들 펠리페 2세에게 절대왕정 행정 시스템의 직접 모범 제공. ' +
      '군사는 직접 지휘 경험 없으므로 평가 보류. 카리스마는 동시기 기록에서 ' +
      '"엄격하면서도 자비로운" 황후로 칭송. 35세 요절로 잠재력의 일부만 발휘.',
  },
} as const

// ── 아비스 가문 명세 ───────────────────────────────────────────────────────
const AVIZ_DYNASTY = {
  name: '아비스 가문',
  description:
    '1385년 알주바로타 전투(Battle of Aljubarrota)에서 카스티야군을 격파한 ' +
    '주앙 1세(João I — 페드루 1세의 사생아·아비스 기사단 단장)가 포르투갈 왕위에 즉위하면서 ' +
    '시작된 포르투갈 왕가. 부르고뉴 왕가(1139~1383)의 사실상 종결 후 새 왕조로 출범. ' +
    '15세기 〈대항해 시대〉의 직접 후원 가문 — ①엔히크 항해왕자(Infante Henrique, 1394~1460)의 ' +
    '항해 학교 ②바스쿠 다 가마의 인도 항로 개척(1497~1499) ③페드루 알바르스 카브랄의 브라질 발견(1500) ' +
    '④아폰수 데 알부케르키의 인도 고아·말라카·호르무즈 점령(1510~1515) — 약 200년에 걸친 ' +
    '포르투갈 식민제국의 전성기를 직접 주도. 1580년 세바스티앙 1세가 모로코 알카세르 키비르 전투 ' +
    '(Battle of Alcácer Quibir)에서 24세 전사 후 후계자 부재 — 후임 엔히크 1세 추기경마저 ' +
    '1580 사망으로 아비스 직계 단절, 카를 5세의 외손자 펠리페 2세가 왕위 계승해 ' +
    '〈이베리아 연합(1580~1640)〉 시대 진입. 약 195년간(1385~1580) 포르투갈 왕가로 군림.',
  startYear: 1385, // 주앙 1세 즉위
  endYear: 1580, // 엔히크 1세 사망 — 직계 단절
} as const

// ── 포르투갈 왕국 HC 명세 ─────────────────────────────────────────────────
const PORTUGAL_HC_SPEC = {
  name: '포르투갈 왕국',
  enName: 'Kingdom of Portugal',
  description:
    '1139년 7월 25일 오리키 전투(Battle of Ourique)에서 무어인을 격파한 아폰수 1세(Afonso I)가 ' +
    '포르투갈 왕으로 즉위하면서 사실상 성립한 이베리아 반도 서부의 가톨릭 왕국. ' +
    '1143년 카스티야 알폰소 7세의 정식 왕국 인정·1179년 교황 알렉산데르 3세의 〈마니페스티스 프로바툼〉 ' +
    '교서로 국제적 승인 완료. 부르고뉴 왕가(1139~1383)·아비스 가문(1385~1580)·합스부르크 가문 ' +
    '이베리아 연합(1580~1640)·브라간사 가문(1640~1910)의 4개 왕조를 거치며 약 770년간 존속. ' +
    '15~16세기 대항해 시대를 주도해 ①1488 바르톨로메우 디아스의 희망봉 도착 ②1497~1499 바스쿠 다 가마의 ' +
    '인도 항로 개척 ③1500 페드루 알바르스 카브랄의 브라질 발견 ④1510~1515 인도 고아·말라카·호르무즈 점령으로 ' +
    '동아프리카·인도양·동남아시아·브라질·일본 마카오까지 사상 최대 해상 식민제국 구축. ' +
    '1822 브라질 독립·1910-10-05 공화 혁명으로 마누엘 2세 폐위·왕국 정식 폐지.',
  startYear: 1139,
  endYear: 1910,
  stateType: HistoricalStateType.KINGDOM,
  latitude: 38.7223, // 리스본
  longitude: -9.1393,
} as const

export async function seedFelipeII(prisma: PrismaService): Promise<void> {
  console.log('\n👑 펠리페 2세(Philip II of Spain) 시딩 시작 (기존 데이터 보존 모드)...')

  // ── 사전 의존성 ────────────────────────────────────────────────────────
  const admin = await prisma.account.findUnique({
    where: { username: 'admin' },
  })
  if (!admin) {
    console.warn('  ⚠️  admin 계정이 없어 시딩을 건너뜀 (먼저 admin.seed 실행 필요)')
    return
  }

  const charlesV = await prisma.person.findFirst({
    where: { originalName: 'Charles V, Holy Roman Emperor' },
    select: { id: true },
  })
  if (!charlesV) {
    console.warn('  ⚠️  카를 5세 미존재 — 먼저 person.charles-v.seed 실행 필요')
    return
  }

  const habsburgDynasty = await prisma.dynasty.findFirst({
    where: { name: '합스부르크 가문' },
    select: { id: true },
  })
  if (!habsburgDynasty) {
    console.warn('  ⚠️  합스부르크 가문 미존재 — 먼저 person.charles-v.seed 실행 필요')
    return
  }

  const castileHC = await prisma.historicalCountry.findFirst({
    where: { name: '카스티야 왕국' },
    select: { id: true },
  })
  if (!castileHC) {
    console.warn('  ⚠️  카스티야 왕국 HC 미존재 — 먼저 person.charles-v-parents.seed 실행 필요')
    return
  }

  const habsburgNetherlandsHC = await prisma.historicalCountry.findFirst({
    where: { name: '합스부르크령 네덜란드' },
    select: { id: true },
  })
  if (!habsburgNetherlandsHC) {
    console.warn('  ⚠️  합스부르크령 네덜란드 HC 미존재 — 합스부르크령 네덜란드 재임 스킵')
  }

  // ── 0) 아비스 가문 등록 ─────────────────────────────────────────────────
  let avizDynasty = await prisma.dynasty.findFirst({
    where: { name: AVIZ_DYNASTY.name },
  })
  if (avizDynasty) {
    console.log(`  ⏭️  가문 이미 존재: ${AVIZ_DYNASTY.name}`)
  } else {
    avizDynasty = await prisma.dynasty.create({
      data: {
        name: AVIZ_DYNASTY.name,
        description: AVIZ_DYNASTY.description,
        startDate: new Date(AVIZ_DYNASTY.startYear, 0, 1),
        endDate: new Date(AVIZ_DYNASTY.endYear, 11, 31),
      },
    })
    console.log(`  ✅ 가문 생성: ${AVIZ_DYNASTY.name} (id=${avizDynasty.id})`)
  }

  // ── 1) 포르투갈 왕국 HC 인라인 생성 ─────────────────────────────────────
  let portugalHC = await prisma.historicalCountry.findFirst({
    where: { name: PORTUGAL_HC_SPEC.name },
    select: { id: true },
  })
  if (portugalHC) {
    console.log(`  ⏭️  역사 국가 이미 존재: ${PORTUGAL_HC_SPEC.name}`)
  } else {
    const created = await prisma.historicalCountry.create({
      data: {
        name: PORTUGAL_HC_SPEC.name,
        enName: PORTUGAL_HC_SPEC.enName,
        description: PORTUGAL_HC_SPEC.description,
        startEra: 'AD' as any,
        startYear: PORTUGAL_HC_SPEC.startYear,
        endEra: 'AD' as any,
        endYear: PORTUGAL_HC_SPEC.endYear,
        stateType: PORTUGAL_HC_SPEC.stateType,
        entityKind: HistoricalEntityKind.STATE,
        latitude: PORTUGAL_HC_SPEC.latitude,
        longitude: PORTUGAL_HC_SPEC.longitude,
        accountId: admin.id,
      },
    })
    portugalHC = { id: created.id }
    console.log(`  ✅ 역사 국가 생성: ${PORTUGAL_HC_SPEC.name} (id=${created.id})`)
  }

  // ── 2) DynastyRule 등록 ──────────────────────────────────────────────────
  type DynastyRuleSpec = {
    dynastyId: string
    dynastyName: string
    historicalCountryId: string
    countryName: string
    startYear: number
    endYear?: number
  }

  const DYNASTY_RULES: DynastyRuleSpec[] = [
    // ① 합스부르크 → 카스티야 왕국 (1516 카를로스 1세 즉위 ~ 1700 카를로스 2세 사망)
    {
      dynastyId: habsburgDynasty.id,
      dynastyName: '합스부르크 가문',
      historicalCountryId: castileHC.id,
      countryName: '카스티야 왕국',
      startYear: 1516, // 카를로스 1세 (= 카를 5세) 즉위
      endYear: 1700, // 카를로스 2세 사망 — 합스부르크 스페인 종결
    },
    // ② 아비스 가문 → 포르투갈 왕국
    {
      dynastyId: avizDynasty.id,
      dynastyName: '아비스 가문',
      historicalCountryId: portugalHC.id,
      countryName: '포르투갈 왕국',
      startYear: AVIZ_DYNASTY.startYear,
      endYear: AVIZ_DYNASTY.endYear,
    },
    // ③ 합스부르크 → 포르투갈 왕국 (1580 펠리페 1세 즉위 ~ 1640 포르투갈 왕정복고 전쟁)
    {
      dynastyId: habsburgDynasty.id,
      dynastyName: '합스부르크 가문',
      historicalCountryId: portugalHC.id,
      countryName: '포르투갈 왕국',
      startYear: 1580,
      endYear: 1640,
    },
  ]

  for (const rule of DYNASTY_RULES) {
    const exists = await prisma.dynastyRule.findFirst({
      where: { dynastyId: rule.dynastyId, historicalCountryId: rule.historicalCountryId },
    })
    if (exists) {
      console.log(`  ⏭️  가문 통치 스킵: ${rule.dynastyName} → ${rule.countryName}`)
      continue
    }
    await prisma.dynastyRule.create({
      data: {
        dynastyId: rule.dynastyId,
        historicalCountryId: rule.historicalCountryId,
        startEra: 'AD' as any,
        startYear: rule.startYear,
        endEra: 'AD' as any,
        endYear: rule.endYear,
      },
    })
    console.log(
      `  ✅ 가문 통치: ${rule.dynastyName} → ${rule.countryName} (${rule.startYear}-${rule.endYear ?? '현재'})`,
    )
  }

  // ── 3) 어머니 이사벨 데 포르투갈 등록 ───────────────────────────────────
  const existingIsabel = await prisma.person.findFirst({
    where: { originalName: ISABEL_OF_PORTUGAL.originalName },
  })

  let isabelId: string
  if (existingIsabel) {
    isabelId = existingIsabel.id
    console.log(`  ⏭️  인물 이미 존재 — 스킵: ${ISABEL_OF_PORTUGAL.originalName} (id=${isabelId})`)
    const patch: any = {}
    if (!existingIsabel.dynastyId) patch.dynastyId = avizDynasty.id
    if (!existingIsabel.deathType) patch.deathType = ISABEL_OF_PORTUGAL.deathType
    if (!existingIsabel.deathCause) patch.deathCause = ISABEL_OF_PORTUGAL.deathCause
    if (!existingIsabel.deathNote) patch.deathNote = ISABEL_OF_PORTUGAL.deathNote
    if (!existingIsabel.biography) patch.biography = ISABEL_OF_PORTUGAL.biography
    if (!existingIsabel.birthPlaceText) patch.birthPlaceText = ISABEL_OF_PORTUGAL.birthPlaceText
    if (!existingIsabel.deathPlaceText) patch.deathPlaceText = ISABEL_OF_PORTUGAL.deathPlaceText
    if (existingIsabel.influence == null) patch.influence = ISABEL_OF_PORTUGAL.influence
    if (Object.keys(patch).length > 0) {
      await prisma.person.update({ where: { id: isabelId }, data: patch })
      console.log(`    🔧 필드 보강: ${Object.keys(patch).join(', ')}`)
    }
  } else {
    const created = await prisma.person.create({
      data: {
        name: ISABEL_OF_PORTUGAL.name,
        surname: ISABEL_OF_PORTUGAL.surname,
        originalName: ISABEL_OF_PORTUGAL.originalName,
        biography: ISABEL_OF_PORTUGAL.biography,
        birthDate: new Date(
          ISABEL_OF_PORTUGAL.birthYear,
          ISABEL_OF_PORTUGAL.birthMonth - 1,
          ISABEL_OF_PORTUGAL.birthDay,
        ),
        birthEra: 'AD' as any,
        deathDate: new Date(
          ISABEL_OF_PORTUGAL.deathYear,
          ISABEL_OF_PORTUGAL.deathMonth - 1,
          ISABEL_OF_PORTUGAL.deathDay,
        ),
        deathEra: 'AD' as any,
        gender: 'FEMALE',
        nameDisplayOrder: 'western' as any,
        dynastyId: avizDynasty.id,
        birthPlaceText: ISABEL_OF_PORTUGAL.birthPlaceText,
        deathPlaceText: ISABEL_OF_PORTUGAL.deathPlaceText,
        deathType: ISABEL_OF_PORTUGAL.deathType,
        deathCause: ISABEL_OF_PORTUGAL.deathCause,
        deathNote: ISABEL_OF_PORTUGAL.deathNote,
        influence: ISABEL_OF_PORTUGAL.influence,
        accountId: admin.id,
      },
    })
    isabelId = created.id
    console.log(`  ✅ 인물 생성: ${ISABEL_OF_PORTUGAL.originalName} (id=${isabelId})`)
  }

  // 이사벨 PersonStats
  const isabelStatsExists = await prisma.personStats.findFirst({
    where: { personId: isabelId, accountId: admin.id },
  })
  if (isabelStatsExists) {
    console.log(`    ⏭️  이사벨 능력치 스킵 (이미 존재)`)
  } else {
    await prisma.personStats.create({
      data: {
        personId: isabelId,
        accountId: admin.id,
        politics: ISABEL_OF_PORTUGAL.stats.politics,
        military: ISABEL_OF_PORTUGAL.stats.military,
        diplomacy: ISABEL_OF_PORTUGAL.stats.diplomacy,
        intellect: ISABEL_OF_PORTUGAL.stats.intellect,
        charisma: ISABEL_OF_PORTUGAL.stats.charisma,
        administration: ISABEL_OF_PORTUGAL.stats.administration,
        notes: ISABEL_OF_PORTUGAL.stats.notes,
      },
    })
    console.log(
      `    ✅ 이사벨 능력치: 정치 ${ISABEL_OF_PORTUGAL.stats.politics}·군사 ${ISABEL_OF_PORTUGAL.stats.military}·` +
        `외교 ${ISABEL_OF_PORTUGAL.stats.diplomacy}·학식 ${ISABEL_OF_PORTUGAL.stats.intellect}·` +
        `카리스마 ${ISABEL_OF_PORTUGAL.stats.charisma}·행정 ${ISABEL_OF_PORTUGAL.stats.administration}`,
    )
  }

  // ── 4) 펠리페 2세 인물 등록 ─────────────────────────────────────────────
  const existingFelipe = await prisma.person.findFirst({
    where: { originalName: FELIPE_II.originalName },
  })

  let felipeId: string
  if (existingFelipe) {
    felipeId = existingFelipe.id
    console.log(`  ⏭️  인물 이미 존재 — 스킵: ${FELIPE_II.originalName} (id=${felipeId})`)
    const patch: any = {}
    if (!existingFelipe.dynastyId) patch.dynastyId = habsburgDynasty.id
    if (!existingFelipe.fatherId) patch.fatherId = charlesV.id
    if (!existingFelipe.motherId) patch.motherId = isabelId
    if (!existingFelipe.deathType) patch.deathType = FELIPE_II.deathType
    if (!existingFelipe.deathCause) patch.deathCause = FELIPE_II.deathCause
    if (!existingFelipe.deathNote) patch.deathNote = FELIPE_II.deathNote
    if (!existingFelipe.biography) patch.biography = FELIPE_II.biography
    if (!existingFelipe.birthPlaceText) patch.birthPlaceText = FELIPE_II.birthPlaceText
    if (!existingFelipe.deathPlaceText) patch.deathPlaceText = FELIPE_II.deathPlaceText
    if (existingFelipe.influence == null) patch.influence = FELIPE_II.influence
    if (Object.keys(patch).length > 0) {
      await prisma.person.update({ where: { id: felipeId }, data: patch })
      console.log(`    🔧 필드 보강: ${Object.keys(patch).join(', ')}`)
    }
  } else {
    const created = await prisma.person.create({
      data: {
        name: FELIPE_II.name,
        surname: FELIPE_II.surname,
        originalName: FELIPE_II.originalName,
        regnalName: FELIPE_II.regnalName,
        biography: FELIPE_II.biography,
        birthDate: new Date(FELIPE_II.birthYear, FELIPE_II.birthMonth - 1, FELIPE_II.birthDay),
        birthEra: 'AD' as any,
        deathDate: new Date(FELIPE_II.deathYear, FELIPE_II.deathMonth - 1, FELIPE_II.deathDay),
        deathEra: 'AD' as any,
        gender: 'MALE',
        nameDisplayOrder: 'western' as any,
        dynastyId: habsburgDynasty.id,
        fatherId: charlesV.id,
        motherId: isabelId,
        birthPlaceText: FELIPE_II.birthPlaceText,
        deathPlaceText: FELIPE_II.deathPlaceText,
        deathType: FELIPE_II.deathType,
        deathCause: FELIPE_II.deathCause,
        deathNote: FELIPE_II.deathNote,
        influence: FELIPE_II.influence,
        accountId: admin.id,
      },
    })
    felipeId = created.id
    console.log(`  ✅ 인물 생성: ${FELIPE_II.originalName} (id=${felipeId})`)
    console.log(`    🔗 부자: 카를 5세 → 펠리페 2세`)
    console.log(`    🔗 모자: 이사벨 데 포르투갈 → 펠리페 2세`)
  }

  // ── 5) SovereignReign 등록 — 펠리페 2세 3대 재임 ─────────────────────────
  const kingPos = await prisma.governmentPositionDefinition.findFirst({
    where: { title: '국왕' },
    select: { id: true },
  })
  const dukePos = await prisma.governmentPositionDefinition.findFirst({
    where: { title: '공작' },
    select: { id: true },
  })

  type ReignSpec = {
    historicalCountryId: string
    historicalCountryName: string
    positionDefinitionId: string
    positionTitle: string
    regnalNumber: number
    regnalName: string
    startDate: Date
    endDate: Date
    appointmentMethod: AppointmentMethod
    endReason: TenureEndReason
    endReasonDetail?: string
    notes?: string
  }

  const REIGNS: ReignSpec[] = []

  // ① 카스티야 왕국 16대 펠리페 2세
  // (HC start=1230, ... 13대 후아나 1세 → 14대 펠리페 1세 → 15대 카를로스 1세 → 16대 펠리페 2세)
  if (kingPos) {
    REIGNS.push({
      historicalCountryId: castileHC.id,
      historicalCountryName: '카스티야 왕국',
      positionDefinitionId: kingPos.id,
      positionTitle: '국왕',
      regnalNumber: 16,
      regnalName: '펠리페 2세',
      startDate: new Date(1556, 0, 16), // 1556-01-16 부친 카를 5세 양위
      endDate: new Date(1598, 8, 13), // 1598-09-13 사망
      appointmentMethod: AppointmentMethod.HEREDITARY,
      endReason: TenureEndReason.DEATH_IN_OFFICE,
      endReasonDetail: '1598-09-13 엘 에스코리알에서 71세 사망 (전립선암·통풍 합병증).',
      notes:
        '1556-01-16 부친 카를 5세 양위로 카스티야·아라곤·나폴리·시칠리아·사르데냐·이탈리아·신대륙 ' +
        '왕(스페인어 표기 펠리페 2세 — Felipe II)으로 즉위. 약 42년 8개월 재위. ' +
        '재위 중 ①1561 마드리드 천도 ②1571 레판토 해전 ③1580 이베리아 연합(포르투갈 합병) ' +
        '④1584 엘 에스코리알 완공 ⑤1588 무적함대 패배 ⑥4번의 국가 부도(1557·1560·1575·1596) 등 ' +
        '16세기 후반 유럽사의 거의 모든 결정적 사건의 중심. 〈서류함의 왕(rey de papel)〉이라는 별칭의 ' +
        '책상 행정 — 매일 평균 50통 이상의 문서를 직접 결재한 절대왕정 군주의 원형. ' +
        '1598-09-13 후계자 펠리페 3세(20세)에게 카스티야·아라곤·이탈리아·신대륙 모두 단순 상속.',
    })
  } else {
    console.warn('  ⚠️  관직 정의 \'국왕\' 미존재 — 카스티야 재임 스킵')
  }

  // ② 합스부르크령 네덜란드 3대 펠리페 2세
  // (HC start=1482, 1대 펠리페 1세 → 2대 카를 5세 → 3대 펠리페 2세)
  if (habsburgNetherlandsHC && dukePos) {
    REIGNS.push({
      historicalCountryId: habsburgNetherlandsHC.id,
      historicalCountryName: '합스부르크령 네덜란드',
      positionDefinitionId: dukePos.id,
      positionTitle: '공작',
      regnalNumber: 3,
      regnalName: '펠리페 2세',
      startDate: new Date(1555, 9, 25), // 1555-10-25 브뤼셀에서 부친 카를 5세 양위
      endDate: new Date(1581, 6, 26), // 1581-07-26 단념 선언(Act of Abjuration)
      appointmentMethod: AppointmentMethod.HEREDITARY,
      endReason: TenureEndReason.REMOVAL,
      endReasonDetail:
        '1581-07-26 헤이그에서 북부 7개 주(위트레흐트 동맹 — 홀란트·젤란트·위트레흐트·헬데를란트·' +
        '오버레이설·프리슬란트·흐로닝언)가 〈단념 선언(Act of Abjuration / Plakkaat van Verlatinghe)〉으로 ' +
        '펠리페 2세를 정식 군주로 인정 거부. 1648 베스트팔렌 조약으로 네덜란드 공화국 정식 독립.',
      notes:
        '1555-10-25 브뤼셀 회의장에서 부친 카를 5세가 직접 양위 — 합스부르크령 네덜란드 3대 군주로 즉위. ' +
        '재위 약 26년. 1559 본인이 스페인 귀국 후 이복 누이 마르가레타 데 파르마(Margaret of Parma)를 ' +
        '총독으로 임명. 1567 알바 공작 파견·〈피의 의회〉로 약 1,000명 처형 — 1568-05 빌렘 1세의 봉기로 ' +
        '80년 전쟁 발발. 1581-07-26 단념 선언으로 북부 7개 주에서 군주권 상실. ' +
        '단 남부(현 벨기에) 10개 주는 본인 사후까지 유지(1598 후계자 이사벨라 클라라 에우헤니아 + 알베르트 ' +
        '대공에게 〈스페인령 네덜란드〉로 양위). 약 80년 전쟁(1568~1648) 직접 도화선.',
    })
  } else {
    if (!habsburgNetherlandsHC) console.warn('  ⚠️  합스부르크령 네덜란드 HC 미존재 — 재임 스킵')
    if (!dukePos) console.warn('  ⚠️  관직 정의 \'공작\' 미존재 — 합스부르크령 네덜란드 재임 스킵')
  }

  // ③ 포르투갈 왕국 18대 펠리페 1세 (이베리아 연합 시작)
  // (HC start=1139 아폰수 1세부터 — 부르고뉴 왕가 12대[페르난두 1세] → 1383~1385 인테르레그눔 →
  //  아비스 13대 주앙 1세 → 14대 두아르트 1세 → 15대 아폰수 5세 → 16대 주앙 2세 → 17대 마누엘 1세 →
  //  18대 주앙 3세 → 19대 세바스티앙 1세 → 20대 엔히크 1세 → 21대 펠리페 1세[=펠리페 2세 of 스페인])
  // ※ 인테르레그눔(1383~1385)·반정통(안토니우)은 정식 군주로 카운트하지 않음.
  if (portugalHC && kingPos) {
    REIGNS.push({
      historicalCountryId: portugalHC.id,
      historicalCountryName: '포르투갈 왕국',
      positionDefinitionId: kingPos.id,
      positionTitle: '국왕',
      regnalNumber: 21,
      regnalName: '필리프 1세',
      startDate: new Date(1580, 8, 12), // 1580-09-12 토마르 코르테스(Cortes de Tomar)에서 정식 즉위
      endDate: new Date(1598, 8, 13), // 1598-09-13 사망
      appointmentMethod: AppointmentMethod.HEREDITARY, // 모계 — 어머니 이사벨이 마누엘 1세의 장녀
      endReason: TenureEndReason.DEATH_IN_OFFICE,
      endReasonDetail:
        '1598-09-13 엘 에스코리알에서 사망. 후계자 펠리페 3세(포르투갈 필리프 2세)에게 ' +
        '포르투갈 왕위 단순 상속 — 이베리아 연합(1580~1640) 약 60년 중 약 18년 재위.',
      notes:
        '1580-01-31 포르투갈 엔히크 1세 추기경 사망 후 후계자 부재 — 카를 5세-이사벨 데 포르투갈 부부의 ' +
        '아들 펠리페 2세가 모계 혈통으로 강력한 왕위 계승권 주장(어머니 이사벨이 마누엘 1세의 장녀). ' +
        '경쟁자 안토니우(António, prior do Crato — 마누엘 1세의 손자, 사생아 계열) 격파 위해 ' +
        '1580-08-25 알바 공작이 알칸타라 전투(Battle of Alcântara)에서 안토니우군 격파. ' +
        '1580-09-12 토마르 코르테스(Cortes de Tomar)에서 포르투갈 의회가 펠리페 1세(Filipe I)로 정식 인정. ' +
        '단 ①포르투갈 의회·법·통화·언어·식민지 행정 별도 유지 ②포르투갈인만 포르투갈 식민지 관직 임명 ' +
        '③브라질·인도·아프리카 식민제국 그대로 유지 등 〈동군연합(Personal Union)〉 형태 보장. ' +
        '약 60년 지속(1580~1640), 1640-12-01 브라간사 가문의 주앙 4세(João IV) 복위로 종결.',
    })
  } else {
    if (!portugalHC) console.warn('  ⚠️  포르투갈 왕국 HC 생성 실패 — 재임 스킵')
    if (!kingPos) console.warn('  ⚠️  관직 정의 \'국왕\' 미존재 — 포르투갈 재임 스킵')
  }

  for (const r of REIGNS) {
    const existingByPerson = await prisma.sovereignReign.findFirst({
      where: { personId: felipeId, historicalCountryId: r.historicalCountryId },
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
          `  🔧 재임 정정: ${r.historicalCountryName} ${r.regnalName} ${r.regnalNumber}대 ` +
            `(이전: ${existingByPerson.regnalNumber ?? 'null'}대 / ${existingByPerson.regnalName ?? 'null'})`,
        )
      } else {
        console.log(
          `  ⏭️  재임 스킵 (이미 정확): ${r.historicalCountryName} ${r.regnalName} ${r.regnalNumber}대`,
        )
      }
      continue
    }
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
    await prisma.sovereignReign.create({
      data: {
        personId: felipeId,
        historicalCountryId: r.historicalCountryId,
        positionDefinitionId: r.positionDefinitionId,
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
      `  ✅ 재임: ${r.historicalCountryName} ${r.regnalName} ${r.regnalNumber}대 (${fmt(r.startDate)} ~ ${fmt(r.endDate)})`,
    )
  }

  // ── 6) PersonCountryAffiliation (펠리페 2세 → 카스티야 왕국) ────────────
  const affExists = await prisma.personCountryAffiliation.findFirst({
    where: {
      personId: felipeId,
      historicalCountryId: castileHC.id,
      affiliationType: 'CITIZENSHIP' as any,
    },
  })
  if (affExists) {
    console.log(`  ⏭️  소속국가 스킵 (이미 존재): 펠리페 2세 → 카스티야 왕국`)
  } else {
    await prisma.personCountryAffiliation.create({
      data: {
        personId: felipeId,
        historicalCountryId: castileHC.id,
        affiliationType: 'CITIZENSHIP' as any,
        priority: 0,
      },
    })
    console.log(`  ✅ 소속국가: 펠리페 2세 → 카스티야 왕국 (출생지 + 1556~1598 군주)`)
  }

  // ── 7) PersonStats (펠리페 2세 6축 능력치 — admin 평가) ─────────────────
  const felipeStatsExists = await prisma.personStats.findFirst({
    where: { personId: felipeId, accountId: admin.id },
  })
  if (felipeStatsExists) {
    console.log(`  ⏭️  펠리페 2세 능력치 스킵 (이미 존재)`)
  } else {
    await prisma.personStats.create({
      data: {
        personId: felipeId,
        accountId: admin.id,
        politics: 92,
        military: 75,
        diplomacy: 82,
        intellect: 80,
        charisma: 60,
        administration: 95,
        notes:
          '〈서류함의 왕(rey de papel)〉의 별칭처럼 행정은 16세기 유럽 군주 중 최상위 — ' +
          '매일 평균 50통 이상의 문서 직접 결재, 절대왕정 관료제의 원형 구축. ' +
          '정치는 마드리드 천도(1561)·이베리아 연합(1580)·엘 에스코리알 건립(1584) 등 장기 비전 실현. ' +
          '외교는 카토-캄브레지(1559)·레판토(1571) 등 결정적 승리, 단 80년 전쟁·무적함대(1588)에서 한계 노출. ' +
          '군사는 직접 지휘 경험 거의 없음 — 알바 공작·돈 후안 등 부장에 의존. ' +
          '학식은 4개 언어 + 〈엘 에스코리알 도서관〉 14만 권 직접 큐레이션 — 인문 군주 측면. ' +
          '카리스마는 아버지 카를 5세 대비 약함 — 우울·무표정·내성적 성격(어머니 사망 트라우마 + 합스부르크 턱). ' +
          '4번의 국가 부도(1557·1560·1575·1596)는 재정 한계 — 그러나 이는 부친에게 물려받은 만성 부채 + ' +
          '동시기 모든 군사 활동 비용을 감안하면 절대적 무능으로 평가 어려움.',
      },
    })
    console.log(`  ✅ 펠리페 2세 능력치: 정치 92·군사 75·외교 82·학식 80·카리스마 60·행정 95`)
  }

  console.log(`✅ 펠리페 2세 시딩 완료\n`)
}
