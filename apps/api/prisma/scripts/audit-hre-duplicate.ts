import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    const noSpace = await prisma.historicalCountry.findFirst({
      where: { name: '신성로마제국' },
    })
    const space = await prisma.historicalCountry.findFirst({
      where: { name: '신성 로마 제국' },
    })
    console.log('\n=== HC duplicate audit ===')
    console.log(
      'no-space "신성로마제국":',
      noSpace ? { id: noSpace.id, enName: noSpace.enName, start: noSpace.startYear, end: noSpace.endYear, descLen: noSpace.description?.length ?? 0 } : 'MISSING',
    )
    console.log(
      'space    "신성 로마 제국":',
      space ? { id: space.id, enName: space.enName, start: space.startYear, end: space.endYear, descLen: space.description?.length ?? 0 } : 'MISSING',
    )

    for (const [label, hc] of [
      ['no-space', noSpace],
      ['space   ', space],
    ] as const) {
      if (!hc) continue
      const id = hc.id
      const [reigns, affs, parentMember, memberMember, predTrans, succTrans] = await Promise.all([
        prisma.sovereignReign.count({ where: { historicalCountryId: id } }),
        prisma.personCountryAffiliation.count({ where: { historicalCountryId: id } }),
        prisma.historicalCountryMembership.count({ where: { historicalCountryId: id } }),
        prisma.historicalCountryMembership.count({ where: { memberCountryId: id } }),
        prisma.historicalCountryTransition.count({ where: { predecessorId: id } }),
        prisma.historicalCountryTransition.count({ where: { successorId: id } }),
      ])
      console.log(`\n[${label}] child counts:`)
      console.log(`  SovereignReign            : ${reigns}`)
      console.log(`  PersonCountryAffiliation  : ${affs}`)
      console.log(`  Membership (as parent)    : ${parentMember}`)
      console.log(`  Membership (as member)    : ${memberMember}`)
      console.log(`  Transition (as predecessor): ${predTrans}`)
      console.log(`  Transition (as successor) : ${succTrans}`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
