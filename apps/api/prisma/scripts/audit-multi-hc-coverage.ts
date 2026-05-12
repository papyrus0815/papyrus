/**
 * 합스부르크 등 다국 동군연합 군주의 HC 커버리지 검사.
 * 인물별로 등록된 SovereignReign HC 목록을 출력해
 * 누락된 HC를 사람 눈으로 식별 가능하게.
 */
import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'

const TARGETS = [
  'Charles V, Holy Roman Emperor',
  'Philip II of Spain',
  'Philip III of Spain',
  'Philip IV of Spain',
  'Ferdinand I, Holy Roman Emperor',
  'Maximilian I, Holy Roman Emperor',
  'Maximilian II, Holy Roman Emperor',
  'Rudolf II, Holy Roman Emperor',
  'Matthias, Holy Roman Emperor',
  'Ferdinand II, Holy Roman Emperor',
  'Ferdinand III, Holy Roman Emperor',
  'Leopold I, Holy Roman Emperor',
  'Joseph I, Holy Roman Emperor',
  'Charles VI, Holy Roman Emperor',
  'Friedrich III, Holy Roman Emperor',
  'Ferdinand II of Aragon',
  'Isabella I of Castile',
  'Manuel I of Portugal',
  'John III of Portugal',
  'Joanna of Castile',
  'Philip I of Castile',
  'Mary of Burgundy',
]

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    for (const name of TARGETS) {
      const p = await prisma.person.findFirst({
        where: { originalName: name },
        select: {
          id: true,
          originalName: true,
          birthDate: true,
          deathDate: true,
          sovereignReigns: {
            include: { historicalCountry: { select: { name: true } } },
            orderBy: { startDate: 'asc' },
          },
        },
      })
      if (!p) {
        console.log(`  ✗ ${name} — Person 미존재`)
        continue
      }
      const by = p.birthDate?.getUTCFullYear() ?? '?'
      const dy = p.deathDate?.getUTCFullYear() ?? '?'
      console.log(`\n● ${p.originalName} [${by}~${dy}]`)
      if (p.sovereignReigns.length === 0) {
        console.log('    재임 0건!')
      } else {
        for (const r of p.sovereignReigns) {
          const sy = r.startDate.getUTCFullYear()
          const ey = r.endDate?.getUTCFullYear() ?? '?'
          console.log(
            `    ${r.regnalNumber ?? '-'}대 ${r.regnalName ?? '-'} @ ${r.historicalCountry?.name ?? '(no HC)'} [${sy}~${ey}]`,
          )
        }
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
