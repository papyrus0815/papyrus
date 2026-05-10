/**
 * 이사벨 데 포르투갈(아비스 이사벨, 카를 5세 부인)의 부모 시드
 *
 *  - 아버지: 마누엘 1세 (Manuel I of Portugal, 1469~1521) — 포르투갈 17대 국왕, 아비스 가문
 *  - 어머니: 마리아 데 아라곤 (Maria of Aragon, 1482~1517) — 트라스타마라 가문, 가톨릭 양왕의 4녀
 *
 * 마리아 데 아라곤은 이미 등록된 후아나 1세의 친누이로, 그녀의 부모(이사벨 1세·페르난도 2세)는
 * DB에 이미 존재한다. 따라서 새로 만드는 인물은 마누엘 1세와 마리아 데 아라곤 두 명이며,
 * 마리아의 부모 연결은 기존 가톨릭 양왕 레코드를 참조한다.
 *
 * 마누엘 1세의 재위는 포르투갈 대항해 시대의 정점으로, 1497~1499 바스쿠 다 가마의 인도 항로 개척,
 * 1500 페드루 알바르스 카브랄의 브라질 발견, 1510~1515 아폰수 데 알부케르키의 인도양 거점 정복 등을
 * 후원해 사상 최대 해상 식민제국의 기반을 마련했다. 별칭은 "행운왕(o Afortunado)".
 *
 * ⚠️ 기존 데이터 보존 모드 — 이미 있으면 스킵.
 *
 * 등록 항목:
 *  - Person x2 (마누엘 1세·마리아 데 아라곤)
 *  - PersonStats x2
 *  - PersonSpouse x2 (양방향 결혼, 1500-10-30 ~ 1517-03-07 사별)
 *  - PersonCountryAffiliation x2 (마누엘→포르투갈, 마리아→카스티야)
 *  - 부자/모자 관계:
 *      마누엘 + 마리아 → 이사벨 데 포르투갈 (이미 존재하는 자녀에 부모 연결)
 *      페르난도 2세 + 이사벨 1세 → 마리아 데 아라곤 (이미 존재하는 부모를 마리아의 부모로 연결)
 *  - SovereignReign x1 (마누엘 1세 — 포르투갈 17대, 1495-10-25 ~ 1521-12-13)
 *
 * ⚠️ 의존:
 *  - 펠리페 2세 시드(person.felipe-ii.seed) — 포르투갈 왕국 HC + 아비스 가문 생성
 *  - 가톨릭 양왕 시드(person.catholic-monarchs.seed) — 이사벨 1세·페르난도 2세 등록
 *  - 카를 5세 부모 시드(person.charles-v-parents.seed) — 트라스타마라 가문 생성
 *  - 펠리페 2세 시드 — 이사벨 데 포르투갈 등록
 */
import {
  AppointmentMethod,
  DeathType,
  TenureEndReason,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

// ── 마누엘 1세 본문 ────────────────────────────────────────────────────────
const MANUEL_I = {
  name: '마누엘',
  surname: '아비스',
  originalName: 'Manuel I of Portugal',
  regnalName: '1세',
  birthYear: 1469,
  birthMonth: 5,
  birthDay: 31,
  deathYear: 1521,
  deathMonth: 12,
  deathDay: 13,
  birthPlaceText: '포르투갈 왕국 알코셰테(Alcochete)',
  deathPlaceText: '포르투갈 왕국 리스본 — 알카사바 궁(Castelo de São Jorge)',
  deathType: DeathType.ILLNESS,
  deathCause: '발진티푸스 (또는 페스트 추정)',
  deathNote: '1521년 12월 13일 리스본에서 향년 52세로 사망했다. 약 보름간의 발열과 신체 쇠약 끝에 사망한 것으로 기록되어 있다. 시신은 1499년 자신이 건립한 벨렘의 제로니무스 수도원에 안치되어 21세기 현재까지 보존되어 있다.',
  biography:
    '아비스 가문 출신의 포르투갈 왕국 17대 국왕(재위 1495~1521). 별칭은 "행운왕(o Afortunado)"이다. 비주 공작 페르난두(Ferdinand, Duke of Viseu)와 베아트리스 데 포르투갈(Beatriz of Portugal)의 아들로, 직계가 아닌 방계 출신이었다.\n\n' +
    '1495년 10월 25일 사촌이자 처남인 주앙 2세가 41세에 후사 없이 사망하면서 26세에 즉위했다. 약 26년 재위 동안 포르투갈은 대항해 시대의 정점에 도달했다. 1497년부터 1499년까지 바스쿠 다 가마가 인도 항로를 개척했고, 1500년 페드루 알바르스 카브랄이 브라질을 발견했으며, 1510년부터 1515년 사이 아폰수 데 알부케르키가 인도 고아와 말라카, 호르무즈를 점령했다.\n\n' +
    '결혼은 세 차례 했다. 첫 번째 부인은 1497년 결혼한 아라곤의 이사벨라(가톨릭 양왕의 장녀)로, 1498년 출산 합병증으로 사망했다. 두 번째 부인은 1500년 결혼한 마리아 데 아라곤(가톨릭 양왕의 4녀이자 첫 부인의 동생)으로, 1517년 출산 합병증으로 사망했다. 세 번째 부인은 1518년 결혼한 오스트리아의 엘레오노라(카를 5세의 누이)였다.\n\n' +
    '두 번째 부인 마리아와의 사이에서 10명의 자녀가 태어났다. 그중에는 후일 포르투갈 15대 국왕이 된 주앙 3세, 신성로마황후 이사벨 데 포르투갈(카를 5세의 부인이자 펠리페 2세의 어머니), 포르투갈 17대 국왕이 된 엔히크 1세 추기경 등이 포함되어 있었다.\n\n' +
    '문화적 유산도 결정적이었다. 마누엘 양식(Manueline architecture)이라 불리는 후기 고딕과 르네상스의 융합 건축 양식이 그의 후원 아래 발전했고, 1499년 시작된 벨렘의 제로니무스 수도원은 이 양식의 정점으로 평가된다. 1502년 펠리페 1세 다 가마의 인도 항해 후 작성된 인도 항로 보고서는 유럽의 지리 지식에 결정적 변화를 가져왔다.\n\n' +
    '1521년 12월 13일 리스본에서 향년 52세로 사망했다. 두 번째 부인 마리아 사망 약 4년 후의 일이었다. 후계자는 아들 주앙 3세였다. 마누엘 1세의 재위는 포르투갈 식민제국의 기반을 마련한 결정적 시기였으며, 그의 외손자 카를 5세를 통해 합스부르크 가문과의 혈연 관계가 형성되어 1580년 펠리페 2세의 포르투갈 왕위 계승의 토대가 되었다.',
  influence: 80,
  stats: {
    politics: 78,
    military: 65,
    diplomacy: 78,
    intellect: 75,
    charisma: 75,
    administration: 80,
    notes:
      '대항해 시대 포르투갈의 정점을 후원한 행운왕. 정치는 비주 공작 가문 방계 출신으로 즉위했음에도 약 26년 안정 재위. 행정은 식민지 무역 시스템과 카사 다 인디아(Casa da Índia) 설치로 사상 최대 해상 식민제국의 토대 마련. 외교는 카스티야와의 세 차례 결혼 동맹과 토르데시야스 조약(1494) 후속 협상에서 강점. 군사는 직접 지휘 경험 적으나 알부케르키 등 부하 지휘관에 적절한 권한 위임. 학식과 카리스마는 마누엘 양식 건축 후원과 르네상스 학예 후원으로 동시기 평가 우수. 단 1496년 유대인 추방·강제 개종령은 인권 침해의 흠결.',
  },
} as const

// ── 마리아 데 아라곤 본문 ─────────────────────────────────────────────────
const MARIA_ARAGON = {
  name: '마리아',
  surname: '트라스타마라',
  originalName: 'Maria of Aragon (Queen of Portugal)',
  regnalName: undefined as string | undefined,
  birthYear: 1482,
  birthMonth: 6,
  birthDay: 29,
  deathYear: 1517,
  deathMonth: 3,
  deathDay: 7,
  birthPlaceText: '카스티야 왕국 코르도바(Córdoba) — 알카사르',
  deathPlaceText: '포르투갈 왕국 리스본 — 알카사바 궁(Castelo de São Jorge)',
  deathType: DeathType.ILLNESS,
  deathCause: '10번째 출산 합병증',
  deathNote: '1517년 3월 7일 리스본에서 10번째 자녀를 출산한 직후 향년 34세로 사망했다. 17년의 결혼 생활 동안 거의 매년 출산해 모두 10명의 자녀를 두었으며, 이 잦은 출산이 임종을 앞당긴 직접 원인이 되었다. 시신은 남편 마누엘 1세와 함께 벨렘의 제로니무스 수도원에 안치되어 있다.',
  biography:
    '트라스타마라 가문 출신의 포르투갈 왕비(재위 1500~1517). 카스티야의 이사벨 1세와 아라곤의 페르난도 2세, 가톨릭 양왕의 4녀로 코르도바에서 태어났다. 형제로는 후아나 1세(우리의 후아나 1세, 카를 5세의 어머니)와 첫째 언니 이사벨라(포르투갈 마누엘 1세의 첫 부인), 잉글랜드 헨리 8세의 첫 부인이 된 동생 카탈리나 데 아라곤이 있다.\n\n' +
    '1500년 10월 30일 18세에 첫째 언니 이사벨라의 미망인 마누엘 1세와 결혼했다. 첫째 언니가 1498년 산욕열로 사망한 후 가톨릭 양왕은 카스티야-포르투갈 동맹 유지를 위해 마리아를 다시 보냈다. 결혼식은 신부의 가족이 카스티야에서 보낸 한 사절단을 통해 거행되었다.\n\n' +
    '약 17년의 결혼 생활 동안 마리아는 거의 매년 출산해 모두 10명의 자녀를 두었다. 그중 8명이 성인까지 생존했다. 후일 포르투갈 15대 국왕이 된 주앙 3세(1502년생), 카를 5세의 부인이자 펠리페 2세의 어머니가 된 신성로마황후 이사벨 데 포르투갈(1503년생), 베아트리스(사보이 공작비), 루이스(가톨릭 십자군 지휘관), 페르난두(과르다 공작), 아폰수 추기경, 마리아(어린 나이 사망), 후일 포르투갈 17대 국왕이 된 엔히크 1세 추기경(1512년생), 두아르테 추기경, 안토니우(어린 나이 사망)가 그 자녀들이었다.\n\n' +
    '잦은 출산이 누적되어 마리아의 건강은 점진적으로 악화되었다. 1517년 3월 7일 10번째 자녀 안토니우를 출산한 직후 리스본에서 향년 34세로 사망했다. 결혼 후 17년간 사실상 거의 쉼 없이 임신 상태였다.\n\n' +
    '마리아의 사후 영향은 결정적이었다. 그녀의 자녀 중 셋이 포르투갈 왕위에 올랐고(주앙 3세, 엔히크 1세, 그리고 외손자를 통한 펠리페 2세), 딸 이사벨이 카를 5세의 부인이 되면서 합스부르크 가문과 아비스 가문의 직접적 혈연이 형성되었다. 1580년 마지막 아비스 직계 엔히크 1세 사망 후, 마리아의 외손자 펠리페 2세가 모계 혈통으로 포르투갈 왕위 계승권을 주장해 이베리아 연합(1580~1640)이 성립되었다. 즉 마리아는 약 60년에 걸친 합스부르크-아비스 통합의 결정적 매개자였다.',
  influence: 60,
  stats: {
    politics: 50,
    military: 20,
    diplomacy: 65,
    intellect: 70,
    charisma: 65,
    administration: 50,
    notes:
      '약 17년의 짧은 결혼 생활 동안 거의 매년 출산해 10명의 자녀를 두었으며, 그 중 셋이 포르투갈 왕위에 올랐고 딸 이사벨이 신성로마황후가 되어 외손자 펠리페 2세를 거쳐 1580년 이베리아 연합의 혈통적 토대가 되었다. 정치적 활동 기록은 적으나 어머니 이사벨 1세의 직접 교육으로 인문 교양은 우수. 외교 능력은 카스티야와 포르투갈 사이의 동맹 유지에 기여했으나, 잦은 임신과 출산으로 직접적 정치 활동은 제한적이었다. 34세의 요절로 잠재력의 일부만 발휘.',
  },
} as const

// ── 결혼 명세 ──────────────────────────────────────────────────────────────
const MARRIAGE = {
  startYear: 1500,
  startMonth: 10,
  startDay: 30,
  endYear: 1517,
  endMonth: 3,
  endDay: 7,
  note:
    '1500년 10월 30일 카스티야 알칸타라에서 결혼. 마누엘 1세 31세, 마리아 18세. 마누엘 1세의 첫 부인 이사벨라(가톨릭 양왕의 장녀이자 마리아의 친언니)가 1498년 출산 합병증으로 사망한 후 카스티야-포르투갈 동맹 유지를 위해 마리아가 두 번째 부인이 되었다. 약 17년 결혼 생활 동안 10명의 자녀를 두었고, 그중 8명이 성인까지 생존했다. 후일 포르투갈 15대 주앙 3세, 카를 5세 부인 이사벨 데 포르투갈, 포르투갈 17대 엔히크 1세 추기경 등이 이 결혼의 직계 후손이다. 1517년 3월 7일 마리아의 출산 합병증 사망으로 결혼 종결.',
}

export async function seedIsabellaPortugalParents(prisma: PrismaService): Promise<void> {
  console.log('\n👑 이사벨 데 포르투갈(아비스 이사벨) 부모 시딩 시작 (기존 데이터 보존 모드)...')

  // ── 사전 의존성 ────────────────────────────────────────────────────────
  const admin = await prisma.account.findUnique({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  ⚠️  admin 계정이 없어 시딩을 건너뜀')
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

  const trastamaraDynasty = await prisma.dynasty.findFirst({
    where: { name: '트라스타마라 가문' },
    select: { id: true },
  })
  if (!trastamaraDynasty) {
    console.warn('  ⚠️  트라스타마라 가문 미존재 — 먼저 person.charles-v-parents.seed 실행 필요')
    return
  }

  const portugalHC = await prisma.historicalCountry.findFirst({
    where: { name: '포르투갈 왕국' },
    select: { id: true },
  })
  if (!portugalHC) {
    console.warn('  ⚠️  포르투갈 왕국 HC 미존재 — 먼저 person.felipe-ii.seed 실행 필요')
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

  const isabellaPortugal = await prisma.person.findFirst({
    where: { originalName: 'Isabella of Portugal (Empress)' },
    select: { id: true, fatherId: true, motherId: true },
  })
  if (!isabellaPortugal) {
    console.warn('  ⚠️  이사벨 데 포르투갈 미존재 — 먼저 person.felipe-ii.seed 실행 필요')
    return
  }

  const isabelI = await prisma.person.findFirst({
    where: { originalName: 'Isabella I of Castile' },
    select: { id: true },
  })
  const fernandoII = await prisma.person.findFirst({
    where: { originalName: 'Ferdinand II of Aragon' },
    select: { id: true },
  })
  if (!isabelI || !fernandoII) {
    console.warn('  ⚠️  가톨릭 양왕 미존재 — 먼저 person.catholic-monarchs.seed 실행 필요')
    return
  }

  const kingPos = await prisma.governmentPositionDefinition.findFirst({
    where: { title: '국왕' },
    select: { id: true },
  })

  // ── Helper: Person 등록 ──────────────────────────────────────────────
  const createOrFindPerson = async (
    spec: typeof MANUEL_I | typeof MARIA_ARAGON,
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
  const manuelId = await createOrFindPerson(MANUEL_I, 'MALE', avizDynasty.id)
  const mariaId = await createOrFindPerson(MARIA_ARAGON, 'FEMALE', trastamaraDynasty.id)

  // ── 2) PersonStats x2 ──────────────────────────────────────────────────
  for (const [pid, spec, label] of [
    [manuelId, MANUEL_I, '마누엘 1세'],
    [mariaId, MARIA_ARAGON, '마리아 데 아라곤'],
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
    [manuelId, portugalHC.id, '마누엘 1세', '포르투갈 왕국'],
    [mariaId, castileHC.id, '마리아 데 아라곤', '카스티야 왕국'],
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
    [manuelId, mariaId, '마누엘 → 마리아'],
    [mariaId, manuelId, '마리아 → 마누엘'],
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
    console.log(`  ✅ 결혼: ${label} (1500-10-30 ~ 1517-03-07 사별)`)
  }

  // ── 5) 부자/모자 관계 ─────────────────────────────────────────────────
  // (a) 마누엘 + 마리아 → 이사벨 데 포르투갈
  if (isabellaPortugal.fatherId) {
    console.log(`  ⏭️  부자 스킵 (이미 연결): 이사벨 데 포르투갈 fatherId=${isabellaPortugal.fatherId}`)
  } else {
    await prisma.person.update({
      where: { id: isabellaPortugal.id },
      data: { fatherId: manuelId },
    })
    console.log(`  ✅ 부자: 마누엘 1세 → 이사벨 데 포르투갈`)
  }
  if (isabellaPortugal.motherId) {
    console.log(`  ⏭️  모자 스킵 (이미 연결): 이사벨 데 포르투갈 motherId=${isabellaPortugal.motherId}`)
  } else {
    await prisma.person.update({
      where: { id: isabellaPortugal.id },
      data: { motherId: mariaId },
    })
    console.log(`  ✅ 모자: 마리아 데 아라곤 → 이사벨 데 포르투갈`)
  }

  // (b) 페르난도 2세 + 이사벨 1세 → 마리아 데 아라곤
  const mariaRecord = await prisma.person.findFirst({
    where: { id: mariaId },
    select: { fatherId: true, motherId: true },
  })
  if (mariaRecord?.fatherId) {
    console.log(`  ⏭️  부자 스킵 (이미 연결): 마리아 fatherId=${mariaRecord.fatherId}`)
  } else {
    await prisma.person.update({
      where: { id: mariaId },
      data: { fatherId: fernandoII.id },
    })
    console.log(`  ✅ 부자: 페르난도 2세 → 마리아 데 아라곤`)
  }
  if (mariaRecord?.motherId) {
    console.log(`  ⏭️  모자 스킵 (이미 연결): 마리아 motherId=${mariaRecord.motherId}`)
  } else {
    await prisma.person.update({
      where: { id: mariaId },
      data: { motherId: isabelI.id },
    })
    console.log(`  ✅ 모자: 이사벨 1세 → 마리아 데 아라곤`)
  }

  // ── 6) SovereignReign (마누엘 1세 — 포르투갈 17대) ──────────────────
  // 포르투갈 HC start=1139 아폰수 1세부터, 부르고뉴 12대[페르난두 1세] → 1383~1385 인테르레그눔 →
  // 아비스 13대 주앙 1세 → 14대 두아르트 1세 → 15대 아폰수 5세 → 16대 주앙 2세 → 17대 마누엘 1세
  if (portugalHC && kingPos) {
    const r = {
      personId: manuelId,
      historicalCountryId: portugalHC.id,
      historicalCountryName: '포르투갈 왕국',
      regnalNumber: 17,
      regnalName: '마누엘 1세',
      startDate: new Date(1495, 9, 25), // 1495-10-25 사촌 주앙 2세 사망 후 즉위
      endDate: new Date(1521, 11, 13), // 1521-12-13 본인 사망
      appointmentMethod: AppointmentMethod.HEREDITARY,
      endReason: TenureEndReason.DEATH_IN_OFFICE,
      endReasonDetail: '1521년 12월 13일 리스본에서 향년 52세로 사망 (발진티푸스 또는 페스트 추정).',
      notes:
        '1495년 10월 25일 사촌이자 처남 주앙 2세가 41세에 후사 없이 사망하면서 26세에 즉위. 약 26년 재위 동안 포르투갈 대항해 시대의 정점에 도달했다. 1497~1499 바스쿠 다 가마의 인도 항로 개척, 1500 페드루 알바르스 카브랄의 브라질 발견, 1510~1515 아폰수 데 알부케르키의 인도 고아·말라카·호르무즈 점령을 후원해 사상 최대 해상 식민제국의 기반을 마련했다. 1496년 유대인 추방·강제 개종령은 인권 침해의 흠결이다. 1521년 사망으로 아들 주앙 3세에게 왕위 상속.',
    }
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
        console.log(`  🔧 재임 정정: ${r.historicalCountryName} ${r.regnalName} ${r.regnalNumber}대`)
      } else {
        console.log(
          `  ⏭️  재임 스킵 (이미 정확): ${r.historicalCountryName} ${r.regnalName} ${r.regnalNumber}대`,
        )
      }
    } else {
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
      } else {
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
    }
  } else {
    if (!kingPos) console.warn('  ⚠️  관직 정의 \'국왕\' 미존재 — 재임 스킵')
  }

  console.log(`✅ 이사벨 데 포르투갈 부모 시딩 완료\n`)
}
