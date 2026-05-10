/**
 * 막시밀리안 2세(Maximilian II, 1527~1576)의 부모 시드
 *
 *  - 아버지: 페르디난트 1세 (Ferdinand I, 1503~1564) — 신성로마황제 21대, 오스트리아 합스부르크 시조
 *    (미남공 필리프와 후아나 1세의 둘째 아들이자 카를 5세의 동생)
 *  - 어머니: 안나 폰 뵈멘 운트 운가른 (Anna of Bohemia and Hungary, 1503~1547) — 야기에우오 가문,
 *    헝가리·보헤미아 왕녀
 *
 * 페르디난트 1세는 1521년 형 카를 5세로부터 오스트리아 영지를 분할 상속받아 오스트리아 합스부르크
 * 분지의 시조가 되었다. 1521년 안나와 결혼해 보헤미아·헝가리 왕위 계승권을 확보했고,
 * 1526년 모하치 전투에서 처남 라요시 2세가 전사하면서 헝가리·보헤미아 왕으로 즉위했다.
 * 1556년 형 카를 5세의 양위로 신성로마황제로 사실상 즉위했고 1558년 정식 인정받았다.
 *
 * 페르디난트의 부모(미남공 필리프·후아나 1세)는 이미 DB에 등록되어 있어, 이번 시드에서는
 * 페르디난트의 부모 연결만 추가한다. 안나 폰 뵈멘의 부모(블라디슬라프 2세·안 드 푸아 칸달)는
 * 본 시드의 범위 밖이므로 전기에만 언급한다.
 *
 * 또한 안나 폰 외스터라이히 부모 시드(person.anna-austria-parents.seed)에서 막시밀리안 2세는
 * 등록되었으나 그의 부모(이번 시드 대상)가 미등록이라 막시밀리안의 fatherId/motherId가
 * 비어 있었다. 이번 시드에서 보강한다.
 *
 * ⚠️ 기존 데이터 보존 모드.
 *
 * 등록 항목:
 *  - Person x2 (페르디난트 1세·안나 폰 뵈멘 운트 운가른)
 *  - PersonStats x2
 *  - PersonSpouse x2 (양방향 결혼, 1521-05-25 ~ 1547-01-27 사별)
 *  - PersonCountryAffiliation x2
 *  - 부자/모자 관계:
 *      페르디난트 + 안나 → 막시밀리안 2세 (보강)
 *      미남공 필리프 + 후아나 1세 → 페르디난트 1세
 *  - SovereignReign x1 (페르디난트 1세 — 신성로마황제 21대, 1556-02-25 ~ 1564-07-25)
 *
 * ⚠️ 의존: 합스부르크 가문, 신성로마제국 HC, 미남공 필리프, 후아나 1세, 막시밀리안 2세 등 기존 등록.
 */
import {
  AppointmentMethod,
  DeathType,
  TenureEndReason,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

// ── 페르디난트 1세 본문 ────────────────────────────────────────────────────
const FERDINAND_I = {
  name: '페르디난트',
  surname: '합스부르크',
  originalName: 'Ferdinand I, Holy Roman Emperor',
  regnalName: '1세',
  birthYear: 1503,
  birthMonth: 3,
  birthDay: 10,
  deathYear: 1564,
  deathMonth: 7,
  deathDay: 25,
  birthPlaceText: '카스티야 왕국 알칼라 데 에나레스(Alcalá de Henares)',
  deathPlaceText: '신성로마제국 오스트리아 빈 호프부르크 궁',
  deathType: DeathType.ILLNESS,
  deathCause: '뇌졸중',
  deathNote: '1564년 7월 25일 빈 호프부르크 궁에서 향년 61세로 사망했다. 사인은 약 2년간 누적된 심장과 뇌 질환의 합병증으로 추정된다. 시신은 프라하의 성 비투스 대성당에 안치되어 21세기 현재까지 보존되고 있다.',
  biography:
    '합스부르크 가문 출신의 신성로마황제 21대(재위 1556~1564)이자 오스트리아 합스부르크 분지의 시조. 미남공 필리프(펠리페 1세 of Castile)와 후아나 1세의 둘째 아들로, 신성로마황제 카를 5세의 친동생이다. 1503년 3월 10일 카스티야 알칼라 데 에나레스에서 태어났다.\n\n' +
    '두 살이던 1505년부터 외조부 페르난도 2세의 직접 양육을 받으며 카스티야에서 성장했다. 형 카를이 합스부르크령 네덜란드에서 양육된 것과 대조적이다. 페르난도 2세는 손자 페르디난트를 자기 후계자로 삼으려 했으나, 1516년 본인 사망과 카를의 카스티야 즉위로 무산되었다. 페르디난트는 1518년 형 카를과 처음 만났고, 형의 명령으로 카스티야를 떠나 합스부르크령 네덜란드로 이주했다.\n\n' +
    '1521년 4월 28일 보름스 의회에서 형 카를 5세가 오스트리아 영지(니더외스터라이히, 오버외스터라이히, 슈타이어마르크, 케른텐, 크라인, 티롤 등)를 페르디난트에게 분할 상속해 오스트리아 합스부르크 분지가 출발했다. 같은 해 5월 25일 페르디난트는 안나 폰 뵈멘 운트 운가른과 린츠에서 결혼했다. 이 결혼은 약 8년 전인 1515년 빈 회의에서 합스부르크와 야기에우오 가문 사이에 합의된 동맹의 결실이었다.\n\n' +
    '1526년 8월 29일 모하치 전투에서 처남 헝가리·보헤미아 왕 라요시 2세가 오스만 술레이만 1세에 패배해 전사하면서, 페르디난트는 부인 안나의 권리로 헝가리와 보헤미아 왕위 계승권을 주장했다. 보헤미아는 1526년 10월 24일 즉위했고, 헝가리는 라이벌 야노시 자폴리아와 약 14년 분쟁 끝에 1538년 바라드 조약으로 부분적으로 인정받고 1540년 자폴리아 사망으로 재차 부분 회복했지만, 헝가리 대부분은 오스만이 점령한 상태였다.\n\n' +
    '1529년 술레이만 1세가 약 12만 군대로 빈을 1차 포위했다. 페르디난트는 형 카를 5세의 군사 지원을 받아 약 2주 포위 끝에 오스만을 격퇴했다. 1532년 2차 빈 침공도 격퇴했고, 1547년 아드리아노폴리스 평화 조약으로 헝가리 분할(서부는 합스부르크, 동부와 중부는 오스만)이 사실상 확정되었다.\n\n' +
    '신성로마제국 차기 황제 자리는 1531년 형 카를 5세의 권유로 페르디난트가 King of the Romans(차기 황제) 선출되었다. 약 25년의 차기 후계자 위치 후, 1556년 2월 25일 카를 5세의 분할 양위로 신성로마황제로 사실상 즉위했다. 정식 인정은 1558년 3월 14일 프랑크푸르트의 선제후 의회에서 이루어졌고, 가톨릭 교회가 아닌 선제후들이 황제를 인정한 첫 사례였다(교황 대관 없는 황제로서는 막시밀리안 1세 이후 두 번째).\n\n' +
    '1555년 9월 25일 아우크스부르크 종교화의는 형 카를 5세의 권한 위임으로 페르디난트가 직접 협상하고 체결했다. "영주가 영지의 종교를 결정한다(cuius regio, eius religio)"는 원칙이 명시되었고, 약 60년의 종교 갈등을 일시 봉합했다. 페르디난트 본인은 가톨릭 신자였으나 형보다 종교 관용적이었다.\n\n' +
    '결혼 약 26년 동안 안나와의 사이에서 15명의 자녀를 두었다. 후계자 막시밀리안 2세(1527년생, 후일 신성로마황제 22대), 페르디난트 2세(1529년생, 후일 티롤 대공), 카를 2세(1540년생, 후일 인너오스트리아 대공) 등 세 아들이 합스부르크 가문 오스트리아 분지의 분할 통치를 시작했다. 1540년 카를의 사망 후에는 분할이 확정되었고, 후일 1665년 인너오스트리아 분지가 합병될 때까지 약 100년의 분립이 이어졌다.\n\n' +
    '1564년 7월 25일 빈에서 향년 61세 사망. 후계자 막시밀리안 2세가 신성로마황제로 즉위했다. 페르디난트의 유산은 결정적이다. 1521년 카를 5세의 분할 양위 전조로서의 영지 상속이 1556년 합스부르크 양가(스페인·오스트리아) 분리의 출발이 되었고, 1526년 헝가리·보헤미아 상속으로 합스부르크 가문이 중앙유럽 다민족 대국의 지배자로 부상했다. 21세기 현재 오스트리아 합스부르크 분지의 약 360년 통치(1521~1918)의 시조이다.',
  influence: 85,
  stats: {
    politics: 85,
    military: 75,
    diplomacy: 90,
    intellect: 80,
    charisma: 78,
    administration: 85,
    notes:
      '오스트리아 합스부르크 분지의 시조이자 합스부르크 가문 중앙유럽 다민족 대국의 결정적 설계자. 외교는 1521 야기에우오 가문 결혼·1526 헝가리·보헤미아 상속·1547 아드리아노폴리스 조약·1555 아우크스부르크 종교화의 등 동시기 최상위. 군사는 1529·1532 빈 포위 격퇴로 오스만 침공 차단. 행정은 약 43년 오스트리아 영지 통치로 합스부르크 가문 행정 시스템 정비. 정치는 형 카를 5세와의 평생 협력 관계 유지로 합스부르크 양가 분리(1556) 시까지 갈등 없음. 학식은 카스티야에서의 인문 교육과 다언어 능력(스페인어·라틴어·독일어·이탈리아어). 종교 관용도 형보다 우수.',
  },
} as const

// ── 안나 폰 뵈멘 운트 운가른 본문 ────────────────────────────────────────
const ANNA_BOHEMIA = {
  name: '안나',
  surname: '야기에우오',
  originalName: 'Anna of Bohemia and Hungary',
  regnalName: undefined as string | undefined,
  birthYear: 1503,
  birthMonth: 7,
  birthDay: 23,
  deathYear: 1547,
  deathMonth: 1,
  deathDay: 27,
  birthPlaceText: '보헤미아 왕국 프라하 — 프라하 성',
  deathPlaceText: '보헤미아 왕국 프라하 — 프라하 성',
  deathType: DeathType.ILLNESS,
  deathCause: '15번째 출산 후 산욕열',
  deathNote: '1547년 1월 27일 프라하 성에서 15번째 자녀 요한나(Joanna of Austria)를 출산한 후 산욕열로 향년 43세에 사망했다. 약 26년의 결혼 생활 동안 거의 매년 출산하다시피 했다. 시신은 프라하의 성 비투스 대성당에 남편 페르디난트 1세 옆에 안치되어 21세기 현재까지 보존되어 있다.',
  biography:
    '야기에우오 가문(Jagiellon dynasty) 출신의 신성로마황후이자 오스트리아 대공비, 보헤미아·헝가리 왕비(재위 1521~1547). 보헤미아·헝가리 왕 블라디슬라프 2세 야기에우오(Vladislaus II Jagiellon, 1456~1516)와 안 드 푸아 칸달(Anne of Foix-Candale, 1484~1506)의 딸이다. 부친 블라디슬라프는 폴란드 야기에우오 왕가의 군주이자 보헤미아·헝가리 왕이었다.\n\n' +
    '1503년 7월 23일 프라하 성에서 태어났다. 동생으로는 1506년 출생한 라요시(Ludwig II of Hungary, 후일 모하치 전투 전사) 한 명이 있었다. 어머니가 1506년 출산 후 사망하면서 약 3세부터 사실상 어머니 없이 양육되었다.\n\n' +
    '1515년 빈 회의(First Congress of Vienna)에서 합스부르크 가문 막시밀리안 1세와 야기에우오 가문 블라디슬라프 2세 사이의 동맹이 체결되어, 안나의 결혼이 합스부르크와의 정략 결혼으로 결정되었다. 동시에 동생 라요시 2세는 합스부르크 마리아(카를 5세와 페르디난트 1세의 누이)와의 결혼이 약속되었다. 약 6년의 약혼 기간 후 1521년 5월 25일 18세에 페르디난트 1세와 린츠(Linz)에서 결혼했다.\n\n' +
    '결혼 직후부터 안나의 거의 매년 출산이 시작되었다. 약 26년의 결혼 생활 동안 15명의 자녀를 두었으며, 그중 13명이 성인까지 생존했다. 후일 신성로마황제 22대 막시밀리안 2세, 티롤 대공 페르디난트 2세, 인너오스트리아 대공 카를 2세, 바이에른 대공비 안나, 폴란드 왕비 카타리나 등 합스부르크 가문 오스트리아 분지의 다음 세대를 거의 모두 그녀가 출산했다.\n\n' +
    '1526년 8월 29일 동생 라요시 2세가 모하치 전투에서 오스만 술레이만 1세에 패배해 20세에 전사하면서 안나는 헝가리·보헤미아 왕위 계승권자가 되었다. 남편 페르디난트가 부인 권리로 보헤미아 왕(1526)·헝가리 왕(1538/1540)으로 즉위해, 합스부르크 가문이 중앙유럽 다민족 대국의 지배자로 부상하는 결정적 매개자가 되었다.\n\n' +
    '1547년 1월 27일 프라하 성에서 15번째 자녀 요한나(후일 1547년생, 페르라라 공작비)를 출산한 직후 산욕열로 향년 43세에 사망했다. 거의 평생을 임신 또는 산욕 회복 상태로 지낸 결과였다. 페르디난트 1세는 이후 약 17년 더 살았으나 재혼하지 않았다.\n\n' +
    '안나의 사후 영향은 결정적이다. 그녀의 헝가리·보헤미아 왕위 계승권을 통해 합스부르크 가문이 중앙유럽 다민족 대국의 지배자가 되었고, 그녀의 13명의 성인 자녀들을 통해 합스부르크 가문 오스트리아 분지의 다음 세대가 형성되었다. 그녀의 손녀 안나(우리의 안나 폰 외스터라이히)가 외삼촌 펠리페 2세와 결혼함으로써 합스부르크 양가의 통합 사촌 결혼이 한층 심화되었다.',
  influence: 60,
  stats: {
    politics: 50,
    military: 15,
    diplomacy: 70,
    intellect: 65,
    charisma: 65,
    administration: 40,
    notes:
      '약 26년 결혼 생활 동안 15명의 자녀를 두었으며, 그중 13명이 성인까지 생존했다. 동생 라요시 2세의 모하치 전투 전사로 헝가리·보헤미아 왕위 계승권을 합스부르크 가문에 가져온 결정적 매개자. 정치 활동은 거의 없었으나 외교적으로는 1515년 빈 회의의 합스부르크-야기에우오 동맹의 정점 결과. 학식은 프라하 궁정의 인문 교육으로 라틴어와 체코어, 헝가리어, 독일어 등 다언어 능력. 잦은 임신과 출산이 임종을 앞당겼다.',
  },
} as const

export async function seedMaximilianIIParents(prisma: PrismaService): Promise<void> {
  console.log('\n👑 막시밀리안 2세 부모(페르디난트 1세 + 안나 폰 뵈멘) 시딩 시작...')

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
    console.warn('  ⚠️  합스부르크 가문 미존재')
    return
  }

  const hreHC = await prisma.historicalCountry.findFirst({
    where: { name: '신성로마제국' },
    select: { id: true },
  })
  if (!hreHC) {
    console.warn('  ⚠️  신성로마제국 HC 미존재')
    return
  }

  const maxII = await prisma.person.findFirst({
    where: { originalName: 'Maximilian II, Holy Roman Emperor' },
    select: { id: true, fatherId: true, motherId: true },
  })
  if (!maxII) {
    console.warn('  ⚠️  막시밀리안 2세 미존재 — 먼저 person.anna-austria-parents.seed 실행 필요')
    return
  }

  const philipI = await prisma.person.findFirst({
    where: { originalName: 'Philip I of Castile' },
    select: { id: true },
  })
  const joannaI = await prisma.person.findFirst({
    where: { originalName: 'Joanna of Castile' },
    select: { id: true },
  })
  if (!philipI || !joannaI) {
    console.warn('  ⚠️  미남공 필리프 또는 후아나 1세 미존재')
    return
  }

  const hrePos = await prisma.governmentPositionDefinition.findFirst({
    where: { title: '신성로마황제' },
    select: { id: true },
  })

  // ── Helper ──────────────────────────────────────────────────────────
  const createOrFindPerson = async (
    spec: typeof FERDINAND_I | typeof ANNA_BOHEMIA,
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

  // ── 1) 페르디난트 1세·안나 폰 뵈멘 등록 ────────────────────────────────
  // 안나는 야기에우오 가문 — 본 시드에서 별도 가문 등록은 안 함, dynastyId=null
  const ferdinandId = await createOrFindPerson(FERDINAND_I, 'MALE', habsburgDynasty.id)
  const annaId = await createOrFindPerson(ANNA_BOHEMIA, 'FEMALE', null)

  // ── 2) PersonStats x2 ──────────────────────────────────────────────────
  for (const [pid, spec, label] of [
    [ferdinandId, FERDINAND_I, '페르디난트 1세'],
    [annaId, ANNA_BOHEMIA, '안나 폰 뵈멘'],
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
  // 페르디난트 1세 → 신성로마제국 (priority 0). 그는 합스부르크 오스트리아 시조.
  // 안나 폰 뵈멘 → 보헤미아 왕국 (priority 0, 출생국+친정), 헝가리 왕국 (priority 1)
  //   ※ 신성로마제국 Empress는 "결혼 권리" 칭호일 뿐 본인 정체성은 야기에우오 보헤미아·헝가리
  const bohemiaHC = await prisma.historicalCountry.findFirst({
    where: { name: '보헤미아 왕국' },
    select: { id: true },
  })
  const hungaryHC = await prisma.historicalCountry.findFirst({
    where: { name: '헝가리 왕국' },
    select: { id: true },
  })

  // 페르디난트 1세 → 신성로마제국
  {
    const exists = await prisma.personCountryAffiliation.findFirst({
      where: {
        personId: ferdinandId,
        historicalCountryId: hreHC.id,
        affiliationType: 'CITIZENSHIP' as any,
      },
    })
    if (exists) {
      console.log(`  ⏭️  소속국가 스킵: 페르디난트 1세 → 신성로마제국`)
    } else {
      await prisma.personCountryAffiliation.create({
        data: {
          personId: ferdinandId,
          historicalCountryId: hreHC.id,
          affiliationType: 'CITIZENSHIP' as any,
          priority: 0,
        },
      })
      console.log(`  ✅ 소속국가: 페르디난트 1세 → 신성로마제국 (CITIZENSHIP)`)
    }
  }

  // 안나 폰 뵈멘 → 보헤미아(0) + 헝가리(1) — HRE 잘못된 매핑이 있으면 제거
  if (bohemiaHC) {
    const wrongHre = await prisma.personCountryAffiliation.findFirst({
      where: {
        personId: annaId,
        historicalCountryId: hreHC.id,
        affiliationType: 'CITIZENSHIP' as any,
      },
    })
    if (wrongHre) {
      await prisma.personCountryAffiliation.delete({ where: { id: wrongHre.id } })
      console.log(`  🔧 정정: 안나 폰 뵈멘 → 신성로마제국 affiliation 제거`)
    }
    const annaBohemia = await prisma.personCountryAffiliation.findFirst({
      where: {
        personId: annaId,
        historicalCountryId: bohemiaHC.id,
        affiliationType: 'CITIZENSHIP' as any,
      },
    })
    if (!annaBohemia) {
      await prisma.personCountryAffiliation.create({
        data: {
          personId: annaId,
          historicalCountryId: bohemiaHC.id,
          affiliationType: 'CITIZENSHIP' as any,
          priority: 0,
        },
      })
      console.log(`  ✅ 소속국가: 안나 폰 뵈멘 → 보헤미아 왕국 (CITIZENSHIP, priority 0)`)
    }
  }
  if (hungaryHC) {
    const annaHungary = await prisma.personCountryAffiliation.findFirst({
      where: {
        personId: annaId,
        historicalCountryId: hungaryHC.id,
        affiliationType: 'CITIZENSHIP' as any,
      },
    })
    if (!annaHungary) {
      await prisma.personCountryAffiliation.create({
        data: {
          personId: annaId,
          historicalCountryId: hungaryHC.id,
          affiliationType: 'CITIZENSHIP' as any,
          priority: 1,
        },
      })
      console.log(`  ✅ 소속국가: 안나 폰 뵈멘 → 헝가리 왕국 (CITIZENSHIP, priority 1)`)
    }
  }

  // ── 4) 결혼 관계 (양방향) ─────────────────────────────────────────────
  const mStart = new Date(1521, 4, 25) // 1521-05-25 린츠
  const mEnd = new Date(1547, 0, 27) // 1547-01-27 안나 산욕열 사망
  const mNote =
    '1521년 5월 25일 신성로마 오스트리아 린츠에서 결혼. 페르디난트 18세, 안나 17세. 1515년 빈 회의에서 합스부르크 가문 막시밀리안 1세와 야기에우오 가문 블라디슬라프 2세 사이의 동맹으로 약속된 정략 결혼이었다. 동시에 안나의 동생 라요시 2세는 페르디난트의 누이 마리아와 결혼해 합스부르크-야기에우오 동맹의 양방향 통합이 이루어졌다. 약 26년 결혼 생활 동안 15명의 자녀를 두었고, 그중 13명이 성인까지 생존했다. 후일 신성로마황제 22대 막시밀리안 2세, 티롤 대공 페르디난트 2세, 인너오스트리아 대공 카를 2세 등이 이 부부의 자녀들이다. 1526년 안나의 동생 라요시 2세가 모하치 전투에서 전사하면서 페르디난트가 부인 권리로 헝가리·보헤미아 왕위를 계승해, 합스부르크 가문이 중앙유럽 다민족 대국의 지배자로 부상하는 결정적 매개자 역할도 했다. 1547년 1월 27일 안나의 15번째 출산 후 산욕열 사망으로 결혼 종결. 페르디난트는 약 17년 더 살았으나 재혼하지 않았다.'

  for (const [aId, bId, label] of [
    [ferdinandId, annaId, '페르디난트 → 안나'],
    [annaId, ferdinandId, '안나 → 페르디난트'],
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
    console.log(`  ✅ 결혼: ${label} (1521-05-25 ~ 1547-01-27 사별)`)
  }

  // ── 5) 부자/모자 관계 ─────────────────────────────────────────────────
  // (a) 페르디난트 + 안나 → 막시밀리안 2세 (보강)
  if (maxII.fatherId) {
    console.log(`  ⏭️  부자 스킵 (이미 연결): 막시밀리안 2세 fatherId=${maxII.fatherId}`)
  } else {
    await prisma.person.update({
      where: { id: maxII.id },
      data: { fatherId: ferdinandId },
    })
    console.log(`  ✅ 부자: 페르디난트 1세 → 막시밀리안 2세`)
  }
  if (maxII.motherId) {
    console.log(`  ⏭️  모자 스킵 (이미 연결): 막시밀리안 2세 motherId=${maxII.motherId}`)
  } else {
    await prisma.person.update({
      where: { id: maxII.id },
      data: { motherId: annaId },
    })
    console.log(`  ✅ 모자: 안나 폰 뵈멘 → 막시밀리안 2세`)
  }

  // (b) 미남공 필리프 + 후아나 1세 → 페르디난트 1세
  const ferdinandRecord = await prisma.person.findFirst({
    where: { id: ferdinandId },
    select: { fatherId: true, motherId: true },
  })
  if (ferdinandRecord?.fatherId) {
    console.log(`  ⏭️  부자 스킵 (이미 연결): 페르디난트 fatherId=${ferdinandRecord.fatherId}`)
  } else {
    await prisma.person.update({
      where: { id: ferdinandId },
      data: { fatherId: philipI.id },
    })
    console.log(`  ✅ 부자: 미남공 필리프 → 페르디난트 1세`)
  }
  if (ferdinandRecord?.motherId) {
    console.log(`  ⏭️  모자 스킵 (이미 연결): 페르디난트 motherId=${ferdinandRecord.motherId}`)
  } else {
    await prisma.person.update({
      where: { id: ferdinandId },
      data: { motherId: joannaI.id },
    })
    console.log(`  ✅ 모자: 후아나 1세 → 페르디난트 1세`)
  }

  // ── 6) SovereignReign — 신성로마제국 21대 페르디난트 1세 ───────────────
  if (hrePos) {
    const r = {
      regnalNumber: 21,
      regnalName: '페르디난트 1세',
      startDate: new Date(1556, 1, 25), // 1556-02-25 카를 5세 양위
      endDate: new Date(1564, 6, 25), // 1564-07-25 본인 사망
      appointmentMethod: AppointmentMethod.INDIRECT_ELECTION,
      endReason: TenureEndReason.DEATH_IN_OFFICE,
      endReasonDetail: '1564년 7월 25일 빈 호프부르크 궁에서 향년 61세 사망 (뇌졸중·심부전).',
      notes:
        '1531년 형 카를 5세의 권유로 King of the Romans(차기 황제) 선출. 1556년 2월 25일 카를 5세의 분할 양위로 신성로마황제 사실상 즉위. 정식 인정은 1558년 3월 14일 프랑크푸르트 선제후 의회에서 이루어졌다(가톨릭 교회가 아닌 선제후들이 황제를 인정한 첫 사례 중 하나). 약 8년 재위. 종교 정책에서 형 카를 5세보다 관용적이었으며, 1555년 아우크스부르크 종교화의를 직접 협상·체결해 약 60년의 종교 갈등을 일시 봉합했다. 동시에 합스부르크 가문 오스트리아 분지의 시조로서 1521년 형 카를 5세의 영지 분할 상속이 1556년 합스부르크 양가(스페인·오스트리아) 분리의 출발이 되었다. 1564년 사망으로 후계자 막시밀리안 2세 즉위.',
    }
    const existingByPerson = await prisma.sovereignReign.findFirst({
      where: { personId: ferdinandId, historicalCountryId: hreHC.id },
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
        console.log(`  🔧 재임 정정: 신성로마제국 ${r.regnalName} ${r.regnalNumber}대`)
      } else {
        console.log(`  ⏭️  재임 스킵 (이미 정확): 신성로마제국 ${r.regnalName} ${r.regnalNumber}대`)
      }
    } else {
      const slotConflict = await prisma.sovereignReign.findFirst({
        where: { historicalCountryId: hreHC.id, regnalNumber: r.regnalNumber },
      })
      if (slotConflict) {
        console.warn(`  ⚠️  재임 충돌: 신성로마제국 ${r.regnalNumber}대 — 다른 인물 점유 (skip)`)
      } else {
        await prisma.sovereignReign.create({
          data: {
            personId: ferdinandId,
            historicalCountryId: hreHC.id,
            positionDefinitionId: hrePos.id,
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
          `  ✅ 재임: 신성로마제국 ${r.regnalName} ${r.regnalNumber}대 (1556-02-25 ~ 1564-07-25)`,
        )
      }
    }
  } else {
    console.warn('  ⚠️  관직 정의 \'신성로마황제\' 미존재 — 재임 스킵')
  }

  console.log(`✅ 막시밀리안 2세 부모 시딩 완료\n`)
}
