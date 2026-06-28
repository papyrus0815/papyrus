import styled from 'styled-components'

import { useThemeStore } from '@/shared/styles/theme.store'

import {
  type AvatarFramePayload,
  type BadgeFramePayload,
  type GradeThemePayload,
  type NicknameColorPayload,
  type ProfileThemePayload,
  avatarFrameStyle,
  nicknameColor,
} from './cosmetics'
import { type ItemCategory } from './wallet.api'

interface CosmeticPreviewProps {
  category: ItemCategory
  /** ShopItem/UserItem.payload (JSON, unknown) */
  payload: unknown
  /** 아바타·닉네임 프리뷰에 쓸 표시명 */
  sampleName?: string
  /** 아바타/배경 크기(px) */
  size?: number
}

/**
 * 코스메틱을 "실제로" 렌더해 보여주는 공용 프리뷰.
 * 상점 카드 썸네일·인벤토리 썸네일·내 모습 미리보기에서 공유한다.
 */
export function CosmeticPreview({
  category,
  payload,
  sampleName = '나',
  size = 56,
}: CosmeticPreviewProps) {
  const isDark = useThemeStore((state) => state.mode === 'dark')
  const initial = (sampleName.trim().charAt(0) || '나').toUpperCase()

  switch (category) {
    case 'AVATAR_FRAME':
      return (
        <PreviewAvatar style={{ width: size, height: size, ...avatarFrameStyle(payload as AvatarFramePayload) }}>
          {initial}
        </PreviewAvatar>
      )
    case 'NICKNAME_COLOR':
      return (
        <PreviewName style={{ color: nicknameColor(payload as NicknameColorPayload, isDark) }}>
          {sampleName}
        </PreviewName>
      )
    case 'GRADE_THEME': {
      const grade = (payload ?? {}) as GradeThemePayload
      return (
        <PreviewGradeChip style={{ background: grade.bgGradient, color: grade.fgColor }}>
          GOLD
        </PreviewGradeChip>
      )
    }
    case 'BADGE_FRAME': {
      const badge = (payload ?? {}) as BadgeFramePayload
      return (
        <PreviewBadge style={{ border: badge.borderStyle, boxShadow: badge.shadowEffect }}>★</PreviewBadge>
      )
    }
    case 'PROFILE_THEME': {
      const profile = (payload ?? {}) as ProfileThemePayload
      const background = profile.bgGradient ?? profile.bgSolidColor ?? '#64748b'
      return <PreviewProfile style={{ background, height: size }} />
    }
    default:
      return null
  }
}

const PreviewAvatar = styled.div`
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 18px;
  background: ${({ theme }) => theme.colors.activeLight};
  color: ${({ theme }) => theme.colors.primary};
  flex-shrink: 0;
`

const PreviewName = styled.div`
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.01em;
`

const PreviewGradeChip = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 5px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #fff;
`

const PreviewBadge = styled.span`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: ${({ theme }) => theme.colors.warning};
  background: ${({ theme }) => theme.colors.background.tertiary};
`

const PreviewProfile = styled.div`
  width: 100%;
  border-radius: 10px;
`
