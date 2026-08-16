import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedWorldWarOneAppointmentDetails } from '../seeds/tenure.ww1-appointment.enrich.seed'

/**
 * 단독 실행: 레포 루트에서 `npx tsx apps/api/prisma/scripts/run-ww1-appointment-enrich.ts`
 *
 * WWI 인물 재임의 취임 배경(appointmentDetail)만 보강한다. 값이 이미 있으면 건드리지 않으므로
 * 인물 시드가 추가된 뒤 다시 돌려 누락분만 채우는 용도로도 쓴다.
 */
async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    await seedWorldWarOneAppointmentDetails(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('\n✨ 취임 배경 보강 완료\n'))
  .catch((err) => {
    console.error('\n❌ 보강 실패:', err)
    process.exit(1)
  })
