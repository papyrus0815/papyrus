/**
 * 기록 비교 뷰 그리드 가공 — compare 응답(persons[].records)을
 * 공유 연도축(행 = 등장 startYear 버킷) × 인물 칼럼 구조로 변환한다.
 *
 * 연도는 전부 부호 연도(BC 음수) — native Date 재파싱 금지(서버가 정규화 독점).
 * TENURE/REIGN은 점 카드가 아니라 기간 밴드(레일)로 다뤄 재임 맥락을 행 단위로 깐다.
 */
import type {
  PersonRecordItem,
  PersonRecordsPerson,
} from '@/shared/api/person-records'

/** compare API 계약상 비교 가능 인물 상한 */
export const MAX_RECORD_PERSONS = 12

/** 재임/재위 기간 밴드 — 연도 버킷 행 단위로 칼럼에 깔린다. */
export interface RecordBand {
  record: PersonRecordItem
  startYear: number
  /** 밴드가 덮는 마지막 연도(포함). null이면 진행 중(ongoing) — 그리드 끝까지 */
  endYear: number | null
  /** 라벨(칭호 카드)을 붙일 행 — 가시 범위 시작으로 클램프된 시작 연도 */
  labelYear: number
}

export interface RecordsGridColumn {
  person: PersonRecordsPerson['person']
  /** 연도별 점 기록 카드 — TENURE/REIGN 제외, 서버 시간순 유지 */
  pointsByYear: Map<number, PersonRecordItem[]>
  bands: RecordBand[]
  /** 기간 내 기록 총수(밴드+카드) — 0이면 빈 열 CTA */
  recordCount: number
  /** 기간 비교에서 제외된 연도 미상 기록 수(서버 undatedCount + 응답 내 startYear null) */
  undatedCount: number
}

export interface RecordsGrid {
  /** 오름차순 연도 버킷(부호 연도) — 그리드 행 */
  years: number[]
  columns: RecordsGridColumn[]
  /** linkEventId → 등장 횟수. 2 이상이면 "공유 사건"으로 묶어 표시 */
  sharedLinkCounts: Map<string, number>
}

function isBandKind(kind: PersonRecordItem['kind']): boolean {
  return kind === 'TENURE' || kind === 'REIGN'
}

export function buildRecordsGrid(
  persons: PersonRecordsPerson[],
  fromYear: number | null,
  toYear: number | null,
): RecordsGrid {
  const inRange = (year: number) =>
    (fromYear == null || year >= fromYear) && (toYear == null || year < toYear)

  const yearSet = new Set<number>()
  const sharedLinkCounts = new Map<string, number>()

  for (const entry of persons) {
    for (const record of entry.records) {
      if (record.linkEventId) {
        sharedLinkCounts.set(
          record.linkEventId,
          (sharedLinkCounts.get(record.linkEventId) ?? 0) + 1,
        )
      }
      if (record.startYear == null) continue
      if (inRange(record.startYear)) {
        yearSet.add(record.startYear)
      } else if (
        isBandKind(record.kind) &&
        fromYear != null &&
        record.startYear < fromYear
      ) {
        // 기간 이전에 시작해 기간과 겹치는 밴드 — 기간 시작 행에 라벨을 붙일 수 있게 버킷 확보
        const bandEnd = record.ongoing ? null : record.endYear
        if (bandEnd == null || bandEnd >= fromYear) yearSet.add(fromYear)
      }
    }
  }

  const years = [...yearSet].sort(
    (yearA, yearB) => yearA - yearB,
  )

  const columns: RecordsGridColumn[] = persons.map((entry) => {
    const pointsByYear = new Map<number, PersonRecordItem[]>()
    const bands: RecordBand[] = []
    let undatedExtra = 0
    let recordCount = 0

    for (const record of entry.records) {
      if (record.startYear == null) {
        undatedExtra += 1
        continue
      }
      if (isBandKind(record.kind)) {
        // 종료 미상(!ongoing && endYear null)은 시작 연도 한 행짜리 밴드로 축소
        const endYear = record.ongoing ? null : record.endYear ?? record.startYear
        const overlaps =
          (toYear == null || record.startYear < toYear) &&
          (fromYear == null || endYear == null || endYear >= fromYear)
        if (!overlaps) continue
        const labelYear =
          fromYear != null && record.startYear < fromYear
            ? fromYear
            : record.startYear
        bands.push({ record, startYear: record.startYear, endYear, labelYear })
        recordCount += 1
      } else {
        if (!inRange(record.startYear)) continue
        const list = pointsByYear.get(record.startYear)
        if (list) list.push(record)
        else pointsByYear.set(record.startYear, [record])
        recordCount += 1
      }
    }

    return {
      person: entry.person,
      pointsByYear,
      bands,
      recordCount,
      undatedCount: entry.undatedCount + undatedExtra,
    }
  })

  return { years, columns, sharedLinkCounts }
}

/** 해당 연도 행에서 활성인 밴드들 — 셀 좌측 레일 표시용 */
export function bandsAtYear(bands: RecordBand[], year: number): RecordBand[] {
  return bands.filter(
    (band) =>
      band.startYear <= year && (band.endYear == null || band.endYear >= year),
  )
}
