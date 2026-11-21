/**
 * 탭 안 하위 메뉴 한 줄 — 왼쪽 하위 탭(알약) 또는 한 줄 요약, 오른쪽 버튼들. 밑선 하나가 본문과 가른다.
 *
 *   ( 편제·사령부 12 | 전쟁·참전사 78 )                  [+ 사령부·부대 등록] [⋯]
 *   사건 210건 · 12개 세기                                  [사건 허브 ↗] [+ 새 사건 등록]
 *
 * 국가 상세의 탭들은 예전에 위 탭('사건')을 되풀이하는 큰 제목('독일 사건 연대표') + 사용법 설명 줄을 두고,
 * 안쪽 탭이 있으면 위 탭과 같은 밑줄 부품을 또 써서 두 단계가 한 줄처럼 읽혔다. 이제 제목은 위 탭이 맡고
 * 이 줄은 '이 탭 안에서 고르는 것 + 할 수 있는 것'만 둔다. 하위 탭은 위 탭(밑줄 13.5px)보다 한 단계 낮은
 * 알약(12.5px)이다. 처음 정당·선거 탭에서 정했다(2026-11-21).
 */
import React from 'react'

import styled from 'styled-components'

export interface SectionSubNavTab<Key extends string = string> {
  key: Key
  label: React.ReactNode
  /** 건수 배지 — 없으면 숨김 */
  count?: number | null
  /** 마우스 오버 설명(예전 머리 설명 줄이 맡던 것) */
  title?: string
  icon?: React.ReactNode
}

interface SectionSubNavProps<Key extends string> {
  /** 하위 탭 — 없으면 summary를 왼쪽에 둔다 */
  tabs?: ReadonlyArray<SectionSubNavTab<Key>>
  activeTab?: Key
  onTabChange?: (key: Key) => void
  /** 하위 탭 묶음 이름(스크린리더) */
  ariaLabel?: string
  /** 하위 탭이 화면 보기 전환이면 'views'(aria-pressed 버튼), 내용 전환이면 'tabs'(role=tab) */
  kind?: 'tabs' | 'views'
  /** 하위 탭이 없을 때 왼쪽 한 줄 요약 — '사건 210건' 같은 수치 */
  summary?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function SectionSubNav<Key extends string = string>({
  tabs,
  activeTab,
  onTabChange,
  ariaLabel,
  kind = 'tabs',
  summary,
  actions,
  className,
}: SectionSubNavProps<Key>) {
  const hasTabs = Boolean(tabs && tabs.length > 0)
  return (
    <SubNavBar className={className}>
      {hasTabs ? (
        <SubTabList role={kind === 'tabs' ? 'tablist' : 'group'} aria-label={ariaLabel}>
          {tabs!.map((tab) => {
            const isActive = tab.key === activeTab
            return (
              <SubTabBtn
                key={tab.key}
                type="button"
                role={kind === 'tabs' ? 'tab' : undefined}
                aria-selected={kind === 'tabs' ? isActive : undefined}
                aria-pressed={kind === 'views' ? isActive : undefined}
                title={tab.title}
                $active={isActive}
                onClick={() => onTabChange?.(tab.key)}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.count != null ? <SubTabCount $active={isActive}>{tab.count.toLocaleString('ko-KR')}</SubTabCount> : null}
              </SubTabBtn>
            )
          })}
        </SubTabList>
      ) : (
        <Summary>{summary}</Summary>
      )}
      {actions ? <Actions>{actions}</Actions> : null}
    </SubNavBar>
  )
}

/** 요약 안 수치 강조 — '사건 <SubNavFigure>210</SubNavFigure>건' */
export const SubNavFigure = styled.strong`
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`

const hairlineStrong = (mode: string) => (mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)')

const SubNavBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 12px;
  min-height: 44px;
  padding: 0 0 10px;
  border-bottom: 1px solid ${({ theme }) => hairlineStrong(theme.mode)};
`

const SubTabList = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
  padding: 3px;
  border-radius: 999px;
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.045)')};
`

const SubTabBtn = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 14px;
  border: none;
  border-radius: 999px;
  background: ${({ $active, theme }) =>
    $active ? (theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : '#ffffff') : 'transparent'};
  box-shadow: ${({ $active, theme }) => ($active && theme.mode !== 'dark' ? '0 1px 2px rgba(15, 23, 42, 0.1)' : 'none')};
  color: ${({ $active, theme }) => ($active ? theme.colors.text.primary : theme.colors.text.secondary)};
  font: inherit;
  font-size: 12.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 600)};
  letter-spacing: -0.01em;
  white-space: nowrap;
  cursor: pointer;
  transition:
    color 0.14s ease,
    background-color 0.14s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 1px;
  }
`

const SubTabCount = styled.span<{ $active?: boolean }>`
  min-width: 16px;
  padding: 0 5px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 16px;
  text-align: center;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.28)'
        : 'rgba(99, 102, 241, 0.12)'
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(15, 23, 42, 0.06)'};
  color: ${({ $active, theme }) =>
    $active ? (theme.mode === 'dark' ? '#c7d2fe' : theme.colors.primary) : theme.colors.text.tertiary};
`

const Summary = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 10px;
  min-height: 36px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Actions = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-left: auto;
`
