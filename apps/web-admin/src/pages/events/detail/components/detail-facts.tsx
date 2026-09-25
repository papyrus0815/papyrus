/**
 * 사실 장부 — 지면 우측 sticky 패널.
 *
 * 왜 만들었나. 이 지면은 **서사**(배경·전개·여파)와 **사실**(언제·어디서·누가·무엇이
 * 걸렸나)을 한 줄에 쌓아 두고 있었다. 그래서 "이 사건에 조약이 걸려 있나?", "하위 사건이
 * 몇 건인가?", "사진은 있나?"를 알려면 12개 섹션을 끝까지 스크롤해야 했다 — 비어 있는
 * 섹션조차 스크롤해 봐야 비어 있다는 걸 알 수 있었다.
 *
 * 이 패널은 **중복 표시가 아니라 색인**이다:
 *  - 각 행은 그 섹션에 무엇이 얼마나 있는지 세고, 누르면 그 섹션으로 간다.
 *  - **빈 것은 지우지 않고 '—'로 남긴다.** 이 지면에서 가장 자주 필요한 정보가
 *    "여기는 아직 비었다"이기 때문이다(기록을 채우는 사람이 쓰는 화면이다).
 *  - 날짜·위치는 사실이므로 편집도 여기서 한다(히어로에서 옮겨왔다). 히어로에는
 *    제목·요약·행위자 — 서사의 도입만 남는다.
 *
 * 톤은 목록과 같은 장부다 — 수치는 mono tabular, 라벨은 작고 흐린 다른 종류의 글자.
 */
import { FiMapPin } from 'react-icons/fi'
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

import { type EventDetail } from '../use-event-detail'
import { InlineDateRange, InlineText } from './inline'

interface DetailFactsProps {
  event: EventDetail
  onPatch: (patch: UpdateEventDto) => void
  /** 히어로에서 옮겨온 '동시대 수장 비교' 진입점(연도가 있을 때만 렌더). */
  contemporaryLink?: React.ReactNode
}

/** 섹션 앵커로 이동 — 레일 내비와 같은 동작(스크롤 + hash 갱신). */
function jumpTo(anchorId: string) {
  const target = document.getElementById(anchorId)
  if (!target) return
  target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  window.history.replaceState(null, '', `#${anchorId}`)
}

export function DetailFacts({
  event,
  onPatch,
  contemporaryLink,
}: DetailFactsProps) {
  const year = parseIsoDateParts(event.startDate ?? null)?.year ?? null

  /* 서사 — 배경·여파는 있고 없고, 전개는 단락 수. 태그를 걷어낸 실제 글자 유무로 센다. */
  const hasText = (value?: string | null) =>
    Boolean(value && value.replace(/<[^>]*>/g, '').trim())
  const narrativeCount = (event.eventSections ?? []).filter(
    (section) => section.sectionType !== 'background',
  ).length
  const backgroundCount = (event.eventSections ?? []).filter(
    (section) => section.sectionType === 'background',
  ).length

  const countryCount =
    (event.relatedCountries?.length ?? 0) +
    (event.relatedHistoricalCountries?.length ?? 0)
  const personCount = event.relatedPersons?.length ?? 0
  const parentCount =
    (event.parentEvent ? 1 : 0) + (event.extraParents?.length ?? 0)
  const childCount =
    (event.childEvents?.length ?? 0) + (event.extraChildren?.length ?? 0)
  const treatyCount = event.treaties?.length ?? 0
  const imageCount = event.eventImages?.length ?? 0
  const keywordCount = event.keywords?.length ?? 0

  return (
    <Panel aria-label="사건 사실 요약">
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
        <FactRow
          label="배경"
          anchor="background"
          value={
            hasText(event.background) || backgroundCount > 0
              ? [
                  hasText(event.background) ? '요약' : null,
                  backgroundCount > 0 ? `${backgroundCount}단락` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')
              : null
          }
        />
        <FactRow
          label="전개"
          anchor="narrative"
          value={narrativeCount > 0 ? `${narrativeCount}단락` : null}
        />
        <FactRow
          label="여파"
          anchor="aftermath"
          value={hasText(event.aftermath) ? '작성됨' : null}
        />
        <FactRow
          label="참여국"
          anchor="actors"
          value={countryCount > 0 ? `${countryCount}` : null}
        />
        <FactRow
          label="인물"
          anchor="actors"
          value={personCount > 0 ? `${personCount}` : null}
        />
        <FactRow
          label="상위"
          anchor="network"
          value={parentCount > 0 ? `${parentCount}` : null}
        />
        <FactRow
          label="하위"
          anchor="network"
          value={childCount > 0 ? `${childCount}` : null}
        />
        <FactRow
          label="키워드"
          anchor="network"
          value={keywordCount > 0 ? `${keywordCount}` : null}
        />
        <FactRow
          label="조약"
          anchor="treaties"
          value={treatyCount > 0 ? `${treatyCount}` : null}
        />
        <FactRow
          label="이미지"
          anchor="appendix"
          value={imageCount > 0 ? `${imageCount}` : null}
        />
      </Rows>
    </Panel>
  )
}

/**
 * 한 행 = 한 사실. 값이 없으면 '—'로 남기고 **누르는 것은 그대로 둔다** —
 * 비어 있다는 사실이야말로 기록을 채우는 사람이 가장 자주 찾는 정보이고,
 * 거기서 바로 그 섹션으로 갈 수 있어야 한다.
 */
function FactRow({
  label,
  value,
  anchor,
}: {
  label: string
  value: string | null
  anchor: string
}) {
  const empty = value == null
  return (
    <Row type="button" onClick={() => jumpTo(anchor)} $empty={empty}>
      <RowLabel>{label}</RowLabel>
      <RowValue $empty={empty}>{empty ? '—' : value}</RowValue>
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
 * 색인 행 묶음.
 *
 * 한 열 배치에서는 이 패널이 문서 폭(720px)을 그대로 받는다. 행을 세로로만 쌓으면
 * 라벨(좌)과 값(우) 사이가 600px 비어, 한 행을 읽는 데 눈이 화면을 가로질러야 했다.
 * 폭이 남으면 **여러 열로 접는다** — 색인은 훑는 것이지 읽는 것이 아니다.
 */
const Rows = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  column-gap: 28px;
  margin-top: 12px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const Row = styled.button<{ $empty: boolean }>`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  padding: 6px 4px 6px 0;
  border: none;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: transparent;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background ${MOTION.fast};

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.03)'};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: -2px;
    border-radius: ${RADIUS.FOCUS};
  }
`

const RowLabel = styled.span`
  flex-shrink: 0;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: ${metaText};
`

/**
 * 값 — 채워진 것은 또렷한 수치(tabular), 빈 것은 '—'.
 *
 * ⚠️ 빈 값의 색을 hairline(alpha 0.1)으로 두었더니 화면에서 **거의 보이지 않았다**.
 * 이 패널을 만든 이유가 "여기는 아직 비었다"를 말해 주기 위해서인데, 정작 그 신호가
 * 가장 안 읽히는 모순이었다. 채워진 값보다는 흐리되 읽히는 단계(metaText)로 올린다 —
 * 위계는 굵기(600 vs 400)와 색 한 단 차이가 만든다.
 */
const RowValue = styled.span<{ $empty: boolean }>`
  min-width: 0;
  font-size: 12.5px;
  font-weight: ${({ $empty }) => ($empty ? 400 : 600)};
  font-variant-numeric: tabular-nums;
  text-align: right;
  color: ${({ theme, $empty }) =>
    $empty ? metaText({ theme }) : theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`
