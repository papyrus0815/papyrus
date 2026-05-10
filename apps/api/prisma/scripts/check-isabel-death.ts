import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'

async function main() {
  const envPath = path.resolve(process.cwd(), 'env.development')
  dotenv.config({ path: envPath })

  const prisma = new PrismaService({ useAdapter: true })
  try {
    const isabel = await prisma.person.findFirst({
      where: { originalName: 'Isabella I of Castile' },
      select: {
        originalName: true,
        deathType: true,
        deathCause: true,
        deathNote: true,
        deathPlaceText: true,
      },
    })
    console.log(JSON.stringify(isabel, null, 2))

    const max = await prisma.person.findFirst({
      where: { originalName: 'Maximilian I, Holy Roman Emperor' },
      select: {
        originalName: true,
        deathType: true,
        deathCause: true,
        deathNote: true,
        deathPlaceText: true,
      },
    })
    console.log(JSON.stringify(max, null, 2))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)
