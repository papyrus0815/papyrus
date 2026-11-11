/**
 * 중앙부처 — 카테고리별 계층 목록(아웃라인 행, 카드 없음)
 * 상세(재임·사건·편집)는 부모에서 선택 시 별도 패널로 표시
 */
import React, { useCallback, useMemo, useState } from 'react'
import {
  FiAlertTriangle,
  FiChevronDown,
  FiChevronRight,
  FiLayers,
  FiPlus,
  FiShield,
} from 'react-icons/fi'

import { getUploadImageUrl } from '@/shared/api/upload'
import {
  type AdministrationDepartment,
  DEPARTMENT_KIND_LABEL,
} from '@/shared/api/administration-department'
import { getCabinetsSectionPalette } from '@/shared/styles/country-detail-palette'

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

function renderDeptMetaBadges(
  dept: AdministrationDepartment,
  isDark: boolean,
  palette: ReturnType<typeof getCabinetsSectionPalette>,
) {
  const kindLabel =
    dept.kind && DEPARTMENT_KIND_LABEL[dept.kind]
      ? DEPARTMENT_KIND_LABEL[dept.kind]
      : null
  const isMilitaryOrIntel = (dept.militaryUnits?.length ?? 0) > 0
  const unitCount = dept.militaryUnits?.length ?? 0
  const childCount = dept.children?.length ?? 0
  const estYearStr = formatDeptYearPart(dept.established)
  const abolYearStr = formatDeptYearPart(dept.abolished)
  const lifespanLabel =
    estYearStr || abolYearStr
      ? `${estYearStr ?? '?'} ~ ${abolYearStr ?? '현재'}`
      : null

  return (
    <>
      {dept.abbreviation?.trim() ? (
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: palette.textMuted,
          }}
        >
          ({dept.abbreviation.trim()})
        </span>
      ) : null}
      {dept.historicalCountry?.name ? (
        <span
          style={{
            padding: '2px 7px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            background: palette.btnHover,
            color: palette.textMuted,
          }}
        >
          {dept.historicalCountry.name}
        </span>
      ) : null}
      {kindLabel ? (
        <span
          style={{
            padding: '2px 7px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            background: isMilitaryOrIntel
              ? isDark
                ? 'rgba(239, 68, 68, 0.16)'
                : '#fef2f2'
              : palette.accentBg,
            color: isMilitaryOrIntel
              ? isDark
                ? '#fca5a5'
                : '#b91c1c'
              : palette.accent,
          }}
        >
          {kindLabel}
        </span>
      ) : null}
      {dept.category?.name ? (
        <span
          style={{
            padding: '2px 7px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 500,
            background: palette.bgMuted,
            color: palette.textMuted,
          }}
        >
          {dept.category.name}
        </span>
      ) : null}
      {lifespanLabel ? (
        <span
          style={{
            padding: '2px 7px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 500,
            background: palette.bgMuted,
            color: palette.textMuted,
          }}
        >
          {lifespanLabel}
        </span>
      ) : null}
      {childCount > 0 ? (
        <span
          style={{
            padding: '2px 7px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            background: palette.bgMuted,
            color: palette.textMuted,
          }}
        >
          산하 {childCount}개
        </span>
      ) : null}
      {unitCount > 0 ? (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 7px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            background: isDark ? 'rgba(99, 102, 241, 0.16)' : '#eef2ff',
            color: isDark ? '#a5b4fc' : '#4338ca',
          }}
        >
          <FiShield size={10} />
          군부대 {unitCount}
        </span>
      ) : null}
    </>
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

  const palette = useMemo(() => getCabinetsSectionPalette(isDark), [isDark])
  const rowBorder = palette.divider

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        overflow: 'hidden',
      }}
    >
      {showFlatFallback ? (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            borderRadius: 0,
          }}
        >
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '12px 14px',
              borderBottom: `1px solid ${rowBorder}`,
              background: isDark ? 'rgba(251,191,36,0.08)' : '#fffbeb',
              color: isDark ? '#fde68a' : '#92400e',
              fontSize: 12,
              lineHeight: 1.55,
            }}
          >
            <FiAlertTriangle
              size={18}
              style={{ flexShrink: 0, marginTop: 2 }}
              aria-hidden
            />
            <div>
              <strong style={{ display: 'block', marginBottom: 4 }}>
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
            borderRadius: 0,
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
              parentLabel={parentLabel}
              crossCategoryParentHint={crossCategoryParentHint}
            />
          ))}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          marginTop: 10,
          paddingTop: 14,
          flexShrink: 0,
          borderTop: `1px solid ${palette.divider}`,
        }}
      >
        <button
          type="button"
          onClick={onAddRoot}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 12px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            border: `1px dashed ${palette.accentSecondaryBorder}`,
            borderRadius: 8,
            background: palette.accentBg,
            color: isDark ? '#a5b4fc' : '#4338ca',
            alignSelf: 'flex-start',
          }}
        >
          <FiPlus size={14} /> 새 최상위 부처·국가기관 추가
        </button>
        {onGoToPositionDefinitions ? (
          <button
            type="button"
            onClick={onGoToPositionDefinitions}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              borderRadius: 8,
              background: 'transparent',
              color: palette.textMuted,
              textDecoration: 'underline',
              alignSelf: 'flex-start',
            }}
          >
            <FiLayers size={12} />
            「직위 정의」탭에서 관직 등록
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
  const palette = getCabinetsSectionPalette(isDark)
  const [hover, setHover] = useState(false)
  const pName = parentLabel(dept.parentId)
  const cross = crossCategoryParentHint(dept)
  const selected = selectedDepartmentId === dept.id
  const cardBorder = palette.borderHairline
  const bg = selected
    ? palette.cardBgSelected
    : hover
      ? palette.cardBgHover
      : palette.cardBg

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 14px',
        marginBottom: 8,
        border: `1px solid ${selected ? palette.accentSecondaryBorder : cardBorder}`,
        borderRadius: 12,
        background: bg,
        transition: 'background 0.14s, border-color 0.14s, box-shadow 0.14s',
        boxShadow: selected
          ? isDark
            ? '0 0 0 1px rgba(99,102,241,0.25)'
            : '0 1px 2px rgba(99, 102, 241, 0.12)'
          : 'none',
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
          gap: 14,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          textAlign: 'left',
          padding: 0,
        }}
      >
        {dept.thumbnailUrl ? (
          <img
            src={getUploadImageUrl(dept.thumbnailUrl)}
            alt=""
            style={{
              width: 42,
              height: 42,
              objectFit: 'cover',
              borderRadius: 10,
              flexShrink: 0,
              border: `1px solid ${palette.border}`,
            }}
          />
        ) : (
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: palette.avatarBg,
              flexShrink: 0,
              border: `1px solid ${palette.border}`,
            }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
              fontSize: 15,
              fontWeight: 600,
              color: palette.text,
              letterSpacing: '-0.02em',
              lineHeight: 1.35,
            }}
          >
            <span>{dept.name}</span>
            {renderDeptMetaBadges(dept, isDark, palette)}
          </div>
          {cross ? (
            <div
              style={{
                fontSize: 11,
                color: palette.textMuted,
                marginTop: 4,
              }}
            >
              상위: {cross.parentName}{' '}
              <span
                style={{
                  marginLeft: 4,
                  padding: '2px 6px',
                  borderRadius: 6,
                  background: palette.btnHover,
                  fontWeight: 600,
                }}
              >
                타 카테고리 · {cross.categoryLabel}
              </span>
            </div>
          ) : pName ? (
            <div
              style={{
                fontSize: 11,
                color: palette.textMuted,
                marginTop: 4,
              }}
            >
              상위: {pName}
            </div>
          ) : null}
        </div>
        <FiChevronRight
          size={18}
          style={{
            flexShrink: 0,
            color: palette.iconColor,
            opacity: 0.55,
          }}
          aria-hidden
        />
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
            gap: 4,
            padding: '5px 9px',
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 600,
            border: `1px solid ${palette.borderMid}`,
            background: palette.cardBg,
            color: palette.textMuted,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <FiPlus size={12} /> 산하 추가
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
  parentLabel,
  crossCategoryParentHint,
}: {
  dept: AdministrationDepartment
  depth: number
  departmentsInCategory: AdministrationDepartment[]
  isDark: boolean
  onSelectDepartment: (deptItem: AdministrationDepartment) => void
  onAddChild?: (parent: AdministrationDepartment) => void
  selectedDepartmentId?: string | null
  parentLabel: (parentId: string | null | undefined) => string | null
  crossCategoryParentHint: (
    deptItem: AdministrationDepartment,
  ) => { parentName: string; categoryLabel: string } | null
}) {
  const palette = getCabinetsSectionPalette(isDark)
  const children = useMemo(
    () => childrenOf(dept.id, departmentsInCategory),
    [dept.id, departmentsInCategory],
  )
  const [expanded, setExpanded] = useState(depth === 0)
  const [rowHover, setRowHover] = useState(false)
  const hasChildren = children.length > 0
  const pName = parentLabel(dept.parentId)
  const cross = crossCategoryParentHint(dept)
  const isRootInForest =
    !dept.parentId ||
    !departmentsInCategory.some((deptItem) => deptItem.id === dept.parentId)
  const selected = selectedDepartmentId === dept.id
  const cardEdge = palette.borderHairline
  const cardEdgeActive = palette.accentSecondaryBorder
  const indent = depth * 18
  const rowBg = selected
    ? palette.cardBgSelected
    : rowHover
      ? palette.cardBgHover
      : palette.cardBg

  return (
    <div style={{ minWidth: 0 }}>
      <div
        onMouseEnter={() => setRowHover(true)}
        onMouseLeave={() => setRowHover(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          minHeight: 52,
          marginBottom: 8,
          borderRadius: 12,
          border: `1px solid ${selected ? cardEdgeActive : cardEdge}`,
          background: rowBg,
          transition: 'background 0.14s, border-color 0.14s',
          boxShadow: selected
            ? isDark
              ? '0 0 0 1px rgba(99,102,241,0.2)'
              : '0 1px 2px rgba(99, 102, 241, 0.1)'
            : 'none',
          overflow: 'hidden',
          paddingRight: 10,
        }}
      >
        <div
          style={{
            width: 36 + indent,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingRight: 4,
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
                width: 28,
                height: 28,
                flexShrink: 0,
                border: 'none',
                borderRadius: 8,
                background: palette.avatarBg,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: palette.textMuted,
              }}
            >
              {expanded ? (
                <FiChevronDown size={18} />
              ) : (
                <FiChevronRight size={18} />
              )}
            </button>
          ) : (
            <div style={{ width: 28 }} aria-hidden />
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
            gap: 10,
            padding: '10px 12px 10px 0',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          {dept.thumbnailUrl ? (
            <img
              src={getUploadImageUrl(dept.thumbnailUrl)}
              alt=""
              style={{
                width: 40,
                height: 40,
                objectFit: 'cover',
                borderRadius: 10,
                flexShrink: 0,
                border: `1px solid ${palette.border}`,
              }}
            />
          ) : (
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: palette.avatarBg,
                flexShrink: 0,
                border: `1px solid ${palette.border}`,
              }}
            />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
                fontSize: 15,
                fontWeight: 600,
                color: palette.text,
                letterSpacing: '-0.02em',
                lineHeight: 1.35,
              }}
            >
              <span>{dept.name}</span>
              {renderDeptMetaBadges(dept, isDark, palette)}
            </div>
            {isRootInForest && cross ? (
              <div
                style={{
                  fontSize: 11,
                  color: palette.textMuted,
                  marginTop: 2,
                }}
              >
                상위: {cross.parentName}{' '}
                <span
                  style={{
                    marginLeft: 4,
                    padding: '2px 6px',
                    borderRadius: 6,
                    background: palette.btnHover,
                    fontWeight: 600,
                  }}
                >
                  타 카테고리 · {cross.categoryLabel}
                </span>
              </div>
            ) : pName &&
              dept.parentId &&
              departmentsInCategory.some(
                (deptItem) => deptItem.id === dept.parentId,
              ) ? (
              <div
                style={{
                  fontSize: 11,
                  color: palette.textMuted,
                  marginTop: 2,
                }}
              >
                상위: {pName}
              </div>
            ) : null}
          </div>
          <FiChevronRight
            size={18}
            style={{
              flexShrink: 0,
              color: palette.iconColor,
              opacity: 0.5,
            }}
            aria-hidden
          />
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
              gap: 4,
              padding: '5px 9px',
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 600,
              border: `1px solid ${palette.borderMid}`,
              background: palette.cardBg,
              color: palette.textMuted,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <FiPlus size={12} /> 산하 추가
          </button>
        ) : null}
      </div>
      {hasChildren && expanded ? (
        <div>
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
              parentLabel={parentLabel}
              crossCategoryParentHint={crossCategoryParentHint}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
})
