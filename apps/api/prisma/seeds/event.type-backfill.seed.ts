import * as fs from 'fs'
import * as path from 'path'

import { PrismaService } from '../prisma.service'

/**
 * 사건 세부 분야(EventType) 채우기 — 사건 시드가 모두 끝난 뒤 마지막에 돈다.
 *
 * 세부는 전 사건을 분류해 정했다(분야의 2단계·독립 축 — libs/db/prisma/event.prisma EventType).
 * 개별 사건 시드마다 세부를 박는 대신 제목→세부 표(data/event-types.json) 하나로 둔다 — 새 DB를
 * 시드해도 같은 분류가 재현되고, 분류를 고칠 때 한 곳만 고친다.
 *
 * 멱등: 세부가 아직 비어 있는(null) 사건만 채운다 — 화면에서 사람이 고친 값을 덮지 않는다.
 */
export async function seedEventTypeBackfill(prisma: PrismaService): Promise<void> {
  console.log('\n🏷️  사건 세부 분야 채우기...')
  const table = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'data', 'event-types.json'), 'utf8'),
  ) as Record<string, string>
  let updated = 0
  for (const [title, type] of Object.entries(table)) {
    const result = await prisma.event.updateMany({
      where: { title, type: null },
      data: { type: type as never },
    })
    updated += result.count
  }
  console.log(`✅ 사건 세부 분야 ${updated}건 채움 (표 ${Object.keys(table).length}건)`)
}
