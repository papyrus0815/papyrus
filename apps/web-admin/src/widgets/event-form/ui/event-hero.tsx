/**
 * 사건 등록 폼의 머리 — **채워 가는 포스터(히어로)**.
 *
 * 예전 머리는 '표지 띠 + 밑줄 제목 칸'이라 서류 양식처럼 낡아 보였다. 이제 머리는 이 사건의 표지 그 자체다:
 * - 바탕: 표지 그림이 있으면 그림(아래로 어두워지는 막), 없으면 **고른 분야 색으로 물든 메시 그라데이션**이
 *   천천히 흐르고, 분야 아이콘이 크게 비친다(분야를 바꾸면 포스터 색이 바뀐다)
 * - 가운데: 제목·부제를 포스터 위에 흰 큰 글씨로 바로 쓴다(children)
 * - 위: 분야 배지·필수 진행 고리(topLeft) · 표지 올리기/바꾸기/제거(오른쪽)
 * - 아래: 기간·장소·참여국·상위 같은 **실시간 요약 알약**(footer) — 칸을 채울 때마다 하나씩 붙는다
 * 표지 그림은 포스터 어디에나 끌어 놓거나 ⌘V로 붙여 넣는다.
 */
import React, { useState } from 'react'

import type { IconType } from 'react-icons'
import { FiCamera, FiImage, FiTrash2 } from 'react-icons/fi'
import styled, { keyframes } from 'styled-components'

export interface EventHeroProps {
  /** 표지 그림 주소(업로드 전엔 blob: 미리보기) — 빈 문자열이면 그라데이션 포스터 */
  src: string
  uploading: boolean
  onPick: () => void
  onFile: (file: File) => void
  onRemove: () => void
  onImageError?: () => void
  /** 분야 색 'R, G, B' — 없으면 앱 남색 */
  toneRgb?: string | null
  /** 분야 아이콘 — 포스터 오른쪽 아래에 크게 비친다 */
  Icon?: IconType | null
  topLeft?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
}

export function EventHero({
  src,
  uploading,
  onPick,
  onFile,
  onRemove,
  onImageError,
  toneRgb,
  Icon,
  topLeft,
  footer,
  children,
}: EventHeroProps) {
  const [dragOver, setDragOver] = useState(false)
  const hasImage = Boolean(src)

  return (
    <Hero
      data-testid="event-cover-field"
      style={{ '--hero-rgb': toneRgb || '99, 102, 241' } as React.CSSProperties}
      onDragOver={(dragEvent) => {
        if (!Array.from(dragEvent.dataTransfer?.types ?? []).includes('Files')) return
        dragEvent.preventDefault()
        if (!dragOver) setDragOver(true)
      }}
      onDragLeave={(dragEvent) => {
        if (!dragEvent.currentTarget.contains(dragEvent.relatedTarget as Node | null)) setDragOver(false)
      }}
      onDrop={(dropEvent) => {
        const file = dropEvent.dataTransfer.files?.[0]
        if (!file) return
        dropEvent.preventDefault()
        setDragOver(false)
        onFile(file)
      }}
    >
      <Backdrop aria-hidden>
        {hasImage ? (
          <img key={src} src={src} alt="" onError={onImageError} />
        ) : (
          <>
            <Mesh />
            {Icon && (
              <Glyph>
                <Icon />
              </Glyph>
            )}
          </>
        )}
        <Grain />
        <Scrim $hasImage={hasImage} />
      </Backdrop>

      <TopBar>
        <TopLeft>{topLeft}</TopLeft>
        <CoverActions>
          {hasImage ? (
            <>
              <GlassButton type="button" onClick={onPick} aria-label="대표 이미지 바꾸기" aria-describedby="event-cover-hint">
                <FiCamera size={13} aria-hidden />
                {uploading ? '올리는 중…' : '표지 바꾸기'}
              </GlassButton>
              <GlassButton type="button" $danger aria-label="썸네일 제거" onClick={onRemove}>
                <FiTrash2 size={13} aria-hidden />
              </GlassButton>
            </>
          ) : (
            <GlassButton type="button" onClick={onPick} aria-label="대표 이미지 올리기" aria-describedby="event-cover-hint">
              <FiImage size={13} aria-hidden />
              표지 이미지
            </GlassButton>
          )}
        </CoverActions>
      </TopBar>

      <Body>{children}</Body>

      <Footer>
        {footer}
        <CoverHint id="event-cover-hint">
          {hasImage ? '대표 이미지 · 목록·상세 머리' : '표지: 끌어 놓기 · ⌘V · 10MB 이하'}
        </CoverHint>
      </Footer>

      {dragOver && (
        <DropVeil aria-hidden>
          <FiImage size={22} />
          여기에 놓아 표지로
        </DropVeil>
      )}
    </Hero>
  )
}

/* ───────────────────────── 움직임 ───────────────────────── */

const drift = keyframes`
  0% { background-position: 0% 0%, 100% 0%, 50% 100%; }
  50% { background-position: 30% 20%, 70% 30%, 40% 70%; }
  100% { background-position: 10% 40%, 90% 10%, 70% 90%; }
`

const float = keyframes`
  0%, 100% { transform: rotate(-14deg) translateY(0); }
  50% { transform: rotate(-10deg) translateY(-8px); }
`

const pillPop = keyframes`
  from { opacity: 0; transform: translateY(6px) scale(0.9); }
  to { opacity: 1; transform: none; }
`

const reveal = keyframes`
  from { opacity: 0; transform: scale(1.06); filter: blur(8px); }
  to { opacity: 1; transform: none; filter: blur(0); }
`

/** 포스터 위 실시간 요약 알약 — 칸을 채우면 하나씩 붙는다 */
export const HeroPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 100%;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(8px);
  color: rgba(255, 255, 255, 0.95);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (prefers-reduced-motion: no-preference) {
    animation: ${pillPop} 0.36s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }

  svg {
    flex: none;
  }
`

/* ───────────────────────── 조판 ───────────────────────── */

const Hero = styled.section`
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 232px;
  margin: 2px 0 12px;
  padding: 16px 20px 16px;
  overflow: hidden;
  border-radius: 20px;
  color: #fff;
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.08),
    0 18px 40px -18px rgba(var(--hero-rgb), 0.55);
  transition: box-shadow 0.4s ease;

  @media (max-width: 560px) {
    padding: 14px 14px 14px;
    border-radius: 16px;
  }
`

const Backdrop = styled.div`
  position: absolute;
  inset: 0;
  z-index: -1;
  background: #0b1020;

  > img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;

    @media (prefers-reduced-motion: no-preference) {
      animation: ${reveal} 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both;
    }
  }
`

/* 분야 색 덩어리 셋이 천천히 흐르는 바탕 — 분야를 바꾸면 첫 덩어리 색이 바뀐다 */
const Mesh = styled.span`
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(55% 75% at 20% 25%, rgba(var(--hero-rgb), 0.95) 0%, transparent 62%),
    radial-gradient(45% 65% at 85% 20%, rgba(56, 189, 248, 0.55) 0%, transparent 60%),
    radial-gradient(65% 85% at 65% 110%, rgba(168, 85, 247, 0.6) 0%, transparent 62%);
  background-size: 160% 160%, 160% 160%, 160% 160%;
  background-repeat: no-repeat;
  transition: background-image 0.6s ease;

  @media (prefers-reduced-motion: no-preference) {
    animation: ${drift} 18s ease-in-out infinite alternate;
  }
`

const Glyph = styled.span`
  position: absolute;
  right: -18px;
  bottom: -34px;
  display: inline-flex;
  color: rgba(255, 255, 255, 0.1);
  transform: rotate(-14deg);

  svg {
    width: 190px;
    height: 190px;
    stroke-width: 1.4;
  }

  @media (prefers-reduced-motion: no-preference) {
    animation: ${float} 9s ease-in-out infinite;
  }
`

/* 필름 결 — 그라데이션이 매끈한 플라스틱처럼 보이지 않게 */
const Grain = styled.span`
  position: absolute;
  inset: 0;
  opacity: 0.18;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
`

const Scrim = styled.span<{ $hasImage: boolean }>`
  position: absolute;
  inset: 0;
  background: ${({ $hasImage }) =>
    $hasImage
      ? 'linear-gradient(180deg, rgba(2, 6, 23, 0.55) 0%, rgba(2, 6, 23, 0.5) 45%, rgba(2, 6, 23, 0.86) 100%)'
      : 'linear-gradient(180deg, rgba(2, 6, 23, 0.1) 0%, rgba(2, 6, 23, 0) 40%, rgba(2, 6, 23, 0.35) 100%)'};
`

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
`

const TopLeft = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-width: 0;
`

const CoverActions = styled.div`
  display: inline-flex;
  gap: 6px;
  flex: none;
`

const GlassButton = styled.button<{ $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 11px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.24);
  background: rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(10px);
  color: #fff;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.15s ease,
    transform 0.12s ease;

  &:hover {
    background: ${({ $danger }) => ($danger ? 'rgba(220, 38, 38, 0.85)' : 'rgba(255, 255, 255, 0.26)')};
  }
  &:active {
    transform: scale(0.95);
  }
  &:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 2px;
  }
`

const Body = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  flex: 1;
  min-width: 0;
`

const Footer = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-width: 0;
`

const CoverHint = styled.span`
  margin-left: auto;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  white-space: nowrap;

  @media (max-width: 560px) {
    display: none;
  }
`

const DropVeil = styled.div`
  position: absolute;
  inset: 8px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 14px;
  border: 2px dashed rgba(255, 255, 255, 0.8);
  background: rgba(2, 6, 23, 0.55);
  font-size: 14px;
  font-weight: 700;
  pointer-events: none;
`
