import '@testing-library/jest-dom'

import { fireEvent, screen } from '@testing-library/react'

import type { MentionItem } from '@/shared/lib/mention/mention-system'
import { renderWithTheme } from '@/shared/test/render-with-theme'

import { EntityLinkModal } from './entity-link-modal'

// @/shared/api/upload → client.ts가 import.meta를 써 ts-jest에서 깨지므로 mock.
// (테스트의 RESULTS는 person이 아니라 실제 호출되진 않지만 모듈 로드 자체를 막아야 함)
jest.mock('@/shared/api/upload', () => ({
  getUploadImageUrl: (path: string) => path,
}))

const RESULTS = [
  { type: 'event', id: '1', name: '프랑스 혁명' },
  { type: 'event', id: '2', name: '미국 독립' },
] as unknown as MentionItem[]

function setup(overrides: Partial<Parameters<typeof EntityLinkModal>[0]> = {}) {
  const props = {
    visible: true,
    selectedText: '혁명',
    query: '',
    results: RESULTS,
    selectedIndex: 0,
    loading: false,
    remote: false,
    hasMentionEntities: true,
    countryId: undefined,
    playClickSound: jest.fn(),
    onQueryChange: jest.fn(),
    onSelectedIndexChange: jest.fn(),
    onInsert: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  }
  renderWithTheme(<EntityLinkModal {...props} />)
  return props
}

describe('EntityLinkModal', () => {
  it('visible=false면 렌더하지 않는다', () => {
    setup({ visible: false })
    expect(screen.queryByText('엔티티 연결')).not.toBeInTheDocument()
  })

  it('선택 텍스트와 결과 항목을 렌더', () => {
    setup()
    expect(screen.getByText('엔티티 연결')).toBeInTheDocument()
    expect(screen.getByText('선택한 텍스트')).toBeInTheDocument()
    expect(screen.getByText('프랑스 혁명')).toBeInTheDocument()
    expect(screen.getByText('미국 독립')).toBeInTheDocument()
  })

  it('loading=true면 검색 중 메시지', () => {
    setup({ loading: true })
    expect(screen.getByText(/불러오는 중입니다/)).toBeInTheDocument()
  })

  it('결과 없음 + 빈 검색어면 안내 문구', () => {
    setup({ results: [], query: '' })
    expect(screen.getByText(/연결할 수 있는 항목이 없습니다/)).toBeInTheDocument()
  })

  it('검색어 입력 시 onQueryChange', () => {
    const props = setup()
    fireEvent.change(screen.getByPlaceholderText(/연결할 엔티티/), {
      target: { value: '독립' },
    })
    expect(props.onQueryChange).toHaveBeenCalledWith('독립')
  })

  it('Enter는 현재 선택 항목으로 onInsert', () => {
    const props = setup({ selectedIndex: 1 })
    fireEvent.keyDown(screen.getByPlaceholderText(/연결할 엔티티/), {
      key: 'Enter',
    })
    expect(props.onInsert).toHaveBeenCalledWith(RESULTS[1])
  })

  it('ArrowDown은 onSelectedIndexChange를 호출', () => {
    const props = setup()
    fireEvent.keyDown(screen.getByPlaceholderText(/연결할 엔티티/), {
      key: 'ArrowDown',
    })
    expect(props.onSelectedIndexChange).toHaveBeenCalled()
  })

  it('항목 클릭 시 playClickSound + onInsert', () => {
    const props = setup()
    fireEvent.click(screen.getByText('미국 독립'))
    expect(props.playClickSound).toHaveBeenCalledTimes(1)
    expect(props.onInsert).toHaveBeenCalledWith(RESULTS[1])
  })

  it('닫기 버튼 → onClose', () => {
    const props = setup()
    fireEvent.click(screen.getByLabelText('닫기'))
    expect(props.onClose).toHaveBeenCalledTimes(1)
  })
})
