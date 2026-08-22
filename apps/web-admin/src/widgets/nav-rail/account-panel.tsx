/**
 * 좌측 하단 계정 패널 — 디스코드의 사용자 패널과 같은 자리·같은 구성.
 *
 * 레일 + 목록 사이드바 하단에 걸쳐 뜨는 카드다. 폭은 `--nav-rail-width`와
 * `--list-sidebar-width`(ContentAreaShell이 현재 지면 값으로 내려준다)의 합을 따르므로,
 * 사이드바가 없거나 접힌 지면에서는 저절로 좁아지고 컨테이너 쿼리로 이름·설정 아이콘이
 * 빠지며 **아바타만 남는다** — 어느 지면에서도 계정에 닿을 수 있다는 뜻이다.
 *
 * 겹침 방지: 레일과 목록 스크롤 영역이 `--user-panel-height`만큼 아래 여백을 갖는다
 * (nav-rail.ui / sidebar-list.styles).
 */
import React, { useState } from 'react'

import styled from 'styled-components'

import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { Z_INDEX } from '@/shared/styles/z-index'
import { DropdownPanel, IconButton } from '@/widgets/header/header-shared.ui'
import { SoundSettings } from '@/widgets/header/sound-settings.ui'
import { UserMenu } from '@/widgets/header/user-menu.ui'

export function AccountPanel() {
  const playClickSound = useClickSound()
  const [isUserOpen, setIsUserOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  return (
    <Panel aria-label="계정">
      <UserMenu
        compact
        variant="panel"
        isOpen={isUserOpen}
        onToggle={() => setIsUserOpen((prev) => !prev)}
        onClose={() => setIsUserOpen(false)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        playClickSound={playClickSound}
      />

      <Actions>
        <SoundSettings
          isOpen={isSettingsOpen}
          onToggle={() => setIsSettingsOpen((prev) => !prev)}
          onClose={() => setIsSettingsOpen(false)}
          playClickSound={playClickSound}
        />
      </Actions>
    </Panel>
  )
}

const Panel = styled.div`
  position: fixed;
  left: 8px;
  bottom: 8px;
  width: calc(
    var(--nav-rail-width, 72px) + var(--list-sidebar-width, 0px) - 16px
  );
  height: var(--user-panel-height, 60px);
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  border-radius: 14px;
  z-index: ${Z_INDEX.NAV};
  container: user-panel / inline-size;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? '#181818' : theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  box-shadow: 0 4px 14px ${({ theme }) => theme.colors.shadow.sm};
  transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  /* 패널은 화면 맨 아래라 드롭다운(사운드·계정)이 아래로 열리면 뷰포트를 벗어난다.
     헤더 시절 규약(top:44px/right:0)을 위로 펴지도록 덮어쓴다. */
  ${DropdownPanel} {
    top: auto;
    bottom: calc(100% + 10px);
    right: auto;
    left: 0;
    transform-origin: left bottom;
  }

  /* 액션 아이콘을 패널 높이에 맞춘다 */
  ${IconButton} {
    width: 36px;
    height: 36px;
    border-radius: 10px;
  }
`

/** 좁아지면(사이드바 없음/접힘) 아이콘을 접고 아바타만 남긴다 */
const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;

  @container user-panel (max-width: 150px) {
    display: none;
  }
`
