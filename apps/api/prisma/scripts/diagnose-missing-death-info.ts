/**
 * 사망 정보 누락 인물 진단
 *
 * 이미 사망한 인물(deathDate 존재) 중에서 deathType/deathCause/deathNote가
 * 누락된 케이스를 나열한다. deathPlaceText 누락도 함께 확인.
 *
 * 실행: node -r ./prisma-seed-loader.js ./node_modules/.bin/tsx \
 *   apps/api/prisma/scripts/diagnose-missing-death-info.ts
 */
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
        id: true,
        name: true,
        surname: true,
        originalName: true,
        birthDate: true,
        deathDate: true,
        deathType: true,
        deathCause: true,
        deathNote: true,
        deathPlaceText: true,
      },
      orderBy: [{ birthDate: 'asc' }],
    })

    console.log(`\n=== 사망 정보 일부 누락 인물 총 ${persons.length}명 ===\n`)

    for (const p of persons) {
      const full = [p.surname, p.name].filter(Boolean).join(' ')
      const by = p.birthDate?.getUTCFullYear() ?? '?'
      const dy = p.deathDate?.getUTCFullYear() ?? '?'
      const missing: string[] = []
      if (!p.deathType) missing.push('Type')
      if (!p.deathCause) missing.push('Cause')
      if (!p.deathNote) missing.push('Note')
      if (!p.deathPlaceText) missing.push('Place')
      console.log(
        `  ${p.originalName ?? full} (${full}) [${by}~${dy}] missing=[${missing.join(', ')}]`,
      )
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error('❌', e)
  process.exit(1)
})
