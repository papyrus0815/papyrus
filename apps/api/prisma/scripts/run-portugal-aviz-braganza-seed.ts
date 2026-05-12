import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedPortugalAvizBraganza } from '../seeds/person.portugal-aviz-braganza.seed'

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    await seedPortugalAvizBraganza(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('\n✨ 포르투갈 아비스·브라간사 라인 시드 완료\n'))
  .catch((err) => { console.error('\n❌ 시드 실패:', err); process.exit(1) })
