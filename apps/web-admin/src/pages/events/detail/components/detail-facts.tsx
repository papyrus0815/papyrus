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
import { Suspense, lazy, useEffect, useRef, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiMapPin } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import {
  DIGIT_DISPLAY,
  MOTION,
  RADIUS,
  ledgerAccent,
  ledgerHairline,
} from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'
import { type UpdateEventDto } from '@/shared/api/events'
import { formatYearLabel, parseIsoDateParts } from '@/shared/lib/iso-date'
import { commentsQueryOptions } from '@/entities/comment/comment.api'
import { getEventOverview } from '@/shared/api/event-overview'
import { eventKeys } from '@/shared/api/event-query-keys'
import { formatObservationValue } from '@/entities/evidence/lib/format-observation'
import { pathKeys } from '@/shared/router'
import { shouldInterceptEntityClick } from '@/widgets/country/country-inline-modal'

import { type EventDetail, eventObservationsQueryOptions } from '../use-event-detail'
import {
  durationLabel,
  groupCountriesByRole,
  type RoleCountry,
} from './event-facts.lib'
import { heroCardsShowAllCountries } from './hero-countries.lib'
import { InlineDateRange, InlineText } from './inline'
import { type LatLng } from './location-picker-map'
import { LocationPickerModal, formatCoordinate, googleMapsUrl } from './location-picker-modal'

/** 작은 위치 지도 — 핀이 있을 때만 leaflet을 싣는다 */
const LocationPreviewMap = lazy(() => import('./location-preview-map'))
import { OriginalDateLine } from './original-date-line'
import { SIDE_OUTCOME_LABEL, isPlaceholderSideName } from './side-outcome'
import { representativeOf } from './side-metrics.lib'
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
  /**
   * 섹션으로 가기 — 페이지가 그 섹션의 **탭을 먼저 열고** 스크롤한다. 예전엔 여기서 바로 스크롤만 해서
   * 개요 탭에서 '인물 4명'(참여 탭)을 누르면 앵커가 없어 아무 일도 없었다. 없으면 같은 탭 안 스크롤만.
   */
  onJump?: (anchorId: string) => void
  /** 원어 사건명이 비었을 때의 진입점 — 주면 위치 줄 아래 '+ 원어 사건명'이 선다 */
  onAddOriginalTitle?: () => void
  /** 연결된 관련 사건(인과·배경·동시대) 건수 */
  relatedCount?: number
  /** 연결된 국가 기관(부처·위원회) 건수 */
  departmentCount?: number
}

/** 배역 한 줄에 세우는 나라 수 — 넘치면 '외 N'(참여 행위자 섹션으로). */
const COUNTRIES_PER_ROLE = 4

/** 장부 '사상자' 줄이 고르는 지표 — 앞에 있을수록 우선(정의가 다른 수를 섞지 않는다) */
const CASUALTY_METRIC_PRIORITY = [
  'military.casualties_total',
  'military.deaths_total',
  'military.combat_deaths',
  'military.killed_in_action',
  'military.deaths_unspecified',
]

export function DetailFacts({
  event,
  onPatch,
  contemporaryLink,
  onCountryClick,
  foldedCount,
  onJump,
  onAddOriginalTitle,
  relatedCount = 0,
  departmentCount = 0,
}: DetailFactsProps) {
  const jumpTo = (anchorId: string) => (onJump ? onJump(anchorId) : scrollToAnchor(anchorId))
  /**
   * 휴대폰 폭에선 사실 행을 접어 둔다 — 결과·진영 같은 긴 문장이 펼쳐진 채 탭 위에 서서 크림 전쟁은 장부만 439px,
   * 탭이 1,082px까지 밀렸다. 연도·날짜·위치·수장 링크는 그대로 두고 행만 '사실 N개 보기'로 연다(넓은 폭은 무관).
   */
  const [factsOpen, setFactsOpen] = useState(false)
  /** 위치 — 글(이름·설명)과 지도 핀(대표 한 점). 핀은 위도·경도가 짝으로 있을 때만 */
  const [locationModalOpen, setLocationModalOpen] = useState(false)
  const locationText = event.location?.trim() ?? ''
  const locationPoint: LatLng | null =
    event.locationLatitude != null && event.locationLongitude != null
      ? { lat: Number(event.locationLatitude), lng: Number(event.locationLongitude) }
      : null
  /** 묶음 — 하위에 꽂힌 핀 수(조망 응답, 전개·조망과 같은 캐시). 자기 위치가 없을 때 '하위 N곳 · 지도'로 */
  const isCollection = event.kind === 'COLLECTION'
  const { data: overview } = useQuery({
    queryKey: eventKeys.overview(event.id),
    queryFn: () => getEventOverview(event.id),
    enabled: isCollection && !locationText && !locationPoint,
    staleTime: 30_000,
  })
  const childPinCount =
    overview?.descendants.filter((node) => node.locationLatitude != null && node.locationLongitude != null).length ?? 0
  const rowsRef = useRef<HTMLDivElement>(null)
  const [rowCount, setRowCount] = useState(0)
  useEffect(() => {
    setRowCount(rowsRef.current?.childElementCount ?? 0)
  })
  /**
   * 댓글 — 긴 사건에선 개요 맨 끝(일본 최초 철도: 2만 px 아래)이라 있는지조차 안 보였다. 수를 장부에 두고
   * 누르면 내려간다. 하위 사건은 자체 댓글이 없어(상위 스레드로 이어진다) 줄을 세우지 않는다.
   * 쿼리 키가 댓글 섹션과 같아 한 번만 받는다.
   */
  const hasOwnComments = !event.parentEvent
  const { data: comments } = useQuery({ ...commentsQueryOptions('EVENT', event.id), enabled: hasOwnComments })
  const commentCount = comments?.length ?? 0
  const year = parseIsoDateParts(event.startDate ?? null)?.year ?? null
  const duration = durationLabel(
    event.startDate,
    event.endDate,
    event.startDatePrecision,
    event.endDatePrecision,
  )

  const military = event.militaryEvent
  const outcome = military?.militaryDetails?.outcome?.trim() || null
  const sides = event.sides ?? []
  /* 진영 — 결과가 있으면 이름 뒤에: '프로이센 측(승리) 대 오스트리아 측(패배)' */
  const sideNames = sides
    .filter((side) => side.name.trim())
    .map((side) => (side.outcome ? `${side.name.trim()}(${SIDE_OUTCOME_LABEL[side.outcome]})` : side.name.trim()))
  /*
   * 이름을 안 지은 진영 — 진영을 붙이면 '진영 1·진영 2…'로 시작한다(실DB 104행 중 5행이 그대로). 다 그런 사건은
   * '진영 1 대 진영 2 대 진영 3 대 진영 4'가 사실처럼 섰다(프랑스 혁명). 이때는 수와 '이름 짓기'로 대신한다.
   */
  const unnamedSides = sides.length >= 2 && sides.every((side) => isPlaceholderSideName(side.name))
  /*
   * 사상자 — 측정값(D3)에서 진영마다 한 줄. 정의가 다른 지표를 섞지 않도록 우선순위대로 하나만 고른다.
   * (군 손실 합계 → 총사망 → 전투 사망 → 전사 → 정의 미상 사망)
   */
  const { data: observations = [] } = useQuery(eventObservationsQueryOptions(event.id))
  const casualties = sides
    .map((side) => {
      const own = observations.filter(
        (observation) => observation.subjectType === 'EVENT_SIDE' && observation.subjectId === side.id,
      )
      for (const key of CASUALTY_METRIC_PRIORITY) {
        /* 같은 지표에 추정치가 여럿이면 채택값 — 없으면 첫 값 */
        const candidates = own.filter((observation) => observation.metric.key === key)
        const hit = representativeOf(candidates) ?? candidates[0]
        if (hit) return `${side.name} — ${hit.metric.name} ${formatObservationValue(hit)}`
      }
      return null
    })
    .filter((line): line is string => Boolean(line))

  const roleGroups = groupCountriesByRole(
    [
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
    ],
    event.type,
  )

  const heroShowsAll = heroCardsShowAllCountries(
    [...(event.relatedCountries ?? []), ...(event.relatedHistoricalCountries ?? [])],
    sides,
  )

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
      <OriginalDateSlot>
        <OriginalDateLine event={event} onPatch={onPatch} />
      </OriginalDateSlot>

      {/*
        * 위치 — 비어 있으면 '위치 추가'가 지도 모달을 연다. 글이 있으면 글은 그 자리에서 고치고,
        * 옆 '지도'로 핀을 꽂거나 옮긴다. 핀이 있으면 'Google 지도'로 바로 확인.
        */}
      {locationText || locationPoint ? (
        <LocationLine title={locationText} data-filled="true">
          <PinIcon aria-hidden data-pinned={locationPoint ? 'true' : undefined}>
            <FiMapPin />
          </PinIcon>
          <LocationText>
            {locationText ? (
              <InlineText
                value={event.location ?? ''}
                /* 비우면 빈 문자열을 보내 컬럼을 비운다(`|| undefined`는 서버가 무시). */
                onSave={(next) => onPatch({ location: next.trim() })}
                placeholder="위치 이름"
                label="위치"
              />
            ) : (
              <span>{formatCoordinate(locationPoint as LatLng)}</span>
            )}
            {/* 위치 메모 — 장소 이름과 따로, 작게(두 줄까지, 전체는 마우스를 올리면) */}
            {event.locationNote?.trim() && (
              <LocationNote title={event.locationNote}>{event.locationNote}</LocationNote>
            )}
            <LocationActions>
              <LocationMapButton
                type="button"
                onClick={() => setLocationModalOpen(true)}
                aria-label={locationPoint ? '지도에서 위치 핀 보기·옮기기' : '지도에 위치 핀 꽂기'}
              >
                {locationPoint ? '지도' : '지도에 찍기'}
              </LocationMapButton>
              {locationPoint && (
                <LocationExternal href={googleMapsUrl(locationPoint)} target="_blank" rel="noreferrer">
                  Google 지도
                </LocationExternal>
              )}
            </LocationActions>
          </LocationText>
        </LocationLine>
      ) : childPinCount > 0 ? (
        /* 묶음은 대개 자기 위치가 없다(프랑스 혁명) — 그 자리에 하위 핀을 모은 지도로 가는 길. 자기 위치는 옆 '+' */
        <ChildMapLine>
          <ChildMapLink to={{ search: '?tab=survey&sv=map' }}>
            <FiMapPin aria-hidden /> 하위 {childPinCount}곳 · 지도 보기
          </ChildMapLink>
          <AddLine type="button" onClick={() => setLocationModalOpen(true)} title="이 사건 자체의 위치">
            + 이 사건 위치
          </AddLine>
        </ChildMapLine>
      ) : (
        <AddLine type="button" onClick={() => setLocationModalOpen(true)}>
          <FiMapPin aria-hidden /> 위치 추가
        </AddLine>
      )}
      {/* 핀을 꽂은 보람이 보이게 — 작은 지도, 누르면 큰 지도(위치 모달) */}
      {locationPoint && (
        <MiniMapButton
          type="button"
          onClick={() => setLocationModalOpen(true)}
          aria-label={`${locationText || '위치'} — 큰 지도로 보기·핀 옮기기`}
          title="큰 지도로 보기·핀 옮기기"
        >
          <Suspense fallback={<MiniMapLoading />}>
            <LocationPreviewMap point={locationPoint} height={140} />
          </Suspense>
        </MiniMapButton>
      )}
      {locationModalOpen && (
        <LocationPickerModal
          isOpen
          onClose={() => setLocationModalOpen(false)}
          initial={{
            location: event.location,
            latitude: locationPoint?.lat ?? null,
            longitude: locationPoint?.lng ?? null,
            note: event.locationNote ?? null,
          }}
          onSave={(value) => {
            onPatch(value as UpdateEventDto)
            setLocationModalOpen(false)
          }}
        />
      )}

      {onAddOriginalTitle && !event.originalTitle?.trim() && (
        <AddLine type="button" onClick={onAddOriginalTitle}>
          + 원어 사건명
        </AddLine>
      )}

      {contemporaryLink}

      {rowCount > 0 && (
        <FactsToggle
          type="button"
          aria-expanded={factsOpen}
          aria-controls="event-facts-rows"
          onClick={() => setFactsOpen((open) => !open)}
        >
          {factsOpen ? '사실 접기' : `사실 ${rowCount}개 보기`}
        </FactsToggle>
      )}

      <Rows ref={rowsRef} id="event-facts-rows" data-open={factsOpen || undefined}>
        {duration && <FactRow label="기간">{duration}</FactRow>}
        {outcome && (
          <FactRow label="결과" wide>
            <ClampedText title={outcome}>{outcome}</ClampedText>
          </FactRow>
        )}
        {unnamedSides ? (
          <FactRow label="진영">
            <JumpButton type="button" onClick={() => jumpTo('module-sides')} title="진영 이름이 아직 기본값입니다">
              {sides.length}개 · 이름 짓기
            </JumpButton>
          </FactRow>
        ) : (
          sideNames.length >= 2 && (
            <FactRow label="진영" wide>
              {sideNames.join(' 대 ')}
            </FactRow>
          )
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

        {/* 배역이 하나뿐이면(전원 '참여국') 히어로의 나라 줄과 같은 목록이다 — 편이 갈릴 때만 세운다 */}
        {/* 히어로 카드가 나라를 다 보여 주면 같은 목록의 반복이다 — 카드가 '+N개국'으로 접힐 때만 장부가 전체를 든다 */}
        {roleGroups.length > 1 && !heroShowsAll && roleGroups.map((group) => {
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
        {relatedCount > 0 && (
          <FactRow label="관련 사건">
            <JumpButton type="button" onClick={() => jumpTo('network')}>
              {relatedCount}건
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
        {(event.organizations?.length ?? 0) + departmentCount > 0 && (
          <FactRow label="기관·조직">
            <JumpButton
              type="button"
              onClick={() =>
                jumpTo(
                  (event.organizations?.length ?? 0) > 0
                    ? 'organizations'
                    : 'departments',
                )
              }
            >
              {(event.organizations?.length ?? 0) + departmentCount}곳
            </JumpButton>
          </FactRow>
        )}
        {hasOwnComments && (
          <FactRow label="댓글">
            <JumpButton type="button" onClick={() => jumpTo('comments')}>
              {commentCount > 0 ? `${commentCount}개` : '남기기'}
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

  /**
   * 한 열 배치 — 이 패널은 히어로와 탭 사이에 끼어 **첫 화면을 탭 앞에서 막는다**(1280px에서
   * 탭이 y≈750). 세로 장부를 가로 띠로 눕힌다: 위치·동시대 비교·빈 항목 안내가 한 줄,
   * 그 아래 사실 띠 한 줄. 2열(옆 칼럼)일 때는 세로 장부 그대로다.
   */
  @container eventdetail (max-width: 919px) {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    column-gap: 20px;
    row-gap: 4px;
  }
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

  /* 한 열에서는 히어로 날짜 줄이 연도를 이미 말한다 */
  @container eventdetail (max-width: 919px) {
    display: none;
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

  /* 한 줄에서 위치는 남는 폭을 다 쓰되, 값이 길면 줄어 말줄임으로 */
  @container eventdetail (max-width: 919px) {
    flex: 0 1 auto;
  }

  /* 빈 위치는 '값'이 아니라 **추가 동작**으로 읽혀야 한다 — 기울임 '위치'가 핀 아이콘 옆에 서 있으면
     장소가 '위치'인 것처럼 보였다. 정체·아이콘 모두 한 단 물린다. */
  &:not([data-filled]) {
    opacity: 0.7;

    [data-empty='true'] {
      font-style: normal;
    }
  }

  [data-edit-host] > span:first-child {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    @container eventdetail (max-width: 639px) {
      -webkit-line-clamp: 1;
    }
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
/** 원 사료 날짜 — 날짜 줄과 함께 한 열 배치에선 숨는다(그 폭의 날짜는 히어로가 든다) */
const OriginalDateSlot = styled.div`
  display: flex;
  flex-direction: column;
  @container eventdetail (max-width: 919px) {
    display: none;
  }
`

const DateLine = styled(EditableLine)`
  font-variant-numeric: tabular-nums;

  /* 한 열 배치에서는 날짜를 히어로(제목 밑)가 든다 — 같은 값이 두 번 서지 않게 */
  @container eventdetail (max-width: 919px) {
    display: none;
  }
`

const PinIcon = styled.span`
  display: inline-flex;
  flex-shrink: 0;
  color: ${metaText};

  /* 지도에 찍힌 위치 — 핀이 강조색으로 선다 */
  &[data-pinned='true'] {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }

  svg {
    width: 12px;
    height: 12px;
  }
`

const LocationNote = styled.span`
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.5;
  color: ${metaText};

  /* 휴대폰 폭 — 탭 위 자리를 아낀다. 메모는 마우스 올림(title)·'지도' 모달이 든다 */
  @container eventdetail (max-width: 639px) {
    display: none;
  }
`

const ChildMapLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px 12px;
`

const ChildMapLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  text-decoration: none;

  svg {
    width: 13px;
    height: 13px;
  }
  &:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

/** 작은 위치 지도 — 장부 칼럼 폭 그대로, 누르는 자리 전체 */
const MiniMapButton = styled.button`
  display: block;
  width: 100%;
  margin: 2px 0 4px;
  padding: 0;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${RADIUS.MD};
  background: transparent;
  cursor: zoom-in;
  /* leaflet 내부 z-index(400~)가 sticky 칼럼 위로 뜨지 않게 이 상자 안에 가둔다 */
  isolation: isolate;

  /* 한 열 배치에선 장부가 탭 위에 끼므로 140px 지도가 본문을 첫 화면 밖으로 민다 — '지도' 버튼이 같은 모달을 연다 */
  @container eventdetail (max-width: 919px) {
    display: none;
  }

  &:hover,
  &:focus-visible {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
`

const MiniMapLoading = styled.div`
  height: 140px;
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)')};
`

const LocationText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const LocationActions = styled.span`
  display: inline-flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 12px;
`

const LocationMapButton = styled.button`
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  font-weight: 600;
  color: ${metaText};
  cursor: pointer;

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.colors.text.primary};
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

const LocationExternal = styled.a`
  font-weight: 600;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
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
  grid-template-columns: minmax(0, 1fr);
  margin-top: 12px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};

  &:empty {
    display: none;
  }

  /**
   * 한 열 배치 = **사실 띠**. 칸마다 라벨 위·값 아래로 세워 왼쪽부터 흘린다 —
   * 예전엔 표(라벨 64px 열)를 여러 열 격자에 얹었는데, 이름 값(wide)이 줄을 통째로 끊어
   * 짧은 사실(기간·하위 사건)까지 한 줄에 하나씩 떨어졌다(3행 × 34px, 오른쪽 2/3 공백).
   */
  @container eventdetail (max-width: 639px) {
    &:not([data-open]) {
      display: none;
    }
  }

  @container eventdetail (max-width: 919px) {
    order: 10;
    flex-basis: 100%;
    display: flex;
    flex-wrap: wrap;
    gap: 10px 32px;
    margin-top: 8px;
    padding: 10px 0;
    border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  }
`

const Row = styled.div<{ $wide: boolean }>`
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
  align-items: baseline;
  gap: 10px;
  padding: 7px 0;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};

  @container eventdetail (max-width: 919px) {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 0;
    border-bottom: none;
    /* 칸은 제 폭만 — 늘리면 뒤 칸이 오른쪽 끝으로 밀려 띠가 끊겨 보인다. 긴 이름 목록은 줄어 줄바꿈. */
    flex: ${({ $wide }) => ($wide ? '0 1 auto' : '0 0 auto')};
    min-width: 0;
    max-width: 100%;
  }
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
/** 비어 있는 값의 추가 동작 — 위치 줄의 빈 상태('위치 추가')와 같은 무게 */
const AddLine = styled.button`
  align-self: flex-start;
  padding: 2px 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 13px;
  color: ${metaText};
  opacity: 0.85;
  cursor: pointer;

  &:hover {
    opacity: 1;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  &:focus-visible {
    opacity: 1;
    outline: 2px solid currentColor;
    outline-offset: 2px;
    border-radius: 2px;
  }
`

/** 휴대폰 폭에서만 보이는 사실 행 열기 — 넓은 폭에선 행이 늘 펼쳐져 있어 숨긴다 */
const FactsToggle = styled.button`
  display: none;
  padding: 2px 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: ${metaText};
  cursor: pointer;

  @container eventdetail (max-width: 639px) {
    display: inline-flex;
    order: 9;
  }
  &:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  &:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
    border-radius: 2px;
  }
`

const FoldedNote = styled.button`
  align-self: flex-start;
  margin-top: 6px;

  /* 한 줄에서는 위치 줄의 오른쪽 끝 — 띠 아래 한 줄을 따로 먹지 않게 */
  @container eventdetail (max-width: 919px) {
    align-self: center;
    margin-top: 0;
    margin-left: auto;
  }

  /* 휴대폰 폭에선 위치 줄 옆에 안 들어가 한 줄을 따로 먹었다 — 같은 버튼이 개요 끝 '더 채울 수 있는 것'에 있다 */
  @container eventdetail (max-width: 639px) {
    display: none;
  }

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
