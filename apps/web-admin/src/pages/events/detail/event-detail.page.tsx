import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useParams, useSearchParams } from 'react-router-dom'

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
import { ModuleTreaties } from './components/module-treaties'
import { PersonDetailModal } from './components/person-detail-modal'
import { SaveStatus } from './components/save-status'
import * as S from './styles'
import { useEventDetail } from './use-event-detail'
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
    if (enabledModules.includes('treaties'))
      items.push({ id: 'module-treaties', label: '조약' })
    if (enabledModules.includes('cabinets'))
      items.push({ id: 'module-cabinets', label: '관련 행정부' })

    items.push({ id: 'network', label: '연관' })
    items.push({ id: 'appendix', label: '이미지' })

    return items
    // event는 *식별자 변경* 시에만 재구성. 다른 필드 변경으로 인한 refetch는 무시.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id, enabledModules])

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

  return (
    <InlineEditProvider>
      <S.Page>
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
              {enabledModules.includes('treaties') && <ModuleTreaties event={event} />}
              {enabledModules.includes('cabinets') && <ModuleCabinets event={event} />}

              <DetailNetwork event={event} onPatch={onPatch} />
              <DetailAppendix event={event} onPatch={onPatch} />
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
