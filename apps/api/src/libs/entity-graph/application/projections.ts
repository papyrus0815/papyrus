/**
 * 투영(projection) 레지스트리 — 전용 관계 테이블 하나 = 투영 하나.
 *
 * 투영은 주어 kind와 목적어 kind를 선언하고 두 방향 조회를 준다.
 *   connections(ref) = ∪ forward(ref)  [p.subject = ref.kind]
 *                    ∪ reverse(ref)    [ref.kind ∈ p.objects]
 * 그래서 사건 화면은 person.event의 역방향만으로 '참여 인물'을, 역사국가는 tenure·reign·
 * nationality·event.country의 역방향으로 재임자·군주·국적 인물·관련 사건을 얻는다 —
 * 반대쪽 화면을 따로 짤 필요가 없다. 새 도메인은 여기에 투영 하나만 더한다.
 *
 * 대칭 관계(배우자·인간관계)는 objects를 비우고 forward에서 양쪽 열을 모두 본다(중복 방지).
 */
import type { PrismaService } from '@prisma/prisma.service'

import type {
  ConnectionEdge,
  ConnectionGroup,
  ConnectionTarget,
  EntityKind,
  ProjectionContext,
  ProjectionResult,
} from '../domain/entity-graph.types'
import {
  COUNTRY_TARGET_SELECT,
  EVENT_TARGET_SELECT,
  HISTORICAL_COUNTRY_TARGET_SELECT,
  PERSON_TARGET_SELECT,
  eventTarget,
  periodFromDates,
  periodFromStructured,
  personTarget,
  polityTarget,
  simpleTarget,
  countryTarget,
  historicalCountryTarget,
} from './targets'

export interface Projection {
  relation: string
  group: ConnectionGroup
  subject: EntityKind
  /** 역방향 조회가 가능한 목적어 kind — 비우면 정방향만(대칭 관계) */
  objects: EntityKind[]
  forward(prisma: PrismaService, ctx: ProjectionContext, subjectId: string): Promise<ProjectionResult>
  reverse?(
    prisma: PrismaService,
    ctx: ProjectionContext,
    objectKind: EntityKind,
    objectId: string,
  ): Promise<ProjectionResult>
}

const POLITY_SELECT = {
  country: { select: COUNTRY_TARGET_SELECT },
  historicalCountry: { select: HISTORICAL_COUNTRY_TARGET_SELECT },
} as const

/** 국가 kind → dual-FK where 절 */
function polityWhere(kind: EntityKind, id: string) {
  return kind === 'historicalCountry' ? { historicalCountryId: id } : { countryId: id }
}

function edge(
  base: Pick<ConnectionEdge, 'relation' | 'group' | 'direction'>,
  relationLabel: string,
  target: ConnectionTarget | null,
  role: string | null = null,
  period: ConnectionEdge['period'] = null,
): ConnectionEdge | null {
  if (!target) return null
  return { ...base, relationLabel, target, role, period }
}

function result(edges: Array<ConnectionEdge | null>, total?: number): ProjectionResult {
  const kept = edges.filter((item): item is ConnectionEdge => item != null)
  return { edges: kept, total: total ?? kept.length }
}

/** 역방향은 상한까지만 받고, 넘치면 count로 전체 수를 잰다 */
async function limitedReverse<Row>(
  ctx: ProjectionContext,
  find: (take: number) => Promise<Row[]>,
  count: () => Promise<number>,
): Promise<{ rows: Row[]; total: number }> {
  const rows = await find(ctx.reverseLimit + 1)
  if (rows.length <= ctx.reverseLimit) return { rows, total: rows.length }
  return { rows: rows.slice(0, ctx.reverseLimit), total: await count() }
}

const AFFILIATION_LABEL: Record<string, string> = {
  BIRTH_PLACE: '출생지',
  CITIZENSHIP: '시민권',
  PRIMARY_RESIDENCE: '주 활동지',
  SERVED: '복무',
  EXILE: '망명',
  OTHER: '기타 소속',
}

const EVENT_COUNTRY_ROLE_LABEL: Record<string, string> = {
  INITIATOR: '주도국',
  TARGET: '대상국',
  PARTICIPANT: '참여국',
  ALLY: '동맹국',
  ADVERSARY: '적대국',
  MEDIATOR: '중재국',
  OBSERVER: '관찰국',
  VICTIM: '피해국',
  BENEFICIARY: '수혜국',
  FOUNDED: '건국',
  DISSOLVED: '멸망',
  OTHER: '관련국',
}

const TREATY_PARTICIPATION_LABEL: Record<string, string> = {
  SIGNATORY: '서명',
  GUARANTOR: '보증',
  MEDIATOR: '중재',
  RATIFIER: '비준',
  OBSERVER: '참관',
}

// ─────────────────────────── 인물 → 국가 ───────────────────────────

const nationality: Projection = {
  relation: 'person.nationality',
  group: 'polity',
  subject: 'person',
  objects: ['country', 'historicalCountry'],
  async forward(prisma, _ctx, personId) {
    const person = await prisma.person.findUnique({
      where: { id: personId },
      select: POLITY_SELECT,
    })
    const base = { relation: this.relation, group: this.group, direction: 'out' as const }
    return result([
      edge(base, '국적', person?.historicalCountry ? historicalCountryTarget(person.historicalCountry) : null),
      edge(base, '국적', person?.country ? countryTarget(person.country) : null),
    ])
  },
  async reverse(prisma, ctx, kind, id) {
    const where = polityWhere(kind, id)
    const { rows, total } = await limitedReverse(
      ctx,
      (take) => prisma.person.findMany({ where, select: PERSON_TARGET_SELECT, take, orderBy: { birthDate: 'asc' } }),
      () => prisma.person.count({ where }),
    )
    const base = { relation: this.relation, group: this.group, direction: 'in' as const }
    return result(rows.map((row) => edge(base, '국적 인물', personTarget(row, ctx.accountId))), total)
  },
}

const affiliation: Projection = {
  relation: 'person.affiliation',
  group: 'polity',
  subject: 'person',
  objects: ['country', 'historicalCountry'],
  async forward(prisma, _ctx, personId) {
    const rows = await prisma.personCountryAffiliation.findMany({
      where: { personId },
      select: { affiliationType: true, startEra: true, startYear: true, startDate: true, endEra: true, endYear: true, endDate: true, ...POLITY_SELECT },
      orderBy: { priority: 'asc' },
    })
    const base = { relation: this.relation, group: this.group, direction: 'out' as const }
    return result(
      rows.map((row) =>
        edge(base, AFFILIATION_LABEL[row.affiliationType] ?? '소속', polityTarget(row), null, periodFromStructured(row)),
      ),
    )
  },
  async reverse(prisma, ctx, kind, id) {
    const where = polityWhere(kind, id)
    const { rows, total } = await limitedReverse(
      ctx,
      (take) =>
        prisma.personCountryAffiliation.findMany({
          where,
          select: { affiliationType: true, person: { select: PERSON_TARGET_SELECT } },
          take,
        }),
      () => prisma.personCountryAffiliation.count({ where }),
    )
    const base = { relation: this.relation, group: this.group, direction: 'in' as const }
    return result(
      rows.map((row) =>
        edge(base, '소속 인물', personTarget(row.person, ctx.accountId), AFFILIATION_LABEL[row.affiliationType] ?? null),
      ),
      total,
    )
  },
}

// ─────────────────────────── 인물 → 직위(재임·재위·건국) ───────────────────────────

const tenure: Projection = {
  relation: 'person.tenure',
  group: 'office',
  subject: 'person',
  objects: ['country', 'historicalCountry'],
  async forward(prisma, _ctx, personId) {
    const rows = await prisma.governmentPositionTenure.findMany({
      where: { personId },
      select: {
        title: true,
        startDate: true,
        endDate: true,
        positionDefinition: { select: { title: true } },
        ...POLITY_SELECT,
      },
      orderBy: { startDate: 'asc' },
    })
    const base = { relation: this.relation, group: this.group, direction: 'out' as const }
    return result(
      rows.map((row) =>
        edge(base, '재임', polityTarget(row), row.positionDefinition?.title ?? row.title ?? null, periodFromDates(row.startDate, row.endDate)),
      ),
    )
  },
  async reverse(prisma, ctx, kind, id) {
    const where = polityWhere(kind, id)
    const { rows, total } = await limitedReverse(
      ctx,
      (take) =>
        prisma.governmentPositionTenure.findMany({
          where,
          select: {
            title: true,
            startDate: true,
            endDate: true,
            positionDefinition: { select: { title: true } },
            person: { select: PERSON_TARGET_SELECT },
          },
          orderBy: { startDate: 'asc' },
          take,
        }),
      () => prisma.governmentPositionTenure.count({ where }),
    )
    const base = { relation: this.relation, group: this.group, direction: 'in' as const }
    return result(
      rows.map((row) =>
        edge(base, '재임자', personTarget(row.person, ctx.accountId), row.positionDefinition?.title ?? row.title ?? null, periodFromDates(row.startDate, row.endDate)),
      ),
      total,
    )
  },
}

const REIGN_PERIOD_SELECT = {
  startEra: true,
  startYear: true,
  startDate: true,
  endEra: true,
  endYear: true,
  endDate: true,
} as const

const reign: Projection = {
  relation: 'person.reign',
  group: 'office',
  subject: 'person',
  objects: ['historicalCountry', 'country'],
  async forward(prisma, _ctx, personId) {
    const rows = await prisma.sovereignReign.findMany({
      where: { personId },
      select: { regnalName: true, positionDefinition: { select: { title: true } }, ...REIGN_PERIOD_SELECT, ...POLITY_SELECT },
    })
    const base = { relation: this.relation, group: this.group, direction: 'out' as const }
    return result(
      rows.map((row) =>
        edge(base, '재위', polityTarget(row), row.regnalName ?? row.positionDefinition?.title ?? null, periodFromStructured(row)),
      ),
    )
  },
  async reverse(prisma, ctx, kind, id) {
    const where = polityWhere(kind, id)
    const { rows, total } = await limitedReverse(
      ctx,
      (take) =>
        prisma.sovereignReign.findMany({
          where,
          select: { regnalName: true, ...REIGN_PERIOD_SELECT, person: { select: PERSON_TARGET_SELECT } },
          take,
        }),
      () => prisma.sovereignReign.count({ where }),
    )
    const base = { relation: this.relation, group: this.group, direction: 'in' as const }
    return result(
      rows.map((row) =>
        edge(base, '군주', personTarget(row.person, ctx.accountId), row.regnalName ?? null, periodFromStructured(row)),
      ),
      total,
    )
  },
}

const statehood: Projection = {
  relation: 'person.statehood',
  group: 'office',
  subject: 'person',
  objects: ['historicalCountry'],
  async forward(prisma, _ctx, personId) {
    const rows = await prisma.historicalCountryStatehoodAgent.findMany({
      where: { personId },
      select: { historicalCountry: { select: HISTORICAL_COUNTRY_TARGET_SELECT } },
    })
    const base = { relation: this.relation, group: this.group, direction: 'out' as const }
    return result(rows.map((row) => edge(base, '건국·멸망 주체', historicalCountryTarget(row.historicalCountry))))
  },
  async reverse(prisma, ctx, _kind, id) {
    const rows = await prisma.historicalCountryStatehoodAgent.findMany({
      where: { historicalCountryId: id, personId: { not: null } },
      select: { person: { select: PERSON_TARGET_SELECT } },
    })
    const base = { relation: this.relation, group: this.group, direction: 'in' as const }
    return result(
      rows.map((row) => (row.person ? edge(base, '건국·멸망 주체', personTarget(row.person, ctx.accountId)) : null)),
    )
  },
}

// ─────────────────────────── 인물 → 가문 ───────────────────────────

const dynasty: Projection = {
  relation: 'person.dynasty',
  group: 'lineage',
  subject: 'person',
  objects: ['dynasty'],
  async forward(prisma, _ctx, personId) {
    const person = await prisma.person.findUnique({
      where: { id: personId },
      select: { dynasty: { select: { id: true, name: true } } },
    })
    const base = { relation: this.relation, group: this.group, direction: 'out' as const }
    return result([edge(base, '가문', person?.dynasty ? simpleTarget('dynasty', person.dynasty) : null)])
  },
  async reverse(prisma, ctx, _kind, id) {
    const where = { dynastyId: id }
    const { rows, total } = await limitedReverse(
      ctx,
      (take) => prisma.person.findMany({ where, select: PERSON_TARGET_SELECT, take, orderBy: { birthDate: 'asc' } }),
      () => prisma.person.count({ where }),
    )
    const base = { relation: this.relation, group: this.group, direction: 'in' as const }
    return result(rows.map((row) => edge(base, '구성원', personTarget(row, ctx.accountId))), total)
  },
}

const dynastyFounder: Projection = {
  relation: 'person.dynastyFounder',
  group: 'lineage',
  subject: 'person',
  objects: ['dynasty'],
  async forward(prisma, _ctx, personId) {
    const rows = await prisma.dynasty.findMany({ where: { founderId: personId }, select: { id: true, name: true } })
    const base = { relation: this.relation, group: this.group, direction: 'out' as const }
    return result(rows.map((row) => edge(base, '시조', simpleTarget('dynasty', row))))
  },
  async reverse(prisma, ctx, _kind, id) {
    const row = await prisma.dynasty.findUnique({
      where: { id },
      select: { founder: { select: PERSON_TARGET_SELECT } },
    })
    const base = { relation: this.relation, group: this.group, direction: 'in' as const }
    return result([row?.founder ? edge(base, '시조', personTarget(row.founder, ctx.accountId)) : null])
  },
}

// ─────────────────────────── 인물 → 사건 ───────────────────────────

const personEvent: Projection = {
  relation: 'person.event',
  group: 'event',
  subject: 'person',
  objects: ['event'],
  async forward(prisma, ctx, personId) {
    const rows = await prisma.personEvent.findMany({
      where: { personId, event: { deletedAt: null } },
      select: { role: true, event: { select: EVENT_TARGET_SELECT } },
    })
    const base = { relation: this.relation, group: this.group, direction: 'out' as const }
    return result(
      rows.map((row) =>
        edge(base, '참여', eventTarget(row.event, ctx.accountId), row.role ?? null, periodFromStructured(row.event)),
      ),
    )
  },
  async reverse(prisma, ctx, _kind, id) {
    const rows = await prisma.personEvent.findMany({
      where: { eventId: id },
      select: { role: true, person: { select: PERSON_TARGET_SELECT } },
      orderBy: { sortOrder: 'asc' },
    })
    const base = { relation: this.relation, group: this.group, direction: 'in' as const }
    return result(rows.map((row) => edge(base, '참여 인물', personTarget(row.person, ctx.accountId), row.role ?? null)))
  },
}

const eventCountry: Projection = {
  relation: 'event.country',
  group: 'polity',
  subject: 'event',
  objects: ['country', 'historicalCountry'],
  async forward(prisma, _ctx, eventId) {
    const rows = await prisma.eventCountryRelation.findMany({
      where: { eventId },
      select: { role: true, ...POLITY_SELECT },
      orderBy: { sortOrder: 'asc' },
    })
    const base = { relation: this.relation, group: this.group, direction: 'out' as const }
    return result(
      rows.map((row) => edge(base, EVENT_COUNTRY_ROLE_LABEL[row.role] ?? '관련국', polityTarget(row))),
    )
  },
  async reverse(prisma, ctx, kind, id) {
    const where = { ...polityWhere(kind, id), event: { deletedAt: null } }
    const { rows, total } = await limitedReverse(
      ctx,
      (take) =>
        prisma.eventCountryRelation.findMany({
          where,
          select: { role: true, event: { select: EVENT_TARGET_SELECT } },
          take,
        }),
      () => prisma.eventCountryRelation.count({ where }),
    )
    const base = { relation: this.relation, group: 'event' as const, direction: 'in' as const }
    return result(
      rows.map((row) =>
        edge(base, '관련 사건', eventTarget(row.event, ctx.accountId), EVENT_COUNTRY_ROLE_LABEL[row.role] ?? null, periodFromStructured(row.event)),
      ),
      total,
    )
  },
}

// ─────────────────────────── 인물 ↔ 인물 ───────────────────────────

const parent: Projection = {
  relation: 'person.parent',
  group: 'family',
  subject: 'person',
  objects: ['person'],
  async forward(prisma, ctx, personId) {
    const person = await prisma.person.findUnique({
      where: { id: personId },
      select: { father: { select: PERSON_TARGET_SELECT }, mother: { select: PERSON_TARGET_SELECT } },
    })
    const base = { relation: this.relation, group: this.group, direction: 'out' as const }
    return result([
      edge(base, '아버지', person?.father ? personTarget(person.father, ctx.accountId) : null),
      edge(base, '어머니', person?.mother ? personTarget(person.mother, ctx.accountId) : null),
    ])
  },
  async reverse(prisma, ctx, _kind, id) {
    const rows = await prisma.person.findMany({
      where: { OR: [{ fatherId: id }, { motherId: id }] },
      select: PERSON_TARGET_SELECT,
      orderBy: { birthDate: 'asc' },
    })
    const base = { relation: this.relation, group: this.group, direction: 'in' as const }
    return result(rows.map((row) => edge(base, '자녀', personTarget(row, ctx.accountId))))
  },
}

const spouse: Projection = {
  relation: 'person.spouse',
  group: 'family',
  subject: 'person',
  objects: [],
  async forward(prisma, ctx, personId) {
    const rows = await prisma.personSpouse.findMany({
      where: { OR: [{ personId }, { spouseId: personId }] },
      select: {
        personId: true,
        marriageStartEra: true,
        marriageStartYear: true,
        marriageStartDate: true,
        marriageEndEra: true,
        marriageEndYear: true,
        marriageEndDate: true,
        person: { select: PERSON_TARGET_SELECT },
        spouse: { select: PERSON_TARGET_SELECT },
      },
    })
    const base = { relation: this.relation, group: this.group, direction: 'out' as const }
    return result(
      rows.map((row) =>
        edge(
          base,
          '배우자',
          personTarget(row.personId === personId ? row.spouse : row.person, ctx.accountId),
          null,
          periodFromStructured({
            startEra: row.marriageStartEra,
            startYear: row.marriageStartYear,
            startDate: row.marriageStartDate,
            endEra: row.marriageEndEra,
            endYear: row.marriageEndYear,
            endDate: row.marriageEndDate,
          }),
        ),
      ),
    )
  },
}

const relationship: Projection = {
  relation: 'person.relationship',
  group: 'social',
  subject: 'person',
  objects: [],
  async forward(prisma, ctx, personId) {
    const rows = await prisma.personHumanRelationship.findMany({
      where: { OR: [{ fromPersonId: personId }, { toPersonId: personId }] },
      select: {
        fromPersonId: true,
        relationshipType: true,
        startDate: true,
        endDate: true,
        fromPerson: { select: PERSON_TARGET_SELECT },
        toPerson: { select: PERSON_TARGET_SELECT },
      },
    })
    const base = { relation: this.relation, group: this.group, direction: 'out' as const }
    return result(
      rows.map((row) => {
        const outgoing = row.fromPersonId === personId
        // 멘토 관계는 방향이 의미다 — from=스승, to=제자
        const label =
          row.relationshipType === 'MENTOR' ? (outgoing ? '제자' : '스승') : '인간관계'
        return edge(
          base,
          label,
          personTarget(outgoing ? row.toPerson : row.fromPerson, ctx.accountId),
          null,
          periodFromDates(row.startDate, row.endDate),
        )
      }),
    )
  },
}

const group: Projection = {
  relation: 'person.group',
  group: 'social',
  subject: 'person',
  objects: ['personGroup'],
  async forward(prisma, _ctx, personId) {
    const rows = await prisma.personGroupMembership.findMany({
      where: { personId },
      select: { roleLabel: true, group: { select: { id: true, name: true } } },
    })
    const base = { relation: this.relation, group: this.group, direction: 'out' as const }
    return result(rows.map((row) => edge(base, '소속 묶음', simpleTarget('personGroup', row.group), row.roleLabel ?? null)))
  },
  async reverse(prisma, ctx, _kind, id) {
    const rows = await prisma.personGroupMembership.findMany({
      where: { groupId: id },
      select: { roleLabel: true, person: { select: PERSON_TARGET_SELECT } },
      orderBy: { sortOrder: 'asc' },
    })
    const base = { relation: this.relation, group: this.group, direction: 'in' as const }
    return result(rows.map((row) => edge(base, '구성원', personTarget(row.person, ctx.accountId), row.roleLabel ?? null)))
  },
}

// ─────────────────────────── 인물 → 조직·정당·조약·군사 ───────────────────────────

const organization: Projection = {
  relation: 'person.organization',
  group: 'organization',
  subject: 'person',
  objects: ['organization'],
  async forward(prisma, _ctx, personId) {
    const rows = await prisma.organizationPersonRole.findMany({
      where: { personId },
      select: { roleTitle: true, startDate: true, endDate: true, organization: { select: { id: true, name: true } } },
    })
    const base = { relation: this.relation, group: this.group, direction: 'out' as const }
    return result(
      rows.map((row) =>
        edge(base, '조직 역할', simpleTarget('organization', row.organization), row.roleTitle, periodFromDates(row.startDate, row.endDate)),
      ),
    )
  },
  async reverse(prisma, ctx, _kind, id) {
    const rows = await prisma.organizationPersonRole.findMany({
      where: { organizationId: id },
      select: { roleTitle: true, startDate: true, endDate: true, person: { select: PERSON_TARGET_SELECT } },
    })
    const base = { relation: this.relation, group: this.group, direction: 'in' as const }
    return result(
      rows.map((row) =>
        edge(base, '인물', personTarget(row.person, ctx.accountId), row.roleTitle, periodFromDates(row.startDate, row.endDate)),
      ),
    )
  },
}

const party: Projection = {
  relation: 'person.party',
  group: 'organization',
  subject: 'person',
  objects: ['politicalParty'],
  async forward(prisma, _ctx, personId) {
    const [memberships, leaderships] = await Promise.all([
      prisma.politicalPartyMembership.findMany({
        where: { personId },
        select: { roleTitle: true, startDate: true, endDate: true, party: { select: { id: true, name: true } } },
      }),
      prisma.politicalPartyLeadership.findMany({
        where: { personId },
        select: { roleTitle: true, startDate: true, endDate: true, party: { select: { id: true, name: true } } },
      }),
    ])
    const base = { relation: this.relation, group: this.group, direction: 'out' as const }
    return result([
      ...memberships.map((row) =>
        edge(base, '당원', simpleTarget('politicalParty', row.party), row.roleTitle ?? null, periodFromDates(row.startDate, row.endDate)),
      ),
      ...leaderships.map((row) =>
        edge(base, '당직', simpleTarget('politicalParty', row.party), row.roleTitle, periodFromDates(row.startDate, row.endDate)),
      ),
    ])
  },
  async reverse(prisma, ctx, _kind, id) {
    const where = { partyId: id }
    const { rows, total } = await limitedReverse(
      ctx,
      (take) =>
        prisma.politicalPartyMembership.findMany({
          where,
          select: { roleTitle: true, startDate: true, endDate: true, person: { select: PERSON_TARGET_SELECT } },
          take,
        }),
      () => prisma.politicalPartyMembership.count({ where }),
    )
    const base = { relation: this.relation, group: this.group, direction: 'in' as const }
    return result(
      rows.map((row) =>
        edge(base, '당원', personTarget(row.person, ctx.accountId), row.roleTitle ?? null, periodFromDates(row.startDate, row.endDate)),
      ),
      total,
    )
  },
}

const treaty: Projection = {
  relation: 'person.treaty',
  group: 'treaty',
  subject: 'person',
  objects: ['treaty'],
  async forward(prisma, _ctx, personId) {
    const rows = await prisma.treatySignatory.findMany({
      where: { personId },
      select: { participationType: true, role: true, treaty: { select: { id: true, name: true, signDate: true } } },
    })
    const base = { relation: this.relation, group: this.group, direction: 'out' as const }
    return result(
      rows.map((row) =>
        edge(
          base,
          TREATY_PARTICIPATION_LABEL[row.participationType] ?? '서명',
          simpleTarget('treaty', row.treaty, `${row.treaty.signDate.getUTCFullYear()}`),
          row.role ?? null,
          periodFromDates(row.treaty.signDate, null),
        ),
      ),
    )
  },
  async reverse(prisma, ctx, _kind, id) {
    const rows = await prisma.treatySignatory.findMany({
      where: { treatyId: id, personId: { not: null } },
      select: { participationType: true, role: true, person: { select: PERSON_TARGET_SELECT } },
    })
    const base = { relation: this.relation, group: this.group, direction: 'in' as const }
    return result(
      rows.map((row) =>
        row.person
          ? edge(base, '서명자', personTarget(row.person, ctx.accountId), row.role ?? TREATY_PARTICIPATION_LABEL[row.participationType] ?? null)
          : null,
      ),
    )
  },
}

const militaryUnit: Projection = {
  relation: 'person.militaryUnit',
  group: 'military',
  subject: 'person',
  objects: ['militaryUnit'],
  async forward(prisma, _ctx, personId) {
    const rows = await prisma.militaryUnitCommander.findMany({
      where: { personId },
      select: { rank: true, role: true, startDate: true, endDate: true, unit: { select: { id: true, name: true } } },
    })
    const base = { relation: this.relation, group: this.group, direction: 'out' as const }
    return result(
      rows.map((row) =>
        edge(base, '지휘', simpleTarget('militaryUnit', row.unit), row.role ?? row.rank ?? null, periodFromDates(row.startDate, row.endDate)),
      ),
    )
  },
  async reverse(prisma, ctx, _kind, id) {
    const rows = await prisma.militaryUnitCommander.findMany({
      where: { unitId: id },
      select: { rank: true, role: true, startDate: true, endDate: true, person: { select: PERSON_TARGET_SELECT } },
    })
    const base = { relation: this.relation, group: this.group, direction: 'in' as const }
    return result(
      rows.map((row) =>
        edge(base, '지휘관', personTarget(row.person, ctx.accountId), row.role ?? row.rank ?? null, periodFromDates(row.startDate, row.endDate)),
      ),
    )
  },
}

/** 등록 순서 = 같은 묶음 안의 기본 나열 순서 */
export const PROJECTIONS: readonly Projection[] = [
  nationality,
  affiliation,
  tenure,
  reign,
  statehood,
  dynasty,
  dynastyFounder,
  personEvent,
  eventCountry,
  parent,
  spouse,
  relationship,
  group,
  organization,
  party,
  treaty,
  militaryUnit,
]
