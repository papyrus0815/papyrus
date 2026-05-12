import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    const iemochi = await prisma.person.findFirst({
      where: { originalName: 'Tokugawa Iemochi' },
      select: { id: true, originalName: true, fatherId: true, motherId: true },
    })
    console.log('Iemochi:', iemochi)

    const ienari = await prisma.person.findFirst({
      where: { originalName: 'Tokugawa Ienari' },
      select: { id: true, originalName: true },
    })
    console.log('Ienari (11대):', ienari)

    const candidates = ['Tokugawa Nariyuki', 'Nariyuki', '나리유키', '徳川 斉順', 'Omisa', '마쓰모토']
    for (const c of candidates) {
      const p = await prisma.person.findFirst({
        where: { OR: [{ originalName: { contains: c } }, { name: { contains: c } }] },
        select: { originalName: true, name: true, surname: true },
      })
      console.log(`${c.padEnd(20)} → ${p ? (p.originalName ?? (p.name + ' ' + (p.surname ?? ''))) : 'MISSING'}`)
    }

    const tokugawa = await prisma.dynasty.findFirst({ where: { name: '도쿠가와 가문' } })
    console.log('도쿠가와 가문:', tokugawa?.id ?? 'MISSING')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
