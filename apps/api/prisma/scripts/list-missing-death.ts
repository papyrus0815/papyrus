import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'

async function main() {
  const envPath = path.resolve(process.cwd(), 'env.development')
  dotenv.config({ path: envPath })

  const prisma = new PrismaService({ useAdapter: true })
  try {
    const persons = await prisma.person.findMany({
      where: {
        deathDate: { not: null },
        OR: [
          { deathType: null },
          { deathCause: null },
          { deathNote: null },
          { deathPlaceText: null },
        ],
      },
      select: {
        originalName: true,
        name: true,
        surname: true,
        birthDate: true,
        deathDate: true,
        deathType: true,
        deathCause: true,
        deathNote: true,
        deathPlaceText: true,
      },
      orderBy: [{ birthDate: 'asc' }],
    })

    for (const p of persons) {
      const by = p.birthDate?.getUTCFullYear() ?? '?'
      const dy = p.deathDate?.getUTCFullYear() ?? '?'
      const has = {
        T: !!p.deathType,
        C: !!p.deathCause,
        N: !!p.deathNote,
        P: !!p.deathPlaceText,
      }
      console.log(
        `${p.originalName ?? p.name}|${by}|${dy}|T=${has.T?'O':'_'} C=${has.C?'O':'_'} N=${has.N?'O':'_'} P=${has.P?'O':'_'}`,
      )
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)
