import { Era } from '@prisma/client'

import { PrismaService } from '../prisma.service'

const ACCOUNT_ID = 'bf93b960-cec2-4205-9fe1-f34616855f85'
const AUSTRIA_COUNTRY_ID = 'f130dbe9-3482-4529-a16e-180d8a4edf67'

const AT = (n: number) =>
  `at000001-0000-0000-0000-${String(n).padStart(12, '0')}`
const AUSTRIAN_EMPIRE = AT(4)
const AUSTRO_HUNGARY = AT(5)

const HABSBURG_DYNASTY = 'at000003-0000-0000-0000-000000000001'

const PID = (n: number) =>
  `at000002-0000-0000-0000-${String(n).padStart(12, '0')}`

const POS_EMPEROR = 'gov-pos-emperor'

interface Monarch {
  idx: number
  name: string
  surname: string
  regnalName: string
  birth: string
  death: string
  biography: string
  /** 오스트리아 제국 재위 */
  austrianEmpire?: { start: string; end: string; regnalNumber: number }
  /** 오스트리아-헝가리 제국 재위 */
  austroHungary?: { start: string; end: string; regnalNumber: number }
  fatherIdx?: number
}

const MONARCHS: Monarch[] = [
  {
    idx: 1,
    name: '프란츠',
    surname: '합스부르크로트링겐',
    regnalName: '프란츠',
    birth: '1768-02-12',
    death: '1835-03-02',
    biography:
      '초대 오스트리아 황제(재위 1804–1835). 신성로마제국 마지막 황제 프란츠 2세이기도 했으며, 나폴레옹 전쟁기 오스트리아 제국을 창설. 딸 마리 루이즈를 나폴레옹과 결혼시켰다가 후에 반나폴레옹 동맹의 중심이 됨.',
    austrianEmpire: { start: '1804-08-11', end: '1835-03-02', regnalNumber: 1 },
  },
  {
    idx: 2,
    name: '페르디난트',
    surname: '합스부르크로트링겐',
    regnalName: '페르디난트',
    birth: '1793-04-19',
    death: '1875-06-29',
    biography:
      '제2대 오스트리아 황제(재위 1835–1848). 지적 장애로 실권이 없었으며 1848년 혁명기에 조카 프란츠 요제프 1세에게 양위.',
    austrianEmpire: { start: '1835-03-02', end: '1848-12-02', regnalNumber: 1 },
    fatherIdx: 1,
  },
  {
    idx: 3,
    name: '프란츠 요제프',
    surname: '합스부르크로트링겐',
    regnalName: '프란츠 요제프',
    birth: '1830-08-18',
    death: '1916-11-21',
    biography:
      '오스트리아 황제이자 헝가리 왕(재위 1848–1916, 68년). 1867년 대타협으로 오스트리아-헝가리 이중제국 수립. 아내 엘리자베트(시씨) 황후 암살, 외아들 루돌프 자살, 조카 프란츠 페르디난트 대공 암살 등 비극으로 점철됨. 제1차 세계대전 중 사망.',
    austrianEmpire: { start: '1848-12-02', end: '1867-03-30', regnalNumber: 1 },
    austroHungary: { start: '1867-03-30', end: '1916-11-21', regnalNumber: 1 },
  },
  {
    idx: 4,
    name: '카를',
    surname: '합스부르크로트링겐',
    regnalName: '카를',
    birth: '1887-08-17',
    death: '1922-04-01',
    biography:
      '마지막 오스트리아 황제이자 헝가리 왕(재위 1916–1918). 제1차 세계대전 종전 시도했으나 실패, 1918년 11월 정치 참여 포기 선언 후 마데이라 섬에서 망명 중 사망. 2004년 교황 요한 바오로 2세에 의해 시복.',
    austroHungary: { start: '1916-11-21', end: '1918-11-11', regnalNumber: 1 },
  },
]

async function main() {
  const prisma = new PrismaService({ useAdapter: true })

  // 1) Dynasty
  await prisma.dynasty.upsert({
    where: { id: HABSBURG_DYNASTY },
    update: {
      name: '합스부르크-로트링겐',
      description:
        '1736년 오스트리아 대공녀 마리아 테레지아와 로렌 공작 프란츠 슈테판의 결혼으로 성립된 왕조. 합스부르크 가문의 여계 계승과 로트링겐 가문의 남계가 결합된 형태로, 1918년까지 오스트리아 황제·헝가리 왕·신성로마황제 등을 배출.',
      startDate: new Date('1736-02-12T00:00:00Z'),
    },
    create: {
      id: HABSBURG_DYNASTY,
      name: '합스부르크-로트링겐',
      description:
        '1736년 오스트리아 대공녀 마리아 테레지아와 로렌 공작 프란츠 슈테판의 결혼으로 성립된 왕조. 합스부르크 가문의 여계 계승과 로트링겐 가문의 남계가 결합된 형태로, 1918년까지 오스트리아 황제·헝가리 왕·신성로마황제 등을 배출.',
      startDate: new Date('1736-02-12T00:00:00Z'),
    },
  })
  console.log('👑 합스부르크-로트링겐 가문 등록 완료')

  // 2) Persons + SovereignReigns
  for (const m of MONARCHS) {
    const personId = PID(m.idx)
    const fatherId = m.fatherIdx ? PID(m.fatherIdx) : undefined

    await prisma.person.upsert({
      where: { id: personId },
      update: {
        name: m.name,
        surname: m.surname,
        regnalName: m.regnalName,
        birthEra: Era.AD,
        birthDate: new Date(`${m.birth}T00:00:00Z`),
        deathEra: Era.AD,
        deathDate: new Date(`${m.death}T00:00:00Z`),
        biography: m.biography,
        gender: 'male',
        nameDisplayOrder: 'western',
        countryId: AUSTRIA_COUNTRY_ID,
        dynastyId: HABSBURG_DYNASTY,
        fatherId,
        accountId: ACCOUNT_ID,
      },
      create: {
        id: personId,
        name: m.name,
        surname: m.surname,
        regnalName: m.regnalName,
        birthEra: Era.AD,
        birthDate: new Date(`${m.birth}T00:00:00Z`),
        deathEra: Era.AD,
        deathDate: new Date(`${m.death}T00:00:00Z`),
        biography: m.biography,
        gender: 'male',
        nameDisplayOrder: 'western',
        countryId: AUSTRIA_COUNTRY_ID,
        dynastyId: HABSBURG_DYNASTY,
        fatherId,
        accountId: ACCOUNT_ID,
      },
    })
    console.log(`\n  👤 ${m.regnalName} ${m.austrianEmpire?.regnalNumber ?? m.austroHungary?.regnalNumber}세`)

    if (m.austrianEmpire) {
      const exists = await prisma.sovereignReign.findFirst({
        where: {
          personId,
          historicalCountryId: AUSTRIAN_EMPIRE,
          positionDefinitionId: POS_EMPEROR,
        },
      })
      if (!exists) {
        await prisma.sovereignReign.create({
          data: {
            personId,
            historicalCountryId: AUSTRIAN_EMPIRE,
            positionDefinitionId: POS_EMPEROR,
            regnalNumber: m.austrianEmpire.regnalNumber,
            startDate: new Date(`${m.austrianEmpire.start}T00:00:00Z`),
            endDate: new Date(`${m.austrianEmpire.end}T00:00:00Z`),
            accountId: ACCOUNT_ID,
            showPositionInfo: true,
          },
        })
      }
      console.log(`     👑 오스트리아 황제 (${m.austrianEmpire.start} ~ ${m.austrianEmpire.end})`)
    }

    if (m.austroHungary) {
      const exists = await prisma.sovereignReign.findFirst({
        where: {
          personId,
          historicalCountryId: AUSTRO_HUNGARY,
          positionDefinitionId: POS_EMPEROR,
        },
      })
      if (!exists) {
        await prisma.sovereignReign.create({
          data: {
            personId,
            historicalCountryId: AUSTRO_HUNGARY,
            positionDefinitionId: POS_EMPEROR,
            regnalNumber: m.austroHungary.regnalNumber,
            startDate: new Date(`${m.austroHungary.start}T00:00:00Z`),
            endDate: new Date(`${m.austroHungary.end}T00:00:00Z`),
            accountId: ACCOUNT_ID,
            showPositionInfo: true,
          },
        })
      }
      console.log(`     👑 오스트리아-헝가리 황제 (${m.austroHungary.start} ~ ${m.austroHungary.end})`)
    }
  }

  console.log(`\n✅ 총 ${MONARCHS.length}명의 오스트리아 군주 등록 완료`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
