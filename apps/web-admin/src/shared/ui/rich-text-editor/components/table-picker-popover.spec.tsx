import '@testing-library/jest-dom'

import { fireEvent } from '@testing-library/react'

import { renderWithTheme } from '@/shared/test/render-with-theme'

import { TablePickerPopover } from './table-picker-popover'

function setup(
  overrides: Partial<Parameters<typeof TablePickerPopover>[0]> = {},
) {
  const props = {
    visible: true,
    anchorRef: { current: document.createElement('button') },
    hover: { row: 0, col: 0 },
    onHover: jest.fn(),
    onConfirm: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  }
  renderWithTheme(<TablePickerPopover {...props} />)
  return props
}

function cells() {
  return Array.from(document.querySelectorAll('button'))
}

describe('TablePickerPopover', () => {
  it('visible=false면 셀이 없다', () => {
    setup({ visible: false })
    expect(cells()).toHaveLength(0)
  })

  it('visible=true면 8×8=64 셀과 힌트를 렌더', () => {
    setup({ hover: { row: 0, col: 0 } })
    expect(cells()).toHaveLength(64)
    expect(document.body.textContent).toContain('1 × 1')
  })

  it('hover 좌표가 힌트(행×열)에 반영된다', () => {
    setup({ hover: { row: 2, col: 3 } })
    expect(document.body.textContent).toContain('3 × 4')
  })

  it('셀 클릭 시 onConfirm(row+1, col+1)', () => {
    const props = setup()
    // index 10 → row=1, col=2 → (2, 3)
    fireEvent.click(cells()[10])
    expect(props.onConfirm).toHaveBeenCalledWith(2, 3)
  })

  it('셀 mouseEnter 시 onHover(좌표)', () => {
    const props = setup()
    fireEvent.mouseEnter(cells()[0])
    expect(props.onHover).toHaveBeenCalledWith({ row: 0, col: 0 })
  })
})
