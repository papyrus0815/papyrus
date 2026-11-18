import { type MouseEvent, useEffect, useMemo, useState } from 'react'
import {
  FiAnchor,
  FiArrowDown,
  FiArrowUp,
  FiAward,
  FiCheck,
  FiCompass,
  FiCrosshair,
  FiGitCommit,
  FiLayers,
  FiMoreHorizontal,
  FiNavigation,
  FiPlus,
  FiShield,
  FiUser,
} from 'react-icons/fi'
import styled from 'styled-components'

import {
  ledgerAccent,
  ledgerAccentBorder,
  ledgerAccentSubtle,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerHoverFill,
} from '@/entities/event/ui/ledger-tokens'
import type {
  MilitaryUnitDatePartsDto,
  MilitaryUnitEventLinkDto,
  MilitaryUnitLineageDto,
  MilitaryUnitTenureItem,
  MilitaryUnitType,
} from '@/shared/api/military-unit'
import { getUploadImageUrl } from '@/shared/api/upload'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { parseSignedDateParts } from '@/shared/lib/tenure-person-utils'

export interface LedgerMilitaryUnitItem {
  id: string
  name: string
  nameLocal?: string | null
  nameEn?: string | null
  abbreviation?: string | null
  unitType?: MilitaryUnitType | null
  isActive?: boolean | null
  established?: MilitaryUnitDatePartsDto | null
  disbanded?: MilitaryUnitDatePartsDto | null
  establishedDate?: string | null
  disbandedDate?: string | null
  parentUnitId?: string | null
  parentUnit?: {
    id: string
    name: string
    abbreviation?: string | null
    unitType?: MilitaryUnitType | null
  } | null
  subUnits?: Array<{
    id: string
    name: string
    abbreviation?: string | null
    unitType?: MilitaryUnitType | null
    isActive?: boolean | null
  }>
  countryId?: string | null
  historicalCountryId?: string | null
  country?: { id: string; name: string; flagEmoji?: string | null } | null
  historicalCountry?: {
    id: string
    name: string
    enName?: string | null
    startEra?: string | null
    startYear?: number | null
    endEra?: string | null
    endYear?: number | null
  } | null
  description?: string | null
  insigniaUrl?: string | null
  predecessors?: MilitaryUnitLineageDto[]
  successors?: MilitaryUnitLineageDto[]
  eventRelations?: MilitaryUnitEventLinkDto[]
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
  assignedNavalVessels?: Array<{
    id: string
    name: string
    vesselType?: string | null
  }>
  navalVessels?: Array<{
    id: string
    name: string
    vesselType?: string | null
  }>
}

export interface MilitaryUnitsLedgerViewProps {
  units: LedgerMilitaryUnitItem[]
  allUnits: LedgerMilitaryUnitItem[]
  selectedUnitId?: string | null
  compact?: boolean
  isHistorical?: boolean
  targetPolityId?: string | null
  showCountryColumn?: boolean
  onCountryClick?: (countryId: string) => void
  unitTypeLabels: Record<MilitaryUnitType, string>
  branchLabels: Record<string, string>
  echelonOrder: Record<string, number>
  resolveEffectiveDepartment: (
    unitItem: LedgerMilitaryUnitItem,
  ) => { id: string; name: string; abbreviation?: string | null } | null
  onSelectUnit: (
    unitItem: LedgerMilitaryUnitItem,
    evt?: MouseEvent<HTMLTableRowElement>,
  ) => void
  onAddRoot?: () => void
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
  targetPolityId = null,
  showCountryColumn = false,
  onCountryClick,
  unitTypeLabels,
  branchLabels,
  echelonOrder,
  resolveEffectiveDepartment,
  onSelectUnit,
  onAddRoot,
}: MilitaryUnitsLedgerViewProps) {
  const [sortField, setSortField] = useState<SortField>('echelon')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false)

  useEffect(() => {
    if (!headerMenuOpen) return
    const handlePointerDown = (mouseEvent: globalThis.MouseEvent) => {
      const targetEl = mouseEvent.target as HTMLElement | null
      if (targetEl?.closest('[data-ledger-more-menu]')) return
      setHeaderMenuOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [headerMenuOpen])

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
        <LedgerHeaderActions data-ledger-more-menu>
          <HeaderMenuAnchor>
            <HeaderMoreBtn
              type="button"
              $active={headerMenuOpen}
              aria-expanded={headerMenuOpen}
              aria-label="원장 정렬 및 작업 메뉴"
              title="정렬 기준 변경 · 부대 등록"
              onClick={() => setHeaderMenuOpen((prev) => !prev)}
            >
              <FiMoreHorizontal size={15} />
            </HeaderMoreBtn>
            {headerMenuOpen ? (
              <HeaderMorePopover role="menu">
                <HeaderMoreLabel>정렬 기준</HeaderMoreLabel>
                <HeaderMoreItem
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    toggleSort('echelon')
                    setHeaderMenuOpen(false)
                  }}
                >
                  <span>위계순</span>
                  {sortField === 'echelon' && <FiCheck size={12.5} />}
                </HeaderMoreItem>
                <HeaderMoreItem
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    toggleSort('established')
                    setHeaderMenuOpen(false)
                  }}
                >
                  <span>창설연도순</span>
                  {sortField === 'established' && <FiCheck size={12.5} />}
                </HeaderMoreItem>
                <HeaderMoreItem
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    toggleSort('name')
                    setHeaderMenuOpen(false)
                  }}
                >
                  <span>이름순</span>
                  {sortField === 'name' && <FiCheck size={12.5} />}
                </HeaderMoreItem>
                {onAddRoot ? (
                  <>
                    <HeaderMoreDivider />
                    <HeaderMoreItem
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setHeaderMenuOpen(false)
                        onAddRoot()
                      }}
                    >
                      <FiPlus size={12.5} />
                      <span>새 사령부·부대 등록</span>
                    </HeaderMoreItem>
                  </>
                ) : null}
              </HeaderMorePopover>
            ) : null}
          </HeaderMenuAnchor>
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
              {showCountryColumn ? (
                <Th style={{ width: compact ? 118 : 148 }}>국가 · 정치체</Th>
              ) : null}
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
              {!compact ? (
                <Th style={{ width: 158, textAlign: 'right' }}>
                  지휘관 · 개편 · 전과
                </Th>
              ) : null}
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
              const vesselCount = (
                unitRow.assignedNavalVessels ??
                unitRow.navalVessels ??
                []
              ).length
              const commanderText = resolveLeadCommanderLabel(unitRow)
              const isSelected = selectedUnitId === unitRow.id
              const isHighCommand =
                unitRow.unitType != null &&
                ['SUPREME_COMMAND', 'GENERAL_STAFF', 'SERVICE_HQ'].includes(
                  unitRow.unitType,
                )
              const countryLabel =
                unitRow.historicalCountry?.name ??
                unitRow.country?.name ??
                '국가 미지정'
              const countryJumpId =
                unitRow.historicalCountry?.id ?? unitRow.country?.id ?? null
              const showConstituentPolityBadge =
                !showCountryColumn &&
                Boolean(unitRow.historicalCountry?.name) &&
                (!isHistorical ||
                  (targetPolityId != null &&
                    unitRow.historicalCountryId !== targetPolityId))

              return (
                <Tr
                  key={unitRow.id}
                  $selected={isSelected}
                  onClick={(evt) => onSelectUnit(unitRow, evt)}
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
                        </NamePrimary>
                        {(showConstituentPolityBadge ||
                          (compact && (parentRef || effDept))) && (
                          <SubInfoRow>
                            {showConstituentPolityBadge ? (
                              <EraTag>{unitRow.historicalCountry!.name}</EraTag>
                            ) : null}
                            {compact && parentRef ? (
                              <ParentHint>↳ {parentRef.name}</ParentHint>
                            ) : compact && effDept ? (
                              <ParentHint>소관: {effDept.name}</ParentHint>
                            ) : null}
                          </SubInfoRow>
                        )}
                      </NameCellBody>
                    </NameCellRow>
                  </Td>
                  {showCountryColumn ? (
                    <Td>
                      {countryJumpId && onCountryClick ? (
                        <CountryCellBtn
                          type="button"
                          onClick={(evt) => {
                            evt.stopPropagation()
                            onCountryClick(countryJumpId)
                          }}
                          title={`${countryLabel} 상세로 이동`}
                        >
                          {countryLabel}
                        </CountryCellBtn>
                      ) : (
                        <CountryCellText
                          $muted={
                            !unitRow.historicalCountry?.name &&
                            !unitRow.country?.name
                          }
                        >
                          {countryLabel}
                        </CountryCellText>
                      )}
                    </Td>
                  ) : null}
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
                  {!compact ? (
                    <Td style={{ textAlign: 'right' }}>
                      <MetricGroup>
                        {commanderText ? (
                          <CommanderChip
                            title={`대표 지휘관: ${commanderText}`}
                          >
                            <FiUser size={10.5} />
                            {commanderText}
                          </CommanderChip>
                        ) : null}
                        {vesselCount > 0 ? (
                          <MetricChip title={`배속 함정 ${vesselCount}척`}>
                            <FiAnchor size={10.5} />
                            {vesselCount}
                          </MetricChip>
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
                        {!commanderText &&
                        vesselCount === 0 &&
                        lineageTotal === 0 &&
                        battleCount === 0 ? (
                          <DashText>—</DashText>
                        ) : null}
                      </MetricGroup>
                    </Td>
                  ) : null}
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

const HeaderMenuAnchor = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
`

const HeaderMoreBtn = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: 6px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active
        ? ledgerAccentBorder(theme.mode)
        : ledgerHairlineStrong(theme.mode)};
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const HeaderMorePopover = styled.div`
  position: absolute;
  top: calc(100% + 5px);
  right: 0;
  z-index: 30;
  min-width: 176px;
  padding: 5px;
  border-radius: 9px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? '#141925' : '#ffffff'};
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.14);
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const HeaderMoreLabel = styled.div`
  padding: 4px 8px 2px;
  font-size: 10.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const HeaderMoreDivider = styled.div`
  height: 1px;
  margin: 4px 2px;
  background: ${({ theme }) => ledgerHairline(theme.mode)};
`

const HeaderMoreItem = styled.button`
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  padding: 6px 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;

  > span {
    flex: 1;
    min-width: 0;
  }

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
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
    theme.mode === 'dark' ? '#121319' : '#fafafb'};
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
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
    $active ? ledgerAccent(theme.mode) : theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const Tr = styled.tr<{ $selected: boolean }>`
  cursor: pointer;
  border-left: 2.5px solid
    ${({ theme, $selected }) =>
      $selected ? ledgerAccent(theme.mode) : 'transparent'};
  background: ${({ theme, $selected }) =>
    $selected ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  transition: background 0.12s ease;

  &:hover {
    background: ${({ theme, $selected }) =>
      $selected
        ? ledgerAccentSubtle(theme.mode)
        : ledgerHoverFill(theme.mode)};
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

const BadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`

const CountryCellBtn = styled.button`
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition:
    color 0.12s ease,
    border-color 0.12s ease,
    background 0.12s ease;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  }
`

const CountryCellText = styled.span<{ $muted?: boolean }>`
  font-size: 11.5px;
  font-weight: 500;
  color: ${({ theme, $muted }) =>
    $muted ? theme.colors.text.tertiary : theme.colors.text.secondary};
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
      : [
            'THEATER',
            'ARMY_GROUP',
            'FRONT',
            'MILITARY_DISTRICT',
            'FIELD_ARMY',
            'FLEET',
            'AIR_FLEET',
            'CORPS',
            'AIR_CORPS',
          ].includes($echelon)
        ? ledgerAccentSubtle(theme.mode)
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.06)'
          : 'rgba(20, 19, 34, 0.05)'};
  color: ${({ theme, $echelon }) =>
    ['SUPREME_COMMAND', 'GENERAL_STAFF', 'SERVICE_HQ'].includes($echelon)
      ? theme.mode === 'dark'
        ? '#fcd34d'
        : '#b45309'
      : [
            'THEATER',
            'ARMY_GROUP',
            'FRONT',
            'MILITARY_DISTRICT',
            'FIELD_ARMY',
            'FLEET',
            'AIR_FLEET',
            'CORPS',
            'AIR_CORPS',
          ].includes($echelon)
        ? ledgerAccent(theme.mode)
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
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const DashText = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const MetricGroup = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 5px;
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
      ? ledgerAccentSubtle(theme.mode)
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.06)'
        : 'rgba(20, 19, 34, 0.05)'};
  color: ${({ theme, $combat }) =>
    $combat ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
`
