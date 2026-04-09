import {
  Era,
  HistoricalMembershipRole,
  HistoricalRelationType,
  HistoricalStateType,
  TransitionEventType,
  TransitionScope,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

const ACCOUNT_ID = 'bf93b960-cec2-4205-9fe1-f34616855f85'
const AUSTRIA_ID = 'f130dbe9-3482-4529-a16e-180d8a4edf67'
const GERMANY_ID = '679fbd36-845e-44af-b909-8fba46c7ea55'
const HUNGARY_ID_ISO = 'HU' // 헝가리는 ISO로 조회

// 기존 독일 역사국가 IDs (관계용)
const DE = (n: number) =>
  `de000001-0000-0000-0000-${String(n).padStart(12, '0')}`
const HRE = DE(2)
const GERMAN_CONFED = DE(4)
const NAZI = DE(8)
const GERMAN_EMPIRE = DE(6)

// 오스트리아 역사국가 IDs
const AT = (n: number) =>
  `at000001-0000-0000-0000-${String(n).padStart(12, '0')}`
const MARCH_AUSTRIA = AT(1) // 오스트리아 변경백국
const DUCHY_AUSTRIA = AT(2) // 오스트리아 공국
const ARCH_AUSTRIA = AT(3) // 오스트리아 대공국
const AUSTRIAN_EMPIRE = AT(4) // 오스트리아 제국
const AUSTRO_HUNGARY = AT(5) // 오스트리아-헝가리
const GERMAN_AUSTRIA = AT(6) // 독일-오스트리아 공화국
const FIRST_REPUBLIC = AT(7) // 오스트리아 제1공화국
const FEDERAL_STATE = AT(8) // 연방국 오스트리아 (오스트로파시즘)
const OSTMARK = AT(9) // 안슐루스 (오스트마르크)
const ALLIED_AT = AT(10) // 연합군 점령 오스트리아

interface H {
  id: string
  name: string
  enName: string
  description: string
  startYear: number
  startMonth?: number
  startDay?: number
  endYear: number
  endMonth?: number
  endDay?: number
  stateType: HistoricalStateType
}

const HISTORIES: H[] = [
  {
    id: MARCH_AUSTRIA,
    name: '오스트리아 변경백국',
    enName: 'Margraviate of Austria',
    description:
      '오토 대제가 976년 바벤베르크 가문에 수여한 동방 변경백령. 오스트리아("Ostarrîchi", 996)라는 이름의 기원.',
    startYear: 976,
    endYear: 1156,
    stateType: HistoricalStateType.MARGRAVIATE,
  },
  {
    id: DUCHY_AUSTRIA,
    name: '오스트리아 공국',
    enName: 'Duchy of Austria',
    description:
      '1156년 「소특권」(Privilegium Minus)로 변경백국이 공국으로 승격. 바벤베르크 가문 단절 후 합스부르크 가문이 상속.',
    startYear: 1156,
    endYear: 1453,
    stateType: HistoricalStateType.PRINCIPALITY,
  },
  {
    id: ARCH_AUSTRIA,
    name: '오스트리아 대공국',
    enName: 'Archduchy of Austria',
    description:
      '1453년 황제 프리드리히 3세가 대특권(Privilegium Maius)을 인정하면서 공국을 대공국으로 승격. 합스부르크 가문의 본령으로 신성로마제국의 중심.',
    startYear: 1453,
    endYear: 1804,
    stateType: HistoricalStateType.PRINCIPALITY,
  },
  {
    id: AUSTRIAN_EMPIRE,
    name: '오스트리아 제국',
    enName: 'Austrian Empire',
    description:
      '1804년 프란츠 2세가 나폴레옹의 제국 선포에 대응해 선포한 세습 제국. 1867년 대타협으로 오스트리아-헝가리로 개편.',
    startYear: 1804,
    startMonth: 8,
    startDay: 11,
    endYear: 1867,
    endMonth: 3,
    endDay: 30,
    stateType: HistoricalStateType.EMPIRE,
  },
  {
    id: AUSTRO_HUNGARY,
    name: '오스트리아-헝가리 제국',
    enName: 'Austria-Hungary',
    description:
      '1867년 대타협(Ausgleich)으로 성립된 이중 군주국. 오스트리아 황제가 헝가리 왕을 겸임. 제1차 세계대전 패전 후 1918년 해체.',
    startYear: 1867,
    startMonth: 3,
    startDay: 30,
    endYear: 1918,
    endMonth: 11,
    endDay: 11,
    stateType: HistoricalStateType.EMPIRE,
  },
  {
    id: GERMAN_AUSTRIA,
    name: '독일-오스트리아 공화국',
    enName: 'Republic of German-Austria',
    description:
      '오스트리아-헝가리 해체 후 독일어권 영토에서 1918년 선포된 공화국. 독일과의 합병을 추구했으나 생제르맹 조약으로 금지됨.',
    startYear: 1918,
    startMonth: 11,
    startDay: 12,
    endYear: 1919,
    endMonth: 9,
    endDay: 10,
    stateType: HistoricalStateType.REPUBLIC,
  },
  {
    id: FIRST_REPUBLIC,
    name: '오스트리아 제1공화국',
    enName: 'First Austrian Republic',
    description:
      '생제르맹 조약(1919) 이후 공식 수립. 1934년 2월 내전과 5월 헌법 개정으로 종식.',
    startYear: 1919,
    startMonth: 9,
    startDay: 10,
    endYear: 1934,
    endMonth: 5,
    endDay: 1,
    stateType: HistoricalStateType.REPUBLIC,
  },
  {
    id: FEDERAL_STATE,
    name: '연방국 오스트리아',
    enName: 'Federal State of Austria',
    description:
      '돌푸스·슈슈니크의 오스트로파시즘 권위주의 체제(1934–1938). 1938년 안슐루스로 독일에 병합되며 종결.',
    startYear: 1934,
    startMonth: 5,
    startDay: 1,
    endYear: 1938,
    endMonth: 3,
    endDay: 13,
    stateType: HistoricalStateType.REPUBLIC,
  },
  {
    id: OSTMARK,
    name: '오스트마르크 (안슐루스)',
    enName: 'Ostmark (Anschluss Austria)',
    description:
      '1938년 안슐루스로 나치 독일에 병합된 오스트리아 지역. 1942년부터 "도나우·알프스 대관구"로 재편. 1945년 해방.',
    startYear: 1938,
    startMonth: 3,
    startDay: 13,
    endYear: 1945,
    endMonth: 4,
    endDay: 27,
    stateType: HistoricalStateType.PRINCIPALITY,
  },
  {
    id: ALLIED_AT,
    name: '연합군 점령 오스트리아',
    enName: 'Allied-occupied Austria',
    description:
      '1945–1955년 미·영·프·소 4국이 분할 점령한 과도기 오스트리아. 1955년 국가조약으로 독립 회복.',
    startYear: 1945,
    startMonth: 4,
    startDay: 27,
    endYear: 1955,
    endMonth: 5,
    endDay: 15,
    stateType: HistoricalStateType.FEDERATION,
  },
]

async function main() {
  const prisma = new PrismaService({ useAdapter: true })

  // 1) Historical countries upsert
  console.log('🏛️ 오스트리아 역사국가 등록...')
  for (const h of HISTORIES) {
    await prisma.historicalCountry.upsert({
      where: { id: h.id },
      update: {
        name: h.name,
        enName: h.enName,
        description: h.description,
        startEra: Era.AD,
        startYear: h.startYear,
        startMonth: h.startMonth ?? null,
        startDay: h.startDay ?? null,
        endEra: Era.AD,
        endYear: h.endYear,
        endMonth: h.endMonth ?? null,
        endDay: h.endDay ?? null,
        stateType: h.stateType,
        accountId: ACCOUNT_ID,
      },
      create: {
        id: h.id,
        name: h.name,
        enName: h.enName,
        description: h.description,
        startEra: Era.AD,
        startYear: h.startYear,
        startMonth: h.startMonth ?? null,
        startDay: h.startDay ?? null,
        endEra: Era.AD,
        endYear: h.endYear,
        endMonth: h.endMonth ?? null,
        endDay: h.endDay ?? null,
        stateType: h.stateType,
        accountId: ACCOUNT_ID,
      },
    })
    console.log(`  ✅ ${h.name}`)
  }

  // 2) 현대 오스트리아와 연결
  console.log('\n🔗 현대 오스트리아 연결...')
  let linked = 0
  for (const h of HISTORIES) {
    const existing = await prisma.historicalCountryModernCountry.findFirst({
      where: { historicalCountryId: h.id, modernCountryId: AUSTRIA_ID },
    })
    if (!existing) {
      await prisma.historicalCountryModernCountry.create({
        data: { historicalCountryId: h.id, modernCountryId: AUSTRIA_ID },
      })
      linked += 1
    }
  }
  console.log(`  ✅ 신규 ${linked}건`)

  // 오스트리아-헝가리는 헝가리와도 연결
  const hungary = await prisma.country.findUnique({
    where: { isoCode: HUNGARY_ID_ISO },
    select: { id: true },
  })
  if (hungary) {
    const existing = await prisma.historicalCountryModernCountry.findFirst({
      where: { historicalCountryId: AUSTRO_HUNGARY, modernCountryId: hungary.id },
    })
    if (!existing) {
      await prisma.historicalCountryModernCountry.create({
        data: { historicalCountryId: AUSTRO_HUNGARY, modernCountryId: hungary.id },
      })
      console.log('  ✅ 오스트리아-헝가리 → 현대 헝가리 연결')
    }
  }

  // 3) 계승/변천 관계
  console.log('\n🔄 계승·변천 관계 등록...')
  const TRANSITIONS: Array<
    [string, string, TransitionEventType, TransitionScope]
  > = [
    [MARCH_AUSTRIA, DUCHY_AUSTRIA, TransitionEventType.SUCCESSION, TransitionScope.STATE_SUCCESSION],
    [DUCHY_AUSTRIA, ARCH_AUSTRIA, TransitionEventType.SUCCESSION, TransitionScope.STATE_SUCCESSION],
    [ARCH_AUSTRIA, AUSTRIAN_EMPIRE, TransitionEventType.SUCCESSION, TransitionScope.STATE_SUCCESSION],
    [AUSTRIAN_EMPIRE, AUSTRO_HUNGARY, TransitionEventType.SUCCESSION, TransitionScope.STATE_SUCCESSION],
    [AUSTRO_HUNGARY, GERMAN_AUSTRIA, TransitionEventType.SUCCESSION, TransitionScope.STATE_SUCCESSION],
    [GERMAN_AUSTRIA, FIRST_REPUBLIC, TransitionEventType.SUCCESSION, TransitionScope.STATE_SUCCESSION],
    [FIRST_REPUBLIC, FEDERAL_STATE, TransitionEventType.SUCCESSION, TransitionScope.REGIME_CHANGE],
    [FEDERAL_STATE, OSTMARK, TransitionEventType.UNION, TransitionScope.STATE_SUCCESSION],
    [OSTMARK, ALLIED_AT, TransitionEventType.DISSOLVED, TransitionScope.STATE_SUCCESSION],
  ]
  let tCreated = 0
  for (const [pred, succ, ev, sc] of TRANSITIONS) {
    const existing = await prisma.historicalCountryTransition.findFirst({
      where: { predecessorId: pred, successorId: succ, eventType: ev },
    })
    if (!existing) {
      await prisma.historicalCountryTransition.create({
        data: { predecessorId: pred, successorId: succ, eventType: ev, transitionScope: sc },
      })
      tCreated += 1
    }
  }
  console.log(`  ✅ 신규 ${tCreated}/${TRANSITIONS.length}건`)

  // 4) 소속 관계 (HRE 내 오스트리아, 안슐루스는 나치 독일 소속)
  console.log('\n📎 소속 관계 등록...')
  const MEMBERSHIPS: Array<
    [string, string, HistoricalMembershipRole, boolean]
  > = [
    [HRE, MARCH_AUSTRIA, HistoricalMembershipRole.CONFEDERATION_MEMBER, false],
    [HRE, DUCHY_AUSTRIA, HistoricalMembershipRole.CONFEDERATION_MEMBER, false],
    [HRE, ARCH_AUSTRIA, HistoricalMembershipRole.CONFEDERATION_MEMBER, true],
    [GERMAN_CONFED, AUSTRIAN_EMPIRE, HistoricalMembershipRole.CONFEDERATION_MEMBER, true],
    [NAZI, OSTMARK, HistoricalMembershipRole.COLONY, false],
  ]
  let mCreated = 0
  for (const [parent, member, role, lead] of MEMBERSHIPS) {
    const existing = await prisma.historicalCountryMembership.findFirst({
      where: { historicalCountryId: parent, memberCountryId: member, role },
    })
    if (!existing) {
      await prisma.historicalCountryMembership.create({
        data: {
          historicalCountryId: parent,
          memberCountryId: member,
          role,
          isLeadingMember: lead,
        },
      })
      mCreated += 1
    }
  }
  console.log(`  ✅ 신규 ${mCreated}/${MEMBERSHIPS.length}건`)

  // 5) 수평 관계 (7주 전쟁·독일 통일 전쟁 등)
  console.log('\n🔗 수평 관계 등록...')
  const RELATIONS: Array<[string, string, HistoricalRelationType]> = [
    // 오스트리아 제국 vs 프로이센 왕국 (독일 연방 내 주도권 경쟁, 1866 전쟁)
    [AUSTRIAN_EMPIRE, DE(3), HistoricalRelationType.WAR],
    // 오스트리아-헝가리 vs 독일 제국 (동맹, 3국 동맹)
    [AUSTRO_HUNGARY, GERMAN_EMPIRE, HistoricalRelationType.ALLIANCE],
  ]
  let rCreated = 0
  for (const [subj, obj, rel] of RELATIONS) {
    const existing = await prisma.historicalCountryRelation.findFirst({
      where: { subjectCountryId: subj, objectCountryId: obj, relationType: rel },
    })
    if (!existing) {
      await prisma.historicalCountryRelation.create({
        data: { subjectCountryId: subj, objectCountryId: obj, relationType: rel },
      })
      rCreated += 1
    }
  }
  console.log(`  ✅ 신규 ${rCreated}/${RELATIONS.length}건`)

  console.log(
    `\n✅ 오스트리아 역사국가 ${HISTORIES.length}개 등록, 변천 ${tCreated}, 소속 ${mCreated}, 관계 ${rCreated}, 현대국 연결 ${linked}건`,
  )
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
