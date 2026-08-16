import {
  formatRichTextForReadView,
  isLikelyRichTextHtml,
  plainTextToRichTextHtml,
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

describe('plainTextToRichTextHtml', () => {
  it('빈 줄을 문단 경계로 삼아 <p>로 감싼다', () => {
    expect(plainTextToRichTextHtml('첫 문단.\n\n둘째 문단.')).toBe(
      '<p>첫 문단.</p><p>둘째 문단.</p>',
    )
  })

  it('문단 안의 단일 개행은 <br>로 옮긴다', () => {
    expect(plainTextToRichTextHtml('첫 줄\n둘째 줄')).toBe(
      '<p>첫 줄<br>둘째 줄</p>',
    )
  })

  it('빈 줄이 셋 이상이거나 공백이 섞여도 문단 하나로 합치지 않는다', () => {
    expect(plainTextToRichTextHtml('가.\n\n\n나.\n \n다.')).toBe(
      '<p>가.</p><p>나.</p><p>다.</p>',
    )
  })

  it('태그 문자를 이스케이프해 평문의 <가 마크업이 되지 않게 한다', () => {
    expect(plainTextToRichTextHtml('a < b & c > d')).toBe(
      '<p>a &lt; b &amp; c &gt; d</p>',
    )
  })

  it('빈 값·공백만 있는 값은 빈 문자열', () => {
    expect(plainTextToRichTextHtml('')).toBe('')
    expect(plainTextToRichTextHtml('   \n\n  ')).toBe('')
    expect(plainTextToRichTextHtml(null)).toBe('')
    expect(plainTextToRichTextHtml(undefined)).toBe('')
  })

  it('CRLF 개행도 LF와 같게 다룬다', () => {
    expect(plainTextToRichTextHtml('가.\r\n\r\n나.')).toBe('<p>가.</p><p>나.</p>')
  })

  /**
   * 이 변환이 필요한 이유 자체를 고정하는 회귀 테스트 — 시드가 넣은 순수 텍스트는
   * isLikelyRichTextHtml이 false로 보고, 변환 결과는 true로 봐야 에디터가 그 뒤로
   * 자기 출력과 같은 형식을 다루게 된다.
   */
  it('변환 전은 평문·변환 후는 리치텍스트로 판정된다', () => {
    const seeded = '세르비아의 정치가.\n\n출신과 유학. 자예차르에서 태어났다.'
    expect(isLikelyRichTextHtml(seeded)).toBe(false)
    expect(isLikelyRichTextHtml(plainTextToRichTextHtml(seeded))).toBe(true)
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
