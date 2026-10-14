/**
 * 국가 성립·소멸 — "이 사건으로 무엇에서 무엇이 되었나".
 *
 * 참여국 역할이 '건국'(FOUNDED)·'멸망'(DISSOLVED)인 나라마다 한 줄. 사건 지면은 이 나라의 이름만
 * 보여주고 있었는데, 전신·후신(계승 관계)·세운 쪽·초대/마지막 통치자는 국가 쪽에 이미 다 있다
 * (docs/event-category-features-review.md §3 건국/멸망). 그래서 이 섹션은 **새로 저장하는 것이
 * 없다** — 국가 상세의 건국·멸망 카드가 쓰는 요약 API(founding-summary)를 같은 캐시 키로 읽는다.
 *
 * 카테고리와 무관하게 역할이 있으면 보인다(정치 사건에도 '건국' 역할이 있다). 다만 건국/멸망
 * 사건인데 역할이 하나도 없으면, 그 사건의 핵심이 비어 있다는 뜻이라 지정 안내를 띄운다.
 *
 * 국가 기록의 건국·멸망 연도와 사건 연도가 어긋나면 작게 알린다 — 시드 오류를 사건을 읽다가
 * 발견하게 하려는 것이다(고치는 곳은 국가 상세).
 */
import { useQueries } from '@tanstack/react-query'
import styled from 'styled-components'

import { ledgerHairlineStrong } from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'
import {
  type FirstRuler,
  type FoundingLinkedCountry,
  type FoundingSummary,
  type StatehoodAgent,
  getHistoricalCountryFoundingSummary,
} from '@/shared/api/historical-countries'
import { formatCountryYearShort, toSignedYear } from '@/shared/lib/country-period'
import { parseIsoDateParts } from '@/shared/lib/iso-date'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { foundingSummaryKey } from '@/widgets/country/country-detail/ui/historical-founding-cards'
import { TRANSITION_EVENT_LABELS } from '@/widgets/country/country-detail/model/linked-historical-labels'

import * as S from '../styles'
import { type EventDetail } from '../use-event-detail'

type StatehoodRole = 'FOUNDED' | 'DISSOLVED'

interface StatehoodEntry {
  id: string
  name: string
  role: StatehoodRole
  historical: boolean
}

interface DetailStatehoodProps {
  event: EventDetail
  /** 건국/멸망 카테고리 — 역할이 없을 때 지정 안내를 띄운다 */
  expectStatehood: boolean
  onCountryClick: (countryId: string) => void
  onPersonClick: (personId: string) => void
}

const RULER_TITLE: Record<FirstRuler['kind'], string> = {
  monarch: '군주',
  headOfState: '국가원수',
  headOfGovernment: '정부수반',
}

/**
 * 가장 이른 기록이 성립에서 이만큼(년) 넘게 떨어지면 초대로 보지 않는다 — 국가 상세 건국 카드
 * (historical-founding-cards.tsx FIRST_RULER_MAX_GAP)와 같은 규칙. 청나라처럼 제1대 기록이 없고
 * 건륭제부터 기록돼 있으면 '초대 건륭제'로 읽히는 오류를 막는다.
 */
const FIRST_RULER_MAX_GAP = 10

/** 초대 칸에 둘 때의 단서 — 제1대 기록이면 없음 */
function firstRulerHint(ruler: FirstRuler, foundingYear: number | null): string | null {
  if (ruler.basis !== 'earliest') return null
  const start = toSignedYear(ruler.startEra, ruler.startYear)
  const gap = start != null && foundingYear != null ? start - foundingYear : null
  if (gap != null && gap > FIRST_RULER_MAX_GAP) return `성립 ${gap}년 뒤 · 초대 기록 없음`
  /* ↑ 문구를 바꾸면 rulerLabel 판정(includes)도 함께 바꿀 것 */
  return '가장 이른 기록'
}

/** 사건 쪽 역할 → 이 나라의 '성립'·'소멸' 라벨. 정권·시대도 섞여 있어 '건국'보다 넓은 말을 쓴다. */
const ROLE_LABEL: Record<StatehoodRole, string> = {
  FOUNDED: '성립',
  DISSOLVED: '소멸',
}

export function statehoodEntries(event: EventDetail): StatehoodEntry[] {
  const pick = (role: unknown): StatehoodRole | null =>
    role === 'FOUNDED' || role === 'DISSOLVED' ? role : null
  const entries: StatehoodEntry[] = []
  for (const country of event.relatedHistoricalCountries ?? []) {
    const role = pick(country.role)
    if (role) entries.push({ id: country.id, name: country.name, role, historical: true })
  }
  for (const country of event.relatedCountries ?? []) {
    const role = pick(country.role)
    if (role) entries.push({ id: country.id, name: country.name, role, historical: false })
  }
  /* 성립을 먼저 — "무엇이 사라지고 무엇이 섰나"보다 이 사건의 결과(선 나라)를 앞에 둔다 */
  return entries.sort((left, right) => (left.role === right.role ? 0 : left.role === 'FOUNDED' ? -1 : 1))
}

export function DetailStatehood({ event, expectStatehood, onCountryClick, onPersonClick }: DetailStatehoodProps) {
  const entries = statehoodEntries(event)
  const historicalEntries = entries.filter((entry) => entry.historical)
  const summaries = useQueries({
    queries: historicalEntries.map((entry) => ({
      queryKey: foundingSummaryKey(entry.id),
      queryFn: () => getHistoricalCountryFoundingSummary(entry.id),
      staleTime: 60_000,
    })),
  })
  const summaryById = new Map<string, FoundingSummary | undefined>(
    historicalEntries.map((entry, index) => [entry.id, summaries[index]?.data]),
  )

  if (entries.length === 0 && !expectStatehood) return null

  const eventYear = parseIsoDateParts(event.startDate ?? null)?.year ?? null

  return (
    <S.Section id="statehood">
      <S.SectionHeader>
        <S.SectionTitle>국가 성립·소멸</S.SectionTitle>
        {entries.length > 1 && <S.SectionSubtitle>{entries.length}곳</S.SectionSubtitle>}
      </S.SectionHeader>

      {entries.length === 0 ? (
        <S.HelperText>
          이 사건으로 세워지거나 사라진 나라를 참여국 역할 ‘건국’·‘멸망’으로 지정하면, 그 나라의
          전신·후신과 세운 쪽, 초대·마지막 통치자가 여기 이어집니다.{' '}
          <ActorsLink href="#actors">참여국 편집으로</ActorsLink>
        </S.HelperText>
      ) : (
        <Rows>
          {entries.map((entry) => (
            <StatehoodRow
              key={`${entry.role}:${entry.id}`}
              entry={entry}
              summary={summaryById.get(entry.id)}
              eventYear={eventYear}
              onCountryClick={onCountryClick}
              onPersonClick={onPersonClick}
            />
          ))}
        </Rows>
      )}
    </S.Section>
  )
}

function StatehoodRow({
  entry,
  summary,
  eventYear,
  onCountryClick,
  onPersonClick,
}: {
  entry: StatehoodEntry
  summary: FoundingSummary | undefined
  eventYear: number | null
  onCountryClick: (countryId: string) => void
  onPersonClick: (personId: string) => void
}) {
  const founded = entry.role === 'FOUNDED'
  const period = summary?.period
  const startYear = period ? toSignedYear(period.startEra ?? 'AD', period.startYear) : null
  const endYear = period ? toSignedYear(period.endEra ?? 'AD', period.endYear) : null
  const periodLabel =
    startYear != null || endYear != null
      ? `${formatCountryYearShort(startYear) ?? '?'} – ${formatCountryYearShort(endYear) ?? ''}`
      : null

  const agents = (founded ? summary?.founders : summary?.dissolvers) ?? []
  const rulers = (founded ? summary?.firstRulers : summary?.lastRulers) ?? []
  const predecessors = summary?.predecessors ?? []
  const successors = summary?.successors ?? []
  const mismatch = yearMismatch(eventYear, founded ? startYear : endYear)
  /* 모두 '성립 한참 뒤' 기록이면 '초대'라 부르지 않는다 */
  const rulerLabel = founded
    ? rulers.every((ruler) => firstRulerHint(ruler, startYear)?.includes('초대 기록 없음'))
      ? '기록상 첫 통치자'
      : '초대'
    : '마지막'

  return (
    <Row>
      <Head>
        <RoleTag $founded={founded}>{ROLE_LABEL[entry.role]}</RoleTag>
        <CountryButton type="button" onClick={() => onCountryClick(entry.id)}>
          {entry.name}
        </CountryButton>
        {periodLabel && <Period>{periodLabel}</Period>}
      </Head>

      {(predecessors.length > 0 || successors.length > 0) && (
        <Lineage aria-label="계승 관계">
          {predecessors.length > 0 && (
            <>
              <LinkedList items={predecessors} onCountryClick={onCountryClick} />
              <Arrow aria-hidden>→</Arrow>
            </>
          )}
          <LineageSelf>{entry.name}</LineageSelf>
          {successors.length > 0 && (
            <>
              <Arrow aria-hidden>→</Arrow>
              <LinkedList items={successors} onCountryClick={onCountryClick} />
            </>
          )}
        </Lineage>
      )}

      {agents.length > 0 && (
        <Facet>
          <FacetLabel>{founded ? '세운 쪽' : '무너뜨린 쪽'}</FacetLabel>
          <Names>
            {agents.map((agent) => (
              <AgentName key={agent.id} agent={agent} onCountryClick={onCountryClick} onPersonClick={onPersonClick} />
            ))}
          </Names>
        </Facet>
      )}

      {rulers.length > 0 && (
        <Facet>
          <FacetLabel>{rulerLabel}</FacetLabel>
          <Names>
            {rulers.map((ruler) => (
              <li key={ruler.recordId}>
                <NameButton type="button" onClick={() => onPersonClick(ruler.person.id)}>
                  {ruler.regnalName ?? getPersonDisplayName(ruler.person)}
                </NameButton>
                <Sub>{ruler.title ?? RULER_TITLE[ruler.kind]}</Sub>
                {founded && firstRulerHint(ruler, startYear) && (
                  <Hint>{firstRulerHint(ruler, startYear)}</Hint>
                )}
              </li>
            ))}
          </Names>
        </Facet>
      )}

      {mismatch && (
        <MismatchNote>
          국가 기록의 {founded ? '성립' : '소멸'} 연도는 {formatCountryYearShort(mismatch.countryYear)}년 —
          이 사건과 {mismatch.diff}년 차이가 납니다.
        </MismatchNote>
      )}
    </Row>
  )
}

/**
 * 사건 연도 ↔ 국가 기록 연도 대조.
 * BC가 끼면 1년 차는 무시한다 — 사건 날짜(ISO, 0년 있음)와 국가 연도(BC 1 = -1, 0년 없음)의
 * 셈법이 달라 경계에서 1년이 저절로 생긴다.
 */
function yearMismatch(
  eventYear: number | null,
  countryYear: number | null,
): { countryYear: number; diff: number } | null {
  if (eventYear == null || countryYear == null) return null
  const diff = Math.abs(eventYear - countryYear)
  const tolerance = eventYear <= 0 || countryYear < 0 ? 1 : 0
  return diff > tolerance ? { countryYear, diff } : null
}

function LinkedList({
  items,
  onCountryClick,
}: {
  items: FoundingLinkedCountry[]
  onCountryClick: (countryId: string) => void
}) {
  return (
    <LinkedGroup>
      {items.map((item) => (
        <span key={item.id}>
          <NameButton type="button" onClick={() => onCountryClick(item.id)}>
            {item.name}
          </NameButton>
          {TRANSITION_EVENT_LABELS[item.eventType] && <Sub>{TRANSITION_EVENT_LABELS[item.eventType]}</Sub>}
        </span>
      ))}
    </LinkedGroup>
  )
}

function AgentName({
  agent,
  onCountryClick,
  onPersonClick,
}: {
  agent: StatehoodAgent
  onCountryClick: (countryId: string) => void
  onPersonClick: (personId: string) => void
}) {
  const label = agent.person ? getPersonDisplayName(agent.person) : agent.name
  const open =
    agent.kind === 'person' && agent.refId
      ? () => onPersonClick(agent.refId as string)
      : (agent.kind === 'historicalCountry' || agent.kind === 'country') && agent.refId
        ? () => onCountryClick(agent.refId as string)
        : null
  return (
    <li>
      {open ? (
        <NameButton type="button" onClick={open}>
          {label}
        </NameButton>
      ) : (
        <span>{label}</span>
      )}
      {agent.note && <Sub>{agent.note}</Sub>}
    </li>
  )
}

/* ───────────────────────── styles ───────────────────────── */

const Rows = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
`

const Row = styled.li`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:first-child {
    padding-top: 4px;
  }

  &:last-child {
    border-bottom: none;
  }
`

const Head = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
`

/* 성립은 본문 잉크, 소멸은 흐린 잉크 — 색을 새로 들이지 않고 굵기·명도로만 가른다. */
const RoleTag = styled.span<{ $founded: boolean }>`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme, $founded }) => ($founded ? theme.colors.text.primary : theme.colors.text.tertiary)};
`

const buttonReset = `
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  text-align: left;
  cursor: pointer;
`

const CountryButton = styled.button`
  ${buttonReset}
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};

  &:hover,
  &:focus-visible {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

const Period = styled.span`
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: ${metaText};
`

const Lineage = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
  font-size: 13.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const LinkedGroup = styled.span`
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px 12px;
`

const LineageSelf = styled.span`
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Arrow = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Facet = styled.div`
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  column-gap: 12px;
  row-gap: 6px;
  align-items: baseline;

  @media (max-width: 560px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const FacetLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${metaText};
`

const Names = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  font-size: 13.5px;
  color: ${({ theme }) => theme.colors.text.primary};
`

const NameButton = styled.button`
  ${buttonReset}
  color: inherit;
  text-decoration: underline;
  text-decoration-color: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  text-underline-offset: 3px;

  &:hover,
  &:focus-visible {
    text-decoration-color: currentColor;
  }
`

const Sub = styled.span`
  margin-left: 5px;
  font-size: 11.5px;
  font-weight: 600;
  color: ${metaText};
`

const Hint = styled.span`
  margin-left: 6px;
  font-size: 11.5px;
  color: ${metaText};
`

const MismatchNote = styled.p`
  margin: 0;
  font-size: 12.5px;
  line-height: 1.6;
  color: ${metaText};
`

const ActorsLink = styled.a`
  font-weight: 600;
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
`
