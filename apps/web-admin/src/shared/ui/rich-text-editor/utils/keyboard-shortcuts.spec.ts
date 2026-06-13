import { detectMarkdownBlock, detectTrailingUrl } from './keyboard-shortcuts'

describe('detectMarkdownBlock', () => {
  it('*, - 는 불릿 목록', () => {
    expect(detectMarkdownBlock('*')).toEqual({
      kind: 'list',
      cmd: 'insertUnorderedList',
    })
    expect(detectMarkdownBlock('-')).toEqual({
      kind: 'list',
      cmd: 'insertUnorderedList',
    })
  })

  it('1. 은 번호 목록', () => {
    expect(detectMarkdownBlock('1.')).toEqual({
      kind: 'list',
      cmd: 'insertOrderedList',
    })
  })

  it('#, ##, ### 는 제목 1·2·3', () => {
    expect(detectMarkdownBlock('#')).toEqual({ kind: 'heading', level: 1 })
    expect(detectMarkdownBlock('##')).toEqual({ kind: 'heading', level: 2 })
    expect(detectMarkdownBlock('###')).toEqual({ kind: 'heading', level: 3 })
  })

  it('> 는 인용, --- 는 수평선', () => {
    expect(detectMarkdownBlock('>')).toEqual({ kind: 'quote' })
    expect(detectMarkdownBlock('---')).toEqual({ kind: 'hr' })
  })

  it('정확히 일치하지 않으면 null', () => {
    expect(detectMarkdownBlock('####')).toBeNull()
    expect(detectMarkdownBlock('# ')).toBeNull()
    expect(detectMarkdownBlock('foo')).toBeNull()
    expect(detectMarkdownBlock('')).toBeNull()
  })
})

describe('detectTrailingUrl', () => {
  it('맨 앞 http URL', () => {
    expect(detectTrailingUrl('http://example.com')).toEqual({
      url: 'http://example.com',
      href: 'http://example.com',
      startIdx: 0,
    })
  })

  it('앞에 텍스트가 있으면 startIdx가 URL 시작 오프셋', () => {
    // 'see ' = 4글자, URL은 인덱스 4부터
    expect(detectTrailingUrl('see https://a.io')).toEqual({
      url: 'https://a.io',
      href: 'https://a.io',
      startIdx: 4,
    })
  })

  it('www. 로 시작하면 https:// 를 붙인다', () => {
    expect(detectTrailingUrl('www.naver.com')).toEqual({
      url: 'www.naver.com',
      href: 'https://www.naver.com',
      startIdx: 0,
    })
  })

  it('URL이 아니거나 끝이 URL이 아니면 null', () => {
    expect(detectTrailingUrl('hello world')).toBeNull()
    expect(detectTrailingUrl('ftp://x')).toBeNull()
    expect(detectTrailingUrl('http://a.com 뒤에 텍스트')).toBeNull()
  })

  it('끝의 문장부호는 URL에 포함하지 않는다(매칭 실패)', () => {
    expect(detectTrailingUrl('http://a.com.')).toBeNull()
  })
})
