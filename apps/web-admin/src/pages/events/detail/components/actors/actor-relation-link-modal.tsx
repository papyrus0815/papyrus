/**
 * 기관·사령부 / 정당 / 국제기구·조직 / 기업 공용 2단 잇기 창.
 *
 * 연관 탭 `RelatedLinkModal`과 동일한 2단 구조:
 * - 왼쪽: 검색 + 분류 거르기 + '이은 것 숨기기' + 후보 목록(이미 이은 항목은 우측 배지) + 새로 등록 버튼
 * - 오른쪽: 고른 대상 요약 + 역할(`SegmentControl` + 뜻풀이) + 소속 진영 + 역할 설명 + 문장 미리보기
 *   + '연결 끊기' · '다른 항목 고르기' · '연결하고 계속' · '연결'/'고치기'
 */
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'

import { FiArrowLeft, FiExternalLink, FiPlus, FiSearch } from 'react-icons/fi'

import { confirm } from '@/shared/ui/confirm-dialog'
import { Modal, ModalBody } from '@/shared/ui/modal'
import { SegmentControl } from '@/shared/ui/segment-control/segment-control'

import {
  Actions,
  BackButton,
  Badge,
  CandidateRow,
  CandidateThumb,
  ChoicePill,
  ChoicePillRow,
  ComposePane,
  Count,
  CreateButton,
  Empty,
  Field,
  FieldLabel,
  Filters,
  Hint,
  koParticle,
  Layout,
  Linked,
  ListPane,
  ListScroll,
  NewEntityBtn,
  OpenLink,
  Picked,
  Placeholder,
  SearchBox,
  SearchRow,
  Section,
  SectionTitle,
  SegmentScroll,
  Sentence,
  UndoButton,
} from './actor-link-modal.styles'

export interface RelationCandidateItem {
  key: string
  name: string
  shortName?: string | null
  metaText?: string | null
  logoUrl?: string | null
  monogram?: string
  category?: string
  detailHref?: string | null
  existing?: {
    relationId: string
    role: string
    sideId?: string | null
    roleDescription?: string | null
  }
}

export interface RelationRoleOption {
  value: string
  label: string
  hint?: string
}

export interface ActorRelationDraft {
  relationId?: string
  candidateKey: string
  name: string
  metaText?: string | null
  detailHref?: string | null
  role: string
  sideId: string
  roleDescription: string
}

export interface ActorRelationLinkModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  nounLabel: string
  eventTitle: string
  searchPlaceholder: string
  candidates: RelationCandidateItem[]
  categories?: Array<{ key: string; label: string }>
  roleOptions: RelationRoleOption[]
  defaultRole: string
  sideOptions?: Array<{ value: string; label: string; color?: string }>
  loading?: boolean
  failed?: boolean
  saving?: boolean
  onRetry?: () => void
  initialDraft?: ActorRelationDraft | null
  createLabel?: string
  onCreateNew?: () => void
  onSave: (draft: ActorRelationDraft) => Promise<string | undefined>
  onDelete?: (relationId: string) => Promise<void>
}

const DESC_MAX = 1500

function foldSearchText(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function ActorRelationLinkModal({
  isOpen,
  onClose,
  title,
  nounLabel,
  eventTitle,
  searchPlaceholder,
  candidates,
  categories,
  roleOptions,
  defaultRole,
  sideOptions = [],
  loading = false,
  failed = false,
  saving = false,
  onRetry,
  initialDraft = null,
  createLabel,
  onCreateNew,
  onSave,
  onDelete,
}: ActorRelationLinkModalProps) {
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [hideLinked, setHideLinked] = useState(false)
  const [draft, setDraft] = useState<ActorRelationDraft | null>(initialDraft)
  const [linkedCount, setLinkedCount] = useState(0)
  const [lastLinked, setLastLinked] = useState<{ relationId: string; name: string } | null>(null)

  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<HTMLDivElement>(null)

  const roleMap = useMemo(
    () => new Map(roleOptions.map((option) => [option.value, option])),
    [roleOptions],
  )

  useEffect(() => {
    if (!isOpen) return
    setDraft(initialDraft)
    setQuery('')
    setCategoryFilter('all')
    setHideLinked(false)
    setLinkedCount(0)
    setLastLinked(null)
  }, [isOpen, initialDraft])

  const choose = (candidate: RelationCandidateItem) => {
    if (candidate.existing) {
      setDraft({
        relationId: candidate.existing.relationId,
        candidateKey: candidate.key,
        name: candidate.name,
        metaText: candidate.metaText ?? null,
        detailHref: candidate.detailHref ?? null,
        role: candidate.existing.role,
        sideId: candidate.existing.sideId ?? 'none',
        roleDescription: candidate.existing.roleDescription ?? '',
      })
    } else {
      setDraft({
        candidateKey: candidate.key,
        name: candidate.name,
        metaText: candidate.metaText ?? null,
        detailHref: candidate.detailHref ?? null,
        role: defaultRole,
        sideId: 'none',
        roleDescription: '',
      })
    }
    requestAnimationFrame(() =>
      composerRef.current
        ?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]')
        ?.focus({ preventScroll: true }),
    )
  }

  const visibleCandidates = useMemo(() => {
    const folded = query.trim() ? foldSearchText(query.trim()) : ''
    return candidates.filter((candidate) => {
      if (hideLinked && candidate.existing) return false
      if (categoryFilter !== 'all' && candidate.category !== categoryFilter) return false
      if (!folded) return true
      const haystack = [candidate.name, candidate.shortName, candidate.metaText]
        .filter(Boolean)
        .join(' ')
      return foldSearchText(haystack).includes(folded)
    })
  }, [candidates, query, hideLinked, categoryFilter])

  const linkedTotal = useMemo(
    () => candidates.filter((candidate) => Boolean(candidate.existing)).length,
    [candidates],
  )

  const rowButtons = () => [
    ...(listRef.current?.querySelectorAll<HTMLButtonElement>('button[data-row]') ?? []),
  ]

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

  const save = async (keepOpen: boolean) => {
    if (!draft || saving) return
    let savedId: string | undefined
    try {
      savedId = await onSave(draft)
    } catch {
      return
    }
    if (keepOpen) {
      setLinkedCount((count) => count + 1)
      setLastLinked(
        savedId && !draft.relationId ? { relationId: savedId, name: draft.name } : null,
      )
      setDraft(null)
      requestAnimationFrame(() => searchRef.current?.focus())
    } else {
      onClose()
    }
  }

  const removeExisting = async () => {
    if (!draft?.relationId || !onDelete) return
    const ok = await confirm({
      title: '이 연결을 끊을까요?',
      message: `‘${draft.name}’${koParticle(draft.name, '과/와')} 이 사건의 연결만 해제합니다. 정본 데이터는 그대로 남습니다.`,
      confirmLabel: '끊기',
      danger: true,
    })
    if (!ok) return
    try {
      await onDelete(draft.relationId)
      setDraft(null)
    } catch {
      /* 호출부 토스트가 안내 */
    }
  }

  const undoLast = async () => {
    if (!lastLinked || !onDelete) return
    try {
      await onDelete(lastLinked.relationId)
      setLinkedCount((count) => Math.max(0, count - 1))
      setLastLinked(null)
    } catch {
      /* 호출부 토스트가 안내 */
    }
  }

  const selectedSideLabel = useMemo(() => {
    if (!draft || draft.sideId === 'none') return null
    return sideOptions.find((option) => option.value === draft.sideId)?.label ?? null
  }, [draft, sideOptions])

  const previewSentence = useMemo(() => {
    if (!draft) return ''
    const roleLabel = roleMap.get(draft.role)?.label ?? draft.role
    const sideText = selectedSideLabel ? `(${selectedSideLabel})` : ''
    return `‘${draft.name}’${sideText}${koParticle(draft.name, '을/를')} ‘${eventTitle}’에 ‘${roleLabel}’ 역할로 ${
      draft.relationId ? '고칩니다' : '잇습니다'
    }.`
  }, [draft, roleMap, selectedSideLabel, eventTitle])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={
        <>
          ‘{eventTitle}’에 관여한 {nounLabel} — 고르고, 역할을 정합니다
          {linkedCount > 0 && <Linked> · 이번에 {linkedCount}건 이음</Linked>}
          {lastLinked && onDelete && (
            <UndoButton
              type="button"
              onClick={() => void undoLast()}
              title={`‘${lastLinked.name}’ 연결 되돌리기`}
            >
              마지막 것 되돌리기
            </UndoButton>
          )}
        </>
      }
      maxWidth="min(1040px, 96vw)"
      initialFocusRef={initialDraft ? undefined : searchRef}
    >
      <ModalBody>
        <Layout
          data-picked={draft ? '' : undefined}
          onKeyDownCapture={(keyEvent) => {
            if (keyEvent.key !== 'Escape' || !draft || keyEvent.defaultPrevented) return
            keyEvent.preventDefault()
            keyEvent.stopPropagation()
            const previousKey = draft.candidateKey
            setDraft(null)
            requestAnimationFrame(() =>
              rowButtons().find((row) => row.dataset.row === previousKey)?.focus(),
            )
          }}
        >
          <ListPane aria-label={`${nounLabel} 고르기`}>
            <SearchRow>
              <SearchBox>
                <FiSearch aria-hidden />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  onChange={(changeEvent) => setQuery(changeEvent.target.value)}
                  onKeyDown={moveFocus}
                />
              </SearchBox>
              {onCreateNew && createLabel && (
                <NewEntityBtn type="button" onClick={onCreateNew}>
                  <FiPlus size={13} aria-hidden />
                  {createLabel}
                </NewEntityBtn>
              )}
            </SearchRow>

            {((categories && categories.length > 0) || linkedTotal > 0) && (
              <Filters role="group" aria-label="거르기">
                {categories && categories.length > 0 && (
                  <>
                    <button
                      type="button"
                      aria-pressed={categoryFilter === 'all'}
                      onClick={() => setCategoryFilter('all')}
                    >
                      전체
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat.key}
                        type="button"
                        aria-pressed={categoryFilter === cat.key}
                        onClick={() => setCategoryFilter(cat.key)}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </>
                )}
                {linkedTotal > 0 && (
                  <label>
                    <input
                      type="checkbox"
                      checked={hideLinked}
                      onChange={(changeEvent) => setHideLinked(changeEvent.target.checked)}
                    />
                    이은 것 숨기기 {linkedTotal}
                  </label>
                )}
              </Filters>
            )}

            <ListScroll ref={listRef} onKeyDown={moveFocus}>
              {failed ? (
                <Empty>
                  후보를 불러오지 못했습니다.{' '}
                  {onRetry && (
                    <button type="button" onClick={onRetry}>
                      다시 시도
                    </button>
                  )}
                </Empty>
              ) : loading ? (
                <Empty>후보를 불러오는 중…</Empty>
              ) : visibleCandidates.length === 0 ? (
                <Empty>
                  {query.trim()
                    ? `‘${query.trim()}’에 맞는 ${nounLabel}이(가) 없습니다.`
                    : `고를 수 있는 ${nounLabel}이(가) 없습니다.`}
                  {onCreateNew && createLabel && (
                    <CreateButton type="button" onClick={onCreateNew}>
                      <FiPlus aria-hidden /> {createLabel}
                    </CreateButton>
                  )}
                </Empty>
              ) : (
                <Section aria-label={`${nounLabel} 후보`}>
                  <SectionTitle>
                    {query.trim() ? '검색 결과' : `${nounLabel} 목록`}
                    <span>{visibleCandidates.length}</span>
                  </SectionTitle>
                  <ul>
                    {visibleCandidates.map((candidate) => {
                      const selected = draft?.candidateKey === candidate.key
                      const existingRoleLabel = candidate.existing
                        ? (roleMap.get(candidate.existing.role)?.label ?? candidate.existing.role)
                        : null
                      return (
                        <li key={candidate.key}>
                          <CandidateRow
                            type="button"
                            data-row={candidate.key}
                            aria-pressed={selected}
                            onClick={() => choose(candidate)}
                          >
                            <CandidateThumb $hasImg={Boolean(candidate.logoUrl)} aria-hidden>
                              {candidate.logoUrl ? (
                                <img src={candidate.logoUrl} alt="" loading="lazy" />
                              ) : (
                                candidate.monogram || candidate.name.charAt(0)
                              )}
                            </CandidateThumb>
                            <span className="main">
                              <span className="title">
                                <span>{candidate.name}</span>
                                {candidate.shortName && (
                                  <span className="title-sub">{candidate.shortName}</span>
                                )}
                              </span>
                              {candidate.metaText && (
                                <span className="sub">{candidate.metaText}</span>
                              )}
                            </span>
                            {existingRoleLabel && (
                              <Badge title="이미 이은 항목 — 고르면 역할을 고칩니다">
                                {existingRoleLabel}
                              </Badge>
                            )}
                          </CandidateRow>
                        </li>
                      )
                    })}
                  </ul>
                </Section>
              )}
            </ListScroll>
          </ListPane>

          <ComposePane ref={composerRef} aria-label="역할 정하기">
            {!draft ? (
              <Placeholder>
                <strong>왼쪽에서 {nounLabel}을(를) 고르세요</strong>
                <span>이 사건에서 맡은 역할과 설명을 정해 바로 잇습니다.</span>
              </Placeholder>
            ) : (
              <>
                <BackButton type="button" onClick={() => setDraft(null)}>
                  <FiArrowLeft aria-hidden /> 목록
                </BackButton>

                <Picked>
                  <span className="eyebrow">
                    {draft.relationId ? `이은 ${nounLabel} 고치기` : `이을 ${nounLabel}`}
                  </span>
                  <strong>{draft.name}</strong>
                  {draft.metaText && <span className="meta">{draft.metaText}</span>}
                  {draft.detailHref && (
                    <OpenLink href={draft.detailHref} target="_blank" rel="noreferrer">
                      상세 새 탭 <FiExternalLink aria-hidden />
                    </OpenLink>
                  )}
                </Picked>

                <Field>
                  <FieldLabel>역할</FieldLabel>
                  <SegmentScroll>
                    <SegmentControl
                      value={draft.role}
                      onChange={(value) => setDraft({ ...draft, role: value })}
                      options={roleOptions.map((option) => ({
                        value: option.value,
                        label: option.label,
                      }))}
                      ariaLabel="역할 종류"
                    />
                  </SegmentScroll>
                  {roleMap.get(draft.role)?.hint && (
                    <Hint>{roleMap.get(draft.role)?.hint}</Hint>
                  )}
                </Field>

                {sideOptions.length > 1 && (
                  <Field>
                    <FieldLabel>소속 진영</FieldLabel>
                    <ChoicePillRow role="radiogroup" aria-label="소속 진영">
                      {sideOptions.map((option) => {
                        const selected = draft.sideId === option.value
                        return (
                          <ChoicePill
                            key={option.value}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            $selected={selected}
                            $dotColor={option.color}
                            onClick={() => setDraft({ ...draft, sideId: option.value })}
                          >
                            {option.color && <span className="dot" aria-hidden />}
                            {option.value === 'none' ? '진영 미지정' : option.label}
                          </ChoicePill>
                        )
                      })}
                    </ChoicePillRow>
                  </Field>
                )}

                <Sentence aria-live="polite">{previewSentence}</Sentence>

                <Field>
                  <FieldLabel>역할 설명</FieldLabel>
                  <textarea
                    value={draft.roleDescription}
                    onChange={(changeEvent) =>
                      setDraft({ ...draft, roleDescription: changeEvent.target.value })
                    }
                    placeholder="이 사건에서 수행한 구체적인 역할·입장·결과를 한두 문장으로 적어 주세요 (선택)"
                    maxLength={DESC_MAX}
                    rows={3}
                    aria-label="역할 설명"
                    onKeyDown={(keyEvent) => {
                      if (
                        keyEvent.key === 'Enter' &&
                        (keyEvent.metaKey || keyEvent.ctrlKey) &&
                        !saving
                      ) {
                        keyEvent.preventDefault()
                        void save(false)
                      }
                    }}
                  />
                  <Count>
                    {draft.roleDescription.length}/{DESC_MAX}
                  </Count>
                </Field>

                <Actions>
                  {draft.relationId && onDelete && (
                    <button type="button" data-danger onClick={() => void removeExisting()}>
                      연결 끊기
                    </button>
                  )}
                  <button type="button" onClick={() => setDraft(null)}>
                    다른 항목 고르기
                  </button>
                  {!draft.relationId && (
                    <button type="button" disabled={saving} onClick={() => void save(true)}>
                      연결하고 계속
                    </button>
                  )}
                  <button
                    type="button"
                    data-primary
                    disabled={saving}
                    title="⌘/Ctrl+Enter"
                    onClick={() => void save(false)}
                  >
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
