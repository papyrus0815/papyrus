import { formatDateString, formatYMD } from './format'
import { Tokens } from '@/constants/theme'
import type { PersonDetail } from './dto'

export type TimelineKind =
  | 'ego-birth'
  | 'ego-death'
  | 'marriage'
  | 'reign'
  | 'tenure'
  | 'life-event'
  | 'event-participation'
  | 'family-birth'
  | 'family-death'

export type TimelineEntry = {
  key: string
  kind: TimelineKind
  /** 정렬 키 — year*10000 + month*100 + day. 음수는 BC. null이면 시점 미상 */
  sortKey: number | null
  /** 표시용 시작일 (이미 포맷팅됨) */
  dateLabel: string
  /** 기간이면 종료일 라벨 */
  endLabel?: string | null
  title: string
  subtitle?: string | null
  /** HTML 가능 */
  body?: string | null
  /** 클릭 시 이동할 라우트 (예: '/event/abc') */
  link?: { kind: 'person' | 'event' | 'country'; id: string } | null
  /** 도트 색상 */
  color: string
}

const KIND_COLOR = Tokens.timeline as Record<TimelineKind, string>

/**
 * BC 음수 연도 포함 정렬 가능한 단일 숫자 키.
 * year=-220, month=8, day=15 → -220*10000 + 8*100 + 15 = -2199185
 * year=1945 → 19450815. BC 220이 BC 120보다 작아 앞으로 정렬됨.
 */
function ymdKey(year?: number | null, month?: number | null, day?: number | null): number | null {
  if (year == null) return null
  const m = month ?? 1
  const d = day ?? 1
  return year * 10000 + (year < 0 ? -1 : 1) * (m * 100 + d)
}

function isoToKey(iso?: string | null): number | null {
  if (!iso) return null
  // 음수 연도 ISO(`-0220-08-15`)와 양수 모두 처리
  const m = iso.match(/^(-?\d{1,4})(?:-(\d{2}))?(?:-(\d{2}))?/)
  if (!m) return null
  const y = Number(m[1])
  const mo = m[2] ? Number(m[2]) : 1
  const d = m[3] ? Number(m[3]) : 1
  if (Number.isNaN(y)) return null
  return y * 10000 + (y < 0 ? -1 : 1) * (mo * 100 + d)
}

export type ExtraTimelineItem =
  | {
      kind: 'life-event'
      id: string
      title: string
      description?: string | null
      category?: string | null
      startDate?: string | null
      startDatePrecision?: string | null
      endDate?: string | null
      endDatePrecision?: string | null
    }
  | {
      kind: 'event-participation'
      id: string
      eventId: string
      role?: string | null
      note?: string | null
      event: {
        id: string
        title: string
        startDate?: string | null
        startDatePrecision?: string | null
        endDate?: string | null
        endDatePrecision?: string | null
        location?: string | null
        category?: { id: string; name: string } | null
      }
    }

export function buildPersonTimeline(
  detail: PersonDetail,
  extraTimeline: ExtraTimelineItem[],
): TimelineEntry[] {
  const items: TimelineEntry[] = []

  // 출생
  const birth = formatYMD(detail.birthEra, detail.birthYear, detail.birthMonth, detail.birthDay)
  if (birth) {
    items.push({
      key: 'birth',
      kind: 'ego-birth',
      sortKey: ymdKey(detail.birthYear, detail.birthMonth, detail.birthDay),
      dateLabel: birth,
      title: '출생',
      subtitle: detail.birthCity?.name ?? detail.birthAdminDivision?.name ?? detail.birthPlaceText ?? null,
      color: KIND_COLOR['ego-birth'],
    })
  }

  // 사망
  if (!detail.isAlive) {
    const death = detail.isDeathDateUnknown
      ? '사망 (시점 미상)'
      : formatYMD(detail.deathEra, detail.deathYear, detail.deathMonth, detail.deathDay)
    if (death) {
      items.push({
        key: 'death',
        kind: 'ego-death',
        sortKey: ymdKey(detail.deathYear, detail.deathMonth, detail.deathDay),
        dateLabel: death,
        title: '사망',
        subtitle: [
          detail.deathCity?.name ?? detail.deathAdminDivision?.name ?? detail.deathPlaceText,
          detail.deathType,
          detail.deathCause,
        ]
          .filter(Boolean)
          .join(' · ') || null,
        body: detail.deathNote,
        color: KIND_COLOR['ego-death'],
      })
    }
  }

  // 군주 재위
  for (const r of detail.sovereignReigns ?? []) {
    const sortKey = isoToKey(r.startDate)
    if (sortKey == null) continue
    const country = r.country?.name ?? r.historicalCountry?.name
    const startLabel = formatDateString(r.startDate) ?? '?'
    const endLabel = r.endDate ? formatDateString(r.endDate) : '재위 중'
    items.push({
      key: `reign-${r.id ?? sortKey}`,
      kind: 'reign',
      sortKey,
      dateLabel: startLabel,
      endLabel,
      title: r.regnalName ?? '재위',
      subtitle: [country, r.regnalNumber != null ? `${r.regnalNumber}대` : null].filter(Boolean).join(' · ') || null,
      body: r.notes,
      color: KIND_COLOR['reign'],
      link: r.historicalCountryId ? { kind: 'country', id: r.historicalCountryId } : null,
    })
  }

  // 정부 직책
  for (const g of detail.governmentPositions ?? []) {
    const sortKey = isoToKey(g.startDate)
    if (sortKey == null) continue
    const country = g.country?.name ?? g.historicalCountry?.name
    const position =
      g.positionDefinition?.name ??
      g.positionDefinition?.title ??
      g.positionName ??
      g.title ??
      g.position?.name
    const startLabel = formatDateString(g.startDate, g.startDatePrecision) ?? '?'
    const endLabel = g.endDate ? formatDateString(g.endDate, g.endDatePrecision) : '재임 중'
    items.push({
      key: `tenure-${g.id ?? sortKey}`,
      kind: 'tenure',
      sortKey,
      dateLabel: startLabel,
      endLabel,
      title: position ?? '정부 직책',
      subtitle: country ?? null,
      body: g.notes,
      color: KIND_COLOR['tenure'],
    })
  }

  // 결혼 (PersonSpouse.marriageStartDate)
  for (const sr of detail.spouseRelations ?? []) {
    if (!sr.marriageStartDate) continue
    const spouseName = sr.spouse?.surname
      ? `${sr.spouse.surname}${sr.spouse.name}`
      : sr.spouse?.name
    items.push({
      key: `marriage-${sr.id}`,
      kind: 'marriage',
      sortKey: isoToKey(sr.marriageStartDate),
      dateLabel: formatDateString(sr.marriageStartDate) ?? '?',
      endLabel: sr.marriageEndDate ? formatDateString(sr.marriageEndDate) : null,
      title: '혼인',
      subtitle: spouseName ?? null,
      body: sr.note,
      color: KIND_COLOR['marriage'],
      link: sr.spouseId ? { kind: 'person', id: sr.spouseId } : null,
    })
  }

  // 가족 이벤트 — 부모/자녀/형제자매 출생·사망 (있는 경우만)
  const familyMembers: Array<{ p: NonNullable<PersonDetail['father']>; relation: string }> = []
  if (detail.father) familyMembers.push({ p: detail.father, relation: '아버지' })
  if (detail.mother) familyMembers.push({ p: detail.mother, relation: '어머니' })
  for (const c of detail.children ?? []) familyMembers.push({ p: c, relation: '자녀' })
  for (const s of detail.siblings ?? []) familyMembers.push({ p: s, relation: '형제자매' })

  for (const fm of familyMembers) {
    const p = fm.p
    const name = p.surname ? `${p.surname}${p.name}` : p.name
    if (p.birthYear != null) {
      items.push({
        key: `fb-${p.id}`,
        kind: 'family-birth',
        sortKey: ymdKey(p.birthYear, p.birthMonth, p.birthDay),
        dateLabel: formatYMD(p.birthEra, p.birthYear, p.birthMonth, p.birthDay) ?? '?',
        title: `${fm.relation} 출생`,
        subtitle: name,
        color: KIND_COLOR['family-birth'],
        link: { kind: 'person', id: p.id },
      })
    }
    if (p.deathYear != null) {
      items.push({
        key: `fd-${p.id}`,
        kind: 'family-death',
        sortKey: ymdKey(p.deathYear, p.deathMonth, p.deathDay),
        dateLabel: formatYMD(p.deathEra, p.deathYear, p.deathMonth, p.deathDay) ?? '?',
        title: `${fm.relation} 사망`,
        subtitle: name,
        color: KIND_COLOR['family-death'],
        link: { kind: 'person', id: p.id },
      })
    }
  }

  // 자유 연보 + 사건 참여
  for (const it of extraTimeline) {
    if (it.kind === 'life-event') {
      items.push({
        key: `le-${it.id}`,
        kind: 'life-event',
        sortKey: isoToKey(it.startDate),
        dateLabel: formatDateString(it.startDate, it.startDatePrecision) ?? '시점 미상',
        endLabel: it.endDate ? formatDateString(it.endDate, it.endDatePrecision) : null,
        title: it.title,
        subtitle: it.category ? `#${it.category}` : null,
        body: it.description,
        color: KIND_COLOR['life-event'],
      })
    } else {
      items.push({
        key: `ep-${it.id}`,
        kind: 'event-participation',
        sortKey: isoToKey(it.event.startDate),
        dateLabel: formatDateString(it.event.startDate, it.event.startDatePrecision) ?? '시점 미상',
        endLabel: it.event.endDate ? formatDateString(it.event.endDate, it.event.endDatePrecision) : null,
        title: it.event.title,
        subtitle: it.role ?? null,
        body: it.note,
        color: KIND_COLOR['event-participation'],
        link: { kind: 'event', id: it.event.id },
      })
    }
  }

  // 정렬: sortKey 오름차순, null은 뒤로
  return items.sort((a, b) => {
    if (a.sortKey == null && b.sortKey == null) return 0
    if (a.sortKey == null) return 1
    if (b.sortKey == null) return -1
    return a.sortKey - b.sortKey
  })
}
