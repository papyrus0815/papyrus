/**
 * 국가 미상 인물 진단 스크립트
 *
 * Person.countryId가 NULL이거나 PersonCountryAffiliation이 0건인 인물들을 나열,
 * 추론 가능한 단서(birthPlaceText·dynasty·sovereignReign·tenure 등)와 함께 출력.
 *
 * 실행: node -r ./prisma-seed-loader.js ./node_modules/.bin/tsx \
 *   apps/api/prisma/scripts/diagnose-missing-country.ts
 */
import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'

async function main() {
  const envPath = path.resolve(process.cwd(), 'env.development')
  dotenv.config({ path: envPath })

  const prisma = new PrismaService({ useAdapter: true })
  try {
    const persons = await prisma.person.findMany({
      where: {
        OR: [
          { countryId: null },
          { countryAffiliations: { none: {} } },
        ],
      },
      select: {
        id: true,
        name: true,
        surname: true,
        originalName: true,
        countryId: true,
        birthPlaceText: true,
        deathPlaceText: true,
        birthDate: true,
        deathDate: true,
        dynasty: { select: { name: true } },
        countryAffiliations: {
          select: {
            affiliationType: true,
            country: { select: { isoCode: true, name: true } },
            historicalCountry: { select: { name: true } },
          },
        },
        sovereignReigns: {
          select: {
            historicalCountry: { select: { name: true } },
            country: { select: { isoCode: true, name: true } },
          },
          take: 3,
        },
      },
      orderBy: [{ birthDate: 'asc' }, { name: 'asc' }],
    })

    console.log(`\n=== 국가 정보 누락 인물 총 ${persons.length}명 ===\n`)

    const noAffiliation: typeof persons = []
    const affiliationButNoCountry: typeof persons = []

    for (const p of persons) {
      if (p.countryAffiliations.length === 0) {
        noAffiliation.push(p)
      } else if (!p.countryId) {
        affiliationButNoCountry.push(p)
      }
    }

    console.log(`[A] PersonCountryAffiliation 0건 — ${noAffiliation.length}명`)
    console.log(`[B] Affiliation은 있으나 Person.countryId NULL — ${affiliationButNoCountry.length}명\n`)

    console.log('--- A: Affiliation 자체가 없는 인물 ---')
    for (const p of noAffiliation) {
      const full = [p.surname, p.name].filter(Boolean).join(' ')
      const by = p.birthDate?.getUTCFullYear() ?? '?'
      const dy = p.deathDate?.getUTCFullYear() ?? '?'
      const dynastyStr = p.dynasty?.name ?? '-'
      const reignStr = p.sovereignReigns
        .map((r) => r.historicalCountry?.name ?? r.country?.name ?? '?')
        .join(', ') || '-'
      const place = (p.birthPlaceText ?? p.deathPlaceText ?? '').slice(0, 40)
      console.log(
        `  ${p.originalName ?? full} (${full}) [${by}~${dy}]\n` +
          `    dynasty=${dynastyStr} | reigns=[${reignStr}] | place=${place}`,
      )
    }

    if (affiliationButNoCountry.length > 0) {
      console.log('\n--- B: Affiliation 있으나 countryId NULL ---')
      for (const p of affiliationButNoCountry) {
        const full = [p.surname, p.name].filter(Boolean).join(' ')
        const aff = p.countryAffiliations
          .map(
            (a) =>
              `${a.country?.name ?? a.historicalCountry?.name ?? '?'}(${a.affiliationType})`,
          )
          .join(', ')
        console.log(`  ${p.originalName ?? full}: ${aff}`)
      }
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error('❌', e)
  process.exit(1)
})
