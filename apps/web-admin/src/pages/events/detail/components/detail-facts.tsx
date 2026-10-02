/**
 * 사건 개요 — 지면 우측 sticky 패널.
 *
 * 처음엔 **색인**이었다: '배경 요약·1단락 · 전개 7단락 · 여파 작성됨 · 상위 — · 조약 —'처럼
 * 각 섹션에 무엇이 얼마나 있는지를 세고, 빈 것은 '—'로 남겼다. 그런데 읽는 사람이 사건
 * 페이지에서 먼저 찾는 건 **언제·어디서·얼마나·누가 어느 편이었나·결과는**이고, 한국전쟁의
 * 장부는 그 자리에 문서 통계를 보여주고 있었다(11칸 중 5칸이 '—', 사상자는 본문 문장 속).
 *
 * 그래서 이 패널은 **사건의 사실**을 말한다:
 *  - 날짜·위치(여기서 편집) · 기간 길이 · 결과·진영·사상자(군사 모듈이 있을 때)
 *  - 배역별 참여국 — 히어로의 나라 나열이 말하지 못하는 '누가 어느 편이었나'
 *  - 상위 사건(이름) · 하위 사건·인물·조약 수(누르면 그 섹션으로)
 *  - **값이 없는 행은 그리지 않는다.** 빈 섹션은 본문에서도 접혀 '더 채울 수 있는 것'으로
 *    모이고, 여기서는 그 개수 한 줄만 그리로 안내한다(기록을 채우는 사람의 신호는 유지).
 *
 * 문서 구성(섹션별 단락 수)은 목차가 맡는다 — 이 패널 아래에 있다.
 */
import { FiMapPin } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import {
  DIGIT_DISPLAY,
  MOTION,
  RADIUS,
  ledgerAccent,
  ledgerHairline,
} from '@/pages/events/ledger/styles/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'
import { type UpdateEventDto } from '@/shared/api/events'
import { formatYearLabel, parseIsoDateParts } from '@/shared/lib/iso-date'
import { pathKeys } from '@/shared/router'
import { shouldInterceptEntityClick } from '@/widgets/country/country-inline-modal'

import { type EventDetail } from '../use-event-detail'
import {
  durationLabel,
  groupCountriesByRole,
  type RoleCountry,
} from './event-facts.lib'
import { InlineDateRange, InlineText } from './inline'
import { scrollToAnchor } from './scroll-to-anchor'

interface DetailFactsProps {
  event: EventDetail
  onPatch: (patch: UpdateEventDto) => void
  /** 히어로에서 옮겨온 '동시대 수장 비교' 진입점(연도가 있을 때만 렌더). */
  contemporaryLink?: React.ReactNode
  /** 나라 이름 → 페이지 레벨 국가 정보 모달(히어로·행위자와 같은 동작). */
  onCountryClick: (countryId: string) => void
  /** 내용이 없어 본문에서 접힌 섹션 수 — 0이면 안내 줄을 그리지 않는다. */
  foldedCount: number
}

/** 섹션 앵커로 이동 — 레일 내비와 같은 동작(스크롤 + hash 갱신). */
const jumpTo = (anchorId: string) => scrollToAnchor(anchorId)

/** 배역 한 줄에 세우는 나라 수 — 넘치면 '외 N'(참여 행위자 섹션으로). */
const COUNTRIES_PER_ROLE = 4

export function DetailFacts({
  event,
  onPatch,
  contemporaryLink,
  onCountryClick,
  foldedCount,
}: DetailFactsProps) {
  const year = parseIsoDateParts(event.startDate ?? null)?.year ?? null
  const duration = durationLabel(
    event.startDate,
    event.endDate,
    event.startDatePrecision,
    event.endDatePrecision,
  )

  const military = event.militaryEvent
  const outcome = military?.militaryDetails?.outcome?.trim() || null
  const sideNames = (military?.belligerentSides ?? [])
    .map((side) => side.name?.trim())
    .filter((name): name is string => Boolean(name))
  const casualties = (military?.casualties ?? [])
    .map((row) => {
      const parts = [
        row.totalKilled?.trim() ? `전사 ${row.totalKilled.trim()}` : null,
        row.totalWounded?.trim() ? `부상 ${row.totalWounded.trim()}` : null,
      ].filter(Boolean)
      if (parts.length === 0) return null
      return row.sideName?.trim()
        ? `${row.sideName.trim()} ${parts.join(' · ')}`
        : parts.join(' · ')
    })
    .filter((line): line is string => Boolean(line))

  const roleGroups = groupCountriesByRole([
    ...(event.relatedCountries ?? []).map(
      (country): RoleCountry => ({
        id: country.id,
        name: country.name,
        role: country.role,
        historical: false,
      }),
    ),
    ...(event.relatedHistoricalCountries ?? []).map(
      (country): RoleCountry => ({
        id: country.id,
        name: country.name,
        role: country.role,
        historical: true,
      }),
    ),
  ])

  const parent = event.parentEvent
  const extraParentCount = event.extraParents?.length ?? 0
  const childCount =
    (event.childEvents?.length ?? 0) + (event.extraChildren?.length ?? 0)
  const personCount = event.relatedPersons?.length ?? 0
  const treaties = event.treaties ?? []

  return (
    <Panel aria-label="사건 개요">
      {year != null && (
        <YearDisplay title={`시작 연도 ${formatYearLabel(year)}`}>
          {formatYearLabel(year)}
        </YearDisplay>
      )}

      <DateLine>
        <InlineDateRange
          startDate={event.startDate}
          startDatePrecision={event.startDatePrecision}
          endDate={event.endDate}
          endDatePrecision={event.endDatePrecision}
          // 사건은 정밀도 컬럼이 있다 — 연도만 아는 사건을 '1월 1일'로 두지 않게
          allowPartial
          onSave={(patch) => onPatch(patch)}
        />
      </DateLine>

      <LocationLine title={event.location ?? ''}>
        <PinIcon aria-hidden>
          <FiMapPin />
        </PinIcon>
        <InlineText
          value={event.location ?? ''}
          /* 비우면 빈 문자열을 보내 컬럼을 비운다(`|| undefined`는 서버가 무시). */
          onSave={(next) => onPatch({ location: next.trim() })}
          placeholder="위치"
          label="위치"
        />
      </LocationLine>

      {contemporaryLink}

      <Rows>
        {duration && <FactRow label="기간">{duration}</FactRow>}
        {outcome && (
          <FactRow label="결과" wide>
            <ClampedText title={outcome}>{outcome}</ClampedText>
          </FactRow>
        )}
        {sideNames.length >= 2 && (
          <FactRow label="진영" wide>
            {sideNames.join(' 대 ')}
          </FactRow>
        )}
        {casualties.length > 0 && (
          <FactRow label="사상자" wide>
            <StackedLines>
              {casualties.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </StackedLines>
          </FactRow>
        )}

        {roleGroups.map((group) => {
          const shown = group.countries.slice(0, COUNTRIES_PER_ROLE)
          const overflow = group.countries.length - shown.length
          return (
            <FactRow key={group.label} label={group.label} wide>
              {shown.map((country, index) => (
                <span key={`${country.historical ? 'h' : 'm'}:${country.id}`}>
                  <CountryLink
                    to={pathKeys.countryDetail(country.id)}
                    $historical={country.historical}
                    aria-haspopup="dialog"
                    onClick={(clickEvent) => {
                      if (!shouldInterceptEntityClick(clickEvent)) return
                      clickEvent.preventDefault()
                      onCountryClick(country.id)
                    }}
                  >
                    {country.name}
                  </CountryLink>
                  {index < shown.length - 1 && <Sep>·</Sep>}
                </span>
              ))}
              {overflow > 0 && (
                <JumpButton type="button" onClick={() => jumpTo('actors')}>
                  외 {overflow}
                </JumpButton>
              )}
            </FactRow>
          )
        })}

        {parent && (
          <FactRow label="상위 사건" wide>
            <ParentLink
              to={pathKeys.events.detail(parent.id)}
              viewTransition
              title={parent.title}
            >
              {parent.title}
            </ParentLink>
            {extraParentCount > 0 && (
              <JumpButton type="button" onClick={() => jumpTo('network')}>
                외 {extraParentCount}
              </JumpButton>
            )}
          </FactRow>
        )}
        {childCount > 0 && (
          <FactRow label="하위 사건">
            <JumpButton type="button" onClick={() => jumpTo('network')}>
              {childCount}건
            </JumpButton>
          </FactRow>
        )}
        {personCount > 0 && (
          <FactRow label="인물">
            <JumpButton type="button" onClick={() => jumpTo('actors')}>
              {personCount}명
            </JumpButton>
          </FactRow>
        )}
        {treaties.length > 0 && (
          <FactRow label="조약" wide>
            <JumpButton
              type="button"
              onClick={() => jumpTo('treaties')}
              title={treaties.map((treaty) => treaty.name).join(', ')}
            >
              {treaties.length === 1 ? treaties[0].name : `${treaties.length}건`}
            </JumpButton>
          </FactRow>
        )}
      </Rows>

      {foldedCount > 0 && (
        <FoldedNote type="button" onClick={() => jumpTo('fill-in')}>
          비어 있는 항목 {foldedCount}개 · 채우기
        </FoldedNote>
      )}
    </Panel>
  )
}

/**
 * 한 행 = 한 사실. 라벨 열은 고정 폭이라 값들이 같은 x에서 시작한다(훑어 내려가기 쉽게).
 * `wide` — 이름·문장처럼 길어질 수 있는 값. 한 열 배치에서 여러 열로 접힐 때 행 전체를 쓴다.
 */
function FactRow({
  label,
  wide = false,
  children,
}: {
  label: string
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <Row $wide={wide}>
      <RowLabel>{label}</RowLabel>
      <RowValue>{children}</RowValue>
    </Row>
  )
}

const Panel = styled.section`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

/**
 * 연도 — 이 패널에서 가장 큰 글자. 목록이 "수치를 시각의 1순위로" 둔 것과 같은 규약이고,
 * 사건을 식별하는 첫 번째 축이 연도라서다. mono tabular라 자릿수가 흔들리지 않는다.
 */
const YearDisplay = styled.div`
  ${DIGIT_DISPLAY}
  /**
   * 한 열로 떨어지면 이 숫자는 **제목 바로 아래**에 놓인다 — 34px이면 h1(36px)과 거의
   * 같은 크기라 "큰 글자가 두 번" 나오는 인상이 되고, 제목에 이미 날짜가 들어 있는
   * 사건에서는 같은 값이 두 번 크게 찍힌다. 좁을 땐 장부의 머리글 크기로 내린다.
   */
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 2px;

  /* 2열일 때는 옆 칼럼이라 제목과 경쟁하지 않는다 — 장부의 첫 축으로 크게. */
  @container eventdetail (min-width: 920px) {
    font-size: 34px;
  }
`

const EditableLine = styled.div`
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};

  [data-edit-host] {
    min-width: 0;
    overflow: hidden;
  }
`

/**
 * 위치 — 실데이터가 길다("이란(테헤란·나탄즈·포르도…), 이스라엘(텔아비브…), 카타르(…)
 * — 광역 중동 전구."). 312px 패널에서 4줄을 먹으며 장부의 첫 화면을 밀어냈다.
 * 색인이므로 **두 줄로 자르고** 전체는 title(hover)과 편집 모드가 갖는다.
 */
const LocationLine = styled(EditableLine)`
  align-items: flex-start;

  [data-edit-host] > span:first-child {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`

/**
 * 날짜 줄 — **tabular-nums만** 걸고 mono 글꼴은 쓰지 않는다.
 *
 * 처음엔 DIGIT_DISPLAY(mono 스택)를 걸었는데, 값이 '2025년 6월 12일'처럼 한글을 품고 있어
 * '년·월·일'이 mono 스택에서 폴백되며 앞뒤 간격이 벌어졌다(실측 확인). 자릿수 정렬이라는
 * 목적은 tabular-nums 하나로 달성되고, 글꼴은 본문과 같아야 한 줄로 읽힌다.
 */
const DateLine = styled(EditableLine)`
  font-variant-numeric: tabular-nums;
`

const PinIcon = styled.span`
  display: inline-flex;
  flex-shrink: 0;
  color: ${metaText};

  svg {
    width: 12px;
    height: 12px;
  }
`

/**
 * 사실 행 묶음.
 *
 * 한 열 배치에서는 이 패널이 문서 폭(720px)을 그대로 받는다 — 폭이 남으면 짧은 사실
 * (기간·인물 수)은 여러 열로 접고, 이름·문장 값(wide)은 행 전체를 쓴다.
 */
const Rows = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  column-gap: 28px;
  margin-top: 12px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};

  &:empty {
    display: none;
  }
`

const Row = styled.div<{ $wide: boolean }>`
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
  align-items: baseline;
  gap: 10px;
  padding: 7px 0;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  grid-column: ${({ $wide }) => ($wide ? '1 / -1' : 'auto')};
`

const RowLabel = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: ${metaText};
`

const RowValue = styled.span`
  min-width: 0;
  font-size: 13px;
  line-height: 1.5;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow-wrap: anywhere;
`

/* 결과 문장은 길다(작전 정보의 outcome) — 세 줄까지만, 전체는 title과 작전 정보 섹션. */
const ClampedText = styled.span`
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const StackedLines = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const Sep = styled.span`
  margin: 0 5px;
  color: ${metaText};
`

const focusRing = `
  outline-offset: 2px;
  border-radius: ${RADIUS.FOCUS};
`

/* 나라 이름 — 역사 국가는 기울임(히어로와 같은 규약), 누르면 국가 정보 모달. */
const CountryLink = styled(Link)<{ $historical: boolean }>`
  color: inherit;
  font-style: ${({ $historical }) => ($historical ? 'italic' : 'normal')};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    ${focusRing}
  }
`

const ParentLink = styled(Link)`
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-weight: 600;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    ${focusRing}
  }
`

/* 수·'외 N' — 누르면 그 섹션으로. 글자처럼 보이되 눌리는 것임을 hover 밑줄로. */
const JumpButton = styled.button`
  padding: 0;
  margin-left: 6px;
  border: none;
  background: transparent;
  font: inherit;
  font-weight: 600;
  color: inherit;
  cursor: pointer;

  &:first-child {
    margin-left: 0;
  }

  &:hover {
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    ${focusRing}
  }
`

/**
 * 빈 섹션 안내 — 예전 장부의 '—' 다섯 칸이 하던 일('여기는 아직 비었다')을 한 줄로.
 * 사실 행보다 한 단 흐리게, 누르면 본문 끝 '더 채울 수 있는 것'으로.
 */
const FoldedNote = styled.button`
  align-self: flex-start;
  margin-top: 6px;
  padding: 2px 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 12px;
  color: ${metaText};
  cursor: pointer;
  transition: color ${MOTION.fast};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    ${focusRing}
  }
`
