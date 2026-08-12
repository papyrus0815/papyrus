import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { useBlocker } from 'react-router-dom'

import {
  type EventLinkCandidate,
  type UpdateEventDto,
  updateEvent,
} from '@/shared/api/events'
import { confirm } from '@/shared/ui/confirm-dialog'
import { SelectModal, type SelectOption } from '@/shared/ui/select-modal/select-modal'
import { notify } from '@/shared/ui/toast'

import * as S from '../styles'
import { type EventDetail, eventKeys } from '../use-event-detail'
import { ChildrenBlock } from './children-block'
import {
  compareEventStart,
  crossPatchErrorMessage,
  fetchEventCommentCountSafe,
  focusNextRemovalTarget,
} from './detail-network.lib'
import { KeywordsBlock } from './keywords-block'
import { ParentBlock } from './parent-block'
import { useLinkCandidatePicker } from './use-link-candidate-picker'

/**
 * '새 하위 사건 만들기' 등록 모달 — lazy 마운트. 등록 폼 청크(gzip 약 19KB)는
 * 버튼을 누르는 소수만 필요하므로 상세 초기 번들에 얹지 않는다(등록 모달 자체의
 * lazy 본문 정책과 동일한 근거).
 */
const LazyEventRegisterModal = lazy(() =>
  import('@/widgets/event-form/ui/event-register-modal').then((module) => ({
    default: module.EventRegisterModal,
  })),
)

interface DetailNetworkProps {
  event: EventDetail
  onPatch: (patch: UpdateEventDto) => void
}

/** 승격 픽커의 '모든 상위 해제' 탈출구 옵션 값 — 사건 id와 충돌하지 않는 sentinel. */
const PROMOTE_CLEAR_ALL_VALUE = '__clear-all-parents__'

/**
 * 사건의 계층·횡적 네트워크 — 상위 사건 + 하위 사건 + 키워드.
 *
 * 상위는 지정/변경/해제하는 단일 링크 행. 하위는 시간 순으로 정렬된 카드 그리드로,
 * 각 카드 클릭 시 해당 사건 상세로(카드 상한 초과분은 '더 보기'로 펼침).
 * 키워드는 inline chip — 칩의 ✕로 제거, "+" 인풋으로 추가. 별도 폼 X.
 *
 * 표시 지면은 parent-block/children-block/keywords-block으로 분할 — 이 컨테이너는
 * 블록을 가로지르는 상태(선택모달 4종·검색 파이프라인·confirm 연쇄 patch 조립)만 가진다.
 */
export function DetailNetwork({ event, onPatch }: DetailNetworkProps) {
  const queryClient = useQueryClient()

  /* '새 하위 사건 만들기' — 기존 사건 연결(SelectModal)이 아니라 등록 모달을
   * initialParent={현재 사건}으로 열어, 고아 생성→상세 이동→수동 연결 3단계를
   * 등록 1단계로 줄인다. */
  const [createChildOpen, setCreateChildOpen] = useState(false)

  /**
   * 뒤로가기 미저장 보호 — 브라우저 뒤로가기는 이 모달을 우회 언마운트해 작성분을
   * 조용히 소실시킨다. 카탈로그 호스트(useEventRegisterModalUrl)의 useBlocker 규약을
   * 이 모달 하나에만 최소로 이식한다: 모달 열림 ∧ dirty일 때만 라우터 이동을 막고
   * 표준 confirm으로 진행/취소를 받는다. 모달 자체의 닫기(X·취소·Esc)는 이미 확인을
   * 받은 뒤 dirty를 내리고 오므로 여기서 두 번 묻지 않는다.
   */
  const createChildDirtyRef = useRef(false)
  const handleCreateChildDirtyChange = useCallback((isDirty: boolean) => {
    createChildDirtyRef.current = isDirty
  }, [])
  useEffect(() => {
    // 닫힘(정상 닫기·저장 완료) 후에는 dirty를 반드시 내린다 — 남으면 이후의
    // 아무 이동이나 계속 막힌다(호스트 훅과 동일한 방어).
    if (!createChildOpen) createChildDirtyRef.current = false
  }, [createChildOpen])
  const createChildBlocker = useBlocker(
    () => createChildOpen && createChildDirtyRef.current,
  )
  // blocked 진입당 confirm 1회만 — 비동기 confirm 대기 중 리렌더로 다이얼로그 중복 방지.
  const createChildPromptingRef = useRef(false)
  useEffect(() => {
    if (createChildBlocker.state !== 'blocked') {
      createChildPromptingRef.current = false
      return
    }
    if (createChildPromptingRef.current) return
    createChildPromptingRef.current = true
    confirm({
      title: '확인',
      message: '저장하지 않은 변경 사항이 있습니다. 닫으시겠습니까?',
    }).then((confirmed) => {
      if (confirmed) {
        createChildDirtyRef.current = false
        createChildBlocker.proceed()
      } else {
        createChildBlocker.reset()
      }
    })
  }, [createChildBlocker])

  /**
   * 새 하위 사건 저장 성공 — 폼 본체가 목록(lists/count) 무효화와 새 사건 상세 시딩을
   * 이미 끝낸 뒤 불린다. 여기서는 부모(현재 사건) 상세를 무효화해 하위 그리드에 즉시
   * 반영한다(계층 patch mutation의 detailKey + eventKeys.lists() 무효화 패턴 복제).
   */
  const handleChildCreated = () => {
    queryClient.invalidateQueries({ queryKey: eventKeys.detail(event.id) })
    queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
  }
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
    (keyword): keyword is string =>
      typeof keyword === 'string' && keyword.trim().length > 0,
  )

  /* 상위·하위·추가 상위 사건 연결 모달 열림 상태 — 검색 파이프라인(useLinkCandidatePicker)의
   * enabled·디바운스 리셋 키와 SelectModal 렌더가 함께 쓰므로 컨테이너 소유. */
  const [parentModalOpen, setParentModalOpen] = useState(false)
  const [childModalOpen, setChildModalOpen] = useState(false)
  const [extrasModalOpen, setExtrasModalOpen] = useState(false)
  // 상위 해제 시 승격 대상 선택 픽커 — 추가 상위 2개 이상일 때만 열림(검색 미사용).
  const [promotePickerOpen, setPromotePickerOpen] = useState(false)

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

  /* 추가 상위(EventParentLink) — 주 상위 외 다중 상위. 서버가 소프트삭제 부모를
   * 걸러 연결 오래된 순으로 내려준다(칩 순서 = 해제 시 승격 기본 제안 순서). */
  const extraParents = useMemo(
    () => event.extraParents ?? [],
    [event.extraParents],
  )
  const extraIds = useMemo(
    () => extraParents.map((extra) => extra.id),
    [extraParents],
  )
  // childIdsRef와 동일한 stale-캡처 방지 미러 — confirm 등 await 구간을 거친 patch
  // 조립(승격·해제 플로우)이 항상 최신 목록을 참조하도록 선제 배선.
  const extraIdsRef = useRef(extraIds)
  useEffect(() => {
    extraIdsRef.current = extraIds
  }, [extraIds])

  /* 추가 하위(역방향 엣지) id 집합 — childIds와 대칭. 상위/추가 상위 후보에서 걸러
   * 직계 2-cycle(선택 즉시 서버 409 스냅백)을 선차단한다. */
  const extraChildIds = useMemo(
    () => (event.extraChildren ?? []).map((extraChild) => extraChild.id),
    [event.extraChildren],
  )

  /* 링크 후보 검색 파이프라인 — SelectModal 3종(상위/하위/추가 상위)이 공유. */
  const {
    candidates,
    eventsLoading,
    eventsError,
    searchPending,
    refetchCandidates,
    setSearchTerm,
    parentOptions,
    childOptions,
    extrasOptions,
    truncationHint,
  } = useLinkCandidatePicker({
    eventId: event.id,
    parentEventId: event.parentEventId,
    childIds,
    extraIds,
    extraChildIds,
    parentModalOpen,
    childModalOpen,
    extrasModalOpen,
  })

  // 크로스 사건 mutation 진행 가드 — confirm 연쇄·PUT 왕복 동안 재클릭 차단.
  const crossLinkPendingRef = useRef(false)

  /* [PD4-NOTICE] 댓글 은닉 전이 고지 진행 가드 — 댓글 수 조회 + confirm 대기 동안
   * 재클릭이 고지·patch를 중복 발사하지 않게 차단(모달은 한 번에 하나만 열리므로
   * setParent·toggleChild가 하나를 공유해도 충돌 없음). */
  const commentNoticePendingRef = useRef(false)

  /**
   * 제3선택 — 후보의 기존 상위 P를 유지한 채 이 사건을 후보의 '추가 상위'로 연결.
   * *대상 사건* 스코프의 크로스 mutation이라 onPatch(자기 사건 채널) 대신 updateEvent를
   * 직접 호출한다. 후보의 주 상위 P가 살아 있는 분기라 INV-2(추가 상위는 주 상위 전제)는
   * 자동 성립. 대상 사건 스코프라 undo 미탑재(V7-1) — 성공 토스트만. 실패(순환 409 등)는
   * use-event-mutation과 동일한 본문 message 추출로 안내.
   */
  const linkThisAsExtraParentOf = async (candidate: EventLinkCandidate) => {
    if (crossLinkPendingRef.current) return
    crossLinkPendingRef.current = true
    try {
      await updateEvent(candidate.id, {
        extraParentEventIds: [
          ...(candidate.extraParents ?? []).map((extra) => extra.id),
          event.id,
        ],
      } as UpdateEventDto)
      /* 수동 무효화 — use-event-mutation의 계층 무효화 블록 미러(자기 자신 제외
       * predicate) + 목록 + 자기 상세(이 사건의 '추가 하위' 행 갱신). */
      queryClient.invalidateQueries({
        queryKey: ['event-detail'],
        predicate: (query) => query.queryKey[1] !== event.id,
      })
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(event.id) })
      notify.success(`'${candidate.title}'을(를) 추가 하위로 연결했습니다`)
    } catch (error) {
      notify.error(`추가 상위 연결 실패: ${crossPatchErrorMessage(error)}`)
    } finally {
      crossLinkPendingRef.current = false
    }
  }

  /**
   * 하위 사건 연결 — 서버는 childEventIds를 받으면 *기존 연결을 모두 해제 후 재설정*하므로
   * 항상 전체 목록을 보낸다. 토글식: 이미 자식이면 제거, 아니면 추가.
   * 다른 사건의 하위인 후보를 붙이면 그쪽 연결이 끊기고 옮겨오므로 확인을 거치고,
   * 이동을 거절하면 기존 상위를 유지한 채 잇는 제3선택(추가 상위 연결)을 이어 묻는다
   * (releaseParent의 연쇄 confirm 전례 미러).
   */
  const toggleChild = async (childId: string) => {
    const isRemoving = childIds.includes(childId)
    if (!isRemoving) {
      const candidate = candidates.find((item) => item.id === childId)
      if (candidate && !candidate.parentEventId) {
        /* [PD4-NOTICE] 루트 후보 attach — 서버 댓글 게이트는 '살아있는 주 상위 없음'
         * (실질 루트)만 댓글 대상으로 인정한다. 현재 루트인 후보(유령 주 상위 포함 —
         * link-candidates가 소프트삭제 부모를 null로 접어 내려줌)를 하위로 붙이면
         * 그 사건 댓글이 read까지 404로 숨는다(데이터 보존·상위 해제 시 복원).
         * 댓글이 1개 이상일 때만 사전 confirm — 0개면 현행 무고지 직행. */
        if (commentNoticePendingRef.current) return
        commentNoticePendingRef.current = true
        try {
          const commentCount = await fetchEventCommentCountSafe(candidate.id)
          if (commentCount > 0) {
            const attachConfirmed = await confirm({
              title: '하위 사건 연결',
              message: `'${candidate.title}'에 달린 댓글 ${commentCount}개가 상위 지정 동안 숨겨집니다.\n상위를 해제하면 다시 표시됩니다. 계속할까요?`,
              confirmLabel: '연결',
            })
            if (!attachConfirmed) return
          }
        } finally {
          commentNoticePendingRef.current = false
        }
      }
      if (candidate?.parentEventId && candidate.parentEventId !== event.id) {
        const moveConfirmed = await confirm({
          title: '하위 사건 이동',
          message: `'${candidate.title}'은(는) 현재 '${
            candidate.parentEventTitle ?? '다른 사건'
          }'의 하위 사건입니다. 그 연결을 끊고 이 사건의 하위로 옮길까요?\n(취소하면 기존 상위를 유지한 채 연결하는 선택지를 이어서 묻습니다.)`,
          confirmLabel: '이동',
        })
        if (!moveConfirmed) {
          const keepBoth = await confirm({
            title: '추가 상위로 연결',
            message: `'${
              candidate.parentEventTitle ?? '다른 사건'
            }' 상위를 유지한 채 이 사건에도 연결할까요?`,
            confirmLabel: '추가 상위로 연결',
          })
          if (keepBoth) await linkThisAsExtraParentOf(candidate)
          return
        }
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

  /* 추가 상위 칩 제거 버튼 포커스 이양용 ref — 렌더는 ParentBlock, 이양 로직
   * (removeExtraParent)은 컨테이너라 여기서 소유해 내려보낸다. */
  const extraRemoveRefs = useRef(new Map<string, HTMLButtonElement>())
  const extrasAddRef = useRef<HTMLButtonElement | null>(null)

  /**
   * 상위 사건 지정/변경/해제. 해제는 null을 명시 전송해야 FK가 비워진다.
   *
   * [PD4-NOTICE] 이 사건이 실질 루트(생존 parentEvent 없음 — 유령 주 상위 포함)일 때
   * 상위를 *지정*하면 서버 댓글 게이트('살아있는 주 상위 없음'만 댓글 대상)에 의해
   * 이 사건 댓글이 read까지 404로 숨는다(데이터 보존·상위 해제 시 복원). 전이 직전에
   * 댓글 수를 조회해 1개 이상이면 confirm — 확인 시에만 patch, 0개면 무고지 현행 흐름.
   * 이미 하위인 상태의 상위 '변경'은 전이가 없어(이미 숨음) 고지하지 않는다.
   */
  const setParent = async (parentId: string | null) => {
    if (parentId && !event.parentEvent) {
      if (commentNoticePendingRef.current) return
      commentNoticePendingRef.current = true
      try {
        const commentCount = await fetchEventCommentCountSafe(event.id)
        if (commentCount > 0) {
          const proceed = await confirm({
            title: '상위 사건 지정',
            message: `이 사건에 달린 댓글 ${commentCount}개가 상위 지정 동안 숨겨집니다.\n상위를 해제하면 다시 표시됩니다. 계속할까요?`,
            confirmLabel: '지정',
          })
          // 거절 시 무동작 — 모달은 열어 둔다(다른 후보 선택·닫기 선택권 유지).
          if (!proceed) return
        }
      } finally {
        commentNoticePendingRef.current = false
      }
    }
    onPatch({ parentEventId: parentId } as UpdateEventDto)
    setParentModalOpen(false)
    setSearchTerm('')
  }

  const parentEvent = event.parentEvent

  /** 추가 상위 토글 — 엣지 추가는 아무것도 끊지 않으므로 confirm 없음(모달 유지). */
  const toggleExtraParent = (targetId: string) => {
    const latest = extraIdsRef.current
    const next = latest.includes(targetId)
      ? latest.filter((id) => id !== targetId)
      : [...latest, targetId]
    onPatch({ extraParentEventIds: next } as UpdateEventDto)
  }

  const removeExtraParent = (targetId: string) => {
    focusNextRemovalTarget(
      extraRemoveRefs.current,
      extraIdsRef.current,
      targetId,
      extrasAddRef.current,
    )
    onPatch({
      extraParentEventIds: extraIdsRef.current.filter((id) => id !== targetId),
    } as UpdateEventDto)
  }

  /**
   * 대표로 승격 — 주↔부를 한 patch로 swap(서버 불변식 한 번에 통과·undo 원자 복원).
   * 강등되는 직전 주 상위는 *생존 객체*(parentEvent)가 있을 때만 extras로 편입 —
   * 유령(소프트삭제) 주 상위면 자연 탈락해 FK만 교체된다(스칼라 기준 조립 금지).
   */
  const promoteExtraParent = (targetId: string) => {
    const remaining = extraIdsRef.current.filter((id) => id !== targetId)
    const demoted = parentEvent ? [parentEvent.id] : []
    onPatch({
      parentEventId: targetId,
      extraParentEventIds: [...demoted, ...remaining],
    } as UpdateEventDto)
  }

  /** 주+추가 상위 일괄 해제 — danger confirm 경유 후 원자 patch(서버 clearAll). */
  const confirmClearAllParents = async () => {
    const snapshot = extraIdsRef.current
    const clearAll = await confirm({
      title: '모든 상위 해제',
      message: `현재 상위와 추가 상위 ${snapshot.length}개 연결을 모두 해제할까요?`,
      confirmLabel: '모두 해제',
      danger: true,
    })
    if (!clearAll) return
    // 해제는 런타임에 parentEventId:null 명시 전송(DTO 타입은 string이라 캐스트 —
    // setParent와 동일 사유). extras []와 한 patch = 서버 clearAll 원자 처리.
    onPatch({
      parentEventId: null,
      extraParentEventIds: [],
    } as unknown as UpdateEventDto)
  }

  /* 승격 픽커 옵션 — 첫 항목 = 연결 오래된 순(서버 정렬) 기본 제안. SelectOption엔
   * 위험 스타일이 없어 '모든 상위 해제'는 선택 후 danger confirm 경유로 위험 신호 유지. */
  const promoteOptions = useMemo<SelectOption[]>(
    () => [
      ...extraParents.map((extra, index) => ({
        value: extra.id,
        label: extra.title || '(제목 동기화 중)',
        description:
          index === 0 ? '기본 제안 — 가장 오래된 연결' : undefined,
      })),
      {
        value: PROMOTE_CLEAR_ALL_VALUE,
        label: '모든 상위 해제',
        description: '승격 없이 현재 상위·추가 상위 연결을 모두 해제',
      },
    ],
    [extraParents],
  )

  /** 승격 픽커 선택 처리 — 원자 swap patch(칩 '승격'과 동일 형상) 또는 전체 해제. */
  const handlePromotePick = async (pickedId: string) => {
    setPromotePickerOpen(false)
    if (pickedId === PROMOTE_CLEAR_ALL_VALUE) {
      await confirmClearAllParents()
      return
    }
    // 픽커가 열려 있던 사이 목록이 변했을 수 있어 ref 최신값으로 patch 조립.
    const latest = extraIdsRef.current
    onPatch({
      parentEventId: pickedId,
      extraParentEventIds: latest.filter((id) => id !== pickedId),
    } as UpdateEventDto)
  }

  /**
   * 주 상위 해제 — 추가 상위가 있으면 서버가 409(INV-2)로 거부하므로 patch 발사 전
   * 가로채 처리 방식을 묻는다(낙관 깜빡임→409 스냅백 방지):
   *  - 추가 상위 2개 이상 — 승격 대상 선택 픽커(SelectModal, '모든 상위 해제' 탈출구 포함)
   *  - 추가 상위 1개 — 연쇄 confirm: ① 그 엣지 승격+해제 ② 거절 시 주+추가 일괄 해제
   *    원자 patch ③ 둘 다 거절 — 무동작.
   */
  const releaseParent = async () => {
    const snapshot = extraIdsRef.current
    if (snapshot.length === 0) {
      // 해제(null)는 댓글 은닉 전이가 아니라 고지 없이 즉시 통과한다.
      await setParent(null)
      return
    }
    if (snapshot.length >= 2) {
      setPromotePickerOpen(true)
      return
    }
    const firstExtra =
      extraParents.find((extra) => extra.id === snapshot[0]) ?? null
    const promote = await confirm({
      title: '상위 사건 해제',
      message: `추가 상위 ${snapshot.length}개가 함께 연결되어 있습니다.\n'${
        firstExtra?.title ?? '첫 번째 추가 상위'
      }'을(를) 새 대표 상위로 승격하고 현재 상위를 해제할까요?`,
      confirmLabel: '승격하고 해제',
    })
    // confirm 대기 사이 목록이 변했을 수 있어 ref 최신값으로 patch 조립.
    if (promote) {
      const latest = extraIdsRef.current
      if (latest.length === 0) {
        await setParent(null)
        return
      }
      onPatch({
        parentEventId: latest[0],
        extraParentEventIds: latest.slice(1),
      } as UpdateEventDto)
      return
    }
    await confirmClearAllParents()
  }

  /* 섹션 부제 — 상위(있으면)·자식·키워드를 요약. 과거엔 자식·키워드만 세어, 상위만 있고
   * 자식·키워드가 없는 사건은 부제가 통째 사라졌다(관계 신호 은닉). 다중 상위는
   * '상위 1+N', 주 상위 부재/유령 + 추가 상위 잔존은 '상위 0+N'으로 상태를 드러낸다. */
  const relationSummary = [
    parentEvent || extraParents.length > 0
      ? `상위 ${parentEvent ? 1 : 0}${
          extraParents.length > 0 ? `+${extraParents.length}` : ''
        }`
      : null,
    children.length > 0 ? `자식 ${children.length}` : null,
    keywords.length > 0 ? `키워드 ${keywords.length}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <S.Section id="network">
      <S.SectionHeader>
        <S.SectionTitle>연관</S.SectionTitle>
        {relationSummary && (
          <S.SectionSubtitle>{relationSummary}</S.SectionSubtitle>
        )}
      </S.SectionHeader>

      {/* 상위 사건 — 지정/변경/해제 + 추가 상위 칩 + 형제 네비 */}
      <ParentBlock
        event={event}
        extraParents={extraParents}
        onOpenParentModal={() => setParentModalOpen(true)}
        onOpenExtrasModal={() => setExtrasModalOpen(true)}
        onReleaseParent={() => void releaseParent()}
        onPromoteExtraParent={promoteExtraParent}
        onRemoveExtraParent={removeExtraParent}
        onPatch={onPatch}
        extraRemoveRefs={extraRemoveRefs}
        extrasAddRef={extrasAddRef}
      />

      {/* 하위 사건 카드 그리드 + 추가 하위(역방향 엣지) 칩 */}
      <ChildrenBlock
        childEvents={children}
        extraChildren={event.extraChildren ?? []}
        onPatch={onPatch}
        onOpenChildModal={() => setChildModalOpen(true)}
        onOpenCreateChild={() => setCreateChildOpen(true)}
      />

      <KeywordsBlock keywords={keywords} onPatch={onPatch} />

      <SelectModal
        isOpen={parentModalOpen}
        onClose={() => {
          setParentModalOpen(false)
          setSearchTerm('')
        }}
        title="상위 사건 지정"
        options={parentOptions}
        selectedValue={event.parentEventId ?? undefined}
        onSelect={(id) => void setParent(id)}
        searchable
        searchPlaceholder="사건명으로 검색 (하위 사건 포함)"
        isLoading={eventsLoading}
        isSearching={searchPending}
        hasError={eventsError}
        onRetry={() => void refetchCandidates()}
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
        hasError={eventsError}
        onRetry={() => void refetchCandidates()}
        onQueryChange={setSearchTerm}
        headerExtra={truncationHint}
      />
      {/* 추가 상위 연결 — 엣지 추가는 아무것도 끊지 않으므로 confirm 없음.
          이미 연결된 후보는 체크 표시, 재클릭 시 해제 토글. */}
      <SelectModal
        isOpen={extrasModalOpen}
        onClose={() => {
          setExtrasModalOpen(false)
          setSearchTerm('')
        }}
        title="추가 상위 연결"
        options={extrasOptions}
        multiple
        selectedValues={extraIds}
        onSelect={(id) => toggleExtraParent(id)}
        searchable
        searchPlaceholder="사건명으로 검색 (하위 사건 포함)"
        isLoading={eventsLoading}
        isSearching={searchPending}
        hasError={eventsError}
        onRetry={() => void refetchCandidates()}
        onQueryChange={setSearchTerm}
        headerExtra={truncationHint}
      />
      {/* 상위 해제 시 승격 대상 선택 — 추가 상위 2개 이상일 때만 열림. 후보가 소수라
          검색 미탑재, '모든 상위 해제'는 선택 후 danger confirm 경유. */}
      <SelectModal
        isOpen={promotePickerOpen}
        onClose={() => setPromotePickerOpen(false)}
        title="새 대표 상위 선택"
        options={promoteOptions}
        onSelect={(pickedId) => void handlePromotePick(pickedId)}
      />

      {/* 새 하위 사건 등록 — 열 때만 마운트(폼 청크 lazy 로드), 닫으면 언마운트. */}
      {createChildOpen && (
        <Suspense fallback={null}>
          <LazyEventRegisterModal
            isOpen
            onClose={() => setCreateChildOpen(false)}
            initialParent={{ id: event.id, title: event.title }}
            onSaved={handleChildCreated}
            // 뒤로가기 미저장 보호(위 useBlocker)의 dirty 신호원.
            onDirtyChange={handleCreateChildDirtyChange}
          />
        </Suspense>
      )}
    </S.Section>
  )
}
