import { categorizePosition } from '@/entities/government-position/model/categorize'
import type { PositionCategory } from '@/entities/government-position/model/types'
import { formatSignedYear } from '@/shared/lib/lifespan-text'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import type {
  ContemporaryRecord,
  ContemporaryRuler,
} from '@/shared/api/person-contemporaries'

/**
 * 동시대 수장 스트립의 순수 어댑터 — API 응답을 표시 모델로 변환한다.
 * categorizePosition의 kind 계약('SOVEREIGN_REIGN' 정확 일치)과 BC-safe 부호 연도
 * 포맷을 여기 한 곳에서만 다뤄, 컴포넌트는 표시에만 집중한다.
 */

export interface ContemporaryChip {
  personId: string
  /** 왕호·묘호 우선, 없으면 표시명 규칙(getPersonDisplayName) */
  label: string
  category: PositionCategory
  /** "1567–1608" / "2022–"(생존 현직) / "1418–?"(종료 미상) */
  spanText: string
  title: string | null
  profileImageUrl: string | null
  /** false면 타계정 소유 — 상세를 열 수 없어 비클릭 렌더 (가계도 isOwned 선례) */
  isOwned: boolean
}

export interface ContemporaryCountryGroup {
  key: string
  label: string
  flagEmoji: string | null
  chips: ContemporaryChip[]
}

function overlapOf(
  record: ContemporaryRecord,
  window: { fromYear: number; toYear: number },
): number {
  const end = record.endYear ?? window.toYear - 1
  return (
    Math.min(end, window.toYear - 1) - Math.max(record.startYear, window.fromYear)
  )
}

/** 창과 가장 길게 겹치는 기록 — 동률이면 이른 시작 (records는 startYear 오름차순) */
export function primaryRecordOf(
  ruler: ContemporaryRuler,
  window: { fromYear: number; toYear: number },
): ContemporaryRecord {
  let primary = ruler.records[0]!
  let best = overlapOf(primary, window)
  for (const record of ruler.records.slice(1)) {
    const overlap = overlapOf(record, window)
    if (overlap > best) {
      primary = record
      best = overlap
    }
  }
  return primary
}

/**
 * categorizePosition 입력 어댑터 — kind는 'SOVEREIGN_REIGN' 정확 일치 계약이므로
 * recordKind를 그대로 넘긴다 (combinedTenures의 lowercase kind('tenure'|'reign')를
 * 넘기면 전원 오분류되는 함정이 검증에서 확인된 바 있음).
 */
export function categoryOfRecord(record: ContemporaryRecord): PositionCategory {
  return categorizePosition({
    kind: record.recordKind,
    positionType: record.positionType,
    positionTitle: record.title,
    appointmentMethod: record.appointmentMethod,
  })
}

/** 수장 라벨 — 묘호(세종)·왕호(루이 14세) 우선, 없으면 표시명 규칙 */
export function chipLabelOf(ruler: ContemporaryRuler, record: ContemporaryRecord): string {
  const label =
    ruler.person.templeName?.trim() ||
    record.regnalName?.trim() ||
    ruler.person.regnalName?.trim() ||
    getPersonDisplayName({ ...ruler.person, name: ruler.person.name ?? '' })
  return label || '(이름 미상)'
}

/** 재위 구간 표기 — 종료일 미기록은 생존이면 "–"(재위 중), 아니면 "–?"(미상) */
export function spanTextOf(ruler: ContemporaryRuler, record: ContemporaryRecord): string {
  const start = formatSignedYear(record.startYear)
  if (record.endYear != null) return `${start}–${formatSignedYear(record.endYear)}`
  return ruler.person.isAlive ? `${start}–` : `${start}–?`
}

/**
 * 국가별 그룹핑 — 그룹·칩 순서는 서버 정렬(겹침 길이 내림차순)의 첫 등장 순서를 보존.
 * 국가 정보가 없는 기록(교황 등)은 '기타' 그룹.
 */
export function groupRulersByCountry(
  rulers: ContemporaryRuler[],
  window: { fromYear: number; toYear: number },
): ContemporaryCountryGroup[] {
  const groups = new Map<string, ContemporaryCountryGroup>()
  for (const ruler of rulers) {
    const record = primaryRecordOf(ruler, window)
    const countryRef = record.historicalCountry ?? record.country
    const key = record.historicalCountry
      ? `H:${record.historicalCountry.id}`
      : record.country
        ? `C:${record.country.id}`
        : 'NONE'
    let group = groups.get(key)
    if (!group) {
      group = {
        key,
        label: countryRef?.name ?? '기타',
        flagEmoji: record.country?.flagEmoji ?? null,
        chips: [],
      }
      groups.set(key, group)
    }
    group.chips.push({
      personId: ruler.person.id,
      label: chipLabelOf(ruler, record),
      category: categoryOfRecord(record),
      spanText: spanTextOf(ruler, record),
      title: record.title,
      profileImageUrl: ruler.person.profileImageUrl,
      isOwned: ruler.person.isOwned,
    })
  }
  return [...groups.values()]
}

/** 창 캡션 — "1418–1450" (toYear는 배타라 -1) */
export function windowCaptionOf(window: { fromYear: number; toYear: number }): string {
  const last = window.toYear - 1
  if (last <= window.fromYear) return formatSignedYear(window.fromYear)
  return `${formatSignedYear(window.fromYear)}–${formatSignedYear(last)}`
}
