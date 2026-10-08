/**
 * 조망 속 사건 모달 — 페이지를 떠나지 않고 하위 사건을 보고, ←/→로 전부 넘겨 점검한다.
 */
import '@testing-library/jest-dom'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import type { EventOverviewNode } from '@/shared/api/event-overview'
import { renderWithTheme } from '@/shared/test/render-with-theme'

import { OverviewEventModal } from './overview-event-modal'

const event: EventOverviewNode = {
  id: 'marne',
  title: '마른 전투',
  description: '파리 앞에서 독일군을 멈춰 세운 전투',
  parentEventId: 'root',
  depth: 1,
  startDate: '1914-09-05T00:00:00.000Z',
  startDatePrecision: null,
  endDate: '1914-09-12T00:00:00.000Z',
  endDatePrecision: null,
  location: null,
  category: { id: 'c', name: '전쟁/군사' },
  countries: [
    { key: 'h:de', id: 'de', kind: 'historical', name: '독일 제국', flagEmoji: null, role: 'PARTICIPANT', sideId: null },
    { key: 'h:fr', id: 'fr', kind: 'historical', name: '프랑스 제3공화국', flagEmoji: null, role: 'INITIATOR', sideId: null },
  ],
  persons: [],
  sides: [],
  metrics: [],
  sectionCount: 0,
  imageCount: 0,
  hasBackground: false,
  hasAftermath: false,
}

function setup(over: Partial<React.ComponentProps<typeof OverviewEventModal>> = {}) {
  const props = {
    event,
    number: 2,
    position: 2,
    total: 18,
    filtered: false,
    rootTitle: '1차세계대전',
    parentTitle: null,
    children: [],
    numberById: new Map([['marne', 2]]),
    onClose: jest.fn(),
    onPrev: jest.fn(),
    onNext: jest.fn(),
    onOpenEvent: jest.fn(),
    onSaveDescription: jest.fn(),
    ...over,
  }
  renderWithTheme(
    <MemoryRouter>
      <OverviewEventModal {...props} />
    </MemoryRouter>,
  )
  return props
}

it('위치·제목·배역을 보여 주고, 평범한 참여는 배역 글씨를 생략한다', async () => {
  setup()
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  // 첫 포커스는 제목 — 공용 모달 훅이 다음 프레임에 옮긴다
  await waitFor(() => expect(screen.getByRole('heading', { name: '마른 전투' })).toHaveFocus())
  expect(screen.getByText('2 / 18')).toBeInTheDocument()
  expect(screen.getByText('주도국')).toBeInTheDocument()
  // '독일 제국'(참여) 칩에는 배역 글씨가 없다 — 블록 제목과 같은 말이라
  expect(screen.getByText('독일 제국').parentElement).toHaveTextContent(/^독일 제국$/)
})

it('←/→로 이전·다음, 끝에서는 그쪽 버튼이 꺼진다', () => {
  const props = setup({ onPrev: null })
  fireEvent.keyDown(document, { key: 'ArrowRight' })
  expect(props.onNext).toHaveBeenCalledTimes(1)
  fireEvent.keyDown(document, { key: 'ArrowLeft' })
  expect(screen.getByRole('button', { name: '이전 사건' })).toBeDisabled()
})

it('사건 문서 열기는 링크 — 새 탭으로도 열린다', () => {
  setup()
  expect(screen.getByRole('link', { name: /사건 문서 열기/ })).toHaveAttribute('href', '/events/marne/')
})

it('걸러 둔 상태에선 표 번호와 걸린 집합 안 순서를 함께 말한다', () => {
  setup({ number: 7, position: 2, total: 5, filtered: true })
  expect(screen.getByText('7번 · 걸린 5건 중 2')).toBeInTheDocument()
})
