/**
 * 등록 모달 — **'기록' 묶음**: 고른 세부 분야의 핵심 기록을 등록하는 자리에서 바로 받는다.
 *
 * 무엇을 받을지는 세부 레지스트리의 `core`가 정한다(전투 → 진영·참여국, 조약 체결 → 맺어진 조약,
 * 건국·멸망 → 세워지거나 무너진 나라, 즉위·취임 → 취임한 인물, 기관·기업 설립 → 기관·기업 …). 참여국 자체는
 * 위 '연결' 묶음의 칸을 그대로 쓰고, 여기서는 그 참여국 위에 얹는 기록(진영 소속·성립/소멸 역할)을 단다.
 * 수치·작전 정보처럼 출처와 함께 적어야 하는 것은 등록 뒤 상세에서 — 무엇을 어디서 적는지만 안내한다.
 *
 * 받은 값은 초안(RegisterFacetDrafts)이고, 저장은 사건이 생긴 뒤 commitRegisterFacets가 각 정본 API로 한다.
 */
import { Fragment, useEffect, useMemo, useState } from 'react'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { FiPlus, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import {
  type EventFacetKey,
  type EventTypeKey,
  typeFacets,
} from '@/entities/event/model/event-type-registry'
import {
  type EventCountryParticipant,
  participantKey,
} from '@/entities/event/model/country-participant'
import { ORGANIZATION_ROLE_OPTIONS } from '@/features/event-facets/model/organization-roles'
import {
  type PickedPerson,
  type RegisterFacetDrafts,
  SIDE_SLOTS,
  type SideSlot,
  suggestSideAssignment,
} from '@/features/event-facets/model/register-facets'
import { treatyNameFromEventTitle } from '@/features/event-facets/model/treaty-from-event'
import * as S from '@/pages/events/create/event-create.styles'
import { getElections } from '@/shared/api/election'
import type { EventOrganizationRole } from '@/shared/api/events'
import { getOrganizationMembers, getOrganizations } from '@/shared/api/organizations'
import { getAllPersons, type PersonResponseDto } from '@/shared/api/persons'
import {
  getPersonGroup,
  listPersonGroups,
  type PersonGroup,
} from '@/shared/api/person-groups'
import { treatyApi } from '@/shared/api/treaty'
import { nestiaApiService } from '@/shared/api/api.service'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { signedYearFromIsoLike } from '@/shared/lib/country-period'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import {
  KitAddButton,
  KitChipGroup,
  KitChoiceChip,
  KitRemoveButton,
  KitSelectedItem,
  KitSelectedItems,
} from '@/shared/ui/register-form-kit/register-form-kit'
import { PersonPickerModal, type PersonPickerContext } from '@/shared/ui/person-picker'
import {
  comparePersons,
  contextScore,
  headlineOffice,
  lifeSpanLabel,
  lifeSpanOf,
  matchesQuery,
  searchHaystack,
} from '@/shared/ui/person-picker/person-picker.lib'
import { SelectModal, type SelectOption } from '@/shared/ui/select-modal/select-modal'
import { notify } from '@/shared/ui/toast'
import { OrganizationQuickCreateModal } from '@/widgets/organization/organization-quick-create-modal'
import { PersonGroupCreateModal } from '@/widgets/person/person-group-create-modal/person-group-create-modal'

/** 등록 뒤 상세에서 적는 기록 — 출처·진영별 값이 필요해 등록 칸으로는 받지 않는다 */
const DETAIL_ONLY: EventFacetKey[] = ['metrics', 'military', 'cabinets']

type PickerKind = 'persons' | 'power' | 'organizations' | 'treaty' | 'election'

export const PERSON_ROLE_PRESETS = [
  '주도',
  '지휘관',
  '집권',
  '반대파',
  '숙청·처형',
  '피살',
  '중재',
] as const

interface CoreRecordsGroupProps {
  type: EventTypeKey | null
  /** 고른 분야 이름 — 세부와 함께 수치 성격을 정한다 */
  domain: string | null
  drafts: RegisterFacetDrafts
  onDraftsChange: (next: RegisterFacetDrafts) => void
  /** 위 '연결'의 참여국 줄 — 진영 소속·성립/소멸이 이 위에 얹힌다 */
  participants: EventCountryParticipant[]
  participantName: (row: EventCountryParticipant) => string
  /** 참여국 피커 열기 — 진영 칸에서 아직 참여국이 없을 때 바로 추가할 수 있게 한다 */
  onOpenCountryModal?: () => void
  /** 나라를 이 역할로 넣는다 — 성립·소멸 칸(국가 선택 모달을 역할을 정한 채로 연다) */
  onAddCountryWithRole: (role: 'FOUNDED' | 'DISSOLVED') => void
  /** 이미 참여국에 들어 있는 나라의 성립·소멸 배역을 바로 지정한다 */
  onAssignParticipantRole?: (key: string, role: 'FOUNDED' | 'DISSOLVED') => void
  /** 성립·소멸 칸 안에서 인라인 빠른 검색으로 나라를 즉시 추가·역할 배정 */
  onQuickAddCountryWithRole?: (
    target: { countryId?: string; historicalCountryId?: string },
    role: 'FOUNDED' | 'DISSOLVED',
  ) => void
  availableCountries?: Array<{ id: string; name: string }>
  availableHistoricalCountries?: Array<{
    id: string
    name: string
    foundedYear?: number | null
    dissolvedYear?: number | null
  }>
  onRemoveParticipant: (key: string) => void
  eventTitle: string
  /** 사건 시작·종료 날짜(선택) — 참여 인물 피커에서 동시대·참여국 인물을 위로 올리는 데 쓴다 */
  startDate?: string
  endDate?: string
  /** 상위 사건에서 진영·인물·조직 구도를 원클릭으로 이어받는 슬롯 */
  parentRecordsSlot?: {
    parentTitle: string
    summaryLabel: string
    onImport: () => void
  }
  playClickSound: () => void
}

export function CoreRecordsGroup({
  type,
  domain,
  drafts,
  onDraftsChange,
  participants,
  participantName,
  onOpenCountryModal,
  onAddCountryWithRole,
  onAssignParticipantRole,
  onQuickAddCountryWithRole,
  availableCountries,
  availableHistoricalCountries,
  onRemoveParticipant,
  eventTitle,
  startDate,
  endDate,
  parentRecordsSlot,
  playClickSound,
}: CoreRecordsGroupProps) {
  const facets = typeFacets(type, domain)
  const [picker, setPicker] = useState<PickerKind | null>(null)
  const [creatingOrgOpen, setCreatingOrgOpen] = useState(false)
  const [creatingOrgInitialName, setCreatingOrgInitialName] = useState('')
  const [expandedOptional, setExpandedOptional] = useState<EventFacetKey[]>([])
  const [orgQuickQuery, setOrgQuickQuery] = useState('')
  const [activeOrgResultIndex, setActiveOrgResultIndex] = useState(0)
  const [isOrgQuickDismissed, setIsOrgQuickDismissed] = useState(false)
  const [isOrgSuggestionsExpanded, setIsOrgSuggestionsExpanded] = useState(false)
  const [electionQuickQuery, setElectionQuickQuery] = useState('')
  const [activeElectionResultIndex, setActiveElectionResultIndex] = useState(0)
  const [isElectionQuickDismissed, setIsElectionQuickDismissed] = useState(false)
  const update = (patch: Partial<RegisterFacetDrafts>) => onDraftsChange({ ...drafts, ...patch })
  const personContext = useMemo<PersonPickerContext | undefined>(() => {
    const fromYear = signedYearFromIsoLike(startDate)
    const toYear = signedYearFromIsoLike(endDate || startDate)
    const countryIds = participants
      .map((row) => row.countryId ?? row.historicalCountryId)
      .filter((id): id is string => Boolean(id))
    if (fromYear == null && toYear == null && countryIds.length === 0) return undefined
    return {
      fromYear,
      toYear,
      countryIds,
      label: '이 사건 무렵 · 참여국 인물',
    }
  }, [startDate, endDate, participants])

  const fieldFacets = facets.core.filter((facet) => facet !== 'participants' && !DETAIL_ONLY.includes(facet))
  const hasSides = fieldFacets.includes('sides')
  const activeSideSlots = useMemo(
    () =>
      SIDE_SLOTS.slice(
        0,
        Math.min(SIDE_SLOTS.length, Math.max(2, drafts.sides.names.length)),
      ),
    [drafts.sides.names.length],
  )
  const showOrganizations =
    fieldFacets.includes('organizations') ||
    expandedOptional.includes('organizations') ||
    drafts.organizations.length > 0
  const showPersons =
    fieldFacets.includes('persons') ||
    facets.optional.includes('persons') ||
    expandedOptional.includes('persons') ||
    drafts.persons.length > 0
  const canExpandOrganizations = !showOrganizations
  const canExpandPersons =
    facets.optional.includes('persons') && !showPersons

  useEffect(() => {
    const handleExpandForJump = (jumpEvent: Event) => {
      const detail = (jumpEvent as CustomEvent<{ facet?: string }>).detail
      const targetFacet = detail?.facet
      if (
        targetFacet === 'organizations' ||
        targetFacet === 'persons'
      ) {
        setExpandedOptional((prev) =>
          prev.includes(targetFacet) ? prev : [...prev, targetFacet],
        )
      }
    }
    window.addEventListener('papyrus:jump-core-record', handleExpandForJump)
    return () =>
      window.removeEventListener(
        'papyrus:jump-core-record',
        handleExpandForJump,
      )
  }, [])

  const defaultCountryId =
    participants.find((row) => row.countryId)?.countryId ?? undefined
  const defaultHistoricalCountryId =
    participants.find((row) => row.historicalCountryId)?.historicalCountryId ??
    undefined

  const orgQuickSearchQuery = useQuery({
    queryKey: ['organizations', 'all-for-quick-search'],
    queryFn: () => getOrganizations(nestiaApiService.getConnection()),
    enabled:
      showOrganizations &&
      (orgQuickQuery.trim().length >= 1 || personContext?.fromYear != null),
    staleTime: 60_000,
  })

  const suggestedOrganizations = useMemo(() => {
    const allOrgs = orgQuickSearchQuery.data ?? []
    if (allOrgs.length === 0) return []
    const countryIds = new Set(
      participants
        .map((row) => row.countryId)
        .filter((id): id is string => Boolean(id)),
    )
    const histCountryIds = new Set(
      participants
        .map((row) => row.historicalCountryId)
        .filter((id): id is string => Boolean(id)),
    )
    if (countryIds.size === 0 && histCountryIds.size === 0) return []
    const existingIds = new Set(drafts.organizations.map((org) => org.id))
    return allOrgs
      .filter(
        (org) =>
          !existingIds.has(org.id) &&
          ((org.countryId && countryIds.has(org.countryId)) ||
            (org.historicalCountryId &&
              histCountryIds.has(org.historicalCountryId))),
      )
      .slice(0, 6)
  }, [orgQuickSearchQuery.data, participants, drafts.organizations])

  const quickOrgMatches = useMemo(() => {
    const needle = orgQuickQuery.trim().toLowerCase()
    if (!needle) return []
    const existingIds = new Set(drafts.organizations.map((org) => org.id))
    return (orgQuickSearchQuery.data ?? [])
      .filter(
        (org) =>
          !existingIds.has(org.id) &&
          (org.name.toLowerCase().includes(needle) ||
            (org.shortName ?? '').toLowerCase().includes(needle)),
      )
      .slice(0, 6)
  }, [orgQuickQuery, orgQuickSearchQuery.data, drafts.organizations])

  const addQuickOrganization = (org: { id: string; name: string }) => {
    if (drafts.organizations.some((item) => item.id === org.id)) return
    playClickSound()
    update({
      organizations: [
        ...drafts.organizations,
        { id: org.id, name: org.name, role: 'PRINCIPAL' as const },
      ],
    })
    setOrgQuickQuery('')
    setActiveOrgResultIndex(0)
  }

  const electionQuickSearchQuery = useQuery({
    queryKey: ['elections', 'all-for-quick-search'],
    queryFn: () => getElections(),
    enabled:
      fieldFacets.includes('election') &&
      electionQuickQuery.trim().length >= 1,
    staleTime: 60_000,
  })

  const quickElectionMatches = useMemo(() => {
    const needle = electionQuickQuery.trim().toLowerCase()
    if (!needle) return []
    return (electionQuickSearchQuery.data ?? [])
      .filter(
        (election) =>
          election.id !== drafts.election?.id &&
          election.name.toLowerCase().includes(needle),
      )
      .slice(0, 6)
  }, [electionQuickQuery, electionQuickSearchQuery.data, drafts.election?.id])

  const selectQuickElection = (election: { id: string; name: string }) => {
    playClickSound()
    update({ election: { id: election.id, name: election.name } })
    setElectionQuickQuery('')
    setActiveElectionResultIndex(0)
  }

  const togglePersonSideSlot = (personId: string, slot: SideSlot) => {
    const current = drafts.sides.personAssignment ?? {}
    const next = { ...current }
    if (next[personId] === slot) {
      delete next[personId]
    } else {
      next[personId] = slot
    }
    update({
      sides: {
        ...drafts.sides,
        personAssignment: next,
      },
    })
  }

  const toggleOrgSideSlot = (orgId: string, slot: SideSlot) => {
    const current = drafts.sides.organizationAssignment ?? {}
    const next = { ...current }
    if (next[orgId] === slot) {
      delete next[orgId]
    } else {
      next[orgId] = slot
    }
    update({
      sides: {
        ...drafts.sides,
        organizationAssignment: next,
      },
    })
  }

  const importOrganizationMembers = async (
    organizationId: string,
    organizationName: string,
    overrideSlot?: SideSlot,
  ) => {
    try {
      const members = await getOrganizationMembers(
        nestiaApiService.getConnection(),
        organizationId,
      )
      if (members.length === 0) {
        notify.info(`‘${organizationName}’에 등록된 소속 인물이 없습니다.`)
        return
      }
      const existingPersonIds = new Set(
        drafts.persons.map((person) => person.personId),
      )
      const nextPersons: PickedPerson[] = [...drafts.persons]
      const assignedSlot =
        overrideSlot ?? drafts.sides.organizationAssignment?.[organizationId]
      const nextPersonAssignment: Record<string, SideSlot> = {
        ...(drafts.sides.personAssignment ?? {}),
      }
      let addedCount = 0
      for (const member of members) {
        const pid = member.person.id
        const displayName = getPersonDisplayName(member.person, true)
        if (!existingPersonIds.has(pid)) {
          existingPersonIds.add(pid)
          nextPersons.push({
            personId: pid,
            name: displayName,
            role: member.roleTitle ?? organizationName,
          })
          addedCount += 1
        }
        if (assignedSlot) {
          nextPersonAssignment[pid] = assignedSlot
        }
      }
      update({
        persons: nextPersons,
        ...(assignedSlot
          ? {
              sides: {
                ...drafts.sides,
                personAssignment: nextPersonAssignment,
              },
            }
          : {}),
      })
      notify.success(
        `‘${organizationName}’ 소속 인물 ${members.length}명을 참여 인물에 반영했습니다 (신규 ${addedCount}명)`,
      )
    } catch (error) {
      notify.error(
        error instanceof Error
          ? error.message
          : '기관·조직 소속 인물을 불러오지 못했습니다',
      )
    }
  }

  return (
    <>
      {parentRecordsSlot && (
        <ParentImportBanner role="region" aria-label="상위 사건 기록 이어받기">
          <ParentImportBannerText>
            상위 사건 <strong>‘{parentRecordsSlot.parentTitle}’</strong>의 구도({parentRecordsSlot.summaryLabel})를 그대로 이어받을 수 있습니다.
          </ParentImportBannerText>
          <ParentImportButton
            type="button"
            aria-label="상위 사건 기록 불러오기"
            onClick={() => {
              playClickSound()
              parentRecordsSlot.onImport()
            }}
          >
            📥 상위 사건 기록 불러오기 ({parentRecordsSlot.summaryLabel})
          </ParentImportButton>
        </ParentImportBanner>
      )}

      {fieldFacets.includes('sides') && (
        <SidesField
          drafts={drafts}
          update={update}
          participants={participants}
          participantName={participantName}
          onOpenCountryModal={onOpenCountryModal}
          onImportOrgMembers={importOrganizationMembers}
          personContext={personContext}
          playClickSound={playClickSound}
        />
      )}

      {fieldFacets.includes('statehood') && (
        <StatehoodField
          participants={participants}
          participantName={participantName}
          onAdd={onAddCountryWithRole}
          onAssignRole={onAssignParticipantRole}
          onQuickAddCountryWithRole={onQuickAddCountryWithRole}
          availableCountries={availableCountries}
          availableHistoricalCountries={availableHistoricalCountries}
          onRemove={onRemoveParticipant}
          playClickSound={playClickSound}
        />
      )}

      {fieldFacets.includes('treaty') && (
        <TreatyField
          drafts={drafts}
          update={update}
          eventTitle={eventTitle}
          participantCount={participants.length}
          playClickSound={playClickSound}
          onPick={() => setPicker('treaty')}
        />
      )}

      {fieldFacets.includes('power') && (
        <PersonListField
          coreRecordKey="power"
          label="취임·즉위한 인물"
          people={drafts.power}
          onChange={(power) => update({ power })}
          onAdd={() => setPicker('power')}
          addLabel="인물 고르기"
          personContext={personContext}
          playClickSound={playClickSound}
        />
      )}

      {fieldFacets.includes('election') && (
        <S.FormRow data-core-record="election">
          <S.FormLabel as="span">
            선거<RecordOptionalTag>(선택)</RecordOptionalTag>
          </S.FormLabel>
          <S.FormField>
            {drafts.election && (
              <RowList>
                <OrgRow>
                  <PersonRowHeader>
                    <RowName>🗳️ {drafts.election.name}</RowName>
                    <PersonRowActions>
                      <KitAddButton
                        type="button"
                        onClick={() => setPicker('election')}
                      >
                        바꾸기
                      </KitAddButton>
                      <KitRemoveButton
                        type="button"
                        aria-label="선거 빼기"
                        onClick={() => update({ election: null })}
                      >
                        <FiX size={14} />
                      </KitRemoveButton>
                    </PersonRowActions>
                  </PersonRowHeader>
                </OrgRow>
              </RowList>
            )}
            <OrgActionRow>
              <QuickSearchAnchor
                onBlur={(blurEvent) => {
                  if (
                    !blurEvent.currentTarget.contains(
                      blurEvent.relatedTarget as Node | null,
                    )
                  ) {
                    setIsElectionQuickDismissed(true)
                  }
                }}
              >
                <QuickSearchInput
                  type="search"
                  aria-label="선거 빠른 검색"
                  placeholder="선거 이름 검색 후 Enter로 즉시 연결"
                  value={electionQuickQuery}
                  onFocus={() => setIsElectionQuickDismissed(false)}
                  onChange={(changeEvent) => {
                    setElectionQuickQuery(changeEvent.target.value)
                    setActiveElectionResultIndex(0)
                    setIsElectionQuickDismissed(false)
                  }}
                  onKeyDown={(keyEvent) => {
                    if (keyEvent.key === 'ArrowDown') {
                      if (quickElectionMatches.length > 0) {
                        keyEvent.preventDefault()
                        setIsElectionQuickDismissed(false)
                        setActiveElectionResultIndex(
                          (prev) => (prev + 1) % quickElectionMatches.length,
                        )
                      }
                    } else if (keyEvent.key === 'ArrowUp') {
                      if (quickElectionMatches.length > 0) {
                        keyEvent.preventDefault()
                        setIsElectionQuickDismissed(false)
                        setActiveElectionResultIndex(
                          (prev) =>
                            (prev - 1 + quickElectionMatches.length) %
                            quickElectionMatches.length,
                        )
                      }
                    } else if (keyEvent.key === 'Enter') {
                      if (quickElectionMatches.length > 0) {
                        keyEvent.preventDefault()
                        const target =
                          quickElectionMatches[
                            Math.min(
                              activeElectionResultIndex,
                              quickElectionMatches.length - 1,
                            )
                          ] ?? quickElectionMatches[0]
                        selectQuickElection(target)
                      }
                    } else if (
                      keyEvent.key === 'Escape' &&
                      electionQuickQuery
                    ) {
                      keyEvent.preventDefault()
                      setElectionQuickQuery('')
                      setActiveElectionResultIndex(0)
                    }
                  }}
                />
                {electionQuickQuery.trim() && !isElectionQuickDismissed && (
                  <QuickResultBox
                    role="region"
                    aria-label="선거 빠른 검색 결과"
                  >
                    {quickElectionMatches.length > 0 ? (
                      quickElectionMatches.map((electionMatch, electionIdx) => (
                        <QuickResultButton
                          key={electionMatch.id}
                          type="button"
                          $active={electionIdx === activeElectionResultIndex}
                          onMouseEnter={() =>
                            setActiveElectionResultIndex(electionIdx)
                          }
                          onClick={() => selectQuickElection(electionMatch)}
                        >
                          <QuickResultName>
                            + 🗳️ {electionMatch.name}
                          </QuickResultName>
                          {electionMatch.pollDate && (
                            <QuickResultMeta>
                              {electionMatch.pollDate.slice(0, 10)}
                            </QuickResultMeta>
                          )}
                        </QuickResultButton>
                      ))
                    ) : (
                      <QuickResultEmpty>
                        {electionQuickSearchQuery.isFetching
                          ? '선거 검색 중…'
                          : `‘${electionQuickQuery.trim()}’에 맞는 선거가 없습니다.`}
                      </QuickResultEmpty>
                    )}
                  </QuickResultBox>
                )}
              </QuickSearchAnchor>
              {!drafts.election && (
                <KitAddButton
                  type="button"
                  onClick={() => setPicker('election')}
                >
                  <FiPlus size={15} />
                  선거 고르기
                </KitAddButton>
              )}
            </OrgActionRow>
          </S.FormField>
        </S.FormRow>
      )}

      {showOrganizations && (
        <S.FormRow data-core-record="organizations">
          <S.FormLabel as="span">
            기업·조직<RecordOptionalTag>(선택)</RecordOptionalTag>
          </S.FormLabel>
          <S.FormField>
            {drafts.organizations.length > 0 && (
              <RowList>
                {drafts.organizations.map((organization) => {
                  const coreOrgRoles: ReadonlyArray<{
                    value: EventOrganizationRole
                    label: string
                    description: string
                  }> = [
                    {
                      value: 'PRINCIPAL',
                      label: '주체',
                      description: '사건을 일으키거나 이끈 조직',
                    },
                    {
                      value: 'PARTICIPANT',
                      label: '참여',
                      description: '사건에 함께한 조직',
                    },
                    {
                      value: 'FOUNDED',
                      label: '설립',
                      description: '이 사건으로 세워진 조직',
                    },
                    {
                      value: 'DISSOLVED',
                      label: '해산·폐업',
                      description: '이 사건으로 없어진 조직',
                    },
                    {
                      value: 'VICTIM',
                      label: '피해',
                      description: '사건으로 손해를 본 조직',
                    },
                  ]
                  const isCoreOrgRole = coreOrgRoles.some(
                    (roleOption) => roleOption.value === organization.role,
                  )
                  const activeOrgOption = ORGANIZATION_ROLE_OPTIONS.find(
                    (option) => option.value === organization.role,
                  )
                  return (
                    <OrgRow key={organization.id} $role={organization.role}>
                      <PersonRowHeader>
                        <RowName>{organization.name}</RowName>
                        <PersonRowActions>
                          {hasSides && (
                            <InlineSideGroup
                              role="group"
                              aria-label={`${organization.name} 진영 선택`}
                            >
                              {activeSideSlots.map((slot, slotIdx) => {
                                const isAssigned =
                                  drafts.sides.organizationAssignment?.[
                                    organization.id
                                  ] === slot
                                return (
                                  <InlineSideBtn
                                    key={slot}
                                    type="button"
                                    $active={isAssigned}
                                    aria-pressed={isAssigned}
                                    aria-label={`${organization.name} ${slotIdx + 1}편 토글`}
                                    onClick={() => {
                                      playClickSound()
                                      toggleOrgSideSlot(organization.id, slot)
                                    }}
                                  >
                                    {slotIdx + 1}편
                                  </InlineSideBtn>
                                )
                              })}
                            </InlineSideGroup>
                          )}
                          <SideNewGroupBtn
                            type="button"
                            title={`${organization.name} 소속 인물(위원·역할)을 참여 인물로 불러오기`}
                            aria-label={`${organization.name} 소속 인물 불러오기`}
                            onClick={() => {
                              playClickSound()
                              void importOrganizationMembers(
                                organization.id,
                                organization.name,
                              )
                            }}
                          >
                            👥 인물 불러오기
                          </SideNewGroupBtn>
                          <KitRemoveButton
                            type="button"
                            aria-label={`${organization.name} 빼기`}
                            onClick={() => {
                              const nextOrgs = drafts.organizations.filter(
                                (item) => item.id !== organization.id,
                              )
                              const currentOrgAssign =
                                drafts.sides.organizationAssignment
                              if (
                                currentOrgAssign &&
                                organization.id in currentOrgAssign
                              ) {
                                const nextOrgAssign = { ...currentOrgAssign }
                                delete nextOrgAssign[organization.id]
                                update({
                                  organizations: nextOrgs,
                                  sides: {
                                    ...drafts.sides,
                                    organizationAssignment: nextOrgAssign,
                                  },
                                })
                              } else {
                                update({ organizations: nextOrgs })
                              }
                            }}
                          >
                            <FiX size={14} />
                          </KitRemoveButton>
                        </PersonRowActions>
                      </PersonRowHeader>
                      <OrgRoleBar>
                        <OrgRoleLabel>역할</OrgRoleLabel>
                        <OrgRoleChipGroup
                          role="group"
                          aria-label={`${organization.name} 빠른 역할 선택`}
                        >
                          {coreOrgRoles.map((roleOption) => {
                            const isRoleActive =
                              organization.role === roleOption.value
                            return (
                              <OrgRoleChipBtn
                                key={roleOption.value}
                                type="button"
                                aria-pressed={isRoleActive}
                                aria-label={`${organization.name} 역할 ${roleOption.label} 선택`}
                                title={`${roleOption.label} — ${roleOption.description}`}
                                $active={isRoleActive}
                                onClick={() => {
                                  playClickSound()
                                  update({
                                    organizations: drafts.organizations.map(
                                      (item) =>
                                        item.id === organization.id
                                          ? { ...item, role: roleOption.value }
                                          : item,
                                    ),
                                  })
                                }}
                              >
                                {roleOption.label}
                              </OrgRoleChipBtn>
                            )
                          })}
                        </OrgRoleChipGroup>
                        <RowSelect
                          aria-label={`${organization.name}의 역할`}
                          value={organization.role}
                          $highlighted={!isCoreOrgRole}
                          onChange={(change) =>
                            update({
                              organizations: drafts.organizations.map((item) =>
                                item.id === organization.id
                                  ? {
                                      ...item,
                                      role: change.target
                                        .value as EventOrganizationRole,
                                    }
                                  : item,
                              ),
                            })
                          }
                        >
                          {ORGANIZATION_ROLE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </RowSelect>
                        {activeOrgOption?.description && (
                          <OrgRoleHintText>
                            {activeOrgOption.description}
                          </OrgRoleHintText>
                        )}
                      </OrgRoleBar>
                    </OrgRow>
                  )
                })}
              </RowList>
            )}
            <OrgActionRow>
              <QuickSearchAnchor
                onBlur={(blurEvent) => {
                  if (
                    !blurEvent.currentTarget.contains(
                      blurEvent.relatedTarget as Node | null,
                    )
                  ) {
                    setIsOrgQuickDismissed(true)
                  }
                }}
              >
                <QuickSearchInput
                  type="search"
                  aria-label="기업·조직 빠른 검색"
                  placeholder="기관·조직 이름 검색 후 Enter로 즉시 추가 (예: 공안위원회, 자코뱅)"
                  value={orgQuickQuery}
                  onFocus={() => setIsOrgQuickDismissed(false)}
                  onChange={(changeEvent) => {
                    setOrgQuickQuery(changeEvent.target.value)
                    setActiveOrgResultIndex(0)
                    setIsOrgQuickDismissed(false)
                  }}
                  onKeyDown={(keyEvent) => {
                    if (keyEvent.key === 'ArrowDown') {
                      if (quickOrgMatches.length > 0) {
                        keyEvent.preventDefault()
                        setIsOrgQuickDismissed(false)
                        setActiveOrgResultIndex(
                          (prev) => (prev + 1) % quickOrgMatches.length,
                        )
                      }
                    } else if (keyEvent.key === 'ArrowUp') {
                      if (quickOrgMatches.length > 0) {
                        keyEvent.preventDefault()
                        setIsOrgQuickDismissed(false)
                        setActiveOrgResultIndex(
                          (prev) =>
                            (prev - 1 + quickOrgMatches.length) %
                            quickOrgMatches.length,
                        )
                      }
                    } else if (keyEvent.key === 'Enter') {
                      if (quickOrgMatches.length > 0) {
                        keyEvent.preventDefault()
                        const target =
                          quickOrgMatches[
                            Math.min(
                              activeOrgResultIndex,
                              quickOrgMatches.length - 1,
                            )
                          ] ?? quickOrgMatches[0]
                        addQuickOrganization(target)
                      }
                    } else if (keyEvent.key === 'Escape' && orgQuickQuery) {
                      keyEvent.preventDefault()
                      setOrgQuickQuery('')
                      setActiveOrgResultIndex(0)
                    }
                  }}
                />
                {orgQuickQuery.trim() && !isOrgQuickDismissed && (
                  <QuickResultBox
                    role="region"
                    aria-label="기업·조직 빠른 검색 결과"
                  >
                    {quickOrgMatches.length > 0 ? (
                      quickOrgMatches.map((orgMatch, orgIdx) => (
                        <QuickResultButton
                          key={orgMatch.id}
                          type="button"
                          $active={orgIdx === activeOrgResultIndex}
                          onMouseEnter={() => setActiveOrgResultIndex(orgIdx)}
                          onClick={() => addQuickOrganization(orgMatch)}
                        >
                          <QuickResultName>+ 🏢 {orgMatch.name}</QuickResultName>
                          {orgMatch.shortName && (
                            <QuickResultMeta>{orgMatch.shortName}</QuickResultMeta>
                          )}
                        </QuickResultButton>
                      ))
                    ) : (
                      <QuickResultEmpty>
                        {orgQuickSearchQuery.isFetching
                          ? '조직 검색 중…'
                          : `‘${orgQuickQuery.trim()}’에 맞는 기관·조직이 없습니다.`}
                      </QuickResultEmpty>
                    )}
                    <QuickResultCreateButton
                      type="button"
                      onClick={() => {
                        playClickSound()
                        setCreatingOrgInitialName(orgQuickQuery.trim())
                        setCreatingOrgOpen(true)
                        setOrgQuickQuery('')
                      }}
                    >
                      + ‘{orgQuickQuery.trim()}’ 새 기관·조직으로 빠른 등록
                    </QuickResultCreateButton>
                  </QuickResultBox>
                )}
              </QuickSearchAnchor>
              <KitAddButton type="button" onClick={() => setPicker('organizations')}>
                <FiPlus size={15} />
                {drafts.organizations.length > 0 ? '조직 더 추가' : '기업·조직 고르기'}
              </KitAddButton>
              <KitAddButton
                type="button"
                aria-label="새 기관·조직 등록"
                onClick={() => {
                  playClickSound()
                  setCreatingOrgInitialName('')
                  setCreatingOrgOpen(true)
                }}
              >
                <FiPlus size={15} />
                새 기관·조직 등록
              </KitAddButton>
            </OrgActionRow>
            {suggestedOrganizations.length > 0 && (
              <PersonSuggestionBar role="group" aria-label="참여국 추천 조직">
                <OrgRoleLabel>추천 조직</OrgRoleLabel>
                {(isOrgSuggestionsExpanded
                  ? suggestedOrganizations
                  : suggestedOrganizations.slice(0, 3)
                ).map((candidate) => (
                  <PersonRolePresetChip
                    key={candidate.id}
                    type="button"
                    onClick={() => addQuickOrganization(candidate)}
                  >
                    + 🏢 {candidate.name}
                  </PersonRolePresetChip>
                ))}
                {suggestedOrganizations.length > 3 && (
                  <SuggestionMoreChip
                    type="button"
                    aria-label={
                      isOrgSuggestionsExpanded
                        ? '추천 조직 접기'
                        : `추천 조직 ${suggestedOrganizations.length - 3}건 더 보기`
                    }
                    onClick={() => {
                      playClickSound()
                      setIsOrgSuggestionsExpanded((previous) => !previous)
                    }}
                  >
                    {isOrgSuggestionsExpanded
                      ? '접기'
                      : `+${suggestedOrganizations.length - 3} 더 보기`}
                  </SuggestionMoreChip>
                )}
              </PersonSuggestionBar>
            )}
          </S.FormField>
        </S.FormRow>
      )}

      {showPersons && (
        <PersonListField
          coreRecordKey="persons"
          label="참여 인물"
          people={drafts.persons}
          onChange={(persons) => {
            const currentPersonAssign = drafts.sides.personAssignment
            if (currentPersonAssign) {
              const keptIds = new Set(persons.map((item) => item.personId))
              const nextPersonAssign: Record<string, SideSlot> = {}
              for (const [pid, assignedSlot] of Object.entries(currentPersonAssign)) {
                if (keptIds.has(pid)) nextPersonAssign[pid] = assignedSlot
              }
              update({
                persons,
                sides: {
                  ...drafts.sides,
                  personAssignment: nextPersonAssign,
                },
              })
            } else {
              update({ persons })
            }
          }}
          onAdd={() => setPicker('persons')}
          addLabel={drafts.persons.length > 0 ? '인물 더 추가' : '인물 고르기'}
          withRole
          personContext={personContext}
          playClickSound={playClickSound}
          sideAssignment={
            hasSides
              ? {
                  activeSlots: activeSideSlots,
                  assignedByPersonId: drafts.sides.personAssignment ?? {},
                  onToggleSlot: togglePersonSideSlot,
                }
              : undefined
          }
        />
      )}

      {(canExpandOrganizations || canExpandPersons) && (
        <S.FormRow>
          <S.FormLabel as="span">
            추가 기록<RecordOptionalTag>(선택)</RecordOptionalTag>
          </S.FormLabel>
          <S.FormField>
            <OrgActionRow>
              {canExpandOrganizations && (
                <KitAddButton
                  type="button"
                  onClick={() => {
                    playClickSound()
                    setExpandedOptional((prev) => [...prev, 'organizations'])
                  }}
                >
                  <FiPlus size={15} />
                  기관·조직·기업 추가 (공안위원회·의회 등)
                </KitAddButton>
              )}
              {canExpandPersons && (
                <KitAddButton
                  type="button"
                  onClick={() => {
                    playClickSound()
                    setExpandedOptional((prev) => [...prev, 'persons'])
                  }}
                >
                  <FiPlus size={15} />
                  참여 인물 추가
                </KitAddButton>
              )}
            </OrgActionRow>
          </S.FormField>
        </S.FormRow>
      )}

      {creatingOrgOpen && (
        <OrganizationQuickCreateModal
          defaultName={creatingOrgInitialName || undefined}
          defaultCountryId={defaultCountryId}
          defaultHistoricalCountryId={defaultHistoricalCountryId}
          candidatePersons={drafts.persons.map((person) => ({
            id: person.personId,
            name: person.name,
            role: person.role,
          }))}
          onClose={() => {
            setCreatingOrgOpen(false)
            setCreatingOrgInitialName('')
          }}
          onCreated={(created, initialMembers) => {
            setCreatingOrgOpen(false)
            setCreatingOrgInitialName('')
            const nextOrgs = drafts.organizations.some(
              (item) => item.id === created.id,
            )
              ? drafts.organizations
              : [
                  ...drafts.organizations,
                  { id: created.id, name: created.name, role: 'PRINCIPAL' as const },
                ]
            const existingPersonIds = new Set(
              drafts.persons.map((person) => person.personId),
            )
            const nextPersons = [...drafts.persons]
            for (const member of initialMembers ?? []) {
              if (!existingPersonIds.has(member.id)) {
                existingPersonIds.add(member.id)
                nextPersons.push({
                  personId: member.id,
                  name: member.name,
                  role: member.roleTitle,
                })
              }
            }
            update({
              organizations: nextOrgs,
              ...(nextPersons.length !== drafts.persons.length
                ? { persons: nextPersons }
                : {}),
            })
          }}
        />
      )}

      <RecordPickers
        kind={picker}
        onClose={() => setPicker(null)}
        drafts={drafts}
        update={update}
        personContext={personContext}
        defaultCountryId={defaultCountryId}
      />
    </>
  )
}

// ─── 진영 ───────────────────────────────────────────────────────────────

function SidesField({
  drafts,
  update,
  participants,
  participantName,
  onOpenCountryModal: _onOpenCountryModal,
  onImportOrgMembers,
  personContext,
  playClickSound,
}: {
  drafts: RegisterFacetDrafts
  update: (patch: Partial<RegisterFacetDrafts>) => void
  participants: EventCountryParticipant[]
  participantName: (row: EventCountryParticipant) => string
  onOpenCountryModal?: () => void
  onImportOrgMembers: (
    organizationId: string,
    organizationName: string,
    overrideSlot?: SideSlot,
  ) => Promise<void>
  personContext?: PersonPickerContext
  playClickSound: () => void
}) {
  const {
    names,
    assignment,
    personGroupIds,
    personAssignment,
    organizationAssignment,
    ...restSides
  } = drafts.sides
  const [creatingGroupSlot, setCreatingGroupSlot] = useState<SideSlot | null>(null)
  const [slotQuickQueries, setSlotQuickQueries] = useState<
    Partial<Record<SideSlot, string>>
  >({})
  const [openSlotQuick, setOpenSlotQuick] = useState<SideSlot | null>(null)
  const [activeSlotResultIndex, setActiveSlotResultIndex] = useState(0)

  const allPersonsQuery = useQuery({
    queryKey: ['persons', 'all'],
    queryFn: () => getAllPersons().catch(() => [] as PersonResponseDto[]),
    enabled: openSlotQuick !== null,
    staleTime: 30_000,
  })
  const allOrgsQuery = useQuery({
    queryKey: ['organizations', 'all-for-quick-search'],
    queryFn: () =>
      getOrganizations(nestiaApiService.getConnection()).catch(() => []),
    enabled: openSlotQuick !== null,
    staleTime: 30_000,
  })

  const groupsQuery = useQuery({
    queryKey: ['person-groups-all', 'for-event-sides'],
    queryFn: () => listPersonGroups().catch(() => [] as PersonGroup[]),
    staleTime: 30_000,
  })

  const sortedGroups = useMemo(() => {
    const all = groupsQuery.data ?? []
    const countryIds = new Set(
      participants.map((row) => row.countryId).filter((val): val is string => Boolean(val)),
    )
    const histCountryIds = new Set(
      participants
        .map((row) => row.historicalCountryId)
        .filter((val): val is string => Boolean(val)),
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
  }, [groupsQuery.data, participants])

  const activeSlots = SIDE_SLOTS.slice(
    0,
    Math.min(SIDE_SLOTS.length, Math.max(2, names.length)),
  )

  const placeholderOf = (slot: SideSlot) => {
    const first = participants.find((row) => assignment[participantKey(row)] === slot)
    if (first && participants.length >= 2) return `${participantName(first)} 측`
    if (slot === 'A') return '진영 1 (예: 산악파·연합군)'
    if (slot === 'B') return '진영 2 (예: 지롱드파·추축국)'
    if (slot === 'C') return '진영 3 (예: 평원파·제3세력)'
    return '진영 4'
  }

  const buildNextSides = (
    patch: Partial<RegisterFacetDrafts['sides']>,
  ): RegisterFacetDrafts['sides'] => {
    const merged = {
      ...restSides,
      names,
      assignment,
      ...(personGroupIds ? { personGroupIds } : {}),
      ...(personAssignment ? { personAssignment } : {}),
      ...(organizationAssignment ? { organizationAssignment } : {}),
      ...patch,
    }
    return merged
  }

  const setSlot = (key: string, slot: SideSlot | null) => {
    const next = { ...assignment }
    if (slot) next[key] = slot
    else delete next[key]
    update({ sides: buildNextSides({ assignment: next }) })
  }

  const setPersonSlot = (personId: string, slot: SideSlot | null) => {
    const next = { ...(personAssignment ?? {}) }
    if (slot) next[personId] = slot
    else delete next[personId]
    update({ sides: buildNextSides({ personAssignment: next }) })
  }

  const setOrgSlot = (orgId: string, slot: SideSlot | null) => {
    const next = { ...(organizationAssignment ?? {}) }
    if (slot) next[orgId] = slot
    else delete next[orgId]
    update({ sides: buildNextSides({ organizationAssignment: next }) })
  }

  const addSideSlot = () => {
    if (activeSlots.length >= SIDE_SLOTS.length) return
    const nextNames = [...names]
    while (nextNames.length < activeSlots.length + 1) nextNames.push('')
    update({ sides: buildNextSides({ names: nextNames }) })
  }

  const removeSideSlot = (slotToRemove: SideSlot) => {
    const removeIdx = SIDE_SLOTS.indexOf(slotToRemove)
    if (removeIdx < 2) return
    const nextNames = names.filter((_, idx) => idx !== removeIdx)
    const nextGroupIds = personGroupIds
      ? personGroupIds.filter((_, idx) => idx !== removeIdx)
      : undefined
    const remapRecord = (
      record: Record<string, SideSlot> | undefined,
    ): Record<string, SideSlot> => {
      const cleaned: Record<string, SideSlot> = {}
      for (const [itemKey, assignedSlot] of Object.entries(record ?? {})) {
        const assignedIdx = SIDE_SLOTS.indexOf(assignedSlot)
        if (assignedIdx === removeIdx) continue
        const mappedSlot =
          assignedIdx > removeIdx
            ? SIDE_SLOTS[assignedIdx - 1]
            : assignedSlot
        if (mappedSlot) cleaned[itemKey] = mappedSlot
      }
      return cleaned
    }
    update({
      sides: buildNextSides({
        names: nextNames,
        ...(nextGroupIds ? { personGroupIds: nextGroupIds } : {}),
        assignment: remapRecord(assignment),
        ...(personAssignment
          ? { personAssignment: remapRecord(personAssignment) }
          : {}),
        ...(organizationAssignment
          ? { organizationAssignment: remapRecord(organizationAssignment) }
          : {}),
      }),
    })
  }

  const applyPersonGroupToSlot = async (
    slot: SideSlot,
    group: PersonGroup | null,
  ) => {
    const index = SIDE_SLOTS.indexOf(slot)
    const nextGroupIds: Array<string | null> = Array.from(
      { length: activeSlots.length },
      (_, idx) => personGroupIds?.[idx] ?? null,
    )
    nextGroupIds[index] = group?.id ?? null
    const nextNames: string[] = [...names]
    while (nextNames.length <= index) nextNames.push('')
    if (group && (!nextNames[index].trim() || personGroupIds?.[index])) {
      nextNames[index] = group.name
    }

    if (!group) {
      update({
        sides: buildNextSides({
          names: nextNames,
          personGroupIds: nextGroupIds,
        }),
      })
      return
    }

    try {
      const detailed =
        group.members && group.members.length > 0
          ? group
          : await getPersonGroup(group.id)
      const existingPersonIds = new Set(drafts.persons.map((person) => person.personId))
      const addedPersons: PickedPerson[] = [...drafts.persons]
      const nextPersonAssignment: Record<string, SideSlot> = {
        ...(personAssignment ?? {}),
      }
      for (const member of detailed.members ?? []) {
        const pid = member.person.id
        const displayName = getPersonDisplayName(member.person, true)
        if (!existingPersonIds.has(pid)) {
          existingPersonIds.add(pid)
          addedPersons.push({
            personId: pid,
            name: displayName,
            role: member.roleLabel ?? undefined,
          })
        }
        nextPersonAssignment[pid] = slot
      }
      update({
        persons: addedPersons,
        sides: buildNextSides({
          names: nextNames,
          personGroupIds: nextGroupIds,
          ...(Object.keys(nextPersonAssignment).length > 0
            ? { personAssignment: nextPersonAssignment }
            : {}),
        }),
      })
    } catch {
      update({
        sides: buildNextSides({
          names: nextNames,
          personGroupIds: nextGroupIds,
        }),
      })
    }
  }

  const swapFirstTwoSides = () => {
    const nextNames = [...names]
    while (nextNames.length < 2) nextNames.push('')
    const firstName = nextNames[0] ?? ''
    nextNames[0] = nextNames[1] ?? ''
    nextNames[1] = firstName

    const nextGroupIds = personGroupIds ? [...personGroupIds] : undefined
    if (nextGroupIds) {
      while (nextGroupIds.length < 2) nextGroupIds.push(null)
      const firstGroupId = nextGroupIds[0] ?? null
      nextGroupIds[0] = nextGroupIds[1] ?? null
      nextGroupIds[1] = firstGroupId
    }

    const swapRecord = (
      record: Record<string, SideSlot> | undefined,
    ): Record<string, SideSlot> => {
      const nextRecord: Record<string, SideSlot> = {}
      for (const [itemKey, assignedSlot] of Object.entries(record ?? {})) {
        if (assignedSlot === 'A') nextRecord[itemKey] = 'B'
        else if (assignedSlot === 'B') nextRecord[itemKey] = 'A'
        else nextRecord[itemKey] = assignedSlot
      }
      return nextRecord
    }

    update({
      sides: buildNextSides({
        names: nextNames,
        ...(nextGroupIds ? { personGroupIds: nextGroupIds } : {}),
        assignment: swapRecord(assignment),
        ...(personAssignment
          ? { personAssignment: swapRecord(personAssignment) }
          : {}),
        ...(organizationAssignment
          ? { organizationAssignment: swapRecord(organizationAssignment) }
          : {}),
      }),
    })
  }

  type SlotQuickCandidate =
    | {
        kind: 'person'
        id: string
        name: string
        subtitle?: string
        alreadyInEvent: boolean
      }
    | {
        kind: 'organization'
        id: string
        name: string
        subtitle?: string
        alreadyInEvent: boolean
      }

  const getSlotQuickCandidates = (slot: SideSlot): SlotQuickCandidate[] => {
    const queryText = (slotQuickQueries[slot] ?? '').trim().toLowerCase()
    if (!queryText) return []

    const eventPersonMap = new Map(
      drafts.persons.map((person) => [person.personId, person]),
    )
    const eventOrgMap = new Map(drafts.organizations.map((org) => [org.id, org]))

    const personMatches: SlotQuickCandidate[] = []
    const matchedPersons = (allPersonsQuery.data ?? [])
      .filter(
        (person) =>
          personAssignment?.[person.id] !== slot &&
          matchesQuery(searchHaystack(person), queryText),
      )
      .sort(
        comparePersons(personContext ? 'relevance' : 'name', personContext),
      )
    for (const person of matchedPersons) {
      const displayName = getPersonDisplayName(person, true)
      const subtitleParts = [
        lifeSpanLabel(person),
        headlineOffice(person),
      ].filter(Boolean)
      personMatches.push({
        kind: 'person',
        id: person.id,
        name: displayName,
        subtitle: subtitleParts.join(' · ') || undefined,
        alreadyInEvent: eventPersonMap.has(person.id),
      })
      if (personMatches.length >= 4) break
    }

    const orgMatches: SlotQuickCandidate[] = []
    for (const org of allOrgsQuery.data ?? []) {
      if (organizationAssignment?.[org.id] === slot) continue
      const matches =
        org.name.toLowerCase().includes(queryText) ||
        (org.shortName ?? '').toLowerCase().includes(queryText)
      if (!matches) continue
      orgMatches.push({
        kind: 'organization',
        id: org.id,
        name: org.name,
        subtitle: org.country?.name ?? undefined,
        alreadyInEvent: eventOrgMap.has(org.id),
      })
      if (orgMatches.length >= 3) break
    }

    const sortedPersons = [...personMatches].sort((left, right) => {
      if (left.alreadyInEvent !== right.alreadyInEvent) {
        return left.alreadyInEvent ? -1 : 1
      }
      return 0
    })

    return [...sortedPersons, ...orgMatches].slice(0, 6)
  }

  const assignQuickCandidateToSlot = (
    slot: SideSlot,
    candidate: SlotQuickCandidate,
  ) => {
    playClickSound()
    if (candidate.kind === 'person') {
      const exists = drafts.persons.some(
        (person) => person.personId === candidate.id,
      )
      const nextPersons = exists
        ? drafts.persons
        : [...drafts.persons, { personId: candidate.id, name: candidate.name }]
      const nextPersonAssignment = {
        ...(personAssignment ?? {}),
        [candidate.id]: slot,
      }
      update({
        persons: nextPersons,
        sides: buildNextSides({ personAssignment: nextPersonAssignment }),
      })
    } else {
      const exists = drafts.organizations.some((org) => org.id === candidate.id)
      const nextOrgs = exists
        ? drafts.organizations
        : [
            ...drafts.organizations,
            {
              id: candidate.id,
              name: candidate.name,
              role: 'PRINCIPAL' as const,
            },
          ]
      const nextOrgAssignment = {
        ...(organizationAssignment ?? {}),
        [candidate.id]: slot,
      }
      update({
        organizations: nextOrgs,
        sides: buildNextSides({ organizationAssignment: nextOrgAssignment }),
      })
    }
    setSlotQuickQueries((prev) => ({ ...prev, [slot]: '' }))
    setOpenSlotQuick(null)
    setActiveSlotResultIndex(0)
  }

  type DraggedSideMember = {
    kind: 'country' | 'person' | 'organization'
    key: string
    fromSlot: SideSlot | null
  }
  const [draggedMember, setDraggedMember] = useState<DraggedSideMember | null>(null)
  const [dragOverTarget, setDragOverTarget] = useState<SideSlot | 'UNASSIGNED' | null>(null)

  const encodeDragPayload = (member: DraggedSideMember): string =>
    `${member.kind}:${member.key}`

  const decodeDragPayload = (raw: string): DraggedSideMember | null => {
    const colonIdx = raw.indexOf(':')
    if (colonIdx <= 0) return null
    const kind = raw.slice(0, colonIdx)
    const key = raw.slice(colonIdx + 1)
    if (!key) return null
    if (kind === 'country' || kind === 'person' || kind === 'organization') {
      return { kind, key, fromSlot: null }
    }
    return null
  }

  const applyMemberDrop = (
    member: DraggedSideMember,
    targetSlot: SideSlot | null,
  ) => {
    playClickSound()
    if (member.kind === 'country') {
      setSlot(member.key, targetSlot)
    } else if (member.kind === 'person') {
      setPersonSlot(member.key, targetSlot)
    } else {
      setOrgSlot(member.key, targetSlot)
    }
    setDraggedMember(null)
    setDragOverTarget(null)
  }

  const handleDropToTarget = (
    dragEvent: React.DragEvent<HTMLElement>,
    targetSlot: SideSlot | null,
  ) => {
    dragEvent.preventDefault()
    const payload =
      draggedMember ??
      decodeDragPayload(dragEvent.dataTransfer?.getData('text/plain') ?? '')
    if (!payload) {
      setDragOverTarget(null)
      return
    }
    applyMemberDrop(payload, targetSlot)
  }

  const canSuggest =
    participants.length >= 2 &&
    participants.some((row) =>
      ['INITIATOR', 'ALLY', 'TARGET', 'ADVERSARY', 'VICTIM'].includes(row.role ?? ''),
    )
  const unassigned = participants.filter((row) => !assignment[participantKey(row)])
  const unassignedPersons = drafts.persons.filter(
    (person) => !personAssignment?.[person.personId],
  )
  const unassignedOrgs = drafts.organizations.filter(
    (org) => !organizationAssignment?.[org.id],
  )
  const defaultCountryId = participants.find((row) => row.countryId)?.countryId ?? undefined
  const defaultHistoricalCountryId =
    participants.find((row) => row.historicalCountryId)?.historicalCountryId ?? undefined

  const sideStats = activeSlots.map((slot, index) => {
    const countryCount = participants.filter(
      (row) => assignment[participantKey(row)] === slot,
    ).length
    const personCount = drafts.persons.filter(
      (person) => personAssignment?.[person.personId] === slot,
    ).length
    const orgCount = drafts.organizations.filter(
      (org) => organizationAssignment?.[org.id] === slot,
    ).length
    const total = countryCount + personCount + orgCount
    const displayName =
      (names[index] ?? '').trim() ||
      placeholderOf(slot).replace(/\s*\(.*\)$/, '')
    const breakdownParts = [
      countryCount > 0 ? `국가 ${countryCount}` : '',
      personCount > 0 ? `인물 ${personCount}` : '',
      orgCount > 0 ? `조직 ${orgCount}` : '',
    ].filter(Boolean)
    return {
      slot,
      index,
      displayName,
      countryCount,
      personCount,
      orgCount,
      total,
      breakdownLabel:
        breakdownParts.length > 0 ? breakdownParts.join(' · ') : '미배정',
    }
  })
  const totalAssignedAcrossSides = sideStats.reduce(
    (acc, stat) => acc + stat.total,
    0,
  )

  return (
    <S.FormRow data-core-record="sides">
      <S.FormLabel as="span">
        진영<RecordOptionalTag>(선택)</RecordOptionalTag>
      </S.FormLabel>
      <S.FormField>
        {activeSlots.length >= 2 && (
          <SidesVsBanner role="region" aria-label="진영 대결 구도 인포그래픽">
            <SidesVsTopRow>
              <SidesVsTeamsWrap>
                {sideStats.map((stat, statIndex) => (
                  <Fragment key={stat.slot}>
                    {statIndex > 0 && <SidesVsBadge aria-hidden>VS</SidesVsBadge>}
                    <SidesVsTeamItem>
                      <SidesVsTeamDot $slot={stat.slot} />
                      <SidesVsTeamName>{stat.displayName}</SidesVsTeamName>
                      <SidesVsTeamMeta>({stat.breakdownLabel})</SidesVsTeamMeta>
                    </SidesVsTeamItem>
                  </Fragment>
                ))}
              </SidesVsTeamsWrap>
              <SidesVsDragHint>
                ⠿ 국가·인물·조직 칩을 드래그하여 진영 이동
              </SidesVsDragHint>
            </SidesVsTopRow>
            <SidesVsGaugeTrack aria-hidden>
              {sideStats.map((stat) => {
                const weight =
                  totalAssignedAcrossSides > 0 ? Math.max(stat.total, 0.25) : 1
                return (
                  <SidesVsGaugeSegment
                    key={stat.slot}
                    $slot={stat.slot}
                    $empty={stat.total === 0}
                    style={{ flexGrow: weight }}
                  />
                )
              })}
            </SidesVsGaugeTrack>
          </SidesVsBanner>
        )}
        <SideBoardGrid>
          {activeSlots.map((slot, index) => {
            const members = participants.filter(
              (row) => assignment[participantKey(row)] === slot,
            )
            const personMembers = drafts.persons.filter(
              (person) => personAssignment?.[person.personId] === slot,
            )
            const orgMembers = drafts.organizations.filter(
              (org) => organizationAssignment?.[org.id] === slot,
            )
            const linkedGroupId = personGroupIds?.[index] ?? ''
            const linkedGroup = sortedGroups.find((group) => group.id === linkedGroupId)
            const nextIdx = (index + 1) % activeSlots.length
            const otherSlot: SideSlot = activeSlots[nextIdx] ?? 'A'
            const otherNumber = nextIdx + 1
            const totalAssigned =
              members.length + personMembers.length + orgMembers.length

            return (
              <SideCard
                key={slot}
                $slot={slot}
                $dragOver={dragOverTarget === slot}
                data-side-dropzone={slot}
                onDragOver={(dragEvent) => {
                  dragEvent.preventDefault()
                  if (dragOverTarget !== slot) setDragOverTarget(slot)
                }}
                onDragLeave={(dragEvent) => {
                  if (
                    !dragEvent.currentTarget.contains(
                      dragEvent.relatedTarget as Node | null,
                    )
                  ) {
                    setDragOverTarget((current) =>
                      current === slot ? null : current,
                    )
                  }
                }}
                onDrop={(dragEvent) => handleDropToTarget(dragEvent, slot)}
              >
                <SideCardHeaderRow>
                  <SideSlotBadge $slot={slot}>{index + 1}편</SideSlotBadge>
                  <SideNameInput
                    style={{ flex: 1, minWidth: 0 }}
                    aria-label={`${index + 1}번 진영 이름`}
                    placeholder={placeholderOf(slot)}
                    value={names[index] ?? ''}
                    onChange={(change) => {
                      const next: string[] = [...names]
                      while (next.length <= index) next.push('')
                      next[index] = change.target.value
                      update({ sides: buildNextSides({ names: next }) })
                    }}
                  />
                  {index >= 2 && (
                    <KitRemoveButton
                      type="button"
                      title={`${index + 1}번 진영 제거`}
                      aria-label={`${index + 1}번 진영 제거`}
                      onClick={() => {
                        playClickSound()
                        removeSideSlot(slot)
                      }}
                    >
                      <FiX size={14} />
                    </KitRemoveButton>
                  )}
                </SideCardHeaderRow>
                <SideFactionRow>
                  {linkedGroupId ? (
                    <LinkedFactionBadge>
                      <span>계파: {linkedGroup?.name ?? names[index]}</span>
                      <KitRemoveButton
                        type="button"
                        aria-label={`${index + 1}번 진영 계파 연결 해제`}
                        onClick={() => {
                          playClickSound()
                          void applyPersonGroupToSlot(slot, null)
                        }}
                      >
                        <FiX size={12} />
                      </KitRemoveButton>
                    </LinkedFactionBadge>
                  ) : (
                    <>
                      <SideGroupSelect
                        aria-label={`${index + 1}번 진영 계파 불러오기`}
                        value=""
                        onChange={(change) => {
                          const picked = sortedGroups.find(
                            (group) => group.id === change.target.value,
                          )
                          if (picked) {
                            playClickSound()
                            void applyPersonGroupToSlot(slot, picked)
                          }
                        }}
                      >
                        <option value="">영구 집단·계파 불러오기…</option>
                        {sortedGroups.map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.name}
                            {group.historicalCountryName
                              ? ` (${group.historicalCountryName})`
                              : group.countryName
                                ? ` (${group.countryName})`
                                : ''}
                          </option>
                        ))}
                      </SideGroupSelect>
                      <SideNewGroupBtn
                        type="button"
                        aria-label={`${index + 1}번 진영 새 계파 등록`}
                        onClick={() => {
                          playClickSound()
                          setCreatingGroupSlot(slot)
                        }}
                      >
                        <FiPlus size={12} /> 새 계파 등록
                      </SideNewGroupBtn>
                    </>
                  )}
                </SideFactionRow>
                <SideMemberWrap aria-label={`${index + 1}번 진영 소속 국가`}>
                  {totalAssigned === 0 ? (
                    <SideEmptyHint>
                      {unassigned.length +
                        unassignedPersons.length +
                        unassignedOrgs.length >
                      0
                        ? `아래 미배정 국가·인물에서 +${index + 1}편 선택`
                        : `진영 이름을 입력하거나 계파·인물·국가를 배정하세요`}
                    </SideEmptyHint>
                  ) : (
                    <>
                      {members.map((row) => {
                        const key = participantKey(row)
                        const name = participantName(row)
                        const dragPayload: DraggedSideMember = {
                          kind: 'country',
                          key,
                          fromSlot: slot,
                        }
                        return (
                          <SideMemberChip
                            key={key}
                            draggable
                            title="드래그하여 다른 진영이나 미배정으로 이동"
                            onDragStart={(dragEvent) => {
                              setDraggedMember(dragPayload)
                              dragEvent.dataTransfer?.setData(
                                'text/plain',
                                encodeDragPayload(dragPayload),
                              )
                            }}
                            onDragEnd={() => {
                              setDraggedMember(null)
                              setDragOverTarget(null)
                            }}
                          >
                            <SideMemberName>{name}</SideMemberName>
                            <SideMemberSwitch
                              type="button"
                              title={`${otherNumber}번 진영으로 이동`}
                              aria-label={`${name} ${otherNumber}번 진영으로 이동`}
                              onClick={() => {
                                playClickSound()
                                setSlot(key, otherSlot)
                              }}
                            >
                              →{otherNumber}편
                            </SideMemberSwitch>
                            <KitRemoveButton
                              type="button"
                              aria-label={`${name} 진영 배정 해제`}
                              onClick={() => {
                                playClickSound()
                                setSlot(key, null)
                              }}
                            >
                              <FiX size={13} />
                            </KitRemoveButton>
                          </SideMemberChip>
                        )
                      })}
                      {personMembers.map((person) => {
                        const dragPayload: DraggedSideMember = {
                          kind: 'person',
                          key: person.personId,
                          fromSlot: slot,
                        }
                        return (
                          <SideMemberChip
                            key={`p:${person.personId}`}
                            draggable
                            title="드래그하여 다른 진영이나 미배정으로 이동"
                            onDragStart={(dragEvent) => {
                              setDraggedMember(dragPayload)
                              dragEvent.dataTransfer?.setData(
                                'text/plain',
                                encodeDragPayload(dragPayload),
                              )
                            }}
                            onDragEnd={() => {
                              setDraggedMember(null)
                              setDragOverTarget(null)
                            }}
                          >
                            <SideMemberName>👤 {person.name}</SideMemberName>
                            <SideMemberSwitch
                              type="button"
                              title={`${otherNumber}번 진영으로 이동`}
                              aria-label={`${person.name} ${otherNumber}번 진영으로 이동`}
                              onClick={() => {
                                playClickSound()
                                setPersonSlot(person.personId, otherSlot)
                              }}
                            >
                              →{otherNumber}편
                            </SideMemberSwitch>
                            <KitRemoveButton
                              type="button"
                              aria-label={`${person.name} 진영 배정 해제`}
                              onClick={() => {
                                playClickSound()
                                setPersonSlot(person.personId, null)
                              }}
                            >
                              <FiX size={13} />
                            </KitRemoveButton>
                          </SideMemberChip>
                        )
                      })}
                      {orgMembers.map((org) => {
                        const dragPayload: DraggedSideMember = {
                          kind: 'organization',
                          key: org.id,
                          fromSlot: slot,
                        }
                        return (
                          <SideMemberChip
                            key={`o:${org.id}`}
                            draggable
                            title="드래그하여 다른 진영이나 미배정으로 이동"
                            onDragStart={(dragEvent) => {
                              setDraggedMember(dragPayload)
                              dragEvent.dataTransfer?.setData(
                                'text/plain',
                                encodeDragPayload(dragPayload),
                              )
                            }}
                            onDragEnd={() => {
                              setDraggedMember(null)
                              setDragOverTarget(null)
                            }}
                          >
                            <SideMemberName>🏢 {org.name}</SideMemberName>
                            <SideMemberSwitch
                              type="button"
                              title={`${org.name} 소속 인물(위원·역할)을 이 진영으로 불러오기`}
                              aria-label={`${org.name} 소속 인물 불러오기`}
                              onClick={() => {
                                playClickSound()
                                void onImportOrgMembers(org.id, org.name, slot)
                              }}
                            >
                              👥인물
                            </SideMemberSwitch>
                            <SideMemberSwitch
                              type="button"
                              title={`${otherNumber}번 진영으로 이동`}
                              aria-label={`${org.name} ${otherNumber}번 진영으로 이동`}
                              onClick={() => {
                                playClickSound()
                                setOrgSlot(org.id, otherSlot)
                              }}
                            >
                              →{otherNumber}편
                            </SideMemberSwitch>
                            <KitRemoveButton
                              type="button"
                              aria-label={`${org.name} 진영 배정 해제`}
                              onClick={() => {
                                playClickSound()
                                setOrgSlot(org.id, null)
                              }}
                            >
                              <FiX size={13} />
                            </KitRemoveButton>
                          </SideMemberChip>
                        )
                      })}
                    </>
                  )}
                </SideMemberWrap>
                <SideQuickSearchWrap>
                  <SideQuickInput
                    type="text"
                    aria-label={`${index + 1}번 진영 인물·조직 빠른 추가`}
                    placeholder={`+ ${index + 1}편에 인물·조직 바로 검색·추가…`}
                    value={slotQuickQueries[slot] ?? ''}
                    onFocus={() => {
                      setOpenSlotQuick(slot)
                      setActiveSlotResultIndex(0)
                    }}
                    onBlur={() => {
                      window.setTimeout(() => {
                        setOpenSlotQuick((current) =>
                          current === slot ? null : current,
                        )
                      }, 120)
                    }}
                    onChange={(change) => {
                      setSlotQuickQueries((prev) => ({
                        ...prev,
                        [slot]: change.target.value,
                      }))
                      setOpenSlotQuick(slot)
                      setActiveSlotResultIndex(0)
                    }}
                    onKeyDown={(keyEvent) => {
                      const candidates = getSlotQuickCandidates(slot)
                      if (keyEvent.key === 'ArrowDown') {
                        if (candidates.length === 0) return
                        keyEvent.preventDefault()
                        setActiveSlotResultIndex(
                          (prev) => (prev + 1) % candidates.length,
                        )
                      } else if (keyEvent.key === 'ArrowUp') {
                        if (candidates.length === 0) return
                        keyEvent.preventDefault()
                        setActiveSlotResultIndex(
                          (prev) =>
                            (prev - 1 + candidates.length) % candidates.length,
                        )
                      } else if (
                        keyEvent.key === 'Enter' &&
                        !keyEvent.nativeEvent.isComposing
                      ) {
                        const target =
                          candidates[activeSlotResultIndex] ?? candidates[0]
                        if (target) {
                          keyEvent.preventDefault()
                          assignQuickCandidateToSlot(slot, target)
                        }
                      } else if (keyEvent.key === 'Escape') {
                        setOpenSlotQuick(null)
                      }
                    }}
                  />
                  {openSlotQuick === slot &&
                    Boolean((slotQuickQueries[slot] ?? '').trim()) && (
                      <QuickResultBox
                        role="listbox"
                        aria-label={`${index + 1}번 진영 빠른 추가 후보`}
                      >
                        {getSlotQuickCandidates(slot).length === 0 ? (
                          <QuickResultEmpty>
                            일치하는 인물·조직이 없습니다
                          </QuickResultEmpty>
                        ) : (
                          getSlotQuickCandidates(slot).map(
                            (candidate, candIdx) => (
                              <QuickResultButton
                                key={`${candidate.kind}:${candidate.id}`}
                                type="button"
                                role="option"
                                aria-selected={
                                  candIdx === activeSlotResultIndex
                                }
                                $active={candIdx === activeSlotResultIndex}
                                onMouseDown={(mouseEvent) => {
                                  mouseEvent.preventDefault()
                                  assignQuickCandidateToSlot(slot, candidate)
                                }}
                              >
                                <QuickResultName>
                                  {candidate.kind === 'person' ? '👤 ' : '🏢 '}
                                  {candidate.name}
                                </QuickResultName>
                                {candidate.subtitle && (
                                  <QuickResultMeta>
                                    {candidate.subtitle}
                                  </QuickResultMeta>
                                )}
                              </QuickResultButton>
                            ),
                          )
                        )}
                      </QuickResultBox>
                    )}
                </SideQuickSearchWrap>
              </SideCard>
            )
          })}
        </SideBoardGrid>
        {unassigned.length > 0 && (
          <UnassignedBar
            role="group"
            aria-label="미배정 참여국"
            $dragOver={dragOverTarget === 'UNASSIGNED'}
            onDragOver={(dragEvent) => {
              dragEvent.preventDefault()
              if (dragOverTarget !== 'UNASSIGNED') {
                setDragOverTarget('UNASSIGNED')
              }
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
            onDrop={(dragEvent) => handleDropToTarget(dragEvent, null)}
          >
            <UnassignedLabel>미배정 ({unassigned.length})</UnassignedLabel>
            {unassigned.map((row) => {
              const key = participantKey(row)
              const name = participantName(row)
              const dragPayload: DraggedSideMember = {
                kind: 'country',
                key,
                fromSlot: null,
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
                      encodeDragPayload(dragPayload),
                    )
                  }}
                  onDragEnd={() => {
                    setDraggedMember(null)
                    setDragOverTarget(null)
                  }}
                >
                  <UnassignedName>{name}</UnassignedName>
                  {activeSlots.map((slot, slotIdx) => (
                    <UnassignedAssignButton
                      key={slot}
                      type="button"
                      aria-label={`${name} ${slotIdx + 1}번 진영 배정`}
                      onClick={() => {
                        playClickSound()
                        setSlot(key, slot)
                      }}
                    >
                      +{slotIdx + 1}편
                    </UnassignedAssignButton>
                  ))}
                </UnassignedChip>
              )
            })}
          </UnassignedBar>
        )}
        {unassignedPersons.length > 0 && (
          <UnassignedBar
            role="group"
            aria-label="미배정 인물"
            $dragOver={dragOverTarget === 'UNASSIGNED'}
            onDragOver={(dragEvent) => {
              dragEvent.preventDefault()
              if (dragOverTarget !== 'UNASSIGNED') {
                setDragOverTarget('UNASSIGNED')
              }
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
            onDrop={(dragEvent) => handleDropToTarget(dragEvent, null)}
          >
            <UnassignedLabel>
              미배정 인물 ({unassignedPersons.length})
            </UnassignedLabel>
            {unassignedPersons.map((person) => {
              const dragPayload: DraggedSideMember = {
                kind: 'person',
                key: person.personId,
                fromSlot: null,
              }
              return (
                <UnassignedChip
                  key={person.personId}
                  draggable
                  title="원하는 진영 카드로 드래그하여 배정"
                  onDragStart={(dragEvent) => {
                    setDraggedMember(dragPayload)
                    dragEvent.dataTransfer?.setData(
                      'text/plain',
                      encodeDragPayload(dragPayload),
                    )
                  }}
                  onDragEnd={() => {
                    setDraggedMember(null)
                    setDragOverTarget(null)
                  }}
                >
                  <UnassignedName>👤 {person.name}</UnassignedName>
                  {activeSlots.map((slot, slotIdx) => (
                    <UnassignedAssignButton
                      key={slot}
                      type="button"
                      aria-label={`${person.name} ${slotIdx + 1}번 진영 배정`}
                      onClick={() => {
                        playClickSound()
                        setPersonSlot(person.personId, slot)
                      }}
                    >
                      +{slotIdx + 1}편
                    </UnassignedAssignButton>
                  ))}
                </UnassignedChip>
              )
            })}
          </UnassignedBar>
        )}
        {unassignedOrgs.length > 0 && (
          <UnassignedBar
            role="group"
            aria-label="미배정 조직"
            $dragOver={dragOverTarget === 'UNASSIGNED'}
            onDragOver={(dragEvent) => {
              dragEvent.preventDefault()
              if (dragOverTarget !== 'UNASSIGNED') {
                setDragOverTarget('UNASSIGNED')
              }
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
            onDrop={(dragEvent) => handleDropToTarget(dragEvent, null)}
          >
            <UnassignedLabel>
              미배정 조직 ({unassignedOrgs.length})
            </UnassignedLabel>
            {unassignedOrgs.map((org) => {
              const dragPayload: DraggedSideMember = {
                kind: 'organization',
                key: org.id,
                fromSlot: null,
              }
              return (
                <UnassignedChip
                  key={org.id}
                  draggable
                  title="원하는 진영 카드로 드래그하여 배정"
                  onDragStart={(dragEvent) => {
                    setDraggedMember(dragPayload)
                    dragEvent.dataTransfer?.setData(
                      'text/plain',
                      encodeDragPayload(dragPayload),
                    )
                  }}
                  onDragEnd={() => {
                    setDraggedMember(null)
                    setDragOverTarget(null)
                  }}
                >
                  <UnassignedName>🏢 {org.name}</UnassignedName>
                  {activeSlots.map((slot, slotIdx) => (
                    <UnassignedAssignButton
                      key={slot}
                      type="button"
                      aria-label={`${org.name} ${slotIdx + 1}번 진영 배정`}
                      onClick={() => {
                        playClickSound()
                        setOrgSlot(org.id, slot)
                      }}
                    >
                      +{slotIdx + 1}편
                    </UnassignedAssignButton>
                  ))}
                </UnassignedChip>
              )
            })}
          </UnassignedBar>
        )}
        {draggedMember &&
          draggedMember.fromSlot !== null &&
          unassigned.length +
            unassignedPersons.length +
            unassignedOrgs.length ===
            0 && (
            <UnassignedBar
              role="group"
              aria-label="진영 배정 해제 드롭 영역"
              $dragOver={dragOverTarget === 'UNASSIGNED'}
              onDragOver={(dragEvent) => {
                dragEvent.preventDefault()
                if (dragOverTarget !== 'UNASSIGNED') {
                  setDragOverTarget('UNASSIGNED')
                }
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
              onDrop={(dragEvent) => handleDropToTarget(dragEvent, null)}
            >
              <UnassignedLabel>
                여기에 놓으면 진영 배정이 해제됩니다
              </UnassignedLabel>
            </UnassignedBar>
          )}
        <SidesFooterRow>
          {activeSlots.length < SIDE_SLOTS.length && (
            <TextButton
              type="button"
              aria-label={`${activeSlots.length + 1}번 진영 추가`}
              onClick={() => {
                playClickSound()
                addSideSlot()
              }}
            >
              + 진영 추가 ({activeSlots.length + 1}편 — 다자 구도)
            </TextButton>
          )}
          <TextButton
            type="button"
            aria-label="1번·2번 진영 맞바꾸기"
            onClick={() => {
              playClickSound()
              swapFirstTwoSides()
            }}
          >
            ⇄ 1편 ↔ 2편 맞바꾸기
          </TextButton>
          {canSuggest && (
            <TextButton
              type="button"
              onClick={() =>
                update({
                  sides: buildNextSides({
                    assignment: suggestSideAssignment(participants, assignment),
                  }),
                })
              }
            >
              참여국 역할로 나누기 (주도·동맹 / 대상·적대·피해)
            </TextButton>
          )}
        </SidesFooterRow>
        {creatingGroupSlot && (
          <PersonGroupCreateModal
            defaultType="FACTION"
            defaultName={names[SIDE_SLOTS.indexOf(creatingGroupSlot)] ?? ''}
            defaultCountryId={defaultCountryId}
            defaultHistoricalCountryId={defaultHistoricalCountryId}
            defaultMembers={drafts.persons
              .filter(
                (person) =>
                  personAssignment?.[person.personId] === creatingGroupSlot,
              )
              .map((person) => ({ id: person.personId, name: person.name }))}
            candidatePersons={drafts.persons.map((person) => ({
              id: person.personId,
              name: person.name,
            }))}
            onClose={() => setCreatingGroupSlot(null)}
            onCreated={(createdGroup) => {
              const targetSlot = creatingGroupSlot
              setCreatingGroupSlot(null)
              void applyPersonGroupToSlot(targetSlot, createdGroup)
            }}
          />
        )}
      </S.FormField>
    </S.FormRow>
  )
}

// ─── 성립·소멸 ───────────────────────────────────────────────────────────

function StatehoodField({
  participants,
  participantName,
  onAdd,
  onAssignRole,
  onQuickAddCountryWithRole,
  availableCountries = [],
  availableHistoricalCountries = [],
  onRemove,
  playClickSound,
}: {
  participants: EventCountryParticipant[]
  participantName: (row: EventCountryParticipant) => string
  onAdd: (role: 'FOUNDED' | 'DISSOLVED') => void
  onAssignRole?: (key: string, role: 'FOUNDED' | 'DISSOLVED') => void
  onQuickAddCountryWithRole?: (
    target: { countryId?: string; historicalCountryId?: string },
    role: 'FOUNDED' | 'DISSOLVED',
  ) => void
  availableCountries?: Array<{ id: string; name: string }>
  availableHistoricalCountries?: Array<{
    id: string
    name: string
    foundedYear?: number | null
    dissolvedYear?: number | null
  }>
  onRemove: (key: string) => void
  playClickSound: () => void
}) {
  const [slotQueries, setSlotQueries] = useState<{
    FOUNDED: string
    DISSOLVED: string
  }>({ FOUNDED: '', DISSOLVED: '' })
  const [openRoleSlot, setOpenRoleSlot] = useState<'FOUNDED' | 'DISSOLVED' | null>(null)
  const [activeCandidateIdx, setActiveCandidateIdx] = useState(0)

  const slots: Array<{ role: 'FOUNDED' | 'DISSOLVED'; label: string; add: string }> = [
    { role: 'FOUNDED', label: '세워진 나라', add: '세워진 나라 고르기' },
    { role: 'DISSOLVED', label: '무너진 나라', add: '무너진 나라 고르기' },
  ]
  const unassigned = participants.filter((row) => row.role !== 'FOUNDED' && row.role !== 'DISSOLVED')

  const getRoleQuickCandidates = (role: 'FOUNDED' | 'DISSOLVED') => {
    const needle = (slotQueries[role] ?? '').trim().toLowerCase()
    if (!needle) return []
    const alreadyInRoleKeys = new Set(
      participants
        .filter((row) => row.role === role)
        .map((row) => participantKey(row)),
    )
    const seenKeys = new Set<string>()
    const results: Array<{
      key: string
      label: string
      meta?: string
      countryId?: string
      historicalCountryId?: string
      isExistingParticipant: boolean
    }> = []

    for (const row of participants) {
      const key = participantKey(row)
      if (alreadyInRoleKeys.has(key) || seenKeys.has(key)) continue
      const label = participantName(row)
      if (!label || !label.toLowerCase().includes(needle)) continue
      seenKeys.add(key)
      results.push({
        key,
        label,
        meta: '참여국',
        countryId: row.countryId ?? undefined,
        historicalCountryId: row.historicalCountryId ?? undefined,
        isExistingParticipant: true,
      })
    }

    for (const histCountry of availableHistoricalCountries) {
      const key = `h:${histCountry.id}`
      if (alreadyInRoleKeys.has(key) || seenKeys.has(key)) continue
      if (!histCountry.name.toLowerCase().includes(needle)) continue
      seenKeys.add(key)
      results.push({
        key,
        label: histCountry.name,
        meta: '역사국가',
        historicalCountryId: histCountry.id,
        isExistingParticipant: participants.some(
          (row) => participantKey(row) === key,
        ),
      })
    }

    for (const modernCountry of availableCountries) {
      const key = `m:${modernCountry.id}`
      if (alreadyInRoleKeys.has(key) || seenKeys.has(key)) continue
      if (!modernCountry.name.toLowerCase().includes(needle)) continue
      seenKeys.add(key)
      results.push({
        key,
        label: modernCountry.name,
        meta: '현대국가',
        countryId: modernCountry.id,
        isExistingParticipant: participants.some(
          (row) => participantKey(row) === key,
        ),
      })
    }

    return results.slice(0, 6)
  }

  const pickRoleCandidate = (
    role: 'FOUNDED' | 'DISSOLVED',
    candidate: {
      key: string
      countryId?: string
      historicalCountryId?: string
      isExistingParticipant: boolean
    },
  ) => {
    playClickSound()
    if (candidate.isExistingParticipant && onAssignRole) {
      onAssignRole(candidate.key, role)
    } else if (onQuickAddCountryWithRole) {
      onQuickAddCountryWithRole(
        {
          countryId: candidate.countryId,
          historicalCountryId: candidate.historicalCountryId,
        },
        role,
      )
    } else if (onAssignRole) {
      onAssignRole(candidate.key, role)
    }
    setSlotQueries((prev) => ({ ...prev, [role]: '' }))
    setOpenRoleSlot(null)
    setActiveCandidateIdx(0)
  }

  return (
    <S.FormRow data-core-record="statehood">
      <S.FormLabel as="span">
        성립·소멸<RecordOptionalTag>(선택)</RecordOptionalTag>
      </S.FormLabel>
      <S.FormField>
        <StatehoodGrid>
          {slots.map((slot) => {
            const rows = participants.filter((row) => row.role === slot.role)
            const candidates = getRoleQuickCandidates(slot.role)
            return (
              <StatehoodCard key={slot.role} $role={slot.role}>
                <SlotLabel>{slot.label}</SlotLabel>
                <KitSelectedItems>
                  {rows.map((row) => (
                    <KitSelectedItem key={participantKey(row)}>
                      <span>{participantName(row)}</span>
                      <KitRemoveButton
                        type="button"
                        aria-label={`${participantName(row)} 빼기`}
                        onClick={() => onRemove(participantKey(row))}
                      >
                        <FiX size={14} />
                      </KitRemoveButton>
                    </KitSelectedItem>
                  ))}
                  <KitAddButton
                    type="button"
                    onClick={() => {
                      playClickSound()
                      onAdd(slot.role)
                    }}
                  >
                    <FiPlus size={15} />
                    {slot.add}
                  </KitAddButton>
                </KitSelectedItems>
                <SideQuickSearchWrap>
                  <SideQuickInput
                    type="text"
                    aria-label={`${slot.label} 빠른 검색`}
                    placeholder={`+ ${slot.label} 이름 검색·추가…`}
                    value={slotQueries[slot.role] ?? ''}
                    onFocus={() => {
                      setOpenRoleSlot(slot.role)
                      setActiveCandidateIdx(0)
                    }}
                    onBlur={() => {
                      window.setTimeout(() => {
                        setOpenRoleSlot((current) =>
                          current === slot.role ? null : current,
                        )
                      }, 120)
                    }}
                    onChange={(changeEvent) => {
                      setSlotQueries((prev) => ({
                        ...prev,
                        [slot.role]: changeEvent.target.value,
                      }))
                      setOpenRoleSlot(slot.role)
                      setActiveCandidateIdx(0)
                    }}
                    onKeyDown={(keyEvent) => {
                      if (keyEvent.key === 'ArrowDown') {
                        if (candidates.length === 0) return
                        keyEvent.preventDefault()
                        setActiveCandidateIdx(
                          (prev) => (prev + 1) % candidates.length,
                        )
                      } else if (keyEvent.key === 'ArrowUp') {
                        if (candidates.length === 0) return
                        keyEvent.preventDefault()
                        setActiveCandidateIdx(
                          (prev) =>
                            (prev - 1 + candidates.length) % candidates.length,
                        )
                      } else if (
                        keyEvent.key === 'Enter' &&
                        !keyEvent.nativeEvent.isComposing
                      ) {
                        const target =
                          candidates[activeCandidateIdx] ?? candidates[0]
                        if (target) {
                          keyEvent.preventDefault()
                          pickRoleCandidate(slot.role, target)
                        }
                      } else if (keyEvent.key === 'Escape') {
                        setOpenRoleSlot(null)
                      }
                    }}
                  />
                  {openRoleSlot === slot.role &&
                    Boolean((slotQueries[slot.role] ?? '').trim()) && (
                      <QuickResultBox
                        role="listbox"
                        aria-label={`${slot.label} 빠른 검색 결과`}
                      >
                        {candidates.length === 0 ? (
                          <QuickResultEmpty>
                            일치하는 국가가 없습니다
                          </QuickResultEmpty>
                        ) : (
                          candidates.map((candidate, candIdx) => (
                            <QuickResultButton
                              key={candidate.key}
                              type="button"
                              role="option"
                              aria-selected={candIdx === activeCandidateIdx}
                              $active={candIdx === activeCandidateIdx}
                              onMouseDown={(mouseEvent) => {
                                mouseEvent.preventDefault()
                                pickRoleCandidate(slot.role, candidate)
                              }}
                            >
                              <QuickResultName>
                                + {candidate.label}
                              </QuickResultName>
                              {candidate.meta && (
                                <QuickResultMeta>
                                  {candidate.meta}
                                </QuickResultMeta>
                              )}
                            </QuickResultButton>
                          ))
                        )}
                      </QuickResultBox>
                    )}
                </SideQuickSearchWrap>
              </StatehoodCard>
            )
          })}
        </StatehoodGrid>
        {onAssignRole && unassigned.length > 0 && (
          <UnassignedBar role="group" aria-label="성립·소멸 미지정 참여국">
            <UnassignedLabel>참여국에서 지정</UnassignedLabel>
            {unassigned.map((row) => {
              const key = participantKey(row)
              const name = participantName(row)
              return (
                <UnassignedChip key={key}>
                  <UnassignedName>{name}</UnassignedName>
                  <UnassignedAssignButton
                    type="button"
                    aria-label={`${name} 세워진 나라로 지정`}
                    onClick={() => {
                      playClickSound()
                      onAssignRole(key, 'FOUNDED')
                    }}
                  >
                    +세워진
                  </UnassignedAssignButton>
                  <UnassignedAssignButton
                    type="button"
                    aria-label={`${name} 무너진 나라로 지정`}
                    onClick={() => {
                      playClickSound()
                      onAssignRole(key, 'DISSOLVED')
                    }}
                  >
                    +무너진
                  </UnassignedAssignButton>
                </UnassignedChip>
              )
            })}
          </UnassignedBar>
        )}
      </S.FormField>
    </S.FormRow>
  )
}

// ─── 조약 ────────────────────────────────────────────────────────────────

function TreatyField({
  drafts,
  update,
  eventTitle,
  participantCount = 0,
  playClickSound,
  onPick,
}: {
  drafts: RegisterFacetDrafts
  update: (patch: Partial<RegisterFacetDrafts>) => void
  eventTitle: string
  participantCount?: number
  playClickSound?: () => void
  onPick: () => void
}) {
  const treaty = drafts.treaty
  const suggested = treatyNameFromEventTitle(eventTitle.trim())
  const [quickQuery, setQuickQuery] = useState('')
  const [activeResultIndex, setActiveResultIndex] = useState(0)
  const [isQuickDismissed, setIsQuickDismissed] = useState(false)

  const treatyQuickSearchQuery = useQuery({
    queryKey: ['treaties', 'quick-search', quickQuery.trim()],
    queryFn: () =>
      treatyApi.getAll({ search: quickQuery.trim() || undefined, take: 20 }),
    enabled: quickQuery.trim().length >= 1,
    staleTime: 60_000,
  })

  const quickTreatyMatches = useMemo(() => {
    const needle = quickQuery.trim().toLowerCase()
    if (!needle) return []
    const currentLinkedId =
      treaty.mode === 'link' ? treaty.treatyId : undefined
    return (treatyQuickSearchQuery.data?.items ?? [])
      .filter(
        (item) =>
          item.id !== currentLinkedId &&
          item.name.toLowerCase().includes(needle),
      )
      .slice(0, 6)
  }, [quickQuery, treatyQuickSearchQuery.data, treaty])

  const selectQuickTreaty = (item: { id: string; name: string }) => {
    playClickSound?.()
    update({
      treaty: { mode: 'link', treatyId: item.id, treatyName: item.name },
    })
    setQuickQuery('')
    setActiveResultIndex(0)
  }

  return (
    /* data-core-record — 세부 안내의 '맺어진 조약'을 누르면 여기로 온다(event-type-field) */
    <S.FormRow data-core-record="treaty">
      <S.FormLabel as="span">
        맺어진 조약<RecordOptionalTag>(선택)</RecordOptionalTag>
      </S.FormLabel>
      <S.FormField>
        <KitChipGroup role="radiogroup" aria-label="조약 기록 방법">
          {(
            [
              ['create', '이 사건으로 새 조약 만들기'],
              ['link', '이미 있는 조약 잇기'],
              ['none', '나중에'],
            ] as const
          ).map(([mode, label]) => (
            <KitChoiceChip
              key={mode}
              type="button"
              role="radio"
              aria-checked={treaty.mode === mode}
              $selected={treaty.mode === mode}
              onClick={() => {
                if (mode === 'create') update({ treaty: { mode: 'create', name: '' } })
                else if (mode === 'link') onPick()
                else update({ treaty: { mode: 'none' } })
              }}
            >
              {label}
            </KitChoiceChip>
          ))}
        </KitChipGroup>
        {treaty.mode === 'create' && (
          <TreatyCard>
            <TreatyCreateHeader>
              <S.Input
                aria-label="새 조약 이름"
                placeholder={
                  suggested
                    ? `${suggested} (비워 두면 사건명으로 자동 생성)`
                    : '조약 이름 (비워 두면 사건명으로 자동 생성)'
                }
                value={treaty.name}
                onChange={(change) =>
                  update({
                    treaty: { mode: 'create', name: change.target.value },
                  })
                }
              />
              {suggested && treaty.name.trim() !== suggested && (
                <TreatySuggestBtn
                  type="button"
                  aria-label="추천 조약명 채우기"
                  onClick={() => {
                    playClickSound?.()
                    update({ treaty: { mode: 'create', name: suggested } })
                  }}
                >
                  + 추천 조약명 채우기 ({suggested})
                </TreatySuggestBtn>
              )}
            </TreatyCreateHeader>
            <TreatyMetaHint>
              {participantCount > 0
                ? `참여국 ${participantCount}곳이 서명국으로 함께 등록됩니다`
                : '참여국을 추가하면 서명국으로 함께 등록됩니다'}
            </TreatyMetaHint>
          </TreatyCard>
        )}
        {treaty.mode === 'link' && (
          <TreatyCard>
            <PersonRowHeader>
              <RowName>📜 {treaty.treatyName}</RowName>
              <PersonRowActions>
                <KitAddButton type="button" onClick={onPick}>
                  바꾸기
                </KitAddButton>
                <KitRemoveButton
                  type="button"
                  aria-label="조약 빼기"
                  onClick={() => update({ treaty: { mode: 'none' } })}
                >
                  <FiX size={14} />
                </KitRemoveButton>
              </PersonRowActions>
            </PersonRowHeader>
          </TreatyCard>
        )}
        {treaty.mode !== 'create' && (
          <OrgActionRow style={{ marginTop: 8 }}>
            <QuickSearchAnchor
              onBlur={(blurEvent) => {
                if (
                  !blurEvent.currentTarget.contains(
                    blurEvent.relatedTarget as Node | null,
                  )
                ) {
                  setIsQuickDismissed(true)
                }
              }}
            >
              <QuickSearchInput
                type="search"
                aria-label="조약 빠른 검색"
                placeholder="기존 조약 이름 검색 후 Enter로 즉시 연결 (예: 베르사유 조약)"
                value={quickQuery}
                onFocus={() => setIsQuickDismissed(false)}
                onChange={(changeEvent) => {
                  setQuickQuery(changeEvent.target.value)
                  setActiveResultIndex(0)
                  setIsQuickDismissed(false)
                }}
                onKeyDown={(keyEvent) => {
                  if (keyEvent.key === 'ArrowDown') {
                    if (quickTreatyMatches.length > 0) {
                      keyEvent.preventDefault()
                      setIsQuickDismissed(false)
                      setActiveResultIndex(
                        (prev) => (prev + 1) % quickTreatyMatches.length,
                      )
                    }
                  } else if (keyEvent.key === 'ArrowUp') {
                    if (quickTreatyMatches.length > 0) {
                      keyEvent.preventDefault()
                      setIsQuickDismissed(false)
                      setActiveResultIndex(
                        (prev) =>
                          (prev - 1 + quickTreatyMatches.length) %
                          quickTreatyMatches.length,
                      )
                    }
                  } else if (keyEvent.key === 'Enter') {
                    if (quickTreatyMatches.length > 0) {
                      keyEvent.preventDefault()
                      const target =
                        quickTreatyMatches[
                          Math.min(
                            activeResultIndex,
                            quickTreatyMatches.length - 1,
                          )
                        ] ?? quickTreatyMatches[0]
                      selectQuickTreaty(target)
                    }
                  } else if (keyEvent.key === 'Escape' && quickQuery) {
                    keyEvent.preventDefault()
                    setQuickQuery('')
                    setActiveResultIndex(0)
                  }
                }}
              />
              {quickQuery.trim() && !isQuickDismissed && (
                <QuickResultBox
                  role="region"
                  aria-label="조약 빠른 검색 결과"
                >
                  {quickTreatyMatches.length > 0 ? (
                    quickTreatyMatches.map((treatyMatch, treatyIdx) => (
                      <QuickResultButton
                        key={treatyMatch.id}
                        type="button"
                        $active={treatyIdx === activeResultIndex}
                        onMouseEnter={() => setActiveResultIndex(treatyIdx)}
                        onClick={() => selectQuickTreaty(treatyMatch)}
                      >
                        <QuickResultName>
                          + 📜 {treatyMatch.name}
                        </QuickResultName>
                        {treatyMatch.signDate && (
                          <QuickResultMeta>
                            {treatyMatch.signDate.slice(0, 10)}
                          </QuickResultMeta>
                        )}
                      </QuickResultButton>
                    ))
                  ) : (
                    <QuickResultEmpty>
                      {treatyQuickSearchQuery.isFetching
                        ? '조약 검색 중…'
                        : `‘${quickQuery.trim()}’에 맞는 조약이 없습니다.`}
                    </QuickResultEmpty>
                  )}
                </QuickResultBox>
              )}
            </QuickSearchAnchor>
          </OrgActionRow>
        )}
      </S.FormField>
    </S.FormRow>
  )
}

// ─── 인물 ────────────────────────────────────────────────────────────────

function PersonListField({
  coreRecordKey,
  label,
  people,
  onChange,
  onAdd,
  addLabel,
  withRole = false,
  personContext,
  playClickSound,
  sideAssignment,
}: {
  coreRecordKey?: string
  label: string
  people: PickedPerson[]
  onChange: (next: PickedPerson[]) => void
  onAdd: () => void
  addLabel: string
  withRole?: boolean
  personContext?: PersonPickerContext
  playClickSound?: () => void
  sideAssignment?: {
    activeSlots: SideSlot[]
    assignedByPersonId: Record<string, SideSlot>
    onToggleSlot: (personId: string, slot: SideSlot) => void
  }
}) {
  const [quickQuery, setQuickQuery] = useState('')
  const [activeResultIndex, setActiveResultIndex] = useState(0)
  const [isQuickDismissed, setIsQuickDismissed] = useState(false)
  const [focusedPersonRoleId, setFocusedPersonRoleId] = useState<string | null>(
    null,
  )
  const [isPersonSuggestionsExpanded, setIsPersonSuggestionsExpanded] =
    useState(false)
  const [draggingPersonId, setDraggingPersonId] = useState<string | null>(null)
  const [dragOverPersonId, setDragOverPersonId] = useState<string | null>(null)

  const handlePersonDrop = (
    dragEvent: React.DragEvent<HTMLDivElement>,
    targetPersonId: string,
  ) => {
    dragEvent.preventDefault()
    const rawData = dragEvent.dataTransfer?.getData('text/plain') ?? ''
    const sourcePersonId =
      draggingPersonId ||
      (rawData.startsWith('person-order:')
        ? rawData.slice('person-order:'.length)
        : '')
    setDraggingPersonId(null)
    setDragOverPersonId(null)
    if (!sourcePersonId || sourcePersonId === targetPersonId) return
    const fromIdx = people.findIndex(
      (item) => item.personId === sourcePersonId,
    )
    const toIdx = people.findIndex((item) => item.personId === targetPersonId)
    if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return
    playClickSound?.()
    const reordered = [...people]
    const [moved] = reordered.splice(fromIdx, 1)
    if (!moved) return
    reordered.splice(toIdx, 0, moved)
    onChange(reordered)
  }

  const personsQuery = useQuery({
    queryKey: ['persons', 'all'],
    queryFn: getAllPersons,
    enabled:
      personContext?.fromYear != null || quickQuery.trim().length >= 1,
    staleTime: 5 * 60_000,
  })

  const contextualPersonSuggestions = useMemo<PersonResponseDto[]>(() => {
    if (!personContext) return []
    const existingIds = new Set(people.map((item) => item.personId))
    return (personsQuery.data ?? [])
      .filter((person) => {
        if (existingIds.has(person.id)) return false
        const score = contextScore(person, personContext)
        if (score <= 0) return false
        if (personContext.fromYear != null) {
          const span = lifeSpanOf(person)
          if ((span.from !== null || span.to !== null) && score < 2) {
            return false
          }
        }
        return true
      })
      .sort(comparePersons('relevance', personContext))
      .slice(0, 6)
  }, [personContext, personsQuery.data, people])

  const quickPersonMatches = useMemo<PersonResponseDto[]>(() => {
    const needle = quickQuery.trim()
    if (!needle) return []
    const existingIds = new Set(people.map((item) => item.personId))
    return (personsQuery.data ?? [])
      .filter(
        (person) =>
          !existingIds.has(person.id) &&
          matchesQuery(searchHaystack(person), needle),
      )
      .sort(comparePersons(personContext ? 'relevance' : 'name', personContext))
      .slice(0, 6)
  }, [quickQuery, personsQuery.data, people, personContext])

  const addQuickPerson = (person: PersonResponseDto) => {
    if (people.some((item) => item.personId === person.id)) return
    playClickSound?.()
    const displayName = getPersonDisplayName(person)
    onChange([...people, { personId: person.id, name: displayName }])
    setQuickQuery('')
    setActiveResultIndex(0)
  }

  return (
    <S.FormRow data-core-record={coreRecordKey}>
      <S.FormLabel as="span">
        {label}
        <RecordOptionalTag>(선택)</RecordOptionalTag>
      </S.FormLabel>
      <S.FormField>
        {people.length > 0 && (
          <RowList>
            {people.map((person) => (
              <Row
                key={person.personId}
                $role={person.role}
                $dragOver={dragOverPersonId === person.personId}
                draggable={people.length > 1}
                onDragStart={(dragEvent) => {
                  setDraggingPersonId(person.personId)
                  dragEvent.dataTransfer?.setData(
                    'text/plain',
                    `person-order:${person.personId}`,
                  )
                }}
                onDragOver={(dragEvent) => {
                  if (people.length <= 1) return
                  dragEvent.preventDefault()
                  if (dragOverPersonId !== person.personId) {
                    setDragOverPersonId(person.personId)
                  }
                }}
                onDragLeave={(dragEvent) => {
                  if (
                    !dragEvent.currentTarget.contains(
                      dragEvent.relatedTarget as Node | null,
                    )
                  ) {
                    setDragOverPersonId((current) =>
                      current === person.personId ? null : current,
                    )
                  }
                }}
                onDrop={(dragEvent) =>
                  handlePersonDrop(dragEvent, person.personId)
                }
                onDragEnd={() => {
                  setDraggingPersonId(null)
                  setDragOverPersonId(null)
                }}
              >
                <PersonRowHeader>
                  <RowNameWrap>
                    {people.length > 1 && (
                      <PersonDragHandle
                        aria-hidden
                        title="드래그하여 인물 순서 변경"
                      >
                        ⠿
                      </PersonDragHandle>
                    )}
                    <RowName>{person.name}</RowName>
                  </RowNameWrap>
                  <PersonRowActions>
                    {sideAssignment && (
                      <InlineSideGroup
                        role="group"
                        aria-label={`${person.name} 진영 선택`}
                      >
                        {sideAssignment.activeSlots.map((slot, slotIdx) => {
                          const isAssigned =
                            sideAssignment.assignedByPersonId[
                              person.personId
                            ] === slot
                          return (
                            <InlineSideBtn
                              key={slot}
                              type="button"
                              $active={isAssigned}
                              aria-pressed={isAssigned}
                              aria-label={`${person.name} ${slotIdx + 1}편 토글`}
                              onClick={() => {
                                playClickSound?.()
                                sideAssignment.onToggleSlot(
                                  person.personId,
                                  slot,
                                )
                              }}
                            >
                              {slotIdx + 1}편
                            </InlineSideBtn>
                          )
                        })}
                      </InlineSideGroup>
                    )}
                    <KitRemoveButton
                      type="button"
                      aria-label={`${person.name} 빼기`}
                      onClick={() =>
                        onChange(
                          people.filter(
                            (item) => item.personId !== person.personId,
                          ),
                        )
                      }
                    >
                      <FiX size={14} />
                    </KitRemoveButton>
                  </PersonRowActions>
                </PersonRowHeader>
                {withRole && (
                  <RowRoleWrap
                    onBlur={(blurEvent) => {
                      if (
                        !blurEvent.currentTarget.contains(
                          blurEvent.relatedTarget as Node | null,
                        )
                      ) {
                        setFocusedPersonRoleId((previous) =>
                          previous === person.personId ? null : previous,
                        )
                      }
                    }}
                  >
                    <RowRoleTextarea
                      aria-label={`${person.name}이(가) 한 일`}
                      placeholder="이 사건에서 한 일 (선택 · 줄바꿈 가능)"
                      rows={Math.min(
                        5,
                        Math.max(
                          1,
                          (person.role ?? '').split('\n').length,
                          (person.role ?? '').length > 48 ? 2 : 1,
                        ),
                      )}
                      value={person.role ?? ''}
                      onFocus={() => setFocusedPersonRoleId(person.personId)}
                      onChange={(change) =>
                        onChange(
                          people.map((item) =>
                            item.personId === person.personId
                              ? { ...item, role: change.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                    {(focusedPersonRoleId === person.personId ||
                      Boolean((person.role ?? '').trim())) && (
                      <PersonRolePresetBar
                        role="group"
                        aria-label={`${person.name} 한 일 빠른 입력`}
                      >
                        {focusedPersonRoleId === person.personId && (
                          <>
                            <OrgRoleLabel>역할</OrgRoleLabel>
                            {PERSON_ROLE_PRESETS.map((preset) => {
                              const isPresetActive =
                                (person.role ?? '').trim() === preset
                              return (
                                <PersonRolePresetChip
                                  key={preset}
                                  type="button"
                                  $active={isPresetActive}
                                  aria-pressed={isPresetActive}
                                  aria-label={`${person.name} 역할 ${preset} 지정`}
                                  onMouseDown={(mouseEvent) =>
                                    mouseEvent.preventDefault()
                                  }
                                  onClick={() => {
                                    playClickSound?.()
                                    onChange(
                                      people.map((item) =>
                                        item.personId === person.personId
                                          ? {
                                              ...item,
                                              role: isPresetActive
                                                ? ''
                                                : preset,
                                            }
                                          : item,
                                      ),
                                    )
                                    setFocusedPersonRoleId(null)
                                  }}
                                >
                                  {isPresetActive
                                    ? `✓ ${preset}`
                                    : `+ ${preset}`}
                                </PersonRolePresetChip>
                              )
                            })}
                          </>
                        )}
                        {Boolean((person.role ?? '').trim()) && (
                          <PersonRoleClearBtn
                            type="button"
                            aria-label={`${person.name} 역할 비우기`}
                            onClick={() => {
                              playClickSound?.()
                              onChange(
                                people.map((item) =>
                                  item.personId === person.personId
                                    ? { ...item, role: '' }
                                    : item,
                                ),
                              )
                            }}
                          >
                            비우기
                          </PersonRoleClearBtn>
                        )}
                      </PersonRolePresetBar>
                    )}
                  </RowRoleWrap>
                )}
              </Row>
            ))}
          </RowList>
        )}
        <OrgActionRow>
          <QuickSearchAnchor
            onBlur={(blurEvent) => {
              if (
                !blurEvent.currentTarget.contains(
                  blurEvent.relatedTarget as Node | null,
                )
              ) {
                setIsQuickDismissed(true)
              }
            }}
          >
            <QuickSearchInput
              type="search"
              aria-label={`${label} 빠른 검색`}
              placeholder="인물 이름 검색 후 Enter로 즉시 추가 (예: 로베스피에르, 당통)"
              value={quickQuery}
              onFocus={() => setIsQuickDismissed(false)}
              onChange={(changeEvent) => {
                setQuickQuery(changeEvent.target.value)
                setActiveResultIndex(0)
                setIsQuickDismissed(false)
              }}
              onKeyDown={(keyEvent) => {
                if (keyEvent.key === 'ArrowDown') {
                  if (quickPersonMatches.length > 0) {
                    keyEvent.preventDefault()
                    setIsQuickDismissed(false)
                    setActiveResultIndex(
                      (prev) => (prev + 1) % quickPersonMatches.length,
                    )
                  }
                } else if (keyEvent.key === 'ArrowUp') {
                  if (quickPersonMatches.length > 0) {
                    keyEvent.preventDefault()
                    setIsQuickDismissed(false)
                    setActiveResultIndex(
                      (prev) =>
                        (prev - 1 + quickPersonMatches.length) %
                        quickPersonMatches.length,
                    )
                  }
                } else if (keyEvent.key === 'Enter') {
                  if (quickPersonMatches.length > 0) {
                    keyEvent.preventDefault()
                    const target =
                      quickPersonMatches[
                        Math.min(
                          activeResultIndex,
                          quickPersonMatches.length - 1,
                        )
                      ] ?? quickPersonMatches[0]
                    addQuickPerson(target)
                  }
                } else if (keyEvent.key === 'Escape' && quickQuery) {
                  keyEvent.preventDefault()
                  setQuickQuery('')
                  setActiveResultIndex(0)
                }
              }}
            />
            {quickQuery.trim() && !isQuickDismissed && (
              <QuickResultBox
                role="region"
                aria-label={`${label} 빠른 검색 결과`}
              >
                {quickPersonMatches.length > 0 ? (
                  quickPersonMatches.map((personMatch, personIdx) => {
                    const displayName = getPersonDisplayName(personMatch)
                    const spanLabel = lifeSpanLabel(personMatch)
                    const officeLabel = headlineOffice(personMatch)
                    const metaText = [spanLabel, officeLabel]
                      .filter(Boolean)
                      .join(' · ')
                    return (
                      <QuickResultButton
                        key={personMatch.id}
                        type="button"
                        $active={personIdx === activeResultIndex}
                        onMouseEnter={() => setActiveResultIndex(personIdx)}
                        onClick={() => addQuickPerson(personMatch)}
                      >
                        <QuickResultName>+ 👤 {displayName}</QuickResultName>
                        {metaText && (
                          <QuickResultMeta>{metaText}</QuickResultMeta>
                        )}
                      </QuickResultButton>
                    )
                  })
                ) : (
                  <QuickResultEmpty>
                    {personsQuery.isFetching
                      ? '인물 검색 중…'
                      : `‘${quickQuery.trim()}’에 맞는 인물이 없습니다.`}
                  </QuickResultEmpty>
                )}
                <QuickResultCreateButton
                  type="button"
                  onClick={() => {
                    playClickSound?.()
                    setQuickQuery('')
                    onAdd()
                  }}
                >
                  🔍 전체 인물 검색 · 새 인물 등록 창 열기
                </QuickResultCreateButton>
              </QuickResultBox>
            )}
          </QuickSearchAnchor>
          <KitAddButton type="button" onClick={onAdd}>
            <FiPlus size={15} />
            {addLabel}
          </KitAddButton>
        </OrgActionRow>
        {contextualPersonSuggestions.length > 0 && (
          <PersonSuggestionBar
            role="group"
            aria-label={`${label} 추천`}
          >
            <OrgRoleLabel>추천 인물</OrgRoleLabel>
            {(isPersonSuggestionsExpanded
              ? contextualPersonSuggestions
              : contextualPersonSuggestions.slice(0, 3)
            ).map((person) => {
              const displayName = getPersonDisplayName(person)
              return (
                <PersonRolePresetChip
                  key={person.id}
                  type="button"
                  aria-label={`추천 인물 ${displayName} 추가`}
                  onClick={() => addQuickPerson(person)}
                >
                  + 👤 {displayName}
                </PersonRolePresetChip>
              )
            })}
            {contextualPersonSuggestions.length > 3 && (
              <SuggestionMoreChip
                type="button"
                aria-label={
                  isPersonSuggestionsExpanded
                    ? '추천 인물 접기'
                    : `추천 인물 ${contextualPersonSuggestions.length - 3}건 더 보기`
                }
                onClick={() => {
                  playClickSound?.()
                  setIsPersonSuggestionsExpanded((previous) => !previous)
                }}
              >
                {isPersonSuggestionsExpanded
                  ? '접기'
                  : `+${contextualPersonSuggestions.length - 3} 더 보기`}
              </SuggestionMoreChip>
            )}
          </PersonSuggestionBar>
        )}
      </S.FormField>
    </S.FormRow>
  )
}

// ─── 고르기 창 ───────────────────────────────────────────────────────────

const PICKER_TITLE: Record<PickerKind, string> = {
  persons: '참여 인물 고르기',
  power: '취임·즉위한 인물 고르기',
  organizations: '기업·조직 고르기',
  treaty: '조약 고르기',
  election: '선거 고르기',
}

/**
 * 기록마다 후보를 찾는 창 — 하나의 SelectModal을 종류만 바꿔 쓴다. 인물·조약은 서버 검색, 조직·선거는
 * 목록을 받아 이름으로 거른다(서버 검색 파라미터가 없다).
 */
function RecordPickers({
  kind,
  onClose,
  drafts,
  update,
  personContext,
  defaultCountryId,
}: {
  kind: PickerKind | null
  onClose: () => void
  drafts: RegisterFacetDrafts
  update: (patch: Partial<RegisterFacetDrafts>) => void
  personContext?: PersonPickerContext
  defaultCountryId?: string
}) {
  const [term, setTerm] = useState('')
  const debounced = useDebouncedValue(term, 250, kind ?? '')
  const query = useQuery({
    queryKey: ['register-record-candidates', kind, kind === 'treaty' ? debounced : ''],
    // 인물(참여·권력)은 공용 인물 고르기가 스스로 받는다
    enabled: Boolean(kind) && kind !== 'persons' && kind !== 'power',
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    queryFn: async (): Promise<SelectOption[]> => {
      if (kind === 'treaty') {
        const list = await treatyApi.getAll({ search: debounced.trim() || undefined, take: 50 })
        return list.items.map((treaty) => ({ value: treaty.id, label: treaty.name, description: treaty.signDate?.slice(0, 10) }))
      }
      if (kind === 'organizations') {
        const organizations = await getOrganizations(nestiaApiService.getConnection())
        return organizations.map((organization) => ({ value: organization.id, label: organization.name }))
      }
      if (kind === 'election') {
        const elections = await getElections()
        return elections.map((election) => ({
          value: election.id,
          label: election.name,
          description: election.pollDate?.slice(0, 10),
        }))
      }
      return []
    },
  })
  const options = useMemo(() => {
    const all = query.data ?? []
    // 서버 검색이 아닌 목록은 이름으로 거른다
    if (kind === 'organizations' || kind === 'election') {
      const needle = term.trim().toLowerCase()
      return needle ? all.filter((option) => String(option.label).toLowerCase().includes(needle)) : all
    }
    return all
  }, [query.data, kind, term])

  if (!kind) return null
  const close = () => {
    setTerm('')
    onClose()
  }
  /*
   * 인물은 프로젝트 공용 인물 고르기로 — 예전엔 범용 SelectModal에 이름만 30명씩 떠서 동명이인을
   * 가를 수 없었다(생몰·나라·직위가 없었다). 이미 고른 인물은 빼고, 고를 때마다 끝에 붙인다.
   */
  if (kind === 'persons' || kind === 'power') {
    const list = kind === 'persons' ? drafts.persons : drafts.power
    return (
      <PersonPickerModal
        title={PICKER_TITLE[kind]}
        multiSelect
        allowCreate
        defaultCountryId={defaultCountryId}
        context={personContext}
        excludeIds={list.map((person) => person.personId)}
        excludeReason="이미 고른 인물은 목록에서 뺐습니다."
        onSelect={(personId, name) => {
          const next = [...list, { personId, name }]
          update(kind === 'persons' ? { persons: next } : { power: next })
        }}
        onClose={close}
      />
    )
  }
  const labelOf = (value: string) => String(options.find((option) => option.value === value)?.label ?? '')
  const multiple = kind === 'organizations'
  const selectedValues = kind === 'organizations' ? drafts.organizations.map((organization) => organization.id) : []

  const onSelect = (value: string) => {
    if (kind === 'organizations') {
      const next = drafts.organizations.some((organization) => organization.id === value)
        ? drafts.organizations.filter((organization) => organization.id !== value)
        : [...drafts.organizations, { id: value, name: labelOf(value), role: 'PRINCIPAL' as const }]
      update({ organizations: next })
      return
    }
    if (kind === 'treaty') update({ treaty: { mode: 'link', treatyId: value, treatyName: labelOf(value) } })
    if (kind === 'election') update({ election: { id: value, name: labelOf(value) } })
    close()
  }

  return (
    <SelectModal
      isOpen
      onClose={close}
      title={PICKER_TITLE[kind]}
      options={options}
      multiple={multiple}
      selectedValues={multiple ? selectedValues : undefined}
      onSelect={onSelect}
      searchable
      searchPlaceholder="이름으로 검색"
      onQueryChange={setTerm}
      isLoading={query.isLoading}
      isSearching={query.isFetching || term !== debounced}
      hasError={query.isError}
      onRetry={() => void query.refetch()}
    />
  )
}

// ─── 스타일 ──────────────────────────────────────────────────────────────

const ParentImportBanner = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
  padding: 10px 12px;
  margin-bottom: 12px;
  border-radius: 10px;
  border: 1px dashed ${({ theme }) => S.getC(theme).border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc'};
`

const ParentImportBannerText = styled.span`
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.45;
`

const ParentImportButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 11px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => `${theme.colors.primary}12`};
  color: ${({ theme }) => theme.colors.primary};
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: ${({ theme }) => `${theme.colors.primary}20`};
  }
`

const RowList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
`

const OrgActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
`

const OrgRow = styled.div<{ $role?: EventOrganizationRole }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  padding: 11px 13px;
  border-radius: 11px;
  border: 1px solid ${({ theme }) => S.getC(theme).border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.025)' : '#ffffff'};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark' ? 'none' : '0 1px 2px rgba(15, 23, 42, 0.03)'};
`

const OrgRoleBar = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 8px;
  min-width: 0;
`

const OrgRoleLabel = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  flex-shrink: 0;
`

const OrgRoleHintText = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const OrgRoleChipGroup = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
  padding: 2.5px;
  border-radius: 9px;
  border: 1px solid ${({ theme }) => S.getC(theme).border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#f1f5f9'};
`

const OrgRoleChipBtn = styled.button<{ $active: boolean }>`
  height: 25px;
  padding: 0 9px;
  border: none;
  border-radius: 6px;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? theme.colors.activeLight
        : '#ffffff'
      : 'transparent'};
  box-shadow: ${({ $active, theme }) =>
    $active && theme.mode !== 'dark'
      ? '0 1px 2px rgba(15, 23, 42, 0.08)'
      : 'none'};
  color: ${({ $active, theme }) =>
    $active
      ? `var(--active-domain-text, ${theme.colors.primary})`
      : theme.colors.text.secondary};
  font: inherit;
  font-size: 12px;
  font-weight: ${({ $active }) => ($active ? 700 : 600)};
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.14s ease, color 0.14s ease, box-shadow 0.14s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const Row = styled.div<{ $role?: string; $dragOver?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  padding: 10px 12px;
  border-radius: 11px;
  border: 1px solid
    ${({ $dragOver, theme }) =>
      $dragOver ? theme.colors.primary : S.getC(theme).border.light};
  background: ${({ $dragOver, theme }) =>
    $dragOver
      ? `${theme.colors.primary}10`
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.025)'
        : '#ffffff'};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark' ? 'none' : '0 1px 2px rgba(15, 23, 42, 0.03)'};
  transition: border-color 0.14s ease, background 0.14s ease;
`

const RowNameWrap = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
`

const PersonDragHandle = styled.span`
  font-size: 13px;
  line-height: 1;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: grab;
  user-select: none;
`

const PersonRowHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px 10px;
  min-width: 0;
`

const PersonRowActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  flex-shrink: 0;
`

const RowRoleWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  min-width: 0;

  > input,
  > textarea {
    width: 100%;
  }
`

const PersonRolePresetBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
`

const PersonSuggestionBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px 6px;
  margin-top: 2px;
  font-size: 11.5px;
`

const SuggestionMoreChip = styled.button`
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const PersonRoleClearBtn = styled.button`
  height: 24px;
  padding: 0 8px;
  margin-left: auto;
  border: 1px solid ${({ theme }) => S.getC(theme).border.light};
  border-radius: 6px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.error};
    border-color: ${({ theme }) => theme.colors.error};
  }
`

const RowRoleTextarea = styled.textarea`
  min-width: 0;
  min-height: 36px;
  padding: 7px 11px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => S.getC(theme).border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.16)' : '#f8fafc'};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 13px;
  line-height: 1.45;
  letter-spacing: -0.01em;
  resize: vertical;
  transition: border-color 0.15s ease, box-shadow 0.15s ease,
    background-color 0.15s ease;

  &::placeholder {
    color: ${({ theme }) => S.getC(theme).text.muted};
  }

  &:hover {
    border-color: ${({ theme }) => S.getC(theme).border.hover};
  }

  &:focus,
  &:focus-visible {
    outline: none;
    background: ${({ theme }) => S.getC(theme).background.content};
    border-color: ${({ theme }) => S.getC(theme).border.focus};
    box-shadow: 0 0 0 3px ${({ theme }) => S.getC(theme).border.focusHalo};
  }
`

const PersonRolePresetChip = styled.button<{ $active?: boolean }>`
  height: 25px;
  padding: 0 9px;
  border-radius: 999px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? theme.colors.primary : S.getC(theme).border.light};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? `${theme.colors.primary}25`
        : `${theme.colors.primary}12`
      : S.getC(theme).background.content};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.text.secondary};
  font: inherit;
  font-size: 11.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 600)};
  cursor: pointer;
  transition: border-color 0.14s ease, color 0.14s ease, background 0.14s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`

const TreatyCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
  padding: 11px 13px;
  border-radius: 11px;
  border: 1px solid ${({ theme }) => S.getC(theme).border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.025)' : '#ffffff'};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark' ? 'none' : '0 1px 2px rgba(15, 23, 42, 0.03)'};
`

const TreatyCreateHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;

  > input {
    flex: 1 1 220px;
    min-width: 0;
  }
`

const TreatySuggestBtn = styled.button`
  display: inline-flex;
  align-items: center;
  height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => `${theme.colors.primary}45`};
  background: ${({ theme }) => `${theme.colors.primary}12`};
  color: ${({ theme }) => theme.colors.primary};
  font: inherit;
  font-size: 11.5px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => `${theme.colors.primary}20`};
  }
`

const TreatyMetaHint = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const InlineSideGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: 32px;
  padding: 2px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => S.getC(theme).border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#f1f5f9'};
  flex-shrink: 0;
`

const InlineSideBtn = styled.button<{ $active: boolean }>`
  height: 26px;
  padding: 0 8px;
  border-radius: 6px;
  border: none;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? theme.colors.activeLight
        : '#ffffff'
      : 'transparent'};
  box-shadow: ${({ $active, theme }) =>
    $active && theme.mode !== 'dark'
      ? '0 1px 2px rgba(15, 23, 42, 0.08)'
      : 'none'};
  color: ${({ $active, theme }) =>
    $active
      ? `var(--active-domain-text, ${theme.colors.primary})`
      : theme.colors.text.secondary};
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const QuickSearchAnchor = styled.div`
  position: relative;
  flex: 1 1 200px;
  min-width: 0;
`

const QuickSearchInput = styled.input`
  width: 100%;
  min-width: 0;
  height: 34px;
  padding: 0 11px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => S.getC(theme).border.default};
  background: ${({ theme }) => S.getC(theme).background.content};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 13px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &::placeholder {
    color: ${({ theme }) => S.getC(theme).text.muted};
  }

  &:focus,
  &:focus-visible {
    outline: none;
    border-color: ${({ theme }) => S.getC(theme).border.focus};
    box-shadow: 0 0 0 3px ${({ theme }) => S.getC(theme).border.focusHalo};
  }
`

const QuickResultBox = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  max-height: 260px;
  overflow-y: auto;
  padding: 4px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => S.getC(theme).border.default};
  background: ${({ theme }) => S.getC(theme).background.content};
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.14);
`

const QuickResultButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  border: none;
  border-radius: 7px;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.08)'
        : '#f1f5f9'
      : 'transparent'};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  text-align: left;
  cursor: pointer;
`

const QuickResultName = styled.span`
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const QuickResultMeta = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 55%;
`

const QuickResultEmpty = styled.div`
  padding: 8px 10px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const QuickResultCreateButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 7px 10px;
  margin-top: 2px;
  border: none;
  border-top: 1px solid ${({ theme }) => S.getC(theme).border.light};
  background: transparent;
  color: ${({ theme }) => theme.colors.primary};
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#f8fafc'};
  }
`

const RowName = styled.span`
  min-width: 0;
  font-size: 13.5px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
  word-break: keep-all;
  overflow-wrap: anywhere;
`

const rowControl = `
  height: 34px;
  border-radius: 8px;
  font-family: inherit;
  font-size: 13px;
  letter-spacing: -0.01em;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
`

const RowInput = styled.input`
  ${rowControl}
  min-width: 0;
  padding: 0 11px;
  border: 1px solid ${({ theme }) => S.getC(theme).border.default};
  background: ${({ theme }) => S.getC(theme).background.content};
  color: ${({ theme }) => theme.colors.text.primary};

  &::placeholder {
    color: ${({ theme }) => S.getC(theme).text.muted};
  }

  &:hover {
    border-color: ${({ theme }) => S.getC(theme).border.hover};
  }

  &:focus,
  &:focus-visible {
    outline: none;
    border-color: ${({ theme }) => S.getC(theme).border.focus};
    box-shadow: 0 0 0 3px ${({ theme }) => S.getC(theme).border.focusHalo};
  }
`

const RowSelect = styled.select<{ $highlighted?: boolean }>`
  ${rowControl}
  appearance: none;
  height: 30px;
  padding: 0 26px 0 9px;
  border: 1px solid
    ${({ $highlighted, theme }) =>
      $highlighted ? theme.colors.primary : S.getC(theme).border.default};
  background-color: ${({ $highlighted, theme }) =>
    $highlighted
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.14)'
        : 'rgba(99, 102, 241, 0.06)'
      : S.getC(theme).background.content};
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  color: ${({ $highlighted, theme }) =>
    $highlighted ? theme.colors.primary : theme.colors.text.primary};
  font-size: 12px;
  font-weight: ${({ $highlighted }) => ($highlighted ? 700 : 600)};
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => S.getC(theme).border.hover};
  }

  &:focus,
  &:focus-visible {
    outline: none;
    border-color: ${({ theme }) => S.getC(theme).border.focus};
    box-shadow: 0 0 0 3px ${({ theme }) => S.getC(theme).border.focusHalo};
  }
`

const SidesVsBanner = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
  padding: 9px 12px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => S.getC(theme).border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.03)'
      : 'rgba(248, 250, 252, 0.9)'};
`

const SidesVsTopRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px 12px;
`

const SidesVsTeamsWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  min-width: 0;
`

const SidesVsTeamItem = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
  min-width: 0;
`

const SidesVsTeamDot = styled.span<{ $slot?: SideSlot }>`
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: ${({ $slot }) => sideSlotAccentColor($slot)};
  flex-shrink: 0;
`

const SidesVsTeamName = styled.span`
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const SidesVsTeamMeta = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
`

const SidesVsBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.08)'};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const SidesVsDragHint = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SidesVsGaugeTrack = styled.div`
  display: flex;
  width: 100%;
  height: 6px;
  border-radius: 999px;
  overflow: hidden;
  gap: 2px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)'};
`

const SidesVsGaugeSegment = styled.div<{ $slot?: SideSlot; $empty?: boolean }>`
  height: 100%;
  border-radius: 999px;
  background: ${({ $slot }) => sideSlotAccentColor($slot)};
  opacity: ${({ $empty }) => ($empty ? 0.25 : 0.88)};
  transition: flex-grow 0.22s ease, opacity 0.18s ease;
`

const SideBoardGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
  min-width: 0;

  @media (max-width: 560px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
  }
`

const sideSlotAccentColor = (slot: SideSlot | undefined): string => {
  switch (slot) {
    case 'A':
      return '#6366f1'
    case 'B':
      return '#f43f5e'
    case 'C':
      return '#10b981'
    default:
      return '#f59e0b'
  }
}

const SideCard = styled.div<{ $slot?: SideSlot; $dragOver?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid
    ${({ $dragOver, $slot, theme }) =>
      $dragOver ? sideSlotAccentColor($slot) : S.getC(theme).border.light};
  border-top: 3px solid ${({ $slot }) => sideSlotAccentColor($slot)};
  background: ${({ $dragOver, $slot, theme }) =>
    $dragOver
      ? `${sideSlotAccentColor($slot)}12`
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.025)'
        : '#f8fafc'};
  box-shadow: ${({ $dragOver, $slot }) =>
    $dragOver ? `0 0 0 2px ${sideSlotAccentColor($slot)}33` : 'none'};
  transition: border-color 0.14s ease, background 0.14s ease, box-shadow 0.14s ease;
  min-width: 0;
`

const SideCardHeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
`

const SideSlotBadge = styled.span<{ $slot?: SideSlot }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  padding: 0 8px;
  border-radius: 6px;
  background: ${({ $slot }) => `${sideSlotAccentColor($slot)}18`};
  color: ${({ $slot }) => sideSlotAccentColor($slot)};
  font-size: 11.5px;
  font-weight: 800;
  flex-shrink: 0;
`

const SideNameInput = styled.input`
  height: 34px;
  border-radius: 8px;
  font-family: inherit;
  font-size: 13px;
  letter-spacing: -0.01em;
  padding: 0 11px;
  border: 1px solid ${({ theme }) => S.getC(theme).border.default};
  background: ${({ theme }) => S.getC(theme).background.content};
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 600;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &::placeholder {
    color: ${({ theme }) => S.getC(theme).text.muted};
    font-weight: 500;
  }

  &:hover {
    border-color: ${({ theme }) => S.getC(theme).border.hover};
  }

  &:focus,
  &:focus-visible {
    outline: none;
    border-color: ${({ theme }) => S.getC(theme).border.focus};
    box-shadow: 0 0 0 3px ${({ theme }) => S.getC(theme).border.focusHalo};
  }
`

const SideFactionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`

const SideGroupSelect = styled.select`
  flex: 1;
  min-width: 120px;
  height: 28px;
  border-radius: 6px;
  font-family: inherit;
  font-size: 12px;
  padding: 0 8px;
  border: 1px solid ${({ theme }) => S.getC(theme).border.light};
  background: ${({ theme }) => S.getC(theme).background.content};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => S.getC(theme).border.focus};
  }
`

const SideNewGroupBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 28px;
  padding: 0 8px;
  border-radius: 6px;
  border: 1px dashed ${({ theme }) => S.getC(theme).border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`

const LinkedFactionBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 999px;
  background: ${({ theme }) => `${theme.colors.primary}15`};
  color: ${({ theme }) => theme.colors.primary};
  border: 1px solid ${({ theme }) => `${theme.colors.primary}35`};
  font-size: 11.5px;
  font-weight: 700;
`

const SideMemberWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 2px 0;
  background: transparent;
`

const SideEmptyHint = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SideMemberChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 4px 2px 8px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => S.getC(theme).border.default};
  background: ${({ theme }) => S.getC(theme).background.content};
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
`

const SideMemberName = styled.span`
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const SideMemberSwitch = styled.button`
  padding: 1px 5px;
  border: none;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.secondary};
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`

const SideQuickSearchWrap = styled.div`
  position: relative;
  min-width: 0;
  margin-top: 2px;
`

const SideQuickInput = styled.input`
  width: 100%;
  min-width: 0;
  height: 28px;
  padding: 0 9px;
  border-radius: 6px;
  border: 1px dashed ${({ theme }) => S.getC(theme).border.default};
  background: ${({ theme }) => S.getC(theme).background.content};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 12px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &::placeholder {
    color: ${({ theme }) => S.getC(theme).text.muted};
  }

  &:focus,
  &:focus-visible {
    outline: none;
    border-style: solid;
    border-color: ${({ theme }) => S.getC(theme).border.focus};
    box-shadow: 0 0 0 2px ${({ theme }) => S.getC(theme).border.focusHalo};
  }
`

const UnassignedBar = styled.div<{ $dragOver?: boolean }>`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px dashed
    ${({ $dragOver, theme }) =>
      $dragOver ? theme.colors.primary : S.getC(theme).border.default};
  background: ${({ $dragOver, theme }) =>
    $dragOver
      ? `${theme.colors.primary}12`
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.02)'
        : 'rgba(248, 250, 252, 0.85)'};
  transition: border-color 0.14s ease, background 0.14s ease;
`

const UnassignedLabel = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-right: 2px;
`

const UnassignedChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 5px 3px 9px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => S.getC(theme).border.default};
  background: ${({ theme }) => S.getC(theme).background.content};
  font-size: 12px;
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
`

const UnassignedName = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const UnassignedAssignButton = styled.button`
  padding: 2px 7px;
  border: 1px solid ${({ theme }) => S.getC(theme).border.light};
  border-radius: 999px;
  background: ${({ theme }) => S.getC(theme).background.section};
  color: ${({ theme }) => theme.colors.text.secondary};
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: border-color 0.14s ease, color 0.14s ease, background 0.14s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => `${theme.colors.primary}12`};
  }
`

const SidesFooterRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin-top: 4px;
`

const TextButton = styled.button`
  height: 26px;
  padding: 0 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 999px;
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const StatehoodGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
  min-width: 0;

  @media (max-width: 560px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
  }
`

const StatehoodCard = styled.div<{ $role?: 'FOUNDED' | 'DISSOLVED' }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => S.getC(theme).border.light};
  border-top: 3px solid
    ${({ $role }) => ($role === 'DISSOLVED' ? '#f43f5e' : '#10b981')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.025)' : '#f8fafc'};
  min-width: 0;
`

const SlotLabel = styled.div`
  margin-bottom: 2px;
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const RecordOptionalTag = styled.span`
  margin-left: 4px;
  font-size: 11.5px;
  font-weight: 500;
  color: ${({ theme }) => S.getC(theme).text.muted};
`
