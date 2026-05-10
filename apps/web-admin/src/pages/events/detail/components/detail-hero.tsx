import { useQuery } from '@tanstack/react-query'
import { FiArrowLeft, FiAward, FiCalendar, FiMapPin } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import { resolveCategory } from '@/pages/events/ledger/styles/ledger-tokens'
import {
  type EventCategoryDto,
  getAllEventCategories,
} from '@/shared/api/event-categories'
import { type UpdateEventDto } from '@/shared/api/events'
import { pathKeys } from '@/shared/router'

import * as S from '../styles'
import { type EventDetail } from '../use-event-detail'
import {
  InlineDateRange,
  InlineSelect,
  InlineText,
  type InlineSelectOption,
} from './inline'

interface DetailHeroProps {
  event: EventDetail
  /** 부분 patch — 필드 단위. 페이지 레벨 mutation이 처리. */
  onPatch: (patch: UpdateEventDto) => void
  /** 인물 chip 클릭 시 페이지 레벨 모달 트리거. */
  onPersonClick: (personId: string) => void
}

/**
 * Hero 인라인 편집 — 각 필드를 직접 클릭해 그 자리에서 수정.
 *
 * - 카테고리: 클릭 → select, change 즉시 저장
 * - 제목 / 요약 / 위치: 클릭 → input·textarea, blur·Enter 저장
 * - 기간: 클릭 → 4-필드 swap, 외부 클릭/Enter 저장
 *
 * 부모 사건 브레드크럼은 편집 대상 X (구조 변경은 별도 흐름).
 */
export function DetailHero({ event, onPatch, onPersonClick }: DetailHeroProps) {
  const { data: categories = [] } = useQuery({
    queryKey: ['event-categories'],
    queryFn: getAllEventCategories,
    staleTime: 5 * 60_000,
  })

  const category = resolveCategory(event.category?.name)

  // 부모 사건 체인 — 최상위까지(최대 3단)
  const parentChain: Array<{ id: string; title: string }> = []
  let cursor = event.parentEvent
  let safety = 0
  while (cursor && safety < 3) {
    parentChain.unshift({ id: cursor.id, title: cursor.title })
    cursor = cursor.parentEvent
    safety += 1
  }

  const categoryOptions: InlineSelectOption[] = categories.map(
    (cat: EventCategoryDto) => ({ value: cat.id, label: cat.name }),
  )

  return (
    <S.Hero>
      <S.HeroTopRow>
        <BackLink to={pathKeys.events.root()}>
          <FiArrowLeft />
          목록
        </BackLink>
        <Sep>·</Sep>
        <S.CategoryChip $color={category.color}>
          <span aria-hidden>{category.icon}</span>
          <InlineSelect
            value={event.categoryId ?? ''}
            options={categoryOptions}
            onSave={(next) => onPatch({ categoryId: next || undefined })}
            placeholder={event.category?.name ?? '미분류'}
          />
        </S.CategoryChip>

        {parentChain.length > 0 && (
          <S.Breadcrumb aria-label="상위 사건">
            {parentChain.map((parent) => (
              <Link key={parent.id} to={pathKeys.events.detail(parent.id)}>
                {parent.title}
              </Link>
            ))}
          </S.Breadcrumb>
        )}
      </S.HeroTopRow>

      <TitleHost>
        <InlineText
          value={event.title}
          onSave={(next) => onPatch({ title: next.trim() })}
          validate={(next) =>
            next.trim() ? null : '제목은 비워둘 수 없습니다'
          }
          placeholder="사건명 입력"
          as="span"
        />
      </TitleHost>

      <S.HeroMeta>
        <S.HeroMetaItem>
          <FiCalendar />
          <InlineDateRange
            startDate={event.startDate}
            startDatePrecision={event.startDatePrecision}
            endDate={event.endDate}
            endDatePrecision={event.endDatePrecision}
            onSave={(patch) => onPatch(patch)}
          />
        </S.HeroMetaItem>
        <S.HeroMetaItem>
          <FiMapPin />
          <InlineText
            value={event.location ?? ''}
            onSave={(next) => onPatch({ location: next.trim() || undefined })}
            placeholder="위치"
          />
        </S.HeroMetaItem>
        <ContemporaryHeadsLink event={event} />
      </S.HeroMeta>

      <HeroActors event={event} onPersonClick={onPersonClick} />

      <SummaryHost>
        <InlineText
          value={event.description ?? ''}
          onSave={(next) =>
            onPatch({ description: next.trim() || undefined })
          }
          placeholder="요약 — 한두 단락"
          multiline
        />
      </SummaryHost>
    </S.Hero>
  )
}

const TitleHost = styled.div`
  font-size: clamp(30px, 4.2vw, 44px);
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.018em;
  color: ${({ theme }) => theme.colors.text.primary};
`

/**
 * 사건 시작 연도로 「역대 수장 비교」 페이지의 동시대 가이드라인을 자동으로 꽂아 진입.
 * 사건 startDate가 비어있으면 미렌더.
 */
function ContemporaryHeadsLink({ event }: { event: EventDetail }) {
  const year = extractYear(event.startDate)
  if (year == null) return null
  return (
    <S.HeroMetaItem>
      <FiAward />
      <ContemporaryLink
        to={pathKeys.history.headsOfState(year)}
        title={`${year}년 시점에 세계 각국이 누구의 통치 아래 있었는지 비교`}
      >
        {year}년 동시대 수장 비교
      </ContemporaryLink>
    </S.HeroMetaItem>
  )
}

function extractYear(input: string | null | undefined): number | null {
  if (!input) return null
  const m = input.match(/^(-?\d{1,6})/)
  if (!m || !m[1]) return null
  const n = parseInt(m[1], 10)
  return Number.isFinite(n) ? n : null
}

const ContemporaryLink = styled(Link)`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
`

/* ───────────────── Hero actor strip — NYT editorial ─────────────────
 * 사건 헤더의 "참여자 라인업" — 신문 byline / dramatis personae 톤.
 * - smallcaps eyebrow 라벨 + 검정 1px 헤어라인 룰
 * - 작은 정사각 b&w 아바타 stack + 세리프 이름(중점·쉼표로 구분)
 * - 국가는 한 단락 — 현대(roman) · 역사(italic)로 weight/style만 구분, flag 미사용
 */
const PERSON_CAP = 4
const COUNTRY_CAP = 8

function HeroActors({
  event,
  onPersonClick,
}: {
  event: EventDetail
  onPersonClick: (personId: string) => void
}) {
  const allPersons = event.relatedPersons ?? []
  const allModern = event.relatedCountries ?? []
  const allHistorical = event.relatedHistoricalCountries ?? []

  const persons = allPersons.slice(0, PERSON_CAP)
  const modern = allModern.slice(0, COUNTRY_CAP)
  const historical = allHistorical.slice(0, COUNTRY_CAP - modern.length)

  const personOverflow = allPersons.length - persons.length
  const countryOverflow =
    allModern.length + allHistorical.length - modern.length - historical.length

  if (
    persons.length === 0 &&
    modern.length === 0 &&
    historical.length === 0
  )
    return null

  return (
    <ActorStrip aria-label="참여 행위자 요약">
      {persons.length > 0 && (
        <Lineup>
          <PersonInline>
            {persons.map((p, i) => {
              const name = p.person?.name ?? '미상'
              const avatar = p.person?.profileImageUrl ?? undefined
              return (
                <span key={p.id}>
                  <PersonInlineButton
                    type="button"
                    onClick={() => onPersonClick(p.personId)}
                  >
                    <PersonAvatar $hasImage={Boolean(avatar)}>
                      {avatar ? (
                        <img src={avatar} alt="" loading="lazy" />
                      ) : (
                        <span>{name.charAt(0)}</span>
                      )}
                    </PersonAvatar>
                    <PersonName>{name}</PersonName>
                    {p.role && <PersonRole>, {p.role}</PersonRole>}
                  </PersonInlineButton>
                  {i < persons.length - 1 && <PersonSep>·</PersonSep>}
                </span>
              )
            })}
            {personOverflow > 0 && (
              <Overflow href="#actors">외 {personOverflow}명</Overflow>
            )}
          </PersonInline>
        </Lineup>
      )}

      {(modern.length > 0 || historical.length > 0) && (
        <Lineup>
          <CountryInline>
            {modern.map((c, i) => (
              <span key={c.id}>
                <CountryName to={pathKeys.history.countryDetail(c.id)}>
                  {c.name}
                </CountryName>
                {i < modern.length - 1 && <CountrySep>·</CountrySep>}
              </span>
            ))}
            {modern.length > 0 && historical.length > 0 && (
              <CountryHardSep>—</CountryHardSep>
            )}
            {historical.map((c, i) => (
              <span key={c.id}>
                <HistoricalName>{c.name}</HistoricalName>
                {i < historical.length - 1 && <CountrySep>·</CountrySep>}
              </span>
            ))}
            {countryOverflow > 0 && (
              <Overflow href="#actors">외 {countryOverflow}</Overflow>
            )}
          </CountryInline>
        </Lineup>
      )}
    </ActorStrip>
  )
}

/* ─── Editorial actor strip — sans, NYT 깔끔한 톤만 ───
 * 시그니처: 검정 1px 헤어라인 룰 + smallcaps tracked eyebrow + 깔끔한 위계.
 * 폰트는 앱 기본(Inter/Pretendard) 그대로 — 세리프 미사용.
 */
/**
 * Hero 하단 ActorStrip 구분선. detail-actors.tsx의 editorialRuleColor와 동일하게
 * hairline 톤으로 낮춤(이전 0.78/0.5는 본문보다 진해 시선 분산이 컸음).
 */
const editorialRule = (mode: 'light' | 'dark') =>
  mode === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.12)'

const ActorStrip = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
  padding-top: 14px;
  border-top: 1px solid ${({ theme }) => editorialRule(theme.mode)};
`

const Lineup = styled.div`
  min-width: 0;
`

/* ── 인물 인라인 — 작은 b&w 아바타 + 본문 sans 이름 ── */

const PersonInline = styled.div`
  font-size: 14.5px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.005em;

  > span {
    display: inline;
  }
`

const PersonInlineButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  color: inherit;
  font: inherit;
  /* avatar(22px)와 이름(14.5px)을 함께 묶은 칩이 본문 줄에 자연스럽게 안기도록.
     baseline로 두면 img가 baseline까지 내려가 위쪽 공백이 비대칭 — middle로 묶음. */
  vertical-align: middle;

  &:focus-visible {
    outline: none;
  }
`

const PersonAvatar = styled.span<{ $hasImage: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 0; /* 정사각 — editorial photo */
  overflow: hidden;
  background: ${({ theme, $hasImage }) =>
    $hasImage
      ? 'transparent'
      : theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.1)'
      : 'rgba(15, 23, 42, 0.08)'};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    /* 살짝 desaturate — 깔끔한 사진 톤 */
    filter: grayscale(0.3) contrast(1.02);
  }
`

const PersonName = styled.span`
  font-size: 14.5px;
  font-weight: 700;
  letter-spacing: -0.005em;
  color: ${({ theme }) => theme.colors.text.primary};

  ${PersonInlineButton}:hover &,
  ${PersonInlineButton}:focus-visible & {
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 3px;
  }
`

const PersonRole = styled.span`
  font-size: 13.5px;
  font-style: italic;
  color: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.66)'
      : 'rgba(15,23,42,0.62)'};
`

const PersonSep = styled.span`
  margin: 0 8px;
  color: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.3)'
      : 'rgba(15,23,42,0.26)'};
`

/* ── 국가 인라인 — 현대(roman) · 역사(italic) — flag 미사용 ── */

const CountryInline = styled.div`
  font-size: 14px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.005em;
`

const CountryName = styled(Link)`
  color: inherit;
  text-decoration: none;
  font-weight: 500;

  &:hover,
  &:focus-visible {
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 3px;
    outline: none;
  }
`

const HistoricalName = styled.span`
  font-style: italic;
  color: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.74)'
      : 'rgba(15,23,42,0.7)'};
`

const CountrySep = styled.span`
  margin: 0 7px;
  color: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.3)'
      : 'rgba(15,23,42,0.26)'};
`

const CountryHardSep = styled.span`
  margin: 0 10px;
  color: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.42)'
      : 'rgba(15,23,42,0.42)'};
`

const Overflow = styled.a`
  font-style: italic;
  font-size: 13px;
  margin-left: 10px;
  color: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.55)'
      : 'rgba(15,23,42,0.55)'};
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

const SummaryHost = styled.div`
  font-size: 16.5px;
  line-height: 1.65;
  color: ${({ theme }) => theme.colors.text.secondary};
  max-width: 720px;
`

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  color: ${({ theme }) => theme.colors.text.tertiary};

  svg {
    width: 13px;
    height: 13px;
  }

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const Sep = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  opacity: 0.5;
  font-size: 13px;
`
