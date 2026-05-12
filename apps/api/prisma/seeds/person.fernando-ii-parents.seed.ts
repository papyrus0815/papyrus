/**
 * 페르난도 2세(Ferdinand II of Aragon, 1452~1516)의 부모 시드 — 트라스타마라 페르난도
 *
 *  - 아버지: 후안 2세 (Juan II de Aragón, 1398~1479) — 트라스타마라 가문(아라곤 분지),
 *    아라곤 왕국 19대 국왕(재위 1458~1479) + 나바라 왕(1425~1479, 처음엔 jure uxoris)
 *  - 어머니: 후아나 엔리케스 (Juana Enríquez, 1425~1468) — 엔리케스 가문(카스티야 트라스타마라
 *    사생 분지, 카스티야 함대 제독 Fadrique Enríquez의 딸), 후안 2세의 두 번째 부인
 *
 * 후안 2세는 페르난도 1세(트라스타마라 카스페 협약 1412 당선자)의 차남으로, 형 알폰소 5세
 * "관대공"의 1458-06-27 나폴리 사망 후 아라곤 왕위 계승. 첫 부인 블랑카 1세 데 나바라(1387~1441)와의
 * 장남 비아나 공 카를로스(Carlos de Viana, 1421~1461)와 1450년대 내내 계승 다툼을 벌였고,
 * 후아나 엔리케스는 이 다툼 속에서 자기 아들 페르난도(=후일 페르난도 2세, 1452년 차남으로 출생)를
 * 옹호하다 1461년 카를로스 사망 후 페르난도가 단독 후계자로 부상한다.
 *
 * ⚠️ 기존 데이터 보존 모드.
 *
 * 등록 항목:
 *  - Person x2 (후안 2세·후아나 엔리케스)
 *  - PersonStats x2
 *  - PersonSpouse x2 (양방향 결혼, 1444년 ~ 1468-02-13 사별 — 유방암으로 사망)
 *  - PersonCountryAffiliation (후안 2세 → 아라곤 CITIZENSHIP, 후아나 → 카스티야 CITIZENSHIP)
 *  - 부자/모자 관계: 후안 2세 + 후아나 엔리케스 → 페르난도 2세
 *  - SovereignReign x1 (후안 2세 — 아라곤 19대, 1458-06-27 ~ 1479-01-19, DEATH_IN_OFFICE)
 *
 * ⚠️ 의존: person.catholic-monarchs.seed (페르난도 2세 본인 + 트라스타마라 가문 + 아라곤·카스티야 HC 등록)
 */
import {
  AppointmentMethod,
  DeathType,
  TenureEndReason,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

// ── 후안 2세 본문 ─────────────────────────────────────────────────────────
const JUAN_II = {
  name: '후안',
  surname: '트라스타마라',
  originalName: 'John II of Aragon',
  regnalName: '2세',
  birthYear: 1398,
  birthMonth: 6,
  birthDay: 29,
  deathYear: 1479,
  deathMonth: 1,
  deathDay: 19,
  birthPlaceText: '카스티야 왕국 메디나 델 캄포(Medina del Campo) — 부친 페르난도(후일 페르난도 1세) 영지',
  deathPlaceText: '아라곤 왕국 카탈루냐 바르셀로나(Barcelona)',
  deathType: DeathType.ILLNESS,
  deathCause: '노환 + 합병증 (향년 80세)',
  deathNote:
    '1479년 1월 19일 밤(19/20일 사이)에 바르셀로나에서 향년 80세로 사망했다. 동시기 평균 수명을 ' +
    '크게 상회하는 장수였으며, 말년에는 시력을 거의 잃었다(1468년경 백내장 수술 시도). ' +
    '사인은 동시기 기록상 노환에 따른 자연사. 임종 시 옆에는 두 번째 부인 후아나 엔리케스 ' +
    '사망(1468) 후 차남 페르난도(=페르난도 2세, 당시 26세, 이미 카스티야 공동 군주 페르난도 5세)와 ' +
    '카탈루냐 측근들. 시신은 처음 바르셀로나 대성당에 안치되었다가 후일 포블레트 수도원(Monasterio de ' +
    'Poblet — 아라곤 왕가 묘소)으로 이장. 사망 다음 날 1479-01-20 차남 페르난도가 아라곤 20대 ' +
    '국왕 페르난도 2세로 즉위 — 이로써 카스티야(1474년부터)와 아라곤이 페르난도-이사벨 부부 손에서 ' +
    '사실상 동군연합되어 후일 "에스파냐 왕국"(1715 통합) 출범의 직접적 토대가 마련됐다.',
  biography:
    '트라스타마라 가문 아라곤 분지의 아라곤 왕국 19대 국왕(재위 1458-06-27 ~ 1479-01-19, 약 20년 7개월) + ' +
    '나바라 왕(재위 1425~1479, 1425~1441은 첫 부인 블랑카 1세 데 나바라와의 jure uxoris). ' +
    '아라곤 왕 페르난도 1세(=카스페 협약 1412 당선자, 트라스타마라 가문의 아라곤 진출 시조)와 ' +
    '엘레오노르 데 알부르케르케(Eleanor of Alburquerque, 1374~1435)의 차남이다. 형은 알폰소 5세 ' +
    '"관대공"(el Magnánimo, 1396~1458 — 아라곤 18대 + 나폴리 정복).\n\n' +
    '1398년 6월 29일 카스티야 왕국 메디나 델 캄포에서 출생했다. 당시 부친 페르난도는 카스티야 왕자 ' +
    '신분(카스티야 후안 1세의 차남)으로 카스티야 왕가에서 양육되었다. 1412년 부친이 카스페 협약 ' +
    '(Compromise of Caspe)으로 아라곤 왕위에 선출되면서 후안도 아라곤 왕자로 신분 전환.\n\n' +
    '1420 첫 결혼 — 나바라 왕위. 1420년 22세에 나바라 여왕 블랑카 1세(Blanche I of Navarre, ' +
    '1387~1441, 11세 연상)와 결혼. 1425-09-08 장인 카를로스 3세 사망으로 부인 블랑카가 나바라 ' +
    '여왕 즉위, 후안은 "jure uxoris(배우자 권리)" 공동 군주(=후안 2세 데 나바라). 4자녀를 두었으며 ' +
    '장남이 후일 비아나 공 카를로스(Carlos de Viana, 1421~1461). 1441-04-01 부인 블랑카 사망 후에도 ' +
    '나바라 왕위를 (장남 카를로스를 무시하고) 본인이 계속 보유 — 후일 1450년대 "나바라 내전(1451~1455)"의 ' +
    '직접적 원인.\n\n' +
    '1444 재혼. 1441년 부인 블랑카 사망 후 약 3년이 지난 1444년 7월(또는 4월) 19세의 후아나 엔리케스 ' +
    '(Juana Enríquez, 1425~1468 — 카스티야 함대 제독 Fadrique Enríquez의 딸)와 재혼. 후안 46세· ' +
    '후아나 19세, 27세 연하. 1452-03-10 둘째 아들 페르난도(=후일 페르난도 2세) 출생 — 단 후안에게는 ' +
    '첫 부인 소생 장남 카를로스(31세)가 이미 있어 처음에는 차남이었다.\n\n' +
    '1458 아라곤 왕 즉위. 1458-06-27 형 알폰소 5세 관대공이 나폴리에서 자녀 없이 사망 — 후안이 ' +
    '아라곤·시칠리아·사르데냐·발렌시아·마요르카 왕(아라곤 19대 후안 2세)으로 즉위. ' +
    '나폴리는 형의 사생자 페란테(Ferrante)에게 분리(1458~1494 나폴리 왕). 따라서 후안은 본토 ' +
    '아라곤 연합 왕국을 계승하되 나폴리를 잃은 셈이다.\n\n' +
    '1461 비아나 공 카를로스 사망 — 페르난도 단독 후계자. 첫 부인 블랑카 소생 장남 카를로스(1421~1461)는 ' +
    '나바라 왕위·아라곤 후계 모두에서 부친 후안 2세와 대립했다. 후아나 엔리케스의 강한 옹호로 ' +
    '차남 페르난도가 후계자로 부상하던 중 1461-09-23 카를로스가 40세에 결핵(또는 독살설)으로 ' +
    '바르셀로나에서 사망. 카탈루냐 일대에서는 "후아나가 카를로스를 독살했다"는 소문이 퍼지면서 ' +
    '카탈루냐 코르테스가 봉기 — 이것이 1462~1472 "카탈루냐 시민전쟁(Catalan Civil War)"의 직접적 ' +
    '발화점이다.\n\n' +
    '1462~1472 카탈루냐 시민전쟁. 약 10년에 걸친 카탈루냐 코르테스·헤네랄리타트 vs 후안 2세 왕권의 ' +
    '내전. 카탈루냐 측은 외부 왕(포르투갈 페드루, 르네 당주 등)을 영입해 후안 2세를 폐위하려 시도. ' +
    '후안 2세는 (1)프랑스 루이 11세와 1462 베이욘 조약으로 페르피냥·루시용 양도를 대가로 군사 지원 ' +
    '(2)어린 페르난도(10대)에게 카탈루냐 영지 지휘권 부여 (3)1469 페르난도-이사벨 결혼으로 카스티야 ' +
    '동맹 확보로 결국 1472-10-17 페드랄베스 협정(Pact of Pedralbes)으로 카탈루냐 코르테스 항복을 ' +
    '받아내며 승리. 약 10년 내전으로 카탈루냐 경제·사회는 결정적 타격, 후일 16세기 카스티야 우위의 ' +
    '"에스파냐 왕국"이 카스티야 중심으로 짜이게 된 배경 중 하나다.\n\n' +
    '1468 후아나 엔리케스 사망. 1468-02-13 두 번째 부인 후아나 엔리케스가 약 43세에 유방암 ' +
    '(또는 자궁암, 동시기 진단 불확실)으로 타라고나에서 사망. 후안은 70세, 페르난도는 15세였다. ' +
    '후아나 사망 후 후안은 페르난도에게 시칠리아 부왕(Viceroy of Sicily, 1468) 직위를 부여해 ' +
    '독립적 통치 경험을 쌓도록 했다.\n\n' +
    '1469 페르난도-이사벨 결혼 — 카스티야 동맹. 1469-10-19 차남 페르난도(17세)가 카스티야 왕녀 ' +
    '이사벨(=후일 이사벨 1세, 18세)과 바야돌리드에서 비밀 결혼. 후안 2세 본인이 결혼을 적극 추진한 ' +
    '결정적 외교 성과 — 카스티야와의 동군연합 토대 마련.\n\n' +
    '1474 카스티야 공동 군주. 1474-12-13 며느리 이사벨이 카스티야 12대 여왕 즉위, 차남 페르난도가 ' +
    '카스티야 공동 군주 페르난도 5세(jure uxoris) 즉위. 후안 2세는 76세까지 살아 차남이 카스티야· ' +
    '아라곤 양국 권력을 잡는 것을 직접 목격할 수 있었다.\n\n' +
    '1479 사망 — 장기 유산. 1479-01-19 바르셀로나에서 향년 80세로 사망. 다음 날 1479-01-20 차남 ' +
    '페르난도가 아라곤 20대 페르난도 2세로 즉위. 후안 2세는 (1)카스페 협약 트라스타마라 분지를 약 60년 ' +
    '아라곤에 정착시킨 가교 군주 (2)카탈루냐 시민전쟁 승리로 아라곤 왕권을 카탈루냐 코르테스 위에 ' +
    '재정립 (3)페르난도-이사벨 결혼을 추진해 카스티야-아라곤 동군연합의 토대 마련 (4)나바라 왕위를 ' +
    '계승 위기에 빠뜨려 1512 페르난도 2세의 나바라 정복까지 발전시킨 인물로 평가된다.',
  influence: 80,
  stats: {
    politics: 80,
    military: 75,
    diplomacy: 85,
    intellect: 70,
    charisma: 60,
    administration: 70,
    notes:
      '약 20년 7개월 재위(아라곤 1458~1479) + 약 54년 나바라 왕(1425~1479)으로 동시기 최장기 군주 1인. ' +
      '외교는 1469 페르난도-이사벨 결혼 추진, 1462 베이욘 조약(프랑스 루이 11세 동맹) 등 결정적 성과로 ' +
      '동시기 최고급. 정치는 카탈루냐 시민전쟁 10년 내전을 끝까지 끌고가 1472 페드랄베스 협정으로 ' +
      '승리 — 인내력은 우수했으나 첫 부인 소생 장남 카를로스와의 30년 계승 분쟁을 깔끔히 정리하지 ' +
      '못한 점은 약점. 군사는 본인 직접 지휘는 적었으나 카탈루냐 내전 후반에는 80세 가까운 나이에도 ' +
      '시력을 잃은 채 야전 지휘. 카리스마는 두 부인과의 결혼·재혼 정략 + 장남 무시 정책으로 동시기 ' +
      '평판은 양극화. 행정은 안정적이었으나 카탈루냐 내전으로 재정 악화. 학식은 평이.',
  },
} as const

// ── 후아나 엔리케스 본문 ───────────────────────────────────────────────────
const JUANA_ENRIQUEZ = {
  name: '후아나',
  surname: '엔리케스',
  originalName: 'Joan Enríquez',
  regnalName: undefined as string | undefined,
  birthYear: 1425,
  birthMonth: 11,
  birthDay: 1, // 정확한 출생일 미상
  deathYear: 1468,
  deathMonth: 2,
  deathDay: 13,
  birthPlaceText: '카스티야 왕국 토렐로바톤(Torrelobatón, 바야돌리드) — 엔리케스 가문 영지',
  deathPlaceText: '아라곤 왕국 카탈루냐 타라고나(Tarragona)',
  deathType: DeathType.ILLNESS,
  deathCause: '유방암(또는 자궁암 — 동시기 진단 불확실)',
  deathNote:
    '1468년 2월 13일 카탈루냐 타라고나에서 향년 약 43세에 사망. 사인은 동시기 기록상 가슴 부위 ' +
    '종양 — 현대 학술 평가는 유방암 또는 자궁암 가설이다. 약 2년간 종양이 진행되었으며, 동시기 ' +
    '의사들은 효과적 치료를 시도하지 못했다. 임종 시 옆에는 남편 후안 2세·15세였던 외동아들 ' +
    '페르난도(=후일 페르난도 2세). 후아나 사망의 정치적 직격탄은 (1)페르난도의 어머니 보호 상실 ' +
    '— 후안 2세는 70세 노령으로 사실상 어머니 역할을 메우기 어려웠다 (2)카탈루냐 시민전쟁 와중 ' +
    '왕권의 결정적 후원자 부재. 시신은 타라고나 대성당 임시 안치 후 후일 포블레트 수도원으로 이장.',
  biography:
    '엔리케스 가문(House of Enríquez — 카스티야 왕가 사생 분지) 출신의 나바라·아라곤 왕비(재위 1444~1468). ' +
    '카스티야 함대 제독 Fadrique Enríquez(Fadrique Enríquez de Mendoza, 1390~1473)와 두 번째 부인 ' +
    'Mariana Fernández de Córdoba y Ayala(?~1431)의 딸이다. 엔리케스 가문은 카스티야 왕 알폰소 11세 ' +
    '(1311~1350)의 사생자 Fadrique Alfonso(1334~1358 — 처형됨)의 후손으로, 카스티야 트라스타마라 ' +
    '왕가의 방계 사생 분지였다. 15세기 들어 카스티야 함대 제독직(Almirante de Castilla)을 세습하며 ' +
    '카스티야 최고위 귀족 가문 중 하나로 부상.\n\n' +
    '1425년경 카스티야 왕국 토렐로바톤(현 바야돌리드 주)의 엔리케스 가문 영지에서 출생. 정확한 출생일은 ' +
    '미상이다. 부친 Fadrique Enríquez는 카스티야 함대 제독으로 카스티야 후안 2세 시기 "Álvaro de Luna ' +
    '재상 반대파"의 핵심이었다.\n\n' +
    '1444 결혼. 1444년 7월(또는 4월) 19세에 나바라 왕(겸 아라곤 왕자) 후안(=후일 후안 2세 데 아라곤, ' +
    '46세)과 결혼. 27세 연하의 정략 결혼으로, 후안의 첫 부인 블랑카 1세 데 나바라 사망(1441) 약 3년 후의 ' +
    '재혼이었다. 엔리케스 가문의 막강한 카스티야 함대 권력 + 아라곤 왕가의 결합은 후일 카스티야-아라곤 ' +
    '동맹의 한 줄기를 미리 깐 결정적 결혼이었다.\n\n' +
    '1452 페르난도 출생. 1452-03-10 아라곤 왕국 소스 델 레이 카톨리코(현 사라고사 주)의 ' +
    '엔리케스 가문 저택에서 외동아들 페르난도(=후일 페르난도 2세) 출산. 처음에는 후안의 첫 부인 소생 ' +
    '장남 카를로스(31세)가 있어 차남 신분이었으나, 후아나는 자기 아들의 권리 확보를 위해 평생을 ' +
    '바쳤다. 둘째 아들 알폰소는 1465년에 출생했으나 17세인 1482년 사망 — 페르난도가 단독 후계자.\n\n' +
    '1458 아라곤 왕비 즉위. 1458-06-27 시아주버니 알폰소 5세 관대공의 나폴리 사망으로 남편 후안이 ' +
    '아라곤 19대 후안 2세로 즉위. 후아나는 33세에 아라곤·시칠리아·사르데냐·발렌시아·마요르카 왕비가 ' +
    '되었다. 동시기 평가에서 "정치에 깊이 관여하는 강한 왕비"로 알려졌으며, 특히 카탈루냐 ' +
    '귀족·코르테스에 대한 강경 노선의 핵심 추진자.\n\n' +
    '1461 비아나 공 카를로스 사망 — 독살설. 1461-09-23 후안 2세의 첫 부인 블랑카 소생 장남 ' +
    '카를로스가 40세에 바르셀로나에서 결핵(공식) 또는 독살(소문)로 사망. 카탈루냐 일대에서는 ' +
    '"후아나가 자기 아들 페르난도(9세)에게 후계자 자리를 만들어주려 카를로스를 독살했다"는 소문이 ' +
    '퍼지면서 카탈루냐 코르테스가 봉기. 1462년 시작된 카탈루냐 시민전쟁의 직접적 발화점이다. ' +
    '현대 학술 평가에서는 카를로스의 사인이 폐결핵으로 인정되어 후아나 독살설은 거의 부정되지만, ' +
    '15세기 당시에는 카탈루냐 반란의 결정적 명분이 되었다.\n\n' +
    '1462~1466 카탈루냐 시민전쟁 — 9세 페르난도와 함께 헤로나 농성. 1462년 카탈루냐 코르테스 봉기 ' +
    '초기 후아나는 9세였던 아들 페르난도와 함께 헤로나(Girona) 성에서 농성 — 카탈루냐 반란군에 둘러싸인 ' +
    '상황에서 약 수개월간 모자가 생존을 위해 농성한 사건은 후일 페르난도 2세 본인이 어린 시절 가장 ' +
    '강렬한 기억으로 회상한 일이다(마키아벨리 "군주론"의 페르난도 칭송도 이 어린 시절 단련을 부분적 ' +
    '배경으로 한다). 농성은 프랑스 루이 11세의 군사 지원(베이욘 조약 1462)으로 풀렸다.\n\n' +
    '1468 사망 — 결혼 24년. 약 2년의 종양 투병 끝에 1468년 2월 13일 카탈루냐 타라고나에서 향년 ' +
    '약 43세에 사망. 결혼 24년. 남편 후안 2세는 70세, 외동아들 페르난도는 15세였다. 후아나 사망 직후 ' +
    '후안 2세는 페르난도에게 시칠리아 부왕직(Viceroy of Sicily, 1468)을 부여해 독립적 통치 경험을 ' +
    '쌓도록 했고, 1년 후 1469-10-19 페르난도-이사벨 결혼이 성사된다.\n\n' +
    '후일의 영향. 후아나 엔리케스는 (1)아들 페르난도 2세를 단독 후계자로 만든 결정적 인물 ' +
    '(2)카탈루냐 시민전쟁 와중 9세 페르난도를 헤로나 농성에서 함께 지킨 어머니 (3)엔리케스 가문 ' +
    '카스티야 함대 권력을 아라곤 왕가에 결합시킨 정략 결혼의 주역 (4)외손녀 후아나 1세(=공왕녀)의 ' +
    '"후아나"라는 이름의 직접적 유래(외할머니 이름 계승)로 평가된다. 마키아벨리가 "군주론"에서 ' +
    '페르난도 2세를 "새로운 군주의 모범"으로 칭송한 배경에는 9세부터 어머니와 함께 농성·내전을 ' +
    '체험한 비범한 어린 시절이 깔려 있다.',
  influence: 55,
  stats: {
    politics: 70,
    military: 35,
    diplomacy: 60,
    intellect: 60,
    charisma: 70,
    administration: 50,
    notes:
      '동시기 평가에서 "정치에 깊이 관여하는 강한 왕비"로 알려진 인물. 아들 페르난도(=후일 페르난도 ' +
      '2세)의 후계 옹호를 평생 추진해 비아나 공 카를로스(첫 부인 소생 장남)와의 30년 계승 분쟁의 ' +
      '한 축이었다. 1462년 9세 페르난도와 함께 헤로나 농성을 견뎌낸 군사적 인내력은 동시기 왕비 ' +
      '중에서도 이례적. 외교는 친정 엔리케스 가문 카스티야 인맥을 통한 카스티야 측 동맹 구축에서 ' +
      '강점. 카리스마는 카탈루냐 반란군 측에서는 "독살자" 악평이었으나 아라곤 왕권 측에서는 ' +
      '"강한 왕비"로 평가 양극화. 행정 경험은 제한적이었으며 43세 요절로 본격적 정치 시대를 ' +
      '맞지 못했다.',
  },
} as const

export async function seedFernandoIIParents(prisma: PrismaService): Promise<void> {
  console.log('\n👑 페르난도 2세 부모(후안 2세 + 후아나 엔리케스) 시딩 시작...')

  // ── 사전 의존성 ────────────────────────────────────────────────────────
  const admin = await prisma.account.findUnique({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  ⚠️  admin 계정 미존재')
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

  const aragonHC = await prisma.historicalCountry.findFirst({
    where: { name: '아라곤 왕국' },
    select: { id: true },
  })
  const castileHC = await prisma.historicalCountry.findFirst({
    where: { name: '카스티야 왕국' },
    select: { id: true },
  })
  if (!aragonHC || !castileHC) {
    console.warn('  ⚠️  아라곤 왕국 또는 카스티야 왕국 HC 미존재 — 시딩 중단')
    return
  }

  const fernandoII = await prisma.person.findFirst({
    where: { originalName: 'Ferdinand II of Aragon' },
    select: { id: true, fatherId: true, motherId: true },
  })
  if (!fernandoII) {
    console.warn('  ⚠️  페르난도 2세 미존재 — 먼저 person.catholic-monarchs.seed 실행 필요')
    return
  }

  const kingPos = await prisma.governmentPositionDefinition.findFirst({
    where: { title: '국왕' },
    select: { id: true },
  })

  // ── Helper: Person 등록 ──────────────────────────────────────────────
  const createOrFindPerson = async (
    spec: typeof JUAN_II | typeof JUANA_ENRIQUEZ,
    gender: 'MALE' | 'FEMALE',
    dynastyId: string | null,
  ): Promise<string> => {
    const existing = await prisma.person.findFirst({
      where: { originalName: spec.originalName },
    })
    if (existing) {
      console.log(`  ⏭️  인물 이미 존재 — 스킵: ${spec.originalName} (id=${existing.id})`)
      const patch: any = {}
      if (!existing.dynastyId && dynastyId) patch.dynastyId = dynastyId
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
        dynastyId: dynastyId ?? undefined,
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

  // ── 1) Person 등록 ────────────────────────────────────────────────────
  const juanId = await createOrFindPerson(JUAN_II, 'MALE', trastamaraDynasty.id)
  const juanaId = await createOrFindPerson(JUANA_ENRIQUEZ, 'FEMALE', null)

  // ── 2) PersonStats x2 ──────────────────────────────────────────────────
  for (const [pid, spec, label] of [
    [juanId, JUAN_II, '후안 2세'],
    [juanaId, JUANA_ENRIQUEZ, '후아나 엔리케스'],
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

  // ── 3) PersonCountryAffiliation ─────────────────────────────────────
  for (const [pid, hcId, label, hcLabel] of [
    [juanId, aragonHC.id, '후안 2세', '아라곤 왕국'],
    [juanaId, castileHC.id, '후아나 엔리케스', '카스티야 왕국'],
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
  const mStart = new Date(1444, 6, 1) // 1444-07 (정확한 일자는 동시기 기록 불일치, 7월로 통일)
  const mEnd = new Date(1468, 1, 13) // 1468-02-13 후아나 사망
  const mNote =
    '1444년 7월(또는 4월, 동시기 기록 불일치) 후안 46세·후아나 19세, 27세 연하의 정략 결혼이었다. ' +
    '후안의 첫 부인 블랑카 1세 데 나바라(1387~1441) 사망 약 3년 후의 재혼. 후아나의 친정 엔리케스 ' +
    '가문은 카스티야 함대 제독을 세습하던 카스티야 왕가 사생 분지로, 결혼은 아라곤 왕가와 ' +
    '카스티야 최고위 귀족 가문의 결합이었다. 약 24년 결혼 생활 동안 외동아들 페르난도(=후일 ' +
    '페르난도 2세, 1452-03-10 출생)와 둘째 아들 알폰소(1465 출생, 1482 17세 사망)를 두었다. 1468-02-13 ' +
    '후아나가 약 43세에 유방암(또는 자궁암)으로 타라고나에서 사망하면서 결혼 종결. 후안 70세였으며 ' +
    '그 후 세 번째 결혼은 하지 않고 1479-01-19 사망 시까지 약 11년을 홀로 보냈다.'

  for (const [aId, bId, label] of [
    [juanId, juanaId, '후안 2세 → 후아나'],
    [juanaId, juanId, '후아나 → 후안 2세'],
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
    console.log(`  ✅ 결혼: ${label} (1444-07 ~ 1468-02-13 사별)`)
  }

  // ── 5) 부자/모자 관계: 후안 2세 + 후아나 엔리케스 → 페르난도 2세 ─────────
  if (fernandoII.fatherId) {
    console.log(`  ⏭️  부자 스킵 (이미 연결): 페르난도 fatherId=${fernandoII.fatherId}`)
  } else {
    await prisma.person.update({
      where: { id: fernandoII.id },
      data: { fatherId: juanId },
    })
    console.log(`  ✅ 부자: 후안 2세 → 페르난도 2세`)
  }
  if (fernandoII.motherId) {
    console.log(`  ⏭️  모자 스킵 (이미 연결): 페르난도 motherId=${fernandoII.motherId}`)
  } else {
    await prisma.person.update({
      where: { id: fernandoII.id },
      data: { motherId: juanaId },
    })
    console.log(`  ✅ 모자: 후아나 엔리케스 → 페르난도 2세`)
  }

  // ── 6) SovereignReign — 아라곤 왕국 19대 후안 2세 ────────────────────
  // 아라곤 라인업: 17.페르난도 1세 → 18.알폰소 5세 → 19.후안 2세 → 20.페르난도 2세 → 21.후아나 1세
  if (kingPos) {
    const r = {
      regnalNumber: 19,
      regnalName: '후안 2세',
      startDate: new Date(1458, 5, 27), // 1458-06-27 형 알폰소 5세 사망 후 즉위
      endDate: new Date(1479, 0, 19), // 1479-01-19 사망
      appointmentMethod: AppointmentMethod.HEREDITARY,
      endReason: TenureEndReason.DEATH_IN_OFFICE,
      endReasonDetail: '1479-01-19 바르셀로나에서 향년 80세로 노환 사망.',
      notes:
        '1458-06-27 형 알폰소 5세 관대공의 나폴리 사망으로 아라곤·시칠리아·사르데냐·발렌시아· ' +
        '마요르카 왕(아라곤 19대 후안 2세) 즉위. 약 20년 7개월 재위. 나폴리는 형의 사생자 페란테에게 ' +
        '분리. (1)1461 비아나 공 카를로스(첫 부인 소생 장남) 사망 → 차남 페르난도 단독 후계자 부상 ' +
        '(2)1462~1472 카탈루냐 시민전쟁 — 1462 베이욘 조약(프랑스 루이 11세 동맹, 페르피냥· ' +
        '루시용 양도)으로 군사 지원 확보, 1472-10-17 페드랄베스 협정으로 카탈루냐 코르테스 항복 ' +
        '(3)1469 차남 페르난도-카스티야 이사벨 결혼 추진 (4)1474 며느리 이사벨의 카스티야 즉위 ' +
        '(5)1479-01-19 사망, 다음 날 차남이 페르난도 2세로 즉위. 카스페 협약 트라스타마라 분지를 ' +
        '약 60년 아라곤에 정착시킨 가교 군주이자, 페르난도-이사벨 결혼을 추진해 카스티야-아라곤 ' +
        '동군연합의 토대를 마련한 인물.',
    }
    const existingByPerson = await prisma.sovereignReign.findFirst({
      where: { personId: juanId, historicalCountryId: aragonHC.id },
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
        console.log(`  🔧 재임 정정: 아라곤 왕국 ${r.regnalName} ${r.regnalNumber}대`)
      } else {
        console.log(
          `  ⏭️  재임 스킵 (이미 정확): 아라곤 왕국 ${r.regnalName} ${r.regnalNumber}대`,
        )
      }
    } else {
      const slotConflict = await prisma.sovereignReign.findFirst({
        where: { historicalCountryId: aragonHC.id, regnalNumber: r.regnalNumber },
      })
      if (slotConflict) {
        console.warn(
          `  ⚠️  재임 충돌: 아라곤 왕국 ${r.regnalNumber}대 — 다른 인물 점유 (skip)`,
        )
      } else {
        await prisma.sovereignReign.create({
          data: {
            personId: juanId,
            historicalCountryId: aragonHC.id,
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
        console.log(
          `  ✅ 재임: 아라곤 왕국 ${r.regnalName} ${r.regnalNumber}대 (1458-06-27 ~ 1479-01-19)`,
        )
      }
    }
  } else {
    console.warn('  ⚠️  관직 정의 \'국왕\' 미존재 — 재임 스킵')
  }

  console.log(`✅ 페르난도 2세 부모 시딩 완료\n`)
}
