import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  // 1. 대륙 생성
  const continents = [
    { name: '아시아', enName: 'Asia', isoCode: 'AS', parentId: null },
    { name: '유럽', enName: 'Europe', isoCode: 'EU', parentId: null },
    { name: '아프리카', enName: 'Africa', isoCode: 'AF', parentId: null },
    {
      name: '북아메리카',
      enName: 'North America',
      isoCode: 'NA',
      parentId: null,
    },
    {
      name: '남아메리카',
      enName: 'South America',
      isoCode: 'SA',
      parentId: null,
    },
    { name: '오세아니아', enName: 'Oceania', isoCode: 'OC', parentId: null },
    { name: '남극', enName: 'Antarctica', isoCode: 'AN', parentId: null },
  ]

  const continentMap = new Map()
  for (const continent of continents) {
    const created = await prisma.continent.upsert({
      where: { name: continent.name },
      update: continent,
      create: continent,
    })
    continentMap.set(continent.name, created.id)
    console.log(`✅ 대륙 생성됨: ${created.name}`)
  }

  console.log(`\n✅ 총 ${continents.length}개 대륙 생성 완료!\n`)

  // 2. 히어로 생성 - 나폴레옹
  const napoleon = await prisma.hero.upsert({
    where: { name: '나폴레옹' },
    update: {},
    create: {
      name: '나폴레옹',
      bio: '프랑스의 황제이자 위대한 전략가',
    },
  })
  console.log(`✅ 히어로 생성됨: ${napoleon.name}`)

  // 3. 어드민 계정 생성
  const plainPassword = '1234'
  const passwordHash = await bcrypt.hash(plainPassword, 10)

  const admin = await prisma.account.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash,
      heroId: napoleon.id, // 기본 선택된 히어로
    },
  })
  console.log(`✅ 계정 생성됨: ${admin.username}`)
}

main()
  .then(() => {
    console.log('🌱 시딩 완료!')
  })
  .catch((error) => {
    console.error('❌ 시딩 오류:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
