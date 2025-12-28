import { PrismaClient, UserRole, AggregateType, CurationVisibility, CurationStatus } from '@prisma/client'
import * as argon2 from 'argon2'

const prisma = new PrismaClient()

async function seedUsers() {
  console.log('🌱 Seeding users...')

  const users = []

  // 테스트 사용자 3명 생성
  for (let i = 1; i <= 3; i++) {
    const user = await prisma.user.create({
      data: {
        email: `user${i}@test.com`,
        passwordHash: await argon2.hash('password123'),
        displayName: `역사덕후${i}`,
        bio: `역사를 사랑하는 사용자 ${i}번입니다.`,
        role: i === 1 ? UserRole.CURATOR : UserRole.USER,
        emailVerified: true,
        isActive: true,
      },
    })
    users.push(user)
    console.log(`  ✓ Created user: ${user.displayName}`)
  }

  return users
}

async function seedCurations(users: any[], persons: any[]) {
  console.log('🌱 Seeding curations...')

  // 기존 Person 데이터 중 일부를 가져옴
  if (persons.length === 0) {
    console.log('  ⚠ No persons found. Skipping curation seed.')
    return []
  }

  const curations = []

  // 각 유저가 비스마르크에 대한 큐레이션 작성
  for (let i = 0; i < users.length && i < persons.length; i++) {
    const curation = await prisma.curation.create({
      data: {
        userId: users[i].id,
        itemType: AggregateType.PERSON,
        itemId: persons[0].id, // 첫 번째 인물
        title: `${persons[0].name}의 업적과 영향`,
        content: `${persons[0].name}은(는) ${users[i].displayName}의 관점에서 매우 중요한 인물입니다.\n\n주요 업적:\n1. ...\n2. ...\n3. ...`,
        images: [],
        sources: ['역사책 1권', '논문 ABC'],
        tags: ['역사', '인물', persons[0].name],
        visibility: CurationVisibility.PUBLIC,
        status: CurationStatus.PUBLISHED,
        publishedAt: new Date(),
        viewCount: Math.floor(Math.random() * 100),
        likeCount: Math.floor(Math.random() * 20),
        commentCount: 0,
        isVerified: i === 0, // 첫 번째 유저(큐레이터)의 것만 검증
      },
    })
    curations.push(curation)
    console.log(`  ✓ Created curation: ${curation.title}`)
  }

  return curations
}

async function seedSocial(users: any[]) {
  console.log('🌱 Seeding social relationships...')

  // user2가 user1을 팔로우
  await prisma.follow.create({
    data: {
      followerId: users[1].id,
      followingId: users[0].id,
    },
  })

  await prisma.user.update({
    where: { id: users[0].id },
    data: { followerCount: 1 },
  })

  await prisma.user.update({
    where: { id: users[1].id },
    data: { followingCount: 1 },
  })

  console.log(`  ✓ ${users[1].displayName} follows ${users[0].displayName}`)
}

async function seedUserRooms(users: any[]) {
  console.log('🌱 Seeding user rooms...')

  for (const user of users) {
    await prisma.userRoom.create({
      data: {
        userId: user.id,
        title: `${user.displayName}의 역사 공간`,
        description: '역사에 대한 나의 생각을 모아두는 곳입니다.',
        themeColor: '#2563eb',
        showVisitorCount: true,
        totalVisitors: Math.floor(Math.random() * 50),
        todayVisitors: Math.floor(Math.random() * 10),
      },
    })
    console.log(`  ✓ Created room for: ${user.displayName}`)
  }
}

async function main() {
  console.log('🚀 Starting user-social seed...\n')

  try {
    // 기존 Person 데이터 가져오기
    const persons = await prisma.person.findMany({
      take: 3,
    })

    // 샘플 데이터 생성
    const users = await seedUsers()
    const curations = await seedCurations(users, persons)
    await seedSocial(users)
    await seedUserRooms(users)

    console.log('\n✅ User-social seed completed successfully!')
    console.log('\n📊 Summary:')
    console.log(`  - Users: ${users.length}`)
    console.log(`  - Curations: ${curations.length}`)
    console.log(`  - Follows: 1`)
    console.log(`  - User Rooms: ${users.length}`)
    console.log('\n🔐 Test credentials:')
    console.log('  Email: user1@test.com')
    console.log('  Email: user2@test.com')
    console.log('  Email: user3@test.com')
    console.log('  Password: password123')
  } catch (error) {
    console.error('❌ Error seeding user-social data:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

