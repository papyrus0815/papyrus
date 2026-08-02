/**
 * EventRegisterModal — 셸이 지는 책임만 고정한다(폼 본체 계약은 event-basic-form.spec).
 *
 *  1. 미저장 변경이 있으면 닫기 전에 확인을 받고, 거절하면 **닫히지 않는다**
 *  2. 저장 성공 후 3지 분기(상세 보기 / 계속 등록 / 닫기)가 뜬다
 *  3. "계속 등록"은 모달을 닫지 않고 폼만 비운다 — 카테고리·관련 국가는 남긴다
 *     (연속 입력은 대개 같은 묶음이라 매번 다시 고르게 하면 안 된다)
 *  4. 저장 중에는 닫기 경로가 막힌다 (요청만 날아가고 UI가 사라지는 상태 방지)
 */
import { useEffect } from 'react'

import '@testing-library/jest-dom'
import { fireEvent, screen, waitFor } from '@testing-library/react'

import { renderWithTheme } from '@/shared/test/render-with-theme'

import { EventRegisterModal } from './event-register-modal'
import type {
  EventBasicFormProps,
  EventBasicFormState,
} from './event-basic-form'

/**
 * react-router는 jsdom에 없는 `TextEncoder`를 모듈 로드 시점에 건드린다. 이 리포의 spec은
 * 라우터를 띄운 전례가 없으므로 전역 polyfill을 넣기보다 필요한 훅만 대체한다.
 */
const navigateMock = jest.fn()
jest.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}))

const confirmMock = jest.fn()
jest.mock('@/shared/ui/confirm-dialog', () => ({
  ...jest.requireActual('@/shared/ui/confirm-dialog'),
  confirm: (...args: unknown[]) => confirmMock(...args),
}))

const resetSpy = jest.fn()
const submitSpy = jest.fn()

/**
 * 폼 본체 스텁 — 셸이 넘긴 콜백을 테스트가 임의 시점에 발화시킬 수 있게 버튼으로 노출한다.
 * (실제 본체는 API·피커 5종을 물고 있어 셸 계약 검증에 과하다)
 */
jest.mock('./event-basic-form', () => ({
  EventBasicForm: (props: EventBasicFormProps) => {
    const { formRef, onStateChange, onDirtyChange, onSaved } = props
    useEffect(() => {
      if (formRef) {
        formRef.current = { submit: submitSpy, reset: resetSpy }
      }
      onStateChange?.({
        isEditMode: false,
        isLoading: false,
        isSubmitting: false,
        isValid: true,
      } satisfies EventBasicFormState)
    }, [formRef, onStateChange])
    return (
      <div>
        <span data-testid="notifyOnLoad">{String(props.notifyOnLoad)}</span>
        <button type="button" onClick={() => onDirtyChange?.(true)}>
          _dirty
        </button>
        <button type="button" onClick={() => onSaved?.('evt-1', 'create')}>
          _saved
        </button>
        <button
          type="button"
          onClick={() =>
            onStateChange?.({
              isEditMode: false,
              isLoading: false,
              isSubmitting: true,
              isValid: true,
            })
          }
        >
          _submitting
        </button>
      </div>
    )
  },
}))

function setup(overrides: Partial<React.ComponentProps<typeof EventRegisterModal>> = {}) {
  const onClose = jest.fn()
  renderWithTheme(<EventRegisterModal isOpen onClose={onClose} {...overrides} />)
  return { onClose }
}

/** lazy 본문이 마운트될 때까지 */
const waitForBody = () => screen.findByText('_dirty')

beforeEach(() => {
  jest.clearAllMocks()
  confirmMock.mockResolvedValue(true)
})

it('폼 본체를 lazy로 싣고, 편집 로드 토스트는 끈다 (모달은 열 때마다 마운트라 매번 뜬다)', async () => {
  setup()
  await waitForBody()
  expect(screen.getByTestId('notifyOnLoad')).toHaveTextContent('false')
})

it('변경이 없으면 확인 없이 닫힌다', async () => {
  const { onClose } = setup()
  await waitForBody()

  fireEvent.click(screen.getByRole('button', { name: '취소' }))
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  expect(confirmMock).not.toHaveBeenCalled()
})

it('미저장 변경이 있으면 확인을 받고, 거절하면 닫히지 않는다', async () => {
  confirmMock.mockResolvedValue(false)
  const { onClose } = setup()
  await waitForBody()

  fireEvent.click(screen.getByText('_dirty'))
  fireEvent.click(screen.getByRole('button', { name: '취소' }))

  await waitFor(() => expect(confirmMock).toHaveBeenCalledTimes(1))
  expect(onClose).not.toHaveBeenCalled()
})

it('미저장 변경이 있어도 확인하면 닫힌다', async () => {
  const { onClose } = setup()
  await waitForBody()

  fireEvent.click(screen.getByText('_dirty'))
  fireEvent.click(screen.getByRole('button', { name: '취소' }))

  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
})

it('저장 중에는 닫기 요청이 무시된다', async () => {
  const { onClose } = setup()
  await waitForBody()

  fireEvent.click(screen.getByText('_submitting'))
  fireEvent.click(screen.getByRole('button', { name: '취소' }))

  await waitFor(() => expect(confirmMock).not.toHaveBeenCalled())
  expect(onClose).not.toHaveBeenCalled()
})

it('저장에 성공하면 3지 분기가 뜨고, 모달은 아직 닫히지 않는다', async () => {
  const { onClose } = setup()
  await waitForBody()

  fireEvent.click(screen.getByText('_saved'))

  expect(await screen.findByText('사건 등록 완료')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '상세 보기' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '사건 계속 등록' })).toBeInTheDocument()
  expect(onClose).not.toHaveBeenCalled()
})

it('"사건 계속 등록"은 모달을 닫지 않고 폼만 비운다 (카테고리·관련 국가는 유지)', async () => {
  const { onClose } = setup()
  await waitForBody()

  fireEvent.click(screen.getByText('_saved'))
  fireEvent.click(await screen.findByRole('button', { name: '사건 계속 등록' }))

  expect(resetSpy).toHaveBeenCalledWith({
    keepCategory: true,
    keepRelatedCountries: true,
  })
  expect(onClose).not.toHaveBeenCalled()
  await waitFor(() =>
    expect(screen.queryByText('사건 등록 완료')).not.toBeInTheDocument(),
  )
})

it('완료 분기에서 "닫기"를 고르면 확인 없이 닫힌다 (저장했으므로 잃을 게 없다)', async () => {
  const { onClose } = setup()
  await waitForBody()

  fireEvent.click(screen.getByText('_dirty'))
  fireEvent.click(screen.getByText('_saved'))
  await screen.findByText('사건 등록 완료')
  // 셸 헤더의 X 버튼도 접근명이 '닫기'(aria-label)라 텍스트가 실제로 '닫기'인 쪽을 고른다
  const dialogCloseButton = screen
    .getAllByRole('button', { name: '닫기' })
    .find((button) => button.textContent?.trim() === '닫기')
  fireEvent.click(dialogCloseButton!)

  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  expect(confirmMock).not.toHaveBeenCalled()
})

it('저장 버튼은 폼이 유효할 때만 활성화된다', async () => {
  setup()
  await waitForBody()
  expect(screen.getByRole('button', { name: '사건 등록' })).toBeEnabled()

  fireEvent.click(screen.getByText('_submitting'))
  await waitFor(() =>
    expect(screen.getByRole('button', { name: '등록 중...' })).toBeDisabled(),
  )
})
