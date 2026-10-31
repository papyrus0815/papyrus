/**
 * 역사 국가 개요 — '건국'·'멸망' 카드.
 *
 * 한 카드 = 존속 기간의 한쪽 끝이 **어떻게** 열리고 닫혔나.
 *
 * 카드는 읽는 자리다 — 안의 인물·나라·사건은 누르면 먼저 미리보기 모달(상세 이동은 그 모달에서),
 * 쓰는 일(배경 글·역할 메모)도 모달에서 한다.
 *   배경  — 사용자가 쓰는 글(HistoricalCountry.foundingNote / dissolutionNote, 리치 텍스트)
 *   사건  — 참여국 역할 '건국'·'멸망'으로 이 나라를 건 사건(여기서 연결·해제)
 *   초대  — 재위·재임 기록에서 파생(제1대, 없으면 가장 이른 기록) — 건국 카드만
 *   전신·후신 — 계승 관계에서 파생
 *   세운 쪽·멸망시킨 쪽 — 사용자가 지정(인물·나라·자유 입력, HistoricalCountryStatehoodAgent)
 *
 * 새로 저장하는 것은 배경 글 두 칸뿐이다. 초대·전신을 따로 적는 칸을 두면 재위 표·계승 표와
 * 두 곳에서 어긋나기 때문이다(검토 2026-09-27 — 사용자 승인 '초대는 자동').
 */
import { useMemo, useState } from 'react'

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiCalendar, FiEdit2, FiFlag, FiPlus, FiX } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import {
  type StatehoodEvent,
  getCountryStatehoodEvents,
  getEventLinkCandidates,
  setEventStatehoodRole,
} from '@/shared/api/events'
import {
  type FirstRuler,
  type FoundingLinkedCountry,
  type StatehoodAgent,
  getHistoricalCountryFoundingSummary,
  updateHistoricalCountry,
} from '@/shared/api/historical-countries'
import { eventKeys } from '@/shared/api/event-query-keys'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { formatCountryYearShort } from '@/shared/lib/country-period'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { isLikelyRichTextHtml } from '@/shared/lib/rich-text-read-view'
import { pathKeys } from '@/shared/router'
import { RichTextReadView } from '@/shared/ui/rich-text-read-view/rich-text-read-view'
import { notify } from '@/shared/ui/toast'

import { BackgroundEditModal } from './founding-edit-modals'
import { ChartSkeleton } from './dashboard-panels/chart-skeleton'
import { FillChip } from './founding-fill-chip.styles'
import { FoundingThumb, useResolvedImage } from './founding-media'
import { FoundingPreviewProvider, previewOnClick, useFoundingPreview } from './founding-preview'
import { FoundingRow, RowAction, RowAddButton, RowList } from './founding-row'
import { HistoricalStatehoodAgents } from './historical-statehood-agents'
import { type PickerCandidate, StatehoodPickerModal } from './statehood-picker-modal'

type Side = 'founding' | 'dissolution'

interface HistoricalFoundingCardsProps {
  historicalCountryId: string
  /** STATE면 건국·멸망, 그 외(정권·시대)면 성립·종료 */
  entityKind?: string | null
  /** 존속 시작·끝(부호 연도) — 카드 머리글 */
  startYear: number | null
  endYear: number | null
  /** '역대 수반' 탭으로 — 초대 기록이 없을 때의 등록 경로 */
  onGoToHeads?: () => void
}

export const foundingSummaryKey = (id: string) =>
  ['historical-countries', id, 'founding-summary'] as const

const RULER_FALLBACK_TITLE: Record<FirstRuler['kind'], string> = {
  monarch: '군주',
  headOfState: '국가원수',
  headOfGovernment: '정부수반',
}

const TRANSITION_LABEL: Record<string, string> = {
  FOUNDED: '건국',
  CONQUEST: '정복',
  TREATY: '조약',
  INDEPENDENCE: '독립',
  UNIFICATION: '통일',
  UNION: '합병',
  DISSOLVED: '멸망',
  SUCCESSION: '계승',
  SPLIT: '분열',
  OTHER: '기타',
}

const signedYear = (era: string | null | undefined, year: number | null | undefined) =>
  year == null ? null : era === 'BC' ? -year : year

function rulerSpan(ruler: FirstRuler): string {
  const start = formatCountryYearShort(signedYear(ruler.startEra, ruler.startYear))
  const end = formatCountryYearShort(signedYear(ruler.endEra, ruler.endYear))
  if (!start) return ''
  if (end === start) return start
  return `${start}–${end ?? ''}`
}

/** 가장 이른 기록이 건국에서 이만큼(년) 넘게 떨어지면 초대로 보지 않는다 */
const FIRST_RULER_MAX_GAP = 10

function gapFromFounding(ruler: FirstRuler, foundingYear: number | null): number | null {
  const start = signedYear(ruler.startEra, ruler.startYear)
  if (start == null || foundingYear == null) return null
  return start - foundingYear
}

/** 제1대 기록이 아니고, 건국보다 한참 뒤에 시작한 기록인가 */
function isFarFromFounding(ruler: FirstRuler, foundingYear: number | null): boolean {
  if (ruler.basis === 'numbered') return false
  const gap = gapFromFounding(ruler, foundingYear)
  return gap != null && gap > FIRST_RULER_MAX_GAP
}

function statehoodEventYear(event: StatehoodEvent): number | null {
  if (event.startYear != null) return event.startEra === 'BC' ? -event.startYear : event.startYear
  if (!event.startDate) return null
  const year = Number.parseInt(event.startDate.slice(0, 4), 10)
  return Number.isNaN(year) ? null : year
}

export function HistoricalFoundingCards(props: HistoricalFoundingCardsProps) {
  return (
    <FoundingPreviewProvider>
      <FoundingCardsInner {...props} />
    </FoundingPreviewProvider>
  )
}

function FoundingCardsInner({
  historicalCountryId,
  entityKind,
  startYear,
  endYear,
  onGoToHeads,
}: HistoricalFoundingCardsProps) {
  const isState = !entityKind || entityKind === 'STATE'
  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: foundingSummaryKey(historicalCountryId),
    queryFn: () => getHistoricalCountryFoundingSummary(historicalCountryId),
    staleTime: 60_000,
  })
  const { data: statehood } = useQuery({
    queryKey: eventKeys.statehood({ historicalCountryId }),
    queryFn: () => getCountryStatehoodEvents({ historicalCountryId }),
    staleTime: 60_000,
  })

  if (isSummaryLoading) {
    return <ChartSkeleton variant="bars" rows={3} />
  }
  if (!summary) return null

  return (
    <Cards>
      <FoundingCard
        side="founding"
        title={isState ? '건국' : '성립'}
        year={startYear}
        historicalCountryId={historicalCountryId}
        note={summary.foundingNote}
        events={statehood?.founded ?? []}
        rulers={summary.firstRulers}
        agents={summary.founders ?? []}
        agentLabel={isState ? '건국자' : '세운 쪽'}
        linked={summary.predecessors}
        linkedLabel="전신"
        onGoToHeads={onGoToHeads}
      />
      {/* 현존·미상인 나라에는 멸망 카드를 세우지 않는다 — 배경을 미리 쓸 자리가 아니다 */}
      {(endYear != null || summary.dissolutionNote || (statehood?.dissolved.length ?? 0) > 0) && (
        <FoundingCard
          side="dissolution"
          title={isState ? '멸망' : '종료'}
          year={endYear}
          historicalCountryId={historicalCountryId}
          note={summary.dissolutionNote}
          events={statehood?.dissolved ?? []}
          rulers={summary.lastRulers ?? []}
          agents={summary.dissolvers ?? []}
          agentLabel={isState ? '멸망시킨 쪽' : '끝낸 쪽'}
          linked={summary.successors}
          linkedLabel="후신"
        />
      )}
    </Cards>
  )
}

interface FoundingCardProps {
  side: Side
  title: string
  year: number | null
  historicalCountryId: string
  note: string | null
  events: StatehoodEvent[]
  /** 건국 카드는 초대, 멸망 카드는 마지막 통치자 — 종류별 한 명 */
  rulers: FirstRuler[]
  /** 세운 쪽·멸망시킨 쪽 — 사용자가 지정한 주체 */
  agents: StatehoodAgent[]
  agentLabel: string
  linked: FoundingLinkedCountry[]
  linkedLabel: string
  onGoToHeads?: () => void
}

function FoundingCard({
  side,
  title,
  year,
  historicalCountryId,
  note,
  events,
  rulers,
  agents,
  agentLabel,
  linked,
  linkedLabel,
  onGoToHeads,
}: FoundingCardProps) {
  const queryClient = useQueryClient()
  const preview = useFoundingPreview()
  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [noteExpanded, setNoteExpanded] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [addedThisSession, setAddedThisSession] = useState(0)
  /* '비어 있음' 칩에서 연 주체 모달 — 열린 동안엔 칩을 내리지 않는다(내리면 모달도 닫힌다) */
  const [agentChipPickerOpen, setAgentChipPickerOpen] = useState(false)
  const showAgentChip = agents.length === 0 || agentChipPickerOpen
  const debouncedTerm = useDebouncedValue(searchTerm, 250, String(pickerOpen))
  const role = side === 'founding' ? 'FOUNDED' : 'DISSOLVED'

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: foundingSummaryKey(historicalCountryId) })
    void queryClient.invalidateQueries({ queryKey: eventKeys.statehoodAll() })
  }

  const noteMutation = useMutation({
    mutationFn: (html: string) =>
      updateHistoricalCountry(
        historicalCountryId,
        side === 'founding'
          ? { foundingNote: html || null }
          : { dissolutionNote: html || null },
      ),
    onSuccess: () => {
      notify.success(`${title} 배경을 저장했습니다`)
      setNoteModalOpen(false)
      invalidate()
      // 목록·상세의 역사 국가 캐시(설명 칩 등)도 새 값으로
      void queryClient.invalidateQueries({ queryKey: ['historical-countries'] })
    },
    onError: () => notify.error(`${title} 배경을 저장하지 못했습니다`),
  })

  const roleMutation = useMutation({
    mutationFn: ({ eventId, next }: { eventId: string; next: 'FOUNDED' | 'DISSOLVED' | null }) =>
      setEventStatehoodRole(eventId, historicalCountryId, next),
    onSuccess: (_result, { eventId, next }) => {
      if (next) {
        setAddedThisSession((count) => count + 1)
        notify.success(`${title} 사건으로 연결했습니다`)
      } else {
        /* ×는 한 번에 눌려 실수하기 쉽다 — 확인창 대신 되돌리기 */
        notify.action(`${title} 사건 연결을 해제했습니다`, {
          label: '되돌리기',
          onClick: () => roleMutation.mutate({ eventId, next: role }),
        })
      }
      invalidate()
      // 사건 쪽 참여국 역할도 바뀌었다 — 목록·상세 캐시
      void queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: eventKeys.detailAll() })
    },
    onError: () => notify.error('사건 연결을 저장하지 못했습니다 — 본인이 등록한 사건만 연결할 수 있습니다'),
  })

  /*
   * 후보 — 검색어가 없으면 기준 해(건국·멸망 연도) 앞뒤 30년을 가까운 순으로. 예전엔
   * '최근 수정순'이라 1871년 건국 카드에 378년 전투·2026년 유엔총회가 먼저 떴다.
   * 검색 중엔 전 기간에서 찾되 역시 기준 해에 가까운 순으로 세운다.
   */
  const candidatesQuery = useQuery({
    queryKey: eventKeys.linkCandidates(debouncedTerm, debouncedTerm ? null : year),
    queryFn: () =>
      getEventLinkCandidates({
        query: debouncedTerm,
        limit: debouncedTerm ? 100 : 60,
        near: debouncedTerm ? null : year,
      }),
    enabled: pickerOpen,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    retry: 1,
  })
  const linkedIds = useMemo(() => new Set(events.map((event) => event.id)), [events])
  const candidates = useMemo<PickerCandidate[]>(() => {
    const rows = (candidatesQuery.data ?? []).map((candidate): PickerCandidate => {
      const candidateYear =
        candidate.startYear != null
          ? candidate.startEra === 'BC'
            ? -candidate.startYear
            : candidate.startYear
          : candidate.startDate
            ? Number.parseInt(candidate.startDate.slice(0, 4), 10)
            : null
      return {
        value: candidate.id,
        kind: 'event',
        label: candidate.title,
        year: candidateYear,
        hint: candidate.parentEventTitle ? `${candidate.parentEventTitle}의 하위` : undefined,
        added: linkedIds.has(candidate.id),
      }
    })
    if (year == null) return rows
    const distance = (row: PickerCandidate) =>
      row.year == null ? Number.POSITIVE_INFINITY : Math.abs(row.year - year)
    return rows.sort((left, right) => distance(left) - distance(right))
  }, [candidatesQuery.data, linkedIds, year])

  const yearLabel = formatCountryYearShort(year)
  const hasNote = Boolean(note && note.replace(/<[^>]*>/g, '').trim())
  const openEvent = (event: StatehoodEvent) =>
    preview.openEvent(event.id, title, event.roleDescription ?? null)
  const openPicker = () => {
    setAddedThisSession(0)
    setPickerOpen(true)
  }

  /* 카드 사진 = 연결된 사건 중 대표 이미지가 있는 첫 사건(연대순) — 국가 존속의 끝을 보여 주는 장면 */
  const heroEvent = events.find((event) => event.imageUrl)
  const hero = useResolvedImage(heroEvent?.imageUrl)
  const heroYear = heroEvent ? formatCountryYearShort(statehoodEventYear(heroEvent)) : ''
  /*
   * 사건 사진이 없으면 머리글 옆에 인물 초상 — 세운(멸망시킨) 인물 > 초대(마지막) 통치자.
   * 실DB 2026-10-27: 건국·멸망 사건 중 사진 있는 것 0건, 역사 국가 대표 이미지 0/383,
   * 인물 사진 222/470 — 사진이 실제로 서는 자리는 인물뿐이다.
   */
  const portrait = useMemo(() => {
    for (const agent of agents) {
      if (agent.kind === 'person' && agent.person?.profileImageUrl) {
        return {
          src: agent.person.profileImageUrl,
          name: getPersonDisplayName(agent.person, true) || agent.name,
          caption: agentLabel,
          personId: agent.person.id,
        }
      }
    }
    for (const ruler of rulers) {
      if (ruler.person.profileImageUrl) {
        return {
          src: ruler.person.profileImageUrl,
          name: ruler.regnalName?.trim() || getPersonDisplayName(ruler.person, true),
          caption: side === 'founding' ? '초대' : '마지막',
          personId: ruler.person.id,
        }
      }
    }
    return null
  }, [agents, rulers, agentLabel, side])
  const portraitImage = useResolvedImage(portrait?.src)

  const rulerLabel =
    side === 'dissolution'
      ? '마지막 통치자'
      : rulers.length > 0 && rulers.every((ruler) => isFarFromFounding(ruler, year))
        ? '첫 기록'
        : '초대 통치자'

  const heading = (
    <CardTitle id={`founding-card-${side}`}>
      <Kicker $side={side}>{title}</Kicker>
      {yearLabel ? <CardYear>{yearLabel}</CardYear> : <CardYearEmpty>연도 미상</CardYearEmpty>}
    </CardTitle>
  )

  return (
    <Card aria-labelledby={`founding-card-${side}`} $side={side}>
      {heroEvent && hero.src ? (
        <Hero>
          <HeroButton
            type="button"
            aria-label={`'${heroEvent.title}' 사건 미리보기`}
            onClick={() => openEvent(heroEvent)}
          >
            <HeroImage src={hero.src} alt="" onError={hero.onError} />
          </HeroButton>
          <HeroShade aria-hidden />
          <HeroText>
            {heading}
            <HeroCaption
              to={pathKeys.events.detail(heroEvent.id)}
              onClick={previewOnClick(() => openEvent(heroEvent))}
            >
              {heroEvent.title}
              {heroYear && <span> · {heroYear}</span>}
            </HeroCaption>
          </HeroText>
        </Hero>
      ) : (
        <CardHead>
          {portrait && portraitImage.src && (
            <Portrait
              to={pathKeys.personsTimelineDetail(portrait.personId)}
              onClick={previewOnClick(() => preview.openPerson(portrait.personId))}
              aria-label={`${portrait.caption} ${portrait.name} 미리보기`}
              title={`${portrait.caption} · ${portrait.name}`}
            >
              <img src={portraitImage.src} alt="" onError={portraitImage.onError} />
            </Portrait>
          )}
          {/* 초상 밑에 이름을 또 적지 않는다 — 바로 아래 건국자·초대 줄이 같은 인물을 보인다 */}
          {heading}
        </CardHead>
      )}

      {/* ── 배경 — 카드의 머리말. 길면 네 줄로 접고, 쓰기는 모달 ── */}
      {hasNote && (
        <Lead>
          <LeadText $clamped={!noteExpanded}>
            {isLikelyRichTextHtml(note ?? '') ? (
              <RichTextReadView html={note ?? ''} />
            ) : (
              <PlainNote>{note}</PlainNote>
            )}
          </LeadText>
          <LeadActions>
            <TextButton type="button" onClick={() => setNoteExpanded((open) => !open)}>
              {noteExpanded ? '접기' : '전체 보기'}
            </TextButton>
            <TextButton type="button" onClick={() => setNoteModalOpen(true)}>
              <FiEdit2 aria-hidden /> 배경 수정
            </TextButton>
          </LeadActions>
        </Lead>
      )}

      {/*
       * 채워진 묶음만 세운다. 빈 묶음은 카드 아래 '비어 있음' 한 줄의 칩으로 모은다.
       * 라벨 열(dt|dd) 대신 묶음 머리 + 줄 목록 — 이름·메모가 카드 폭을 다 쓴다.
       */}
      {/* ── 세운 쪽·멸망시킨 쪽 — 카드가 답하는 첫 질문('누가')이라 맨 위 ── */}
      {agents.length > 0 && (
        <Group>
          <GroupHead>
            {agentLabel}
            <GroupCount>{agents.length}</GroupCount>
          </GroupHead>
          <HistoricalStatehoodAgents
            historicalCountryId={historicalCountryId}
            side={side === 'founding' ? 'FOUNDING' : 'DISSOLUTION'}
            agents={agents}
            title={title}
            roleLabel={agentLabel}
            anchorYear={year}
          />
        </Group>
      )}

      {/* ── 사건 ── */}
      {events.length > 0 && (
        <Group>
          <GroupHead>
            {title} 사건
            <GroupCount>{events.length}</GroupCount>
          </GroupHead>
          <RowList>
            {events.map((event) => {
              const signedEventYear = statehoodEventYear(event)
              const eventYear = formatCountryYearShort(signedEventYear)
              /* 사건 연도와 등록된 존속 연도가 어긋나면 알린다 — 어느 쪽이 맞는지는 사용자가
                 판단한다(랑고바르드: 이주 568 / 파비아 함락 572처럼 기준 사건이 다를 수 있다). */
              const mismatch = signedEventYear != null && year != null && signedEventYear !== year
              return (
                <FoundingRow
                  key={event.id}
                  to={pathKeys.events.detail(event.id)}
                  onOpen={previewOnClick(() => openEvent(event))}
                  openLabel={`${event.title} 미리보기`}
                  thumb={
                    <FoundingThumb
                      src={event.imageUrl}
                      name={event.title}
                      shape="rect"
                      size={24}
                      placeholderIcon={<FiCalendar aria-hidden />}
                    />
                  }
                  title={event.title}
                  meta={eventYear || undefined}
                  sub={
                    event.roleDescription || mismatch ? (
                      <>
                        {event.roleDescription && <span>{event.roleDescription}</span>}
                        {mismatch && (
                          <Warn
                            title={`사건은 ${eventYear}, 국가 존속 ${side === 'founding' ? '시작' : '끝'}은 ${yearLabel}로 등록돼 있습니다 — 한쪽을 고치거나 그대로 두세요`}
                          >
                            등록 연도({yearLabel})와 다름
                          </Warn>
                        )}
                      </>
                    ) : undefined
                  }
                  trailing={
                    <RowAction
                      type="button"
                      $danger
                      aria-label={`'${event.title}' ${title} 사건 연결 해제`}
                      title="연결 해제(사건의 참여국으로는 남는다)"
                      disabled={roleMutation.isPending}
                      onClick={() => roleMutation.mutate({ eventId: event.id, next: null })}
                    >
                      <FiX aria-hidden />
                    </RowAction>
                  }
                />
              )
            })}
            <li>
              <RowAddButton type="button" onClick={openPicker}>
                <FiPlus aria-hidden /> 사건 연결
              </RowAddButton>
            </li>
          </RowList>
        </Group>
      )}

      {/* ── 초대(건국) · 마지막(멸망) ── */}
      {(side === 'founding' || rulers.length > 0) && (
        <Group>
          {/* 가장 이른 기록이 건국과 멀면 '초대'라 부르지 않는다 — 랑고바르드의 첫 재위 기록이
              774년 카를 1세(건국 206년 뒤)였다. 그때는 '첫 기록'으로 부르고 거리를 밝힌다. */}
          <GroupHead>{rulerLabel}</GroupHead>
          {rulers.length > 0 ? (
            <RowList>
              {rulers.map((ruler) => {
                const span = rulerSpan(ruler)
                const name = ruler.regnalName?.trim() || getPersonDisplayName(ruler.person, true)
                const gap = gapFromFounding(ruler, year)
                const hint =
                  side === 'founding' && ruler.basis === 'earliest'
                    ? isFarFromFounding(ruler, year)
                      ? `건국 ${gap}년 뒤 · 초대 기록 없음`
                      : gap != null && gap <= 1
                        ? undefined
                        : '제1대 기록이 없어 가장 이른 기록'
                    : undefined
                return (
                  <FoundingRow
                    key={ruler.recordId}
                    to={pathKeys.personsTimelineDetail(ruler.person.id)}
                    onOpen={previewOnClick(() => preview.openPerson(ruler.person.id))}
                    openLabel={`${name} 미리보기`}
                    thumb={
                      <FoundingThumb src={ruler.person.profileImageUrl} name={name} shape="round" size={32} />
                    }
                    title={name}
                    meta={
                      <>
                        <span>{ruler.title || RULER_FALLBACK_TITLE[ruler.kind]}</span>
                        {span && <span>{span}</span>}
                      </>
                    }
                    sub={hint ? <Hint>{hint}</Hint> : undefined}
                  />
                )
              })}
            </RowList>
          ) : (
            <EmptyLine>
              재위·재임 기록이 없습니다
              {onGoToHeads && (
                <TextButton type="button" onClick={onGoToHeads}>
                  역대 수반에서 등록
                </TextButton>
              )}
            </EmptyLine>
          )}
        </Group>
      )}

      {/* ── 전신·후신 ── */}
      {linked.length > 0 && (
        <Group>
          <GroupHead>
            {linkedLabel}
            <GroupCount>{linked.length}</GroupCount>
          </GroupHead>
          <RowList>
            {linked.map((country) => (
              <FoundingRow
                key={`${country.id}-${country.eventType}`}
                to={pathKeys.countryDetail(country.id)}
                onOpen={previewOnClick(() =>
                  preview.openCountry({ id: country.id, kind: 'historical', name: country.name }),
                )}
                openLabel={`${country.name} 미리보기`}
                thumb={
                  <FoundingThumb
                    src={country.thumbnailUrl}
                    name={country.name}
                    shape="rect"
                    size={24}
                    placeholderIcon={<FiFlag aria-hidden />}
                  />
                }
                title={country.name}
                meta={
                  <>
                    <span>{TRANSITION_LABEL[country.eventType] ?? country.eventType}</span>
                    {linkedSpan(country) && <span>{linkedSpan(country)}</span>}
                  </>
                }
              />
            ))}
          </RowList>
        </Group>
      )}

      {(showAgentChip || !hasNote || events.length === 0) && (
        <FillRow>
          <FillLabel>비어 있음</FillLabel>
          {showAgentChip && (
            <HistoricalStatehoodAgents
              historicalCountryId={historicalCountryId}
              side={side === 'founding' ? 'FOUNDING' : 'DISSOLUTION'}
              agents={agents}
              title={title}
              anchorYear={year}
              triggerLabel={agentLabel}
              onPickerOpenChange={setAgentChipPickerOpen}
            />
          )}
          {!hasNote && (
            <FillChip
              id={`founding-note-trigger-${side}`}
              type="button"
              onClick={() => setNoteModalOpen(true)}
            >
              <FiPlus aria-hidden /> {title} 배경
            </FillChip>
          )}
          {events.length === 0 && (
            <FillChip type="button" onClick={openPicker}>
              <FiPlus aria-hidden /> {title} 사건
            </FillChip>
          )}
        </FillRow>
      )}

      <BackgroundEditModal
        isOpen={noteModalOpen}
        title={title}
        side={side}
        initialHtml={note ?? ''}
        saving={noteMutation.isPending}
        onClose={() => setNoteModalOpen(false)}
        onSave={(html) => noteMutation.mutate(html)}
      />

      <StatehoodPickerModal
        isOpen={pickerOpen}
        onClose={() => {
          setPickerOpen(false)
          setSearchTerm('')
        }}
        title={`${title} 사건 연결`}
        subtitle={yearLabel ? `${title} ${yearLabel} — 이 나라가 ${side === 'founding' ? '세워진' : '사라진'} 계기가 된 사건` : undefined}
        anchorYear={year}
        anchorLabel={title}
        candidates={candidates}
        query={searchTerm}
        onQueryChange={setSearchTerm}
        searchPlaceholder="사건명으로 검색"
        isLoading={candidatesQuery.isLoading || searchTerm !== debouncedTerm}
        isError={candidatesQuery.isError}
        onRetry={() => void candidatesQuery.refetch()}
        onPick={(candidate) => roleMutation.mutate({ eventId: candidate.value, next: role })}
        defaultHeading={yearLabel ? `${yearLabel} 앞뒤 30년 — 가까운 순` : undefined}
        emptyText={
          searchTerm.trim()
            ? `'${searchTerm.trim()}'에 맞는 사건이 없습니다.`
            : yearLabel
              ? `${yearLabel} 앞뒤 30년에 등록된 사건이 없습니다. 사건명으로 검색해 보세요.`
              : '사건명으로 검색해 보세요.'
        }
        addedThisSession={addedThisSession}
      />
    </Card>
  )
}

function linkedSpan(country: FoundingLinkedCountry): string {
  const start = formatCountryYearShort(signedYear(country.startEra, country.startYear))
  const end = formatCountryYearShort(signedYear(country.endEra, country.endYear))
  if (!start && !end) return ''
  return `${start ?? '?'}–${end ?? ''}`
}

// ─── Styled ─────────────────────────────────────────────────────────────────

const Cards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr));
  gap: 16px;
`

/*
 * 쪽 색 — 사건 목록 레일 표지와 같은 짝(건국 초록·멸망 장미). 카드 테두리 위 3px 띠와
 * 킥커 글자에만 쓴다: 면을 칠하면 두 카드가 경고/성공 알림처럼 읽힌다.
 */
const SIDE_INK = {
  founding: { light: '#15803d', dark: '#4ade80' },
  dissolution: { light: '#be123c', dark: '#fb7185' },
} as const

const sideInk = (side: Side, mode: string) => SIDE_INK[side][mode === 'dark' ? 'dark' : 'light']

const Card = styled.section<{ $side: Side }>`
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 0 18px 16px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-top: 3px solid ${({ theme, $side }) => sideInk($side, theme.mode)};
  border-radius: 12px;
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#fff')};
`

/* 초상(64px) 유무와 상관없이 같은 높이 — 나란한 두 카드의 첫 묶음이 같은 y에 선다 */
const CardHead = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  box-sizing: border-box;
  min-height: 80px;
  padding-top: 16px;
`

/* 초상 — 얼굴이 위쪽에 있는 사진이 대부분이라 위 25%를 맞춘다 */
const Portrait = styled(Link)`
  flex: none;
  width: 64px;
  height: 64px;
  overflow: hidden;
  border-radius: 50%;
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#eef0f3')};
  box-shadow: inset 0 0 0 1px
    ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)')};
  transition: transform 0.15s;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center 25%;
  }
  &:hover {
    transform: scale(1.04);
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`

const CardTitle = styled.h3`
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Kicker = styled.span<{ $side: Side }>`
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: ${({ theme, $side }) => sideInk($side, theme.mode)};
`

const CardYear = styled.span`
  font-size: 24px;
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`

const CardYearEmpty = styled.span`
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/* 사진 — 카드 폭 끝까지(좌우 패딩 상쇄), 아래 그라데이션 위에 킥커·연도·사건명 */
const Hero = styled.div`
  position: relative;
  margin: 0 -18px;
  aspect-ratio: 16 / 7;
  max-height: 220px;
  overflow: hidden;
  background: ${({ theme }) => (theme.mode === 'dark' ? '#1a1a1a' : '#e5e7eb')};
`

const HeroButton = styled.button`
  position: absolute;
  inset: 0;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid #fff;
    outline-offset: -4px;
  }
`

const HeroImage = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;

  ${HeroButton}:hover & {
    transform: scale(1.02);
  }
`

const HeroShade = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.72) 0%, rgba(0, 0, 0, 0.28) 45%, rgba(0, 0, 0, 0) 75%);
`

const HeroCaption = styled(Link)`
  overflow: hidden;
  font-size: 12.5px;
  font-weight: 600;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: rgba(255, 255, 255, 0.9);
  text-decoration: none;

  span {
    font-variant-numeric: tabular-nums;
    color: rgba(255, 255, 255, 0.72);
  }
  &:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

/* 사진 위 글자는 테마와 무관하게 흰색 — 킥커도 밝은 쪽 색으로 */
const HeroText = styled.div`
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: #fff;
  /* 글자 덮개는 클릭을 사진 버튼으로 흘려보내고, 사건명 링크만 받는다 */
  pointer-events: none;

  ${HeroCaption} {
    pointer-events: auto;
  }
  ${CardTitle}, ${CardYear} {
    color: #fff;
  }
  ${Kicker} {
    color: rgba(255, 255, 255, 0.86);
  }
  ${CardYearEmpty} {
    color: rgba(255, 255, 255, 0.7);
  }
`

/* 배경 글 — 카드 머리말 */
const Lead = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13.5px;
  line-height: 1.65;
  color: ${({ theme }) => theme.colors.text.primary};
`

const LeadText = styled.div<{ $clamped: boolean }>`
  ${({ $clamped }) =>
    $clamped &&
    `
    max-height: calc(1.65em * 4);
    overflow: hidden;
    -webkit-mask-image: linear-gradient(to bottom, #000 60%, transparent);
    mask-image: linear-gradient(to bottom, #000 60%, transparent);
  `}

  p {
    margin: 0 0 0.5em;
  }
`

const LeadActions = styled.div`
  display: flex;
  gap: 4px;
  margin-left: -6px;
`

const PlainNote = styled.p`
  margin: 0;
  white-space: pre-wrap;
`

/* 묶음 — 머리(라벨·개수) + 줄 목록 */
const Group = styled.section`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const GroupHead = styled.h4`
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const GroupCount = styled.span`
  min-width: 18px;
  padding: 0 6px;
  border-radius: 999px;
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f1f2f4')};
  font-size: 11px;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const EmptyLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  padding: 6px 0;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/** 사건 연도 ≠ 등록 존속 연도 — 경고색이 아니라 옅은 호박 글자(오류가 아닐 수도 있다) */
const Warn = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fbbf24' : '#b45309')};
`

const Hint = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const TextButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 6px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f4f5f7')};
  }
  svg {
    width: 12px;
    height: 12px;
  }
`

/** 빈 항목 모음 — 카드 맨 아래 한 줄 */
const FillRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px dashed ${({ theme }) => theme.colors.border.light};
`

const FillLabel = styled.span`
  margin-right: 2px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
