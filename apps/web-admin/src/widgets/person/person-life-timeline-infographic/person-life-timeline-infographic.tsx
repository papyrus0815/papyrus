/**
 * 인물 연보 — 인포그래픽 타임라인
 * 출생·재위·재임·사건·연보를 한 눈에 연도·나이 축 기준으로 표시.
 * - 좌측: 연도 + (나이) 라벨
 * - 중앙: 타임라인 척추(spine) + 카테고리 색 도트 + 기간 막대
 * - 우측: 카드 (제목·날짜·설명)
 */
import { useMemo, useState } from 'react'
import {
  FiCalendar,
  FiCircle,
  FiFlag,
  FiHeart,
  FiStar,
  FiUserMinus,
  FiUserPlus,
} from 'react-icons/fi'
import styled, { css } from 'styled-components'

import {
  PERSON_LIFE_EVENT_CATEGORY_COLOR,
  PERSON_LIFE_EVENT_CATEGORY_LABEL,
  type PersonLifeEvent,
  type PersonLifeEventCategory,
} from '@/shared/api/person-life-events'
import { CATEGORY_ICON } from '@/widgets/person/person-life-event-form-modal/person-life-event-form-modal'

// ───── 타입 ─────
type TimelineKind =
  | 'reign'
  | 'tenure'
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

interface PersonEventInput {
  id: string
  role?: string | null
  event?: {
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
  isAlive?: boolean | null
  /** 소스 데이터 */
  reigns?: ReignInput[] | null
  tenures?: TenureInput[] | null
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
  /** 빈 상태 CTA — "연보 추가하기" 버튼 콜백 */
  onAddLifeEvent?: () => void
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
type FilterKey = 'life' | 'reign' | 'tenure' | 'event' | 'family'

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
  event: '#0369a1',
  family: '#0d9488',
} as const

const FILTER_OPTIONS: Array<{ key: FilterKey; label: string; color: string }> = [
  { key: 'life', label: '연보', color: FILTER_COLORS.life },
  { key: 'reign', label: '재위', color: FILTER_COLORS.reign },
  { key: 'tenure', label: '재임', color: FILTER_COLORS.tenure },
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
  /** 본인 오늘 기준 기간(일) — 긴 재위/재임에 막대 표시 기준 */
  durationDays?: number | null
}

export function PersonLifeTimelineInfographic({
  birthDate,
  deathDate,
  birthEra,
  deathEra,
  isAlive,
  reigns,
  tenures,
  events,
  lifeEvents,
  father,
  mother,
  spouses,
  children,
  siblings,
  onStartEditLife,
  onFamilyPersonClick,
  onAddLifeEvent,
}: PersonLifeTimelineInfographicProps) {
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
      result.push({
        key: `${rel}-death-${m.id ?? idx}`,
        kind: 'family-death',
        start: d,
        end: null,
        sortKey: toTs(d),
        title: `${m.name} 사망`,
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
      result.push({
        key: 'death',
        kind: 'death',
        start: death,
        end: null,
        sortKey: toTs(death) + 1,
        title: '사망',
        dateLabel: formatWithPrecision(death, 'day'),
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
      life: 5,
      event: 6,
      'family-death': 7,
      death: 8,
    }
    filtered.sort((a, b) => {
      if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey
      return kindOrder[a.kind] - kindOrder[b.kind]
    })
    return filtered
  }, [
    birth,
    death,
    isAlive,
    reigns,
    tenures,
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
    event: true,
    family: true,
  })

  // 각 필터 그룹에 속한 노드가 있는지 파악해서 비활성 필터 표시만 조정
  const availableFilters = useMemo(() => {
    const set = new Set<FilterKey>()
    for (const n of nodes) {
      const f = kindToFilter(n.kind)
      if (f !== 'ego') set.add(f)
    }
    return set
  }, [nodes])

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

  return (
    <TimelineRoot>
      {availableFilters.size > 0 && (
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
                  setFilters((prev) => ({ ...prev, [opt.key]: !prev[opt.key] }))
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

            return (
              <TimelineRow key={node.key}>
                <YearCell>
                  {year != null ? (
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
                  ) : (
                    <YearLabel $muted>—</YearLabel>
                  )}
                </YearCell>

                <SpineCell
                  $isFirst={isFirst}
                  $isLast={isLast}
                  $hasDuration={
                    (node.kind === 'reign' ||
                      node.kind === 'tenure' ||
                      (node.kind === 'life' && !!node.durationDays)) &&
                    (node.durationDays ?? 0) > 365
                  }
                  $kind={node.kind}
                  $color={
                    node.category
                      ? PERSON_LIFE_EVENT_CATEGORY_COLOR[node.category].base
                      : null
                  }
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
                    const clickable = canEditLife || canNavFamily
                    const handleClick = canEditLife
                      ? () => onStartEditLife!(node.lifeEventSource!)
                      : canNavFamily
                        ? () => onFamilyPersonClick!(node.familyPersonId!)
                        : undefined
                    return (
                      <EventCard
                        $kind={node.kind}
                        $color={
                          node.category
                            ? PERSON_LIFE_EVENT_CATEGORY_COLOR[node.category]
                                .base
                            : null
                        }
                        as={clickable ? 'button' : 'div'}
                        type={clickable ? 'button' : undefined}
                        onClick={handleClick}
                        $clickable={clickable}
                      >
                      <CardTopRow>
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
                      <CardTitle>{node.title}</CardTitle>
                      {node.dateLabel && (
                        <CardDate>{node.dateLabel}</CardDate>
                      )}
                      {node.description && (
                        <CardDesc>{node.description}</CardDesc>
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

const FilterBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 4px 4px 8px;
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

const TimelineRow = styled.div`
  display: grid;
  grid-template-columns: 76px 28px 1fr;
  align-items: stretch;
  min-height: 76px;

  @media (max-width: 560px) {
    grid-template-columns: 60px 24px 1fr;
    min-height: 70px;
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

  @media (max-width: 560px) {
    padding: 16px 8px 0 0;
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
}>`
  position: relative;
  &::before,
  &::after {
    content: '';
    position: absolute;
    left: 50%;
    width: 1.5px;
    transform: translateX(-50%);
    background: ${({ theme }) =>
      theme.mode === 'dark'
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
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.03)'
      : '#ffffff'};
  text-align: left;
  width: 100%;
  overflow: hidden;
  transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1),
    box-shadow 0.2s, border-color 0.2s;

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

const CardDesc = styled.div`
  font-size: 12.5px;
  font-weight: 500;
  line-height: 1.6;
  margin-top: 2px;
  color: ${({ theme }) =>
    theme.mode === 'dark'
      ? theme.colors.text.secondary
      : '#475569'};
  white-space: pre-wrap;
  word-break: break-word;
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
