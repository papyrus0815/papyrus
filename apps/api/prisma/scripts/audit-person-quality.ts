/**
 * 등록된 Person들의 데이터 품질 audit.
 *
 *  1) 사망정보 누락 (deathDate·deathType·deathCause·deathNote)
 *  2) 재임 누락 (SovereignReign 또는 GovernmentPositionTenure 0건인 군주)
 *  3) biography 미작성 또는 너무 짧음
 *  4) 특수문자 과용 (①②③, 〈〉, 【】 사용 빈도)
 */
import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'

const SPECIAL_CHARS = ['①', '②', '③', '④', '⑤', '〈', '〉', '【', '】', '◆', '◇', '★']

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    const total = await prisma.person.count()
    console.log(`\n=== 전체 Person: ${total}명 ===\n`)

    // 1) 사망정보 누락
    const now = new Date()
    const noDeathDate = await prisma.person.count({
      where: {
        AND: [
          { deathDate: null },
          { birthDate: { lt: new Date(now.getFullYear() - 110, 0, 1) } }, // 생몰 110년 이전이면 사망 확실
        ],
      },
    })
    const noDeathType = await prisma.person.count({
      where: { AND: [{ deathDate: { not: null } }, { deathType: null }] },
    })
    const noDeathCause = await prisma.person.count({
      where: { AND: [{ deathDate: { not: null } }, { deathCause: null }] },
    })
    const noDeathNote = await prisma.person.count({
      where: { AND: [{ deathDate: { not: null } }, { deathNote: null }] },
    })
    console.log('## 사망정보 누락')
    console.log(`  deathDate 없음 (탄생 110년+ 경과): ${noDeathDate}`)
    console.log(`  deathType 없음 (deathDate 있음):    ${noDeathType}`)
    console.log(`  deathCause 없음 (deathDate 있음):   ${noDeathCause}`)
    console.log(`  deathNote 없음 (deathDate 있음):    ${noDeathNote}`)

    // 사망정보 누락 인물 샘플 30
    const samplesNoDeathType = await prisma.person.findMany({
      where: { AND: [{ deathDate: { not: null } }, { deathType: null }] },
      select: { id: true, originalName: true, name: true, surname: true, birthDate: true, deathDate: true },
      take: 30,
      orderBy: { birthDate: 'asc' },
    })
    console.log(`\n## 사망정보(deathType) 누락 샘플 (최대 30명):`)
    for (const p of samplesNoDeathType) {
      const by = p.birthDate?.getUTCFullYear() ?? '?'
      const dy = p.deathDate?.getUTCFullYear() ?? '?'
      console.log(`  - ${p.originalName ?? '(no originalName)'} (${p.name} ${p.surname ?? ''}) [${by}~${dy}]`)
    }

    // 2) biography 짧거나 없음
    const noBio = await prisma.person.count({ where: { biography: null } })
    const allWithBio = await prisma.person.findMany({
      where: { biography: { not: null } },
      select: { id: true, biography: true },
    })
    const shortBio = allWithBio.filter((p) => (p.biography?.length ?? 0) < 200).length
    const mediumBio = allWithBio.filter((p) => {
      const l = p.biography?.length ?? 0
      return l >= 200 && l < 1000
    }).length
    const richBio = allWithBio.filter((p) => (p.biography?.length ?? 0) >= 1000).length
    console.log('\n## biography 길이 분포')
    console.log(`  null:        ${noBio}`)
    console.log(`  <200자:      ${shortBio}`)
    console.log(`  200~1000자:  ${mediumBio}`)
    console.log(`  >=1000자:    ${richBio}`)

    // 3) 군주인데 재임 누락
    // SovereignReign 0건이지만 dynasty 가입된 인물 = 군주일 가능성
    const reignedPersonIds = new Set(
      (await prisma.sovereignReign.findMany({ select: { personId: true } })).map((r) => r.personId),
    )
    const tenurePersonIds = new Set(
      (await prisma.governmentPositionTenure.findMany({ select: { personId: true } })).map((r) => r.personId),
    )
    const monarchCandidates = await prisma.person.findMany({
      where: { dynastyId: { not: null } },
      select: { id: true, originalName: true, name: true, surname: true, dynasty: { select: { name: true } } },
    })
    const noReign = monarchCandidates.filter(
      (p) => !reignedPersonIds.has(p.id) && !tenurePersonIds.has(p.id),
    )
    console.log(`\n## 가문 가입 인물 ${monarchCandidates.length}명 중 재임 0건: ${noReign.length}명`)
    for (const p of noReign.slice(0, 30)) {
      console.log(`  - ${p.originalName ?? '(no originalName)'} (${p.name} ${p.surname ?? ''}) — ${p.dynasty?.name}`)
    }
    if (noReign.length > 30) console.log(`  ... 외 ${noReign.length - 30}명`)

    // 4) 특수문자 사용 빈도
    const personsWithBio = await prisma.person.findMany({
      where: { biography: { not: null } },
      select: { id: true, originalName: true, biography: true },
    })
    type SpecCount = { name: string; total: number; persons: number }
    const counts: SpecCount[] = SPECIAL_CHARS.map((c) => ({ name: c, total: 0, persons: 0 }))
    let worstPerson: { name: string; count: number } | null = null
    for (const p of personsWithBio) {
      const bio = p.biography ?? ''
      let personSum = 0
      for (let i = 0; i < SPECIAL_CHARS.length; i++) {
        const re = new RegExp(SPECIAL_CHARS[i], 'g')
        const matches = bio.match(re)
        if (matches) {
          counts[i].total += matches.length
          counts[i].persons += 1
          personSum += matches.length
        }
      }
      if (personSum > 0 && (!worstPerson || personSum > worstPerson.count)) {
        worstPerson = { name: p.originalName ?? p.id, count: personSum }
      }
    }
    console.log('\n## 특수문자 사용 빈도 (biography 본문)')
    for (const c of counts) {
      console.log(`  ${c.name}: 총 ${c.total}회 / ${c.persons}명`)
    }
    if (worstPerson) console.log(`  최다 사용 인물: ${worstPerson.name} (${worstPerson.count}회)`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
