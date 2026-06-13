import '@testing-library/jest-dom'

import { fireEvent, screen } from '@testing-library/react'

import { renderWithTheme } from '@/shared/test/render-with-theme'

import { RichTextEditor } from './rich-text-editor'

// 아래 모듈들은 @/shared/api/client(import.meta)를 끌어와 ts-jest에서 깨지므로 mock.
// 조립된 에디터를 마운트해 "전체가 렌더되고 onChange 계약이 동작"하는지 보는 스모크/통합.
jest.mock('@/shared/api/upload', () => ({
  getUploadImageUrl: (path: string) => path,
  validateImageFile: () => null,
}))
jest.mock('@/shared/api/glossary', () => ({
  getGlossaryTerms: jest.fn(() => Promise.resolve([])),
  getGlossaryTermById: jest.fn(() => Promise.resolve(null)),
  createGlossaryTerm: jest.fn(),
  updateGlossaryTerm: jest.fn(),
  deleteGlossaryTerm: jest.fn(),
}))
jest.mock('@/shared/api/entity-link-search', () => ({
  fetchEntityLinkSearch: jest.fn(() => Promise.resolve([])),
  mapEntityLinkRowsToMentionItems: () => [],
}))
jest.mock('@/shared/lib/rich-text-read-view', () => ({
  resolveRichTextImageSrcsForDisplay: (html: string) => html,
}))
jest.mock('@/shared/hooks/use-click-sound.hook', () => ({
  useClickSound: () => () => undefined,
}))

function editorEl() {
  return document.querySelector('[contenteditable="true"]') as HTMLElement
}

describe('RichTextEditor (통합 스모크)', () => {
  it('크래시 없이 마운트되고 contentEditable 본문을 렌더한다', () => {
    renderWithTheme(<RichTextEditor value="" onChange={() => undefined} />)
    expect(editorEl()).toBeInTheDocument()
  })

  it('전달한 value의 텍스트가 본문에 표시된다', () => {
    renderWithTheme(
      <RichTextEditor value="<p>안녕하세요</p>" onChange={() => undefined} />,
    )
    expect(screen.getByText('안녕하세요')).toBeInTheDocument()
  })

  it('서식 툴바(굵게 등)가 함께 렌더된다', () => {
    renderWithTheme(<RichTextEditor value="" onChange={() => undefined} />)
    // 툴바 버튼은 aria-label 또는 title을 가짐 — 최소 1개 이상의 버튼 존재
    expect(document.querySelectorAll('button').length).toBeGreaterThan(0)
  })

  it('본문 input 시 onChange가 호출된다(debounceMs=0 기본)', () => {
    const onChange = jest.fn()
    renderWithTheme(<RichTextEditor value="" onChange={onChange} />)
    const editor = editorEl()
    editor.innerHTML = '<p>새 내용</p>'
    fireEvent.input(editor)
    expect(onChange).toHaveBeenCalled()
  })

  it('showTitle=true면 제목 입력칸을 렌더한다', () => {
    renderWithTheme(
      <RichTextEditor
        value=""
        onChange={() => undefined}
        showTitle
        title="제목값"
        titlePlaceholder="제목을 입력"
      />,
    )
    expect(screen.getByPlaceholderText('제목을 입력')).toBeInTheDocument()
  })

  it('placeholder가 data-placeholder로 설정된다', () => {
    renderWithTheme(
      <RichTextEditor
        value=""
        onChange={() => undefined}
        placeholder="여기에 입력"
      />,
    )
    expect(editorEl().getAttribute('data-placeholder')).toBe('여기에 입력')
  })

  it('value prop이 바뀌면 본문이 재동기화된다', () => {
    const { rerender } = renderWithTheme(
      <RichTextEditor value="<p>처음</p>" onChange={() => undefined} />,
    )
    expect(screen.getByText('처음')).toBeInTheDocument()
    rerender(<RichTextEditor value="<p>나중</p>" onChange={() => undefined} />)
    expect(screen.getByText('나중')).toBeInTheDocument()
  })

  it('debounceMs>0이면 flushRef로 대기 중 변경을 즉시 방출한다', () => {
    const onChange = jest.fn()
    const flushRef = { current: null as null | (() => string | null) }
    renderWithTheme(
      <RichTextEditor
        value=""
        onChange={onChange}
        debounceMs={300}
        flushRef={flushRef}
      />,
    )
    const editor = editorEl()
    editor.innerHTML = '<p>대기중</p>'
    fireEvent.input(editor)
    // 디바운스 중이라 아직 방출되지 않음
    expect(onChange).not.toHaveBeenCalled()
    // 부모가 flushRef로 즉시 방출
    expect(flushRef.current).toBeInstanceOf(Function)
    flushRef.current?.()
    expect(onChange).toHaveBeenCalled()
  })

  it('제목 입력 시 onTitleChange가 호출된다', () => {
    const onTitleChange = jest.fn()
    renderWithTheme(
      <RichTextEditor
        value=""
        onChange={() => undefined}
        showTitle
        title=""
        titlePlaceholder="제목"
        onTitleChange={onTitleChange}
      />,
    )
    fireEvent.change(screen.getByPlaceholderText('제목'), {
      target: { value: '새 제목' },
    })
    expect(onTitleChange).toHaveBeenCalledWith('새 제목')
  })
})
