/**
 * 등록 모달의 '핵심 기록' — 세부 분야가 정한 기록을 **등록하는 그 자리에서** 받고, 사건이 생긴 뒤 각 기록의
 * 정본 API로 잇는다.
 *
 * 왜 등록에서 받나: 상세에서 추천만 하던 시절 회담/조약 50건 중 조약 연결 1건, 정치 73건 중 선거
 * 연결 0건이었다 — 등록하는 순간 묻지 않으면 채워지지 않는다.
 *
 * 저장 순서: 사건 생성(참여 인물은 생성 요청에 함께) → 진영(동기화 후 참여국 줄에 진영 지정) →
 * 조약(연결 또는 새로 만들고 연결) → 조직 → 취임·즉위(후보가 하나로 정해질 때만 자동 연결) → 선거.
 * 사건 자체는 이미 저장됐으므로 기록 하나가 실패해도 되돌리지 않고, 실패를 모아 알린다(상세에서 마저).
 */
import { participantKey } from '@/entities/event/model/country-participant'
import type { EventCountryParticipant } from '@/entities/event/model/country-participant'
import { type EventTypeKey, typeFacets } from '@/entities/event/model/event-type-registry'
import {
  DIRECTED_RELATION_TYPES,
  type EventRelationDirection,
  type EventRelationType,
  createEventRelation,
} from '@/shared/api/event-relations'
import { type EventSide, syncEventSides } from '@/shared/api/event-sides'
import {
  type EventOrganizationRole,
  addEventOrganization,
  getEventAccessionCandidates,
  updateEvent,
} from '@/shared/api/events'
import { updateElection } from '@/shared/api/election'
import { personCareerApi } from '@/shared/api/person-career'
import { treatyApi } from '@/shared/api/treaty'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'

import {
  guessTreatyType,
  signatoriesFromParticipants,
  treatyNameFromEventTitle,
} from './treaty-from-event'

export type EventRelationRoleKey =
  | 'LED_TO:incoming'
  | 'LED_TO:outgoing'
  | 'INFLUENCED:incoming'
  | 'INFLUENCED:outgoing'
  | 'RESPONSE_TO:incoming'
  | 'RESPONSE_TO:outgoing'
  | 'CONCURRENT:outgoing'
  | 'RELATED:outgoing'

export interface EventRelatedDraft {
  relatedEventId: string
  title: string
  dateLabel?: string
  startYear?: number | null
  relationType: EventRelationType
  direction: EventRelationDirection
  description?: string
}

export const EVENT_RELATION_ROLE_OPTIONS: ReadonlyArray<{
  key: EventRelationRoleKey
  relationType: EventRelationType
  direction: EventRelationDirection
  label: string
  group: '원인·배경 (앞선 사건)' | '결과·파장 (뒤따른 사건)' | '동시대·기타'
}> = [
  {
    key: 'LED_TO:incoming',
    relationType: 'LED_TO',
    direction: 'incoming',
    label: '계기가 된 사건 (상대 → 이 사건)',
    group: '원인·배경 (앞선 사건)',
  },
  {
    key: 'INFLUENCED:incoming',
    relationType: 'INFLUENCED',
    direction: 'incoming',
    label: '배경이 된 사건 (상대 → 이 사건)',
    group: '원인·배경 (앞선 사건)',
  },
  {
    key: 'RESPONSE_TO:incoming',
    relationType: 'RESPONSE_TO',
    direction: 'incoming',
    label: '이 사건이 대응한 사건 (상대 → 이 사건)',
    group: '원인·배경 (앞선 사건)',
  },
  {
    key: 'LED_TO:outgoing',
    relationType: 'LED_TO',
    direction: 'outgoing',
    label: '이 사건으로 일어난 사건 (이 사건 → 상대)',
    group: '결과·파장 (뒤따른 사건)',
  },
  {
    key: 'INFLUENCED:outgoing',
    relationType: 'INFLUENCED',
    direction: 'outgoing',
    label: '이 사건이 배경이 된 사건 (이 사건 → 상대)',
    group: '결과·파장 (뒤따른 사건)',
  },
  {
    key: 'RESPONSE_TO:outgoing',
    relationType: 'RESPONSE_TO',
    direction: 'outgoing',
    label: '이 사건에 대한 대응 (이 사건 → 상대)',
    group: '결과·파장 (뒤따른 사건)',
  },
  {
    key: 'CONCURRENT:outgoing',
    relationType: 'CONCURRENT',
    direction: 'outgoing',
    label: '같은 국면의 사건 (동시 진행)',
    group: '동시대·기타',
  },
  {
    key: 'RELATED:outgoing',
    relationType: 'RELATED',
    direction: 'outgoing',
    label: '관련 사건 (기타 연관)',
    group: '동시대·기타',
  },
]

export function toRelationRoleKey(
  relationType: EventRelationType,
  direction: EventRelationDirection,
): EventRelationRoleKey {
  const normalizedDir = DIRECTED_RELATION_TYPES.has(relationType) ? direction : 'outgoing'
  return `${relationType}:${normalizedDir}` as EventRelationRoleKey
}

export function parseRelationRoleKey(key: EventRelationRoleKey): {
  relationType: EventRelationType
  direction: EventRelationDirection
} {
  const [relationType, direction] = key.split(':') as [
    EventRelationType,
    EventRelationDirection,
  ]
  return { relationType, direction }
}

/**
 * 상대 사건과 현재 사건의 시작 연도를 비교해 기본 관계 유형·방향을 추론한다.
 * - 상대 사건이 더 앞선 해에 시작했으면: '계기가 된 사건' (LED_TO · incoming)
 * - 상대 사건이 더 뒤따른 해에 시작했으면: '이 사건으로 일어난 사건' (LED_TO · outgoing)
 * - 연도를 비교할 수 없거나 같은 해면: 가장 흔한 '계기가 된 사건' (LED_TO · incoming)
 */
export function inferDefaultRelationRole(
  candidateStartYear?: number | null,
  currentStartYear?: number | null,
): { relationType: EventRelationType; direction: EventRelationDirection } {
  if (candidateStartYear != null && currentStartYear != null) {
    if (candidateStartYear < currentStartYear) {
      return { relationType: 'LED_TO', direction: 'incoming' }
    }
    if (candidateStartYear > currentStartYear) {
      return { relationType: 'LED_TO', direction: 'outgoing' }
    }
  }
  return { relationType: 'LED_TO', direction: 'incoming' }
}

export interface PickedPerson {
  personId: string
  name: string
  /** 이 사건에서 한 일(선택) */
  role?: string
}

export const SIDE_SLOTS = ['A', 'B', 'C', 'D'] as const
export type SideSlot = (typeof SIDE_SLOTS)[number]

export interface RegisterFacetDrafts {
  /** 참여 인물 */
  persons: PickedPerson[]
  /** 취임·즉위한 인물 — 참여 인물로도 들어가고, 재임·재위 기록을 이 사건에 잇는다 */
  power: PickedPerson[]
  /** 진영 — 기본 2편(최대 4편), 영구 집단(PersonGroup) 연결, 참여국·참여 인물·조직별 소속 */
  sides: {
    names: string[]
    assignment: Record<string, SideSlot>
    personGroupIds?: Array<string | null>
    personAssignment?: Record<string, SideSlot>
    organizationAssignment?: Record<string, SideSlot>
  }
  /** 맺어진 조약 */
  treaty:
    | { mode: 'none' }
    | { mode: 'link'; treatyId: string; treatyName: string }
    | { mode: 'create'; name: string }
  /** 기업·조직 */
  organizations: Array<{ id: string; name: string; role: EventOrganizationRole }>
  /** 선거 */
  election: { id: string; name: string } | null
}

export const emptyRegisterFacetDrafts = (): RegisterFacetDrafts => ({
  persons: [],
  power: [],
  sides: { names: ['', ''], assignment: {} },
  treaty: { mode: 'none' },
  organizations: [],
  election: null,
})

/**
 * 현재 고른 세부 분야의 핵심 기록(`core`)에 속하지 않는 초안 값을 비운다.
 *
 * 세부를 '조약'으로 골라 '새 조약 만들기'를 켜 둔 뒤 세부를 '회담'이나 '전투'로 바꾸면
 * 화면에서 조약 칸은 사라지지만 초안 상태가 남아 엉뚱한 조약·진영·취임이 저장되던 문제를 막는다.
 * 바꾼 세부도 같은 패싯을 쓰면(예: 전투 ↔ 전쟁의 진영, 회담 ↔ 방문의 참여 인물) 그대로 보존한다.
 */
export function pruneFacetDraftsForType(
  drafts: RegisterFacetDrafts,
  type: EventTypeKey | null | undefined,
  domain?: string | null,
): RegisterFacetDrafts {
  const facets = typeFacets(type ?? null, domain)
  const core = new Set(facets.core)
  const optional = new Set(facets.optional)
  const hasSidePersonAssignment =
    core.has('sides') &&
    Object.keys(drafts.sides.personAssignment ?? {}).length > 0
  const hasSideOrgAssignment =
    core.has('sides') &&
    Object.keys(drafts.sides.organizationAssignment ?? {}).length > 0
  return {
    persons:
      core.has('persons') || optional.has('persons') || hasSidePersonAssignment
        ? drafts.persons
        : [],
    power: core.has('power') ? drafts.power : [],
    sides: core.has('sides') ? drafts.sides : { names: ['', ''], assignment: {} },
    treaty: core.has('treaty') ? drafts.treaty : { mode: 'none' },
    organizations:
      core.has('organizations') ||
      optional.has('organizations') ||
      hasSideOrgAssignment
        ? drafts.organizations
        : [],
    election: core.has('election') ? drafts.election : null,
  }
}

/**
 * 세부가 '건국·멸망·병합'(STATEHOOD)이 아닐 때나 '계속 등록'으로 참여국을 이어받을 때
 * 참여국에 남아 있는 FOUNDED/DISSOLVED 특수 역할을 일반 참여국('PARTICIPANT')으로 되돌린다.
 */
export function stripStatehoodRoles(
  participants: ReadonlyArray<EventCountryParticipant>,
): EventCountryParticipant[] {
  let changed = false
  const next = participants.map((row) => {
    if (row.role === 'FOUNDED' || row.role === 'DISSOLVED') {
      changed = true
      return { ...row, role: 'PARTICIPANT' as const }
    }
    return row
  })
  return changed ? next : (participants as EventCountryParticipant[])
}

/** 무엇이라도 적었나 — 이탈 가드(dirty) 판정용 */
export function hasAnyFacetDraft(drafts: RegisterFacetDrafts): boolean {
  return (
    drafts.persons.length > 0 ||
    drafts.power.length > 0 ||
    drafts.sides.names.some((name) => name.trim().length > 0) ||
    (drafts.sides.personGroupIds ?? []).some((id) => !!id) ||
    Object.keys(drafts.sides.assignment).length > 0 ||
    Object.keys(drafts.sides.personAssignment ?? {}).length > 0 ||
    Object.keys(drafts.sides.organizationAssignment ?? {}).length > 0 ||
    drafts.treaty.mode !== 'none' ||
    drafts.organizations.length > 0 ||
    drafts.election !== null
  )
}

export interface ParentEventRecordsSource {
  title: string
  type?: EventTypeKey | null
  sides?: ReadonlyArray<{
    id: string
    name: string
    sortOrder?: number | null
    personGroupId?: string | null
    participants?: ReadonlyArray<{
      countryId?: string | null
      historicalCountryId?: string | null
    }>
    persons?: ReadonlyArray<{
      personId: string
      name?: string | null
      surname?: string | null
      role?: string | null
    }>
    organizations?: ReadonlyArray<{
      organizationId: string
      name: string
      role?: string | null
    }>
  }>
  relatedPersons?: ReadonlyArray<{
    personId: string
    role?: string | null
    sideId?: string | null
    person?: {
      id: string
      name?: string | null
      surname?: string | null
      middleName?: string | null
      nameDisplayOrder?: string | null
      country?: { defaultNameDisplayOrder?: string | null } | null
    } | null
  }>
  organizations?: ReadonlyArray<{
    organizationId: string
    name: string
    role: EventOrganizationRole
    sideId?: string | null
  }>
}

/**
 * 상위 사건(예: 프랑스 혁명)에서 아직 하위 사건 초안에 반영되지 않은 진영·인물·조직 구도를 계산해
 * 원클릭 이어받기 계획을 만든다.
 */
export function buildParentRecordsImportPlan(
  parentSource: ParentEventRecordsSource | null | undefined,
  currentDrafts: RegisterFacetDrafts,
): {
  parentTitle: string
  summaryLabel: string
  nextDrafts: RegisterFacetDrafts
  hasSidesInParent: boolean
} | null {
  if (!parentSource) return null

  const sortedSides = [...(parentSource.sides ?? [])]
    .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0))
    .slice(0, SIDE_SLOTS.length)

  const sideIdToSlot = new Map<string, SideSlot>()
  sortedSides.forEach((side, idx) => {
    const slot = SIDE_SLOTS[idx]
    if (side.id && slot) {
      sideIdToSlot.set(side.id, slot)
    }
  })

  const currentSidesEmpty =
    currentDrafts.sides.names.every((name) => !name.trim()) &&
    !(currentDrafts.sides.personGroupIds ?? []).some(Boolean)

  let nextSideNames = [...currentDrafts.sides.names]
  let nextPersonGroupIds = currentDrafts.sides.personGroupIds
    ? [...currentDrafts.sides.personGroupIds]
    : undefined
  let newSidesCount = 0

  if (sortedSides.length > 0 && currentSidesEmpty) {
    nextSideNames = sortedSides.map((side) => side.name)
    while (nextSideNames.length < 2) nextSideNames.push('')
    nextPersonGroupIds = sortedSides.map((side) => side.personGroupId ?? null)
    while (nextPersonGroupIds.length < 2) nextPersonGroupIds.push(null)
    newSidesCount = sortedSides.length
  }

  const nextCountryAssignment: Record<string, SideSlot> = {
    ...currentDrafts.sides.assignment,
  }
  sortedSides.forEach((side, idx) => {
    const slot = SIDE_SLOTS[idx]
    if (!slot) return
    for (const pt of side.participants ?? []) {
      const key = pt.historicalCountryId
        ? `h:${pt.historicalCountryId}`
        : pt.countryId
          ? `m:${pt.countryId}`
          : ''
      if (key && !nextCountryAssignment[key]) {
        nextCountryAssignment[key] = slot
      }
    }
  })

  // 인물 수집
  const existingPersonIds = new Set(
    currentDrafts.persons.map((item) => item.personId),
  )
  const nextPersons: PickedPerson[] = [...currentDrafts.persons]
  const nextPersonAssignment: Record<string, SideSlot> = {
    ...(currentDrafts.sides.personAssignment ?? {}),
  }
  let newPersonsCount = 0

  for (const relPerson of parentSource.relatedPersons ?? []) {
    const pid = relPerson.personId
    if (!pid) continue
    const displayName = relPerson.person
      ? getPersonDisplayName(
          {
            ...relPerson.person,
            name: relPerson.person.name ?? '',
          },
          true,
        )
      : ''
    if (!existingPersonIds.has(pid) && displayName) {
      existingPersonIds.add(pid)
      nextPersons.push({
        personId: pid,
        name: displayName,
        ...(relPerson.role ? { role: relPerson.role } : {}),
      })
      newPersonsCount += 1
    }
    const assignedSlot = relPerson.sideId
      ? sideIdToSlot.get(relPerson.sideId)
      : undefined
    if (assignedSlot && !nextPersonAssignment[pid]) {
      nextPersonAssignment[pid] = assignedSlot
    }
  }

  sortedSides.forEach((side, idx) => {
    const slot = SIDE_SLOTS[idx]
    if (!slot) return
    for (const sidePerson of side.persons ?? []) {
      const pid = sidePerson.personId
      if (!pid) continue
      const displayName = getPersonDisplayName(
        { name: sidePerson.name ?? '', surname: sidePerson.surname },
        true,
      )
      if (!existingPersonIds.has(pid) && displayName) {
        existingPersonIds.add(pid)
        nextPersons.push({
          personId: pid,
          name: displayName,
          ...(sidePerson.role ? { role: sidePerson.role } : {}),
        })
        newPersonsCount += 1
      }
      if (!nextPersonAssignment[pid]) {
        nextPersonAssignment[pid] = slot
      }
    }
  })

  // 기업·조직 수집
  const existingOrgIds = new Set(
    currentDrafts.organizations.map((item) => item.id),
  )
  const nextOrgs = [...currentDrafts.organizations]
  const nextOrgAssignment: Record<string, SideSlot> = {
    ...(currentDrafts.sides.organizationAssignment ?? {}),
  }
  let newOrgsCount = 0

  for (const relOrg of parentSource.organizations ?? []) {
    const orgId = relOrg.organizationId
    if (!orgId) continue
    if (!existingOrgIds.has(orgId) && relOrg.name) {
      existingOrgIds.add(orgId)
      nextOrgs.push({
        id: orgId,
        name: relOrg.name,
        role: relOrg.role || 'PRINCIPAL',
      })
      newOrgsCount += 1
    }
    const assignedSlot = relOrg.sideId
      ? sideIdToSlot.get(relOrg.sideId)
      : undefined
    if (assignedSlot && !nextOrgAssignment[orgId]) {
      nextOrgAssignment[orgId] = assignedSlot
    }
  }

  sortedSides.forEach((side, idx) => {
    const slot = SIDE_SLOTS[idx]
    if (!slot) return
    for (const sideOrg of side.organizations ?? []) {
      const orgId = sideOrg.organizationId
      if (!orgId) continue
      if (!existingOrgIds.has(orgId) && sideOrg.name) {
        existingOrgIds.add(orgId)
        nextOrgs.push({
          id: orgId,
          name: sideOrg.name,
          role: (sideOrg.role as EventOrganizationRole) || 'PRINCIPAL',
        })
        newOrgsCount += 1
      }
      if (!nextOrgAssignment[orgId]) {
        nextOrgAssignment[orgId] = slot
      }
    }
  })

  if (newSidesCount === 0 && newPersonsCount === 0 && newOrgsCount === 0) {
    return null
  }

  const summaryParts: string[] = []
  if (newSidesCount > 0) summaryParts.push(`진영 ${newSidesCount}`)
  if (newOrgsCount > 0) summaryParts.push(`조직 ${newOrgsCount}곳`)
  if (newPersonsCount > 0) summaryParts.push(`인물 ${newPersonsCount}명`)

  return {
    parentTitle: parentSource.title,
    summaryLabel: summaryParts.join(' · '),
    hasSidesInParent: sortedSides.length > 0,
    nextDrafts: {
      ...currentDrafts,
      persons: nextPersons,
      organizations: nextOrgs,
      sides: {
        ...currentDrafts.sides,
        names: nextSideNames,
        ...(nextPersonGroupIds ? { personGroupIds: nextPersonGroupIds } : {}),
        assignment: nextCountryAssignment,
        ...(Object.keys(nextPersonAssignment).length > 0
          ? { personAssignment: nextPersonAssignment }
          : {}),
        ...(Object.keys(nextOrgAssignment).length > 0
          ? { organizationAssignment: nextOrgAssignment }
          : {}),
      },
    },
  }
}

const POWER_ROLE = '취임·즉위'

/** 생성 요청에 실을 참여 인물 — 참여 인물 ∪ 취임·즉위한 인물(같은 인물은 한 번) */
export function relatedPersonsPayload(
  drafts: RegisterFacetDrafts,
  type?: EventTypeKey | null,
  domain?: string | null,
): Array<{ personId: string; role?: string }> {
  const active = type === undefined ? drafts : pruneFacetDraftsForType(drafts, type, domain)
  const rows = new Map<string, { personId: string; role?: string }>()
  for (const person of active.power) rows.set(person.personId, { personId: person.personId, role: POWER_ROLE })
  for (const person of active.persons) {
    if (!rows.has(person.personId)) {
      rows.set(person.personId, { personId: person.personId, role: person.role?.trim() || undefined })
    }
  }
  return [...rows.values()]
}

/**
 * 진영 초안 — 참여국 역할로 두 편을 미리 가른다(상세 side-draft.lib과 같은 규칙: 주도·동맹 / 대상·적대·피해).
 * 이미 사용자가 정한 소속은 건드리지 않는다.
 */
const SIDE_A_ROLES = new Set(['INITIATOR', 'ALLY'])
const SIDE_B_ROLES = new Set(['TARGET', 'ADVERSARY', 'VICTIM'])

export function suggestSideAssignment(
  participants: ReadonlyArray<EventCountryParticipant>,
  current: Record<string, SideSlot>,
): Record<string, SideSlot> {
  // 참여국이 1개국뿐이고 적대/대상 역할이 아닌 경우(예: 프랑스 혁명의 '프랑스')는
  // 국가 자체가 특정 내부 파벌(1편)로 자동 배정되지 않도록 미배정 상태로 둔다.
  if (
    participants.length <= 1 &&
    !participants.some((row) => SIDE_B_ROLES.has(row.role ?? ''))
  ) {
    return { ...current }
  }
  const next = { ...current }
  for (const row of participants) {
    const key = participantKey(row)
    if (next[key]) continue
    if (SIDE_A_ROLES.has(row.role ?? '')) next[key] = 'A'
    else if (SIDE_B_ROLES.has(row.role ?? '')) next[key] = 'B'
  }
  return next
}

const SIDE_COLORS: ReadonlyArray<string> = [
  '#1d4ed8',
  '#b91c1c',
  '#047857',
  '#7c3aed',
]

export interface CommitInput {
  eventId: string
  eventTitle: string
  startDate?: string | null
  location?: string | null
  description?: string | null
  /** 생성 직후의 참여국 줄 — 진영 소속·조약 서명국의 원본 */
  participants: ReadonlyArray<EventCountryParticipant>
  drafts: RegisterFacetDrafts
  /** 현재 고른 세부 분야 — 주어지면 이 세부의 core에 속한 기록만 커밋한다 */
  eventType?: EventTypeKey | null
  domain?: string | null
  /** 등록 시점에 함께 연결할 연관 사건(EventRelation) 목록 */
  relatedEvents?: ReadonlyArray<EventRelatedDraft>
}

export interface CommitResult {
  /** 이은 기록 — '진영 2', '조약 「…」' */
  done: string[]
  /** 잇지 못한 것 — 상세에서 마저 */
  warnings: string[]
}

export async function commitRegisterFacets(input: CommitInput): Promise<CommitResult> {
  const { eventId } = input
  const drafts =
    input.eventType === undefined
      ? input.drafts
      : pruneFacetDraftsForType(input.drafts, input.eventType, input.domain)
  const done: string[] = []
  const warnings: string[] = []
  const attempt = async (label: string, run: () => Promise<string | void>) => {
    try {
      const note = await run()
      if (note) done.push(note)
    } catch (error) {
      warnings.push(`${label}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // 진영 — 진영 이름·영구 집단(계파)·참여국·참여 인물·참여 조직 중 하나라도 지정됐을 때 두 편을 만든다.
  const countryAssigned = Object.entries(drafts.sides.assignment)
  const personAssigned = Object.entries(drafts.sides.personAssignment ?? {})
  const orgAssigned = Object.entries(drafts.sides.organizationAssignment ?? {})
  const hasNamedSides = drafts.sides.names.some((name) => name.trim().length > 0)
  const hasLinkedGroups = (drafts.sides.personGroupIds ?? []).some((id) => !!id)
  const shouldCreateSides =
    countryAssigned.length > 0 ||
    personAssigned.length > 0 ||
    orgAssigned.length > 0 ||
    hasNamedSides ||
    hasLinkedGroups

  let createdSideIdOf: ((slot: SideSlot) => string | undefined) | null = null

  if (shouldCreateSides) {
    await attempt('진영', async () => {
      const slotCount = Math.min(
        SIDE_SLOTS.length,
        Math.max(2, drafts.sides.names.length),
      )
      const names = Array.from({ length: slotCount }, (_, index) => {
        const raw = drafts.sides.names[index]?.trim()
        return raw || `진영 ${index + 1}`
      })
      const groupIds = drafts.sides.personGroupIds ?? []
      const sides: EventSide[] = await syncEventSides(
        eventId,
        names.map((sideName, index) => ({
          name: sideName,
          level: 'COALITION' as const,
          color: SIDE_COLORS[index] ?? SIDE_COLORS[0],
          ...(groupIds[index] ? { personGroupId: groupIds[index] } : {}),
        })),
      )
      const sideIdOf = (slot: SideSlot): string | undefined => {
        const slotIdx = SIDE_SLOTS.indexOf(slot)
        return slotIdx >= 0 ? sides[slotIdx]?.id : undefined
      }
      createdSideIdOf = sideIdOf

      const updatePayload: Record<string, unknown> = {}
      if (countryAssigned.length > 0) {
        /* 참여국은 전체 목록 계약 — 키만 보내 역할·서술은 그대로 두고(생략=유지) 진영만 건다 */
        updatePayload.relatedCountries = input.participants.map((row) => {
          const slot = drafts.sides.assignment[participantKey(row)]
          const key = row.historicalCountryId
            ? { historicalCountryId: row.historicalCountryId }
            : { countryId: row.countryId ?? undefined }
          const sideId = slot ? sideIdOf(slot) : undefined
          return sideId ? { ...key, sideId } : key
        })
      }
      if (personAssigned.length > 0) {
        const allPersons = relatedPersonsPayload(drafts)
        updatePayload.relatedPersons = allPersons.map((p) => {
          const slot = drafts.sides.personAssignment?.[p.personId]
          const sideId = slot ? sideIdOf(slot) : undefined
          return sideId ? { ...p, sideId } : p
        })
      }
      if (Object.keys(updatePayload).length > 0) {
        await updateEvent(eventId, updatePayload as Parameters<typeof updateEvent>[1])
      }
      return `진영 ${names.join(' · ')}`
    })
  }

  // 조약
  const treaty = drafts.treaty
  if (treaty.mode === 'link') {
    await attempt('조약 연결', async () => {
      await treatyApi.linkEvent(treaty.treatyId, { eventId, linkType: 'SIGNING' })
      return `조약 「${treaty.treatyName}」`
    })
  } else if (treaty.mode === 'create') {
    await attempt('조약 만들기', async () => {
      const name = treaty.name.trim() || treatyNameFromEventTitle(input.eventTitle)
      const created = await treatyApi.create({
        name,
        type: guessTreatyType(name),
        signDate: input.startDate || new Date().toISOString(),
        location: input.location ?? null,
        summary: input.description ?? null,
        signatories: signatoriesFromParticipants(input.participants),
        allowDuplicateSignDate: true,
      })
      await treatyApi.linkEvent(created.id, { eventId, linkType: 'SIGNING' })
      return `새 조약 「${created.name}」(참여국 ${input.participants.length}곳을 서명국으로)`
    })
  }

  // 기업·조직
  for (const organization of drafts.organizations) {
    await attempt(`조직 ${organization.name}`, async () => {
      const orgSlot = drafts.sides.organizationAssignment?.[organization.id]
      const sideId = orgSlot && createdSideIdOf ? createdSideIdOf(orgSlot) : undefined
      await addEventOrganization(eventId, {
        organizationId: organization.id,
        role: organization.role,
        ...(sideId ? { sideId } : {}),
      })
      return `조직 ${organization.name}`
    })
  }

  // 취임·즉위 — 이 사건 연도 ±1년에 시작한 그 인물의 재임·재위가 **하나로 정해질 때만** 잇는다
  if (drafts.power.length > 0) {
    await attempt('취임·즉위', async () => {
      const candidates = await getEventAccessionCandidates(eventId)
      const linked: string[] = []
      for (const person of drafts.power) {
        const mine = candidates.filter((record) => record.personId === person.personId)
        if (mine.length === 1) {
          await personCareerApi.updateGovernmentPositionTenure(mine[0].recordId, { accessionEventId: eventId })
          linked.push(`${person.name}(${mine[0].title ?? mine[0].regnalName ?? '재임'})`)
        } else {
          warnings.push(
            mine.length === 0
              ? `${person.name}: 이 사건 시기에 시작한 재임·재위 기록이 없습니다 — 인물 쪽에 재임을 먼저 등록하세요`
              : `${person.name}: 후보 기록이 ${mine.length}건이라 상세 '권력 교체'에서 골라 주세요`,
          )
        }
      }
      return linked.length > 0 ? `취임·즉위 ${linked.join(', ')}` : undefined
    })
  }

  // 선거
  if (drafts.election) {
    const election = drafts.election
    await attempt('선거', async () => {
      await updateElection(election.id, { eventId })
      return `선거 ${election.name}`
    })
  }

  // 연관 사건(EventRelation)
  for (const relation of input.relatedEvents ?? []) {
    await attempt(`연관 사건 ${relation.title}`, async () => {
      const direction = DIRECTED_RELATION_TYPES.has(relation.relationType)
        ? relation.direction
        : undefined
      await createEventRelation(eventId, {
        relatedEventId: relation.relatedEventId,
        relationType: relation.relationType,
        direction,
        description: relation.description?.trim() || null,
      })
      return `연관 「${relation.title}」`
    })
  }

  return { done, warnings }
}
