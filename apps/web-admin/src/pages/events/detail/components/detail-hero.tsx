import { type ReactNode, useEffect, useRef, useState } from 'react'

import {
  FiArrowLeft,
  FiAward,
  FiChevronDown,
  FiChevronUp,
  FiHelpCircle,
  FiPlus,
} from 'react-icons/fi'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import {
  ledgerAccent,
  ledgerHairlineStrong,
  ledgerHoverFill,
  withAlpha,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'
import { type UpdateEventDto } from '@/shared/api/events'
import {
  formatYearLabel,
  parseIsoDateParts,
} from '@/shared/lib/iso-date'
import { renderEmphasis } from '@/shared/lib/emphasis-markup'
import { pathKeys } from '@/shared/router'

import { EVENT_DOMAIN_ORDER, EVENT_DOMAINS, eventDomainDef } from '@/entities/event/model/event-domain'
import { EVENT_TYPES, subtypesForDomain } from '@/entities/event/model/event-type-registry'

import * as S from '../styles'
import { type EventDetail, usePrefetchEventDetail } from '../use-event-detail'
import { HeroThumbnail } from './hero-thumbnail'
import { ParentFlowStrip } from './parent-flow-strip'
import { SeriesFlowStrip } from './series-flow-strip'
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
  /**
   * 요약 단락을 히어로에 둘지(기본 true). 탭 지면은 요약을 '개요' 탭 머리로 옮겨
   * 히어로를 정체성(분류·제목·부제)만으로 짧게 한다. 옮긴 자리에서는 {@link DetailSummary}를 쓴다.
   */
  withSummary?: boolean
  /** 대표 이미지를 누르면 — 자료 탭. 주면 히어로에 대표 이미지 칸이 선다(탭 지면) */
  onOpenMedia?: () => void
  /** 종류 표지('단일 사건 ?'·'최상위 사건 ?')를 누르면 — 사건 종류 안내 창. 주면 윗줄 끝에 선다 */
  onOpenKindGuide?: () => void
  /** 윗줄 맨 끝 — 사건 단위 동작 메뉴(⋯). 휴지통에 있는 사건이면 비운다 */
  menu?: ReactNode
  /** 부제·이칭 입력을 연다(장부의 '+ 부제 · 이칭') — 비어 있으면 평소엔 자리를 두지 않는다 */
  subtitleOpen?: boolean
  onSubtitleClose?: () => void
  /** 원어 사건명 입력을 연다(장부의 '+ 원어 사건명') — 비어 있으면 평소엔 자리를 두지 않는다 */
  originalTitleOpen?: boolean
  onOriginalTitleClose?: () => void
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
  withSummary = true,
  onOpenMedia,
  onOpenKindGuide,
  menu,
  subtitleOpen = false,
  onSubtitleClose,
  originalTitleOpen = false,
  onOriginalTitleClose,
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
  const hasPrimaryImage = Boolean(onOpenMedia) && (event.eventImages?.length ?? 0) > 0

  return (
    <S.Hero data-has-thumb={hasPrimaryImage || undefined}>
      <S.HeroTopRow>
        <BackLink to={pathKeys.events.root()} viewTransition aria-label="사건 목록">
          <FiArrowLeft aria-hidden />
          <BackLabel>목록</BackLabel>
        </BackLink>
        <Sep aria-hidden>·</Sep>
        <S.CategoryChip data-shrink $color={categorySoft.text} $colorDark={categorySoft.textDark}>
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
          <S.Breadcrumb data-shrink aria-label="상위 사건">
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
      <TitleBlock>
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
        {/* 부제 · 이칭·작전명 — 사건명을 짧은 고유명사로 유지하고 통칭·작전명·핵심 성격을 한 줄로 받친다. */}
        {(event.subtitle?.trim() || subtitleOpen) && (
          <SubtitleHost
            data-filled={event.subtitle?.trim() ? 'true' : undefined}
            onBlur={(blurEvent) => {
              if (blurEvent.currentTarget.contains(blurEvent.relatedTarget as Node | null)) return
              onSubtitleClose?.()
            }}
          >
            <InlineText
              value={event.subtitle ?? ''}
              onSave={(next) => {
                onPatch({ subtitle: next.trim() } as UpdateEventDto)
                onSubtitleClose?.()
              }}
              placeholder="부제 · 이칭·작전명 (예: 바르바로사 작전 — 나치 독일의 소련 침공 지시)"
              label="사건 부제 · 이칭"
              as="span"
              maxLength={150}
              autoEdit={subtitleOpen && !event.subtitle?.trim()}
              hint="Enter 저장 · 비우고 저장하면 부제 제거 · Esc 취소"
            />
          </SubtitleHost>
        )}
        {/* 원어 사건명 — 제목·부제 바로 밑 한 줄. */}
        {(event.originalTitle?.trim() || originalTitleOpen) && (
          <OriginalTitleHost
            data-filled={event.originalTitle?.trim() ? 'true' : undefined}
            onBlur={(blurEvent) => {
              if (blurEvent.currentTarget.contains(blurEvent.relatedTarget as Node | null)) return
              onOriginalTitleClose?.()
            }}
          >
            <InlineText
              value={event.originalTitle ?? ''}
              onSave={(next) => {
                onPatch({ originalTitle: next.trim() } as UpdateEventDto)
                onOriginalTitleClose?.()
              }}
              placeholder="원어 사건명"
              label="원어 사건명"
              as="span"
              autoEdit={originalTitleOpen && !event.originalTitle?.trim()}
            />
          </OriginalTitleHost>
        )}
      </TitleBlock>

      {/* 카테고리 톤 밴드 — 제목 묶음 아래 시각 앵커 */}
      <TitleAccent
        $color={category.color}
        $colorDark={category.dark}
        aria-hidden
      />

      {/* 하위 사건이면 상위 흐름 속 자리 — 몇 번째·시작 며칠째·앞뒤 사건과 형제 띠 */}
      {event.parentEventId && <ParentFlowStrip event={event} />}

      {/* 정기 회의·행사 시리즈 소속이면 회차 흐름 + 이전·다음 회차 + 차기 개최 시점 안내 띠 */}
      {event.seriesContext && <SeriesFlowStrip event={event} onPatch={onPatch} />}

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
  const [editingEmpty, setEditingEmpty] = useState(false)
  const category = eventDomainDef(event.domain)
  const hasDescription = Boolean(event.description?.trim())
  const contentRef = useRef<HTMLDivElement>(null)
  const [overflowing, setOverflowing] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (hasDescription) setEditingEmpty(false)
  }, [hasDescription])

  useEffect(() => {
    const node = contentRef.current
    if (!node) return undefined
    const measure = () => {
      if (expanded) return
      const lineHeight = parseFloat(getComputedStyle(node).lineHeight) || 28
      setOverflowing(node.scrollHeight > lineHeight * (SUMMARY_LINES + 2.5))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [expanded, event.description])
  const clamped = overflowing && !expanded

  if (!hasDescription && !autoEdit && !editingEmpty) {
    return (
      <SummaryEmptyHost
        type="button"
        $accent={category.color}
        $accentDark={category.dark}
        onClick={() => setEditingEmpty(true)}
      >
        <SummaryEmptyText>
          <strong>사건 핵심 요약</strong>
          <span>
            이 사건의 성격과 역사적 의의를 한두 문단으로 먼저 요약해 두면 본문을 읽기 전에 전체 맥락이 한눈에 잡힙니다.
          </span>
        </SummaryEmptyText>
        <SummaryEmptyAction>
          <FiPlus size={13} aria-hidden />
          요약 작성하기
        </SummaryEmptyAction>
      </SummaryEmptyHost>
    )
  }

  return (
    <SummaryHost
      $accent={category.color}
      $accentDark={category.dark}
      onBlur={(blurEvent) => {
        if (blurEvent.currentTarget.contains(blurEvent.relatedTarget as Node | null)) return
        if (!hasDescription) setEditingEmpty(false)
      }}
    >
      <SummaryClamp
        ref={contentRef}
        $limit={clamped}
        $fade={clamped}
        onFocusCapture={() => setExpanded(true)}
      >
        <InlineText
          autoEdit={autoEdit || editingEmpty}
          value={event.description ?? ''}
          onSave={(next) => {
            onPatch({ description: next.trim() })
            if (!next.trim()) setEditingEmpty(false)
          }}
          placeholder="사건의 핵심 성격과 의의를 한두 문단으로 요약하세요"
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
const SUMMARY_LINES = 5

const SummaryClamp = styled.div<{ $limit: boolean; $fade: boolean }>`
  ${({ $limit }) => ($limit ? `max-height: calc(1.65em * ${SUMMARY_LINES}); overflow: hidden;` : '')}
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

const TitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`

const TitleAccent = styled.div<{ $color: string; $colorDark?: string }>`
  width: 56px;
  height: 3px;
  border-radius: ${RADIUS.FOCUS};
  margin-top: -2px;
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
  /*
   * 이 사건의 참여국을 싣고 간다 — 연도만 넘기면 수장 비교 화면이 빈 보드로 열려, 1차대전에서 누른 사람이
   * 15개국을 하나씩 다시 골라야 했다. 기간 앞뒤로 2년씩 띄워 즉위·퇴위가 띠 가장자리에서 잘리지 않게.
   */
  const endYear = Math.max(extractYear(event.endDate) ?? year, year)
  const pins = [
    ...(event.relatedCountries ?? []).map((country) => ({ kind: 'C' as const, id: country.id })),
    ...(event.relatedHistoricalCountries ?? []).map((country) => ({ kind: 'H' as const, id: country.id })),
  ]
  const span = endYear > year ? `${year}~${endYear}` : `${year}`
  if (pins.length === 0) {
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
  return (
    <ContemporaryLine>
      <FiAward aria-hidden />
      <ContemporaryLink
        to={pathKeys.headsOfState(year, { range: { startYear: year - 2, endYear: endYear + 2 }, pins })}
        title={`참여국 ${pins.length}곳을 ${span}년 수장 연표에 놓고 비교`}
      >
        참여국 {pins.length}곳의 당시 수장 <ContemporarySpan>{span} 비교</ContemporarySpan>
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

/** 링크 뒤 기간 — 링크 색은 두고 무게만 내린다 */
const ContemporarySpan = styled.span`
  font-weight: 400;
  font-variant-numeric: tabular-nums;
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

const SummaryEmptyHost = styled.button<{ $accent: string; $accentDark?: string }>`
  appearance: none;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 20px;
  width: 100%;
  max-width: ${S.PROSE_MAX_WIDTH};
  padding: 12px 16px 12px 18px;
  border: none;
  border-left: 3px solid
    ${({ theme, $accent, $accentDark }) =>
      withAlpha(theme.mode === 'dark' ? ($accentDark ?? $accent) : $accent, 0.45)};
  border-radius: 0 ${RADIUS.SM} ${RADIUS.SM} 0;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.14s ease, border-color 0.14s ease;

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
    border-left-color: ${({ theme, $accent, $accentDark }) =>
      theme.mode === 'dark' ? ($accentDark ?? $accent) : $accent};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
`

const SummaryEmptyText = styled.span`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1 1 320px;
  min-width: 0;

  strong {
    font-size: 14px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  span {
    font-size: 13px;
    line-height: 1.55;
    word-break: keep-all;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const SummaryEmptyAction = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
  font-weight: 650;
  white-space: nowrap;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const SummaryHost = styled.div<{ $accent: string; $accentDark?: string }>`
  ${S.longFormEditAffordance}
  max-width: ${S.PROSE_MAX_WIDTH};
  padding: 2px 0 2px 18px;
  border-left: 3px solid
    ${({ theme, $accent, $accentDark }) =>
      withAlpha(theme.mode === 'dark' ? ($accentDark ?? $accent) : $accent, theme.mode === 'dark' ? 0.65 : 0.55)};
  font-size: 16px;
  line-height: 1.78;
  color: ${({ theme }) => theme.colors.text.primary};
`

/** 종류 표지 겸 '?' 안내 버튼 — 테두리를 뺀 조용한 메타 표지(마우스 오버 시 윤곽 표시) */
const KindGuideButton = styled.button`
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 7px;
  border-radius: ${RADIUS.SM};

  @container eventdetail (max-width: 639px) {
    padding: 3px 5px;
  }
  border: 1px solid transparent;
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  color: ${metaText};
  cursor: pointer;

  svg {
    width: 13.5px;
    height: 13.5px;
    opacity: 0.75;
  }
  &:hover {
    border-color: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
    color: ${({ theme }) => theme.colors.text.primary};

    svg {
      opacity: 1;
    }
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

/** 휴대폰 폭에선 화살표만 — 윗줄을 한 줄에 지키려고(이름은 aria-label) */
const BackLabel = styled.span`
  @container eventdetail (max-width: 639px) {
    display: none;
  }
`

/* 구분자 '·' — 읽는 토큰이 아니라 장식이라 색은 tertiary 그대로(AA 대상 아님).
   다만 크기는 같은 줄의 다른 토큰과 맞춘다(12/12.5/13 세 종류가 섞여 있었다). */
const Sep = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  opacity: 0.5;
  font-size: 12px;

  /* 휴대폰 폭은 '목록' 글자가 빠져 화살표만 남는다 — 화살표 뒤 '·'는 떠 있는 점으로만 보였다 */
  @container eventdetail (max-width: 639px) {
    display: none;
  }
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
 * 부제 · 이칭·작전명 — 사건명 바로 아래 한 줄 표제 부제(단문).
 */
const SubtitleHost = styled.p`
  margin: 0;
  font-size: clamp(15px, 1.5vw, 17px);
  font-weight: 550;
  line-height: 1.45;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.secondary};

  [data-edit-host] > span:first-child {
    text-decoration-line: none;
  }
  [data-edit-host]:hover > span:first-child,
  [data-edit-host]:focus-within > span:first-child {
    text-decoration-line: underline;
  }

  &:not([data-filled]) {
    opacity: 0.7;
    font-size: 13.5px;

    [data-empty='true'] {
      font-style: normal;
    }
  }
`

/**
 * 원어 사건명 — 제목·부제 밑 한 줄(기울임 없는 보조 글씨).
 */
const OriginalTitleHost = styled.p`
  margin: 0;
  font-size: 14.5px;
  font-weight: 500;
  line-height: 1.4;
  color: ${({ theme }) => theme.colors.text.secondary};

  [data-edit-host] > span:first-child {
    text-decoration-line: none;
  }
  [data-edit-host]:hover > span:first-child,
  [data-edit-host]:focus-within > span:first-child {
    text-decoration-line: underline;
  }

  &:not([data-filled]) {
    opacity: 0.6;
    font-size: 13px;

    [data-empty='true'] {
      font-style: normal;
    }
  }
`
