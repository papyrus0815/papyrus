/**
 * 국가 정보 인라인 모달 — 엔티티 지면(사건 관련국 등)에서 국가를 클릭했을 때
 * 페이지 이동 없이 요약을 보여주는 읽기전용 퀵뷰.
 *
 * 구조는 LeaderQuickView 패턴을 따른다:
 * - target(엔티티)=열림상태 — `isOpen={!!target}`
 * - 헤더는 클릭 지점에서 이미 아는 이름(`target.name`)으로 즉시 그리고, 본문만 lazy 조회
 * - 푸터 '국가 상세로 이동'은 onClose() 후 순차 핸드오프
 *
 * 국가 상세는 8~13탭 페이지 규모라 전체 임베드 대신 요약+딥링크가 정답.
 * 데이터는 entities 레이어 단건 훅만 사용한다 — features 레이어의 중복 훅은
 * 쿼리키가 달라(['countries','detail',id]) 같은 데이터를 이중 fetch하므로 금지.
 *
 * 단건 GET은 계정(소유자) 스코프라 타 계정 소유 국가는 403/404가 난다 — 이때는
 * 상세 페이지 이동도 동일하게 실패하므로 안내 문구와 함께 CTA를 비활성화한다.
 */
import { useEffect, useMemo, useRef, type MouseEvent } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiArrowRight } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled, { css } from 'styled-components'

import { useCountry } from '@/entities/country/api'
import { useHistoricalCountry } from '@/entities/historical-country/api'
import { eventKeys } from '@/shared/api/event-query-keys'
import { ethnicityApi } from '@/shared/api/ethnicity'
import { getCountryStatehoodEvents, type StatehoodEvent } from '@/shared/api/events'
import {
  getHistoricalCountryFoundingSummary,
  type FirstRuler,
  type FoundingLinkedCountry,
  type StatehoodAgent,
} from '@/shared/api/historical-countries'
import { getUploadImageUrl } from '@/shared/api/upload'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import {
  getEntityKindLabel,
  getStateTypeLabel,
} from '@/entities/historical-country/lib/utils'
import {
  formatCountryPeriod,
  formatCountryYearShort,
  getCountryDurationYears,
  getCountryYearRange,
} from '@/shared/lib/country-period'
import { pathKeys } from '@/shared/router'
import { Modal, ModalBody, ModalFooter } from '@/shared/ui/modal'

import { CountryFlag } from '../shared'

export interface CountryInlineModalTarget {
  id: string
  /** 현대 국가(Country) / 역사 국가(HistoricalCountry) — 조회 엔드포인트가 갈린다. */
  kind: 'modern' | 'historical'
  /** 클릭 지점에서 이미 아는 이름 — 로딩 중에도 헤더를 즉시 그린다. */
  name?: string
  /**
   * 어느 끝에서 열었나 — 사건 목록의 건국·멸망 표지. 그 절을 앞에 세우고 강조한다.
   * 칩으로 다른 나라로 옮기면 비운다(그 나라엔 이 맥락이 없다).
   */
  focus?: 'founding' | 'dissolution'
}

interface CountryInlineModalProps {
  /** 열려 있는 국가. null이면 모달 닫힘 (엔티티=열림상태 패턴). */
  target: CountryInlineModalTarget | null
  onClose: () => void
  /**
   * 모달 안에서 다른 국가로 전환(이웃 칩·역사적 전신 칩 클릭).
   * 미지정 시 전환 칩을 클릭 불가한 정적 표기로 렌더한다.
   */
  onSwitch?: (target: CountryInlineModalTarget) => void
  /** '국가 상세로 이동' — 미지정 시 countryDetail 라우트로 navigate. */
  onNavigateDetail?: (target: CountryInlineModalTarget) => void
  /** 같은 맥락의 이웃 국가(예: 이 사건의 다른 관련국). 현재 국가·중복은 내부에서 걸러진다. */
  peers?: CountryInlineModalTarget[]
  /** 이웃 칩 스트립 라벨 (기본 '다른 국가') */
  peersLabel?: string
}

/**
 * 엔티티 링크 클릭을 모달로 가로챌지 판정. 수정자 키(cmd/ctrl/shift/alt)·비주클릭은
 * 브라우저 기본 동작(새 탭 등)을 보존해야 하므로 가로채지 않는다.
 * 호출부: `if (!shouldInterceptEntityClick(e)) return; e.preventDefault(); …`
 */
export function shouldInterceptEntityClick(
  clickEvent: MouseEvent<HTMLElement>,
): boolean {
  return (
    clickEvent.button === 0 &&
    !clickEvent.metaKey &&
    !clickEvent.ctrlKey &&
    !clickEvent.shiftKey &&
    !clickEvent.altKey
  )
}

/** 리치 텍스트(HTML)·마크다운 조각을 한 문단 평문으로 — 모달은 발췌만 보여 준다 */
function toPlainExcerpt(html: string | null | undefined): string | null {
  if (!html) return null
  const text = html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|li|h\d|div)>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[#*_`>]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text || null
}

const signedYear = (era: string | null | undefined, year: number | null | undefined) =>
  year == null ? null : era === 'BC' ? -year : year

const RULER_FALLBACK_TITLE: Record<FirstRuler['kind'], string> = {
  monarch: '군주',
  headOfState: '국가원수',
  headOfGovernment: '정부수반',
}

/** 계승 관계 유형 — 개요 탭 건국·멸망 카드와 같은 말 */
const TRANSITION_LABEL: Record<string, string> = {
  FOUNDED: '건국',
  CONQUEST: '정복',
  TREATY: '조약',
  INDEPENDENCE: '독립',
  UNIFICATION: '통일',
  UNION: '합병',
  DISSOLVED: '멸망',
  SUCCESSION: '계승',
  SPLIT: '분열',
  OTHER: '기타',
}

function rulerSpan(ruler: FirstRuler): string {
  const start = formatCountryYearShort(signedYear(ruler.startEra, ruler.startYear))
  const end = formatCountryYearShort(signedYear(ruler.endEra, ruler.endYear))
  if (!start) return ''
  if (end === start) return start
  return `${start}–${end ?? ''}`
}

function linkedSpan(country: FoundingLinkedCountry): string {
  const start = formatCountryYearShort(signedYear(country.startEra, country.startYear))
  const end = formatCountryYearShort(signedYear(country.endEra, country.endYear))
  if (!start) return ''
  return `${start}–${end ?? ''}`
}

function statehoodEventYear(event: StatehoodEvent): string | null {
  if (event.startYear != null) {
    return formatCountryYearShort(signedYear(event.startEra, event.startYear))
  }
  if (!event.startDate) return null
  const year = Number.parseInt(event.startDate.slice(0, 4), 10)
  return Number.isFinite(year) ? formatCountryYearShort(year) : null
}

/** 인구 값(문자열 BigInt 직렬화 | 숫자)을 천 단위 구분 표기로. 비수치면 원문 유지. */
function formatPopulation(
  value: string | number | null | undefined,
): string | null {
  if (value == null || value === '') return null
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric)
    ? `${numeric.toLocaleString('ko-KR')}명`
    : String(value)
}

export function CountryInlineModal({
  target,
  onClose,
  onSwitch,
  onNavigateDetail,
  peers = [],
  peersLabel = '다른 국가',
}: CountryInlineModalProps) {
  const navigate = useNavigate()

  // 두 훅 모두 항상 호출(훅 규칙) — enabled(!!id) 게이팅으로 kind에 맞는 쪽만 fetch.
  const modernQuery = useCountry(target?.kind === 'modern' ? target.id : '')
  const historicalQuery = useHistoricalCountry(
    target?.kind === 'historical' ? target.id : '',
  )

  const isHistorical = target?.kind === 'historical'
  const activeQuery = isHistorical ? historicalQuery : modernQuery
  const modern = target?.kind === 'modern' ? modernQuery.data : undefined
  const historical = isHistorical ? historicalQuery.data : undefined

  const errorStatus = (activeQuery.error as { status?: number } | null)?.status

  /* 건국 요약 — 초대 통치자·건국 배경 한 줄(개요 탭 건국 카드와 같은 캐시 키) */
  const foundingQuery = useQuery({
    queryKey: ['historical-countries', target?.id ?? '', 'founding-summary'],
    queryFn: () => getHistoricalCountryFoundingSummary(target!.id),
    enabled: isHistorical && !!target?.id,
    staleTime: 60_000,
  })
  /* 건국·멸망 사건 — 참여국 역할로 이 나라를 건 사건(개요 탭 카드와 같은 캐시 키) */
  const statehoodQuery = useQuery({
    queryKey: eventKeys.statehood({ historicalCountryId: target?.id ?? '' }),
    queryFn: () => getCountryStatehoodEvents({ historicalCountryId: target!.id }),
    enabled: isHistorical && !!target?.id,
    staleTime: 60_000,
  })
  /* 구성 민족 — 국가 상세 '민족' 섹션이 편집한다(그쪽은 캐시를 안 써 열 때마다 새로 받는다) */
  const ethnicityQuery = useQuery({
    queryKey: ['ethnicities', { historicalCountryId: target?.id ?? '' }],
    queryFn: () => ethnicityApi.getAll({ historicalCountryId: target!.id }),
    enabled: isHistorical && !!target?.id,
  })
  const summary = foundingQuery.data
  const foundingExcerpt = useMemo(
    () => toPlainExcerpt(summary?.foundingNote),
    [summary?.foundingNote],
  )
  const dissolutionExcerpt = useMemo(
    () => toPlainExcerpt(summary?.dissolutionNote),
    [summary?.dissolutionNote],
  )
  const descriptionExcerpt = useMemo(
    () => toPlainExcerpt(historicalQuery.data?.description),
    [historicalQuery.data?.description],
  )
  const nameOriginExcerpt = useMemo(
    () => toPlainExcerpt(historicalQuery.data?.nameOrigin),
    [historicalQuery.data?.nameOrigin],
  )

  /**
   * 열린 채 다른 국가로 전환하면 클릭했던 칩이 unmount되며 포커스가 body로
   * 떨어진다 — useModalBehavior는 keydown을 모달 root에만 바인딩하므로(중첩
   * 모달 대응) 그대로 두면 Esc·포커스트랩이 무력화된다. 전환 감지 시 dialog
   * root(tabIndex=-1)로 재포커스해 트랩을 복구하고 SR에 새 문맥 낭독도 유도.
   * 최초 열림은 Modal autoFocus가 처리하므로 건드리지 않는다.
   */
  const bodyRef = useRef<HTMLDivElement>(null)
  const previousTargetKeyRef = useRef<string | null>(null)
  useEffect(() => {
    const targetKey = target ? `${target.kind}:${target.id}` : null
    const previousKey = previousTargetKeyRef.current
    previousTargetKeyRef.current = targetKey
    if (!targetKey || !previousKey || previousKey === targetKey) return
    const dialogRoot = bodyRef.current?.closest<HTMLElement>('[role="dialog"]')
    if (dialogRoot && !dialogRoot.contains(document.activeElement)) {
      dialogRoot.focus({ preventScroll: true })
    }
  }, [target])

  const displayName =
    (isHistorical ? historical?.name : modern?.name) ?? target?.name ?? '국가'
  const kindLabel = isHistorical ? '역사 국가' : '현대 국가'
  const subtitleExtra = isHistorical
    ? historical?.enName
    : modern?.fullName || modern?.localName
  const subtitle = subtitleExtra ? `${kindLabel} · ${subtitleExtra}` : kindLabel

  // 이웃 칩 — 현재 국가 제외 + (kind,id) 중복 제거(관계행 @@unique 부재 방어).
  const peerChips = useMemo(() => {
    if (!target) return []
    const seen = new Set<string>()
    return peers.filter((peer) => {
      if (peer.id === target.id) return false
      const peerKey = `${peer.kind}:${peer.id}`
      if (seen.has(peerKey)) return false
      seen.add(peerKey)
      return true
    })
  }, [peers, target])

  const handleNavigateDetail = () => {
    if (!target || activeQuery.isError) return
    const snapshot = target
    onClose()
    if (onNavigateDetail) {
      onNavigateDetail(snapshot)
      return
    }
    navigate(pathKeys.countryDetail(snapshot.id))
  }

  const historicalPeriod = historical
    ? formatCountryPeriod(historical)
    : ''
  const historicalDuration = historical
    ? getCountryDurationYears(historical)
    : null
  const historicalRange = historical ? getCountryYearRange(historical) : null
  // 정권·시대는 '건국·멸망'이 아니라 '성립·종료'(표지 동사와 같은 규칙)
  const isSovereignState = !historical?.entityKind || historical.entityKind === 'STATE'
  const foundingWord = isSovereignState ? '건국' : '성립'
  const dissolutionWord = isSovereignState ? '멸망' : '종료'
  const hasEnded = historicalRange?.end != null

  const switchToHistorical = (country: { id: string; name: string }) =>
    onSwitch?.({ id: country.id, kind: 'historical', name: country.name })

  const handleOpenEvent = (eventId: string) => {
    onClose()
    navigate(pathKeys.events.detail(eventId))
  }

  const renderRulers = (rulers: FirstRuler[]) => (
    <RulerStack>
      {rulers.map((ruler) => {
        const span = rulerSpan(ruler)
        return (
          <li key={ruler.recordId}>
            <MetaAside>{ruler.title || RULER_FALLBACK_TITLE[ruler.kind]} </MetaAside>
            {ruler.regnalName?.trim() || getPersonDisplayName(ruler.person, true)}
            {span && <MetaAside> · {span}</MetaAside>}
            {ruler.basis === 'earliest' && <MetaAside> (가장 이른 기록)</MetaAside>}
          </li>
        )
      })}
    </RulerStack>
  )

  /** 세운 쪽·멸망시킨 쪽 — 역사 국가 주체는 모달 안에서 그 나라로 옮겨 간다 */
  const renderAgents = (agents: StatehoodAgent[]) => (
    <RulerStack>
      {agents.map((agent) => {
        const label =
          // Person.regnalName은 오염 필드라 쓰지 않는다
          agent.kind === 'person' && agent.person
            ? getPersonDisplayName(agent.person, true) || agent.name
            : agent.name
        return (
          <li key={agent.id}>
            {agent.kind === 'historicalCountry' && agent.refId && onSwitch ? (
              <InlineLinkButton
                type="button"
                onClick={() => switchToHistorical({ id: agent.refId!, name: agent.name })}
              >
                {label}
              </InlineLinkButton>
            ) : (
              label
            )}
            {agent.note && <MetaAside> · {agent.note}</MetaAside>}
          </li>
        )
      })}
    </RulerStack>
  )

  const renderEvents = (events: StatehoodEvent[]) => (
    <RulerStack>
      {events.map((event) => {
        const yearText = statehoodEventYear(event)
        return (
          <li key={event.id}>
            <InlineLinkButton type="button" onClick={() => handleOpenEvent(event.id)}>
              {event.title}
            </InlineLinkButton>
            {yearText && <MetaAside> · {yearText}</MetaAside>}
          </li>
        )
      })}
    </RulerStack>
  )

  const renderLinked = (linked: FoundingLinkedCountry[]) => (
    <ChipRow>
      {linked.map((country) => {
        const span = linkedSpan(country)
        const chipBody = (
          <>
            <ChipName $italic>{country.name}</ChipName>
            <ChipPeriod>
              {[TRANSITION_LABEL[country.eventType] ?? country.eventType, span]
                .filter(Boolean)
                .join(' · ')}
            </ChipPeriod>
          </>
        )
        return onSwitch ? (
          <ChipButton
            key={`${country.id}-${country.eventType}`}
            type="button"
            onClick={() => switchToHistorical(country)}
          >
            {chipBody}
          </ChipButton>
        ) : (
          <ChipStatic key={`${country.id}-${country.eventType}`}>{chipBody}</ChipStatic>
        )
      })}
    </ChipRow>
  )

  const foundingEvents = statehoodQuery.data?.founded ?? []
  const dissolutionEvents = statehoodQuery.data?.dissolved ?? []
  const founders = summary?.founders ?? []
  const dissolvers = summary?.dissolvers ?? []
  const firstRulers = summary?.firstRulers ?? []
  const lastRulers = summary?.lastRulers ?? []
  const predecessorLinks = summary?.predecessors ?? []
  const successorLinks = summary?.successors ?? []

  const foundingSection = historical ? (
    <EndSection key="founding" $focused={target?.focus === 'founding'}>
      <EndSectionHead>
        <span>{foundingWord}</span>
        {historicalRange?.start != null && (
          <EndSectionYear>{formatCountryYearShort(historicalRange.start)}</EndSectionYear>
        )}
      </EndSectionHead>
      {founders.length > 0 ||
      firstRulers.length > 0 ||
      foundingEvents.length > 0 ||
      predecessorLinks.length > 0 ||
      foundingExcerpt ? (
        <MetaGrid>
          {founders.length > 0 && (
            <>
              <MetaLabel>{isSovereignState ? '건국자' : '세운 쪽'}</MetaLabel>
              <MetaValue>{renderAgents(founders)}</MetaValue>
            </>
          )}
          {firstRulers.length > 0 && (
            <>
              <MetaLabel>초대</MetaLabel>
              <MetaValue>{renderRulers(firstRulers)}</MetaValue>
            </>
          )}
          {foundingEvents.length > 0 && (
            <>
              <MetaLabel>{foundingWord} 사건</MetaLabel>
              <MetaValue>{renderEvents(foundingEvents)}</MetaValue>
            </>
          )}
          {predecessorLinks.length > 0 && (
            <>
              <MetaLabel>전신</MetaLabel>
              <MetaValue>{renderLinked(predecessorLinks)}</MetaValue>
            </>
          )}
          {foundingExcerpt && (
            <>
              <MetaLabel>배경</MetaLabel>
              <NoteExcerpt title={foundingExcerpt}>{foundingExcerpt}</NoteExcerpt>
            </>
          )}
        </MetaGrid>
      ) : (
        <Muted>
          {foundingQuery.isLoading ? '불러오는 중…' : `${foundingWord}에 관한 기록이 아직 없습니다.`}
        </Muted>
      )}
    </EndSection>
  ) : null

  const dissolutionSection =
    historical && hasEnded ? (
      <EndSection key="dissolution" $focused={target?.focus === 'dissolution'}>
        <EndSectionHead>
          <span>{dissolutionWord}</span>
          {historicalRange?.end != null && (
            <EndSectionYear>{formatCountryYearShort(historicalRange.end)}</EndSectionYear>
          )}
        </EndSectionHead>
        {dissolvers.length > 0 ||
        lastRulers.length > 0 ||
        dissolutionEvents.length > 0 ||
        successorLinks.length > 0 ||
        dissolutionExcerpt ? (
          <MetaGrid>
            {dissolvers.length > 0 && (
              <>
                <MetaLabel>{isSovereignState ? '멸망시킨 쪽' : '끝낸 쪽'}</MetaLabel>
                <MetaValue>{renderAgents(dissolvers)}</MetaValue>
              </>
            )}
            {lastRulers.length > 0 && (
              <>
                <MetaLabel>마지막</MetaLabel>
                <MetaValue>{renderRulers(lastRulers)}</MetaValue>
              </>
            )}
            {dissolutionEvents.length > 0 && (
              <>
                <MetaLabel>{dissolutionWord} 사건</MetaLabel>
                <MetaValue>{renderEvents(dissolutionEvents)}</MetaValue>
              </>
            )}
            {successorLinks.length > 0 && (
              <>
                <MetaLabel>후신</MetaLabel>
                <MetaValue>{renderLinked(successorLinks)}</MetaValue>
              </>
            )}
            {dissolutionExcerpt && (
              <>
                <MetaLabel>배경</MetaLabel>
                <NoteExcerpt title={dissolutionExcerpt}>
                  {dissolutionExcerpt}
                </NoteExcerpt>
              </>
            )}
          </MetaGrid>
        ) : (
          <Muted>
            {foundingQuery.isLoading
              ? '불러오는 중…'
              : `${dissolutionWord}에 관한 기록이 아직 없습니다.`}
          </Muted>
        )}
      </EndSection>
    ) : null

  // 멸망 표지에서 열었으면 멸망 절을 먼저 — 누른 쪽의 답이 첫 화면에 온다
  const endSections =
    target?.focus === 'dissolution'
      ? [dissolutionSection, foundingSection]
      : [foundingSection, dissolutionSection]

  // 서버 linkKind가 있으면 퀵뷰엔 직계 전신선만, 없으면(데이터 부족·구버전) 전체.
  const historicalAll = modern?.historicalCountries ?? []
  const historicalPredecessors = historicalAll.filter(
    (hc) => hc.linkKind === 'PREDECESSOR',
  )
  const predecessors =
    historicalPredecessors.length > 0 ? historicalPredecessors : historicalAll

  return (
    <Modal
      isOpen={!!target}
      onClose={onClose}
      title={
        <TitleRow>
          {isHistorical ? (
            <TitleEmoji aria-hidden>🏛️</TitleEmoji>
          ) : modern?.flagEmoji ? (
            <TitleEmoji aria-hidden>{modern.flagEmoji}</TitleEmoji>
          ) : modern?.thumbnailUrl ? (
            /* 장식 이미지 — 인접 텍스트가 같은 국가명을 담아 중복 낭독 방지 */
            <TitleFlagImage aria-hidden>
              <CountryFlag
                thumbnailUrl={modern.thumbnailUrl}
                countryName={displayName}
                size={22}
              />
            </TitleFlagImage>
          ) : null}
          <span>{displayName}</span>
        </TitleRow>
      }
      subtitle={subtitle}
    >
      <ModalBody ref={bodyRef}>
        {activeQuery.isLoading ? (
          <Muted>국가 정보를 불러오는 중…</Muted>
        ) : activeQuery.isError ? (
          <ErrorNote role="status">
            {errorStatus === 403
              ? '다른 계정 소유 국가라 상세 정보를 열 수 없습니다.'
              : errorStatus === 404
                ? '국가 정보를 찾을 수 없습니다 — 삭제되었거나 다른 계정 소유일 수 있습니다.'
                : '국가 정보를 불러오지 못했습니다.'}
          </ErrorNote>
        ) : isHistorical && historical ? (
          <>
            {(historical.thumbnailUrl || descriptionExcerpt) && (
              <Lead>
                {historical.thumbnailUrl && (
                  <LeadImage
                    src={getUploadImageUrl(historical.thumbnailUrl)}
                    alt=""
                    loading="lazy"
                  />
                )}
                {descriptionExcerpt && (
                  <LeadText title={descriptionExcerpt}>{descriptionExcerpt}</LeadText>
                )}
              </Lead>
            )}
            <MetaGrid>
              {historicalPeriod && (
                <>
                  <MetaLabel>존속 기간</MetaLabel>
                  <MetaValue>
                    {historicalPeriod}
                    {historicalDuration != null && (
                      <MetaAside> · {historicalDuration}년</MetaAside>
                    )}
                  </MetaValue>
                </>
              )}
              <MetaLabel>국가 형태</MetaLabel>
              <MetaValue>{getStateTypeLabel(historical.stateType)}</MetaValue>
              {historical.entityKind && (
                <>
                  <MetaLabel>정치체 성격</MetaLabel>
                  <MetaValue>
                    {getEntityKindLabel(historical.entityKind)}
                  </MetaValue>
                </>
              )}
              {(ethnicityQuery.data?.length ?? 0) > 0 && (
                <>
                  <MetaLabel>구성 민족</MetaLabel>
                  <MetaValue>
                    {ethnicityQuery.data!.map((ethnicity) => ethnicity.name).join(', ')}
                  </MetaValue>
                </>
              )}
              {nameOriginExcerpt && (
                <>
                  <MetaLabel>국호 유래</MetaLabel>
                  <NoteExcerpt title={nameOriginExcerpt}>{nameOriginExcerpt}</NoteExcerpt>
                </>
              )}
            </MetaGrid>
            {endSections}
          </>
        ) : modern ? (
          <>
            {modern.capital ||
            modern.population != null ||
            modern.areaSqKm != null ||
            modern.isoCode ? (
              <MetaGrid>
                {modern.capital && (
                  <>
                    <MetaLabel>수도</MetaLabel>
                    <MetaValue>{modern.capital}</MetaValue>
                  </>
                )}
                {formatPopulation(modern.population) && (
                  <>
                    <MetaLabel>인구</MetaLabel>
                    <MetaValue>{formatPopulation(modern.population)}</MetaValue>
                  </>
                )}
                {modern.areaSqKm != null && (
                  <>
                    <MetaLabel>면적</MetaLabel>
                    <MetaValue>
                      {modern.areaSqKm.toLocaleString('ko-KR')} km²
                    </MetaValue>
                  </>
                )}
                {modern.isoCode && (
                  <>
                    <MetaLabel>ISO 코드</MetaLabel>
                    <MetaValue>{modern.isoCode}</MetaValue>
                  </>
                )}
              </MetaGrid>
            ) : (
              <Muted>등록된 개요 정보가 없습니다.</Muted>
            )}

            {predecessors.length > 0 && (
              <ChipSection>
                <SectionLabel>관련 역사국가</SectionLabel>
                <ChipRow>
                  {predecessors.map((predecessor) => {
                    const periodText = formatCountryPeriod(predecessor, {
                      variant: 'short',
                    })
                    const chipBody = (
                      <>
                        <ChipName $italic>{predecessor.name}</ChipName>
                        {periodText && <ChipPeriod>{periodText}</ChipPeriod>}
                      </>
                    )
                    return onSwitch ? (
                      <ChipButton
                        key={predecessor.id}
                        type="button"
                        onClick={() =>
                          onSwitch({
                            id: predecessor.id,
                            kind: 'historical',
                            name: predecessor.name,
                          })
                        }
                      >
                        {chipBody}
                      </ChipButton>
                    ) : (
                      <ChipStatic key={predecessor.id}>{chipBody}</ChipStatic>
                    )
                  })}
                </ChipRow>
              </ChipSection>
            )}
          </>
        ) : null}

        {peerChips.length > 0 && (
          <ChipSection>
            <SectionLabel>{peersLabel}</SectionLabel>
            <ChipRow>
              {peerChips.map((peer) =>
                onSwitch ? (
                  <ChipButton
                    key={`${peer.kind}-${peer.id}`}
                    type="button"
                    onClick={() => onSwitch(peer)}
                  >
                    <ChipName $italic={peer.kind === 'historical'}>
                      {peer.name ?? '이름 없음'}
                    </ChipName>
                  </ChipButton>
                ) : (
                  <ChipStatic key={`${peer.kind}-${peer.id}`}>
                    <ChipName $italic={peer.kind === 'historical'}>
                      {peer.name ?? '이름 없음'}
                    </ChipName>
                  </ChipStatic>
                ),
              )}
            </ChipRow>
          </ChipSection>
        )}
      </ModalBody>
      <ModalFooter>
        <DetailButton
          type="button"
          onClick={handleNavigateDetail}
          disabled={activeQuery.isError}
          title={
            activeQuery.isError
              ? '이 국가는 상세 페이지도 열 수 없습니다'
              : undefined
          }
        >
          국가 상세로 이동
          <FiArrowRight size={13} aria-hidden />
        </DetailButton>
      </ModalFooter>
    </Modal>
  )
}

/* ───────────────────────── styles ───────────────────────── */

const TitleRow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`

const TitleEmoji = styled.span`
  font-size: 18px;
  line-height: 1;
  flex-shrink: 0;
`

const TitleFlagImage = styled.span`
  flex-shrink: 0;
  display: inline-flex;
  border-radius: 4px;
  overflow: hidden;
`

const Muted = styled.p`
  margin: 0;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ErrorNote = styled.p`
  margin: 0;
  font-size: 12.5px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.error};
`

const MetaGrid = styled.dl`
  display: grid;
  grid-template-columns: 88px 1fr;
  align-items: baseline;
  row-gap: 10px;
  column-gap: 12px;
  margin: 0;
`

const MetaLabel = styled.dt`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const MetaValue = styled.dd`
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.primary};
`

/** 배경 발췌 — 세 줄에서 자르고 전문은 국가 상세 개요의 건국·멸망 카드에서 */
const NoteExcerpt = styled(MetaValue)`
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const Lead = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 16px;
`

const LeadImage = styled.img`
  flex-shrink: 0;
  width: 72px;
  height: 72px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
`

const LeadText = styled.p`
  margin: 0;
  min-width: 0;
  font-size: 13px;
  line-height: 1.65;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

/** 존속의 한쪽 끝(건국·멸망) — 표지에서 연 쪽은 좌측 선으로 표시 */
const EndSection = styled.section<{ $focused?: boolean }>`
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  ${({ $focused, theme }) =>
    $focused &&
    css`
      padding-left: 12px;
      box-shadow: inset 3px 0 0 ${theme.colors.primary};
    `}
`

const EndSectionHead = styled.h3`
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const EndSectionYear = styled.span`
  font-size: 12px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const RulerStack = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
`

const InlineLinkButton = styled.button`
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  text-align: left;
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
    border-radius: 2px;
  }
`

const MetaAside = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 12px;
`

const SectionLabel = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: 8px;
`

const ChipSection = styled.div`
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const chipSurface = css`
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  max-width: 100%;
  padding: 4px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.background.secondary};
  font-size: 12px;
  line-height: 1.5;
`

const ChipButton = styled.button`
  ${chipSurface}
  font-family: inherit;
  cursor: pointer;
  transition:
    border-color 0.14s,
    background 0.14s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &:focus-visible {
    border-color: ${({ theme }) => theme.colors.primary};
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`

const ChipStatic = styled.span`
  ${chipSurface}
`

const ChipName = styled.span<{ $italic?: boolean }>`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  font-style: ${({ $italic }) => ($italic ? 'italic' : 'normal')};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const ChipPeriod = styled.span`
  flex-shrink: 0;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const DetailButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.activeLight};
  color: ${({ theme }) => theme.colors.primary};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.hover};
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`
