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

  return useMutation({
    mutationKey,
    mutationFn: async (patch: UpdateEventDto) => {
      return updateEvent(eventId, patch)
    },
    onMutate: async (patch: UpdateEventDto) => {
      const previous = queryClient.getQueryData<EventDetail>(detailKey)
      // 배열/카테고리 derived 갱신은 previous 스냅샷이 있어야 재구성 가능.
      const next = previous
        ? buildOptimisticEvent(previous, patch, queryClient)
        : null
      if (!next) return { previous: undefined }

      // in-flight refetch가 낙관적 갱신을 덮어쓰지 않도록 취소 후 적용.
      await queryClient.cancelQueries({ queryKey: detailKey })
      queryClient.setQueryData<EventDetail>(detailKey, next)
      return { previous }
    },
    onSuccess: (data, patch) => {
      /**
       * 같은 사건의 *다른* mutation이 아직 in-flight면 reconcile을 미룬다.
       * (onSuccess 시점엔 자신은 이미 settled라 isMutating 집계에서 빠지므로, 0이면
       * 내가 마지막.) 먼저 끝난 mutation이 refetch해 낙관적 최신값을 옛 서버 응답으로
       * 되돌리는 역행 깜빡임을 막고, 마지막 mutation만 최종 reconcile한다.
       *
       * reconcile은 invalidate(무거운 GET 재유발) 대신 PUT 응답을 *직접 시딩*한다 —
       * 응답이 loadEventDetail full 상세(childEvents·parentEvent·군사·섹션 포함)라 두 번째
       * 왕복이 사라지고, 낙관에서 stub였던 childEvents/parentEvent(제목만·회색)가 정본
       * (카테고리 색·설명·조상 체인)으로 즉시 교체된다. 응답이 없으면(폴백 bare) invalidate.
       */
      if (queryClient.isMutating({ mutationKey }) === 0) {
        if (data) {
          queryClient.setQueryData<EventDetail>(
            detailKey,
            data as unknown as EventDetail,
          )
        } else {
          queryClient.invalidateQueries({ queryKey: detailKey })
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
      if ('parentEventId' in patch || 'childEventIds' in patch) {
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

const LISTING_FIELDS: ReadonlyArray<keyof UpdateEventDto> = [
  'title',
  'startDate',
  'endDate',
  'startDatePrecision',
  'endDatePrecision',
  'categoryId',
  'location',
  'parentEventId',
  'childEventIds',
  'description',
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
    next.childEvents = resolveChildEvents(
      patch.childEventIds ?? [],
      prev.childEvents,
      qc,
    )
    changed = true
  }

  if ('parentEventId' in patch) {
    const parentId = patch.parentEventId ?? null
    next.parentEventId = parentId
    // 해제(null)는 parentEvent도 즉시 비워 breadcrumb·상위 링크가 곧바로 사라진다.
    next.parentEvent = parentId
      ? resolveParentEvent(parentId, prev.parentEvent, qc)
      : undefined
    changed = true
  }

  return changed ? next : null
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
 * parentEventId → parentEvent(EventDetail) 낙관 재구성. 같은 부모면 prev 재사용,
 * 후보 캐시에 없으면 prev 유지(스칼라 parentEventId는 이미 세팅돼 댓글 게이트는 즉시
 * 반영, breadcrumb·상위 링크만 refetch로 채워짐).
 */
function resolveParentEvent(
  id: string,
  prevParent: EventDetail | undefined,
  qc: QueryClient,
): EventDetail | undefined {
  if (prevParent?.id === id) return prevParent
  const candidate = collectLinkCandidates(qc).get(id)
  if (!candidate) return prevParent
  return candidateToEventStub(id, candidate)
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
