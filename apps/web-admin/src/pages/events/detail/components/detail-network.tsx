import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'

import { FiChevronLeft, FiChevronRight, FiPlus, FiX } from 'react-icons/fi'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
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
  getEventsByParentId,
  updateEvent,
} from '@/shared/api/events'
import { formatDateRange } from '@/pages/events/utils/events.utils'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { formatYearLabel } from '@/shared/lib/iso-date'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog'
import { InlineText } from '@/shared/ui/inline-edit'
import { SelectModal, type SelectOption } from '@/shared/ui/select-modal/select-modal'
import { notify } from '@/shared/ui/toast'

import * as S from '../styles'
import {
  type EventDetail,
  eventKeys,
  usePrefetchEventDetail,
} from '../use-event-detail'

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

/** 하위 사건 카드 표시 상한 — 초과분은 '더 보기'로 펼침. */
const CHILD_CARD_CAP = 24

/** 추가 하위(역방향 엣지) 칩 표시 상한 — 카드보다 밀도 높은 칩이라 별도 상한. */
const EXTRA_CHILD_CAP = 12

/**
 * 계층 연결 사유 최대 글자 수 — 서버 EVENT_LINK_REASON_MAX(update-event.dto.ts)·
 * Prisma VarChar(500)와 동일 값. 크로스 패키지라 손 동기화.
 */
const REASON_MAX = 500

const REASON_PLACEHOLDER =
  '이 사건이 상위와 어떻게 이어지는지 한두 문장 (예: 병합을 서두르게 만든 직접적 계기)'

/** 승격 픽커의 '모든 상위 해제' 탈출구 옵션 값 — 사건 id와 충돌하지 않는 sentinel. */
const PROMOTE_CLEAR_ALL_VALUE = '__clear-all-parents__'

/**
 * 사건의 계층·횡적 네트워크 — 상위 사건 + 하위 사건 + 키워드.
 *
 * 상위는 지정/변경/해제하는 단일 링크 행. 하위는 시간 순으로 정렬된 카드 그리드로,
 * 각 카드 클릭 시 해당 사건 상세로(카드 상한 초과분은 '더 보기'로 펼침).
 * 키워드는 inline chip — 칩의 ✕로 제거, "+" 인풋으로 추가. 별도 폼 X.
 */
export function DetailNetwork({ event, onPatch }: DetailNetworkProps) {
  const prefetchEvent = usePrefetchEventDetail()
  const queryClient = useQueryClient()

  /* '새 하위 사건 만들기' — 기존 사건 연결(SelectModal)이 아니라 등록 모달을
   * initialParent={현재 사건}으로 열어, 고아 생성→상세 이동→수동 연결 3단계를
   * 등록 1단계로 줄인다. */
  const [createChildOpen, setCreateChildOpen] = useState(false)

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

  // 하위 카드는 상한까지만 렌더(그 이상은 '더 보기'로 펼침) — 하위가 수십~수백인 상위
  // 사건에서 카드 그리드·hover prefetch가 무한 확장되지 않게(히어로의 참여자/국가 캡과 대칭).
  const [showAllChildren, setShowAllChildren] = useState(false)
  const visibleChildren = showAllChildren
    ? children
    : children.slice(0, CHILD_CARD_CAP)
  const hiddenChildCount = children.length - visibleChildren.length

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
  const [extrasModalOpen, setExtrasModalOpen] = useState(false)
  // 상위 해제 시 승격 대상 선택 픽커 — 추가 상위 2개 이상일 때만 열림(검색 미사용).
  const [promotePickerOpen, setPromotePickerOpen] = useState(false)
  // 추가 상위 칩의 연결 사유 편집 라인 — 한 번에 하나만 펼침(칩 행 밀도 유지).
  const [openExtraReasonId, setOpenExtraReasonId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  // 모달 열림/닫힘 시 debounced를 즉시 현재값으로 스냅 — 닫기 직전 검색어가 250ms
  // 동안 남아 다른 모달 첫 화면에 이전 결과가 비치는 것을 방지.
  const debouncedTerm = useDebouncedValue(
    searchTerm,
    250,
    `${parentModalOpen}:${childModalOpen}:${extrasModalOpen}`,
  )
  const {
    data: candidates = [],
    isLoading: eventsLoading,
    isFetching: eventsFetching,
    isError: eventsError,
    refetch: refetchCandidates,
  } = useQuery({
    // ['events'] 프리픽스(eventKeys.lists()) 아래 — 사건 mutation 시 함께 무효화된다.
    queryKey: ['events', 'link-candidates', debouncedTerm],
    // limit은 표시 상한(50)보다 1 크게 요청 — 정확히 50건일 때 '더 있음' 오탐을 피하고
    // (>50일 때만 절단), 51번째는 표시하지 않고 '더 있음' 신호로만 쓴다.
    queryFn: () => getEventLinkCandidates({ query: debouncedTerm, limit: 51 }),
    enabled: parentModalOpen || childModalOpen || extrasModalOpen,
    staleTime: 60_000,
    // 검색어 타이핑 중 이전 결과를 유지 — 목록이 '불러오는 중'으로 깜빡이지 않게.
    placeholderData: keepPreviousData,
    // 전역 retry:false를 이 조회에 한해 완화 — 일시 네트워크 오류로 '결과 없음' 위장 방지.
    retry: 1,
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

  // 사유 편집 open 상태가 해제된 칩 id로 잔존하면 같은 사건을 재연결할 때 편집 라인이
  // 유령처럼 재개방된다 — 현재 extras에 없는 id면 리셋.
  useEffect(() => {
    if (openExtraReasonId && !extraIds.includes(openExtraReasonId)) {
      setOpenExtraReasonId(null)
    }
  }, [extraIds, openExtraReasonId])

  /* 추가 하위(역방향 엣지) id 집합 — childIds와 대칭. 상위/추가 상위 후보에서 걸러
   * 직계 2-cycle(선택 즉시 서버 409 스냅백)을 선차단한다. */
  const extraChildIds = useMemo(
    () => (event.extraChildren ?? []).map((extraChild) => extraChild.id),
    [event.extraChildren],
  )

  /* 선택 옵션 — 자기 자신 제외, 표시 상한 50(51번째는 '더 있음' 신호라 제외). 날짜 +
   * 현재 소속(이미 하위인 경우)을 설명 라인에. */
  const eventOptions = useMemo<SelectOption[]>(
    () =>
      candidates
        .slice(0, 50)
        .filter((candidate) => candidate.id !== event.id)
        .map((candidate) => ({
          value: candidate.id,
          label: candidate.title,
          description: candidateDescription(candidate, event.id),
        })),
    [candidates, event.id],
  )

  /* 직계 순환은 후보에서 제외 — 상위 피커엔 현재 자식·추가 하위 불가, 하위 피커엔
   * 현재 부모·추가 상위 불가(서버 detach 409·INV-1 선차단). 깊은 순환은 서버 BFS가 409.
   * 상위 피커에서 현재 '추가 상위'인 후보는 숨기지 않고 안내를 달아 선택 시
   * 대표 승격(서버 W2-(a-2) 자동 collapse)으로 동작하게 둔다. */
  const parentOptions = useMemo(
    () =>
      eventOptions
        .filter(
          (option) =>
            !childIds.includes(option.value) &&
            // 역방향 엣지(추가 하위) — 직계 2-cycle 선차단
            !extraChildIds.includes(option.value),
        )
        .map((option) =>
          extraIds.includes(option.value)
            ? {
                ...option,
                description: [
                  option.description,
                  '현재 이 사건의 추가 상위 — 선택 시 대표로 승격',
                ]
                  .filter(Boolean)
                  .join(' · '),
              }
            : option,
        ),
    [eventOptions, childIds, extraIds, extraChildIds],
  )
  const childOptions = useMemo(
    () =>
      eventOptions.filter(
        (option) =>
          option.value !== event.parentEventId &&
          !extraIds.includes(option.value),
      ),
    [eventOptions, event.parentEventId, extraIds],
  )
  /* 추가 상위 후보 — 주 상위(INV-1 중복)·현재 자식(직계 순환) 제외. 이미 연결된
   * 후보는 체크 표시로 남겨 재클릭 시 해제 토글(숨김 금지 — G7). */
  const extrasOptions = useMemo(
    () =>
      eventOptions.filter(
        (option) =>
          option.value !== event.parentEventId &&
          !childIds.includes(option.value) &&
          // 역방향 엣지(추가 하위) — 직계 2-cycle 선차단
          !extraChildIds.includes(option.value),
      ),
    [eventOptions, event.parentEventId, childIds, extraChildIds],
  )

  // 크로스 사건 mutation 진행 가드 — confirm 연쇄·PUT 왕복 동안 재클릭 차단.
  const crossLinkPendingRef = useRef(false)

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

  /* 제거 버튼 포커스 이양용 ref — 칩/카드를 지우면 포커스가 body로 낙하해 키보드
   * 흐름이 끊기므로, 제거 직전 다음 형제의 제거 버튼(없으면 그룹 '추가' 버튼)으로 옮긴다. */
  const childRemoveRefs = useRef(new Map<string, HTMLButtonElement>())
  const childAddRef = useRef<HTMLButtonElement | null>(null)
  const extraRemoveRefs = useRef(new Map<string, HTMLButtonElement>())
  const extrasAddRef = useRef<HTMLButtonElement | null>(null)
  const keywordRemoveRefs = useRef(new Map<string, HTMLButtonElement>())
  const keywordAddRef = useRef<HTMLButtonElement | null>(null)

  const removeChild = (childId: string) => {
    focusNextRemovalTarget(
      childRemoveRefs.current,
      childIds,
      childId,
      childAddRef.current,
    )
    onPatch({ childEventIds: childIds.filter((id) => id !== childId) })
  }

  /** 상위 사건 지정/변경/해제. 해제는 null을 명시 전송해야 FK가 비워진다. */
  const setParent = (parentId: string | null) => {
    onPatch({ parentEventId: parentId } as UpdateEventDto)
    setParentModalOpen(false)
    setSearchTerm('')
  }

  /* 51건 요청 중 50건 초과가 실제로 왔을 때만 잘림 알림 — 정확히 50건(더 없음)은 오탐 안 함. */
  const truncationHint =
    candidates.length > 50 ? (
      <TruncationNote>
        후보가 많아 50건까지만 표시 중 — 검색어로 좁혀 주세요
      </TruncationNote>
    ) : undefined

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
   * 연결 사유 저장 — 부분 업서트. 빈 문자열은 서버가 삭제로 정규화(행 제거).
   * parentLinkReasons: 이 사건이 자식인 쌍(주 상위·추가 상위). childLinkReasons: 부모인 쌍(하위).
   * 링크가 실제로 있는 쌍에만 유효(연결 안 된 상위/하위엔 서버가 400) — UI는 이미
   * 연결된 항목 옆에서만 편집을 노출하므로 정상 흐름에선 도달 안 함.
   */
  const saveParentReason = (parentId: string, next: string) => {
    onPatch({
      parentLinkReasons: [{ parentEventId: parentId, reason: next }],
    } as UpdateEventDto)
  }
  const saveChildReason = (childId: string, next: string) => {
    onPatch({
      childLinkReasons: [{ childEventId: childId, reason: next }],
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
      setParent(null)
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
        setParent(null)
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

  /* 형제(같은 상위) 사건 — 하위 사건 상세에서 부모 왕복 없이 이전/다음으로 이동.
   * 상위가 있을 때만 조회. 부모의 하위 목록(미삭제)을 시간순 정렬해 현재 위치의 앞뒤를 잡는다. */
  const { data: siblings = [] } = useQuery({
    queryKey: ['events', 'siblings', event.parentEventId],
    queryFn: () => getEventsByParentId(event.parentEventId as string),
    enabled: Boolean(event.parentEventId),
    staleTime: 60_000,
  })
  const sortedSiblings = useMemo(
    () =>
      siblings
        .slice()
        .sort((first, second) =>
          compareEventStart(first.startDate, second.startDate),
        ),
    [siblings],
  )
  const siblingIndex = sortedSiblings.findIndex(
    (sibling) => sibling.id === event.id,
  )
  const prevSibling = siblingIndex > 0 ? sortedSiblings[siblingIndex - 1] : null
  const nextSibling =
    siblingIndex >= 0 && siblingIndex < sortedSiblings.length - 1
      ? sortedSiblings[siblingIndex + 1]
      : null

  /* 추가 하위(역방향 엣지) — 읽기전용 표시. 상한 초과분은 '더 보기'로 펼침. */
  const extraChildren = event.extraChildren ?? []
  const [showAllExtraChildren, setShowAllExtraChildren] = useState(false)
  const visibleExtraChildren = showAllExtraChildren
    ? extraChildren
    : extraChildren.slice(0, EXTRA_CHILD_CAP)
  const hiddenExtraChildCount = extraChildren.length - visibleExtraChildren.length

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

  const removeKeyword = (keyword: string) => {
    focusNextRemovalTarget(
      keywordRemoveRefs.current,
      keywords,
      keyword,
      keywordAddRef.current,
    )
    onPatch({ keywords: keywords.filter((item) => item !== keyword) })
  }

  return (
    <S.Section id="network">
      <S.SectionHeader>
        <S.SectionTitle>연관</S.SectionTitle>
        {relationSummary && (
          <S.SectionSubtitle>{relationSummary}</S.SectionSubtitle>
        )}
      </S.SectionHeader>

      {/* 상위 사건 — 지정/변경/해제 */}
      <HierBlock role="group" aria-labelledby="network-parent-label">
        <KeywordsLabel id="network-parent-label">상위 사건</KeywordsLabel>
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
              <TextBtn
                type="button"
                onClick={() => setParentModalOpen(true)}
                aria-label="상위 사건 변경"
              >
                변경
              </TextBtn>
              <TextBtn
                type="button"
                onClick={() => void releaseParent()}
                aria-label="상위 사건 해제"
              >
                해제
              </TextBtn>
            </>
          ) : (
            <AddBtn type="button" onClick={() => setParentModalOpen(true)}>
              <FiPlus /> 상위 사건 지정
            </AddBtn>
          )}
        </HierRow>
        {/* 주 상위 연결 사유 — '왜 이 사건이 대표 상위와 이어지는가'. 주/부가 사용자에겐
            한 개념이라 대표 관계에도 사유를 적을 수 있게(비대칭 해소). */}
        {parentEvent && (
          <ReasonLine>
            <ReasonKicker>연결 사유</ReasonKicker>
            <InlineText
              value={event.parentLinkReason ?? ''}
              onSave={(next) => saveParentReason(parentEvent.id, next)}
              placeholder="연결 사유 추가"
              label={`'${parentEvent.title}' 연결 사유`}
              multiline
              maxLength={REASON_MAX}
              showCount
              style={{ flex: 1 }}
            />
          </ReasonLine>
        )}
        {/* 추가 상위 — 주 상위 외 다중 상위(EventParentLink). 트리·breadcrumb·형제는
            주 상위 기준이고, 이 칩 행이 다중 소속 발견성의 정본 지면. 편집(추가·해제·
            승격)은 자식인 이 사건 쪽에서만. */}
        <ExtraParentsRow>
          <ExtraInlineLabel id="network-extra-parents-label">
            추가 상위
          </ExtraInlineLabel>
          {extraParents.map((extra) => (
            <ExtraChip key={extra.id}>
              <ExtraChipLink
                to={pathKeys.events.detail(extra.id)}
                viewTransition
                onMouseEnter={() => prefetchEvent(extra.id)}
                onFocus={() => prefetchEvent(extra.id)}
                aria-describedby={
                  extra.reason ? `extra-reason-${extra.id}` : undefined
                }
              >
                {extra.title || '(제목 동기화 중)'}
              </ExtraChipLink>
              {extra.reason && (
                <VisuallyHidden id={`extra-reason-${extra.id}`}>
                  연결 사유: {extra.reason}
                </VisuallyHidden>
              )}
              <ReasonToggleBtn
                type="button"
                onClick={() =>
                  setOpenExtraReasonId((cur) =>
                    cur === extra.id ? null : extra.id,
                  )
                }
                aria-expanded={openExtraReasonId === extra.id}
                aria-controls={
                  openExtraReasonId === extra.id
                    ? 'network-extra-reason-editor'
                    : undefined
                }
                aria-label={`추가 상위 '${extra.title}' 연결 사유 ${
                  extra.reason ? '편집' : '추가'
                }`}
                $hasReason={Boolean(extra.reason)}
                title={extra.reason ?? undefined}
              >
                사유{extra.reason ? '•' : ''}
              </ReasonToggleBtn>
              <TextBtn
                type="button"
                onClick={() => promoteExtraParent(extra.id)}
                aria-label={`'${extra.title}'을(를) 대표 상위로 승격`}
                disabled={!parentEvent}
                title={!parentEvent ? '주 상위가 없어 승격 대신 상위 지정을 사용하세요' : undefined}
              >
                승격
              </TextBtn>
              <ChipX
                type="button"
                ref={(node) => {
                  if (node) extraRemoveRefs.current.set(extra.id, node)
                  else extraRemoveRefs.current.delete(extra.id)
                }}
                onClick={() => removeExtraParent(extra.id)}
                aria-label={`추가 상위 '${extra.title}' 해제`}
              >
                <FiX />
              </ChipX>
            </ExtraChip>
          ))}
          <AddBtn
            type="button"
            ref={extrasAddRef}
            onClick={() => setExtrasModalOpen(true)}
            disabled={!parentEvent}
            aria-describedby={
              !parentEvent ? 'network-extra-parents-helper' : undefined
            }
          >
            <FiPlus /> 추가
          </AddBtn>
          {!parentEvent && (
            <HelperNote id="network-extra-parents-helper">
              먼저 상위 사건을 지정하세요
            </HelperNote>
          )}
        </ExtraParentsRow>
        {/* 추가 상위 연결 사유 편집 라인 — 열린 칩 하나만. 칩 행 밀도를 지키려 별도 라인. */}
        {openExtraReasonId &&
          (() => {
            const openExtra = extraParents.find(
              (extra) => extra.id === openExtraReasonId,
            )
            if (!openExtra) return null
            return (
              <ReasonLine id="network-extra-reason-editor">
                <ReasonKicker>{openExtra.title} · 사유</ReasonKicker>
                <InlineText
                  key={openExtra.id}
                  value={openExtra.reason ?? ''}
                  onSave={(next) => saveParentReason(openExtra.id, next)}
                  placeholder={REASON_PLACEHOLDER}
                  label={`'${openExtra.title}' 연결 사유`}
                  multiline
                  maxLength={REASON_MAX}
                  showCount
                  style={{ flex: 1 }}
                />
              </ReasonLine>
            )
          })()}
        {parentEvent && (prevSibling || nextSibling) && (
          <SiblingNav aria-label="형제 사건 이동">
            {prevSibling ? (
              <SiblingLink
                to={pathKeys.events.detail(prevSibling.id)}
                viewTransition
                onMouseEnter={() => prefetchEvent(prevSibling.id)}
                onFocus={() => prefetchEvent(prevSibling.id)}
                aria-label={`이전 형제 사건: ${prevSibling.title}`}
              >
                <FiChevronLeft aria-hidden />
                <SiblingText>{prevSibling.title}</SiblingText>
              </SiblingLink>
            ) : (
              <span />
            )}
            {nextSibling && (
              <SiblingLink
                to={pathKeys.events.detail(nextSibling.id)}
                viewTransition
                onMouseEnter={() => prefetchEvent(nextSibling.id)}
                onFocus={() => prefetchEvent(nextSibling.id)}
                aria-label={`다음 형제 사건: ${nextSibling.title}`}
                $alignEnd
              >
                <SiblingText>{nextSibling.title}</SiblingText>
                <FiChevronRight aria-hidden />
              </SiblingLink>
            )}
          </SiblingNav>
        )}
      </HierBlock>

      {/* 하위 사건 — 카드 그리드 + 추가/제거 */}
      <HierBlock role="group" aria-labelledby="network-children-label">
        <KeywordsLabel id="network-children-label">하위 사건</KeywordsLabel>
        {children.length > 0 && (
          <S.CardGrid $cols={2}>
            {visibleChildren.map((child) => {
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
                    ref={(node) => {
                      if (node) childRemoveRefs.current.set(child.id, node)
                      else childRemoveRefs.current.delete(child.id)
                    }}
                    onClick={() => removeChild(child.id)}
                    aria-label={`${child.title} 하위 연결 해제`}
                  >
                    <FiX />
                  </RemoveChildBtn>
                  {/* 연결 사유 — 카드(Link) 바깥 형제로 배치(a 안에 button/textarea 중첩 금지).
                      onPatch({ childLinkReasons })는 자기 사건 채널이라 undo 토스트 탑승. */}
                  <ChildReasonRow>
                    <InlineText
                      value={child.reason ?? ''}
                      onSave={(next) => saveChildReason(child.id, next)}
                      placeholder="연결 사유 추가"
                      label={`'${child.title}' 연결 사유`}
                      multiline
                      maxLength={REASON_MAX}
                      showCount
                      style={{ flex: 1 }}
                    />
                  </ChildReasonRow>
                </ChildCardWrap>
              )
            })}
          </S.CardGrid>
        )}
        {hiddenChildCount > 0 && (
          <TextBtn
            type="button"
            onClick={() => setShowAllChildren(true)}
            aria-label={`하위 사건 ${hiddenChildCount}개 더 보기`}
          >
            외 {hiddenChildCount}개 더 보기
          </TextBtn>
        )}
        <HierRow>
          <AddBtn
            type="button"
            ref={childAddRef}
            onClick={() => setChildModalOpen(true)}
          >
            <FiPlus /> 하위 사건 추가
          </AddBtn>
          <AddBtn type="button" onClick={() => setCreateChildOpen(true)}>
            <FiPlus /> 새 하위 사건 만들기
          </AddBtn>
        </HierRow>
      </HierBlock>

      {/* 추가 하위(역방향 엣지) — 이 사건을 '추가 상위'로 갖는 사건들. 읽기전용 —
          엣지 편집은 자식 사건 쪽으로 단일화(양방향 쓰기 지면은 계약 혼선·경합 유발). */}
      {extraChildren.length > 0 && (
        <HierBlock role="group" aria-labelledby="network-extra-children-label">
          <KeywordsLabel id="network-extra-children-label">
            추가 하위
          </KeywordsLabel>
          <KeywordsRow>
            {visibleExtraChildren.map((extraChild) => (
              <ExtraChip key={extraChild.id}>
                <ExtraChipLink
                  to={pathKeys.events.detail(extraChild.id)}
                  viewTransition
                  onMouseEnter={() => prefetchEvent(extraChild.id)}
                  onFocus={() => prefetchEvent(extraChild.id)}
                  title={extraChild.reason ?? undefined}
                  aria-describedby={
                    extraChild.reason
                      ? `extra-child-reason-${extraChild.id}`
                      : undefined
                  }
                >
                  {extraChild.title}
                </ExtraChipLink>
                {extraChild.reason && (
                  <VisuallyHidden id={`extra-child-reason-${extraChild.id}`}>
                    연결 사유: {extraChild.reason}
                  </VisuallyHidden>
                )}
              </ExtraChip>
            ))}
            {hiddenExtraChildCount > 0 && (
              <TextBtn
                type="button"
                onClick={() => setShowAllExtraChildren(true)}
                aria-label={`추가 하위 ${hiddenExtraChildCount}개 더 보기`}
              >
                외 {hiddenExtraChildCount}개 더 보기
              </TextBtn>
            )}
          </KeywordsRow>
          <HelperNote>연결 편집은 해당 사건의 &lsquo;추가 상위&rsquo;에서</HelperNote>
        </HierBlock>
      )}

      <KeywordsBlock role="group" aria-labelledby="network-keywords-label">
        <KeywordsLabel id="network-keywords-label">키워드</KeywordsLabel>
        <KeywordsRow>
          {keywords.map((keyword) => (
            <KeywordChip key={keyword}>
              <span>{keyword}</span>
              <ChipX
                type="button"
                ref={(node) => {
                  if (node) keywordRemoveRefs.current.set(keyword, node)
                  else keywordRemoveRefs.current.delete(keyword)
                }}
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
              onChange={(changeEvent) => setDraft(changeEvent.target.value)}
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
            <AddBtn
              type="button"
              ref={keywordAddRef}
              onClick={() => setAdding(true)}
            >
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
          />
        </Suspense>
      )}
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
    // BC는 부호 연도로 접어 shared 포매터 단일출처로 표기(수제 '기원전' 조립 금지).
    const start = formatYearLabel(
      candidate.startEra === 'BC' ? -candidate.startYear : candidate.startYear,
    )
    if (candidate.endYear != null) {
      const end = formatYearLabel(
        candidate.endEra === 'BC' ? -candidate.endYear : candidate.endYear,
      )
      if (end !== start) return `${start} ~ ${end}`
    }
    return start
  }
  return null
}

/**
 * 칩/카드 제거 시 포커스 이양 — 제거 버튼에 있던 포커스가 body로 낙하하지 않게,
 * 렌더 순서상 다음 형제의 제거 버튼(없거나 표시 캡 밖이면 그룹 '추가' 버튼)으로 옮긴다.
 * 다음 형제 DOM은 제거 re-render 후에도 살아남으므로 제거 직전 즉시 focus해도 유지된다.
 */
function focusNextRemovalTarget(
  removeButtonRefs: Map<string, HTMLButtonElement>,
  orderedIds: readonly string[],
  removedId: string,
  fallback: HTMLButtonElement | null,
) {
  const removedIndex = orderedIds.indexOf(removedId)
  const nextId = removedIndex >= 0 ? orderedIds[removedIndex + 1] : undefined
  const nextTarget = nextId ? removeButtonRefs.get(nextId) : undefined
  ;(nextTarget ?? fallback)?.focus()
}

/**
 * 서버 에러 → 사용자 문구 — use-event-mutation.ts friendlyErrorMessage의 지역 미러
 * (비export 함수라 크로스 사건 채널용으로 복제). nestia HttpError.message는 응답
 * 본문(JSON) 원문이라 순환 409 등이 `{"message":…}` 블롭으로 뜬다 — message만 추출.
 */
function crossPatchErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return '알 수 없는 오류'
  const raw =
    typeof (error as { message?: unknown }).message === 'string'
      ? (error as { message: string }).message
      : ''
  const pickMessage = (text: string): string | null => {
    try {
      const parsed = JSON.parse(text) as { message?: unknown }
      if (typeof parsed.message === 'string') return parsed.message
      if (Array.isArray(parsed.message)) return parsed.message.join(', ')
    } catch {
      /* JSON 아님 */
    }
    return null
  }
  const direct = pickMessage(raw)
  if (direct) return direct
  const braceIndex = raw.indexOf('{')
  if (braceIndex >= 0) {
    const sliced = pickMessage(raw.slice(braceIndex))
    if (sliced) return sliced
  }
  return raw || '알 수 없는 오류'
}

/** 후보 설명 라인 — 날짜 · 현재 소속 상위 사건("이미 하위" 안내). */
function candidateDescription(
  candidate: EventLinkCandidate,
  currentEventId: string,
): string | undefined {
  const parts: string[] = []
  const dateLabel = candidateDateLabel(candidate)
  if (dateLabel) parts.push(dateLabel)
  const extraCount = candidate.extraParents?.length ?? 0
  const extraBadge = extraCount > 0 ? ` (+${extraCount})` : ''
  if (candidate.parentEventId === currentEventId) {
    parts.push(`이 사건의 하위${extraBadge}`)
  } else if (candidate.parentEventId) {
    parts.push(
      `현재 '${candidate.parentEventTitle ?? '다른 사건'}'의 하위${extraBadge}`,
    )
  }
  return parts.length > 0 ? parts.join(' · ') : undefined
}

/**
 * 사건 시작일 비교 — JS `Date`는 BC(음수 연도) 일부 표기를 NaN으로 떨굼.
 * Papyrus는 역사 사건을 다루므로 *연·월·일 토큰을 직접 파싱*해 정수 비교한다.
 * 비교 우선순위: 연도 → 월 → 일. 입력 누락은 가장 뒤로 정렬.
 */
function compareEventStart(
  first: string | null | undefined,
  second: string | null | undefined,
): number {
  const firstTokens = parseEventDateTokens(first)
  const secondTokens = parseEventDateTokens(second)
  if (firstTokens == null && secondTokens == null) return 0
  if (firstTokens == null) return 1
  if (secondTokens == null) return -1
  if (firstTokens.year !== secondTokens.year)
    return firstTokens.year - secondTokens.year
  if (firstTokens.month !== secondTokens.month)
    return firstTokens.month - secondTokens.month
  return firstTokens.day - secondTokens.day
}

function parseEventDateTokens(
  input: string | null | undefined,
): { year: number; month: number; day: number } | null {
  if (!input) return null
  // 선택적 부호 + 1~6자리 연도, 월·일은 선택적.
  const matched = input.match(/^(-?\d{1,6})(?:-(\d{1,2}))?(?:-(\d{1,2}))?/)
  if (!matched || !matched[1]) return null
  const year = parseInt(matched[1], 10)
  if (!Number.isFinite(year)) return null
  const month = matched[2] ? parseInt(matched[2], 10) : 1
  const day = matched[3] ? parseInt(matched[3], 10) : 1
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

const ExtraParentsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`

const ExtraInlineLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ExtraChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
`

const ExtraChipLink = styled(Link)`
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover,
  &:focus-visible {
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 3px;
    outline: none;
  }
`

const HelperNote = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/* 연결 사유 편집 라인 — 주 상위 행/추가 상위 칩 아래. 좌측 얇은 킥커 + InlineText. */
const ReasonLine = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding-left: 2px;
  font-size: 12.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const ReasonKicker = styled.span`
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

/* 하위 카드의 연결 사유 라인 — 카드 바로 아래, 카드 내용과 좌측 정렬(막대+갭 만큼 들여쓰기). */
const ChildReasonRow = styled.div`
  display: flex;
  padding: 0 14px 0 29px;
  font-size: 12px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`

const SiblingNav = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 2px;
`

const SiblingLink = styled(Link)<{ $alignEnd?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 48%;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-decoration: none;
  justify-content: ${({ $alignEnd }) => ($alignEnd ? 'flex-end' : 'flex-start')};
  margin-left: ${({ $alignEnd }) => ($alignEnd ? 'auto' : '0')};

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.colors.text.primary};
    outline: none;
  }

  svg {
    width: 13px;
    height: 13px;
    flex-shrink: 0;
  }
`

const SiblingText = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const TextBtn = styled.button`
  /* 최소 24×24 터치 타깃(WCAG 2.5.8) — 12px 텍스트라도 클릭 영역은 24px 확보. */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  min-width: 24px;
  padding: 0 4px;
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

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
    border-radius: 4px;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`

/* 칩 '사유' 토글 버튼 — TextBtn 계열, 사유 보유 시 강조·펼침 시 primary. */
const ReasonToggleBtn = styled(TextBtn)<{ $hasReason?: boolean }>`
  color: ${({ theme, $hasReason }) =>
    $hasReason ? theme.colors.text.primary : theme.colors.text.tertiary};

  &[aria-expanded='true'] {
    color: ${({ theme }) => theme.colors.primary};
  }
`

const ChildCardWrap = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;

  /* 카드 호버 시 제거 버튼만 노출 — 직계 자식 button으로 한정(연결 사유 InlineText의
     편집 펜슬은 InlineText 자체 hover/focus-within 규칙을 따르도록 건드리지 않는다). */
  &:hover > button {
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

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;

    &:hover {
      border-color: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
      color: ${({ theme }) => theme.colors.text.secondary};
    }
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
