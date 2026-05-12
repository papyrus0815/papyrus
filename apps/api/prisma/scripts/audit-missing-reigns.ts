/**
 * 재임(SovereignReign) 0건이지만 originalName에 군주 칭호가 들어 있는 인물 추출.
 * 황후·왕비는 originalName에 'Queen consort'/'Empress consort' 또는 결혼 이름이 들어 있으므로
 * 추가 필터로 군주성(자체 통치)을 가진 사람만 추린다.
 */
import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'

const MONARCH_KEYWORDS = [
  'King',
  'Queen of',
  'Emperor',
  'Empress regnant',
  'Tsar',
  'Sultan',
  'Khan',
  'Shogun',
  'Doge',
  'Caliph',
  'Duke of', // 부르고뉴 공작 등
  'Prince of', // 웨일스 공자 등
]

const EXCLUDE_KEYWORDS = [
  'consort',
  'Princess',
  'of England)',
  'of Spain)',
  'of Portugal)', // "Eleanor of Portugal (Holy Roman Empress)" 같은 비통치 황후
  'of Russia (Alexander', // 알렉산드르의 아내
  'of Russia (Nicholas',
  ', Duchess of',
]

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    const reignedIds = new Set(
      (await prisma.sovereignReign.findMany({ select: { personId: true } })).map((r) => r.personId),
    )
    const persons = await prisma.person.findMany({
      where: {
        OR: MONARCH_KEYWORDS.map((k) => ({ originalName: { contains: k } })),
      },
      select: {
        id: true,
        originalName: true,
        regnalName: true,
        birthDate: true,
        deathDate: true,
        gender: true,
        dynastyId: true,
      },
    })

    const missing = persons
      .filter((p) => !reignedIds.has(p.id))
      .filter((p) => {
        const n = p.originalName ?? ''
        return !EXCLUDE_KEYWORDS.some((e) => n.includes(e))
      })

    console.log(`\n=== 군주 칭호 보유 + 재임 0건: ${missing.length}명 ===\n`)
    const dynasties = await prisma.dynasty.findMany({ select: { id: true, name: true } })
    const dynNameById = new Map(dynasties.map((d) => [d.id, d.name]))
    for (const p of missing) {
      const by = p.birthDate?.getUTCFullYear() ?? '?'
      const dy = p.deathDate?.getUTCFullYear() ?? '?'
      const dyn = p.dynastyId ? dynNameById.get(p.dynastyId) ?? '-' : '-'
      console.log(`  - ${p.originalName} [${by}~${dy}] ${p.gender} dynasty=${dyn}`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
