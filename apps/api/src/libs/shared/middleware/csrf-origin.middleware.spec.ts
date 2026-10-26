import { isAllowedRequestOrigin } from './csrf-origin.middleware'

describe('isAllowedRequestOrigin', () => {
  const allowedOrigins = ['https://app.example.com']

  it('허용 목록의 출처는 통과', () => {
    expect(
      isAllowedRequestOrigin({ origin: 'https://app.example.com', allowedOrigins, requestHost: 'api.example.com' }),
    ).toBe(true)
  })

  it('같은 호스트(nginx 뒤 같은 오리진)는 통과', () => {
    expect(
      isAllowedRequestOrigin({ origin: 'https://papyrus.example.org', allowedOrigins: [], requestHost: 'papyrus.example.org' }),
    ).toBe(true)
  })

  it('다른 사이트는 거절', () => {
    expect(
      isAllowedRequestOrigin({ origin: 'https://evil.example', allowedOrigins, requestHost: 'app.example.com' }),
    ).toBe(false)
  })

  it('같은 사이트의 다른 서브도메인도 거절 (SameSite가 못 막는 경우)', () => {
    expect(
      isAllowedRequestOrigin({ origin: 'https://blog.example.com', allowedOrigins, requestHost: 'api.example.com' }),
    ).toBe(false)
  })

  it('데스크톱 로컬 서버(루프백 임의 포트) → 루프백 API는 통과', () => {
    expect(
      isAllowedRequestOrigin({ origin: 'http://127.0.0.1:51234', allowedOrigins: [], requestHost: 'localhost:8000' }),
    ).toBe(true)
  })

  it('루프백 출처라도 원격 API로 가면 거절', () => {
    expect(
      isAllowedRequestOrigin({ origin: 'http://localhost:3000', allowedOrigins: [], requestHost: 'api.example.com' }),
    ).toBe(false)
  })

  it('Origin이 null 문자열이면 거절', () => {
    expect(isAllowedRequestOrigin({ origin: 'null', allowedOrigins, requestHost: 'api.example.com' })).toBe(false)
  })
})
