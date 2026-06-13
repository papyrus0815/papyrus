/**
 * styled-components ThemeProvider로 감싸 렌더하는 테스트 헬퍼.
 * 에디터 모달/팝오버 등 theme.colors.* 를 읽는 컴포넌트의 렌더 테스트에 사용.
 */
import type { ReactElement, ReactNode } from 'react'

import { type RenderOptions, render } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'

import { getTheme } from '@/shared/styles/theme'

export function renderWithTheme(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <ThemeProvider theme={getTheme('light')}>{children}</ThemeProvider>
    ),
    ...options,
  })
}
