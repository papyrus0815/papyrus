import { useEffect, useState } from 'react'

import styled, { keyframes } from 'styled-components'

import { ledgerHairlineStrong } from '@/entities/event/ui/ledger-tokens'
import adamsPortrait from '@/shared/assets/images/portraits/adams.webp'
import greyPortrait from '@/shared/assets/images/portraits/grey.webp'
import jeffersonPortrait from '@/shared/assets/images/portraits/jefferson.webp'
import linZexuPortrait from '@/shared/assets/images/portraits/lin-zexu.webp'
import madisonPortrait from '@/shared/assets/images/portraits/madison.webp'
import washingtonPortrait from '@/shared/assets/images/portraits/washington.webp'

import * as S from '../styles'

/**
 * 사건 상세 진입 로딩 — **인물 초상 + 명언**.
 *
 * 2026-10-07 사용자 지시("유명인물 초상화 보여주고 명언이 나오는 로딩바"). 기다리는 몇 초를
 * 역사 한 줄로 채운다. 진입마다 무작위로 한 명을 고르고, 로딩이 길어지면 다음 인물로 넘어간다.
 *
 * - **초상은 번들 정적 자산**이다(`shared/assets/images/portraits`, 192px 정사각 webp). 로딩 화면이
 *   또 다른 API를 기다리면 초상이 사건보다 늦게 오거나 아예 못 온다. 원본은 DB 인물 초상(전부
 *   19세기 이전 회화·사진이라 퍼블릭 도메인)에서 얼굴 중심으로 잘라 왔다.
 * - **명언은 출처가 확인되는 것만** 둔다. 인터넷에 도는 '명언'은 오귀속이 흔하다(레닌의 "수십 년이
 *   일어나는 몇 주", 저우언라이의 "말하기엔 너무 이르다" 등). 추가할 때도 `source`를 함께 적을 것.
 * - 최소 노출 MIN_LOADING_MS: 응답이 빨라도 이 시간만큼은 보인다(게이트는 페이지 셸이 쥔다).
 * - 스크린리더에는 고정 문구 하나만 읽힌다(명언은 aria-hidden — 매번 낭독되면 로딩 안내가 묻힌다).
 * - prefers-reduced-motion: 바는 정지선, 인물 교체 없음.
 */
export function EventDetailLoading() {
  const quoteIndex = useRotatingQuoteIndex(QUOTES.length, QUOTE_INTERVAL_MS)
  const quote = QUOTES[quoteIndex]

  return (
    <S.Page>
      <Stage role="status" aria-live="polite" aria-busy="true">
        <VisuallyHidden>사건 정보를 불러오는 중…</VisuallyHidden>

        <QuoteCard aria-hidden key={quoteIndex}>
          <Portrait src={quote.portrait} alt="" width={64} height={64} decoding="async" />
          <QuoteText>{quote.text}</QuoteText>
          <Attribution>
            <AttributionName>{quote.person}</AttributionName>
            <AttributionSource>{quote.source}</AttributionSource>
          </Attribution>
        </QuoteCard>

        <LoadingBar aria-hidden>
          <LoadingBarFill />
        </LoadingBar>
      </Stage>
    </S.Page>
  )
}

interface LoadingQuote {
  person: string
  portrait: string
  text: string
  /** 출처 — 편지·연설·저작과 연도. 확인되지 않는 명언은 넣지 않는다. */
  source: string
}

const QUOTES: LoadingQuote[] = [
  {
    person: '조지 워싱턴',
    portrait: washingtonPortrait,
    text: '자유는 일단 뿌리를 내리기 시작하면 빠르게 자라는 식물이다.',
    source: '제임스 매디슨에게 보낸 편지, 1788',
  },
  {
    person: '토머스 제퍼슨',
    portrait: jeffersonPortrait,
    text: '나는 책 없이는 살 수 없다.',
    source: '존 애덤스에게 보낸 편지, 1815',
  },
  {
    person: '존 애덤스',
    portrait: adamsPortrait,
    text: '사실은 완고한 것이다. 우리의 바람이 무엇이든, 사실과 증거의 상태는 바꿀 수 없다.',
    source: '보스턴 학살 재판 변론, 1770',
  },
  {
    person: '제임스 매디슨',
    portrait: madisonPortrait,
    text: '인간이 천사라면 정부는 필요 없을 것이다.',
    source: '『페더럴리스트』 51호, 1788',
  },
  {
    person: '에드워드 그레이',
    portrait: greyPortrait,
    text: '유럽 전역에서 등불이 꺼지고 있다. 우리 생애에 다시 켜지는 것을 보지 못할 것이다.',
    source: '1914년 8월 3일, 영국 참전 전야',
  },
  {
    person: '임칙서',
    portrait: linZexuPortrait,
    text: '나라에 이롭다면 목숨을 걸 것이니, 어찌 화와 복을 따져 피하거나 좇겠는가.',
    source: '「부수등정구점시가인」, 1842',
  },
]

const QUOTE_INTERVAL_MS = 6000

/**
 * 최소 노출 시간 — 두 줄짜리 명언과 출처까지 읽을 수 있는 정도(1600은 짧았다 — 2026-10-07 사용자
 * "조금 더 길게"). 늘리면 매 진입이 그만큼 느려진다.
 */
export const MIN_LOADING_MS = 2400

/** 마운트 시점부터 `ms` 뒤에 풀리는 약속 — 본문이 `use()`로 기다린다. */
export type LoadingGate = Promise<void>

export const createLoadingGate = (ms: number): LoadingGate =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })

/** 진입마다 무작위 시작 — 늘 같은 인물이면 금세 배경이 된다. 움직임 줄이기면 교체하지 않는다. */
function useRotatingQuoteIndex(length: number, intervalMs: number) {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * length))

  useEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) return undefined
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % length)
    }, intervalMs)
    return () => window.clearInterval(timer)
  }, [length, intervalMs])

  return index
}

/* ───────────────────────── 무대 ───────────────────────── */

/*
 * 장식은 두지 않는다 — 따옴표 장식·액자 링·그림자·구분선·캡션을 걷어낸 뒤의 형태다
 * (2026-10-07 사용자: "더 깔끔해야 함"). 초상·글·이름·바 네 요소만, 간격으로만 묶는다.
 */

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`

const riseIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`

/**
 * 지면(S.Page) 높이 전체를 채우고 그 **정중앙**에 놓는다. Page가 고정 높이의 스크롤 컨테이너라
 * min-height: 100%가 성립한다. 아래 패딩을 조금 더 주어 시각 중심(기하 중심보다 약간 위)에 맞춘다.
 */
const Stage = styled.div`
  box-sizing: border-box;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 40px;
  padding: 40px 24px 64px;
  animation: ${fadeIn} 0.25s ease-out both;

  @media (prefers-reduced-motion: reduce) {
    animation-duration: 0.01s;
  }
`

/* key가 바뀌면(다음 인물) 한 덩어리로 다시 떠오른다. */
const QuoteCard = styled.figure`
  margin: 0;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;

  @media (prefers-reduced-motion: no-preference) {
    animation: ${riseIn} 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
`

/*
 * 흑백 — 유화·판화·사진이 섞여 색온도가 제각각이라, 색을 빼야 한 벌로 보인다.
 * 테두리 대신 1px 안쪽 선으로만 지면과 가른다.
 */
const Portrait = styled.img`
  display: block;
  width: 64px;
  height: 64px;
  margin-bottom: 24px;
  border-radius: 50%;
  object-fit: cover;
  filter: grayscale(1) contrast(1.05);
  outline: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  outline-offset: -1px;
`

const QuoteText = styled.blockquote`
  margin: 0;
  font-family: 'Noto Serif KR', 'Nanum Myeongjo', serif;
  font-size: 18px;
  font-weight: 500;
  line-height: 1.75;
  word-break: keep-all;
  text-wrap: balance;
  color: ${({ theme }) => theme.colors.text.primary};

  @media (max-width: 480px) {
    font-size: 16.5px;
  }
`

/* 이름 · 출처 한 줄 — 좁으면 자연스럽게 두 줄로 접힌다. */
const Attribution = styled.figcaption`
  margin-top: 14px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  column-gap: 8px;
  font-size: 12.5px;
  line-height: 1.6;
`

const AttributionName = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const AttributionSource = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};

  &::before {
    content: '·';
    margin-right: 8px;
  }
`

/* ───────────────────────── 로딩 바 ───────────────────────── */

const slide = keyframes`
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(250%);
  }
`

const LoadingBar = styled.div`
  width: 96px;
  height: 2px;
  border-radius: 2px;
  overflow: hidden;
  background: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

const LoadingBarFill = styled.div`
  width: 40%;
  height: 100%;
  border-radius: 2px;
  /* 무채색 — 화면에서 색은 초상조차 뺐으니 바도 따른다. */
  background: ${({ theme }) => theme.colors.text.secondary};
  transform: translateX(-100%);

  @media (prefers-reduced-motion: no-preference) {
    animation: ${slide} 1.3s cubic-bezier(0.45, 0, 0.25, 1) infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    width: 100%;
    transform: none;
    opacity: 0.35;
  }
`

const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
`
