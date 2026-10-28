import { tidyProseHtml } from './prose-tidy'

describe('tidyProseHtml', () => {
  it('빈 단락(<br>·nbsp·공백)과 빈 글꼴을 걷어낸다', () => {
    const html =
      '<p>앞</p><p><br></p><div class="prose-hr" role="separator"></div><p><br></p><p><font color="#000000"></font></p><h2><font color="#000000">1.2 제목</font></h2><p>&nbsp;</p><p>뒤</p>'
    expect(tidyProseHtml(html)).toBe(
      '<p>앞</p><div class="prose-hr" role="separator"></div><h2><font color="#000000">1.2 제목</font></h2><p>뒤</p>',
    )
  })

  it('글자가 있는 단락·목록·표는 그대로', () => {
    const html = '<p>본문 <br>둘째 줄</p><ul><li><br></li></ul><table><tr><td></td></tr></table>'
    expect(tidyProseHtml(html)).toBe(html)
  })

  it('빈 글꼴이 겹쳐 있어도 걷어낸다', () => {
    expect(tidyProseHtml('<p><font><font color="red"></font></font></p><p>x</p>')).toBe('<p>x</p>')
  })

  it('빈 문자열은 그대로', () => {
    expect(tidyProseHtml('')).toBe('')
  })
})
