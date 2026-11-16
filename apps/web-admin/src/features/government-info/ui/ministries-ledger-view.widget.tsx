import { useMemo, useState } from 'react'
import {
  FiArrowDown,
  FiArrowUp,
  FiGitCommit,
  FiPlus,
  FiShield,
  FiUsers,
} from 'react-icons/fi'
import styled from 'styled-components'

import {
  type AdministrationDepartment,
  type AdministrationDepartmentCategory,
  DEPARTMENT_KIND_LABEL,
} from '@/shared/api/administration-department'
import {
  type DepartmentLifecycleStatus,
  resolveDepartmentLifecycleStatus,
} from '@/shared/lib/ministry-department/ministry-department-utils'
import { parseSignedDateParts } from '@/shared/lib/tenure-person-utils'

import { GOV_BRAND } from './government-ledger.styles'

export interface MinistriesLedgerViewProps {
  departments: AdministrationDepartment[]
  allDepartments: AdministrationDepartment[]
  categories: AdministrationDepartmentCategory[]
  selectedDepartmentId?: string | null
  compact?: boolean
  onSelectDepartment: (department: AdministrationDepartment) => void
  onAddRoot?: () => void
}

type SortField = 'established' | 'name' | 'tenures'
type SortDirection = 'asc' | 'desc'

function formatDepartmentYearPoint(
  structuredParts: AdministrationDepartment['established'] | undefined,
  isoValue: string | null | undefined,
): string | null {
  if (
    structuredParts &&
    typeof structuredParts.year === 'number' &&
    structuredParts.year > 0
  ) {
    const eraPrefix = structuredParts.era === 'BC' ? 'BC ' : ''
    const monthPart =
      structuredParts.month != null
        ? `.${String(structuredParts.month).padStart(2, '0')}`
        : ''
    return `${eraPrefix}${structuredParts.year}${monthPart}`
  }
  const parsed = parseSignedDateParts(isoValue)
  if (!parsed) return null
  const eraPrefix = parsed.era === 'BC' ? 'BC ' : ''
  return `${eraPrefix}${parsed.absYear}`
}

function getDepartmentEstablishedSortKey(
  departmentItem: AdministrationDepartment,
): number {
  const structured = departmentItem.established
  if (structured && typeof structured.year === 'number' && structured.year > 0) {
    const signedYear =
      structured.era === 'BC'
        ? -Math.abs(structured.year)
        : structured.year
    const monthNum = structured.month ?? 1
    const dayNum = structured.day ?? 1
    return signedYear * 10000 + monthNum * 100 + dayNum
  }
  const parsed = parseSignedDateParts(departmentItem.establishedDate)
  if (!parsed) return Number.MAX_SAFE_INTEGER
  return parsed.signedYear * 10000 + parsed.month * 100 + parsed.day
}

export function MinistriesLedgerView({
  departments,
  allDepartments,
  categories,
  selectedDepartmentId,
  compact = false,
  onSelectDepartment,
  onAddRoot,
}: MinistriesLedgerViewProps) {
  const [sortField, setSortField] = useState<SortField>('established')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const departmentById = useMemo(() => {
    const lookup = new Map<string, AdministrationDepartment>()
    for (const deptItem of allDepartments) {
      lookup.set(deptItem.id, deptItem)
    }
    return lookup
  }, [allDepartments])

  const categoryNameById = useMemo(() => {
    const lookup = new Map<string, string>()
    for (const catItem of categories) {
      lookup.set(catItem.id, catItem.name)
    }
    return lookup
  }, [categories])

  const sortedDepartments = useMemo(() => {
    const dirMultiplier = sortDirection === 'asc' ? 1 : -1
    return [...departments].sort((leftDept, rightDept) => {
      if (sortField === 'name') {
        return (
          leftDept.name.localeCompare(rightDept.name, 'ko') * dirMultiplier
        )
      }
      if (sortField === 'tenures') {
        const leftTenures = leftDept.tenureCount ?? 0
        const rightTenures = rightDept.tenureCount ?? 0
        if (leftTenures !== rightTenures) {
          return (leftTenures - rightTenures) * dirMultiplier
        }
        return leftDept.name.localeCompare(rightDept.name, 'ko')
      }
      const leftKey = getDepartmentEstablishedSortKey(leftDept)
      const rightKey = getDepartmentEstablishedSortKey(rightDept)
      if (leftKey !== rightKey) {
        if (leftKey === Number.MAX_SAFE_INTEGER) return 1
        if (rightKey === Number.MAX_SAFE_INTEGER) return -1
        return (leftKey - rightKey) * dirMultiplier
      }
      return leftDept.name.localeCompare(rightDept.name, 'ko')
    })
  }, [departments, sortField, sortDirection])

  const toggleSort = (targetField: SortField) => {
    if (sortField === targetField) {
      setSortDirection((prevDir) => (prevDir === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(targetField)
      setSortDirection(targetField === 'tenures' ? 'desc' : 'asc')
    }
  }

  return (
    <LedgerContainer>
      <LedgerHeaderBar>
        <LedgerMetaText>
          원장 목록 <strong>{sortedDepartments.length}</strong>개 기관
        </LedgerMetaText>
        <LedgerHeaderActions>
          <SortPillBtn
            type="button"
            $active={sortField === 'established'}
            onClick={() => toggleSort('established')}
          >
            설립연도순
            {sortField === 'established' ? (
              sortDirection === 'asc' ? (
                <FiArrowUp size={11} />
              ) : (
                <FiArrowDown size={11} />
              )
            ) : null}
          </SortPillBtn>
          <SortPillBtn
            type="button"
            $active={sortField === 'name'}
            onClick={() => toggleSort('name')}
          >
            이름순
            {sortField === 'name' ? (
              sortDirection === 'asc' ? (
                <FiArrowUp size={11} />
              ) : (
                <FiArrowDown size={11} />
              )
            ) : null}
          </SortPillBtn>
          <SortPillBtn
            type="button"
            $active={sortField === 'tenures'}
            onClick={() => toggleSort('tenures')}
          >
            인사순
            {sortField === 'tenures' ? (
              sortDirection === 'asc' ? (
                <FiArrowUp size={11} />
              ) : (
                <FiArrowDown size={11} />
              )
            ) : null}
          </SortPillBtn>
          {!compact && onAddRoot ? (
            <AddInlineBtn type="button" onClick={onAddRoot}>
              <FiPlus size={12} />
              등록
            </AddInlineBtn>
          ) : null}
        </LedgerHeaderActions>
      </LedgerHeaderBar>

      <TableScrollArea>
        <LedgerTable>
          <thead>
            <tr>
              <Th style={{ width: compact ? 116 : 140 }}>존속 기간</Th>
              <Th>기관명</Th>
              <Th style={{ width: compact ? 112 : 160 }}>성격 · 분류</Th>
              {!compact ? <Th style={{ width: 150 }}>상위 기관</Th> : null}
              <Th style={{ width: compact ? 98 : 136, textAlign: 'right' }}>
                역대 인사 · 계보
              </Th>
            </tr>
          </thead>
          <tbody>
            {sortedDepartments.map((deptRow) => {
              const estLabel = formatDepartmentYearPoint(
                deptRow.established,
                deptRow.establishedDate,
              )
              const abolLabel = formatDepartmentYearPoint(
                deptRow.abolished,
                deptRow.abolishedDate,
              )
              const lifecycleStatus = resolveDepartmentLifecycleStatus(deptRow)
              const endFallbackLabel =
                lifecycleStatus === 'SUPERSEDED'
                  ? '개편'
                  : lifecycleStatus === 'HISTORICAL_ENDED'
                    ? '시대 종료'
                    : lifecycleStatus === 'ABOLISHED'
                      ? '폐지'
                      : '현존'
              const periodText =
                estLabel || abolLabel
                  ? `${estLabel ?? '?'} ~ ${abolLabel ?? endFallbackLabel}`
                  : lifecycleStatus === 'HISTORICAL_ENDED'
                    ? '역사 기관'
                    : '연도 미등록'
              const kindText =
                (deptRow.kind && DEPARTMENT_KIND_LABEL[deptRow.kind]) || '부처'
              const catText = deptRow.categoryId
                ? (categoryNameById.get(deptRow.categoryId) ?? null)
                : null
              const parentRef = deptRow.parentId
                ? departmentById.get(deptRow.parentId) ?? null
                : null
              const predCount = (deptRow.predecessors ?? []).length
              const succCount =
                (deptRow.successors ?? []).length +
                (deptRow.militaryUnitSuccessors ?? []).length
              const lineageTotal = predCount + succCount
              const tenureCount = deptRow.tenureCount ?? 0
              const unitCount = (deptRow.militaryUnits ?? []).length
              const isSelected = selectedDepartmentId === deptRow.id

              return (
                <Tr
                  key={deptRow.id}
                  $selected={isSelected}
                  onClick={() => onSelectDepartment(deptRow)}
                >
                  <Td>
                    <PeriodStack>
                      <StatusDot $status={lifecycleStatus} />
                      <PeriodText $muted={!estLabel && !abolLabel}>
                        {periodText}
                      </PeriodText>
                    </PeriodStack>
                  </Td>
                  <Td>
                    <NamePrimary>
                      <span>{deptRow.name}</span>
                      {deptRow.abbreviation?.trim() ? (
                        <AbbrTag>({deptRow.abbreviation.trim()})</AbbrTag>
                      ) : null}
                    </NamePrimary>
                    <SubInfoRow>
                      {deptRow.historicalCountry?.name ? (
                        <EraTag>{deptRow.historicalCountry.name}</EraTag>
                      ) : null}
                      {compact && parentRef ? (
                        <ParentHint>↳ {parentRef.name}</ParentHint>
                      ) : null}
                      {!compact &&
                      (deptRow.nameLocal?.trim() || deptRow.nameEn?.trim()) ? (
                        <ForeignNameText>
                          {[deptRow.nameLocal?.trim(), deptRow.nameEn?.trim()]
                            .filter(Boolean)
                            .join(' · ')}
                        </ForeignNameText>
                      ) : null}
                    </SubInfoRow>
                  </Td>
                  <Td>
                    <BadgeRow>
                      <KindBadge>{kindText}</KindBadge>
                      {catText ? <CatBadge>{catText}</CatBadge> : null}
                    </BadgeRow>
                  </Td>
                  {!compact ? (
                    <Td>
                      {parentRef ? (
                        <ParentCellText title={parentRef.name}>
                          {parentRef.name}
                        </ParentCellText>
                      ) : (
                        <DashText>최상위 기관</DashText>
                      )}
                    </Td>
                  ) : null}
                  <Td style={{ textAlign: 'right' }}>
                    <MetricGroup>
                      {tenureCount > 0 ? (
                        <MetricChip $primary title={`역대 수장·인사 재임 ${tenureCount}명`}>
                          <FiUsers size={11} />
                          {tenureCount}
                        </MetricChip>
                      ) : null}
                      {lineageTotal > 0 ? (
                        <MetricChip title={`전신 ${predCount} · 후신 ${succCount}`}>
                          <FiGitCommit size={11} />
                          {lineageTotal}
                        </MetricChip>
                      ) : null}
                      {unitCount > 0 ? (
                        <MetricChip $defense title={`소관 군부대 ${unitCount}개`}>
                          <FiShield size={11} />
                          {unitCount}
                        </MetricChip>
                      ) : null}
                      {tenureCount === 0 &&
                      lineageTotal === 0 &&
                      unitCount === 0 ? (
                        <DashText>—</DashText>
                      ) : null}
                    </MetricGroup>
                  </Td>
                </Tr>
              )
            })}
          </tbody>
        </LedgerTable>
      </TableScrollArea>
    </LedgerContainer>
  )
}

const LedgerContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
`

const LedgerHeaderBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.07)'
        : 'rgba(20, 19, 34, 0.07)'};
`

const LedgerMetaText = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-variant-numeric: tabular-nums;

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const LedgerHeaderActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 5px;
`

const SortPillBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 25px;
  padding: 0 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid
    ${({ theme, $active }) =>
      $active
        ? GOV_BRAND.primary
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.1)'
          : 'rgba(20, 19, 34, 0.1)'};
  background: ${({ theme, $active }) =>
    $active
      ? theme.mode === 'dark'
        ? GOV_BRAND.primarySoftDark
        : GOV_BRAND.primarySoft
      : 'transparent'};
  color: ${({ theme, $active }) =>
    $active
      ? theme.mode === 'dark'
        ? '#93c5fd'
        : GOV_BRAND.primary
      : theme.colors.text.secondary};
`

const AddInlineBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 25px;
  padding: 0 8px;
  border-radius: 6px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(20, 19, 34, 0.12)'};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
`

const TableScrollArea = styled.div`
  overflow: auto;
  flex: 1;
`

const LedgerTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  text-align: left;
`

const Th = styled.th`
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? '#141925' : '#f8fafc'};
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(20, 19, 34, 0.08)'};
  white-space: nowrap;
`

const Tr = styled.tr<{ $selected: boolean }>`
  cursor: pointer;
  background: ${({ theme, $selected }) =>
    $selected
      ? theme.mode === 'dark'
        ? 'rgba(59, 130, 246, 0.14)'
        : 'rgba(37, 99, 235, 0.07)'
      : 'transparent'};
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.05)'
        : 'rgba(20, 19, 34, 0.05)'};
  transition: background 0.12s ease;

  &:hover {
    background: ${({ theme, $selected }) =>
      $selected
        ? theme.mode === 'dark'
          ? 'rgba(59, 130, 246, 0.18)'
          : 'rgba(37, 99, 235, 0.1)'
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.035)'
          : 'rgba(20, 19, 34, 0.025)'};
  }
`

const Td = styled.td`
  padding: 9px 12px;
  vertical-align: middle;
  font-size: 12.5px;
`

const PeriodStack = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`

const StatusDot = styled.span<{ $status: DepartmentLifecycleStatus }>`
  width: 6px;
  height: 6px;
  border-radius: 999px;
  flex-shrink: 0;
  background: ${({ $status }) =>
    $status === 'ACTIVE'
      ? '#10b981'
      : $status === 'SUPERSEDED'
        ? '#6366f1'
        : $status === 'HISTORICAL_ENDED'
          ? '#f59e0b'
          : '#94a3b8'};
`

const PeriodText = styled.span<{ $muted: boolean }>`
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: ${({ theme, $muted }) =>
    $muted ? theme.colors.text.tertiary : theme.colors.text.secondary};
`

const NamePrimary = styled.div`
  display: flex;
  align-items: baseline;
  gap: 5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.35;
`

const AbbrTag = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SubInfoRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
`

const EraTag = styled.span`
  font-size: 10.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const ParentHint = styled.span`
  font-size: 10.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ForeignNameText = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const BadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`

const KindBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: 5px;
  font-size: 10.5px;
  font-weight: 600;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.06)'
      : 'rgba(20, 19, 34, 0.05)'};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const CatBadge = styled(KindBadge)`
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#93c5fd' : GOV_BRAND.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? GOV_BRAND.primarySoftDark : GOV_BRAND.primarySoft};
`

const ParentCellText = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const DashText = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const MetricGroup = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
`

const MetricChip = styled.span<{ $defense?: boolean; $primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  background: ${({ theme, $defense, $primary }) =>
    $defense
      ? theme.mode === 'dark'
        ? 'rgba(16, 185, 129, 0.16)'
        : 'rgba(16, 185, 129, 0.1)'
      : $primary
        ? theme.mode === 'dark'
          ? GOV_BRAND.primarySoftDark
          : GOV_BRAND.primarySoft
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.06)'
          : 'rgba(20, 19, 34, 0.05)'};
  color: ${({ theme, $defense, $primary }) =>
    $defense
      ? theme.mode === 'dark'
        ? '#6ee7b7'
        : '#047857'
      : $primary
        ? theme.mode === 'dark'
          ? '#93c5fd'
          : GOV_BRAND.primary
        : theme.colors.text.secondary};
`
