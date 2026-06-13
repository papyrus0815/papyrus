/**
 * 행정구역 상세 패널 — 인라인 편집 필드.
 *
 * 사건 상세 페이지(events/detail)의 click-to-edit 패턴·디자인 언어를 따른다:
 * 박스 카드 없이 라벨 + 값의 조용한 행 목록. 값이 없는 필드도 placeholder로
 * 항상 노출하고, ✎/× 어포던스는 행 hover 시에만 드러난다.
 *
 * 상위 구역 이동·행정 단위 변경처럼 트리 구조를 바꾸는 작업만
 * 리스트 행의 ⋯ → 수정(모달)에 남긴다.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

import {
  FiArrowDown,
  FiArrowUp,
  FiEdit2,
  FiPlus,
  FiTrash2,
} from 'react-icons/fi'

import {
  type AdminDivisionSection,
  type AdministrativeDivision,
  type DivisionOwner,
  useAdminDivisionSchemes,
  useAdministrativeDivisionSections,
  useUpdateAdministrativeDivision,
} from '@/entities/country/api.administrative-divisions'
import {
  InlineEditProvider,
  InlineRichText,
  InlineStyles,
  InlineText,
} from '@/pages/events/detail/components/inline'
import type { UpdateAdministrativeDivisionInput } from '@/shared/api/city'
import { dateSortKey, parseIsoDateParts } from '@/shared/lib/iso-date'
import { confirm } from '@/shared/ui/confirm-dialog'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import { notify } from '@/shared/ui/toast'

import { DivisionAutocomplete } from './division-autocomplete'
import { findInTree, formatYearRange } from './tree-utils'
import type { RegionPalette } from './use-region-palette'

/**
 * ISO 날짜 문자열을 한국어로 표시 (BCE 지원) — 폼 모달과 동일 포맷.
 * 네이티브 Date는 BC 형식("-0412-…")을 NaN으로 떨궈서 parseIsoDateParts로 직접 파싱.
 */
function formatHistoricalDate(iso: string): string {
  if (!iso) return ''
  const p = parseIsoDateParts(iso)
  if (!p) return iso
  const prefix = p.year < 0 ? 'BCE ' : ''
  return `${prefix}${Math.abs(p.year)}년 ${p.month}월 ${p.day}일`
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
}

/** 상세 패널 헤더 — 이름 인라인 편집 + 단위 배지 + 소속 국가 */
export function DivisionDetailHeaderInline({
  palette,
  owner,
  division,
  countryName,
  unitLabel,
}: DivisionDetailHeaderInlineProps) {
  const { save } = useSaveDivision(owner, division.id)
  return (
    <>
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: palette.text,
          margin: '0 0 8px',
          lineHeight: 1.3,
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
              fontSize: 15,
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
          gap: 8,
          marginBottom: 18,
        }}
      >
        {unitLabel && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: palette.primary,
              background: palette.badgeBg,
              padding: '3px 9px',
              borderRadius: 6,
              letterSpacing: '0.02em',
            }}
          >
            {unitLabel}
          </span>
        )}
        <span style={{ fontSize: 13, color: palette.textSecondary }}>
          {countryName}
        </span>
      </div>
    </>
  )
}

interface SectionLabelProps {
  palette: RegionPalette
  children: React.ReactNode
  /** 우측 보조 (진행도 칩 등) */
  right?: React.ReactNode
}

/** 섹션 구분 라벨 — 작고 조용하게, 우측에 보조 정보 */
function SectionLabel({ palette, children, right }: SectionLabelProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        margin: '20px 0 2px',
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: palette.textSecondary,
          letterSpacing: '0.05em',
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

/** 라벨 + 값 한 행 — 카드 없이 hairline 구분만. hover 시 ✎/× 어포던스 노출. */
function FieldRow({ palette, label, children }: FieldRowProps) {
  return (
    <div
      data-edit-host
      style={{
        display: 'grid',
        gridTemplateColumns: '96px minmax(0, 1fr)',
        gap: 14,
        alignItems: 'baseline',
        padding: '9px 0',
        borderBottom: `1px solid ${palette.border}`,
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: palette.textSecondary,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 14,
          color: palette.text,
          minWidth: 0,
          lineHeight: 1.55,
        }}
      >
        {children}
      </span>
    </div>
  )
}

/** 좌표 입력 파싱 — "위도, 경도". 빈 문자열은 [null, null](해제). 오류는 null 반환. */
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

/**
 * 날짜 인라인 필드 — ✎로 표준 DatePickerModal(BCE 지원)을 연다. ×로 해제.
 * 트리거들은 행 hover 시에만 보인다(InlineEditButton 재사용).
 */
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
}

/** 이전 행정구역(모체) — 자동완성으로 그 자리에서 지정/해제 */
function InlinePredecessorField({
  palette,
  owner,
  division,
  divisions,
  onSave,
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
            ? '(다른 국가의 구역)'
            : '모체 구역 지정'}
      </span>
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
  /** 전체 트리 — 이전 행정구역 이름 해석·자동완성 제외용 */
  divisions: AdministrativeDivision[]
}

/**
 * 편집 가능한 상세 필드 목록 + 파생 통계 한 줄.
 * RegionDetailPanel의 children(grid) 안에서 전체 폭을 차지한다.
 */
export function DivisionDetailFields({
  palette,
  owner,
  division,
  divisions,
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
    // dateSortKey는 BC(음수 연도)까지 부호 그대로 비교 가능 — 네이티브 Date는 BC에서 NaN
    const est = dateSortKey(nextEstablished)
    const ab = dateSortKey(nextAbolished)
    if (est != null && ab != null && est > ab) {
      notify.error('폐지일은 설립일 이후여야 합니다')
      return false
    }
    return true
  }

  const stats: string[] = []
  const childCount = division.children?.length ?? 0
  if (childCount > 0) stats.push(`하위 구역 ${childCount}`)
  if ((division.successorCount ?? 0) > 0)
    stats.push(`후계 구역 ${division.successorCount}`)
  if ((division.cityCount ?? 0) > 0)
    stats.push(`등록된 도시 ${division.cityCount}`)

  const sectionsQuery = useAdministrativeDivisionSections(division.id)
  const serverSections = sectionsQuery.data ?? []

  const hasNarrative = serverSections.length > 0

  // 작성 진행도 — 채워질수록 차오르는 칩. 완성 욕구를 부드럽게 자극한다.
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
        fontWeight: 600,
        color: complete ? '#16a34a' : palette.textSecondary,
        background: complete ? 'rgba(22, 163, 74, 0.1)' : palette.bgSecondary,
        padding: '2px 8px',
        borderRadius: 9,
        fontVariantNumeric: 'tabular-nums',
      }}
      title="현지어 명칭·명칭 뜻·좌표·설립일·폐지일·이전 행정구역·서술"
    >
      {complete ? '모두 작성됨 ✓' : `${filledCount}/${totalCount} 작성`}
    </span>
  )

  return (
    <div style={{ gridColumn: '1 / -1' }}>
      <SectionLabel palette={palette} right={progressChip}>
        기본 정보
      </SectionLabel>
      <FieldRow palette={palette} label="현지어 명칭">
        <InlineText
          value={division.localName ?? ''}
          placeholder="추가 (예: Virginia)"
          onSave={(v) =>
            save({ localName: v.trim() || null }, '현지어 명칭을 저장했습니다')
          }
        />
      </FieldRow>

      <FieldRow palette={palette} label="명칭 뜻">
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

      <FieldRow palette={palette} label="체계">
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

      <SectionLabel palette={palette}>서술</SectionLabel>
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

      {stats.length > 0 && (
        <div
          style={{
            marginTop: 18,
            paddingTop: 10,
            borderTop: `1px solid ${palette.border}`,
            fontSize: 12.5,
            color: palette.textSecondary,
          }}
        >
          {stats.join(' · ')}
        </div>
      )}
    </div>
  )
}

interface InlineSchemeFieldProps {
  palette: RegionPalette
  owner: DivisionOwner
  division: AdministrativeDivision
  onSave: (schemeId: string | null) => void
}

/** 소속 체계 — ✎ 클릭 시 그 자리에서 select로 지정/해제 */
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
          padding: '6px 10px',
          fontSize: 13,
          border: `1px solid ${palette.border}`,
          borderRadius: 8,
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

// ============================================
// 서술 섹션 (제목 있는 다중 본문) — 사건 상세 '전개'(DetailNarrative)와 동일 패턴
// ============================================

interface NarrativeRow {
  /** 클라이언트 임시 키 — 에디터 인스턴스 보존용 (key가 바뀌면 입력 중인 draft가 끊김) */
  key: string
  /** 마지막으로 매핑된 서버 row id — delete-and-recreate라 PUT마다 갱신됨 */
  serverId?: string
  title: string
  content: string
}

/**
 * 서버 섹션 ↔ 로컬 rows 동기화 — 핵심은 *키 보존*.
 * 같은 길이면 positional join(사용자가 막 친 값이 in-flight 응답으로 덮이지 않게
 * 로컬 우선), 길이가 다르면 내용 일치로 매칭.
 * 못 찾은 로컬 행은 *저장 안 된 draft(serverId 없음)만* 뒤에 보존 — serverId가 있는
 * 행까지 살리면 서버에서 지워진(또는 다른 구역의) 섹션이 유령처럼 남아
 * 다음 전체 배열 PATCH 때 엉뚱한 구역에 새로 써져 버린다.
 */
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
  /** 섹션 쿼리 성공 여부 — 로딩/오류 중 커밋(전체 배열 PATCH)을 막는다 */
  sectionsReady: boolean
  sectionsError: boolean
}

/**
 * 제목 있는 서술 섹션 목록 — 개요(무제 리드) 아래에 장(章) 단위로 이어 쓴다.
 * 제목·본문 각각 click-to-edit, 순서 이동/삭제는 행 hover 시 노출.
 * 어떤 변경이든 전체 배열을 PATCH(서버가 delete-and-recreate).
 */
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
    // 로딩/오류 중에는 동기화하지 않음 — placeholder([])와 합쳐 행이 사라져 보일 수 있다
    if (!sectionsReady) return
    setRows((prev) => syncNarrativeRows(prev, serverSections, nextKey))
  }, [serverSections, nextKey, sectionsReady])

  const commitRows = (next: NarrativeRow[]) => {
    // 서버 섹션을 아직 못 받았으면(로딩/오류) 전체 배열 PATCH가 기존 서술을 지울 수 있음
    if (!sectionsReady) {
      notify.error('서술을 불러오는 중입니다 — 잠시 후 다시 시도하세요')
      return
    }
    setRows(next)
    // 빈 행(제목·본문 모두 공백)은 전송에서 제외 — 로컬 draft로만 유지
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

  // 불러오기 실패를 "서술 없음"으로 위장하면 편집 한 번에 기존 서술이 날아간다 — 명시적으로 막는다
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
            fontSize: 13.5,
            fontStyle: 'italic',
            color: palette.textSecondary,
          }}
        >
          아직 서술이 없습니다 — 섹션을 추가해 이 구역의 역사·지리·명칭 변천을
          전기처럼 작성해 보세요. 인물·국가 멘션과 이미지도 넣을 수 있습니다.
        </div>
      )}
      {rows.map((row, idx) => (
        <div
          key={row.key}
          style={
            idx === 0
              ? { paddingTop: 6 }
              : {
                  marginTop: 16,
                  paddingTop: 14,
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
                fontSize: 12.5,
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
                fontSize: 15.5,
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
          marginTop: 14,
          padding: '7px 13px',
          borderRadius: 8,
          border: `1px dashed ${palette.border}`,
          background: 'transparent',
          color: palette.textSecondary,
          fontSize: 12.5,
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
        <FiPlus size={13} /> 섹션 추가
      </button>
    </>
  )
}
