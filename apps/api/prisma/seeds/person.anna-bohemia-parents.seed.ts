/**
 * 안나 폰 뵈멘 운트 운가른(Anna of Bohemia and Hungary, 1503~1547)의 부모 시드
 *
 *  - 아버지: 블라디슬라프 2세 야기에우오 (Vladislaus II of Bohemia and Hungary, 1456~1516)
 *    — 보헤미아 왕(1471~1516)·헝가리 왕(1490~1516)·야기에우오 가문
 *  - 어머니: 앤 드 푸아 칸달 (Anne of Foix-Candale, 1484~1506) — 프랑스 푸아-칸달 백작 가문,
 *    1506년 라요시 2세 출산 후 산욕열 사망
 *
 * 인라인 생성:
 *  - 야기에우오 가문 (Dynasty)
 *  - 보헤미아 왕국 (HistoricalCountry, 1198~1918, 모던 CZ 연결)
 *  - 헝가리 왕국 (HistoricalCountry, 1000~1918, 모던 HU 연결)
 *
 * 등록 항목:
 *  - 야기에우오 가문
 *  - 보헤미아 왕국 + 헝가리 왕국 HC
 *  - DynastyRule x4:
 *      야기에우오 → 보헤미아 (1471~1526) + 헝가리 (1490~1526)
 *      합스부르크 → 보헤미아 (1526~1918) + 헝가리 (1526~1918)
 *  - Person x2 (블라디슬라프 2세·앤 드 푸아)
 *  - PersonStats x2
 *  - PersonSpouse x2 (양방향 결혼, 1502-09-29 ~ 1506-07-26 사별)
 *  - PersonCountryAffiliation x2
 *  - 부자/모자 관계: 블라디슬라프 + 앤 드 푸아 → 안나 폰 뵈멘
 *  - 안나 폰 뵈멘 dynastyId 보강 (야기에우오)
 *  - SovereignReign x4:
 *      (1) 블라디슬라프 2세 보헤미아 16대 (1471-08-22 ~ 1516-03-13)
 *      (2) 블라디슬라프 2세 헝가리 34대 (1490-09-18 ~ 1516-03-13)
 *      (3) 페르디난트 1세 보헤미아 18대 (1526-10-24 ~ 1564-07-25) — 기존 인물
 *      (4) 페르디난트 1세 헝가리 36대 (1526-12-16 ~ 1564-07-25) — 기존 인물
 *
 * ⚠️ 의존: person.maximilian-ii-parents.seed (페르디난트 1세 + 안나 폰 뵈멘 등록)
 */
import {
  AppointmentMethod,
  DeathType,
  HistoricalEntityKind,
  HistoricalStateType,
  TenureEndReason,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

// ── 야기에우오 가문 명세 ───────────────────────────────────────────────────
const JAGIELLON_DYNASTY = {
  name: '야기에우오 가문',
  description:
    '1386년 리투아니아 대공 요가일라(Jogaila)가 폴란드 여왕 야드비가와 결혼해 폴란드 왕 ' +
    '브와디스와프 2세 야기에우오로 즉위하면서 출발한 폴란드-리투아니아 왕가. 약 186년 통치 ' +
    '(1386~1572). 폴란드·리투아니아 외에 보헤미아(1471~1526)와 헝가리(1490~1526)도 한 세대 통치했다. ' +
    '15세기 말 ~ 16세기 초 중유럽의 결정적 왕가 중 하나로, 1492년 콜럼버스의 신대륙 발견 시점부터 ' +
    '1572년 지그문트 2세 사망(직계 단절)까지 폴란드 황금 시대(złoty wiek)의 주역이었다. ' +
    '야기에우오 직계는 1572년 지그문트 2세의 후사 부재로 종결되었고, 보헤미아·헝가리 분지는 ' +
    '1526년 모하치 전투에서 라요시 2세가 전사하면서 합스부르크 가문으로 이전되었다.',
  startYear: 1386, // 요가일라 즉위
  endYear: 1572, // 지그문트 2세 아우구스트 사망 — 직계 단절
} as const

// ── 보헤미아 왕국 HC 명세 ─────────────────────────────────────────────────
const BOHEMIA_HC_SPEC = {
  name: '보헤미아 왕국',
  enName: 'Kingdom of Bohemia',
  description:
    '870년경 보르지보이 1세의 보헤미아 공국으로 출발해 1198년 9월 24일 오타카르 1세가 교황 ' +
    '인노첸시오 3세로부터 정식 왕국으로 격상되면서 본격 출범한 중유럽의 왕국. 약 720년 존속. ' +
    '13세기 오타카르 2세 시기 영토 최대 확장(오스트리아·슈타이어마르크·카리니아 합산), ' +
    '14세기 룩셈부르크 가문 카를 4세 시기 신성로마제국 수도였다. ' +
    '1471년 야기에우오 가문 블라디슬라프 2세 즉위, 1526년 모하치 전투에서 라요시 2세 전사 후 ' +
    '합스부르크 가문 페르디난트 1세에게 이전되어 약 392년간(1526~1918) 합스부르크 통치. ' +
    '1620년 백산 전투에서 신교 봉기 군대가 합스부르크에 패배, 보헤미아 자치가 결정적으로 약화되었다. ' +
    '1918년 1차 세계대전 종전과 함께 체코슬로바키아 공화국 수립으로 정식 폐지.',
  startYear: 1198,
  endYear: 1918,
  stateType: HistoricalStateType.KINGDOM,
  latitude: 50.0755, // 프라하
  longitude: 14.4378,
} as const

// ── 헝가리 왕국 HC 명세 ───────────────────────────────────────────────────
const HUNGARY_HC_SPEC = {
  name: '헝가리 왕국',
  enName: 'Kingdom of Hungary',
  description:
    '1000년 12월 25일 이슈트반 1세(István I, 후일 성인 시성된 성 이슈트반)가 교황 실베스테르 2세로부터 ' +
    '왕관을 수여받고 정식 출범한 중부유럽의 왕국. 약 918년 존속. 11~13세기 아르파드 왕가, ' +
    '14세기 앙주 왕가, 15세기 룩셈부르크·합스부르크·헝가리 후냐디 가문, 야기에우오 가문(1490~1526)을 ' +
    '거쳐 1526년 모하치 전투에서 라요시 2세가 술레이만 1세에게 패배·전사하면서 ' +
    '(1)합스부르크 영역(서부) (2)오스만 점령지(중부) (3)트란실바니아 자치(동부)로 약 150년 분할되었다. ' +
    '1699년 카를로비츠 조약으로 합스부르크가 헝가리 전역 회복, 1867년 오스트리아-헝가리 이중제국 ' +
    '수립으로 형식적 동등 지위 획득. 1918년 1차 세계대전 종전으로 정식 폐지.',
  startYear: 1000,
  endYear: 1918,
  stateType: HistoricalStateType.KINGDOM,
  latitude: 47.4979, // 부다페스트
  longitude: 19.0402,
} as const

// ── 블라디슬라프 2세 본문 ────────────────────────────────────────────────
const VLADISLAUS_II = {
  name: '블라디슬라프',
  surname: '야기에우오',
  originalName: 'Vladislaus II of Bohemia and Hungary',
  regnalName: '2세',
  birthYear: 1456,
  birthMonth: 3,
  birthDay: 1,
  deathYear: 1516,
  deathMonth: 3,
  deathDay: 13,
  birthPlaceText: '폴란드 왕국 크라쿠프(Kraków) — 바벨 성',
  deathPlaceText: '헝가리 왕국 부다(Buda) — 부다 왕궁',
  deathType: DeathType.ILLNESS,
  deathCause: '뇌졸중',
  deathNote: '1516년 3월 13일 부다 왕궁에서 향년 60세로 사망했다. 약 2년간 누적된 뇌졸중과 신체 쇠약 끝의 사망이었다. 시신은 헝가리 세케슈페헤르바르(Székesfehérvár) 대성당에 안치되었으나 1543년 오스만 점령 중 묘가 파괴되어 21세기 현재 정확한 유해 위치는 미상이다.',
  biography:
    '야기에우오 가문 출신의 보헤미아 왕(재위 1471~1516)이자 헝가리·크로아티아 왕(재위 1490~1516). 폴란드 왕 카지미에시 4세 야기엘론치크(Casimir IV Jagiellon, 1427~1492)와 합스부르크 엘리자베스(Elisabeth of Austria, 1436~1505 — 신성로마황제 알브레히트 2세의 딸)의 장남이다. 별칭은 "Dobre"(체코어 "좋은 왕") 또는 "Dobzse László"(헝가리어 "Dobzse 왕") — 모든 청원에 "좋다(Dobre/Dobzse)"라고 답하는 약한 통치 스타일에서 비롯된 비웃음 섞인 별칭이다.\n\n' +
    '1471년 3월 22일 보헤미아 이르지 왕(George of Poděbrady)이 사망하자 보헤미아 의회는 5월 27일 만 15세의 블라디슬라프를 왕으로 선출했다. 1471년 8월 22일 프라하에서 정식 즉위했다. 부친 카지미에시 4세는 강력한 폴란드를 중유럽 최강 왕가로 만들기 위해 아들들을 주변 왕국에 분산 배치하는 정책의 일환이었다.\n\n' +
    '1490년 4월 6일 헝가리 왕 마차시 1세 후냐디(Matthias Corvinus)가 후사 없이 사망하자, 헝가리 의회는 약 4개월의 논쟁 끝에 블라디슬라프를 헝가리 왕으로 선출했다(1490년 7월 15일 푸레슈티에서 결정, 9월 18일 세케슈페헤르바르에서 대관). 경쟁자였던 막시밀리안 1세 합스부르크와의 분쟁은 1491년 11월 7일 프레스부르크 조약으로 봉합되었으며, 합스부르크가 야기에우오 직계 단절 시 헝가리·보헤미아를 상속한다는 조항이 포함되어 후일 1526년 합스부르크 흡수의 법적 토대가 되었다.\n\n' +
    '결혼은 세 차례였다. 첫 번째 부인 브란덴부르크 바르바라(Barbara of Brandenburg, 1464~1515)와는 1476년 대리 결혼만 거행되었고 실제로 만나지 못한 채 1500년 무효화되었다. 두 번째 부인 나폴리 베아트리체(Beatrice of Naples, 1457~1508)는 마차시 1세의 미망인으로 1490년 결혼했으나 자녀를 두지 못하고 1500년 무효화되었다. 세 번째 부인 앤 드 푸아 칸달(Anne of Foix-Candale)과는 1502년 9월 29일 부다에서 결혼해 안나(1503년생, 우리의 안나 폰 뵈멘)와 라요시 2세(1506년생) 두 자녀를 두었다.\n\n' +
    '약 26년의 보헤미아 재위와 약 26년의 헝가리 재위 동안 블라디슬라프는 약한 군주로 평가된다. 의회와 귀족에게 거의 모든 권한을 양보했고, "Dobre" 별칭처럼 모든 청원에 동의했다. 헝가리에서는 1514년 죄르지 도자(György Dózsa) 농민 봉기 진압 후 농노에 대한 가혹한 법령(Tripartitum)을 의회에 양보했다. 보헤미아에서는 신교 우트라퀴스트와 가톨릭 사이의 종교 평화를 유지했지만 결정적 통합 정책은 추진하지 못했다.\n\n' +
    '1515년 7월 빈 회의(First Congress of Vienna)에서 막시밀리안 1세 합스부르크와 야기에우오 가문 사이의 이중 결혼 동맹이 체결되었다. 블라디슬라프의 딸 안나는 막시밀리안의 손자(후일 페르디난트 1세)와, 블라디슬라프의 아들 라요시 2세는 막시밀리안의 손녀 마리아와 결혼하기로 약속되었다. 이 약속은 1521~1522년 실제 결혼으로 이행되었으며, 1526년 라요시 2세의 모하치 전사 후 합스부르크 가문이 야기에우오 영토를 흡수하는 결정적 토대가 되었다.\n\n' +
    '1516년 3월 13일 부다 왕궁에서 향년 60세로 사망했다. 후계자는 만 9세의 라요시 2세였다. 후계 왕정은 의회와 귀족이 사실상 통치하는 약체 상태였고, 1526년 모하치 전투의 패배와 라요시 2세의 전사로 야기에우오 보헤미아·헝가리 분지가 사실상 종결되었다.',
  influence: 65,
  stats: {
    politics: 50,
    military: 40,
    diplomacy: 65,
    intellect: 65,
    charisma: 55,
    administration: 45,
    notes:
      '약 45년 보헤미아 재위와 약 26년 헝가리 재위로 동시기 중유럽 최장기 군주 중 1인. 그러나 "Dobre" 별칭처럼 모든 청원에 동의하는 약한 통치 스타일로 의회·귀족 권력 강화의 결과를 가져왔다. 외교는 1491 프레스부르크 조약과 1515 빈 회의 이중 결혼 동맹으로 합스부르크와의 평화 관계 유지에는 성공. 군사는 1514 도자 봉기 진압 외 결정적 사건 없음. 학식은 폴란드 야기에우오 궁정의 르네상스 학예 교육으로 4개 언어(폴란드어·체코어·헝가리어·독일어). 행정은 의회 양보 정책으로 약화. 사후 라요시 2세의 약체 통치와 1526 모하치 패배의 직접 원인이 되었다.',
  },
} as const

// ── 앤 드 푸아 칸달 본문 ───────────────────────────────────────────────────
const ANNE_FOIX = {
  name: '앤',
  surname: '푸아-칸달',
  originalName: 'Anne of Foix-Candale',
  regnalName: undefined as string | undefined,
  birthYear: 1484,
  birthMonth: 5,
  birthDay: 1, // 정확한 날짜 미상, 5월로 추정
  deathYear: 1506,
  deathMonth: 7,
  deathDay: 26,
  birthPlaceText: '프랑스 가스코뉴 — 푸아-칸달 가문 영지',
  deathPlaceText: '헝가리 왕국 부다 — 부다 왕궁',
  deathType: DeathType.ILLNESS,
  deathCause: '둘째 자녀 라요시 2세 출산 후 산욕열',
  deathNote: '1506년 7월 1일 라요시 2세를 출산한 약 25일 후인 7월 26일 부다 왕궁에서 향년 22세로 사망했다. 산욕열에 의한 합병증이었으며, 라요시 2세는 미숙아 상태로 출생해 동물 가죽으로 인큐베이터처럼 감싸 양육되어야 했다. 시신은 헝가리 세케슈페헤르바르(Székesfehérvár) 대성당에 안치되었으나 1543년 오스만 점령 중 묘가 파괴되어 21세기 현재 정확한 유해 위치는 미상이다.',
  biography:
    '프랑스 푸아-칸달 가문(House of Foix-Candale) 출신의 보헤미아·헝가리 왕비(재위 1502~1506). 푸아-칸달 백작 가스통 드 푸아(Gaston de Foix-Candale, 1448~1500)와 카타리나 데 푸아 데 나바라(Catherine de Foix de Navarre, 1454~1494 — 나바라 공주)의 딸이다. 푸아-칸달 가문은 프랑스 카프티앙 가문의 분지로, 가스코뉴 지방을 거점으로 한 백작 가문이었다.\n\n' +
    '약 1484년경 프랑스 가스코뉴에서 태어났다. 어머니가 1494년 사망하면서 약 10세부터 모친 없이 양육되었고, 부친 가스통도 1500년 사망해 약 16세에 고아가 되었다. 사촌인 프랑스 왕비 안 드 브르타뉴(Anne of Brittany, 루이 12세의 부인)의 후원으로 프랑스 궁정에서 양육되었다.\n\n' +
    '1500년 보헤미아·헝가리 왕 블라디슬라프 2세의 두 번째 부인 베아트리체와의 결혼이 무효화된 후, 블라디슬라프는 새 부인을 모색했다. 프랑스 루이 12세는 야기에우오 가문과의 동맹을 위해 자신의 친척인 앤 드 푸아 칸달을 추천했다. 1502년 5월 6일 베네치아에서 대리 결혼식이 거행되었고, 1502년 9월 29일 부다에서 정식 결혼식이 거행되었다. 신랑 블라디슬라프는 46세, 신부 앤은 18세였다.\n\n' +
    '약 4년의 짧은 결혼 생활 동안 두 자녀를 두었다. 1503년 7월 23일 첫 자녀 안나(우리의 안나 폰 뵈멘 운트 운가른, 후일 페르디난트 1세 합스부르크의 부인)를 출산했고, 1506년 7월 1일 둘째 자녀 라요시 2세(후일 헝가리·보헤미아 왕, 1526년 모하치 전사)를 출산했다.\n\n' +
    '1506년 7월 26일 라요시 출산 약 25일 후 부다 왕궁에서 산욕열로 향년 22세에 사망했다. 두 자녀를 위한 정치적 영향은 적었지만, 그녀를 통해 프랑스-야기에우오 동맹의 매개자 역할을 했다. 사후 그녀의 두 자녀는 모두 합스부르크 가문과 결혼해 야기에우오 분지가 1526년 합스부르크로 흡수되는 매개자가 되었다.',
  influence: 40,
  stats: {
    politics: 30,
    military: 10,
    diplomacy: 55,
    intellect: 60,
    charisma: 60,
    administration: 25,
    notes:
      '약 4년의 짧은 결혼 생활 후 22세에 산욕열로 요절했다. 정치 활동은 거의 없었으나 두 자녀(안나·라요시 2세)를 통해 프랑스-야기에우오 동맹 + 후일 야기에우오-합스부르크 통합의 결정적 매개자가 되었다. 외교 능력은 프랑스 궁정의 인문 교육으로 추정. 학식은 우수했다고 동시기 기록 평가. 만약 더 오래 살았다면 보헤미아·헝가리 정치에 영향을 미쳤을 가능성도 있으나 22세 요절로 잠재력 발휘 못함.',
  },
} as const

export async function seedAnnaBohemiaParents(prisma: PrismaService): Promise<void> {
  console.log('\n👑 안나 폰 뵈멘 부모(블라디슬라프 2세 + 앤 드 푸아) + 야기에우오 가문 시딩 시작...')

  // ── 사전 의존성 ────────────────────────────────────────────────────────
  const admin = await prisma.account.findUnique({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  ⚠️  admin 계정 미존재')
    return
  }

  const habsburgDynasty = await prisma.dynasty.findFirst({
    where: { name: '합스부르크 가문' },
    select: { id: true },
  })
  if (!habsburgDynasty) {
    console.warn('  ⚠️  합스부르크 가문 미존재')
    return
  }

  const annaBohemia = await prisma.person.findFirst({
    where: { originalName: 'Anna of Bohemia and Hungary' },
    select: { id: true, fatherId: true, motherId: true, dynastyId: true },
  })
  if (!annaBohemia) {
    console.warn('  ⚠️  안나 폰 뵈멘 미존재 — 먼저 person.maximilian-ii-parents.seed 실행 필요')
    return
  }

  const ferdinandI = await prisma.person.findFirst({
    where: { originalName: 'Ferdinand I, Holy Roman Emperor' },
    select: { id: true },
  })
  if (!ferdinandI) {
    console.warn('  ⚠️  페르디난트 1세 미존재 — 먼저 person.maximilian-ii-parents.seed 실행 필요')
    return
  }

  const kingPos = await prisma.governmentPositionDefinition.findFirst({
    where: { title: '국왕' },
    select: { id: true },
  })

  // ── 1) 야기에우오 가문 등록 ────────────────────────────────────────────
  let jagiellonDynasty = await prisma.dynasty.findFirst({
    where: { name: JAGIELLON_DYNASTY.name },
  })
  if (jagiellonDynasty) {
    console.log(`  ⏭️  가문 이미 존재: ${JAGIELLON_DYNASTY.name}`)
  } else {
    jagiellonDynasty = await prisma.dynasty.create({
      data: {
        name: JAGIELLON_DYNASTY.name,
        description: JAGIELLON_DYNASTY.description,
        startDate: new Date(JAGIELLON_DYNASTY.startYear, 0, 1),
        endDate: new Date(JAGIELLON_DYNASTY.endYear, 11, 31),
      },
    })
    console.log(`  ✅ 가문 생성: ${JAGIELLON_DYNASTY.name} (id=${jagiellonDynasty.id})`)
  }

  // ── 2) 보헤미아 + 헝가리 왕국 HC 인라인 생성 + 모던 국가 링크 ──────────
  const upsertHC = async (
    spec: typeof BOHEMIA_HC_SPEC | typeof HUNGARY_HC_SPEC,
    modernIso: string,
  ): Promise<{ id: string }> => {
    let hc = await prisma.historicalCountry.findFirst({
      where: { name: spec.name },
      select: { id: true },
    })
    if (hc) {
      console.log(`  ⏭️  역사 국가 이미 존재: ${spec.name}`)
    } else {
      const created = await prisma.historicalCountry.create({
        data: {
          name: spec.name,
          enName: spec.enName,
          description: spec.description,
          startEra: 'AD' as any,
          startYear: spec.startYear,
          endEra: 'AD' as any,
          endYear: spec.endYear,
          stateType: spec.stateType,
          entityKind: HistoricalEntityKind.STATE,
          latitude: spec.latitude,
          longitude: spec.longitude,
          accountId: admin.id,
        },
      })
      hc = { id: created.id }
      console.log(`  ✅ 역사 국가 생성: ${spec.name} (id=${created.id})`)
    }
    // 모던 국가 링크
    const modern = await prisma.country.findFirst({
      where: { isoCode: modernIso },
      select: { id: true, name: true },
    })
    if (modern) {
      const linkExists = await prisma.historicalCountryModernCountry.findFirst({
        where: { historicalCountryId: hc.id, modernCountryId: modern.id },
      })
      if (!linkExists) {
        await prisma.historicalCountryModernCountry.create({
          data: { historicalCountryId: hc.id, modernCountryId: modern.id },
        })
        console.log(`    🔗 모던 국가 연결: ${spec.name} → ${modern.name} (${modernIso})`)
      }
    }
    return hc
  }

  const bohemiaHC = await upsertHC(BOHEMIA_HC_SPEC, 'CZ')
  const hungaryHC = await upsertHC(HUNGARY_HC_SPEC, 'HU')

  // ── 3) DynastyRule 등록 ─────────────────────────────────────────────────
  const DYNASTY_RULES = [
    {
      dynastyId: jagiellonDynasty.id,
      dynastyName: '야기에우오 가문',
      historicalCountryId: bohemiaHC.id,
      countryName: '보헤미아 왕국',
      startYear: 1471, // 블라디슬라프 2세 즉위
      endYear: 1526, // 라요시 2세 모하치 전사
    },
    {
      dynastyId: jagiellonDynasty.id,
      dynastyName: '야기에우오 가문',
      historicalCountryId: hungaryHC.id,
      countryName: '헝가리 왕국',
      startYear: 1490, // 블라디슬라프 2세 헝가리 즉위
      endYear: 1526,
    },
    {
      dynastyId: habsburgDynasty.id,
      dynastyName: '합스부르크 가문',
      historicalCountryId: bohemiaHC.id,
      countryName: '보헤미아 왕국',
      startYear: 1526, // 페르디난트 1세 즉위
      endYear: 1918,
    },
    {
      dynastyId: habsburgDynasty.id,
      dynastyName: '합스부르크 가문',
      historicalCountryId: hungaryHC.id,
      countryName: '헝가리 왕국',
      startYear: 1526,
      endYear: 1918,
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
      `  ✅ 가문 통치: ${rule.dynastyName} → ${rule.countryName} (${rule.startYear}-${rule.endYear})`,
    )
  }

  // ── 4) Person 등록 ──────────────────────────────────────────────────────
  const createOrFindPerson = async (
    spec: typeof VLADISLAUS_II | typeof ANNE_FOIX,
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

  const vladId = await createOrFindPerson(VLADISLAUS_II, 'MALE', jagiellonDynasty.id)
  const anneId = await createOrFindPerson(ANNE_FOIX, 'FEMALE', null) // 푸아-칸달 가문은 별도 등록 안 함

  // ── 5) PersonStats x2 ──────────────────────────────────────────────────
  for (const [pid, spec, label] of [
    [vladId, VLADISLAUS_II, '블라디슬라프 2세'],
    [anneId, ANNE_FOIX, '앤 드 푸아'],
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

  // ── 6) PersonCountryAffiliation ─────────────────────────────────────
  for (const [pid, hcId, label, hcLabel] of [
    [vladId, bohemiaHC.id, '블라디슬라프 2세', '보헤미아 왕국'],
    [anneId, hungaryHC.id, '앤 드 푸아', '헝가리 왕국'],
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

  // ── 7) 결혼 관계 (양방향) ─────────────────────────────────────────────
  const mStart = new Date(1502, 8, 29) // 1502-09-29 부다
  const mEnd = new Date(1506, 6, 26) // 1506-07-26 앤 산욕열 사망
  const mNote =
    '1502년 9월 29일 헝가리 부다 왕궁에서 결혼. 블라디슬라프 2세 46세, 앤 드 푸아 18세. 블라디슬라프의 두 번째 부인 베아트리체와의 결혼이 1500년 무효화된 후, 프랑스 루이 12세가 자신의 친척인 앤을 추천해 성사된 프랑스-야기에우오 동맹의 결과. 약 4년의 짧은 결혼 생활 동안 두 자녀를 두었다. 1503년 안나(우리의 안나 폰 뵈멘 운트 운가른), 1506년 라요시 2세(후일 모하치 전투 전사)가 그 자녀들이다. 1506년 7월 1일 라요시 출산 약 25일 후 7월 26일 앤이 22세에 산욕열로 사망하면서 결혼 종결. 블라디슬라프는 약 10년 더 살았으나 재혼하지 않았다.'

  for (const [aId, bId, label] of [
    [vladId, anneId, '블라디슬라프 → 앤'],
    [anneId, vladId, '앤 → 블라디슬라프'],
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
    console.log(`  ✅ 결혼: ${label} (1502-09-29 ~ 1506-07-26 사별)`)
  }

  // ── 8) 안나 폰 뵈멘 dynastyId 보강 + 부모 연결 ──────────────────────────
  const annaPatch: any = {}
  if (!annaBohemia.dynastyId) annaPatch.dynastyId = jagiellonDynasty.id
  if (!annaBohemia.fatherId) annaPatch.fatherId = vladId
  if (!annaBohemia.motherId) annaPatch.motherId = anneId
  if (Object.keys(annaPatch).length > 0) {
    await prisma.person.update({ where: { id: annaBohemia.id }, data: annaPatch })
    console.log(`  ✅ 안나 폰 뵈멘 보강: ${Object.keys(annaPatch).join(', ')}`)
  } else {
    console.log(`  ⏭️  안나 폰 뵈멘 보강 스킵 (이미 모두 연결)`)
  }

  // ── 9) SovereignReign x4 ─────────────────────────────────────────────
  if (!kingPos) {
    console.warn('  ⚠️  관직 정의 \'국왕\' 미존재 — 재임 스킵')
    console.log(`✅ 안나 폰 뵈멘 부모 시딩 완료\n`)
    return
  }

  type ReignSpec = {
    personId: string
    historicalCountryId: string
    historicalCountryName: string
    regnalNumber: number
    regnalName: string
    startDate: Date
    endDate: Date
    appointmentMethod: AppointmentMethod
    endReason: TenureEndReason
    endReasonDetail?: string
    notes?: string
  }

  const REIGNS: ReignSpec[] = [
    // ── 블라디슬라프 2세 ──
    {
      personId: vladId,
      historicalCountryId: bohemiaHC.id,
      historicalCountryName: '보헤미아 왕국',
      regnalNumber: 16,
      regnalName: '블라디슬라프 2세',
      startDate: new Date(1471, 7, 22), // 1471-08-22 즉위
      endDate: new Date(1516, 2, 13), // 1516-03-13 사망
      appointmentMethod: AppointmentMethod.INDIRECT_ELECTION,
      endReason: TenureEndReason.DEATH_IN_OFFICE,
      endReasonDetail: '1516-03-13 부다 왕궁에서 향년 60세 사망 (뇌졸중).',
      notes:
        '1471년 8월 22일 보헤미아 의회에서 만 15세에 선출되어 약 45년 재위. 약한 통치 스타일로 의회·귀족 권력 강화의 결과를 가져왔다. 신교 우트라퀴스트와 가톨릭의 종교 평화 유지에 기여했으나 결정적 통합 정책은 추진하지 못했다. 사후 만 9세의 라요시 2세 즉위.',
    },
    {
      personId: vladId,
      historicalCountryId: hungaryHC.id,
      historicalCountryName: '헝가리 왕국',
      regnalNumber: 34,
      regnalName: '울라슬로 2세 (Ulászló II)',
      startDate: new Date(1490, 8, 18), // 1490-09-18 세케슈페헤르바르 대관
      endDate: new Date(1516, 2, 13),
      appointmentMethod: AppointmentMethod.INDIRECT_ELECTION,
      endReason: TenureEndReason.DEATH_IN_OFFICE,
      endReasonDetail: '1516-03-13 부다 왕궁에서 향년 60세 사망 (뇌졸중).',
      notes:
        '1490년 4월 6일 마차시 1세 후냐디(Matthias Corvinus) 사망 후 헝가리 의회의 약 4개월 논쟁 끝에 7월 15일 선출, 9월 18일 세케슈페헤르바르에서 정식 대관. 약 26년 재위. 1491 프레스부르크 조약으로 합스부르크 막시밀리안 1세와 봉합, 야기에우오 직계 단절 시 헝가리·보헤미아의 합스부르크 상속 약속이 포함되어 후일 1526년 합스부르크 흡수의 토대가 되었다. 1514 죄르지 도자 농민 봉기 진압 후 농노에 대한 가혹한 Tripartitum 법령 양보. 헝가리식 별칭은 "Dobzse László".',
    },
    // ── 페르디난트 1세 (기존 인물에 reign 추가) ──
    {
      personId: ferdinandI.id,
      historicalCountryId: bohemiaHC.id,
      historicalCountryName: '보헤미아 왕국',
      regnalNumber: 18,
      regnalName: '페르디난트 1세',
      startDate: new Date(1526, 9, 24), // 1526-10-24 보헤미아 의회 선출
      endDate: new Date(1564, 6, 25), // 1564-07-25 사망
      appointmentMethod: AppointmentMethod.INDIRECT_ELECTION,
      endReason: TenureEndReason.DEATH_IN_OFFICE,
      endReasonDetail: '1564-07-25 빈 호프부르크 궁에서 향년 61세 사망.',
      notes:
        '1526년 8월 29일 모하치 전투에서 처남 라요시 2세 전사 후 부인 안나 권리(jure uxoris)로 보헤미아 왕위 계승권 주장. 보헤미아 의회가 1526년 10월 24일 페르디난트를 선출, 합스부르크 가문 보헤미아 통치(1526~1918)의 출발점이 되었다. 약 38년 재위. 종교 정책에서 후사 페르디난트 가문의 가톨릭 보수와 타협을 시도했으나 신교 우트라퀴스트 세력은 자치 유지.',
    },
    {
      personId: ferdinandI.id,
      historicalCountryId: hungaryHC.id,
      historicalCountryName: '헝가리 왕국',
      regnalNumber: 36,
      regnalName: '페르디난트 1세 (Ferdinánd I)',
      startDate: new Date(1526, 11, 16), // 1526-12-16 헝가리 의회 선출 (포좀 — Pozsony, 현 브라티슬라바)
      endDate: new Date(1564, 6, 25),
      appointmentMethod: AppointmentMethod.INDIRECT_ELECTION,
      endReason: TenureEndReason.DEATH_IN_OFFICE,
      endReasonDetail: '1564-07-25 사망. 사후 헝가리·보헤미아 왕위 모두 막시밀리안 2세 계승.',
      notes:
        '1526 모하치 전투 후 헝가리 분할 — 야노시 자폴리아(János Szapolyai)가 부다에서 1526-11-10 헝가리 왕으로 선출(별도 35대로 카운트되기도 함), 페르디난트는 1526-12-16 포좀(현 슬로바키아 브라티슬라바)에서 친합스부르크 의회에 의해 선출. 1538 바라드 조약으로 자폴리아 사망 후 통합 약속, 1540 자폴리아 사망 후 자폴리아의 미망인이 약속 위반·아들 야노시 지그문트 자폴리아 옹립으로 분쟁 재개. 페르디난트는 헝가리 서부만 실질 통치했고 중부는 오스만 점령, 동부는 자폴리아 가문 트란실바니아 자치. 1547 아드리아노폴리스 조약으로 분할이 사실상 확정되었다.',
    },
  ]

  for (const r of REIGNS) {
    const existingByPerson = await prisma.sovereignReign.findFirst({
      where: {
        personId: r.personId,
        historicalCountryId: r.historicalCountryId,
        regnalNumber: r.regnalNumber,
      },
    })
    if (existingByPerson) {
      console.log(
        `  ⏭️  재임 스킵 (이미 정확): ${r.historicalCountryName} ${r.regnalName} ${r.regnalNumber}대`,
      )
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
      `  ✅ 재임: ${r.historicalCountryName} ${r.regnalName} ${r.regnalNumber}대 (${fmt(r.startDate)} ~ ${fmt(r.endDate)})`,
    )
  }

  console.log(`✅ 안나 폰 뵈멘 부모 + 야기에우오 가문 시딩 완료\n`)
}
