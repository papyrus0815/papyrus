import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    // Person 후보
    const names = ['Anne, Queen', 'George I', 'George II', 'George III', 'William III', 'Mary II', 'Anne of Great Britain']
    console.log('\n=== Great Britain monarch person candidates ===')
    for (const n of names) {
      const p = await prisma.person.findFirst({
        where: { originalName: { contains: n } },
        select: { id: true, originalName: true, name: true, surname: true, birthDate: true, deathDate: true },
      })
      if (p) console.log(`  v ${n} → ${p.originalName} (${p.name} ${p.surname}, ${p.birthDate?.getUTCFullYear() ?? '?'}~${p.deathDate?.getUTCFullYear() ?? '?'})`)
      else console.log(`  - ${n} 미존재`)
    }

    // HC 후보
    const gbk = await prisma.historicalCountry.findFirst({ where: { name: '그레이트브리튼 왕국' } })
    const ukgb = await prisma.historicalCountry.findFirst({ where: { name: '그레이트브리튼 및 아일랜드 연합왕국' } })
    console.log('\n=== HC ===')
    console.log(`  그레이트브리튼 왕국: ${gbk ? gbk.id : 'MISSING'} [${gbk?.startYear}~${gbk?.endYear}]`)
    console.log(`  연합왕국: ${ukgb ? ukgb.id : 'MISSING'} [${ukgb?.startYear}~${ukgb?.endYear}]`)

    if (gbk) {
      const r = await prisma.sovereignReign.findMany({ where: { historicalCountryId: gbk.id }, orderBy: { startDate: 'asc' }, include: { person: { select: { originalName: true } } } })
      console.log(`\n그레이트브리튼 왕국 reigns (${r.length}):`)
      for (const x of r) console.log(`  ${x.regnalNumber ?? '-'}. ${x.regnalName ?? '-'} [${x.startDate.getUTCFullYear()}~${x.endDate?.getUTCFullYear() ?? '?'}] ${x.person.originalName}`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(e => { console.error(e); process.exit(1) })
