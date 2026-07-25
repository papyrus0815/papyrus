import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })

  const gb = await prisma.country.findFirst({ where: { isoCode: 'GB' }, select: { id: true, name: true } })

  if (gb) {
    const links = await prisma.historicalCountryModernCountry.findMany({
      where: { modernCountryId: gb.id },
      select: { historicalCountry: { select: { name: true, enName: true, startEra: true, startYear: true, endEra: true, endYear: true, stateType: true, entityKind: true } } },
    })
    const rows = links.map((l) => l.historicalCountry!).sort((a, b) => (a.startYear ?? 0) - (b.startYear ?? 0))
    console.log(`\nGB(${gb.name})에 연결된 역사국가 (${links.length}):`)
    rows.forEach((r) => console.log(`  ${(r.startEra ?? '') + (r.startYear ?? '?')}~${r.endYear ? (r.endEra ?? '') + r.endYear : '현재'}  ${r.name} [${r.stateType}/${r.entityKind ?? '—'}]`))
  }

  // 신규 5개 존재 확인
  const newNames = ['그레이트브리튼 및 북아일랜드 연합왕국', '잉글랜드 연방', '대영제국', '서식스 왕국', '에식스 왕국']
  console.log('\n=== 신규 엔티티 확인 ===')
  for (const name of newNames) {
    const hc = await prisma.historicalCountry.findFirst({ where: { name }, select: { id: true, name: true } })
    console.log(hc ? `  ✅ ${name}` : `  ❌ MISSING: ${name}`)
  }

  // 신규 노드의 계승 엣지 확인
  console.log('\n=== 신규 계승 엣지 ===')
  const edges = await prisma.historicalCountryTransition.findMany({
    select: {
      eventType: true, transitionScope: true,
      predecessor: { select: { name: true } },
      successor: { select: { name: true } },
    },
  })
  const involved = new Set([...newNames, '잉글랜드 왕국', '그레이트브리튼 및 아일랜드 연합왕국'])
  edges
    .filter((e) => involved.has(e.predecessor.name) && involved.has(e.successor.name))
    .forEach((e) => console.log(`  ${e.predecessor.name} → ${e.successor.name} (${e.eventType}/${e.transitionScope})`))

  await prisma.$disconnect()
}
main().catch((err) => { console.error(err); process.exit(1) })
