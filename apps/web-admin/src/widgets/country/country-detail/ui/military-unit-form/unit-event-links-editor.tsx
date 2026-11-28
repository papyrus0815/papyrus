import React, { useEffect, useMemo, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { FiCompass, FiFolder, FiPlus, FiShield, FiUser, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import { MILITARY_DIRECTIVE_ROLE_OPTIONS } from '@/entities/military-unit'
import * as S from '@/pages/events/create/event-create.styles'
import { SIDE_UNIT_ROLE_LABEL } from '@/pages/events/detail/components/side-orbat.lib'
import {
  administrationDepartmentApi,
  type AdministrationDepartmentEventRole,
} from '@/shared/api/administration-department'
import {
  addEventSideUnit,
  type EventSide,
  listEventSides,
  removeEventSideUnit,
  type SideUnitRole,
  syncEventSides,
  updateEventSideUnit,
} from '@/shared/api/event-sides'
import {
  createEvent,
  getEventLinkCandidates,
  type EventLinkCandidate,
} from '@/shared/api/events'
import type {
  MilitaryUnitEventLinkDto,
  MilitaryUnitType,
} from '@/shared/api/military-unit'
import { useEventSearch } from '@/shared/hooks/use-event-search'
import { eventDateLabel } from '@/shared/lib/event-date-label'
import { getApiErrorMessage } from '@/shared/lib/get-api-error-message'
import { EventPickerModal } from '@/shared/ui/event-picker-modal/event-picker-modal'
import { notify } from '@/shared/ui/toast'

import { isHighCommandUnitType } from './constants'
import { StructuredPartsDateField } from './structured-parts-date-field'
import * as FormS from './styles'

export type UnitEventLinkTrack = 'DEPLOYMENT' | 'DIRECTIVE'

export interface CommanderCandidateOption {
  personId: string
  personName: string
  label?: string
}

export interface UnitEventLinkDraft {
  localId: string
  eventId: string
  eventTitle: string
  eventDateText?: string
  parentEventId?: string | null
  parentEventTitle?: string | null
  track: UnitEventLinkTrack
  /** 참전(DEPLOYMENT) 트랙 필드 */
  existingDeploymentId?: string
  sideId: string
  autoCreateSideName: string
  deploymentRole: SideUnitRole | ''
  deploymentNote: string
  commanderId: string
  commanderNameHint?: string
  /** 지령·관여(DIRECTIVE) 트랙 필드 */
  existingRelationId?: string
  directiveRole: AdministrationDepartmentEventRole
  directiveRoleDesc: string
}

let nextEventDraftSeq = 1

export function createEventLinkDraft(params: {
  eventId: string
  eventTitle: string
  eventDateText?: string
  parentEventId?: string | null
  parentEventTitle?: string | null
  unitType?: MilitaryUnitType | '' | null
  defaultCountryName?: string
  forceTrack?: UnitEventLinkTrack
}): UnitEventLinkDraft {
  const defaultTrack: UnitEventLinkTrack =
    params.forceTrack ??
    (isHighCommandUnitType(params.unitType) ? 'DIRECTIVE' : 'DEPLOYMENT')
  return {
    localId: `unit-event-${Date.now()}-${nextEventDraftSeq++}`,
    eventId: params.eventId,
    eventTitle: params.eventTitle,
    eventDateText: params.eventDateText,
    parentEventId: params.parentEventId ?? null,
    parentEventTitle: params.parentEventTitle ?? null,
    track: defaultTrack,
    sideId: '',
    autoCreateSideName: params.defaultCountryName
      ? `${params.defaultCountryName} 측`
      : '참전 진영',
    deploymentRole: 'MAIN_EFFORT',
    deploymentNote: '',
    commanderId: '',
    directiveRole: isHighCommandUnitType(params.unitType)
      ? 'ISSUER'
      : 'PARTICIPANT',
    directiveRoleDesc: '',
  }
}

export interface HydratableSideDeployedUnit {
  id: string
  role?: string | null
  note?: string | null
  commanderId?: string | null
  commander?: {
    id: string
    name?: string | null
    surname?: string | null
    givenName?: string | null
  } | null
  side?: {
    id: string
    name?: string | null
    event?: {
      id: string
      title?: string | null
      parentEventId?: string | null
      parentEvent?: {
        id: string
        title?: string | null
      } | null
    } | null
  } | null
}

export function hydrateUnitEventDrafts(params: {
  sideDeployedUnits?: ReadonlyArray<HydratableSideDeployedUnit> | null
  eventRelations?: ReadonlyArray<MilitaryUnitEventLinkDto> | null
}): UnitEventLinkDraft[] {
  const list: UnitEventLinkDraft[] = []

  for (const dep of params.sideDeployedUnits ?? []) {
    const sideObj = dep?.side
    const ev = sideObj?.event
    if (!sideObj || !ev?.id) continue
    const commanderDisplay =
      dep.commander?.name ||
      [dep.commander?.surname, dep.commander?.givenName]
        .filter(Boolean)
        .join(' ') ||
      undefined
    list.push({
      localId: `hydrated-dep-${dep.id}`,
      eventId: String(ev.id),
      eventTitle: String(ev.title ?? '연결된 사건'),
      parentEventId: ev.parentEvent?.id ?? ev.parentEventId ?? null,
      parentEventTitle: ev.parentEvent?.title ?? null,
      track: 'DEPLOYMENT',
      existingDeploymentId: String(dep.id),
      sideId: String(sideObj.id),
      autoCreateSideName: String(sideObj.name ?? '참전 진영'),
      deploymentRole: (dep.role as SideUnitRole) ?? '',
      deploymentNote: dep.note ?? '',
      commanderId: dep.commanderId ?? dep.commander?.id ?? '',
      commanderNameHint: commanderDisplay,
      directiveRole: 'PARTICIPANT',
      directiveRoleDesc: '',
    })
  }

  for (const rel of params.eventRelations ?? []) {
    if (!rel?.event?.id) continue
    list.push({
      localId: `hydrated-rel-${rel.relationId}`,
      eventId: String(rel.event.id),
      eventTitle: String(rel.event.title ?? '연결된 사건'),
      parentEventId: rel.event.parentEvent?.id ?? rel.event.parentEventId ?? null,
      parentEventTitle: rel.event.parentEvent?.title ?? null,
      track: 'DIRECTIVE',
      sideId: '',
      autoCreateSideName: '참전 진영',
      deploymentRole: '',
      deploymentNote: '',
      commanderId: '',
      existingRelationId: String(rel.relationId),
      directiveRole:
        (rel.role as AdministrationDepartmentEventRole) ?? 'ISSUER',
      directiveRoleDesc: rel.roleDescription ?? '',
    })
  }

  return list
}

export async function syncUnitEventDrafts(params: {
  unitId: string
  drafts: ReadonlyArray<UnitEventLinkDraft>
  initialDeployments: ReadonlyArray<{ id: string; eventId: string; sideId: string }>
  initialRelations: ReadonlyArray<{ relationId: string; eventId: string }>
}): Promise<{ warnings: string[] }> {
  const { unitId, drafts, initialDeployments, initialRelations } = params
  const warnings: string[] = []

  const keptDeploymentIds = new Set<string>()
  const keptRelationIds = new Set<string>()

  for (const draft of drafts) {
    try {
      if (draft.track === 'DEPLOYMENT') {
        let targetSideId = draft.sideId
        if (!targetSideId) {
          const existingSides = await listEventSides(draft.eventId)
          if (existingSides.length > 0) {
            targetSideId = existingSides[0].id
          } else {
            const createdSides = await syncEventSides(draft.eventId, [
              {
                name: draft.autoCreateSideName.trim() || '참전 진영',
                level: 'COUNTRY',
              },
            ])
            if (createdSides[0]?.id) {
              targetSideId = createdSides[0].id
            }
          }
        }
        if (!targetSideId) {
          warnings.push(`「${draft.eventTitle}」 투입 진영을 결정하지 못했습니다.`)
          continue
        }

        const commanderIdPayload = draft.commanderId.trim() || null

        if (draft.existingDeploymentId) {
          const oldDep = initialDeployments.find(
            (depItem) => depItem.id === draft.existingDeploymentId,
          )
          if (oldDep && oldDep.sideId !== targetSideId) {
            await removeEventSideUnit(draft.eventId, draft.existingDeploymentId)
            await addEventSideUnit(draft.eventId, targetSideId, {
              militaryUnitId: unitId,
              commanderId: commanderIdPayload,
              role: draft.deploymentRole || null,
              note: draft.deploymentNote.trim() || null,
            })
          } else {
            keptDeploymentIds.add(draft.existingDeploymentId)
            await updateEventSideUnit(
              draft.eventId,
              draft.existingDeploymentId,
              {
                commanderId: commanderIdPayload,
                role: draft.deploymentRole || null,
                note: draft.deploymentNote.trim() || null,
              },
            )
          }
        } else {
          await addEventSideUnit(draft.eventId, targetSideId, {
            militaryUnitId: unitId,
            commanderId: commanderIdPayload,
            role: draft.deploymentRole || null,
            note: draft.deploymentNote.trim() || null,
          })
        }
      } else {
        if (draft.existingRelationId) {
          keptRelationIds.add(draft.existingRelationId)
          await administrationDepartmentApi.updateDepartmentEventLink(
            draft.eventId,
            draft.existingRelationId,
            {
              role: draft.directiveRole,
              roleDescription: draft.directiveRoleDesc.trim() || null,
            },
          )
        } else {
          await administrationDepartmentApi.linkDepartmentEvent(draft.eventId, {
            militaryUnitId: unitId,
            role: draft.directiveRole,
            roleDescription: draft.directiveRoleDesc.trim() || null,
          })
        }
      }
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : '사건 연결 중 오류가 발생했습니다.'
      warnings.push(`「${draft.eventTitle}」: ${msg}`)
    }
  }

  for (const oldDep of initialDeployments) {
    if (!keptDeploymentIds.has(oldDep.id)) {
      try {
        await removeEventSideUnit(oldDep.eventId, oldDep.id)
      } catch (err) {
        const msg = err instanceof Error ? err.message : '연결 해제 실패'
        warnings.push(`참전 연결 해제: ${msg}`)
      }
    }
  }

  for (const oldRel of initialRelations) {
    if (!keptRelationIds.has(oldRel.relationId)) {
      try {
        await administrationDepartmentApi.unlinkDepartmentEvent(
          oldRel.eventId,
          oldRel.relationId,
        )
      } catch (err) {
        const msg = err instanceof Error ? err.message : '연결 해제 실패'
        warnings.push(`지령 연결 해제: ${msg}`)
      }
    }
  }

  return { warnings }
}

function formatPartsToIsoStartDate(parts: {
  era: 'AD' | 'BC'
  year: string
  month: string
  day: string
}): { startDate?: string; startDatePrecision?: 'year' | 'month' | 'day' } {
  const y = Number.parseInt(parts.year.trim(), 10)
  if (!Number.isFinite(y) || y <= 0) return {}
  const m = Number.parseInt(parts.month.trim(), 10)
  const d = Number.parseInt(parts.day.trim(), 10)
  const hasMonth = Number.isFinite(m) && m >= 1 && m <= 12
  const hasDay = hasMonth && Number.isFinite(d) && d >= 1 && d <= 31

  const yearPart =
    parts.era === 'BC'
      ? `-${String(y).padStart(4, '0')}`
      : String(y).padStart(4, '0')
  const monthPart = String(hasMonth ? m : 1).padStart(2, '0')
  const dayPart = String(hasDay ? d : 1).padStart(2, '0')
  return {
    startDate: `${yearPart}-${monthPart}-${dayPart}`,
    startDatePrecision: hasDay ? 'day' : hasMonth ? 'month' : 'year',
  }
}

interface EventSideSelectorProps {
  eventId: string
  selectedSideId: string
  autoCreateSideName: string
  countryId: string
  historicalCountryId: string
  onChangeSide: (sideId: string) => void
  onChangeAutoCreateName: (name: string) => void
}

const EventSideSelector: React.FC<EventSideSelectorProps> = ({
  eventId,
  selectedSideId,
  autoCreateSideName,
  countryId,
  historicalCountryId,
  onChangeSide,
  onChangeAutoCreateName,
}) => {
  const [sides, setSides] = useState<EventSide[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listEventSides(eventId)
      .then((fetched) => {
        if (cancelled) return
        setSides(fetched)
        if (!selectedSideId && fetched.length > 0) {
          const matchedSide = fetched.find((side) =>
            (side.participants ?? []).some(
              (p) =>
                (historicalCountryId &&
                  p.historicalCountryId === historicalCountryId) ||
                (countryId && p.countryId === countryId),
            ),
          )
          onChangeSide((matchedSide ?? fetched[0]).id)
        }
      })
      .catch(() => {
        if (!cancelled) setSides([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [eventId])

  if (loading && sides === null) {
    return <MutedHint>사건 진영 정보를 불러오는 중…</MutedHint>
  }

  if (sides && sides.length > 0) {
    return (
      <SideChoiceRow role="group" aria-label="투입 진영 선택">
        <MiniSubLabel>소속 진영:</MiniSubLabel>
        {sides.map((side) => (
          <SidePill
            key={side.id}
            type="button"
            $active={selectedSideId === side.id}
            onClick={() => onChangeSide(side.id)}
          >
            {side.name}
          </SidePill>
        ))}
      </SideChoiceRow>
    )
  }

  return (
    <AutoSideBox>
      <MiniSubLabel>
        이 사건에 아직 등록된 진영이 없습니다 — 저장 시 아래 진영을 자동 생성하고 소속 국가를 함께 묶습니다:
      </MiniSubLabel>
      <S.Input
        type="text"
        placeholder="진영명 (예: 추축국, 연합군, 대한민국 국군)"
        value={autoCreateSideName}
        onChange={(e) => onChangeAutoCreateName(e.target.value)}
      />
    </AutoSideBox>
  )
}

export interface UnitEventLinksEditorProps {
  drafts: UnitEventLinkDraft[]
  onChange: (next: UnitEventLinkDraft[]) => void
  unitType: MilitaryUnitType | ''
  countryId: string
  historicalCountryId: string
  countryName: string
  defaultEra?: 'AD' | 'BC'
  defaultYear?: string
  commanderCandidates?: ReadonlyArray<CommanderCandidateOption>
}

const DEFAULT_DIRECTIVE_ROLE_OPTIONS: ReadonlyArray<{
  value: AdministrationDepartmentEventRole
  label: string
}> = [
  { value: 'ISSUER', label: '명령·지령 발령' },
  { value: 'RECIPIENT', label: '명령 수령·집행' },
  { value: 'PRINCIPAL', label: '작전 주도·주관' },
  { value: 'PARTICIPANT', label: '관여' },
  { value: 'OTHER', label: '기타 · 창설/개편 계기' },
]

const DEPLOYMENT_ROLES: ReadonlyArray<{ value: SideUnitRole; label: string }> = [
  { value: 'MAIN_EFFORT', label: SIDE_UNIT_ROLE_LABEL.MAIN_EFFORT },
  { value: 'SUPPORTING', label: SIDE_UNIT_ROLE_LABEL.SUPPORTING },
  { value: 'DEFENSE', label: SIDE_UNIT_ROLE_LABEL.DEFENSE },
  { value: 'RESERVE', label: SIDE_UNIT_ROLE_LABEL.RESERVE },
  { value: 'OTHER', label: SIDE_UNIT_ROLE_LABEL.OTHER },
]

type QuickCreateSubtype = 'BATTLE' | 'WAR' | 'MILITARY_FORMATION'

const QUICK_SUBTYPE_OPTIONS: ReadonlyArray<{
  value: QuickCreateSubtype
  label: string
  kind: 'SINGLE' | 'COLLECTION'
}> = [
  { value: 'BATTLE', label: '전투 · 작전 (단일)', kind: 'SINGLE' },
  { value: 'WAR', label: '전쟁 · 전역 (상위 묶음)', kind: 'COLLECTION' },
  { value: 'MILITARY_FORMATION', label: '부대 창설 · 개편', kind: 'SINGLE' },
]

export const UnitEventLinksEditor: React.FC<UnitEventLinksEditorProps> = ({
  drafts,
  onChange,
  unitType,
  countryId,
  historicalCountryId,
  countryName,
  defaultEra = 'AD',
  defaultYear = '',
  commanderCandidates = [],
}) => {
  const queryClient = useQueryClient()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [quickFocused, setQuickFocused] = useState(false)

  // 즉석 전투·작전 생성 폼 상태
  const [quickCreateOpen, setQuickCreateOpen] = useState(false)
  const [qcSubtype, setQcSubtype] = useState<QuickCreateSubtype>('BATTLE')
  const [qcTitle, setQcTitle] = useState('')
  const [qcSubtitle, setQcSubtitle] = useState('')
  const [qcEra, setQcEra] = useState<'AD' | 'BC'>(defaultEra)
  const [qcYear, setQcYear] = useState(defaultYear)
  const [qcMonth, setQcMonth] = useState('')
  const [qcDay, setQcDay] = useState('')
  const [qcParentQuery, setQcParentQuery] = useState('')
  const [qcParentFocused, setQcParentFocused] = useState(false)
  const [qcParentCandidates, setQcParentCandidates] = useState<
    EventLinkCandidate[]
  >([])
  const [qcParentEvent, setQcParentEvent] = useState<{
    id: string
    title: string
  } | null>(null)
  const [qcCreating, setQcCreating] = useState(false)

  const {
    query: quickQuery,
    setQuery: setQuickQuery,
    results: searchResults,
  } = useEventSearch(quickFocused)

  useEffect(() => {
    if (!quickCreateOpen || qcSubtype === 'WAR') return
    let cancelled = false
    const timer = window.setTimeout(() => {
      const nearYearNum = Number.parseInt(qcYear || defaultYear, 10)
      getEventLinkCandidates({
        query: qcParentQuery.trim() || undefined,
        kind: 'COLLECTION',
        near:
          Number.isFinite(nearYearNum) && nearYearNum > 0
            ? (qcEra === 'BC' ? -nearYearNum : nearYearNum)
            : undefined,
        window: 25,
        limit: 8,
      })
        .then((items) => {
          if (!cancelled) setQcParentCandidates(items)
        })
        .catch(() => {
          if (!cancelled) setQcParentCandidates([])
        })
    }, 180)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [quickCreateOpen, qcSubtype, qcParentQuery, qcYear, qcEra, defaultYear])

  const handleAppendEvent = (params: {
    eventId: string
    eventTitle: string
    dateText?: string
    parentEventId?: string | null
    parentEventTitle?: string | null
    forceTrack?: UnitEventLinkTrack
  }) => {
    if (drafts.some((d) => d.eventId === params.eventId)) {
      notify.info(`이미 목록에 연결된 사건입니다: ${params.eventTitle}`)
      setQuickQuery('')
      return
    }
    const nextDraft = createEventLinkDraft({
      eventId: params.eventId,
      eventTitle: params.eventTitle,
      eventDateText: params.dateText,
      parentEventId: params.parentEventId,
      parentEventTitle: params.parentEventTitle,
      unitType,
      defaultCountryName: countryName,
      forceTrack: params.forceTrack,
    })
    onChange([...drafts, nextDraft])
    setQuickQuery('')
  }

  const handleQuickCreateEvent = async () => {
    const trimmedTitle = qcTitle.trim()
    if (!trimmedTitle) {
      notify.error('생성할 전투·작전명을 입력해 주세요.')
      return
    }
    setQcCreating(true)
    try {
      const subtypeDef =
        QUICK_SUBTYPE_OPTIONS.find((opt) => opt.value === qcSubtype) ??
        QUICK_SUBTYPE_OPTIONS[0]
      const { startDate, startDatePrecision } = formatPartsToIsoStartDate({
        era: qcEra,
        year: qcYear,
        month: qcMonth,
        day: qcDay,
      })
      const relatedCountries =
        historicalCountryId || countryId
          ? [
              {
                ...(historicalCountryId
                  ? { historicalCountryId }
                  : { countryId }),
                role: 'PARTICIPANT' as const,
              },
            ]
          : undefined

      const created = await createEvent({
        title: trimmedTitle,
        subtitle: qcSubtitle.trim() || null,
        domain: 'MILITARY',
        type: qcSubtype,
        kind: subtypeDef.kind,
        parentEventId:
          qcSubtype !== 'WAR' && qcParentEvent?.id ? qcParentEvent.id : null,
        ...(startDate ? { startDate, startDatePrecision } : {}),
        ...(relatedCountries ? { relatedCountries } : {}),
      })

      await queryClient.invalidateQueries({ queryKey: ['events'] })

      const dateLabel = eventDateLabel(created) || undefined
      handleAppendEvent({
        eventId: created.id,
        eventTitle: created.title,
        dateText: dateLabel,
        parentEventId:
          qcSubtype !== 'WAR' && qcParentEvent?.id ? qcParentEvent.id : null,
        parentEventTitle:
          qcSubtype !== 'WAR' && qcParentEvent?.title
            ? qcParentEvent.title
            : null,
        forceTrack:
          qcSubtype === 'MILITARY_FORMATION' ? 'DIRECTIVE' : undefined,
      })

      notify.success(`「${created.title}」 사건을 생성하고 연결했습니다.`)
      setQcTitle('')
      setQcSubtitle('')
      setQuickCreateOpen(false)
    } catch (err) {
      notify.error(
        getApiErrorMessage(err, '전투·작전 사건 생성 중 오류가 발생했습니다.'),
      )
    } finally {
      setQcCreating(false)
    }
  }

  const updateRow = (
    localId: string,
    patch: Partial<UnitEventLinkDraft>,
  ) => {
    onChange(
      drafts.map((item) =>
        item.localId === localId ? { ...item, ...patch } : item,
      ),
    )
  }

  // 상위 전쟁·전역(parentEventId) 기준 그룹화
  const groupedDrafts = useMemo(() => {
    const groups: Array<{
      groupKey: string
      parentEventId: string | null
      parentEventTitle: string | null
      items: UnitEventLinkDraft[]
    }> = []
    const indexByKey = new Map<string, number>()

    for (const item of drafts) {
      const key = item.parentEventId ? `parent:${item.parentEventId}` : 'standalone'
      const existingIdx = indexByKey.get(key)
      if (existingIdx !== undefined) {
        groups[existingIdx].items.push(item)
        if (!groups[existingIdx].parentEventTitle && item.parentEventTitle) {
          groups[existingIdx].parentEventTitle = item.parentEventTitle
        }
      } else {
        indexByKey.set(key, groups.length)
        groups.push({
          groupKey: key,
          parentEventId: item.parentEventId ?? null,
          parentEventTitle: item.parentEventTitle ?? null,
          items: [item],
        })
      }
    }

    // 상위 전쟁이 있는 그룹을 먼저, 단독 사건을 뒤에 배치
    return groups.sort((a, b) => {
      if (a.parentEventId && !b.parentEventId) return -1
      if (!a.parentEventId && b.parentEventId) return 1
      return 0
    })
  }, [drafts])

  const renderEventRow = (row: UnitEventLinkDraft) => {
    const mergedCommanders = [...commanderCandidates]
    if (
      row.commanderId &&
      !mergedCommanders.some((c) => c.personId === row.commanderId)
    ) {
      mergedCommanders.unshift({
        personId: row.commanderId,
        personName: row.commanderNameHint || '지정된 지휘관',
        label: row.commanderNameHint || '지정된 지휘관',
      })
    }

    return (
      <EventCard key={row.localId}>
        <EventCardHead>
          <EventTitleSide>
            {row.track === 'DEPLOYMENT' ? (
              <FiShield size={13} />
            ) : (
              <FiCompass size={13} />
            )}
            <strong>{row.eventTitle}</strong>
            {row.eventDateText ? (
              <DateBadge>{row.eventDateText}</DateBadge>
            ) : null}
          </EventTitleSide>

          <TrackSwitch role="group" aria-label="사건 연결 유형">
            <TrackChip
              type="button"
              $active={row.track === 'DEPLOYMENT'}
              onClick={() => updateRow(row.localId, { track: 'DEPLOYMENT' })}
            >
              참전 · 전투서열 투입
            </TrackChip>
            <TrackChip
              type="button"
              $active={row.track === 'DIRECTIVE'}
              onClick={() => updateRow(row.localId, { track: 'DIRECTIVE' })}
            >
              지령 · 주관 · 관여
            </TrackChip>
          </TrackSwitch>

          <RemoveBtn
            type="button"
            aria-label={`${row.eventTitle} 연결 제거`}
            onClick={() =>
              onChange(
                drafts.filter((draftItem) => draftItem.localId !== row.localId),
              )
            }
          >
            <FiX size={14} />
          </RemoveBtn>
        </EventCardHead>

        {row.track === 'DEPLOYMENT' ? (
          <DeploymentBody>
            <EventSideSelector
              eventId={row.eventId}
              selectedSideId={row.sideId}
              autoCreateSideName={row.autoCreateSideName}
              countryId={countryId}
              historicalCountryId={historicalCountryId}
              onChangeSide={(nextSideId) =>
                updateRow(row.localId, { sideId: nextSideId })
              }
              onChangeAutoCreateName={(nextName) =>
                updateRow(row.localId, { autoCreateSideName: nextName })
              }
            />

            <RoleNoteRow>
              <RoleAndCommanderRow>
                <RolePills role="group" aria-label="작전 몫">
                  {DEPLOYMENT_ROLES.map((opt) => (
                    <SidePill
                      key={opt.value}
                      type="button"
                      $active={row.deploymentRole === opt.value}
                      onClick={() =>
                        updateRow(row.localId, {
                          deploymentRole:
                            row.deploymentRole === opt.value ? '' : opt.value,
                        })
                      }
                    >
                      {opt.label}
                    </SidePill>
                  ))}
                </RolePills>

                {mergedCommanders.length > 0 ? (
                  <CommanderOverrideWrap>
                    <FiUser size={12} />
                    <CommanderSelect
                      aria-label={`${row.eventTitle} 전투 당시 지휘관 지정`}
                      value={row.commanderId}
                      onChange={(e) =>
                        updateRow(row.localId, { commanderId: e.target.value })
                      }
                    >
                      <option value="">지휘관 자동 (임기 기준)</option>
                      {mergedCommanders.map((cand) => (
                        <option key={cand.personId} value={cand.personId}>
                          {cand.label || cand.personName}
                        </option>
                      ))}
                    </CommanderSelect>
                  </CommanderOverrideWrap>
                ) : null}
              </RoleAndCommanderRow>

              <S.Input
                type="text"
                placeholder="작전 기동·임무 한 줄 메모 (예: 민스크 포위 주공, 우익 돌파)"
                value={row.deploymentNote}
                onChange={(e) =>
                  updateRow(row.localId, {
                    deploymentNote: e.target.value,
                  })
                }
              />
            </RoleNoteRow>
          </DeploymentBody>
        ) : (
          <DirectiveBody>
            <DirectiveSelect
              aria-label="사건 관여 역할"
              value={row.directiveRole}
              onChange={(e) =>
                updateRow(row.localId, {
                  directiveRole: e.target
                    .value as AdministrationDepartmentEventRole,
                })
              }
            >
              {(
                MILITARY_DIRECTIVE_ROLE_OPTIONS ??
                DEFAULT_DIRECTIVE_ROLE_OPTIONS
              ).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </DirectiveSelect>
            <S.Input
              type="text"
              placeholder="지령 번호 · 관여 세부 (예: 작전 지령 제21호 발령, 부대 창설 계기)"
              value={row.directiveRoleDesc}
              onChange={(e) =>
                updateRow(row.localId, {
                  directiveRoleDesc: e.target.value,
                })
              }
            />
          </DirectiveBody>
        )}
      </EventCard>
    )
  }

  return (
    <Wrap>
      <SearchToolbar>
        <FormS.QuickSearchBox style={{ flex: 1 }}>
          <S.Input
            type="text"
            placeholder="전쟁 · 전투 · 작전 · 군사 사건 빠른 검색…"
            aria-label="연결할 사건 검색"
            value={quickQuery}
            onFocus={() => setQuickFocused(true)}
            onBlur={() => window.setTimeout(() => setQuickFocused(false), 180)}
            onChange={(e) => setQuickQuery(e.target.value)}
          />
          {quickFocused && quickQuery.trim() ? (
            <FormS.QuickSuggestionList role="listbox" aria-label="사건 검색 결과">
              {searchResults.slice(0, 7).map((ev) => {
                const dateStr = eventDateLabel(ev)
                const evWithParent = ev as {
                  parentEventId?: string | null
                  parentEvent?: { id: string; title?: string | null } | null
                }
                return (
                  <FormS.QuickSuggestionItem
                    key={ev.id}
                    type="button"
                    role="option"
                    aria-selected={false}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      handleAppendEvent({
                        eventId: ev.id,
                        eventTitle: ev.title,
                        dateText: dateStr || undefined,
                        parentEventId:
                          evWithParent.parentEvent?.id ??
                          evWithParent.parentEventId ??
                          null,
                        parentEventTitle:
                          evWithParent.parentEvent?.title ?? null,
                      })
                    }}
                  >
                    <span>
                      {ev.title}
                      {evWithParent.parentEvent?.title ? (
                        <ParentHintTag>
                          {evWithParent.parentEvent.title}
                        </ParentHintTag>
                      ) : null}
                    </span>
                    <FormS.ContextCardMeta>{dateStr}</FormS.ContextCardMeta>
                  </FormS.QuickSuggestionItem>
                )
              })}
              <QuickCreateFromSearchBtn
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  setQcTitle(quickQuery.trim())
                  setQcYear((prev) => prev || defaultYear)
                  setQuickCreateOpen(true)
                  setQuickQuery('')
                }}
              >
                <FiPlus size={13} />「{quickQuery.trim()}」 전투·사건 즉석 생성 후 연결
              </QuickCreateFromSearchBtn>
            </FormS.QuickSuggestionList>
          ) : null}
        </FormS.QuickSearchBox>

        <S.AddButton type="button" onClick={() => setPickerOpen(true)}>
          <FiPlus size={15} />
          사건 선택
        </S.AddButton>

        <QuickCreateToggleBtn
          type="button"
          $active={quickCreateOpen}
          onClick={() => {
            setQuickCreateOpen((prev) => {
              if (!prev) {
                setQcEra(defaultEra)
                setQcYear((cur) => cur || defaultYear)
              }
              return !prev
            })
          }}
        >
          <FiPlus size={14} />
          전투·작전 즉석 생성
        </QuickCreateToggleBtn>
      </SearchToolbar>

      {quickCreateOpen ? (
        <QuickCreatePanel aria-label="전투·작전 사건 즉석 생성">
          <QuickCreateHeader>
            <strong>새 전투 · 작전 사건 즉석 생성</strong>
            <MutedHint>
              사건 정본(Event)에 즉시 등록되며 이 부대의 참전 전투서열에 바로 연결됩니다.
            </MutedHint>
          </QuickCreateHeader>

          <SideChoiceRow role="group" aria-label="생성할 군사 사건 분류">
            {QUICK_SUBTYPE_OPTIONS.map((opt) => (
              <SidePill
                key={opt.value}
                type="button"
                $active={qcSubtype === opt.value}
                onClick={() => setQcSubtype(opt.value)}
              >
                {opt.label}
              </SidePill>
            ))}
          </SideChoiceRow>

          <QuickCreateGrid>
            <FormS.SubTitleField>
              <FormS.SubTitleLabel>전투 · 작전명 *</FormS.SubTitleLabel>
              <S.Input
                type="text"
                placeholder="예: 스몰렌스크 전투, 바그라티온 작전, 제2차 세계대전 동부전선"
                value={qcTitle}
                onChange={(e) => setQcTitle(e.target.value)}
              />
            </FormS.SubTitleField>
            <FormS.SubTitleField>
              <FormS.SubTitleLabel>부제 · 작전 암호명 (선택)</FormS.SubTitleLabel>
              <S.Input
                type="text"
                placeholder="예: 타이푼 작전, Unternehmen Barbarossa"
                value={qcSubtitle}
                onChange={(e) => setQcSubtitle(e.target.value)}
              />
            </FormS.SubTitleField>
          </QuickCreateGrid>

          {qcSubtype !== 'WAR' ? (
            <FormS.SubTitleField>
              <FormS.SubTitleLabel>
                소속 상위 전쟁 · 전역 (선택 — 전쟁별로 자동 묶임)
              </FormS.SubTitleLabel>
              {qcParentEvent ? (
                <FormS.ContextCard>
                  <FormS.ContextCardRow>
                    <FormS.ContextCardTitle>
                      <FiFolder size={13} />
                      <span>{qcParentEvent.title}</span>
                      <FormS.ContextCardMeta>상위 전쟁·전역</FormS.ContextCardMeta>
                    </FormS.ContextCardTitle>
                    <QuickCancelBtn
                      type="button"
                      onClick={() => setQcParentEvent(null)}
                    >
                      변경
                    </QuickCancelBtn>
                  </FormS.ContextCardRow>
                </FormS.ContextCard>
              ) : (
                <FormS.QuickSearchBox>
                  <S.Input
                    type="text"
                    placeholder="상위 전쟁·전역 묶음 사건 검색 (예: 독소전쟁, 제2차 세계대전, 한국전쟁)…"
                    value={qcParentQuery}
                    onFocus={() => setQcParentFocused(true)}
                    onBlur={() =>
                      window.setTimeout(() => setQcParentFocused(false), 180)
                    }
                    onChange={(e) => setQcParentQuery(e.target.value)}
                  />
                  {qcParentFocused && qcParentCandidates.length > 0 ? (
                    <FormS.QuickSuggestionList role="listbox">
                      {qcParentCandidates.map((cand) => (
                        <FormS.QuickSuggestionItem
                          key={cand.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            setQcParentEvent({ id: cand.id, title: cand.title })
                            setQcParentQuery('')
                          }}
                        >
                          <span>{cand.title}</span>
                          {cand.startYear ? (
                            <FormS.ContextCardMeta>
                              {cand.startYear < 0
                                ? `BC ${Math.abs(cand.startYear)}`
                                : `${cand.startYear}년`}
                            </FormS.ContextCardMeta>
                          ) : null}
                        </FormS.QuickSuggestionItem>
                      ))}
                    </FormS.QuickSuggestionList>
                  ) : null}
                </FormS.QuickSearchBox>
              )}
            </FormS.SubTitleField>
          ) : null}

          <FormS.SubTitleField>
            <FormS.SubTitleLabel>발발 · 개시 시점 (선택)</FormS.SubTitleLabel>
            <StructuredPartsDateField
              era={qcEra}
              year={qcYear}
              month={qcMonth}
              day={qcDay}
              ariaLabel="발발 시점"
              pickerTitle="발발 · 개시 시점 선택"
              anchorId="qc-battle-start"
              onChange={(nextDate) => {
                setQcEra(nextDate.era)
                setQcYear(nextDate.year)
                setQcMonth(nextDate.month)
                setQcDay(nextDate.day)
              }}
            />
          </FormS.SubTitleField>

          <QuickCreateActions>
            <QuickCancelBtn
              type="button"
              onClick={() => setQuickCreateOpen(false)}
              disabled={qcCreating}
            >
              취소
            </QuickCancelBtn>
            <QuickSubmitBtn
              type="button"
              onClick={() => void handleQuickCreateEvent()}
              disabled={qcCreating || !qcTitle.trim()}
            >
              {qcCreating ? '생성 중…' : '사건 생성 후 참전 연결'}
            </QuickSubmitBtn>
          </QuickCreateActions>
        </QuickCreatePanel>
      ) : null}

      {groupedDrafts.length > 0 ? (
        <GroupedStack>
          {groupedDrafts.map((group) => (
            <CampaignGroup key={group.groupKey}>
              {group.parentEventId || groupedDrafts.length > 1 ? (
                <CampaignGroupHeader>
                  <FiFolder size={12} />
                  <span>
                    {group.parentEventTitle
                      ? `상위 전쟁·전역: ${group.parentEventTitle}`
                      : '단독 전투 · 작전 · 군사 사건'}
                  </span>
                  <CampaignCount>{group.items.length}건</CampaignCount>
                </CampaignGroupHeader>
              ) : null}
              <EventCardStack>
                {group.items.map((row) => renderEventRow(row))}
              </EventCardStack>
            </CampaignGroup>
          ))}
        </GroupedStack>
      ) : null}

      <EventPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="참전 전투 · 작전 · 관련 사건 연결"
        onSelect={(picked) => {
          const pickedExt = picked as {
            id: string
            title: string
            parentEventId?: string | null
            parentEvent?: { id: string; title?: string | null } | null
          }
          handleAppendEvent({
            eventId: picked.id,
            eventTitle: picked.title,
            parentEventId:
              pickedExt.parentEvent?.id ?? pickedExt.parentEventId ?? null,
            parentEventTitle: pickedExt.parentEvent?.title ?? null,
          })
          setPickerOpen(false)
        }}
      />
    </Wrap>
  )
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const SearchToolbar = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 10px;
`

const ParentHintTag = styled.span`
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(148, 163, 184, 0.14)' : 'rgba(15, 23, 42, 0.05)'};
`

const QuickCreateFromSearchBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 9px 12px;
  border: none;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(99, 102, 241, 0.05)'};
  color: ${({ theme }) => theme.colors.primary};
  font: inherit;
  font-size: 12px;
  font-weight: 650;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.2)'
        : 'rgba(99, 102, 241, 0.1)'};
  }
`

const QuickCreateToggleBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 36px;
  padding: 0 11px;
  border-radius: 8px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? theme.colors.primary : theme.colors.border.default};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.2)'
        : 'rgba(99, 102, 241, 0.08)'
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.text.secondary};
  font: inherit;
  font-size: 12px;
  font-weight: 650;
  cursor: pointer;
`

const QuickCreatePanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(15, 23, 42, 0.45)'
      : 'rgba(248, 250, 252, 0.9)'};
`

const QuickCreateHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.primary};
`

const QuickCreateGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  gap: 8px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

const QuickCreateActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`

const QuickCancelBtn = styled.button`
  height: 32px;
  padding: 0 12px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
`

const QuickSubmitBtn = styled.button`
  height: 32px;
  padding: 0 13px;
  border-radius: 7px;
  border: none;
  background: ${({ theme }) => theme.colors.primary};
  color: #ffffff;
  font: inherit;
  font-size: 12px;
  font-weight: 650;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const GroupedStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 2px;
`

const CampaignGroup = styled.div`
  display: flex;
  flex-direction: column;
`

const CampaignGroupHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  border-radius: 6px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(148, 163, 184, 0.1)'
      : 'rgba(15, 23, 42, 0.04)'};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11.5px;
  font-weight: 650;
`

const CampaignCount = styled.span`
  margin-left: auto;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const EventCardStack = styled.div`
  display: flex;
  flex-direction: column;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`

const EventCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 2px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
`

const EventCardHead = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
`

const EventTitleSide = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 13.5px;
  color: ${({ theme }) => theme.colors.text.primary};
`

const DateBadge = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
`

const TrackSwitch = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  gap: 2px;
  margin-left: auto;
  padding: 2px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
`

const TrackChip = styled.button<{ $active: boolean }>`
  height: 23px;
  padding: 0 8px;
  border-radius: 5px;
  border: none;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.22)'
        : 'rgba(99, 102, 241, 0.1)'
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.text.secondary};
  font: inherit;
  font-size: 11px;
  font-weight: ${({ $active }) => ($active ? 700 : 550)};
  cursor: pointer;
`

const RemoveBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    color: #dc2626;
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(239, 68, 68, 0.14)'
        : 'rgba(239, 68, 68, 0.08)'};
  }
`

const DeploymentBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
`

const SideChoiceRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
`

const MiniSubLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SidePill = styled.button<{ $active: boolean }>`
  height: 24px;
  padding: 0 9px;
  border-radius: 6px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? theme.colors.primary : theme.colors.border.light};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.2)'
        : 'rgba(99, 102, 241, 0.08)'
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.text.secondary};
  font: inherit;
  font-size: 11px;
  font-weight: ${({ $active }) => ($active ? 700 : 550)};
  cursor: pointer;
`

const AutoSideBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`

const RoleNoteRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const RoleAndCommanderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px;
`

const RolePills = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`

const CommanderOverrideWrap = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CommanderSelect = styled.select`
  height: 26px;
  padding: 0 7px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(15, 23, 42, 0.5)' : '#ffffff'};
  color: ${({ theme }) => theme.colors.text.secondary};
  font: inherit;
  font-size: 11.5px;
`

const DirectiveBody = styled.div`
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  gap: 7px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

const DirectiveSelect = styled.select`
  height: 36px;
  padding: 0 8px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(15, 23, 42, 0.5)' : '#ffffff'};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-size: 12px;
`

const MutedHint = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
