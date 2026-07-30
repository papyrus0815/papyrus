import { renderWithTheme } from '@/shared/test/render-with-theme'
import '@testing-library/jest-dom'
import { fireEvent, screen, waitFor } from '@testing-library/react'

import { ConfirmDialog } from './confirm-dialog'

function setup(overrides: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  const onConfirm = jest.fn()
  const onCancel = jest.fn()
  const props = {
    isOpen: true,
    title: '인물 등록 완료',
    message: '이순신을(를) 등록했습니다.',
    confirmLabel: '상세 보기',
    cancelLabel: '닫기',
    onConfirm,
    onCancel,
    ...overrides,
  }
  const view = renderWithTheme(<ConfirmDialog {...props} />)
  return { ...view, onConfirm, onCancel }
}

describe('ConfirmDialog', () => {
  it('기본은 2지 분기 — 보조 액션 버튼이 없다', () => {
    setup()
    expect(screen.getByRole('button', { name: '닫기' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '상세 보기' })).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })

  it('라벨만 있고 onAlt가 없으면 보조 버튼을 렌더하지 않는다', () => {
    // 눌러도 아무 일 없는 유령 버튼 방지 — 라벨·핸들러가 모두 있어야 노출.
    setup({ altLabel: '다른 인물 등록' })
    expect(
      screen.queryByRole('button', { name: '다른 인물 등록' }),
    ).not.toBeInTheDocument()
  })

  it('3지 분기 — 각 버튼이 자기 핸들러만 호출한다', () => {
    const onAlt = jest.fn()
    const { onConfirm, onCancel } = setup({
      altLabel: '다른 인물 등록',
      onAlt,
    })
    expect(screen.getAllByRole('button')).toHaveLength(3)

    fireEvent.click(screen.getByRole('button', { name: '다른 인물 등록' }))
    expect(onAlt).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
    expect(onCancel).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: '상세 보기' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: '닫기' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onAlt).toHaveBeenCalledTimes(1)
  })

  it('Esc는 보조 액션이 있어도 취소(onCancel)로만 닫는다', () => {
    const onAlt = jest.fn()
    const { onCancel, onConfirm } = setup({
      altLabel: '다른 인물 등록',
      onAlt,
    })
    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onAlt).not.toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('초기 포커스는 언제나 취소 버튼 — 보조 액션이 붙어도 Enter는 무해해야 한다', async () => {
    setup({ altLabel: '다른 인물 등록', onAlt: jest.fn() })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '닫기' })).toHaveFocus(),
    )
    expect(screen.getByRole('button', { name: '상세 보기' })).not.toHaveFocus()
  })
})
