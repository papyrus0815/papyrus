/**
 * 중첩 모달 동작 회귀 테스트 — 사건 등록 폼의 모달화(배치3) 선결 조건.
 *
 * 계약: **자식 피커는 반드시 document.body로 포털된다.** 포털이 없으면
 *  1. Esc의 native 이벤트가 부모 모달 root까지 버블해 **자식 대신 부모가 닫히고**,
 *  2. 부모 셸의 `backdrop-filter`가 containing block을 만들어 자식의 `position: fixed`가
 *     부모 박스 안에 갇힌다(다크 테마에서만 재현되므로 라이트만 보면 리뷰를 통과한다).
 *
 * `useModalBehavior`는 Esc를 **모달 root에** 바인딩하므로(=포털된 자식의 이벤트는
 * 부모 root 경로에 없다) 포털과 짝을 이룰 때만 격리가 성립한다. 이 spec은 그 짝을 고정한다.
 */
import { useRef } from 'react'

import '@testing-library/jest-dom'
import { fireEvent, screen } from '@testing-library/react'

import { renderWithTheme } from '@/shared/test/render-with-theme'
import { AdvancedCountrySelectModal } from '@/shared/ui/advanced-country-select-modal/advanced-country-select-modal'
import { TimePickerModal } from '@/shared/ui/time-picker-modal/time-picker-modal'

import { Modal } from './modal'

jest.mock('@/shared/hooks/use-click-sound.hook', () => ({
  useClickSound: () => jest.fn(),
}))
jest.mock('@/features/continent/use-continents.hook', () => ({
  useContinents: () => ({ continents: [], isLoading: false }),
}))
/**
 * 역사국가 등록 CTA는 API 계층(`api.service.ts`)을 끌어오는데, 그 파일의 `import.meta`가
 * 현재 jest ts 설정에서 컴파일되지 않는다(이 리포의 기존 제약 — 다른 2개 suite도 같은
 * 이유로 실패 중). 여기서 검증할 계약은 포털·Esc·시맨틱이라 CTA는 스텁으로 충분하다.
 */
jest.mock('@/shared/ui/country-picker-create/historical-country-create', () => ({
  HistoricalCountryCreateButton: () => null,
  HistoricalCountryCreateHost: () => null,
  HistoricalCountryCreateIcon: () => null,
  useCanCreateHistoricalCountry: () => false,
}))

/** 부모 모달 안에 자식 피커를 넣은 최소 구성 */
function Nested({
  child,
  onParentClose,
  onChildClose,
}: {
  child: 'time' | 'country'
  onParentClose: () => void
  onChildClose: () => void
}) {
  const parentRef = useRef<HTMLDivElement>(null)
  return (
    <Modal isOpen onClose={onParentClose} title="사건 등록">
      <div ref={parentRef}>
        <input aria-label="사건명" />
        {child === 'time' ? (
          <TimePickerModal isOpen onClose={onChildClose} onSelect={jest.fn()} />
        ) : (
          <AdvancedCountrySelectModal
            isOpen
            onClose={onChildClose}
            onSelect={jest.fn()}
            modernCountries={[{ id: 'c1', name: '대한민국' }]}
            historicalCountries={[]}
            selectedCountryIds={[]}
            title="관련 국가 선택"
          />
        )}
      </div>
    </Modal>
  )
}

describe.each([
  ['TimePickerModal', 'time' as const, '시간 선택'],
  ['AdvancedCountrySelectModal', 'country' as const, '관련 국가 선택'],
])('%s — 부모 모달 안에서', (_name, child, childLabel) => {
  it('document.body로 포털돼 부모 모달 DOM 밖에 있다', () => {
    renderWithTheme(
      <Nested child={child} onParentClose={jest.fn()} onChildClose={jest.fn()} />,
    )

    const childDialog = screen.getByRole('dialog', { name: childLabel })
    const parentDialog = screen.getByRole('dialog', { name: '사건 등록' })

    expect(childDialog).toBeInTheDocument()
    // 포털이 없으면 아래가 true가 되고, 그 순간 Esc 누수와 다크 클리핑이 함께 생긴다.
    expect(parentDialog.contains(childDialog)).toBe(false)
  })

  it('Esc는 자식만 닫는다 (부모는 살아 있다)', () => {
    const onParentClose = jest.fn()
    const onChildClose = jest.fn()
    renderWithTheme(
      <Nested
        child={child}
        onParentClose={onParentClose}
        onChildClose={onChildClose}
      />,
    )

    const childDialog = screen.getByRole('dialog', { name: childLabel })
    fireEvent.keyDown(childDialog, { key: 'Escape' })

    expect(onChildClose).toHaveBeenCalledTimes(1)
    expect(onParentClose).not.toHaveBeenCalled()
  })

  it('자식에 aria-modal 다이얼로그 시맨틱이 있다 (카탈로그 `/` 게이트가 이걸로 판정한다)', () => {
    renderWithTheme(
      <Nested child={child} onParentClose={jest.fn()} onChildClose={jest.fn()} />,
    )
    const childDialog = screen.getByRole('dialog', { name: childLabel })
    expect(childDialog).toHaveAttribute('aria-modal', 'true')
  })
})
