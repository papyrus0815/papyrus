import {
  PersonHumanRelationshipType,
  PersonRelationshipTag,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

/**
 * 비공식위원회 (Негласный комитет, 1801–1803) 4인 시드
 *
 * 알렉산드르 1세 즉위 직후 결성된 사적·비공식 자문 그룹.
 * 보수 귀족들은 자코뱅 공안위원회를 빗대 "공안위원회"라 비꼬았다.
 *
 * 구성원:
 *   1) Adam Jerzy Czartoryski (1770–1861)  — 폴란드 대귀족, 입헌·자유주의
 *   2) Nikolai Novosiltsev   (1761–1838)  — 비귀족 행정 실무가, 영국 식견
 *   3) Pavel Stroganov       (1772–1817)  — 러시아 대귀족, 프랑스 자코뱅 경험
 *   4) Viktor Kochubey       (1768–1834)  — 우크라이나계 러시아 외교관, 내무장관
 *
 * 이 시드는 idempotent: 인물·가문·관계 모두 originalName/이름 기준으로 존재하면 skip.
 */

const ACCOUNT_ID = '6af53fe7-d02b-4c42-b86c-f32800897b32'

interface CommitteeMember {
  /** 한글 이름(이름 부분만) */
  name: string
  /** 한글 성씨 — Person.surname */
  surname: string
  /** Person.originalName — idempotent 키로 사용 */
  originalName: string
  biography: string
  birthYear: number
  birthMonth: number
  birthDay: number
  deathYear: number
  deathMonth: number
  deathDay: number
  /** 출신 가문명 — DynastyId로 묶음 */
  dynastyName: string
}

const MEMBERS: CommitteeMember[] = [
  {
    name: '아담 예지',
    surname: '차르토리스키',
    originalName: 'Adam Jerzy Czartoryski',
    biography:
      '폴란드 대귀족 차르토리스키 가문 출신의 정치가. 알렉산드르 1세의 황태자 시절부터 가장 가까운 친구이자 위원회 내 가장 체계적·이론적인 인물로, 입헌주의·자유주의 노선을 견지했다. 비공식위원회(1801–1803) 활동 후 외무 부직을 거쳐 1804–1806년 러시아 제국의 외무장관을 지냈다. 궁극적 관심은 러시아의 자유주의화를 통한 폴란드 부흥 가능성 확보였으며, 빈 회의(1815) 후 폴란드 입헌왕국 수립에 깊이 관여했다. 1830년 11월 봉기 후 망명해 파리에서 폴란드 망명 정부의 정신적 지도자로 여생을 보냈다.',
    birthYear: 1770, birthMonth: 1, birthDay: 14,
    deathYear: 1861, deathMonth: 7, deathDay: 15,
    dynastyName: '차르토리스키 가문',
  },
  {
    name: '니콜라이',
    surname: '노보실체프',
    originalName: 'Nikolai Novosiltsev',
    biography:
      '러시아 제국의 비귀족 출신 행정 실무가. 비공식위원회 4인 중 연장자였으며 영국 체류 경험을 바탕으로 영국식 정치제도에 대한 식견을 갖추고 있었다. 위원회 내에서 법제·행정 개혁의 실무 설계자 역할을 맡았다. 알렉산드르 1세 후반기에는 보수화하여 폴란드 입헌왕국에서 사실상 부왕(代理王) 역할을 수행하며 억압적 통치를 펼쳤고, 차르토리스키와 결국 정치적으로 결별했다. 니콜라이 1세 치하에서도 추밀원 의장(1832–1838)을 역임했다.',
    birthYear: 1761, birthMonth: 8, birthDay: 1,
    deathYear: 1838, deathMonth: 4, deathDay: 20,
    dynastyName: '노보실체프 가문',
  },
  {
    name: '파벨',
    surname: '스트로가노프',
    originalName: 'Pavel Stroganov',
    biography:
      '러시아 제국의 대귀족 스트로가노프 가문 출신 정치가·군인. 프랑스 혁명기 파리에서 가정교사 질베르 롬과 함께 자코뱅 클럽에 가담한 이력이 있어 비공식위원회 내에서 가장 급진적인 자유주의 성향을 보였다. 1801–1803년 위원회 활동 후 외교·행정 직책을 거쳐 1807년부터 군에 복무, 나폴레옹 전쟁기 보로디노 전투(1812)와 라이프치히 전투(1813)에 참전했다. 1814년 크라온 전투에서 외아들 알렉산드르가 전사한 충격으로 정신적으로 큰 타격을 입었고 1817년 사망했다.',
    birthYear: 1772, birthMonth: 6, birthDay: 18,
    deathYear: 1817, deathMonth: 6, deathDay: 22,
    dynastyName: '스트로가노프 가문',
  },
  {
    name: '빅토르',
    surname: '코추베이',
    originalName: 'Viktor Kochubey',
    biography:
      '우크라이나계 러시아 귀족 코추베이 가문 출신의 외교관·정치가. 외무차관(1798–1799)을 거쳐 비공식위원회의 핵심 4인으로 참여했고, 1802년 러시아 제국 최초의 내무장관으로 임명되어 행정 체계 근대화의 기초를 놓았다. 1810–1812년 국가평의회 의장(내무 부문), 1819–1825년 다시 내무장관을 역임하며 알렉산드르 1세 시대 행정 개혁의 중심에 있었다. 니콜라이 1세 치세에서도 1827년 국가평의회·각료위원회 의장에 임명되었고 1834년 사망 직전 후작(Кн.) 칭호를 받았다.',
    birthYear: 1768, birthMonth: 11, birthDay: 11,
    deathYear: 1834, deathMonth: 6, deathDay: 15,
    dynastyName: '코추베이 가문',
  },
]

interface DynastyEntry {
  name: string
  description: string
  originPlace: string
  startYear: number
  motto?: string
}

const DYNASTIES: DynastyEntry[] = [
  {
    name: '차르토리스키 가문',
    description:
      '리투아니아 게디미나스 대공 직계 후손을 자처한 폴란드-리투아니아 연방의 대귀족 가문. 18–19세기 폴란드 정치·문화의 중심이었으며 18세기 후반 러시아 제국 궁정에도 큰 영향력을 행사했다. 가문의 본거지였던 푸와비(Puławy) 궁전은 폴란드 계몽주의의 거점이었고, 빈 회의 후 폴란드 입헌왕국 수립과 1830년 11월 봉기 이후 망명 정치의 중추(파리 호텔 람베르 그룹)였다.',
    originPlace: '클레반·푸와비 (폴란드-리투아니아)',
    startYear: 1442,
    motto: 'Bądź co bądź',
  },
  {
    name: '노보실체프 가문',
    description:
      '러시아 제국 시대의 신흥 중하위 귀족 가문. 군주에 대한 충성과 행정 능력을 바탕으로 18세기 말~19세기에 두각을 나타냈으며, 비공식위원회의 니콜라이 노보실체프가 가문 위상을 정점으로 끌어올렸다.',
    originPlace: '러시아 (모스크바·중앙 러시아)',
    startYear: 1700,
  },
  {
    name: '스트로가노프 가문',
    description:
      '16세기부터 우랄·시베리아의 소금·모피·광산 산업으로 거대한 부를 축적한 러시아의 상인 출신 대귀족 가문. 표트르 1세 시대에 남작(1722), 18세기 후반 백작(1761) 칭호를 받아 제국 최고위 귀족으로 격상됐다. 19세기 가문은 정치·외교·예술 후원의 중심으로, 상트페테르부르크의 스트로가노프 궁전과 광범위한 미술 컬렉션으로 잘 알려져 있다.',
    originPlace: '솔비체고드스크 (북러시아)',
    startYear: 1488,
  },
  {
    name: '코추베이 가문',
    description:
      '17세기 우크라이나 코사크 헤트만 시대 토착 귀족에서 출발한 우크라이나계 러시아 명문 가문. 시조 바실리 코추베이는 헤트만 마제파에 의해 처형(1708)되었으나 표트르 1세에 의해 사후 복권되어 가문이 격상됐다. 18–19세기 러시아 외교·내정의 핵심 인물을 배출했고 빅토르 코추베이가 후작 칭호를 받으며(1834) 가문이 정점에 올랐다.',
    originPlace: '디칸카 (좌안 우크라이나)',
    startYear: 1670,
  },
]

/** 4인 사이의 협력자 관계 — GENERAL + ALLY/COLLEAGUE 태그, 양방향(isMutual=true) */
const MEMBER_PAIR_RELATIONS: { a: string; b: string; note: string }[] = [
  {
    a: 'Adam Jerzy Czartoryski',
    b: 'Nikolai Novosiltsev',
    note:
      '비공식위원회(1801–1803) 동료. 자유주의 노선에서 의기투합했으나 1820년대 폴란드 입헌왕국 운영을 두고 결별했다.',
  },
  {
    a: 'Adam Jerzy Czartoryski',
    b: 'Pavel Stroganov',
    note:
      '비공식위원회 동료. 둘 다 외국 체류 경험(차르토리스키-영국·서유럽, 스트로가노프-프랑스)을 통해 입헌·자유주의 사상에 접근했다.',
  },
  {
    a: 'Adam Jerzy Czartoryski',
    b: 'Viktor Kochubey',
    note: '비공식위원회 동료. 외무·내무 라인의 양대 축으로 협력했다.',
  },
  {
    a: 'Nikolai Novosiltsev',
    b: 'Pavel Stroganov',
    note: '비공식위원회 동료. 행정·법제 개혁 설계의 실무 파트너.',
  },
  {
    a: 'Nikolai Novosiltsev',
    b: 'Viktor Kochubey',
    note: '비공식위원회 동료. 행정 개혁 추진 라인.',
  },
  {
    a: 'Pavel Stroganov',
    b: 'Viktor Kochubey',
    note: '비공식위원회 동료.',
  },
]

/** 알렉산드르 1세와 4인의 관계 — 차르토리스키만 CLOSE_FRIEND, 나머지는 ALLY/PATRON-CLIENT */
const TSAR_RELATIONS: {
  member: string
  tags: PersonRelationshipTag[]
  affinityLevel: number
  note: string
}[] = [
  {
    member: 'Adam Jerzy Czartoryski',
    tags: [PersonRelationshipTag.CLOSE_FRIEND, PersonRelationshipTag.CLIENT],
    affinityLevel: 2,
    note:
      '황태자 시절(1795년경)부터 가장 가까운 친구. 즉위 후 비공식위원회 핵심·외무장관(1804–1806)으로 등용. 1815년 빈 회의 이후에도 폴란드 입헌왕국을 두고 협력했다.',
  },
  {
    member: 'Nikolai Novosiltsev',
    tags: [PersonRelationshipTag.ALLY, PersonRelationshipTag.CLIENT],
    affinityLevel: 1,
    note: '비공식위원회 핵심 인물. 후반기에는 알렉산드르 1세의 보수화에 동조해 폴란드 통치를 위임받았다.',
  },
  {
    member: 'Pavel Stroganov',
    tags: [PersonRelationshipTag.ALLY, PersonRelationshipTag.CLIENT],
    affinityLevel: 1,
    note: '비공식위원회 핵심. 자유주의 개혁의 가장 급진적 추진자였다.',
  },
  {
    member: 'Viktor Kochubey',
    tags: [PersonRelationshipTag.ALLY, PersonRelationshipTag.CLIENT],
    affinityLevel: 1,
    note: '비공식위원회 핵심. 1802년 초대 내무장관으로 임명되어 행정 근대화의 책임을 맡았다.',
  },
]

async function findPersonId(
  prisma: PrismaService,
  originalName: string,
): Promise<string | null> {
  const p = await prisma.person.findFirst({ where: { originalName } })
  return p?.id ?? null
}

async function ensureRelationship(
  prisma: PrismaService,
  fromId: string,
  toId: string,
  type: PersonHumanRelationshipType,
  tags: PersonRelationshipTag[],
  affinityLevel: number,
  note: string,
  startDate: Date,
  isMutual: boolean,
) {
  // (from, to) 또는 (to, from) 어느 방향으로든 이미 있으면 skip
  const existing = await prisma.personHumanRelationship.findFirst({
    where: {
      OR: [
        { fromPersonId: fromId, toPersonId: toId },
        ...(isMutual
          ? [{ fromPersonId: toId, toPersonId: fromId }]
          : []),
      ],
      relationshipType: type,
    },
  })
  if (existing) return null

  const created = await prisma.personHumanRelationship.create({
    data: {
      fromPersonId: fromId,
      toPersonId: toId,
      relationshipType: type,
      isMutual,
      affinityLevel,
      startDate,
      note,
    },
  })

  for (const tag of tags) {
    await prisma.personHumanRelationshipTagAssignment.create({
      data: { relationshipId: created.id, tag },
    })
  }
  return created.id
}

export async function seedRussiaUnofficialCommittee(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🤝 러시아 비공식위원회(1801–1803) 시드 시작...')

  // ── 1. 가문 생성 ─────────────────────────────────────────────────
  console.log('\n  🏰 가문 생성/조회...')
  const dynastyIdMap = new Map<string, string>()
  for (const d of DYNASTIES) {
    let dyn = await prisma.dynasty.findFirst({ where: { name: d.name } })
    if (!dyn) {
      dyn = await prisma.dynasty.create({
        data: {
          name: d.name,
          description: d.description,
          originPlace: d.originPlace,
          startDate: new Date(d.startYear, 0, 1),
          motto: d.motto,
        },
      })
      console.log(`    ✅ ${d.name}`)
    } else {
      console.log(`    ♻️  ${d.name}`)
    }
    dynastyIdMap.set(d.name, dyn.id)
  }

  // ── 2. 인물 생성 ─────────────────────────────────────────────────
  console.log('\n  👤 4인 인물 등록...')
  const memberIdMap = new Map<string, string>()
  for (const m of MEMBERS) {
    const existing = await prisma.person.findFirst({
      where: { originalName: m.originalName },
    })

    if (existing) {
      memberIdMap.set(m.originalName, existing.id)
      console.log(`    ⏭️  ${m.originalName}`)
      continue
    }

    const created = await prisma.person.create({
      data: {
        name: m.name,
        surname: m.surname,
        originalName: m.originalName,
        biography: m.biography,
        birthDate: new Date(m.birthYear, m.birthMonth - 1, m.birthDay),
        birthEra: 'AD',
        deathDate: new Date(m.deathYear, m.deathMonth - 1, m.deathDay),
        deathEra: 'AD',
        gender: 'MALE',
        nameDisplayOrder: 'western',
        dynastyId: dynastyIdMap.get(m.dynastyName) ?? null,
        accountId: ACCOUNT_ID,
      },
    })
    memberIdMap.set(m.originalName, created.id)
    console.log(`    ✅ ${m.originalName}`)
  }

  // ── 3. 4인 사이의 협력자 관계 (GENERAL + ALLY/COLLEAGUE) ─────────
  console.log('\n  🤝 4인 협력자 관계 등록...')
  const committeeStart = new Date(1801, 5, 24) // 1801-06-24 첫 회합
  for (const pair of MEMBER_PAIR_RELATIONS) {
    const fromId = memberIdMap.get(pair.a)
    const toId = memberIdMap.get(pair.b)
    if (!fromId || !toId) {
      console.warn(`    ⚠️  인물 ID 누락: ${pair.a} ↔ ${pair.b}`)
      continue
    }
    const id = await ensureRelationship(
      prisma,
      fromId,
      toId,
      PersonHumanRelationshipType.GENERAL,
      [PersonRelationshipTag.ALLY, PersonRelationshipTag.COLLEAGUE],
      1, // 우호적
      pair.note,
      committeeStart,
      true, // 양방향
    )
    if (id) {
      console.log(`    ✅ ${pair.a} ↔ ${pair.b}`)
    } else {
      console.log(`    ♻️  ${pair.a} ↔ ${pair.b}`)
    }
  }

  // ── 4. 알렉산드르 1세와의 관계 ───────────────────────────────────
  console.log('\n  👑 알렉산드르 1세와의 관계 등록...')
  const tsarId = await findPersonId(prisma, 'Alexander I of Russia')
  if (!tsarId) {
    console.warn('    ⚠️  알렉산드르 1세 인물이 없음 — 스킵')
  } else {
    for (const t of TSAR_RELATIONS) {
      const memberId = memberIdMap.get(t.member)
      if (!memberId) continue
      const id = await ensureRelationship(
        prisma,
        memberId,
        tsarId,
        PersonHumanRelationshipType.GENERAL,
        t.tags,
        t.affinityLevel,
        t.note,
        committeeStart,
        true,
      )
      if (id) {
        console.log(`    ✅ ${t.member} ↔ Alexander I`)
      } else {
        console.log(`    ♻️  ${t.member} ↔ Alexander I`)
      }
    }
  }

  console.log(
    `\n✅ 러시아 비공식위원회 시드 완료 (인물 ${MEMBERS.length}, 가문 ${DYNASTIES.length}, 협력자 쌍 ${MEMBER_PAIR_RELATIONS.length} + 황제 관계 ${TSAR_RELATIONS.length})\n`,
  )
}
