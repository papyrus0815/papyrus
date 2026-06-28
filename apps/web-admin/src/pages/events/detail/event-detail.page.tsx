import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { useParams, useSearchParams } from 'react-router-dom'

import { resolveCategory } from '@/pages/events/ledger/styles/ledger-tokens'
import { CommentSection } from '@/entities/comment'
import { useDocumentTitle } from '@/shared/hooks/use-document-title.hook'
import { pathKeys } from '@/shared/router'
import { SmartErrorBoundary } from '@/shared/ui/error-handler/smart-error-boundary'

import { DetailActors } from './components/detail-actors'
import { DetailAppendix } from './components/detail-appendix'
import { DetailHero } from './components/detail-hero'
import { DetailNarrative } from './components/detail-narrative'
import { DetailNetwork } from './components/detail-network'
import { DetailRail } from './components/detail-rail'
import { InlineEditProvider } from './components/inline'
import { ModuleAdd } from './components/module-add'
import { ModuleBelligerents } from './components/module-belligerents'
import { ModuleCabinets } from './components/module-cabinets'
import { ModuleCasualties } from './components/module-casualties'
import { ModuleMilitaryDetails } from './components/module-military-details'
import { PersonDetailModal } from './components/person-detail-modal'
import { ReadingProgress } from './components/reading-progress'
import { SaveStatus } from './components/save-status'
import * as S from './styles'
import { type EventDetail, eventKeys, useEventDetail } from './use-event-detail'
import { useEventMutation } from './use-event-mutation'
import { useUndoablePatch } from './use-undoable-patch'

/**
 * 사건 상세 페이지 — 단일 칼럼 narrative-first.
 *
 * 데이터 계층(현대화)
 * - 셸(EventDetailPage)이 ErrorBoundary > Suspense > 본문(EventDetailContent)을 감싼다.
 * - 본문은 `useEventDetail`(useSuspenseQuery) — 로딩은 Suspense, 에러는 ErrorBoundary로
 *   위임하므로 본문 코드엔 `isLoading/isError` 분기가 없다.
 *
 * 디자인 원칙
 * - 사건 = 시간 내러티브 + 행위자 + 카테고리별 모듈 + 연관 네트워크.
 * - 편집은 *click-to-edit* 일원화. 모든 자식은 단일 `onPatch(UpdateEventDto)` 채널만 본다.
 */
const EventDetailPage = () => {
  const { eventId } = useParams<{ eventId: string }>()

  // 라우트상 항상 존재하지만 타입 가드 — 없으면 즉시 안내(훅 호출 전이라 안전).
  if (!eventId) {
    return (
      <S.Page>
        <S.PageInner>
          <S.StateBox>
            <S.ErrorText>잘못된 접근입니다.</S.ErrorText>
            <S.StateBackLink to={pathKeys.events.root()}>
              목록으로 돌아가기
            </S.StateBackLink>
          </S.StateBox>
        </S.PageInner>
      </S.Page>
    )
  }

  return (
    // key={eventId} — 다른 사건으로 이동 시 에러 상태를 리셋.
    <SmartErrorBoundary key={eventId} FallbackComponent={EventDetailError}>
      <Suspense fallback={<EventDetailLoading />}>
        <EventDetailContent eventId={eventId} />
      </Suspense>
    </SmartErrorBoundary>
  )
}

/* ───────────────────────── 본문(데이터 해소 후) ───────────────────────── */

function EventDetailContent({ eventId }: { eventId: string }) {
  const { event, enabledModules } = useEventDetail(eventId)
  /* 탭·히스토리 식별 — 사건명을 문서 제목에 반영. */
  useDocumentTitle(event.title)

  const queryClient = useQueryClient()
  const mutation = useEventMutation(eventId)
  /**
   * onPatch — mutation.mutate에 1단계 undo 토스트를 얹은 wrapper.
   * 모든 인라인 편집은 이 함수를 통해 patch한다 → 직후 5초간 "되돌리기" 토스트.
   */
  const onPatch = useUndoablePatch({ event, mutate: mutation.mutate })

  /* 마지막 저장 성공 시각 — SaveStatus가 "방금 저장됨" 플래시를 띄우기 위한 트리거. */
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  /**
   * 직전에 처리한 mutation submit 타임스탬프. mutation.submittedAt은 매 mutate마다
   * 갱신되므로, 이 값과의 비교로 *새 성공*만 골라낸다.
   */
  const lastHandledSubmitAtRef = useRef(0)
  useEffect(() => {
    if (
      mutation.isSuccess &&
      mutation.submittedAt !== lastHandledSubmitAtRef.current
    ) {
      lastHandledSubmitAtRef.current = mutation.submittedAt
      setLastSavedAt(Date.now())
    }
  }, [mutation.isSuccess, mutation.submittedAt])

  /**
   * 인물 클릭 → 같은 페이지에서 인물 상세 모달.
   * URL 쿼리(`?person=<id>`)와 sync — 새로고침·공유로도 같은 모달 상태 복원 가능.
   */
  const [searchParams, setSearchParams] = useSearchParams()
  const viewingPersonId = searchParams.get('person')
  const onPersonClick = useCallback(
    (personId: string) => {
      const next = new URLSearchParams(searchParams)
      next.set('person', personId)
      setSearchParams(next, { replace: false })
    },
    [searchParams, setSearchParams],
  )
  const onPersonModalClose = useCallback(() => {
    const next = new URLSearchParams(searchParams)
    next.delete('person')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  /**
   * 본문에 *인물* 엔티티를 링크하면 참여 행위자로 자동 등록.
   * - 이미 행위자면 무시(기존 role/note 보존).
   * - relatedPersons는 delete-and-recreate라 *전체 배열*을 PUT — 기존 항목은
   *   payload로 직렬화해 함께 보낸다. onPatch 경유라 직후 "되돌리기" 토스트로 취소 가능.
   * - 본문 편집 commit과 독립적 — 본문을 취소(Esc)해도 이미 등록된 행위자는 유지(정책 A).
   * - 즉시 표시: mutation의 낙관적 빌더는 신규 인물 이름을 `['persons','all']`
   *   캐시(행위자 모달 열 때만 적재)에서 찾으므로, 에디터 링크만으론 캐시가 비어
   *   낙관 갱신이 스킵된다. 에디터가 넘긴 표시명으로 상세 캐시에 직접 써넣어
   *   링크 즉시(저장·새로고침 없이) 행위자가 뜨도록 한다. 직후 PUT·refetch가 정본 반영.
   * - race 차단: 기존 목록·중복 판정·PUT 페이로드를 모두 *그 시점 캐시 스냅샷*에서
   *   도출한다. 렌더 상태(`event.relatedPersons`)는 직전 링크의 낙관 갱신을 아직
   *   반영하지 못했을 수 있어, 연속 링크 시 먼저 추가한 인물이 delete-and-recreate
   *   PUT에서 누락될 수 있었다. 낙관 setQueryData는 동기 반영이므로 캐시는 항상 최신.
   */
  const onPersonEntityLink = useCallback(
    (person: { id: string; name: string; imageUrl?: string | null }) => {
      const detailKey = eventKeys.detail(eventId)
      const existing =
        queryClient.getQueryData<EventDetail>(detailKey)?.relatedPersons ??
        event.relatedPersons ??
        []
      if (existing.some((p) => p.personId === person.id)) return

      queryClient.setQueryData<EventDetail>(detailKey, (prev) =>
        prev
          ? {
              ...prev,
              relatedPersons: [
                ...(prev.relatedPersons ?? []),
                {
                  id: `opt-${person.id}`,
                  personId: person.id,
                  role: null,
                  note: null,
                  person: {
                    id: person.id,
                    name: person.name,
                    surname: null,
                    profileImageUrl: person.imageUrl ?? null,
                  },
                },
              ],
            }
          : prev,
      )

      onPatch(
        {
          relatedPersons: [
            ...existing.map((p) => ({
              personId: p.personId,
              role: p.role ?? undefined,
              note: p.note ?? undefined,
            })),
            { personId: person.id },
          ],
        },
        { savedLabel: `행위자에 추가 · ${person.name}` },
      )
    },
    [event.relatedPersons, onPatch, queryClient, eventId],
  )

  /**
   * 섹션 목록 — rail에 표시할 anchor + 라벨.
   * deps는 `event.id`로 좁힌다. 인라인 patch refetch마다 event identity가 바뀌므로
   * event 전체를 deps에 두면 매번 재계산 — 섹션 구성은 사건 id·enabledModules에만 의존.
   */
  const sections = useMemo(() => {
    const items: Array<{ id: string; label: string }> = []
    items.push({ id: 'background', label: '배경' })
    items.push({ id: 'narrative', label: '전개' })
    items.push({ id: 'aftermath', label: '여파' })
    items.push({ id: 'actors', label: '참여 행위자' })

    if (enabledModules.includes('belligerents'))
      items.push({ id: 'module-belligerents', label: '교전 진영' })
    if (enabledModules.includes('casualties'))
      items.push({ id: 'module-casualties', label: '사상자' })
    if (enabledModules.includes('military-details'))
      items.push({ id: 'module-military-details', label: '작전 정보' })
    if (enabledModules.includes('cabinets'))
      items.push({ id: 'module-cabinets', label: '관련 행정부' })

    items.push({ id: 'network', label: '연관' })
    items.push({ id: 'appendix', label: '이미지' })
    // 댓글은 최상위 사건만 — 백엔드가 하위 사건(parentEventId≠null)엔 댓글을 노출/허용하지
    // 않으므로(스코프 불일치 시 빈-상태 오인·작성 404), 하위 사건에선 섹션 자체를 숨긴다.
    if (!event.parentEventId) items.push({ id: 'comments', label: '댓글' })

    return items
    // event는 *식별자 변경* 시에만 재구성. parentEventId는 위계 변경이라 의도적으로 포함.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id, event.parentEventId, enabledModules])

  /**
   * URL hash → 섹션 스크롤. 사건 id가 바뀐 첫 렌더에서 1회만 실행.
   * (deps에 event 전체를 두면 매 patch refetch마다 재실행돼 편집 중 위로 점프하는 회귀.)
   */
  const scrolledHashForEventRef = useRef<string | null>(null)
  useEffect(() => {
    if (scrolledHashForEventRef.current === event.id) return
    scrolledHashForEventRef.current = event.id
    const hash = window.location.hash.slice(1)
    if (!hash) return
    const target = document.getElementById(hash)
    if (!target) return
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [event.id])

  /* Page = 내부 스크롤 컨테이너 — 읽기 진행률 바가 이 ref로 scrollTop을 읽는다. */
  const scrollRef = useRef<HTMLDivElement>(null)
  const accentColor = resolveCategory(event.category?.name).color

  return (
    <InlineEditProvider imageCategory="events">
      <S.Page ref={scrollRef}>
        <ReadingProgress targetRef={scrollRef} color={accentColor} />
        <S.PageInner>
          <SaveStatus isPending={mutation.isPending} lastSavedAt={lastSavedAt} />
          <DetailHero
            event={event}
            onPatch={onPatch}
            onPersonClick={onPersonClick}
          />

          <S.Body>
            <DetailRail sections={sections} />

            <S.Main>
              <DetailNarrative
                event={event}
                onPatch={onPatch}
                onPersonClick={onPersonClick}
                onPersonEntityLink={onPersonEntityLink}
              />

              <DetailActors
                event={event}
                onPatch={onPatch}
                onPersonClick={onPersonClick}
              />

              {/* 모듈 추가 진입점 — 발견성을 위해 actors 직후로 배치. */}
              <ModuleAdd
                event={event}
                enabledModules={enabledModules}
                onPatch={onPatch}
              />

              {enabledModules.includes('belligerents') && (
                <ModuleBelligerents event={event} onPatch={onPatch} />
              )}
              {enabledModules.includes('casualties') && (
                <ModuleCasualties event={event} onPatch={onPatch} />
              )}
              {enabledModules.includes('military-details') && (
                <ModuleMilitaryDetails event={event} onPatch={onPatch} />
              )}
              {enabledModules.includes('cabinets') && <ModuleCabinets event={event} />}

              <DetailNetwork event={event} onPatch={onPatch} />
              <DetailAppendix event={event} onPatch={onPatch} />

              {!event.parentEventId && (
                <S.Section id="comments">
                  <S.SectionHeader>
                    <S.SectionTitle>댓글</S.SectionTitle>
                  </S.SectionHeader>
                  <CommentSection ownerType="EVENT" recordId={eventId} />
                </S.Section>
              )}
            </S.Main>
          </S.Body>
        </S.PageInner>
      </S.Page>

      <PersonDetailModal personId={viewingPersonId} onClose={onPersonModalClose} />
    </InlineEditProvider>
  )
}

/* ───────────────────────── Suspense / Error fallback ───────────────────────── */

function EventDetailLoading() {
  return (
    <S.Page>
      <S.PageInner>
        <S.StateBox>
          <S.Spinner />
          <S.HelperText>사건 정보를 불러오는 중…</S.HelperText>
        </S.StateBox>
      </S.PageInner>
    </S.Page>
  )
}

function EventDetailError({ error }: { error: Error }) {
  const notFound = (error as { status?: number }).status === 404
  return (
    <S.Page>
      <S.PageInner>
        <S.StateBox>
          <S.ErrorText>
            {notFound ? '사건을 찾을 수 없습니다' : '사건을 불러오지 못했습니다.'}
          </S.ErrorText>
          {error.message && <S.HelperText>{error.message}</S.HelperText>}
          <S.StateBackLink to={pathKeys.events.root()}>
            목록으로 돌아가기
          </S.StateBackLink>
        </S.StateBox>
      </S.PageInner>
    </S.Page>
  )
}

export default EventDetailPage
