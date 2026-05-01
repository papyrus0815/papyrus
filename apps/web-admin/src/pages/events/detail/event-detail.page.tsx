import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useParams } from 'react-router-dom'

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

/**
 * 사건 상세 페이지 — 단일 칼럼 narrative-first.
 *
 * 디자인 원칙
 * - 사건 = 시간 내러티브 + 행위자 + 카테고리별 모듈 + 연관 네트워크.
 * - 카드 그리드로 분산하지 않는다. 본문은 본문대로, 모듈은 데이터 있을 때만.
 * - 편집은 *click-to-edit* 일원화 — 각 필드를 클릭해 그 자리에서 수정.
 *   페이지 전역 편집 잠금 X (한 번에 한 섹션 강제는 폐기 — UX 마찰만 컸음).
 * - 모든 자식은 단일 `onPatch(UpdateEventDto)` 채널만 본다. 부분 patch는 서버가
 *   `=== undefined` 가드로 처리(event.service.ts).
 */
const EventDetailPage = () => {
  const { eventId } = useParams<{ eventId: string }>()
  const { event, isLoading, isError, error, enabledModules } = useEventDetail(eventId)
  const mutation = useEventMutation(eventId ?? '')
  const onPatch = mutation.mutate

  /* 마지막 저장 성공 시각 — SaveStatus가 "방금 저장됨" 플래시를 띄우기 위한 트리거. */
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  const successCountRef = useRef(0)
  useEffect(() => {
    if (mutation.isSuccess && mutation.submittedAt !== successCountRef.current) {
      successCountRef.current = mutation.submittedAt
      setLastSavedAt(Date.now())
    }
  }, [mutation.isSuccess, mutation.submittedAt])

  /** 인물 클릭 → 같은 페이지에서 인물 상세 모달. 라우팅 X. */
  const [viewingPersonId, setViewingPersonId] = useState<string | null>(null)
  const onPersonClick = useCallback(
    (personId: string) => setViewingPersonId(personId),
    [],
  )

  const sections = useMemo(() => {
    if (!event) return []
    const items: Array<{ id: string; label: string }> = []
    items.push({ id: 'background', label: '배경' })
    items.push({ id: 'narrative', label: '전개' })
    items.push({ id: 'aftermath', label: '여파' })

    // 행위자는 카테고리 무관하게 거의 모든 사건에 존재 — 보편 정보를 모듈보다 먼저.
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
  }, [event, enabledModules])

  // URL hash → 섹션 스크롤 (페이지 진입 시).
  useEffect(() => {
    if (!event) return
    const hash = window.location.hash.slice(1)
    if (!hash) return
    const target = document.getElementById(hash)
    if (!target) return
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [event])

  if (isLoading) {
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

  if (isError || !event) {
    return (
      <S.Page>
        <S.PageInner>
          <S.StateBox>
            <S.ErrorText>사건을 불러오지 못했습니다.</S.ErrorText>
            {error && <S.HelperText>{error.message}</S.HelperText>}
          </S.StateBox>
        </S.PageInner>
      </S.Page>
    )
  }

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

          <S.Body $noRail={sections.length < 5}>
            <DetailRail sections={sections} />

            <S.Main>
              <DetailNarrative event={event} onPatch={onPatch} />

              <DetailActors
                event={event}
                onPatch={onPatch}
                onPersonClick={onPersonClick}
              />

              {enabledModules.includes('belligerents') && (
                <ModuleBelligerents event={event} />
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

              <ModuleAdd
                event={event}
                enabledModules={enabledModules}
                onPatch={onPatch}
              />
            </S.Main>
          </S.Body>
        </S.PageInner>
      </S.Page>

      <PersonDetailModal
        personId={viewingPersonId}
        onClose={() => setViewingPersonId(null)}
      />
    </InlineEditProvider>
  )
}

export default EventDetailPage
