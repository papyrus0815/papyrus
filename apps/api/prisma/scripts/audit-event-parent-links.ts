import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'

/**
 * 사건 추가 상위 링크(event_parent_link) 불변식 상시 헬스체크.
 * docs/event-multi-parent-review.md §4.8 — 불변식이 앱 레이어 전용이라는 최대 약점의
 * 상시 방어. 배포·마이그·대량 시드 후, 또는 계층 이상 제보 시 실행한다.
 *
 *   npx ts-node apps/api/prisma/scripts/audit-event-parent-links.ts
 *
 * 검사 3종:
 *  [필수 0행] INV 위반 — INV-1 주 상위 중복 엣지 · INV-2 주 상위 없는 자식의 엣지 ·
 *             INV-3 자기참조
 *  [정보성]  유령 주 상위(소프트삭제)인데 살아있는 추가 상위 보유
 *  [필수 0행] 순환 — '주 상위 FK ∪ 엣지' 합집합 그래프 재귀 CTE(깊이 캡 50).
 *             검증-쓰기 레이스(리뷰 V1-5)로 유입된 순환의 사후 검출.
 *
 * 위반 발견 시: 행을 눈으로 확인 후 해당 엣지 삭제(또는 주 상위 지정)로 수리 —
 * 읽기 경로는 위반 엣지를 응답에서 격리하므로 blast는 '숨은 고아 엣지' 수준에 갇힌다.
 */
async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  let violations = 0
  try {
    console.log('\n=== event_parent_link 불변식 감사 ===')

    // [필수 0행] INV-1·2·3 위반
    const invRows = await prisma.$queryRaw<
      Array<{ id: string; child_event_id: string; parent_event_id: string; reason: string }>
    >`
      SELECT l.id, l.child_event_id, l.parent_event_id,
             CASE
               WHEN l.child_event_id = l.parent_event_id THEN 'INV-3 자기참조'
               WHEN e.parent_event_id IS NULL THEN 'INV-2 주 상위 없는 자식의 엣지'
               ELSE 'INV-1 주 상위 중복 엣지'
             END AS reason
      FROM event_parent_link l
      JOIN event e ON e.id = l.child_event_id
      WHERE e.parent_event_id IS NULL
         OR e.parent_event_id = l.parent_event_id
         OR l.child_event_id = l.parent_event_id`
    console.log(`\n[필수 0행] 불변식 위반: ${invRows.length}건`)
    for (const row of invRows) {
      console.log(`  - ${row.reason}: link=${row.id} child=${row.child_event_id} parent=${row.parent_event_id}`)
    }
    violations += invRows.length

    // [정보성] 유령 주 상위 + 살아있는 추가 상위 — 쓰기 가드(유령 신규 409)가 새 유입을
    // 막지만, 링크 후 부모가 소프트삭제되면 이 상태가 합법적으로 남는다(복구 대기).
    const ghostRows = await prisma.$queryRaw<
      Array<{ id: string; title: string; live_extras: bigint }>
    >`
      SELECT e.id, e.title, COUNT(*) AS live_extras
      FROM event e
      JOIN event p ON p.id = e.parent_event_id AND p.deleted_at IS NOT NULL
      JOIN event_parent_link l ON l.child_event_id = e.id
      JOIN event x ON x.id = l.parent_event_id AND x.deleted_at IS NULL
      GROUP BY e.id, e.title`
    console.log(`\n[정보성] 유령 주 상위 + 살아있는 추가 상위: ${ghostRows.length}건`)
    for (const row of ghostRows) {
      console.log(`  - '${row.title}' (${row.id}) — 살아있는 추가 상위 ${row.live_extras}개, 주 상위는 삭제 상태`)
    }

    // [필수 0행] 순환 — FK ∪ 엣지 합집합 그래프 재귀 CTE
    const cycleRows = await prisma.$queryRaw<Array<{ start_id: string }>>`
      WITH RECURSIVE edges AS (
        SELECT id AS child_id, parent_event_id AS parent_id FROM event WHERE parent_event_id IS NOT NULL
        UNION ALL
        SELECT child_event_id, parent_event_id FROM event_parent_link
      ), walk (start_id, node_id, depth) AS (
        SELECT child_id, parent_id, 1 FROM edges
        UNION ALL
        SELECT w.start_id, e.parent_id, w.depth + 1
        FROM walk w JOIN edges e ON e.child_id = w.node_id
        WHERE w.depth < 50 AND w.node_id <> w.start_id
      )
      SELECT DISTINCT start_id FROM walk WHERE node_id = start_id`
    console.log(`\n[필수 0행] 순환: ${cycleRows.length}건`)
    for (const row of cycleRows) {
      console.log(`  - 순환 시작점: ${row.start_id}`)
    }
    violations += cycleRows.length

    console.log(
      violations === 0
        ? '\n✅ 필수 검사 전부 0행 — 불변식 유지'
        : `\n❌ 필수 검사 위반 ${violations}건 — 위 행을 확인해 수리하세요`,
    )
    process.exitCode = violations === 0 ? 0 : 1
  } finally {
    await prisma.$disconnect()
  }
}

main()
