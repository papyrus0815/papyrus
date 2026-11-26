import { type MouseEvent, useMemo, useState } from 'react'
import { FiArrowDown, FiArrowUp, FiArrowUpRight } from 'react-icons/fi'
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
  MilitaryUnitObservationDto,
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
  unitObservations?: MilitaryUnitObservationDto[]
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

function resolveLeadCommanderMeta(unitItem: LedgerMilitaryUnitItem): {
  label: string
  portraitUrl: string | null
} | null {
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
      return {
        label: firstTenure.rankTitle
          ? `${firstTenure.rankTitle} ${nameStr}`
          : nameStr,
        portraitUrl: firstTenure.person.profileImageUrl
          ? getUploadImageUrl(firstTenure.person.profileImageUrl)
          : null,
      }
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
      return {
        label: leadCmd.rank ? `${leadCmd.rank} ${nameStr}` : nameStr,
        portraitUrl: leadCmd.person.profileImageUrl
          ? getUploadImageUrl(leadCmd.person.profileImageUrl)
          : null,
      }
    }
  }
  return null
}

function resolveHeadlinePersonnelLabel(
  unitItem: LedgerMilitaryUnitItem,
): string | null {
  const obsList = unitItem.unitObservations ?? []
  const totalObs = obsList.find((obs) =>
    [
      'military.unit.authorized_wartime',
      'military.unit.actual_strength',
      'military.unit.authorized_peacetime',
      'military.personnel',
    ].includes(obs.metricKey),
  )
  if (totalObs) {
    const prefix = totalObs.approx ? '약 ' : ''
    if (totalObs.value != null && Number.isFinite(Number(totalObs.value))) {
      return `병력 ${prefix}${Number(totalObs.value).toLocaleString('ko-KR')}명`
    }
    if (
      totalObs.low != null &&
      totalObs.high != null &&
      Number.isFinite(Number(totalObs.low)) &&
      Number.isFinite(Number(totalObs.high))
    ) {
      return `병력 ${prefix}${Number(totalObs.low).toLocaleString('ko-KR')}~${Number(totalObs.high).toLocaleString('ko-KR')}명`
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
    <LedgerContainer aria-label="군사 편제 원장 표">
      <TableScrollArea>
        <LedgerTable>
          <thead>
            <tr>
              <Th style={{ width: compact ? 114 : 136 }}>
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
                <Th style={{ width: compact ? 124 : 158 }}>국가 · 정체</Th>
              ) : null}
              <Th style={{ width: compact ? 126 : 158 }}>
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
                <Th style={{ width: 184 }}>상급 편제 · 소관</Th>
              ) : null}
              {!compact ? (
                <Th style={{ width: 212, textAlign: 'right' }}>
                  대표 지휘관 · 전력
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
              const hasPeriod = Boolean(
                estLabel || disLabel || unitRow.isActive === false,
              )
              const periodText =
                estLabel || disLabel
                  ? `${estLabel ?? '?'} – ${disLabel ?? (unitRow.isActive === false ? '해체' : '현역')}`
                  : unitRow.isActive === false
                    ? '해체'
                    : '—'
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
              const subCount = (unitRow.subUnits ?? []).length
              const battleCount =
                (unitRow.sideDeployedUnits ?? []).length +
                (unitRow.eventRelations ?? []).length
              const vesselCount = (
                unitRow.assignedNavalVessels ??
                unitRow.navalVessels ??
                []
              ).length
              const commanderMeta = resolveLeadCommanderMeta(unitRow)
              const personnelText = resolveHeadlinePersonnelLabel(unitRow)
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
              const countryFlag = !unitRow.historicalCountry
                ? unitRow.country?.flagEmoji?.trim() || null
                : null
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
              if (personnelText) recordParts.push(personnelText)
              if (subCount > 0) recordParts.push(`예하 ${subCount}`)
              if (vesselCount > 0) recordParts.push(`함정 ${vesselCount}`)
              if (battleCount > 0) recordParts.push(`참전 ${battleCount}`)

              return (
                <Tr
                  key={unitRow.id}
                  $selected={isSelected}
                  onClick={(evt) => onSelectUnit(unitRow, evt)}
                >
                  <Td>
                    <PeriodStack>
                      {hasPeriod ? (
                        <StatusDot $disbanded={isDisbanded} />
                      ) : null}
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
                          title={`${countryLabel} 요약 보기`}
                        >
                          {countryFlag ? (
                            <span aria-hidden>{countryFlag} </span>
                          ) : null}
                          {countryLabel}
                        </CountryCellBtn>
                      ) : (
                        <CountryCellText
                          $muted={
                            !unitRow.historicalCountry?.name &&
                            !unitRow.country?.name
                          }
                        >
                          {countryFlag ? `${countryFlag} ` : ''}
                          {countryLabel}
                        </CountryCellText>
                      )}
                    </Td>
                  ) : null}
                  <Td>
                    <ClassCellWrap>
                      <EchelonPrimary $highCommand={isHighCommand}>
                        {echelonText}
                      </EchelonPrimary>
                      {branchText ? (
                        <BranchSecondary> · {branchText}</BranchSecondary>
                      ) : null}
                    </ClassCellWrap>
                  </Td>
                  {!compact ? (
                    <Td>
                      {parentRef ? (
                        <HierarchyStack>
                          <ParentCellText title={parentRef.name}>
                            ↳ {parentRef.name}
                          </ParentCellText>
                          {effDept ? (
                            <DeptSubText title={effDept.name}>
                              {effDept.name}
                            </DeptSubText>
                          ) : null}
                        </HierarchyStack>
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
                      {commanderMeta || recordParts.length > 0 ? (
                        <RightMetaStack>
                          {commanderMeta ? (
                            <CommanderInlineRow
                              title={`대표 지휘관: ${commanderMeta.label}`}
                            >
                              {commanderMeta.portraitUrl ? (
                                <CommanderAvatarImg
                                  src={commanderMeta.portraitUrl}
                                  alt=""
                                  onError={(imgEvt) => {
                                    imgEvt.currentTarget.style.display = 'none'
                                  }}
                                />
                              ) : null}
                              <CommanderLabel>
                                {commanderMeta.label}
                              </CommanderLabel>
                            </CommanderInlineRow>
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
  padding: 9px 10px;
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
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
  opacity: ${({ $disbanded }) => ($disbanded ? 0.55 : 0.85)};
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
  max-width: 148px;
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

const ClassCellWrap = styled.div`
  display: inline-flex;
  align-items: baseline;
  flex-wrap: wrap;
  line-height: 1.4;
`

const EchelonPrimary = styled.span<{ $highCommand?: boolean }>`
  font-size: 12.5px;
  font-weight: ${({ $highCommand }) => ($highCommand ? 720 : 620)};
  color: ${({ theme, $highCommand }) =>
    $highCommand ? ledgerAccent(theme.mode) : theme.colors.text.primary};
`

const BranchSecondary = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const HierarchyStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5px;
  min-width: 0;
`

const ParentCellText = styled.span`
  font-size: 12.5px;
  font-weight: 550;
  color: ${({ theme }) => theme.colors.text.secondary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const DeptSubText = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  gap: 2.5px;
`

const CommanderInlineRow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 196px;
`

const CommanderAvatarImg = styled.img`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
`

const CommanderLabel = styled.span`
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
