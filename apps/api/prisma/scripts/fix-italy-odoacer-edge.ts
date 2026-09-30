import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'

/**
 * 오도아케르 왕국(476~493) 등록에 따른 일회성 정정 — 기존 계승 엣지 '서로마 제국 → 동고트 왕국'을 지운다.
 *
 * 오도아케르 왕국 행이 없던 시절 italy relations 시드는 서로마(476 멸망)를 동고트(493 성립)에
 * 바로 이어 17년 공백을 가렸다. 시드는 이제 '서로마 → 오도아케르 → 동고트' 두 엣지를 만들지만,
 * 시더는 create-only(쌍이 있으면 skip)라 이미 만들어진 옛 직결 엣지를 지우지 못한다.
 *
 * 멱등: 오도아케르 왕국 행이 있을 때만(=새 경로가 갖춰졌을 때만) 옛 엣지를 지우고, 없으면 아무것도 안 한다.
 * transition id는 다른 테이블이 참조하지 않아 삭제가 안전하다.
 * 레포 루트에서: npx ts-node apps/api/prisma/scripts/fix-italy-odoacer-edge.ts
 * (그 다음 run-italy-hc-seed.ts — 순서는 무관, 둘 다 멱등)
 */
async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    const [westernRome, odoacer, ostrogoths] = await Promise.all(
      ['서로마 제국', '오도아케르 왕국', '동고트 왕국'].map((name) =>
        prisma.historicalCountry.findFirst({ where: { name }, select: { id: true } }),
      ),
    )
    if (!westernRome || !ostrogoths) {
      console.log('⚠️  서로마 제국 또는 동고트 왕국 행이 없음 — 정정 대상 없음')
      return
    }
    if (!odoacer) {
      console.log('⚠️  오도아케르 왕국 행이 아직 없음 — run-italy-hc-seed.ts를 먼저 실행한 뒤 다시 돌릴 것')
      return
    }
    const removed = await prisma.historicalCountryTransition.deleteMany({
      where: { predecessorId: westernRome.id, successorId: ostrogoths.id },
    })
    console.log(
      removed.count > 0
        ? `✅ 옛 직결 엣지 삭제: 서로마 제국 → 동고트 왕국 (${removed.count}건)`
        : '♻️  옛 직결 엣지 없음 — 이미 정정됨',
    )
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('\n✨ 오도아케르 계승 엣지 정정 완료\n'))
  .catch((err) => {
    console.error('\n❌ 정정 실패:', err)
    process.exit(1)
  })
