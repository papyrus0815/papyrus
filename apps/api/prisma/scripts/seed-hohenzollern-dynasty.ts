import { Era } from '@prisma/client'

import { PrismaService } from '../prisma.service'

const ACCOUNT_ID = 'bf93b960-cec2-4205-9fe1-f34616855f85'
const GERMANY_COUNTRY_ID = '679fbd36-845e-44af-b909-8fba46c7ea55'

const PERSON_ID = (slug: string) =>
  `de000002-0000-0000-0000-${slug.padEnd(12, '0')}`.slice(0, 36)

const FW3 = PERSON_ID('fw3prussia')
const FW4 = PERSON_ID('fw4prussia')
const W1 = PERSON_ID('w1prussia')
const F3 = PERSON_ID('f3prussia')
const W2 = PERSON_ID('w2prussia')

const DYNASTY_ID = 'de000003-0000-0000-0000-000000000001'

async function main() {
  const prisma = new PrismaService({ useAdapter: true })

  // 1) Dynasty upsert
  await prisma.dynasty.upsert({
    where: { id: DYNASTY_ID },
    update: {
      name: '호엔촐레른',
      description:
        '11세기 슈바벤의 촐레른 백작령에서 기원한 독일 귀족 가문. 브란덴부르크 선제후(1415), 프로이센 공작·국왕(1525/1701), 독일 황제(1871–1918)까지 배출하며 근대 독일사의 중심에 섰다.',
      startDate: new Date('1061-01-01T00:00:00Z'),
    },
    create: {
      id: DYNASTY_ID,
      name: '호엔촐레른',
      description:
        '11세기 슈바벤의 촐레른 백작령에서 기원한 독일 귀족 가문. 브란덴부르크 선제후(1415), 프로이센 공작·국왕(1525/1701), 독일 황제(1871–1918)까지 배출하며 근대 독일사의 중심에 섰다.',
      startDate: new Date('1061-01-01T00:00:00Z'),
    },
  })
  console.log('👑 호엔촐레른 가문 등록 완료')

  // 2) Friedrich Wilhelm III (가계도 루트)를 Person으로 추가
  await prisma.person.upsert({
    where: { id: FW3 },
    update: {
      name: '프리드리히',
      surname: '호엔촐레른',
      regnalName: '프리드리히 빌헬름 3세',
      birthEra: Era.AD,
      birthDate: new Date('1770-08-03T00:00:00Z'),
      deathEra: Era.AD,
      deathDate: new Date('1840-06-07T00:00:00Z'),
      biography:
        '프로이센 국왕(재위 1797–1840). 나폴레옹 전쟁기 예나 전투 패배로 프로이센이 굴욕을 겪었으나 해방 전쟁(1813–1815)에서 승리, 빈 회의를 통해 영토를 회복. 프리드리히 빌헬름 4세와 빌헬름 1세의 아버지.',
      gender: 'male',
      nameDisplayOrder: 'western',
      countryId: GERMANY_COUNTRY_ID,
      dynastyId: DYNASTY_ID,
      accountId: ACCOUNT_ID,
    },
    create: {
      id: FW3,
      name: '프리드리히',
      surname: '호엔촐레른',
      regnalName: '프리드리히 빌헬름 3세',
      birthEra: Era.AD,
      birthDate: new Date('1770-08-03T00:00:00Z'),
      deathEra: Era.AD,
      deathDate: new Date('1840-06-07T00:00:00Z'),
      biography:
        '프로이센 국왕(재위 1797–1840). 나폴레옹 전쟁기 예나 전투 패배로 프로이센이 굴욕을 겪었으나 해방 전쟁(1813–1815)에서 승리, 빈 회의를 통해 영토를 회복. 프리드리히 빌헬름 4세와 빌헬름 1세의 아버지.',
      gender: 'male',
      nameDisplayOrder: 'western',
      countryId: GERMANY_COUNTRY_ID,
      dynastyId: DYNASTY_ID,
      accountId: ACCOUNT_ID,
    },
  })
  console.log('👤 프리드리히 빌헬름 3세 등록')

  // 3) 기존 4명의 가문 연결 + 가계도 설정
  const updates: Array<[string, string | null, string]> = [
    // [personId, fatherId, label]
    [FW4, FW3, '프리드리히 빌헬름 4세 → 父 프리드리히 빌헬름 3세'],
    [W1, FW3, '빌헬름 1세 → 父 프리드리히 빌헬름 3세'],
    [F3, W1, '프리드리히 3세 → 父 빌헬름 1세'],
    [W2, F3, '빌헬름 2세 → 父 프리드리히 3세'],
  ]

  for (const [personId, fatherId, label] of updates) {
    await prisma.person.update({
      where: { id: personId },
      data: { dynastyId: DYNASTY_ID, fatherId: fatherId ?? undefined },
    })
    console.log(`  🔗 ${label}`)
  }

  console.log('\n✅ 가문 연결 및 가계도 설정 완료')
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
