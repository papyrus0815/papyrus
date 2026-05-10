/**
 * 마누엘 1세(Manuel I of Portugal, 1469~1521)의 부모 시드
 *
 *  - 아버지: 페르난두 두케 데 비제우 (Fernando, Duke of Viseu, 1433~1470) — 아비스 가문,
 *    포르투갈 두아르트 1세의 셋째 아들이자 아폰수 5세의 동생, 비제우·베자 공작
 *  - 어머니: 베아트리스 데 포르투갈 (Beatriz of Portugal, 1430~1506) — 아비스 가문 분지,
 *    인판테 주앙(포르투갈 주앙 1세의 손자)의 딸, 향년 76세까지 장수
 *
 * 두 사람의 결혼(1447)은 아비스 가문 직계와 분지의 통합으로, 후일 1495년 왕위 계승 위기 시
 * 막내 아들 마누엘이 사촌 주앙 2세를 이어 포르투갈 왕으로 즉위하는 결정적 토대가 되었다.
 *
 * 페르난두는 공작·왕족 수장이었고 베아트리스는 왕녀로, 둘 다 정식 군주가 아니므로 SovereignReign은
 * 등록하지 않는다. 두 사람의 부모(페르난두의 부친 두아르트 1세, 베아트리스의 부친 인판테 주앙 등)는
 * 본 시드의 범위 밖이며 전기에만 언급한다.
 *
 * ⚠️ 기존 데이터 보존 모드.
 *
 * 등록 항목:
 *  - Person x2 (페르난두 두케 데 비제우·베아트리스 데 포르투갈)
 *  - PersonStats x2
 *  - PersonSpouse x2 (양방향 결혼, 1447 ~ 1470-09-18 사별)
 *  - PersonCountryAffiliation x2 (둘 다 포르투갈 왕국 CITIZENSHIP)
 *  - 부자/모자 관계: 페르난두 + 베아트리스 → 마누엘 1세
 *
 * ⚠️ 의존: 펠리페 2세 시드(아비스 가문 + 포르투갈 왕국 HC) + 이사벨 데 포르투갈 부모 시드(마누엘 1세 등록)
 */
import { DeathType } from '@prisma/client'

import { PrismaService } from '../prisma.service'

// ── 페르난두 두케 데 비제우 본문 ──────────────────────────────────────────
const FERNANDO_VISEU = {
  name: '페르난두',
  surname: '아비스',
  originalName: 'Fernando, Duke of Viseu',
  regnalName: undefined as string | undefined,
  birthYear: 1433,
  birthMonth: 11,
  birthDay: 17,
  deathYear: 1470,
  deathMonth: 9,
  deathDay: 18,
  birthPlaceText: '포르투갈 왕국 알메이림(Almeirim)',
  deathPlaceText: '포르투갈 왕국 세투발(Setúbal)',
  deathType: DeathType.ILLNESS,
  deathCause: '말년 발열성 질환',
  deathNote: '1470년 9월 18일 세투발에서 향년 36세로 사망했다. 사망 약 1주일 전부터 발열성 질환을 앓았으며, 정확한 사인은 동시기 기록에서 확인되지 않는다. 비제우 공작으로 약 28년 재임 중 38세에 요절했다. 시신은 바탈랴 수도원(Mosteiro da Batalha)에 안치되었다.',
  biography:
    '아비스 가문 출신의 비제우 공작 2대(재위 1442~1470)·베자 공작·아비스 기사단 단장. 포르투갈 왕 두아르트 1세(Edward I of Portugal, 1391~1438)와 아라곤 엘레오노라(Eleanor of Aragon, 1402~1445 — 아라곤 페르난도 1세의 딸)의 셋째 아들이다. 형 아폰수 5세(Afonso V, 1432~1481)는 후일 포르투갈 왕이 되었고, 동생 후아나(Joanna)는 후일 카스티야 왕 엔리케 4세의 부인이 되었다.\n\n' +
    '1433년 11월 17일 알메이림에서 출생했다. 약 5세였던 1438년 부친 두아르트 1세가 페스트로 사망하면서 형 아폰수 5세가 6세에 즉위했고, 페르난두는 어머니 엘레오노라와 숙부 페드루 공작의 섭정 정치 시기를 지나 양육되었다. 1448년 형 아폰수 5세가 친정을 시작한 후 페르난두는 왕실 정치의 핵심 동반자가 되었다.\n\n' +
    '약 9세였던 1442년 첫째 형 후안(João, 비제우 공작 1대, 1400~1442)의 사망으로 비제우 공작 작위를 세습했다. 1453년에는 베자 공작 작위도 추가 수여받았으며, 1456년부터는 아비스 기사단 단장도 겸했다. 1453년부터는 북아프리카 탕헤르(Tangier) 총독으로 약 10년 재임하며 군사 경험을 쌓았다.\n\n' +
    '1447년 14세에 사촌 베아트리스 데 포르투갈(Beatriz of Portugal, 인판테 주앙의 딸)과 결혼했다. 약 23년의 결혼 생활 동안 11명의 자녀를 두었으며, 그중 7명이 성인까지 생존했다. 후일 비제우 공작 3대 후안(1448~1483), 비제우 공작 4대 디오구(1450~1484, 후일 주앙 2세에게 살해), 카스티야 왕비가 된 엘레오노라 데 비제우(1458~1525, 후일 주앙 2세의 부인), 브라간사 가문에 시집간 이사벨(1459~1521), 후일 포르투갈 14대 국왕이 된 마누엘 1세(1469년생, 우리 시드의 마누엘 1세) 등이 그 자녀들이다.\n\n' +
    '1470년 9월 18일 세투발에서 향년 36세로 발열성 질환으로 사망했다. 비제우 공작 작위는 첫째 아들 후안에게 세습되었고, 후일 디오구·마누엘 순으로 이어졌다. 페르난두의 사후 영향은 결정적이었다. 그의 후손이 포르투갈 왕가와 카스티야 왕비, 브라간사 가문 등을 통해 이베리아 왕가들과 밀접히 연결되었으며, 막내 아들 마누엘이 1495년 형 아폰수 5세의 손자 주앙 2세의 후사 부재로 포르투갈 왕위에 오르면서 직계 계승자로 부상했다.',
  influence: 50,
  stats: {
    politics: 55,
    military: 60,
    diplomacy: 60,
    intellect: 60,
    charisma: 60,
    administration: 55,
    notes:
      '약 28년 비제우 공작·베자 공작 재임 중 36세에 요절해 본격적인 정치 경력은 짧았다. 군사는 1453년부터 북아프리카 탕헤르 총독으로 약 10년 재임하며 경험을 쌓았다. 정치는 형 아폰수 5세의 핵심 동반자로 왕실 운영에 기여. 행정은 비제우·베자 공작령 통치로 행정 경험. 11명의 자녀 출산으로 가문 확장에 기여했고, 그중 마누엘 1세를 통해 포르투갈 대항해 시대 정점 왕가의 직접 조상이 되었다.',
  },
} as const

// ── 베아트리스 데 포르투갈 본문 ────────────────────────────────────────────
const BEATRIZ_PORTUGAL = {
  name: '베아트리스',
  surname: '아비스',
  originalName: 'Beatriz of Portugal (Duchess of Viseu)',
  regnalName: undefined as string | undefined,
  birthYear: 1430,
  birthMonth: 6,
  birthDay: 13, // 정확한 날짜 미상, 6월로 추정
  deathYear: 1506,
  deathMonth: 9,
  deathDay: 30,
  birthPlaceText: '포르투갈 왕국 — 인판테 주앙 가문 영지',
  deathPlaceText: '포르투갈 왕국 리스본',
  deathType: DeathType.ILLNESS,
  deathCause: '노환',
  deathNote: '1506년 9월 30일 리스본에서 향년 76세로 자연사했다. 1470년 남편 페르난두 두케 데 비제우 사망 후 약 36년간 미망인으로 자녀들을 양육·정치 매개자 역할을 수행했다. 시신은 마드레 데 데우스 수녀원(Convento da Madre de Deus, 리스본)에 안치되었다.',
  biography:
    '아비스 가문 분지 출신의 비제우·베자 공작비(재위 1447~1470). 인판테 주앙(Infante João of Portugal, Lord of Reguengos, 1400~1442 — 포르투갈 왕 주앙 1세의 셋째 아들)과 이사벨 드 바르셀로스(Isabel of Barcelos, 1402~1466)의 딸이다. 인판테 주앙은 포르투갈 왕가의 분지 인물이었고, 어머니 이사벨은 브라간사 가문(House of Bragança)의 시조 아폰수 1세 브라간사(Afonso, 1st Duke of Bragança)의 딸이었다.\n\n' +
    '1430년경 포르투갈에서 태어났다. 약 12세였던 1442년 부친 인판테 주앙이 사망하면서 어머니 이사벨이 자녀들을 양육했다. 1466년 어머니가 사망할 때까지 모친의 영향 아래 양육되었다.\n\n' +
    '1447년 17세에 사촌 페르난두 두케 데 비제우(당시 14세)와 결혼했다. 사촌 결혼이었으나 동시기 아비스 가문 직계와 분지의 통합으로 정치적 의미가 컸다. 약 23년의 결혼 생활 동안 11명의 자녀를 두었고, 그중 7명이 성인까지 생존했다.\n\n' +
    '1470년 9월 18일 남편 페르난두가 세투발에서 36세로 요절하면서, 베아트리스는 40세에 미망인이 되었다. 이후 약 36년간 자녀들의 양육과 정치적 매개자 역할을 수행했다. 1484년에는 둘째 아들 디오구 비제우 공작 4대가 사촌 주앙 2세에 의해 살해되는 비극을 겪었고, 1495년에는 막내 아들 마누엘이 주앙 2세를 이어 포르투갈 14대 국왕(마누엘 1세)으로 즉위하는 영광을 보았다.\n\n' +
    '1506년 9월 30일 리스본에서 향년 76세로 자연사했다. 동시기 평균 수명을 크게 넘은 장수였다. 사망 직전 손녀 이사벨 데 포르투갈(우리 시드의 이사벨 황후, 카를 5세의 부인이자 펠리페 2세의 어머니)이 1503년 출생해 약 3세까지 양육에 참여했을 가능성이 있다.\n\n' +
    '베아트리스의 사후 영향은 결정적이다. 그녀의 11명의 자녀를 통해 포르투갈·카스티야·브라간사 가문 사이의 혈연이 형성되었고, 막내 아들 마누엘 1세를 통해 16세기 대항해 시대 포르투갈 왕가의 직접적 모친이 되었다. 외손녀 이사벨 데 포르투갈을 통해 합스부르크-아비스 동맹의 혈통적 뿌리이기도 하다.',
  influence: 45,
  stats: {
    politics: 50,
    military: 10,
    diplomacy: 60,
    intellect: 60,
    charisma: 65,
    administration: 50,
    notes:
      '약 23년의 결혼 생활 동안 11명의 자녀를 두었고, 그중 7명이 성인까지 생존했다. 1470년 40세에 미망인이 된 후 약 36년간 자녀 양육과 가문 정치적 매개자로 활동했다. 정치적 직접 활동은 적었으나 11명의 자녀를 통해 포르투갈·카스티야·브라간사 가문의 혈연 통합에 기여했다. 76세까지 장수해 손자 세대까지 직접 영향을 미쳤다. 막내 아들 마누엘 1세의 1495년 즉위와 1503년 외손녀 이사벨 데 포르투갈의 출생을 모두 보았다.',
  },
} as const

export async function seedManuelIParents(prisma: PrismaService): Promise<void> {
  console.log('\n👑 마누엘 1세 부모(페르난두 두케 데 비제우 + 베아트리스 데 포르투갈) 시딩 시작...')

  // ── 사전 의존성 ────────────────────────────────────────────────────────
  const admin = await prisma.account.findUnique({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  ⚠️  admin 계정 미존재')
    return
  }

  const avizDynasty = await prisma.dynasty.findFirst({
    where: { name: '아비스 가문' },
    select: { id: true },
  })
  if (!avizDynasty) {
    console.warn('  ⚠️  아비스 가문 미존재 — 먼저 person.felipe-ii.seed 실행 필요')
    return
  }

  const portugalHC = await prisma.historicalCountry.findFirst({
    where: { name: '포르투갈 왕국' },
    select: { id: true },
  })
  if (!portugalHC) {
    console.warn('  ⚠️  포르투갈 왕국 HC 미존재')
    return
  }

  const manuelI = await prisma.person.findFirst({
    where: { originalName: 'Manuel I of Portugal' },
    select: { id: true, fatherId: true, motherId: true },
  })
  if (!manuelI) {
    console.warn('  ⚠️  마누엘 1세 미존재 — 먼저 person.isabella-portugal-parents.seed 실행 필요')
    return
  }

  // ── Helper: Person 등록 ──────────────────────────────────────────────
  const createOrFindPerson = async (
    spec: typeof FERNANDO_VISEU | typeof BEATRIZ_PORTUGAL,
    gender: 'MALE' | 'FEMALE',
  ): Promise<string> => {
    const existing = await prisma.person.findFirst({
      where: { originalName: spec.originalName },
    })
    if (existing) {
      console.log(`  ⏭️  인물 이미 존재 — 스킵: ${spec.originalName} (id=${existing.id})`)
      const patch: any = {}
      if (!existing.dynastyId) patch.dynastyId = avizDynasty.id
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
        dynastyId: avizDynasty.id,
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
  const fernandoId = await createOrFindPerson(FERNANDO_VISEU, 'MALE')
  const beatrizId = await createOrFindPerson(BEATRIZ_PORTUGAL, 'FEMALE')

  // ── 2) PersonStats x2 ──────────────────────────────────────────────────
  for (const [pid, spec, label] of [
    [fernandoId, FERNANDO_VISEU, '페르난두 두케 데 비제우'],
    [beatrizId, BEATRIZ_PORTUGAL, '베아트리스 데 포르투갈'],
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
  for (const [pid, label] of [
    [fernandoId, '페르난두 두케 데 비제우'],
    [beatrizId, '베아트리스 데 포르투갈'],
  ] as const) {
    const exists = await prisma.personCountryAffiliation.findFirst({
      where: {
        personId: pid,
        historicalCountryId: portugalHC.id,
        affiliationType: 'CITIZENSHIP' as any,
      },
    })
    if (exists) {
      console.log(`  ⏭️  소속국가 스킵: ${label} → 포르투갈 왕국`)
      continue
    }
    await prisma.personCountryAffiliation.create({
      data: {
        personId: pid,
        historicalCountryId: portugalHC.id,
        affiliationType: 'CITIZENSHIP' as any,
        priority: 0,
      },
    })
    console.log(`  ✅ 소속국가: ${label} → 포르투갈 왕국 (CITIZENSHIP)`)
  }

  // ── 4) 결혼 관계 (양방향) ─────────────────────────────────────────────
  const mStart = new Date(1447, 5, 15) // 1447년 6월 추정 (정확한 일자 미상)
  const mEnd = new Date(1470, 8, 18) // 1470-09-18 페르난두 사망
  const mNote =
    '1447년 6월경 포르투갈에서 결혼. 페르난두 두케 데 비제우 14세, 베아트리스 데 포르투갈 17세. 사촌 결혼으로 아비스 가문 직계(페르난두 — 두아르트 1세 후손)와 분지(베아트리스 — 인판테 주앙 후손)의 통합. 약 23년 결혼 생활 동안 11명의 자녀를 두었고, 그중 7명이 성인까지 생존했다. 후일 비제우 공작 3대 후안, 비제우 공작 4대 디오구(1484 주앙 2세에게 살해), 카스티야 왕비 엘레오노라(주앙 2세 부인), 브라간사 가문 이사벨, 그리고 막내 아들 포르투갈 14대 국왕 마누엘 1세(1469년생) 등이 이 부부의 자녀들이다. 1470년 9월 18일 페르난두 36세 사망으로 결혼 종결. 베아트리스는 약 36년 더 살아 1506년 76세까지 장수, 막내 아들 마누엘 1세의 1495년 즉위와 손녀 이사벨 데 포르투갈의 1503년 출생을 모두 보았다.'

  for (const [aId, bId, label] of [
    [fernandoId, beatrizId, '페르난두 → 베아트리스'],
    [beatrizId, fernandoId, '베아트리스 → 페르난두'],
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
    console.log(`  ✅ 결혼: ${label} (1447 ~ 1470-09-18 사별)`)
  }

  // ── 5) 부자/모자 관계: 페르난두 + 베아트리스 → 마누엘 1세 ────────────
  if (manuelI.fatherId) {
    console.log(`  ⏭️  부자 스킵 (이미 연결): 마누엘 1세 fatherId=${manuelI.fatherId}`)
  } else {
    await prisma.person.update({
      where: { id: manuelI.id },
      data: { fatherId: fernandoId },
    })
    console.log(`  ✅ 부자: 페르난두 두케 데 비제우 → 마누엘 1세`)
  }
  if (manuelI.motherId) {
    console.log(`  ⏭️  모자 스킵 (이미 연결): 마누엘 1세 motherId=${manuelI.motherId}`)
  } else {
    await prisma.person.update({
      where: { id: manuelI.id },
      data: { motherId: beatrizId },
    })
    console.log(`  ✅ 모자: 베아트리스 데 포르투갈 → 마누엘 1세`)
  }

  console.log(`✅ 마누엘 1세 부모 시딩 완료\n`)
}
