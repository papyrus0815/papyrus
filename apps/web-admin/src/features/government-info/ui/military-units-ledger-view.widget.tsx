import { type MouseEvent, useMemo, useState } from 'react'
import {
  FiArrowDown,
  FiArrowUp,
  FiArrowUpRight,
  FiEdit2,
  FiPlus,
} from 'react-icons/fi'
import styled from 'styled-components'

import {
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerAccentSubtle,
  ledgerBackground,
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
import { PopoverMenu } from '@/shared/ui/popover-menu'

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
      profileImageUrl?: string | null
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
  onEditUnit?: (unitId: string) => void
  onCreateSubUnit?: (unitItem: LedgerMilitaryUnitItem) => void
  onAddRoot?: () => void
}

type SortField = 'echelon' | 'established' | 'name'
type SortDirection = 'asc' | 'desc'

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
  onEditUnit,
  onCreateSubUnit,
  onAddRoot,
}: MilitaryUnitsLedgerViewProps) {
  const hasRowActions = Boolean(onEditUnit || onCreateSubUnit)
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
          <PopoverMenu
            size="sm"
            ariaLabel="원장 정렬 및 작업 메뉴"
            title="정렬 기준 변경 · 부대 등록"
            minWidth={184}
            items={[
              { type: 'section', id: 'sec-sort', label: '정렬 기준' },
              {
                id: 'sort-echelon',
                label: '위계순',
                checked: sortField === 'echelon',
                onSelect: () => toggleSort('echelon'),
              },
              {
                id: 'sort-established',
                label: '창설연도순',
                checked: sortField === 'established',
                onSelect: () => toggleSort('established'),
              },
              {
                id: 'sort-name',
                label: '이름순',
                checked: sortField === 'name',
                onSelect: () => toggleSort('name'),
              },
              ...(onAddRoot
                ? [
                    { type: 'divider' as const, id: 'div-add' },
                    {
                      id: 'add-root',
                      label: '새 사령부·부대 등록',
                      icon: <FiPlus size={12.5} />,
                      onSelect: onAddRoot,
                    },
                  ]
                : []),
            ]}
          />
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
                  <span>사령부 · 부대</span>
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
                <Th style={{ width: compact ? 118 : 148 }}>국가 · 정체</Th>
              ) : null}
              <Th style={{ width: compact ? 124 : 162 }}>
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
                <Th style={{ width: 176 }}>상급 편제 · 소관</Th>
              ) : null}
              {!compact ? (
                <Th style={{ width: 190, textAlign: 'right' }}>
                  대표 지휘관 · 기록
                </Th>
              ) : null}
              {hasRowActions ? (
                <Th
                  style={{ width: 40, textAlign: 'right' }}
                  aria-label="관리"
                />
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
                  ? `${estLabel ?? '?'} – ${disLabel ?? (unitRow.isActive === false ? '해체' : '현재')}`
                  : unitRow.isActive === false
                    ? '해체'
                    : '연도 미상'
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
              const battleCount =
                (unitRow.sideDeployedUnits ?? []).length +
                (unitRow.eventRelations ?? []).length
              const vesselCount = (
                unitRow.assignedNavalVessels ??
                unitRow.navalVessels ??
                []
              ).length
              const commanderText = resolveLeadCommanderLabel(unitRow)
              const garrisonText = unitRow.garrison?.trim() || null
              const nicknameText = unitRow.nickname?.trim() || null
              const isSelected = selectedUnitId === unitRow.id
              const isHighCommand =
                unitRow.unitType != null &&
                ['SUPREME_COMMAND', 'GENERAL_STAFF', 'SERVICE_HQ'].includes(
                  unitRow.unitType,
                )
              const countryLabel =
                unitRow.historicalCountry?.name ??
                unitRow.country?.name ??
                '미지정'
              const countryJumpId =
                unitRow.historicalCountry?.id ?? unitRow.country?.id ?? null
              const showConstituentPolityBadge =
                !showCountryColumn &&
                Boolean(unitRow.historicalCountry?.name) &&
                (!isHistorical ||
                  (targetPolityId != null &&
                    unitRow.historicalCountryId !== targetPolityId))

              const subInfoParts: string[] = []
              if (showConstituentPolityBadge && unitRow.historicalCountry?.name) {
                subInfoParts.push(unitRow.historicalCountry.name)
              }
              if (garrisonText) {
                subInfoParts.push(garrisonText)
              }
              if (compact && parentRef) {
                subInfoParts.push(`↳ ${parentRef.name}`)
              } else if (compact && effDept) {
                subInfoParts.push(effDept.name)
              }

              const recordParts: string[] = []
              if (vesselCount > 0) recordParts.push(`함정 ${vesselCount}`)
              if (lineageTotal > 0) recordParts.push(`개편 ${lineageTotal}`)
              if (battleCount > 0) recordParts.push(`참전 ${battleCount}`)

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
                      ) : null}
                      <NameCellBody>
                        <NamePrimary>
                          <NameTitleSpan>{unitRow.name}</NameTitleSpan>
                          {unitRow.abbreviation?.trim() ? (
                            <AbbrTag>({unitRow.abbreviation.trim()})</AbbrTag>
                          ) : null}
                          {nicknameText ? (
                            <NicknameTag>“{nicknameText}”</NicknameTag>
                          ) : null}
                          <DetailOpenIcon aria-hidden="true">
                            <FiArrowUpRight size={12} />
                          </DetailOpenIcon>
                        </NamePrimary>
                        {subInfoParts.length > 0 ? (
                          <SubInfoRow>{subInfoParts.join(' · ')}</SubInfoRow>
                        ) : null}
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
                    <ClassCellText $highCommand={isHighCommand}>
                      {[echelonText, branchText].filter(Boolean).join(' · ')}
                    </ClassCellText>
                  </Td>
                  {!compact ? (
                    <Td>
                      {parentRef ? (
                        <ParentCellText title={parentRef.name}>
                          ↳ {parentRef.name}
                        </ParentCellText>
                      ) : effDept ? (
                        <DeptCellText title={effDept.name}>
                          {effDept.name}
                        </DeptCellText>
                      ) : (
                        <DashText>최상위 편제</DashText>
                      )}
                    </Td>
                  ) : null}
                  {!compact ? (
                    <Td style={{ textAlign: 'right' }}>
                      {commanderText || recordParts.length > 0 ? (
                        <RightMetaStack>
                          {commanderText ? (
                            <CommanderLabel title={`대표 지휘관: ${commanderText}`}>
                              {commanderText}
                            </CommanderLabel>
                          ) : null}
                          {recordParts.length > 0 ? (
                            <RecordCountsText $accent={battleCount > 0}>
                              {recordParts.join(' · ')}
                            </RecordCountsText>
                          ) : null}
                        </RightMetaStack>
                      ) : (
                        <DashText>—</DashText>
                      )}
                    </Td>
                  ) : null}
                  {hasRowActions ? (
                    <Td
                      style={{ textAlign: 'right' }}
                      onClick={(evt) => evt.stopPropagation()}
                    >
                      <PopoverMenu
                        size="sm"
                        ariaLabel={`${unitRow.name} 관리 메뉴`}
                        title="상세 보기 · 수정 · 예하 추가"
                        minWidth={168}
                        items={[
                          {
                            id: 'open-detail',
                            label: '상세 페이지 열기',
                            icon: <FiArrowUpRight size={12.5} />,
                            onSelect: () => onSelectUnit(unitRow),
                          },
                          ...(onEditUnit
                            ? [
                                {
                                  id: 'edit-unit',
                                  label: '사령부·부대 수정',
                                  icon: <FiEdit2 size={12.5} />,
                                  onSelect: () => onEditUnit(unitRow.id),
                                },
                              ]
                            : []),
                          ...(onCreateSubUnit
                            ? [
                                {
                                  id: 'add-sub-unit',
                                  label: '예하 부대 추가',
                                  icon: <FiPlus size={12.5} />,
                                  onSelect: () => onCreateSubUnit(unitRow),
                                },
                              ]
                            : []),
                        ]}
                      />
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
  padding: 10px 2px 8px;
`

const LedgerMetaText = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}

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
  padding: 8px 10px;
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  white-space: nowrap;

  &:first-child {
    padding-left: 4px;
  }

  &:last-child {
    padding-right: 4px;
  }
`

const SortableThBtn = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 11.5px;
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
  padding: 11px 10px;
  vertical-align: middle;
  font-size: 13px;

  &:first-child {
    padding-left: 4px;
  }

  &:last-child {
    padding-right: 4px;
  }
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
  opacity: ${({ $disbanded }) => ($disbanded ? 0.5 : 0.85)};
`

const PeriodText = styled.span<{ $muted: boolean }>`
  font-size: 12px;
  ${DIGIT_DISPLAY}
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
  object-fit: contain;
  border-radius: 6px;
  flex-shrink: 0;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

const NamePrimary = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 5px;
  font-size: 13.5px;
  font-weight: 720;
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.35;
`

const NameTitleSpan = styled.span`
  transition: color 0.12s ease;

  ${Tr}:hover & {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const DetailOpenIcon = styled.span`
  display: inline-flex;
  align-items: center;
  opacity: 0;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  transition: opacity 0.12s ease, transform 0.12s ease;

  ${Tr}:hover & {
    opacity: 0.9;
    transform: translate(1px, -1px);
  }
`

const AbbrTag = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const NicknameTag = styled.span`
  font-size: 12px;
  font-weight: 550;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const SubInfoRow = styled.div`
  margin-top: 2px;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const CountryCellBtn = styled.button`
  padding: 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

const CountryCellText = styled.span<{ $muted?: boolean }>`
  font-size: 12.5px;
  font-weight: 500;
  color: ${({ theme, $muted }) =>
    $muted ? theme.colors.text.tertiary : theme.colors.text.secondary};
`

const ClassCellText = styled.span<{ $highCommand?: boolean }>`
  font-size: 12.5px;
  font-weight: ${({ $highCommand }) => ($highCommand ? 680 : 550)};
  color: ${({ theme, $highCommand }) =>
    $highCommand ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
`

const ParentCellText = styled.span`
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const DeptCellText = styled.span`
  font-size: 12.5px;
  font-weight: 550;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const DashText = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const RightMetaStack = styled.div`
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
`

const CommanderLabel = styled.span`
  max-width: 168px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12.5px;
  font-weight: 550;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const RecordCountsText = styled.span<{ $accent?: boolean }>`
  font-size: 11.5px;
  font-weight: ${({ $accent }) => ($accent ? 650 : 500)};
  ${DIGIT_DISPLAY}
  color: ${({ theme, $accent }) =>
    $accent ? ledgerAccent(theme.mode) : theme.colors.text.tertiary};
`
