import { useMemo, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FiChevronDown, FiExternalLink, FiPlus, FiRepeat, FiX } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import { formatObservationValue } from '@/entities/evidence/lib/format-observation'
import { toParticipants, participantKey } from '@/entities/event/model'
import {
  DIGIT_DISPLAY,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerSubtleFill,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import { getApiConnection } from '@/shared/api/client'
import {
  type EventSide,
  listEventSideUnits,
  listEventSideWeapons,
  type SideOutcome,
  type SideUnitView,
  syncEventSides,
  toSideInputs,
} from '@/shared/api/event-sides'
import {
  type UpdateEventDto,
  updateEventOrganization,
  updateEventPoliticalParty,
} from '@/shared/api/events'
import { militaryUnitApi } from '@/shared/api/military-unit'
import { getOrganizationMembers } from '@/shared/api/organizations'
import {
  getPersonGroup,
  listPersonGroups,
  type PersonGroup,
} from '@/shared/api/person-groups'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog/confirm'
import { PopoverMenu, type PopoverMenuEntry } from '@/shared/ui/popover-menu'
import { notify } from '@/shared/ui/toast'
import { PersonGroupCreateModal } from '@/widgets/person/person-group-create-modal/person-group-create-modal'

import * as S from '../styles'
import { type EventDetail, eventKeys, eventObservationsQueryOptions } from '../use-event-detail'
import { type PatchOptions } from '../use-undoable-patch'
import { koParticle } from './actors/actor-link-modal.styles'
import {
  countrySideByParticipationValueOf,
  effectivePersonSide,
  type EventPersonEntry,
  participationOptionsOf,
  personNameOf,
} from './actors/actors.lib'
import { HeaderControlBtn, SectionHintText } from './actors/actors.styles'
import { PersonLinkModal } from './actors/person-link-modal'
import { useActorMutations } from './actors/use-actor-mutations'
import { toAxisSpan } from './development-timeline.lib'
import { InlineSelect, InlineText } from './inline'
import { LoadError } from './load-error'
import { MODULE_COLOR } from './module-colors'
import { SIDE_PALETTE, withSideColors } from './side-colors'
import {
  type DoctrineFieldKey,
  SideDoctrineComparison,
  SideWeaponsSection,
  SubEventSidesRollupPanel,
} from './side-doctrine-and-weapons'
import { type AvailableMilitaryUnitItem, SideOrbatSection } from './side-orbat-tree'
import {
  buildMemberCells,
  buildSideMetricRows,
  buildUnitCells,
  formatRate,
  lossRate,
  sideSizeOf,
} from './side-metrics.lib'
import { SIDE_OUTCOME_LABEL, SIDE_OUTCOME_OPTIONS } from './side-outcome'

interface ModuleSidesProps {
  event: EventDetail
  onPatch: (patch: UpdateEventDto, opts?: PatchOptions) => void
  focusUnitId?: string | null
}

/**
 * 진영 카드에 덧붙는 칸 — **기록이 있거나 이 방문에서 펼친 것만** 세운다.
 * 예전엔 진영마다 계파 연결·전투서열·투입 병기·설명 네 칸이 빈 채로 늘 서 있어(실DB: 진영 132행 중 계파 0·병기 0·
 * 부대 2·설명 12), 카드 하나가 빈 틀 4개를 달고 다녔다. 빈 칸은 카드 끝 '더 적기' 한 줄에 모은다.
 */
type SideExtra = 'faction' | 'orbat' | 'weapons' | 'description'

const SIDE_EXTRA_LABEL: Record<SideExtra, string> = {
  faction: '영구 계파 연결',
  orbat: '투입 부대 (전투서열)',
  weapons: '투입 병기·장비',
  description: '진영 설명',
}

const SIDE_EXTRA_ORDER: readonly SideExtra[] = ['orbat', 'weapons', 'faction', 'description']

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
 *
 * 인물은 **실효 진영**으로 보인다(actors.lib `effectivePersonSide`). 따로 정한 진영이 있으면 그것이고,
 * 없으면 소속국의 진영이다. 참여 탭과 같은 규칙이다. 인물 쓰기는 참여 탭과 같은 `useActorMutations`로
 * 하고, 인물을 새로 들일 때도 참여 탭과 같은 잇기 모달(역할·소속국까지 받는다)을 연다.
 */
export function ModuleSides({ event, onPatch, focusUnitId }: ModuleSidesProps) {
  const queryClient = useQueryClient()
  const sides = useMemo(() => event.sides ?? [], [event.sides])
  /* 표시용 색 — 저장된 색이 없으면 순서대로 팔레트(저장값 불변) */
  const coloredSides = useMemo(() => withSideColors(sides), [sides])
  const [busy, setBusy] = useState(false)
  /** 이 방문에서 펼친 덧칸 — 'sideId:extra' */
  const [openedExtras, setOpenedExtras] = useState<ReadonlySet<string>>(() => new Set())
  const openExtra = (sideId: string, extra: SideExtra) =>
    setOpenedExtras((prev) => new Set(prev).add(`${sideId}:${extra}`))

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
  const actors = useActorMutations({ event, onPatch })
  const { countrySideByKey } = actors
  /** 진영 id → 그 진영에 선 인물(실효 진영). inherited = 소속국을 따라 선 인물 */
  const personsBySide = useMemo(() => {
    const map = new Map<string, Array<{ entry: EventPersonEntry; inherited: boolean }>>()
    for (const entry of persons) {
      const effective = effectivePersonSide(entry, countrySideByKey)
      if (!effective.sideId) continue
      map.set(effective.sideId, [
        ...(map.get(effective.sideId) ?? []),
        { entry, inherited: effective.source === 'country' },
      ])
    }
    return map
  }, [persons, countrySideByKey])
  const personsOnSide = (sideId: string) => personsBySide.get(sideId) ?? []
  const organizations = useMemo(() => event.organizations ?? [], [event.organizations])
  const politicalParties = useMemo(
    () => event.politicalParties ?? [],
    [event.politicalParties],
  )

  /**
   * 인물 잇기 — 예전엔 **이 사건의 참여 인물** 중에서만 고를 수 있어, 사건에 없는 지휘관은 넣을 길이 없었다
   * (진영 설명 10개가 전부 '지휘관(인물 연결 대기): …'를 글로 적고 있었고, 진영 소속 인물은 0명).
   * 그 뒤엔 별도 고르기 모달(역할·소속국 없이)로 넣다 보니 참여 탭의 '인물 잇기'와 같은 일을 다른 모달로
   * 했다. 이제 참여 탭과 **같은 잇기 모달**을 이 진영을 기본값으로 연다.
   */
  const [personPickerSide, setPersonPickerSide] = useState<EventSide | null>(null)
  const countryRows = actors.countryRows
  const linkParticipationOptions = useMemo(() => participationOptionsOf(countryRows), [countryRows])
  const linkCountrySideByValue = useMemo(() => countrySideByParticipationValueOf(countryRows), [countryRows])
  const linkSideOptions = useMemo(
    () =>
      coloredSides.length === 0
        ? []
        : [
            { value: 'none', label: '없음' },
            ...coloredSides.map((side) => ({ value: side.id, label: side.name, color: side.color })),
          ],
    [coloredSides],
  )
  const linkContext = useMemo(() => {
    const span = toAxisSpan(event)
    return {
      fromYear: span ? Math.floor(span.from) : null,
      toYear: span ? Math.floor(span.to) : null,
      countryIds: countryRows.map((row) => row.id),
      label: '이 사건 무렵 · 참여국 인물',
    }
  }, [event, countryRows])
  const [creatingGroupSide, setCreatingGroupSide] = useState<EventSide | null>(null)

  /* 계파 목록은 고르기 보조라 실패해도 '연결' 고르기만 빠진다 — 삼켜 둔다(등록 버튼은 남는다) */
  const groupsQuery = useQuery({
    queryKey: ['person-groups-all', 'module-sides'],
    queryFn: () => listPersonGroups().catch(() => [] as PersonGroup[]),
    staleTime: 30_000,
  })

  /*
   * 아래 셋은 실패를 빈 배열로 삼키지 않는다. 삼키면 '못 불러옴'이 '없음'으로 보인다 —
   * 2026-11-14 실측: 서버 500인데 부대 2개가 있는 독소전쟁이 '투입된 군사 부대가 없습니다'였다.
   */
  const sideUnitsQuery = useQuery<SideUnitView[]>({
    queryKey: eventKeys.sideUnits(event.id),
    queryFn: () => listEventSideUnits(event.id),
    staleTime: 30_000,
  })

  const sideWeaponsQuery = useQuery({
    queryKey: eventKeys.sideWeapons(event.id),
    queryFn: () => listEventSideWeapons(event.id),
    staleTime: 30_000,
  })

  const { data: observations = [] } = useQuery({
    ...eventObservationsQueryOptions(event.id),
    enabled: sides.length >= 2,
  })

  /* 부대 고르기 목록(전체 군사 부대, 250KB) — 전투서열 칸이 하나라도 서 있을 때만 받는다 */
  const anyOrbatShown =
    (sideUnitsQuery.data?.length ?? 0) > 0 ||
    [...openedExtras].some((key) => key.endsWith(':orbat'))
  const allMilitaryUnitsQuery = useQuery<AvailableMilitaryUnitItem[]>({
    queryKey: ['military-units', 'all-for-event-sides'],
    queryFn: () => militaryUnitApi.getAll() as Promise<AvailableMilitaryUnitItem[]>,
    enabled: anyOrbatShown,
    staleTime: 60_000,
  })

  const weaponCountBySideId = useMemo(() => {
    const counts = new Map<string, number>()
    for (const weapon of sideWeaponsQuery.data ?? []) {
      counts.set(weapon.sideId, (counts.get(weapon.sideId) ?? 0) + 1)
    }
    return counts
  }, [sideWeaponsQuery.data])

  const weaponTotalsBySideId = useMemo(() => {
    const totals = new Map<string, { quantity: number; lost: number; itemCount: number }>()
    for (const weapon of sideWeaponsQuery.data ?? []) {
      const prev = totals.get(weapon.sideId) ?? { quantity: 0, lost: 0, itemCount: 0 }
      totals.set(weapon.sideId, {
        quantity: prev.quantity + (weapon.quantity ?? 0),
        lost: prev.lost + (weapon.lost ?? 0),
        itemCount: prev.itemCount + 1,
      })
    }
    return totals
  }, [sideWeaponsQuery.data])

  const sideUnitsBySideId = useMemo(() => {
    const map = new Map<string, SideUnitView[]>()
    for (const unit of sideUnitsQuery.data ?? []) {
      const list = map.get(unit.sideId) ?? []
      list.push(unit)
      map.set(unit.sideId, list)
    }
    return map
  }, [sideUnitsQuery.data])

  const sideQuantSummary = useMemo(() => {
    if (coloredSides.length < 2) return null
    const sideIds = coloredSides.map((side) => side.id)
    const metricRows = buildSideMetricRows(observations, sideIds)
    const participantSide = new Map<string, { sideId: string; name: string }>()
    for (const row of countryRows) {
      if (row.participantId && row.sideId && sideIds.includes(row.sideId)) {
        participantSide.set(row.participantId, { sideId: row.sideId, name: row.name })
      }
    }
    const unitSide = new Map<string, { sideId: string; name: string }>()
    for (const unitEntry of sideUnitsQuery.data ?? []) {
      if (sideIds.includes(unitEntry.sideId)) {
        unitSide.set(unitEntry.id, { sideId: unitEntry.sideId, name: unitEntry.unit.name })
      }
    }
    const memberCells = buildMemberCells(observations, participantSide)
    const unitCells = buildUnitCells(observations, unitSide)

    const bySideId = new Map<
      string,
      {
        sizeValue: number | null
        sizeLabel: string | null
        rateValue: number | null
        rateLabel: string | null
      }
    >()
    for (const side of coloredSides) {
      const size = sideSizeOf(metricRows, memberCells, side.id, unitCells)
      const rate = lossRate(metricRows, side.id, memberCells, unitCells)
      const sizeLabel = size
        ? formatObservationValue(
            size.derived
              ? {
                  ...size.observation,
                  value: String(Math.round(size.value)),
                  low: null,
                  high: null,
                  atLeast: false,
                }
              : size.observation,
          )
        : null
      bySideId.set(side.id, {
        sizeValue: size?.value ?? null,
        sizeLabel,
        rateValue: rate?.rate ?? null,
        rateLabel: rate ? formatRate(rate.rate) : null,
      })
    }
    const allHaveSize = coloredSides.every((side) => (bySideId.get(side.id)?.sizeValue ?? 0) > 0)
    return { bySideId, allHaveSize }
  }, [coloredSides, observations, countryRows, sideUnitsQuery.data])

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
      const appliedCount = actors.assignPersonsToSide(
        members.map((member) => ({ personId: member.person.id, role: member.roleLabel ?? null })),
        sideId,
        `계파 소속 인물 → 진영`,
      )
      if (appliedCount > 0) {
        notify.success(`집단 소속 인물 ${appliedCount}명을 이 진영에 반영했습니다`)
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

  const assignPoliticalParty = async (relationId: string, sideId: string | null) => {
    setBusy(true)
    try {
      await updateEventPoliticalParty(event.id, relationId, { sideId })
      await refresh()
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : '정당 진영 배정에 실패했습니다',
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
      const appliedCount = actors.assignPersonsToSide(
        members.map((member) => ({
          personId: member.person.id,
          role: member.roleTitle ?? organizationName,
        })),
        sideId,
        `${organizationName} 소속 인물 → 진영`,
      )
      if (appliedCount > 0) {
        notify.success(
          `‘${organizationName}’ 소속 인물 ${appliedCount}명을 이 진영에 반영했습니다`,
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
    const memberCount = side.participants.length + personsOnSide(side.id).filter((member) => !member.inherited).length
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

  /**
   * 참여 인물을 진영에 넣거나(sideId) 진영 지정을 푼다(null) — 고친 줄만 보낸다(참여 탭과 같은 쓰기).
   * 지정을 풀면 진영 밖이 아니라 **소속국 진영을 따른다**. 그래서 소속국이 진영에 있으면 그쪽으로
   * 옮겨 보이고, 그렇다고 알린다. 소속국을 따라 선 인물은 따로 지정한 진영이 없으니 풀 것도 없다.
   */
  const assignPerson = (personId: string, sideId: string | null) => {
    const entry = persons.find((person) => person.personId === personId)
    if (!entry) return
    const personName = personNameOf(entry)
    const effective = effectivePersonSide(entry, countrySideByKey)
    if (!sideId && effective.source === 'country') {
      notify.info(
        `‘${personName}’${koParticle(personName, '은/는')} 소속국을 따라 이 진영에 있습니다 — 참여 탭에서 소속국을 바꾸거나 다른 진영으로 옮기세요`,
      )
      return
    }
    if (effective.sideId === sideId) return
    actors.updatePerson(personId, { sideId })
    const fallbackSide = !sideId && effective.countrySideId ? sides.find((side) => side.id === effective.countrySideId) : null
    if (fallbackSide) {
      notify.info(`‘${personName}’${koParticle(personName, '은/는')} 이제 소속국을 따라 ‘${fallbackSide.name}’에 섭니다`)
    }
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
    kind: 'country' | 'person' | 'organization' | 'politicalParty'
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
    if (
      kind === 'country' ||
      kind === 'person' ||
      kind === 'organization' ||
      kind === 'politicalParty'
    ) {
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
    } else if (payload.kind === 'politicalParty') {
      void assignPoliticalParty(payload.key, targetSideId)
    } else {
      void assignOrganization(payload.key, targetSideId)
    }
  }

  const unassignedCountries = participants.filter(
    (participant) => !participantInfo.get(participantKey(participant))?.sideId,
  )
  const unassignedPersons = persons.filter(
    (person) => !effectivePersonSide(person, countrySideByKey).sideId,
  )
  const unassignedOrgs = organizations.filter(
    (org) =>
      !sides.some((side) =>
        side.organizations.some((member) => member.relationId === org.relationId),
      ),
  )
  const unassignedParties = politicalParties.filter(
    (party) =>
      !sides.some((side) =>
        (side.politicalParties ?? []).some(
          (member) => member.relationId === party.relationId,
        ),
      ),
  )
  const hasUnassignedAny =
    unassignedCountries.length +
      unassignedPersons.length +
      unassignedOrgs.length +
      unassignedParties.length >
    0
  const totalAssignedAcrossSides = sides.reduce(
    (sum, side) =>
      sum +
      side.participants.length +
      personsOnSide(side.id).length +
      side.organizations.length +
      (side.politicalParties?.length ?? 0),
    0,
  )

  return (
    <S.Section id="module-sides" aria-busy={busy}>
      <SidesHeaderBlock>
        <S.SectionHeader>
          <S.SectionTitle>
            <S.SectionTitleDot $color={MODULE_COLOR.sides} />
            진영
          </S.SectionTitle>
          {sides.length > 0 && <S.SectionSubtitle>{sides.length}</S.SectionSubtitle>}
          <S.SectionActions>
            <HeaderControlBtn type="button" onClick={addSide} disabled={busy}>
              <FiPlus /> 진영 추가
            </HeaderControlBtn>
          </S.SectionActions>
        </S.SectionHeader>
        <SectionHintText>
          참여 국가·인물·단체를 대립 진영으로 나누고, 진영별 결과·투입 부대·병기를 기록합니다.
        </SectionHintText>
      </SidesHeaderBlock>

      {/* 소속이나 병력 수치가 하나라도 있으면 대결 구도 배너를 세운다 */}
      {sides.length >= 2 && (totalAssignedAcrossSides > 0 || Boolean(sideQuantSummary?.allHaveSize)) && (
        <VsBanner role="region" aria-label="진영 대결 구도 요약">
          <VsTopRow>
            <VsTeamsWrap>
              {coloredSides.map((side, index) => {
                const sideUnitCount = (sideUnitsBySideId.get(side.id) ?? []).length
                const sidePartyCount = side.politicalParties?.length ?? 0
                const quant = sideQuantSummary?.bySideId.get(side.id)
                const weaponStat = weaponTotalsBySideId.get(side.id)
                const countParts = [
                  side.participants.length > 0 ? `국가 ${side.participants.length}` : '',
                  personsOnSide(side.id).length > 0 ? `인물 ${personsOnSide(side.id).length}` : '',
                  sidePartyCount > 0 ? `정당 ${sidePartyCount}` : '',
                  side.organizations.length > 0 ? `조직 ${side.organizations.length}` : '',
                  sideUnitCount > 0 ? `부대 ${sideUnitCount}` : '',
                  weaponStat && weaponStat.quantity > 0
                    ? `병기 ${weaponStat.quantity.toLocaleString()}${weaponStat.lost > 0 ? `(손실 ${weaponStat.lost.toLocaleString()})` : ''}`
                    : '',
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
                    {quant?.sizeLabel && <VsForceFigure>{quant.sizeLabel}</VsForceFigure>}
                    {quant?.rateLabel && <VsLossPill>손실 {quant.rateLabel}</VsLossPill>}
                    <VsTeamMeta>
                      ({countParts.length > 0 ? countParts.join(' · ') : '소속 0'})
                    </VsTeamMeta>
                  </VsTeamGroup>
                )
              })}
            </VsTeamsWrap>
            <VsActionsWrap>
              <VsDragHint>
                {sideQuantSummary?.allHaveSize ? '막대: 병력 비례 · ' : ''}항목을 끌어 진영 이동
              </VsDragHint>
              <VsSwapButton
                type="button"
                disabled={busy}
                aria-label="1번·2번 진영 순서 맞바꾸기"
                onClick={swapFirstTwoSides}
              >
                <FiRepeat size={11} aria-hidden /> 순서 바꾸기
              </VsSwapButton>
            </VsActionsWrap>
          </VsTopRow>
          <VsGaugeTrack aria-hidden>
            {coloredSides.map((side, sideIdx) => {
              const quant = sideQuantSummary?.bySideId.get(side.id)
              const memberCount =
                side.participants.length +
                personsOnSide(side.id).length +
                (side.politicalParties?.length ?? 0) +
                side.organizations.length
              const weight = sideQuantSummary?.allHaveSize
                ? Math.max(1, quant?.sizeValue ?? 1)
                : totalAssignedAcrossSides > 0
                  ? Math.max(memberCount, 0.25)
                  : 1
              return (
                <VsGaugeSegment
                  key={side.id}
                  $color={side.color}
                  $empty={!sideQuantSummary?.allHaveSize && memberCount === 0}
                  style={{ flexGrow: weight }}
                >
                  {sideQuantSummary?.allHaveSize && quant?.rateValue != null && quant.rateValue > 0 && (
                    <VsGaugeLossHatch
                      $fromCenter={coloredSides.length === 2 && sideIdx === 0}
                      style={{ width: `${Math.min(100, Math.round(quant.rateValue * 100))}%` }}
                    />
                  )}
                </VsGaugeSegment>
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
          const partyOptions = politicalParties
            .filter(
              (party) =>
                !(side.politicalParties ?? []).some(
                  (member) => member.relationId === party.relationId,
                ),
            )
            .map((party) => {
              const elsewhere = sides.find((other) =>
                (other.politicalParties ?? []).some(
                  (member) => member.relationId === party.relationId,
                ),
              )?.name
              return {
                value: party.relationId,
                label: elsewhere
                  ? `${party.name} (${elsewhere}에서 옮김)`
                  : party.name,
              }
            })
          const sideUnitRows = sideUnitsBySideId.get(side.id) ?? []
          const isOpened = (extra: SideExtra) => openedExtras.has(`${side.id}:${extra}`)
          const shownExtra: Record<SideExtra, boolean> = {
            faction: Boolean(side.personGroupId) || isOpened('faction'),
            /* 조회 실패는 접지 않는다 — 접으면 실패가 또 '없음'으로 보인다 */
            orbat:
              sideUnitRows.length > 0 ||
              isOpened('orbat') ||
              sideUnitsQuery.isError ||
              Boolean(focusUnitId),
            weapons:
              (weaponCountBySideId.get(side.id) ?? 0) > 0 || isOpened('weapons') || sideWeaponsQuery.isError,
            description: Boolean(side.description?.trim()) || isOpened('description'),
          }
          /* 아직 받는 중인 칸은 '더 적기'에도 올리지 않는다 — 있는 부대가 뜨기 직전에 '+ 투입 부대'가 번쩍였다 */
          const hiddenExtras = SIDE_EXTRA_ORDER.filter(
            (extra) =>
              !shownExtra[extra] &&
              !(extra === 'orbat' && sideUnitsQuery.isLoading) &&
              !(extra === 'weapons' && sideWeaponsQuery.isLoading),
          )
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
          const otherSideShortName =
            otherSide && otherSide.name.length > 8
              ? `${otherSide.name.slice(0, 8)}…`
              : (otherSide?.name ?? '')
          const sideMenuEntries: PopoverMenuEntry[] = [
            ...hiddenExtras.map((extra) => ({
              id: `extra-${extra}`,
              label: `${SIDE_EXTRA_LABEL[extra]} 기록 열기`,
              onSelect: () => openExtra(side.id, extra),
            })),
            ...(hiddenExtras.length > 0
              ? [{ type: 'divider' as const, id: 'sep-remove' }]
              : []),
            {
              id: 'remove-side',
              label: '이 진영 삭제',
              danger: true,
              onSelect: () => void removeSide(side),
            },
          ]
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
                  <SideSwatchDot $color={sideColor} aria-hidden />
                  <InlineText value={side.name} onSave={(next) => renameSide(side, next)} as="span" />
                </SideName>
                <SideHeadRight>
                  <SideOutcomeField aria-label={`${side.name}의 결과`}>
                    <OutcomeLabel>결과</OutcomeLabel>
                    <InlineSelect
                      value={side.outcome ?? ''}
                      options={SIDE_OUTCOME_OPTIONS}
                      onSave={(next) => setOutcome(side, { outcome: (next || null) as SideOutcome | null })}
                      placeholder="미정"
                      label={`${side.name} 결과`}
                    />
                  </SideOutcomeField>
                  <PopoverMenu
                    align="right"
                    ariaLabel={`${side.name} 세부 기록 및 관리`}
                    items={sideMenuEntries}
                    renderTrigger={({ ref, isOpen, toggle }) => (
                      <SideMoreBtn
                        ref={ref}
                        type="button"
                        $open={isOpen}
                        aria-haspopup="menu"
                        aria-expanded={isOpen}
                        onClick={toggle}
                      >
                        세부·관리 <FiChevronDown size={12} aria-hidden />
                      </SideMoreBtn>
                    )}
                  />
                </SideHeadRight>
              </SideHead>

              {side.outcome && (
                <OutcomeNoteRow>
                  <OutcomeNote>
                    <InlineText
                      value={side.outcomeNote ?? ''}
                      onSave={(next) => setOutcome(side, { outcomeNote: next.trim() || null })}
                      placeholder="결과 단서 추가 — 예: 전략적 승리, 전술적 패배"
                      as="span"
                    />
                  </OutcomeNote>
                </OutcomeNoteRow>
              )}

              {shownExtra.faction && (
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
              )}

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
                          → {otherSideShortName}
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
                {personsOnSide(side.id).map(({ entry: member, inherited }) => {
                  const memberName = personNameOf(member)
                  const dragPayload: DraggedDetailMember = {
                    kind: 'person',
                    key: member.personId,
                    fromSideId: side.id,
                  }
                  return (
                    <Member
                      key={member.personId}
                      $person
                      draggable
                      title={
                        inherited
                          ? `소속국(${member.participationCountryName ?? '참여 국가'})을 따라 이 진영 — 다른 진영으로 끌면 따로 정해집니다`
                          : '드래그하여 다른 진영이나 미지정으로 이동'
                      }
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
                      <MemberName>{memberName}</MemberName>
                      {inherited && <MemberTag>소속국 따름</MemberTag>}
                      {otherSide && (
                        <MemberSwitchBtn
                          type="button"
                          onClick={() => assignPerson(member.personId, otherSide.id)}
                          aria-label={`${memberName} ${otherSide.name}(으)로 이동`}
                          title={`${otherSide.name}(으)로 이동`}
                        >
                          → {otherSideShortName}
                        </MemberSwitchBtn>
                      )}
                      {!inherited && (
                        <MemberRemove
                          type="button"
                          onClick={() => assignPerson(member.personId, null)}
                          aria-label={`${memberName}의 진영 지정 풀기`}
                          title="진영 지정 풀기 — 참여 인물에는 그대로 남습니다"
                        >
                          <FiX />
                        </MemberRemove>
                      )}
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
                          {org.name}
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
                          → {otherSideShortName}
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
                {(side.politicalParties ?? []).map((party) => {
                  const dragPayload: DraggedDetailMember = {
                    kind: 'politicalParty',
                    key: party.relationId,
                    fromSideId: side.id,
                  }
                  return (
                    <Member
                      key={`party-${party.relationId}`}
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
                          to={pathKeys.politicalParties.detail(party.partyId)}
                          title="정당 상세 및 계보·당원 보기"
                          style={{
                            color: 'inherit',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                          }}
                        >
                          {party.brandColor && (
                            <span
                              style={{
                                width: 7,
                                height: 7,
                                borderRadius: '50%',
                                background: party.brandColor,
                                display: 'inline-block',
                              }}
                            />
                          )}
                          {party.name}
                        </Link>
                      </MemberName>
                      {otherSide && (
                        <MemberSwitchBtn
                          type="button"
                          onClick={() => void assignPoliticalParty(party.relationId, otherSide.id)}
                          aria-label={`${party.name} ${otherSide.name}(으)로 이동`}
                          title={`${otherSide.name}(으)로 이동`}
                        >
                          → {otherSideShortName}
                        </MemberSwitchBtn>
                      )}
                      <MemberRemove
                        type="button"
                        onClick={() => void assignPoliticalParty(party.relationId, null)}
                        aria-label={`${party.name}을(를) 진영에서 빼기`}
                      >
                        <FiX />
                      </MemberRemove>
                    </Member>
                  )
                })}
                {side.participants.length +
                  personsOnSide(side.id).length +
                  (side.politicalParties?.length ?? 0) +
                  side.organizations.length ===
                  0 && (
                  <EmptyLine>아직 소속이 없습니다 — 아래에서 국가·인물을 배정하거나 항목을 끌어 놓으세요.</EmptyLine>
                )}
              </MemberList>

              <Pickers>
                {countryOptions.length > 0 && (
                  <InlineSelect
                    value=""
                    options={countryOptions}
                    onSave={(key) => assignCountry(key, side.id)}
                    placeholder="+ 국가 배정"
                    label={`${side.name}에 넣을 참여국`}
                  />
                )}
                <PersonPickButton
                  type="button"
                  onClick={() => setPersonPickerSide(side)}
                  title="참여 탭의 '인물 잇기'와 같은 창 — 역할·소속국도 함께 적습니다"
                >
                  + 인물 잇기
                </PersonPickButton>
                {partyOptions.length > 0 && (
                  <InlineSelect
                    value=""
                    options={partyOptions}
                    onSave={(relationId) => void assignPoliticalParty(relationId, side.id)}
                    placeholder="+ 정당 배정"
                    label={`${side.name}에 넣을 정당`}
                  />
                )}
                {orgOptions.length > 0 && (
                  <InlineSelect
                    value=""
                    options={orgOptions}
                    onSave={(relationId) => void assignOrganization(relationId, side.id)}
                    placeholder="+ 조직 배정"
                    label={`${side.name}에 넣을 조직`}
                  />
                )}
              </Pickers>

              {shownExtra.orbat && (
              <SideOrbatSection
                eventId={event.id}
                sideId={side.id}
                sideName={side.name}
                sideColor={sideColor}
                sideUnits={sideUnitRows}
                unitsError={sideUnitsQuery.isError}
                onRetryUnits={() => void sideUnitsQuery.refetch()}
                pickerError={allMilitaryUnitsQuery.isError}
                onRetryPicker={() => void allMilitaryUnitsQuery.refetch()}
                pickerLoading={allMilitaryUnitsQuery.isLoading}
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
                focusUnitId={focusUnitId}
                onRefresh={refresh}
              />
              )}

              {shownExtra.weapons && (
              <SideWeaponsSection
                eventId={event.id}
                sideId={side.id}
                sideName={side.name}
                sideColor={sideColor}
                sideUnits={sideUnitRows}
                initialAdding={(weaponCountBySideId.get(side.id) ?? 0) === 0 && !sideWeaponsQuery.isError}
              />
              )}

              {shownExtra.description && (
              <SideDescription>
                <InlineText
                  value={side.description ?? ''}
                  onSave={(next) => describeSide(side, next)}
                  placeholder="진영 설명"
                  label={`${side.name} 설명`}
                  multiline
                  multilineEnter
                />
              </SideDescription>
              )}
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
            const personName = [person.person?.name, person.person?.surname].filter(Boolean).join(' ')
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
                  placeholder={personName}
                  label={`${personName}의 진영`}
                  clearable={false}
                />
              </UnassignedChip>
            )
          })}
          {unassignedParties.map((party) => {
            const dragPayload: DraggedDetailMember = {
              kind: 'politicalParty',
              key: party.relationId,
              fromSideId: null,
            }
            return (
              <UnassignedChip
                key={`party-${party.relationId}`}
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
                  onSave={(sideId) => void assignPoliticalParty(party.relationId, sideId)}
                  placeholder={party.name}
                  label={`${party.name}의 진영`}
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
                  placeholder={org.name}
                  label={`${org.name}의 진영`}
                  clearable={false}
                />
              </UnassignedChip>
            )
          })}
        </Unassigned>
      )}

      {/* 참여 탭과 같은 잇기 모달 — 이 진영이 기본값. 이미 참여한 인물을 고르면 그 줄을 고친다 */}
      <PersonLinkModal
        isOpen={Boolean(personPickerSide)}
        onClose={() => setPersonPickerSide(null)}
        eventTitle={event.title}
        existingPersons={persons}
        context={linkContext}
        participationOptions={linkParticipationOptions}
        countrySideByValue={linkCountrySideByValue}
        sideOptions={linkSideOptions}
        defaultCountryId={countryRows.find((row) => !row.isHistorical)?.id}
        defaultHistoricalCountryId={countryRows.find((row) => row.isHistorical)?.id}
        defaultSideId={personPickerSide?.id ?? null}
        onSave={actors.upsertPerson}
        onRemove={actors.removePerson}
      />

      {creatingGroupSide && (
        <PersonGroupCreateModal
          defaultType="FACTION"
          defaultName={creatingGroupSide.name}
          defaultCountryId={event.relatedCountries?.[0]?.id}
          defaultHistoricalCountryId={event.relatedHistoricalCountries?.[0]?.id}
          defaultMembers={personsOnSide(creatingGroupSide.id).map(({ entry }) => ({
            id: entry.personId,
            name: personNameOf(entry),
          }))}
          /* 사건의 참여 인물(relatedPersons) — 예전엔 없는 필드(event.persons)를 읽어 추천이 늘 비었다 */
          candidatePersons={persons.map((related) => ({
            id: related.personId,
            name: [related.person?.name, related.person?.surname].filter(Boolean).join(' '),
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
  padding: 10px 0;
  border-top: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
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

const VsForceFigure = styled.strong`
  font-size: 12.5px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
  ${DIGIT_DISPLAY}
`

const VsLossPill = styled.span`
  padding: 0 5px;
  border-radius: ${RADIUS.XS};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  font-size: 10.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  ${DIGIT_DISPLAY}
`

const VsTeamMeta = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
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
  position: relative;
  height: 100%;
  border-radius: 999px;
  background: ${({ $color }) => $color};
  opacity: ${({ $empty }) => ($empty ? 0.25 : 0.88)};
  overflow: hidden;
  transition: flex-grow 0.22s ease, opacity 0.18s ease;
`

const VsGaugeLossHatch = styled.span<{ $fromCenter?: boolean }>`
  position: absolute;
  top: 0;
  bottom: 0;
  ${({ $fromCenter }) => ($fromCenter ? 'right: 0;' : 'left: 0;')}
  background-image: repeating-linear-gradient(
    135deg,
    rgba(0, 0, 0, 0.42) 0 2px,
    rgba(0, 0, 0, 0.16) 2px 5px
  );
  pointer-events: none;
`

const SidesHeaderBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const SideGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  gap: 20px 28px;
`

/**
 * 진영 칼럼 — 카드 안의 카드(음영 박스)를 쓰지 않고, 상단 진영 색 선 + 평면 원장 열로 세운다(참여 탭 SideGroup과 동일 문법).
 */
const SideCard = styled.section<{ $dragOver?: boolean; $color?: string }>`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0 0 12px;
  border-top: 2.5px solid ${({ $color }) => $color ?? 'currentColor'};
  background: ${({ theme, $dragOver, $color }) =>
    $dragOver && $color
      ? `color-mix(in srgb, ${$color} ${theme.mode === 'dark' ? 14 : 8}%, transparent)`
      : 'transparent'};
  outline: ${({ $dragOver, $color }) =>
    $dragOver && $color ? `2px dashed ${$color}` : 'none'};
  outline-offset: 2px;
  min-width: 0;
  transition: background 0.14s ease, outline-color 0.14s ease;
`

const SideHead = styled.div<{ $color: string }>`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px 10px;
  padding: 8px 2px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const SideSwatchDot = styled.span<{ $color: string }>`
  flex-shrink: 0;
  width: 9px;
  height: 9px;
  border-radius: 3px;
  background: ${({ $color }) => $color};
`

const SideName = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 14.5px;
  font-weight: 750;
  color: ${({ theme }) => theme.colors.text.primary};
  min-width: 0;
`

const SideHeadRight = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`

const SideOutcomeField = styled.div`
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  font-size: 12.5px;
  font-weight: 650;
  color: ${({ theme }) => theme.colors.text.primary};

  [data-empty='true'] {
    font-style: normal;
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const SideMoreBtn = styled.button<{ $open?: boolean }>`
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 26px;
  padding: 0 8px;
  border-radius: ${RADIUS.SM};
  border: 1px solid
    ${({ theme, $open }) =>
      $open ? theme.colors.text.secondary : ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme, $open }) =>
    $open ? theme.colors.text.primary : theme.colors.text.secondary};
  font: inherit;
  font-size: 11.5px;
  font-weight: 650;
  white-space: nowrap;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const OutcomeNoteRow = styled.div`
  display: flex;
  align-items: baseline;
  padding: 0 2px;
  margin-top: -4px;
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
  align-items: center;
  gap: 6px 12px;
  padding-top: 6px;
  border-top: 1px dashed ${({ theme }) => ledgerHairline(theme.mode)};
  font-size: 12.5px;

  [data-empty='true'] {
    font-style: normal;
    font-size: 12px;
    font-weight: 650;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
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

const PersonPickButton = styled.button`
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 650;
  color: ${({ theme }) => theme.colors.text.secondary};
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
