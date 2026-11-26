/**
 * 탭 안 하위 메뉴 한 줄 — 왼쪽 하위 탭(알약) 또는 한 줄 요약, 오른쪽 버튼들.
 *
 *   ( 편제·사령부 12 | 전쟁·참전사 78 )                  [+ 사령부·부대 등록] [⋯]
 *   사건 210건 · 12개 세기                                  [사건 허브 ↗] [+ 새 사건 등록]
 *
 * 국가 상세의 탭들은 예전에 위 탭('사건')을 되풀이하는 큰 제목('독일 사건 연대표') + 사용법 설명 줄을 두고,
 * 안쪽 탭이 있으면 위 탭과 같은 밑줄 부품을 또 써서 두 단계가 한 줄처럼 읽혔다. 이제 제목은 위 탭이 맡고
 * 이 줄은 '이 탭 안에서 고르는 것 + 할 수 있는 것'만 둔다. 하위 탭은 위 탭(밑줄 13.5px)보다 한 단계 낮은
 * 알약(12.5px)이며 하단 구분선(border-bottom) 없이 본문과 여백으로만 나눈다. *
 * 내용 전환 하위 탭(kind='tabs')은 이제 머리 탭의 2차 메뉴(country-tab-submenu)가 맡는다 — 같은 고르기가
 * 머리와 본문 두 곳에 서면 지면만 좁아진다. 그래서 여기선 고르는 알약 대신 지금 구역 이름을 제목으로만 둔다.
 * 보기 전환(kind='views' — 원장/스팬/계보처럼 같은 내용을 달리 보기)은 머리 메뉴가 없으니 알약 그대로.
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
  /** 하위 탭이 화면 보기 전환이면 'views'(aria-pressed 알약), 내용 전환이면 'tabs'(지금 구역 제목만 — 고르기는 머리 탭 2차 메뉴) */
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
  const currentSection =
    hasTabs && kind === 'tabs' ? (tabs!.find((tab) => tab.key === activeTab) ?? tabs![0]) : null
  return (
    <SubNavBar className={className}>
      {currentSection ? (
        <SectionHeading label={currentSection.label} count={currentSection.count} hint={currentSection.title} />
      ) : hasTabs ? (
        <SubTabList role="group" aria-label={ariaLabel}>
          {tabs!.map((tab) => {
            const isActive = tab.key === activeTab
            return (
              <SubTabBtn
                key={tab.key}
                type="button"
                aria-pressed={isActive}
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

/**
 * 지금 구역 제목 — '국채 금리 12'. 구역을 고르는 일은 머리 탭 2차 메뉴가 하고, 이건 어디에 와 있는지만 말한다.
 * 정부·행정의 구역 제목(GovSectionTitle)도 같은 부품을 쓴다.
 */
export function SectionHeading({
  label,
  count,
  hint,
}: {
  label: React.ReactNode
  count?: number | null
  hint?: string
}) {
  return (
    <HeadingText title={hint}>
      <span className="label">{label}</span>
      {count != null && count > 0 ? <span className="count">{count.toLocaleString('ko-KR')}</span> : null}
    </HeadingText>
  )
}

const HeadingText = styled.h2`
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
  margin: 0;

  .label {
    font-size: 19px;
    font-weight: 800;
    letter-spacing: -0.02em;
    white-space: nowrap;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .count {
    font-size: 13px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  @media (max-width: 560px) {
    .label {
      font-size: 17px;
    }
  }
`

/** 요약 안 수치 강조 — '사건 <SubNavFigure>210</SubNavFigure>건' */
export const SubNavFigure = styled.strong`
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`

const SubNavBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 12px;
  min-height: 36px;
  padding: 0;
  border-bottom: none;
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
