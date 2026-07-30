import { useState } from 'react'

import { renderWithTheme } from '@/shared/test/render-with-theme'
import '@testing-library/jest-dom'
import { fireEvent, screen, waitFor } from '@testing-library/react'

import { DateRangeField, type DateRangeFieldProps } from './date-range-field'

/**
 * 실제 DatePickerModal은 mp3 에셋을 import해 jest 변환기가 잡지 못하고, 여기서 검증할 것도
 * 달력 내부가 아니라 "어떤 피커가 열려 있고 닫힌 뒤 포커스가 어디로 가는가"다 → 최소 대역.
 * onSelect 직후 onClose를 부르는 실제 계약(handleDateSelect/applyTypedDate)을 그대로 흉내낸다.
 */
jest.mock('@/shared/ui/date-picker/date-picker-modal', () => ({
  DatePickerModal: ({
    isOpen,
    title,
    onSelect,
    onClose,
  }: {
    isOpen: boolean
    title: string
    onSelect: (date: string) => void
    onClose: () => void
  }) =>
    isOpen ? (
      <div role="dialog" aria-label={title}>
        <button
          type="button"
          onClick={() => {
            onSelect('2020-03-01')
            onClose()
          }}
        >
          {`${title} 확정`}
        </button>
      </div>
    ) : null,
}))

function Harness(props: Partial<DateRangeFieldProps> = {}) {
  const [startValue, setStartValue] = useState('')
  const [endValue, setEndValue] = useState('')
  return (
    <DateRangeField
      startValue={startValue}
      endValue={endValue}
      onStartChange={setStartValue}
      onEndChange={setEndValue}
      {...props}
    />
  )
}

const openPicker = (name: string) =>
  fireEvent.click(screen.getByRole('button', { name }))
const confirmPicker = (title: string) =>
  fireEvent.click(screen.getByRole('button', { name: `${title} 확정` }))

describe('DateRangeField', () => {
  it('openEndAfterStart=false면 취임일 선택 후 퇴임일 달력이 이어서 뜨지 않는다', async () => {
    renderWithTheme(<Harness openEndAfterStart={false} />)
    const startBtn = screen.getByRole('button', { name: '취임일' })

    openPicker('취임일')
    confirmPicker('취임일 선택')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    // 닫힌 뒤 포커스는 자기 트리거(취임일 버튼)로 복귀
    await waitFor(() => expect(startBtn).toHaveFocus())
  })

  it('openEndAfterStart면 퇴임일 달력이 이어서 열리고, 포커스를 취임일 버튼이 도로 뺏지 않는다', async () => {
    renderWithTheme(<Harness openEndAfterStart />)
    const startBtn = screen.getByRole('button', { name: '취임일' })

    openPicker('취임일')
    confirmPicker('취임일 선택')

    expect(
      screen.getByRole('dialog', { name: '퇴임일 선택' }),
    ).toBeInTheDocument()
    // 연쇄 오픈 중에는 트리거 복귀를 억제 — 새로 뜬 모달이 포커스를 갖는다.
    await waitFor(() => expect(startBtn).not.toHaveFocus())
  })

  it('연쇄로 열린 퇴임일까지 고르면 포커스가 퇴임일 버튼으로 간다(취임일 달력 재오픈 방지)', async () => {
    renderWithTheme(<Harness openEndAfterStart />)
    const startBtn = screen.getByRole('button', { name: '취임일' })
    const endBtn = screen.getByRole('button', { name: '퇴임일 (선택)' })

    openPicker('취임일')
    confirmPicker('취임일 선택')
    confirmPicker('퇴임일 선택')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    // 예전엔 취임일 버튼에 포커스가 남아, 이어서 Enter/Space를 누르면 취임일 달력이 또 열렸다.
    await waitFor(() => expect(endBtn).toHaveFocus())
    expect(startBtn).not.toHaveFocus()
  })

  it('퇴임일 단독 선택도 자기 트리거로 포커스 복귀', async () => {
    renderWithTheme(<Harness openEndAfterStart={false} />)
    const endBtn = screen.getByRole('button', { name: '퇴임일 (선택)' })

    openPicker('퇴임일 (선택)')
    confirmPicker('퇴임일 선택')

    await waitFor(() => expect(endBtn).toHaveFocus())
  })
})
