/**
 * SelectModal 접근성 렌더 테스트 — 공용 피커(사건 상위/하위 연결 등 46 콜사이트).
 * dialog 시맨틱·Esc·닫기 라벨·옵션 선택상태(aria-pressed)·조회 실패 오류 상태를 회귀 방지.
 * (P2-5 useModalBehavior·dialog/aria, P3-13 aria-pressed, P3-7 오류 상태)
 */
import { type ComponentProps } from 'react'

import { renderWithTheme } from '@/shared/test/render-with-theme'
import '@testing-library/jest-dom'
import { fireEvent, screen } from '@testing-library/react'

import { SelectModal, type SelectOption } from './select-modal'

const OPTIONS: SelectOption[] = [
  { value: 'a', label: '알파' },
  { value: 'b', label: '베타' },
  { value: 'c', label: '감마' },
]

type Props = ComponentProps<typeof SelectModal>

function setup(overrides: Partial<Props> = {}) {
  const onClose = jest.fn()
  const onSelect = jest.fn()
  const props: Props = {
    isOpen: true,
    onClose,
    onSelect,
    title: '상위 사건 지정',
    options: OPTIONS,
    ...overrides,
  }
  const view = renderWithTheme(<SelectModal {...props} />)
  return { ...view, onClose, onSelect }
}

describe('SelectModal 접근성', () => {
  it('isOpen=false면 렌더하지 않는다', () => {
    setup({ isOpen: false })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('dialog 역할 + aria-modal + aria-labelledby가 제목을 가리킨다', () => {
    setup()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    const labelledBy = dialog.getAttribute('aria-labelledby')
    expect(labelledBy).toBeTruthy()
    expect(document.getElementById(labelledBy as string)).toHaveTextContent(
      '상위 사건 지정',
    )
  })

  it('Esc로 onClose 호출(useModalBehavior)', () => {
    const { onClose } = setup()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('닫기 버튼에 aria-label="닫기"', () => {
    setup()
    expect(screen.getByRole('button', { name: '닫기' })).toBeInTheDocument()
  })

  it('다중 선택 옵션이 aria-pressed로 선택 상태를 노출한다', () => {
    setup({ multiple: true, selectedValues: ['b'] })
    expect(screen.getByRole('button', { name: '알파' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByRole('button', { name: '베타' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('옵션 클릭 시 onSelect(value) 호출', () => {
    const { onSelect } = setup()
    fireEvent.click(screen.getByRole('button', { name: '감마' }))
    expect(onSelect).toHaveBeenCalledWith('c')
  })

  it('hasError면 오류 상태와 다시 시도 버튼을 보여주고 onRetry를 호출한다', () => {
    const onRetry = jest.fn()
    setup({ options: [], hasError: true, onRetry })
    // 오류 문구는 빈-상태 제목 + aria-live 리전 둘 다에 노출(의도) → getAllByText.
    expect(screen.getAllByText('불러오지 못했습니다').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('빈 목록(오류 아님)은 결과 없음 안내', () => {
    setup({ options: [] })
    expect(screen.getByText('데이터가 없습니다')).toBeInTheDocument()
  })
})
