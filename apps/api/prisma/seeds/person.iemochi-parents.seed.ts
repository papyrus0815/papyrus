/**
 * 도쿠가와 이에모치(Tokugawa Iemochi, 1846~1866, 막부 14대 쇼군)의 부모 시드.
 *
 *   아버지: 도쿠가와 나리유키 (徳川 斉順, Tokugawa Nariyuki, 1801-11-11 ~ 1846-06-08)
 *           도쿠가와 쇼군가 본가에서 기이번(紀州) 도쿠가와가로 입양된 기이번 11대 번주
 *           11대 쇼군 도쿠가와 이에나리의 7남이자 12대 쇼군 도쿠가와 이에요시의 동생
 *           이에모치 출생 약 한 달 전에 사망 — 이에모치는 유복자로 출생
 *
 *   어머니: 마쓰모토 사다 (松本 操, 오미사노카타, 약 1827 ~ 1872-02-12)
 *           나리유키의 측실 — 본명·신분 자료마다 다르나 일반적으로 마쓰모토 사다로 표기
 *           정실 가요(佳代)와 별개로 1845년경 측실 입실, 1846년 외동아들 이에모치 출산
 *
 *   이에모치는 14대 쇼군이 되기 위해 13대 쇼군 도쿠가와 이에사다의 양자로 입양되었지만,
 *   본 시드는 친부모만 등록한다. 13대와의 양자 관계는 별도 모델링 대상.
 *
 *   ⚠️ 기존 데이터 보존 모드.
 *   ⚠️ 의존: 도쿠가와 이에모치(14대) + 도쿠가와 이에나리(11대) + 도쿠가와 가문 모두 기등록
 *
 * 등록 항목:
 *   - Person x2 (나리유키·마쓰모토 사다)
 *   - PersonStats x2
 *   - PersonCountryAffiliation x2 (도쿠가와 막부 CITIZENSHIP)
 *   - PersonSpouse x2 (양방향, 정확한 결혼 시점 미상 — 1845년경 ~ 1846-06-08 사별)
 *   - 부자: 도쿠가와 이에나리 → 도쿠가와 나리유키 (7남)
 *   - 부자/모자: 나리유키 + 마쓰모토 사다 → 도쿠가와 이에모치
 */
import { AppointmentMethod, DeathType, TenureEndReason } from '@prisma/client'

import { PrismaService } from '../prisma.service'

const NARIYUKI = {
  name: '나리유키',
  surname: '도쿠가와',
  originalName: 'Tokugawa Nariyuki',
  regnalName: '기이번 11대 번주',
  birthYear: 1801,
  birthMonth: 11,
  birthDay: 11,
  deathYear: 1846,
  deathMonth: 6,
  deathDay: 8,
  birthPlaceText: '에도 막부 에도(현 도쿄) 니시노마루 — 도쿠가와 쇼군가',
  deathPlaceText: '기이 번(紀州藩) 와카야마 성(현 와카야마 시)',
  deathType: DeathType.ILLNESS,
  deathCause: '결핵 추정 (향년 45세)',
  deathNote:
    '1846년 6월 8일 와카야마 성에서 향년 45세에 사망했다. 사인은 동시기 기록상 폐결핵 또는 만성 ' +
    '소모성 질환으로 추정되며, 약 2년간 점진적으로 악화된 끝에 사망한 것으로 알려져 있다. 사망 ' +
    '당시 측실 마쓰모토 사다가 임신 중이었으며, 사망 약 한 달 후인 1846년 7월 17일 외동아들 ' +
    '이에모치(=후일 14대 쇼군 도쿠가와 이에모치)가 유복자로 출생했다. 정실 가요(佳代) 사이에서는 ' +
    '자녀가 없었기 때문에 기이번 번주 자리는 형뻘 도쿠가와 나리카쓰의 양자였던 도쿠가와 나리카쓰의 ' +
    '아들 이에요시노부에게 일시 이어졌다가 결국 어린 이에모치(요시토미)가 1849년 4세에 기이번 ' +
    '13대 번주로 즉위했다. 시신은 와카야마의 도쿠가와 가문 묘소인 조코지(長保寺)에 안치되었다.',
  biography:
    '에도 막부 후기의 도쿠가와 쇼군가 출신 다이묘. 1801년 11월 11일 에도 니시노마루의 도쿠가와 ' +
    '쇼군가에서 출생했다. 부친은 11대 쇼군 도쿠가와 이에나리(1773~1841)로, 50년 재임 기간 동안 ' +
    '40명 이상의 측실에서 55명의 자녀를 둔 막부 사상 최다 자녀 쇼군이었다. 나리유키는 그중 7남에 ' +
    '해당하며, 친모는 이에나리의 측실 오라쿠노카타(於楽の方, 蓮光院)이다.\n\n' +
    '큰형 도쿠가와 이에요시(1793~1853)가 후일 12대 쇼군이 되었고, 나리유키는 자녀가 너무 많은 ' +
    '도쿠가와 쇼군가의 전통에 따라 다른 다이묘 가문으로 입양될 운명이었다. 1816년 15세에 ' +
    '도쿠가와 고산케(御三家) 중 하나인 기이번 도쿠가와가에 양자로 입양되었다. 기이번은 도쿠가와 ' +
    '이에야스의 10남 도쿠가와 요리노부(1602~1671)가 시조이며, 후계 자녀가 없을 경우 쇼군 본가에 ' +
    '계승자를 제공할 수 있는 도쿠가와 가문의 핵심 분가 중 하나였다.\n\n' +
    '1832년 31세에 기이번 11대 번주로 정식 즉위했다. 양부 도쿠가와 하루토미가 1824년 사망한 후 ' +
    '약 8년간 형뻘 양자 도쿠가와 나리카쓰가 12대 번주로 통치했으나, 1832년 사망하면서 나리유키가 ' +
    '실제로 11대 번주가 되었다. 약 14년의 통치 기간 동안 기이번의 재정 정비와 와카야마 성 보수에 ' +
    '힘썼으며, 동시기 평가에서 평이한 다이묘로 알려졌다. 본인은 학식이 비교적 우수해 한학과 ' +
    '시문에 관심이 있었으나 정치적 영향력은 제한적이었다.\n\n' +
    '정실은 자위인지원(慈応院)으로 알려진 가요(佳代)였으며, 1828년 결혼했으나 자녀를 두지 못했다. ' +
    '말년에 측실 마쓰모토 사다(松本 操, 오미사노카타)를 들였고, 1846년 외동아들 이에모치를 보았다. ' +
    '단, 이에모치의 출생은 나리유키 사망 약 한 달 후의 일이었으며, 나리유키 본인은 친아들의 얼굴을 ' +
    '한 번도 보지 못한 채 세상을 떠났다.\n\n' +
    '1846년 6월 8일 와카야마 성에서 향년 45세에 사망했다. 사인은 동시기 기록상 폐결핵 또는 만성 ' +
    '소모성 질환으로 약 2년간 점진적으로 악화된 끝에 사망한 것으로 알려졌다. 사망 한 달 후 외동아들 ' +
    '이에모치가 유복자로 출생, 1849년 4세에 기이번 13대 번주로 즉위했다.\n\n' +
    '나리유키의 사후 영향은 결정적이다. 외동아들 이에모치가 1858년 13세에 14대 쇼군으로 즉위해 ' +
    '안세이 5국 조약 후 막부 말기의 격동기를 통치하다 1866년 20세에 사망했기 때문에, 나리유키는 ' +
    '쇼군 본인은 아니었으나 막부 말기 쇼군의 친부로서 일본 근대사의 한 장면에 가계도적으로 ' +
    '연결된다. 형 이에요시가 12대 쇼군, 친조카 이에사다가 13대 쇼군, 친아들 이에모치가 14대 ' +
    '쇼군이 되면서 도쿠가와 후기 막부 쇼군 라인 자체가 나리유키의 형제·자녀에서 거의 모두 ' +
    '나왔다는 점에서 가계적 비중이 크다.',
  influence: 40,
  stats: {
    politics: 45,
    military: 35,
    diplomacy: 40,
    intellect: 60,
    charisma: 50,
    administration: 50,
    notes:
      '약 14년의 기이번 11대 번주 재임 기간 동안 평이한 통치자로 평가받았다. 정치·외교적 영향력은 ' +
      '제한적이었으며 동시기 막부 정치의 한 축이 되지 못했다. 학식은 한학·시문에 관심이 있어 ' +
      '동시기 다이묘 중 비교적 우수한 편이었다. 행정은 기이번 재정 정비와 와카야마 성 보수에 ' +
      '집중했으나 결정적 개혁 업적은 없었다. 카리스마는 동시기 평가에서 평이. 친아들 이에모치를 ' +
      '직접 보지 못한 채 결핵으로 사망한 비극적 생애가 후일 막부 말기 14대 쇼군 라인의 가계도적 ' +
      '출발점이 된다.',
  },
} as const

const MATSUMOTO_SADA = {
  name: '사다',
  surname: '마쓰모토',
  originalName: 'Misa Matsumoto (Omisa no Kata)',
  regnalName: '오미사노카타',
  birthYear: 1827,
  birthMonth: 8,
  birthDay: 30,
  deathYear: 1872,
  deathMonth: 2,
  deathDay: 12,
  birthPlaceText: '에도 막부 에도(현 도쿄) — 마쓰모토 가문 영지 (정확한 출생지 미상)',
  deathPlaceText: '메이지 정부 도쿄(東京)',
  deathType: DeathType.ILLNESS,
  deathCause: '노환 또는 자연사 (향년 44세)',
  deathNote:
    '1872년 2월 12일 메이지 시대 초의 도쿄에서 향년 44세에 사망했다. 사인은 동시기 기록상 명시되지 ' +
    '않았으며 자연사로 알려져 있다. 1846년 이에모치 출산 후 약 26년간 측실 신분의 미망인으로 ' +
    '살았으며, 1866년 친아들 이에모치가 20세에 사망한 후에는 약 6년 더 살다가 메이지 시대 초에 ' +
    '사망했다. 1868년 메이지 유신으로 막부가 해체된 이후 측실 신분의 정치적 의미는 사라졌고, ' +
    '본인은 도쿠가와 가문의 사적 보호 아래 평민에 가까운 생활을 했다. 시신은 도쿠가와 가문의 ' +
    '에도 시대 묘소에 안치되었다. 짧은 44년의 생애였으나 친아들 이에모치를 통해 막부 말기 14대 ' +
    '쇼군의 친모로 기록된다.',
  biography:
    '에도 막부 후기 기이번 11대 번주 도쿠가와 나리유키의 측실. 본명은 마쓰모토 사다(松本 操)로 ' +
    '알려져 있으며, 측실 신분 시기에는 오미사노카타(おみさの方)로 불렸다. 1827년 8월 30일 에도의 ' +
    '마쓰모토 가문에서 출생했으며, 정확한 신분과 출신은 자료마다 다르나 일반적으로 무사 또는 ' +
    '하급 신분 가문 출신으로 알려져 있다.\n\n' +
    '약 1845년경 18세 나이로 기이번 11대 번주 도쿠가와 나리유키(당시 44세)의 측실로 입실했다. ' +
    '나리유키의 정실 가요와 별개로 측실 신분이었으며, 약 26세의 큰 나이 차로 사실상 후실 역할을 ' +
    '했다. 정실 가요는 결혼 후 17년이 지나도록 자녀를 두지 못한 상태였고, 도쿠가와 가문의 기이번 ' +
    '후계자 부재가 결정적 정치 문제로 부상하던 시기였다.\n\n' +
    '1846년 7월 17일 외동아들 이에모치(어릴 적 이름 기쿠치요·이노스케·요시토미)를 출산했다. 단, ' +
    '이에모치 출산 약 한 달 전인 1846년 6월 8일 남편 나리유키가 결핵으로 사망하면서 이에모치는 ' +
    '유복자로 태어났다. 마쓰모토 사다 본인은 19세였으며, 측실 신분으로 정실 가요 측의 양육권 ' +
    '간섭을 받아 친아들을 직접 키우지 못했다. 어린 이에모치는 기이번 가신들의 양육 아래 자랐다.\n\n' +
    '1849년 친아들 이에모치가 4세에 기이번 13대 번주로 즉위하면서 마쓰모토 사다는 형식상 번주의 ' +
    '생모 신분이 되었지만, 측실 신분이라 공식 의례에서는 제한된 역할만 수행했다. 약 9년 후인 ' +
    '1858년 이에모치가 13세에 14대 쇼군으로 즉위해 에도 성으로 이주했을 때도 마쓰모토 사다는 ' +
    '에도의 도쿠가와 쇼군가 후궁(오오쿠)에 정식 입실하지 못하고 별궁에서 거주했다.\n\n' +
    '1860년 친아들 이에모치가 16세에 가즈노미야 지카코 친왕(和宮親子内親王, 1846~1877 — 고메이 ' +
    '천황의 누이)과 결혼하면서 마쓰모토 사다는 며느리 가즈노미야와 시어머니로서의 관계를 가졌다. ' +
    '두 사람의 결혼은 막부 말기 공무합체(公武合体) 정책의 결정적 사건이었으나 마쓰모토 사다 본인의 ' +
    '정치적 역할은 제한적이었다.\n\n' +
    '1866년 8월 29일 친아들 이에모치가 향년 20세에 각기(脚気)와 심장병 합병증으로 오사카 성에서 ' +
    '사망했다. 마쓰모토 사다는 39세 나이에 외동아들을 잃었다. 약 6년 더 살다가 1872년 2월 12일 ' +
    '메이지 시대 초의 도쿄에서 향년 44세에 자연사로 사망했다. 1868년 메이지 유신으로 막부가 ' +
    '해체된 후 측실 신분의 정치적 의미는 사라졌고, 도쿠가와 가문의 사적 보호 아래 평민에 가까운 ' +
    '말년을 보냈다. 시신은 도쿠가와 가문의 에도 시대 묘소에 안치되었다.',
  influence: 25,
  stats: {
    politics: 25,
    military: 10,
    diplomacy: 30,
    intellect: 40,
    charisma: 50,
    administration: 25,
    notes:
      '약 26년의 측실 신분 미망인 생활을 보낸 비교적 평범한 여성이었다. 정치적 활동은 거의 없었으며 ' +
      '측실 신분 제약으로 친아들 이에모치를 직접 양육하지도 못했다. 외교·행정 활동도 미미. ' +
      '카리스마는 동시기 평가가 거의 남아 있지 않으며 평이한 측실로 알려졌다. 그러나 막부 말기 ' +
      '14대 쇼군 도쿠가와 이에모치의 친모로서 가계도적 의미는 결정적이다. 39세에 외동아들을 잃고 ' +
      '약 6년 후 메이지 시대 초에 사망한 비극적 생애.',
  },
} as const

export async function seedIemochiParents(prisma: PrismaService): Promise<void> {
  console.log('\n👑 도쿠가와 이에모치 부모(나리유키 + 마쓰모토 사다) 시딩 시작...')

  const admin = await prisma.account.findUnique({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  admin 미존재')
    return
  }
  const tokugawa = await prisma.dynasty.findFirst({ where: { name: '도쿠가와 가문' } })
  if (!tokugawa) {
    console.warn('  도쿠가와 가문 미존재')
    return
  }
  const tokugawaHC = await prisma.historicalCountry.findFirst({ where: { name: '도쿠가와 막부' } })
  if (!tokugawaHC) {
    console.warn('  도쿠가와 막부 HC 미존재')
    return
  }
  const iemochi = await prisma.person.findFirst({
    where: { originalName: 'Tokugawa Iemochi' },
    select: { id: true, fatherId: true, motherId: true },
  })
  if (!iemochi) {
    console.warn('  도쿠가와 이에모치 미존재')
    return
  }
  const ienari = await prisma.person.findFirst({
    where: { originalName: 'Tokugawa Ienari' },
    select: { id: true },
  })

  const createPerson = async (
    spec: typeof NARIYUKI | typeof MATSUMOTO_SADA,
    gender: 'MALE' | 'FEMALE',
    dynastyId: string | null,
  ): Promise<string> => {
    const existing = await prisma.person.findFirst({ where: { originalName: spec.originalName } })
    if (existing) {
      console.log(`  인물 스킵: ${spec.originalName}`)
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
        nameDisplayOrder: 'korean' as any,
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
    console.log(`  ✅ 인물 생성: ${spec.originalName}`)
    return created.id
  }

  const nariyukiId = await createPerson(NARIYUKI, 'MALE', tokugawa.id)
  const sadaId = await createPerson(MATSUMOTO_SADA, 'FEMALE', null)

  // 능력치
  for (const [pid, spec, label] of [
    [nariyukiId, NARIYUKI, '나리유키'],
    [sadaId, MATSUMOTO_SADA, '마쓰모토 사다'],
  ] as const) {
    const exists = await prisma.personStats.findFirst({
      where: { personId: pid, accountId: admin.id },
    })
    if (exists) {
      console.log(`  ${label} 능력치 스킵`)
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
    console.log(`  ✅ ${label} 능력치 등록`)
  }

  // 소속국가
  for (const [pid, label] of [
    [nariyukiId, '나리유키'],
    [sadaId, '마쓰모토 사다'],
  ] as const) {
    const exists = await prisma.personCountryAffiliation.findFirst({
      where: {
        personId: pid,
        historicalCountryId: tokugawaHC.id,
        affiliationType: 'CITIZENSHIP' as any,
      },
    })
    if (exists) continue
    await prisma.personCountryAffiliation.create({
      data: {
        personId: pid,
        historicalCountryId: tokugawaHC.id,
        affiliationType: 'CITIZENSHIP' as any,
        priority: 0,
      },
    })
    console.log(`  ✅ 소속국가: ${label} → 도쿠가와 막부`)
  }

  // 결혼 (측실 관계 — PersonSpouse로 모델링, note에 측실 명시)
  const mStart = new Date(1845, 0, 1) // 정확한 시점 미상, 1845년경
  const mEnd = new Date(1846, 5, 8) // 나리유키 사망
  const mNote =
    '약 1845년경 마쓰모토 사다(당시 18세)가 기이번 11대 번주 도쿠가와 나리유키(당시 44세)의 측실로 ' +
    '입실. 약 26세의 큰 나이 차. 나리유키의 정실 가요와 별개의 측실 신분이었으며, 정실이 자녀를 ' +
    '두지 못한 상태에서 후계자 출산 임무를 맡았다. 1846년 6월 8일 나리유키가 결핵으로 향년 45세에 ' +
    '사망. 같은 해 7월 17일 마쓰모토 사다가 유복자 이에모치를 출산. 결혼 약 1년 6개월의 짧은 관계로, ' +
    '나리유키 본인은 친아들의 얼굴을 보지 못했고 마쓰모토 사다 본인도 측실 신분 제약으로 친아들을 ' +
    '직접 양육하지 못했다.'
  for (const [aId, bId, label] of [
    [nariyukiId, sadaId, '나리유키 → 사다'],
    [sadaId, nariyukiId, '사다 → 나리유키'],
  ] as const) {
    const exists = await prisma.personSpouse.findFirst({
      where: { personId: aId, spouseId: bId },
    })
    if (exists) {
      console.log(`  결혼 스킵: ${label}`)
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
    console.log(`  ✅ 결혼(측실): ${label}`)
  }

  // 나리유키 기이번 11대 번주 재임 (1832-09-14 ~ 1846-06-08, 약 14년)
  // 기이번 HC와 '번주' 직위 정의는 shogunate 시드에서 생성. 미존재면 경고 후 스킵.
  const kiiHan = await prisma.historicalCountry.findFirst({
    where: { name: '기이번' },
    select: { id: true },
  })
  const daimyoPos = await prisma.governmentPositionDefinition.findFirst({
    where: { title: '번주' },
    select: { id: true },
  })
  if (!kiiHan) {
    console.warn(
      '  ⚠️  "기이번" HC 미존재 — 나리유키 번주 재임 스킵 ' +
        '(seedTokugawaShogunate 먼저 실행 필요)',
    )
  } else if (!daimyoPos) {
    console.warn(
      '  ⚠️  관직 정의 "번주" 미존재 — 나리유키 번주 재임 스킵 ' +
        '(seedTokugawaShogunate 먼저 실행 필요)',
    )
  } else {
    const startDate = new Date(1832, 8, 14)
    const endDate = new Date(1846, 5, 8)
    const regnalNumber = 11
    const regnalName = '도쿠가와 나리유키'
    const endReasonDetail =
      '1846-06-08 와카야마성에서 향년 45세에 결핵으로 재임 중 사망 — 외동아들 이에모치 출생 ' +
      '약 한 달 전.'
    const reignNotes =
      '기이번 11대 번주(약 14년). 1816년 15세에 11대 쇼군 이에나리의 7남으로 기이번 도쿠가와가 ' +
      '양자 입양 → 1832-09-14 형뻘 양자 도쿠가와 나리카쓰 사망 후 31세에 정식 승계. 약 14년간 ' +
      '기이번 재정 정비·와카야마성 보수에 힘썼으나 동시기 평이한 다이묘로 평가. 1846-06-08 재임 ' +
      '중 결핵으로 사망, 약 한 달 후 외동아들 이에모치(=후일 14대 쇼군) 유복자 출생.'

    const existing = await prisma.sovereignReign.findFirst({
      where: { personId: nariyukiId, historicalCountryId: kiiHan.id },
    })
    if (existing) {
      const needs =
        existing.regnalNumber !== regnalNumber ||
        existing.regnalName !== regnalName ||
        existing.startDate.getTime() !== startDate.getTime() ||
        (existing.endDate?.getTime() ?? null) !== endDate.getTime() ||
        existing.positionDefinitionId !== daimyoPos.id
      if (needs) {
        await prisma.sovereignReign.update({
          where: { id: existing.id },
          data: {
            regnalNumber,
            regnalName,
            startDate,
            endDate,
            appointmentMethod: AppointmentMethod.HEREDITARY,
            endReason: TenureEndReason.DEATH_IN_OFFICE,
            endReasonDetail,
            notes: reignNotes,
            positionDefinitionId: daimyoPos.id,
          },
        })
        console.log(`  🔧 재임 정정: 기이번 ${regnalNumber}대 ${regnalName}`)
      } else {
        console.log(`  ⏭️  재임 스킵 (정확): 기이번 ${regnalNumber}대 ${regnalName}`)
      }
    } else {
      const slotConflict = await prisma.sovereignReign.findFirst({
        where: { historicalCountryId: kiiHan.id, regnalNumber },
      })
      if (slotConflict) {
        console.warn(
          `  ⚠️  재임 충돌: 기이번 ${regnalNumber}대 — 다른 인물 점유 (skip ${regnalName})`,
        )
      } else {
        await prisma.sovereignReign.create({
          data: {
            personId: nariyukiId,
            historicalCountryId: kiiHan.id,
            positionDefinitionId: daimyoPos.id,
            regnalNumber,
            regnalName,
            startDate,
            endDate,
            appointmentMethod: AppointmentMethod.HEREDITARY,
            endReason: TenureEndReason.DEATH_IN_OFFICE,
            endReasonDetail,
            notes: reignNotes,
            accountId: admin.id,
          },
        })
        console.log(`  ✅ 재임: 기이번 ${regnalNumber}대 ${regnalName} (1832~1846)`)
      }
    }
  }

  // 부자: 이에나리 → 나리유키 (이에나리 7남)
  if (ienari) {
    const naripatch = await prisma.person.findUnique({
      where: { id: nariyukiId },
      select: { fatherId: true },
    })
    if (!naripatch?.fatherId) {
      await prisma.person.update({
        where: { id: nariyukiId },
        data: { fatherId: ienari.id },
      })
      console.log(`  ✅ 부자: 도쿠가와 이에나리(11대) → 나리유키 (7남)`)
    } else {
      console.log(`  나리유키의 fatherId 이미 연결됨`)
    }
  }

  // 부자/모자: 나리유키 + 사다 → 이에모치
  if (iemochi.fatherId) {
    console.log(`  부자 스킵 (이미 연결): 이에모치 fatherId=${iemochi.fatherId}`)
  } else {
    await prisma.person.update({
      where: { id: iemochi.id },
      data: { fatherId: nariyukiId },
    })
    console.log(`  ✅ 부자: 나리유키 → 이에모치`)
  }
  if (iemochi.motherId) {
    console.log(`  모자 스킵 (이미 연결): 이에모치 motherId=${iemochi.motherId}`)
  } else {
    await prisma.person.update({
      where: { id: iemochi.id },
      data: { motherId: sadaId },
    })
    console.log(`  ✅ 모자: 마쓰모토 사다 → 이에모치`)
  }

  console.log(`✅ 도쿠가와 이에모치 부모 시딩 완료\n`)
}
