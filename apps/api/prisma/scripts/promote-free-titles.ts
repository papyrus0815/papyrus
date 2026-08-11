import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'

/**
 * 자유입력 직책 → 관직 정의 승격 (1회성, 멱등).
 *
 * 카탈로그에 자리가 없어 `positionDefinitionId=NULL`로만 저장돼 있던 재임 행에 정의를 연결한다.
 * **표시는 하나도 바뀌지 않는다** — 서버 표시 규칙이 `title ?? positionDefinition.title`이라
 * 재임 행의 title('광저우 영국 영사')을 그대로 두고 definitionId만 채우기 때문이다.
 * 얻는 것은 구조화: 직위 유형이 정확해지고(SPECIAL_POSITION → DIPLOMATIC_POST),
 * 같은 직책을 쓰는 다른 인물이 피커에서 바로 고를 수 있게 된다.
 *
 * 매핑은 명시 테이블만 쓴다. 부분 문자열 추론은 '주일 프랑스 특명전권공사'를 '공사'로 잘못 접거나
 * 엉뚱한 정의에 붙일 수 있어 쓰지 않는다. 표에 없는 자유입력(러시아 제국 군직 등 인물 고유 보직)은
 * 손대지 않고 그대로 둔다 — 카탈로그에 올릴 성격이 아니다.
 *
 * 실행: npx tsx apps/api/prisma/scripts/promote-free-titles.ts [--apply]
 *       (--apply 없이 실행하면 무엇을 바꿀지만 출력한다)
 */

/**
 * 재임 행의 title → 승격할 정의 (title, positionType).
 *
 * ⚠️ **표기가 정확히 같은 것만 넣는다.** web-admin의 표시 지면 20여 곳이
 * `positionDefinition?.title ?? title` 순서라, 정의를 붙이는 순간 재임 행의 title은
 * 화면에서 사라진다. 그래서 '광저우 영국 영사' → 정의 '영사' 같은 승격은 **하면 안 된다**
 * (주재지가 지워져 네 명의 영사가 전부 '영사'로 보인다). 주재지·소속이 붙는 직함은
 * 자유입력으로 두고, 피커의 '이 국가에서 쓰인 직책' 그룹이 다음 사람에게 되살려 준다.
 * 아래 안전장치(title !== definition.title이면 skip)가 이 규칙을 코드로도 강제한다.
 */
const PROMOTION_MAP: Record<string, { title: string; positionType: string }> = {
  // ── 도쿠가와 막부 봉행 — 정의와 표기가 같다
  외국봉행: { title: '외국봉행', positionType: 'CABINET_MINISTER' },
  감정봉행: { title: '감정봉행', positionType: 'CABINET_MINISTER' },
  군함봉행: { title: '군함봉행', positionType: 'CABINET_MINISTER' },
  보병봉행: { title: '보병봉행', positionType: 'CABINET_MINISTER' },
  // ── 정의가 이미 있었는데도 자유입력으로 저장돼 있던 것들
  외무장관: { title: '외무장관', positionType: 'CABINET_MINISTER' },
  내무장관: { title: '내무장관', positionType: 'CABINET_MINISTER' },
  전쟁장관: { title: '전쟁장관', positionType: 'CABINET_MINISTER' },
}

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const apply = process.argv.includes('--apply')
  const prisma = new PrismaService({ useAdapter: true })

  try {
    const rows = await prisma.governmentPositionTenure.findMany({
      where: { positionDefinitionId: null },
      select: { id: true, title: true, positionType: true },
    })
    console.log(`\n🔎 자유입력 재임 ${rows.length}행 검사`)

    let promoted = 0
    let untouched = 0

    for (const row of rows) {
      const key = (row.title ?? '').trim()
      const target = PROMOTION_MAP[key]
      if (!target) {
        untouched++
        console.log(`  ⏭️  ${key || '(제목 없음)'} — 매핑 없음(그대로 둠)`)
        continue
      }
      const definition = await prisma.governmentPositionDefinition.findFirst({
        where: { title: target.title, positionType: target.positionType as any },
      })
      if (!definition) {
        untouched++
        console.log(`  ⚠️  ${key} → 정의 '${target.title}' 없음 — 시드를 먼저 실행하세요`)
        continue
      }
      // 표기가 다르면 승격 금지 — 정의를 붙이는 순간 재임 행의 title이 화면에서 사라진다
      if (definition.title !== key) {
        untouched++
        console.log(
          `  ⛔ ${key} → 정의 '${definition.title}'와 표기가 달라 승격하지 않음(표시 유실 방지)`,
        )
        continue
      }
      console.log(
        `  ✅ ${key} → 정의 '${definition.title}' (${definition.positionType})` +
          `${row.positionType !== definition.positionType ? ` · 유형 ${row.positionType}→${definition.positionType}` : ''}`,
      )
      if (apply) {
        await prisma.governmentPositionTenure.update({
          where: { id: row.id },
          data: {
            positionDefinitionId: definition.id,
            // 표기(title)는 손대지 않는다 — 주재지가 사라지면 안 된다
            positionType: definition.positionType,
          },
        })
      }
      promoted++
    }

    console.log(
      `\n${apply ? '✅ 적용' : '🔍 미적용(드라이런)'} — 승격 ${promoted}행 / 유지 ${untouched}행`,
    )
    if (!apply) console.log('   실제 반영하려면 --apply 를 붙여 다시 실행하세요.\n')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error('\n❌ 승격 실패:', err)
  process.exit(1)
})
