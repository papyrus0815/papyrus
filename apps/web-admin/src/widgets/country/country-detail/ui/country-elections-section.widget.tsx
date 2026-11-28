import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { createPortal } from 'react-dom'

import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import {
  FiBarChart2,
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiChevronUp,
  FiColumns,
  FiEdit2,
  FiExternalLink,
  FiImage,
  FiInfo,
  FiLayers,
  FiPlus,
  FiSliders,
  FiTrash2,
  FiX,
  FiCheckSquare,
  FiUsers,
  FiUserPlus,
  FiLink,
} from 'react-icons/fi'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'

import { useCountry } from '@/entities/country/api'
import * as EventFormS from '@/pages/events/create/event-create.styles'
import {
  BentoActionBtn,
  BentoCard,
  BentoCardBadge,
  BentoCardBody,
  BentoCardHeader,
  BentoCardTitle,
  BentoCardTitleGroup,
  type SegmentSlice,
  type SparkPoint,
} from '@/entities/event/ui/bento-primitives'
import {
  DIGIT_DISPLAY,
  RADIUS,
  ledgerAccent,
  ledgerAccentBorder,
  ledgerAccentHover,
  ledgerAccentSubtle,
  ledgerChipFill,
  ledgerExpandedFill,
  ledgerHairline,
  ledgerHairlineHover,
  ledgerHairlineStrong,
  ledgerHoverFill,
  ledgerRowWash,
  ledgerSubtleFill,
} from '@/entities/event/ui/ledger-tokens'
import { usePersons } from '@/entities/person/api'
import {
  usePoliticalSystems,
  type PoliticalSystem,
} from '@/entities/political-system/api'
import {
  ELECTORAL_SYSTEM_TYPE_LABEL,
  findPoliticalSystemAtDate,
  formatPoliticalSystemContextSummary,
  GOVERNMENT_FORM_LABEL,
  HEAD_SELECTION_METHOD_LABEL,
  headOfStateTitleOf,
  PARTY_SYSTEM_LABEL,
} from '@/entities/political-system/model/political-system'
import { useHistoricalCountriesByModernCountry } from '@/features/country/api/use-historical-countries-by-modern-country.hook'
import {
  ELECTION_STATUS_OPTIONS,
  ELECTION_TYPE_OPTIONS,
  type ElectionAllianceDto,
  type ElectionAllianceInput,
  type ElectionBallotOptionDto,
  type ElectionCandidacyDto,
  type ElectionDetailDto,
  type ElectionListRow,
  type ElectionPartyResultDto,
  LEGISLATURE_CLOSURE_KIND_OPTIONS,
  type LegislatureTermClosureKind,
  NOMINATION_TYPE_OPTIONS,
  type PartyResultComparisonRowDto,
  type PoliticalPartyRow,
  createBallotOption,
  createElection,
  createElectionAlliance,
  createElectionCandidacy,
  deleteBallotOption,
  deleteElection,
  deleteElectionAlliance,
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
  createElectionNarrativeEvent,
  updateElection,
  updateElectionAlliance,
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
  type RichTextDynastyTooltipState,
  type RichTextTermTooltipState,
  useRichTextTooltipEscape,
} from '@/shared/hooks/use-rich-text-prose-click'
import {
  getPartyDisplayName,
  getPartyShortName,
} from '@/shared/lib/party-display-name'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { isLikelyRichTextHtml } from '@/shared/lib/rich-text-read-view'
import { sanitizeRichTextHtml } from '@/shared/lib/sanitize-rich-text-html'
import { pathKeys } from '@/shared/router'
import { Z_INDEX } from '@/shared/styles/z-index'
import { PopoverMenu } from '@/shared/ui/popover-menu'
import { ChartSkeleton } from '@/shared/ui/chart-skeleton/chart-skeleton'
import { LedgerTableSkeleton } from '@/shared/ui/ledger-skeleton'
import { confirm } from '@/shared/ui/confirm-dialog'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import { PersonSelectField } from '@/shared/ui/form-fields/person-select-field'
import { FormSelectNative } from '@/shared/ui/form-select-native'
import { chamberApi, chamberKeys, chamberLabel, chamberSeatsAt, labelChamberComposition, labelChamberRole } from '@/shared/api/chamber'
import { TenureRegisterPanel } from '@/shared/ui/tenure-register-panel/tenure-register-panel'
import {
  ModalBody,
  ModalBoxWide,
  ModalCloseButton,
  ModalHeader,
  ModalOverlay,
  ModalTitle,
} from '@/shared/ui/modal/modal.styles'
import {
  CheckboxRow,
  DateFieldBtn,
  FieldControl,
  FieldLabel,
  FieldRow,
  FormRows,
  Input,
  Required,
  Textarea,
} from '@/shared/ui/register-form-layout'
import { RegisterModal } from '@/shared/ui/register-modal-shell/register-modal'
import {
  FooterActions,
  HeaderActionsBar,
  RegisterFooterStatus,
  RegisterSectionJumpNav,
  activeSectionAt,
  useModalSubmitShortcut,
} from '@/shared/ui/register-modal-shell/register-modal-chrome'
import {
  PersonRegisterModalBox,
  PersonRegisterModalCancelBtn,
  PersonRegisterModalFormScroll,
  PersonRegisterModalOverlay,
  PersonRegisterModalPrimaryBtn,
  PersonRegisterModalStickyFooter,
} from '@/shared/ui/register-modal-shell/register-modal-shell'
import { RichTextEditor } from '@/shared/ui/rich-text-editor/rich-text-editor'
import { RichTextProseWithEntityClicks } from '@/shared/ui/rich-text-read-view'
import { PrimaryActionButton } from '@/shared/ui/primary-action-button'
import { SectionSubNav } from '@/shared/ui/section-sub-nav/section-sub-nav'
import { notify } from '@/shared/ui/toast'
import { PersonDetailPanel } from '@/widgets/person/person-detail-panel/person-detail-panel'

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
import * as DashboardStyles from './country-detail-dashboard.styles'
import { CountryPoliticalPartiesBlock } from './country-political-parties-block.widget'
import { LinkedEventPickerField } from './linked-event-picker-field'
import { CountryTabEmptyState } from './country-tab-empty-state'
import { ElectionAllianceFormModal, ElectionAlliancesPanel, summarizeAlliances } from './election-alliances-panel'
import * as FormS from './military-unit-form/styles'
import {
  ElectionResultHemicycle,
  politicalPositionRank,
  sortBySeatingOrder,
} from './election-result-hemicycle'
import {
  ElectionsParliamentStrip,
  type ParliamentStripItem,
} from './elections-parliament-strip'
import {
  ELECTION_STATUS_TONE,
  ELECTION_TYPE_TONE,
  LEGISLATURE_CLOSURE_TONE,
  ToneChipGroup,
  YmdDateField,
  useSplitLayoutMode,
  withTones,
} from './politics-form/politics-form-parts'
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
  DataThActions72,
  DataThActions96,
  DataThActions104,
  DataThSortButton,
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
  PartyDescEmptyHint,
  PartyDetailChip,
  PartyDetailChipMuted,
  PartyDetailChipRowCenter,
  PartyDetailDescSection,
  PartyDetailHero,
  PartyDetailHeroBody,
  PartyDetailHeroStack,
  PartyDetailHeroTitle,
  PartyDetailLogoHero,
  PartyDetailLogoImg,
  PartyDetailMetaGrid,
  PartyDetailMetaSection,
  PartyDetailMetaTile,
  PartyDetailMetaTileLabel,
  PartyDetailMetaTileValue,
  PartyMetricSegmentBtn,
  PartyMetricSegmentedGroup,
  PartyMetricTitleTight,
  PartyMetricToolbarRow,
  PartyResultDeltaTd,
  PartyShareDonutHole,
  PartyShareDonutLayout,
  PartyShareDonutRing,
  PartyShareDonutSectorGroup,
  PartyShareDonutSectorPath,
  PartyShareDonutSliceSvg,
  PartyShareInfographic,
  PartyShareLegend,
  PartyShareLegendBody,
  PartyShareLegendItem,
  PartyShareName,
  PartyShareStats,
  PartyShareSwatch,
  PartyTableCellStrong,
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
  SubsectionLabel,
  ToolbarGhostBtnSm,
} from './country-politics-tab.styles'

/** RichTextEditor HTML — 시각적 빈 본문이면 null (저장 시) */
/**
 * 등록 모달의 서술 칸(종료 서술·설명)은 textarea — 저장값은 여전히 HTML(상세 지면이 서식 있는 글로 읽는다).
 * 열 때 HTML → 줄글, 저장할 때 줄글 → <p>. 빈 줄 = 문단, 한 줄 바꿈 = <br>.
 */
function richHtmlToEditableText(html: string | null | undefined): string {
  const raw = (html ?? '').trim()
  if (!raw) return ''
  if (!raw.includes('<')) return raw
  const withBreaks = raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
  let decoded = withBreaks
  if (typeof document !== 'undefined') {
    const decoder = document.createElement('textarea')
    decoder.innerHTML = withBreaks
    decoded = decoder.value
  } else {
    decoded = withBreaks.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  }
  return decoded.replace(/\n{3,}/g, '\n\n').trim()
}

function plainTextToRichHtml(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return ''
  const escapeHtml = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return trimmed
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

/** 손대지 않은 칸은 원래 HTML 그대로(인물 링크·서식 보존), 고친 칸만 줄글 → HTML */
function editableTextToSavedHtml(
  text: string,
  originalHtml: string | null | undefined,
): string | null {
  if (text === richHtmlToEditableText(originalHtml)) {
    return optionalRichTextHtmlOrNull(originalHtml ?? '')
  }
  return optionalRichTextHtmlOrNull(plainTextToRichHtml(text))
}

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
    return new Date(iso).toLocaleDateString('ko-KR', { timeZone: 'UTC' })
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
      const y = d.getUTCFullYear()
      const m = String(d.getUTCMonth() + 1).padStart(2, '0')
      const day = String(d.getUTCDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    } catch {
      return s.slice(0, 10)
    }
  }
  try {
    const d = new Date(s)
    if (Number.isNaN(d.getTime())) return ''
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
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
  /** 스크롤 밖 하단 고정(저장 버튼 등). 닫기는 헤더 X 및 하단 취소 버튼 사용 */
  footer,
  maxWidth = 'min(1000px, 96vw)',
  /** 기본 `auto` — 짧은 폼은 내용 높이만큼 */
  minHeight = 'auto',
  /**
   * 바깥 모달 높이 고정(탭 전환 시). `PersonRegisterModalBox`의 `$height`로 전달.
   * `minHeight`만으로는 긴 탭에서 박스가 커졌다 짧은 탭에서만 줄어드는 문제가 남음.
   */
  height: fixedHeight,
  closeOnEsc = true,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  maxWidth?: string
  minHeight?: string
  height?: string
  closeOnEsc?: boolean
}) {
  return (
    <RegisterModal
      isOpen
      onClose={onClose}
      closeOnEsc={closeOnEsc}
      trapFocus={false}
      title={title}
      maxWidth={maxWidth}
      minHeight={fixedHeight ? undefined : minHeight}
      height={fixedHeight}
    >
      <PersonRegisterModalFormScroll>{children}</PersonRegisterModalFormScroll>
      {footer != null ? (
        <PersonRegisterModalStickyFooter>
          {footer}
        </PersonRegisterModalStickyFooter>
      ) : null}
    </RegisterModal>
  )
}

function formatPollDate(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('ko-KR', {
      timeZone: 'UTC',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

function formatPollYear(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    const y = d.getUTCFullYear()
    return Number.isFinite(y) ? `${y}` : String(iso).slice(0, 4)
  } catch {
    return String(iso).slice(0, 4)
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
  columnKey: string
  activeKey: string
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
  const name = getPartyDisplayName(s.row.party) || s.row.partyId
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
      row.voteSharePercent != null ? String(row.voteSharePercent).trim() : ''
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

  /* 하위 메뉴 줄의 밑선이 이미 구획한다 — 정당 블록용 '위 선 + 28px 띄움'은 여기선 겹선이 된다 */
  && {
    margin-top: 0;
    padding-top: 4px;
    border-top: none;
  }
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
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fca5a5' : '#b91c1c')};
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

/** 정당 집계 표 — 선거 연합 소속 꼬리표 */
const PartyAllianceTag = styled.span`
  flex: none;
  margin-left: 6px;
  padding: 0 6px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  line-height: 18px;
  color: ${({ theme }) => theme.colors.text.secondary};
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
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.35)' : '#c7d2fe'};
  border-radius: 6px;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.12)' : '#eef2ff'};
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

/** 시계열 비교 섹션 — 무박스 헤어라인 */
const ElectionTimelineBlock = styled.section`
  margin-top: 16px;
  padding: 14px 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 0;
  background: transparent;
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

const ElectionTimelineRow = styled.div<{
  $current?: boolean
  $interactive?: boolean
}>`
  display: grid;
  grid-template-columns: 160px 1fr 96px;
  gap: 10px;
  align-items: center;
  padding: 7px 8px;
  border-radius: 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  cursor: ${({ $interactive }) => ($interactive ? 'pointer' : 'default')};
  background: ${({ $current, theme }) =>
    $current
      ? theme.mode === 'dark'
        ? 'rgba(99,102,241,0.14)'
        : 'rgba(99,102,241,0.06)'
      : 'transparent'};
  box-shadow: ${({ $current }) =>
    $current ? 'inset 3px 0 0 #6366f1' : 'none'};
  transition: background 0.14s ease;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${({ $current, $interactive, theme }) =>
      $current
        ? theme.mode === 'dark'
          ? 'rgba(99,102,241,0.18)'
          : 'rgba(99,102,241,0.09)'
        : $interactive
          ? theme.mode === 'dark'
            ? 'rgba(255,255,255,0.04)'
            : 'rgba(15,23,42,0.025)'
          : 'transparent'};
  }
`

const EntityTableLinkBtn = styled.button`
  appearance: none;
  border: none;
  background: none;
  padding: 0;
  margin: 0;
  font: inherit;
  color: inherit;
  cursor: pointer;
  text-align: left;
  &:hover {
    color: #6366f1;
    text-decoration: underline;
  }
  &:focus-visible {
    outline: 2px solid #6366f1;
    outline-offset: 2px;
    border-radius: 3px;
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
  const queryClient = useQueryClient()
  const { data: persons = [] } = usePersons()
  const [searchParams, setSearchParams] = useSearchParams()

  const politicsViewTab: 'parties' | 'elections' =
    electionPartyId || searchParams.get('subtab') === 'parties'
      ? 'parties'
      : 'elections'

  const handlePoliticsViewTab = (tab: 'parties' | 'elections') => {
    if (tab === 'elections') {
      if (electionPartyId && routeCountryId) {
        navigate(pathKeys.countryElections(routeCountryId))
        return
      }
      setSearchParams(
        (prev) => {
          const copy = new URLSearchParams(prev)
          copy.delete('subtab')
          return copy
        },
        { replace: true },
      )
      return
    }
    if (!electionPartyId) {
      setSearchParams(
        (prev) => {
          const copy = new URLSearchParams(prev)
          copy.set('subtab', 'parties')
          return copy
        },
        { replace: true },
      )
    }
  }

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
  /** 선거 연합 등록·수정 */
  const [allianceModal, setAllianceModal] = useState<
    | { mode: 'create'; electionId: string }
    | { mode: 'edit'; electionId: string; alliance: ElectionAllianceDto }
    | null
  >(null)
  /** 당선 후보 → 공직 재임(GovernmentPositionTenure) 원스톱 연결 */
  const [tenureLinkTarget, setTenureLinkTarget] = useState<{
    candidacy: ElectionCandidacyDto
    election: ElectionDetailDto
    matchedSystem: PoliticalSystem | null
  } | null>(null)
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

  const { data: politicalSystems = [] } = usePoliticalSystems(
    scopeKey ? electionScope : {},
  )

  /** 양원제 구분: 선거 목록에 등장하는 의회 원(Chamber) 목록 */
  const distinctElectionChambers = useMemo(() => {
    const byId = new Map<
      string,
      { id: string; label: string; role: string; count: number }
    >()
    for (const row of list) {
      if (!row.chamber?.id) continue
      const existing = byId.get(row.chamber.id)
      if (existing) {
        existing.count += 1
      } else {
        byId.set(row.chamber.id, {
          id: row.chamber.id,
          label: chamberLabel(row.chamber),
          role: row.chamber.role,
          count: 1,
        })
      }
    }
    return Array.from(byId.values())
  }, [list])

  const [stripChamberId, setStripChamberId] = useState<string>(
    () => searchParams.get('chamberId') ?? '',
  )
  const effectiveStripChamberId = useMemo(() => {
    if (distinctElectionChambers.length <= 1) return ''
    if (
      stripChamberId &&
      distinctElectionChambers.some((ch) => ch.id === stripChamberId)
    ) {
      return stripChamberId
    }
    if (
      detail?.chamberId &&
      distinctElectionChambers.some((ch) => ch.id === detail.chamberId)
    ) {
      return detail.chamberId
    }
    const lowerFirst =
      distinctElectionChambers.find((ch) => ch.role !== 'UPPER') ??
      distinctElectionChambers[0]
    return lowerFirst?.id ?? ''
  }, [distinctElectionChambers, stripChamberId, detail?.chamberId])

  /* 「역대 의회 구성」 — 의석이 있는 선거 최근 8회(없으면 전체 최근 8회)의 상세를 불러 정당별 의석을 얻는다.
     양원제 국가에서 하원(예: 465석)과 상원(예: 248석) 선거가 한 띠에 번갈아 섞이지 않도록 활성 원별로 묶는다. */
  const parliamentStripElections = useMemo(() => {
    const chamberScoped = effectiveStripChamberId
      ? list.filter((row) => row.chamberId === effectiveStripChamberId)
      : list
    const baseList = chamberScoped.length > 0 ? chamberScoped : list
    const withSeats = baseList.filter((row) => (row.totalSeats ?? 0) > 0)
    const pool = withSeats.length > 0 ? withSeats : baseList
    return [...pool]
      .sort((left, right) => String(left.pollDate).localeCompare(String(right.pollDate)))
      .slice(-8)
  }, [list, effectiveStripChamberId])
  const parliamentStripQueries = useQueries({
    queries: parliamentStripElections.map((row) => ({
      queryKey: qk.detail(row.id),
      queryFn: () => getElection(row.id),
      staleTime: 60_000,
    })),
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
      if (c.party) return getPartyDisplayName(c.party)
      return '(후보 정보 없음)'
    },
    [countryForNames?.defaultNameDisplayOrder],
  )

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: qk.list(scopeKey) })
    if (selectedId)
      queryClient.invalidateQueries({ queryKey: qk.detail(selectedId) })
  }, [queryClient, scopeKey, selectedId])

  /** 선거 → 서사 사건 만들기 — 사건 목록·연표에 이 선거가 서게 한다(서버가 생성과 연결을 한 번에) */
  const narrativeEventMut = useMutation({
    mutationFn: (electionId: string) => createElectionNarrativeEvent(electionId),
    onSuccess: (result) => {
      notify.success(`‘${result.eventTitle}’ 사건을 만들어 연결했습니다`)
      invalidate()
      void queryClient.invalidateQueries({ queryKey: ['events'] })
    },
    onError: (error: Error) => {
      let message = error.message
      try {
        /* 서버 오류 본문은 { error: { message } } — 원문 JSON이 토스트에 찍히지 않게 문구만 */
        const parsed = JSON.parse(error.message) as { message?: string; error?: { message?: string } }
        message = parsed.error?.message ?? parsed.message ?? message
      } catch {
        /* 본문이 JSON이 아니면 그대로 */
      }
      notify.error(message || '사건을 만들지 못했습니다')
    },
  })

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
      notify.success('저장되었습니다.')
    },
    onError: (e: Error) => notify.error(e.message),
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
      notify.success('저장되었습니다.')
    },
    onError: (e: Error) => notify.error(e.message),
  })

  const delElectionMut = useMutation({
    mutationFn: (id: string) => deleteElection(id),
    onSuccess: () => {
      invalidate()
      setSelectedId(null)
      notify.success('삭제되었습니다.')
    },
    onError: (e: Error) => notify.error(e.message),
  })

  const saveCandidacyMut = useMutation({
    mutationFn: async (p: {
      mode: 'create' | 'edit'
      electionId: string
      candidacyId?: string
      body: Parameters<typeof createElectionCandidacy>[1]
      resultBody?: Parameters<typeof upsertCandidacyResult>[2]
      keepOpen?: boolean
    }) => {
      const saved =
        p.mode === 'create'
          ? await createElectionCandidacy(p.electionId, p.body)
          : await updateElectionCandidacy(p.electionId, p.candidacyId!, p.body)
      if (p.resultBody) {
        await upsertCandidacyResult(p.electionId, saved.id, p.resultBody)
      }
      return saved
    },
    onSuccess: (_saved, vars) => {
      invalidate()
      if (!vars.keepOpen) {
        setCandidacyModal(null)
      }
      notify.success(
        vars.resultBody
          ? '후보 및 득표 결과가 저장되었습니다.'
          : '후보가 저장되었습니다.',
      )
    },
    onError: (e: Error) => notify.error(e.message),
  })

  const delCandidacyMut = useMutation({
    mutationFn: (p: { electionId: string; candidacyId: string }) =>
      deleteElectionCandidacy(p.electionId, p.candidacyId),
    onSuccess: () => {
      invalidate()
      notify.success('후보 행이 삭제되었습니다.')
    },
    onError: (e: Error) => notify.error(e.message),
  })

  const resultMut = useMutation({
    mutationFn: (p: {
      electionId: string
      candidacyId: string
      body: Parameters<typeof upsertCandidacyResult>[2]
      nextCandidacy?: ElectionCandidacyDto
    }) => upsertCandidacyResult(p.electionId, p.candidacyId, p.body),
    onSuccess: (_data, vars) => {
      invalidate()
      if (vars.nextCandidacy) {
        setResultModal({
          electionId: vars.electionId,
          candidacyId: vars.nextCandidacy.id,
          initial: vars.nextCandidacy.result,
        })
      } else {
        setResultModal(null)
      }
      notify.success('득표가 반영되었습니다.')
    },
    onError: (e: Error) => notify.error(e.message),
  })

  const ballotCreateMut = useMutation({
    mutationFn: (p: { electionId: string; label: string; sortOrder: number }) =>
      createBallotOption(p.electionId, {
        label: p.label,
        sortOrder: p.sortOrder,
      }),
    onSuccess: () => {
      invalidate()
      notify.success('투표 안이 추가되었습니다.')
    },
    onError: (e: Error) => notify.error(e.message),
  })

  const ballotRenameMut = useMutation({
    mutationFn: (p: { electionId: string; optionId: string; label: string }) =>
      updateBallotOption(p.electionId, p.optionId, { label: p.label }),
    onSuccess: () => {
      invalidate()
      notify.success('투표 안 이름이 저장되었습니다.')
    },
    onError: (e: Error) => notify.error(e.message),
  })

  const ballotDelMut = useMutation({
    mutationFn: (p: { electionId: string; optionId: string }) =>
      deleteBallotOption(p.electionId, p.optionId),
    onSuccess: () => {
      invalidate()
      notify.success('삭제되었습니다.')
    },
    onError: (e: Error) => notify.error(e.message),
  })

  const ballotResultMut = useMutation({
    mutationFn: (p: {
      electionId: string
      optionId: string
      body: Parameters<typeof upsertBallotOptionResult>[2]
      nextOption?: ElectionBallotOptionDto
    }) => upsertBallotOptionResult(p.electionId, p.optionId, p.body),
    onSuccess: (_data, vars) => {
      invalidate()
      if (vars.nextOption) {
        setBallotResultModal({
          electionId: vars.electionId,
          option: vars.nextOption,
        })
      } else {
        setBallotResultModal(null)
      }
      notify.success('집계가 반영되었습니다.')
    },
    onError: (e: Error) => notify.error(e.message),
  })

  const partyResultMut = useMutation({
    mutationFn: (p: {
      electionId: string
      partyId: string
      body: Parameters<typeof upsertElectionPartyResult>[2]
      keepOpen?: boolean
    }) => upsertElectionPartyResult(p.electionId, p.partyId, p.body),
    onSuccess: (_data, vars) => {
      invalidate()
      if (!vars.keepOpen) {
        setPartyResultModal(null)
      }
      notify.success('정당 집계가 저장되었습니다.')
    },
    onError: (e: Error) => notify.error(e.message),
  })

  const allianceSaveMut = useMutation({
    mutationFn: (payload: {
      electionId: string
      allianceId?: string
      body: ElectionAllianceInput
    }) =>
      payload.allianceId
        ? updateElectionAlliance(payload.electionId, payload.allianceId, payload.body)
        : createElectionAlliance(payload.electionId, payload.body),
    onSuccess: (_data, vars) => {
      invalidate()
      setAllianceModal(null)
      notify.success(vars.allianceId ? '선거 연합을 수정했습니다.' : '선거 연합을 추가했습니다.')
    },
    onError: (err: Error) => notify.error(err.message),
  })

  const allianceDelMut = useMutation({
    mutationFn: (payload: { electionId: string; allianceId: string }) =>
      deleteElectionAlliance(payload.electionId, payload.allianceId),
    onSuccess: () => {
      invalidate()
      notify.success('선거 연합을 삭제했습니다. 소속 정당 집계는 그대로 남습니다.')
    },
    onError: (err: Error) => notify.error(err.message),
  })

  const partyResultDelMut = useMutation({
    mutationFn: (payload: { electionId: string; partyId: string }) =>
      deleteElectionPartyResult(payload.electionId, payload.partyId),
    onSuccess: () => {
      invalidate()
      notify.success('정당 집계를 삭제했습니다.')
    },
    onError: (err: Error) => notify.error(err.message),
  })

  const syncPartyResultsFromCandidaciesMut = useMutation({
    mutationFn: async (targetDetail: ElectionDetailDto) => {
      const existingByPartyId = new Map(
        (targetDetail.partyResults ?? []).map((row) => [row.partyId, row]),
      )
      const aggByPartyId = new Map<
        string,
        {
          votesSum: bigint
          hasVotes: boolean
          pctSum: number
          hasPct: boolean
          seatsSum: number
          hasSeats: boolean
        }
      >()
      let totalValidVotes = 0n
      for (const cand of targetDetail.candidacies) {
        const rawVotes = cand.result?.votes
        if (rawVotes != null && /^\d+$/.test(String(rawVotes).trim())) {
          totalValidVotes += BigInt(String(rawVotes).trim())
        }
        if (!cand.partyId) continue
        const cur = aggByPartyId.get(cand.partyId) ?? {
          votesSum: 0n,
          hasVotes: false,
          pctSum: 0,
          hasPct: false,
          seatsSum: 0,
          hasSeats: false,
        }
        if (rawVotes != null && /^\d+$/.test(String(rawVotes).trim())) {
          cur.votesSum += BigInt(String(rawVotes).trim())
          cur.hasVotes = true
        }
        const pctVal = Number(cand.result?.voteSharePercent)
        if (
          cand.result?.voteSharePercent != null &&
          String(cand.result.voteSharePercent).trim() !== '' &&
          Number.isFinite(pctVal) &&
          pctVal >= 0
        ) {
          cur.pctSum += pctVal
          cur.hasPct = true
        }
        if (cand.result?.seatsWon != null && cand.result.seatsWon >= 0) {
          cur.seatsSum += cand.result.seatsWon
          cur.hasSeats = true
        } else if (cand.result?.elected) {
          cur.seatsSum += 1
          cur.hasSeats = true
        }
        aggByPartyId.set(cand.partyId, cur)
      }

      const entries = Array.from(aggByPartyId.entries())
      for (const [partyId, agg] of entries) {
        const existing = existingByPartyId.get(partyId)
        const votesStr = agg.hasVotes
          ? agg.votesSum.toString()
          : (existing?.votes ?? null)
        let pctStr: string | null = existing?.voteSharePercent ?? null
        if (agg.hasVotes && totalValidVotes > 0n) {
          const computed =
            Math.round(
              (Number(agg.votesSum) / Number(totalValidVotes)) * 1000,
            ) / 10
          pctStr = String(computed)
        } else if (agg.hasPct) {
          pctStr = String(Math.round(agg.pctSum * 10) / 10)
        }
        const seatsVal = agg.hasSeats
          ? agg.seatsSum
          : (existing?.seatsWon ?? null)
        await upsertElectionPartyResult(targetDetail.id, partyId, {
          votes: votesStr,
          voteSharePercent: pctStr,
          seatsWon: seatsVal,
          notes: existing?.notes ?? null,
        })
      }
      return entries.length
    },
    onSuccess: (count) => {
      invalidate()
      notify.success(`${count}개 정당의 후보 결과를 정당별 집계에 반영했습니다.`)
    },
    onError: (err: Error) => notify.error(err.message),
  })

  const batchCalcCandidacyResultsMut = useMutation({
    mutationFn: async (targetDetail: ElectionDetailDto) => {
      const candidaciesWithVotes: {
        cand: ElectionCandidacyDto
        votesBig: bigint
      }[] = []
      let totalValidVotes = 0n
      for (const cand of targetDetail.candidacies) {
        const rawVotes =
          cand.result?.votes != null
            ? String(cand.result.votes).trim().replace(/[\s,]/g, '')
            : ''
        if (rawVotes && /^\d+$/.test(rawVotes)) {
          const votesBig = BigInt(rawVotes)
          candidaciesWithVotes.push({ cand, votesBig })
          totalValidVotes += votesBig
        }
      }
      candidaciesWithVotes.sort((left, right) =>
        compareBigint(right.votesBig, left.votesBig),
      )
      let currentRank = 1
      for (let idx = 0; idx < candidaciesWithVotes.length; idx++) {
        const item = candidaciesWithVotes[idx]
        if (
          idx > 0 &&
          item.votesBig < candidaciesWithVotes[idx - 1].votesBig
        ) {
          currentRank = idx + 1
        }
        const pctStr =
          totalValidVotes > 0n
            ? String(
                Math.round(
                  (Number(item.votesBig) / Number(totalValidVotes)) * 1000,
                ) / 10,
              )
            : (item.cand.result?.voteSharePercent ?? null)
        await upsertCandidacyResult(targetDetail.id, item.cand.id, {
          votes: item.votesBig.toString(),
          voteSharePercent: pctStr,
          resultRank: currentRank,
          seatsWon: item.cand.result?.seatsWon ?? null,
          elected: item.cand.result?.elected ?? false,
          notes: item.cand.result?.notes ?? null,
        })
      }
      return candidaciesWithVotes.length
    },
    onSuccess: (count) => {
      invalidate()
      notify.success(
        `${count}명 후보의 득표 순위와 득표율을 일괄 계산해 반영했습니다.`,
      )
    },
    onError: (err: Error) => notify.error(err.message),
  })

  /** 목록 필터 — 탭 전환에도 유지 (컴포넌트 마운트 유지 중) */
  const [listSearch, setListSearch] = useState('')
  const [listTypeFilter, setListTypeFilter] = useState<string>('')
  const [listChamberFilter, setListChamberFilter] = useState<string>(
    () => searchParams.get('chamberId') ?? '',
  )
  const [listRegimeFilter, setListRegimeFilter] = useState<string>(
    () => searchParams.get('regimeId') ?? '',
  )
  const [listStatusFilter, setListStatusFilter] = useState<string>('')
  const [listSortKey, setListSortKey] = useState<'pollDate' | 'ordinal'>(
    'pollDate',
  )
  const [listSortDir, setListSortDir] = useState<'asc' | 'desc'>('desc')
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [partyCreateTick, setPartyCreateTick] = useState(0)

  const regimeIdFromUrl = searchParams.get('regimeId') ?? ''
  useEffect(() => {
    setListRegimeFilter(regimeIdFromUrl)
  }, [regimeIdFromUrl])

  const updateRegimeFilter = useCallback(
    (nextRegimeId: string) => {
      setListRegimeFilter(nextRegimeId)
      const nextParams = new URLSearchParams(searchParams)
      if (nextRegimeId) {
        nextParams.set('regimeId', nextRegimeId)
      } else {
        nextParams.delete('regimeId')
      }
      setSearchParams(nextParams, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const electionRegimeById = useMemo(() => {
    const map = new Map<string, PoliticalSystem>()
    if (politicalSystems.length === 0) return map
    for (const row of list) {
      const matched = findPoliticalSystemAtDate(politicalSystems, {
        countryId: row.countryId,
        historicalCountryId: row.historicalCountryId,
        isoDate: row.pollDate,
        fallbackToCurrent: false,
      })
      if (matched) {
        map.set(row.id, matched)
      }
    }
    return map
  }, [list, politicalSystems])

  const regimeFilterEntries = useMemo(() => {
    if (politicalSystems.length < 2) return []
    return politicalSystems.map((sysItem) => {
      const label =
        sysItem.name?.trim() ||
        (sysItem.governmentForm
          ? GOVERNMENT_FORM_LABEL[sysItem.governmentForm]
          : '헌정 체제')
      let count = 0
      for (const row of list) {
        if (electionRegimeById.get(row.id)?.id === sysItem.id) {
          count += 1
        }
      }
      return {
        id: sysItem.id,
        label,
        count,
      }
    })
  }, [politicalSystems, list, electionRegimeById])

  const filteredList = useMemo(() => {
    const query = listSearch.trim().toLowerCase()
    return list.filter((row) => {
      const matchedRegime = electionRegimeById.get(row.id)
      if (query) {
        const regimeTitle = matchedRegime?.name ?? ''
        const hay =
          `${row.name} ${row.shortName ?? ''} ${row.chamber?.name ?? ''} ${regimeTitle}`.toLowerCase()
        if (!hay.includes(query)) return false
      }
      if (listTypeFilter && row.electionType !== listTypeFilter) return false
      if (listRegimeFilter) {
        if (listRegimeFilter === '__none__') {
          if (matchedRegime) return false
        } else if (matchedRegime?.id !== listRegimeFilter) {
          return false
        }
      }
      if (listChamberFilter === '__none__') {
        if (row.chamberId) return false
      } else if (listChamberFilter && row.chamberId !== listChamberFilter) {
        return false
      }
      if (listStatusFilter === '__completed__') {
        if (row.status !== 'FINALIZED' && row.status !== 'COMPLETED')
          return false
      } else if (listStatusFilter === '__scheduled__') {
        if (row.status !== 'SCHEDULED' && row.status !== 'IN_PROGRESS')
          return false
      } else if (listStatusFilter && row.status !== listStatusFilter) {
        return false
      }
      return true
    })
  }, [
    list,
    listSearch,
    listTypeFilter,
    listRegimeFilter,
    listChamberFilter,
    listStatusFilter,
    electionRegimeById,
  ])

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

  /** 선거 서브탭 진입 또는 체제·유형 필터 전환 시 선택된 선거가 표시 목록에 없으면 최상단 선거 자동 선택 */
  useEffect(() => {
    if (politicsViewTab !== 'elections' || listLoading) return
    if (sortedList.length === 0) return
    const existsInSorted = selectedId
      ? sortedList.some((e) => e.id === selectedId)
      : false
    if (!selectedId || !existsInSorted) {
      setSelectedId(sortedList[0].id)
    }
  }, [politicsViewTab, listLoading, sortedList, selectedId, setSelectedId])

  const sectionTheme = useTheme()
  const isSectionDark = sectionTheme.mode === 'dark'

  /** 선거 요약 인포그래픽 데이터 (2열 벤토 요약 카드용) */
  const electionKpiSummary = useMemo(() => {
    const totalCount = list.length
    let completedCount = 0
    let scheduledCount = 0
    const typeCounts = new Map<string, number>()
    let turnoutSum = 0
    let turnoutCount = 0
    const turnoutByYear = new Map<number, { sum: number; count: number }>()
    let latestTurnoutInfo: { year: number; val: number } | null = null

    const orderedAsc = [...list].sort(
      (a, b) => new Date(a.pollDate).getTime() - new Date(b.pollDate).getTime(),
    )

    for (const row of orderedAsc) {
      if (row.status === 'FINALIZED' || row.status === 'COMPLETED')
        completedCount += 1
      else if (row.status === 'SCHEDULED' || row.status === 'IN_PROGRESS')
        scheduledCount += 1

      if (row.electionType) {
        typeCounts.set(
          row.electionType,
          (typeCounts.get(row.electionType) ?? 0) + 1,
        )
      }

      if (
        row.voterTurnoutPercent != null &&
        String(row.voterTurnoutPercent).trim() !== ''
      ) {
        const tNum = Number(row.voterTurnoutPercent)
        if (Number.isFinite(tNum) && tNum >= 0) {
          turnoutSum += tNum
          turnoutCount += 1
          const yNum = Number(formatPollYear(row.pollDate))
          if (Number.isFinite(yNum)) {
            const cur = turnoutByYear.get(yNum) ?? { sum: 0, count: 0 }
            cur.sum += tNum
            cur.count += 1
            turnoutByYear.set(yNum, cur)
            latestTurnoutInfo = {
              year: yNum,
              val: Math.round(tNum * 10) / 10,
            }
          }
        }
      }
    }

    const turnoutSparkPoints: SparkPoint[] = [...turnoutByYear.entries()]
      .sort((left, right) => left[0] - right[0])
      .map(([year, agg]) => ({
        year,
        value: Math.round((agg.sum / agg.count) * 10) / 10,
      }))

    const palette = isSectionDark
      ? ['#a5b4fc', '#38bdf8', '#34d399', '#fbbf24', '#c084fc', '#94a3b8']
      : ['#4f46e5', '#0284c7', '#059669', '#d97706', '#7c3aed', '#64748b']

    const sortedTypes = [...typeCounts.entries()].sort(
      (left, right) => right[1] - left[1],
    )
    const typeSlices: SegmentSlice[] = sortedTypes.map(
      ([typeKey, count], idx) => ({
        key: typeKey,
        label: labelElectionType(typeKey),
        value: count,
        color: palette[idx % palette.length],
        meta: `${count}건`,
      }),
    )

    const otherStatusCount = Math.max(
      0,
      totalCount - completedCount - scheduledCount,
    )
    const statusSlices: SegmentSlice[] = [
      ...(completedCount > 0
        ? [
            {
              key: 'completed',
              label: '확정·완료',
              value: completedCount,
              color: isSectionDark ? '#a5b4fc' : '#4f46e5',
              meta: `${completedCount}건`,
            },
          ]
        : []),
      ...(scheduledCount > 0
        ? [
            {
              key: 'scheduled',
              label: '예정·진행',
              value: scheduledCount,
              color: isSectionDark ? '#38bdf8' : '#0284c7',
              meta: `${scheduledCount}건`,
            },
          ]
        : []),
      ...(otherStatusCount > 0
        ? [
            {
              key: 'other',
              label: '기타·미상',
              value: otherStatusCount,
              color: isSectionDark ? '#64748b' : '#94a3b8',
              meta: `${otherStatusCount}건`,
            },
          ]
        : []),
    ]

    const topType = sortedTypes[0]
      ? { type: sortedTypes[0][0], count: sortedTypes[0][1] }
      : null
    const latestElection = orderedAsc[orderedAsc.length - 1] ?? null
    const avgTurnout =
      turnoutCount > 0 ? Math.round((turnoutSum / turnoutCount) * 10) / 10 : null

    return {
      totalCount,
      completedCount,
      scheduledCount,
      distinctTypeCount: typeCounts.size,
      topType,
      latestElection,
      avgTurnout,
      turnoutCount,
      turnoutSparkPoints,
      latestTurnoutInfo,
      typeSlices,
      statusSlices,
    }
  }, [list, isSectionDark])

  const parliamentStripItems = useMemo<ParliamentStripItem[]>(
    () =>
      parliamentStripElections.map((row, idx) => {
        const detailForRow = parliamentStripQueries[idx]?.data
        /* 큰 반원과 같은 순서 — 왼쪽 좌파 → 오른쪽 우파 */
        const partyRows = sortBySeatingOrder(
          (detailForRow?.partyResults ?? [])
            .filter((partyRow) => (partyRow.seatsWon ?? 0) > 0)
            .map((partyRow) => ({
              row: partyRow,
              seats: partyRow.seatsWon ?? 0,
              positionRank: politicalPositionRank(
                parties.find((party) => party.id === partyRow.partyId)?.position,
              ),
            })),
        ).map((entry) => entry.row)
        const turnout = Number(row.voterTurnoutPercent)
        return {
          id: row.id,
          year: formatPollYear(row.pollDate),
          ordinalLabel:
            row.convocationOrdinal != null ? `제${row.convocationOrdinal}대` : null,
          turnoutLabel: Number.isFinite(turnout) && turnout > 0 ? `${turnout}%` : null,
          totalSeats: row.totalSeats ?? null,
          title: electionPrimaryTitle(row),
          parties: partyRows.map((partyRow) => ({
            fill: partyResultSliceFill(
              partyRow,
              hueFromPartyId(partyRow.partyId),
              parties.find((party) => party.id === partyRow.partyId)?.brandColor,
            ),
            seats: partyRow.seatsWon ?? 0,
            label: partyRow.party ? getPartyDisplayName(partyRow.party) : partyRow.partyId,
          })),
        }
      }),
    [parliamentStripElections, parliamentStripQueries, parties],
  )

  /** 선거 전환 직후 이전 쿼리 데이터가 잠깐 남는 경우를 막아 상세가 뒤섞이지 않게 함 */
  const detailMatchesSelection = Boolean(
    detail && selectedId && detail.id === selectedId,
  )

  return (
    <CountryElectionsSectionRoot>
      <ElectionsPoliticsTabPanel>
        {/*
          하위 메뉴 한 줄 — 정부·행정 탭(GovSubNavBar)과 같은 꼴: 왼쪽 하위 탭, 오른쪽 등록.
          예전엔 위 탭('정당·선거') 아래에 제목 '선거·투표' + 사용법 설명 줄이 끼고, 그 아래 위 탭과
          같은 부품의 탭이 또 서서 두 단계가 구분되지 않았다. 하위 탭은 알약으로 낮춰 위 탭과 가른다.
        */}
        <SectionSubNav<'parties' | 'elections'>
          ariaLabel="정당·선거 하위 메뉴"
          tabs={[
            { key: 'parties', label: '정당', count: parties.length },
            { key: 'elections', label: '선거', count: list.length },
          ]}
          activeTab={politicsViewTab}
          onTabChange={handlePoliticsViewTab}
          actions={
            <>
              {/* 목록이 비어 있으면 빈 상태의 등록 버튼 하나만 — 같은 버튼이 두 개 서지 않게 */}
              {politicsViewTab === 'elections' ? (
                listLoading || list.length === 0 ? null : (
                  <PrimaryActionButton
                    onClick={() => setElectionModal({ mode: 'create' })}
                    title={
                      historicalCountryId
                        ? '이 역사 국가 기준으로 선거를 등록합니다'
                        : '이 국가의 선거를 등록합니다 — 정당을 먼저 등록하면 집계·후보에 연결할 수 있습니다'
                    }
                  >
                    <FiPlus size={14} strokeWidth={2.25} aria-hidden />
                    선거 등록
                  </PrimaryActionButton>
                )
              ) : !electionPartyId && parties.length > 0 ? (
                <PrimaryActionButton
                  onClick={() => setPartyCreateTick((tick) => tick + 1)}
                  title={
                    historicalCountryId
                      ? '이 역사 국가 기준으로 정당을 등록합니다'
                      : '이 국가의 정당을 등록합니다'
                  }
                >
                  <FiPlus size={14} strokeWidth={2.25} aria-hidden />
                  정당 등록
                </PrimaryActionButton>
              ) : null}
            </>
          }
        />

        {politicsViewTab === 'parties' ? (
          <CountryPoliticalPartiesBlock
            countryId={countryId}
            historicalCountryId={historicalCountryId}
            selectedPartyId={electionPartyId ?? null}
            createRequestTick={partyCreateTick}
          />
        ) : null}

        {politicsViewTab === 'elections' ? (
          <ElectionsPoliticsTabSubsection aria-label="선거 목록·상세">
            {!listLoading && list.length > 0 ? (
              <BentoCard aria-label="역대 의회 구성">
                <BentoCardHeader>
                  <BentoCardTitleGroup>
                    <BentoCardTitle>역대 의회 구성</BentoCardTitle>
                    <BentoCardBadge>
                      선거 {electionKpiSummary.totalCount}회
                      {electionKpiSummary.avgTurnout != null
                        ? ` · 평균 투표율 ${electionKpiSummary.avgTurnout}%`
                        : ''}
                    </BentoCardBadge>
                    {distinctElectionChambers.length > 1 ? (
                      <div
                        role="tablist"
                        aria-label="의회 원 전환"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          flexWrap: 'wrap',
                        }}
                      >
                        {distinctElectionChambers.map((ch) => {
                          const isActive = ch.id === effectiveStripChamberId
                          return (
                            <ElectionBentoLegendBtn
                              key={ch.id}
                              type="button"
                              role="tab"
                              aria-selected={isActive}
                              $active={isActive}
                              onClick={() => setStripChamberId(ch.id)}
                            >
                              <span>{ch.label}</span>
                              <strong>{ch.count}</strong>
                            </ElectionBentoLegendBtn>
                          )
                        })}
                      </div>
                    ) : null}
                  </BentoCardTitleGroup>
                  <BentoActionBtn
                    type="button"
                    onClick={() => handlePoliticsViewTab('parties')}
                  >
                    정당 {parties.length} →
                  </BentoActionBtn>
                </BentoCardHeader>
                <BentoCardBody>
                  <ElectionsParliamentStrip
                    items={parliamentStripItems}
                    selectedId={selectedId ?? null}
                    onSelect={(electionId) => setSelectedId(electionId)}
                  />
                  {/* 유형이 둘 이상일 때만 거르기 칩 — 한 유형뿐이면 100% 한 색 막대라 아무것도 말하지 않았다 */}
                  {electionKpiSummary.typeSlices.length > 1 ? (
                    <ElectionBentoLegendRow>
                      {electionKpiSummary.typeSlices.map((slice) => (
                        <ElectionBentoLegendBtn
                          key={slice.key}
                          type="button"
                          $active={listTypeFilter === slice.key}
                          onClick={() =>
                            setListTypeFilter((prev) =>
                              prev === slice.key ? '' : slice.key,
                            )
                          }
                          title={`${slice.label} 필터 토글`}
                        >
                          <ElectionBentoDot $color={slice.color} />
                          <span>{slice.label}</span>
                          <strong>{slice.meta}</strong>
                        </ElectionBentoLegendBtn>
                      ))}
                    </ElectionBentoLegendRow>
                  ) : null}
                  {regimeFilterEntries.length >= 2 ? (
                    <ElectionBentoLegendRow aria-label="헌정 체제 시대별 선거 필터">
                      <ElectionBentoLegendBtn
                        type="button"
                        $active={!listRegimeFilter}
                        onClick={() => updateRegimeFilter('')}
                        title="전체 헌정 체제 보기"
                      >
                        <span>전체 체제</span>
                        <strong>{list.length}건</strong>
                      </ElectionBentoLegendBtn>
                      {regimeFilterEntries.map((regimeItem) => {
                        const isActive = listRegimeFilter === regimeItem.id
                        return (
                          <ElectionBentoLegendBtn
                            key={regimeItem.id}
                            type="button"
                            $active={isActive}
                            onClick={() =>
                              updateRegimeFilter(
                                isActive ? '' : regimeItem.id,
                              )
                            }
                            title={`${regimeItem.label} 시기 선거 필터 토글`}
                          >
                            <span>{regimeItem.label}</span>
                            <strong>{regimeItem.count}건</strong>
                          </ElectionBentoLegendBtn>
                        )
                      })}
                    </ElectionBentoLegendRow>
                  ) : null}
                </BentoCardBody>
              </BentoCard>
            ) : null}

            {!listLoading && list.length === 0 ? (
              <CountryTabEmptyState
                Icon={FiCheckSquare}
                title="아직 등록된 선거가 없습니다"
                description="첫 선거를 등록하면 정당별 득표·의석, 선거구·후보 개표 결과, 국민투표 안건을 이 국가에 쌓아 갈 수 있습니다."
                actionLabel="선거 등록"
                onAction={() => setElectionModal({ mode: 'create' })}
                features={[
                  {
                    Icon: FiCalendar,
                    title: '유형·회차·투표일',
                    description: '대통령·의회(지역구/비례)·지방·국민투표, 회차와 투표 기간, 구성 의회의 임기·해산',
                  },
                  {
                    Icon: FiBarChart2,
                    title: '정당별 집계와 추이',
                    description: '득표수·득표율·의석, 같은 유형 직전 선거 대비 증감을 자동 비교',
                  },
                  {
                    Icon: FiUsers,
                    title: '후보와 개표 결과',
                    description: '출마 인물·소속 정당·선거구, 기표·명부 순번, 득표와 당락',
                  },
                  {
                    Icon: FiLink,
                    title: '국민투표와 사건 연결',
                    description: '안건별 찬반 집계, 선거를 역사 사건으로 만들어 연표에 잇기',
                  },
                ]}
              />
            ) : (
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
                          !!listChamberFilter ||
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
                          (listChamberFilter ? 1 : 0) +
                          (listStatusFilter ? 1 : 0) +
                          (listSortKey !== 'pollDate' || listSortDir !== 'desc'
                            ? 1
                            : 0) >
                        0 ? (
                          <FilterBadge>
                            {(listTypeFilter ? 1 : 0) +
                              (listChamberFilter ? 1 : 0) +
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
                          {regimeFilterEntries.length >= 2 ? (
                            <ElectionListFilterSelect
                              value={listRegimeFilter}
                              onChange={(e) =>
                                updateRegimeFilter(e.target.value)
                              }
                              aria-label="헌정 체제 필터"
                            >
                              <option value="">전체 헌정 체제</option>
                              {regimeFilterEntries.map((regimeItem) => (
                                <option
                                  key={regimeItem.id}
                                  value={regimeItem.id}
                                >
                                  {regimeItem.label} ({regimeItem.count})
                                </option>
                              ))}
                              <option value="__none__">체제 미매칭 시기</option>
                            </ElectionListFilterSelect>
                          ) : null}
                          {distinctElectionChambers.length > 0 ? (
                            <ElectionListFilterSelect
                              value={listChamberFilter}
                              onChange={(e) =>
                                setListChamberFilter(e.target.value)
                              }
                              aria-label="의회 원 필터"
                            >
                              <option value="">전체 원(院)</option>
                              {distinctElectionChambers.map((ch) => (
                                <option key={ch.id} value={ch.id}>
                                  {ch.label} ({ch.count})
                                </option>
                              ))}
                              <option value="__none__">원 미지정 (대선·국민투표 등)</option>
                            </ElectionListFilterSelect>
                          ) : null}
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
                      {listSearch ||
                      listTypeFilter ||
                      listRegimeFilter ||
                      listChamberFilter ||
                      listStatusFilter ? (
                        <>
                          {' · '}
                          <button
                            type="button"
                            onClick={() => {
                              setListSearch('')
                              setListTypeFilter('')
                              updateRegimeFilter('')
                              setListChamberFilter('')
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
                    <LedgerTableSkeleton
                      rows={6}
                      columns={3}
                      showToolbar={false}
                      label="선거 목록을 불러오는 중"
                    />
                  </ElectionListScrollArea>
                ) : sortedList.length === 0 ? (
                  <ElectionListScrollArea>
                    <EmptyHint>
                      조건에 맞는 선거가 없습니다. 필터를 초기화해 보세요.
                    </EmptyHint>
                  </ElectionListScrollArea>
                ) : (
                  <ElectionListScrollArea>
                    <ElectionListStack>
                      {sortedList.map((electionRow) => {
                        const end = electionListEndLine(electionRow)
                        const matchedRowRegime =
                          politicalSystems.length >= 2
                            ? electionRegimeById.get(electionRow.id)
                            : undefined
                        const subMetaParts: string[] = []
                        if (matchedRowRegime) {
                          const regimeText =
                            matchedRowRegime.name?.trim() ||
                            (matchedRowRegime.governmentForm
                              ? GOVERNMENT_FORM_LABEL[
                                  matchedRowRegime.governmentForm
                                ]
                              : null)
                          if (regimeText) subMetaParts.push(regimeText)
                        }
                        if (electionRow.chamber) {
                          subMetaParts.push(chamberLabel(electionRow.chamber))
                        }
                        if (
                          electionRow.voterTurnoutPercent != null &&
                          String(electionRow.voterTurnoutPercent).trim() !== ''
                        ) {
                          subMetaParts.push(
                            `투표율 ${electionRow.voterTurnoutPercent}%`,
                          )
                        }
                        if (electionRow.totalSeats != null) {
                          subMetaParts.push(`${electionRow.totalSeats}석`)
                        }
                        if (
                          electionRow.electionType ===
                          'REFERENDUM_OR_PLEBISCITE'
                        ) {
                          const optCount = electionRow.ballotOptions?.length ?? 0
                          if (optCount > 0) subMetaParts.push(`안건 ${optCount}개`)
                        } else {
                          const candCount = electionRow.candidacies?.length ?? 0
                          if (candCount > 0)
                            subMetaParts.push(`후보 ${candCount}명`)
                        }
                        if (electionRow.eventId) {
                          subMetaParts.push('사건 연동')
                        }
                        const pollYear = formatPollYear(electionRow.pollDate)
                        const turnoutNum =
                          electionRow.voterTurnoutPercent != null &&
                          String(electionRow.voterTurnoutPercent).trim() !== ''
                            ? Number(electionRow.voterTurnoutPercent)
                            : NaN
                        return (
                          <ElectionNavButton
                            key={electionRow.id}
                            type="button"
                            $active={selectedId === electionRow.id}
                            onClick={() => setSelectedId(electionRow.id)}
                          >
                            <ElectionListRowGrid>
                              <ElectionListYearCol>
                                <ElectionListYearNum>
                                  {pollYear}
                                </ElectionListYearNum>
                                {electionRow.convocationOrdinal != null ? (
                                  <ElectionListOrdinalSub>
                                    제{electionRow.convocationOrdinal}대
                                  </ElectionListOrdinalSub>
                                ) : null}
                              </ElectionListYearCol>
                              <ElectionListContentCol>
                                <ElectionNavTitle>
                                  {electionPrimaryTitle(electionRow)}
                                </ElectionNavTitle>
                                <ElectionNavMeta>
                                  {labelElectionType(electionRow.electionType)}
                                  {electionRow.status
                                    ? ` › ${labelElectionStatus(electionRow.status)}`
                                    : ''}
                                  {' · '}
                                  {formatPollDate(electionRow.pollDate)}
                                </ElectionNavMeta>
                                {end ? (
                                  <ElectionNavEndLine>
                                    {end.prefix} {end.dateStr}
                                  </ElectionNavEndLine>
                                ) : null}
                                {subMetaParts.length > 0 ? (
                                  <ElectionNavMeta>
                                    {subMetaParts.join(' · ')}
                                  </ElectionNavMeta>
                                ) : null}
                                {Number.isFinite(turnoutNum) &&
                                turnoutNum > 0 ? (
                                  <ElectionNavTurnoutTrack aria-hidden>
                                    <ElectionNavTurnoutFill $pct={turnoutNum} />
                                  </ElectionNavTurnoutTrack>
                                ) : null}
                              </ElectionListContentCol>
                            </ElectionListRowGrid>
                          </ElectionNavButton>
                        )
                      })}
                    </ElectionListStack>
                  </ElectionListScrollArea>
                )}
              </ListColumn>

              <DetailColumn>
                {!selectedId ? (
                  sortedList.length > 0 ? (
                    <ElectionOverviewPickSection aria-label="역대 선거 총람">
                      <ElectionOverviewPickHead>
                        <strong>역대 선거 총람</strong>
                        <span>
                          카드를 클릭하면 개표·의석·후보 상세를 바로 확인합니다
                        </span>
                      </ElectionOverviewPickHead>
                      <ElectionOverviewPickGrid>
                        {sortedList.slice(0, 12).map((row) => (
                          <ElectionOverviewPickCard
                            key={row.id}
                            type="button"
                            onClick={() => setSelectedId(row.id)}
                          >
                            <div className="top">
                              <span className="yr">
                                {formatPollYear(row.pollDate)}
                                {row.convocationOrdinal != null
                                  ? ` · 제${row.convocationOrdinal}대`
                                  : ''}
                              </span>
                              <span className="type">
                                {labelElectionType(row.electionType)}
                              </span>
                            </div>
                            <div className="title">
                              {electionPrimaryTitle(row)}
                            </div>
                            <div className="meta">
                              <span>{formatPollDate(row.pollDate)}</span>
                              {row.voterTurnoutPercent != null &&
                              String(row.voterTurnoutPercent).trim() !== '' ? (
                                <span>투표율 {row.voterTurnoutPercent}%</span>
                              ) : null}
                              {row.totalSeats != null ? (
                                <span>{row.totalSeats}석</span>
                              ) : null}
                            </div>
                          </ElectionOverviewPickCard>
                        ))}
                      </ElectionOverviewPickGrid>
                    </ElectionOverviewPickSection>
                  ) : (
                    <ElectionDetailEmptyCard>
                      <ElectionDetailEmptyTitle>
                        선거를 선택하세요
                      </ElectionDetailEmptyTitle>
                    </ElectionDetailEmptyCard>
                  )
                ) : detailLoading || !detailMatchesSelection || !detail ? (
                  <ChartSkeleton variant="text" lines={6} />
                ) : (
                  <ElectionDetailSurface key={detail.id}>
                    <ElectionDetailPanel
                      key={detail.id}
                      detail={detail}
                      entityLinkCountryId={
                        countryId ?? detail.countryId ?? undefined
                      }
                      parties={parties}
                      politicalSystems={politicalSystems}
                      sameTypeElections={list.filter(
                        (e) =>
                          e.electionType === detail.electionType &&
                          (e.chamberId ?? null) === (detail.chamberId ?? null),
                      )}
                      onSelectElection={(eid) => setSelectedId(eid)}
                      candidacyLabel={candidacyLabel}
                      onRegisterWinnerTenure={(cand, matchedSystem) =>
                        setTenureLinkTarget({
                          candidacy: cand,
                          election: detail,
                          matchedSystem,
                        })
                      }
                      onAddPartyResult={() =>
                        setPartyResultModal({
                          mode: 'create',
                          electionId: detail.id,
                        })
                      }
                      onSyncPartyResultsFromCandidacies={() => {
                        setConfirmDialog({
                          title: '후보 결과로 정당 집계 반영',
                          message:
                            '등록된 후보들의 소속 정당별 득표수·득표율·당선(의석) 합계를 계산하여 정당별 집계에 반영할까요? 기존 정당 집계의 메모는 유지됩니다.',
                          confirmLabel: '집계 반영',
                          onConfirm: () => {
                            syncPartyResultsFromCandidaciesMut.mutate(detail)
                            setConfirmDialog(null)
                          },
                        })
                      }}
                      syncingPartyResults={
                        syncPartyResultsFromCandidaciesMut.isPending
                      }
                      onEditPartyResult={(row) =>
                        setPartyResultModal({
                          mode: 'edit',
                          electionId: detail.id,
                          row,
                        })
                      }
                      onAddAlliance={() =>
                        setAllianceModal({ mode: 'create', electionId: detail.id })
                      }
                      onEditAlliance={(alliance) =>
                        setAllianceModal({ mode: 'edit', electionId: detail.id, alliance })
                      }
                      onDeleteAlliance={(alliance) => {
                        setConfirmDialog({
                          title: '선거 연합 삭제',
                          message: `「${alliance.name}」연합을 삭제할까요? 소속 정당의 집계(득표·의석)는 남고 연합 소속만 풀립니다.`,
                          confirmLabel: '삭제',
                          danger: true,
                          onConfirm: () => {
                            allianceDelMut.mutate({ electionId: detail.id, allianceId: alliance.id })
                            setConfirmDialog(null)
                          },
                        })
                      }}
                      onDeletePartyResult={(row) => {
                        const label = getPartyDisplayName(row.party) || '정당'
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
                      onCreateNarrativeEvent={() => narrativeEventMut.mutate(detail.id)}
                      creatingNarrativeEvent={narrativeEventMut.isPending}
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
                      onBatchCalcCandidacyResults={() =>
                        batchCalcCandidacyResultsMut.mutate(detail)
                      }
                      batchCalculatingCandidacies={
                        batchCalcCandidacyResultsMut.isPending
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
                          message:
                            '이 후보 행과 관련 득표 데이터를 삭제할까요?',
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
            )}
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
            existingElections={list}
            historicalCountryOptions={historicalCountryOptions}
            politicalSystems={politicalSystems}
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
            existingCandidacies={detail?.candidacies ?? []}
            activePoliticalSystem={
              detail
                ? findPoliticalSystemAtDate(politicalSystems, {
                    countryId: detail.countryId ?? countryId ?? null,
                    historicalCountryId:
                      detail.historicalCountryId ?? historicalCountryId ?? null,
                    isoDate: detail.pollDate,
                    fallbackToCurrent: false,
                  })
                : null
            }
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
                  resultBody: payload.resultBody,
                  keepOpen: payload.keepOpen,
                })
              else
                saveCandidacyMut.mutate({
                  mode: 'edit',
                  electionId: payload.electionId,
                  candidacyId: payload.candidacyId,
                  body: payload.body,
                  resultBody: payload.resultBody,
                })
            }}
          />
        )}

        {resultModal && (
          <ResultFormModal
            key={`result-${resultModal.electionId}-${resultModal.candidacyId}`}
            saving={resultMut.isPending}
            candidacyId={resultModal.candidacyId}
            existingCandidacies={detail?.candidacies ?? []}
            candidacyLabel={candidacyLabel}
            initial={resultModal.initial}
            onClose={() => setResultModal(null)}
            onSwitchCandidacy={(nextRow) =>
              setResultModal({
                electionId: resultModal.electionId,
                candidacyId: nextRow.id,
                initial: nextRow.result,
              })
            }
            onSubmit={(body, nextCandidacy) =>
              resultMut.mutate({
                electionId: resultModal.electionId,
                candidacyId: resultModal.candidacyId,
                body,
                nextCandidacy,
              })
            }
          />
        )}

        {ballotResultModal && (
          <BallotResultFormModal
            key={`ballot-result-${ballotResultModal.electionId}-${ballotResultModal.option.id}`}
            saving={ballotResultMut.isPending}
            option={ballotResultModal.option}
            existingOptions={detail?.ballotOptions ?? []}
            onClose={() => setBallotResultModal(null)}
            onSwitchOption={(nextOpt) =>
              setBallotResultModal({
                electionId: ballotResultModal.electionId,
                option: nextOpt,
              })
            }
            onSubmit={(body, nextOption) =>
              ballotResultMut.mutate({
                electionId: ballotResultModal.electionId,
                optionId: ballotResultModal.option.id,
                body,
                nextOption,
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

        {allianceModal && detail && detail.id === allianceModal.electionId ? (
          <ElectionAllianceFormModal
            key={
              allianceModal.mode === 'create'
                ? `alliance-new-${allianceModal.electionId}`
                : `alliance-${allianceModal.alliance.id}`
            }
            electionId={allianceModal.electionId}
            mode={allianceModal.mode}
            initial={allianceModal.mode === 'edit' ? allianceModal.alliance : undefined}
            alliances={detail.alliances ?? []}
            partyResults={detail.partyResults ?? []}
            partyInfo={(partyId) => {
              const row = detail.partyResults?.find((result) => result.partyId === partyId)
              const registry = parties.find((party) => party.id === partyId)
              return {
                name: getPartyDisplayName(row?.party ?? registry) || partyId,
                fill: row
                  ? partyResultSliceFill(row, hueFromPartyId(partyId), registry?.brandColor)
                  : `hsl(${hueFromPartyId(partyId)} 68% 54%)`,
              }
            }}
            saving={allianceSaveMut.isPending}
            onClose={() => setAllianceModal(null)}
            onSubmit={(body) =>
              allianceSaveMut.mutate({
                electionId: allianceModal.electionId,
                allianceId: allianceModal.mode === 'edit' ? allianceModal.alliance.id : undefined,
                body,
              })
            }
          />
        ) : null}

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
            onSubmit={(partyId, body, keepOpen) =>
              partyResultMut.mutate({
                electionId: partyResultModal.electionId,
                partyId,
                body,
                keepOpen,
              })
            }
          />
        )}

        {tenureLinkTarget &&
        (tenureLinkTarget.candidacy.personId ??
          tenureLinkTarget.candidacy.person?.id) ? (
          <TenureRegisterPanel
            personId={
              (tenureLinkTarget.candidacy.personId ??
                tenureLinkTarget.candidacy.person?.id)!
            }
            open
            onClose={() => setTenureLinkTarget(null)}
            onSuccess={() => {
              invalidate()
              void queryClient.invalidateQueries({
                queryKey: ['tenures-by-country'],
              })
              void queryClient.invalidateQueries({
                queryKey: ['cabinets-by-country'],
              })
              setTenureLinkTarget(null)
            }}
            initialCountryId={
              countryId ?? tenureLinkTarget.election.countryId ?? undefined
            }
            initialHistoricalCountryId={
              tenureLinkTarget.election.historicalCountryId ??
              historicalCountryId ??
              null
            }
            initialPositionDefinitionId={
              tenureLinkTarget.election.electionType === 'PRESIDENTIAL_OR_HEAD'
                ? (tenureLinkTarget.matchedSystem?.headOfStatePositionId ?? null)
                : null
            }
            initialPositionTitle={
              tenureLinkTarget.election.electionType === 'PRESIDENTIAL_OR_HEAD'
                ? (tenureLinkTarget.matchedSystem
                    ? headOfStateTitleOf(tenureLinkTarget.matchedSystem)
                    : null) ?? '대통령'
                : tenureLinkTarget.election.electionType ===
                      'PARLIAMENTARY_CONSTITUENCY' ||
                    tenureLinkTarget.election.electionType ===
                      'PARLIAMENTARY_PROPORTIONAL' ||
                    tenureLinkTarget.election.electionType === 'BY_ELECTION'
                  ? tenureLinkTarget.election.chamber?.name
                    ? `${tenureLinkTarget.election.chamber.name} 의원`
                    : '국회의원'
                  : null
            }
            initialPositionType={
              tenureLinkTarget.election.electionType === 'PRESIDENTIAL_OR_HEAD'
                ? 'HEAD_OF_STATE'
                : tenureLinkTarget.election.electionType === 'LOCAL'
                  ? 'LOCAL_GOVERNMENT'
                  : 'LEGISLATOR'
            }
            initialStartDate={
              tenureLinkTarget.election.legislatureTermStart ??
              tenureLinkTarget.election.pollDate
            }
            initialPartyId={tenureLinkTarget.candidacy.partyId ?? null}
            initialAppointmentMethod="DIRECT_ELECTION"
            initialElectionCandidacyId={tenureLinkTarget.candidacy.id}
            initialChamberId={tenureLinkTarget.election.chamberId ?? null}
            initialOrdinal={
              tenureLinkTarget.election.convocationOrdinal ?? null
            }
          />
        ) : null}
      </ElectionsPoliticsTabPanel>
    </CountryElectionsSectionRoot>
  )
}

function ElectionDetailPanel({
  detail,
  /** 서버 엔티티 검색 한정(정당 등) — 현대 국가 id */
  entityLinkCountryId,
  parties,
  politicalSystems = [],
  sameTypeElections,
  onSelectElection,
  candidacyLabel,
  onRegisterWinnerTenure,
  onAddPartyResult,
  onSyncPartyResultsFromCandidacies,
  syncingPartyResults,
  onEditPartyResult,
  onDeletePartyResult,
  onAddAlliance,
  onEditAlliance,
  onDeleteAlliance,
  onEditElection,
  onSaveElectionNarrative,
  savingNarrative,
  onDeleteElection,
  onAddCandidacy,
  onBatchCalcCandidacyResults,
  batchCalculatingCandidacies,
  onEditCandidacy,
  onDeleteCandidacy,
  onEditResult,
  onAddBallotOption,
  onRenameBallotOption,
  onDeleteBallotOption,
  onEditBallotResult,
  onCreateNarrativeEvent,
  creatingNarrativeEvent,
}: {
  detail: ElectionDetailDto
  entityLinkCountryId?: string
  parties: PoliticalPartyRow[]
  politicalSystems?: PoliticalSystem[]
  sameTypeElections: ElectionListRow[]
  onSelectElection?: (electionId: string) => void
  candidacyLabel: (c: ElectionCandidacyDto) => string
  onRegisterWinnerTenure?: (
    c: ElectionCandidacyDto,
    matchedSystem: PoliticalSystem | null,
  ) => void
  onAddPartyResult: () => void
  onSyncPartyResultsFromCandidacies?: () => void
  syncingPartyResults?: boolean
  onEditPartyResult: (row: ElectionPartyResultDto) => void
  onDeletePartyResult: (row: ElectionPartyResultDto) => void
  onAddAlliance: () => void
  onEditAlliance: (alliance: ElectionAllianceDto) => void
  onDeleteAlliance: (alliance: ElectionAllianceDto) => void
  onEditElection: () => void
  onSaveElectionNarrative: (patch: {
    resultingLegislatureDissolutionNotes?: string | null
    description?: string | null
  }) => Promise<void>
  savingNarrative: boolean
  onDeleteElection: () => void
  onAddCandidacy: () => void
  onBatchCalcCandidacyResults?: () => void
  batchCalculatingCandidacies?: boolean
  onEditCandidacy: (row: ElectionCandidacyDto) => void
  onDeleteCandidacy: (row: ElectionCandidacyDto) => void
  onEditResult: (row: ElectionCandidacyDto) => void
  onAddBallotOption: (label: string, sortOrder: number) => void
  onRenameBallotOption: (optionId: string, label: string) => Promise<void>
  onDeleteBallotOption: (opt: ElectionBallotOptionDto) => void
  onEditBallotResult: (opt: ElectionBallotOptionDto) => void
  /** 연결 사건이 없을 때 — 이 선거로 사건을 만들어 잇는다 */
  onCreateNarrativeEvent?: () => void
  creatingNarrativeEvent?: boolean
}) {
  const navigate = useNavigate()

  const matchedSystemAtPoll = useMemo(
    () =>
      findPoliticalSystemAtDate(politicalSystems, {
        countryId: detail.countryId ?? entityLinkCountryId ?? null,
        historicalCountryId: detail.historicalCountryId ?? null,
        isoDate: detail.pollDate,
        fallbackToCurrent: false,
      }),
    [
      politicalSystems,
      detail.countryId,
      detail.historicalCountryId,
      detail.pollDate,
      entityLinkCountryId,
    ],
  )

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

  /** 후보 테이블 검색·필터·정렬 */
  const [candidacySearch, setCandidacySearch] = useState('')
  const [candidacyPartyFilter, setCandidacyPartyFilter] = useState('')
  const [candidacyStatusFilter, setCandidacyStatusFilter] = useState<
    '' | 'elected' | 'withdrawn'
  >('')
  const [candidacySort, setCandidacySort] = useState<{
    key: 'ballotOrder' | 'name' | 'votes' | 'voteShare' | 'rank'
    dir: 'asc' | 'desc'
  }>({ key: 'votes', dir: 'desc' })

  useEffect(() => {
    setCandidacySearch('')
    setCandidacyPartyFilter('')
    setCandidacyStatusFilter('')
  }, [detail.id])

  const toggleCandidacySort = useCallback(
    (key: 'ballotOrder' | 'name' | 'votes' | 'voteShare' | 'rank') => {
      setCandidacySort((prev) => {
        if (prev.key === key) {
          return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        }
        const defaultDir =
          key === 'votes' || key === 'voteShare' ? 'desc' : 'asc'
        return { key, dir: defaultDir }
      })
    },
    [],
  )

  const candidacyPartyOptions = useMemo(() => {
    const seen = new Map<string, string>()
    let hasIndependent = false
    for (const c of detail.candidacies) {
      if (c.partyId) {
        seen.set(
          c.partyId,
          c.party ? getPartyDisplayName(c.party) : c.partyId,
        )
      } else {
        hasIndependent = true
      }
    }
    return {
      parties: Array.from(seen.entries()).map(([id, label]) => ({ id, label })),
      hasIndependent,
    }
  }, [detail.candidacies])

  const filteredSortedCandidacies = useMemo(() => {
    const q = candidacySearch.trim().toLowerCase()
    const filtered = detail.candidacies.filter((c) => {
      if (candidacyPartyFilter === '__independent__') {
        if (c.partyId) return false
      } else if (candidacyPartyFilter && c.partyId !== candidacyPartyFilter) {
        return false
      }
      if (candidacyStatusFilter === 'elected' && !c.result?.elected) {
        return false
      }
      if (candidacyStatusFilter === 'withdrawn' && !c.withdrawnDate) {
        return false
      }
      if (q) {
        const nameText = candidacyLabel(c).toLowerCase()
        const partyText = (
          c.party ? getPartyDisplayName(c.party) : ''
        ).toLowerCase()
        const distText = (c.electoralDistrict?.name ?? '').toLowerCase()
        if (
          !nameText.includes(q) &&
          !partyText.includes(q) &&
          !distText.includes(q)
        ) {
          return false
        }
      }
      return true
    })
    const { key, dir } = candidacySort
    const mult = dir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      switch (key) {
        case 'ballotOrder': {
          const oa = a.ballotOrder ?? a.listRank ?? Number.MAX_SAFE_INTEGER
          const ob = b.ballotOrder ?? b.listRank ?? Number.MAX_SAFE_INTEGER
          return (oa - ob) * mult
        }
        case 'name':
          return (
            candidacyLabel(a).localeCompare(candidacyLabel(b), 'ko') * mult
          )
        case 'votes':
          return (
            compareBigint(
              parseVotesBigIntForSort(a.result?.votes),
              parseVotesBigIntForSort(b.result?.votes),
            ) * mult
          )
        case 'voteShare': {
          const va = Number(a.result?.voteSharePercent)
          const vb = Number(b.result?.voteSharePercent)
          const na = Number.isFinite(va) ? va : -Infinity
          const nb = Number.isFinite(vb) ? vb : -Infinity
          return (na - nb) * mult
        }
        case 'rank': {
          const ra = a.result?.resultRank ?? Number.MAX_SAFE_INTEGER
          const rb = b.result?.resultRank ?? Number.MAX_SAFE_INTEGER
          if (ra !== rb) return (ra - rb) * mult
          const sa = a.result?.seatsWon ?? -1
          const sb = b.result?.seatsWon ?? -1
          return (sb - sa) * mult
        }
        default:
          return 0
      }
    })
  }, [
    detail.candidacies,
    candidacySearch,
    candidacyPartyFilter,
    candidacyStatusFilter,
    candidacySort,
    candidacyLabel,
  ])

  const candidacyTotals = useMemo(() => {
    let votesSum = 0n
    let votesKnown = 0
    let voteShareSum = 0
    let voteShareKnown = 0
    let seatsSum = 0
    let seatsKnown = 0
    let electedCount = 0
    for (const c of filteredSortedCandidacies) {
      if (c.result?.elected) electedCount += 1
      const vRaw =
        c.result?.votes != null
          ? String(c.result.votes).trim().replace(/[\s,]/g, '')
          : ''
      if (vRaw && /^\d+$/.test(vRaw)) {
        try {
          votesSum += BigInt(vRaw)
          votesKnown += 1
        } catch {
          /* */
        }
      }
      const vs = Number(c.result?.voteSharePercent)
      if (
        c.result?.voteSharePercent != null &&
        String(c.result.voteSharePercent).trim() !== '' &&
        Number.isFinite(vs) &&
        vs >= 0
      ) {
        voteShareSum += vs
        voteShareKnown += 1
      }
      if (c.result?.seatsWon != null && Number.isFinite(c.result.seatsWon)) {
        seatsSum += c.result.seatsWon
        seatsKnown += 1
      }
    }
    return {
      totalCount: filteredSortedCandidacies.length,
      electedCount,
      votesSum,
      votesKnown,
      voteShareSum,
      voteShareKnown,
      seatsSum,
      seatsKnown,
    }
  }, [filteredSortedCandidacies])

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
  const alliances = useMemo(() => detail.alliances ?? [], [detail.alliances])
  const allianceNameById = useMemo(
    () => new Map(alliances.map((alliance) => [alliance.id, alliance.shortName || alliance.name])),
    [alliances],
  )
  const alliancePartyInfo = useCallback(
    (partyId: string) => {
      const row = partyResults.find((result) => result.partyId === partyId)
      const registry = parties.find((party) => party.id === partyId)
      return {
        name: getPartyShortName(row?.party ?? registry) || getPartyDisplayName(row?.party ?? registry) || partyId,
        fill: row
          ? partyResultSliceFill(row, hueFromPartyId(partyId), registry?.brandColor)
          : `hsl(${hueFromPartyId(partyId)} 68% 54%)`,
      }
    },
    [partyResults, parties],
  )
  const allianceSummaries = useMemo(
    () => summarizeAlliances(alliances, partyResults, alliancePartyInfo, '#94a3b8'),
    [alliances, partyResults, alliancePartyInfo],
  )

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
      voteSharePercent: otherVoteShare != null ? String(otherVoteShare) : null,
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
    if (timelineRows.length === 0)
      return [] as Array<{
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
          const name = getPartyShortName(r.party) || r.partyId
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
            getPartyShortName(row.party) ||
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
          const na = getPartyDisplayName(a.party) || a.partyId
          const nb = getPartyDisplayName(b.party) || b.partyId
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
        fill: isOther
          ? otherFill
          : partyResultSliceFill(row, hue, registryColor),
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
        const name = getPartyDisplayName(segment.row.party) || '정당'
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
  }, [partyShareChart.sorted, parties, theme.mode, partyDistributionMetric])

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

  const ballotOptionsSummary = useMemo(() => {
    let votesSum = 0n
    let votesKnown = 0
    let voteShareSum = 0
    let voteShareKnown = 0
    for (const opt of sortedBallotOptions) {
      const res = opt.result
      if (!res) continue
      const rawVotes = res.votes != null ? String(res.votes).trim() : ''
      if (rawVotes && /^\d+$/.test(rawVotes)) {
        try {
          votesSum += BigInt(rawVotes)
          votesKnown += 1
        } catch {
          /* ignore */
        }
      }
      const pctNum = Number(res.voteSharePercent)
      if (
        res.voteSharePercent != null &&
        String(res.voteSharePercent).trim() !== '' &&
        Number.isFinite(pctNum) &&
        pctNum >= 0
      ) {
        voteShareSum += pctNum
        voteShareKnown += 1
      }
    }
    return {
      totalCount: sortedBallotOptions.length,
      votesSum,
      votesKnown,
      voteShareSum: Math.round(voteShareSum * 10) / 10,
      voteShareKnown,
    }
  }, [sortedBallotOptions])

  const [activeDetailTab, setActiveDetailTab] = useState<
    'overview' | 'parties' | 'candidacies' | 'ballots' | 'all'
  >('overview')

  const resolvedDetailTab = useMemo(() => {
    if (activeDetailTab === 'all' || activeDetailTab === 'overview') {
      return activeDetailTab
    }
    if (isReferendum) {
      if (
        activeDetailTab === 'candidacies' ||
        (activeDetailTab === 'parties' && partyResults.length === 0)
      ) {
        return 'ballots'
      }
      return activeDetailTab
    }
    if (activeDetailTab === 'ballots') return 'candidacies'
    return activeDetailTab
  }, [activeDetailTab, isReferendum, partyResults.length])

  /** 동일 유형 선거 시간순 체인 — 직전·다음 회차 빠른 이동 */
  const { prevSameTypeElection, nextSameTypeElection } = useMemo(() => {
    if (!sameTypeElections || sameTypeElections.length < 2) {
      return { prevSameTypeElection: null, nextSameTypeElection: null }
    }
    const ordered = [...sameTypeElections].sort((a, b) => {
      const ta = new Date(a.pollDate).getTime()
      const tb = new Date(b.pollDate).getTime()
      if (ta !== tb) return ta - tb
      return (a.convocationOrdinal ?? 0) - (b.convocationOrdinal ?? 0)
    })
    const idx = ordered.findIndex((e) => e.id === detail.id)
    if (idx === -1) {
      return { prevSameTypeElection: null, nextSameTypeElection: null }
    }
    return {
      prevSameTypeElection: idx > 0 ? ordered[idx - 1] : null,
      nextSameTypeElection:
        idx + 1 < ordered.length ? ordered[idx + 1] : null,
    }
  }, [sameTypeElections, detail.id])

  /** 당선 후보 목록 (득표순·순위순) */
  const electedCandidacies = useMemo(() => {
    const list = detail.candidacies.filter((c) => Boolean(c.result?.elected))
    return [...list].sort((a, b) => {
      const ra = a.result?.resultRank ?? Number.MAX_SAFE_INTEGER
      const rb = b.result?.resultRank ?? Number.MAX_SAFE_INTEGER
      if (ra !== rb) return ra - rb
      return compareBigint(
        parseVotesBigIntForSort(b.result?.votes),
        parseVotesBigIntForSort(a.result?.votes),
      )
    })
  }, [detail.candidacies])

  /** 제1당 (기타 제외 최상위 정당) */
  const leadingPartyInfo = useMemo(() => {
    const firstSeg = partyPieSlices.segments.find(
      (s) => s.row.partyId !== '__other__',
    )
    if (!firstSeg) return null
    const name =
      getPartyDisplayName(firstSeg.row.party) || firstSeg.row.partyId
    const pct = formatVoteShareLabel(firstSeg.row.voteSharePercent)
    const seats =
      firstSeg.row.seatsWon != null && firstSeg.row.seatsWon >= 0
        ? `${firstSeg.row.seatsWon}석`
        : null
    return {
      row: firstSeg.row,
      name,
      fill: firstSeg.fill,
      seats,
      pct,
    }
  }, [partyPieSlices.segments])

  /**
   * 히어로 수평 파워 바 (사건 상세 DetailPower.ElectionRow의 PartyBar 문법)
   * - 정당 집계가 있으면 정당 의석/득표 비중 바
   * - 정당 집계가 없고 후보 득표가 있으면 상위 후보 비중 바
   * - 국민투표면 투표 안 비중 바
   */
  const heroPowerBar = useMemo(() => {
    if (isReferendum && referendumBallotBars.length > 0) {
      return {
        mode: 'ballots' as const,
        kicker: '투표 안 비중',
        segments: referendumBallotBars.map((ballotBar) => ({
          key: ballotBar.id,
          label: ballotBar.label,
          subLabel: ballotBar.valueLabel,
          fill: ballotBar.fill,
          widthPct: Math.max(2, ballotBar.widthPct),
          share: Math.max(0, ballotBar.widthPct) / 100,
          seats: null as number | null,
          partyId: null as string | null,
          personId: null as string | null,
        })),
      }
    }
    if (partyPieSlices.segments.length > 0) {
      return {
        mode: 'parties' as const,
        kicker:
          partyDistributionMetric === 'seats' ? '의석 지형' : '정당 득표 지형',
        segments: partyPieSlices.segments.map((slice) => {
          const name =
            getPartyShortName(slice.row.party) ||
            getPartyDisplayName(slice.row.party) ||
            slice.row.partyId
          const pct = formatVoteShareLabel(slice.row.voteSharePercent)
          const seats =
            slice.row.seatsWon != null && slice.row.seatsWon >= 0
              ? `${slice.row.seatsWon}석`
              : null
          const subLabel =
            partyDistributionMetric === 'seats'
              ? [seats, pct].filter(Boolean).join(' · ') ||
                `${(slice.fraction * 100).toFixed(1)}%`
              : [pct, seats].filter(Boolean).join(' · ') ||
                `${(slice.fraction * 100).toFixed(1)}%`
          return {
            key: slice.row.id,
            label: name,
            subLabel,
            fill: slice.fill,
            widthPct: Math.max(1.5, slice.fraction * 100),
            share: slice.fraction,
            seats:
              slice.row.seatsWon != null && slice.row.seatsWon >= 0
                ? slice.row.seatsWon
                : null,
            positionRank: politicalPositionRank(
              parties.find((party) => party.id === slice.row.partyId)?.position,
            ),
            allianceKey: slice.row.allianceId ?? null,
            partyId: slice.row.partyId !== '__other__' ? slice.row.partyId : null,
            personId: null as string | null,
          }
        }),
      }
    }
    if (!isReferendum && detail.candidacies.length > 0) {
      const candsWithWeight = detail.candidacies
        .map((c) => {
          const pct = Number(c.result?.voteSharePercent)
          const votesBig = parseVotesBigIntForSort(c.result?.votes)
          const weight =
            Number.isFinite(pct) && pct > 0
              ? pct
              : votesBig > 0n
                ? Number(votesBig)
                : 0
          return { cand: c, weight }
        })
        .filter((x) => x.weight > 0)
        .sort((a, b) => b.weight - a.weight)
      const weightSum = candsWithWeight.reduce((acc, x) => acc + x.weight, 0)
      if (weightSum > 0) {
        return {
          mode: 'candidacies' as const,
          kicker: '후보 득표 지형',
          segments: candsWithWeight.slice(0, 8).map(({ cand, weight }) => {
            const registryColor = cand.partyId
              ? parties.find((p) => p.id === cand.partyId)?.brandColor
              : null
            const rawColor = (cand.party?.brandColor ?? registryColor)?.trim()
            const fill =
              rawColor && /^#?[0-9A-Fa-f]{6}$/.test(rawColor)
                ? rawColor.startsWith('#')
                  ? rawColor
                  : `#${rawColor}`
                : `hsl(${hueFromPartyId(cand.partyId ?? cand.id)} 64% 52%)`
            const pctLabel =
              formatVoteShareLabel(cand.result?.voteSharePercent) ??
              `${((weight / weightSum) * 100).toFixed(1)}%`
            return {
              key: cand.id,
              label: candidacyLabel(cand),
              subLabel: pctLabel,
              fill,
              widthPct: Math.max(2, (weight / weightSum) * 100),
              share: weight / weightSum,
              seats: null as number | null,
              partyId: cand.partyId ?? null,
              personId: cand.personId ?? cand.person?.id ?? null,
            }
          }),
        }
      }
    }
    return null
  }, [
    isReferendum,
    referendumBallotBars,
    partyPieSlices.segments,
    partyDistributionMetric,
    detail.candidacies,
    parties,
    candidacyLabel,
  ])

  const hasDescriptionContent = hasRichTextContent(effectiveElectionDescription)
  const hasLegislatureNoteContent = hasRichTextContent(
    detail.resultingLegislatureDissolutionNotes ?? '',
  )
  const overviewCount =
    (hasDescriptionContent ? 1 : 0) +
    (showLegislatureDissolutionNarrative && hasLegislatureNoteContent ? 1 : 0) +
    (partyResults.length > 0 ||
    detail.candidacies.length > 0 ||
    sortedBallotOptions.length > 0
      ? 1
      : 0)

  const validationNotes = useMemo(() => {
    if (partyResults.length === 0) return []
    const notes: { tone: 'ok' | 'warn' | 'error'; text: string }[] = []
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
    return notes
  }, [partyResults.length, partyResultsSummary, detail.totalSeats, otherSyntheticRow])

  const validationWorstTone = useMemo(() => {
    return validationNotes.reduce<'ok' | 'warn' | 'error'>(
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
  }, [validationNotes])

  return (
    <>
      <ElectionLedgerContainer>
        <ElectionLedgerBody>
          <ElectionLedgerMain>
            {/* ── 사건 상세(DetailHero) 문법 히어로 ── */}
            <ElectionHero>
              <ElectionHeroTopRow>
                <ElectionHeroBreadcrumbs>
                  <ElectionCategoryChip>
                    {labelElectionType(detail.electionType)}
                    <ElectionCategorySep aria-hidden>›</ElectionCategorySep>
                    <span className="sub">
                      {labelElectionStatus(detail.status)}
                    </span>
                    {detail.convocationOrdinal != null ? (
                      <>
                        <ElectionCategorySep aria-hidden>·</ElectionCategorySep>
                        <span className="sub">
                          제{detail.convocationOrdinal}대
                        </span>
                      </>
                    ) : null}
                  </ElectionCategoryChip>

                  {(prevSameTypeElection || nextSameTypeElection) &&
                  onSelectElection ? (
                    <ElectionChainNav aria-label="동일 유형 회차 이동">
                      {prevSameTypeElection ? (
                        <ElectionChainBtn
                          type="button"
                          onClick={() =>
                            onSelectElection(prevSameTypeElection.id)
                          }
                          title={`직전 동일 유형 선거: ${electionPrimaryTitle(prevSameTypeElection)} (${formatPollDate(prevSameTypeElection.pollDate)})`}
                        >
                          <FiChevronLeft size={12} aria-hidden />
                          {prevSameTypeElection.convocationOrdinal != null
                            ? `제${prevSameTypeElection.convocationOrdinal}대`
                            : formatPollYear(prevSameTypeElection.pollDate)}
                        </ElectionChainBtn>
                      ) : null}
                      {nextSameTypeElection ? (
                        <ElectionChainBtn
                          type="button"
                          onClick={() =>
                            onSelectElection(nextSameTypeElection.id)
                          }
                          title={`다음 동일 유형 선거: ${electionPrimaryTitle(nextSameTypeElection)} (${formatPollDate(nextSameTypeElection.pollDate)})`}
                        >
                          {nextSameTypeElection.convocationOrdinal != null
                            ? `제${nextSameTypeElection.convocationOrdinal}대`
                            : formatPollYear(nextSameTypeElection.pollDate)}
                          <FiChevronRight size={12} aria-hidden />
                        </ElectionChainBtn>
                      ) : null}
                    </ElectionChainNav>
                  ) : null}
                </ElectionHeroBreadcrumbs>

                {/* 머리 버튼은 '정보 수정' 하나만 드러내고, 가끔 쓰는 사건 이동·연표 사건 생성·삭제는 ⋯ 메뉴로 */}
                <ElectionHeroActions>
                  <ElectionHeroActionBtn
                    type="button"
                    onClick={onEditElection}
                    title="선거 기본·의회·통계 정보 수정"
                  >
                    <FiEdit2 size={12} aria-hidden />
                    정보 수정
                  </ElectionHeroActionBtn>
                  <PopoverMenu
                    size="sm"
                    ariaLabel="선거 작업 메뉴"
                    title="사건 · 삭제"
                    items={[
                      ...(detail.eventId
                        ? [
                            {
                              id: 'open-event',
                              label: '연결 사건 상세 보기',
                              icon: <FiExternalLink size={13} />,
                              onSelect: () =>
                                navigate(pathKeys.events.detail(detail.eventId!)),
                            },
                          ]
                        : onCreateNarrativeEvent
                          ? [
                              {
                                id: 'create-event',
                                label: creatingNarrativeEvent
                                  ? '사건 생성 중…'
                                  : '연표 사건 만들어 연결',
                                icon: <FiPlus size={13} />,
                                disabled: creatingNarrativeEvent,
                                onSelect: onCreateNarrativeEvent,
                              },
                            ]
                          : []),
                      { type: 'divider' as const, id: 'divider-danger' },
                      {
                        id: 'delete-election',
                        label: '선거 삭제',
                        icon: <FiTrash2 size={13} />,
                        danger: true,
                        onSelect: onDeleteElection,
                      },
                    ]}
                  />
                </ElectionHeroActions>
              </ElectionHeroTopRow>

              <ElectionHeroTitleRow>
                <ElectionHeroTitle>
                  {electionPrimaryTitle(detail)}
                  {detail.shortName?.trim() &&
                  detail.shortName.trim() !== detail.name.trim() ? (
                    <ElectionHeroShortName>
                      {detail.shortName.trim()}
                    </ElectionHeroShortName>
                  ) : null}
                </ElectionHeroTitle>
              </ElectionHeroTitleRow>

              <ElectionHeroCompactFacts aria-label="선거 핵심 명세">
                <ElectionHeroFactItem>
                  <FiCalendar size={12} aria-hidden />
                  <span className="mono">
                    {formatPollDate(detail.pollDate)}
                    {detail.pollEndDate != null &&
                    String(detail.pollEndDate).trim() !== ''
                      ? ` – ${formatPollDate(detail.pollEndDate)}`
                      : ''}
                  </span>
                </ElectionHeroFactItem>
                {detail.voterTurnoutPercent != null &&
                String(detail.voterTurnoutPercent).trim() !== '' ? (
                  <ElectionHeroFactItem>
                    <span className="k">투표율</span>
                    <strong className="mono">
                      {detail.voterTurnoutPercent}%
                    </strong>
                  </ElectionHeroFactItem>
                ) : null}
                {detail.chamber ? (
                  <ElectionHeroFactItem>
                    <span className="k">원</span>
                    <span title={detail.chamber.localName ?? undefined}>
                      {detail.chamber.name}
                      {detail.chamber.localName ? ` (${detail.chamber.localName})` : ''}
                    </span>
                  </ElectionHeroFactItem>
                ) : null}
                {detail.totalSeats != null ? (
                  <ElectionHeroFactItem>
                    <span className="k">총 의석</span>
                    <strong className="mono">
                      {detail.totalSeats.toLocaleString('ko-KR')}석
                    </strong>
                  </ElectionHeroFactItem>
                ) : null}
                {detail.legislatureTermStart || detail.legislatureTermEnd ? (
                  <ElectionHeroFactItem>
                    <span className="k">의회 임기</span>
                    <span className="mono">
                      {detail.legislatureTermStart
                        ? formatPollDate(detail.legislatureTermStart)
                        : '—'}
                      {' – '}
                      {detail.legislatureTermEnd
                        ? formatPollDate(detail.legislatureTermEnd)
                        : '—'}
                    </span>
                  </ElectionHeroFactItem>
                ) : null}
                {detail.resultingLegislatureClosureKind ||
                (detail.resultingLegislatureClosureDate != null &&
                  String(detail.resultingLegislatureClosureDate).trim() !==
                    '') ? (
                  <ElectionHeroFactItem>
                    <span className="k">의회 종료</span>
                    <span>
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
                        .join(' · ')}
                    </span>
                  </ElectionHeroFactItem>
                ) : null}
                {electionScopeCountryLabel(detail) ? (
                  <ElectionHeroFactItem>
                    <span className="k">소속</span>
                    <span>{electionScopeCountryLabel(detail)}</span>
                  </ElectionHeroFactItem>
                ) : null}
                {matchedSystemAtPoll ? (
                  <ElectionHeroFactItem>
                    <span className="k">당시 정체</span>
                    <span>
                      {formatPoliticalSystemContextSummary(matchedSystemAtPoll)}
                    </span>
                  </ElectionHeroFactItem>
                ) : null}
              </ElectionHeroCompactFacts>

              {/* ── 사건 상세 DetailPower.ElectionRow 스타일 핵심 결과 & 파워 바 ── */}
              {electedCandidacies.length > 0 ||
              leadingPartyInfo ||
              heroPowerBar ? (
                <ElectionHeroOutcomeStrip aria-label="선거 핵심 결과 요약">
                  {electedCandidacies.length > 0 ? (
                    <ElectionWinnerLine>
                      <ElectionWinnerKicker>당선</ElectionWinnerKicker>
                      <ElectionWinnerNames>
                        {electedCandidacies.slice(0, 4).map((cand, idx) => {
                          const pid = cand.personId ?? cand.person?.id ?? null
                          const registryColor = cand.partyId
                            ? parties.find((p) => p.id === cand.partyId)
                                ?.brandColor
                            : null
                          const rawColor = (
                            cand.party?.brandColor ?? registryColor
                          )?.trim()
                          const dotColor =
                            rawColor && /^#?[0-9A-Fa-f]{6}$/.test(rawColor)
                              ? rawColor.startsWith('#')
                                ? rawColor
                                : `#${rawColor}`
                              : null
                          const pct = formatVoteShareLabel(
                            cand.result?.voteSharePercent,
                          )
                          return (
                            <React.Fragment key={cand.id}>
                              {idx > 0 ? (
                                <ElectionCategorySep aria-hidden>
                                  ·
                                </ElectionCategorySep>
                              ) : null}
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                {dotColor ? (
                                  <PartyColorDot
                                    $fill={dotColor}
                                    style={{ marginRight: 2 }}
                                    aria-hidden
                                  />
                                ) : null}
                                {pid ? (
                                  <EntityTableLinkBtn
                                    type="button"
                                    onClick={() => setMentionPersonId(pid)}
                                    style={{ fontWeight: 700 }}
                                  >
                                    {candidacyLabel(cand)}
                                  </EntityTableLinkBtn>
                                ) : (
                                  <strong>{candidacyLabel(cand)}</strong>
                                )}
                                {cand.party ? (
                                  <span className="meta">
                                    ({getPartyShortName(cand.party)})
                                  </span>
                                ) : null}
                                {pct ? (
                                  <span className="mono">{pct}</span>
                                ) : null}
                              </span>
                            </React.Fragment>
                          )
                        })}
                        {electedCandidacies.length > 4 ? (
                          <ElectionChainBtn
                            type="button"
                            onClick={() => setActiveDetailTab('candidacies')}
                          >
                            외 {electedCandidacies.length - 4}명 당선 →
                          </ElectionChainBtn>
                        ) : null}
                      </ElectionWinnerNames>
                    </ElectionWinnerLine>
                  ) : leadingPartyInfo ? (
                    <ElectionWinnerLine>
                      <ElectionWinnerKicker>제1당</ElectionWinnerKicker>
                      <ElectionWinnerNames>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <PartyColorDot
                            $fill={leadingPartyInfo.fill}
                            style={{ marginRight: 0 }}
                            aria-hidden
                          />
                          <EntityTableLinkBtn
                            type="button"
                            onClick={() =>
                              setElectionMentionPartyId(
                                leadingPartyInfo.row.partyId,
                              )
                            }
                            style={{ fontWeight: 700 }}
                          >
                            {leadingPartyInfo.name}
                          </EntityTableLinkBtn>
                          {leadingPartyInfo.seats ? (
                            <span className="mono">
                              {leadingPartyInfo.seats}
                            </span>
                          ) : null}
                          {leadingPartyInfo.pct ? (
                            <span className="mono">
                              ({leadingPartyInfo.pct})
                            </span>
                          ) : null}
                        </span>
                      </ElectionWinnerNames>
                    </ElectionWinnerLine>
                  ) : null}

                  {heroPowerBar ? (
                    <ElectionResultHemicycle
                      segments={heroPowerBar.segments}
                      totalSeats={
                        !isReferendum &&
                        heroPowerBar.mode === 'parties' &&
                        detail.totalSeats != null &&
                        detail.totalSeats > 0
                          ? detail.totalSeats
                          : null
                      }
                      kicker={heroPowerBar.kicker}
                      alliances={
                        heroPowerBar.mode === 'parties'
                          ? allianceSummaries.map((summary) => ({
                              key: summary.alliance.id,
                              label: summary.alliance.shortName || summary.alliance.name,
                              fill: summary.fill,
                            }))
                          : []
                      }
                      onSelectSegment={(segment) => {
                        if (segment.partyId) {
                          setElectionMentionPartyId(segment.partyId)
                        } else if (segment.personId) {
                          setMentionPersonId(segment.personId)
                        }
                      }}
                    />
                  ) : null}
                </ElectionHeroOutcomeStrip>
              ) : null}
            </ElectionHero>

            {/* ── 사건 상세(S.TabBar) 문법 스티키 가로 탭 ── */}
            <ElectionTabBar role="tablist" aria-label="선거 상세 섹션 탭">
              <ElectionTabBtn
                type="button"
                role="tab"
                aria-selected={resolvedDetailTab === 'overview'}
                $active={resolvedDetailTab === 'overview'}
                onClick={() => setActiveDetailTab('overview')}
              >
                개요
                <ElectionTabCount $active={resolvedDetailTab === 'overview'}>
                  {overviewCount}
                </ElectionTabCount>
              </ElectionTabBtn>

              {!isReferendum || partyResults.length > 0 ? (
                <ElectionTabBtn
                  type="button"
                  role="tab"
                  aria-selected={resolvedDetailTab === 'parties'}
                  $active={resolvedDetailTab === 'parties'}
                  data-empty={partyResults.length === 0 || undefined}
                  onClick={() => setActiveDetailTab('parties')}
                >
                  정당 집계 · 추이
                  <ElectionTabCount $active={resolvedDetailTab === 'parties'}>
                    {partyResults.length}
                  </ElectionTabCount>
                </ElectionTabBtn>
              ) : null}

              {!isReferendum ? (
                <ElectionTabBtn
                  type="button"
                  role="tab"
                  aria-selected={resolvedDetailTab === 'candidacies'}
                  $active={resolvedDetailTab === 'candidacies'}
                  data-empty={detail.candidacies.length === 0 || undefined}
                  onClick={() => setActiveDetailTab('candidacies')}
                >
                  후보 · 개표
                  <ElectionTabCount
                    $active={resolvedDetailTab === 'candidacies'}
                  >
                    {detail.candidacies.length}
                  </ElectionTabCount>
                </ElectionTabBtn>
              ) : (
                <ElectionTabBtn
                  type="button"
                  role="tab"
                  aria-selected={resolvedDetailTab === 'ballots'}
                  $active={resolvedDetailTab === 'ballots'}
                  data-empty={sortedBallotOptions.length === 0 || undefined}
                  onClick={() => setActiveDetailTab('ballots')}
                >
                  투표 안 · 개표
                  <ElectionTabCount $active={resolvedDetailTab === 'ballots'}>
                    {sortedBallotOptions.length}
                  </ElectionTabCount>
                </ElectionTabBtn>
              )}

              <ElectionTabViewModeBtn
                type="button"
                role="tab"
                aria-selected={resolvedDetailTab === 'all'}
                $active={resolvedDetailTab === 'all'}
                onClick={() =>
                  setActiveDetailTab((prev) =>
                    prev === 'all' ? 'overview' : 'all',
                  )
                }
                title="모든 탭 섹션을 한 화면에 연속해서 펼쳐 봅니다"
              >
                {resolvedDetailTab === 'all' ? '탭별로 보기' : '전체 펼치기'}
              </ElectionTabViewModeBtn>
            </ElectionTabBar>

            {/* ── 1) 개요 탭 (서술·설명 + 의회 종료 서술 + 핵심 개표 요약 장부) ── */}
            {resolvedDetailTab === 'overview' || resolvedDetailTab === 'all' ? (
              <ElectionLedgerSection aria-label="선거 개요 및 서술">
                <ElectionNarrativeBlock>
                  <ElectionSectionHeader>
                    <ElectionSectionHeaderLeft>
                      <ElectionSectionTitle>서술 · 배경</ElectionSectionTitle>
                      {detail.eventId &&
                      hasRichTextContent(detail.event?.description ?? '') ? (
                        <ElectionSectionSubtitle>
                          연결 사건(Event) 정본 공유
                        </ElectionSectionSubtitle>
                      ) : null}
                    </ElectionSectionHeaderLeft>
                    {/* 비어 있을 땐 본문 자리의 '+ 작성하기' 한 줄만 — 머리 버튼까지 두면 같은 일이 두 번 */}
                    {hasDescriptionContent &&
                    narrativeEdit !== 'legislature' &&
                    narrativeEdit !== 'stats' ? (
                      <ElectionSectionActions>
                        <ElectionSectionActionBtn
                          type="button"
                          onClick={() => {
                            setDescriptionDraft(effectiveElectionDescription)
                            setNarrativeEdit('stats')
                          }}
                        >
                          <FiEdit2 size={12} aria-hidden />
                          수정
                        </ElectionSectionActionBtn>
                      </ElectionSectionActions>
                    ) : null}
                  </ElectionSectionHeader>

                  {narrativeEdit === 'stats' ? (
                    <HistoryArticleInner>
                      <HistoryArticleEditorWrap>
                        <RichTextEditor
                          value={descriptionDraft}
                          onChange={setDescriptionDraft}
                          placeholder="선거의 배경·쟁점·결과 의의 등을 기록하세요"
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
                  ) : hasDescriptionContent ? (
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
                    <ElectionAddLineBtn
                      type="button"
                      onClick={() => {
                        setDescriptionDraft(effectiveElectionDescription)
                        setNarrativeEdit('stats')
                      }}
                    >
                      + 선거 배경·설명 작성하기
                    </ElectionAddLineBtn>
                  )}
                </ElectionNarrativeBlock>

                {showLegislatureDissolutionNarrative ? (
                  <ElectionNarrativeBlock>
                    <ElectionSectionHeader>
                      <ElectionSectionHeaderLeft>
                        <ElectionSectionTitle>
                          이번 의회 종료 서술
                        </ElectionSectionTitle>
                        {detail.resultingLegislatureClosureKind ? (
                          <ElectionSectionSubtitle>
                            {labelLegislatureClosureKind(
                              detail.resultingLegislatureClosureKind,
                            )}
                          </ElectionSectionSubtitle>
                        ) : null}
                      </ElectionSectionHeaderLeft>
                      {hasLegislatureNoteContent &&
                      narrativeEdit !== 'legislature' &&
                      narrativeEdit !== 'stats' ? (
                        <ElectionSectionActions>
                          <ElectionSectionActionBtn
                            type="button"
                            onClick={() => {
                              setLegislatureDraft(
                                detail.resultingLegislatureDissolutionNotes ??
                                  '',
                              )
                              setNarrativeEdit('legislature')
                            }}
                          >
                            <FiEdit2 size={12} aria-hidden />
                            수정
                          </ElectionSectionActionBtn>
                        </ElectionSectionActions>
                      ) : null}
                    </ElectionSectionHeader>

                    {narrativeEdit === 'legislature' ? (
                      <HistoryArticleInner>
                        <HistoryArticleEditorWrap>
                          <RichTextEditor
                            value={legislatureDraft}
                            onChange={setLegislatureDraft}
                            placeholder="정시 만료·조기 해산 경위 등 (선택)"
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
                                detail.resultingLegislatureDissolutionNotes ??
                                  '',
                              )
                              setNarrativeEdit(null)
                            }}
                          >
                            취소
                          </HistoryArticleCancelBtn>
                          <HistoryArticleSaveBtn
                            type="button"
                            disabled={savingNarrative}
                            onClick={() =>
                              void handleSaveLegislatureNarrative()
                            }
                          >
                            {savingNarrative ? '저장 중…' : '저장'}
                          </HistoryArticleSaveBtn>
                        </HistoryArticleEditActions>
                      </HistoryArticleInner>
                    ) : hasLegislatureNoteContent ? (
                      <HistoryArticleInner>
                        <RichTextProseWithEntityClicks
                          readViewAs={HistoryArticleProse}
                          html={
                            detail.resultingLegislatureDissolutionNotes ?? ''
                          }
                          aria-label="이번 의회 종료 서술"
                          hideWhenEmpty
                          onPersonClick={setMentionPersonId}
                          onPoliticalPartyClick={handleElectionProsePartyClick}
                          setTermTooltip={setElectionProseTermTooltip}
                          setDynastyTooltip={setElectionProseDynastyTooltip}
                        />
                      </HistoryArticleInner>
                    ) : (
                      <ElectionAddLineBtn
                        type="button"
                        onClick={() => {
                          setLegislatureDraft(
                            detail.resultingLegislatureDissolutionNotes ?? '',
                          )
                          setNarrativeEdit('legislature')
                        }}
                      >
                        + 이번 의회 종료 서술 작성하기
                      </ElectionAddLineBtn>
                    )}
                  </ElectionNarrativeBlock>
                ) : null}

                {/* 개요 탭 전용: 핵심 개표·의석 요약 장부 (전체 펼치기 시에는 아래 본 탭이 바로 이어지므로 중복 생략) */}
                {resolvedDetailTab === 'overview' ? (
                  <ElectionOverviewGrid>
                    {!isReferendum ? (
                      <>
                        <ElectionOverviewCard>
                          <ElectionSectionHeader>
                            <ElectionSectionHeaderLeft>
                              <ElectionSectionTitle>
                                정당 집계 요약
                              </ElectionSectionTitle>
                              <ElectionSectionSubtitle>
                                {partyResults.length}개 정당
                                {detail.totalSeats != null
                                  ? ` · 총 ${detail.totalSeats}석`
                                  : ''}
                                {matchedSystemAtPoll?.electoralSystem
                                  ? ` · ${ELECTORAL_SYSTEM_TYPE_LABEL[matchedSystemAtPoll.electoralSystem]}`
                                  : ''}
                                {matchedSystemAtPoll?.electoralThresholdPercent !=
                                null
                                  ? ` · 봉쇄 ${matchedSystemAtPoll.electoralThresholdPercent}%`
                                  : ''}
                              </ElectionSectionSubtitle>
                            </ElectionSectionHeaderLeft>
                            {/* 추가는 '정당 집계·추이' 탭에서 — 요약 카드엔 그 탭으로 가는 길 하나만 */}
                            {partyResults.length > 0 ? (
                              <ElectionSectionActions>
                                <ElectionSectionActionBtn
                                  type="button"
                                  onClick={() => setActiveDetailTab('parties')}
                                >
                                  전체 보기 →
                                </ElectionSectionActionBtn>
                              </ElectionSectionActions>
                            ) : null}
                          </ElectionSectionHeader>

                          {partyResults.length === 0 ? (
                            <ElectionTabEmptyBox>
                              <ElectionTabEmptyText>
                                아직 등록된 정당별 집계가 없습니다.
                              </ElectionTabEmptyText>
                              <div
                                style={{
                                  display: 'flex',
                                  gap: 8,
                                  flexWrap: 'wrap',
                                }}
                              >
                                <ElectionSectionActionBtn
                                  type="button"
                                  onClick={onAddPartyResult}
                                >
                                  <FiPlus size={12} aria-hidden />첫 정당 집계
                                  추가
                                </ElectionSectionActionBtn>
                                {onSyncPartyResultsFromCandidacies &&
                                detail.candidacies.some((cand) =>
                                  Boolean(cand.partyId),
                                ) ? (
                                  <ElectionSectionActionBtn
                                    type="button"
                                    disabled={syncingPartyResults}
                                    onClick={onSyncPartyResultsFromCandidacies}
                                  >
                                    {syncingPartyResults
                                      ? '집계 반영 중…'
                                      : '후보 결과로 집계 반영'}
                                  </ElectionSectionActionBtn>
                                ) : null}
                              </div>
                            </ElectionTabEmptyBox>
                          ) : (
                            <>
                              <div>
                                {sortedPartyTableRows.slice(0, 6).map((row) => {
                                  const registryColor = parties.find(
                                    (p) => p.id === row.partyId,
                                  )?.brandColor
                                  const dotFill = partyResultSliceFill(
                                    row,
                                    hueFromPartyId(row.partyId),
                                    registryColor,
                                  )
                                  const pct = formatVoteShareLabel(
                                    row.voteSharePercent,
                                  )
                                  const votesStr = formatVotesForDisplay(
                                    row.votes,
                                  )
                                  const seatRatioPct =
                                    row.seatsWon != null &&
                                    detail.totalSeats != null &&
                                    detail.totalSeats > 0
                                      ? (row.seatsWon / detail.totalSeats) * 100
                                      : NaN
                                  const voteRatioPct =
                                    row.voteSharePercent != null
                                      ? Number(row.voteSharePercent)
                                      : NaN
                                  const overviewBarPct = Number.isFinite(
                                    seatRatioPct,
                                  )
                                    ? seatRatioPct
                                    : Number.isFinite(voteRatioPct)
                                      ? voteRatioPct
                                      : null
                                  return (
                                    <ElectionOverviewRowStack key={row.id}>
                                      <ElectionOverviewRowMain>
                                        <PartyNameInline>
                                          <PartyColorDot
                                            $fill={dotFill}
                                            aria-hidden
                                          />
                                          <EntityTableLinkBtn
                                            type="button"
                                            onClick={() =>
                                              setElectionMentionPartyId(
                                                row.partyId,
                                              )
                                            }
                                            style={{ fontWeight: 600 }}
                                          >
                                            {row.party
                                              ? getPartyDisplayName(row.party)
                                              : row.partyId}
                                          </EntityTableLinkBtn>
                                        </PartyNameInline>
                                        <span className="stats">
                                          {row.seatsWon != null ? (
                                            <strong>{row.seatsWon}석</strong>
                                          ) : null}
                                          {pct ? <span>{pct}</span> : null}
                                          {votesStr !== '—' ? (
                                            <span className="muted">
                                              {votesStr}표
                                            </span>
                                          ) : null}
                                        </span>
                                      </ElectionOverviewRowMain>
                                      {overviewBarPct != null &&
                                      overviewBarPct > 0 ? (
                                        <ElectionOverviewMiniTrack aria-hidden>
                                          <ElectionOverviewMiniFill
                                            $pct={overviewBarPct}
                                            $fill={dotFill}
                                          />
                                        </ElectionOverviewMiniTrack>
                                      ) : null}
                                    </ElectionOverviewRowStack>
                                  )
                                })}
                              </div>
                              {validationNotes.length > 0 ? (
                                <PartyValidationBanner
                                  $tone={validationWorstTone}
                                  role="status"
                                >
                                  <FiInfo
                                    size={14}
                                    strokeWidth={2.25}
                                    aria-hidden
                                    style={{ flexShrink: 0, marginTop: 2 }}
                                  />
                                  <PartyValidationList>
                                    {validationNotes.map((note, idx) => (
                                      <li key={idx}>{note.text}</li>
                                    ))}
                                  </PartyValidationList>
                                </PartyValidationBanner>
                              ) : null}
                            </>
                          )}
                        </ElectionOverviewCard>

                        <ElectionOverviewCard>
                          <ElectionSectionHeader>
                            <ElectionSectionHeaderLeft>
                              <ElectionSectionTitle>
                                {electedCandidacies.length > 0
                                  ? '당선자 · 주요 후보'
                                  : '출마 후보 요약'}
                              </ElectionSectionTitle>
                              <ElectionSectionSubtitle>
                                전체 {detail.candidacies.length}명
                                {candidacyTotals.electedCount > 0
                                  ? ` · 당선 ${candidacyTotals.electedCount}명`
                                  : ''}
                              </ElectionSectionSubtitle>
                            </ElectionSectionHeaderLeft>
                            {/* 비었을 땐 아래 '첫 후보 추가' 하나, 있으면 후보 탭으로 가는 길 하나 */}
                            {detail.candidacies.length > 0 ? (
                              <ElectionSectionActions>
                                <ElectionSectionActionBtn
                                  type="button"
                                  onClick={() =>
                                    setActiveDetailTab('candidacies')
                                  }
                                >
                                  전체 보기 →
                                </ElectionSectionActionBtn>
                              </ElectionSectionActions>
                            ) : null}
                          </ElectionSectionHeader>

                          {detail.candidacies.length === 0 ? (
                            <ElectionTabEmptyBox>
                              <ElectionTabEmptyText>
                                아직 등록된 출마 후보가 없습니다.
                              </ElectionTabEmptyText>
                              <ElectionSectionActionBtn
                                type="button"
                                onClick={onAddCandidacy}
                              >
                                <FiPlus size={12} aria-hidden />첫 후보 추가
                              </ElectionSectionActionBtn>
                            </ElectionTabEmptyBox>
                          ) : (
                            <div>
                              {(electedCandidacies.length > 0
                                ? electedCandidacies.slice(0, 6)
                                : filteredSortedCandidacies.slice(0, 6)
                              ).map((cand) => {
                                const pid =
                                  cand.personId ?? cand.person?.id ?? null
                                const pct = formatVoteShareLabel(
                                  cand.result?.voteSharePercent,
                                )
                                const pctNum =
                                  cand.result?.voteSharePercent != null
                                    ? Number(cand.result.voteSharePercent)
                                    : NaN
                                const votesStr = formatVotesForDisplay(
                                  cand.result?.votes,
                                )
                                const candRegColor = cand.partyId
                                  ? parties.find((p) => p.id === cand.partyId)
                                      ?.brandColor
                                  : null
                                const rawCandColor = (
                                  cand.party?.brandColor ?? candRegColor
                                )?.trim()
                                const candFill =
                                  rawCandColor &&
                                  /^#?[0-9A-Fa-f]{6}$/.test(rawCandColor)
                                    ? rawCandColor.startsWith('#')
                                      ? rawCandColor
                                      : `#${rawCandColor}`
                                    : ledgerAccent(theme.mode)
                                return (
                                  <ElectionOverviewRowStack key={cand.id}>
                                    <ElectionOverviewRowMain>
                                      <div
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 6,
                                          minWidth: 0,
                                        }}
                                      >
                                        <PartyColorDot
                                          $fill={candFill}
                                          style={{ marginRight: 2 }}
                                          aria-hidden
                                        />
                                        {cand.ballotOrder != null ? (
                                          <span className="ord">
                                            기호 {cand.ballotOrder}
                                          </span>
                                        ) : cand.listRank != null ? (
                                          <span className="ord">
                                            비례 {cand.listRank}
                                          </span>
                                        ) : null}
                                        {pid ? (
                                          <EntityTableLinkBtn
                                            type="button"
                                            onClick={() =>
                                              setMentionPersonId(pid)
                                            }
                                            style={{ fontWeight: 600 }}
                                          >
                                            {candidacyLabel(cand)}
                                          </EntityTableLinkBtn>
                                        ) : (
                                          <span style={{ fontWeight: 600 }}>
                                            {candidacyLabel(cand)}
                                          </span>
                                        )}
                                        {cand.party ? (
                                          <span className="muted">
                                            · {getPartyShortName(cand.party)}
                                          </span>
                                        ) : null}
                                        {cand.electoralDistrict?.name ? (
                                          <span className="muted">
                                            ({cand.electoralDistrict.name})
                                          </span>
                                        ) : null}
                                      </div>
                                      <span className="stats">
                                        {cand.result?.elected ? (
                                          <ElectedBadge style={{ marginLeft: 0 }}>
                                            당선
                                          </ElectedBadge>
                                        ) : null}
                                        {cand.resultingTenure ? (
                                          <span
                                            className="muted"
                                            title="연결된 공직 재임"
                                            style={{ fontSize: 11 }}
                                          >
                                            재임:{' '}
                                            {cand.resultingTenure
                                              .positionDefinition?.title ??
                                              cand.resultingTenure.title ??
                                              '연결됨'}
                                          </span>
                                        ) : cand.result?.elected &&
                                          pid &&
                                          onRegisterWinnerTenure ? (
                                          <ElectionChainBtn
                                            type="button"
                                            onClick={() =>
                                              onRegisterWinnerTenure(
                                                cand,
                                                matchedSystemAtPoll,
                                              )
                                            }
                                            title="당선자의 대통령·의원·공직 재임 기록을 선거와 연결해 등록합니다"
                                          >
                                            + 재임 등록
                                          </ElectionChainBtn>
                                        ) : null}
                                        {pct ? <strong>{pct}</strong> : null}
                                        {votesStr !== '—' ? (
                                          <span className="muted">
                                            {votesStr}표
                                          </span>
                                        ) : null}
                                      </span>
                                    </ElectionOverviewRowMain>
                                    {Number.isFinite(pctNum) && pctNum > 0 ? (
                                      <ElectionOverviewMiniTrack aria-hidden>
                                        <ElectionOverviewMiniFill
                                          $pct={pctNum}
                                          $fill={candFill}
                                        />
                                      </ElectionOverviewMiniTrack>
                                    ) : null}
                                  </ElectionOverviewRowStack>
                                )
                              })}
                            </div>
                          )}
                        </ElectionOverviewCard>
                      </>
                    ) : (
                      <ElectionOverviewCard>
                        <ElectionSectionHeader>
                          <ElectionSectionHeaderLeft>
                            <ElectionSectionTitle>
                              국민투표 안건 개표 요약
                            </ElectionSectionTitle>
                            <ElectionSectionSubtitle>
                              {sortedBallotOptions.length}개 선택지
                            </ElectionSectionSubtitle>
                          </ElectionSectionHeaderLeft>
                          <ElectionSectionActions>
                            <ElectionSectionActionBtn
                              type="button"
                              onClick={() => setActiveDetailTab('ballots')}
                            >
                              투표 안 관리·개표 상세 →
                            </ElectionSectionActionBtn>
                          </ElectionSectionActions>
                        </ElectionSectionHeader>
                        {referendumBallotBars.length === 0 ? (
                          <ElectionTabEmptyBox>
                            <ElectionTabEmptyText>
                              등록된 투표 안(찬성·반대 등)이 없습니다.
                            </ElectionTabEmptyText>
                            <ElectionSectionActionBtn
                              type="button"
                              onClick={() => setActiveDetailTab('ballots')}
                            >
                              <FiPlus size={12} aria-hidden />
                              투표 안 추가하러 가기
                            </ElectionSectionActionBtn>
                          </ElectionTabEmptyBox>
                        ) : (
                          <ReferendumBallotBars style={{ marginBottom: 0 }}>
                            {referendumBallotBars.map((row) => (
                              <ReferendumBallotBarRow key={row.id}>
                                <ReferendumBallotBarLabel>
                                  {row.label}
                                </ReferendumBallotBarLabel>
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
                        )}
                      </ElectionOverviewCard>
                    )}
                  </ElectionOverviewGrid>
                ) : null}
              </ElectionLedgerSection>
            ) : null}

            {/* ── 2) 정당 집계 · 추이 탭 ── */}
            {resolvedDetailTab === 'parties' ||
            (resolvedDetailTab === 'all' &&
              (!isReferendum || partyResults.length > 0)) ? (
              <ElectionLedgerSection aria-label="정당별 집계 및 추이">
                <ElectionSectionHeader>
                  <ElectionSectionHeaderLeft>
                    <ElectionSectionTitle>
                      정당별 집계 (전국·비례 등)
                    </ElectionSectionTitle>
                    <ElectionSectionSubtitle>
                      {partyResults.length}개 정당
                      {detail.totalSeats != null
                        ? ` · 총 ${detail.totalSeats}석`
                        : ''}
                    </ElectionSectionSubtitle>
                  </ElectionSectionHeaderLeft>
                  <ElectionSectionActions>
                    {!isReferendum &&
                    onSyncPartyResultsFromCandidacies &&
                    detail.candidacies.some((cand) => Boolean(cand.partyId)) ? (
                      <ElectionSectionActionBtn
                        type="button"
                        disabled={syncingPartyResults}
                        onClick={onSyncPartyResultsFromCandidacies}
                        title="후보 테이블의 정당별 득표·당선 결과를 합산해 정당별 집계에 반영합니다"
                      >
                        {syncingPartyResults
                          ? '집계 반영 중…'
                          : '후보 결과로 집계 반영'}
                      </ElectionSectionActionBtn>
                    ) : null}
                    {!isReferendum ? (
                      <ElectionSectionActionBtn
                        type="button"
                        onClick={onAddAlliance}
                        title="각자 출마하되 하나로 묶여 싸운 정당 묶음(블록·연대). 연정은 행정부·내각, 합당은 정당 계보에서 등록합니다"
                      >
                        <FiPlus size={12} strokeWidth={2.25} aria-hidden />
                        연합 추가
                      </ElectionSectionActionBtn>
                    ) : null}
                    <ElectionSectionActionBtn
                      type="button"
                      onClick={onAddPartyResult}
                    >
                      <FiPlus size={12} strokeWidth={2.25} aria-hidden />
                      집계 추가
                    </ElectionSectionActionBtn>
                  </ElectionSectionActions>
                </ElectionSectionHeader>

                <ElectionAlliancesPanel
                  summaries={allianceSummaries}
                  totalSeats={detail.totalSeats ?? null}
                  partyInfo={alliancePartyInfo}
                  onEdit={onEditAlliance}
                  onDelete={onDeleteAlliance}
                  onSelectParty={(partyId) => setElectionMentionPartyId(partyId)}
                />

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
                          onClick={() =>
                            setPartyDistributionMetric('voteShare')
                          }
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
                                    $emphasize={
                                      hoveredDonutSliceRowId === s.row.id
                                    }
                                  >
                                    <PartyShareDonutSectorPath
                                      $fill={s.fill}
                                      d={d}
                                      tabIndex={0}
                                      role="button"
                                      aria-label={tip}
                                      style={{ cursor: 'pointer' }}
                                      onClick={() => {
                                        if (s.row.partyId !== '__other__') {
                                          setElectionMentionPartyId(
                                            s.row.partyId,
                                          )
                                        }
                                      }}
                                      onKeyDown={(event) => {
                                        if (
                                          event.key === 'Enter' ||
                                          event.key === ' '
                                        ) {
                                          event.preventDefault()
                                          if (s.row.partyId !== '__other__') {
                                            setElectionMentionPartyId(
                                              s.row.partyId,
                                            )
                                          }
                                        }
                                      }}
                                      onMouseEnter={(e) => {
                                        setHoveredDonutSliceRowId(s.row.id)
                                        showChartTip(tip, e)
                                      }}
                                      onMouseMove={moveChartTip}
                                      onFocus={() =>
                                        setHoveredDonutSliceRowId(s.row.id)
                                      }
                                      onBlur={() =>
                                        setHoveredDonutSliceRowId(null)
                                      }
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
                          <PartyShareDonutHole aria-hidden>
                            {partyDistributionMetric === 'seats' ? (
                              <>
                                <span className="kicker">
                                  {detail.totalSeats != null
                                    ? '총 의석'
                                    : '집계 의석'}
                                </span>
                                <strong className="main">
                                  {(
                                    detail.totalSeats ??
                                    partyResultsSummary.seatsSum
                                  ).toLocaleString('ko-KR')}
                                  석
                                </strong>
                                {detail.totalSeats != null &&
                                detail.totalSeats > 0 ? (
                                  <span className="sub">
                                    과반{' '}
                                    {(
                                      Math.floor(detail.totalSeats / 2) + 1
                                    ).toLocaleString('ko-KR')}
                                    석
                                  </span>
                                ) : null}
                              </>
                            ) : (
                              <>
                                <span className="kicker">
                                  {leadingPartyInfo ? '1위 득표' : '득표 합계'}
                                </span>
                                <strong className="main">
                                  {leadingPartyInfo?.pct ??
                                    `${partyResultsSummary.voteShareSum.toFixed(1)}%`}
                                </strong>
                                {detail.voterTurnoutPercent != null &&
                                String(detail.voterTurnoutPercent).trim() !==
                                  '' ? (
                                  <span className="sub">
                                    투표율 {detail.voterTurnoutPercent}%
                                  </span>
                                ) : null}
                              </>
                            )}
                          </PartyShareDonutHole>
                        </FullCircleDonutInner>
                      </FullCircleDonutClip>
                      <PartyShareLegend
                        onMouseLeave={() => setHoveredDonutSliceRowId(null)}
                      >
                        {(() => {
                          const LEGEND_VISIBLE_LIMIT = 10
                          const visible = legendExpanded
                            ? partyPieSlices.segments
                            : partyPieSlices.segments.slice(
                                0,
                                LEGEND_VISIBLE_LIMIT,
                              )
                          const hiddenCount =
                            partyPieSlices.segments.length - visible.length
                          return (
                            <>
                              {visible.map((s) => {
                                const label =
                                  getPartyDisplayName(s.row.party) ||
                                  s.row.partyId
                                const metricLine =
                                  partyDistributionMetric === 'seats'
                                    ? s.row.seatsWon != null &&
                                      s.row.seatsWon >= 0
                                      ? `${s.row.seatsWon}석 · ${(
                                          s.fraction * 100
                                        ).toFixed(1)}%`
                                      : `${(s.fraction * 100).toFixed(1)}%`
                                    : (formatVoteShareLabel(
                                        s.row.voteSharePercent,
                                      ) ?? `${(s.fraction * 100).toFixed(1)}%`)
                                return (
                                  <PartyShareLegendItem
                                    key={s.row.id}
                                    role="button"
                                    tabIndex={0}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => {
                                      if (s.row.partyId !== '__other__') {
                                        setElectionMentionPartyId(s.row.partyId)
                                      }
                                    }}
                                    onKeyDown={(event) => {
                                      if (
                                        event.key === 'Enter' ||
                                        event.key === ' '
                                      ) {
                                        event.preventDefault()
                                        if (s.row.partyId !== '__other__') {
                                          setElectionMentionPartyId(
                                            s.row.partyId,
                                          )
                                        }
                                      }
                                    }}
                                    onMouseEnter={() =>
                                      setHoveredDonutSliceRowId(s.row.id)
                                    }
                                  >
                                    <PartyShareSwatch
                                      $fill={s.fill}
                                      aria-hidden
                                    />
                                    <PartyShareLegendBody>
                                      <PartyShareName>{label}</PartyShareName>
                                      <PartyShareStats>
                                        {metricLine}
                                      </PartyShareStats>
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

                {partyResults.length === 0 ? (
                  <ElectionTabEmptyBox>
                    <ElectionTabEmptyText>
                      등록된 정당별 집계가 없습니다. 정당별 득표수·득표율·의석
                      수를 추가하면 분포 차트와 전회차 대비 증감이 자동으로
                      계산됩니다.
                    </ElectionTabEmptyText>
                    <div
                      style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
                    >
                      <ElectionSectionActionBtn
                        type="button"
                        onClick={onAddPartyResult}
                      >
                        <FiPlus size={12} aria-hidden />첫 정당 집계 추가
                      </ElectionSectionActionBtn>
                      {!isReferendum &&
                      onSyncPartyResultsFromCandidacies &&
                      detail.candidacies.some((cand) =>
                        Boolean(cand.partyId),
                      ) ? (
                        <ElectionSectionActionBtn
                          type="button"
                          disabled={syncingPartyResults}
                          onClick={onSyncPartyResultsFromCandidacies}
                        >
                          {syncingPartyResults
                            ? '집계 반영 중…'
                            : '후보 결과로 집계 반영'}
                        </ElectionSectionActionBtn>
                      ) : null}
                    </div>
                  </ElectionTabEmptyBox>
                ) : (
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
                                onClick={() =>
                                  togglePartyResultSort('deltaVote')
                                }
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
                                onClick={() =>
                                  togglePartyResultSort('deltaSeats')
                                }
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
                        {sortedPartyTableRows.map((row) => {
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
                                  <EntityTableLinkBtn
                                    type="button"
                                    onClick={() =>
                                      setElectionMentionPartyId(row.partyId)
                                    }
                                  >
                                    {row.party
                                      ? getPartyDisplayName(row.party)
                                      : row.partyId}
                                  </EntityTableLinkBtn>
                                  {row.allianceId && allianceNameById.get(row.allianceId) ? (
                                    <PartyAllianceTag>
                                      {allianceNameById.get(row.allianceId)}
                                    </PartyAllianceTag>
                                  ) : null}
                                </PartyNameInline>
                              </DataTd>
                              <DataTd>{formatVotesForDisplay(row.votes)}</DataTd>
                              <DataTd>
                                {formatVoteShareLabel(row.voteSharePercent) ??
                                  '—'}
                              </DataTd>
                              {hasPartyComparison ? (
                                <PartyResultDeltaTd
                                  $tone={deltaToneCss(
                                    cmp?.voteShareDeltaPpt ?? undefined,
                                  )}
                                >
                                  {formatVoteShareDeltaPpt(
                                    cmp?.voteShareDeltaPpt,
                                  )}
                                </PartyResultDeltaTd>
                              ) : null}
                              <DataTd>{row.seatsWon ?? '—'}</DataTd>
                              {hasPartyComparison ? (
                                <PartyResultDeltaTd
                                  $tone={deltaToneCss(
                                    cmp?.seatsDelta ?? undefined,
                                  )}
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
                        })}
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
                            <DataTd>
                              {partyResultsSummary.otherSeats ?? '—'}
                            </DataTd>
                            {hasPartyComparison ? <DataTd>—</DataTd> : null}
                            <DataTdRight />
                          </PartyOtherRow>
                        ) : null}
                        {partyResults.length > 0 ? (
                          <PartyTotalsRow>
                            <DataTd>합계</DataTd>
                            <DataTd>
                              {partyResultsSummary.votesKnownCount > 0
                                ? partyResultsSummary.votesSum.toLocaleString(
                                    'ko-KR',
                                  )
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
                                            partyResultsSummary.voteShareSum *
                                              100,
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
                )}

                {validationNotes.length > 0 ? (
                  <PartyValidationBanner
                    $tone={validationWorstTone}
                    role="status"
                  >
                    <FiInfo
                      size={14}
                      strokeWidth={2.25}
                      aria-hidden
                      style={{ flexShrink: 0, marginTop: 2 }}
                    />
                    <PartyValidationList>
                      {validationNotes.map((note, noteIdx) => (
                        <li key={noteIdx}>{note.text}</li>
                      ))}
                    </PartyValidationList>
                  </PartyValidationBanner>
                ) : null}

                {timelineBars.length >= 2 ? (
                  <ElectionTimelineBlock aria-label="동일 유형 선거 의석 추이">
                    <ElectionTimelineHeader>
                      <FiBarChart2 size={14} aria-hidden />
                      같은 유형 선거{' '}
                      {partyDistributionMetric === 'seats'
                        ? '의석'
                        : '득표율'}{' '}
                      추이 (최근 {timelineBars.length}회)
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
                                Math.round(
                                  (row.knownSum + row.otherValue) * 100,
                                ) / 100
                              ).toFixed(1)}%`
                          : partyDistributionMetric === 'seats'
                            ? '의석 —'
                            : '득표율 —'
                      return (
                        <ElectionTimelineRow
                          key={row.id}
                          $current={isCurrent}
                          $interactive={!isCurrent && Boolean(onSelectElection)}
                          onClick={() => {
                            if (!isCurrent && onSelectElection) {
                              onSelectElection(row.id)
                            }
                          }}
                        >
                          <ElectionTimelineRowLabel title={row.name}>
                            {labelTitle}
                            <small>{formatPollDate(row.pollDate)}</small>
                          </ElectionTimelineRowLabel>
                          <ElectionTimelineBarTrack
                            role="img"
                            aria-label={`${labelTitle}: ${row.segments
                              .map(
                                (seg) =>
                                  `${seg.name} ${formatValue(seg.value)}`,
                              )
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
                          <ElectionTimelineRowMeta>
                            {meta}
                          </ElectionTimelineRowMeta>
                        </ElectionTimelineRow>
                      )
                    })}
                  </ElectionTimelineBlock>
                ) : null}
              </ElectionLedgerSection>
            ) : null}

            {/* ── 3) 국민투표 안 · 개표 탭 ── */}
            {isReferendum &&
            (resolvedDetailTab === 'ballots' ||
              resolvedDetailTab === 'all') ? (
              <ElectionLedgerSection aria-label="국민투표 안건 및 개표">
                <ElectionSectionHeader>
                  <ElectionSectionHeaderLeft>
                    <ElectionSectionTitle>
                      투표 안 (선택지) · 개표 결과
                    </ElectionSectionTitle>
                    <ElectionSectionSubtitle>
                      {sortedBallotOptions.length}개 안건
                    </ElectionSectionSubtitle>
                  </ElectionSectionHeaderLeft>
                </ElectionSectionHeader>

                <ReferendumBallotAddRow>
                  <InlineTextInput
                    type="text"
                    value={ballotLabel}
                    onChange={(e) => setBallotLabel(e.target.value)}
                    placeholder="새 투표 안 제목 (예: 찬성, 반대, 제1안)"
                  />
                  <ElectionSectionActionBtn
                    type="button"
                    onClick={() => {
                      const t = ballotLabel.trim()
                      if (!t) {
                        notify.error('안 제목을 입력하세요.')
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
                    <FiPlus size={12} strokeWidth={2.25} aria-hidden />안 추가
                  </ElectionSectionActionBtn>
                </ReferendumBallotAddRow>

                {referendumBallotBars.length > 0 ? (
                  <ReferendumBallotBars>
                    <ReferendumBallotBarKicker>
                      득표 비중
                    </ReferendumBallotBarKicker>
                    {referendumBallotBars.map((row) => (
                      <ReferendumBallotBarRow
                        key={row.id}
                        onMouseEnter={(e) => showChartTip(row.hoverTitle, e)}
                        onMouseMove={moveChartTip}
                        onMouseLeave={hideChartTip}
                      >
                        <ReferendumBallotBarLabel>
                          {row.label}
                        </ReferendumBallotBarLabel>
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
                                      const nextLabel =
                                        editingBallotLabel.trim()
                                      if (!nextLabel) {
                                        notify.error('안 제목을 입력하세요.')
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
                              {formatVoteShareLabel(
                                opt.result?.voteSharePercent,
                              ) ?? '—'}
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
                      {sortedBallotOptions.length > 0 ? (
                        <PartyTotalsRow>
                          <DataTd>
                            합계 ({ballotOptionsSummary.totalCount}개 안)
                          </DataTd>
                          <DataTd>
                            {ballotOptionsSummary.votesKnown > 0
                              ? formatVotesForDisplay(
                                  ballotOptionsSummary.votesSum.toString(),
                                )
                              : '—'}
                          </DataTd>
                          <DataTd>
                            {ballotOptionsSummary.voteShareKnown > 0
                              ? `${ballotOptionsSummary.voteShareSum.toFixed(1)}%`
                              : '—'}
                          </DataTd>
                          <DataTdRight />
                        </PartyTotalsRow>
                      ) : null}
                    </tbody>
                  </DataTable>
                </DataTableCard>
              </ElectionLedgerSection>
            ) : null}

            {/* ── 4) 후보 · 개표 탭 ── */}
            {!isReferendum &&
            (resolvedDetailTab === 'candidacies' ||
              resolvedDetailTab === 'all') ? (
              <ElectionLedgerSection aria-label="후보자 및 개표 결과">
                <ElectionSectionHeader>
                  <ElectionSectionHeaderLeft>
                    <ElectionSectionTitle>후보 · 개표</ElectionSectionTitle>
                    <ElectionSectionSubtitle>
                      전체 {detail.candidacies.length}명
                      {candidacyTotals.electedCount > 0
                        ? ` · 당선 ${candidacyTotals.electedCount}명`
                        : ''}
                    </ElectionSectionSubtitle>
                  </ElectionSectionHeaderLeft>
                  <ElectionSectionActions>
                    {onBatchCalcCandidacyResults &&
                    detail.candidacies.some(
                      (cand) =>
                        cand.result?.votes != null &&
                        /^\d+$/.test(String(cand.result.votes).trim()),
                    ) ? (
                      <ElectionSectionActionBtn
                        type="button"
                        disabled={batchCalculatingCandidacies}
                        onClick={onBatchCalcCandidacyResults}
                        title="후보들의 득표수 합을 기준으로 득표율(%)과 동률 처리된 순위를 일괄 계산하여 저장합니다"
                      >
                        {batchCalculatingCandidacies
                          ? '계산 반영 중…'
                          : '득표순 순위·득표율 일괄 계산'}
                      </ElectionSectionActionBtn>
                    ) : null}
                    <ElectionSectionActionBtn
                      type="button"
                      onClick={onAddCandidacy}
                    >
                      <FiPlus size={12} strokeWidth={2.25} aria-hidden />
                      후보 추가
                    </ElectionSectionActionBtn>
                  </ElectionSectionActions>
                </ElectionSectionHeader>

                {detail.candidacies.length === 0 ? (
                  <ElectionTabEmptyBox>
                    <ElectionTabEmptyText>
                      등록된 출마 후보가 없습니다. 후보를 추가하면서 득표수·득표율·당선
                      여부를 한 번에 기록할 수 있습니다.
                    </ElectionTabEmptyText>
                    <ElectionSectionActionBtn
                      type="button"
                      onClick={onAddCandidacy}
                    >
                      <FiPlus size={12} aria-hidden />첫 후보 추가
                    </ElectionSectionActionBtn>
                  </ElectionTabEmptyBox>
                ) : (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 0 12px',
                      }}
                    >
                      <div style={{ flex: '1 1 200px', minWidth: 160 }}>
                        <ElectionListFilterInput
                          type="search"
                          value={candidacySearch}
                          onChange={(e) => setCandidacySearch(e.target.value)}
                          placeholder="후보명 · 정당 · 선거구 검색…"
                          aria-label="후보 검색"
                          style={{ width: '100%' }}
                        />
                      </div>
                      {candidacyPartyOptions.parties.length > 0 ||
                      candidacyPartyOptions.hasIndependent ? (
                        <div style={{ flex: '0 0 auto', width: 164 }}>
                          <ElectionListFilterSelect
                            value={candidacyPartyFilter}
                            onChange={(e) =>
                              setCandidacyPartyFilter(e.target.value)
                            }
                            aria-label="정당 필터"
                            style={{ width: '100%' }}
                          >
                            <option value="">전체 정당</option>
                            {candidacyPartyOptions.parties.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.label}
                              </option>
                            ))}
                            {candidacyPartyOptions.hasIndependent ? (
                              <option value="__independent__">
                                무소속 · 미지정
                              </option>
                            ) : null}
                          </ElectionListFilterSelect>
                        </div>
                      ) : null}
                      <div style={{ flex: '0 0 auto', width: 132 }}>
                        <ElectionListFilterSelect
                          value={candidacyStatusFilter}
                          onChange={(e) =>
                            setCandidacyStatusFilter(
                              e.target.value as '' | 'elected' | 'withdrawn',
                            )
                          }
                          aria-label="상태 필터"
                          style={{ width: '100%' }}
                        >
                          <option value="">전체 상태</option>
                          <option value="elected">당선자만</option>
                          <option value="withdrawn">사퇴자만</option>
                        </ElectionListFilterSelect>
                      </div>
                      <div style={{ flex: '0 0 auto', width: 146 }}>
                        <ElectionListFilterSelect
                          value={candidacySort.key}
                          onChange={(e) =>
                            toggleCandidacySort(
                              e.target.value as
                                | 'ballotOrder'
                                | 'name'
                                | 'votes'
                                | 'voteShare'
                                | 'rank',
                            )
                          }
                          aria-label="정렬 기준"
                          style={{ width: '100%' }}
                        >
                          <option value="votes">정렬: 득표수</option>
                          <option value="voteShare">정렬: 득표율</option>
                          <option value="ballotOrder">정렬: 기표·비례순</option>
                          <option value="rank">정렬: 순위·의석</option>
                          <option value="name">정렬: 이름</option>
                        </ElectionListFilterSelect>
                      </div>
                    </div>

                    <DataTableCard>
                      <DataTable>
                        <thead>
                          <tr>
                            <DataTh>
                              <DataThSortButton
                                type="button"
                                $active={candidacySort.key === 'name'}
                                onClick={() => toggleCandidacySort('name')}
                              >
                                후보 · 소속
                                <PartySortGlyph
                                  columnKey="name"
                                  activeKey={candidacySort.key}
                                  dir={candidacySort.dir}
                                />
                              </DataThSortButton>
                            </DataTh>
                            <DataTh>
                              <DataThSortButton
                                type="button"
                                $active={
                                  candidacySort.key === 'votes' ||
                                  candidacySort.key === 'voteShare'
                                }
                                onClick={() => toggleCandidacySort('votes')}
                              >
                                득표 · 득표율
                                <PartySortGlyph
                                  columnKey="votes"
                                  activeKey={
                                    candidacySort.key === 'voteShare'
                                      ? 'votes'
                                      : candidacySort.key
                                  }
                                  dir={candidacySort.dir}
                                />
                              </DataThSortButton>
                            </DataTh>
                            <DataTh>
                              <DataThSortButton
                                type="button"
                                $active={candidacySort.key === 'rank'}
                                onClick={() => toggleCandidacySort('rank')}
                              >
                                순위·의석
                                <PartySortGlyph
                                  columnKey="rank"
                                  activeKey={candidacySort.key}
                                  dir={candidacySort.dir}
                                />
                              </DataThSortButton>
                            </DataTh>
                            <DataThActions104 />
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSortedCandidacies.length === 0 ? (
                            <DataTr>
                              <DataTd colSpan={4}>
                                <EmptyHint>
                                  조건에 맞는 후보가 없습니다.
                                </EmptyHint>
                              </DataTd>
                            </DataTr>
                          ) : (
                            filteredSortedCandidacies.map((c) => {
                              const metaBits: string[] = []
                              if (c.electoralDistrict) {
                                metaBits.push(
                                  c.electoralDistrict.code
                                    ? `${c.electoralDistrict.name} (${c.electoralDistrict.code})`
                                    : c.electoralDistrict.name,
                                )
                              }
                              metaBits.push(
                                labelNominationType(c.nominationType),
                              )
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
                              const resolvedPersonId =
                                c.personId ?? c.person?.id ?? null
                              const registryColor = c.partyId
                                ? parties.find((p) => p.id === c.partyId)
                                    ?.brandColor
                                : null
                              const rawColor = (
                                c.party?.brandColor ?? registryColor
                              )?.trim()
                              const dotFill =
                                rawColor && /^#?[0-9A-Fa-f]{6}$/.test(rawColor)
                                  ? rawColor.startsWith('#')
                                    ? rawColor
                                    : `#${rawColor}`
                                  : null
                              return (
                                <DataTr key={c.id}>
                                  <DataTd>
                                    <CandidacyNameStrong>
                                      {dotFill ? (
                                        <PartyColorDot
                                          $fill={dotFill}
                                          aria-hidden
                                        />
                                      ) : null}
                                      {resolvedPersonId ? (
                                        <EntityTableLinkBtn
                                          type="button"
                                          onClick={() =>
                                            setMentionPersonId(resolvedPersonId)
                                          }
                                        >
                                          {candidacyLabel(c)}
                                        </EntityTableLinkBtn>
                                      ) : (
                                        candidacyLabel(c)
                                      )}
                                    </CandidacyNameStrong>
                                    {c.party ? (
                                      <CandidacyPartyMeta>
                                        {c.partyId ? (
                                          <EntityTableLinkBtn
                                            type="button"
                                            onClick={() =>
                                              setElectionMentionPartyId(
                                                c.partyId!,
                                              )
                                            }
                                          >
                                            {getPartyDisplayName(c.party)}
                                          </EntityTableLinkBtn>
                                        ) : (
                                          getPartyDisplayName(c.party)
                                        )}
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
                                        사퇴 ·{' '}
                                        {formatPollDate(c.withdrawnDate)}
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
                                    {c.resultingTenure ? (
                                      <CandidacyPartyMeta>
                                        재임 연결:{' '}
                                        {c.resultingTenure.positionDefinition
                                          ?.title ??
                                          c.resultingTenure.title ??
                                          '공직 재임'}
                                        {c.resultingTenure.ordinal != null
                                          ? ` (제${c.resultingTenure.ordinal}대)`
                                          : ''}
                                      </CandidacyPartyMeta>
                                    ) : c.result?.elected &&
                                      resolvedPersonId &&
                                      onRegisterWinnerTenure ? (
                                      <div style={{ marginTop: 4 }}>
                                        <ElectionChainBtn
                                          type="button"
                                          onClick={() =>
                                            onRegisterWinnerTenure(
                                              c,
                                              matchedSystemAtPoll,
                                            )
                                          }
                                          title="당선 결과를 바탕으로 공직 재임을 등록하고 이 선거와 연결합니다"
                                        >
                                          <FiUserPlus
                                            size={11}
                                            aria-hidden
                                          />
                                          재임 등록
                                        </ElectionChainBtn>
                                      </div>
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
                                        <FiBarChart2
                                          size={15}
                                          strokeWidth={2}
                                        />
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
                          {filteredSortedCandidacies.length > 0 ? (
                            <PartyTotalsRow>
                              <DataTd>
                                합계 ({candidacyTotals.totalCount}명 · 당선{' '}
                                {candidacyTotals.electedCount}명)
                              </DataTd>
                              <DataTd>
                                {candidacyTotals.votesKnown > 0
                                  ? candidacyTotals.votesSum.toLocaleString(
                                      'ko-KR',
                                    )
                                  : '—'}
                                {candidacyTotals.voteShareKnown > 0 ? (
                                  <CandidacyPartyMeta>
                                    {`${(
                                      Math.round(
                                        candidacyTotals.voteShareSum * 100,
                                      ) / 100
                                    ).toFixed(2)}%`}
                                  </CandidacyPartyMeta>
                                ) : null}
                              </DataTd>
                              <DataTd>
                                {candidacyTotals.seatsKnown > 0
                                  ? `${candidacyTotals.seatsSum}석`
                                  : '—'}
                              </DataTd>
                              <DataTdRight />
                            </PartyTotalsRow>
                          ) : null}
                        </tbody>
                      </DataTable>
                    </DataTableCard>
                  </>
                )}
              </ElectionLedgerSection>
            ) : null}
          </ElectionLedgerMain>
        </ElectionLedgerBody>
      </ElectionLedgerContainer>
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
                <span
                  style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                >
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
                <span
                  style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                >
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
                            pathKeys.countryElectionPartyDetail(
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
                    <ChartSkeleton variant="text" lines={4} />
                  ) : electionMentionParty ? (
                    <>
                      <PartyDetailHero
                        $accent={electionMentionParty.brandColor ?? undefined}
                      >
                        <PartyDetailHeroStack>
                          <PartyDetailLogoHero
                            $ring={electionMentionParty.brandColor ?? undefined}
                          >
                            {electionMentionParty.logoUrl ? (
                              <PartyDetailLogoImg
                                src={getUploadImageUrl(
                                  electionMentionParty.logoUrl,
                                )}
                                alt=""
                              />
                            ) : (
                              (
                                electionMentionParty.shortName ||
                                electionMentionParty.name
                              ).slice(0, 3)
                            )}
                          </PartyDetailLogoHero>
                          <PartyDetailHeroBody>
                            <PartyDetailHeroTitle>
                              {electionMentionParty.name}
                              <ElectionPartyStatusBadge
                                $dissolved={Boolean(
                                  electionMentionParty.dissolvedDate,
                                )}
                              >
                                {electionMentionParty.dissolvedDate
                                  ? '해산'
                                  : '활동 중'}
                              </ElectionPartyStatusBadge>
                            </PartyDetailHeroTitle>
                            <PartyDetailChipRowCenter>
                              {electionMentionParty.shortName?.trim() ? (
                                <PartyDetailChip title="약칭">
                                  <PartyDetailChipMuted>
                                    약칭
                                  </PartyDetailChipMuted>
                                  {electionMentionParty.shortName.trim()}
                                </PartyDetailChip>
                              ) : null}
                              {electionMentionParty.localName?.trim() ? (
                                <PartyDetailChip title="현지어·별도 표기">
                                  <PartyDetailChipMuted>
                                    현지어
                                  </PartyDetailChipMuted>
                                  {electionMentionParty.localName.trim()}
                                </PartyDetailChip>
                              ) : null}
                            </PartyDetailChipRowCenter>
                          </PartyDetailHeroBody>
                        </PartyDetailHeroStack>
                      </PartyDetailHero>
                      <PartyDetailMetaSection>
                        <PartyDetailMetaGrid>
                          <PartyDetailMetaTile>
                            <PartyDetailMetaTileLabel>
                              브랜드 컬러
                            </PartyDetailMetaTileLabel>
                            <PartyDetailMetaTileValue>
                              {electionMentionParty.brandColor ? (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 10,
                                  }}
                                >
                                  <span
                                    style={{
                                      width: 22,
                                      height: 22,
                                      borderRadius: 8,
                                      background:
                                        electionMentionParty.brandColor,
                                      boxShadow:
                                        'inset 0 0 0 1px rgba(0,0,0,0.08)',
                                    }}
                                    aria-hidden
                                  />
                                  <code
                                    style={{
                                      fontSize: 13,
                                      fontWeight: 600,
                                      color: 'inherit',
                                    }}
                                  >
                                    {electionMentionParty.brandColor}
                                  </code>
                                </span>
                              ) : (
                                '—'
                              )}
                            </PartyDetailMetaTileValue>
                          </PartyDetailMetaTile>
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
                        ) ||
                        isLikelyRichTextHtml(
                          electionMentionParty.description,
                        ) ? (
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

function addYearsToYmd(baseYmd: string, years: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(baseYmd.trim())
  if (!match) return ''
  const y = Number(match[1]) + years
  const m = Number(match[2])
  const d = Number(match[3])
  const dt = new Date(Date.UTC(y, m - 1, d))
  // 윤년 2월 29일 등 월 넘어감 보정
  if (dt.getUTCMonth() !== m - 1) {
    dt.setUTCDate(0)
  }
  return dt.toISOString().slice(0, 10)
}

/** 선거 등록 모달의 세 묶음 — 예전 탭(기본·의회·임기·집계·설명)을 한 화면 묶음으로 */
const ELECTION_FORM_SECTION_ID = {
  basic: 'election-form-group-basic',
  legislature: 'election-form-group-legislature',
  stats: 'election-form-group-stats',
} as const
const ELECTION_FORM_SECTION_IDS = Object.values(ELECTION_FORM_SECTION_ID)

/** 선거 폼 2단은 반반 — 공용(사건·부대) 1.1 : 0.9는 오른쪽이 짧은 폼 기준이라, 의회·서술(긴 글 두 칸)이 좁았다 */
const ElectionHalfSplitGrid = styled(FormS.SplitColumnsGrid)`
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);

  @media (max-width: ${FormS.SPLIT_MIN_WIDTH - 1}px) {
    grid-template-columns: minmax(0, 1fr);
  }
`
const ELECTION_SPLIT_LEFT_ID = 'election-form-split-left'
const ELECTION_SPLIT_RIGHT_ID = 'election-form-split-right'
const POLL_DATE_ANCHOR_ID = 'election-form-poll-date'

export function ElectionFormModal({
  electionScope,
  mode,
  initial,
  initialTab,
  existingElections = [],
  historicalCountryOptions,
  politicalSystems: externalPoliticalSystems,
  saving,
  onClose,
  onSubmit,
}: {
  /** 리치텍스트 엔티티 연결 — 서버 검색 시 정당 등 범위 한정 */
  /** 예전 서식 편집기의 인물·정당 링크 범위 — 모달 서술 칸이 textarea가 되며 쓰지 않음(호출부 호환용) */
  entityLinkCountryId?: string
  electionScope: { countryId?: string; historicalCountryId?: string }
  mode: 'create' | 'edit'
  initial?: ElectionDetailDto
  /** 수정 모달을 열 때 보여줄 탭 (서술·설명 등) */
  initialTab?: 'basic' | 'legislature' | 'stats'
  /** 동일 국가·역사국가 범위의 기존 선거 목록 (다음 회차 추천용) */
  existingElections?: ElectionListRow[]
  /** 현대 국가와 연결된 역사 국가 — 현대 국가 상세에서만 전달 */
  historicalCountryOptions: Array<{ id: string; name: string }>
  /** 국가·역사국가 정체 목록 — 미전달 시 내부에서 조회 */
  politicalSystems?: PoliticalSystem[]
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
  const [name, setName] = useState(initial?.name ?? '')
  const [shortName, setShortName] = useState(initial?.shortName ?? '')
  const [electionType, setElectionType] = useState(
    initial?.electionType ?? 'PARLIAMENTARY_CONSTITUENCY',
  )
  const electionTypeManuallyTouchedRef = useRef(mode === 'edit')
  const [status, setStatus] = useState(initial?.status ?? 'SCHEDULED')
  const [statusManuallyChanged, setStatusManuallyChanged] = useState(false)
  const [pollDate, setPollDate] = useState(
    initial?.pollDate
      ? toLocalDateYmd(initial.pollDate) ||
          new Date().toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  )
  const [description, setDescription] = useState(() =>
    richHtmlToEditableText(initial?.description),
  )
  const [legTermStart, setLegTermStart] = useState(() =>
    toLocalDateYmd(initial?.legislatureTermStart),
  )
  const [legTermEnd, setLegTermEnd] = useState(() =>
    toLocalDateYmd(initial?.legislatureTermEnd),
  )
  const playClickSound = useClickSound()
  const [voterTurnout, setVoterTurnout] = useState(
    initial?.voterTurnoutPercent != null &&
      String(initial.voterTurnoutPercent).trim() !== ''
      ? formatPercentOneDecimalForInput(initial.voterTurnoutPercent)
      : '',
  )
  /* 어느 원의 선거인가(B7) — 원을 고르고 총 의석이 비어 있으면 투표 연도의 정원으로 채운다 */
  const [chamberId, setChamberId] = useState(initial?.chamberId ?? '')
  const [chamberManuallyTouched, setChamberManuallyTouched] = useState(
    Boolean(initial?.chamberId),
  )
  const [totalSeatsStr, setTotalSeatsStr] = useState(
    initial?.totalSeats != null ? String(initial.totalSeats) : '',
  )
  const [totalSeatsManuallyTouched, setTotalSeatsManuallyTouched] = useState(
    initial?.totalSeats != null,
  )
  const [pollEndYmd, setPollEndYmd] = useState(() =>
    toLocalDateYmd(initial?.pollEndDate),
  )
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
  const [resultingDissolutionNotes, setResultingDissolutionNotes] = useState(
    () => richHtmlToEditableText(initial?.resultingLegislatureDissolutionNotes),
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

  const { data: fetchedPoliticalSystems = [] } = usePoliticalSystems(
    externalPoliticalSystems === undefined ? electionScope : {},
  )
  const politicalSystems =
    externalPoliticalSystems ?? fetchedPoliticalSystems

  const effectiveHistoricalIdForLookup =
    electionScope.historicalCountryId ?? (scopeHistoricalCountryId || null)

  const chamberScope = useMemo(
    () => ({
      countryId: electionScope.historicalCountryId
        ? null
        : (electionScope.countryId ?? null),
      historicalCountryId: electionScope.historicalCountryId ?? null,
    }),
    [electionScope.countryId, electionScope.historicalCountryId],
  )
  const { data: chambersRaw = [] } = useQuery({
    queryKey: chamberKeys.list(chamberScope),
    queryFn: () => chamberApi.list(chamberScope),
    enabled: Boolean(chamberScope.countryId || chamberScope.historicalCountryId),
    staleTime: 60_000,
  })

  /** 투표일과 선택된 정치체에 부합하는 활성 정체(PoliticalSystem) */
  const activePoliticalSystem = useMemo(
    () =>
      findPoliticalSystemAtDate(politicalSystems, {
        countryId: electionScope.countryId ?? null,
        historicalCountryId: effectiveHistoricalIdForLookup,
        isoDate: pollDate,
        fallbackToCurrent: false,
      }),
    [
      politicalSystems,
      electionScope.countryId,
      effectiveHistoricalIdForLookup,
      pollDate,
    ],
  )

  /** 현대국가 페이지에서 과거 투표일을 입력했을 때 연결된 역사국가 자동 추천 */
  const suggestedHistoricalCountry = useMemo(() => {
    if (
      !showHistoricalCountryPicker ||
      scopeHistoricalCountryId ||
      !activePoliticalSystem?.historicalCountryId
    ) {
      return null
    }
    const found = historicalCountryOptions.find(
      (hc) => hc.id === activePoliticalSystem.historicalCountryId,
    )
    if (!found) {
      if (activePoliticalSystem.historicalCountry?.id) {
        return {
          id: activePoliticalSystem.historicalCountry.id,
          name: activePoliticalSystem.historicalCountry.name,
        }
      }
      return null
    }
    return found
  }, [
    showHistoricalCountryPicker,
    scopeHistoricalCountryId,
    activePoliticalSystem,
    historicalCountryOptions,
  ])

  /** 활성 정체에 지정된 원(하원·상원)을 맨 위로 올린 원 목록 */
  const chambers = useMemo(() => {
    const activeSet = new Set(
      [
        activePoliticalSystem?.lowerChamberId,
        activePoliticalSystem?.upperChamberId,
      ].filter((id): id is string => Boolean(id)),
    )
    return [...chambersRaw].sort((left, right) => {
      const leftActive = activeSet.has(left.id) ? 0 : 1
      const rightActive = activeSet.has(right.id) ? 0 : 1
      if (leftActive !== rightActive) return leftActive - rightActive
      return left.name.localeCompare(right.name, 'ko')
    })
  }, [chambersRaw, activePoliticalSystem])

  const isNonChamberElectionType =
    electionType === 'PRESIDENTIAL_OR_HEAD' ||
    electionType === 'REFERENDUM_OR_PLEBISCITE'
  const isParliamentaryElectionType =
    electionType === 'PARLIAMENTARY_CONSTITUENCY' ||
    electionType === 'PARLIAMENTARY_PROPORTIONAL' ||
    electionType === 'BY_ELECTION'

  /** 원 정원 이력(ChamberSize) → 정체(lowerHouseSeats/upperHouseSeats) 폴백으로 당시 정원 산출 */
  const deriveSeatsForChamberAtPoll = useCallback(
    (targetChamberId: string, ymd: string): number | null => {
      if (!targetChamberId) return null
      const chamber = chambersRaw.find((item) => item.id === targetChamberId)
      const pollYear = Number(String(ymd).slice(0, 4))
      const validYear =
        Number.isFinite(pollYear) && pollYear > 0 ? pollYear : null
      if (chamber) {
        const fromHistory = chamberSeatsAt(chamber.sizes, validYear)
        if (fromHistory != null) return fromHistory
      }
      if (activePoliticalSystem) {
        if (
          targetChamberId === activePoliticalSystem.lowerChamberId &&
          activePoliticalSystem.lowerHouseSeats != null
        ) {
          return activePoliticalSystem.lowerHouseSeats
        }
        if (
          targetChamberId === activePoliticalSystem.upperChamberId &&
          activePoliticalSystem.upperHouseSeats != null
        ) {
          return activePoliticalSystem.upperHouseSeats
        }
        if (
          chamber?.role === 'UPPER' &&
          activePoliticalSystem.upperHouseSeats != null
        ) {
          return activePoliticalSystem.upperHouseSeats
        }
        if (
          chamber?.role !== 'UPPER' &&
          activePoliticalSystem.lowerHouseSeats != null
        ) {
          return activePoliticalSystem.lowerHouseSeats
        }
      }
      return null
    },
    [chambersRaw, activePoliticalSystem],
  )

  // 활성 정체(PoliticalSystem)에 따라 초기 선거 유형(입법부 없음→대선, 비례대표제→비례 총선) 및 기본 의회 원 자동 설정
  useEffect(() => {
    if (
      mode !== 'create' ||
      electionTypeManuallyTouchedRef.current ||
      !activePoliticalSystem
    ) {
      return
    }
    if (activePoliticalSystem.legislatureType === 'NONE') {
      if (electionType !== 'PRESIDENTIAL_OR_HEAD') {
        setElectionType('PRESIDENTIAL_OR_HEAD')
      }
      return
    }
    if (
      activePoliticalSystem.electoralSystem === 'PARTY_LIST_PR' &&
      electionType === 'PARLIAMENTARY_CONSTITUENCY'
    ) {
      setElectionType('PARLIAMENTARY_PROPORTIONAL')
    }
  }, [mode, activePoliticalSystem, electionType])

  // 대통령·국민투표 전환 시 원(chamberId) 자동 정리, 단원제·양원제 의회 선거 시 활성 제1원(하원) 자동 선택
  useEffect(() => {
    if (isNonChamberElectionType) {
      if (chamberId) setChamberId('')
      return
    }
    const defaultSystemChamberId =
      activePoliticalSystem?.legislatureType &&
      activePoliticalSystem.legislatureType !== 'NONE'
        ? (activePoliticalSystem.lowerChamberId ??
          activePoliticalSystem.upperChamberId ??
          null)
        : null
    if (
      mode === 'create' &&
      isParliamentaryElectionType &&
      !chamberManuallyTouched &&
      !chamberId &&
      defaultSystemChamberId
    ) {
      setChamberId(defaultSystemChamberId)
    }
  }, [
    isNonChamberElectionType,
    isParliamentaryElectionType,
    mode,
    chamberManuallyTouched,
    chamberId,
    activePoliticalSystem,
  ])

  // 원 또는 투표일이 바뀔 때 사용자가 수동 편집하지 않은 총 의석을 당시 정원으로 자동 반영
  useEffect(() => {
    if (totalSeatsManuallyTouched || isNonChamberElectionType) return
    if (chamberId) {
      const seats = deriveSeatsForChamberAtPoll(chamberId, pollDate)
      if (seats != null) {
        setTotalSeatsStr(String(seats))
      }
      return
    }
    if (
      mode === 'create' &&
      isParliamentaryElectionType &&
      activePoliticalSystem?.legislatureType !== 'NONE' &&
      activePoliticalSystem?.lowerHouseSeats != null &&
      !totalSeatsStr.trim()
    ) {
      setTotalSeatsStr(String(activePoliticalSystem.lowerHouseSeats))
    }
  }, [
    chamberId,
    pollDate,
    totalSeatsManuallyTouched,
    isNonChamberElectionType,
    isParliamentaryElectionType,
    mode,
    activePoliticalSystem,
    deriveSeatsForChamberAtPoll,
    totalSeatsStr,
  ])

  useEffect(() => {
    if (mode !== 'edit' || !initial) return
    setName(initial.name ?? '')
    setShortName(initial.shortName ?? '')
    setElectionType(initial.electionType ?? 'PARLIAMENTARY_CONSTITUENCY')
    electionTypeManuallyTouchedRef.current = true
    setStatus(initial.status ?? 'SCHEDULED')
    setStatusManuallyChanged(false)
    setPollDate(
      toLocalDateYmd(initial.pollDate) || new Date().toISOString().slice(0, 10),
    )
    setPollEndYmd(toLocalDateYmd(initial.pollEndDate))
    setDescription(richHtmlToEditableText(initial.description))
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
    setTotalSeatsManuallyTouched(initial.totalSeats != null)
    setChamberId(initial.chamberId ?? '')
    setChamberManuallyTouched(Boolean(initial.chamberId))
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
      richHtmlToEditableText(initial.resultingLegislatureDissolutionNotes),
    )
    setScopeHistoricalCountryId(initial.historicalCountryId ?? '')
    setLinkedEventId(initial.eventId ?? '')
  }, [mode, initial, initialTab])

  const nextSuggestedOrdinal = useMemo(() => {
    const targetHistId =
      electionScope.historicalCountryId ?? (scopeHistoricalCountryId || null)
    const sameType = existingElections.filter((e) => {
      if (e.electionType !== electionType) return false
      if (mode === 'edit' && e.id === initial?.id) return false
      if ((e.historicalCountryId ?? null) !== targetHistId) return false
      if (chamberId && (e.chamberId ?? '') !== chamberId) return false
      return true
    })
    const maxOrd = sameType.reduce(
      (acc, e) =>
        e.convocationOrdinal != null && e.convocationOrdinal > acc
          ? e.convocationOrdinal
          : acc,
      0,
    )
    return maxOrd > 0 ? maxOrd + 1 : sameType.length + 1
  }, [
    existingElections,
    electionType,
    mode,
    initial?.id,
    electionScope.historicalCountryId,
    scopeHistoricalCountryId,
    chamberId,
  ])

  const activeOrdinalForTemplate = useMemo(() => {
    const parsed = parseOptionalNonNegativeInt(convOrdinalStr)
    if (typeof parsed === 'number' && parsed > 0) return parsed
    return nextSuggestedOrdinal
  }, [convOrdinalStr, nextSuggestedOrdinal])

  const handleApplyTermDurationYears = useCallback(
    (years: number) => {
      const baseStart = legTermStart || pollDate
      if (!baseStart) {
        notify.error('먼저 임기 시작일 또는 투표일을 선택하세요.')
        return
      }
      if (!legTermStart) {
        setLegTermStart(baseStart)
      }
      const nextEnd = addYearsToYmd(baseStart, years)
      if (nextEnd) {
        setLegTermEnd(nextEnd)
      }
    },
    [legTermStart, pollDate],
  )

  const pollDateOrderInvalid = Boolean(
    pollDate && pollEndYmd && pollEndYmd < pollDate,
  )
  const termDateOrderInvalid = Boolean(
    legTermStart && legTermEnd && legTermEnd < legTermStart,
  )

  const legFilledCount = useMemo(
    () =>
      [
        legTermStart,
        legTermEnd,
        resultingClosureKind.trim(),
        resultingClosureYmd,
        resultingDissolutionNotes.trim(),
        description.trim(),
      ].filter(Boolean).length,
    [
      legTermStart,
      legTermEnd,
      resultingClosureKind,
      resultingClosureYmd,
      resultingDissolutionNotes,
      description,
    ],
  )

  const statsFilledCount = useMemo(
    () =>
      [
        voterTurnout.trim(),
        totalSeatsStr.trim(),
      ].filter(Boolean).length,
    [voterTurnout, totalSeatsStr],
  )


  const title = mode === 'create' ? '선거 등록' : '선거 수정'

  /* ─── 사건·군부대 등록 모달 문법: 2단 분할(좌 기본 / 우 의회·집계) + 머리 섹션 이동 ─── */
  const { layoutMode, toggleLayoutMode } = useSplitLayoutMode(
    'papyrus:election-register-layout',
  )
  const formScrollRef = useRef<HTMLDivElement | null>(null)
  const nameInputRef = useRef<HTMLInputElement | null>(null)
  const [activeSectionId, setActiveSectionId] = useState<string>(
    ELECTION_FORM_SECTION_ID[initialTab ?? 'basic'],
  )
  const [dateErrors, setDateErrors] = useState<Record<string, string | null>>(
    {},
  )
  const setDateError = useCallback(
    (key: string) => (message: string | null) =>
      setDateErrors((prev) =>
        prev[key] === message ? prev : { ...prev, [key]: message },
      ),
    [],
  )
  const firstDateError =
    Object.values(dateErrors).find((message) => Boolean(message)) ?? null

  const splitActive = () =>
    layoutMode === 'split' &&
    typeof window !== 'undefined' &&
    window.matchMedia?.(`(min-width: ${FormS.SPLIT_MIN_WIDTH}px)`).matches ===
      true

  const jumpToSection = (sectionId: string) => {
    setActiveSectionId(sectionId)
    if (splitActive()) {
      if (sectionId === ELECTION_FORM_SECTION_ID.basic) {
        document
          .getElementById(ELECTION_SPLIT_LEFT_ID)
          ?.scrollTo?.({ top: 0, behavior: 'smooth' })
        return
      }
      if (sectionId === ELECTION_FORM_SECTION_ID.legislature) {
        document
          .getElementById(ELECTION_SPLIT_RIGHT_ID)
          ?.scrollTo?.({ top: 0, behavior: 'smooth' })
        return
      }
    }
    document
      .getElementById(sectionId)
      ?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }

  /* 서술·설명 편집으로 연 수정 모달 — 그 묶음에서 시작한다(예전 initialTab) */
  useEffect(() => {
    if (!initialTab || initialTab === 'basic') return
    const frame = window.requestAnimationFrame(() => {
      document
        .getElementById(ELECTION_FORM_SECTION_ID[initialTab])
        ?.scrollIntoView?.({ block: 'start' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [initialTab])

  /** 스크롤 위치로 머리 알약을 따라간다 — 2단이면 칸마다 따로 */
  const handleFormScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null
    let nextId: string
    if (target?.id === ELECTION_SPLIT_LEFT_ID) {
      nextId = ELECTION_FORM_SECTION_ID.basic
    } else if (target?.id === ELECTION_SPLIT_RIGHT_ID) {
      nextId = activeSectionAt(target, [
        ELECTION_FORM_SECTION_ID.legislature,
        ELECTION_FORM_SECTION_ID.stats,
      ])
    } else {
      nextId = activeSectionAt(event.currentTarget, ELECTION_FORM_SECTION_IDS)
    }
    setActiveSectionId((prev) => (prev === nextId ? prev : nextId))
  }

  const handlePollDateChange = (ymd: string) => {
    setPollDate(ymd)
    // 지난 날짜는 '마감', 오늘 이후는 '예정' — 상태를 직접 고르기 전까지만
    if (mode === 'create' && !statusManuallyChanged && ymd) {
      const todayYmd = new Date().toISOString().slice(0, 10)
      if (ymd < todayYmd && status === 'SCHEDULED') setStatus('FINALIZED')
      else if (ymd >= todayYmd && status === 'FINALIZED') setStatus('SCHEDULED')
    }
  }

  const formSnapshot = JSON.stringify([
    name,
    shortName,
    electionType,
    status,
    pollDate,
    pollEndYmd,
    description,
    legTermStart,
    legTermEnd,
    voterTurnout,
    totalSeatsStr,
    convOrdinalStr,
    resultingClosureKind,
    resultingClosureYmd,
    resultingDissolutionNotes,
    scopeHistoricalCountryId,
    linkedEventId,
  ])
  const [initialSnapshot] = useState(formSnapshot)
  const isDirty = formSnapshot !== initialSnapshot

  const requestClose = useCallback(async () => {
    if (saving) return
    if (
      isDirty &&
      !(await confirm({
        title: '확인',
        message:
          mode === 'create'
            ? '작성 중인 선거 정보가 사라집니다. 창을 닫으시겠습니까?'
            : '저장하지 않은 변경 사항이 있습니다. 닫으시겠습니까?',
      }))
    ) {
      return
    }
    onClose()
  }, [isDirty, mode, onClose, saving])

  const missingRequired = [
    !name.trim() ? '명칭' : null,
    !pollDate ? '투표일' : null,
  ].filter((label): label is string => label !== null)
  const orderProblem =
    firstDateError ??
    (pollDateOrderInvalid
      ? '투표 종료일이 투표일보다 앞설 수 없습니다.'
      : termDateOrderInvalid
        ? '의회 임기 종료일이 시작일보다 앞설 수 없습니다.'
        : null)
  const canSubmit = !saving && missingRequired.length === 0 && !orderProblem

  const focusFirstMissing = () => {
    if (!name.trim()) {
      jumpToSection(ELECTION_FORM_SECTION_ID.basic)
      nameInputRef.current?.focus()
      return
    }
    const pollField = document.getElementById(POLL_DATE_ANCHOR_ID)
    pollField?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    pollField?.querySelector<HTMLInputElement>('input')?.focus()
  }

  const handleSubmit = () => {
    if (!canSubmit) return
    if (pollDateOrderInvalid) {
      notify.error('투표 종료일이 투표일보다 앞설 수 없습니다.')
      return
    }
    if (termDateOrderInvalid) {
      notify.error(
        '의회 임기 종료일이 임기 시작일보다 앞설 수 없습니다.',
      )
      return
    }
    const turnoutParsed = parseOptionalPercent0to100(voterTurnout)
    if (turnoutParsed === 'invalid') {
      notify.error(
        '투표율(참여)은 0~100 사이 숫자(소수 첫째 자리까지)이거나 비워 두세요.',
      )
      return
    }
    const totalSeatsParsed =
      parseOptionalNonNegativeInt(totalSeatsStr)
    if (totalSeatsParsed === 'invalid') {
      notify.error('총 의석은 0 이상의 정수이거나 비워 두세요.')
      return
    }
    const convOrdinalParsed =
      parseOptionalNonNegativeInt(convOrdinalStr)
    if (convOrdinalParsed === 'invalid') {
      notify.error(
        '회차(숫자)는 0 이상의 정수이거나 비워 두세요.',
      )
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
      resultingClosureKind.trim() === ''
        ? null
        : // select 옵션이 LEGISLATURE_CLOSURE_KIND_OPTIONS로 한정되므로 안전
          (resultingClosureKind as LegislatureTermClosureKind)
    const chronologyExtra = {
      pollEndDate: pollEndIso,
      convocationOrdinal: convOrdinalParsed,
      resultingLegislatureClosureKind: resultingKindVal,
      resultingLegislatureClosureDate: resultingClosureIso,
      resultingLegislatureDissolutionNotes: editableTextToSavedHtml(
        resultingDissolutionNotes,
        initial?.resultingLegislatureDissolutionNotes,
      ),
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
          chamberId: chamberId || null,
          description: editableTextToSavedHtml(description, initial?.description),
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
          chamberId: chamberId || null,
          description: editableTextToSavedHtml(description, initial?.description),
          eventId: eventIdBody,
          ...chronologyExtra,
        },
      })
    }
  }

  useModalSubmitShortcut({
    enabled: canSubmit,
    scrollContainerRef: formScrollRef,
    onSubmit: handleSubmit,
  })

  const electionSections = [
    {
      id: ELECTION_FORM_SECTION_ID.basic,
      label: '기본 정보',
      badge: missingRequired.length === 0 ? '✓' : null,
    },
    {
      id: ELECTION_FORM_SECTION_ID.stats,
      label: '투표·결과',
      badge: statsFilledCount > 0 ? String(statsFilledCount) : null,
    },
    {
      id: ELECTION_FORM_SECTION_ID.legislature,
      label: '의회·서술',
      badge: legFilledCount > 0 ? String(legFilledCount) : null,
    },
  ]

  const typeChipOptions = withTones(ELECTION_TYPE_OPTIONS, ELECTION_TYPE_TONE)
  const statusChipOptions = withTones(
    ELECTION_STATUS_OPTIONS,
    ELECTION_STATUS_TONE,
  )
  const closureChipOptions = withTones(
    LEGISLATURE_CLOSURE_KIND_OPTIONS,
    LEGISLATURE_CLOSURE_TONE,
  )

  /*
   * 칸 배치 = 성격 순서. 왼쪽은 '어떤 선거인가'(유형 → 명칭 → 회차 → 소속 → 연결 사건)와 '언제·어떻게 끝났나'
   * (투표 기간 → 상태 → 집계), 오른쪽은 이 선거로 꾸려진 의회(임기 → 실제 종료 → 종료 서술)와 긴 글(설명).
   * 명칭이 맨 앞(사건 등록 모달과 같은 문법). 명칭 추천 버튼('제13대 표준 명칭 채우기'·'다음 회차')은 걷었다 —
   * 회차 칸 자리표시가 같은 안내를 한다. 서술 두 칸은 textarea(서식·인물 링크는 선거 상세 서술 칸에서).
   */
  const basicSectionNode = (
    <FormS.FormGroupSection
      id={ELECTION_FORM_SECTION_ID.basic}
      aria-labelledby={`${ELECTION_FORM_SECTION_ID.basic}-title`}
    >
      <FormS.FormGroupTitle id={`${ELECTION_FORM_SECTION_ID.basic}-title`}>
        기본 정보
        {activePoliticalSystem ? (
          <FormS.FormGroupSummaryBadge title="투표일 기준 매칭된 헌정 체제">
            {formatPoliticalSystemContextSummary(activePoliticalSystem)}
          </FormS.FormGroupSummaryBadge>
        ) : null}
      </FormS.FormGroupTitle>
      <EventFormS.FormRow>
        <EventFormS.FormLabel htmlFor="election-form-name">
          명칭 <EventFormS.Required>*</EventFormS.Required>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          <FormS.TitleInput
            ref={nameInputRef}
            id="election-form-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="off"
            aria-required
            placeholder={`예: 제${activeOrdinalForTemplate}대 ${labelElectionType(electionType)}`}
          />
        </EventFormS.FormField>
      </EventFormS.FormRow>
      <EventFormS.FormRow>
        <EventFormS.FormLabel as="div" id="election-form-type-label">
          유형 <EventFormS.Required>*</EventFormS.Required>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          <ToneChipGroup
            ariaLabelledBy="election-form-type-label"
            value={electionType}
            onChange={(next) => {
              if (next) {
                electionTypeManuallyTouchedRef.current = true
                setElectionType(next)
              }
            }}
            options={typeChipOptions}
          />
          {isParliamentaryElectionType &&
          activePoliticalSystem?.legislatureType === 'NONE' ? (
            <EventFormS.Hint>
              참고: 당시 헌정 체제(
              {activePoliticalSystem.name || '의회 없음'})는 입법부 없음(NONE)으로
              등록되어 있습니다. 제헌의회·자문기구 선거인지 확인하세요.
            </EventFormS.Hint>
          ) : electionType === 'PRESIDENTIAL_OR_HEAD' &&
            activePoliticalSystem?.headSelectionMethod === 'INDIRECT' ? (
            <EventFormS.Hint>
              참고: 당시 헌정 체제(
              {activePoliticalSystem.name || '간선제'})는 국가원수{' '}
              <strong>
                {
                  HEAD_SELECTION_METHOD_LABEL[
                    activePoliticalSystem.headSelectionMethod
                  ]
                }
              </strong>
              으로 등록되어 있습니다. 간선 대선(의회·선거인단 표결) 기록임을
              서술·후보 결과에 함께 남기면 명확합니다.
            </EventFormS.Hint>
          ) : electionType === 'PRESIDENTIAL_OR_HEAD' &&
            activePoliticalSystem &&
            (activePoliticalSystem.governmentForm === 'PARLIAMENTARY' ||
              activePoliticalSystem.governmentForm ===
                'CONSTITUTIONAL_MONARCHY' ||
              activePoliticalSystem.governmentForm === 'ABSOLUTE_MONARCHY') &&
            activePoliticalSystem.headOfStateHasPower === false ? (
            <EventFormS.Hint>
              참고: 당시 헌정 체제(
              {GOVERNMENT_FORM_LABEL[activePoliticalSystem.governmentForm]})는
              내각 책임·입헌군주제 계열입니다. 총리가 선출되는 총선이라면 의회 선거
              유형을 고르세요.
            </EventFormS.Hint>
          ) : isParliamentaryElectionType &&
            activePoliticalSystem?.electoralSystem === 'PARALLEL' ? (
            <EventFormS.Hint>
              참고: 당시 헌정 체제는{' '}
              <strong>병립형(지역구+비례대표)</strong> 선거제입니다. 지역구와
              비례대표를 각각 등록할 때 동일 회차·동일 원(院)으로 지정하면 대시보드에서
              자동 합산됩니다.
            </EventFormS.Hint>
          ) : null}
        </EventFormS.FormField>
      </EventFormS.FormRow>
      <EventFormS.FormRow>
        <EventFormS.FormLabel as="div">
          회차·짧은 이름<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          <FormS.SubTitleGrid>
            <FormS.SubTitleField>
              <FormS.SubTitleLabel>회차(숫자)</FormS.SubTitleLabel>
              <EventFormS.Input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={convOrdinalStr}
                onChange={(event) =>
                  setConvOrdinalStr(
                    sanitizeNonNegativeIntInput(event.target.value),
                  )
                }
                placeholder="예: 21 · 동일 국가·유형 내 순번"
              />
            </FormS.SubTitleField>
            <FormS.SubTitleField>
              <FormS.SubTitleLabel>짧은 이름</FormS.SubTitleLabel>
              <EventFormS.Input
                value={shortName}
                onChange={(event) => setShortName(event.target.value)}
                placeholder={`예: 제${activeOrdinalForTemplate}대`}
              />
            </FormS.SubTitleField>
          </FormS.SubTitleGrid>
        </EventFormS.FormField>
      </EventFormS.FormRow>
      {showHistoricalCountryPicker ? (
        <EventFormS.FormRow>
          <EventFormS.FormLabel htmlFor="election-form-historical-country">
            역사 국가<FormS.OptionalTag>(선택)</FormS.OptionalTag>
          </EventFormS.FormLabel>
          <EventFormS.FormField>
            <FormSelectNative
              id="election-form-historical-country"
              value={scopeHistoricalCountryId}
              onChange={(event) =>
                setScopeHistoricalCountryId(event.target.value)
              }
            >
              <option value="">(미지정 · 이 현대 국가에만 연결)</option>
              {[...historicalCountryOptions]
                .sort((left, right) =>
                  left.name.localeCompare(right.name, 'ko', {
                    sensitivity: 'base',
                  }),
                )
                .map((historical) => (
                  <option key={historical.id} value={historical.id}>
                    {historical.name}
                  </option>
                ))}
            </FormSelectNative>
            {suggestedHistoricalCountry ? (
              <EventFormS.Hint>
                투표일({pollDate.slice(0, 4)}년)은 역사 국가 「
                {suggestedHistoricalCountry.name}」 시기입니다 —{' '}
                <button
                  type="button"
                  onClick={() =>
                    setScopeHistoricalCountryId(suggestedHistoricalCountry.id)
                  }
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: '#6366f1',
                    fontWeight: 700,
                    textDecoration: 'underline',
                    cursor: 'pointer',
                  }}
                >
                  이 역사 국가로 설정
                </button>
              </EventFormS.Hint>
            ) : null}
          </EventFormS.FormField>
        </EventFormS.FormRow>
      ) : null}
      <EventFormS.FormRow>
        <EventFormS.FormLabel htmlFor="election-form-linked-event">
          연결 사건<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          {/* 예전엔 사건 UUID를 손으로 붙이는 칸이라 연결이 0건이었다 — 사건 검색으로 고른다 */}
          <LinkedEventPickerField
            inputId="election-form-linked-event"
            value={linkedEventId}
            initialTitle={initial?.event?.title ?? null}
            nearYear={Number.parseInt(pollDate.slice(0, 4), 10) || null}
            onChange={setLinkedEventId}
          />
        </EventFormS.FormField>
      </EventFormS.FormRow>
    </FormS.FormGroupSection>
  )

  const statsSectionNode = (
    <FormS.FormGroupSection
      id={ELECTION_FORM_SECTION_ID.stats}
      aria-labelledby={`${ELECTION_FORM_SECTION_ID.stats}-title`}
    >
      <FormS.FormGroupTitle id={`${ELECTION_FORM_SECTION_ID.stats}-title`}>
        투표·결과
        {statsFilledCount > 0 ? (
          <FormS.FormGroupSummaryBadge>{statsFilledCount}칸</FormS.FormGroupSummaryBadge>
        ) : null}
      </FormS.FormGroupTitle>
      <EventFormS.FormRow>
        <EventFormS.FormLabel as="div">
          투표 기간 <EventFormS.Required>*</EventFormS.Required>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          <FormS.DateRangeGrid>
            <FormS.DateColumn>
              <FormS.SubTitleLabel>투표일</FormS.SubTitleLabel>
              <YmdDateField
                anchorId={POLL_DATE_ANCHOR_ID}
                ariaLabel="투표일"
                pickerTitle="투표일 선택"
                value={pollDate}
                onChange={handlePollDateChange}
                onErrorChange={setDateError('poll')}
              />
            </FormS.DateColumn>
            <FormS.DateColumn>
              <FormS.SubTitleLabel>투표 종료일 (선택)</FormS.SubTitleLabel>
              <YmdDateField
                ariaLabel="투표 종료일"
                pickerTitle="투표 종료일"
                value={pollEndYmd}
                onChange={setPollEndYmd}
                onErrorChange={setDateError('pollEnd')}
                error={pollDateOrderInvalid}
                minDate={pollDate || undefined}
              />
            </FormS.DateColumn>
          </FormS.DateRangeGrid>
          {pollDateOrderInvalid ? (
            <EventFormS.ErrorMessage role="alert">
              투표 종료일({pollEndYmd})이 투표일({pollDate})보다 앞설 수 없습니다.
            </EventFormS.ErrorMessage>
          ) : (
            <EventFormS.Hint>
              여러 날에 걸친 투표·개표면 종료일을 함께 적습니다.
            </EventFormS.Hint>
          )}
        </EventFormS.FormField>
      </EventFormS.FormRow>
      <EventFormS.FormRow>
        <EventFormS.FormLabel as="div" id="election-form-status-label">
          상태
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          <ToneChipGroup
            ariaLabelledBy="election-form-status-label"
            value={status}
            onChange={(next) => {
              if (!next) return
              setStatusManuallyChanged(true)
              setStatus(next)
            }}
            options={statusChipOptions}
          />
          {mode === 'create' && !statusManuallyChanged ? (
            <EventFormS.Hint>
              투표일을 고르면 지난 날짜는 ‘마감’, 오늘 이후는 ‘예정’으로 맞춥니다.
            </EventFormS.Hint>
          ) : null}
        </EventFormS.FormField>
      </EventFormS.FormRow>
      <EventFormS.FormRow>
        <EventFormS.FormLabel as="div">
          집계<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          <FormS.SubTitleGrid>
            <FormS.SubTitleField>
              <FormS.SubTitleLabel>투표율(참여) %</FormS.SubTitleLabel>
              <EventFormS.Input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={voterTurnout}
                onChange={(event) =>
                  setVoterTurnout(sanitizePercentInput(event.target.value))
                }
                placeholder="0–100 · 소수 첫째 자리까지"
              />
            </FormS.SubTitleField>
            <FormS.SubTitleField>
              <FormS.SubTitleLabel>총 의석</FormS.SubTitleLabel>
              <EventFormS.Input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={totalSeatsStr}
                onChange={(event) => {
                  const sanitized = sanitizeNonNegativeIntInput(
                    event.target.value,
                  )
                  setTotalSeatsStr(sanitized)
                  setTotalSeatsManuallyTouched(sanitized.trim() !== '')
                }}
                placeholder="0 이상 정수"
              />
            </FormS.SubTitleField>
          </FormS.SubTitleGrid>
          <EventFormS.Hint>
            정당별 득표·의석과 후보자 개표 결과는 저장 후 선거 상세에서 입력합니다.
          </EventFormS.Hint>
        </EventFormS.FormField>
      </EventFormS.FormRow>
    </FormS.FormGroupSection>
  )

  const legislatureSectionNode = (
    <FormS.FormGroupSection
      id={ELECTION_FORM_SECTION_ID.legislature}
      aria-labelledby={`${ELECTION_FORM_SECTION_ID.legislature}-title`}
    >
      <FormS.FormGroupTitle id={`${ELECTION_FORM_SECTION_ID.legislature}-title`}>
        의회·서술
        {legFilledCount > 0 ? (
          <FormS.FormGroupSummaryBadge>{legFilledCount}칸</FormS.FormGroupSummaryBadge>
        ) : null}
      </FormS.FormGroupTitle>
      <EventFormS.FormRow>
        <EventFormS.FormLabel htmlFor="election-chamber">
          원(院)<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          <FormSelectNative
            id="election-chamber"
            value={chamberId}
            disabled={isNonChamberElectionType}
            onChange={(event) => {
              const nextId = event.target.value
              setChamberManuallyTouched(true)
              setChamberId(nextId)
              if (nextId && !totalSeatsManuallyTouched) {
                const seats = deriveSeatsForChamberAtPoll(nextId, pollDate)
                if (seats != null) setTotalSeatsStr(String(seats))
              }
            }}
          >
            <option value="">고르지 않음 — 대통령·국민투표 등</option>
            {chambers.map((chamber) => {
              const isActiveInRegime =
                chamber.id === activePoliticalSystem?.lowerChamberId ||
                chamber.id === activePoliticalSystem?.upperChamberId
              return (
                <option key={chamber.id} value={chamber.id}>
                  {isActiveInRegime ? '★ ' : ''}
                  {chamberLabel(chamber)} · {labelChamberRole(chamber.role)}
                  {isActiveInRegime ? ' (당시 정체 의회)' : ''}
                </option>
              )
            })}
          </FormSelectNative>
          {(() => {
            const pickedChamber = chambers.find((ch) => ch.id === chamberId)
            if (
              pickedChamber?.composition &&
              (pickedChamber.composition === 'APPOINTED' ||
                pickedChamber.composition === 'HEREDITARY' ||
                pickedChamber.composition === 'CORPORATIST')
            ) {
              return (
                <EventFormS.Hint>
                  참고: 선택한 「{chamberLabel(pickedChamber)}」은(는){' '}
                  <strong>
                    {labelChamberComposition(pickedChamber.composition)}
                  </strong>{' '}
                  구성입니다. 직선 선거 대상 원이 맞는지 확인하세요.
                </EventFormS.Hint>
              )
            }
            if (
              isParliamentaryElectionType &&
              activePoliticalSystem?.legislatureType === 'BICAMERAL' &&
              !chamberId
            ) {
              return (
                <EventFormS.Hint>
                  당시 헌정 체제는 <strong>양원제</strong>입니다. 하원·상원 회차와
                  전회차 비교가 섞이지 않도록 위에서 어느 원의 선거인지 선택하세요.
                </EventFormS.Hint>
              )
            }
            return (
              <EventFormS.Hint>
                원은 정체·헌정 탭의 「의회 — 원」에서 관리합니다. 고르면 투표 연도의
                정원(없으면 정체 기본 의석)을 총 의석으로 채웁니다.
              </EventFormS.Hint>
            )
          })()}
        </EventFormS.FormField>
      </EventFormS.FormRow>
      <EventFormS.FormRow>
        <EventFormS.FormLabel as="div">
          의회 임기<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          <FormS.DateRangeGrid>
            <FormS.DateColumn>
              <FormS.SubTitleLabel>시작</FormS.SubTitleLabel>
              <YmdDateField
                ariaLabel="의회 임기 시작일"
                pickerTitle="의회 임기 시작일"
                value={legTermStart}
                onChange={setLegTermStart}
                onErrorChange={setDateError('termStart')}
              />
            </FormS.DateColumn>
            <FormS.DateColumn>
              <FormS.SubTitleLabel>종료</FormS.SubTitleLabel>
              <YmdDateField
                ariaLabel="의회 임기 종료일"
                pickerTitle="의회 임기 종료일"
                value={legTermEnd}
                onChange={setLegTermEnd}
                onErrorChange={setDateError('termEnd')}
                error={termDateOrderInvalid}
                minDate={legTermStart || undefined}
              />
            </FormS.DateColumn>
          </FormS.DateRangeGrid>
          {legTermStart || pollDate ? (
            <FormS.TitleSuggestionRow aria-label="임기 빠른 입력">
              <FormS.TitleSuggestionLabel>빠른 입력</FormS.TitleSuggestionLabel>
              {pollDate && legTermStart !== pollDate ? (
                <FormS.TitleSuggestionButton
                  type="button"
                  onClick={() => setLegTermStart(pollDate)}
                  title="투표일을 임기 시작일로 동일하게 지정합니다"
                >
                  시작 = 투표일
                </FormS.TitleSuggestionButton>
              ) : null}
              {(() => {
                const constitutionalYears =
                  electionType === 'PRESIDENTIAL_OR_HEAD'
                    ? (activePoliticalSystem?.headOfStateTermYears ?? null)
                    : chamberId &&
                        chamberId === activePoliticalSystem?.upperChamberId
                      ? (activePoliticalSystem?.upperHouseTermYears ?? null)
                      : (activePoliticalSystem?.lowerHouseTermYears ?? null)
                if (!constitutionalYears) return null
                return (
                  <FormS.TitleSuggestionButton
                    type="button"
                    onClick={() =>
                      handleApplyTermDurationYears(constitutionalYears)
                    }
                    title={`당시 헌정 체제의 법정 임기(${constitutionalYears}년)를 적용합니다`}
                  >
                    ★ 헌법 임기 +{constitutionalYears}년
                  </FormS.TitleSuggestionButton>
                )
              })()}
              {[3, 4, 5].map((years) => (
                <FormS.TitleSuggestionButton
                  key={years}
                  type="button"
                  onClick={() => handleApplyTermDurationYears(years)}
                  title={`임기 시작일(또는 투표일)로부터 +${years}년 후로 설정`}
                >
                  종료 +{years}년
                </FormS.TitleSuggestionButton>
              ))}
            </FormS.TitleSuggestionRow>
          ) : null}
          {termDateOrderInvalid ? (
            <EventFormS.ErrorMessage role="alert">
              임기 종료일({legTermEnd})이 임기 시작일({legTermStart})보다 앞설 수
              없습니다.
            </EventFormS.ErrorMessage>
          ) : null}
        </EventFormS.FormField>
      </EventFormS.FormRow>
      <EventFormS.FormRow>
        <EventFormS.FormLabel as="div" id="election-form-closure-label">
          실제 종료<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          <ToneChipGroup
            ariaLabelledBy="election-form-closure-label"
            value={resultingClosureKind}
            onChange={setResultingClosureKind}
            options={closureChipOptions}
            allowDeselect
          />
          <FormS.DateRangeGrid>
            <FormS.DateColumn>
              <FormS.SubTitleLabel>실제 종료·해산일</FormS.SubTitleLabel>
              <YmdDateField
                ariaLabel="실제 종료·해산일"
                pickerTitle="이번 의회 실제 종료·해산일"
                value={resultingClosureYmd}
                onChange={setResultingClosureYmd}
                onErrorChange={setDateError('closure')}
              />
            </FormS.DateColumn>
          </FormS.DateRangeGrid>
          <EventFormS.Hint>
            이 선거로 꾸려진 의회가 어떻게 끝났는지 — 고른 유형을 다시 누르면
            해제됩니다.
            {activePoliticalSystem?.governmentForm === 'PARLIAMENTARY' ||
            activePoliticalSystem?.governmentForm === 'CONSTITUTIONAL_MONARCHY'
              ? ' (의원내각제·입헌군주제에서는 내각 불신임·조기 해산이 자주 쓰입니다)'
              : activePoliticalSystem?.governmentForm === 'SEMI_PRESIDENTIAL'
                ? ' (이원집정부제에서는 대통령 해산령·조기 해산을 구분해 기록할 수 있습니다)'
                : ''}
          </EventFormS.Hint>
        </EventFormS.FormField>
      </EventFormS.FormRow>
      <EventFormS.FormRow>
        <EventFormS.FormLabel htmlFor="election-form-closure-notes">
          종료 서술<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          <EventFormS.Textarea
            id="election-form-closure-notes"
            value={resultingDissolutionNotes}
            onChange={(event) => setResultingDissolutionNotes(event.target.value)}
            placeholder="정시 만료·조기 해산 경위 등 (선택)"
            rows={4}
          />
        </EventFormS.FormField>
      </EventFormS.FormRow>
      <EventFormS.FormRow>
        <EventFormS.FormLabel htmlFor="election-form-description">
          설명<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          <EventFormS.Textarea
            id="election-form-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="선거의 배경·쟁점·결과 의의 (선택) — 인물 링크·서식은 선거 상세의 서술 칸에서"
            rows={6}
          />
        </EventFormS.FormField>
      </EventFormS.FormRow>
    </FormS.FormGroupSection>
  )

  return (
    <RegisterModal
      isOpen
      onClose={() => {
        void requestClose()
      }}
      closeOnEsc={!saving}
      closeOnOverlayClick={!saving}
      trapFocus={false}
      initialFocusRef={mode === 'create' ? nameInputRef : undefined}
      title={title}
      headerActions={
        <HeaderActionsBar>
          <RegisterSectionJumpNav
            sections={electionSections}
            activeId={activeSectionId}
            onJump={jumpToSection}
          />
          <FormS.LayoutModeToggleBtn
            type="button"
            $active={layoutMode === 'split'}
            aria-pressed={layoutMode === 'split'}
            aria-label={
              layoutMode === 'split'
                ? '1단 세로 보기로 전환'
                : '2단 좌우 분할 보기로 전환'
            }
            title={
              layoutMode === 'split'
                ? '좌우 2단 분할 보기 중 (클릭 시 1단 세로 보기로 전환)'
                : '1단 세로 보기 중 (클릭 시 좌우 2단 분할 보기로 전환)'
            }
            onClick={toggleLayoutMode}
          >
            <FiColumns size={13} aria-hidden="true" />
            <span>{layoutMode === 'split' ? '2단 분할' : '1단 보기'}</span>
          </FormS.LayoutModeToggleBtn>
        </HeaderActionsBar>
      }
      maxWidth={
        layoutMode === 'split' ? 'min(1440px, 96vw)' : 'min(1040px, 96vw)'
      }
      minHeight="90vh"
      height={layoutMode === 'split' ? '90vh' : undefined}
      fullBleedOnMobile
    >
      <FormS.MilitaryModalFormScroll
        ref={formScrollRef}
        $layoutMode={layoutMode}
        onScroll={handleFormScroll}
        onScrollCapture={handleFormScroll}
      >
        {saving ? (
          <FormS.BusyBar role="status" aria-live="polite">
            {mode === 'create'
              ? '선거를 등록하는 중...'
              : '수정 사항을 저장하는 중...'}
          </FormS.BusyBar>
        ) : null}
        <EventFormS.FormSection>
          {layoutMode === 'split' ? (
            <ElectionHalfSplitGrid>
              <FormS.SplitColumnLeft id={ELECTION_SPLIT_LEFT_ID}>
                {basicSectionNode}
                {statsSectionNode}
              </FormS.SplitColumnLeft>
              <FormS.SplitColumnRight id={ELECTION_SPLIT_RIGHT_ID}>
                {legislatureSectionNode}
              </FormS.SplitColumnRight>
            </ElectionHalfSplitGrid>
          ) : (
            <>
              {basicSectionNode}
              {statsSectionNode}
              {legislatureSectionNode}
            </>
          )}
        </EventFormS.FormSection>
      </FormS.MilitaryModalFormScroll>

      <PersonRegisterModalStickyFooter>
        <RegisterFooterStatus
          missing={missingRequired}
          onJumpToMissing={focusFirstMissing}
          problem={orderProblem}
          readyLabel={mode === 'create' ? '등록 준비 완료' : '수정 준비 완료'}
          shortcuts={[{ keys: '⌘↵', label: '저장' }]}
        />
        <FooterActions>
          <PersonRegisterModalCancelBtn
            type="button"
            onClick={() => {
              void requestClose()
            }}
            disabled={saving}
          >
            취소
          </PersonRegisterModalCancelBtn>
          <FormS.ModalPrimarySubmitBtn
            type="button"
            disabled={!canSubmit}
            title={
              missingRequired.length > 0
                ? `필수 입력: ${missingRequired.join(', ')}`
                : (orderProblem ?? '단축키: ⌘/Ctrl + Enter')
            }
            onClick={handleSubmit}
          >
            {saving
              ? mode === 'create'
                ? '등록 중...'
                : '수정 중...'
              : mode === 'create'
                ? '선거 등록'
                : '수정 완료'}
          </FormS.ModalPrimarySubmitBtn>
        </FooterActions>
      </PersonRegisterModalStickyFooter>
    </RegisterModal>
  )
}

function CandidacyFormModal({
  persons,
  parties,
  districts,
  existingCandidacies = [],
  activePoliticalSystem = null,
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
  existingCandidacies?: ElectionCandidacyDto[]
  activePoliticalSystem?: PoliticalSystem | null
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
    resultBody?: Parameters<typeof upsertCandidacyResult>[2]
    keepOpen?: boolean
  }) => void
}) {
  const playClickSound = useClickSound()
  const [personId, setPersonId] = useState(initial?.personId ?? '')
  const [partyId, setPartyId] = useState(() => {
    if (initial?.partyId) return initial.partyId
    if (
      mode === 'create' &&
      (activePoliticalSystem?.partySystem === 'ONE_PARTY' ||
        activePoliticalSystem?.governmentForm === 'ONE_PARTY') &&
      parties.length === 1
    ) {
      return parties[0].id
    }
    return ''
  })
  const [districtId, setDistrictId] = useState(
    initial?.electoralDistrictId ?? '',
  )
  const [nominationType, setNominationType] = useState(() => {
    if (initial?.nominationType) return initial.nominationType
    if (
      mode === 'create' &&
      activePoliticalSystem?.partySystem === 'NON_PARTISAN'
    ) {
      return 'INDEPENDENT'
    }
    return 'PARTY_NOMINATION'
  })
  const [ballotOrder, setBallotOrder] = useState(
    initial?.ballotOrder != null ? String(initial.ballotOrder) : '',
  )
  const [listRank, setListRank] = useState(
    initial?.listRank != null ? String(initial.listRank) : '',
  )
  const [withdrawnYmd, setWithdrawnYmd] = useState(() =>
    toLocalDateYmd(initial?.withdrawnDate),
  )
  const [withdrawnModalOpen, setWithdrawnModalOpen] = useState(false)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [personModalOpen, setPersonModalOpen] = useState(false)

  // 원스톱 득표·결과 함께 입력 필드
  const [showResultFields, setShowResultFields] = useState(() =>
    Boolean(
      initial?.result &&
        (initial.result.votes != null ||
          initial.result.voteSharePercent != null ||
          initial.result.resultRank != null ||
          initial.result.seatsWon != null ||
          initial.result.elected),
    ),
  )
  const [votes, setVotes] = useState(initial?.result?.votes ?? '')
  const [pct, setPct] = useState(
    initial?.result?.voteSharePercent != null &&
      String(initial.result.voteSharePercent).trim() !== ''
      ? formatPercentOneDecimalForInput(initial.result.voteSharePercent)
      : '',
  )
  const [resultRank, setResultRank] = useState(
    initial?.result?.resultRank != null
      ? String(initial.result.resultRank)
      : '',
  )
  const [seatsWon, setSeatsWon] = useState(
    initial?.result?.seatsWon != null ? String(initial.result.seatsWon) : '',
  )
  const [elected, setElected] = useState(initial?.result?.elected ?? false)

  const selectedPerson = useMemo(
    () => persons.find((p) => p.id === personId) ?? null,
    [persons, personId],
  )

  const duplicateCandidacy = useMemo(() => {
    if (!personId) return null
    return (
      existingCandidacies.find(
        (c) =>
          c.personId === personId && (mode !== 'edit' || c.id !== initial?.id),
      ) ?? null
    )
  }, [existingCandidacies, personId, mode, initial?.id])

  const nextBallotOrder = useMemo(() => {
    const pool = districtId
      ? existingCandidacies.filter(
          (c) =>
            c.electoralDistrictId === districtId &&
            (mode !== 'edit' || c.id !== initial?.id),
        )
      : existingCandidacies.filter(
          (c) => mode !== 'edit' || c.id !== initial?.id,
        )
    const maxOrd = pool.reduce(
      (max, c) =>
        c.ballotOrder != null && c.ballotOrder > max ? c.ballotOrder : max,
      0,
    )
    return maxOrd + 1
  }, [existingCandidacies, districtId, mode, initial?.id])

  const nextListRank = useMemo(() => {
    const pool = partyId
      ? existingCandidacies.filter(
          (c) =>
            c.partyId === partyId && (mode !== 'edit' || c.id !== initial?.id),
        )
      : existingCandidacies.filter(
          (c) => mode !== 'edit' || c.id !== initial?.id,
        )
    const maxRank = pool.reduce(
      (max, c) => (c.listRank != null && c.listRank > max ? c.listRank : max),
      0,
    )
    return maxRank + 1
  }, [existingCandidacies, partyId, mode, initial?.id])

  const otherVotesSum = useMemo(() => {
    let sum = 0n
    for (const c of existingCandidacies) {
      if (mode === 'edit' && c.id === initial?.id) continue
      const s =
        c.result?.votes != null
          ? String(c.result.votes).trim().replace(/[\s,]/g, '')
          : ''
      if (!s || !/^\d+$/.test(s)) continue
      try {
        sum += BigInt(s)
      } catch {
        /* ignore */
      }
    }
    return sum
  }, [existingCandidacies, mode, initial?.id])

  const handleAutoFillPct = useCallback(() => {
    const sanitized = votes.replace(/[\s,]/g, '')
    if (!/^\d+$/.test(sanitized) || sanitized === '') {
      notify.error('득표수를 먼저 입력하세요.')
      return
    }
    let mine: bigint
    try {
      mine = BigInt(sanitized)
    } catch {
      notify.error('득표수를 숫자로 입력하세요.')
      return
    }
    const total = otherVotesSum + mine
    if (total <= 0n) {
      notify.error('다른 후보의 득표 데이터가 없어 계산할 수 없습니다.')
      return
    }
    const ratioThousandths = Number((mine * 100000n) / total) / 1000
    const rounded = Math.round(ratioThousandths * 10) / 10
    setPct(String(rounded))
    notify.success(
      `자동 계산: 후보 득표 합 ${total.toLocaleString('ko-KR')}표 기준 ${rounded}% 적용.`,
    )
  }, [votes, otherVotesSum])

  const handleSubmitForm = (keepOpen: boolean) => {
    const ballotOrderParsed = parseOptionalNonNegativeInt(ballotOrder)
    if (ballotOrderParsed === 'invalid') {
      notify.error('기표 순서는 0 이상의 정수이거나 비워 두세요.')
      return
    }
    const listRankParsed = parseOptionalNonNegativeInt(listRank)
    if (listRankParsed === 'invalid') {
      notify.error('비례 순번은 0 이상의 정수이거나 비워 두세요.')
      return
    }

    let resultBody: Parameters<typeof upsertCandidacyResult>[2] | undefined
    const hasResultInput =
      showResultFields &&
      (votes.trim() !== '' ||
        pct.trim() !== '' ||
        resultRank.trim() !== '' ||
        seatsWon.trim() !== '' ||
        elected ||
        (mode === 'edit' && initial?.result != null))

    if (hasResultInput) {
      const votesParsed = parseOptionalVotesDigits(votes)
      if (votesParsed === 'invalid') {
        notify.error('득표수는 숫자만 입력하거나 비워 두세요.')
        return
      }
      const pctParsed = parseOptionalPercent0to100(pct)
      if (pctParsed === 'invalid') {
        notify.error(
          '득표율은 0~100 사이 숫자(소수 첫째 자리까지)이거나 비워 두세요.',
        )
        return
      }
      const rankParsed = parseOptionalNonNegativeInt(resultRank)
      if (rankParsed === 'invalid') {
        notify.error('순위는 0 이상의 정수이거나 비워 두세요.')
        return
      }
      const seatsParsed = parseOptionalNonNegativeInt(seatsWon)
      if (seatsParsed === 'invalid') {
        notify.error('의석 수는 0 이상의 정수이거나 비워 두세요.')
        return
      }
      resultBody = {
        votes: votesParsed,
        voteSharePercent: pctParsed === null ? null : String(pctParsed),
        resultRank: rankParsed,
        seatsWon: seatsParsed,
        elected,
        notes: initial?.result?.notes ?? null,
      }
    }

    const body: Parameters<typeof createElectionCandidacy>[1] = {
      personId: personId || null,
      partyId: partyId || null,
      electoralDistrictId: districtId || null,
      nominationType,
      ballotOrder: ballotOrderParsed,
      listRank: listRankParsed,
      withdrawnDate: withdrawnYmd ? `${withdrawnYmd}T12:00:00.000Z` : null,
      notes: notes.trim() || null,
    }
    if (mode === 'create') {
      onSubmit({
        mode: 'create',
        electionId,
        body,
        resultBody,
        keepOpen,
      })
      if (keepOpen) {
        setPersonId('')
        if (ballotOrderParsed != null) {
          setBallotOrder(String(ballotOrderParsed + 1))
        }
        if (listRankParsed != null) {
          setListRank(String(listRankParsed + 1))
        }
        setWithdrawnYmd('')
        setNotes('')
        setVotes('')
        setPct('')
        setResultRank('')
        setSeatsWon('')
        setElected(false)
      }
    } else {
      onSubmit({
        mode: 'edit',
        electionId,
        candidacyId: initial!.id,
        body,
        resultBody,
      })
    }
  }

  const title = mode === 'create' ? '후보 추가' : '후보 수정'

  return (
    <>
      <ElectionsModalShell
        title={title}
        onClose={onClose}
        closeOnEsc={!withdrawnModalOpen && !personModalOpen}
        maxWidth="min(1120px, 96vw)"
        footer={
          <ModalFooterRow>
            <ModalFooterStatusText $error={Boolean(duplicateCandidacy)}>
              {duplicateCandidacy
                ? `주의: 선택한 인물이 이미 등록되어 있습니다 (${duplicateCandidacy.party ? getPartyDisplayName(duplicateCandidacy.party) : '무소속'})`
                : showResultFields
                  ? '후보 정보와 득표·결과가 한 번에 저장됩니다.'
                  : '인물·정당·선거구를 조합해 후보 행을 등록합니다.'}
            </ModalFooterStatusText>
            <ModalFooterBtnGroup>
              <ModalCancelBtn type="button" onClick={onClose} disabled={saving}>
                취소
              </ModalCancelBtn>
              {mode === 'create' ? (
                <ModalSecondaryBtn
                  type="button"
                  disabled={saving}
                  onClick={() => handleSubmitForm(true)}
                  title="현재 후보를 저장하고 모달을 닫지 않고 다음 후보를 이어서 입력합니다"
                >
                  저장 후 계속 추가
                </ModalSecondaryBtn>
              ) : null}
              <PersonRegisterModalPrimaryBtn
                type="button"
                disabled={saving}
                onClick={() => handleSubmitForm(false)}
              >
                저장
              </PersonRegisterModalPrimaryBtn>
            </ModalFooterBtnGroup>
          </ModalFooterRow>
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
          {duplicateCandidacy ? (
            <PartyFormHint $tone="error" style={{ marginTop: -4 }}>
              이미 이 선거에 등록된 인물입니다 (
              {duplicateCandidacy.party
                ? getPartyDisplayName(duplicateCandidacy.party)
                : '무소속'}
              {duplicateCandidacy.electoralDistrict?.name
                ? ` · ${duplicateCandidacy.electoralDistrict.name}`
                : ''}
              ). 중복 등록 여부를 확인하세요.
            </PartyFormHint>
          ) : null}
          <FieldRow>
            <FieldLabel>정당</FieldLabel>
            <ModalFieldWide>
              <FormSelectNative
                value={partyId}
                onChange={(e) => {
                  const nextPartyId = e.target.value
                  setPartyId(nextPartyId)
                  if (!nextPartyId && nominationType === 'PARTY_NOMINATION') {
                    setNominationType('INDEPENDENT')
                  } else if (
                    nextPartyId &&
                    nominationType === 'INDEPENDENT'
                  ) {
                    setNominationType('PARTY_NOMINATION')
                  }
                }}
              >
                <option value="">(없음 · 무소속)</option>
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {getPartyDisplayName(p)}
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
              {activePoliticalSystem?.partySystem ? (
                <PartyFormHint>
                  당시 정당제:{' '}
                  {PARTY_SYSTEM_LABEL[activePoliticalSystem.partySystem]}
                  {activePoliticalSystem.partySystem === 'NON_PARTISAN'
                    ? ' — 무정당 체제에 맞춰 기본 지명 방식이 무소속으로 설정되었습니다.'
                    : activePoliticalSystem.partySystem === 'ONE_PARTY'
                      ? ' — 일당제·단일전선 지명 후보 여부를 확인하세요.'
                      : ''}
                </PartyFormHint>
              ) : null}
            </ModalFieldNarrow>
          </FieldRow>
          <FieldRow>
            <FieldLabel>기표 순서</FieldLabel>
            <FieldControl style={{ maxWidth: '100%' }}>
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <ModalFieldNarrow style={{ flex: 1 }}>
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
                {ballotOrder !== String(nextBallotOrder) ? (
                  <PartyFormAutoCalcBtn
                    type="button"
                    onClick={() => setBallotOrder(String(nextBallotOrder))}
                    title="현재 선거구(또는 전체) 기준 다음 기호를 채웁니다"
                  >
                    다음 기호 ({nextBallotOrder}번)
                  </PartyFormAutoCalcBtn>
                ) : null}
              </div>
            </FieldControl>
          </FieldRow>
          <FieldRow>
            <FieldLabel>비례 순번</FieldLabel>
            <FieldControl style={{ maxWidth: '100%' }}>
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <ModalFieldNarrow style={{ flex: 1 }}>
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
                {listRank !== String(nextListRank) ? (
                  <PartyFormAutoCalcBtn
                    type="button"
                    onClick={() => setListRank(String(nextListRank))}
                    title="선택 정당(또는 전체) 내 다음 비례 순번을 채웁니다"
                  >
                    다음 순번 ({nextListRank}번)
                  </PartyFormAutoCalcBtn>
                ) : null}
              </div>
            </FieldControl>
          </FieldRow>
          <FieldRow>
            <FieldLabel>사퇴일 (선택)</FieldLabel>
            <FieldControl $variant="datePair">
              <SelectClearRow style={{ maxWidth: '100%' }}>
                <DateFieldBtn
                  type="button"
                  $hasValue={!!withdrawnYmd}
                  onClick={() => {
                    playClickSound()
                    setWithdrawnModalOpen(true)
                  }}
                >
                  <FiCalendar size={16} />
                  <span>
                    {withdrawnYmd
                      ? formatPollYmdKo(withdrawnYmd)
                      : '사퇴일 선택 (없으면 비움)'}
                  </span>
                  <FiChevronDown size={20} />
                </DateFieldBtn>
                {withdrawnYmd ? (
                  <ClearFieldBtn
                    type="button"
                    onClick={() => {
                      playClickSound()
                      setWithdrawnYmd('')
                    }}
                    aria-label="사퇴일 지우기"
                  >
                    <FiX size={16} />
                  </ClearFieldBtn>
                ) : null}
              </SelectClearRow>
            </FieldControl>
          </FieldRow>
          <FieldRow>
            <FieldLabel>메모</FieldLabel>
            <ModalFieldWide>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </ModalFieldWide>
          </FieldRow>

          <ModalCandidacyResultBox>
            <ModalCandidacyResultHeader
              type="button"
              onClick={() => setShowResultFields((v) => !v)}
              aria-expanded={showResultFields}
            >
              <span>득표·결과 함께 입력 (선택)</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                {showResultFields ? '접기' : '펼쳐서 바로 입력'}
                {showResultFields ? (
                  <FiChevronUp size={15} />
                ) : (
                  <FiChevronDown size={15} />
                )}
              </span>
            </ModalCandidacyResultHeader>
            {showResultFields ? (
              <div style={{ padding: '12px 14px 14px' }}>
                <FormRows>
                  <FieldRow>
                    <FieldLabel>득표수</FieldLabel>
                    <ModalFieldMedium>
                      <Input
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        value={votes}
                        onChange={(e) =>
                          setVotes(sanitizeVoteCountInput(e.target.value))
                        }
                        placeholder="숫자만 입력"
                      />
                    </ModalFieldMedium>
                  </FieldRow>
                  <FieldRow>
                    <FieldLabel>득표율 (%)</FieldLabel>
                    <FieldControl style={{ maxWidth: '100%' }}>
                      <div
                        style={{
                          display: 'flex',
                          gap: 8,
                          alignItems: 'center',
                          flexWrap: 'wrap',
                        }}
                      >
                        <ModalFieldNarrow style={{ flex: 1 }}>
                          <Input
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            value={pct}
                            onChange={(e) =>
                              setPct(sanitizePercentInput(e.target.value))
                            }
                            placeholder="0–100 · 소수 첫째 자리"
                          />
                        </ModalFieldNarrow>
                        <PartyFormAutoCalcBtn
                          type="button"
                          onClick={handleAutoFillPct}
                        >
                          자동 계산
                        </PartyFormAutoCalcBtn>
                      </div>
                    </FieldControl>
                  </FieldRow>
                  <FieldRow>
                    <FieldLabel>순위 / 의석 수</FieldLabel>
                    <FieldControl style={{ maxWidth: '100%' }}>
                      <div
                        style={{
                          display: 'flex',
                          gap: 10,
                          alignItems: 'center',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ width: 150 }}>
                          <Input
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            value={resultRank}
                            onChange={(e) =>
                              setResultRank(
                                sanitizeNonNegativeIntInput(e.target.value),
                              )
                            }
                            placeholder="순위 (예: 1)"
                          />
                        </div>
                        <div style={{ width: 150 }}>
                          <Input
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            value={seatsWon}
                            onChange={(e) =>
                              setSeatsWon(
                                sanitizeNonNegativeIntInput(e.target.value),
                              )
                            }
                            placeholder="의석 수 (선택)"
                          />
                        </div>
                        <CheckboxRow style={{ margin: 0 }}>
                          <input
                            type="checkbox"
                            id="candidacy-modal-elected"
                            checked={elected}
                            onChange={(e) => setElected(e.target.checked)}
                          />
                          <label htmlFor="candidacy-modal-elected">
                            당선 처리
                          </label>
                        </CheckboxRow>
                      </div>
                    </FieldControl>
                  </FieldRow>
                </FormRows>
              </div>
            ) : null}
          </ModalCandidacyResultBox>
        </FormRows>
      </ElectionsModalShell>
      <DatePickerModal
        isOpen={withdrawnModalOpen}
        onClose={() => setWithdrawnModalOpen(false)}
        onSelect={(date) => {
          setWithdrawnYmd(date)
          setWithdrawnModalOpen(false)
        }}
        initialDate={withdrawnYmd}
        title="후보 사퇴일"
      />
    </>
  )
}

function ResultFormModal({
  candidacyId,
  existingCandidacies,
  candidacyLabel,
  initial,
  saving,
  onClose,
  onSwitchCandidacy,
  onSubmit,
}: {
  candidacyId: string
  existingCandidacies: ElectionCandidacyDto[]
  candidacyLabel: (c: ElectionCandidacyDto) => string
  initial?: ElectionCandidacyDto['result']
  saving: boolean
  onClose: () => void
  onSwitchCandidacy?: (nextRow: ElectionCandidacyDto) => void
  onSubmit: (
    body: Parameters<typeof upsertCandidacyResult>[2],
    nextCandidacy?: ElectionCandidacyDto,
  ) => void
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

  const currentIndex = useMemo(
    () => existingCandidacies.findIndex((c) => c.id === candidacyId),
    [existingCandidacies, candidacyId],
  )
  const currentCandidacy =
    currentIndex >= 0 ? existingCandidacies[currentIndex] : null
  const prevCandidacy =
    currentIndex > 0 ? existingCandidacies[currentIndex - 1] : null
  const nextCandidacy =
    currentIndex >= 0 && currentIndex + 1 < existingCandidacies.length
      ? existingCandidacies[currentIndex + 1]
      : null

  const otherVotesSum = useMemo(() => {
    let sum = 0n
    for (const c of existingCandidacies) {
      if (c.id === candidacyId) continue
      const s =
        c.result?.votes != null
          ? String(c.result.votes).trim().replace(/[\s,]/g, '')
          : ''
      if (!s || !/^\d+$/.test(s)) continue
      try {
        sum += BigInt(s)
      } catch {
        /* ignore */
      }
    }
    return sum
  }, [existingCandidacies, candidacyId])

  const preview = useMemo(() => {
    const sanitized = votes.replace(/[\s,]/g, '')
    let mineVotes: bigint | null = null
    if (/^\d+$/.test(sanitized) && sanitized !== '') {
      try {
        mineVotes = BigInt(sanitized)
      } catch {
        /* ignore */
      }
    }
    const totalVotes =
      mineVotes != null ? otherVotesSum + mineVotes : otherVotesSum
    const pctNum = Number(pct)
    const minePct =
      pct.trim() !== '' && Number.isFinite(pctNum) && pctNum >= 0
        ? pctNum
        : mineVotes != null && totalVotes > 0n
          ? Math.round((Number((mineVotes * 100000n) / totalVotes) / 1000) * 10) /
            10
          : null

    // 예상 순위 산출 (동일 선거구가 있으면 선거구 내, 없으면 전체 후보 내)
    const peerPool = currentCandidacy?.electoralDistrictId
      ? existingCandidacies.filter(
          (c) =>
            c.electoralDistrictId === currentCandidacy.electoralDistrictId,
        )
      : existingCandidacies
    let higherCount = 0
    if (mineVotes != null) {
      for (const c of peerPool) {
        if (c.id === candidacyId) continue
        const s =
          c.result?.votes != null
            ? String(c.result.votes).trim().replace(/[\s,]/g, '')
            : ''
        if (!s || !/^\d+$/.test(s)) continue
        try {
          if (BigInt(s) > mineVotes) higherCount += 1
        } catch {
          /* ignore */
        }
      }
    }
    const projectedRank = mineVotes != null ? higherCount + 1 : null

    return {
      mineVotes,
      totalVotes,
      minePct,
      projectedRank,
      peerCount: peerPool.length,
    }
  }, [
    votes,
    pct,
    otherVotesSum,
    currentCandidacy,
    existingCandidacies,
    candidacyId,
  ])

  const handleAutoFillPctAndRank = useCallback(() => {
    const sanitized = votes.replace(/[\s,]/g, '')
    if (!/^\d+$/.test(sanitized) || sanitized === '') {
      notify.error('득표수를 먼저 입력하세요.')
      return
    }
    let mine: bigint
    try {
      mine = BigInt(sanitized)
    } catch {
      notify.error('득표수를 숫자로 입력하세요.')
      return
    }
    const total = otherVotesSum + mine
    if (total <= 0n) {
      notify.error('득표 합계가 0보다 커야 계산할 수 있습니다.')
      return
    }
    const ratioThousandths = Number((mine * 100000n) / total) / 1000
    const rounded = Math.round(ratioThousandths * 10) / 10
    setPct(String(rounded))
    if (preview.projectedRank != null) {
      setRank(String(preview.projectedRank))
      if (preview.projectedRank === 1 && !elected) {
        setElected(true)
      }
    }
    notify.success(
      `자동 계산: 득표율 ${rounded}%${preview.projectedRank != null ? ` · 예상 ${preview.projectedRank}위` : ''} 반영.`,
    )
  }, [votes, otherVotesSum, preview.projectedRank, elected])

  const handleTriggerSubmit = (targetNext?: ElectionCandidacyDto) => {
    const votesParsed = parseOptionalVotesDigits(votes)
    if (votesParsed === 'invalid') {
      notify.error('득표수는 숫자만 입력하거나 비워 두세요.')
      return
    }
    const pctParsed = parseOptionalPercent0to100(pct)
    if (pctParsed === 'invalid') {
      notify.error(
        '득표율은 0~100 사이 숫자(소수 첫째 자리까지)이거나 비워 두세요.',
      )
      return
    }
    const rankParsed = parseOptionalNonNegativeInt(rank)
    if (rankParsed === 'invalid') {
      notify.error('순위는 0 이상의 정수이거나 비워 두세요.')
      return
    }
    const seatsParsed = parseOptionalNonNegativeInt(seatsWon)
    if (seatsParsed === 'invalid') {
      notify.error('의석 수는 0 이상의 정수이거나 비워 두세요.')
      return
    }
    onSubmit(
      {
        votes: votesParsed,
        voteSharePercent: pctParsed === null ? null : String(pctParsed),
        resultRank: rankParsed,
        seatsWon: seatsParsed,
        elected,
        notes: notes.trim() || null,
      },
      targetNext,
    )
  }

  const candidateTitleLabel = currentCandidacy
    ? candidacyLabel(currentCandidacy)
    : '후보'

  return (
    <ElectionsModalShell
      title={`「${candidateTitleLabel}」 득표·결과`}
      onClose={onClose}
      footer={
        <ModalFooterRow>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {prevCandidacy && onSwitchCandidacy ? (
              <ModalSecondaryBtn
                type="button"
                disabled={saving}
                onClick={() => onSwitchCandidacy(prevCandidacy)}
                title={`이전 후보: ${candidacyLabel(prevCandidacy)}`}
              >
                ← 이전 후보
              </ModalSecondaryBtn>
            ) : null}
            <ModalFooterStatusText>
              {currentIndex >= 0
                ? `후보 ${currentIndex + 1} / ${existingCandidacies.length}`
                : ''}
            </ModalFooterStatusText>
          </div>
          <ModalFooterBtnGroup>
            <ModalCancelBtn type="button" onClick={onClose} disabled={saving}>
              취소
            </ModalCancelBtn>
            {nextCandidacy ? (
              <ModalSecondaryBtn
                type="button"
                disabled={saving}
                onClick={() => handleTriggerSubmit(nextCandidacy)}
                title={`저장하고 다음 후보(${candidacyLabel(nextCandidacy)})로 이동합니다`}
              >
                저장 후 다음 후보 →
              </ModalSecondaryBtn>
            ) : null}
            <PersonRegisterModalPrimaryBtn
              type="button"
              disabled={saving}
              onClick={() => handleTriggerSubmit(undefined)}
            >
              저장
            </PersonRegisterModalPrimaryBtn>
          </ModalFooterBtnGroup>
        </ModalFooterRow>
      }
    >
      <FormRows>
        {currentCandidacy ? (
          <ModalTargetContextBanner>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <strong style={{ fontSize: 14 }}>
                {candidacyLabel(currentCandidacy)}
              </strong>
              <span style={{ fontSize: 12, opacity: 0.85 }}>
                {currentCandidacy.party
                  ? getPartyDisplayName(currentCandidacy.party)
                  : '무소속'}
                {currentCandidacy.electoralDistrict?.name
                  ? ` · ${currentCandidacy.electoralDistrict.name}`
                  : ''}
                {currentCandidacy.ballotOrder != null
                  ? ` · 기호 ${currentCandidacy.ballotOrder}번`
                  : ''}
                {currentCandidacy.listRank != null
                  ? ` · 비례 ${currentCandidacy.listRank}번`
                  : ''}
              </span>
            </div>
            {existingCandidacies.length > 1 && onSwitchCandidacy ? (
              <div style={{ minWidth: 180 }}>
                <FormSelectNative
                  value={candidacyId}
                  onChange={(e) => {
                    const found = existingCandidacies.find(
                      (c) => c.id === e.target.value,
                    )
                    if (found) onSwitchCandidacy(found)
                  }}
                  aria-label="다른 후보로 바로 전환"
                >
                  {existingCandidacies.map((c, idx) => (
                    <option key={c.id} value={c.id}>
                      {idx + 1}. {candidacyLabel(c)} (
                      {c.party ? getPartyDisplayName(c.party) : '무소속'})
                    </option>
                  ))}
                </FormSelectNative>
              </div>
            ) : null}
          </ModalTargetContextBanner>
        ) : null}

        <PartyFormPreviewCard aria-label="후보 득표 미리보기">
          <PartyFormPreviewTitle>실시간 집계 미리보기</PartyFormPreviewTitle>
          <PartyFormPreviewGrid>
            <PartyFormPreviewItem>
              <PartyFormPreviewLabel>예상 순위</PartyFormPreviewLabel>
              <PartyFormPreviewValue
                $tone={preview.projectedRank === 1 ? 'ok' : undefined}
              >
                {preview.projectedRank != null
                  ? `${preview.projectedRank}위 / ${preview.peerCount}명`
                  : rank.trim()
                    ? `${rank}위`
                    : '—'}
              </PartyFormPreviewValue>
              <PartyFormPreviewDelta>
                {currentCandidacy?.electoralDistrict?.name
                  ? `${currentCandidacy.electoralDistrict.name} 기준`
                  : '전체 후보 득표수 비교'}
              </PartyFormPreviewDelta>
            </PartyFormPreviewItem>
            <PartyFormPreviewItem>
              <PartyFormPreviewLabel>득표율</PartyFormPreviewLabel>
              <PartyFormPreviewValue>
                {preview.minePct != null ? `${preview.minePct.toFixed(1)}%` : '—'}
              </PartyFormPreviewValue>
              <PartyFormPreviewDelta>
                {pct.trim() !== '' ? '직접/자동 입력값' : '득표수 기반 추정'}
              </PartyFormPreviewDelta>
            </PartyFormPreviewItem>
            <PartyFormPreviewItem>
              <PartyFormPreviewLabel>전체 후보 득표수 합</PartyFormPreviewLabel>
              <PartyFormPreviewValue>
                {preview.totalVotes.toLocaleString('ko-KR')}표
              </PartyFormPreviewValue>
              <PartyFormPreviewDelta>
                다른 후보 {otherVotesSum.toLocaleString('ko-KR')}표 + 이 후보{' '}
                {preview.mineVotes != null
                  ? `${preview.mineVotes.toLocaleString('ko-KR')}표`
                  : '—'}
              </PartyFormPreviewDelta>
            </PartyFormPreviewItem>
          </PartyFormPreviewGrid>
        </PartyFormPreviewCard>

        <FieldRow>
          <FieldLabel>득표수</FieldLabel>
          <FullWidthControl>
            <Input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={votes}
              onChange={(e) => setVotes(sanitizeVoteCountInput(e.target.value))}
              placeholder="숫자만 입력 (예: 124500)"
            />
          </FullWidthControl>
        </FieldRow>
        <FieldRow>
          <FieldLabel>득표율 (%)</FieldLabel>
          <FieldControl style={{ maxWidth: '100%' }}>
            <div
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
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
                onClick={handleAutoFillPctAndRank}
                title="다른 후보 득표 합 + 이 후보 득표로 득표율과 예상 순위를 한 번에 계산합니다"
              >
                득표율·순위 자동 계산
              </PartyFormAutoCalcBtn>
            </div>
            {otherVotesSum > 0n ? (
              <PartyFormHint>
                다른 후보 득표 합 {otherVotesSum.toLocaleString('ko-KR')}표 ·
                자동 계산 시 득표율과 예상 순위(1위 시 당선 체크)를 함께 채웁니다.
              </PartyFormHint>
            ) : null}
          </FieldControl>
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
  existingOptions,
  saving,
  onClose,
  onSwitchOption,
  onSubmit,
}: {
  option: ElectionBallotOptionDto
  existingOptions: ElectionBallotOptionDto[]
  saving: boolean
  onClose: () => void
  onSwitchOption?: (nextOpt: ElectionBallotOptionDto) => void
  onSubmit: (
    body: Parameters<typeof upsertBallotOptionResult>[2],
    nextOption?: ElectionBallotOptionDto,
  ) => void
}) {
  const [votes, setVotes] = useState(option.result?.votes ?? '')
  const [pct, setPct] = useState(
    option.result?.voteSharePercent != null &&
      String(option.result.voteSharePercent).trim() !== ''
      ? formatPercentOneDecimalForInput(option.result.voteSharePercent)
      : '',
  )
  const [notes, setNotes] = useState(option.result?.notes ?? '')

  const currentOptIdx = useMemo(
    () => existingOptions.findIndex((o) => o.id === option.id),
    [existingOptions, option.id],
  )
  const nextOption =
    currentOptIdx >= 0 && currentOptIdx + 1 < existingOptions.length
      ? existingOptions[currentOptIdx + 1]
      : null

  const otherVotesSum = useMemo(() => {
    let sum = 0n
    for (const opt of existingOptions) {
      if (opt.id === option.id) continue
      const raw = opt.result?.votes
      if (raw == null || String(raw).trim() === '') continue
      const digits = String(raw).trim().replace(/[\s,]/g, '')
      if (/^\d+$/.test(digits)) {
        try {
          sum += BigInt(digits)
        } catch {
          /* ignore */
        }
      }
    }
    return sum
  }, [existingOptions, option.id])

  const otherVoteShareSum = useMemo(() => {
    let sum = 0
    for (const opt of existingOptions) {
      if (opt.id === option.id) continue
      const num = Number(opt.result?.voteSharePercent)
      if (Number.isFinite(num) && num >= 0) sum += num
    }
    return sum
  }, [existingOptions, option.id])

  const preview = useMemo(() => {
    const digits = votes.replace(/[\s,]/g, '')
    let mineVotes: bigint | null = null
    if (/^\d+$/.test(digits) && digits !== '') {
      try {
        mineVotes = BigInt(digits)
      } catch {
        /* ignore */
      }
    }
    const pctNum = Number(pct)
    const minePct =
      pct.trim() !== '' && Number.isFinite(pctNum) && pctNum >= 0
        ? pctNum
        : null
    return {
      mineVotes,
      minePct,
      totalVotes: mineVotes != null ? otherVotesSum + mineVotes : otherVotesSum,
      totalVoteShare:
        minePct != null ? otherVoteShareSum + minePct : otherVoteShareSum,
    }
  }, [votes, pct, otherVotesSum, otherVoteShareSum])

  const handleAutoFillPct = () => {
    const parsed = parseOptionalVotesDigits(votes)
    if (parsed === null || parsed === 'invalid') {
      notify.error('먼저 이 투표 안의 득표수를 입력하세요.')
      return
    }
    const myVotes = BigInt(parsed)
    const totalVotes = otherVotesSum + myVotes
    if (totalVotes <= 0n) {
      notify.error('전체 득표수 합계가 0보다 커야 계산할 수 있습니다.')
      return
    }
    const ratioThousandths = Number((myVotes * 100000n) / totalVotes) / 1000
    const rounded = Math.round(ratioThousandths * 10) / 10
    setPct(rounded.toFixed(1))
    notify.success(
      `자동 계산: 전체 ${totalVotes.toLocaleString('ko-KR')}표 기준 ${rounded.toFixed(1)}% 적용.`,
    )
  }

  const remainingPctHint = useMemo(() => {
    if (otherVoteShareSum <= 0 || otherVoteShareSum >= 100) return null
    return Math.round((100 - otherVoteShareSum) * 10) / 10
  }, [otherVoteShareSum])

  const handleTriggerSubmit = (targetNext?: ElectionBallotOptionDto) => {
    const votesParsed = parseOptionalVotesDigits(votes)
    if (votesParsed === 'invalid') {
      notify.error('득표수는 숫자만 입력하거나 비워 두세요.')
      return
    }
    const pctParsed = parseOptionalPercent0to100(pct)
    if (pctParsed === 'invalid') {
      notify.error(
        '득표율은 0~100 사이 숫자(소수 첫째 자리까지)이거나 비워 두세요.',
      )
      return
    }
    onSubmit(
      {
        votes: votesParsed,
        voteSharePercent: pctParsed === null ? null : String(pctParsed),
        notes: notes.trim() || null,
      },
      targetNext,
    )
  }

  return (
    <ElectionsModalShell
      title={`「${option.label}」 집계`}
      onClose={onClose}
      footer={
        <ModalFooterRow>
          <ModalFooterStatusText>
            {currentOptIdx >= 0
              ? `투표 안 ${currentOptIdx + 1} / ${existingOptions.length}`
              : ''}
          </ModalFooterStatusText>
          <ModalFooterBtnGroup>
            <ModalCancelBtn type="button" onClick={onClose} disabled={saving}>
              취소
            </ModalCancelBtn>
            {nextOption ? (
              <ModalSecondaryBtn
                type="button"
                disabled={saving}
                onClick={() => handleTriggerSubmit(nextOption)}
                title={`저장하고 다음 투표 안(「${nextOption.label}」)으로 이동합니다`}
              >
                저장 후 「{nextOption.label}」 →
              </ModalSecondaryBtn>
            ) : null}
            <PersonRegisterModalPrimaryBtn
              type="button"
              disabled={saving}
              onClick={() => handleTriggerSubmit(undefined)}
            >
              저장
            </PersonRegisterModalPrimaryBtn>
          </ModalFooterBtnGroup>
        </ModalFooterRow>
      }
    >
      <FormRows>
        {existingOptions.length > 1 && onSwitchOption ? (
          <ModalOptionSwitcherRow role="tablist" aria-label="투표 안 전환">
            {existingOptions.map((opt) => {
              const active = opt.id === option.id
              return (
                <ModalOptionSwitcherPill
                  key={opt.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  $active={active}
                  onClick={() => {
                    if (!active) onSwitchOption(opt)
                  }}
                >
                  <span>{opt.label}</span>
                  {opt.result?.voteSharePercent != null ? (
                    <small>{opt.result.voteSharePercent}%</small>
                  ) : null}
                </ModalOptionSwitcherPill>
              )
            })}
          </ModalOptionSwitcherRow>
        ) : null}

        <PartyFormPreviewCard aria-label="국민투표 전체 합계 미리보기">
          <PartyFormPreviewTitle>투표 안 합계 미리보기</PartyFormPreviewTitle>
          <PartyFormPreviewGrid>
            <PartyFormPreviewItem>
              <PartyFormPreviewLabel>
                「{option.label}」 득표
              </PartyFormPreviewLabel>
              <PartyFormPreviewValue>
                {preview.mineVotes != null
                  ? `${preview.mineVotes.toLocaleString('ko-KR')}표`
                  : '—'}
              </PartyFormPreviewValue>
              <PartyFormPreviewDelta>
                비율 {preview.minePct != null ? `${preview.minePct}%` : '—'}
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
                {preview.totalVoteShare.toFixed(1)}%
              </PartyFormPreviewValue>
              <PartyFormPreviewDelta>
                다른 안 {otherVoteShareSum.toFixed(1)}% + 이 안{' '}
                {preview.minePct != null ? `${preview.minePct}%` : '—'}
              </PartyFormPreviewDelta>
            </PartyFormPreviewItem>
            <PartyFormPreviewItem>
              <PartyFormPreviewLabel>전체 득표수 합</PartyFormPreviewLabel>
              <PartyFormPreviewValue>
                {preview.totalVotes.toLocaleString('ko-KR')}표
              </PartyFormPreviewValue>
              <PartyFormPreviewDelta>
                다른 안 {otherVotesSum.toLocaleString('ko-KR')}표 합산
              </PartyFormPreviewDelta>
            </PartyFormPreviewItem>
          </PartyFormPreviewGrid>
        </PartyFormPreviewCard>

        <FieldRow>
          <FieldLabel>득표수</FieldLabel>
          <FullWidthControl>
            <Input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={votes}
              onChange={(ev) =>
                setVotes(sanitizeVoteCountInput(ev.target.value))
              }
              placeholder="숫자만 입력"
            />
          </FullWidthControl>
        </FieldRow>
        <FieldRow>
          <FieldLabel>득표율 (%)</FieldLabel>
          <FullWidthControl>
            <div
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <ModalFieldNarrow style={{ flex: 1 }}>
                <Input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={pct}
                  onChange={(ev) =>
                    setPct(sanitizePercentInput(ev.target.value))
                  }
                  placeholder="0–100 · 소수 첫째 자리"
                />
              </ModalFieldNarrow>
              <PartyFormAutoCalcBtn
                type="button"
                onClick={handleAutoFillPct}
                title="등록된 다른 투표 안의 득표수와 합산해 득표율을 자동 계산합니다"
              >
                자동 계산
              </PartyFormAutoCalcBtn>
              {remainingPctHint != null && pct !== String(remainingPctHint) ? (
                <PartyFormAutoCalcBtn
                  type="button"
                  onClick={() => setPct(String(remainingPctHint))}
                  title="100%에서 다른 투표 안의 득표율 합을 뺀 잔여 비율을 채웁니다"
                >
                  잔여 {remainingPctHint}% 채우기
                </PartyFormAutoCalcBtn>
              ) : null}
            </div>
            {otherVotesSum > 0n ? (
              <PartyFormHint>
                다른 투표 안 득표 합계:{' '}
                {formatVotesForDisplay(otherVotesSum.toString())}표
              </PartyFormHint>
            ) : null}
          </FullWidthControl>
        </FieldRow>
        <FieldRow>
          <FieldLabel>메모</FieldLabel>
          <FullWidthControl>
            <Textarea
              value={notes}
              onChange={(ev) => setNotes(ev.target.value)}
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
    keepOpen?: boolean,
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
      totalVotes: mineVotes != null ? otherVotesSum + mineVotes : otherVotesSum,
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
      notify.error('득표수를 먼저 입력하세요.')
      return
    }
    let mine: bigint
    try {
      mine = BigInt(sanitized)
    } catch {
      notify.error('득표수를 숫자로 입력하세요.')
      return
    }
    const total = otherVotesSum + mine
    if (total <= 0n) {
      notify.error('다른 정당의 득표 데이터가 없어 계산할 수 없습니다.')
      return
    }
    // BigInt 나눗셈 정밀도 유지: 천 배 곱해 정수 나눗셈 후 소수 자리 복원
    const ratioThousandths = Number((mine * 100000n) / total) / 1000
    const rounded = Math.round(ratioThousandths * 10) / 10
    setPct(String(rounded))
    notify.success(
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

  /** 다른 정당 제외 순수 잔여 의석 (totalSeats - otherSeatsSum) */
  const unassignedSeatsPool = useMemo(() => {
    if (electionTotalSeats == null || !Number.isFinite(electionTotalSeats))
      return null
    const pool = electionTotalSeats - otherSeatsSum
    return pool > 0 ? pool : null
  }, [electionTotalSeats, otherSeatsSum])

  /** 다른 정당 제외 순수 잔여 득표율 (100 - otherVoteShareSum) */
  const unassignedVoteSharePool = useMemo(() => {
    if (otherVoteShareSum <= 0 || otherVoteShareSum >= 100) return null
    return Math.round((100 - otherVoteShareSum) * 10) / 10
  }, [otherVoteShareSum])

  const handleSubmitPartyResult = (keepOpen: boolean) => {
    const targetPartyId = mode === 'edit' ? initialRow!.partyId : partyId
    if (!targetPartyId) {
      notify.error('정당을 선택하세요.')
      return
    }
    const votesParsed = parseOptionalVotesDigits(votes)
    if (votesParsed === 'invalid') {
      notify.error('득표수는 숫자만 입력하거나 비워 두세요.')
      return
    }
    const pctParsed = parseOptionalPercent0to100(pct)
    if (pctParsed === 'invalid') {
      notify.error(
        '득표율은 0~100 사이 숫자(소수 첫째 자리까지)이거나 비워 두세요.',
      )
      return
    }
    const seatsParsed = parseOptionalNonNegativeInt(seats)
    if (seatsParsed === 'invalid') {
      notify.error('의석은 0 이상의 정수이거나 비워 두세요.')
      return
    }
    onSubmit(
      targetPartyId,
      {
        votes: votesParsed,
        voteSharePercent: pctParsed === null ? null : String(pctParsed),
        seatsWon: seatsParsed,
        notes: notes.trim() || null,
      },
      keepOpen,
    )
    if (keepOpen && mode === 'create') {
      setPartyId('')
      setVotes('')
      setPct('')
      setSeats('')
      setNotes('')
    }
  }

  return (
    <ElectionsModalShell
      title={mode === 'create' ? '정당 집계 추가' : '정당 집계 수정'}
      onClose={onClose}
      maxWidth="min(1120px, 96vw)"
      footer={
        <ModalFooterRow>
          <ModalFooterStatusText
            $error={seatsRemainingHint != null && seatsRemainingHint < 0}
          >
            {mode === 'create' && !partyId
              ? '필수 선택: 정당을 먼저 선택하세요.'
              : seatsRemainingHint != null && seatsRemainingHint < 0
                ? `총 의석 ${electionTotalSeats}석 초과 (${-seatsRemainingHint}석)`
                : '입력한 수치가 상단 전체 합계 미리보기에 즉시 반영됩니다.'}
          </ModalFooterStatusText>
          <ModalFooterBtnGroup>
            <ModalCancelBtn type="button" onClick={onClose} disabled={saving}>
              취소
            </ModalCancelBtn>
            {mode === 'create' && partyChoices.length > 1 ? (
              <ModalSecondaryBtn
                type="button"
                disabled={saving || !partyId}
                onClick={() => handleSubmitPartyResult(true)}
                title="현재 정당 집계를 저장하고 다음 정당을 이어서 입력합니다"
              >
                저장 후 계속 추가
              </ModalSecondaryBtn>
            ) : null}
            <PersonRegisterModalPrimaryBtn
              type="button"
              disabled={saving || (mode === 'create' && !partyId)}
              onClick={() => handleSubmitPartyResult(false)}
            >
              저장
            </PersonRegisterModalPrimaryBtn>
          </ModalFooterBtnGroup>
        </ModalFooterRow>
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
                {electionTotalSeats != null ? ` / ${electionTotalSeats}` : ''}석
              </PartyFormPreviewValue>
              <PartyFormPreviewDelta>
                다른 {otherSeatsSum}석 + 이 정당 {preview.mineSeats ?? '—'}
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
                <option value="">정당 선택 ({partyChoices.length}개 가능)</option>
                {partyChoices.map((party) => (
                  <option key={party.id} value={party.id}>
                    {getPartyDisplayName(party)}
                  </option>
                ))}
              </FormSelectNative>
            ) : (
              <PartyTableCellStrong>
                {getPartyDisplayName(initialRow?.party) || initialRow?.partyId}
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
            <div
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
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
              {unassignedVoteSharePool != null &&
              pct !== String(unassignedVoteSharePool) ? (
                <PartyFormAutoCalcBtn
                  type="button"
                  onClick={() => setPct(String(unassignedVoteSharePool))}
                  title="100%에서 다른 정당 득표율 합을 뺀 잔여 득표율을 채웁니다"
                >
                  잔여 {unassignedVoteSharePool}% 채우기
                </PartyFormAutoCalcBtn>
              ) : null}
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
            <div
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ maxWidth: 280, flex: 1 }}>
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
              {unassignedSeatsPool != null &&
              seats !== String(unassignedSeatsPool) ? (
                <PartyFormAutoCalcBtn
                  type="button"
                  onClick={() => setSeats(String(unassignedSeatsPool))}
                  title="총 의석에서 다른 정당 의석 합을 뺀 잔여 의석을 자동으로 채웁니다"
                >
                  잔여 {unassignedSeatsPool}석 채우기
                </PartyFormAutoCalcBtn>
              ) : null}
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
              rows={4}
            />
          </ModalFieldWide>
        </FieldRow>
      </FormRows>
    </ElectionsModalShell>
  )
}

const ModalFooterRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  flex-wrap: wrap;
`

const ModalFooterStatusText = styled.span<{ $error?: boolean }>`
  font-size: 12px;
  font-weight: 500;
  color: ${({ $error, theme }) =>
    $error
      ? 'var(--negative, #dc2626)'
      : theme.colors.text.tertiary};
`

const ModalFooterBtnGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
`

const ModalCancelBtn = styled.button`
  min-width: 72px;
  height: 40px;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 10px;
  cursor: pointer;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  transition:
    background 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease;
  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f8fafc'};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const ModalSecondaryBtn = styled.button`
  height: 40px;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 10px;
  cursor: pointer;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.45)' : '#c7d2fe'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99,102,241,0.14)' : '#eef2ff'};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#c7d2fe' : '#4338ca'};
  transition:
    background 0.15s ease,
    border-color 0.15s ease;
  &:hover:not(:disabled) {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.24)' : '#e0e7ff'};
    border-color: #6366f1;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const ModalCandidacyResultBox = styled.div`
  margin-top: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#f8fafc'};
  overflow: hidden;
`

const ModalCandidacyResultHeader = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 14px;
  border: none;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99,102,241,0.1)' : '#eef2ff'};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  text-align: left;
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.18)' : '#e0e7ff'};
  }
`

const ModalTargetContextBanner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px 14px;
  border-radius: 10px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f8fafc'};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  color: ${({ theme }) => theme.colors.text.primary};
`

const ModalOptionSwitcherRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 2px;
`

const ModalOptionSwitcherPill = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  cursor: pointer;
  border: 1px solid
    ${({ $active, theme }) =>
      $active
        ? '#6366f1'
        : theme.colors.border.default};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99,102,241,0.22)'
        : '#eef2ff'
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? '#6366f1' : theme.colors.text.secondary};
  & small {
    font-size: 11px;
    opacity: 0.8;
    font-variant-numeric: tabular-nums;
  }
  &:hover {
    border-color: #6366f1;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const ElectionPartyStatusBadge = styled.span<{ $dissolved?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 10px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  border-radius: 999px;
  vertical-align: middle;
  color: ${({ $dissolved, theme }) =>
    $dissolved
      ? theme.mode === 'dark'
        ? '#fca5a5'
        : '#b91c1c'
      : theme.mode === 'dark'
        ? '#86efac'
        : '#15803d'};
  background: ${({ $dissolved, theme }) =>
    $dissolved
      ? theme.mode === 'dark'
        ? 'rgba(220,38,38,0.16)'
        : '#fef2f2'
      : theme.mode === 'dark'
        ? 'rgba(34,197,94,0.14)'
        : '#f0fdf4'};
  border: 1px solid
    ${({ $dissolved, theme }) =>
      $dissolved
        ? theme.mode === 'dark'
          ? 'rgba(220,38,38,0.32)'
          : '#fecaca'
        : theme.mode === 'dark'
          ? 'rgba(34,197,94,0.32)'
          : '#bbf7d0'};
`

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
      <ConfirmDialogBox role="document" onClick={(e) => e.stopPropagation()}>
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

/* ── 사건 상세(Event Detail) 문법 연동 스타일 컴포넌트 ── */

const ElectionListRowGrid = styled.div`
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
`

const ElectionListYearCol = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding-top: 1px;
`

const ElectionListYearNum = styled.span`
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
  ${DIGIT_DISPLAY}
`

const ElectionListOrdinalSub = styled.span`
  font-size: 10.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
`

const ElectionListContentCol = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
`

/*
 * 글자색을 여기서 테마로 못 박는다 — 전역 body 색(app/index.css)이 다크용 #f9fafb라, 색을 따로 정하지 않은
 * 정당 이름·의석 수가 라이트 모드 흰 바탕에서 거의 안 보였다(정당 집계 요약 '사회민주당 (SPD) 43석').
 */
const ElectionLedgerContainer = styled.div`
  container-type: inline-size;
  width: 100%;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ElectionLedgerBody = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 24px;
  align-items: start;
`

const ElectionLedgerMain = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 24px;
`

const ElectionHero = styled.header`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 14px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

const ElectionHeroTopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
`

const ElectionHeroBreadcrumbs = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
`


const ElectionCategoryChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  letter-spacing: -0.01em;

  .mono {
    ${DIGIT_DISPLAY}
  }
`

const ElectionCategorySep = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  opacity: 0.7;
  margin: 0 1px;
`

const ElectionChainNav = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 2px;
`

const ElectionChainBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 7px;
  border-radius: 4px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition:
    color 0.12s ease,
    border-color 0.12s ease,
    background 0.12s ease;

  &:hover:not(:disabled) {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
    background: ${({ theme }) => ledgerRowWash(theme.mode)};
  }

  &:disabled {
    opacity: 0.36;
    cursor: default;
  }
`

const ElectionHeroActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`

const ElectionHeroActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 10px;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition:
    color 0.12s ease,
    border-color 0.12s ease,
    background 0.12s ease;

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
    background: ${({ theme }) => ledgerRowWash(theme.mode)};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`


const ElectionHeroTitleRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
`

const ElectionHeroTitle = styled.h2`
  margin: 0;
  font-size: clamp(20px, 2.2vw, 25px);
  font-weight: 700;
  letter-spacing: -0.025em;
  line-height: 1.25;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ElectionHeroShortName = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ElectionHeroOutcomeStrip = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 2px;
  padding-top: 10px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const ElectionWinnerLine = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ElectionWinnerKicker = styled.span`
  ${DIGIT_DISPLAY}
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const ElectionWinnerNames = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`





const ElectionTabBar = styled.nav`
  position: sticky;
  top: 0;
  z-index: 4;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  padding: 6px 0;
  background: ${({ theme }) => theme.colors.background.primary};
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

const ElectionTabBtn = styled.button<{ $active?: boolean }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: none;
  border-radius: 5px;
  background: ${({ theme, $active }) =>
    $active ? ledgerExpandedFill(theme.mode) : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.text.primary : theme.colors.text.secondary};
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  cursor: pointer;
  transition:
    color 0.12s ease,
    background 0.12s ease;

  &::after {
    content: '';
    position: absolute;
    left: 10px;
    right: 10px;
    bottom: -7px;
    height: 2px;
    border-radius: 1px;
    background: ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : 'transparent'};
  }

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme, $active }) =>
      $active ? ledgerExpandedFill(theme.mode) : ledgerRowWash(theme.mode)};
  }
`

const ElectionTabCount = styled.span<{ $active?: boolean }>`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
`

const ElectionTabViewModeBtn = styled.button<{ $active?: boolean }>`
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 9px;
  border-radius: 4px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : ledgerHairline(theme.mode)};
  background: ${({ theme, $active }) =>
    $active ? ledgerExpandedFill(theme.mode) : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.tertiary};
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const ElectionLedgerSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 18px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
`

const ElectionSectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
`

const ElectionSectionHeaderLeft = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
`

const ElectionSectionTitle = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ElectionSectionSubtitle = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
`

const ElectionSectionActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`

const ElectionSectionActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 27px;
  padding: 0 9px;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition:
    color 0.12s ease,
    border-color 0.12s ease,
    background 0.12s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
    background: ${({ theme }) => ledgerRowWash(theme.mode)};
  }
`

const ElectionTabEmptyBox = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px 16px;
  border-radius: 6px;
  border: 1px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
`

const ElectionTabEmptyText = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ElectionAddLineBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 2px;
  border: none;
  background: transparent;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover:not(:disabled) {
    text-decoration: underline;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const ElectionOverviewGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
`

const ElectionOverviewCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
`

const ElectionOverviewRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 5px 0;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  font-size: 13px;

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
`

const ElectionHeroCompactFacts = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 14px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const ElectionHeroFactItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;

  .k {
    font-size: 11px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  .mono {
    ${DIGIT_DISPLAY}
  }

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`





const ElectionBentoLegendRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px 8px;
`

const ElectionBentoLegendBtn = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2.5px 7px;
  border-radius: ${RADIUS.SM};
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? ledgerAccentBorder(theme.mode) : 'transparent'};
  background: ${({ $active, theme }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  font-family: inherit;
  font-size: 11.5px;
  color: ${({ $active, theme }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    background: ${({ $active, theme }) =>
      $active ? ledgerAccentSubtle(theme.mode) : ledgerRowWash(theme.mode)};
  }

  strong {
    font-weight: 700;
    color: ${({ $active, theme }) =>
      $active ? ledgerAccent(theme.mode) : theme.colors.text.primary};
    ${DIGIT_DISPLAY}
  }
`

const ElectionBentoDot = styled.span<{ $color: string }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`




const ElectionNavTurnoutTrack = styled.div`
  margin-top: 5px;
  height: 3px;
  width: 100%;
  border-radius: 999px;
  background: ${({ theme }) => ledgerHairline(theme.mode)};
  overflow: hidden;
`

const ElectionNavTurnoutFill = styled.div<{ $pct: number }>`
  height: 100%;
  width: ${({ $pct }) => `${Math.min(100, Math.max(2, $pct))}%`};
  border-radius: 999px;
  background: ${({ theme }) => ledgerAccent(theme.mode)};
  opacity: 0.72;
`

const ElectionOverviewPickSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const ElectionOverviewPickHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};

  strong {
    font-size: 14px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  span {
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const ElectionOverviewPickGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
`

const ElectionOverviewPickCard = styled.button`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
  padding: 12px 14px;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  text-align: left;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    background: ${({ theme }) => ledgerRowWash(theme.mode)};
  }

  .top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    width: 100%;
    font-size: 11px;
    ${DIGIT_DISPLAY}
  }

  .yr {
    font-weight: 700;
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }

  .type {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  .title {
    font-size: 13.5px;
    font-weight: 700;
    line-height: 1.35;
  }

  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    font-size: 11.5px;
    color: ${({ theme }) => theme.colors.text.secondary};
    ${DIGIT_DISPLAY}
  }
`




const ElectionOverviewRowStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 0;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  font-size: 13px;

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
`

const ElectionOverviewRowMain = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  .stats {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    ${DIGIT_DISPLAY}
  }

  .muted {
    color: ${({ theme }) => theme.colors.text.tertiary};
    font-size: 11.5px;
  }

  .ord {
    font-size: 11px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.tertiary};
    flex-shrink: 0;
    ${DIGIT_DISPLAY}
  }
`

const ElectionOverviewMiniTrack = styled.div`
  height: 4px;
  width: 100%;
  border-radius: 999px;
  background: ${({ theme }) => ledgerHairline(theme.mode)};
  overflow: hidden;
`

const ElectionOverviewMiniFill = styled.div<{ $pct: number; $fill: string }>`
  height: 100%;
  width: ${({ $pct }) => `${Math.min(100, Math.max(2, $pct))}%`};
  border-radius: 999px;
  background: ${({ $fill }) => $fill};
  opacity: 0.85;
`


