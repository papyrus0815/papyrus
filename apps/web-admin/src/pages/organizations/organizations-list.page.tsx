/**
 * 국제기구 · 다자협의체 · 조직 허브 (`/organizations`).
 *
 * 도메인 경계:
 * - 영리 기업·특허회사(`COMPANY`)는 주가·시설·창립자·업종을 다루는 전용 `/companies` 지면이 정본이다.
 *   이 지면은 기업(`/companies`)·정당(`/political-parties`)·국가 행정부처(`/government?tab=departments`)를 완전히 배제하고
 *   **국제기구·다자협의체·군사동맹 및 비정부·민간·노동·직능·학술·종교 단체**만 정본으로 다룬다.
 *
 * 디자인 문법:
 * - `/events` · `/companies` · `/treaties`와 동일한 **Ledger / Atlas 디자인 토큰**(`ledger-tokens.ts`)을 따른다:
 *   고정폭 숫자(`DIGIT_DISPLAY`), 1px 헤어라인(`ledgerHairline`/`ledgerHairlineStrong`), 유형 컬러 도트,
 *   공통 연도 축 위의 존속 막대(`OrgLifespanBar`), 우측 슬라이드 인스펙터 패널.
 */
import React, { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FiAlertCircle,
  FiArrowDown,
  FiArrowUp,
  FiArrowUpRight,
  FiAward,
  FiCalendar,
  FiChevronDown,
  FiChevronRight,
  FiEdit2,
  FiExternalLink,
  FiGlobe,
  FiLayers,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiShare2,
  FiTrash2,
  FiUser,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import styled, { css } from 'styled-components'

import {
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerAccentBorder,
  ledgerAccentSubtle,
  ledgerBackground,
  ledgerChipFill,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerRowWash,
  ledgerSurface,
  ledgerSurfaceSolid,
  type Mode,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import { getApiConnection } from '@/shared/api/client'
import type { CountryResponseDto } from '@/shared/api/countries'
import { getAllCountries } from '@/shared/api/countries'
import {
  buildSeriesModalLaunchPayload,
  deleteEventSeries,
  type EventSeriesItem,
  FORECAST_KIND_BADGE,
  getEventSeriesById,
  listEventSeries,
  type SeriesModalLaunchPayload,
} from '@/shared/api/event-series'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import type {
  OrganizationCountryMembershipDto,
  OrganizationCountryRole,
  OrganizationMemberDto,
  OrganizationMembershipStatusPhase,
  OrganizationRelatedEventDto,
  OrganizationResponseDto,
  OrganizationScope,
  OrganizationType,
} from '@/shared/api/organizations'
import {
  addOrganizationCountryMembership,
  addOrganizationMember,
  deleteOrganization,
  getOrganizationCountryMemberships,
  getOrganizationMembers,
  getOrganizationRelatedEvents,
  getOrganizations,
  getOrganizationsTree,
  INTERNATIONAL_ORG_TYPES,
  isInternationalOrgType,
  NON_COMPANY_ORG_TYPES,
  ORGANIZATION_COUNTRY_ROLE_LABEL,
  ORGANIZATION_SCOPE_LABEL,
  ORGANIZATION_TYPE_HUE,
  ORGANIZATION_TYPE_LABEL,
  removeOrganizationCountryMembership,
  removeOrganizationMember,
  updateOrganization,
  updateOrganizationCountryMembership,
} from '@/shared/api/organizations'
import { getAllPersons } from '@/shared/api/persons'
import { getUploadImageUrl } from '@/shared/api/upload'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { useDocumentTitle } from '@/shared/hooks/use-document-title.hook'
import { parseIsoDateParts } from '@/shared/lib/iso-date'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog'
import { CountryPicker } from '@/shared/ui/country-picker'
import { PersonSelectModal } from '@/shared/ui/person-select-modal/person-select-modal'
import { notify } from '@/shared/ui/toast'
import { PositionDefinitionsSection } from '@/widgets/country/country-detail/ui/position-definitions-section.widget'
import { EventRegisterModal } from '@/widgets/event-form/ui/event-register-modal'
import { EventSeriesFormModal } from '@/widgets/event-series/event-series-quick-create-modal'
import { OrganizationQuickCreateModal } from '@/widgets/organization/organization-quick-create-modal'

type HubViewTab = 'international' | 'series' | 'domestic' | 'all'
type SeriesRadarFilter = 'ALL' | 'UPCOMING' | 'OVERDUE' | 'PENDING'
type SeriesSortMode = 'SOONEST' | 'TITLE'
type OrgSortKey = 'founded' | 'name' | 'members'
type OrgSortState = { key: OrgSortKey; dir: 'asc' | 'desc' }

type OrgDetailTab =
  | 'countries'
  | 'series'
  | 'events'
  | 'members'
  | 'edit'
  | 'positions'

/** 유형별 시그니처 컬러 — 정본은 shared/api/organizations(등록 모달 섹션 점도 같은 색) */
const ORG_TYPE_HUE = ORGANIZATION_TYPE_HUE

const COUNTRY_ROLE_OPTIONS: OrganizationCountryRole[] = [
  'FOUNDER',
  'MEMBER',
  'DIALOGUE_PARTNER',
  'OBSERVER',
  'SECRETARIAT_HOST',
  'SUSPENDED',
  'EXPELLED',
  'OTHER',
]

function isValidDetailTab(raw: string | null): raw is OrgDetailTab {
  return (
    raw === 'countries' ||
    raw === 'series' ||
    raw === 'events' ||
    raw === 'members' ||
    raw === 'edit' ||
    raw === 'positions'
  )
}

function isValidViewTab(raw: string | null): raw is HubViewTab {
  return (
    raw === 'all' ||
    raw === 'international' ||
    raw === 'series' ||
    raw === 'domestic'
  )
}

/* ── 존속 연대표 계산 (/companies와 동일한 비례 눈금 규약) ── */

const TICK_STEPS = [5, 10, 20, 25, 50, 100, 200, 250, 500]

interface OrgAxis {
  from: number
  to: number
  ticks: number[]
}

function startYearOf(org: OrganizationResponseDto): number | null {
  return parseIsoDateParts(org.foundedDate)?.year ?? null
}

function endYearOf(org: OrganizationResponseDto): number | null {
  return parseIsoDateParts(org.dissolvedDate)?.year ?? null
}

function formatSignedYear(year: number): string {
  return year < 0 ? `BC ${Math.abs(year)}` : String(year)
}

function formatOrgLifespan(org: OrganizationResponseDto): string | null {
  const s = startYearOf(org)
  const e = endYearOf(org)
  if (s == null && e == null) return null
  if (s != null && e == null) return `${formatSignedYear(s)} – 현재`
  if (s == null && e != null) return `~ ${formatSignedYear(e)}`
  return `${formatSignedYear(s!)} – ${formatSignedYear(e!)}`
}

function buildOrgAxis(
  orgs: OrganizationResponseDto[],
  currentYear: number,
): OrgAxis | null {
  const starts = orgs
    .map(startYearOf)
    .filter((yr): yr is number => yr != null)
  if (starts.length === 0) return null
  const earliest = Math.min(...starts)
  const span = Math.max(currentYear - earliest, 10)
  const step = TICK_STEPS.find((c) => span / c <= 5) ?? 500
  const from = Math.floor((earliest - span * 0.04) / step) * step
  const ticks: number[] = []
  for (let tick = from; tick <= currentYear - step * 0.45; tick += step) {
    ticks.push(tick)
  }
  return { from, to: currentYear, ticks }
}

function axisPercent(axis: OrgAxis, year: number): number {
  return Math.min(
    100,
    Math.max(0, ((year - axis.from) / Math.max(axis.to - axis.from, 1)) * 100),
  )
}

function formatMembershipPeriod(m: OrganizationCountryMembershipDto): string {
  const fmt = (era: 'BC' | 'AD' | null, yr: number | null) => {
    if (yr == null) return null
    return era === 'BC' ? `BC ${yr}` : `${yr}`
  }
  const s = fmt(m.startEra, m.startYear)
  const e = fmt(m.endEra, m.endYear)
  if (!s && !e) return ''
  if (s && !e) return `${s} – 현재`
  if (!s && e) return `~ ${e}`
  return `${s} – ${e}`
}

function formatStatusPhasePeriod(
  phase: OrganizationMembershipStatusPhase,
): string {
  const fmt = (era?: 'BC' | 'AD' | null, yr?: number | null) => {
    if (yr == null) return null
    return era === 'BC' ? `BC ${yr}` : `${yr}`
  }
  const s = fmt(phase.startEra, phase.startYear)
  const e = fmt(phase.endEra, phase.endYear)
  if (!s && !e) return ''
  if (s && !e) return `${s}–현재`
  if (!s && e) return `~${e}`
  return `${s}–${e}`
}

function formatEventDateBrief(
  iso: string | null,
  precision?: string | null,
): string {
  if (!iso) return '연도 미상'
  const neg = iso.startsWith('-')
  const body = neg ? iso.slice(1) : iso
  const m = body.match(/^(\d{1,6})-(\d{1,2})-(\d{1,2})/)
  if (!m) return iso.slice(0, 10)
  const yr = `${neg ? 'BC ' : ''}${Number.parseInt(m[1], 10)}`
  if (precision === 'year') return `${yr}년`
  const mo = String(Number.parseInt(m[2], 10)).padStart(2, '0')
  if (precision === 'month') return `${yr}.${mo}`
  const dy = String(Number.parseInt(m[3], 10)).padStart(2, '0')
  return `${yr}.${mo}.${dy}`
}

/* ── 로고·이니셜 마크 ── */

function OrgMark({
  org,
  size = 30,
}: {
  org: Pick<OrganizationResponseDto, 'name' | 'shortName' | 'logoUrl' | 'type'>
  size?: number
}) {
  const src = org.logoUrl ? getUploadImageUrl(org.logoUrl) : null
  const [broken, setBroken] = useState(false)
  const hue = ORG_TYPE_HUE[org.type] ?? '#6366f1'
  const initial = (
    org.shortName?.trim().slice(0, 2) ||
    org.name.trim().slice(0, 1) ||
    '·'
  ).toUpperCase()
  const showImg = Boolean(src) && !broken

  return (
    <MarkBox $size={size} $hue={hue} $hasImg={showImg} aria-hidden>
      {showImg ? (
        <img src={src!} alt="" onError={() => setBroken(true)} />
      ) : (
        initial
      )}
    </MarkBox>
  )
}

function OrgLifespanBar({
  org,
  axis,
}: {
  org: OrganizationResponseDto
  axis: OrgAxis | null
}) {
  const start = startYearOf(org)
  const end = endYearOf(org)
  const hue = ORG_TYPE_HUE[org.type] ?? '#6366f1'
  const ongoing = end == null

  if (!axis || start == null) {
    return <LifespanFallback>—</LifespanFallback>
  }
  const left = axisPercent(axis, start)
  const right = axisPercent(axis, end ?? axis.to)
  const width = Math.max(right - left, 1.4)

  return (
    <LifespanTrackWrap>
      <LifespanTrack>
        {axis.ticks.map((tick) => (
          <AxisGridTick
            key={tick}
            style={{ left: `${axisPercent(axis, tick)}%` }}
          />
        ))}
        <LifespanFill
          $hue={hue}
          $ongoing={ongoing}
          style={{ left: `${left}%`, width: `${width}%` }}
        />
      </LifespanTrack>
      <LifespanYearText>{formatOrgLifespan(org)}</LifespanYearText>
    </LifespanTrackWrap>
  )
}

/* ───────────────────────── Series Forecast Card (Ledger 스타일) ───────────────────────── */

function SeriesCardItem({
  series,
  expanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onLaunchRegisterModal,
  showOrganizationLink = false,
  onSelectOrganization,
}: {
  series: EventSeriesItem
  expanded: boolean
  onToggleExpand: () => void
  onEdit: () => void
  onDelete: () => void
  onLaunchRegisterModal: (payload: SeriesModalLaunchPayload) => void
  showOrganizationLink?: boolean
  onSelectOrganization?: (orgId: string) => void
}) {
  const detailQuery = useQuery({
    queryKey: ['event-series', 'detail', series.id],
    queryFn: () => getEventSeriesById(series.id),
    enabled: expanded,
    staleTime: 30_000,
  })

  const badge = FORECAST_KIND_BADGE[series.forecast.kind]
  const intermediateGaps = (series.missingRanges ?? []).filter(
    (gap) => !gap.isLeadingGap,
  )
  const leadingGap = (series.missingRanges ?? []).find(
    (gap) => gap.isLeadingGap,
  )

  return (
    <SeriesCard $tone={badge.tone}>
      <SeriesCardTop>
        <SeriesTitleBlock>
          <SeriesTitleRow>
            <SeriesName>{series.title}</SeriesName>
            {series.shortTitle && (
              <SeriesShort>{series.shortTitle}</SeriesShort>
            )}
            <MetaPill $accent>{series.forecast.cadenceLabel}</MetaPill>
            <MetaPill $mono>역대 {series.editionCount}회</MetaPill>
            {series.hostRotationEnabled && (
              <MetaPill title="회원국 또는 지정 순번에 따라 차기 의장국을 자동 추론합니다">
                순환 의장국 추론
              </MetaPill>
            )}
          </SeriesTitleRow>
          {(showOrganizationLink && series.organization) ||
          series.hostRotationRule ? (
            <SeriesSubMetaRow>
              {showOrganizationLink && series.organization && (
                <span>
                  주관{' '}
                  {onSelectOrganization ? (
                    <OrgJumpBtn
                      type="button"
                      onClick={() =>
                        onSelectOrganization(series.organization!.id)
                      }
                    >
                      {series.organization.name}
                    </OrgJumpBtn>
                  ) : (
                    <strong>{series.organization.name}</strong>
                  )}
                </span>
              )}
              {series.hostRotationRule && (
                <span>순번 규칙: {series.hostRotationRule}</span>
              )}
            </SeriesSubMetaRow>
          ) : null}
        </SeriesTitleBlock>

        <SeriesTopActions>
          <GhostSmallBtn
            type="button"
            onClick={onEdit}
            title="주기·차기 일정 설정"
          >
            <FiEdit2 size={12} /> 주기·일정
          </GhostSmallBtn>
          <DangerIconBtn
            type="button"
            onClick={onDelete}
            aria-label={`${series.title} 시리즈 삭제`}
            title="시리즈 삭제"
          >
            <FiTrash2 size={13} />
          </DangerIconBtn>
        </SeriesTopActions>
      </SeriesCardTop>

      <ForecastStrip $tone={badge.tone}>
        <ForecastStripLeft>
          <ForecastTonePill $tone={badge.tone}>
            <StatusDot $tone={badge.tone} aria-hidden />
            {badge.label}
          </ForecastTonePill>
          <ForecastHeadline>{series.forecast.headline}</ForecastHeadline>
          {series.forecast.hostCountryIsEstimated &&
            series.forecast.hostCountry && (
              <MetaPill>순번 추론</MetaPill>
            )}
          {series.forecast.note && (
            <ForecastMemo>· {series.forecast.note}</ForecastMemo>
          )}
        </ForecastStripLeft>
        <ForecastStripRight>
          {series.forecast.scheduledEventId ? (
            <SeriesPrimaryLink
              to={pathKeys.events.detail(series.forecast.scheduledEventId)}
            >
              차기 사건 보기 <FiArrowUpRight size={13} />
            </SeriesPrimaryLink>
          ) : (
            series.forecast.kind !== 'ENDED' &&
            series.forecast.prefill && (
              <SeriesPrimaryBtn
                type="button"
                onClick={() =>
                  onLaunchRegisterModal(buildSeriesModalLaunchPayload(series))
                }
              >
                <FiPlus size={13} /> 차기 회차 등록
              </SeriesPrimaryBtn>
            )
          )}
        </ForecastStripRight>
      </ForecastStrip>

      {intermediateGaps.length > 0 && (
        <MissingGapBar>
          <MissingGapText>
            <FiAlertCircle size={13} />
            <span>
              중간 결번:{' '}
              {intermediateGaps
                .map((g) =>
                  g.fromEdition === g.toEdition
                    ? `제${g.fromEdition}차`
                    : `제${g.fromEdition}–${g.toEdition}차`,
                )
                .join(', ')}{' '}
              미등록
            </span>
          </MissingGapText>
          <MissingGapActions>
            {intermediateGaps.slice(0, 3).map((g) => (
              <MissingQuickBtn
                key={`${g.fromEdition}-${g.toEdition}`}
                type="button"
                onClick={() =>
                  onLaunchRegisterModal(
                    buildSeriesModalLaunchPayload(series, {
                      overrideEdition: g.fromEdition,
                    }),
                  )
                }
              >
                + 제{g.fromEdition}차 등록
              </MissingQuickBtn>
            ))}
          </MissingGapActions>
        </MissingGapBar>
      )}

      <SeriesFooterRow>
        <SeriesFooterLeft>
          <ExpandEditionsBtn type="button" onClick={onToggleExpand}>
            {expanded ? (
              <FiChevronDown size={13} />
            ) : (
              <FiChevronRight size={13} />
            )}
            {expanded ? '역대 회차 접기' : `역대 회차 (${series.editionCount})`}
          </ExpandEditionsBtn>
          {leadingGap && (
            <LeadingGapHint>
              초기{' '}
              {leadingGap.fromEdition === leadingGap.toEdition
                ? `제${leadingGap.fromEdition}차`
                : `제${leadingGap.fromEdition}–${leadingGap.toEdition}차`}{' '}
              미등록 ·{' '}
              <LeadingGapBtn
                type="button"
                onClick={() =>
                  onLaunchRegisterModal(
                    buildSeriesModalLaunchPayload(series, {
                      overrideEdition: leadingGap.fromEdition,
                    }),
                  )
                }
              >
                + 제{leadingGap.fromEdition}차 등록
              </LeadingGapBtn>
            </LeadingGapHint>
          )}
        </SeriesFooterLeft>
        {series.latestEdition && !expanded && (
          <LatestMeta>
            최근:{' '}
            <Link to={pathKeys.events.detail(series.latestEdition.id)}>
              {series.latestEdition.editionBadge
                ? `${series.latestEdition.editionBadge} · `
                : ''}
              {series.latestEdition.title}
            </Link>
            {series.latestEdition.startDate ? (
              <span className="date">
                {' '}
                (
                {formatEventDateBrief(
                  series.latestEdition.startDate,
                  series.latestEdition.startDatePrecision,
                )}
                )
              </span>
            ) : null}
          </LatestMeta>
        )}
      </SeriesFooterRow>

      {expanded && (
        <EditionsTable>
          {detailQuery.isLoading ? (
            <InlineEmptyNote>회차 목록을 불러오는 중…</InlineEmptyNote>
          ) : (detailQuery.data?.editions ?? []).length === 0 ? (
            <InlineEmptyNote>
              아직 등록된 회차 사건이 없습니다. 상단{' '}
              <strong>+ 차기 회차 등록</strong>으로 첫 회차를 추가해 보세요.
            </InlineEmptyNote>
          ) : (
            (detailQuery.data?.editions ?? []).map((ed) => (
              <EditionLedgerRow key={ed.id}>
                <EditionDateCol>
                  {formatEventDateBrief(ed.startDate, ed.startDatePrecision)}
                </EditionDateCol>
                <EditionMainCol>
                  {ed.editionBadge && (
                    <EditionNumBadge>{ed.editionBadge}</EditionNumBadge>
                  )}
                  <EditionEventLink to={pathKeys.events.detail(ed.id)}>
                    {ed.title}
                    <FiExternalLink size={11} />
                  </EditionEventLink>
                  {ed.isFuture && <FuturePill>예정</FuturePill>}
                </EditionMainCol>
                <EditionHostCol>
                  {ed.hostCountry && (
                    <span>
                      {ed.hostCountry.flagEmoji
                        ? `${ed.hostCountry.flagEmoji} `
                        : ''}
                      {ed.hostCountry.name}
                    </span>
                  )}
                  {ed.location && <span>· {ed.location}</span>}
                </EditionHostCol>
              </EditionLedgerRow>
            ))
          )}
        </EditionsTable>
      )}
    </SeriesCard>
  )
}

/* ───────────────────────── Main Hub Page ───────────────────────── */

export const OrganizationsListPage: React.FC = () => {
  useDocumentTitle('국제기구 · 다자협의체 · 조직')
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const playClickSound = useClickSound()

  const viewParam = searchParams.get('view')
  const [hubView, setHubView] = useState<HubViewTab>(() =>
    isValidViewTab(viewParam) ? viewParam : 'international',
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('list')
  const [filterCountryId, setFilterCountryId] = useState('')
  const [filterHistoricalCountryId, setFilterHistoricalCountryId] = useState('')
  const [filterType, setFilterType] = useState<OrganizationType | ''>('')
  const [orgSort, setOrgSort] = useState<OrgSortState>({
    key: 'founded',
    dir: 'asc',
  })

  const [selectedOrg, setSelectedOrg] =
    useState<OrganizationResponseDto | null>(null)
  const [detailTab, setDetailTab] = useState<OrgDetailTab>('countries')

  // 모달 상태
  const [quickOrgModalOpen, setQuickOrgModalOpen] = useState(false)
  const [seriesModalTarget, setSeriesModalTarget] = useState<{
    open: boolean
    initial: EventSeriesItem | null
    defaultOrgId: string | null
    defaultTitle: string
  }>({ open: false, initial: null, defaultOrgId: null, defaultTitle: '' })
  const [seriesRegisterPayload, setSeriesRegisterPayload] =
    useState<SeriesModalLaunchPayload | null>(null)
  const [seriesRadarFilter, setSeriesRadarFilter] =
    useState<SeriesRadarFilter>('ALL')
  const [seriesSortMode, setSeriesSortMode] =
    useState<SeriesSortMode>('SOONEST')
  const [expandedSeriesIds, setExpandedSeriesIds] = useState<Set<string>>(
    () => {
      const s = searchParams.get('series')
      return s ? new Set([s]) : new Set()
    },
  )

  // 회원국 추가·편집 상태
  const [countryRoleToAdd, setCountryRoleToAdd] =
    useState<OrganizationCountryRole>('MEMBER')
  const [countryJoinYearInput, setCountryJoinYearInput] = useState('')
  const [countryPickerOpen, setCountryPickerOpen] = useState(false)
  const [editingMembershipId, setEditingMembershipId] = useState<string | null>(
    null,
  )
  const [membershipYearDraft, setMembershipYearDraft] = useState<{
    startYear: string
    endYear: string
    notes: string
    statusHistory: Array<{
      role: OrganizationCountryRole
      startYear: string
      endYear: string
      notes: string
    }>
  }>({ startYear: '', endYear: '', notes: '', statusHistory: [] })

  // 소속 인물 추가 상태
  const [memberRoleTitle, setMemberRoleTitle] = useState('위원')
  const [memberPickerOpen, setMemberPickerOpen] = useState(false)

  // 기본 정보 인라인 수정 폼
  const [editForm, setEditForm] = useState<{
    name: string
    shortName: string
    localName: string
    type: OrganizationType
    scope: OrganizationScope | ''
    predecessorOrganizationId: string
    foundedDate: string
    dissolvedDate: string
    websiteUrl: string
    logoUrl: string
    description: string
  }>({
    name: '',
    shortName: '',
    localName: '',
    type: 'MULTILATERAL_FORUM',
    scope: '',
    predecessorOrganizationId: '',
    foundedDate: '',
    dissolvedDate: '',
    websiteUrl: '',
    logoUrl: '',
    description: '',
  })

  // ESC로 우측 인스펙터 닫기 (모달이 열려 있지 않을 때)
  useEffect(() => {
    if (
      !selectedOrg ||
      quickOrgModalOpen ||
      seriesModalTarget.open ||
      Boolean(seriesRegisterPayload) ||
      countryPickerOpen ||
      memberPickerOpen
    ) {
      return
    }
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        setSelectedOrg(null)
        const next = new URLSearchParams(searchParams)
        next.delete('selected')
        next.delete('tab')
        setSearchParams(next, { replace: true })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    selectedOrg,
    quickOrgModalOpen,
    seriesModalTarget.open,
    seriesRegisterPayload,
    countryPickerOpen,
    memberPickerOpen,
    searchParams,
    setSearchParams,
  ])

  // 국가 기준 데이터
  const countriesQuery = useQuery({
    queryKey: ['countries-all', 'organizations-hub'],
    queryFn: () => getAllCountries(),
    staleTime: 5 * 60_000,
  })
  const historicalCountriesQuery = useQuery({
    queryKey: ['historical-countries-all', 'organizations-hub'],
    queryFn: () => getAllHistoricalCountries(),
    staleTime: 5 * 60_000,
  })
  const countries: CountryResponseDto[] = countriesQuery.data ?? []
  const historicalCountries: HistoricalCountryResponseDto[] =
    historicalCountriesQuery.data ?? []

  // 전체 기구·조직 정본(기업 완전 제외!) — 탭 건수·계보 점프·목록 공유
  const orgQueryParams = useMemo(() => {
    const p: {
      countryId?: string
      historicalCountryId?: string
      excludeCompanies: true
    } = { excludeCompanies: true }
    if (hubView !== 'international') {
      if (filterCountryId) p.countryId = filterCountryId
      if (filterHistoricalCountryId) {
        p.historicalCountryId = filterHistoricalCountryId
      }
    }
    return p
  }, [filterCountryId, filterHistoricalCountryId, hubView])

  const organizationsQuery = useQuery({
    queryKey: ['organizations', 'hub-list-non-company', orgQueryParams],
    queryFn: () => getOrganizations(getApiConnection(), orgQueryParams),
  })

  const organizationsTreeQuery = useQuery({
    queryKey: ['organizations', 'hub-tree-non-company', orgQueryParams],
    queryFn: () => getOrganizationsTree(getApiConnection(), orgQueryParams),
    enabled: hubView !== 'series' && viewMode === 'tree',
  })

  // 정기 시리즈 카탈로그 (상단 요약 숫자 + `series` 탭 공용)
  const allSeriesQuery = useQuery({
    queryKey: [
      'event-series',
      'catalog',
      hubView === 'series' ? searchQuery.trim() : '',
    ],
    queryFn: () =>
      listEventSeries(
        hubView === 'series' && searchQuery.trim()
          ? { q: searchQuery.trim() }
          : undefined,
      ),
    staleTime: 30_000,
  })

  // 선택 조직 상세 탭 쿼리들
  const countryMembershipsQuery = useQuery({
    queryKey: ['organization-country-memberships', selectedOrg?.id],
    queryFn: () =>
      selectedOrg
        ? getOrganizationCountryMemberships(getApiConnection(), selectedOrg.id)
        : Promise.resolve([] as OrganizationCountryMembershipDto[]),
    enabled: Boolean(selectedOrg?.id),
  })

  const orgSeriesQuery = useQuery({
    queryKey: ['event-series', 'by-org', selectedOrg?.id],
    queryFn: () =>
      selectedOrg
        ? listEventSeries({ organizationId: selectedOrg.id })
        : Promise.resolve([] as EventSeriesItem[]),
    enabled: Boolean(selectedOrg?.id),
  })

  const orgEventsQuery = useQuery({
    queryKey: ['organization-events', selectedOrg?.id],
    queryFn: () =>
      selectedOrg
        ? getOrganizationRelatedEvents(getApiConnection(), selectedOrg.id)
        : Promise.resolve([] as OrganizationRelatedEventDto[]),
    enabled: Boolean(selectedOrg?.id) && detailTab === 'events',
  })

  const membersQuery = useQuery({
    queryKey: ['organization-members', selectedOrg?.id],
    queryFn: () =>
      selectedOrg
        ? getOrganizationMembers(getApiConnection(), selectedOrg.id)
        : Promise.resolve([] as OrganizationMemberDto[]),
    enabled: Boolean(selectedOrg?.id),
  })

  const allPersonsQuery = useQuery({
    queryKey: ['persons', 'all'],
    queryFn: () => getAllPersons(),
    enabled: memberPickerOpen,
  })

  const allOrgsForLineageQuery = useQuery({
    queryKey: ['organizations', 'all-for-lineage-non-company'],
    queryFn: () => getOrganizations(getApiConnection(), { excludeCompanies: true }),
    enabled: Boolean(selectedOrg?.id),
    staleTime: 60_000,
  })

  const syncEditForm = (org: OrganizationResponseDto) => {
    setEditForm({
      name: org.name,
      shortName: org.shortName ?? '',
      localName: org.localName ?? '',
      type: org.type === 'COMPANY' ? 'OTHER' : org.type,
      scope: org.scope ?? '',
      predecessorOrganizationId: org.predecessorOrganizationId ?? '',
      foundedDate: org.foundedDate ? org.foundedDate.slice(0, 10) : '',
      dissolvedDate: org.dissolvedDate ? org.dissolvedDate.slice(0, 10) : '',
      websiteUrl: org.websiteUrl ?? '',
      logoUrl: org.logoUrl ?? '',
      description: org.description ?? '',
    })
  }

  const openDetail = (
    org: OrganizationResponseDto,
    preferredTab?: OrgDetailTab,
  ) => {
    setSelectedOrg(org)
    const defaultTab: OrgDetailTab =
      preferredTab ??
      (isInternationalOrgType(org.type) ? 'countries' : 'edit')
    setDetailTab(defaultTab)
    syncEditForm(org)
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('selected', org.id)
    nextParams.set('tab', defaultTab)
    setSearchParams(nextParams, { replace: true })
    playClickSound()
  }

  const closeDetail = () => {
    setSelectedOrg(null)
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('selected')
    nextParams.delete('tab')
    setSearchParams(nextParams, { replace: true })
  }

  const jumpToLineageOrg = (targetOrgId: string) => {
    const pool =
      allOrgsForLineageQuery.data ?? organizationsQuery.data ?? []
    const found = pool.find((item) => item.id === targetOrgId)
    if (found) {
      openDetail(found)
    } else {
      navigate(
        `/organizations?view=all&selected=${encodeURIComponent(targetOrgId)}`,
      )
    }
  }

  // URL 쿼리 동기화
  useEffect(() => {
    const v = searchParams.get('view')
    if (isValidViewTab(v) && v !== hubView) {
      setHubView(v)
    }
    const sId = searchParams.get('series')
    if (sId) {
      setExpandedSeriesIds((prev) =>
        prev.has(sId) ? prev : new Set([...prev, sId]),
      )
    }
  }, [searchParams, hubView])

  useEffect(() => {
    const selectedId = searchParams.get('selected')
    const tabParam = searchParams.get('tab')
    const rawList = organizationsQuery.data ?? []
    if (!selectedId || rawList.length === 0) return
    const target = rawList.find((item) => item.id === selectedId)
    if (target && selectedOrg?.id !== target.id) {
      if (hubView === 'series') {
        setHubView(
          isInternationalOrgType(target.type) ? 'international' : 'all',
        )
      }
      const nextTab: OrgDetailTab = isValidDetailTab(tabParam)
        ? tabParam
        : isInternationalOrgType(target.type)
          ? 'countries'
          : 'edit'
      setSelectedOrg(target)
      setDetailTab(nextTab)
      syncEditForm(target)
    }
  }, [organizationsQuery.data, searchParams, selectedOrg?.id, hubView])

  // 기업(COMPANY) 원천 차단된 기구·조직 모집단
  const allNonCompanyOrgs = useMemo(
    () => (organizationsQuery.data ?? []).filter((o) => o.type !== 'COMPANY'),
    [organizationsQuery.data],
  )

  const tabCounts = useMemo(() => {
    let intl = 0
    let domestic = 0
    for (const o of allNonCompanyOrgs) {
      if (isInternationalOrgType(o.type)) intl += 1
      else domestic += 1
    }
    return {
      international: intl,
      domestic,
      all: allNonCompanyOrgs.length,
      series: (allSeriesQuery.data ?? []).length,
    }
  }, [allNonCompanyOrgs, allSeriesQuery.data])

  // 현재 탭 기준 모집단(유형 칩 건수 계산용)
  const viewScopedOrgs = useMemo(() => {
    if (hubView === 'international') {
      return allNonCompanyOrgs.filter((o) => isInternationalOrgType(o.type))
    }
    if (hubView === 'domestic') {
      return allNonCompanyOrgs.filter((o) => !isInternationalOrgType(o.type))
    }
    return allNonCompanyOrgs
  }, [allNonCompanyOrgs, hubView])

  const typeFacetCounts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const counts = new Map<OrganizationType, number>()
    for (const org of viewScopedOrgs) {
      if (
        q &&
        !(
          org.name.toLowerCase().includes(q) ||
          (org.shortName?.toLowerCase().includes(q) ?? false) ||
          (org.localName?.toLowerCase().includes(q) ?? false) ||
          (org.description?.toLowerCase().includes(q) ?? false)
        )
      ) {
        continue
      }
      counts.set(org.type, (counts.get(org.type) ?? 0) + 1)
    }
    return counts
  }, [viewScopedOrgs, searchQuery])

  const availableTypesInView = useMemo(() => {
    const base =
      hubView === 'international'
        ? INTERNATIONAL_ORG_TYPES
        : hubView === 'domestic'
          ? NON_COMPANY_ORG_TYPES.filter(
              (t) => !INTERNATIONAL_ORG_TYPES.includes(t),
            )
          : NON_COMPANY_ORG_TYPES
    return base.filter(
      (t) => (typeFacetCounts.get(t) ?? 0) > 0 || filterType === t,
    )
  }, [hubView, typeFacetCounts, filterType])

  const filteredOrganizations = useMemo(() => {
    let items = viewScopedOrgs
    if (filterType) {
      items = items.filter((org) => org.type === filterType)
    }
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      items = items.filter(
        (org) =>
          org.name.toLowerCase().includes(q) ||
          (org.shortName?.toLowerCase().includes(q) ?? false) ||
          (org.localName?.toLowerCase().includes(q) ?? false) ||
          (org.description?.toLowerCase().includes(q) ?? false),
      )
    }

    const dir = orgSort.dir === 'asc' ? 1 : -1
    return [...items].sort((a, b) => {
      if (orgSort.key === 'name') {
        return a.name.localeCompare(b.name, 'ko') * dir
      }
      if (orgSort.key === 'members') {
        const ma = (a.countryMemberCount ?? 0) * 100 + (a.eventSeriesCount ?? 0)
        const mb = (b.countryMemberCount ?? 0) * 100 + (b.eventSeriesCount ?? 0)
        if (ma !== mb) return (ma - mb) * dir
        return a.name.localeCompare(b.name, 'ko')
      }
      const ya = startYearOf(a)
      const yb = startYearOf(b)
      if (ya == null && yb == null) return a.name.localeCompare(b.name, 'ko')
      if (ya == null) return 1
      if (yb == null) return -1
      return (ya - yb) * dir || a.name.localeCompare(b.name, 'ko')
    })
  }, [viewScopedOrgs, filterType, searchQuery, orgSort])

  const currentYear = new Date().getFullYear()
  const orgAxis = useMemo(
    () => buildOrgAxis(viewScopedOrgs, currentYear),
    [viewScopedOrgs, currentYear],
  )

  const toggleOrgSort = (key: OrgSortKey) => {
    setOrgSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: key === 'members' ? 'desc' : 'asc' },
    )
  }

  const seriesRadarCounts = useMemo(() => {
    const raw = allSeriesQuery.data ?? []
    let upcoming = 0
    let overdue = 0
    let pending = 0
    for (const s of raw) {
      const k = s.forecast.kind
      if (k === 'CONFIRMED' || k === 'SCHEDULED_EVENT' || k === 'ESTIMATED') {
        upcoming += 1
      } else if (k === 'OVERDUE') {
        overdue += 1
      } else if (k === 'POSTPONED' || k === 'TBD') {
        pending += 1
      }
    }
    return { all: raw.length, upcoming, overdue, pending }
  }, [allSeriesQuery.data])

  const filteredSeriesCatalog = useMemo(() => {
    const raw = allSeriesQuery.data ?? []
    const matched = raw.filter((s) => {
      const k = s.forecast.kind
      if (seriesRadarFilter === 'UPCOMING') {
        return (
          k === 'CONFIRMED' || k === 'SCHEDULED_EVENT' || k === 'ESTIMATED'
        )
      }
      if (seriesRadarFilter === 'OVERDUE') return k === 'OVERDUE'
      if (seriesRadarFilter === 'PENDING') {
        return k === 'POSTPONED' || k === 'TBD'
      }
      return true
    })

    if (seriesSortMode === 'TITLE') {
      return [...matched].sort((a, b) => a.title.localeCompare(b.title, 'ko'))
    }

    const kindWeight = (k: EventSeriesItem['forecast']['kind']): number => {
      if (k === 'OVERDUE') return 0
      if (k === 'CONFIRMED' || k === 'SCHEDULED_EVENT' || k === 'ESTIMATED') {
        return 1
      }
      if (k === 'POSTPONED' || k === 'TBD') return 2
      return 3
    }

    return [...matched].sort((a, b) => {
      const wa = kindWeight(a.forecast.kind)
      const wb = kindWeight(b.forecast.kind)
      if (wa !== wb) return wa - wb
      const ma = a.forecast.monthsUntil ?? Number.POSITIVE_INFINITY
      const mb = b.forecast.monthsUntil ?? Number.POSITIVE_INFINITY
      if (ma !== mb) return ma - mb
      const ya = a.forecast.expectedYear ?? Number.POSITIVE_INFINITY
      const yb = b.forecast.expectedYear ?? Number.POSITIVE_INFINITY
      if (ya !== yb) return ya - yb
      return a.title.localeCompare(b.title, 'ko')
    })
  }, [allSeriesQuery.data, seriesRadarFilter, seriesSortMode])

  const handleSwitchHubView = (next: HubViewTab) => {
    playClickSound()
    setHubView(next)
    setFilterType('')
    if (next === 'series') {
      setSelectedOrg(null)
    }
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('view', next)
    if (next === 'series') {
      nextParams.delete('selected')
      nextParams.delete('tab')
    }
    setSearchParams(nextParams, { replace: true })
  }

  const getCountryName = (org: OrganizationResponseDto) => {
    if (org.historicalCountry?.name) return org.historicalCountry.name
    if (org.country?.name) return org.country.name
    if (org.countryId) {
      return countries.find((c) => c.id === org.countryId)?.name ?? null
    }
    if (org.historicalCountryId) {
      return (
        historicalCountries.find((c) => c.id === org.historicalCountryId)
          ?.name ?? null
      )
    }
    return null
  }

  const hasActiveOrgFilter = Boolean(
    searchQuery.trim() ||
      filterType ||
      filterCountryId ||
      filterHistoricalCountryId,
  )

  const clearOrgFilters = () => {
    setSearchQuery('')
    setFilterType('')
    setFilterCountryId('')
    setFilterHistoricalCountryId('')
  }

  // ── 회원국 CRUD 핸들러 ──
  const handleAddCountryMembership = async (picked: {
    id: string
    name: string
    isHistorical?: boolean
  }) => {
    if (!selectedOrg) return
    const yr = countryJoinYearInput.trim()
      ? Number.parseInt(countryJoinYearInput.trim(), 10)
      : null
    try {
      await addOrganizationCountryMembership(getApiConnection(), selectedOrg.id, {
        countryId: picked.isHistorical ? null : picked.id,
        historicalCountryId: picked.isHistorical ? picked.id : null,
        role: countryRoleToAdd,
        startEra: yr && yr > 0 ? 'AD' : null,
        startYear: yr && yr > 0 ? yr : null,
        sortOrder: (countryMembershipsQuery.data ?? []).length,
      })
      notify.success(
        `‘${picked.name}’을(를) ${selectedOrg.name} 회원국 목록에 등록했습니다.`,
      )
      setCountryPickerOpen(false)
      void queryClient.invalidateQueries({
        queryKey: ['organization-country-memberships', selectedOrg.id],
      })
      void queryClient.invalidateQueries({ queryKey: ['organizations'] })
    } catch (err) {
      notify.error(
        err instanceof Error ? err.message : '회원국 등록에 실패했습니다.',
      )
    }
  }

  const handleUpdateMembershipRole = async (
    membership: OrganizationCountryMembershipDto,
    role: OrganizationCountryRole,
  ) => {
    if (!selectedOrg) return
    try {
      await updateOrganizationCountryMembership(
        getApiConnection(),
        selectedOrg.id,
        membership.id,
        { role },
      )
      void queryClient.invalidateQueries({
        queryKey: ['organization-country-memberships', selectedOrg.id],
      })
    } catch (err) {
      notify.error(
        err instanceof Error ? err.message : '역할 수정에 실패했습니다.',
      )
    }
  }

  const handleSaveMembershipPeriod = async (
    membership: OrganizationCountryMembershipDto,
  ) => {
    if (!selectedOrg) return
    const parseYr = (raw: string): number | null => {
      const trimmed = raw.trim()
      if (!trimmed) return null
      const n = Number.parseInt(trimmed, 10)
      return Number.isFinite(n) && n > 0 ? n : null
    }
    const sy = parseYr(membershipYearDraft.startYear)
    const ey = parseYr(membershipYearDraft.endYear)
    const normalizedHistory: OrganizationMembershipStatusPhase[] =
      membershipYearDraft.statusHistory.map((phase) => {
        const psy = parseYr(phase.startYear)
        const pey = parseYr(phase.endYear)
        return {
          role: phase.role,
          startEra: psy ? 'AD' : null,
          startYear: psy,
          endEra: pey ? 'AD' : null,
          endYear: pey,
          notes: phase.notes.trim() || null,
        }
      })
    try {
      await updateOrganizationCountryMembership(
        getApiConnection(),
        selectedOrg.id,
        membership.id,
        {
          startEra: sy ? (membership.startEra ?? 'AD') : null,
          startYear: sy,
          endEra: ey ? (membership.endEra ?? 'AD') : null,
          endYear: ey,
          notes: membershipYearDraft.notes.trim() || null,
          statusHistory:
            normalizedHistory.length > 0 ? normalizedHistory : null,
        },
      )
      setEditingMembershipId(null)
      notify.success('가입·탈퇴 기간 및 지위 변천 이력을 저장했습니다.')
      void queryClient.invalidateQueries({
        queryKey: ['organization-country-memberships', selectedOrg.id],
      })
    } catch (err) {
      notify.error(
        err instanceof Error ? err.message : '기간 저장에 실패했습니다.',
      )
    }
  }

  const handleRemoveCountryMembership = async (
    membership: OrganizationCountryMembershipDto,
  ) => {
    if (!selectedOrg) return
    const label =
      membership.historicalCountry?.name ?? membership.country?.name ?? '국가'
    try {
      await removeOrganizationCountryMembership(
        getApiConnection(),
        selectedOrg.id,
        membership.id,
      )
      notify.success(`‘${label}’ 멤버십을 제거했습니다.`)
      void queryClient.invalidateQueries({
        queryKey: ['organization-country-memberships', selectedOrg.id],
      })
      void queryClient.invalidateQueries({ queryKey: ['organizations'] })
    } catch (err) {
      notify.error(
        err instanceof Error ? err.message : '회원국 제거에 실패했습니다.',
      )
    }
  }

  // ── 정기 시리즈 삭제 핸들러 ──
  const handleDeleteSeries = async (series: EventSeriesItem) => {
    if (
      !(await confirm({
        title: '정기 시리즈 삭제',
        message: `‘${series.title}’ 정기 시리즈를 삭제할까요?\n연결되어 있던 개별 사건(${series.editionCount}건)은 삭제되지 않고 단발 사건으로 남습니다.`,
        confirmLabel: '시리즈 삭제',
        danger: true,
      }))
    ) {
      return
    }
    try {
      await deleteEventSeries(series.id)
      notify.success(`‘${series.title}’ 정기 시리즈를 삭제했습니다.`)
      void queryClient.invalidateQueries({ queryKey: ['event-series'] })
      void queryClient.invalidateQueries({ queryKey: ['organizations'] })
    } catch (err) {
      notify.error(
        err instanceof Error ? err.message : '시리즈 삭제에 실패했습니다.',
      )
    }
  }

  // ── 소속 인물 핸들러 ──
  const handleAddMember = async (personId: string, personName: string) => {
    if (!selectedOrg) return
    try {
      await addOrganizationMember(getApiConnection(), selectedOrg.id, {
        personId,
        roleTitle: memberRoleTitle.trim() || '위원',
      })
      notify.success(
        `‘${personName}’ 인물을 ${selectedOrg.name}에 추가했습니다.`,
      )
      setMemberPickerOpen(false)
      void queryClient.invalidateQueries({
        queryKey: ['organization-members', selectedOrg.id],
      })
    } catch (error) {
      notify.error(
        error instanceof Error
          ? error.message
          : '소속 인물 추가에 실패했습니다.',
      )
    }
  }

  const handleRemoveMember = async (personId: string, personName: string) => {
    if (!selectedOrg) return
    try {
      await removeOrganizationMember(getApiConnection(), selectedOrg.id, personId)
      notify.success(`‘${personName}’ 인물을 조직에서 제거했습니다.`)
      void queryClient.invalidateQueries({
        queryKey: ['organization-members', selectedOrg.id],
      })
    } catch (error) {
      notify.error(
        error instanceof Error
          ? error.message
          : '소속 인물 제거에 실패했습니다.',
      )
    }
  }

  // ── 조직 수정·삭제 핸들러 ──
  const handleSaveEdit = async () => {
    if (!selectedOrg) return
    if (!editForm.name.trim()) {
      notify.error('기구·조직명을 입력하세요.')
      return
    }
    try {
      const updated = await updateOrganization(getApiConnection(), selectedOrg.id, {
        name: editForm.name.trim(),
        shortName: editForm.shortName.trim() || null,
        localName: editForm.localName.trim() || null,
        type: editForm.type,
        scope: editForm.scope ? editForm.scope : null,
        predecessorOrganizationId:
          editForm.predecessorOrganizationId || null,
        foundedDate: editForm.foundedDate
          ? `${editForm.foundedDate}T00:00:00.000Z`
          : null,
        dissolvedDate: editForm.dissolvedDate
          ? `${editForm.dissolvedDate}T00:00:00.000Z`
          : null,
        websiteUrl: editForm.websiteUrl.trim() || null,
        logoUrl: editForm.logoUrl.trim() || null,
        description: editForm.description.trim() || null,
      })
      setSelectedOrg(updated)
      void queryClient.invalidateQueries({ queryKey: ['organizations'] })
      notify.success('저장되었습니다.')
    } catch (err) {
      notify.error(
        err instanceof Error ? err.message : '저장에 실패했습니다.',
      )
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (
      !(await confirm({
        title: '삭제 확인',
        message: `"${name}" 기구·조직을 삭제하시겠습니까?`,
        danger: true,
      }))
    ) {
      return
    }
    playClickSound()
    try {
      await deleteOrganization(getApiConnection(), id)
      if (selectedOrg?.id === id) closeDetail()
      void queryClient.invalidateQueries({ queryKey: ['organizations'] })
      notify.success(`‘${name}’ 조직을 삭제했습니다.`)
    } catch (err) {
      notify.error(
        err instanceof Error ? err.message : '삭제하지 못했습니다.',
      )
    }
  }

  const renderTreeNode = (node: any, depth = 0): React.ReactNode => {
    if (node.type === 'COMPANY') return null
    const hue = ORG_TYPE_HUE[node.type as OrganizationType] ?? '#6366f1'
    return (
      <TreeNodeWrap key={node.id} $depth={depth}>
        <TreeRowBtn
          type="button"
          $selected={selectedOrg?.id === node.id}
          onClick={() => openDetail(node)}
        >
          <TypeDot $hue={hue} aria-hidden />
          <span className="name">{node.name}</span>
          {node.shortName && <span className="short">{node.shortName}</span>}
          <span className="meta">
            {ORGANIZATION_TYPE_LABEL[node.type as OrganizationType] ?? node.type}
            {node.countryMemberCount > 0
              ? ` · 회원국 ${node.countryMemberCount}`
              : ''}
          </span>
        </TreeRowBtn>
        {node.children?.length > 0 && (
          <TreeChildren>
            {node.children.map((c: any) => renderTreeNode(c, depth + 1))}
          </TreeChildren>
        )}
      </TreeNodeWrap>
    )
  }

  const toggleSeriesExpanded = (seriesId: string) => {
    setExpandedSeriesIds((prev) => {
      const next = new Set(prev)
      if (next.has(seriesId)) next.delete(seriesId)
      else next.add(seriesId)
      return next
    })
  }

  const detailOpen = Boolean(selectedOrg) && hubView !== 'series'
  const memberships = countryMembershipsQuery.data ?? []
  const orgSeriesList = orgSeriesQuery.data ?? []
  const relatedEvents = orgEventsQuery.data ?? []

  return (
    <Workspace>
      {/* ─── 좌측 카탈로그 영역 ─── */}
      <CatalogPane $detailOpen={detailOpen}>
        {/* 상단 에디토리얼 바 */}
        <TopChrome>
          <TopHeadlineGroup>
            <AccentBar aria-hidden />
            <div>
              <PageTitle>국제기구 · 다자협의체 · 조직</PageTitle>
              <SummaryLine>
                <span>
                  국제·다자 <b>{tabCounts.international}</b>
                </span>
                <span className="sep">·</span>
                <span>
                  정기 회의 시리즈 <b>{tabCounts.series}</b>
                </span>
                {seriesRadarCounts.upcoming > 0 && (
                  <>
                    <span className="sep">·</span>
                    <span className="accent">
                      차기 예정 <b>{seriesRadarCounts.upcoming}</b>
                    </span>
                  </>
                )}
                <span className="sep">·</span>
                <CompanyDomainLink
                  to="/political-parties"
                  title="정당(당색·이념 스펙트럼·창당/합당/분당 계보·선거·내각 참여)은 전용 정당 카탈로그에서 관리합니다"
                >
                  정당 편람 <FiArrowUpRight size={12} />
                </CompanyDomainLink>
                <span className="sep">·</span>
                <CompanyDomainLink
                  to="/government?tab=departments"
                  title="국가 중앙부처·행정기관·위원회는 전용 정부·내각 카탈로그에서 관리합니다"
                >
                  정부·부처 <FiArrowUpRight size={12} />
                </CompanyDomainLink>
                <span className="sep">·</span>
                <CompanyDomainLink
                  to="/companies"
                  title="영리 기업·특허회사는 전용 기업 카탈로그에서 주가·시설·창립자와 함께 관리합니다"
                >
                  기업 <FiArrowUpRight size={12} />
                </CompanyDomainLink>
              </SummaryLine>
            </div>
          </TopHeadlineGroup>

          <HeaderActions>
            <OutlineActionBtn
              type="button"
              onClick={() => {
                playClickSound()
                setSeriesModalTarget({
                  open: true,
                  initial: null,
                  defaultOrgId: selectedOrg?.id ?? null,
                  defaultTitle: '',
                })
              }}
            >
              <FiRefreshCw size={13} />
              정기 시리즈 등록
            </OutlineActionBtn>
            <SolidActionBtn
              type="button"
              onClick={() => {
                playClickSound()
                setQuickOrgModalOpen(true)
              }}
            >
              <FiPlus size={14} />
              기구·조직 등록
            </SolidActionBtn>
          </HeaderActions>
        </TopChrome>

        {/* 도메인 뷰 탭 바 */}
        <ViewTabsBar role="tablist" aria-label="기구·조직 분류 보기">
          <ViewTabBtn
            type="button"
            role="tab"
            aria-selected={hubView === 'international'}
            $active={hubView === 'international'}
            onClick={() => handleSwitchHubView('international')}
          >
            <FiGlobe size={13} />
            국제기구 · 다자협의체 · 동맹
            <TabCount $active={hubView === 'international'}>
              {tabCounts.international}
            </TabCount>
          </ViewTabBtn>
          <ViewTabBtn
            type="button"
            role="tab"
            aria-selected={hubView === 'series'}
            $active={hubView === 'series'}
            onClick={() => handleSwitchHubView('series')}
          >
            <FiCalendar size={13} />
            정기 회의 · 차기 일정
            <TabCount $active={hubView === 'series'}>
              {tabCounts.series}
            </TabCount>
          </ViewTabBtn>
          <ViewTabBtn
            type="button"
            role="tab"
            aria-selected={hubView === 'domestic'}
            $active={hubView === 'domestic'}
            onClick={() => handleSwitchHubView('domestic')}
          >
            <FiLayers size={13} />
            비정부 · 민간 · 사회단체
            <TabCount $active={hubView === 'domestic'}>
              {tabCounts.domestic}
            </TabCount>
          </ViewTabBtn>
          <ViewTabBtn
            type="button"
            role="tab"
            aria-selected={hubView === 'all'}
            $active={hubView === 'all'}
            onClick={() => handleSwitchHubView('all')}
          >
            <FiShare2 size={13} />
            전체 기구 · 조직
            <TabCount $active={hubView === 'all'}>{tabCounts.all}</TabCount>
          </ViewTabBtn>
        </ViewTabsBar>

        {/* 검색 · 유형 패싯 · 국가 필터 바 */}
        <FilterBar>
          <SearchBox>
            <FiSearch size={14} aria-hidden />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                hubView === 'series'
                  ? '정기 회의·행사 시리즈 검색 (아세안, APEC, 쿼드, WTO, 올림픽)…'
                  : '기구·협의체·조직명, 약칭, 원어 검색 (Quad, ASEAN, APEC, NATO)…'
              }
              aria-label="기구·조직 및 정기 시리즈 검색"
            />
            {searchQuery && (
              <ClearInputBtn
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="검색어 지우기"
              >
                <FiX size={13} />
              </ClearInputBtn>
            )}
          </SearchBox>

          {hubView !== 'series' && (
            <>
              <FacetChips role="group" aria-label="기구·조직 세부 유형 필터">
                <FacetChipBtn
                  type="button"
                  $active={filterType === ''}
                  onClick={() => setFilterType('')}
                >
                  전체
                  <span className="cnt">{viewScopedOrgs.length}</span>
                </FacetChipBtn>
                {availableTypesInView.map((t) => (
                  <FacetChipBtn
                    key={t}
                    type="button"
                    $active={filterType === t}
                    onClick={() =>
                      setFilterType(filterType === t ? '' : t)
                    }
                  >
                    <TypeDot $hue={ORG_TYPE_HUE[t]} aria-hidden />
                    {ORGANIZATION_TYPE_LABEL[t]}
                    <span className="cnt">{typeFacetCounts.get(t) ?? 0}</span>
                  </FacetChipBtn>
                ))}
              </FacetChips>

              <FilterRightControls>
                {hubView !== 'international' && (
                  <>
                    <CompactSelect
                      aria-label="현대 국가 필터"
                      value={filterCountryId}
                      onChange={(e) => setFilterCountryId(e.target.value)}
                    >
                      <option value="">현대 국가 전체</option>
                      {countries.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </CompactSelect>
                    <CompactSelect
                      aria-label="역사 국가 필터"
                      value={filterHistoricalCountryId}
                      onChange={(e) =>
                        setFilterHistoricalCountryId(e.target.value)
                      }
                    >
                      <option value="">역사 국가 전체</option>
                      {historicalCountries.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </CompactSelect>
                  </>
                )}

                {hasActiveOrgFilter && (
                  <TextResetBtn type="button" onClick={clearOrgFilters}>
                    <FiX size={12} /> 초기화
                  </TextResetBtn>
                )}

                <ModeSegmented role="group" aria-label="목록 표시 방식">
                  <ModeSegBtn
                    type="button"
                    $active={viewMode === 'list'}
                    onClick={() => setViewMode('list')}
                  >
                    연대표
                  </ModeSegBtn>
                  <ModeSegBtn
                    type="button"
                    $active={viewMode === 'tree'}
                    onClick={() => setViewMode('tree')}
                  >
                    계층
                  </ModeSegBtn>
                </ModeSegmented>
              </FilterRightControls>
            </>
          )}
        </FilterBar>

        {/* 본문: 정기 회의·차기 일정 전용 뷰 vs 기구·조직 연대표 카탈로그 */}
        {hubView === 'series' ? (
          <SeriesScrollArea>
            <SeriesRadarHeader>
              <SeriesRadarSummary>
                아세안(연 2회) · APEC·쿼드·G7·G20(매년) · ASEM·WTO 각료회의(격년) 등 반복 개최 회의의 주기와 차기 일정·예상 의장국을 추적합니다.
              </SeriesRadarSummary>
              <SolidActionBtn
                type="button"
                onClick={() =>
                  setSeriesModalTarget({
                    open: true,
                    initial: null,
                    defaultOrgId: null,
                    defaultTitle: '',
                  })
                }
              >
                <FiPlus size={14} /> 새 정기 시리즈
              </SolidActionBtn>
            </SeriesRadarHeader>

            {allSeriesQuery.isLoading ? (
              <EmptyLedgerBox>정기 시리즈를 불러오는 중…</EmptyLedgerBox>
            ) : (allSeriesQuery.data ?? []).length === 0 ? (
              <EmptyLedgerBox>
                <div className="title">등록된 정기 회의·행사 시리즈가 없습니다</div>
                <div className="desc">
                  상단 <strong>+ 새 정기 시리즈</strong> 버튼으로 아세안 정상회의, 쿼드 정상회의, APEC 정상회의 등을 등록해 보세요.
                </div>
              </EmptyLedgerBox>
            ) : (
              <>
                <SeriesRadarBar aria-label="차기 일정 상태 필터 및 정렬">
                  <FacetChips>
                    <FacetChipBtn
                      type="button"
                      $active={seriesRadarFilter === 'ALL'}
                      onClick={() => setSeriesRadarFilter('ALL')}
                    >
                      전체 <span className="cnt">{seriesRadarCounts.all}</span>
                    </FacetChipBtn>
                    <FacetChipBtn
                      type="button"
                      $active={seriesRadarFilter === 'UPCOMING'}
                      onClick={() => setSeriesRadarFilter('UPCOMING')}
                    >
                      <StatusDot $tone="emerald" aria-hidden />
                      차기 예정·임박{' '}
                      <span className="cnt">{seriesRadarCounts.upcoming}</span>
                    </FacetChipBtn>
                    <FacetChipBtn
                      type="button"
                      $active={seriesRadarFilter === 'OVERDUE'}
                      onClick={() => setSeriesRadarFilter('OVERDUE')}
                    >
                      <StatusDot $tone="amber" aria-hidden />
                      예정 시점 경과·점검{' '}
                      <span className="cnt">{seriesRadarCounts.overdue}</span>
                    </FacetChipBtn>
                    <FacetChipBtn
                      type="button"
                      $active={seriesRadarFilter === 'PENDING'}
                      onClick={() => setSeriesRadarFilter('PENDING')}
                    >
                      <StatusDot $tone="rose" aria-hidden />
                      연기·미정{' '}
                      <span className="cnt">{seriesRadarCounts.pending}</span>
                    </FacetChipBtn>
                  </FacetChips>

                  <CompactSelect
                    aria-label="정기 시리즈 정렬 방식"
                    value={seriesSortMode}
                    onChange={(e) =>
                      setSeriesSortMode(e.target.value as SeriesSortMode)
                    }
                  >
                    <option value="SOONEST">차기 개최 임박·점검 순</option>
                    <option value="TITLE">이름순 (가나다)</option>
                  </CompactSelect>
                </SeriesRadarBar>

                {filteredSeriesCatalog.length === 0 ? (
                  <EmptyLedgerBox>
                    선택한 일정 상태에 해당하는 정기 시리즈가 없습니다.
                  </EmptyLedgerBox>
                ) : (
                  <SeriesCardsStack>
                    {filteredSeriesCatalog.map((series) => (
                      <SeriesCardItem
                        key={series.id}
                        series={series}
                        expanded={expandedSeriesIds.has(series.id)}
                        onToggleExpand={() => toggleSeriesExpanded(series.id)}
                        onEdit={() =>
                          setSeriesModalTarget({
                            open: true,
                            initial: series,
                            defaultOrgId: series.organizationId,
                            defaultTitle: series.title,
                          })
                        }
                        onDelete={() => void handleDeleteSeries(series)}
                        onLaunchRegisterModal={(payload) =>
                          setSeriesRegisterPayload(payload)
                        }
                        showOrganizationLink
                        onSelectOrganization={(orgId) => {
                          navigate(
                            `/organizations?view=international&selected=${encodeURIComponent(orgId)}&tab=series`,
                          )
                        }}
                      />
                    ))}
                  </SeriesCardsStack>
                )}
              </>
            )}
          </SeriesScrollArea>
        ) : organizationsQuery.isLoading ? (
          <EmptyLedgerBox>기구·조직 목록을 불러오는 중…</EmptyLedgerBox>
        ) : viewMode === 'tree' ? (
          <TreeScrollArea>
            {(organizationsTreeQuery.data ?? []).filter(
              (n) => n.type !== 'COMPANY',
            ).length === 0 ? (
              <EmptyLedgerBox>조건에 맞는 계층 조직이 없습니다.</EmptyLedgerBox>
            ) : (
              (organizationsTreeQuery.data ?? []).map((node) =>
                renderTreeNode(node),
              )
            )}
          </TreeScrollArea>
        ) : filteredOrganizations.length === 0 ? (
          <TreeScrollArea>
            <EmptyLedgerBox>
              <div className="title">
                {hasActiveOrgFilter
                  ? '조건에 맞는 기구·협의체·조직이 없습니다'
                  : '아직 등록된 기구·협의체·조직이 없습니다'}
              </div>
              <div className="desc">
                {hasActiveOrgFilter
                  ? '검색어나 필터를 초기화하거나 다른 분류 탭을 확인해 보세요.'
                  : '우측 상단 + 기구·조직 등록 버튼으로 쿼드(Quad), 아세안(ASEAN), APEC, 유엔(UN) 등을 등록해 보세요.'}
              </div>
            </EmptyLedgerBox>
          </TreeScrollArea>
        ) : (
          <TableScrollArea>
            <LedgerTableHead $compact={detailOpen}>
              <SortHeadBtn
                type="button"
                $active={orgSort.key === 'name'}
                onClick={() => toggleOrgSort('name')}
              >
                기구 · 협의체 · 조직
                <span className="cnt">{filteredOrganizations.length}</span>
                {orgSort.key === 'name' &&
                  (orgSort.dir === 'asc' ? (
                    <FiArrowUp size={11} />
                  ) : (
                    <FiArrowDown size={11} />
                  ))}
              </SortHeadBtn>

              <StaticHeadCell>유형 · 범위</StaticHeadCell>

              {!detailOpen && (
                <AxisHeadCell>
                  <SortHeadBtn
                    type="button"
                    $active={orgSort.key === 'founded'}
                    onClick={() => toggleOrgSort('founded')}
                  >
                    존속 연대표
                    {orgSort.key === 'founded' &&
                      (orgSort.dir === 'asc' ? (
                        <FiArrowUp size={11} />
                      ) : (
                        <FiArrowDown size={11} />
                      ))}
                  </SortHeadBtn>
                  {orgAxis && (
                    <AxisScaleBar aria-hidden>
                      {orgAxis.ticks.map((tick) => (
                        <AxisScaleLabel
                          key={tick}
                          style={{ left: `${axisPercent(orgAxis, tick)}%` }}
                        >
                          {formatSignedYear(tick)}
                        </AxisScaleLabel>
                      ))}
                      <AxisNowLabel>현재</AxisNowLabel>
                    </AxisScaleBar>
                  )}
                </AxisHeadCell>
              )}

              <SortHeadBtn
                type="button"
                $alignRight
                $active={orgSort.key === 'members'}
                onClick={() => toggleOrgSort('members')}
              >
                규모 · 시리즈
                {orgSort.key === 'members' &&
                  (orgSort.dir === 'asc' ? (
                    <FiArrowUp size={11} />
                  ) : (
                    <FiArrowDown size={11} />
                  ))}
              </SortHeadBtn>
            </LedgerTableHead>

            <LedgerRows>
              {filteredOrganizations.map((org) => {
                const hue = ORG_TYPE_HUE[org.type] ?? '#6366f1'
                const countryName = getCountryName(org)
                const lifespanText = formatOrgLifespan(org)
                const isSelected = selectedOrg?.id === org.id

                return (
                  <LedgerOrgRow
                    key={org.id}
                    $selected={isSelected}
                    $compact={detailOpen}
                    onClick={() => openDetail(org)}
                  >
                    <OrgIdentityCell>
                      <OrgMark org={org} size={30} />
                      <OrgTitleStack>
                        <OrgPrimaryLine>
                          <span className="name">{org.name}</span>
                          {org.shortName && (
                            <span className="short">{org.shortName}</span>
                          )}
                          {org.predecessor && (
                            <LineageInlineTag title={`전신: ${org.predecessor.name}`}>
                              ← {org.predecessor.shortName || org.predecessor.name}
                            </LineageInlineTag>
                          )}
                          {(org.successors ?? []).map((succ) => (
                            <LineageInlineTag
                              key={succ.id}
                              title={`후신: ${succ.name}`}
                            >
                              {succ.shortName || succ.name} →
                            </LineageInlineTag>
                          ))}
                        </OrgPrimaryLine>
                        <OrgSecondaryLine>
                          {detailOpen && lifespanText && (
                            <span className="mono">{lifespanText} · </span>
                          )}
                          {countryName && <span>{countryName} · </span>}
                          <span>
                            {org.description
                              ? org.description.slice(0, 60) +
                                (org.description.length > 60 ? '…' : '')
                              : (org.localName ?? '요약 설명 없음')}
                          </span>
                        </OrgSecondaryLine>
                      </OrgTitleStack>
                    </OrgIdentityCell>

                    <OrgTypeCell>
                      <TypeInlineBadge>
                        <TypeDot $hue={hue} aria-hidden />
                        <span>
                          {ORGANIZATION_TYPE_LABEL[org.type] ?? org.type}
                        </span>
                      </TypeInlineBadge>
                      {org.scope && ORGANIZATION_SCOPE_LABEL[org.scope] && (
                        <ScopeSubText>
                          {ORGANIZATION_SCOPE_LABEL[org.scope]}
                        </ScopeSubText>
                      )}
                    </OrgTypeCell>

                    {!detailOpen && (
                      <OrgTimelineCell>
                        <OrgLifespanBar org={org} axis={orgAxis} />
                      </OrgTimelineCell>
                    )}

                    <OrgMetricsCell>
                      {(org.countryMemberCount ?? 0) > 0 && (
                        <MetricPill>
                          회원국 <b>{org.countryMemberCount}</b>
                        </MetricPill>
                      )}
                      {(org.eventSeriesCount ?? 0) > 0 && (
                        <MetricPill $accent>
                          시리즈 <b>{org.eventSeriesCount}</b>
                        </MetricPill>
                      )}
                      {(org.countryMemberCount ?? 0) === 0 &&
                        (org.eventSeriesCount ?? 0) === 0 && (
                          <MutedDash>—</MutedDash>
                        )}
                      <RowChevron $selected={isSelected} aria-hidden>
                        <FiChevronRight size={14} />
                      </RowChevron>
                    </OrgMetricsCell>
                  </LedgerOrgRow>
                )
              })}
            </LedgerRows>
          </TableScrollArea>
        )}
      </CatalogPane>

      {/* ─── 우측 상세 인스펙터 패널 ─── */}
      {detailOpen && selectedOrg && (
        <InspectorPane aria-label={`${selectedOrg.name} 상세 패널`}>
          <InspectorHeader>
            <InspectorIdentity>
              <OrgMark org={selectedOrg} size={38} />
              <InspectorTitleBlock>
                <InspectorTitleRow>
                  <h2>{selectedOrg.name}</h2>
                  {selectedOrg.shortName && (
                    <span className="short">{selectedOrg.shortName}</span>
                  )}
                </InspectorTitleRow>
                <InspectorMetaRow>
                  <TypeInlineBadge>
                    <TypeDot
                      $hue={ORG_TYPE_HUE[selectedOrg.type] ?? '#6366f1'}
                      aria-hidden
                    />
                    <span>
                      {ORGANIZATION_TYPE_LABEL[selectedOrg.type] ??
                        selectedOrg.type}
                    </span>
                  </TypeInlineBadge>
                  {selectedOrg.scope && (
                    <MetaPill>
                      {ORGANIZATION_SCOPE_LABEL[selectedOrg.scope]}
                    </MetaPill>
                  )}
                  {getCountryName(selectedOrg) && (
                    <span>{getCountryName(selectedOrg)}</span>
                  )}
                  {formatOrgLifespan(selectedOrg) && (
                    <span className="mono">
                      {formatOrgLifespan(selectedOrg)}
                    </span>
                  )}
                  {selectedOrg.websiteUrl && (
                    <ExternalAnchor
                      href={selectedOrg.websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      공식 사이트 <FiExternalLink size={11} />
                    </ExternalAnchor>
                  )}
                </InspectorMetaRow>

                {(selectedOrg.predecessor ||
                  (selectedOrg.successors?.length ?? 0) > 0) && (
                  <LineageBar aria-label="기구 전신·후신 계보">
                    {selectedOrg.predecessor && (
                      <LineageChipBtn
                        type="button"
                        onClick={() =>
                          jumpToLineageOrg(selectedOrg.predecessor!.id)
                        }
                        title={`전신 기구 ‘${selectedOrg.predecessor.name}’ 상세로 이동`}
                      >
                        ← 전신: {selectedOrg.predecessor.name}
                        {selectedOrg.predecessor.shortName
                          ? ` (${selectedOrg.predecessor.shortName})`
                          : ''}
                      </LineageChipBtn>
                    )}
                    {(selectedOrg.successors ?? []).map((succ) => (
                      <LineageChipBtn
                        key={succ.id}
                        type="button"
                        onClick={() => jumpToLineageOrg(succ.id)}
                        title={`후신 기구 ‘${succ.name}’ 상세로 이동`}
                      >
                        후신: {succ.name}
                        {succ.shortName ? ` (${succ.shortName})` : ''} →
                      </LineageChipBtn>
                    ))}
                  </LineageBar>
                )}
              </InspectorTitleBlock>
            </InspectorIdentity>

            <CloseIconBtn
              type="button"
              onClick={closeDetail}
              aria-label="상세 패널 닫기"
              title="닫기 (Esc)"
            >
              <FiX size={16} />
            </CloseIconBtn>
          </InspectorHeader>

          <InspectorTabBar role="tablist">
            <InspectorTabBtn
              type="button"
              role="tab"
              aria-selected={detailTab === 'countries'}
              $active={detailTab === 'countries'}
              onClick={() => setDetailTab('countries')}
            >
              <FiGlobe size={12} />
              회원국
              <span className="cnt">{memberships.length}</span>
            </InspectorTabBtn>
            <InspectorTabBtn
              type="button"
              role="tab"
              aria-selected={detailTab === 'series'}
              $active={detailTab === 'series'}
              onClick={() => setDetailTab('series')}
            >
              <FiCalendar size={12} />
              정기 회의
              <span className="cnt">{orgSeriesList.length}</span>
            </InspectorTabBtn>
            <InspectorTabBtn
              type="button"
              role="tab"
              aria-selected={detailTab === 'events'}
              $active={detailTab === 'events'}
              onClick={() => setDetailTab('events')}
            >
              <FiLayers size={12} />
              역대 사건
              {detailTab === 'events' && (
                <span className="cnt">{relatedEvents.length}</span>
              )}
            </InspectorTabBtn>
            <InspectorTabBtn
              type="button"
              role="tab"
              aria-selected={detailTab === 'members'}
              $active={detailTab === 'members'}
              onClick={() => setDetailTab('members')}
            >
              <FiUsers size={12} />
              소속 인물
              <span className="cnt">{(membersQuery.data ?? []).length}</span>
            </InspectorTabBtn>
            <InspectorTabBtn
              type="button"
              role="tab"
              aria-selected={detailTab === 'edit'}
              $active={detailTab === 'edit'}
              onClick={() => setDetailTab('edit')}
            >
              <FiEdit2 size={12} />
              기본 정보
            </InspectorTabBtn>
            <InspectorTabBtn
              type="button"
              role="tab"
              aria-selected={detailTab === 'positions'}
              $active={detailTab === 'positions'}
              onClick={() => setDetailTab('positions')}
            >
              <FiAward size={12} />
              직위 설정
            </InspectorTabBtn>
          </InspectorTabBar>

          <InspectorBody>
            {/* 1) 회원국·파트너국 탭 */}
            {detailTab === 'countries' && (
              <TabStack>
                <SectionNoteCard>
                  <SectionNoteText>
                    창립국·정회원국·대화상대국·옵서버를 등록해 두면 정상회의·조약 사건 등록 시{' '}
                    <strong>회원국 불러오기</strong>로 해당 시점의 회원국들을 일괄 반영할 수 있습니다.
                  </SectionNoteText>
                  <InlineFormBar>
                    <CompactSelect
                      aria-label="추가할 국가 역할"
                      value={countryRoleToAdd}
                      onChange={(e) =>
                        setCountryRoleToAdd(
                          e.target.value as OrganizationCountryRole,
                        )
                      }
                    >
                      {COUNTRY_ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {ORGANIZATION_COUNTRY_ROLE_LABEL[role]}
                        </option>
                      ))}
                    </CompactSelect>
                    <FieldInput
                      type="number"
                      min={1}
                      max={9999}
                      value={countryJoinYearInput}
                      onChange={(e) => setCountryJoinYearInput(e.target.value)}
                      placeholder="가입 연도 (예: 1967)"
                      style={{ width: 148, height: 32 }}
                    />
                    <SolidActionBtn
                      type="button"
                      onClick={() => {
                        playClickSound()
                        setCountryPickerOpen(true)
                      }}
                    >
                      <FiPlus size={13} /> 국가 추가
                    </SolidActionBtn>
                  </InlineFormBar>
                </SectionNoteCard>

                {memberships.length === 0 ? (
                  <EmptyLedgerBox>
                    등록된 회원국·파트너국이 없습니다. 상단 <strong>+ 국가 추가</strong>로 참가국(예: 쿼드 4개국, 아세안 10개국)을 등록해 보세요.
                  </EmptyLedgerBox>
                ) : (
                  <ItemStack>
                    {memberships.map((m) => {
                      const countryLabel =
                        m.historicalCountry?.name ??
                        m.country?.name ??
                        '알 수 없는 국가'
                      const flag = m.country?.flagEmoji ?? null
                      const targetCountryId =
                        m.historicalCountry?.id ?? m.country?.id ?? null
                      const periodText = formatMembershipPeriod(m)
                      const isEditingRow = editingMembershipId === m.id

                      return (
                        <ItemCard key={m.id}>
                          <ItemMainRow>
                            <ItemMainInfo>
                              {targetCountryId ? (
                                <EntityLink
                                  to={pathKeys.countryDetail(targetCountryId)}
                                >
                                  {flag && <span>{flag}</span>}
                                  <strong>{countryLabel}</strong>
                                </EntityLink>
                              ) : (
                                <strong>
                                  {flag ? `${flag} ` : ''}
                                  {countryLabel}
                                </strong>
                              )}
                              {m.historicalCountry && (
                                <MetaPill>역사 국가</MetaPill>
                              )}
                              <RoleSelectPill
                                aria-label={`${countryLabel} 역할 변경`}
                                value={m.role}
                                onChange={(e) =>
                                  void handleUpdateMembershipRole(
                                    m,
                                    e.target.value as OrganizationCountryRole,
                                  )
                                }
                              >
                                {COUNTRY_ROLE_OPTIONS.map((r) => (
                                  <option key={r} value={r}>
                                    {ORGANIZATION_COUNTRY_ROLE_LABEL[r]}
                                  </option>
                                ))}
                              </RoleSelectPill>
                              {periodText && (
                                <PeriodSpan>{periodText}</PeriodSpan>
                              )}
                              {m.notes && (
                                <NoteSpan>· {m.notes}</NoteSpan>
                              )}
                            </ItemMainInfo>

                            <ItemRowBtns>
                              <GhostSmallBtn
                                type="button"
                                onClick={() => {
                                  if (isEditingRow) {
                                    setEditingMembershipId(null)
                                  } else {
                                    setEditingMembershipId(m.id)
                                    setMembershipYearDraft({
                                      startYear:
                                        m.startYear != null
                                          ? String(m.startYear)
                                          : '',
                                      endYear:
                                        m.endYear != null
                                          ? String(m.endYear)
                                          : '',
                                      notes: m.notes ?? '',
                                      statusHistory: (
                                        m.statusHistory ?? []
                                      ).map((ph) => ({
                                        role: ph.role,
                                        startYear:
                                          ph.startYear != null
                                            ? String(ph.startYear)
                                            : '',
                                        endYear:
                                          ph.endYear != null
                                            ? String(ph.endYear)
                                            : '',
                                        notes: ph.notes ?? '',
                                      })),
                                    })
                                  }
                                }}
                              >
                                기간·지위이력
                              </GhostSmallBtn>
                              <DangerIconBtn
                                type="button"
                                aria-label={`${countryLabel} 제거`}
                                onClick={() =>
                                  void handleRemoveCountryMembership(m)
                                }
                              >
                                <FiTrash2 size={12} />
                              </DangerIconBtn>
                            </ItemRowBtns>
                          </ItemMainRow>

                          {(m.statusHistory?.length ?? 0) > 0 && (
                            <StatusHistoryRow>
                              <NoteSpan>지위 변천:</NoteSpan>
                              {(m.statusHistory ?? []).map((ph, idx) => {
                                const pLabel = formatStatusPhasePeriod(ph)
                                return (
                                  <React.Fragment key={idx}>
                                    {idx > 0 && <NoteSpan>→</NoteSpan>}
                                    <MetaPill>
                                      {ORGANIZATION_COUNTRY_ROLE_LABEL[ph.role]}
                                      {pLabel ? ` (${pLabel})` : ''}
                                    </MetaPill>
                                  </React.Fragment>
                                )
                              })}
                            </StatusHistoryRow>
                          )}

                          {isEditingRow && (
                            <MembershipEditPanel>
                              <InlineFormBar>
                                <FieldInput
                                  type="number"
                                  placeholder="가입 연도 (예: 1989)"
                                  value={membershipYearDraft.startYear}
                                  onChange={(e) =>
                                    setMembershipYearDraft((d) => ({
                                      ...d,
                                      startYear: e.target.value,
                                    }))
                                  }
                                  style={{ width: 132, height: 31 }}
                                />
                                <FieldInput
                                  type="number"
                                  placeholder="탈퇴·종료 연도"
                                  value={membershipYearDraft.endYear}
                                  onChange={(e) =>
                                    setMembershipYearDraft((d) => ({
                                      ...d,
                                      endYear: e.target.value,
                                    }))
                                  }
                                  style={{ width: 132, height: 31 }}
                                />
                                <FieldInput
                                  placeholder="비고 (예: 브렉시트 탈퇴, 대화상대국 격상)"
                                  value={membershipYearDraft.notes}
                                  onChange={(e) =>
                                    setMembershipYearDraft((d) => ({
                                      ...d,
                                      notes: e.target.value,
                                    }))
                                  }
                                  style={{ flex: 1, minWidth: 150, height: 31 }}
                                />
                                <SolidActionBtn
                                  type="button"
                                  onClick={() =>
                                    void handleSaveMembershipPeriod(m)
                                  }
                                >
                                  저장
                                </SolidActionBtn>
                              </InlineFormBar>

                              <StatusHistoryEditor>
                                <StatusHistoryEditorHead>
                                  <span>
                                    다단계 지위 변천 (옵서버 → 정회원국, 일시 자격정지 등)
                                  </span>
                                  <GhostSmallBtn
                                    type="button"
                                    onClick={() =>
                                      setMembershipYearDraft((d) => ({
                                        ...d,
                                        statusHistory: [
                                          ...d.statusHistory,
                                          {
                                            role: m.role,
                                            startYear: '',
                                            endYear: '',
                                            notes: '',
                                          },
                                        ],
                                      }))
                                    }
                                  >
                                    <FiPlus size={11} /> 단계 추가
                                  </GhostSmallBtn>
                                </StatusHistoryEditorHead>

                                {membershipYearDraft.statusHistory.map(
                                  (ph, idx) => (
                                    <StatusPhaseRow key={idx}>
                                      <RoleSelectPill
                                        aria-label={`지위 단계 ${idx + 1} 역할`}
                                        value={ph.role}
                                        onChange={(e) => {
                                          const nextRole = e.target
                                            .value as OrganizationCountryRole
                                          setMembershipYearDraft((d) => ({
                                            ...d,
                                            statusHistory: d.statusHistory.map(
                                              (it, i) =>
                                                i === idx
                                                  ? { ...it, role: nextRole }
                                                  : it,
                                            ),
                                          }))
                                        }}
                                      >
                                        {COUNTRY_ROLE_OPTIONS.map((r) => (
                                          <option key={r} value={r}>
                                            {ORGANIZATION_COUNTRY_ROLE_LABEL[r]}
                                          </option>
                                        ))}
                                      </RoleSelectPill>
                                      <FieldInput
                                        type="number"
                                        placeholder="시작 연도"
                                        value={ph.startYear}
                                        onChange={(e) => {
                                          const val = e.target.value
                                          setMembershipYearDraft((d) => ({
                                            ...d,
                                            statusHistory: d.statusHistory.map(
                                              (it, i) =>
                                                i === idx
                                                  ? { ...it, startYear: val }
                                                  : it,
                                            ),
                                          }))
                                        }}
                                        style={{ width: 96, height: 28 }}
                                      />
                                      <FieldInput
                                        type="number"
                                        placeholder="종료 연도"
                                        value={ph.endYear}
                                        onChange={(e) => {
                                          const val = e.target.value
                                          setMembershipYearDraft((d) => ({
                                            ...d,
                                            statusHistory: d.statusHistory.map(
                                              (it, i) =>
                                                i === idx
                                                  ? { ...it, endYear: val }
                                                  : it,
                                            ),
                                          }))
                                        }}
                                        style={{ width: 96, height: 28 }}
                                      />
                                      <FieldInput
                                        placeholder="단계 메모"
                                        value={ph.notes}
                                        onChange={(e) => {
                                          const val = e.target.value
                                          setMembershipYearDraft((d) => ({
                                            ...d,
                                            statusHistory: d.statusHistory.map(
                                              (it, i) =>
                                                i === idx
                                                  ? { ...it, notes: val }
                                                  : it,
                                            ),
                                          }))
                                        }}
                                        style={{
                                          flex: 1,
                                          minWidth: 110,
                                          height: 28,
                                        }}
                                      />
                                      <DangerIconBtn
                                        type="button"
                                        aria-label={`지위 단계 ${idx + 1} 삭제`}
                                        onClick={() =>
                                          setMembershipYearDraft((d) => ({
                                            ...d,
                                            statusHistory:
                                              d.statusHistory.filter(
                                                (_, i) => i !== idx,
                                              ),
                                          }))
                                        }
                                      >
                                        <FiX size={12} />
                                      </DangerIconBtn>
                                    </StatusPhaseRow>
                                  ),
                                )}
                              </StatusHistoryEditor>
                            </MembershipEditPanel>
                          )}
                        </ItemCard>
                      )
                    })}
                  </ItemStack>
                )}

                <CountryPicker
                  isOpen={countryPickerOpen}
                  onClose={() => setCountryPickerOpen(false)}
                  mode="single"
                  title={`${selectedOrg.name} 회원국·파트너국 추가`}
                  modernCountries={countries}
                  historicalCountries={historicalCountries}
                  selectedIds={memberships
                    .map((m) => m.countryId ?? m.historicalCountryId ?? '')
                    .filter(Boolean)}
                  onSelect={(picked) => void handleAddCountryMembership(picked)}
                />
              </TabStack>
            )}

            {/* 2) 정기 회의·차기 일정 탭 */}
            {detailTab === 'series' && (
              <TabStack>
                <SectionNoteCard>
                  <SectionNoteRow>
                    <SectionNoteText>
                      <strong>{selectedOrg.name}</strong> 주관 정기 정상회의·각료회의·총회를 등록하면 주기에 맞춰 다음 예정 시점과 차기 의장국을 안내합니다.
                    </SectionNoteText>
                    <SolidActionBtn
                      type="button"
                      onClick={() =>
                        setSeriesModalTarget({
                          open: true,
                          initial: null,
                          defaultOrgId: selectedOrg.id,
                          defaultTitle: `${selectedOrg.shortName || selectedOrg.name} 정상회의`,
                        })
                      }
                    >
                      <FiPlus size={13} /> 시리즈 추가
                    </SolidActionBtn>
                  </SectionNoteRow>
                </SectionNoteCard>

                {orgSeriesQuery.isLoading ? (
                  <EmptyLedgerBox>정기 회의 시리즈를 불러오는 중…</EmptyLedgerBox>
                ) : orgSeriesList.length === 0 ? (
                  <EmptyLedgerBox>
                    아직 등록된 정기 회의·행사 시리즈가 없습니다. 상단{' '}
                    <strong>+ 시리즈 추가</strong>로 ‘{selectedOrg.shortName || selectedOrg.name} 정상회의’ 등을 만들어 보세요.
                  </EmptyLedgerBox>
                ) : (
                  <SeriesCardsStack>
                    {orgSeriesList.map((series) => (
                      <SeriesCardItem
                        key={series.id}
                        series={series}
                        expanded={expandedSeriesIds.has(series.id)}
                        onToggleExpand={() => toggleSeriesExpanded(series.id)}
                        onEdit={() =>
                          setSeriesModalTarget({
                            open: true,
                            initial: series,
                            defaultOrgId: selectedOrg.id,
                            defaultTitle: series.title,
                          })
                        }
                        onDelete={() => void handleDeleteSeries(series)}
                        onLaunchRegisterModal={(payload) =>
                          setSeriesRegisterPayload(payload)
                        }
                      />
                    ))}
                  </SeriesCardsStack>
                )}
              </TabStack>
            )}

            {/* 3) 역대 사건 탭 */}
            {detailTab === 'events' && (
              <TabStack>
                <SectionNoteCard>
                  <SectionNoteRow>
                    <SectionNoteText>
                      이 기구·협의체가 직접 관여했거나 주관 정기 시리즈에 속한 사건 목록입니다.
                    </SectionNoteText>
                    <SolidActionBtn
                      type="button"
                      onClick={() =>
                        navigate(
                          `/events/create/?domain=DIPLOMACY&type=SUMMIT&organizationId=${encodeURIComponent(selectedOrg.id)}`,
                        )
                      }
                    >
                      <FiPlus size={13} /> 새 사건 등록
                    </SolidActionBtn>
                  </SectionNoteRow>
                </SectionNoteCard>

                {orgEventsQuery.isLoading ? (
                  <EmptyLedgerBox>관련 사건을 불러오는 중…</EmptyLedgerBox>
                ) : relatedEvents.length === 0 ? (
                  <EmptyLedgerBox>
                    아직 연결된 사건이 없습니다. 사건 상세의 <strong>관련 기구·협의체·조직</strong> 섹션에서 연결하거나 정기 시리즈 회차로 등록하면 시간순으로 모입니다.
                  </EmptyLedgerBox>
                ) : (
                  <ItemStack>
                    {relatedEvents.map((ev) => (
                      <ItemCard key={ev.id}>
                        <ItemMainRow>
                          <ItemMainInfo>
                            <PeriodSpan>
                              {formatEventDateBrief(
                                ev.startDate,
                                ev.startDatePrecision,
                              )}
                            </PeriodSpan>
                            {ev.editionBadge && (
                              <EditionNumBadge>
                                {ev.editionBadge}
                              </EditionNumBadge>
                            )}
                            <EditionEventLink
                              to={pathKeys.events.detail(ev.id)}
                            >
                              {ev.title}
                              <FiExternalLink size={11} />
                            </EditionEventLink>
                            {ev.seriesTitle && (
                              <MetaPill>{ev.seriesTitle}</MetaPill>
                            )}
                          </ItemMainInfo>
                          <EditionHostCol>
                            {ev.hostCountry && (
                              <span>
                                {ev.hostCountry.flagEmoji
                                  ? `${ev.hostCountry.flagEmoji} `
                                  : ''}
                                {ev.hostCountry.name}
                              </span>
                            )}
                            {ev.location && <span>· {ev.location}</span>}
                            {ev.participantCount > 0 && (
                              <span>· 참여 {ev.participantCount}개국</span>
                            )}
                          </EditionHostCol>
                        </ItemMainRow>
                      </ItemCard>
                    ))}
                  </ItemStack>
                )}
              </TabStack>
            )}

            {/* 4) 소속 인물·위원 탭 */}
            {detailTab === 'members' && (
              <TabStack>
                <SectionNoteCard>
                  <InlineFormBar>
                    <FieldInput
                      aria-label="추가할 인물 역할명"
                      value={memberRoleTitle}
                      onChange={(event) =>
                        setMemberRoleTitle(event.target.value)
                      }
                      placeholder="역할명 (예: 사무총장, 의장, 위원)"
                      style={{ flex: 1, minWidth: 180, height: 32 }}
                    />
                    <SolidActionBtn
                      type="button"
                      onClick={() => {
                        playClickSound()
                        setMemberPickerOpen(true)
                      }}
                    >
                      <FiPlus size={13} /> 소속 인물 추가
                    </SolidActionBtn>
                  </InlineFormBar>
                </SectionNoteCard>

                {(membersQuery.data ?? []).length === 0 ? (
                  <EmptyLedgerBox>
                    등록된 소속 인물이 없습니다. 사무총장·의장·위원을 등록하면 사건 화면에서도 한 번에 불러올 수 있습니다.
                  </EmptyLedgerBox>
                ) : (
                  <ItemStack>
                    {(membersQuery.data ?? []).map((member) => {
                      const displayName = getPersonDisplayName(
                        member.person,
                        true,
                      )
                      return (
                        <ItemCard key={`${member.source}:${member.personId}`}>
                          <ItemMainRow>
                            <ItemMainInfo>
                              <EntityLink
                                to={pathKeys.personsTimelineDetail(
                                  member.personId,
                                )}
                              >
                                <FiUser size={13} />
                                <strong>{displayName}</strong>
                              </EntityLink>
                              {member.roleTitle && (
                                <MetaPill>{member.roleTitle}</MetaPill>
                              )}
                              <MetaPill $accent={member.source === 'TENURE'}>
                                {member.source === 'TENURE'
                                  ? '관직 재임'
                                  : '조직 역할'}
                              </MetaPill>
                            </ItemMainInfo>
                            {member.source === 'ROLE' && (
                              <DangerIconBtn
                                type="button"
                                aria-label={`${displayName} 제거`}
                                onClick={() =>
                                  void handleRemoveMember(
                                    member.personId,
                                    displayName,
                                  )
                                }
                              >
                                <FiTrash2 size={12} />
                              </DangerIconBtn>
                            )}
                          </ItemMainRow>
                        </ItemCard>
                      )
                    })}
                  </ItemStack>
                )}

                {memberPickerOpen && (
                  <PersonSelectModal
                    persons={allPersonsQuery.data ?? []}
                    selectedPersonId=""
                    title={`${selectedOrg.name} 소속 인물 추가`}
                    excludeIds={(membersQuery.data ?? []).map(
                      (item) => item.personId,
                    )}
                    onSelect={(personId, personName) => {
                      void handleAddMember(personId, personName)
                    }}
                    onClose={() => setMemberPickerOpen(false)}
                  />
                )}
              </TabStack>
            )}

            {/* 5) 기본 정보 수정 탭 (기업 유형 완전 제외) */}
            {detailTab === 'edit' && (
              <TabStack>
                <FormGrid>
                  <FormField style={{ gridColumn: 'span 2' }}>
                    <FormLabel>기구·조직 공식 명칭 *</FormLabel>
                    <FieldInput
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm({ ...editForm, name: e.target.value })
                      }
                      placeholder="공식 명칭"
                    />
                  </FormField>
                  <FormField>
                    <FormLabel>약칭</FormLabel>
                    <FieldInput
                      value={editForm.shortName}
                      onChange={(e) =>
                        setEditForm({ ...editForm, shortName: e.target.value })
                      }
                      placeholder="예: Quad, ASEAN, APEC"
                    />
                  </FormField>
                  <FormField>
                    <FormLabel>현지·영문 명칭</FormLabel>
                    <FieldInput
                      value={editForm.localName}
                      onChange={(e) =>
                        setEditForm({ ...editForm, localName: e.target.value })
                      }
                      placeholder="영문·원어 명칭"
                    />
                  </FormField>
                  <FormField>
                    <FormLabel>유형</FormLabel>
                    <FieldSelect
                      value={editForm.type}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          type: e.target.value as OrganizationType,
                        })
                      }
                    >
                      {NON_COMPANY_ORG_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {ORGANIZATION_TYPE_LABEL[t]}
                        </option>
                      ))}
                    </FieldSelect>
                  </FormField>
                  <FormField>
                    <FormLabel>활동 범위</FormLabel>
                    <FieldSelect
                      value={editForm.scope}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          scope: (e.target.value as OrganizationScope) || '',
                        })
                      }
                    >
                      <option value="">미지정</option>
                      {(
                        Object.keys(
                          ORGANIZATION_SCOPE_LABEL,
                        ) as OrganizationScope[]
                      ).map((sc) => (
                        <option key={sc} value={sc}>
                          {ORGANIZATION_SCOPE_LABEL[sc]}
                        </option>
                      ))}
                    </FieldSelect>
                  </FormField>
                  <FormField>
                    <FormLabel>설립·출범일</FormLabel>
                    <FieldInput
                      type="date"
                      value={editForm.foundedDate}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          foundedDate: e.target.value,
                        })
                      }
                    />
                  </FormField>
                  <FormField>
                    <FormLabel>해산·종료일</FormLabel>
                    <FieldInput
                      type="date"
                      value={editForm.dissolvedDate}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          dissolvedDate: e.target.value,
                        })
                      }
                    />
                  </FormField>
                  <FormField style={{ gridColumn: 'span 2' }}>
                    <FormLabel>
                      전신 기구 (계보 연결 — 예: GATT → WTO, 국제연맹 → UN, EC → EU)
                    </FormLabel>
                    <FieldSelect
                      value={editForm.predecessorOrganizationId}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          predecessorOrganizationId: e.target.value,
                        })
                      }
                    >
                      <option value="">전신 없음 (신설 기구·조직)</option>
                      {(
                        allOrgsForLineageQuery.data ??
                        allNonCompanyOrgs
                      )
                        .filter(
                          (candidate) =>
                            candidate.id !== selectedOrg.id &&
                            candidate.type !== 'COMPANY',
                        )
                        .map((candidate) => (
                          <option key={candidate.id} value={candidate.id}>
                            {candidate.name}
                            {candidate.shortName
                              ? ` (${candidate.shortName})`
                              : ''}{' '}
                            ·{' '}
                            {ORGANIZATION_TYPE_LABEL[candidate.type] ??
                              candidate.type}
                          </option>
                        ))}
                    </FieldSelect>
                  </FormField>
                  <FormField>
                    <FormLabel>공식 웹사이트 URL</FormLabel>
                    <FieldInput
                      value={editForm.websiteUrl}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          websiteUrl: e.target.value,
                        })
                      }
                      placeholder="https://..."
                    />
                  </FormField>
                  <FormField>
                    <FormLabel>로고 URL</FormLabel>
                    <FieldInput
                      value={editForm.logoUrl}
                      onChange={(e) =>
                        setEditForm({ ...editForm, logoUrl: e.target.value })
                      }
                      placeholder="이미지 URL"
                    />
                  </FormField>
                  <FormField style={{ gridColumn: 'span 2' }}>
                    <FormLabel>설명</FormLabel>
                    <FieldTextarea
                      value={editForm.description}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          description: e.target.value,
                        })
                      }
                      placeholder="설립 배경·역할·의사결정 구조 설명"
                    />
                  </FormField>
                </FormGrid>

                <EditFooterBar>
                  <SolidActionBtn
                    type="button"
                    onClick={() => void handleSaveEdit()}
                  >
                    변경사항 저장
                  </SolidActionBtn>
                  <OutlineActionBtn
                    type="button"
                    onClick={() => {
                      playClickSound()
                      navigate(`/organizations/${selectedOrg.id}/edit`)
                    }}
                  >
                    전체 폼 편집 (사무국 국가·역대 수장)
                  </OutlineActionBtn>
                  <DangerOutlineBtn
                    type="button"
                    onClick={() =>
                      void handleDelete(selectedOrg.id, selectedOrg.name)
                    }
                  >
                    <FiTrash2 size={13} />
                    기구·조직 삭제
                  </DangerOutlineBtn>
                </EditFooterBar>
              </TabStack>
            )}

            {/* 6) 직위 설정 탭 */}
            {detailTab === 'positions' && (
              <PositionDefinitionsSection
                fixedOrganizationId={selectedOrg.id}
                fixedOrganizationName={
                  selectedOrg.shortName
                    ? `${selectedOrg.name} (${selectedOrg.shortName})`
                    : selectedOrg.name
                }
              />
            )}
          </InspectorBody>
        </InspectorPane>
      )}

      {/* 빠른 기구·협의체 등록 모달 */}
      {quickOrgModalOpen && (
        <OrganizationQuickCreateModal
          defaultType={
            hubView === 'domestic' ? 'NGO' : 'MULTILATERAL_FORUM'
          }
          onClose={() => setQuickOrgModalOpen(false)}
          onCreated={(created) => {
            setQuickOrgModalOpen(false)
            if (hubView === 'series') {
              handleSwitchHubView(
                isInternationalOrgType(created.type)
                  ? 'international'
                  : 'domestic',
              )
            }
            openDetail(
              created,
              isInternationalOrgType(created.type) ? 'countries' : 'edit',
            )
          }}
        />
      )}

      {/* 정기 회의·행사 시리즈 생성·수정 모달 */}
      {seriesModalTarget.open && (
        <EventSeriesFormModal
          initialSeries={seriesModalTarget.initial}
          defaultOrganizationId={seriesModalTarget.defaultOrgId}
          defaultTitle={seriesModalTarget.defaultTitle}
          onClose={() =>
            setSeriesModalTarget({
              open: false,
              initial: null,
              defaultOrgId: null,
              defaultTitle: '',
            })
          }
          onSaved={(saved) => {
            setSeriesModalTarget({
              open: false,
              initial: null,
              defaultOrgId: null,
              defaultTitle: '',
            })
            setExpandedSeriesIds((prev) => new Set([...prev, saved.id]))
          }}
        />
      )}

      {/* 차기 회차·결번 회차 인라인 사건 등록 모달 */}
      {seriesRegisterPayload && (
        <EventRegisterModal
          isOpen={Boolean(seriesRegisterPayload)}
          onClose={() => setSeriesRegisterPayload(null)}
          initialDomain={seriesRegisterPayload.initialDomain}
          initialEventType={seriesRegisterPayload.initialEventType}
          initialCountries={seriesRegisterPayload.initialCountries}
          initialSeriesPrefill={seriesRegisterPayload.initialSeriesPrefill}
          onSaved={() => {
            setSeriesRegisterPayload(null)
            void queryClient.invalidateQueries({ queryKey: ['event-series'] })
            void queryClient.invalidateQueries({ queryKey: ['organizations'] })
            void queryClient.invalidateQueries({
              queryKey: ['organization-events'],
            })
          }}
        />
      )}
    </Workspace>
  )
}

/* ───────────────────────── Ledger Design System Styles ───────────────────────── */

type ForecastTone = 'blue' | 'emerald' | 'indigo' | 'amber' | 'rose' | 'slate'

function toneColor(tone: ForecastTone, mode: Mode): string {
  const dark = mode === 'dark'
  switch (tone) {
    case 'emerald':
      return dark ? '#34d399' : '#059669'
    case 'amber':
      return dark ? '#fbbf24' : '#d97706'
    case 'rose':
      return dark ? '#fb7185' : '#e11d48'
    case 'slate':
      return dark ? '#94a3b8' : '#64748b'
    default:
      return ledgerAccent(mode)
  }
}

function toneWash(tone: ForecastTone, mode: Mode): string {
  const dark = mode === 'dark'
  switch (tone) {
    case 'emerald':
      return dark ? 'rgba(16,185,129,0.10)' : 'rgba(16,185,129,0.06)'
    case 'amber':
      return dark ? 'rgba(245,158,11,0.11)' : 'rgba(245,158,11,0.07)'
    case 'rose':
      return dark ? 'rgba(244,63,94,0.10)' : 'rgba(244,63,94,0.06)'
    case 'slate':
      return dark ? 'rgba(148,163,184,0.08)' : 'rgba(100,116,139,0.05)'
    default:
      return ledgerAccentSubtle(mode)
  }
}

const Workspace = styled.div`
  display: flex;
  height: calc(100vh - var(--header-height, 64px));
  min-height: 0;
  overflow: hidden;
  background: ${({ theme }) => ledgerBackground(theme.mode)};
`

const CatalogPane = styled.div<{ $detailOpen: boolean }>`
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: ${({ theme, $detailOpen }) =>
    $detailOpen ? `1px solid ${ledgerHairlineStrong(theme.mode)}` : 'none'};
`

const TopChrome = styled.header`
  padding: 16px 24px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  flex-shrink: 0;
`

const TopHeadlineGroup = styled.div`
  display: flex;
  align-items: stretch;
  gap: 12px;
`

const AccentBar = styled.span`
  width: 3px;
  border-radius: 2px;
  background: ${({ theme }) => ledgerAccent(theme.mode)};
  flex-shrink: 0;
`

const PageTitle = styled.h1`
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.015em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const SummaryLine = styled.div`
  margin-top: 3px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};

  b {
    ${DIGIT_DISPLAY}
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .accent,
  .accent b {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
  .sep {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const CompanyDomainLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-decoration: none;
  font-weight: 500;
  transition: color 0.12s;
  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    text-decoration: underline;
    text-underline-offset: 2px;
  }
`

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const OutlineActionBtn = styled.button`
  height: 32px;
  padding: 0 12px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12.5px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  cursor: pointer;
  transition: border-color 0.12s, color 0.12s, background 0.12s;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.text.tertiary};
    background: ${({ theme }) => ledgerRowWash(theme.mode)};
  }
`

const SolidActionBtn = styled.button`
  height: 32px;
  padding: 0 13px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerAccent(theme.mode)};
  background: ${({ theme }) => ledgerAccent(theme.mode)};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#0e0f12' : '#ffffff')};
  font-size: 12.5px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
  cursor: pointer;
  transition: opacity 0.12s;
  &:hover {
    opacity: 0.9;
  }
`

const DangerOutlineBtn = styled(OutlineActionBtn)`
  color: ${({ theme }) => theme.colors.error};
  border-color: ${({ theme }) => `${theme.colors.error}55`};
  &:hover {
    color: ${({ theme }) => theme.colors.error};
    border-color: ${({ theme }) => theme.colors.error};
    background: ${({ theme }) => `${theme.colors.error}12`};
  }
`

/* ── View Tabs ── */

const ViewTabsBar = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 24px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  overflow-x: auto;
  flex-shrink: 0;
`

const ViewTabBtn = styled.button<{ $active: boolean }>`
  position: relative;
  padding: 9px 12px 10px;
  border: none;
  border-bottom: 2px solid
    ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : 'transparent'};
  background: transparent;
  color: ${({ theme, $active }) =>
    $active ? theme.colors.text.primary : theme.colors.text.secondary};
  font-size: 12.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  cursor: pointer;
  transition: color 0.12s;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const TabCount = styled.span<{ $active: boolean }>`
  ${DIGIT_DISPLAY}
  font-size: 11px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: ${RADIUS.PILL};
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : ledgerChipFill(theme.mode)};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.tertiary};
`

/* ── Filter Bar ── */

const FilterBar = styled.div`
  padding: 10px 24px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  display: flex;
  align-items: center;
  gap: 8px 10px;
  flex-wrap: wrap;
  flex-shrink: 0;
`

const SearchBox = styled.div`
  flex: 1 1 240px;
  max-width: 380px;
  min-width: 190px;
  height: 31px;
  padding: 0 10px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.tertiary};
  display: flex;
  align-items: center;
  gap: 7px;
  &:focus-within {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
    background: ${({ theme }) => theme.colors.background.primary};
  }

  input {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    color: ${({ theme }) => theme.colors.text.primary};
    font-size: 12.5px;
    outline: none;
    &::placeholder {
      color: ${({ theme }) => theme.colors.text.tertiary};
    }
  }
`

const ClearInputBtn = styled.button`
  border: none;
  background: transparent;
  padding: 2px;
  display: inline-flex;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const FacetChips = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
`

const FacetChipBtn = styled.button<{ $active: boolean }>`
  height: 27px;
  padding: 0 9px;
  border-radius: ${RADIUS.SM};
  border: 1px solid
    ${({ theme, $active }) =>
      $active
        ? ledgerAccentBorder(theme.mode)
        : ledgerHairlineStrong(theme.mode)};
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  font-size: 12px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  display: inline-flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
  cursor: pointer;
  transition: border-color 0.12s, color 0.12s, background 0.12s;

  .cnt {
    ${DIGIT_DISPLAY}
    font-size: 10.5px;
    opacity: 0.72;
  }

  &:hover {
    color: ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : theme.colors.text.primary};
  }
`

const TypeDot = styled.span<{ $hue: string }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ $hue }) => $hue};
  flex-shrink: 0;
`

const StatusDot = styled.span<{ $tone: ForecastTone }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ theme, $tone }) => toneColor($tone, theme.mode)};
  flex-shrink: 0;
`

const FilterRightControls = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
`

const CompactSelect = styled.select`
  height: 29px;
  padding: 0 9px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12px;
  cursor: pointer;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const TextResetBtn = styled.button`
  height: 27px;
  padding: 0 7px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11.5px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  cursor: pointer;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const ModeSegmented = styled.div`
  display: inline-flex;
  padding: 2px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => theme.colors.background.secondary};
`

const ModeSegBtn = styled.button<{ $active: boolean }>`
  height: 23px;
  padding: 0 8px;
  border: none;
  border-radius: ${RADIUS.XS};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.background.primary : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.text.primary : theme.colors.text.tertiary};
  font-size: 11.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  cursor: pointer;
`

/* ── Ledger Catalog Table ── */

const TableScrollArea = styled.div`
  flex: 1;
  overflow-y: auto;
`

const tableGridColumns = (compact: boolean) =>
  compact
    ? css`
        grid-template-columns: minmax(220px, 1.8fr) 150px 135px;
      `
    : css`
        grid-template-columns: minmax(260px, 1.7fr) 165px minmax(210px, 1.3fr) 160px;
        @media (max-width: 980px) {
          grid-template-columns: minmax(220px, 1.8fr) 150px 140px;
        }
      `

const LedgerTableHead = styled.div<{ $compact: boolean }>`
  position: sticky;
  top: 0;
  z-index: 2;
  display: grid;
  ${({ $compact }) => tableGridColumns($compact)}
  align-items: center;
  gap: 14px;
  padding: 8px 24px;
  background: ${({ theme }) => ledgerSurfaceSolid(theme.mode)};
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

const SortHeadBtn = styled.button<{
  $active?: boolean
  $alignRight?: boolean
}>`
  border: none;
  background: transparent;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: ${({ $alignRight }) =>
    $alignRight ? 'flex-end' : 'flex-start'};
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.tertiary};
  cursor: pointer;

  .cnt {
    ${DIGIT_DISPLAY}
    font-size: 10.5px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const StaticHeadCell = styled.div`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const AxisHeadCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  @media (max-width: 980px) {
    display: none;
  }
`

const AxisScaleBar = styled.div`
  position: relative;
  height: 12px;
  width: 100%;
`

const AxisScaleLabel = styled.span`
  ${DIGIT_DISPLAY}
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  font-size: 9.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
`

const AxisNowLabel = styled.span`
  ${DIGIT_DISPLAY}
  position: absolute;
  right: 0;
  top: 0;
  font-size: 9.5px;
  font-weight: 700;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const LedgerRows = styled.div`
  display: flex;
  flex-direction: column;
`

const LedgerOrgRow = styled.div<{ $selected: boolean; $compact: boolean }>`
  display: grid;
  ${({ $compact }) => tableGridColumns($compact)}
  align-items: center;
  gap: 14px;
  padding: 10px 24px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme, $selected }) =>
    $selected ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  box-shadow: ${({ theme, $selected }) =>
    $selected ? `inset 3px 0 0 ${ledgerAccent(theme.mode)}` : 'none'};
  cursor: pointer;
  transition: background 0.12s;

  &:hover {
    background: ${({ theme, $selected }) =>
      $selected ? ledgerAccentSubtle(theme.mode) : ledgerRowWash(theme.mode)};
  }
`

const MarkBox = styled.span<{ $size: number; $hue: string; $hasImg: boolean }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: ${RADIUS.SM};
  flex-shrink: 0;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ $size }) => Math.max(10, Math.round($size * 0.36))}px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: ${({ $hue }) => $hue};
  background: ${({ $hasImg, $hue, theme }) =>
    $hasImg
      ? theme.colors.background.secondary
      : theme.mode === 'dark'
        ? `${$hue}24`
        : `${$hue}14`};
  border: 1px solid
    ${({ $hue, theme }) =>
      theme.mode === 'dark' ? `${$hue}45` : `${$hue}30`};

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`

const OrgIdentityCell = styled.div`
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
`

const OrgTitleStack = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const OrgPrimaryLine = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  min-width: 0;

  .name {
    font-size: 13.5px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .short {
    ${DIGIT_DISPLAY}
    font-size: 11.5px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const LineageInlineTag = styled.span`
  padding: 1px 6px;
  border-radius: ${RADIUS.XS};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerChipFill(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 10.5px;
  font-weight: 600;
`

const OrgSecondaryLine = styled.div`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  .mono {
    ${DIGIT_DISPLAY}
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const OrgTypeCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const TypeInlineBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
`

const ScopeSubText = styled.span`
  padding-left: 13px;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const OrgTimelineCell = styled.div`
  min-width: 0;
  @media (max-width: 980px) {
    display: none;
  }
`

const LifespanTrackWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
`

const LifespanTrack = styled.div`
  position: relative;
  height: 6px;
  border-radius: 3px;
  background: ${({ theme }) => ledgerChipFill(theme.mode)};
  overflow: hidden;
`

const AxisGridTick = styled.span`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

const LifespanFill = styled.span<{ $hue: string; $ongoing: boolean }>`
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: ${({ $ongoing }) => ($ongoing ? '3px 0 0 3px' : '3px')};
  background: ${({ $hue }) => $hue};
  opacity: ${({ $ongoing }) => ($ongoing ? 0.88 : 0.52)};
`

const LifespanYearText = styled.span`
  ${DIGIT_DISPLAY}
  font-size: 10.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const LifespanFallback = styled.span`
  ${DIGIT_DISPLAY}
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const OrgMetricsCell = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  flex-wrap: wrap;
`

const MetricPill = styled.span<{ $accent?: boolean }>`
  padding: 2px 7px;
  border-radius: ${RADIUS.PILL};
  font-size: 11px;
  font-weight: 500;
  background: ${({ theme, $accent }) =>
    $accent ? ledgerAccentSubtle(theme.mode) : ledgerChipFill(theme.mode)};
  color: ${({ theme, $accent }) =>
    $accent ? ledgerAccent(theme.mode) : theme.colors.text.secondary};

  b {
    ${DIGIT_DISPLAY}
    font-weight: 700;
  }
`

const MutedDash = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 12px;
`

const RowChevron = styled.span<{ $selected: boolean }>`
  display: inline-flex;
  color: ${({ theme, $selected }) =>
    $selected ? ledgerAccent(theme.mode) : theme.colors.text.tertiary};
`

/* ── Tree View ── */

const TreeScrollArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px 32px;
`

const TreeNodeWrap = styled.div<{ $depth: number }>`
  margin-left: ${({ $depth }) => ($depth > 0 ? 18 : 0)}px;
  padding-left: ${({ $depth }) => ($depth > 0 ? 10 : 0)}px;
  border-left: ${({ theme, $depth }) =>
    $depth > 0 ? `1px solid ${ledgerHairlineStrong(theme.mode)}` : 'none'};
`

const TreeChildren = styled.div`
  display: flex;
  flex-direction: column;
`

const TreeRowBtn = styled.button<{ $selected: boolean }>`
  width: 100%;
  text-align: left;
  padding: 7px 10px;
  border: none;
  border-radius: ${RADIUS.SM};
  background: ${({ theme, $selected }) =>
    $selected ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;

  .name {
    font-size: 13px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .short {
    ${DIGIT_DISPLAY}
    font-size: 11.5px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  .meta {
    margin-left: auto;
    font-size: 11.5px;
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  &:hover {
    background: ${({ theme, $selected }) =>
      $selected ? ledgerAccentSubtle(theme.mode) : ledgerRowWash(theme.mode)};
  }
`

/* ── Series Schedule View ── */

const SeriesScrollArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px 36px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const SeriesRadarHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`

const SeriesRadarSummary = styled.p`
  margin: 0;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const SeriesRadarBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 12px;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};
`

const SeriesCardsStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const SeriesCard = styled.div<{ $tone: ForecastTone }>`
  padding: 14px 16px;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  box-shadow: inset 3px 0 0
    ${({ theme, $tone }) => toneColor($tone, theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};
  display: flex;
  flex-direction: column;
  gap: 9px;
`

const SeriesCardTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
`

const SeriesTitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
`

const SeriesTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`

const SeriesName = styled.h3`
  margin: 0;
  font-size: 14.5px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
`

const SeriesShort = styled.span`
  ${DIGIT_DISPLAY}
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const MetaPill = styled.span<{ $accent?: boolean; $mono?: boolean }>`
  ${({ $mono }) => ($mono ? DIGIT_DISPLAY : '')}
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  border-radius: ${RADIUS.PILL};
  border: 1px solid
    ${({ theme, $accent }) =>
      $accent
        ? ledgerAccentBorder(theme.mode)
        : ledgerHairlineStrong(theme.mode)};
  background: ${({ theme, $accent }) =>
    $accent ? ledgerAccentSubtle(theme.mode) : ledgerChipFill(theme.mode)};
  color: ${({ theme, $accent }) =>
    $accent ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  font-size: 11px;
  font-weight: 600;
`

const SeriesSubMetaRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const OrgJumpBtn = styled.button`
  border: none;
  background: transparent;
  padding: 0;
  font: inherit;
  font-weight: 700;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  cursor: pointer;
  &:hover {
    text-decoration: underline;
  }
`

const SeriesTopActions = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`

const ForecastStrip = styled.div<{ $tone: ForecastTone }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 12px;
  padding: 8px 11px;
  border-radius: ${RADIUS.SM};
  background: ${({ theme, $tone }) => toneWash($tone, theme.mode)};
`

const ForecastStripLeft = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
  font-size: 12.5px;
`

const ForecastTonePill = styled.span<{ $tone: ForecastTone }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: ${RADIUS.PILL};
  border: 1px solid
    ${({ theme, $tone }) => `${toneColor($tone, theme.mode)}45`};
  color: ${({ theme, $tone }) => toneColor($tone, theme.mode)};
  font-size: 11px;
  font-weight: 700;
`

const ForecastHeadline = styled.span`
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ForecastMemo = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const ForecastStripRight = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`

const SeriesPrimaryBtn = styled.button`
  height: 28px;
  padding: 0 10px;
  border-radius: ${RADIUS.SM};
  border: none;
  background: ${({ theme }) => ledgerAccent(theme.mode)};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#0e0f12' : '#ffffff')};
  font-size: 11.5px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  cursor: pointer;
  &:hover {
    opacity: 0.9;
  }
`

const SeriesPrimaryLink = styled(Link)`
  height: 28px;
  padding: 0 10px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-size: 11.5px;
  font-weight: 700;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
`

const MissingGapBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 6px 10px;
  border-radius: ${RADIUS.SM};
  border: 1px dashed ${({ theme }) => `${toneColor('amber', theme.mode)}66`};
  background: ${({ theme }) => toneWash('amber', theme.mode)};
`

const MissingGapText = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => toneColor('amber', theme.mode)};
`

const MissingGapActions = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
`

const MissingQuickBtn = styled.button`
  height: 24px;
  padding: 0 8px;
  border-radius: ${RADIUS.XS};
  border: 1px solid ${({ theme }) => `${toneColor('amber', theme.mode)}66`};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => toneColor('amber', theme.mode)};
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  &:hover {
    opacity: 0.88;
  }
`

const SeriesFooterRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
`

const SeriesFooterLeft = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
`

const ExpandEditionsBtn = styled.button`
  border: none;
  background: transparent;
  padding: 2px 0;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const LeadingGapHint = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const LeadingGapBtn = styled.button`
  border: none;
  background: transparent;
  padding: 0;
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  cursor: pointer;
  &:hover {
    text-decoration: underline;
  }
`

const LatestMeta = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  a {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 600;
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }
  .date {
    ${DIGIT_DISPLAY}
  }
`

const EditionsTable = styled.div`
  display: flex;
  flex-direction: column;
  padding-top: 6px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const EditionLedgerRow = styled.div`
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 6px 4px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  &:last-child {
    border-bottom: none;
  }
`

const EditionDateCol = styled.span`
  ${DIGIT_DISPLAY}
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const EditionMainCol = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  min-width: 0;
`

const EditionNumBadge = styled.span`
  ${DIGIT_DISPLAY}
  padding: 1px 6px;
  border-radius: ${RADIUS.XS};
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-size: 10.5px;
  font-weight: 700;
`

const EditionEventLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;
  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    text-decoration: underline;
  }
`

const FuturePill = styled.span`
  padding: 1px 6px;
  border-radius: ${RADIUS.PILL};
  font-size: 10px;
  font-weight: 700;
  background: ${({ theme }) => toneWash('emerald', theme.mode)};
  color: ${({ theme }) => toneColor('emerald', theme.mode)};
`

const EditionHostCol = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

/* ── Right Inspector Pane ── */

const InspectorPane = styled.aside`
  flex: 0 0 min(560px, 48vw);
  min-width: 380px;
  max-width: 620px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: ${({ theme }) => ledgerSurfaceSolid(theme.mode)};

  @media (max-width: 900px) {
    position: fixed;
    top: var(--header-height, 64px);
    right: 0;
    bottom: 0;
    width: min(560px, 100vw);
    min-width: 0;
    z-index: 30;
    border-left: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
    box-shadow: -16px 0 40px rgba(0, 0, 0, 0.28);
  }
`

const InspectorHeader = styled.div`
  padding: 16px 20px 13px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;
`

const InspectorIdentity = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
`

const InspectorTitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
`

const InspectorTitleRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 7px;
  flex-wrap: wrap;

  h2 {
    margin: 0;
    font-size: 16.5px;
    font-weight: 800;
    letter-spacing: -0.015em;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .short {
    ${DIGIT_DISPLAY}
    font-size: 13px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const InspectorMetaRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};

  .mono {
    ${DIGIT_DISPLAY}
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const ExternalAnchor = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  text-decoration: none;
  font-weight: 600;
  &:hover {
    text-decoration: underline;
  }
`

const LineageBar = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 2px;
`

const LineageChipBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 9px;
  border-radius: ${RADIUS.PILL};
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  &:hover {
    opacity: 0.88;
  }
`

const CloseIconBtn = styled.button`
  width: 30px;
  height: 30px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => ledgerRowWash(theme.mode)};
  }
`

const InspectorTabBar = styled.div`
  display: flex;
  padding: 0 16px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  overflow-x: auto;
  flex-shrink: 0;
`

const InspectorTabBtn = styled.button<{ $active: boolean }>`
  padding: 9px 11px 10px;
  border: none;
  border-bottom: 2px solid
    ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : 'transparent'};
  background: transparent;
  color: ${({ theme, $active }) =>
    $active ? theme.colors.text.primary : theme.colors.text.secondary};
  font-size: 12px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  display: inline-flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
  cursor: pointer;

  .cnt {
    ${DIGIT_DISPLAY}
    font-size: 10.5px;
    color: ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : theme.colors.text.tertiary};
  }

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const InspectorBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px 32px;
`

const TabStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const SectionNoteCard = styled.div`
  padding: 12px 14px;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => theme.colors.background.secondary};
  display: flex;
  flex-direction: column;
  gap: 9px;
`

const SectionNoteRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`

const SectionNoteText = styled.p`
  margin: 0;
  flex: 1;
  min-width: 200px;
  font-size: 12px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const InlineFormBar = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
`

const ItemStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const ItemCard = styled.div`
  padding: 10px 12px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};
  display: flex;
  flex-direction: column;
  gap: 7px;
`

const ItemMainRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
`

const ItemMainInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
  min-width: 0;
`

const EntityLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;
  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    text-decoration: underline;
  }
`

const RoleSelectPill = styled.select`
  height: 25px;
  padding: 0 8px;
  border-radius: ${RADIUS.PILL};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
`

const PeriodSpan = styled.span`
  ${DIGIT_DISPLAY}
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const NoteSpan = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ItemRowBtns = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
`

const GhostSmallBtn = styled.button`
  height: 26px;
  padding: 0 8px;
  border-radius: ${RADIUS.XS};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
  }
`

const DangerIconBtn = styled.button`
  width: 26px;
  height: 26px;
  border-radius: ${RADIUS.XS};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  &:hover {
    color: ${({ theme }) => theme.colors.error};
    border-color: ${({ theme }) => theme.colors.error};
  }
`

const StatusHistoryRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
`

const MembershipEditPanel = styled.div`
  padding-top: 8px;
  border-top: 1px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const StatusHistoryEditor = styled.div`
  padding-top: 7px;
  border-top: 1px dashed ${({ theme }) => ledgerHairline(theme.mode)};
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const StatusHistoryEditorHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const StatusPhaseRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
`

/* ── Edit Form & Empty States ── */

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`

const FormLabel = styled.label`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const fieldBase = css`
  height: 34px;
  padding: 0 10px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 13px;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const FieldInput = styled.input`
  ${fieldBase}
`

const FieldSelect = styled.select`
  ${fieldBase}
  cursor: pointer;
`

const FieldTextarea = styled.textarea`
  ${fieldBase}
  height: auto;
  min-height: 80px;
  padding: 8px 10px;
  resize: vertical;
  font-family: inherit;
`

const EditFooterBar = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 6px;
`

const EmptyLedgerBox = styled.div`
  margin: 12px 0;
  padding: 28px 20px;
  border-radius: ${RADIUS.MD};
  border: 1px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};
  text-align: center;
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.secondary};

  .title {
    font-size: 14px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
    margin-bottom: 4px;
  }
  .desc {
    font-size: 12.5px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const InlineEmptyNote = styled.div`
  padding: 12px 8px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
