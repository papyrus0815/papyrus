/**
 * 마리 데 부르고뉴(Mary of Burgundy, 1457~1482)의 부모 시드
 *
 *  - 아버지: 담대공 샤를 1세 (Charles the Bold, 1433~1477) — 발루아-부르고뉴 가문,
 *    부르고뉴 공국 4대 공작(재위 1467~1477), 1477년 낭시 전투에서 전사
 *  - 어머니: 이사벨라 데 부르봉 (Isabella of Bourbon, 1434~1465) — 부르봉 가문,
 *    담대공 샤를의 두 번째 부인이자 사촌, 1465년 결핵으로 사망
 *
 * 두 사람은 사촌 관계 — 샤를의 아버지 선량공 필리프 3세와 이사벨라의 어머니 아녜스 데 부르고뉴
 * (Agnes of Burgundy)가 남매(둘 다 용맹공 장 1세의 자녀)였다. 1454년 결혼은 발루아-부르고뉴와
 * 부르봉 가문 사이의 통합 사촌 결혼이었다.
 *
 * ⚠️ 기존 데이터 보존 모드.
 *
 * 등록 항목:
 *  - Person x2 (담대공 샤를·이사벨라 데 부르봉)
 *  - PersonStats x2
 *  - PersonSpouse x2 (양방향 결혼, 1454-10-30 ~ 1465-09-25 사별)
 *  - PersonCountryAffiliation x2 (둘 다 부르고뉴 공국 CITIZENSHIP)
 *  - 부자/모자 관계: 샤를 + 이사벨라 → 마리 데 부르고뉴
 *  - SovereignReign x1 (담대공 샤를 1세 — 부르고뉴 공국 4대, 1467-06-15 ~ 1477-01-05, BATTLE)
 *
 * ⚠️ 의존: person.philip-i-parents.seed (마리 부르고뉴 + 발루아-부르고뉴 가문 + 부르고뉴 공국 HC 등록)
 */
import {
  AppointmentMethod,
  DeathType,
  TenureEndReason,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

// ── 담대공 샤를 1세 본문 ─────────────────────────────────────────────────
const CHARLES_BOLD = {
  name: '샤를',
  surname: '발루아-부르고뉴',
  originalName: 'Charles the Bold (Duke of Burgundy)',
  regnalName: '1세',
  birthYear: 1433,
  birthMonth: 11,
  birthDay: 10,
  deathYear: 1477,
  deathMonth: 1,
  deathDay: 5,
  birthPlaceText: '부르고뉴 공국 디종(Dijon)',
  deathPlaceText: '로렌 공국 낭시(Nancy) — 낭시 전투 현장',
  deathType: DeathType.BATTLE,
  deathCause: '낭시 전투 전사',
  deathNote: '1477년 1월 5일 낭시 전투에서 로렌 공작 르네 2세와 스위스 동맹 군대에 패배해 향년 43세로 전사했다. 시신은 약 사흘 후인 1월 7일 낭시 인근 늪에서 발견되었으며, 야생 늑대에 부분 훼손되어 알아보기 어려웠다고 동시기 기록은 전한다. 시신은 처음 낭시에 안치되었으나 1550년 손자뻘 카를 5세의 명령으로 브뤼헤(Brugge)의 성모 성당으로 이장되어 어머니 이사벨라 데 포르투갈 옆에 안치되었다. 21세기 현재까지 보존되고 있다.',
  biography:
    '발루아-부르고뉴 가문 출신의 부르고뉴 공국 4대(=마지막 직계) 공작(재위 1467~1477). 선량공 필리프 3세(Philip III the Good, 1396~1467)와 이사벨라 데 포르투갈(Isabella of Portugal, 1397~1471 — 포르투갈 주앙 1세의 딸이자 두아르트 1세의 누이, 아비스 가문)의 아들이다. 어머니 이사벨라 데 포르투갈을 통해 포르투갈 왕가의 외손이며, 후일 그의 외동딸 마리 부르고뉴의 손자 카를 5세에게 합스부르크-아비스 통합의 한 줄기를 제공했다.\n\n' +
    '1433년 11월 10일 부르고뉴 공국 수도 디종에서 출생했다. 부친 필리프 3세는 약 47년 재위하며 부르고뉴 공국을 신성로마와 프랑스 사이의 사실상 제3의 강대국으로 키웠고, 샤를은 어린 시절부터 후계자로 군사 교육과 르네상스 학예 교육을 받았다.\n\n' +
    '결혼은 세 차례였다. 첫 번째 부인은 1440년 7세에 결혼한 프랑스 발루아 카트린(Catherine of Valois, 1428~1446 — 프랑스 샤를 7세의 딸)으로, 1446년 18세로 사망 시까지 자녀를 두지 못했다. 두 번째 부인은 1454년 10월 30일 결혼한 부르봉 가문 이사벨라(Isabella of Bourbon, 1434~1465 — 사촌, 부르봉 공작 샤를 1세의 딸)로, 외동딸 마리 부르고뉴(1457년생)를 낳고 1465년 30세에 결핵으로 사망했다. 세 번째 부인은 1468년 결혼한 잉글랜드 마르가레타 데 요크(Margaret of York, 1446~1503 — 잉글랜드 에드워드 4세의 누이)로, 자녀를 두지 못했다.\n\n' +
    '1467년 6월 15일 부친 선량공 필리프 3세 사망으로 부르고뉴 공작으로 즉위했다. 약 9년 6개월 재위. 그의 통치는 동시기 유럽에서 가장 야심찬 영토 확장 정책으로 알려졌다. 부르고뉴 공국·플랑드르·브라반트·홀란트·룩셈부르크 등 약 250만 km²를 통합한 부르고뉴 국가(Burgundian State)를 신성로마와 프랑스 사이의 결정적 강대국으로 만들기 위해 ①로렌 공국 정복(부르고뉴 본토와 저지대 영지 사이의 지리적 통합) ②스위스 동맹 격파 ③알자스·라인 지역 확장 등을 시도했다.\n\n' +
    '1473년 트리어 회담에서 신성로마황제 프리드리히 3세와 협상해 외동딸 마리와 프리드리히의 아들 막시밀리안의 결혼을 약속받았다. 이 약속은 후일 1477년 마리-막시밀리안 결혼으로 이행되어 합스부르크가 부르고뉴 영지를 상속받는 결정적 토대가 되었다.\n\n' +
    '1474년부터 시작된 부르고뉴 전쟁(Burgundian Wars)에서 ①1474 헤리쿠르 전투 패배 ②1476 그랑송 전투 대패(스위스 동맹) ③1476 모라 전투 결정적 패배(스위스 동맹)로 연속 군사 패전을 겪었다. 1477년 1월 5일 낭시(Nancy)에서 로렌 공작 르네 2세와 스위스 동맹 군대를 상대로 마지막 전투를 시도했다. 약 12,000명의 부르고뉴 군대 vs 약 19,000명의 로렌-스위스 연합군. 결과는 결정적 패배 — 샤를은 전투 중 머리에 미늘창(halberd) 일격으로 향년 43세에 전사했다.\n\n' +
    '시신은 약 사흘 후 낭시 인근 늪에서 발견되었으며, 야생 늑대에 부분 훼손되어 알아보기 어려웠다고 한다. 외동딸 마리(20세)가 약 250만 km² 부르고뉴 영지를 단독 상속, 같은 해 8월 합스부르크 막시밀리안 1세와 결혼해 부르고뉴 영지가 합스부르크 가문으로 이전되는 결정적 계기가 되었다. 1482년 마리의 사망 후 본토 디종은 프랑스에 합병되었고 저지대 영지는 합스부르크령 네덜란드(1482~1581)로 분리되었다.\n\n' +
    '담대공 샤를의 별칭 "le Téméraire"(프랑스어), "the Bold"(영어), "der Kühne"(독일어)는 모두 그의 야심차고 무모한 군사 정책을 반영한다. 그의 패전은 한 시대의 끝이자, 르네상스 후기 유럽에서 봉건 영지 군주의 야심찬 영토 통합 시도가 신흥 시민군(스위스 동맹)에 의해 무너지는 첫 사례였다. 또한 부친 필리프 3세가 약 50년에 걸쳐 구축한 부르고뉴 국가가 한 번의 패전으로 합스부르크와 프랑스에 분할되는 비극적 결과를 가져왔다.',
  influence: 75,
  stats: {
    politics: 65,
    military: 60,
    diplomacy: 60,
    intellect: 70,
    charisma: 75,
    administration: 65,
    notes:
      '"담대공" 별칭처럼 야심차고 무모한 군사 정책의 전형. 약 9년 6개월 재위 동안 부르고뉴 국가 영토 확장에 집중했으나 1474~1476 부르고뉴 전쟁의 연속 패전으로 결국 1477 낭시 전투에서 전사했다. 외교는 1473 트리어 회담의 마리-막시밀리안 결혼 약속이 결정적 성과 — 후일 합스부르크 가문 부르고뉴 상속의 토대. 군사는 본인 직접 지휘 의지는 강했으나 신흥 시민군(스위스 동맹) 전술에 적응 실패. 학식은 르네상스 후원자로 동시기 평가 우수. 카리스마는 동시기 가장 화려한 궁정과 황금양털 기사단 운영으로 동시기 유럽 군주 중 최고급. 행정은 부친의 안정적 시스템 계승했으나 군비 과다로 재정 악화.',
  },
} as const

// ── 이사벨라 데 부르봉 본문 ─────────────────────────────────────────────────
const ISABELLA_BOURBON = {
  name: '이사벨라',
  surname: '부르봉',
  originalName: 'Isabella of Bourbon',
  regnalName: undefined as string | undefined,
  birthYear: 1434,
  birthMonth: 10,
  birthDay: 1, // 정확한 날짜 미상
  deathYear: 1465,
  deathMonth: 9,
  deathDay: 25,
  birthPlaceText: '프랑스 부르봉 공국 — 부르봉 가문 영지',
  deathPlaceText: '브라반트 공국 안트베르펀(Antwerp)',
  deathType: DeathType.ILLNESS,
  deathCause: '결핵',
  deathNote: '1465년 9월 25일 안트베르펀에서 향년 30세에 결핵으로 사망했다. 약 2년간 호흡 곤란과 발열이 점진적으로 악화되었으며, 동시기 의사들은 효과적 치료를 시도하지 못했다. 시신은 안트베르펀 대성당(Antwerp Cathedral)에 임시 안치되었다가 후일 부르고뉴 가문 묘소로 이장되었다.',
  biography:
    '부르봉 가문(House of Bourbon) 출신의 부르고뉴 공작비(재위 1454~1465). 부르봉 공작 샤를 1세(Charles I, Duke of Bourbon, 1401~1456)와 아녜스 데 부르고뉴(Agnes of Burgundy, 1407~1476 — 부르고뉴 용맹공 장 1세의 딸이자 선량공 필리프 3세의 누이)의 딸이다. 어머니 아녜스를 통해 부르봉 가문과 발루아-부르고뉴 가문이 사촌 관계로 연결되었다.\n\n' +
    '1434년경 프랑스 부르봉 공국에서 태어났다. 약 22세였던 1456년 부친 샤를 1세 사망 후 어머니 아녜스의 양육 하에 자랐다. 부르봉 가문은 프랑스 카프티앙 가문의 분지로, 14세기부터 프랑스 왕가와 인접한 강력한 공작 가문이었다.\n\n' +
    '1454년 10월 30일 20세에 사촌 샤를(후일 담대공 샤를, 당시 21세, 부르고뉴 공작 후계자)과 릴(Lille)에서 결혼했다. 사촌 결혼이었으나 부르고뉴와 부르봉 양가의 동맹 강화를 위한 정략 결혼이었다. 샤를은 1446년 첫 부인 카트린 데 발루아의 사망 이후 두 번째 부인을 모색하던 중이었다.\n\n' +
    '약 11년의 결혼 생활 동안 외동딸 마리(우리의 마리 데 부르고뉴, 1457-02-13 출생)만 두었다. 출산 후 추가 자녀를 두지 못한 채 약 8년 후 1465년 결핵 진단을 받았고, 약 2년간 투병 끝에 1465년 9월 25일 안트베르펀에서 향년 30세에 사망했다.\n\n' +
    '딸 마리가 8세였을 때의 일로, 마리는 양모 마르가레타 데 요크(샤를의 세 번째 부인, 1468년 결혼)의 양육을 받게 되었다. 이사벨라의 사후 영향은 결정적이다. 그녀의 외동딸 마리가 1477년 합스부르크 막시밀리안 1세와 결혼해 부르고뉴 영지를 합스부르크 가문에 상속시킨 매개자가 되었기 때문이다. 따라서 이사벨라는 후일 합스부르크 가문 카를 5세의 외증조모이며, 16세기 합스부르크 유럽 패권의 혈통적 한 줄기다.',
  influence: 35,
  stats: {
    politics: 35,
    military: 10,
    diplomacy: 50,
    intellect: 60,
    charisma: 60,
    administration: 30,
    notes:
      '약 11년의 결혼 생활 동안 외동딸 마리(부르고뉴 5대 공작·후일 합스부르크령 네덜란드의 시조)만 두었고 30세에 결핵으로 요절했다. 정치 활동은 거의 없었으나 외동딸을 통해 부르고뉴 영지를 합스부르크 가문에 상속시킨 결정적 매개자가 되었다. 학식은 부르봉 가문의 르네상스 학예 교육으로 우수. 카리스마는 동시기 평가에서 우호적이었으나 짧은 결혼 생활로 정치적 영향은 제한적이었다.',
  },
} as const

export async function seedMaryBurgundyParents(prisma: PrismaService): Promise<void> {
  console.log('\n👑 마리 데 부르고뉴 부모(담대공 샤를 + 이사벨라 데 부르봉) 시딩 시작...')

  // ── 사전 의존성 ────────────────────────────────────────────────────────
  const admin = await prisma.account.findUnique({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  ⚠️  admin 계정 미존재')
    return
  }

  const valoisDynasty = await prisma.dynasty.findFirst({
    where: { name: '발루아-부르고뉴 가문' },
    select: { id: true },
  })
  if (!valoisDynasty) {
    console.warn('  ⚠️  발루아-부르고뉴 가문 미존재 — 먼저 person.philip-i-parents.seed 실행 필요')
    return
  }

  const burgundyHC = await prisma.historicalCountry.findFirst({
    where: { name: '부르고뉴 공국' },
    select: { id: true },
  })
  if (!burgundyHC) {
    console.warn('  ⚠️  부르고뉴 공국 HC 미존재')
    return
  }

  const maryBurgundy = await prisma.person.findFirst({
    where: { originalName: 'Mary of Burgundy' },
    select: { id: true, fatherId: true, motherId: true },
  })
  if (!maryBurgundy) {
    console.warn('  ⚠️  마리 데 부르고뉴 미존재 — 먼저 person.philip-i-parents.seed 실행 필요')
    return
  }

  const dukePos = await prisma.governmentPositionDefinition.findFirst({
    where: { title: '공작' },
    select: { id: true },
  })

  // ── Helper: Person 등록 ──────────────────────────────────────────────
  const createOrFindPerson = async (
    spec: typeof CHARLES_BOLD | typeof ISABELLA_BOURBON,
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
  const charlesId = await createOrFindPerson(CHARLES_BOLD, 'MALE', valoisDynasty.id)
  const isabellaId = await createOrFindPerson(ISABELLA_BOURBON, 'FEMALE', null)

  // ── 2) PersonStats x2 ──────────────────────────────────────────────────
  for (const [pid, spec, label] of [
    [charlesId, CHARLES_BOLD, '담대공 샤를'],
    [isabellaId, ISABELLA_BOURBON, '이사벨라 데 부르봉'],
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
    [charlesId, '담대공 샤를'],
    [isabellaId, '이사벨라 데 부르봉'],
  ] as const) {
    const exists = await prisma.personCountryAffiliation.findFirst({
      where: {
        personId: pid,
        historicalCountryId: burgundyHC.id,
        affiliationType: 'CITIZENSHIP' as any,
      },
    })
    if (exists) {
      console.log(`  ⏭️  소속국가 스킵: ${label} → 부르고뉴 공국`)
      continue
    }
    await prisma.personCountryAffiliation.create({
      data: {
        personId: pid,
        historicalCountryId: burgundyHC.id,
        affiliationType: 'CITIZENSHIP' as any,
        priority: 0,
      },
    })
    console.log(`  ✅ 소속국가: ${label} → 부르고뉴 공국 (CITIZENSHIP)`)
  }

  // ── 4) 결혼 관계 (양방향) ─────────────────────────────────────────────
  const mStart = new Date(1454, 9, 30) // 1454-10-30 릴
  const mEnd = new Date(1465, 8, 25) // 1465-09-25 이사벨라 결핵 사망
  const mNote =
    '1454년 10월 30일 부르고뉴 공국 릴(Lille)에서 결혼. 샤를 21세, 이사벨라 20세. 사촌 결혼으로 (샤를의 부친 선량공 필리프 3세와 이사벨라의 어머니 아녜스 데 부르고뉴는 남매), 부르봉 가문과 발루아-부르고뉴 가문의 양가 통합 정략 결혼이었다. 샤를은 1446년 첫 부인 카트린 데 발루아 사망 이후 두 번째 부인을 모색하던 중이었다. 약 11년 결혼 생활 동안 외동딸 마리(1457-02-13 출생, 후일 부르고뉴 5대 공작·합스부르크령 네덜란드 시조)만 두었다. 1465년 9월 25일 이사벨라가 30세에 결핵으로 사망하면서 결혼 종결. 샤를은 약 3년 후 1468년 잉글랜드 마르가레타 데 요크와 세 번째 결혼했다.'

  for (const [aId, bId, label] of [
    [charlesId, isabellaId, '샤를 → 이사벨라'],
    [isabellaId, charlesId, '이사벨라 → 샤를'],
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
    console.log(`  ✅ 결혼: ${label} (1454-10-30 ~ 1465-09-25 사별)`)
  }

  // ── 5) 부자/모자 관계: 샤를 + 이사벨라 → 마리 데 부르고뉴 ────────────────
  if (maryBurgundy.fatherId) {
    console.log(`  ⏭️  부자 스킵 (이미 연결): 마리 fatherId=${maryBurgundy.fatherId}`)
  } else {
    await prisma.person.update({
      where: { id: maryBurgundy.id },
      data: { fatherId: charlesId },
    })
    console.log(`  ✅ 부자: 담대공 샤를 → 마리 데 부르고뉴`)
  }
  if (maryBurgundy.motherId) {
    console.log(`  ⏭️  모자 스킵 (이미 연결): 마리 motherId=${maryBurgundy.motherId}`)
  } else {
    await prisma.person.update({
      where: { id: maryBurgundy.id },
      data: { motherId: isabellaId },
    })
    console.log(`  ✅ 모자: 이사벨라 데 부르봉 → 마리 데 부르고뉴`)
  }

  // ── 6) SovereignReign — 부르고뉴 공국 4대 담대공 샤를 1세 ───────────────
  if (dukePos) {
    const r = {
      regnalNumber: 4,
      regnalName: '샤를 1세 (담대공)',
      startDate: new Date(1467, 5, 15), // 1467-06-15 부친 선량공 필리프 사망 후 즉위
      endDate: new Date(1477, 0, 5), // 1477-01-05 낭시 전투 전사
      appointmentMethod: AppointmentMethod.HEREDITARY,
      endReason: TenureEndReason.WAR_DEFEAT,
      endReasonDetail: '1477-01-05 낭시 전투 전사 (로렌 공작 르네 2세·스위스 동맹 군대에 패배).',
      notes:
        '1467년 6월 15일 부친 선량공 필리프 3세 사망 후 부르고뉴 공작으로 즉위. 약 9년 6개월 재위. 부르고뉴 국가 영토 통합을 위해 ①로렌 공국 정복 ②스위스 동맹 격파 ③알자스·라인 확장을 시도했다. 1473 트리어 회담에서 외동딸 마리와 합스부르크 막시밀리안의 결혼 약속이 결정적 외교 성과. 1474~1476 부르고뉴 전쟁의 연속 패전(1474 헤리쿠르·1476 그랑송·모라) 후 1477-01-05 낭시 전투에서 전사. 시신은 약 사흘 후 낭시 인근 늪에서 늑대에 부분 훼손된 상태로 발견. 외동딸 마리(20세)가 약 250만 km² 부르고뉴 영지를 단독 상속, 1477-08 합스부르크 막시밀리안과 결혼해 영지 이전.',
    }
    const existingByPerson = await prisma.sovereignReign.findFirst({
      where: { personId: charlesId, historicalCountryId: burgundyHC.id },
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
        console.log(`  🔧 재임 정정: 부르고뉴 공국 ${r.regnalName} ${r.regnalNumber}대`)
      } else {
        console.log(`  ⏭️  재임 스킵 (이미 정확): 부르고뉴 공국 ${r.regnalName} ${r.regnalNumber}대`)
      }
    } else {
      const slotConflict = await prisma.sovereignReign.findFirst({
        where: { historicalCountryId: burgundyHC.id, regnalNumber: r.regnalNumber },
      })
      if (slotConflict) {
        console.warn(`  ⚠️  재임 충돌: 부르고뉴 공국 ${r.regnalNumber}대 — 다른 인물 점유 (skip)`)
      } else {
        await prisma.sovereignReign.create({
          data: {
            personId: charlesId,
            historicalCountryId: burgundyHC.id,
            positionDefinitionId: dukePos.id,
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
          `  ✅ 재임: 부르고뉴 공국 ${r.regnalName} ${r.regnalNumber}대 (1467-06-15 ~ 1477-01-05)`,
        )
      }
    }
  } else {
    console.warn('  ⚠️  관직 정의 \'공작\' 미존재 — 재임 스킵')
  }

  console.log(`✅ 마리 데 부르고뉴 부모 시딩 완료\n`)
}
