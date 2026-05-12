/**
 * 미남공 필리프(펠리페 1세 / Philip I of Castile)의 부모 시드
 *
 *  - 아버지: 막시밀리안 1세 (Maximilian I of Habsburg, 1459~1519) — 신성로마황제 19대
 *  - 어머니: 부르고뉴 마리 (Mary of Burgundy, 1457~1482) — 부르고뉴 공국 5대 여공작
 *
 * 1477-08-19 두 사람의 결혼이 합스부르크 가문이 부르고뉴 영지(플랑드르·브라반트·홀란트 등)를 ' +
 * 상속받는 결정적 계기 → 1482 마리 사망 후 합스부르크령 네덜란드 HC 출발 → 카를 5세의
 * 4중 상속(합스부르크령 네덜란드·오스트리아·카스티야·아라곤)의 한 축. 16세기 합스부르크 유럽 패권의
 * 사실상 출발점.
 *
 * ⚠️ 기존 데이터 보존 모드 — Person/Reign이 이미 있으면 갱신하지 않고 스킵.
 *
 * 인라인 생성:
 *  - 부르고뉴 공국 (HistoricalCountry, 1363~1482, 발루아-부르고뉴 시대)
 *  - 발루아-부르고뉴 가문 (Dynasty)
 *
 * 등록 항목:
 *  - 부르고뉴 공국 (HistoricalCountry)
 *  - 발루아-부르고뉴 가문 (Dynasty)
 *  - DynastyRule x1 (발루아-부르고뉴 → 부르고뉴 공국, 1363~1482)
 *  - Person x2 (막시밀리안 1세·부르고뉴 마리)
 *  - PersonStats x2
 *  - PersonSpouse x2 (양방향 결혼, 1477-08-19 ~ 1482-03-27 사별)
 *  - PersonCountryAffiliation x2
 *      막시밀리안 → 신성로마제국 CITIZENSHIP
 *      마리 → 부르고뉴 공국 CITIZENSHIP
 *  - 부자/모자 관계 (막시밀리안·마리 → 미남공 필리프)
 *  - SovereignReign x2:
 *      (1) 막시밀리안 1세 — 신성로마제국 황제 19대 (1493-08-19 ~ 1519-01-12, DEATH_IN_OFFICE)
 *      (2) 부르고뉴 마리 — 부르고뉴 공국 공작 5대 (1477-01-05 ~ 1482-03-27, DEATH_IN_OFFICE)
 *
 * ⚠️ 의존: 카를 5세 시드(person.charles-v.seed) + 카를 5세 부모 시드(person.charles-v-parents.seed)가
 *    먼저 실행되어 합스부르크 가문 + 신성로마제국 HC + 미남공 필리프 Person이 존재해야 한다.
 */
import {
  AppointmentMethod,
  DeathType,
  HistoricalEntityKind,
  HistoricalStateType,
  TenureEndReason,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

// ── 발루아-부르고뉴 가문 명세 ──────────────────────────────────────────────
const VALOIS_BURGUNDY_DYNASTY = {
  name: '발루아-부르고뉴 가문',
  description:
    '1363년 프랑스 발루아 왕가의 차남 필리프 2세 르 아르디(Philippe II le Hardi — 담대공 필리프)가 ' +
    '부친 장 2세로부터 부르고뉴 공국을 분봉받으면서 시작된 발루아 왕가의 부르고뉴 분지. ' +
    '1369년 필리프의 플랑드르 마르가레타와의 결혼으로 플랑드르·아르투아 등 저지대 영지를 추가 상속, ' +
    '(1)필리프 2세(1363~1404, "담대공 필리프(Philip the Bold)") (2)장 1세(1404~1419, "공포공 장(John the Fearless)") ' +
    '(3)필리프 3세(1419~1467, "선량공 필리프(Philip the Good)") (4)샤를 1세(1467~1477, "담대공 샤를(Charles the Bold)") ' +
    '(5)마리 1세(1477~1482) — 5대 약 119년에 걸쳐 ' +
    '부르고뉴 공국·플랑드르·브라반트·홀란트·룩셈부르크 등을 통합한 "부르고뉴 국가(Burgundian State)"를 구축, ' +
    '15세기 후반 사실상 신성로마와 프랑스 사이의 "제3의 강대국" 위치 확립. ' +
    '1477-01-05 샤를 1세가 낭시 전투에서 24세 전사 후 직계 단절, 외동딸 마리가 1477-08-19 ' +
    '합스부르크 막시밀리안 1세와 결혼하면서 합스부르크 가문에 영지 상속 → 1482-03-27 마리 사망 후 ' +
    '"합스부르크령 네덜란드(1482~1581)"로 정식 이양. 약 119년의 발루아-부르고뉴 직계는 마리를 끝으로 종결.',
  startYear: 1363, // 필리프 2세 부르고뉴 공국 분봉
  endYear: 1482, // 마리 사망 — 직계 종결
} as const

// ── 부르고뉴 공국 HC 명세 ─────────────────────────────────────────────────
const BURGUNDY_HC_SPEC = {
  name: '부르고뉴 공국',
  enName: 'Duchy of Burgundy',
  description:
    '1032년 신성로마제국 봉토로 출발해 1363년 프랑스 발루아 왕가의 차남 필리프 2세 "담대공 필리프"가 ' +
    '부친 장 2세로부터 분봉받으면서 "발루아-부르고뉴 시대(1363~1482)" 진입. ' +
    '(1)디종 중심의 부르고뉴 공국 본토 (2)플랑드르·아르투아·브라반트·홀란트·룩셈부르크 등 저지대 영지 ' +
    '(3)니베르네·샤롤레 등 추가 영지를 통합한 "부르고뉴 국가(Burgundian State)"는 약 100년에 걸쳐 ' +
    '신성로마와 프랑스 사이의 "제3의 강대국"으로 부상. 15세기 미하일 판 데르 베이던·얀 판 에이크 등 ' +
    '플랑드르 화풍의 후원·"황금양털 기사단(Order of the Golden Fleece, 1430)" 창설로 부르고뉴 궁정 문화의 정점. ' +
    '1477-01-05 샤를 1세 전사·1482-03-27 마리 1세 사망 후 (1)본토(디종) → 1482-12-23 아라스 조약(Treaty of Arras)으로 프랑스 합병 ' +
    '(2)저지대 영지 → 합스부르크 가문에 상속 "합스부르크령 네덜란드"로 분리. 약 450년의 부르고뉴 공국이 ' +
    '발루아-부르고뉴 5대를 끝으로 정식 종결.',
  startYear: 1363,
  endYear: 1482,
  stateType: HistoricalStateType.PRINCIPALITY,
  latitude: 47.322, // 디종(Dijon)
  longitude: 5.0415,
} as const

// ── 막시밀리안 1세 본문 ────────────────────────────────────────────────────
const MAXIMILIAN_I = {
  name: '막시밀리안',
  surname: '합스부르크',
  originalName: 'Maximilian I, Holy Roman Emperor',
  regnalName: '1세',
  birthYear: 1459,
  birthMonth: 3,
  birthDay: 22,
  deathYear: 1519,
  deathMonth: 1,
  deathDay: 12,
  birthPlaceText: '신성로마제국 오스트리아 빈 노이슈타트(Wiener Neustadt) — 호프부르크 별궁',
  deathPlaceText: '신성로마제국 오스트리아 벨스(Wels) — 합스부르크 별궁',
  deathType: DeathType.ILLNESS,
  deathCause: '뇌졸중 + 통풍 합병증 + 말년 우울증 (한국식 표기)',
  deathNote:
    '1519-01-12 새벽 신성로마 오스트리아 벨스(Wels — 현 오스트리아 상부오스트리아주)에서 59세 사망. ' +
    '1518 가을부터 발열·통풍·우울증이 누적 — 본인이 약 4년간 수도원·궁정을 옮겨 다니며 자신의 죽음을 ' +
    '준비했고 실제로 임종 시 본인 손으로 작성한 "Geheimes Buch(비밀 책)"의 매장 의식 지침을 따라 ' +
    '시신을 채찍질·이빨 뽑기 등으로 인간 본질의 무상함을 표현하는 절차 진행(중세 후기 메멘토 모리 의식). ' +
    '\n\n' +
    '매장. 본인의 유언에 따라 시신 두 부분으로 분리 — (1)심장은 부인 부르고뉴 마리의 시신 옆 ' +
    '벨기에 브뤼주(Brugge) "성모성당(Onze-Lieve-Vrouwekerk)"에 안치 (2)몸은 자신이 평생 사랑한 도시 ' +
    '빈 노이슈타트(Wiener Neustadt)의 "성 게오르크 성당(St. Georgskathedrale)" 제단 아래에 안치. ' +
    '21세기 현재 두 곳 모두 보존. ' +
    '\n\n' +
    '사후 영향. (1)손자 카를 5세가 1519-06-28 신성로마황제 선출 — 푸거 가문 차입 약 200만 두카토로 ' +
    '7 선제후 매수 (2)합스부르크 가문이 신성로마·합스부르크령 네덜란드·오스트리아·카스티야·아라곤·신대륙 ' +
    '4중 상속 군주 카를 5세를 통해 사상 최대 영토 군주 보유 — 막시밀리안의 외교·결혼 정책의 정점.',
  biography:
    '합스부르크 가문 — 신성로마제국 황제 19대(재위 1493~1519). 신성로마황제 프리드리히 3세 ' +
    '(Friedrich III, 18대 — 합스부르크 가문 첫 결정적 황제, 재위 1452~1493)와 포르투갈 엘레오노라 ' +
    '(Eleanor of Portugal, 1434~1467 — 아비스 가문)의 외아들. ' +
    '\n\n' +
    '1459 출생과 양육. 1459-03-22 빈 노이슈타트(Wiener Neustadt) 출생. 부친 프리드리히 3세는 ' +
    '"AEIOU(Austriae Est Imperare Orbi Universo — 오스트리아는 세계를 다스릴 운명)"라는 모토로 ' +
    '합스부르크 가문의 세계 지배 비전을 막시밀리안에게 양육. 어머니 엘레오노라는 1467 막시밀리안 8세에 ' +
    '아라곤 페르난도 2세 누이와 혼동되는 산욕열로 사망 — 막시밀리안에게 평생 트라우마. ' +
    '\n\n' +
    '1477-08-19 부르고뉴 마리와 결혼 — 합스부르크 결혼 정책의 출발. ' +
    '1477-01-05 부르고뉴 공국 샤를 1세(담대공 샤를)가 낭시 전투에서 24세 전사. 외동딸 마리(20세)가 ' +
    '약 250만 km² 부르고뉴 영지를 상속. 프랑스 루이 11세가 디종을 즉시 합병하고 마리에게 자기 아들 ' +
    '샤를(8세, 후일 샤를 8세)과의 결혼을 강요. 마리가 부친 신하·궁정 의회의 권유로 18세 막시밀리안과 ' +
    '비밀 결혼 결정 — 1477-04-21 약혼 → 1477-08-19 헨트(Ghent)에서 정식 결혼. 결혼식 비용은 ' +
    '플랑드르 도시들이 부담. 결혼으로 막시밀리안이 jure uxoris 부르고뉴 영지의 공동 군주(1477~1482), ' +
    '1482 마리 사망 후 어린 아들 펠리페 1세(4세)의 섭정으로 1493까지 약 11년 단독 통치. ' +
    '\n\n' +
    '1486 King of the Romans 선출 + 1493 황제 즉위. ' +
    '1486-02-16 프랑크푸르트에서 7 선제후가 막시밀리안을 King of the Romans 선출 — 부친 프리드리히 3세의 ' +
    '계승자 사전 지명. 1486-04-09 아헨 대성당에서 King of the Romans 대관식. ' +
    '1493-08-19 부친 프리드리히 3세 사망으로 신성로마황제 사실상 즉위 — 단 교황 대관 없이. ' +
    '1508-02-04 교황 율리오 2세가 "선출 황제(Erwählter Römischer Kaiser)" 칭호 사용 인가 — ' +
    '교황 대관 없이 황제 칭호를 사용한 첫 황제. 후일 모든 신성로마황제가 이 모델 채용. ' +
    '\n\n' +
    '합스부르크 결혼 정책 — "Bella gerant alii, tu felix Austria nube". ' +
    '"전쟁은 다른 자들이 하라, 너 행복한 오스트리아여, 결혼하라(Bella gerant alii, tu felix Austria nube)" ' +
    '라는 합스부르크 격언이 막시밀리안의 외교 전략을 압축. (1)본인 — 1477 부르고뉴 마리(저지대 영지) ' +
    '(2)아들 펠리페 1세 — 1496 카스티야 후아나 1세(스페인·신대륙) (3)손자 카를 5세 — 1526 포르투갈 이사벨 ' +
    '(4)손녀 마리아 — 1521 헝가리 라요시 2세(헝가리·보헤미아) — 4대에 걸친 결혼 외교로 합스부르크 가문 ' +
    '영토 폭증의 직접 설계자. ' +
    '\n\n' +
    '1494~1559 이탈리아 전쟁의 시작. ' +
    '1494 프랑스 샤를 8세의 이탈리아 침공으로 약 65년 이탈리아 전쟁 발발. 막시밀리안은 (1)1495 신성동맹 ' +
    '결성으로 프랑스 봉쇄 (2)1499 스위스 독립 전쟁 패배(슈바벤 전쟁 — 스바벤 동맹 격파) (3)1508 캄브레 ' +
    '동맹으로 베네치아 견제 등 약 25년 이탈리아 전쟁 직접 지휘. 단 결정적 승리 없이 외교적 균형 유지. ' +
    '\n\n' +
    '1495 보름스 의회 — "영원한 평화령(Ewiger Landfriede)". ' +
    '1495 보름스 의회에서 (1)"영원한 평화령"으로 신성로마제국 영방 간 사적 무력 분쟁 금지 ' +
    '(2)제국 의회(Reichstag) 정비 (3)Reichskammergericht(제국 최고법원) 설치 (4)제국 세금(공통 페니히) 도입 시도 ' +
    '— 신성로마제국의 "제국 개혁(Reichsreform)" 출발. ' +
    '\n\n' +
    '1499 스위스 독립. ' +
    '1499 슈바벤 전쟁(Schwabenkrieg)에서 막시밀리안의 슈바벤 동맹 군대가 스위스 동맹에 패배. ' +
    '바젤 조약(1499-09-22)으로 스위스가 신성로마제국으로부터 사실상 독립 — 1648 베스트팔렌 조약으로 ' +
    '정식 인정될 때까지 약 149년의 사실상 독립 시대 출발. ' +
    '\n\n' +
    '1494 비앙카 마리아 스포르차와 재혼. ' +
    '1494-03-16 밀라노 스포르차 가문의 비앙카 마리아 스포르차(Bianca Maria Sforza, 1472~1510)와 ' +
    '재혼. 결혼 지참금 약 40만 두카토로 막시밀리안의 만성 재정난을 일시 해소. 단 자녀 없음, ' +
    '막시밀리안은 비앙카에 거의 관심 없이 부르고뉴 마리에 대한 추모를 평생 유지. ' +
    '\n\n' +
    '르네상스 군주 — "최후의 기사(Der letzte Ritter)". ' +
    '(1)알브레히트 뒤러(Albrecht Dürer)의 후원자 — 1518 "막시밀리안 1세 초상화" 의뢰 (2)"Theuerdank(1517)" ' +
    '"Weisskunig" 등 자전적 서사시 의뢰 — 본인이 등장하는 르네상스 알레고리 (3)개인 갑옷 수집·기사 토너먼트 ' +
    '직접 참여 등으로 중세 기사도와 르네상스 학예의 중간 위치 — "최후의 기사(Der letzte Ritter)" 별칭. ' +
    '\n\n' +
    '장기 유산. (1)합스부르크 결혼 정책 → 카를 5세의 4중 상속 → 16세기 합스부르크 유럽 패권 ' +
    '(2)1495 "영원한 평화령"·Reichskammergericht로 신성로마제국 "제국 개혁"의 출발 (3)1508 "선출 황제" ' +
    '칭호 모델 — 후일 모든 신성로마황제가 채용 (4)손자 카를 5세를 신성로마·스페인 동시 군주로 만든 직접 설계자.',
  influence: 88,
  stats: {
    politics: 80,
    military: 70,
    diplomacy: 92,
    intellect: 78,
    charisma: 85,
    administration: 75,
    notes:
      '"합스부르크 결혼 정책"의 직접 설계자 — 외교는 동시기 유럽 군주 중 최상위. ' +
      '본인 1477 부르고뉴 결혼·아들 1496 카스티야 결혼·손녀 1521 헝가리 결혼 등 4대에 걸친 결혼 외교로 ' +
      '합스부르크 영토 폭증. 군사는 1499 슈바벤 전쟁 패배·1494~ 이탈리아 전쟁에서 결정적 승리 없음으로 ' +
      '평이. 정치는 1495 "영원한 평화령"·1508 "선출 황제" 칭호로 신성로마 제도 개혁의 출발. ' +
      '카리스마는 "최후의 기사" 별칭처럼 기사도·르네상스 후원·자전적 서사시(Theuerdank)로 동시기 ' +
      '결정적 인기. 행정은 부친 프리드리히 3세 대비 적극적이지만 만성 재정난(부르고뉴 영지 통치 비용·' +
      '이탈리아 전쟁 비용)이 한계.',
  },
} as const

// ── 부르고뉴 마리 본문 ────────────────────────────────────────────────────
const MARY_BURGUNDY = {
  name: '마리',
  surname: '발루아-부르고뉴',
  originalName: 'Mary of Burgundy',
  regnalName: '1세',
  birthYear: 1457,
  birthMonth: 2,
  birthDay: 13,
  deathYear: 1482,
  deathMonth: 3,
  deathDay: 27,
  birthPlaceText: '부르고뉴 공국 브뤼셀 — 쿠덴베르흐 궁(Coudenberg)',
  deathPlaceText: '부르고뉴 공국 브뤼주(Brugge) — 프린센호프(Prinsenhof) 궁',
  deathType: DeathType.ACCIDENT,
  deathCause: '낙마 사고 후 약 20일 골반 골절 합병증 사망 (한국식 표기)',
  deathNote:
    '1482-03 임신 8개월 상태에서 브뤼주 인근 매사냥(falconry) 중 말이 도랑을 뛰어넘다 마리가 낙마 — ' +
    '말이 그녀 위로 굴러 골반 직접 강타. 약 20일간 골반 골절·내부 출혈로 침대 누워있다 1482-03-27 ' +
    '브뤼주 프린센호프(Prinsenhof) 궁에서 25세 사망. 동시기 의사들은 통증 완화 외 ' +
    '근본 처치 시도 못함 — 골반 골절·내부 손상은 동시기 외과 의술의 한계 밖. 임신 중인 태아도 사망. ' +
    '\n\n' +
    '임종과 매장. 임종 시 옆에는 남편 막시밀리안·4세의 펠리페·2세의 마르가레타. ' +
    '시신은 부르고뉴 가문 전통에 따라 브뤼주 "성모성당(Onze-Lieve-Vrouwekerk)"의 제단 아래에 ' +
    '청동 묘상(tomb effigy) 위에 안치. 21세기 현재까지 보존 — 1519 사망한 남편 막시밀리안의 심장이 ' +
    '같은 묘 옆에 안치되어 사후 재결합. 묘상은 15세기 후반 부르고뉴 미술의 결정적 걸작 중 1점. ' +
    '\n\n' +
    '사후 영향. (1)4세의 펠리페 1세가 부르고뉴 영지(저지대 + 디종 본토) 상속 → 약 1년 후 ' +
    '1482-12-23 "아라스 조약(Treaty of Arras)"으로 본토(디종)는 프랑스 합병, 저지대 영지만 ' +
    '합스부르크 가문이 유지 "합스부르크령 네덜란드(1482~1581)"로 정식 출발 (2)막시밀리안이 ' +
    '약 11년 펠리페 1세 섭정(1482~1493) (3)5명의 자녀 중 펠리페·마르가레타 2명만 성인 생존 ' +
    '— 제3 자녀 프란츠는 1481 출생 직후 사망, 마리 사후 태아도 사망 (4)부르고뉴 직계 단절. ' +
    '\n\n' +
    '문학적 신화화. 마리의 낙마·25세 요절은 동시기·후대 시·소설·회화의 결정적 소재 — ' +
    '(1)후일 "오라네어 빌헬무스(Wilhelmus van Nassouwe — 네덜란드 국가)"의 멜로디 출처가 부르고뉴 시대 노래 ' +
    '(2)16~17세기 회화에 마리·막시밀리안의 결혼 장면이 합스부르크 영광의 출발로 반복 묘사 (3)낭만주의 시대 ' +
    '뮈쇼·드뢰 등 부르고뉴 비극의 정점으로 재조명.',
  biography:
    '발루아-부르고뉴 가문의 부르고뉴 공국 5대(=마지막) 여공작(재위 1477~1482). ' +
    '담대공 샤를 1세(Charles le Téméraire, 1433~1477 — 발루아-부르고뉴 4대)와 두 번째 부인 ' +
    '이사벨라 데 부르봉(Isabella of Bourbon, 1434~1465)의 외동딸. ' +
    '\n\n' +
    '1457 출생과 양육. 1457-02-13 브뤼셀 쿠덴베르흐(Coudenberg) 궁에서 출생. 약 8세인 1465 어머니 ' +
    '이사벨라 데 부르봉 사망 — 부친 샤를의 새 부인 마르가레타 데 요크(Margaret of York — 잉글랜드 ' +
    '에드워드 4세 누이)가 1468 결혼하면서 양모로 양육. 부르고뉴 궁정의 르네상스 학예 — 라틴어·프랑스어· ' +
    '플라망어·이탈리아어 4개 언어 + 음악·미술 등 인문 교육. ' +
    '\n\n' +
    '1477-01-05 부친 샤를 1세의 낭시 전사 — 결정적 사건. ' +
    '1477-01-05 담대공 샤를 1세가 낭시 전투(Battle of Nancy)에서 로렌 공작 르네 2세·스위스 동맹 군대에 ' +
    '패배·24세 전사. 시신은 늪에 빠져 며칠 후 발견 — 늑대에 부분 훼손. 외동딸 마리(20세)가 약 250만 km² ' +
    '부르고뉴 영지(디종 본토 + 플랑드르·브라반트·홀란트·룩셈부르크 등 저지대 영지) 단독 상속. ' +
    '\n\n' +
    '1477-02 "대특권(Groot Privilege)". ' +
    '1477-02-11 마리가 즉위 약 5주 후 "대특권(Groot Privilege / Grand Privilège)" 발포. ' +
    '(1)플랑드르·브라반트·홀란트 등 부르고뉴 저지대 도시·영방의 자치권·세금 인하·언어권 인정 ' +
    '(2)부르고뉴 공작의 사적 군대 사용 제한 (3)화폐 발행 영방 공동 관리 — 사실상 부르고뉴 권력의 ' +
    '결정적 약화. 마리가 "대특권"을 발포한 이유는 (1)부친 샤를 1세 사망 후 즉위 정당성 위기 (2)프랑스 ' +
    '루이 11세의 침공 위협 — 도시 자치 인정으로 도시들의 충성 확보 필요. "대특권"은 후일 16~17세기 ' +
    '저지대 자치 운동·1568 80년 전쟁의 사상적 토대 중 1점. ' +
    '\n\n' +
    '1477-08-19 막시밀리안 1세와 결혼. ' +
    '프랑스 루이 11세가 마리에 자기 아들 샤를(8세, 후일 샤를 8세)과의 결혼을 강요 — 그러나 마리는 ' +
    '(1)부친 신하·궁정 의회의 권유 (2)막시밀리안의 인품·외모 호감으로 합스부르크 막시밀리안과 결혼 결정. ' +
    '1477-04-21 약혼 → 1477-08-19 헨트(Ghent)에서 정식 결혼. 결혼식 비용은 플랑드르 도시들이 부담 — ' +
    '"대특권" 발포의 댓가. 결혼으로 막시밀리안이 jure uxoris 부르고뉴 영지 공동 군주, 마리는 정식 단독 ' +
    '여공작 지위 유지. ' +
    '\n\n' +
    '1477~1482 약 5년 통치. ' +
    '결혼 직후부터 (1)프랑스 루이 11세의 디종 합병 시도 차단 (2)플랑드르 도시 반란(헨트·브뤼주 등) 진정 ' +
    '(3)"대특권" 후속 행정 개혁 등 약 5년간 마리·막시밀리안 부부가 부르고뉴 통치. 5명의 자녀 출산 — ' +
    '(1)펠리페 1세(1478, 후일 미남공 필리프) (2)프랑수아(1481, 신생아 사망) (3)마르가레타(1480, 후일 ' +
    '카스티야 후아나 1세 양모·합스부르크령 네덜란드 섭정 1507~1530) (4)사산아(1482, 본인 사망 시) ' +
    '(5)사산아(1481경). 5명 중 성인 생존 2명. ' +
    '\n\n' +
    '1482-03-27 낙마 사고와 사망. ' +
    '1482-03 임신 8개월 상태에서 브뤼주 인근 매사냥 중 말이 도랑을 뛰어넘다 낙마. 약 20일간 ' +
    '골반 골절·내부 출혈로 침대 누워있다 1482-03-27 25세 사망. 임신 중 태아도 사망. ' +
    '4세의 펠리페가 부르고뉴 영지 상속 → 1482-12-23 "아라스 조약"으로 본토(디종)는 프랑스 합병, ' +
    '저지대 영지만 합스부르크 가문 유지 "합스부르크령 네덜란드(1482~1581)" 정식 출발. ' +
    '\n\n' +
    '장기 유산. (1)약 5년 단독 통치였으나 1477 "대특권"으로 저지대 자치 전통 정립 → 1568 80년 ' +
    '전쟁의 사상적 토대 (2)합스부르크 가문이 부르고뉴 저지대 영지를 상속 → 1482 "합스부르크령 네덜란드" ' +
    '출발 → 16세기 합스부르크 유럽 패권의 한 축 (3)아들 미남공 필리프 → 후아나 1세 결혼 → 카를 5세 → ' +
    '카스티야·아라곤·신성로마·합스부르크령 네덜란드 4중 상속 → 16세기 사상 최대 영토 군주의 출발 ' +
    '(4)딸 마르가레타 → 합스부르크령 네덜란드 섭정(1507~1530) → 어린 카를 5세 양육의 직접 양모 ' +
    '(5)브뤼주 "성모성당"의 청동 묘상은 15세기 후반 부르고뉴 미술의 정점.',
  influence: 75,
  stats: {
    politics: 70,
    military: 30,
    diplomacy: 75,
    intellect: 75,
    charisma: 80,
    administration: 65,
    notes:
      '약 5년 단독 통치였으나 1477 "대특권" 발포로 저지대 자치 전통 정립 — 후일 16~17세기 ' +
      '플랑드르 자치 운동·1568 80년 전쟁의 사상적 토대 중 1점. 25세 요절로 잠재력의 일부만 발휘. ' +
      '외교(1477 막시밀리안과의 결혼 결정·프랑스 루이 11세 위협 차단)·정치(즉위 직후 정당성 위기에서 ' +
      '"대특권"으로 도시 충성 확보)는 동시기 평균 이상. 군사는 직접 지휘 경험 없으므로 평가 보류. ' +
      '카리스마는 결혼 결정·자치권 부여로 동시기 도시·시민들의 "사랑받는 여공작" 위치 확립 — ' +
      '1482 사망 시 저지대 도시들의 결정적 애도. 학식은 부르고뉴 궁정의 르네상스 학예 + 4개 언어. ' +
      '행정은 5년 통치로 부친 샤를 1세 대비 균형적 — 그러나 "대특권"이 후일 합스부르크 통치를 ' +
      '약화시킨 양면.',
  },
} as const

export async function seedPhilipIParents(prisma: PrismaService): Promise<void> {
  console.log('\n👑 미남공 필리프 부모(막시밀리안 1세 + 부르고뉴 마리) 시딩 시작...')

  // ── 사전 의존성 ────────────────────────────────────────────────────────
  const admin = await prisma.account.findUnique({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  ⚠️  admin 계정이 없어 시딩을 건너뜀')
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

  const hreHC = await prisma.historicalCountry.findFirst({
    where: { name: '신성로마제국' },
    select: { id: true },
  })
  if (!hreHC) {
    console.warn('  ⚠️  신성로마제국 HC 미존재 — 먼저 person.charles-v.seed 실행 필요')
    return
  }

  const philipI = await prisma.person.findFirst({
    where: { originalName: 'Philip I of Castile' },
    select: { id: true, fatherId: true, motherId: true },
  })
  if (!philipI) {
    console.warn('  ⚠️  미남공 필리프 미존재 — 먼저 person.charles-v-parents.seed 실행 필요')
    return
  }

  const kingPos = await prisma.governmentPositionDefinition.findFirst({
    where: { title: '국왕' },
    select: { id: true },
  })
  const dukePos = await prisma.governmentPositionDefinition.findFirst({
    where: { title: '공작' },
    select: { id: true },
  })
  const hrePos = await prisma.governmentPositionDefinition.findFirst({
    where: { title: '신성로마황제' },
    select: { id: true },
  })

  // ── 1) 발루아-부르고뉴 가문 등록 ─────────────────────────────────────────
  let valoisDynasty = await prisma.dynasty.findFirst({
    where: { name: VALOIS_BURGUNDY_DYNASTY.name },
  })
  if (valoisDynasty) {
    console.log(`  ⏭️  가문 이미 존재: ${VALOIS_BURGUNDY_DYNASTY.name}`)
  } else {
    valoisDynasty = await prisma.dynasty.create({
      data: {
        name: VALOIS_BURGUNDY_DYNASTY.name,
        description: VALOIS_BURGUNDY_DYNASTY.description,
        startDate: new Date(VALOIS_BURGUNDY_DYNASTY.startYear, 0, 1),
        endDate: new Date(VALOIS_BURGUNDY_DYNASTY.endYear, 11, 31),
      },
    })
    console.log(`  ✅ 가문 생성: ${VALOIS_BURGUNDY_DYNASTY.name} (id=${valoisDynasty.id})`)
  }

  // ── 2) 부르고뉴 공국 HC 인라인 생성 ──────────────────────────────────────
  let burgundyHC = await prisma.historicalCountry.findFirst({
    where: { name: BURGUNDY_HC_SPEC.name },
    select: { id: true },
  })
  if (burgundyHC) {
    console.log(`  ⏭️  역사 국가 이미 존재: ${BURGUNDY_HC_SPEC.name}`)
  } else {
    const created = await prisma.historicalCountry.create({
      data: {
        name: BURGUNDY_HC_SPEC.name,
        enName: BURGUNDY_HC_SPEC.enName,
        description: BURGUNDY_HC_SPEC.description,
        startEra: 'AD' as any,
        startYear: BURGUNDY_HC_SPEC.startYear,
        endEra: 'AD' as any,
        endYear: BURGUNDY_HC_SPEC.endYear,
        stateType: BURGUNDY_HC_SPEC.stateType,
        entityKind: HistoricalEntityKind.STATE,
        latitude: BURGUNDY_HC_SPEC.latitude,
        longitude: BURGUNDY_HC_SPEC.longitude,
        accountId: admin.id,
      },
    })
    burgundyHC = { id: created.id }
    console.log(`  ✅ 역사 국가 생성: ${BURGUNDY_HC_SPEC.name} (id=${created.id})`)
  }

  // ── 3) DynastyRule (발루아-부르고뉴 → 부르고뉴 공국) ────────────────────
  const dynastyRuleExists = await prisma.dynastyRule.findFirst({
    where: { dynastyId: valoisDynasty.id, historicalCountryId: burgundyHC.id },
  })
  if (dynastyRuleExists) {
    console.log(`  ⏭️  가문 통치 스킵: 발루아-부르고뉴 → 부르고뉴 공국`)
  } else {
    await prisma.dynastyRule.create({
      data: {
        dynastyId: valoisDynasty.id,
        historicalCountryId: burgundyHC.id,
        startEra: 'AD' as any,
        startYear: VALOIS_BURGUNDY_DYNASTY.startYear,
        endEra: 'AD' as any,
        endYear: VALOIS_BURGUNDY_DYNASTY.endYear,
      },
    })
    console.log(
      `  ✅ 가문 통치: 발루아-부르고뉴 → 부르고뉴 공국 ` +
        `(${VALOIS_BURGUNDY_DYNASTY.startYear}-${VALOIS_BURGUNDY_DYNASTY.endYear})`,
    )
  }

  // ── 4) Person 등록 (Helper) ──────────────────────────────────────────
  const createOrFindPerson = async (
    spec: typeof MAXIMILIAN_I | typeof MARY_BURGUNDY,
    gender: 'MALE' | 'FEMALE',
    dynastyId: string,
  ): Promise<string> => {
    const existing = await prisma.person.findFirst({
      where: { originalName: spec.originalName },
    })
    if (existing) {
      console.log(`  ⏭️  인물 이미 존재 — 스킵: ${spec.originalName} (id=${existing.id})`)
      const patch: any = {}
      if (!existing.dynastyId) patch.dynastyId = dynastyId
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
        dynastyId,
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

  // ── 5) 막시밀리안 1세 + 부르고뉴 마리 등록 ───────────────────────────────
  const maxId = await createOrFindPerson(MAXIMILIAN_I, 'MALE', habsburgDynasty.id)
  const maryId = await createOrFindPerson(MARY_BURGUNDY, 'FEMALE', valoisDynasty.id)

  // ── 6) PersonStats x2 ─────────────────────────────────────────────────
  for (const [pid, spec, label] of [
    [maxId, MAXIMILIAN_I, '막시밀리안 1세'],
    [maryId, MARY_BURGUNDY, '부르고뉴 마리'],
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

  // ── 7) PersonCountryAffiliation x2 ───────────────────────────────────
  for (const [pid, hcId, label, hcLabel] of [
    [maxId, hreHC.id, '막시밀리안 1세', '신성로마제국'],
    [maryId, burgundyHC.id, '부르고뉴 마리', '부르고뉴 공국'],
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

  // ── 8) 결혼 관계 (양방향) ─────────────────────────────────────────────
  const mStart = new Date(1477, 7, 19) // 1477-08-19
  const mEnd = new Date(1482, 2, 27) // 1482-03-27 마리 사망
  const mNote =
    '1477-08-19 부르고뉴 헨트(Ghent)에서 정식 결혼. 막시밀리안 18세·마리 20세. ' +
    '담대공 샤를 1세의 1477-01-05 낭시 전사 후 마리가 부르고뉴 영지 단독 상속 → ' +
    '프랑스 루이 11세의 결혼 강요 차단 위한 합스부르크와의 정략 결혼. ' +
    '결혼식 비용은 플랑드르 도시들이 부담("대특권"의 댓가). 결혼으로 막시밀리안이 ' +
    'jure uxoris 부르고뉴 영지 공동 군주(1477~1482), 1482 마리 사망 후 약 11년 펠리페 1세 섭정. ' +
    '5명의 자녀 — 펠리페 1세(미남공)·마르가레타·프랑수아(신생아 사망)·사산아 2명. ' +
    '약 5년 결혼이지만 동시기 기록은 깊은 신뢰·사랑의 부부로 묘사 — 막시밀리안은 마리 사후 ' +
    '재혼(1494 비앙카 마리아 스포르차)에도 평생 마리에 대한 추모 유지, 임종 시 자신의 심장을 ' +
    '마리 옆에 안치하라는 유언 남김.'
  for (const [aId, bId, label] of [
    [maxId, maryId, '막시밀리안 → 마리'],
    [maryId, maxId, '마리 → 막시밀리안'],
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
        marriageStartDate: mStart,
        marriageEndDate: mEnd,
        note: mNote,
      },
    })
    console.log(`  ✅ 결혼: ${label} (1477-08-19 ~ 1482-03-27 사별)`)
  }

  // ── 9) 부자/모자 관계 (미남공 필리프에 부모 연결) ───────────────────────
  if (philipI.fatherId) {
    console.log(`  ⏭️  부자 스킵 (이미 연결): 미남공 필리프 fatherId=${philipI.fatherId}`)
  } else {
    await prisma.person.update({
      where: { id: philipI.id },
      data: { fatherId: maxId },
    })
    console.log(`  ✅ 부자: 막시밀리안 1세 → 미남공 필리프`)
  }
  if (philipI.motherId) {
    console.log(`  ⏭️  모자 스킵 (이미 연결): 미남공 필리프 motherId=${philipI.motherId}`)
  } else {
    await prisma.person.update({
      where: { id: philipI.id },
      data: { motherId: maryId },
    })
    console.log(`  ✅ 모자: 부르고뉴 마리 → 미남공 필리프`)
  }

  // ── 10) SovereignReign x2 ────────────────────────────────────────────
  type ReignSpec = {
    personId: string
    historicalCountryId: string
    historicalCountryName: string
    positionDefinitionId: string | null
    regnalNumber: number
    regnalName: string
    startDate: Date
    endDate: Date
    appointmentMethod: AppointmentMethod
    endReason: TenureEndReason
    endReasonDetail?: string
    notes?: string
  }

  // (1) 막시밀리안 1세 — 신성로마제국 황제 19대
  // (HC start=962 오토 1세부터: ... 18대 프리드리히 3세 → 19대 막시밀리안 1세 → 20대 카를 5세)
  // (2) 부르고뉴 마리 — 부르고뉴 공국 5대
  // (HC start=1363 발루아-부르고뉴 분봉부터: 1.필리프 2세(담대공) → 2.장 1세(공포공) → 3.필리프 3세(선량공) → 4.샤를 1세(담대공) → 5.마리 1세)
  const REIGNS: ReignSpec[] = []
  if (hrePos) {
    REIGNS.push({
      personId: maxId,
      historicalCountryId: hreHC.id,
      historicalCountryName: '신성로마제국',
      positionDefinitionId: hrePos.id,
      regnalNumber: 19,
      regnalName: '막시밀리안 1세',
      startDate: new Date(1493, 7, 19), // 1493-08-19 부친 프리드리히 3세 사망
      endDate: new Date(1519, 0, 12), // 1519-01-12 본인 사망
      appointmentMethod: AppointmentMethod.INDIRECT_ELECTION,
      endReason: TenureEndReason.DEATH_IN_OFFICE,
      endReasonDetail: '1519-01-12 오스트리아 벨스에서 59세 사망 (뇌졸중·통풍 합병증).',
      notes:
        '1486-02-16 프랑크푸르트에서 7 선제후가 King of the Romans 선출(부친 프리드리히 3세의 ' +
        '계승자 사전 지명) → 1486-04-09 아헨 대성당에서 King of the Romans 대관식. ' +
        '1493-08-19 부친 프리드리히 3세 사망으로 신성로마황제 사실상 즉위 — 단 교황 대관 없이. ' +
        '1508-02-04 교황 율리오 2세가 "선출 황제(Erwählter Römischer Kaiser)" 칭호 사용 인가 — ' +
        '교황 대관 없이 황제 칭호를 사용한 첫 황제, 후일 모든 신성로마황제가 채용한 모델. ' +
        '약 26년 재위 중 (1)1495 보름스 의회 "영원한 평화령"·Reichskammergericht 설치 (2)1499 슈바벤 전쟁 ' +
        '(3)합스부르크 결혼 정책 4대 설계 (4)1494~ 이탈리아 전쟁 직접 지휘 (5)알브레히트 뒤러 등 르네상스 후원. ' +
        '"최후의 기사(Der letzte Ritter)" 별칭으로 중세 기사도와 르네상스 학예의 중간 위치.',
    })
  } else {
    console.warn('  ⚠️  관직 정의 \'신성로마황제\' 미존재 — 막시밀리안 재임 스킵')
  }
  if (dukePos) {
    REIGNS.push({
      personId: maryId,
      historicalCountryId: burgundyHC.id,
      historicalCountryName: '부르고뉴 공국',
      positionDefinitionId: dukePos.id,
      regnalNumber: 5,
      regnalName: '마리 1세',
      startDate: new Date(1477, 0, 5), // 1477-01-05 부친 샤를 1세 낭시 전사
      endDate: new Date(1482, 2, 27), // 1482-03-27 본인 낙마 사망
      appointmentMethod: AppointmentMethod.HEREDITARY,
      endReason: TenureEndReason.DEATH_IN_OFFICE,
      endReasonDetail:
        '1482-03-27 브뤼주 프린센호프에서 25세 낙마 사고 후 약 20일 만에 사망. ' +
        '4세의 펠리페 1세(미남공)가 부르고뉴 영지 상속 → 1482-12-23 "아라스 조약"으로 ' +
        '본토(디종)는 프랑스 합병, 저지대 영지만 합스부르크 가문 유지 "합스부르크령 네덜란드(1482~1581)" 출발.',
      notes:
        '1477-01-05 부친 담대공 샤를 1세의 낭시 전투 전사로 20세에 약 250만 km² 부르고뉴 영지 ' +
        '(디종 본토 + 플랑드르·브라반트·홀란트·룩셈부르크 등 저지대) 단독 상속. 1477-02-11 "대특권 ' +
        '(Groot Privilege / Grand Privilège)" 발포 — 저지대 도시 자치권·세금 인하·언어권 인정으로 ' +
        '도시 충성 확보. 1477-08-19 합스부르크 막시밀리안 1세와 결혼 — 프랑스 루이 11세의 결혼 강요 ' +
        '차단·합스부르크와 동맹. 약 5년 통치 중 (1)"대특권" 이행 (2)플랑드르 도시 반란 진정 (3)프랑스의 ' +
        '디종 합병 시도 차단. 5명의 자녀 중 펠리페 1세·마르가레타 2명만 성인 생존. ' +
        '1482-03-27 임신 8개월 상태에서 매사냥 중 낙마, 25세 사망.',
    })
  } else {
    console.warn('  ⚠️  관직 정의 \'공작\' 미존재 — 마리 재임 스킵')
  }

  for (const r of REIGNS) {
    if (!r.positionDefinitionId) continue
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
          `  🔧 재임 정정: ${r.historicalCountryName} ${r.regnalName} ${r.regnalNumber}대`,
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
        personId: r.personId,
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
      `  ✅ 재임: ${r.historicalCountryName} ${r.regnalName} ${r.regnalNumber}대 ` +
        `(${fmt(r.startDate)} ~ ${fmt(r.endDate)})`,
    )
  }

  console.log(`✅ 미남공 필리프 부모 시딩 완료\n`)
}
