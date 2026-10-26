import { LoginAttemptLimiter, TooManyLoginAttemptsException } from './login-attempt-limiter'

describe('LoginAttemptLimiter', () => {
  let clock: number
  let limiter: LoginAttemptLimiter
  const fail = (ip: string, account: string, times: number) => {
    for (let index = 0; index < times; index += 1) limiter.recordFailure(ip, account)
  }

  beforeEach(() => {
    clock = 1_000_000
    limiter = new LoginAttemptLimiter(() => clock)
  })

  it('같은 IP·계정으로 5번 틀리면 막힌다', () => {
    fail('1.1.1.1', 'admin', 4)
    expect(() => limiter.assertAllowed('1.1.1.1', 'admin')).not.toThrow()
    fail('1.1.1.1', 'admin', 1)
    expect(() => limiter.assertAllowed('1.1.1.1', 'admin')).toThrow(TooManyLoginAttemptsException)
  })

  it('계정명 대소문자·공백은 같은 계정으로 센다', () => {
    fail('1.1.1.1', 'Admin ', 5)
    expect(() => limiter.assertAllowed('1.1.1.1', 'admin')).toThrow(TooManyLoginAttemptsException)
  })

  it('다른 IP의 같은 계정은 막히지 않는다 — 남이 admin을 잠글 수 없게', () => {
    fail('6.6.6.6', 'admin', 5)
    expect(() => limiter.assertAllowed('1.1.1.1', 'admin')).not.toThrow()
  })

  it('계정을 바꿔 가며 30번 틀리면 그 IP는 막힌다', () => {
    for (let index = 0; index < 30; index += 1) limiter.recordFailure('6.6.6.6', `user${index}`)
    expect(() => limiter.assertAllowed('6.6.6.6', 'someone-new')).toThrow(TooManyLoginAttemptsException)
  })

  it('15분이 지나면 풀린다', () => {
    fail('1.1.1.1', 'admin', 5)
    clock += 15 * 60 * 1000
    expect(() => limiter.assertAllowed('1.1.1.1', 'admin')).not.toThrow()
  })

  it('성공하면 IP·계정 카운터가 초기화된다', () => {
    fail('1.1.1.1', 'admin', 4)
    limiter.recordSuccess('1.1.1.1', 'admin')
    fail('1.1.1.1', 'admin', 4)
    expect(() => limiter.assertAllowed('1.1.1.1', 'admin')).not.toThrow()
  })

  it('429에 남은 시간이 실린다', () => {
    fail('1.1.1.1', 'admin', 5)
    clock += 5 * 60 * 1000
    try {
      limiter.assertAllowed('1.1.1.1', 'admin')
      throw new Error('should block')
    } catch (error) {
      expect(error).toBeInstanceOf(TooManyLoginAttemptsException)
      expect((error as TooManyLoginAttemptsException).retryAfterSeconds).toBe(10 * 60)
      expect((error as TooManyLoginAttemptsException).getStatus()).toBe(429)
    }
  })
})
