import {
  HistoricalMembershipRole,
  HistoricalRelationType,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

const ID = (n: number) =>
  `de000001-0000-0000-0000-${String(n).padStart(12, '0')}`

const EAST_FRANCIA = ID(1)
const HRE = ID(2)
const PRUSSIA_KINGDOM = ID(3)
const GERMAN_CONFED = ID(4)
const NORTH_GERMAN_CONFED = ID(5)
const GERMAN_EMPIRE = ID(6)
const WEIMAR = ID(7)
const NAZI = ID(8)
const WEST_GERMANY = ID(9)
const EAST_GERMANY = ID(10)
const PRUSSIA_DUCHY = ID(11)
const BRANDENBURG_MARK = ID(12)
const BRANDENBURG_PRUSSIA = ID(13)
const BAVARIA_KINGDOM = ID(14)
const BAVARIA_DUCHY = ID(15)
const SAXONY_KINGDOM = ID(16)
const SAXONY_ELECTORATE = ID(17)
const HANOVER_KINGDOM = ID(18)
const WURTTEMBERG_KINGDOM = ID(19)
const BADEN_GRAND = ID(20)
const HESSE_GRAND = ID(21)
const TEUTONIC_ORDER = ID(22)
const RHINE_CONFED = ID(23)

// 소속 관계: [parent, member, role, isLeading]
type Membership = [string, string, HistoricalMembershipRole, boolean]

const MEMBERSHIPS: Membership[] = [
  // 신성 로마 제국(962–1806) 구성국들
  [HRE, BRANDENBURG_MARK, HistoricalMembershipRole.CONFEDERATION_MEMBER, false],
  [HRE, BAVARIA_DUCHY, HistoricalMembershipRole.CONFEDERATION_MEMBER, false],
  [HRE, SAXONY_ELECTORATE, HistoricalMembershipRole.CONFEDERATION_MEMBER, false],
  [HRE, BRANDENBURG_PRUSSIA, HistoricalMembershipRole.CONFEDERATION_MEMBER, false],
  [HRE, TEUTONIC_ORDER, HistoricalMembershipRole.CONFEDERATION_MEMBER, false],

  // 라인 동맹(1806–1813) 구성국들
  [RHINE_CONFED, BAVARIA_KINGDOM, HistoricalMembershipRole.CONFEDERATION_MEMBER, false],
  [RHINE_CONFED, SAXONY_KINGDOM, HistoricalMembershipRole.CONFEDERATION_MEMBER, false],
  [RHINE_CONFED, WURTTEMBERG_KINGDOM, HistoricalMembershipRole.CONFEDERATION_MEMBER, false],
  [RHINE_CONFED, BADEN_GRAND, HistoricalMembershipRole.CONFEDERATION_MEMBER, false],
  [RHINE_CONFED, HESSE_GRAND, HistoricalMembershipRole.CONFEDERATION_MEMBER, false],

  // 독일 연방(1815–1866) 구성국들
  [GERMAN_CONFED, PRUSSIA_KINGDOM, HistoricalMembershipRole.CONFEDERATION_MEMBER, false],
  [GERMAN_CONFED, BAVARIA_KINGDOM, HistoricalMembershipRole.CONFEDERATION_MEMBER, false],
  [GERMAN_CONFED, SAXONY_KINGDOM, HistoricalMembershipRole.CONFEDERATION_MEMBER, false],
  [GERMAN_CONFED, HANOVER_KINGDOM, HistoricalMembershipRole.CONFEDERATION_MEMBER, false],
  [GERMAN_CONFED, WURTTEMBERG_KINGDOM, HistoricalMembershipRole.CONFEDERATION_MEMBER, false],
  [GERMAN_CONFED, BADEN_GRAND, HistoricalMembershipRole.CONFEDERATION_MEMBER, false],
  [GERMAN_CONFED, HESSE_GRAND, HistoricalMembershipRole.CONFEDERATION_MEMBER, false],

  // 북독일 연방(1867–1871) — 프로이센 주도
  [NORTH_GERMAN_CONFED, PRUSSIA_KINGDOM, HistoricalMembershipRole.CONFEDERATION_MEMBER, true],
  [NORTH_GERMAN_CONFED, SAXONY_KINGDOM, HistoricalMembershipRole.CONFEDERATION_MEMBER, false],

  // 독일 제국(1871–1918) — 프로이센이 주축
  [GERMAN_EMPIRE, PRUSSIA_KINGDOM, HistoricalMembershipRole.CONFEDERATION_MEMBER, true],
  [GERMAN_EMPIRE, BAVARIA_KINGDOM, HistoricalMembershipRole.CONFEDERATION_MEMBER, false],
  [GERMAN_EMPIRE, SAXONY_KINGDOM, HistoricalMembershipRole.CONFEDERATION_MEMBER, false],
  [GERMAN_EMPIRE, WURTTEMBERG_KINGDOM, HistoricalMembershipRole.CONFEDERATION_MEMBER, false],
  [GERMAN_EMPIRE, BADEN_GRAND, HistoricalMembershipRole.CONFEDERATION_MEMBER, false],
  [GERMAN_EMPIRE, HESSE_GRAND, HistoricalMembershipRole.CONFEDERATION_MEMBER, false],
]

// 수평 관계: [subject, object, relationType]
type Relation = [string, string, HistoricalRelationType]

const RELATIONS: Relation[] = [
  // 동군연합: 브란덴부르크 + 프로이센 공국
  [BRANDENBURG_MARK, PRUSSIA_DUCHY, HistoricalRelationType.PERSONAL_UNION],
  // 독일 통일 전 프로이센 vs 오스트리아 갈등 생략, 대신 주요 전쟁만
  // 제1차 세계대전: 독일 제국 vs 영국(대영제국은 다른 국가), 여기서는 독일끼리만 관계 등록
  // 30년 전쟁 등 생략 — 독일 내 국가 간 관계 위주로
  // 북독일 연방 vs 남독일 (바이에른·뷔르템베르크·바덴) — 동맹 (1870 보불전쟁 시 동맹)
  [NORTH_GERMAN_CONFED, BAVARIA_KINGDOM, HistoricalRelationType.ALLIANCE],
  [NORTH_GERMAN_CONFED, WURTTEMBERG_KINGDOM, HistoricalRelationType.ALLIANCE],
  [NORTH_GERMAN_CONFED, BADEN_GRAND, HistoricalRelationType.ALLIANCE],
  // 동/서독 관계 (분단기 적대·이후 통일)
  [WEST_GERMANY, EAST_GERMANY, HistoricalRelationType.WAR],
  // 나치 독일 vs 바이마르 (계승 관계이므로 생략, REGIME_CHANGE로 이미 등록)
  // 동프랑크의 상징적 계승: 동프랑크 → HRE는 SUCCESSION(이미 transition)
]

async function main() {
  const prisma = new PrismaService({ useAdapter: true })

  console.log('📎 소속 관계 등록 중...')
  let mCreated = 0
  for (const [parent, member, role, lead] of MEMBERSHIPS) {
    const existing = await prisma.historicalCountryMembership.findFirst({
      where: { historicalCountryId: parent, memberCountryId: member, role },
    })
    if (existing) {
      console.log(`  ⏭️  ${parent.slice(-3)} ⊇ ${member.slice(-3)} (${role})`)
      continue
    }
    await prisma.historicalCountryMembership.create({
      data: {
        historicalCountryId: parent,
        memberCountryId: member,
        role,
        isLeadingMember: lead,
      },
    })
    mCreated += 1
    console.log(`  ✅ ${parent.slice(-3)} ⊇ ${member.slice(-3)} (${role}${lead ? ', LEAD' : ''})`)
  }

  console.log('\n🔗 수평 관계 등록 중...')
  let rCreated = 0
  for (const [subject, object, relationType] of RELATIONS) {
    const existing = await prisma.historicalCountryRelation.findFirst({
      where: {
        subjectCountryId: subject,
        objectCountryId: object,
        relationType,
      },
    })
    if (existing) {
      console.log(`  ⏭️  ${subject.slice(-3)} — ${object.slice(-3)} (${relationType})`)
      continue
    }
    await prisma.historicalCountryRelation.create({
      data: { subjectCountryId: subject, objectCountryId: object, relationType },
    })
    rCreated += 1
    console.log(`  ✅ ${subject.slice(-3)} — ${object.slice(-3)} (${relationType})`)
  }

  console.log(
    `\n총 소속관계 ${mCreated}/${MEMBERSHIPS.length}, 수평관계 ${rCreated}/${RELATIONS.length} 신규 등록`,
  )
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
