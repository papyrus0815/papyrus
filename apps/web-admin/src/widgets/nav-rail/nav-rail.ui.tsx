/**
 * 좌측 전역 내비게이션 레일 — 디스코드의 서버 레일과 같은 자리·같은 역할.
 *
 * 상단 헤더를 대체한다. 상단 바가 없어지므로 `--header-height`는 0이고, 대신
 * `--nav-rail-width`만큼 본문이 오른쪽으로 밀린다(app/css.ts).
 *
 * 구성(위→아래):
 *   홈(Papyrus) → 구분선 → 내비 11개(넘치면 이 구간만 스크롤) → 구분선 →
 *   검색(⌘K) · 알림 · 테마
 *
 * 사운드·계정은 레일이 아니라 **하단 계정 패널**(AccountPanel)에 있다 — 디스코드와 같은 자리.
 *
 * 헤더에 있던 드롭다운은 그대로 재사용하되, 레일에서는 아래로 열릴 자리가 없으므로
 * **오른쪽으로** 열리도록 컨테이너에서 위치만 덮어쓴다(DropdownPanel 컴포넌트 셀렉터).
 */
import React, { useMemo, useState } from 'react'

import { FiMoon, FiSearch, FiSun } from 'react-icons/fi'
import { useLocation, useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { useThemeStore } from '@/shared/styles/theme.store'
import { Z_INDEX } from '@/shared/styles/z-index'
import { useCommandPaletteStore } from '@/widgets/command-palette'
import { DropdownPanel, IconButton } from '@/widgets/header/header-shared.ui'
import { NotificationBell } from '@/widgets/header/notification-bell.ui'
import { useNavItems } from '@/widgets/header/use-nav-items'

import { RailButton } from './rail-button'

/** macOS 여부 — 단축키 표기(⌘ vs Ctrl). userAgentData 우선, 없으면 userAgent 폴백. */
const detectIsMac = (): boolean => {
  if (typeof navigator === 'undefined') return false
  const uaData = (
    navigator as Navigator & { userAgentData?: { platform?: string } }
  ).userAgentData
  const source = uaData?.platform || navigator.userAgent
  return /Mac/i.test(source)
}

export function NavRail() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { mode, toggleTheme } = useThemeStore()
  const openCommandPalette = useCommandPaletteStore((state) => state.openPalette)
  const playClickSound = useClickSound()
  const isMac = useMemo(detectIsMac, [])
  const items = useNavItems()

  const [isBellOpen, setIsBellOpen] = useState(false)

  return (
    <Rail aria-label="전역 내비게이션">
      <RailButton
        label="홈"
        $accent
        active={pathname === '/'}
        icon={<HomeMark>P</HomeMark>}
        onClick={() => {
          playClickSound()
          navigate('/')
        }}
      />

      <Divider />

      <NavScroll>
        {items.map((item) => (
          <RailButton
            key={item.key}
            label={item.label}
            icon={item.icon}
            active={item.active}
            onClick={item.onClick}
          />
        ))}
      </NavScroll>

      <Divider />

      <Utilities>
        <RailButton
          label={`국가 검색 (${isMac ? '⌘' : 'Ctrl'}K)`}
          icon={<FiSearch size={19} />}
          onClick={() => {
            playClickSound()
            openCommandPalette()
          }}
        />

        <NotificationBell
          isOpen={isBellOpen}
          onToggle={() => setIsBellOpen((prev) => !prev)}
          onClose={() => setIsBellOpen(false)}
          playClickSound={playClickSound}
        />

        <RailButton
          label={mode === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
          icon={mode === 'dark' ? <FiSun size={19} /> : <FiMoon size={19} />}
          onClick={() => {
            playClickSound()
            toggleTheme()
          }}
        />
      </Utilities>
    </Rail>
  )
}

const Rail = styled.nav`
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: var(--nav-rail-width, 72px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  /* 하단 계정 패널(AccountPanel)이 fixed로 겹치므로 그만큼 비워둔다 */
  padding: 10px 0 calc(var(--user-panel-height, 52px) + 16px);
  z-index: ${Z_INDEX.HEADER};
  /* 표면 톤 계단의 가장 진한 층 — 사이드바(#151515 / secondary)보다 한 단계 더 어둡다 */
  background: ${({ theme }) =>
    theme.mode === 'dark' ? '#0b0b0b' : '#e7eaf0'};
  border-right: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'};

  /* 레일 안의 드롭다운은 아래로 열릴 자리가 없다 — 오른쪽·아래 기준으로 편다.
     (헤더 시절 top:44px/right:0 규약을 여기서만 덮어쓴다) */
  ${DropdownPanel} {
    top: auto;
    bottom: 0;
    right: auto;
    left: calc(100% + 10px);
    transform-origin: left bottom;
  }

  /* 알림·사운드·사용자는 헤더용 트리거(IconButton)를 그대로 재사용한다 —
     레일에서는 다른 버튼과 같은 원형이어야 하므로 모양만 맞춘다. */
  ${IconButton} {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'};
    transition:
      border-radius 0.16s ease,
      background 0.16s ease,
      color 0.16s ease;

    &:hover {
      border-radius: 17px;
      background: ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'};
    }

    @media (max-width: 640px) {
      width: 42px;
      height: 42px;
    }
  }
`

/** 내비 구간만 스크롤 — 항목이 11개라 짧은 화면에서 넘친다. 홈·유틸리티는 고정. */
const NavScroll = styled.div`
  flex: 1;
  min-height: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
`

const Utilities = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
  flex-shrink: 0;
`

const Divider = styled.div`
  width: 32px;
  height: 1px;
  flex-shrink: 0;
  background: ${({ theme }) => theme.colors.border.default};
`

/** 홈 버튼 안의 로고 글자 — 아이콘 대신 워드마크 첫 글자 */
const HomeMark = styled.span`
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1;
`
