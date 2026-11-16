/**
 * 중앙부처·국가기관 — 카테고리·시대별 계층 편제 트리
 * - 직능 탭 선택 시에도 타 직능 산하 외청(예: 기획재정부 → 통계청)이 끊기지 않고 하위에 유지됨
 * - 검색·단일 조회 시 상위 부처가 트리에서 생략되면 항상 `상위: OO부` 경로 표시
 * - 다시대 국가(전체 시대 보기)에서 시대·정권별 접이식 섹션 그룹핑 지원
 * - 역대 인사 수(`tenureCount`) 및 후신 개편 계보(`→ OO부`) 배지 표시
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FiAlertTriangle,
  FiArrowRight,
  FiAward,
  FiBriefcase,
  FiChevronDown,
  FiChevronRight,
  FiGlobe,
  FiLayers,
  FiPlus,
  FiShield,
  FiUsers,
} from 'react-icons/fi'

import { GOV_BRAND } from '@/features/government-info/ui/government-ledger.styles'
import {
  type AdministrationDepartment,
  DEPARTMENT_KIND_LABEL,
} from '@/shared/api/administration-department'
import { getUploadImageUrl } from '@/shared/api/upload'
import {
  buildForest,
  childrenOf,
  collectDescendantDepartmentIds,
  hasParentCycleInList,
  resolveDepartmentLifecycleStatus,
} from '@/shared/lib/ministry-department/ministry-department-utils'

export type MinistryEraTreeSection = {
  id: string
  label: string
  subLabel?: string | null
  departments: AdministrationDepartment[]
}

export type MinistryDepartmentTreeProps = {
  allDepartments: AdministrationDepartment[]
  departmentsInCategory: AdministrationDepartment[]
  /** 상단 툴바 필터(시대·성격·상태·연도)만 통과한 풀 — 직능 탭 선택 시 타 직능 산하 외청을 하위에 보존하는 데 사용 */
  toolbarFilteredDepartments?: AdministrationDepartment[]
  /** 현재 선택된 직능 탭 ID (동일 직능 중복 뱃지 생략용) */
  activeCategoryId?: string
  /** 검색어 입력 중 여부 (검색 중에는 일치 항목만 표시하고 상위 부처 경로를 라벨로 안내) */
  isSearchActive?: boolean
  /** 다시대 국가 시대별 섹션 묶음 (전달 시 시대별 접이식 트리로 렌더링) */
  eraSections?: ReadonlyArray<MinistryEraTreeSection> | null
  isDark: boolean
  onSelectDepartment: (dept: AdministrationDepartment) => void
  selectedDepartmentId?: string | null
  onAddRoot: () => void
  onAddChild?: (parent: AdministrationDepartment) => void
  onGoToPositionDefinitions?: () => void
}

function formatDeptYearPart(
  parts: AdministrationDepartment['established'] | null | undefined,
  isoFallback?: string | null,
): string | null {
  if (parts && typeof parts.year === 'number' && parts.year > 0) {
    return `${parts.era === 'BC' ? 'BC ' : ''}${parts.year}`
  }
  if (!isoFallback) return null
  const trimmed = isoFallback.trim()
  const bcMatch = /^-(\d{1,6})/.exec(trimmed)
  if (bcMatch) return `BC ${Number(bcMatch[1])}`
  const adMatch = /^(\d{1,4})/.exec(trimmed)
  if (adMatch) return `${Number(adMatch[1])}`
  return null
}

function getLedgerTokens(isDark: boolean) {
  return {
    hairline: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(20, 19, 34, 0.06)',
    rail: isDark ? 'rgba(255, 255, 255, 0.13)' : 'rgba(20, 19, 34, 0.12)',
    text: isDark ? '#f1f5f9' : '#0f172a',
    textSub: isDark ? '#94a3b8' : '#64748b',
    textFaint: isDark ? '#64748b' : '#94a3b8',
    hoverBg: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(20, 19, 34, 0.025)',
    selectedBg: isDark ? GOV_BRAND.primarySoftDark : GOV_BRAND.primarySoft,
    chipBg: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(20, 19, 34, 0.045)',
    chipBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(20, 19, 34, 0.1)',
    sectionHeaderBg: isDark ? 'rgba(255, 255, 255, 0.025)' : '#f8fafc',
  }
}

function expandWithFilteredDescendants(
  seedDepartments: AdministrationDepartment[],
  poolDepartments: AdministrationDepartment[],
  includeDescendants: boolean,
): AdministrationDepartment[] {
  if (!includeDescendants || seedDepartments.length === 0) {
    return seedDepartments
  }
  const keepIds = new Set(seedDepartments.map((deptItem) => deptItem.id))
  for (const seedDept of seedDepartments) {
    const descIds = collectDescendantDepartmentIds(seedDept.id, poolDepartments)
    for (const descId of descIds) {
      keepIds.add(descId)
    }
  }
  if (keepIds.size === seedDepartments.length) {
    return seedDepartments
  }
  const merged: AdministrationDepartment[] = [...seedDepartments]
  const existingSet = new Set(seedDepartments.map((deptItem) => deptItem.id))
  for (const poolItem of poolDepartments) {
    if (keepIds.has(poolItem.id) && !existingSet.has(poolItem.id)) {
      merged.push(poolItem)
      existingSet.add(poolItem.id)
    }
  }
  return merged
}

function DeptEmblemThumb({
  dept,
  size = 30,
  isDark,
}: {
  dept: AdministrationDepartment
  size?: number
  isDark: boolean
}) {
  const tokens = getLedgerTokens(isDark)
  if (dept.thumbnailUrl) {
    return (
      <img
        src={getUploadImageUrl(dept.thumbnailUrl)}
        alt=""
        style={{
          width: size,
          height: size,
          objectFit: 'cover',
          borderRadius: 7,
          flexShrink: 0,
          border: `1px solid ${tokens.chipBorder}`,
        }}
      />
    )
  }

  const hasUnits = (dept.militaryUnits?.length ?? 0) > 0
  const deptKind = dept.kind || 'MINISTRY'
  const iconTone = hasUnits
    ? {
        bg: isDark ? 'rgba(13, 148, 136, 0.16)' : '#f0fdfa',
        border: isDark ? 'rgba(45, 212, 191, 0.25)' : '#ccfbf1',
        color: isDark ? '#5eead4' : '#0d9488',
      }
    : deptKind === 'ROYAL_HOUSEHOLD'
      ? {
          bg: isDark ? 'rgba(245, 158, 11, 0.14)' : '#fffbeb',
          border: isDark ? 'rgba(251, 191, 36, 0.24)' : '#fde68a',
          color: isDark ? '#fbbf24' : '#b45309',
        }
      : {
          bg: tokens.chipBg,
          border: tokens.chipBorder,
          color: tokens.textSub,
        }

  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: 7,
        background: iconTone.bg,
        border: `1px solid ${iconTone.border}`,
        color: iconTone.color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {hasUnits ? (
        <FiShield size={14} />
      ) : deptKind === 'ROYAL_HOUSEHOLD' ? (
        <FiAward size={14} />
      ) : deptKind === 'COLONIAL_GOVERNMENT' ? (
        <FiGlobe size={14} />
      ) : deptKind === 'AGENCY' ? (
        <FiLayers size={14} />
      ) : (
        <FiBriefcase size={14} />
      )}
    </div>
  )
}

function renderDeptMetaBadges({
  dept,
  isDark,
  visibleChildCount,
  hideEraBadge = false,
  activeCategoryId,
}: {
  dept: AdministrationDepartment
  isDark: boolean
  visibleChildCount: number
  hideEraBadge?: boolean
  activeCategoryId?: string
}) {
  const tokens = getLedgerTokens(isDark)
  const kindLabel =
    dept.kind && DEPARTMENT_KIND_LABEL[dept.kind]
      ? DEPARTMENT_KIND_LABEL[dept.kind]
      : null
  const unitCount = dept.militaryUnits?.length ?? 0
  const tenureCount = dept.tenureCount ?? 0
  const estYearStr = formatDeptYearPart(dept.established, dept.establishedDate)
  const abolYearStr = formatDeptYearPart(dept.abolished, dept.abolishedDate)
  const lifecycleStatus = resolveDepartmentLifecycleStatus(dept)
  const endFallbackStr =
    lifecycleStatus === 'SUPERSEDED'
      ? '개편'
      : lifecycleStatus === 'HISTORICAL_ENDED'
        ? ''
        : lifecycleStatus === 'ABOLISHED'
          ? '폐지'
          : '현재'
  const lifespanLabel =
    estYearStr || abolYearStr
      ? `${estYearStr ?? '?'}–${abolYearStr ?? endFallbackStr}`
      : null

  const primarySuccessorName =
    dept.successors?.[0]?.department?.name ??
    dept.militaryUnitSuccessors?.[0]?.militaryUnit?.name ??
    null
  const extraSuccessorCount =
    (dept.successors?.length ?? 0) +
    (dept.militaryUnitSuccessors?.length ?? 0) -
    1

  const showCategoryChip =
    Boolean(dept.category?.name) &&
    (!activeCategoryId || dept.categoryId !== activeCategoryId)

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 5,
        marginTop: 3,
      }}
    >
      {lifespanLabel ? (
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            fontVariantNumeric: 'tabular-nums',
            color: tokens.textSub,
          }}
        >
          {lifespanLabel}
        </span>
      ) : null}
      {!hideEraBadge && dept.historicalCountry?.name ? (
        <span
          style={{
            padding: '1px 6px',
            borderRadius: 4,
            fontSize: 10.5,
            fontWeight: 600,
            background: tokens.chipBg,
            color: tokens.textSub,
          }}
        >
          {dept.historicalCountry.name}
        </span>
      ) : null}
      {kindLabel && dept.kind !== 'MINISTRY' ? (
        <span
          style={{
            padding: '1px 6px',
            borderRadius: 4,
            fontSize: 10.5,
            fontWeight: 600,
            background: tokens.chipBg,
            color: tokens.textSub,
          }}
        >
          {kindLabel}
        </span>
      ) : null}
      {showCategoryChip && dept.category?.name ? (
        <span
          style={{
            padding: '1px 6px',
            borderRadius: 4,
            fontSize: 10.5,
            fontWeight: 500,
            background: tokens.chipBg,
            color: tokens.textSub,
          }}
        >
          {dept.category.name}
        </span>
      ) : null}
      {tenureCount > 0 ? (
        <span
          title={`역대 수장·인사 ${tenureCount}명`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            padding: '1px 6px',
            borderRadius: 4,
            fontSize: 10.5,
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
            background: isDark ? GOV_BRAND.primarySoftDark : GOV_BRAND.primarySoft,
            color: isDark ? '#93c5fd' : GOV_BRAND.primary,
          }}
        >
          <FiUsers size={9.5} />
          인사 {tenureCount}
        </span>
      ) : null}
      {primarySuccessorName ? (
        <span
          title={`후신 개편: ${primarySuccessorName}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 2,
            padding: '1px 6px',
            borderRadius: 4,
            fontSize: 10.5,
            fontWeight: 600,
            background: isDark ? 'rgba(99, 102, 241, 0.15)' : '#eef2ff',
            color: isDark ? '#a5b4fc' : '#4338ca',
          }}
        >
          <FiArrowRight size={9.5} />
          {primarySuccessorName}
          {extraSuccessorCount > 0 ? ` 외 ${extraSuccessorCount}` : ''}
        </span>
      ) : null}
      {visibleChildCount > 0 ? (
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
            color: tokens.textFaint,
          }}
        >
          산하 {visibleChildCount}
        </span>
      ) : null}
      {unitCount > 0 ? (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            padding: '1px 6px',
            borderRadius: 4,
            fontSize: 10.5,
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
            background: isDark ? 'rgba(13, 148, 136, 0.16)' : '#f0fdfa',
            color: isDark ? '#5eead4' : '#0f766e',
          }}
        >
          <FiShield size={10} />
          부대 {unitCount}
        </span>
      ) : null}
    </div>
  )
}

function ForestBlock({
  sectionDepartments,
  parentById,
  ancestorIdsOfSelected,
  hideEraBadge = false,
  activeCategoryId,
  isDark,
  selectedDepartmentId,
  onSelectDepartment,
  onAddChild,
}: {
  sectionDepartments: AdministrationDepartment[]
  parentById: ReadonlyMap<string, AdministrationDepartment>
  ancestorIdsOfSelected: ReadonlySet<string>
  hideEraBadge?: boolean
  activeCategoryId?: string
  isDark: boolean
  selectedDepartmentId?: string | null
  onSelectDepartment: (dept: AdministrationDepartment) => void
  onAddChild?: (parent: AdministrationDepartment) => void
}) {
  const tokens = useMemo(() => getLedgerTokens(isDark), [isDark])
  const roots = useMemo(
    () => buildForest(sectionDepartments),
    [sectionDepartments],
  )
  const cycleDetected = useMemo(
    () => hasParentCycleInList(sectionDepartments),
    [sectionDepartments],
  )
  const showFlatFallback =
    sectionDepartments.length > 0 && (roots.length === 0 || cycleDetected)

  const sectionIds = useMemo(
    () => new Set(sectionDepartments.map((deptItem) => deptItem.id)),
    [sectionDepartments],
  )

  const detachedParentHint = useCallback(
    (dept: AdministrationDepartment) => {
      const parentId = dept.parentId
      if (!parentId || sectionIds.has(parentId)) return null
      const parentDept = parentById.get(parentId)
      if (!parentDept) return null
      const parentCatName =
        parentDept.categoryId !== dept.categoryId
          ? (parentDept.category?.name ?? null)
          : null
      return {
        parentName: parentDept.name,
        categoryLabel: parentCatName,
      }
    },
    [parentById, sectionIds],
  )

  const sortedFlat = useMemo(
    () =>
      [...sectionDepartments].sort((left, right) =>
        left.name.localeCompare(right.name, 'ko', { sensitivity: 'base' }),
      ),
    [sectionDepartments],
  )

  if (showFlatFallback) {
    return (
      <div>
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            padding: '10px 14px',
            borderBottom: `1px solid ${tokens.hairline}`,
            background: isDark ? 'rgba(251,191,36,0.08)' : '#fffbeb',
            color: isDark ? '#fde68a' : '#92400e',
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          <FiAlertTriangle
            size={16}
            style={{ flexShrink: 0, marginTop: 2 }}
            aria-hidden
          />
          <div>
            <strong style={{ display: 'block', marginBottom: 2 }}>
              {cycleDetected
                ? '부처 상위(parent) 연결에 순환이 감지되었습니다.'
                : '계층을 트리로 표시할 수 없습니다.'}
            </strong>
            이름순 목록입니다. 상위 부처를 수정한 뒤 다시 확인해 주세요.
          </div>
        </div>
        {sortedFlat.map((dept) => (
          <FlatDeptRow
            key={dept.id}
            dept={dept}
            isDark={isDark}
            hideEraBadge={hideEraBadge}
            activeCategoryId={activeCategoryId}
            detachedParentHint={detachedParentHint}
            onSelectDepartment={onSelectDepartment}
            onAddChild={onAddChild}
            selectedDepartmentId={selectedDepartmentId}
          />
        ))}
      </div>
    )
  }

  return (
    <div>
      {roots.map((root) => (
        <DeptTreeNode
          key={root.id}
          dept={root}
          depth={0}
          departmentsInSection={sectionDepartments}
          ancestorIdsOfSelected={ancestorIdsOfSelected}
          hideEraBadge={hideEraBadge}
          activeCategoryId={activeCategoryId}
          isDark={isDark}
          onSelectDepartment={onSelectDepartment}
          onAddChild={onAddChild}
          selectedDepartmentId={selectedDepartmentId}
          detachedParentHint={detachedParentHint}
        />
      ))}
    </div>
  )
}

export function MinistryDepartmentTree({
  allDepartments,
  departmentsInCategory,
  toolbarFilteredDepartments,
  activeCategoryId,
  isSearchActive = false,
  eraSections,
  isDark,
  onSelectDepartment,
  selectedDepartmentId,
  onAddRoot,
  onAddChild,
  onGoToPositionDefinitions,
}: MinistryDepartmentTreeProps) {
  const tokens = useMemo(() => getLedgerTokens(isDark), [isDark])
  const effectivePool = toolbarFilteredDepartments ?? allDepartments

  const parentById = useMemo(() => {
    const deptMap = new Map<string, AdministrationDepartment>()
    for (const deptItem of allDepartments) deptMap.set(deptItem.id, deptItem)
    return deptMap
  }, [allDepartments])

  const ancestorIdsOfSelected = useMemo(() => {
    const ancestors = new Set<string>()
    if (!selectedDepartmentId) return ancestors
    const visited = new Set<string>()
    let cur = parentById.get(selectedDepartmentId)?.parentId ?? null
    while (cur && !visited.has(cur)) {
      visited.add(cur)
      ancestors.add(cur)
      cur = parentById.get(cur)?.parentId ?? null
    }
    return ancestors
  }, [parentById, selectedDepartmentId])

  const expandedCategoryDepts = useMemo(
    () =>
      expandWithFilteredDescendants(
        departmentsInCategory,
        effectivePool,
        !isSearchActive,
      ),
    [departmentsInCategory, effectivePool, isSearchActive],
  )

  const resolvedEraSections = useMemo(() => {
    if (!eraSections || eraSections.length <= 1) return null
    return eraSections
      .map((sec) => {
        const poolInSameEra = effectivePool.filter((poolItem) =>
          sec.id === '__MODERN__'
            ? !poolItem.historicalCountryId
            : poolItem.historicalCountryId === sec.id,
        )
        const mergedDepts = expandWithFilteredDescendants(
          sec.departments,
          poolInSameEra,
          !isSearchActive,
        )
        return {
          ...sec,
          departments: mergedDepts,
        }
      })
      .filter((sec) => sec.departments.length > 0)
  }, [effectivePool, eraSections, isSearchActive])

  const [collapsedEraIds, setCollapsedEraIds] = useState<Set<string>>(
    () => new Set(),
  )

  // 선택된 기관이 속한 시대 섹션은 자동으로 펼침
  useEffect(() => {
    if (!selectedDepartmentId || !resolvedEraSections) return
    const ownerSection = resolvedEraSections.find((sec) =>
      sec.departments.some((d) => d.id === selectedDepartmentId),
    )
    if (ownerSection && collapsedEraIds.has(ownerSection.id)) {
      setCollapsedEraIds((prev) => {
        const next = new Set(prev)
        next.delete(ownerSection.id)
        return next
      })
    }
  }, [collapsedEraIds, resolvedEraSections, selectedDepartmentId])

  const toggleEraSection = (eraId: string) => {
    setCollapsedEraIds((prev) => {
      const next = new Set(prev)
      if (next.has(eraId)) {
        next.delete(eraId)
      } else {
        next.add(eraId)
      }
      return next
    })
  }

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
        }}
      >
        {resolvedEraSections && resolvedEraSections.length > 1 ? (
          resolvedEraSections.map((sec) => {
            const isCollapsed = collapsedEraIds.has(sec.id)
            return (
              <div key={sec.id}>
                <button
                  type="button"
                  aria-expanded={!isCollapsed}
                  onClick={() => toggleEraSection(sec.id)}
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    padding: '7px 12px',
                    border: 'none',
                    borderBottom: `1px solid ${tokens.hairline}`,
                    background: isDark ? '#141925' : '#f8fafc',
                    color: tokens.text,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      minWidth: 0,
                    }}
                  >
                    {isCollapsed ? (
                      <FiChevronRight size={13} color={tokens.textSub} />
                    ) : (
                      <FiChevronDown size={13} color={tokens.textSub} />
                    )}
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {sec.label}
                    </span>
                    {sec.subLabel ? (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          color: tokens.textSub,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {sec.subLabel}
                      </span>
                    ) : null}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums',
                      padding: '1px 7px',
                      borderRadius: 999,
                      background: tokens.chipBg,
                      color: tokens.textSub,
                      flexShrink: 0,
                    }}
                  >
                    {sec.departments.length}
                  </span>
                </button>
                {!isCollapsed ? (
                  <ForestBlock
                    sectionDepartments={sec.departments}
                    parentById={parentById}
                    ancestorIdsOfSelected={ancestorIdsOfSelected}
                    hideEraBadge
                    activeCategoryId={activeCategoryId}
                    isDark={isDark}
                    selectedDepartmentId={selectedDepartmentId}
                    onSelectDepartment={onSelectDepartment}
                    onAddChild={onAddChild}
                  />
                ) : null}
              </div>
            )
          })
        ) : (
          <ForestBlock
            sectionDepartments={expandedCategoryDepts}
            parentById={parentById}
            ancestorIdsOfSelected={ancestorIdsOfSelected}
            activeCategoryId={activeCategoryId}
            isDark={isDark}
            selectedDepartmentId={selectedDepartmentId}
            onSelectDepartment={onSelectDepartment}
            onAddChild={onAddChild}
          />
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          flexWrap: 'wrap',
          padding: '10px 14px',
          flexShrink: 0,
          borderTop: `1px solid ${tokens.hairline}`,
        }}
      >
        <button
          type="button"
          onClick={onAddRoot}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            height: 30,
            padding: '0 10px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            border: `1px solid ${tokens.chipBorder}`,
            borderRadius: 7,
            background: 'transparent',
            color: tokens.text,
          }}
        >
          <FiPlus size={13} /> 최상위 기관 추가
        </button>
        {onGoToPositionDefinitions ? (
          <button
            type="button"
            onClick={onGoToPositionDefinitions}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 6px',
              fontSize: 11.5,
              fontWeight: 500,
              cursor: 'pointer',
              border: 'none',
              background: 'transparent',
              color: tokens.textSub,
            }}
          >
            <FiLayers size={12} />
            고유 관직 사전
          </button>
        ) : null}
      </div>
    </div>
  )
}

function FlatDeptRow({
  dept,
  isDark,
  hideEraBadge,
  activeCategoryId,
  detachedParentHint,
  onSelectDepartment,
  onAddChild,
  selectedDepartmentId,
}: {
  dept: AdministrationDepartment
  isDark: boolean
  hideEraBadge?: boolean
  activeCategoryId?: string
  detachedParentHint: (
    deptItem: AdministrationDepartment,
  ) => { parentName: string; categoryLabel: string | null } | null
  onSelectDepartment: (deptItem: AdministrationDepartment) => void
  onAddChild?: (parent: AdministrationDepartment) => void
  selectedDepartmentId?: string | null
}) {
  const tokens = getLedgerTokens(isDark)
  const [hover, setHover] = useState(false)
  const detachedParent = detachedParentHint(dept)
  const selected = selectedDepartmentId === dept.id

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '9px 12px 9px 11px',
        borderBottom: `1px solid ${tokens.hairline}`,
        borderLeft: `2.5px solid ${selected ? GOV_BRAND.primary : 'transparent'}`,
        background: selected
          ? tokens.selectedBg
          : hover
            ? tokens.hoverBg
            : 'transparent',
        transition: 'background 0.12s ease',
        boxSizing: 'border-box',
      }}
    >
      <button
        type="button"
        onClick={() => onSelectDepartment(dept)}
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          textAlign: 'left',
          padding: 0,
        }}
      >
        <DeptEmblemThumb dept={dept} size={30} isDark={isDark} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              flexWrap: 'wrap',
              fontSize: 13.5,
              fontWeight: selected ? 700 : 600,
              color: tokens.text,
              letterSpacing: '-0.015em',
              lineHeight: 1.3,
            }}
          >
            <span>{dept.name}</span>
            {dept.abbreviation?.trim() ? (
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 500,
                  color: tokens.textSub,
                }}
              >
                ({dept.abbreviation.trim()})
              </span>
            ) : null}
          </div>
          {renderDeptMetaBadges({
            dept,
            isDark,
            visibleChildCount: 0,
            hideEraBadge,
            activeCategoryId,
          })}
          {detachedParent ? (
            <div
              style={{
                fontSize: 11,
                color: tokens.textSub,
                marginTop: 3,
              }}
            >
              상위: {detachedParent.parentName}
              {detachedParent.categoryLabel
                ? ` · ${detachedParent.categoryLabel}`
                : ''}
            </div>
          ) : null}
        </div>
      </button>
      {onAddChild ? (
        <button
          type="button"
          title={`${dept.name} 산하 기관 추가`}
          onClick={(event) => {
            event.stopPropagation()
            onAddChild(dept)
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            height: 24,
            padding: '0 7px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            border: `1px solid ${tokens.chipBorder}`,
            background: 'transparent',
            color: tokens.textSub,
            cursor: 'pointer',
            flexShrink: 0,
            opacity: hover || selected ? 1 : 0.65,
          }}
        >
          <FiPlus size={11} /> 산하
        </button>
      ) : null}
    </div>
  )
}

const DeptTreeNode = React.memo(function DeptTreeNode({
  dept,
  depth,
  departmentsInSection,
  ancestorIdsOfSelected,
  hideEraBadge,
  activeCategoryId,
  isDark,
  onSelectDepartment,
  onAddChild,
  selectedDepartmentId,
  detachedParentHint,
}: {
  dept: AdministrationDepartment
  depth: number
  departmentsInSection: AdministrationDepartment[]
  ancestorIdsOfSelected: ReadonlySet<string>
  hideEraBadge?: boolean
  activeCategoryId?: string
  isDark: boolean
  onSelectDepartment: (deptItem: AdministrationDepartment) => void
  onAddChild?: (parent: AdministrationDepartment) => void
  selectedDepartmentId?: string | null
  detachedParentHint: (
    deptItem: AdministrationDepartment,
  ) => { parentName: string; categoryLabel: string | null } | null
}) {
  const tokens = getLedgerTokens(isDark)
  const children = useMemo(
    () => childrenOf(dept.id, departmentsInSection),
    [dept.id, departmentsInSection],
  )
  const [expanded, setExpanded] = useState(
    () => depth === 0 || ancestorIdsOfSelected.has(dept.id),
  )
  const [rowHover, setRowHover] = useState(false)
  const hasChildren = children.length > 0
  const detachedParent = detachedParentHint(dept)
  const isRootInForest =
    !dept.parentId ||
    !departmentsInSection.some((deptItem) => deptItem.id === dept.parentId)
  const selected = selectedDepartmentId === dept.id

  useEffect(() => {
    if (ancestorIdsOfSelected.has(dept.id)) {
      setExpanded(true)
    }
  }, [ancestorIdsOfSelected, dept.id])

  return (
    <div style={{ minWidth: 0 }}>
      <div
        onMouseEnter={() => setRowHover(true)}
        onMouseLeave={() => setRowHover(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          minHeight: 46,
          paddingLeft: 8 + depth * 18,
          paddingRight: 10,
          borderBottom: `1px solid ${tokens.hairline}`,
          borderLeft: `2.5px solid ${selected ? GOV_BRAND.primary : 'transparent'}`,
          background: selected
            ? tokens.selectedBg
            : rowHover
              ? tokens.hoverBg
              : 'transparent',
          transition: 'background 0.12s ease',
        }}
      >
        <div
          style={{
            width: 22,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 4,
          }}
        >
          {hasChildren ? (
            <button
              type="button"
              aria-expanded={expanded}
              aria-label={expanded ? '하위 접기' : '하위 펼치기'}
              onClick={(event) => {
                event.stopPropagation()
                setExpanded((prev) => !prev)
              }}
              style={{
                width: 20,
                height: 20,
                flexShrink: 0,
                border: 'none',
                borderRadius: 5,
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: tokens.textSub,
                padding: 0,
              }}
            >
              {expanded ? (
                <FiChevronDown size={14} />
              ) : (
                <FiChevronRight size={14} />
              )}
            </button>
          ) : (
            <span
              aria-hidden
              style={{
                width: 5,
                height: 5,
                borderRadius: 999,
                background: selected ? GOV_BRAND.primary : tokens.rail,
              }}
            />
          )}
        </div>

        <button
          type="button"
          onClick={() => onSelectDepartment(dept)}
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '8px 6px 8px 0',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <DeptEmblemThumb dept={dept} size={30} isDark={isDark} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                flexWrap: 'wrap',
                fontSize: 13.5,
                fontWeight: selected ? 700 : 600,
                color: tokens.text,
                letterSpacing: '-0.015em',
                lineHeight: 1.3,
              }}
            >
              <span>{dept.name}</span>
              {dept.abbreviation?.trim() ? (
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 500,
                    color: tokens.textSub,
                  }}
                >
                  ({dept.abbreviation.trim()})
                </span>
              ) : null}
            </div>
            {renderDeptMetaBadges({
              dept,
              isDark,
              visibleChildCount: children.length,
              hideEraBadge,
              activeCategoryId,
            })}
            {isRootInForest && detachedParent ? (
              <div
                style={{
                  fontSize: 11,
                  color: tokens.textSub,
                  marginTop: 2,
                }}
              >
                상위: {detachedParent.parentName}
                {detachedParent.categoryLabel
                  ? ` · ${detachedParent.categoryLabel}`
                  : ''}
              </div>
            ) : null}
          </div>
        </button>

        {onAddChild ? (
          <button
            type="button"
            title={`${dept.name} 산하 기관 추가`}
            onClick={(event) => {
              event.stopPropagation()
              onAddChild(dept)
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              height: 24,
              padding: '0 7px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              border: `1px solid ${tokens.chipBorder}`,
              background: 'transparent',
              color: tokens.textSub,
              cursor: 'pointer',
              flexShrink: 0,
              opacity: rowHover || selected ? 1 : 0.65,
            }}
          >
            <FiPlus size={11} /> 산하
          </button>
        ) : null}
      </div>

      {hasChildren && expanded ? (
        <div style={{ position: 'relative' }}>
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 19 + depth * 18,
              width: 1,
              background: tokens.rail,
              pointerEvents: 'none',
            }}
          />
          {children.map((childDept) => (
            <DeptTreeNode
              key={childDept.id}
              dept={childDept}
              depth={depth + 1}
              departmentsInSection={departmentsInSection}
              ancestorIdsOfSelected={ancestorIdsOfSelected}
              hideEraBadge={hideEraBadge}
              activeCategoryId={activeCategoryId}
              isDark={isDark}
              onSelectDepartment={onSelectDepartment}
              onAddChild={onAddChild}
              selectedDepartmentId={selectedDepartmentId}
              detachedParentHint={detachedParentHint}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
})
