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
  ledgerHairlineStrong,
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

      <EditableLine title={event.location ?? ''}>
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
      </EditableLine>

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
  font-size: 34px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 2px;
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

/** 날짜 줄만 mono tabular — 위치(한글)에까지 mono를 걸면 폰트가 폴백으로 갈린다. */
const DateLine = styled(EditableLine)`
  ${DIGIT_DISPLAY}
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

const Rows = styled.div`
  display: flex;
  flex-direction: column;
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
 * 값 — 채워진 것은 또렷한 수치(tabular), 빈 것은 '—'. 빈 칸을 숨기지 않는 대신
 * 잉크를 낮춰, 훑을 때 채워진 행만 눈에 들어오게 한다.
 */
const RowValue = styled.span<{ $empty: boolean }>`
  ${DIGIT_DISPLAY}
  min-width: 0;
  font-size: 12.5px;
  font-weight: ${({ $empty }) => ($empty ? 400 : 600)};
  text-align: right;
  color: ${({ theme, $empty }) =>
    $empty ? ledgerHairlineStrong(theme.mode) : theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`
