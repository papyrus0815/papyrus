import { Era } from '@prisma/client'

import { PrismaService } from '../prisma.service'

const ACCOUNT_ID = 'bf93b960-cec2-4205-9fe1-f34616855f85'
const GERMANY_COUNTRY_ID = '679fbd36-845e-44af-b909-8fba46c7ea55'
const DYNASTY_ID = 'de000003-0000-0000-0000-000000000001' // 호엔촐레른

const PID = (slug: string) =>
  `de000002-0000-0000-0000-${slug.padEnd(12, '0')}`.slice(0, 36)

const HUSBANDS = {
  FW3: PID('fw3prussia'),
  FW4: PID('fw4prussia'),
  W1: PID('w1prussia'),
  F3: PID('f3prussia'),
  W2: PID('w2prussia'),
}

interface Wife {
  id: string
  name: string
  surname: string
  regnalName: string
  birth: string // YYYY-MM-DD
  death: string
  biography: string
  husbandId: string
  marriage: string
  marriageEnd?: string
  /** 남편 가문으로 귀속시킬지 (여왕은 기본 true) */
  joinDynasty?: boolean
}

const WIVES: Wife[] = [
  {
    id: PID('fw3wife1'),
    name: '루이제',
    surname: '메클렌부르크슈트렐리츠',
    regnalName: '루이제 왕비',
    birth: '1776-03-10',
    death: '1810-07-19',
    biography:
      '프리드리히 빌헬름 3세의 왕비. 나폴레옹 전쟁기 프로이센의 상징적 존재로 활약. 젊은 나이에 병사하여 국민적 애도.',
    husbandId: HUSBANDS.FW3,
    marriage: '1793-12-24',
    marriageEnd: '1810-07-19',
  },
  {
    id: PID('fw4wife1'),
    name: '엘리자베트',
    surname: '바이에른',
    regnalName: '엘리자베트 루도비카 왕비',
    birth: '1801-11-13',
    death: '1873-12-14',
    biography:
      '프리드리히 빌헬름 4세의 왕비. 바이에른 국왕 막시밀리안 1세의 딸. 자녀 없음.',
    husbandId: HUSBANDS.FW4,
    marriage: '1823-11-29',
    marriageEnd: '1861-01-02',
  },
  {
    id: PID('w1wife1'),
    name: '아우구스타',
    surname: '작센바이마르아이제나흐',
    regnalName: '아우구스타 황후',
    birth: '1811-09-30',
    death: '1890-01-07',
    biography:
      '빌헬름 1세의 왕비이자 초대 독일 황후. 자유주의적 성향으로 비스마르크와 자주 대립. 프리드리히 3세의 어머니.',
    husbandId: HUSBANDS.W1,
    marriage: '1829-06-11',
    marriageEnd: '1888-03-09',
  },
  {
    id: PID('f3wife1'),
    name: '빅토리아',
    surname: '색스코버그고타',
    regnalName: '빅토리아 황후',
    birth: '1840-11-21',
    death: '1901-08-05',
    biography:
      '영국 빅토리아 여왕의 장녀. 프리드리히 3세의 황후로 자유주의·입헌주의 개혁을 지지했으나 남편의 단명으로 뜻을 이루지 못함. 빌헬름 2세의 어머니.',
    husbandId: HUSBANDS.F3,
    marriage: '1858-01-25',
    marriageEnd: '1888-06-15',
  },
  {
    id: PID('w2wife1'),
    name: '아우구스테',
    surname: '슐레스비히홀슈타인',
    regnalName: '아우구스테 빅토리아 황후',
    birth: '1858-10-22',
    death: '1921-04-11',
    biography:
      '빌헬름 2세의 첫 황후. 슐레스비히-홀슈타인-존더부르크-아우구스텐부르크 가문 출신. 7자녀를 두었고 황제의 네덜란드 망명에도 동행.',
    husbandId: HUSBANDS.W2,
    marriage: '1881-02-27',
    marriageEnd: '1921-04-11',
  },
  {
    id: PID('w2wife2'),
    name: '헤르미네',
    surname: '로이스',
    regnalName: '헤르미네 황후',
    birth: '1887-12-17',
    death: '1947-08-07',
    biography:
      '빌헬름 2세의 두 번째 부인. 로이스-그라이츠 공자의 미망인이었으며, 황제가 네덜란드 도른에 망명 중이던 1922년 재혼.',
    husbandId: HUSBANDS.W2,
    marriage: '1922-11-05',
    marriageEnd: '1941-06-04',
  },
]

async function main() {
  const prisma = new PrismaService({ useAdapter: true })

  for (const w of WIVES) {
    // Person upsert
    await prisma.person.upsert({
      where: { id: w.id },
      update: {
        name: w.name,
        surname: w.surname,
        regnalName: w.regnalName,
        birthEra: Era.AD,
        birthDate: new Date(`${w.birth}T00:00:00Z`),
        deathEra: Era.AD,
        deathDate: new Date(`${w.death}T00:00:00Z`),
        biography: w.biography,
        gender: 'female',
        nameDisplayOrder: 'western',
        countryId: GERMANY_COUNTRY_ID,
        dynastyId: DYNASTY_ID,
        accountId: ACCOUNT_ID,
      },
      create: {
        id: w.id,
        name: w.name,
        surname: w.surname,
        regnalName: w.regnalName,
        birthEra: Era.AD,
        birthDate: new Date(`${w.birth}T00:00:00Z`),
        deathEra: Era.AD,
        deathDate: new Date(`${w.death}T00:00:00Z`),
        biography: w.biography,
        gender: 'female',
        nameDisplayOrder: 'western',
        countryId: GERMANY_COUNTRY_ID,
        dynastyId: DYNASTY_ID,
        accountId: ACCOUNT_ID,
      },
    })
    console.log(`  👤 ${w.regnalName}`)

    // Spouse relation upsert (personId < spouseId normalized not required here; schema allows both directions, but we set husband→wife)
    const existing = await prisma.personSpouse.findFirst({
      where: { personId: w.husbandId, spouseId: w.id },
    })
    if (!existing) {
      await prisma.personSpouse.create({
        data: {
          personId: w.husbandId,
          spouseId: w.id,
          marriageStartDate: new Date(`${w.marriage}T00:00:00Z`),
          marriageEndDate: w.marriageEnd
            ? new Date(`${w.marriageEnd}T00:00:00Z`)
            : null,
        },
      })
      console.log(`     💍 혼인 관계 등록`)
    } else {
      console.log(`     ⏭️  혼인 관계 (이미 존재)`)
    }
  }

  // 모자 관계: 빅토리아 → 빌헬름 2세 (어머니)
  //          아우구스타 → 프리드리히 3세 (어머니)
  //          루이제 → FW4, W1 (어머니)
  const motherLinks: Array<[string, string, string]> = [
    [HUSBANDS.FW4, PID('fw3wife1'), 'FW IV → 母 루이제'],
    [HUSBANDS.W1, PID('fw3wife1'), 'Wilhelm I → 母 루이제'],
    [HUSBANDS.F3, PID('w1wife1'), 'Friedrich III → 母 아우구스타'],
    [HUSBANDS.W2, PID('f3wife1'), 'Wilhelm II → 母 빅토리아'],
  ]
  for (const [child, mother, label] of motherLinks) {
    await prisma.person.update({
      where: { id: child },
      data: { motherId: mother },
    })
    console.log(`  👩‍👦 ${label}`)
  }

  console.log(`\n✅ 총 ${WIVES.length}명의 부인 등록 및 관계 설정 완료`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
