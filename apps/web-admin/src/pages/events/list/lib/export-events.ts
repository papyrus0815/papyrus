/**
 * 현재 필터/검색 결과를 JSON 파일로 내보내기.
 *
 * - source: 노드 순회 결과(사건 + 필터 일치 여부). event가 null인 항목은 스킵.
 * - 빈 결과거나 SSR 환경이면 무시.
 *
 * ## 왜 전용 직렬화기인가 (2026-07-28 검토 DATA-11)
 *
 * 예전엔 `HistoricalEvent`를 통째로 `JSON.stringify` 했다. 그런데 이 객체의 상당수
 * 필드는 서버 데이터가 아니라 transformer가 타입을 만족시키려고 박아 넣은
 * **자리표시자**다 — `type: 'battle'`(모든 사건), `stats`의 사상자·참전국 0,
 * `importance: 'notable'`, tags/timeline/theaters/keyFigures/countries/influence 빈 배열.
 * 그 결과 내보낸 파일은 "모든 사건이 전투이고 사상자가 0명"이라고 주장했다.
 *
 * 여기서는 **실제로 서버에서 온 필드만** 고른다. 특히 날짜 정밀도
 * (startDatePrecision/endDatePrecision)를 포함해, 연도만 아는 사건과 1월 1일 사건을
 * 파일만 보고도 구분할 수 있게 한다.
 *
 * ## 왜 `matchesFilter`와 필터 메타를 싣는가 (2026-08-02 검토 GAP-1)
 *
 * 내보내기 모집단은 평탄화 결과 전체이고, 거기엔 **자기는 조건을 만족하지 않지만
 * 매칭된 자손이 있어 문맥으로 남은 부모 행**이 섞여 있다. 목록 화면은 그 행을
 * 흐리게 강등해 구분하는데 파일에는 아무 표시가 없어, '전쟁'으로 좁혀 내보낸 파일에
 * 정치 사건이 같은 자격으로 들어앉았다. 행마다 `matchesFilter`를 싣고 파일 머리에
 * 적용 조건을 기록해, 파일만 보고도 모수를 재구성할 수 있게 한다.
 */
import type { HistoricalEvent } from '../../create/events.types'

/** 내보내기 레코드 — 서버 응답에 실제로 존재하는 필드만 */
interface ExportedEvent {
  id: string
  title: string
  description: string
  categoryId: string | null
  categoryName: string
  startDate: string | null
  endDate: string | null
  startDatePrecision: string | null
  endDatePrecision: string | null
  location: string | null
  parentEventId: string | null
  keywords: string[]
  relatedCountries: Array<{ id: string; name: string }>
  relatedHistoricalCountries: Array<{ id: string; name: string }>
  sectionTitles: string[]
  /**
   * 이 사건 **자신**이 내보내기 시점의 필터 조건을 만족했는가.
   * false = 매칭된 자손 때문에 문맥으로만 포함된 부모(목록에서는 흐리게 표시되는 행).
   */
  matchesFilter: boolean
}

/** 내보내기 대상 한 줄 — 평탄화 항목에서 사건과 매칭 여부만 뽑은 것 */
export interface ExportEntry {
  event: HistoricalEvent | null
  matchesFilter: boolean
}

/** 파일 머리에 기록하는 '무엇으로 좁힌 결과인가' */
export interface ExportFilterMeta {
  /** 활성 필터 칩 라벨 그대로 — 사람이 읽는 조건 요약 */
  appliedFilters: string[]
  /** 검색어(있으면) */
  keyword?: string
  /** 서버가 아는 최상위 사건 총수 — 부분 내보내기 판별용 */
  serverTotal?: number
}

const toExported = (
  event: HistoricalEvent,
  matchesFilter: boolean,
): ExportedEvent => ({
  id: event.id,
  title: event.title,
  description: event.description ?? '',
  // 미분류 사건은 가짜 id를 만들지 않고 null로 내보낸다.
  categoryId: event.categoryId || null,
  categoryName: event.category,
  startDate: event.startDate || null,
  endDate: event.endDate ?? null,
  startDatePrecision: event.startDatePrecision ?? null,
  endDatePrecision: event.endDatePrecision ?? null,
  location: event.location ?? null,
  parentEventId: event.parentEventId ?? null,
  keywords: event.keywords ?? [],
  relatedCountries: (event.relatedCountries ?? []).map((country) => ({
    id: country.id,
    name: country.name,
  })),
  relatedHistoricalCountries: (event.relatedHistoricalCountries ?? []).map(
    (country) => ({ id: country.id, name: country.name }),
  ),
  sectionTitles: event.sectionTitles ?? [],
  matchesFilter,
})

export function exportEventsAsJson(
  source: ExportEntry[],
  meta: ExportFilterMeta = { appliedFilters: [] },
) {
  if (typeof document === 'undefined') return
  const entries = source.filter(
    (entry): entry is ExportEntry & { event: HistoricalEvent } => !!entry.event,
  )
  if (entries.length === 0) return

  const events = entries.map((entry) =>
    toExported(entry.event, entry.matchesFilter),
  )
  const matchedCount = events.filter((event) => event.matchesFilter).length

  const payload = {
    exportedAt: new Date().toISOString(),
    /**
     * 모수 규약(검토 배치 3) — `matchedCount`는 술어 직후를 센다.
     * `contextCount`는 문맥용으로만 실린 부모 수이며 조건을 만족하지 않는다.
     */
    filters: {
      applied: meta.appliedFilters,
      keyword: meta.keyword ?? null,
      matchedCount,
      contextCount: events.length - matchedCount,
      serverTotal: meta.serverTotal ?? null,
    },
    events,
  }

  const content = JSON.stringify(payload, null, 2)
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `events-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
