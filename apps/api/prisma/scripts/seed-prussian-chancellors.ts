import { Era, GovernmentPositionType } from '@prisma/client'

import { PrismaService } from '../prisma.service'

const ACCOUNT_ID = 'bf93b960-cec2-4205-9fe1-f34616855f85'
const GERMANY_COUNTRY_ID = '679fbd36-845e-44af-b909-8fba46c7ea55'
const DYNASTY_ID = 'de000003-0000-0000-0000-000000000001'

const PID = (n: number) =>
  `de000004-0000-0000-0000-${String(n).padStart(12, '0')}`
const TID = (n: number) =>
  `de000005-0000-0000-0000-${String(n).padStart(12, '0')}`
const CID = (n: number) =>
  `de000006-0000-0000-0000-${String(n).padStart(12, '0')}`

const HIST_ID = (n: number) =>
  `de000001-0000-0000-0000-${String(n).padStart(12, '0')}`
const PRUSSIA_KINGDOM = HIST_ID(3)
const GERMAN_EMPIRE = HIST_ID(6)

const POS_PM = 'gov-pos-pm' // Prussian Minister-President
const POS_CHANCELLOR = 'gov-pos-chancellor' // German Chancellor

interface PM {
  idx: number
  name: string
  surname: string
  birth: string | null
  death: string | null
  biography: string
  /** 프로이센 총리 재임 */
  prussia: Array<{ start: string; end: string; termNumber: number }>
  /** 독일 제국 총리 (겸임이면 재임) */
  empire?: Array<{ start: string; end: string; termNumber: number }>
  /** 호엔촐레른 왕족이면 true */
  isHohenzollern?: boolean
}

const PMS: PM[] = [
  {
    idx: 1,
    name: '아돌프 하인리히',
    surname: '아르님보이첸부르크',
    birth: '1803-04-10',
    death: '1868-01-08',
    biography: '프로이센 최초의 입헌기 총리(1848년 3월). 단 9일 재임.',
    prussia: [{ start: '1848-03-19', end: '1848-03-28', termNumber: 1 }],
  },
  {
    idx: 2,
    name: '고트프리트 루돌프',
    surname: '캄프하우젠',
    birth: '1803-01-10',
    death: '1890-12-03',
    biography: '자유주의자 은행가 출신 총리(1848.3–6).',
    prussia: [{ start: '1848-03-29', end: '1848-06-20', termNumber: 2 }],
  },
  {
    idx: 3,
    name: '루돌프',
    surname: '아우어스발트',
    birth: '1795-09-01',
    death: '1866-01-15',
    biography: '프로이센 자유주의 총리(1848.6–9).',
    prussia: [{ start: '1848-06-25', end: '1848-09-21', termNumber: 3 }],
  },
  {
    idx: 4,
    name: '에른스트',
    surname: '푸엘',
    birth: '1779-11-03',
    death: '1866-12-03',
    biography: '군인 출신 총리(1848.9–11), 베를린 점령 해제에 반대.',
    prussia: [{ start: '1848-09-21', end: '1848-11-02', termNumber: 4 }],
  },
  {
    idx: 5,
    name: '프리드리히 빌헬름',
    surname: '브란덴부르크',
    birth: '1792-01-24',
    death: '1850-11-06',
    biography: '호엔촐레른 방계. 반혁명 총리로 의회를 해산하고 흠정헌법 제정.',
    prussia: [{ start: '1848-11-02', end: '1850-11-06', termNumber: 5 }],
    isHohenzollern: true,
  },
  {
    idx: 6,
    name: '오토 테오도어',
    surname: '만토이펠',
    birth: '1805-02-03',
    death: '1882-11-26',
    biography:
      '보수주의 총리(1850–1858). 올뮈츠 굴욕 체결 및 크림 전쟁기 중립 유지.',
    prussia: [{ start: '1850-11-06', end: '1858-11-06', termNumber: 6 }],
  },
  {
    idx: 7,
    name: '카를 안톤',
    surname: '호엔촐레른지크마링겐',
    birth: '1811-09-07',
    death: '1885-06-02',
    biography:
      '호엔촐레른-지크마링겐 분가 군주 출신. 빌헬름 1세 섭정기의 신시대(Neue Ära) 총리.',
    prussia: [{ start: '1858-11-06', end: '1862-03-18', termNumber: 7 }],
    isHohenzollern: true,
  },
  {
    idx: 8,
    name: '아돌프',
    surname: '호엔로헤잉겔핑겐',
    birth: '1797-01-29',
    death: '1873-04-24',
    biography: '호헨로에-잉겔핑겐 가문. 군 개혁 갈등기 총리(1862.3–9).',
    prussia: [{ start: '1862-03-18', end: '1862-09-23', termNumber: 8 }],
  },
  {
    idx: 9,
    name: '오토',
    surname: '비스마르크',
    birth: '1815-04-01',
    death: '1898-07-30',
    biography:
      '철혈 재상. 세 차례 전쟁을 통해 독일 통일을 이끌고 독일 제국의 초대 재상(1871–1890) 역임. 사회보험 제도 도입 등 근대 국가 체제 확립.',
    prussia: [
      { start: '1862-09-23', end: '1872-12-31', termNumber: 9 },
      { start: '1873-11-09', end: '1890-03-20', termNumber: 11 },
    ],
    empire: [{ start: '1871-03-21', end: '1890-03-20', termNumber: 1 }],
  },
  {
    idx: 10,
    name: '알브레히트',
    surname: '론',
    birth: '1803-04-30',
    death: '1879-02-23',
    biography:
      '프로이센 군 개혁의 설계자. 비스마르크의 자리를 잠시 대신한 총리(1873).',
    prussia: [{ start: '1873-01-01', end: '1873-11-09', termNumber: 10 }],
  },
  {
    idx: 11,
    name: '레오',
    surname: '카프리비',
    birth: '1831-02-24',
    death: '1899-02-06',
    biography:
      '비스마르크 후임 제국 재상 겸 프로이센 총리. 관세·무역 정책 완화, 러시아 재보험 조약 미갱신.',
    prussia: [{ start: '1890-03-20', end: '1892-03-22', termNumber: 12 }],
    empire: [{ start: '1890-03-20', end: '1894-10-29', termNumber: 2 }],
  },
  {
    idx: 12,
    name: '보토',
    surname: '에울렌부르크',
    birth: '1831-07-31',
    death: '1912-11-05',
    biography: '프로이센 총리(1892–1894). 카프리비와 이원 체제로 통치.',
    prussia: [{ start: '1892-03-23', end: '1894-10-29', termNumber: 13 }],
  },
  {
    idx: 13,
    name: '클로트비히',
    surname: '호엔로헤실링스퓌르스트',
    birth: '1819-03-31',
    death: '1901-07-06',
    biography:
      '제국 재상 및 프로이센 총리(1894–1900). 카이저 빌헬름 2세와 빈번한 의견 충돌.',
    prussia: [{ start: '1894-10-29', end: '1900-10-17', termNumber: 14 }],
    empire: [{ start: '1894-10-29', end: '1900-10-17', termNumber: 3 }],
  },
  {
    idx: 14,
    name: '베른하르트',
    surname: '뷜로',
    birth: '1849-05-03',
    death: '1929-10-28',
    biography:
      '제국 재상 겸 프로이센 총리(1900–1909). 적극적 세계정책(Weltpolitik) 추진.',
    prussia: [{ start: '1900-10-17', end: '1909-07-14', termNumber: 15 }],
    empire: [{ start: '1900-10-17', end: '1909-07-14', termNumber: 4 }],
  },
  {
    idx: 15,
    name: '테오발트',
    surname: '베트만홀베크',
    birth: '1856-11-29',
    death: '1921-01-01',
    biography:
      '제1차 세계대전 발발 당시 제국 재상(1909–1917). 전쟁 책임 논쟁의 중심 인물.',
    prussia: [{ start: '1909-07-14', end: '1917-07-13', termNumber: 16 }],
    empire: [{ start: '1909-07-14', end: '1917-07-13', termNumber: 5 }],
  },
  {
    idx: 16,
    name: '게오르크',
    surname: '미하엘리스',
    birth: '1857-09-08',
    death: '1936-07-24',
    biography: '제국 재상 및 프로이센 총리(1917.7–10). 단 3개월 재임.',
    prussia: [{ start: '1917-07-14', end: '1917-10-31', termNumber: 17 }],
    empire: [{ start: '1917-07-14', end: '1917-10-31', termNumber: 6 }],
  },
  {
    idx: 17,
    name: '게오르크',
    surname: '헤르틀링',
    birth: '1843-08-31',
    death: '1919-01-04',
    biography: '가톨릭 중앙당 출신 제국 재상(1917–1918).',
    prussia: [{ start: '1917-11-01', end: '1918-09-30', termNumber: 18 }],
    empire: [{ start: '1917-11-01', end: '1918-09-30', termNumber: 7 }],
  },
  {
    idx: 18,
    name: '막시밀리안',
    surname: '바덴',
    birth: '1867-07-10',
    death: '1929-11-06',
    biography:
      '독일 제국 마지막 재상. 1918년 10월 개헌으로 의원내각제 전환, 11월 혁명 중 빌헬름 2세의 퇴위를 선언.',
    prussia: [{ start: '1918-10-03', end: '1918-11-09', termNumber: 19 }],
    empire: [{ start: '1918-10-03', end: '1918-11-09', termNumber: 8 }],
  },
]

async function main() {
  const prisma = new PrismaService({ useAdapter: true })
  let tenureSeq = 0
  let cabinetSeq = 0

  for (const pm of PMS) {
    const personId = PID(pm.idx)

    // 1) Person
    await prisma.person.upsert({
      where: { id: personId },
      update: {
        name: pm.name,
        surname: pm.surname,
        birthEra: pm.birth ? Era.AD : undefined,
        birthDate: pm.birth ? new Date(`${pm.birth}T00:00:00Z`) : null,
        deathEra: pm.death ? Era.AD : undefined,
        deathDate: pm.death ? new Date(`${pm.death}T00:00:00Z`) : null,
        biography: pm.biography,
        gender: 'male',
        nameDisplayOrder: 'western',
        countryId: GERMANY_COUNTRY_ID,
        dynastyId: pm.isHohenzollern ? DYNASTY_ID : null,
        accountId: ACCOUNT_ID,
      },
      create: {
        id: personId,
        name: pm.name,
        surname: pm.surname,
        birthEra: pm.birth ? Era.AD : undefined,
        birthDate: pm.birth ? new Date(`${pm.birth}T00:00:00Z`) : null,
        deathEra: pm.death ? Era.AD : undefined,
        deathDate: pm.death ? new Date(`${pm.death}T00:00:00Z`) : null,
        biography: pm.biography,
        gender: 'male',
        nameDisplayOrder: 'western',
        countryId: GERMANY_COUNTRY_ID,
        dynastyId: pm.isHohenzollern ? DYNASTY_ID : null,
        accountId: ACCOUNT_ID,
      },
    })
    console.log(`\n  👤 ${pm.idx}. ${pm.name} ${pm.surname}`)

    // 2) Prussian M-P tenures
    for (const t of pm.prussia) {
      tenureSeq += 1
      const tenureId = TID(tenureSeq)
      // skip if exists (idempotent by person+start)
      const existing = await prisma.governmentPositionTenure.findFirst({
        where: {
          personId,
          historicalCountryId: PRUSSIA_KINGDOM,
          positionDefinitionId: POS_PM,
          startDate: new Date(`${t.start}T00:00:00Z`),
        },
      })
      let finalTenureId = existing?.id ?? tenureId
      if (!existing) {
        await prisma.governmentPositionTenure.create({
          data: {
            id: tenureId,
            personId,
            positionDefinitionId: POS_PM,
            historicalCountryId: PRUSSIA_KINGDOM,
            termNumber: t.termNumber,
            startDate: new Date(`${t.start}T00:00:00Z`),
            endDate: new Date(`${t.end}T00:00:00Z`),
            positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT, showPositionInfo: true,
            accountId: ACCOUNT_ID,
          },
        })
      }
      // Cabinet (for each tenure)
      const existingCabinet = await prisma.cabinet.findFirst({
        where: { headTenureId: finalTenureId },
      })
      if (!existingCabinet) {
        cabinetSeq += 1
        await prisma.cabinet.create({
          data: {
            id: CID(cabinetSeq),
            headTenureId: finalTenureId,
            name: `${pm.surname} 프로이센 내각 ${t.termNumber}기`,
            accountId: ACCOUNT_ID,
          },
        })
      }
      console.log(
        `     🏛️  프로이센 총리 ${t.termNumber}대 (${t.start} ~ ${t.end})`,
      )
    }

    // 3) German Empire Chancellor tenures
    if (pm.empire) {
      for (const t of pm.empire) {
        tenureSeq += 1
        const tenureId = TID(tenureSeq)
        const existing = await prisma.governmentPositionTenure.findFirst({
          where: {
            personId,
            historicalCountryId: GERMAN_EMPIRE,
            positionDefinitionId: POS_CHANCELLOR,
            startDate: new Date(`${t.start}T00:00:00Z`),
          },
        })
        let finalTenureId = existing?.id ?? tenureId
        if (!existing) {
          await prisma.governmentPositionTenure.create({
            data: {
              id: tenureId,
              personId,
              positionDefinitionId: POS_CHANCELLOR,
              historicalCountryId: GERMAN_EMPIRE,
              termNumber: t.termNumber,
              startDate: new Date(`${t.start}T00:00:00Z`),
              endDate: new Date(`${t.end}T00:00:00Z`),
              positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT, showPositionInfo: true,
              accountId: ACCOUNT_ID,
            },
          })
        }
        const existingCabinet = await prisma.cabinet.findFirst({
          where: { headTenureId: finalTenureId },
        })
        if (!existingCabinet) {
          cabinetSeq += 1
          await prisma.cabinet.create({
            data: {
              id: CID(cabinetSeq),
              headTenureId: finalTenureId,
              name: `${pm.surname} 독일 제국 내각 ${t.termNumber}기`,
              accountId: ACCOUNT_ID,
            },
          })
        }
        console.log(
          `     👑 독일 제국 재상 ${t.termNumber}대 (${t.start} ~ ${t.end})`,
        )
      }
    }
  }

  console.log(`\n✅ 총 ${PMS.length}명의 행정부 수반 등록 완료`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
