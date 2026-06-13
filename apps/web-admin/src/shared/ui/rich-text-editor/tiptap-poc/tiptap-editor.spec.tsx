import '@testing-library/jest-dom'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'

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

  it('엔티티 연결 버튼이 entity-link 노드를 삽입한다(커스텀 도메인 확장)', () => {
    render(<TiptapEditor value="<p>텍스트</p>" onChange={() => undefined} />)
    expect(
      document.querySelector('.ProseMirror span.entity-link'),
    ).toBeNull()
    fireEvent.click(screen.getByLabelText('엔티티 연결'))
    const span = document.querySelector('.ProseMirror span.entity-link')
    expect(span).not.toBeNull()
    expect(span?.getAttribute('data-entity-type')).toBe('person')
    expect(span?.getAttribute('data-entity-id')).toBe('1')
    expect(span?.textContent).toBe('나폴레옹')
  })

  it('기존 entity-link HTML을 파싱·렌더한다(라운드트립 호환)', () => {
    const html =
      '<p>황제 <span class="entity-link" data-entity-type="person" ' +
      'data-entity-id="42" data-entity-name="나폴레옹 보나파르트">나폴레옹</span> 등장</p>'
    render(<TiptapEditor value={html} onChange={() => undefined} />)
    const span = document.querySelector('.ProseMirror span.entity-link')
    expect(span).not.toBeNull()
    expect(span?.getAttribute('data-entity-id')).toBe('42')
    expect(span?.textContent).toBe('나폴레옹')
  })

  it('용어 연결 버튼이 term 노드를 삽입한다(엔티티와 동형 패턴)', () => {
    render(<TiptapEditor value="<p>텍스트</p>" onChange={() => undefined} />)
    fireEvent.click(screen.getByLabelText('용어 연결'))
    const span = document.querySelector('.ProseMirror span.term')
    expect(span).not.toBeNull()
    expect(span?.getAttribute('data-term-id')).toBe('t1')
    expect(span?.textContent).toBe('봉건')
  })

  it('기존 term HTML을 파싱·렌더한다(라운드트립)', () => {
    const html =
      '<p>중세 <span class="term" data-term-id="99" ' +
      'data-term-name="봉건제">봉건</span> 사회</p>'
    render(<TiptapEditor value={html} onChange={() => undefined} />)
    const span = document.querySelector('.ProseMirror span.term')
    expect(span).not.toBeNull()
    expect(span?.getAttribute('data-term-id')).toBe('99')
    expect(span?.textContent).toBe('봉건')
  })

  it('이미지 삽입 버튼이 figure(img+figcaption) 블록 노드를 삽입한다', () => {
    render(<TiptapEditor value="<p>텍스트</p>" onChange={() => undefined} />)
    fireEvent.click(screen.getByLabelText('이미지 삽입'))
    const figure = document.querySelector('.ProseMirror figure')
    expect(figure).not.toBeNull()
    expect(figure?.querySelector('img')?.getAttribute('src')).toBe(
      'https://example.com/x.png',
    )
    expect(figure?.querySelector('figcaption')?.textContent).toBe('캡션 예시')
  })

  it('기존 figure HTML을 파싱·렌더한다(블록 노드 라운드트립)', () => {
    const html =
      '<figure><img src="https://ex.com/a.jpg" alt="설명">' +
      '<figcaption>옛 캡션</figcaption></figure>'
    render(<TiptapEditor value={html} onChange={() => undefined} />)
    const figure = document.querySelector('.ProseMirror figure')
    expect(figure).not.toBeNull()
    expect(figure?.querySelector('img')?.getAttribute('src')).toBe(
      'https://ex.com/a.jpg',
    )
    expect(figure?.querySelector('figcaption')?.textContent).toBe('옛 캡션')
  })

  it('리사이즈 이미지: React NodeView 마운트 + 버튼으로 너비 속성 변경', async () => {
    render(<TiptapEditor value="" onChange={() => undefined} />)
    fireEvent.click(screen.getByLabelText('리사이즈 이미지'))
    // ReactNodeViewRenderer는 비동기 마운트 → waitFor로 대기.
    await waitFor(() =>
      expect(
        document.querySelector('[data-testid="resizable-image"]'),
      ).not.toBeNull(),
    )
    const imgWidth = () =>
      (
        document.querySelector(
          '[data-testid="resizable-image"] img',
        ) as HTMLImageElement
      ).style.width
    expect(imgWidth()).toBe('200px')
    // 인터랙티브: NodeView의 "넓게" 버튼이 width 속성을 변경(드래그 없이 핵심 실증)
    fireEvent.click(screen.getByLabelText('넓게'))
    await waitFor(() => expect(imgWidth()).toBe('250px'))
  })

  it('기존 data-resizable img를 파싱한다(width 보존, NodeView 렌더)', async () => {
    render(
      <TiptapEditor
        value='<p><img data-resizable src="https://ex.com/i.png" style="width:300px"></p>'
        onChange={() => undefined}
      />,
    )
    await waitFor(() =>
      expect(
        document.querySelector('[data-testid="resizable-image"]'),
      ).not.toBeNull(),
    )
    expect(
      (
        document.querySelector(
          '[data-testid="resizable-image"] img',
        ) as HTMLImageElement
      ).style.width,
    ).toBe('300px')
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
