import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'

async function main() {
  const envPath = path.resolve(process.cwd(), 'env.development')
  dotenv.config({ path: envPath })

  const prisma = new PrismaService({ useAdapter: true })
  try {
    // 1719년생 루트비히 직접 조회
    const ludwig = await prisma.person.findFirst({
      where: {
        name: '루트비히',
        birthDate: { gte: new Date(1719, 0, 1), lt: new Date(1720, 0, 1) },
      },
      select: {
        id: true,
        name: true,
        surname: true,
        originalName: true,
      },
    })
    console.log('1719 루트비히:', ludwig)

    // 호엔촐레른 빌헬름
    const wilhelm = await prisma.person.findFirst({
      where: {
        name: '빌헬름',
        surname: '호엔촐레른',
      },
      select: {
        id: true,
        name: true,
        surname: true,
        originalName: true,
        birthDate: true,
      },
    })
    console.log('호엔촐레른 빌헬름:', wilhelm)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)
