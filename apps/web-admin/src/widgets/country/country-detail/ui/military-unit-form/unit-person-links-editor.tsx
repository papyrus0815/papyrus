import React, { useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiPlus, FiUser, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import * as S from '@/pages/events/create/event-create.styles'
import type { MilitaryUnitType } from '@/shared/api/military-unit'
import {
  type CreateGovernmentPositionTenureDto,
  personCareerApi,
  type UpdateGovernmentPositionTenureDto,
} from '@/shared/api/person-career'
import { getAllPersons } from '@/shared/api/persons'
import { ensureOwnedPositionDefinition } from '@/shared/lib/government-position/ensure-owned-position-definition'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import {
  PersonPickerModal,
  type PersonPickerContext,
} from '@/shared/ui/person-picker'
import {
  comparePersons,
  lifeSpanLabel,
  matchesQuery,
  searchHaystack,
} from '@/shared/ui/person-picker/person-picker.lib'

import { defaultCommanderTitleForUnitType } from './constants'
import { StructuredPartsDateField } from './structured-parts-date-field'
import * as FormS from './styles'

export type UnitPersonRoleKind = 'COMMANDER' | 'STAFF' | 'MEMBER'

export interface UnitPersonLinkDraft {
  localId: string
  existingTenureId?: string
  personId: string
  personName: string
  roleKind: UnitPersonRoleKind
  rankTitle: string
  title: string
  ordinal: string
  startEra: 'AD' | 'BC'
  startYear: string
  startMonth: string
  startDay: string
  endEra: 'AD' | 'BC'
  endYear: string
  endMonth: string
  endDay: string
  notes: string
}

let nextPersonLinkSeq = 1

export function createPersonLinkDraft(params: {
  personId: string
  personName: string
  unitType?: MilitaryUnitType | '' | null
  roleKind?: UnitPersonRoleKind
  defaultStartEra?: 'AD' | 'BC'
  defaultStartYear?: string
}): UnitPersonLinkDraft {
  const roleKind = params.roleKind ?? 'COMMANDER'
  return {
    localId: `unit-person-${Date.now()}-${nextPersonLinkSeq++}`,
    personId: params.personId,
    personName: params.personName,
    roleKind,
    rankTitle: '',
    title: defaultCommanderTitleForUnitType(params.unitType, roleKind),
    ordinal: '',
    startEra: params.defaultStartEra ?? 'AD',
    startYear: params.defaultStartYear ?? '',
    startMonth: '',
    startDay: '',
    endEra: 'AD',
    endYear: '',
    endMonth: '',
    endDay: '',
    notes: '',
  }
}

export interface HydratableUnitTenure {
  id: string
  personId?: string | null
  positionType?: string | null
  rankTitle?: string | null
  title?: string | null
  ordinal?: number | null
  startEra?: string | null
  startYear?: number | null
  startMonth?: number | null
  startDay?: number | null
  endEra?: string | null
  endYear?: number | null
  endMonth?: number | null
  endDay?: number | null
  notes?: string | null
  positionDefinition?: { title?: string | null } | null
  person?: {
    id?: string
    name?: string | null
    surname?: string | null
    middleName?: string | null
    country?: {
      name?: string | null
      defaultNameDisplayOrder?: string | null
      isoCode?: string | null
    } | null
  } | null
}

export function hydrateUnitPersonDrafts(
  tenures: ReadonlyArray<HydratableUnitTenure> | undefined | null,
): UnitPersonLinkDraft[] {
  if (!tenures || tenures.length === 0) return []
  return tenures.map((tenureRow) => {
    const personObj = tenureRow.person
    const personName = personObj
      ? getPersonDisplayName({
          name: personObj.name ?? '',
          surname: personObj.surname ?? undefined,
          middleName: personObj.middleName ?? undefined,
          country: personObj.country ?? undefined,
        }) ||
        personObj.name ||
        '연결된 인물'
      : '연결된 인물'

    const titleText = String(
      tenureRow.title ?? tenureRow.positionDefinition?.title ?? '사령관',
    )
    const roleKind: UnitPersonRoleKind =
      tenureRow.positionType === 'OTHER'
        ? 'MEMBER'
        : /참모|부장|차장/.test(titleText)
          ? 'STAFF'
          : 'COMMANDER'

    return {
      localId: `hydrated-tenure-${tenureRow.id}`,
      existingTenureId: String(tenureRow.id),
      personId: String(personObj?.id ?? tenureRow.personId ?? ''),
      personName,
      roleKind,
      rankTitle: tenureRow.rankTitle ?? '',
      title: titleText,
      ordinal: tenureRow.ordinal != null ? String(tenureRow.ordinal) : '',
      startEra: tenureRow.startEra === 'BC' ? 'BC' : 'AD',
      startYear:
        tenureRow.startYear != null ? String(Math.abs(tenureRow.startYear)) : '',
      startMonth:
        tenureRow.startMonth != null ? String(tenureRow.startMonth) : '',
      startDay: tenureRow.startDay != null ? String(tenureRow.startDay) : '',
      endEra: tenureRow.endEra === 'BC' ? 'BC' : 'AD',
      endYear:
        tenureRow.endYear != null ? String(Math.abs(tenureRow.endYear)) : '',
      endMonth: tenureRow.endMonth != null ? String(tenureRow.endMonth) : '',
      endDay: tenureRow.endDay != null ? String(tenureRow.endDay) : '',
      notes: tenureRow.notes ?? '',
    }
  })
}

function parseTenureDateParts(
  era: 'AD' | 'BC',
  yearStr: string,
  monthStr: string,
  dayStr: string,
  label: string,
):
  | {
      ok: true
      info: { era: 'BC' | 'AD'; year: number; month?: number; day?: number } | null
    }
  | { ok: false; error: string } {
  const yearText = yearStr.trim()
  const monthText = monthStr.trim()
  const dayText = dayStr.trim()
  if (!yearText) {
    if (monthText || dayText) {
      return { ok: false, error: `${label} 연도를 먼저 입력해 주세요.` }
    }
    return { ok: true, info: null }
  }
  const yNum = Number.parseInt(yearText, 10)
  if (!Number.isInteger(yNum) || yNum < 1) {
    return { ok: false, error: `${label} 연도는 1 이상의 정수여야 합니다.` }
  }
  let mNum: number | undefined
  if (monthText) {
    const parsedM = Number.parseInt(monthText, 10)
    if (!Number.isInteger(parsedM) || parsedM < 1 || parsedM > 12) {
      return { ok: false, error: `${label} 월은 1~12 사이여야 합니다.` }
    }
    mNum = parsedM
  }
  let dNum: number | undefined
  if (dayText) {
    if (mNum === undefined) {
      return { ok: false, error: `${label} 월을 먼저 입력해 주세요.` }
    }
    const parsedD = Number.parseInt(dayText, 10)
    if (!Number.isInteger(parsedD) || parsedD < 1 || parsedD > 31) {
      return { ok: false, error: `${label} 일은 1~31 사이여야 합니다.` }
    }
    dNum = parsedD
  }
  return {
    ok: true,
    info: {
      era,
      year: yNum,
      ...(mNum !== undefined ? { month: mNum } : {}),
      ...(dNum !== undefined ? { day: dNum } : {}),
    },
  }
}

export function validateUnitPersonDrafts(
  drafts: ReadonlyArray<UnitPersonLinkDraft>,
): string | null {
  for (const draft of drafts) {
    if (!draft.personId) {
      return '연결할 인물이 지정되지 않은 행이 있습니다.'
    }
    const startRes = parseTenureDateParts(
      draft.startEra,
      draft.startYear,
      draft.startMonth,
      draft.startDay,
      `「${draft.personName}」 임기 시작`,
    )
    if (!startRes.ok) return startRes.error
    const endRes = parseTenureDateParts(
      draft.endEra,
      draft.endYear,
      draft.endMonth,
      draft.endDay,
      `「${draft.personName}」 임기 종료`,
    )
    if (!endRes.ok) return endRes.error
    if (draft.ordinal.trim()) {
      const ordNum = Number.parseInt(draft.ordinal.trim(), 10)
      if (!Number.isInteger(ordNum) || ordNum < 1) {
        return `「${draft.personName}」 대수는 1 이상의 자연수여야 합니다.`
      }
    }
  }
  return null
}

export async function syncUnitPersonDrafts(params: {
  unitId: string
  unitType?: MilitaryUnitType | '' | null
  countryId?: string | null
  historicalCountryId?: string | null
  drafts: ReadonlyArray<UnitPersonLinkDraft>
  initialTenureIds: ReadonlyArray<string>
}): Promise<{ affectedPersonIds: string[] }> {
  const {
    unitId,
    unitType,
    countryId,
    historicalCountryId,
    drafts,
    initialTenureIds,
  } = params
  const keptTenureIds = new Set<string>()
  const affectedPersonIds = new Set<string>()
  /*
   * 직책은 DB 정의 필수(서버 2026-11-27) — 보직 이름을 이 부대 전용 DB 직책으로 확보해 id로 보낸다.
   * 같은 저장 안에서 새로 만든 정의도 다시 찾도록 목록에 보탠다.
   */
  const definitionPool: Array<{
    id: string
    title?: string | null
    militaryUnitId?: string | null
    administrationDepartmentId?: string | null
    isGeneric?: boolean | null
  }> = drafts.length > 0 ? [...(await personCareerApi.getPositionDefinitions({}))] : []

  for (const draft of drafts) {
    affectedPersonIds.add(draft.personId)
    const startRes = parseTenureDateParts(
      draft.startEra,
      draft.startYear,
      draft.startMonth,
      draft.startDay,
      '시작일',
    )
    const endRes = parseTenureDateParts(
      draft.endEra,
      draft.endYear,
      draft.endMonth,
      draft.endDay,
      '종료일',
    )
    const startInfo = startRes.ok ? startRes.info : null
    const endInfo = endRes.ok ? endRes.info : null

    const positionType: CreateGovernmentPositionTenureDto['positionType'] =
      draft.roleKind === 'MEMBER' ? 'OTHER' : 'MILITARY_COMMANDER'
    const resolvedTitle =
      draft.title.trim() ||
      defaultCommanderTitleForUnitType(unitType, draft.roleKind)
    const positionDefinitionId = await ensureOwnedPositionDefinition({
      title: resolvedTitle,
      positionType,
      militaryUnitId: unitId,
      pool: definitionPool,
    })
    if (!definitionPool.some((definition) => definition.id === positionDefinitionId)) {
      definitionPool.push({ id: positionDefinitionId, title: resolvedTitle, militaryUnitId: unitId })
    }
    const parsedOrdinal = draft.ordinal.trim()
      ? Number.parseInt(draft.ordinal.trim(), 10)
      : null

    if (draft.existingTenureId) {
      keptTenureIds.add(draft.existingTenureId)
      const updateDto: UpdateGovernmentPositionTenureDto = {
        personId: draft.personId,
        positionType,
        positionDefinitionId,
        title: resolvedTitle,
        rankTitle: draft.rankTitle.trim() || null,
        ordinal: parsedOrdinal,
        countryId: historicalCountryId ? undefined : countryId || undefined,
        historicalCountryId: historicalCountryId || undefined,
        militaryUnitId: unitId,
        startDateInfo: startInfo ?? undefined,
        endDateInfo: endInfo,
        notes: draft.notes.trim() || null,
      }
      await personCareerApi.updateGovernmentPositionTenure(
        draft.existingTenureId,
        updateDto,
      )
    } else {
      const createDto: CreateGovernmentPositionTenureDto = {
        personId: draft.personId,
        positionType,
        positionDefinitionId,
        title: resolvedTitle,
        rankTitle: draft.rankTitle.trim() || undefined,
        ordinal: parsedOrdinal ?? undefined,
        countryId: historicalCountryId ? undefined : countryId || undefined,
        historicalCountryId: historicalCountryId || undefined,
        militaryUnitId: unitId,
        startDateInfo: startInfo ?? undefined,
        endDateInfo: endInfo ?? undefined,
        notes: draft.notes.trim() || undefined,
      }
      await personCareerApi.addGovernmentPositionTenure(createDto)
    }
  }

  for (const oldId of initialTenureIds) {
    if (!keptTenureIds.has(oldId)) {
      await personCareerApi.deleteGovernmentPositionTenure(oldId)
    }
  }

  return { affectedPersonIds: [...affectedPersonIds] }
}

export interface UnitPersonLinksEditorProps {
  drafts: UnitPersonLinkDraft[]
  onChange: (next: UnitPersonLinkDraft[]) => void
  unitType: MilitaryUnitType | ''
  countryId: string
  historicalCountryId: string
  countryName: string
  establishedEra: 'AD' | 'BC'
  establishedYear: string
  disbandedEra: 'AD' | 'BC'
  disbandedYear: string
}

export const UnitPersonLinksEditor: React.FC<UnitPersonLinksEditorProps> = ({
  drafts,
  onChange,
  unitType,
  countryId,
  historicalCountryId,
  countryName,
  establishedEra,
  establishedYear,
  disbandedEra,
  disbandedYear,
}) => {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerCreateMode, setPickerCreateMode] = useState(false)
  const [quickQuery, setQuickQuery] = useState('')
  const [quickFocused, setQuickFocused] = useState(false)

  const { data: allPersons = [] } = useQuery({
    queryKey: ['persons', 'all'],
    queryFn: getAllPersons,
    enabled: quickFocused || pickerOpen,
    staleTime: 5 * 60_000,
  })

  const personContext = useMemo<PersonPickerContext | undefined>(() => {
    const startSigned = establishedYear.trim()
      ? (establishedEra === 'BC' ? -1 : 1) *
        Number.parseInt(establishedYear.trim(), 10)
      : null
    const endSigned = disbandedYear.trim()
      ? (disbandedEra === 'BC' ? -1 : 1) *
        Number.parseInt(disbandedYear.trim(), 10)
      : null
    const cIds = [historicalCountryId, countryId].filter(Boolean)
    if (startSigned == null && endSigned == null && cIds.length === 0) {
      return undefined
    }
    return {
      fromYear: Number.isFinite(startSigned) ? startSigned : null,
      toYear: Number.isFinite(endSigned) ? endSigned : startSigned,
      countryIds: cIds,
      label: countryName ? `${countryName} · 동시대 인물` : '동시대 인물',
    }
  }, [
    establishedEra,
    establishedYear,
    disbandedEra,
    disbandedYear,
    countryId,
    historicalCountryId,
    countryName,
  ])

  const quickSuggestions = useMemo(() => {
    const queryText = quickQuery.trim()
    if (!queryText) return []
    return allPersons
      .filter((personItem) => matchesQuery(searchHaystack(personItem), queryText))
      .sort(comparePersons('relevance', personContext))
      .slice(0, 7)
  }, [allPersons, quickQuery, personContext])

  const handleAppendPerson = (personId: string, personName: string) => {
    const nextDraft = createPersonLinkDraft({
      personId,
      personName,
      unitType,
      defaultStartEra: establishedEra,
      defaultStartYear: establishedYear,
    })
    onChange([...drafts, nextDraft])
    setQuickQuery('')
  }

  const updateRow = (
    localId: string,
    patch: Partial<UnitPersonLinkDraft>,
  ) => {
    onChange(
      drafts.map((row) => (row.localId === localId ? { ...row, ...patch } : row)),
    )
  }

  return (
    <Wrap>
      <SearchToolbar>
        <FormS.QuickSearchBox style={{ flex: 1 }}>
          <S.Input
            type="text"
            placeholder="사령관 · 참모 · 주요 인물 이름 빠른 검색…"
            aria-label="연결할 인물 검색"
            value={quickQuery}
            onFocus={() => setQuickFocused(true)}
            onBlur={() => window.setTimeout(() => setQuickFocused(false), 180)}
            onChange={(e) => setQuickQuery(e.target.value)}
          />
          {quickFocused && quickQuery.trim() ? (
            <FormS.QuickSuggestionList role="listbox" aria-label="인물 검색 결과">
              {quickSuggestions.map((person) => {
                const displayName =
                  getPersonDisplayName({
                    name: person.name ?? '',
                    surname: person.surname ?? undefined,
                    middleName: person.middleName ?? undefined,
                    country: person.country ?? undefined,
                  }) || person.name
                const spanText = lifeSpanLabel(person)
                return (
                  <FormS.QuickSuggestionItem
                    key={person.id}
                    type="button"
                    role="option"
                    aria-selected={false}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      handleAppendPerson(person.id, displayName)
                    }}
                  >
                    <span>
                      <FiUser
                        size={11.5}
                        style={{ marginRight: 5, verticalAlign: -1 }}
                      />
                      {displayName}
                    </span>
                    <FormS.ContextCardMeta>{spanText}</FormS.ContextCardMeta>
                  </FormS.QuickSuggestionItem>
                )
              })}
              <FormS.QuickSuggestionItem
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  setPickerCreateMode(true)
                  setPickerOpen(true)
                }}
              >
                <span style={{ fontWeight: 600 }}>
                  + ‘{quickQuery.trim()}’ 새 인물로 즉석 등록 후 연결
                </span>
              </FormS.QuickSuggestionItem>
            </FormS.QuickSuggestionList>
          ) : null}
        </FormS.QuickSearchBox>

        <S.AddButton
          type="button"
          onClick={() => {
            setPickerCreateMode(false)
            setPickerOpen(true)
          }}
        >
          <FiPlus size={15} />
          인물 선택 · 등록
        </S.AddButton>
      </SearchToolbar>

      {drafts.length > 0 ? (
        <PersonList>
          {drafts.map((row) => (
            <PersonCard key={row.localId}>
              <PersonCardTop>
                <PersonIdentity>
                  <FiUser size={13} />
                  <strong>{row.personName}</strong>
                </PersonIdentity>

                <RoleKindSwitch role="group" aria-label="인물 역할 구분">
                  {(
                    [
                      { value: 'COMMANDER', label: '사령관·지휘관' },
                      { value: 'STAFF', label: '참모장·참모' },
                      { value: 'MEMBER', label: '창설·주요 인물' },
                    ] as const
                  ).map((opt) => (
                    <RoleChip
                      key={opt.value}
                      type="button"
                      $active={row.roleKind === opt.value}
                      onClick={() => {
                        const prevDefault = defaultCommanderTitleForUnitType(
                          unitType,
                          row.roleKind,
                        )
                        const nextTitle =
                          !row.title.trim() || row.title === prevDefault
                            ? defaultCommanderTitleForUnitType(
                                unitType,
                                opt.value,
                              )
                            : row.title
                        updateRow(row.localId, {
                          roleKind: opt.value,
                          title: nextTitle,
                        })
                      }}
                    >
                      {opt.label}
                    </RoleChip>
                  ))}
                </RoleKindSwitch>

                <RemoveRowBtn
                  type="button"
                  aria-label={`${row.personName} 연결 제거`}
                  onClick={() =>
                    onChange(drafts.filter((item) => item.localId !== row.localId))
                  }
                >
                  <FiX size={14} />
                </RemoveRowBtn>
              </PersonCardTop>

              <RoleFieldsGrid>
                <SmallField>
                  <SmallLabel>계급 (선택)</SmallLabel>
                  <S.Input
                    type="text"
                    placeholder="예: 원수, 상급대장, 중장"
                    value={row.rankTitle}
                    onChange={(changeEvent) =>
                      updateRow(row.localId, {
                        rankTitle: changeEvent.target.value,
                      })
                    }
                  />
                </SmallField>
                <SmallField>
                  <SmallLabel>보직 · 직함</SmallLabel>
                  <S.Input
                    type="text"
                    placeholder="예: 사단장, 참모총장"
                    value={row.title}
                    onChange={(changeEvent) =>
                      updateRow(row.localId, { title: changeEvent.target.value })
                    }
                  />
                </SmallField>
                <SmallField>
                  <SmallLabel>대수 (선택)</SmallLabel>
                  <S.Input
                    type="text"
                    inputMode="numeric"
                    placeholder="제N대"
                    value={row.ordinal}
                    onChange={(changeEvent) =>
                      updateRow(row.localId, {
                        ordinal: changeEvent.target.value,
                      })
                    }
                  />
                </SmallField>
              </RoleFieldsGrid>

              <PeriodGrid>
                <SmallField as="div">
                  <SmallLabel>부임 · 시작 시점</SmallLabel>
                  <StructuredPartsDateField
                    era={row.startEra}
                    year={row.startYear}
                    month={row.startMonth}
                    day={row.startDay}
                    ariaLabel={`${row.personName} 부임 시점`}
                    pickerTitle={`${row.personName} 부임 시점 선택`}
                    onChange={(nextStart) =>
                      updateRow(row.localId, {
                        startEra: nextStart.era,
                        startYear: nextStart.year,
                        startMonth: nextStart.month,
                        startDay: nextStart.day,
                      })
                    }
                  />
                </SmallField>

                <SmallField as="div">
                  <SmallLabel>이임 · 종료 시점 (비우면 현임/미상)</SmallLabel>
                  <StructuredPartsDateField
                    era={row.endEra}
                    year={row.endYear}
                    month={row.endMonth}
                    day={row.endDay}
                    ariaLabel={`${row.personName} 이임 시점`}
                    pickerTitle={`${row.personName} 이임 시점 선택`}
                    onChange={(nextEnd) =>
                      updateRow(row.localId, {
                        endEra: nextEnd.era,
                        endYear: nextEnd.year,
                        endMonth: nextEnd.month,
                        endDay: nextEnd.day,
                      })
                    }
                  />
                </SmallField>
              </PeriodGrid>
            </PersonCard>
          ))}
        </PersonList>
      ) : null}

      {pickerOpen ? (
        <PersonPickerModal
          title="사령부·부대 인물 연결"
          multiSelect
          allowCreate
          defaultCountryId={countryId || undefined}
          defaultHistoricalCountryId={historicalCountryId || undefined}
          context={personContext}
          initialQuery={quickQuery.trim() || undefined}
          initialCreateMode={pickerCreateMode}
          onSelect={(personId, personName) => {
            handleAppendPerson(personId, personName)
          }}
          onClose={() => {
            setPickerOpen(false)
            setPickerCreateMode(false)
          }}
        />
      ) : null}
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

const PersonList = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: 2px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`

const PersonCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 2px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
`

const PersonCardTop = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
`

const PersonIdentity = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13.5px;
  color: ${({ theme }) => theme.colors.text.primary};
`

const RoleKindSwitch = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  gap: 2px;
  margin-left: auto;
  padding: 2px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
`

const RoleChip = styled.button<{ $active: boolean }>`
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

const RemoveRowBtn = styled.button`
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

const RoleFieldsGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr) 76px;
  gap: 7px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

const PeriodGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`

const SmallField = styled.label`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

const SmallLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
