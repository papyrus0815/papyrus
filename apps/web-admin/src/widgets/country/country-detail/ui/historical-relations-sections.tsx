/**
 * 역사 국가 상세 — 계승 · 소속·구성 · 국가 관계 탭.
 *
 * 예전엔 세 탭이 각자 인라인 스타일(하드코딩 색 #6366f1·#fafafa·#dc2626…)로 칸 박스 목록을
 * 그렸다: 행마다 테두리 카드 + 늘 떠 있는 빨간 '삭제' 버튼 + 꽉 찬 보라 '추가' 버튼, 그리고
 * 공용 Modal이 아닌 손으로 만든 fixed 오버레이 다이얼로그(Esc·포커스 트랩 없음).
 * 이 파일은 같은 데이터·같은 뮤테이션을 그대로 두고 표현만 바꾼다:
 *  - 목록 = 헤어라인으로 나뉜 평평한 행(현대 국가 대시보드·사건 연관 섹션과 같은 문법)
 *  - 수정·삭제 = 행에 올렸을 때만 보이는 글 버튼, 삭제는 확인을 거친다
 *  - 추가·수정 = 공용 Modal(Esc·스크롤 잠금·포커스 트랩)
 *  - 색은 전부 테마 토큰
 */
import { CountryTabEmptyState } from './country-tab-empty-state'
import { PrimaryActionButton } from '@/shared/ui/primary-action-button'
import { useMemo, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FiArrowRight,
  FiArrowUpRight,
  FiFlag,
  FiGitBranch,
  FiLayers,
  FiPlus,
  FiX,
} from 'react-icons/fi'
import { Link, useNavigate } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import {
  BentoCard,
  BentoCardBadge,
  BentoCardBody,
  BentoCardHeader,
  BentoCardTitle,
  BentoCardTitleGroup,
  BentoGrid2Col,
  BentoGridAsym,
  MiniDonutRing,
  type SegmentSlice,
  StackedSegmentBar,
} from '@/entities/event/ui/bento-primitives'
import {
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerAccentSubtle,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerHoverFill,
  ledgerSubtleFill,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import { formatCountryPeriod } from '@/shared/lib/country-period'
import {
  type CreateHistoricalCountryMembershipDto,
  type CreateHistoricalCountryRelationDto,
  type CreateHistoricalCountryTransitionDto,
  type HistoricalCountryMembershipDto,
  type HistoricalCountryRelationDto,
  type HistoricalCountryTransitionDto,
  type HistoricalMembershipRole,
  type HistoricalRelationType,
  type StructuredPeriodInput,
  type StructuredPeriodPoint,
  type TransitionEventType,
  type TransitionScope,
  type UpdateHistoricalCountryMembershipDto,
  type UpdateHistoricalCountryRelationDto,
  type UpdateHistoricalCountryTransitionDto,
  createHistoricalCountryMembership,
  createHistoricalCountryRelation,
  createHistoricalCountryTransition,
  deleteHistoricalCountryMembership,
  deleteHistoricalCountryRelation,
  deleteHistoricalCountryTransition,
  getAllHistoricalCountries,
  getMembershipsByHistoricalCountryId,
  getRelationsByHistoricalCountryId,
  getTransitionsByHistoricalCountryId,
  updateHistoricalCountryMembership,
  updateHistoricalCountryRelation,
  updateHistoricalCountryTransition,
} from '@/shared/api/historical-countries'
import { pathKeys } from '@/shared/router'
import { LedgerTableSkeleton } from '@/shared/ui/ledger-skeleton'
import { confirm } from '@/shared/ui/confirm-dialog'
import { CountryPicker, CountryPickerField } from '@/shared/ui/country-picker'
import { Modal, ModalBody, ModalFooter } from '@/shared/ui/modal'
import { notify } from '@/shared/ui/toast'
import {
  PeriodDateField,
  type PeriodDateValue,
} from '@/widgets/historical-country/historical-country-form/ui/period-date-field'

import * as DashboardStyles from './country-detail-dashboard.styles'

// ─── 라벨 ────────────────────────────────────────────────────────────────────

export const TRANSITION_EVENT_LABELS: Record<string, string> = {
  FOUNDED: '건국',
  CONQUEST: '정복',
  TREATY: '조약',
  INDEPENDENCE: '독립',
  UNIFICATION: '통일',
  UNION: '합병/연합',
  DISSOLVED: '멸망',
  SUCCESSION: '계승',
  SECULARIZATION: '세속화',
  SPLIT: '분열',
  OTHER: '기타',
}

const MEMBERSHIP_ROLE_LABELS: Record<HistoricalMembershipRole, string> = {
  COLONY: '식민지',
  PROTECTORATE: '보호국',
  DOMINION: '자치령',
  CONFEDERATION_MEMBER: '연방 구성원',
  VASSAL_STATE: '속국',
  FOEDERATUS: '동맹부족',
  ALLY: '동맹',
  UNION: '연합',
  SUCCESSION: '계승',
  OTHER: '기타',
}

const RELATION_TYPE_LABELS: Record<HistoricalRelationType, string> = {
  ALLIANCE: '동맹',
  WAR: '전쟁',
  SUZERAIN_VASSAL: '종주국-속국',
  TRIBUTARY: '조공·책봉',
  PERSONAL_UNION: '동군연합',
}

const TRANSITION_SCOPE_LABELS: Record<TransitionScope, string> = {
  STATE_SUCCESSION: '국가 계승',
  REGIME_CHANGE: '정권 교체',
}

const EMPTY_PERIOD_DATE: PeriodDateValue = {
  era: undefined,
  year: undefined,
  month: undefined,
  day: undefined,
}

function formatStructuredPoint(point: StructuredPeriodPoint | null | undefined): string | null {
  if (!point || point.year == null) return null
  const prefix = point.era === 'BC' ? 'BC ' : ''
  const parts: string[] = [`${prefix}${point.year}년`]
  if (point.month != null) parts.push(`${point.month}월`)
  if (point.day != null) parts.push(`${point.day}일`)
  return parts.join(' ')
}

function formatMembershipPeriod(
  start: StructuredPeriodPoint | null | undefined,
  end: StructuredPeriodPoint | null | undefined,
): string | null {
  const startLabel = formatStructuredPoint(start)
  const endLabel = formatStructuredPoint(end)
  if (!startLabel && !endLabel) return null
  if (startLabel && endLabel) return `${startLabel} ~ ${endLabel}`
  if (startLabel) return `${startLabel} ~`
  return `~ ${endLabel}`
}

function toStructuredInput(val: PeriodDateValue): StructuredPeriodInput | null {
  if (!val.year || val.year <= 0) return null
  return {
    era: val.era ?? 'AD',
    year: val.year,
    month: val.month ?? null,
    day: val.day ?? null,
  }
}

function fromStructuredPoint(point: StructuredPeriodPoint | null | undefined): PeriodDateValue {
  if (!point) return { ...EMPTY_PERIOD_DATE }
  return {
    era: point.era,
    year: point.year,
    month: point.month ?? undefined,
    day: point.day ?? undefined,
  }
}

function formatIsoDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!match) return null
  return `${Number(match[1])}.${Number(match[2])}.${Number(match[3])}`
}

function formatIsoDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): string | null {
  const startLabel = formatIsoDate(startDate)
  const endLabel = formatIsoDate(endDate)
  if (!startLabel && !endLabel) return null
  if (startLabel && endLabel) return `${startLabel} ~ ${endLabel}`
  if (startLabel) return `${startLabel} ~`
  return `~ ${endLabel}`
}

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(iso)
  return match ? match[1] : ''
}

const HISTORICAL_LIST_KEY = ['historical-countries-list'] as const

const hasLeaderFlag = (role: HistoricalMembershipRole) =>
  role === 'CONFEDERATION_MEMBER' || role === 'UNION'

// ─── 공용 조각 ───────────────────────────────────────────────────────────────

/** 나라 이름 — 지금 보는 나라는 굵은 글자, 다른 나라는 그 나라 상세로 가는 링크 */
function CountryName({
  countryId,
  name,
  currentCountryId,
  fallback,
}: {
  countryId?: string | null
  name?: string | null
  currentCountryId: string
  fallback: string
}) {
  const label = name?.trim()
  if (!label) return <Muted>{fallback}</Muted>
  if (!countryId || countryId === currentCountryId) return <Self>{label}</Self>
  return (
    <CountryLink to={pathKeys.countryDetail(countryId)} title={`${label} 상세로 이동`}>
      {label}
    </CountryLink>
  )
}

function SectionHead({
  title,
  description,
  addLabel,
  onAdd,
}: {
  title: string
  description: string
  addLabel: string
  onAdd: () => void
}) {
  return (
    <Head>
      <HeadText>
        <Title>{title}</Title>
        <Description>{description}</Description>
      </HeadText>
      <PrimaryActionButton onClick={onAdd}>
        <FiPlus aria-hidden /> {addLabel}
      </PrimaryActionButton>
    </Head>
  )
}

/**
 * 나라 고르기 — 이 나라 자신은 뺀다.
 * 예전엔 역사국가 전체를 `<select>` 한 줄로 늘어놓아 검색도 존속기간 구별도 없었다 —
 * 공용 피커(역사국가만, 단일 선택)로 연다. 찾는 나라가 없으면 피커 안에서 바로 등록할 수 있다.
 */
function CountrySelect({
  id,
  value,
  onChange,
  excludeId,
}: {
  id: string
  value: string
  onChange: (next: string) => void
  excludeId: string
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const { data: countries = [], isLoading } = useQuery({
    queryKey: HISTORICAL_LIST_KEY,
    queryFn: getAllHistoricalCountries,
  })
  const candidates = countries.filter((country) => country.id !== excludeId)
  const selected = countries.find((country) => country.id === value)
  return (
    <>
      <CountryPickerField
        id={id}
        value={selected ? { name: selected.name } : null}
        placeholder={isLoading ? '불러오는 중…' : '국가 선택'}
        onOpen={() => setPickerOpen(true)}
        onClear={() => onChange('')}
      />
      <CountryPicker
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        mode="single"
        scope="historical"
        modernCountries={[]}
        historicalCountries={candidates}
        selectedIds={value ? [value] : []}
        isLoading={isLoading}
        onSelect={(country) => onChange(country.id)}
      />
    </>
  )
}

async function confirmRemove(what: string) {
  return confirm({
    title: `${what} 삭제`,
    message: `이 ${what}를 삭제할까요? 되돌릴 수 없습니다.`,
    confirmLabel: '삭제',
    danger: true,
  })
}

// ─── 계승 ────────────────────────────────────────────────────────────────────

export function SuccessionSection({ country }: { country: UnifiedCountry }) {
  const theme = useTheme()
  const isDark = theme.mode === 'dark'
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const historicalCountryId = country.id
  const queryKey = ['historical-country-transitions', historicalCountryId]
  const [addOpen, setAddOpen] = useState(false)
  const [directionFilter, setDirectionFilter] = useState<
    'all' | 'predecessor' | 'successor'
  >('all')
  const [eventTypeFilter, setEventTypeFilter] = useState<string | null>(null)
  const [editing, setEditing] = useState<HistoricalCountryTransitionDto | null>(null)
  const [form, setForm] = useState<{
    asPredecessor: boolean
    otherCountryId: string
    eventType: TransitionEventType
    transitionScope: TransitionScope | ''
  }>({
    asPredecessor: true,
    otherCountryId: '',
    eventType: 'SUCCESSION',
    transitionScope: '',
  })
  const [editForm, setEditForm] = useState<{
    eventType: TransitionEventType
    transitionScope: TransitionScope | ''
  }>({
    eventType: 'SUCCESSION',
    transitionScope: '',
  })

  const { data: transitions = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => getTransitionsByHistoricalCountryId(historicalCountryId),
  })

  const predecessors = transitions.filter(
    (transition) => transition.successorId === historicalCountryId,
  )
  const successors = transitions.filter(
    (transition) => transition.predecessorId === historicalCountryId,
  )
  const stateSuccessionCount = transitions.filter(
    (transition) => transition.transitionScope === 'STATE_SUCCESSION',
  ).length
  const regimeChangeCount = transitions.filter(
    (transition) => transition.transitionScope === 'REGIME_CHANGE',
  ).length

  const transitionTypeSlices = useMemo<SegmentSlice[]>(() => {
    const palette = isDark
      ? ['#a5b4fc', '#fbbf24', '#f87171', '#34d399', '#38bdf8', '#c084fc']
      : ['#4f46e5', '#d97706', '#dc2626', '#059669', '#0284c7', '#7c3aed']
    const counts = new Map<string, number>()
    for (const tr of transitions) {
      counts.set(tr.eventType, (counts.get(tr.eventType) ?? 0) + 1)
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([typeKey, cnt], idx) => ({
        key: typeKey,
        label: TRANSITION_EVENT_LABELS[typeKey] ?? typeKey,
        value: cnt,
        color: palette[idx % palette.length],
        meta: `${cnt}건`,
      }))
  }, [transitions, isDark])

  const filteredTransitions = transitions.filter((transition) => {
    if (directionFilter === 'predecessor') {
      if (transition.successorId !== historicalCountryId) return false
    } else if (directionFilter === 'successor') {
      if (transition.predecessorId !== historicalCountryId) return false
    }
    if (eventTypeFilter && transition.eventType !== eventTypeFilter) {
      return false
    }
    return true
  })

  const openAddWithDirection = (asPredecessor: boolean) => {
    setForm((prev) => ({
      ...prev,
      asPredecessor,
      otherCountryId: '',
    }))
    setAddOpen(true)
  }

  const invalidateSuccession = () => {
    void queryClient.invalidateQueries({ queryKey })
    void queryClient.invalidateQueries({
      queryKey: ['historical-countries', historicalCountryId, 'founding-summary'],
    })
    void queryClient.invalidateQueries({
      queryKey: ['historical-countries', historicalCountryId],
    })
  }

  const createMutation = useMutation({
    mutationFn: (body: CreateHistoricalCountryTransitionDto) => createHistoricalCountryTransition(body),
    onSuccess: () => {
      invalidateSuccession()
      setAddOpen(false)
      setForm({
        asPredecessor: true,
        otherCountryId: '',
        eventType: 'SUCCESSION',
        transitionScope: '',
      })
      notify.success('계승 관계를 추가했습니다')
    },
    onError: () => notify.error('계승 관계를 추가하지 못했습니다'),
  })
  const updateMutation = useMutation({
    mutationFn: ({
      transitionId,
      data,
    }: {
      transitionId: string
      data: UpdateHistoricalCountryTransitionDto
    }) => updateHistoricalCountryTransition(transitionId, data),
    onSuccess: () => {
      invalidateSuccession()
      setEditing(null)
      notify.success('계승 관계를 수정했습니다')
    },
    onError: () => notify.error('계승 관계를 수정하지 못했습니다'),
  })
  const deleteMutation = useMutation({
    mutationFn: (transitionId: string) => deleteHistoricalCountryTransition(transitionId),
    onSuccess: () => {
      invalidateSuccession()
      notify.success('계승 관계를 삭제했습니다')
    },
    onError: () => notify.error('계승 관계를 삭제하지 못했습니다'),
  })

  return (
    <DashboardStyles.DashboardRoot>
      <Section>
        <SectionHead
          title="계승·변천"
          description="전신 → 현재 국가 → 후신으로 이어지는 국가 주권·정통성 변천 다이어그램과 원장입니다."
          addLabel="계승 관계 추가"
          onAdd={() => setAddOpen(true)}
        />

        {transitions.length > 0 && (
          <DiagramBentoWrap>
            <BentoGridAsym $leftFr={1.35} $rightFr={1}>
              {/* 좌측: 3단계 시각 계승 다이어그램 */}
              <BentoCard aria-label="전신·후신 시각 계보 다이어그램">
                <BentoCardHeader>
                  <BentoCardTitleGroup>
                    <BentoCardTitle>전신 ──▶ 현재 ──▶ 후신 흐름도</BentoCardTitle>
                    <BentoCardBadge>총 {transitions.length}건</BentoCardBadge>
                  </BentoCardTitleGroup>
                </BentoCardHeader>
                <BentoCardBody>
                  <TriStageFlowGrid>
                    <TriStageCol>
                      <TriStageHeader>
                        전신 ({predecessors.length})
                      </TriStageHeader>
                      {predecessors.length > 0 ? (
                        predecessors.slice(0, 4).map((tr) => (
                          <DiagramNodeBtn
                            key={tr.id}
                            type="button"
                            onClick={() =>
                              tr.predecessorId &&
                              navigate(pathKeys.countryDetail(tr.predecessorId))
                            }
                          >
                            <strong>{tr.predecessorName ?? '전임 국가'}</strong>
                            <small>
                              {TRANSITION_EVENT_LABELS[tr.eventType] ??
                                tr.eventType}
                            </small>
                          </DiagramNodeBtn>
                        ))
                      ) : (
                        <DiagramEmptySlotBtn
                          type="button"
                          onClick={() => openAddWithDirection(false)}
                        >
                          + 전신 연결
                        </DiagramEmptySlotBtn>
                      )}
                      {predecessors.length > 4 && (
                        <DiagramMoreNote>
                          외 {predecessors.length - 4}개국
                        </DiagramMoreNote>
                      )}
                    </TriStageCol>

                    <TriArrowCol aria-hidden>
                      <FiArrowRight size={15} />
                    </TriArrowCol>

                    <TriStageCenterCard>
                      <CenterTag>현재 정치체</CenterTag>
                      <CenterName>{country.name}</CenterName>
                      <CenterPeriod>
                        {formatCountryPeriod(country) || '존속 연대'}
                      </CenterPeriod>
                    </TriStageCenterCard>

                    <TriArrowCol aria-hidden>
                      <FiArrowRight size={15} />
                    </TriArrowCol>

                    <TriStageCol>
                      <TriStageHeader>
                        후신 ({successors.length})
                      </TriStageHeader>
                      {successors.length > 0 ? (
                        successors.slice(0, 4).map((tr) => (
                          <DiagramNodeBtn
                            key={tr.id}
                            type="button"
                            onClick={() =>
                              tr.successorId &&
                              navigate(pathKeys.countryDetail(tr.successorId))
                            }
                          >
                            <strong>{tr.successorName ?? '후임 국가'}</strong>
                            <small>
                              {TRANSITION_EVENT_LABELS[tr.eventType] ??
                                tr.eventType}
                            </small>
                          </DiagramNodeBtn>
                        ))
                      ) : (
                        <DiagramEmptySlotBtn
                          type="button"
                          onClick={() => openAddWithDirection(true)}
                        >
                          + 후신 연결
                        </DiagramEmptySlotBtn>
                      )}
                      {successors.length > 4 && (
                        <DiagramMoreNote>
                          외 {successors.length - 4}개국
                        </DiagramMoreNote>
                      )}
                    </TriStageCol>
                  </TriStageFlowGrid>
                </BentoCardBody>
              </BentoCard>

              {/* 우측: 변천 방식 비중 */}
              <BentoCard aria-label="변천 방식 및 전환 성격 비중">
                <BentoCardHeader>
                  <BentoCardTitleGroup>
                    <BentoCardTitle>변천 방식 · 전환 성격</BentoCardTitle>
                    <BentoCardBadge>
                      국가계승 {stateSuccessionCount} · 정권교체 {regimeChangeCount}
                    </BentoCardBadge>
                  </BentoCardTitleGroup>
                  {eventTypeFilter && (
                    <InlineChipResetBtn
                      type="button"
                      onClick={() => setEventTypeFilter(null)}
                    >
                      전체 방식
                    </InlineChipResetBtn>
                  )}
                </BentoCardHeader>
                <BentoCardBody>
                  <StackedSegmentBar
                    slices={transitionTypeSlices}
                    height={10}
                    showPercent
                  />
                  <SliceFilterRow>
                    {transitionTypeSlices.map((slice) => {
                      const active = eventTypeFilter === slice.key
                      return (
                        <SliceFilterPill
                          key={slice.key}
                          type="button"
                          $active={active}
                          onClick={() =>
                            setEventTypeFilter((prev) =>
                              prev === slice.key ? null : slice.key,
                            )
                          }
                        >
                          <MiniColorDot $color={slice.color} />
                          <span>{slice.label}</span>
                          <strong>{slice.meta}</strong>
                        </SliceFilterPill>
                      )
                    })}
                  </SliceFilterRow>
                </BentoCardBody>
              </BentoCard>
            </BentoGridAsym>
          </DiagramBentoWrap>
        )}

        {isLoading ? (
          <LedgerTableSkeleton
            rows={4}
            columns={3}
            showToolbar={false}
            label="관계 기록을 불러오는 중"
          />
        ) : transitions.length === 0 ? (
          <CountryTabEmptyState
            Icon={FiGitBranch}
            title="아직 연결된 전신·후신 국가가 없습니다"
            description="이 국가의 성립 기반이 된 이전 왕조·정권(전신)이나, 멸망·전환 뒤 주권·정통성을 이어받은 국가(후신)를 연결합니다."
            actionLabel="전신 국가 연결"
            onAction={() => openAddWithDirection(false)}
            secondaryAction={{ label: '후신 국가 연결', onClick: () => openAddWithDirection(true) }}
          />
        ) : (
          <>
            <FilterToolbar>
              <FilterChipGroup role="tablist" aria-label="계승 방향 필터">
                <FilterChip
                  type="button"
                  role="tab"
                  aria-selected={directionFilter === 'all'}
                  $active={directionFilter === 'all'}
                  onClick={() => setDirectionFilter('all')}
                >
                  전체 <FilterChipCount>{transitions.length}</FilterChipCount>
                </FilterChip>
                <FilterChip
                  type="button"
                  role="tab"
                  aria-selected={directionFilter === 'predecessor'}
                  $active={directionFilter === 'predecessor'}
                  onClick={() => setDirectionFilter('predecessor')}
                >
                  전신 → {country.name}{' '}
                  <FilterChipCount>{predecessors.length}</FilterChipCount>
                </FilterChip>
                <FilterChip
                  type="button"
                  role="tab"
                  aria-selected={directionFilter === 'successor'}
                  $active={directionFilter === 'successor'}
                  onClick={() => setDirectionFilter('successor')}
                >
                  {country.name} → 후신{' '}
                  <FilterChipCount>{successors.length}</FilterChipCount>
                </FilterChip>
              </FilterChipGroup>
              <QuickAddGroup>
                <QuickAddBtn
                  type="button"
                  onClick={() => openAddWithDirection(false)}
                >
                  + 전신 추가
                </QuickAddBtn>
                <QuickAddBtn
                  type="button"
                  onClick={() => openAddWithDirection(true)}
                >
                  + 후신 추가
                </QuickAddBtn>
              </QuickAddGroup>
            </FilterToolbar>

            {filteredTransitions.length === 0 ? (
              <Empty>선택한 방향에 해당하는 계승·변천 기록이 없습니다.</Empty>
            ) : (
              <List>
                {filteredTransitions.map((transition) => {
                  const isPredecessorRow =
                    transition.successorId === historicalCountryId
                  return (
                    <Row key={transition.id}>
                      <RowMain>
                        <DirectionBadge $inbound={isPredecessorRow}>
                          {isPredecessorRow ? '전신' : '후신'}
                        </DirectionBadge>
                        <CountryName
                          countryId={transition.predecessorId}
                          name={transition.predecessorName}
                          currentCountryId={country.id}
                          fallback="(전임)"
                        />
                        <Arrow aria-label="에서">
                          <FiArrowRight aria-hidden />
                        </Arrow>
                        <CountryName
                          countryId={transition.successorId}
                          name={transition.successorName}
                          currentCountryId={country.id}
                          fallback="(후임)"
                        />
                        <Tag>
                          {TRANSITION_EVENT_LABELS[transition.eventType] ??
                            transition.eventType}
                        </Tag>
                        {transition.transitionScope && (
                          <AccentTag>
                            {TRANSITION_SCOPE_LABELS[transition.transitionScope] ??
                              transition.transitionScope}
                          </AccentTag>
                        )}
                        {transition.successorStartDate && (
                          <Muted>{transition.successorStartDate}</Muted>
                        )}
                      </RowMain>
                      <RowActions>
                        <TextButton
                          type="button"
                          onClick={() => {
                            setEditing(transition)
                            setEditForm({
                              eventType: transition.eventType,
                              transitionScope: transition.transitionScope ?? '',
                            })
                          }}
                        >
                          수정
                        </TextButton>
                        <DangerTextButton
                          type="button"
                          disabled={deleteMutation.isPending}
                          onClick={async () => {
                            if (await confirmRemove('계승 관계'))
                              deleteMutation.mutate(transition.id)
                          }}
                        >
                          삭제
                        </DangerTextButton>
                      </RowActions>
                    </Row>
                  )
                })}
              </List>
            )}
          </>
        )}
      </Section>

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="계승·변천 수정" size="narrow">
        <ModalBody>
          {editing && (
            <FormNote>
              <strong>{editing.predecessorName ?? '(전임)'}</strong> →{' '}
              <strong>{editing.successorName ?? '(후임)'}</strong>
            </FormNote>
          )}
          <Field>
            <Label htmlFor="succession-edit-type">방식</Label>
            <Select
              id="succession-edit-type"
              value={editForm.eventType}
              onChange={(changeEvent) =>
                setEditForm((prev) => ({
                  ...prev,
                  eventType: changeEvent.target.value as TransitionEventType,
                }))
              }
            >
              {(Object.keys(TRANSITION_EVENT_LABELS) as TransitionEventType[]).map((key) => (
                <option key={key} value={key}>
                  {TRANSITION_EVENT_LABELS[key]}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <Label htmlFor="succession-edit-scope">전환 성격 (선택)</Label>
            <Select
              id="succession-edit-scope"
              value={editForm.transitionScope}
              onChange={(changeEvent) =>
                setEditForm((prev) => ({
                  ...prev,
                  transitionScope: changeEvent.target.value as TransitionScope | '',
                }))
              }
            >
              <option value="">미지정 (자동)</option>
              <option value="STATE_SUCCESSION">국가 계승 (주권 단위 변경)</option>
              <option value="REGIME_CHANGE">정권 교체 (영토는 그대로)</option>
            </Select>
          </Field>
        </ModalBody>
        <ModalFooter>
          <SecondaryButton type="button" onClick={() => setEditing(null)}>
            취소
          </SecondaryButton>
          <PrimaryButton
            type="button"
            disabled={updateMutation.isPending}
            onClick={() =>
              editing &&
              updateMutation.mutate({
                transitionId: editing.id,
                data: {
                  eventType: editForm.eventType,
                  transitionScope: editForm.transitionScope || null,
                },
              })
            }
          >
            {updateMutation.isPending ? '저장 중…' : '저장'}
          </PrimaryButton>
        </ModalFooter>
      </Modal>

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="계승 관계 추가" size="narrow">
        <ModalBody>
          <Field>
            <Label htmlFor="succession-direction">방향</Label>
            <Select
              id="succession-direction"
              value={form.asPredecessor ? 'successor' : 'predecessor'}
              onChange={(changeEvent) =>
                setForm((prev) => ({
                  ...prev,
                  asPredecessor: changeEvent.target.value === 'successor',
                }))
              }
            >
              <option value="successor">후임 추가 — {country.name} → 후임 국가</option>
              <option value="predecessor">전임 추가 — 전임 국가 → {country.name}</option>
            </Select>
          </Field>
          <Field>
            <Label htmlFor="succession-other">
              {form.asPredecessor ? '후임 국가' : '전임 국가'}
            </Label>
            <CountrySelect
              id="succession-other"
              value={form.otherCountryId}
              onChange={(otherCountryId) => setForm((prev) => ({ ...prev, otherCountryId }))}
              excludeId={historicalCountryId}
            />
          </Field>
          <Field>
            <Label htmlFor="succession-type">방식</Label>
            <Select
              id="succession-type"
              value={form.eventType}
              onChange={(changeEvent) =>
                setForm((prev) => ({ ...prev, eventType: changeEvent.target.value as TransitionEventType }))
              }
            >
              {(Object.keys(TRANSITION_EVENT_LABELS) as TransitionEventType[]).map((key) => (
                <option key={key} value={key}>
                  {TRANSITION_EVENT_LABELS[key]}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <Label htmlFor="succession-scope">전환 성격 (선택)</Label>
            <Select
              id="succession-scope"
              value={form.transitionScope}
              onChange={(changeEvent) =>
                setForm((prev) => ({
                  ...prev,
                  transitionScope: changeEvent.target.value as TransitionScope | '',
                }))
              }
            >
              <option value="">미지정 (자동)</option>
              <option value="STATE_SUCCESSION">국가 계승 (주권 단위 변경)</option>
              <option value="REGIME_CHANGE">정권 교체 (영토는 그대로)</option>
            </Select>
          </Field>
          <FormHint>변천 시점은 후임 국가의 존속 시작을 따른다.</FormHint>
        </ModalBody>
        <ModalFooter>
          <SecondaryButton type="button" onClick={() => setAddOpen(false)}>
            취소
          </SecondaryButton>
          <PrimaryButton
            type="button"
            disabled={!form.otherCountryId || createMutation.isPending}
            onClick={() =>
              createMutation.mutate({
                predecessorId: form.asPredecessor ? historicalCountryId : form.otherCountryId,
                successorId: form.asPredecessor ? form.otherCountryId : historicalCountryId,
                eventType: form.eventType,
                transitionScope: form.transitionScope || undefined,
              })
            }
          >
            {createMutation.isPending ? '등록 중…' : '등록'}
          </PrimaryButton>
        </ModalFooter>
      </Modal>
    </DashboardStyles.DashboardRoot>
  )
}

// ─── 소속·구성 ───────────────────────────────────────────────────────────────

export function MembershipSection({ country }: { country: UnifiedCountry }) {
  const theme = useTheme()
  const isDark = theme.mode === 'dark'
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const historicalCountryId = country.id
  const queryKey = ['historical-country-memberships', historicalCountryId]
  const [addOpen, setAddOpen] = useState(false)
  const [positionFilter, setPositionFilter] = useState<
    'all' | 'asMember' | 'asParent'
  >('all')
  const [roleFilter, setRoleFilter] =
    useState<HistoricalMembershipRole | null>(null)
  const [editing, setEditing] = useState<HistoricalCountryMembershipDto | null>(null)
  const [form, setForm] = useState<{
    asParent: boolean
    otherCountryId: string
    role: HistoricalMembershipRole
    isLeadingMember: boolean
    start: PeriodDateValue
    end: PeriodDateValue
  }>({
    asParent: true,
    otherCountryId: '',
    role: 'VASSAL_STATE',
    isLeadingMember: false,
    start: { ...EMPTY_PERIOD_DATE },
    end: { ...EMPTY_PERIOD_DATE },
  })
  const [editForm, setEditForm] = useState<{
    role: HistoricalMembershipRole
    isLeadingMember: boolean
    start: PeriodDateValue
    end: PeriodDateValue
  }>({
    role: 'VASSAL_STATE',
    isLeadingMember: false,
    start: { ...EMPTY_PERIOD_DATE },
    end: { ...EMPTY_PERIOD_DATE },
  })

  const { data: memberships = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => getMembershipsByHistoricalCountryId(historicalCountryId),
  })

  const asParentList = memberships.filter(
    (membership) => membership.historicalCountryId === historicalCountryId,
  )
  const asMemberList = memberships.filter(
    (membership) => membership.memberCountryId === historicalCountryId,
  )
  const leadingCount = memberships.filter(
    (membership) => Boolean(membership.isLeadingMember),
  ).length

  const roleSlices = useMemo<
    Array<SegmentSlice & { roleKey: HistoricalMembershipRole }>
  >(() => {
    const palette = isDark
      ? ['#a5b4fc', '#38bdf8', '#fbbf24', '#34d399', '#f87171', '#c084fc']
      : ['#4f46e5', '#0284c7', '#d97706', '#059669', '#dc2626', '#7c3aed']
    const counts = new Map<HistoricalMembershipRole, number>()
    for (const m of memberships) {
      counts.set(m.role, (counts.get(m.role) ?? 0) + 1)
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([roleKey, cnt], idx) => ({
        key: roleKey,
        roleKey,
        label: MEMBERSHIP_ROLE_LABELS[roleKey] ?? roleKey,
        value: cnt,
        color: palette[idx % palette.length],
        meta: `${cnt}건`,
      }))
  }, [memberships, isDark])

  const filteredMemberships = memberships.filter((membership) => {
    if (positionFilter === 'asMember') {
      if (membership.memberCountryId !== historicalCountryId) return false
    } else if (positionFilter === 'asParent') {
      if (membership.historicalCountryId !== historicalCountryId) return false
    }
    if (roleFilter && membership.role !== roleFilter) return false
    return true
  })

  const openAddWithPosition = (asParent: boolean) => {
    setForm((prev) => ({
      ...prev,
      asParent,
      otherCountryId: '',
    }))
    setAddOpen(true)
  }

  const createMutation = useMutation({
    mutationFn: (body: CreateHistoricalCountryMembershipDto) => createHistoricalCountryMembership(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey })
      setAddOpen(false)
      setForm({
        asParent: true,
        otherCountryId: '',
        role: 'VASSAL_STATE',
        isLeadingMember: false,
        start: { ...EMPTY_PERIOD_DATE },
        end: { ...EMPTY_PERIOD_DATE },
      })
      notify.success('소속·구성 관계를 추가했습니다')
    },
    onError: () => notify.error('소속·구성 관계를 추가하지 못했습니다'),
  })
  const updateMutation = useMutation({
    mutationFn: ({ membershipId, data }: { membershipId: string; data: UpdateHistoricalCountryMembershipDto }) =>
      updateHistoricalCountryMembership(membershipId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey })
      setEditing(null)
      notify.success('소속·구성 관계를 수정했습니다')
    },
    onError: () => notify.error('소속·구성 관계를 수정하지 못했습니다'),
  })
  const deleteMutation = useMutation({
    mutationFn: (membershipId: string) => deleteHistoricalCountryMembership(membershipId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey })
      notify.success('소속·구성 관계를 삭제했습니다')
    },
    onError: () => notify.error('소속·구성 관계를 삭제하지 못했습니다'),
  })

  return (
    <DashboardStyles.DashboardRoot>
      <Section>
        <SectionHead
          title="소속·구성"
          description="상위 종주국·제국·연방과 하위 제후국·속국·식민지 사이의 수직 포함 위계를 조망합니다."
          addLabel="소속·구성 추가"
          onAdd={() => setAddOpen(true)}
        />

        {memberships.length > 0 && (
          <DiagramBentoWrap>
            <BentoGridAsym $leftFr={1.3} $rightFr={1}>
              {/* 좌측: 상·하위 포함 위계 다이어그램 */}
              <BentoCard aria-label="상·하위 정치체 포함 위계 다이어그램">
                <BentoCardHeader>
                  <BentoCardTitleGroup>
                    <BentoCardTitle>상위 소속 ⊃ 현재 ⊃ 하위 구성 위계</BentoCardTitle>
                    <BentoCardBadge>
                      상위 {asMemberList.length} · 하위 {asParentList.length}
                    </BentoCardBadge>
                  </BentoCardTitleGroup>
                </BentoCardHeader>
                <BentoCardBody>
                  <TriStageFlowGrid>
                    <TriStageCol>
                      <TriStageHeader>
                        상위 소속 ({asMemberList.length})
                      </TriStageHeader>
                      {asMemberList.length > 0 ? (
                        asMemberList.slice(0, 4).map((m) => (
                          <DiagramNodeBtn
                            key={m.id}
                            type="button"
                            onClick={() =>
                              m.historicalCountryId &&
                              navigate(
                                pathKeys.countryDetail(m.historicalCountryId),
                              )
                            }
                          >
                            <strong>{m.parentName ?? '상위 정치체'}</strong>
                            <small>
                              {MEMBERSHIP_ROLE_LABELS[m.role] ?? m.role}
                            </small>
                          </DiagramNodeBtn>
                        ))
                      ) : (
                        <DiagramEmptySlotBtn
                          type="button"
                          onClick={() => openAddWithPosition(false)}
                        >
                          + 상위 정치체 연결
                        </DiagramEmptySlotBtn>
                      )}
                    </TriStageCol>

                    <TriArrowCol aria-hidden>⊃</TriArrowCol>

                    <TriStageCenterCard>
                      <CenterTag>현재 정치체</CenterTag>
                      <CenterName>{country.name}</CenterName>
                      {leadingCount > 0 && (
                        <CenterPeriod>주축 기록 {leadingCount}건</CenterPeriod>
                      )}
                    </TriStageCenterCard>

                    <TriArrowCol aria-hidden>⊃</TriArrowCol>

                    <TriStageCol>
                      <TriStageHeader>
                        거느린 하위 ({asParentList.length})
                      </TriStageHeader>
                      {asParentList.length > 0 ? (
                        asParentList.slice(0, 4).map((m) => (
                          <DiagramNodeBtn
                            key={m.id}
                            type="button"
                            onClick={() =>
                              m.memberCountryId &&
                              navigate(
                                pathKeys.countryDetail(m.memberCountryId),
                              )
                            }
                          >
                            <strong>{m.memberName ?? '하위 정치체'}</strong>
                            <small>
                              {MEMBERSHIP_ROLE_LABELS[m.role] ?? m.role}
                              {m.isLeadingMember ? ' · 주축' : ''}
                            </small>
                          </DiagramNodeBtn>
                        ))
                      ) : (
                        <DiagramEmptySlotBtn
                          type="button"
                          onClick={() => openAddWithPosition(true)}
                        >
                          + 하위 구성국 연결
                        </DiagramEmptySlotBtn>
                      )}
                      {asParentList.length > 4 && (
                        <DiagramMoreNote>
                          외 {asParentList.length - 4}개국
                        </DiagramMoreNote>
                      )}
                    </TriStageCol>
                  </TriStageFlowGrid>
                </BentoCardBody>
              </BentoCard>

              {/* 우측: 소속 역할 구성 도넛 */}
              <BentoCard aria-label="소속·구성 역할 분포">
                <BentoCardHeader>
                  <BentoCardTitleGroup>
                    <BentoCardTitle>소속 역할 구성</BentoCardTitle>
                    <BentoCardBadge>{roleSlices.length}개 유형</BentoCardBadge>
                  </BentoCardTitleGroup>
                  {roleFilter && (
                    <InlineChipResetBtn
                      type="button"
                      onClick={() => setRoleFilter(null)}
                    >
                      전체 역할
                    </InlineChipResetBtn>
                  )}
                </BentoCardHeader>
                <BentoCardBody>
                  <DonutRoleRow>
                    <MiniDonutRing
                      slices={roleSlices}
                      size={74}
                      strokeWidth={10}
                      centerValue={String(memberships.length)}
                      centerLabel="총 건수"
                    />
                    <DonutRoleLegend>
                      {roleSlices.map((slice) => {
                        const active = roleFilter === slice.roleKey
                        return (
                          <SliceFilterPill
                            key={slice.key}
                            type="button"
                            $active={active}
                            onClick={() =>
                              setRoleFilter((prev) =>
                                prev === slice.roleKey ? null : slice.roleKey,
                              )
                            }
                          >
                            <MiniColorDot $color={slice.color} />
                            <span>{slice.label}</span>
                            <strong>{slice.meta}</strong>
                          </SliceFilterPill>
                        )
                      })}
                    </DonutRoleLegend>
                  </DonutRoleRow>
                </BentoCardBody>
              </BentoCard>
            </BentoGridAsym>
          </DiagramBentoWrap>
        )}

        {isLoading ? (
          <LedgerTableSkeleton
            rows={4}
            columns={3}
            showToolbar={false}
            label="관계 기록을 불러오는 중"
          />
        ) : memberships.length === 0 ? (
          <CountryTabEmptyState
            Icon={FiLayers}
            title="아직 등록된 소속·구성 관계가 없습니다"
            description="이 국가가 제후국·속국·식민지·연방 구성원으로 속했던 상위 정치체나, 종주국·제국으로서 거느린 하위 구성국·속령을 등록합니다."
            actionLabel="상위 정치체 연결"
            onAction={() => openAddWithPosition(false)}
            secondaryAction={{ label: '하위 구성국 연결', onClick: () => openAddWithPosition(true) }}
          />
        ) : (
          <>
            <FilterToolbar>
              <FilterChipGroup role="tablist" aria-label="소속·구성 위치 필터">
                <FilterChip
                  type="button"
                  role="tab"
                  aria-selected={positionFilter === 'all'}
                  $active={positionFilter === 'all'}
                  onClick={() => setPositionFilter('all')}
                >
                  전체 <FilterChipCount>{memberships.length}</FilterChipCount>
                </FilterChip>
                <FilterChip
                  type="button"
                  role="tab"
                  aria-selected={positionFilter === 'asMember'}
                  $active={positionFilter === 'asMember'}
                  onClick={() => setPositionFilter('asMember')}
                >
                  소속된 상위 국가{' '}
                  <FilterChipCount>{asMemberList.length}</FilterChipCount>
                </FilterChip>
                <FilterChip
                  type="button"
                  role="tab"
                  aria-selected={positionFilter === 'asParent'}
                  $active={positionFilter === 'asParent'}
                  onClick={() => setPositionFilter('asParent')}
                >
                  거느린 하위 국가{' '}
                  <FilterChipCount>{asParentList.length}</FilterChipCount>
                </FilterChip>
              </FilterChipGroup>
              <QuickAddGroup>
                <QuickAddBtn
                  type="button"
                  onClick={() => openAddWithPosition(false)}
                >
                  + 상위 국가 추가
                </QuickAddBtn>
                <QuickAddBtn
                  type="button"
                  onClick={() => openAddWithPosition(true)}
                >
                  + 하위 국가 추가
                </QuickAddBtn>
              </QuickAddGroup>
            </FilterToolbar>

            {filteredMemberships.length === 0 ? (
              <Empty>선택한 위치에 해당하는 소속·구성 기록이 없습니다.</Empty>
            ) : (
              <List>
                {filteredMemberships.map((membership) => {
                  const periodLabel = formatMembershipPeriod(
                    membership.start,
                    membership.end,
                  )
                  const isParent =
                    membership.historicalCountryId === historicalCountryId
                  return (
                    <Row key={membership.id}>
                      <RowMain>
                        <DirectionBadge $inbound={!isParent}>
                          {isParent ? '하위포함' : '상위소속'}
                        </DirectionBadge>
                        <CountryName
                          countryId={membership.historicalCountryId}
                          name={membership.parentName}
                          currentCountryId={country.id}
                          fallback="(상위)"
                        />
                        <Muted aria-hidden>⊃</Muted>
                        <CountryName
                          countryId={membership.memberCountryId}
                          name={membership.memberName}
                          currentCountryId={country.id}
                          fallback="(하위)"
                        />
                        <Tag>
                          {MEMBERSHIP_ROLE_LABELS[membership.role] ??
                            membership.role}
                        </Tag>
                        {membership.isLeadingMember && <AccentTag>주축</AccentTag>}
                        {periodLabel && <Muted>{periodLabel}</Muted>}
                      </RowMain>
                      <RowActions>
                        <TextButton
                          type="button"
                          onClick={() => {
                            setEditing(membership)
                            setEditForm({
                              role: membership.role,
                              isLeadingMember: !!membership.isLeadingMember,
                              start: fromStructuredPoint(membership.start),
                              end: fromStructuredPoint(membership.end),
                            })
                          }}
                        >
                          수정
                        </TextButton>
                        <DangerTextButton
                          type="button"
                          disabled={deleteMutation.isPending}
                          onClick={async () => {
                            if (await confirmRemove('소속·구성 관계'))
                              deleteMutation.mutate(membership.id)
                          }}
                        >
                          삭제
                        </DangerTextButton>
                      </RowActions>
                    </Row>
                  )
                })}
              </List>
            )}
          </>
        )}
      </Section>

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="소속·구성 수정" size="narrow">
        <ModalBody>
          {editing && (
            <FormNote>
              {editing.parentName ?? '(상위)'} ⊃ {editing.memberName ?? '(하위)'}
            </FormNote>
          )}
          <Field>
            <Label htmlFor="membership-edit-role">역할</Label>
            <Select
              id="membership-edit-role"
              value={editForm.role}
              onChange={(changeEvent) =>
                setEditForm((prev) => ({ ...prev, role: changeEvent.target.value as HistoricalMembershipRole }))
              }
            >
              {(Object.keys(MEMBERSHIP_ROLE_LABELS) as HistoricalMembershipRole[]).map((key) => (
                <option key={key} value={key}>
                  {MEMBERSHIP_ROLE_LABELS[key]}
                </option>
              ))}
            </Select>
          </Field>
          {hasLeaderFlag(editForm.role) && (
            <CheckField>
              <input
                type="checkbox"
                checked={editForm.isLeadingMember}
                onChange={(changeEvent) =>
                  setEditForm((prev) => ({ ...prev, isLeadingMember: changeEvent.target.checked }))
                }
              />
              주축(주도국)
            </CheckField>
          )}
          <Field>
            <Label>소속 시작 시점 (선택)</Label>
            <PeriodDateField
              ariaLabel="소속 시작 시점"
              pickerTitle="소속 시작 시점 선택"
              {...editForm.start}
              onChange={(start) => setEditForm((prev) => ({ ...prev, start }))}
            />
          </Field>
          <Field>
            <Label>소속 종료 시점 (선택)</Label>
            <PeriodDateField
              ariaLabel="소속 종료 시점"
              pickerTitle="소속 종료 시점 선택"
              {...editForm.end}
              onChange={(end) => setEditForm((prev) => ({ ...prev, end }))}
            />
          </Field>
        </ModalBody>
        <ModalFooter>
          <SecondaryButton type="button" onClick={() => setEditing(null)}>
            취소
          </SecondaryButton>
          <PrimaryButton
            type="button"
            disabled={updateMutation.isPending}
            onClick={() =>
              editing &&
              updateMutation.mutate({
                membershipId: editing.id,
                data: {
                  role: editForm.role,
                  isLeadingMember: hasLeaderFlag(editForm.role) ? editForm.isLeadingMember : false,
                  start: toStructuredInput(editForm.start),
                  end: toStructuredInput(editForm.end),
                },
              })
            }
          >
            {updateMutation.isPending ? '저장 중…' : '저장'}
          </PrimaryButton>
        </ModalFooter>
      </Modal>

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="소속·구성 추가" size="narrow">
        <ModalBody>
          <Field>
            <Label htmlFor="membership-position">이 나라의 위치</Label>
            <Select
              id="membership-position"
              value={form.asParent ? 'parent' : 'member'}
              onChange={(changeEvent) =>
                setForm((prev) => ({ ...prev, asParent: changeEvent.target.value === 'parent' }))
              }
            >
              <option value="parent">상위 — 이 나라가 포함하는 하위 국가 추가</option>
              <option value="member">하위 — 이 나라가 소속된 상위 국가 추가</option>
            </Select>
          </Field>
          <Field>
            <Label htmlFor="membership-other">{form.asParent ? '하위 국가' : '상위 국가'}</Label>
            <CountrySelect
              id="membership-other"
              value={form.otherCountryId}
              onChange={(otherCountryId) => setForm((prev) => ({ ...prev, otherCountryId }))}
              excludeId={historicalCountryId}
            />
          </Field>
          <Field>
            <Label htmlFor="membership-role">역할</Label>
            <Select
              id="membership-role"
              value={form.role}
              onChange={(changeEvent) =>
                setForm((prev) => ({ ...prev, role: changeEvent.target.value as HistoricalMembershipRole }))
              }
            >
              {(Object.keys(MEMBERSHIP_ROLE_LABELS) as HistoricalMembershipRole[]).map((key) => (
                <option key={key} value={key}>
                  {MEMBERSHIP_ROLE_LABELS[key]}
                </option>
              ))}
            </Select>
          </Field>
          {hasLeaderFlag(form.role) && (
            <>
              <CheckField>
                <input
                  type="checkbox"
                  checked={form.isLeadingMember}
                  onChange={(changeEvent) =>
                    setForm((prev) => ({ ...prev, isLeadingMember: changeEvent.target.checked }))
                  }
                />
                주축(주도국)
              </CheckField>
              <FormHint>연방·연합 안에서 주도적 역할을 한 구성원(예: 독일 제국 안의 프로이센)</FormHint>
            </>
          )}
          <Field>
            <Label>소속 시작 시점 (선택)</Label>
            <PeriodDateField
              ariaLabel="소속 시작 시점"
              pickerTitle="소속 시작 시점 선택"
              {...form.start}
              onChange={(start) => setForm((prev) => ({ ...prev, start }))}
            />
          </Field>
          <Field>
            <Label>소속 종료 시점 (선택)</Label>
            <PeriodDateField
              ariaLabel="소속 종료 시점"
              pickerTitle="소속 종료 시점 선택"
              {...form.end}
              onChange={(end) => setForm((prev) => ({ ...prev, end }))}
            />
          </Field>
        </ModalBody>
        <ModalFooter>
          <SecondaryButton type="button" onClick={() => setAddOpen(false)}>
            취소
          </SecondaryButton>
          <PrimaryButton
            type="button"
            disabled={!form.otherCountryId || createMutation.isPending}
            onClick={() =>
              createMutation.mutate({
                historicalCountryId: form.asParent ? historicalCountryId : form.otherCountryId,
                memberCountryId: form.asParent ? form.otherCountryId : historicalCountryId,
                role: form.role,
                isLeadingMember: hasLeaderFlag(form.role) ? form.isLeadingMember : undefined,
                start: toStructuredInput(form.start) ?? undefined,
                end: toStructuredInput(form.end) ?? undefined,
              })
            }
          >
            {createMutation.isPending ? '등록 중…' : '등록'}
          </PrimaryButton>
        </ModalFooter>
      </Modal>
    </DashboardStyles.DashboardRoot>
  )
}

// ─── 국가 관계 ───────────────────────────────────────────────────────────────

export function RelationSection({ country }: { country: UnifiedCountry }) {
  const theme = useTheme()
  const isDark = theme.mode === 'dark'
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const historicalCountryId = country.id
  const queryKey = ['historical-country-relations', historicalCountryId]
  const [addOpen, setAddOpen] = useState(false)
  const [typeFilter, setTypeFilter] = useState<
    'all' | 'cooperative' | 'hierarchical' | 'conflict'
  >('all')
  const [partnerFilterId, setPartnerFilterId] = useState<string | null>(null)
  const [editing, setEditing] = useState<HistoricalCountryRelationDto | null>(null)
  const [form, setForm] = useState<{
    asSubject: boolean
    otherCountryId: string
    relationType: HistoricalRelationType
    startDate: string
    endDate: string
  }>({
    asSubject: true,
    otherCountryId: '',
    relationType: 'TRIBUTARY',
    startDate: '',
    endDate: '',
  })
  const [editForm, setEditForm] = useState<{
    relationType: HistoricalRelationType
    startDate: string
    endDate: string
  }>({
    relationType: 'TRIBUTARY',
    startDate: '',
    endDate: '',
  })

  const { data: relations = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => getRelationsByHistoricalCountryId(historicalCountryId),
  })

  const cooperativeList = relations.filter(
    (relation) =>
      relation.relationType === 'ALLIANCE' ||
      relation.relationType === 'PERSONAL_UNION',
  )
  const hierarchicalList = relations.filter(
    (relation) =>
      relation.relationType === 'TRIBUTARY' ||
      relation.relationType === 'SUZERAIN_VASSAL',
  )
  const conflictList = relations.filter(
    (relation) => relation.relationType === 'WAR',
  )

  const relationToneSlices = useMemo<
    Array<
      SegmentSlice & {
        filterKey: 'cooperative' | 'hierarchical' | 'conflict'
      }
    >
  >(
    () =>
      [
        {
          key: 'cooperative',
          filterKey: 'cooperative' as const,
          label: '동맹 · 동군연합',
          value: cooperativeList.length,
          color: isDark ? '#34d399' : '#059669',
          meta: `${cooperativeList.length}건`,
        },
        {
          key: 'hierarchical',
          filterKey: 'hierarchical' as const,
          label: '조공·책봉 · 종속',
          value: hierarchicalList.length,
          color: isDark ? '#fbbf24' : '#d97706',
          meta: `${hierarchicalList.length}건`,
        },
        {
          key: 'conflict',
          filterKey: 'conflict' as const,
          label: '전쟁 · 교전',
          value: conflictList.length,
          color: isDark ? '#f87171' : '#dc2626',
          meta: `${conflictList.length}건`,
        },
      ].filter((s) => s.value > 0),
    [cooperativeList.length, hierarchicalList.length, conflictList.length, isDark],
  )

  const topPartners = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>()
    for (const rel of relations) {
      const isSub = rel.subjectCountryId === historicalCountryId
      const otherId = isSub ? rel.objectCountryId : rel.subjectCountryId
      const otherName =
        (isSub ? rel.objectCountryName : rel.subjectCountryName) ?? '상대 국가'
      if (!otherId) continue
      const existing = map.get(otherId)
      if (existing) existing.count += 1
      else map.set(otherId, { id: otherId, name: otherName, count: 1 })
    }
    const sorted = [...map.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
    const maxCount = Math.max(1, ...sorted.map((s) => s.count))
    return { items: sorted, maxCount }
  }, [relations, historicalCountryId])

  const filteredRelations = relations.filter((relation) => {
    if (typeFilter === 'cooperative') {
      if (
        relation.relationType !== 'ALLIANCE' &&
        relation.relationType !== 'PERSONAL_UNION'
      ) {
        return false
      }
    } else if (typeFilter === 'hierarchical') {
      if (
        relation.relationType !== 'TRIBUTARY' &&
        relation.relationType !== 'SUZERAIN_VASSAL'
      ) {
        return false
      }
    } else if (typeFilter === 'conflict') {
      if (relation.relationType !== 'WAR') return false
    }
    if (partnerFilterId) {
      if (
        relation.subjectCountryId !== partnerFilterId &&
        relation.objectCountryId !== partnerFilterId
      ) {
        return false
      }
    }
    return true
  })

  const openAddWithRelationType = (relationType: HistoricalRelationType) => {
    setForm((prev) => ({
      ...prev,
      relationType,
      otherCountryId: '',
    }))
    setAddOpen(true)
  }

  const createMutation = useMutation({
    mutationFn: (body: CreateHistoricalCountryRelationDto) => createHistoricalCountryRelation(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey })
      setAddOpen(false)
      setForm({
        asSubject: true,
        otherCountryId: '',
        relationType: 'TRIBUTARY',
        startDate: '',
        endDate: '',
      })
      notify.success('국가 관계를 추가했습니다')
    },
    onError: () => notify.error('국가 관계를 추가하지 못했습니다'),
  })
  const updateMutation = useMutation({
    mutationFn: ({
      relationId,
      data,
    }: {
      relationId: string
      data: UpdateHistoricalCountryRelationDto
    }) => updateHistoricalCountryRelation(relationId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey })
      setEditing(null)
      notify.success('국가 관계를 수정했습니다')
    },
    onError: () => notify.error('국가 관계를 수정하지 못했습니다'),
  })
  const deleteMutation = useMutation({
    mutationFn: (relationId: string) => deleteHistoricalCountryRelation(relationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey })
      notify.success('국가 관계를 삭제했습니다')
    },
    onError: () => notify.error('국가 관계를 삭제하지 못했습니다'),
  })

  return (
    <DashboardStyles.DashboardRoot>
      <Section>
        <SectionHead
          title="국가 관계"
          description="동맹·동군연합, 조공·책봉·종주-속국, 전쟁 등 주변 역사 국가들과 맺은 대외 관계 인포그래픽입니다."
          addLabel="관계 추가"
          onAdd={() => setAddOpen(true)}
        />

        {relations.length > 0 && (
          <DiagramBentoWrap>
            <BentoGrid2Col>
              {/* 좌측: 외교·교전 성격 도넛 */}
              <BentoCard aria-label="국가 관계 성격 비중">
                <BentoCardHeader>
                  <BentoCardTitleGroup>
                    <BentoCardTitle>대외 관계 성격 비중</BentoCardTitle>
                    <BentoCardBadge>총 {relations.length}건</BentoCardBadge>
                  </BentoCardTitleGroup>
                  {typeFilter !== 'all' && (
                    <InlineChipResetBtn
                      type="button"
                      onClick={() => setTypeFilter('all')}
                    >
                      전체 유형
                    </InlineChipResetBtn>
                  )}
                </BentoCardHeader>
                <BentoCardBody>
                  <DonutRoleRow>
                    <MiniDonutRing
                      slices={relationToneSlices}
                      size={74}
                      strokeWidth={10}
                      centerValue={String(relations.length)}
                      centerLabel="대외 관계"
                    />
                    <DonutRoleLegend>
                      {relationToneSlices.map((slice) => {
                        const active = typeFilter === slice.filterKey
                        return (
                          <SliceFilterPill
                            key={slice.key}
                            type="button"
                            $active={active}
                            onClick={() =>
                              setTypeFilter((prev) =>
                                prev === slice.filterKey
                                  ? 'all'
                                  : slice.filterKey,
                              )
                            }
                          >
                            <MiniColorDot $color={slice.color} />
                            <span>{slice.label}</span>
                            <strong>{slice.meta}</strong>
                          </SliceFilterPill>
                        )
                      })}
                    </DonutRoleLegend>
                  </DonutRoleRow>
                </BentoCardBody>
              </BentoCard>

              {/* 우측: 주요 관계 상대국 Top 5 비례 막대 */}
              <BentoCard aria-label="주요 외교·교전 상대국">
                <BentoCardHeader>
                  <BentoCardTitleGroup>
                    <BentoCardTitle>주요 외교 · 교전 상대국 Top 5</BentoCardTitle>
                    <BentoCardBadge>
                      {topPartners.items.length}개국
                    </BentoCardBadge>
                  </BentoCardTitleGroup>
                  {partnerFilterId && (
                    <InlineChipResetBtn
                      type="button"
                      onClick={() => setPartnerFilterId(null)}
                    >
                      상대국 필터 해제 <FiX size={10} />
                    </InlineChipResetBtn>
                  )}
                </BentoCardHeader>
                <BentoCardBody>
                  <PartnerBarsWrap>
                    {topPartners.items.map((partner, idx) => {
                      const pct = Math.max(
                        10,
                        Math.round(
                          (partner.count / topPartners.maxCount) * 100,
                        ),
                      )
                      const isSelected = partnerFilterId === partner.id
                      return (
                        <PartnerBarRow key={partner.id}>
                          <PartnerFilterBtn
                            type="button"
                            $active={isSelected}
                            onClick={() =>
                              setPartnerFilterId((prev) =>
                                prev === partner.id ? null : partner.id,
                              )
                            }
                          >
                            <PartnerTopLine>
                              <PartnerName $active={isSelected}>
                                <small>{idx + 1}.</small> {partner.name}
                              </PartnerName>
                              <PartnerCount>{partner.count}건</PartnerCount>
                            </PartnerTopLine>
                            <PartnerTrack>
                              <PartnerFill
                                $pct={pct}
                                $active={isSelected || idx === 0}
                              />
                            </PartnerTrack>
                          </PartnerFilterBtn>
                          <PartnerGoBtn
                            type="button"
                            onClick={() =>
                              navigate(pathKeys.countryDetail(partner.id))
                            }
                            title={`${partner.name} 대시보드로 이동`}
                          >
                            <FiArrowUpRight size={12} />
                          </PartnerGoBtn>
                        </PartnerBarRow>
                      )
                    })}
                  </PartnerBarsWrap>
                </BentoCardBody>
              </BentoCard>
            </BentoGrid2Col>
          </DiagramBentoWrap>
        )}

        {isLoading ? (
          <LedgerTableSkeleton
            rows={4}
            columns={3}
            showToolbar={false}
            label="관계 기록을 불러오는 중"
          />
        ) : relations.length === 0 ? (
          <CountryTabEmptyState
            Icon={FiFlag}
            title="아직 등록된 외교·전쟁 관계가 없습니다"
            description="주변 국가와 맺은 동맹·조공·책봉·동군연합 같은 외교 질서나, 경쟁 세력과 벌인 전쟁·대립을 기록합니다."
            actionLabel="조공·동맹 관계 추가"
            onAction={() => openAddWithRelationType('TRIBUTARY')}
            secondaryAction={{ label: '전쟁 관계 추가', onClick: () => openAddWithRelationType('WAR') }}
          />
        ) : (
          <>
            <FilterToolbar>
              <FilterChipGroup role="tablist" aria-label="국가 관계 유형 필터">
                <FilterChip
                  type="button"
                  role="tab"
                  aria-selected={typeFilter === 'all'}
                  $active={typeFilter === 'all'}
                  onClick={() => setTypeFilter('all')}
                >
                  전체 <FilterChipCount>{relations.length}</FilterChipCount>
                </FilterChip>
                <FilterChip
                  type="button"
                  role="tab"
                  aria-selected={typeFilter === 'cooperative'}
                  $active={typeFilter === 'cooperative'}
                  onClick={() => setTypeFilter('cooperative')}
                >
                  동맹·연합 <FilterChipCount>{cooperativeList.length}</FilterChipCount>
                </FilterChip>
                <FilterChip
                  type="button"
                  role="tab"
                  aria-selected={typeFilter === 'hierarchical'}
                  $active={typeFilter === 'hierarchical'}
                  onClick={() => setTypeFilter('hierarchical')}
                >
                  조공·종속 <FilterChipCount>{hierarchicalList.length}</FilterChipCount>
                </FilterChip>
                <FilterChip
                  type="button"
                  role="tab"
                  aria-selected={typeFilter === 'conflict'}
                  $active={typeFilter === 'conflict'}
                  onClick={() => setTypeFilter('conflict')}
                >
                  전쟁 <FilterChipCount>{conflictList.length}</FilterChipCount>
                </FilterChip>
              </FilterChipGroup>
              <QuickAddGroup>
                <QuickAddBtn
                  type="button"
                  onClick={() => openAddWithRelationType('ALLIANCE')}
                >
                  + 동맹 추가
                </QuickAddBtn>
                <QuickAddBtn
                  type="button"
                  onClick={() => openAddWithRelationType('WAR')}
                >
                  + 전쟁 추가
                </QuickAddBtn>
              </QuickAddGroup>
            </FilterToolbar>

            {filteredRelations.length === 0 ? (
              <Empty>선택한 유형에 해당하는 국가 관계 기록이 없습니다.</Empty>
            ) : (
              <List>
                {filteredRelations.map((relation) => {
                  const periodLabel = formatIsoDateRange(
                    relation.startDate,
                    relation.endDate,
                  )
                  const isSubject =
                    relation.subjectCountryId === historicalCountryId
                  return (
                    <Row key={relation.id}>
                      <RowMain>
                        <DirectionBadge $inbound={!isSubject}>
                          {isSubject ? '주체' : '대상'}
                        </DirectionBadge>
                        <CountryName
                          countryId={relation.subjectCountryId}
                          name={relation.subjectCountryName}
                          currentCountryId={country.id}
                          fallback="(주체)"
                        />
                        <Tag>
                          {RELATION_TYPE_LABELS[relation.relationType] ??
                            relation.relationType}
                        </Tag>
                        <CountryName
                          countryId={relation.objectCountryId}
                          name={relation.objectCountryName}
                          currentCountryId={country.id}
                          fallback="(대상)"
                        />
                        {periodLabel && <Muted>{periodLabel}</Muted>}
                      </RowMain>
                      <RowActions>
                        <TextButton
                          type="button"
                          onClick={() => {
                            setEditing(relation)
                            setEditForm({
                              relationType: relation.relationType,
                              startDate: toDateInputValue(relation.startDate),
                              endDate: toDateInputValue(relation.endDate),
                            })
                          }}
                        >
                          수정
                        </TextButton>
                        <DangerTextButton
                          type="button"
                          disabled={deleteMutation.isPending}
                          onClick={async () => {
                            if (await confirmRemove('국가 관계'))
                              deleteMutation.mutate(relation.id)
                          }}
                        >
                          삭제
                        </DangerTextButton>
                      </RowActions>
                    </Row>
                  )
                })}
              </List>
            )}
          </>
        )}
      </Section>

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="국가 관계 수정" size="narrow">
        <ModalBody>
          {editing && (
            <FormNote>
              <strong>{editing.subjectCountryName ?? '(주체)'}</strong> —{' '}
              <strong>{editing.objectCountryName ?? '(대상)'}</strong>
            </FormNote>
          )}
          <Field>
            <Label htmlFor="relation-edit-type">관계 유형</Label>
            <Select
              id="relation-edit-type"
              value={editForm.relationType}
              onChange={(changeEvent) =>
                setEditForm((prev) => ({
                  ...prev,
                  relationType: changeEvent.target.value as HistoricalRelationType,
                }))
              }
            >
              {(Object.keys(RELATION_TYPE_LABELS) as HistoricalRelationType[]).map((key) => (
                <option key={key} value={key}>
                  {RELATION_TYPE_LABELS[key]}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <Label htmlFor="relation-edit-start">시작일 (선택)</Label>
            <DateInput
              id="relation-edit-start"
              type="date"
              value={editForm.startDate}
              onChange={(changeEvent) =>
                setEditForm((prev) => ({ ...prev, startDate: changeEvent.target.value }))
              }
            />
          </Field>
          <Field>
            <Label htmlFor="relation-edit-end">종료일 (선택)</Label>
            <DateInput
              id="relation-edit-end"
              type="date"
              value={editForm.endDate}
              onChange={(changeEvent) =>
                setEditForm((prev) => ({ ...prev, endDate: changeEvent.target.value }))
              }
            />
          </Field>
        </ModalBody>
        <ModalFooter>
          <SecondaryButton type="button" onClick={() => setEditing(null)}>
            취소
          </SecondaryButton>
          <PrimaryButton
            type="button"
            disabled={updateMutation.isPending}
            onClick={() =>
              editing &&
              updateMutation.mutate({
                relationId: editing.id,
                data: {
                  relationType: editForm.relationType,
                  startDate: editForm.startDate ? new Date(editForm.startDate).toISOString() : null,
                  endDate: editForm.endDate ? new Date(editForm.endDate).toISOString() : null,
                },
              })
            }
          >
            {updateMutation.isPending ? '저장 중…' : '저장'}
          </PrimaryButton>
        </ModalFooter>
      </Modal>

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="국가 관계 추가" size="narrow">
        <ModalBody>
          <Field>
            <Label htmlFor="relation-position">이 나라의 위치</Label>
            <Select
              id="relation-position"
              value={form.asSubject ? 'subject' : 'object'}
              onChange={(changeEvent) =>
                setForm((prev) => ({ ...prev, asSubject: changeEvent.target.value === 'subject' }))
              }
            >
              <option value="subject">주체 — 이 나라 → 상대 국가</option>
              <option value="object">대상 — 상대 국가 → 이 나라</option>
            </Select>
          </Field>
          <Field>
            <Label htmlFor="relation-other">상대 국가</Label>
            <CountrySelect
              id="relation-other"
              value={form.otherCountryId}
              onChange={(otherCountryId) => setForm((prev) => ({ ...prev, otherCountryId }))}
              excludeId={historicalCountryId}
            />
          </Field>
          <Field>
            <Label htmlFor="relation-type">관계 유형</Label>
            <Select
              id="relation-type"
              value={form.relationType}
              onChange={(changeEvent) =>
                setForm((prev) => ({ ...prev, relationType: changeEvent.target.value as HistoricalRelationType }))
              }
            >
              {(Object.keys(RELATION_TYPE_LABELS) as HistoricalRelationType[]).map((key) => (
                <option key={key} value={key}>
                  {RELATION_TYPE_LABELS[key]}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <Label htmlFor="relation-start">시작일 (선택)</Label>
            <DateInput
              id="relation-start"
              type="date"
              value={form.startDate}
              onChange={(changeEvent) =>
                setForm((prev) => ({ ...prev, startDate: changeEvent.target.value }))
              }
            />
          </Field>
          <Field>
            <Label htmlFor="relation-end">종료일 (선택)</Label>
            <DateInput
              id="relation-end"
              type="date"
              value={form.endDate}
              onChange={(changeEvent) =>
                setForm((prev) => ({ ...prev, endDate: changeEvent.target.value }))
              }
            />
          </Field>
        </ModalBody>
        <ModalFooter>
          <SecondaryButton type="button" onClick={() => setAddOpen(false)}>
            취소
          </SecondaryButton>
          <PrimaryButton
            type="button"
            disabled={!form.otherCountryId || createMutation.isPending}
            onClick={() =>
              createMutation.mutate({
                subjectCountryId: form.asSubject ? historicalCountryId : form.otherCountryId,
                objectCountryId: form.asSubject ? form.otherCountryId : historicalCountryId,
                relationType: form.relationType,
                startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
                endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
              })
            }
          >
            {createMutation.isPending ? '등록 중…' : '등록'}
          </PrimaryButton>
        </ModalFooter>
      </Modal>
    </DashboardStyles.DashboardRoot>
  )
}

// ─── Styled ─────────────────────────────────────────────────────────────────

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
`

const Head = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding-bottom: 14px;
`

const HeadText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

const Title = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Description = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const FilterToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  padding: 8px 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`

const FilterChipGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
`

const FilterChip = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border: none;
  border-radius: 4px;
  font-family: inherit;
  font-size: 12px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.active : theme.colors.text.secondary};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.activeLight : 'transparent'};
  cursor: pointer;
  transition:
    color 0.12s ease,
    background-color 0.12s ease;

  &:hover {
    color: ${({ theme, $active }) =>
      $active ? theme.colors.active : theme.colors.text.primary};
    background: ${({ theme, $active }) =>
      $active
        ? theme.colors.activeLight
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.05)'
          : 'rgba(15, 23, 42, 0.04)'};
  }
`

const FilterChipCount = styled.span`
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  opacity: 0.85;
`

const QuickAddGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`

const QuickAddBtn = styled.button`
  padding: 3px 8px;
  border: none;
  border-radius: 4px;
  background: transparent;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.active};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.activeLight};
  }
`

const DirectionBadge = styled.span<{ $inbound: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme, $inbound }) =>
    $inbound ? theme.colors.active : theme.colors.text.secondary};
  background: ${({ theme, $inbound }) =>
    $inbound
      ? theme.colors.activeLight
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.06)'
        : 'rgba(15, 23, 42, 0.05)'};
`

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  border-top: 1px solid ${({ theme }) => theme.colors.border.medium};

  @media (min-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const RowActions = styled.div`
  display: flex;
  gap: 2px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.12s ease;

  @media (hover: none) {
    opacity: 0.7;
  }
`

const Row = styled.li`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 10px;
  min-width: 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  transition: background 0.12s ease;

  @media (min-width: 760px) {
    &:nth-child(even) {
      border-left: 1px solid ${({ theme }) => theme.colors.border.light};
    }

    &:last-child:nth-child(odd) {
      grid-column: 1 / -1;
    }
  }

  &:hover {
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc')};
  }
  &:hover ${RowActions}, &:focus-within ${RowActions} {
    opacity: 1;
  }
`

const RowMain = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px 10px;
  flex: 1;
  min-width: 0;
  font-size: 14px;
`

const Self = styled.span`
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const CountryLink = styled(Link)`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => theme.colors.active};
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

const Arrow = styled.span`
  display: inline-flex;
  align-self: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Tag = styled.span`
  padding: 1px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9')};
`

const AccentTag = styled(Tag)`
  color: ${({ theme }) => theme.colors.active};
  background: ${({ theme }) => theme.colors.activeLight};
`

const Muted = styled.span`
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Empty = styled.p`
  margin: 0;
  padding: 20px 0;
  font-size: 13.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`

const TextButton = styled.button`
  padding: 4px 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#eef2f7')};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.colors.focusRing.primary};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const DangerTextButton = styled(TextButton)`
  &:hover {
    color: ${({ theme }) => theme.colors.alert.danger.fg};
  }
`

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
`

const Label = styled.label`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Select = styled.select`
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#fff')};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: ${({ theme }) => theme.colors.focusRing.primary};
  }
`

const DateInput = styled.input`
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#fff')};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: ${({ theme }) => theme.colors.focusRing.primary};
  }
`

const CheckField = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  input {
    accent-color: ${({ theme }) => theme.colors.primary};
  }
`

const FormNote = styled.p`
  margin: 0 0 14px;
  font-size: 13.5px;
  color: ${({ theme }) => theme.colors.text.secondary};

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const FormHint = styled.p`
  margin: 0;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SecondaryButton = styled.button`
  padding: 8px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
`

const PrimaryButton = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.primary};
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const DiagramBentoWrap = styled.div`
  padding-bottom: 14px;
`

const InlineChipResetBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px;
  border-radius: ${RADIUS.XS};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  font-family: inherit;
  font-size: 10.5px;
  font-weight: 700;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  }
`

const TriStageFlowGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(120px, 0.9fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;

  @media (max-width: 720px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const TriStageCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
`

const TriStageHeader = styled.span`
  font-size: 10.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
`

const DiagramNodeBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 5px 8px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: transparent;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  min-width: 0;

  strong {
    font-size: 12px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  small {
    flex-shrink: 0;
    font-size: 10px;
    font-weight: 600;
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }

  &:hover {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const DiagramEmptySlotBtn = styled.button`
  padding: 6px 8px;
  border-radius: ${RADIUS.SM};
  border: 1px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const DiagramMoreNote = styled.span`
  font-size: 10.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
`

const TriArrowCol = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};

  @media (max-width: 720px) {
    display: none;
  }
`

const TriStageCenterCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 10px 8px;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => ledgerAccent(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  text-align: center;
  min-width: 0;
`

const CenterTag = styled.span`
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const CenterName = styled.strong`
  font-size: 13.5px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const CenterPeriod = styled.span`
  font-size: 10.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  ${DIGIT_DISPLAY}
`

const SliceFilterRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
`

const SliceFilterPill = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 6px;
  border-radius: ${RADIUS.XS};
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : 'transparent'};
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  font-family: inherit;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  text-align: left;

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.tertiary};
    ${DIGIT_DISPLAY}
  }

  &:hover {
    background: ${({ theme, $active }) =>
      $active ? ledgerAccentSubtle(theme.mode) : ledgerHoverFill(theme.mode)};
  }
`

const MiniColorDot = styled.span<{ $color: string }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

const DonutRoleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
`

const DonutRoleLegend = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
`

const PartnerBarsWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`

const PartnerBarRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
`

const PartnerFilterBtn = styled.button<{ $active?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
  min-width: 0;
  padding: 3px 6px;
  border-radius: ${RADIUS.XS};
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : 'transparent'};
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  font-family: inherit;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: ${({ theme, $active }) =>
      $active ? ledgerAccentSubtle(theme.mode) : ledgerHoverFill(theme.mode)};
  }
`

const PartnerTopLine = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
`

const PartnerName = styled.span<{ $active?: boolean }>`
  font-size: 12px;
  font-weight: ${({ $active }) => ($active ? 700 : 600)};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  small {
    color: ${({ theme }) => theme.colors.text.tertiary};
    ${DIGIT_DISPLAY}
  }
`

const PartnerCount = styled.span`
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
`

const PartnerTrack = styled.div`
  width: 100%;
  height: 5px;
  border-radius: 999px;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  overflow: hidden;
`

const PartnerFill = styled.div<{ $pct: number; $active?: boolean }>`
  width: ${({ $pct }) => `${$pct}%`};
  height: 100%;
  border-radius: 999px;
  background: ${({ theme, $active }) =>
    $active
      ? ledgerAccent(theme.mode)
      : theme.mode === 'dark'
        ? 'rgba(165, 180, 252, 0.5)'
        : 'rgba(79, 70, 229, 0.5)'};
`

const PartnerGoBtn = styled.button`
  width: 24px;
  height: 24px;
  border-radius: ${RADIUS.XS};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    border-color: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  }
`
