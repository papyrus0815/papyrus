/**
 * '신성로마제국' (no-space, 정본) 과 '신성 로마 제국' (공백, 중복) 통합.
 *
 *  - 정본: no-space (rich description, 5 reigns, 4 affiliations 보유)
 *  - 제거: space (17 memberships, 3 transitions 보유 → 정본으로 이동)
 *
 * 마이그레이션 순서:
 *   1) Membership (parent=space) → parent=no-space, 충돌 시 skip
 *   2) Transition (predecessor=space) → no-space, 충돌 시 skip
 *   3) Transition (successor=space) → no-space, 충돌 시 skip
 *   4) space 행 자식 잔존 확인 후 삭제
 *
 * ⚠️ 1회성. 멱등 보장(다음 실행 시에는 no-op).
 */
import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    const noSpace = await prisma.historicalCountry.findFirst({
      where: { name: '신성로마제국' },
    })
    const space = await prisma.historicalCountry.findFirst({
      where: { name: '신성 로마 제국' },
    })
    if (!noSpace) {
      console.warn('  ⚠️  정본 HC "신성로마제국" 미존재 — 중단')
      return
    }
    if (!space) {
      console.log('  ✅ 중복 HC "신성 로마 제국" 없음 — no-op')
      return
    }
    console.log(`\n정본 no-space id=${noSpace.id}`)
    console.log(`중복 space    id=${space.id}\n`)

    // ── 1) Membership (parent=space) → parent=no-space ───────────────────
    const memberships = await prisma.historicalCountryMembership.findMany({
      where: { historicalCountryId: space.id },
    })
    let mMoved = 0
    let mSkipped = 0
    for (const m of memberships) {
      const conflict = await prisma.historicalCountryMembership.findFirst({
        where: {
          historicalCountryId: noSpace.id,
          memberCountryId: m.memberCountryId,
          role: m.role,
        },
      })
      if (conflict) {
        console.log(
          `  ⏭️  membership 중복 (parent=정본·member=${m.memberCountryId}·role=${m.role}) — space 측 삭제`,
        )
        await prisma.historicalCountryMembership.delete({ where: { id: m.id } })
        mSkipped++
        continue
      }
      await prisma.historicalCountryMembership.update({
        where: { id: m.id },
        data: { historicalCountryId: noSpace.id },
      })
      mMoved++
    }
    console.log(`  ✅ Membership 이전: 이동 ${mMoved}, 충돌삭제 ${mSkipped}`)

    // ── 2) Transition (predecessor=space) → no-space ─────────────────────
    const predTrans = await prisma.historicalCountryTransition.findMany({
      where: { predecessorId: space.id },
    })
    let pMoved = 0
    let pSkipped = 0
    for (const t of predTrans) {
      const conflict = await prisma.historicalCountryTransition.findFirst({
        where: {
          predecessorId: noSpace.id,
          successorId: t.successorId,
          eventType: t.eventType,
        },
      })
      if (conflict) {
        console.log(
          `  ⏭️  transition(pred) 중복 (succ=${t.successorId}·event=${t.eventType}) — space 측 삭제`,
        )
        await prisma.historicalCountryTransition.delete({ where: { id: t.id } })
        pSkipped++
        continue
      }
      await prisma.historicalCountryTransition.update({
        where: { id: t.id },
        data: { predecessorId: noSpace.id },
      })
      pMoved++
    }
    console.log(`  ✅ Transition(predecessor) 이전: 이동 ${pMoved}, 충돌삭제 ${pSkipped}`)

    // ── 3) Transition (successor=space) → no-space ───────────────────────
    const succTrans = await prisma.historicalCountryTransition.findMany({
      where: { successorId: space.id },
    })
    let sMoved = 0
    let sSkipped = 0
    for (const t of succTrans) {
      const conflict = await prisma.historicalCountryTransition.findFirst({
        where: {
          predecessorId: t.predecessorId,
          successorId: noSpace.id,
          eventType: t.eventType,
        },
      })
      if (conflict) {
        console.log(
          `  ⏭️  transition(succ) 중복 (pred=${t.predecessorId}·event=${t.eventType}) — space 측 삭제`,
        )
        await prisma.historicalCountryTransition.delete({ where: { id: t.id } })
        sSkipped++
        continue
      }
      await prisma.historicalCountryTransition.update({
        where: { id: t.id },
        data: { successorId: noSpace.id },
      })
      sMoved++
    }
    console.log(`  ✅ Transition(successor) 이전: 이동 ${sMoved}, 충돌삭제 ${sSkipped}`)

    // ── 4) 잔존 확인 + 삭제 ───────────────────────────────────────────────
    const [reigns, affs, mParent, mMember, predLeft, succLeft] = await Promise.all([
      prisma.sovereignReign.count({ where: { historicalCountryId: space.id } }),
      prisma.personCountryAffiliation.count({ where: { historicalCountryId: space.id } }),
      prisma.historicalCountryMembership.count({ where: { historicalCountryId: space.id } }),
      prisma.historicalCountryMembership.count({ where: { memberCountryId: space.id } }),
      prisma.historicalCountryTransition.count({ where: { predecessorId: space.id } }),
      prisma.historicalCountryTransition.count({ where: { successorId: space.id } }),
    ])
    const leftover = reigns + affs + mParent + mMember + predLeft + succLeft
    if (leftover > 0) {
      console.warn(
        `  ⚠️  space 측에 잔존 자식 ${leftover}건 — 삭제 중단 ` +
          `(reigns=${reigns} affs=${affs} mP=${mParent} mM=${mMember} pT=${predLeft} sT=${succLeft})`,
      )
      return
    }
    await prisma.historicalCountry.delete({ where: { id: space.id } })
    console.log(`\n  🗑  중복 HC '신성 로마 제국' 삭제 완료 (id=${space.id})`)
    console.log(`✅ 통합 완료 — 정본 '신성로마제국' (id=${noSpace.id})`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
