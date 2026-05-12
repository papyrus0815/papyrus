import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    const f3 = await prisma.person.findFirst({
      where: { originalName: 'Friedrich III, Holy Roman Emperor' },
      select: { id: true, originalName: true, fatherId: true, motherId: true },
    })
    console.log('Friedrich III:', f3)
    const candidates = [
      'Ernest the Iron',
      'Ernst der Eiserne',
      'Ernest, Duke',
      'Cymburgis',
      'Zimburga',
      '에른스트',
      '침바르카',
    ]
    for (const c of candidates) {
      const p = await prisma.person.findFirst({
        where: { OR: [{ originalName: { contains: c } }, { name: { contains: c } }] },
        select: { originalName: true, name: true, surname: true },
      })
      console.log(`${c.padEnd(20)} → ${p ? p.originalName ?? (p.name + ' ' + (p.surname ?? '')) : 'MISSING'}`)
    }
    const dynasties = ['합스부르크 가문', '피아스트 가문', '마조비아 피아스트 가문']
    for (const d of dynasties) {
      const dy = await prisma.dynasty.findFirst({ where: { name: d } })
      console.log(`${d.padEnd(20)} → ${dy ? dy.id : 'MISSING'}`)
    }
    const hcs = ['오스트리아 대공국', 'Inner Austria', '이너 오스트리아', '폴란드', '마조비아']
    for (const h of hcs) {
      const hc = await prisma.historicalCountry.findFirst({
        where: { OR: [{ name: { contains: h } }, { enName: { contains: h } }] },
      })
      console.log(`HC ${h.padEnd(20)} → ${hc ? hc.name : 'MISSING'}`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
