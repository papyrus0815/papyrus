import React, { useEffect, useState } from 'react'

import { FiCompass, FiPlus, FiShield, FiX } from 'react-icons/fi'
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
import type {
  MilitaryUnitEventLinkDto,
  MilitaryUnitType,
} from '@/shared/api/military-unit'
import { useEventSearch } from '@/shared/hooks/use-event-search'
import { eventDateLabel } from '@/shared/lib/event-date-label'
import { EventPickerModal } from '@/shared/ui/event-picker-modal/event-picker-modal'

import { isHighCommandUnitType } from './constants'
import * as FormS from './styles'

export type UnitEventLinkTrack = 'DEPLOYMENT' | 'DIRECTIVE'

export interface UnitEventLinkDraft {
  localId: string
  eventId: string
  eventTitle: string
  eventDateText?: string
  track: UnitEventLinkTrack
  /** 참전(DEPLOYMENT) 트랙 필드 */
  existingDeploymentId?: string
  sideId: string
  autoCreateSideName: string
  deploymentRole: SideUnitRole | ''
  deploymentNote: string
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
  unitType?: MilitaryUnitType | '' | null
  defaultCountryName?: string
}): UnitEventLinkDraft {
  const defaultTrack: UnitEventLinkTrack = isHighCommandUnitType(params.unitType)
    ? 'DIRECTIVE'
    : 'DEPLOYMENT'
  return {
    localId: `unit-event-${Date.now()}-${nextEventDraftSeq++}`,
    eventId: params.eventId,
    eventTitle: params.eventTitle,
    eventDateText: params.eventDateText,
    track: defaultTrack,
    sideId: '',
    autoCreateSideName: params.defaultCountryName
      ? `${params.defaultCountryName} 측`
      : '참전 진영',
    deploymentRole: 'MAIN_EFFORT',
    deploymentNote: '',
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
  side?: {
    id: string
    name?: string | null
    event?: {
      id: string
      title?: string | null
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
    list.push({
      localId: `hydrated-dep-${dep.id}`,
      eventId: String(ev.id),
      eventTitle: String(ev.title ?? '연결된 사건'),
      track: 'DEPLOYMENT',
      existingDeploymentId: String(dep.id),
      sideId: String(sideObj.id),
      autoCreateSideName: String(sideObj.name ?? '참전 진영'),
      deploymentRole: (dep.role as SideUnitRole) ?? '',
      deploymentNote: dep.note ?? '',
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
      track: 'DIRECTIVE',
      sideId: '',
      autoCreateSideName: '참전 진영',
      deploymentRole: '',
      deploymentNote: '',
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
          // 사건에 진영이 아직 없으면 새 진영을 만들어 투입한다
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

        if (draft.existingDeploymentId) {
          const oldDep = initialDeployments.find(
            (depItem) => depItem.id === draft.existingDeploymentId,
          )
          if (oldDep && oldDep.sideId !== targetSideId) {
            // 진영 자체가 바뀌었으면 이전 진영에서 빼고 새 진영으로 재투입
            await removeEventSideUnit(draft.eventId, draft.existingDeploymentId)
            await addEventSideUnit(draft.eventId, targetSideId, {
              militaryUnitId: unitId,
              role: draft.deploymentRole || null,
              note: draft.deploymentNote.trim() || null,
            })
          } else {
            keptDeploymentIds.add(draft.existingDeploymentId)
            await updateEventSideUnit(
              draft.eventId,
              draft.existingDeploymentId,
              {
                role: draft.deploymentRole || null,
                note: draft.deploymentNote.trim() || null,
              },
            )
          }
        } else {
          await addEventSideUnit(draft.eventId, targetSideId, {
            militaryUnitId: unitId,
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
          // 부대 소속 국가가 포함된 진영을 자동 매칭
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
        이 사건에 아직 등록된 진영이 없습니다 — 저장 시 아래 진영을 자동 생성해 투입합니다:
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

export const UnitEventLinksEditor: React.FC<UnitEventLinksEditorProps> = ({
  drafts,
  onChange,
  unitType,
  countryId,
  historicalCountryId,
  countryName,
}) => {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [quickFocused, setQuickFocused] = useState(false)

  const {
    query: quickQuery,
    setQuery: setQuickQuery,
    results: searchResults,
  } = useEventSearch(quickFocused)

  const handleAppendEvent = (
    eventId: string,
    eventTitle: string,
    dateText?: string,
  ) => {
    const nextDraft = createEventLinkDraft({
      eventId,
      eventTitle,
      eventDateText: dateText,
      unitType,
      defaultCountryName: countryName,
    })
    onChange([...drafts, nextDraft])
    setQuickQuery('')
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
          {quickFocused && quickQuery.trim() && searchResults.length > 0 ? (
            <FormS.QuickSuggestionList role="listbox" aria-label="사건 검색 결과">
              {searchResults.slice(0, 7).map((ev) => {
                const dateStr = eventDateLabel(ev)
                return (
                  <FormS.QuickSuggestionItem
                    key={ev.id}
                    type="button"
                    role="option"
                    aria-selected={false}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      handleAppendEvent(ev.id, ev.title, dateStr || undefined)
                    }}
                  >
                    <span>{ev.title}</span>
                    <FormS.ContextCardMeta>{dateStr}</FormS.ContextCardMeta>
                  </FormS.QuickSuggestionItem>
                )
              })}
            </FormS.QuickSuggestionList>
          ) : null}
        </FormS.QuickSearchBox>

        <S.AddButton type="button" onClick={() => setPickerOpen(true)}>
          <FiPlus size={15} />
          사건 선택
        </S.AddButton>
      </SearchToolbar>

      {drafts.length > 0 ? (
        <EventCardStack>
          {drafts.map((row) => (
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
                    onClick={() =>
                      updateRow(row.localId, { track: 'DEPLOYMENT' })
                    }
                  >
                    참전 · 전투서열 투입
                  </TrackChip>
                  <TrackChip
                    type="button"
                    $active={row.track === 'DIRECTIVE'}
                    onClick={() =>
                      updateRow(row.localId, { track: 'DIRECTIVE' })
                    }
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
                    <RolePills role="group" aria-label="작전 몫">
                      {DEPLOYMENT_ROLES.map((opt) => (
                        <SidePill
                          key={opt.value}
                          type="button"
                          $active={row.deploymentRole === opt.value}
                          onClick={() =>
                            updateRow(row.localId, {
                              deploymentRole:
                                row.deploymentRole === opt.value
                                  ? ''
                                  : opt.value,
                            })
                          }
                        >
                          {opt.label}
                        </SidePill>
                      ))}
                    </RolePills>
                    <S.Input
                      type="text"
                      placeholder="작전 기동·임무 한 줄 메모 (예: 민스크 포위 주공)"
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
                    {(MILITARY_DIRECTIVE_ROLE_OPTIONS ?? DEFAULT_DIRECTIVE_ROLE_OPTIONS).map((opt) => (
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
          ))}
        </EventCardStack>
      ) : null}

      <EventPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="참전 전투 · 작전 · 관련 사건 연결"
        onSelect={(picked) => {
          handleAppendEvent(picked.id, picked.title)
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

const EventCardStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const EventCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(15, 23, 42, 0.1)'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.025)'
      : 'rgba(248, 250, 252, 0.9)'};
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
  font-size: 13px;
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
  gap: 4px;
  margin-left: auto;
`

const TrackChip = styled.button<{ $active: boolean }>`
  height: 23px;
  padding: 0 8px;
  border-radius: 999px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? theme.colors.primary : theme.colors.border.light};
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
  font-weight: 600;
  cursor: pointer;
`

const RemoveBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  &:hover {
    color: #dc2626;
    border-color: rgba(220, 38, 38, 0.4);
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
  border-radius: 999px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? theme.colors.primary : theme.colors.border.light};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.2)'
        : 'rgba(99, 102, 241, 0.09)'
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.text.secondary};
  font: inherit;
  font-size: 11px;
  font-weight: 600;
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

const RolePills = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
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
