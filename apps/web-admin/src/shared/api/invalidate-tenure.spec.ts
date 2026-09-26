import { QueryClient } from '@tanstack/react-query'

import { invalidateTenureQueries } from './invalidate-tenure'

describe('invalidateTenureQueries', () => {
  it('사건 목록의 즉위·취임 연표도 함께 무효화한다', () => {
    const queryClient = new QueryClient()
    const spy = jest.spyOn(queryClient, 'invalidateQueries')
    invalidateTenureQueries(queryClient, { personId: 'p1' })
    const keys = spy.mock.calls.map(([filters]) => JSON.stringify(filters?.queryKey))
    expect(keys).toContain(JSON.stringify(['sovereign-reign-timeline']))
    expect(keys).toContain(JSON.stringify(['head-tenure-timeline']))
  })
})
