import { type MouseEvent, type ReactNode, useEffect, useRef, useState } from 'react'

import { FiArrowLeft, FiAward, FiChevronDown, FiChevronUp, FiHelpCircle } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import {
  ledgerAccent,
  ledgerHairlineStrong,
  ledgerSubtleFill,
  withAlpha,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'
import { type UpdateEventDto } from '@/shared/api/events'
import { getUploadImageUrl } from '@/shared/api/upload'
import {
  formatYearLabel,
  parseIsoDateParts,
} from '@/shared/lib/iso-date'
import { renderEmphasis } from '@/shared/lib/emphasis-markup'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { pathKeys } from '@/shared/router'
import { shouldInterceptEntityClick } from '@/widgets/country/country-inline-modal'

import { EVENT_DOMAIN_ORDER, EVENT_DOMAINS, eventDomainDef } from '@/entities/event/model/event-domain'
import { EVENT_TYPES, subtypesForDomain } from '@/entities/event/model/event-type-registry'

import * as S from '../styles'
import { type EventDetail, usePrefetchEventDetail } from '../use-event-detail'
import { HeroCountryCards } from './hero-country-cards'
import { HeroThumbnail } from './hero-thumbnail'
import {
  InlineSelect,
  InlineText,
  type InlineSelectOption,
  InlineDateRange,
} from './inline'

interface DetailHeroProps {
  event: EventDetail
  /** 부분 patch — 필드 단위. 페이지 레벨 mutation이 처리. */
  onPatch: (patch: UpdateEventDto) => void
  /** 인물 chip 클릭 시 페이지 레벨 모달 트리거. */
  onPersonClick: (personId: string) => void
  /** 국가명 클릭 시 페이지 레벨 국가 정보 모달 트리거(관련국 단락과 동일 동작). */
  onCountryClick: (countryId: string) => void
  /**
   * 요약 단락을 히어로에 둘지(기본 true). 탭 지면은 요약을 '개요' 탭 머리로 옮겨
   * 히어로를 정체성(제목·행위자·국가)만으로 짧게 한다 — 요약까지 실으면 히어로가 화면 대부분을 먹어
   * 탭 내용이 접힌 아래에서 시작했다. 옮긴 자리에서는 {@link DetailSummary}를 쓴다.
   */
  withSummary?: boolean
  /**
   * '외 N명'·'외 N' — 탭 지면에서는 '참여' 탭을 연다. 없으면 예전처럼 #actors 앵커
   * (탭 지면에서 앵커는 다른 탭의 섹션이라 아무 데도 가지 않았다).
   */
  onShowActors?: () => void
  /** 대표 이미지를 누르면 — 자료 탭. 주면 히어로에 대표 이미지 칸이 선다(탭 지면) */
  onOpenMedia?: () => void
  /** 종류 표지('단일 사건 ?'·'최상위 사건 ?')를 누르면 — 사건 종류 안내 창. 주면 윗줄 끝에 선다 */
  onOpenKindGuide?: () => void
  /** 윗줄 맨 끝 — 사건 단위 동작 메뉴(⋯). 휴지통에 있는 사건이면 비운다 */
  menu?: ReactNode
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
/** 분야 고르기 — 9개, 설명 한 줄 */
const DOMAIN_OPTIONS: InlineSelectOption[] = EVENT_DOMAIN_ORDER.map((key) => ({
  value: key,
  label: EVENT_DOMAINS[key].label,
  description: EVENT_DOMAINS[key].tagline,
}))

/** 세부 고르기 — 그 분야에서 쓰이는 세부를 앞에, 나머지를 뒤에(저장은 독립 축이라 무엇이든 고를 수 있다) */
const subtypeOptions = (domain?: string | null): InlineSelectOption[] => {
  const { primary, rest } = subtypesForDomain(domain)
  return [...primary, ...rest].map((type) => ({
    value: type,
    label: EVENT_TYPES[type].label,
    description: EVENT_TYPES[type].examples,
  }))
}

export function DetailHero({
  event,
  onPatch,
  onPersonClick,
  onCountryClick,
  withSummary = true,
  onShowActors,
  onOpenMedia,
  onOpenKindGuide,
  menu,
}: DetailHeroProps) {
  const prefetchEvent = usePrefetchEventDetail()
  const category = eventDomainDef(event.domain)
  /**
   * 분류 글자색 — 원색(category.color)이 아니라 **AA 대비 shade**(soft.text)를 쓴다.
   * 목록이 같은 이유로 soft 톤으로 옮겨 갔다(원색 텍스트는 소형에서 AA 미달).
   */
  const categorySoft = category.soft

  // 부모 사건 체인 — 표시 가능한 깊이(최대 3단)까지. 더 깊으면 truncated 플래그.
  const PARENT_CHAIN_CAP = 3
  const parentChain: Array<{ id: string; title: string }> = []
  let cursor = event.parentEvent
  let safety = 0
  while (cursor && safety < PARENT_CHAIN_CAP) {
    parentChain.unshift({ id: cursor.id, title: cursor.title })
    cursor = cursor.parentEvent
    safety += 1
  }
  /* cap을 초과해 아직 부모가 더 남아 있으면 앞에 "..." 인디케이터를 렌더. */
  const parentChainTruncated = Boolean(cursor)

  /* 추가 상위(다중 소속) — 주 체인 뒤 '+N' 배지로 신호. 주 상위가 유령(소프트삭제로
   * parentEvent가 null)이라 체인이 비어도 extras만으로 배지를 단독 렌더한다. */
  const extraParents = event.extraParents ?? []
  const extraParentTitles = extraParents
    .map((extra) => extra.title)
    .join(', ')


  const kindLabel =
    event.kind === 'COLLECTION' ? (event.parentEvent ? '묶음 사건' : '최상위 사건') : '단일 사건'

  return (
    <S.Hero>
      <S.HeroTopRow>
        <BackLink to={pathKeys.events.root()} viewTransition>
          <FiArrowLeft />
          목록
        </BackLink>
        <Sep>·</Sep>
        <S.CategoryChip $color={categorySoft.text} $colorDark={categorySoft.textDark}>
          <category.Icon aria-hidden size={12} />
          {/* 분야는 필수 — 비우는 줄 없이 9개 중 하나로만 바꾼다 */}
          <InlineSelect
            value={category.key}
            options={DOMAIN_OPTIONS}
            onSave={(next) => onPatch({ domain: next } as UpdateEventDto)}
            placeholder={category.label}
            label="분야"
            clearable={false}
          />
          {/* 분야 › 세부 — 한 줄의 2단 분류. 세부는 선택이고 붙는 기록(추천 기능·빈 섹션 안내)을 정한다 */}
          <span aria-hidden>›</span>
          <InlineSelect
            value={event.type ?? ''}
            options={subtypeOptions(event.domain)}
            onSave={(next) => onPatch({ type: next || null } as UpdateEventDto)}
            placeholder="세부 없음"
            label="세부 분야"
          />
        </S.CategoryChip>

        {(parentChain.length > 0 || extraParents.length > 0) && (
          <S.Breadcrumb aria-label="상위 사건">
            {parentChainTruncated && (
              <ParentEllipsis title="더 상위 사건이 있습니다">…</ParentEllipsis>
            )}
            {parentChain.map((parent) => (
              <Link
                key={parent.id}
                to={pathKeys.events.detail(parent.id)}
                viewTransition
                onMouseEnter={() => prefetchEvent(parent.id)}
                onFocus={() => prefetchEvent(parent.id)}
              >
                {parent.title}
              </Link>
            ))}
            {extraParents.length > 0 && (
              <ExtraParentBadge
                href="#network"
                data-extra-parents
                title={`추가 상위: ${extraParentTitles}`}
                aria-label={`추가 상위 ${extraParents.length}건: ${extraParentTitles} — 연관 섹션으로 이동`}
              >
                +{extraParents.length}
              </ExtraParentBadge>
            )}
          </S.Breadcrumb>
        )}

        {/* 종류 표지 + 안내 — '최상위 사건은 어떻게 만드나'를 버튼을 찾아다니지 않고 여기서 */}
        {onOpenKindGuide && (
          <KindGuideButton
            type="button"
            onClick={onOpenKindGuide}
            aria-label={`사건 종류 안내 — 지금 ${kindLabel}`}
            title="단일 사건과 묶음(최상위) 사건 — 어떻게 바꾸나요?"
          >
            <KindLabel>{kindLabel}</KindLabel>
            <FiHelpCircle aria-hidden />
          </KindGuideButton>
        )}
        {menu}
      </S.HeroTopRow>

      {/* 대표 이미지 — 넓으면 제목 오른쪽, 좁으면 제목 위 배너(S.Hero 격자) */}
      {onOpenMedia && <HeroThumbnail event={event} onPatch={onPatch} onOpenMedia={onOpenMedia} />}

      <S.HeroText>
      <TitleHost>
        <InlineText
          value={event.title}
          onSave={(next) => onPatch({ title: next.trim() })}
          validate={(next) =>
            next.trim() ? null : '제목은 비워둘 수 없습니다'
          }
          placeholder="사건명 입력"
          label="사건 제목"
          as="span"
          /* 긴 제목은 textarea로 줄바꿈 표시 — Enter는 여전히 저장(Shift+Enter 줄바꿈). */
          multiline
          multilineEnter={false}
          /* 제목은 대개 한 줄 — 3줄 상자가 열리며 아래를 85px 밀어내던 것을 막는다. */
          minRows={1}
          hint="Enter 저장 · Shift+Enter 줄바꿈 · Esc 취소"
        />
      </TitleHost>
      {/* 원어 사건명 — 제목 바로 밑 한 줄. 비어 있으면 자리만(편집 진입점, 흐리게) */}
      <OriginalTitleHost data-filled={event.originalTitle?.trim() ? 'true' : undefined}>
        <InlineText
          value={event.originalTitle ?? ''}
          onSave={(next) => onPatch({ originalTitle: next.trim() } as UpdateEventDto)}
          placeholder="원어 사건명"
          label="원어 사건명"
          as="span"
        />
      </OriginalTitleHost>

      {/* 카테고리 톤 밴드 — 제목과 메타 사이 시각 앵커. 카테고리 색이 옅게
          좌→우로 흩어지며 페이지 정체성을 한 줄로 표시(밑줄 X, 별도 룰). */}
      <TitleAccent
        $color={category.color}
        $colorDark={category.dark}
        aria-hidden
      />

      {/* 날짜·위치·'동시대 수장'은 **사실**이라 우측 장부(DetailFacts)로 옮겼다.
          히어로에는 제목·요약·행위자 — 서사의 도입만 남는다.
          단, 한 열 배치에서는 장부가 히어로(요약 문단까지) **뒤**에 와서 390px에선 '언제'가
          1.3화면 아래로 밀렸다 — 그 폭에서만 날짜 한 줄을 제목 밑에 둔다(읽기 전용,
          편집은 여전히 장부). */}
      {/* 한 열 배치의 날짜는 여기 **한 곳**(편집 가능) — 장부의 연도·날짜 줄은 그 폭에서 숨는다.
          예전엔 읽기 전용 줄 + 장부의 '1914년 + 날짜'로 모바일에서 같은 날짜가 두 번 섰다. */}
      <NarrowDateLine>
        <InlineDateRange
          startDate={event.startDate}
          startDatePrecision={event.startDatePrecision}
          endDate={event.endDate}
          endDatePrecision={event.endDatePrecision}
          allowPartial
          onSave={(patch) => onPatch(patch)}
        />
      </NarrowDateLine>
      <HeroActors
        event={event}
        onPersonClick={onPersonClick}
        onCountryClick={onCountryClick}
        onShowActors={onShowActors}
      />

      {withSummary && <DetailSummary event={event} onPatch={onPatch} />}
      </S.HeroText>
    </S.Hero>
  )
}

/** 사건 요약 단락(인라인 편집) — 히어로 안이나 탭 지면의 '개요' 머리에 둔다 */
export function DetailSummary({
  event,
  onPatch,
  autoEdit = false,
}: {
  event: EventDetail
  onPatch: (patch: UpdateEventDto) => void
  /** 처음부터 입력칸으로 — 묶음 '전체 글' 안내의 '요약 쓰기'로 열었을 때 */
  autoEdit?: boolean
}) {
  /**
   * 긴 요약은 다섯 줄까지만 — 요약이 600자를 넘는 사건이 44건(최대 1,630자)이고, 일본 최초 철도는 요약만
   * 5문단(약 770px)이라 배경이 첫 화면 밖으로 밀렸다. 넘칠 때만 '요약 전체 보기'가 생기고, 편집을 시작하면
   * (포커스 진입) 저절로 펼친다 — 잘린 채 편집하면 커서가 안 보인다.
   */
  const contentRef = useRef<HTMLDivElement>(null)
  const [overflowing, setOverflowing] = useState(false)
  const [expanded, setExpanded] = useState(false)
  useEffect(() => {
    const node = contentRef.current
    if (!node) return undefined
    const measure = () => {
      if (expanded) return
      /* 반 줄 미만 넘침은 무시 — 딱 다섯 줄에도 '더 보기'가 붙지 않게 */
      setOverflowing(node.scrollHeight > node.clientHeight + 12)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [expanded, event.description])
  const clamped = overflowing && !expanded

  return (
    <SummaryHost>
      <SummaryClamp
        ref={contentRef}
        $limit={!expanded}
        $fade={clamped}
        onFocusCapture={() => setExpanded(true)}
      >
        <InlineText
          autoEdit={autoEdit}
          value={event.description ?? ''}
          /* 비우면 빈 문자열 전송 → 컬럼 비움(`|| undefined`는 서버가 무시). */
          onSave={(next) => onPatch({ description: next.trim() })}
          placeholder="요약 — 한두 단락"
          multiline
          multilineEnter
          renderRead={renderEmphasis}
        />
      </SummaryClamp>
      {(clamped || (overflowing && expanded)) && (
        <SummaryToggle type="button" aria-expanded={expanded} onClick={() => setExpanded((prev) => !prev)}>
          {expanded ? <FiChevronUp aria-hidden /> : <FiChevronDown aria-hidden />}
          {expanded ? '요약 접기' : '요약 전체 보기'}
        </SummaryToggle>
      )}
    </SummaryHost>
  )
}

/**
 * 요약 다섯 줄 상자 — 높이 제한($limit)은 넘침을 재기 위해 접힌 동안 늘 걸고, 아래 흐림($fade)은 실제로 넘칠
 * 때만(짧은 요약의 마지막 줄이 괜히 흐려지지 않게). 흐림은 mask라 지면색을 몰라도 된다.
 */
const SummaryClamp = styled.div<{ $limit: boolean; $fade: boolean }>`
  ${({ $limit }) => ($limit ? 'max-height: calc(1.65em * 5); overflow: hidden;' : '')}
  ${({ $fade }) => ($fade ? 'mask-image: linear-gradient(to bottom, #000 calc(100% - 2.2em), transparent);' : '')}
`

const SummaryToggle = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  padding: 2px 0;
  border: none;
  background: none;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  cursor: pointer;

  svg {
    width: 14px;
    height: 14px;
  }
  &:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
    border-radius: 2px;
  }
`

/* 한 열 배치 전용 날짜 줄 — 2열(≥920)에서는 옆 장부가 같은 값을 크게 말하므로 숨긴다. */
const NarrowDateLine = styled.div`
  margin: -4px 0 0;
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};

  @container eventdetail (min-width: 920px) {
    display: none;
  }
`

const TitleAccent = styled.div<{ $color: string; $colorDark?: string }>`
  width: 56px;
  height: 3px;
  border-radius: ${RADIUS.FOCUS};
  margin-top: -10px;
  background: ${({ theme, $color, $colorDark }) => {
    const applied = theme.mode === 'dark' ? $colorDark ?? $color : $color
    return `linear-gradient(90deg, ${applied} 0%, ${withAlpha(applied, 0)} 100%)`
  }};

  @media (prefers-reduced-motion: no-preference) {
    /* 히어로 페이드업(heroRise)과 **같은 값** — 한 화면에서 동시에 도는 두 진입
       애니메이션이 0.5s와 0.55s로 미세하게 갈릴 이유가 없다(의미 없는 차이). */
    animation: accentGrow 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
    transform-origin: left center;
  }

  @keyframes accentGrow {
    from {
      transform: scaleX(0);
      opacity: 0;
    }
    to {
      transform: scaleX(1);
      opacity: 1;
    }
  }
`

/* 사건 제목 = 페이지 유일 h1(문서 아웃라인·스크린리더 진입점). 안의 편집 span을 감싼다. */
const TitleHost = styled.h1`
  margin: 0;
  /**
   * 크기·굵기·자간 세 축 모두 목록의 판정을 따른다.
   *
   * - **800 폐기**: 목록은 화면에서 가장 큰 텍스트(세기 머리글)의 800을 700으로 내리며
   *   "위계는 크기가 이미 만들고 있고, 굵기까지 최대치를 쓰면 필요 이상으로 무거워진다"로
   *   정리했다. 800은 그때 레포에서 그 한 곳뿐이었는데, 여기가 남아 있었다.
   * - **자간**: 한글에 라틴 트래킹을 그대로 쓰지 않는다는 레포 규약대로 -0.018 → -0.01em.
   *   목록도 같은 자리에서 -0.02em을 되돌렸다.
   * - **크기**: 44px 상한은 본문(15.5px)의 2.8배였다. 목록의 단조(세기 18 : 행 14 : 연 13)
   *   처럼 상세도 제목 36 : 섹션 20 : 본문 15.5로 층을 좁힌다 — 커서 이기는 화면을 만들지 않는다.
   */
  font-size: clamp(27px, 3.4vw, 36px);
  font-weight: 700;
  line-height: 1.18;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};

  /**
   * 작은 필드는 상시 dashed underline으로 편집 어포던스를 주지만, 44px 굵은 제목
   * 밑의 상시 점선은 맞춤법 오류/깨진 링크처럼 보인다. 큰 제목에 한해 점선을
   * hover/focus에서만 노출(어포던스는 hover 시 ✎ + 점선으로 충분).
   */
  [data-edit-host] > span:first-child {
    text-decoration-line: none;
  }
  [data-edit-host]:hover > span:first-child,
  [data-edit-host]:focus-within > span:first-child {
    text-decoration-line: underline;
  }
`

/**
 * 사건 시작 연도로 「역대 수장 비교」 페이지의 동시대 가이드라인을 자동으로 꽂아 진입.
 * 사건 startDate가 비어있으면 미렌더.
 */
export function ContemporaryHeadsLink({ event }: { event: EventDetail }) {
  const year = extractYear(event.startDate)
  if (year == null) return null
  // 목적지 headsOfState가 BC 미지원(재임 tenure era 마이그 없음) — BC 연도는 빈
  // 화면으로 유도하는 셈이라 링크 자체를 내리지 않는다. BC 지원 마이그 후 가드 제거.
  if (year < 0) return null
  return (
    <ContemporaryLine>
      <FiAward aria-hidden />
      <ContemporaryLink
        to={pathKeys.headsOfState(year)}
        title={`${formatYearLabel(year)} 시점에 세계 각국이 누구의 통치 아래 있었는지 비교`}
      >
        {formatYearLabel(year)} 동시대 수장 비교
      </ContemporaryLink>
    </ContemporaryLine>
  )
}

function extractYear(input: string | null | undefined): number | null {
  // 캐논 파서에 위임 — BC 음수·타임존 안전성을 단일 출처(parseIsoDateParts)로 공유.
  return parseIsoDateParts(input)?.year ?? null
}

/* 우측 장부 안 한 줄 — 패널의 다른 줄(날짜·위치)과 같은 크기·정렬. */
const ContemporaryLine = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  line-height: 1.5;

  > svg {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
    opacity: 0.7;
  }
`

const ContemporaryLink = styled(Link)`
  font-weight: 600;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
    border-radius: ${RADIUS.FOCUS};
  }
`

/* ───────────────── Hero actor strip — NYT editorial ─────────────────
 * 사건 헤더의 "참여자 라인업" — 신문 byline / dramatis personae 톤.
 * - smallcaps eyebrow 라벨 + 검정 1px 헤어라인 룰
 * - 작은 정사각 b&w 아바타 stack + 세리프 이름(중점·쉼표로 구분)
 * - 국가는 한 단락 — 현대(roman) · 역사(italic)로 weight/style만 구분, flag 미사용
 */
const PERSON_CAP = 4

function HeroActors({
  event,
  onPersonClick,
  onCountryClick,
  onShowActors,
}: {
  event: EventDetail
  onPersonClick: (personId: string) => void
  onCountryClick: (countryId: string) => void
  onShowActors?: () => void
}) {
  /* 넘친 인원·나라 — 탭 지면이면 '참여' 탭으로, 아니면 #actors 앵커로 */
  const overflowProps = onShowActors
    ? {
        href: '?tab=actors',
        onClick: (clickEvent: MouseEvent<HTMLAnchorElement>) => {
          if (!shouldInterceptEntityClick(clickEvent)) return
          clickEvent.preventDefault()
          onShowActors()
        },
      }
    : { href: '#actors' }
  const allPersons = event.relatedPersons ?? []
  const allModern = event.relatedCountries ?? []
  const allHistorical = event.relatedHistoricalCountries ?? []

  const persons = allPersons.slice(0, PERSON_CAP)

  const personOverflow = allPersons.length - persons.length

  if (persons.length === 0 && allModern.length + allHistorical.length === 0) return null

  return (
    <ActorStrip aria-label="참여 행위자 요약">
      {persons.length > 0 && (
        <Lineup>
          <PersonInline>
            {persons.map((p, i) => {
              const name = p.person
                ? getPersonDisplayName({
                    name: p.person.name ?? '',
                    surname: p.person.surname,
                    middleName: p.person.middleName,
                    nameDisplayOrder: p.person.nameDisplayOrder,
                    country: p.person.country,
                  }) || '미상'
                : '미상'
              const avatar = p.person?.profileImageUrl ?? undefined
              return (
                // detail-actors와 동일하게 personId로 키잉 — 관계 행 id(p.id)는
                // 저장 후 refetch에서 바뀌어 hero 행이 불필요하게 remount된다.
                <span key={p.personId}>
                  <PersonInlineButton
                    type="button"
                    title={p.role ?? undefined}
                    onClick={() => onPersonClick(p.personId)}
                  >
                    <PersonAvatar $hasImage={Boolean(avatar)}>
                      {avatar ? (
                        <img
                          src={getUploadImageUrl(avatar) || avatar}
                          alt=""
                          loading="lazy"
                        />
                      ) : (
                        <span>{name.charAt(0)}</span>
                      )}
                    </PersonAvatar>
                    <PersonName>{name}</PersonName>
                  </PersonInlineButton>
                  {i < persons.length - 1 && <PersonSep>·</PersonSep>}
                </span>
              )
            })}
            {personOverflow > 0 && (
              <Overflow {...overflowProps}>외 {personOverflow}명</Overflow>
            )}
          </PersonInline>
        </Lineup>
      )}

      {/* 참여국 — 이름 나열 대신 진영별 국가 카드(역할·참여 형태·대표 수치) */}
      <HeroCountryCards event={event} onCountryClick={onCountryClick} onShowActors={onShowActors} />
    </ActorStrip>
  )
}

/* ─── Editorial actor strip — sans, NYT 깔끔한 톤만 ───
 * 시그니처: 검정 1px 헤어라인 룰 + smallcaps tracked eyebrow + 깔끔한 위계.
 * 폰트는 앱 기본(Inter/Pretendard) 그대로 — 세리프 미사용.
 */
/**
 * Hero 하단 ActorStrip 구분선 — 로컬 알파(editorialRule) 대신 페이지 공용
 * hairline 토큰으로 통일(이전 0.78/0.5는 본문보다 진해 시선 분산이 컸음).
 */
/* 위 구분선(border-top)은 뺐다 — 참여국 카드의 면이 제목·요약과 이미 갈라 준다 */
const ActorStrip = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 14px;
`

const Lineup = styled.div`
  min-width: 0;
`

/* ── 인물 인라인 — 작은 b&w 아바타 + 본문 sans 이름 ── */

const PersonInline = styled.div`
  font-size: 14px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.005em;

  /*
   * 한 인물 = 버튼 + 뒤따르는 '·' — 한 덩어리로 묶어 구분점만 다음 줄 머리로 떨어지지
   * 않게 한다. 폭이 모자라면(390px) 역할이 말줄임으로 줄어든다 — 예전엔 nowrap 토큰이
   * 화면 밖으로 삐져나갔다.
   */
  > span {
    display: inline-flex;
    align-items: center;
    max-width: 100%;
    vertical-align: middle;
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
  /* 한 인물 = atomic 토큰 — 줄 끝에서 이름·역할이 갈라지지 않도록. */
  white-space: nowrap;
  min-width: 0;
  max-width: 100%;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
    border-radius: ${RADIUS.FOCUS};
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
    $hasImage ? 'transparent' : ledgerSubtleFill(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
  /* 22×22 안에서 한글/영문 한 글자가 또렷이 읽히도록. 이전 10px는 한글이
     사실상 illegible. */
  font-size: 12px;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1;
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
  font-size: 14px;
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

const PersonSep = styled.span`
  flex-shrink: 0;
  margin: 0 8px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/* ── 국가 인라인 — 현대(roman) · 역사(italic) — flag 미사용 ── */

/* italic 제거 — 한글은 italic face가 없어 브라우저가 기울인 가짜 글꼴이 된다.
   이 레포는 italic을 placeholder 같은 '보조 메타'에만 쓰기로 이미 정리해 두었다. */
const Overflow = styled.a`
  white-space: nowrap;
  font-size: 12.5px;
  margin-left: 10px;
  color: ${({ theme }) => theme.colors.text.secondary};
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
    border-radius: ${RADIUS.FOCUS};
  }
`

const SummaryHost = styled.div`
  ${S.longFormEditAffordance}
  font-size: 16.5px;
  line-height: 1.65;
  color: ${({ theme }) => theme.colors.text.secondary};
  max-width: ${S.PROSE_WIDTH}px;
`

/** 종류 표지 겸 '?' 안내 버튼 — 윗줄 끝. 상태(무슨 종류)와 길잡이(어떻게 바꾸나)를 한 버튼에 */
const KindGuideButton = styled.button`
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 6px 3px 10px;
  border-radius: 999px;

  @container eventdetail (max-width: 639px) {
    padding: 3px 6px;
  }
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  svg {
    width: 15px;
    height: 15px;
  }
  &:hover {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
`

/** 휴대폰 폭에선 '?'만 — 글자까지 서면 우상단 아바타를 피하느라 윗줄이 두 줄이 됐다(이름은 aria-label이 든다) */
const KindLabel = styled.span`
  @container eventdetail (max-width: 639px) {
    display: none;
  }
`

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  color: ${metaText};

  svg {
    width: 13px;
    height: 13px;
  }

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
    border-radius: ${RADIUS.FOCUS};
  }
`

/* 구분자 '·' — 읽는 토큰이 아니라 장식이라 색은 tertiary 그대로(AA 대상 아님).
   다만 크기는 같은 줄의 다른 토큰과 맞춘다(12/12.5/13 세 종류가 섞여 있었다). */
const Sep = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  opacity: 0.5;
  font-size: 12px;
`

const ParentEllipsis = styled.span`
  color: ${metaText};
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.05em;
  cursor: help;
`

/**
 * 다중 소속 '+N' 배지 — 주 상위 체인 밖 추가 상위(extraParents) 개수 신호.
 * 클릭 시 연관(#network) 섹션으로 이동해 전체 목록·편집 UI에 닿는다
 * (같은 페이지 앵커 — HeroActors의 Overflow(#actors)와 동일 수단).
 */
const ExtraParentBadge = styled.a`
  color: ${metaText};
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.05em;

  &:hover,
  &:focus-visible {
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
    border-radius: ${RADIUS.FOCUS};
  }
`

/**
 * 원어 사건명 — 제목 밑 한 줄(기울임 없는 보조 글씨). 비어 있으면 흐린 '원어 사건명' 자리만 남아
 * 편집 진입점이 된다 — 값이 생기면 진하게.
 */
const OriginalTitleHost = styled.p`
  margin: 4px 0 0;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.4;
  color: ${({ theme }) => theme.colors.text.secondary};

  &:not([data-filled]) {
    opacity: 0.6;
    font-size: 13px;

    [data-empty='true'] {
      font-style: normal;
    }
  }
`
