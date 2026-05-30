/**
 * 카보우르 출생지 정정 — 1810년 토리노는 사르데냐 왕국이 아니라 나폴레옹의
 * 프랑스 제1제국 병합기(포 도, département du Pô, 1802~1814)였다.
 *
 * 최초 시드에서 birthPlaceText·BIRTH_PLACE 소속을 "사르데냐 왕국"으로 잘못 등록한 것을 정정:
 *  - birthPlaceText 갱신 + 출생 연보 설명 갱신
 *  - 소속: 사르데냐 왕국 BIRTH_PLACE 행 삭제 → 프랑스 제1제국 BIRTH_PLACE + 사르데냐 왕국 CITIZENSHIP
 *  (이탈리아 왕국 CITIZENSHIP는 그대로)
 *
 * 시드는 "기존 데이터 보존 모드"라 재실행으로는 갱신되지 않으므로 이 일회성 교정이 필요.
 * 실행: node -r ./prisma-seed-loader.js ./node_modules/.bin/tsx apps/api/prisma/scripts/fix-cavour-birthplace.ts
 */
import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'

const NEW_BIRTH_PLACE =
  '토리노(Torino) — 출생 당시(1810) 프랑스 제1제국 병합기(포 도/département du Pô). 1814년 사르데냐 왕국으로 환원'
const NEW_BIRTH_EVENT_DESC =
  '토리노(출생 당시 프랑스 제1제국 병합기)의 피에몬테 귀족 가문 차남으로 출생. "카보우르 백작" 칭호를 씀.'

async function main() {
  const envPath = path.resolve(process.cwd(), 'env.development')
  dotenv.config({ path: envPath })

  const prisma = new PrismaService({ useAdapter: true })
  try {
    const cavour = await prisma.person.findFirst({
      where: { originalName: 'Camillo Benso, Count of Cavour' },
      select: { id: true, birthPlaceText: true },
    })
    if (!cavour) {
      console.warn('  ⚠️  카보우르 미존재 — seedCavour 먼저 실행 필요')
      return
    }

    const sardinia = await prisma.historicalCountry.findFirst({
      where: { name: '사르데냐 왕국' }, select: { id: true },
    })
    const firstEmpire = await prisma.historicalCountry.findFirst({
      where: { name: '프랑스 제1제국' }, select: { id: true },
    })
    if (!sardinia || !firstEmpire) {
      console.warn('  ⚠️  사르데냐 왕국/프랑스 제1제국 HC 미존재 — 중단')
      return
    }

    // 1) birthPlaceText 갱신
    await prisma.person.update({
      where: { id: cavour.id },
      data: { birthPlaceText: NEW_BIRTH_PLACE },
    })
    console.log('  🔧 birthPlaceText 갱신')

    // 2) 출생 연보 설명 갱신
    const birthEvent = await prisma.personLifeEvent.findFirst({
      where: { personId: cavour.id, title: '토리노 출생' },
      select: { id: true },
    })
    if (birthEvent) {
      await prisma.personLifeEvent.update({
        where: { id: birthEvent.id },
        data: { description: NEW_BIRTH_EVENT_DESC },
      })
      console.log('  🔧 출생 연보 설명 갱신')
    }

    // 3) 소속 정정 — 잘못된 사르데냐 BIRTH_PLACE 삭제
    const delResult = await prisma.personCountryAffiliation.deleteMany({
      where: {
        personId: cavour.id,
        historicalCountryId: sardinia.id,
        affiliationType: 'BIRTH_PLACE',
      },
    })
    if (delResult.count > 0) console.log(`  🗑️  사르데냐 왕국 BIRTH_PLACE 삭제 (${delResult.count})`)

    // 4) 프랑스 제1제국 BIRTH_PLACE + 사르데냐 왕국 CITIZENSHIP 보장(없으면 생성)
    const ensure = async (
      historicalCountryId: string,
      affiliationType: 'BIRTH_PLACE' | 'CITIZENSHIP',
      priority: number,
      label: string,
    ) => {
      const exists = await prisma.personCountryAffiliation.findFirst({
        where: { personId: cavour.id, historicalCountryId, affiliationType: affiliationType as any },
      })
      if (exists) {
        console.log(`  ⏭️  소속 이미 존재: ${label}`)
        return
      }
      await prisma.personCountryAffiliation.create({
        data: {
          personId: cavour.id,
          historicalCountryId,
          affiliationType: affiliationType as any,
          priority,
        },
      })
      console.log(`  ✅ 소속 생성: ${label}`)
    }
    await ensure(firstEmpire.id, 'BIRTH_PLACE', 2, '프랑스 제1제국 (1810 출생 당시 토리노 병합기)')
    await ensure(sardinia.id, 'CITIZENSHIP', 1, '사르데냐 왕국 (시민·총리)')

    // 결과 확인
    const after = await prisma.personCountryAffiliation.findMany({
      where: { personId: cavour.id },
      select: {
        affiliationType: true,
        historicalCountry: { select: { name: true } },
      },
      orderBy: { priority: 'asc' },
    })
    console.log('  현재 소속:', after.map((a) => `${a.historicalCountry?.name}/${a.affiliationType}`).join(', '))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error('\n❌ 교정 실패:', e)
  process.exit(1)
})
