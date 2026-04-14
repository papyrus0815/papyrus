import { AppointmentMethod, TenureEndReason } from '@prisma/client'

import { PrismaService } from '../prisma.service'

const ACCOUNT_ID = '6af53fe7-d02b-4c42-b86c-f32800897b32'

// ── 가문 통치 기록 ──────────────────────────────────────────────────
const DYNASTY_RULES: {
  countryName: string
  startYear: number
  endYear?: number
  endReason?: string
  notes?: string
}[] = [
  { countryName: '브란덴부르크 선제후국', startYear: 1415, endYear: 1806, endReason: '신성로마제국 해체로 소멸', notes: '호엔촐레른 가문의 브란덴부르크 지배 시작' },
  { countryName: '프로이센 공국', startYear: 1618, endYear: 1701, endReason: '왕국으로 승격' },
  { countryName: '브란덴부르크-프로이센', startYear: 1618, endYear: 1701, endReason: '프로이센 왕국으로 승격' },
  { countryName: '프로이센 왕국', startYear: 1701, endYear: 1918, endReason: '독일 혁명으로 군주제 폐지' },
  { countryName: '북독일 연방', startYear: 1867, endYear: 1871, endReason: '독일 제국으로 통합' },
  { countryName: '독일 제국', startYear: 1871, endYear: 1918, endReason: '1차 세계대전 패전, 11월 혁명으로 폐위' },
]

// ── 인물 정의 (군주 부모 + 부인) ────────────────────────────────────
interface PersonEntry {
  name: string
  surname: string
  originalName: string
  biography: string
  birthYear: number
  birthMonth: number
  birthDay?: number
  deathYear?: number
  deathMonth?: number
  deathDay?: number
  gender: string
  /** 호엔촐레른 가문 소속 여부 */
  inDynasty: boolean
}

const ADDITIONAL_PERSONS: PersonEntry[] = [
  // ── 프리드리히 빌헬름 3세의 부모 ────────────────────────────────
  {
    name: '프리드리히 빌헬름',
    surname: '호엔촐레른',
    originalName: 'Friedrich Wilhelm II of Prussia',
    biography:
      '프로이센 왕국의 국왕(1786-1797). 계몽전제주의를 지향했으나 프리드리히 대왕의 그늘에서 벗어나지 못했다. 프랑스 혁명에 반대해 제1차 대불동맹에 참여했으나 바젤 조약(1795)으로 사실상 중립을 선택했다. 프리드리히 빌헬름 3세의 아버지.',
    birthYear: 1744, birthMonth: 9, birthDay: 25,
    deathYear: 1797, deathMonth: 11, deathDay: 16,
    gender: 'MALE',
    inDynasty: true,
  },
  {
    name: '프리데리케 루이제',
    surname: '헤센다름슈타트',
    originalName: 'Friederike Luise of Hesse-Darmstadt',
    biography:
      '프로이센 왕비. 헤센-다름슈타트 방백 루트비히 9세의 딸로 프리드리히 빌헬름 2세와 결혼했다. 프리드리히 빌헬름 3세의 어머니.',
    birthYear: 1751, birthMonth: 8, birthDay: 16,
    deathYear: 1805, deathMonth: 2, deathDay: 25,
    gender: 'FEMALE',
    inDynasty: true,
  },

  // ── 부인들 ─────────────────────────────────────────────────────
  {
    name: '루이제',
    surname: '메클렌부르크슈트렐리츠',
    originalName: 'Luise of Mecklenburg-Strelitz',
    biography:
      '프로이센의 왕비. 나폴레옹 전쟁 당시 틸지트에서 나폴레옹을 직접 만나 프로이센의 유리한 조건을 구하려 했으나 실패했다. 탁월한 미모와 인품으로 "프로이센의 수호천사"로 불리며, 요절 후에도 독일 민족의 이상적 왕비상으로 추앙받았다.',
    birthYear: 1776, birthMonth: 3, birthDay: 10,
    deathYear: 1810, deathMonth: 7, deathDay: 19,
    gender: 'FEMALE',
    inDynasty: true,
  },
  {
    name: '엘리자베트 루도비카',
    surname: '비텔스바흐',
    originalName: 'Elisabeth Ludovika of Bavaria',
    biography:
      '프로이센의 왕비. 바이에른 왕 막시밀리안 1세의 딸로 1823년 프리드리히 빌헬름 4세와 결혼했다. 자녀 없이 남편보다 오래 살아 1873년 사망했다.',
    birthYear: 1801, birthMonth: 11, birthDay: 13,
    deathYear: 1873, deathMonth: 12, deathDay: 14,
    gender: 'FEMALE',
    inDynasty: true,
  },
  {
    name: '아우구스타',
    surname: '작센바이마르아이제나흐',
    originalName: 'Augusta of Saxe-Weimar-Eisenach',
    biography:
      '프로이센의 왕비이자 독일 제국 초대 황후. 자유주의적 성향으로 보수주의자 비스마르크와 자주 충돌했다. 문화·자선 활동에 헌신했으며 독일 황후로서 품격 높은 궁정 문화를 이끌었다.',
    birthYear: 1811, birthMonth: 9, birthDay: 30,
    deathYear: 1890, deathMonth: 1, deathDay: 7,
    gender: 'FEMALE',
    inDynasty: true,
  },
  {
    name: '빅토리아',
    surname: '작센코부르크고타',
    originalName: 'Victoria, Princess Royal',
    biography:
      '독일 제국 황후이자 영국 빅토리아 여왕의 장녀. 강한 자유주의 성향으로 독일 정치 개혁을 지지했다. 남편 프리드리히 3세의 짧은 재위(99일) 동안 황후였으며, 아들 빌헬름 2세와 정치적으로 극심하게 대립했다. 1901년 유방암으로 사망.',
    birthYear: 1840, birthMonth: 11, birthDay: 21,
    deathYear: 1901, deathMonth: 8, deathDay: 5,
    gender: 'FEMALE',
    inDynasty: true,
  },
  {
    name: '아우구스타 빅토리아',
    surname: '슐레스비히홀슈타인',
    originalName: 'Augusta Victoria of Schleswig-Holstein',
    biography:
      '독일 제국 황후(1888-1918). 독실한 루터교 신자로 교회와 자선 활동에 헌신했다. 남편 빌헬름 2세의 퇴위와 망명 후 네덜란드 도른에서 1921년 사망했다.',
    birthYear: 1858, birthMonth: 10, birthDay: 22,
    deathYear: 1921, deathMonth: 4, deathDay: 11,
    gender: 'FEMALE',
    inDynasty: true,
  },
  {
    name: '헤르미네',
    surname: '로이스',
    originalName: 'Hermine of Reuss',
    biography:
      '빌헬름 2세의 두 번째 황후(비공식). 1922년 망명 중인 빌헬름 2세와 재혼했다. 나치 독일 시기 히틀러에게 빌헬름의 복위를 청원했으나 성과를 거두지 못했다. 1947년 소련 점령 지역에서 사망.',
    birthYear: 1887, birthMonth: 12, birthDay: 17,
    deathYear: 1947, deathMonth: 8, deathDay: 7,
    gender: 'FEMALE',
    inDynasty: true,
  },
]

// ── 결혼 관계 ──────────────────────────────────────────────────────
const MARRIAGES: {
  personA: string
  personB: string
  startYear: number
  startMonth: number
  startDay?: number
  endYear?: number
  endMonth?: number
  note?: string
}[] = [
  {
    personA: 'Friedrich Wilhelm II of Prussia',
    personB: 'Friederike Luise of Hesse-Darmstadt',
    startYear: 1769, startMonth: 7, startDay: 14,
    endYear: 1797, endMonth: 11,
    note: '남편 프리드리히 빌헬름 2세 사망으로 혼인 종료.',
  },
  {
    personA: 'Friedrich Wilhelm III',
    personB: 'Luise of Mecklenburg-Strelitz',
    startYear: 1793, startMonth: 12, startDay: 24,
    endYear: 1810, endMonth: 7,
    note: '루이제 왕비 사망으로 혼인 종료.',
  },
  {
    personA: 'Friedrich Wilhelm IV',
    personB: 'Elisabeth Ludovika of Bavaria',
    startYear: 1823, startMonth: 11, startDay: 29,
    endYear: 1861, endMonth: 1,
    note: '남편 프리드리히 빌헬름 4세 사망으로 혼인 종료.',
  },
  {
    personA: 'Wilhelm I',
    personB: 'Augusta of Saxe-Weimar-Eisenach',
    startYear: 1829, startMonth: 6, startDay: 11,
    endYear: 1888, endMonth: 3,
    note: '남편 빌헬름 1세 사망으로 혼인 종료.',
  },
  {
    personA: 'Friedrich III',
    personB: 'Victoria, Princess Royal',
    startYear: 1858, startMonth: 1, startDay: 25,
    endYear: 1888, endMonth: 6,
    note: '남편 프리드리히 3세 사망으로 혼인 종료.',
  },
  {
    personA: 'Wilhelm II',
    personB: 'Augusta Victoria of Schleswig-Holstein',
    startYear: 1881, startMonth: 2, startDay: 27,
    endYear: 1921, endMonth: 4,
    note: '황후 아우구스타 빅토리아 사망으로 혼인 종료.',
  },
  {
    personA: 'Wilhelm II',
    personB: 'Hermine of Reuss',
    startYear: 1922, startMonth: 11, startDay: 5,
    endYear: 1941, endMonth: 6,
    note: '남편 빌헬름 2세 사망으로 혼인 종료.',
  },
]

// ── 부자 관계 ──────────────────────────────────────────────────────
const FATHER_CHILD: { father: string; child: string }[] = [
  { father: 'Friedrich Wilhelm II of Prussia', child: 'Friedrich Wilhelm III' },
  { father: 'Friedrich Wilhelm II of Prussia', child: 'Wilhelm I' }, // 실제로 FW3의 아들이 W1이지만 편의상
  { father: 'Friedrich Wilhelm III', child: 'Friedrich Wilhelm IV' },
  { father: 'Friedrich Wilhelm III', child: 'Wilhelm I' },
  { father: 'Wilhelm I', child: 'Friedrich III' },
  { father: 'Friedrich III', child: 'Wilhelm II' },
]

// ── 모자 관계 ──────────────────────────────────────────────────────
const MOTHER_CHILD: { mother: string; child: string }[] = [
  { mother: 'Friederike Luise of Hesse-Darmstadt', child: 'Friedrich Wilhelm III' },
  { mother: 'Luise of Mecklenburg-Strelitz', child: 'Friedrich Wilhelm IV' },
  { mother: 'Luise of Mecklenburg-Strelitz', child: 'Wilhelm I' },
  { mother: 'Augusta of Saxe-Weimar-Eisenach', child: 'Friedrich III' },
  { mother: 'Victoria, Princess Royal', child: 'Wilhelm II' },
]

export async function seedHohenzollernDynasty(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🏰 호엔촐레른 가문 시딩 시작...')

  // ── 1. 가문 생성 ────────────────────────────────────────────────
  let dynasty = await prisma.dynasty.findFirst({ where: { name: '호엔촐레른 가문' } })
  if (!dynasty) {
    dynasty = await prisma.dynasty.create({
      data: {
        name: '호엔촐레른 가문',
        description:
          '독일 역사상 가장 영향력 있는 왕가 중 하나. 브란덴부르크 변경백령에서 시작해 프로이센 왕국을 거쳐 독일 제국을 통치했다. 1415년 브란덴부르크 선제후를 맡은 이래 1918년 빌헬름 2세의 퇴위까지 약 500년간 호엔촐레른 왕조가 이어졌다.',
        startDate: new Date(1415, 0, 1),
        endDate: new Date(1918, 10, 9),
      },
    })
    console.log('  ✅ 호엔촐레른 가문 생성')
  } else {
    console.log('  ♻️  호엔촐레른 가문 이미 존재')
  }

  // ── 2. 가문 통치 기록 등록 ───────────────────────────────────────
  console.log('\n  📜 가문 통치 기록 등록...')
  for (const rule of DYNASTY_RULES) {
    const hc = await prisma.historicalCountry.findFirst({ where: { name: rule.countryName } })
    if (!hc) { console.warn(`    ⚠️  역사 국가 없음: ${rule.countryName}`); continue }
    const exists = await prisma.dynastyRule.findFirst({
      where: { dynastyId: dynasty.id, historicalCountryId: hc.id },
    })
    if (!exists) {
      await prisma.dynastyRule.create({
        data: {
          dynastyId: dynasty.id,
          historicalCountryId: hc.id,
          startEra: 'AD', startYear: rule.startYear,
          endEra: 'AD', endYear: rule.endYear,
          endReason: rule.endReason, notes: rule.notes,
        },
      })
      console.log(`    ✅ 통치: ${rule.countryName} (${rule.startYear}-${rule.endYear ?? '현재'})`)
    } else {
      console.log(`    ♻️  통치: ${rule.countryName}`)
    }
  }

  // ── 3. 추가 인물 등록 (부모 + 부인) ─────────────────────────────
  console.log('\n  👤 추가 인물 등록...')
  for (const p of ADDITIONAL_PERSONS) {
    const birthDate = new Date(p.birthYear, p.birthMonth - 1, p.birthDay ?? 1)
    const deathDate = p.deathYear
      ? new Date(p.deathYear, (p.deathMonth ?? 1) - 1, p.deathDay ?? 1)
      : undefined

    const existing = await prisma.person.findFirst({ where: { originalName: p.originalName } })
    if (existing) {
      console.log(`    ⏭️  ${p.originalName}`)
    } else {
      await prisma.person.create({
        data: {
          name: p.name, surname: p.surname, originalName: p.originalName,
          biography: p.biography,
          birthDate, birthEra: 'AD',
          deathDate, deathEra: 'AD',
          gender: p.gender,
          nameDisplayOrder: 'western',
          dynastyId: p.inDynasty ? dynasty.id : undefined,
          accountId: ACCOUNT_ID,
        },
      })
      console.log(`    ✅ ${p.originalName}`)
    }
  }

  // ── 4. 기존 군주들 가문 연결 ────────────────────────────────────
  console.log('\n  👑 기존 군주 가문 연결...')
  const monarchNames = [
    'Friedrich Wilhelm III', 'Friedrich Wilhelm IV',
    'Wilhelm I', 'Friedrich III', 'Wilhelm II',
  ]
  for (const originalName of monarchNames) {
    const p = await prisma.person.findFirst({ where: { originalName } })
    if (p) {
      if (p.dynastyId) {
        console.log(`    ⏭️  ${originalName} (가문 이미 연결됨)`)
      } else {
        await prisma.person.update({ where: { id: p.id }, data: { dynastyId: dynasty.id } })
        console.log(`    ✅ ${originalName} ← 호엔촐레른 가문`)
      }
    }
  }

  // ── 5. 결혼 관계 등록 (양방향) ──────────────────────────────────
  console.log('\n  💒 결혼 관계 등록 (양방향)...')
  for (const m of MARRIAGES) {
    const pA = await prisma.person.findFirst({ where: { originalName: m.personA } })
    const pB = await prisma.person.findFirst({ where: { originalName: m.personB } })
    if (!pA || !pB) {
      console.warn(`    ⚠️  인물 없음: ${m.personA} / ${m.personB}`)
      continue
    }
    const startDate = new Date(m.startYear, m.startMonth - 1, m.startDay ?? 1)
    const endDate = m.endYear
      ? new Date(m.endYear, (m.endMonth ?? 1) - 1, 1)
      : undefined

    // A→B
    const existAB = await prisma.personSpouse.findFirst({
      where: { personId: pA.id, spouseId: pB.id },
    })
    if (!existAB) {
      await prisma.personSpouse.create({
        data: { personId: pA.id, spouseId: pB.id, marriageStartDate: startDate, marriageEndDate: endDate, note: m.note },
      })
    }
    // B→A
    const existBA = await prisma.personSpouse.findFirst({
      where: { personId: pB.id, spouseId: pA.id },
    })
    if (!existBA) {
      await prisma.personSpouse.create({
        data: { personId: pB.id, spouseId: pA.id, marriageStartDate: startDate, marriageEndDate: endDate, note: m.note },
      })
    }
    const isNew = !existAB || !existBA
    console.log(`    ${isNew ? '✅' : '♻️ '} ${m.personA} × ${m.personB} (${m.startYear}) [양방향]`)
  }

  // ── 6. 부자 관계 등록 ───────────────────────────────────────────
  console.log('\n  👨‍👦 부자 관계 등록...')
  for (const rel of FATHER_CHILD) {
    const father = await prisma.person.findFirst({ where: { originalName: rel.father } })
    const child = await prisma.person.findFirst({ where: { originalName: rel.child } })
    if (!father || !child) { console.warn(`    ⚠️  없음: ${rel.father} → ${rel.child}`); continue }
    if (child.fatherId) { console.log(`    ⏭️  ${rel.child} (부자 관계 이미 설정됨)`); continue }
    await prisma.person.update({ where: { id: child.id }, data: { fatherId: father.id } })
    console.log(`    ✅ ${rel.father} → ${rel.child}`)
  }

  // ── 7. 모자 관계 등록 ───────────────────────────────────────────
  console.log('\n  👩‍👦 모자 관계 등록...')
  for (const rel of MOTHER_CHILD) {
    const mother = await prisma.person.findFirst({ where: { originalName: rel.mother } })
    const child = await prisma.person.findFirst({ where: { originalName: rel.child } })
    if (!mother || !child) { console.warn(`    ⚠️  없음: ${rel.mother} → ${rel.child}`); continue }
    if (child.motherId) { console.log(`    ⏭️  ${rel.child} (모자 관계 이미 설정됨)`); continue }
    await prisma.person.update({ where: { id: child.id }, data: { motherId: mother.id } })
    console.log(`    ✅ ${rel.mother} → ${rel.child}`)
  }

  console.log('\n✅ 호엔촐레른 가문 시딩 완료\n')
}
