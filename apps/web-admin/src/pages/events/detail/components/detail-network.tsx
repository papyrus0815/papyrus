import { useEffect, useMemo, useRef, useState } from 'react'

import { FiPlus, FiX } from 'react-icons/fi'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import {
  ledgerHairlineStrong,
  resolveCategory,
} from '@/pages/events/ledger/styles/ledger-tokens'
import {
  type EventLinkCandidate,
  type UpdateEventDto,
  getEventLinkCandidates,
} from '@/shared/api/events'
import { formatDateRange } from '@/pages/events/utils/events.utils'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog'
import { SelectModal, type SelectOption } from '@/shared/ui/select-modal/select-modal'

import * as S from '../styles'
import { type EventDetail, usePrefetchEventDetail } from '../use-event-detail'

interface DetailNetworkProps {
  event: EventDetail
  onPatch: (patch: UpdateEventDto) => void
}

/**
 * 사건의 횡적 네트워크 — 자식 사건 + 키워드.
 *
 * 자식은 시간 순으로 정렬된 카드 그리드. 각 카드 클릭 시 해당 사건 상세로.
 * 키워드는 inline chip — 칩의 ✕로 제거, "+" 인풋으로 추가. 별도 폼 X.
 */
export function DetailNetwork({ event, onPatch }: DetailNetworkProps) {
  const prefetchEvent = usePrefetchEventDetail()
  const children = useMemo(
    () =>
      (event.childEvents ?? [])
        .slice()
        .sort((first, second) =>
          compareEventStart(first.startDate, second.startDate),
        ),
    [event.childEvents],
  )
  const keywords = (event.keywords ?? []).filter(
    (k): k is string => typeof k === 'string' && k.trim().length > 0,
  )

  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  /*
   * 상위·하위 사건 연결 모달 — 후보는 서버사이드 검색(GET /events/link-candidates).
   * 과거엔 목록 API(최상위만·100건 캡)를 재사용해 이미 하위인 사건·오래된 사건이
   * 검색에 안 잡혔다. 검색어는 디바운스 후 서버로, 모달 내부 필터는 그대로 동작
   * (서버 결과는 항상 검색어를 포함하므로 무손실).
   */
  const [parentModalOpen, setParentModalOpen] = useState(false)
  const [childModalOpen, setChildModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  // 모달 열림/닫힘 시 debounced를 즉시 현재값으로 스냅 — 닫기 직전 검색어가 250ms
  // 동안 남아 다른 모달 첫 화면에 이전 결과가 비치는 것을 방지.
  const debouncedTerm = useDebouncedValue(
    searchTerm,
    250,
    `${parentModalOpen}:${childModalOpen}`,
  )
  const {
    data: candidates = [],
    isLoading: eventsLoading,
    isFetching: eventsFetching,
  } = useQuery({
    // ['events'] 프리픽스(eventKeys.lists()) 아래 — 사건 mutation 시 함께 무효화된다.
    queryKey: ['events', 'link-candidates', debouncedTerm],
    queryFn: () => getEventLinkCandidates({ query: debouncedTerm, limit: 50 }),
    enabled: parentModalOpen || childModalOpen,
    staleTime: 60_000,
    // 검색어 타이핑 중 이전 결과를 유지 — 목록이 '불러오는 중'으로 깜빡이지 않게.
    placeholderData: keepPreviousData,
  })
  // fetch 중 + 디바운스 대기 중 모두 '검색 중'으로 — 확정형 '결과 없음' 오탐 방지.
  const searchPending = eventsFetching || searchTerm !== debouncedTerm

  const childIds = useMemo(
    () => children.map((child) => child.id),
    [children],
  )
  // confirm 대기 등 비동기 구간에서 클로저의 stale childIds로 patch를 만들면
  // 직전에 추가된 연결이 소리 없이 풀린다 — patch 시점엔 항상 최신 목록을 참조.
  const childIdsRef = useRef(childIds)
  useEffect(() => {
    childIdsRef.current = childIds
  }, [childIds])

  /* 선택 옵션 — 자기 자신 제외. 날짜 + 현재 소속(이미 하위인 경우)을 설명 라인에. */
  const eventOptions = useMemo<SelectOption[]>(
    () =>
      candidates
        .filter((candidate) => candidate.id !== event.id)
        .map((candidate) => ({
          value: candidate.id,
          label: candidate.title,
          description: candidateDescription(candidate, event.id),
        })),
    [candidates, event.id],
  )

  /* 직계 순환은 후보에서 제외 — 상위 피커엔 현재 자식 불가, 하위 피커엔 현재 부모 불가.
   * (깊은 순환은 서버 조상 워크 가드가 409로 거부.) */
  const parentOptions = useMemo(
    () => eventOptions.filter((option) => !childIds.includes(option.value)),
    [eventOptions, childIds],
  )
  const childOptions = useMemo(
    () => eventOptions.filter((option) => option.value !== event.parentEventId),
    [eventOptions, event.parentEventId],
  )

  /**
   * 하위 사건 연결 — 서버는 childEventIds를 받으면 *기존 연결을 모두 해제 후 재설정*하므로
   * 항상 전체 목록을 보낸다. 토글식: 이미 자식이면 제거, 아니면 추가.
   * 다른 사건의 하위인 후보를 붙이면 그쪽 연결이 끊기고 옮겨오므로 확인을 거친다.
   */
  const toggleChild = async (childId: string) => {
    const isRemoving = childIds.includes(childId)
    if (!isRemoving) {
      const candidate = candidates.find((item) => item.id === childId)
      if (candidate?.parentEventId && candidate.parentEventId !== event.id) {
        const confirmed = await confirm({
          title: '하위 사건 이동',
          message: `'${candidate.title}'은(는) 현재 '${
            candidate.parentEventTitle ?? '다른 사건'
          }'의 하위 사건입니다. 그 연결을 끊고 이 사건의 하위로 옮길까요?`,
          confirmLabel: '이동',
        })
        if (!confirmed) return
      }
    }
    // confirm await 사이 다른 patch가 반영됐을 수 있어 ref의 최신 목록으로 구성.
    const latest = childIdsRef.current
    const next = isRemoving
      ? latest.filter((id) => id !== childId)
      : latest.includes(childId)
        ? latest
        : [...latest, childId]
    onPatch({ childEventIds: next })
  }

  const removeChild = (childId: string) => {
    onPatch({ childEventIds: childIds.filter((id) => id !== childId) })
  }

  /** 상위 사건 지정/변경/해제. 해제는 null을 명시 전송해야 FK가 비워진다. */
  const setParent = (parentId: string | null) => {
    onPatch({ parentEventId: parentId } as UpdateEventDto)
    setParentModalOpen(false)
    setSearchTerm('')
  }

  /* 서버 캡(50)에 닿으면 잘린 목록임을 알림 — '전체'로 오독하지 않게. */
  const truncationHint =
    candidates.length >= 50 ? (
      <TruncationNote>
        후보가 많아 50건까지만 표시 중 — 검색어로 좁혀 주세요
      </TruncationNote>
    ) : undefined

  const parentEvent = event.parentEvent

  const submitKeyword = () => {
    const next = draft.trim()
    setDraft('')
    setAdding(false)
    if (!next) return
    if (keywords.includes(next)) return
    onPatch({ keywords: [...keywords, next] })
  }

  /**
   * blur 정책:
   *  - 입력이 비어 있으면 cancel (UI만 닫고 저장 X).
   *  - 입력이 있으면 *저장 시도* — 사용자가 길게 타이핑하다 다른 곳을 클릭해도
   *    내용이 날아가지 않도록. 짧은 부분 단어 자동 저장이 문제될 가능성은 있으나,
   *    공백 trim + 중복 차단이 들어가 있어 빈 키워드/중복은 묵음 무시.
   *  - Esc는 항상 cancel.
   */
  const handleBlur = () => {
    if (!draft.trim()) {
      cancelKeyword()
      return
    }
    submitKeyword()
  }

  const cancelKeyword = () => {
    setDraft('')
    setAdding(false)
  }

  const removeKeyword = (k: string) => {
    onPatch({ keywords: keywords.filter((kw) => kw !== k) })
  }

  return (
    <S.Section id="network">
      <S.SectionHeader>
        <S.SectionTitle>연관</S.SectionTitle>
        {(children.length > 0 || keywords.length > 0) && (
          <S.SectionSubtitle>
            {children.length > 0 && `자식 ${children.length}`}
            {children.length > 0 && keywords.length > 0 && ' · '}
            {keywords.length > 0 && `키워드 ${keywords.length}`}
          </S.SectionSubtitle>
        )}
      </S.SectionHeader>

      {/* 상위 사건 — 지정/변경/해제 */}
      <HierBlock>
        <KeywordsLabel>상위 사건</KeywordsLabel>
        <HierRow>
          {parentEvent ? (
            <>
              <ParentLink
                to={pathKeys.events.detail(parentEvent.id)}
                viewTransition
                onMouseEnter={() => prefetchEvent(parentEvent.id)}
              >
                {parentEvent.title}
              </ParentLink>
              <TextBtn type="button" onClick={() => setParentModalOpen(true)}>
                변경
              </TextBtn>
              <TextBtn type="button" onClick={() => setParent(null)}>
                해제
              </TextBtn>
            </>
          ) : (
            <AddBtn type="button" onClick={() => setParentModalOpen(true)}>
              <FiPlus /> 상위 사건 지정
            </AddBtn>
          )}
        </HierRow>
      </HierBlock>

      {/* 하위 사건 — 카드 그리드 + 추가/제거 */}
      <HierBlock>
        <KeywordsLabel>하위 사건</KeywordsLabel>
        {children.length > 0 && (
          <S.CardGrid $cols={2}>
            {children.map((child) => {
              const category = resolveCategory(child.category?.name)
              const dateLabel =
                child.startDate &&
                formatDateRange(
                  child.startDate,
                  child.endDate ?? undefined,
                  child.startDatePrecision,
                  child.endDatePrecision,
                )
              return (
                <ChildCardWrap key={child.id}>
                  <ChildCard
                    to={pathKeys.events.detail(child.id)}
                    viewTransition
                    onMouseEnter={() => prefetchEvent(child.id)}
                    onFocus={() => prefetchEvent(child.id)}
                  >
                    <ChildBar style={{ background: category.color }} />
                    <ChildBody>
                      <ChildTitle>{child.title}</ChildTitle>
                      {dateLabel && <ChildMeta>{dateLabel}</ChildMeta>}
                      {child.description && (
                        <ChildDesc>{child.description}</ChildDesc>
                      )}
                    </ChildBody>
                  </ChildCard>
                  <RemoveChildBtn
                    type="button"
                    onClick={() => removeChild(child.id)}
                    aria-label={`${child.title} 하위 연결 해제`}
                  >
                    <FiX />
                  </RemoveChildBtn>
                </ChildCardWrap>
              )
            })}
          </S.CardGrid>
        )}
        <AddBtn type="button" onClick={() => setChildModalOpen(true)}>
          <FiPlus /> 하위 사건 추가
        </AddBtn>
      </HierBlock>

      <KeywordsBlock>
        <KeywordsLabel>키워드</KeywordsLabel>
        <KeywordsRow>
          {keywords.map((keyword) => (
            <KeywordChip key={keyword}>
              <span>{keyword}</span>
              <ChipX
                type="button"
                onClick={() => removeKeyword(keyword)}
                aria-label={`${keyword} 제거`}
              >
                <FiX />
              </ChipX>
            </KeywordChip>
          ))}
          {adding ? (
            <KeywordInput
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={(keyEvent) => {
                // IME 조합 중 Enter는 조합 확정 — 키워드 조기 커밋 방지.
                if (keyEvent.key === 'Enter' && !keyEvent.nativeEvent.isComposing) {
                  keyEvent.preventDefault()
                  submitKeyword()
                }
                if (keyEvent.key === 'Escape') {
                  keyEvent.preventDefault()
                  cancelKeyword()
                }
              }}
              placeholder="키워드 입력 후 Enter"
            />
          ) : (
            <AddBtn type="button" onClick={() => setAdding(true)}>
              <FiPlus /> 추가
            </AddBtn>
          )}
        </KeywordsRow>
      </KeywordsBlock>

      <SelectModal
        isOpen={parentModalOpen}
        onClose={() => {
          setParentModalOpen(false)
          setSearchTerm('')
        }}
        title="상위 사건 지정"
        options={parentOptions}
        selectedValue={event.parentEventId ?? undefined}
        onSelect={(id) => setParent(id)}
        searchable
        searchPlaceholder="사건명으로 검색 (하위 사건 포함)"
        isLoading={eventsLoading}
        isSearching={searchPending}
        onQueryChange={setSearchTerm}
        headerExtra={truncationHint}
      />
      <SelectModal
        isOpen={childModalOpen}
        onClose={() => {
          setChildModalOpen(false)
          setSearchTerm('')
        }}
        title="하위 사건 추가"
        options={childOptions}
        multiple
        selectedValues={childIds}
        onSelect={(id) => void toggleChild(id)}
        searchable
        searchPlaceholder="사건명으로 검색 (하위 사건 포함)"
        isLoading={eventsLoading}
        isSearching={searchPending}
        onQueryChange={setSearchTerm}
        headerExtra={truncationHint}
      />
    </S.Section>
  )
}

/**
 * 후보 날짜 라벨 — startDate가 있으면 정밀도 포맷, BC·고대(DATETIME 저장 불가)는
 * 구조화 연도(startEra/startYear)로 표기. 둘 다 없으면 null.
 */
function candidateDateLabel(candidate: EventLinkCandidate): string | null {
  if (candidate.startDate) {
    return formatDateRange(
      candidate.startDate,
      candidate.endDate ?? undefined,
      candidate.startDatePrecision,
      candidate.endDatePrecision,
    )
  }
  if (candidate.startYear != null) {
    const start = `${candidate.startEra === 'BC' ? '기원전 ' : ''}${candidate.startYear}년`
    if (candidate.endYear != null) {
      const end = `${candidate.endEra === 'BC' ? '기원전 ' : ''}${candidate.endYear}년`
      if (end !== start) return `${start} ~ ${end}`
    }
    return start
  }
  return null
}

/** 후보 설명 라인 — 날짜 · 현재 소속 상위 사건("이미 하위" 안내). */
function candidateDescription(
  candidate: EventLinkCandidate,
  currentEventId: string,
): string | undefined {
  const parts: string[] = []
  const dateLabel = candidateDateLabel(candidate)
  if (dateLabel) parts.push(dateLabel)
  if (candidate.parentEventId === currentEventId) {
    parts.push('이 사건의 하위')
  } else if (candidate.parentEventId) {
    parts.push(`현재 '${candidate.parentEventTitle ?? '다른 사건'}'의 하위`)
  }
  return parts.length > 0 ? parts.join(' · ') : undefined
}

/**
 * 사건 시작일 비교 — JS `Date`는 BC(음수 연도) 일부 표기를 NaN으로 떨굼.
 * Papyrus는 역사 사건을 다루므로 *연·월·일 토큰을 직접 파싱*해 정수 비교한다.
 * 비교 우선순위: 연도 → 월 → 일. 입력 누락은 가장 뒤로 정렬.
 */
function compareEventStart(
  a: string | null | undefined,
  b: string | null | undefined,
): number {
  const aT = parseEventDateTokens(a)
  const bT = parseEventDateTokens(b)
  if (aT == null && bT == null) return 0
  if (aT == null) return 1
  if (bT == null) return -1
  if (aT.year !== bT.year) return aT.year - bT.year
  if (aT.month !== bT.month) return aT.month - bT.month
  return aT.day - bT.day
}

function parseEventDateTokens(
  input: string | null | undefined,
): { year: number; month: number; day: number } | null {
  if (!input) return null
  // 선택적 부호 + 1~6자리 연도, 월·일은 선택적.
  const m = input.match(/^(-?\d{1,6})(?:-(\d{1,2}))?(?:-(\d{1,2}))?/)
  if (!m || !m[1]) return null
  const year = parseInt(m[1], 10)
  if (!Number.isFinite(year)) return null
  const month = m[2] ? parseInt(m[2], 10) : 1
  const day = m[3] ? parseInt(m[3], 10) : 1
  return { year, month, day }
}

const HierBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const TruncationNote = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const HierRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
`

const ParentLink = styled(Link)`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;

  &:hover,
  &:focus-visible {
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 3px;
    outline: none;
  }
`

const TextBtn = styled.button`
  padding: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  transition: color 0.14s;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const ChildCardWrap = styled.div`
  position: relative;

  /* 카드 호버 시 제거 버튼 노출 — wrap 안의 유일한 button. */
  &:hover button {
    opacity: 0.7;
  }
`

const RemoveChildBtn = styled.button`
  position: absolute;
  top: 6px;
  right: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.14s, color 0.14s;

  &:hover,
  &:focus-visible {
    opacity: 1;
    color: ${({ theme }) => theme.colors.error};
    outline: none;
  }

  @media (hover: none) {
    opacity: 0.7;
  }

  svg {
    width: 12px;
    height: 12px;
  }
`

const ChildCard = styled(Link)`
  display: flex;
  gap: 12px;
  padding: 12px 14px;
  background: transparent;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: 10px;
  text-decoration: none;
  color: inherit;
  transition: color 0.16s, background 0.16s, border-color 0.16s, box-shadow 0.16s;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.02)'};
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.16)'};
    box-shadow: ${({ theme }) =>
      theme.mode === 'dark'
        ? '0 2px 10px rgba(0,0,0,0.28)'
        : '0 2px 8px rgba(15,23,42,0.06)'};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  /* 터치 기기 — hover가 없으므로 탭 시 즉각 피드백. */
  @media (hover: none) {
    &:active {
      background: ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.03)'};
    }
  }
`

const ChildBar = styled.span`
  width: 3px;
  border-radius: 2px;
  flex-shrink: 0;
`

const ChildBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

const ChildTitle = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.4;
`

const ChildMeta = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
`

const ChildDesc = styled.span`
  font-size: 12.5px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const KeywordsBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const KeywordsLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const KeywordsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
`

const KeywordChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 0;
  font-size: 13px;
  font-weight: 500;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  border: none;

  &::before {
    content: '#';
    color: ${({ theme }) => theme.colors.text.tertiary};
    margin-right: 1px;
  }
`

const ChipX = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.background.secondary};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 1px;
  }

  svg {
    width: 11px;
    height: 11px;
  }
`

const AddBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.14s, color 0.14s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  svg {
    width: 12px;
    height: 12px;
  }
`

const KeywordInput = styled.input`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  min-width: 140px;
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`
