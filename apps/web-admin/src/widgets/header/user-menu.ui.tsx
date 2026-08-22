/**
 * 유저 메뉴 위젯 — 헤더 등급칩 + 아바타 트리거 + 데스크톱 드롭다운 + 모바일 모달.
 * 데스크톱·모바일이 동일한 본문(등급/진행도/뱃지/메뉴)을 공유해 기능 격차가 없다.
 */
import { useEffect, useMemo, useRef } from 'react'

import { useQuery } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import { FiArchive, FiAward, FiHome, FiLogOut, FiShoppingBag, FiUser } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import {
  BadgeList,
  GradeChip,
  GradeProgressCard,
  gamificationBadgesQueryOptions,
  gamificationSummaryQueryOptions,
} from '@/entities/gamification'
import { sessionQueryOptions, useSessionStore } from '@/entities/session'
import {
  avatarFrameStyle,
  nicknameColor,
  useEquippedCosmetics,
  walletMeQueryOptions,
} from '@/entities/wallet'
import { useThemeStore } from '@/shared/styles/theme.store'
import { useOnClickOutside } from '@/shared/hooks/use-on-click-outside.hook'
import { pathKeys } from '@/shared/router'

import {
  AvatarLg,
  Avatar,
  Divider,
  DROPDOWN_MOTION,
  DropdownPanel,
  getAvatarInitial,
  IconButton,
  MenuItem,
  MobileModalShell,
  ProfileHeader,
  ProfileName,
  ProfileRole,
} from './header-shared.ui'

interface UserMenuProps {
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
  onOpenSettings: () => void
  playClickSound: () => void
  /**
   * 좁은 좌측 레일용 — 트리거를 아바타 하나로 줄인다.
   * 파피 잔액·등급 칩은 72px 레일에 들어가지 않고, 두 값 모두 드롭다운 안에 이미 있다.
   */
  compact?: boolean
  /**
   * 'panel' — 좌측 하단 계정 패널(디스코드식). 아바타 + 이름/등급을 가로로 편 넓은 트리거.
   * 폭이 좁아지면(사이드바 없는 지면) 자동으로 아바타만 남는다.
   */
  variant?: 'icon' | 'panel'
}

export function UserMenu({
  isOpen,
  onToggle,
  onClose,
  onOpenSettings,
  playClickSound,
  compact = false,
  variant = 'icon',
}: UserMenuProps) {
  const navigate = useNavigate()
  const { username, reset } = useSessionStore()
  const { data: pointSummary } = useQuery(gamificationSummaryQueryOptions)
  const { data: badges } = useQuery(gamificationBadgesQueryOptions)
  const { data: account } = useQuery(sessionQueryOptions)
  const { data: wallet } = useQuery(walletMeQueryOptions)
  const cosmetics = useEquippedCosmetics()
  const isDark = useThemeStore((state) => state.mode === 'dark')
  const avatarStyle = avatarFrameStyle(cosmetics.avatarFrame)
  const nameColor = nicknameColor(cosmetics.nicknameColor, isDark)

  // 화면 표시명: 닉네임(displayName) 우선, 없으면 로그인 ID(store username)로 폴백
  const shownName = account?.displayName || username || ''
  const earnedBadges = useMemo(
    () => (badges ?? []).filter((badge) => badge.earned),
    [badges],
  )

  const containerRef = useRef<HTMLDivElement | null>(null)

  useOnClickOutside(containerRef, () => {
    if (isOpen) onClose()
  })

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  const goTo = (path: string) => {
    playClickSound()
    onClose()
    navigate(path)
  }

  const handleLogout = () => {
    playClickSound()
    reset()
    onClose()
    navigate('/login', { replace: true })
  }

  const body = (
    <>
      <ProfileHeader>
        <AvatarLg style={avatarStyle}>{getAvatarInitial(shownName)}</AvatarLg>
        <div>
          <ProfileName style={{ color: nameColor }}>{shownName || '게스트'}</ProfileName>
          <ProfileRole>
            <GradeChip
              gradeCode={pointSummary?.gradeCode}
              points={pointSummary?.totalPoints}
              cosmetic={cosmetics.gradeTheme}
            />
          </ProfileRole>
        </div>
      </ProfileHeader>
      {pointSummary && (
        <div style={{ padding: '0 14px' }}>
          <GradeProgressCard summary={pointSummary} cosmetic={cosmetics.gradeTheme} />
        </div>
      )}
      {badges && badges.length > 0 && (
        <BadgeSection>
          <BadgeSectionHead>
            <span>뱃지</span>
            <span>
              {earnedBadges.length}/{badges.length}
            </span>
          </BadgeSectionHead>
          {earnedBadges.length > 0 ? (
            <BadgeList badges={earnedBadges} compact frame={cosmetics.badgeFrame} />
          ) : (
            <BadgeEmpty>콘텐츠를 등록하고 첫 뱃지를 획득해보세요!</BadgeEmpty>
          )}
        </BadgeSection>
      )}
      <Divider />
      <MenuItem onClick={() => goTo(pathKeys.leaderboard())}>
        <FiAward size={14} /> 리더보드
      </MenuItem>
      <MenuItem onClick={() => goTo(pathKeys.shop())}>
        <FiShoppingBag size={14} /> 파피 상점
      </MenuItem>
      <MenuItem onClick={() => goTo(pathKeys.collection())}>
        <FiArchive size={14} /> 유물관
      </MenuItem>
      <MenuItem onClick={() => goTo(pathKeys.profile.root())}>
        <FiUser size={14} /> 내 프로필
      </MenuItem>
      {account?.id && (
        <MenuItem onClick={() => goTo(pathKeys.publicProfile(account.id))}>
          <FiHome size={14} /> 내 방
        </MenuItem>
      )}
      <MenuItem
        onClick={() => {
          playClickSound()
          onClose()
          onOpenSettings()
        }}
      >
        설정
      </MenuItem>
      <Divider />
      <MenuItem onClick={handleLogout}>
        <FiLogOut size={14} /> 로그아웃
      </MenuItem>
    </>
  )

  return (
    <>
      {!compact && wallet && (
        <HeaderPapySlot type="button" onClick={() => goTo(pathKeys.shop())} title="파피 상점">
          🪙 {wallet.balance.toLocaleString()}
        </HeaderPapySlot>
      )}
      {!compact && pointSummary && (
        <HeaderGradeSlot>
          <GradeChip
            gradeCode={pointSummary.gradeCode}
            points={pointSummary.totalPoints}
            cosmetic={cosmetics.gradeTheme}
          />
        </HeaderGradeSlot>
      )}

      <div
        ref={containerRef}
        style={
          variant === 'panel'
            ? // 패널 모드에서는 트리거가 남은 폭을 다 먹어야 액션 아이콘이 우측에 붙는다
              { position: 'relative', flex: 1, minWidth: 0 }
            : { position: 'relative' }
        }
      >
        {variant === 'panel' ? (
          <PanelTrigger
            aria-label="내 계정"
            aria-haspopup="menu"
            aria-expanded={isOpen}
            onClick={() => {
              playClickSound()
              onToggle()
            }}
          >
            <PanelAvatarWrap>
              <Avatar style={avatarStyle}>{getAvatarInitial(shownName)}</Avatar>
              {/* 접속 표시 — 디스코드의 온라인 점. 지금은 항상 온라인. */}
              <StatusDot aria-hidden />
            </PanelAvatarWrap>
            <PanelText>
              {/* 닉네임 코스메틱 색은 쓰지 않는다 — 사용자가 고른 값이라 패널 배경과 대비가
                  보장되지 않는다(실제로 라이트 모드에서 #f9fafb가 나와 이름이 안 보였다).
                  코스메틱 색은 바로 위 드롭다운 ProfileHeader와 프로필 지면에서 보인다. */}
              <PanelName>{shownName || '게스트'}</PanelName>
              <PanelMeta>
                {pointSummary
                  ? `${pointSummary.totalPoints.toLocaleString()}P`
                  : '온라인'}
              </PanelMeta>
            </PanelText>
          </PanelTrigger>
        ) : (
          <UserButton
            aria-label="내 계정"
            aria-haspopup="menu"
            aria-expanded={isOpen}
            onClick={() => {
              playClickSound()
              onToggle()
            }}
          >
            <Avatar style={avatarStyle}>{getAvatarInitial(shownName)}</Avatar>
          </UserButton>
        )}

        <AnimatePresence>
          {isOpen && (
            <UserPanel {...DROPDOWN_MOTION}>
              {body}
            </UserPanel>
          )}
        </AnimatePresence>

        <MobileModalShell
          isOpen={isOpen}
          title="프로필"
          onClose={onClose}
          playClickSound={playClickSound}
        >
          {body}
        </MobileModalShell>
      </div>
    </>
  )
}

const HeaderGradeSlot = styled.div`
  display: inline-flex;
  align-items: center;

  @media (max-width: 768px) {
    display: none;
  }
`

const HeaderPapySlot = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  @media (max-width: 768px) {
    display: none;
  }
`

const UserButton = styled(IconButton)`
  width: 34px;
  height: 34px;
  padding: 0;
  gap: 0;
`

/** 좌측 하단 계정 패널의 트리거 — 아바타 + 이름/등급을 가로로 편 넓은 버튼 */
const PanelTrigger = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
  padding: 4px 6px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.active};
    outline-offset: -2px;
  }
`

const PanelAvatarWrap = styled.span`
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
`

const StatusDot = styled.span`
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.background.secondary};
`

/** 이름·등급 — 패널이 좁아지면(사이드바 없는 지면) 통째로 사라지고 아바타만 남는다 */
const PanelText = styled.span`
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.25;

  @container user-panel (max-width: 150px) {
    display: none;
  }
`

const PanelName = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const PanelMeta = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const UserPanel = styled(DropdownPanel)`
  width: 240px;
`

const BadgeSection = styled.div`
  padding: 8px 14px 2px;
`

const BadgeSectionHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: 6px;
`

const BadgeEmpty = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  line-height: 1.5;
`
