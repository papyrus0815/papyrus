/**
 * 현재 필터/검색 결과를 JSON 파일로 내보내기.
 *
 * - source: 노드 순회 결과(이벤트 또는 null의 배열). null은 스킵.
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
}

const toExported = (event: HistoricalEvent): ExportedEvent => ({
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
})

export function exportEventsAsJson(source: Array<HistoricalEvent | null>) {
  if (typeof document === 'undefined') return
  const events = source.filter(
    (candidate): candidate is HistoricalEvent => !!candidate,
  )
  if (events.length === 0) return

  const content = JSON.stringify(events.map(toExported), null, 2)
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
