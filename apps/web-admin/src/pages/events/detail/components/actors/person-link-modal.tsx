/**
 * 참여 인물 잇기 창 — 연관 탭 `RelatedLinkModal`과 동일한 2단 구조(왼쪽 고르기 · 오른쪽 정하기).
 *
 * - 왼쪽: 이름·원어명·생몰년 검색 + 거르기(전체 · 이 사건 무렵·참여국 · 이은 것 숨기기) + 새 인물 즉석 등록
 *   이미 연결된 인물은 줄 우측 배지로 표시되며, 고르면 '이은 인물 고치기'로 열린다.
 * - 오른쪽: 소속 국가 · 소속 진영 · 맡은 역할 · 행적/비고 + 한 줄 문장 미리보기
 *   '연결' 또는 '연결하고 계속'(창을 닫지 않고 연속 연결 + 마지막 것 되돌리기) 지원.
 */
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiArrowLeft, FiExternalLink, FiPlus, FiSearch } from 'react-icons/fi'

import { getAllPersons, type PersonResponseDto } from '@/shared/api/persons'
import { getUploadImageUrl } from '@/shared/api/upload'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog'
import { Modal, ModalBody } from '@/shared/ui/modal'
import {
  comparePersons,
  contextScore,
  headlineOffice,
  lifeSpanLabel,
  matchesQuery,
  type PersonPickerContext,
  searchHaystack,
} from '@/shared/ui/person-picker/person-picker.lib'
import { PersonPickerCreateForm } from '@/shared/ui/person-picker/person-picker-create-form'

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
  koParticle,
  Layout,
  Linked,
  ListPane,
  ListScroll,
  MoreListButton,
  NewEntityBtn,
  OpenLink,
  Picked,
  Placeholder,
  SearchBox,
  SearchRow,
  Section,
  SectionTitle,
  Sentence,
  UndoButton,
} from './actor-link-modal.styles'
import {
  type EventPersonEntry,
  participationValueOf,
  personNameOf,
} from './actors.lib'
import { type UpsertPersonInput } from './use-actor-mutations'

const SECTION_CAP = 80
const NOTE_MAX = 2000

interface PersonLinkDraft {
  personId: string
  name: string
  originalName: string | null
  lifespan: string | null
  nativeCountry: string | null
  officeLine: string | null
  isExisting: boolean
  participationValue: string
  sideId: string
  role: string
  note: string
}

type PersonFilterKey = 'all' | 'context'

export interface PersonLinkModalProps {
  isOpen: boolean
  onClose: () => void
  eventTitle: string
  existingPersons: EventPersonEntry[]
  context: PersonPickerContext
  participationOptions: Array<{ value: string; label: string }>
  countrySideByValue: Map<string, string | null>
  sideOptions: Array<{ value: string; label: string; color?: string }>
  defaultCountryId?: string
  defaultHistoricalCountryId?: string
  /** 국가·진영 행의 '+ 인물'로 열었을 때 기본으로 채울 소속값 */
  defaultParticipationValue?: string
  defaultSideId?: string | null
  /** 기존 행에서 '참여 바꾸기'로 열었을 때 바로 고칠 인물 id */
  initialPersonId?: string | null
  /** '+ 새 인물 등록'으로 곧장 등록 화면부터 열 때 */
  initialCreateMode?: boolean
  onSave: (input: UpsertPersonInput) => 'added' | 'updated'
  onRemove: (personId: string) => void
}

function parseParticipationValue(rawValue: string): {
  countryId: string | null
  historicalCountryId: string | null
} {
  if (!rawValue || rawValue === 'none') {
    return { countryId: null, historicalCountryId: null }
  }
  const [prefix, entityId] = rawValue.split(':')
  return {
    countryId: prefix === 'c' ? (entityId ?? null) : null,
    historicalCountryId: prefix === 'h' ? (entityId ?? null) : null,
  }
}

export function PersonLinkModal({
  isOpen,
  onClose,
  eventTitle,
  existingPersons,
  context,
  participationOptions,
  countrySideByValue,
  sideOptions,
  defaultCountryId,
  defaultHistoricalCountryId,
  defaultParticipationValue = 'none',
  defaultSideId = null,
  initialPersonId = null,
  initialCreateMode = false,
  onSave,
  onRemove,
}: PersonLinkModalProps) {
  const {
    data: allPersons = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['persons', 'all'],
    queryFn: getAllPersons,
    enabled: isOpen,
    staleTime: 5 * 60_000,
  })

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<PersonFilterKey>('all')
  const [hideLinked, setHideLinked] = useState(false)
  const [showAllRest, setShowAllRest] = useState(false)
  const [createMode, setCreateMode] = useState(initialCreateMode)
  const [draft, setDraft] = useState<PersonLinkDraft | null>(null)
  const [linkedCount, setLinkedCount] = useState(0)
  const [lastLinked, setLastLinked] = useState<{ personId: string; name: string } | null>(null)

  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const roleInputRef = useRef<HTMLInputElement>(null)

  const existingById = useMemo(
    () => new Map(existingPersons.map((entry) => [entry.personId, entry])),
    [existingPersons],
  )

  const buildDraftForPerson = (
    person: PersonResponseDto | null,
    existingEntry: EventPersonEntry | undefined,
    fallbackId?: string,
  ): PersonLinkDraft | null => {
    const resolvedId = person?.id ?? existingEntry?.personId ?? fallbackId
    if (!resolvedId) return null
    const name = person
      ? getPersonDisplayName(person)
      : existingEntry
        ? personNameOf(existingEntry)
        : '인물'
    const lifespan = person ? lifeSpanLabel(person) || null : null
    const nativeCountry = person?.country?.name ?? null
    const eventOffices = existingEntry?.officesAtEvent?.length
      ? `당시 ${existingEntry.officesAtEvent.join(' · ')}`
      : null
    const officeLine = eventOffices ?? (person ? headlineOffice(person) || null : null)

    if (existingEntry) {
      return {
        personId: resolvedId,
        name,
        originalName: person?.originalName ?? null,
        lifespan,
        nativeCountry,
        officeLine,
        isExisting: true,
        participationValue: participationValueOf(existingEntry) || 'none',
        sideId: existingEntry.sideId ?? 'none',
        role: existingEntry.role ?? '',
        note: existingEntry.note ?? '',
      }
    }

    let inferredPart = defaultParticipationValue || 'none'
    if (inferredPart === 'none' && person) {
      const candidateModern = person.countryId ? `c:${person.countryId}` : null
      if (
        candidateModern &&
        participationOptions.some((option) => option.value === candidateModern)
      ) {
        inferredPart = candidateModern
      }
    }

    /*
     * 진영은 소속국에서 **복사하지 않는다** — 비워 두면 소속국 진영을 따른다(actors.lib effectivePersonSide).
     * 예전엔 소속국 진영을 인물 칸에 적어 넣어, 나중에 나라를 다른 진영으로 옮겨도 인물이 따라가지 않았다.
     * 진영 묶음·진영 카드에서 열었으면 그 진영이 기본값이다(소속국 진영과 같으면 저장 때 따름으로 접힌다).
     */
    const inferredSide = defaultSideId ?? 'none'

    return {
      personId: resolvedId,
      name,
      originalName: person?.originalName ?? null,
      lifespan,
      nativeCountry,
      officeLine,
      isExisting: false,
      participationValue: inferredPart,
      sideId: inferredSide || 'none',
      role: '',
      note: '',
    }
  }

  useEffect(() => {
    if (!isOpen) return
    setQuery('')
    setFilter('all')
    setHideLinked(false)
    setShowAllRest(false)
    setCreateMode(Boolean(initialCreateMode))
    setLinkedCount(0)
    setLastLinked(null)

    if (initialPersonId) {
      const matchedPerson = allPersons.find((person) => person.id === initialPersonId) ?? null
      const matchedExisting = existingById.get(initialPersonId)
      setDraft(buildDraftForPerson(matchedPerson, matchedExisting, initialPersonId))
    } else {
      setDraft(null)
    }
  }, [isOpen, initialPersonId, initialCreateMode])

  useEffect(() => {
    if (!isOpen || !initialPersonId || allPersons.length === 0) return
    setDraft((previous) => {
      if (!previous || previous.personId !== initialPersonId || previous.lifespan) {
        return previous
      }
      const matchedPerson = allPersons.find((person) => person.id === initialPersonId) ?? null
      if (!matchedPerson) return previous
      return {
        ...previous,
        originalName: matchedPerson.originalName ?? null,
        lifespan: lifeSpanLabel(matchedPerson) || null,
        nativeCountry: matchedPerson.country?.name ?? null,
        officeLine: previous.officeLine ?? (headlineOffice(matchedPerson) || null),
      }
    })
  }, [isOpen, initialPersonId, allPersons])

  const haystacks = useMemo(
    () => new Map(allPersons.map((person) => [person.id, searchHaystack(person)])),
    [allPersons],
  )

  const contextualIds = useMemo(() => {
    const matched = new Set<string>()
    for (const person of allPersons) {
      if (contextScore(person, context) > 0) matched.add(person.id)
    }
    return matched
  }, [allPersons, context])

  const filteredPersons = useMemo(() => {
    const trimmed = query.trim()
    return allPersons
      .filter((person) => {
        if (hideLinked && existingById.has(person.id)) return false
        if (filter === 'context' && !contextualIds.has(person.id)) return false
        if (trimmed && !matchesQuery(haystacks.get(person.id) ?? '', trimmed)) return false
        return true
      })
      .sort(comparePersons('relevance', context))
  }, [allPersons, query, hideLinked, filter, contextualIds, haystacks, existingById, context])

  const sections = useMemo(() => {
    const trimmed = query.trim()
    if (trimmed || filter === 'context') {
      return [
        {
          key: 'results',
          title: trimmed ? '검색 결과' : (context.label ?? '관련 인물'),
          items: showAllRest ? filteredPersons : filteredPersons.slice(0, SECTION_CAP * 2),
          total: filteredPersons.length,
        },
      ].filter((section) => section.total > 0)
    }

    const relevant = filteredPersons.filter((person) => contextualIds.has(person.id))
    const rest = filteredPersons.filter((person) => !contextualIds.has(person.id))
    return [
      {
        key: 'relevant',
        title: context.label ?? '이 사건 무렵 · 참여국 인물',
        items: relevant.slice(0, SECTION_CAP),
        total: relevant.length,
      },
      {
        key: 'rest',
        title: '그 밖의 인물',
        items: showAllRest ? rest : rest.slice(0, SECTION_CAP),
        total: rest.length,
      },
    ].filter((section) => section.total > 0)
  }, [query, filter, filteredPersons, contextualIds, context.label, showAllRest])

  const choose = (person: PersonResponseDto) => {
    setCreateMode(false)
    const nextDraft = buildDraftForPerson(person, existingById.get(person.id))
    setDraft(nextDraft)
    requestAnimationFrame(() => roleInputRef.current?.focus({ preventScroll: true }))
  }

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

  const save = (keepOpen: boolean) => {
    if (!draft) return
    const { countryId, historicalCountryId } = parseParticipationValue(draft.participationValue)
    const outcome = onSave({
      personId: draft.personId,
      personName: draft.name,
      role: draft.role,
      note: draft.note,
      countryId,
      historicalCountryId,
      sideId: draft.sideId === 'none' ? null : draft.sideId,
    })

    if (keepOpen) {
      setLinkedCount((count) => count + 1)
      if (outcome === 'added') {
        setLastLinked({ personId: draft.personId, name: draft.name })
      }
      setDraft(null)
      requestAnimationFrame(() => searchRef.current?.focus())
    } else {
      onClose()
    }
  }

  const removeExisting = async () => {
    if (!draft?.isExisting) return
    const ok = await confirm({
      title: '참여 인물 연결을 끊을까요?',
      message: `‘${draft.name}’${koParticle(draft.name, '과/와')} 이 사건의 연결을 해제합니다. 인물 정보 자체는 그대로 남습니다.`,
      confirmLabel: '끊기',
      danger: true,
    })
    if (!ok) return
    onRemove(draft.personId)
    setDraft(null)
  }

  const undoLast = () => {
    if (!lastLinked) return
    onRemove(lastLinked.personId)
    setLinkedCount((count) => Math.max(0, count - 1))
    setLastLinked(null)
  }

  const selectedCountryLabel = useMemo(() => {
    if (!draft || draft.participationValue === 'none') return null
    const found = participationOptions.find((option) => option.value === draft.participationValue)
    return found?.label ?? null
  }, [draft, participationOptions])

  /** 고른 소속국의 진영 이름 — 진영을 비워 두면 이 진영을 따른다 */
  const countrySideLabel = useMemo(() => {
    if (!draft || draft.participationValue === 'none') return null
    const countrySideId = countrySideByValue.get(draft.participationValue) ?? null
    if (!countrySideId) return null
    return sideOptions.find((option) => option.value === countrySideId)?.label ?? null
  }, [draft, countrySideByValue, sideOptions])

  const selectedSideLabel = useMemo(() => {
    if (!draft) return null
    if (draft.sideId === 'none') return countrySideLabel
    const found = sideOptions.find((option) => option.value === draft.sideId)
    return found?.label ?? null
  }, [draft, sideOptions, countrySideLabel])

  const previewSentence = useMemo(() => {
    if (!draft) return ''
    const qualifiers = [
      selectedCountryLabel ? `${selectedCountryLabel} 소속` : null,
      selectedSideLabel,
    ].filter(Boolean)
    const qualText = qualifiers.length > 0 ? `(${qualifiers.join(' · ')})` : ''
    const roleText = draft.role.trim()
      ? `‘${draft.role.trim()}’ 역할로`
      : '참여 인물로'
    return `‘${draft.name}’${qualText}${koParticle(draft.name, '을/를')} ‘${eventTitle}’에 ${roleText} ${
      draft.isExisting ? '고칩니다' : '잇습니다'
    }.`
  }, [draft, selectedCountryLabel, selectedSideLabel, eventTitle])

  const linkedTotal = existingById.size
  const contextualTotal = contextualIds.size
  const hasRightPaneContent = Boolean(draft) || createMode

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="참여 인물 잇기"
      subtitle={
        <>
          ‘{eventTitle}’에 나선 인물 — 고르고, 소속 국가·역할·행적을 정합니다
          {linkedCount > 0 && <Linked> · 이번에 {linkedCount}건 이음</Linked>}
          {lastLinked && (
            <UndoButton
              type="button"
              onClick={undoLast}
              title={`‘${lastLinked.name}’ 연결 되돌리기`}
            >
              마지막 것 되돌리기
            </UndoButton>
          )}
        </>
      }
      maxWidth="min(1040px, 96vw)"
      initialFocusRef={initialPersonId || initialCreateMode ? undefined : searchRef}
    >
      <ModalBody>
        <Layout
          data-picked={hasRightPaneContent ? '' : undefined}
          onKeyDownCapture={(keyEvent) => {
            if (keyEvent.key !== 'Escape' || !hasRightPaneContent || keyEvent.defaultPrevented) {
              return
            }
            keyEvent.preventDefault()
            keyEvent.stopPropagation()
            if (createMode) {
              setCreateMode(false)
              requestAnimationFrame(() => searchRef.current?.focus())
              return
            }
            const previousId = draft?.personId
            setDraft(null)
            requestAnimationFrame(() =>
              rowButtons().find((row) => row.dataset.row === previousId)?.focus(),
            )
          }}
        >
          <ListPane aria-label="인물 고르기">
            <SearchRow>
              <SearchBox>
                <FiSearch aria-hidden />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  placeholder="이름 · 원어 이름 · 생몰년으로 찾기"
                  aria-label="인물 검색"
                  onChange={(changeEvent) => {
                    setQuery(changeEvent.target.value)
                    setShowAllRest(false)
                  }}
                  onKeyDown={moveFocus}
                />
              </SearchBox>
              <NewEntityBtn
                type="button"
                onClick={() => {
                  setDraft(null)
                  setCreateMode(true)
                }}
                title="목록에 없는 새 인물을 바로 등록합니다"
              >
                <FiPlus size={13} aria-hidden />새 인물
              </NewEntityBtn>
            </SearchRow>

            <Filters role="group" aria-label="거르기">
              <button
                type="button"
                aria-pressed={filter === 'all'}
                onClick={() => setFilter('all')}
              >
                전체
              </button>
              {contextualTotal > 0 && (
                <button
                  type="button"
                  aria-pressed={filter === 'context'}
                  onClick={() => setFilter('context')}
                >
                  이 사건 무렵 · 참여국 {contextualTotal}
                </button>
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

            <ListScroll ref={listRef} onKeyDown={moveFocus}>
              {isError ? (
                <Empty>
                  인물 목록을 불러오지 못했습니다.{' '}
                  <button type="button" onClick={() => void refetch()}>
                    다시 시도
                  </button>
                </Empty>
              ) : isLoading ? (
                <Empty>인물 목록을 불러오는 중…</Empty>
              ) : sections.length === 0 ? (
                <Empty>
                  {query.trim()
                    ? `‘${query.trim()}’에 맞는 인물이 없습니다.`
                    : '고를 인물이 없습니다.'}
                  <CreateButton
                    type="button"
                    onClick={() => {
                      setDraft(null)
                      setCreateMode(true)
                    }}
                  >
                    <FiPlus aria-hidden />
                    {query.trim() ? `‘${query.trim()}’ 새 인물로 등록` : '새 인물 등록'}
                  </CreateButton>
                </Empty>
              ) : (
                sections.map((section) => (
                  <Section key={section.key} aria-label={section.title}>
                    <SectionTitle>
                      {section.title}
                      <span>{section.total.toLocaleString('ko-KR')}</span>
                    </SectionTitle>
                    <ul>
                      {section.items.map((person) => {
                        const displayName = getPersonDisplayName(person)
                        const selected = draft?.personId === person.id && !createMode
                        const existing = existingById.get(person.id)
                        const image = person.profileImageUrl
                          ? getUploadImageUrl(person.profileImageUrl) || person.profileImageUrl
                          : null
                        const subText = [
                          lifeSpanLabel(person),
                          person.country?.name,
                          headlineOffice(person),
                        ]
                          .filter(Boolean)
                          .join(' · ')
                        const badgeText = existing
                          ? existing.role?.trim() ||
                            existing.participationCountryName ||
                            '연결됨'
                          : null

                        return (
                          <li key={person.id}>
                            <CandidateRow
                              type="button"
                              data-row={person.id}
                              aria-pressed={selected}
                              onClick={() => choose(person)}
                            >
                              <CandidateThumb $hasImg={Boolean(image)} aria-hidden>
                                {image ? (
                                  <img src={image} alt="" loading="lazy" />
                                ) : (
                                  displayName.charAt(0)
                                )}
                              </CandidateThumb>
                              <span className="main">
                                <span className="title">
                                  <span>{displayName}</span>
                                  {person.originalName && (
                                    <span className="title-sub">{person.originalName}</span>
                                  )}
                                </span>
                                {subText && <span className="sub">{subText}</span>}
                              </span>
                              {badgeText && (
                                <Badge title="이미 이은 인물 — 고르면 참여 내용을 고칩니다">
                                  {badgeText}
                                </Badge>
                              )}
                            </CandidateRow>
                          </li>
                        )
                      })}
                    </ul>
                    {section.total > section.items.length && (
                      <MoreListButton type="button" onClick={() => setShowAllRest(true)}>
                        나머지 {(section.total - section.items.length).toLocaleString('ko-KR')}명 더 보기
                      </MoreListButton>
                    )}
                  </Section>
                ))
              )}
            </ListScroll>
          </ListPane>

          <ComposePane aria-label="참여 내용 정하기">
            {createMode ? (
              <>
                <BackButton type="button" onClick={() => setCreateMode(false)}>
                  <FiArrowLeft aria-hidden /> 목록
                </BackButton>
                <Picked>
                  <span className="eyebrow">목록에 없는 인물 즉석 등록</span>
                  <strong>새 인물 등록 후 바로 잇기</strong>
                  <span className="meta">
                    등록하면 이 창에서 곧바로 역할·소속 국가를 정해 사건과 잇습니다.
                  </span>
                </Picked>
                <PersonPickerCreateForm
                  initialName={query.trim()}
                  defaultCountryId={defaultCountryId}
                  defaultHistoricalCountryId={defaultHistoricalCountryId}
                  onCancel={() => setCreateMode(false)}
                  onCreated={(createdPerson) => {
                    setCreateMode(false)
                    const nextDraft = buildDraftForPerson(createdPerson, undefined)
                    setDraft(nextDraft)
                    requestAnimationFrame(() =>
                      roleInputRef.current?.focus({ preventScroll: true }),
                    )
                  }}
                />
              </>
            ) : !draft ? (
              <Placeholder>
                <strong>왼쪽에서 인물을 고르세요</strong>
                <span>
                  소속 국가·진영과 이 사건에서 맡은 역할·행적을 한 번에 적어 잇습니다. 찾는 인물이 없으면 상단 ‘+ 새 인물’로 바로 등록할 수 있습니다.
                </span>
              </Placeholder>
            ) : (
              <>
                <BackButton type="button" onClick={() => setDraft(null)}>
                  <FiArrowLeft aria-hidden /> 목록
                </BackButton>

                <Picked>
                  <span className="eyebrow">
                    {draft.isExisting ? '이은 인물 고치기' : '이을 인물'}
                  </span>
                  <strong>{draft.name}</strong>
                  {(draft.lifespan || draft.nativeCountry || draft.officeLine) && (
                    <span className="meta">
                      {[draft.lifespan, draft.nativeCountry, draft.officeLine]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  )}
                  <OpenLink
                    href={pathKeys.personsTimelineDetail(draft.personId)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    상세 새 탭 <FiExternalLink aria-hidden />
                  </OpenLink>
                </Picked>

                {participationOptions.length > 1 && (
                  <Field>
                    <FieldLabel>참여 소속 국가</FieldLabel>
                    <ChoicePillRow role="radiogroup" aria-label="참여 소속 국가">
                      {participationOptions.map((option) => {
                        const selected = draft.participationValue === option.value
                        return (
                          <ChoicePill
                            key={option.value}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            $selected={selected}
                            onClick={() => setDraft({ ...draft, participationValue: option.value })}
                          >
                            {option.value === 'none' ? '단독 (소속국 없음)' : option.label}
                          </ChoicePill>
                        )
                      })}
                    </ChoicePillRow>
                  </Field>
                )}

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
                            {option.value === 'none'
                              ? countrySideLabel
                                ? `소속국 따름 (${countrySideLabel})`
                                : '진영 미지정'
                              : option.label}
                          </ChoicePill>
                        )
                      })}
                    </ChoicePillRow>
                  </Field>
                )}

                <Field>
                  <FieldLabel>역할 (무엇을 했나)</FieldLabel>
                  <input
                    ref={roleInputRef}
                    type="text"
                    value={draft.role}
                    maxLength={100}
                    placeholder="예: 협상 수석대표, 제3군 사령관, 조약 서명 (선택)"
                    aria-label="사건 내 역할"
                    onChange={(changeEvent) =>
                      setDraft({ ...draft, role: changeEvent.target.value })
                    }
                    onKeyDown={(keyEvent) => {
                      if (keyEvent.key === 'Enter' && (keyEvent.metaKey || keyEvent.ctrlKey)) {
                        keyEvent.preventDefault()
                        save(false)
                      }
                    }}
                  />
                </Field>

                <Sentence aria-live="polite">{previewSentence}</Sentence>

                <Field>
                  <FieldLabel>주요 행적 · 비고</FieldLabel>
                  <textarea
                    value={draft.note}
                    onChange={(changeEvent) =>
                      setDraft({ ...draft, note: changeEvent.target.value })
                    }
                    placeholder="구체적 행적 · 근거 · 설명 (선택, *강조*는 굵게 표시)"
                    maxLength={NOTE_MAX}
                    rows={3}
                    aria-label="주요 행적 및 비고"
                    onKeyDown={(keyEvent) => {
                      if (keyEvent.key === 'Enter' && (keyEvent.metaKey || keyEvent.ctrlKey)) {
                        keyEvent.preventDefault()
                        save(false)
                      }
                    }}
                  />
                  <Count>
                    {draft.note.length}/{NOTE_MAX}
                  </Count>
                </Field>

                <Actions>
                  {draft.isExisting && (
                    <button type="button" data-danger onClick={() => void removeExisting()}>
                      연결 끊기
                    </button>
                  )}
                  <button type="button" onClick={() => setDraft(null)}>
                    다른 인물 고르기
                  </button>
                  {!draft.isExisting && (
                    <button type="button" onClick={() => save(true)}>
                      연결하고 계속
                    </button>
                  )}
                  <button type="button" data-primary title="⌘/Ctrl+Enter" onClick={() => save(false)}>
                    {draft.isExisting ? '고치기' : '연결'}
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
