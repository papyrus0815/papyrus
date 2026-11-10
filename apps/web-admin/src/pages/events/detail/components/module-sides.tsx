import { useMemo, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FiExternalLink, FiPlus, FiX } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import { toParticipants, participantKey } from '@/entities/event/model'
import { RADIUS } from '@/entities/event/ui/ledger-tokens'
import { getApiConnection } from '@/shared/api/client'
import {
  type EventSide,
  listEventSideUnits,
  type SideOutcome,
  type SideUnitView,
  syncEventSides,
  toSideInputs,
} from '@/shared/api/event-sides'
import { type UpdateEventDto, updateEventOrganization } from '@/shared/api/events'
import { militaryUnitApi } from '@/shared/api/military-unit'
import { getOrganizationMembers } from '@/shared/api/organizations'
import {
  getPersonGroup,
  listPersonGroups,
  type PersonGroup,
} from '@/shared/api/person-groups'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog/confirm'
import { PersonPickerModal } from '@/shared/ui/person-picker'
import { notify } from '@/shared/ui/toast'
import { PersonGroupCreateModal } from '@/widgets/person/person-group-create-modal/person-group-create-modal'

import * as S from '../styles'
import { type EventDetail, eventKeys } from '../use-event-detail'
import { InlineSelect, InlineText } from './inline'
import { MODULE_COLOR } from './module-colors'
import { SIDE_PALETTE, withSideColors } from './side-colors'
import {
  type DoctrineFieldKey,
  SideDoctrineComparison,
  SideWeaponsSection,
  SubEventSidesRollupPanel,
} from './side-doctrine-and-weapons'
import { type AvailableMilitaryUnitItem, SideOrbatSection } from './side-orbat-tree'
import { SIDE_OUTCOME_LABEL, SIDE_OUTCOME_OPTIONS } from './side-outcome'

interface ModuleSidesProps {
  event: EventDetail
  onPatch: (patch: UpdateEventDto) => void
}

const PARTICIPATION_LABEL: Record<string, string> = {
  FULL: '전면',
  LIMITED: '제한',
  INDIRECT: '간접',
  NON_COMBATANT: '비전투',
}

function formatPoint(point: { era: 'BC' | 'AD'; year: number; month: number | null } | null): string | null {
  if (!point) return null
  const year = point.era === 'BC' ? `기원전 ${point.year}` : String(point.year)
  return point.month ? `${year}.${point.month}` : year
}

function isoToDecimalYear(iso: string | null | undefined, isEnd = false): number | null {
  if (!iso) return null
  const matched = /^(-?\d{1,6})(?:-(\d{2}))?/.exec(iso.trim())
  if (!matched) return null
  const year = Number(matched[1])
  if (!Number.isFinite(year)) return null
  const month = matched[2] ? Number(matched[2]) : isEnd ? 12 : 1
  return year + (Math.min(12, Math.max(1, month)) - (isEnd ? 0 : 1)) / 12
}

function pointToDecimalYear(
  point: { era: 'BC' | 'AD'; year: number; month: number | null } | null,
  isEnd = false,
): number | null {
  if (!point) return null
  const signedYear = point.era === 'BC' ? -point.year : point.year
  const month = point.month ?? (isEnd ? 12 : 1)
  return signedYear + (Math.min(12, Math.max(1, month)) - (isEnd ? 0 : 1)) / 12
}

function computeJoinSpanRatio(
  eventStartIso: string | null | undefined,
  eventEndIso: string | null | undefined,
  joinPoint: { era: 'BC' | 'AD'; year: number; month: number | null } | null,
  withdrawPoint: { era: 'BC' | 'AD'; year: number; month: number | null } | null,
): { leftPct: number; widthPct: number } | null {
  if (!joinPoint && !withdrawPoint) return null
  const startDec = isoToDecimalYear(eventStartIso, false)
  const endDec = isoToDecimalYear(eventEndIso ?? eventStartIso, true)
  if (startDec == null || endDec == null || endDec <= startDec) return null
  const totalSpan = endDec - startDec
  const joinDec = pointToDecimalYear(joinPoint, false) ?? startDec
  const withdrawDec = pointToDecimalYear(withdrawPoint, true) ?? endDec
  const leftPct = Math.min(92, Math.max(0, ((joinDec - startDec) / totalSpan) * 100))
  const rightPct = Math.min(100, Math.max(leftPct + 8, ((withdrawDec - startDec) / totalSpan) * 100))
  return { leftPct, widthPct: Math.max(8, rightPct - leftPct) }
}

/**
 * 진영(D1) — '누가 어느 편이었나'.
 *
 * 진영 자체(이름·설명·순서)는 진영 API로 저장하고, 나라·인물이 어느 편인지는 **참여국 줄·참여 인물
 * 줄의 sideId**로 저장한다(사건 수정 patch → 되돌리기 가능). 같은 나라를 진영과 참여국에 두 번
 * 적지 않는다 — 여기서 고르는 나라는 이미 이 사건의 참여국이다.
 */
export function ModuleSides({ event, onPatch }: ModuleSidesProps) {
  const queryClient = useQueryClient()
  const sides = useMemo(() => event.sides ?? [], [event.sides])
  /* 표시용 색 — 저장된 색이 없으면 순서대로 팔레트(저장값 불변) */
  const coloredSides = useMemo(() => withSideColors(sides), [sides])
  const [busy, setBusy] = useState(false)

  const participants = useMemo(
    () => toParticipants(event.relatedCountries, event.relatedHistoricalCountries),
    [event.relatedCountries, event.relatedHistoricalCountries],
  )
  /** 참여국 key → 표시 정보(이름·현재 진영) */
  const participantInfo = useMemo(() => {
    const byKey = new Map<string, { name: string; sideId: string | null }>()
    for (const country of event.relatedCountries ?? []) {
      byKey.set(participantKey({ countryId: country.id }), { name: country.name, sideId: country.sideId ?? null })
    }
    for (const country of event.relatedHistoricalCountries ?? []) {
      byKey.set(participantKey({ historicalCountryId: country.id }), {
        name: country.name,
        sideId: country.sideId ?? null,
      })
    }
    return byKey
  }, [event.relatedCountries, event.relatedHistoricalCountries])

  const persons = useMemo(() => event.relatedPersons ?? [], [event.relatedPersons])
  const organizations = useMemo(() => event.organizations ?? [], [event.organizations])

  /**
   * 인물 넣기 — 예전엔 **이 사건의 참여 인물** 중에서만 고를 수 있어, 사건에 없는 지휘관은 넣을 길이 없었다
   * (진영 설명 10개가 전부 '지휘관(인물 연결 대기): …'를 글로 적고 있었고, 진영 소속 인물은 0명).
   * 전체 인물에서 찾되 이 사건의 참여 인물을 맨 위에 고정하고, 사건에 없던 인물은 참여 인물로 함께 넣는다.
   */
  const [personPickerSide, setPersonPickerSide] = useState<EventSide | null>(null)
  const [creatingGroupSide, setCreatingGroupSide] = useState<EventSide | null>(null)

  const groupsQuery = useQuery({
    queryKey: ['person-groups-all', 'module-sides'],
    queryFn: () => listPersonGroups().catch(() => [] as PersonGroup[]),
    staleTime: 30_000,
  })

  const sideUnitsQuery = useQuery({
    queryKey: eventKeys.sideUnits(event.id),
    queryFn: () => listEventSideUnits(event.id).catch(() => [] as SideUnitView[]),
    staleTime: 30_000,
  })

  const allMilitaryUnitsQuery = useQuery({
    queryKey: ['military-units', 'all-for-event-sides'],
    queryFn: () =>
      militaryUnitApi.getAll().catch(() => [] as AvailableMilitaryUnitItem[]),
    staleTime: 60_000,
  })

  const sideUnitsBySideId = useMemo(() => {
    const map = new Map<string, SideUnitView[]>()
    for (const unit of sideUnitsQuery.data ?? []) {
      const list = map.get(unit.sideId) ?? []
      list.push(unit)
      map.set(unit.sideId, list)
    }
    return map
  }, [sideUnitsQuery.data])

  const sortedGroups = useMemo(() => {
    const all = groupsQuery.data ?? []
    const countryIds = new Set(
      (event.relatedCountries ?? []).map((country) => country.id).filter(Boolean),
    )
    const histCountryIds = new Set(
      (event.relatedHistoricalCountries ?? []).map((country) => country.id).filter(Boolean),
    )
    return [...all].sort((left, right) => {
      const score = (group: PersonGroup) => {
        let points = 0
        if (group.historicalCountryId && histCountryIds.has(group.historicalCountryId)) points += 4
        if (group.countryId && countryIds.has(group.countryId)) points += 2
        if (group.type === 'FACTION' || group.type === 'MOVEMENT') points += 1
        return points
      }
      return score(right) - score(left) || left.name.localeCompare(right.name)
    })
  }, [groupsQuery.data, event.relatedCountries, event.relatedHistoricalCountries])

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(event.id) }),
      queryClient.invalidateQueries({ queryKey: eventKeys.observations(event.id) }),
      queryClient.invalidateQueries({ queryKey: eventKeys.sideUnits(event.id) }),
    ])
  }

  const saveSides = async (next: ReturnType<typeof toSideInputs>, successMessage?: string) => {
    setBusy(true)
    try {
      await syncEventSides(event.id, next)
      await refresh()
      if (successMessage) notify.success(successMessage)
    } catch (error) {
      notify.error(error instanceof Error ? error.message : '진영을 저장하지 못했습니다')
    } finally {
      setBusy(false)
    }
  }

  const addSide = () => {
    const name = `진영 ${sides.length + 1}`
    void saveSides([
      ...toSideInputs(sides),
      { name, level: 'COALITION', color: SIDE_PALETTE[sides.length % SIDE_PALETTE.length] },
    ])
  }

  const renameSide = (side: EventSide, name: string) => {
    const trimmed = name.trim()
    if (!trimmed || trimmed === side.name) return
    void saveSides(toSideInputs(sides).map((input) => (input.id === side.id ? { ...input, name: trimmed } : input)))
  }

  const describeSide = (side: EventSide, description: string) => {
    void saveSides(
      toSideInputs(sides).map((input) =>
        input.id === side.id ? { ...input, description: description.trim() || null } : input,
      ),
    )
  }

  const updateDoctrineField = (
    side: EventSide,
    field: DoctrineFieldKey,
    value: string | null,
  ) => {
    void saveSides(
      toSideInputs(sides).map((input) =>
        input.id === side.id ? { ...input, [field]: value } : input,
      ),
    )
  }

  /** 결과·결과 단서 — 결과를 비우면 단서도 함께 비운다(무엇에 대한 단서인지 잃는다) */
  const setOutcome = (side: EventSide, patch: { outcome?: SideOutcome | null; outcomeNote?: string | null }) => {
    void saveSides(
      toSideInputs(sides).map((input) =>
        input.id === side.id
          ? { ...input, ...patch, ...(patch.outcome === null ? { outcomeNote: null } : {}) }
          : input,
      ),
    )
  }

  /** 영구 집단·계파(PersonGroup) 연결/해제 및 소속 인물 불러오기 */
  const importGroupMembersToSide = async (sideId: string, groupId: string) => {
    try {
      const detailed = await getPersonGroup(groupId)
      const members = detailed.members ?? []
      if (members.length === 0) return
      const existingById = new Map(persons.map((person) => [person.personId, person]))
      const nextPersons = [...persons.map((person) => ({
        personId: person.personId,
        role: person.role ?? undefined,
        note: person.note ?? undefined,
        sideId: person.sideId ?? undefined,
      }))]
      let addedCount = 0
      for (const member of members) {
        const pid = member.person.id
        const existing = existingById.get(pid)
        if (existing) {
          if (existing.sideId !== sideId) {
            const idx = nextPersons.findIndex((np) => np.personId === pid)
            if (idx >= 0) nextPersons[idx] = { ...nextPersons[idx], sideId }
            addedCount += 1
          }
        } else {
          nextPersons.push({
            personId: pid,
            role: member.roleLabel ?? undefined,
            sideId,
          })
          addedCount += 1
        }
      }
      if (addedCount > 0) {
        onPatch({ relatedPersons: nextPersons } as UpdateEventDto)
        notify.success(`집단 소속 인물 ${addedCount}명을 이 진영에 반영했습니다`)
      } else {
        notify.success('이미 모든 소속 인물이 이 진영에 들어 있습니다')
      }
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : '집단 소속 인물을 불러오지 못했습니다',
      )
    }
  }

  const linkPersonGroup = async (side: EventSide, groupId: string | null) => {
    const picked = groupId ? sortedGroups.find((group) => group.id === groupId) : null
    const shouldRename =
      picked && (/^진영\s*\d+$/.test(side.name.trim()) || !side.name.trim())
    await saveSides(
      toSideInputs(sides).map((input) =>
        input.id === side.id
          ? {
              ...input,
              personGroupId: groupId,
              ...(shouldRename ? { name: picked.name } : {}),
            }
          : input,
      ),
      picked ? `‘${picked.name}’ 계파를 연결했습니다` : '계파 연결을 해제했습니다',
    )
    if (groupId) {
      await importGroupMembersToSide(side.id, groupId)
    }
  }

  const assignOrganization = async (relationId: string, sideId: string | null) => {
    setBusy(true)
    try {
      await updateEventOrganization(event.id, relationId, { sideId })
      await refresh()
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : '조직 진영 배정에 실패했습니다',
      )
    } finally {
      setBusy(false)
    }
  }

  const importOrganizationMembersToSide = async (
    sideId: string,
    organizationId: string,
    organizationName: string,
  ) => {
    try {
      const members = await getOrganizationMembers(
        getApiConnection(),
        organizationId,
      )
      if (members.length === 0) {
        notify.info(`‘${organizationName}’에 등록된 소속 인물이 없습니다`)
        return
      }
      const existingById = new Map(
        persons.map((person) => [person.personId, person]),
      )
      const nextPersons = [
        ...persons.map((person) => ({
          personId: person.personId,
          role: person.role ?? undefined,
          note: person.note ?? undefined,
          sideId: person.sideId ?? undefined,
        })),
      ]
      let addedCount = 0
      for (const member of members) {
        const pid = member.person.id
        const existing = existingById.get(pid)
        if (existing) {
          if (existing.sideId !== sideId) {
            const idx = nextPersons.findIndex((np) => np.personId === pid)
            if (idx >= 0) nextPersons[idx] = { ...nextPersons[idx], sideId }
            addedCount += 1
          }
        } else {
          nextPersons.push({
            personId: pid,
            role: member.roleTitle ?? organizationName,
            sideId,
          })
          addedCount += 1
        }
      }
      if (addedCount > 0) {
        onPatch({ relatedPersons: nextPersons } as UpdateEventDto)
        notify.success(
          `‘${organizationName}’ 소속 인물 ${addedCount}명을 이 진영에 반영했습니다`,
        )
      } else {
        notify.success('이미 모든 소속 인물이 이 진영에 들어 있습니다')
      }
    } catch (error) {
      notify.error(
        error instanceof Error
          ? error.message
          : '기관·조직 소속 인물을 불러오지 못했습니다',
      )
    }
  }

  const removeSide = async (side: EventSide) => {
    const memberCount = side.participants.length + side.persons.length
    const ok = await confirm({
      title: `'${side.name}' 진영을 지울까요?`,
      message:
        `소속 ${memberCount}곳은 진영만 풀리고 사건에는 그대로 남습니다. ` +
        '이 진영에 기록된 병력·사상자 수치는 함께 지워집니다.',
      confirmLabel: '진영 지우기',
      danger: true,
    })
    if (!ok) return
    void saveSides(
      toSideInputs(sides).filter((input) => input.id !== side.id),
      `'${side.name}' 진영을 지웠습니다`,
    )
  }

  /** 참여국을 진영에 넣거나(sideId) 뺀다(null) — 다른 진영에 있었다면 옮겨진다 */
  const assignCountry = (key: string, sideId: string | null) => {
    onPatch({
      relatedCountries: participants.map((participant) =>
        participantKey(participant) === key ? { ...participant, sideId } : participant,
      ),
    } as UpdateEventDto)
  }

  const assignPerson = (personId: string, sideId: string | null) => {
    const known = persons.some((person) => person.personId === personId)
    onPatch({
      relatedPersons: [
        ...persons.map((person) => ({
          personId: person.personId,
          role: person.role ?? undefined,
          note: person.note ?? undefined,
          ...(person.personId === personId ? { sideId } : {}),
        })),
        /* 사건에 없던 인물 — 참여 인물로 들이면서 바로 이 진영에 */
        ...(known || !sideId ? [] : [{ personId, sideId }]),
      ],
    } as UpdateEventDto)
  }

  const swapFirstTwoSides = () => {
    if (sides.length < 2) return
    const inputs = toSideInputs(sides)
    const first = inputs[0]
    const second = inputs[1]
    if (!first || !second) return
    inputs[0] = second
    inputs[1] = first
    void saveSides(inputs, '진영 순서를 맞바꿨습니다')
  }

  type DraggedDetailMember = {
    kind: 'country' | 'person' | 'organization'
    key: string
    fromSideId: string | null
  }
  const [draggedMember, setDraggedMember] = useState<DraggedDetailMember | null>(null)
  const [dragOverTarget, setDragOverTarget] = useState<string | 'UNASSIGNED' | null>(null)

  const encodeDetailDrag = (member: DraggedDetailMember) =>
    `${member.kind}:${member.key}`

  const decodeDetailDrag = (raw: string): DraggedDetailMember | null => {
    const colonIdx = raw.indexOf(':')
    if (colonIdx <= 0) return null
    const kind = raw.slice(0, colonIdx)
    const key = raw.slice(colonIdx + 1)
    if (!key) return null
    if (kind === 'country' || kind === 'person' || kind === 'organization') {
      return { kind, key, fromSideId: null }
    }
    return null
  }

  const handleMemberDrop = (
    dragEvent: React.DragEvent<HTMLElement>,
    targetSideId: string | null,
  ) => {
    dragEvent.preventDefault()
    const payload =
      draggedMember ??
      decodeDetailDrag(dragEvent.dataTransfer?.getData('text/plain') ?? '')
    setDraggedMember(null)
    setDragOverTarget(null)
    if (!payload) return
    if (payload.fromSideId !== null && payload.fromSideId === targetSideId) return
    if (payload.kind === 'country') {
      assignCountry(payload.key, targetSideId)
    } else if (payload.kind === 'person') {
      assignPerson(payload.key, targetSideId)
    } else {
      void assignOrganization(payload.key, targetSideId)
    }
  }

  const unassignedCountries = participants.filter(
    (participant) => !participantInfo.get(participantKey(participant))?.sideId,
  )
  const unassignedPersons = persons.filter((person) => !person.sideId)
  const unassignedOrgs = organizations.filter(
    (org) =>
      !sides.some((side) =>
        side.organizations.some((member) => member.relationId === org.relationId),
      ),
  )
  const hasUnassignedAny =
    unassignedCountries.length + unassignedPersons.length + unassignedOrgs.length > 0
  const totalAssignedAcrossSides = sides.reduce(
    (sum, side) =>
      sum +
      side.participants.length +
      side.persons.length +
      side.organizations.length,
    0,
  )

  return (
    <S.Section id="module-sides" aria-busy={busy}>
      <S.SectionHeader>
        <S.SectionTitle>
          <S.SectionTitleDot $color={MODULE_COLOR.sides} />
          진영
        </S.SectionTitle>
        {/* 제목이 이미 '진영' — '2개 진영'은 같은 말을 두 번 한다 */}
        {sides.length > 0 && <S.SectionSubtitle>{sides.length}</S.SectionSubtitle>}
      </S.SectionHeader>

      {sides.length >= 2 && (
        <VsBanner role="region" aria-label="진영 대결 구도 요약">
          <VsTopRow>
            <VsTeamsWrap>
              {coloredSides.map((side, index) => {
                const sideUnitCount = (sideUnitsBySideId.get(side.id) ?? []).length
                const countParts = [
                  side.participants.length > 0 ? `국가 ${side.participants.length}` : '',
                  side.persons.length > 0 ? `인물 ${side.persons.length}` : '',
                  side.organizations.length > 0 ? `조직 ${side.organizations.length}` : '',
                  sideUnitCount > 0 ? `부대 ${sideUnitCount}` : '',
                ].filter(Boolean)
                return (
                  <VsTeamGroup key={side.id}>
                    {index > 0 && <VsDividerBadge aria-hidden>VS</VsDividerBadge>}
                    <VsTeamDot $color={side.color} />
                    <VsTeamName>{side.name}</VsTeamName>
                    {side.outcome && (
                      <VsOutcomeBadge $outcome={side.outcome}>
                        {SIDE_OUTCOME_LABEL[side.outcome]}
                      </VsOutcomeBadge>
                    )}
                    <VsTeamMeta>
                      ({countParts.length > 0 ? countParts.join(' · ') : '소속 0'})
                    </VsTeamMeta>
                  </VsTeamGroup>
                )
              })}
            </VsTeamsWrap>
            <VsActionsWrap>
              <VsDragHint>⠿ 항목을 끌어 진영 이동</VsDragHint>
              <VsSwapButton
                type="button"
                disabled={busy}
                aria-label="1번·2번 진영 순서 맞바꾸기"
                onClick={swapFirstTwoSides}
              >
                ⇄ 순서 바꾸기
              </VsSwapButton>
            </VsActionsWrap>
          </VsTopRow>
          <VsGaugeTrack aria-hidden>
            {coloredSides.map((side) => {
              const memberCount =
                side.participants.length +
                side.persons.length +
                side.organizations.length
              const weight =
                totalAssignedAcrossSides > 0 ? Math.max(memberCount, 0.25) : 1
              return (
                <VsGaugeSegment
                  key={side.id}
                  $color={side.color}
                  $empty={memberCount === 0}
                  style={{ flexGrow: weight }}
                />
              )
            })}
          </VsGaugeTrack>
        </VsBanner>
      )}

      {sides.length > 0 && (
        <SideDoctrineComparison
          sides={coloredSides}
          disabled={busy}
          onSaveField={updateDoctrineField}
        />
      )}

      {event.kind === 'COLLECTION' && (
        <SubEventSidesRollupPanel eventId={event.id} />
      )}

      <SideGrid>
        {sides.map((side, sideIndex) => {
          const otherIndex = sides.length >= 2 ? (sideIndex + 1) % sides.length : -1
          const otherSide = otherIndex >= 0 ? sides[otherIndex] : null
          const sideColor =
            coloredSides.find((colored) => colored.id === side.id)?.color ??
            SIDE_PALETTE[0]
          const countryOptions = participants
            .filter((participant) => participantInfo.get(participantKey(participant))?.sideId !== side.id)
            .map((participant) => {
              const info = participantInfo.get(participantKey(participant))
              const elsewhere = info?.sideId ? sides.find((other) => other.id === info.sideId)?.name : null
              return {
                value: participantKey(participant),
                label: elsewhere ? `${info?.name ?? ''} (${elsewhere}에서 옮김)` : (info?.name ?? ''),
              }
            })
          const orgOptions = organizations
            .filter((org) => !side.organizations.some((member) => member.relationId === org.relationId))
            .map((org) => {
              const elsewhere = sides.find((other) =>
                other.organizations.some((member) => member.relationId === org.relationId),
              )?.name
              return {
                value: org.relationId,
                label: elsewhere
                  ? `${org.name} (${elsewhere}에서 옮김)`
                  : org.name,
              }
            })
          const groupOptions = sortedGroups.map((group) => ({
            value: group.id,
            label: `${group.name}${
              group.historicalCountryName
                ? ` (${group.historicalCountryName})`
                : group.countryName
                  ? ` (${group.countryName})`
                  : ''
            }`,
          }))
          return (
            <SideCard
              key={side.id}
              data-side-dropzone={side.id}
              $dragOver={dragOverTarget === side.id}
              $color={sideColor}
              onDragOver={(dragEvent) => {
                dragEvent.preventDefault()
                if (dragOverTarget !== side.id) setDragOverTarget(side.id)
              }}
              onDragLeave={(dragEvent) => {
                if (
                  !dragEvent.currentTarget.contains(
                    dragEvent.relatedTarget as Node | null,
                  )
                ) {
                  setDragOverTarget((current) =>
                    current === side.id ? null : current,
                  )
                }
              }}
              onDrop={(dragEvent) => handleMemberDrop(dragEvent, side.id)}
            >
              <SideHead $color={sideColor}>
                <SideName>
                  <InlineText value={side.name} onSave={(next) => renameSide(side, next)} as="span" />
                </SideName>
                <RemoveButton type="button" onClick={() => void removeSide(side)} aria-label={`${side.name} 진영 지우기`}>
                  <FiX />
                </RemoveButton>
              </SideHead>

              <FactionLinkRow aria-label={`${side.name} 영구 계파 연결`}>
                {side.personGroupId ? (
                  <>
                    <FactionBadgeLink
                      to={pathKeys.personGroupDetail(side.personGroupId)}
                      title="영구 등록된 집단·계파 상세 보기"
                    >
                      계파: {side.personGroup?.name ?? side.name}{' '}
                      <FiExternalLink size={11} />
                    </FactionBadgeLink>
                    <PersonPickButton
                      type="button"
                      onClick={() =>
                        void importGroupMembersToSide(
                          side.id,
                          side.personGroupId!,
                        )
                      }
                    >
                      소속 인물 불러오기
                    </PersonPickButton>
                    <PersonPickButton
                      type="button"
                      onClick={() => void linkPersonGroup(side, null)}
                    >
                      연결 해제
                    </PersonPickButton>
                  </>
                ) : (
                  <>
                    {groupOptions.length > 0 && (
                      <InlineSelect
                        value=""
                        options={groupOptions}
                        onSave={(groupId) =>
                          void linkPersonGroup(side, groupId || null)
                        }
                        placeholder="영구 계파 연결"
                        label={`${side.name}에 연결할 영구 집단·계파`}
                      />
                    )}
                    <PersonPickButton
                      type="button"
                      onClick={() => setCreatingGroupSide(side)}
                    >
                      + 영구 계파로 등록
                    </PersonPickButton>
                  </>
                )}
              </FactionLinkRow>

              <OutcomeRow aria-label={`${side.name}의 결과`}>
                <OutcomeLabel>결과</OutcomeLabel>
                <InlineSelect
                  value={side.outcome ?? ''}
                  options={SIDE_OUTCOME_OPTIONS}
                  onSave={(next) => setOutcome(side, { outcome: (next || null) as SideOutcome | null })}
                  placeholder="미정"
                  label={`${side.name} 결과`}
                />
                {side.outcome && (
                  <OutcomeNote>
                    <InlineText
                      value={side.outcomeNote ?? ''}
                      onSave={(next) => setOutcome(side, { outcomeNote: next.trim() || null })}
                      placeholder="단서 — 예: 전략적 승리, 전술적 패배"
                      as="span"
                    />
                  </OutcomeNote>
                )}
              </OutcomeRow>

              <MemberList aria-label={`${side.name} 소속 국가`}>
                {side.participants.map((member) => {
                  const key = member.historicalCountryId
                    ? participantKey({ historicalCountryId: member.historicalCountryId })
                    : participantKey({ countryId: member.countryId })
                  const join = formatPoint(member.join)
                  const withdraw = formatPoint(member.withdraw)
                  const spanRatio = computeJoinSpanRatio(
                    event.startDate,
                    event.endDate,
                    member.join,
                    member.withdraw,
                  )
                  const dragPayload: DraggedDetailMember = {
                    kind: 'country',
                    key,
                    fromSideId: side.id,
                  }
                  return (
                    <Member
                      key={member.participantId}
                      draggable
                      title="드래그하여 다른 진영이나 미지정으로 이동"
                      onDragStart={(dragEvent) => {
                        setDraggedMember(dragPayload)
                        dragEvent.dataTransfer?.setData(
                          'text/plain',
                          encodeDetailDrag(dragPayload),
                        )
                      }}
                      onDragEnd={() => {
                        setDraggedMember(null)
                        setDragOverTarget(null)
                      }}
                    >
                      <MemberName>{member.name}</MemberName>
                      {member.participation && member.participation !== 'FULL' && (
                        <MemberTag>{PARTICIPATION_LABEL[member.participation] ?? member.participation}</MemberTag>
                      )}
                      {(join || withdraw) && (
                        <MemberMeta title={[member.joinReason, member.withdrawReason].filter(Boolean).join(' / ')}>
                          {spanRatio && (
                            <MemberTimelineTrack
                              aria-label={`${member.name} 참전 기간 비율`}
                              title={`사건 기간 대비 참전 구간 (${join ? `${join} 가담` : '개전부터'} ~ ${withdraw ? `${withdraw} 이탈` : '종전까지'})`}
                            >
                              <MemberTimelineFill
                                $color={sideColor}
                                style={{
                                  left: `${spanRatio.leftPct}%`,
                                  width: `${spanRatio.widthPct}%`,
                                }}
                              />
                            </MemberTimelineTrack>
                          )}
                          {join ? `${join} 가담` : ''}
                          {join && withdraw ? ' · ' : ''}
                          {withdraw ? `${withdraw} 이탈` : ''}
                        </MemberMeta>
                      )}
                      {otherSide && (
                        <MemberSwitchBtn
                          type="button"
                          onClick={() => assignCountry(key, otherSide.id)}
                          aria-label={`${member.name} ${otherSide.name}(으)로 이동`}
                          title={`${otherSide.name}(으)로 이동`}
                        >
                          →{otherIndex + 1}편
                        </MemberSwitchBtn>
                      )}
                      <MemberRemove
                        type="button"
                        onClick={() => assignCountry(key, null)}
                        aria-label={`${member.name}을(를) 진영에서 빼기`}
                      >
                        <FiX />
                      </MemberRemove>
                    </Member>
                  )
                })}
                {side.persons.map((member) => {
                  const dragPayload: DraggedDetailMember = {
                    kind: 'person',
                    key: member.personId,
                    fromSideId: side.id,
                  }
                  return (
                    <Member
                      key={member.personEventId}
                      $person
                      draggable
                      title="드래그하여 다른 진영이나 미지정으로 이동"
                      onDragStart={(dragEvent) => {
                        setDraggedMember(dragPayload)
                        dragEvent.dataTransfer?.setData(
                          'text/plain',
                          encodeDetailDrag(dragPayload),
                        )
                      }}
                      onDragEnd={() => {
                        setDraggedMember(null)
                        setDragOverTarget(null)
                      }}
                    >
                      <MemberName>{[member.name, member.surname].filter(Boolean).join(' ')}</MemberName>
                      {otherSide && (
                        <MemberSwitchBtn
                          type="button"
                          onClick={() => assignPerson(member.personId, otherSide.id)}
                          aria-label={`${member.name} ${otherSide.name}(으)로 이동`}
                          title={`${otherSide.name}(으)로 이동`}
                        >
                          →{otherIndex + 1}편
                        </MemberSwitchBtn>
                      )}
                      <MemberRemove
                        type="button"
                        onClick={() => assignPerson(member.personId, null)}
                        aria-label={`${member.name}을(를) 진영에서 빼기`}
                      >
                        <FiX />
                      </MemberRemove>
                    </Member>
                  )
                })}
                {side.organizations.map((org) => {
                  const dragPayload: DraggedDetailMember = {
                    kind: 'organization',
                    key: org.relationId,
                    fromSideId: side.id,
                  }
                  return (
                    <Member
                      key={org.relationId}
                      $person
                      draggable
                      title="드래그하여 다른 진영이나 미지정으로 이동"
                      onDragStart={(dragEvent) => {
                        setDraggedMember(dragPayload)
                        dragEvent.dataTransfer?.setData(
                          'text/plain',
                          encodeDetailDrag(dragPayload),
                        )
                      }}
                      onDragEnd={() => {
                        setDraggedMember(null)
                        setDragOverTarget(null)
                      }}
                    >
                      <MemberName>
                        <Link
                          to={`/organizations?selected=${org.organizationId}&tab=members`}
                          title="기관·조직 상세 및 소속 인물 관리"
                          style={{ color: 'inherit', textDecoration: 'none' }}
                        >
                          🏢 {org.name}
                        </Link>
                      </MemberName>
                      <FactionTinyBtn
                        type="button"
                        title={`${org.name} 소속 인물(위원·역할)을 이 진영으로 불러오기`}
                        onClick={() =>
                          void importOrganizationMembersToSide(
                            side.id,
                            org.organizationId,
                            org.name,
                          )
                        }
                      >
                        소속 인물 불러오기
                      </FactionTinyBtn>
                      {otherSide && (
                        <MemberSwitchBtn
                          type="button"
                          onClick={() => void assignOrganization(org.relationId, otherSide.id)}
                          aria-label={`${org.name} ${otherSide.name}(으)로 이동`}
                          title={`${otherSide.name}(으)로 이동`}
                        >
                          →{otherIndex + 1}편
                        </MemberSwitchBtn>
                      )}
                      <MemberRemove
                        type="button"
                        onClick={() => void assignOrganization(org.relationId, null)}
                        aria-label={`${org.name}을(를) 진영에서 빼기`}
                      >
                        <FiX />
                      </MemberRemove>
                    </Member>
                  )
                })}
                {side.participants.length + side.persons.length + side.organizations.length === 0 && (
                  <EmptyLine>아직 소속이 없습니다 — 이 사건의 참여국·인물·계파에서 고르거나 칩을 끌어 놓으세요</EmptyLine>
                )}
              </MemberList>

              <Pickers>
                {countryOptions.length > 0 && (
                  <InlineSelect
                    value=""
                    options={countryOptions}
                    onSave={(key) => assignCountry(key, side.id)}
                    placeholder="국가 넣기"
                    label={`${side.name}에 넣을 참여국`}
                  />
                )}
                <PersonPickButton type="button" onClick={() => setPersonPickerSide(side)}>
                  인물 넣기
                </PersonPickButton>
                {orgOptions.length > 0 && (
                  <InlineSelect
                    value=""
                    options={orgOptions}
                    onSave={(relationId) => void assignOrganization(relationId, side.id)}
                    placeholder="조직 넣기"
                    label={`${side.name}에 넣을 조직`}
                  />
                )}
              </Pickers>

              <SideOrbatSection
                eventId={event.id}
                sideId={side.id}
                sideName={side.name}
                sideColor={sideColor}
                sideUnits={sideUnitsBySideId.get(side.id) ?? []}
                allSideUnits={sideUnitsQuery.data ?? []}
                availableUnits={(allMilitaryUnitsQuery.data ?? []) as AvailableMilitaryUnitItem[]}
                sideCountryIds={
                  new Set(
                    side.participants
                      .map((participant) => participant.countryId)
                      .filter((id): id is string => Boolean(id)),
                  )
                }
                sideHistoricalCountryIds={
                  new Set(
                    side.participants
                      .map((participant) => participant.historicalCountryId)
                      .filter((id): id is string => Boolean(id)),
                  )
                }
                candidatePersonIds={persons.map((person) => person.personId)}
                onRefresh={refresh}
              />

              <SideWeaponsSection
                eventId={event.id}
                sideId={side.id}
                sideName={side.name}
                sideColor={sideColor}
                sideUnits={sideUnitsBySideId.get(side.id) ?? []}
              />

              <SideDescription>
                <InlineText
                  value={side.description ?? ''}
                  onSave={(next) => describeSide(side, next)}
                  placeholder="진영 설명"
                  multiline
                  multilineEnter
                />
              </SideDescription>
            </SideCard>
          )
        })}
      </SideGrid>

      {sides.length > 0 && (hasUnassignedAny || (draggedMember && draggedMember.fromSideId !== null)) && (
        /* 진영 밖 참여국·인물·조직 — 이름을 누르면 진영을 고르거나 진영 카드로 드래그해 넣는다 */
        <Unassigned
          aria-label="진영 미지정 참여국"
          $dragOver={dragOverTarget === 'UNASSIGNED'}
          onDragOver={(dragEvent) => {
            dragEvent.preventDefault()
            if (dragOverTarget !== 'UNASSIGNED') setDragOverTarget('UNASSIGNED')
          }}
          onDragLeave={(dragEvent) => {
            if (
              !dragEvent.currentTarget.contains(
                dragEvent.relatedTarget as Node | null,
              )
            ) {
              setDragOverTarget((current) =>
                current === 'UNASSIGNED' ? null : current,
              )
            }
          }}
          onDrop={(dragEvent) => handleMemberDrop(dragEvent, null)}
        >
          <UnassignedLabel>
            {hasUnassignedAny
              ? '진영 미지정'
              : '여기에 놓으면 진영 배정이 해제됩니다'}
          </UnassignedLabel>
          {unassignedCountries.map((participant) => {
            const key = participantKey(participant)
            const name = participantInfo.get(key)?.name ?? ''
            const dragPayload: DraggedDetailMember = {
              kind: 'country',
              key,
              fromSideId: null,
            }
            return (
              <UnassignedChip
                key={key}
                draggable
                title="원하는 진영 카드로 드래그하여 배정"
                onDragStart={(dragEvent) => {
                  setDraggedMember(dragPayload)
                  dragEvent.dataTransfer?.setData(
                    'text/plain',
                    encodeDetailDrag(dragPayload),
                  )
                }}
                onDragEnd={() => {
                  setDraggedMember(null)
                  setDragOverTarget(null)
                }}
              >
                <InlineSelect
                  value=""
                  options={sides.map((side) => ({ value: side.id, label: `${side.name}에 넣기` }))}
                  onSave={(sideId) => assignCountry(key, sideId)}
                  placeholder={name}
                  label={`${name}의 진영`}
                  clearable={false}
                />
              </UnassignedChip>
            )
          })}
          {unassignedPersons.map((person) => {
            const personName = [person.person.name, person.person.surname].filter(Boolean).join(' ')
            const dragPayload: DraggedDetailMember = {
              kind: 'person',
              key: person.personId,
              fromSideId: null,
            }
            return (
              <UnassignedChip
                key={`person-${person.personId}`}
                draggable
                title="원하는 진영 카드로 드래그하여 배정"
                onDragStart={(dragEvent) => {
                  setDraggedMember(dragPayload)
                  dragEvent.dataTransfer?.setData(
                    'text/plain',
                    encodeDetailDrag(dragPayload),
                  )
                }}
                onDragEnd={() => {
                  setDraggedMember(null)
                  setDragOverTarget(null)
                }}
              >
                <InlineSelect
                  value=""
                  options={sides.map((side) => ({ value: side.id, label: `${side.name}에 넣기` }))}
                  onSave={(sideId) => assignPerson(person.personId, sideId)}
                  placeholder={`👤 ${personName}`}
                  label={`${personName}의 진영`}
                  clearable={false}
                />
              </UnassignedChip>
            )
          })}
          {unassignedOrgs.map((org) => {
            const dragPayload: DraggedDetailMember = {
              kind: 'organization',
              key: org.relationId,
              fromSideId: null,
            }
            return (
              <UnassignedChip
                key={`org-${org.relationId}`}
                draggable
                title="원하는 진영 카드로 드래그하여 배정"
                onDragStart={(dragEvent) => {
                  setDraggedMember(dragPayload)
                  dragEvent.dataTransfer?.setData(
                    'text/plain',
                    encodeDetailDrag(dragPayload),
                  )
                }}
                onDragEnd={() => {
                  setDraggedMember(null)
                  setDragOverTarget(null)
                }}
              >
                <InlineSelect
                  value=""
                  options={sides.map((side) => ({ value: side.id, label: `${side.name}에 넣기` }))}
                  onSave={(sideId) => void assignOrganization(org.relationId, sideId)}
                  placeholder={`🏢 ${org.name}`}
                  label={`${org.name}의 진영`}
                  clearable={false}
                />
              </UnassignedChip>
            )
          })}
        </Unassigned>
      )}

      <AddSideButton type="button" onClick={addSide} disabled={busy}>
        <FiPlus /> 진영 추가
      </AddSideButton>

      {personPickerSide && (
        /* 인물 목록은 고르기 모달이 스스로 받는다(앱 전역 캐시 공유) */
        <PersonPickerModal
          onSelect={(personId) => assignPerson(personId, personPickerSide.id)}
          onClose={() => setPersonPickerSide(null)}
          excludeIds={personPickerSide.persons.map((member) => member.personId)}
          excludeReason="이미 이 진영"
          pinnedIds={persons.map((person) => person.personId)}
          title={`${personPickerSide.name}에 넣을 인물`}
        />
      )}

      {creatingGroupSide && (
        <PersonGroupCreateModal
          defaultType="FACTION"
          defaultName={creatingGroupSide.name}
          defaultCountryId={event.relatedCountries?.[0]?.id}
          defaultHistoricalCountryId={event.relatedHistoricalCountries?.[0]?.id}
          defaultMembers={creatingGroupSide.persons.map((member) => ({
            id: member.personId,
            name: [member.name, member.surname].filter(Boolean).join(' '),
          }))}
          candidatePersons={(event.persons ?? []).map((person) => ({
            id: person.id,
            name: [person.name, person.surname].filter(Boolean).join(' '),
          }))}
          onClose={() => setCreatingGroupSide(null)}
          onCreated={(createdGroup) => {
            const targetSide = creatingGroupSide
            setCreatingGroupSide(null)
            void linkPersonGroup(targetSide, createdGroup.id)
          }}
        />
      )}
    </S.Section>
  )
}

const VsBanner = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
  padding: 10px 14px;
  border-radius: ${RADIUS.MD};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.025)'};
`

const VsTopRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px 12px;
`

const VsTeamsWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  min-width: 0;
`

const VsTeamGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  min-width: 0;
`

const VsTeamDot = styled.span<{ $color: string }>`
  width: 9px;
  height: 9px;
  border-radius: 3px;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

const VsTeamName = styled.span`
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const VsOutcomeBadge = styled.span<{ $outcome: SideOutcome }>`
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  background: ${({ $outcome, theme }) =>
    $outcome === 'VICTORY'
      ? theme.mode === 'dark'
        ? 'rgba(16, 185, 129, 0.2)'
        : 'rgba(16, 185, 129, 0.14)'
      : $outcome === 'DEFEAT'
        ? theme.mode === 'dark'
          ? 'rgba(244, 63, 94, 0.2)'
          : 'rgba(244, 63, 94, 0.12)'
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.1)'
          : 'rgba(15, 23, 42, 0.08)'};
  color: ${({ $outcome, theme }) =>
    $outcome === 'VICTORY'
      ? theme.mode === 'dark'
        ? '#34d399'
        : '#047857'
      : $outcome === 'DEFEAT'
        ? theme.mode === 'dark'
          ? '#fb7185'
          : '#be123c'
        : theme.colors.text.secondary};
`

const VsTeamMeta = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const VsDividerBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.04em;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.08)'};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const VsActionsWrap = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
`

const VsDragHint = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const VsSwapButton = styled.button`
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(15,23,42,0.14)'};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const VsGaugeTrack = styled.div`
  display: flex;
  width: 100%;
  height: 6px;
  border-radius: 999px;
  overflow: hidden;
  gap: 2px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'};
`

const VsGaugeSegment = styled.div<{ $color: string; $empty?: boolean }>`
  height: 100%;
  border-radius: 999px;
  background: ${({ $color }) => $color};
  opacity: ${({ $empty }) => ($empty ? 0.25 : 0.85)};
  transition: flex-grow 0.22s ease, opacity 0.18s ease;
`

const SideGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
  gap: 16px;
`

/**
 * 진영 카드 — 선 없이 면으로(참여 탭과 같은 문법). 진영 색은 위 테두리가 아니라 머리 띠의 옅은 바탕으로.
 */
const SideCard = styled.section<{ $dragOver?: boolean; $color?: string }>`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0 16px 14px;
  border-radius: ${RADIUS.MD};
  background: ${({ theme, $dragOver, $color }) =>
    $dragOver && $color
      ? `color-mix(in srgb, ${$color} ${theme.mode === 'dark' ? 14 : 8}%, transparent)`
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.035)'
        : 'rgba(15,23,42,0.03)'};
  outline: ${({ $dragOver, $color }) =>
    $dragOver && $color ? `2px dashed ${$color}` : 'none'};
  outline-offset: -2px;
  overflow: hidden;
  min-width: 0;
  transition: background 0.14s ease, outline-color 0.14s ease;
`

const SideHead = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 0 -16px;
  padding: 10px 12px 10px 16px;
  background: ${({ $color, theme }) => `color-mix(in srgb, ${$color} ${theme.mode === 'dark' ? 18 : 10}%, transparent)`};
  &::before {
    content: '';
    flex-shrink: 0;
    width: 10px;
    height: 10px;
    border-radius: 3px;
    background: ${({ $color }) => $color};
  }
  > :first-child {
    flex: 1;
  }
`

const SideName = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  min-width: 0;
`

const RemoveButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: ${RADIUS.XS};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.error};
  }

  svg {
    width: 13px;
    height: 13px;
  }
`

/** 결과 줄 — 머리 띠 바로 아래. 진영의 '끝'을 이름 다음으로 읽게 */
const OutcomeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 8px;
  font-size: 13px;
  font-weight: 650;
  color: ${({ theme }) => theme.colors.text.primary};
`

const FactionLinkRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  font-size: 12.5px;
`

const FactionBadgeLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  background: ${({ theme }) => `${theme.colors.primary}16`};
  color: ${({ theme }) => theme.colors.primary};
  border: 1px solid ${({ theme }) => `${theme.colors.primary}38`};

  &:hover {
    filter: brightness(0.92);
  }
`

const OutcomeLabel = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const OutcomeNote = styled.span`
  flex: 1 1 140px;
  min-width: 0;
  font-size: 12.5px;
  font-weight: 400;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const MemberList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
`

const Member = styled.li<{ $person?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: ${({ $person }) => ($person ? '12.5px' : '13.5px')};
  color: ${({ theme, $person }) => ($person ? theme.colors.text.secondary : theme.colors.text.primary)};
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
`

const MemberName = styled.span`
  font-weight: 600;
  min-width: 0;
  overflow-wrap: anywhere;
`

const MemberTag = styled.span`
  flex-shrink: 0;
  padding: 0 6px;
  border-radius: ${RADIUS.PILL};
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)')};
`

const MemberMeta = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const MemberTimelineTrack = styled.span`
  position: relative;
  display: inline-block;
  width: 44px;
  height: 5px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)'};
  overflow: hidden;
  flex-shrink: 0;
`

const MemberTimelineFill = styled.span<{ $color: string }>`
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: 999px;
  background: ${({ $color }) => $color};
`

const MemberSwitchBtn = styled.button`
  margin-left: auto;
  flex-shrink: 0;
  padding: 1px 6px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.16)' : 'rgba(15,23,42,0.14)'};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font: inherit;
  font-size: 10.5px;
  font-weight: 700;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.12s, color 0.12s, border-color 0.12s;

  li:hover > &,
  &:focus-visible {
    opacity: 1;
  }

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const MemberRemove = styled.button`
  margin-left: auto;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.12s;

  ${MemberSwitchBtn} + & {
    margin-left: 0;
  }

  li:hover > &,
  &:focus-visible {
    opacity: 1;
  }

  &:hover {
    color: ${({ theme }) => theme.colors.error};
  }

  svg {
    width: 11px;
    height: 11px;
  }
`

const EmptyLine = styled.li`
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Pickers = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12.5px;
`

const SideDescription = styled.div`
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: pre-line;
`

const Unassigned = styled.div<{ $dragOver?: boolean }>`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  margin: 12px 0 0;
  padding: ${({ $dragOver }) => ($dragOver ? '8px 10px' : '4px 0')};
  border-radius: ${RADIUS.SM};
  outline: ${({ $dragOver, theme }) =>
    $dragOver ? `2px dashed ${theme.colors.primary}` : 'none'};
  background: ${({ $dragOver, theme }) =>
    $dragOver ? `${theme.colors.primary}12` : 'transparent'};
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
  transition: padding 0.14s ease, background 0.14s ease;
`

const UnassignedLabel = styled.span`
  font-weight: 600;
  margin-right: 2px;
`

/** 진영을 고를 수 있는 이름 칩 — 무채 면(아직 어느 진영 색도 아니다) */
const UnassignedChip = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 999px;
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.06)')};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: grab;

  &:active {
    cursor: grabbing;
  }

  /* 인라인 피커의 빈 값 자리표시(기울임·흐림)를 칩 안에선 평범한 이름처럼 */
  [data-empty='true'] {
    font-style: normal;
    color: inherit;
  }
`

const AddSideButton = styled.button`
  align-self: flex-start;
  margin-top: 14px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: ${RADIUS.SM};
  border: none;
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)')};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:disabled {
    opacity: 0.5;
    cursor: progress;
  }

  svg {
    width: 12px;
    height: 12px;
  }
`

/** '인물 넣기' — 옆의 '국가 넣기'(인라인 피커 자리표시)와 같은 목소리의 글자 버튼 */
const PersonPickButton = styled.button`
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 13px;
  font-style: italic;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
    border-radius: 2px;
  }
`

const FactionTinyBtn = styled(PersonPickButton)`
  font-size: 11.5px;
`
