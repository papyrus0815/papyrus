import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    const hc = await prisma.historicalCountry.findFirst({
      where: { name: '러시아 제국' },
      select: { id: true, startYear: true, endYear: true },
    })
    if (!hc) {
      console.log('러시아 제국 HC 없음')
      return
    }
    const reigns = await prisma.sovereignReign.findMany({
      where: { historicalCountryId: hc.id },
      orderBy: [{ startDate: 'asc' }],
      select: {
        regnalNumber: true,
        regnalName: true,
        startDate: true,
        endDate: true,
        person: { select: { originalName: true, name: true, surname: true } },
      },
    })
    console.log(`\n=== 러시아 제국 [${hc.startYear}~${hc.endYear}] ${reigns.length}건 ===`)
    for (const r of reigns) {
      const sy = r.startDate.getUTCFullYear()
      const ey = r.endDate ? r.endDate.getUTCFullYear() : '?'
      console.log(
        `  ${String(r.regnalNumber ?? '-').padStart(3)}. ${r.regnalName ?? '-'} [${sy}~${ey}] ← ${r.person.originalName}`,
      )
    }

    // 표트르 1세·이반 5세 등 Tsardom 시기 인물이 Person 테이블에 이미 존재하는지
    const candidates = ['Peter I of Russia', 'Peter the Great', 'Ivan IV', 'Mikhail I of Russia', 'Aleksei I of Russia', 'Tsar Peter I']
    console.log('\n=== Person 직접 조회 (Tsardom 후보) ===')
    for (const name of candidates) {
      const p = await prisma.person.findFirst({
        where: { OR: [{ originalName: { contains: name } }, { name: { contains: name } }] },
        select: { id: true, originalName: true, name: true, surname: true, birthDate: true, deathDate: true },
      })
      if (p) {
        console.log(`  v ${name} → ${p.originalName} (${p.name} ${p.surname})`)
      }
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
