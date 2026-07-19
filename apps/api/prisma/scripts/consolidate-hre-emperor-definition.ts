import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'

/**
 * 직위 정의 '신성로마황제' → '황제' 통합.
 *
 * 규칙(governmentPositionDefinition.seed.ts 참조): 국가 스코프(historicalCountryId)로
 * 구분되는 일반 칭호는 하나로 통합 — HRE 재위는 이미 신성로마제국 HC에 걸려 있어
 * '황제' 정의로 충분하다. 별도 정의는 어휘가 다른 고정 칭호(천황·교황 등)만 유지.
 *
 * 수행: 참조 FK 3종(sovereign_reign·government_position_tenure·treaty_signatory)을
 * '황제' 정의로 repoint 후 '신성로마황제' 정의 행 삭제. 멱등(이미 없으면 no-op).
 * regnalNumber(18~22)는 표시용 재위 순번 규약이므로 건드리지 않는다.
 */
async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    const hre = await prisma.governmentPositionDefinition.findFirst({
      where: { title: '신성로마황제' },
    })
    if (!hre) {
      console.log('⏭️  신성로마황제 정의 없음 — 이미 통합됨')
      return
    }
    const emperor = await prisma.governmentPositionDefinition.findFirst({
      where: { title: '황제', positionType: 'HEAD_OF_STATE' },
    })
    if (!emperor) {
      throw new Error("'황제' 정의를 찾을 수 없음 — governmentPositionDefinition 시드 선행 필요")
    }

    const [reigns, tenures, signatories] = await prisma.$transaction([
      prisma.sovereignReign.updateMany({
        where: { positionDefinitionId: hre.id },
        data: { positionDefinitionId: emperor.id },
      }),
      prisma.governmentPositionTenure.updateMany({
        where: { positionDefinitionId: hre.id },
        data: { positionDefinitionId: emperor.id },
      }),
      prisma.treatySignatory.updateMany({
        where: { positionDefinitionId: hre.id },
        data: { positionDefinitionId: emperor.id },
      }),
      prisma.governmentPositionDefinition.delete({ where: { id: hre.id } }),
    ])
    console.log(`✅ repoint — 재위 ${reigns.count}건, 재임 ${tenures.count}건, 조약서명 ${signatories.count}건`)
    console.log('✅ 신성로마황제 정의 삭제 완료')
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('\n✨ 신성로마황제 → 황제 통합 완료\n'))
  .catch((err) => { console.error('\n❌ 통합 실패:', err); process.exit(1) })
