import {
  type QueryClient,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'

import { type UpdateEventDto, updateEvent } from '@/shared/api/events'
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
 * parentEventId(→parentEvent 브레드크럼)·eventSections(→DetailNarrative 로컬 state로 이미
 * 즉시 반영)은 낙관 대상에서 제외하고 refetch로만 반영한다.
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
    onSuccess: (_data, patch) => {
      /**
       * 같은 사건의 *다른* mutation이 아직 in-flight면 detail refetch를 미룬다.
       * (onSuccess 시점엔 자신은 이미 settled라 isMutating 집계에서 빠지므로, 0이면
       * 내가 마지막.) 먼저 끝난 mutation이 refetch해 낙관적 최신값을 옛 서버 응답으로
       * 되돌리는 역행 깜빡임을 막고, 마지막 mutation만 최종 reconcile한다.
       */
      if (queryClient.isMutating({ mutationKey }) === 0) {
        queryClient.invalidateQueries({ queryKey: detailKey })
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
    },
    onError: (error: unknown) => {
      // 낙관 스냅샷(previous) 통째 복원은 그 사이 성공한 *다른* 패치까지 덮어
      // 무증상 데이터 손실을 부른다(인라인 자동저장은 여러 patch가 동시 in-flight
      // 가능: A시작→B성공→A실패 시 B가 사라짐). 서버 정본으로 재동기화해 실패분만
      // 되돌리고 이미 저장된 변경은 보존한다.
      queryClient.invalidateQueries({ queryKey: detailKey })
      const message =
        error instanceof Error ? error.message : '알 수 없는 오류'
      notify.error(`저장 실패: ${message}`)
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
  'description',
]

function patchAffectsListing(patch: UpdateEventDto): boolean {
  return LISTING_FIELDS.some((k) => k in patch)
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
function buildOptimisticEvent(
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

  return changed ? next : null
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
