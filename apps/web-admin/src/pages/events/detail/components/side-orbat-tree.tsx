import { useMemo, useState } from 'react'

import { FiChevronDown, FiChevronRight, FiPlus, FiShield, FiUser, FiX } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import { RADIUS } from '@/entities/event/ui/ledger-tokens'
import {
  addEventSideUnit,
  removeEventSideUnit,
  type SideUnitRole,
  type SideUnitView,
  updateEventSideUnit,
} from '@/shared/api/event-sides'
import { militaryUnitTypeLabelKo } from '@/shared/lib/military-unit-type-label'
import { pathKeys } from '@/shared/router'
import { PersonPickerModal } from '@/shared/ui/person-picker'
import { notify } from '@/shared/ui/toast'

import { InlineSelect, InlineText } from './inline'
import {
  buildSideOrbatTree,
  formatSideUnitMetric,
  type OrbatTreeNode,
  SIDE_UNIT_ROLE_LABEL,
  SIDE_UNIT_ROLE_OPTIONS,
  summarizeOrbatByType,
} from './side-orbat.lib'

export interface AvailableMilitaryUnitItem {
  id: string
  name: string
  unitType?: string | null
  countryId?: string | null
  historicalCountryId?: string | null
  country?: { name?: string | null } | null
  historicalCountry?: { name?: string | null } | null
}

interface SideOrbatSectionProps {
  eventId: string
  sideId: string
  sideName: string
  sideColor: string
  sideUnits: ReadonlyArray<SideUnitView>
  allSideUnits: ReadonlyArray<SideUnitView>
  availableUnits: ReadonlyArray<AvailableMilitaryUnitItem>
  sideCountryIds: ReadonlySet<string>
  sideHistoricalCountryIds: ReadonlySet<string>
  candidatePersonIds: string[]
  onRefresh: () => Promise<void>
}

export function SideOrbatSection({
  eventId,
  sideId,
  sideName,
  sideColor,
  sideUnits,
  allSideUnits,
  availableUnits,
  sideCountryIds,
  sideHistoricalCountryIds,
  candidatePersonIds,
  onRefresh,
}: SideOrbatSectionProps) {
  const [busy, setBusy] = useState(false)
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set())
  const [commanderPickerRow, setCommanderPickerRow] = useState<SideUnitView | null>(null)

  const tree = useMemo(() => buildSideOrbatTree(sideUnits), [sideUnits])
  const summaryByType = useMemo(() => summarizeOrbatByType(sideUnits), [sideUnits])

  /** 최고사령부·기관(OKH, 스타프카 등)별 루트 노드 묶음 */
  const departmentGroups = useMemo(() => {
    const byDept = new Map<
      string,
      {
        key: string
        label: string | null
        nodes: OrbatTreeNode[]
      }
    >()
    for (const rootNode of tree) {
      const dept = rootNode.department
      const key = dept ? dept.id : '__none__'
      const label = dept
        ? dept.abbreviation
          ? `${dept.name} (${dept.abbreviation})`
          : dept.name
        : null
      const existing = byDept.get(key)
      if (existing) {
        existing.nodes.push(rootNode)
      } else {
        byDept.set(key, { key, label, nodes: [rootNode] })
      }
    }
    return [...byDept.values()]
  }, [tree])

  const deployedUnitIds = useMemo(
    () => new Set(allSideUnits.map((row) => row.unit.id)),
    [allSideUnits],
  )

  /** 이 진영 소속 국가의 부대를 맨 위에 정렬한 선택지 */
  const unitPickerOptions = useMemo(() => {
    const candidates = availableUnits.filter((unitItem) => !deployedUnitIds.has(unitItem.id))
    const scored = candidates.map((unitItem) => {
      let score = 0
      if (
        unitItem.historicalCountryId &&
        sideHistoricalCountryIds.has(unitItem.historicalCountryId)
      ) {
        score += 4
      }
      if (unitItem.countryId && sideCountryIds.has(unitItem.countryId)) {
        score += 2
      }
      const countryName =
        unitItem.historicalCountry?.name ?? unitItem.country?.name ?? null
      const typeLabel = unitItem.unitType ? militaryUnitTypeLabelKo(unitItem.unitType) : null
      const meta = [typeLabel, countryName].filter(Boolean).join(' · ')
      return {
        value: unitItem.id,
        label: meta ? `${unitItem.name} (${meta})` : unitItem.name,
        score,
        name: unitItem.name,
      }
    })
    scored.sort(
      (left, right) => right.score - left.score || left.name.localeCompare(right.name, 'ko'),
    )
    return scored.map(({ value, label }) => ({ value, label }))
  }, [availableUnits, deployedUnitIds, sideCountryIds, sideHistoricalCountryIds])

  /** 작전 당시 상급 부대 오버라이드 선택지 (같은 진영 투입 부대 + 전체 부대) */
  const parentOverrideOptionsFor = (selfUnitId: string) => {
    const inSideUnitIds = new Set(sideUnits.map((rowItem) => rowItem.unit.id))
    return availableUnits
      .filter((unitItem) => unitItem.id !== selfUnitId)
      .sort((left, right) => {
        const leftIn = inSideUnitIds.has(left.id) ? 1 : 0
        const rightIn = inSideUnitIds.has(right.id) ? 1 : 0
        return rightIn - leftIn || left.name.localeCompare(right.name, 'ko')
      })
      .map((unitItem) => {
        const typeLabel = unitItem.unitType ? militaryUnitTypeLabelKo(unitItem.unitType) : null
        return {
          value: unitItem.id,
          label: typeLabel ? `${unitItem.name} (${typeLabel})` : unitItem.name,
        }
      })
  }

  const toggleCollapse = (unitId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(unitId)) next.delete(unitId)
      else next.add(unitId)
      return next
    })
  }

  const handleAddUnit = async (militaryUnitId: string, role?: SideUnitRole | null) => {
    if (!militaryUnitId) return
    setBusy(true)
    try {
      await addEventSideUnit(eventId, sideId, {
        militaryUnitId,
        role: role ?? null,
      })
      await onRefresh()
      notify.success('전투서열에 부대를 투입했습니다')
    } catch (err) {
      notify.error(err instanceof Error ? err.message : '부대 투입에 실패했습니다')
    } finally {
      setBusy(false)
    }
  }

  const handlePatchUnit = async (
    rowId: string,
    patch: {
      role?: SideUnitRole | null
      parentUnitId?: string | null
      commanderId?: string | null
      note?: string | null
    },
  ) => {
    setBusy(true)
    try {
      await updateEventSideUnit(eventId, rowId, patch)
      await onRefresh()
    } catch (err) {
      notify.error(err instanceof Error ? err.message : '투입 부대 수정에 실패했습니다')
    } finally {
      setBusy(false)
    }
  }

  const handleRemoveUnit = async (rowId: string, unitName: string) => {
    setBusy(true)
    try {
      await removeEventSideUnit(eventId, rowId)
      await onRefresh()
      notify.success(`'${unitName}' 투입을 해제했습니다`)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : '부대 제외에 실패했습니다')
    } finally {
      setBusy(false)
    }
  }

  const renderNode = (node: OrbatTreeNode, depth: number): React.ReactNode => {
    const hasChildren = node.children.length > 0
    const isCollapsed = collapsedIds.has(node.unitId)
    const deployed = node.deployed
    const isHighCommand =
      node.unitType === 'THEATER' ||
      node.unitType === 'ARMY_GROUP' ||
      node.unitType === 'FRONT' ||
      node.unitType === 'MILITARY_DISTRICT'

    return (
      <TreeItem key={node.unitId} $depth={depth}>
        <NodeCard
          $color={sideColor}
          $inferred={!deployed}
          $highCommand={isHighCommand}
          data-testid={`orbat-node-${node.unitId}`}
        >
          <NodeMainRow>
            {hasChildren ? (
              <CollapseBtn
                type="button"
                onClick={() => toggleCollapse(node.unitId)}
                aria-label={isCollapsed ? `${node.name} 하위 부대 펼치기` : `${node.name} 하위 부대 접기`}
              >
                {isCollapsed ? <FiChevronRight size={12} /> : <FiChevronDown size={12} />}
              </CollapseBtn>
            ) : (
              <LeafBullet $color={sideColor} />
            )}

            {node.unitTypeLabel && (
              <UnitTypeBadge $highCommand={isHighCommand}>{node.unitTypeLabel}</UnitTypeBadge>
            )}

            <UnitNameLink
              to={`${pathKeys.militaryTimeline()}?unitId=${encodeURIComponent(node.unitId)}`}
              title="군사 부대 상세 보기"
            >
              {node.name}
            </UnitNameLink>

            {node.nickname && <UnitNickname>“{node.nickname}”</UnitNickname>}

            {deployed ? (
              <RoleSelectWrap $role={deployed.role}>
                <InlineSelect
                  value={deployed.role ?? ''}
                  options={SIDE_UNIT_ROLE_OPTIONS}
                  onSave={(next) =>
                    void handlePatchUnit(deployed.id, {
                      role: (next || null) as SideUnitRole | null,
                    })
                  }
                  placeholder="역할 지정"
                  label={`${node.name} 작전 역할`}
                />
              </RoleSelectWrap>
            ) : (
              <InferredTag
                type="button"
                title="하위 부대 편제로 자동 표시된 상급 부대입니다. 클릭하면 이 진영에 직접 투입 등록합니다."
                onClick={() => void handleAddUnit(node.unitId)}
              >
                상급 편제 · + 직접 등록
              </InferredTag>
            )}

            {deployed && (
              <RemoveUnitBtn
                type="button"
                onClick={() => void handleRemoveUnit(deployed.id, node.name)}
                aria-label={`${node.name} 투입 제외`}
                title="전투서열에서 제외"
              >
                <FiX size={12} />
              </RemoveUnitBtn>
            )}
          </NodeMainRow>

          {/* 지휘관 · 배속 상급 부대 오버라이드 · 부대별 측정값(병력/전차/항공기) · 메모 */}
          {deployed && (
            <NodeSubRow>
              {deployed.commander ? (
                <CommanderChipGroup>
                  <CommanderLink
                    to={pathKeys.personsTimelineDetail(deployed.commander.id)}
                    title={
                      deployed.commander.isOverride
                        ? '이 작전 지휘관(직접 지정됨) — 인물 상세 보기'
                        : '부대 지휘관 임기 기록에서 자동 추론됨 — 인물 상세 보기'
                    }
                  >
                    🎖️ {deployed.commander.name}
                    {deployed.commander.rank ? ` (${deployed.commander.rank})` : ''}
                  </CommanderLink>
                  <TinyActionBtn
                    type="button"
                    onClick={() => setCommanderPickerRow(deployed)}
                    title="작전 당시 지휘관 변경"
                  >
                    변경
                  </TinyActionBtn>
                  {deployed.commanderId && (
                    <TinyActionBtn
                      type="button"
                      onClick={() => void handlePatchUnit(deployed.id, { commanderId: null })}
                      title="지휘관 수동 지정 해제(부대 기본 임기로 복원)"
                    >
                      초기화
                    </TinyActionBtn>
                  )}
                </CommanderChipGroup>
              ) : (
                <TinyActionBtn
                  type="button"
                  onClick={() => setCommanderPickerRow(deployed)}
                  title="이 작전 당시 부대 지휘관 지정"
                >
                  <FiUser size={10} /> 지휘관 지정
                </TinyActionBtn>
              )}

              <ParentOverrideWrap>
                <InlineSelect
                  value={deployed.parentUnitId ?? ''}
                  options={parentOverrideOptionsFor(node.unitId)}
                  onSave={(next) =>
                    void handlePatchUnit(deployed.id, { parentUnitId: next || null })
                  }
                  placeholder="배속 상급부대(기본)"
                  label={`${node.name} 작전 당시 배속 상급 부대`}
                />
              </ParentOverrideWrap>

              {deployed.metrics.map((metric) => (
                <UnitMetricPill key={metric.id} title={metric.qualifier ?? undefined}>
                  {formatSideUnitMetric(metric)}
                </UnitMetricPill>
              ))}

              <UnitNoteWrap>
                <InlineText
                  value={deployed.note ?? ''}
                  onSave={(next) =>
                    void handlePatchUnit(deployed.id, { note: next.trim() || null })
                  }
                  placeholder="임무·비고"
                  as="span"
                />
              </UnitNoteWrap>
            </NodeSubRow>
          )}
        </NodeCard>

        {hasChildren && !isCollapsed && (
          <ChildrenBranch $color={sideColor}>
            {node.children.map((child) => renderNode(child, depth + 1))}
          </ChildrenBranch>
        )}
      </TreeItem>
    )
  }

  return (
    <OrbatContainer aria-label={`${sideName} 전투서열 (ORBAT)`} aria-busy={busy}>
      <OrbatHeader>
        <OrbatTitleWrap>
          <FiShield size={12} />
          <OrbatTitle>전투서열 (ORBAT)</OrbatTitle>
          {sideUnits.length > 0 && <OrbatCount>{sideUnits.length}개 부대</OrbatCount>}
        </OrbatTitleWrap>

        {summaryByType.length > 0 && (
          <SummaryPills>
            {summaryByType.map((item) => (
              <SummaryPill key={item.unitType}>
                {item.label} <strong>{item.count}</strong>
              </SummaryPill>
            ))}
          </SummaryPills>
        )}
      </OrbatHeader>

      {tree.length > 0 ? (
        <DepartmentList>
          {departmentGroups.map((group) => (
            <DepartmentBlock key={group.key}>
              {group.label && (
                <DepartmentBanner $color={sideColor}>
                  🏛️ 최고사령부·지도부: <strong>{group.label}</strong>
                </DepartmentBanner>
              )}
              <RootTreeList>{group.nodes.map((node) => renderNode(node, 0))}</RootTreeList>
            </DepartmentBlock>
          ))}
        </DepartmentList>
      ) : (
        <EmptyOrbat>
          투입된 군사 부대가 없습니다 — 집단군·전선군·야전군·사단 등 참전 부대를 추가하면 지휘 계통(ORBAT) 도표가 자동으로 조립됩니다.
        </EmptyOrbat>
      )}

      <OrbatFooter>
        {unitPickerOptions.length > 0 ? (
          <AddUnitSelectWrap>
            <FiPlus size={11} />
            <InlineSelect
              value=""
              options={unitPickerOptions}
              onSave={(militaryUnitId) => void handleAddUnit(militaryUnitId)}
              placeholder="부대 투입 (집단군·전선군·야전군·사단…)"
              label={`${sideName}에 투입할 군사 부대`}
              clearable={false}
            />
          </AddUnitSelectWrap>
        ) : (
          <ManageUnitsLink to={pathKeys.militaryTimeline()}>
            + 군사 부대 도메인에서 새 부대 등록하기
          </ManageUnitsLink>
        )}
      </OrbatFooter>

      {commanderPickerRow && (
        <PersonPickerModal
          title={`${commanderPickerRow.unit.name} — 작전 당시 지휘관 지정`}
          pinnedIds={candidatePersonIds}
          excludeIds={commanderPickerRow.commanderId ? [commanderPickerRow.commanderId] : []}
          excludeReason="현재 지정된 지휘관"
          onSelect={(personId) => {
            const targetRow = commanderPickerRow
            setCommanderPickerRow(null)
            void handlePatchUnit(targetRow.id, { commanderId: personId })
          }}
          onClose={() => setCommanderPickerRow(null)}
        />
      )}
    </OrbatContainer>
  )
}

export { SIDE_UNIT_ROLE_LABEL }

const OrbatContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
  padding: 10px 12px;
  border-radius: ${RADIUS.SM};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.025)' : 'rgba(15,23,42,0.025)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'};
`

const OrbatHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px 10px;
`

const OrbatTitleWrap = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const OrbatTitle = styled.span`
  letter-spacing: -0.01em;
`

const OrbatCount = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SummaryPills = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`

const SummaryPill = styled.span`
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 10.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.06)'};

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const DepartmentList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const DepartmentBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`

const DepartmentBanner = styled.div<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  align-self: flex-start;
  padding: 2px 9px;
  border-radius: ${RADIUS.XS};
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ $color, theme }) =>
    `color-mix(in srgb, ${$color} ${theme.mode === 'dark' ? 16 : 10}%, transparent)`};
  border-left: 3px solid ${({ $color }) => $color};

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const RootTreeList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin: 0;
  padding: 0;
  list-style: none;
`

const TreeItem = styled.li<{ $depth: number }>`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const ChildrenBranch = styled.ul<{ $color: string }>`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0 0 0 11px;
  padding: 2px 0 2px 11px;
  list-style: none;
  border-left: 2px solid
    ${({ $color, theme }) =>
      `color-mix(in srgb, ${$color} ${theme.mode === 'dark' ? 42 : 34}%, transparent)`};
`

const NodeCard = styled.div<{
  $color: string
  $inferred?: boolean
  $highCommand?: boolean
}>`
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 5px 8px;
  border-radius: ${RADIUS.XS};
  background: ${({ theme, $highCommand, $inferred }) =>
    $inferred
      ? 'transparent'
      : $highCommand
        ? theme.mode === 'dark'
          ? 'rgba(255,255,255,0.055)'
          : 'rgba(15,23,42,0.045)'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.03)'
          : 'rgba(255,255,255,0.7)'};
  border: 1px ${({ $inferred }) => ($inferred ? 'dashed' : 'solid')}
    ${({ theme, $highCommand, $color }) =>
      $highCommand
        ? `color-mix(in srgb, ${$color} 35%, transparent)`
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.07)'
          : 'rgba(15,23,42,0.08)'};
`

const NodeMainRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
  min-width: 0;
`

const CollapseBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  border-radius: 3px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)'};
  }
`

const LeafBullet = styled.span<{ $color: string }>`
  width: 6px;
  height: 6px;
  margin: 0 5px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  opacity: 0.75;
  flex-shrink: 0;
`

const UnitTypeBadge = styled.span<{ $highCommand?: boolean }>`
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10.5px;
  font-weight: 700;
  background: ${({ theme, $highCommand }) =>
    $highCommand
      ? theme.mode === 'dark'
        ? 'rgba(245, 158, 11, 0.2)'
        : 'rgba(245, 158, 11, 0.14)'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.09)'
        : 'rgba(15,23,42,0.07)'};
  color: ${({ theme, $highCommand }) =>
    $highCommand
      ? theme.mode === 'dark'
        ? '#fbbf24'
        : '#b45309'
      : theme.colors.text.secondary};
`

const UnitNameLink = styled(Link)`
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: underline;
  }
`

const UnitNickname = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const RoleSelectWrap = styled.span<{ $role: SideUnitRole | null }>`
  display: inline-flex;
  align-items: center;
  padding: 0 6px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  background: ${({ $role, theme }) =>
    $role === 'MAIN_EFFORT'
      ? theme.mode === 'dark'
        ? 'rgba(239, 68, 68, 0.22)'
        : 'rgba(239, 68, 68, 0.12)'
      : $role === 'SUPPORTING'
        ? theme.mode === 'dark'
          ? 'rgba(59, 130, 246, 0.22)'
          : 'rgba(59, 130, 246, 0.12)'
        : $role === 'DEFENSE'
          ? theme.mode === 'dark'
            ? 'rgba(16, 185, 129, 0.22)'
            : 'rgba(16, 185, 129, 0.12)'
          : $role === 'RESERVE'
            ? theme.mode === 'dark'
              ? 'rgba(168, 85, 247, 0.2)'
              : 'rgba(168, 85, 247, 0.12)'
            : 'transparent'};
  color: ${({ $role, theme }) =>
    $role === 'MAIN_EFFORT'
      ? theme.mode === 'dark'
        ? '#fca5a5'
        : '#dc2626'
      : $role === 'SUPPORTING'
        ? theme.mode === 'dark'
          ? '#93c5fd'
          : '#2563eb'
        : $role === 'DEFENSE'
          ? theme.mode === 'dark'
            ? '#6ee7b7'
            : '#059669'
          : $role === 'RESERVE'
            ? theme.mode === 'dark'
              ? '#d8b4fe'
              : '#7e22ce'
            : theme.colors.text.tertiary};
`

const InferredTag = styled.button`
  padding: 1px 6px;
  border-radius: 999px;
  border: 1px dashed ${({ theme }) => theme.colors.text.tertiary};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font: inherit;
  font-size: 10.5px;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const RemoveUnitBtn = styled.button`
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.error};
  }
`

const NodeSubRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  padding-left: 20px;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const CommanderChipGroup = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`

const CommanderLink = styled(Link)`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: underline;
  }
`

const TinyActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 0 5px;
  border-radius: 4px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)'};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font: inherit;
  font-size: 10.5px;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const ParentOverrideWrap = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const UnitMetricPill = styled.span`
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(16, 185, 129, 0.16)' : 'rgba(16, 185, 129, 0.1)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#6ee7b7' : '#047857')};
`

const UnitNoteWrap = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11px;
`

const EmptyOrbat = styled.p`
  margin: 0;
  font-size: 11.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const OrbatFooter = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding-top: 2px;
`

const AddUnitSelectWrap = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
`

const ManageUnitsLink = styled(Link)`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`
