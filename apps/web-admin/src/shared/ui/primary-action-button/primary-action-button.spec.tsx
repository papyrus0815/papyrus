import React from 'react'

import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { FiPlus } from 'react-icons/fi'
import { ThemeProvider } from 'styled-components'

import { getTheme } from '@/shared/styles/theme'
import { renderWithTheme } from '@/shared/test/render-with-theme'

import { PrimaryActionButton } from './primary-action-button'

describe('PrimaryActionButton — 애플리케이션 메인 보라색 공용 주 버튼', () => {
  it('기본 type="button"이며 라이트·다크 모두 메인 보라색 배경과 흰색 글자를 유지한다', () => {
    const handleClick = jest.fn()
    renderWithTheme(
      <PrimaryActionButton icon={<FiPlus />} onClick={handleClick}>
        법령 등록
      </PrimaryActionButton>,
    )

    const lightButton = screen.getByRole('button', { name: '법령 등록' })
    expect(lightButton).toHaveAttribute('type', 'button')
    expect(lightButton).toHaveStyle({
      background: '#6366f1',
      color: '#ffffff',
    })

    fireEvent.click(lightButton)
    expect(handleClick).toHaveBeenCalledTimes(1)

    render(
      <ThemeProvider theme={getTheme('dark')}>
        <PrimaryActionButton>새 사건 등록</PrimaryActionButton>
      </ThemeProvider>,
    )
    const darkButton = screen.getByRole('button', { name: '새 사건 등록' })
    expect(darkButton).toHaveStyle({
      background: '#636af2',
      color: '#ffffff',
    })
  })
})
