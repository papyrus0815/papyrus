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
})
