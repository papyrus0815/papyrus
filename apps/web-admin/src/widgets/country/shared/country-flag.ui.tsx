import { CSSProperties } from 'react'

import { getUploadImageUrl } from '@/shared/api/upload'

interface CountryFlagProps {
  thumbnailUrl?: string | null
  countryName: string
  size?: number | 'full'
  className?: string
  style?: CSSProperties
}

/**
 * 국가 국기 UI 컴포넌트
 * - 썸네일이 있으면 이미지 표시
 * - 없으면 기본 플래그 아이콘 표시
 * - size='full'이면 전체 너비 사용
 */
export function CountryFlag({
  thumbnailUrl,
  countryName,
  size = 32,
  className,
  style,
}: CountryFlagProps) {
  const isFull = size === 'full'
  const imageSize = typeof size === 'number' ? size : undefined

  if (thumbnailUrl) {
    return (
      <img
        src={getUploadImageUrl(thumbnailUrl)}
        alt={countryName}
        className={className}
        style={{
          width: isFull ? '100%' : imageSize,
          height: isFull ? '100%' : imageSize,
          objectFit: 'cover',
          ...style,
        }}
      />
    )
  }

  // 기본 플래그 아이콘 (size='full'일 때는 표시하지 않음)
  if (isFull) {
    return null
  }

  return (
    <svg
      width={imageSize}
      height={imageSize}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#9aa0a6"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  )
}
