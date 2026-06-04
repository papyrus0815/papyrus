/**
 * 인물 연보 — 인포그래픽 타임라인
 * 출생·재위·재임·사건·연보를 한 눈에 연도·나이 축 기준으로 표시.
 * - 좌측: 연도 + (나이) 라벨
 * - 중앙: 타임라인 척추(spine) + 카테고리 색 도트 + 기간 막대
 * - 우측: 카드 (제목·날짜·설명)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FiBriefcase,
  FiCalendar,
  FiCircle,
  FiDownload,
  FiFlag,
  FiHeart,
  FiLink,
  FiStar,
  FiUserMinus,
  FiUserPlus,
} from 'react-icons/fi'
import styled, { css, keyframes } from 'styled-components'

import {
  PERSON_LIFE_EVENT_CATEGORY_COLOR,
  PERSON_LIFE_EVENT_CATEGORY_LABEL,
  type PersonLifeEvent,
  type PersonLifeEventCategory,
} from '@/shared/api/person-life-events'
import { isLikelyRichTextHtml } from '@/shared/lib/rich-text-read-view'
import { RichTextReadView } from '@/shared/ui/rich-text-read-view'
import { CATEGORY_ICON } from '@/widgets/person/person-life-event-form-modal/person-life-event-form-modal'

// ───── 타입 ─────
type TimelineKind =
  | 'reign'
  | 'tenure'
  | 'career'
  | 'event'
  | 'life'
  | 'birth'
  | 'death'
  | 'family-birth'
  | 'family-death'
  | 'marriage'

type FamilyRelation = 'father' | 'mother' | 'spouse' | 'child' | 'sibling'

const FAMILY_RELATION_LABEL: Record<FamilyRelation, string> = {
  father: '아버지',
  mother: '어머니',
  spouse: '배우자',
  child: '자녀',
  sibling: '형제자매',
}

export interface FamilyMember {
  id?: string
  name: string
  birthDate?: string | null
  deathDate?: string | null
}

export interface SpouseRelationInput extends FamilyMember {
  marriageStartDate?: string | null
}

interface ReignInput {
  id: string
  startDate?: string | null
  endDate?: string | null
  notes?: string | null
  regnalNumber?: number | null
  positionDefinition?: { title?: string | null } | null
  country?: { name?: string | null } | null
  historicalCountry?: { name?: string | null } | null
}

interface TenureInput {
  id: string
  startDate?: string | null
  endDate?: string | null
  title?: string | null
  notes?: string | null
  termNumber?: number | null
  positionDefinition?: { title?: string | null } | null
  country?: { name?: string | null } | null
  historicalCountry?: { name?: string | null } | null
}

interface CareerInput {
  id: string
  startDate?: string | null
  endDate?: string | null
  title?: string | null
  notes?: string | null
  /** 분야 라벨 (군사·기업·학계 등) — 상위에서 매핑해 전달 */
  kindLabel?: string | null
  organization?: { name?: string | null } | null
  rank?: { name?: string | null } | null
}

interface PersonEventInput {
  id: string
  role?: string | null
  /** 이 인물 시점의 사건 서술 (PersonEvent.note, 장문 가능) */
  note?: string | null
  event?: {
    id?: string | null
    title?: string | null
    startDate?: string | null
    endDate?: string | null
    startDatePrecision?: string | null
    endDatePrecision?: string | null
  } | null
}

export interface PersonLifeTimelineInfographicProps {
  /** 본인 생몰 정보 — 연도·나이 축 계산 및 북엔드 노드 */
  birthDate?: string | null
  deathDate?: string | null
  /** 출생·사망 기원 (BC/AD). null/미지정은 AD */
  birthEra?: string | null
  deathEra?: string | null
  /** 사망 상세 — 연보 "사망" 카드에 함께 표시 */
  deathType?: string | null
  deathCause?: string | null
  deathNote?: string | null
  isAlive?: boolean | null
  /** 소스 데이터 */
  reigns?: ReignInput[] | null
  tenures?: TenureInput[] | null
  careers?: CareerInput[] | null
  events?: PersonEventInput[] | null
  lifeEvents: PersonLifeEvent[]
  /** 가족 이벤트 — 부모·배우자·자녀·형제자매의 출생/사망/혼인 */
  father?: FamilyMember | null
  mother?: FamilyMember | null
  spouses?: SpouseRelationInput[]
  children?: FamilyMember[]
  /** 형제자매 — 사망만 표시 (출생은 본인과 시기가 가까워 노이즈) */
  siblings?: FamilyMember[]
  /** 연보 카드 클릭 → 편집 모달 트리거 (상위에서 공용 모달 열기) */
  onStartEditLife?: (lifeEvent: PersonLifeEvent) => void
  /** 가족 이벤트 카드 클릭 → 해당 인물 상세로 이동 */
  onFamilyPersonClick?: (personId: string) => void
  /** 사건 카드 클릭 → 해당 사건 상세로 이동 */
  onEventClick?: (eventId: string) => void
  /** 빈 상태 CTA — "연보 추가하기" 버튼 콜백 */
  onAddLifeEvent?: () => void
  /**
   * 저장 직후 하이라이트·스크롤할 lifeEvent.id — 상위에서 0.8-1.6초 후 null로 초기화.
   * null이면 하이라이트 없음.
   */
  highlightedLifeEventId?: string | null
}

// ───── 유틸 ─────
function parseDate(iso?: string | null): Date | null {
  if (!iso) return null
  const d = new Date(iso)
  return isNaN(d.getTime()) ? null : d
}

function yearOf(d: Date | null): number | null {
  return d ? d.getFullYear() : null
}

function isoDayKey(d: Date | null): string | null {
  if (!d) return null
  const y = String(d.getFullYear()).padStart(4, '0')
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatWithPrecision(
  d: Date | null,
  precision?: string | null,
): string {
  if (!d) return ''
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  if (precision === 'year') return `${y}년`
  if (precision === 'month') return `${y}년 ${m}월`
  return `${y}년 ${m}월 ${day}일`
}

function formatRange(
  start: Date | null,
  end: Date | null,
  sp?: string | null,
  ep?: string | null,
): string {
  const s = formatWithPrecision(start, sp)
  const e = formatWithPrecision(end, ep)
  if (!s && !e) return ''
  if (s && !e) return s
  if (!s && e) return `? – ${e}`
  return s === e ? s : `${s} – ${e}`
}

/** 사망 유형 enum → 한국어 라벨 (카드 서브타이틀) */
const DEATH_TYPE_LABELS: Record<string, string> = {
  NATURAL: '자연사',
  ILLNESS: '병사',
  ASSASSINATION: '암살',
  EXECUTION: '처형',
  BATTLE: '전사',
  ACCIDENT: '사고사',
  SUICIDE: '자살',
  UNKNOWN: '불명',
  OTHER: '기타',
}

function ageAt(d: Date | null, birth: Date | null): number | null {
  if (!d || !birth) return null
  const age = d.getFullYear() - birth.getFullYear()
  const beforeBirthday =
    d.getMonth() < birth.getMonth() ||
    (d.getMonth() === birth.getMonth() && d.getDate() < birth.getDate())
  return age - (beforeBirthday ? 1 : 0)
}

// ───── 타임라인 노드 ─────
// ───── 필터 ─────
type FilterKey = 'life' | 'reign' | 'tenure' | 'career' | 'event' | 'family'

function kindToFilter(kind: TimelineKind): FilterKey | 'ego' {
  if (kind === 'birth' || kind === 'death') return 'ego'
  if (kind === 'family-birth' || kind === 'family-death' || kind === 'marriage')
    return 'family'
  return kind as FilterKey
}

const FILTER_COLORS = {
  life: '#6366f1',
  reign: '#0f766e',
  tenure: '#4338ca',
  career: '#b45309',
  event: '#0369a1',
  family: '#0d9488',
} as const

const FILTER_OPTIONS: Array<{ key: FilterKey; label: string; color: string }> = [
  { key: 'life', label: '연보', color: FILTER_COLORS.life },
  { key: 'reign', label: '재위', color: FILTER_COLORS.reign },
  { key: 'tenure', label: '재임', color: FILTER_COLORS.tenure },
  { key: 'career', label: '경력', color: FILTER_COLORS.career },
  { key: 'event', label: '사건', color: FILTER_COLORS.event },
  { key: 'family', label: '가족', color: FILTER_COLORS.family },
]

interface TimelineNode {
  key: string
  kind: TimelineKind
  start: Date | null
  end: Date | null
  sortKey: number
  title: string
  subtitle?: string | null
  dateLabel: string
  description?: string | null
  category?: PersonLifeEventCategory | null
  lifeEventSource?: PersonLifeEvent
  familyRelation?: FamilyRelation
  /** 가족 노드의 대상 인물 ID — 카드 클릭으로 해당 인물 상세 이동 */
  familyPersonId?: string
  /** 사건 노드의 사건 ID — 카드 클릭으로 사건 상세 이동 */
  eventId?: string | null
  /** 본인 오늘 기준 기간(일) — 긴 재위/재임에 막대 표시 기준 */
  durationDays?: number | null
}

/** 재위·재임 활성 기간 정보 — 연보/사건 카드의 spine 컨텍스트 색에 사용 */
interface ActiveRange {
  start: Date
  end: Date | null
  color: string
}

/** description HTML에서 figure 개수 — collapse 정책에 활용 */
function countFiguresInHtml(html: string | null | undefined): number {
  if (!html) return 0
  const matches = html.match(/<figure\b/gi)
  return matches ? matches.length : 0
}

/** HTML → 평문 (export Markdown용 — 실제론 Rich text를 그대로 살려 .md에 박아도 자연스럽지만,
 * 여기선 단순화: 대다수 마크업을 평문으로 일자화하고 줄바꿈만 남김) */
function htmlToPlainText(html: string | null | undefined): string {
  if (!html) return ''
  return html
    .replace(/<\/(?:p|div|li|h[1-6]|blockquote|figure|figcaption)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** 인물 연보 전체를 JSON 또는 Markdown 파일로 다운로드 */
function exportLifeEvents(
  lifeEvents: PersonLifeEvent[],
  format: 'json' | 'markdown',
) {
  if (typeof document === 'undefined' || lifeEvents.length === 0) return
  const sorted = [...lifeEvents].sort((a, b) => {
    const aTs = a.startDate ? new Date(a.startDate).getTime() : 0
    const bTs = b.startDate ? new Date(b.startDate).getTime() : 0
    if (aTs !== bTs) return aTs - bTs
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  })

  let content: string
  let mime: string
  let ext: string

  if (format === 'json') {
    content = JSON.stringify(sorted, null, 2)
    mime = 'application/json;charset=utf-8'
    ext = 'json'
  } else {
    const lines: string[] = ['# 인물 연보', '']
    for (const le of sorted) {
      const date = le.startDate
        ? le.endDate && le.endDate !== le.startDate
          ? `${le.startDate.slice(0, 10)} ~ ${le.endDate.slice(0, 10)}`
          : le.startDate.slice(0, 10)
        : '(날짜 미정)'
      const cat = le.category
        ? ` _(${PERSON_LIFE_EVENT_CATEGORY_LABEL[le.category]})_`
        : ''
      lines.push(`## ${le.title}${cat}`)
      lines.push(`*${date}*`)
      const desc = htmlToPlainText(le.description)
      if (desc) {
        lines.push('')
        lines.push(desc)
      }
      lines.push('')
    }
    content = lines.join('\n')
    mime = 'text/markdown;charset=utf-8'
    ext = 'md'
  }

  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `life-events-${new Date()
    .toISOString()
    .slice(0, 10)}.${ext}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** 노드의 시작일이 어떤 재위/재임 기간 안에 들어가면 그 색을 반환 (재위 우선) */
function pickActiveContextColor(
  date: Date | null,
  reignRanges: ActiveRange[],
  tenureRanges: ActiveRange[],
): string | null {
  if (!date) return null
  const ts = date.getTime()
  const inRange = (r: ActiveRange) =>
    ts >= r.start.getTime() && (r.end == null || ts <= r.end.getTime())
  const r = reignRanges.find(inRange)
  if (r) return r.color
  const t = tenureRanges.find(inRange)
  if (t) return t.color
  return null
}

export function PersonLifeTimelineInfographic({
  birthDate,
  deathDate,
  birthEra,
  deathEra,
  deathType,
  deathCause,
  deathNote,
  isAlive,
  reigns,
  tenures,
  careers,
  events,
  lifeEvents,
  father,
  mother,
  spouses,
  children,
  siblings,
  onStartEditLife,
  onFamilyPersonClick,
  onEventClick,
  onAddLifeEvent,
  highlightedLifeEventId,
}: PersonLifeTimelineInfographicProps) {
  /** 하이라이트 요청 시 해당 카드로 스크롤 — MutationObserver 없이 ref 기반 */
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  useEffect(() => {
    if (!highlightedLifeEventId) return
    // 다음 프레임에 DOM이 새 데이터로 렌더된 뒤 스크롤
    const timer = window.setTimeout(() => {
      const el = rowRefs.current.get(highlightedLifeEventId)
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 60)
    return () => window.clearTimeout(timer)
  }, [highlightedLifeEventId])
  const birth = useMemo(() => parseDate(birthDate), [birthDate])
  const death = useMemo(() => parseDate(deathDate), [deathDate])

  const nodes = useMemo<TimelineNode[]>(() => {
    const result: TimelineNode[] = []
    const POS_INF = Number.POSITIVE_INFINITY
    const toTs = (d: Date | null) => (d ? d.getTime() : POS_INF)
    const diffDays = (a: Date | null, b: Date | null) =>
      a && b
        ? Math.max(1, Math.round((b.getTime() - a.getTime()) / 86_400_000))
        : null

    if (birth) {
      result.push({
        key: 'birth',
        kind: 'birth',
        start: birth,
        end: null,
        sortKey: toTs(birth) - 1,
        title: '출생',
        dateLabel: formatWithPrecision(birth, 'day'),
      })
    }

    for (const r of reigns ?? []) {
      const s = parseDate(r.startDate)
      const e = parseDate(r.endDate)
      const country = r.historicalCountry?.name ?? r.country?.name ?? null
      const pos = r.positionDefinition?.title ?? '재위'
      result.push({
        key: `reign-${r.id}`,
        kind: 'reign',
        start: s,
        end: e,
        sortKey: toTs(s),
        title: [country, pos].filter(Boolean).join(' · ') || '재위',
        subtitle: r.regnalNumber != null ? `${r.regnalNumber}대` : null,
        dateLabel: formatRange(s, e),
        description: r.notes ?? null,
        durationDays: diffDays(s, e),
      })
    }

    for (const t of tenures ?? []) {
      const s = parseDate(t.startDate)
      const e = parseDate(t.endDate)
      const country = t.historicalCountry?.name ?? t.country?.name ?? null
      const pos = t.positionDefinition?.title ?? t.title ?? '재임'
      result.push({
        key: `tenure-${t.id}`,
        kind: 'tenure',
        start: s,
        end: e,
        sortKey: toTs(s),
        title: [country, pos].filter(Boolean).join(' · ') || '재임',
        subtitle: t.termNumber != null ? `제${t.termNumber}대` : null,
        dateLabel: formatRange(s, e),
        description: t.notes ?? null,
        durationDays: diffDays(s, e),
      })
    }

    for (const c of careers ?? []) {
      const s = parseDate(c.startDate)
      const e = parseDate(c.endDate)
      const org = c.organization?.name ?? null
      const pos = c.rank?.name ?? c.title ?? null
      const head = [org, pos].filter(Boolean).join(' · ')
      result.push({
        key: `career-${c.id}`,
        kind: 'career',
        start: s,
        end: e,
        sortKey: toTs(s),
        title: head || c.kindLabel || '경력',
        subtitle: c.kindLabel ?? null,
        dateLabel: formatRange(s, e),
        description: c.notes ?? null,
        durationDays: diffDays(s, e),
      })
    }

    for (const evt of events ?? []) {
      const s = parseDate(evt.event?.startDate)
      const e = parseDate(evt.event?.endDate)
      result.push({
        key: `event-${evt.id}`,
        kind: 'event',
        start: s,
        end: e,
        sortKey: toTs(s),
        title: evt.event?.title ?? '(제목 없음)',
        subtitle: evt.role ?? null,
        dateLabel: formatRange(
          s,
          e,
          evt.event?.startDatePrecision,
          evt.event?.endDatePrecision,
        ),
        // 인물 시점의 사건 서술 (장문) — 카드 본문에 표시
        description: evt.note ?? null,
        eventId: evt.event?.id ?? null,
      })
    }

    for (const le of lifeEvents) {
      const s = parseDate(le.startDate)
      const e = parseDate(le.endDate)
      result.push({
        key: `life-${le.id}`,
        kind: 'life',
        start: s,
        end: e,
        sortKey: toTs(s),
        title: le.title,
        // 카테고리는 KindBadge가 보여주므로 subtitle 생략 (중복 방지)
        dateLabel: formatRange(
          s,
          e,
          le.startDatePrecision,
          le.endDatePrecision,
        ),
        description: le.description,
        category: le.category,
        lifeEventSource: le,
        durationDays: diffDays(s, e),
      })
    }

    // ───── 가족 이벤트 ─────
    // dedup: 연보(life)에 같은 날짜 기록이 있으면 자동 생성 가족 노드는 숨김
    const lifeEventDayKeys = new Set<string>()
    for (const le of lifeEvents) {
      const k = isoDayKey(parseDate(le.startDate))
      if (k) lifeEventDayKeys.add(k)
    }
    const hasLifeOverlap = (d: Date) => {
      const k = isoDayKey(d)
      return k ? lifeEventDayKeys.has(k) : false
    }

    const pushFamilyBirth = (
      rel: FamilyRelation,
      m: FamilyMember,
      idx = 0,
    ) => {
      const d = parseDate(m.birthDate)
      if (!d) return
      if (hasLifeOverlap(d)) return
      result.push({
        key: `${rel}-birth-${m.id ?? idx}`,
        kind: 'family-birth',
        start: d,
        end: null,
        sortKey: toTs(d),
        title: `${m.name} 출생`,
        dateLabel: formatWithPrecision(d, 'day'),
        familyRelation: rel,
        familyPersonId: m.id,
      })
    }
    const pushFamilyDeath = (
      rel: FamilyRelation,
      m: FamilyMember,
      idx = 0,
    ) => {
      const d = parseDate(m.deathDate)
      if (!d) return
      if (hasLifeOverlap(d)) return
      // 향년 계산 — 출생연도 있으면 사망 시 만 나이 (BC era는 미상으로 처리)
      const birth = parseDate(m.birthDate)
      const ageAtDeath =
        birth && birth.getFullYear() <= d.getFullYear()
          ? (() => {
              let age = d.getFullYear() - birth.getFullYear()
              const md = d.getMonth() - birth.getMonth()
              if (md < 0 || (md === 0 && d.getDate() < birth.getDate())) age--
              return age >= 0 ? age : null
            })()
          : null
      result.push({
        key: `${rel}-death-${m.id ?? idx}`,
        kind: 'family-death',
        start: d,
        end: null,
        sortKey: toTs(d),
        title: `${m.name} 사망`,
        subtitle: ageAtDeath != null ? `향년 ${ageAtDeath}세` : null,
        dateLabel: formatWithPrecision(d, 'day'),
        familyRelation: rel,
        familyPersonId: m.id,
      })
    }

    if (father) {
      pushFamilyBirth('father', father)
      pushFamilyDeath('father', father)
    }
    if (mother) {
      pushFamilyBirth('mother', mother)
      pushFamilyDeath('mother', mother)
    }
    for (let i = 0; i < (children ?? []).length; i++) {
      const c = (children ?? [])[i]
      pushFamilyBirth('child', c, i)
      pushFamilyDeath('child', c, i)
    }
    for (let i = 0; i < (siblings ?? []).length; i++) {
      pushFamilyDeath('sibling', (siblings ?? [])[i], i)
    }
    for (let i = 0; i < (spouses ?? []).length; i++) {
      const sp = (spouses ?? [])[i]
      pushFamilyBirth('spouse', sp, i)
      pushFamilyDeath('spouse', sp, i)

      const mStart = parseDate(sp.marriageStartDate)
      if (mStart && !hasLifeOverlap(mStart)) {
        result.push({
          key: `marriage-start-${sp.id ?? i}`,
          kind: 'marriage',
          start: mStart,
          end: null,
          sortKey: toTs(mStart),
          title: `${sp.name}과 혼인`,
          dateLabel: formatWithPrecision(mStart, 'day'),
          familyRelation: 'spouse',
          familyPersonId: sp.id,
        })
      }
    }

    if (death) {
      const deathTypeLabel = deathType
        ? DEATH_TYPE_LABELS[deathType] ?? deathType
        : null
      const deathDescription =
        [deathCause, deathNote].filter((s) => !!s && s.trim() !== '').join(' · ') ||
        null
      result.push({
        key: 'death',
        kind: 'death',
        start: death,
        end: null,
        sortKey: toTs(death) + 1,
        title: '사망',
        subtitle: deathTypeLabel,
        dateLabel: formatWithPrecision(death, 'day'),
        description: deathDescription,
      })
    } else if (isAlive === true && birth) {
      result.push({
        key: 'alive',
        kind: 'death',
        start: null,
        end: null,
        sortKey: POS_INF,
        title: '생존 중',
        dateLabel: '현재',
      })
    }

    // 본인 출생 이전 / 사망 이후 이벤트는 타임라인에서 제외 (ego의 birth·death 노드는 유지)
    let filtered = result
    if (birth) {
      const birthTs = birth.getTime()
      filtered = filtered.filter(
        (n) => n.kind === 'birth' || n.sortKey >= birthTs,
      )
    }
    if (death) {
      const deathTs = death.getTime()
      filtered = filtered.filter(
        (n) => n.kind === 'death' || n.sortKey <= deathTs,
      )
    }

    // 같은 날짜(연도만 있는 데이터 포함)에서 종류별 우선순위 tie-break
    const kindOrder: Record<TimelineKind, number> = {
      birth: 0,
      'family-birth': 1,
      marriage: 2,
      reign: 3,
      tenure: 4,
      career: 5,
      life: 6,
      event: 7,
      'family-death': 8,
      death: 9,
    }
    filtered.sort((a, b) => {
      if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey
      return kindOrder[a.kind] - kindOrder[b.kind]
    })
    return filtered
  }, [
    birth,
    death,
    deathType,
    deathCause,
    deathNote,
    isAlive,
    reigns,
    tenures,
    careers,
    events,
    lifeEvents,
    father,
    mother,
    spouses,
    children,
    siblings,
  ])

  // ── 필터 상태 ──
  const [filters, setFilters] = useState<Record<FilterKey, boolean>>({
    life: true,
    reign: true,
    tenure: true,
    career: true,
    event: true,
    family: true,
  })

  // ── 검색 ── 제목·본문(태그 제외) 매칭. 입력 디바운스는 사용자 체감상 즉시.
  const [searchQuery, setSearchQuery] = useState('')
  const normalizedQuery = searchQuery.trim().toLowerCase()

  const matchesQuery = useCallback(
    (n: TimelineNode) => {
      if (!normalizedQuery) return true
      const haystacks: string[] = [n.title]
      if (n.subtitle) haystacks.push(n.subtitle)
      if (n.dateLabel) haystacks.push(n.dateLabel)
      if (n.description) {
        // HTML 태그 제거 후 매칭
        haystacks.push(n.description.replace(/<[^>]+>/g, ' '))
      }
      const blob = haystacks.join(' ').toLowerCase()
      return blob.includes(normalizedQuery)
    },
    [normalizedQuery],
  )

  // 각 필터 그룹에 속한 노드가 있는지 파악해서 비활성 필터 표시만 조정
  const availableFilters = useMemo(() => {
    const set = new Set<FilterKey>()
    for (const n of nodes) {
      const f = kindToFilter(n.kind)
      if (f !== 'ego') set.add(f)
    }
    return set
  }, [nodes])

  /** 모든 필터가 꺼져 있는지 (사용 가능한 필터 기준) */
  const allFiltersOff = useMemo(() => {
    if (availableFilters.size === 0) return false
    for (const f of availableFilters) {
      if (filters[f]) return false
    }
    return true
  }, [filters, availableFilters])

  const visibleNodes = useMemo(
    () =>
      nodes.filter((n) => {
        const f = kindToFilter(n.kind)
        if (f === 'ego') return true
        return filters[f]
      }),
    [nodes, filters],
  )

  const hasAnyEntry =
    nodes.length > 0 && nodes.some((n) => n.kind !== 'birth' && n.kind !== 'death')

  const renderedNodes = visibleNodes

  /** 재위·재임 활성 기간 리스트 — 연보/사건 노드 spine에 컨텍스트 색 부여 */
  const reignRanges = useMemo<ActiveRange[]>(
    () =>
      (reigns ?? [])
        .map((r) => {
          const s = parseDate(r.startDate)
          if (!s) return null
          return {
            start: s,
            end: parseDate(r.endDate),
            color: kindColorMap.reign.base,
          }
        })
        .filter((v): v is ActiveRange => v !== null),
    [reigns],
  )
  const tenureRanges = useMemo<ActiveRange[]>(
    () =>
      (tenures ?? [])
        .map((t) => {
          const s = parseDate(t.startDate)
          if (!s) return null
          return {
            start: s,
            end: parseDate(t.endDate),
            color: kindColorMap.tenure.base,
          }
        })
        .filter((v): v is ActiveRange => v !== null),
    [tenures],
  )

  return (
    <TimelineRoot>
      {availableFilters.size > 0 && (
        <ToolbarRow>
          <FilterBar>
            {FILTER_OPTIONS.map((opt) => {
              const enabled = filters[opt.key]
              const dimmed = !availableFilters.has(opt.key)
              return (
                <FilterChip
                  key={opt.key}
                  type="button"
                  $active={enabled}
                  $dimmed={dimmed}
                  $color={opt.color}
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      [opt.key]: !prev[opt.key],
                    }))
                  }
                  aria-pressed={enabled}
                  disabled={dimmed}
                >
                  <ChipDot $color={opt.color} $active={enabled} />
                  <span>{opt.label}</span>
                </FilterChip>
              )
            })}
          </FilterBar>
          <SearchInput
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="제목·본문 검색"
            aria-label="타임라인 검색"
          />
          {lifeEvents.length > 0 && (
            <ExportMenu>
              <ExportToggle
                type="button"
                aria-label="연보 내보내기"
                title="연보 내보내기 (JSON·Markdown)"
              >
                <FiDownload size={13} strokeWidth={2.4} />
                <span>내보내기</span>
              </ExportToggle>
              <ExportDropdown>
                <ExportItem
                  type="button"
                  onClick={() => exportLifeEvents(lifeEvents, 'json')}
                >
                  JSON
                </ExportItem>
                <ExportItem
                  type="button"
                  onClick={() => exportLifeEvents(lifeEvents, 'markdown')}
                >
                  Markdown
                </ExportItem>
              </ExportDropdown>
            </ExportMenu>
          )}
        </ToolbarRow>
      )}

      {/* 모든 필터 꺼진 안내 */}
      {allFiltersOff && (
        <FilterAllOffNote>
          모든 필터가 꺼져 있어 표시할 항목이 없습니다 — 위 필터에서 보고 싶은
          종류를 켜주세요.
        </FilterAllOffNote>
      )}

      {nodes.length === 0 ? (
        <EmptyState>
          <EmptyTitle>아직 기록된 연보가 없습니다</EmptyTitle>
          <EmptyDesc>
            출생·재위·사건·가족 정보가 채워지면 자동으로 타임라인에 나타납니다.
            <br />
            직접 "1820년 파리 유학"처럼 인생의 장면을 기록해보세요.
          </EmptyDesc>
          {onAddLifeEvent && (
            <EmptyCtaBtn type="button" onClick={onAddLifeEvent}>
              + 첫 연보 작성하기
            </EmptyCtaBtn>
          )}
        </EmptyState>
      ) : (
        <TimelineList>
          {renderedNodes.map((node, idx) => {
            const year = yearOf(node.start)
            const age =
              node.kind === 'birth'
                ? 0
                : node.start && birth
                  ? ageAt(node.start, birth)
                  : null
            const isFirst = idx === 0
            const isLast = idx === renderedNodes.length - 1

            // 직전 노드와 같은 연도면 YearLabel 숨김 (묶음 시각화)
            const prevNode = idx > 0 ? renderedNodes[idx - 1] : null
            const prevYear = prevNode ? yearOf(prevNode.start) : null
            const sameYearAsPrev = year != null && prevYear === year

            // 활성 재위/재임 컨텍스트 색 — 연보·사건 노드의 spine을 옅게 칠함
            const contextColor =
              node.kind === 'life' || node.kind === 'event'
                ? pickActiveContextColor(node.start, reignRanges, tenureRanges)
                : null

            const highlighted =
              node.kind === 'life' &&
              node.lifeEventSource?.id != null &&
              highlightedLifeEventId === node.lifeEventSource.id

            // 검색어 매칭 — 비매칭 행은 dim
            const matchesSearch = matchesQuery(node)
            return (
              <TimelineRow
                key={node.key}
                ref={(el) => {
                  const id = node.lifeEventSource?.id
                  if (!id) return
                  if (el) rowRefs.current.set(id, el)
                  else rowRefs.current.delete(id)
                }}
                $highlight={highlighted}
                $dimmed={!matchesSearch}
              >
                <YearCell>
                  {year != null && !sameYearAsPrev ? (
                    <>
                      <YearLabel>
                        {(node.kind === 'death'
                          ? (deathEra ?? birthEra)
                          : birthEra) === 'BC'
                          ? `기원전 ${year}`
                          : year}
                      </YearLabel>
                      {age != null && age >= 0 && node.kind !== 'birth' && (
                        <AgeLabel>{age}세</AgeLabel>
                      )}
                      {node.kind === 'birth' && <AgeLabel>출생</AgeLabel>}
                    </>
                  ) : year == null ? (
                    <YearLabel $muted>—</YearLabel>
                  ) : null}
                </YearCell>

                <SpineCell
                  $isFirst={isFirst}
                  $isLast={isLast}
                  $hasDuration={
                    (node.kind === 'reign' ||
                      node.kind === 'tenure' ||
                      node.kind === 'career' ||
                      (node.kind === 'life' && !!node.durationDays)) &&
                    (node.durationDays ?? 0) > 365
                  }
                  $kind={node.kind}
                  $color={
                    node.category
                      ? PERSON_LIFE_EVENT_CATEGORY_COLOR[node.category].base
                      : null
                  }
                  $contextColor={contextColor}
                >
                  <NodeDot
                    $kind={node.kind}
                    $color={
                      node.category
                        ? PERSON_LIFE_EVENT_CATEGORY_COLOR[node.category].base
                        : null
                    }
                  >
                    <NodeIconInner kind={node.kind} category={node.category} />
                  </NodeDot>
                </SpineCell>

                <ContentCell>
                  {(() => {
                    const isFamilyNode =
                      node.kind === 'family-birth' ||
                      node.kind === 'family-death' ||
                      node.kind === 'marriage'
                    const canEditLife =
                      node.kind === 'life' &&
                      !!node.lifeEventSource &&
                      !!onStartEditLife
                    const canNavFamily =
                      isFamilyNode &&
                      !!node.familyPersonId &&
                      !!onFamilyPersonClick
                    const canNavEvent =
                      node.kind === 'event' &&
                      !!node.eventId &&
                      !!onEventClick
                    const clickable = canEditLife || canNavFamily || canNavEvent
                    const handleClick = canEditLife
                      ? () => onStartEditLife!(node.lifeEventSource!)
                      : canNavFamily
                        ? () => onFamilyPersonClick!(node.familyPersonId!)
                        : canNavEvent
                          ? () => onEventClick!(node.eventId!)
                          : undefined
                    const cardAriaLabel = node.dateLabel
                      ? `${node.title} — ${node.dateLabel}`
                      : node.title
                    const isEmptyDescriptionLife =
                      node.kind === 'life' && !node.description?.trim()
                    return (
                      <EventCard
                        $kind={node.kind}
                        $color={
                          node.category
                            ? PERSON_LIFE_EVENT_CATEGORY_COLOR[node.category]
                                .base
                            : null
                        }
                        $soft={
                          node.category
                            ? PERSON_LIFE_EVENT_CATEGORY_COLOR[node.category]
                                .soft
                            : null
                        }
                        as={clickable ? 'button' : 'div'}
                        type={clickable ? 'button' : undefined}
                        onClick={handleClick}
                        $clickable={clickable}
                        aria-label={cardAriaLabel}
                        title={node.title}
                      >
                      <CardTopRow>
                        {/* 연보 카드만: URL 앵커 복사 */}
                        {node.kind === 'life' && node.lifeEventSource?.id && (
                          <CardLinkCopyBtn
                            type="button"
                            aria-label="이 연보 링크 복사"
                            title="이 연보 링크 복사"
                            onClick={(e) => {
                              e.stopPropagation()
                              const id = node.lifeEventSource!.id
                              const url = new URL(window.location.href)
                              url.searchParams.set('life', id)
                              const link = url.toString()
                              navigator.clipboard
                                ?.writeText(link)
                                .catch(() => {
                                  /* 클립보드 권한 실패 시 fallback 없음 — 단지 무시 */
                                })
                            }}
                          >
                            <FiLink size={11} strokeWidth={2.4} />
                          </CardLinkCopyBtn>
                        )}
                        <KindBadge $kind={node.kind} $color={
                          node.category
                            ? PERSON_LIFE_EVENT_CATEGORY_COLOR[node.category].text
                            : null
                        } $soft={
                          node.category
                            ? PERSON_LIFE_EVENT_CATEGORY_COLOR[node.category].soft
                            : null
                        }>
                          {node.kind === 'reign'
                            ? '재위'
                            : node.kind === 'tenure'
                              ? '재임'
                              : node.kind === 'career'
                                ? '경력'
                                : node.kind === 'event'
                                ? '사건'
                                : node.kind === 'life'
                                  ? node.category
                                    ? PERSON_LIFE_EVENT_CATEGORY_LABEL[
                                        node.category
                                      ]
                                    : '연보'
                                  : node.kind === 'birth'
                                    ? '출생'
                                    : node.kind === 'family-birth' ||
                                        node.kind === 'family-death' ||
                                        node.kind === 'marriage'
                                      ? node.familyRelation
                                        ? FAMILY_RELATION_LABEL[
                                            node.familyRelation
                                          ]
                                        : '가족'
                                      : '사망·생존'}
                        </KindBadge>
                        {node.subtitle && (
                          <CardSubtitle>{node.subtitle}</CardSubtitle>
                        )}
                      </CardTopRow>
                      <CardTitle title={node.title}>{node.title}</CardTitle>
                      {node.dateLabel && (
                        <CardDate>{node.dateLabel}</CardDate>
                      )}
                      {node.description && (
                        <CardDescBlock
                          description={node.description}
                          isLife={node.kind === 'life'}
                        />
                      )}
                      {isEmptyDescriptionLife && canEditLife && (
                        <EmptyDescHint>
                          + 설명 추가
                        </EmptyDescHint>
                      )}
                      </EventCard>
                    )
                  })()}
                </ContentCell>
              </TimelineRow>
            )
          })}
        </TimelineList>
      )}

      {!hasAnyEntry && nodes.length > 0 && (
        <SubtleNote>
          출생·사망 외 기록이 없습니다. 상단 "연보 추가" 버튼으로 인생의 중요
          장면을 기록해보세요.
        </SubtleNote>
      )}
    </TimelineRoot>
  )
}

function NodeIconInner({
  kind,
  category,
}: {
  kind: TimelineKind
  category?: PersonLifeEventCategory | null
}) {
  if (kind === 'life' && category) {
    const Icon = CATEGORY_ICON[category]
    return <Icon size={12} strokeWidth={2.5} />
  }
  if (kind === 'reign') return <FiStar size={12} strokeWidth={2.5} />
  if (kind === 'tenure') return <FiFlag size={12} strokeWidth={2.5} />
  if (kind === 'career') return <FiBriefcase size={12} strokeWidth={2.5} />
  if (kind === 'event') return <FiCalendar size={12} strokeWidth={2.5} />
  if (kind === 'family-birth') return <FiUserPlus size={12} strokeWidth={2.5} />
  if (kind === 'family-death') return <FiUserMinus size={12} strokeWidth={2.5} />
  if (kind === 'marriage') return <FiHeart size={12} strokeWidth={2.5} />
  return <FiCircle size={7} strokeWidth={3} fill="currentColor" />
}

// ───── 스타일 ─────
const TimelineRoot = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const ToolbarRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 4px 8px;
  flex-wrap: wrap;
`

const FilterBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1 1 auto;
`

const SearchInput = styled.input`
  flex: 0 1 240px;
  min-width: 160px;
  padding: 8px 12px;
  font-size: 12.5px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#fff'};
  color: ${({ theme }) => theme.colors.text.primary};
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;

  &:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const FilterAllOffNote = styled.div`
  padding: 12px 16px;
  margin: 4px 0 8px;
  border-radius: 12px;
  font-size: 12.5px;
  font-weight: 500;
  line-height: 1.55;
  color: #92400e;
  background: #fffbeb;
  border: 1px solid #fde68a;
  letter-spacing: -0.005em;
`

/** 내보내기 — JSON/Markdown 드롭다운 */
const ExportMenu = styled.div`
  position: relative;
  & > div {
    display: none;
  }
  &:hover > div,
  &:focus-within > div {
    display: flex;
  }

  @media print {
    display: none;
  }
`

const ExportToggle = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99,102,241,0.08)'
        : 'rgba(99,102,241,0.06)'};
    color: #4f46e5;
    border-color: rgba(99, 102, 241, 0.4);
  }
`

const ExportDropdown = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  min-width: 140px;
  flex-direction: column;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(25,25,25,0.95)' : '#fff'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
  border-radius: 10px;
  padding: 4px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.1);
  z-index: 5;
`

const ExportItem = styled.button`
  text-align: left;
  padding: 8px 12px;
  font-size: 12.5px;
  font-weight: 500;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: rgba(99, 102, 241, 0.08);
    color: #4f46e5;
  }
`

const FilterChip = styled.button<{
  $active: boolean
  $dimmed: boolean
  $color: string
}>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: -0.005em;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s, opacity 0.15s;

  ${({ $active, theme, $color }) =>
    $active
      ? css`
          background: ${theme.mode === 'dark'
            ? 'rgba(255,255,255,0.06)'
            : '#ffffff'};
          color: ${theme.mode === 'dark'
            ? theme.colors.text.primary
            : '#0f172a'};
          border: 1px solid ${$color}33;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
        `
      : css`
          background: transparent;
          color: ${theme.colors.text.tertiary};
          border: 1px solid
            ${theme.mode === 'dark'
              ? 'rgba(255,255,255,0.06)'
              : 'rgba(15,23,42,0.06)'};
          text-decoration: line-through;
        `}

  ${({ $dimmed }) =>
    $dimmed &&
    css`
      opacity: 0.35;
      cursor: not-allowed;
      text-decoration: none;
    `}

  &:hover:not(:disabled) {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.04)'
        : 'rgba(15,23,42,0.03)'};
  }
`

const ChipDot = styled.span<{ $color: string; $active: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $active, $color }) => ($active ? $color : 'transparent')};
  border: ${({ $active, $color }) =>
    $active ? 'none' : `1.5px solid ${$color}80`};
`

const TimelineList = styled.div`
  display: flex;
  flex-direction: column;
  position: relative;
  padding: 4px 0;
`

const lifeHighlightAnim = keyframes`
  0%   { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.45); transform: translateY(0); }
  50%  { box-shadow: 0 0 0 8px rgba(99, 102, 241, 0); }
  100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); transform: translateY(0); }
`

const TimelineRow = styled.div<{
  $highlight?: boolean
  /** 검색어 비매칭 — 흐리게 표시 (필터링이 아닌 dim) */
  $dimmed?: boolean
}>`
  display: grid;
  grid-template-columns: 76px 28px 1fr;
  align-items: stretch; /* SpineCell의 ::after(top:42px;bottom:0)가 셀 높이에 의존 */
  min-height: 76px;
  border-radius: 12px;
  transition: background 0.4s ease, opacity 0.2s ease;

  ${({ $highlight }) =>
    $highlight &&
    css`
      background: rgba(99, 102, 241, 0.08);
      animation: ${lifeHighlightAnim} 1.6s ease-out;
    `}

  ${({ $dimmed }) =>
    $dimmed &&
    css`
      opacity: 0.28;
      filter: grayscale(0.6);
    `}

  @media (max-width: 560px) {
    grid-template-columns: 52px 18px 1fr;
    min-height: 68px;
  }

  /* 모션 줄임 환경에선 하이라이트 애니메이션·트랜지션 제거 */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    animation: none !important;
  }

  /* 인쇄 친화 — 컬러 살리기, hover/animation 무력화, 카드 크기 컴팩트 */
  @media print {
    page-break-inside: avoid;
    break-inside: avoid;
    grid-template-columns: 64px 16px 1fr;
    min-height: auto;
    animation: none !important;
    transition: none !important;
    opacity: 1 !important;
    filter: none !important;
  }
`

const YearCell = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: flex-start;
  gap: 6px;
  padding: 18px 12px 0 0;
  font-variant-numeric: tabular-nums;
  text-align: right;
  /* 긴 타임라인에서 현재 영역의 시작 연도가 화면 상단에 sticky로 남도록 */
  position: sticky;
  top: 0;
  align-self: flex-start;
  z-index: 1;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.85)'};
  backdrop-filter: blur(6px);

  @media (max-width: 560px) {
    padding: 16px 8px 0 0;
  }

  @media print {
    position: static;
    background: transparent;
    backdrop-filter: none;
  }
`

const YearLabel = styled.div<{ $muted?: boolean }>`
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1;
  color: ${({ theme, $muted }) =>
    $muted
      ? theme.colors.text.tertiary
      : theme.mode === 'dark'
        ? theme.colors.text.primary
        : '#0f172a'};
  white-space: nowrap;

  @media (max-width: 560px) {
    font-size: 13px;
  }
`

const AgeLabel = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0;
  line-height: 1.3;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'};
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const kindColorMap: Record<TimelineKind, { base: string; accent: string }> = {
  birth: { base: '#14b8a6', accent: 'rgba(20,184,166,0.25)' },
  death: { base: '#64748b', accent: 'rgba(100,116,139,0.25)' },
  reign: { base: '#0f766e', accent: 'rgba(20,184,166,0.25)' },
  tenure: { base: '#4338ca', accent: 'rgba(99,102,241,0.25)' },
  career: { base: '#b45309', accent: 'rgba(180,83,9,0.22)' },
  event: { base: '#0369a1', accent: 'rgba(14,165,233,0.25)' },
  life: { base: '#6366f1', accent: 'rgba(99,102,241,0.25)' },
  'family-birth': { base: '#0d9488', accent: 'rgba(13,148,136,0.22)' },
  'family-death': { base: '#94a3b8', accent: 'rgba(148,163,184,0.28)' },
  marriage: { base: '#e11d48', accent: 'rgba(225,29,72,0.22)' },
}

const SpineCell = styled.div<{
  $isFirst: boolean
  $isLast: boolean
  $hasDuration: boolean
  $kind: TimelineKind
  $color: string | null
  /** 활성 재위·재임 컨텍스트 — spine을 그 색의 옅은 톤으로 칠해 시기 단서 제공 */
  $contextColor?: string | null
}>`
  position: relative;
  &::before,
  &::after {
    content: '';
    position: absolute;
    left: 50%;
    width: 1.5px;
    transform: translateX(-50%);
    background: ${({ $contextColor, theme }) =>
      $contextColor
        ? `${$contextColor}33` /* 0x33 = 20% alpha */
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.08)'
          : 'rgba(15,23,42,0.08)'};
    border-radius: 999px;
  }
  &::before {
    top: 0;
    height: 20px;
    visibility: ${({ $isFirst }) => ($isFirst ? 'hidden' : 'visible')};
  }
  &::after {
    top: 42px;
    bottom: 0;
    visibility: ${({ $isLast }) => ($isLast ? 'hidden' : 'visible')};
    ${({ $hasDuration, $kind, $color }) =>
      $hasDuration
        ? css`
            background: linear-gradient(
              180deg,
              ${$color ?? kindColorMap[$kind].base} 0%,
              ${$color ?? kindColorMap[$kind].base}40 100%
            );
            width: 2.5px;
          `
        : ''}
  }
`

const NodeDot = styled.div<{
  $kind: TimelineKind
  $color: string | null
}>`
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  color: #fff;
  background: ${({ $kind, $color }) => $color ?? kindColorMap[$kind].base};
  border: 3px solid
    ${({ theme }) => (theme.mode === 'dark' ? '#0f172a' : '#fff')};
  box-shadow: 0 2px 6px
      ${({ $kind, $color }) =>
        $color ? `${$color}40` : `${kindColorMap[$kind].base}30`},
    0 1px 2px rgba(15, 23, 42, 0.06);

  ${({ $kind, theme }) =>
    $kind === 'death' &&
    css`
      background: ${theme.mode === 'dark' ? '#0f172a' : '#fff'};
      color: ${kindColorMap.death.base};
      border: 2px solid ${kindColorMap.death.base};
    `}
`

const ContentCell = styled.div`
  padding: 10px 0 22px 18px;
  min-width: 0;
`

const EventCard = styled.div<{
  $kind: TimelineKind
  $color: string | null
  /** 카테고리 soft 톤 — 카드 배경에 살짝 입혀 종류별 구분감 강화 */
  $soft?: string | null
  $clickable: boolean
}>`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 20px;
  border-radius: 14px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(15,23,42,0.06)'};
  background: ${({ theme, $soft }) =>
    $soft
      ? // soft는 이미 alpha 0.14의 rgba 토큰 — 그대로 한 겹 깔면 살짝 입혀짐
        theme.mode === 'dark'
        ? `linear-gradient(${$soft}, ${$soft}), rgba(255,255,255,0.03)`
        : `linear-gradient(${$soft}, ${$soft}), #ffffff`
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.03)'
        : '#ffffff'};
  text-align: left;
  width: 100%;
  overflow: hidden;
  transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1),
    box-shadow 0.2s, border-color 0.2s;

  @media (max-width: 560px) {
    padding: 14px 14px;
    gap: 4px;
  }

  /* 좌측 얇은 색 스트립 (kind 구분 시각 단서) */
  ${({ $kind, $color }) =>
    $kind !== 'birth' &&
    $kind !== 'death' &&
    css`
      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 16px;
        bottom: 16px;
        width: 3px;
        border-radius: 0 3px 3px 0;
        background: ${$color ?? kindColorMap[$kind].base};
        opacity: 0.85;
      }
    `}

  ${({ $clickable }) =>
    $clickable &&
    css`
      cursor: pointer;
      &:hover {
        transform: translateY(-2px);
        box-shadow:
          0 10px 24px rgba(15, 23, 42, 0.06),
          0 2px 6px rgba(15, 23, 42, 0.04);
        border-color: rgba(99, 102, 241, 0.25);
      }
      &:active {
        transform: translateY(-1px);
      }
    `}

  ${({ $kind, theme }) =>
    ($kind === 'birth' || $kind === 'death') &&
    css`
      background: ${theme.mode === 'dark'
        ? 'rgba(255,255,255,0.02)'
        : 'rgba(148,163,184,0.06)'};
      border-color: ${theme.mode === 'dark'
        ? 'rgba(255,255,255,0.05)'
        : 'rgba(148,163,184,0.2)'};
    `}
`

const CardTopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`

/** 카드 우상단 — 이 연보 링크 복사 (작은 아이콘 버튼) */
const CardLinkCopyBtn = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0.45;
  transition: opacity 0.15s, background 0.15s, color 0.15s;

  &:hover,
  &:focus-visible {
    opacity: 1;
    background: rgba(99, 102, 241, 0.1);
    color: #4f46e5;
  }

  @media print {
    display: none;
  }
`

const KindBadge = styled.span<{
  $kind: TimelineKind
  $color: string | null
  $soft: string | null
}>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: -0.005em;
  padding: 4px 10px 4px 8px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.05)'
      : 'rgba(15,23,42,0.04)'};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.secondary : '#475569'};

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${({ $kind, $color }) =>
      $color ?? kindColorMap[$kind].base};
    flex-shrink: 0;
  }
`

const CardSubtitle = styled.span`
  font-size: 11.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CardTitle = styled.div`
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.4;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.primary : '#0f172a'};
  word-break: break-word;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-top: 2px;
`

const CardDate = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
  letter-spacing: 0;
`

/**
 * 긴 설명이 오면 타임라인 한 행이 5000px+까지 늘어나서 형제 카드가 보이지 않는 문제 방지.
 * - 기준: 6줄 또는 400자 초과(HTML 태그 제외한 가시 텍스트 기준)면 기본 접힘
 * - 토글 버튼으로 전체 펼치기 (재접기 가능)
 */
const DESC_COLLAPSE_CHAR_THRESHOLD = 400

/** HTML에서 태그를 제거한 가시 텍스트 길이 — 접힘 판정용 */
function visibleLengthOf(html: string): number {
  if (!html) return 0
  if (typeof document === 'undefined') return html.length
  const tpl = document.createElement('div')
  tpl.innerHTML = html
  return (tpl.textContent ?? '').trim().length
}

function CardDescBlock({
  description,
  isLife,
}: {
  description: string
  /** 연보 카드(`kind === 'life'`)만 가로폭 제한을 적용 */
  isLife: boolean
}) {
  const isHtml = isLikelyRichTextHtml(description)
  const visibleLength = isHtml ? visibleLengthOf(description) : description.length
  const figureCount = isHtml ? countFiguresInHtml(description) : 0
  // figure가 2개 이상이거나 텍스트가 길면 접힘 토글 표시.
  // figure가 1개여도 텍스트가 길면 접힘.
  const needsCollapse =
    visibleLength > DESC_COLLAPSE_CHAR_THRESHOLD || figureCount >= 2
  const [expanded, setExpanded] = useState(false)
  const collapsed = needsCollapse && !expanded
  return (
    <>
      {isHtml ? (
        <CardDescRich
          $collapsed={collapsed}
          $life={isLife}
          $hideExtraFigures={collapsed && figureCount >= 2}
        >
          <RichTextReadView html={description} hideWhenEmpty={false} />
        </CardDescRich>
      ) : (
        <CardDesc $collapsed={collapsed} $life={isLife}>
          {description}
        </CardDesc>
      )}
      {needsCollapse && (
        <CardDescToggle
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setExpanded((v) => !v)
          }}
        >
          {expanded ? '접기' : '더 보기'}
        </CardDescToggle>
      )}
    </>
  )
}

const collapsedMixin = css`
  display: -webkit-box;
  -webkit-line-clamp: 6;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const CardDesc = styled.div<{ $collapsed: boolean; $life: boolean }>`
  font-size: 12.5px;
  font-weight: 500;
  line-height: 1.6;
  margin-top: 2px;
  /* 연보(life) 카드만 본문 가로폭 제한 — 길어진 본문이 카드 폭만큼 늘어지지 않도록 */
  ${({ $life }) =>
    $life &&
    css`
      max-width: 820px;
    `}
  color: ${({ theme }) =>
    theme.mode === 'dark'
      ? theme.colors.text.secondary
      : '#475569'};
  white-space: pre-wrap;
  word-break: break-word;
  ${({ $collapsed }) => $collapsed && collapsedMixin}
`

/**
 * RichTextReadView HTML용 — CardDesc와 타이포는 맞추되 white-space/pre-wrap은
 * 불필요(내부 p·div가 줄바꿈 담당). 접힘은 동일한 line-clamp.
 */
const CardDescRich = styled.div<{
  $collapsed: boolean
  $life: boolean
  /** collapsed + figure가 2개 이상일 때 첫 figure만 노출, 나머지는 숨김 */
  $hideExtraFigures: boolean
}>`
  font-size: 12.5px;
  line-height: 1.6;
  margin-top: 2px;
  /* 연보(life) 카드만 본문 가로폭 제한 */
  ${({ $life }) =>
    $life &&
    css`
      max-width: 820px;
    `}

  /* 접힘 + figure 다수 — 두 번째 이후 figure 숨김 */
  ${({ $hideExtraFigures }) =>
    $hideExtraFigures &&
    css`
      figure ~ figure {
        display: none;
      }
    `}
  color: ${({ theme }) =>
    theme.mode === 'dark'
      ? theme.colors.text.secondary
      : '#475569'};
  word-break: break-word;

  /* RichTextReadView Root의 white-space/font-size를 무력화 — 카드 타이포에 맞춤 */
  & > * {
    font: inherit;
    color: inherit;
    white-space: normal;
  }
  /* 내부 모든 블록도 명시적으로 normal — 옛 데이터에 \\n이 끼어 있어도 무시 */
  & * {
    white-space: inherit;
  }

  /* 단락 간 간격은 카드 폭에 맞춰 좁게(0.5em ≈ 6px) — 1em은 카드에 과함 */
  & p {
    margin: 0 0 0.5em;
  }
  & p:first-child {
    margin-top: 0;
  }
  & p:last-child {
    margin-bottom: 0;
  }
  /* 빈 블록(<p><br></p>·<p></p>·<div><br></div>·<div></div>)은 시각적 1줄만 차지하도록 마진 제거 */
  & p:empty,
  & p:has(> br:only-child),
  & div:empty,
  & div:has(> br:only-child) {
    margin: 0;
  }

  /* 연속된 빈 줄은 두 번째부터 숨김 — 사용자가 Enter를 여러 번 친 옛 데이터 보정.
     "단락 사이 1줄 공백"은 유지, 2줄 이상 공백만 압축. */
  & br + br,
  & div:has(> br:only-child) + div:has(> br:only-child),
  & p:has(> br:only-child) + p:has(> br:only-child),
  & p:empty + p:empty,
  & div:empty + div:empty {
    display: none;
  }

  ${({ $collapsed }) => $collapsed && collapsedMixin}
`

const CardDescToggle = styled.button`
  align-self: flex-start;
  margin-top: 6px;
  padding: 4px 10px;
  font-size: 11.5px;
  font-weight: 600;
  color: #4f46e5;
  background: rgba(99, 102, 241, 0.08);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  &:hover {
    background: rgba(99, 102, 241, 0.14);
    border-color: rgba(99, 102, 241, 0.35);
  }
`

/** description이 비어 있는 연보 카드에 노출되는 인라인 CTA — 카드 클릭 = 편집이라
    별도 핸들러 없이 시각적 단서만 제공 */
const EmptyDescHint = styled.span`
  align-self: flex-start;
  margin-top: 4px;
  font-size: 11.5px;
  font-weight: 500;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.45)' : '#94a3b8'};
  letter-spacing: -0.01em;
`

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 56px 28px;
  text-align: center;
  border-radius: 18px;
  border: 1px dashed
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.12)'
        : 'rgba(15,23,42,0.1)'};
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.02)'
      : 'rgba(15,23,42,0.015)'};
  letter-spacing: -0.01em;
`

const EmptyTitle = styled.div`
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.secondary : '#475569'};
`

const EmptyDesc = styled.div`
  font-size: 12.5px;
  font-weight: 500;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const EmptyCtaBtn = styled.button`
  margin-top: 6px;
  padding: 10px 20px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -0.01em;
  border-radius: 12px;
  border: none;
  background: #6366f1;
  color: #fff;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  &:hover {
    background: #4f46e5;
  }
  &:active {
    transform: translateY(1px);
  }
`

const SubtleNote = styled.div`
  padding: 12px 16px;
  margin-top: 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.025)'
      : 'rgba(15,23,42,0.025)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.04)'
        : 'rgba(15,23,42,0.04)'};
`
