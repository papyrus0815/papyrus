import type {
  GovernmentHeadTenureInCabinetList,
  RegnalEraDto,
} from '@/shared/api/person-career'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'

import {
  CABINET_PARTY_ROLE_OPTIONS,
  TL_POSITION_BADGE_LINE_HEXES,
  TL_TERRITORY_PALETTE,
} from './cabinets-section.constants'

export function getPersonName(
  person:
    | {
        name?: string | null
        surname?: string | null
        middleName?: string | null
        country?: { defaultNameDisplayOrder?: string | null } | null
      }
    | null
    | undefined,
): string {
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

/** 재임 `notes`에 저장된 `왕명: …` (역대 수반·군주 등록과 동일) */
export function getRegnalNameFromNotes(
  notes: string | null | undefined,
): string | null {
  if (!notes?.trim()) return null
  const m =
    notes.match(/왕명\s*:\s*(.+?)(?:\n|$)/i) ||
    notes.match(/왕명\s*:\s*(.+)/i)
  return m ? m[1].trim() : null
}

/**
 * 군주·국가 원수 재임 표시명 — 등록한 군주명(왕명)이 있으면 그것을, 없으면 인물 표시명.
 */
export function getRegnalOrPersonDisplayName(
  tenure: {
    notes?: string | null
    person?: Parameters<typeof getPersonName>[0] | null
  } | null | undefined,
): string {
  if (!tenure) return '—'
  const regnal = getRegnalNameFromNotes(tenure.notes)
  if (regnal?.trim()) return regnal.trim()
  if (tenure.person) return getPersonName(tenure.person)
  return '—'
}

/** 인물 출신 한 줄 — API `birthCity` / `birthAdminDivision` / `birthPlaceText` */
export function getPersonBirthPlaceLabel(
  person:
    | {
        birthCity?: { name?: string | null } | null
        birthAdminDivision?: { name?: string | null } | null
        birthPlaceText?: string | null
      }
    | null
    | undefined,
): string | null {
  if (!person) return null
  const city = person.birthCity?.name?.trim()
  if (city) return city
  const div = person.birthAdminDivision?.name?.trim()
  if (div) return div
  const text = person.birthPlaceText?.trim()
  return text || null
}

/** 수반 재임 기준 상단 브레드크럼: 「제N대 [M기] 이름」 또는 이름만 / 없으면 「행정부 상세」 */
export function formatCabinetHeadBreadcrumbLabel(
  headTenure:
    | {
        person?: Parameters<typeof getPersonName>[0]
        termNumber?: number | null
        regnalNumber?: number | null
        subTermNumber?: number | null
      }
    | null
    | undefined,
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

export function formatDate(value: string | Date | null | undefined): string {
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
  const t = typeof ach.tenureId === 'string' ? ach.tenureId.trim() : ''
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
    head.historicalCountry?.name?.trim() || head.country?.name?.trim() || null
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
  cabinet:
    | {
        id?: string
        name?: string | null
        headTenure?: HeadForTerritoryKey | null
      }
    | null
    | undefined,
): string {
  const base = territoryKeyFromHead(cabinet?.headTenure)
  const extra = cabinet?.name?.trim()
  if (extra) return `${base}|name:${extra}`
  return base
}

/**
 * 타임라인 카드 강조색 — `ordinalByTerritoryKey`는 `buildCabinetTerritoryOrdinalMap(filteredCabinets)` 사용.
 */

/**
 * 타임라인 직책 뱃지 선색 — 직위 정의 id가 있으면 그걸로, 없으면 표시 직함 문자열로 해시해 팔레트에서 고름.
 * 같은 직위(같은 id 또는 같은 직함 문자열)는 항상 같은 색.
 */
export function lineColorForCabinetHeadPositionBadge(
  input: {
    positionDefinitionId?: string | null
    tenureTitle?: string | null
    definitionTitle?: string | null
  },
  defaultLineHex: string,
): string {
  const n = TL_POSITION_BADGE_LINE_HEXES.length
  if (n === 0) return defaultLineHex

  const defId =
    typeof input.positionDefinitionId === 'string'
      ? input.positionDefinitionId.trim()
      : ''
  if (defId) {
    return TL_POSITION_BADGE_LINE_HEXES[
      hashStringFnv1a(`pd:${defId}`) % n
    ] as string
  }

  const title =
    (typeof input.definitionTitle === 'string'
      ? input.definitionTitle.trim()
      : '') ||
    (typeof input.tenureTitle === 'string' ? input.tenureTitle.trim() : '')
  if (!title) return defaultLineHex

  return TL_POSITION_BADGE_LINE_HEXES[
    hashStringFnv1a(`title:${title}`) % n
  ] as string
}

export function paletteForCabinetListItem(
  cabinet:
    | {
        name?: string | null
        headTenure?: HeadForTerritoryKey | null
      }
    | null
    | undefined,
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
  head:
    | {
        historicalCountry?: { name?: string | null } | null
        country?: { name?: string | null } | null
      }
    | null
    | undefined,
  fallbackModernCountryName: string,
): string {
  if (!head) return fallbackModernCountryName
  if (head.historicalCountry?.name) return head.historicalCountry.name
  if (head.country?.name) return head.country.name
  return fallbackModernCountryName
}

/** 타임라인 범례·툴팁용 — 소속 + 행정부 명칭이 있으면 구분 */
export function getCabinetTerritoryLegendLabel(
  cabinet:
    | {
        name?: string | null
        headTenure?: HeadForTerritoryKey | null
      }
    | null
    | undefined,
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
  const y = p.startEra === 'BC' ? -p.startYear : p.startYear
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
  options?: { groupByHeadTerritory?: boolean },
): CabinetTerritoryLegendEntry[] {
  if (options?.groupByHeadTerritory) {
    const firstByBase = new Map<
      string,
      { name?: string | null; headTenure?: HeadForTerritoryKey | null }
    >()
    for (const c of cabinets) {
      const b = territoryKeyFromHead(c.headTenure)
      if (!firstByBase.has(b)) firstByBase.set(b, c)
    }
    const bases = [...firstByBase.keys()].sort((a, bb) => {
      const ka = sortKeyForTerritoryLegendEntry(a, sortContext)
      const kb = sortKeyForTerritoryLegendEntry(bb, sortContext)
      if (ka !== kb) return ka - kb
      return a.localeCompare(bb, 'ko')
    })
    const out: CabinetTerritoryLegendEntry[] = []
    bases.forEach((base, ord) => {
      const cab = firstByBase.get(base)!
      const line = TL_TERRITORY_PALETTE[ord % TL_TERRITORY_PALETTE.length].line
      const label = getHeadTenureTerritoryLabel(
        cab.headTenure,
        fallbackModernCountryName,
      )
      out.push({ key: base, label, line })
    })
    return out
  }

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
    const line = TL_TERRITORY_PALETTE[ord % TL_TERRITORY_PALETTE.length].line
    const label = getCabinetTerritoryLegendLabel(cab, fallbackModernCountryName)
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

/** 직함 판별용 — 정의·재임·영문·현지어·비고 앞부분을 한 덩어리로 */
export function headTenureTitleBundle(
  head: GovernmentHeadTenureInCabinetList | null | undefined,
): string {
  if (!head) return ''
  const def = head.positionDefinition
  const parts = [
    def?.title,
    def?.titleEn,
    def?.titleLocal,
    head.title,
    head.titleEn,
    head.notes?.slice(0, 400),
  ].filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
  try {
    return parts.join(' ').normalize('NFKC')
  } catch {
    return parts.join(' ')
  }
}

/**
 * 군주 직함 판별용 — `notes`는 제외.
 * 비고에 「천황 재위 중」「당시 황제」 등 서술이 있으면 총리 재임이 군주로 오인된다.
 */
function headTenureTitleBundleForSovereignCheck(
  head: GovernmentHeadTenureInCabinetList | null | undefined,
): string {
  if (!head) return ''
  const def = head.positionDefinition
  const parts = [
    def?.title,
    def?.titleEn,
    def?.titleLocal,
    head.title,
    head.titleEn,
  ].filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
  try {
    return parts.join(' ').normalize('NFKC')
  } catch {
    return parts.join(' ')
  }
}

/**
 * 직함 번들에 군주·황제 계열 표기가 있으면 참 (`notes` 제외).
 * 총리 직함이면 제외. (구버전은 천황·황제·술탄·차르만 봐서 유럽 국왕·King 등이 행정부 타임라인 군주 띠에서 빠졌음)
 */
function tenureBundleHasSovereignMonarchTitle(
  head: GovernmentHeadTenureInCabinetList | null | undefined,
): boolean {
  if (!head) return false
  const tb = headTenureTitleBundleForSovereignCheck(head)
  if (/내각총리|內閣總理|内閣総理|首相|총리대신|Prime\s+Minister/i.test(tb)) {
    return false
  }
  return (
    /천황|황제|皇帝|술탄|Sultan|차르|Tsar|국왕|国王|大公|대공|Archduke|Grand\s+Duke/i.test(
      tb,
    ) ||
    /\b(?:King|Queen|Kaiser|Kaiserin|König|Königin|Emperor|Empress|Tsarina|Shah|Shahbanu)\b/i.test(
      tb,
    ) ||
    /(?:^|[\s·\-/])(?:Re|Rey|Roi|Reine)\b/i.test(tb)
  )
}

/**
 * 행정부 타임라인에서만 숨길 때 쓰는 좁은 직함 판별.
 * 총리가 실질 수반인 체제에서 원수 내각 행이 겹치는 경우(천황·황제·술탄·차르 등)만 숨긴다.
 * 국왕·King·Kaiser 등 유럽식 군주 직접 통치 내각은 그리드에 남긴다.
 */
function tenureBundleHasCeremonialHeadCabinetHideTitle(
  head: GovernmentHeadTenureInCabinetList | null | undefined,
): boolean {
  if (!head) return false
  const tb = headTenureTitleBundleForSovereignCheck(head)
  if (/내각총리|內閣總理|内閣総理|首相|총리대신|Prime\s+Minister/i.test(tb)) {
    return false
  }
  return /천황|황제|皇帝|天皇|술탄|Sultan|차르|Tsar|Tsarina/i.test(tb)
}

/**
 * 내각(행정부) 타임라인에서 숨길 수반인지 — `HEAD_OF_STATE`(또는 타입 없음)이면서
 * 의례적 원수(천황·황제·술탄·차르 등)로만 판별. 국왕 직함 수반 행정부는 표시한다.
 */
export function shouldHideCabinetFromExecutiveTimeline(
  head: GovernmentHeadTenureInCabinetList | null | undefined,
): boolean {
  if (!head) return false
  const pt = head.positionType ?? head.positionDefinition?.positionType ?? null

  if (pt != null && pt !== '' && pt !== 'HEAD_OF_STATE') {
    return false
  }

  return tenureBundleHasCeremonialHeadCabinetHideTitle(head)
}

/**
 * 타임라인 군주 색·연호·기간 겹침 — 직함 번들이 군주·황제 계열로 판별될 때.
 */
export function isSovereignMonarchTenureForCabinetTimeline(
  head: GovernmentHeadTenureInCabinetList | null | undefined,
): boolean {
  if (!head) return false
  const pt = head.positionType ?? head.positionDefinition?.positionType ?? null
  if (pt === 'HEAD_OF_GOVERNMENT') return false
  return tenureBundleHasSovereignMonarchTitle(head)
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
  const ed = era.endDay ?? lastUtcDayInMonth(era.endYear, era.endMonth ?? 12)
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
export function formatReignEraLineLabel(
  era: RegnalEraDto | null,
): string | null {
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

function headTenureDateRangeMs(tenure: {
  startDate?: string | null
  endDate?: string | null
}): { start: number; end: number } | null {
  if (!tenure.startDate) return null
  const start = new Date(tenure.startDate).getTime()
  if (Number.isNaN(start)) return null
  const end = tenure.endDate ? new Date(tenure.endDate).getTime() : Date.now()
  if (Number.isNaN(end)) return { start, end: Date.now() }
  return { start, end: Math.max(start, end) }
}

/**
 * 국가 상세 「행정부」타임라인의 국가 범위.
 * 현대국가 페이지: `countryId`만 있는 총리 재임과 `historicalCountryId`만 있는 천황 재임을 한 묶음으로 본다.
 */
export type CabinetTimelineCountryScope =
  | {
      kind: 'modern'
      modernCountryId: string
      linkedHistoricalCountryIds: readonly string[]
    }
  | { kind: 'historical'; historicalCountryId: string }

export function tenureInCabinetTimelineCountryScope(
  t: {
    countryId?: string | null
    historicalCountryId?: string | null
  },
  scope: CabinetTimelineCountryScope,
): boolean {
  if (scope.kind === 'historical') {
    return (
      t.historicalCountryId === scope.historicalCountryId &&
      t.historicalCountryId != null &&
      t.historicalCountryId !== ''
    )
  }
  const linked = new Set(scope.linkedHistoricalCountryIds)
  if (t.historicalCountryId != null && t.historicalCountryId !== '') {
    return linked.has(t.historicalCountryId)
  }
  return (
    t.countryId === scope.modernCountryId &&
    (t.historicalCountryId == null || t.historicalCountryId === '')
  )
}

function headTenuresMatchForMonarchOverlap(
  monarch: GovernmentHeadTenureInCabinetList,
  execHead: GovernmentHeadTenureInCabinetList,
  scope: CabinetTimelineCountryScope | null | undefined,
): boolean {
  if (scope) {
    return (
      tenureInCabinetTimelineCountryScope(monarch, scope) &&
      tenureInCabinetTimelineCountryScope(execHead, scope)
    )
  }
  return cabinetHeadSameTerritoryAsTenure(monarch, execHead)
}

/**
 * 행정부 수반(내각용·군주 아님) 재임 기간이, 같은 영토에 등록된 군주 재임 기간과 겹치는지.
 * 타임라인에서 「해당 군주 재위 중의 행정부」만 가로 강조할 때 사용.
 * `scope`가 있으면 현대국가+연결 역사국가를 한 범위로 매칭한다.
 */
export function executiveHeadOverlapsMonarchReignInCountry(
  execHead: GovernmentHeadTenureInCabinetList | null | undefined,
  allCountryTenures:
    | readonly GovernmentHeadTenureInCabinetList[]
    | null
    | undefined,
  scope?: CabinetTimelineCountryScope | null,
): boolean {
  if (!execHead?.startDate || !allCountryTenures?.length) return false
  if (shouldHideCabinetFromExecutiveTimeline(execHead)) return false

  const execRange = headTenureDateRangeMs(execHead)
  if (!execRange) return false

  for (const m of allCountryTenures) {
    if (!isSovereignMonarchTenureForCabinetTimeline(m)) continue
    if (!headTenuresMatchForMonarchOverlap(m, execHead, scope)) continue
    const mRange = headTenureDateRangeMs(m)
    if (!mRange) continue
    if (execRange.start <= mRange.end && mRange.start <= execRange.end)
      return true
  }
  return false
}

/** `#rgb` / `#rrggbb` → 0–255 */
function parseHexRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '').trim()
  if (h.length === 3) {
    return {
      r: parseInt(h[0] + h[0], 16),
      g: parseInt(h[1] + h[1], 16),
      b: parseInt(h[2] + h[2], 16),
    }
  }
  if (h.length >= 6) {
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    }
  }
  return { r: 99, g: 102, b: 241 }
}

/** 타임라인 가로 띠 — 스파인 위 얇은 하이라이트(과한 글로우 제거) */
export function cabinetTimelineMonarchRailGradient(
  lineHex: string,
  isDark: boolean,
): string {
  const { r, g, b } = parseHexRgb(lineHex)
  const e = isDark ? 0.18 : 0.12
  const m = isDark ? 0.52 : 0.4
  return `linear-gradient(90deg, rgba(${r},${g},${b},0) 0%, rgba(${r},${g},${b},${e}) 12%, rgba(${r},${g},${b},${m}) 50%, rgba(${r},${g},${b},${e}) 88%, rgba(${r},${g},${b},0) 100%)`
}

/** 군주 범례·연호 칩 테두리/배경 */
export function cabinetTimelineMonarchUiTint(
  lineHex: string,
  isDark: boolean,
): { border: string; background: string } {
  const { r, g, b } = parseHexRgb(lineHex)
  return {
    border: `rgba(${r},${g},${b},${isDark ? 0.32 : 0.22})`,
    background: `rgba(${r},${g},${b},${isDark ? 0.12 : 0.07})`,
  }
}

/** 연호·직함만 — 인물 이름은 행정부 카드/축에 넣지 않음 */
function monarchCaptionFromTenure(
  monarch: GovernmentHeadTenureInCabinetList,
  execStartIso: string,
): string {
  const era = pickRegnalEraForDate(monarch.regnalEras, execStartIso)
  const eraLine = formatReignEraLineLabel(era)
  if (eraLine) return eraLine
  const t =
    monarch.positionDefinition?.title?.trim() || monarch.title?.trim() || '군주'
  return t
}

/** 타임라인 군주 범례 — 등록 왕명(군주명) 우선, 다음 인물명, 없으면 연호 */
export function sovereignLegendPersonLabelFromMonarchTenure(
  m: GovernmentHeadTenureInCabinetList | null | undefined,
  pivotIso: string | null | undefined,
): string {
  if (!m) return '—'
  const regnal = getRegnalNameFromNotes(m.notes)
  if (regnal?.trim()) return regnal.trim()
  const nm = getPersonName(m.person)
  if (nm && nm !== '—') return nm
  const iso = (pivotIso ?? m.startDate ?? '').trim()
  if (!iso) return '—'
  const era = pickRegnalEraForDate(m.regnalEras, iso)
  return formatReignEraLineLabel(era) ?? '—'
}

/**
 * 내각 수반 재임과 날짜로 겹치는 군주 재임 한 건(겹침 길이 최대).
 */
export function overlappingMonarchTenureForExecutiveHead(
  execHead: GovernmentHeadTenureInCabinetList | null | undefined,
  allCountryTenures:
    | readonly GovernmentHeadTenureInCabinetList[]
    | null
    | undefined,
  scope?: CabinetTimelineCountryScope | null,
): GovernmentHeadTenureInCabinetList | null {
  if (!execHead?.startDate || !allCountryTenures?.length) return null
  if (shouldHideCabinetFromExecutiveTimeline(execHead)) return null

  const execRange = headTenureDateRangeMs(execHead)
  if (!execRange) return null

  let best: GovernmentHeadTenureInCabinetList | null = null
  let bestOverlap = -1
  for (const m of allCountryTenures) {
    if (!isSovereignMonarchTenureForCabinetTimeline(m)) continue
    if (!headTenuresMatchForMonarchOverlap(m, execHead, scope)) continue
    const mRange = headTenureDateRangeMs(m)
    if (!mRange) continue
    if (execRange.start <= mRange.end && mRange.start <= execRange.end) {
      const ov =
        Math.min(execRange.end, mRange.end) -
        Math.max(execRange.start, mRange.start)
      if (ov > bestOverlap) {
        bestOverlap = ov
        best = m
      }
    }
  }
  return best
}

/**
 * 내각 수반 재임과 날짜로 겹치는 군주 — 타임라인 축·범례용 짧은 캡션(연호·직함, 인물명 없음).
 */
export function overlappingMonarchCaptionForExecutiveHead(
  execHead: GovernmentHeadTenureInCabinetList | null | undefined,
  allCountryTenures:
    | readonly GovernmentHeadTenureInCabinetList[]
    | null
    | undefined,
  scope?: CabinetTimelineCountryScope | null,
): string | null {
  if (!execHead?.startDate) return null
  const mon = overlappingMonarchTenureForExecutiveHead(
    execHead,
    allCountryTenures,
    scope,
  )
  if (!mon) return null
  return monarchCaptionFromTenure(mon, execHead.startDate)
}

function unionExecutiveHeadRangesMs(
  timelineCabinets: readonly {
    headTenure: GovernmentHeadTenureInCabinetList
  }[],
): { start: number; end: number } | null {
  let minS = Infinity
  let maxE = -Infinity
  for (const c of timelineCabinets) {
    const h = c.headTenure
    if (!h || shouldHideCabinetFromExecutiveTimeline(h)) continue
    const r = headTenureDateRangeMs(h)
    if (!r) continue
    if (r.start < minS) minS = r.start
    if (r.end > maxE) maxE = r.end
  }
  if (minS === Infinity) return null
  return { start: minS, end: maxE }
}

export type MonarchReignLegendItem = {
  id: string
  label: string
  startYear: number
  endYear: number
}

/** 타임라인에 올라온 행정부 기간과 겹치는 군주 재위 — 헤더 표기용 */
export function monarchReignLegendForCabinetTimeline(
  timelineCabinets: readonly {
    headTenure: GovernmentHeadTenureInCabinetList
  }[],
  allCountryTenures:
    | readonly GovernmentHeadTenureInCabinetList[]
    | null
    | undefined,
  scope: CabinetTimelineCountryScope,
): MonarchReignLegendItem[] {
  if (!allCountryTenures?.length || !timelineCabinets.length) return []

  const union = unionExecutiveHeadRangesMs(timelineCabinets)
  if (!union) return []

  const nowY = new Date().getFullYear()
  const out: MonarchReignLegendItem[] = []
  const seen = new Set<string>()

  for (const m of allCountryTenures) {
    if (!isSovereignMonarchTenureForCabinetTimeline(m) || !m.startDate) continue
    if (!tenureInCabinetTimelineCountryScope(m, scope)) continue
    const mr = headTenureDateRangeMs(m)
    if (!mr) continue
    if (mr.end < union.start || mr.start > union.end) continue
    if (seen.has(m.id)) continue
    seen.add(m.id)
    const cap = monarchCaptionFromTenure(m, m.startDate)
    const sy = new Date(m.startDate).getFullYear()
    const ey = m.endDate ? new Date(m.endDate).getFullYear() : nowY
    out.push({
      id: m.id,
      label: `${cap} ${sy}–${ey}`,
      startYear: sy,
      endYear: ey,
    })
  }
  out.sort((a, b) => a.startYear - b.startYear)
  return out
}

/** 타임라인 헤더 연도 — 행정부 수반 재임 시작·끝 + (겹치는) 군주 재위 시작·끝 포함 */
export function cabinetTimelineHeaderYearRange(
  timelineCabinets: readonly {
    headTenure: GovernmentHeadTenureInCabinetList
  }[],
  allCountryTenures:
    | readonly GovernmentHeadTenureInCabinetList[]
    | null
    | undefined,
  scope?: CabinetTimelineCountryScope | null,
): { minY: number | null; maxY: number | null } {
  const years: number[] = []
  const nowY = new Date().getFullYear()

  for (const c of timelineCabinets) {
    const h = c.headTenure
    if (!h?.startDate) continue
    const sy = new Date(h.startDate).getFullYear()
    if (!Number.isNaN(sy)) years.push(sy)
    const ey = h.endDate ? new Date(h.endDate).getFullYear() : nowY
    if (!Number.isNaN(ey)) years.push(ey)
  }

  if (allCountryTenures?.length) {
    for (const c of timelineCabinets) {
      const h = c.headTenure
      if (!h?.startDate || shouldHideCabinetFromExecutiveTimeline(h)) continue
      const execRange = headTenureDateRangeMs(h)
      if (!execRange) continue
      for (const m of allCountryTenures) {
        if (!isSovereignMonarchTenureForCabinetTimeline(m)) continue
        if (!headTenuresMatchForMonarchOverlap(m, h, scope)) continue
        const mRange = headTenureDateRangeMs(m)
        if (!mRange) continue
        if (execRange.start <= mRange.end && mRange.start <= execRange.end) {
          const ms = new Date(m.startDate).getFullYear()
          if (!Number.isNaN(ms)) years.push(ms)
          const me = m.endDate ? new Date(m.endDate).getFullYear() : nowY
          if (!Number.isNaN(me)) years.push(me)
        }
      }
    }
  }

  if (years.length === 0) return { minY: null, maxY: null }
  return { minY: Math.min(...years), maxY: Math.max(...years) }
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

/**
 * 수반 취임일이 속한 재위 연호·시대 한 줄.
 * 수반 재임에 `regnalEras`가 있으면 우선하고, 없으면 같은 소속의 국가원수 재임 연호를 찾는다.
 */
export function resolveReignEraLineForCabinetHead(
  head: GovernmentHeadTenureInCabinetList | null | undefined,
  countryTenures:
    | readonly GovernmentHeadTenureInCabinetList[]
    | null
    | undefined,
  scope?: CabinetTimelineCountryScope | null,
): string | null {
  if (!head?.startDate) return null
  const iso = head.startDate
  /** 총리 등에 잘못 붙은 연호만으로 메이지 시대 등이 나오지 않게 — 군주 재임만 자기 연호 사용 */
  const own = pickRegnalEraForDate(head.regnalEras, iso)
  if (own && isSovereignMonarchTenureForCabinetTimeline(head)) {
    return formatReignEraLineLabel(own)
  }

  if (!countryTenures?.length) return null
  const monarchs = countryTenures.filter((t) => {
    if (!tenureCoversIsoDate(t, iso)) return false
    if (!isSovereignMonarchTenureForCabinetTimeline(t)) return false
    if (scope) {
      return headTenuresMatchForMonarchOverlap(t, head, scope)
    }
    return cabinetHeadSameTerritoryAsTenure(head, t)
  })
  for (const m of monarchs) {
    const era = pickRegnalEraForDate(m.regnalEras, iso)
    if (era) return formatReignEraLineLabel(era)
  }
  return null
}
