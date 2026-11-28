import React, { useMemo, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FiAward, FiPlus, FiUser, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import * as S from '@/pages/events/create/event-create.styles'
import {
  MILITARY_RANK_CATEGORY_LABELS,
  type MilitaryBranchCode,
  type MilitaryRankCategory,
  type MilitaryRankDto,
  militaryRankApi,
} from '@/shared/api/military-rank'
import type {
  MilitaryUnitRoleKind,
  MilitaryUnitType,
} from '@/shared/api/military-unit'
import {
  type CreateGovernmentPositionTenureDto,
  personCareerApi,
  type UpdateGovernmentPositionTenureDto,
} from '@/shared/api/person-career'
import { searchPersons } from '@/shared/api/persons'
import { getApiErrorMessage } from '@/shared/lib/get-api-error-message'
import { ensureOwnedPositionDefinition } from '@/shared/lib/government-position/ensure-owned-position-definition'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import {
  PersonPickerModal,
  type PersonPickerContext,
} from '@/shared/ui/person-picker'
import { notify } from '@/shared/ui/toast'

import {
  defaultCommanderTitleForUnitType,
  MILITARY_ROLE_KIND_LABELS,
} from './constants'
import { StructuredPartsDateField } from './structured-parts-date-field'
import * as FormS from './styles'

export type UnitPersonRoleKind = MilitaryUnitRoleKind

export interface UnitPersonLinkDraft {
  localId: string
  existingTenureId?: string
  personId: string
  personName: string
  roleKind: UnitPersonRoleKind
  militaryRankId: string
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
    militaryRankId: '',
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
  militaryRankId?: string | null
  militaryRoleKind?: MilitaryUnitRoleKind | string | null
  militaryRank?: {
    id: string
    name: string
    nameLocal?: string | null
  } | null
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
    nameDisplayOrder?: string | null
    country?: {
      name?: string | null
      defaultNameDisplayOrder?: string | null
      isoCode?: string | null
    } | null
  } | null
}

function resolveHydratedRoleKind(
  tenureRow: HydratableUnitTenure,
  titleText: string,
): UnitPersonRoleKind {
  const explicit = tenureRow.militaryRoleKind
  if (
    explicit === 'COMMANDER' ||
    explicit === 'DEPUTY_COMMANDER' ||
    explicit === 'CHIEF_OF_STAFF' ||
    explicit === 'STAFF' ||
    explicit === 'COMMISSAR' ||
    explicit === 'FOUNDER_MEMBER'
  ) {
    return explicit
  }
  if (tenureRow.positionType === 'OTHER') return 'FOUNDER_MEMBER'
  if (/정치위원|군사위원|군사회의/.test(titleText)) return 'COMMISSAR'
  if (/참모총장|총참모장|참모장|참모본부장/.test(titleText)) {
    return 'CHIEF_OF_STAFF'
  }
  if (/부사령관|부군단장|부사단장|부여단장|차장/.test(titleText)) {
    return 'DEPUTY_COMMANDER'
  }
  if (/참모|처장|부장|국장/.test(titleText)) return 'STAFF'
  return 'COMMANDER'
}

export function hydrateUnitPersonDrafts(
  tenures: ReadonlyArray<HydratableUnitTenure> | undefined | null,
): UnitPersonLinkDraft[] {
  if (!tenures || tenures.length === 0) return []
  return tenures.map((tenureRow) => {
    const personObj = tenureRow.person
    const personName = personObj
      ? getPersonDisplayName({ ...personObj, name: personObj.name ?? '' }) ||
        personObj.name ||
        '연결된 인물'
      : '연결된 인물'

    const titleText = String(
      tenureRow.title ?? tenureRow.positionDefinition?.title ?? '사령관',
    )
    const roleKind = resolveHydratedRoleKind(tenureRow, titleText)

    return {
      localId: `hydrated-tenure-${tenureRow.id}`,
      existingTenureId: String(tenureRow.id),
      personId: String(personObj?.id ?? tenureRow.personId ?? ''),
      personName,
      roleKind,
      militaryRankId:
        tenureRow.militaryRankId ?? tenureRow.militaryRank?.id ?? '',
      rankTitle:
        tenureRow.militaryRank?.name ?? tenureRow.rankTitle ?? '',
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
  fallbackStartEra?: 'AD' | 'BC'
  fallbackStartYear?: string
  drafts: ReadonlyArray<UnitPersonLinkDraft>
  initialTenureIds: ReadonlyArray<string>
}): Promise<{ affectedPersonIds: string[] }> {
  const {
    unitId,
    unitType,
    countryId,
    historicalCountryId,
    fallbackStartEra = 'AD',
    fallbackStartYear = '',
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
  const parsedFallbackYear = Number.parseInt(fallbackStartYear.trim(), 10)
  const defaultYearNum =
    Number.isInteger(parsedFallbackYear) && parsedFallbackYear > 0
      ? parsedFallbackYear
      : new Date().getFullYear()

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
    const startInfo =
      (startRes.ok ? startRes.info : null) ?? {
        era: fallbackStartEra,
        year: defaultYearNum,
      }
    const endInfo = endRes.ok ? endRes.info : null

    const positionType: CreateGovernmentPositionTenureDto['positionType'] =
      draft.roleKind === 'FOUNDER_MEMBER' ? 'OTHER' : 'MILITARY_COMMANDER'
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
        militaryRankId: draft.militaryRankId || null,
        militaryRoleKind: draft.roleKind,
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
        militaryRankId: draft.militaryRankId || undefined,
        militaryRoleKind: draft.roleKind,
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

interface RankSelectorFieldProps {
  selectedRankId: string
  rankTitle: string
  ranks: MilitaryRankDto[]
  countryId: string
  historicalCountryId: string
  countryName: string
  branch: string
  onSelectRank: (rank: MilitaryRankDto | null) => void
  onRankCreated: (rank: MilitaryRankDto) => void
}

const RankSelectorField: React.FC<RankSelectorFieldProps> = ({
  selectedRankId,
  rankTitle,
  ranks,
  countryId,
  historicalCountryId,
  countryName,
  branch,
  onSelectRank,
  onRankCreated,
}) => {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [creatingOpen, setCreatingOpen] = useState(false)
  const [newRankName, setNewRankName] = useState('')
  const [newRankLocal, setNewRankLocal] = useState('')
  const [newRankCategory, setNewRankCategory] =
    useState<MilitaryRankCategory>('GENERAL')
  const [newRankScopedToPolity, setNewRankScopedToPolity] = useState(
    Boolean(historicalCountryId),
  )
  const [creatingSubmitting, setCreatingSubmitting] = useState(false)

  const selectedRank = useMemo(
    () => ranks.find((r) => r.id === selectedRankId) ?? null,
    [ranks, selectedRankId],
  )

  const filteredRanks = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return ranks.slice(0, 18)
    return ranks
      .filter((r) =>
        [r.name, r.nameLocal, r.nameEn, r.abbreviation, r.natoCode]
          .filter(Boolean)
          .some((val) => String(val).toLowerCase().includes(q)),
      )
      .slice(0, 18)
  }, [ranks, query])

  const quickRanks = useMemo(() => {
    const scoped = ranks
      .filter(
        (r) =>
          (historicalCountryId &&
            r.historicalCountryId === historicalCountryId) ||
          (countryId && r.countryId === countryId),
      )
      .slice(0, 3)
    const standardNames = ['원수', '대장', '중장', '소장', '준장', '대령']
    const standards = standardNames
      .map((n) => ranks.find((r) => r.isUniversal && r.name === n) ?? null)
      .filter((r): r is MilitaryRankDto => r !== null)
    const seen = new Set<string>()
    const merged: MilitaryRankDto[] = []
    for (const item of [...scoped, ...standards]) {
      if (seen.has(item.id)) continue
      seen.add(item.id)
      merged.push(item)
    }
    return merged.slice(0, 7)
  }, [ranks, countryId, historicalCountryId])

  const handleCreateRank = async () => {
    const trimmed = newRankName.trim()
    if (!trimmed) {
      notify.error('새로 등록할 계급명을 입력해 주세요.')
      return
    }
    setCreatingSubmitting(true)
    try {
      const created = await militaryRankApi.createOrResolve({
        name: trimmed,
        nameLocal: newRankLocal.trim() || null,
        category: newRankCategory,
        branch: (branch as MilitaryBranchCode) || null,
        countryId:
          newRankScopedToPolity && !historicalCountryId
            ? countryId || null
            : null,
        historicalCountryId: newRankScopedToPolity
          ? historicalCountryId || null
          : null,
      })
      onRankCreated(created)
      onSelectRank(created)
      setCreatingOpen(false)
      setNewRankName('')
      setNewRankLocal('')
      setQuery('')
      notify.success(`군 계급 「${created.name}」을(를) 카탈로그에 등록했습니다.`)
    } catch (err) {
      notify.error(getApiErrorMessage(err, '군 계급 등록에 실패했습니다.'))
    } finally {
      setCreatingSubmitting(false)
    }
  }

  return (
    <RankBox>
      {selectedRank || rankTitle.trim() ? (
        <SelectedRankChip>
          <FiAward size={12} />
          <strong>{selectedRank?.name ?? rankTitle}</strong>
          {selectedRank?.nameLocal ? (
            <RankLocalMeta>{selectedRank.nameLocal}</RankLocalMeta>
          ) : null}
          {selectedRank?.natoCode ? (
            <RankCodeBadge>{selectedRank.natoCode}</RankCodeBadge>
          ) : null}
          <RankClearBtn
            type="button"
            aria-label="선택된 계급 해제"
            onClick={() => onSelectRank(null)}
          >
            <FiX size={12} />
          </RankClearBtn>
        </SelectedRankChip>
      ) : (
        <FormS.QuickSearchBox>
          <S.Input
            type="text"
            aria-label="군 계급 검색 및 선택"
            placeholder="계급 검색·선택 (원수, 상급대장, 중장…)"
            value={query}
            onFocus={() => setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 180)}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
          />
          {open ? (
            <FormS.QuickSuggestionList role="listbox" aria-label="군 계급 카탈로그">
              {filteredRanks.map((rk) => (
                <FormS.QuickSuggestionItem
                  key={rk.id}
                  type="button"
                  role="option"
                  aria-selected={rk.id === selectedRankId}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    onSelectRank(rk)
                    setQuery('')
                    setOpen(false)
                  }}
                >
                  <span>
                    <strong>{rk.name}</strong>
                    {rk.nameLocal ? ` (${rk.nameLocal})` : ''}
                  </span>
                  <FormS.ContextCardMeta>
                    {[
                      rk.historicalCountry?.name ?? rk.country?.name,
                      MILITARY_RANK_CATEGORY_LABELS[rk.category],
                      rk.natoCode,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </FormS.ContextCardMeta>
                </FormS.QuickSuggestionItem>
              ))}
              <FormS.QuickSuggestionItem
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  setNewRankName(query.trim())
                  setCreatingOpen(true)
                  setOpen(false)
                }}
              >
                <span style={{ fontWeight: 600 }}>
                  + {query.trim() ? `‘${query.trim()}’ ` : ''}새 계급을 DB 카탈로그에 등록
                </span>
              </FormS.QuickSuggestionItem>
            </FormS.QuickSuggestionList>
          ) : null}
        </FormS.QuickSearchBox>
      )}

      {!selectedRank && !rankTitle.trim() && quickRanks.length > 0 ? (
        <QuickRankChipsRow>
          {quickRanks.map((rk) => (
            <QuickRankChip
              key={rk.id}
              type="button"
              onClick={() => onSelectRank(rk)}
              title={rk.nameLocal ? `${rk.name} (${rk.nameLocal})` : rk.name}
            >
              {rk.name}
            </QuickRankChip>
          ))}
        </QuickRankChipsRow>
      ) : null}

      {creatingOpen ? (
        <InlineCreateRankBox>
          <InlineCreateHead>
            <span>새 군 계급 정본 등록</span>
            <RankClearBtn
              type="button"
              aria-label="계급 등록 닫기"
              onClick={() => setCreatingOpen(false)}
            >
              <FiX size={12} />
            </RankClearBtn>
          </InlineCreateHead>
          <InlineCreateGrid>
            <S.Input
              type="text"
              placeholder="계급명 (예: 상급대장, 기갑대장)"
              value={newRankName}
              onChange={(e) => setNewRankName(e.target.value)}
            />
            <S.Input
              type="text"
              placeholder="원어 표기 (선택, 예: Generaloberst)"
              value={newRankLocal}
              onChange={(e) => setNewRankLocal(e.target.value)}
            />
          </InlineCreateGrid>
          <InlineCreateFooter>
            <CategorySelect
              aria-label="계급군 분류"
              value={newRankCategory}
              onChange={(e) =>
                setNewRankCategory(e.target.value as MilitaryRankCategory)
              }
            >
              {(
                Object.entries(MILITARY_RANK_CATEGORY_LABELS) as Array<
                  [MilitaryRankCategory, string]
                >
              ).map(([catKey, catLabel]) => (
                <option key={catKey} value={catKey}>
                  {catLabel}
                </option>
              ))}
            </CategorySelect>
            {countryName ? (
              <ScopeToggleLabel>
                <input
                  type="checkbox"
                  checked={newRankScopedToPolity}
                  onChange={(e) => setNewRankScopedToPolity(e.target.checked)}
                />
                <span>{countryName} 고유 계급으로 귀속</span>
              </ScopeToggleLabel>
            ) : null}
            <InlineSaveBtn
              type="button"
              disabled={creatingSubmitting}
              onClick={() => void handleCreateRank()}
            >
              {creatingSubmitting ? '등록 중…' : '계급 등록 · 선택'}
            </InlineSaveBtn>
          </InlineCreateFooter>
        </InlineCreateRankBox>
      ) : null}
    </RankBox>
  )
}

const ROLE_KIND_OPTIONS: ReadonlyArray<{
  value: UnitPersonRoleKind
  label: string
}> = [
  { value: 'COMMANDER', label: MILITARY_ROLE_KIND_LABELS.COMMANDER },
  { value: 'DEPUTY_COMMANDER', label: MILITARY_ROLE_KIND_LABELS.DEPUTY_COMMANDER },
  { value: 'CHIEF_OF_STAFF', label: MILITARY_ROLE_KIND_LABELS.CHIEF_OF_STAFF },
  { value: 'STAFF', label: MILITARY_ROLE_KIND_LABELS.STAFF },
  { value: 'COMMISSAR', label: MILITARY_ROLE_KIND_LABELS.COMMISSAR },
  { value: 'FOUNDER_MEMBER', label: MILITARY_ROLE_KIND_LABELS.FOUNDER_MEMBER },
]

export interface UnitPersonLinksEditorProps {
  drafts: UnitPersonLinkDraft[]
  onChange: (next: UnitPersonLinkDraft[]) => void
  unitType: MilitaryUnitType | ''
  branch?: string
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
  branch = '',
  countryId,
  historicalCountryId,
  countryName,
  establishedEra,
  establishedYear,
  disbandedEra,
  disbandedYear,
}) => {
  const queryClient = useQueryClient()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerCreateMode, setPickerCreateMode] = useState(false)
  const [quickQuery, setQuickQuery] = useState('')
  const [quickFocused, setQuickFocused] = useState(false)

  const trimmedPersonQuery = quickQuery.trim()
  const { data: quickSuggestions = [] } = useQuery({
    queryKey: ['persons', 'search', trimmedPersonQuery],
    queryFn: () => searchPersons(trimmedPersonQuery, 8),
    enabled: quickFocused && trimmedPersonQuery.length >= 1,
    staleTime: 60_000,
  })

  const rankQueryKey = useMemo(
    () => [
      'military-ranks',
      countryId || '',
      historicalCountryId || '',
      branch || '',
    ],
    [countryId, historicalCountryId, branch],
  )

  const { data: availableRanks = [] } = useQuery({
    queryKey: rankQueryKey,
    queryFn: () =>
      militaryRankApi.list({
        countryId: countryId || null,
        historicalCountryId: historicalCountryId || null,
        branch: branch || null,
      }),
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
            placeholder="사령관 · 참모장 · 주요 인물 이름 빠른 검색…"
            aria-label="연결할 인물 검색"
            value={quickQuery}
            onFocus={() => setQuickFocused(true)}
            onBlur={() => window.setTimeout(() => setQuickFocused(false), 180)}
            onChange={(e) => setQuickQuery(e.target.value)}
          />
          {quickFocused && trimmedPersonQuery ? (
            <FormS.QuickSuggestionList role="listbox" aria-label="인물 검색 결과">
              {quickSuggestions.map((person) => {
                const displayName =
                  getPersonDisplayName({ ...person, name: person.name ?? '' }) ||
                  person.name
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
                    <FormS.ContextCardMeta>
                      {person.originalName ?? ''}
                    </FormS.ContextCardMeta>
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
                  + ‘{trimmedPersonQuery}’ 새 인물로 즉석 등록 후 연결
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
                  {ROLE_KIND_OPTIONS.map((opt) => (
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
                <SmallField as="div">
                  <SmallLabel>군 계급 정본 (선택)</SmallLabel>
                  <RankSelectorField
                    selectedRankId={row.militaryRankId}
                    rankTitle={row.rankTitle}
                    ranks={availableRanks}
                    countryId={countryId}
                    historicalCountryId={historicalCountryId}
                    countryName={countryName}
                    branch={branch}
                    onSelectRank={(pickedRank) => {
                      updateRow(row.localId, {
                        militaryRankId: pickedRank?.id ?? '',
                        rankTitle: pickedRank?.name ?? '',
                      })
                    }}
                    onRankCreated={(createdRank) => {
                      queryClient.setQueryData<MilitaryRankDto[]>(
                        rankQueryKey,
                        (prev) => {
                          const list = prev ?? []
                          if (list.some((item) => item.id === createdRank.id)) {
                            return list
                          }
                          return [createdRank, ...list]
                        },
                      )
                      void queryClient.invalidateQueries({
                        queryKey: ['military-ranks'],
                      })
                    }}
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
                  <SmallLabel>
                    부임 · 시작 시점 <S.Required>*</S.Required>
                  </SmallLabel>
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
          initialQuery={trimmedPersonQuery || undefined}
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
  gap: 9px;
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

const RoleChip = styled.button<{ $active?: boolean }>`
  height: 23px;
  padding: 0 7px;
  border-radius: 5px;
  border: none;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.24)'
        : 'rgba(99, 102, 241, 0.12)'
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.text.secondary};
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
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
    color: #ef4444;
    background: rgba(239, 68, 68, 0.08);
  }
`

const RoleFieldsGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1.1fr) 84px;
  gap: 8px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

const PeriodGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;

  @media (max-width: 640px) {
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
  color: ${({ theme }) => theme.colors.text.secondary};
`

const RankBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`

const SelectedRankChip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.35)'
        : 'rgba(79, 70, 229, 0.25)'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99, 102, 241, 0.12)'
      : 'rgba(79, 70, 229, 0.05)'};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12.5px;
`

const RankLocalMeta = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const RankCodeBadge = styled.span`
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)'};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const RankClearBtn = styled.button`
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const QuickRankChipsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`

const QuickRankChip = styled.button`
  height: 22px;
  padding: 0 7px;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`

const InlineCreateRankBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 9px 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};
`

const InlineCreateHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const InlineCreateGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`

const InlineCreateFooter = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
`

const CategorySelect = styled.select`
  height: 28px;
  padding: 0 8px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 11.5px;
`

const ScopeToggleLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
`

const InlineSaveBtn = styled.button`
  margin-left: auto;
  height: 28px;
  padding: 0 10px;
  border-radius: 6px;
  border: none;
  background: ${({ theme }) => theme.colors.primary};
  color: #ffffff;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`
