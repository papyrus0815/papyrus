import { AppointmentMethod, TenureEndReason } from '@prisma/client'

import { PrismaService } from '../prisma.service'

const ACCOUNT_ID = '6af53fe7-d02b-4c42-b86c-f32800897b32'

async function getHistoricalCountryId(prisma: PrismaService, name: string): Promise<string | null> {
  const c = await prisma.historicalCountry.findFirst({ where: { name } })
  return c?.id ?? null
}

async function getDynastyId(prisma: PrismaService, name: string): Promise<string | null> {
  const d = await prisma.dynasty.findFirst({ where: { name } })
  return d?.id ?? null
}

async function getPositionDefId(prisma: PrismaService, title: string): Promise<string | null> {
  const d = await prisma.governmentPositionDefinition.findFirst({ where: { title } })
  return d?.id ?? null
}

// ── 가문 ──────────────────────────────────────────────────────────────────────
const DYNASTIES = [
  {
    name: '하노버 왕가',
    description: '하노버 선제후국에서 기원한 영국 왕가. 1714년 조지 1세가 영국 왕위에 오르며 시작되었다. 빅토리아 여왕까지 이어졌으나, 빅토리아의 결혼으로 왕가 이름은 작센코부르크고타로 넘어갔다.',
    startYear: 1714, endYear: 1901,
  },
  {
    name: '작센코부르크고타 왕가',
    description: '독일 작센코부르크고타 공국에서 기원한 왕가. 앨버트 공의 혈통을 이어받아 에드워드 7세 즉위(1901)부터 영국 왕가의 공식 명칭이 되었다. 1917년 1차 세계대전 중 반독 감정으로 윈저 왕가로 개명하였다.',
    startYear: 1901, endYear: 1917,
  },
  {
    name: '작센코부르크잘펠트 왕가',
    description: '독일 작센코부르크잘펠트 공국의 왕가. 빅토리아 여왕의 어머니 빅토리아 공녀의 친정 왕가로, 훗날 작센코부르크고타 왕가의 모태가 된다.',
    startYear: 1699, endYear: 1826,
  },
]

const DYNASTY_RULES: { dynastyName: string; countryName: string; startYear: number; endYear?: number }[] = [
  { dynastyName: '하노버 왕가', countryName: '그레이트브리튼 및 아일랜드 연합왕국', startYear: 1801, endYear: 1901 },
  { dynastyName: '작센코부르크고타 왕가', countryName: '그레이트브리튼 및 아일랜드 연합왕국', startYear: 1901, endYear: 1917 },
]

// ── 인물 인터페이스 ───────────────────────────────────────────────────────────
interface PersonEntry {
  name: string
  surname: string
  originalName: string
  regnalName?: string
  biography: string
  birthYear: number
  birthMonth: number
  birthDay: number
  deathYear?: number
  deathMonth?: number
  deathDay?: number
  gender: string
  dynastyName?: string
  countryName?: string
  reigns?: {
    countryName: string
    positionTitle: string
    regnalNumber?: number
    startYear: number
    startMonth: number
    startDay?: number
    endYear?: number
    endMonth?: number
    endDay?: number
    appointmentMethod: AppointmentMethod
    endReason?: TenureEndReason
    endReasonDetail?: string
    notes?: string
  }[]
}

// ── 전체 인물 ─────────────────────────────────────────────────────────────────
const PERSONS: PersonEntry[] = [
  // ── Victoria의 부모 ─────────────────────────────────────────────────────────
  {
    name: '에드워드',
    surname: '하노버',
    originalName: 'Edward, Duke of Kent',
    biography:
      '영국 조지 3세의 넷째 아들이자 켄트 공작. 군인으로 복무하며 지브롤터, 캐나다 등지에서 활약했다. 1818년 작센코부르크잘펠트의 빅토리아와 결혼하여 이듬해 빅토리아 공주를 낳았으나, 딸이 태어난 지 8개월 만에 폐렴으로 사망했다.',
    birthYear: 1767, birthMonth: 11, birthDay: 2,
    deathYear: 1820, deathMonth: 1, deathDay: 23,
    gender: 'MALE',
    dynastyName: '하노버 왕가',
    countryName: '그레이트브리튼 및 아일랜드 연합왕국',
  },
  {
    name: '빅토리아',
    surname: '작센코부르크잘펠트',
    originalName: 'Victoria of Saxe-Coburg-Saalfeld',
    biography:
      '빅토리아 여왕의 어머니. 독일 작센코부르크잘펠트 공국의 공녀로 태어났으며, 1818년 켄트 공작 에드워드와 결혼했다. 남편 사망 후 어린 빅토리아를 홀로 키웠으며, 왕실 감독관 존 콘로이와 함께 딸을 고립시키는 "켄징턴 시스템"을 운용했으나 여왕 즉위 후 모녀 관계는 한동안 소원해졌다.',
    birthYear: 1786, birthMonth: 8, birthDay: 17,
    deathYear: 1861, deathMonth: 3, deathDay: 16,
    gender: 'FEMALE',
    dynastyName: '작센코부르크잘펠트 왕가',
    countryName: '그레이트브리튼 및 아일랜드 연합왕국',
  },

  // ── Albert의 부모 ────────────────────────────────────────────────────────────
  {
    name: '에른스트',
    surname: '작센코부르크고타',
    originalName: 'Ernest I, Duke of Saxe-Coburg and Gotha',
    regnalName: 'Ernest',
    biography:
      '작센코부르크고타 공국의 초대 공작(1826-1844). 나폴레옹 전쟁에 참전했으며, 1826년 작센코부르크잘펠트를 작센코부르크고타로 재편하였다. 앨버트 공의 아버지이며, 첫 번째 부인 루이제와 이혼 후 마리 폰 뷔르템베르크와 재혼했다.',
    birthYear: 1784, birthMonth: 1, birthDay: 2,
    deathYear: 1844, deathMonth: 1, deathDay: 29,
    gender: 'MALE',
    dynastyName: '작센코부르크고타 왕가',
    countryName: '작센코부르크고타 공국',
    reigns: [
      {
        countryName: '작센코부르크고타 공국',
        positionTitle: '공작',
        regnalNumber: 1,
        startYear: 1826, startMonth: 11, startDay: 12,
        endYear: 1844, endMonth: 1, endDay: 29,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.DEATH_IN_OFFICE,
        notes: '작센코부르크잘펠트 공국을 재편하여 작센코부르크고타 공국 설립. 초대 공작. 앨버트 공의 아버지.',
      },
    ],
  },
  {
    name: '루이제',
    surname: '작센고타알텐부르크',
    originalName: 'Louise of Saxe-Gotha-Altenburg',
    biography:
      '앨버트 공의 어머니. 작센고타알텐부르크 공국의 공녀로 태어나 1817년 에른스트 1세와 결혼했다. 1824년 이혼 당하며 두 아들(에른스트, 앨버트)과 강제로 헤어졌다. 앨버트 공은 어머니를 거의 기억하지 못한 채 성장했다. 1831년 30세에 암으로 사망하여 앨버트와 화해할 기회를 갖지 못했다.',
    birthYear: 1800, birthMonth: 12, birthDay: 21,
    deathYear: 1831, deathMonth: 8, deathDay: 30,
    gender: 'FEMALE',
  },

  // ── 핵심 인물 3명 ────────────────────────────────────────────────────────────
  {
    name: '빅토리아',
    surname: '하노버',
    originalName: 'Victoria',
    regnalName: 'Victoria',
    biography:
      '영국 역사상 가장 오래 재위한 군주 중 한 명(1837-1901, 63년 7개월). 18세에 즉위하여 산업혁명과 대영제국 팽창의 전성기를 이끌었다. 1840년 작센코부르크고타의 앨버트 공과 결혼하여 9명의 자녀를 두었으며, 1861년 앨버트 공 사망 후 깊은 애도 속에 "과부의 여왕"으로 불렸다. 1876년 인도 황후 칭호를 추가로 받았고, 그녀의 자녀들이 유럽 각국 왕실과 혼인하여 "유럽의 할머니"라 불렸다.',
    birthYear: 1819, birthMonth: 5, birthDay: 24,
    deathYear: 1901, deathMonth: 1, deathDay: 22,
    gender: 'FEMALE',
    dynastyName: '하노버 왕가',
    countryName: '그레이트브리튼 및 아일랜드 연합왕국',
    reigns: [
      {
        countryName: '그레이트브리튼 및 아일랜드 연합왕국',
        positionTitle: '국왕',
        regnalNumber: 1,
        startYear: 1837, startMonth: 6, startDay: 20,
        endYear: 1901, endMonth: 1, endDay: 22,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.DEATH_IN_OFFICE,
        notes: '대영제국 전성기를 이끈 여왕. 1876년 인도 황후 겸임. 재위 63년으로 당시 영국 최장 재위.',
      },
    ],
  },
  {
    name: '앨버트',
    surname: '작센코부르크고타',
    originalName: 'Albert of Saxe-Coburg and Gotha',
    biography:
      '빅토리아 여왕의 부군(Prince Consort). 1819년 독일 작센코부르크고타 공국에서 태어나 1840년 빅토리아 여왕과 결혼했다. 과학·예술·기술 진흥에 헌신하여 1851년 런던 만국박람회를 주도적으로 기획·성사시켰다. 왕실 재정 개혁과 빈민 구제 활동에도 힘썼다. 1861년 42세에 장티푸스(또는 위암 추정)로 조기 사망하였으며, 빅토리아 여왕은 이후 40년간 검은 상복을 착용하며 애도했다.',
    birthYear: 1819, birthMonth: 8, birthDay: 26,
    deathYear: 1861, deathMonth: 12, deathDay: 14,
    gender: 'MALE',
    dynastyName: '작센코부르크고타 왕가',
    countryName: '그레이트브리튼 및 아일랜드 연합왕국',
    reigns: [],
  },
  {
    name: '에드워드',
    surname: '작센코부르크고타',
    originalName: 'Edward VII',
    regnalName: 'Edward',
    biography:
      '빅토리아 여왕과 앨버트 공의 장남. 59세에 즉위하여 9년간(1901-1910) 재위하며 "에드워드 시대(Edwardian Era)"를 열었다. 뛰어난 외교 수완으로 프랑스와 영불협상(Entente Cordiale, 1904)을 체결하고 유럽 외교 무대에서 "평화의 중재자"로 불렸다. 방탕한 황태자 시절과 달리 재위 중에는 능숙한 군주로 활약했다.',
    birthYear: 1841, birthMonth: 11, birthDay: 9,
    deathYear: 1910, deathMonth: 5, deathDay: 6,
    gender: 'MALE',
    dynastyName: '작센코부르크고타 왕가',
    countryName: '그레이트브리튼 및 아일랜드 연합왕국',
    reigns: [
      {
        countryName: '그레이트브리튼 및 아일랜드 연합왕국',
        positionTitle: '국왕',
        regnalNumber: 7,
        startYear: 1901, startMonth: 1, startDay: 22,
        endYear: 1910, endMonth: 5, endDay: 6,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.DEATH_IN_OFFICE,
        notes: '영불협상(1904) 주도. "에드워드 시대"의 개막. 유럽 외교의 중재자.',
      },
    ],
  },
]

// ── 결혼 관계 ─────────────────────────────────────────────────────────────────
const MARRIAGES = [
  {
    personA: 'Edward, Duke of Kent',
    personB: 'Victoria of Saxe-Coburg-Saalfeld',
    startYear: 1818, startMonth: 5, startDay: 29,
    note: '1818년 5월 29일 결혼. 빅토리아 여왕의 부모.',
  },
  {
    personA: 'Ernest I, Duke of Saxe-Coburg and Gotha',
    personB: 'Louise of Saxe-Gotha-Altenburg',
    startYear: 1817, startMonth: 7, startDay: 31,
    endYear: 1824,
    note: '1817년 결혼, 1824년 이혼. 앨버트 공의 부모.',
  },
  {
    personA: 'Victoria',
    personB: 'Albert of Saxe-Coburg and Gotha',
    startYear: 1840, startMonth: 2, startDay: 10,
    endYear: 1861, endMonth: 12, endDay: 14,
    note: '1840년 2월 10일 런던 세인트제임스궁에서 결혼. 앨버트 공 사망(1861)으로 종료.',
  },
]

// ── 부자 관계 ─────────────────────────────────────────────────────────────────
const FATHER_CHILD = [
  { father: 'Edward, Duke of Kent', child: 'Victoria' },
  { father: 'Ernest I, Duke of Saxe-Coburg and Gotha', child: 'Albert of Saxe-Coburg and Gotha' },
  { father: 'Albert of Saxe-Coburg and Gotha', child: 'Edward VII' },
]

// ── 모자 관계 ─────────────────────────────────────────────────────────────────
const MOTHER_CHILD = [
  { mother: 'Victoria of Saxe-Coburg-Saalfeld', child: 'Victoria' },
  { mother: 'Louise of Saxe-Gotha-Altenburg', child: 'Albert of Saxe-Coburg and Gotha' },
  { mother: 'Victoria', child: 'Edward VII' },
]

// ── 시딩 함수 ─────────────────────────────────────────────────────────────────
export async function seedBritainMonarchs(prisma: PrismaService): Promise<void> {
  console.log('\n👑 영국 군주 시딩 시작...')

  // ── 0. 가문 생성 ──────────────────────────────────────────────────
  console.log('\n  🏰 가문 생성...')
  for (const d of DYNASTIES) {
    const existing = await prisma.dynasty.findFirst({ where: { name: d.name } })
    if (existing) {
      console.log(`    ⏭️  ${d.name}`)
    } else {
      await prisma.dynasty.create({
        data: {
          name: d.name,
          description: d.description,
          startDate: new Date(d.startYear, 0, 1),
          endDate: d.endYear ? new Date(d.endYear, 11, 31) : undefined,
        },
      })
      console.log(`    ✅ ${d.name}`)
    }
  }

  // ── 0-1. 가문 통치 기록 ──────────────────────────────────────────
  console.log('\n  📜 가문 통치 기록...')
  for (const rule of DYNASTY_RULES) {
    const dynasty = await prisma.dynasty.findFirst({ where: { name: rule.dynastyName } })
    const hc = await prisma.historicalCountry.findFirst({ where: { name: rule.countryName } })
    if (!dynasty || !hc) { console.warn(`    ⚠️  없음: ${rule.dynastyName} / ${rule.countryName}`); continue }
    const exists = await prisma.dynastyRule.findFirst({ where: { dynastyId: dynasty.id, historicalCountryId: hc.id } })
    if (exists) {
      console.log(`    ⏭️  통치: ${rule.countryName}`)
    } else {
      await prisma.dynastyRule.create({
        data: { dynastyId: dynasty.id, historicalCountryId: hc.id, startEra: 'AD', startYear: rule.startYear, endEra: 'AD', endYear: rule.endYear },
      })
      console.log(`    ✅ 통치: ${rule.countryName} (${rule.startYear}-${rule.endYear ?? '현재'})`)
    }
  }

  // ── 1. 인물 등록 ──────────────────────────────────────────────────
  console.log('\n  👤 인물 등록...')
  for (const m of PERSONS) {
    const existing = await prisma.person.findFirst({ where: { originalName: m.originalName } })
    let personId: string

    const birthDate = new Date(m.birthYear, m.birthMonth - 1, m.birthDay)
    const deathDate = m.deathYear ? new Date(m.deathYear, (m.deathMonth ?? 1) - 1, m.deathDay ?? 1) : undefined
    const dynastyId = m.dynastyName ? await getDynastyId(prisma, m.dynastyName) : null
    const historicalCountryId = m.countryName ? await getHistoricalCountryId(prisma, m.countryName) : null

    if (existing) {
      personId = existing.id
      console.log(`    ⏭️  ${m.originalName}`)
      if (!existing.dynastyId && dynastyId) {
        await prisma.person.update({ where: { id: personId }, data: { dynastyId } })
        console.log(`        ✅ 가문 연결: ${m.dynastyName}`)
      }
    } else {
      const created = await prisma.person.create({
        data: {
          name: m.name,
          surname: m.surname,
          originalName: m.originalName,
          regnalName: m.regnalName,
          biography: m.biography,
          birthDate,
          birthEra: 'AD',
          deathDate,
          deathEra: 'AD',
          gender: m.gender,
          nameDisplayOrder: 'western',
          dynastyId: dynastyId ?? undefined,
          accountId: ACCOUNT_ID,
        },
      })
      personId = created.id
      console.log(`    ✅ ${m.originalName}`)
    }

    // 소속 국가 affiliation
    if (historicalCountryId) {
      const affExists = await prisma.personCountryAffiliation.findFirst({
        where: { personId, historicalCountryId, affiliationType: 'CITIZENSHIP' as any },
      })
      if (!affExists) {
        await prisma.personCountryAffiliation.create({
          data: { personId, historicalCountryId, affiliationType: 'CITIZENSHIP' as any, priority: 0 },
        })
        console.log(`        ✅ 소속국가: ${m.countryName}`)
      }
    }

    // 재위 기록
    for (const r of m.reigns ?? []) {
      const reignCountryId = await getHistoricalCountryId(prisma, r.countryName)
      if (!reignCountryId) { console.warn(`        ⚠️  역사 국가 없음: ${r.countryName}`); continue }
      const positionDefId = await getPositionDefId(prisma, r.positionTitle)
      const startDate = new Date(r.startYear, r.startMonth - 1, r.startDay ?? 1)
      const endDate = r.endYear ? new Date(r.endYear, (r.endMonth ?? 1) - 1, r.endDay ?? 1) : undefined
      // 유니크 제약 (historicalCountryId, regnalNumber) — 다른 personId라도 충돌하므로 제약 키로 lookup.
      const existingReign = await prisma.sovereignReign.findFirst({
        where: { historicalCountryId: reignCountryId, regnalNumber: r.regnalNumber },
      })
      if (existingReign) {
        if (existingReign.personId === personId) {
          console.log(`        ⏭️  재위: ${r.countryName} ${r.positionTitle}`)
        } else {
          console.warn(
            `        ⚠️  재위: ${r.countryName} ${r.positionTitle} ${r.regnalNumber ?? ''} — 다른 인물에 이미 점유됨 (skip)`,
          )
        }
      } else {
        await prisma.sovereignReign.create({
          data: {
            personId,
            historicalCountryId: reignCountryId,
            positionDefinitionId: positionDefId,
            regnalNumber: r.regnalNumber,
            startDate,
            endDate,
            appointmentMethod: r.appointmentMethod,
            endReason: r.endReason,
            endReasonDetail: r.endReasonDetail,
            notes: r.notes,
            accountId: ACCOUNT_ID,
          },
        })
        console.log(`        ✅ 재위: ${r.countryName} ${r.positionTitle} (${r.startYear}-${r.endYear ?? '현재'})`)
      }
    }
  }

  // ── 2. 결혼 관계 ─────────────────────────────────────────────────
  console.log('\n  💒 결혼 관계 등록...')
  for (const m of MARRIAGES) {
    const pA = await prisma.person.findFirst({ where: { originalName: m.personA } })
    const pB = await prisma.person.findFirst({ where: { originalName: m.personB } })
    if (!pA || !pB) { console.warn(`    ⚠️  인물 없음: ${m.personA} / ${m.personB}`); continue }
    const startDate = new Date(m.startYear, m.startMonth - 1, m.startDay)
    const endDate = m.endYear ? new Date(m.endYear, (m.endMonth ?? 1) - 1, m.endDay ?? 1) : undefined
    const existAB = await prisma.personSpouse.findFirst({ where: { personId: pA.id, spouseId: pB.id } })
    if (!existAB) {
      await prisma.personSpouse.create({ data: { personId: pA.id, spouseId: pB.id, marriageStartDate: startDate, marriageEndDate: endDate, note: m.note } })
    }
    const existBA = await prisma.personSpouse.findFirst({ where: { personId: pB.id, spouseId: pA.id } })
    if (!existBA) {
      await prisma.personSpouse.create({ data: { personId: pB.id, spouseId: pA.id, marriageStartDate: startDate, marriageEndDate: endDate, note: m.note } })
    }
    console.log(`    ${!existAB ? '✅' : '⏭️ '} ${m.personA} × ${m.personB}`)
  }

  // ── 3. 부자 관계 ─────────────────────────────────────────────────
  console.log('\n  👨‍👦 부자 관계 등록...')
  for (const rel of FATHER_CHILD) {
    const father = await prisma.person.findFirst({ where: { originalName: rel.father } })
    const child = await prisma.person.findFirst({ where: { originalName: rel.child } })
    if (!father || !child) { console.warn(`    ⚠️  없음: ${rel.father} → ${rel.child}`); continue }
    if (child.fatherId) { console.log(`    ⏭️  ${rel.child}`); continue }
    await prisma.person.update({ where: { id: child.id }, data: { fatherId: father.id } })
    console.log(`    ✅ ${rel.father} → ${rel.child}`)
  }

  // ── 4. 모자 관계 ─────────────────────────────────────────────────
  console.log('\n  👩‍👦 모자 관계 등록...')
  for (const rel of MOTHER_CHILD) {
    const mother = await prisma.person.findFirst({ where: { originalName: rel.mother } })
    const child = await prisma.person.findFirst({ where: { originalName: rel.child } })
    if (!mother || !child) { console.warn(`    ⚠️  없음: ${rel.mother} → ${rel.child}`); continue }
    if (child.motherId) { console.log(`    ⏭️  ${rel.child}`); continue }
    await prisma.person.update({ where: { id: child.id }, data: { motherId: mother.id } })
    console.log(`    ✅ ${rel.mother} → ${rel.child}`)
  }

  console.log(`\n✅ 영국 군주 시딩 완료 (${PERSONS.length}명)\n`)
}
