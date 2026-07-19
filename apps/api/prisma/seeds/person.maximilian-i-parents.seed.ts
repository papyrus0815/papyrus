/**
 * 막시밀리안 1세(Maximilian I, 1459~1519)의 부모 시드
 *
 *  - 아버지: 프리드리히 3세 (Friedrich III, Holy Roman Emperor, 1415~1493) — 합스부르크 가문,
 *    신성로마황제 18대(재위 1452~1493), 교황 로마 대관을 받은 마지막 황제
 *  - 어머니: 엘레오노라 데 포르투갈 (Eleanor of Portugal, 1434~1467) — 아비스 가문,
 *    포르투갈 두아르트 1세의 딸이자 페르난두 두케 데 비제우(마누엘 1세의 부친)의 누이
 *
 * 엘레오노라가 페르난두 비제우 공작의 누이이므로, 그녀의 아들 막시밀리안 1세와
 * 페르난두의 아들 마누엘 1세는 사촌 관계 — 둘 다 두아르트 1세의 손자다.
 *
 * 프리드리히 3세는 약 53년의 King of the Romans·HRE 통치(1440~1493)로 동시기 유럽 군주 중
 * 최장기 재위. 1452-03-19 로마에서 교황 니콜라오 5세에게 황제 대관을 받은 마지막 신성로마황제로,
 * 후임 막시밀리안 1세부터는 교황 대관 없이 "선출 황제(Erwählter Römischer Kaiser)" 칭호 사용.
 *
 * ⚠️ 기존 데이터 보존 모드.
 *
 * 등록 항목:
 *  - Person x2 (프리드리히 3세·엘레오노라 데 포르투갈)
 *  - PersonStats x2
 *  - PersonSpouse x2 (양방향 결혼, 1452-03-16 ~ 1467-09-03 사별)
 *  - PersonCountryAffiliation x2
 *  - 부자/모자 관계: 프리드리히 + 엘레오노라 → 막시밀리안 1세
 *  - SovereignReign x1 (프리드리히 3세 신성로마황제 18대, 1452-03-19 ~ 1493-08-19)
 *
 * ⚠️ 의존: person.philip-i-parents.seed (막시밀리안 1세 등록), person.felipe-ii.seed (아비스 가문),
 *  person.charles-v.seed (합스부르크 가문 + 신성로마제국 HC)
 */
import {
  AppointmentMethod,
  DeathType,
  TenureEndReason,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

// ── 프리드리히 3세 본문 ────────────────────────────────────────────────────
const FRIEDRICH_III = {
  name: '프리드리히',
  surname: '합스부르크',
  originalName: 'Friedrich III, Holy Roman Emperor',
  regnalName: '3세',
  birthYear: 1415,
  birthMonth: 9,
  birthDay: 21,
  deathYear: 1493,
  deathMonth: 8,
  deathDay: 19,
  birthPlaceText: '신성로마제국 티롤 인스부르크 — 호프부르크 궁',
  deathPlaceText: '신성로마제국 오스트리아 린츠(Linz) — 황제 별궁',
  deathType: DeathType.ILLNESS,
  deathCause: '왼쪽 다리 절단 후 합병증',
  deathNote: '1493년 8월 19일 린츠에서 향년 77세로 사망했다. 1493년 6월경 왼쪽 다리에 발생한 괴저(gangrene)로 두 차례 절단 수술을 받았으나 약 두 달 후 합병증으로 사망했다. 시신은 빈의 성 슈테판 대성당에 안치되어 21세기 현재까지 보존되고 있다. 약 53년 King of the Romans·HRE 통치로 동시기 유럽 군주 중 최장기 재위 기록을 남겼다.',
  biography:
    '합스부르크 가문 출신의 신성로마제국 18대 황제(재위 1452~1493). 부친 에른스트 데어 아이젤네(Ernst der Eiserne, 오스트리아 공작 1377~1424)와 마조비아의 침부르기스(Cymburgis of Masovia, 1394~1429)의 장남이다. 부친이 1424년 사망하면서 9세에 오스트리아 영지의 일부를 상속했다.\n\n' +
    '1440년 2월 2일 사촌 알브레히트 2세(HRE 17대)가 헝가리 원정 중 사망하면서, 24세의 프리드리히가 King of the Romans로 선출되었다. 같은 해 6월 17일 프랑크푸르트에서 만장일치 선출, 1442년 6월 17일 아헨 대성당에서 대관식이 열렸다.\n\n' +
    '1452년 3월 16일 로마에서 포르투갈 엘레오노라(Eleanor of Portugal, 두아르트 1세의 딸)와 결혼식을 올렸고, 사흘 후인 3월 19일 같은 도시에서 교황 니콜라오 5세에게 정식 신성로마황제 대관을 받았다. 프리드리히는 교황의 로마 대관을 받은 마지막 신성로마황제이며, 후임 막시밀리안 1세부터는 1508년 율리오 2세 인가 후 교황 대관 없이 "선출 황제(Erwählter Römischer Kaiser)" 칭호를 사용했다.\n\n' +
    '엘레오노라와의 결혼 약 15년 동안 다섯 명의 자녀를 두었으나, 그중 둘만 성인까지 생존했다. 후일 신성로마황제 19대 막시밀리안 1세(1459~1519)와 바이에른 공작비 쿠니군데(1465~1520)가 그 둘이다. 1467년 9월 3일 엘레오노라가 다섯째 자녀 임신 중 이질로 32세에 사망하면서, 프리드리히는 약 26년간 미망인 생활을 했고 재혼하지 않았다.\n\n' +
    '프리드리히의 재위는 약 53년의 긴 시간 동안 결정적 사건과 무행동의 양면이 공존했다. 별칭 "Erzschläfer(아치슬레퍼, 大睡眠者)"는 신중하고 느린 결정 스타일에서 비롯되었으며, 동시기 동시대인들의 비웃음 섞인 평가였다. 그러나 모토 AEIOU(Austriae Est Imperare Orbi Universo — 오스트리아는 세계를 다스릴 운명)는 그의 비전을 압축하고 있었다.\n\n' +
    '결정적 외교 성과는 1473년 트리어 회담에서 부르고뉴 공작 샤를 1세(담대공)와 협상해 아들 막시밀리안과 샤를의 딸 마리의 결혼 약속을 받아낸 것이다. 이 약속은 1477년 실제 결혼으로 이행되어, 합스부르크 가문이 부르고뉴 영지(저지대)를 상속받는 결정적 토대가 되었다. 마누엘 1세 등장 이전까지 약 25년의 합스부르크-아비스 동맹의 시작이기도 했다.\n\n' +
    '내정에서는 헝가리 왕 마차시 1세 후냐디(Matthias Corvinus)와 약 30년에 걸친 분쟁을 겪었다. 1485년 마차시가 빈을 점령해 프리드리히가 약 5년간 빈에서 추방되어 떠돌이 황제 생활을 했고, 1490년 마차시 사망 후에야 빈 회복. 또한 합스부르크 영지 분할 분쟁(동생 알브레히트 6세와의 갈등 등)에 시달렸다.\n\n' +
    '1493년 6월경 왼쪽 다리에 괴저(gangrene)가 발생했고, 두 차례의 절단 수술을 받았으나 8월 19일 린츠에서 향년 77세로 사망했다. 후계자 막시밀리안 1세가 1486년부터 King of the Romans로 후계자 사전 지명되어 있었기에 즉시 신성로마황제로 즉위했다.\n\n' +
    '프리드리히 3세의 유산은 합스부르크 가문 권력의 결정적 토대였다. (1)약 53년 재위로 합스부르크 가문이 신성로마황제 자리를 "사실상 세습"하는 관행 정착 (2)1473년 부르고뉴 결혼 약속 → 1477 막시밀리안-마리 결혼 → 합스부르크령 네덜란드 상속 (3)모토 AEIOU의 합스부르크 세계관 정립 (4)교황 대관을 받은 마지막 황제로서 신성로마 권위의 중세적 정점.',
  influence: 80,
  stats: {
    politics: 70,
    military: 50,
    diplomacy: 80,
    intellect: 70,
    charisma: 55,
    administration: 60,
    notes:
      '약 53년 King of the Romans·HRE 통치로 동시기 유럽 군주 중 최장기 재위. 별칭 "Erzschläfer(아치슬레퍼)"가 보여주듯 결정적 행동보다 신중한 인내 스타일. 그러나 1473 트리어 회담의 부르고뉴 결혼 약속이 결정적 외교 성과로, 1477년 막시밀리안-마리 결혼을 통해 합스부르크령 네덜란드 상속의 토대를 마련했다. 군사는 1485 마차시 1세에게 빈을 빼앗기는 등 결정적 패배 다수. 행정은 합스부르크 가문 영지 운영 약 70년의 누적 경험. 카리스마는 동시기 평가가 비웃음 섞임 — 그러나 장기 재위로 합스부르크의 황제 자리 사실상 세습 관행을 정착시켰다.',
  },
} as const

// ── 엘레오노라 데 포르투갈 본문 ────────────────────────────────────────────
const ELEANOR_PORTUGAL = {
  name: '엘레오노라',
  surname: '아비스',
  originalName: 'Eleanor of Portugal (Holy Roman Empress)',
  regnalName: undefined as string | undefined,
  birthYear: 1434,
  birthMonth: 9,
  birthDay: 18,
  deathYear: 1467,
  deathMonth: 9,
  deathDay: 3,
  birthPlaceText: '포르투갈 왕국 토레스 베드라스(Torres Vedras)',
  deathPlaceText: '신성로마제국 오스트리아 빈 노이슈타트(Wiener Neustadt) — 호프부르크 별궁',
  deathType: DeathType.ILLNESS,
  deathCause: '이질 + 다섯째 임신 합병증',
  deathNote: '1467년 9월 3일 빈 노이슈타트에서 향년 32세로 사망했다. 다섯째 자녀 임신 약 6개월 시점에 이질(dysentery)에 걸려 약 한 달간 고열과 출혈로 시달리다 사망했고, 태아도 함께 사망했다. 시신은 노이클로스터 시토회 수도원(Stift Neukloster, 빈 노이슈타트)에 안치되어 21세기 현재까지 보존되고 있다.',
  biography:
    '아비스 가문 출신의 신성로마황후(재위 1452~1467). 포르투갈 왕 두아르트 1세(Edward I of Portugal, 1391~1438)와 아라곤 엘레오노라(Eleanor of Aragon, 1402~1445)의 딸이다. 이복 형제로는 후일 포르투갈 왕 아폰수 5세(1432~1481)와 비제우 공작 페르난두(1433~1470 — 마누엘 1세의 아버지)가 있어, 엘레오노라의 아들 막시밀리안 1세와 페르난두의 아들 마누엘 1세는 사촌 관계가 된다.\n\n' +
    '1434년 9월 18일 포르투갈 토레스 베드라스에서 태어났다. 약 4세였던 1438년 부친 두아르트 1세가 페스트로 사망하면서 형 아폰수 5세가 6세에 즉위했고, 엘레오노라는 어머니 엘레오노라와 숙부 페드루 공작의 섭정 정치 시기를 지나 양육되었다.\n\n' +
    '약 17세였던 1451년 신성로마황제 후보 프리드리히 3세와의 결혼이 합의되었다. 부친 두아르트 1세가 살아있을 때부터 진행되어 온 합스부르크-아비스 동맹의 결과였다. 1451년 11월 결혼식을 위해 포르투갈에서 출발해 약 4개월 항해 후 1452년 2월 이탈리아 시에나에서 프리드리히 3세와 첫 만남이 이루어졌다. 1452년 3월 16일 로마에서 정식 결혼식이 거행되었고, 사흘 후 3월 19일 같은 도시에서 교황 니콜라오 5세가 프리드리히에게 신성로마황제 대관을 했다.\n\n' +
    '엘레오노라와 프리드리히의 결혼 약 15년 동안 다섯 명의 자녀를 두었다. 1455년 크리스토프(영아 사망), 1459년 막시밀리안(후일 신성로마황제 19대 막시밀리안 1세), 1460년 헬레나(영아 사망), 1465년 쿠니군데(후일 바이에른 공작비, 1520년 사망), 1466년 요하네스(영아 사망)였다. 다섯 명 중 성인까지 생존한 것은 막시밀리안과 쿠니군데 둘뿐이었다.\n\n' +
    '엘레오노라는 빈 호프부르크 궁에서 약 15년간 황후로 재임하며 르네상스 학예 후원에 활발했다. 동시기 평가에서 외교적 매력과 인문 교양으로 칭송받았으나, 정치적 영향력은 제한적이었다. 후일 막시밀리안 1세가 르네상스 후원자로 두각을 나타낸 데에는 어머니의 직접 영향이 컸다.\n\n' +
    '1467년 다섯째 자녀를 임신 중 약 6개월 시점에 빈 노이슈타트에서 이질에 걸렸다. 약 한 달간 고열과 출혈로 시달리다 1467년 9월 3일 향년 32세에 사망했고, 태아도 함께 사망했다. 8세였던 막시밀리안 1세에게는 평생의 트라우마였다. 프리드리히 3세는 재혼하지 않고 약 26년간 미망인 생활을 했다.\n\n' +
    '엘레오노라의 사후 영향은 결정적이다. 그녀의 아들 막시밀리안 1세를 통해 합스부르크 가문이 부르고뉴 영지(1477)를 상속받았고, 손자 펠리페 1세를 통해 카스티야·아라곤(1496)을 상속받았으며, 증손자 카를 5세를 통해 합스부르크 가문이 사상 최대 영토 군주로 부상했다. 또한 형 페르난두를 통해 사촌 마누엘 1세가 포르투갈 왕이 되어 합스부르크-아비스 동맹의 양 축이 되었다.',
  influence: 50,
  stats: {
    politics: 45,
    military: 10,
    diplomacy: 65,
    intellect: 70,
    charisma: 70,
    administration: 40,
    notes:
      '약 15년 황후 재임 동안 르네상스 학예 후원에 활발했고 다언어 능력(포르투갈어·라틴어·이탈리아어·독일어)으로 외교적 매력 발휘. 정치 활동은 제한적이었으나 다섯 자녀 중 성인 생존 막시밀리안 1세와 쿠니군데를 통해 합스부르크 가문 16세기 도약의 직접 매개자가 되었다. 32세 요절로 잠재력의 일부만 발휘. 학식과 카리스마는 동시기 평가 우수.',
  },
} as const

export async function seedMaximilianIParents(prisma: PrismaService): Promise<void> {
  console.log('\n👑 막시밀리안 1세 부모(프리드리히 3세 + 엘레오노라 데 포르투갈) 시딩 시작...')

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
  const avizDynasty = await prisma.dynasty.findFirst({
    where: { name: '아비스 가문' },
    select: { id: true },
  })
  if (!habsburgDynasty || !avizDynasty) {
    console.warn('  ⚠️  합스부르크/아비스 가문 미존재')
    return
  }

  const hreHC = await prisma.historicalCountry.findFirst({
    where: { name: '신성로마제국' },
    select: { id: true },
  })
  const portugalHC = await prisma.historicalCountry.findFirst({
    where: { name: '포르투갈 왕국' },
    select: { id: true },
  })
  if (!hreHC || !portugalHC) {
    console.warn('  ⚠️  신성로마제국/포르투갈 HC 미존재')
    return
  }

  const maxI = await prisma.person.findFirst({
    where: { originalName: 'Maximilian I, Holy Roman Emperor' },
    select: { id: true, fatherId: true, motherId: true },
  })
  if (!maxI) {
    console.warn('  ⚠️  막시밀리안 1세 미존재 — 먼저 person.philip-i-parents.seed 실행 필요')
    return
  }

  const hrePos = await prisma.governmentPositionDefinition.findFirst({
    where: { title: '황제' },
    select: { id: true },
  })

  // ── Helper: Person 등록 ──────────────────────────────────────────────
  const createOrFindPerson = async (
    spec: typeof FRIEDRICH_III | typeof ELEANOR_PORTUGAL,
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

  // ── 1) Person 등록 ────────────────────────────────────────────────────
  const friedrichId = await createOrFindPerson(FRIEDRICH_III, 'MALE', habsburgDynasty.id)
  const eleanorId = await createOrFindPerson(ELEANOR_PORTUGAL, 'FEMALE', avizDynasty.id)

  // ── 2) PersonStats x2 ──────────────────────────────────────────────────
  for (const [pid, spec, label] of [
    [friedrichId, FRIEDRICH_III, '프리드리히 3세'],
    [eleanorId, ELEANOR_PORTUGAL, '엘레오노라 데 포르투갈'],
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
    [friedrichId, hreHC.id, '프리드리히 3세', '신성로마제국'],
    [eleanorId, portugalHC.id, '엘레오노라 데 포르투갈', '포르투갈 왕국'],
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
  const mStart = new Date(1452, 2, 16) // 1452-03-16 로마
  const mEnd = new Date(1467, 8, 3) // 1467-09-03 엘레오노라 사망
  const mNote =
    '1452년 3월 16일 로마에서 결혼. 프리드리히 3세 36세, 엘레오노라 17세. 부친 두아르트 1세가 살아있을 때부터 진행된 합스부르크-아비스 동맹의 결과로, 엘레오노라가 1451년 11월 포르투갈에서 출발해 약 4개월 항해 후 1452년 2월 이탈리아 시에나에서 첫 만남이 이루어졌다. 결혼식 사흘 후 3월 19일 같은 도시에서 교황 니콜라오 5세가 프리드리히에게 신성로마황제 대관을 거행했다. 약 15년 결혼 생활 동안 5명의 자녀를 두었으나 막시밀리안 1세와 쿠니군데(바이에른 공작비) 둘만 성인까지 생존했다. 1467년 9월 3일 엘레오노라가 다섯째 임신 중 이질로 32세 사망하면서 결혼 종결. 프리드리히 3세는 약 26년간 미망인 생활을 했고 재혼하지 않았다.'

  for (const [aId, bId, label] of [
    [friedrichId, eleanorId, '프리드리히 → 엘레오노라'],
    [eleanorId, friedrichId, '엘레오노라 → 프리드리히'],
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
    console.log(`  ✅ 결혼: ${label} (1452-03-16 ~ 1467-09-03 사별)`)
  }

  // ── 5) 부자/모자 관계: 프리드리히 + 엘레오노라 → 막시밀리안 1세 ──────────
  if (maxI.fatherId) {
    console.log(`  ⏭️  부자 스킵 (이미 연결): 막시밀리안 1세 fatherId=${maxI.fatherId}`)
  } else {
    await prisma.person.update({
      where: { id: maxI.id },
      data: { fatherId: friedrichId },
    })
    console.log(`  ✅ 부자: 프리드리히 3세 → 막시밀리안 1세`)
  }
  if (maxI.motherId) {
    console.log(`  ⏭️  모자 스킵 (이미 연결): 막시밀리안 1세 motherId=${maxI.motherId}`)
  } else {
    await prisma.person.update({
      where: { id: maxI.id },
      data: { motherId: eleanorId },
    })
    console.log(`  ✅ 모자: 엘레오노라 데 포르투갈 → 막시밀리안 1세`)
  }

  // ── 6) SovereignReign — 신성로마제국 18대 프리드리히 3세 ─────────────────
  if (hrePos) {
    const r = {
      regnalNumber: 18,
      regnalName: '프리드리히 3세',
      startDate: new Date(1452, 2, 19), // 1452-03-19 로마 황제 대관
      endDate: new Date(1493, 7, 19), // 1493-08-19 본인 사망
      appointmentMethod: AppointmentMethod.INDIRECT_ELECTION,
      endReason: TenureEndReason.DEATH_IN_OFFICE,
      endReasonDetail: '1493-08-19 린츠에서 향년 77세 사망 (왼쪽 다리 절단 후 합병증).',
      notes:
        '1440년 2월 2일 사촌 알브레히트 2세 사망 후 같은 해 6월 17일 프랑크푸르트에서 King of the Romans 만장일치 선출, 1442년 6월 17일 아헨 대성당 대관식. 1452년 3월 19일 로마에서 교황 니콜라오 5세에게 신성로마황제 대관을 받은 마지막 황제(후임 막시밀리안 1세부터는 교황 대관 없는 "선출 황제" 모델). 약 53년 King of the Romans·HRE 통치로 동시기 유럽 군주 중 최장기 재위. 모토 AEIOU(Austriae Est Imperare Orbi Universo). 1473 트리어 회담 부르고뉴 결혼 약속 → 1477 막시밀리안-마리 결혼이 합스부르크 가문 권력 도약의 결정적 토대. 1485 마차시 1세에게 빈 점령 약 5년 추방 후 1490 빈 회복. 1493 사망으로 후계자 막시밀리안 1세(이미 1486년 King of the Romans 선출) 즉위.',
    }
    const existingByPerson = await prisma.sovereignReign.findFirst({
      where: { personId: friedrichId, historicalCountryId: hreHC.id },
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
            personId: friedrichId,
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
          `  ✅ 재임: 신성로마제국 ${r.regnalName} ${r.regnalNumber}대 (1452-03-19 ~ 1493-08-19)`,
        )
      }
    }
  } else {
    console.warn('  ⚠️  관직 정의 \'신성로마황제\' 미존재 — 재임 스킵')
  }

  console.log(`✅ 막시밀리안 1세 부모 시딩 완료\n`)
}
