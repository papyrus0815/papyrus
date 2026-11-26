import React from 'react'

import '@testing-library/jest-dom'
import { fireEvent, screen } from '@testing-library/react'

import { renderWithTheme } from '@/shared/test/render-with-theme'

import { SectionSubNav, SubNavFigure } from './section-sub-nav'

describe('SectionSubNav — 탭 안 하위 메뉴 한 줄', () => {
  it('내용 전환 하위 탭은 고르는 알약 없이 지금 구역 이름만 제목으로 — 고르기는 머리 탭 2차 메뉴', () => {
    renderWithTheme(
      <SectionSubNav<'units' | 'wars'>
        ariaLabel="군사 하위 지면"
        tabs={[
          { key: 'units', label: '편제 · 사령부', count: 12 },
          { key: 'wars', label: '전쟁 · 참전사', count: 1234 },
        ]}
        activeTab="wars"
        actions={<button type="button">사령부·부대 등록</button>}
      />,
    )
    expect(screen.queryByRole('tablist')).toBeNull()
    expect(screen.queryByRole('tab')).toBeNull()
    expect(screen.getByRole('heading', { name: /전쟁 · 참전사/ })).toBeInTheDocument()
    expect(screen.getByText('1,234')).toBeInTheDocument()
    expect(screen.queryByText('편제 · 사령부')).toBeNull()
    expect(screen.getByRole('button', { name: '사령부·부대 등록' })).toBeInTheDocument()
  })

  it("보기 전환(kind='views')은 aria-pressed 알약 그대로, 누르면 키를 알린다", () => {
    const onTabChange = jest.fn()
    renderWithTheme(
      <SectionSubNav<'list' | 'span'>
        ariaLabel="보기 방식"
        kind="views"
        tabs={[
          { key: 'list', label: '2열 원장' },
          { key: 'span', label: '존속 스팬 바' },
        ]}
        activeTab="span"
        onTabChange={onTabChange}
      />,
    )
    expect(screen.queryByRole('tablist')).toBeNull()
    expect(screen.getByRole('button', { name: '존속 스팬 바' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: '2열 원장' }))
    expect(onTabChange).toHaveBeenCalledWith('list')
  })

  it('하위 탭이 없으면 한 줄 요약을 왼쪽에 둔다', () => {
    const { container } = renderWithTheme(
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
    expect(container.firstElementChild).toHaveStyle('border-bottom-style: none')
  })
})
