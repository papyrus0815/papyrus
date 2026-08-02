import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'

/**
 * 몰다비아 왈라키아 연합공국(1859~1881) 단일 행을 1866 기점으로 분할하기 위한 일회성 정정.
 * - 기존 행을 1859-01~1866-05로 단축하고 description을 쿠자 시대로 한정
 * - 기존 계승 엣지(연합공국→루마니아 왕국)를 삭제 — 분할 후 루마니아 공국→왕국으로 재배선됨
 * 이후 run-romania-hc-seed.ts를 재실행하면 루마니아 공국 행·신규 엣지·소속이 생성된다.
 */
async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    const united = await prisma.historicalCountry.findFirst({
      where: { name: '몰다비아 왈라키아 연합공국' },
    })
    if (!united) {
      console.log('⚠️  몰다비아 왈라키아 연합공국 행이 없음 — 정정 불필요(시드가 분할된 형태로 생성함)')
      return
    }

    if (united.endYear !== 1866) {
      await prisma.historicalCountry.update({
        where: { id: united.id },
        data: {
          endYear: 1866,
          endMonth: 5,
          description:
            '1859년 1월 몰다비아와 왈라키아가 알렉산드루 이오안 쿠자를 공(公)으로 동시에 선출하며 성립한 동군연합. ' +
            '1862년 단일 정부·의회로 통합해 국호를 루마니아로 정했고, ' +
            '쿠자는 토지 개혁과 교육 개혁, 수도원 재산 세속화를 밀어붙였다. ' +
            '1866년 2월 쿠데타로 쿠자가 퇴위하면서 호엔촐레른 가문의 카롤을 맞아들인 루마니아 공국으로 이어졌다.',
        },
      })
      console.log('✅ 연합공국 행 단축: 1859-01~1866-05 + description 갱신')
    } else {
      console.log('♻️  연합공국 행은 이미 1866 종료')
    }

    const kingdom = await prisma.historicalCountry.findFirst({
      where: { name: '루마니아 왕국' },
    })
    if (kingdom) {
      const stale = await prisma.historicalCountryTransition.findFirst({
        where: { predecessorId: united.id, successorId: kingdom.id },
      })
      if (stale) {
        await prisma.historicalCountryTransition.delete({ where: { id: stale.id } })
        console.log('✅ 구 엣지 삭제: 연합공국 → 루마니아 왕국 (루마니아 공국→왕국으로 재배선 예정)')
      } else {
        console.log('♻️  구 엣지 없음(이미 재배선됨)')
      }
    }
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('\n✨ 연합공국 분할 정정 완료 — 이어서 run-romania-hc-seed.ts 실행 필요\n'))
  .catch((err) => { console.error('\n❌ 정정 실패:', err); process.exit(1) })
