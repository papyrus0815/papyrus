/**
 * 합스부르크 등 다국 동군연합 군주의 HC 커버리지 검사.
 * 인물별로 등록된 SovereignReign HC 목록을 출력해
 * 누락된 HC를 사람 눈으로 식별 가능하게.
 */
import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { MONARCHICAL_TENURE } from '../../src/libs/person/infrastructure/office-holding.query'

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
          // 재위 = 군주직 재임 행
          GovernmentTenures: {
            where: MONARCHICAL_TENURE,
            include: { historicalCountry: { select: { name: true } } },
            orderBy: { startKey: 'asc' },
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
      if (p.GovernmentTenures.length === 0) {
        console.log('    재임 0건!')
      } else {
        for (const r of p.GovernmentTenures) {
          // 구조화 연도가 정본(BC 재위는 DATETIME이 없다)
          const sy = r.startYear != null ? `${r.startEra === 'BC' ? '-' : ''}${r.startYear}` : '?'
          const ey = r.endYear != null ? `${r.endEra === 'BC' ? '-' : ''}${r.endYear}` : '?'
          console.log(
            `    ${r.ordinal ?? '-'}대 ${r.regnalName ?? '-'} @ ${r.historicalCountry?.name ?? '(no HC)'} [${sy}~${ey}]`,
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
