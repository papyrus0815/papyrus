import React from 'react'

import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { renderWithTheme } from '@/shared/test/render-with-theme'

import type { EventDetail } from '../use-event-detail'
import { ParentFlowStrip } from './parent-flow-strip'
import { formatStepShortDate, relativeTimingLabel } from './parent-flow-strip.lib'

jest.mock('@/shared/api/client', () => ({ getApiConnection: () => ({}) }))
jest.mock('@/shared/api/api.service', () => ({}))
jest.mock('../use-event-detail', () => ({
  usePrefetchEventDetail: () => jest.fn(),
}))

const mockGetEventsByParentId = jest.fn()
jest.mock('@/shared/api/events', () => ({
  getEventsByParentId: (...args: unknown[]) => mockGetEventsByParentId(...args),
}))

describe('parent-flow-strip.lib', () => {
  it('상위 시작일 이전 사건(대세르비아 최후통첩 1914-07-23 vs 1차세계대전 1914-07-28)을 "상위 시작 5일 전"으로 표시한다', () => {
    expect(
      relativeTimingLabel(
        {
          id: 'ww1',
          title: '1차세계대전',
          startDate: '1914-07-28T00:00:00.000Z',
          startDatePrecision: null,
          endDate: '1918-11-11T00:00:00.000Z',
          endDatePrecision: null,
        },
        {
          id: 'ultimatum',
          title: '오스트리아-헝가리의 대세르비아 최후통첩',
          startDate: '1914-07-23T18:00:00.000Z',
          startDatePrecision: 'day',
        },
      ),
    ).toBe('상위 시작 5일 전')
  })

  it('상위 시작 당일·기간 중·종료 후를 각각 구분한다', () => {
    const parent = {
      id: 'fpw',
      title: '보불전쟁',
      startDate: '1870-07-19T00:00:00.000Z',
      startDatePrecision: 'day',
      endDate: '1871-05-10T00:00:00.000Z',
      endDatePrecision: 'day',
    }

    expect(
      relativeTimingLabel(parent, {
        id: 'decl',
        title: '프랑스의 대프로이센 선전포고',
        startDate: '1870-07-19T00:00:00.000Z',
        startDatePrecision: 'day',
      }),
    ).toBe('상위 시작 당일')

    expect(
      relativeTimingLabel(parent, {
        id: 'sedan',
        title: '스당 전투',
        startDate: '1870-09-01T00:00:00.000Z',
        startDatePrecision: 'day',
      }),
    ).toBe('시작 45일째')

    expect(
      relativeTimingLabel(parent, {
        id: 'aftermath',
        title: '전후 배상금 조기 완납',
        startDate: '1871-05-20T00:00:00.000Z',
        startDatePrecision: 'day',
      }),
    ).toBe('상위 종료 10일 후')
  })

  it('정밀도 NULL인 1월 1일 센티넬은 연 단위로 읽어 가짜 일수를 만들지 않는다', () => {
    const parent = {
      id: 'war',
      title: '세 하인리히 전쟁',
      startDate: '0977-01-01T00:00:00.000Z',
      startDatePrecision: null,
      endDate: '0978-12-31T00:00:00.000Z',
      endDatePrecision: null,
    }
    const child = {
      id: 'siege',
      title: '파사우 포위전',
      startDate: '0977-01-01T00:00:00.000Z',
      startDatePrecision: null,
    }
    expect(relativeTimingLabel(parent, child)).toBeNull()
    expect(formatStepShortDate(child)).toBe('977년')
  })
})

describe('ParentFlowStrip 컴포넌트', () => {
  it('무보더 장부 조판으로 상위 소속 순서·시점과 앞뒤 하위 사건 이동 줄을 렌더한다', async () => {
    const siblings = [
      {
        id: 's1',
        title: '사라예보 암살 사건',
        startDate: '1914-06-28T00:00:00.000Z',
        startDatePrecision: 'day',
      },
      {
        id: 's2',
        title: '콘라트 참모총장의 위장 휴가',
        startDate: '1914-07-14T00:00:00.000Z',
        startDatePrecision: 'day',
        endDate: '1914-07-22T00:00:00.000Z',
        endDatePrecision: 'day',
      },
      {
        id: 's3',
        title: '오스트리아-헝가리의 대세르비아 최후통첩',
        startDate: '1914-07-23T18:00:00.000Z',
        startDatePrecision: 'day',
      },
      {
        id: 's4',
        title: '러시아 각료회의',
        startDate: '1914-07-24T00:00:00.000Z',
        startDatePrecision: 'day',
      },
    ]

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    })
    queryClient.setQueryData(['events', 'siblings', 'ww1'], siblings)

    const event = {
      id: 's3',
      title: '오스트리아-헝가리의 대세르비아 최후통첩',
      startDate: '1914-07-23T18:00:00.000Z',
      startDatePrecision: 'day',
      endDate: '1914-07-23T00:00:00.000Z',
      endDatePrecision: 'day',
      parentEventId: 'ww1',
      parentEvent: {
        id: 'ww1',
        title: '1차세계대전',
        startDate: '1914-07-28T00:00:00.000Z',
        startDatePrecision: null,
        endDate: '1918-11-11T00:00:00.000Z',
        endDatePrecision: null,
        phases: [],
      },
    } as unknown as EventDetail

    renderWithTheme(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <ParentFlowStrip event={event} />
        </QueryClientProvider>
      </MemoryRouter>,
    )

    const nav = screen.getByRole('navigation', {
      name: '상위 사건 1차세계대전의 하위 사건 흐름',
    })
    expect(within(nav).getByRole('link', { name: '1차세계대전' })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: /전체 흐름/ })).toHaveAttribute(
      'href',
      '/events/ww1/?tab=survey',
    )
    expect(within(nav).getByText('3번째')).toBeInTheDocument()
    expect(within(nav).getByText('상위 시작 5일 전')).toBeInTheDocument()

    const prevLink = within(nav).getByRole('link', {
      name: '이전 하위 사건: 콘라트 참모총장의 위장 휴가',
    })
    expect(prevLink).toHaveTextContent('2')
    expect(prevLink).toHaveTextContent('콘라트 참모총장의 위장 휴가')

    const nextLink = within(nav).getByRole('link', {
      name: '다음 하위 사건: 러시아 각료회의',
    })
    expect(nextLink).toHaveTextContent('4')
    expect(nextLink).toHaveTextContent('러시아 각료회의')
  })
})
