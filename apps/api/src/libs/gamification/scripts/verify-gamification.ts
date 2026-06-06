/**
 * 런타임 검증(읽기 전용): 백필 후 게이미피케이션 신규 경로가 실데이터로 동작하는지 확인.
 * - getAvailableCountries(): 국가 셀렉터 목록
 * - getLeaderboard(country): 국가 슬라이스 순위
 * - getBadges(account): 카탈로그에 지역/시대 전문가 뱃지 노출 + 진행도
 *
 * 실행: npx ts-node apps/api/src/libs/gamification/scripts/verify-gamification.ts
 */
import { config } from 'dotenv'
import * as path from 'path'
import { PrismaService } from '../../../../prisma/prisma.service'
import { PointService } from '../application/point.service'

const dir = __dirname
config({ path: path.resolve(dir, '../../../../../../env.development') })
config({ path: path.resolve(dir, '../../../../../../.env') })

const prisma = new PrismaService({ log: false })
const points = new PointService(prisma)

async function main() {
  console.log('── 국가 셀렉터 (getAvailableCountries) ──')
  const countries = await points.getAvailableCountries()
  console.log(countries.length ? countries : '(국가 버킷 없음)')

  if (countries.length > 0) {
    const top = countries[0]
    console.log(`\n── 국가 리더보드: ${top.name} (${top.countryId}) ──`)
    const lb = await points.getLeaderboard(10, undefined, 'all', undefined, top.countryId)
    console.log(lb.map((r) => `#${r.rank} ${r.username} ${r.totalPoints}P (등록 ${r.contributionCount})`))
  }

  console.log('\n── 세기 셀렉터 (getAvailableCenturies) ──')
  console.log(await points.getAvailableCenturies())

  const acc = await prisma.account.findFirst({
    where: { totalPoints: { gt: 0 } },
    orderBy: { totalPoints: 'desc' },
    select: { id: true, username: true },
  })
  if (acc) {
    console.log(`\n── 뱃지 카탈로그 (계정 ${acc.username}) — 신규 전문가 뱃지만 ──`)
    const badges = await points.getBadges(acc.id)
    const specialist = badges.filter((b) => b.code.startsWith('COUNTRY_SPECIALIST') || b.code.startsWith('CENTURY_SPECIALIST'))
    console.log(specialist.map((b) => `${b.code} "${b.label}" ${b.current}/${b.target} ${b.earned ? '✅획득' : ''}`))
  } else {
    console.log('\n(점수 보유 계정 없음 — 뱃지 검증 생략)')
  }
  console.log('\n✅ 검증 완료')
}

main()
  .catch((e) => {
    console.error('❌ 검증 실패:', e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
