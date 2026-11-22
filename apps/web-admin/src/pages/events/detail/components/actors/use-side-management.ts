import { useMemo, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'

import {
  type EventSide,
  type SideOutcome,
  syncEventSides,
  toSideInputs,
} from '@/shared/api/event-sides'
import {
  getPersonGroup,
  listPersonGroups,
  type PersonGroup,
} from '@/shared/api/person-groups'
import { confirm } from '@/shared/ui/confirm-dialog/confirm'
import { notify } from '@/shared/ui/toast'

import { type EventDetail, eventKeys } from '../../use-event-detail'
import { SIDE_PALETTE } from '../side-colors'
import { effectivePersonSide } from './actors.lib'
import { type useActorMutations } from './use-actor-mutations'

interface UseSideManagementParams {
  event: EventDetail
  actors: ReturnType<typeof useActorMutations>
  enabled?: boolean
}

export function useSideManagement({
  event,
  actors,
  enabled = true,
}: UseSideManagementParams) {
  const queryClient = useQueryClient()
  const sides = useMemo(() => event.sides ?? [], [event.sides])
  const [busy, setBusy] = useState(false)
  const [creatingGroupSide, setCreatingGroupSide] = useState<EventSide | null>(null)
  const [openedExtras, setOpenedExtras] = useState<ReadonlySet<string>>(() => new Set())

  const openExtra = (sideId: string, extraKey: 'outcomeNote' | 'description' | 'faction') => {
    setOpenedExtras((previous) => new Set(previous).add(`${sideId}:${extraKey}`))
  }

  const isExtraOpened = (sideId: string, extraKey: 'outcomeNote' | 'description' | 'faction') =>
    openedExtras.has(`${sideId}:${extraKey}`)

  const anyFactionOpened =
    sides.some((side) => Boolean(side.personGroupId)) ||
    [...openedExtras].some((key) => key.endsWith(':faction'))

  const groupsQuery = useQuery({
    queryKey: ['person-groups-all', 'actors-sides'],
    queryFn: () => listPersonGroups().catch(() => [] as PersonGroup[]),
    enabled: enabled && anyFactionOpened,
    staleTime: 30_000,
  })

  const sortedGroups = useMemo(() => {
    const allGroups = groupsQuery.data ?? []
    const countryIds = new Set(
      (event.relatedCountries ?? []).map((country) => country.id).filter(Boolean),
    )
    const histCountryIds = new Set(
      (event.relatedHistoricalCountries ?? []).map((country) => country.id).filter(Boolean),
    )
    return [...allGroups].sort((left, right) => {
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

  const groupOptions = useMemo(
    () =>
      sortedGroups.map((group) => ({
        value: group.id,
        label: `${group.name}${
          group.historicalCountryName
            ? ` (${group.historicalCountryName})`
            : group.countryName
              ? ` (${group.countryName})`
              : ''
        }`,
      })),
    [sortedGroups],
  )

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(event.id) }),
      queryClient.invalidateQueries({ queryKey: eventKeys.observations(event.id) }),
      queryClient.invalidateQueries({ queryKey: eventKeys.sideUnits(event.id) }),
    ])
  }

  const saveSides = async (
    nextInputs: ReturnType<typeof toSideInputs>,
    successMessage?: string,
  ) => {
    setBusy(true)
    try {
      await syncEventSides(event.id, nextInputs)
      await refresh()
      if (successMessage) notify.success(successMessage)
    } catch (error) {
      notify.error(error instanceof Error ? error.message : '진영을 저장하지 못했습니다')
    } finally {
      setBusy(false)
    }
  }

  const addSide = () => {
    const nextName = `진영 ${sides.length + 1}`
    void saveSides(
      [
        ...toSideInputs(sides),
        {
          name: nextName,
          level: 'COALITION',
          color: SIDE_PALETTE[sides.length % SIDE_PALETTE.length],
        },
      ],
      `'${nextName}'을(를) 추가했습니다`,
    )
  }

  const renameSide = (side: EventSide, nextName: string) => {
    const trimmed = nextName.trim()
    if (!trimmed || trimmed === side.name) return
    void saveSides(
      toSideInputs(sides).map((input) =>
        input.id === side.id ? { ...input, name: trimmed } : input,
      ),
    )
  }

  const describeSide = (side: EventSide, description: string) => {
    void saveSides(
      toSideInputs(sides).map((input) =>
        input.id === side.id ? { ...input, description: description.trim() || null } : input,
      ),
    )
  }

  const setOutcome = (
    side: EventSide,
    patch: { outcome?: SideOutcome | null; outcomeNote?: string | null },
  ) => {
    void saveSides(
      toSideInputs(sides).map((input) =>
        input.id === side.id
          ? { ...input, ...patch, ...(patch.outcome === null ? { outcomeNote: null } : {}) }
          : input,
      ),
    )
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

  const removeSide = async (side: EventSide) => {
    const directPersonsCount = actors.persons.filter((personEntry) => {
      const effective = effectivePersonSide(personEntry, actors.countrySideByKey)
      return effective.sideId === side.id && effective.source !== 'country'
    }).length
    const memberCount = side.participants.length + directPersonsCount
    const confirmed = await confirm({
      title: `'${side.name}' 진영을 지울까요?`,
      message:
        `소속 ${memberCount}곳은 진영 배정만 해제되고 사건 참여 기록은 그대로 남습니다. ` +
        '이 진영에 직접 기록된 수치가 있다면 함께 삭제됩니다.',
      confirmLabel: '진영 삭제',
      danger: true,
    })
    if (!confirmed) return
    void saveSides(
      toSideInputs(sides).filter((input) => input.id !== side.id),
      `'${side.name}' 진영을 삭제했습니다`,
    )
  }

  const importGroupMembersToSide = async (sideId: string, groupId: string) => {
    try {
      const detailed = await getPersonGroup(groupId)
      const members = detailed.members ?? []
      if (members.length === 0) {
        notify.info('연결된 집단에 등록된 소속 인물이 없습니다')
        return
      }
      const appliedCount = actors.assignPersonsToSide(
        members.map((member) => ({
          personId: member.person.id,
          role: member.roleLabel ?? null,
        })),
        sideId,
        '계파 소속 인물 → 진영',
      )
      if (appliedCount > 0) {
        notify.success(`집단 소속 인물 ${appliedCount}명을 이 진영에 반영했습니다`)
      } else {
        notify.info('이미 모든 소속 인물이 이 진영에 포함되어 있습니다')
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

  return {
    busy,
    creatingGroupSide,
    setCreatingGroupSide,
    groupOptions,
    openExtra,
    isExtraOpened,
    addSide,
    renameSide,
    describeSide,
    setOutcome,
    swapFirstTwoSides,
    removeSide,
    linkPersonGroup,
    importGroupMembersToSide,
  }
}
