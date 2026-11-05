/**
 * 관련 사건 잇기 창 — 고르기와 정하기를 한 창에서.
 *
 * 예전 흐름: '기존 사건과 잇기' → 고르기 창(SelectModal)에서 사건을 고르면 창이 닫히고, 관계를 정하는 작성 줄은
 * 연관 탭 본문 아래에 따로 열렸다(스크롤로 찾아가야 했고, 하나 잇고 나면 다시 처음부터). 후보 줄에는
 * '이미 연결됨(같은 국면) — 고르면 수정'이 설명 글에 섞여 있었고, 원인 쪽(앞)·결과 쪽(뒤)을 가를 수 없었다.
 *
 * - 왼쪽: 찾기 + 거르기(전체·같은 상위·같은 키워드·연결된 것 숨기기) + 이 사건 **앞(원인 쪽) / 뒤(결과 쪽)** 구획.
 *   연결된 사건은 줄 오른쪽 표지(종류)로.
 * - 오른쪽: 고른 사건의 관계 — 종류·방향(날짜로 미리 정함, 어긋나면 경고)·문장 미리보기·이유.
 *   '연결' 또는 '연결하고 계속'(창을 닫지 않고 다음 사건으로).
 * - 좁은 폭: 한 칸 — 고르면 정하기 화면으로, '← 목록'으로 돌아간다.
 */
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'

import { useQuery } from '@tanstack/react-query'

import { FiArrowLeft, FiArrowRight, FiExternalLink, FiMapPin, FiPlus, FiSearch } from 'react-icons/fi'
import styled from 'styled-components'

import { ledgerAccent } from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'
import {
  DIRECTED_RELATION_TYPES,
  EVENT_RELATION_LABELS,
  type EventRelationDirection,
  type EventRelationType,
} from '@/shared/api/event-relations'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog'
import { Modal, ModalBody } from '@/shared/ui/modal'
import { SegmentControl } from '@/shared/ui/segment-control/segment-control'

import { eventDetailQueryOptions } from '../use-event-detail'
import { REASON_MAX } from './detail-network.lib'
import {
  type PickerEvent,
  directionConflicts,
  inferDirection,
  relationSentence,
  relativeStart,
} from './related-picker.lib'

/** 작성 상태 — 새 연결(relationId 없음) 또는 기존 관계 수정 */
export interface RelationDraft {
  relationId?: string
  other: PickerEvent & { id: string; title: string; dateLabel?: string | null }
  relationType: EventRelationType
  direction: EventRelationDirection
  description: string
}

/** 후보 한 줄 */
export interface LinkCandidate extends PickerEvent {
  id: string
  title: string
  dateLabel: string | null
  /** '같은 상위의 사건' · '‘프랑스 혁명’의 하위' */
  membership: string | null
  sameParent: boolean
  /** 같은 키워드 후보면 겹친 키워드 */
  sharedKeywords?: string[]
  /** 이미 이은 관계 — 고르면 수정 */
  existing?: { relationId: string; relationType: EventRelationType; direction: EventRelationDirection; description: string | null }
}

const TYPE_OPTIONS: Array<{ value: EventRelationType; label: string }> = (
  ['LED_TO', 'INFLUENCED', 'RESPONSE_TO', 'CONCURRENT', 'RELATED'] as const
).map((type) => ({ value: type, label: EVENT_RELATION_LABELS[type].name }))

type Filter = 'all' | 'sibling' | 'keyword'

interface RelatedLinkModalProps {
  isOpen: boolean
  onClose: () => void
  eventTitle: string
  self: PickerEvent
  candidates: LinkCandidate[]
  /** 찾는 중이면 구획을 '검색 결과'로 */
  searching: boolean
  loading: boolean
  failed: boolean
  onRetry: () => void
  onQueryChange: (query: string) => void
  /** 들어올 때 고른 상태(관계 바꾸기·키워드 '잇기') */
  initialDraft: RelationDraft | null
  saving: boolean
  /** 저장 — 새로 만든 관계 id를 돌려주면 '되돌리기'가 그 연결을 끊는다 */
  onSave: (draft: RelationDraft) => Promise<string | undefined>
  /** 이은 관계 끊기(고치기 화면·되돌리기) */
  onDelete?: (relationId: string) => Promise<void>
  /** 찾아도 없을 때 — 새 관련 사건 등록(창을 닫고 등록 창을 연다) */
  onCreateNew?: () => void
}

export function RelatedLinkModal({
  isOpen,
  onClose,
  eventTitle,
  self,
  candidates,
  searching,
  loading,
  failed,
  onRetry,
  onQueryChange,
  initialDraft,
  saving,
  onSave,
  onDelete,
  onCreateNew,
}: RelatedLinkModalProps) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [hideLinked, setHideLinked] = useState(false)
  const [draft, setDraft] = useState<RelationDraft | null>(initialDraft)
  const [linkedCount, setLinkedCount] = useState(0)
  /** '연결하고 계속'으로 마지막에 이은 것 — 되돌리기 */
  const [lastLinked, setLastLinked] = useState<{ relationId: string; title: string } | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  /* 고른 사건 미리보기 — 상세 조회(같은 캐시). 요약 517/589건이 있는데 창엔 제목·날짜뿐이라 무슨 사건인지 몰랐다 */
  const previewQuery = useQuery({ ...eventDetailQueryOptions(draft?.other.id ?? ''), enabled: Boolean(draft) })
  const preview = draft && previewQuery.data?.id === draft.other.id ? previewQuery.data : null
  const searchRef = useRef<HTMLInputElement>(null)
  const composerRef = useRef<HTMLDivElement>(null)

  /* 열 때마다 처음 상태로 — 들어온 선택(관계 바꾸기)이 있으면 그것부터 */
  useEffect(() => {
    if (!isOpen) return
    setDraft(initialDraft)
    setQuery('')
    onQueryChange('')
    setFilter('all')
    setLinkedCount(0)
    setLastLinked(null)
    // 열릴 때만
  }, [isOpen])

  const choose = (candidate: LinkCandidate) => {
    const other = {
      id: candidate.id,
      title: candidate.title,
      dateLabel: candidate.dateLabel,
      startDate: candidate.startDate ?? null,
      startDatePrecision: candidate.startDatePrecision ?? null,
      startEra: candidate.startEra ?? null,
      startYear: candidate.startYear ?? null,
    }
    setDraft(
      candidate.existing
        ? {
            relationId: candidate.existing.relationId,
            other,
            relationType: candidate.existing.relationType,
            direction: candidate.existing.direction,
            description: candidate.existing.description ?? '',
          }
        : {
            other,
            /* 같은 키워드로 고르면 '그 밖의 연관'으로 시작 — 계기·배경은 사람이 판단 */
            relationType: candidate.sharedKeywords?.length ? 'RELATED' : 'LED_TO',
            direction: inferDirection(self, other) ?? 'incoming',
            description: '',
          },
    )
    requestAnimationFrame(() =>
      composerRef.current?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]')?.focus({ preventScroll: true }),
    )
  }

  const visible = candidates.filter(
    (candidate) =>
      (filter === 'all' || (filter === 'sibling' ? candidate.sameParent : Boolean(candidate.sharedKeywords?.length))) &&
      (!hideLinked || !candidate.existing),
  )
  /* 이 사건 앞(원인 쪽) · 뒤(결과 쪽) · 날짜 모름 — 계기·배경은 앞 사건에서 뒤 사건으로 흐른다 */
  const sections = useMemo(() => {
    const before: LinkCandidate[] = []
    const after: LinkCandidate[] = []
    const unknown: LinkCandidate[] = []
    for (const candidate of visible) {
      const direction = inferDirection(self, candidate)
      if (direction === 'incoming') before.push(candidate)
      else if (direction === 'outgoing') after.push(candidate)
      else unknown.push(candidate)
    }
    return [
      { key: 'before', title: '이 사건 앞 — 원인·배경 쪽', items: before },
      { key: 'after', title: '이 사건 뒤 — 결과·대응 쪽', items: after },
      { key: 'unknown', title: '같은 날·날짜 모름', items: unknown },
    ].filter((section) => section.items.length > 0)
  }, [visible, self])
  const linkedTotal = candidates.filter((candidate) => candidate.existing).length
  const keywordTotal = candidates.filter((candidate) => candidate.sharedKeywords?.length).length
  const siblingTotal = candidates.filter((candidate) => candidate.sameParent).length

  const relative = draft ? relativeStart(self, draft.other) : null
  const conflict = draft ? directionConflicts(draft.relationType, draft.direction, self, draft.other) : false

  const save = async (keepOpen: boolean) => {
    if (!draft) return
    let savedId: string | undefined
    try {
      savedId = await onSave(draft)
    } catch {
      /* 실패 안내는 저장하는 쪽(토스트)이 맡는다 — 창은 그대로 두어 다시 시도하게 */
      return
    }
    if (keepOpen) {
      setLinkedCount((count) => count + 1)
      setLastLinked(savedId && !draft.relationId ? { relationId: savedId, title: draft.other.title } : null)
      setDraft(null)
      requestAnimationFrame(() => searchRef.current?.focus())
    } else onClose()
  }

  /* 키보드 — 찾기 칸 ↓ → 첫 후보, 목록 안 ↑↓, Enter는 단추 그대로. 예전엔 찾기 칸에서 목록으로 갈 길이 Tab 여러 번뿐 */
  const rowButtons = () => [...(listRef.current?.querySelectorAll<HTMLButtonElement>('button[data-row]') ?? [])]
  const moveFocus = (keyEvent: KeyboardEvent<HTMLElement>) => {
    if (keyEvent.key !== 'ArrowDown' && keyEvent.key !== 'ArrowUp') return
    const rows = rowButtons()
    if (rows.length === 0) return
    keyEvent.preventDefault()
    const index = rows.indexOf(document.activeElement as HTMLButtonElement)
    if (index < 0) {
      if (keyEvent.key === 'ArrowDown') rows[0].focus()
      return
    }
    const next = keyEvent.key === 'ArrowDown' ? index + 1 : index - 1
    if (next < 0) searchRef.current?.focus()
    else rows[Math.min(next, rows.length - 1)].focus()
  }

  const removeExisting = async () => {
    if (!draft?.relationId || !onDelete) return
    const ok = await confirm({
      title: '이 연결을 끊을까요?',
      message: `‘${draft.other.title}’과의 연결 — 두 사건 모두에서 사라지고 적어 둔 이유도 지워집니다.`,
      confirmLabel: '끊기',
      danger: true,
    })
    if (!ok) return
    try {
      await onDelete(draft.relationId)
      setDraft(null)
    } catch {
      /* 안내는 지우는 쪽이 */
    }
  }

  const undoLast = async () => {
    if (!lastLinked || !onDelete) return
    try {
      await onDelete(lastLinked.relationId)
      setLinkedCount((count) => Math.max(0, count - 1))
      setLastLinked(null)
    } catch {
      /* 안내는 지우는 쪽이 */
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="관련 사건 잇기"
      subtitle={
        <>
          ‘{eventTitle}’과 원인·결과로 이어진 다른 사건 — 고르고, 어떻게 이어지는지 정합니다
          {linkedCount > 0 && <Linked> · 이번에 {linkedCount}건 이음</Linked>}
          {lastLinked && onDelete && (
            <UndoButton type="button" onClick={() => void undoLast()} title={`‘${lastLinked.title}’ 연결 되돌리기`}>
              마지막 것 되돌리기
            </UndoButton>
          )}
        </>
      }
      maxWidth="min(1040px, 96vw)"
      initialFocusRef={initialDraft ? undefined : searchRef}
    >
      {/* 공용 ModalBody — 안쪽 여백. 바로 넣으면 목록·입력칸이 창 가장자리에 붙었다 */}
      <ModalBody>
      <Layout
        data-picked={draft ? '' : undefined}
        onKeyDownCapture={(keyEvent) => {
          /* Esc는 한 단계씩 — 정하기 중이면 목록으로(창은 그대로), 목록이면 창 닫기 */
          if (keyEvent.key !== 'Escape' || !draft || keyEvent.defaultPrevented) return
          keyEvent.preventDefault()
          keyEvent.stopPropagation()
          const id = draft.other.id
          setDraft(null)
          requestAnimationFrame(() => rowButtons().find((row) => row.dataset.row === id)?.focus())
        }}
      >
        <ListPane aria-label="사건 고르기">
          <SearchBox>
            <FiSearch aria-hidden />
            <input
              ref={searchRef}
              type="search"
              value={query}
              placeholder="사건명으로 찾기 — 비우면 이 사건과 가까운 시기"
              aria-label="사건명으로 찾기"
              onChange={(changeEvent) => {
                setQuery(changeEvent.target.value)
                onQueryChange(changeEvent.target.value)
              }}
              onKeyDown={moveFocus}
            />
          </SearchBox>
          <Filters role="group" aria-label="거르기">
            <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
              전체
            </button>
            {siblingTotal > 0 && (
              <button type="button" aria-pressed={filter === 'sibling'} onClick={() => setFilter('sibling')}>
                같은 상위 {siblingTotal}
              </button>
            )}
            {keywordTotal > 0 && (
              <button type="button" aria-pressed={filter === 'keyword'} onClick={() => setFilter('keyword')}>
                같은 키워드 {keywordTotal}
              </button>
            )}
            {linkedTotal > 0 && (
              <label>
                <input type="checkbox" checked={hideLinked} onChange={(changeEvent) => setHideLinked(changeEvent.target.checked)} />
                이은 것 숨기기 {linkedTotal}
              </label>
            )}
          </Filters>

          <ListScroll ref={listRef} onKeyDown={moveFocus}>
            {failed ? (
              <Empty>
                후보를 불러오지 못했습니다.{' '}
                <button type="button" onClick={onRetry}>
                  다시 시도
                </button>
              </Empty>
            ) : loading ? (
              <Empty>후보를 찾는 중…</Empty>
            ) : sections.length === 0 ? (
              <Empty>
                {query.trim() ? `‘${query.trim()}’에 맞는 사건이 없습니다.` : '고를 사건이 없습니다.'}
                <span className="note">상위·하위로 이미 이어진 사건은 여기 나오지 않습니다 — 연관 탭 '소속'에서 봅니다.</span>
                {onCreateNew && (
                  <CreateButton type="button" onClick={onCreateNew}>
                    <FiPlus aria-hidden /> 이 사건과 이을 새 사건 등록
                  </CreateButton>
                )}
              </Empty>
            ) : (
              sections.map((section) => (
                <Section key={section.key} aria-label={section.title}>
                  <SectionTitle>
                    {searching ? `검색 결과 · ${section.title}` : section.title}
                    <span>{section.items.length}</span>
                  </SectionTitle>
                  <ul>
                    {section.items.map((candidate) => {
                      const selected = draft?.other.id === candidate.id
                      const when = relativeStart(self, candidate)
                      return (
                        <li key={candidate.id}>
                          <Row type="button" data-row={candidate.id} aria-pressed={selected} onClick={() => choose(candidate)}>
                            <span className="date">{candidate.dateLabel ?? '날짜 모름'}</span>
                            <span className="main">
                              <span className="title">{candidate.title}</span>
                              <span className="sub">
                                {[when ? `이 사건 ${when}` : null, candidate.membership].filter(Boolean).join(' · ')}
                                {candidate.sharedKeywords?.length ? (
                                  <span className="keywords"> · 키워드 {candidate.sharedKeywords.slice(0, 3).join('·')}</span>
                                ) : null}
                              </span>
                            </span>
                            {candidate.existing && (
                              <Badge title="이미 이은 사건 — 고르면 관계를 고칩니다">
                                {EVENT_RELATION_LABELS[candidate.existing.relationType].name}
                              </Badge>
                            )}
                          </Row>
                        </li>
                      )
                    })}
                  </ul>
                </Section>
              ))
            )}
          </ListScroll>
        </ListPane>

        <ComposePane ref={composerRef} aria-label="관계 정하기">
          {!draft ? (
            <Placeholder>
              <strong>왼쪽에서 사건을 고르세요</strong>
              <span>이 사건보다 앞선 사건은 원인·배경 쪽, 뒤의 사건은 결과·대응 쪽에 모여 있습니다.</span>
            </Placeholder>
          ) : (
            <>
              <BackButton type="button" onClick={() => setDraft(null)}>
                <FiArrowLeft aria-hidden /> 목록
              </BackButton>
              <Picked>
                <span className="eyebrow">{draft.relationId ? '이은 관계 고치기' : '이을 사건'}</span>
                <strong>{draft.other.title}</strong>
                <span className="meta">
                  {[draft.other.dateLabel, relative ? `이 사건 ${relative}` : null].filter(Boolean).join(' · ')}
                </span>
                {preview ? (
                  <PreviewText>
                    {preview.description?.trim() ? (
                      <span className="summary">{preview.description.replace(/<[^>]+>/g, ' ').trim()}</span>
                    ) : (
                      <span className="summary" data-empty>
                        요약이 아직 없는 사건입니다
                      </span>
                    )}
                    {(preview.location?.trim() ||
                      (preview.relatedCountries?.length ?? 0) + (preview.relatedHistoricalCountries?.length ?? 0) > 0) && (
                      <span className="facts">
                        {preview.location?.trim() && <FiMapPin aria-hidden />}
                        {[
                          preview.location?.trim() || null,
                          ...[...(preview.relatedHistoricalCountries ?? []), ...(preview.relatedCountries ?? [])]
                            .slice(0, 4)
                            .map((country) => country.name),
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    )}
                  </PreviewText>
                ) : (
                  previewQuery.isLoading && <PreviewText><span className="summary" data-empty>요약을 불러오는 중…</span></PreviewText>
                )}
                <OpenLink href={pathKeys.events.detail(draft.other.id)} target="_blank" rel="noreferrer">
                  상세 새 탭 <FiExternalLink aria-hidden />
                </OpenLink>
              </Picked>

              <Field>
                <FieldLabel>관계</FieldLabel>
                {/* 좁으면 가로로 밀어 본다 — 다섯 칸이 390px에서 '그 밖의 연관'을 잘랐다 */}
                <SegmentScroll>
                  <SegmentControl
                    value={draft.relationType}
                    onChange={(value) => setDraft({ ...draft, relationType: value as EventRelationType })}
                    options={TYPE_OPTIONS}
                    ariaLabel="관계 종류"
                  />
                </SegmentScroll>
                <Hint>{EVENT_RELATION_LABELS[draft.relationType].hint}</Hint>
              </Field>

              {DIRECTED_RELATION_TYPES.has(draft.relationType) && (
                <Field>
                  <FieldLabel>방향</FieldLabel>
                  <SegmentControl
                    value={draft.direction}
                    onChange={(value) => setDraft({ ...draft, direction: value as EventRelationDirection })}
                    options={[
                      {
                        value: 'incoming',
                        label: (
                          <DirectionLabel>
                            상대 <FiArrowRight aria-hidden /> 이 사건
                          </DirectionLabel>
                        ),
                      },
                      {
                        value: 'outgoing',
                        label: (
                          <DirectionLabel>
                            이 사건 <FiArrowRight aria-hidden /> 상대
                          </DirectionLabel>
                        ),
                      },
                    ]}
                    ariaLabel="관계 방향"
                  />
                  {conflict ? (
                    <Hint data-warn role="status">
                      날짜와 반대 방향 — 상대가 이 사건 {relative}{' '}
                      <button
                        type="button"
                        onClick={() => {
                          const inferred = inferDirection(self, draft.other)
                          if (inferred) setDraft({ ...draft, direction: inferred })
                        }}
                      >
                        날짜대로 바꾸기
                      </button>
                    </Hint>
                  ) : (
                    relative && <Hint>날짜로 정했습니다 — 상대가 이 사건 {relative}</Hint>
                  )}
                </Field>
              )}

              <Sentence aria-live="polite">{relationSentence(draft.relationType, draft.direction, eventTitle, draft.other.title)}</Sentence>

              <Field>
                <FieldLabel>이유</FieldLabel>
                <textarea
                  value={draft.description}
                  onChange={(changeEvent) => setDraft({ ...draft, description: changeEvent.target.value })}
                  placeholder="어떻게 이어지는지 한두 문장 (선택) — 지도·목록에서 이 선을 누르면 보입니다"
                  maxLength={REASON_MAX}
                  rows={3}
                  aria-label="연결 이유"
                  onKeyDown={(keyEvent) => {
                    if (keyEvent.key === 'Enter' && (keyEvent.metaKey || keyEvent.ctrlKey) && !saving) {
                      keyEvent.preventDefault()
                      void save(false)
                    }
                  }}
                />
                <Count>
                  {draft.description.length}/{REASON_MAX}
                </Count>
              </Field>

              <Actions>
                {draft.relationId && onDelete && (
                  <button type="button" data-danger onClick={() => void removeExisting()}>
                    연결 끊기
                  </button>
                )}
                <button type="button" onClick={() => setDraft(null)}>
                  다른 사건 고르기
                </button>
                {!draft.relationId && (
                  <button type="button" disabled={saving} onClick={() => void save(true)}>
                    연결하고 계속
                  </button>
                )}
                <button type="button" data-primary disabled={saving} title="⌘/Ctrl+Enter" onClick={() => void save(false)}>
                  {saving ? '저장 중…' : draft.relationId ? '고치기' : '연결'}
                </button>
              </Actions>
            </>
          )}
        </ComposePane>
      </Layout>
      </ModalBody>
    </Modal>
  )
}

const Linked = styled.span`
  font-weight: 700;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const UndoButton = styled.button`
  margin-left: 8px;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-size: inherit;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
`

const PreviewText = styled.span`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 6px;

  .summary {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    font-size: 13px;
    line-height: 1.55;
    color: ${({ theme }) => theme.colors.text.secondary};

    &[data-empty] {
      font-style: italic;
      color: ${metaText};
    }
  }
  .facts {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: ${metaText};

    svg {
      width: 12px;
      height: 12px;
    }
  }
`

const OpenLink = styled.a`
  display: inline-flex;
  align-self: flex-start;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: 12px;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  text-decoration: none;

  svg {
    width: 12px;
    height: 12px;
  }
  &:hover {
    text-decoration: underline;
  }
`

const CreateButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 4px;
  padding: 6px 12px !important;
  border: 1px solid ${({ theme }) => theme.colors.border.default} !important;
  border-radius: 8px;
  text-decoration: none !important;
  color: ${({ theme }) => theme.colors.text.primary} !important;
`

const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  gap: 0;
  height: min(600px, 66vh);

  @media (max-width: 720px) {
    grid-template-columns: minmax(0, 1fr);
    height: min(640px, 76vh);

    /* 한 칸 — 고르면 정하기 화면, 아니면 목록 */
    &[data-picked] > :first-child {
      display: none;
    }
    &:not([data-picked]) > :last-child {
      display: none;
    }
  }
`

const ListPane = styled.section`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  padding: 4px 16px 0 4px;
  border-right: 1px solid ${({ theme }) => theme.colors.border.default};

  @media (max-width: 720px) {
    padding-right: 4px;
    border-right: 0;
  }
`

const SearchBox = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  color: ${metaText};

  input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: none;
    background: transparent;
    font: inherit;
    font-size: 14px;
    color: ${({ theme }) => theme.colors.text.primary};
    box-shadow: none;
  }
  /* 테두리는 칸(label)이 든다 — 입력칸 자체의 전역 포커스 테두리가 한 겹 더 그려졌다 */
  input:focus,
  input:focus-visible {
    outline: none;
    box-shadow: none;
  }
  &:focus-within {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const Filters = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;

  button {
    padding: 3px 10px;
    border: 1px solid ${({ theme }) => theme.colors.border.default};
    border-radius: 999px;
    background: transparent;
    font: inherit;
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text.secondary};
    cursor: pointer;

    &[aria-pressed='true'] {
      border-color: ${({ theme }) => theme.colors.text.primary};
      color: ${({ theme }) => theme.colors.text.primary};
      font-weight: 700;
    }
  }
  label {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-left: auto;
    font-size: 12px;
    color: ${metaText};
    cursor: pointer;
  }
`

const ListScroll = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
`

const Section = styled.section`
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
`

const SectionTitle = styled.h3`
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin: 0;
  padding: 10px 2px 6px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(20,20,20,0.96)' : '#ffffff')};

  span {
    font-weight: 400;
    color: ${metaText};
  }
`

const Row = styled.button`
  display: grid;
  grid-template-columns: 108px minmax(0, 1fr) auto;
  align-items: start;
  gap: 10px;
  width: 100%;
  padding: 8px 8px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.04)')};
  }
  &[aria-pressed='true'] {
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.09)' : 'rgba(15,23,42,0.07)')};
    box-shadow: inset 0 0 0 1px ${({ theme }) => theme.colors.text.primary};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: -2px;
  }

  .date {
    padding-top: 1px;
    white-space: nowrap;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    color: ${metaText};
  }
  .main {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .title {
    font-size: 14px;
    font-weight: 600;
    line-height: 1.35;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .sub {
    font-size: 12px;
    line-height: 1.4;
    color: ${metaText};
  }
  .keywords {
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  @media (max-width: 720px) {
    grid-template-columns: 76px minmax(0, 1fr) auto;
  }
`

const Badge = styled.span`
  align-self: center;
  padding: 2px 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Empty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  margin: 0;
  padding: 24px 4px;
  font-size: 13px;
  color: ${metaText};

  .note {
    font-size: 12px;
  }

  button {
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    text-decoration: underline;
    cursor: pointer;
  }
`

const ComposePane = styled.section`
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
  overflow-y: auto;
  padding: 4px 4px 4px 20px;

  @media (max-width: 720px) {
    padding-left: 4px;
  }
`

const Placeholder = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  height: 100%;
  padding: 24px;
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
  font-size: 13px;
  text-align: center;
  color: ${metaText};

  strong {
    font-size: 14px;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const BackButton = styled.button`
  display: none;
  align-self: flex-start;
  align-items: center;
  gap: 4px;
  padding: 2px 0;
  border: 0;
  background: none;
  font: inherit;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  @media (max-width: 720px) {
    display: inline-flex;
  }
`

const Picked = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-bottom: 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};

  .eyebrow {
    font-size: 11.5px;
    font-weight: 700;
    color: ${metaText};
  }
  strong {
    font-size: 17px;
    line-height: 1.35;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .meta {
    font-size: 12.5px;
    color: ${metaText};
  }
`

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 8px 10px;
    border: 1px solid ${({ theme }) => theme.colors.border.default};
    border-radius: 8px;
    background: transparent;
    font: inherit;
    font-size: 13.5px;
    line-height: 1.5;
    color: ${({ theme }) => theme.colors.text.primary};
    resize: vertical;

    &:focus {
      outline: none;
      border-color: ${({ theme }) => ledgerAccent(theme.mode)};
    }
  }
`

const SegmentScroll = styled.div`
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
  > * {
    width: max-content;
  }
`

const FieldLabel = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${metaText};
`

const Hint = styled.span`
  font-size: 12px;
  line-height: 1.45;
  color: ${metaText};

  &[data-warn] {
    font-weight: 600;
    color: ${({ theme }) => (theme.mode === 'dark' ? '#fbbf24' : '#b45309')};
  }
  button {
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    color: ${({ theme }) => theme.colors.text.primary};
    text-decoration: underline;
    cursor: pointer;
  }
`

const DirectionLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`

/** 저장될 관계를 한 문장으로 — 방향을 잘못 고르는 실수가 고르는 순간 보이게 */
const Sentence = styled.p`
  margin: 0;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.04)')};
`

const Count = styled.span`
  align-self: flex-end;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: ${metaText};
`

/* 바닥에 붙는 버튼 줄 — 미리보기·이유까지 서면 칸이 길어져 '연결'이 창 아래로 잘렸다 */
const Actions = styled.div`
  position: sticky;
  bottom: 0;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  margin-top: auto;
  padding: 10px 0 2px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(20,20,20,0.96)' : '#ffffff')};

  button {
    padding: 7px 14px;
    border: 1px solid ${({ theme }) => theme.colors.border.default};
    border-radius: 8px;
    background: transparent;
    font: inherit;
    font-size: 13px;
    color: ${({ theme }) => theme.colors.text.primary};
    cursor: pointer;

    &[data-primary] {
      border-color: transparent;
      background: ${({ theme }) => ledgerAccent(theme.mode)};
      color: #ffffff;
      font-weight: 700;
    }
    &[data-danger] {
      margin-right: auto;
      color: #dc2626;
    }
    &:disabled {
      opacity: 0.5;
      cursor: default;
    }
  }
`
