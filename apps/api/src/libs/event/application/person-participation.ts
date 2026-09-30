/**
 * 사건 참여 인물(PersonEvent)의 두 가지 파생 — 사건 쪽 저장·인물 쪽 연결·사건 상세 읽기가 함께 쓴다.
 *
 * 1) 참여 자격 국가 추론 — 사람이 적지 않아도 모호하지 않으면 채운다.
 *    ① 인물의 역사국가 국적이 사건 참여국(또는 주 무대) → 그 역사국가
 *    ② 인물의 현대국가 국적이 사건 참여국 → 그 현대국가
 *    ③ 역사국가가 아직 없고, 인물의 현대국가와 브리지로 이어진 역사국가가 참여국 중 **딱 하나** → 그 역사국가
 *    (마이그레이션 20260930180000의 백필과 같은 규칙)
 *
 * 2) 사건 당시 직위 — 역할 칸에 '제42대 미국 대통령(1993~2001)'처럼 직위·기간을 손으로 다시
 *    적던 것을, 재임·재위 기록에서 사건 날짜에 맞는 것을 찾아 보여 준다(저장하지 않는 파생).
 */
import type { Prisma, PrismaClient } from '@prisma/client'

type Db = PrismaClient | Prisma.TransactionClient

export interface ParticipationCountry {
  countryId: string | null
  historicalCountryId: string | null
}

/** 여러 인물의 참여 자격 국가를 한 번에 추론 — 추론 불가면 두 값 모두 null */
export async function inferParticipationCountries(
  db: Db,
  eventId: string,
  personIds: string[],
): Promise<Map<string, ParticipationCountry>> {
  const result = new Map<string, ParticipationCountry>()
  if (personIds.length === 0) return result

  const [event, persons] = await Promise.all([
    db.event.findUnique({
      where: { id: eventId },
      select: {
        historicalCountryId: true,
        countryRelations: { select: { countryId: true, historicalCountryId: true } },
      },
    }),
    db.person.findMany({
      where: { id: { in: personIds } },
      select: { id: true, countryId: true, historicalCountryId: true },
    }),
  ])
  if (!event) return result

  const eventModern = new Set(
    event.countryRelations
      .map((relation) => relation.countryId)
      .filter((id): id is string => !!id),
  )
  const eventHistorical = new Set(
    event.countryRelations
      .map((relation) => relation.historicalCountryId)
      .filter((id): id is string => !!id),
  )
  if (event.historicalCountryId) eventHistorical.add(event.historicalCountryId)

  // ③ 브리지: 사건의 역사 참여국 → 이어진 현대국
  const bridges =
    eventHistorical.size > 0
      ? await db.historicalCountryModernCountry.findMany({
          where: { historicalCountryId: { in: [...eventHistorical] } },
          select: { historicalCountryId: true, modernCountryId: true },
        })
      : []
  const historicalByModern = new Map<string, Set<string>>()
  for (const bridge of bridges) {
    const set = historicalByModern.get(bridge.modernCountryId) ?? new Set<string>()
    set.add(bridge.historicalCountryId)
    historicalByModern.set(bridge.modernCountryId, set)
  }

  for (const person of persons) {
    let historicalCountryId: string | null =
      person.historicalCountryId && eventHistorical.has(person.historicalCountryId)
        ? person.historicalCountryId
        : null
    const countryId: string | null =
      person.countryId && eventModern.has(person.countryId) ? person.countryId : null
    if (!historicalCountryId && person.countryId) {
      const bridged = historicalByModern.get(person.countryId)
      if (bridged && bridged.size === 1) historicalCountryId = [...bridged][0]
    }
    result.set(person.id, { countryId, historicalCountryId })
  }
  return result
}

// ─── 사건 당시 직위 ──────────────────────────────────────────────────────────

/** 부호 연·월·일 → 비교 키 범위. 모르는 부분은 그 단위 전체로 넓힌다 */
function keyRange(
  year: number | null,
  month: number | null,
  day: number | null,
): [number, number] | null {
  if (year == null) return null
  const base = year * 10000
  if (month == null) return [base + 101, base + 1231]
  if (day == null) return [base + month * 100 + 1, base + month * 100 + 31]
  const key = base + month * 100 + day
  return [key, key]
}

type DateParts = { year: number | null; month: number | null; day: number | null }

/** 구조화 날짜(BC 안전) 우선, 없으면 DATETIME */
function partsOf(
  era: string | null | undefined,
  year: number | null | undefined,
  month: number | null | undefined,
  day: number | null | undefined,
  date: Date | null | undefined,
): DateParts {
  if (year != null) {
    return { year: era === 'BC' ? -year : year, month: month ?? null, day: day ?? null }
  }
  if (date) {
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
    }
  }
  return { year: null, month: null, day: null }
}

/** 사건 시점 → 인물별 '당시 직위' 라벨(재위 먼저, 최대 2개) */
export async function resolveOfficesAtEvent(
  db: Db,
  event: {
    startEra?: string | null
    startYear?: number | null
    startMonth?: number | null
    startDay?: number | null
    startDate?: Date | null
  },
  personIds: string[],
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>()
  if (personIds.length === 0) return result
  const eventParts = partsOf(
    event.startEra,
    event.startYear,
    event.startMonth,
    event.startDay,
    event.startDate,
  )
  const eventRange = keyRange(eventParts.year, eventParts.month, eventParts.day)
  if (!eventRange) return result

  const overlaps = (start: DateParts, end: DateParts) => {
    const startRange = keyRange(start.year, start.month, start.day)
    if (!startRange) return false
    const endRange = keyRange(end.year, end.month, end.day)
    // 끝이 없으면 진행 중 — 시작 이후 전부
    const endKey = endRange ? endRange[1] : Number.MAX_SAFE_INTEGER
    return startRange[0] <= eventRange[1] && endKey >= eventRange[0]
  }

  const [reigns, tenures] = await Promise.all([
    db.sovereignReign.findMany({
      where: { personId: { in: personIds } },
      select: {
        personId: true,
        startEra: true,
        startYear: true,
        startMonth: true,
        startDay: true,
        startDate: true,
        endEra: true,
        endYear: true,
        endMonth: true,
        endDay: true,
        endDate: true,
        regnalName: true,
        positionDefinition: { select: { title: true } },
        country: { select: { name: true } },
        historicalCountry: { select: { name: true } },
      },
    }),
    db.governmentPositionTenure.findMany({
      where: { personId: { in: personIds } },
      select: {
        personId: true,
        startDate: true,
        endDate: true,
        title: true,
        positionDefinition: { select: { title: true } },
        country: { select: { name: true } },
        historicalCountry: { select: { name: true } },
      },
    }),
  ])

  const push = (personId: string, label: string) => {
    const list = result.get(personId) ?? []
    if (!list.includes(label) && list.length < 2) list.push(label)
    result.set(personId, list)
  }

  for (const reign of reigns) {
    const start = partsOf(reign.startEra, reign.startYear, reign.startMonth, reign.startDay, reign.startDate)
    const end = partsOf(reign.endEra, reign.endYear, reign.endMonth, reign.endDay, reign.endDate)
    if (!overlaps(start, end)) continue
    const countryName = reign.historicalCountry?.name ?? reign.country?.name ?? ''
    const office = reign.positionDefinition?.title ?? '군주'
    const name = reign.regnalName ? ` ${reign.regnalName}` : ''
    push(reign.personId, `${countryName} ${office}${name}`.trim())
  }
  for (const tenure of tenures) {
    const start = partsOf(null, null, null, null, tenure.startDate)
    const end = partsOf(null, null, null, null, tenure.endDate)
    if (!overlaps(start, end)) continue
    const countryName = tenure.historicalCountry?.name ?? tenure.country?.name ?? ''
    const office = tenure.positionDefinition?.title ?? tenure.title
    if (!office) continue
    push(tenure.personId, `${countryName} ${office}`.trim())
  }
  return result
}
