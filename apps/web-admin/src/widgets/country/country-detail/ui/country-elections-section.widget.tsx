import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { createPortal } from 'react-dom'

import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { toast } from 'react-hot-toast'
import {
  FiBarChart2,
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiChevronUp,
  FiEdit2,
  FiImage,
  FiInfo,
  FiLayers,
  FiPlus,
  FiSliders,
  FiTrash2,
  FiX,
} from 'react-icons/fi'
import {
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import styled, { useTheme } from 'styled-components'

import { useCountry } from '@/entities/country/api'
import { usePersons } from '@/entities/person/api'
import { useHistoricalCountriesByModernCountry } from '@/features/country/api/use-historical-countries-by-modern-country.hook'
import {
  ELECTION_STATUS_OPTIONS,
  ELECTION_TYPE_OPTIONS,
  type ElectionBallotOptionDto,
  type ElectionCandidacyDto,
  type ElectionDetailDto,
  type ElectionListRow,
  type ElectionPartyResultDto,
  LEGISLATURE_CLOSURE_KIND_OPTIONS,
  NOMINATION_TYPE_OPTIONS,
  type PartyResultComparisonRowDto,
  type PoliticalPartyRow,
  createBallotOption,
  createElection,
  createElectionCandidacy,
  deleteBallotOption,
  deleteElection,
  deleteElectionCandidacy,
  deleteElectionPartyResult,
  getElection,
  getElections,
  getElectoralDistricts,
  getPoliticalParties,
  labelElectionStatus,
  labelElectionType,
  labelLegislatureClosureKind,
  labelNominationType,
  updateBallotOption,
  updateElection,
  updateElectionCandidacy,
  upsertBallotOptionResult,
  upsertCandidacyResult,
  upsertElectionPartyResult,
} from '@/shared/api/election'
import { updateEvent } from '@/shared/api/events'
import type { PersonResponseDto } from '@/shared/api/persons'
import { getPersonDetailById } from '@/shared/api/persons-detail'
import {
  type PoliticalPosition,
  politicalPartyApi,
} from '@/shared/api/political-party'
import { getUploadImageUrl, uploadImage } from '@/shared/api/upload'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import {
  useRichTextTooltipEscape,
  type RichTextDynastyTooltipState,
  type RichTextTermTooltipState,
} from '@/shared/hooks/use-rich-text-prose-click'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { isLikelyRichTextHtml } from '@/shared/lib/rich-text-read-view'
import { sanitizeRichTextHtml } from '@/shared/lib/sanitize-rich-text-html'
import { Z_INDEX } from '@/shared/styles/z-index'
import { pathKeys } from '@/shared/router'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import {
  EmptyStateFeatureCard,
  EmptyStateFill,
} from '@/shared/ui/empty-state/empty-state'
import { PersonSelectField } from '@/shared/ui/form-fields/person-select-field'
import { FormSelectNative } from '@/shared/ui/form-select-native'
import {
  ModalBody,
  ModalBoxWide,
  ModalCloseButton,
  ModalHeader,
  ModalOverlay,
  ModalTitle,
} from '@/shared/ui/modal/modal.styles'
import {
  PersonRegisterModalBox,
  PersonRegisterModalCloseBtn,
  PersonRegisterModalFormScroll,
  PersonRegisterModalHeader,
  PersonRegisterModalOverlay,
  PersonRegisterModalPrimaryBtn,
  PersonRegisterModalStickyFooter,
  PersonRegisterModalTitle,
} from '@/shared/ui/person-register-modal/person-register-modal-shell'
import {
  CheckboxRow,
  DateFieldBtn,
  FieldControl,
  FieldLabel,
  FieldRow,
  FormRows,
  Input,
  Required,
  TabButton,
  TabNavigation,
  Textarea,
} from '@/shared/ui/register-form-layout'
import { RichTextProseWithEntityClicks } from '@/shared/ui/rich-text-read-view'
import { RichTextEditor } from '@/shared/ui/rich-text-editor/rich-text-editor'
import { AddButton, SectionTabHeader } from '@/shared/ui/section-page-layout'
import { PersonDetailPanel } from '@/widgets/person/person-detail-panel/person-detail-panel'

import { MapRegionTabButton } from './map-region-section.styles'

import {
  HistoryArticleCancelBtn,
  HistoryArticleEditActions,
  HistoryArticleEditorWrap,
  HistoryArticleInner,
  HistoryArticleProse,
  HistoryArticleSaveBtn,
  HistoryProseDynastyTooltipPopover,
  HistoryProseTermTooltipPopover,
  HistoryProseTooltipOverlay,
} from './cabinets-section.styled'
import { CountryPoliticalPartiesBlock } from './country-political-parties-block.widget'
import {
  BallotOptionEditInput,
  BallotOptionEditRow,
  CandidacyNameStrong,
  CandidacyPartyMeta,
  DataTable,
  DataTableCard,
  DataTd,
  DataTdRight,
  DataTh,
  DataThSortButton,
  DataThActions72,
  DataThActions96,
  DataThActions104,
  DataTr,
  DetailColumn,
  DetailHeaderIconBtn,
  DetailTitle,
  DetailToolbar,
  ElectedBadge,
  ElectionChartTooltip,
  ElectionDetailBadgeRow,
  ElectionDetailCountryMeta,
  ElectionDetailEmptyCard,
  ElectionDetailEmptyTitle,
  ElectionDetailHeaderMain,
  ElectionDetailPanelStack,
  ElectionDetailStatCard,
  ElectionDetailStatLabel,
  ElectionDetailStatValue,
  ElectionDetailStatsGrid,
  ElectionDetailStatsScrollWrap,
  ElectionDetailStatusBadge,
  ElectionDetailSummaryPanel,
  ElectionDetailSurface,
  ElectionDetailTypeBadge,
  ElectionListScrollArea,
  ElectionListStack,
  ElectionNavButton,
  ElectionNavEndLine,
  ElectionNavMeta,
  ElectionNavTitle,
  EmptyHint,
  InlineTextInput,
  ListColumn,
  PartyMetricSegmentBtn,
  PartyMetricSegmentedGroup,
  PartyDescEmptyHint,
  PartyDetailChip,
  PartyDetailChipMuted,
  PartyDetailChipRowCenter,
  PartyDetailDescSection,
  PartyDetailHero,
  PartyDetailHeroStack,
  PartyDetailHeroTitle,
  PartyDetailLogoHero,
  PartyDetailLogoImg,
  PartyDetailMetaGrid,
  PartyDetailMetaSection,
  PartyDetailMetaTile,
  PartyDetailMetaTileLabel,
  PartyDetailMetaTileValue,
  PartyMetricTitleTight,
  PartyMetricToolbarRow,
  PartyResultDeltaTd,
  PartyShareDonutHole,
  PartyShareDonutSectorGroup,
  PartyShareDonutSectorPath,
  PartyShareDonutSliceSvg,
  PartyShareDonutLayout,
  PartyShareDonutRing,
  PartyShareInfographic,
  PartyShareLegend,
  PartyShareLegendBody,
  PartyShareLegendItem,
  PartyShareName,
  PartyShareStats,
  PartyShareSwatch,
  PartyTableCellStrong,
  PoliticsElectionSubTabNav,
  PoliticsTabPanel,
  PoliticsTabSubsection,
  ReferendumBallotAddRow,
  ReferendumBallotBarFill,
  ReferendumBallotBarKicker,
  ReferendumBallotBarLabel,
  ReferendumBallotBarRow,
  ReferendumBallotBarTrack,
  ReferendumBallotBarValue,
  ReferendumBallotBars,
  ReferendumBallotPanel,
  ReferendumBallotPanelHead,
  ReferendumBallotPanelIcon,
  ReferendumBallotPanelKicker,
  ReferendumBallotPanelTitle,
  ReferendumBallotPanelTitleRow,
  ReferendumBallotPanelTitles,
  RowActions,
  RowIconBtn,
  SectionHeaderRow,
  SectionHeaderRowNarrative,
  SectionHeaderRowSubsection,
  SplitMainRow,
  SubsectionAddBtn,
  SubsectionLabel,
} from './country-politics-tab.styles'

/** RichTextEditor HTML — 시각적 빈 본문이면 null (저장 시) */
function optionalRichTextHtmlOrNull(html: string): string | null {
  const trimmed = html.trim()
  if (!trimmed) return null
  const safe = sanitizeRichTextHtml(trimmed)
  if (typeof document === 'undefined') {
    const stripped = safe
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .trim()
    return stripped === '' ? null : safe
  }
  const div = document.createElement('div')
  div.innerHTML = safe
  const text = div.textContent?.replace(/\u00a0/g, ' ').trim() ?? ''
  return text === '' ? null : safe
}

function hasRichTextContent(html: string): boolean {
  return optionalRichTextHtmlOrNull(html) != null
}

function electionScopeCountryLabel(detail: ElectionDetailDto): string | null {
  const modern = detail.country?.name?.trim()
  const hist = detail.historicalCountry?.name?.trim()
  if (modern && hist) return `${modern} · ${hist}`
  if (hist) return hist
  if (modern) return modern
  return null
}

const ELECTION_PARTY_POSITION_LABELS: {
  value: PoliticalPosition
  label: string
}[] = [
  { value: 'FAR_LEFT', label: '극좌' },
  { value: 'LEFT', label: '좌파' },
  { value: 'CENTER_LEFT', label: '중도좌파' },
  { value: 'CENTER', label: '중도' },
  { value: 'CENTER_RIGHT', label: '중도우파' },
  { value: 'RIGHT', label: '우파' },
  { value: 'FAR_RIGHT', label: '극우' },
  { value: 'BIG_TENT', label: '빅텐트' },
]

function labelElectionPartyPosition(value: string | null | undefined) {
  if (!value) return '—'
  const o = ELECTION_PARTY_POSITION_LABELS.find((x) => x.value === value)
  return o?.label ?? value
}

function formatElectionPartyDate(iso?: string | null) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('ko-KR')
  } catch {
    return iso
  }
}

function parseElectionPartyIdeologyKeywords(
  raw: string | null | undefined,
): string[] {
  if (!raw?.trim()) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const s of raw.split(/[,，]/)) {
    const t = s.trim()
    if (!t || seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out
}

/** 서술·설명 블록 — 연대표 개요 수정 버튼과 유사 */
const ElectionNarrativeEditBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: none;
  border: none;
  cursor: pointer;
  flex-shrink: 0;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    text-decoration: underline;
  }
`

const ElectionNarrativeBlock = styled.div`
  & + & {
    margin-top: 20px;
  }
`

const ElectionNarrativeEmptyHint = styled.p`
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ElectionPartyIdeologyTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.22)' : '#eef2ff'};
  color: ${({ theme }) => theme.colors.text.primary};
`

const ElectionPartyModalOpenFullBtn = styled.button`
  margin-left: auto;
  flex-shrink: 0;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 8px;
  cursor: pointer;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.border.default};
  }
`

const qk = {
  list: (scopeKey: string) => ['elections', 'list', scopeKey] as const,
  detail: (id: string) => ['elections', 'detail', id] as const,
  parties: (scopeKey: string) => ['political-parties', scopeKey] as const,
  districts: (scopeKey: string) => ['electoral-districts', scopeKey] as const,
}

function electionScopeKey(input: {
  countryId?: string
  historicalCountryId?: string
}) {
  if (input.historicalCountryId)
    return `h:${input.historicalCountryId}` as const
  if (input.countryId) return `c:${input.countryId}` as const
  return '' as const
}

function electionListParams(input: {
  countryId?: string
  historicalCountryId?: string
}):
  | { countryId: string }
  | { historicalCountryId: string }
  | Record<string, never> {
  if (input.historicalCountryId)
    return { historicalCountryId: input.historicalCountryId }
  if (input.countryId) return { countryId: input.countryId }
  return {}
}

/**
 * 선거 저장 시 국가 범위 — 역사 국가 상세 페이지면 페이지의 역사 국가만,
 * 현대 국가 상세면 현대 국가 ID + (선택) 역사 국가 ID.
 */
function resolveElectionScopeForSubmit(
  pageScope: { countryId?: string; historicalCountryId?: string },
  selectedHistoricalCountryId: string,
): { countryId: string | null; historicalCountryId: string | null } {
  if (pageScope.historicalCountryId) {
    return {
      countryId: null,
      historicalCountryId: pageScope.historicalCountryId,
    }
  }
  return {
    countryId: pageScope.countryId ?? null,
    historicalCountryId: selectedHistoricalCountryId.trim() || null,
  }
}

const FullWidthControl = styled(FieldControl)`
  max-width: 100% !important;
  width: 100%;
`

/** API 날짜 → 달력용 YYYY-MM-DD (로컬 날짜 기준) */
function toLocalDateYmd(value: string | null | undefined): string {
  if (value == null || value === '') return ''
  const s = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    try {
      const d = new Date(s)
      if (Number.isNaN(d.getTime())) return s.slice(0, 10)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    } catch {
      return s.slice(0, 10)
    }
  }
  try {
    const d = new Date(s)
    if (Number.isNaN(d.getTime())) return ''
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  } catch {
    return ''
  }
}

/** 투표율 표시·입력: 소수 첫째 자리까지 */
function formatPercentOneDecimalForInput(
  v: string | number | null | undefined,
): string {
  const n = Number(v)
  if (!Number.isFinite(n)) return ''
  return String(Math.round(n * 10) / 10)
}

/** 0~100, 소수 첫째 자리만 입력 허용 (문자 필터) */
function sanitizePercentInput(raw: string): string {
  let t = raw.replace(/[^\d.]/g, '')
  if (t === '') return ''
  const dot = t.indexOf('.')
  if (dot === -1) {
    return t.length > 6 ? t.slice(0, 6) : t
  }
  const intPart = t.slice(0, dot).replace(/\D/g, '')
  const after = t.slice(dot + 1).replace(/\D/g, '')
  const frac = after.slice(0, 1)
  if (frac === '') return intPart === '' ? '0.' : `${intPart}.`
  return `${intPart}.${frac}`
}

/** 0 이상 정수: 숫자만 */
function sanitizeNonNegativeIntInput(raw: string): string {
  return raw.replace(/\D/g, '')
}

/** 득표수: 숫자만, 선행 0 제거(단독 0은 유지) */
function sanitizeVoteCountInput(raw: string): string {
  const d = raw.replace(/\D/g, '')
  if (d === '') return ''
  return d.replace(/^0+/, '') || '0'
}

const ModalFieldWide = styled(FieldControl)`
  max-width: min(560px, 100%) !important;
`

const ModalFieldMedium = styled(FieldControl)`
  max-width: min(400px, 100%) !important;
`

const ModalFieldNarrow = styled(FieldControl)`
  max-width: 280px !important;
`

const SelectClearRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
`

const ClearFieldBtn = styled.button`
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition: border-color 0.15s ease;
  &:hover {
    border-color: #6366f1;
  }
`

function formatPollYmdKo(ymd: string) {
  if (!ymd) return ''
  try {
    return new Date(`${ymd}T12:00:00.000Z`).toLocaleDateString('ko-KR')
  } catch {
    return ymd
  }
}

function ElectionsModalShell({
  title,
  onClose,
  children,
  /** 스크롤 밖 하단 고정(저장 버튼 등). 닫기는 헤더 X만 사용 */
  footer,
  maxWidth = 'min(1000px, 96vw)',
  /** 기본 `auto` — 짧은 폼은 내용 높이만큼 */
  minHeight = 'auto',
  /**
   * 바깥 모달 높이 고정(탭 전환 시). `PersonRegisterModalBox`의 `$height`로 전달.
   * `minHeight`만으로는 긴 탭에서 박스가 커졌다 짧은 탭에서만 줄어드는 문제가 남음.
   */
  height: fixedHeight,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  maxWidth?: string
  minHeight?: string
  height?: string
}) {
  return createPortal(
    <PersonRegisterModalOverlay
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <PersonRegisterModalBox
        $maxWidth={maxWidth}
        $minHeight={fixedHeight ? undefined : minHeight}
        $height={fixedHeight}
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
      >
        <PersonRegisterModalHeader>
          <PersonRegisterModalTitle>{title}</PersonRegisterModalTitle>
          <PersonRegisterModalCloseBtn
            type="button"
            onClick={onClose}
            aria-label="닫기"
          >
            <FiX size={20} />
          </PersonRegisterModalCloseBtn>
        </PersonRegisterModalHeader>
        <PersonRegisterModalFormScroll>
          {children}
        </PersonRegisterModalFormScroll>
        {footer != null ? (
          <PersonRegisterModalStickyFooter>
            {footer}
          </PersonRegisterModalStickyFooter>
        ) : null}
      </PersonRegisterModalBox>
    </PersonRegisterModalOverlay>,
    document.body,
  )
}

function formatPollDate(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

/** 목록·상세 공통 — 회차가 있으면 `n대 명칭` */
function electionPrimaryTitle(input: {
  name: string
  convocationOrdinal?: number | null
}): string {
  const n = input.convocationOrdinal
  if (n != null && Number.isFinite(Number(n))) return `${n}대 ${input.name}`
  return input.name
}

/** 목록용 종료일: 투표 종료 → 법정 임기 만료 (실제 의회 종료는 상세만) */
function electionListEndLine(
  e: ElectionListRow,
): { prefix: string; dateStr: string } | null {
  const p = e.pollEndDate
  if (p != null && String(p).trim() !== '')
    return { prefix: '투표 종료', dateStr: formatPollDate(String(p)) }
  const t = e.legislatureTermEnd
  if (t != null && String(t).trim() !== '')
    return { prefix: '임기 만료', dateStr: formatPollDate(String(t)) }
  return null
}

/** 빈 값이면 null, 0 이상 정수면 해당 값, 그 외는 invalid */
function parseOptionalNonNegativeInt(raw: string): number | null | 'invalid' {
  const t = raw.trim()
  if (t === '') return null
  const n = Number(t)
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return 'invalid'
  return n
}

/** 득표율·투표 참여율: 빈 값 null, 0~100·소수 첫째 자리까지, 그 외 invalid */
function parseOptionalPercent0to100(raw: string): number | null | 'invalid' {
  const t = raw.trim().replace(/\.$/, '')
  if (t === '') return null
  if (!/^\d+(\.\d)?$/.test(t)) return 'invalid'
  const n = Number(t)
  if (!Number.isFinite(n) || n < 0 || n > 100) return 'invalid'
  return Math.round(n * 10) / 10
}

/** 득표수(문자열): 비우면 null, 숫자만 허용 */
function parseOptionalVotesDigits(raw: string): string | null | 'invalid' {
  const t = raw.trim().replace(/[\s,]/g, '')
  if (t === '') return null
  if (!/^\d+$/.test(t)) return 'invalid'
  return t
}

/** API·폼에서 온 득표율을 표시용 문자열로 (Decimal 직렬화 이슈 대비) */
function formatVoteShareLabel(
  v: string | number | null | undefined,
): string | null {
  if (v == null || v === '') return null
  const s = String(v).trim()
  if (s === '' || s === '[object Object]') return null
  const n = Number(s)
  if (Number.isFinite(n)) {
    const rounded = Math.round(n * 100) / 100
    return `${rounded}%`
  }
  return s.endsWith('%') ? s : `${s}%`
}

/** 직전 회차 대비 득표율 변화(퍼센트포인트): 증가·감소 문구 포함 */
function formatVoteShareDeltaPpt(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const rounded = Math.round(v * 100) / 100
  if (rounded === 0) return '변동 없음'
  if (rounded > 0) return `+${rounded}%p 증가`
  return `${rounded}%p 감소`
}

function deltaToneCss(v: number | null | undefined): string | undefined {
  if (v == null || !Number.isFinite(v) || v === 0) return undefined
  if (v > 0) return 'var(--positive, #16a34a)'
  return 'var(--negative, #dc2626)'
}

/** 직전 회차 대비 의석 변화 */
function formatSeatsDelta(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  if (v === 0) return '변동 없음'
  if (v > 0) return `+${v}석 (증가)`
  return `${v}석 (감소)`
}

/** 표시용 득표수 — 숫자만 지역화 콤마 */
function formatVotesForDisplay(
  raw: string | number | null | undefined,
): string {
  if (raw == null) return '—'
  const s = String(raw).trim()
  if (s === '') return '—'
  if (/^\d+$/.test(s)) {
    try {
      return BigInt(s).toLocaleString('ko-KR')
    } catch {
      return Number(s).toLocaleString('ko-KR')
    }
  }
  return s
}

function parseVotesBigIntForSort(
  raw: string | number | null | undefined,
): bigint {
  if (raw == null) return BigInt(-1)
  const s = String(raw).trim()
  if (!s || !/^\d+$/.test(s)) return BigInt(-1)
  try {
    return BigInt(s)
  } catch {
    return BigInt(-1)
  }
}

function compareBigint(a: bigint, b: bigint): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

type PartyResultSortKey =
  | 'party'
  | 'votes'
  | 'voteShare'
  | 'deltaVote'
  | 'seats'
  | 'deltaSeats'

function defaultPartyResultSortDir(key: PartyResultSortKey): 'asc' | 'desc' {
  if (key === 'party') return 'asc'
  return 'desc'
}

function PartySortGlyph({
  columnKey,
  activeKey,
  dir,
}: {
  columnKey: PartyResultSortKey
  activeKey: PartyResultSortKey
  dir: 'asc' | 'desc'
}) {
  const active = activeKey === columnKey
  return active ? (
    dir === 'asc' ? (
      <FiChevronUp size={14} strokeWidth={2.25} aria-hidden />
    ) : (
      <FiChevronDown size={14} strokeWidth={2.25} aria-hidden />
    )
  ) : (
    <FiChevronDown
      size={14}
      strokeWidth={2.25}
      aria-hidden
      style={{ opacity: 0.35 }}
    />
  )
}

function hueFromPartyId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * (i + 1)) % 72
  return 208 + h
}

/**
 * 정당 브랜드 색(#RRGGBB) 우선.
 * 선거 상세의 중첩 `party`에 색이 없을 때 이 국가 정당 목록(`parties`)에서 보강.
 */
function partyResultSliceFill(
  row: ElectionPartyResultDto,
  fallbackHue: number,
  registryBrandColor?: string | null,
): string {
  const raw = (row.party?.brandColor ?? registryBrandColor)?.trim()
  if (raw) {
    const withHash = raw.startsWith('#') ? raw : `#${raw}`
    if (/^#[0-9A-Fa-f]{6}$/.test(withHash)) return withHash
  }
  return `hsl(${fallbackHue} 68% 54%)`
}

/**
 * 전원(360°) 도넛 조각 — 0°=12시 방향, 시계방향 증가.
 * viewBox 0 0 100 100 기준 링 부채꼴 path.
 */
function partyCircleSectorPathD(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startDeg: number,
  endDeg: number,
): string {
  if (endDeg <= startDeg + 0.0001) return ''
  // 단일 조각이 정확히 360°면 두 개의 반원을 이어 완전 원으로 그린다
  const span = endDeg - startDeg
  if (span >= 359.999) {
    return `
      M ${cx} ${cy - outerR}
      A ${outerR} ${outerR} 0 1 1 ${cx} ${cy + outerR}
      A ${outerR} ${outerR} 0 1 1 ${cx} ${cy - outerR}
      M ${cx} ${cy - innerR}
      A ${innerR} ${innerR} 0 1 0 ${cx} ${cy + innerR}
      A ${innerR} ${innerR} 0 1 0 ${cx} ${cy - innerR}
      Z
    `
  }
  const rad = (deg: number) => ((deg - 90) * Math.PI) / 180
  const t0 = rad(startDeg)
  const t1 = rad(endDeg)
  const ox0 = cx + outerR * Math.cos(t0)
  const oy0 = cy + outerR * Math.sin(t0)
  const ox1 = cx + outerR * Math.cos(t1)
  const oy1 = cy + outerR * Math.sin(t1)
  const ix0 = cx + innerR * Math.cos(t0)
  const iy0 = cy + innerR * Math.sin(t0)
  const ix1 = cx + innerR * Math.cos(t1)
  const iy1 = cy + innerR * Math.sin(t1)
  const largeArc = span > 180 ? 1 : 0
  return `M ${ox0} ${oy0} A ${outerR} ${outerR} 0 ${largeArc} 1 ${ox1} ${oy1} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix0} ${iy0} Z`
}

function formatPartyDonutSliceHoverTitle(
  s: { row: ElectionPartyResultDto; fraction: number },
  metric: 'voteShare' | 'seats',
): string {
  const name = s.row.party?.shortName || s.row.party?.name || s.row.partyId
  const pct = formatVoteShareLabel(s.row.voteSharePercent)
  const votesDisp = formatVotesForDisplay(s.row.votes)
  const votesPart = votesDisp !== '—' ? `득표 ${votesDisp}` : null
  const fracPct = `${(s.fraction * 100).toFixed(1)}%`
  if (metric === 'seats') {
    const seats = s.row.seatsWon
    const seatPart = seats != null && seats >= 0 ? `${seats}석` : '의석 —'
    const parts = [
      name,
      `${seatPart} · 반원 내 비중 ${fracPct}`,
      pct ? `득표율 ${pct}` : null,
      votesPart,
    ].filter(Boolean) as string[]
    return parts.join(' · ')
  }
  const parts = [
    name,
    pct ? `득표율 ${pct}` : `반원 내 비중 ${fracPct}`,
    votesPart,
    s.row.seatsWon != null ? `의석 ${s.row.seatsWon}석` : null,
  ].filter(Boolean) as string[]
  return parts.join(' · ')
}

/** 정당 집계 합계·잔여(기타) 요약 */
type PartyResultsSummary = {
  votesSum: bigint
  votesKnownCount: number
  voteShareSum: number
  voteShareKnownCount: number
  seatsSum: number
  seatsKnownCount: number
  otherSeats: number | null
  otherVoteShare: number | null
  seatsMismatch:
    | { kind: 'over'; diff: number }
    | { kind: 'under'; diff: number }
    | null
  voteShareMismatch: { diff: number; over: boolean } | null
}

function computePartyResultsSummary(
  rows: ElectionPartyResultDto[],
  totalSeats: number | null | undefined,
): PartyResultsSummary {
  let votesSum = 0n
  let votesKnownCount = 0
  let voteShareSum = 0
  let voteShareKnownCount = 0
  let seatsSum = 0
  let seatsKnownCount = 0

  for (const row of rows) {
    const voteStr =
      row.votes != null ? String(row.votes).trim().replace(/[\s,]/g, '') : ''
    if (voteStr && /^\d+$/.test(voteStr)) {
      try {
        votesSum += BigInt(voteStr)
        votesKnownCount += 1
      } catch {
        /* ignore */
      }
    }
    const vsRaw =
      row.voteSharePercent != null
        ? String(row.voteSharePercent).trim()
        : ''
    const vsNum = Number(vsRaw)
    if (vsRaw !== '' && Number.isFinite(vsNum) && vsNum >= 0) {
      voteShareSum += vsNum
      voteShareKnownCount += 1
    }
    if (row.seatsWon != null && Number.isFinite(row.seatsWon)) {
      seatsSum += row.seatsWon
      seatsKnownCount += 1
    }
  }

  const totalSeatsNum =
    totalSeats != null && Number.isFinite(totalSeats) && totalSeats > 0
      ? totalSeats
      : null
  const otherSeats =
    totalSeatsNum != null && totalSeatsNum - seatsSum > 0
      ? totalSeatsNum - seatsSum
      : null
  const otherVoteShare =
    voteShareKnownCount > 0 && 100 - voteShareSum > 0.05
      ? Math.round((100 - voteShareSum) * 100) / 100
      : null

  let seatsMismatch: PartyResultsSummary['seatsMismatch'] = null
  if (totalSeatsNum != null) {
    if (seatsSum > totalSeatsNum) {
      seatsMismatch = { kind: 'over', diff: seatsSum - totalSeatsNum }
    } else if (seatsSum < totalSeatsNum) {
      seatsMismatch = { kind: 'under', diff: totalSeatsNum - seatsSum }
    }
  }

  let voteShareMismatch: PartyResultsSummary['voteShareMismatch'] = null
  if (voteShareKnownCount > 0) {
    const diff = Math.round((voteShareSum - 100) * 100) / 100
    if (Math.abs(diff) > 0.5) {
      voteShareMismatch = { diff: Math.abs(diff), over: diff > 0 }
    }
  }

  return {
    votesSum,
    votesKnownCount,
    voteShareSum,
    voteShareKnownCount,
    seatsSum,
    seatsKnownCount,
    otherSeats,
    otherVoteShare,
    seatsMismatch,
    voteShareMismatch,
  }
}

/** TabContentPane과 맞물려 빈 상태(EmptyStateFill)가 남는 높이를 채우도록 */
const CountryElectionsSectionRoot = styled.div`
  flex: 1 1 0%;
  min-height: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-self: stretch;
`

const ElectionsPoliticsTabPanel = styled(PoliticsTabPanel)`
  flex: 1 1 0%;
  && {
    min-height: 0;
  }
`

const ElectionsPoliticsTabSubsection = styled(PoliticsTabSubsection)`
  flex: 1 1 0%;
  min-height: 0;
  display: flex;
  flex-direction: column;
`

const ElectionListColumnFill = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
`

async function uploadElectionRichTextImage(file: File): Promise<string> {
  const result = await uploadImage(file, 'events')
  return getUploadImageUrl(result.url) || result.url || ''
}

/** 정당 집계 합계 행 */
const PartyTotalsRow = styled.tr`
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99,102,241,0.08)' : '#f1f5f9'};
  & td {
    padding: 10px 12px;
    border-top: 2px solid ${({ theme }) => theme.colors.border.default};
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
    font-weight: 600;
    font-size: 12.5px;
    color: ${({ theme }) => theme.colors.text.primary};
    vertical-align: middle;
  }
`

/** 기타(잔여) 행 — 더 낮은 강조 */
const PartyOtherRow = styled.tr`
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#fafbfc'};
  & td {
    color: ${({ theme }) => theme.colors.text.secondary};
    font-style: italic;
    padding: 10px 12px;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  }
`

/** 합계/무결성 경고·정상 배지 라인 */
const PartyValidationBanner = styled.div<{ $tone: 'ok' | 'warn' | 'error' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 10px 0 0;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.5;
  color: ${({ $tone, theme }) =>
    $tone === 'error'
      ? 'var(--negative, #dc2626)'
      : $tone === 'warn'
        ? theme.mode === 'dark'
          ? '#fbbf24'
          : '#b45309'
        : 'var(--positive, #16a34a)'};
  background: ${({ $tone, theme }) =>
    $tone === 'error'
      ? theme.mode === 'dark'
        ? 'rgba(220,38,38,0.15)'
        : '#fef2f2'
      : $tone === 'warn'
        ? theme.mode === 'dark'
          ? 'rgba(251,191,36,0.12)'
          : '#fefce8'
        : theme.mode === 'dark'
          ? 'rgba(22,163,74,0.12)'
          : '#f0fdf4'};
  border: 1px solid
    ${({ $tone, theme }) =>
      $tone === 'error'
        ? theme.mode === 'dark'
          ? 'rgba(220,38,38,0.35)'
          : '#fecaca'
        : $tone === 'warn'
          ? theme.mode === 'dark'
            ? 'rgba(251,191,36,0.28)'
            : '#fde68a'
          : theme.mode === 'dark'
            ? 'rgba(22,163,74,0.28)'
            : '#bbf7d0'};
  & strong {
    font-weight: 700;
  }
`

const PartyValidationList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

/** 후보 사퇴 배지 */
const CandidacyWithdrawnBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#fca5a5' : '#b91c1c'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(220,38,38,0.18)' : '#fef2f2'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(220,38,38,0.3)' : '#fecaca'};
  border-radius: 999px;
  white-space: nowrap;
`

/** 투표 안 부제목(약칭) */
const BallotOptionShortLabel = styled.span`
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

/** 전원 도넛용 컨테이너 — 반원 Clip을 대체해 완전한 원 표시 */
const FullCircleDonutClip = styled.div`
  width: min(240px, 100%);
  aspect-ratio: 1 / 1;
  max-width: 260px;
  margin: 0 auto;
  position: relative;
  flex-shrink: 0;
`

const FullCircleDonutInner = styled.div`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
`

/** 정당 색 dot — 이름 왼쪽에 4px 블록 */
const PartyColorDot = styled.span<{ $fill: string }>`
  display: inline-block;
  width: 4px;
  height: 14px;
  margin-right: 8px;
  border-radius: 2px;
  background: ${({ $fill }) => $fill};
  vertical-align: -2px;
  flex-shrink: 0;
`

const PartyNameInline = styled.span`
  display: inline-flex;
  align-items: center;
`

/** 도넛 범례 접힘/더보기 버튼 */
const LegendExpandBtn = styled.button`
  align-self: flex-start;
  margin-top: 4px;
  padding: 4px 10px;
  font-size: 11.5px;
  font-weight: 500;
  color: #6366f1;
  background: transparent;
  border: 1px dashed
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.35)' : '#c7d2fe'};
  border-radius: 6px;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.12)' : '#eef2ff'};
    border-style: solid;
  }
`

/** 선거 목록 상단 필터 바 */
const ElectionListFilterBar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 0 10px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  margin-bottom: 8px;
`

const ElectionListFilterRow = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
`

const ElectionListFilterInput = styled.input`
  flex: 1;
  min-width: 0;
  height: 32px;
  padding: 0 10px;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#ffffff'};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  outline: none;
  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  &:focus-visible {
    border-color: #6366f1;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
  }
`

const ElectionListFilterSelect = styled.select`
  flex: 1;
  min-width: 0;
  height: 32px;
  padding: 0 8px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#ffffff'};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  outline: none;
  &:focus-visible {
    border-color: #6366f1;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
  }
`

const ElectionListFilterMeta = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  padding-left: 2px;
`

const ElectionListFilterToggleBtn = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  height: 32px;
  padding: 0 10px;
  font-size: 11.5px;
  font-weight: 500;
  color: ${({ $active, theme }) =>
    $active ? '#6366f1' : theme.colors.text.secondary};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99,102,241,0.16)'
        : '#eef2ff'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.04)'
        : '#ffffff'};
  border: 1px solid
    ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? 'rgba(99,102,241,0.4)'
          : '#c7d2fe'
        : theme.colors.border.default};
  border-radius: 8px;
  cursor: pointer;
  &:hover {
    border-color: #6366f1;
    color: #6366f1;
  }
`

const FilterBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 5px;
  margin-left: 2px;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  background: #6366f1;
  border-radius: 999px;
`

/** 시계열 비교 섹션 */
const ElectionTimelineBlock = styled.section`
  margin-top: 16px;
  padding: 14px 16px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 12px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#fafbfc'};
`

const ElectionTimelineHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ElectionTimelineLegendWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  margin-bottom: 10px;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const ElectionTimelineLegendItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`

const ElectionTimelineLegendDot = styled.span<{ $fill: string }>`
  width: 10px;
  height: 10px;
  border-radius: 3px;
  background: ${({ $fill }) => $fill};
  display: inline-block;
`

const ElectionTimelineRow = styled.div<{ $current?: boolean }>`
  display: grid;
  grid-template-columns: 160px 1fr 96px;
  gap: 10px;
  align-items: center;
  padding: 6px 8px;
  border-radius: 8px;
  background: ${({ $current, theme }) =>
    $current
      ? theme.mode === 'dark'
        ? 'rgba(99,102,241,0.14)'
        : '#eef2ff'
      : 'transparent'};
  & + & {
    margin-top: 4px;
  }
`

const ElectionTimelineRowLabel = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  & small {
    display: block;
    margin-top: 2px;
    font-size: 10.5px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const ElectionTimelineBarTrack = styled.div`
  height: 18px;
  display: flex;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#e5e7eb'};
  border-radius: 4px;
  overflow: hidden;
`

const ElectionTimelineBarSegment = styled.div<{
  $fill: string
  $pct: number
}>`
  height: 100%;
  width: ${({ $pct }) => $pct}%;
  background: ${({ $fill }) => $fill};
  flex-shrink: 0;
`

const ElectionTimelineRowMeta = styled.div`
  text-align: right;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
`

export interface CountryElectionsSectionProps {
  /** 현대 국가 상세에서 전달 */
  countryId?: string
  /** 역사 국가 상세에서 전달 — `countryId`와 동시에 쓰지 않음 */
  historicalCountryId?: string
  /**
   * 국가 목록/상세에 이미 실려 온 연결 역사 국가 (GET /countries 등).
   * `useHistoricalCountriesByModernCountry` 캐시·응답과 어긋날 때 모달 셀렉트를 맞추기 위해 병합한다.
   */
  linkedHistoricalCountries?: ReadonlyArray<{ id: string; name: string }>
}

export function CountryElectionsSection({
  countryId,
  historicalCountryId,
  linkedHistoricalCountries,
}: CountryElectionsSectionProps) {
  const { partyId: electionPartyId } = useParams<{ partyId?: string }>()
  const navigate = useNavigate()
  const routeCountryId = countryId ?? historicalCountryId ?? ''
  const [politicsViewTab, setPoliticsViewTab] = useState<
    'parties' | 'elections'
  >(() => (electionPartyId ? 'parties' : 'elections'))

  useEffect(() => {
    if (electionPartyId) setPoliticsViewTab('parties')
  }, [electionPartyId])

  const handlePoliticsViewTab = (tab: 'parties' | 'elections') => {
    if (tab === 'elections' && electionPartyId && routeCountryId) {
      navigate(pathKeys.history.countryElections(routeCountryId))
    }
    setPoliticsViewTab(tab)
  }

  const queryClient = useQueryClient()
  const { data: persons = [] } = usePersons()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('electionId') || null
  const setSelectedId = useCallback(
    (next: string | null) => {
      setSearchParams(
        (prev) => {
          const copy = new URLSearchParams(prev)
          if (next) copy.set('electionId', next)
          else copy.delete('electionId')
          return copy
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )
  const scopeKey = useMemo(
    () => electionScopeKey({ countryId, historicalCountryId }),
    [countryId, historicalCountryId],
  )
  const listParams = useMemo(
    () => electionListParams({ countryId, historicalCountryId }),
    [countryId, historicalCountryId],
  )
  const electionScope = useMemo(
    () => ({ countryId, historicalCountryId }),
    [countryId, historicalCountryId],
  )

  const pickerModernCountryId =
    countryId && !historicalCountryId ? countryId : ''
  const { data: historicalCountryOptionsFromApi = [] } =
    useHistoricalCountriesByModernCountry(pickerModernCountryId)

  const historicalCountryOptions = useMemo(() => {
    const byId = new Map<string, { id: string; name: string }>()
    for (const h of historicalCountryOptionsFromApi) {
      if (h?.id) byId.set(h.id, { id: h.id, name: h.name ?? '' })
    }
    for (const h of linkedHistoricalCountries ?? []) {
      if (h?.id && !byId.has(h.id)) {
        byId.set(h.id, { id: h.id, name: h.name ?? '' })
      }
    }
    return Array.from(byId.values())
  }, [historicalCountryOptionsFromApi, linkedHistoricalCountries])

  const [electionModal, setElectionModal] = useState<
    | { mode: 'create' }
    | {
        mode: 'edit'
        election: ElectionDetailDto
        initialTab?: 'basic' | 'legislature' | 'stats'
      }
    | null
  >(null)
  const [candidacyModal, setCandidacyModal] = useState<
    | { mode: 'create'; electionId: string }
    | { mode: 'edit'; electionId: string; row: ElectionCandidacyDto }
    | null
  >(null)
  const [resultModal, setResultModal] = useState<{
    electionId: string
    candidacyId: string
    initial?: ElectionCandidacyDto['result']
  } | null>(null)
  const [ballotResultModal, setBallotResultModal] = useState<{
    electionId: string
    option: ElectionBallotOptionDto
  } | null>(null)
  const [partyResultModal, setPartyResultModal] = useState<
    | { mode: 'create'; electionId: string }
    | { mode: 'edit'; electionId: string; row: ElectionPartyResultDto }
    | null
  >(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string
    message: string
    confirmLabel?: string
    danger?: boolean
    onConfirm: () => void
  } | null>(null)

  const { data: list = [], isLoading: listLoading } = useQuery({
    queryKey: qk.list(scopeKey),
    queryFn: () => getElections(listParams as Record<string, string>),
    enabled: !!scopeKey,
  })

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: qk.detail(selectedId ?? ''),
    queryFn: () => getElection(selectedId!),
    enabled: !!selectedId,
  })

  const { data: parties = [] } = useQuery({
    queryKey: qk.parties(scopeKey),
    queryFn: () => getPoliticalParties(listParams as Record<string, string>),
    enabled: !!scopeKey,
  })

  const { data: districts = [] } = useQuery({
    queryKey: qk.districts(scopeKey),
    queryFn: () => getElectoralDistricts(listParams as Record<string, string>),
    enabled: !!scopeKey,
  })

  const { data: countryForNames } = useCountry(countryId ?? '')

  const candidacyLabel = useCallback(
    (c: ElectionCandidacyDto) => {
      if (c.person) {
        const p = c.person as {
          name: string
          surname?: string | null
          middleName?: string | null
          country?: { defaultNameDisplayOrder?: string | null } | null
        }
        return getPersonDisplayName(
          {
            name: p.name,
            surname: p.surname,
            middleName: p.middleName,
            country: p.country ?? null,
          },
          {
            countryDefaultNameDisplayOrder:
              countryForNames?.defaultNameDisplayOrder ?? null,
          },
        )
      }
      if (c.party) return c.party.shortName || c.party.name
      return '(후보 정보 없음)'
    },
    [countryForNames?.defaultNameDisplayOrder],
  )

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: qk.list(scopeKey) })
    if (selectedId)
      queryClient.invalidateQueries({ queryKey: qk.detail(selectedId) })
  }, [queryClient, scopeKey, selectedId])

  const saveElectionMut = useMutation({
    mutationFn: async (payload: {
      mode: 'create' | 'edit'
      id?: string
      body:
        | Parameters<typeof createElection>[0]
        | Parameters<typeof updateElection>[1]
    }) => {
      if (payload.mode === 'create')
        return createElection(
          payload.body as Parameters<typeof createElection>[0],
        )
      return updateElection(
        payload.id!,
        payload.body as Parameters<typeof updateElection>[1],
      )
    },
    onSuccess: (row) => {
      invalidate()
      setSelectedId(row.id)
      setElectionModal(null)
      toast.success('저장되었습니다.')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  /** 선거 설명 정본이 연결 사건(Event)에 있을 때 — election.description 대신 event 수정 */
  const saveElectionLinkedEventDescriptionMut = useMutation({
    mutationFn: async (p: { eventId: string; description: string | null }) => {
      await updateEvent(p.eventId, {
        description: p.description ?? undefined,
      })
    },
    onSuccess: () => {
      invalidate()
      toast.success('저장되었습니다.')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const delElectionMut = useMutation({
    mutationFn: (id: string) => deleteElection(id),
    onSuccess: () => {
      invalidate()
      setSelectedId(null)
      toast.success('삭제되었습니다.')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const saveCandidacyMut = useMutation({
    mutationFn: async (p: {
      mode: 'create' | 'edit'
      electionId: string
      candidacyId?: string
      body: Parameters<typeof createElectionCandidacy>[1]
    }) => {
      if (p.mode === 'create')
        return createElectionCandidacy(p.electionId, p.body)
      return updateElectionCandidacy(p.electionId, p.candidacyId!, p.body)
    },
    onSuccess: () => {
      invalidate()
      setCandidacyModal(null)
      toast.success('후보가 저장되었습니다.')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const delCandidacyMut = useMutation({
    mutationFn: (p: { electionId: string; candidacyId: string }) =>
      deleteElectionCandidacy(p.electionId, p.candidacyId),
    onSuccess: () => {
      invalidate()
      toast.success('후보 행이 삭제되었습니다.')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const resultMut = useMutation({
    mutationFn: (p: {
      electionId: string
      candidacyId: string
      body: Parameters<typeof upsertCandidacyResult>[2]
    }) => upsertCandidacyResult(p.electionId, p.candidacyId, p.body),
    onSuccess: () => {
      invalidate()
      setResultModal(null)
      toast.success('득표가 반영되었습니다.')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const ballotCreateMut = useMutation({
    mutationFn: (p: { electionId: string; label: string; sortOrder: number }) =>
      createBallotOption(p.electionId, {
        label: p.label,
        sortOrder: p.sortOrder,
      }),
    onSuccess: () => {
      invalidate()
      toast.success('투표 안이 추가되었습니다.')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const ballotRenameMut = useMutation({
    mutationFn: (p: { electionId: string; optionId: string; label: string }) =>
      updateBallotOption(p.electionId, p.optionId, { label: p.label }),
    onSuccess: () => {
      invalidate()
      toast.success('투표 안 이름이 저장되었습니다.')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const ballotDelMut = useMutation({
    mutationFn: (p: { electionId: string; optionId: string }) =>
      deleteBallotOption(p.electionId, p.optionId),
    onSuccess: () => {
      invalidate()
      toast.success('삭제되었습니다.')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const ballotResultMut = useMutation({
    mutationFn: (p: {
      electionId: string
      optionId: string
      body: Parameters<typeof upsertBallotOptionResult>[2]
    }) => upsertBallotOptionResult(p.electionId, p.optionId, p.body),
    onSuccess: () => {
      invalidate()
      setBallotResultModal(null)
      toast.success('집계가 반영되었습니다.')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const partyResultMut = useMutation({
    mutationFn: (p: {
      electionId: string
      partyId: string
      body: Parameters<typeof upsertElectionPartyResult>[2]
    }) => upsertElectionPartyResult(p.electionId, p.partyId, p.body),
    onSuccess: () => {
      invalidate()
      setPartyResultModal(null)
      toast.success('정당 집계가 저장되었습니다.')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const partyResultDelMut = useMutation({
    mutationFn: (p: { electionId: string; partyId: string }) =>
      deleteElectionPartyResult(p.electionId, p.partyId),
    onSuccess: () => {
      invalidate()
      toast.success('정당 집계를 삭제했습니다.')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  /** 목록 필터 — 탭 전환에도 유지 (컴포넌트 마운트 유지 중) */
  const [listSearch, setListSearch] = useState('')
  const [listTypeFilter, setListTypeFilter] = useState<string>('')
  const [listStatusFilter, setListStatusFilter] = useState<string>('')
  const [listSortKey, setListSortKey] = useState<'pollDate' | 'ordinal'>(
    'pollDate',
  )
  const [listSortDir, setListSortDir] = useState<'asc' | 'desc'>('desc')
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  const filteredList = useMemo(() => {
    const query = listSearch.trim().toLowerCase()
    return list.filter((row) => {
      if (query) {
        const hay = `${row.name} ${row.shortName ?? ''}`.toLowerCase()
        if (!hay.includes(query)) return false
      }
      if (listTypeFilter && row.electionType !== listTypeFilter) return false
      if (listStatusFilter && row.status !== listStatusFilter) return false
      return true
    })
  }, [list, listSearch, listTypeFilter, listStatusFilter])

  const sortedList = useMemo(() => {
    const mult = listSortDir === 'asc' ? 1 : -1
    const arr = [...filteredList]
    arr.sort((rowA, rowB) => {
      if (listSortKey === 'ordinal') {
        const ordA = rowA.convocationOrdinal ?? -Infinity
        const ordB = rowB.convocationOrdinal ?? -Infinity
        if (ordA !== ordB) return (ordA - ordB) * mult
      }
      return (
        (new Date(rowA.pollDate).getTime() -
          new Date(rowB.pollDate).getTime()) *
        mult
      )
    })
    return arr
  }, [filteredList, listSortKey, listSortDir])

  /** 선거 전환 직후 이전 쿼리 데이터가 잠깐 남는 경우를 막아 상세가 뒤섞이지 않게 함 */
  const detailMatchesSelection = Boolean(
    detail && selectedId && detail.id === selectedId,
  )

  return (
    <CountryElectionsSectionRoot>
      <ElectionsPoliticsTabPanel>
        <SectionTabHeader
          variant="flat"
          title="선거·투표"
          description={
            historicalCountryId
              ? '역사 국가 기준 정당·선거 — 탭에서 전환합니다.'
              : '정당 등록 후 선거·후보에 연결합니다. 탭에서 정당과 선거를 나눕니다.'
          }
          rightSlot={
            politicsViewTab === 'elections' ? (
              <AddButton
                type="button"
                onClick={() => setElectionModal({ mode: 'create' })}
                aria-label="새 선거 등록"
              >
                <FiPlus size={14} strokeWidth={2.25} aria-hidden />새 선거
              </AddButton>
            ) : undefined
          }
        />

        <PoliticsElectionSubTabNav
          role="tablist"
          aria-label="정당·선거 하위 메뉴"
        >
          <MapRegionTabButton
            type="button"
            role="tab"
            aria-selected={politicsViewTab === 'parties'}
            $active={politicsViewTab === 'parties'}
            onClick={() => handlePoliticsViewTab('parties')}
          >
            정당
          </MapRegionTabButton>
          <MapRegionTabButton
            type="button"
            role="tab"
            aria-selected={politicsViewTab === 'elections'}
            $active={politicsViewTab === 'elections'}
            onClick={() => handlePoliticsViewTab('elections')}
          >
            선거·투표
          </MapRegionTabButton>
        </PoliticsElectionSubTabNav>

        {politicsViewTab === 'parties' ? (
          <CountryPoliticalPartiesBlock
            countryId={countryId}
            historicalCountryId={historicalCountryId}
            selectedPartyId={electionPartyId ?? null}
          />
        ) : null}

        {politicsViewTab === 'elections' ? (
          <ElectionsPoliticsTabSubsection aria-label="선거 목록·상세">
            <SplitMainRow>
              <ListColumn>
                {!listLoading && list.length > 0 ? (
                  <ElectionListFilterBar>
                    <ElectionListFilterRow>
                      <ElectionListFilterInput
                        type="search"
                        value={listSearch}
                        onChange={(e) => setListSearch(e.target.value)}
                        placeholder="선거 이름 검색…"
                        aria-label="선거 이름 검색"
                      />
                      <ElectionListFilterToggleBtn
                        type="button"
                        $active={
                          filtersExpanded ||
                          !!listTypeFilter ||
                          !!listStatusFilter ||
                          listSortKey !== 'pollDate' ||
                          listSortDir !== 'desc'
                        }
                        onClick={() => setFiltersExpanded((v) => !v)}
                        aria-expanded={filtersExpanded}
                        aria-label="필터·정렬 열기"
                        title="필터·정렬"
                      >
                        <FiSliders size={14} strokeWidth={2.25} aria-hidden />
                        {(listTypeFilter ? 1 : 0) +
                          (listStatusFilter ? 1 : 0) +
                          (listSortKey !== 'pollDate' ||
                          listSortDir !== 'desc'
                            ? 1
                            : 0) >
                        0 ? (
                          <FilterBadge>
                            {(listTypeFilter ? 1 : 0) +
                              (listStatusFilter ? 1 : 0) +
                              (listSortKey !== 'pollDate' ||
                              listSortDir !== 'desc'
                                ? 1
                                : 0)}
                          </FilterBadge>
                        ) : null}
                      </ElectionListFilterToggleBtn>
                    </ElectionListFilterRow>
                    {filtersExpanded ? (
                      <>
                        <ElectionListFilterRow>
                          <ElectionListFilterSelect
                            value={listTypeFilter}
                            onChange={(e) => setListTypeFilter(e.target.value)}
                            aria-label="선거 유형 필터"
                          >
                            <option value="">전체 유형</option>
                            {ELECTION_TYPE_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </ElectionListFilterSelect>
                          <ElectionListFilterSelect
                            value={listStatusFilter}
                            onChange={(e) =>
                              setListStatusFilter(e.target.value)
                            }
                            aria-label="선거 상태 필터"
                          >
                            <option value="">전체 상태</option>
                            {ELECTION_STATUS_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </ElectionListFilterSelect>
                        </ElectionListFilterRow>
                        <ElectionListFilterRow>
                          <ElectionListFilterSelect
                            value={`${listSortKey}:${listSortDir}`}
                            onChange={(e) => {
                              const [key, dir] = e.target.value.split(':') as [
                                'pollDate' | 'ordinal',
                                'asc' | 'desc',
                              ]
                              setListSortKey(key)
                              setListSortDir(dir)
                            }}
                            aria-label="목록 정렬"
                          >
                            <option value="pollDate:desc">
                              최신 투표일 순
                            </option>
                            <option value="pollDate:asc">
                              오래된 투표일 순
                            </option>
                            <option value="ordinal:desc">회차 큰 순</option>
                            <option value="ordinal:asc">회차 작은 순</option>
                          </ElectionListFilterSelect>
                        </ElectionListFilterRow>
                      </>
                    ) : null}
                    <ElectionListFilterMeta>
                      전체 {list.length}건 · 표시 {sortedList.length}건
                      {listSearch || listTypeFilter || listStatusFilter ? (
                        <>
                          {' · '}
                          <button
                            type="button"
                            onClick={() => {
                              setListSearch('')
                              setListTypeFilter('')
                              setListStatusFilter('')
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              color: '#6366f1',
                              cursor: 'pointer',
                              font: 'inherit',
                              textDecoration: 'underline',
                            }}
                          >
                            필터 초기화
                          </button>
                        </>
                      ) : null}
                    </ElectionListFilterMeta>
                  </ElectionListFilterBar>
                ) : null}
                {listLoading ? (
                  <ElectionListScrollArea>
                    <EmptyHint>목록 불러오는 중…</EmptyHint>
                  </ElectionListScrollArea>
                ) : list.length === 0 ? (
                  <ElectionListColumnFill>
                    <EmptyStateFill>
                      <EmptyStateFeatureCard
                        flat
                        cardBorder={false}
                        icon={
                          <FiCalendar
                            size={28}
                            strokeWidth={1.75}
                            aria-hidden
                          />
                        }
                        title="등록된 선거가 없습니다"
                        description="새 선거를 등록하면 후보·투표 안·득표를 관리할 수 있습니다."
                        primaryAction={{
                          label: '새 선거',
                          onClick: () => setElectionModal({ mode: 'create' }),
                          icon: (
                            <FiPlus size={16} strokeWidth={2.25} aria-hidden />
                          ),
                        }}
                      />
                    </EmptyStateFill>
                  </ElectionListColumnFill>
                ) : sortedList.length === 0 ? (
                  <ElectionListScrollArea>
                    <EmptyHint>
                      조건에 맞는 선거가 없습니다. 필터를 초기화해 보세요.
                    </EmptyHint>
                  </ElectionListScrollArea>
                ) : (
                  <ElectionListScrollArea>
                    <ElectionListStack>
                      {sortedList.map((e) => {
                        const end = electionListEndLine(e)
                        return (
                          <ElectionNavButton
                            key={e.id}
                            type="button"
                            $active={selectedId === e.id}
                            onClick={() => setSelectedId(e.id)}
                          >
                            <ElectionNavTitle>
                              {electionPrimaryTitle(e)}
                            </ElectionNavTitle>
                            {end ? (
                              <ElectionNavEndLine>
                                {end.prefix} {end.dateStr}
                              </ElectionNavEndLine>
                            ) : null}
                            <ElectionNavMeta>
                              투표일 {formatPollDate(e.pollDate)}
                              {' · '}
                              {labelElectionType(e.electionType)}
                              {e.status
                                ? ` · ${labelElectionStatus(e.status)}`
                                : ''}
                            </ElectionNavMeta>
                          </ElectionNavButton>
                        )
                      })}
                    </ElectionListStack>
                  </ElectionListScrollArea>
                )}
              </ListColumn>

              <DetailColumn>
                {!selectedId ? (
                  <ElectionDetailEmptyCard>
                    <ElectionDetailEmptyTitle>
                      선거를 선택하세요
                    </ElectionDetailEmptyTitle>
                  </ElectionDetailEmptyCard>
                ) : detailLoading || !detailMatchesSelection ? (
                  <ElectionDetailEmptyCard>
                    <ElectionDetailEmptyTitle>
                      불러오는 중…
                    </ElectionDetailEmptyTitle>
                  </ElectionDetailEmptyCard>
                ) : (
                  <ElectionDetailSurface key={detail.id}>
                    <ElectionDetailPanel
                      key={detail.id}
                      detail={detail}
                      entityLinkCountryId={
                        countryId ?? detail.countryId ?? undefined
                      }
                      parties={parties}
                      sameTypeElections={list.filter(
                        (e) => e.electionType === detail.electionType,
                      )}
                      candidacyLabel={candidacyLabel}
                      onAddPartyResult={() =>
                        setPartyResultModal({
                          mode: 'create',
                          electionId: detail.id,
                        })
                      }
                      onEditPartyResult={(row) =>
                        setPartyResultModal({
                          mode: 'edit',
                          electionId: detail.id,
                          row,
                        })
                      }
                      onDeletePartyResult={(row) => {
                        const label =
                          row.party?.shortName ||
                          row.party?.name ||
                          '정당'
                        setConfirmDialog({
                          title: '정당 집계 삭제',
                          message: `「${label}」집계를 삭제할까요? 되돌릴 수 없습니다.`,
                          confirmLabel: '삭제',
                          danger: true,
                          onConfirm: () => {
                            partyResultDelMut.mutate({
                              electionId: detail.id,
                              partyId: row.partyId,
                            })
                            setConfirmDialog(null)
                          },
                        })
                      }}
                      onEditElection={() =>
                        setElectionModal({ mode: 'edit', election: detail })
                      }
                      onSaveElectionNarrative={async (patch) => {
                        if (
                          patch.description !== undefined &&
                          detail.eventId != null &&
                          String(detail.eventId).trim() !== ''
                        ) {
                          await saveElectionLinkedEventDescriptionMut.mutateAsync(
                            {
                              eventId: detail.eventId,
                              description: patch.description,
                            },
                          )
                          return
                        }
                        await saveElectionMut.mutateAsync({
                          mode: 'edit',
                          id: detail.id,
                          body: patch,
                        })
                      }}
                      savingNarrative={
                        saveElectionMut.isPending ||
                        saveElectionLinkedEventDescriptionMut.isPending
                      }
                      onDeleteElection={() => {
                        setConfirmDialog({
                          title: '선거 삭제',
                          message: `"${detail.name}" 선거를 삭제할까요? 후보·투표 안·득표 데이터가 모두 함께 삭제됩니다.`,
                          confirmLabel: '선거 삭제',
                          danger: true,
                          onConfirm: () => {
                            delElectionMut.mutate(detail.id)
                            setConfirmDialog(null)
                          },
                        })
                      }}
                      onAddCandidacy={() =>
                        setCandidacyModal({
                          mode: 'create',
                          electionId: detail.id,
                        })
                      }
                      onEditCandidacy={(row) =>
                        setCandidacyModal({
                          mode: 'edit',
                          electionId: detail.id,
                          row,
                        })
                      }
                      onDeleteCandidacy={(row) => {
                        setConfirmDialog({
                          title: '후보 삭제',
                          message: '이 후보 행과 관련 득표 데이터를 삭제할까요?',
                          confirmLabel: '삭제',
                          danger: true,
                          onConfirm: () => {
                            delCandidacyMut.mutate({
                              electionId: detail.id,
                              candidacyId: row.id,
                            })
                            setConfirmDialog(null)
                          },
                        })
                      }}
                      onEditResult={(row) =>
                        setResultModal({
                          electionId: detail.id,
                          candidacyId: row.id,
                          initial: row.result ?? undefined,
                        })
                      }
                      onAddBallotOption={(label, sortOrder) =>
                        ballotCreateMut.mutate({
                          electionId: detail.id,
                          label,
                          sortOrder,
                        })
                      }
                      onRenameBallotOption={async (optionId, label) => {
                        await ballotRenameMut.mutateAsync({
                          electionId: detail.id,
                          optionId,
                          label,
                        })
                      }}
                      onDeleteBallotOption={(opt) => {
                        setConfirmDialog({
                          title: '투표 안 삭제',
                          message: `「${opt.label}」안을 삭제할까요? 해당 안의 집계도 함께 사라집니다.`,
                          confirmLabel: '삭제',
                          danger: true,
                          onConfirm: () => {
                            ballotDelMut.mutate({
                              electionId: detail.id,
                              optionId: opt.id,
                            })
                            setConfirmDialog(null)
                          },
                        })
                      }}
                      onEditBallotResult={(opt) =>
                        setBallotResultModal({
                          electionId: detail.id,
                          option: opt,
                        })
                      }
                    />
                  </ElectionDetailSurface>
                )}
              </DetailColumn>
            </SplitMainRow>
          </ElectionsPoliticsTabSubsection>
        ) : null}

        {electionModal && (
          <ElectionFormModal
            key={
              electionModal.mode === 'edit'
                ? `election-${electionModal.election.id}`
                : 'election-new'
            }
            entityLinkCountryId={countryId ?? undefined}
            electionScope={electionScope}
            mode={electionModal.mode}
            initial={
              electionModal.mode === 'edit' ? electionModal.election : undefined
            }
            initialTab={
              electionModal.mode === 'edit'
                ? electionModal.initialTab
                : undefined
            }
            historicalCountryOptions={historicalCountryOptions}
            saving={saveElectionMut.isPending}
            onClose={() => setElectionModal(null)}
            onSubmit={(payload) => {
              if (payload.mode === 'create')
                saveElectionMut.mutate({ mode: 'create', body: payload.body })
              else
                saveElectionMut.mutate({
                  mode: 'edit',
                  id: payload.id,
                  body: payload.body,
                })
            }}
          />
        )}

        {candidacyModal && (
          <CandidacyFormModal
            key={
              candidacyModal.mode === 'create'
                ? `candidacy-new-${candidacyModal.electionId}`
                : `candidacy-${candidacyModal.row.id}`
            }
            persons={persons}
            parties={parties}
            districts={districts}
            mode={candidacyModal.mode}
            initial={
              candidacyModal.mode === 'edit' ? candidacyModal.row : undefined
            }
            electionId={candidacyModal.electionId}
            saving={saveCandidacyMut.isPending}
            onClose={() => setCandidacyModal(null)}
            onSubmit={(payload) => {
              if (payload.mode === 'create')
                saveCandidacyMut.mutate({
                  mode: 'create',
                  electionId: payload.electionId,
                  body: payload.body,
                })
              else
                saveCandidacyMut.mutate({
                  mode: 'edit',
                  electionId: payload.electionId,
                  candidacyId: payload.candidacyId,
                  body: payload.body,
                })
            }}
          />
        )}

        {resultModal && (
          <ResultFormModal
            key={`result-${resultModal.electionId}-${resultModal.candidacyId}`}
            saving={resultMut.isPending}
            initial={resultModal.initial}
            onClose={() => setResultModal(null)}
            onSubmit={(body) =>
              resultMut.mutate({
                electionId: resultModal.electionId,
                candidacyId: resultModal.candidacyId,
                body,
              })
            }
          />
        )}

        {ballotResultModal && (
          <BallotResultFormModal
            key={`ballot-result-${ballotResultModal.electionId}-${ballotResultModal.option.id}`}
            saving={ballotResultMut.isPending}
            option={ballotResultModal.option}
            onClose={() => setBallotResultModal(null)}
            onSubmit={(body) =>
              ballotResultMut.mutate({
                electionId: ballotResultModal.electionId,
                optionId: ballotResultModal.option.id,
                body,
              })
            }
          />
        )}

        {confirmDialog && (
          <ConfirmDialog
            title={confirmDialog.title}
            message={confirmDialog.message}
            confirmLabel={confirmDialog.confirmLabel ?? '확인'}
            danger={confirmDialog.danger}
            onCancel={() => setConfirmDialog(null)}
            onConfirm={confirmDialog.onConfirm}
          />
        )}

        {partyResultModal && (
          <PartyResultFormModal
            key={
              partyResultModal.mode === 'create'
                ? `party-result-new-${partyResultModal.electionId}`
                : `party-result-${partyResultModal.electionId}-${partyResultModal.row.partyId}`
            }
            mode={partyResultModal.mode}
            parties={parties}
            existingPartyIds={
              detail?.partyResults?.map((row) => row.partyId) ?? []
            }
            existingResults={detail?.partyResults ?? []}
            electionTotalSeats={detail?.totalSeats ?? null}
            initialRow={
              partyResultModal.mode === 'edit'
                ? partyResultModal.row
                : undefined
            }
            saving={partyResultMut.isPending}
            onClose={() => setPartyResultModal(null)}
            onSubmit={(partyId, body) =>
              partyResultMut.mutate({
                electionId: partyResultModal.electionId,
                partyId,
                body,
              })
            }
          />
        )}
      </ElectionsPoliticsTabPanel>
    </CountryElectionsSectionRoot>
  )
}

function ElectionDetailPanel({
  detail,
  /** 서버 엔티티 검색 한정(정당 등) — 현대 국가 id */
  entityLinkCountryId,
  parties,
  sameTypeElections,
  candidacyLabel,
  onAddPartyResult,
  onEditPartyResult,
  onDeletePartyResult,
  onEditElection,
  onSaveElectionNarrative,
  savingNarrative,
  onDeleteElection,
  onAddCandidacy,
  onEditCandidacy,
  onDeleteCandidacy,
  onEditResult,
  onAddBallotOption,
  onRenameBallotOption,
  onDeleteBallotOption,
  onEditBallotResult,
}: {
  detail: ElectionDetailDto
  entityLinkCountryId?: string
  parties: PoliticalPartyRow[]
  sameTypeElections: ElectionListRow[]
  candidacyLabel: (c: ElectionCandidacyDto) => string
  onAddPartyResult: () => void
  onEditPartyResult: (row: ElectionPartyResultDto) => void
  onDeletePartyResult: (row: ElectionPartyResultDto) => void
  onEditElection: () => void
  onSaveElectionNarrative: (patch: {
    resultingLegislatureDissolutionNotes?: string | null
    description?: string | null
  }) => Promise<void>
  savingNarrative: boolean
  onDeleteElection: () => void
  onAddCandidacy: () => void
  onEditCandidacy: (row: ElectionCandidacyDto) => void
  onDeleteCandidacy: (row: ElectionCandidacyDto) => void
  onEditResult: (row: ElectionCandidacyDto) => void
  onAddBallotOption: (label: string, sortOrder: number) => void
  onRenameBallotOption: (optionId: string, label: string) => Promise<void>
  onDeleteBallotOption: (opt: ElectionBallotOptionDto) => void
  onEditBallotResult: (opt: ElectionBallotOptionDto) => void
}) {
  const navigate = useNavigate()

  /** 본문 엔티티(인물) 클릭 — `RichTextProseWithEntityClicks` → 인물 상세 모달 */
  const [mentionPersonId, setMentionPersonId] = useState<string | null>(null)
  const { data: mentionPerson } = useQuery({
    queryKey: ['person-detail', mentionPersonId],
    queryFn: () => getPersonDetailById(mentionPersonId!),
    enabled: !!mentionPersonId,
  })
  const mentionPersonName = mentionPerson
    ? getPersonDisplayName(mentionPerson)
    : ''

  /** 본문 정당 엔티티 클릭 — 정당 미리보기 모달 */
  const [electionMentionPartyId, setElectionMentionPartyId] = useState<
    string | null
  >(null)
  const { data: electionMentionParty, isLoading: electionMentionPartyLoading } =
    useQuery({
      queryKey: [
        'political-parties',
        'election-prose-mention',
        electionMentionPartyId,
      ],
      queryFn: () => politicalPartyApi.getById(electionMentionPartyId!),
      enabled: !!electionMentionPartyId,
    })

  const handleElectionProsePartyClick = useCallback(
    (args: { partyId: string }) => {
      setElectionMentionPartyId(args.partyId)
    },
    [],
  )

  useEffect(() => {
    if (!electionMentionPartyId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setElectionMentionPartyId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [electionMentionPartyId])

  const partyFullTabCountryId =
    electionMentionParty?.countryId ?? entityLinkCountryId ?? null

  const [electionProseTermTooltip, setElectionProseTermTooltip] =
    useState<RichTextTermTooltipState | null>(null)
  const [electionProseDynastyTooltip, setElectionProseDynastyTooltip] =
    useState<RichTextDynastyTooltipState | null>(null)

  useRichTextTooltipEscape(
    !!electionProseTermTooltip,
    !!electionProseDynastyTooltip,
    () => setElectionProseTermTooltip(null),
    () => setElectionProseDynastyTooltip(null),
  )

  const isReferendum = detail.electionType === 'REFERENDUM_OR_PLEBISCITE'
  const [ballotLabel, setBallotLabel] = useState('')
  const [editingBallotId, setEditingBallotId] = useState<string | null>(null)
  const [editingBallotLabel, setEditingBallotLabel] = useState('')
  /** 정당 분포 그래프: 득표율 비중 vs 의석 비중 (도넛·시계열 공통) */
  const [partyDistributionMetric, setPartyDistributionMetric] = useState<
    'voteShare' | 'seats'
  >('voteShare')
  /** 도넛 범례 — 상위 10개만 기본 표시 */
  const [legendExpanded, setLegendExpanded] = useState(false)
  const [chartHoverTip, setChartHoverTip] = useState<{
    text: string
    x: number
    y: number
  } | null>(null)

  /** 반원 도넛 — 호버 중인 정당 조각(해당 구간만 확대) */
  const [hoveredDonutSliceRowId, setHoveredDonutSliceRowId] = useState<
    string | null
  >(null)

  /** 정당 집계 테이블 정렬 — 기본: 득표율 내림차순 */
  const [partyResultSort, setPartyResultSort] = useState<{
    key: PartyResultSortKey
    dir: 'asc' | 'desc'
  }>({ key: 'voteShare', dir: 'desc' })

  const showChartTip = useCallback((text: string, e: React.MouseEvent) => {
    setChartHoverTip({
      text,
      x: e.clientX + 12,
      y: e.clientY + 14,
    })
  }, [])

  const moveChartTip = useCallback((e: React.MouseEvent) => {
    setChartHoverTip((prev) =>
      prev ? { ...prev, x: e.clientX + 12, y: e.clientY + 14 } : null,
    )
  }, [])

  const hideChartTip = useCallback(() => setChartHoverTip(null), [])

  useEffect(
    () => () => {
      setChartHoverTip(null)
    },
    [],
  )

  useEffect(() => {
    const clear = () => setChartHoverTip(null)
    window.addEventListener('scroll', clear, true)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('scroll', clear, true)
      window.removeEventListener('blur', clear)
    }
  }, [])

  /** FM: `election.description` 비운 뒤에도 연결된 Event 본문을 설명으로 표시 */
  const effectiveElectionDescription = useMemo(
    () => detail.event?.description ?? detail.description ?? '',
    [detail.event?.description, detail.description],
  )

  const [narrativeEdit, setNarrativeEdit] = useState<
    null | 'legislature' | 'stats'
  >(null)
  const [legislatureDraft, setLegislatureDraft] = useState('')
  const [descriptionDraft, setDescriptionDraft] = useState('')

  useEffect(() => {
    setNarrativeEdit(null)
    setLegislatureDraft(detail.resultingLegislatureDissolutionNotes ?? '')
    setDescriptionDraft(effectiveElectionDescription)
  }, [detail.id, effectiveElectionDescription])

  useEffect(() => {
    if (narrativeEdit == null) {
      setLegislatureDraft(detail.resultingLegislatureDissolutionNotes ?? '')
      setDescriptionDraft(effectiveElectionDescription)
    }
  }, [
    detail.resultingLegislatureDissolutionNotes,
    effectiveElectionDescription,
    narrativeEdit,
  ])

  const handleSaveLegislatureNarrative = useCallback(async () => {
    await onSaveElectionNarrative({
      resultingLegislatureDissolutionNotes:
        optionalRichTextHtmlOrNull(legislatureDraft),
    })
    setNarrativeEdit(null)
  }, [legislatureDraft, onSaveElectionNarrative])

  const handleSaveDescriptionNarrative = useCallback(async () => {
    await onSaveElectionNarrative({
      description: optionalRichTextHtmlOrNull(descriptionDraft),
    })
    setNarrativeEdit(null)
  }, [descriptionDraft, onSaveElectionNarrative])

  /** 모달·API의「이번 의회 실제 종료 유형」과 동일 — 설정된 경우에만 종료 서술 블록 표시 */
  const showLegislatureDissolutionNarrative = useMemo(() => {
    const k = detail.resultingLegislatureClosureKind
    return k != null && String(k).trim() !== ''
  }, [detail.resultingLegislatureClosureKind])

  useEffect(() => {
    if (
      !showLegislatureDissolutionNarrative &&
      narrativeEdit === 'legislature'
    ) {
      setNarrativeEdit(null)
    }
  }, [showLegislatureDissolutionNarrative, narrativeEdit])

  const sortedBallotOptions = useMemo(
    () =>
      [...(detail.ballotOptions ?? [])].sort(
        (a, b) => a.sortOrder - b.sortOrder,
      ),
    [detail.ballotOptions],
  )

  const partyResults = detail.partyResults ?? []
  const hasPartyComparison = Boolean(
    detail.partyResultComparisonVsPrevious?.previousElection,
  )
  const partyCmpByPartyId = useMemo(() => {
    const rows = detail.partyResultComparisonVsPrevious?.rows
    if (!rows?.length) return new Map<string, PartyResultComparisonRowDto>()
    return new Map(rows.map((r) => [r.partyId, r]))
  }, [detail.partyResultComparisonVsPrevious?.rows])

  /** 정당 집계 합계·잔여(기타) */
  const partyResultsSummary = useMemo(
    () => computePartyResultsSummary(partyResults, detail.totalSeats),
    [partyResults, detail.totalSeats],
  )

  /** 잔여 의석·잔여 득표율 → 가상 "기타" 행 (도넛·표 하단에 렌더) */
  const otherSyntheticRow = useMemo<ElectionPartyResultDto | null>(() => {
    const { otherSeats, otherVoteShare } = partyResultsSummary
    if (otherSeats == null && otherVoteShare == null) return null
    return {
      id: '__other__',
      electionId: detail.id,
      partyId: '__other__',
      votes: null,
      voteSharePercent:
        otherVoteShare != null ? String(otherVoteShare) : null,
      seatsWon: otherSeats ?? null,
      notes: null,
      party: {
        id: '__other__',
        name: '기타 (주요 정당 외)',
        shortName: '기타',
        brandColor: null,
      },
    }
  }, [
    detail.id,
    partyResultsSummary.otherSeats,
    partyResultsSummary.otherVoteShare,
  ])

  /** 시계열 비교: 같은 유형·범위 선거 최근 8회 (현재 포함) */
  const timelineElectionIds = useMemo(() => {
    if (!sameTypeElections || sameTypeElections.length < 2) return []
    const ordered = [...sameTypeElections]
      .sort(
        (a, b) =>
          new Date(a.pollDate).getTime() - new Date(b.pollDate).getTime(),
      )
      .slice(-8)
    return ordered.map((e) => e.id)
  }, [sameTypeElections])

  const timelineDetailQueries = useQueries({
    queries: timelineElectionIds.map((id) => ({
      queryKey: ['elections', 'detail', id] as const,
      queryFn: () => getElection(id),
      staleTime: 60_000,
    })),
  })

  const timelineRows = useMemo(() => {
    const loaded = timelineDetailQueries
      .map((q) => q.data)
      .filter((d): d is ElectionDetailDto => Boolean(d))
    if (loaded.length < 2) return []
    return loaded
      .slice()
      .sort(
        (a, b) =>
          new Date(a.pollDate).getTime() - new Date(b.pollDate).getTime(),
      )
  }, [timelineDetailQueries])

  /** 타임라인에 등장하는 정당별 색상 — 브랜드색 우선 */
  const timelineLegend = useMemo(() => {
    if (timelineRows.length === 0) return [] as Array<{
      partyId: string
      name: string
      fill: string
      totalSeats: number
    }>
    const agg = new Map<
      string,
      { name: string; fill: string; totalSeats: number }
    >()
    for (const el of timelineRows) {
      for (const r of el.partyResults ?? []) {
        if (!r.partyId) continue
        const seats = r.seatsWon ?? 0
        const existing = agg.get(r.partyId)
        if (existing) {
          existing.totalSeats += seats
        } else {
          const name = r.party?.shortName || r.party?.name || r.partyId
          const registryColor = parties.find(
            (p) => p.id === r.partyId,
          )?.brandColor
          const fill = partyResultSliceFill(
            r,
            hueFromPartyId(r.partyId),
            registryColor,
          )
          agg.set(r.partyId, { name, fill, totalSeats: seats })
        }
      }
    }
    return Array.from(agg.entries())
      .map(([partyId, v]) => ({ partyId, ...v }))
      .sort((a, b) => b.totalSeats - a.totalSeats)
  }, [timelineRows, parties])

  /** 각 선거별 정당 의석 비중 바 — 내림차순 정렬 + 잔여 기타 */
  const timelineBars = useMemo(() => {
    if (timelineRows.length === 0) return []
    const legendById = new Map(timelineLegend.map((l) => [l.partyId, l]))
    return timelineRows.map((el) => {
      const rawRows = el.partyResults ?? []
      const weightOf = (row: ElectionPartyResultDto) => {
        if (partyDistributionMetric === 'seats') return row.seatsWon ?? 0
        const vs = Number(row.voteSharePercent)
        return Number.isFinite(vs) && vs >= 0 ? vs : 0
      }
      const rows = [...rawRows].sort(
        (rowA, rowB) => weightOf(rowB) - weightOf(rowA),
      )
      const knownSum = rows.reduce((acc, row) => acc + weightOf(row), 0)
      const total =
        partyDistributionMetric === 'seats'
          ? el.totalSeats != null && el.totalSeats > 0
            ? el.totalSeats
            : knownSum
          : 100
      if (total <= 0 || knownSum <= 0) {
        return {
          id: el.id,
          name: el.name,
          shortName: el.shortName,
          convocationOrdinal: el.convocationOrdinal,
          pollDate: el.pollDate,
          total: 0,
          knownSum: 0,
          segments: [] as Array<{
            partyId: string
            name: string
            fill: string
            value: number
          }>,
          otherValue: 0,
        }
      }
      const segments = rows
        .filter((row) => weightOf(row) > 0)
        .map((row) => ({
          partyId: row.partyId,
          name:
            legendById.get(row.partyId)?.name ||
            row.party?.shortName ||
            row.party?.name ||
            row.partyId,
          fill:
            legendById.get(row.partyId)?.fill ??
            partyResultSliceFill(row, hueFromPartyId(row.partyId), null),
          value: weightOf(row),
        }))
      const otherValue = total - knownSum > 0.05 ? total - knownSum : 0
      return {
        id: el.id,
        name: el.name,
        shortName: el.shortName,
        convocationOrdinal: el.convocationOrdinal,
        pollDate: el.pollDate,
        total,
        knownSum,
        segments,
        otherValue,
      }
    })
  }, [timelineRows, timelineLegend, partyDistributionMetric])

  useEffect(() => {
    if (!hasPartyComparison) {
      setPartyResultSort((prev) =>
        prev.key === 'deltaVote' || prev.key === 'deltaSeats'
          ? { key: 'voteShare', dir: 'desc' }
          : prev,
      )
    }
  }, [hasPartyComparison])

  const togglePartyResultSort = useCallback((key: PartyResultSortKey) => {
    setPartyResultSort((prev) => {
      if (prev.key === key) {
        return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      }
      return { key, dir: defaultPartyResultSortDir(key) }
    })
  }, [])

  const sortedPartyTableRows = useMemo(() => {
    const rows = [...partyResults]
    const { key, dir } = partyResultSort
    const mult = dir === 'asc' ? 1 : -1

    const voteShareNum = (r: ElectionPartyResultDto) => {
      const n = Number(r.voteSharePercent)
      return Number.isFinite(n) ? n : -Infinity
    }

    const seatsN = (r: ElectionPartyResultDto) => {
      const s = r.seatsWon
      if (s == null || !Number.isFinite(s)) return -Infinity
      return s
    }

    const deltaVoteN = (r: ElectionPartyResultDto) => {
      const v = partyCmpByPartyId.get(r.partyId)?.voteShareDeltaPpt
      return v != null && Number.isFinite(v) ? v : -Infinity
    }

    const deltaSeatN = (r: ElectionPartyResultDto) => {
      const v = partyCmpByPartyId.get(r.partyId)?.seatsDelta
      return v != null && Number.isFinite(v) ? v : -Infinity
    }

    rows.sort((a, b) => {
      switch (key) {
        case 'party': {
          const na = a.party?.shortName || a.party?.name || a.partyId
          const nb = b.party?.shortName || b.party?.name || b.partyId
          return na.localeCompare(nb, 'ko') * mult
        }
        case 'votes':
          return (
            compareBigint(
              parseVotesBigIntForSort(a.votes),
              parseVotesBigIntForSort(b.votes),
            ) * mult
          )
        case 'voteShare':
          return (voteShareNum(a) - voteShareNum(b)) * mult
        case 'deltaVote':
          return (deltaVoteN(a) - deltaVoteN(b)) * mult
        case 'seats':
          return (seatsN(a) - seatsN(b)) * mult
        case 'deltaSeats':
          return (deltaSeatN(a) - deltaSeatN(b)) * mult
        default:
          return 0
      }
    })
    return rows
  }, [partyResults, partyResultSort, partyCmpByPartyId])

  const theme = useTheme()

  const partyShareChart = useMemo(() => {
    const rows = [...partyResults]
    const sorted = [...rows].sort((left, right) => {
      if (partyDistributionMetric === 'seats') {
        const seatLeft = left.seatsWon ?? 0
        const seatRight = right.seatsWon ?? 0
        if (seatLeft !== seatRight) return seatRight - seatLeft
      }
      const voteLeft = Number(left.voteSharePercent)
      const voteRight = Number(right.voteSharePercent)
      if (Number.isFinite(voteLeft) && Number.isFinite(voteRight))
        return voteRight - voteLeft
      return 0
    })
    /** 잔여 "기타"는 항상 마지막 조각으로 고정 */
    const withOther = otherSyntheticRow
      ? [...sorted, otherSyntheticRow]
      : sorted
    return { sorted: withOther }
  }, [partyResults, partyDistributionMetric, otherSyntheticRow])

  const partyPieSlices = useMemo(() => {
    const sorted = partyShareChart.sorted
    if (sorted.length === 0) {
      return {
        gradient: 'transparent' as const,
        segments: [] as Array<{
          row: ElectionPartyResultDto
          startDeg: number
          endDeg: number
          hue: number
          fill: string
          fraction: number
        }>,
        ariaLabel: '',
      }
    }
    const weights = sorted.map((row) => {
      if (partyDistributionMetric === 'seats') {
        const seats = row.seatsWon
        if (seats != null && Number.isFinite(seats) && seats > 0) return seats
        return 0
      }
      const voteShare = Number(row.voteSharePercent)
      if (Number.isFinite(voteShare) && voteShare >= 0) return voteShare
      try {
        const voteStr = row.votes != null ? String(row.votes).trim() : ''
        if (voteStr && /^\d+$/.test(voteStr)) return Number(BigInt(voteStr))
      } catch {
        /* */
      }
      return 0
    })
    const weightSum = weights.reduce((acc, weight) => acc + weight, 0)
    const partyCount = sorted.length
    const fractions =
      weightSum > 0
        ? weights.map((weight) => weight / weightSum)
        : partyCount > 0
          ? Array(partyCount).fill(1 / partyCount)
          : []

    let acc = 0
    const otherFill =
      theme.mode === 'dark' ? 'rgba(148,163,184,0.55)' : '#cbd5e1'
    const segments = sorted.map((row, index) => {
      const frac = fractions[index] ?? 0
      const startDeg = acc * 360
      acc += frac
      const endDeg = index === sorted.length - 1 ? 360 : acc * 360
      const isOther = row.partyId === '__other__'
      const hue = isOther ? 220 : hueFromPartyId(row.partyId)
      const registryColor = parties.find(
        (party) => party.id === row.partyId,
      )?.brandColor
      return {
        row,
        startDeg,
        endDeg,
        hue,
        fill: isOther ? otherFill : partyResultSliceFill(row, hue, registryColor),
        fraction: frac,
      }
    })

    /** 전원(0–360°) conic-gradient — 12시에서 시계방향 */
    const gradient =
      segments.length > 0
        ? `conic-gradient(from 0deg, ${segments
            .map(
              (segment) =>
                `${segment.fill} ${segment.startDeg}deg ${segment.endDeg}deg`,
            )
            .join(', ')})`
        : 'transparent'

    const ariaLabel = segments
      .map((segment) => {
        const name =
          segment.row.party?.shortName || segment.row.party?.name || '정당'
        if (partyDistributionMetric === 'seats') {
          const seats = segment.row.seatsWon
          const seatLabel =
            seats != null && seats >= 0 ? `${seats}석` : '의석 없음'
          return `${name} ${seatLabel} (${(segment.fraction * 100).toFixed(1)}%)`
        }
        const pct = formatVoteShareLabel(segment.row.voteSharePercent)
        if (pct) return `${name} ${pct}`
        return `${name} ${(segment.fraction * 100).toFixed(1)}%`
      })
      .join(', ')

    return { gradient, segments, ariaLabel }
  }, [
    partyShareChart.sorted,
    parties,
    theme.mode,
    partyDistributionMetric,
  ])

  const referendumBallotBars = useMemo(() => {
    if (!isReferendum) return []
    const opts = sortedBallotOptions
    if (opts.length === 0) return []

    let sumVotes = 0
    for (const o of opts) {
      const v = o.result?.votes
      if (v == null || String(v).trim() === '') continue
      const s = String(v).trim()
      if (/^\d+$/.test(s)) sumVotes += Number(s)
    }

    return opts.map((opt) => {
      const pctNum = Number(opt.result?.voteSharePercent)
      let widthPct = 0
      if (Number.isFinite(pctNum) && pctNum >= 0) {
        widthPct = Math.min(100, pctNum)
      } else if (sumVotes > 0) {
        const vs = opt.result?.votes
        if (vs != null && String(vs).trim() !== '') {
          const s = String(vs).trim()
          if (/^\d+$/.test(s)) widthPct = (Number(s) / sumVotes) * 100
        }
      } else {
        widthPct = opts.length > 0 ? 100 / opts.length : 0
      }

      const pctLabel = formatVoteShareLabel(opt.result?.voteSharePercent)
      const votesDispFmt = formatVotesForDisplay(opt.result?.votes)
      const valueLabel =
        pctLabel ?? (votesDispFmt !== '—' ? `${votesDispFmt}표` : '—')
      const hoverTitle = [
        opt.label,
        pctLabel ? `득표율 ${pctLabel}` : null,
        votesDispFmt !== '—' ? `득표 ${votesDispFmt}` : null,
        `막대 기준 비중 약 ${Number.isFinite(widthPct) ? widthPct.toFixed(1) : '0.0'}%`,
      ]
        .filter(Boolean)
        .join(' · ')

      return {
        id: opt.id,
        label: opt.label,
        widthPct,
        fill: `hsl(${hueFromPartyId(opt.id)} 62% 52%)`,
        valueLabel,
        hoverTitle,
      }
    })
  }, [isReferendum, sortedBallotOptions])

  return (
    <>
      <ElectionDetailPanelStack>
        <SectionHeaderRow>
          <ElectionDetailHeaderMain>
            <DetailTitle>{electionPrimaryTitle(detail)}</DetailTitle>
            {electionScopeCountryLabel(detail) ? (
              <ElectionDetailCountryMeta>
                국가 · {electionScopeCountryLabel(detail)}
              </ElectionDetailCountryMeta>
            ) : null}
            {detail.eventId ? (
              <ElectionDetailCountryMeta>
                연결 사건 ·{' '}
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      pathKeys.history.dashboardEventDetail(detail.eventId!),
                    )
                  }
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    margin: 0,
                    cursor: 'pointer',
                    color: theme.colors.primary,
                    textDecoration: 'underline',
                    font: 'inherit',
                  }}
                >
                  {detail.event?.title?.trim() || detail.eventId}
                </button>
              </ElectionDetailCountryMeta>
            ) : null}
            <ElectionDetailSummaryPanel>
              <ElectionDetailBadgeRow>
                <ElectionDetailTypeBadge>
                  {labelElectionType(detail.electionType)}
                </ElectionDetailTypeBadge>
                <ElectionDetailStatusBadge>
                  {labelElectionStatus(detail.status)}
                </ElectionDetailStatusBadge>
              </ElectionDetailBadgeRow>
              <ElectionDetailStatsScrollWrap>
                <ElectionDetailStatsGrid>
                  <ElectionDetailStatCard>
                    <ElectionDetailStatLabel>투표일</ElectionDetailStatLabel>
                    <ElectionDetailStatValue>
                      {formatPollDate(detail.pollDate)}
                    </ElectionDetailStatValue>
                  </ElectionDetailStatCard>
                  {detail.pollEndDate != null &&
                  String(detail.pollEndDate).trim() !== '' ? (
                    <ElectionDetailStatCard>
                      <ElectionDetailStatLabel>
                        투표 종료
                      </ElectionDetailStatLabel>
                      <ElectionDetailStatValue>
                        {formatPollDate(detail.pollEndDate)}
                      </ElectionDetailStatValue>
                    </ElectionDetailStatCard>
                  ) : null}
                  {detail.convocationOrdinal != null ? (
                    <ElectionDetailStatCard>
                      <ElectionDetailStatLabel>회차</ElectionDetailStatLabel>
                      <ElectionDetailStatValue>
                        {detail.convocationOrdinal}차
                      </ElectionDetailStatValue>
                    </ElectionDetailStatCard>
                  ) : null}
                  {detail.legislatureTermStart || detail.legislatureTermEnd ? (
                    <ElectionDetailStatCard>
                      <ElectionDetailStatLabel>
                        의회 임기
                      </ElectionDetailStatLabel>
                      <ElectionDetailStatValue>
                        {detail.legislatureTermStart
                          ? formatPollDate(detail.legislatureTermStart)
                          : '—'}
                        {' — '}
                        {detail.legislatureTermEnd
                          ? formatPollDate(detail.legislatureTermEnd)
                          : '—'}
                      </ElectionDetailStatValue>
                    </ElectionDetailStatCard>
                  ) : null}
                  {detail.voterTurnoutPercent != null &&
                  String(detail.voterTurnoutPercent).trim() !== '' ? (
                    <ElectionDetailStatCard>
                      <ElectionDetailStatLabel>투표율</ElectionDetailStatLabel>
                      <ElectionDetailStatValue>
                        {detail.voterTurnoutPercent}%
                      </ElectionDetailStatValue>
                    </ElectionDetailStatCard>
                  ) : null}
                  {detail.totalSeats != null ? (
                    <ElectionDetailStatCard>
                      <ElectionDetailStatLabel>총 의석</ElectionDetailStatLabel>
                      <ElectionDetailStatValue>
                        {detail.totalSeats}석
                      </ElectionDetailStatValue>
                    </ElectionDetailStatCard>
                  ) : null}
                  {detail.resultingLegislatureClosureKind ||
                  (detail.resultingLegislatureClosureDate != null &&
                    String(detail.resultingLegislatureClosureDate).trim() !==
                      '') ? (
                    <ElectionDetailStatCard>
                      <ElectionDetailStatLabel>
                        의회 실제 종료
                      </ElectionDetailStatLabel>
                      <ElectionDetailStatValue>
                        {[
                          detail.resultingLegislatureClosureKind
                            ? labelLegislatureClosureKind(
                                detail.resultingLegislatureClosureKind,
                              )
                            : null,
                          detail.resultingLegislatureClosureDate != null &&
                          String(
                            detail.resultingLegislatureClosureDate,
                          ).trim() !== ''
                            ? formatPollDate(
                                detail.resultingLegislatureClosureDate,
                              )
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </ElectionDetailStatValue>
                    </ElectionDetailStatCard>
                  ) : null}
                </ElectionDetailStatsGrid>
              </ElectionDetailStatsScrollWrap>
            </ElectionDetailSummaryPanel>
          </ElectionDetailHeaderMain>
          <DetailToolbar>
            <DetailHeaderIconBtn
              type="button"
              onClick={onEditElection}
              aria-label="선거 수정"
              title="선거 수정"
            >
              <FiEdit2 size={17} strokeWidth={2} />
            </DetailHeaderIconBtn>
            <DetailHeaderIconBtn
              type="button"
              $variant="danger"
              onClick={onDeleteElection}
              aria-label="선거 삭제"
              title="선거 삭제"
            >
              <FiTrash2 size={17} strokeWidth={2} />
            </DetailHeaderIconBtn>
          </DetailToolbar>
        </SectionHeaderRow>

        <div>
          <SectionHeaderRowSubsection>
            <SubsectionLabel>정당별 집계 (전국·비례 등)</SubsectionLabel>
            <SubsectionAddBtn type="button" onClick={onAddPartyResult}>
              <FiPlus size={14} strokeWidth={2.25} />
              집계 추가
            </SubsectionAddBtn>
          </SectionHeaderRowSubsection>
          {partyResults.length > 0 ? (
            <PartyShareInfographic>
              <PartyMetricToolbarRow>
                <PartyMetricTitleTight>
                  {partyDistributionMetric === 'seats'
                    ? '의석 분포'
                    : '득표율 분포'}
                </PartyMetricTitleTight>
                <PartyMetricSegmentedGroup
                  role="group"
                  aria-label="분포 그래프 기준"
                >
                  <PartyMetricSegmentBtn
                    type="button"
                    aria-pressed={partyDistributionMetric === 'voteShare'}
                    $active={partyDistributionMetric === 'voteShare'}
                    onClick={() => setPartyDistributionMetric('voteShare')}
                  >
                    득표율
                  </PartyMetricSegmentBtn>
                  <PartyMetricSegmentBtn
                    type="button"
                    aria-pressed={partyDistributionMetric === 'seats'}
                    $active={partyDistributionMetric === 'seats'}
                    onClick={() => setPartyDistributionMetric('seats')}
                  >
                    의석
                  </PartyMetricSegmentBtn>
                </PartyMetricSegmentedGroup>
              </PartyMetricToolbarRow>
              <PartyShareDonutLayout>
                <FullCircleDonutClip>
                  <FullCircleDonutInner>
                    {partyPieSlices.segments.length > 0 ? (
                      <PartyShareDonutSliceSvg
                        viewBox="0 0 100 100"
                        role="img"
                        aria-label={
                          partyPieSlices.ariaLabel
                            ? partyDistributionMetric === 'seats'
                              ? `의석 비중: ${partyPieSlices.ariaLabel}`
                              : `득표 비율: ${partyPieSlices.ariaLabel}`
                            : partyDistributionMetric === 'seats'
                              ? '의석 분포'
                              : '득표 분포'
                        }
                        onMouseLeave={() => {
                          setHoveredDonutSliceRowId(null)
                          hideChartTip()
                        }}
                      >
                        {partyPieSlices.segments.map((s) => {
                          const d = partyCircleSectorPathD(
                            50,
                            50,
                            48,
                            28,
                            s.startDeg,
                            s.endDeg,
                          )
                          if (!d) return null
                          const tip = formatPartyDonutSliceHoverTitle(
                            s,
                            partyDistributionMetric,
                          )
                          return (
                            <PartyShareDonutSectorGroup
                              key={s.row.id}
                              $emphasize={hoveredDonutSliceRowId === s.row.id}
                            >
                              <PartyShareDonutSectorPath
                                $fill={s.fill}
                                d={d}
                                tabIndex={0}
                                role="img"
                                aria-label={tip}
                                onMouseEnter={(e) => {
                                  setHoveredDonutSliceRowId(s.row.id)
                                  showChartTip(tip, e)
                                }}
                                onMouseMove={moveChartTip}
                                onFocus={() =>
                                  setHoveredDonutSliceRowId(s.row.id)
                                }
                                onBlur={() => setHoveredDonutSliceRowId(null)}
                              >
                                <title>{tip}</title>
                              </PartyShareDonutSectorPath>
                            </PartyShareDonutSectorGroup>
                          )
                        })}
                      </PartyShareDonutSliceSvg>
                    ) : (
                      <PartyShareDonutRing
                        $gradient={partyPieSlices.gradient}
                        role="img"
                        aria-label={
                          partyPieSlices.ariaLabel
                            ? partyDistributionMetric === 'seats'
                              ? `의석 비중: ${partyPieSlices.ariaLabel}`
                              : `득표 비율: ${partyPieSlices.ariaLabel}`
                            : partyDistributionMetric === 'seats'
                              ? '의석 분포'
                              : '득표 분포'
                        }
                      />
                    )}
                    <PartyShareDonutHole aria-hidden />
                  </FullCircleDonutInner>
                </FullCircleDonutClip>
                <PartyShareLegend
                  onMouseLeave={() => setHoveredDonutSliceRowId(null)}
                >
                  {(() => {
                    const LEGEND_VISIBLE_LIMIT = 10
                    const visible = legendExpanded
                      ? partyPieSlices.segments
                      : partyPieSlices.segments.slice(0, LEGEND_VISIBLE_LIMIT)
                    const hiddenCount =
                      partyPieSlices.segments.length - visible.length
                    return (
                      <>
                        {visible.map((s) => {
                          const label =
                            s.row.party?.shortName ||
                            s.row.party?.name ||
                            s.row.partyId
                          const metricLine =
                            partyDistributionMetric === 'seats'
                              ? s.row.seatsWon != null && s.row.seatsWon >= 0
                                ? `${s.row.seatsWon}석 · ${(
                                    s.fraction * 100
                                  ).toFixed(1)}%`
                                : `${(s.fraction * 100).toFixed(1)}%`
                              : (formatVoteShareLabel(
                                  s.row.voteSharePercent,
                                ) ??
                                `${(s.fraction * 100).toFixed(1)}%`)
                          return (
                            <PartyShareLegendItem
                              key={s.row.id}
                              onMouseEnter={() =>
                                setHoveredDonutSliceRowId(s.row.id)
                              }
                            >
                              <PartyShareSwatch $fill={s.fill} aria-hidden />
                              <PartyShareLegendBody>
                                <PartyShareName>{label}</PartyShareName>
                                <PartyShareStats>{metricLine}</PartyShareStats>
                              </PartyShareLegendBody>
                            </PartyShareLegendItem>
                          )
                        })}
                        {hiddenCount > 0 ? (
                          <LegendExpandBtn
                            type="button"
                            onClick={() => setLegendExpanded(true)}
                          >
                            외 {hiddenCount}개 더 보기
                          </LegendExpandBtn>
                        ) : null}
                        {legendExpanded &&
                        partyPieSlices.segments.length >
                          LEGEND_VISIBLE_LIMIT ? (
                          <LegendExpandBtn
                            type="button"
                            onClick={() => setLegendExpanded(false)}
                          >
                            접기
                          </LegendExpandBtn>
                        ) : null}
                      </>
                    )
                  })()}
                </PartyShareLegend>
              </PartyShareDonutLayout>
            </PartyShareInfographic>
          ) : null}
          <DataTableCard>
            <DataTable>
              <thead>
                <tr>
                  <DataTh>
                    <DataThSortButton
                      type="button"
                      $active={partyResultSort.key === 'party'}
                      onClick={() => togglePartyResultSort('party')}
                    >
                      정당
                      <PartySortGlyph
                        columnKey="party"
                        activeKey={partyResultSort.key}
                        dir={partyResultSort.dir}
                      />
                    </DataThSortButton>
                  </DataTh>
                  <DataTh>
                    <DataThSortButton
                      type="button"
                      $active={partyResultSort.key === 'votes'}
                      onClick={() => togglePartyResultSort('votes')}
                    >
                      득표
                      <PartySortGlyph
                        columnKey="votes"
                        activeKey={partyResultSort.key}
                        dir={partyResultSort.dir}
                      />
                    </DataThSortButton>
                  </DataTh>
                  <DataTh>
                    <DataThSortButton
                      type="button"
                      $active={partyResultSort.key === 'voteShare'}
                      onClick={() => togglePartyResultSort('voteShare')}
                    >
                      득표율
                      <PartySortGlyph
                        columnKey="voteShare"
                        activeKey={partyResultSort.key}
                        dir={partyResultSort.dir}
                      />
                    </DataThSortButton>
                  </DataTh>
                  {hasPartyComparison ? (
                    <DataTh>
                      <DataThSortButton
                        type="button"
                        $active={partyResultSort.key === 'deltaVote'}
                        onClick={() => togglePartyResultSort('deltaVote')}
                      >
                        전회차 대비 (득표율)
                        <PartySortGlyph
                          columnKey="deltaVote"
                          activeKey={partyResultSort.key}
                          dir={partyResultSort.dir}
                        />
                      </DataThSortButton>
                    </DataTh>
                  ) : null}
                  <DataTh>
                    <DataThSortButton
                      type="button"
                      $active={partyResultSort.key === 'seats'}
                      onClick={() => togglePartyResultSort('seats')}
                    >
                      의석
                      <PartySortGlyph
                        columnKey="seats"
                        activeKey={partyResultSort.key}
                        dir={partyResultSort.dir}
                      />
                    </DataThSortButton>
                  </DataTh>
                  {hasPartyComparison ? (
                    <DataTh>
                      <DataThSortButton
                        type="button"
                        $active={partyResultSort.key === 'deltaSeats'}
                        onClick={() => togglePartyResultSort('deltaSeats')}
                      >
                        전회차 대비 (의석)
                        <PartySortGlyph
                          columnKey="deltaSeats"
                          activeKey={partyResultSort.key}
                          dir={partyResultSort.dir}
                        />
                      </DataThSortButton>
                    </DataTh>
                  ) : null}
                  <DataThActions72 />
                </tr>
              </thead>
              <tbody>
                {partyResults.length === 0 ? (
                  <DataTr>
                    <DataTd colSpan={hasPartyComparison ? 7 : 5}>
                      <EmptyHint>정당 집계 없음</EmptyHint>
                    </DataTd>
                  </DataTr>
                ) : (
                  sortedPartyTableRows.map((row) => {
                    const cmp = partyCmpByPartyId.get(row.partyId)
                    const registryColor = parties.find(
                      (p) => p.id === row.partyId,
                    )?.brandColor
                    const dotFill = partyResultSliceFill(
                      row,
                      hueFromPartyId(row.partyId),
                      registryColor,
                    )
                    return (
                      <DataTr key={row.id}>
                        <DataTd>
                          <PartyNameInline>
                            <PartyColorDot $fill={dotFill} aria-hidden />
                            {row.party
                              ? row.party.shortName || row.party.name
                              : row.partyId}
                          </PartyNameInline>
                        </DataTd>
                        <DataTd>{formatVotesForDisplay(row.votes)}</DataTd>
                        <DataTd>
                          {formatVoteShareLabel(row.voteSharePercent) ?? '—'}
                        </DataTd>
                        {hasPartyComparison ? (
                          <PartyResultDeltaTd
                            $tone={deltaToneCss(
                              cmp?.voteShareDeltaPpt ?? undefined,
                            )}
                          >
                            {formatVoteShareDeltaPpt(cmp?.voteShareDeltaPpt)}
                          </PartyResultDeltaTd>
                        ) : null}
                        <DataTd>{row.seatsWon ?? '—'}</DataTd>
                        {hasPartyComparison ? (
                          <PartyResultDeltaTd
                            $tone={deltaToneCss(cmp?.seatsDelta ?? undefined)}
                          >
                            {formatSeatsDelta(cmp?.seatsDelta)}
                          </PartyResultDeltaTd>
                        ) : null}
                        <DataTdRight>
                          <RowActions>
                            <RowIconBtn
                              type="button"
                              onClick={() => onEditPartyResult(row)}
                              aria-label="수정"
                              title="수정"
                            >
                              <FiEdit2 size={15} strokeWidth={2} />
                            </RowIconBtn>
                            <RowIconBtn
                              type="button"
                              $variant="danger"
                              onClick={() => onDeletePartyResult(row)}
                              aria-label="삭제"
                              title="삭제"
                            >
                              <FiTrash2 size={15} strokeWidth={2} />
                            </RowIconBtn>
                          </RowActions>
                        </DataTdRight>
                      </DataTr>
                    )
                  })
                )}
                {partyResults.length > 0 && otherSyntheticRow ? (
                  <PartyOtherRow>
                    <DataTd>
                      <PartyNameInline>
                        <PartyColorDot
                          $fill={
                            theme.mode === 'dark'
                              ? 'rgba(148,163,184,0.55)'
                              : '#cbd5e1'
                          }
                          aria-hidden
                        />
                        기타 (주요 정당 외)
                      </PartyNameInline>
                    </DataTd>
                    <DataTd>—</DataTd>
                    <DataTd>
                      {partyResultsSummary.otherVoteShare != null
                        ? `${partyResultsSummary.otherVoteShare}%`
                        : '—'}
                    </DataTd>
                    {hasPartyComparison ? <DataTd>—</DataTd> : null}
                    <DataTd>{partyResultsSummary.otherSeats ?? '—'}</DataTd>
                    {hasPartyComparison ? <DataTd>—</DataTd> : null}
                    <DataTdRight />
                  </PartyOtherRow>
                ) : null}
                {partyResults.length > 0 ? (
                  <PartyTotalsRow>
                    <DataTd>합계</DataTd>
                    <DataTd>
                      {partyResultsSummary.votesKnownCount > 0
                        ? partyResultsSummary.votesSum.toLocaleString('ko-KR')
                        : '—'}
                    </DataTd>
                    <DataTd>
                      {partyResultsSummary.voteShareKnownCount > 0
                        ? `${
                            otherSyntheticRow &&
                            partyResultsSummary.otherVoteShare != null
                              ? (
                                  Math.round(
                                    (partyResultsSummary.voteShareSum +
                                      partyResultsSummary.otherVoteShare) *
                                      100,
                                  ) / 100
                                ).toFixed(2)
                              : (
                                  Math.round(
                                    partyResultsSummary.voteShareSum * 100,
                                  ) / 100
                                ).toFixed(2)
                          }%`
                        : '—'}
                    </DataTd>
                    {hasPartyComparison ? <DataTd /> : null}
                    <DataTd>
                      {partyResultsSummary.seatsKnownCount > 0
                        ? `${
                            partyResultsSummary.seatsSum +
                            (partyResultsSummary.otherSeats ?? 0)
                          }${
                            detail.totalSeats != null
                              ? ` / ${detail.totalSeats}`
                              : ''
                          }`
                        : '—'}
                    </DataTd>
                    {hasPartyComparison ? <DataTd /> : null}
                    <DataTdRight />
                  </PartyTotalsRow>
                ) : null}
              </tbody>
            </DataTable>
          </DataTableCard>

          {partyResults.length > 0 ? (
            (() => {
              const notes: { tone: 'ok' | 'warn' | 'error'; text: string }[] =
                []
              if (partyResultsSummary.seatsMismatch) {
                const seatsInfo = partyResultsSummary.seatsMismatch
                if (seatsInfo.kind === 'over') {
                  notes.push({
                    tone: 'error',
                    text: `의석 합계가 총 의석(${detail.totalSeats})보다 ${seatsInfo.diff}석 많습니다. 집계를 확인하세요.`,
                  })
                } else {
                  notes.push({
                    tone: otherSyntheticRow ? 'ok' : 'warn',
                    text: otherSyntheticRow
                      ? `주요 정당 ${partyResultsSummary.seatsSum}석 + 기타 ${seatsInfo.diff}석 = 총 ${detail.totalSeats}석.`
                      : `의석 합계 ${partyResultsSummary.seatsSum}석 — 총 의석 ${detail.totalSeats}석에 ${seatsInfo.diff}석 미달.`,
                  })
                }
              } else if (
                detail.totalSeats != null &&
                partyResultsSummary.seatsKnownCount > 0
              ) {
                notes.push({
                  tone: 'ok',
                  text: `의석 합계 ${partyResultsSummary.seatsSum}석 — 총 의석과 일치.`,
                })
              }
              if (partyResultsSummary.voteShareMismatch) {
                const voteShareInfo = partyResultsSummary.voteShareMismatch
                notes.push({
                  tone: voteShareInfo.over
                    ? 'warn'
                    : otherSyntheticRow
                      ? 'ok'
                      : 'warn',
                  text: voteShareInfo.over
                    ? `득표율 합이 100% + ${voteShareInfo.diff}%p 초과.`
                    : otherSyntheticRow
                      ? `주요 정당 득표율 ${partyResultsSummary.voteShareSum.toFixed(2)}% + 기타 ${partyResultsSummary.otherVoteShare}% ≈ 100%.`
                      : `득표율 합 ${partyResultsSummary.voteShareSum.toFixed(2)}% — 100%에 ${voteShareInfo.diff}%p 미달.`,
                })
              } else if (partyResultsSummary.voteShareKnownCount > 0) {
                notes.push({
                  tone: 'ok',
                  text: `득표율 합 ${partyResultsSummary.voteShareSum.toFixed(2)}% — 정상 범위.`,
                })
              }
              if (notes.length === 0) return null
              const worst = notes.reduce<'ok' | 'warn' | 'error'>(
                (acc, note) =>
                  note.tone === 'error'
                    ? 'error'
                    : acc === 'error'
                      ? 'error'
                      : note.tone === 'warn'
                        ? 'warn'
                        : acc,
                'ok',
              )
              return (
                <PartyValidationBanner $tone={worst} role="status">
                  <FiInfo
                    size={14}
                    strokeWidth={2.25}
                    aria-hidden
                    style={{ flexShrink: 0, marginTop: 2 }}
                  />
                  <PartyValidationList>
                    {notes.map((note, noteIdx) => (
                      <li key={noteIdx}>{note.text}</li>
                    ))}
                  </PartyValidationList>
                </PartyValidationBanner>
              )
            })()
          ) : null}

          {timelineBars.length >= 2 ? (
            <ElectionTimelineBlock aria-label="동일 유형 선거 의석 추이">
              <ElectionTimelineHeader>
                <FiBarChart2 size={14} aria-hidden />
                같은 유형 선거{' '}
                {partyDistributionMetric === 'seats' ? '의석' : '득표율'} 추이
                (최근 {timelineBars.length}회)
              </ElectionTimelineHeader>
              {timelineLegend.length > 0 ? (
                <ElectionTimelineLegendWrap aria-label="정당 범례">
                  {timelineLegend.slice(0, 10).map((l) => (
                    <ElectionTimelineLegendItem key={l.partyId}>
                      <ElectionTimelineLegendDot
                        $fill={l.fill}
                        aria-hidden
                      />
                      {l.name}
                    </ElectionTimelineLegendItem>
                  ))}
                  {timelineLegend.length > 10 ? (
                    <ElectionTimelineLegendItem>
                      외 {timelineLegend.length - 10}개 정당
                    </ElectionTimelineLegendItem>
                  ) : null}
                </ElectionTimelineLegendWrap>
              ) : null}
              {timelineBars.map((row) => {
                const isCurrent = row.id === detail.id
                const labelTitle =
                  row.convocationOrdinal != null
                    ? `제${row.convocationOrdinal}회 ${row.shortName ?? row.name}`
                    : (row.shortName ?? row.name)
                const unit =
                  partyDistributionMetric === 'seats' ? '석' : '%'
                const formatValue = (value: number) =>
                  partyDistributionMetric === 'seats'
                    ? `${value}${unit}`
                    : `${(Math.round(value * 100) / 100).toFixed(2)}${unit}`
                const meta =
                  row.total > 0
                    ? partyDistributionMetric === 'seats'
                      ? `${row.knownSum + row.otherValue}/${row.total}석`
                      : `합계 ${(
                          Math.round((row.knownSum + row.otherValue) * 100) /
                          100
                        ).toFixed(1)}%`
                    : partyDistributionMetric === 'seats'
                      ? '의석 —'
                      : '득표율 —'
                return (
                  <ElectionTimelineRow key={row.id} $current={isCurrent}>
                    <ElectionTimelineRowLabel title={row.name}>
                      {labelTitle}
                      <small>{formatPollDate(row.pollDate)}</small>
                    </ElectionTimelineRowLabel>
                    <ElectionTimelineBarTrack
                      role="img"
                      aria-label={`${labelTitle}: ${row.segments
                        .map((seg) => `${seg.name} ${formatValue(seg.value)}`)
                        .join(', ')}${
                        row.otherValue > 0
                          ? `, 기타 ${formatValue(row.otherValue)}`
                          : ''
                      }`}
                    >
                      {row.total > 0
                        ? row.segments.map((seg) => {
                            const pct = (seg.value / row.total) * 100
                            return (
                              <ElectionTimelineBarSegment
                                key={seg.partyId}
                                $fill={seg.fill}
                                $pct={pct}
                                title={`${seg.name} ${formatValue(seg.value)} (${pct.toFixed(1)}%)`}
                              />
                            )
                          })
                        : null}
                      {row.otherValue > 0 && row.total > 0 ? (
                        <ElectionTimelineBarSegment
                          $fill={'#cbd5e1'}
                          $pct={(row.otherValue / row.total) * 100}
                          title={`기타 ${formatValue(row.otherValue)}`}
                        />
                      ) : null}
                    </ElectionTimelineBarTrack>
                    <ElectionTimelineRowMeta>{meta}</ElectionTimelineRowMeta>
                  </ElectionTimelineRow>
                )
              })}
            </ElectionTimelineBlock>
          ) : null}
        </div>

        {isReferendum ? (
          <ReferendumBallotPanel>
            <ReferendumBallotPanelHead>
              <ReferendumBallotPanelTitleRow>
                <ReferendumBallotPanelIcon aria-hidden>
                  <FiLayers size={18} strokeWidth={2.25} />
                </ReferendumBallotPanelIcon>
                <ReferendumBallotPanelTitles>
                  <ReferendumBallotPanelKicker>
                    국민투표 · 주민투표
                  </ReferendumBallotPanelKicker>
                  <ReferendumBallotPanelTitle>
                    투표 안 (선택지)
                  </ReferendumBallotPanelTitle>
                </ReferendumBallotPanelTitles>
              </ReferendumBallotPanelTitleRow>
            </ReferendumBallotPanelHead>

            <ReferendumBallotAddRow>
              <InlineTextInput
                type="text"
                value={ballotLabel}
                onChange={(e) => setBallotLabel(e.target.value)}
                placeholder="안 제목 (예: 찬성)"
              />
              <SubsectionAddBtn
                type="button"
                onClick={() => {
                  const t = ballotLabel.trim()
                  if (!t) {
                    toast.error('안 제목을 입력하세요.')
                    return
                  }
                  const nextSortOrder =
                    sortedBallotOptions.length === 0
                      ? 0
                      : Math.max(
                          ...sortedBallotOptions.map(
                            (option) => option.sortOrder,
                          ),
                        ) + 1
                  onAddBallotOption(t, nextSortOrder)
                  setBallotLabel('')
                }}
              >
                <FiPlus size={14} strokeWidth={2.25} />
                추가
              </SubsectionAddBtn>
            </ReferendumBallotAddRow>

            {referendumBallotBars.length > 0 ? (
              <ReferendumBallotBars>
                <ReferendumBallotBarKicker>득표 비중</ReferendumBallotBarKicker>
                {referendumBallotBars.map((row) => (
                  <ReferendumBallotBarRow
                    key={row.id}
                    onMouseEnter={(e) => showChartTip(row.hoverTitle, e)}
                    onMouseMove={moveChartTip}
                    onMouseLeave={hideChartTip}
                  >
                    <ReferendumBallotBarLabel>{row.label}</ReferendumBallotBarLabel>
                    <ReferendumBallotBarValue>
                      {row.valueLabel}
                    </ReferendumBallotBarValue>
                    <ReferendumBallotBarTrack>
                      <ReferendumBallotBarFill
                        $widthPct={row.widthPct}
                        $fill={row.fill}
                      />
                    </ReferendumBallotBarTrack>
                  </ReferendumBallotBarRow>
                ))}
              </ReferendumBallotBars>
            ) : null}

            <DataTableCard>
              <DataTable>
                <thead>
                  <tr>
                    <DataTh>안</DataTh>
                    <DataTh>득표</DataTh>
                    <DataTh>득표율</DataTh>
                    <DataThActions96 />
                  </tr>
                </thead>
                <tbody>
                  {sortedBallotOptions.length === 0 ? (
                    <DataTr>
                      <DataTd colSpan={4}>
                        <EmptyHint>등록된 투표 안이 없습니다.</EmptyHint>
                      </DataTd>
                    </DataTr>
                  ) : (
                    sortedBallotOptions.map((opt) => (
                      <DataTr key={opt.id}>
                        <DataTd>
                          {editingBallotId === opt.id ? (
                            <BallotOptionEditRow>
                              <BallotOptionEditInput
                                type="text"
                                value={editingBallotLabel}
                                onChange={(
                                  e: React.ChangeEvent<HTMLInputElement>,
                                ) => setEditingBallotLabel(e.target.value)}
                              />
                              <RowIconBtn
                                type="button"
                                onClick={async () => {
                                  const nextLabel = editingBallotLabel.trim()
                                  if (!nextLabel) {
                                    toast.error('안 제목을 입력하세요.')
                                    return
                                  }
                                  try {
                                    await onRenameBallotOption(
                                      opt.id,
                                      nextLabel,
                                    )
                                    setEditingBallotId(null)
                                  } catch {
                                    /* mutation onError 토스트 */
                                  }
                                }}
                                aria-label="이름 저장"
                                title="저장"
                              >
                                <FiCheck size={17} strokeWidth={2.25} />
                              </RowIconBtn>
                              <RowIconBtn
                                type="button"
                                onClick={() => setEditingBallotId(null)}
                                aria-label="취소"
                                title="취소"
                              >
                                <FiX size={17} strokeWidth={2.25} />
                              </RowIconBtn>
                            </BallotOptionEditRow>
                          ) : (
                            <div>
                              <span>{opt.label}</span>
                              {opt.shortLabel?.trim() ? (
                                <BallotOptionShortLabel>
                                  약칭 · {opt.shortLabel.trim()}
                                </BallotOptionShortLabel>
                              ) : null}
                            </div>
                          )}
                        </DataTd>
                        <DataTd>
                          {formatVotesForDisplay(opt.result?.votes)}
                        </DataTd>
                        <DataTd>
                          {formatVoteShareLabel(opt.result?.voteSharePercent) ??
                            '—'}
                        </DataTd>
                        <DataTdRight>
                          {editingBallotId !== opt.id ? (
                            <RowActions>
                              <RowIconBtn
                                type="button"
                                onClick={() => {
                                  setEditingBallotId(opt.id)
                                  setEditingBallotLabel(opt.label)
                                }}
                                aria-label={`「${opt.label}」이름 편집`}
                                title="이름 편집"
                              >
                                <FiEdit2 size={15} strokeWidth={2} />
                              </RowIconBtn>
                              <RowIconBtn
                                type="button"
                                onClick={() => onEditBallotResult(opt)}
                                aria-label="집계 편집"
                                title="집계"
                              >
                                <FiBarChart2 size={15} strokeWidth={2} />
                              </RowIconBtn>
                              <RowIconBtn
                                type="button"
                                $variant="danger"
                                onClick={() => onDeleteBallotOption(opt)}
                                aria-label="안 삭제"
                                title="삭제"
                              >
                                <FiTrash2 size={15} strokeWidth={2} />
                              </RowIconBtn>
                            </RowActions>
                          ) : null}
                        </DataTdRight>
                      </DataTr>
                    ))
                  )}
                </tbody>
              </DataTable>
            </DataTableCard>
          </ReferendumBallotPanel>
        ) : (
          <div>
            <SectionHeaderRowSubsection>
              <SubsectionLabel>후보</SubsectionLabel>
              <SubsectionAddBtn type="button" onClick={onAddCandidacy}>
                <FiPlus size={14} strokeWidth={2.25} />
                후보 추가
              </SubsectionAddBtn>
            </SectionHeaderRowSubsection>
            <DataTableCard>
              <DataTable>
                <thead>
                  <tr>
                    <DataTh>후보</DataTh>
                    <DataTh>득표</DataTh>
                    <DataTh>순위·의석</DataTh>
                    <DataThActions104 />
                  </tr>
                </thead>
                <tbody>
                  {detail.candidacies.length === 0 ? (
                    <DataTr>
                      <DataTd colSpan={4}>
                        <EmptyHint>후보가 없습니다.</EmptyHint>
                      </DataTd>
                    </DataTr>
                  ) : (
                    detail.candidacies.map((c) => {
                      const metaBits: string[] = []
                      if (c.electoralDistrict) {
                        metaBits.push(
                          c.electoralDistrict.code
                            ? `${c.electoralDistrict.name} (${c.electoralDistrict.code})`
                            : c.electoralDistrict.name,
                        )
                      }
                      metaBits.push(labelNominationType(c.nominationType))
                      if (c.ballotOrder != null)
                        metaBits.push(`기표 ${c.ballotOrder}번`)
                      if (c.listRank != null)
                        metaBits.push(`비례 ${c.listRank}순`)
                      const voteShareLabel = formatVoteShareLabel(
                        c.result?.voteSharePercent,
                      )
                      const rankSeatParts: string[] = []
                      if (c.result?.resultRank != null)
                        rankSeatParts.push(`${c.result.resultRank}위`)
                      if (c.result?.seatsWon != null)
                        rankSeatParts.push(`${c.result.seatsWon}석`)
                      return (
                        <DataTr key={c.id}>
                          <DataTd>
                            <CandidacyNameStrong>
                              {candidacyLabel(c)}
                            </CandidacyNameStrong>
                            {c.party ? (
                              <CandidacyPartyMeta>
                                {c.party.shortName || c.party.name}
                              </CandidacyPartyMeta>
                            ) : null}
                            {metaBits.length > 0 ? (
                              <CandidacyPartyMeta>
                                {metaBits.join(' · ')}
                              </CandidacyPartyMeta>
                            ) : null}
                            {c.withdrawnDate ? (
                              <CandidacyWithdrawnBadge
                                title={`사퇴 ${formatPollDate(c.withdrawnDate)}`}
                              >
                                사퇴 · {formatPollDate(c.withdrawnDate)}
                              </CandidacyWithdrawnBadge>
                            ) : null}
                          </DataTd>
                          <DataTd>
                            <span>
                              {formatVotesForDisplay(c.result?.votes)}
                              {c.result?.elected ? (
                                <ElectedBadge>당선</ElectedBadge>
                              ) : null}
                            </span>
                            {voteShareLabel ? (
                              <CandidacyPartyMeta>
                                {voteShareLabel}
                              </CandidacyPartyMeta>
                            ) : null}
                          </DataTd>
                          <DataTd>
                            {rankSeatParts.length > 0
                              ? rankSeatParts.join(' · ')
                              : '—'}
                          </DataTd>
                          <DataTdRight>
                            <RowActions>
                              <RowIconBtn
                                type="button"
                                onClick={() => onEditResult(c)}
                                aria-label="득표·결과"
                                title="득표·결과"
                              >
                                <FiBarChart2 size={15} strokeWidth={2} />
                              </RowIconBtn>
                              <RowIconBtn
                                type="button"
                                onClick={() => onEditCandidacy(c)}
                                aria-label="후보 수정"
                                title="수정"
                              >
                                <FiEdit2 size={15} strokeWidth={2} />
                              </RowIconBtn>
                              <RowIconBtn
                                type="button"
                                $variant="danger"
                                onClick={() => onDeleteCandidacy(c)}
                                aria-label="후보 삭제"
                                title="삭제"
                              >
                                <FiTrash2 size={15} strokeWidth={2} />
                              </RowIconBtn>
                            </RowActions>
                          </DataTdRight>
                        </DataTr>
                      )
                    })
                  )}
                </tbody>
              </DataTable>
            </DataTableCard>
          </div>
        )}

        <PoliticsTabSubsection aria-label="선거 서술·설명">
          {showLegislatureDissolutionNarrative ? (
            <ElectionNarrativeBlock>
              <SectionHeaderRowNarrative>
                <SubsectionLabel>이번 의회 종료 서술</SubsectionLabel>
                {narrativeEdit !== 'legislature' &&
                narrativeEdit !== 'stats' ? (
                  <ElectionNarrativeEditBtn
                    type="button"
                    onClick={() => {
                      setLegislatureDraft(
                        detail.resultingLegislatureDissolutionNotes ?? '',
                      )
                      setNarrativeEdit('legislature')
                    }}
                    aria-label={
                      hasRichTextContent(
                        detail.resultingLegislatureDissolutionNotes ?? '',
                      )
                        ? '이번 의회 종료 서술 수정'
                        : '이번 의회 종료 서술 작성'
                    }
                  >
                    <FiEdit2 size={14} strokeWidth={2} />
                    {hasRichTextContent(
                      detail.resultingLegislatureDissolutionNotes ?? '',
                    )
                      ? '수정'
                      : '작성'}
                  </ElectionNarrativeEditBtn>
                ) : null}
              </SectionHeaderRowNarrative>
              {narrativeEdit === 'legislature' ? (
                <HistoryArticleInner>
                  <HistoryArticleEditorWrap>
                    <RichTextEditor
                      value={legislatureDraft}
                      onChange={setLegislatureDraft}
                      placeholder="정시 만료·조기 해산 등 (선택)"
                      entityLinkCountryId={entityLinkCountryId}
                      onImageUpload={uploadElectionRichTextImage}
                    />
                  </HistoryArticleEditorWrap>
                  <HistoryArticleEditActions>
                    <HistoryArticleCancelBtn
                      type="button"
                      disabled={savingNarrative}
                      onClick={() => {
                        setLegislatureDraft(
                          detail.resultingLegislatureDissolutionNotes ?? '',
                        )
                        setNarrativeEdit(null)
                      }}
                    >
                      취소
                    </HistoryArticleCancelBtn>
                    <HistoryArticleSaveBtn
                      type="button"
                      disabled={savingNarrative}
                      onClick={() => void handleSaveLegislatureNarrative()}
                    >
                      {savingNarrative ? '저장 중…' : '저장'}
                    </HistoryArticleSaveBtn>
                  </HistoryArticleEditActions>
                </HistoryArticleInner>
              ) : hasRichTextContent(
                  detail.resultingLegislatureDissolutionNotes ?? '',
                ) ? (
                <HistoryArticleInner>
                  <RichTextProseWithEntityClicks
                    readViewAs={HistoryArticleProse}
                    html={detail.resultingLegislatureDissolutionNotes ?? ''}
                    aria-label="이번 의회 종료 서술"
                    hideWhenEmpty
                    onPersonClick={setMentionPersonId}
                    onPoliticalPartyClick={handleElectionProsePartyClick}
                    setTermTooltip={setElectionProseTermTooltip}
                    setDynastyTooltip={setElectionProseDynastyTooltip}
                  />
                </HistoryArticleInner>
              ) : (
                <ElectionNarrativeEmptyHint>
                  아직 작성된 내용이 없습니다.「작성」으로 입력할 수 있습니다.
                </ElectionNarrativeEmptyHint>
              )}
            </ElectionNarrativeBlock>
          ) : null}
          <ElectionNarrativeBlock>
            <SectionHeaderRowNarrative>
              <SubsectionLabel>설명</SubsectionLabel>
              {narrativeEdit !== 'legislature' && narrativeEdit !== 'stats' ? (
                <ElectionNarrativeEditBtn
                  type="button"
                  onClick={() => {
                    setDescriptionDraft(effectiveElectionDescription)
                    setNarrativeEdit('stats')
                  }}
                  aria-label={
                    hasRichTextContent(effectiveElectionDescription)
                      ? '선거 설명 수정'
                      : '선거 설명 작성'
                  }
                >
                  <FiEdit2 size={14} strokeWidth={2} />
                  {hasRichTextContent(effectiveElectionDescription)
                    ? '수정'
                    : '작성'}
                </ElectionNarrativeEditBtn>
              ) : null}
            </SectionHeaderRowNarrative>
            {detail.eventId &&
            hasRichTextContent(detail.event?.description ?? '') ? (
              <p
                style={{
                  margin: '0 0 8px',
                  fontSize: 12,
                  color: theme.colors.text.secondary,
                }}
              >
                본문 정본은 연결된 사건(Event)에 있습니다. 수정 시 Event가
                갱신됩니다.
              </p>
            ) : null}
            {narrativeEdit === 'stats' ? (
              <HistoryArticleInner>
                <HistoryArticleEditorWrap>
                  <RichTextEditor
                    value={descriptionDraft}
                    onChange={setDescriptionDraft}
                    placeholder="선거에 대한 부가 설명 (선택)"
                    entityLinkCountryId={entityLinkCountryId}
                    onImageUpload={uploadElectionRichTextImage}
                  />
                </HistoryArticleEditorWrap>
                <HistoryArticleEditActions>
                  <HistoryArticleCancelBtn
                    type="button"
                    disabled={savingNarrative}
                    onClick={() => {
                      setDescriptionDraft(effectiveElectionDescription)
                      setNarrativeEdit(null)
                    }}
                  >
                    취소
                  </HistoryArticleCancelBtn>
                  <HistoryArticleSaveBtn
                    type="button"
                    disabled={savingNarrative}
                    onClick={() => void handleSaveDescriptionNarrative()}
                  >
                    {savingNarrative ? '저장 중…' : '저장'}
                  </HistoryArticleSaveBtn>
                </HistoryArticleEditActions>
              </HistoryArticleInner>
            ) : hasRichTextContent(effectiveElectionDescription) ? (
              <HistoryArticleInner>
                <RichTextProseWithEntityClicks
                  readViewAs={HistoryArticleProse}
                  html={effectiveElectionDescription}
                  aria-label="선거 설명"
                  hideWhenEmpty
                  onPersonClick={setMentionPersonId}
                  onPoliticalPartyClick={handleElectionProsePartyClick}
                  setTermTooltip={setElectionProseTermTooltip}
                  setDynastyTooltip={setElectionProseDynastyTooltip}
                />
              </HistoryArticleInner>
            ) : (
              <ElectionNarrativeEmptyHint>
                아직 작성된 내용이 없습니다.「작성」으로 입력할 수 있습니다.
              </ElectionNarrativeEmptyHint>
            )}
          </ElectionNarrativeBlock>
        </PoliticsTabSubsection>
      </ElectionDetailPanelStack>
      {chartHoverTip
        ? createPortal(
            <ElectionChartTooltip
              role="tooltip"
              style={{ left: chartHoverTip.x, top: chartHoverTip.y }}
            >
              {chartHoverTip.text}
            </ElectionChartTooltip>,
            document.body,
          )
        : null}

      {electionProseTermTooltip
        ? createPortal(
            <HistoryProseTooltipOverlay
              role="presentation"
              style={{ zIndex: Z_INDEX.RICH_TEXT_EDITOR_OVERLAY + 35 }}
              onClick={() => setElectionProseTermTooltip(null)}
            >
              <HistoryProseTermTooltipPopover
                $x={electionProseTermTooltip.x}
                $y={electionProseTermTooltip.y}
                onClick={(e) => e.stopPropagation()}
              >
                <strong>{electionProseTermTooltip.name}</strong>
                <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {electionProseTermTooltip.description === null
                    ? ' 로딩…'
                    : electionProseTermTooltip.description || '(설명 없음)'}
                </span>
              </HistoryProseTermTooltipPopover>
            </HistoryProseTooltipOverlay>,
            document.body,
          )
        : null}

      {electionProseDynastyTooltip
        ? createPortal(
            <HistoryProseTooltipOverlay
              role="presentation"
              style={{ zIndex: Z_INDEX.RICH_TEXT_EDITOR_OVERLAY + 35 }}
              onClick={() => setElectionProseDynastyTooltip(null)}
            >
              <HistoryProseDynastyTooltipPopover
                $x={electionProseDynastyTooltip.x}
                $y={electionProseDynastyTooltip.y}
                onClick={(e) => e.stopPropagation()}
              >
                <strong>가문 · {electionProseDynastyTooltip.name}</strong>
                <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {electionProseDynastyTooltip.description === null
                    ? ' 로딩…'
                    : electionProseDynastyTooltip.description || '(설명 없음)'}
                </span>
              </HistoryProseDynastyTooltipPopover>
            </HistoryProseTooltipOverlay>,
            document.body,
          )
        : null}

      {electionMentionPartyId
        ? createPortal(
            <ModalOverlay
              style={{
                zIndex: Z_INDEX.RICH_TEXT_EDITOR_OVERLAY + 48,
              }}
              onClick={() => setElectionMentionPartyId(null)}
              role="presentation"
            >
              <ModalBoxWide
                $maxWidth="640px"
                $maxHeight="88vh"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: 0,
                  overflow: 'hidden',
                  zIndex: Z_INDEX.RICH_TEXT_EDITOR_OVERLAY + 49,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <ModalHeader>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <ModalTitle
                      title={electionMentionParty?.name ?? ''}
                      style={{ flex: 1, minWidth: 0 }}
                    >
                      {electionMentionPartyLoading
                        ? '정당'
                        : (electionMentionParty?.name ?? '정당')}
                    </ModalTitle>
                    {partyFullTabCountryId && electionMentionPartyId ? (
                      <ElectionPartyModalOpenFullBtn
                        type="button"
                        onClick={() => {
                          navigate(
                            pathKeys.history.countryElectionPartyDetail(
                              partyFullTabCountryId,
                              electionMentionPartyId,
                            ),
                          )
                          setElectionMentionPartyId(null)
                        }}
                      >
                        선거·정당 탭에서 보기
                      </ElectionPartyModalOpenFullBtn>
                    ) : null}
                  </div>
                  <ModalCloseButton
                    type="button"
                    onClick={() => setElectionMentionPartyId(null)}
                    aria-label="닫기"
                  >
                    <FiX size={20} strokeWidth={2.5} />
                  </ModalCloseButton>
                </ModalHeader>
                <ModalBody
                  style={{
                    flex: 1,
                    overflow: 'auto',
                    minHeight: 0,
                    paddingTop: 8,
                  }}
                >
                  {electionMentionPartyLoading ? (
                    <EmptyHint style={{ padding: 16 }}>불러오는 중…</EmptyHint>
                  ) : electionMentionParty ? (
                    <>
                      <PartyDetailHero>
                        <PartyDetailHeroStack>
                          <PartyDetailLogoHero
                            $ring={
                              electionMentionParty.brandColor ?? undefined
                            }
                          >
                            {electionMentionParty.logoUrl ? (
                              <PartyDetailLogoImg
                                src={getUploadImageUrl(
                                  electionMentionParty.logoUrl,
                                )}
                                alt=""
                              />
                            ) : (
                              <FiImage size={52} strokeWidth={1.5} />
                            )}
                          </PartyDetailLogoHero>
                          <PartyDetailHeroTitle>
                            {electionMentionParty.name}
                          </PartyDetailHeroTitle>
                          <PartyDetailChipRowCenter>
                            {electionMentionParty.shortName?.trim() ? (
                              <PartyDetailChip title="약칭">
                                <PartyDetailChipMuted>약칭</PartyDetailChipMuted>
                                {electionMentionParty.shortName.trim()}
                              </PartyDetailChip>
                            ) : (
                              <PartyDetailChip style={{ opacity: 0.72 }}>
                                약칭 없음
                              </PartyDetailChip>
                            )}
                            {electionMentionParty.localName?.trim() ? (
                              <PartyDetailChip title="현지어·별도 표기">
                                <PartyDetailChipMuted>현지어</PartyDetailChipMuted>
                                {electionMentionParty.localName.trim()}
                              </PartyDetailChip>
                            ) : null}
                          </PartyDetailChipRowCenter>
                        </PartyDetailHeroStack>
                      </PartyDetailHero>
                      <PartyDetailMetaSection>
                        <PartyDetailMetaGrid>
                          <PartyDetailMetaTile>
                            <PartyDetailMetaTileLabel>
                              이념·노선
                            </PartyDetailMetaTileLabel>
                            <PartyDetailMetaTileValue>
                              {(() => {
                                const tags = parseElectionPartyIdeologyKeywords(
                                  electionMentionParty.ideology,
                                )
                                return tags.length ? (
                                  <span
                                    style={{
                                      display: 'flex',
                                      flexWrap: 'wrap',
                                      gap: 6,
                                    }}
                                  >
                                    {tags.map((t, i) => (
                                      <ElectionPartyIdeologyTag
                                        key={`${t}-${i}`}
                                      >
                                        {t}
                                      </ElectionPartyIdeologyTag>
                                    ))}
                                  </span>
                                ) : (
                                  '—'
                                )
                              })()}
                            </PartyDetailMetaTileValue>
                          </PartyDetailMetaTile>
                          <PartyDetailMetaTile>
                            <PartyDetailMetaTileLabel>
                              스펙트럼
                            </PartyDetailMetaTileLabel>
                            <PartyDetailMetaTileValue>
                              {labelElectionPartyPosition(
                                electionMentionParty.position ?? undefined,
                              )}
                            </PartyDetailMetaTileValue>
                          </PartyDetailMetaTile>
                          <PartyDetailMetaTile>
                            <PartyDetailMetaTileLabel>
                              설립
                            </PartyDetailMetaTileLabel>
                            <PartyDetailMetaTileValue>
                              {formatElectionPartyDate(
                                electionMentionParty.foundedDate,
                              )}
                            </PartyDetailMetaTileValue>
                          </PartyDetailMetaTile>
                          <PartyDetailMetaTile>
                            <PartyDetailMetaTileLabel>
                              해산
                            </PartyDetailMetaTileLabel>
                            <PartyDetailMetaTileValue>
                              {formatElectionPartyDate(
                                electionMentionParty.dissolvedDate,
                              )}
                            </PartyDetailMetaTileValue>
                          </PartyDetailMetaTile>
                        </PartyDetailMetaGrid>
                      </PartyDetailMetaSection>
                      <PartyDetailDescSection aria-label="정당 설명">
                        {optionalRichTextHtmlOrNull(
                          electionMentionParty.description ?? '',
                        ) || isLikelyRichTextHtml(electionMentionParty.description) ? (
                          <HistoryArticleInner>
                            <RichTextProseWithEntityClicks
                              readViewAs={HistoryArticleProse}
                              html={electionMentionParty.description ?? ''}
                              aria-label="정당 설명"
                              hideWhenEmpty
                              onPersonClick={setMentionPersonId}
                              onPoliticalPartyClick={
                                handleElectionProsePartyClick
                              }
                              samePoliticalPartyId={electionMentionPartyId}
                              setTermTooltip={setElectionProseTermTooltip}
                              setDynastyTooltip={setElectionProseDynastyTooltip}
                            />
                          </HistoryArticleInner>
                        ) : (electionMentionParty.description ?? '').trim() ? (
                          <p
                            style={{
                              margin: '8px 0 0',
                              fontSize: 14,
                              lineHeight: 1.55,
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                            }}
                          >
                            {electionMentionParty.description}
                          </p>
                        ) : (
                          <PartyDescEmptyHint>
                            등록된 설명이 없습니다.
                          </PartyDescEmptyHint>
                        )}
                      </PartyDetailDescSection>
                    </>
                  ) : (
                    <EmptyHint style={{ padding: 16 }}>
                      정당 정보를 불러오지 못했습니다.
                    </EmptyHint>
                  )}
                </ModalBody>
              </ModalBoxWide>
            </ModalOverlay>,
            document.body,
          )
        : null}

      {mentionPersonId
        ? createPortal(
            <ModalOverlay
              style={{
                zIndex: Z_INDEX.RICH_TEXT_EDITOR_OVERLAY + 50,
                alignItems: 'flex-start',
                paddingTop: 32,
              }}
              onClick={() => setMentionPersonId(null)}
              role="presentation"
            >
              <ModalBoxWide
                $maxWidth="900px"
                $maxHeight="88vh"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: 0,
                  overflow: 'hidden',
                  zIndex: Z_INDEX.RICH_TEXT_EDITOR_OVERLAY + 51,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <ModalHeader>
                  <ModalTitle title={mentionPersonName}>
                    {mentionPersonName || '인물'}
                  </ModalTitle>
                  <ModalCloseButton
                    type="button"
                    onClick={() => setMentionPersonId(null)}
                    aria-label="닫기"
                  >
                    <FiX size={20} strokeWidth={2.5} />
                  </ModalCloseButton>
                </ModalHeader>
                <ModalBody
                  style={{
                    flex: 1,
                    overflow: 'auto',
                    minHeight: 0,
                    paddingTop: 8,
                  }}
                >
                  <PersonDetailPanel
                    personId={mentionPersonId}
                    onClose={() => setMentionPersonId(null)}
                    onEdit={() => setMentionPersonId(null)}
                    hideHeaderActions
                    embedInModal
                    onLinkedPersonClick={setMentionPersonId}
                  />
                </ModalBody>
              </ModalBoxWide>
            </ModalOverlay>,
            document.body,
          )
        : null}
    </>
  )
}

function ElectionFormModal({
  entityLinkCountryId,
  electionScope,
  mode,
  initial,
  initialTab,
  historicalCountryOptions,
  saving,
  onClose,
  onSubmit,
}: {
  /** 리치텍스트 엔티티 연결 — 서버 검색 시 정당 등 범위 한정 */
  entityLinkCountryId?: string
  electionScope: { countryId?: string; historicalCountryId?: string }
  mode: 'create' | 'edit'
  initial?: ElectionDetailDto
  /** 수정 모달을 열 때 보여줄 탭 (서술·설명 등) */
  initialTab?: 'basic' | 'legislature' | 'stats'
  /** 현대 국가와 연결된 역사 국가 — 현대 국가 상세에서만 전달 */
  historicalCountryOptions: Array<{ id: string; name: string }>
  saving: boolean
  onClose: () => void
  onSubmit: (p: {
    mode: 'create' | 'edit'
    id?: string
    body:
      | Parameters<typeof createElection>[0]
      | Parameters<typeof updateElection>[1]
  }) => void
}) {
  const resolvedEntityLinkCountryId =
    entityLinkCountryId ?? initial?.countryId ?? electionScope.countryId

  const [name, setName] = useState(initial?.name ?? '')
  const [shortName, setShortName] = useState(initial?.shortName ?? '')
  const [electionType, setElectionType] = useState(
    initial?.electionType ?? 'PARLIAMENTARY_CONSTITUENCY',
  )
  const [status, setStatus] = useState(initial?.status ?? 'SCHEDULED')
  const [pollDate, setPollDate] = useState(
    initial?.pollDate
      ? toLocalDateYmd(initial.pollDate) ||
          new Date().toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  )
  const [description, setDescription] = useState(initial?.description ?? '')
  const [electionFormTab, setElectionFormTab] = useState<
    'basic' | 'legislature' | 'stats'
  >(() => initialTab ?? 'basic')
  const [legTermStart, setLegTermStart] = useState(() =>
    toLocalDateYmd(initial?.legislatureTermStart),
  )
  const [legTermEnd, setLegTermEnd] = useState(() =>
    toLocalDateYmd(initial?.legislatureTermEnd),
  )
  const playClickSound = useClickSound()
  const [pollModalOpen, setPollModalOpen] = useState(false)
  const [termStartModalOpen, setTermStartModalOpen] = useState(false)
  const [termEndModalOpen, setTermEndModalOpen] = useState(false)
  const [voterTurnout, setVoterTurnout] = useState(
    initial?.voterTurnoutPercent != null &&
      String(initial.voterTurnoutPercent).trim() !== ''
      ? formatPercentOneDecimalForInput(initial.voterTurnoutPercent)
      : '',
  )
  const [totalSeatsStr, setTotalSeatsStr] = useState(
    initial?.totalSeats != null ? String(initial.totalSeats) : '',
  )
  const [pollEndYmd, setPollEndYmd] = useState(() =>
    toLocalDateYmd(initial?.pollEndDate),
  )
  const [pollEndModalOpen, setPollEndModalOpen] = useState(false)
  const [convOrdinalStr, setConvOrdinalStr] = useState(
    initial?.convocationOrdinal != null
      ? String(initial.convocationOrdinal)
      : '',
  )
  const [resultingClosureKind, setResultingClosureKind] = useState(
    initial?.resultingLegislatureClosureKind ?? '',
  )
  const [resultingClosureYmd, setResultingClosureYmd] = useState(() =>
    toLocalDateYmd(initial?.resultingLegislatureClosureDate),
  )
  const [resultingClosureModalOpen, setResultingClosureModalOpen] =
    useState(false)
  const [resultingDissolutionNotes, setResultingDissolutionNotes] = useState(
    initial?.resultingLegislatureDissolutionNotes ?? '',
  )
  const [scopeHistoricalCountryId, setScopeHistoricalCountryId] = useState(
    () => initial?.historicalCountryId ?? '',
  )
  const [linkedEventId, setLinkedEventId] = useState(
    () => initial?.eventId ?? '',
  )

  const showHistoricalCountryPicker = Boolean(
    electionScope.countryId && !electionScope.historicalCountryId,
  )

  useEffect(() => {
    if (mode !== 'edit' || !initial) return
    setName(initial.name ?? '')
    setShortName(initial.shortName ?? '')
    setElectionType(initial.electionType ?? 'PARLIAMENTARY_CONSTITUENCY')
    setStatus(initial.status ?? 'SCHEDULED')
    setPollDate(
      toLocalDateYmd(initial.pollDate) || new Date().toISOString().slice(0, 10),
    )
    setPollEndYmd(toLocalDateYmd(initial.pollEndDate))
    setDescription(initial.description ?? '')
    setElectionFormTab(initialTab ?? 'basic')
    setLegTermStart(toLocalDateYmd(initial.legislatureTermStart))
    setLegTermEnd(toLocalDateYmd(initial.legislatureTermEnd))
    setVoterTurnout(
      initial.voterTurnoutPercent != null &&
        String(initial.voterTurnoutPercent).trim() !== ''
        ? formatPercentOneDecimalForInput(initial.voterTurnoutPercent)
        : '',
    )
    setTotalSeatsStr(
      initial.totalSeats != null ? String(initial.totalSeats) : '',
    )
    setConvOrdinalStr(
      initial.convocationOrdinal != null
        ? String(initial.convocationOrdinal)
        : '',
    )
    setResultingClosureKind(initial.resultingLegislatureClosureKind ?? '')
    setResultingClosureYmd(
      toLocalDateYmd(initial.resultingLegislatureClosureDate),
    )
    setResultingDissolutionNotes(
      initial.resultingLegislatureDissolutionNotes ?? '',
    )
    setScopeHistoricalCountryId(initial.historicalCountryId ?? '')
    setLinkedEventId(initial.eventId ?? '')
  }, [mode, initial, initialTab])

  const title = mode === 'create' ? '새 선거' : '선거 수정'

  return (
    <>
      <ElectionsModalShell
        title={title}
        onClose={onClose}
        height="890px"
        footer={
          <PersonRegisterModalPrimaryBtn
            type="button"
            disabled={saving || !name.trim() || !pollDate}
            onClick={() => {
              const turnoutParsed = parseOptionalPercent0to100(voterTurnout)
              if (turnoutParsed === 'invalid') {
                toast.error(
                  '투표율(참여)은 0~100 사이 숫자(소수 첫째 자리까지)이거나 비워 두세요.',
                )
                return
              }
              const totalSeatsParsed =
                parseOptionalNonNegativeInt(totalSeatsStr)
              if (totalSeatsParsed === 'invalid') {
                toast.error('총 의석은 0 이상의 정수이거나 비워 두세요.')
                return
              }
              const convOrdinalParsed =
                parseOptionalNonNegativeInt(convOrdinalStr)
              if (convOrdinalParsed === 'invalid') {
                toast.error('회차(숫자)는 0 이상의 정수이거나 비워 두세요.')
                return
              }
              const iso = `${pollDate}T12:00:00.000Z`
              const pollEndIso = pollEndYmd
                ? `${pollEndYmd}T12:00:00.000Z`
                : null
              const termStartIso = legTermStart
                ? `${legTermStart}T12:00:00.000Z`
                : null
              const termEndIso = legTermEnd
                ? `${legTermEnd}T12:00:00.000Z`
                : null
              const resultingClosureIso = resultingClosureYmd
                ? `${resultingClosureYmd}T12:00:00.000Z`
                : null
              const turnoutBody =
                turnoutParsed === null ? null : String(turnoutParsed)
              const scopeFields = resolveElectionScopeForSubmit(
                electionScope,
                scopeHistoricalCountryId,
              )
              const resultingKindVal =
                resultingClosureKind.trim() === '' ? null : resultingClosureKind
              const chronologyExtra = {
                pollEndDate: pollEndIso,
                convocationOrdinal: convOrdinalParsed,
                resultingLegislatureClosureKind: resultingKindVal,
                resultingLegislatureClosureDate: resultingClosureIso,
                resultingLegislatureDissolutionNotes:
                  optionalRichTextHtmlOrNull(resultingDissolutionNotes),
              }
              const eventIdBody = linkedEventId.trim() || null
              if (mode === 'create') {
                onSubmit({
                  mode: 'create',
                  body: {
                    name: name.trim(),
                    shortName: shortName.trim() || null,
                    electionType,
                    status,
                    pollDate: iso,
                    ...scopeFields,
                    legislatureTermStart: termStartIso,
                    legislatureTermEnd: termEndIso,
                    voterTurnoutPercent: turnoutBody,
                    totalSeats: totalSeatsParsed,
                    description: optionalRichTextHtmlOrNull(description),
                    eventId: eventIdBody,
                    ...chronologyExtra,
                  },
                })
              } else {
                onSubmit({
                  mode: 'edit',
                  id: initial!.id,
                  body: {
                    name: name.trim(),
                    shortName: shortName.trim() || null,
                    electionType,
                    status,
                    pollDate: iso,
                    ...scopeFields,
                    legislatureTermStart: termStartIso,
                    legislatureTermEnd: termEndIso,
                    voterTurnoutPercent: turnoutBody,
                    totalSeats: totalSeatsParsed,
                    description: optionalRichTextHtmlOrNull(description),
                    eventId: eventIdBody,
                    ...chronologyExtra,
                  },
                })
              }
            }}
          >
            저장
          </PersonRegisterModalPrimaryBtn>
        }
      >
        <FormRows>
          <TabNavigation $hugContent>
            <TabButton
              type="button"
              $active={electionFormTab === 'basic'}
              onClick={() => setElectionFormTab('basic')}
            >
              <FiInfo size={16} />
              기본
            </TabButton>
            <TabButton
              type="button"
              $active={electionFormTab === 'legislature'}
              onClick={() => setElectionFormTab('legislature')}
            >
              <FiCalendar size={16} />
              의회·임기
            </TabButton>
            <TabButton
              type="button"
              $active={electionFormTab === 'stats'}
              onClick={() => setElectionFormTab('stats')}
            >
              <FiBarChart2 size={16} />
              집계·설명
            </TabButton>
          </TabNavigation>
          {electionFormTab === 'basic' && (
            <>
              <FieldRow>
                <FieldLabel htmlFor="election-form-name">
                  명칭 <Required>*</Required>
                </FieldLabel>
                <ModalFieldWide>
                  <Input
                    id="election-form-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="off"
                    aria-required
                  />
                </ModalFieldWide>
              </FieldRow>
              <FieldRow>
                <FieldLabel>짧은 이름</FieldLabel>
                <ModalFieldMedium>
                  <Input
                    value={shortName}
                    onChange={(event) => setShortName(event.target.value)}
                  />
                </ModalFieldMedium>
              </FieldRow>
              <FieldRow>
                <FieldLabel htmlFor="election-form-linked-event">
                  연결 사건 (선택)
                </FieldLabel>
                <ModalFieldWide>
                  <Input
                    id="election-form-linked-event"
                    value={linkedEventId}
                    onChange={(e) => setLinkedEventId(e.target.value)}
                    placeholder="Event UUID — 비우면 연결 해제"
                    autoComplete="off"
                  />
                </ModalFieldWide>
              </FieldRow>
              {showHistoricalCountryPicker ? (
                <FieldRow>
                  <FieldLabel>역사 국가</FieldLabel>
                  <ModalFieldWide>
                    <FormSelectNative
                      value={scopeHistoricalCountryId}
                      onChange={(e) =>
                        setScopeHistoricalCountryId(e.target.value)
                      }
                      aria-label="역사 국가 (선택)"
                    >
                      <option value="">(미지정 · 이 현대 국가에만 연결)</option>
                      {[...historicalCountryOptions]
                        .sort((a, b) =>
                          a.name.localeCompare(b.name, 'ko', {
                            sensitivity: 'base',
                          }),
                        )
                        .map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.name}
                          </option>
                        ))}
                    </FormSelectNative>
                  </ModalFieldWide>
                </FieldRow>
              ) : null}
              <FieldRow>
                <FieldLabel>유형</FieldLabel>
                <ModalFieldNarrow>
                  <FormSelectNative
                    value={electionType}
                    onChange={(event) => setElectionType(event.target.value)}
                  >
                    {ELECTION_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </FormSelectNative>
                </ModalFieldNarrow>
              </FieldRow>
              <FieldRow>
                <FieldLabel>상태</FieldLabel>
                <ModalFieldNarrow>
                  <FormSelectNative
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                  >
                    {ELECTION_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </FormSelectNative>
                </ModalFieldNarrow>
              </FieldRow>
              <FieldRow>
                <FieldLabel>회차(숫자)</FieldLabel>
                <ModalFieldNarrow>
                  <Input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={convOrdinalStr}
                    onChange={(e) =>
                      setConvOrdinalStr(
                        sanitizeNonNegativeIntInput(e.target.value),
                      )
                    }
                    placeholder="예: 21 · 동일 국가·유형 내 순번"
                  />
                </ModalFieldNarrow>
              </FieldRow>
              <FieldRow>
                <FieldLabel>
                  투표일 <Required>*</Required>
                </FieldLabel>
                <FieldControl $variant="datePair">
                  <SelectClearRow style={{ maxWidth: '100%' }}>
                    <DateFieldBtn
                      type="button"
                      $hasValue={!!pollDate}
                      onClick={() => {
                        playClickSound()
                        setPollModalOpen(true)
                      }}
                      aria-required
                    >
                      <FiCalendar size={16} />
                      <span>
                        {pollDate ? formatPollYmdKo(pollDate) : '투표일 (달력)'}
                      </span>
                      <FiChevronDown size={20} />
                    </DateFieldBtn>
                    {pollDate ? (
                      <ClearFieldBtn
                        type="button"
                        onClick={() => {
                          playClickSound()
                          setPollDate('')
                        }}
                        aria-label="투표일 지우기"
                      >
                        <FiX size={16} />
                      </ClearFieldBtn>
                    ) : null}
                  </SelectClearRow>
                </FieldControl>
              </FieldRow>
              <FieldRow>
                <FieldLabel>투표 종료일 (선택)</FieldLabel>
                <FieldControl $variant="datePair">
                  <SelectClearRow style={{ maxWidth: '100%' }}>
                    <DateFieldBtn
                      type="button"
                      $hasValue={!!pollEndYmd}
                      onClick={() => {
                        playClickSound()
                        setPollEndModalOpen(true)
                      }}
                    >
                      <FiCalendar size={16} />
                      <span>
                        {pollEndYmd
                          ? formatPollYmdKo(pollEndYmd)
                          : '기간 투표·개표 종료일'}
                      </span>
                      <FiChevronDown size={20} />
                    </DateFieldBtn>
                    {pollEndYmd ? (
                      <ClearFieldBtn
                        type="button"
                        onClick={() => {
                          playClickSound()
                          setPollEndYmd('')
                        }}
                        aria-label="투표 종료일 지우기"
                      >
                        <FiX size={16} />
                      </ClearFieldBtn>
                    ) : null}
                  </SelectClearRow>
                </FieldControl>
              </FieldRow>
            </>
          )}
          {electionFormTab === 'legislature' && (
            <>
              <FieldRow>
                <FieldLabel>의회 임기 시작</FieldLabel>
                <FieldControl $variant="datePair">
                  <SelectClearRow style={{ maxWidth: '100%' }}>
                    <DateFieldBtn
                      type="button"
                      $hasValue={!!legTermStart}
                      onClick={() => {
                        playClickSound()
                        setTermStartModalOpen(true)
                      }}
                    >
                      <FiCalendar size={16} />
                      <span>
                        {legTermStart
                          ? formatPollYmdKo(legTermStart)
                          : '임기 시작일 (선택)'}
                      </span>
                      <FiChevronDown size={20} />
                    </DateFieldBtn>
                    {legTermStart ? (
                      <ClearFieldBtn
                        type="button"
                        onClick={() => {
                          playClickSound()
                          setLegTermStart('')
                        }}
                        aria-label="의회 임기 시작일 지우기"
                      >
                        <FiX size={16} />
                      </ClearFieldBtn>
                    ) : null}
                  </SelectClearRow>
                </FieldControl>
              </FieldRow>
              <FieldRow>
                <FieldLabel>의회 임기 종료</FieldLabel>
                <FieldControl $variant="datePair">
                  <SelectClearRow style={{ maxWidth: '100%' }}>
                    <DateFieldBtn
                      type="button"
                      $hasValue={!!legTermEnd}
                      onClick={() => {
                        playClickSound()
                        setTermEndModalOpen(true)
                      }}
                    >
                      <FiCalendar size={16} />
                      <span>
                        {legTermEnd
                          ? formatPollYmdKo(legTermEnd)
                          : '임기 종료일 (선택)'}
                      </span>
                      <FiChevronDown size={20} />
                    </DateFieldBtn>
                    {legTermEnd ? (
                      <ClearFieldBtn
                        type="button"
                        onClick={() => {
                          playClickSound()
                          setLegTermEnd('')
                        }}
                        aria-label="의회 임기 종료일 지우기"
                      >
                        <FiX size={16} />
                      </ClearFieldBtn>
                    ) : null}
                  </SelectClearRow>
                </FieldControl>
              </FieldRow>
              <FieldRow>
                <FieldLabel>이번 의회 실제 종료 유형</FieldLabel>
                <ModalFieldNarrow>
                  <FormSelectNative
                    value={resultingClosureKind}
                    onChange={(e) => setResultingClosureKind(e.target.value)}
                  >
                    <option value="">(미지정)</option>
                    {LEGISLATURE_CLOSURE_KIND_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </FormSelectNative>
                </ModalFieldNarrow>
              </FieldRow>
              <FieldRow>
                <FieldLabel>실제 종료·해산일</FieldLabel>
                <FieldControl $variant="datePair">
                  <SelectClearRow style={{ maxWidth: '100%' }}>
                    <DateFieldBtn
                      type="button"
                      $hasValue={!!resultingClosureYmd}
                      onClick={() => {
                        playClickSound()
                        setResultingClosureModalOpen(true)
                      }}
                    >
                      <FiCalendar size={16} />
                      <span>
                        {resultingClosureYmd
                          ? formatPollYmdKo(resultingClosureYmd)
                          : '일자 선택'}
                      </span>
                      <FiChevronDown size={20} />
                    </DateFieldBtn>
                    {resultingClosureYmd ? (
                      <ClearFieldBtn
                        type="button"
                        onClick={() => {
                          playClickSound()
                          setResultingClosureYmd('')
                        }}
                        aria-label="실제 종료일 지우기"
                      >
                        <FiX size={16} />
                      </ClearFieldBtn>
                    ) : null}
                  </SelectClearRow>
                </FieldControl>
              </FieldRow>
              <FieldRow>
                <FieldLabel>이번 의회 종료 서술</FieldLabel>
                <FullWidthControl>
                  <HistoryArticleEditorWrap>
                    <RichTextEditor
                      value={resultingDissolutionNotes}
                      onChange={setResultingDissolutionNotes}
                      placeholder="정시 만료·조기 해산 등 (선택)"
                      entityLinkCountryId={resolvedEntityLinkCountryId}
                      onImageUpload={uploadElectionRichTextImage}
                    />
                  </HistoryArticleEditorWrap>
                </FullWidthControl>
              </FieldRow>
            </>
          )}
          {electionFormTab === 'stats' && (
            <>
              <FieldRow>
                <FieldLabel>투표율(참여) %</FieldLabel>
                <ModalFieldNarrow>
                  <Input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={voterTurnout}
                    onChange={(event) =>
                      setVoterTurnout(sanitizePercentInput(event.target.value))
                    }
                    placeholder="0–100 · 소수 첫째 자리까지"
                  />
                </ModalFieldNarrow>
              </FieldRow>
              <FieldRow>
                <FieldLabel>총 의석</FieldLabel>
                <ModalFieldNarrow>
                  <Input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={totalSeatsStr}
                    onChange={(event) =>
                      setTotalSeatsStr(
                        sanitizeNonNegativeIntInput(event.target.value),
                      )
                    }
                    placeholder="0 이상 정수"
                  />
                </ModalFieldNarrow>
              </FieldRow>
              <FieldRow>
                <FieldLabel>설명</FieldLabel>
                <FullWidthControl>
                  <HistoryArticleEditorWrap>
                    <RichTextEditor
                      value={description}
                      onChange={setDescription}
                      placeholder="선거에 대한 부가 설명 (선택)"
                      entityLinkCountryId={resolvedEntityLinkCountryId}
                      onImageUpload={uploadElectionRichTextImage}
                    />
                  </HistoryArticleEditorWrap>
                </FullWidthControl>
              </FieldRow>
            </>
          )}
        </FormRows>
      </ElectionsModalShell>
      <DatePickerModal
        isOpen={pollModalOpen}
        onClose={() => setPollModalOpen(false)}
        onSelect={(date) => {
          setPollDate(date)
          setPollModalOpen(false)
        }}
        initialDate={pollDate}
        title="투표일 선택"
      />
      <DatePickerModal
        isOpen={termStartModalOpen}
        onClose={() => setTermStartModalOpen(false)}
        onSelect={(date) => {
          setLegTermStart(date)
          setTermStartModalOpen(false)
        }}
        initialDate={legTermStart}
        title="의회 임기 시작일"
      />
      <DatePickerModal
        isOpen={termEndModalOpen}
        onClose={() => setTermEndModalOpen(false)}
        onSelect={(date) => {
          setLegTermEnd(date)
          setTermEndModalOpen(false)
        }}
        initialDate={legTermEnd}
        title="의회 임기 종료일"
      />
      <DatePickerModal
        isOpen={pollEndModalOpen}
        onClose={() => setPollEndModalOpen(false)}
        onSelect={(date) => {
          setPollEndYmd(date)
          setPollEndModalOpen(false)
        }}
        initialDate={pollEndYmd}
        title="투표 종료일"
      />
      <DatePickerModal
        isOpen={resultingClosureModalOpen}
        onClose={() => setResultingClosureModalOpen(false)}
        onSelect={(date) => {
          setResultingClosureYmd(date)
          setResultingClosureModalOpen(false)
        }}
        initialDate={resultingClosureYmd}
        title="이번 의회 실제 종료·해산일"
      />
    </>
  )
}

function CandidacyFormModal({
  persons,
  parties,
  districts,
  mode,
  electionId,
  initial,
  saving,
  onClose,
  onSubmit,
}: {
  persons: PersonResponseDto[]
  parties: { id: string; name: string; shortName?: string | null }[]
  districts: { id: string; name: string; code?: string | null }[]
  mode: 'create' | 'edit'
  electionId: string
  initial?: ElectionCandidacyDto
  saving: boolean
  onClose: () => void
  onSubmit: (p: {
    mode: 'create' | 'edit'
    electionId: string
    candidacyId?: string
    body: Parameters<typeof createElectionCandidacy>[1]
  }) => void
}) {
  const [personId, setPersonId] = useState(initial?.personId ?? '')
  const [partyId, setPartyId] = useState(initial?.partyId ?? '')
  const [districtId, setDistrictId] = useState(
    initial?.electoralDistrictId ?? '',
  )
  const [nominationType, setNominationType] = useState(
    initial?.nominationType ?? 'PARTY_NOMINATION',
  )
  const [ballotOrder, setBallotOrder] = useState(
    initial?.ballotOrder != null ? String(initial.ballotOrder) : '',
  )
  const [listRank, setListRank] = useState(
    initial?.listRank != null ? String(initial.listRank) : '',
  )
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [personModalOpen, setPersonModalOpen] = useState(false)

  const selectedPerson = useMemo(
    () => persons.find((p) => p.id === personId) ?? null,
    [persons, personId],
  )

  const title = mode === 'create' ? '후보 추가' : '후보 수정'

  return (
    <ElectionsModalShell
      title={title}
      onClose={onClose}
      maxWidth="min(1120px, 96vw)"
      footer={
        <PersonRegisterModalPrimaryBtn
          type="button"
          disabled={saving}
          onClick={() => {
            const ballotOrderParsed = parseOptionalNonNegativeInt(ballotOrder)
            if (ballotOrderParsed === 'invalid') {
              toast.error('기표 순서는 0 이상의 정수이거나 비워 두세요.')
              return
            }
            const listRankParsed = parseOptionalNonNegativeInt(listRank)
            if (listRankParsed === 'invalid') {
              toast.error('비례 순번은 0 이상의 정수이거나 비워 두세요.')
              return
            }
            const body: Parameters<typeof createElectionCandidacy>[1] = {
              personId: personId || null,
              partyId: partyId || null,
              electoralDistrictId: districtId || null,
              nominationType,
              ballotOrder: ballotOrderParsed,
              listRank: listRankParsed,
              notes: notes.trim() || null,
            }
            if (mode === 'create')
              onSubmit({ mode: 'create', electionId, body })
            else
              onSubmit({
                mode: 'edit',
                electionId,
                candidacyId: initial!.id,
                body,
              })
          }}
        >
          저장
        </PersonRegisterModalPrimaryBtn>
      }
    >
      <FormRows>
        <PersonSelectField
          label="인물 (선택)"
          value={personId}
          selectedPerson={selectedPerson}
          persons={persons}
          isModalOpen={personModalOpen}
          onModalOpenChange={setPersonModalOpen}
          onSelect={(id) => setPersonId(id)}
          hint="비례 정당 전용 행 등 인물이 없을 수 있습니다."
        />
        <FieldRow>
          <FieldLabel>정당</FieldLabel>
          <ModalFieldWide>
            <FormSelectNative
              value={partyId}
              onChange={(e) => setPartyId(e.target.value)}
            >
              <option value="">(없음)</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.shortName || p.name}
                </option>
              ))}
            </FormSelectNative>
          </ModalFieldWide>
        </FieldRow>
        <FieldRow>
          <FieldLabel>선거구</FieldLabel>
          <ModalFieldWide>
            <FormSelectNative
              value={districtId}
              onChange={(e) => setDistrictId(e.target.value)}
            >
              <option value="">(없음)</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code ? `${d.name} (${d.code})` : d.name}
                </option>
              ))}
            </FormSelectNative>
          </ModalFieldWide>
        </FieldRow>
        <FieldRow>
          <FieldLabel>지명 방식</FieldLabel>
          <ModalFieldNarrow>
            <FormSelectNative
              value={nominationType}
              onChange={(e) => setNominationType(e.target.value)}
            >
              {NOMINATION_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </FormSelectNative>
          </ModalFieldNarrow>
        </FieldRow>
        <FieldRow>
          <FieldLabel>기표 순서</FieldLabel>
          <ModalFieldNarrow>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={ballotOrder}
              onChange={(e) => setBallotOrder(e.target.value)}
              placeholder="0 이상 정수"
            />
          </ModalFieldNarrow>
        </FieldRow>
        <FieldRow>
          <FieldLabel>비례 순번</FieldLabel>
          <ModalFieldNarrow>
            <Input
              type="text"
              inputMode="numeric"
              value={listRank}
              onChange={(e) =>
                setListRank(sanitizeNonNegativeIntInput(e.target.value))
              }
              placeholder="0 이상 정수"
            />
          </ModalFieldNarrow>
        </FieldRow>
        <FieldRow>
          <FieldLabel>메모</FieldLabel>
          <ModalFieldWide>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
            />
          </ModalFieldWide>
        </FieldRow>
      </FormRows>
    </ElectionsModalShell>
  )
}

function ResultFormModal({
  initial,
  saving,
  onClose,
  onSubmit,
}: {
  initial?: ElectionCandidacyDto['result']
  saving: boolean
  onClose: () => void
  onSubmit: (body: Parameters<typeof upsertCandidacyResult>[2]) => void
}) {
  const [votes, setVotes] = useState(initial?.votes ?? '')
  const [pct, setPct] = useState(
    initial?.voteSharePercent != null &&
      String(initial.voteSharePercent).trim() !== ''
      ? formatPercentOneDecimalForInput(initial.voteSharePercent)
      : '',
  )
  const [rank, setRank] = useState(
    initial?.resultRank != null ? String(initial.resultRank) : '',
  )
  const [seatsWon, setSeatsWon] = useState(
    initial?.seatsWon != null ? String(initial.seatsWon) : '',
  )
  const [elected, setElected] = useState(initial?.elected ?? false)
  const [notes, setNotes] = useState(initial?.notes ?? '')

  return (
    <ElectionsModalShell
      title="득표·결과"
      onClose={onClose}
      footer={
        <PersonRegisterModalPrimaryBtn
          type="button"
          disabled={saving}
          onClick={() => {
            const votesParsed = parseOptionalVotesDigits(votes)
            if (votesParsed === 'invalid') {
              toast.error('득표수는 숫자만 입력하거나 비워 두세요.')
              return
            }
            const pctParsed = parseOptionalPercent0to100(pct)
            if (pctParsed === 'invalid') {
              toast.error(
                '득표율은 0~100 사이 숫자(소수 첫째 자리까지)이거나 비워 두세요.',
              )
              return
            }
            const rankParsed = parseOptionalNonNegativeInt(rank)
            if (rankParsed === 'invalid') {
              toast.error('순위는 0 이상의 정수이거나 비워 두세요.')
              return
            }
            const seatsParsed = parseOptionalNonNegativeInt(seatsWon)
            if (seatsParsed === 'invalid') {
              toast.error('의석 수는 0 이상의 정수이거나 비워 두세요.')
              return
            }
            onSubmit({
              votes: votesParsed,
              voteSharePercent: pctParsed === null ? null : String(pctParsed),
              resultRank: rankParsed,
              seatsWon: seatsParsed,
              elected,
              notes: notes.trim() || null,
            })
          }}
        >
          저장
        </PersonRegisterModalPrimaryBtn>
      }
    >
      <FormRows>
        <FieldRow>
          <FieldLabel>득표수</FieldLabel>
          <FullWidthControl>
            <Input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={votes}
              onChange={(e) => setVotes(sanitizeVoteCountInput(e.target.value))}
            />
          </FullWidthControl>
        </FieldRow>
        <FieldRow>
          <FieldLabel>득표율 (%)</FieldLabel>
          <ModalFieldNarrow>
            <Input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={pct}
              onChange={(e) => setPct(sanitizePercentInput(e.target.value))}
              placeholder="0–100 · 소수 첫째 자리"
            />
          </ModalFieldNarrow>
        </FieldRow>
        <FieldRow>
          <FieldLabel>순위</FieldLabel>
          <FullWidthControl>
            <Input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={rank}
              onChange={(e) =>
                setRank(sanitizeNonNegativeIntInput(e.target.value))
              }
              placeholder="0 이상 정수 · 없으면 비움"
            />
          </FullWidthControl>
        </FieldRow>
        <FieldRow>
          <FieldLabel>의석 수</FieldLabel>
          <FullWidthControl>
            <Input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={seatsWon}
              onChange={(e) =>
                setSeatsWon(sanitizeNonNegativeIntInput(e.target.value))
              }
              placeholder="비례·다선거구 등 (없으면 비움)"
            />
          </FullWidthControl>
        </FieldRow>
        <CheckboxRow>
          <input
            type="checkbox"
            id="result-elected"
            checked={elected}
            onChange={(e) => setElected(e.target.checked)}
          />
          <label htmlFor="result-elected">당선 처리</label>
        </CheckboxRow>
        <FieldRow>
          <FieldLabel>메모</FieldLabel>
          <FullWidthControl>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </FullWidthControl>
        </FieldRow>
      </FormRows>
    </ElectionsModalShell>
  )
}

function BallotResultFormModal({
  option,
  saving,
  onClose,
  onSubmit,
}: {
  option: ElectionBallotOptionDto
  saving: boolean
  onClose: () => void
  onSubmit: (body: Parameters<typeof upsertBallotOptionResult>[2]) => void
}) {
  const [votes, setVotes] = useState(option.result?.votes ?? '')
  const [pct, setPct] = useState(
    option.result?.voteSharePercent != null &&
      String(option.result.voteSharePercent).trim() !== ''
      ? formatPercentOneDecimalForInput(option.result.voteSharePercent)
      : '',
  )
  const [notes, setNotes] = useState(option.result?.notes ?? '')

  return (
    <ElectionsModalShell
      title={`「${option.label}」집계`}
      onClose={onClose}
      footer={
        <PersonRegisterModalPrimaryBtn
          type="button"
          disabled={saving}
          onClick={() => {
            const votesParsed = parseOptionalVotesDigits(votes)
            if (votesParsed === 'invalid') {
              toast.error('득표수는 숫자만 입력하거나 비워 두세요.')
              return
            }
            const pctParsed = parseOptionalPercent0to100(pct)
            if (pctParsed === 'invalid') {
              toast.error(
                '득표율은 0~100 사이 숫자(소수 첫째 자리까지)이거나 비워 두세요.',
              )
              return
            }
            onSubmit({
              votes: votesParsed,
              voteSharePercent: pctParsed === null ? null : String(pctParsed),
              notes: notes.trim() || null,
            })
          }}
        >
          저장
        </PersonRegisterModalPrimaryBtn>
      }
    >
      <FormRows>
        <FieldRow>
          <FieldLabel>득표수</FieldLabel>
          <FullWidthControl>
            <Input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={votes}
              onChange={(e) => setVotes(sanitizeVoteCountInput(e.target.value))}
            />
          </FullWidthControl>
        </FieldRow>
        <FieldRow>
          <FieldLabel>득표율 (%)</FieldLabel>
          <ModalFieldNarrow>
            <Input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={pct}
              onChange={(e) => setPct(sanitizePercentInput(e.target.value))}
              placeholder="0–100 · 소수 첫째 자리"
            />
          </ModalFieldNarrow>
        </FieldRow>
        <FieldRow>
          <FieldLabel>메모</FieldLabel>
          <FullWidthControl>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </FullWidthControl>
        </FieldRow>
      </FormRows>
    </ElectionsModalShell>
  )
}

function PartyResultFormModal({
  mode,
  parties,
  existingPartyIds,
  existingResults,
  electionTotalSeats,
  initialRow,
  saving,
  onClose,
  onSubmit,
}: {
  mode: 'create' | 'edit'
  parties: { id: string; name: string; shortName?: string | null }[]
  existingPartyIds: string[]
  existingResults: ElectionPartyResultDto[]
  electionTotalSeats: number | null
  initialRow?: ElectionPartyResultDto
  saving: boolean
  onClose: () => void
  onSubmit: (
    partyId: string,
    body: Parameters<typeof upsertElectionPartyResult>[2],
  ) => void
}) {
  const [partyId, setPartyId] = useState(initialRow?.partyId ?? '')
  const [votes, setVotes] = useState(initialRow?.votes ?? '')
  const [pct, setPct] = useState(
    initialRow?.voteSharePercent != null &&
      String(initialRow.voteSharePercent).trim() !== ''
      ? formatPercentOneDecimalForInput(initialRow.voteSharePercent)
      : '',
  )
  const [seats, setSeats] = useState(
    initialRow?.seatsWon != null ? String(initialRow.seatsWon) : '',
  )
  const [notes, setNotes] = useState(initialRow?.notes ?? '')

  const partyChoices = useMemo(() => {
    if (mode === 'edit') return []
    return parties.filter((party) => !existingPartyIds.includes(party.id))
  }, [mode, parties, existingPartyIds])

  /** 다른 정당들의 득표수 합 (bigint). 수정 모드에서는 본인 행을 제외 */
  const otherVotesSum = useMemo(() => {
    let sum = 0n
    const selfPartyId = mode === 'edit' ? initialRow?.partyId : null
    for (const r of existingResults) {
      if (selfPartyId && r.partyId === selfPartyId) continue
      const s =
        r.votes != null ? String(r.votes).trim().replace(/[\s,]/g, '') : ''
      if (!s || !/^\d+$/.test(s)) continue
      try {
        sum += BigInt(s)
      } catch {
        /* ignore */
      }
    }
    return sum
  }, [existingResults, mode, initialRow?.partyId])

  /** 다른 정당들의 의석 합 */
  const otherSeatsSum = useMemo(() => {
    let sum = 0
    const selfPartyId = mode === 'edit' ? initialRow?.partyId : null
    for (const r of existingResults) {
      if (selfPartyId && r.partyId === selfPartyId) continue
      if (r.seatsWon != null && Number.isFinite(r.seatsWon)) sum += r.seatsWon
    }
    return sum
  }, [existingResults, mode, initialRow?.partyId])

  /** 다른 정당들의 득표율 합 */
  const otherVoteShareSum = useMemo(() => {
    let sum = 0
    const selfPartyId = mode === 'edit' ? initialRow?.partyId : null
    for (const r of existingResults) {
      if (selfPartyId && r.partyId === selfPartyId) continue
      const num = Number(r.voteSharePercent)
      if (Number.isFinite(num) && num >= 0) sum += num
    }
    return sum
  }, [existingResults, mode, initialRow?.partyId])

  /** 합계 미리보기: 현재 입력값 포함 */
  const preview = useMemo(() => {
    const votesRaw = votes.replace(/[\s,]/g, '')
    let mineVotes: bigint | null = null
    if (/^\d+$/.test(votesRaw))
      try {
        mineVotes = BigInt(votesRaw)
      } catch {
        /* ignore */
      }
    const pctNum = Number(pct)
    const minePct =
      pct.trim() !== '' && Number.isFinite(pctNum) && pctNum >= 0
        ? pctNum
        : null
    const seatsNum = Number(seats)
    const mineSeats =
      seats.trim() !== '' &&
      Number.isFinite(seatsNum) &&
      Number.isInteger(seatsNum) &&
      seatsNum >= 0
        ? seatsNum
        : null
    return {
      totalVotes:
        mineVotes != null ? otherVotesSum + mineVotes : otherVotesSum,
      totalVoteShare:
        minePct != null ? otherVoteShareSum + minePct : otherVoteShareSum,
      totalSeats: otherSeatsSum + (mineSeats ?? 0),
      mineVotes,
      minePct,
      mineSeats,
    }
  }, [votes, pct, seats, otherVotesSum, otherVoteShareSum, otherSeatsSum])

  /** 득표율 자동 계산 — votes / (otherVotes + votes) * 100 */
  const handleAutoFillPct = useCallback(() => {
    const sanitized = votes.replace(/[\s,]/g, '')
    if (!/^\d+$/.test(sanitized) || sanitized === '') {
      toast.error('득표수를 먼저 입력하세요.')
      return
    }
    let mine: bigint
    try {
      mine = BigInt(sanitized)
    } catch {
      toast.error('득표수를 숫자로 입력하세요.')
      return
    }
    const total = otherVotesSum + mine
    if (total <= 0n) {
      toast.error('다른 정당의 득표 데이터가 없어 계산할 수 없습니다.')
      return
    }
    // BigInt 나눗셈 정밀도 유지: 천 배 곱해 정수 나눗셈 후 소수 자리 복원
    const ratioThousandths = Number((mine * 100000n) / total) / 1000
    const rounded = Math.round(ratioThousandths * 10) / 10
    setPct(String(rounded))
    toast.success(
      `자동 계산: 득표 합 ${total.toLocaleString('ko-KR')} 기준 ${rounded}% 적용.`,
    )
  }, [votes, otherVotesSum])

  /** 잔여 의석 힌트: totalSeats - otherSeats - mine */
  const seatsRemainingHint = useMemo(() => {
    if (electionTotalSeats == null || !Number.isFinite(electionTotalSeats))
      return null
    const mine = Number(seats)
    const mineN = Number.isFinite(mine) && seats.trim() !== '' ? mine : 0
    return electionTotalSeats - otherSeatsSum - mineN
  }, [electionTotalSeats, otherSeatsSum, seats])

  return (
    <ElectionsModalShell
      title={mode === 'create' ? '정당 집계 추가' : '정당 집계 수정'}
      onClose={onClose}
      maxWidth="min(1120px, 96vw)"
      footer={
        <PersonRegisterModalPrimaryBtn
          type="button"
          disabled={saving}
          onClick={() => {
            const targetPartyId =
              mode === 'edit' ? initialRow!.partyId : partyId
            if (!targetPartyId) {
              toast.error('정당을 선택하세요.')
              return
            }
            const votesParsed = parseOptionalVotesDigits(votes)
            if (votesParsed === 'invalid') {
              toast.error('득표수는 숫자만 입력하거나 비워 두세요.')
              return
            }
            const pctParsed = parseOptionalPercent0to100(pct)
            if (pctParsed === 'invalid') {
              toast.error(
                '득표율은 0~100 사이 숫자(소수 첫째 자리까지)이거나 비워 두세요.',
              )
              return
            }
            const seatsParsed = parseOptionalNonNegativeInt(seats)
            if (seatsParsed === 'invalid') {
              toast.error('의석은 0 이상의 정수이거나 비워 두세요.')
              return
            }
            onSubmit(targetPartyId, {
              votes: votesParsed,
              voteSharePercent: pctParsed === null ? null : String(pctParsed),
              seatsWon: seatsParsed,
              notes: notes.trim() || null,
            })
          }}
        >
          저장
        </PersonRegisterModalPrimaryBtn>
      }
    >
      <FormRows>
        <PartyFormPreviewCard aria-label="선거 전체 합계 미리보기">
          <PartyFormPreviewTitle>전체 합계 미리보기</PartyFormPreviewTitle>
          <PartyFormPreviewGrid>
            <PartyFormPreviewItem>
              <PartyFormPreviewLabel>의석</PartyFormPreviewLabel>
              <PartyFormPreviewValue
                $tone={
                  electionTotalSeats != null
                    ? preview.totalSeats > electionTotalSeats
                      ? 'error'
                      : preview.totalSeats === electionTotalSeats
                        ? 'ok'
                        : undefined
                    : undefined
                }
              >
                {preview.totalSeats}
                {electionTotalSeats != null ? ` / ${electionTotalSeats}` : ''}
                석
              </PartyFormPreviewValue>
              <PartyFormPreviewDelta>
                다른 {otherSeatsSum}석 + 이 정당{' '}
                {preview.mineSeats ?? '—'}
                {preview.mineSeats != null ? '석' : ''}
              </PartyFormPreviewDelta>
            </PartyFormPreviewItem>
            <PartyFormPreviewItem>
              <PartyFormPreviewLabel>득표율 합</PartyFormPreviewLabel>
              <PartyFormPreviewValue
                $tone={
                  Math.abs(preview.totalVoteShare - 100) <= 0.5
                    ? 'ok'
                    : preview.totalVoteShare > 100
                      ? 'error'
                      : preview.totalVoteShare > 0
                        ? 'warn'
                        : undefined
                }
              >
                {preview.totalVoteShare.toFixed(2)}%
              </PartyFormPreviewValue>
              <PartyFormPreviewDelta>
                다른 {otherVoteShareSum.toFixed(2)}% + 이 정당{' '}
                {preview.minePct != null ? `${preview.minePct}%` : '—'}
              </PartyFormPreviewDelta>
            </PartyFormPreviewItem>
            <PartyFormPreviewItem>
              <PartyFormPreviewLabel>득표수 합</PartyFormPreviewLabel>
              <PartyFormPreviewValue>
                {preview.totalVotes.toLocaleString('ko-KR')}표
              </PartyFormPreviewValue>
              <PartyFormPreviewDelta>
                다른 {otherVotesSum.toLocaleString('ko-KR')}표 + 이 정당{' '}
                {preview.mineVotes != null
                  ? `${preview.mineVotes.toLocaleString('ko-KR')}표`
                  : '—'}
              </PartyFormPreviewDelta>
            </PartyFormPreviewItem>
          </PartyFormPreviewGrid>
        </PartyFormPreviewCard>
        <FieldRow>
          <FieldLabel>
            {mode === 'create' ? (
              <>
                정당 <Required>*</Required>
              </>
            ) : (
              '정당'
            )}
          </FieldLabel>
          <ModalFieldWide>
            {mode === 'create' ? (
              <FormSelectNative
                value={partyId}
                onChange={(event) => setPartyId(event.target.value)}
                aria-required
              >
                <option value="">정당 선택</option>
                {partyChoices.map((party) => (
                  <option key={party.id} value={party.id}>
                    {party.shortName || party.name}
                  </option>
                ))}
              </FormSelectNative>
            ) : (
              <PartyTableCellStrong>
                {initialRow?.party?.shortName ||
                  initialRow?.party?.name ||
                  initialRow?.partyId}
              </PartyTableCellStrong>
            )}
          </ModalFieldWide>
        </FieldRow>
        <FieldRow>
          <FieldLabel>득표수</FieldLabel>
          <ModalFieldMedium>
            <Input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={votes}
              onChange={(e) => setVotes(sanitizeVoteCountInput(e.target.value))}
            />
          </ModalFieldMedium>
        </FieldRow>
        <FieldRow>
          <FieldLabel>득표율 (%)</FieldLabel>
          <FieldControl style={{ maxWidth: '100%' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ maxWidth: 280, flex: 1 }}>
                <Input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={pct}
                  onChange={(e) => setPct(sanitizePercentInput(e.target.value))}
                  placeholder="0–100 · 소수 첫째 자리"
                />
              </div>
              <PartyFormAutoCalcBtn
                type="button"
                onClick={handleAutoFillPct}
                title="다른 정당 득표 합 + 이 정당 득표로 득표율 계산"
              >
                자동 계산
              </PartyFormAutoCalcBtn>
            </div>
            {otherVotesSum > 0n ? (
              <PartyFormHint>
                다른 정당 득표 합 {otherVotesSum.toLocaleString('ko-KR')}표 ·
                자동 계산 시 이 합과 이 정당의 득표를 더해 비율을 산출합니다.
              </PartyFormHint>
            ) : null}
          </FieldControl>
        </FieldRow>
        <FieldRow>
          <FieldLabel>의석</FieldLabel>
          <FieldControl style={{ maxWidth: '100%' }}>
            <div style={{ maxWidth: 280 }}>
              <Input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={seats}
                onChange={(e) =>
                  setSeats(sanitizeNonNegativeIntInput(e.target.value))
                }
                placeholder="0 이상 정수 · 없으면 비움"
              />
            </div>
            {electionTotalSeats != null && seatsRemainingHint != null ? (
              <PartyFormHint
                $tone={
                  seatsRemainingHint < 0
                    ? 'error'
                    : seatsRemainingHint === 0
                      ? 'ok'
                      : 'info'
                }
              >
                {seatsRemainingHint < 0
                  ? `총 의석 ${electionTotalSeats}석 초과 ${-seatsRemainingHint}석. 의석 합계를 확인하세요.`
                  : seatsRemainingHint === 0
                    ? `총 의석 ${electionTotalSeats}석과 정확히 일치합니다.`
                    : `총 의석 ${electionTotalSeats}석 · 이 행 포함 시 잔여 ${seatsRemainingHint}석.`}
              </PartyFormHint>
            ) : null}
          </FieldControl>
        </FieldRow>
        <FieldRow>
          <FieldLabel>메모</FieldLabel>
          <ModalFieldWide>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
            />
          </ModalFieldWide>
        </FieldRow>
      </FormRows>
    </ElectionsModalShell>
  )
}

const PartyFormAutoCalcBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  padding: 0 14px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99,102,241,0.18)' : '#eef2ff'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.4)' : '#c7d2fe'};
  border-radius: 10px;
  cursor: pointer;
  flex-shrink: 0;
  transition:
    background 0.15s ease,
    border-color 0.15s ease;
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.28)' : '#e0e7ff'};
    border-color: #6366f1;
  }
`

const PartyFormHint = styled.p<{ $tone?: 'info' | 'ok' | 'error' }>`
  margin: 6px 0 0;
  font-size: 11.5px;
  line-height: 1.5;
  color: ${({ $tone, theme }) =>
    $tone === 'error'
      ? 'var(--negative, #dc2626)'
      : $tone === 'ok'
        ? 'var(--positive, #16a34a)'
        : theme.colors.text.secondary};
`

/** 정당 집계 폼 미리보기 카드 */
const PartyFormPreviewCard = styled.div`
  padding: 12px 14px;
  margin-bottom: 4px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99,102,241,0.08)' : '#f5f7ff'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.22)' : '#e0e7ff'};
  border-radius: 10px;
`

const PartyFormPreviewTitle = styled.div`
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: 8px;
`

const PartyFormPreviewGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

const PartyFormPreviewItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const PartyFormPreviewLabel = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const PartyFormPreviewValue = styled.span<{
  $tone?: 'ok' | 'warn' | 'error'
}>`
  font-size: 15px;
  font-weight: 700;
  color: ${({ $tone, theme }) =>
    $tone === 'error'
      ? 'var(--negative, #dc2626)'
      : $tone === 'ok'
        ? 'var(--positive, #16a34a)'
        : $tone === 'warn'
          ? theme.mode === 'dark'
            ? '#fbbf24'
            : '#b45309'
          : theme.colors.text.primary};
`

const PartyFormPreviewDelta = styled.span`
  font-size: 10.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/** 삭제 등 확정 모달 — window.confirm 대체 */
const ConfirmDialogBox = styled.div`
  max-width: 440px;
  width: 92vw;
  padding: 20px 22px 18px;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 14px;
  box-shadow: 0 18px 60px rgba(15, 23, 42, 0.22);
`

const ConfirmDialogTitle = styled.h3`
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ConfirmDialogMessage = styled.p`
  margin: 0 0 16px;
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: pre-wrap;
`

const ConfirmDialogActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`

const ConfirmDialogActionsPrimary = styled(ConfirmDialogActions)`
  gap: 10px;
`

const ConfirmDialogCancelBtn = styled.button`
  min-width: 72px;
  height: 38px;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9'};
  }
  &:focus-visible {
    outline: 2px solid #94a3b8;
    outline-offset: 2px;
  }
`

const ConfirmDialogPrimaryBtn = styled.button<{ $danger?: boolean }>`
  min-width: 120px;
  height: 40px;
  padding: 0 20px;
  font-size: 13.5px;
  font-weight: 700;
  border-radius: 9px;
  cursor: pointer;
  border: none;
  color: #fff;
  background: ${({ $danger }) =>
    $danger ? 'var(--negative, #dc2626)' : '#6366f1'};
  box-shadow: ${({ $danger }) =>
    $danger
      ? '0 4px 14px rgba(220, 38, 38, 0.28)'
      : '0 4px 14px rgba(99, 102, 241, 0.28)'};
  transition: filter 0.15s ease;
  &:hover {
    filter: brightness(1.05);
  }
  &:active {
    filter: brightness(0.95);
  }
  &:focus-visible {
    outline: 2px solid ${({ $danger }) => ($danger ? '#b91c1c' : '#4338ca')};
    outline-offset: 2px;
  }
`

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  danger,
  onCancel,
  onConfirm,
}: {
  title: string
  message: string
  confirmLabel: string
  danger?: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCancel()
      } else if (e.key === 'Enter') {
        e.stopPropagation()
        onConfirm()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel, onConfirm])

  return createPortal(
    <PersonRegisterModalOverlay
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
    >
      <ConfirmDialogBox
        role="document"
        onClick={(e) => e.stopPropagation()}
      >
        <ConfirmDialogTitle>{title}</ConfirmDialogTitle>
        <ConfirmDialogMessage>{message}</ConfirmDialogMessage>
        <ConfirmDialogActionsPrimary>
          <ConfirmDialogCancelBtn type="button" onClick={onCancel}>
            취소
          </ConfirmDialogCancelBtn>
          <ConfirmDialogPrimaryBtn
            type="button"
            autoFocus
            $danger={danger}
            onClick={onConfirm}
          >
            {confirmLabel}
          </ConfirmDialogPrimaryBtn>
        </ConfirmDialogActionsPrimary>
      </ConfirmDialogBox>
    </PersonRegisterModalOverlay>,
    document.body,
  )
}
