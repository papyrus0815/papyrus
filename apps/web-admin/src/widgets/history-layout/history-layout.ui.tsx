import React, { useEffect, useMemo, useState } from 'react'

import { AnimatePresence, motion } from 'framer-motion'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import { useCountries } from '@/features/country/api'
import { OVERLAY_STYLES, Z_INDEX } from '@/shared/styles/z-index'

// 로컬 스토리지 키
const SIDEBAR_COLLAPSED_KEY = 'history-layout-sidebar-collapsed'

/**
 * HistoryLayout 컴포넌트
 * 히스토리 페이지의 레이아웃을 담당
 * - 데스크톱: 좌측 사이드바
 * - 모바일: 하단 탭바 + 가운데 FAB 버튼 (국가 페이지에서만)
 * - 사이드바 배지: 현재 로그인 계정 소유 데이터만 표시
 */
export default function HistoryLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const isActive = (path: string) => location.pathname.startsWith(path)
  const [showMenu, setShowMenu] = useState(false) // 가운데 버튼 메뉴 표시 상태

  const { data: countries } = useCountries()
  const countryCount = countries?.length ?? 0
  const continentCount = useMemo(
    () =>
      new Set(
        (countries ?? []).map((c) => c.continentId).filter(Boolean),
      ).size,
    [countries],
  )

  // 로컬 스토리지에서 사이드바 접힘 상태 복원
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
      return saved ? JSON.parse(saved) : false
    } catch {
      return false
    }
  })

  // 사이드바 접힘 상태 변경 시 로컬 스토리지에 저장
  useEffect(() => {
    try {
      localStorage.setItem(
        SIDEBAR_COLLAPSED_KEY,
        JSON.stringify(isSidebarCollapsed),
      )
    } catch {
      // ignore
    }
  }, [isSidebarCollapsed])

  return (
    <Root $collapsed={isSidebarCollapsed}>
      {/* 데스크톱 좌측 사이드바 (1024px 이상에서 표시) */}
      <SidebarWrapper>
        <Sidebar $collapsed={isSidebarCollapsed}>
          <AnimatePresence mode="wait">
            {!isSidebarCollapsed && (
              <motion.div
                key="expanded"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  height: '100%',
                  overflow: 'auto',
                }}
              >
                <SidebarSection>
                  <SidebarGroupTitle>히스토리</SidebarGroupTitle>

                  <SidebarItem
                    as={Link}
                    to="/history/country"
                    $active={isActive('/history/country')}
                  >
                    <SidebarIcon>
                      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2c1.7 0 3.25.62 4.45 1.64-.53.18-1.12.36-1.45.36-1 0-2-.5-3.5-.5-.86 0-1.6.17-2.22.44C9.73 4.67 10.83 4 12 4z" />
                      </svg>
                    </SidebarIcon>
                    <SidebarLabel>국가</SidebarLabel>
                    <Badge>{countryCount}</Badge>
                  </SidebarItem>

                  <SidebarItem
                    as={Link}
                    to="/history/continents"
                    $active={isActive('/history/continents')}
                  >
                    <SidebarIcon>
                      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 8h-4V5h-2v5H7v2h4v5h2v-5h4v-2z" />
                      </svg>
                    </SidebarIcon>
                    <SidebarLabel>대륙</SidebarLabel>
                    <Badge>{continentCount}</Badge>
                  </SidebarItem>

                  <SidebarItem
                    as={Link}
                    to="/history/dynasties"
                    $active={isActive('/history/dynasties')}
                  >
                    <SidebarIcon>
                      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                    </SidebarIcon>
                    <SidebarLabel>가문</SidebarLabel>
                    <Badge>0</Badge>
                  </SidebarItem>

                  <SidebarItem
                    as={Link}
                    to="/history/jobs"
                    $active={isActive('/history/jobs')}
                  >
                    <SidebarIcon>
                      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <rect
                          x="2"
                          y="7"
                          width="20"
                          height="14"
                          rx="2"
                          ry="2"
                        />
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                      </svg>
                    </SidebarIcon>
                    <SidebarLabel>직업</SidebarLabel>
                    <Badge>0</Badge>
                  </SidebarItem>

                  {/* 역사적 국가는 국가 탭에 통합됨 */}
                  {/* <SidebarItem
            as={Link}
            to="/history/historical-country"
            $active={isActive('/history/historical-country')}
          >
            <SidebarIcon>
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </SidebarIcon>
            <SidebarLabel>역사적 국가</SidebarLabel>
            <Badge>0</Badge>
          </SidebarItem> */}
                </SidebarSection>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 접힌 상태일 때 아이콘만 표시 - 애니메이션 완전 제거 */}
          {isSidebarCollapsed && (
            <CollapsedIcons>
              <CollapsedIconItem
                as={motion.button}
                onClick={() => navigate('/history/country')}
                $active={isActive('/history/country')}
                title="국가"
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2c1.7 0 3.25.62 4.45 1.64-.53.18-1.12.36-1.45.36-1 0-2-.5-3.5-.5-.86 0-1.6.17-2.22.44C9.73 4.67 10.83 4 12 4z" />
                </svg>
              </CollapsedIconItem>

              <CollapsedIconItem
                as={motion.button}
                onClick={() => navigate('/history/continents')}
                $active={isActive('/history/continents')}
                title="대륙"
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 8h-4V5h-2v5H7v2h4v5h2v-5h4v-2z" />
                </svg>
              </CollapsedIconItem>

              <CollapsedIconItem
                as={motion.button}
                onClick={() => navigate('/history/dynasties')}
                $active={isActive('/history/dynasties')}
                title="가문"
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </CollapsedIconItem>

              <CollapsedIconItem
                as={motion.button}
                onClick={() => navigate('/history/jobs')}
                $active={isActive('/history/jobs')}
                title="직업"
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
              </CollapsedIconItem>
            </CollapsedIcons>
          )}
        </Sidebar>

        {/* 사이드바 접기/펼치기 버튼 - Sidebar 외부에 배치 */}
        <CollapseButton
          as={motion.button}
          type="button"
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          $collapsed={isSidebarCollapsed}
          title={isSidebarCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        >
          <motion.svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            animate={{ rotate: isSidebarCollapsed ? 180 : 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <path d="M15 18l-6-6 6-6" />
          </motion.svg>
        </CollapseButton>
      </SidebarWrapper>

      {/* 모바일 하단 탭바 (1024px 이하에서 표시) */}
      <MobileBottomTabBar>
        {/* 국가 탭 버튼 */}
        <TabBarItem
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          onClick={() => navigate('/history/country')}
          $active={isActive('/history/country')}
        >
          <TabBarIcon $active={isActive('/history/country')}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2c1.7 0 3.25.62 4.45 1.64-.53.18-1.12.36-1.45.36-1 0-2-.5-3.5-.5-.86 0-1.6.17-2.22.44C9.73 4.67 10.83 4 12 4z" />
            </svg>
          </TabBarIcon>
          <TabBarLabel $active={isActive('/history/country')}>국가</TabBarLabel>
          {/* 활성 상태일 때 상단 인디케이터 표시 */}
          {isActive('/history/country') && <ActiveIndicator />}
        </TabBarItem>

        {/* 가문 탭 버튼 */}
        <TabBarItem
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          onClick={() => navigate('/history/dynasties')}
          $active={isActive('/history/dynasties')}
        >
          <TabBarIcon $active={isActive('/history/dynasties')}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </TabBarIcon>
          <TabBarLabel $active={isActive('/history/dynasties')}>
            가문
          </TabBarLabel>
          {isActive('/history/dynasties') && <ActiveIndicator />}
        </TabBarItem>

        {/* 직업 탭 버튼 */}
        <TabBarItem
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          onClick={() => navigate('/history/jobs')}
          $active={isActive('/history/jobs')}
        >
          <TabBarIcon $active={isActive('/history/jobs')}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
          </TabBarIcon>
          <TabBarLabel $active={isActive('/history/jobs')}>직업</TabBarLabel>
          {isActive('/history/jobs') && <ActiveIndicator />}
        </TabBarItem>

        {/* 가운데 FAB 버튼 (국가 페이지에서만 표시) */}
        {isActive('/history/country') && (
          <CenterFabWrapper>
            {/* 보기 모드 전환 FAB 버튼 */}
            <CenterFab
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              onClick={() => setShowMenu(!showMenu)}
            >
              <motion.svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                animate={{ rotate: showMenu ? 180 : 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                {/* 그리드 아이콘 (4개 사각형) */}
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
              </motion.svg>
            </CenterFab>
          </CenterFabWrapper>
        )}

        {/* 대륙 탭 버튼 */}
        <TabBarItem
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          onClick={() => navigate('/history/continents')}
          $active={isActive('/history/continents')}
        >
          <TabBarIcon $active={isActive('/history/continents')}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 8h-4V5h-2v5H7v2h4v5h2v-5h4v-2z" />
            </svg>
          </TabBarIcon>
          <TabBarLabel $active={isActive('/history/continents')}>
            대륙
          </TabBarLabel>
          {/* 활성 상태일 때 상단 인디케이터 표시 */}
          {isActive('/history/continents') && <ActiveIndicator />}
        </TabBarItem>
      </MobileBottomTabBar>

      {/* 메뉴 열렸을 때 전체 화면 오버레이 (클릭하면 메뉴 닫기) */}
      <AnimatePresence>
        {showMenu && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowMenu(false)}
          />
        )}
      </AnimatePresence>

      {/* 보기 모드 선택 퀵 메뉴 (오버레이 위에 표시) */}
      <AnimatePresence>
        {showMenu && isActive('/history/country') && (
          <QuickMenu
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <MenuTitle>보기 모드</MenuTitle>

            {/* 대시보드 모드 버튼 */}
            <MenuItem
              type="button"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation()
                window.dispatchEvent(
                  new CustomEvent('switchViewMode', {
                    detail: 'dashboard',
                  }),
                )
                setShowMenu(false)
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
              </svg>
              대시보드
            </MenuItem>

            {/* 목록 모드 버튼 */}
            <MenuItem
              type="button"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation()
                window.dispatchEvent(
                  new CustomEvent('switchViewMode', { detail: 'list' }),
                )
                setShowMenu(false)
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
              </svg>
              목록
            </MenuItem>
          </QuickMenu>
        )}
      </AnimatePresence>

      {/* 페이지 컨텐츠 영역 */}
      <Content>
        <Outlet />
      </Content>
    </Root>
  )
}

/* ============================================
   레이아웃 컴포넌트 스타일
   ============================================ */

/**
 * Root 컨테이너
 * - 데스크톱: 좌측 사이드바 + 컨텐츠 영역 (그리드 레이아웃)
 * - 모바일: 단일 컬럼 + 하단 탭바
 * - 사이드바 접기 상태에 따라 그리드 컬럼 너비 조정
 */
const Root = styled.div<{ $collapsed?: boolean }>`
  width: 100%;
  min-height: 100vh;
  display: grid;
  grid-template-columns: ${({ $collapsed }) =>
    $collapsed ? '60px minmax(0, 1fr)' : '10% minmax(0, 1fr)'};
  column-gap: 0;
  padding: var(--header-height) 0 0;
  background: var(--surface);
  background-image: var(--gradient-subtle);
  transition: grid-template-columns 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    padding: var(--header-height) 0 env(safe-area-inset-bottom);
    padding-bottom: calc(70px + env(safe-area-inset-bottom));
  }
`

/**
 * 사이드바 래퍼 - 버튼을 포함하는 컨테이너
 */
const SidebarWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: flex-start;

  @media (max-width: 1024px) {
    display: none;
  }
`

/* 데스크톱 좌측 사이드바 */
const Sidebar = styled.aside<{ $collapsed?: boolean }>`
  position: sticky;
  top: var(--header-height);
  align-self: start;
  height: calc(100vh - var(--header-height));
  padding: 12px 8px;
  border-right: 1px solid rgba(173, 70, 255, 0.12);
  background: linear-gradient(180deg, #fefefe 0%, #fafbfc 100%);
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-shadow:
    2px 0 16px rgba(173, 70, 255, 0.04),
    1px 0 4px rgba(0, 0, 0, 0.02),
    inset -1px 0 0 rgba(255, 255, 255, 0.8);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  width: ${({ $collapsed }) => ($collapsed ? '60px' : '100%')};
  min-width: ${({ $collapsed }) => ($collapsed ? '60px' : '100%')};
  max-width: ${({ $collapsed }) => ($collapsed ? '60px' : '100%')};
  position: relative; /* CollapsedIcons의 absolute 위치 기준점 */

  @media (max-width: 1024px) {
    display: none; /* 태블릿/모바일에서는 숨기고 MobileSidebar 사용 */
  }
`

/**
 * 사이드바 접기/펼치기 버튼 - SidebarWrapper 기준으로 중앙에 배치
 */
const CollapseButton = styled.button<{ $collapsed?: boolean }>`
  position: absolute;
  top: 50%;
  left: ${({ $collapsed }) =>
    $collapsed ? 'calc(60px - 18px)' : 'calc(100% - 18px)'};
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid rgba(173, 70, 255, 0.15);
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 100;
  transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow:
    0 4px 16px rgba(173, 70, 255, 0.2),
    0 2px 8px rgba(0, 0, 0, 0.1),
    0 0 0 4px rgba(255, 255, 255, 0.95),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);

  &::before {
    content: '';
    position: absolute;
    inset: -6px;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      rgba(173, 70, 255, 0.1) 0%,
      transparent 70%
    );
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
    border-color: var(--color-primary);
    box-shadow:
      0 6px 24px rgba(173, 70, 255, 0.3),
      0 3px 12px rgba(0, 0, 0, 0.12),
      0 0 0 4px rgba(255, 255, 255, 0.98),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);

    &::before {
      opacity: 1;
    }
  }

  &:active {
    box-shadow:
      0 2px 10px rgba(173, 70, 255, 0.25),
      0 1px 5px rgba(0, 0, 0, 0.1),
      0 0 0 4px rgba(255, 255, 255, 0.95),
      inset 0 1px 0 rgba(255, 255, 255, 0.7);
  }

  svg {
    width: 18px;
    height: 18px;
    transition: transform 0.2s ease;
    filter: drop-shadow(0 1px 2px rgba(173, 70, 255, 0.3));
  }
`

/**
 * 접힌 상태의 아이콘 목록
 */
const CollapsedIcons = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  width: 100%;
  position: absolute;
  top: 8px;
  left: 0;
  right: 0;
`

/**
 * 접힌 상태의 아이콘 아이템
 */
const CollapsedIconItem = styled.button<{ $active?: boolean }>`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: none;
  background: ${({ $active }) =>
    $active
      ? 'linear-gradient(135deg, rgba(173, 70, 255, 0.15) 0%, rgba(173, 70, 255, 0.08) 100%)'
      : 'transparent'};
  color: ${({ $active }) => ($active ? 'var(--color-primary)' : '#5f6368')};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${({ $active }) =>
    $active
      ? '0 2px 8px rgba(173, 70, 255, 0.15), 0 1px 3px rgba(0, 0, 0, 0.06)'
      : 'none'};

  svg {
    width: 24px;
    height: 24px;
    transition: all 0.25s ease;
    filter: ${({ $active }) =>
      $active ? 'drop-shadow(0 2px 4px rgba(173, 70, 255, 0.3))' : 'none'};
  }

  /* 활성 상태 인디케이터 */
  &::before {
    content: '';
    position: absolute;
    left: -8px;
    top: 50%;
    transform: translateY(-50%);
    width: 4px;
    height: ${({ $active }) => ($active ? '60%' : '0%')};
    border-radius: 0 4px 4px 0;
    background: linear-gradient(180deg, var(--color-primary) 0%, #9146ff 100%);
    opacity: ${({ $active }) => ($active ? 1 : 0)};
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: ${({ $active }) =>
      $active ? '0 2px 8px rgba(173, 70, 255, 0.4)' : 'none'};
  }

  /* 활성 상태 글로우 효과 */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 12px;
    background: radial-gradient(
      circle at center,
      rgba(173, 70, 255, 0.2) 0%,
      transparent 70%
    );
    opacity: ${({ $active }) => ($active ? 1 : 0)};
    transition: opacity 0.3s ease;
    pointer-events: none;
  }

  &:hover {
    background: ${({ $active }) =>
      $active
        ? 'linear-gradient(135deg, rgba(173, 70, 255, 0.2) 0%, rgba(173, 70, 255, 0.12) 100%)'
        : 'rgba(173, 70, 255, 0.08)'};
    color: var(--color-primary);
    box-shadow:
      0 4px 12px rgba(173, 70, 255, 0.2),
      0 2px 6px rgba(0, 0, 0, 0.08);

    svg {
      filter: drop-shadow(0 2px 6px rgba(173, 70, 255, 0.4));
    }

    &::before {
      opacity: 1;
      height: 70%;
    }
  }

  &:active {
    box-shadow:
      0 1px 4px rgba(173, 70, 255, 0.15),
      0 1px 2px rgba(0, 0, 0, 0.06);
  }
`

/* ============================================
   모바일 하단 탭바 스타일
   ============================================ */

/**
 * 모바일 하단 탭바
 * - 1024px 이하에서만 표시
 * - 국가/대륙 탭 + 가운데 FAB 버튼
 */
const MobileBottomTabBar = styled.nav`
  display: none;

  @media (max-width: 1024px) {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 70px;
    padding-bottom: env(safe-area-inset-bottom);
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px) saturate(180%);
    border-top: 1px solid rgba(0, 0, 0, 0.08);
    z-index: ${Z_INDEX.STICKY_HEADER};
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
  }
`

const TabBarItem = styled(motion.button)<{ $active?: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  position: relative;
  text-decoration: none;
  /* transform은 framer-motion이 관리하므로 제외 */
  transition:
    color 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
`

const TabBarIcon = styled.div<{ $active?: boolean }>`
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ $active }) => ($active ? 'var(--color-primary)' : '#70757a')};
  transition: all 0.2s ease;

  svg {
    width: 24px;
    height: 24px;
  }

  ${TabBarItem}:hover & {
    transform: scale(1.05);
  }
`

const TabBarLabel = styled.span<{ $active?: boolean }>`
  font-size: 11px;
  font-weight: ${({ $active }) => ($active ? '700' : '600')};
  color: ${({ $active }) => ($active ? 'var(--color-primary)' : '#70757a')};
  letter-spacing: -0.01em;
  transition: all 0.2s ease;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
`

const ActiveIndicator = styled.div`
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 32px;
  height: 3px;
  background: linear-gradient(90deg, var(--color-primary), #9146ff);
  border-radius: 0 0 3px 3px;
  box-shadow: 0 2px 8px rgba(173, 70, 255, 0.4);
`

/* ============================================
   가운데 FAB 버튼 스타일
   ============================================ */

/* FAB 버튼 래퍼 */
const CenterFabWrapper = styled.div`
  position: relative;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 24px;
`

/**
 * 가운데 FAB (Floating Action Button)
 * - 국가 페이지에서만 표시
 * - 보기 모드 전환 메뉴 토글
 * - 3D 효과, 펄스 애니메이션 포함
 */
const CenterFab = styled(motion.button)`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 3px solid #ffffff;
  background: linear-gradient(135deg, #ad46ff 0%, #7c3aed 50%, #9146ff 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow:
    0 8px 20px rgba(173, 70, 255, 0.5),
    0 2px 8px rgba(0, 0, 0, 0.15),
    inset 0 -2px 8px rgba(0, 0, 0, 0.2),
    inset 0 2px 8px rgba(255, 255, 255, 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  top: -12px;

  /* 펄스 애니메이션 링 */
  &::before {
    content: '';
    position: absolute;
    top: -5px;
    left: -5px;
    right: -5px;
    bottom: -5px;
    border-radius: 50%;
    border: 2px solid var(--color-primary);
    opacity: 0;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0% {
      transform: scale(1);
      opacity: 0.6;
    }
    50% {
      transform: scale(1.1);
      opacity: 0;
    }
    100% {
      transform: scale(1);
      opacity: 0;
    }
  }

  &:hover {
    transform: translateY(-4px) scale(1.05);
    box-shadow:
      0 12px 28px rgba(173, 70, 255, 0.6),
      0 4px 12px rgba(0, 0, 0, 0.2),
      inset 0 -2px 8px rgba(0, 0, 0, 0.2),
      inset 0 2px 8px rgba(255, 255, 255, 0.3);
  }

  &:active {
    transform: translateY(-2px) scale(0.95);
  }

  svg {
    width: 28px;
    height: 28px;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
  }
`

/**
 * 모달 오버레이 (공용 스타일)
 * - 헤더 포함 전체 화면을 덮음
 * - 전역 상수를 사용하여 일관된 스타일 적용
 * - 모바일에서만 표시
 */
const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${OVERLAY_STYLES.BACKGROUND};
  z-index: ${Z_INDEX.DIALOG_OVERLAY};
  backdrop-filter: ${OVERLAY_STYLES.BACKDROP_FILTER};
  -webkit-backdrop-filter: ${OVERLAY_STYLES.BACKDROP_FILTER};
  display: none;

  @media (max-width: 1024px) {
    display: block;
  }
`

/**
 * 보기 모드 선택 퀵 메뉴
 * - FAB 버튼 위에 표시
 * - 대시보드/목록 모드 선택
 * - 오버레이 위에 표시되도록 z-index 조정
 */
const QuickMenu = styled(motion.div)`
  position: fixed;
  bottom: 90px;
  left: 50%;
  transform: translateX(-50%);
  background: #fff;
  border-radius: 16px;
  padding: 12px 0;
  box-shadow:
    0 12px 32px rgba(0, 0, 0, 0.2),
    0 4px 12px rgba(173, 70, 255, 0.15);
  z-index: ${Z_INDEX.DIALOG_CONTENT};
  min-width: 220px;
  border: 1px solid rgba(173, 70, 255, 0.1);
`

/* 메뉴 제목 */
const MenuTitle = styled.div`
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 600;
  color: #70757a;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

/**
 * 메뉴 아이템 버튼
 * - hover 시 오른쪽으로 이동 애니메이션
 * - 클릭 시 보기 모드 전환 이벤트 발생
 */
const MenuItem = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: #202124;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;

  svg {
    color: #5f6368;
    transition: color 0.15s ease;
  }

  &:hover {
    background: rgba(173, 70, 255, 0.08);
    color: var(--color-primary);

    svg {
      color: var(--color-primary);
    }
  }

  &:active {
    background: rgba(173, 70, 255, 0.12);
  }
`

const SidebarGroupTitle = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 16px 14px 8px;
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;

  &::before {
    content: '';
    width: 3px;
    height: 12px;
    background: linear-gradient(180deg, var(--color-primary) 0%, #9146ff 100%);
    border-radius: 2px;
  }
`

const SidebarItem = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  margin-bottom: 2px;
  border-radius: 12px;
  border: 1px solid transparent;
  position: relative;
  background: ${({ $active }) =>
    $active
      ? 'linear-gradient(135deg, rgba(173, 70, 255, 0.12) 0%, rgba(173, 70, 255, 0.06) 100%)'
      : 'transparent'};
  color: ${({ $active }) => ($active ? 'var(--color-primary)' : '#374151')};
  cursor: pointer;
  text-align: left;
  text-decoration: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${({ $active }) =>
    $active
      ? '0 2px 8px rgba(173, 70, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.5)'
      : 'none'};

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: ${({ $active }) => ($active ? '70%' : '0%')};
    border-radius: 0 3px 3px 0;
    background: linear-gradient(180deg, var(--color-primary) 0%, #9146ff 100%);
    opacity: ${({ $active }) => ($active ? 1 : 0)};
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: ${({ $active }) =>
      $active ? '0 0 12px rgba(173, 70, 255, 0.5)' : 'none'};
  }

  /* 호버 시 빛나는 효과 */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 12px;
    background: radial-gradient(
      circle at left center,
      rgba(173, 70, 255, 0.08) 0%,
      transparent 70%
    );
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }

  &:hover {
    background: ${({ $active }) =>
      $active
        ? 'linear-gradient(135deg, rgba(173, 70, 255, 0.15) 0%, rgba(173, 70, 255, 0.08) 100%)'
        : 'linear-gradient(135deg, rgba(173, 70, 255, 0.08) 0%, rgba(173, 70, 255, 0.04) 100%)'};
    transform: translateX(2px);
    box-shadow:
      0 4px 16px rgba(173, 70, 255, 0.12),
      0 2px 6px rgba(0, 0, 0, 0.04),
      inset 0 1px 0 rgba(255, 255, 255, 0.7);

    &::before {
      opacity: 1;
      height: ${({ $active }) => ($active ? '80%' : '50%')};
    }

    &::after {
      opacity: 1;
    }
  }

  &:active {
    transform: translateX(1px) scale(0.98);
    box-shadow:
      0 2px 8px rgba(173, 70, 255, 0.1),
      0 1px 3px rgba(0, 0, 0, 0.04),
      inset 0 1px 0 rgba(255, 255, 255, 0.5);
  }

  @media (max-width: 768px) {
    width: 100%;
  }
`

const SidebarIcon = styled.span`
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  opacity: 0.7;
  transition: all 0.25s ease;
  position: relative;
  z-index: 1;

  svg {
    width: 18px;
    height: 18px;
    transition: all 0.25s ease;
  }

  ${SidebarItem}:hover & {
    opacity: 1;
    transform: scale(1.15) rotate(-5deg);
    filter: drop-shadow(0 2px 8px rgba(173, 70, 255, 0.4));
  }

  ${SidebarItem}[aria-current='true'] &,
  ${SidebarItem}:has([aria-current='true']) & {
    opacity: 1;
    filter: drop-shadow(0 2px 6px rgba(173, 70, 255, 0.3));
  }
`

const SidebarLabel = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: inherit;
  letter-spacing: -0.01em;
  line-height: 1.4;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  transition: all 0.2s ease;

  ${SidebarItem}:hover & {
    font-weight: 600;
  }
`

const SidebarSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const Badge = styled.span`
  margin-left: auto;
  min-width: 22px;
  height: 22px;
  padding: 0 7px;
  border-radius: 11px;
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
  font-size: 11px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  z-index: 1;
  border: 1px solid transparent;

  ${SidebarItem}:hover & {
    background: linear-gradient(
      135deg,
      rgba(173, 70, 255, 0.15) 0%,
      rgba(173, 70, 255, 0.1) 100%
    );
    color: var(--color-primary);
    transform: scale(1.08);
    border-color: rgba(173, 70, 255, 0.2);
    box-shadow:
      0 2px 8px rgba(173, 70, 255, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.5);
  }

  ${SidebarItem}[aria-current='true'] & {
    background: linear-gradient(
      135deg,
      rgba(173, 70, 255, 0.2) 0%,
      rgba(173, 70, 255, 0.15) 100%
    );
    color: var(--color-primary);
    border-color: rgba(173, 70, 255, 0.3);
    box-shadow:
      0 2px 6px rgba(173, 70, 255, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.6);
    font-weight: 800;
  }
`

/**
 * 메인 컨텐츠 영역
 */
const Content = styled.div`
  min-width: 0;
`
