import {
  caretRangeFromCharOffset,
  isEmptyRichBlock,
  removeEmptyBlocksBefore,
} from './caret-helpers'

function el(html: string): HTMLElement {
  const root = document.createElement('div')
  root.innerHTML = html
  return root
}

describe('isEmptyRichBlock', () => {
  it('null이면 false', () => {
    expect(isEmptyRichBlock(null)).toBe(false)
  })

  it('P/DIV가 아니면 false', () => {
    const span = el('<span></span>').firstElementChild
    expect(isEmptyRichBlock(span)).toBe(false)
  })

  it('빈 P는 true', () => {
    const p = el('<p></p>').firstElementChild
    expect(isEmptyRichBlock(p)).toBe(true)
  })

  it('공백/zero-width space만 있으면 true', () => {
    const p = el('<p>   ​ </p>').firstElementChild
    expect(isEmptyRichBlock(p)).toBe(true)
  })

  it('텍스트가 있으면 false', () => {
    const p = el('<p>안녕</p>').firstElementChild
    expect(isEmptyRichBlock(p)).toBe(false)
  })

  it('미디어/구조 요소(img·table 등)를 품으면 비어보여도 false', () => {
    expect(isEmptyRichBlock(el('<p><img alt=""></p>').firstElementChild)).toBe(
      false,
    )
    expect(
      isEmptyRichBlock(el('<div><table></table></div>').firstElementChild),
    ).toBe(false)
  })
})

describe('removeEmptyBlocksBefore', () => {
  it('대상 노드 앞의 연속 빈 블록을 제거한다', () => {
    const root = el('<p></p><p></p><p id="t">본문</p>')
    const target = root.querySelector('#t')!
    removeEmptyBlocksBefore(target)
    expect(root.querySelectorAll('p').length).toBe(1)
    expect(root.firstElementChild).toBe(target)
  })

  it('비어있지 않은 블록을 만나면 멈춘다', () => {
    const root = el('<p>유지</p><p></p><p id="t">본문</p>')
    const target = root.querySelector('#t')!
    removeEmptyBlocksBefore(target)
    expect(root.querySelectorAll('p').length).toBe(2)
    expect(root.firstElementChild?.textContent).toBe('유지')
  })
})

describe('caretRangeFromCharOffset', () => {
  it('오프셋이 첫 텍스트 노드 안이면 해당 위치를 가리킨다', () => {
    const root = el('<p>abc</p><p>de</p>')
    const range = caretRangeFromCharOffset(root, 2)!
    expect((range.startContainer as Text).data).toBe('abc')
    expect(range.startOffset).toBe(2)
    expect(range.collapsed).toBe(true)
  })

  it('오프셋이 첫 노드를 넘으면 다음 텍스트 노드로 넘어간다', () => {
    const root = el('<p>abc</p><p>de</p>')
    const range = caretRangeFromCharOffset(root, 4)!
    expect((range.startContainer as Text).data).toBe('de')
    expect(range.startOffset).toBe(1)
  })

  it('총 길이를 초과하면 마지막 텍스트 끝에 둔다', () => {
    const root = el('<p>abc</p><p>de</p>')
    const range = caretRangeFromCharOffset(root, 100)!
    expect((range.startContainer as Text).data).toBe('de')
    expect(range.startOffset).toBe(2)
  })

  it('텍스트가 전혀 없으면 root를 선택한다', () => {
    const root = el('')
    const range = caretRangeFromCharOffset(root, 5)!
    expect(range.startContainer).toBe(root)
  })
})
