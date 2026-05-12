import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    const names = ['류리크', 'Rurik', '로마노프', 'Romanov', '고두노프', 'Godunov', '슈이스키', 'Shuysky', '추이스키']
    for (const n of names) {
      const d = await prisma.dynasty.findFirst({
        where: { name: { contains: n } },
        select: { id: true, name: true },
      })
      console.log(`${n.padEnd(20)} → ${d ? d.name : 'MISSING'}`)
    }
    const ivan = await prisma.person.findFirst({
      where: { originalName: 'Ivan V of Russia' },
      select: {
        id: true,
        regnalName: true,
        dynasty: { select: { name: true } },
      },
    })
    console.log('\nIvan V:', ivan)
    const peter = await prisma.person.findFirst({
      where: { originalName: 'Peter I of Russia' },
      select: {
        id: true,
        regnalName: true,
        birthDate: true,
        deathDate: true,
        dynasty: { select: { name: true } },
      },
    })
    console.log('Peter I:', peter)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
