import { Era } from '@prisma/client'

import { PrismaService } from '../prisma.service'

const ACCOUNT_ID = 'bf93b960-cec2-4205-9fe1-f34616855f85'
const GERMANY_COUNTRY_ID = '679fbd36-845e-44af-b909-8fba46c7ea55'

const HIST_ID = (n: number) =>
  `de000001-0000-0000-0000-${String(n).padStart(12, '0')}`
const PRUSSIA_KINGDOM = HIST_ID(3)
const GERMAN_EMPIRE = HIST_ID(6)

const PERSON_ID = (slug: string) =>
  `de000002-0000-0000-0000-${slug.padEnd(12, '0')}`.slice(0, 36)

const POS_KING_ID = 'gov-pos-king'
const POS_EMPEROR_ID = 'gov-pos-emperor'

interface Monarch {
  personId: string
  name: string
  surname: string
  regnalName: string
  birth: { era: Era; year: number; month: number; day: number }
  death: { era: Era; year: number; month: number; day: number }
  biography: string
  /** 프로이센 국왕 재위 */
  prussiaReign: { start: string; end: string; regnalNumber: number }
  /** 독일 황제 재위 (옵션) */
  germanEmpireReign?: { start: string; end: string; regnalNumber: number }
}

const MONARCHS: Monarch[] = [
  {
    personId: PERSON_ID('fw4prussia'),
    name: '프리드리히',
    surname: '호엔촐레른',
    regnalName: '프리드리히 빌헬름 4세',
    birth: { era: Era.AD, year: 1795, month: 10, day: 15 },
    death: { era: Era.AD, year: 1861, month: 1, day: 2 },
    biography:
      '프로이센 국왕(재위 1840–1861). 1848년 혁명기 독일 통일 제안(프랑크푸르트 국민의회)을 거부하며 "거리에서 주운 왕관"이라 일컬었다. 뇌졸중 후 동생 빌헬름이 섭정.',
    prussiaReign: { start: '1840-06-07', end: '1861-01-02', regnalNumber: 4 },
  },
  {
    personId: PERSON_ID('w1prussia'),
    name: '빌헬름',
    surname: '호엔촐레른',
    regnalName: '빌헬름 1세',
    birth: { era: Era.AD, year: 1797, month: 3, day: 22 },
    death: { era: Era.AD, year: 1888, month: 3, day: 9 },
    biography:
      '프로이센 국왕(1861–1888) 및 초대 독일 황제(1871–1888). 비스마르크를 재상으로 삼아 독일 통일을 이룩했다.',
    prussiaReign: { start: '1861-01-02', end: '1888-03-09', regnalNumber: 1 },
    germanEmpireReign: {
      start: '1871-01-18',
      end: '1888-03-09',
      regnalNumber: 1,
    },
  },
  {
    personId: PERSON_ID('f3prussia'),
    name: '프리드리히',
    surname: '호엔촐레른',
    regnalName: '프리드리히 3세',
    birth: { era: Era.AD, year: 1831, month: 10, day: 18 },
    death: { era: Era.AD, year: 1888, month: 6, day: 15 },
    biography:
      '프로이센 국왕 및 독일 황제(1888년 3월 9일–6월 15일, 재위 99일). 자유주의 성향이었으나 후두암으로 단명. "99일 황제"로 불림.',
    prussiaReign: { start: '1888-03-09', end: '1888-06-15', regnalNumber: 3 },
    germanEmpireReign: {
      start: '1888-03-09',
      end: '1888-06-15',
      regnalNumber: 2,
    },
  },
  {
    personId: PERSON_ID('w2prussia'),
    name: '빌헬름',
    surname: '호엔촐레른',
    regnalName: '빌헬름 2세',
    birth: { era: Era.AD, year: 1859, month: 1, day: 27 },
    death: { era: Era.AD, year: 1941, month: 6, day: 4 },
    biography:
      '프로이센 국왕 및 독일 황제(1888–1918). 비스마르크를 해임하고 세계 정책을 추진, 제1차 세계대전을 주도했으며 패전 후 네덜란드로 망명하여 그곳에서 사망.',
    prussiaReign: { start: '1888-06-15', end: '1918-11-09', regnalNumber: 2 },
    germanEmpireReign: {
      start: '1888-06-15',
      end: '1918-11-09',
      regnalNumber: 3,
    },
  },
]

async function main() {
  const prisma = new PrismaService({ useAdapter: true })

  for (const m of MONARCHS) {
    // 1) Person upsert
    await prisma.person.upsert({
      where: { id: m.personId },
      update: {
        name: m.name,
        surname: m.surname,
        regnalName: m.regnalName,
        birthEra: m.birth.era,
        birthDate: new Date(
          `${String(m.birth.year).padStart(4, '0')}-${String(m.birth.month).padStart(2, '0')}-${String(m.birth.day).padStart(2, '0')}T00:00:00Z`,
        ),
        deathEra: m.death.era,
        deathDate: new Date(
          `${String(m.death.year).padStart(4, '0')}-${String(m.death.month).padStart(2, '0')}-${String(m.death.day).padStart(2, '0')}T00:00:00Z`,
        ),
        biography: m.biography,
        gender: 'male',
        nameDisplayOrder: 'western',
        countryId: GERMANY_COUNTRY_ID,
        accountId: ACCOUNT_ID,
      },
      create: {
        id: m.personId,
        name: m.name,
        surname: m.surname,
        regnalName: m.regnalName,
        birthEra: m.birth.era,
        birthDate: new Date(
          `${String(m.birth.year).padStart(4, '0')}-${String(m.birth.month).padStart(2, '0')}-${String(m.birth.day).padStart(2, '0')}T00:00:00Z`,
        ),
        deathEra: m.death.era,
        deathDate: new Date(
          `${String(m.death.year).padStart(4, '0')}-${String(m.death.month).padStart(2, '0')}-${String(m.death.day).padStart(2, '0')}T00:00:00Z`,
        ),
        biography: m.biography,
        gender: 'male',
        nameDisplayOrder: 'western',
        countryId: GERMANY_COUNTRY_ID,
        accountId: ACCOUNT_ID,
      },
    })
    console.log(`  👤 Person: ${m.regnalName}`)

    // 2) SovereignReign - 프로이센 국왕
    const existingPrussia = await prisma.sovereignReign.findFirst({
      where: {
        personId: m.personId,
        historicalCountryId: PRUSSIA_KINGDOM,
        positionDefinitionId: POS_KING_ID,
      },
    })
    if (!existingPrussia) {
      await prisma.sovereignReign.create({
        data: {
          personId: m.personId,
          historicalCountryId: PRUSSIA_KINGDOM,
          positionDefinitionId: POS_KING_ID,
          regnalNumber: m.prussiaReign.regnalNumber,
          startDate: new Date(`${m.prussiaReign.start}T00:00:00Z`),
          endDate: new Date(`${m.prussiaReign.end}T00:00:00Z`),
          accountId: ACCOUNT_ID,
          showPositionInfo: true,
        },
      })
      console.log(`     🜨 프로이센 국왕 재위 등록`)
    } else {
      console.log(`     ⏭️  프로이센 국왕 재위 (이미 존재)`)
    }

    // 3) SovereignReign - 독일 황제 (옵션)
    if (m.germanEmpireReign) {
      const existingEmpire = await prisma.sovereignReign.findFirst({
        where: {
          personId: m.personId,
          historicalCountryId: GERMAN_EMPIRE,
          positionDefinitionId: POS_EMPEROR_ID,
        },
      })
      if (!existingEmpire) {
        await prisma.sovereignReign.create({
          data: {
            personId: m.personId,
            historicalCountryId: GERMAN_EMPIRE,
            positionDefinitionId: POS_EMPEROR_ID,
            regnalNumber: m.germanEmpireReign.regnalNumber,
            startDate: new Date(`${m.germanEmpireReign.start}T00:00:00Z`),
            endDate: new Date(`${m.germanEmpireReign.end}T00:00:00Z`),
            accountId: ACCOUNT_ID,
            showPositionInfo: true,
          },
        })
        console.log(`     👑 독일 황제 재위 등록`)
      } else {
        console.log(`     ⏭️  독일 황제 재위 (이미 존재)`)
      }
    }
  }

  console.log(`\n총 ${MONARCHS.length}명의 군주 등록 완료`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
