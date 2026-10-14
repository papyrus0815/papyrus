import { apiErrorMessageFromBody } from './get-api-error-message'

describe('apiErrorMessageFromBody', () => {
  it('전역 예외 필터 형식 { error: { message } }', () => {
    const body = JSON.stringify({
      success: false,
      statusCode: 400,
      error: { name: 'BadRequestException', message: '입력값을 확인해 주세요: title should not be empty' },
    })
    expect(apiErrorMessageFromBody(body)).toBe('입력값을 확인해 주세요: title should not be empty')
  })

  it('Nest 기본 형식 { message } — 문자열과 배열', () => {
    expect(apiErrorMessageFromBody('{"message":"없음"}')).toBe('없음')
    expect(apiErrorMessageFromBody('{"message":["a","b"]}')).toBe('a, b')
  })

  it('짧은 평문은 그대로, HTML·빈 본문은 null', () => {
    expect(apiErrorMessageFromBody('Bad Gateway')).toBe('Bad Gateway')
    expect(apiErrorMessageFromBody('<html><body>502</body></html>')).toBeNull()
    expect(apiErrorMessageFromBody('')).toBeNull()
  })

  it('메시지를 못 찾으면 null', () => {
    expect(apiErrorMessageFromBody('{"success":false}')).toBeNull()
  })
})
