import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    const hcs = await prisma.historicalCountry.findMany({
      select: {
        id: true,
        name: true,
        enName: true,
        startEra: true,
        startYear: true,
        endEra: true,
        endYear: true,
        _count: { select: { sovereignReigns: true } },
      },
      orderBy: [{ startYear: 'asc' }, { name: 'asc' }],
    })

    const withReigns = hcs.filter((h) => h._count.sovereignReigns > 0)
    const withoutReigns = hcs.filter((h) => h._count.sovereignReigns === 0)

    const fmt = (era: any, y: number | null) =>
      y == null ? '?' : `${era === 'BC' ? '-' : ''}${y}`
    const line = (hc: any) =>
      `${hc.name}${hc.enName ? ` (${hc.enName})` : ''} ` +
      `[${fmt(hc.startEra, hc.startYear)}~${fmt(hc.endEra, hc.endYear)}] ` +
      `reigns=${hc._count.sovereignReigns}`

    console.log(
      `\n=== HC 총 ${hcs.length}개 — 재임 있음 ${withReigns.length} / 없음 ${withoutReigns.length} ===\n`,
    )
    console.log('## 재임 등록된 HC:')
    for (const hc of withReigns) console.log(`  v ${line(hc)}`)
    console.log('\n## 재임 0건 HC (= 군주 미등록):')
    for (const hc of withoutReigns) console.log(`  x ${line(hc)}`)

    const nullHcReigns = await prisma.sovereignReign.count({
      where: { historicalCountryId: null },
    })
    const totalReigns = await prisma.sovereignReign.count()
    console.log(
      `\n=== SovereignReign 총 ${totalReigns}건, HC 미연결(=null) ${nullHcReigns}건 ===`,
    )
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
