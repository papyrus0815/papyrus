/**
 * 카를 5세의 부모 시드
 *  - 아버지: 미남공 필리프(Philip the Handsome, 1478~1506) — 합스부르크 가문
 *  - 어머니: 후아나(Joanna of Castile, "광녀 후아나", 1479~1555) — 트라스타마라 가문
 *
 * ⚠️ 기존 데이터 보존 모드 — Person/Dynasty/Marriage/Parent-Child가 이미 있으면
 *    갱신하지 않고 스킵한다. 사망/능력치 등 누락 필드만 보강.
 *
 * 등록 항목:
 *  - 트라스타마라 가문 (Dynasty 인라인 생성)
 *  - 카스티야 왕국 (HistoricalCountry 인라인 생성, 펠리페 1세 재임 등록 용)
 *  - Person x2 (필리프·후아나 — 사망 정보·전기 포함)
 *  - PersonStats x2 (6축 능력치)
 *  - PersonSpouse x2 (양방향 결혼 관계, 1496-10-20 ~ 1506-09-25 사별)
 *  - 부자/모자 관계 (필리프 → 카를 5세, 후아나 → 카를 5세)
 *  - PersonCountryAffiliation x1 (필리프: 합스부르크령 네덜란드)
 *  - SovereignReign x2 (펠리페 1세 — 합스부르크령 네덜란드 공작 1482~1506,
 *                                    카스티야 왕국 국왕 1506-07~09)
 *
 * ⚠️ 의존: 카를 5세 시드(person.charles-v.seed)가 먼저 실행되어
 *    합스부르크 가문 + 카를 5세 Person이 존재해야 한다.
 */
import {
  AppointmentMethod,
  DeathType,
  HistoricalEntityKind,
  HistoricalStateType,
  TenureEndReason,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

// ── 트라스타마라 가문 명세 ─────────────────────────────────────────────────
const TRASTAMARA_DYNASTY = {
  name: '트라스타마라 가문',
  description:
    '1369년 카스티야 왕위계승 전쟁 끝에 이복형 페드로 1세를 살해한 엔리케 2세가 ' +
    '카스티야 왕위에 즉위하면서 시작된 이베리아 반도의 왕가. ' +
    '카스티야 왕국(1369~1504)·아라곤 왕국(1412~1516)·시칠리아·나바라·나폴리 등 ' +
    '15세기 이베리아 반도의 거의 모든 왕위를 차지. ' +
    '1469년 카스티야 이사벨 1세와 아라곤 페르난도 2세의 결혼으로 양 왕가가 통합되어 ' +
    '근대 스페인의 토대를 마련했고, 1492 그라나다 함락(레콩키스타 완료)·콜럼버스 신대륙 발견의 후원국. ' +
    '1504년 이사벨 1세 사망 후 후아나 1세가 카스티야 여왕으로 명목상 즉위했으나 ' +
    '정신 질환·유폐로 실권을 행사하지 못했고, 1516년 아들 카를 5세의 즉위로 ' +
    '트라스타마라 직계는 여왕 후아나를 끝으로 종결, 합스부르크 가문(스페인 합스부르크)으로 계승되었다.',
  startYear: 1369, // 엔리케 2세 즉위
  endYear: 1555, // 후아나 1세 사망 — 직계 종결
} as const

// ── 부모 인물 본문 ─────────────────────────────────────────────────────────
const PARENTS = [
  {
    name: '필리프',
    surname: '합스부르크',
    originalName: 'Philip I of Castile',
    regnalName: '1세',
    birthYear: 1478, birthMonth: 7, birthDay: 22,
    deathYear: 1506, deathMonth: 9, deathDay: 25,
    gender: 'MALE',
    dynastyName: '합스부르크 가문',
    birthPlaceText: '합스부르크령 네덜란드 브뤼주(Brugge) — 부르고뉴 백작 궁전',
    deathPlaceText: '카스티야 왕국 부르고스(Burgos) — 콘다스타블레 가문 저택',
    deathType: DeathType.ILLNESS,
    deathCause: '장티푸스 발열 (한국식 표기 — 동시기 진단명은 chillaginous fever, 일부 독살설)',
    deathNote:
      '1506-09-25 부르고스에서 갑작스러운 발열·구토 후 약 6일 만에 28세로 급사. ' +
      '직접 사인은 차가운 물을 마신 후의 장티푸스성 발열(chillaginous fever)로 기록되었으나, ' +
      '①짧은 잠복기·급격한 진행 ②장모 페르난도 2세와의 정치적 갈등 ③장모가 직전에 부르고스 인근에 체류 등 ' +
      '정황으로 동시기·후대에 페르난도 2세의 독살 의혹이 제기되어 21세기까지 학술 논쟁 지속. ' +
      '그러나 2007 시신 검사에서 비소·수은 등 중금속 검출 음성, 21세기 학설의 다수는 자연사 가설 지지. ' +
      '\n\n' +
      '【사후 영향】 ①28세 급사로 6세의 카를 5세가 합스부르크령 네덜란드 군주로 즉위 ' +
      '②후아나가 충격으로 정신 이상 악화 — 약 8개월간 시신과 동행하며 카스티야 횡단(전설) ' +
      '③장모 페르난도 2세가 카스티야 섭정으로 복귀, 후아나 유폐(1509 토르데시야스) ' +
      '④1516 페르난도 2세 사망 후 카를 5세가 모친 명의의 카스티야 왕위 계승. ' +
      '\n\n' +
      '【매장】 시신은 1525 카를 5세가 그라나다 왕립 예배당(Capilla Real de Granada)으로 이장, ' +
      '외조부모 가톨릭 양왕(이사벨 1세·페르난도 2세)·후아나·필리프 본인이 함께 안치. 21세기 현재까지 보존.',
    biography:
      '합스부르크 가문 출신. 신성로마황제 막시밀리안 1세와 부르고뉴 마리(Mary of Burgundy)의 장남. ' +
      '1482년 어머니 부르고뉴 마리가 25세에 승마 사고로 급사한 후 4세에 합스부르크령 네덜란드(부르고뉴 17개 주)의 ' +
      '명목 군주로 즉위, 아버지 막시밀리안 1세·이모 마르가레타 등의 섭정 하에 양육. ' +
      '"미남공(Felipe el Hermoso · le Beau · der Schöne)"이라는 별칭은 19세까지 유지된 외모에서 비롯. ' +
      '\n\n' +
      '1496-10-20 부르고스 근처에서 카스티야 이사벨 1세·아라곤 페르난도 2세("가톨릭 양왕")의 셋째 딸 ' +
      '후아나(Joanna)와 결혼. 양가의 합스부르크-트라스타마라 동맹은 프랑스를 양면에서 봉쇄하는 외교적 의도. ' +
      '결혼 직후 후아나가 광적으로 사랑에 빠진 반면 필리프는 다수의 정부를 두며 갈등 시작. ' +
      '\n\n' +
      '6명의 자녀를 둠 — ①엘레오노라(1498~) ②카를 5세(1500~1558) ③이사벨라(1501~) ' +
      '④페르디난트 1세(1503~1564, 후일 신성로마황제·오스트리아 합스부르크 시조) ' +
      '⑤마리아(1505~) ⑥카타리나(1507~, 사후 출생). ' +
      '\n\n' +
      '1504-11-26 장모 이사벨 1세 사망으로 후아나가 카스티야 여왕 후아나 1세 즉위, 필리프는 ' +
      '왕배(王配 — King consort)로 카스티야 왕위 공동 보유. 1506-07 부부가 카스티야 도착, ' +
      '필리프가 〈비야파필라 합의(Concordia de Villafáfila)〉로 후아나의 정신 이상을 명분 삼아 ' +
      '카스티야 단독 통치권 확보. 그러나 통치 시작 약 2개월 만인 1506-09-25 부르고스에서 28세로 급사, ' +
      '카를 5세 즉위·후아나 유폐·페르난도 2세 섭정 복귀의 직접 도화선이 되었다.',
    influence: 65,
    stats: {
      politics: 60,
      military: 55,
      diplomacy: 65,
      intellect: 50,
      charisma: 75,
      administration: 50,
      notes:
        '외모·매력으로 "미남공" 별칭. 그러나 28세 급사로 본격 통치 시간이 짧아 평가 보류. ' +
        '카리스마(외모·궁정 매너)는 동시기 평가 우수, 행정·군사는 큰 업적 없음. ' +
        '1506 〈비야파필라 합의〉로 후아나의 정신 이상을 정치 도구로 활용한 점은 정치적 기민함의 사례.',
    },
  },
  {
    name: '후아나',
    surname: '트라스타마라',
    originalName: 'Joanna of Castile',
    regnalName: '1세',
    birthYear: 1479, birthMonth: 11, birthDay: 6,
    deathYear: 1555, deathMonth: 4, deathDay: 12,
    gender: 'FEMALE',
    dynastyName: '트라스타마라 가문',
    birthPlaceText: '카스티야 왕국 톨레도(Toledo)',
    deathPlaceText: '카스티야 왕국 토르데시야스(Tordesillas) — 산타 클라라 수녀원',
    deathType: DeathType.ILLNESS,
    deathCause: '말년 욕창 합병증 + 노쇠',
    deathNote:
      '1509-02-15 시동생 페르난도 2세에 의해 토르데시야스 산타 클라라 수녀원에 사실상 유폐, ' +
      '1555-04-12 사망 시까지 약 46년간 수녀원에 갇혀 지냄. 향년 75세. ' +
      '말년 약 1년간 침대에 거의 누워만 있어 욕창이 심각해졌고 1555-03 부활절 이후 거동 불능, ' +
      '4월 11일 성 금요일에 임종성사를 받고 4월 12일 부활절 토요일 새벽 사망. ' +
      '\n\n' +
      '【유폐의 배경】 1506-09 남편 미남공 필리프 사망 후 후아나의 정신 이상이 결정적으로 악화 — ' +
      '필리프의 시신을 약 8개월간 동행해 카스티야를 횡단했다는 전설(실제는 부르고스 → 토르케마다 → 토르데시야스 약 50km). ' +
      '아버지 페르난도 2세가 1509 토르데시야스 유폐 결정. 아들 카를 5세도 1517 스페인 도착 후 ' +
      '어머니를 형식상 카스티야·아라곤 공동 군주로 유지하면서도 실제 면회는 거의 허용하지 않음. ' +
      '\n\n' +
      '【"광녀 후아나(Juana la Loca)"】 21세기 의학사·심리사 연구에서는 ' +
      '후아나의 정신 상태에 대한 진단이 다양하다 — ①조현병 ②양극성 정동장애 ③강박증 ' +
      '④우울증 ⑤정신 이상은 거의 없었고 정치적 음모로 유폐되었다는 견해까지. ' +
      '특히 ⑤설은 1808 페르디난트 7세가 후아나를 "스페인 첫 번째 합법 군주"로 재평가하면서 부상했고, ' +
      '21세기에도 페미니즘 사학에서 "남성 권력에 의한 여성 군주 격리"의 사례로 재해석. ' +
      '\n\n' +
      '【매장】 시신은 그라나다 왕립 예배당(Capilla Real de Granada)으로 이장, ' +
      '부모(가톨릭 양왕 이사벨 1세·페르난도 2세)·남편(미남공 필리프)·동생(미겔)이 함께 안치. ' +
      '21세기 현재까지 보존.',
    biography:
      '카스티야 왕국 이사벨 1세와 아라곤 왕국 페르난도 2세("가톨릭 양왕 — Reyes Católicos")의 셋째 딸. ' +
      '톨레도에서 태어나 어머니 이사벨 1세의 직접 교육으로 라틴어·프랑스어·역사·신학 등 인문 교육. ' +
      '\n\n' +
      '1496-10-20 합스부르크령 네덜란드의 미남공 필리프와 결혼. 양가의 합스부르크-트라스타마라 동맹은 ' +
      '프랑스를 양면에서 봉쇄하는 외교적 의도. 결혼 직후 후아나가 광적으로 필리프에게 사랑에 빠진 반면 ' +
      '필리프는 다수의 정부를 두며 갈등 시작. 후아나의 격렬한 질투·우울 발작이 동시기에도 기록됨. ' +
      '\n\n' +
      '6명의 자녀를 둠 — 카를 5세·페르디난트 1세·이사벨라·엘레오노라·마리아·카타리나. ' +
      '\n\n' +
      '1504-11-26 어머니 이사벨 1세 사망으로 카스티야 여왕 후아나 1세 즉위. ' +
      '아버지 페르난도 2세가 카스티야 섭정 시도, 그러나 카스티야 의회(코르테스)는 후아나·필리프 부부를 인정. ' +
      '1506-09-25 남편 필리프 급사 후 정신 이상 결정적 악화 — 시신 동행 횡단 전설. ' +
      '1509-02-15 아버지 페르난도 2세에 의해 토르데시야스 산타 클라라 수녀원에 사실상 유폐. ' +
      '\n\n' +
      '1516-01-23 아버지 페르난도 2세 사망. 아라곤·시칠리아·나폴리 왕위도 후아나에게 상속, ' +
      '카스티야·아라곤 통합 군주로서 명목상 1516~1555 약 39년간 재위. ' +
      '그러나 실제 통치는 아들 카를 5세가 1516 카스티야·아라곤 왕(카를로스 1세)으로 즉위해 사실상 단독 행사. ' +
      '후아나는 1555-04-12 토르데시야스에서 사망 시까지 약 46년간 유폐 상태로 명목 군주만 유지. ' +
      '\n\n' +
      '【장기 유산】 ①후아나 유폐로 카를 5세의 카스티야 왕위가 정당화 → 합스부르크 스페인의 출발 ' +
      '②"광녀 후아나" 신화는 19세기 낭만주의 회화·소설(특히 프란시스코 프라디야의 1877 〈광녀 후아나〉)에서 재조명 ' +
      '③20~21세기 페미니즘 사학에서 "남성 권력에 의한 여성 군주 격리"의 사례로 재해석.',
    influence: 60,
    stats: {
      politics: 35,
      military: 20,
      diplomacy: 40,
      intellect: 70,
      charisma: 50,
      administration: 25,
      notes:
        '어머니 이사벨 1세 직접 교육으로 인문 교양은 동시기 왕족 중에서도 우수(라틴어·프랑스어·신학). ' +
        '그러나 결혼 후 정신 이상 악화 + 1509 유폐로 실제 통치 능력 발휘 기회는 거의 없었음. ' +
        '46년간의 유폐는 후아나 본인의 한계 + 페르난도 2세·필리프·카를 5세의 정치적 의도가 결합한 결과. ' +
        '능력치 낮음은 "발휘 못 한 것"이지 본래적 무능을 의미하지 않음 — 21세기 페미니즘 사학의 재평가 진행 중.',
    },
  },
] as const

// ── 카스티야 왕국 HC 명세 (인라인 생성) ──────────────────────────────────
const CASTILE_HC_SPEC = {
  name: '카스티야 왕국',
  enName: 'Kingdom of Castile',
  description:
    '1230년 페르난도 3세가 레온 왕국과 카스티야 왕국을 영구 통합하면서 사실상 성립한 ' +
    '이베리아 반도 중북부의 가톨릭 왕국. 13~15세기 레콩키스타(국토 회복 운동)의 주도 세력으로 ' +
    '톨레도·세비야·코르도바 등을 점령하며 영토를 남쪽으로 확대. ' +
    '1469년 카스티야 이사벨 1세와 아라곤 페르난도 2세("가톨릭 양왕")의 결혼으로 양국 동군연합. ' +
    '1492 그라나다 함락(레콩키스타 완료)·콜럼버스 신대륙 발견의 후원국. ' +
    '1504 이사벨 1세 사망 → 후아나 1세 명목 즉위·1506 미남공 필리프 즉위·사망·1516 카를로스 1세 즉위로 ' +
    '합스부르크 가문 통치 시대 진입. 1715-06-29 부르봉 가문 펠리페 5세의 〈누에바 플란타 칙령(Decretos de Nueva Planta)〉으로 ' +
    '카스티야·아라곤·발렌시아 등이 단일 〈에스파냐 왕국〉으로 통합되며 약 485년 만에 정식 종결. ' +
    '근대 스페인의 정치·법·언어(카스티야어 = 스페인어)의 직접적 토대.',
  startYear: 1230,
  endYear: 1715,
  stateType: HistoricalStateType.KINGDOM,
  latitude: 40.4168, // 마드리드
  longitude: -3.7038,
} as const

// ── 아라곤 왕국 HC 명세 (인라인 생성) ────────────────────────────────────
const ARAGON_HC_SPEC = {
  name: '아라곤 왕국',
  enName: 'Kingdom of Aragon',
  description:
    '1035년 나바라 산초 3세의 사망과 분할 상속으로 차남 라미로 1세(Ramiro I)가 즉위하면서 ' +
    '사실상 성립한 이베리아 반도 동부의 가톨릭 왕국. 1137년 페트로닐라(Petronila) 여왕과 ' +
    '바르셀로나 백작 라몬 베렝게르 4세의 결혼으로 〈아라곤 연합왕국(Corona de Aragón — 아라곤·카탈루냐·발렌시아·마요르카)〉으로 확장. ' +
    '13세기 하이메 1세(Jaime I el Conquistador)의 발렌시아·마요르카 정복으로 영토 폭증, ' +
    '14~15세기 알폰소 5세(Alfonso V el Magnánimo)의 나폴리·시칠리아·사르데냐 합병으로 지중해 패권 확보. ' +
    '1412년 카스페 협약(Compromiso de Caspe)으로 카스티야 트라스타마라 가문의 페르난도 1세가 즉위, ' +
    '이후 약 100년간 트라스타마라 가문 직계 통치. 1469년 페르난도 2세와 카스티야 이사벨 1세("가톨릭 양왕")의 ' +
    '결혼으로 카스티야와 동군연합 — 근대 스페인의 토대. 1516년 페르난도 2세 사망 후 ' +
    '후아나 1세·아들 카를로스 1세 모자 공동 명목 군주, 1556년 펠리페 1세(=스페인 펠리페 2세) 단독 즉위. ' +
    '1715-06-29 부르봉 가문 펠리페 5세의 〈누에바 플란타 칙령(Decretos de Nueva Planta)〉으로 ' +
    '카스티야·발렌시아·아라곤 등이 단일 〈에스파냐 왕국〉으로 통합되며 약 680년 만에 정식 종결.',
  startYear: 1035,
  endYear: 1715,
  stateType: HistoricalStateType.KINGDOM,
  latitude: 41.6488, // 사라고사
  longitude: -0.8891,
} as const

// ── 결혼 명세 ──────────────────────────────────────────────────────────────
const MARRIAGE = {
  startYear: 1496, startMonth: 10, startDay: 20,
  endYear: 1506, endMonth: 9, endDay: 25,
  note:
    '1496-10-20 카스티야 부르고스 인근에서 결혼. 양가의 합스부르크-트라스타마라 동맹 — ' +
    '프랑스를 양면에서 봉쇄하는 외교적 의도. 1506-09-25 필리프 급사로 사별. ' +
    '6자녀 — 엘레오노라·카를 5세·이사벨라·페르디난트 1세·마리아·카타리나(사후 출생).',
}

export async function seedCharlesVParents(prisma: PrismaService): Promise<void> {
  console.log('\n👨‍👩‍👦 카를 5세 부모 시딩 시작 (기존 데이터 보존 모드)...')

  // ── 사전 의존성 ────────────────────────────────────────────────────────
  const admin = await prisma.account.findUnique({
    where: { username: 'admin' },
  })
  if (!admin) {
    console.warn('  ⚠️  admin 계정이 없어 시딩을 건너뜀')
    return
  }

  const charlesV = await prisma.person.findFirst({
    where: { originalName: 'Charles V, Holy Roman Emperor' },
    select: { id: true, fatherId: true, motherId: true },
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

  // ── 0) 트라스타마라 가문 등록 ────────────────────────────────────────────
  let trastamaraDynasty = await prisma.dynasty.findFirst({
    where: { name: TRASTAMARA_DYNASTY.name },
  })
  if (trastamaraDynasty) {
    console.log(`  ⏭️  가문 이미 존재: ${TRASTAMARA_DYNASTY.name}`)
  } else {
    trastamaraDynasty = await prisma.dynasty.create({
      data: {
        name: TRASTAMARA_DYNASTY.name,
        description: TRASTAMARA_DYNASTY.description,
        startDate: new Date(TRASTAMARA_DYNASTY.startYear, 0, 1),
        endDate: new Date(TRASTAMARA_DYNASTY.endYear, 11, 31),
      },
    })
    console.log(`  ✅ 가문 생성: ${TRASTAMARA_DYNASTY.name} (id=${trastamaraDynasty.id})`)
  }

  // ── 1) 합스부르크령 네덜란드 HC 조회 (필리프 affiliation 용) ────────────
  const habsburgNetherlandsHC = await prisma.historicalCountry.findFirst({
    where: { name: '합스부르크령 네덜란드' },
    select: { id: true },
  })

  // ── 2) 부모 Person 등록 ────────────────────────────────────────────────
  const personIdMap = new Map<string, string>()

  for (const p of PARENTS) {
    const dynastyId =
      p.dynastyName === '합스부르크 가문'
        ? habsburgDynasty.id
        : trastamaraDynasty.id

    const existing = await prisma.person.findFirst({
      where: { originalName: p.originalName },
    })

    let pid: string
    if (existing) {
      pid = existing.id
      console.log(`  ⏭️  인물 이미 존재 — 스킵: ${p.originalName} (id=${pid})`)

      // 누락 필드 보강
      const patch: any = {}
      if (!existing.dynastyId) patch.dynastyId = dynastyId
      if (!existing.deathType) patch.deathType = p.deathType
      if (!existing.deathCause) patch.deathCause = p.deathCause
      if (!existing.deathNote) patch.deathNote = p.deathNote
      if (!existing.biography) patch.biography = p.biography
      if (!existing.birthPlaceText) patch.birthPlaceText = p.birthPlaceText
      if (!existing.deathPlaceText) patch.deathPlaceText = p.deathPlaceText
      if (existing.influence == null) patch.influence = p.influence
      if (Object.keys(patch).length > 0) {
        await prisma.person.update({ where: { id: pid }, data: patch })
        console.log(`    🔧 필드 보강: ${Object.keys(patch).join(', ')}`)
      }
    } else {
      const created = await prisma.person.create({
        data: {
          name: p.name,
          surname: p.surname,
          originalName: p.originalName,
          regnalName: p.regnalName,
          biography: p.biography,
          birthDate: new Date(p.birthYear, p.birthMonth - 1, p.birthDay),
          birthEra: 'AD' as any,
          deathDate: new Date(p.deathYear, p.deathMonth - 1, p.deathDay),
          deathEra: 'AD' as any,
          gender: p.gender,
          nameDisplayOrder: 'western' as any,
          dynastyId,
          birthPlaceText: p.birthPlaceText,
          deathPlaceText: p.deathPlaceText,
          deathType: p.deathType,
          deathCause: p.deathCause,
          deathNote: p.deathNote,
          influence: p.influence,
          accountId: admin.id,
        },
      })
      pid = created.id
      console.log(`  ✅ 인물 생성: ${p.originalName} (id=${pid})`)
    }
    personIdMap.set(p.originalName, pid)

    // PersonStats
    const statsExists = await prisma.personStats.findFirst({
      where: { personId: pid, accountId: admin.id },
    })
    if (statsExists) {
      console.log(`    ⏭️  능력치 스킵 (이미 존재)`)
    } else {
      await prisma.personStats.create({
        data: {
          personId: pid,
          accountId: admin.id,
          politics: p.stats.politics,
          military: p.stats.military,
          diplomacy: p.stats.diplomacy,
          intellect: p.stats.intellect,
          charisma: p.stats.charisma,
          administration: p.stats.administration,
          notes: p.stats.notes,
        },
      })
      console.log(
        `    ✅ 능력치: 정치 ${p.stats.politics}·군사 ${p.stats.military}·외교 ${p.stats.diplomacy}·` +
          `학식 ${p.stats.intellect}·카리스마 ${p.stats.charisma}·행정 ${p.stats.administration}`,
      )
    }
  }

  // ── 3) 합스부르크령 네덜란드 affiliation (필리프) ───────────────────────
  if (habsburgNetherlandsHC) {
    const philipId = personIdMap.get('Philip I of Castile')!
    const affExists = await prisma.personCountryAffiliation.findFirst({
      where: {
        personId: philipId,
        historicalCountryId: habsburgNetherlandsHC.id,
        affiliationType: 'CITIZENSHIP' as any,
      },
    })
    if (affExists) {
      console.log(`  ⏭️  소속국가 스킵: 필리프 → 합스부르크령 네덜란드`)
    } else {
      await prisma.personCountryAffiliation.create({
        data: {
          personId: philipId,
          historicalCountryId: habsburgNetherlandsHC.id,
          affiliationType: 'CITIZENSHIP' as any,
          priority: 0,
        },
      })
      console.log(`  ✅ 소속국가: 필리프 → 합스부르크령 네덜란드 (출생지 + 1482~1506 군주)`)
    }
  }

  // ── 4) 결혼 관계 ───────────────────────────────────────────────────────
  const philipId = personIdMap.get('Philip I of Castile')!
  const joannaId = personIdMap.get('Joanna of Castile')!
  const startDate = new Date(MARRIAGE.startYear, MARRIAGE.startMonth - 1, MARRIAGE.startDay)
  const endDate = new Date(MARRIAGE.endYear, MARRIAGE.endMonth - 1, MARRIAGE.endDay)

  const existAB = await prisma.personSpouse.findFirst({
    where: { personId: philipId, spouseId: joannaId },
  })
  if (existAB) {
    console.log(`  ⏭️  결혼 스킵 (이미 존재): 필리프 → 후아나`)
  } else {
    await prisma.personSpouse.create({
      data: {
        personId: philipId,
        spouseId: joannaId,
        marriageStartDate: startDate,
        marriageEndDate: endDate,
        note: MARRIAGE.note,
      },
    })
    console.log(`  ✅ 결혼: 필리프 → 후아나 (1496-10-20 ~ 1506-09-25 사별)`)
  }
  const existBA = await prisma.personSpouse.findFirst({
    where: { personId: joannaId, spouseId: philipId },
  })
  if (existBA) {
    console.log(`  ⏭️  결혼 스킵 (이미 존재): 후아나 → 필리프`)
  } else {
    await prisma.personSpouse.create({
      data: {
        personId: joannaId,
        spouseId: philipId,
        marriageStartDate: startDate,
        marriageEndDate: endDate,
        note: MARRIAGE.note,
      },
    })
    console.log(`  ✅ 결혼: 후아나 → 필리프`)
  }

  // ── 5a) 카스티야 왕국 HC 인라인 생성 ────────────────────────────────────
  let castileHC = await prisma.historicalCountry.findFirst({
    where: { name: CASTILE_HC_SPEC.name },
    select: { id: true },
  })
  if (castileHC) {
    console.log(`  ⏭️  역사 국가 이미 존재: ${CASTILE_HC_SPEC.name}`)
  } else {
    const created = await prisma.historicalCountry.create({
      data: {
        name: CASTILE_HC_SPEC.name,
        enName: CASTILE_HC_SPEC.enName,
        description: CASTILE_HC_SPEC.description,
        startEra: 'AD' as any,
        startYear: CASTILE_HC_SPEC.startYear,
        endEra: 'AD' as any,
        endYear: CASTILE_HC_SPEC.endYear,
        stateType: CASTILE_HC_SPEC.stateType,
        entityKind: HistoricalEntityKind.STATE,
        latitude: CASTILE_HC_SPEC.latitude,
        longitude: CASTILE_HC_SPEC.longitude,
        accountId: admin.id,
      },
    })
    castileHC = { id: created.id }
    console.log(`  ✅ 역사 국가 생성: ${CASTILE_HC_SPEC.name} (id=${created.id})`)
  }

  // ── 5a-2) 아라곤 왕국 HC 인라인 생성 ────────────────────────────────────
  let aragonHC = await prisma.historicalCountry.findFirst({
    where: { name: ARAGON_HC_SPEC.name },
    select: { id: true },
  })
  if (aragonHC) {
    console.log(`  ⏭️  역사 국가 이미 존재: ${ARAGON_HC_SPEC.name}`)
  } else {
    const created = await prisma.historicalCountry.create({
      data: {
        name: ARAGON_HC_SPEC.name,
        enName: ARAGON_HC_SPEC.enName,
        description: ARAGON_HC_SPEC.description,
        startEra: 'AD' as any,
        startYear: ARAGON_HC_SPEC.startYear,
        endEra: 'AD' as any,
        endYear: ARAGON_HC_SPEC.endYear,
        stateType: ARAGON_HC_SPEC.stateType,
        entityKind: HistoricalEntityKind.STATE,
        latitude: ARAGON_HC_SPEC.latitude,
        longitude: ARAGON_HC_SPEC.longitude,
        accountId: admin.id,
      },
    })
    aragonHC = { id: created.id }
    console.log(`  ✅ 역사 국가 생성: ${ARAGON_HC_SPEC.name} (id=${created.id})`)
  }

  // ── 5a-3) 가문 통치 관계 등록 ────────────────────────────────────────────
  // 트라스타마라 → 카스티야(1369~1504)·아라곤(1412~1516) + 합스부르크 → 아라곤(1516~1700)
  const habsburgDynasty2 = await prisma.dynasty.findFirst({
    where: { name: '합스부르크 가문' },
    select: { id: true },
  })

  type DynastyRuleSpec2 = {
    dynastyId: string
    dynastyName: string
    historicalCountryId: string
    countryName: string
    startYear: number
    endYear?: number
  }
  const PARENTS_DYNASTY_RULES: DynastyRuleSpec2[] = [
    {
      dynastyId: trastamaraDynasty.id,
      dynastyName: '트라스타마라 가문',
      historicalCountryId: castileHC.id,
      countryName: '카스티야 왕국',
      startYear: 1369, // 엔리케 2세 즉위
      endYear: 1504, // 이사벨 1세 사망 (직계 사실상 종결, 후아나 1세 트라스타마라 마지막)
    },
    {
      dynastyId: trastamaraDynasty.id,
      dynastyName: '트라스타마라 가문',
      historicalCountryId: aragonHC.id,
      countryName: '아라곤 왕국',
      startYear: 1412, // 카스페 협약 — 페르난도 1세 즉위 (카스티야 트라스타마라 분지)
      endYear: 1516, // 페르난도 2세 사망 — 직계 종결
    },
  ]
  if (habsburgDynasty2) {
    PARENTS_DYNASTY_RULES.push({
      dynastyId: habsburgDynasty2.id,
      dynastyName: '합스부르크 가문',
      historicalCountryId: aragonHC.id,
      countryName: '아라곤 왕국',
      startYear: 1516, // 카를로스 1세 즉위
      endYear: 1700, // 카를로스 2세 사망 — 합스부르크 스페인 종결
    })
  }
  for (const rule of PARENTS_DYNASTY_RULES) {
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

  // ── 5b) 펠리페 1세 재임 등록 (합스부르크령 네덜란드 공작 + 카스티야 국왕) ─
  const dukeDef = await prisma.governmentPositionDefinition.findFirst({
    where: { title: '공작' },
    select: { id: true },
  })
  const kingDef = await prisma.governmentPositionDefinition.findFirst({
    where: { title: '국왕' },
    select: { id: true },
  })

  // ⚠️ regnalNumber는 "n대" — HC startYear부터 즉위 순서. 이름 서수("1세")와 구분.
  //   ① 합스부르크령 네덜란드(HC start=1482): 어머니 마리 부르고뉴 사망 직후 즉위 → 1대 (HC 첫 군주)
  //      regnalName "필리프 1세" — 네덜란드어 Filips I
  //   ② 카스티야 왕국(HC start=1230, 페르난도 3세): 펠리페 즉위 시점에 13대 후아나 1세 다음
  //      → 14대 (페르난도 3·알폰소 10·산초 4·페르난도 4·알폰소 11·페드로 1·엔리케 2·후안 1·
  //              엔리케 3·후안 2·엔리케 4·이사벨 1·후아나 1 → 펠리페 1)
  //      regnalName "펠리페 1세" — 스페인어 Felipe I
  type ReignSpec = {
    historicalCountryId: string
    historicalCountryName: string
    positionDefinitionId: string | null
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

  const philipReigns: ReignSpec[] = []
  if (habsburgNetherlandsHC && dukeDef) {
    philipReigns.push({
      historicalCountryId: habsburgNetherlandsHC.id,
      historicalCountryName: '합스부르크령 네덜란드',
      positionDefinitionId: dukeDef.id,
      positionTitle: '공작',
      regnalNumber: 1, // 합스부르크령 네덜란드의 첫 군주 (HC startYear=1482 직후 즉위)
      regnalName: '필리프 1세',
      startDate: new Date(1482, 2, 27), // 1482-03-27 어머니 마리 부르고뉴 사망
      endDate: new Date(1506, 8, 25), // 1506-09-25 본인 사망
      appointmentMethod: AppointmentMethod.HEREDITARY,
      endReason: TenureEndReason.DEATH_IN_OFFICE,
      endReasonDetail: '1506-09-25 부르고스에서 28세 급사 (장티푸스 추정).',
      notes:
        '4세에 어머니 마리 부르고뉴 승마 사고 사망으로 즉위. 약 1494까지 아버지 막시밀리안 1세 + ' +
        '이모 마르가레타 섭정. 1494 친정 시작 후 합스부르크령 네덜란드 17개 주를 통합 운영. ' +
        '1506 카스티야 즉위 직전까지 약 24년간 사실상 단일 군주. 사후 6세의 카를 5세가 2대로 즉위.',
    })
  } else {
    if (!habsburgNetherlandsHC) console.warn('    ⚠️  합스부르크령 네덜란드 HC 미존재 — 재임 스킵')
    if (!dukeDef) console.warn('    ⚠️  관직 정의 \'공작\' 미존재 — 재임 스킵')
  }
  if (castileHC && kingDef) {
    philipReigns.push({
      historicalCountryId: castileHC.id,
      historicalCountryName: '카스티야 왕국',
      positionDefinitionId: kingDef.id,
      positionTitle: '국왕',
      regnalNumber: 14, // 카스티야 왕국 14대 (HC start=1230 페르난도 3세부터 후아나 1세 다음)
      regnalName: '펠리페 1세',
      startDate: new Date(1506, 6, 12), // 1506-07-12 비야파필라 합의 후 카스티야 의회(코르테스) 승인
      endDate: new Date(1506, 8, 25), // 1506-09-25 사망
      appointmentMethod: AppointmentMethod.OTHER, // jure uxoris (배우자 권리)
      endReason: TenureEndReason.DEATH_IN_OFFICE,
      endReasonDetail: '재위 약 75일 만인 1506-09-25 부르고스에서 급사 (장티푸스 추정).',
      notes:
        '1504-11-26 장모 이사벨 1세 사망으로 후아나(13대 후아나 1세)가 카스티야 여왕 즉위. ' +
        '1506-04-26 부부가 카스티야 도착, 1506-06-27 〈비야파필라 합의(Concordia de Villafáfila)〉로 ' +
        '필리프가 후아나의 정신 이상을 명분 삼아 카스티야 단독 통치권 확보. ' +
        '1506-07-12 카스티야 의회(코르테스) 승인 — 펠리페 1세로 즉위(jure uxoris). ' +
        '그러나 약 75일 만에 사망, 장모 페르난도 2세가 카스티야 섭정 복귀.',
    })
  } else {
    if (!castileHC) console.warn('    ⚠️  카스티야 왕국 HC 생성 실패 — 재임 스킵')
    if (!kingDef) console.warn('    ⚠️  관직 정의 \'국왕\' 미존재 — 재임 스킵')
  }

  const yyyymmdd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  // ── 5c) 후아나 1세 재임 등록 (카스티야 왕국 13대) ────────────────────────
  // ⚠️ regnalNumber 13 — HC start=1230 페르난도 3세부터 즉위 순서.
  //   페르난도 3·알폰소 10·산초 4·페르난도 4·알폰소 11·페드로 1·엔리케 2·후안 1·
  //   엔리케 3·후안 2·엔리케 4·이사벨 1 → 13대 후아나 1세 → 14대 펠리페 1세 → 15대 카를로스 1세.
  //
  //  재위 기간 — 1504-11-26 모친 이사벨 1세 사망 ~ 1555-04-12 본인 사망. 약 50년.
  //  명목상 군주 — 1506-07~09 약 75일 남편 펠리페 1세와 공동 명목, 1509-02 토르데시야스 유폐 후
  //  1516 부친 페르난도 2세 사망까지는 부친 섭정 + 1516~ 아들 카를 5세와 명목 공동 군주
  //  (실제 통치는 카를 5세 단독). 1555 사망 시까지 명목상 카스티야 여왕 지위 유지.
  const joannaReigns: ReignSpec[] = []
  if (castileHC && kingDef) {
    joannaReigns.push({
      historicalCountryId: castileHC.id,
      historicalCountryName: '카스티야 왕국',
      positionDefinitionId: kingDef.id,
      positionTitle: '국왕',
      regnalNumber: 13,
      regnalName: '후아나 1세',
      startDate: new Date(1504, 10, 26), // 1504-11-26 모친 이사벨 1세 사망
      endDate: new Date(1555, 3, 12), // 1555-04-12 본인 사망 (토르데시야스 유폐 중)
      appointmentMethod: AppointmentMethod.HEREDITARY,
      endReason: TenureEndReason.DEATH_IN_OFFICE,
      endReasonDetail:
        '1555-04-12 토르데시야스 산타 클라라 수녀원에서 75세 사망 (말년 욕창 합병증 + 노쇠). ' +
        '명목상으로는 사망 시까지 카스티야 여왕 지위 유지 — 약 50년 명목 재위.',
      notes:
        '1504-11-26 모친 이사벨 1세 사망으로 카스티야 여왕 즉위 — 트라스타마라 가문의 정통 계승자. ' +
        '1506-07-12 ~ 09-25 약 75일간 남편 펠리페 1세(14대)와 공동 명목 군주(〈비야파필라 합의〉로 ' +
        '펠리페가 단독 통치권 확보, 후아나는 명목만 유지). 1506-09-25 펠리페 급사 후 정신 이상 결정적 악화 — ' +
        '1509-02-15 부친 페르난도 2세에 의해 토르데시야스 산타 클라라 수녀원 유폐 결정. ' +
        '1516-01-23 부친 페르난도 2세 사망으로 아라곤·시칠리아·나폴리·사르데냐 왕위도 상속 — ' +
        '카스티야·아라곤 통합 명목 군주. 그러나 같은 날 아들 카를 5세가 카스티야·아라곤 왕(카를로스 1세, 15대) ' +
        '즉위해 사실상 단독 통치. 후아나는 1555-04-12 사망 시까지 약 46년간 토르데시야스 유폐 상태로 ' +
        '명목상 공동 군주만 유지. ' +
        '21세기 페미니즘 사학에서 "남성 권력에 의한 여성 군주 격리"의 사례로 재해석 — 약 50년의 명목 재위 ' +
        '중 실제 통치 권한 행사 기간은 1504-11 ~ 1506-07 약 20개월에 불과.',
    })
  } else {
    if (!castileHC) console.warn('    ⚠️  카스티야 왕국 HC 미존재 — 후아나 1세 카스티야 재임 스킵')
    if (!kingDef) console.warn('    ⚠️  관직 정의 \'국왕\' 미존재 — 후아나 1세 카스티야 재임 스킵')
  }

  // ── 후아나 1세 아라곤 21대 재임 ─────────────────────────────────────────
  // 아라곤 HC start=1035 라미로 1세부터 즉위 순서:
  //  1.라미로 1세 → 2.산초 라미레스 → 3.페드로 1세 → 4.알폰소 1세 → 5.라미로 2세 →
  //  6.페트로닐라 → 7.알폰소 2세 → 8.페드로 2세 → 9.하이메 1세 → 10.페드로 3세 →
  //  11.알폰소 3세 → 12.하이메 2세 → 13.알폰소 4세 → 14.페드로 4세 → 15.후안 1세 →
  //  16.마르틴 1세 → [1410~1412 인테르레그눔, 1412 카스페 협약] →
  //  17.페르난도 1세 → 18.알폰소 5세 → 19.후안 2세 → 20.페르난도 2세 → 21.후아나 1세
  if (aragonHC && kingDef) {
    joannaReigns.push({
      historicalCountryId: aragonHC.id,
      historicalCountryName: '아라곤 왕국',
      positionDefinitionId: kingDef.id,
      positionTitle: '국왕',
      regnalNumber: 21,
      regnalName: '후아나 1세',
      startDate: new Date(1516, 0, 23),
      endDate: new Date(1555, 3, 12),
      appointmentMethod: AppointmentMethod.HEREDITARY,
      endReason: TenureEndReason.DEATH_IN_OFFICE,
      endReasonDetail:
        '1555-04-12 토르데시야스 산타 클라라 수녀원에서 75세 사망. 약 39년 명목 재위. ' +
        '실제 통치는 즉위 시점부터 아들 카를로스 1세가 사실상 단독 행사.',
      notes:
        '1516-01-23 부친 페르난도 2세 사망으로 아라곤·시칠리아·나폴리·사르데냐·발렌시아·마요르카 ' +
        '왕위 동시 상속. 그러나 ①본인 1509-02 이래 토르데시야스 유폐 ②부친 페르난도 2세의 유언으로 ' +
        '아들 카를로스 1세가 카스페 협약(1412) 이래 약 100년 간의 트라스타마라 직계 계승자로 ' +
        '같은 날 아라곤 왕(22대)으로 명목 공동 즉위 — 약 17개월 후 1517-09 본인 첫 스페인 방문 시 ' +
        '코르테스(아라곤 의회) 정식 승인. 후아나는 1555 사망 시까지 약 39년간 명목상 공동 군주만 유지, ' +
        '실제 통치 권한은 단 하루도 행사하지 못함. ' +
        '1469 카스티야 이사벨 1세-아라곤 페르난도 2세 결혼 이래의 카스티야-아라곤 동군연합 흐름이 ' +
        '후아나 1세를 통해 합스부르크 가문으로 이전, 1715 누에바 플란타 칙령으로 정식 통합 〈에스파냐 왕국〉이 ' +
        '성립할 때까지 약 200년의 동군연합 시대의 결정적 매개자.',
    })
  } else {
    if (!aragonHC) console.warn('    ⚠️  아라곤 왕국 HC 생성 실패 — 후아나 1세 아라곤 재임 스킵')
    if (!kingDef) console.warn('    ⚠️  관직 정의 \'국왕\' 미존재 — 후아나 1세 아라곤 재임 스킵')
  }

  for (const r of philipReigns) {
    // 기존 재임 레코드 조회 — personId + historicalCountryId 기준
    const existingByPerson = await prisma.sovereignReign.findFirst({
      where: { personId: philipId, historicalCountryId: r.historicalCountryId },
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
    // 신규 생성 — 동일 regnalNumber 슬롯이 점유돼 있다면 충돌
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
        personId: philipId,
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
    console.log(
      `  ✅ 재임: ${r.historicalCountryName} ${r.regnalName} ${r.regnalNumber}대 (${yyyymmdd(r.startDate)} ~ ${yyyymmdd(r.endDate)})`,
    )
  }

  // ── 5d) 후아나 1세 재임 루프 (구조는 펠리페 재임 루프와 동일) ──────────
  for (const r of joannaReigns) {
    const existingByPerson = await prisma.sovereignReign.findFirst({
      where: { personId: joannaId, historicalCountryId: r.historicalCountryId },
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
        personId: joannaId,
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
    console.log(
      `  ✅ 재임: ${r.historicalCountryName} ${r.regnalName} ${r.regnalNumber}대 (${yyyymmdd(r.startDate)} ~ ${yyyymmdd(r.endDate)})`,
    )
  }

  // ── 5e) PersonCountryAffiliation (후아나 → 카스티야 왕국 CITIZENSHIP) ──
  if (castileHC) {
    const joannaAffExists = await prisma.personCountryAffiliation.findFirst({
      where: {
        personId: joannaId,
        historicalCountryId: castileHC.id,
        affiliationType: 'CITIZENSHIP' as any,
      },
    })
    if (joannaAffExists) {
      console.log(`  ⏭️  소속국가 스킵: 후아나 → 카스티야 왕국`)
    } else {
      await prisma.personCountryAffiliation.create({
        data: {
          personId: joannaId,
          historicalCountryId: castileHC.id,
          affiliationType: 'CITIZENSHIP' as any,
          priority: 0,
        },
      })
      console.log(`  ✅ 소속국가: 후아나 → 카스티야 왕국 (출생지 + 1504~1555 명목 군주)`)
    }
  }

  // ── 6) 부자/모자 관계 (카를 5세에 부모 연결) ─────────────────────────────
  if (charlesV.fatherId) {
    console.log(`  ⏭️  부자 스킵 (이미 연결): 카를 5세 fatherId=${charlesV.fatherId}`)
  } else {
    await prisma.person.update({
      where: { id: charlesV.id },
      data: { fatherId: philipId },
    })
    console.log(`  ✅ 부자: 미남공 필리프 → 카를 5세`)
  }
  if (charlesV.motherId) {
    console.log(`  ⏭️  모자 스킵 (이미 연결): 카를 5세 motherId=${charlesV.motherId}`)
  } else {
    await prisma.person.update({
      where: { id: charlesV.id },
      data: { motherId: joannaId },
    })
    console.log(`  ✅ 모자: 후아나 → 카를 5세`)
  }

  console.log(`✅ 카를 5세 부모 시딩 완료\n`)
}
