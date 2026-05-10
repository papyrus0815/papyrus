import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'

async function main() {
  const envPath = path.resolve(process.cwd(), 'env.development')
  dotenv.config({ path: envPath })

  const prisma = new PrismaService({ useAdapter: true })
  try {
    const castileHC = await prisma.historicalCountry.findFirst({
      where: { name: '카스티야 왕국' },
      select: { id: true },
    })
    if (!castileHC) return

    const reigns = await prisma.sovereignReign.findMany({
      where: { historicalCountryId: castileHC.id },
      select: {
        regnalNumber: true,
        regnalName: true,
        startDate: true,
        endDate: true,
        appointmentMethod: true,
        person: { select: { originalName: true } },
      },
      orderBy: [{ regnalNumber: 'asc' }, { startDate: 'asc' }],
    })
    console.log('=== 카스티야 왕국 SovereignReign ===')
    for (const r of reigns) {
      const fmt = (d: Date | null) =>
        d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '?'
      console.log(
        `${String(r.regnalNumber ?? '공동').padStart(4)} | ${(r.regnalName ?? '?').padEnd(40)} | ${fmt(r.startDate)} ~ ${fmt(r.endDate)} | ${r.person.originalName}`,
      )
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)
