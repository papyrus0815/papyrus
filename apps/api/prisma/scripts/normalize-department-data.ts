import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'

/**
 * 국가 기관 데이터 정리 — 2026-11-08 재설계에 맞춘 일회성 보정. 멱등(이미 맞으면 건너뜀).
 *
 * 1. 이름에서 나라 이름 빼기 — '미국 국방부' → '국방부'(countryId=미국이 이미 말한다).
 *    (person.trump-cabinet 시드의 deptName도 같이 바꿔 재실행 때 중복이 생기지 않게 했다)
 * 2. '외부성' → '외무성'(外務省, 1869~). 이노우에 가오루(1885~87) 재임이 일본 제국에 걸려 있는데
 *    기관은 현대 일본에만 걸려 있었다 → 일본 제국 + 일본 dual-fill(같은 기관이 이어져 왔다)
 * 0. OHL — '독일 제국 육군 최고사령부' → '육군 최고사령부', 종류=군 최고사령부, 약칭·원어명, 폐지 1919.7
 *
 * 실행: npx ts-node apps/api/prisma/scripts/normalize-department-data.ts
 */
async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    // 0. OHL — 접두어 제거보다 먼저(안 그러면 '독일 '이 잘려 '제국 육군 최고사령부'가 된다)
    const ohl = await prisma.administrationDepartment.findFirst({
      where: {
        OR: [{ name: '독일 제국 육군 최고사령부' }, { name: '제국 육군 최고사령부' }, { abbreviation: 'OHL' }],
      },
    })
    if (ohl) {
      await prisma.administrationDepartment.update({
        where: { id: ohl.id },
        data: {
          name: '육군 최고사령부',
          kind: 'MILITARY_COMMAND',
          abbreviation: 'OHL',
          nameLocal: ohl.nameLocal ?? 'Oberste Heeresleitung',
          nameEn: ohl.nameEn ?? 'Supreme Army Command',
          ...(ohl.abolishedYear == null && {
            abolishedEra: 'AD',
            abolishedYear: 1919,
            abolishedMonth: 7,
            abolishedPrecision: 'month',
            abolishedDate: new Date('1919-07-01T00:00:00Z'),
          }),
        },
      })
      console.log('0. OHL — 육군 최고사령부 · 군 최고사령부 · 폐지 1919.7')
    } else {
      console.log('0. OHL 없음 — 건너뜀')
    }
    // 1. 나라 이름 접두어
    const countries = await prisma.country.findMany({ select: { id: true, name: true } })
    let renamed = 0
    for (const country of countries) {
      const prefix = `${country.name} `
      const rows = await prisma.administrationDepartment.findMany({
        where: { countryId: country.id, name: { startsWith: prefix } },
        select: { id: true, name: true },
      })
      for (const row of rows) {
        const next = row.name.slice(prefix.length).trim()
        if (!next) continue
        await prisma.administrationDepartment.update({ where: { id: row.id }, data: { name: next } })
        console.log(`  ✏️  ${row.name} → ${next}`)
        renamed++
      }
    }
    console.log(`1. 나라 이름 접두어 제거 ${renamed}건`)

    // 2. 외부성 → 외무성 + 일본 제국 dual-fill
    const japanEmpire = await prisma.historicalCountry.findFirst({ where: { name: '일본 제국' }, select: { id: true } })
    const foreignMinistry = await prisma.administrationDepartment.findFirst({ where: { name: '외부성' } })
    if (foreignMinistry) {
      await prisma.administrationDepartment.update({
        where: { id: foreignMinistry.id },
        data: {
          name: '외무성',
          nameLocal: foreignMinistry.nameLocal ?? '外務省',
          nameEn: foreignMinistry.nameEn ?? 'Ministry of Foreign Affairs',
          historicalCountryId: foreignMinistry.historicalCountryId ?? japanEmpire?.id ?? null,
          ...(foreignMinistry.establishedYear == null && {
            establishedEra: 'AD',
            establishedYear: 1869,
            establishedMonth: 8,
            establishedPrecision: 'month',
            establishedDate: new Date('1869-08-01T00:00:00Z'),
          }),
        },
      })
      console.log('2. 외부성 → 외무성(外務省), 일본 제국 연결')
    } else {
      console.log('2. 외부성 없음 — 건너뜀')
    }

  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('\n✨ 국가 기관 데이터 정리 완료\n'))
  .catch((error) => {
    console.error('\n❌ 실패:', error)
    process.exit(1)
  })
