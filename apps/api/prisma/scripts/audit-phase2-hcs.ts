import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'

const TARGETS = [
  '신성로마제국',
  '헝가리 왕국',
  '보헤미아 왕국',
  '포르투갈 왕국',
  '러시아 차르국',
]

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    for (const name of TARGETS) {
      const hc = await prisma.historicalCountry.findFirst({
        where: { name },
        select: { id: true, name: true, startYear: true, endYear: true },
      })
      if (!hc) {
        console.log(`\n[X] ${name} — HC 미존재`)
        continue
      }
      const reigns = await prisma.sovereignReign.findMany({
        where: { historicalCountryId: hc.id },
        orderBy: [{ regnalNumber: 'asc' }, { startDate: 'asc' }],
        select: {
          regnalNumber: true,
          regnalName: true,
          startDate: true,
          endDate: true,
          person: { select: { originalName: true, name: true, surname: true } },
        },
      })
      console.log(
        `\n=== ${hc.name} [${hc.startYear}~${hc.endYear ?? '?'}] — 기등록 ${reigns.length}건 ===`,
      )
      for (const r of reigns) {
        const sy = r.startDate.getUTCFullYear()
        const ey = r.endDate ? r.endDate.getUTCFullYear() : '?'
        console.log(
          `  ${String(r.regnalNumber ?? '-').padStart(3)}. ${r.regnalName ?? '(no regnalName)'} ` +
            `[${sy}~${ey}] ← ${r.person.originalName} (${r.person.name} ${r.person.surname})`,
        )
      }
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
