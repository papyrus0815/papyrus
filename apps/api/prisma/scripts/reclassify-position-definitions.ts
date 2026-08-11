import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'

/**
 * 관직 정의 유형 재분류 (1회성, 멱등).
 *
 * 시드는 자연키(title + positionType)로 **존재하면 skip**이라 기존 행의 유형을 절대 갱신하지 않는다.
 * 그래서 이미 들어간 정의의 분류를 고치려면 이 스크립트가 필요하다.
 *
 * 안전장치: 재임·재위에서 실제로 참조 중인 정의는 건드리지 않는다. 유형이 바뀌면 그 정의를 쓰던
 * 화면들의 필터 집합(수반/각료)에서 빠지거나 들어오면서 기존 기록의 노출이 흔들릴 수 있기 때문이다.
 *
 * 실행: npx tsx apps/api/prisma/scripts/reclassify-position-definitions.ts [--apply]
 */

const RECLASSIFICATIONS: Array<{
  title: string
  from: string
  to: string
  why: string
}> = [
  {
    title: '부통령',
    from: 'HEAD_OF_STATE',
    to: 'DEPUTY_HEAD_OF_STATE',
    why:
      '스키마 정의부터 "국가원수의 부직 — 행정부 각료로 cabinetId에 소속". ' +
      'HEAD_OF_STATE로 두면 각료 추가 플로우(MINISTER_POSITION_TYPES)에서 빠져 부통령을 못 고른다.',
  },
]

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const apply = process.argv.includes('--apply')
  const prisma = new PrismaService({ useAdapter: true })

  try {
    for (const entry of RECLASSIFICATIONS) {
      const definition = await prisma.governmentPositionDefinition.findFirst({
        where: { title: entry.title, positionType: entry.from as any },
      })
      if (!definition) {
        console.log(`  ⏭️  ${entry.title} (${entry.from}) — 이미 재분류됐거나 정의 없음`)
        continue
      }

      const [tenureCount, reignCount] = await Promise.all([
        prisma.governmentPositionTenure.count({
          where: { positionDefinitionId: definition.id },
        }),
        prisma.sovereignReign.count({ where: { positionDefinitionId: definition.id } }),
      ])
      if (tenureCount + reignCount > 0) {
        console.log(
          `  ⚠️  ${entry.title} — 사용 중(재임 ${tenureCount} / 재위 ${reignCount})이라 건너뜀. ` +
            '수동으로 영향 범위를 확인한 뒤 재분류하세요.',
        )
        continue
      }

      console.log(`  ✅ ${entry.title}: ${entry.from} → ${entry.to}`)
      console.log(`      이유: ${entry.why}`)
      if (apply) {
        await prisma.governmentPositionDefinition.update({
          where: { id: definition.id },
          data: { positionType: entry.to as any },
        })
      }
    }
    console.log(`\n${apply ? '✅ 적용 완료' : '🔍 드라이런 — 반영하려면 --apply'}\n`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error('\n❌ 재분류 실패:', err)
  process.exit(1)
})
