import * as bcrypt from 'bcrypt'

import { PrismaService } from '../prisma.service'

export async function seedAdmin(prisma: PrismaService): Promise<void> {
  console.log('\n👤 어드민 계정 시딩 시작...')

  const plainPassword = '1234'
  const passwordHash = await bcrypt.hash(plainPassword, 10)

  const admin = await prisma.account.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash,
    },
  })

  console.log(`✅ 어드민 계정 생성됨: ${admin.username}\n`)
}

