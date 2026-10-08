/**
 * 본문 새니타이저 — 지도 블록(구글 지도 퍼가기 iframe)만 통과하고 나머지 iframe은 버린다.
 */
import DOMPurify from 'dompurify'

import { sanitizeRichTextHtml } from './sanitize-rich-text-html'

const MAP = 'https://www.google.com/maps/embed?pb=!1m18'

describe('sanitizeRichTextHtml — 지도 블록', () => {
  it('구글 지도 퍼가기 iframe은 남고, 지연 로드·리퍼러 정책이 붙는다', () => {
    const out = sanitizeRichTextHtml(
      `<figure class="map-embed" data-type="map-embed"><iframe src="${MAP}" allowfullscreen></iframe><figcaption>진격로</figcaption></figure>`,
    )
    expect(out).toContain(`<iframe src="${MAP}"`)
    expect(out).toContain('loading="lazy"')
    expect(out).toContain('referrerpolicy="no-referrer-when-downgrade"')
    expect(out).toContain('<figcaption>진격로</figcaption>')
  })

  it('다른 주소·꼬리 붙인 호스트·srcdoc iframe은 버린다', () => {
    expect(sanitizeRichTextHtml('<p>a</p><iframe src="https://evil.example/x"></iframe>')).toBe('<p>a</p>')
    expect(
      sanitizeRichTextHtml('<iframe src="https://www.google.com.evil.example/maps/embed?pb=1"></iframe>'),
    ).toBe('')
    const srcdoc = sanitizeRichTextHtml(`<iframe src="${MAP}" srcdoc="<script>alert(1)</script>" onload="x()"></iframe>`)
    expect(srcdoc).not.toContain('srcdoc')
    expect(srcdoc).not.toContain('onload')
  })

  it('앱의 기본 DOMPurify에는 iframe 허용이 번지지 않는다', () => {
    expect(DOMPurify.sanitize(`<iframe src="${MAP}"></iframe>`)).toBe('')
  })
})
