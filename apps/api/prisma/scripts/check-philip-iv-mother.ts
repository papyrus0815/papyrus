import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    const p4 = await prisma.person.findFirst({
      where: { originalName: 'Philip IV of Spain' },
      select: { id: true, originalName: true, fatherId: true, motherId: true },
    })
    console.log('Philip IV:', p4)

    const candidates = ['Margaret of Austria', 'Margarita de Austria', '마르가레테 폰 외스터라이히']
    for (const c of candidates) {
      const p = await prisma.person.findFirst({
        where: { OR: [{ originalName: { contains: c } }, { name: { contains: c } }] },
        select: { id: true, originalName: true, name: true, surname: true, birthDate: true, deathDate: true },
      })
      console.log(`${c.padEnd(40)} → ${p ? p.originalName : 'MISSING'}`)
    }

    const habsburg = await prisma.dynasty.findFirst({ where: { name: '합스부르크 가문' } })
    console.log('합스부르크 가문:', habsburg?.id ?? 'MISSING')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
