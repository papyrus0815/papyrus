/**
 * 역사 국가 개요 — '건국'·'멸망' 카드.
 *
 * 한 카드 = 존속 기간의 한쪽 끝이 **어떻게** 열리고 닫혔나.
 *   배경  — 사용자가 쓰는 글(HistoricalCountry.foundingNote / dissolutionNote, 리치 텍스트)
 *   사건  — 참여국 역할 '건국'·'멸망'으로 이 나라를 건 사건(여기서 연결·해제)
 *   초대  — 재위·재임 기록에서 파생(제1대, 없으면 가장 이른 기록) — 건국 카드만
 *   전신·후신 — 계승 관계에서 파생
 *
 * 새로 저장하는 것은 배경 글 두 칸뿐이다. 초대·전신을 따로 적는 칸을 두면 재위 표·계승 표와
 * 두 곳에서 어긋나기 때문이다(검토 2026-09-27 — 사용자 승인 '초대는 자동').
 */
import { useMemo, useState } from 'react'

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiPlus, FiX } from 'react-icons/fi'
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
  getHistoricalCountryFoundingSummary,
  updateHistoricalCountry,
} from '@/shared/api/historical-countries'
import { uploadImage } from '@/shared/api/upload'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { formatCountryYearShort } from '@/shared/lib/country-period'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { isLikelyRichTextHtml } from '@/shared/lib/rich-text-read-view'
import { pathKeys } from '@/shared/router'
import { RichTextEditor } from '@/shared/ui/rich-text-editor/rich-text-editor'
import { RichTextReadView } from '@/shared/ui/rich-text-read-view/rich-text-read-view'
import { SelectModal, type SelectOption } from '@/shared/ui/select-modal/select-modal'
import { notify } from '@/shared/ui/toast'

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

export function HistoricalFoundingCards({
  historicalCountryId,
  entityKind,
  startYear,
  endYear,
  onGoToHeads,
}: HistoricalFoundingCardsProps) {
  const isState = !entityKind || entityKind === 'STATE'
  const { data: summary } = useQuery({
    queryKey: foundingSummaryKey(historicalCountryId),
    queryFn: () => getHistoricalCountryFoundingSummary(historicalCountryId),
    staleTime: 60_000,
  })
  const { data: statehood } = useQuery({
    queryKey: ['events', 'statehood', { historicalCountryId }],
    queryFn: () => getCountryStatehoodEvents({ historicalCountryId }),
    staleTime: 60_000,
  })

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
        firstRulers={summary.firstRulers}
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
          firstRulers={[]}
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
  firstRulers: FirstRuler[]
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
  firstRulers,
  linked,
  linkedLabel,
  onGoToHeads,
}: FoundingCardProps) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedTerm = useDebouncedValue(searchTerm, 250, String(pickerOpen))
  const role = side === 'founding' ? 'FOUNDED' : 'DISSOLVED'

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: foundingSummaryKey(historicalCountryId) })
    void queryClient.invalidateQueries({ queryKey: ['events', 'statehood'] })
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
      setEditing(false)
      invalidate()
      // 목록·상세의 역사 국가 캐시(설명 칩 등)도 새 값으로
      void queryClient.invalidateQueries({ queryKey: ['historical-countries'] })
    },
    onError: () => notify.error(`${title} 배경을 저장하지 못했습니다`),
  })

  const roleMutation = useMutation({
    mutationFn: ({ eventId, next }: { eventId: string; next: 'FOUNDED' | 'DISSOLVED' | null }) =>
      setEventStatehoodRole(eventId, historicalCountryId, next),
    onSuccess: (_result, { next }) => {
      notify.success(next ? `${title} 사건으로 연결했습니다` : `${title} 사건 연결을 해제했습니다`)
      invalidate()
      // 사건 쪽 참여국 역할도 바뀌었다 — 목록·상세 캐시
      void queryClient.invalidateQueries({ queryKey: ['events'] })
      void queryClient.invalidateQueries({ queryKey: ['event-detail'] })
    },
    onError: () => notify.error('사건 연결을 저장하지 못했습니다 — 본인이 등록한 사건만 연결할 수 있습니다'),
  })

  const candidatesQuery = useQuery({
    queryKey: ['events', 'link-candidates', debouncedTerm],
    queryFn: () => getEventLinkCandidates({ query: debouncedTerm, limit: 51 }),
    enabled: pickerOpen,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    retry: 1,
  })
  const linkedIds = useMemo(() => new Set(events.map((event) => event.id)), [events])
  const options = useMemo<SelectOption[]>(
    () =>
      (candidatesQuery.data ?? []).slice(0, 50).map((candidate) => {
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
          label: candidate.title,
          description: [
            formatCountryYearShort(candidateYear),
            linkedIds.has(candidate.id) ? `이미 ${title} 사건` : null,
          ]
            .filter(Boolean)
            .join(' · ') || undefined,
        }
      }),
    [candidatesQuery.data, linkedIds, title],
  )

  const yearLabel = formatCountryYearShort(year)
  const hasNote = Boolean(note && note.replace(/<[^>]*>/g, '').trim())

  return (
    <Card aria-labelledby={`founding-card-${side}`}>
      <CardHead>
        <CardTitle id={`founding-card-${side}`}>
          {title}
          {yearLabel && <CardYear>{yearLabel}</CardYear>}
        </CardTitle>
      </CardHead>

      <Facts>
        {/* ── 배경 ── */}
        <FactLabel>배경</FactLabel>
        <FactValue>
          {editing ? (
            <EditorWrap>
              <RichTextEditor
                value={note ?? ''}
                onChange={(html) => setDraft(html)}
                placeholder={`이 나라가 어떤 경위로 ${side === 'founding' ? '세워졌는지' : '사라졌는지'} 적어 주세요`}
                showTitle={false}
                onImageUpload={async (file) => {
                  const result = await uploadImage(file, 'attachments')
                  return result.url ?? (result as unknown as string)
                }}
              />
              <EditorActions>
                <TextButton type="button" onClick={() => setEditing(false)}>
                  취소
                </TextButton>
                <PrimaryButton
                  type="button"
                  disabled={noteMutation.isPending}
                  onClick={() => {
                    const html = draft.replace(/<p><\/p>/g, '').trim()
                    noteMutation.mutate(html.replace(/<[^>]*>/g, '').trim() ? html : '')
                  }}
                >
                  {noteMutation.isPending ? '저장 중…' : '저장'}
                </PrimaryButton>
              </EditorActions>
            </EditorWrap>
          ) : hasNote ? (
            <NoteBlock>
              {isLikelyRichTextHtml(note ?? '') ? (
                <RichTextReadView html={note ?? ''} />
              ) : (
                <PlainNote>{note}</PlainNote>
              )}
              <TextButton
                type="button"
                onClick={() => {
                  setDraft(note ?? '')
                  setEditing(true)
                }}
              >
                수정
              </TextButton>
            </NoteBlock>
          ) : (
            <AddButton
              type="button"
              onClick={() => {
                setDraft('')
                setEditing(true)
              }}
            >
              <FiPlus aria-hidden /> {title} 배경 쓰기
            </AddButton>
          )}
        </FactValue>

        {/* ── 사건 ── */}
        <FactLabel>사건</FactLabel>
        <FactValue>
          <Inline>
            {events.map((event) => {
              const signedEventYear = statehoodEventYear(event)
              const eventYear = formatCountryYearShort(signedEventYear)
              /* 사건 연도와 등록된 존속 연도가 어긋나면 알린다 — 어느 쪽이 맞는지는 사용자가
                 판단한다(랑고바르드: 이주 568 / 파비아 함락 572처럼 기준 사건이 다를 수 있다). */
              const mismatch =
                signedEventYear != null && year != null && signedEventYear !== year
              return (
                <Chip key={event.id}>
                  <ChipLink to={pathKeys.events.detail(event.id)}>{event.title}</ChipLink>
                  {eventYear && <Muted>{eventYear}</Muted>}
                  {mismatch && (
                    <Warn
                      title={`사건은 ${eventYear}, 국가 존속 ${side === 'founding' ? '시작' : '끝'}은 ${yearLabel}로 등록돼 있습니다 — 한쪽을 고치거나 그대로 두세요`}
                    >
                      등록 연도({yearLabel})와 다름
                    </Warn>
                  )}
                  <ChipX
                    type="button"
                    aria-label={`'${event.title}' ${title} 사건 연결 해제`}
                    title="연결 해제(사건의 참여국으로는 남는다)"
                    onClick={() => roleMutation.mutate({ eventId: event.id, next: null })}
                  >
                    <FiX aria-hidden />
                  </ChipX>
                </Chip>
              )
            })}
            <AddButton type="button" onClick={() => setPickerOpen(true)}>
              <FiPlus aria-hidden /> 사건 연결
            </AddButton>
          </Inline>
        </FactValue>

        {/* ── 초대(건국 카드만) ── */}
        {side === 'founding' && (
          <>
            {/* 가장 이른 기록이 건국과 멀면 '초대'라 부르지 않는다 — 랑고바르드의 첫 재위 기록이
                774년 카를 1세(건국 206년 뒤)였다. 그때는 '첫 기록'으로 부르고 거리를 밝힌다. */}
            <FactLabel>{firstRulers.length > 0 && firstRulers.every((ruler) => isFarFromFounding(ruler, year)) ? '첫 기록' : '초대'}</FactLabel>
            <FactValue>
              {firstRulers.length > 0 ? (
                <Stack>
                  {firstRulers.map((ruler) => {
                    const span = rulerSpan(ruler)
                    return (
                      <RulerLine key={ruler.recordId}>
                        <Muted>{ruler.title || RULER_FALLBACK_TITLE[ruler.kind]}</Muted>
                        <PersonLink to={pathKeys.personsTimelineDetail(ruler.person.id)}>
                          {ruler.regnalName?.trim() || getPersonDisplayName(ruler.person, true)}
                        </PersonLink>
                        {span && <Muted>{span}</Muted>}
                        {ruler.basis === 'earliest' &&
                          (isFarFromFounding(ruler, year) ? (
                            <Hint title="제1대로 기록된 재위·재임이 없고, 가장 이른 기록도 건국과 멀어 초대로 보지 않습니다">
                              건국 {gapFromFounding(ruler, year)}년 뒤 · 초대 기록 없음
                            </Hint>
                          ) : (
                            <Hint title="제1대로 기록된 재위·재임이 없어 가장 이른 기록을 보여 줍니다">
                              가장 이른 기록
                            </Hint>
                          ))}
                      </RulerLine>
                    )
                  })}
                </Stack>
              ) : (
                <Inline>
                  <Muted>재위·재임 기록이 없습니다</Muted>
                  {onGoToHeads && (
                    <TextButton type="button" onClick={onGoToHeads}>
                      역대 수반에서 등록
                    </TextButton>
                  )}
                </Inline>
              )}
            </FactValue>
          </>
        )}

        {/* ── 전신·후신 ── */}
        {linked.length > 0 && (
          <>
            <FactLabel>{linkedLabel}</FactLabel>
            <FactValue>
              <Inline>
                {linked.map((country) => (
                  <Chip key={`${country.id}-${country.eventType}`}>
                    <ChipLink to={pathKeys.countryDetail(country.id)}>{country.name}</ChipLink>
                    <Muted>{TRANSITION_LABEL[country.eventType] ?? country.eventType}</Muted>
                  </Chip>
                ))}
              </Inline>
            </FactValue>
          </>
        )}
      </Facts>

      <SelectModal
        isOpen={pickerOpen}
        onClose={() => {
          setPickerOpen(false)
          setSearchTerm('')
        }}
        title={`${title} 사건 연결`}
        options={options}
        onSelect={(eventId) => {
          setPickerOpen(false)
          setSearchTerm('')
          if (linkedIds.has(eventId)) return
          roleMutation.mutate({ eventId, next: role })
        }}
        searchable
        searchPlaceholder="사건명으로 검색"
        isLoading={candidatesQuery.isLoading}
        isSearching={candidatesQuery.isFetching || searchTerm !== debouncedTerm}
        hasError={candidatesQuery.isError}
        onRetry={() => void candidatesQuery.refetch()}
        onQueryChange={setSearchTerm}
      />
    </Card>
  )
}

// ─── Styled ─────────────────────────────────────────────────────────────────

const Cards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
`

const Card = styled.section`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 18px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 12px;
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#fff')};
`

const CardHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`

const CardTitle = styled.h3`
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const CardYear = styled.span`
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
`

/** 라벨 열 | 값 열 — 라벨은 글자 폭만(max-content) */
const Facts = styled.dl`
  margin: 0;
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  column-gap: 14px;
  row-gap: 10px;
  font-size: 13.5px;
`

const FactLabel = styled.dt`
  padding-top: 2px;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const FactValue = styled.dd`
  margin: 0;
  min-width: 0;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Inline = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
`

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const Chip = styled.span`
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
`

const ChipLink = styled(Link)`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

const PersonLink = styled(ChipLink)``

const ChipX = styled.button`
  align-self: center;
  display: inline-flex;
  padding: 2px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.alert.danger.fg};
  }
  svg {
    width: 12px;
    height: 12px;
  }
`

const Muted = styled.span`
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
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

const RulerLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px;
`

const NoteBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
`

const PlainNote = styled.p`
  margin: 0;
  white-space: pre-wrap;
`

const EditorWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const EditorActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`

const TextButton = styled.button`
  padding: 2px 6px;
  margin-left: -6px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const AddButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  margin-left: -6px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.active};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.activeLight};
  }
`

const PrimaryButton = styled.button`
  padding: 6px 14px;
  border: none;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.primary};
  font-size: 12.5px;
  font-weight: 700;
  color: #fff;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`
