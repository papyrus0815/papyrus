import { richTextToPlainText } from './rich-text-plain'

describe('richTextToPlainText', () => {
  it('블록 경계를 공백으로 — 줄이 붙지 않는다', () => {
    expect(richTextToPlainText('검토용 첫 줄<div>검토용 둘째 줄</div>')).toBe(
      '검토용 첫 줄 검토용 둘째 줄',
    )
  })

  it('문단·줄바꿈·인라인 서식을 걷고 엔티티를 푼다', () => {
    expect(
      richTextToPlainText('<p>가 <strong>나</strong></p><p>다<br>라 &amp; 마</p>'),
    ).toBe('가 나 다 라 & 마')
  })

  it('평문은 공백만 정리해 그대로 — 부등호가 섞여도 태그로 보지 않는다', () => {
    expect(richTextToPlainText('첫 문단.\n\n둘째 문단.')).toBe('첫 문단. 둘째 문단.')
    expect(richTextToPlainText('매출 < 비용 > 0')).toBe('매출 < 비용 > 0')
  })

  it('빈 값은 빈 문자열', () => {
    expect(richTextToPlainText(null)).toBe('')
    expect(richTextToPlainText('<p><br></p>')).toBe('')
  })
})
