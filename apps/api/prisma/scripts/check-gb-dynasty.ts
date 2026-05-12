import * as dotenv from 'dotenv'
import * as path from 'path'
import { PrismaService } from '../prisma.service'

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    const names = ['스튜어트', 'Stuart', '하노버', 'Hanover']
    for (const n of names) {
      const d = await prisma.dynasty.findFirst({ where: { name: { contains: n } } })
      console.log(`${n.padEnd(15)} → ${d ? d.name : 'MISSING'}`)
    }
  } finally { await prisma.$disconnect() }
}
main().catch(e => { console.error(e); process.exit(1) })
