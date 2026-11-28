import React, { useMemo, useState } from 'react'

import { FiArrowRight, FiGitCommit, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import * as S from '@/pages/events/create/event-create.styles'
import type { AdministrationDepartment } from '@/shared/api/administration-department'
import type {
  MilitaryUnit,
  MilitaryUnitLineageDto,
  MilitaryUnitTransitionKind,
  MilitaryUnitTransitionSyncInput,
} from '@/shared/api/military-unit'

import { militaryUnitTypeLabelKo } from '@/shared/lib/military-unit-type-label'

import * as FormS from './styles'

export type UnitLineageDirection =
  | 'PREDECESSOR_UNIT'
  | 'PREDECESSOR_DEPT'
  | 'SUCCESSOR_UNIT'

export interface UnitLineageDraft {
  localId: string
  direction: UnitLineageDirection
  targetId: string
  targetName: string
  targetBadge?: string
  kind: MilitaryUnitTransitionKind
  era: 'AD' | 'BC'
  year: string
  month: string
  note: string
}

let nextLineageSeq = 1

export const TRANSITION_KIND_OPTIONS: ReadonlyArray<{
  value: MilitaryUnitTransitionKind
  label: string
}> = [
  { value: 'REORGANIZE', label: '개편 · 승격' },
  { value: 'RENAME', label: '개칭' },
  { value: 'MERGE', label: '통합 · 합병' },
  { value: 'SPLIT', label: '분할 · 분리' },
  { value: 'ABSORBED', label: '흡수 · 편입' },
]

export const LINEAGE_DIRECTION_OPTIONS: ReadonlyArray<{
  value: UnitLineageDirection
  label: string
  shortLabel: string
}> = [
  {
    value: 'PREDECESSOR_UNIT',
    label: '전신 부대 (이전 편제 → 현 부대)',
    shortLabel: '전신 부대',
  },
  {
    value: 'PREDECESSOR_DEPT',
    label: '전신 부처 (행정부처 → 현 사령부)',
    shortLabel: '전신 부처',
  },
  {
    value: 'SUCCESSOR_UNIT',
    label: '후신 부대 (현 부대 → 이후 편제)',
    shortLabel: '후신 부대',
  },
]

export function hydrateUnitLineageDrafts(params: {
  predecessors?: ReadonlyArray<MilitaryUnitLineageDto> | null
  successors?: ReadonlyArray<MilitaryUnitLineageDto> | null
}): UnitLineageDraft[] {
  const list: UnitLineageDraft[] = []

  for (const pred of params.predecessors ?? []) {
    if (pred.targetType === 'DEPARTMENT' && pred.department?.id) {
      list.push({
        localId: `hydrated-pred-dept-${pred.transitionId}`,
        direction: 'PREDECESSOR_DEPT',
        targetId: pred.department.id,
        targetName: pred.department.name,
        targetBadge: pred.department.abbreviation || '행정부처',
        kind: pred.kind ?? 'REORGANIZE',
        era: pred.era === 'BC' ? 'BC' : 'AD',
        year: pred.year != null ? String(pred.year) : '',
        month: pred.month != null ? String(pred.month) : '',
        note: pred.note ?? '',
      })
    } else if (pred.unit?.id) {
      list.push({
        localId: `hydrated-pred-unit-${pred.transitionId}`,
        direction: 'PREDECESSOR_UNIT',
        targetId: pred.unit.id,
        targetName: pred.unit.name,
        targetBadge:
          (pred.unit.unitType
            ? militaryUnitTypeLabelKo(pred.unit.unitType)
            : null) ||
          pred.unit.abbreviation ||
          undefined,
        kind: pred.kind ?? 'REORGANIZE',
        era: pred.era === 'BC' ? 'BC' : 'AD',
        year: pred.year != null ? String(pred.year) : '',
        month: pred.month != null ? String(pred.month) : '',
        note: pred.note ?? '',
      })
    }
  }

  for (const succ of params.successors ?? []) {
    if (!succ.unit?.id) continue
    list.push({
      localId: `hydrated-succ-unit-${succ.transitionId}`,
      direction: 'SUCCESSOR_UNIT',
      targetId: succ.unit.id,
      targetName: succ.unit.name,
      targetBadge:
        (succ.unit.unitType
          ? militaryUnitTypeLabelKo(succ.unit.unitType)
          : null) ||
        succ.unit.abbreviation ||
        undefined,
      kind: succ.kind ?? 'REORGANIZE',
      era: succ.era === 'BC' ? 'BC' : 'AD',
      year: succ.year != null ? String(succ.year) : '',
      month: succ.month != null ? String(succ.month) : '',
      note: succ.note ?? '',
    })
  }

  return list
}

export function buildTransitionsSyncPayload(
  drafts: ReadonlyArray<UnitLineageDraft>,
): MilitaryUnitTransitionSyncInput[] {
  return drafts
    .filter((d) => Boolean(d.targetId))
    .map((d) => {
      const parsedYear = Number.parseInt(d.year.trim(), 10)
      const parsedMonth = Number.parseInt(d.month.trim(), 10)
      const validYear =
        Number.isFinite(parsedYear) && parsedYear > 0 ? parsedYear : null
      const validMonth =
        validYear &&
        Number.isFinite(parsedMonth) &&
        parsedMonth >= 1 &&
        parsedMonth <= 12
          ? parsedMonth
          : null

      return {
        direction: d.direction,
        targetId: d.targetId,
        kind: d.kind,
        era: validYear ? d.era : null,
        year: validYear,
        month: validMonth,
        note: d.note.trim() || null,
      }
    })
}

export interface UnitLineageEditorProps {
  drafts: UnitLineageDraft[]
  onChange: (next: UnitLineageDraft[]) => void
  currentUnitId?: string | null
  currentUnitName?: string
  candidateUnits: ReadonlyArray<MilitaryUnit>
  candidateDepartments: ReadonlyArray<AdministrationDepartment>
  defaultEra?: 'AD' | 'BC'
  defaultYear?: string
}

export const UnitLineageEditor: React.FC<UnitLineageEditorProps> = ({
  drafts,
  onChange,
  currentUnitId,
  currentUnitName,
  candidateUnits,
  candidateDepartments,
  defaultEra = 'AD',
  defaultYear = '',
}) => {
  const [addDirection, setAddDirection] =
    useState<UnitLineageDirection>('PREDECESSOR_UNIT')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)

  const filteredSuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const existingKeys = new Set(
      drafts.map((d) => `${d.direction}:${d.targetId}`),
    )

    if (addDirection === 'PREDECESSOR_DEPT') {
      return candidateDepartments
        .filter((dept) => {
          if (existingKeys.has(`PREDECESSOR_DEPT:${dept.id}`)) return false
          if (!q) return true
          const hay = `${dept.name} ${dept.abbreviation ?? ''} ${dept.nameEn ?? ''}`.toLowerCase()
          return hay.includes(q)
        })
        .slice(0, 8)
        .map((dept) => ({
          id: dept.id,
          name: dept.name,
          badge: dept.abbreviation || '행정부처',
        }))
    }

    return candidateUnits
      .filter((u) => {
        if (currentUnitId && u.id === currentUnitId) return false
        if (existingKeys.has(`${addDirection}:${u.id}`)) return false
        if (!q) return true
        const hay = `${u.name} ${u.abbreviation ?? ''} ${u.nameLocal ?? ''} ${u.nameEn ?? ''}`.toLowerCase()
        return hay.includes(q)
      })
      .slice(0, 8)
      .map((u) => ({
        id: u.id,
        name: u.name,
        badge:
          (u.unitType ? militaryUnitTypeLabelKo(u.unitType) : null) ||
          u.abbreviation ||
          undefined,
      }))
  }, [
    addDirection,
    searchQuery,
    candidateUnits,
    candidateDepartments,
    currentUnitId,
    drafts,
  ])

  const handleAppendTarget = (target: {
    id: string
    name: string
    badge?: string
  }) => {
    const nextDraft: UnitLineageDraft = {
      localId: `lineage-${Date.now()}-${nextLineageSeq++}`,
      direction: addDirection,
      targetId: target.id,
      targetName: target.name,
      targetBadge: target.badge,
      kind: 'REORGANIZE',
      era: defaultEra,
      year: defaultYear,
      month: '',
      note: '',
    }
    onChange([...drafts, nextDraft])
    setSearchQuery('')
  }

  const updateRow = (
    localId: string,
    patch: Partial<UnitLineageDraft>,
  ) => {
    onChange(
      drafts.map((item) =>
        item.localId === localId ? { ...item, ...patch } : item,
      ),
    )
  }

  const unitLabel = currentUnitName?.trim() || '현재 부대'

  return (
    <Wrap>
      <DirectionPills role="group" aria-label="개편 계보 방향 선택">
        {LINEAGE_DIRECTION_OPTIONS.map((opt) => (
          <DirectionChip
            key={opt.value}
            type="button"
            $active={addDirection === opt.value}
            onClick={() => {
              setAddDirection(opt.value)
              setSearchQuery('')
            }}
          >
            {opt.label}
          </DirectionChip>
        ))}
      </DirectionPills>

      <FormS.QuickSearchBox>
        <S.Input
          type="text"
          aria-label="연결할 전신·후신 부대 또는 부처 검색"
          placeholder={
            addDirection === 'PREDECESSOR_DEPT'
              ? '전신 행정부처 검색 (예: 제국전쟁부, 국방경비대 사령부)…'
              : addDirection === 'PREDECESSOR_UNIT'
                ? '전신 부대 검색 (예: 제2기갑집단 → 제2기갑군 승격 전 부대)…'
                : '후신 부대 검색 (예: 해체·개편 후 이어진 부대)…'
          }
          value={searchQuery}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => window.setTimeout(() => setSearchFocused(false), 180)}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchFocused && filteredSuggestions.length > 0 ? (
          <FormS.QuickSuggestionList role="listbox" aria-label="계보 연결 후보">
            {filteredSuggestions.map((cand) => (
              <FormS.QuickSuggestionItem
                key={cand.id}
                type="button"
                role="option"
                aria-selected={false}
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleAppendTarget(cand)
                }}
              >
                <span>{cand.name}</span>
                {cand.badge ? (
                  <FormS.ContextCardMeta>{cand.badge}</FormS.ContextCardMeta>
                ) : null}
              </FormS.QuickSuggestionItem>
            ))}
          </FormS.QuickSuggestionList>
        ) : null}
      </FormS.QuickSearchBox>

      {drafts.length > 0 ? (
        <LineageList>
          {drafts.map((row) => {
            const isPredecessor =
              row.direction === 'PREDECESSOR_UNIT' ||
              row.direction === 'PREDECESSOR_DEPT'
            return (
              <LineageCard key={row.localId}>
                <LineageFlowHead>
                  <FlowTag $variant={isPredecessor ? 'pred' : 'succ'}>
                    {row.direction === 'PREDECESSOR_DEPT'
                      ? '전신 부처'
                      : isPredecessor
                        ? '전신 부대'
                        : '후신 부대'}
                  </FlowTag>

                  <FlowVisual>
                    {isPredecessor ? (
                      <>
                        <strong>{row.targetName}</strong>
                        {row.targetBadge ? (
                          <FormS.ContextCardMeta>
                            {row.targetBadge}
                          </FormS.ContextCardMeta>
                        ) : null}
                        <FiArrowRight size={13} />
                        <CurrentSelfBadge>{unitLabel}</CurrentSelfBadge>
                      </>
                    ) : (
                      <>
                        <CurrentSelfBadge>{unitLabel}</CurrentSelfBadge>
                        <FiArrowRight size={13} />
                        <strong>{row.targetName}</strong>
                        {row.targetBadge ? (
                          <FormS.ContextCardMeta>
                            {row.targetBadge}
                          </FormS.ContextCardMeta>
                        ) : null}
                      </>
                    )}
                  </FlowVisual>

                  <RemoveLineageBtn
                    type="button"
                    aria-label={`${row.targetName} 계보 제거`}
                    onClick={() =>
                      onChange(drafts.filter((d) => d.localId !== row.localId))
                    }
                  >
                    <FiX size={14} />
                  </RemoveLineageBtn>
                </LineageFlowHead>

                <LineageDetailRow>
                  <KindSelect
                    aria-label="개편 유형"
                    value={row.kind}
                    onChange={(e) =>
                      updateRow(row.localId, {
                        kind: e.target.value as MilitaryUnitTransitionKind,
                      })
                    }
                  >
                    {TRANSITION_KIND_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </KindSelect>

                  <DateCompactGroup>
                    <EraSelect
                      aria-label="개편 기원"
                      value={row.era}
                      onChange={(e) =>
                        updateRow(row.localId, {
                          era: e.target.value as 'AD' | 'BC',
                        })
                      }
                    >
                      <option value="AD">서기</option>
                      <option value="BC">BC</option>
                    </EraSelect>
                    <CompactNumInput
                      type="number"
                      min={1}
                      max={9999}
                      placeholder="연도"
                      aria-label="개편 연도"
                      value={row.year}
                      onChange={(e) =>
                        updateRow(row.localId, { year: e.target.value })
                      }
                    />
                    <CompactNumInput
                      type="number"
                      min={1}
                      max={12}
                      placeholder="월"
                      aria-label="개편 월"
                      value={row.month}
                      onChange={(e) =>
                        updateRow(row.localId, { month: e.target.value })
                      }
                    />
                  </DateCompactGroup>

                  <S.Input
                    type="text"
                    placeholder="개편 사유 · 경위 메모 (예: 1941년 10월 기갑군으로 승격 개칭)"
                    value={row.note}
                    onChange={(e) =>
                      updateRow(row.localId, { note: e.target.value })
                    }
                  />
                </LineageDetailRow>
              </LineageCard>
            )
          })}
        </LineageList>
      ) : (
        <EmptyHint>
          <FiGitCommit size={13} />
          개칭·승격·통합·분할된 전신·후신 편제를 연결하면 부대 계보 트리가 자동으로 이어집니다.
        </EmptyHint>
      )}
    </Wrap>
  )
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const DirectionPills = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const DirectionChip = styled.button<{ $active: boolean }>`
  height: 28px;
  padding: 0 10px;
  border-radius: 7px;
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
  font-size: 11.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 550)};
  cursor: pointer;
`

const LineageList = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: 2px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`

const LineageCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 11px 2px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const LineageFlowHead = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
`

const FlowTag = styled.span<{ $variant: 'pred' | 'succ' }>`
  padding: 2px 7px;
  border-radius: 5px;
  font-size: 10.5px;
  font-weight: 700;
  background: ${({ $variant, theme }) =>
    $variant === 'pred'
      ? theme.mode === 'dark'
        ? 'rgba(245, 158, 11, 0.18)'
        : 'rgba(245, 158, 11, 0.1)'
      : theme.mode === 'dark'
        ? 'rgba(16, 185, 129, 0.18)'
        : 'rgba(16, 185, 129, 0.1)'};
  color: ${({ $variant, theme }) =>
    $variant === 'pred'
      ? theme.mode === 'dark'
        ? '#fbbf24'
        : '#b45309'
      : theme.mode === 'dark'
        ? '#34d399'
        : '#047857'};
`

const FlowVisual = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};
`

const CurrentSelfBadge = styled.span`
  padding: 2px 7px;
  border-radius: 5px;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(148, 163, 184, 0.14)'
      : 'rgba(15, 23, 42, 0.05)'};
`

const RemoveLineageBtn = styled.button`
  margin-left: auto;
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

const LineageDetailRow = styled.div`
  display: grid;
  grid-template-columns: 130px auto minmax(0, 1fr);
  gap: 7px;
  align-items: center;

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`

const KindSelect = styled.select`
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

const DateCompactGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`

const EraSelect = styled.select`
  height: 36px;
  padding: 0 6px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(15, 23, 42, 0.5)' : '#ffffff'};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-size: 12px;
`

const CompactNumInput = styled.input`
  width: 68px;
  height: 36px;
  padding: 0 8px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(15, 23, 42, 0.5)' : '#ffffff'};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
`

const EmptyHint = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
