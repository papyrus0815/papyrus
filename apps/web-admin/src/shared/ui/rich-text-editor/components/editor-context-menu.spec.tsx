import '@testing-library/jest-dom'

import { fireEvent, screen } from '@testing-library/react'

import { renderWithTheme } from '@/shared/test/render-with-theme'

import { EditorContextMenu } from './editor-context-menu'

function setup(
  overrides: Partial<Parameters<typeof EditorContextMenu>[0]> = {},
) {
  const props = {
    visible: true,
    top: 10,
    left: 10,
    selectedText: '선택된 문구',
    entityLinkUsable: true,
    hasDocumentScope: true,
    playClickSound: jest.fn(),
    onEntityLink: jest.fn(),
    onTermLink: jest.fn(),
    onExplanation: jest.fn(),
    ...overrides,
  }
  renderWithTheme(<EditorContextMenu {...props} />)
  return props
}

function itemButton(label: string) {
  return screen.getByText(label).closest('button')
}

describe('EditorContextMenu', () => {
  it('선택 문구가 있으면 항목이 활성화된다', () => {
    setup()
    expect(itemButton('엔티티 연결')).toBeEnabled()
    expect(itemButton('용어 연결')).toBeEnabled()
  })

  it('선택 문구가 없으면 힌트 + 항목 비활성', () => {
    setup({ selectedText: '' })
    expect(
      screen.getByText(/드래그로 선택한 뒤 메뉴를 선택/),
    ).toBeInTheDocument()
    expect(itemButton('엔티티 연결')).toBeDisabled()
    expect(itemButton('용어 연결')).toBeDisabled()
  })

  it('entityLinkUsable=false면 엔티티 항목만 비활성', () => {
    setup({ entityLinkUsable: false })
    expect(itemButton('엔티티 연결')).toBeDisabled()
    expect(itemButton('용어 연결')).toBeEnabled()
  })

  it('hasDocumentScope=false면 "설명 넣기"가 없다', () => {
    setup({ hasDocumentScope: false })
    expect(screen.queryByText('설명 넣기')).not.toBeInTheDocument()
  })

  it('엔티티 항목 클릭 시 playClickSound + onEntityLink', () => {
    const props = setup()
    fireEvent.click(screen.getByText('엔티티 연결'))
    expect(props.playClickSound).toHaveBeenCalledTimes(1)
    expect(props.onEntityLink).toHaveBeenCalledTimes(1)
  })

  it('설명 넣기 클릭 시 onExplanation', () => {
    const props = setup()
    fireEvent.click(screen.getByText('설명 넣기'))
    expect(props.onExplanation).toHaveBeenCalledTimes(1)
  })
})
