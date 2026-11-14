/**
 * 중앙부처 — 카테고리별 계층 목록 (사건 페이지 컴팩트 원장 행 규격)
 */
import React, { useCallback, useMemo, useState } from 'react'
import {
  FiAlertTriangle,
  FiAward,
  FiBriefcase,
  FiChevronDown,
  FiChevronRight,
  FiGlobe,
  FiLayers,
  FiPlus,
  FiShield,
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
  hasParentCycleInList,
} from '@/shared/lib/ministry-department/ministry-department-utils'

export type MinistryDepartmentTreeProps = {
  allDepartments: AdministrationDepartment[]
  departmentsInCategory: AdministrationDepartment[]
  isDark: boolean
  onSelectDepartment: (dept: AdministrationDepartment) => void
  selectedDepartmentId?: string | null
  onAddRoot: () => void
  onAddChild?: (parent: AdministrationDepartment) => void
  onGoToPositionDefinitions?: () => void
}

function formatDeptYearPart(
  parts: AdministrationDepartment['established'] | null | undefined,
): string | null {
  if (!parts || typeof parts.year !== 'number' || parts.year <= 0) return null
  return `${parts.era === 'BC' ? 'BC ' : ''}${parts.year}`
}

function getLedgerTokens(isDark: boolean) {
  return {
    hairline: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(20, 19, 34, 0.06)',
    rail: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(20, 19, 34, 0.12)',
    text: isDark ? '#f1f5f9' : '#0f172a',
    textSub: isDark ? '#94a3b8' : '#64748b',
    textFaint: isDark ? '#64748b' : '#94a3b8',
    hoverBg: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(20, 19, 34, 0.025)',
    selectedBg: isDark ? GOV_BRAND.primarySoftDark : GOV_BRAND.primarySoft,
    chipBg: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(20, 19, 34, 0.045)',
    chipBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(20, 19, 34, 0.1)',
  }
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

function renderDeptMetaBadges(
  dept: AdministrationDepartment,
  isDark: boolean,
) {
  const tokens = getLedgerTokens(isDark)
  const kindLabel =
    dept.kind && DEPARTMENT_KIND_LABEL[dept.kind]
      ? DEPARTMENT_KIND_LABEL[dept.kind]
      : null
  const unitCount = dept.militaryUnits?.length ?? 0
  const childCount = dept.children?.length ?? 0
  const estYearStr = formatDeptYearPart(dept.established)
  const abolYearStr = formatDeptYearPart(dept.abolished)
  const lifespanLabel =
    estYearStr || abolYearStr
      ? `${estYearStr ?? '?'}–${abolYearStr ?? '현재'}`
      : null

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
      {dept.historicalCountry?.name ? (
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
      {dept.category?.name ? (
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
      {childCount > 0 ? (
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
            color: tokens.textFaint,
          }}
        >
          산하 {childCount}
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

export function MinistryDepartmentTree({
  allDepartments,
  departmentsInCategory,
  isDark,
  onSelectDepartment,
  selectedDepartmentId,
  onAddRoot,
  onAddChild,
  onGoToPositionDefinitions,
}: MinistryDepartmentTreeProps) {
  const tokens = useMemo(() => getLedgerTokens(isDark), [isDark])

  const roots = useMemo(
    () => buildForest(departmentsInCategory),
    [departmentsInCategory],
  )

  const cycleInCategory = useMemo(
    () => hasParentCycleInList(departmentsInCategory),
    [departmentsInCategory],
  )

  const showFlatFallback = useMemo(
    () =>
      departmentsInCategory.length > 0 &&
      (roots.length === 0 || cycleInCategory),
    [departmentsInCategory.length, roots.length, cycleInCategory],
  )

  const idsInCategory = useMemo(
    () => new Set(departmentsInCategory.map((deptItem) => deptItem.id)),
    [departmentsInCategory],
  )

  const parentById = useMemo(() => {
    const deptMap = new Map<string, AdministrationDepartment>()
    for (const deptItem of allDepartments) deptMap.set(deptItem.id, deptItem)
    return deptMap
  }, [allDepartments])

  const parentLabel = useCallback(
    (parentId: string | null | undefined) => {
      if (!parentId) return null
      return parentById.get(parentId)?.name ?? null
    },
    [parentById],
  )

  const crossCategoryParentHint = useCallback(
    (dept: AdministrationDepartment) => {
      const parentId = dept.parentId
      if (!parentId || idsInCategory.has(parentId)) return null
      const parentDept = parentById.get(parentId)
      if (!parentDept) return null
      const catName = parentDept.category?.name ?? '다른 카테고리'
      return { parentName: parentDept.name, categoryLabel: catName }
    },
    [idsInCategory, parentById],
  )

  const sortedFlat = useMemo(() => {
    return [...departmentsInCategory].sort((left, right) =>
      left.name.localeCompare(right.name, 'ko', { sensitivity: 'base' }),
    )
  }, [departmentsInCategory])

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
      {showFlatFallback ? (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
          }}
        >
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
                {cycleInCategory
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
              parentLabel={parentLabel}
              crossCategoryParentHint={crossCategoryParentHint}
              onSelectDepartment={onSelectDepartment}
              onAddChild={onAddChild}
              selectedDepartmentId={selectedDepartmentId}
            />
          ))}
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
          }}
        >
          {roots.map((root) => (
            <DeptTreeNode
              key={root.id}
              dept={root}
              depth={0}
              departmentsInCategory={departmentsInCategory}
              isDark={isDark}
              onSelectDepartment={onSelectDepartment}
              onAddChild={onAddChild}
              selectedDepartmentId={selectedDepartmentId}
              crossCategoryParentHint={crossCategoryParentHint}
            />
          ))}
        </div>
      )}

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
            직위·서열 사전
          </button>
        ) : null}
      </div>
    </div>
  )
}

function FlatDeptRow({
  dept,
  isDark,
  parentLabel,
  crossCategoryParentHint,
  onSelectDepartment,
  onAddChild,
  selectedDepartmentId,
}: {
  dept: AdministrationDepartment
  isDark: boolean
  parentLabel: (parentId: string | null | undefined) => string | null
  crossCategoryParentHint: (
    deptItem: AdministrationDepartment,
  ) => { parentName: string; categoryLabel: string } | null
  onSelectDepartment: (deptItem: AdministrationDepartment) => void
  onAddChild?: (parent: AdministrationDepartment) => void
  selectedDepartmentId?: string | null
}) {
  const tokens = getLedgerTokens(isDark)
  const [hover, setHover] = useState(false)
  const parentNameText = parentLabel(dept.parentId)
  const cross = crossCategoryParentHint(dept)
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
          {renderDeptMetaBadges(dept, isDark)}
          {cross ? (
            <div
              style={{
                fontSize: 11,
                color: tokens.textSub,
                marginTop: 3,
              }}
            >
              상위: {cross.parentName} · {cross.categoryLabel}
            </div>
          ) : parentNameText ? (
            <div
              style={{
                fontSize: 11,
                color: tokens.textSub,
                marginTop: 3,
              }}
            >
              상위: {parentNameText}
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
  departmentsInCategory,
  isDark,
  onSelectDepartment,
  onAddChild,
  selectedDepartmentId,
  crossCategoryParentHint,
}: {
  dept: AdministrationDepartment
  depth: number
  departmentsInCategory: AdministrationDepartment[]
  isDark: boolean
  onSelectDepartment: (deptItem: AdministrationDepartment) => void
  onAddChild?: (parent: AdministrationDepartment) => void
  selectedDepartmentId?: string | null
  crossCategoryParentHint: (
    deptItem: AdministrationDepartment,
  ) => { parentName: string; categoryLabel: string } | null
}) {
  const tokens = getLedgerTokens(isDark)
  const children = useMemo(
    () => childrenOf(dept.id, departmentsInCategory),
    [dept.id, departmentsInCategory],
  )
  const [expanded, setExpanded] = useState(depth === 0)
  const [rowHover, setRowHover] = useState(false)
  const hasChildren = children.length > 0
  const cross = crossCategoryParentHint(dept)
  const isRootInForest =
    !dept.parentId ||
    !departmentsInCategory.some((deptItem) => deptItem.id === dept.parentId)
  const selected = selectedDepartmentId === dept.id

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
            {renderDeptMetaBadges(dept, isDark)}
            {isRootInForest && cross ? (
              <div
                style={{
                  fontSize: 11,
                  color: tokens.textSub,
                  marginTop: 2,
                }}
              >
                상위: {cross.parentName} · {cross.categoryLabel}
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
          {children.map((childDept) => (
            <DeptTreeNode
              key={childDept.id}
              dept={childDept}
              depth={depth + 1}
              departmentsInCategory={departmentsInCategory}
              isDark={isDark}
              onSelectDepartment={onSelectDepartment}
              onAddChild={onAddChild}
              selectedDepartmentId={selectedDepartmentId}
              crossCategoryParentHint={crossCategoryParentHint}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
})
