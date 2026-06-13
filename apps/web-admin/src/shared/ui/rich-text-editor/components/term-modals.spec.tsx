import '@testing-library/jest-dom'

import { fireEvent, screen } from '@testing-library/react'

import type { GlossaryTermDto } from '@/shared/api/glossary'
import { renderWithTheme } from '@/shared/test/render-with-theme'

import { TermEditModal, TermLinkModal } from './term-modals'

const TERMS = [
  { id: 't1', name: '봉건제', description: '중세 토지 제도' },
  { id: 't2', name: '르네상스', description: '문예 부흥' },
] as unknown as GlossaryTermDto[]

function linkProps(
  overrides: Partial<Parameters<typeof TermLinkModal>[0]> = {},
) {
  return {
    visible: true,
    explanationOnly: false,
    selectedText: '봉건',
    query: '',
    onQueryChange: jest.fn(),
    results: TERMS,
    selectedIndex: 0,
    onSelectedIndexChange: jest.fn(),
    onInsert: jest.fn(),
    newName: '',
    onNewNameChange: jest.fn(),
    newDesc: '',
    onNewDescChange: jest.fn(),
    documentOnly: true,
    onDocumentOnlyChange: jest.fn(),
    hasDocumentScope: true,
    onCreateAndLink: jest.fn(),
    onClose: jest.fn(),
    playClickSound: jest.fn(),
    ...overrides,
  }
}

describe('TermLinkModal', () => {
  it('visible=false면 렌더하지 않는다', () => {
    const props = linkProps({ visible: false })
    renderWithTheme(<TermLinkModal {...props} />)
    expect(screen.queryByText('용어 연결')).not.toBeInTheDocument()
  })

  it('검색 모드: 제목·검색창·결과 항목', () => {
    const props = linkProps()
    renderWithTheme(<TermLinkModal {...props} />)
    expect(screen.getByText('용어 연결')).toBeInTheDocument()
    expect(screen.getByText('봉건제')).toBeInTheDocument()
    expect(screen.getByText('르네상스')).toBeInTheDocument()
  })

  it('explanationOnly=true면 "설명 넣기" 모드(검색창 없음)', () => {
    const props = linkProps({ explanationOnly: true })
    renderWithTheme(<TermLinkModal {...props} />)
    expect(screen.getAllByText('설명 넣기').length).toBeGreaterThan(0)
    expect(
      screen.queryByPlaceholderText(/용어 검색/),
    ).not.toBeInTheDocument()
  })

  it('검색어 입력 시 onQueryChange', () => {
    const props = linkProps()
    renderWithTheme(<TermLinkModal {...props} />)
    fireEvent.change(screen.getByPlaceholderText(/용어 검색/), {
      target: { value: '르네' },
    })
    expect(props.onQueryChange).toHaveBeenCalledWith('르네')
  })

  it('결과 클릭 시 playClickSound + onInsert', () => {
    const props = linkProps()
    renderWithTheme(<TermLinkModal {...props} />)
    fireEvent.click(screen.getByText('르네상스'))
    expect(props.playClickSound).toHaveBeenCalledTimes(1)
    expect(props.onInsert).toHaveBeenCalledWith(TERMS[1])
  })

  it('hasDocumentScope=false면 "이 문서에만 사용" 체크박스 없음', () => {
    const props = linkProps({ hasDocumentScope: false })
    renderWithTheme(<TermLinkModal {...props} />)
    expect(screen.queryByText(/이 문서에만 사용/)).not.toBeInTheDocument()
  })

  it('새 용어명 입력 후 "등록 후 연결" → onCreateAndLink', () => {
    const props = linkProps({ newName: '봉건제' })
    renderWithTheme(<TermLinkModal {...props} />)
    fireEvent.click(screen.getByText('등록 후 연결'))
    expect(props.onCreateAndLink).toHaveBeenCalledTimes(1)
  })
})

function editProps(
  overrides: Partial<Parameters<typeof TermEditModal>[0]> = {},
) {
  return {
    visible: true,
    loading: false,
    isDocumentScoped: false,
    name: '봉건제',
    onNameChange: jest.fn(),
    desc: '설명',
    onDescChange: jest.fn(),
    onSave: jest.fn(),
    onDelete: jest.fn(),
    onClose: jest.fn(),
    playClickSound: jest.fn(),
    ...overrides,
  }
}

describe('TermEditModal', () => {
  it('visible=false면 렌더하지 않는다', () => {
    const props = editProps({ visible: false })
    renderWithTheme(<TermEditModal {...props} />)
    expect(screen.queryByText('용어 수정')).not.toBeInTheDocument()
  })

  it('loading=true면 불러오는 중', () => {
    const props = editProps({ loading: true })
    renderWithTheme(<TermEditModal {...props} />)
    expect(screen.getByText(/불러오는 중/)).toBeInTheDocument()
  })

  it('일반 용어 수정: 제목 "용어 수정" + 용어명 입력', () => {
    const props = editProps()
    renderWithTheme(<TermEditModal {...props} />)
    expect(screen.getByText('용어 수정')).toBeInTheDocument()
    fireEvent.change(screen.getByDisplayValue('봉건제'), {
      target: { value: '봉건제도' },
    })
    expect(props.onNameChange).toHaveBeenCalledWith('봉건제도')
  })

  it('문서 전용: "설명 수정" 제목 + "설명 삭제" 버튼 → onDelete', () => {
    const props = editProps({ isDocumentScoped: true })
    renderWithTheme(<TermEditModal {...props} />)
    expect(screen.getByText('설명 수정')).toBeInTheDocument()
    fireEvent.click(screen.getByText('설명 삭제'))
    expect(props.onDelete).toHaveBeenCalledTimes(1)
  })

  it('저장 버튼 → playClickSound + onSave', () => {
    const props = editProps()
    renderWithTheme(<TermEditModal {...props} />)
    fireEvent.click(screen.getByText('저장'))
    expect(props.playClickSound).toHaveBeenCalledTimes(1)
    expect(props.onSave).toHaveBeenCalledTimes(1)
  })
})
