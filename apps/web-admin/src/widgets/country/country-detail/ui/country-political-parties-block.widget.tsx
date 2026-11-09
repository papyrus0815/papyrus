/**
 * 국가 상세 — 선거·투표 탭 상단: 이 국가 소속 정당(PoliticalParty) 등록·편집
 * 정당 등록/수정은 인물 등록 모달(PersonRegisterViewModal)과 동일한 셸 사용
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  FiCalendar,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiImage,
  FiPlus,
  FiTrash2,
  FiUpload,
  FiX,
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import { usePersons } from '@/entities/person/api'
import {
  type PartyMembershipLeadershipTier,
  type PartyMembershipRoleCategory,
  addPartyLaw,
  createPartyMembership,
  deletePartyMembership,
  getLaws,
  getPartyLaws,
  removePartyLaw,
} from '@/shared/api/election'
import {
  type CreatePoliticalPartyInput,
  type PartyTopLeaderTenure,
  type PoliticalParty,
  type PoliticalPartyTransitionKind,
  type PoliticalPosition,
  politicalPartyApi,
} from '@/shared/api/political-party'
import {
  getUploadImageUrl,
  uploadImage,
  validateImageFile,
} from '@/shared/api/upload'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { useRichTextProseClick } from '@/shared/hooks/use-rich-text-prose-click'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { isLikelyRichTextHtml } from '@/shared/lib/rich-text-read-view'
import { sanitizeRichTextHtml } from '@/shared/lib/sanitize-rich-text-html'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog'
import { notify } from '@/shared/ui/toast'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import { FormSelectNative } from '@/shared/ui/form-select-native'
import {
  PersonRegisterModalCancelBtn,
  PersonRegisterModalFormActions,
  PersonRegisterModalPrimaryBtn,
} from '@/shared/ui/register-modal-shell/register-modal-shell'
import {
  DateFieldBtn,
  DateFieldsRow,
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
import { PoliticalPartyRegisterViewModal } from '@/widgets/country/country-list/ui/political-party-register-view-modal'

import * as DashboardStyles from './country-detail-dashboard.styles'
import {
  DetailHeaderIconBtn,
  EmptyHint,
  PartyCoalitionSegment,
  PartyCoalitionStrip,
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
  PartyDetailMetaGrid,
  PartyDetailMetaSection,
  PartyDetailMetaTile,
  PartyDetailMetaTileLabel,
  PartyDetailMetaTileValue,
  PartyDetailTopActions,
  PartyDetailTopBar,
  PartyDetailTopLeft,
  PartyIdeologySpectrumBubble,
  PartyIdeologySpectrumBubbleAnchor,
  PartyIdeologySpectrumEnds,
  PartyIdeologySpectrumLabel,
  PartyIdeologySpectrumPin,
  PartyIdeologySpectrumStage,
  PartyIdeologySpectrumTrackBar,
  PartyIdeologySpectrumWrap,
  PartyInfographicCard,
  PartyInfographicCardBody,
  PartyInfographicCardHero,
  PartyInfographicFootHint,
  PartyInfographicGrid,
  PartyInfographicKicker,
  PartyInfographicKickerDesc,
  PartyInfographicKickerLeft,
  PartyInfographicKickerTitle,
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
  PoliticsEmptySpecCell,
  PoliticsEmptySpecCellDesc,
  PoliticsEmptySpecCellLabel,
  PoliticsEmptySpecCellTitle,
  PoliticsEmptySpecGrid,
  PoliticsEmptySpecHead,
  PoliticsEmptySpecHeadSub,
  PoliticsEmptySpecHeadText,
  PoliticsEmptySpecHeadTitle,
  PoliticsEmptySpecWrap,
  RowIconBtn,
  SubsectionAddBtn,
  ToolbarGhostBtnSm,
} from './country-politics-tab.styles'

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

const FullWidthControl = styled(FieldControl)`
  max-width: 100% !important;
  width: 100%;
`

const ModalFieldWide = styled(FieldControl)`
  max-width: min(560px, 100%) !important;
`

const ModalFieldMedium = styled(FieldControl)`
  max-width: min(400px, 100%) !important;
`

const ModalFieldNarrow = styled(FieldControl)`
  max-width: 260px !important;
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

/** 로고 — 카드형 업로드 대신 썸네일 + 텍스트 액션 (가벼운 한 줄 레이아웃) */
const PartyLogoRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 14px;
  width: 100%;
`

const PartyLogoThumb = styled.button`
  flex-shrink: 0;
  width: 72px;
  height: 72px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.04)'
      : 'rgba(0, 0, 0, 0.02)'};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
  padding: 6px;
  box-sizing: border-box;
  overflow: hidden;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.border.medium};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.06)'
        : 'rgba(0, 0, 0, 0.04)'};
  }
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`

const PartyLogoThumbImg = styled.img`
  display: block;
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
`

const PartyLogoMeta = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 2px;
`

const PartyLogoRemoveBtn = styled.button`
  padding: 0;
  border: none;
  background: none;
  font-size: 13px;
  font-weight: 400;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  &:hover:not(:disabled) {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#f87171' : '#b91c1c')};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const PartyLogoHint = styled.p`
  margin: 0;
  font-size: 11px;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const PartyLogoStatusLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
`

const PartyLogoStatusOk = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#86efac' : '#15803d'};
`

const PartyLogoStatusBusy = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const PartyBrandColorInput = styled(Input)<{ $invalid?: boolean }>`
  border-color: ${({ $invalid }) =>
    $invalid ? '#dc2626' : undefined} !important;
`

const PartyFilterBar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 12px 0 16px;
  padding: 10px 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 0;
  background: transparent;
`

const PartyFilterRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
`

const PartyFilterInput = styled.input`
  flex: 1;
  min-width: 0;
  height: 34px;
  padding: 0 12px;
  font-size: 13px;
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

const PartyFilterSelect = styled.select`
  flex: 1;
  min-width: 0;
  height: 34px;
  padding: 0 10px;
  font-size: 12.5px;
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

const PartyFilterToggleBtn = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  height: 34px;
  padding: 0 12px;
  font-size: 12.5px;
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

const PartyFilterBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 5px;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  background: #6366f1;
  border-radius: 999px;
`

const PartyFilterMeta = styled.div`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  padding-left: 2px;
`

const PartyFilterResetBtn = styled.button`
  background: none;
  border: none;
  padding: 0;
  color: #6366f1;
  cursor: pointer;
  font: inherit;
  text-decoration: underline;
  &:hover {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5')};
  }
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

const IdeologyTagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
  min-height: 0;
`

const IdeologyTag = styled.span`
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

const IdeologyTagRemove = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0;
  border: none;
  background: none;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.tertiary};
  line-height: 1;
  &:hover {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#f87171' : '#b91c1c')};
  }
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

function formatYmdKo(ymd: string) {
  if (!ymd) return ''
  try {
    return new Date(`${ymd}T12:00:00.000Z`).toLocaleDateString('ko-KR')
  } catch {
    return ymd
  }
}

function formatPickedCalendarDateLabel(raw: string) {
  if (!raw) return ''
  const t = Date.parse(raw)
  if (!Number.isNaN(t)) return new Date(t).toLocaleDateString('ko-KR', { timeZone: 'UTC' })
  return raw.length >= 10 ? formatYmdKo(raw.slice(0, 10)) : raw
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
        <PartyDescEmptyHint>불러오는 중…</PartyDescEmptyHint>
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
}: {
  partyId: string
  routeCountryId: string
}) {
  const navigate = useNavigate()
  const [showAll, setShowAll] = useState(false)
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['political-parties', partyId, 'election-results'],
    queryFn: () => politicalPartyApi.getElectionResults(partyId),
    enabled: !!partyId,
  })
  const visible = showAll ? data : data.slice(0, PARTY_RELATION_DEFAULT_LIMIT)
  const hiddenCount = Math.max(0, data.length - visible.length)
  return (
    <PartyDetailDescSection aria-label="역대 선거 성적">
      <PartyDescSectionLabelRow style={{ marginBottom: 10 }}>
        <PartyDescSectionLabel>역대 선거 성적</PartyDescSectionLabel>
      </PartyDescSectionLabelRow>
      {isLoading ? (
        <PartyDescEmptyHint>불러오는 중…</PartyDescEmptyHint>
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
                    {formatVoteShareShort(row.voteSharePercent)}
                  </PartyRelationTd>
                  <PartyRelationTd>
                    {row.seatsWon != null
                      ? `${row.seatsWon}${el?.totalSeats ? ` / ${el.totalSeats}` : ''}석`
                      : '—'}
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

const PARTY_MEMBERSHIP_ROLE_CATEGORY_OPTIONS: {
  value: PartyMembershipRoleCategory
  label: string
}[] = [
  { value: 'GENERAL_MEMBER', label: '일반 당원' },
  { value: 'LEADERSHIP', label: '지도부' },
  { value: 'PARLIAMENTARY', label: '원내·의회직' },
  { value: 'LOCAL_ORGANIZATION', label: '지역·시도당' },
  { value: 'WING_ORGAN', label: '청년·여성·부문위' },
  { value: 'POLICY_STAFF', label: '정책·당직자' },
  { value: 'HONORARY', label: '명예직·고문' },
  { value: 'OTHER', label: '기타' },
]

const PARTY_MEMBERSHIP_LEADERSHIP_TIER_OPTIONS: {
  value: PartyMembershipLeadershipTier
  label: string
}[] = [
  { value: 'UNSPECIFIED', label: '위계 미지정' },
  { value: 'TOP', label: '최고대표 (당대표·총재)' },
  { value: 'SECOND', label: '2인자 (원내대표·부대표)' },
  { value: 'SENIOR', label: '고위 지도부 (최고위원 등)' },
  { value: 'ORDINARY', label: '일반 지도부' },
  { value: 'JUNIOR', label: '청년·초선 지도부' },
]

function labelMembershipRoleCategory(value?: string | null): string {
  if (!value) return ''
  return (
    PARTY_MEMBERSHIP_ROLE_CATEGORY_OPTIONS.find((opt) => opt.value === value)
      ?.label ?? value
  )
}

function labelMembershipLeadershipTier(value?: string | null): string {
  if (!value || value === 'UNSPECIFIED') return ''
  return (
    PARTY_MEMBERSHIP_LEADERSHIP_TIER_OPTIONS.find((opt) => opt.value === value)
      ?.label ?? value
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

function PartyMembershipsBlock({ partyId }: { partyId: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showAll, setShowAll] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [personSearch, setPersonSearch] = useState('')
  const [selectedPersonId, setSelectedPersonId] = useState('')
  const [roleTitle, setRoleTitle] = useState('')
  const [roleCategory, setRoleCategory] =
    useState<PartyMembershipRoleCategory>('GENERAL_MEMBER')
  const [leadershipTier, setLeadershipTier] =
    useState<PartyMembershipLeadershipTier>('UNSPECIFIED')
  const [startDateYmd, setStartDateYmd] = useState('')
  const [endDateYmd, setEndDateYmd] = useState('')
  const [notes, setNotes] = useState('')

  const { data: persons = [] } = usePersons()
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['political-parties', partyId, 'memberships'],
    queryFn: () => politicalPartyApi.getMemberships(partyId),
    enabled: !!partyId,
  })

  const filteredPersons = useMemo(() => {
    const query = personSearch.trim().toLowerCase()
    const baseList = persons.map((personItem) => ({
      id: personItem.id,
      displayName: getPersonDisplayName({
        name: personItem.name,
        surname: personItem.surname,
        middleName: personItem.middleName,
        nameDisplayOrder: personItem.nameDisplayOrder ?? null,
        country: personItem.country ?? null,
      }),
    }))
    if (!query) return baseList.slice(0, 200)
    return baseList
      .filter((item) => item.displayName.toLowerCase().includes(query))
      .slice(0, 200)
  }, [persons, personSearch])

  const resetAddForm = () => {
    setPersonSearch('')
    setSelectedPersonId('')
    setRoleTitle('')
    setRoleCategory('GENERAL_MEMBER')
    setLeadershipTier('UNSPECIFIED')
    setStartDateYmd('')
    setEndDateYmd('')
    setNotes('')
  }

  const createMembershipMut = useMutation({
    mutationFn: () =>
      createPartyMembership(selectedPersonId, {
        partyId,
        roleTitle: roleTitle.trim() || null,
        roleCategory,
        leadershipTier:
          roleCategory === 'LEADERSHIP' ? leadershipTier : 'UNSPECIFIED',
        startDate: startDateYmd ? `${startDateYmd}T12:00:00.000Z` : null,
        endDate: endDateYmd ? `${endDateYmd}T12:00:00.000Z` : null,
        notes: notes.trim() || null,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['political-parties', partyId, 'memberships'],
      })
      void queryClient.invalidateQueries({
        queryKey: ['political-parties', partyId, 'top-leaders'],
      })
      resetAddForm()
      setAddOpen(false)
      notify.success('소속 인물을 등록했습니다.')
    },
    onError: (err: Error) => notify.error(err.message),
  })

  const deleteMembershipMut = useMutation({
    mutationFn: (payload: { personId: string; membershipId: string }) =>
      deletePartyMembership(payload.personId, payload.membershipId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['political-parties', partyId, 'memberships'],
      })
      void queryClient.invalidateQueries({
        queryKey: ['political-parties', partyId, 'top-leaders'],
      })
      notify.success('소속 인물을 해제했습니다.')
    },
    onError: (err: Error) => notify.error(err.message),
  })

  const visible = showAll ? data : data.slice(0, PARTY_RELATION_DEFAULT_LIMIT)
  const hiddenCount = Math.max(0, data.length - visible.length)
  return (
    <PartyDetailDescSection aria-label="소속 인물">
      <PartyDescSectionLabelRow style={{ marginBottom: 10 }}>
        <PartyDescSectionLabel>소속 인물</PartyDescSectionLabel>
        <PartyDescOutlineBtn
          type="button"
          onClick={() => setAddOpen((prev) => !prev)}
        >
          <FiPlus size={14} />
          {addOpen ? '닫기' : '소속 인물 추가'}
        </PartyDescOutlineBtn>
      </PartyDescSectionLabelRow>
      {addOpen ? (
        <PartyInlineFormStrip>
          <PartyInlineFormRow>
            <Input
              value={personSearch}
              onChange={(event) => setPersonSearch(event.target.value)}
              placeholder="인물 이름 검색…"
              aria-label="소속 인물 검색"
              style={{ flex: '1 1 160px', minWidth: 140, maxWidth: 220 }}
            />
            <FormSelectNative
              value={selectedPersonId}
              onChange={(event) => setSelectedPersonId(event.target.value)}
              aria-label="인물 선택"
              style={{ flex: '2 1 220px', minWidth: 180 }}
            >
              <option value="">인물 선택 ({filteredPersons.length}명)…</option>
              {filteredPersons.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.displayName}
                </option>
              ))}
            </FormSelectNative>
            <Input
              value={roleTitle}
              onChange={(event) => setRoleTitle(event.target.value)}
              placeholder="직책·호칭 (예: 당대표, 최고위원)"
              aria-label="직책·호칭"
              style={{ flex: '1 1 180px', minWidth: 150 }}
            />
          </PartyInlineFormRow>
          <PartyInlineFormRow>
            <FormSelectNative
              value={roleCategory}
              onChange={(event) =>
                setRoleCategory(
                  event.target.value as PartyMembershipRoleCategory,
                )
              }
              aria-label="역할 분류"
              style={{ flex: '1 1 150px', minWidth: 140 }}
            >
              {PARTY_MEMBERSHIP_ROLE_CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </FormSelectNative>
            {roleCategory === 'LEADERSHIP' ? (
              <FormSelectNative
                value={leadershipTier}
                onChange={(event) =>
                  setLeadershipTier(
                    event.target.value as PartyMembershipLeadershipTier,
                  )
                }
                aria-label="지도부 위계"
                style={{ flex: '1 1 170px', minWidth: 150 }}
              >
                {PARTY_MEMBERSHIP_LEADERSHIP_TIER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </FormSelectNative>
            ) : null}
            <Input
              type="date"
              value={startDateYmd}
              onChange={(event) => setStartDateYmd(event.target.value)}
              aria-label="가입·취임일"
              title="가입·취임일 (선택)"
              style={{ flex: '0 1 150px', minWidth: 135 }}
            />
            <Input
              type="date"
              value={endDateYmd}
              onChange={(event) => setEndDateYmd(event.target.value)}
              aria-label="탈당·퇴임일"
              title="탈당·퇴임일 (비워두면 재직 중)"
              style={{ flex: '0 1 150px', minWidth: 135 }}
            />
            <Input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="비고 (선택)"
              aria-label="비고"
              style={{ flex: '1 1 160px', minWidth: 140 }}
            />
          </PartyInlineFormRow>
          <PartyInlineFormActions>
            <PartyDescOutlineBtn
              type="button"
              disabled={createMembershipMut.isPending}
              onClick={() => {
                resetAddForm()
                setAddOpen(false)
              }}
            >
              취소
            </PartyDescOutlineBtn>
            <PartyDescPrimaryBtn
              type="button"
              disabled={!selectedPersonId || createMembershipMut.isPending}
              onClick={() => createMembershipMut.mutate()}
            >
              {createMembershipMut.isPending ? '저장 중…' : '등록'}
            </PartyDescPrimaryBtn>
          </PartyInlineFormActions>
        </PartyInlineFormStrip>
      ) : null}
      {isLoading ? (
        <PartyDescEmptyHint>불러오는 중…</PartyDescEmptyHint>
      ) : isError ? (
        <PartyDescEmptyHint>목록을 불러오지 못했습니다.</PartyDescEmptyHint>
      ) : data.length === 0 ? (
        <PartyDescEmptyHint>
          연결된 당원·소속이 없습니다. 우측 상단「소속 인물 추가」버튼으로 바로 등록할 수 있습니다.
        </PartyDescEmptyHint>
      ) : (
        <>
        <PartyRelationTable>
          <thead>
            <tr>
              <PartyRelationTh>인물</PartyRelationTh>
              <PartyRelationTh>역할</PartyRelationTh>
              <PartyRelationTh>기간</PartyRelationTh>
              <PartyRelationTh style={{ width: 48, textAlign: 'right' }}>
                작업
              </PartyRelationTh>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              if (!row.person) return null
              const person = row.person
              const name = getPersonDisplayName({
                name: person.name,
                surname: person.surname,
                middleName: person.middleName,
                nameDisplayOrder: person.nameDisplayOrder ?? null,
                country: person.country ?? null,
              })
              const period =
                row.startDate || row.endDate
                  ? `${row.startDate ? formatDate(row.startDate) : '—'} — ${
                      row.endDate ? formatDate(row.endDate) : '재직 중'
                    }`
                  : '—'
              const roleParts: string[] = []
              if (row.roleTitle?.trim()) roleParts.push(row.roleTitle.trim())
              if (row.roleCategory && row.roleCategory !== 'OTHER')
                roleParts.push(labelMembershipRoleCategory(row.roleCategory))
              if (row.leadershipTier && row.leadershipTier !== 'UNSPECIFIED')
                roleParts.push(labelMembershipLeadershipTier(row.leadershipTier))
              const goto = () =>
                navigate(pathKeys.personsTimelineDetail(person.id))
              return (
                <PartyRelationTr
                  key={row.id}
                  onClick={goto}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      goto()
                    }
                  }}
                  aria-label={`${name} 인물 상세`}
                >
                  <PartyRelationTd>
                    <strong style={{ color: '#2563eb' }}>{name}</strong>
                    {row.notes?.trim() ? (
                      <PartyRelationMeta>{row.notes.trim()}</PartyRelationMeta>
                    ) : null}
                  </PartyRelationTd>
                  <PartyRelationTd>
                    {roleParts.length > 0 ? roleParts.join(' · ') : '—'}
                  </PartyRelationTd>
                  <PartyRelationTd>{period}</PartyRelationTd>
                  <PartyRelationTd
                    style={{ textAlign: 'right' }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <RowIconBtn
                      type="button"
                      $variant="danger"
                      disabled={deleteMembershipMut.isPending}
                      aria-label={`${name} 소속 해제`}
                      title="소속 해제"
                      onClick={async (event) => {
                        event.stopPropagation()
                        if (
                          await confirm({
                            title: '소속 인물 해제',
                            message: `「${name}」의 정당 소속 기록을 삭제할까요?`,
                            danger: true,
                          })
                        ) {
                          deleteMembershipMut.mutate({
                            personId: person.id,
                            membershipId: row.id,
                          })
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
        <PartyDescEmptyHint>불러오는 중…</PartyDescEmptyHint>
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
        <PartyDescEmptyHint>불러오는 중…</PartyDescEmptyHint>
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

function formatLineageDate(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null
  const d = new Date(`${iso.trim()}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso.trim()
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/** API 날짜 문자열 → DatePickerModal용 YYYY-MM-DD */
function isoTransitionDateToYmd(iso: string | null | undefined): string {
  if (!iso?.trim()) return ''
  const s = iso.trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
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
  const [lineageConfirmEffectiveDate, setLineageConfirmEffectiveDate] =
    useState('')
  const [lineageConfirmNotes, setLineageConfirmNotes] = useState('')
  const [lineagePartyError, setLineagePartyError] = useState<string | null>(
    null,
  )
  const [lineageKind, setLineageKind] =
    useState<PoliticalPartyTransitionKind>('SUCCESSION')
  const [lineageDatePickerOpen, setLineageDatePickerOpen] = useState(false)
  const [lineageEditingId, setLineageEditingId] = useState<string | null>(null)

  const closeLineageModal = () => {
    setLineageModal(null)
    setLineageEditingId(null)
    setLineageOtherPartyId(null)
    setLineageConfirmEffectiveDate('')
    setLineageConfirmNotes('')
    setLineagePartyError(null)
    setLineageKind('SUCCESSION')
    setLineageDatePickerOpen(false)
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
      effectiveDate?: string | null
      notes?: string | null
    }) => {
      const { editingId, link, otherPartyId, kind, effectiveDate, notes } =
        payload
      const ed = effectiveDate?.trim()
      const nt = notes?.trim()
      if (editingId) {
        return politicalPartyApi.updateTransition(editingId, {
          kind,
          effectiveDate: ed ? ed : null,
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
        ...(ed ? { effectiveDate: ed } : {}),
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
        <EmptyHint style={{ margin: 0 }}>계보 불러오는 중…</EmptyHint>
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
                const dateLabel = formatLineageDate(row.effectiveDate)
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
                          setLineageConfirmEffectiveDate(
                            isoTransitionDateToYmd(row.effectiveDate),
                          )
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
                  setLineageConfirmEffectiveDate('')
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
                const dateLabel = formatLineageDate(row.effectiveDate)
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
                          setLineageConfirmEffectiveDate(
                            isoTransitionDateToYmd(row.effectiveDate),
                          )
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
                  setLineageConfirmEffectiveDate('')
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
                  setLineageConfirmEffectiveDate('')
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
                  setLineageConfirmEffectiveDate('')
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
                          effectiveDate: lineageConfirmEffectiveDate || null,
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
                        <SelectClearRow>
                          <DateFieldBtn
                            type="button"
                            disabled={saveMut.isPending}
                            $hasValue={!!lineageConfirmEffectiveDate}
                            onClick={() => {
                              playClickSound()
                              setLineageDatePickerOpen(true)
                            }}
                          >
                            <FiCalendar size={16} />
                            <span>
                              {lineageConfirmEffectiveDate
                                ? formatPickedCalendarDateLabel(
                                    lineageConfirmEffectiveDate,
                                  )
                                : '달력에서 선택'}
                            </span>
                            <FiChevronDown size={20} />
                          </DateFieldBtn>
                          {lineageConfirmEffectiveDate ? (
                            <ClearFieldBtn
                              type="button"
                              disabled={saveMut.isPending}
                              onClick={() => {
                                playClickSound()
                                setLineageConfirmEffectiveDate('')
                              }}
                              aria-label="기준일 지우기"
                            >
                              <FiX size={16} />
                            </ClearFieldBtn>
                          ) : null}
                        </SelectClearRow>
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
            <DatePickerModal
              isOpen={lineageDatePickerOpen}
              onClose={() => setLineageDatePickerOpen(false)}
              initialDate={lineageConfirmEffectiveDate || undefined}
              onSelect={(date) => {
                setLineageConfirmEffectiveDate(date)
                setLineageDatePickerOpen(false)
              }}
              title="계보 기준일"
            />
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
  const [filtersExpanded, setFiltersExpanded] = useState(false)

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
      if (listStatusFilter === 'active' && party.dissolvedDate) return false
      if (listStatusFilter === 'dissolved' && !party.dissolvedDate) return false
      return true
    })
    const mult = listSortDir === 'asc' ? 1 : -1
    rows.sort((partyA, partyB) => {
      if (listSortKey === 'name') {
        return partyA.name.localeCompare(partyB.name, 'ko') * mult
      }
      const dateA = partyA.foundedDate
        ? new Date(partyA.foundedDate).getTime()
        : 0
      const dateB = partyB.foundedDate
        ? new Date(partyB.foundedDate).getTime()
        : 0
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

  /** 범례·연정 띠는 스펙트럼 좌→우 순서와 맞춤 */
  const partiesSpectrumSorted = useMemo(
    () => [...partyInfographicRows].sort((a, b) => a.leftPct - b.leftPct),
    [partyInfographicRows],
  )

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

  /** 정당 요약 KPI (4칸 헤어라인 스트립용) */
  const partyKpiSummary = useMemo(() => {
    const totalCount = parties.length
    const activeCount = parties.filter((party) => !party.dissolvedDate).length
    const dissolvedCount = totalCount - activeCount
    const posSet = new Set<string>()
    let leftCount = 0
    let centerCount = 0
    let rightCount = 0
    let earliestYear: number | null = null
    let latestYear: number | null = null

    for (const party of parties) {
      if (party.position) {
        posSet.add(party.position)
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
      if (party.foundedDate) {
        const y = new Date(party.foundedDate).getUTCFullYear()
        if (Number.isFinite(y)) {
          if (earliestYear == null || y < earliestYear) earliestYear = y
          if (latestYear == null || y > latestYear) latestYear = y
        }
      }
    }

    return {
      totalCount,
      activeCount,
      dissolvedCount,
      positionSetSize: posSet.size,
      leftCount,
      centerCount,
      rightCount,
      earliestYear,
      latestYear,
    }
  }, [parties])

  const createMut = useMutation({
    mutationFn: (body: CreatePoliticalPartyInput) =>
      politicalPartyApi.create(body),
    onSuccess: () => {
      notify.success('정당을 등록했습니다.')
      setModal(null)
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

  // 현대 국가는 연결된 역사 국가 소속 정당도 허용해야 하므로,
  // 이미 올바른 범위로 로드된 parties 목록에 포함 여부로 판단한다.
  const wrongCountryDetail =
    !!detailParty &&
    !isLoading &&
    !parties.some((p) => p.id === detailParty.id)

  return (
    <>
      <PartyBlockRoot>
        {!selectedPartyId && !isLoading && parties.length > 0 ? (
          <DashboardStyles.SectionHeadlineStrip aria-label="정당 현황 요약">
            <DashboardStyles.SectionHeadlineCell>
              <DashboardStyles.SectionHeadlineLabel>
                전체 등록 정당
              </DashboardStyles.SectionHeadlineLabel>
              <DashboardStyles.SectionHeadlineValue>
                {partyKpiSummary.totalCount}
                <DashboardStyles.SectionHeadlineUnit>
                  곳
                </DashboardStyles.SectionHeadlineUnit>
              </DashboardStyles.SectionHeadlineValue>
              <DashboardStyles.SectionHeadlineSub>
                {historicalCountryId ? '역사 국가 소속 정당' : '현대·연결 역사 국가 정당'}
              </DashboardStyles.SectionHeadlineSub>
            </DashboardStyles.SectionHeadlineCell>
            <DashboardStyles.SectionHeadlineCell>
              <DashboardStyles.SectionHeadlineLabel>
                활동 중 · 해산
              </DashboardStyles.SectionHeadlineLabel>
              <DashboardStyles.SectionHeadlineValue>
                {partyKpiSummary.activeCount}
                <DashboardStyles.SectionHeadlineUnit>
                  곳 활동
                </DashboardStyles.SectionHeadlineUnit>
              </DashboardStyles.SectionHeadlineValue>
              <DashboardStyles.SectionHeadlineSub>
                해산 {partyKpiSummary.dissolvedCount}곳
              </DashboardStyles.SectionHeadlineSub>
            </DashboardStyles.SectionHeadlineCell>
            <DashboardStyles.SectionHeadlineCell>
              <DashboardStyles.SectionHeadlineLabel>
                이념 스펙트럼 분포
              </DashboardStyles.SectionHeadlineLabel>
              <DashboardStyles.SectionHeadlineValue>
                {partyKpiSummary.positionSetSize > 0
                  ? `${partyKpiSummary.positionSetSize}`
                  : '—'}
                {partyKpiSummary.positionSetSize > 0 ? (
                  <DashboardStyles.SectionHeadlineUnit>
                    개 유형
                  </DashboardStyles.SectionHeadlineUnit>
                ) : null}
              </DashboardStyles.SectionHeadlineValue>
              <DashboardStyles.SectionHeadlineSub>
                {partyKpiSummary.positionSetSize > 0
                  ? `좌파권 ${partyKpiSummary.leftCount} · 중도/빅텐트 ${partyKpiSummary.centerCount} · 우파권 ${partyKpiSummary.rightCount}`
                  : '스펙트럼 미지정'}
              </DashboardStyles.SectionHeadlineSub>
            </DashboardStyles.SectionHeadlineCell>
            <DashboardStyles.SectionHeadlineCell>
              <DashboardStyles.SectionHeadlineLabel>
                창당 연도 범위
              </DashboardStyles.SectionHeadlineLabel>
              <DashboardStyles.SectionHeadlineValue>
                {partyKpiSummary.earliestYear != null
                  ? partyKpiSummary.latestYear != null &&
                    partyKpiSummary.latestYear !== partyKpiSummary.earliestYear
                    ? `${partyKpiSummary.earliestYear}–${partyKpiSummary.latestYear}`
                    : `${partyKpiSummary.earliestYear}`
                  : '—'}
                {partyKpiSummary.earliestYear != null ? (
                  <DashboardStyles.SectionHeadlineUnit>
                    년
                  </DashboardStyles.SectionHeadlineUnit>
                ) : null}
              </DashboardStyles.SectionHeadlineValue>
              <DashboardStyles.SectionHeadlineSub>
                {partyKpiSummary.earliestYear != null
                  ? `최초 창당 ${partyKpiSummary.earliestYear}년`
                  : '창당일 미입력'}
              </DashboardStyles.SectionHeadlineSub>
            </DashboardStyles.SectionHeadlineCell>
          </DashboardStyles.SectionHeadlineStrip>
        ) : null}

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
                  <EmptyHint style={{ margin: 0 }}>불러오는 중…</EmptyHint>
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
              <PartyDetailHero>
                <PartyDetailHeroStack>
                  <PartyDetailLogoHero
                    $ring={detailParty.brandColor ?? undefined}
                  >
                    {detailParty.logoUrl ? (
                      <PartyDetailLogoImg
                        src={getUploadImageUrl(detailParty.logoUrl)}
                        alt=""
                      />
                    ) : (
                      <FiImage size={52} strokeWidth={1.5} />
                    )}
                  </PartyDetailLogoHero>
                  <PartyDetailHeroTitle>
                    {detailParty.name}
                    <PartyStatusBadge
                      $dissolved={Boolean(detailParty.dissolvedDate)}
                      aria-label={
                        detailParty.dissolvedDate
                          ? `해산 · ${formatDate(detailParty.dissolvedDate)}`
                          : '활동 중'
                      }
                    >
                      {detailParty.dissolvedDate ? '해산' : '활동 중'}
                    </PartyStatusBadge>
                  </PartyDetailHeroTitle>
                  <PartyDetailChipRowCenter>
                    {detailParty.shortName?.trim() ? (
                      <PartyDetailChip title="약칭">
                        <PartyDetailChipMuted>약칭</PartyDetailChipMuted>
                        {detailParty.shortName.trim()}
                      </PartyDetailChip>
                    ) : (
                      <PartyDetailChip style={{ opacity: 0.72 }}>
                        약칭 없음
                      </PartyDetailChip>
                    )}
                    {detailParty.localName?.trim() ? (
                      <PartyDetailChip title="현지어·별도 표기">
                        <PartyDetailChipMuted>현지어</PartyDetailChipMuted>
                        {detailParty.localName.trim()}
                      </PartyDetailChip>
                    ) : null}
                  </PartyDetailChipRowCenter>
                </PartyDetailHeroStack>
              </PartyDetailHero>
              <PartyDetailMetaSection>
                <PartyDetailMetaGrid>
                  <PartyDetailMetaTile>
                    <PartyDetailMetaTileLabel>
                      브랜드 컬러
                    </PartyDetailMetaTileLabel>
                    <PartyDetailMetaTileValue>
                      {detailParty.brandColor ? (
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
                              background: detailParty.brandColor,
                              boxShadow: `inset 0 0 0 1px rgba(0,0,0,0.08)`,
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
                            {detailParty.brandColor}
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
                      {parseIdeologyKeywords(detailParty.ideology).length ? (
                        <span
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 6,
                          }}
                        >
                          {parseIdeologyKeywords(detailParty.ideology).map(
                            (t, i) => (
                              <IdeologyTag key={`${t}-${i}`}>{t}</IdeologyTag>
                            ),
                          )}
                        </span>
                      ) : (
                        '—'
                      )}
                    </PartyDetailMetaTileValue>
                  </PartyDetailMetaTile>
                  <PartyDetailMetaTile>
                    <PartyDetailMetaTileLabel>
                      스펙트럼
                    </PartyDetailMetaTileLabel>
                    <PartyDetailMetaTileValue>
                      {labelPoliticalPosition(
                        detailParty.position ?? undefined,
                      )}
                    </PartyDetailMetaTileValue>
                  </PartyDetailMetaTile>
                  <PartyDetailMetaTile>
                    <PartyDetailMetaTileLabel>설립</PartyDetailMetaTileLabel>
                    <PartyDetailMetaTileValue>
                      {formatDate(detailParty.foundedDate)}
                    </PartyDetailMetaTileValue>
                  </PartyDetailMetaTile>
                  <PartyDetailMetaTile>
                    <PartyDetailMetaTileLabel>해산</PartyDetailMetaTileLabel>
                    <PartyDetailMetaTileValue>
                      {formatDate(detailParty.dissolvedDate)}
                    </PartyDetailMetaTileValue>
                  </PartyDetailMetaTile>
                </PartyDetailMetaGrid>
              </PartyDetailMetaSection>
              <PartyLineageBlock
                partyId={detailParty.id}
                partyName={detailParty.name}
                parties={parties}
                routeCountryId={routeCountryId}
              />
              <PartyTopLeadersBlock partyId={detailParty.id} />
              <PartyElectionResultsBlock
                partyId={detailParty.id}
                routeCountryId={routeCountryId}
              />
              <PartyMembershipsBlock partyId={detailParty.id} />
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
            </PartyDetailLayout>
          )
        ) : isLoading ? (
          <PartyListAreaBody>
            <EmptyHint>불러오는 중…</EmptyHint>
          </PartyListAreaBody>
        ) : parties.length === 0 ? (
          <PartyListAreaBody>
            <PoliticsEmptySpecWrap>
              <PoliticsEmptySpecHead>
                <PoliticsEmptySpecHeadText>
                  <PoliticsEmptySpecHeadTitle>
                    등록된 정당이 없습니다
                  </PoliticsEmptySpecHeadTitle>
                  <PoliticsEmptySpecHeadSub>
                    정당을 등록하면 선거·후보·집계 및 배출 최고권력자·계보를 연결할 수 있습니다.
                  </PoliticsEmptySpecHeadSub>
                </PoliticsEmptySpecHeadText>
                <SubsectionAddBtn
                  type="button"
                  onClick={() => setModal({ mode: 'create' })}
                >
                  <FiPlus size={15} strokeWidth={2.25} />
                  정당 등록
                </SubsectionAddBtn>
              </PoliticsEmptySpecHead>
              <PoliticsEmptySpecGrid>
                <PoliticsEmptySpecCell>
                  <PoliticsEmptySpecCellLabel>
                    01 · 스펙트럼 & 당색
                  </PoliticsEmptySpecCellLabel>
                  <PoliticsEmptySpecCellTitle>
                    정치 스펙트럼 위치와 브랜드 색
                  </PoliticsEmptySpecCellTitle>
                  <PoliticsEmptySpecCellDesc>
                    극좌~극우·빅텐트 성향과 공식 당색(HEX)·로고를 등록해 스펙트럼 막대와 도넛 차트 색상에 반영합니다.
                  </PoliticsEmptySpecCellDesc>
                </PoliticsEmptySpecCell>
                <PoliticsEmptySpecCell>
                  <PoliticsEmptySpecCellLabel>
                    02 · 이념 & 존속 기간
                  </PoliticsEmptySpecCellLabel>
                  <PoliticsEmptySpecCellTitle>
                    주요 이념 태그와 창당·해산일
                  </PoliticsEmptySpecCellTitle>
                  <PoliticsEmptySpecCellDesc>
                    자유주의·보수주의·사회민주주의 등 핵심 노선과 설립일·해산일을 기록해 활동 상태를 구분합니다.
                  </PoliticsEmptySpecCellDesc>
                </PoliticsEmptySpecCell>
                <PoliticsEmptySpecCell>
                  <PoliticsEmptySpecCellLabel>
                    03 · 정당 계보
                  </PoliticsEmptySpecCellLabel>
                  <PoliticsEmptySpecCellTitle>
                    창당·합당·분당·개명 전신/후신 연결
                  </PoliticsEmptySpecCellTitle>
                  <PoliticsEmptySpecCellDesc>
                    정당 간 승계·합당·분당·개명 이력을 기준일과 함께 연결해 정당사 흐름을 추적합니다.
                  </PoliticsEmptySpecCellDesc>
                </PoliticsEmptySpecCell>
                <PoliticsEmptySpecCell>
                  <PoliticsEmptySpecCellLabel>
                    04 · 선거 성적 & 최고권력자
                  </PoliticsEmptySpecCellLabel>
                  <PoliticsEmptySpecCellTitle>
                    역대 선거 득표·의석 및 배출 수반 연동
                  </PoliticsEmptySpecCellTitle>
                  <PoliticsEmptySpecCellDesc>
                    선거별 정당 집계·출마 후보·소속 당원 및 국가원수·정부수반 배출 이력이 정당 상세에 자동 집계됩니다.
                  </PoliticsEmptySpecCellDesc>
                </PoliticsEmptySpecCell>
              </PoliticsEmptySpecGrid>
            </PoliticsEmptySpecWrap>
          </PartyListAreaBody>
        ) : (
          <PartyInfographicSection>
            <PartyInfographicKicker>
              <PartyInfographicKickerLeft>
                <PartyInfographicKickerTitle>
                  정당 스펙트럼 · 연정 띠
                </PartyInfographicKickerTitle>
                <PartyInfographicKickerDesc>
                  말풍선·막대 위 포인트·아래 띠는 정당 브랜드 색으로 맞춥니다.
                  가까운 위치의 말풍선은 위로 나눠 겹치지 않게 배치합니다.
                </PartyInfographicKickerDesc>
              </PartyInfographicKickerLeft>
            </PartyInfographicKicker>

            <PartyFilterBar>
              <PartyFilterRow>
                <PartyFilterInput
                  type="search"
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  placeholder="정당 이름·약칭·현지어 검색…"
                  aria-label="정당 이름 검색"
                />
                <PartyFilterToggleBtn
                  type="button"
                  $active={filtersExpanded || activeFilterCount > 0}
                  onClick={() => setFiltersExpanded((v) => !v)}
                  aria-expanded={filtersExpanded}
                  aria-label={filtersExpanded ? '필터·정렬 닫기' : '필터·정렬 열기'}
                  title="필터·정렬"
                >
                  필터
                  {activeFilterCount > 0 ? (
                    <PartyFilterBadge>{activeFilterCount}</PartyFilterBadge>
                  ) : null}
                </PartyFilterToggleBtn>
              </PartyFilterRow>
              {filtersExpanded ? (
                <>
                  <PartyFilterRow>
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
                    <PartyFilterSelect
                      value={listStatusFilter}
                      onChange={(e) =>
                        setListStatusFilter(
                          e.target.value as '' | 'active' | 'dissolved',
                        )
                      }
                      aria-label="상태 필터"
                    >
                      <option value="">활동 상태 전체</option>
                      <option value="active">활동 중</option>
                      <option value="dissolved">해산</option>
                    </PartyFilterSelect>
                  </PartyFilterRow>
                  <PartyFilterRow>
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
                  </PartyFilterRow>
                </>
              ) : null}
              <PartyFilterMeta>
                전체 {parties.length}곳 · 표시 {filteredParties.length}곳
                {listSearch || activeFilterCount > 0 ? (
                  <>
                    {' · '}
                    <PartyFilterResetBtn type="button" onClick={resetListFilters}>
                      필터 초기화
                    </PartyFilterResetBtn>
                  </>
                ) : null}
              </PartyFilterMeta>
            </PartyFilterBar>

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
                대략적인 배치입니다. 말풍선은 서로 가까우면 위아래로 나뉩니다.
              </span>
              <PartyIdeologySpectrumLabel id="party-spectrum-axis-label">
                이념·성향 축 (좌 → 우)
              </PartyIdeologySpectrumLabel>
              <PartyIdeologySpectrumStage
                role="group"
                aria-labelledby="party-spectrum-axis-label"
                aria-describedby="party-spectrum-axis-help"
                $maxLane={spectrumBubbleLanes.maxLane}
              >
                {partyInfographicRows.map(
                  ({ party: p, leftPct, displayName, brandColor }, stack) => {
                    const tooltipParts: string[] = [p.name]
                    if (p.position)
                      tooltipParts.push(labelPoliticalPosition(p.position))
                    if (p.foundedDate)
                      tooltipParts.push(`설립 ${formatDate(p.foundedDate)}`)
                    if (p.dissolvedDate)
                      tooltipParts.push(`해산 ${formatDate(p.dissolvedDate)}`)
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
                <span>좌</span>
                <span>우</span>
              </PartyIdeologySpectrumEnds>
            </PartyIdeologySpectrumWrap>

            <PartyCoalitionStrip aria-label="정당 구성 비율 (좌→우 성향 축 순)">
              {partiesSpectrumSorted.map(({ party: p, brandColor }) => (
                <PartyCoalitionSegment
                  key={p.id}
                  $color={brandColor}
                  title={p.shortName?.trim() || p.name}
                />
              ))}
            </PartyCoalitionStrip>

            <PartyInfographicGrid>
              {filteredParties.map((p) => {
                const accent = normalizeBrandColorInput(p.brandColor ?? '')
                const dissolved = Boolean(p.dissolvedDate)
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
                          <FiImage size={18} />
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
                        {p.ideology?.trim() ? (
                          <span>{p.ideology.trim()}</span>
                        ) : null}
                        <span>
                          설립 {formatDate(p.foundedDate)}
                          {dissolved
                            ? ` · 해산 ${formatDate(p.dissolvedDate)}`
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
          </PartyInfographicSection>
        )}
      </PartyBlockRoot>
      <PoliticalPartyRegisterViewModal
        isOpen={modal !== null}
        onClose={() => setModal(null)}
        title={modal?.mode === 'edit' ? '정당 수정' : '정당 등록'}
        modalMinHeight="min(640px, 92vh)"
      >
        {modal ? (
          <PartyFormModal
            key="party-modal"
            countryId={countryId}
            historicalCountryId={historicalCountryId}
            mode={modal.mode}
            partyId={modal.mode === 'edit' ? modal.id : undefined}
            saving={createMut.isPending || updateMut.isPending}
            onClose={() => setModal(null)}
            onSubmitCreate={(body) => createMut.mutate(body)}
            onSubmitEdit={(id, body) => updateMut.mutate({ id, body })}
          />
        ) : null}
      </PoliticalPartyRegisterViewModal>
    </>
  )
}

function PartyFormModal({
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
  onSubmitCreate: (body: CreatePoliticalPartyInput) => void
  onSubmitEdit: (id: string, body: CreatePoliticalPartyInput) => void
}) {
  const playClickSound = useClickSound()
  const [loaded, setLoaded] = useState<PoliticalParty | null>(null)
  const [foundedModalOpen, setFoundedModalOpen] = useState(false)
  const [dissolvedModalOpen, setDissolvedModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [shortName, setShortName] = useState('')
  const [localName, setLocalName] = useState('')
  const [ideologyTags, setIdeologyTags] = useState<string[]>([])
  const [ideologyInput, setIdeologyInput] = useState('')
  const [position, setPosition] = useState<PoliticalPosition | ''>('')
  const [foundedDate, setFoundedDate] = useState('')
  const [dissolvedDate, setDissolvedDate] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [brandColor, setBrandColor] = useState('')
  const [logoUploading, setLogoUploading] = useState(false)
  const logoFileInputRef = useRef<HTMLInputElement>(null)

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
    politicalPartyApi
      .getById(partyId)
      .then((row) => {
        if (cancelled) return
        setLoaded(row)
        setName(row.name)
        setShortName(row.shortName ?? '')
        setLocalName(row.localName ?? '')
        setIdeologyTags(parseIdeologyKeywords(row.ideology))
        setIdeologyInput('')
        setPosition((row.position as PoliticalPosition) ?? '')
        setFoundedDate(row.foundedDate?.slice(0, 10) ?? '')
        setDissolvedDate(row.dissolvedDate?.slice(0, 10) ?? '')
        setLogoUrl(row.logoUrl ?? '')
        setBrandColor(row.brandColor ?? '')
      })
      .catch((err: Error) => notify.error(err.message))
    return () => {
      cancelled = true
    }
  }, [mode, partyId])

  const submit = () => {
    const parsedColor = normalizeBrandColorInput(brandColor)
    if (brandColor.trim() && !parsedColor) {
      notify.error('브랜드 컬러는 #RRGGBB 형식(예: #e11d48)이거나 비워 두세요.')
      return
    }
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
      ideology: ideologyTags.length ? ideologyTags.join(', ') : null,
      position: position === '' ? null : position,
      foundedDate: foundedDate ? `${foundedDate}T12:00:00.000Z` : null,
      dissolvedDate: dissolvedDate ? `${dissolvedDate}T12:00:00.000Z` : null,
      logoUrl: logoUrl.trim() || null,
      brandColor: parsedColor,
      ...scope,
    }
    if (!body.name) {
      notify.error('정당 명칭을 입력하세요.')
      return
    }
    if (mode === 'create') onSubmitCreate(body)
    else if (partyId) onSubmitEdit(partyId, body)
  }

  const loadingEdit = mode === 'edit' && !loaded && partyId

  return (
    <>
      {loadingEdit ? (
        <EmptyHint>불러오는 중…</EmptyHint>
      ) : (
        <FormSectionInner>
          <FormRows>
            <FieldRow>
              <FieldLabel>로고·심벌</FieldLabel>
              <FullWidthControl>
                <input
                  ref={logoFileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleLogoFileChange}
                />
                <PartyLogoRow>
                  <PartyLogoThumb
                    type="button"
                    disabled={logoUploading}
                    aria-label={
                      logoUrl
                        ? '로고 이미지 변경 — 클릭해서 새 파일 선택'
                        : '로고 이미지 업로드'
                    }
                    title={logoUrl ? '클릭해서 변경' : '클릭해서 업로드'}
                    onClick={() => {
                      playClickSound()
                      logoFileInputRef.current?.click()
                    }}
                  >
                    {logoUrl ? (
                      <PartyLogoThumbImg
                        src={getUploadImageUrl(logoUrl)}
                        alt=""
                      />
                    ) : (
                      <FiImage size={22} strokeWidth={1.5} />
                    )}
                  </PartyLogoThumb>
                  <PartyLogoMeta>
                    <PartyLogoStatusLine>
                      {logoUploading ? (
                        <PartyLogoStatusBusy>업로드 중…</PartyLogoStatusBusy>
                      ) : logoUrl ? (
                        <>
                          <PartyLogoStatusOk>
                            <FiUpload size={12} strokeWidth={2} /> 로고가
                            업로드됐습니다
                          </PartyLogoStatusOk>
                          <PartyLogoRemoveBtn
                            type="button"
                            disabled={logoUploading}
                            onClick={() => {
                              playClickSound()
                              setLogoUrl('')
                            }}
                          >
                            제거
                          </PartyLogoRemoveBtn>
                        </>
                      ) : (
                        <PartyLogoHint>
                          썸네일을 클릭해 업로드 · JPG / PNG / WebP 권장
                        </PartyLogoHint>
                      )}
                    </PartyLogoStatusLine>
                    {logoUrl && !logoUploading ? (
                      <PartyLogoHint>
                        썸네일을 다시 클릭하면 다른 파일로 교체합니다.
                      </PartyLogoHint>
                    ) : null}
                  </PartyLogoMeta>
                </PartyLogoRow>
              </FullWidthControl>
            </FieldRow>
            <FieldRow>
              <FieldLabel htmlFor="party-brand-color">브랜드 컬러</FieldLabel>
              <ModalFieldMedium>
                <div
                  style={{ display: 'flex', gap: 10, alignItems: 'center' }}
                >
                  <input
                    id="party-brand-color-swatch"
                    type="color"
                    value={normalizeBrandColorInput(brandColor) ?? '#6366f1'}
                    onChange={(e) => setBrandColor(e.target.value)}
                    style={{
                      width: 44,
                      height: 36,
                      padding: 0,
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      cursor: 'pointer',
                    }}
                    aria-label="색 선택 — 선택 시 텍스트 값도 자동 갱신"
                  />
                  <PartyBrandColorInput
                    id="party-brand-color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    placeholder="#RRGGBB (선택)"
                    autoComplete="off"
                    $invalid={
                      brandColor.trim() !== '' &&
                      normalizeBrandColorInput(brandColor) == null
                    }
                  />
                </div>
                {brandColor.trim() !== '' &&
                normalizeBrandColorInput(brandColor) == null ? (
                  <FieldHint
                    style={{
                      color: '#dc2626',
                      marginTop: 6,
                      fontSize: 11.5,
                    }}
                  >
                    올바른 #RRGGBB 형식이 아닙니다. 색 선택기로 바꾸면 자동
                    보정됩니다.
                  </FieldHint>
                ) : (
                  <FieldHint style={{ marginTop: 6, fontSize: 11.5 }}>
                    선택기와 텍스트는 서로 실시간 반영됩니다 (#RRGGBB 6자리).
                  </FieldHint>
                )}
              </ModalFieldMedium>
            </FieldRow>
            <FieldRow>
              <FieldLabel htmlFor="party-form-name">
                명칭 <Required aria-label="필수" />
              </FieldLabel>
              <ModalFieldWide>
                <Input
                  id="party-form-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="off"
                  aria-required
                />
              </ModalFieldWide>
            </FieldRow>
            <FieldRow>
              <FieldLabel>약칭</FieldLabel>
              <ModalFieldMedium>
                <Input
                  value={shortName}
                  onChange={(event) => setShortName(event.target.value)}
                />
              </ModalFieldMedium>
            </FieldRow>
            <FieldRow>
              <FieldLabel>현지어·별도 표기</FieldLabel>
              <ModalFieldMedium>
                <Input
                  value={localName}
                  onChange={(event) => setLocalName(event.target.value)}
                />
              </ModalFieldMedium>
            </FieldRow>
            <FieldRow>
              <FieldLabel htmlFor="party-ideology-input">
                이념·노선 키워드
              </FieldLabel>
              <ModalFieldMedium>
                <IdeologyTagRow aria-label="등록된 키워드">
                  {ideologyTags.map((tag) => (
                    <IdeologyTag key={tag}>
                      {tag}
                      <IdeologyTagRemove
                        type="button"
                        aria-label={`${tag} 제거`}
                        onClick={() =>
                          setIdeologyTags((prev) =>
                            prev.filter((x) => x !== tag),
                          )
                        }
                      >
                        <FiX size={14} />
                      </IdeologyTagRemove>
                    </IdeologyTag>
                  ))}
                </IdeologyTagRow>
                <Input
                  id="party-ideology-input"
                  value={ideologyInput}
                  onChange={(e) => setIdeologyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault()
                      const t = ideologyInput
                        .split(/[,，]/)
                        .map((s) => s.trim())
                        .filter(Boolean)
                      if (t.length === 0) return
                      const next = [...ideologyTags]
                      for (const piece of t) {
                        if (next.includes(piece)) continue
                        if (next.length >= 40) {
                          notify.error('키워드는 최대 40개까지입니다.')
                          return
                        }
                        next.push(piece)
                      }
                      setIdeologyTags(next)
                      setIdeologyInput('')
                    }
                  }}
                  placeholder="예: 자유주의, 친화적 복지 — Enter로 추가"
                  autoComplete="off"
                />
                <FieldHint>
                  쉼표·Enter로 구분해 여러 키워드를 넣을 수 있습니다. 스펙트럼은
                  아래에서 하나만 지정합니다.
                </FieldHint>
              </ModalFieldMedium>
            </FieldRow>
            <FieldRow>
              <FieldLabel>스펙트럼</FieldLabel>
              <ModalFieldNarrow>
                <FormSelectNative
                  value={position}
                  onChange={(event) =>
                    setPosition(
                      (event.target.value || '') as PoliticalPosition | '',
                    )
                  }
                >
                  <option value="">(미지정)</option>
                  {POSITION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </FormSelectNative>
              </ModalFieldNarrow>
            </FieldRow>
            <FieldRow>
              <FieldLabel>설립·해산</FieldLabel>
              <FieldControl $variant="datePair">
                <DateFieldsRow style={{ maxWidth: '100%' }}>
                  <SelectClearRow>
                    <DateFieldBtn
                      type="button"
                      $hasValue={!!foundedDate}
                      onClick={() => {
                        playClickSound()
                        setFoundedModalOpen(true)
                      }}
                    >
                      <FiCalendar size={16} />
                      <span>
                        {foundedDate
                          ? formatYmdKo(foundedDate)
                          : '설립일 (달력)'}
                      </span>
                      <FiChevronDown size={20} />
                    </DateFieldBtn>
                    {foundedDate ? (
                      <ClearFieldBtn
                        type="button"
                        onClick={() => {
                          playClickSound()
                          setFoundedDate('')
                        }}
                        aria-label="설립일 지우기"
                      >
                        <FiX size={16} />
                      </ClearFieldBtn>
                    ) : null}
                  </SelectClearRow>
                  <SelectClearRow>
                    <DateFieldBtn
                      type="button"
                      $hasValue={!!dissolvedDate}
                      onClick={() => {
                        playClickSound()
                        setDissolvedModalOpen(true)
                      }}
                    >
                      <FiCalendar size={16} />
                      <span>
                        {dissolvedDate
                          ? formatYmdKo(dissolvedDate)
                          : '해산일 (달력)'}
                      </span>
                      <FiChevronDown size={20} />
                    </DateFieldBtn>
                    {dissolvedDate ? (
                      <ClearFieldBtn
                        type="button"
                        onClick={() => {
                          playClickSound()
                          setDissolvedDate('')
                        }}
                        aria-label="해산일 지우기"
                      >
                        <FiX size={16} />
                      </ClearFieldBtn>
                    ) : null}
                  </SelectClearRow>
                </DateFieldsRow>
              </FieldControl>
            </FieldRow>
          </FormRows>
          <PersonRegisterModalFormActions>
            <PersonRegisterModalCancelBtn type="button" onClick={onClose}>
              취소
            </PersonRegisterModalCancelBtn>
            <PersonRegisterModalPrimaryBtn
              type="button"
              disabled={saving || logoUploading}
              onClick={submit}
            >
              저장
            </PersonRegisterModalPrimaryBtn>
          </PersonRegisterModalFormActions>
        </FormSectionInner>
      )}
      <DatePickerModal
        isOpen={foundedModalOpen}
        onClose={() => setFoundedModalOpen(false)}
        onSelect={(date) => {
          setFoundedDate(date)
          setFoundedModalOpen(false)
        }}
        initialDate={foundedDate}
        title="설립일 선택"
      />
      <DatePickerModal
        isOpen={dissolvedModalOpen}
        onClose={() => setDissolvedModalOpen(false)}
        onSelect={(date) => {
          setDissolvedDate(date)
          setDissolvedModalOpen(false)
        }}
        initialDate={dissolvedDate}
        title="해산일 선택"
      />
    </>
  )
}
