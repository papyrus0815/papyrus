import { useRef } from 'react'

import {
  type QueryClient,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'

import {
  type EventLinkCandidate,
  type UpdateEventDto,
  updateEvent,
} from '@/shared/api/events'
import { notify } from '@/shared/ui/toast'

import {
  type EventDetail,
  type EventDetailCountryRef,
  type EventDetailHistoricalCountryRef,
  type EventDetailImage,
  type EventDetailPerson,
  eventKeys,
} from './use-event-detail'

/**
 * 그대로 캐시에 직접 덮어써도 되는 *스칼라* 필드(derived 객체 없음).
 *
 * categoryId·related*·eventImages는 derived 객체(category/relatedCountries/…)로 표시되어
 * patch의 id/원본만으론 부족하므로, buildOptimisticEvent에서 별도로 재구성한다.
 * parentEventId·childEventIds(계층)도 파생 객체(parentEvent/childEvents)로 표시되어
 * buildOptimisticEvent의 전용 분기에서 link-candidates 캐시로 재구성한다(스칼라가 아니라
 * 이 목록엔 없음). eventSections(→DetailNarrative 로컬 state로 이미 즉시 반영)만 낙관
 * 대상에서 제외하고 refetch로만 반영한다.
 */
const OPTIMISTIC_SCALAR_FIELDS = [
  'title',
  'description',
  'location',
  'background',
  'aftermath',
  'warCost',
  'startDate',
  'endDate',
  'startDatePrecision',
  'endDatePrecision',
  'keywords',
  /**
   * 앵커 오버라이드 — 순수 스칼라라 여기 합류시키면 낙관 반영이 끝난다.
   * 빠지면 '최상위 사건으로 지정'을 눌러도 refetch(최대 30s staleTime) 전까지
   * 배지가 그대로라, 클릭이 먹지 않은 것처럼 보인다.
   * `k in patch` 판정이라 null(자동 판정 복귀)도 정확히 반영된다.
   */
  'anchorOverride',
] as const satisfies ReadonlyArray<keyof UpdateEventDto>

/**
 * 사건 부분 업데이트 — `UpdateEventDto`의 모든 필드는 optional이라
 * 호출 측이 변경된 필드만 담아 보내면 서버가 나머지는 건드리지 않는다
 * (`event.service.ts` Prisma partial update — `undefined` = 변경 안 함).
 *
 * 배열 필드(eventSections·eventImages·relatedCountryIds 등)는 서버가
 * "delete-and-recreate" 패턴이므로 호출 측은 항상 *전체 배열*을 보낼 것.
 *
 * 성공은 페이지 우상단의 `SaveStatus` 인디케이터로만 시그널 — 토스트는 실패만.
 * 인라인 편집은 patch 빈도가 높아 매번 toast가 뜨면 폭격이 됨.
 *
 * 낙관적 업데이트(스칼라 + 카테고리·관련국가·인물·이미지):
 *  - 저장 즉시 캐시를 갱신해 RichText·카테고리 칩·인물/국가 칩·이미지 변경이 refetch
 *    전에 바로 반영되도록 한다(buildOptimisticEvent). 신규 항목 이름은 모달 열림 시
 *    적재된 `all` 캐시에서 보강하고, 못 찾으면 그 필드만 낙관 생략(refetch가 채움).
 *  - useUndoablePatch는 `event`(=캐시) 스냅샷으로 inverse를 만든다. 낙관적 갱신으로
 *    캐시가 즉시 최신화되므로, refetch 전 빠른 연속 편집에서도 inverse가 *직전
 *    상태*를 정확히 가리킨다(과거엔 stale 스냅샷을 잡아 undo가 과도하게 회귀).
 *  - 실패 시 onError에서 스냅샷으로 롤백.
 */
export function useEventMutation(eventId: string) {
  const queryClient = useQueryClient()
  const detailKey = eventKeys.detail(eventId)
  const mutationKey = ['event-detail-mutation', eventId] as const
  /**
   * mutation *시작* 순번 — onSuccess의 정본 시딩 게이트가 settle 순서(isMutating===0)만
   * 보면 HTTP 응답 역전(A시작→B시작→B응답→A응답) 시 먼저 시작한 A의 stale 응답이
   * 마지막에 시딩돼 B의 커밋이 캐시에서 사라진다(서버는 정상, staleTime 30s 동안 지속).
   * 가장 늦게 시작한 mutation의 응답만 시딩하고, 아니면 invalidate로 폴백.
   */
  const startSeqRef = useRef(0)

  return useMutation({
    mutationKey,
    mutationFn: async (patch: UpdateEventDto) => {
      return updateEvent(eventId, patch)
    },
    onMutate: async (patch: UpdateEventDto) => {
      const startSeq = ++startSeqRef.current
      // cancel이 스냅샷보다 먼저 — 취소 await 사이에 in-flight refetch가 캐시를 바꾸면
      // 그 이전 스냅샷 기반 next가 최신 캐시를 덮어쓴다(스냅샷은 취소 후 안정 캐시에서).
      await queryClient.cancelQueries({ queryKey: detailKey })
      const previous = queryClient.getQueryData<EventDetail>(detailKey)
      // 배열/카테고리 derived 갱신은 previous 스냅샷이 있어야 재구성 가능.
      const next = previous
        ? buildOptimisticEvent(previous, patch, queryClient)
        : null
      if (!next) return { previous: undefined, startSeq }

      queryClient.setQueryData<EventDetail>(detailKey, next)
      return { previous, startSeq }
    },
    onSuccess: (data, patch, context) => {
      /**
       * 같은 사건의 *다른* mutation이 아직 in-flight면 reconcile을 미룬다.
       * (onSuccess 시점엔 자신은 이미 settled라 isMutating 집계에서 빠지므로, 0이면
       * 내가 마지막.) 먼저 끝난 mutation이 refetch해 낙관적 최신값을 옛 서버 응답으로
       * 되돌리는 역행 깜빡임을 막고, 마지막 mutation만 최종 reconcile한다.
       *
       * reconcile은 invalidate(무거운 GET 재유발) 대신 PUT 응답을 *직접 시딩*한다 —
       * 응답이 loadEventDetail full 상세(childEvents·parentEvent·군사·섹션 포함)라 두 번째
       * 왕복이 사라지고, 낙관에서 stub였던 childEvents/parentEvent(제목만·회색)가 정본
       * (카테고리 색·설명·조상 체인)으로 즉시 교체된다. 단, 마지막 settle이어도 *가장 늦게
       * 시작한* mutation이 아니면(HTTP 역전) 그 응답은 뒤 커밋을 모르는 stale — 시딩 대신
       * invalidate로 폴백한다. 응답이 없을 때(폴백 bare)도 invalidate.
       */
      if (queryClient.isMutating({ mutationKey }) === 0) {
        if (data && context?.startSeq === startSeqRef.current) {
          queryClient.setQueryData<EventDetail>(
            detailKey,
            data as unknown as EventDetail,
          )
        } else {
          queryClient.invalidateQueries({ queryKey: detailKey })
        }
      }

      /**
       * 부활 토스트 — 링크를 (재)연결했더니 이전에 기록해 둔 연결 사유(EventHierarchyReason은
       * 해제 시에도 행 보존)가 되살아났을 때 안내. 사용자가 이번 patch로 직접 사유를 친
       * 경우·이미 보이던 사유가 슬롯만 바뀐 승격은 제외(오탐 방지). 무성 부활 차단(V1 바인딩).
       */
      if (data && context?.previous) {
        if (detectReasonRevival(context.previous, patch, data)) {
          notify.info('이전에 기록한 연결 사유가 복원되었습니다')
        }
      }
      /**
       * 목록(ledger/catalog) 쪽 캐시는 *목록 표시에 영향 있는 필드*가 바뀌었을 때만
       * 무효화. 본문(background, aftermath, eventSections 등) patch는 목록에 영향
       * 없으므로 인라인 편집 빈도가 높은 키스트로크 흐름에서 불필요한 refetch를
       * 유발하지 않도록 한다.
       */
      if (patchAffectsListing(patch)) {
        queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
      }
      /**
       * 계층 patch(parentEventId·childEventIds)는 *다른* 사건의 상세 캐시도 바꾼다 —
       * 재부모화하면 옛 부모의 childEvents, 새 부모의 childEvents, 이동된 자식의
       * parentEvent가 전부 stale. 어느 사건이 영향받았는지 클라이언트가 다 알 수 없어
       * event-detail 루트를 무효화한다(자기 자신은 위의 isMutating 게이트가 관리하므로
       * 제외). 계층 patch는 키스트로크성 빈도가 아니라 비용 부담 없음.
       */
      if (
        'parentEventId' in patch ||
        'childEventIds' in patch ||
        'extraParentEventIds' in patch ||
        // 연결 사유도 쌍의 반대면(자식↔부모 페이지)을 stale하게 만든다 — patch가 상대 id를
        // 명시하므로 해당 event-detail 키만 표적 무효화(자기 자신은 위 isMutating 게이트).
        'parentLinkReasons' in patch ||
        'childLinkReasons' in patch
      ) {
        queryClient.invalidateQueries({
          queryKey: ['event-detail'],
          predicate: (query) => query.queryKey[1] !== eventId,
        })
      }
    },
    onError: (error: unknown) => {
      // 낙관 스냅샷(previous) 통째 복원은 그 사이 성공한 *다른* 패치까지 덮어
      // 무증상 데이터 손실을 부른다(인라인 자동저장은 여러 patch가 동시 in-flight
      // 가능: A시작→B성공→A실패 시 B가 사라짐). 서버 정본으로 재동기화해 실패분만
      // 되돌리고 이미 저장된 변경은 보존한다.
      queryClient.invalidateQueries({ queryKey: detailKey })
      notify.error(`저장 실패: ${friendlyErrorMessage(error)}`)
    },
  })
}

export const LISTING_FIELDS: ReadonlyArray<keyof UpdateEventDto> = [
  'title',
  'startDate',
  'endDate',
  'startDatePrecision',
  'endDatePrecision',
  'categoryId',
  'location',
  'parentEventId',
  'childEventIds',
  // link-candidates 캐시가 lists() 프리픽스 하위라 이 키가 후보 '(+N)' 배지·extraParents
  // 신선도를 담보한다(빈도 낮은 계층 patch라 비용 논거와도 일관).
  'extraParentEventIds',
  'description',
  /**
   * 목록 행이 실제로 그리고/거르는 값인데 화이트리스트에서 빠져 있었다(검토 DATA-9).
   *  - relatedCountryIds: 행 우측 국기 칩을 그리고, 국가·대륙 필터의 매칭 술어가 읽는다.
   *  - relatedHistoricalCountryIds: 같은 국가 칩 행·국가 피벗이 역사국가도 그린다(현대와 동형).
   *  - keywords: 검색 매칭 술어가 제목·설명과 함께 본다.
   * 빠져 있으면 상세에서 관련국을 고쳐도 목록의 국기와 필터 결과가 stale하게 남는다.
   */
  'relatedCountryIds',
  'relatedHistoricalCountryIds',
  'keywords',
]

function patchAffectsListing(patch: UpdateEventDto): boolean {
  return LISTING_FIELDS.some((k) => k in patch)
}

/**
 * 서버 에러를 사용자 친화 문구로 — nestia HttpError.message는 응답 본문(JSON) 원문이라
 * 순환 계층·중복 제목 같은 409도 `{"message":"순환 계층은…","statusCode":409}` 블롭으로
 * 토스트에 뜬다. 본문의 `message`만 추출해 깔끔한 한국어 사유로 보여준다.
 */
function friendlyErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return '알 수 없는 오류'
  const raw =
    typeof (error as { message?: unknown }).message === 'string'
      ? (error as { message: string }).message
      : ''
  const pick = (text: string): string | null => {
    try {
      const parsed = JSON.parse(text) as { message?: unknown }
      if (typeof parsed.message === 'string') return parsed.message
      if (Array.isArray(parsed.message)) return parsed.message.join(', ')
    } catch {
      /* JSON 아님 */
    }
    return null
  }
  const direct = pick(raw)
  if (direct) return direct
  const brace = raw.indexOf('{')
  if (brace >= 0) {
    const sliced = pick(raw.slice(brace))
    if (sliced) return sliced
  }
  return raw || '알 수 없는 오류'
}

/* ───────────────────────── 낙관적 업데이트 빌더 ───────────────────────── */

/**
 * patch를 현재 캐시(prev)에 낙관적으로 반영한 새 EventDetail을 만든다. 바꿀 게
 * 없으면 null(→ 캐시 미변경).
 *
 * - 스칼라: 그대로 덮어쓰기.
 * - categoryId: `['event-categories']` 캐시에서 이름을 찾아 `category`도 갱신.
 * - related 배열: prev의 derived 객체(이름 포함)를 id로 재사용하고, 신규 id는 모달이
 *   열릴 때 적재된 `all` 캐시에서 보강. 하나라도 못 찾으면 *그 필드만* 낙관 생략
 *   (placeholder 깜빡임 방지 — refetch가 채움).
 * - eventImages: patch가 전체 배열이라 그대로 재구성(id는 url로 prev 매칭/합성).
 */
export function buildOptimisticEvent(
  prev: EventDetail,
  patch: UpdateEventDto,
  qc: QueryClient,
): EventDetail | null {
  let changed = false
  const next: EventDetail = { ...prev }
  const p = patch as Record<string, unknown>

  for (const k of OPTIMISTIC_SCALAR_FIELDS) {
    if (k in patch) {
      ;(next as unknown as Record<string, unknown>)[k] = p[k]
      changed = true
    }
  }

  if ('categoryId' in patch) {
    const id = patch.categoryId ?? null
    next.categoryId = id
    if (!id) {
      next.category = undefined
    } else {
      const cats =
        qc.getQueryData<Array<{ id: string; name: string; description?: string | null }>>([
          'event-categories',
        ])
      const found = cats?.find((c) => c.id === id)
      // 캐시에 없으면 prev.category 유지(이름은 refetch로 보정).
      if (found)
        next.category = {
          id: found.id,
          name: found.name,
          description: found.description ?? null,
        }
    }
    changed = true
  }

  if ('relatedCountryIds' in patch) {
    const resolved = resolveModernCountries(
      patch.relatedCountryIds ?? [],
      prev.relatedCountries,
      qc.getQueryData(['countries', 'all']),
    )
    if (resolved) {
      next.relatedCountries = resolved
      changed = true
    }
  }

  if ('relatedHistoricalCountryIds' in patch) {
    const resolved = resolveHistoricalCountries(
      patch.relatedHistoricalCountryIds ?? [],
      prev.relatedHistoricalCountries,
      qc.getQueryData(['historical-countries', 'all']),
    )
    if (resolved) {
      next.relatedHistoricalCountries = resolved
      changed = true
    }
  }

  if ('relatedPersons' in patch) {
    const resolved = resolvePersons(
      patch.relatedPersons ?? [],
      prev.relatedPersons,
      qc.getQueryData(['persons', 'all']),
    )
    if (resolved) {
      next.relatedPersons = resolved
      changed = true
    }
  }

  if ('eventImages' in patch) {
    const imgs = patch.eventImages ?? []
    next.eventImages = imgs.map((img, i) => ({
      id:
        prev.eventImages?.find((e) => e.imageUrl === img.imageUrl)?.id ??
        `opt-${i}-${img.imageUrl}`,
      imageUrl: img.imageUrl,
      caption: img.caption,
      source: img.source,
      order: img.order ?? i,
      isPrimary: img.isPrimary ?? i === 0,
    }))
    changed = true
  }

  /**
   * militaryEvent — patch가 *전체* 정규화 객체를 담으므로(saveMilitaryData가 전체
   * 삭제-재생성) 그대로 캐시에 반영하면 enabledModules·각 모듈이 refetch 전에 즉시
   * 갱신된다. 응답 형태와 patch 형태가 동일(NormalizedMilitaryEventResponse)이라 무변환.
   */
  if ('militaryEvent' in patch) {
    next.militaryEvent = p.militaryEvent as EventDetail['militaryEvent']
    changed = true
  }

  /**
   * 계층 필드(childEventIds·parentEventId) — 낙관 재구성이 *필수*다. 과거엔 낙관
   * 제외라 refetch 전까지 캐시(event.childEvents/parentEvent)가 stale였고,
   * detail-network가 그 stale 목록을 childIdsRef로 참조해 하위 사건 다중선택 시
   * 먼저 고른 자식이 delete-recreate로 소리 없이 유실됐다(연속 제거도 부활). 여기서
   * 캐시를 즉시 재구성하면 childIds/selectedValues·breadcrumb·댓글 게이트가 곧바로
   * 전진한다. 신규 항목 이름·날짜는 link-candidates 캐시에서 보강, 못 찾으면 id만 든
   * stub(제목·색은 refetch가 채움) — 관련 배열처럼 '못 찾으면 필드째 낙관 생략'하면
   * childIds가 다시 stale해져 원래 결함이 재발하므로, 여기선 항상 재구성한다.
   */
  if ('childEventIds' in patch) {
    const newChildIds = patch.childEventIds ?? []
    next.childEvents = resolveChildEvents(newChildIds, prev.childEvents, qc)
    // 서버 attach collapse 거울: 주 상위 FK로 붙인 자식이 기존 역방향 엣지(extraChildren)와
    // 겹치면 서버가 그 엣지를 자동 해소한다 — 낙관에서도 걷어 이중 표시를 막는다.
    next.extraChildren = prev.extraChildren?.filter(
      (child) => !newChildIds.includes(child.id),
    )
    changed = true
  }

  if ('parentEventId' in patch) {
    const parentId = patch.parentEventId ?? null
    next.parentEventId = parentId
    // 해제(null)는 parentEvent도 즉시 비워 breadcrumb·상위 링크가 곧바로 사라진다.
    next.parentEvent = parentId
      ? resolveParentEvent(parentId, prev, qc)
      : undefined
    // parentLinkReason은 (this↔주 상위) *쌍*의 주석 — 부모가 바뀌면 옛 쌍의 사유가
    // 새 부모 옆에 남는 cross-slot 오표시가 된다. 승격 swap이면 그 엣지의 reason 승계,
    // 같은 부모 유지면 그대로, 그 외(신규 지정·해제)는 null(refetch가 정본 보정).
    if (parentId !== (prev.parentEventId ?? null)) {
      const promotedReason = parentId
        ? prev.extraParents?.find((extra) => extra.id === parentId)?.reason
        : undefined
      next.parentLinkReason = promotedReason ?? null
    }
    // 서버 W2-(a-2) 거울: 새 주 상위가 기존 추가 상위와 겹치면 그 엣지는 자동
    // collapse(스칼라 경유 승격). extras patch가 함께 오면 아래 분기가 정본.
    if (
      !('extraParentEventIds' in patch) &&
      parentId &&
      prev.extraParents?.some((extra) => extra.id === parentId)
    ) {
      next.extraParents = prev.extraParents.filter(
        (extra) => extra.id !== parentId,
      )
    }
    changed = true
  }

  /**
   * extraParentEventIds → extraParents 낙관 재구성 — 계층 규약과 동일하게 '항상
   * 재구성'(못 찾으면 필드째 생략 금지 — extraIds가 stale해져 무성 유실 재발).
   * 유지 항목은 prev 재사용, 승격 swap의 강등분(직전 주 상위)은 prev.parentEvent
   * (생존 객체 — 유령이면 애초에 undefined)에서 제목 승계, 신규는 후보 캐시 stub.
   */
  if ('extraParentEventIds' in patch) {
    next.extraParents = resolveExtraParents(
      patch.extraParentEventIds ?? [],
      prev,
      qc,
    )
    changed = true
  }

  /**
   * 연결 사유(부분 업서트) 낙관 반영 — 나열된 쌍만 터치. 빈 문자열은 삭제(null).
   * parentLinkReasons: 이 사건이 자식인 쌍 → parentLinkReason(주 상위)·extraParents[].reason.
   * childLinkReasons: 이 사건이 부모인 쌍 → childEvents[].reason·extraChildren[].reason.
   */
  if ('parentLinkReasons' in patch) {
    for (const entry of patch.parentLinkReasons ?? []) {
      const value = normalizeReason(entry.reason)
      if (next.parentEventId === entry.parentEventId) {
        next.parentLinkReason = value
      }
      if (next.extraParents?.some((extra) => extra.id === entry.parentEventId)) {
        next.extraParents = next.extraParents.map((extra) =>
          extra.id === entry.parentEventId ? { ...extra, reason: value } : extra,
        )
      }
    }
    changed = true
  }

  if ('childLinkReasons' in patch) {
    for (const entry of patch.childLinkReasons ?? []) {
      const value = normalizeReason(entry.reason)
      if (next.childEvents?.some((child) => child.id === entry.childEventId)) {
        next.childEvents = next.childEvents.map((child) =>
          child.id === entry.childEventId ? { ...child, reason: value } : child,
        )
      }
      if (
        next.extraChildren?.some((child) => child.id === entry.childEventId)
      ) {
        next.extraChildren = next.extraChildren.map((child) =>
          child.id === entry.childEventId ? { ...child, reason: value } : child,
        )
      }
    }
    changed = true
  }

  return changed ? next : null
}

/** trim 후 빈 문자열은 삭제(null) — 서버 정규화 규칙의 낙관 거울. */
function normalizeReason(reason: string | null | undefined): string | null {
  const trimmed = (reason ?? '').trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * 링크 (재)연결로 이전에 기록해 둔 연결 사유가 부활했는지 판정(부활 토스트 게이트).
 * 부활 = '이번 patch로 링크가 새로 붙었고, 그 쌍의 사유가 응답엔 있는데 직전 캐시엔
 * 안 보였던' 경우. 사용자가 이번에 직접 친 사유·이미 보이던 사유의 슬롯 이동(승격)은 제외.
 */
export function detectReasonRevival(
  prev: EventDetail,
  patch: UpdateEventDto,
  response: { parentLinkReason?: string | null } & {
    extraParents?: Array<{ id: string; reason?: string | null }>
    childEvents?: Array<{ id: string; reason?: string | null }>
  },
): boolean {
  const nonEmpty = (value: string | null | undefined): boolean =>
    typeof value === 'string' && value.trim().length > 0

  // 주 상위 (재)연결
  if ('parentEventId' in patch) {
    const newParentId = patch.parentEventId ?? null
    if (newParentId && newParentId !== (prev.parentEventId ?? null)) {
      const userSet = (patch.parentLinkReasons ?? []).some(
        (entry) => entry.parentEventId === newParentId,
      )
      // 승격(직전 추가 상위 → 대표): 사유가 이미 extraParents로 보이던 것 — 부활 아님.
      const wasVisibleAsExtra = (prev.extraParents ?? []).some(
        (extra) => extra.id === newParentId && nonEmpty(extra.reason),
      )
      if (!userSet && !wasVisibleAsExtra && nonEmpty(response.parentLinkReason)) {
        return true
      }
    }
  }

  // 추가 상위 신규 연결
  if ('extraParentEventIds' in patch) {
    const prevExtraIds = new Set((prev.extraParents ?? []).map((extra) => extra.id))
    const added = (patch.extraParentEventIds ?? []).filter(
      (id) => !prevExtraIds.has(id),
    )
    for (const id of added) {
      const userSet = (patch.parentLinkReasons ?? []).some(
        (entry) => entry.parentEventId === id,
      )
      // 승격의 강등분(직전 주 상위 → 추가 상위): 사유가 이미 parentLinkReason으로
      // 보이던 것 — 슬롯 이동일 뿐 부활 아님.
      const wasVisibleAsPrimary =
        id === (prev.parentEventId ?? null) && nonEmpty(prev.parentLinkReason)
      const respReason = response.extraParents?.find(
        (extra) => extra.id === id,
      )?.reason
      if (!userSet && !wasVisibleAsPrimary && nonEmpty(respReason)) return true
    }
  }

  // 하위 신규 연결
  if ('childEventIds' in patch) {
    const prevChildIds = new Set((prev.childEvents ?? []).map((child) => child.id))
    const added = (patch.childEventIds ?? []).filter(
      (id) => !prevChildIds.has(id),
    )
    for (const id of added) {
      const userSet = (patch.childLinkReasons ?? []).some(
        (entry) => entry.childEventId === id,
      )
      // 승격(역방향 엣지 → 주 상위 FK 자식): 사유가 이미 extraChildren으로 보이던 것 —
      // 슬롯 이동일 뿐 부활 아님(상위 방향 두 분기의 가드와 대칭).
      const wasVisibleAsExtraChild = (prev.extraChildren ?? []).some(
        (child) => child.id === id && nonEmpty(child.reason),
      )
      const respReason = response.childEvents?.find(
        (child) => child.id === id,
      )?.reason
      if (!userSet && !wasVisibleAsExtraChild && nonEmpty(respReason)) return true
    }
  }

  return false
}

/* ───────────────────────── 계층(상위/하위) 낙관 재구성 ───────────────────────── */

/**
 * 열려 있던(또는 최근) 연결 모달들의 link-candidates 캐시를 전부 훑어 id→후보 맵을
 * 만든다. 캐시 키는 검색어별(`['events','link-candidates', term]`)로 여러 개라 모두 병합.
 */
function collectLinkCandidates(
  qc: QueryClient,
): Map<string, EventLinkCandidate> {
  const map = new Map<string, EventLinkCandidate>()
  const entries = qc.getQueriesData<EventLinkCandidate[]>({
    queryKey: ['events', 'link-candidates'],
  })
  for (const [, list] of entries) {
    if (!Array.isArray(list)) continue
    for (const candidate of list) {
      if (candidate && !map.has(candidate.id)) map.set(candidate.id, candidate)
    }
  }
  return map
}

/**
 * 후보의 날짜를 응답 형태(ISO, BC=음수연도)로 재구성 — 서버 formatEventDate와 동일.
 * BC·고대는 startDate=null이고 startEra/startYear가 진실이라, 정렬(compareEventStart)과
 * 카드 표기가 refetch 전에도 안정되도록 `-YYYY-01-01`로 합성한다.
 */
function reconstructIsoDate(
  date: string | null | undefined,
  era: string | null | undefined,
  year: number | null | undefined,
): string | null {
  if (date) return date
  if (year == null) return null
  const yyyy = String(year).padStart(4, '0')
  return `${era === 'BC' ? '-' : ''}${yyyy}-01-01`
}

/** 후보(EventLinkCandidate) → 낙관 stub EventDetail. 못 찾으면 id만(제목 공백). */
function candidateToEventStub(
  id: string,
  candidate: EventLinkCandidate | undefined,
): EventDetail {
  return {
    id,
    title: candidate?.title ?? '',
    startDate: reconstructIsoDate(
      candidate?.startDate,
      candidate?.startEra,
      candidate?.startYear,
    ),
    startDatePrecision: candidate?.startDatePrecision ?? null,
    endDate: reconstructIsoDate(
      candidate?.endDate,
      candidate?.endEra,
      candidate?.endYear,
    ),
    endDatePrecision: candidate?.endDatePrecision ?? null,
  }
}

/**
 * childEventIds → childEvents(EventDetail[]) 낙관 재구성. 유지되는 자식은 prev의 완전한
 * 객체(카테고리·설명 포함)를 재사용하고, 신규 자식만 후보 캐시로 stub 생성.
 */
function resolveChildEvents(
  ids: string[],
  prevChildren: EventDetail[] | undefined,
  qc: QueryClient,
): EventDetail[] {
  let candidates: Map<string, EventLinkCandidate> | null = null
  return ids.map((id) => {
    const existing = prevChildren?.find((child) => child.id === id)
    if (existing) return existing
    if (!candidates) candidates = collectLinkCandidates(qc)
    return candidateToEventStub(id, candidates.get(id))
  })
}

/**
 * parentEventId → parentEvent(EventDetail) 낙관 재구성.
 * 소스 우선순위: ① 같은 부모면 prev.parentEvent 재사용 ② 승격 swap이면
 * prev.extraParents에서 제목 승계(승격은 모달 없는 칩 액션이라 후보 캐시가 cold한
 * 것이 기본 상태 — 항상 히트) ③ 후보 캐시 stub ④ 최후 빈 stub.
 * ⚠️ id 불일치 시 prev.parentEvent 폴백 금지 — 옛 부모가 새 부모로 계속 표시되는
 * cross-slot 오표시가 된다(제목은 refetch가 채움).
 */
function resolveParentEvent(
  id: string,
  prev: EventDetail,
  qc: QueryClient,
): EventDetail | undefined {
  if (prev.parentEvent?.id === id) return prev.parentEvent
  const fromExtras = prev.extraParents?.find((extra) => extra.id === id)
  if (fromExtras) return { id, title: fromExtras.title }
  return candidateToEventStub(id, collectLinkCandidates(qc).get(id))
}

/**
 * extraParentEventIds → extraParents 낙관 재구성. 순서는 patch의 배열 순서를 따르며
 * refetch가 서버 정렬(연결 오래된 순)로 정정한다.
 */
function resolveExtraParents(
  ids: string[],
  prev: EventDetail,
  qc: QueryClient,
): Array<{ id: string; title: string; reason?: string | null }> {
  let candidates: Map<string, EventLinkCandidate> | null = null
  return ids.map((id) => {
    const existing = prev.extraParents?.find((extra) => extra.id === id)
    if (existing) return existing
    // 승격 swap의 강등분 — 직전 주 상위 제목을 생존 객체에서, 사유는 슬롯 이동이므로
    // 직전 쌍의 parentLinkReason에서 승계(사유는 쌍의 속성 — 슬롯이 바뀌어도 따라간다).
    if (prev.parentEvent?.id === id) {
      return { id, title: prev.parentEvent.title, reason: prev.parentLinkReason }
    }
    if (!candidates) candidates = collectLinkCandidates(qc)
    return { id, title: candidates.get(id)?.title ?? '' }
  })
}

/** id 배열을 prev derived 객체 + all 캐시로 해소. 미해결 항목이 있으면 null. */
function resolveModernCountries(
  ids: string[],
  prevList: EventDetailCountryRef[] | undefined,
  all: unknown,
): EventDetailCountryRef[] | null {
  const allArr = Array.isArray(all)
    ? (all as Array<{ id: string; name: string; flagEmoji?: string }>)
    : []
  const out: EventDetailCountryRef[] = []
  for (const id of ids) {
    const ex = prevList?.find((c) => c.id === id)
    if (ex) {
      out.push(ex)
      continue
    }
    const a = allArr.find((c) => c?.id === id)
    if (a) {
      out.push({ id: a.id, name: a.name, flagEmoji: a.flagEmoji })
      continue
    }
    return null
  }
  return out
}

function resolveHistoricalCountries(
  ids: string[],
  prevList: EventDetailHistoricalCountryRef[] | undefined,
  all: unknown,
): EventDetailHistoricalCountryRef[] | null {
  const allArr = Array.isArray(all)
    ? (all as Array<{ id: string; name: string }>)
    : []
  const out: EventDetailHistoricalCountryRef[] = []
  for (const id of ids) {
    const ex = prevList?.find((c) => c.id === id)
    if (ex) {
      out.push(ex)
      continue
    }
    const a = allArr.find((c) => c?.id === id)
    if (a) {
      out.push({ id: a.id, name: a.name })
      continue
    }
    return null
  }
  return out
}

function resolvePersons(
  items: Array<{ personId: string; role?: string; note?: string }>,
  prevList: EventDetailPerson[] | undefined,
  all: unknown,
): EventDetailPerson[] | null {
  const allArr = Array.isArray(all)
    ? (all as Array<{
        id: string
        name?: string | null
        surname?: string | null
        middleName?: string | null
        profileImageUrl?: string | null
        nameDisplayOrder?: string | null
        country?: { defaultNameDisplayOrder?: string | null } | null
      }>)
    : []
  const out: EventDetailPerson[] = []
  for (const item of items) {
    const ex = prevList?.find((x) => x.personId === item.personId)
    let person = ex?.person ?? null
    if (!person) {
      const a = allArr.find((x) => x?.id === item.personId)
      if (a)
        person = {
          id: a.id,
          name: a.name,
          surname: a.surname,
          middleName: a.middleName ?? null,
          profileImageUrl: a.profileImageUrl,
          nameDisplayOrder: a.nameDisplayOrder ?? null,
          country: a.country
            ? {
                defaultNameDisplayOrder:
                  a.country.defaultNameDisplayOrder ?? null,
              }
            : null,
        }
      else return null
    }
    out.push({
      id: ex?.id ?? `opt-${item.personId}`,
      personId: item.personId,
      role: item.role ?? null,
      note: item.note ?? null,
      person,
    })
  }
  return out
}
