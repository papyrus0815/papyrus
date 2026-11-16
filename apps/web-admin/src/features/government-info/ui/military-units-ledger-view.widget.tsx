import { useMemo, useState } from 'react'
import {
  FiAnchor,
  FiArrowDown,
  FiArrowUp,
  FiAward,
  FiCompass,
  FiCrosshair,
  FiEdit2,
  FiGitCommit,
  FiLayers,
  FiNavigation,
  FiPlus,
  FiShield,
  FiUser,
} from 'react-icons/fi'
import styled from 'styled-components'

import type {
  MilitaryUnit,
  MilitaryUnitDatePartsDto,
  MilitaryUnitTenureItem,
  MilitaryUnitType,
} from '@/shared/api/military-unit'
import { getUploadImageUrl } from '@/shared/api/upload'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { parseSignedDateParts } from '@/shared/lib/tenure-person-utils'

import { GOV_BRAND } from './government-ledger.styles'

export type LedgerMilitaryUnitItem = MilitaryUnit & {
  branch?: string | null
  nickname?: string | null
  motto?: string | null
  garrison?: string | null
  strength?: string | null
  administrationDepartmentId?: string | null
  administrationDepartment?: {
    id: string
    name: string
    abbreviation?: string | null
    kind?: string | null
  } | null
  commanders?: Array<{
    id: string
    tenureId?: string | null
    personId: string
    rank?: string | null
    role?: string | null
    isCurrent?: boolean | null
    startDate?: string | null
    endDate?: string | null
    termNumber?: number | null
    person?: {
      id: string
      name: string
      surname?: string | null
    }
  }>
  tenures?: MilitaryUnitTenureItem[]
  sideDeployedUnits?: Array<{
    id: string
  }>
}

export interface MilitaryUnitsLedgerViewProps {
  units: LedgerMilitaryUnitItem[]
  allUnits: LedgerMilitaryUnitItem[]
  selectedUnitId?: string | null
  compact?: boolean
  isHistorical?: boolean
  unitTypeLabels: Record<MilitaryUnitType, string>
  branchLabels: Record<string, string>
  echelonOrder: Record<string, number>
  resolveEffectiveDepartment: (
    unitItem: LedgerMilitaryUnitItem,
  ) => { id: string; name: string; abbreviation?: string | null } | null
  onSelectUnit: (unitItem: LedgerMilitaryUnitItem) => void
  onAddRoot?: () => void
  onEditUnit?: (unitItem: LedgerMilitaryUnitItem) => void
  onAddSubUnit?: (unitItem: LedgerMilitaryUnitItem) => void
}

type SortField = 'echelon' | 'established' | 'name'
type SortDirection = 'asc' | 'desc'

function renderLedgerBranchIcon(
  branch: string | null | undefined,
  unitType: string | null | undefined,
) {
  if (
    unitType === 'SUPREME_COMMAND' ||
    unitType === 'GENERAL_STAFF' ||
    unitType === 'SERVICE_HQ'
  ) {
    return <FiAward size={12} />
  }
  if (branch === 'NAVY' || branch === 'COAST_GUARD' || unitType === 'FLEET') {
    return <FiAnchor size={12} />
  }
  if (
    branch === 'AIR_FORCE' ||
    branch === 'SPACE_FORCE' ||
    unitType === 'AIR_FLEET' ||
    unitType === 'AIR_CORPS' ||
    unitType === 'WING'
  ) {
    return <FiNavigation size={12} />
  }
  if (
    branch === 'MARINE_CORPS' ||
    branch === 'SPECIAL_FORCES' ||
    unitType === 'SPECIAL_FORCES'
  ) {
    return <FiCrosshair size={12} />
  }
  if (branch === 'JOINT') {
    return <FiLayers size={12} />
  }
  return <FiShield size={12} />
}

function formatUnitYearPoint(
  structuredParts: MilitaryUnitDatePartsDto | null | undefined,
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

function getUnitEstablishedSortKey(unitItem: LedgerMilitaryUnitItem): number {
  const structured = unitItem.established
  if (structured && typeof structured.year === 'number' && structured.year > 0) {
    const signedYear =
      structured.era === 'BC'
        ? -Math.abs(structured.year)
        : structured.year
    const monthNum = structured.month ?? 1
    const dayNum = structured.day ?? 1
    return signedYear * 10000 + monthNum * 100 + dayNum
  }
  const parsed = parseSignedDateParts(unitItem.establishedDate)
  if (!parsed) return Number.MAX_SAFE_INTEGER
  return parsed.signedYear * 10000 + parsed.month * 100 + parsed.day
}

function resolveLeadCommanderLabel(
  unitItem: LedgerMilitaryUnitItem,
): string | null {
  const firstTenure = unitItem.tenures?.[0]
  if (firstTenure?.person) {
    const nameStr =
      getPersonDisplayName({
        name: firstTenure.person.name ?? '',
        surname: firstTenure.person.surname ?? undefined,
        middleName: firstTenure.person.middleName ?? undefined,
        country: firstTenure.person.country ?? undefined,
      }) || firstTenure.person.name
    if (nameStr) {
      return firstTenure.rankTitle
        ? `${firstTenure.rankTitle} ${nameStr}`
        : nameStr
    }
  }
  const leadCmd = unitItem.commanders?.[0]
  if (leadCmd?.person) {
    const nameStr =
      getPersonDisplayName({
        name: leadCmd.person.name ?? '',
        surname: leadCmd.person.surname ?? undefined,
      }) || leadCmd.person.name
    if (nameStr) {
      return leadCmd.rank ? `${leadCmd.rank} ${nameStr}` : nameStr
    }
  }
  return null
}

export function MilitaryUnitsLedgerView({
  units,
  allUnits,
  selectedUnitId,
  compact = false,
  isHistorical = false,
  unitTypeLabels,
  branchLabels,
  echelonOrder,
  resolveEffectiveDepartment,
  onSelectUnit,
  onAddRoot,
  onEditUnit,
  onAddSubUnit,
}: MilitaryUnitsLedgerViewProps) {
  const [sortField, setSortField] = useState<SortField>('echelon')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const unitById = useMemo(() => {
    const lookup = new Map<string, LedgerMilitaryUnitItem>()
    for (const unitRow of allUnits) {
      lookup.set(unitRow.id, unitRow)
    }
    return lookup
  }, [allUnits])

  const sortedUnits = useMemo(() => {
    const dirMultiplier = sortDirection === 'asc' ? 1 : -1
    return [...units].sort((leftUnit, rightUnit) => {
      if (sortField === 'name') {
        return (
          leftUnit.name.localeCompare(rightUnit.name, 'ko') * dirMultiplier
        )
      }
      if (sortField === 'echelon') {
        const leftRank = leftUnit.unitType
          ? (echelonOrder[leftUnit.unitType] ?? 50)
          : 50
        const rightRank = rightUnit.unitType
          ? (echelonOrder[rightUnit.unitType] ?? 50)
          : 50
        if (leftRank !== rightRank) {
          return (leftRank - rightRank) * dirMultiplier
        }
      }
      const leftKey = getUnitEstablishedSortKey(leftUnit)
      const rightKey = getUnitEstablishedSortKey(rightUnit)
      if (leftKey !== rightKey) {
        if (leftKey === Number.MAX_SAFE_INTEGER) return 1
        if (rightKey === Number.MAX_SAFE_INTEGER) return -1
        return (leftKey - rightKey) * dirMultiplier
      }
      return leftUnit.name.localeCompare(rightUnit.name, 'ko')
    })
  }, [units, sortField, sortDirection, echelonOrder])

  const toggleSort = (targetField: SortField) => {
    if (sortField === targetField) {
      setSortDirection((prevDir) => (prevDir === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(targetField)
      setSortDirection('asc')
    }
  }

  return (
    <LedgerContainer>
      <LedgerHeaderBar>
        <LedgerMetaText>
          원장 목록 <strong>{sortedUnits.length}</strong>개 편제
        </LedgerMetaText>
        <LedgerHeaderActions>
          <SortPillBtn
            type="button"
            $active={sortField === 'echelon'}
            onClick={() => toggleSort('echelon')}
          >
            위계순
            {sortField === 'echelon' ? (
              sortDirection === 'asc' ? (
                <FiArrowUp size={11} />
              ) : (
                <FiArrowDown size={11} />
              )
            ) : null}
          </SortPillBtn>
          <SortPillBtn
            type="button"
            $active={sortField === 'established'}
            onClick={() => toggleSort('established')}
          >
            창설연도순
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
          {onAddRoot ? (
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
              <Th style={{ width: compact ? 116 : 138 }}>
                <SortableThBtn
                  type="button"
                  $active={sortField === 'established'}
                  onClick={() => toggleSort('established')}
                >
                  <span>존속 기간</span>
                  {sortField === 'established' ? (
                    sortDirection === 'asc' ? (
                      <FiArrowUp size={11} />
                    ) : (
                      <FiArrowDown size={11} />
                    )
                  ) : null}
                </SortableThBtn>
              </Th>
              <Th>
                <SortableThBtn
                  type="button"
                  $active={sortField === 'name'}
                  onClick={() => toggleSort('name')}
                >
                  <span>부대 · 사령부명</span>
                  {sortField === 'name' ? (
                    sortDirection === 'asc' ? (
                      <FiArrowUp size={11} />
                    ) : (
                      <FiArrowDown size={11} />
                    )
                  ) : null}
                </SortableThBtn>
              </Th>
              <Th style={{ width: compact ? 124 : 168 }}>
                <SortableThBtn
                  type="button"
                  $active={sortField === 'echelon'}
                  onClick={() => toggleSort('echelon')}
                >
                  <span>제대 · 군종</span>
                  {sortField === 'echelon' ? (
                    sortDirection === 'asc' ? (
                      <FiArrowUp size={11} />
                    ) : (
                      <FiArrowDown size={11} />
                    )
                  ) : null}
                </SortableThBtn>
              </Th>
              {!compact ? (
                <Th style={{ width: 170 }}>상급 편제 · 소관 부처</Th>
              ) : null}
              <Th style={{ width: compact ? 124 : 186, textAlign: 'right' }}>
                지휘관 · 전과 · 관리
              </Th>
            </tr>
          </thead>
          <tbody>
            {sortedUnits.map((unitRow) => {
              const estLabel = formatUnitYearPoint(
                unitRow.established,
                unitRow.establishedDate,
              )
              const disLabel = formatUnitYearPoint(
                unitRow.disbanded,
                unitRow.disbandedDate,
              )
              const isDisbanded =
                unitRow.isActive === false || Boolean(disLabel)
              const periodText =
                estLabel || disLabel
                  ? `${estLabel ?? '?'} ~ ${disLabel ?? (unitRow.isActive === false ? '해체' : '현재')}`
                  : unitRow.isActive === false
                    ? '해체 (연도 미상)'
                    : '연도 미등록'
              const echelonText = unitRow.unitType
                ? (unitTypeLabels[unitRow.unitType] ?? unitRow.unitType)
                : '편제'
              const branchText = unitRow.branch
                ? (branchLabels[unitRow.branch] ?? unitRow.branch)
                : null
              const parentRef = unitRow.parentUnitId
                ? (unitById.get(unitRow.parentUnitId) ??
                  unitRow.parentUnit ??
                  null)
                : null
              const effDept = resolveEffectiveDepartment(unitRow)
              const predCount = (unitRow.predecessors ?? []).length
              const succCount = (unitRow.successors ?? []).length
              const lineageTotal = predCount + succCount
              const battleCount = (unitRow.sideDeployedUnits ?? []).length
              const commanderText = resolveLeadCommanderLabel(unitRow)
              const isSelected = selectedUnitId === unitRow.id
              const isHighCommand =
                unitRow.unitType != null &&
                ['SUPREME_COMMAND', 'GENERAL_STAFF', 'SERVICE_HQ'].includes(
                  unitRow.unitType,
                )

              return (
                <Tr
                  key={unitRow.id}
                  $selected={isSelected}
                  onClick={() => onSelectUnit(unitRow)}
                >
                  <Td>
                    <PeriodStack>
                      <StatusDot $disbanded={isDisbanded} />
                      <PeriodText $muted={!estLabel && !disLabel}>
                        {periodText}
                      </PeriodText>
                    </PeriodStack>
                  </Td>
                  <Td>
                    <NameCellRow>
                      {unitRow.insigniaUrl ? (
                        <LedgerUnitThumbImg
                          src={getUploadImageUrl(unitRow.insigniaUrl)}
                          alt=""
                          onError={(imgEvt) => {
                            imgEvt.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <LedgerUnitThumbIcon $highCommand={isHighCommand}>
                          {renderLedgerBranchIcon(
                            unitRow.branch,
                            unitRow.unitType,
                          )}
                        </LedgerUnitThumbIcon>
                      )}
                      <NameCellBody>
                        <NamePrimary>
                          <span>{unitRow.name}</span>
                          {unitRow.abbreviation?.trim() ? (
                            <AbbrTag>({unitRow.abbreviation.trim()})</AbbrTag>
                          ) : null}
                          {unitRow.nickname?.trim() ? (
                            <NicknameTag>
                              &ldquo;{unitRow.nickname.trim()}&rdquo;
                            </NicknameTag>
                          ) : null}
                        </NamePrimary>
                        <SubInfoRow>
                          {!isHistorical && unitRow.historicalCountry?.name ? (
                            <EraTag>{unitRow.historicalCountry.name}</EraTag>
                          ) : null}
                          {compact && parentRef ? (
                            <ParentHint>↳ {parentRef.name}</ParentHint>
                          ) : compact && effDept ? (
                            <ParentHint>소관: {effDept.name}</ParentHint>
                          ) : null}
                          {!compact &&
                          (unitRow.nameLocal?.trim() ||
                            unitRow.nameEn?.trim()) ? (
                            <ForeignNameText>
                              {[
                                unitRow.nameLocal?.trim(),
                                unitRow.nameEn?.trim(),
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </ForeignNameText>
                          ) : null}
                        </SubInfoRow>
                      </NameCellBody>
                    </NameCellRow>
                  </Td>
                  <Td>
                    <BadgeRow>
                      <EchelonBadge $echelon={unitRow.unitType ?? ''}>
                        {echelonText}
                      </EchelonBadge>
                      {branchText ? (
                        <BranchBadge>{branchText}</BranchBadge>
                      ) : null}
                    </BadgeRow>
                  </Td>
                  {!compact ? (
                    <Td>
                      {parentRef ? (
                        <ParentCellText title={parentRef.name}>
                          ↳ {parentRef.name}
                        </ParentCellText>
                      ) : effDept ? (
                        <DeptCellText title={effDept.name}>
                          <FiShield size={11} />
                          {effDept.name}
                        </DeptCellText>
                      ) : (
                        <DashText>최상위 편제</DashText>
                      )}
                    </Td>
                  ) : null}
                  <Td style={{ textAlign: 'right' }}>
                    <RightCellCluster>
                      <MetricGroup>
                        {commanderText && !compact ? (
                          <CommanderChip
                            title={`대표 지휘관: ${commanderText}`}
                          >
                            <FiUser size={10.5} />
                            {commanderText}
                          </CommanderChip>
                        ) : null}
                        {lineageTotal > 0 ? (
                          <MetricChip
                            title={`전신 ${predCount} · 후신 ${succCount}`}
                          >
                            <FiGitCommit size={11} />
                            {lineageTotal}
                          </MetricChip>
                        ) : null}
                        {battleCount > 0 ? (
                          <MetricChip
                            $combat
                            title={`참전 사건·전투 ${battleCount}건`}
                          >
                            <FiCompass size={11} />
                            {battleCount}
                          </MetricChip>
                        ) : null}
                        {(!commanderText || compact) &&
                        lineageTotal === 0 &&
                        battleCount === 0 ? (
                          commanderText ? (
                            <CommanderChip title={commanderText}>
                              <FiUser size={10.5} />
                              {commanderText}
                            </CommanderChip>
                          ) : (
                            <DashText>—</DashText>
                          )
                        ) : null}
                      </MetricGroup>

                      {(onAddSubUnit || onEditUnit) && (
                        <RowQuickActionGroup
                          onClick={(clickEvent) => clickEvent.stopPropagation()}
                        >
                          {onAddSubUnit && (
                            <RowQuickActionBtn
                              type="button"
                              title={`${unitRow.name} 예하 부대 추가`}
                              onClick={() => onAddSubUnit(unitRow)}
                            >
                              <FiPlus size={11} />
                              <span>예하</span>
                            </RowQuickActionBtn>
                          )}
                          {onEditUnit && (
                            <RowQuickActionBtn
                              type="button"
                              title={`${unitRow.name} 정보 수정`}
                              onClick={() => onEditUnit(unitRow)}
                            >
                              <FiEdit2 size={11} />
                            </RowQuickActionBtn>
                          )}
                        </RowQuickActionGroup>
                      )}
                    </RightCellCluster>
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
        ? theme.mode === 'dark'
          ? GOV_BRAND.primaryBorderDark
          : GOV_BRAND.primaryBorder
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

const SortableThBtn = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme, $active }) =>
    $active ? theme.colors.text.primary : theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const Tr = styled.tr<{ $selected: boolean }>`
  cursor: pointer;
  border-left: 2.5px solid
    ${({ $selected }) => ($selected ? GOV_BRAND.primary : 'transparent')};
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

const StatusDot = styled.span<{ $disbanded: boolean }>`
  width: 6px;
  height: 6px;
  border-radius: 999px;
  flex-shrink: 0;
  background: ${({ $disbanded }) => ($disbanded ? '#94a3b8' : '#10b981')};
`

const PeriodText = styled.span<{ $muted: boolean }>`
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: ${({ theme, $muted }) =>
    $muted ? theme.colors.text.tertiary : theme.colors.text.secondary};
`

const NameCellRow = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
`

const NameCellBody = styled.div`
  flex: 1;
  min-width: 0;
`

const LedgerUnitThumbImg = styled.img`
  width: 26px;
  height: 26px;
  object-fit: cover;
  border-radius: 6px;
  flex-shrink: 0;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(15, 23, 42, 0.1)'};
`

const LedgerUnitThumbIcon = styled.span<{ $highCommand?: boolean }>`
  width: 26px;
  height: 26px;
  border-radius: 6px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme, $highCommand }) =>
    $highCommand
      ? theme.mode === 'dark'
        ? 'rgba(245, 158, 11, 0.14)'
        : '#fffbeb'
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.05)'
        : '#f8fafc'};
  border: 1px solid
    ${({ theme, $highCommand }) =>
      $highCommand
        ? theme.mode === 'dark'
          ? 'rgba(251, 191, 36, 0.28)'
          : '#fde68a'
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.1)'
          : 'rgba(15, 23, 42, 0.09)'};
  color: ${({ theme, $highCommand }) =>
    $highCommand
      ? theme.mode === 'dark'
        ? '#fcd34d'
        : '#b45309'
      : theme.colors.text.secondary};
`

const NamePrimary = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
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

const NicknameTag = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
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

const EchelonBadge = styled.span<{ $echelon: string }>`
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: 5px;
  font-size: 10.5px;
  font-weight: 700;
  background: ${({ theme, $echelon }) =>
    ['SUPREME_COMMAND', 'GENERAL_STAFF', 'SERVICE_HQ'].includes($echelon)
      ? theme.mode === 'dark'
        ? 'rgba(245, 158, 11, 0.16)'
        : 'rgba(245, 158, 11, 0.12)'
      : ['THEATER', 'ARMY_GROUP', 'FRONT', 'MILITARY_DISTRICT'].includes(
            $echelon,
          )
        ? theme.mode === 'dark'
          ? GOV_BRAND.primarySoftDark
          : GOV_BRAND.primarySoft
        : ['FIELD_ARMY', 'FLEET', 'AIR_FLEET', 'CORPS', 'AIR_CORPS'].includes(
              $echelon,
            )
          ? theme.mode === 'dark'
            ? 'rgba(13, 148, 136, 0.16)'
            : 'rgba(13, 148, 136, 0.1)'
          : theme.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.06)'
            : 'rgba(20, 19, 34, 0.05)'};
  color: ${({ theme, $echelon }) =>
    ['SUPREME_COMMAND', 'GENERAL_STAFF', 'SERVICE_HQ'].includes($echelon)
      ? theme.mode === 'dark'
        ? '#fcd34d'
        : '#b45309'
      : ['THEATER', 'ARMY_GROUP', 'FRONT', 'MILITARY_DISTRICT'].includes(
            $echelon,
          )
        ? theme.mode === 'dark'
          ? '#93c5fd'
          : GOV_BRAND.primary
        : ['FIELD_ARMY', 'FLEET', 'AIR_FLEET', 'CORPS', 'AIR_CORPS'].includes(
              $echelon,
            )
          ? theme.mode === 'dark'
            ? '#5eead4'
            : '#0f766e'
          : theme.colors.text.secondary};
`

const BranchBadge = styled.span`
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

const ParentCellText = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const DeptCellText = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#5eead4' : '#0f766e')};
`

const DashText = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const RightCellCluster = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  flex-wrap: wrap;
`

const MetricGroup = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 5px;
`

const RowQuickActionGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  opacity: 0.72;
  transition: opacity 0.12s ease;

  ${Tr}:hover & {
    opacity: 1;
  }
`

const RowQuickActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  height: 22px;
  padding: 0 6px;
  border-radius: 5px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(15, 23, 42, 0.1)'};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font: inherit;
  font-size: 10.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) =>
      theme.mode === 'dark' ? '#93c5fd' : GOV_BRAND.primary};
    border-color: ${GOV_BRAND.primary};
  }
`

const CommanderChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 1px 6px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.06)'
      : 'rgba(20, 19, 34, 0.045)'};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const MetricChip = styled.span<{ $combat?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  background: ${({ theme, $combat }) =>
    $combat
      ? theme.mode === 'dark'
        ? 'rgba(13, 148, 136, 0.16)'
        : 'rgba(13, 148, 136, 0.1)'
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.06)'
        : 'rgba(20, 19, 34, 0.05)'};
  color: ${({ theme, $combat }) =>
    $combat
      ? theme.mode === 'dark'
        ? '#5eead4'
        : '#0f766e'
      : theme.colors.text.secondary};
`
