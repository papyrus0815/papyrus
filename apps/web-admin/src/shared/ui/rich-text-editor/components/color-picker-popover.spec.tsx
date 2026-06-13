import '@testing-library/jest-dom'

import { fireEvent, screen } from '@testing-library/react'

import { renderWithTheme } from '@/shared/test/render-with-theme'

import { ColorPickerPopover } from './color-picker-popover'

function setup(
  overrides: Partial<Parameters<typeof ColorPickerPopover>[0]> = {},
) {
  const props = {
    visible: true,
    anchorRef: { current: document.createElement('button') },
    currentColor: '#000000',
    onApplyColor: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  }
  renderWithTheme(<ColorPickerPopover {...props} />)
  return props
}

describe('ColorPickerPopover', () => {
  it('visible=false면 렌더하지 않는다', () => {
    setup({ visible: false })
    expect(screen.queryByTitle('#000000')).not.toBeInTheDocument()
  })

  it('anchorRef가 없으면 렌더하지 않는다', () => {
    setup({ anchorRef: { current: null } })
    expect(screen.queryByTitle('#000000')).not.toBeInTheDocument()
  })

  it('visible=true면 팔레트 22색 + 네이티브 색상 입력', () => {
    setup()
    expect(screen.getByTitle('#000000')).toBeInTheDocument()
    expect(screen.getByTitle('#f43f5e')).toBeInTheDocument()
    expect(document.querySelector('input[type="color"]')).not.toBeNull()
  })

  it('스와치 클릭 → onApplyColor(color, {close:true})', () => {
    const props = setup()
    fireEvent.click(screen.getByTitle('#ef4444'))
    expect(props.onApplyColor).toHaveBeenCalledWith('#ef4444', { close: true })
  })

  it('네이티브 입력 변경 → onApplyColor(value, {close:false})', () => {
    const props = setup()
    const input = document.querySelector(
      'input[type="color"]',
    ) as HTMLInputElement
    fireEvent.change(input, { target: { value: '#123456' } })
    expect(props.onApplyColor).toHaveBeenCalledWith('#123456', {
      close: false,
    })
  })
})
