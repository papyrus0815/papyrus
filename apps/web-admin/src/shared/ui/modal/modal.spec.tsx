import { renderWithTheme } from '@/shared/test/render-with-theme'
import '@testing-library/jest-dom'
import { fireEvent, screen } from '@testing-library/react'

import { Modal } from './modal'
import { ModalBody } from './modal.styles'

function setup(overrides: Partial<Parameters<typeof Modal>[0]> = {}) {
  const onClose = jest.fn()
  const props = {
    isOpen: true,
    onClose,
    title: '테스트 제목',
    children: <ModalBody>본문</ModalBody>,
    ...overrides,
  }
  const view = renderWithTheme(<Modal {...props} />)
  return { ...view, onClose }
}

describe('Modal', () => {
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
      '테스트 제목',
    )
  })

  it('Esc로 onClose 호출', () => {
    const { onClose } = setup()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closeOnEsc=false면 Esc를 무시', () => {
    const { onClose } = setup({ closeOnEsc: false })
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('오버레이 클릭은 닫고, 박스 내부 클릭은 닫지 않는다', () => {
    const { onClose } = setup()
    const dialog = screen.getByRole('dialog')
    const overlay = dialog.parentElement as HTMLElement
    fireEvent.mouseDown(dialog)
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.mouseDown(overlay)
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

  it('title 없이 ariaLabel만 주면 aria-label을 사용', () => {
    setup({ title: undefined, ariaLabel: '대화상자' })
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-label', '대화상자')
    expect(dialog).not.toHaveAttribute('aria-labelledby')
  })
})
