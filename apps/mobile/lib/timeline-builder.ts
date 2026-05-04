import { formatDateString, formatYMD } from './format'
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
  /** 정렬 키. ISO 또는 YYYY-MM-DD */
  sortDate: string
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

const KIND_COLOR: Record<TimelineKind, string> = {
  'ego-birth': '#16a34a',
  'ego-death': '#dc2626',
  'marriage': '#ec4899',
  'reign': '#ca8a04',
  'tenure': '#0369a1',
  'life-event': '#7c3aed',
  'event-participation': '#a855f7',
  'family-birth': '#86efac',
  'family-death': '#fca5a5',
}

function ymdString(year?: number | null, month?: number | null, day?: number | null) {
  if (year == null) return ''
  return `${year < 0 ? '-' : ''}${String(Math.abs(year)).padStart(4, '0')}-${String(month ?? 1).padStart(2, '0')}-${String(day ?? 1).padStart(2, '0')}`
}

function isoToSort(iso?: string | null) {
  if (!iso) return ''
  return iso.slice(0, 10)
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
      sortDate: ymdString(detail.birthYear, detail.birthMonth, detail.birthDay),
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
        sortDate: ymdString(detail.deathYear, detail.deathMonth, detail.deathDay),
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
    const sortDate = isoToSort(r.startDate)
    if (!sortDate) continue
    const country = r.country?.name ?? r.historicalCountry?.name
    const startLabel = formatDateString(r.startDate) ?? '?'
    const endLabel = r.endDate ? formatDateString(r.endDate) : '재위 중'
    items.push({
      key: `reign-${r.id ?? sortDate}`,
      kind: 'reign',
      sortDate,
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
    const sortDate = isoToSort(g.startDate)
    if (!sortDate) continue
    const country = g.country?.name ?? g.historicalCountry?.name
    const position = g.positionDefinition?.name ?? g.positionDefinition?.title ?? g.positionName
    const startLabel = formatDateString(g.startDate) ?? '?'
    const endLabel = g.endDate ? formatDateString(g.endDate) : '재임 중'
    items.push({
      key: `tenure-${g.id ?? sortDate}`,
      kind: 'tenure',
      sortDate,
      dateLabel: startLabel,
      endLabel,
      title: position ?? '정부 직책',
      subtitle: country ?? null,
      body: g.notes,
      color: KIND_COLOR['tenure'],
    })
  }

  // 결혼 (PersonSpouse.marriageStartDate)
  for (const sr of (detail as any).spouseRelations ?? []) {
    if (!sr.marriageStartDate) continue
    const spouseName = sr.spouse?.surname
      ? `${sr.spouse.surname}${sr.spouse.name}`
      : sr.spouse?.name
    items.push({
      key: `marriage-${sr.id}`,
      kind: 'marriage',
      sortDate: isoToSort(sr.marriageStartDate),
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
  const familyMembers: Array<{ p: any; relation: string }> = []
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
        sortDate: ymdString(p.birthYear, p.birthMonth, p.birthDay),
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
        sortDate: ymdString(p.deathYear, p.deathMonth, p.deathDay),
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
        sortDate: isoToSort(it.startDate),
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
        sortDate: isoToSort(it.event.startDate),
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

  // 정렬: sortDate 오름차순, 빈값은 뒤로
  return items.sort((a, b) => {
    if (!a.sortDate && !b.sortDate) return 0
    if (!a.sortDate) return 1
    if (!b.sortDate) return -1
    return a.sortDate.localeCompare(b.sortDate)
  })
}
