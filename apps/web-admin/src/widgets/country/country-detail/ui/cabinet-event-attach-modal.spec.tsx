/**
 * CabinetEventAttachModal — 공용 모달 토대 이관 + BC 날짜 회귀 방지.
 *
 * 예전 이 모달은 자체 Overlay라 포털·Esc·포커스 트랩·스크롤락이 전부 없었고,
 * 기간을 native `type="date"`로 받아 **BC·고대 사건을 등록할 수 없었다**.
 */
import '@testing-library/jest-dom'
import { fireEvent, screen, waitFor } from '@testing-library/react'

import { renderWithTheme } from '@/shared/test/render-with-theme'

import { CabinetEventAttachModal } from './cabinet-event-attach-modal'

jest.mock('@/shared/api/events', () => ({
  getAllEvents: jest.fn().mockResolvedValue([]),
  createEvent: jest.fn(),
}))
jest.mock('@/shared/api/cabinet-events', () => ({
  CABINET_EVENT_ROLE_LABELS: {
    ORIGIN: '발단',
    PARTY: '당사자',
    MEDIATOR: '중재',
    AFFECTED: '영향',
  },
  linkCabinetToEvent: jest.fn(),
}))
jest.mock('@/shared/ui/toast', () => ({
  notify: { success: jest.fn(), error: jest.fn() },
}))
jest.mock('@/shared/hooks/use-click-sound.hook', () => ({
  useClickSound: () => jest.fn(),
}))

function setup() {
  const onClose = jest.fn()
  renderWithTheme(
    <CabinetEventAttachModal
      cabinetId="cab-1"
      onClose={onClose}
      onAttached={jest.fn()}
    />,
  )
  return { onClose }
}

it('공용 모달 토대를 쓴다 — body로 포털된 aria-modal 다이얼로그', async () => {
  setup()
  const dialog = await screen.findByRole('dialog')
  expect(dialog).toHaveAttribute('aria-modal', 'true')
  // 포털: 오버레이의 부모가 body
  expect(dialog.parentElement?.parentElement).toBe(document.body)
})

it('Esc로 닫힌다 (예전엔 Esc 핸들러가 아예 없었다)', async () => {
  const { onClose } = setup()
  const dialog = await screen.findByRole('dialog')
  fireEvent.keyDown(dialog, { key: 'Escape' })
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
})

it('기간을 native date input으로 받지 않는다 — BC·고대 연도를 못 넣던 원인', async () => {
  setup()
  await screen.findByRole('dialog')
  fireEvent.click(screen.getByRole('button', { name: '새 사건 만들기' }))

  // native date가 하나라도 남아 있으면 BC 등록이 다시 막힌다
  expect(document.querySelectorAll('input[type="date"]')).toHaveLength(0)
  expect(screen.getByRole('button', { name: /시작일 선택/ })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /종료일 선택/ })).toBeInTheDocument()
})

it('날짜 트리거를 누르면 BC 지원 피커가 열린다', async () => {
  setup()
  await screen.findByRole('dialog')
  fireEvent.click(screen.getByRole('button', { name: '새 사건 만들기' }))
  fireEvent.click(screen.getByRole('button', { name: /시작일 선택/ }))

  expect(await screen.findByText('시작 일자 선택')).toBeInTheDocument()
})
