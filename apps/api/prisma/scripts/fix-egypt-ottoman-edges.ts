import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'

/**
 * 오스만령 이집트(1517~1805) 등록에 따른 일회성 정정 — 행이 없던 시절의 대체 엣지 2개를 지운다.
 *
 *  - '맘루크 술탄국 → 오스만 제국' (CONQUEST)      → 이제 '맘루크 술탄국 → 오스만령 이집트'
 *  - '오스만 제국 → 이집트 헤디브국' (INDEPENDENCE) → 이제 '오스만령 이집트 → 이집트 헤디브국'
 *
 * egypt relations 시더는 create-only(쌍이 있으면 skip)라 이미 만들어진 옛 엣지를 지우지 못한다.
 * 멱등: 오스만령 이집트 행이 있을 때만(=새 경로가 갖춰졌을 때만) 지우고, 없으면 아무것도 안 한다.
 * transition id는 다른 테이블이 참조하지 않아 삭제가 안전하다(fix-italy-odoacer-edge.ts 패턴).
 * 레포 루트에서: npx ts-node apps/api/prisma/scripts/run-egypt-hc-seed.ts
 *            → npx ts-node apps/api/prisma/scripts/fix-egypt-ottoman-edges.ts
 */
async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    const [mamluk, ottoman, ottomanEgypt, khedivate] = await Promise.all(
      ['맘루크 술탄국', '오스만 제국', '오스만령 이집트', '이집트 헤디브국'].map((name) =>
        prisma.historicalCountry.findFirst({ where: { name }, select: { id: true } }),
      ),
    )
    if (!ottomanEgypt) {
      console.log('⚠️  오스만령 이집트 행이 아직 없음 — run-egypt-hc-seed.ts를 먼저 실행한 뒤 다시 돌릴 것')
      return
    }
    if (!ottoman) {
      console.log('⚠️  오스만 제국 행이 없음 — 정정 대상 없음')
      return
    }
    const stale = [
      mamluk && { label: '맘루크 술탄국 → 오스만 제국', predecessorId: mamluk.id, successorId: ottoman.id },
      khedivate && { label: '오스만 제국 → 이집트 헤디브국', predecessorId: ottoman.id, successorId: khedivate.id },
    ].filter((edge): edge is { label: string; predecessorId: string; successorId: string } => Boolean(edge))
    for (const edge of stale) {
      const removed = await prisma.historicalCountryTransition.deleteMany({
        where: { predecessorId: edge.predecessorId, successorId: edge.successorId },
      })
      console.log(
        removed.count > 0
          ? `✅ 옛 엣지 삭제: ${edge.label} (${removed.count}건)`
          : `♻️  옛 엣지 없음 — 이미 정정됨: ${edge.label}`,
      )
    }
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('\n✨ 오스만령 이집트 계승 엣지 정정 완료\n'))
  .catch((err) => {
    console.error('\n❌ 정정 실패:', err)
    process.exit(1)
  })
