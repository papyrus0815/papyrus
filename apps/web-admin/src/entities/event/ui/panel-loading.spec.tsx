import '@testing-library/jest-dom'
import { screen } from '@testing-library/react'

import { renderWithTheme } from '@/shared/test/render-with-theme'

import { EventPanelLoading } from './panel-loading'

it('로딩 상태를 알리고 안내 문구를 보인다', () => {
  renderWithTheme(<EventPanelLoading label="하위 사건을 모으는 중…" />)
  const status = screen.getByRole('status')
  expect(status).toHaveAttribute('aria-busy', 'true')
  expect(status).toHaveTextContent('하위 사건을 모으는 중…')
})
