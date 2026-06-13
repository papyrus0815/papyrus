import '@testing-library/jest-dom'

import { fireEvent, render, screen } from '@testing-library/react'

import { TiptapEditor } from './tiptap-editor'

describe('TiptapEditor (TipTap 마이그레이션 PoC)', () => {
  it('크래시 없이 마운트되고 ProseMirror 본문을 렌더한다', () => {
    render(<TiptapEditor value="" onChange={() => undefined} />)
    expect(screen.getByTestId('tiptap-editor')).toBeInTheDocument()
    expect(document.querySelector('.ProseMirror')).not.toBeNull()
    expect(
      document.querySelector('[contenteditable="true"]'),
    ).not.toBeNull()
  })

  it('전달한 value의 텍스트를 표시한다', () => {
    render(
      <TiptapEditor value="<p>안녕 TipTap</p>" onChange={() => undefined} />,
    )
    expect(screen.getByText('안녕 TipTap')).toBeInTheDocument()
  })

  it('핵심 서식 툴바를 렌더한다', () => {
    render(<TiptapEditor value="" onChange={() => undefined} />)
    expect(screen.getByLabelText('굵게')).toBeInTheDocument()
    expect(screen.getByLabelText('기울임')).toBeInTheDocument()
    expect(screen.getByLabelText('제목 1')).toBeInTheDocument()
    expect(screen.getByLabelText('순서 없는 목록')).toBeInTheDocument()
    expect(screen.getByLabelText('인용')).toBeInTheDocument()
  })

  it('서식 버튼 클릭이 에러 없이 chain 명령을 실행한다', () => {
    render(<TiptapEditor value="<p>텍스트</p>" onChange={() => undefined} />)
    // jsdom selection 한계로 결과 HTML까지 단언하진 않되, 명령 실행이 throw하지 않음을 확인.
    expect(() => {
      fireEvent.click(screen.getByLabelText('굵게'))
      fireEvent.click(screen.getByLabelText('제목 1'))
      fireEvent.click(screen.getByLabelText('순서 없는 목록'))
    }).not.toThrow()
  })

  it('표 삽입 버튼이 ProseMirror 본문에 표를 추가한다', () => {
    render(<TiptapEditor value="<p>텍스트</p>" onChange={() => undefined} />)
    expect(document.querySelector('.ProseMirror table')).toBeNull()
    fireEvent.click(screen.getByLabelText('표 삽입'))
    expect(document.querySelector('.ProseMirror table')).not.toBeNull()
  })

  it('value prop이 바뀌면 본문이 동기화된다', () => {
    const { rerender } = render(
      <TiptapEditor value="<p>처음</p>" onChange={() => undefined} />,
    )
    expect(screen.getByText('처음')).toBeInTheDocument()
    rerender(<TiptapEditor value="<p>나중</p>" onChange={() => undefined} />)
    expect(screen.getByText('나중')).toBeInTheDocument()
  })
})
