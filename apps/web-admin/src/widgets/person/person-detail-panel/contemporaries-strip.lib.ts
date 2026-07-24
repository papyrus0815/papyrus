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
  /**
   * 정렬 근거이자 정보밀도 보강 — 겹친 기간·전체 직위·복수 재위 스팬을 한 줄로.
   * 칩은 좁아 대표 스팬만 보이므로, 이 상세를 aria-label·title(hover)에 노출한다.
   * (플로팅 팝오버는 가로 스크롤 overflow 클리핑·시각 검증 부재로 배제 — 검토서 §UX.)
   */
  detailText: string
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

/**
 * 재위 구간 표기 — 종료일 미기록은 "재위 중(–)" vs "미상(–?)"으로 가른다.
 * 표시 record는 primaryRecordOf(창과 최대 겹침)라 그 인물의 현행 재위가 아닐 수 있으므로,
 * "재위 중"은 생존자 && 그 인물의 가장 늦게 시작한 record일 때만 — 생존 인물의 옛 재위에
 * 종료일이 빠져 있어도 'A 1990–'처럼 진행 중으로 오표기하지 않는다(그런 옛 record는 '–?').
 */
export function spanTextOf(ruler: ContemporaryRuler, record: ContemporaryRecord): string {
  const start = formatSignedYear(record.startYear)
  if (record.endYear != null) return `${start}–${formatSignedYear(record.endYear)}`
  const isLatestRecord = !ruler.records.some(
    (other) => other.startYear > record.startYear,
  )
  return ruler.person.isAlive && isLatestRecord ? `${start}–` : `${start}–?`
}

/**
 * 칩 상세 — 겹친 기간(정렬 근거)·전체 직위·복수 재위 스팬. 칩 본문엔 안 들어가는
 * 정보를 aria-label·title로 노출해, 순서 근거 불투명·정보밀도 부족을 보강한다.
 * 서수(regnalNumber) 텍스트화는 이름 표기 관례(서양 'N세' vs 로마숫자)가 갈려 제외.
 */
export function chipDetailTextOf(
  ruler: ContemporaryRuler,
  primaryRecord: ContemporaryRecord,
): string {
  const parts: string[] = [`겹침 ${Math.max(0, ruler.overlapYears)}년`]
  if (primaryRecord.title?.trim()) parts.push(primaryRecord.title.trim())
  if (ruler.records.length > 1) {
    const spans = ruler.records.map((record) => spanTextOf(ruler, record)).join(', ')
    parts.push(`재위 ${spans}`)
  }
  return parts.join(' · ')
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
      // 국기는 현대국가(C:) 그룹에만 — 역사국가(H:) 그룹에 record.country의 현대 국기를
      // 붙이면 '🇰🇷 조선'처럼 어긋나고, 첫 등장 record의 country 유무에 따라 임의로 바뀐다.
      // C: 그룹은 키가 그 국가라 모든 record가 같은 country → 국기 결정적.
      group = {
        key,
        label: countryRef?.name ?? '기타',
        flagEmoji: record.historicalCountry ? null : (record.country?.flagEmoji ?? null),
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
      detailText: chipDetailTextOf(ruler, record),
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
