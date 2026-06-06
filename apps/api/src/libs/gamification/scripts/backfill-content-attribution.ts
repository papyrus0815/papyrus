/**
 * 일회성 백필: 기존 PointEntry의 contentCentury·contentCountryId를 콘텐츠 메타로 채운다.
 * 국가 리더보드·국가/시대 전문가 뱃지가 "이미 등록된" 콘텐츠에도 즉시 반영되도록 1회 실행.
 * 멱등 — 다시 돌려도 동일 결과(재계산 후 같은 값으로 stamp).
 *
 * 실행: npx ts-node apps/api/src/libs/gamification/scripts/backfill-content-attribution.ts
 *
 * 귀속 규칙은 PointService.resolveContentCentury / resolveContentCountry와 동일.
 */
import { config } from 'dotenv'
import * as path from 'path'
import { AggregateType, EventCountryRole } from '@prisma/client'
import { PrismaService } from '../../../../prisma/prisma.service'
import { centuryFromDateEra, centuryFromYearEra } from '../domain/century'

const dir = __dirname
// 루트 env 로드 (env.development 우선, 그다음 .env) — PrismaService가 MYSQL_* 환경변수를 읽음
config({ path: path.resolve(dir, '../../../../../../env.development') })
config({ path: path.resolve(dir, '../../../../../../.env') })

const prisma = new PrismaService({ log: false })

async function resolveCentury(ownerType: AggregateType, recordId: string): Promise<number | null> {
  try {
    switch (ownerType) {
      case AggregateType.PERSON: {
        const p = await prisma.person.findUnique({ where: { id: recordId }, select: { birthDate: true, birthEra: true } })
        return p ? centuryFromDateEra(p.birthDate, p.birthEra) : null
      }
      case AggregateType.EVENT: {
        const e = await prisma.event.findUnique({ where: { id: recordId }, select: { startDate: true, startYear: true, startEra: true } })
        if (!e) return null
        if (e.startYear != null) return centuryFromYearEra(e.startYear, e.startEra)
        return centuryFromDateEra(e.startDate, null)
      }
      case AggregateType.HISTORICAL_COUNTRY: {
        const h = await prisma.historicalCountry.findUnique({ where: { id: recordId }, select: { startYear: true, startEra: true } })
        return h ? centuryFromYearEra(h.startYear, h.startEra) : null
      }
      default:
        return null
    }
  } catch {
    return null
  }
}

async function resolveCountry(ownerType: AggregateType, recordId: string): Promise<string | null> {
  try {
    switch (ownerType) {
      case AggregateType.PERSON: {
        const p = await prisma.person.findUnique({ where: { id: recordId }, select: { countryId: true } })
        if (p?.countryId) return p.countryId
        const aff = await prisma.personCountryAffiliation.findFirst({
          where: { personId: recordId },
          orderBy: [{ priority: 'asc' }],
          select: { countryId: true, historicalCountryId: true },
        })
        return aff?.countryId ?? aff?.historicalCountryId ?? null
      }
      case AggregateType.EVENT: {
        const rels = await prisma.eventCountryRelation.findMany({
          where: { eventId: recordId },
          select: { countryId: true, historicalCountryId: true, role: true },
        })
        if (rels.length === 0) return null
        const primary = rels.find((r) => r.role === EventCountryRole.INITIATOR) ?? rels[0]
        return primary.countryId ?? primary.historicalCountryId ?? null
      }
      case AggregateType.COUNTRY:
      case AggregateType.HISTORICAL_COUNTRY:
        return recordId
      default:
        return null
    }
  } catch {
    return null
  }
}

async function main() {
  const records = await prisma.pointEntry.groupBy({
    by: ['ownerType', 'recordId'],
    where: { recordId: { not: null } },
  })
  console.log(`대상 콘텐츠 record: ${records.length}개`)

  let processed = 0
  let withCountry = 0
  let withCentury = 0
  for (const r of records) {
    const recordId = r.recordId as string
    const [century, countryId] = await Promise.all([
      resolveCentury(r.ownerType, recordId),
      resolveCountry(r.ownerType, recordId),
    ])
    await prisma.pointEntry.updateMany({
      where: { ownerType: r.ownerType, recordId },
      data: { contentCentury: century, contentCountryId: countryId },
    })
    processed++
    if (century != null) withCentury++
    if (countryId != null) withCountry++
    if (processed % 100 === 0) console.log(`  ...${processed}/${records.length}`)
  }

  console.log(`✅ 백필 완료: ${processed}개 record (세기 부여 ${withCentury} · 국가 부여 ${withCountry})`)
}

main()
  .catch((e) => {
    console.error('❌ 백필 실패:', e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
