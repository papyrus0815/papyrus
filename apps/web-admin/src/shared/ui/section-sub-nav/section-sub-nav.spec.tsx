import React from 'react'

import '@testing-library/jest-dom'
import { fireEvent, screen } from '@testing-library/react'

import { renderWithTheme } from '@/shared/test/render-with-theme'

import { SectionSubNav, SubNavFigure } from './section-sub-nav'

describe('SectionSubNav — 탭 안 하위 메뉴 한 줄', () => {
  it('하위 탭이면 tablist · 건수 배지 · 선택 표시, 누르면 키를 알린다', () => {
    const onTabChange = jest.fn()
    renderWithTheme(
      <SectionSubNav<'units' | 'wars'>
        ariaLabel="군사 하위 지면"
        tabs={[
          { key: 'units', label: '편제 · 사령부', count: 12 },
          { key: 'wars', label: '전쟁 · 참전사', count: 1234 },
        ]}
        activeTab="units"
        onTabChange={onTabChange}
        actions={<button type="button">사령부·부대 등록</button>}
      />,
    )
    expect(screen.getByRole('tablist', { name: '군사 하위 지면' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /편제 · 사령부/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('1,234')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: /전쟁 · 참전사/ }))
    expect(onTabChange).toHaveBeenCalledWith('wars')
    expect(screen.getByRole('button', { name: '사령부·부대 등록' })).toBeInTheDocument()
  })

  it("보기 전환(kind='views')은 aria-pressed 버튼 묶음", () => {
    renderWithTheme(
      <SectionSubNav<'list' | 'span'>
        ariaLabel="보기 방식"
        kind="views"
        tabs={[
          { key: 'list', label: '2열 원장' },
          { key: 'span', label: '존속 스팬 바' },
        ]}
        activeTab="span"
      />,
    )
    expect(screen.queryByRole('tablist')).toBeNull()
    expect(screen.getByRole('button', { name: '존속 스팬 바' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('하위 탭이 없으면 한 줄 요약을 왼쪽에 둔다', () => {
    renderWithTheme(
      <SectionSubNav
        summary={
          <span>
            사건 <SubNavFigure>210</SubNavFigure>건
          </span>
        }
      />,
    )
    expect(screen.getByText('210')).toBeInTheDocument()
    expect(screen.queryByRole('tablist')).toBeNull()
  })
})
