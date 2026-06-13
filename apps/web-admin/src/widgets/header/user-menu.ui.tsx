/**
 * 유저 메뉴 위젯 — 헤더 등급칩 + 아바타 트리거 + 데스크톱 드롭다운 + 모바일 모달.
 * 데스크톱·모바일이 동일한 본문(등급/진행도/뱃지/메뉴)을 공유해 기능 격차가 없다.
 */
import { useEffect, useMemo, useRef } from 'react'

import { useQuery } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import { FiAward, FiLogOut, FiUser } from 'react-icons/fi'
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
}

export function UserMenu({
  isOpen,
  onToggle,
  onClose,
  onOpenSettings,
  playClickSound,
}: UserMenuProps) {
  const navigate = useNavigate()
  const { username, reset } = useSessionStore()
  const { data: pointSummary } = useQuery(gamificationSummaryQueryOptions)
  const { data: badges } = useQuery(gamificationBadgesQueryOptions)
  const { data: account } = useQuery(sessionQueryOptions)

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
        <AvatarLg>{getAvatarInitial(shownName)}</AvatarLg>
        <div>
          <ProfileName>{shownName || '게스트'}</ProfileName>
          <ProfileRole>
            <GradeChip
              gradeCode={pointSummary?.gradeCode}
              points={pointSummary?.totalPoints}
            />
          </ProfileRole>
        </div>
      </ProfileHeader>
      {pointSummary && (
        <div style={{ padding: '0 14px' }}>
          <GradeProgressCard summary={pointSummary} />
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
            <BadgeList badges={earnedBadges} compact />
          ) : (
            <BadgeEmpty>콘텐츠를 등록하고 첫 뱃지를 획득해보세요!</BadgeEmpty>
          )}
        </BadgeSection>
      )}
      <Divider />
      <MenuItem role="menuitem" onClick={() => goTo(pathKeys.leaderboard())}>
        <FiAward size={14} /> 리더보드
      </MenuItem>
      <MenuItem role="menuitem" onClick={() => goTo(pathKeys.profile.root())}>
        <FiUser size={14} /> 내 프로필
      </MenuItem>
      <MenuItem
        role="menuitem"
        onClick={() => {
          playClickSound()
          onClose()
          onOpenSettings()
        }}
      >
        설정
      </MenuItem>
      <Divider />
      <MenuItem role="menuitem" onClick={handleLogout}>
        <FiLogOut size={14} /> 로그아웃
      </MenuItem>
    </>
  )

  return (
    <>
      {pointSummary && (
        <HeaderGradeSlot>
          <GradeChip
            gradeCode={pointSummary.gradeCode}
            points={pointSummary.totalPoints}
          />
        </HeaderGradeSlot>
      )}

      <div ref={containerRef} style={{ position: 'relative' }}>
        <UserButton
          aria-label="내 계정"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          onClick={() => {
            playClickSound()
            onToggle()
          }}
        >
          <Avatar>{getAvatarInitial(shownName)}</Avatar>
        </UserButton>

        <AnimatePresence>
          {isOpen && (
            <UserPanel role="menu" {...DROPDOWN_MOTION}>
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

const UserButton = styled(IconButton)`
  width: 34px;
  height: 34px;
  padding: 0;
  gap: 0;
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
