/**
 * 건국·멸망 카드의 사진 조각 — 인물 얼굴(원), 국가 대표 이미지(둥근 사각), 사건 대표 사진.
 *
 * 인물(round)은 그림이 없거나 깨지면 이름 첫 글자로 같은 크기 자리를 채운다 — 세로로
 * 쌓이는 줄의 이름 시작 x가 들쭉날쭉하지 않게. 국기·사건 사진(rect)은 칩 줄 안에 있어
 * 정렬할 x가 없고, 글자 상자는 배지처럼 읽혀 그림이 없으면 아예 세우지 않는다.
 */
import { useState } from 'react'

import styled, { css } from 'styled-components'

import { getUploadImageUrl } from '@/shared/api/upload'

/** round = 인물 얼굴, rect = 국기·문장·사건 사진 */
type MediaShape = 'round' | 'rect'

interface FoundingThumbProps {
  src: string | null | undefined
  /** 대체 글자·alt에 쓰는 이름 */
  name: string
  shape: MediaShape
  size?: number
}

export function FoundingThumb({ src, name, shape, size = 28 }: FoundingThumbProps) {
  const { src: shown, onError } = useResolvedImage(src)
  const initial = name.trim().charAt(0) || '?'
  if (!shown && shape === 'rect') return null
  return (
    <ThumbFrame $shape={shape} $size={size} aria-hidden>
      {shown ? (
        <img src={shown} alt="" loading="lazy" onError={onError} />
      ) : (
        <span>{initial}</span>
      )}
    </ThumbFrame>
  )
}

/** 그림 URL이 있고 아직 깨지지 않았는지 — 히어로처럼 대체 글자로 메울 수 없는 자리용 */
export function useResolvedImage(src: string | null | undefined) {
  /* 깨진 주소를 기억한다 — 불린이면 다른 그림으로 바뀌어도 계속 숨는다 */
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null)
  const resolved = src ? getUploadImageUrl(src) || src : ''
  return {
    src: resolved && resolved !== brokenSrc ? resolved : '',
    onError: () => setBrokenSrc(resolved),
  }
}

const ThumbFrame = styled.span<{ $shape: MediaShape; $size: number }>`
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  /* 국가 그림은 대개 국기(3:2) — 정사각에 넣으면 양끝이 잘려 4:3으로 */
  width: ${({ $size, $shape }) => ($shape === 'round' ? $size : Math.round(($size * 4) / 3))}px;
  height: ${({ $size }) => $size}px;
  overflow: hidden;
  border-radius: ${({ $shape }) => ($shape === 'round' ? '50%' : '4px')};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#eef0f3')};
  box-shadow: inset 0 0 0 1px
    ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)')};
  font-size: ${({ $size }) => Math.round($size * 0.42)}px;
  font-weight: 700;
  line-height: 1;
  color: ${({ theme }) => theme.colors.text.secondary};
  /* 위아래 baseline 정렬 줄 안에서도 그림은 가운데 */
  align-self: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    ${({ $shape }) =>
      $shape === 'round' &&
      css`
        object-position: center 25%;
      `}
  }
`
