import { type CSSProperties } from 'react'

import { useQuery } from '@tanstack/react-query'

import {
  type ItemCategory,
  walletItemsQueryOptions,
  visitedCosmeticsQueryOptions,
} from './wallet.api'

// ── payload 타입 (ShopItem.payload JSON 미러, 모두 옵셔널·방어적) ──────────────
export interface AvatarFramePayload {
  borderColor?: string
  borderWidth?: number
  shadowColor?: string
  shadowBlur?: number
}
export interface NicknameColorPayload {
  lightValue?: string
  darkValue?: string
}
export interface ProfileThemePayload {
  bgGradient?: string
  bgImageUrl?: string
  bgSolidColor?: string
}
export interface GradeThemePayload {
  bgGradient?: string
  fgColor?: string
}
export interface BadgeFramePayload {
  borderStyle?: string
  shadowEffect?: string
}

export interface EquippedCosmetics {
  avatarFrame: AvatarFramePayload | null
  nicknameColor: NicknameColorPayload | null
  profileTheme: ProfileThemePayload | null
  gradeTheme: GradeThemePayload | null
  badgeFrame: BadgeFramePayload | null
}

/** 내 인벤토리(UserItem)·방문 코스메틱(EquippedCosmetic) 공통으로 다루기 위한 최소 형태 */
type CosmeticLike = { category: string; payload: unknown; equipped?: boolean }

function payloadOf<T>(items: CosmeticLike[] | undefined, category: ItemCategory): T | null {
  // 방문 응답(EquippedCosmetic)은 장착분만 오므로 equipped 필드가 없다 → 없으면 장착으로 간주.
  const found = (items ?? []).find(
    (item) => (item.equipped ?? true) && item.category === category,
  )
  if (!found || typeof found.payload !== 'object' || found.payload === null) return null
  return found.payload as unknown as T
}

/**
 * 장착 코스메틱(스킨).
 * - accountId 미지정: 내 것(GET /wallet/items) — 헤더·내 프로필.
 * - accountId 지정: 그 사람 방 방문 시 방 주인의 장착분(GET /wallet/equipped/:accountId).
 */
export function useEquippedCosmetics(accountId?: string): EquippedCosmetics {
  const visiting = !!accountId
  const mine = useQuery({ ...walletItemsQueryOptions, enabled: !visiting })
  const visited = useQuery(visitedCosmeticsQueryOptions(accountId ?? ''))
  const items: CosmeticLike[] | undefined = visiting ? visited.data : mine.data
  return {
    avatarFrame: payloadOf<AvatarFramePayload>(items, 'AVATAR_FRAME'),
    nicknameColor: payloadOf<NicknameColorPayload>(items, 'NICKNAME_COLOR'),
    profileTheme: payloadOf<ProfileThemePayload>(items, 'PROFILE_THEME'),
    gradeTheme: payloadOf<GradeThemePayload>(items, 'GRADE_THEME'),
    badgeFrame: payloadOf<BadgeFramePayload>(items, 'BADGE_FRAME'),
  }
}

/** 아바타 프레임 인라인 스타일 (border + box-shadow). 미장착이면 빈 객체. */
export function avatarFrameStyle(frame: AvatarFramePayload | null): CSSProperties {
  if (!frame) return {}
  const style: CSSProperties = {}
  if (frame.borderColor) style.border = `${frame.borderWidth ?? 2}px solid ${frame.borderColor}`
  if (frame.shadowColor) style.boxShadow = `0 0 ${frame.shadowBlur ?? 12}px ${frame.shadowColor}`
  return style
}

/** 닉네임 색상 (라이트/다크 대응). 미장착이면 undefined → 기본 색 유지. */
export function nicknameColor(color: NicknameColorPayload | null, isDark: boolean): string | undefined {
  if (!color) return undefined
  return isDark ? color.darkValue ?? color.lightValue : color.lightValue ?? color.darkValue
}

/** 프로필 배경 CSS background 값. 미장착이면 undefined → 기본 배경 유지. */
export function profileBackground(theme: ProfileThemePayload | null): string | undefined {
  if (!theme) return undefined
  if (theme.bgGradient) return theme.bgGradient
  if (theme.bgSolidColor) return theme.bgSolidColor
  if (theme.bgImageUrl) return `url(${theme.bgImageUrl}) center / cover no-repeat`
  return undefined
}
