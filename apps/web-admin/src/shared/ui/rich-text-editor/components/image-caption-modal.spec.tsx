import '@testing-library/jest-dom'

import { createRef } from 'react'

import { fireEvent, screen } from '@testing-library/react'

import { renderWithTheme } from '@/shared/test/render-with-theme'

import { ImageCaptionModal } from './image-caption-modal'

function setup(overrides: Partial<Parameters<typeof ImageCaptionModal>[0]> = {}) {
  const props = {
    visible: true,
    value: '',
    isEditing: false,
    inputRef: createRef<HTMLInputElement>(),
    onValueChange: jest.fn(),
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
    playClickSound: jest.fn(),
    ...overrides,
  }
  renderWithTheme(<ImageCaptionModal {...props} />)
  return props
}

describe('ImageCaptionModal', () => {
  it('visible=false면 렌더하지 않는다', () => {
    setup({ visible: false })
    expect(screen.queryByPlaceholderText(/이미지 설명/)).not.toBeInTheDocument()
  })

  it('isEditing=false면 "추가", true면 "편집" 제목', () => {
    setup({ isEditing: false })
    expect(screen.getByText('이미지 설명 추가')).toBeInTheDocument()
  })

  it('isEditing=true면 "편집" 제목', () => {
    setup({ isEditing: true })
    expect(screen.getByText('이미지 설명 편집')).toBeInTheDocument()
  })

  it('입력 변경 시 onValueChange 호출', () => {
    const props = setup()
    fireEvent.change(screen.getByPlaceholderText(/이미지 설명/), {
      target: { value: '설명' },
    })
    expect(props.onValueChange).toHaveBeenCalledWith('설명')
  })

  it('Enter는 onConfirm, Escape는 onCancel', () => {
    const props = setup()
    const input = screen.getByPlaceholderText(/이미지 설명/)
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(props.onConfirm).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(props.onCancel).toHaveBeenCalledTimes(1)
  })

  it('확인 버튼은 playClickSound + onConfirm', () => {
    const props = setup()
    fireEvent.click(screen.getByText('확인'))
    expect(props.playClickSound).toHaveBeenCalledTimes(1)
    expect(props.onConfirm).toHaveBeenCalledTimes(1)
  })

  it('X 닫기는 무음으로 onCancel만 호출', () => {
    const props = setup()
    fireEvent.click(screen.getByLabelText('닫기'))
    expect(props.onCancel).toHaveBeenCalledTimes(1)
    expect(props.playClickSound).not.toHaveBeenCalled()
  })
})
