import { renderWithTheme } from '@/shared/test/render-with-theme'
import '@testing-library/jest-dom'
import { fireEvent, screen } from '@testing-library/react'

import { RegisterModal } from './register-modal'

function setup(overrides: Partial<Parameters<typeof RegisterModal>[0]> = {}) {
  const onClose = jest.fn()
  const props = {
    isOpen: true,
    onClose,
    title: '등록 모달 제목',
    children: <div>본문</div>,
    ...overrides,
  }
  const view = renderWithTheme(<RegisterModal {...props} />)
  return { ...view, onClose }
}

describe('RegisterModal', () => {
  it('isOpen=false면 렌더하지 않는다', () => {
    setup({ isOpen: false })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('dialog 역할 + aria-modal + aria-labelledby가 제목을 가리킨다', () => {
    setup()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    const labelledBy = dialog.getAttribute('aria-labelledby')
    expect(labelledBy).toBeTruthy()
    expect(document.getElementById(labelledBy as string)).toHaveTextContent(
      '등록 모달 제목',
    )
  })

  it('Esc로 onClose 호출', () => {
    const { onClose } = setup()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('닫기 버튼 클릭 시 onClose', () => {
    const { onClose } = setup()
    fireEvent.click(screen.getByLabelText('닫기'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('열리면 body 스크롤을 잠그고 언마운트 시 복원', () => {
    const { unmount } = setup()
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).toBe('')
  })
})
