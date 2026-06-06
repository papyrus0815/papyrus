/**
 * '대통령(연방)' GovernmentPositionDefinition을 일반 '대통령'으로 통합.
 * positionType이 동일(HEAD_OF_STATE)하고 표시명만 달랐으므로, 이 정의를 참조하는
 * 재임/재위 행을 '대통령'으로 재지정한 뒤 '대통령(연방)' 정의 행을 삭제한다.
 *
 * 참조 모델: GovernmentPositionTenure.positionDefinitionId, SovereignReign.positionDefinitionId
 *
 * 실행: npx tsx apps/api/prisma/scripts/merge-federal-president-into-president.ts
 */
import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'

async function main() {
  const envPath = path.resolve(process.cwd(), 'env.development')
  dotenv.config({ path: envPath })

  const prisma = new PrismaService({ useAdapter: true })
  try {
    const federal = await prisma.governmentPositionDefinition.findFirst({
      where: { title: '대통령(연방)', positionType: 'HEAD_OF_STATE' as any },
    })
    if (!federal) {
      console.log("  ✅ '대통령(연방)' 정의 없음 — 통합할 데이터 없음. 종료.")
      return
    }

    const president = await prisma.governmentPositionDefinition.findFirst({
      where: { title: '대통령', positionType: 'HEAD_OF_STATE' as any },
    })
    if (!president) {
      console.error("  ⚠️  대상 '대통령' 정의가 없음 — 중단(시드를 먼저 실행하세요).")
      return
    }

    console.log(`  '대통령(연방)' id=${federal.id} → '대통령' id=${president.id} 통합`)

    const tenureCount = await prisma.governmentPositionTenure.count({
      where: { positionDefinitionId: federal.id },
    })
    const reignCount = await prisma.sovereignReign.count({
      where: { positionDefinitionId: federal.id },
    })
    console.log(`  재지정 대상 — 재임(Tenure): ${tenureCount}건, 재위(SovereignReign): ${reignCount}건`)

    if (tenureCount > 0) {
      await prisma.governmentPositionTenure.updateMany({
        where: { positionDefinitionId: federal.id },
        data: { positionDefinitionId: president.id },
      })
      console.log(`  🔧 Tenure ${tenureCount}건 재지정 완료`)
    }
    if (reignCount > 0) {
      await prisma.sovereignReign.updateMany({
        where: { positionDefinitionId: federal.id },
        data: { positionDefinitionId: president.id },
      })
      console.log(`  🔧 SovereignReign ${reignCount}건 재지정 완료`)
    }

    await prisma.governmentPositionDefinition.delete({ where: { id: federal.id } })
    console.log("  🗑️  '대통령(연방)' 정의 삭제 완료")
    console.log('  ✅ 통합 완료')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
