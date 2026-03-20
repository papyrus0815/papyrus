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
} from 'react-icons/fi'

import { getUploadImageUrl } from '@/shared/api/upload'
import type { AdministrationDepartment } from '@/shared/api/administration-department'
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
  onGoToPositionDefinitions?: () => void
}

export function MinistryDepartmentTree({
  allDepartments,
  departmentsInCategory,
  isDark,
  onSelectDepartment,
  selectedDepartmentId,
  onAddRoot,
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
    () => new Set(departmentsInCategory.map((d) => d.id)),
    [departmentsInCategory],
  )

  const parentById = useMemo(() => {
    const m = new Map<string, AdministrationDepartment>()
    for (const d of allDepartments) m.set(d.id, d)
    return m
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
      const pId = dept.parentId
      if (!pId || idsInCategory.has(pId)) return null
      const p = parentById.get(pId)
      if (!p) return null
      const catName = p.category?.name ?? '다른 카테고리'
      return { parentName: p.name, categoryLabel: catName }
    },
    [idsInCategory, parentById],
  )

  const sortedFlat = useMemo(() => {
    return [...departmentsInCategory].sort((a, b) =>
      a.name.localeCompare(b.name, 'ko', { sensitivity: 'base' }),
    )
  }, [departmentsInCategory])

  const C = useMemo(() => getCabinetsSectionPalette(isDark), [isDark])
  const rowBorder = C.divider

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
          borderTop: `1px solid ${C.divider}`,
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
            border: `1px dashed ${C.accentSecondaryBorder}`,
            borderRadius: 8,
            background: C.accentBg,
            color: isDark ? '#a5b4fc' : '#4338ca',
            alignSelf: 'flex-start',
          }}
        >
          <FiPlus size={14} /> 이 카테고리에 부처·기관 추가
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
              color: C.textMuted,
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
  selectedDepartmentId,
}: {
  dept: AdministrationDepartment
  isDark: boolean
  parentLabel: (parentId: string | null | undefined) => string | null
  crossCategoryParentHint: (
    d: AdministrationDepartment,
  ) => { parentName: string; categoryLabel: string } | null
  onSelectDepartment: (d: AdministrationDepartment) => void
  selectedDepartmentId?: string | null
}) {
  const C = getCabinetsSectionPalette(isDark)
  const [hover, setHover] = useState(false)
  const pName = parentLabel(dept.parentId)
  const cross = crossCategoryParentHint(dept)
  const selected = selectedDepartmentId === dept.id
  const cardBorder = C.borderHairline
  const bg = selected
    ? C.cardBgSelected
    : hover
      ? C.cardBgHover
      : C.cardBg

  return (
    <button
      type="button"
      onClick={() => onSelectDepartment(dept)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 16px',
        marginBottom: 8,
        border: `1px solid ${selected ? C.accentSecondaryBorder : cardBorder}`,
        borderRadius: 12,
        background: bg,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.14s, border-color 0.14s, box-shadow 0.14s',
        boxShadow: selected
          ? isDark
            ? '0 0 0 1px rgba(99,102,241,0.25)'
            : '0 1px 2px rgba(99, 102, 241, 0.12)'
          : 'none',
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
            border: `1px solid ${C.border}`,
          }}
        />
      ) : (
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 10,
            background: C.avatarBg,
            flexShrink: 0,
            border: `1px solid ${C.border}`,
          }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: C.text,
            letterSpacing: '-0.02em',
            lineHeight: 1.35,
          }}
        >
          {dept.name}
        </div>
        {cross ? (
          <div
            style={{
              fontSize: 11,
              color: C.textMuted,
              marginTop: 4,
            }}
          >
            상위: {cross.parentName}{' '}
            <span
              style={{
                marginLeft: 4,
                padding: '2px 6px',
                borderRadius: 6,
                background: C.btnHover,
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
              color: C.textMuted,
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
          color: C.iconColor,
          opacity: 0.55,
        }}
        aria-hidden
      />
    </button>
  )
}

const DeptTreeNode = React.memo(function DeptTreeNode({
  dept,
  depth,
  departmentsInCategory,
  isDark,
  onSelectDepartment,
  selectedDepartmentId,
  parentLabel,
  crossCategoryParentHint,
}: {
  dept: AdministrationDepartment
  depth: number
  departmentsInCategory: AdministrationDepartment[]
  isDark: boolean
  onSelectDepartment: (d: AdministrationDepartment) => void
  selectedDepartmentId?: string | null
  parentLabel: (parentId: string | null | undefined) => string | null
  crossCategoryParentHint: (
    d: AdministrationDepartment,
  ) => { parentName: string; categoryLabel: string } | null
}) {
  const C = getCabinetsSectionPalette(isDark)
  const children = useMemo(
    () => childrenOf(dept.id, departmentsInCategory),
    [dept.id, departmentsInCategory],
  )
  const [expanded, setExpanded] = useState(depth === 0)
  const [rowHover, setRowHover] = useState(false)
  const hasChildren = children.length > 0
  const pName = parentLabel(dept.parentId)
  const cross = crossCategoryParentHint(dept)
  const isRootInForest = !dept.parentId || !departmentsInCategory.some(
    (d) => d.id === dept.parentId,
  )
  const selected = selectedDepartmentId === dept.id
  const cardEdge = C.borderHairline
  const cardEdgeActive = C.accentSecondaryBorder
  const indent = depth * 18
  const rowBg = selected
    ? C.cardBgSelected
    : rowHover
      ? C.cardBgHover
      : C.cardBg

  return (
    <div style={{ minWidth: 0 }}>
      <div
        onMouseEnter={() => setRowHover(true)}
        onMouseLeave={() => setRowHover(false)}
        style={{
          display: 'flex',
          alignItems: 'stretch',
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
              onClick={(e) => {
                e.stopPropagation()
                setExpanded((e) => !e)
              }}
              style={{
                width: 28,
                height: 28,
                flexShrink: 0,
                border: 'none',
                borderRadius: 8,
                background: C.avatarBg,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: C.textMuted,
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
                border: `1px solid ${C.border}`,
              }}
            />
          ) : (
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: C.avatarBg,
                flexShrink: 0,
                border: `1px solid ${C.border}`,
              }}
            />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: C.text,
                letterSpacing: '-0.02em',
                lineHeight: 1.35,
              }}
            >
              {dept.name}
            </div>
            {isRootInForest && cross ? (
              <div
                style={{
                  fontSize: 11,
                  color: C.textMuted,
                  marginTop: 2,
                }}
              >
                상위: {cross.parentName}{' '}
                <span
                  style={{
                    marginLeft: 4,
                    padding: '2px 6px',
                    borderRadius: 6,
                    background: C.btnHover,
                    fontWeight: 600,
                  }}
                >
                  타 카테고리 · {cross.categoryLabel}
                </span>
              </div>
            ) : pName &&
              dept.parentId &&
              departmentsInCategory.some((d) => d.id === dept.parentId) ? (
              <div
                style={{
                  fontSize: 11,
                  color: C.textMuted,
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
              color: C.iconColor,
              opacity: 0.5,
            }}
            aria-hidden
          />
        </button>
      </div>
      {hasChildren && expanded ? (
        <div>
          {children.map((ch) => (
            <DeptTreeNode
              key={ch.id}
              dept={ch}
              depth={depth + 1}
              departmentsInCategory={departmentsInCategory}
              isDark={isDark}
              onSelectDepartment={onSelectDepartment}
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
