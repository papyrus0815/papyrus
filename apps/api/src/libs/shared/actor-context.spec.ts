import { UnauthorizedException } from '@nestjs/common'

import { requireActorId } from './actor-context'

describe('requireActorId', () => {
  it('계정 ID가 있으면 그대로 돌려준다', () => {
    expect(requireActorId('acc-1')).toBe('acc-1')
  })

  it.each([undefined, null, ''])('없으면(%p) 401 — 소유권 검사가 조용히 통과하지 않게', (value) => {
    expect(() => requireActorId(value)).toThrow(UnauthorizedException)
  })
})
