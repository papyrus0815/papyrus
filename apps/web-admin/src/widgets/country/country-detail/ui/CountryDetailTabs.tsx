import React, { useEffect, useRef, useState } from 'react'

import styled from 'styled-components'

import { EventsIcon, MilitaryIcon, OverviewIcon, PeopleIcon } from './TabIcons'

export type CountryDetailTab = 'overview' | 'people' | 'military' | 'events'

interface CountryDetailTabsProps {
  activeTab: CountryDetailTab
  onTabChange: (tab: CountryDetailTab) => void
}

interface TabConfig {
  id: CountryDetailTab
  label: string
  Icon: React.FC
}

const TAB_CONFIGS: TabConfig[] = [
  { id: 'overview', label: '대시보드', Icon: OverviewIcon },
  { id: 'people', label: '인물', Icon: PeopleIcon },
  { id: 'military', label: '군대', Icon: MilitaryIcon },
  { id: 'events', label: '주요 사건', Icon: EventsIcon },
]

const Overlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 150;
  opacity: ${(props) => (props.$isOpen ? 1 : 0)};
  pointer-events: ${(props) => (props.$isOpen ? 'auto' : 'none')};
  transition: opacity 0.3s ease;

  @media (max-width: 1024px) {
    display: none;
  }
`

const ToggleTab = styled.button<{ $isOpen: boolean }>`
  width: 44px;
  height: 110px;
  background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
  border: 1px solid #e2e8f0;
  border-right: none;
  border-radius: 12px 0 0 12px;
  cursor: pointer;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  display: ${(props) => (props.$isOpen ? 'none' : 'flex')};
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0;
  position: fixed;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 160;
  color: #64748b;
  font-size: 20px;
  font-weight: 300;
  overflow: hidden;

  &:hover {
    transform: translateY(-50%) translateX(-4px) scale(1.05);
    border-color: #cbd5e1;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    color: #0f172a;
  }

  &:active {
    transform: translateY(-50%) scale(0.98);
  }

  @media (max-width: 1024px) {
    display: none;
  }
`

const TabsContainer = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  right: ${(props) => (props.$isOpen ? '0' : '-280px')};
  top: 50%;
  transform: translateY(-50%);
  z-index: 160;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
  border: 1px solid #e2e8f0;
  border-right: none;
  border-radius: 16px 0 0 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.1);
  width: 240px;

  @media (max-width: 1024px) {
    display: none;
  }
`

const MenuTitle = styled.div`
  padding: 8px 10px 20px;
  margin-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.02em;
`

const TabButton = styled.button<{ $active: boolean }>`
  padding: 14px 16px;
  font-size: 14px;
  font-weight: ${(props) => (props.$active ? '600' : '500')};
  color: ${(props) => (props.$active ? '#0f172a' : '#64748b')};
  background: ${(props) => (props.$active ? '#f8fafc' : 'transparent')};
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: -0.01em;
  text-align: left;
  box-shadow: ${(props) =>
    props.$active ? '0 2px 4px rgba(0, 0, 0, 0.04)' : 'none'};
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 10px;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: linear-gradient(180deg, #4285f4, #34a853, #fbbc04, #ea4335);
    opacity: ${(props) => (props.$active ? '1' : '0')};
    transition: opacity 0.25s ease;
  }

  &:hover {
    background: #f1f5f9;
    color: #0f172a;
    transform: translateX(4px) scale(1.02);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);

    &::before {
      opacity: 0.5;
    }
  }

  &:active {
    transform: translateX(2px) scale(0.98);
  }

  svg {
    width: 16px;
    height: 16px;
  }
`

const MobileContainer = styled.div`
  display: none;

  @media (max-width: 1024px) {
    display: flex;
    gap: 8px;
    margin-bottom: 24px;
    padding: 4px;
    background: #f8fafc;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    flex-direction: column;
  }
`

const MobileTabButton = styled.button<{ $active: boolean }>`
  padding: 12px 20px;
  font-size: 14px;
  font-weight: ${(props) => (props.$active ? '600' : '500')};
  color: ${(props) => (props.$active ? '#0f172a' : '#64748b')};
  background: ${(props) => (props.$active ? '#ffffff' : 'transparent')};
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: -0.01em;
  box-shadow: ${(props) =>
    props.$active
      ? '0 2px 4px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)'
      : 'none'};
  display: flex;
  align-items: center;
  gap: 10px;

  &:hover {
    background: ${(props) => (props.$active ? '#ffffff' : '#f1f5f9')};
    color: #0f172a;
  }

  &:active {
    transform: scale(0.98);
  }

  svg {
    width: 16px;
    height: 16px;
  }
`

export const CountryDetailTabs: React.FC<CountryDetailTabsProps> = ({
  activeTab,
  onTabChange,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        isOpen
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const getActiveTabLabel = () => {
    const config = TAB_CONFIGS.find((tab) => tab.id === activeTab)
    return config?.label || '메뉴'
  }

  return (
    <>
      {/* 데스크톱: 우측 슬라이드 메뉴 */}
      <Overlay $isOpen={isOpen} onClick={() => setIsOpen(false)} />

      <ToggleTab
        $isOpen={isOpen}
        onClick={() => setIsOpen(true)}
        title="메뉴 열기"
      >
        ◀
      </ToggleTab>

      <TabsContainer ref={containerRef} $isOpen={isOpen}>
        <MenuTitle>{getActiveTabLabel()}</MenuTitle>

        {TAB_CONFIGS.map(({ id, label, Icon }) => (
          <TabButton
            key={id}
            $active={activeTab === id}
            onClick={() => {
              onTabChange(id)
              setIsOpen(false)
            }}
          >
            <Icon />
            {label}
          </TabButton>
        ))}
      </TabsContainer>

      {/* 모바일: 상단 메뉴 */}
      <MobileContainer>
        {TAB_CONFIGS.map(({ id, label, Icon }) => (
          <MobileTabButton
            key={id}
            $active={activeTab === id}
            onClick={() => onTabChange(id)}
          >
            <Icon />
            {label}
          </MobileTabButton>
        ))}
      </MobileContainer>
    </>
  )
}
