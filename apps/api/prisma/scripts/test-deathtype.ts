import { DeathType } from '@prisma/client'
import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'

async function main() {
  const envPath = path.resolve(process.cwd(), 'env.development')
  dotenv.config({ path: envPath })

  console.log('DeathType:', DeathType)
  console.log('DeathType.ILLNESS:', DeathType?.ILLNESS)
  console.log('typeof DeathType:', typeof DeathType)

  // 테스트: 직접 update해서 DB에 반영되는지 확인
  const prisma = new PrismaService({ useAdapter: true })
  try {
    const isabel = await prisma.person.findFirst({
      where: { originalName: 'Isabella I of Castile' },
      select: { id: true },
    })
    if (!isabel) {
      console.log('Isabel not found')
      return
    }
    console.log('Isabel id:', isabel.id)
    const result = await prisma.person.update({
      where: { id: isabel.id },
      data: {
        deathType: 'ILLNESS' as any,
        deathCause: 'TEST_CAUSE',
        deathNote: 'TEST_NOTE',
      },
    })
    console.log('After update:', {
      deathType: result.deathType,
      deathCause: result.deathCause,
      deathNote: result.deathNote,
    })

    // 다시 읽어서 확인
    const reread = await prisma.person.findFirst({
      where: { id: isabel.id },
      select: { deathType: true, deathCause: true, deathNote: true },
    })
    console.log('Re-read:', reread)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error('❌', e)
  process.exit(1)
})
