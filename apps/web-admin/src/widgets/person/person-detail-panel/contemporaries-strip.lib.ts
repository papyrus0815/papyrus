import { CATEGORY_TOKENS } from '@/entities/government-position/model/category-tokens'
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
  /** 어떤 재임인지 상시 노출 — record.title('황제'·'내각총리대신') 우선, 없으면 카테고리 라벨 */
  positionText: string
  profileImageUrl: string | null
  /** false면 타계정 소유 — 상세를 열 수 없어 비클릭 렌더 (가계도 isOwned 선례) */
  isOwned: boolean
  /**
   * 정렬 근거이자 정보밀도 보강 — 본명(라벨이 왕호일 때)·겹친 기간·복수 재위 스팬을
   * 한 줄로. 칩 본문에 안 담기는 정보만 담아 aria-label·title(hover)에 노출한다
   * (직위는 positionText로 칩에 상시 노출되므로 여기서 반복하지 않는다).
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

/** 표시명 규칙으로 정규화한 인물 이름 (성·이름 순서는 개인→국가 오버라이드) */
function displayNameOf(ruler: ContemporaryRuler): string {
  return getPersonDisplayName({ ...ruler.person, name: ruler.person.name ?? '' })
}

/**
 * 수장 라벨 — 묘호(세종)·기록 왕호(에드워드 7세) 우선, 없으면 인물 표시명.
 * person.regnalName은 라벨로 쓰지 않는다 — 원문 표기('Nicholas')·칭호('쇼군')·
 * 맨 서수('4세')가 섞인 오염 필드라 칩에 원문이 새던 원인이었고, 수장비교 보드도
 * record 왕호→표시명 체인만 쓴다(normalize-tenures 규약). 표시 record(창 최대 겹침)에
 * 왕호가 없으면 같은 인물의 다른 record 왕호로 폴백한다.
 */
export function chipLabelOf(ruler: ContemporaryRuler, record: ContemporaryRecord): string {
  const recordRegnalName =
    record.regnalName?.trim() ||
    ruler.records.find((other) => other.regnalName?.trim())?.regnalName?.trim()
  const label =
    ruler.person.templeName?.trim() || recordRegnalName || displayNameOf(ruler)
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
 * 칩 상세 — 본명(라벨이 왕호일 때)·겹친 기간(정렬 근거)·복수 재위 스팬. 칩 본문엔
 * 안 들어가는 정보를 aria-label·title로 노출해, 순서 근거 불투명을 보강한다.
 * 직위는 positionText로 칩에 상시 노출되므로 여기서 반복하지 않는다.
 * 서수(regnalNumber) 텍스트화는 이름 표기 관례(서양 'N세' vs 로마숫자)가 갈려 제외.
 */
export function chipDetailTextOf(
  ruler: ContemporaryRuler,
  primaryRecord: ContemporaryRecord,
): string {
  const parts: string[] = []
  // 라벨이 묘호·왕호면 본명(표시명)을 병기 — 수장비교 보드의 '왕호 (본명)' 관례와 대칭
  const displayName = displayNameOf(ruler)
  if (displayName && chipLabelOf(ruler, primaryRecord) !== displayName) {
    parts.push(`본명 ${displayName}`)
  }
  parts.push(`겹침 ${Math.max(0, ruler.overlapYears)}년`)
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
    const category = categoryOfRecord(record)
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
      category,
      spanText: spanTextOf(ruler, record),
      positionText: record.title?.trim() || CATEGORY_TOKENS[category].label,
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
