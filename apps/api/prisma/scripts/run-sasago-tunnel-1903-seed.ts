import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedSasagoTunnel1903 } from '../seeds/event.sasago-tunnel-1903.seed'

async function main() {
  const envPath = path.resolve(process.cwd(), 'env.development')
  dotenv.config({ path: envPath })

  const prisma = new PrismaService({ useAdapter: true })
  try {
    await seedSasagoTunnel1903(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('\n✨ 1903 사사고 터널 개통 시드 완료\n'))
  .catch((error) => {
    console.error('\n❌ 시드 실패:', error)
    process.exit(1)
  })
