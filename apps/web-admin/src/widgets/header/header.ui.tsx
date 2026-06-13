import React, { useMemo, useState } from 'react'

import {
  FiAward,
  FiBriefcase,
  FiGlobe,
  FiLayers,
  FiMap,
  FiMoon,
  FiSearch,
  FiSun,
} from 'react-icons/fi'
import { useLocation, useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { pathKeys } from '@/shared/router'
import { useThemeStore } from '@/shared/styles/theme.store'
import { Z_INDEX } from '@/shared/styles/z-index'
import { useCommandPaletteStore } from '@/widgets/command-palette'
import { DASHBOARD_MENU_ITEMS } from '@/widgets/content-shell/model/dashboard-menu-items'

import { MobileNav } from './mobile-nav.ui'
import { NotificationBell } from './notification-bell.ui'
import { SoundSettings } from './sound-settings.ui'
import { TopNavBar, type TopNavItemSpec } from './top-nav.ui'
import { UserMenu } from './user-menu.ui'

// macOS 여부 — 단축키 표기(⌘ vs Ctrl)에 사용. navigator.platform은 deprecated이라
// userAgentData.platform 우선, 없으면 userAgent 문자열로 폴백.
const detectIsMac = (): boolean => {
  if (typeof navigator === 'undefined') return false
  const uaData = (
    navigator as Navigator & { userAgentData?: { platform?: string } }
  ).userAgentData
  const source = uaData?.platform || navigator.userAgent
  return /Mac/i.test(source)
}

const Header: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { mode, toggleTheme } = useThemeStore()
  const openCommandPalette = useCommandPaletteStore((state) => state.openPalette)
  const playClickSound = useClickSound()
  const isMac = useMemo(detectIsMac, [])

  const [isBellOpen, setIsBellOpen] = useState(false)
  const [isUserOpen, setIsUserOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // 국가 브라우즈(/country)와 국가 상세(/country/:id/*) 모두 "국가" 메뉴를 활성 표시
  const isCountryBrowseActive = /^\/country(\/|$)/.test(location.pathname)

  const dashboardItemToSpec = (
    item: (typeof DASHBOARD_MENU_ITEMS)[number],
  ): TopNavItemSpec => {
    const Icon = item.icon
    return {
      key: `dashboard-${item.id}`,
      label: item.label,
      icon: (
        <span style={{ width: 16, height: 16, display: 'inline-flex' }}>
          <Icon />
        </span>
      ),
      onClick: () => {
        playClickSound()
        navigate(item.path)
      },
      active: item.matchPath(location.pathname),
    }
  }

  const personItem = DASHBOARD_MENU_ITEMS.find((item) => item.id === 'person')
  const restDashboardItems = DASHBOARD_MENU_ITEMS.filter(
    (item) => item.id !== 'person',
  )

  const menuItems: TopNavItemSpec[] = [
    {
      key: 'countries',
      label: '국가',
      icon: <FiMap size={16} />,
      onClick: () => {
        playClickSound()
        navigate(pathKeys.country())
      },
      active: isCountryBrowseActive,
    },
    {
      key: 'events',
      label: '사건',
      icon: <FiLayers size={16} />,
      onClick: () => {
        playClickSound()
        navigate('/events')
      },
      active: location.pathname.startsWith('/events'),
    },
    ...(personItem ? [dashboardItemToSpec(personItem)] : []),
    ...restDashboardItems.map(dashboardItemToSpec),
    {
      key: 'continents',
      label: '대륙',
      icon: <FiGlobe size={16} />,
      onClick: () => {
        playClickSound()
        navigate(pathKeys.continents())
      },
      active: location.pathname.startsWith('/continents'),
    },
    {
      key: 'heads-of-state',
      label: '수장 비교',
      icon: <FiAward size={16} />,
      onClick: () => {
        playClickSound()
        navigate(pathKeys.headsOfState())
      },
      active: location.pathname.startsWith('/heads-of-state'),
    },
    {
      key: 'companies',
      label: '기업',
      icon: <FiBriefcase size={16} />,
      onClick: () => {
        playClickSound()
        navigate('/companies')
      },
      active: location.pathname.startsWith('/companies'),
    },
  ]

  return (
    <HeaderBar>
      <LeftZone>
        <MobileNav
          isOpen={isMobileMenuOpen}
          onOpen={() => setIsMobileMenuOpen(true)}
          onClose={() => setIsMobileMenuOpen(false)}
          items={menuItems}
          playClickSound={playClickSound}
        />
        <LogoButton
          onClick={() => {
            playClickSound()
            navigate('/')
          }}
          aria-label="홈으로 이동"
        >
          Papyrus
        </LogoButton>
      </LeftZone>

      <CenterZone>
        <TopNavBar items={menuItems} />
      </CenterZone>

      <RightZone>
        <SearchTrigger
          type="button"
          onClick={() => {
            playClickSound()
            openCommandPalette()
          }}
          aria-label="국가 검색"
        >
          <FiSearch size={14} />
          <SearchTriggerLabel>국가 검색</SearchTriggerLabel>
          <SearchTriggerKbd>{isMac ? '⌘' : 'Ctrl'}K</SearchTriggerKbd>
        </SearchTrigger>

        <ThemeToggleButton
          aria-label={mode === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
          $isDark={mode === 'dark'}
          onClick={() => {
            playClickSound()
            toggleTheme()
          }}
        >
          {mode === 'dark' ? <FiSun size={16} /> : <FiMoon size={16} />}
        </ThemeToggleButton>

        <SoundSettings
          isOpen={isSettingsOpen}
          onToggle={() => setIsSettingsOpen((prev) => !prev)}
          onClose={() => setIsSettingsOpen(false)}
          playClickSound={playClickSound}
        />

        <NotificationBell
          isOpen={isBellOpen}
          onToggle={() => setIsBellOpen((prev) => !prev)}
          onClose={() => setIsBellOpen(false)}
          playClickSound={playClickSound}
        />

        <UserMenu
          isOpen={isUserOpen}
          onToggle={() => setIsUserOpen((prev) => !prev)}
          onClose={() => setIsUserOpen(false)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          playClickSound={playClickSound}
        />
      </RightZone>
    </HeaderBar>
  )
}

export default Header

/**
 * 고정(fixed) 헤더 — 반투명 글래스 배경 + 블러로 스크롤 콘텐츠가
 * 비쳐 보이는 문제를 막고 트렌디한 frosted-glass 룩을 준다.
 */
const HeaderBar = styled.header`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--header-height, 64px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  z-index: ${Z_INDEX.HEADER};
  background: ${({ theme }) => theme.colors.header.primary};
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  box-shadow: 0 1px 2px ${({ theme }) => theme.colors.shadow.sm};
  transition:
    background 0.25s ease,
    border-color 0.25s ease;
`

const LeftZone = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
`

const CenterZone = styled.div`
  flex: 1;
  /* flex 아이템 기본 min-width:auto면 내부 nav가 컨텐츠 크기 미만으로 못 줄어
     좌우 영역을 밀어낸다. 0으로 풀어 nav가 자체 overflow-x로 처리하게 한다. */
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;

  @media (max-width: 768px) {
    display: none;
  }
`

const RightZone = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`

const SearchTrigger = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 10px 0 12px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition:
    background 0.18s ease,
    color 0.18s ease,
    border-color 0.18s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.border.medium};
  }

  @media (max-width: 640px) {
    padding: 0;
    width: 34px;
    justify-content: center;
  }
`

const SearchTriggerLabel = styled.span`
  font-size: 12px;
  font-weight: 500;
  letter-spacing: -0.01em;

  @media (max-width: 640px) {
    display: none;
  }
`

const SearchTriggerKbd = styled.kbd`
  font-family: inherit;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 5px;
  border-radius: 4px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.tertiary};
  line-height: 1;

  @media (max-width: 640px) {
    display: none;
  }
`

const LogoButton = styled.button`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 700;
  font-size: 15px;
  letter-spacing: -0.02em;
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`

const ThemeToggleButton = styled.button<{ $isDark: boolean }>`
  position: relative;
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 14px;
  background: ${({ $isDark, theme }) =>
    $isDark ? theme.colors.background.secondary : 'transparent'};
  color: ${({ $isDark, theme }) =>
    $isDark ? theme.colors.warning : theme.colors.text.secondary};
  cursor: pointer;
  transition:
    background 0.25s ease,
    color 0.25s ease,
    transform 0.2s ease;

  &:hover {
    background: ${({ $isDark, theme }) =>
      $isDark ? theme.colors.background.tertiary : theme.colors.hover};
    color: ${({ $isDark, theme }) =>
      $isDark ? theme.colors.warning : theme.colors.text.primary};
  }

  &:active {
    transform: scale(0.92);
  }
`
