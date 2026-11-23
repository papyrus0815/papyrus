/**
 * 국가 상세 — 선거·투표 탭 상단: 이 국가 소속 정당(PoliticalParty) 등록·편집
 * 정당 등록/수정은 인물 등록 모달(PersonRegisterViewModal)과 동일한 셸 사용
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  FiArrowUpRight,
  FiCalendar,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiColumns,
  FiEdit2,
  FiImage,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiX,
  FiFlag,
  FiSliders,
  FiGitMerge,
  FiAward,
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'

import {
  BentoActionBtn,
  BentoCard,
  BentoCardBadge,
  BentoCardBody,
  BentoCardHeader,
  BentoCardTitle,
  BentoCardTitleGroup,
  BentoGrid2Col,
  MiniDonutRing,
  type SegmentSlice,
} from '@/entities/event/ui/bento-primitives'
import {
  DIGIT_DISPLAY,
  RADIUS,
  ledgerAccent,
  ledgerAccentBorder,
  ledgerAccentSubtle,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerRowWash,
  ledgerSubtleFill,
} from '@/entities/event/ui/ledger-tokens'
import * as EventFormS from '@/pages/events/create/event-create.styles'
import {
  addPartyLaw,
  getLaws,
  getPartyLaws,
  removePartyLaw,
} from '@/shared/api/election'
import {
  type CreatePoliticalPartyInput,
  type PartyTopLeaderTenure,
  type PoliticalParty,
  type PoliticalPartyKind,
  type PartyTransitionEndpoint,
  type PoliticalPartyTransitionKind,
  type PoliticalPosition,
  POLITICAL_PARTY_KIND_OPTIONS,
  labelPoliticalPartyKind,
  politicalPartyApi,
} from '@/shared/api/political-party'
import {
  getUploadImageUrl,
  uploadImage,
  validateImageFile,
} from '@/shared/api/upload'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { useRichTextProseClick } from '@/shared/hooks/use-rich-text-prose-click'
import {
  EMPTY_PERIOD_DATE,
  type PeriodDateFormValue,
  formatPartialDate,
  isPartyDissolved,
  isPeriodFormInverted,
  partialOfFormValue,
  partialSignedYear,
  partialSortKey,
  partyDissolvedOn,
  partyFoundedOn,
  periodDateFormError,
  periodDateFormValue,
  structuredInputOf,
  transitionEffectiveOn,
} from '@/shared/lib/party-dates'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { isLikelyRichTextHtml } from '@/shared/lib/rich-text-read-view'
import { sanitizeRichTextHtml } from '@/shared/lib/sanitize-rich-text-html'
import { pathKeys } from '@/shared/router'
import { ChartSkeleton } from '@/shared/ui/chart-skeleton/chart-skeleton'
import { confirm } from '@/shared/ui/confirm-dialog'
import { PeriodDateField } from '@/shared/ui/period-date-field/period-date-field'
import { notify } from '@/shared/ui/toast'
import { FormSelectNative } from '@/shared/ui/form-select-native'
import {
  KitFormLoading,
  KitUploadActions,
  KitUploadFilled,
  KitUploadRemove,
  KitUploadStrip,
  KitUploadText,
  KitUploadThumb,
  kitC,
} from '@/shared/ui/register-form-kit/register-form-kit'
import { RegisterModal } from '@/shared/ui/register-modal-shell/register-modal'
import {
  FooterActions,
  HeaderActionsBar,
  RegisterFooterStatus,
  useModalSubmitShortcut,
} from '@/shared/ui/register-modal-shell/register-modal-chrome'
import {
  PersonRegisterModalCancelBtn,
  PersonRegisterModalPrimaryBtn,
  PersonRegisterModalStickyFooter,
} from '@/shared/ui/register-modal-shell/register-modal-shell'
import {
  ErrorMessage,
  FieldControl,
  FieldHint,
  FieldLabel,
  FieldRow,
  FormRows,
  FormSectionInner,
  Input,
  Required,
} from '@/shared/ui/register-form-layout'
import { RichTextEditor } from '@/shared/ui/rich-text-editor/rich-text-editor'
import { SidePanel } from '@/shared/ui/side-panel'

import {
  DetailHeaderIconBtn,
  EmptyHint,
  PartyDescBody,
  PartyDescContent,
  PartyDescEmptyHint,
  PartyDescOutlineBtn,
  PartyDescPlainText,
  PartyDescPrimaryBtn,
  PartyDescProse,
  PartyDescSectionLabel,
  PartyDescSectionLabelRow,
  PartyDescriptionEditActions,
  PartyDescriptionEditorWrap,
  PartyDescriptionLabel,
  PartyDescriptionLabelRow,
  PartyDetailBackLink,
  PartyDetailChip,
  PartyDetailChipMuted,
  PartyDetailChipRowCenter,
  PartyDetailDescSection,
  PartyDetailHero,
  PartyDetailHeroBody,
  PartyDetailHeroStack,
  PartyDetailHeroTitle,
  PartyDetailLayout,
  PartyDetailLineageActionBtn,
  PartyDetailLineageAddPanel,
  PartyDetailLineageBtnPair,
  PartyDetailLineageGroupTitle,
  PartyDetailLineageHint,
  PartyDetailLineageIntro,
  PartyDetailLineageItem,
  PartyDetailLineageItemMain,
  PartyDetailLineageList,
  PartyDetailLineageMeta,
  PartyDetailLineageSection,
  PartyDetailLogoHero,
  PartyDetailLogoImg,
  PartyDetailTopActions,
  PartyDetailTopBar,
  PartyDetailTopLeft,
  PartyIdeologySpectrumBubble,
  PartyIdeologySpectrumBubbleAnchor,
  PartyIdeologySpectrumEnds,
  PartyIdeologySpectrumPin,
  PartyIdeologySpectrumStage,
  PartyIdeologySpectrumTrackBar,
  PartyIdeologySpectrumWrap,
  PartyInfographicCard,
  PartyInfographicCardBody,
  PartyInfographicCardHero,
  PartyInfographicFootHint,
  PartyInfographicGrid,
  PartyInfographicLogo,
  PartyInfographicLogoImg,
  PartyInfographicMetaRow,
  PartyInfographicPartyName,
  PartyInfographicPositionChip,
  PartyInfographicSection,
  PartyInfographicShortBadge,
  PartyInfographicShortRow,
  PartyInfographicStatusPill,
  PartyLineageConfirmSummary,
  PartyLineageTextarea,
  PartyTopLeaderMeta,
  PartyTopLeaderName,
  PartyTopLeaderRow,
  PartyTopLeadersHint,
  PartyTopLeadersList,
  RowIconBtn,
  SubsectionAddBtn,
  ToolbarGhostBtnSm,
} from './country-politics-tab.styles'
import * as FormS from './military-unit-form/styles'
import { PartyLegalStatusBlock, PartyNamesBlock } from './party-identity-sections'
import { PartyIdeologyBlock } from './party-ideology-sections'
import { PartyMembershipsBlock } from './party-membership-sections'
import { PartyOrganizationsBlock } from './party-organization-sections'
import { PartyCitationButton } from './party-citations'
import { PartyMetricsBlock } from './party-metric-sections'
import { PartyLinksBlock } from './party-link-sections'
import { PartyInfoboxPanel } from './party-infobox-panel'
import { PartyExpressionsBlock, PartyHeadquartersBlock, PartySymbolsBlock } from './party-mark-sections'
import { type IdeologyChip, IdeologyPicker } from '@/widgets/ideology/ideology-picker'
import { CountryTabEmptyState } from './country-tab-empty-state'
import {
  PARTY_KIND_TONE_OPTIONS,
  POSITION_TONE_OPTIONS,
  ToneChipGroup,
  useSplitLayoutMode,
} from './politics-form/politics-form-parts'

const PartyBlockRoot = styled.div`
  flex: 1 1 0%;
  min-height: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
`

const PartyListAreaBody = styled.div`
  flex: 1 1 0%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  margin-top: 14px;
`

/** 로고 — 카드형 업로드 대신 썸네일 + 텍스트 액션 (가벼운 한 줄 레이아웃) */
const PartyFilterBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 10px 0;
  border-top: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: transparent;
`

const PartySearchBox = styled.div`
  flex: 1 1 200px;
  min-width: 180px;
  height: 34px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  gap: 7px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: ${RADIUS.SM};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.tertiary};

  input {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    font-size: 13px;
    color: ${({ theme }) => theme.colors.text.primary};
    outline: none;

    &::placeholder {
      color: ${({ theme }) => theme.colors.text.tertiary};
    }
  }
`

const PartySearchClearBtn = styled.button`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  display: inline-flex;
  padding: 2px;
`

const PartyFilterSelect = styled.select`
  height: 34px;
  padding: 0 10px;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: ${RADIUS.SM};
  outline: none;
  &:focus-visible {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const PartyStatusSegmentGroup = styled.div`
  display: inline-flex;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: ${RADIUS.SM};
  overflow: hidden;
`

const PartyStatusSegBtn = styled.button<{ $active: boolean }>`
  height: 32px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  border: none;
  background: ${({ $active, theme }) =>
    $active ? ledgerAccentSubtle(theme.mode) : theme.colors.background.primary};
  color: ${({ $active, theme }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  cursor: pointer;
`

const PartyFilterMeta = styled.div`
  ${DIGIT_DISPLAY}
  margin-left: auto;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
`

const PartyFilterResetBtn = styled.button`
  background: none;
  border: none;
  padding: 0;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  cursor: pointer;
  font: inherit;
  font-weight: 600;
  text-decoration: underline;
`

const PartySpectrumChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
  padding-top: 6px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const PartySpectrumFilterChip = styled.button<{ $active: boolean }>`
  ${DIGIT_DISPLAY}
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 8px;
  font-size: 11px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  border-radius: ${RADIUS.SM};
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? ledgerAccentBorder(theme.mode) : ledgerHairlineStrong(theme.mode)};
  background: ${({ $active, theme }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  cursor: pointer;

  span {
    opacity: 0.72;
    font-size: 10.5px;
  }
`

const PartyBentoDonutRow = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const PartyBentoStatusCol = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const PartyBentoStatusBtn = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 3px 6px;
  margin: 0 -6px;
  border: none;
  border-radius: ${RADIUS.SM};
  background: ${({ $active, theme }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;

  &:hover {
    background: ${({ $active, theme }) =>
      $active ? ledgerAccentSubtle(theme.mode) : ledgerRowWash(theme.mode)};
  }

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .lbl {
    flex: 1;
    text-align: left;
    font-weight: ${({ $active }) => ($active ? 600 : 500)};
  }

  strong {
    ${DIGIT_DISPLAY}
    font-weight: 700;
    color: ${({ $active, theme }) =>
      $active ? ledgerAccent(theme.mode) : theme.colors.text.primary};
  }
`

const PartyLifespanMiniList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`

const PartyLifespanMiniRow = styled.button`
  display: grid;
  grid-template-columns: minmax(76px, 124px) minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 2.5px 6px;
  margin: 0 -6px;
  border: none;
  border-radius: ${RADIUS.SM};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 11.5px;
  cursor: pointer;
  text-align: left;

  &:hover {
    background: ${({ theme }) => ledgerRowWash(theme.mode)};
  }

  .name {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .yrs {
    ${DIGIT_DISPLAY}
    font-size: 10.5px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const PartyLifespanMiniTrack = styled.div`
  position: relative;
  height: 5px;
  border-radius: 999px;
  background: ${({ theme }) => ledgerHairline(theme.mode)};
  overflow: hidden;
`

const PartyLifespanMiniFill = styled.div<{
  $left: number
  $width: number
  $color: string
  $dissolved: boolean
}>`
  position: absolute;
  top: 0;
  bottom: 0;
  left: ${({ $left }) => `${$left}%`};
  width: ${({ $width }) => `${$width}%`};
  background: ${({ $color }) => $color};
  opacity: ${({ $dissolved }) => ($dissolved ? 0.55 : 0.9)};
  border-radius: 999px;
`

const PartyCardIdeologyChip = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 1.5px 6px;
  border-radius: 4px;
  font-size: 10.5px;
  font-weight: 500;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const PartyResultCellBarWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 84px;
  ${DIGIT_DISPLAY}
`

const PartyResultCellTrack = styled.div`
  height: 4px;
  width: 100%;
  border-radius: 999px;
  background: ${({ theme }) => ledgerHairline(theme.mode)};
  overflow: hidden;
`

const PartyResultCellFill = styled.div<{ $pct: number; $color: string }>`
  height: 100%;
  width: ${({ $pct }) => `${Math.min(100, Math.max(2, $pct))}%`};
  border-radius: 999px;
  background: ${({ $color }) => $color};
`

/** 관계 데이터 섹션 공통 테이블 */
const PartyRelationTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 4px;
  font-size: 12.5px;
`

const PartyRelationTh = styled.th`
  padding: 8px 10px;
  text-align: left;
  font-weight: 600;
  font-size: 11px;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.secondary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc'};
`

const PartyRelationTd = styled.td`
  padding: 10px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  color: ${({ theme }) => theme.colors.text.primary};
  vertical-align: top;
  & strong {
    font-weight: 600;
  }
`

const PartyRelationTr = styled.tr<{ onClick?: () => void }>`
  cursor: ${({ onClick }) => (onClick ? 'pointer' : 'default')};
  transition: background 0.12s ease;
  &:hover {
    background: ${({ onClick, theme }) =>
      onClick
        ? theme.mode === 'dark'
          ? 'rgba(255,255,255,0.03)'
          : '#f8fafc'
        : 'transparent'};
  }
  &:focus-visible {
    outline: 2px solid #6366f1;
    outline-offset: -2px;
    border-radius: 4px;
  }
`

const PartyRelationMeta = styled.div`
  margin-top: 3px;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  line-height: 1.45;
`

const PartyRelationShowMoreRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 6px;
  padding: 8px 2px;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: transparent;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 0;
`

const PartyRelationShowMoreBtn = styled.button`
  background: none;
  border: none;
  padding: 0;
  color: #6366f1;
  cursor: pointer;
  font: inherit;
  font-weight: 600;
  text-decoration: underline;
  &:hover {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5')};
  }
`

const PartyLineageEmptyRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: 0 0 16px;
  padding: 10px 2px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 0;
  background: transparent;
`

const PartyStatusBadge = styled.span<{ $dissolved?: boolean }>`
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

const POSITION_OPTIONS: { value: PoliticalPosition; label: string }[] = [
  { value: 'FAR_LEFT', label: '극좌' },
  { value: 'LEFT', label: '좌파' },
  { value: 'CENTER_LEFT', label: '중도좌파' },
  { value: 'CENTER', label: '중도' },
  { value: 'CENTER_RIGHT', label: '중도우파' },
  { value: 'RIGHT', label: '우파' },
  { value: 'FAR_RIGHT', label: '극우' },
  { value: 'BIG_TENT', label: '빅텐트' },
]

function formatDate(iso?: string | null) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('ko-KR', { timeZone: 'UTC' })
  } catch {
    return iso
  }
}

function labelPoliticalPosition(value: string | null | undefined) {
  if (!value) return '—'
  const o = POSITION_OPTIONS.find((x) => x.value === value)
  return o?.label ?? value
}

function labelTopLeaderPositionType(
  positionType: PartyTopLeaderTenure['positionType'],
) {
  if (positionType === 'HEAD_OF_GOVERNMENT') return '정부수반'
  return '국가원수'
}

function tenureTitleLine(t: PartyTopLeaderTenure): string {
  const defTitle = t.positionDefinition?.title?.trim()
  const raw = t.title?.trim()
  const title = defTitle || raw
  if (title) return title
  return labelTopLeaderPositionType(t.positionType)
}

function formatTenureRange(startDate: string, endDate?: string | null) {
  const a = formatDate(startDate)
  const b = endDate ? formatDate(endDate) : '재임 중'
  return `${a} — ${b}`
}

function PartyTopLeadersBlock({ partyId }: { partyId: string }) {
  const navigate = useNavigate()
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['political-parties', partyId, 'top-leaders'],
    queryFn: () => politicalPartyApi.getTopLeaders(partyId),
    enabled: !!partyId,
  })

  return (
    <PartyDetailDescSection aria-label="배출 최고권력자">
      <PartyDescSectionLabelRow style={{ marginBottom: 10 }}>
        <PartyDescSectionLabel>배출 최고권력자</PartyDescSectionLabel>
      </PartyDescSectionLabelRow>
      <PartyTopLeadersHint>
        국가원수·정부수반(대통령, 국왕, 수상·총리 등) 재임이 이 정당으로
        당선된 경우, 또는 재임 기간과 겹치는 당원 소속이 있으면 표시합니다.
      </PartyTopLeadersHint>
      {isLoading ? (
        <ChartSkeleton variant="text" lines={3} />
      ) : isError ? (
        <PartyDescEmptyHint>목록을 불러오지 못했습니다.</PartyDescEmptyHint>
      ) : data.length === 0 ? (
        <PartyDescEmptyHint>연결된 최고권력자 재임이 없습니다.</PartyDescEmptyHint>
      ) : (
        <PartyTopLeadersList>
          {data.map((t) => (
            <li key={t.id}>
              <PartyTopLeaderRow
                type="button"
                onClick={() => navigate(pathKeys.personsTimelineDetail(t.person.id))}
                aria-label={`${getPersonDisplayName(t.person)} 인물 상세`}
              >
                <PartyTopLeaderName>
                  {getPersonDisplayName(t.person)}
                </PartyTopLeaderName>
                <PartyTopLeaderMeta>
                  {tenureTitleLine(t)}
                  {' · '}
                  {formatTenureRange(t.startDate, t.endDate)}
                </PartyTopLeaderMeta>
              </PartyTopLeaderRow>
            </li>
          ))}
        </PartyTopLeadersList>
      )}
    </PartyDetailDescSection>
  )
}

const PARTY_RELATION_DEFAULT_LIMIT = 30

function formatVotesLocalized(raw: string | null | undefined): string {
  if (raw == null) return '—'
  const t = String(raw).trim()
  if (!t) return '—'
  if (/^\d+$/.test(t)) {
    try {
      return BigInt(t).toLocaleString('ko-KR')
    } catch {
      return t
    }
  }
  return t
}

function formatVoteShareShort(raw: string | null | undefined): string {
  if (raw == null) return '—'
  const num = Number(raw)
  if (!Number.isFinite(num)) return String(raw)
  return `${(Math.round(num * 100) / 100).toFixed(2)}%`
}

function PartyElectionResultsBlock({
  partyId,
  routeCountryId,
  brandColor,
}: {
  partyId: string
  routeCountryId: string
  brandColor?: string | null
}) {
  const theme = useTheme()
  const navigate = useNavigate()
  const [showAll, setShowAll] = useState(false)
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['political-parties', partyId, 'election-results'],
    queryFn: () => politicalPartyApi.getElectionResults(partyId),
    enabled: !!partyId,
  })
  const visible = showAll ? data : data.slice(0, PARTY_RELATION_DEFAULT_LIMIT)
  const hiddenCount = Math.max(0, data.length - visible.length)
  const barFill = brandColor || ledgerAccent(theme.mode)
  return (
    <PartyDetailDescSection aria-label="역대 선거 성적">
      <PartyDescSectionLabelRow style={{ marginBottom: 10 }}>
        <PartyDescSectionLabel>역대 선거 성적</PartyDescSectionLabel>
      </PartyDescSectionLabelRow>
      {isLoading ? (
        <ChartSkeleton variant="text" lines={3} />
      ) : isError ? (
        <PartyDescEmptyHint>목록을 불러오지 못했습니다.</PartyDescEmptyHint>
      ) : data.length === 0 ? (
        <PartyDescEmptyHint>
          연결된 선거 집계가 없습니다. 선거 탭에서 정당 집계를 추가하세요.
        </PartyDescEmptyHint>
      ) : (
        <>
        <PartyRelationTable>
          <thead>
            <tr>
              <PartyRelationTh>선거</PartyRelationTh>
              <PartyRelationTh>득표</PartyRelationTh>
              <PartyRelationTh>득표율</PartyRelationTh>
              <PartyRelationTh>의석</PartyRelationTh>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const el = row.election
              const title = el
                ? el.convocationOrdinal != null
                  ? `${el.convocationOrdinal}대 ${el.shortName ?? el.name}`
                  : (el.shortName ?? el.name)
                : row.electionId
              const goto = () => {
                if (!el) return
                navigate(
                  `${pathKeys.countryElections(routeCountryId)}?electionId=${encodeURIComponent(el.id)}`,
                )
              }
              const pctNum = row.voteSharePercent != null ? Number(row.voteSharePercent) : NaN
              const seatPctNum =
                row.seatsWon != null && el?.totalSeats && el.totalSeats > 0
                  ? (row.seatsWon / el.totalSeats) * 100
                  : NaN
              return (
                <PartyRelationTr
                  key={row.id}
                  onClick={el ? goto : undefined}
                  role={el ? 'button' : undefined}
                  tabIndex={el ? 0 : -1}
                  onKeyDown={(e) => {
                    if (!el) return
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      goto()
                    }
                  }}
                  aria-label={el ? `${title} 선거 상세` : undefined}
                >
                  <PartyRelationTd>
                    <strong>{title}</strong>
                    <PartyRelationMeta>
                      {el?.pollDate ? formatDate(el.pollDate) : ''}
                    </PartyRelationMeta>
                  </PartyRelationTd>
                  <PartyRelationTd>
                    {formatVotesLocalized(row.votes)}
                  </PartyRelationTd>
                  <PartyRelationTd>
                    <PartyResultCellBarWrap>
                      <span>{formatVoteShareShort(row.voteSharePercent)}</span>
                      {Number.isFinite(pctNum) && pctNum > 0 ? (
                        <PartyResultCellTrack>
                          <PartyResultCellFill $pct={pctNum} $color={barFill} />
                        </PartyResultCellTrack>
                      ) : null}
                    </PartyResultCellBarWrap>
                  </PartyRelationTd>
                  <PartyRelationTd>
                    <PartyResultCellBarWrap>
                      <span>
                        {row.seatsWon != null
                          ? `${row.seatsWon}${el?.totalSeats ? ` / ${el.totalSeats}` : ''}석`
                          : '—'}
                      </span>
                      {Number.isFinite(seatPctNum) && seatPctNum > 0 ? (
                        <PartyResultCellTrack>
                          <PartyResultCellFill
                            $pct={seatPctNum}
                            $color={barFill}
                          />
                        </PartyResultCellTrack>
                      ) : null}
                    </PartyResultCellBarWrap>
                  </PartyRelationTd>
                </PartyRelationTr>
              )
            })}
          </tbody>
        </PartyRelationTable>
        {hiddenCount > 0 || showAll ? (
          <PartyRelationShowMoreRow>
            <span>
              전체 {data.length}건 · {visible.length}건 표시
            </span>
            <PartyRelationShowMoreBtn
              type="button"
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? '접기' : `${hiddenCount}건 더 보기`}
            </PartyRelationShowMoreBtn>
          </PartyRelationShowMoreRow>
        ) : null}
        </>
      )}
    </PartyDetailDescSection>
  )
}


const PartyInlineFormStrip = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 0;
  margin-bottom: 12px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const PartyInlineFormRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`

const PartyInlineFormActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
`

function PartyCabinetAffiliationsBlock({
  partyId,
  routeCountryId,
}: {
  partyId: string
  routeCountryId: string
}) {
  const navigate = useNavigate()
  const [showAll, setShowAll] = useState(false)
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['political-parties', partyId, 'cabinet-affiliations'],
    queryFn: () => politicalPartyApi.getCabinetAffiliations(partyId),
    enabled: !!partyId,
  })
  const visible = showAll ? data : data.slice(0, PARTY_RELATION_DEFAULT_LIMIT)
  const hiddenCount = Math.max(0, data.length - visible.length)
  const labelRole = (roleVal: string) => {
    if (roleVal === 'LEADING') return '집권(단독)'
    if (roleVal === 'COALITION_PARTNER') return '연정 파트너'
    if (roleVal === 'SUPPORTING_MINOR') return '지원·소수'
    if (roleVal === 'OPPOSITION') return '야당'
    return roleVal
  }
  return (
    <PartyDetailDescSection aria-label="내각 참여">
      <PartyDescSectionLabelRow style={{ marginBottom: 10 }}>
        <PartyDescSectionLabel>내각 참여</PartyDescSectionLabel>
      </PartyDescSectionLabelRow>
      {isLoading ? (
        <ChartSkeleton variant="text" lines={3} />
      ) : isError ? (
        <PartyDescEmptyHint>목록을 불러오지 못했습니다.</PartyDescEmptyHint>
      ) : data.length === 0 ? (
        <PartyDescEmptyHint>연결된 내각 참여가 없습니다.</PartyDescEmptyHint>
      ) : (
        <>
        <PartyRelationTable>
          <thead>
            <tr>
              <PartyRelationTh>내각</PartyRelationTh>
              <PartyRelationTh>역할</PartyRelationTh>
              <PartyRelationTh>기간</PartyRelationTh>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const cabinet = row.cabinet
              const tenure = cabinet?.headTenure
              const period =
                tenure?.startDate || tenure?.endDate
                  ? `${tenure?.startDate ? formatDate(tenure.startDate) : '—'} — ${
                      tenure?.endDate ? formatDate(tenure.endDate) : '유효'
                    }`
                  : '—'
              const goToCabinet = () =>
                navigate(
                  `${pathKeys.countryGovernment(routeCountryId)}?cabinetId=${encodeURIComponent(row.cabinetId)}`,
                )
              return (
                <PartyRelationTr
                  key={row.id}
                  onClick={goToCabinet}
                  role="button"
                  tabIndex={0}
                  style={{ cursor: 'pointer' }}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter' || ev.key === ' ') {
                      ev.preventDefault()
                      goToCabinet()
                    }
                  }}
                >
                  <PartyRelationTd>
                    <strong style={{ color: '#2563eb' }}>
                      {cabinet?.name?.trim() || row.cabinetId}
                    </strong>
                    {row.notes?.trim() ? (
                      <PartyRelationMeta>{row.notes.trim()}</PartyRelationMeta>
                    ) : null}
                  </PartyRelationTd>
                  <PartyRelationTd>{labelRole(row.role)}</PartyRelationTd>
                  <PartyRelationTd>{period}</PartyRelationTd>
                </PartyRelationTr>
              )
            })}
          </tbody>
        </PartyRelationTable>
        {hiddenCount > 0 || showAll ? (
          <PartyRelationShowMoreRow>
            <span>
              전체 {data.length}건 · {visible.length}건 표시
            </span>
            <PartyRelationShowMoreBtn
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
            >
              {showAll ? '접기' : `${hiddenCount}건 더 보기`}
            </PartyRelationShowMoreBtn>
          </PartyRelationShowMoreRow>
        ) : null}
        </>
      )}
    </PartyDetailDescSection>
  )
}

function PartyLawsBlock({
  partyId,
  routeCountryId,
  countryId,
  historicalCountryId,
}: {
  partyId: string
  routeCountryId: string
  countryId?: string
  historicalCountryId?: string
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showAll, setShowAll] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [selectedLawId, setSelectedLawId] = useState('')
  const [relevanceNote, setRelevanceNote] = useState('')

  const lawScopeKey = historicalCountryId
    ? `h:${historicalCountryId}`
    : countryId
      ? `c:${countryId}`
      : ''
  const lawListParams = useMemo(() => {
    if (historicalCountryId) return { historicalCountryId }
    if (countryId) return { countryId }
    return {}
  }, [countryId, historicalCountryId])

  const { data: countryLaws = [] } = useQuery({
    queryKey: ['laws', lawScopeKey],
    queryFn: () => getLaws(lawListParams as Record<string, string>),
    enabled: Boolean(lawScopeKey),
  })

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['political-parties', partyId, 'laws'],
    queryFn: () => getPartyLaws(partyId),
    enabled: !!partyId,
  })

  const linkedLawIds = useMemo(
    () => new Set(data.map((row) => row.lawId)),
    [data],
  )
  const availableLaws = useMemo(
    () =>
      countryLaws
        .filter((lawItem) => !linkedLawIds.has(lawItem.id))
        .sort((left, right) => left.name.localeCompare(right.name, 'ko')),
    [countryLaws, linkedLawIds],
  )

  const addLawMut = useMutation({
    mutationFn: () =>
      addPartyLaw(partyId, {
        lawId: selectedLawId,
        relevanceNote: relevanceNote.trim() || null,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['political-parties', partyId, 'laws'],
      })
      setSelectedLawId('')
      setRelevanceNote('')
      setAddOpen(false)
      notify.success('관련 법률을 연결했습니다.')
    },
    onError: (err: Error) => notify.error(err.message),
  })

  const removeLawMut = useMutation({
    mutationFn: (linkId: string) => removePartyLaw(partyId, linkId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['political-parties', partyId, 'laws'],
      })
      notify.success('법률 연결을 해제했습니다.')
    },
    onError: (err: Error) => notify.error(err.message),
  })

  const visible = showAll ? data : data.slice(0, PARTY_RELATION_DEFAULT_LIMIT)
  const hiddenCount = Math.max(0, data.length - visible.length)
  return (
    <PartyDetailDescSection aria-label="관련 법률">
      <PartyDescSectionLabelRow style={{ marginBottom: 10 }}>
        <PartyDescSectionLabel>관련 법률</PartyDescSectionLabel>
        <PartyDescOutlineBtn
          type="button"
          onClick={() => setAddOpen((prev) => !prev)}
        >
          <FiPlus size={14} />
          {addOpen ? '닫기' : '법률 연결'}
        </PartyDescOutlineBtn>
      </PartyDescSectionLabelRow>
      {addOpen ? (
        <PartyInlineFormStrip>
          <PartyInlineFormRow>
            <FormSelectNative
              value={selectedLawId}
              onChange={(event) => setSelectedLawId(event.target.value)}
              aria-label="연결할 법률 선택"
              style={{ flex: '1 1 220px', minWidth: 180 }}
            >
              <option value="">
                {availableLaws.length > 0
                  ? `법률 선택 (${availableLaws.length}건)…`
                  : '연결 가능한 미연결 법령 없음'}
              </option>
              {availableLaws.map((lawItem) => (
                <option key={lawItem.id} value={lawItem.id}>
                  {lawItem.name}
                  {lawItem.lawType?.name ? ` (${lawItem.lawType.name})` : ''}
                </option>
              ))}
            </FormSelectNative>
            <Input
              value={relevanceNote}
              onChange={(event) => setRelevanceNote(event.target.value)}
              placeholder="관련 메모 (예: 정당 설립 근거법, 당론 발의 핵심 법안)"
              aria-label="관련 메모"
              style={{ flex: '2 1 260px', minWidth: 200 }}
            />
          </PartyInlineFormRow>
          <PartyInlineFormActions>
            <PartyDescOutlineBtn
              type="button"
              disabled={addLawMut.isPending}
              onClick={() => {
                setSelectedLawId('')
                setRelevanceNote('')
                setAddOpen(false)
              }}
            >
              취소
            </PartyDescOutlineBtn>
            <PartyDescPrimaryBtn
              type="button"
              disabled={!selectedLawId || addLawMut.isPending}
              onClick={() => addLawMut.mutate()}
            >
              {addLawMut.isPending ? '연결 중…' : '연결'}
            </PartyDescPrimaryBtn>
          </PartyInlineFormActions>
        </PartyInlineFormStrip>
      ) : null}
      {isLoading ? (
        <ChartSkeleton variant="text" lines={3} />
      ) : isError ? (
        <PartyDescEmptyHint>목록을 불러오지 못했습니다.</PartyDescEmptyHint>
      ) : data.length === 0 ? (
        <PartyDescEmptyHint>
          연결된 법률이 없습니다. 우측 상단「법률 연결」버튼으로 국가 법령을 연결할 수 있습니다.
        </PartyDescEmptyHint>
      ) : (
        <>
        <PartyRelationTable>
          <thead>
            <tr>
              <PartyRelationTh>법률</PartyRelationTh>
              <PartyRelationTh>관련 메모</PartyRelationTh>
              <PartyRelationTh style={{ width: 48, textAlign: 'right' }}>
                작업
              </PartyRelationTh>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const lawDisplayName = row.law?.name ?? row.lawId
              const goToLaw = () =>
                navigate(
                  `${pathKeys.countryLaws(routeCountryId)}?lawId=${encodeURIComponent(row.lawId)}`,
                )
              return (
                <PartyRelationTr
                  key={row.id}
                  onClick={goToLaw}
                  role="button"
                  tabIndex={0}
                  style={{ cursor: 'pointer' }}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter' || ev.key === ' ') {
                      ev.preventDefault()
                      goToLaw()
                    }
                  }}
                >
                  <PartyRelationTd>
                    <strong style={{ color: '#2563eb' }}>
                      {lawDisplayName}
                    </strong>
                    {row.law?.summary ? (
                      <PartyRelationMeta>{row.law.summary}</PartyRelationMeta>
                    ) : null}
                  </PartyRelationTd>
                  <PartyRelationTd>
                    {row.relevanceNote?.trim() || '—'}
                  </PartyRelationTd>
                  <PartyRelationTd
                    style={{ textAlign: 'right' }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <RowIconBtn
                      type="button"
                      $variant="danger"
                      disabled={removeLawMut.isPending}
                      aria-label={`${lawDisplayName} 연결 해제`}
                      title="연결 해제"
                      onClick={async (event) => {
                        event.stopPropagation()
                        if (
                          await confirm({
                            title: '법률 연결 해제',
                            message: `「${lawDisplayName}」을(를) 이 정당의 관련 법률에서 해제할까요?`,
                            danger: true,
                          })
                        ) {
                          removeLawMut.mutate(row.id)
                        }
                      }}
                    >
                      <FiTrash2 size={14} strokeWidth={2} />
                    </RowIconBtn>
                  </PartyRelationTd>
                </PartyRelationTr>
              )
            })}
          </tbody>
        </PartyRelationTable>
        {hiddenCount > 0 || showAll ? (
          <PartyRelationShowMoreRow>
            <span>
              전체 {data.length}건 · {visible.length}건 표시
            </span>
            <PartyRelationShowMoreBtn
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
            >
              {showAll ? '접기' : `${hiddenCount}건 더 보기`}
            </PartyRelationShowMoreBtn>
          </PartyRelationShowMoreRow>
        ) : null}
        </>
      )}
    </PartyDetailDescSection>
  )
}

const POSITION_SPECTRUM_PCT: Record<PoliticalPosition, number> = {
  FAR_LEFT: 5,
  LEFT: 17,
  CENTER_LEFT: 31,
  CENTER: 50,
  CENTER_RIGHT: 69,
  RIGHT: 83,
  FAR_RIGHT: 95,
  BIG_TENT: 50,
}

function ideologySpectrumLeftPct(
  position: PoliticalPosition | null | undefined,
): number {
  if (!position) return 50
  return POSITION_SPECTRUM_PCT[position] ?? 50
}

function partyFallbackBrandColor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = (h + id.charCodeAt(i) * (i + 1)) % 360
  }
  return `hsl(${h} 58% 52%)`
}

function normalizeRichTextForSave(html: string): string | null {
  const trimmed = html?.trim() ?? ''
  if (!trimmed) return null
  const safe = sanitizeRichTextHtml(trimmed)
  if (typeof document !== 'undefined') {
    const div = document.createElement('div')
    div.innerHTML = safe
    if (!(div.textContent || '').trim()) return null
  }
  return safe || null
}

function isRichTextVisuallyEmpty(html: string | null | undefined): boolean {
  const t = html?.trim() ?? ''
  if (!t) return true
  const safe = sanitizeRichTextHtml(t)
  if (typeof document === 'undefined') return false
  const div = document.createElement('div')
  div.innerHTML = safe
  return !(div.textContent || '').trim()
}

function normalizeBrandColorInput(raw: string): string | null {
  const t = raw.trim()
  if (!t) return null
  const withHash = t.startsWith('#') ? t : `#${t}`
  if (!/^#[0-9A-Fa-f]{6}$/.test(withHash)) return null
  return withHash.toLowerCase()
}

const TRANSITION_KIND_LABELS: Record<PoliticalPartyTransitionKind, string> = {
  SUCCESSION: '승계',
  MERGER_INTO: '합당(흡수)',
  SPLIT_FROM: '분당',
  CONTINUITY: '연속',
}

const LINEAGE_KIND_OPTIONS: {
  value: PoliticalPartyTransitionKind
  label: string
}[] = [
  { value: 'SUCCESSION', label: '승계' },
  { value: 'MERGER_INTO', label: '합당(흡수)' },
  { value: 'SPLIT_FROM', label: '분당' },
  { value: 'CONTINUITY', label: '연속' },
]

function parseIdeologyKeywords(raw: string | null | undefined): string[] {
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

/** 목록에서 kind가 승계가 아니면 짧은 뱃지로 표시 */
function transitionKindTag(kind: PoliticalPartyTransitionKind): string | null {
  if (kind === 'SUCCESSION') return null
  return TRANSITION_KIND_LABELS[kind] ?? kind
}

/** 계보 기준일 라벨 — 구조화 칸(1921년만 알아도) 우선 */
function formatLineageDate(row: PartyTransitionEndpoint): string | null {
  return formatPartialDate(transitionEffectiveOn(row)) || null
}

/** 계보 행 → 폼 날짜 칸 */
function lineageEffectiveFormValue(row: PartyTransitionEndpoint): PeriodDateFormValue {
  if (row.effectiveYear != null) {
    return periodDateFormValue(row.effectiveEra, row.effectiveYear, row.effectiveMonth, row.effectiveDay)
  }
  const iso = transitionEffectiveOn(row)
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return match ? periodDateFormValue('AD', Number(match[1]), Number(match[2]), Number(match[3])) : { ...EMPTY_PERIOD_DATE }
}

function PartyLineageBlock({
  partyId,
  partyName,
  parties,
  routeCountryId,
}: {
  partyId: string
  partyName: string
  parties: PoliticalParty[]
  routeCountryId: string
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const playClickSound = useClickSound()
  const [lineageModal, setLineageModal] = useState<
    null | 'predecessor' | 'successor'
  >(null)
  const [lineageOtherPartyId, setLineageOtherPartyId] = useState<string | null>(
    null,
  )
  const [lineageEffective, setLineageEffective] = useState<PeriodDateFormValue>({ ...EMPTY_PERIOD_DATE })
  const lineageEffectiveError = periodDateFormError(lineageEffective)
  const [lineageConfirmNotes, setLineageConfirmNotes] = useState('')
  const [lineagePartyError, setLineagePartyError] = useState<string | null>(
    null,
  )
  const [lineageKind, setLineageKind] =
    useState<PoliticalPartyTransitionKind>('SUCCESSION')
  const [lineageEditingId, setLineageEditingId] = useState<string | null>(null)

  const closeLineageModal = () => {
    setLineageModal(null)
    setLineageEditingId(null)
    setLineageOtherPartyId(null)
    setLineageEffective({ ...EMPTY_PERIOD_DATE })
    setLineageConfirmNotes('')
    setLineagePartyError(null)
    setLineageKind('SUCCESSION')
  }

  const { data: lineage, isLoading } = useQuery({
    queryKey: ['political-party-lineage', partyId],
    queryFn: () => politicalPartyApi.getLineage(partyId),
  })

  const editingTransitionRow =
    lineageEditingId && lineage
      ? [...lineage.predecessors, ...lineage.successors].find(
          (r) => r.id === lineageEditingId,
        )
      : undefined

  const saveMut = useMutation({
    mutationFn: (payload: {
      editingId: string | null
      link: 'predecessor' | 'successor'
      otherPartyId: string
      kind: PoliticalPartyTransitionKind
      effective: ReturnType<typeof structuredInputOf>
      notes?: string | null
    }) => {
      const { editingId, link, otherPartyId, kind, effective, notes } =
        payload
      const nt = notes?.trim()
      if (editingId) {
        return politicalPartyApi.updateTransition(editingId, {
          kind,
          effective,
          notes: nt ? nt : null,
        })
      }
      if (!otherPartyId) throw new Error('정당을 선택하세요.')
      if (otherPartyId === partyId)
        throw new Error('같은 정당은 연결할 수 없습니다.')
      const from = link === 'predecessor' ? otherPartyId : partyId
      const to = link === 'predecessor' ? partyId : otherPartyId
      return politicalPartyApi.createTransition({
        fromPartyId: from,
        toPartyId: to,
        kind,
        ...(effective ? { effective } : {}),
        ...(nt ? { notes: nt } : {}),
      })
    },
    onSuccess: (_, variables) => {
      notify.success(
        variables.editingId ? '계보를 수정했습니다.' : '계보를 연결했습니다.',
      )
      closeLineageModal()
      queryClient.invalidateQueries({
        queryKey: ['political-party-lineage', partyId],
      })
    },
    onError: (e: Error) => notify.error(e.message),
  })

  const delMut = useMutation({
    mutationFn: (id: string) => politicalPartyApi.deleteTransition(id),
    onSuccess: () => {
      notify.success('삭제했습니다.')
      queryClient.invalidateQueries({
        queryKey: ['political-party-lineage', partyId],
      })
    },
    onError: (e: Error) => notify.error(e.message),
  })

  const others = parties.filter((p) => p.id !== partyId)

  return (
    <PartyDetailLineageSection aria-label="정당 계보 전신·후신">
      <PartyDescriptionLabelRow>
        <PartyDescriptionLabel>전신·후신</PartyDescriptionLabel>
      </PartyDescriptionLabelRow>
      {isLoading ? (
        <ChartSkeleton variant="text" lines={3} />
      ) : (
        <>
          <PartyDetailLineageIntro>
            「{partyName}」 기준으로, <strong>전신</strong>은 그 이전에 이어지던
            정당, <strong>후신</strong>은 그 다음에 이어지는 정당입니다.
          </PartyDetailLineageIntro>
          <PartyDetailLineageGroupTitle>전신</PartyDetailLineageGroupTitle>
          {lineage?.predecessors?.length ? (
            <PartyDetailLineageList>
              {lineage.predecessors.map((row) => {
                const metaParts: string[] = []
                const dateLabel = formatLineageDate(row)
                if (dateLabel) metaParts.push(`기준일: ${dateLabel}`)
                if (row.notes?.trim()) metaParts.push(row.notes.trim())
                return (
                  <PartyDetailLineageItem key={row.id}>
                    <PartyDetailLineageItemMain>
                      <span>
                        <button
                          type="button"
                          onClick={() => {
                            if (row.fromPartyId) {
                              navigate(
                                pathKeys.countryElectionPartyDetail(
                                  routeCountryId,
                                  row.fromPartyId,
                                ),
                              )
                            }
                          }}
                          style={{
                            border: 'none',
                            background: 'none',
                            padding: 0,
                            font: 'inherit',
                            fontWeight: 700,
                            color: row.fromPartyId ? '#2563eb' : 'inherit',
                            cursor: row.fromPartyId ? 'pointer' : 'default',
                          }}
                        >
                          {row.fromParty?.name ?? '(정당)'}
                        </button>
                        {transitionKindTag(row.kind) ? (
                          <span style={{ color: '#94a3b8', marginLeft: 8 }}>
                            {transitionKindTag(row.kind)}
                          </span>
                        ) : null}
                      </span>
                      {metaParts.length ? (
                        <PartyDetailLineageMeta>
                          {metaParts.join('\n')}
                        </PartyDetailLineageMeta>
                      ) : null}
                    </PartyDetailLineageItemMain>
                    <div
                      style={{
                        display: 'flex',
                        gap: 6,
                        flexShrink: 0,
                        alignItems: 'center',
                      }}
                    >
                      <ToolbarGhostBtnSm
                        type="button"
                        disabled={saveMut.isPending || delMut.isPending}
                        aria-label="계보 연결 수정"
                        onClick={() => {
                          setLineageEditingId(row.id)
                          setLineageModal('predecessor')
                          setLineageOtherPartyId(row.fromPartyId)
                          setLineageKind(row.kind)
                          setLineageEffective(lineageEffectiveFormValue(row))
                          setLineageConfirmNotes(row.notes ?? '')
                          setLineagePartyError(null)
                        }}
                      >
                        수정
                      </ToolbarGhostBtnSm>
                      <ToolbarGhostBtnSm
                        type="button"
                        disabled={saveMut.isPending || delMut.isPending}
                        aria-label="계보 연결 삭제"
                        onClick={async () => {
                          if (
                            await confirm({
                              title: '삭제 확인',
                              message: '이 계보 연결을 삭제할까요?',
                              danger: true,
                            })
                          )
                            delMut.mutate(row.id)
                        }}
                      >
                        삭제
                      </ToolbarGhostBtnSm>
                    </div>
                  </PartyDetailLineageItem>
                )
              })}
            </PartyDetailLineageList>
          ) : (
            <PartyLineageEmptyRow>
              <EmptyHint style={{ margin: 0 }}>
                등록된 전신이 없습니다.
              </EmptyHint>
              <SubsectionAddBtn
                type="button"
                disabled={others.length === 0 || saveMut.isPending}
                onClick={() => {
                  setLineageEditingId(null)
                  setLineageModal('predecessor')
                  setLineageOtherPartyId(null)
                  setLineageEffective({ ...EMPTY_PERIOD_DATE })
                  setLineageConfirmNotes('')
                  setLineagePartyError(null)
                  setLineageKind('SUCCESSION')
                }}
              >
                <FiPlus size={13} strokeWidth={2.25} />
                전신 추가
              </SubsectionAddBtn>
            </PartyLineageEmptyRow>
          )}
          <PartyDetailLineageGroupTitle>후신</PartyDetailLineageGroupTitle>
          {lineage?.successors?.length ? (
            <PartyDetailLineageList>
              {lineage.successors.map((row) => {
                const metaParts: string[] = []
                const dateLabel = formatLineageDate(row)
                if (dateLabel) metaParts.push(`기준일: ${dateLabel}`)
                if (row.notes?.trim()) metaParts.push(row.notes.trim())
                return (
                  <PartyDetailLineageItem key={row.id}>
                    <PartyDetailLineageItemMain>
                      <span>
                        <button
                          type="button"
                          onClick={() => {
                            if (row.toPartyId) {
                              navigate(
                                pathKeys.countryElectionPartyDetail(
                                  routeCountryId,
                                  row.toPartyId,
                                ),
                              )
                            }
                          }}
                          style={{
                            border: 'none',
                            background: 'none',
                            padding: 0,
                            font: 'inherit',
                            fontWeight: 700,
                            color: row.toPartyId ? '#2563eb' : 'inherit',
                            cursor: row.toPartyId ? 'pointer' : 'default',
                          }}
                        >
                          {row.toParty?.name ?? '(정당)'}
                        </button>
                        {transitionKindTag(row.kind) ? (
                          <span style={{ color: '#94a3b8', marginLeft: 8 }}>
                            {transitionKindTag(row.kind)}
                          </span>
                        ) : null}
                      </span>
                      {metaParts.length ? (
                        <PartyDetailLineageMeta>
                          {metaParts.join('\n')}
                        </PartyDetailLineageMeta>
                      ) : null}
                    </PartyDetailLineageItemMain>
                    <div
                      style={{
                        display: 'flex',
                        gap: 6,
                        flexShrink: 0,
                        alignItems: 'center',
                      }}
                    >
                      <ToolbarGhostBtnSm
                        type="button"
                        disabled={saveMut.isPending || delMut.isPending}
                        aria-label="계보 연결 수정"
                        onClick={() => {
                          setLineageEditingId(row.id)
                          setLineageModal('successor')
                          setLineageOtherPartyId(row.toPartyId)
                          setLineageKind(row.kind)
                          setLineageEffective(lineageEffectiveFormValue(row))
                          setLineageConfirmNotes(row.notes ?? '')
                          setLineagePartyError(null)
                        }}
                      >
                        수정
                      </ToolbarGhostBtnSm>
                      <ToolbarGhostBtnSm
                        type="button"
                        disabled={saveMut.isPending || delMut.isPending}
                        aria-label="계보 연결 삭제"
                        onClick={async () => {
                          if (
                            await confirm({
                              title: '삭제 확인',
                              message: '이 계보 연결을 삭제할까요?',
                              danger: true,
                            })
                          )
                            delMut.mutate(row.id)
                        }}
                      >
                        삭제
                      </ToolbarGhostBtnSm>
                    </div>
                  </PartyDetailLineageItem>
                )
              })}
            </PartyDetailLineageList>
          ) : (
            <PartyLineageEmptyRow>
              <EmptyHint style={{ margin: 0 }}>
                등록된 후신이 없습니다.
              </EmptyHint>
              <SubsectionAddBtn
                type="button"
                disabled={others.length === 0 || saveMut.isPending}
                onClick={() => {
                  setLineageEditingId(null)
                  setLineageModal('successor')
                  setLineageOtherPartyId(null)
                  setLineageEffective({ ...EMPTY_PERIOD_DATE })
                  setLineageConfirmNotes('')
                  setLineagePartyError(null)
                  setLineageKind('SUCCESSION')
                }}
              >
                <FiPlus size={13} strokeWidth={2.25} />
                후신 추가
              </SubsectionAddBtn>
            </PartyLineageEmptyRow>
          )}
          <PartyDetailLineageAddPanel>
            <PartyDetailLineageHint>
              <strong>전신으로 연결</strong>·<strong>후신으로 연결</strong>을
              누르면 우측 패널에서 상대 정당·계보 유형·기준일·메모를 한 화면에서
              입력해 저장합니다. 같은 맥락에 등록된 다른 정당만 선택할 수
              있습니다.
            </PartyDetailLineageHint>
            <PartyDetailLineageBtnPair>
              <PartyDetailLineageActionBtn
                type="button"
                disabled={
                  others.length === 0 ||
                  saveMut.isPending ||
                  lineageModal != null
                }
                onClick={() => {
                  setLineageEditingId(null)
                  setLineageModal('predecessor')
                  setLineageOtherPartyId(null)
                  setLineageEffective({ ...EMPTY_PERIOD_DATE })
                  setLineageConfirmNotes('')
                  setLineagePartyError(null)
                  setLineageKind('SUCCESSION')
                }}
              >
                <strong>전신으로 연결</strong>
                <small>과거 정당 → 「{partyName}」</small>
              </PartyDetailLineageActionBtn>
              <PartyDetailLineageActionBtn
                type="button"
                disabled={
                  others.length === 0 ||
                  saveMut.isPending ||
                  lineageModal != null
                }
                onClick={() => {
                  setLineageEditingId(null)
                  setLineageModal('successor')
                  setLineageOtherPartyId(null)
                  setLineageEffective({ ...EMPTY_PERIOD_DATE })
                  setLineageConfirmNotes('')
                  setLineagePartyError(null)
                  setLineageKind('SUCCESSION')
                }}
              >
                <strong>후신으로 연결</strong>
                <small>「{partyName}」→ 이어질 정당</small>
              </PartyDetailLineageActionBtn>
            </PartyDetailLineageBtnPair>
            <SidePanel
              isOpen={lineageModal !== null}
              onClose={closeLineageModal}
              closeOnOverlayClick={!saveMut.isPending}
              title={
                lineageEditingId
                  ? lineageModal === 'predecessor'
                    ? '전신 계보 수정'
                    : lineageModal === 'successor'
                      ? '후신 계보 수정'
                      : '계보 수정'
                  : lineageModal === 'predecessor'
                    ? '전신으로 연결'
                    : lineageModal === 'successor'
                      ? '후신으로 연결'
                      : '계보 연결'
              }
              subtitle={`기준 정당: 「${partyName}」`}
              width="min(920px, 100vw)"
              footer={
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                    width: '100%',
                  }}
                >
                  <PersonRegisterModalCancelBtn
                    type="button"
                    onClick={closeLineageModal}
                  >
                    취소
                  </PersonRegisterModalCancelBtn>
                  {others.length > 0 || lineageEditingId ? (
                    <PersonRegisterModalPrimaryBtn
                      type="button"
                      onClick={() => {
                        if (!lineageModal) return
                        if (!lineageEditingId && !lineageOtherPartyId) {
                          const msg = '연결할 정당을 선택하세요.'
                          setLineagePartyError(msg)
                          notify.error(msg)
                          return
                        }
                        if (lineageEffectiveError) {
                          notify.error(`기준일: ${lineageEffectiveError}`)
                          return
                        }
                        if (lineageConfirmNotes.length > 4000) {
                          notify.error('메모는 4000자 이하여야 합니다.')
                          return
                        }
                        setLineagePartyError(null)
                        saveMut.mutate({
                          editingId: lineageEditingId,
                          link: lineageModal,
                          otherPartyId: lineageOtherPartyId ?? '',
                          kind: lineageKind,
                          effective: structuredInputOf(lineageEffective),
                          notes: lineageConfirmNotes.trim() || null,
                        })
                      }}
                      disabled={
                        saveMut.isPending ||
                        (!lineageEditingId && !lineageOtherPartyId)
                      }
                    >
                      {lineageEditingId ? '저장' : '연결'}
                    </PersonRegisterModalPrimaryBtn>
                  ) : null}
                </div>
              }
            >
              {others.length === 0 && !lineageEditingId ? (
                <EmptyHint style={{ margin: 0 }}>
                  연결할 다른 정당이 없습니다. 이 맥락에 정당을 더 등록하세요.
                </EmptyHint>
              ) : (
                <FormSectionInner>
                  <PartyLineageConfirmSummary style={{ marginTop: 0 }}>
                    {lineageOtherPartyId ? (
                      lineageModal === 'predecessor' ? (
                        <>
                          「
                          {others.find((p) => p.id === lineageOtherPartyId)
                            ?.name ??
                            editingTransitionRow?.fromParty?.name ??
                            ''}
                          」→「{partyName}」
                          <br />
                          <span style={{ fontWeight: 500, fontSize: 13 }}>
                            {lineageEditingId
                              ? '전신 계보를 수정합니다.'
                              : '전신 방향으로 저장합니다.'}
                          </span>
                        </>
                      ) : (
                        <>
                          「{partyName}」→「
                          {others.find((p) => p.id === lineageOtherPartyId)
                            ?.name ??
                            editingTransitionRow?.toParty?.name ??
                            ''}
                          」
                          <br />
                          <span style={{ fontWeight: 500, fontSize: 13 }}>
                            {lineageEditingId
                              ? '후신 계보를 수정합니다.'
                              : '후신 방향으로 저장합니다.'}
                          </span>
                        </>
                      )
                    ) : (
                      <span style={{ fontWeight: 500, fontSize: 13 }}>
                        먼저 「정당 선택」으로 상대 정당을 고른 뒤, 필요하면
                        「계보 유형」을 바꿉니다.
                      </span>
                    )}
                  </PartyLineageConfirmSummary>
                  <p
                    style={{
                      margin: '0 0 12px',
                      fontSize: 12,
                      color: 'var(--text-secondary, #64748b)',
                      lineHeight: 1.45,
                    }}
                  >
                    정당과 계보 유형은 같은 스타일의 선택 창에서 고릅니다.
                    기준일·메모는 선택입니다.
                  </p>
                  <FormRows>
                    <FieldRow>
                      <FieldLabel htmlFor="lineage-other-party">
                        연결할 정당
                        {!lineageEditingId ? (
                          <Required aria-label="필수" />
                        ) : null}
                      </FieldLabel>
                      <FieldControl>
                        <FormSelectNative
                          id="lineage-other-party"
                          value={lineageOtherPartyId ?? ''}
                          disabled={!!lineageEditingId || saveMut.isPending}
                          onChange={(e) => {
                            setLineageOtherPartyId(e.target.value || null)
                            setLineagePartyError(null)
                          }}
                          aria-invalid={lineagePartyError != null}
                          style={
                            lineagePartyError != null
                              ? { borderColor: '#dc2626' }
                              : undefined
                          }
                        >
                          <option value="">
                            {lineageEditingId
                              ? others.find(
                                  (p) => p.id === lineageOtherPartyId,
                                )?.name ??
                                (lineageModal === 'predecessor'
                                  ? editingTransitionRow?.fromParty?.name
                                  : editingTransitionRow?.toParty?.name) ??
                                '정당'
                              : '정당 선택…'}
                          </option>
                          {others.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </FormSelectNative>
                        {lineageEditingId ? (
                          <FieldHint style={{ marginTop: 8 }}>
                            편집 중에는 상대 정당을 바꿀 수 없습니다. 방향을
                            바꾸려면 삭제 후 다시 연결하세요.
                          </FieldHint>
                        ) : null}
                        {lineagePartyError ? (
                          <ErrorMessage>{lineagePartyError}</ErrorMessage>
                        ) : null}
                      </FieldControl>
                    </FieldRow>
                    <FieldRow>
                      <FieldLabel htmlFor="lineage-kind">계보 유형</FieldLabel>
                      <FieldControl>
                        <FormSelectNative
                          id="lineage-kind"
                          value={lineageKind}
                          disabled={saveMut.isPending}
                          onChange={(e) =>
                            setLineageKind(
                              e.target.value as PoliticalPartyTransitionKind,
                            )
                          }
                        >
                          {LINEAGE_KIND_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </FormSelectNative>
                      </FieldControl>
                    </FieldRow>
                    <FieldRow>
                      <FieldLabel>기준일 (선택)</FieldLabel>
                      <FieldControl>
                        <PeriodDateField
                          {...lineageEffective}
                          ariaLabel="계보 기준일"
                          pickerTitle="계보 기준일"
                          error={Boolean(lineageEffectiveError)}
                          onChange={setLineageEffective}
                        />
                        {lineageEffectiveError ? (
                          <EmptyHint role="alert" style={{ margin: '6px 0 0' }}>
                            {lineageEffectiveError}
                          </EmptyHint>
                        ) : null}
                      </FieldControl>
                    </FieldRow>
                    <FieldRow>
                      <FieldLabel>메모·근거 (선택)</FieldLabel>
                      <FieldControl>
                        <PartyLineageTextarea
                          value={lineageConfirmNotes}
                          onChange={(e) =>
                            setLineageConfirmNotes(e.target.value)
                          }
                          placeholder="승계·개명 등 사유를 적어 두면 나중에 참고하기 좋습니다."
                          maxLength={4000}
                          disabled={saveMut.isPending}
                        />
                      </FieldControl>
                    </FieldRow>
                  </FormRows>
                </FormSectionInner>
              )}
            </SidePanel>
          </PartyDetailLineageAddPanel>
        </>
      )}
    </PartyDetailLineageSection>
  )
}

function partyScopeKey(input: {
  countryId?: string
  historicalCountryId?: string
}) {
  if (input.historicalCountryId)
    return `h:${input.historicalCountryId}` as const
  if (input.countryId) return `c:${input.countryId}` as const
  return '' as const
}

function partyListParams(input: {
  countryId?: string
  historicalCountryId?: string
}): { countryId?: string; historicalCountryId?: string } {
  if (input.historicalCountryId)
    return { historicalCountryId: input.historicalCountryId }
  if (input.countryId) return { countryId: input.countryId }
  return {}
}

export function CountryPoliticalPartiesBlock({
  countryId,
  historicalCountryId,
  selectedPartyId,
  createRequestTick = 0,
}: {
  countryId?: string
  historicalCountryId?: string
  selectedPartyId: string | null
  createRequestTick?: number
}) {
  const theme = useTheme()
  const navigate = useNavigate()
  const { handleProseClick } = useRichTextProseClick({
    navigate,
    onPersonClick: (personId) => navigate(pathKeys.personsTimelineDetail(personId)),
  })
  const queryClient = useQueryClient()
  const routeCountryId = countryId ?? historicalCountryId ?? ''
  const scopeKey = partyScopeKey({ countryId, historicalCountryId })
  const [modal, setModal] = useState<
    { mode: 'create' } | { mode: 'edit'; id: string } | null
  >(null)
  const prevCreateTickRef = useRef(createRequestTick)
  useEffect(() => {
    if (createRequestTick > prevCreateTickRef.current) {
      prevCreateTickRef.current = createRequestTick
      setModal({ mode: 'create' })
    }
  }, [createRequestTick])
  const [editingPartyDescription, setEditingPartyDescription] = useState(false)
  const [partyDescriptionDraft, setPartyDescriptionDraft] = useState('')

  /** 목록 검색·필터·정렬 */
  const [listSearch, setListSearch] = useState('')
  const [listPositionFilter, setListPositionFilter] = useState<string>('')
  const [listStatusFilter, setListStatusFilter] = useState<
    '' | 'active' | 'dissolved'
  >('')
  const [listSortKey, setListSortKey] = useState<'founded' | 'name'>('founded')
  const [listSortDir, setListSortDir] = useState<'asc' | 'desc'>('desc')

  const listParams = partyListParams({ countryId, historicalCountryId })

  const { data: parties = [], isLoading } = useQuery({
    queryKey: ['political-parties', scopeKey],
    queryFn: () => politicalPartyApi.getAll(listParams),
    enabled: !!scopeKey,
  })

  /** 검색·필터·정렬 적용된 정당 목록 */
  const filteredParties = useMemo(() => {
    const query = listSearch.trim().toLowerCase()
    const rows = parties.filter((party) => {
      if (query) {
        const hay =
          `${party.name} ${party.shortName ?? ''} ${party.localName ?? ''}`.toLowerCase()
        if (!hay.includes(query)) return false
      }
      if (listPositionFilter && party.position !== listPositionFilter)
        return false
      if (listStatusFilter === 'active' && isPartyDissolved(party)) return false
      if (listStatusFilter === 'dissolved' && !isPartyDissolved(party)) return false
      return true
    })
    const mult = listSortDir === 'asc' ? 1 : -1
    rows.sort((partyA, partyB) => {
      if (listSortKey === 'name') {
        return partyA.name.localeCompare(partyB.name, 'ko') * mult
      }
      /* 부호 연·월·일 키 — 기원전 정당도 바르게, 날짜 없으면 맨 뒤 */
      const dateA = partialSortKey(partyFoundedOn(partyA))
      const dateB = partialSortKey(partyFoundedOn(partyB))
      if (dateA == null || dateB == null) return (dateA == null ? 1 : 0) - (dateB == null ? 1 : 0)
      return (dateA - dateB) * mult
    })
    return rows
  }, [parties, listSearch, listPositionFilter, listStatusFilter, listSortKey, listSortDir])

  /** 기본값에서 벗어난 필터/정렬 개수 — 토글 활성 표시·배지 카운트 공용 */
  const activeFilterCount = useMemo(() => {
    return (
      (listPositionFilter ? 1 : 0) +
      (listStatusFilter ? 1 : 0) +
      (listSortKey !== 'founded' || listSortDir !== 'desc' ? 1 : 0)
    )
  }, [listPositionFilter, listStatusFilter, listSortKey, listSortDir])

  const resetListFilters = useCallback(() => {
    setListSearch('')
    setListPositionFilter('')
    setListStatusFilter('')
    setListSortKey('founded')
    setListSortDir('desc')
  }, [])

  /**
   * 스펙트럼 점·연정 띠·범례가 같은 좌표·색을 쓰도록 한 번만 계산.
   * 필터는 아래 카드 그리드만 좁히고, 스펙트럼·연정 띠는 전체 parties를 유지한다.
   */
  const partyInfographicRows = useMemo(() => {
    return parties.map((p, i) => {
      const base = ideologySpectrumLeftPct(p.position as PoliticalPosition)
      const jitter = ((i * 11 + p.name.length) % 7) - 3
      const leftPct = Math.min(97, Math.max(3, base + jitter * 0.35))
      const displayName = p.shortName?.trim() || p.name
      const brandColor =
        normalizeBrandColorInput(p.brandColor ?? '') ??
        partyFallbackBrandColor(p.id)
      return { party: p, leftPct, displayName, brandColor }
    })
  }, [parties])

  /** 스펙트럼 말풍선: 좌표가 가까우면 위로 레인을 나눠 겹침 완화 */
  const spectrumBubbleLanes = useMemo(() => {
    const THRESHOLD_PCT = 8.5
    const sorted = [...partyInfographicRows].sort(
      (a, b) => a.leftPct - b.leftPct,
    )
    const laneByPartyId = new Map<string, number>()
    let prevLeft = -Infinity
    let prevLane = 0
    for (const row of sorted) {
      let lane = 0
      if (row.leftPct - prevLeft < THRESHOLD_PCT) {
        lane = Math.min(prevLane + 1, 4)
      }
      laneByPartyId.set(row.party.id, lane)
      prevLeft = row.leftPct
      prevLane = lane
    }
    let maxLane = 0
    for (const v of laneByPartyId.values()) {
      if (v > maxLane) maxLane = v
    }
    return { laneByPartyId, maxLane }
  }, [partyInfographicRows])

  const { data: detailParty, isLoading: detailLoading } = useQuery({
    queryKey: ['political-parties', 'detail', selectedPartyId],
    queryFn: () => politicalPartyApi.getById(selectedPartyId!),
    enabled: !!selectedPartyId,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: ['political-parties', scopeKey],
    })
    queryClient.invalidateQueries({ queryKey: ['political-parties'] })
    queryClient.invalidateQueries({ queryKey: ['elections'] })
  }

  /** 정당 요약 KPI 및 벤토 인포그래픽 집계 */
  const partyKpiSummary = useMemo(() => {
    const totalCount = parties.length
    const activeCount = parties.filter((party) => !isPartyDissolved(party)).length
    const dissolvedCount = totalCount - activeCount
    const posSet = new Set<string>()
    const posCounts = new Map<string, number>()
    let leftCount = 0
    let centerCount = 0
    let rightCount = 0
    let earliestYear: number | null = null
    let latestYear: number | null = null
    const nowYear = new Date().getUTCFullYear()

    for (const party of parties) {
      if (party.position) {
        posSet.add(party.position)
        posCounts.set(party.position, (posCounts.get(party.position) ?? 0) + 1)
        if (
          party.position === 'FAR_LEFT' ||
          party.position === 'LEFT' ||
          party.position === 'CENTER_LEFT'
        ) {
          leftCount += 1
        } else if (
          party.position === 'CENTER' ||
          party.position === 'BIG_TENT'
        ) {
          centerCount += 1
        } else if (
          party.position === 'CENTER_RIGHT' ||
          party.position === 'RIGHT' ||
          party.position === 'FAR_RIGHT'
        ) {
          rightCount += 1
        }
      }
      const foundedYear = partialSignedYear(partyFoundedOn(party))
      if (foundedYear != null) {
        if (earliestYear == null || foundedYear < earliestYear) earliestYear = foundedYear
        if (latestYear == null || foundedYear > latestYear) latestYear = foundedYear
      }
    }

    const minYear = earliestYear ?? nowYear - 30
    const spanYears = Math.max(1, nowYear - minYear)
    const lifespanRows = [...parties]
      .filter((party) => partialSignedYear(partyFoundedOn(party)) != null)
      .sort(
        (partyLeft, partyRight) =>
          (partialSignedYear(partyFoundedOn(partyLeft)) ?? 0) - (partialSignedYear(partyFoundedOn(partyRight)) ?? 0),
      )
      .slice(0, 5)
      .map((party) => {
        const fy = partialSignedYear(partyFoundedOn(party)) ?? nowYear
        const dy = partialSignedYear(partyDissolvedOn(party))
        const endVal = dy ?? nowYear
        const leftPct = Math.max(
          0,
          Math.min(94, ((fy - minYear) / spanYears) * 100),
        )
        const widthPct = Math.max(
          4,
          Math.min(100 - leftPct, ((Math.max(fy, endVal) - fy) / spanYears) * 100),
        )
        const color =
          normalizeBrandColorInput(party.brandColor ?? '') ??
          partyFallbackBrandColor(party.id)
        return {
          party,
          fy,
          dy,
          leftPct,
          widthPct,
          color,
        }
      })

    const statusSlices: SegmentSlice[] = [
      {
        key: 'active',
        label: '활동 중',
        value: activeCount,
        color: theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5',
      },
      {
        key: 'dissolved',
        label: '해산',
        value: dissolvedCount,
        color: theme.mode === 'dark' ? '#64748b' : '#94a3b8',
      },
    ]

    return {
      totalCount,
      activeCount,
      dissolvedCount,
      positionSetSize: posSet.size,
      posCounts,
      leftCount,
      centerCount,
      rightCount,
      earliestYear,
      latestYear,
      lifespanRows,
      statusSlices,
    }
  }, [parties, theme.mode])

  const createMut = useMutation({
    mutationFn: (payload: { body: CreatePoliticalPartyInput; keepOpen?: boolean }) =>
      politicalPartyApi.create(payload.body),
    onSuccess: (_row, variables) => {
      notify.success(
        variables.keepOpen
          ? `「${variables.body.name}」 등록 완료 — 이어서 다음 정당을 입력하세요.`
          : '정당을 등록했습니다.',
      )
      /* '등록 후 계속'이면 창은 그대로 — 모달이 폼을 비우고 명칭 칸으로 돌아간다 */
      if (!variables.keepOpen) setModal(null)
      invalidate()
    },
    onError: (e: Error) => notify.error(e.message),
  })

  const updateMut = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string
      body: CreatePoliticalPartyInput
    }) => politicalPartyApi.update(id, body),
    onSuccess: (_row, variables) => {
      notify.success('저장했습니다.')
      setModal(null)
      invalidate()
      queryClient.invalidateQueries({
        queryKey: ['political-parties', 'detail', variables.id],
      })
    },
    onError: (e: Error) => notify.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => politicalPartyApi.delete(id),
    onSuccess: () => {
      notify.success('삭제했습니다.')
      invalidate()
      navigate(`${pathKeys.countryElections(routeCountryId)}?subtab=parties`)
    },
    onError: (err: Error) => notify.error(err.message),
  })

  const saveDescriptionMut = useMutation({
    mutationFn: ({ id, html }: { id: string; html: string }) =>
      politicalPartyApi.update(id, {
        description: normalizeRichTextForSave(html),
      }),
    onSuccess: () => {
      notify.success('설명을 저장했습니다.')
      invalidate()
      if (selectedPartyId) {
        queryClient.invalidateQueries({
          queryKey: ['political-parties', 'detail', selectedPartyId],
        })
      }
      setEditingPartyDescription(false)
    },
    onError: (err: Error) => notify.error(err.message),
  })

  useEffect(() => {
    setEditingPartyDescription(false)
    setPartyDescriptionDraft('')
  }, [selectedPartyId, detailParty?.id])

  const goToList = () =>
    navigate(`${pathKeys.countryElections(routeCountryId)}?subtab=parties`)

  /** 인포박스의 정당 본체 입력 — 곁가지는 패널이 섹션과 같은 캐시로 읽는다 */
  const infoboxParty = useMemo(
    () => ({
      name: detailParty?.name ?? '',
      localName: detailParty?.localName ?? null,
      shortName: detailParty?.shortName ?? null,
      position: detailParty?.position ?? null,
      colorPalette: detailParty?.colorPalette ?? null,
      brandColor: detailParty?.brandColor ?? null,
      founded: detailParty ? partyFoundedOn(detailParty) : '',
      dissolved: detailParty ? partyDissolvedOn(detailParty) : '',
    }),
    [detailParty],
  )

  // 현대 국가는 연결된 역사 국가 소속 정당도 허용해야 하므로,
  // 이미 올바른 범위로 로드된 parties 목록에 포함 여부로 판단한다.
  const wrongCountryDetail =
    !!detailParty &&
    !isLoading &&
    !parties.some((p) => p.id === detailParty.id)

  return (
    <>
      <PartyBlockRoot>
        {selectedPartyId ? (
          detailLoading || !detailParty ? (
            <PartyDetailLayout>
              <PartyDetailTopBar>
                <PartyDetailTopLeft>
                  <PartyDetailBackLink type="button" onClick={goToList}>
                    <FiChevronLeft size={18} strokeWidth={2} aria-hidden />
                    목록
                  </PartyDetailBackLink>
                </PartyDetailTopLeft>
                <span />
              </PartyDetailTopBar>
              <PartyDetailHero>
                <PartyDetailHeroStack>
                  <ChartSkeleton variant="text" lines={2} />
                </PartyDetailHeroStack>
              </PartyDetailHero>
            </PartyDetailLayout>
          ) : wrongCountryDetail ? (
            <PartyDetailLayout>
              <PartyDetailTopBar>
                <PartyDetailTopLeft>
                  <PartyDetailBackLink type="button" onClick={goToList}>
                    <FiChevronLeft size={18} strokeWidth={2} aria-hidden />
                    목록
                  </PartyDetailBackLink>
                </PartyDetailTopLeft>
                <span />
              </PartyDetailTopBar>
              <PartyDetailHero>
                <PartyDetailHeroStack>
                  <EmptyHint style={{ margin: 0 }}>
                    이 정당은 현재 국가에 속하지 않습니다. 목록으로 돌아가세요.
                  </EmptyHint>
                </PartyDetailHeroStack>
              </PartyDetailHero>
            </PartyDetailLayout>
          ) : (
            <PartyDetailLayout>
              <PartyDetailTopBar>
                <PartyDetailTopLeft>
                  <PartyDetailBackLink type="button" onClick={goToList}>
                    <FiChevronLeft size={18} strokeWidth={2} aria-hidden />
                    목록
                  </PartyDetailBackLink>
                </PartyDetailTopLeft>
                <PartyDetailTopActions>
                  <DetailHeaderIconBtn
                    type="button"
                    title="전역 정당 편람에서 계보·관여 사건 보기"
                    aria-label="전역 정당 편람에서 보기"
                    onClick={() =>
                      navigate(pathKeys.politicalParties.detail(detailParty.id))
                    }
                  >
                    <FiArrowUpRight size={17} strokeWidth={2} />
                  </DetailHeaderIconBtn>
                  <DetailHeaderIconBtn
                    type="button"
                    title="정당 정보 수정"
                    aria-label="정당 정보 수정"
                    onClick={() =>
                      setModal({ mode: 'edit', id: detailParty.id })
                    }
                  >
                    <FiEdit2 size={17} strokeWidth={2} />
                  </DetailHeaderIconBtn>
                  <DetailHeaderIconBtn
                    type="button"
                    $variant="danger"
                    title="정당 삭제"
                    aria-label="정당 삭제"
                    onClick={async () => {
                      if (
                        await confirm({
                          title: '삭제 확인',
                          message: `"${detailParty.name}" 정당을 삭제할까요? (선거·소속 등에서 참조 중이면 실패할 수 있습니다.)`,
                          danger: true,
                        })
                      )
                        deleteMut.mutate(detailParty.id)
                    }}
                  >
                    <FiTrash2 size={17} strokeWidth={2} />
                  </DetailHeaderIconBtn>
                </PartyDetailTopActions>
              </PartyDetailTopBar>
              <PartyDetailHero
                $accent={
                  normalizeBrandColorInput(detailParty.brandColor ?? '') ??
                  partyFallbackBrandColor(detailParty.id)
                }
              >
                <PartyDetailHeroStack>
                  <PartyDetailLogoHero
                    $ring={
                      normalizeBrandColorInput(detailParty.brandColor ?? '') ??
                      partyFallbackBrandColor(detailParty.id)
                    }
                  >
                    {detailParty.logoUrl ? (
                      <PartyDetailLogoImg
                        src={getUploadImageUrl(detailParty.logoUrl)}
                        alt=""
                      />
                    ) : (
                      (detailParty.shortName || detailParty.name).slice(0, 3)
                    )}
                  </PartyDetailLogoHero>
                  <PartyDetailHeroBody>
                    <PartyDetailHeroTitle>
                      {detailParty.name}
                      <PartyStatusBadge
                        $dissolved={isPartyDissolved(detailParty)}
                        aria-label={
                          isPartyDissolved(detailParty)
                            ? `해산 · ${formatPartialDate(partyDissolvedOn(detailParty))}`
                            : '활동 중'
                        }
                      >
                        {isPartyDissolved(detailParty) ? '해산' : '활동 중'}
                      </PartyStatusBadge>
                    </PartyDetailHeroTitle>
                    <PartyDetailChipRowCenter>
                      {detailParty.shortName?.trim() ? (
                        <PartyDetailChip title="약칭">
                          <PartyDetailChipMuted>약칭</PartyDetailChipMuted>
                          {detailParty.shortName.trim()}
                        </PartyDetailChip>
                      ) : null}
                      {detailParty.localName?.trim() ? (
                        <PartyDetailChip title="현지어·별도 표기">
                          <PartyDetailChipMuted>현지어</PartyDetailChipMuted>
                          {detailParty.localName.trim()}
                        </PartyDetailChip>
                      ) : null}
                      {detailParty.position ? (
                        <PartyDetailChip title="정치 스펙트럼">
                          <PartyDetailChipMuted>스펙트럼</PartyDetailChipMuted>
                          {labelPoliticalPosition(detailParty.position)}
                        </PartyDetailChip>
                      ) : null}
                      {detailParty.kind && detailParty.kind !== 'PARTY' ? (
                        <PartyDetailChip title="종류">
                          <PartyDetailChipMuted>종류</PartyDetailChipMuted>
                          {labelPoliticalPartyKind(detailParty.kind)}
                        </PartyDetailChip>
                      ) : null}
                      {partyFoundedOn(detailParty) ? (
                        <PartyDetailChip title="존속 기간">
                          <PartyDetailChipMuted>존속</PartyDetailChipMuted>
                          {formatPartialDate(partyFoundedOn(detailParty))} ~{' '}
                          {isPartyDissolved(detailParty)
                            ? formatPartialDate(partyDissolvedOn(detailParty))
                            : '현재'}
                        </PartyDetailChip>
                      ) : null}
                    </PartyDetailChipRowCenter>
                  </PartyDetailHeroBody>
                </PartyDetailHeroStack>
              </PartyDetailHero>
              <PartyDetailBody>
                <PartyDetailColumns>
                <PartyDetailMain>
                  <PartyDetailDescSection aria-label="정당 설명">
                    <PartyDescSectionLabelRow>
                      <PartyDescSectionLabel>설명</PartyDescSectionLabel>
                      {!editingPartyDescription ? (
                        <PartyDescOutlineBtn
                          type="button"
                          onClick={() => {
                            setPartyDescriptionDraft(detailParty.description ?? '')
                            setEditingPartyDescription(true)
                          }}
                        >
                          <FiEdit2 size={14} />
                          {isRichTextVisuallyEmpty(detailParty.description)
                            ? '추가'
                            : '수정'}
                        </PartyDescOutlineBtn>
                      ) : null}
                    </PartyDescSectionLabelRow>
                    {editingPartyDescription ? (
                      <PartyDescBody>
                        <PartyDescriptionEditorWrap>
                          <RichTextEditor
                            value={partyDescriptionDraft}
                            onChange={setPartyDescriptionDraft}
                            showTitle={false}
                            placeholder="정당 소개·강령 요약 등을 입력하세요."
                            entityLinkCountryId={countryId ?? ''}
                            mentionEntities={{ politicalParties: parties }}
                            mentionEntitiesLoading={isLoading}
                            onImageUpload={async (file) => {
                              const result = await uploadImage(
                                file,
                                'political-parties',
                              )
                              return result.url
                            }}
                          />
                        </PartyDescriptionEditorWrap>
                        <PartyDescriptionEditActions>
                          <PartyDescOutlineBtn
                            type="button"
                            disabled={saveDescriptionMut.isPending}
                            onClick={() => {
                              setEditingPartyDescription(false)
                              setPartyDescriptionDraft('')
                            }}
                          >
                            취소
                          </PartyDescOutlineBtn>
                          <PartyDescPrimaryBtn
                            type="button"
                            disabled={saveDescriptionMut.isPending}
                            onClick={() =>
                              saveDescriptionMut.mutate({
                                id: detailParty.id,
                                html: partyDescriptionDraft,
                              })
                            }
                          >
                            {saveDescriptionMut.isPending ? '저장 중…' : '저장'}
                          </PartyDescPrimaryBtn>
                        </PartyDescriptionEditActions>
                      </PartyDescBody>
                    ) : isRichTextVisuallyEmpty(detailParty.description) ? (
                      <PartyDescBody>
                        <PartyDescEmptyHint>
                          설명이 없습니다.「추가」버튼으로 rich text 설명을 넣을 수
                          있습니다.
                        </PartyDescEmptyHint>
                      </PartyDescBody>
                    ) : (
                      <PartyDescBody>
                        <PartyDescProse>
                          <div onClick={handleProseClick} role="presentation">
                            {isLikelyRichTextHtml(detailParty.description) ? (
                              <PartyDescContent
                                html={detailParty.description ?? ''}
                                aria-label="정당 설명"
                              />
                            ) : (
                              <PartyDescPlainText>
                                {detailParty.description}
                              </PartyDescPlainText>
                            )}
                          </div>
                        </PartyDescProse>
                      </PartyDescBody>
                    )}
                  </PartyDetailDescSection>
                  <PartyChapter id="party-chapter-identity" aria-labelledby="party-chapter-identity-title">
                    <PartyChapterTitle id="party-chapter-identity-title">정체 — 이름·지위·이념</PartyChapterTitle>
                    <PartyNamesBlock partyId={detailParty.id} />
                    <PartyLegalStatusBlock
                      partyId={detailParty.id}
                      countryId={countryId}
                      historicalCountryId={historicalCountryId}
                    />
                    <PartyIdeologyBlock partyId={detailParty.id} />
                  </PartyChapter>
                  <PartyChapter id="party-chapter-organization" aria-labelledby="party-chapter-organization-title">
                    <PartyChapterTitle id="party-chapter-organization-title">조직·사람</PartyChapterTitle>
                    <PartyOrganizationsBlock partyId={detailParty.id} />
                    <PartyMembershipsBlock partyId={detailParty.id} />
                    <PartyHeadquartersBlock partyId={detailParty.id} countryId={countryId} />
                  </PartyChapter>
                  <PartyChapter id="party-chapter-marks" aria-labelledby="party-chapter-marks-title">
                    <PartyChapterTitle id="party-chapter-marks-title">표지·표현</PartyChapterTitle>
                    <PartySymbolsBlock partyId={detailParty.id} />
                    <PartyExpressionsBlock partyId={detailParty.id} />
                  </PartyChapter>
                  <PartyChapter id="party-chapter-evidence" aria-labelledby="party-chapter-evidence-title">
                    <PartyChapterTitle id="party-chapter-evidence-title">수치·관계·계보</PartyChapterTitle>
                    <PartyMetricsBlock
                        partyId={detailParty.id}
                        chamberScope={historicalCountryId ? { historicalCountryId } : { countryId }}
                      />
                    <PartyLinksBlock partyId={detailParty.id} partyName={detailParty.name} />
                    <PartyLineageBlock
                      partyId={detailParty.id}
                      partyName={detailParty.name}
                      parties={parties}
                      routeCountryId={routeCountryId}
                    />
                  </PartyChapter>
                  <PartyChapter id="party-chapter-activity" aria-labelledby="party-chapter-activity-title">
                    <PartyChapterTitle id="party-chapter-activity-title">활동 — 집권·선거·내각·법률</PartyChapterTitle>
                    <PartyTopLeadersBlock partyId={detailParty.id} />
                    <PartyElectionResultsBlock
                      partyId={detailParty.id}
                      routeCountryId={routeCountryId}
                      brandColor={normalizeBrandColorInput(
                        detailParty.brandColor ?? '',
                      )}
                    />
                    <PartyCabinetAffiliationsBlock
                      partyId={detailParty.id}
                      routeCountryId={routeCountryId}
                    />
                    <PartyLawsBlock
                      partyId={detailParty.id}
                      routeCountryId={routeCountryId}
                      countryId={countryId}
                      historicalCountryId={historicalCountryId}
                    />
                  </PartyChapter>
                </PartyDetailMain>
                <PartyDetailAside>
                  <PartyInfoboxPanel
                    partyId={detailParty.id}
                    routeCountryId={routeCountryId}
                    party={infoboxParty}
                  />
                  <PartyIdentitySourceRow>
                    <span>창당·해산·종류·스펙트럼 등 기본 정보의 출처</span>
                    <PartyCitationButton
                      partyId={detailParty.id}
                      targetType="POLITICAL_PARTY"
                      targetId={detailParty.id}
                      subject={`${detailParty.name} · 기본 정보`}
                    />
                  </PartyIdentitySourceRow>
                </PartyDetailAside>
                </PartyDetailColumns>
              </PartyDetailBody>
            </PartyDetailLayout>
          )
        ) : isLoading ? (
          <PartyListAreaBody>
            <ChartSkeleton variant="bars" rows={5} />
          </PartyListAreaBody>
        ) : parties.length === 0 ? (
          <PartyListAreaBody>
            <CountryTabEmptyState
              Icon={FiFlag}
              title="아직 등록된 정당이 없습니다"
              description="정당을 등록하면 선거·후보·집계와 배출한 국가원수·정부수반, 정당 계보를 이어 붙일 수 있습니다."
              actionLabel="정당 등록"
              onAction={() => setModal({ mode: 'create' })}
              features={[
                {
                  Icon: FiSliders,
                  title: '스펙트럼과 당색',
                  description: '극좌~극우·빅텐트 위치, 공식 당색·로고 — 스펙트럼 막대와 득표 차트 색이 된다',
                },
                {
                  Icon: FiCalendar,
                  title: '이념과 존속 기간',
                  description: '자유주의·사회민주주의 같은 노선 키워드, 설립·해산일',
                },
                {
                  Icon: FiGitMerge,
                  title: '정당 계보',
                  description: '창당·합당·분당·개명의 전신·후신을 기준일과 함께 연결',
                },
                {
                  Icon: FiAward,
                  title: '선거 성적과 배출 수반',
                  description: '역대 득표·의석, 소속 후보·당원, 국가원수·정부수반 배출 이력',
                },
              ]}
            />
          </PartyListAreaBody>
        ) : (
          <PartyInfographicSection>
            {/* 2열 Event-Ledger 벤토 인포그래픽: 좌우 스펙트럼 포지셔닝 맵 + 존속 현황·연대기 */}
            <BentoGrid2Col aria-label="정당 현황 요약 인포그래픽">
              <BentoCard>
                <BentoCardHeader>
                  <BentoCardTitleGroup>
                    <BentoCardTitle>이념 스펙트럼 포지셔닝 맵</BentoCardTitle>
                    <BentoCardBadge>
                      {partyKpiSummary.positionSetSize > 0
                        ? `${partyKpiSummary.positionSetSize}개 성향`
                        : '미분류'}
                    </BentoCardBadge>
                  </BentoCardTitleGroup>
                  {listPositionFilter ? (
                    <BentoActionBtn
                      type="button"
                      onClick={() => setListPositionFilter('')}
                    >
                      전체 스펙트럼
                    </BentoActionBtn>
                  ) : null}
                </BentoCardHeader>
                <BentoCardBody>
                  <PartyIdeologySpectrumWrap>
                    <span
                      id="party-spectrum-axis-help"
                      style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: 1,
                        height: 1,
                        padding: 0,
                        margin: -1,
                        overflow: 'hidden',
                        clip: 'rect(0, 0, 0, 0)',
                        whiteSpace: 'nowrap',
                        border: 0,
                      }}
                    >
                      가로축은 좌에서 우로 갈수록 정치적 성향이 우측으로 이동하는
                      배치입니다.
                    </span>
                    <PartyIdeologySpectrumStage
                      role="group"
                      aria-label="이념·성향 축 (좌 → 우)"
                      aria-describedby="party-spectrum-axis-help"
                      $maxLane={spectrumBubbleLanes.maxLane}
                    >
                      {partyInfographicRows.map(
                        (
                          { party: p, leftPct, displayName, brandColor },
                          stack,
                        ) => {
                          const tooltipParts: string[] = [p.name]
                          if (p.position)
                            tooltipParts.push(
                              labelPoliticalPosition(p.position),
                            )
                          if (partyFoundedOn(p))
                            tooltipParts.push(
                              `창당 ${formatPartialDate(partyFoundedOn(p))}`,
                            )
                          if (isPartyDissolved(p))
                            tooltipParts.push(
                              `해산 ${formatPartialDate(partyDissolvedOn(p))}`,
                            )
                          const tooltip = tooltipParts.join(' · ')
                          const goToDetail = () =>
                            navigate(
                              pathKeys.countryElectionPartyDetail(
                                routeCountryId,
                                p.id,
                              ),
                            )
                          return (
                            <PartyIdeologySpectrumBubbleAnchor
                              key={p.id}
                              $leftPct={leftPct}
                              $stack={stack}
                              $lane={
                                spectrumBubbleLanes.laneByPartyId.get(p.id) ?? 0
                              }
                              role="button"
                              tabIndex={0}
                              aria-label={`${tooltip} — 상세 보기`}
                              onClick={goToDetail}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  goToDetail()
                                }
                              }}
                            >
                              <PartyIdeologySpectrumBubble
                                $brand={brandColor}
                                title={tooltip}
                              >
                                {displayName}
                              </PartyIdeologySpectrumBubble>
                              <PartyIdeologySpectrumPin
                                $fill={brandColor}
                                aria-hidden
                              />
                            </PartyIdeologySpectrumBubbleAnchor>
                          )
                        },
                      )}
                      <PartyIdeologySpectrumTrackBar aria-hidden />
                    </PartyIdeologySpectrumStage>
                    <PartyIdeologySpectrumEnds>
                      <span>← 좌파권 ({partyKpiSummary.leftCount})</span>
                      <span>중도·포괄 ({partyKpiSummary.centerCount})</span>
                      <span>우파권 ({partyKpiSummary.rightCount}) →</span>
                    </PartyIdeologySpectrumEnds>
                  </PartyIdeologySpectrumWrap>

                  {partyKpiSummary.positionSetSize > 0 ? (
                    <PartySpectrumChipRow>
                      <PartySpectrumFilterChip
                        type="button"
                        $active={!listPositionFilter}
                        onClick={() => setListPositionFilter('')}
                      >
                        전체 <span>{parties.length}</span>
                      </PartySpectrumFilterChip>
                      {POSITION_OPTIONS.map((opt) => {
                        const cnt = partyKpiSummary.posCounts.get(opt.value) ?? 0
                        if (cnt === 0 && listPositionFilter !== opt.value)
                          return null
                        return (
                          <PartySpectrumFilterChip
                            key={opt.value}
                            type="button"
                            $active={listPositionFilter === opt.value}
                            onClick={() =>
                              setListPositionFilter((prev) =>
                                prev === opt.value ? '' : opt.value,
                              )
                            }
                          >
                            {opt.label} <span>{cnt}</span>
                          </PartySpectrumFilterChip>
                        )
                      })}
                    </PartySpectrumChipRow>
                  ) : null}
                </BentoCardBody>
              </BentoCard>

              <BentoCard>
                <BentoCardHeader>
                  <BentoCardTitleGroup>
                    <BentoCardTitle>존속 현황 · 정당 연대기</BentoCardTitle>
                    <BentoCardBadge>
                      전체 {partyKpiSummary.totalCount}곳
                    </BentoCardBadge>
                  </BentoCardTitleGroup>
                  {listStatusFilter ? (
                    <BentoActionBtn
                      type="button"
                      onClick={() => setListStatusFilter('')}
                    >
                      전체 상태
                    </BentoActionBtn>
                  ) : partyKpiSummary.earliestYear != null ? (
                    <BentoCardBadge>
                      {partyKpiSummary.earliestYear}–
                      {partyKpiSummary.latestYear ??
                        partyKpiSummary.earliestYear}
                      년 창당
                    </BentoCardBadge>
                  ) : null}
                </BentoCardHeader>
                <BentoCardBody>
                  <PartyBentoDonutRow>
                    <MiniDonutRing
                      slices={partyKpiSummary.statusSlices}
                      size={62}
                      strokeWidth={8}
                      centerValue={`${Math.round(
                        (partyKpiSummary.activeCount /
                          Math.max(1, partyKpiSummary.totalCount)) *
                          100,
                      )}%`}
                      centerLabel="활동"
                    />
                    <PartyBentoStatusCol>
                      <PartyBentoStatusBtn
                        type="button"
                        $active={listStatusFilter === 'active'}
                        onClick={() =>
                          setListStatusFilter((prev) =>
                            prev === 'active' ? '' : 'active',
                          )
                        }
                      >
                        <span
                          className="dot"
                          style={{
                            background:
                              theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5',
                          }}
                        />
                        <span className="lbl">활동 중 정당</span>
                        <strong>{partyKpiSummary.activeCount}곳</strong>
                      </PartyBentoStatusBtn>
                      <PartyBentoStatusBtn
                        type="button"
                        $active={listStatusFilter === 'dissolved'}
                        onClick={() =>
                          setListStatusFilter((prev) =>
                            prev === 'dissolved' ? '' : 'dissolved',
                          )
                        }
                      >
                        <span
                          className="dot"
                          style={{
                            background:
                              theme.mode === 'dark' ? '#64748b' : '#94a3b8',
                          }}
                        />
                        <span className="lbl">해산 · 역사 정당</span>
                        <strong>{partyKpiSummary.dissolvedCount}곳</strong>
                      </PartyBentoStatusBtn>
                    </PartyBentoStatusCol>
                  </PartyBentoDonutRow>

                  {partyKpiSummary.lifespanRows.length > 0 ? (
                    <PartyLifespanMiniList aria-label="주요 정당 존속 연대기">
                      {partyKpiSummary.lifespanRows.map((row) => (
                        <PartyLifespanMiniRow
                          key={row.party.id}
                          type="button"
                          onClick={() =>
                            navigate(
                              pathKeys.countryElectionPartyDetail(
                                routeCountryId,
                                row.party.id,
                              ),
                            )
                          }
                        >
                          <span className="name">
                            {row.party.shortName?.trim() || row.party.name}
                          </span>
                          <PartyLifespanMiniTrack>
                            <PartyLifespanMiniFill
                              $left={row.leftPct}
                              $width={row.widthPct}
                              $color={row.color}
                              $dissolved={row.dy != null}
                            />
                          </PartyLifespanMiniTrack>
                          <span className="yrs">
                            {row.fy}–{row.dy ?? '현재'}
                          </span>
                        </PartyLifespanMiniRow>
                      ))}
                    </PartyLifespanMiniList>
                  ) : (
                    <EmptyHint style={{ fontSize: 12 }}>
                      설립일이 입력된 정당이 등록되면 존속 기간 연대기 막대가 표시됩니다.
                    </EmptyHint>
                  )}
                </BentoCardBody>
              </BentoCard>
            </BentoGrid2Col>

            {/* 단일 행 Event-Ledger 필터·정렬 바 */}
            <PartyFilterBar>
              <PartySearchBox>
                <FiSearch size={14} aria-hidden />
                <input
                  type="search"
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  placeholder="정당 이름·약칭·현지어 검색…"
                  aria-label="정당 이름 검색"
                />
                {listSearch ? (
                  <PartySearchClearBtn
                    type="button"
                    onClick={() => setListSearch('')}
                    aria-label="검색어 지우기"
                  >
                    <FiX size={13} />
                  </PartySearchClearBtn>
                ) : null}
              </PartySearchBox>

              <PartyFilterSelect
                value={listPositionFilter}
                onChange={(e) => setListPositionFilter(e.target.value)}
                aria-label="스펙트럼 필터"
              >
                <option value="">전체 스펙트럼</option>
                {POSITION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </PartyFilterSelect>

              <PartyStatusSegmentGroup role="group" aria-label="활동 상태 필터">
                {(
                  [
                    ['', '전체'],
                    ['active', '활동 중'],
                    ['dissolved', '해산'],
                  ] as const
                ).map(([val, lbl]) => (
                  <PartyStatusSegBtn
                    key={lbl}
                    type="button"
                    $active={listStatusFilter === val}
                    onClick={() => setListStatusFilter(val)}
                  >
                    {lbl}
                  </PartyStatusSegBtn>
                ))}
              </PartyStatusSegmentGroup>

              <PartyFilterSelect
                value={`${listSortKey}:${listSortDir}`}
                onChange={(e) => {
                  const [key, dir] = e.target.value.split(':') as [
                    'founded' | 'name',
                    'asc' | 'desc',
                  ]
                  setListSortKey(key)
                  setListSortDir(dir)
                }}
                aria-label="정렬"
              >
                <option value="founded:desc">최근 설립 순</option>
                <option value="founded:asc">오래된 설립 순</option>
                <option value="name:asc">이름 오름차순</option>
                <option value="name:desc">이름 내림차순</option>
              </PartyFilterSelect>

              <PartyFilterMeta>
                표시 {filteredParties.length} / {parties.length}곳
                {listSearch || activeFilterCount > 0 ? (
                  <>
                    {' · '}
                    <PartyFilterResetBtn type="button" onClick={resetListFilters}>
                      초기화
                    </PartyFilterResetBtn>
                  </>
                ) : null}
              </PartyFilterMeta>
            </PartyFilterBar>

            {filteredParties.length === 0 ? (
              <EmptyHint style={{ padding: '20px 0' }}>
                조건에 맞는 정당이 없습니다.{' '}
                <PartyFilterResetBtn type="button" onClick={resetListFilters}>
                  필터 초기화
                </PartyFilterResetBtn>
              </EmptyHint>
            ) : (
              <PartyInfographicGrid>
                {filteredParties.map((p) => {
                  const accent =
                    normalizeBrandColorInput(p.brandColor ?? '') ??
                    partyFallbackBrandColor(p.id)
                  const dissolved = isPartyDissolved(p)
                  const ideologyTags = parseIdeologyKeywords(p.ideology).slice(
                    0,
                    3,
                  )
                  return (
                    <PartyInfographicCard
                      key={p.id}
                      type="button"
                      onClick={() =>
                        navigate(
                          pathKeys.countryElectionPartyDetail(
                            routeCountryId,
                            p.id,
                          ),
                        )
                      }
                      aria-label={`${p.name} 정당 상세`}
                    >
                      <PartyInfographicCardHero $tint={accent}>
                        <PartyInfographicLogo $ring={accent}>
                          {p.logoUrl ? (
                            <PartyInfographicLogoImg
                              src={getUploadImageUrl(p.logoUrl)}
                              alt=""
                            />
                          ) : (
                            (p.shortName || p.name).slice(0, 3)
                          )}
                        </PartyInfographicLogo>
                      </PartyInfographicCardHero>
                      <PartyInfographicCardBody>
                        <PartyInfographicShortRow>
                          <PartyInfographicPartyName>
                            {p.name}
                          </PartyInfographicPartyName>
                          {p.shortName?.trim() ? (
                            <PartyInfographicShortBadge>
                              {p.shortName.trim()}
                            </PartyInfographicShortBadge>
                          ) : null}
                          <PartyInfographicStatusPill $dissolved={dissolved}>
                            {dissolved ? '해산' : '활동 중'}
                          </PartyInfographicStatusPill>
                        </PartyInfographicShortRow>
                        <PartyInfographicMetaRow>
                          {p.position ? (
                            <PartyInfographicPositionChip>
                              {labelPoliticalPosition(p.position)}
                            </PartyInfographicPositionChip>
                          ) : null}
                          {ideologyTags.map((tag, idx) => (
                            <PartyCardIdeologyChip key={`${tag}-${idx}`}>
                              {tag}
                            </PartyCardIdeologyChip>
                          ))}
                          <span>
                            {partyFoundedOn(p)
                              ? `창당 ${formatPartialDate(partyFoundedOn(p))}`
                              : '창당 미상'}
                            {dissolved
                              ? ` · 해산 ${formatPartialDate(partyDissolvedOn(p))}`
                              : ''}
                          </span>
                        </PartyInfographicMetaRow>
                      </PartyInfographicCardBody>
                      <PartyInfographicFootHint>
                        상세
                        <FiChevronRight size={14} strokeWidth={2} aria-hidden />
                      </PartyInfographicFootHint>
                    </PartyInfographicCard>
                  )
                })}
              </PartyInfographicGrid>
            )}
          </PartyInfographicSection>
        )}
      </PartyBlockRoot>
      {modal ? (
        <PartyFormModal
          key={modal.mode === 'edit' ? `party-${modal.id}` : 'party-new'}
          countryId={countryId}
          historicalCountryId={historicalCountryId}
          mode={modal.mode}
          partyId={modal.mode === 'edit' ? modal.id : undefined}
          saving={createMut.isPending || updateMut.isPending}
          onClose={() => setModal(null)}
          onSubmitCreate={(body, options) =>
            options?.keepOpen
              ? createMut.mutateAsync({ body, keepOpen: true })
              : createMut.mutate({ body })
          }
          onSubmitEdit={(id, body) => updateMut.mutate({ id, body })}
        />
      ) : null}
    </>
  )
}

/** 정당 등록 모달의 세 묶음 — 사건 등록 모달처럼 점+선 머리로 구획 */
const PARTY_FORM_SECTION_ID = {
  basic: 'party-form-group-basic',
  line: 'party-form-group-line',
  mark: 'party-form-group-mark',
} as const

interface PartyFormValues {
  name: string
  shortName: string
  localName: string
  ideologies: IdeologyChip[]
  position: PoliticalPosition | ''
  kind: PoliticalPartyKind
  founded: PeriodDateFormValue
  dissolved: PeriodDateFormValue
  logoUrl: string
  brandColor: string
  colorPalette: string[]
}

const EMPTY_PARTY_FORM: PartyFormValues = {
  name: '',
  shortName: '',
  localName: '',
  ideologies: [],
  position: '',
  kind: 'PARTY',
  founded: { ...EMPTY_PERIOD_DATE },
  dissolved: { ...EMPTY_PERIOD_DATE },
  logoUrl: '',
  brandColor: '',
  colorPalette: [],
}

/** 응답 정당 행 → 창당·해산 칸 값(구조화 칸이 진실, 없으면 거울 DATETIME에서) */
function partyFoundedFormValue(row: PoliticalParty): PeriodDateFormValue {
  if (row.foundedYear != null) {
    return periodDateFormValue(row.foundedEra, row.foundedYear, row.foundedMonth, row.foundedDay)
  }
  const mirror = row.foundedDate?.slice(0, 10)
  if (!mirror) return { ...EMPTY_PERIOD_DATE }
  const [year, month, day] = mirror.split('-').map(Number)
  return { era: 'AD', year, month, day }
}

function partyDissolvedFormValue(row: PoliticalParty): PeriodDateFormValue {
  if (row.dissolvedYear != null) {
    return periodDateFormValue(row.dissolvedEra, row.dissolvedYear, row.dissolvedMonth, row.dissolvedDay)
  }
  const mirror = row.dissolvedDate?.slice(0, 10)
  if (!mirror) return { ...EMPTY_PERIOD_DATE }
  const [year, month, day] = mirror.split('-').map(Number)
  return { era: 'AD', year, month, day }
}

/** 이탈 확인용 비교값 — 같은 순서로 직렬화한다 */
const partyFormSnapshot = (values: PartyFormValues) =>
  JSON.stringify([
    values.name,
    values.shortName,
    values.localName,
    values.ideologies.map((chip) => chip.id),
    values.position,
    values.kind,
    partialOfFormValue(values.founded),
    partialOfFormValue(values.dissolved),
    values.logoUrl,
    values.brandColor,
    values.colorPalette,
  ])

export function PartyFormModal({
  countryId,
  historicalCountryId,
  mode,
  partyId,
  saving,
  onClose,
  onSubmitCreate,
  onSubmitEdit,
}: {
  countryId?: string
  historicalCountryId?: string
  mode: 'create' | 'edit'
  partyId?: string
  saving: boolean
  onClose: () => void
  /**
   * `keepOpen`('등록 후 계속')이면 Promise를 돌려 준다 — 성공하면 모달이 폼을 비우고 이어서 받고,
   * 실패하면(거부) 입력을 그대로 둔다. 그 외에는 부모가 닫는다.
   */
  onSubmitCreate: (
    body: CreatePoliticalPartyInput,
    options?: { keepOpen?: boolean },
  ) => void | Promise<unknown>
  onSubmitEdit: (id: string, body: CreatePoliticalPartyInput) => void
}) {
  const playClickSound = useClickSound()
  const [loaded, setLoaded] = useState<PoliticalParty | null>(null)
  const [name, setName] = useState('')
  const [shortName, setShortName] = useState('')
  const [localName, setLocalName] = useState('')
  /** 이념 — 카탈로그에서 고른 칩(첫 칩 = 대표) */
  const [ideologies, setIdeologies] = useState<IdeologyChip[]>([])
  const [position, setPosition] = useState<PoliticalPosition | ''>('')
  const [kind, setKind] = useState<PoliticalPartyKind>('PARTY')
  const [founded, setFounded] = useState<PeriodDateFormValue>({ ...EMPTY_PERIOD_DATE })
  const [dissolved, setDissolved] = useState<PeriodDateFormValue>({ ...EMPTY_PERIOD_DATE })
  const [logoUrl, setLogoUrl] = useState('')
  const [brandColor, setBrandColor] = useState('')
  /** 상징색 여러 개 — 차트용 하나(brandColor)와 별개 */
  const [colorPalette, setColorPalette] = useState<string[]>([])
  const [paletteDraft, setPaletteDraft] = useState('#000000')
  const [logoUploading, setLogoUploading] = useState(false)
  const logoFileInputRef = useRef<HTMLInputElement>(null)
  const nameInputRef = useRef<HTMLInputElement | null>(null)
  const formScrollRef = useRef<HTMLDivElement | null>(null)
  const { layoutMode, toggleLayoutMode } = useSplitLayoutMode(
    'papyrus:party-register-layout',
  )
  /** 날짜 칸 오류 — 칸 값에서 바로 판정(연도 없이 월·일, 없는 날짜) */
  const foundedError = periodDateFormError(founded)
  const dissolvedError = periodDateFormError(dissolved)
  const firstDateError = foundedError
    ? `창당: ${foundedError}`
    : dissolvedError
      ? `해산: ${dissolvedError}`
      : null
  const [initialSnapshot, setInitialSnapshot] = useState(() =>
    partyFormSnapshot(EMPTY_PARTY_FORM),
  )
  /** '등록 후 계속'으로 이 창에서 등록한 정당 이름 — 위 띠에 쌓아 보여 준다 */
  const [registeredInSession, setRegisteredInSession] = useState<string[]>([])
  /** 폼을 비울 때 날짜 칸 등 내부 상태를 가진 칸을 새로 그리려는 세대 번호 */
  const [formGeneration, setFormGeneration] = useState(0)
  const [continuing, setContinuing] = useState(false)

  const handleLogoFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      validateImageFile(file)
      setLogoUploading(true)
      const result = await uploadImage(file, 'political-parties')
      setLogoUrl(result.url)
      notify.success('이미지를 올렸습니다.')
    } catch (unknownError) {
      const message =
        unknownError instanceof Error ? unknownError.message : '업로드 실패'
      notify.error(message)
    } finally {
      setLogoUploading(false)
    }
  }

  React.useEffect(() => {
    if (mode !== 'edit' || !partyId) return
    let cancelled = false
    Promise.all([politicalPartyApi.getById(partyId), politicalPartyApi.getIdeologies(partyId)])
      .then(([row, ideologyLinks]) => {
        if (cancelled) return
        const values: PartyFormValues = {
          name: row.name,
          shortName: row.shortName ?? '',
          localName: row.localName ?? '',
          ideologies: ideologyLinks.map((link) => ({
            id: link.ideology.id,
            name: link.ideology.name,
            category: link.ideology.category,
          })),
          position: (row.position as PoliticalPosition) ?? '',
          kind: (row.kind as PoliticalPartyKind | undefined) ?? 'PARTY',
          founded: partyFoundedFormValue(row),
          dissolved: partyDissolvedFormValue(row),
          logoUrl: row.logoUrl ?? '',
          brandColor: row.brandColor ?? '',
          colorPalette: Array.isArray(row.colorPalette) ? row.colorPalette : [],
        }
        setLoaded(row)
        setName(values.name)
        setShortName(values.shortName)
        setLocalName(values.localName)
        setIdeologies(values.ideologies)
        setPosition(values.position)
        setKind(values.kind)
        setFounded(values.founded)
        setDissolved(values.dissolved)
        setLogoUrl(values.logoUrl)
        setBrandColor(values.brandColor)
        setColorPalette(values.colorPalette)
        setInitialSnapshot(partyFormSnapshot(values))
      })
      .catch((err: Error) => notify.error(err.message))
    return () => {
      cancelled = true
    }
  }, [mode, partyId])

  const loadingEdit = Boolean(mode === 'edit' && !loaded && partyId)
  const brandColorInvalid =
    brandColor.trim() !== '' && normalizeBrandColorInput(brandColor) == null
  const dateOrderInvalid = isPeriodFormInverted(founded, dissolved)
  const missingRequired = name.trim() ? [] : ['명칭']
  const formProblem = firstDateError
    ? firstDateError
    : brandColorInvalid
    ? '브랜드 컬러는 #RRGGBB 형식(예: #e11d48)이거나 비워 두세요.'
    : dateOrderInvalid
      ? '해산일이 설립일보다 앞설 수 없습니다.'
      : null
  const canSubmit =
    !saving &&
    !continuing &&
    !logoUploading &&
    !loadingEdit &&
    missingRequired.length === 0 &&
    !formProblem

  const isDirty =
    partyFormSnapshot({
      name,
      shortName,
      localName,
      ideologies,
      position,
      kind,
      founded,
      dissolved,
      logoUrl,
      brandColor,
      colorPalette,
    }) !== initialSnapshot

  const requestClose = async () => {
    if (saving) return
    if (
      isDirty &&
      !(await confirm({
        title: '확인',
        message:
          mode === 'create'
            ? '작성 중인 정당 정보가 사라집니다. 창을 닫으시겠습니까?'
            : '저장하지 않은 변경 사항이 있습니다. 닫으시겠습니까?',
      }))
    ) {
      return
    }
    onClose()
  }

  const resetForCreateNext = () => {
    setName('')
    setShortName('')
    setLocalName('')
    setIdeologies([])
    setPosition('')
    setKind('PARTY')
    setFounded({ ...EMPTY_PERIOD_DATE })
    setDissolved({ ...EMPTY_PERIOD_DATE })
    setLogoUrl('')
    setBrandColor('')
    setColorPalette([])
    setInitialSnapshot(partyFormSnapshot(EMPTY_PARTY_FORM))
    setFormGeneration((generation) => generation + 1)
    formScrollRef.current?.scrollTo({ top: 0 })
    window.requestAnimationFrame(() => nameInputRef.current?.focus())
  }

  const buildBody = (): CreatePoliticalPartyInput => {
    const parsedColor = normalizeBrandColorInput(brandColor)
    const scope =
      historicalCountryId != null && historicalCountryId !== ''
        ? { countryId: null as string | null, historicalCountryId }
        : {
            countryId: countryId ?? null,
            historicalCountryId: null as string | null,
          }
    const body: CreatePoliticalPartyInput = {
      name: name.trim(),
      shortName: shortName.trim() || null,
      localName: localName.trim() || null,
      ideologyIds: ideologies.map((chip) => chip.id),
      position: position === '' ? null : position,
      kind,
      founded: structuredInputOf(founded),
      dissolved: structuredInputOf(dissolved),
      logoUrl: logoUrl.trim() || null,
      brandColor: parsedColor,
      colorPalette: colorPalette.length > 0 ? colorPalette : null,
      ...scope,
    }
    return body
  }

  const submit = () => {
    if (!canSubmit) return
    const body = buildBody()
    if (mode === 'create') onSubmitCreate(body)
    else if (partyId) onSubmitEdit(partyId, body)
  }

  /** 등록하고 창은 그대로 — 성공하면 폼을 비우고 다음 정당을 받는다 */
  const submitAndContinue = async () => {
    if (!canSubmit || mode !== 'create') return
    const body = buildBody()
    setContinuing(true)
    try {
      await onSubmitCreate(body, { keepOpen: true })
      setRegisteredInSession((prev) => [...prev, body.shortName || body.name])
      resetForCreateNext()
    } catch {
      /* 오류 알림은 부모가 띄운다 — 입력은 그대로 둔다 */
    } finally {
      setContinuing(false)
    }
  }

  useModalSubmitShortcut({
    enabled: canSubmit,
    scrollContainerRef: formScrollRef,
    onSubmit: submit,
  })

  const previewColor = normalizeBrandColorInput(brandColor)
  const positionLabel = POSITION_TONE_OPTIONS.find(
    (option) => option.value === position,
  )?.label

  const basicSectionNode = (
    <FormS.FormGroupSection
      id={PARTY_FORM_SECTION_ID.basic}
      aria-labelledby={`${PARTY_FORM_SECTION_ID.basic}-title`}
    >
      <FormS.FormGroupTitle id={`${PARTY_FORM_SECTION_ID.basic}-title`}>
        기본 정보
      </FormS.FormGroupTitle>
      <EventFormS.FormRow>
        <EventFormS.FormLabel htmlFor="party-form-name">
          명칭 <EventFormS.Required>*</EventFormS.Required>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          <FormS.TitleInput
            ref={nameInputRef}
            id="party-form-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="off"
            aria-required
            placeholder="예: 독일 사회민주당"
          />
          <FormS.SubTitleGrid>
            <FormS.SubTitleField>
              <FormS.SubTitleLabel>약칭 (선택)</FormS.SubTitleLabel>
              <FormS.AbbrInput
                id="party-form-short-name"
                aria-label="약칭"
                value={shortName}
                onChange={(event) => setShortName(event.target.value)}
                placeholder="예: SPD"
                autoComplete="off"
              />
            </FormS.SubTitleField>
            <FormS.SubTitleField>
              <FormS.SubTitleLabel>현지어·별도 표기 (선택)</FormS.SubTitleLabel>
              <FormS.AbbrInput
                id="party-form-local-name"
                aria-label="현지어·별도 표기"
                value={localName}
                onChange={(event) => setLocalName(event.target.value)}
                placeholder="예: Sozialdemokratische Partei Deutschlands"
                autoComplete="off"
              />
            </FormS.SubTitleField>
          </FormS.SubTitleGrid>
        </EventFormS.FormField>
      </EventFormS.FormRow>
      <EventFormS.FormRow>
        <EventFormS.FormLabel as="div" id="party-form-kind-label">
          종류
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          <ToneChipGroup
            ariaLabelledBy="party-form-kind-label"
            value={kind}
            onChange={(next) => {
              if (next) setKind(next)
            }}
            options={PARTY_KIND_TONE_OPTIONS}
          />
          <EventFormS.Hint>
            {POLITICAL_PARTY_KIND_OPTIONS.find((option) => option.value === kind)?.hint ?? ''}
          </EventFormS.Hint>
        </EventFormS.FormField>
      </EventFormS.FormRow>
      <EventFormS.FormRow>
        <EventFormS.FormLabel as="div">
          존속 기간<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          <FormS.DateRangeGrid>
            <FormS.DateColumn>
              <FormS.SubTitleLabel>창당·결성</FormS.SubTitleLabel>
              <PeriodDateField
                {...founded}
                ariaLabel="창당일"
                pickerTitle="창당일 선택"
                error={Boolean(foundedError)}
                onChange={setFounded}
              />
              {foundedError ? <EventFormS.ErrorMessage role="alert">{foundedError}</EventFormS.ErrorMessage> : null}
            </FormS.DateColumn>
            <FormS.DateColumn>
              <FormS.SubTitleLabel>해산 (존속 중이면 비움)</FormS.SubTitleLabel>
              <PeriodDateField
                {...dissolved}
                ariaLabel="해산일"
                pickerTitle="해산일 선택"
                error={Boolean(dissolvedError) || dateOrderInvalid}
                onChange={setDissolved}
              />
              {dissolvedError ? <EventFormS.ErrorMessage role="alert">{dissolvedError}</EventFormS.ErrorMessage> : null}
            </FormS.DateColumn>
          </FormS.DateRangeGrid>
          <EventFormS.Hint>연도만 알면 연도만 — 월·일은 비워 둡니다. 기원전은 칸 끝의 서기를 눌러 바꿉니다.</EventFormS.Hint>
          {dateOrderInvalid ? (
            <EventFormS.ErrorMessage role="alert">
              해산({formatPartialDate(partialOfFormValue(dissolved))})이 창당(
              {formatPartialDate(partialOfFormValue(founded))})보다 앞설 수 없습니다.
            </EventFormS.ErrorMessage>
          ) : null}
        </EventFormS.FormField>
      </EventFormS.FormRow>
    </FormS.FormGroupSection>
  )

  const lineSectionNode = (
    <FormS.FormGroupSection
      id={PARTY_FORM_SECTION_ID.line}
      aria-labelledby={`${PARTY_FORM_SECTION_ID.line}-title`}
    >
      <FormS.FormGroupTitle id={`${PARTY_FORM_SECTION_ID.line}-title`}>
        노선
        {positionLabel ? (
          <FormS.FormGroupSummaryBadge>{positionLabel}</FormS.FormGroupSummaryBadge>
        ) : null}
      </FormS.FormGroupTitle>
      <EventFormS.FormRow>
        <EventFormS.FormLabel as="div" id="party-form-position-label">
          스펙트럼<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          <ToneChipGroup
            ariaLabelledBy="party-form-position-label"
            value={position}
            onChange={(next) => setPosition(next)}
            options={POSITION_TONE_OPTIONS}
            allowDeselect
          />
          <EventFormS.Hint>
            하나만 고릅니다. 고른 칩을 다시 누르면 해제됩니다.
          </EventFormS.Hint>
        </EventFormS.FormField>
      </EventFormS.FormRow>
      <EventFormS.FormRow>
        <EventFormS.FormLabel htmlFor="party-ideology-input">
          이념·노선<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          <IdeologyPicker inputId="party-ideology-input" value={ideologies} onChange={setIdeologies} />
          <EventFormS.Hint>
            이념 목록에서 고릅니다 — 첫 칩이 대표. 없으면 친 이름으로 새로 만듭니다. 시기·메모는 정당 상세에서.
          </EventFormS.Hint>
        </EventFormS.FormField>
      </EventFormS.FormRow>
    </FormS.FormGroupSection>
  )

  const markSectionNode = (
    <FormS.FormGroupSection
      id={PARTY_FORM_SECTION_ID.mark}
      aria-labelledby={`${PARTY_FORM_SECTION_ID.mark}-title`}
    >
      <FormS.FormGroupTitle id={`${PARTY_FORM_SECTION_ID.mark}-title`}>
        표지
      </FormS.FormGroupTitle>
      <EventFormS.FormRow>
        <EventFormS.FormLabel as="div">
          로고·심벌<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          <input
            ref={logoFileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleLogoFileChange}
          />
          {logoUrl ? (
            <KitUploadFilled>
              <KitUploadThumb>
                <img src={getUploadImageUrl(logoUrl)} alt="" />
              </KitUploadThumb>
              <KitUploadText>
                <strong>로고가 올라갔습니다</strong>
                <span>정당 목록·득표 표에 이 그림이 붙습니다</span>
              </KitUploadText>
              <KitUploadActions>
                <EventFormS.AddButton
                  type="button"
                  disabled={logoUploading}
                  onClick={() => {
                    playClickSound()
                    logoFileInputRef.current?.click()
                  }}
                >
                  바꾸기
                </EventFormS.AddButton>
                <KitUploadRemove
                  type="button"
                  aria-label="로고 제거"
                  disabled={logoUploading}
                  onClick={() => {
                    playClickSound()
                    setLogoUrl('')
                  }}
                >
                  <FiX size={14} />
                </KitUploadRemove>
              </KitUploadActions>
            </KitUploadFilled>
          ) : (
            <KitUploadStrip
              type="button"
              disabled={logoUploading}
              onClick={() => {
                playClickSound()
                logoFileInputRef.current?.click()
              }}
            >
              <KitUploadThumb>
                <FiImage size={16} />
              </KitUploadThumb>
              <KitUploadText>
                <strong>{logoUploading ? '올리는 중…' : '로고 이미지 올리기'}</strong>
                <span>JPG · PNG · WebP 권장</span>
              </KitUploadText>
            </KitUploadStrip>
          )}
        </EventFormS.FormField>
      </EventFormS.FormRow>
      <EventFormS.FormRow>
        <EventFormS.FormLabel htmlFor="party-brand-color">
          브랜드 컬러<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          <PartyColorRow>
            <PartyColorSwatchInput
              id="party-brand-color-swatch"
              type="color"
              value={previewColor ?? '#6366f1'}
              onChange={(event) => setBrandColor(event.target.value)}
              aria-label="색 선택 — 선택 시 텍스트 값도 자동 갱신"
            />
            <EventFormS.Input
              id="party-brand-color"
              value={brandColor}
              onChange={(event) => setBrandColor(event.target.value)}
              placeholder="#RRGGBB (선택)"
              autoComplete="off"
              aria-invalid={brandColorInvalid || undefined}
            />
          </PartyColorRow>
          {brandColorInvalid ? (
            <EventFormS.ErrorMessage role="alert">
              올바른 #RRGGBB 형식이 아닙니다. 색 선택기로 바꾸면 자동 보정됩니다.
            </EventFormS.ErrorMessage>
          ) : (
            <EventFormS.Hint>
              정당 목록·득표 막대의 색이 됩니다. 선택기와 텍스트는 서로 실시간
              반영됩니다(#RRGGBB).
            </EventFormS.Hint>
          )}
        </EventFormS.FormField>
      </EventFormS.FormRow>
      <EventFormS.FormRow>
        <EventFormS.FormLabel as="div" id="party-color-palette-label">
          상징색<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          <PaletteRow role="group" aria-labelledby="party-color-palette-label">
            {colorPalette.map((hex) => (
              <PaletteChip key={hex}>
                <span className="sw" style={{ background: hex }} aria-hidden />
                {hex}
                <button type="button" aria-label={`${hex} 빼기`} onClick={() => setColorPalette((prev) => prev.filter((item) => item !== hex))}>
                  <FiX size={11} />
                </button>
              </PaletteChip>
            ))}
            {colorPalette.length < 12 ? (
              <>
                <PartyColorSwatchInput
                  type="color"
                  value={paletteDraft}
                  onChange={(event) => setPaletteDraft(event.target.value)}
                  aria-label="더할 상징색"
                />
                <PartyDescOutlineBtn
                  type="button"
                  onClick={() => {
                    const hex = paletteDraft.toUpperCase()
                    setColorPalette((prev) => (prev.includes(hex) ? prev : [...prev, hex]))
                  }}
                >
                  <FiPlus size={13} />
                  색 더하기
                </PartyDescOutlineBtn>
              </>
            ) : null}
          </PaletteRow>
          <EventFormS.Hint>당이 쓰는 색 여러 개(예: 검정·빨강). 차트·목록의 색은 위 브랜드 컬러 하나입니다.</EventFormS.Hint>
        </EventFormS.FormField>
      </EventFormS.FormRow>
      <EventFormS.FormRow>
        <EventFormS.FormLabel as="div">미리보기</EventFormS.FormLabel>
        <EventFormS.FormField>
          {/* 목록 카드에서 보일 모습 — 색·로고·약칭을 넣는 즉시 반영 */}
          <PartyPreviewCard
            $accent={previewColor ?? undefined}
            aria-label="정당 표지 미리보기"
          >
            <PartyPreviewLogo>
              {logoUrl ? (
                <img src={getUploadImageUrl(logoUrl)} alt="" />
              ) : (
                <span aria-hidden>
                  {(shortName.trim() || name.trim() || '정').slice(0, 1)}
                </span>
              )}
            </PartyPreviewLogo>
            <PartyPreviewText>
              <strong>{name.trim() || '정당 명칭'}</strong>
              <span>
                {[
                  shortName.trim(),
                  positionLabel,
                  kind !== 'PARTY' ? labelPoliticalPartyKind(kind) : null,
                  founded.year != null
                    ? `${formatPartialDate(partialOfFormValue({ ...founded, month: undefined, day: undefined }))} 창당`
                    : null,
                  dissolved.year != null
                    ? `${formatPartialDate(partialOfFormValue({ ...dissolved, month: undefined, day: undefined }))} 해산`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || '약칭·스펙트럼·설립 연도가 여기 붙습니다'}
              </span>
            </PartyPreviewText>
          </PartyPreviewCard>
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
      title={mode === 'edit' ? '정당 수정' : '정당 등록'}
      headerActions={
        <HeaderActionsBar>
          <FormS.LayoutModeToggleBtn
            type="button"
            $active={layoutMode === 'split'}
            aria-pressed={layoutMode === 'split'}
            aria-label={
              layoutMode === 'split'
                ? '1단 세로 보기로 전환'
                : '2단 좌우 분할 보기로 전환'
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
      <FormS.MilitaryModalFormScroll ref={formScrollRef} $layoutMode={layoutMode}>
        {loadingEdit ? (
          <KitFormLoading label="정당 정보를 불러오는 중" />
        ) : (
          <>
            {saving || continuing ? (
              <FormS.BusyBar role="status" aria-live="polite">
                {mode === 'create'
                  ? '정당을 등록하는 중...'
                  : '수정 사항을 저장하는 중...'}
              </FormS.BusyBar>
            ) : registeredInSession.length > 0 ? (
              <RegisteredInSessionBar role="status" aria-live="polite">
                <strong>이 창에서 {registeredInSession.length}개 등록</strong>
                <span className="names">{registeredInSession.join(' · ')}</span>
              </RegisteredInSessionBar>
            ) : null}
            <EventFormS.FormSection key={formGeneration}>
              {layoutMode === 'split' ? (
                <FormS.SplitColumnsGrid>
                  <FormS.SplitColumnLeft>
                    {basicSectionNode}
                    {lineSectionNode}
                  </FormS.SplitColumnLeft>
                  <FormS.SplitColumnRight>{markSectionNode}</FormS.SplitColumnRight>
                </FormS.SplitColumnsGrid>
              ) : (
                <>
                  {basicSectionNode}
                  {lineSectionNode}
                  {markSectionNode}
                </>
              )}
            </EventFormS.FormSection>
          </>
        )}
      </FormS.MilitaryModalFormScroll>
      <PersonRegisterModalStickyFooter>
        <RegisterFooterStatus
          missing={loadingEdit ? [] : missingRequired}
          onJumpToMissing={() => nameInputRef.current?.focus()}
          problem={formProblem}
          readyLabel={mode === 'create' ? '등록 준비 완료' : '수정 준비 완료'}
          shortcuts={[{ keys: '⌘↵', label: '저장' }]}
        />
        <FooterActions>
          <PersonRegisterModalCancelBtn
            type="button"
            onClick={() => {
              void requestClose()
            }}
            disabled={saving || continuing}
          >
            {registeredInSession.length > 0 && !isDirty ? '닫기' : '취소'}
          </PersonRegisterModalCancelBtn>
          {mode === 'create' ? (
            <ContinueRegisterBtn
              type="button"
              disabled={!canSubmit}
              title="이 정당을 등록하고 창을 비워 다음 정당을 이어서 입력합니다"
              onClick={() => {
                void submitAndContinue()
              }}
            >
              {continuing ? '등록 중...' : '등록 후 계속'}
            </ContinueRegisterBtn>
          ) : null}
          <FormS.ModalPrimarySubmitBtn
            type="button"
            disabled={!canSubmit}
            title={
              missingRequired.length > 0
                ? '필수 입력: 명칭'
                : (formProblem ?? '단축키: ⌘/Ctrl + Enter')
            }
            onClick={submit}
          >
            {saving
              ? mode === 'create'
                ? '등록 중...'
                : '수정 중...'
              : logoUploading
                ? '로고 올리는 중...'
                : mode === 'create'
                  ? '정당 등록'
                  : '수정 완료'}
          </FormS.ModalPrimarySubmitBtn>
        </FooterActions>
      </PersonRegisterModalStickyFooter>
    </RegisterModal>
  )
}

/** '등록 후 계속' — 취소와 같은 테두리 버튼, 글자만 주색 */
const ContinueRegisterBtn = styled(PersonRegisterModalCancelBtn)`
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 600;
`

/** 이 창에서 이어서 등록한 정당들 */
const RegisteredInSessionBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
  margin-bottom: 12px;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.08)'};

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .names {
    min-width: 0;
  }
`

/** 기본 정보 출처 줄 — 인포박스 아래 */
const PartyIdentitySourceRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  padding: 6px 2px 0;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/**
 * 상세 본문 — 넓으면 [섹션 | 인포박스] 두 단, 좁으면 인포박스를 위로.
 * 폭 판정은 뷰포트가 아니라 본문 폭(좌측 목록·레일을 뺀 자리)으로 — 컨테이너 쿼리.
 */
const PartyDetailBody = styled.div`
  container-type: inline-size;
  margin-top: 16px;
`

const PartyDetailMain = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`

/* sticky 아님 — 인포박스가 화면보다 길어 붙여 두면 아래 줄에 닿을 수 없다 */
const PartyDetailAside = styled.div`
  min-width: 0;
  margin-bottom: 16px;

  @container (min-width: 960px) {
    margin-bottom: 0;
  }
`

/* 두 단 격자 — 컨테이너(PartyDetailBody)의 자식에서만 @container가 먹는다 */
const PartyDetailColumns = styled.div`
  display: flex;
  flex-direction: column-reverse;

  @container (min-width: 960px) {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    gap: 28px;
    align-items: start;
  }
`

/** 섹션 묶음(장) — 머리글 아래 같은 성격의 섹션들 */
const PartyChapter = styled.section`
  display: flex;
  flex-direction: column;
  margin-top: 28px;
`

const PartyChapterTitle = styled.h2`
  margin: 0 0 4px;
  padding-bottom: 8px;
  border-bottom: 2px solid ${({ theme }) => theme.colors.text.primary};
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const PaletteRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
`

/** 상징색 칩 */
const PaletteChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 4px 3px 7px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};

  .sw {
    width: 12px;
    height: 12px;
    border-radius: 999px;
    border: 1px solid ${({ theme }) => theme.colors.border.light};
  }
  button {
    display: inline-flex;
    padding: 2px;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: ${({ theme }) => theme.colors.text.tertiary};
    cursor: pointer;
  }
`

const PartyColorRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 320px;
`

const PartyColorSwatchInput = styled.input`
  flex-shrink: 0;
  width: 44px;
  height: 41px;
  padding: 3px;
  border: 1px solid ${({ theme }) => kitC(theme).border};
  border-radius: 8px;
  background: ${({ theme }) => kitC(theme).content};
  cursor: pointer;
`

const PartyPreviewCard = styled.div<{ $accent?: string }>`
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 420px;
  padding: 12px 14px;
  border: 1px solid ${({ theme }) => kitC(theme).border};
  border-left: 4px solid
    ${({ $accent, theme }) => $accent ?? kitC(theme).borderHover};
  border-radius: 10px;
  background: ${({ theme }) => kitC(theme).content};
`

const PartyPreviewLogo = styled.span`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => kitC(theme).border};
  background: ${({ theme }) => kitC(theme).section};
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => kitC(theme).textSecondary};

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`

const PartyPreviewText = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;

  strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 14px;
    font-weight: 700;
    color: ${({ theme }) => kitC(theme).textPrimary};
  }
  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    color: ${({ theme }) => kitC(theme).textSecondary};
  }
`
