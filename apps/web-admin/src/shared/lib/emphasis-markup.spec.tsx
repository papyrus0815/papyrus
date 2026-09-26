import { renderToStaticMarkup } from 'react-dom/server'

import { emphasisToHtml, renderEmphasis } from './emphasis-markup'

describe('renderEmphasis', () => {
  it('강조가 없으면 원문 문자열을 그대로 돌려준다', () => {
    expect(renderEmphasis('평범한 문장')).toBe('평범한 문장')
  })

  it('*x*를 굵게 바꾸고 앞뒤 글은 보존한다', () => {
    expect(renderToStaticMarkup(<>{renderEmphasis('앞 *강조* 뒤')}</>)).toBe(
      '앞 <strong>강조</strong> 뒤',
    )
  })

  it('짝 없는 별표·줄을 넘는 별표는 건드리지 않는다', () => {
    expect(renderEmphasis('미초청국 3+*')).toBe('미초청국 3+*')
    expect(renderEmphasis('*첫 줄\n둘째 줄*')).toBe('*첫 줄\n둘째 줄*')
  })
})

describe('emphasisToHtml', () => {
  it('텍스트 조각의 *x*만 <strong>으로 바꾼다', () => {
    expect(emphasisToHtml('<p>앞 *강조* 뒤</p>')).toBe(
      '<p>앞 <strong>강조</strong> 뒤</p>',
    )
  })

  it('태그를 넘나드는 별표 쌍은 바꾸지 않는다', () => {
    expect(emphasisToHtml('<p>*앞</p><p>뒤*</p>')).toBe('<p>*앞</p><p>뒤*</p>')
  })

  it('속성값 속 별표는 건드리지 않는다', () => {
    const html = '<a title="*x*" href="/a">링크</a>'
    expect(emphasisToHtml(html)).toBe(html)
  })
})
