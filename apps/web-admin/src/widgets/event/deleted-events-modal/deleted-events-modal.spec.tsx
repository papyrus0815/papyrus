/**
 * 삭제한 사건(휴지통) — 서버 API·래퍼는 있었지만 부르는 화면이 0곳이라 지운 사건을 되살릴
 * 방법이 없었다. 목록·복구·영구 삭제(확인 필수)를 고정한다.
 */
import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, screen, waitFor } from '@testing-library/react'

import {
  permanentlyDeleteEvent,
  restoreEvent,
} from '@/shared/api/events'
import { confirm } from '@/shared/ui/confirm-dialog'
import { notify } from '@/shared/ui/toast'
import { renderWithTheme } from '@/shared/test/render-with-theme'

import { DeletedEventsModal } from './deleted-events-modal'

jest.mock('@/shared/api/events', () => ({
  getDeletedEvents: jest.fn().mockResolvedValue([
    {
      id: 'ev-root',
      title: '보오 전쟁',
      startYear: 1866,
      startEra: 'AD',
      deletedAt: '2026-09-01T00:00:00.000Z',
    },
    {
      id: 'ev-orphan',
      title: '쾨니히그레츠 전투',
      parentEventId: 'ev-gone',
      deletedAt: '2026-09-02T00:00:00.000Z',
    },
  ]),
  restoreEvent: jest.fn(),
  permanentlyDeleteEvent: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('@/shared/ui/confirm-dialog', () => ({ confirm: jest.fn() }))
jest.mock('@/shared/ui/toast', () => ({
  notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}))

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  renderWithTheme(
    <QueryClientProvider client={queryClient}>
      <DeletedEventsModal isOpen onClose={jest.fn()} />
    </QueryClientProvider>,
  )
}

beforeEach(() => jest.clearAllMocks())

it('삭제한 사건을 삭제일과 함께 보여 준다', async () => {
  setup()
  expect(await screen.findByText('보오 전쟁')).toBeInTheDocument()
  expect(screen.getByText(/2026\. 9\. 1\. 삭제/)).toBeInTheDocument()
})

it('상위가 삭제돼 최상위로 복구되면 그렇게 알린다', async () => {
  ;(restoreEvent as jest.Mock).mockResolvedValue({ id: 'ev-orphan', parentEventId: null })
  setup()
  fireEvent.click(await screen.findByRole('button', { name: "'쾨니히그레츠 전투' 복구" }))
  await waitFor(() => expect(restoreEvent).toHaveBeenCalledWith('ev-orphan'))
  await waitFor(() =>
    expect(notify.info).toHaveBeenCalledWith(expect.stringContaining('최상위로 되살렸습니다')),
  )
})

it('영구 삭제는 확인을 거절하면 부르지 않는다', async () => {
  ;(confirm as jest.Mock).mockResolvedValue(false)
  setup()
  fireEvent.click(await screen.findByRole('button', { name: "'보오 전쟁' 영구 삭제" }))
  await waitFor(() => expect(confirm).toHaveBeenCalled())
  expect(permanentlyDeleteEvent).not.toHaveBeenCalled()
})

it('영구 삭제는 확인하면 부른다', async () => {
  ;(confirm as jest.Mock).mockResolvedValue(true)
  setup()
  fireEvent.click(await screen.findByRole('button', { name: "'보오 전쟁' 영구 삭제" }))
  await waitFor(() => expect(permanentlyDeleteEvent).toHaveBeenCalledWith('ev-root'))
})
