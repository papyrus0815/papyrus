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
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <circle cx="12" cy="12" r="10" />
                        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
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
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
                      </svg>
                    </SidebarIcon>
                    <SidebarLabel>대륙</SidebarLabel>
                    <Badge>{continentCount}</Badge>
                  </SidebarItem>

                  <SidebarItem
                    as={Link}
                    to="/history/jobs"
                    $active={isActive('/history/jobs')}
                  >
                    <SidebarIcon>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M2 8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8z" />
                        <path d="M2 8h20M16 8V6a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
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
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </CollapsedIconItem>

              <CollapsedIconItem
                as={motion.button}
                onClick={() => navigate('/history/continents')}
                $active={isActive('/history/continents')}
                title="대륙"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
                </svg>
              </CollapsedIconItem>

              <CollapsedIconItem
                as={motion.button}
                onClick={() => navigate('/history/jobs')}
                $active={isActive('/history/jobs')}
                title="직업"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M2 8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8z" />
                  <path d="M2 8h20M16 8V6a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </TabBarIcon>
          <TabBarLabel $active={isActive('/history/country')}>국가</TabBarLabel>
          {/* 활성 상태일 때 상단 인디케이터 표시 */}
          {isActive('/history/country') && <ActiveIndicator />}
        </TabBarItem>

        {/* 직업 탭 버튼 */}
        <TabBarItem
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          onClick={() => navigate('/history/jobs')}
          $active={isActive('/history/jobs')}
        >
          <TabBarIcon $active={isActive('/history/jobs')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8z" />
              <path d="M2 8h20M16 8V6a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
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
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                animate={{ rotate: showMenu ? 180 : 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
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
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
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
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
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
    $collapsed ? '64px minmax(0, 1fr)' : '10% minmax(0, 1fr)'};
  column-gap: 0;
  padding: var(--header-height) 0 0;
  background: #ffffff;
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

/* 데스크톱 좌측 사이드바 - 헤더 아래부터 표시 */
const Sidebar = styled.aside<{ $collapsed?: boolean }>`
  position: sticky;
  top: var(--header-height);
  align-self: start;
  height: calc(100vh - var(--header-height));
  width: ${({ $collapsed }) => ($collapsed ? '64px' : '100%')};
  min-width: ${({ $collapsed }) => ($collapsed ? '64px' : '100%')};
  max-width: ${({ $collapsed }) => ($collapsed ? '64px' : '100%')};
  padding: 16px 10px;
  border-right: 1px solid rgba(0, 0, 0, 0.06);
  background: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  @media (max-width: 1024px) {
    display: none;
  }
`

/**
 * 사이드바 접기/펼치기 버튼 - SidebarWrapper 기준으로 중앙에 배치
 */
const CollapseButton = styled.button<{ $collapsed?: boolean }>`
  position: absolute;
  top: 50%;
  left: ${({ $collapsed }) =>
    $collapsed ? 'calc(64px - 20px)' : 'calc(100% - 20px)'};
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: #ffffff;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 100;
  transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1), color 0.2s, border-color 0.2s, background 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);

  &:hover {
    background: #f8fafc;
    color: #6366f1;
    border-color: rgba(99, 102, 241, 0.25);
  }

  svg {
    width: 16px;
    height: 16px;
    transition: transform 0.2s ease;
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
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: none;
  background: ${({ $active }) => ($active ? 'rgba(99, 102, 241, 0.1)' : 'transparent')};
  color: ${({ $active }) => ($active ? '#6366f1' : '#64748b')};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;

  svg {
    width: 22px;
    height: 22px;
  }

  &::before {
    content: '';
    position: absolute;
    left: -6px;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: ${({ $active }) => ($active ? '56%' : '0')};
    border-radius: 0 2px 2px 0;
    background: #6366f1;
    opacity: ${({ $active }) => ($active ? 1 : 0)};
    transition: all 0.25s ease;
  }

  &:hover {
    background: ${({ $active }) =>
      $active ? 'rgba(99, 102, 241, 0.14)' : 'rgba(0, 0, 0, 0.04)'};
    color: #6366f1;
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
    height: 64px;
    padding-bottom: env(safe-area-inset-bottom);
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-top: 1px solid rgba(0, 0, 0, 0.06);
    z-index: ${Z_INDEX.STICKY_HEADER};
    box-shadow: 0 -1px 4px rgba(0, 0, 0, 0.04);
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
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ $active }) => ($active ? '#6366f1' : '#94a3b8')};
  transition: color 0.2s ease;

  svg {
    width: 22px;
    height: 22px;
  }
`

const TabBarLabel = styled.span<{ $active?: boolean }>`
  font-size: 11px;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  color: ${({ $active }) => ($active ? '#6366f1' : '#94a3b8')};
  letter-spacing: -0.02em;
  transition: color 0.2s ease;
`

const ActiveIndicator = styled.div`
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 2.5px;
  background: #6366f1;
  border-radius: 0 0 2px 2px;
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
  width: 56px;
  height: 56px;
  border-radius: 16px;
  border: none;
  background: #6366f1;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
  position: relative;
  top: -10px;

  &:hover {
    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.45);
  }

  svg {
    width: 24px;
    height: 24px;
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
  bottom: 84px;
  left: 50%;
  transform: translateX(-50%);
  background: #ffffff;
  border-radius: 16px;
  padding: 8px 0;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  z-index: ${Z_INDEX.DIALOG_CONTENT};
  min-width: 200px;
  border: 1px solid rgba(0, 0, 0, 0.06);
`

const MenuTitle = styled.div`
  padding: 8px 14px;
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.05em;
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
  padding: 10px 14px;
  border: none;
  background: transparent;
  color: #334155;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
  text-align: left;
  border-radius: 8px;
  margin: 0 6px;

  svg {
    color: #64748b;
  }

  &:hover {
    background: rgba(99, 102, 241, 0.08);
    color: #6366f1;

    svg {
      color: #6366f1;
    }
  }
`

const SidebarGroupTitle = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.06em;
  padding: 12px 12px 6px;
  margin-top: 4px;
`

const SidebarItem = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  margin-bottom: 2px;
  border-radius: 10px;
  border: none;
  position: relative;
  background: ${({ $active }) => ($active ? 'rgba(99, 102, 241, 0.1)' : 'transparent')};
  color: ${({ $active }) => ($active ? '#6366f1' : '#475569')};
  cursor: pointer;
  text-align: left;
  text-decoration: none;
  transition: all 0.2s ease;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: ${({ $active }) => ($active ? '60%' : '0')};
    border-radius: 0 2px 2px 0;
    background: #6366f1;
    opacity: ${({ $active }) => ($active ? 1 : 0)};
    transition: all 0.25s ease;
  }

  &:hover {
    background: ${({ $active }) =>
      $active ? 'rgba(99, 102, 241, 0.14)' : 'rgba(0, 0, 0, 0.04)'};
    color: ${({ $active }) => ($active ? '#6366f1' : '#334155')};
  }
`

const SidebarIcon = styled.span`
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  opacity: 0.85;
  transition: opacity 0.2s ease;

  svg {
    width: 18px;
    height: 18px;
  }

  ${SidebarItem}:hover &,
  ${SidebarItem}[aria-current='true'] & {
    opacity: 1;
  }
`

const SidebarLabel = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: inherit;
  letter-spacing: -0.02em;
  line-height: 1.4;
`

const SidebarSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const Badge = styled.span`
  margin-left: auto;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.06);
  color: #64748b;
  font-size: 11px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  ${SidebarItem}:hover &,
  ${SidebarItem}[aria-current='true'] & {
    background: rgba(99, 102, 241, 0.12);
    color: #6366f1;
  }
`

/**
 * 메인 컨텐츠 영역 — 스크롤만 이 영역에서 되도록, 대시보드/국가 목록(사이드바)은 고정
 * 상단 여백 없이 컨텐츠가 바로 붙도록 padding 0
 */
const Content = styled.div`
  min-width: 0;
  height: calc(100vh - var(--header-height));
  overflow-y: auto;
  overflow-x: hidden;
  background: #ffffff;
  padding: 0;
  -webkit-overflow-scrolling: touch;
`
