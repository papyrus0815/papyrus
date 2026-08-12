import { useMemo, useState } from 'react'

import { keepPreviousData, useQuery } from '@tanstack/react-query'

import {
  type EventLinkCandidate,
  getEventLinkCandidates,
} from '@/shared/api/events'
import { formatDateRange } from '@/pages/events/utils/events.utils'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { formatYearLabel } from '@/shared/lib/iso-date'
import { type SelectOption } from '@/shared/ui/select-modal/select-modal'

import * as NetStyles from './detail-network.styles'

interface UseLinkCandidatePickerArgs {
  /** 현재 사건 id — 후보 목록에서 자기 자신 제외 + '이 사건의 하위' 설명 판정. */
  eventId: string
  /** 주 상위 id — 하위/추가 상위 피커에서 INV-1 중복 후보 제외. */
  parentEventId: string | null | undefined
  /** 현재 하위 id 목록 — 상위/추가 상위 피커의 직계 순환 후보 제외. */
  childIds: string[]
  /** 추가 상위 id 목록 — 하위 피커 제외 + 상위 피커 '대표 승격' 안내 문구. */
  extraIds: string[]
  /** 추가 하위(역방향 엣지) id 목록 — 직계 2-cycle 선차단. */
  extraChildIds: string[]
  parentModalOpen: boolean
  childModalOpen: boolean
  extrasModalOpen: boolean
}

/**
 * 상위·하위·추가 상위 SelectModal 3종이 공유하는 링크 후보 검색 파이프라인.
 *
 * 후보는 서버사이드 검색(GET /events/link-candidates). 과거엔 목록 API(최상위만·
 * 100건 캡)를 재사용해 이미 하위인 사건·오래된 사건이 검색에 안 잡혔다. 검색어는
 * 디바운스 후 서버로, 모달 내부 필터는 그대로 동작(서버 결과는 항상 검색어를
 * 포함하므로 무손실). 피커별 옵션(parent/child/extras)은 직계 순환·INV-1 중복을
 * 여기서 선차단해 조립한다.
 */
export function useLinkCandidatePicker({
  eventId,
  parentEventId,
  childIds,
  extraIds,
  extraChildIds,
  parentModalOpen,
  childModalOpen,
  extrasModalOpen,
}: UseLinkCandidatePickerArgs) {
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

  /* 선택 옵션 — 자기 자신 제외, 표시 상한 50(51번째는 '더 있음' 신호라 제외). 날짜 +
   * 현재 소속(이미 하위인 경우)을 설명 라인에. */
  const eventOptions = useMemo<SelectOption[]>(
    () =>
      candidates
        .slice(0, 50)
        .filter((candidate) => candidate.id !== eventId)
        .map((candidate) => ({
          value: candidate.id,
          label: candidate.title,
          description: candidateDescription(candidate, eventId),
        })),
    [candidates, eventId],
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
          option.value !== parentEventId && !extraIds.includes(option.value),
      ),
    [eventOptions, parentEventId, extraIds],
  )
  /* 추가 상위 후보 — 주 상위(INV-1 중복)·현재 자식(직계 순환) 제외. 이미 연결된
   * 후보는 체크 표시로 남겨 재클릭 시 해제 토글(숨김 금지 — G7). */
  const extrasOptions = useMemo(
    () =>
      eventOptions.filter(
        (option) =>
          option.value !== parentEventId &&
          !childIds.includes(option.value) &&
          // 역방향 엣지(추가 하위) — 직계 2-cycle 선차단
          !extraChildIds.includes(option.value),
      ),
    [eventOptions, parentEventId, childIds, extraChildIds],
  )

  /* 51건 요청 중 50건 초과가 실제로 왔을 때만 잘림 알림 — 정확히 50건(더 없음)은 오탐 안 함. */
  const truncationHint =
    candidates.length > 50 ? (
      <NetStyles.TruncationNote>
        후보가 많아 50건까지만 표시 중 — 검색어로 좁혀 주세요
      </NetStyles.TruncationNote>
    ) : undefined

  return {
    /** 원본 후보 목록 — 하위 연결 confirm 흐름의 후보 lookup(toggleChild)용. */
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
  }
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
