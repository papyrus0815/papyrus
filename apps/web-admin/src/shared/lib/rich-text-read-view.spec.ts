import {
  formatRichTextForReadView,
  isLikelyRichTextHtml,
  stripMentionLeadingAt,
} from './rich-text-read-view'

describe('stripMentionLeadingAt', () => {
  it('멘션 스팬 직후 @ 한 글자를 제거한다', () => {
    const html =
      '<p><span class="mention" data-type="person">@홍길동</span></p>'
    expect(stripMentionLeadingAt(html)).toBe(
      '<p><span class="mention" data-type="person">홍길동</span></p>',
    )
  })
})

describe('isLikelyRichTextHtml', () => {
  it('본문 앞이 태그가 아니어도 span 엔티티 링크가 있으면 true', () => {
    expect(
      isLikelyRichTextHtml(
        '소개 문구 <span class="entity-link" data-entity-type="person" data-entity-id="x">이름</span>',
      ),
    ).toBe(true)
  })

  it('순수 평문이면 false', () => {
    expect(isLikelyRichTextHtml('그는 위대한 지도자였다.')).toBe(false)
  })
})

describe('formatRichTextForReadView', () => {
  it('표·이미지 등 허용 마크업을 유지하고 script는 제거한다', () => {
    const dirty =
      '<table class="rich-table"><tbody><tr><td>셀</td></tr></tbody></table><script>alert(1)</script>'
    const out = formatRichTextForReadView(dirty)
    expect(out).toContain('rich-table')
    expect(out).toContain('셀')
    expect(out).not.toContain('script')
  })

  // RD1: 인라인 요소 사이의 의미 있는 공백은 보존, 블록 태그 사이 소스 개행만 접는다.
  it('인라인 요소(strong/em) 사이의 공백을 보존한다', () => {
    const out = formatRichTextForReadView('<p><strong>가</strong> <em>나</em></p>')
    // '가'와 '나' 사이 공백이 사라져 '가나'로 붙으면 안 된다.
    expect(out).toContain('</strong> <em>')
    expect(out).not.toContain('</strong><em>')
  })

  it('블록 태그(</p>) 뒤 소스 개행은 접어 빈 줄 누적을 막는다', () => {
    const out = formatRichTextForReadView('<p>A</p>\n<p>B</p>')
    expect(out).toContain('</p><p>')
    expect(out).not.toMatch(/<\/p>\s*\n\s*<p>/)
  })

  it('인라인 링크(a) 사이 공백도 보존한다', () => {
    const out = formatRichTextForReadView(
      '<p><a href="/x">앞</a> <a href="/y">뒤</a></p>',
    )
    expect(out).toContain('</a> <a')
  })
})
