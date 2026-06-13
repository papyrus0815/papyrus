import '@testing-library/jest-dom'

import { fireEvent, screen } from '@testing-library/react'

import { renderWithTheme } from '@/shared/test/render-with-theme'

import { ShortcutsHelpModal } from './shortcuts-help-modal'

describe('ShortcutsHelpModal', () => {
  it('visible=false면 아무것도 렌더하지 않는다', () => {
    renderWithTheme(
      <ShortcutsHelpModal visible={false} onClose={() => undefined} />,
    )
    expect(screen.queryByText('키보드 단축키')).not.toBeInTheDocument()
  })

  it('visible=true면 제목과 단축키 항목을 포털로 렌더한다', () => {
    renderWithTheme(<ShortcutsHelpModal visible onClose={() => undefined} />)
    expect(screen.getByText('키보드 단축키')).toBeInTheDocument()
    expect(screen.getByText('굵게')).toBeInTheDocument()
    expect(screen.getByText('순서 없는 목록')).toBeInTheDocument()
  })

  it('닫기 버튼 클릭 시 onClose를 호출한다', () => {
    const onClose = jest.fn()
    renderWithTheme(<ShortcutsHelpModal visible onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('닫기'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('내부 모달 클릭은 onClose로 전파되지 않는다', () => {
    const onClose = jest.fn()
    renderWithTheme(<ShortcutsHelpModal visible onClose={onClose} />)
    fireEvent.click(screen.getByText('키보드 단축키'))
    expect(onClose).not.toHaveBeenCalled()
  })
})
