/**
 * 참여 주체의 '얼굴' — 참여국은 국기 타일, 참여 인물은 얼굴 원.
 *
 * 예전엔 참여국·인물 행이 이름 글자뿐이라('프랑스', '나폴레옹 외젠 보나파르트') 서류 칸 목록처럼 보였고,
 * 동명이인·같은 이름의 현대/역사 국가를 행 안에서 가를 수 없었다. 행 머리에 국기/얼굴과
 * 한 줄 신원(현대·역사 · 존속 기간 / 생몰 · 국적)을 붙인다.
 */
import React, { useState } from 'react'

import styled from 'styled-components'

import { getUploadImageUrl } from '@/shared/api/upload'

/** 국기 타일 — 현대 국가는 국기 이모지, 역사 국가(국기 없음)는 이름 첫 글자 */
export function CountryTile({
  flagEmoji,
  name,
  historical,
}: {
  flagEmoji?: string | null
  name: string
  historical?: boolean
}) {
  const flag = flagEmoji?.trim()
  return (
    <Tile aria-hidden $historical={Boolean(historical) && !flag}>
      {flag ? <span className="flag">{flag}</span> : <span className="mono">{name.trim().charAt(0) || '?'}</span>}
    </Tile>
  )
}

/** 얼굴 원 — 사진이 있으면 사진(위쪽 맞춤), 없거나 깨지면 이름 첫 글자 */
export function PersonFace({ src, name, size = 36 }: { src?: string | null; name: string; size?: number }) {
  const [broken, setBroken] = useState<string | null>(null)
  const url = src ? getUploadImageUrl(src) || src : null
  const showImage = Boolean(url) && broken !== url
  return (
    <Face aria-hidden style={size !== 36 ? { width: size, height: size, fontSize: Math.round(size * 0.4) } : undefined}>
      {showImage && url ? (
        <img src={url} alt="" onError={() => setBroken(url)} />
      ) : (
        <span>{name.trim().charAt(0) || '?'}</span>
      )}
    </Face>
  )
}

/** 이름 + 아래 한 줄 신원 */
export const IdentityText = styled.span`
  display: inline-flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
`

export const IdentityMeta = styled.span`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0 6px;
  font-size: 11.5px;
  font-weight: 500;
  line-height: 1.4;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};

  > * + *::before {
    content: '·';
    margin-right: 6px;
    opacity: 0.7;
  }
`

const Tile = styled.span<{ $historical: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => (theme.mode === 'dark' ? '#2f2f33' : '#e2e8f0')};
  background: ${({ $historical, theme }) =>
    $historical
      ? theme.mode === 'dark'
        ? 'linear-gradient(160deg, rgba(217, 119, 6, 0.22), rgba(217, 119, 6, 0.1))'
        : 'linear-gradient(160deg, #fef3c7, #fde68a66)'
      : theme.mode === 'dark'
        ? '#212121'
        : '#f8fafc'};

  .flag {
    font-size: 22px;
    line-height: 1;
  }
  .mono {
    font-size: 15px;
    font-weight: 800;
    color: ${({ theme }) => (theme.mode === 'dark' ? '#fbbf24' : '#b45309')};
  }
`

const Face = styled.span`
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 36px;
  height: 36px;
  overflow: hidden;
  border-radius: 50%;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'linear-gradient(160deg, #2a2a2e 0%, #1f1f23 100%)'
      : 'linear-gradient(160deg, #eef0f6 0%, #e3e7f0 100%)'};
  box-shadow:
    0 0 0 2px ${({ theme }) => (theme.mode === 'dark' ? '#1a1a1a' : '#ffffff')},
    0 0 0 3px ${({ theme }) => (theme.mode === 'dark' ? '#2f2f33' : '#e2e8f0')};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
  }
  span {
    font-size: inherit;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`
