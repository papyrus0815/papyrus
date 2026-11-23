/**
 * 원(院) 카탈로그 이관 — B7, docs/political-party-model-review.md.
 *
 * 1) 정체(PoliticalSystem)의 하원·상원 글자 칸 → Chamber. 같은 국가·역할·이름이면 한 원으로 합친다
 *    (대한민국 '국회'는 정체 4행 → 원 1개 + 정원 이력 4줄).
 * 2) 정체의 정원 → ChamberSize(정체 기간, 연 정밀).
 * 3) 정체 → lowerChamberId / upperChamberId.
 * 4) 의회 선거 → 같은 국가에서 투표 연도를 덮는 원('상원'·Senate면 상원).
 * 멱등 — 다시 돌려도 새로 만들지 않는다. 원의 존속 기간은 모르니 비운다(정원 이력이 기간을 가진다).
 */
import { ChamberRole, type PrismaClient } from '@prisma/client'

import { splitChamberLabel } from '../../src/libs/political-system/domain/chamber-label.util'

const UPPER_PATTERN = /상원|참의원|귀족원|원로원|Senat|Senate|Herrenhaus|Lords|Bundesrat|Reichsrat/i

type Scope = { countryId: string | null; historicalCountryId: string | null }

export async function backfillChambers(prisma: PrismaClient): Promise<void> {
  const systems = await prisma.politicalSystem.findMany({
    where: { legislatureType: { not: 'NONE' } },
    orderBy: [{ startYear: 'asc' }],
  })
  let createdChambers = 0
  let createdSizes = 0
  let linkedSystems = 0

  /* 역사 국가가 있으면 그것만으로 합친다 — 같은 중화민국이 현대 국가(중국·대만)로 dual-fill이 갈려도 한 원 */
  const findOrCreate = async (
    scope: Scope,
    role: ChamberRole,
    label: string,
  ): Promise<{ id: string; startYear: number | null; endYear: number | null }> => {
    const { name, localName, startYear, endYear } = splitChamberLabel(label)
    const existing = await prisma.chamber.findFirst({
      where: scope.historicalCountryId
        ? { historicalCountryId: scope.historicalCountryId, role, name }
        : { countryId: scope.countryId, historicalCountryId: null, role, name },
      select: { id: true, localName: true },
    })
    if (existing) {
      if (!existing.localName && localName) {
        await prisma.chamber.update({ where: { id: existing.id }, data: { localName } })
      }
      return { id: existing.id, startYear, endYear }
    }
    const created = await prisma.chamber.create({
      data: {
        ...scope,
        role,
        name,
        localName,
        ...(startYear != null
          ? { startEra: 'AD' as const, startYear, startPrecision: 'year', endEra: 'AD' as const, endYear, endPrecision: 'year' }
          : {}),
      },
      select: { id: true },
    })
    createdChambers += 1
    return { id: created.id, startYear, endYear }
  }

  const ensureSize = async (chamberId: string, seats: number | null, startYear: number | null, endYear: number | null, startEra: 'BC' | 'AD' | null, endEra: 'BC' | 'AD' | null) => {
    if (seats == null) return
    const existing = await prisma.chamberSize.findFirst({ where: { chamberId, seats, startYear } })
    if (existing) return
    await prisma.chamberSize.create({
      data: {
        chamberId,
        seats,
        startEra: startYear != null ? (startEra ?? 'AD') : null,
        startYear,
        startPrecision: startYear != null ? 'year' : null,
        endEra: endYear != null ? (endEra ?? 'AD') : null,
        endYear,
        endPrecision: endYear != null ? 'year' : null,
        note: '정체 기간의 정원에서 이관',
      },
    })
    createdSizes += 1
  }

  for (const system of systems) {
    const scope: Scope = { countryId: system.countryId, historicalCountryId: system.historicalCountryId }
    const data: { lowerChamberId?: string; upperChamberId?: string } = {}
    /* 이미 원에 이어진 정체는 건너뛴다 — 큐레이션이 병합·정리한 원을 글자 칸에서 되살리지 않게 */
    if (system.lowerHouseName?.trim() && !system.lowerChamberId) {
      const role = system.legislatureType === 'UNICAMERAL' ? ChamberRole.UNICAMERAL : ChamberRole.LOWER
      const chamber = await findOrCreate(scope, role, system.lowerHouseName)
      /* 이름에 존속 연도가 있으면(자정원 1910~1912) 그 기간이 정원의 기간 — 정체 기간(1636~)보다 정확 */
      await ensureSize(
        chamber.id,
        system.lowerHouseSeats,
        chamber.startYear ?? system.startYear,
        chamber.endYear ?? system.endYear,
        chamber.startYear != null ? 'AD' : system.startEra,
        chamber.endYear != null ? 'AD' : system.endEra,
      )
      if (!system.lowerChamberId) data.lowerChamberId = chamber.id
    }
    if (system.upperHouseName?.trim() && system.legislatureType === 'BICAMERAL' && !system.upperChamberId) {
      const chamber = await findOrCreate(scope, ChamberRole.UPPER, system.upperHouseName)
      await ensureSize(chamber.id, system.upperHouseSeats, system.startYear, system.endYear, system.startEra, system.endEra)
      if (!system.upperChamberId) data.upperChamberId = chamber.id
    }
    if (Object.keys(data).length > 0) {
      await prisma.politicalSystem.update({ where: { id: system.id }, data })
      linkedSystems += 1
    }
  }

  /* 선거 → 원: 같은 국가 정체 중 투표 연도를 덮는 것의 원 */
  const elections = await prisma.election.findMany({
    where: {
      chamberId: null,
      electionType: { in: ['PARLIAMENTARY_CONSTITUENCY', 'PARLIAMENTARY_PROPORTIONAL', 'BY_ELECTION'] },
    },
    select: { id: true, name: true, pollDate: true, countryId: true, historicalCountryId: true },
  })
  let linkedElections = 0
  for (const election of elections) {
    const year = election.pollDate.getUTCFullYear()
    const candidates = systems.filter(
      (system) =>
        (election.historicalCountryId
          ? system.historicalCountryId === election.historicalCountryId
          : system.countryId === election.countryId) &&
        (system.startYear == null || system.startYear <= year) &&
        (system.endYear == null || system.endYear >= year),
    )
    if (candidates.length === 0) continue
    const fresh = await prisma.politicalSystem.findUnique({
      where: { id: candidates[candidates.length - 1].id },
      select: { lowerChamberId: true, upperChamberId: true },
    })
    const chamberId = UPPER_PATTERN.test(election.name) ? fresh?.upperChamberId : fresh?.lowerChamberId
    if (!chamberId) continue
    await prisma.election.update({ where: { id: election.id }, data: { chamberId } })
    linkedElections += 1
  }

  console.log(
    `  ✅ 원 신규 ${createdChambers} · 정원 이력 신규 ${createdSizes} · 정체 연결 ${linkedSystems} · 선거 연결 ${linkedElections}/${elections.length}`,
  )
}
