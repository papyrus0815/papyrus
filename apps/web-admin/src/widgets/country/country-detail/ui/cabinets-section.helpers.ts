import type {
  GovernmentHeadTenureInCabinetList,
  RegnalEraDto,
} from '@/shared/api/person-career'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'

import {
  CABINET_PARTY_ROLE_OPTIONS,
  TL_TERRITORY_PALETTE,
} from './cabinets-section.constants'

export function getPersonName(person: {
  name?: string | null
  surname?: string | null
  middleName?: string | null
  country?: { defaultNameDisplayOrder?: string | null } | null
} | null | undefined): string {
  if (!person) return '—'
  return getPersonDisplayName(
    {
      name: person.name ?? '',
      surname: person.surname ?? null,
      middleName: person.middleName ?? null,
      country: person.country ?? null,
    },
    true,
  )
}

/** 수반 재임 기준 상단 브레드크럼: 「제N대 [M기] 이름」 또는 이름만 / 없으면 「행정부 상세」 */
export function formatCabinetHeadBreadcrumbLabel(
  headTenure: {
    person?: Parameters<typeof getPersonName>[0]
    termNumber?: number | null
    regnalNumber?: number | null
    subTermNumber?: number | null
  } | null | undefined,
): string {
  if (!headTenure) return '행정부 상세'
  const n = headTenure.person ? getPersonName(headTenure.person) : null
  const t = headTenure.termNumber ?? headTenure.regnalNumber
  if (!n) return '행정부 상세'
  if (t == null) return n
  const sub =
    headTenure.subTermNumber != null ? ` ${headTenure.subTermNumber}기` : ''
  return `제${t}대${sub} ${n}`
}

/** 퇴임일 기준 나이 계산 (birthDate/birthYear 기반) */
export function calcAgeAtEndTenure(
  person: {
    birthDate?: string | null
    birthYear?: number | null
  } | null,
  tenureEndDate: string | null | undefined,
): number | null {
  if (!person || !tenureEndDate) return null
  const endYear = new Date(tenureEndDate).getFullYear()
  const endMonth = new Date(tenureEndDate).getMonth() + 1
  const endDay = new Date(tenureEndDate).getDate()

  if (person.birthDate) {
    const birth = new Date(person.birthDate)
    let age = endYear - birth.getFullYear()
    if (
      endMonth < birth.getMonth() + 1 ||
      (endMonth === birth.getMonth() + 1 && endDay < birth.getDate())
    )
      age -= 1
    return age >= 0 ? age : null
  }
  if (person.birthYear != null) {
    const age = endYear - person.birthYear
    return age >= 0 ? age : null
  }
  return null
}

/** 재임 기록 목록 — 시간순(이른 날짜 먼저) 정렬 */
export function compareTenureAchievementsChronological(
  a: { startDate?: string | null },
  b: { startDate?: string | null },
): number {
  const as = a.startDate ? String(a.startDate).slice(0, 10) : ''
  const bs = b.startDate ? String(b.startDate).slice(0, 10) : ''
  if (as && bs) return as.localeCompare(bs)
  if (as) return -1
  if (bs) return 1
  return 0
}

/** 타임라인 연도 뱃지 — 시작일 기준 연도 */
export function tenureAchievementPrimaryYearLabel(
  startDate: string | null | undefined,
): string {
  if (!startDate) return '기간 미정'
  const y = String(startDate).slice(0, 4)
  return /^\d{4}$/.test(y) ? y : '기간'
}

export function formatDate(
  value: string | Date | null | undefined,
): string {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return '—'
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}.${m}.${d}`
}

/** 다국 행정부 묶음으로 병합되어, 현재 재임 화면에 끌어온 소스 재임의 업적인지 */
export function isLinkagePeerAchievement(
  ach: { tenureId?: string | null },
  contextTenureId: string,
): boolean {
  const t =
    typeof ach.tenureId === 'string' ? ach.tenureId.trim() : ''
  return t.length > 0 && t !== contextTenureId
}

/** 리치텍스트 HTML의 첫 이미지 src (썸네일용) */
const IMG_SRC_RE = /<img[^>]+src=["']([^"']+)["']/i
export function extractFirstImageSrcFromHtml(html: string): string | null {
  if (!html || typeof html !== 'string') return null
  const m = html.match(IMG_SRC_RE)
  const raw = m?.[1]?.trim()
  return raw || null
}

const TENURE_BODY_IMG_TAG_RE = /<img\b/i

/**
 * 읽기/편집 초기값 공통: 재임 칸·사건 정본 중 무엇을 보여줄지.
 * - 한쪽만 있으면 그쪽
 * - 둘 다 있으면: 한쪽에만 이미지가 있으면 그쪽(요약은 재임·그림은 사건에 둔 경우 대비)
 * - 둘 다 글+그림이면 재임 칸 우선
 */
export function getTenureAchievementDisplayBody(selAch: {
  description?: string | null
  event?: { description?: string | null } | null
}): string {
  const rawLocal = selAch.description ?? ''
  const rawEvent = selAch.event?.description ?? ''
  const hasLocal = rawLocal.trim() !== ''
  const hasEvent = rawEvent.trim() !== ''
  if (!hasEvent) return rawLocal
  if (!hasLocal) return rawEvent
  const localImg = TENURE_BODY_IMG_TAG_RE.test(rawLocal)
  const eventImg = TENURE_BODY_IMG_TAG_RE.test(rawEvent)
  if (eventImg && !localImg) return rawEvent
  return rawLocal
}

/** 리치텍스트 HTML을 평문으로 줄여 카드 요약 등에 사용 */
export function stripHtmlToPlain(html: string, maxLen: number): string {
  const plain = html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (plain.length <= maxLen) return plain
  return `${plain.slice(0, maxLen)}…`
}

export const APPOINTMENT_METHOD_LABEL: Record<string, string> = {
  DIRECT_ELECTION: '직접 선거',
  INDIRECT_ELECTION: '간접 선거',
  PARLIAMENTARY_ELECTION: '의회 선출',
  APPOINTMENT: '임명',
  HEREDITARY: '세습',
  COUP: '쿠데타 / 혁명',
  OTHER: '기타',
}

export const END_REASON_LABEL: Record<string, string> = {
  TERM_COMPLETED: '임기 만료',
  RESIGNATION: '사임 / 사퇴',
  ABDICATION: '자진 퇴위',
  SUCCESSION_TRANSFER: '양위 / 선위',
  REMOVAL: '폐위 / 해임',
  IMPEACHMENT: '탄핵',
  DEATH_IN_OFFICE: '재임 중 사망',
  OVERTHROWN: '쿠데타 / 혁명으로 축출',
  WAR_DEFEAT: '전쟁 패배',
  STATE_DISSOLVED: '국가 멸망',
  OTHER: '기타',
}

/** 두 날짜 사이 재임기간을 "N년 M개월 D일" 형태로 반환 */
export function calcTenureDuration(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): string | null {
  if (!startDate) return null
  const start = new Date(startDate)
  const end = endDate ? new Date(endDate) : new Date()

  let years = end.getFullYear() - start.getFullYear()
  let months = end.getMonth() - start.getMonth()
  let days = end.getDate() - start.getDate()

  if (days < 0) {
    months -= 1
    const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0)
    days += prevMonth.getDate()
  }
  if (months < 0) {
    years -= 1
    months += 12
  }

  const parts: string[] = []
  if (years > 0) parts.push(`${years}년`)
  if (months > 0) parts.push(`${months}개월`)
  if (days > 0 || parts.length === 0) parts.push(`${days}일`)
  return parts.join(' ')
}

export function labelCabinetPartyRole(role: string): string {
  return (
    CABINET_PARTY_ROLE_OPTIONS.find((option) => option.value === role)?.label ??
    role
  )
}

export type CabinetTerritoryPalette = (typeof TL_TERRITORY_PALETTE)[number]

type HeadForTerritoryKey = {
  historicalCountryId?: string | null
  countryId?: string | null
  historicalCountry?: { id?: string | null; name?: string | null } | null
  country?: { id?: string | null; name?: string | null } | null
}

/** 목록·필터에서 소속 구분 키 (위젯에서 ordinal 맵과 함께 사용) */
export function territoryKeyFromHead(
  head: HeadForTerritoryKey | null | undefined,
): string {
  if (!head) return 'default'
  const raw = head as Record<string, unknown>
  const hid =
    head.historicalCountryId ??
    (typeof raw.historical_country_id === 'string'
      ? raw.historical_country_id
      : null) ??
    head.historicalCountry?.id ??
    null
  const cid =
    head.countryId ??
    (typeof raw.country_id === 'string' ? raw.country_id : null) ??
    head.country?.id ??
    null
  if (hid) return `h:${hid}`
  if (cid) return `c:${cid}`
  const name =
    head.historicalCountry?.name?.trim() ||
    head.country?.name?.trim() ||
    null
  if (name) return `n:${name}`
  return 'default'
}

/** FNV-1a 32bit — ordinal 맵 없을 때만 사용 */
function hashStringFnv1a(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/**
 * 행정부 1건 기준 키 — 수반 재임 소속 + (있으면) 행정부 명칭.
 * 역사국가 ID가 비어 있고 현대국가만 같을 때도, 행정부 이름이 다르면 색이 갈라짐.
 */
export function territoryKeyFromCabinet(
  cabinet: {
    id?: string
    name?: string | null
    headTenure?: HeadForTerritoryKey | null
  } | null | undefined,
): string {
  const base = territoryKeyFromHead(cabinet?.headTenure)
  const extra = cabinet?.name?.trim()
  if (extra) return `${base}|name:${extra}`
  return base
}

/**
 * 타임라인 카드 강조색 — `ordinalByTerritoryKey`는 `buildCabinetTerritoryOrdinalMap(filteredCabinets)` 사용.
 */
export function paletteForCabinetListItem(
  cabinet: {
    name?: string | null
    headTenure?: HeadForTerritoryKey | null
  } | null | undefined,
  ordinalByTerritoryKey?: Map<string, number> | null,
): CabinetTerritoryPalette {
  const key = territoryKeyFromCabinet(cabinet)
  if (ordinalByTerritoryKey && ordinalByTerritoryKey.size > 0) {
    const ord = ordinalByTerritoryKey.get(key) ?? 0
    return TL_TERRITORY_PALETTE[ord % TL_TERRITORY_PALETTE.length]
  }
  const h = hashStringFnv1a(key)
  return TL_TERRITORY_PALETTE[h % TL_TERRITORY_PALETTE.length]
}

/** `filteredCabinets` 기준으로 소속(+행정부명) 키 → 0..n-1 (정렬된 키 순) */
export function buildCabinetTerritoryOrdinalMap(
  cabinets: {
    id?: string
    name?: string | null
    headTenure?: HeadForTerritoryKey | null
  }[],
): Map<string, number> {
  const keys = new Set<string>()
  for (const c of cabinets) {
    keys.add(territoryKeyFromCabinet(c))
  }
  const sorted = [...keys].sort()
  const m = new Map<string, number>()
  sorted.forEach((k, i) => m.set(k, i))
  return m
}

/** 카드에 표시할 소속 국가명 — API가 country/historicalCountry를 내려줄 때 사용 */
export function getHeadTenureTerritoryLabel(
  head: {
    historicalCountry?: { name?: string | null } | null
    country?: { name?: string | null } | null
  } | null | undefined,
  fallbackModernCountryName: string,
): string {
  if (!head) return fallbackModernCountryName
  if (head.historicalCountry?.name) return head.historicalCountry.name
  if (head.country?.name) return head.country.name
  return fallbackModernCountryName
}

/** 타임라인 범례·툴팁용 — 소속 + 행정부 명칭이 있으면 구분 */
export function getCabinetTerritoryLegendLabel(
  cabinet: {
    name?: string | null
    headTenure?: HeadForTerritoryKey | null
  } | null | undefined,
  fallbackModernCountryName: string,
): string {
  const base = getHeadTenureTerritoryLabel(
    cabinet?.headTenure,
    fallbackModernCountryName,
  )
  const cn = cabinet?.name?.trim()
  if (cn) return `${base} · ${cn}`
  return base
}

export type CabinetTerritoryLegendEntry = {
  key: string
  label: string
  line: string
}

/** 범례 정렬 — 시작일이 빠른(오래된) 국가가 먼저. 현대국가(페이지)는 보통 맨 뒤 */
export type CabinetTerritoryLegendSortContext = {
  modernCountryId?: string
  historicalCountries?: Array<{
    id: string
    startYear?: number | null
    startEra?: string | null
    startMonth?: number | null
    startDay?: number | null
  }>
  /** 역사국가 단독 상세 페이지 */
  pageHistoricalCountry?: {
    id: string
    startYear?: number | null
    startEra?: string | null
    startMonth?: number | null
    startDay?: number | null
  }
}

const SORT_KEY_MODERN_PAGE = 9_000_000_000
const SORT_KEY_UNKNOWN = 9_000_000_001
const SORT_KEY_NAME_ONLY = 9_000_000_002

/** BC/AD·연월일 → 숫자 한 줄(오름차순 = 시간 순) */
function historicalEntityStartSortKey(p: {
  startYear?: number | null
  startEra?: string | null
  startMonth?: number | null
  startDay?: number | null
}): number {
  if (p.startYear == null) return SORT_KEY_UNKNOWN
  const y =
    p.startEra === 'BC' ? -p.startYear : p.startYear
  const mo = (p.startMonth ?? 1) - 1
  const da = (p.startDay ?? 1) - 1
  return y * 10_000 + mo * 100 + da
}

function parseTerritoryKeyForSort(key: string): {
  kind: 'h' | 'c' | 'n' | 'default'
  id?: string
} {
  if (key === 'default') return { kind: 'default' }
  const base = key.split('|name:')[0] ?? key
  if (base.startsWith('h:')) return { kind: 'h', id: base.slice(2) }
  if (base.startsWith('c:')) return { kind: 'c', id: base.slice(2) }
  if (base.startsWith('n:')) return { kind: 'n' }
  return { kind: 'default' }
}

function sortKeyForTerritoryLegendEntry(
  key: string,
  ctx: CabinetTerritoryLegendSortContext | undefined,
): number {
  const parsed = parseTerritoryKeyForSort(key)
  if (parsed.kind === 'h' && parsed.id) {
    const fromList = ctx?.historicalCountries?.find((h) => h.id === parsed.id)
    const fromPage =
      ctx?.pageHistoricalCountry?.id === parsed.id
        ? ctx.pageHistoricalCountry
        : undefined
    const meta = fromList ?? fromPage
    if (meta) return historicalEntityStartSortKey(meta)
    return SORT_KEY_UNKNOWN
  }
  if (parsed.kind === 'c' && parsed.id) {
    if (ctx?.modernCountryId && parsed.id === ctx.modernCountryId) {
      return SORT_KEY_MODERN_PAGE
    }
    return SORT_KEY_UNKNOWN
  }
  if (parsed.kind === 'n') return SORT_KEY_NAME_ONLY
  return SORT_KEY_UNKNOWN
}

/** 현재 필터된 목록 기준 소속별 범례(색 점 + 라벨) — 국가 시작일 오름차순, 동일 시 라벨 */
export function buildCabinetTerritoryLegendEntries(
  cabinets: {
    name?: string | null
    headTenure?: HeadForTerritoryKey | null
  }[],
  fallbackModernCountryName: string,
  ordinalByTerritoryKey: Map<string, number>,
  sortContext?: CabinetTerritoryLegendSortContext,
): CabinetTerritoryLegendEntry[] {
  const seen = new Map<
    string,
    { name?: string | null; headTenure?: HeadForTerritoryKey | null }
  >()
  for (const c of cabinets) {
    const k = territoryKeyFromCabinet(c)
    if (!seen.has(k)) seen.set(k, c)
  }
  const out: CabinetTerritoryLegendEntry[] = []
  for (const [key, cab] of seen) {
    const ord = ordinalByTerritoryKey.get(key) ?? 0
    const line =
      TL_TERRITORY_PALETTE[ord % TL_TERRITORY_PALETTE.length].line
    const label = getCabinetTerritoryLegendLabel(
      cab,
      fallbackModernCountryName,
    )
    out.push({ key, label, line })
  }
  out.sort((a, b) => {
    const ka = sortKeyForTerritoryLegendEntry(a.key, sortContext)
    const kb = sortKeyForTerritoryLegendEntry(b.key, sortContext)
    if (ka !== kb) return ka - kb
    return a.label.localeCompare(b.label, 'ko')
  })
  return out
}

/** 연도 버블 본문색 — 라이트는 팔레트 대비색, 다크는 테마 본문색으로 가독성 유지 */
export function getTimelineBubbleTextColors(
  itemP: { line: string; textColor: string },
  isDark: boolean,
  themeText: string,
): { year: string; term: string } {
  if (!isDark) {
    return { year: itemP.textColor, term: itemP.line }
  }
  return { year: themeText, term: itemP.line }
}

/**
 * 내각(행정부) 타임라인에서 숨길 수반인지 — `HEAD_OF_STATE`만으로는 제외하지 않음
 * (대통령 등 공화국 원수 데이터가 전부 국가원수로만 잡혀 있으면 목록이 비게 됨).
 * 군주 직함·연호·재위번호 등이 있을 때만 제외.
 */
export function shouldHideCabinetFromExecutiveTimeline(
  head: GovernmentHeadTenureInCabinetList | null | undefined,
): boolean {
  if (!head) return false
  const pt =
    head.positionType ?? head.positionDefinition?.positionType ?? null
  if (pt !== 'HEAD_OF_STATE') return false

  const title = (
    head.positionDefinition?.title ??
    head.title ??
    ''
  ).trim()
  const monarchTitlePattern =
    /황제|皇帝|天皇|천황|국왕|大韓帝國|대한제국|沙皇|차르|\bEmperor\b|\bTsar\b|\bTsarina\b|\bShah\b|\bKaiser\b|\bKing\b|\bQueen regnant\b/i
  if (monarchTitlePattern.test(title)) return true
  if ((head.regnalEras?.length ?? 0) > 0) return true
  if (head.regnalNumber != null) return true

  return false
}

function lastUtcDayInMonth(year: number, month1to12: number): number {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate()
}

function eraUtcBounds(era: RegnalEraDto): { start: number; end: number } {
  const sm = (era.startMonth ?? 1) - 1
  const sd = era.startDay ?? 1
  const startMs = Date.UTC(era.startYear, sm, sd)
  if (era.endYear == null) {
    return { start: startMs, end: Date.UTC(9999, 11, 31, 23, 59, 59, 999) }
  }
  const em = (era.endMonth ?? 12) - 1
  const ed =
    era.endDay ?? lastUtcDayInMonth(era.endYear, era.endMonth ?? 12)
  const endMs = Date.UTC(era.endYear, em, ed, 23, 59, 59, 999)
  return { start: startMs, end: endMs }
}

export function pickRegnalEraForDate(
  eras: RegnalEraDto[] | null | undefined,
  isoDate: string,
): RegnalEraDto | null {
  if (!eras?.length || !isoDate) return null
  const t = new Date(isoDate).getTime()
  if (Number.isNaN(t)) return null
  const sorted = [...eras].sort((a, b) => a.startYear - b.startYear)
  for (const era of sorted) {
    const { start, end } = eraUtcBounds(era)
    if (t >= start && t <= end) return era
  }
  return null
}

/** 연호명을 「○○ 시대」 형태로 (이미 「…시대」로 끝나면 그대로) */
export function formatReignEraLineLabel(era: RegnalEraDto | null): string | null {
  if (!era?.eraName?.trim()) return null
  const n = era.eraName.trim()
  if (/시대\s*$/.test(n)) return n
  return `${n} 시대`
}

function cabinetHeadSameTerritoryAsTenure(
  head: {
    historicalCountryId?: string | null
    countryId?: string | null
  },
  tenure: {
    historicalCountryId?: string | null
    countryId?: string | null
  },
): boolean {
  const hHist = head.historicalCountryId
  if (hHist != null && hHist !== '') {
    return tenure.historicalCountryId === hHist
  }
  return (
    tenure.countryId === head.countryId &&
    (tenure.historicalCountryId == null || tenure.historicalCountryId === '')
  )
}

function tenureCoversIsoDate(
  tenure: { startDate?: string | null; endDate?: string | null },
  isoDate: string,
): boolean {
  if (!tenure.startDate || !isoDate) return false
  const t = new Date(isoDate).getTime()
  const start = new Date(tenure.startDate).getTime()
  const end = tenure.endDate
    ? new Date(tenure.endDate).getTime()
    : Date.UTC(9999, 11, 31)
  return t >= start && t <= end
}

type TenureWithEras = {
  positionType?: string | null
  startDate?: string | null
  endDate?: string | null
  historicalCountryId?: string | null
  countryId?: string | null
  regnalEras?: RegnalEraDto[] | null
}

/**
 * 수반 취임일이 속한 재위 연호·시대 한 줄.
 * 수반 재임에 `regnalEras`가 있으면 우선하고, 없으면 같은 소속의 국가원수 재임 연호를 찾는다.
 */
export function resolveReignEraLineForCabinetHead(
  head: GovernmentHeadTenureInCabinetList | null | undefined,
  countryTenures: TenureWithEras[] | null | undefined,
): string | null {
  if (!head?.startDate) return null
  const iso = head.startDate
  const own = pickRegnalEraForDate(head.regnalEras, iso)
  if (own) return formatReignEraLineLabel(own)

  if (!countryTenures?.length) return null
  const monarchs = countryTenures.filter(
    (t) =>
      t.positionType === 'HEAD_OF_STATE' &&
      cabinetHeadSameTerritoryAsTenure(head, t) &&
      tenureCoversIsoDate(t, iso),
  )
  for (const m of monarchs) {
    const era = pickRegnalEraForDate(m.regnalEras, iso)
    if (era) return formatReignEraLineLabel(era)
  }
  return null
}
