import '@testing-library/jest-dom'

import { fireEvent, screen } from '@testing-library/react'

import { renderWithTheme } from '@/shared/test/render-with-theme'

import { ImageFloatToolbar } from './image-float-toolbar'

function makeFigure(align = 'center', width = '') {
  const fig = document.createElement('figure')
  fig.dataset.align = align
  if (width) fig.style.width = width
  return fig
}

function setup(
  overrides: Partial<Parameters<typeof ImageFloatToolbar>[0]> = {},
) {
  const props = {
    selectedFigure: makeFigure(),
    menuPos: { top: 10, left: 20 },
    onAlign: jest.fn(),
    onWidthPreset: jest.fn(),
    onResetSize: jest.fn(),
    onEditCaption: jest.fn(),
    onDelete: jest.fn(),
    ...overrides,
  }
  renderWithTheme(<ImageFloatToolbar {...props} />)
  return props
}

describe('ImageFloatToolbar', () => {
  it('selectedFigure가 없으면 렌더하지 않는다', () => {
    setup({ selectedFigure: null })
    expect(screen.queryByLabelText('이미지 삭제')).not.toBeInTheDocument()
  })

  it('menuPos가 없으면 렌더하지 않는다', () => {
    setup({ menuPos: null })
    expect(screen.queryByLabelText('이미지 삭제')).not.toBeInTheDocument()
  })

  it('정렬/너비/복원/캡션/삭제 버튼을 렌더', () => {
    setup()
    expect(screen.getByLabelText('왼쪽 정렬')).toBeInTheDocument()
    expect(screen.getByLabelText('너비 50%')).toBeInTheDocument()
    expect(screen.getByLabelText('원본 크기로 복원')).toBeInTheDocument()
    expect(screen.getByLabelText('설명(캡션) 편집')).toBeInTheDocument()
    expect(screen.getByLabelText('이미지 삭제')).toBeInTheDocument()
  })

  it('정렬 버튼 클릭 → onAlign(방향)', () => {
    const props = setup()
    fireEvent.click(screen.getByLabelText('오른쪽 정렬'))
    expect(props.onAlign).toHaveBeenCalledWith('right')
  })

  it('너비 프리셋 클릭 → onWidthPreset(퍼센트)', () => {
    const props = setup()
    fireEvent.click(screen.getByLabelText('너비 75%'))
    expect(props.onWidthPreset).toHaveBeenCalledWith(75)
  })

  it('복원/캡션/삭제 버튼이 각 콜백을 호출', () => {
    const props = setup()
    fireEvent.click(screen.getByLabelText('원본 크기로 복원'))
    fireEvent.click(screen.getByLabelText('설명(캡션) 편집'))
    fireEvent.click(screen.getByLabelText('이미지 삭제'))
    expect(props.onResetSize).toHaveBeenCalledTimes(1)
    expect(props.onEditCaption).toHaveBeenCalledTimes(1)
    expect(props.onDelete).toHaveBeenCalledTimes(1)
  })
})
