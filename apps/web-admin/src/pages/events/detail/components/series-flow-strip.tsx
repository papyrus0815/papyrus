/**
 * 정기 시리즈 흐름 띠 — 아세안 정상회의·APEC·쿼드·WTO 각료회의·올림픽·당대회처럼
 * 주기적으로 열리는 회의·행사의 한 회차 상세에서:
 *  1) 이 사건이 시리즈의 몇 회차·몇 번째인지
 *  2) ← 직전 회차 / 다음 회차 → 탐색
 *  3) 아직 다음 회차 사건이 등록되지 않았을 때 "주기 규칙·확정 일정 기반 다음 개최 시점 안내"
 *     및 원클릭 [+ 차기 회차 등록] 진입점을 한 줄 카드로 보여 준다.
 */
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { FiCalendar, FiEdit2, FiPlus, FiRefreshCw, FiX } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import {
  buildSeriesModalLaunchPayload,
  type EventSeriesItem,
  FORECAST_KIND_BADGE,
  listEventSeries,
  type SeriesModalLaunchPayload,
} from '@/shared/api/event-series'
import type { UpdateEventDto } from '@/shared/api/events'
import { pathKeys } from '@/shared/router'
import { Z_INDEX } from '@/shared/styles/z-index'
import { EventRegisterModal } from '@/widgets/event-form/ui/event-register-modal'
import { EventSeriesFormModal } from '@/widgets/event-series/event-series-quick-create-modal'

import { type EventDetail, usePrefetchEventDetail } from '../use-event-detail'

interface SeriesFlowStripProps {
  event: EventDetail
  onPatch?: (patch: UpdateEventDto) => void
}

export function SeriesFlowStrip({ event, onPatch }: SeriesFlowStripProps) {
  const ctx = event.seriesContext
  const prefetchEvent = usePrefetchEventDetail()
  const [editLinkOpen, setEditLinkOpen] = useState(false)
  const [registerPrefill, setRegisterPrefill] =
    useState<SeriesModalLaunchPayload | null>(null)

  if (!ctx) return null

  const seriesHubHref = ctx.organizationId
    ? `/organizations?selected=${encodeURIComponent(ctx.organizationId)}&tab=series&series=${encodeURIComponent(ctx.id)}`
    : `/organizations?view=series&series=${encodeURIComponent(ctx.id)}`

  const forecast = ctx.forecast
  const badgeMeta = FORECAST_KIND_BADGE[forecast.kind]
  const showForecastBar =
    !ctx.nextEdition &&
    forecast.kind !== 'ENDED' &&
    Boolean(forecast.headline)

  const timelinePoints = ctx.editionsTimeline ?? []
  const intermediateGaps = (ctx.missingRanges ?? []).filter(
    (gap) => !gap.isLeadingGap,
  )

  const openModalForSeries = (overrideEdition?: number) => {
    setRegisterPrefill(
      buildSeriesModalLaunchPayload(
        {
          id: ctx.id,
          title: ctx.title,
          organizationId: ctx.organizationId,
          defaultDomain: ctx.defaultDomain ?? event.domain ?? 'DIPLOMACY',
          defaultEventType: ctx.defaultEventType ?? event.type ?? 'SUMMIT',
          forecast,
        },
        overrideEdition != null ? { overrideEdition } : undefined,
      ),
    )
  }

  return (
    <>
      <Strip aria-label={`${ctx.title} 정기 시리즈 흐름`}>
        <Head>
          <Where>
            <SeriesIconBadge aria-hidden>
              <FiRefreshCw size={11} />
            </SeriesIconBadge>
            <SeriesLink to={seriesHubHref} title="정기 시리즈 전체 회차·주기 관리 보기">
              {ctx.title}
            </SeriesLink>
            {ctx.currentEditionBadge && (
              <EditionChip>{ctx.currentEditionBadge}</EditionChip>
            )}
            <span className="meta">
              {' '}
              · 등록 {ctx.editionCount}건 중 <b>{ctx.position}번째</b> ·{' '}
              {ctx.cadenceLabel}
            </span>
            {onPatch && (
              <InlineEditBtn
                type="button"
                onClick={() => setEditLinkOpen(true)}
                title="회차 번호·표기 수정 또는 시리즈 연결 변경"
              >
                <FiEdit2 size={11} /> 회차 편집
              </InlineEditBtn>
            )}
          </Where>

          <Steps>
            {ctx.prevEdition && (
              <StepLink
                to={pathKeys.events.detail(ctx.prevEdition.id)}
                onMouseEnter={() => prefetchEvent(ctx.prevEdition!.id)}
                title={ctx.prevEdition.title}
                aria-label={`이전 회차: ${ctx.prevEdition.title}`}
              >
                ←{' '}
                <span>
                  {ctx.prevEdition.editionBadge ?? ctx.prevEdition.title}
                </span>
              </StepLink>
            )}
            {ctx.nextEdition && (
              <StepLink
                to={pathKeys.events.detail(ctx.nextEdition.id)}
                onMouseEnter={() => prefetchEvent(ctx.nextEdition!.id)}
                title={ctx.nextEdition.title}
                aria-label={`다음 회차: ${ctx.nextEdition.title}`}
              >
                <span>
                  {ctx.nextEdition.editionBadge ?? ctx.nextEdition.title}
                </span>{' '}
                →
              </StepLink>
            )}
          </Steps>
        </Head>

        {timelinePoints.length > 1 && (
          <TimelineTrack role="list" aria-label={`${ctx.title} 역대 회차 트랙`}>
            {timelinePoints.map((pt) => {
              const isCurrent = pt.id === event.id
              const label = pt.editionBadge ?? pt.startDate?.slice(0, 4) ?? '회차'
              const tooltip = [
                pt.editionBadge ? `[${pt.editionBadge}]` : null,
                pt.title,
                pt.hostCountryName
                  ? `${pt.hostCountryFlagEmoji ?? ''}${pt.hostCountryName}`.trim()
                  : null,
                pt.startDate ? pt.startDate.slice(0, 10) : null,
              ]
                .filter(Boolean)
                .join(' · ')
              return (
                <TimelineDotLink
                  key={pt.id}
                  role="listitem"
                  to={pathKeys.events.detail(pt.id)}
                  $current={isCurrent}
                  $future={pt.isFuture}
                  aria-current={isCurrent ? 'page' : undefined}
                  title={tooltip}
                  onMouseEnter={() => {
                    if (!isCurrent) prefetchEvent(pt.id)
                  }}
                >
                  <TimelineDot $current={isCurrent} $future={pt.isFuture} />
                  <TimelineDotLabel $current={isCurrent}>
                    {pt.hostCountryFlagEmoji ? `${pt.hostCountryFlagEmoji} ` : ''}
                    {label}
                  </TimelineDotLabel>
                </TimelineDotLink>
              )
            })}
          </TimelineTrack>
        )}

        {intermediateGaps.length > 0 && (
          <MissingGapBar role="status">
            <span>
              중간 결번 감지:{' '}
              {intermediateGaps
                .map((g) =>
                  g.fromEdition === g.toEdition
                    ? `제${g.fromEdition}차`
                    : `제${g.fromEdition}~${g.toEdition}차(${g.count}건)`,
                )
                .join(', ')}{' '}
              미등록
            </span>
            <MissingGapBtn
              type="button"
              onClick={() => openModalForSeries(intermediateGaps[0].fromEdition)}
            >
              <FiPlus size={11} /> 제{intermediateGaps[0].fromEdition}차 등록
            </MissingGapBtn>
          </MissingGapBar>
        )}

        {showForecastBar && (
          <ForecastRow $tone={badgeMeta.tone}>
            <ForecastLeft>
              <ForecastTonePill $tone={badgeMeta.tone}>
                <FiCalendar size={11} />
                {badgeMeta.label}
              </ForecastTonePill>
              <ForecastText>{forecast.headline}</ForecastText>
              {forecast.note && (
                <ForecastNote>· {forecast.note}</ForecastNote>
              )}
            </ForecastLeft>
            <ForecastActions>
              {forecast.scheduledEventId &&
              forecast.scheduledEventId !== event.id ? (
                <NextActionLink
                  to={pathKeys.events.detail(forecast.scheduledEventId)}
                  onMouseEnter={() => prefetchEvent(forecast.scheduledEventId)}
                >
                  예정 사건 보기 →
                </NextActionLink>
              ) : (
                <NextActionButton
                  type="button"
                  onClick={() => openModalForSeries()}
                >
                  <FiPlus size={12} /> 차기 회차 등록
                </NextActionButton>
              )}
            </ForecastActions>
          </ForecastRow>
        )}
      </Strip>

      {registerPrefill && (
        <EventRegisterModal
          isOpen
          onClose={() => setRegisterPrefill(null)}
          initialDomain={registerPrefill.initialDomain}
          initialEventType={registerPrefill.initialEventType}
          initialCountries={registerPrefill.initialCountries}
          initialSeriesPrefill={registerPrefill.initialSeriesPrefill}
        />
      )}

      {editLinkOpen && onPatch && (
        <EventSeriesLinkModal
          event={event}
          onClose={() => setEditLinkOpen(false)}
          onSave={(patch) => {
            onPatch(patch)
            setEditLinkOpen(false)
          }}
        />
      )}
    </>
  )
}

interface EventSeriesLinkModalProps {
  event: Pick<
    EventDetail,
    | 'id'
    | 'title'
    | 'domain'
    | 'type'
    | 'seriesId'
    | 'seriesEdition'
    | 'seriesEditionLabel'
    | 'organizations'
  >
  onClose: () => void
  onSave: (patch: UpdateEventDto) => void
}

/**
 * 사건에 정기 시리즈(EventSeries)와 회차 번호·표기를 연결·수정·해제하는 모달
 */
export function EventSeriesLinkModal({
  event,
  onClose,
  onSave,
}: EventSeriesLinkModalProps) {
  const [selectedSeriesId, setSelectedSeriesId] = useState(
    event.seriesId ?? '',
  )
  const [editionInput, setEditionInput] = useState(
    event.seriesEdition != null ? String(event.seriesEdition) : '',
  )
  const [editionLabelInput, setEditionLabelInput] = useState(
    event.seriesEditionLabel ?? '',
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [createSeriesOpen, setCreateSeriesOpen] = useState(false)

  const seriesQuery = useQuery({
    queryKey: ['event-series', 'all-for-picker'],
    queryFn: () => listEventSeries(),
    staleTime: 30_000,
  })

  useEffect(() => {
    // 사건명에서 '제43차' 같은 회차 숫자를 초기 추론 (아직 비어 있을 때만)
    if (!event.seriesId && !editionInput) {
      const m = event.title.match(/제\s*(\d{1,3})\s*차/)
      if (m) setEditionInput(m[1])
    }
  }, [event.seriesId, event.title, editionInput])

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape' && !createSeriesOpen) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, createSeriesOpen])

  const filteredSeries = useMemo(() => {
    const all = seriesQuery.data ?? []
    const q = searchQuery.trim().toLowerCase()
    if (!q) return all
    return all.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.shortTitle?.toLowerCase().includes(q) ?? false) ||
        (item.organization?.name.toLowerCase().includes(q) ?? false) ||
        (item.organization?.shortName?.toLowerCase().includes(q) ?? false),
    )
  }, [seriesQuery.data, searchQuery])

  const selectedSeries: EventSeriesItem | undefined = useMemo(
    () => (seriesQuery.data ?? []).find((s) => s.id === selectedSeriesId),
    [seriesQuery.data, selectedSeriesId],
  )

  const handleApply = () => {
    if (!selectedSeriesId) {
      onSave({
        seriesId: null,
        seriesEdition: null,
        seriesEditionLabel: null,
      } as UpdateEventDto)
      return
    }
    const parsedEdition = editionInput.trim()
      ? Number.parseInt(editionInput.trim(), 10)
      : null
    onSave({
      seriesId: selectedSeriesId,
      seriesEdition:
        parsedEdition != null && Number.isFinite(parsedEdition) && parsedEdition > 0
          ? parsedEdition
          : null,
      seriesEditionLabel: editionLabelInput.trim() || null,
    } as UpdateEventDto)
  }

  const defaultOrgId = event.organizations?.[0]?.organizationId ?? null
  const inferredSeriesTitle = event.title
    .replace(/^제\s*\d+(?:\s*[·,~-]\s*\d+)?\s*차\s*/, '')
    .replace(/\s*\(\d{4}\)\s*$/, '')
    .trim()

  return createPortal(
    <ModalOverlay onClick={onClose}>
      <ModalCard onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>정기 회의·행사 시리즈 연결</ModalTitle>
          <ModalClose type="button" onClick={onClose} aria-label="닫기">
            <FiX size={18} />
          </ModalClose>
        </ModalHeader>

        <ModalBody>
          <FieldGroup>
            <FieldHeadRow>
              <FieldLabel>소속 정기 시리즈 선택</FieldLabel>
              <NewSeriesBtn
                type="button"
                onClick={() => setCreateSeriesOpen(true)}
              >
                <FiPlus size={12} /> 새 정기 시리즈 만들기
              </NewSeriesBtn>
            </FieldHeadRow>
            <SearchInput
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="시리즈명 또는 기구명 검색 (예: 아세안, APEC, 쿼드, WTO)…"
            />
            <SeriesListBox>
              <SeriesOptionBtn
                type="button"
                $active={!selectedSeriesId}
                onClick={() => setSelectedSeriesId('')}
              >
                <span>연결 안 함 (단발 사건)</span>
              </SeriesOptionBtn>
              {filteredSeries.map((item) => (
                <SeriesOptionBtn
                  key={item.id}
                  type="button"
                  $active={selectedSeriesId === item.id}
                  onClick={() => {
                    setSelectedSeriesId(item.id)
                    if (
                      !editionInput &&
                      item.forecast.expectedEdition != null &&
                      event.seriesId !== item.id
                    ) {
                      const titleMatch = event.title.match(/제\s*(\d{1,3})\s*차/)
                      if (!titleMatch) {
                        setEditionInput(String(item.forecast.expectedEdition))
                      }
                    }
                  }}
                >
                  <div>
                    <strong>{item.title}</strong>
                    {item.organization && (
                      <OptionSub> · {item.organization.name}</OptionSub>
                    )}
                  </div>
                  <OptionMeta>
                    {item.forecast.cadenceLabel} · {item.editionCount}건
                  </OptionMeta>
                </SeriesOptionBtn>
              ))}
            </SeriesListBox>
          </FieldGroup>

          {selectedSeriesId && (
            <>
              {selectedSeries && (
                <SelectedSeriesHint>
                  주기: <strong>{selectedSeries.forecast.cadenceLabel}</strong>
                  {selectedSeries.forecast.headline
                    ? ` · ${selectedSeries.forecast.headline}`
                    : ''}
                </SelectedSeriesHint>
              )}
              <EditionGrid>
                <FieldGroup>
                  <FieldLabel>
                    정규 회차 번호 <Muted>(숫자, 선택)</Muted>
                  </FieldLabel>
                  <SmallInput
                    type="number"
                    min={1}
                    max={9999}
                    value={editionInput}
                    onChange={(e) => setEditionInput(e.target.value)}
                    placeholder="예: 43 (특별회의면 비움)"
                  />
                </FieldGroup>
                <FieldGroup>
                  <FieldLabel>
                    회차 표기 오버라이드 <Muted>(선택)</Muted>
                  </FieldLabel>
                  <SmallInput
                    value={editionLabelInput}
                    onChange={(e) => setEditionLabelInput(e.target.value)}
                    placeholder="예: 제44·45차, 특별 정상회의"
                  />
                </FieldGroup>
              </EditionGrid>
            </>
          )}

          <ModalFooter>
            {event.seriesId && (
              <DetachBtn
                type="button"
                onClick={() =>
                  onSave({
                    seriesId: null,
                    seriesEdition: null,
                    seriesEditionLabel: null,
                  } as UpdateEventDto)
                }
              >
                연결 해제
              </DetachBtn>
            )}
            <SaveBtn type="button" onClick={handleApply}>
              적용
            </SaveBtn>
          </ModalFooter>
        </ModalBody>
      </ModalCard>

      {createSeriesOpen && (
        <EventSeriesFormModal
          defaultOrganizationId={defaultOrgId}
          defaultTitle={inferredSeriesTitle}
          defaultDomain={event.domain ?? 'DIPLOMACY'}
          defaultEventType={event.type ?? 'SUMMIT'}
          onClose={() => setCreateSeriesOpen(false)}
          onSaved={(created) => {
            setCreateSeriesOpen(false)
            setSelectedSeriesId(created.id)
          }}
        />
      )}
    </ModalOverlay>,
    document.body,
  )
}

/* ── styles ── */

const Strip = styled.nav`
  margin: 12px 0 4px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.24)'
        : 'rgba(79, 70, 229, 0.16)'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99, 102, 241, 0.07)'
      : 'rgba(79, 70, 229, 0.035)'};
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const Head = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px 14px;
  font-size: 13px;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.text.secondary};

  b {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  .meta {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const Where = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-width: 0;
`

const SeriesIconBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 6px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(129,140,248,0.18)' : 'rgba(79,70,229,0.12)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#4338ca')};
`

const SeriesLink = styled(Link)`
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
`

const EditionChip = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(129,140,248,0.22)' : 'rgba(79,70,229,0.12)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#c7d2fe' : '#3730a3')};
`

const InlineEditBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const Steps = styled.div`
  display: flex;
  gap: 12px;
  min-width: 0;
`

const StepLink = styled(Link)`
  display: inline-flex;
  gap: 4px;
  max-width: 22ch;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  text-decoration: none;
  white-space: nowrap;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`

function toneColors(
  tone: 'blue' | 'emerald' | 'indigo' | 'amber' | 'rose' | 'slate',
  dark: boolean,
) {
  switch (tone) {
    case 'emerald':
      return {
        bg: dark ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.08)',
        pillBg: dark ? 'rgba(16,185,129,0.24)' : 'rgba(16,185,129,0.16)',
        text: dark ? '#6ee7b7' : '#047857',
      }
    case 'amber':
      return {
        bg: dark ? 'rgba(245,158,11,0.13)' : 'rgba(245,158,11,0.09)',
        pillBg: dark ? 'rgba(245,158,11,0.24)' : 'rgba(245,158,11,0.18)',
        text: dark ? '#fcd34d' : '#b45309',
      }
    case 'rose':
      return {
        bg: dark ? 'rgba(244,63,94,0.12)' : 'rgba(244,63,94,0.07)',
        pillBg: dark ? 'rgba(244,63,94,0.24)' : 'rgba(244,63,94,0.15)',
        text: dark ? '#fda4af' : '#be123c',
      }
    case 'slate':
      return {
        bg: dark ? 'rgba(148,163,184,0.10)' : 'rgba(100,116,139,0.07)',
        pillBg: dark ? 'rgba(148,163,184,0.20)' : 'rgba(100,116,139,0.15)',
        text: dark ? '#cbd5e1' : '#475569',
      }
    default:
      return {
        bg: dark ? 'rgba(99,102,241,0.12)' : 'rgba(79,70,229,0.07)',
        pillBg: dark ? 'rgba(99,102,241,0.24)' : 'rgba(79,70,229,0.15)',
        text: dark ? '#a5b4fc' : '#4338ca',
      }
  }
}

const ForecastRow = styled.div<{
  $tone: 'blue' | 'emerald' | 'indigo' | 'amber' | 'rose' | 'slate'
}>`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
  padding: 7px 10px;
  border-radius: 8px;
  background: ${({ theme, $tone }) =>
    toneColors($tone, theme.mode === 'dark').bg};
`

const ForecastLeft = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
  min-width: 0;
  font-size: 12.5px;
`

const ForecastTonePill = styled.span<{
  $tone: 'blue' | 'emerald' | 'indigo' | 'amber' | 'rose' | 'slate'
}>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  background: ${({ theme, $tone }) =>
    toneColors($tone, theme.mode === 'dark').pillBg};
  color: ${({ theme, $tone }) =>
    toneColors($tone, theme.mode === 'dark').text};
`

const ForecastText = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ForecastNote = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12px;
`

const ForecastActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const NextActionLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  background: ${({ theme }) => theme.colors.primary};
  color: #ffffff;
  white-space: nowrap;
  &:hover {
    opacity: 0.92;
  }
`

const NextActionButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 7px;
  border: none;
  font-size: 12px;
  font-weight: 700;
  background: ${({ theme }) => theme.colors.primary};
  color: #ffffff;
  white-space: nowrap;
  cursor: pointer;
  &:hover {
    opacity: 0.92;
  }
`

const TimelineTrack = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  padding: 4px 2px 2px;
  scrollbar-width: thin;
`

const TimelineDotLink = styled(Link)<{ $current: boolean; $future: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 999px;
  text-decoration: none;
  white-space: nowrap;
  border: 1px solid
    ${({ $current, $future, theme }) =>
      $current
        ? theme.colors.primary
        : $future
          ? 'rgba(16,185,129,0.4)'
          : theme.colors.border.light};
  background: ${({ $current, $future, theme }) =>
    $current
      ? `${theme.colors.primary}18`
      : $future
        ? 'rgba(16,185,129,0.08)'
        : theme.colors.background.primary};
  transition: border-color 0.14s ease, background-color 0.14s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const TimelineDot = styled.span<{ $current: boolean; $future: boolean }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $current, $future, theme }) =>
    $current
      ? theme.colors.primary
      : $future
        ? '#10b981'
        : theme.colors.text.tertiary};
  box-shadow: ${({ $current, theme }) =>
    $current ? `0 0 0 3px ${theme.colors.primary}28` : 'none'};
`

const TimelineDotLabel = styled.span<{ $current: boolean }>`
  font-size: 11px;
  font-weight: ${({ $current }) => ($current ? 700 : 600)};
  color: ${({ $current, theme }) =>
    $current ? theme.colors.primary : theme.colors.text.secondary};
`

const MissingGapBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 5px 10px;
  border-radius: 7px;
  border: 1px dashed rgba(245, 158, 11, 0.42);
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(245, 158, 11, 0.08)'
      : 'rgba(245, 158, 11, 0.06)'};
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fcd34d' : '#b45309')};
`

const MissingGapBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border-radius: 6px;
  border: 1px solid rgba(245, 158, 11, 0.45);
  background: transparent;
  color: inherit;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  &:hover {
    background: rgba(245, 158, 11, 0.14);
  }
`

/* ── Link Modal Styles ── */

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  background: rgba(9, 9, 11, 0.56);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`

const ModalCard = styled.div`
  width: min(500px, 100%);
  max-height: 88vh;
  overflow-y: auto;
  border-radius: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.primary};
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.34);
`

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 15.5px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ModalClose = styled.button`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  padding: 4px;
  display: inline-flex;
`

const ModalBody = styled.div`
  padding: 16px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const FieldHeadRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const FieldLabel = styled.label`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Muted = styled.span`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const NewSeriesBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => `${theme.colors.primary}15`};
  color: ${({ theme }) => theme.colors.primary};
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
`

const SearchInput = styled.input`
  height: 35px;
  padding: 0 10px;
  border-radius: 9px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 13px;
`

const SeriesListBox = styled.div`
  max-height: 210px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};
`

const SeriesOptionBtn = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.colors.primary : 'transparent'};
  background: ${({ theme, $active }) =>
    $active ? `${theme.colors.primary}18` : 'transparent'};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  &:hover {
    background: ${({ theme, $active }) =>
      $active ? `${theme.colors.primary}22` : theme.colors.background.primary};
  }
`

const OptionSub = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const OptionMeta = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
`

const SelectedSeriesHint = styled.div`
  padding: 8px 10px;
  border-radius: 9px;
  background: ${({ theme }) => theme.colors.background.secondary};
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const EditionGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
`

const SmallInput = styled.input`
  height: 35px;
  padding: 0 10px;
  border-radius: 9px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 13px;
`

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 6px;
`

const DetachBtn = styled.button`
  height: 36px;
  padding: 0 12px;
  border-radius: 9px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.error};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
`

const SaveBtn = styled.button`
  height: 36px;
  padding: 0 16px;
  border-radius: 9px;
  border: none;
  background: ${({ theme }) => theme.colors.primary};
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
`
