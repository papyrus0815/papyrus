/**
 * AdvancedCountrySelectModal 기본 계약 — 포털화(중첩 모달 수리)의 **blast 방어**.
 *
 * 이 피커는 소비처가 5곳(사건 상세 belligerents·actors, 목록 필터, 국가 폼, 사건 등록)인데
 * spec이 0건인 채로 포털·`useModalBehavior` 이관을 받았다. 사건 등록 경로만 라이브로
 * 확인했으므로, 나머지 지면이 기대는 기본 동작(선택 콜백·다중 선택·탭·닫기)을 여기서 못박는다.
 */
import '@testing-library/jest-dom'
import { fireEvent, screen } from '@testing-library/react'

import { renderWithTheme } from '@/shared/test/render-with-theme'

import { AdvancedCountrySelectModal } from './advanced-country-select-modal'

jest.mock('@/shared/hooks/use-click-sound.hook', () => ({
  useClickSound: () => jest.fn(),
}))
jest.mock('@/features/continent/use-continents.hook', () => ({
  useContinents: () => ({ continents: [], isLoading: false }),
}))
// 역사국가 등록 CTA는 API 계층(import.meta)을 끌어온다 — 이 spec의 관심사가 아니다.
jest.mock('@/shared/ui/country-picker-create/historical-country-create', () => ({
  HistoricalCountryCreateButton: () => null,
  HistoricalCountryCreateHost: () => null,
  HistoricalCountryCreateIcon: () => null,
  useCanCreateHistoricalCountry: () => false,
}))

const MODERN = [
  { id: 'kr', name: '대한민국' },
  { id: 'jp', name: '일본' },
]
/**
 * 역사국가 DTO는 17개 필드를 요구하지만 이 spec이 검증하는 경로는 id·name만 읽는다.
 * 실제 호출부도 목록 API 응답을 그대로 넘기므로, 여기서는 최소 픽스처로 캐스팅한다.
 */
const HISTORICAL = [
  { id: 'joseon', name: '조선' },
] as unknown as React.ComponentProps<
  typeof AdvancedCountrySelectModal
>['historicalCountries']

function setup(overrides: Partial<React.ComponentProps<typeof AdvancedCountrySelectModal>> = {}) {
  const onClose = jest.fn()
  const onSelect = jest.fn()
  renderWithTheme(
    <AdvancedCountrySelectModal
      isOpen
      onClose={onClose}
      onSelect={onSelect}
      modernCountries={MODERN}
      historicalCountries={HISTORICAL}
      selectedCountryIds={[]}
      title="관련 국가 선택"
      {...overrides}
    />,
  )
  return { onClose, onSelect }
}

it('body로 포털된 aria-modal 다이얼로그로 뜬다', () => {
  setup()
  const dialog = screen.getByRole('dialog', { name: '관련 국가 선택' })
  expect(dialog).toHaveAttribute('aria-modal', 'true')
  expect(dialog.parentElement?.parentElement).toBe(document.body)
})

it('Esc로 닫힌다', () => {
  const { onClose } = setup()
  fireEvent.keyDown(screen.getByRole('dialog', { name: '관련 국가 선택' }), {
    key: 'Escape',
  })
  expect(onClose).toHaveBeenCalledTimes(1)
})

it('현대 국가를 고르면 onSelect가 그 국가를 넘긴다', () => {
  const { onSelect } = setup()
  fireEvent.click(screen.getByText('대한민국'))
  expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'kr' }))
})

it('닫히면 아무것도 렌더하지 않는다 (isOpen=false)', () => {
  setup({ isOpen: false })
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

it('선택된 항목이 역사국가면 역사 탭으로 열린다 (선택분이 안 보여 미선택으로 오인되던 문제)', () => {
  setup({ selectedCountryIds: ['joseon'] })
  expect(screen.getByText('조선')).toBeInTheDocument()
})

it('다중 선택 모드에서는 고른 뒤에도 닫히지 않는다 (호출부가 닫기를 통제)', () => {
  const { onClose, onSelect } = setup({ multiSelect: true })
  fireEvent.click(screen.getByText('대한민국'))
  expect(onSelect).toHaveBeenCalled()
  expect(onClose).not.toHaveBeenCalled()
})
