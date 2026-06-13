import '@testing-library/jest-dom'

import { fireEvent, screen } from '@testing-library/react'

import { renderWithTheme } from '@/shared/test/render-with-theme'

import { EditorToolbar } from './editor-toolbar'

function setup(overrides: Partial<Parameters<typeof EditorToolbar>[0]> = {}) {
  const props = {
    bounded: false,
    isBold: false,
    isItalic: false,
    isStrike: false,
    currentHeading: null,
    isAlignCenter: false,
    isBulletList: false,
    isOrderedList: false,
    isCode: false,
    currentColor: '#000000',
    cursorInTable: false,
    selectedText: '',
    entityLinkUsable: true,
    hasDocumentScope: false,
    canUploadImage: true,
    colorPickerVisible: false,
    tablePickerVisible: false,
    colorPickerButtonRef: { current: null },
    tablePickerButtonRef: { current: null },
    playClickSound: jest.fn(),
    onFormat: jest.fn(),
    onHeading: jest.fn(),
    onLink: jest.fn(),
    onEntityLink: jest.fn(),
    onTermLink: jest.fn(),
    onExplanation: jest.fn(),
    onImageUpload: jest.fn(),
    onTableOp: jest.fn(),
    onDeleteTable: jest.fn(),
    onInsertHr: jest.fn(),
    onToggleColorPicker: jest.fn(),
    onToggleTablePicker: jest.fn(),
    ...overrides,
  }
  renderWithTheme(<EditorToolbar {...props} />)
  return props
}

describe('EditorToolbar', () => {
  it('굵게 클릭 → playClickSound + onFormat(bold)', () => {
    const props = setup()
    fireEvent.click(screen.getByLabelText('굵게 (Ctrl+B)'))
    expect(props.playClickSound).toHaveBeenCalledTimes(1)
    expect(props.onFormat).toHaveBeenCalledWith('bold')
  })

  it('제목1 클릭 → onHeading(1)', () => {
    const props = setup()
    fireEvent.click(screen.getByLabelText('제목 1'))
    expect(props.onHeading).toHaveBeenCalledWith(1)
  })

  it('선택 문구 없으면 엔티티/용어 연결 비활성', () => {
    setup({ selectedText: '' })
    expect(
      screen.getByLabelText('엔티티 연결 (문구 선택 후 클릭)'),
    ).toBeDisabled()
    expect(
      screen.getByLabelText('용어 연결 (문구 선택 후 클릭)'),
    ).toBeDisabled()
  })

  it('entityLinkUsable=false면 엔티티 버튼 비활성', () => {
    setup({ selectedText: '문구', entityLinkUsable: false })
    expect(
      screen.getByLabelText('엔티티 연결 (문구 선택 후 클릭)'),
    ).toBeDisabled()
  })

  it('canUploadImage=false면 이미지 버튼 비활성', () => {
    setup({ canUploadImage: false })
    expect(screen.getByLabelText('이미지 삽입')).toBeDisabled()
  })

  it('hasDocumentScope=false면 "설명 넣기" 버튼 없음', () => {
    setup({ hasDocumentScope: false })
    expect(
      screen.queryByLabelText('설명 넣기 (설명을 달 문구를 선택한 뒤 클릭)'),
    ).not.toBeInTheDocument()
  })

  it('색/표 피커 토글 버튼이 각 콜백 호출', () => {
    const props = setup()
    fireEvent.click(screen.getByLabelText('텍스트 색상'))
    fireEvent.click(screen.getByLabelText('표 삽입'))
    expect(props.onToggleColorPicker).toHaveBeenCalledTimes(1)
    expect(props.onToggleTablePicker).toHaveBeenCalledTimes(1)
  })

  it('cursorInTable=true면 표 편집 버튼이 나타나고 onTableOp 호출', () => {
    const props = setup({ cursorInTable: true })
    const addRowAbove = screen.getByLabelText('행 위에 삽입')
    expect(addRowAbove).toBeInTheDocument()
    fireEvent.click(addRowAbove)
    expect(props.onTableOp).toHaveBeenCalledTimes(1)
  })

  it('수평선 버튼 → onInsertHr', () => {
    const props = setup()
    fireEvent.click(screen.getByLabelText('수평선 삽입'))
    expect(props.onInsertHr).toHaveBeenCalled()
  })

  it('actions 슬롯을 렌더한다', () => {
    setup({ actions: <button type="button">저장</button> })
    expect(screen.getByText('저장')).toBeInTheDocument()
  })
})
