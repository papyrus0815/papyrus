/**
 * 행정구역 상세 패널 — 인라인 편집 필드 + 하위 구역 브레이크다운 + 개편 계보 + 연결 도시.
 *
 * 사건 상세 페이지(events/detail)의 click-to-edit 패턴·디자인 언어를 따른다:
 * 박스 카드 없이 라벨 + 값의 조용한 행 목록. 값이 없는 필드도 placeholder로
 * 항상 노출하고, ✎/× 어포던스는 행 hover 시에만 드러난다.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import {
  FiArrowDown,
  FiArrowRight,
  FiArrowUp,
  FiEdit2,
  FiMapPin,
  FiPlus,
  FiSliders,
  FiTrash2,
} from 'react-icons/fi'

import {
  type AdminDivisionConfig,
  type AdminDivisionSection,
  type AdministrativeDivision,
  type DivisionOwner,
  useAdminDivisionSchemes,
  useAdministrativeDivisionSections,
  useUpdateAdministrativeDivision,
} from '@/entities/country/api.administrative-divisions'
import {
  type SegmentSlice,
  StackedSegmentBar,
} from '@/entities/event/ui/bento-primitives'
import {
  InlineEditProvider,
  InlineRichText,
  InlineStyles,
  InlineText,
} from '@/pages/events/detail/components/inline'
import {
  type City,
  type UpdateAdministrativeDivisionInput,
  cityApi,
} from '@/shared/api/city'
import { dateSortKey, parseIsoDateParts } from '@/shared/lib/iso-date'
import { confirm } from '@/shared/ui/confirm-dialog'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import { notify } from '@/shared/ui/toast'

import { DivisionAutocomplete } from './division-autocomplete'
import {
  countDescendants,
  findInTree,
  formatYearRange,
  isAbolished,
} from './tree-utils'
import type { RegionPalette } from './use-region-palette'

function formatHistoricalDate(iso: string): string {
  if (!iso) return ''
  const p = parseIsoDateParts(iso)
  if (!p) return iso
  const prefix = p.year < 0 ? 'BCE ' : ''
  return `${prefix}${Math.abs(p.year)}년 ${p.month}월 ${p.day}일`
}

function findSuccessorsInTree(
  roots: AdministrativeDivision[],
  targetId: string,
): AdministrativeDivision[] {
  const out: AdministrativeDivision[] = []
  const walk = (nodes: AdministrativeDivision[]) => {
    for (const n of nodes) {
      if (n.predecessorId === targetId) out.push(n)
      if (n.children?.length) walk(n.children)
    }
  }
  walk(roots)
  return out
}

interface SaveApi {
  save: (
    patch: UpdateAdministrativeDivisionInput,
    successMsg?: string,
  ) => void
}

function useSaveDivision(owner: DivisionOwner, divisionId: string): SaveApi {
  const updateMut = useUpdateAdministrativeDivision(owner)
  const save: SaveApi['save'] = (patch, successMsg = '저장했습니다') => {
    updateMut.mutate(
      { id: divisionId, input: patch },
      {
        onSuccess: () => notify.success(successMsg),
        onError: (err) =>
          notify.error(
            err instanceof Error ? err.message : '저장에 실패했습니다',
          ),
      },
    )
  }
  return { save }
}

interface DivisionDetailHeaderInlineProps {
  palette: RegionPalette
  owner: DivisionOwner
  division: AdministrativeDivision
  /** 소속 국가 표시명 */
  countryName: string
  /** 행정 단위 라벨 (예: 주(state), 도) — 배지로 표시 */
  unitLabel?: string | null
  /** 하위 구역 추가 모달 열기 */
  onAddChild?: () => void
  /** 상위 구역/단위 변경용 전체 편집 모달 열기 */
  onOpenEditModal?: () => void
}

/** 상세 패널 헤더 — 이름 인라인 편집 + 단위/존속 배지 + 빠른 액션 */
export function DivisionDetailHeaderInline({
  palette,
  owner,
  division,
  countryName,
  unitLabel,
  onAddChild,
  onOpenEditModal,
}: DivisionDetailHeaderInlineProps) {
  const { save } = useSaveDivision(owner, division.id)
  const abolished = isAbolished(division)
  const hasPeriod = Boolean(division.establishedDate || division.abolishedDate)
  const totalDesc = countDescendants(division)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        paddingBottom: 14,
        marginBottom: 12,
        borderBottom: `1px solid ${palette.border}`,
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 21,
            fontWeight: 800,
            color: palette.text,
            margin: '0 0 8px',
            lineHeight: 1.28,
            letterSpacing: '-0.02em',
          }}
        >
          <InlineText
            value={division.name}
            placeholder="이름"
            validate={(v) => (v.trim() ? null : '이름은 필수입니다')}
            onSave={(v) => save({ name: v.trim() }, '이름을 수정했습니다')}
          />
          {division.localName && (
            <span
              style={{
                marginLeft: 8,
                fontSize: 14.5,
                fontWeight: 500,
                color: palette.textSecondary,
                letterSpacing: 0,
              }}
            >
              {division.localName}
            </span>
          )}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 6,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {unitLabel && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: palette.primary,
                background: palette.badgeBg,
                padding: '2px 8px',
                borderRadius: 4,
              }}
            >
              {unitLabel}
            </span>
          )}
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: abolished
                ? palette.isDark
                  ? '#f87171'
                  : '#dc2626'
                : palette.isDark
                  ? '#34d399'
                  : '#059669',
              background: abolished
                ? palette.isDark
                  ? 'rgba(248, 113, 113, 0.14)'
                  : 'rgba(220, 38, 38, 0.08)'
                : palette.isDark
                  ? 'rgba(52, 211, 153, 0.14)'
                  : 'rgba(5, 150, 105, 0.08)',
              padding: '2px 7px',
              borderRadius: 4,
            }}
          >
            {abolished ? '폐지 구역' : '현존'}
          </span>
          {hasPeriod && (
            <span style={{ fontSize: 12, color: palette.textSecondary }}>
              {formatYearRange(
                division.establishedDate,
                division.abolishedDate,
              )}
            </span>
          )}
          <span style={{ fontSize: 12, color: palette.textSecondary }}>
            · {countryName}
          </span>
          {totalDesc > 0 && (
            <span style={{ fontSize: 12, color: palette.textSecondary }}>
              · 하위 총 {totalDesc.toLocaleString('ko-KR')}곳
            </span>
          )}
        </div>
      </div>

      {(onAddChild || onOpenEditModal) && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            flexShrink: 0,
          }}
        >
          {onAddChild && (
            <button
              type="button"
              onClick={onAddChild}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                height: 28,
                padding: '0 9px',
                fontSize: 11.5,
                fontWeight: 700,
                borderRadius: 6,
                border: `1px solid ${palette.primary}`,
                background: palette.bgSelected,
                color: palette.primary,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <FiPlus size={12} />
              <span>하위 구역 추가</span>
            </button>
          )}
          {onOpenEditModal && (
            <button
              type="button"
              onClick={onOpenEditModal}
              title="상위 구역·행정 단위 변경"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                height: 28,
                padding: '0 9px',
                fontSize: 11.5,
                fontWeight: 600,
                borderRadius: 6,
                border: `1px solid ${palette.border}`,
                background: 'transparent',
                color: palette.textSecondary,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <FiSliders size={12} />
              <span>구조 변경</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

interface SectionLabelProps {
  palette: RegionPalette
  children: React.ReactNode
  right?: React.ReactNode
  topMargin?: number
}

function SectionLabel({
  palette,
  children,
  right,
  topMargin = 18,
}: SectionLabelProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        margin: `${topMargin}px 0 6px`,
      }}
    >
      <span
        style={{
          fontSize: 11.5,
          fontWeight: 700,
          color: palette.textSecondary,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        {children}
      </span>
      {right}
    </div>
  )
}

interface FieldRowProps {
  palette: RegionPalette
  label: string
  children: React.ReactNode
}

function FieldRow({ palette, label, children }: FieldRowProps) {
  return (
    <div
      data-edit-host
      style={{
        display: 'grid',
        gridTemplateColumns: '96px minmax(0, 1fr)',
        gap: 14,
        alignItems: 'baseline',
        padding: '8px 0',
        borderBottom: `1px solid ${palette.border}`,
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: palette.textSecondary,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 13.5,
          color: palette.text,
          minWidth: 0,
          lineHeight: 1.5,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {children}
      </span>
    </div>
  )
}

function parseCoordPair(
  raw: string,
): { lat: number | null; lng: number | null } | null {
  const trimmed = raw.trim()
  if (!trimmed) return { lat: null, lng: null }
  const parts = trimmed.split(',').map((s) => s.trim())
  if (parts.length !== 2) return null
  const lat = Number(parts[0])
  const lng = Number(parts[1])
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return null
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return null
  return { lat, lng }
}

interface InlineDateFieldProps {
  palette: RegionPalette
  value: string | null | undefined
  placeholder: string
  pickerTitle: string
  onSave: (date: string | null) => void
}

function InlineDateField({
  palette,
  value,
  placeholder,
  pickerTitle,
  onSave,
}: InlineDateFieldProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const hasValue = !!value
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        minWidth: 0,
      }}
    >
      <span
        style={{
          color: hasValue ? palette.text : palette.textSecondary,
          fontStyle: hasValue ? 'normal' : 'italic',
        }}
      >
        {hasValue ? formatHistoricalDate(value!) : placeholder}
      </span>
      <InlineStyles.InlineEditButton
        type="button"
        onClick={() => setPickerOpen(true)}
        aria-label={pickerTitle}
        title={pickerTitle}
      >
        <FiEdit2 />
      </InlineStyles.InlineEditButton>
      {hasValue && (
        <InlineStyles.InlineEditButton
          type="button"
          onClick={() => onSave(null)}
          aria-label="날짜 지우기"
          title="지우기"
        >
          ×
        </InlineStyles.InlineEditButton>
      )}
      <DatePickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(date) => {
          setPickerOpen(false)
          onSave(date)
        }}
        initialDate={value || undefined}
        title={pickerTitle}
      />
    </span>
  )
}

interface InlinePredecessorFieldProps {
  palette: RegionPalette
  owner: DivisionOwner
  division: AdministrativeDivision
  divisions: AdministrativeDivision[]
  onSave: (predecessorId: string | null) => void
  onSelectDivision?: (id: string) => void
}

function InlinePredecessorField({
  palette,
  owner,
  division,
  divisions,
  onSave,
  onSelectDivision,
}: InlinePredecessorFieldProps) {
  const [editing, setEditing] = useState(false)
  const predecessor = division.predecessorId
    ? findInTree(divisions, division.predecessorId)
    : null

  if (editing) {
    return (
      <span style={{ display: 'block' }}>
        <DivisionAutocomplete
          owner={owner}
          selected={null}
          onChange={(id) => {
            setEditing(false)
            onSave(id)
          }}
          onClear={() => setEditing(false)}
          excludeIds={[division.id]}
          placeholder="이름으로 검색 — Esc로 취소"
        />
        <button
          type="button"
          onClick={() => setEditing(false)}
          style={{
            marginTop: 4,
            padding: 0,
            border: 'none',
            background: 'transparent',
            color: palette.textSecondary,
            fontSize: 12,
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          취소
        </button>
      </span>
    )
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        minWidth: 0,
      }}
    >
      {predecessor && onSelectDivision ? (
        <button
          type="button"
          onClick={() => onSelectDivision(predecessor.id)}
          style={{
            padding: 0,
            border: 'none',
            background: 'transparent',
            color: palette.primary,
            fontSize: 'inherit',
            fontWeight: 600,
            cursor: 'pointer',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
          }}
        >
          {predecessor.name}
        </button>
      ) : (
        <span
          style={{
            color: predecessor ? palette.text : palette.textSecondary,
            fontStyle: predecessor ? 'normal' : 'italic',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {predecessor
            ? predecessor.name
            : division.predecessorId
              ? '(다른 국가·체계의 구역)'
              : '모체 구역 지정'}
        </span>
      )}
      <InlineStyles.InlineEditButton
        type="button"
        onClick={() => setEditing(true)}
        aria-label="이전 행정구역 편집"
        title="편집"
      >
        <FiEdit2 />
      </InlineStyles.InlineEditButton>
      {division.predecessorId && (
        <InlineStyles.InlineEditButton
          type="button"
          onClick={() => onSave(null)}
          aria-label="이전 행정구역 해제"
          title="해제"
        >
          ×
        </InlineStyles.InlineEditButton>
      )}
    </span>
  )
}

interface DivisionDetailFieldsProps {
  palette: RegionPalette
  owner: DivisionOwner
  division: AdministrativeDivision
  /** 전체 트리 — 이전 행정구역·후계 구역 해석·자동완성 제외용 */
  divisions: AdministrativeDivision[]
  /** 행정 단위 설정 맵 — 하위 구역 단위 분포 계산용 */
  configsById?: Map<string, AdminDivisionConfig>
  /** 하위/전신/후계 구역으로 바로 이동 */
  onSelectDivision?: (id: string) => void
}

function formatPopulationKo(pop: number | null | undefined): string | null {
  if (pop == null || !Number.isFinite(pop) || pop <= 0) return null
  if (pop >= 10000) {
    const man = pop / 10000
    return `${man >= 100 ? Math.round(man).toLocaleString('ko-KR') : man.toFixed(1)}만 명`
  }
  return `${pop.toLocaleString('ko-KR')}명`
}

export function DivisionDetailFields({
  palette,
  owner,
  division,
  divisions,
  configsById,
  onSelectDivision,
}: DivisionDetailFieldsProps) {
  const { save } = useSaveDivision(owner, division.id)

  const coordValue =
    division.centerLat != null && division.centerLng != null
      ? `${Number(division.centerLat)}, ${Number(division.centerLng)}`
      : ''

  const checkDateOrder = (
    nextEstablished: string | null,
    nextAbolished: string | null,
  ): boolean => {
    if (!nextEstablished || !nextAbolished) return true
    const est = dateSortKey(nextEstablished)
    const ab = dateSortKey(nextAbolished)
    if (est != null && ab != null && est > ab) {
      notify.error('폐지일은 설립일 이후여야 합니다')
      return false
    }
    return true
  }

  // 전신·후계 계보 탐색
  const predecessorNode = useMemo(
    () =>
      division.predecessorId
        ? findInTree(divisions, division.predecessorId)
        : null,
    [division.predecessorId, divisions],
  )
  const successorNodes = useMemo(
    () => findSuccessorsInTree(divisions, division.id),
    [divisions, division.id],
  )
  const hasLineage =
    Boolean(division.predecessorId) ||
    successorNodes.length > 0 ||
    (division.successorCount ?? 0) > 0

  // 직할 하위 구역 단위 분포
  const children = division.children ?? []
  const childUnitSlices = useMemo<SegmentSlice[]>(() => {
    if (children.length === 0) return []
    const colors = palette.isDark
      ? ['#a5b4fc', '#38bdf8', '#34d399', '#fbbf24', '#c084fc']
      : ['#4f46e5', '#0284c7', '#059669', '#d97706', '#7c3aed']
    const counts = new Map<string, number>()
    for (const c of children) {
      const label = configsById?.get(c.adminDivisionId)?.divisionLabel || '하위 구역'
      counts.set(label, (counts.get(label) ?? 0) + 1)
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], idx) => ({
        key: label,
        label,
        value,
        color: colors[idx % colors.length]!,
        meta: `${value}곳`,
      }))
  }, [children, configsById, palette.isDark])

  // 연결된 등록 도시 조회 (cityCount > 0 일 때만 호출)
  const cityCount = division.cityCount ?? 0
  const linkedCitiesQuery = useQuery<City[]>({
    queryKey: ['cities', 'by-division', division.id],
    queryFn: () => cityApi.getByAdministrativeDivisionId(division.id),
    enabled: cityCount > 0,
  })
  const linkedCities = linkedCitiesQuery.data ?? []

  const sectionsQuery = useAdministrativeDivisionSections(division.id)
  const serverSections = sectionsQuery.data ?? []
  const hasNarrative = serverSections.length > 0

  const filledCount = [
    !!division.localName,
    !!division.nameMeaning,
    division.centerLat != null && division.centerLng != null,
    !!division.establishedDate,
    !!division.abolishedDate,
    !!division.predecessorId,
    hasNarrative,
  ].filter(Boolean).length
  const totalCount = 7
  const complete = filledCount === totalCount

  const progressChip = (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: complete ? '#16a34a' : palette.textSecondary,
        background: complete ? 'rgba(22, 163, 74, 0.1)' : palette.bgSecondary,
        padding: '2px 8px',
        borderRadius: 5,
        fontVariantNumeric: 'tabular-nums',
      }}
      title="현지어 명칭·명칭 뜻·좌표·설립일·폐지일·이전 행정구역·서술"
    >
      {complete ? '기록 완비 ✓' : `${filledCount}/${totalCount} 항목 작성`}
    </span>
  )

  return (
    <div style={{ gridColumn: '1 / -1' }}>
      {/* 1. 개편 계보 플로우 (전신 → 현재 → 후계) */}
      {hasLineage && (
        <div
          style={{
            padding: '10px 12px',
            marginBottom: 14,
            borderRadius: 6,
            border: `1px solid ${palette.border}`,
            background: palette.bgSecondary,
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
            fontSize: 12,
          }}
        >
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              color: palette.textSecondary,
              letterSpacing: '0.04em',
              marginRight: 2,
            }}
          >
            개편 계보
          </span>
          {division.predecessorId ? (
            <>
              {predecessorNode && onSelectDivision ? (
                <button
                  type="button"
                  onClick={() => onSelectDivision(predecessorNode.id)}
                  style={{
                    padding: '2px 8px',
                    borderRadius: 4,
                    border: `1px solid ${palette.border}`,
                    background: palette.bg,
                    color: palette.text,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  전신: {predecessorNode.name}
                </button>
              ) : (
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 4,
                    border: `1px solid ${palette.border}`,
                    background: palette.bg,
                    color: palette.textSecondary,
                  }}
                >
                  전신 구역 존재
                </span>
              )}
              <FiArrowRight size={12} style={{ color: palette.textSecondary }} />
            </>
          ) : null}

          <span
            style={{
              padding: '2px 8px',
              borderRadius: 4,
              border: `1px solid ${palette.primary}`,
              background: palette.bgSelected,
              color: palette.primary,
              fontWeight: 700,
            }}
          >
            {division.name}
          </span>

          {(successorNodes.length > 0 || (division.successorCount ?? 0) > 0) && (
            <>
              <FiArrowRight size={12} style={{ color: palette.textSecondary }} />
              {successorNodes.length > 0 ? (
                <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 5 }}>
                  {successorNodes.map((succ) => (
                    <button
                      key={succ.id}
                      type="button"
                      onClick={() => onSelectDivision?.(succ.id)}
                      style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        border: `1px solid ${palette.border}`,
                        background: palette.bg,
                        color: palette.text,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: onSelectDivision ? 'pointer' : 'default',
                      }}
                    >
                      후계: {succ.name}
                    </button>
                  ))}
                </div>
              ) : (
                <span style={{ color: palette.textSecondary }}>
                  후계 구역 {division.successorCount}곳
                </span>
              )}
            </>
          )}
        </div>
      )}

      {/* 2. 직할 하위 행정구역 브레이크다운 */}
      {children.length > 0 && (
        <div
          style={{
            padding: '12px 14px',
            marginBottom: 14,
            borderRadius: 6,
            border: `1px solid ${palette.border}`,
            background: palette.bgSecondary,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                color: palette.text,
              }}
            >
              직할 하위 구역 ({children.length.toLocaleString('ko-KR')}곳)
            </span>
            <span
              style={{
                fontSize: 11,
                color: palette.textSecondary,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {childUnitSlices.map((s) => `${s.label} ${s.value}`).join(' · ')}
            </span>
          </div>

          {childUnitSlices.length > 1 && (
            <div style={{ marginBottom: 10 }}>
              <StackedSegmentBar slices={childUnitSlices} height={7} />
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {children.slice(0, 36).map((child) => {
              const childSubCount = child.children?.length ?? 0
              const childAbolished = isAbolished(child)
              return (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => onSelectDivision?.(child.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 9px',
                    borderRadius: 5,
                    border: `1px solid ${palette.border}`,
                    background: palette.bg,
                    color: palette.text,
                    fontSize: 12,
                    fontWeight: 600,
                    opacity: childAbolished ? 0.65 : 1,
                    textDecoration: childAbolished ? 'line-through' : 'none',
                    cursor: onSelectDivision ? 'pointer' : 'default',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  <span>{child.name}</span>
                  {child.centerLat != null && child.centerLng != null && (
                    <FiMapPin
                      size={10}
                      style={{ color: palette.primary, opacity: 0.75 }}
                    />
                  )}
                  {childSubCount > 0 && (
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        color: palette.primary,
                      }}
                    >
                      +{childSubCount}
                    </span>
                  )}
                </button>
              )
            })}
            {children.length > 36 && (
              <span
                style={{
                  alignSelf: 'center',
                  fontSize: 11.5,
                  color: palette.textSecondary,
                }}
              >
                외 {(children.length - 36).toLocaleString('ko-KR')}곳
              </span>
            )}
          </div>
        </div>
      )}

      {/* 3. 소속 등록 도시 */}
      {cityCount > 0 && (
        <div
          style={{
            padding: '11px 14px',
            marginBottom: 14,
            borderRadius: 6,
            border: `1px solid ${palette.border}`,
            background: palette.bgSecondary,
          }}
        >
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              color: palette.text,
              marginBottom: 8,
            }}
          >
            소속 등록 도시 ({cityCount.toLocaleString('ko-KR')}곳)
          </div>
          {linkedCities.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {linkedCities.map((city) => {
                const popLabel = formatPopulationKo(city.population)
                const areaNum =
                  city.areaSqKm != null ? Number(city.areaSqKm) : null
                return (
                  <span
                    key={city.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '4px 9px',
                      borderRadius: 5,
                      border: `1px solid ${palette.border}`,
                      background: palette.bg,
                      fontSize: 12,
                      color: palette.text,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    <strong>{city.name}</strong>
                    {popLabel && (
                      <span style={{ color: palette.textSecondary }}>
                        · {popLabel}
                      </span>
                    )}
                    {areaNum != null && Number.isFinite(areaNum) && areaNum > 0 && (
                      <span style={{ color: palette.textSecondary }}>
                        · {areaNum.toLocaleString('ko-KR')}km²
                      </span>
                    )}
                  </span>
                )
              })}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: palette.textSecondary }}>
              등록 도시 {cityCount}곳 연결됨
            </div>
          )}
        </div>
      )}

      {/* 4. 기본 정보 인라인 필드 */}
      <SectionLabel palette={palette} right={progressChip} topMargin={4}>
        기본 정보
      </SectionLabel>
      <FieldRow palette={palette} label="현지어 명칭">
        <InlineText
          value={division.localName ?? ''}
          placeholder="추가 (예: Virginia, 京畿道)"
          onSave={(v) =>
            save({ localName: v.trim() || null }, '현지어 명칭을 저장했습니다')
          }
        />
      </FieldRow>

      <FieldRow palette={palette} label="명칭 뜻·유래">
        <InlineText
          value={division.nameMeaning ?? ''}
          placeholder="명칭의 유래·뜻 추가"
          multiline
          onSave={(v) =>
            save({ nameMeaning: v.trim() || null }, '명칭 뜻을 저장했습니다')
          }
        />
      </FieldRow>

      <FieldRow palette={palette} label="중심 좌표">
        <InlineText
          value={coordValue}
          placeholder="위도, 경도 추가"
          validate={(v) =>
            parseCoordPair(v) === null
              ? '"위도, 경도" 형식 (위도 -90~90 · 경도 -180~180)'
              : null
          }
          onSave={(v) => {
            const parsed = parseCoordPair(v)
            if (!parsed) return
            save(
              { centerLat: parsed.lat, centerLng: parsed.lng },
              parsed.lat == null
                ? '좌표를 해제했습니다'
                : '좌표를 저장했습니다',
            )
          }}
        />
      </FieldRow>

      <FieldRow palette={palette} label="설립일">
        <InlineDateField
          palette={palette}
          value={division.establishedDate}
          placeholder="추가 (BCE 지원)"
          pickerTitle="설립일 선택"
          onSave={(date) => {
            if (!checkDateOrder(date, division.abolishedDate ?? null)) return
            save(
              { establishedDate: date },
              date ? '설립일을 저장했습니다' : '설립일을 해제했습니다',
            )
          }}
        />
      </FieldRow>

      <FieldRow palette={palette} label="폐지일">
        <InlineDateField
          palette={palette}
          value={division.abolishedDate}
          placeholder="추가"
          pickerTitle="폐지일 선택"
          onSave={(date) => {
            if (!checkDateOrder(division.establishedDate ?? null, date)) return
            save(
              { abolishedDate: date },
              date ? '폐지일을 저장했습니다' : '폐지일을 해제했습니다',
            )
          }}
        />
      </FieldRow>

      <FieldRow palette={palette} label="이전 행정구역">
        <InlinePredecessorField
          palette={palette}
          owner={owner}
          division={division}
          divisions={divisions}
          onSelectDivision={onSelectDivision}
          onSave={(predecessorId) =>
            save(
              { predecessorId },
              predecessorId
                ? '이전 행정구역을 지정했습니다'
                : '이전 행정구역을 해제했습니다',
            )
          }
        />
      </FieldRow>

      <FieldRow palette={palette} label="소속 체계">
        <InlineSchemeField
          palette={palette}
          owner={owner}
          division={division}
          onSave={(schemeId) =>
            save(
              { schemeId },
              schemeId ? '체계를 지정했습니다' : '체계를 해제했습니다',
            )
          }
        />
      </FieldRow>

      <SectionLabel palette={palette}>서술 · 변천사</SectionLabel>
      <InlineEditProvider>
        <div style={{ fontSize: 14, lineHeight: 1.65 }}>
          <DivisionNarrativeSections
            palette={palette}
            owner={owner}
            division={division}
            serverSections={serverSections}
            sectionsReady={sectionsQuery.isSuccess}
            sectionsError={sectionsQuery.isError}
          />
        </div>
      </InlineEditProvider>
    </div>
  )
}

interface InlineSchemeFieldProps {
  palette: RegionPalette
  owner: DivisionOwner
  division: AdministrativeDivision
  onSave: (schemeId: string | null) => void
}

function InlineSchemeField({
  palette,
  owner,
  division,
  onSave,
}: InlineSchemeFieldProps) {
  const { data: schemes = [] } = useAdminDivisionSchemes(owner)
  const [editing, setEditing] = useState(false)
  const current = schemes.find((s) => s.id === division.schemeId) ?? null

  if (editing) {
    return (
      <select
        autoFocus
        aria-label="체계 선택"
        value={division.schemeId ?? ''}
        onChange={(e) => {
          setEditing(false)
          const next = e.target.value || null
          if (next !== (division.schemeId ?? null)) onSave(next)
        }}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setEditing(false)
        }}
        style={{
          padding: '5px 9px',
          fontSize: 12.5,
          border: `1px solid ${palette.border}`,
          borderRadius: 6,
          background: palette.bgSecondary,
          color: palette.text,
          outline: 'none',
          cursor: 'pointer',
          maxWidth: '100%',
        }}
      >
        <option value="">체계 미지정</option>
        {schemes.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({formatYearRange(s.startDate, s.endDate)})
          </option>
        ))}
      </select>
    )
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        minWidth: 0,
      }}
    >
      <span
        style={{
          color: current ? palette.text : palette.textSecondary,
          fontStyle: current ? 'normal' : 'italic',
        }}
      >
        {current
          ? `${current.name} (${formatYearRange(current.startDate, current.endDate)})`
          : division.schemeId
            ? '(알 수 없는 체계)'
            : '체계 미지정'}
      </span>
      <InlineStyles.InlineEditButton
        type="button"
        onClick={() => setEditing(true)}
        aria-label="체계 편집"
        title="편집"
      >
        <FiEdit2 />
      </InlineStyles.InlineEditButton>
    </span>
  )
}

interface NarrativeRow {
  key: string
  serverId?: string
  title: string
  content: string
}

function syncNarrativeRows(
  prev: NarrativeRow[],
  server: AdminDivisionSection[],
  nextKey: () => string,
): NarrativeRow[] {
  if (prev.length === server.length) {
    return server.map((s, i) => {
      const p = prev[i]!
      const prevIsAhead =
        p.serverId === undefined ||
        (p.serverId !== s.id && (p.title !== s.title || p.content !== s.content))
      if (prevIsAhead) return { ...p, serverId: s.id }
      return { key: p.key, serverId: s.id, title: s.title, content: s.content }
    })
  }
  const used = new Array<boolean>(prev.length).fill(false)
  const next: NarrativeRow[] = []
  for (const s of server) {
    let idx = prev.findIndex((p, i) => !used[i] && p.serverId === s.id)
    if (idx < 0) {
      idx = prev.findIndex(
        (p, i) => !used[i] && p.title === s.title && p.content === s.content,
      )
    }
    if (idx >= 0) {
      used[idx] = true
      next.push({ ...prev[idx]!, serverId: s.id })
    } else {
      next.push({ key: nextKey(), serverId: s.id, title: s.title, content: s.content })
    }
  }
  prev.forEach((p, i) => {
    if (!used[i] && p.serverId === undefined) next.push(p)
  })
  return next
}

interface DivisionNarrativeSectionsProps {
  palette: RegionPalette
  owner: DivisionOwner
  division: AdministrativeDivision
  serverSections: AdminDivisionSection[]
  sectionsReady: boolean
  sectionsError: boolean
}

function DivisionNarrativeSections({
  palette,
  owner,
  division,
  serverSections,
  sectionsReady,
  sectionsError,
}: DivisionNarrativeSectionsProps) {
  const { save } = useSaveDivision(owner, division.id)
  const counterRef = useRef(0)
  const nextKey = useCallback(
    () => `s-${Date.now()}-${++counterRef.current}`,
    [],
  )

  const [rows, setRows] = useState<NarrativeRow[]>(() =>
    serverSections.map((s) => ({
      key: nextKey(),
      serverId: s.id,
      title: s.title,
      content: s.content,
    })),
  )
  useEffect(() => {
    if (!sectionsReady) return
    setRows((prev) => syncNarrativeRows(prev, serverSections, nextKey))
  }, [serverSections, nextKey, sectionsReady])

  const commitRows = (next: NarrativeRow[]) => {
    if (!sectionsReady) {
      notify.error('서술을 불러오는 중입니다 — 잠시 후 다시 시도하세요')
      return
    }
    setRows(next)
    const cleaned = next
      .filter((r) => r.title.trim() || r.content.trim())
      .map((r, idx) => ({ title: r.title.trim(), content: r.content, order: idx }))
    save({ sections: cleaned }, '서술을 저장했습니다')
  }

  const addSection = () => {
    setRows((arr) => [...arr, { key: nextKey(), title: '', content: '' }])
  }
  const updateRow = (idx: number, patch: Partial<NarrativeRow>) => {
    commitRows(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }
  const removeRow = async (idx: number) => {
    const row = rows[idx]!
    if (
      (row.title.trim() || row.content.trim()) &&
      !(await confirm({
        title: '삭제 확인',
        message: `"${row.title.trim() || '무제'}" 섹션을 삭제할까요?`,
        danger: true,
      }))
    ) {
      return
    }
    commitRows(rows.filter((_, i) => i !== idx))
  }
  const moveRow = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= rows.length) return
    const next = rows.slice()
    const [item] = next.splice(idx, 1)
    next.splice(target, 0, item!)
    commitRows(next)
  }

  if (sectionsError) {
    return (
      <div style={{ paddingTop: 6, fontSize: 13.5, color: '#b91c1c' }}>
        서술을 불러오지 못했습니다 — 새로고침 후 다시 시도하세요. 불러오기 전에는
        편집할 수 없습니다.
      </div>
    )
  }
  if (!sectionsReady) {
    return (
      <div
        style={{
          paddingTop: 6,
          fontSize: 13.5,
          fontStyle: 'italic',
          color: palette.textSecondary,
        }}
      >
        서술을 불러오는 중…
      </div>
    )
  }

  return (
    <>
      {rows.length === 0 && (
        <div
          style={{
            paddingTop: 6,
            fontSize: 13,
            fontStyle: 'italic',
            color: palette.textSecondary,
          }}
        >
          아직 서술이 없습니다 — 섹션을 추가해 이 구역의 역사·지리·명칭 변천을
          기록해 보세요. 인물·국가 멘션과 이미지도 넣을 수 있습니다.
        </div>
      )}
      {rows.map((row, idx) => (
        <div
          key={row.key}
          style={
            idx === 0
              ? { paddingTop: 6 }
              : {
                  marginTop: 14,
                  paddingTop: 12,
                  borderTop: `1px solid ${palette.border}`,
                }
          }
        >
          <div
            data-edit-host
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 6,
            }}
          >
            <span
              aria-hidden
              style={{
                flexShrink: 0,
                paddingRight: 10,
                borderRight: `1px solid ${palette.border}`,
                fontSize: 12,
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                color: palette.textSecondary,
              }}
            >
              {idx + 1}
            </span>
            <span
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: 15,
                fontWeight: 700,
                color: palette.text,
              }}
            >
              <InlineText
                value={row.title}
                placeholder="섹션 제목"
                onSave={(next) => updateRow(idx, { title: next })}
              />
            </span>
            <span style={{ display: 'inline-flex', gap: 2, flexShrink: 0 }}>
              <InlineStyles.InlineEditButton
                type="button"
                onClick={() => moveRow(idx, -1)}
                disabled={idx === 0}
                aria-label="위로"
                title="위로"
              >
                <FiArrowUp />
              </InlineStyles.InlineEditButton>
              <InlineStyles.InlineEditButton
                type="button"
                onClick={() => moveRow(idx, 1)}
                disabled={idx === rows.length - 1}
                aria-label="아래로"
                title="아래로"
              >
                <FiArrowDown />
              </InlineStyles.InlineEditButton>
              <InlineStyles.InlineEditButton
                type="button"
                onClick={() => removeRow(idx)}
                aria-label="섹션 삭제"
                title="삭제"
              >
                <FiTrash2 />
              </InlineStyles.InlineEditButton>
            </span>
          </div>
          <InlineRichText
            value={row.content}
            placeholder="본문"
            onSave={(next) => updateRow(idx, { content: next })}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={addSection}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          marginTop: 12,
          padding: '6px 11px',
          borderRadius: 6,
          border: `1px dashed ${palette.border}`,
          background: 'transparent',
          color: palette.textSecondary,
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = palette.primary
          e.currentTarget.style.color = palette.primary
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = palette.border
          e.currentTarget.style.color = palette.textSecondary
        }}
      >
        <FiPlus size={12} /> 섹션 추가
      </button>
    </>
  )
}
