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

import {
  guessTreatyType,
  signatoriesFromParticipants,
  treatyNameFromEventTitle,
} from './treaty-from-event'

export interface PickedPerson {
  personId: string
  name: string
  /** 이 사건에서 한 일(선택) */
  role?: string
}

export type SideSlot = 'A' | 'B'

export interface RegisterFacetDrafts {
  /** 참여 인물 */
  persons: PickedPerson[]
  /** 취임·즉위한 인물 — 참여 인물로도 들어가고, 재임·재위 기록을 이 사건에 잇는다 */
  power: PickedPerson[]
  /** 진영 — 이름 두 개와 참여국 줄(participantKey)별 소속 */
  sides: { names: [string, string]; assignment: Record<string, SideSlot> }
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
  const core = new Set(typeFacets(type ?? null, domain).core)
  return {
    persons: core.has('persons') ? drafts.persons : [],
    power: core.has('power') ? drafts.power : [],
    sides: core.has('sides') ? drafts.sides : { names: ['', ''], assignment: {} },
    treaty: core.has('treaty') ? drafts.treaty : { mode: 'none' },
    organizations: core.has('organizations') ? drafts.organizations : [],
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
    Object.keys(drafts.sides.assignment).length > 0 ||
    drafts.treaty.mode !== 'none' ||
    drafts.organizations.length > 0 ||
    drafts.election !== null
  )
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
  const next = { ...current }
  for (const row of participants) {
    const key = participantKey(row)
    if (next[key]) continue
    if (SIDE_A_ROLES.has(row.role ?? '')) next[key] = 'A'
    else if (SIDE_B_ROLES.has(row.role ?? '')) next[key] = 'B'
  }
  return next
}

const SIDE_COLORS: [string, string] = ['#1d4ed8', '#b91c1c']

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

  // 진영 — 소속을 하나라도 정했을 때만. 두 편을 만들고 참여국 줄에 진영을 건다.
  const assigned = Object.entries(drafts.sides.assignment)
  if (assigned.length > 0) {
    await attempt('진영', async () => {
      const names = drafts.sides.names.map((name, index) => name.trim() || `진영 ${index + 1}`)
      const sides: EventSide[] = await syncEventSides(eventId, [
        { name: names[0], level: 'COALITION', color: SIDE_COLORS[0] },
        { name: names[1], level: 'COALITION', color: SIDE_COLORS[1] },
      ])
      const sideIdOf = (slot: SideSlot): string | undefined => (slot === 'A' ? sides[0]?.id : sides[1]?.id)
      /* 참여국은 전체 목록 계약 — 키만 보내 역할·서술은 그대로 두고(생략=유지) 진영만 건다 */
      await updateEvent(eventId, {
        relatedCountries: input.participants.map((row) => {
          const slot = drafts.sides.assignment[participantKey(row)]
          const key = row.historicalCountryId
            ? { historicalCountryId: row.historicalCountryId }
            : { countryId: row.countryId ?? undefined }
          const sideId = slot ? sideIdOf(slot) : undefined
          return sideId ? { ...key, sideId } : key
        }),
      } as Parameters<typeof updateEvent>[1])
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
      await addEventOrganization(eventId, { organizationId: organization.id, role: organization.role })
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

  return { done, warnings }
}
