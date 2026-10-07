import styled, { css, keyframes } from 'styled-components'

import { RADIUS, ledgerAccent, ledgerHairline } from '@/entities/event/ui/ledger-tokens'

import * as S from '../styles'

/**
 * 사건 상세 진입 로딩 — **지면 골격**.
 *
 * 예전에는 빈 상자 한가운데 28px 스피너 + "불러오는 중…"이었다. 데이터가 오면 그 자리가
 * 통째로 제목·장부·본문으로 바뀌어, 눈이 화면 가운데에서 좌상단 제목으로 튀었다.
 * 골격은 실제 지면과 **같은 격자**(S.Page → S.PageInner → S.Body, hero/aside/main)를 쓰므로
 * 제목·연도·본문이 나타날 자리가 미리 잡혀 있고, 좁은 폭에서 장부가 위로 올라가는
 * 배치도 그대로 따라간다.
 *
 * - 상단 2.5px 띠: 읽기 진행률 바(ReadingProgress)와 같은 자리·두께의 indeterminate 바.
 *   로딩이 끝나면 같은 자리에서 진행률 바로 이어진다.
 * - 깜빡임 방지: 캐시가 있거나 응답이 빠르면 골격이 한 프레임 번쩍이고 사라진다. 전체를
 *   REVEAL_DELAY 동안 투명하게 두었다가 페이드인한다 — 빠른 진입에선 아예 보이지 않는다.
 * - 쉬머: 뼈대마다 따로 흐르면 물결이 제각각이라 어수선하다. 그라디언트를
 *   `background-attachment: fixed`로 뷰포트에 묶어 모든 뼈대를 **한 줄기 빛**이 함께 지나간다.
 * - prefers-reduced-motion: 바·쉬머 모두 멈추고 정적인 골격만 남긴다.
 */
export function EventDetailLoading() {
  return (
    <S.Page>
      <TopBar aria-hidden>
        <TopBarFill />
      </TopBar>
      <S.PageInner>
        <Reveal role="status" aria-live="polite" aria-busy="true">
          <VisuallyHidden>사건 정보를 불러오는 중…</VisuallyHidden>
          <S.Body aria-hidden>
            <HeroSlot>
              <Line>
                <Bone $width="52px" $height="12px" />
                <Bone $width="64px" $height="18px" $radius={RADIUS.PILL} />
              </Line>
              <Stack $gap="10px">
                <Bone $width="72%" $height="34px" />
                <Bone $width="44%" $height="34px" />
              </Stack>
              <Stack $gap="9px" $top="4px">
                <Bone $width="100%" $height="14px" />
                <Bone $width="96%" $height="14px" />
                <Bone $width="58%" $height="14px" />
              </Stack>
            </HeroSlot>

            <AsideSlot>
              <Bone $width="96px" $height="30px" />
              <Bone $width="168px" $height="13px" />
              <FactRows>
                {FACT_VALUE_WIDTHS.map((valueWidth, index) => (
                  <FactRow key={index}>
                    <Bone $width="40px" $height="11px" />
                    <Bone $width={valueWidth} $height="13px" />
                  </FactRow>
                ))}
              </FactRows>
            </AsideSlot>

            <MainSlot>
              {SECTION_LINE_WIDTHS.map((lineWidths, sectionIndex) => (
                <Stack key={sectionIndex} $gap="10px">
                  <Bone $width="48px" $height="11px" />
                  <Bone $width="128px" $height="20px" $bottom="8px" />
                  {lineWidths.map((lineWidth, lineIndex) => (
                    <Bone key={lineIndex} $width={lineWidth} $height="14px" />
                  ))}
                </Stack>
              ))}
            </MainSlot>
          </S.Body>
        </Reveal>
      </S.PageInner>
    </S.Page>
  )
}

/* 줄 길이가 모두 같으면 '글'이 아니라 '막대 그래프'로 읽힌다 — 끝줄을 짧게 끊는다. */
const FACT_VALUE_WIDTHS = ['62%', '78%', '54%', '70%', '46%']
const SECTION_LINE_WIDTHS = [
  ['100%', '98%', '100%', '94%', '62%'],
  ['100%', '97%', '71%'],
]

const REVEAL_DELAY = '180ms'

/* ───────────────────────── 상단 indeterminate 바 ───────────────────────── */

const slide = keyframes`
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(250%);
  }
`

/* ReadingProgress Track과 같은 자리·두께 — 로딩이 끝나면 같은 선이 진행률로 이어진다. */
const TopBar = styled.div`
  position: sticky;
  top: 0;
  z-index: 6;
  width: 100%;
  height: 2.5px;
  overflow: hidden;
  pointer-events: none;
`

const TopBarFill = styled.div`
  width: 40%;
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(
    90deg,
    transparent,
    ${({ theme }) => ledgerAccent(theme.mode)} 30%,
    ${({ theme }) => ledgerAccent(theme.mode)} 70%,
    transparent
  );
  transform: translateX(-100%);

  @media (prefers-reduced-motion: no-preference) {
    animation: ${slide} 1.3s cubic-bezier(0.45, 0, 0.25, 1) infinite;
  }

  /* 움직임을 끈 환경에선 흐르는 대신 옅은 정지선 하나만 남긴다. */
  @media (prefers-reduced-motion: reduce) {
    width: 100%;
    transform: none;
    opacity: 0.35;
  }
`

/* ───────────────────────── 골격 ───────────────────────── */

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`

const Reveal = styled.div`
  animation: ${fadeIn} 0.24s ease-out ${REVEAL_DELAY} both;

  @media (prefers-reduced-motion: reduce) {
    animation-duration: 0.01s;
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

const shimmer = keyframes`
  from {
    background-position: 100% 0;
  }
  to {
    background-position: 0 0;
  }
`

/*
 * 바탕은 다크에서 라이트보다 두텁게(레포 다크 알파 규약) — 0.04대는 잉크 바탕에서 사라진다.
 * 빛 줄기는 라이트=더 옅게(흰 지면 위 빛), 다크=더 밝게.
 */
const boneTone = css`
  ${({ theme }) => {
    const dark = theme.mode === 'dark'
    const base = dark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.055)'
    const glint = dark ? 'rgba(255,255,255,0.13)' : 'rgba(15,23,42,0.025)'
    return css`
      background-color: ${base};
      background-image: linear-gradient(90deg, ${base} 30%, ${glint} 50%, ${base} 70%);
      background-size: 300% 100%;
      background-attachment: fixed;
      background-repeat: no-repeat;
    `
  }}
`

const Bone = styled.span<{
  $width: string
  $height: string
  $radius?: string
  $top?: string
  $bottom?: string
}>`
  display: block;
  flex-shrink: 0;
  width: ${({ $width }) => $width};
  max-width: 100%;
  height: ${({ $height }) => $height};
  margin-top: ${({ $top }) => $top ?? '0'};
  margin-bottom: ${({ $bottom }) => $bottom ?? '0'};
  border-radius: ${({ $radius }) => $radius ?? RADIUS.SM};
  ${boneTone}

  @media (prefers-reduced-motion: no-preference) {
    animation: ${shimmer} 1.6s ease-in-out infinite;
  }
`

const Line = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const Stack = styled.div<{ $gap: string; $top?: string }>`
  display: flex;
  flex-direction: column;
  gap: ${({ $gap }) => $gap};
  margin-top: ${({ $top }) => $top ?? '0'};
`

/* 격자 영역 이름은 S.Body의 hero/aside/main — 실제 지면과 같은 칸에 놓인다. */
const HeroSlot = styled.div`
  grid-area: hero;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-bottom: 32px;
`

const AsideSlot = styled.div`
  grid-area: aside;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const FactRows = styled.div`
  margin-top: 8px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const FactRow = styled.div`
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const MainSlot = styled.div`
  grid-area: main;
  min-width: 0;
  max-width: 720px;
  display: flex;
  flex-direction: column;
  gap: 56px;
`
